// Captures du paywall C18 (aperçu) et de Réglages › Abonnement, 5 tailles × clair/sombre (+ EN). Usage : OUT=dir PORT=… node tools/audit/capture_c18.mjs
import { launch, closeOnboarding, URL } from './lib.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/c18'; fs.mkdirSync(OUT, { recursive: true });
const SIZES = [['375x667', 375, 667], ['812x375', 812, 375], ['768x1024', 768, 1024], ['1024x768', 1024, 768], ['1280x800', 1280, 800]];
const W = ms => new Promise(r => setTimeout(r, ms));
const { browser } = await launch({ mode: 'ok' }); const errs = [];
for (const [nm, w, h] of SIZES) for (const scheme of ['dark', 'light']) for (const lang of (nm === '1024x768' && scheme === 'dark' ? ['fr', 'en'] : ['fr'])) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: w < 900, locale: lang === 'fr' ? 'fr-FR' : 'en-GB', colorScheme: scheme });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(nm + ' ' + e.message));
  await p.goto(URL + '?paywall=1'); await W(900); await closeOnboarding(p, 'screen');
  await p.evaluate(l => { const S = JSON.parse(localStorage.getItem('memo-gammes-v1')); S.settings.lang = l; S.settings.notation = l; S.prem = {}; localStorage.setItem('memo-gammes-v1', JSON.stringify(S)); }, lang);
  await p.reload(); await W(900); await closeOnboarding(p, 'screen');
  const tag = nm + '-' + scheme + (lang === 'en' ? '-en' : '');
  await p.evaluate(() => document.getElementById('premBtn').click()); await W(500);
  const ov = await p.evaluate(() => { const c = document.querySelector('.pw-card'); return c.scrollHeight - c.clientHeight; });
  console.log(tag, 'paywall overflow', ov);
  await p.screenshot({ path: `${OUT}/paywall-${tag}.png` });
  await p.evaluate(() => document.getElementById('pwX').click()); await W(200);
  await p.evaluate(() => document.getElementById('setBtn').click()); await W(400);
  await p.evaluate(() => { const b = document.querySelector('#setNav [data-v="prem"]'); if (b) b.click(); document.getElementById('setPrem')?.scrollIntoView(); }); await W(300);
  await p.screenshot({ path: `${OUT}/reglages-${tag}.png` });
  await ctx.close();
}
console.log(errs.length ? errs : 'no errors'); await browser.close();
