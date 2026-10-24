// Captures of the Premium / invitation proposal (paywall preview on). Usage: OUT=dir [ONLY=ipad] node tools/audit/capture_premium.mjs
import { launch, closeOnboarding, URL } from './lib.mjs';
import fs from 'fs';
const OUT = process.env.OUT; fs.mkdirSync(OUT, { recursive: true });
const SIZES = [['ipad', 1024, 768], ['ipadp', 768, 1024], ['phone', 390, 844], ['phonel', 844, 390], ['desk', 1440, 900]];
const W = ms => new Promise(r => setTimeout(r, ms));
const click = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (e) e.click(); return !!e; }, sel);
const mode = (p, m) => click(p, `.mode-item[data-mode="${m}"]`);
const sec = async (p, v) => { await mode(p, 'learn'); await W(250); await p.evaluate(v => document.querySelector('#secTabs [data-v="' + v + '"]').click(), v); await W(500); };
const SC = [
  ['Paywall — offre annuelle', async p => { await click(p, '#premBtn'); await W(500); }],
  ['Paywall — formule Famille choisie', async p => { await click(p, '#premBtn'); await W(300); await click(p, '.pw-pick[data-p=family]'); await W(900); }],
  ['Paywall — essai commencé', async p => { await click(p, '#premBtn'); await W(300); await click(p, '#pwGo'); await W(900); }],
  ['Paywall — après une tonalité verrouillée', async p => { await sec(p, 'scales'); await p.evaluate(() => document.querySelectorAll('#suKeyMode .su-km')[1].click()); await W(500); }],
  ['LEARN — écran de départ en gratuit (verrous)', async p => { await sec(p, 'chords'); }],
  ['PLAY — morceaux en gratuit (verrous)', async p => { await mode(p, 'play'); await W(600); }],
  ['GAMES — salon : duels gratuits restants', async p => { await mode(p, 'games'); await W(300); await p.evaluate(() => document.querySelectorAll('#gameCards .ptile')[0].click()); await W(700); }],
  ['Accueil — carte « Invite tes amis »', async p => { await click(p, '#homeLink'); await W(500); }],
  ['Inviter des amis', async p => { await click(p, '#hsInv'); await W(500); if (!(await p.isVisible('#inv'))) { await click(p, '#setBtn'); await W(300); await click(p, '#spInv'); await W(400); } }],
  ['Réglages — abonnement', async p => { await click(p, '#setBtn'); await W(500); }],
  ['Connexion — invité par un ami', async p => {}, { fresh: 1, ref: 1 }],
];
const { browser } = await launch({ mode: 'ok' });
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean); let n = 0; const man = [];
for (const [sz, w, h] of SIZES.filter(x => !ONLY.length || ONLY.includes(x[0]))) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: w < 900, locale: 'fr-FR', colorScheme: 'light' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL); await W(800); await closeOnboarding(p, 'screen');
  const base = await p.evaluate(() => JSON.parse(localStorage.getItem('memo-gammes-v1')));
  base.introSeen = Object.fromEntries(['hub','learn','games','free','play','quiz','chords','scales','harmony','prog','ear','daily','practice','runner','speed','memory'].map(k => [k, true]));
  Object.assign(base.settings, { lang: 'fr', notation: 'fr', uiSound: false, theme: 'light', paywall: true }); base.prem = {}; delete base.duDay;
  for (let i = 0; i < SC.length; i++) { const [title, fn, o = {}] = SC[i];
    if (process.env.PICK && !process.env.PICK.split(',').includes(String(i))) continue;
    await p.evaluate(([st, fresh]) => { localStorage.clear(); if (!fresh) localStorage.setItem('memo-gammes-v1', JSON.stringify(st)); }, [base, !!o.fresh]);
    await p.goto(URL + '?r=' + (n++) + (o.ref ? '&ref=pabcd1234' : '')); await W(1100);
    await fn(p); await W(300);
    const file = `p${String(i).padStart(2, '0')}-${sz}.png`; await p.screenshot({ path: `${OUT}/${file}` });
    const ov = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: innerWidth }));
    man.push({ i, title, size: sz, file }); console.log('ok', file, title, ov.sw > ov.cw ? 'OVERFLOW-X' : '', errs.splice(0).join(' | '));
  }
  await ctx.close();
}
fs.writeFileSync(`${OUT}/premium-${ONLY.join('_') || 'all'}.json`, JSON.stringify(man));
await browser.close(); console.log('DONE');
