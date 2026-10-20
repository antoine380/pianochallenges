// T5 : clavier écran — souris, tactile, deux doigts ; son et validation ; relâchement.
import { launch, closeOnboarding, gotoExercise, state, midi, URL } from './lib.mjs';
const wait = (p, ms) => p.waitForTimeout(ms);
const { browser, context, page } = await launch({ mode: 'ok', hasTouch: true });
await page.goto(URL); await wait(page, 1000);
await closeOnboarding(page, 'screen');
await gotoExercise(page, 'chords');
await page.evaluate(() => { const S = JSON.parse(localStorage.getItem('memo-gammes-v1')); S.settings.guideK = true; localStorage.setItem('memo-gammes-v1', JSON.stringify(S)); });
await page.reload(); await wait(page, 1000); await closeOnboarding(page, 'screen');
await gotoExercise(page, 'chords');
const guide = () => page.evaluate(() => [...document.querySelectorAll('#kbd [data-m].k-guide')].map(k => +k.dataset.m));
const keyBox = async m => { const b = await page.locator(`#kbd [data-m="${m}"]`).boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height * 0.8 }; };
// écouteurs d'événements sur le clavier pour voir ce qui est posé
const listeners = await page.evaluate(() => { const k = document.getElementById('kbd'); const names = ['pointerdown', 'pointerup', 'pointercancel', 'pointermove', 'touchstart', 'touchend', 'mousedown', 'mouseup', 'click']; const probe = {}; names.forEach(n => { let fired = false; k.addEventListener(n, () => { fired = true; }, { once: true }); probe[n] = 0; }); return Object.keys(probe); });
// 1) démarrer avec le bouton Start (mode écran : pas de Do-démarre ?) → Espace
await page.keyboard.press('Space'); await wait(page, 200);
let s = await state(page); console.log('Espace → exercice:', s.playing, s.prompt);
let exp = await guide(); console.log('attendu:', exp);
// souris sur la basse
let o0 = s.osc;
const p0 = await keyBox(exp[0]);
await page.mouse.move(p0.x, p0.y); await page.mouse.down(); await wait(page, 50);
s = await state(page);
console.log('souris mousedown sur', exp[0], '→ k-press', s.kPress, 'slots', s.slots, 'osc +', s.osc - o0);
await wait(page, 700); await page.mouse.up(); await wait(page, 50);
s = await state(page); console.log('mouseup après 750 ms → k-press', s.kPress, '(le son dure 0,6 s fixe : pas de note tenue)');
// 2) tactile : tap sur la 3e note
o0 = s.osc;
const p2 = await keyBox(exp[2]);
await page.touchscreen.tap(p2.x, p2.y); await wait(page, 80);
s = await state(page); console.log('tap tactile sur', exp[2], '→ slots', s.slots, 'osc +', s.osc - o0, 'kBad', s.kBad);
// 3) deux doigts simultanés sur les 2 notes restantes (ou sur la tierce + une mauvaise note)
await wait(page, 300);
exp = await guide(); console.log('reste attendu:', exp);
const cdp = await context.newCDPSession(page);
const pts = [];
for (const m of exp.length ? exp : [64, 67]) { const b = await keyBox(m); pts.push({ x: Math.round(b.x), y: Math.round(b.y), id: pts.length }); }
o0 = s.osc;
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts });
await wait(page, 100);
s = await state(page); console.log('2 doigts (touchStart simultané) sur', exp, '→ slots', s.slots, 'kPress', s.kPress, 'osc +', s.osc - o0);
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await wait(page, 200);
s = await state(page); console.log('après touchEnd → sbVal', s.sbVal, 'sbDetail', s.sbDetail, 'erreurs', s.errors, page.consoleErrors);
// 3b) vrai test deux doigts : nouvel exercice, deux doigts sur basse + tierce en même temps
await wait(page, 2200);
exp = await guide(); console.log('nouvel exercice, attendu:', exp);
const pts2 = []; for (const m of exp.slice(0, 2)) { const b = await keyBox(m); pts2.push({ x: Math.round(b.x), y: Math.round(b.y), id: pts2.length }); }
o0 = (await state(page)).osc;
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts2 }); await wait(page, 100);
s = await state(page); console.log('2 doigts sur', exp.slice(0, 2), '→ slots', s.slots, 'kPress', s.kPress, 'osc +', s.osc - o0, '(4 = deux notes)');
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await wait(page, 100);
// 2 doigts : tierce + quinte en même temps avant la basse → fautes ?
await page.touchscreen.tap(...Object.values(await keyBox(exp[2]))); await wait(page, 100);
s = await state(page); console.log('puis quinte → slots', s.slots, 'sbDetail', s.sbDetail);
// 4) glissé (glissando) : pointerdown sur une touche puis déplacement sur d'autres → d'autres notes ?
await wait(page, 2200);
exp = await guide();
o0 = (await state(page)).osc;
const a = await keyBox(60), b = await keyBox(67);
await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 8 }); await page.mouse.up(); await wait(page, 100);
s = await state(page); console.log('glissé 60→67 : osc +', s.osc - o0, '(2 = une seule note, pas de glissando)');
// 5) appui long souris : y a-t-il un menu contextuel / sélection ? (contextmenu bloqué dans le code)
// 6) Play : la note écran envoie noteon puis noteoff après 400 ms
await page.click('.mode-item[data-mode="play"]'); await wait(page, 1500);
console.log('Play : clavier hôte visible ?', await page.evaluate(() => !!document.getElementById('kbd').offsetParent));
await browser.close();
