// Animation work (Oct 2026): keys light at once (no transition on the lit states), a held note keeps its key down (MIDI, mouse,
// computer keyboard), the first C's confetti draw inside the visible card, no confetti on each perfect answer, the progress bars
// use transform (not width), reduced motion keeps fades only.
import { launch, closeOnboarding, gotoExercise, midi, URL, INIT } from './lib.mjs';
const wait = (p, ms) => p.waitForTimeout(ms);
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d ? ' — ' + JSON.stringify(d) : '')); if (!ok) fails.push(n); };
const { browser, page } = await launch({ mode: 'ok', viewport: { width: 1280, height: 800 } });
const errs = []; page.on('pageerror', e => errs.push(e.message));
const ev = (f, a) => page.evaluate(f, a);
await page.goto(URL); await wait(page, 1000); await closeOnboarding(page, 'midi');
await gotoExercise(page, 'chords'); await ev(() => document.getElementById('suGo')?.click()); await wait(page, 800);
// 1. the key is lit in the same task as pointerdown / keydown (before the 35 ms grouping), and the lit state has no transition
const lit = await ev(() => { const el = document.querySelector('#kbd [data-m="64"]'); const r = el.getBoundingClientRect();
  el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 7, clientX: r.left + 5, clientY: r.bottom - 10 }));
  const a = el.classList.contains('k-press') && el.classList.contains('k-down'); el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 7 }));
  const b = !el.classList.contains('k-down'); return { a, b, tr: getComputedStyle(el).transitionDuration }; });
check('clavier écran : touche enfoncée dès pointerdown, relevée au pointerup', lit.a && lit.b, lit);
await page.keyboard.down('KeyG'); const kd = await ev(() => document.querySelector('#kbd [data-m="67"]').classList.contains('k-down'));
await page.keyboard.up('KeyG'); const ku = await ev(() => !document.querySelector('#kbd [data-m="67"]').classList.contains('k-down'));
check('clavier d’ordinateur : la touche suit keydown / keyup', kd && ku);
await ev(() => { window.__midi.noteOn(60); window.__midi.noteOn(64); }); await wait(page, 400);
const held = await ev(() => [...document.querySelectorAll('#kbd .k-down')].map(k => +k.dataset.m));
await ev(() => { window.__midi.noteOff(60); window.__midi.send(0, [0x90, 64, 0]); }); await wait(page, 30);
check('MIDI : accord tenu = touches enfoncées, note-off = relevées', held.join() === '60,64' && await ev(() => !document.querySelector('#kbd .k-down')), held);
check('allumage sans transition (.k-hit/.k-ok/.k-bad/.k-press/.k-down)', await ev(() => { const el = document.querySelector('#kbd [data-m="62"]'); return ['k-hit', 'k-ok', 'k-bad', 'k-press', 'k-down'].every(c => { el.classList.add(c); const d = getComputedStyle(el).transitionDuration; el.classList.remove(c); return d.split(',').every(x => parseFloat(x) === 0); }); }));
check('extinction en fondu (~140 ms)', await ev(() => getComputedStyle(document.querySelector('#kbd [data-m="62"]')).transitionDuration.includes('0.14s')));
// 2. bars in transform
check('barre d’XP en transform:scaleX (pas de width)', await ev(() => { const x = document.getElementById('xpFill'); return !x.style.width && /scaleX/.test(x.style.transform); }));
// 3. no confetti on a perfect answer
await ev(() => { window.__cf = 0; new MutationObserver(m => m.forEach(r => r.addedNodes.forEach(n => { if (n.classList && n.classList.contains('confetti')) window.__cf++; }))).observe(document.body, { childList: true, subtree: true }); });
const PC = { 'Do': 0, 'Ré': 2, 'Mi': 4, 'Fa': 5, 'Sol': 7, 'La': 9, 'Si': 11 };
const p0 = await ev(() => document.getElementById('prompt').textContent); const m0 = /^(\S+)\s+Majeur/.exec(p0);
if (m0) { const r = 60 + PC[m0[1]]; for (const n of [r, r + 4, r + 7]) { await midi.on(page, n); await wait(page, 60); } await wait(page, 500); for (const n of [r, r + 4, r + 7]) await midi.off(page, n); }
await wait(page, 300);
check('réponse parfaite en cours de partie : pas de confettis', !!m0 && await ev(() => window.__cf === 0), { prompt: p0 });
// 4. reduced motion: fades kept, movement off
await page.emulateMedia({ reducedMotion: 'reduce' });
check('mouvement réduit : transition de couleur gardée, pas de transform', await ev(() => { const p = getComputedStyle(document.querySelector('#kbd .wk')).transitionProperty; return /background-color/.test(p) && !/transform/.test(p); }));
await page.emulateMedia({ reducedMotion: 'no-preference' });
// 5. first C: confetti inside the card that is on screen
{ const c = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'fr-FR' }); await c.addInitScript(INIT.replace('${MODE}', 'ok')); const p = await c.newPage();
  await p.goto(URL); await wait(p, 1500); const k = await p.locator('#fnKb [data-m="60"]').boundingBox(); await p.mouse.click(k.x + k.width / 2, k.y + k.height * .8); await wait(p, 100);
  const cf = await p.evaluate(() => { const cv = document.querySelector('canvas.confetti'); return cv && { parent: cv.parentElement.className, w: cv.getBoundingClientRect().width, focus: document.activeElement && document.activeElement.id }; });
  check('première note : confettis dessinés dans la carte visible', cf && cf.parent === 'fn-card' && cf.w > 300, cf);
  await wait(p, 100); check('première note : le bouton a le focus tout de suite', await p.evaluate(() => document.activeElement && document.activeElement.id === 'fnGo'));
  await c.close(); }
check('aucune erreur JS', errs.length === 0, errs);
await browser.close();
console.log(fails.length ? 'r17 FAIL ' + fails.length : 'r17 OK'); process.exit(fails.length ? 1 : 0);
