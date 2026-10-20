import { launch, closeOnboarding, gotoExercise, state, midi, URL } from './lib.mjs';
const { browser, page } = await launch({ mode: 'ok' });
await page.goto(URL); await page.waitForTimeout(1200);
console.log('after load', JSON.stringify(await state(page)));
await closeOnboarding(page, 'midi');
console.log('after onboarding', JSON.stringify(await state(page)));
await gotoExercise(page, 'chords');
console.log('exercise idle', JSON.stringify(await state(page)));
await midi.on(page, 60); await page.waitForTimeout(150);
console.log('after Do', JSON.stringify(await state(page)));
for (let r = 0; r < 2; r++) for (let n = 60; n < 72; n++) { await midi.on(page, n); await page.waitForTimeout(60); }
console.log('after brute', JSON.stringify(await state(page)));
await page.screenshot({ path: '/tmp/explore.png' });
await browser.close();
