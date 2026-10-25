// Liens des boutons des e-mails (?go=daily|pp|progress|hub) : l'app ouvre le bon écran, retire ?go= et ?from= de l'adresse,
// et ne fait rien tant qu'un écran de départ s'affiche (premier lancement). Lancer `python3 -m http.server 8767` à la racine avant.
import { createRequire } from 'module';
const require = createRequire(process.env.NODE_PATH ? process.env.NODE_PATH.replace(/\/?$/, '/') : import.meta.url);
const { chromium } = require('playwright');
const URL = 'http://localhost:' + (process.env.PORT || 8767) + '/';
const seed = (st) => `try{localStorage.setItem('memo-gammes-v1', JSON.stringify(${JSON.stringify(st)}))}catch(e){}`;
const player = { settings: { lang: 'fr', notation: 'fr', inputMode: 'screen' }, langV2: true, gate: 'guest', onb: { done: 1 }, tourDone: 1, pwShown: 1, xp: 500,
  introSeen: Object.fromEntries(['hub', 'learn', 'games', 'free', 'play', 'quiz', 'settings', 'progress'].map(k => [k, 1])) };
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
let fail = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'ÉCHEC ') + m); if (!c) fail++; };
async function run(q, st) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(seed(st));
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL + q); await page.waitForTimeout(1600);
  const r = await page.evaluate(() => ({ page: document.body.dataset.page, url: location.search, gate: !!document.getElementById('gate') && !document.getElementById('gate').hidden }));
  await ctx.close(); return { ...r, errs };
}
for (const [q, want] of [['?go=daily&from=streak', 'daily'], ['?go=progress&from=weekly', 'progress'], ['?go=pp&from=remind', ['pp', 'learn']], ['?go=hub&from=x', 'hub'], ['?go=nimporte', 'hub']]) {
  const r = await run(q, player);
  ok((Array.isArray(want) ? want : [want]).includes(r.page), `${q} → page ${r.page}`);
  ok(!/go=|from=/.test(r.url), `${q} : adresse nettoyée (${r.url || 'vide'})`);
  ok(!r.errs.length, `${q} : aucune erreur JS ${r.errs.join(' | ')}`);
}
const first = await run('?go=daily', {});
ok(first.page !== 'daily', `premier lancement : ?go=daily ignoré (page ${first.page})`);
await browser.close();
console.log(fail ? `${fail} échec(s)` : 'Tout est bon'); process.exit(fail ? 1 : 0);
