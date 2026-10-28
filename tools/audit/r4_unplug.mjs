// Non-régression #6 : un clavier débranché (state=disconnected, port encore dans access.inputs comme Chrome) disparaît de la liste,
// perd son handler, et le statut MIDI passe à « aucun clavier » quand tout est débranché ; rebranchement OK.
import { launch, closeOnboarding, gotoExercise, state, midi, URL } from './lib.mjs';
const wait = (p, ms) => p.waitForTimeout(ms);
const fails = [];
const check = (name, ok, detail) => { console.log((ok ? 'OK   ' : 'FAIL ') + name + (detail ? ' — ' + JSON.stringify(detail) : '')); if (!ok) fails.push(name); };
const { browser, page } = await launch({ mode: 'ok' });
await page.goto(URL); await wait(page, 1000); await closeOnboarding(page, 'midi');
await gotoExercise(page, 'chords');
await page.evaluate(() => window.__midi.addSecond()); await wait(page, 200);
let s = await state(page);
check('2 claviers branchés : les deux ont un handler', s.handlers.every(h => h.has), s.handlers);
await page.evaluate(() => window.__midi.disconnect(1)); await wait(page, 200);
s = await state(page);
const names = () => page.evaluate(() => { document.getElementById('midiBtn').click(); const n = [...document.querySelectorAll('#mDevList li')].map(l => l.textContent); document.getElementById('midiX').click(); return n; });
let n = await names();
check('clavier 2 débranché : absent de la liste des appareils', !n.some(x => x.startsWith('Fake Keyboard 25')) && n.some(x => x.startsWith('Fake Keyboard 61')), { names: n });
check('clavier 2 débranché : son handler est retiré', !s.handlers[1].has && s.handlers[0].has, s.handlers);
check('clavier 2 débranché : le statut nomme encore le clavier 1', s.midiOn && /61/.test(s.midiTxt), { midiTxt: s.midiTxt });
await page.evaluate(() => window.__midi.disconnect(0)); await wait(page, 200);
s = await state(page);
n = await names();
check('tous débranchés : bouton MIDI éteint', !s.midiOn, { midiTxt: s.midiTxt, midiOn: s.midiOn });
check('tous débranchés : aucun appareil listé', !n.some(x => x.startsWith('Fake Keyboard 61')) && !n.some(x => x.startsWith('Fake Keyboard 25')), { names: n });
await page.evaluate(() => window.__midi.reconnect(0)); await wait(page, 200);
s = await state(page);
check('rebranchement : le clavier 1 revient', s.midiOn && s.handlers[0].has && /61/.test(s.midiTxt), { midiTxt: s.midiTxt, handlers: s.handlers });
await browser.close();
if (fails.length) { console.log('\nECHEC r4 :', fails); process.exit(1); }
console.log('\nr4 OK');
