// T5b : deux doigts sur le clavier écran, tierce listée avant la basse (ordre des touchPoints) → faute ?
import { launch, closeOnboarding, gotoExercise, state, URL } from './lib.mjs';
const wait = (p, ms) => p.waitForTimeout(ms);
const { browser, context, page } = await launch({ mode: 'ok', hasTouch: true });
await page.goto(URL); await wait(page, 1000); await closeOnboarding(page, 'screen');
await gotoExercise(page, 'chords');
await page.evaluate(() => { const S = JSON.parse(localStorage.getItem('memo-gammes-v1')); S.settings.guideK = true; localStorage.setItem('memo-gammes-v1', JSON.stringify(S)); });
await page.reload(); await wait(page, 1000); await closeOnboarding(page, 'screen'); await gotoExercise(page, 'chords');
await page.keyboard.press('Space'); await wait(page, 200);
const exp = await page.evaluate(() => [...document.querySelectorAll('#kbd [data-m].k-guide')].map(k => +k.dataset.m));
const keyBox = async m => { const b = await page.locator(`#kbd [data-m="${m}"]`).boundingBox(); return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height * 0.8) }; };
const cdp = await context.newCDPSession(page);
const pts = [{ ...(await keyBox(exp[1])), id: 0 }, { ...(await keyBox(exp[0])), id: 1 }];
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts }); await wait(page, 150);
const s = await state(page); console.log('accord', exp, 'deux doigts, tierce avant basse → slots', s.slots, 'kBad', s.kBad);
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await browser.close();
