// MIDI shortcuts (Oct 2026): a lone C goes on, a lone B starts again — on the start screen, a revealed answer, a nailed exercise,
// the summary of a game on one chosen scale (C = next key, B = same scale again), and in the quiz. Also checks the notes / chords cards of the scales.
import { launch, closeOnboarding, gotoExercise, state, midi, URL } from './lib.mjs';
const wait = (p, ms) => p.waitForTimeout(ms);
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d ? ' — ' + JSON.stringify(d) : '')); if (!ok) fails.push(n); };
const { browser, page } = await launch({ mode: 'ok' });
await page.goto(URL); await wait(page, 1000); await closeOnboarding(page, 'midi');
await page.evaluate(() => { const S = JSON.parse(localStorage.getItem('memo-gammes-v1')); Object.assign(S.settings, { autoNext: false, delay: 0, dir: 'up', scMode: 'notes', guideN: false, guideK: false, guideP: false, uiSound: false, su: { scales: { tids: [], keys: 'pick', picked: [0] } } }); localStorage.setItem('memo-gammes-v1', JSON.stringify(S)); });
await page.reload(); await wait(page, 1000); await closeOnboarding(page, 'midi');
await page.evaluate(() => document.querySelector('.mode-item[data-mode="learn"]').click()); await wait(page, 300);
await page.evaluate(() => document.querySelectorAll('#learnTiles .ptile')[1].click()); await wait(page, 500); await closeOnboarding(page);
const ev = f => page.evaluate(f);
check('gammes : 2 grandes cartes Notes / Accords', await ev(() => !document.getElementById('suMode').hidden && document.querySelectorAll('#suMode .su-mode').length === 2));
await ev(() => document.querySelectorAll('#suMode .su-mode')[1].click()); await wait(page, 200);
check('accords : la case « Accords de 7e » apparaît', await ev(() => !!document.getElementById('suSc7')));
await ev(() => document.querySelectorAll('#suMode .su-mode')[0].click()); await wait(page, 200);
check('notes : la case 7e disparaît', await ev(() => !document.getElementById('suSc7')));
// C on the start screen starts the chosen scale
await midi.on(page, 60); await wait(page, 300);
let s = await state(page); const p1 = s.prompt;
check('écran de départ : un Do lance la gamme', s.playing && /Do/.test(p1), { prompt: p1 });
// reveal, then a lone B starts the same exercise again
await page.keyboard.press('Space'); await wait(page, 1200);
await midi.on(page, 71); await wait(page, 300);
s = await state(page);
check('réponse révélée : un Si seul recommence le même exercice', s.playing && s.prompt === p1 && !s.slots.some(c => /rev/.test(c)), { prompt: s.prompt, slots: s.slots });
// nail the scale (C major up), then B = again, C = next
const play = async ns => { for (const n of ns) { await midi.on(page, n); await wait(page, 90); } await wait(page, 300); };
const CMAJ = [60, 62, 64, 65, 67, 69, 71, 72];
await play(CMAJ);
check('gamme réussie', await ev(() => document.body.classList.contains('playing')) && (await state(page)).nSlotsOk === 8);
await midi.on(page, 71); await wait(page, 300);
s = await state(page);
check('réussie : un Si seul la rejoue', s.playing && s.prompt === p1 && s.nSlotsOk === 0, { prompt: s.prompt });
// the first try was revealed, so the scale comes back once more (a game on one scale goes on until it is nailed)
await play(CMAJ); await midi.on(page, 60); await wait(page, 400);
check('révélée au 1er essai : la gamme revient', (await state(page)).playing && await ev(() => document.getElementById('endModal').hidden));
await play(CMAJ); await midi.on(page, 60); await wait(page, 500);
const end = await ev(() => [!document.getElementById('endModal').hidden, [...document.querySelectorAll('#endFoot button')].map(b => b.textContent)]);
check('fin de partie : boutons Recommencer et Suivant', end[0] && end[1].some(t => /Recommencer/.test(t)) && end[1].some(t => /Suivant : /.test(t)), end);
await midi.on(page, 71); await wait(page, 400);
s = await state(page);
check('fin de partie : un Si rejoue la même gamme', s.playing && s.prompt === p1 && await ev(() => document.getElementById('endModal').hidden), { prompt: s.prompt });
await play(CMAJ); await midi.on(page, 60); await wait(page, 500);
const nextLbl = await ev(() => [...document.querySelectorAll('#endFoot button')].map(b => b.textContent).find(t => /Suivant/.test(t)));
await midi.on(page, 60); await wait(page, 400);
s = await state(page);
check('fin de partie : un Do passe à la tonalité suivante', s.playing && s.prompt !== p1 && nextLbl && nextLbl.replace(/^Suivant : /, '').replace(/[A-Z]{1,3}$/, '').trim().toLowerCase().includes(s.prompt.toLowerCase().split(' ')[0]), { next: nextLbl, prompt: s.prompt });
const errs = await ev(() => window.__cnt.consoleErrors);
check('aucune erreur JS', errs.length === 0, errs);
await browser.close();
if (fails.length) { console.log('\nECHEC r8 :', fails); process.exit(1); }
console.log('\nr8 OK');
