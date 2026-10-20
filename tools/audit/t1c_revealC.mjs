// T1c : après la révélation, rejouer la réponse qui contient un Do → le Do « continue » et les autres notes deviennent des fautes.
import { launch, closeOnboarding, gotoExercise, state, midi, URL } from './lib.mjs';
const wait = (p, ms) => p.waitForTimeout(ms);
const { browser, page } = await launch({ mode: 'ok' });
await page.goto(URL); await wait(page, 1000); await closeOnboarding(page, 'midi');
await gotoExercise(page, 'chords');
await page.evaluate(() => { const S = JSON.parse(localStorage.getItem('memo-gammes-v1')); S.settings.guideK = true; S.settings.autoNext = false; localStorage.setItem('memo-gammes-v1', JSON.stringify(S)); });
await page.reload(); await wait(page, 1000); await closeOnboarding(page, 'midi'); await gotoExercise(page, 'chords');
await midi.on(page, 60); await wait(page, 150);
let s = await state(page); console.log('exercice 1:', s.prompt);
const exp = await page.evaluate(() => [...document.querySelectorAll('#kbd [data-m].k-guide')].map(k => +k.dataset.m));
await page.keyboard.press('Space'); await wait(page, 1500); // « Montre-moi » → révélation
s = await state(page); console.log('après Espace (révélé):', s.slots, '| réponse', exp);
// le joueur rejoue l'accord révélé (plaqué), qui commence par un Do
await page.evaluate(ns => ns.forEach(n => window.__midi.noteOn(n)), exp); await wait(page, 300);
s = await state(page); console.log('après avoir rejoué', exp, '→ prompt', s.prompt, '| slots', s.slots, '| kBad', s.kBad, '| sbDetail', s.sbDetail, '| stage', s.stage.slice(0, 40));
// en phase succès : rejouer l'accord (Ré majeur : pas de Do) → rien ; puis un accord avec Do (Fa majeur = F A C)
await browser.close();
