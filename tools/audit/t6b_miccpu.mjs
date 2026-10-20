// T6b : coût CPU de l'autocorrélation du micro (blocage de la boucle d'événements).
import { launch, closeOnboarding, gotoExercise, state, URL } from './lib.mjs';
const wait = (p, ms) => p.waitForTimeout(ms);
const { browser, page } = await launch({ mode: 'ok', gum: 'osc' });
await page.goto(URL); await wait(page, 1000);
await page.locator('#inOpts .inp-opt').nth(2).click(); await wait(page, 800); await closeOnboarding(page, 'mic');
// mesure : fraction du temps où la boucle est bloquée, via des setTimeout(…,0) chaînés pendant 2 s
const measure = () => page.evaluate(() => new Promise(res => { const t0 = performance.now(); let n = 0, maxGap = 0, last = t0; const f = () => { const now = performance.now(); maxGap = Math.max(maxGap, now - last); last = now; n++; if (now - t0 < 2000) setTimeout(f, 0); else res({ iterations: n, maxGapMs: +maxGap.toFixed(1) }); }; f(); }));
console.log('micro actif, silence (rms<0.012) :', await measure());
await page.evaluate(() => window.__setFreqs([261.63]));
await wait(page, 300);
console.log('micro actif, note tenue        :', await measure());
// durée d'un appel d'autoCorrelate : on mesure via PerformanceObserver longtask
const lt = await page.evaluate(() => new Promise(res => { const out = []; const po = new PerformanceObserver(l => l.getEntries().forEach(e => out.push(+e.duration.toFixed(0)))); po.observe({ entryTypes: ['longtask'] }); setTimeout(() => { po.disconnect(); res(out); }, 2000); }));
console.log('long tasks (>50 ms) en 2 s avec note tenue :', lt);
await page.evaluate(() => window.__setFreqs([]));
await browser.close();
