// T4 : page Play (iframe) — notes MIDI relayées, hôte silencieux, sortie de Play.
import { launch, closeOnboarding, gotoExercise, state, midi, URL, leaveIfAsked } from './lib.mjs';
const wait = (p, ms) => p.waitForTimeout(ms);
const { browser, page } = await launch({ mode: 'ok' });
await page.goto(URL); await wait(page, 1000);
await closeOnboarding(page, 'midi');
await page.click('.mode-item[data-mode="play"]'); await wait(page, 1500);
await page.locator('#playSongs .ptile').first().click(); await wait(page, 1500); // PLAY = catalogue on the host page (C6); a tile opens the song in the frame
let frame = page.frames().find(f => f.url().includes('play/'));
console.log('iframe:', frame && frame.url());
await frame.locator('#go').click(); await wait(page, 2500);
const fstate = () => frame.evaluate(() => ({ score: document.getElementById('sScore').textContent, playVisible: !document.getElementById('play').hidden, ovHidden: document.getElementById('ov').hidden, ac: window.__cnt.ac, osc: window.__cnt.osc, held: [...document.querySelectorAll('.key.down')].map(k => +k.dataset.m), front: null }));
let f = await fstate(); let h = await state(page);
console.log('morceau lancé:', f, '| hôte: page', h.page, 'ac', h.ac, 'osc', h.osc, 'playing', h.playing);
// Do depuis le faux MIDI de l'hôte : l'iframe doit marquer la note (note attendue = front)
const target = 60;
await midi.on(page, target, 100); await wait(page, 100);
let f2 = await fstate();
console.log('après note-on', target, '→ iframe held:', f2.held, 'score:', f2.score, '| osc iframe +', f2.osc - f.osc);
await midi.off(page, target); await wait(page, 100);
f2 = await fstate(); console.log('après note-off → held:', f2.held);
// vraie note Do(60) comme demandé
await midi.on(page, 60, 100); await wait(page, 60); await midi.off(page, 60); await wait(page, 100);
// balayage de toutes les notes (mode attente : la note attendue finit par être jouée → score > 0)
for (let n = 48; n <= 84; n++) { await midi.on(page, n, 90); await wait(page, 25); await midi.off(page, n); }
await wait(page, 300);
f2 = await fstate(); h = await state(page);
console.log('après 5 notes: score iframe', f2.score, '| hôte: osc créés', h.osc, 'ac', h.ac, 'slots ok', h.nSlotsOk, 'playing', h.playing, 'kPress', h.kPress);
console.log('AudioContext: hôte', h.ac, '| iframe', f2.ac);
// clavier écran de l'hôte visible sur Play ?
console.log('kbd hôte visible sur Play:', await page.evaluate(() => !!document.getElementById('kbd').offsetParent));
// touche clavier ordinateur (KeyA = Do) côté hôte pendant Play → relayé à l'iframe ? son hôte ?
let o0 = (await state(page)).osc, fo0 = (await fstate()).osc;
await page.keyboard.press('KeyA'); await wait(page, 150);
console.log('KeyA (focus dans l’iframe) → osc hôte +', (await state(page)).osc - o0, '| osc iframe +', (await fstate()).osc - fo0, '| held iframe', (await fstate()).held);
await page.evaluate(() => { document.getElementById('menuBtn')?.focus(); document.body.focus(); }); await page.mouse.click(600, 5);
o0 = (await state(page)).osc; fo0 = (await fstate()).osc;
await page.keyboard.press('KeyA'); await wait(page, 150);
console.log('KeyA (focus dans l’hôte) → osc hôte +', (await state(page)).osc - o0, '| osc iframe +', (await fstate()).osc - fo0, '| held iframe', (await fstate()).held, '(double son hôte+iframe si les deux > 0)');
o0 = (await state(page)).osc; fo0 = (await fstate()).osc;
await page.keyboard.press('Space'); await wait(page, 150);
console.log('Espace (focus hôte) → hôte playing =', (await state(page)).playing, 'prompt', (await state(page)).prompt);
await wait(page, 500);
// quitter Play → GAMES
await page.click('.mode-item[data-mode="games"]'); await wait(page, 600); await leaveIfAsked(page); await closeOnboarding(page); // a song in progress: « Quitter la partie ? » (24/10/2026)
const src = await page.evaluate(() => document.getElementById('playFrame').getAttribute('src'));
console.log('après GAMES: iframe src =', src, '| frames:', page.frames().map(x => x.url()));
const errBefore = page.consoleErrors.length;
await midi.on(page, 60); await wait(page, 60); await midi.off(page, 60); await midi.on(page, 64); await wait(page, 200);
h = await state(page);
console.log('notes après sortie : erreurs console nouvelles =', page.consoleErrors.slice(errBefore), '| erreurs page =', h.errors, '| page', h.page);
// retour sur Play : l'iframe se recharge (nouvel AudioContext ?)
await closeOnboarding(page); await page.click('.mode-item[data-mode="play"]'); await wait(page, 1500);
frame = page.frames().find(f => f.url().includes('play/'));
console.log('retour Play: iframe', frame && frame.url(), 'ac iframe', frame && await frame.evaluate(() => window.__cnt.ac));
await browser.close();
