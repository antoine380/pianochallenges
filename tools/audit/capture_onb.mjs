// Captures du premier lancement et du questionnaire (chantier Onboarding, 25/10/2026) : iPad 1024×768 et iPhone 390×844, clair.
// Usage : PORT=<port> OUT=/chemin node tools/audit/capture_onb.mjs [avant|apres]
import { INIT, URL } from './lib.mjs';
import { chromium } from 'playwright';
import fs from 'fs';
const MODE = process.argv[2] || 'apres';
const OUT = (process.env.OUT || '/home/claude/captures-onb') + '/' + MODE;
fs.mkdirSync(OUT, { recursive: true });
const W = (p, ms) => p.waitForTimeout(ms);
const click = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (e) e.click(); return !!e; }, sel);
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
const SIZES = [['ipad', 1024, 768, false], ['iphone', 390, 844, true]];
const errs = [];
for (const [dev, w, h, mob] of SIZES) {
  const c = await browser.newContext({ viewport: { width: w, height: h }, locale: 'fr-FR', isMobile: mob, hasTouch: mob, colorScheme: 'light', deviceScaleFactor: 2 });
  await c.addInitScript(`window.__midiMode="none"; window.__gumMode="none";`); await c.addInitScript(INIT.replace('${MODE}', 'none'));
  const p = await c.newPage(); p.on('pageerror', e => errs.push(dev + ': ' + e.message));
  const shot = async n => { await W(p, 450); await p.screenshot({ path: `${OUT}/${dev}-${n}.png` }); };
  await p.goto(URL); await W(p, 1600);
  await shot('1-d2-materiel');
  await click(p, '.fn-hwc[data-v=screen]'); await W(p, 400); await shot('2-d3-joue-un-do');
  await p.evaluate(() => { const k = document.querySelector('#fnKb [data-m="60"]'); k.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); });
  await W(p, 1400); await shot('3-d4-niveau');
  if (MODE === 'apres') {
    await click(p, '.fn-lv4 [data-v=debut]'); await W(p, 500); await shot('4-q-objectif');
    await click(p, '.oq-opt[data-v=songs]'); await W(p, 700); await shot('5-q-lecture');
    await click(p, '.oq-opt[data-v=learn]'); await W(p, 700); await shot('6-q-temps');
    await click(p, '.oq-opt[data-v="10"]'); await W(p, 700); await shot('7-programme');
    await click(p, '#oqGo'); await W(p, 1500); await shot('8-premiers-pas');
  } else {
    await click(p, '.fn-lv4 [data-v=debut]'); await W(p, 1500); await shot('4-premiers-pas');
  }
  // the questionnaire after « Se connecter » (account): same engine
  const c2 = await browser.newContext({ viewport: { width: w, height: h }, locale: 'fr-FR', isMobile: mob, hasTouch: mob, colorScheme: 'light', deviceScaleFactor: 2 });
  await c2.addInitScript(`window.__midiMode="none"; window.__gumMode="none"; try{ if(!sessionStorage.getItem('s')){ sessionStorage.setItem('s','1'); localStorage.setItem("memo-gammes-v1", JSON.stringify({settings:{lang:"fr",notation:"fr"},langV2:true,gate:"account"})); } }catch(e){}`);
  await c2.addInitScript(INIT.replace('${MODE}', 'none'));
  const q = await c2.newPage(); q.on('pageerror', e => errs.push(dev + ' onb: ' + e.message));
  await q.goto(URL); await W(q, 1600);
  await q.screenshot({ path: `${OUT}/${dev}-9-questionnaire-compte.png` });
  await c.close(); await c2.close();
}
await browser.close();
console.log('captures dans', OUT, errs.length ? 'ERREURS ' + errs.join(' | ') : 'sans erreur');
