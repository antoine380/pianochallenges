// Captures des réglages du quiz « Sur cet appareil » pour chaque mode : seul, chacun son tour, un clavier chacun, zones d'un piano.
// Usage : PORT=8796 OUT=/home/claude/captures-quiz3 node tools/audit/capture_quiz_setup.mjs   (SIZES=…, THEME=dark)
// Le faux MIDI de lib.mjs branche 2 claviers (« Fake Keyboard 61 », « Fake Keyboard 25 ») et un port virtuel « Network Session 1 » qui ne doit apparaître nulle part.
import { launch, closeOnboarding, URL } from './lib.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/captures-quiz', TAG = process.env.TAG || 'reglages';
fs.mkdirSync(OUT, { recursive: true });
const SIZES = (process.env.SIZES || '375x667,812x375,768x1024,1024x768,1440x900').split(',').map(s => s.split('x').map(Number));
const MODES = { seul: { n: 1, bots: 1 }, tour: { n: 3, mode: 'turn', bots: 0 }, claviers: { n: 3, mode: 'dev', bots: 0 }, zones: { n: 3, mode: 'zone', bots: 0 } };
for (const [w, h] of SIZES) {
  const phone = w < 700 || h < 500;
  const { browser, page } = await launch({ mode: 'ok', viewport: { width: w, height: h } });
  const ev = (f, a) => page.evaluate(f, a); const wait = ms => page.waitForTimeout(ms);
  await page.goto(URL); await wait(900); await closeOnboarding(page, 'midi');
  for (const [name, cfg] of Object.entries(MODES)) {
    await ev(([cfg, t]) => { const S = JSON.parse(localStorage.getItem('memo-gammes-v1')); S.settings.uiSound = false; if (t) S.settings.theme = t;
      S.settings.quiz = Object.assign({ names: ['Antoine', 'Léa', 'Hugo'], devs: [], where: 'local', theme: 'all', keysOff1: 1, keys: false }, cfg); localStorage.setItem('memo-gammes-v1', JSON.stringify(S)); }, [cfg, process.env.THEME || '']);
    await page.reload(); await wait(900); await closeOnboarding(page);
    await ev(() => { const b = document.getElementById('midiBtn'); if (b && !b.classList.contains('on')) b.click(); }); await wait(400);
    await ev(() => { window.__midi.addSecond(); window.__midi.addVirtual && window.__midi.addVirtual(); }); await wait(300);
    await ev(() => document.querySelector('#modeNav [data-mode=quiz]').click()); await wait(1200);
    if (phone) { await ev(() => document.getElementById('qzToPlayers').click()); await wait(300); }
    await page.screenshot({ path: `${OUT}/${TAG}-${name}-${w}x${h}.png` });
    if (name === 'seul' && phone) { await ev(() => { const b = [...document.querySelectorAll('#qzTabs button')][0]; b && b.click(); }); await wait(300); await page.screenshot({ path: `${OUT}/${TAG}-config-${w}x${h}.png` }); }
    const m = await ev(() => { const m = document.getElementById('main'), d = document.scrollingElement; return { main: m.scrollHeight - m.clientHeight, doc: d.scrollHeight - innerHeight, net: /Network|réseau/i.test(document.getElementById('qzSetup').textContent) }; });
    if (m.main > 1 || m.doc > 1 || m.net) console.log('  ', name, w + 'x' + h, 'défilement ou port virtuel :', JSON.stringify(m));
  }
  const errs = await ev(() => window.__cnt.consoleErrors); if (errs.length) console.log(w + 'x' + h, 'erreurs :', errs);
  await browser.close(); console.log('ok', w + 'x' + h);
}
