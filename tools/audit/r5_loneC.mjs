// Non-régression #7 : seul un Do joué SEUL (groupe de 35 ms) continue après la réponse ; un accord qui contient un Do est ignoré
// en phase révélée / succès (pas de nouvel exercice, pas de fautes) ; les notes reçues 300 ms après « continuer » ne sont pas notées.
import { launch, closeOnboarding, gotoExercise, state, midi, URL } from './lib.mjs';
const wait = (p, ms) => p.waitForTimeout(ms);
const fails = [];
const check = (name, ok, detail) => { console.log((ok ? 'OK   ' : 'FAIL ') + name + (detail ? ' — ' + JSON.stringify(detail) : '')); if (!ok) fails.push(name); };
const { browser, page } = await launch({ mode: 'ok' });
await page.goto(URL); await wait(page, 1000); await closeOnboarding(page, 'midi');
await gotoExercise(page, 'chords');
await page.evaluate(() => { const S = JSON.parse(localStorage.getItem('memo-gammes-v1')); S.settings.guideK = true; S.settings.autoNext = false; S.settings.delay = 0; localStorage.setItem('memo-gammes-v1', JSON.stringify(S)); });
await page.reload(); await wait(page, 1000); await closeOnboarding(page, 'midi'); await gotoExercise(page, 'chords');
const guide = () => page.evaluate(() => [...document.querySelectorAll('#kbd [data-m].k-guide')].map(k => +k.dataset.m));
// 1) révélé : rejouer l'accord révélé (C Major = commence par un Do)
await midi.on(page, 60); await wait(page, 150);
let s = await state(page); const prompt1 = s.prompt;
check('exercice 1 démarré par un Do', s.playing, { prompt: prompt1 });
const exp = await guide();
await page.keyboard.press('Space'); await wait(page, 1500);
s = await state(page);
check('Espace révèle la réponse', s.slots.every(c => /rev/.test(c)), { slots: s.slots, exp });
await page.evaluate(ns => ns.forEach(n => window.__midi.noteOn(n)), exp); await wait(page, 300);
s = await state(page);
check('révélé : rejouer l’accord (avec Do) ne continue pas', s.prompt === prompt1 && s.slots.every(c => /rev/.test(c)), { prompt: s.prompt, slots: s.slots });
check('révélé : rejouer l’accord ne crée pas de fautes', s.kBad.length === 0, { kBad: s.kBad });
// 2) un Do seul continue
await midi.on(page, 60); await wait(page, 100);
s = await state(page);
check('révélé : un Do seul continue (nouvel exercice en écoute)', s.playing && s.slots[0].includes('cur') && !s.slots.some(c => /rev/.test(c)), { prompt: s.prompt, slots: s.slots });
// 3) une note 100 ms après « continuer » n'est pas notée comme faute
const exp2 = await guide();
const wrong = exp2.includes(61) ? 62 : 61;
await midi.on(page, wrong); await wait(page, 100);
s = await state(page);
check('note reçue <300 ms après « continuer » : ni faute ni validation', s.kBad.length === 0 && s.nSlotsOk === 0 && !s.slots.some(c => /err/.test(c)), { kBad: s.kBad, slots: s.slots });
await wait(page, 400);
await page.evaluate(ns => ns.forEach(n => window.__midi.noteOn(n)), exp2); await wait(page, 200);
s = await state(page);
check('puis la réponse plaquée est validée (succès)', s.nSlotsOk === exp2.length, { slots: s.slots });
// 4) succès : rejouer un accord qui contient un Do (ex. Fa majeur 65-69-72) → ignoré
const prompt2 = s.prompt;
await page.evaluate(() => [65, 69, 72].forEach(n => window.__midi.noteOn(n))); await wait(page, 300);
s = await state(page);
check('succès : un accord contenant un Do ne démarre pas l’exercice suivant', s.prompt === prompt2 && s.nSlotsOk === exp2.length, { prompt: s.prompt, slots: s.slots });
await midi.on(page, 72); await wait(page, 200);
s = await state(page);
check('succès : un Do seul (72) démarre l’exercice suivant', s.slots[0].includes('cur') && s.nSlotsOk === 0, { prompt: s.prompt, slots: s.slots });
await browser.close();
if (fails.length) { console.log('\nECHEC r5 :', fails); process.exit(1); }
console.log('\nr5 OK');
