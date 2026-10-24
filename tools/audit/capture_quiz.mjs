// Captures du quiz (chantier QUIZ v3) : question en cours (2 joueurs, l'un a répondu), révélation, fin de partie.
// Usage : PORT=8796 OUT=/home/claude/captures-quiz3 TAG=apres node tools/audit/capture_quiz.mjs   (SIZES=375x667,… THEME=dark)
import { launch, closeOnboarding, URL } from './lib.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/captures-quiz', TAG = process.env.TAG || 'apres';
fs.mkdirSync(OUT, { recursive: true });
const SIZES = (process.env.SIZES || '375x667,812x375,768x1024,1024x768,1440x900').split(',').map(s => s.split('x').map(Number));
const wait = (p, ms) => p.waitForTimeout(ms);
for (const [w, h] of SIZES) {
  const phone = w < 700 || h < 500;
  const { browser, page } = await launch({ mode: 'ok', viewport: { width: w, height: h }, hasTouch: phone });
  const ev = (f, a) => page.evaluate(f, a);
  await page.goto(URL); await wait(page, 900); await closeOnboarding(page, 'midi');
  await ev(([t, ph]) => { const S = JSON.parse(localStorage.getItem('memo-gammes-v1')); S.settings.uiSound = false; if (t) S.settings.theme = t;
    S.settings.quiz = { n: ph ? 1 : 2, mode: 'dev', devs: ['screen', 'in-1'], names: ['Antoine', 'Léa'], diff: 1, ans: 'notes', bots: 1, botLvl: 1, where: 'local', count: 5, time: 30, theme: 'all', keys: true };
    S.xp = 2600; localStorage.setItem('memo-gammes-v1', JSON.stringify(S)); }, [process.env.THEME || '', phone]);
  await page.reload(); await wait(page, 900); await closeOnboarding(page);
  await ev(() => document.querySelector('#modeNav [data-mode=quiz]').click());
  for (let i = 0; i < 30 && !(await ev(() => !!window.QUIZ_DATA)); i++) await wait(page, 100);
  await wait(page, 300);
  await page.screenshot({ path: `${OUT}/${TAG}-reglages-${w}x${h}.png` });
  await ev(() => { const g = document.getElementById('qzGo'); if (g.offsetParent) g.click(); else { document.getElementById('qzToPlayers').click(); document.getElementById('qzGo').click(); } });
  await wait(page, 400);
  const right = () => ev(() => { const D = window.QUIZ_DATA, txt = document.getElementById('qzText').textContent; const q = D.q.find(x => x[2] === txt || x[4] === txt);
    const r = q[2] === txt ? q[3][0] : q[5][0]; const c = [...document.querySelectorAll('#qzAns .qz-a')]; const k = c.findIndex(a => a.querySelector('.qz-at').textContent === r);
    return { k, pcs: c.map(a => a.dataset.pcs.split(',').map(Number)) }; });
  const midiP2 = pcs => ev(pcs => pcs.forEach(pc => window.__midi.noteOn(60 + pc, 100, 0)), pcs);
  // question 1: Léa (MIDI) answers a wrong card, Antoine has not answered yet (phones, no MIDI: Antoine alone answers wrong, the bot thinks)
  let r = await right();
  if (phone) await ev(k => document.querySelectorAll('#qzAns .qz-a')[k].click(), (r.k + 1) % 4); else await midiP2(r.pcs[(r.k + 1) % 4]);
  await wait(page, 400);
  await page.screenshot({ path: `${OUT}/${TAG}-question-${w}x${h}.png` });
  // Antoine taps the right card: reveal (the bot may still be thinking: wait for the reveal)
  if (!phone) await ev(k => document.querySelectorAll('#qzAns .qz-a')[k].click(), r.k);
  for (let i = 0; i < 130 && await ev(() => document.getElementById('qzNext').hidden); i++) await wait(page, 200);
  await wait(page, 900);
  await page.screenshot({ path: `${OUT}/${TAG}-revelation-${w}x${h}.png` });
  for (let q = 1; q < 5; q++) {
    await ev(() => document.getElementById('qzNext').click()); await wait(page, 300);
    r = await right(); if (!phone) await midiP2(r.pcs[q % 2 ? r.k : (r.k + 1) % 4]); await wait(page, 250); await ev(k => document.querySelectorAll('#qzAns .qz-a')[k].click(), r.k);
    for (let i = 0; i < 130 && await ev(() => document.getElementById('qzNext').hidden); i++) await wait(page, 200);
    if (q === 3) { await wait(page, 900); await page.screenshot({ path: `${OUT}/${TAG}-revelation4-${w}x${h}.png` }); }
  }
  await ev(() => document.getElementById('qzNext').click()); await wait(page, 1600);
  await page.screenshot({ path: `${OUT}/${TAG}-fin-${w}x${h}.png` });
  const errs = await ev(() => window.__cnt.consoleErrors);
  if (errs.length) console.log(w + 'x' + h, 'erreurs :', errs);
  await browser.close(); console.log('ok', w + 'x' + h);
}
