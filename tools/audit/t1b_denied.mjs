import { launch, closeOnboarding, state, URL } from './lib.mjs';
{ const { browser, page } = await launch({ mode: 'deny' });
  await page.goto(URL); await page.waitForTimeout(1000);
  // choisir MIDI dans la modale d'entrée
  await page.locator('#inOpts .inp-opt').nth(1).click(); await page.waitForTimeout(600);
  let s = await state(page);
  console.log('après choix MIDI refusé:', JSON.stringify({ modals: s.modals, midiTxt: s.midiTxt, notice: s.notice, mStTxt: await page.evaluate(()=>document.getElementById('mStTxt').textContent), setupMsg: await page.evaluate(()=>document.getElementById('midiSetupMsg').textContent), okDisabled: await page.evaluate(()=>document.getElementById('midiOk').disabled), input: await page.evaluate(()=>JSON.parse(localStorage.getItem('memo-gammes-v1')).settings.input) }));
  await page.screenshot({ path: '/tmp/c1_denied.png' });
  await page.click('#midiX'); await page.waitForTimeout(500);
  s = await state(page);
  console.log('après fermeture X:', JSON.stringify({ modals: s.modals, input: await page.evaluate(()=>JSON.parse(localStorage.getItem('memo-gammes-v1')).settings.input), chip: await page.evaluate(()=>document.getElementById('inChip').title) }));
  await browser.close(); }
{ const { browser, page } = await launch({ mode: 'none' });
  await page.goto(URL); await page.waitForTimeout(1000);
  const opts = await page.evaluate(() => [...document.querySelectorAll('#inOpts .inp-opt b')].map(b => b.textContent));
  console.log('sans Web MIDI, options:', opts, 'note:', await page.evaluate(()=>{const n=document.querySelector('#inOpts .inp-note'); return n && !n.hidden ? n.textContent : null;}));
  await browser.close(); }
