// T2 : un Do (60) et la touche Espace sur chaque page ne doivent démarrer aucun exercice invisible.
import { launch, closeOnboarding, gotoExercise, state, midi, URL } from './lib.mjs';
const wait = (p, ms) => p.waitForTimeout(ms);
const { browser, page } = await launch({ mode: 'ok' });
await page.goto(URL); await wait(page, 1000);
await closeOnboarding(page, 'midi');
await gotoExercise(page, 'chords');
let s = await state(page);
console.log('exercice idle:', s.page, s.playing, s.prompt);

const NAV = {
  hub: () => page.click('#logoBtn, .logo, [data-page-link="hub"]').catch(() => page.evaluate(() => (document.querySelector('.brand, #logo, header .logo') || {}).click?.())),
  learn: () => page.click('.mode-item[data-mode="learn"]'),
  play: () => page.click('.mode-item[data-mode="play"]'),
  games: () => page.click('.mode-item[data-mode="games"]'),
  rank: () => page.click('#rankBtn'),
  settings: () => page.click('#setBtn'),
  progress: () => page.click('#progBtn'),
  daily: () => page.click('#dailyCard'),
};
const snap = async () => {
  const st = await state(page);
  const extra = await page.evaluate(() => ({
    stageVisible: !!(document.getElementById('stage').offsetParent), promptVisible: !!(document.getElementById('prompt')?.offsetParent),
    timeouts: window.__cnt.timeouts.size, rafPlaying: document.body.classList.contains('playing'),
    kbdVisible: !!document.getElementById('kbd').offsetParent,
  }));
  return { page: st.page, playing: st.playing, prompt: st.prompt, slots: st.slots.join(','), modals: st.modals, ...extra, errors: st.errors.concat(page.consoleErrors).slice(-3) };
};
// trouver le bouton logo
const logoSel = await page.evaluate(() => { const c = ['#logoBtn', '#logo', '.logo', '.brand', 'button.brand']; for (const q of c) if (document.querySelector(q)) return q; return null; });
console.log('logo selector:', logoSel);
NAV.hub = () => page.click('#homeLink');

for (const pg of ['hub', 'learn', 'play', 'games', 'rank', 'settings', 'progress']) {
  // repartir d'un état propre : page d'exercice idle
  await gotoExercise(page, 'chords');
  await NAV[pg](); await wait(page, 600); await closeOnboarding(page);
  if (pg === 'hub') { const st0 = await state(page); if (st0.page !== 'hub') console.log('  !! navigation hub a échoué, page =', st0.page); }
  const before = await snap();
  await midi.on(page, 60); await wait(page, 250);
  const afterDo = await snap();
  // puis la touche Espace
  await page.keyboard.press('Space'); await wait(page, 250);
  const afterSpace = await snap();
  const bugDo = afterDo.playing && !before.playing;
  const bugSpace = afterSpace.playing && !afterDo.playing;
  console.log(`\n== page ${pg} (body[data-page]=${before.page}) ==`);
  console.log('  avant      :', JSON.stringify(before));
  console.log('  après Do   :', JSON.stringify(afterDo), bugDo ? '  <-- EXERCICE DEMARRE PAR LE DO' : '');
  console.log('  après Space:', JSON.stringify(afterSpace), bugSpace ? '  <-- EXERCICE DEMARRE PAR ESPACE' : '');
  if (afterSpace.playing) {
    // l'exercice invisible : que se passe-t-il quand on joue une note puis qu'on revient sur Learn ?
    await midi.on(page, 64); await wait(page, 150);
    const s2 = await snap();
    console.log('  note 64 ensuite :', JSON.stringify({ playing: s2.playing, slots: s2.slots }));
    await page.screenshot({ path: `/tmp/t2_${pg}_hidden.png` });
  }
}
await browser.close();
