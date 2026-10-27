// Mesure du premier chargement (outil, pas un test : aucun code d'échec). iPad simulé (1024×768, tactile, ×2).
// Usage : PORT=8955 PW_CHROMIUM=… node tools/audit/perf_load.mjs [nb de passages, défaut 5]
// Deux scénarios : « nouveau » (aucun état : écran « Joue ta première note ») et « habitué » (invité, questionnaire fait : accueil).
// Pour chacun : ressources demandées avant que l'écran soit prêt (octets bruts servis en local, et estimés gzip/brotli comme en ligne),
// temps jusqu'à l'écran prêt (médiane), temps de script (CDP ScriptDuration), avec le processeur ralenti ×4 (≈ appareil modeste).
import { chromium } from 'playwright';
import zlib from 'node:zlib';

const PORT = process.env.PORT || '8767';
const URL = process.env.PC_URL || `http://localhost:${PORT}/`;
const N = +(process.argv[2] || 5);
const CPU = +(process.env.CPU || 4);
const HABITUE = `(() => { try{ localStorage.setItem('memo-gammes-v1', JSON.stringify({ langV2:true, gate:'guest', onb:{done:1}, tourDone:1, pwShown:1,
  introSeen:Object.fromEntries(['hub','learn','games','free','play','quiz','settings','progress'].map(k=>[k,1])), xp:500,
  settings:{ lang:'fr', notation:'fr', input:'screen' } })); }catch(e){} })();`;
// écran prêt : accueil affiché (page hub, écran de démarrage fini) ou écran du premier lancement visible
const READY = `(() => { const t0 = performance.now(); window.__ready = 0;
  const ok = () => { const b = document.body; if (!b) return false;
    const sp = document.getElementById('splash'), spOff = !sp || sp.hidden || getComputedStyle(sp).display === 'none' || getComputedStyle(sp).opacity === '0';
    const gate = document.getElementById('gate'), fn = gate && !gate.hidden && gate.querySelector('.fn-card');
    return (b.dataset.page === 'hub' && document.getElementById('hubPanel') && !(gate && !gate.hidden)) || !!fn; };
  const tick = () => { if (!window.__ready && ok()) { window.__ready = performance.now(); return; } if (!window.__ready) requestAnimationFrame(tick); };
  requestAnimationFrame(tick); })();`;

const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const kb = n => (n / 1024).toFixed(0) + ' Ko';

async function run(browser, scen) {
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 2, hasTouch: true, isMobile: false, locale: 'fr-FR' });
  if (scen === 'habitué') await ctx.addInitScript(HABITUE);
  await ctx.addInitScript(READY);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Performance.enable');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  const res = []; let wire = 0;
  await cdp.send('Network.enable'); cdp.on('Network.loadingFinished', e => { wire += e.encodedDataLength || 0; });
  page.on('response', async r => { try { const u = r.url(); if (!u.startsWith(URL)) return; const b = await r.body(); res.push({ u: u.slice(URL.length) || 'index.html', n: b.length, b, t: Date.now() }); } catch (e) {} });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  const t0 = Date.now();
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready > 0, null, { timeout: 30000 });
  const ready = await page.evaluate(() => window.__ready);
  const nav = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return { dcl: n.domContentLoadedEventEnd, load: n.loadEventEnd }; });
  const m = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value]));
  const tReady = t0 + ready;
  await page.waitForTimeout(300);
  const before = res.filter(r => r.t <= Date.now()); // tout ce qui est chargé au démarrage (≤ 300 ms après l'écran prêt)
  const wire1 = wire;
  // 2e visite (même navigateur, cache HTTP gardé) : ce qui repasse vraiment sur le réseau
  // (le « nouveau » a passé l'écran de départ en le voyant : à la 2e visite il peut arriver ailleurs, on attend alors 2 s)
  wire = 0; await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.__ready > 0, null, { timeout: 4000 }).catch(() => page.waitForTimeout(2000));
  const ready2 = await page.evaluate(() => window.__ready || NaN); await page.waitForTimeout(300);
  const wire2 = wire;
  await ctx.close();
  return { ready, ready2, dcl: nav.dcl, load: nav.load, script: m.ScriptDuration * 1000, task: m.TaskDuration * 1000, res: before, errs, wire1, wire2 };
}

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
for (const scen of ['nouveau', 'habitué']) {
  const runs = [];
  for (let i = 0; i < N; i++) runs.push(await run(browser, scen));
  const r0 = runs[runs.length - 1];
  let raw = 0, gz = 0, br = 0;
  const rows = r0.res.map(r => {
    const text = /\.(html|js|css|json|svg|webmanifest|txt)(\?|$)|^index\.html$|^$/.test(r.u);
    const g = text ? zlib.gzipSync(r.b, { level: 6 }).length : r.n;
    const b = text ? zlib.brotliCompressSync(r.b, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } }).length : r.n;
    raw += r.n; gz += g; br += b; return { u: r.u, n: r.n, g, b };
  }).sort((a, b) => b.n - a.n);
  console.log(`\n=== ${scen} (iPad 1024×768, processeur ×${CPU}, ${N} passages, médianes) ===`);
  console.log(`écran prêt ${med(runs.map(r => r.ready)).toFixed(0)} ms · DOMContentLoaded ${med(runs.map(r => r.dcl)).toFixed(0)} ms · load ${med(runs.map(r => r.load)).toFixed(0)} ms`);
  console.log(`temps de script ${med(runs.map(r => r.script)).toFixed(0)} ms · temps des tâches ${med(runs.map(r => r.task)).toFixed(0)} ms`);
  console.log(`octets reçus (réseau réel du serveur testé) : 1re visite ${kb(med(runs.map(r => r.wire1)))} · 2e visite ${kb(med(runs.map(r => r.wire2)))} (écran prêt ${med(runs.map(r => r.ready2)).toFixed(0)} ms)`);
  console.log(`${rows.length} ressources : ${kb(raw)} brut · ${kb(gz)} gzip (comme mod_deflate) · ${kb(br)} brotli q5`);
  for (const r of rows.slice(0, 12)) console.log(`  ${r.u.padEnd(48)} ${kb(r.n).padStart(8)} brut ${kb(r.g).padStart(8)} gzip`);
  if (r0.errs.length) console.log('ERREURS :', r0.errs.slice(0, 5));
}
await browser.close();
