// Captures of every screen (5 sizes, light + dark on iPad/iPhone) for the Figma review file. Usage: OUT=dir [ONLY=ipad] [THEME=light] [PICK=0,3] node tools/audit/capture_review.mjs
import { launch, closeOnboarding, URL } from './lib.mjs';
import fs from 'fs';
const OUT = process.env.OUT; fs.mkdirSync(OUT, { recursive: true });
const SIZES = [['ipad', 'iPad paysage', 1024, 768], ['ipadp', 'iPad portrait', 768, 1024], ['phone', 'iPhone', 390, 844], ['phonel', 'iPhone paysage', 844, 390], ['desk', 'Ordinateur', 1440, 900]];
const DARK = ['ipad', 'phone'];
const W = ms => new Promise(r => setTimeout(r, ms));
const click = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (e) e.click(); return !!e; }, sel);
const mode = (p, m) => click(p, `.mode-item[data-mode="${m}"]`);
const sec = async (p, v) => { await mode(p, 'learn'); await W(250); await p.evaluate(v => document.querySelector('#secTabs [data-v="' + v + '"]').click(), v); await W(500); };
const frame = p => p.frames().find(f => /play\/index\.html/.test(f.url()));
const startGame = async p => { await click(p, '#duModes [data-m=solo]'); await W(400); await p.keyboard.press('Space').catch(() => {}); await W(200);
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(b => b.offsetParent && /^(Commencer|Jouer|Démarrer)/i.test(b.textContent.trim())); b && b.click(); }); await W(300);
  const box = await p.evaluate(() => { const c = [...document.querySelectorAll('canvas, .gm-board, [id^=sp], [id^=mm], [id^=gm]')].filter(e => e.offsetParent && e.getBoundingClientRect().height > 80).sort((a, b) => b.getBoundingClientRect().width * b.getBoundingClientRect().height - a.getBoundingClientRect().width * a.getBoundingClientRect().height)[0]; if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  if (box) await p.mouse.click(box.x, box.y); await W(2600); };
const onbTo = async (p, step) => { // step: q1 | q3 | sum | tour
  await click(p, '#gateGuest'); await W(500); if (step === 'q1') return;
  const pick = i => p.evaluate(i => document.querySelectorAll('.onb-opt')[i].click(), i);
  await pick(1); await pick(2); await click(p, '#onbNext'); await W(250); await pick(0); await W(500); if (step === 'q3') return;
  await pick(0); await W(500); await p.evaluate(() => [...document.querySelectorAll('.onb-opt')].pop().click()); await W(500); await pick(1); await W(500);
  await click(p, '#onbNext'); await W(400); if (step === 'sum') return; await click(p, '#onbNext'); await W(900); };
// [part, title, fn, {fresh, set}]
const SC = [
  ['Démarrage', 'Connexion — créer un compte', async p => {}, { fresh: 1 }],
  ['Démarrage', 'Connexion — se connecter', async p => { await click(p, '.gt-tabs [data-m=login]'); await W(200); }, { fresh: 1 }],
  ['Démarrage', 'Onboarding — question 1', p => onbTo(p, 'q1'), { fresh: 1 }],
  ['Démarrage', 'Onboarding — question 3 (solfège)', p => onbTo(p, 'q3'), { fresh: 1 }],
  ['Démarrage', 'Onboarding — résumé', p => onbTo(p, 'sum'), { fresh: 1 }],
  ['Démarrage', 'Tutoriel guidé', p => onbTo(p, 'tour'), { fresh: 1 }],
  ['Accueil', 'Accueil', async p => { await click(p, '#homeLink'); await W(500); }],
  ['LEARN', 'LEARN — matières', async p => { await mode(p, 'learn'); await W(500); }],
  ['LEARN', 'Écran de départ — Accords', p => sec(p, 'chords')],
  ['LEARN', 'Écran de départ — Gammes', p => sec(p, 'scales')],
  ['LEARN', 'Exercice — Accords', async p => { await sec(p, 'chords'); await click(p, '#suGo'); await W(800); }],
  ['LEARN', 'Exercice — Gammes', async p => { await sec(p, 'scales'); await click(p, '#suGo'); await W(800); }],
  ['LEARN', 'Gammes — réponse affichée', async p => { await sec(p, 'scales'); await click(p, '#suGo'); await W(700); await p.keyboard.press('Space'); await W(900); }],
  ['LEARN', 'Gammes — avec la portée (solfège)', async p => { await sec(p, 'scales'); await click(p, '#suGo'); await W(900); }, { set: { staff: true } }],
  ['LEARN', 'Exercice — Harmonie', async p => { await sec(p, 'harmony'); await click(p, '#suGo'); await W(800); }],
  ['LEARN', 'Exercice — Progressions', async p => { await sec(p, 'prog'); await click(p, '#suGo'); await W(800); }],
  ['LEARN', 'Exercice — Oreille', async p => { await sec(p, 'ear'); await click(p, '#suGo'); await W(1200); }],
  ['LEARN', 'Entraînement du jour', async p => { await click(p, '#dailyCard'); await W(900); }],
  ['GAMES', 'GAMES — jeux', async p => { await mode(p, 'games'); await W(500); }],
  ['GAMES', 'Salon de duel', async p => { await mode(p, 'games'); await W(300); await p.evaluate(() => document.querySelectorAll('#gameCards .ptile')[0].click()); await W(700); }],
  ['GAMES', 'Duel — contre un bot', async p => { await mode(p, 'games'); await W(300); await p.evaluate(() => document.querySelectorAll('#gameCards .ptile')[0].click()); await W(600); await click(p, '#duModes [data-m=bots]'); await W(600); }],
  ['GAMES', 'Saute-notes — partie', async p => { await mode(p, 'games'); await W(300); await p.evaluate(() => document.querySelectorAll('#gameCards .ptile')[0].click()); await W(600); await startGame(p); }],
  ['GAMES', 'Contre la montre — partie', async p => { await mode(p, 'games'); await W(300); await p.evaluate(() => document.querySelectorAll('#gameCards .ptile')[1].click()); await W(600); await startGame(p); }],
  ['GAMES', 'Mémoire musicale — partie', async p => { await mode(p, 'games'); await W(300); await p.evaluate(() => document.querySelectorAll('#gameCards .ptile')[2].click()); await W(600); await startGame(p); }],
  ['GAMES', 'Jeu Play — Note Runner', async p => { await mode(p, 'games'); await W(300); await p.evaluate(() => document.querySelector('#playCards .ptile').click()); await W(1800); }],
  ['PLAY', 'PLAY — morceaux et piano libre', async p => { await mode(p, 'play'); await W(600); }],
  ['PLAY', 'Lecteur — présentation du morceau', async p => { await mode(p, 'play'); await W(400); await click(p, '#playSongs .ptile'); await W(1800); }],
  ['PLAY', 'Lecteur — cascade', async p => { await mode(p, 'play'); await W(400); await click(p, '#playSongs .ptile'); await W(1800); const f = frame(p); if (f) { await f.evaluate(() => document.getElementById('go').click()); await W(3400); } }],
  ['PLAY', 'Lecteur — partition (solfège)', async p => { await mode(p, 'play'); await W(400); await click(p, '#playSongs .ptile'); await W(1800); const f = frame(p); if (f) { await f.evaluate(() => { localStorage.removeItem('clavio:sheet'); }); await f.evaluate(() => document.getElementById('go').click()); await W(3400); } }, { set: { staff: true } }],
  ['QUIZ', 'QUIZ — réglages', async p => { await mode(p, 'quiz'); await W(600); }],
  ['QUIZ', 'QUIZ — question', async p => { await mode(p, 'quiz'); await W(500); await click(p, '#qzGo'); await W(3500); }],
  ['Compte et réglages', 'Réglages', async p => { await click(p, '#setBtn'); await W(500); }],
  ['Compte et réglages', 'Fiche Progression', async p => { await click(p, '#lvlAv'); await W(600); }],
  ['Compte et réglages', 'Notifications', async p => { await click(p, '#ntfBtn'); await W(500); }],
  ['Compte et réglages', 'Classement', async p => { await click(p, '#rankBtn'); await W(1500); }],
  ['Compte et réglages', 'Profil', async p => { await click(p, '#accountBtn'); await W(1500); }],
];
const man = [];
const { browser } = await launch({ mode: 'ok' });
let n = 0;
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
for (const [sz, szName, w, h] of SIZES.filter(x => !ONLY.length || ONLY.includes(x[0]))) for (const theme of (DARK.includes(sz) ? ['light', 'dark'] : ['light']).filter(t => !process.env.THEME || t === process.env.THEME)) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: w < 900, isMobile: false, locale: 'fr-FR', colorScheme: theme });
  const p = await ctx.newPage();
  await p.goto(URL); await W(800); await closeOnboarding(p, 'screen');
  const base = await p.evaluate(() => JSON.parse(localStorage.getItem('memo-gammes-v1')));
  base.introSeen = Object.fromEntries(['hub','learn','games','free','play','quiz','chords','scales','harmony','prog','ear','daily','practice','runner','speed','memory','rank','account','settings','progress','notif'].map(k => [k, true]));
  Object.assign(base.settings, { lang: 'fr', notation: 'fr', uiSound: false, theme, staff: false, staffRead: false });
  for (let i = 0; i < SC.length; i++) {
    if (process.env.PICK && !process.env.PICK.split(',').includes(String(i))) continue;
    const [part, title, fn, o = {}] = SC[i];
    try {
      await p.evaluate(([st, fresh, theme]) => { localStorage.clear(); if (!fresh) localStorage.setItem('memo-gammes-v1', JSON.stringify(st));  }, [{ ...base, settings: { ...base.settings, ...(o.set || {}) } }, !!o.fresh, theme]);
      await p.goto(URL + '?r=' + (n++)); await W(1100);
      await fn(p); await W(300);
      const file = `${String(i).padStart(2, '0')}-${sz}-${theme}.png`;
      await p.screenshot({ path: `${OUT}/${file}` });
      man.push({ i, part, title, size: sz, sizeName: szName, theme, w, h, file });
      console.log('ok', file, title);
    } catch (e) { console.log('ERR', sz, theme, title, e.message.split('\n')[0]); }
  }
  await ctx.close();
}
fs.writeFileSync(`${OUT}/manifest-${ONLY.join('_')||'all'}.json`, JSON.stringify(man, null, 1));
await browser.close(); console.log('DONE', man.length);
