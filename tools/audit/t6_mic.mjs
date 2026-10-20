// T6 : micro — refus, flux oscillateur (La 440, Do 261,6, accord), coupure, intervalles.
import { launch, closeOnboarding, gotoExercise, state, URL } from './lib.mjs';
const wait = (p, ms) => p.waitForTimeout(ms);
{ // refus
  const { browser, page } = await launch({ mode: 'ok', gum: 'deny' });
  await page.goto(URL); await wait(page, 1000);
  await page.locator('#inOpts .inp-opt').nth(2).click(); await wait(page, 800);
  const s = await state(page);
  console.log('getUserMedia refusé → micTxt:', s.micTxt, '| notice:', (s.notice || '').slice(0, 60), '| modals:', s.modals, '| input mémorisé:', await page.evaluate(() => JSON.parse(localStorage.getItem('memo-gammes-v1')).settings.input), '| chip:', await page.evaluate(() => document.getElementById('inChip').title), '| erreurs', s.errors);
  await browser.close();
}
{ // accepté : flux depuis un oscillateur
  const { browser, page } = await launch({ mode: 'ok', gum: 'osc' });
  await page.goto(URL); await wait(page, 1000);
  await page.locator('#inOpts .inp-opt').nth(2).click(); await wait(page, 800);
  await closeOnboarding(page, 'mic');
  let s = await state(page);
  console.log('micro accepté → micTxt:', s.micTxt, '| intervalles actifs:', s.intervals, '| AudioContext:', s.ac, '| chip:', await page.evaluate(() => document.getElementById('inChip').title));
  await gotoExercise(page, 'scales');
  await page.keyboard.press('Space'); await wait(page, 300);
  s = await state(page); console.log('exercice:', s.prompt, s.playing);
  const hits = () => page.evaluate(() => window.__hits || []);
  await page.evaluate(() => { window.__hits = []; const mo = new MutationObserver(ms => ms.forEach(m => { const el = m.target; if (el.classList.contains('k-hit') || el.classList.contains('k-bad') || el.classList.contains('k-ok')) { const tag = el.dataset.m + ':' + [...el.classList].filter(c => /^k-/.test(c)).join('+'); if (window.__hits[window.__hits.length - 1] !== tag) window.__hits.push(tag); } })); document.querySelectorAll('#kbd [data-m]').forEach(k => mo.observe(k, { attributes: true, attributeFilter: ['class'] })); });
  await page.evaluate(() => window.__setFreqs([440])); await wait(page, 600);
  console.log('La 440 Hz → touches marquées:', await hits());
  await page.evaluate(() => { window.__hits = []; window.__setFreqs([]); }); await wait(page, 300);
  await page.evaluate(() => window.__setFreqs([261.63])); await wait(page, 600);
  console.log('Do 261,6 Hz → touches marquées:', await hits(), '| slots', (await state(page)).slots.slice(0, 3));
  await page.evaluate(() => { window.__hits = []; window.__setFreqs([]); }); await wait(page, 300);
  // même note deux fois de suite sans silence (ex. gamme avec octave : Do … Do) : re-détectée ?
  await page.evaluate(() => window.__setFreqs([261.63])); await wait(page, 500);
  await page.evaluate(() => window.__setFreqs([523.25])); await wait(page, 600);
  console.log('Do4 puis Do5 enchaînés sans silence → touches:', await hits(), '(la 2e doit apparaître)');
  await page.evaluate(() => { window.__hits = []; window.__setFreqs([]); }); await wait(page, 300);
  // accord Do-Mi-Sol
  await page.evaluate(() => window.__setFreqs([261.63, 329.63, 392])); await wait(page, 800);
  console.log('accord Do+Mi+Sol (3 oscillateurs) → touches:', await hits());
  await page.evaluate(() => { window.__hits = []; window.__setFreqs([]); }); await wait(page, 300);
  // charge CPU de l'autocorrélation : durée d'un appel
  const cpu = await page.evaluate(() => { const t0 = performance.now(); let n = 0; const end = t0 + 500; while (performance.now() < end) n++; return n; });
  // coupure : clic sur #micBtn
  s = await state(page);
  const before = { intervals: s.intervals, micTxt: s.micTxt, tracks: await page.evaluate(() => window.__micStream.getTracks().map(t => t.readyState)) };
  await page.evaluate(() => document.getElementById('micBtn').click()); await wait(page, 300);
  s = await state(page);
  console.log('clic #micBtn quand le micro est actif → avant', before, '| après: micTxt', s.micTxt, 'intervalles', s.intervals, 'pistes', await page.evaluate(() => window.__micStream.getTracks().map(t => t.readyState)));
  // coupure via le chip → clavier écran
  await page.evaluate(() => document.getElementById('inChip').click()); await wait(page, 300);
  await page.locator('#inOpts .inp-opt').nth(0).click(); await wait(page, 400);
  s = await state(page);
  console.log('passage au clavier écran → micTxt', s.micTxt, 'intervalles', s.intervals, 'pistes', await page.evaluate(() => window.__micStream.getTracks().map(t => t.readyState)), 'AudioContext', s.ac);
  // retour micro → nouveau getUserMedia, intervalles
  await page.evaluate(() => document.getElementById('inChip').click()); await wait(page, 300);
  await page.locator('#inOpts .inp-opt').nth(2).click(); await wait(page, 600);
  s = await state(page); console.log('retour micro → intervalles', s.intervals, 'AudioContext', s.ac);
  // reload : le micro doit revenir après un premier toucher
  await page.reload(); await wait(page, 1000); await closeOnboarding(page, 'mic');
  s = await state(page); console.log('après reload, avant toucher: micTxt', s.micTxt, 'chip', await page.evaluate(() => document.querySelector('#inChip i').className));
  await page.mouse.click(600, 400); await wait(page, 600);
  s = await state(page); console.log('après 1er toucher: micTxt', s.micTxt, 'intervalles', s.intervals, 'chip', await page.evaluate(() => document.querySelector('#inChip i').className));
  await browser.close();
}
