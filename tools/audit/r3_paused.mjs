// Non-régression #5 : quitter Réglages/Progression par le menu (sans « retour ») ne doit pas laisser le drapeau `paused` périmé :
// le nouvel exercice doit se figer quand l'aide s'ouvre, et une seule boucle tick doit tourner après la fermeture.
import { launch, closeOnboarding, gotoExercise, state, midi, URL } from './lib.mjs';
const wait = (p, ms) => p.waitForTimeout(ms);
const fails = [];
const check = (name, ok, detail) => { console.log((ok ? 'OK   ' : 'FAIL ') + name + (detail ? ' — ' + JSON.stringify(detail) : '')); if (!ok) fails.push(name); };
const { browser, page } = await launch({ mode: 'ok' });
await page.goto(URL); await wait(page, 1000); await closeOnboarding(page, 'midi');
await gotoExercise(page, 'chords');
await page.evaluate(() => { const S = JSON.parse(localStorage.getItem('memo-gammes-v1')); S.settings.delay = 10; S.settings.diffV2 = true; localStorage.setItem('memo-gammes-v1', JSON.stringify(S)); });
await page.reload(); await wait(page, 1000); await closeOnboarding(page, 'midi');
const secs = () => page.evaluate(() => document.getElementById('secs')?.textContent);
const rafCount = () => page.evaluate(() => new Promise(res => { let n = 0; const o = window.requestAnimationFrame; window.requestAnimationFrame = f => { n++; return o(f); }; setTimeout(() => { window.requestAnimationFrame = o; res(n); }, 300); }));
for (const info of ['setBtn', 'progBtn']) {
  await gotoExercise(page, 'chords');
  await midi.on(page, 60); await wait(page, 200);
  await page.evaluate(id => document.getElementById(id).click(), info); await wait(page, 400);
  const p1 = await secs(); await wait(page, 700); const p2 = await secs();
  check(`${info} : chrono gelé sur la page info`, p1 === p2, { p1, p2 });
  await page.evaluate(() => document.querySelector('.mode-item[data-mode="learn"]').click()); await wait(page, 400); await closeOnboarding(page);
  await gotoExercise(page, 'chords');
  await midi.on(page, 60); await wait(page, 200);
  check(`${info} → menu → nouvel exercice : une seule boucle tick`, (await rafCount()) < 30, {});
  await page.evaluate(() => document.getElementById('helpBtn').click()); await wait(page, 300);
  const a = await secs(); await wait(page, 1000); const b = await secs();
  check(`${info} → menu → nouvel exercice : le chrono se fige pendant l’aide`, a === b, { a, b });
  await page.keyboard.press('Escape'); await wait(page, 300);
  const n = await rafCount();
  check(`${info} → … → après fermeture de l’aide : une seule boucle tick`, n < 30, { raf300ms: n });
  const c = await secs(); await wait(page, 700); const d = await secs();
  check(`${info} → … → le chrono repart après l’aide`, c !== d, { c, d });
  await page.evaluate(() => document.getElementById('homeLink').click()); await wait(page, 300);
}
await browser.close();
if (fails.length) { console.log('\nECHEC r3 :', fails); process.exit(1); }
console.log('\nr3 OK');
