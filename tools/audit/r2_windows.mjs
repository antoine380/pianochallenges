// Non-régression #3/#4 : pendant un exercice, les notes reçues fenêtre ouverte (aide, MIDI, niveaux, choix d'entrée, Réglages, Progression)
// ne valident rien ; dans la fenêtre MIDI elles allument seulement la touche (test du clavier). L'exercice reprend à la fermeture.
import { launch, closeOnboarding, gotoExercise, state, midi, URL } from './lib.mjs';
const wait = (p, ms) => p.waitForTimeout(ms);
const fails = [];
const check = (name, ok, detail) => { console.log((ok ? 'OK   ' : 'FAIL ') + name + (detail ? ' — ' + JSON.stringify(detail) : '')); if (!ok) fails.push(name); };
const { browser, page } = await launch({ mode: 'ok' });
await page.goto(URL); await wait(page, 1000); await closeOnboarding(page, 'midi');
await gotoExercise(page, 'chords');
await page.evaluate(() => { const S = JSON.parse(localStorage.getItem('memo-gammes-v1')); S.settings.delay = 10; S.settings.diffV2 = true; S.settings.guideK = true; localStorage.setItem('memo-gammes-v1', JSON.stringify(S)); });
await page.reload(); await wait(page, 1000); await closeOnboarding(page, 'midi');
const guide = () => page.evaluate(() => [...document.querySelectorAll('#kbd [data-m].k-guide')].map(k => +k.dataset.m));
const WIN = {
  help: { open: () => page.evaluate(() => document.getElementById('helpBtn').click()), close: () => page.keyboard.press('Escape'), id: 'helpModal' },
  midi: { open: () => page.evaluate(() => document.getElementById('midiBtn').click()), close: () => page.keyboard.press('Escape'), id: 'midiModal' },
  levels: { open: () => page.evaluate(() => document.getElementById('charMore').click()), close: () => page.keyboard.press('Escape'), id: 'charModal' }, // the avatar now opens the progress sheet; « Niveaux » opens the levels window
  input: { open: () => page.evaluate(() => document.getElementById('inChip').click()), close: () => page.keyboard.press('Escape'), id: 'inputModal' },
  settings: { open: () => page.evaluate(() => document.getElementById('setBtn').click()), close: () => page.evaluate(() => document.querySelector('#secTabs [data-v="chords"]').click()), id: 'settingsPage' },
  progress: { open: () => page.evaluate(() => document.getElementById('progBtn').click()), close: () => page.evaluate(() => document.querySelector('#secTabs [data-v="chords"]').click()), id: 'progressPage' },
};
for (const [name, w] of Object.entries(WIN)) {
  await page.evaluate(() => document.getElementById('homeLink').click()); await wait(page, 300);
  await gotoExercise(page, 'chords');
  await midi.on(page, 60); await wait(page, 200);
  let s = await state(page);
  if (!s.playing) { check(`${name} : exercice démarré`, false, { modals: s.modals, page: s.page }); continue; }
  const exp = await guide();
  await w.open(); await wait(page, 500);
  const opened = await page.evaluate(id => { const e = document.getElementById(id); return e && !e.hidden; }, w.id);
  check(`${name} : fenêtre ouverte`, opened, {});
  await page.evaluate(ns => ns.forEach(n => window.__midi.noteOn(n)), exp); await wait(page, 150);
  const sIn = await state(page);
  check(`${name} : aucune case validée fenêtre ouverte`, sIn.nSlotsOk === 0 && sIn.kBad.length === 0, { slots: sIn.slots, sbVal: sIn.sbVal });
  if (name === 'midi') check('midi : les notes allument les touches (test du clavier)', sIn.kPress.length > 0 || sIn.kHit.length > 0, { kPress: sIn.kPress, kHit: sIn.kHit });
  await w.close(); await wait(page, 500);
  const sOut = await state(page);
  check(`${name} : l’exercice reprend à la fermeture (phase écoute)`, sOut.page === 'practice' && sOut.playing && sOut.slots.some(c => /cur/.test(c)), { page: sOut.page, playing: sOut.playing, slots: sOut.slots, modals: sOut.modals });
  await page.evaluate(ns => ns.forEach(n => window.__midi.noteOn(n)), exp); await wait(page, 150);
  const sAfter = await state(page);
  check(`${name} : la réponse est acceptée après la fermeture`, sAfter.nSlotsOk === 3, { slots: sAfter.slots });
  await wait(page, 2200);
}
await browser.close();
if (fails.length) { console.log('\nECHEC r2 :', fails); process.exit(1); }
console.log('\nr2 OK');
