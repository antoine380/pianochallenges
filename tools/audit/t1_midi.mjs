// T1 : cas MIDI (note-on/off, vélocité 0, accord plaqué, notes rapides, CC64, 2 claviers, débranchement, permission refusée)
import { launch, closeOnboarding, gotoExercise, state, midi, URL } from './lib.mjs';
const R = [];
const check = (name, ok, detail) => { R.push({ name, ok, detail }); console.log((ok ? 'OK   ' : 'FAIL ') + name + (detail ? ' — ' + JSON.stringify(detail) : '')); };

async function prep(mode = 'ok') {
  const h = await launch({ mode });
  const { page } = h;
  await page.goto(URL); await page.waitForTimeout(1000);
  await closeOnboarding(page, 'midi');
  // guide des touches : les touches attendues portent .k-guide → on connaît la réponse
  await page.evaluate(() => { const S = JSON.parse(localStorage.getItem('memo-gammes-v1')); S.settings.guideK = true; S.settings.delay = 0; localStorage.setItem('memo-gammes-v1', JSON.stringify(S)); });
  await page.reload(); await page.waitForTimeout(1000); await closeOnboarding(page, 'midi');
  return h;
}
const guide = page => page.evaluate(() => [...document.querySelectorAll('#kbd [data-m].k-guide')].map(k => +k.dataset.m));
const wait = (p, ms) => p.waitForTimeout(ms);

{ // ---- A. note-on / note-off / vel 0 / accord / rapide / CC64 ----
  const { browser, page } = await prep();
  await gotoExercise(page, 'chords');
  let s = await state(page);
  check('A0 MIDI auto-rétabli après reload (restoreInput)', s.midiOn && s.handlersSet === 1, { midiTxt: s.midiTxt, handlersSet: s.handlersSet, midiAccessCalls: await page.evaluate(() => window.__cnt.midiAccessCalls) });
  await midi.on(page, 60); await wait(page, 120);
  s = await state(page);
  check('A1 Do(60) démarre l’exercice (phase listening, body.playing)', s.playing && s.slots[0].includes('cur'), { prompt: s.prompt });
  let exp = await guide(page);
  console.log('   attendu (k-guide):', exp);
  // note-on puis note-off de la première note
  await midi.on(page, exp[0]); await wait(page, 80);
  s = await state(page);
  check('A2 note-on valide la basse (slot ok)', s.nSlotsOk === 1, { slots: s.slots, kOk: s.kOk, sbVal: s.sbVal });
  await midi.off(page, exp[0]); await wait(page, 80);
  s = await state(page);
  check('A3 note-off (0x80) ignoré hors Play (pas de changement)', s.nSlotsOk === 1 && s.kBad.length === 0, { slots: s.slots, kBad: s.kBad });
  await midi.send(page, 0, [0x90, exp[1], 0]); await wait(page, 80);
  s = await state(page);
  check('A4 note-on vélocité 0 (= note-off) ignoré', s.nSlotsOk === 1 && s.kBad.length === 0, { slots: s.slots });
  await midi.send(page, 0, [0xB0, 64, 127]); await midi.send(page, 0, [0xB0, 64, 0]); await wait(page, 80);
  s = await state(page);
  check('A5 sustain CC64 ignoré', s.nSlotsOk === 1 && s.kBad.length === 0 && s.errors.length === 0, { slots: s.slots, errors: s.errors });
  // pitch bend, aftertouch, program change, 1 byte (clock), sysex
  await midi.send(page, 0, [0xE0, 0, 64]); await midi.send(page, 0, [0xD0, 50]); await midi.send(page, 0, [0xC0, 1]); await midi.send(page, 0, [0xF8]); await midi.send(page, 0, [0xF0, 0x7E, 0xF7]); await wait(page, 80);
  s = await state(page);
  check('A6 pitch bend / aftertouch / program change / clock / sysex sans erreur', s.errors.length === 0 && page.consoleErrors.length === 0, { errors: s.errors, console: page.consoleErrors });
  // accord plaqué : le reste de l'accord dans la même ms (ordre décroissant pour tester le tri)
  exp = await guide(page);
  await page.evaluate(ns => { ns.slice().reverse().forEach(n => window.__midi.noteOn(n)); }, exp);
  await wait(page, 120);
  s = await state(page);
  check('A7 accord plaqué (même ms, ordre décroissant) → toutes les cases ok, succès', s.nSlotsOk === 3 && s.kBad.length === 0, { slots: s.slots, sbVal: s.sbVal, stage: s.stage.slice(0, 120) });
  // attendre l'auto-avance (1700 ms) → nouvel exercice
  await wait(page, 2200);
  s = await state(page);
  check('A8 auto-avance vers l’exercice suivant', s.slots.every(c => !/\bok\b/.test(c)) && s.playing, { slots: s.slots, prompt: s.prompt });
  // accord en 30 ms d'écart, ordre décroissant (aigu d'abord : le tri sur 35 ms doit remettre la basse en premier)
  exp = await guide(page);
  await page.evaluate(async ns => { const r = ns.slice().reverse(); for (const n of r) { window.__midi.noteOn(n); await new Promise(f => setTimeout(f, 15)); } }, exp);
  await wait(page, 150);
  s = await state(page);
  check('A9 accord étalé sur 30 ms (aigu→grave) : tri 35 ms OK, succès sans faute', s.nSlotsOk === 3 && s.kBad.length === 0 && !/mistake|faute/i.test(s.sbDetail), { slots: s.slots, sbDetail: s.sbDetail });
  await wait(page, 2200);
  // accord étalé sur 60 ms, aigu d'abord (au-delà du regroupement de 35 ms) : la basse arrive après → fautes ?
  exp = await guide(page);
  await page.evaluate(async ns => { const r = ns.slice().reverse(); for (const n of r) { window.__midi.noteOn(n); await new Promise(f => setTimeout(f, 45)); } }, exp);
  await wait(page, 200);
  s = await state(page);
  check('A10 accord « arpégé » aigu→grave en ~90 ms : comportement (info)', true, { slots: s.slots, sbDetail: s.sbDetail, kBad: s.kBad });
  // nouvel exercice si réussi, sinon finir avec la basse
  if (s.nSlotsOk < 3) { const e2 = await guide(page); for (const n of e2) { await midi.on(page, n); await wait(page, 60); } }
  await wait(page, 2200);
  // notes très rapides : 10 notes en 100 ms sur une gamme (section scales)
  await page.evaluate(() => document.querySelector('#secTabs [data-v="scales"]').click()); await wait(page, 600);
  await closeOnboarding(page); // la fenêtre d'intro de la section peut s'ouvrir
  await midi.on(page, 60); await wait(page, 120);
  s = await state(page);
  check('A11 gamme : Do démarre', s.playing, { prompt: s.prompt, slots: s.slots.length });
  // on récupère la séquence : la touche guide donne la note suivante ; on envoie la note attendue puis on relit… pour « 10 notes en 100 ms » on envoie la gamme devinée via guide à 10 ms d'intervalle
  // Astuce : on envoie successivement en lisant guide à chaque fois mais sans attendre le flush (buffer 35 ms) → on simule un trait rapide
  const first = (await guide(page))[0];
  // On construit la gamme majeure à partir de la tonique si la consigne contient "Major" ; sinon on lit le guide note à note lentement d'abord (fallback)
  const prompt = s.prompt;
  const pcs = /major/i.test(prompt) ? [0, 2, 4, 5, 7, 9, 11, 12] : null;
  if (pcs) {
    const notes = pcs.map(p => first + p);
    await page.evaluate(async ns => { for (const n of ns) { window.__midi.noteOn(n); await new Promise(f => setTimeout(f, 10)); } }, notes);
    await wait(page, 300);
    s = await state(page);
    check('A12 8 notes en ~80 ms (gamme) : toutes validées', s.nSlotsOk === notes.length && s.kBad.length === 0, { slots: s.slots, sbDetail: s.sbDetail, nSlots: s.slots.length });
    // la même chose avec les notes dans le désordre : regroupées puis triées → validées quand même ?
    await wait(page, 2200);
    const first2 = (await guide(page))[0]; const s2 = await state(page);
    if (/major/i.test(s2.prompt)) {
      const notes2 = pcs.map(p => first2 + p).reverse();
      await page.evaluate(async ns => { for (const n of ns) { window.__midi.noteOn(n); await new Promise(f => setTimeout(f, 10)); } }, notes2);
      await wait(page, 300);
      s = await state(page);
      check('A13 gamme jouée en DESCENDANT très vite (<35 ms entre notes) : le tri la valide comme montante ?', true, { slots: s.slots, nOk: s.nSlotsOk, sbDetail: s.sbDetail, prompt: s2.prompt });
    }
  } else { check('A12 gamme non majeure, test rapide sauté', true, { prompt }); }
  // latence : 20 mesures entre __midi.send et l'ajout de la classe k-press / k-ok / k-hit sur une touche
  await wait(page, 2300);
  const lat = await page.evaluate(async () => {
    const out = [];
    for (let i = 0; i < 20; i++) {
      const n = 60 + (i % 12);
      const el = document.querySelector('#kbd [data-m][data-m="' + n + '"]');
      const t = await new Promise(res => {
        const mo = new MutationObserver(() => { if (/k-(press|hit|ok|bad)/.test(el.className)) { mo.disconnect(); res(performance.now() - t0); } });
        mo.observe(el, { attributes: true, attributeFilter: ['class'] });
        const t0 = performance.now(); window.__midi.noteOn(n);
        setTimeout(() => { mo.disconnect(); res(-1); }, 500);
      });
      out.push(+t.toFixed(1));
      await new Promise(f => setTimeout(f, 120));
    }
    return out;
  });
  console.log('   latences ms:', lat);
  check('A14 latence send→classe touche (20 mesures) : médiane', true, { min: Math.min(...lat), max: Math.max(...lat), median: lat.slice().sort((a, b) => a - b)[10] });
  s = await state(page);
  check('A15 handlers MIDI toujours 1 par port, aucun doublon', s.handlersSet === 1 && s.handlers[0].sets === 1, s.handlers);
  await browser.close();
}

{ // ---- B. deux claviers ----
  const { browser, page } = await prep();
  await gotoExercise(page, 'chords');
  await page.evaluate(() => window.__midi.addSecond()); await wait(page, 200);
  let s = await state(page);
  check('B1 2e clavier branché : onstatechange → les deux ports ont un handler', s.handlers.every(h => h.has) && s.handlersSet === 3, { handlers: s.handlers, midiTxt: s.midiTxt, handlersSet: s.handlersSet });
  const mInField = await page.evaluate(() => !document.getElementById('mInField').hidden);
  check('B2 sélecteur de clavier (#mInField) visible dans la fenêtre MIDI quand 2 claviers', mInField, {});
  await midi.on(page, 60, 100, 1); await wait(page, 120);
  s = await state(page);
  check('B3 Do sur le 2e clavier démarre l’exercice (midiInput = tous)', s.playing, {});
  // filtrer sur le 1er clavier via la fenêtre MIDI
  await page.evaluate(() => document.getElementById('midiBtn').click()); await wait(page, 300);
  await page.selectOption('#mInput', 'Fake Keyboard 61'); await wait(page, 100);
  await page.click('#midiOk'); await wait(page, 300);
  console.log('   midiInput =', await page.evaluate(() => JSON.parse(localStorage.getItem('memo-gammes-v1')).settings.midiInput));
  const exp = await guide(page);
  await midi.on(page, exp[0], 100, 1); await wait(page, 100);
  s = await state(page);
  check('B4 avec filtre « Fake Keyboard 61 », une note du 2e clavier est ignorée', s.nSlotsOk === 0, { slots: s.slots });
  await midi.on(page, exp[0], 100, 0); await wait(page, 100);
  s = await state(page);
  check('B5 … et une note du 1er clavier est validée', s.nSlotsOk === 1, { slots: s.slots });
  // débranchement du clavier 2 (état disconnected, port conservé dans la map comme Chrome)
  await page.evaluate(() => window.__midi.disconnect(1)); await wait(page, 200);
  s = await state(page);
  const names = await page.evaluate(() => [...document.querySelectorAll('#mDevList li')].map(l => l.textContent));
  check('B6 clavier 2 débranché (state=disconnected, port encore dans inputs) : liste des appareils', !names.includes('Fake Keyboard 25'), { names, midiTxt: s.midiTxt });
  // débranchement du clavier 1 (celui qui est filtré) en plein exercice
  await page.evaluate(() => window.__midi.disconnect(0)); await wait(page, 200);
  s = await state(page);
  check('B7 tous débranchés (state=disconnected) : midiTxt / bouton', !s.midiOn, { midiTxt: s.midiTxt, midiOn: s.midiOn, playing: s.playing, inChipState: await page.evaluate(() => document.querySelector('#inChip i')?.className) });
  // suppression réelle de la map (autre implémentation)
  await page.evaluate(() => { window.__midi.remove(0); window.__midi.remove(1); }); await wait(page, 200);
  s = await state(page);
  check('B8 ports retirés de la map : « aucun clavier »', !s.midiOn, { midiTxt: s.midiTxt, playing: s.playing, phaseStillListening: s.slots.some(c => /cur/.test(c)) });
  // rebranchement
  await page.evaluate(() => window.__midi.reconnect(0)); await wait(page, 200);
  s = await state(page);
  const exp2 = await guide(page);
  await midi.on(page, exp2[0] ?? 64, 100, 0); await wait(page, 100);
  const s2 = await state(page);
  check('B9 rebranchement : handler reposé, la note est prise en compte, l’exercice continue', s.midiOn && s2.nSlotsOk >= 1, { midiTxt: s.midiTxt, handlers: s2.handlers, slots: s2.slots, handlersSet: s2.handlersSet });
  await browser.close();
}

{ // ---- C. permission refusée ----
  const { browser, page } = await launch({ mode: 'deny' });
  await page.goto(URL); await page.waitForTimeout(1000);
  await closeOnboarding(page, 'midi');
  let s = await state(page);
  check('C1 requestMIDIAccess rejeté : bouton en erreur + message', s.midiErr, { midiTxt: s.midiTxt, notice: s.notice, modals: s.modals, input: await page.evaluate(() => JSON.parse(localStorage.getItem('memo-gammes-v1')).settings.input), errors: page.consoleErrors });
  await page.screenshot({ path: '/tmp/c1_denied.png' });
  await browser.close();
}
{ // ---- D. navigateur sans Web MIDI ----
  const { browser, page } = await launch({ mode: 'none' });
  await page.goto(URL); await page.waitForTimeout(1000);
  const opts = await page.evaluate(() => [...document.querySelectorAll('#inOpts .inp-opt b')].map(b => b.textContent));
  check('D1 sans Web MIDI : l’option MIDI n’est pas proposée', !opts.some(o => /midi/i.test(o)), { opts });
  await browser.close();
}
console.log('\nRESUME T1:', R.filter(r => !r.ok).map(r => r.name));
