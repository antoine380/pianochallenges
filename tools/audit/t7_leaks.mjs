// T7 : fuites — timers, handlers MIDI, AudioContext après 10 changements de page et 5 exercices.
import { launch, closeOnboarding, gotoExercise, state, midi, URL } from './lib.mjs';
const wait = (p, ms) => p.waitForTimeout(ms);
const { browser, page } = await launch({ mode: 'ok' });
await page.goto(URL); await wait(page, 1000);
await closeOnboarding(page, 'midi');
await page.evaluate(() => { const S = JSON.parse(localStorage.getItem('memo-gammes-v1')); S.settings.guideK = true; S.introSeen = { games: 1, daily: 1, chords: 1, scales: 1, harmony: 1, prog: 1, ear: 1, section: 1 }; localStorage.setItem('memo-gammes-v1', JSON.stringify(S)); });
await page.reload(); await wait(page, 1000); await closeOnboarding(page, 'midi');
const snap = async (label) => { const s = await state(page); const raf = await page.evaluate(() => new Promise(res => { let n = 0; const o = window.requestAnimationFrame; window.requestAnimationFrame = f => { n++; return o(f); }; setTimeout(() => { window.requestAnimationFrame = o; res(n); }, 300); })); console.log(label.padEnd(34), { intervals: s.intervals, timeouts: s.timeouts, handlersSet: s.handlersSet, ac: s.ac, raf300ms: raf, page: s.page, playing: s.playing }); return s; };
await snap('départ (hub)');
const NAV = ['learn', 'games', 'play', 'rank', 'settings', 'progress', 'learn', 'play', 'games', 'hub'];
for (const pg of NAV) {
  if (pg === 'hub') await page.click('#homeLink');
  else if (['learn', 'games', 'play'].includes(pg)) await page.evaluate(m => document.querySelector('.mode-item[data-mode="' + m + '"]').click(), pg);
  else await page.evaluate(id => document.getElementById(id).click(), { rank: 'rankBtn', settings: 'setBtn', progress: 'progBtn' }[pg]);
  await wait(page, 500); await closeOnboarding(page);
}
await snap('après 10 changements de page');
// 5 exercices complets (accords) via MIDI
await gotoExercise(page, 'chords');
for (let i = 0; i < 5; i++) {
  let s = await state(page);
  if (!s.playing || !s.slots.some(c => /cur/.test(c))) { await midi.on(page, 60); await wait(page, 150); }
  const exp = await page.evaluate(() => [...document.querySelectorAll('#kbd [data-m].k-guide')].map(k => +k.dataset.m));
  await page.evaluate(ns => ns.forEach(n => window.__midi.noteOn(n)), exp); await wait(page, 2100);
}
await snap('après 5 exercices');
// quitter l'exercice (hub), tout doit retomber
await page.click('#homeLink'); await wait(page, 600);
await snap('retour hub');
// ouvrir/fermer 5 fois la fenêtre MIDI (poll natif non concerné ici) et l'aide
for (let i = 0; i < 5; i++) { await page.evaluate(() => document.getElementById('midiBtn').click()); await wait(page, 150); await page.keyboard.press('Escape'); await wait(page, 150); await page.evaluate(() => document.getElementById('helpBtn').click()); await wait(page, 150); await page.keyboard.press('Escape'); await wait(page, 150); }
await snap('après 5× fenêtre MIDI + aide');
// 5 branchements/débranchements du clavier
for (let i = 0; i < 5; i++) { await page.evaluate(() => { window.__midi.remove(0); window.__midi.reconnect(0); }); await wait(page, 100); }
const s = await snap('après 5 débranchements/rebranchements');
console.log('handlers par port:', s.handlers, '| erreurs:', s.errors, page.consoleErrors.filter(e => !/ERR_TUNNEL|Failed to load resource/.test(e)));
await browser.close();
