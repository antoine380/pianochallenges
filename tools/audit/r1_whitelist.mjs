// Non-régression #1/#2/#51 : un Do MIDI ou la touche Espace ne doit démarrer aucun exercice hors des pages Entraînement / Défi du jour ;
// sur Play, le clavier ordinateur relaie les lettres au cadre sans son côté hôte.
import { launch, closeOnboarding, gotoExercise, state, midi, URL } from './lib.mjs';
const wait = (p, ms) => p.waitForTimeout(ms);
const fails = [];
const check = (name, ok, detail) => { console.log((ok ? 'OK   ' : 'FAIL ') + name + (detail ? ' — ' + JSON.stringify(detail) : '')); if (!ok) fails.push(name); };
const { browser, page } = await launch({ mode: 'ok' });
await page.goto(URL); await wait(page, 1000);
await closeOnboarding(page, 'midi');
const NAV = {
  hub: () => page.click('#homeLink'),
  learn: () => page.click('.mode-item[data-mode="learn"]'),
  play: () => page.click('.mode-item[data-mode="play"]'),
  games: () => page.click('.mode-item[data-mode="games"]'),
  rank: () => page.click('#rankBtn'),
  settings: () => page.click('#setBtn'),
  progress: () => page.click('#lvlAv'), // the level card opens the progress sheet
};
for (const pg of Object.keys(NAV)) {
  await gotoExercise(page, 'chords');
  await NAV[pg](); await wait(page, 600); await closeOnboarding(page);
  const before = await state(page);
  await page.evaluate(() => { document.getElementById('menuBtn')?.focus(); document.body.focus(); });
  await midi.on(page, 60); await wait(page, 250);
  const afterDo = await state(page);
  await page.keyboard.press('Space'); await wait(page, 250);
  const afterSpace = await state(page);
  check(`page ${pg} : page attendue`, before.page === (pg==='play'?'free':pg), { page: before.page }); // PLAY = host page "free" (song tiles + free piano)
  check(`page ${pg} : un Do MIDI ne démarre pas d’exercice`, !afterDo.playing, { playing: afterDo.playing, prompt: afterDo.prompt });
  check(`page ${pg} : Espace ne démarre pas d’exercice`, !afterSpace.playing, { playing: afterSpace.playing, prompt: afterSpace.prompt });
}
// la page d'exercice, elle, doit toujours démarrer sur un Do
await gotoExercise(page, 'chords');
await midi.on(page, 60); await wait(page, 250);
let s = await state(page);
check('page practice : un Do MIDI démarre l’exercice', s.playing && s.page === 'practice', { page: s.page, playing: s.playing });
// Play : KeyA côté hôte → relayé au cadre, aucun son côté hôte
await page.click('.mode-item[data-mode="play"]'); await wait(page, 500);
await page.locator('#playSongs .ptile').first().click(); await wait(page, 1500); // a song tile opens the song in the Play frame
const frame = page.frames().find(f => f.url().includes('play/'));
await frame.locator('#go').click(); await wait(page, 2000);
await page.evaluate(() => { document.getElementById('menuBtn')?.focus(); document.body.focus(); }); await page.mouse.click(600, 5);
const o0 = (await state(page)).osc;
await page.keyboard.press('KeyA'); await wait(page, 150);
const held = await frame.evaluate(() => [...document.querySelectorAll('.key.down')].map(k => +k.dataset.m));
const o1 = (await state(page)).osc;
check('Play : KeyA (focus hôte) est relayé au cadre', held.includes(60), { held });
check('Play : KeyA (focus hôte) ne joue pas de son côté hôte', o1 - o0 === 0, { oscHote: o1 - o0 });
await browser.close();
if (fails.length) { console.log('\nECHEC r1 :', fails); process.exit(1); }
console.log('\nr1 OK');
