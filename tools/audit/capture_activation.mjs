// Captures of the audit follow-up (first launch, end of game, auto help, offer and invite). Usage: OUT=dir node tools/audit/capture_activation.mjs
import { launch, closeOnboarding, URL, midi, INIT } from './lib.mjs';
import fs from 'fs';
const OUT = process.env.OUT; fs.mkdirSync(OUT, { recursive: true });
const SIZES = [['ipad', 1024, 768], ['ipadp', 768, 1024], ['phone', 390, 844], ['phonel', 844, 390], ['desk', 1440, 900]];
const W = ms => new Promise(r => setTimeout(r, ms));
const click = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (e) e.click(); return !!e; }, sel);
const vis = (p, id) => p.evaluate(id => { const e = document.getElementById(id); return !!e && !e.hidden; }, id);
// play through the on-screen keys (mobile web has no MIDI)
const key = (p, n) => p.evaluate(n => { const root = document.querySelector('#gate:not([hidden])') || document.getElementById('kbd');
  for (const d of [0, 12, -12, 24, -24]) { const el = root.querySelector('[data-m="' + (n + d) + '"]'); if (el) { el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true })); return true; } } return false; }, n);
const PC = { 'Do': 0, 'Ré': 2, 'Mi': 4, 'Fa': 5, 'Sol': 7, 'La': 9, 'Si': 11 };
const startChords = async p => { await click(p, '.mode-item[data-mode="learn"]'); await W(300); await p.evaluate(() => document.querySelector('#secTabs [data-v="chords"]').click()); await W(500); await click(p, '#suGo'); await W(700); };
const playGame = async p => { await startChords(p); for (let i = 0; i < 4; i++) { if (await vis(p, 'endModal')) break; const t = await p.evaluate(() => document.getElementById('prompt').textContent); const m = /^(\S+)\s+Majeur/.exec(t); if (!m) break; const r = 48 + PC[m[1]];
  for (const n of [r, r + 4, r + 7]) { await key(p, n); await W(15); } await W(500); await W(700); await p.keyboard.press('Enter'); await W(900); } await W(600); };
const SC = [
  ['Premier lancement — joue un Do', async p => {}, { fresh: 1 }],
  ['Premier lancement — fausse note', async p => { await key(p, 62); await W(150); await W(300); }, { fresh: 1 }],
  ['Premier lancement — bravo', async p => { await key(p, 60); await W(150); await W(500); }, { fresh: 1 }],
  ['Fin de partie — niveau suivant, série, compte', async p => { await playGame(p); }],
  ['Exercice — coup de main après 3 erreurs', async p => { await startChords(p); for (let i = 0; i < 3; i++) { await key(p, 61); await W(120); await W(300); } await W(300); }],
  ['Offre — après une 1re partie réussie', async p => { await playGame(p); await click(p, '#endX'); await W(900); }, { pay: 1 }],
  ['Inviter des amis (offre coupée)', async p => { await click(p, '#homeLink'); await W(300); await click(p, '#hsInv'); await W(500); }],
];
const { browser } = await launch({ mode: 'ok' });
let n = 0; const man = [];
for (const [sz, w, h] of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: w < 900, locale: 'fr-FR', colorScheme: 'light' });
  await ctx.addInitScript(`window.__midiMode="ok"; window.__gumMode="none";`); await ctx.addInitScript(INIT.replace('${MODE}', 'ok'));
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL); await W(800); await closeOnboarding(p, 'midi');
  const base = await p.evaluate(() => JSON.parse(localStorage.getItem('memo-gammes-v1')));
  base.introSeen = Object.fromEntries(['hub','learn','games','free','play','quiz','chords','scales','harmony','prog','ear','daily','practice','runner','speed','memory'].map(k => [k, true]));
  Object.assign(base.settings, { lang: 'fr', notation: 'fr', uiSound: false, theme: 'light' });
  for (let i = 0; i < SC.length; i++) { const [title, fn, o = {}] = SC[i];
    const st = JSON.parse(JSON.stringify(base)); if (o.pay) { st.settings.paywall = true; st.prem = {}; delete st.pwShown; }
    await p.evaluate(([st, fresh]) => { localStorage.clear(); if (!fresh) localStorage.setItem('memo-gammes-v1', JSON.stringify(st)); }, [st, !!o.fresh]);
    await p.goto(URL + '?r=' + (n++)); await W(1300);
    await fn(p); await W(300);
    const file = `a${String(i).padStart(2, '0')}-${sz}`; await p.screenshot({ path: `${OUT}/${file}.png` });
    man.push({ i, title, size: sz, file }); console.log('ok', file, title, errs.splice(0).join(' | '));
  }
  await ctx.close();
}
fs.writeFileSync(`${OUT}/activation.json`, JSON.stringify(man)); await browser.close(); console.log('DONE');
