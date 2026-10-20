// T3b : drapeau `paused` périmé après avoir quitté Réglages/Progression par le menu (sans « retour »).
import { launch, closeOnboarding, gotoExercise, state, midi, URL } from './lib.mjs';
const wait = (p, ms) => p.waitForTimeout(ms);
const { browser, page } = await launch({ mode: 'ok' });
await page.goto(URL); await wait(page, 1000);
await closeOnboarding(page, 'midi');
await gotoExercise(page, 'chords');
await page.evaluate(() => { const S = JSON.parse(localStorage.getItem('memo-gammes-v1')); S.settings.delay = 10; S.settings.diffV2 = true; localStorage.setItem('memo-gammes-v1', JSON.stringify(S)); });
await page.reload(); await wait(page, 1000); await closeOnboarding(page, 'midi');
const secs = () => page.evaluate(() => document.getElementById('secs')?.textContent);
const rafCount = async () => { // nombre de boucles tick actives : on compte les rAF demandés sur 300 ms
  return page.evaluate(() => new Promise(res => { let n = 0; const o = window.requestAnimationFrame; window.requestAnimationFrame = f => { n++; return o(f); }; setTimeout(() => { window.requestAnimationFrame = o; res(n); }, 300); }));
};
// 1) exercice → Réglages (pause) → menu LEARN (sans retour) → nouvel exercice → Aide : le chrono est-il gelé ?
await gotoExercise(page, 'chords');
await midi.on(page, 60); await wait(page, 200);
await page.evaluate(() => document.getElementById('setBtn').click()); await wait(page, 400);
console.log('sur Réglages, chrono:', await secs(), '→ 700 ms →', await (async () => { await wait(page, 700); return secs(); })());
await page.evaluate(() => document.querySelector('.mode-item[data-mode="learn"]').click()); await wait(page, 400); await closeOnboarding(page);
await gotoExercise(page, 'chords');
await midi.on(page, 60); await wait(page, 200);
console.log('nouvel exercice, rAF/300ms (1 boucle ≈ 18):', await rafCount());
await page.evaluate(() => document.getElementById('helpBtn').click()); await wait(page, 300);
const a = await secs(); await wait(page, 1000); const b = await secs();
console.log('Aide ouverte, chrono:', a, '→ 1 s →', b, a === b ? 'gelé (OK)' : '  <-- LE CHRONO CONTINUE PENDANT L\'AIDE (drapeau paused périmé)');
await page.keyboard.press('Escape'); await wait(page, 300);
console.log('après fermeture Aide, rAF/300ms:', await rafCount(), '(>30 = deux boucles tick)');
// le chrono expire : combien de fois reveal() ? (slots rev + sons)
const osc0 = (await state(page)).osc;
await wait(page, 10500);
const s = await state(page); console.log('après expiration: slots', s.slots, 'osc créés', s.osc - osc0, 'erreurs', s.errors, page.consoleErrors.slice(-2));
await browser.close();
