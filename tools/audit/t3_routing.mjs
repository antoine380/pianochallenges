// T3 : exercice en cours + fenêtre ouverte (aide, MIDI, réglages, progression, niveaux) : les notes ne doivent pas être validées ; reprise à la fermeture.
import { launch, closeOnboarding, gotoExercise, state, midi, URL } from './lib.mjs';
const wait = (p, ms) => p.waitForTimeout(ms);
const { browser, page } = await launch({ mode: 'ok' });
await page.goto(URL); await wait(page, 1000);
await closeOnboarding(page, 'midi');
await gotoExercise(page, 'chords');
await page.evaluate(() => { const S = JSON.parse(localStorage.getItem('memo-gammes-v1')); S.settings.delay = 10; S.settings.diffV2 = true; S.settings.guideK = true; localStorage.setItem('memo-gammes-v1', JSON.stringify(S)); });
await page.reload(); await wait(page, 1000); await closeOnboarding(page, 'midi');
await gotoExercise(page, 'chords');
const guide = () => page.evaluate(() => [...document.querySelectorAll('#kbd [data-m].k-guide')].map(k => +k.dataset.m));
const secs = () => page.evaluate(() => document.getElementById('secs')?.textContent);
const WIN = {
  help: { open: () => page.evaluate(() => document.getElementById('helpBtn').click()), close: () => page.keyboard.press('Escape'), id: 'helpModal' },
  midi: { open: () => page.evaluate(() => document.getElementById('midiBtn').click()), close: () => page.keyboard.press('Escape'), id: 'midiModal' },
  settings: { open: () => page.evaluate(() => document.getElementById('setBtn').click()), close: () => page.keyboard.press('Escape'), id: 'settingsPage' },
  progress: { open: () => page.evaluate(() => document.getElementById('progBtn').click()), close: () => page.keyboard.press('Escape'), id: 'progressPage' },
  levels: { open: () => page.evaluate(() => document.getElementById('lvlAv').click()), close: () => page.keyboard.press('Escape'), id: 'charModal' },
  input: { open: () => page.evaluate(() => document.getElementById('mdChange').click()), close: () => page.keyboard.press('Escape'), id: 'inputModal' },
};
for (const [name, w] of Object.entries(WIN)) {
  // (re)démarrer un exercice propre
  let s = await state(page);
  if (s.playing) { await page.evaluate(() => document.getElementById('endBtn')?.click()); await wait(page, 300); await closeOnboarding(page); }
  await gotoExercise(page, 'chords');
  await midi.on(page, 60); await wait(page, 200);
  s = await state(page);
  if (!s.playing) { console.log('!! impossible de démarrer avant', name, s.modals, s.page); continue; }
  const exp = await guide();
  const secBefore = await secs();
  await w.open(); await wait(page, 600);
  s = await state(page);
  const opened = s.modals.includes(w.id) || (await page.evaluate(id => { const e = document.getElementById(id); return e && !e.hidden; }, w.id));
  const secAtOpen = await secs();
  await wait(page, 700);
  const secLater = await secs();
  // envoyer la réponse complète
  await page.evaluate(ns => ns.forEach(n => window.__midi.noteOn(n)), exp); await wait(page, 300);
  const sIn = await state(page);
  const validated = sIn.nSlotsOk;
  // fermer et vérifier la reprise
  await w.close(); await wait(page, 500);
  const sOut = await state(page);
  const secAfterClose = await secs(); await wait(page, 700); const secAfterClose2 = await secs();
  const stillOpen = await page.evaluate(id => { const e = document.getElementById(id); return e && !e.hidden; }, w.id);
  console.log(`\n== fenêtre ${name} (${w.id}) ==`);
  console.log('  ouverte:', opened, '| chrono gelé pendant:', secAtOpen, '->', secLater, '| réponse envoyée:', exp);
  console.log('  cases validées pendant la fenêtre:', validated, sIn.slots, 'sbVal:', sIn.sbVal, 'sbDetail:', sIn.sbDetail, validated ? '  <-- NOTES VALIDEES FENETRE OUVERTE' : '');
  console.log('  après fermeture: encore ouverte=', stillOpen, 'page=', sOut.page, 'playing=', sOut.playing, 'slots=', sOut.slots, 'phase cur?', sOut.slots.some(c => /cur/.test(c)), '| chrono repart:', secAfterClose, '->', secAfterClose2, '| inert=', sOut.inert, '| modals=', sOut.modals);
  if (validated && sIn.nSlotsOk === 3) { await wait(page, 2000); const s3 = await state(page); console.log('  2 s après (auto-avance pendant fenêtre ?) prompt=', s3.prompt, s3.slots); }
  if (stillOpen) { await closeOnboarding(page); await page.evaluate(id => { const e = document.getElementById(id); if (e) e.hidden = true; }, w.id); }
}
await browser.close();
