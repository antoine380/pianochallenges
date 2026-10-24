// Vérification indépendante avant la mise en production (24/10/2026) : défauts trouvés en jouant l'app, un cas par correction.
// Usage : python3 -m http.server 8767 à la racine, puis  PORT=8767 node tools/audit/r20_check.mjs
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = process.env.PORT || '8767', URL = `http://localhost:${PORT}/`;
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d !== undefined && !ok ? ' — ' + JSON.stringify(d) : '')); if (!ok) fails.push(n); };
const seed = (lang = 'fr') => `(()=>{ try{ if(sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded','1');
  localStorage.setItem('memo-gammes-v1', JSON.stringify({settings:{lang:'${lang}',notation:'${lang}',input:'screen',uiSound:false},gate:'guest',onb:{done:1},tourDone:1,pwShown:1,
    introSeen:Object.fromEntries(['hub','learn','games','free','play','quiz','chords','scales','harmony','prog','ear','daily','practice'].map(k=>[k,1]))})); }catch(e){} })();`;
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
const W = (p, ms) => p.waitForTimeout(ms);
async function open(w, h, lang = 'fr') { const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: lang === 'fr' ? 'fr-FR' : 'en-GB' });
  await ctx.route(/supabase\.co/, r => r.abort()); await ctx.addInitScript(seed(lang)); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.errs = errs;
  await p.goto(URL); await W(p, 900); return p; }

// ---- 1. quiz, réglages : tuiles des thèmes sans chevauchement, « Commencer » toujours à l'écran (4 joueurs, zones) ----
for (const [w, h] of [[1024, 768], [1180, 820], [1440, 900]]) {
  const p = await open(w, h);
  await p.evaluate(() => document.querySelector('#modeNav [data-mode=quiz]').click()); await W(p, 800);
  const themes = () => p.evaluate(() => { const ts = [...document.querySelectorAll('#qzThemes .qz-theme')].map(e => e.getBoundingClientRect()); const c = document.getElementById('qzConf').getBoundingClientRect(); let ov = 0;
    for (let i = 0; i < ts.length; i++) for (let j = i + 1; j < ts.length; j++) { const a = ts[i], d = ts[j]; if (a.left < d.right - 1 && d.left < a.right - 1 && a.top < d.bottom - 1 && d.top < a.bottom - 1) ov++; }
    return { ov, below: Math.max(...ts.map(t => t.bottom)) <= c.top + 1 }; });
  const r = await themes();
  check(`${w}×${h} quiz : tuiles des thèmes sans chevauchement, au-dessus de la configuration`, r.ov === 0 && r.below, r);
  for (const mode of ['dev', 'zone']) {
    await p.evaluate(() => document.querySelectorAll('#qzN button')[3].click()); await W(p, 200);
    await p.evaluate(m => { const re = m === 'zone' ? /zone/i : /clavier|keyboard/i; [...document.querySelectorAll('#qzMode button')].find(b => re.test(b.textContent)).click(); }, mode); await W(p, 300);
    const g = await p.evaluate(() => { const r = document.getElementById('qzGo').getBoundingClientRect(); return { bottom: Math.round(r.bottom), vh: innerHeight, doc: document.scrollingElement.scrollHeight - innerHeight }; });
    check(`${w}×${h} quiz 4 joueurs (${mode}) : « Commencer » visible, pas de défilement de page`, g.bottom <= g.vh && g.doc <= 0, g);
  }
  check(`${w}×${h} aucune erreur de page`, p.errs.length === 0, p.errs);
  await p.context().close();
}

// ---- 2. quiz à 2, personne ne marque : « Égalité ! » (avant : « Joueur 1 gagne ! » à 0 – 0) ----
{ const p = await open(1180, 820);
  await p.evaluate(() => document.querySelector('#modeNav [data-mode=quiz]').click()); await W(p, 800);
  await p.evaluate(() => { document.querySelectorAll('#qzN button')[1].click(); document.querySelectorAll('#qzBots button')[0]?.click(); document.querySelectorAll('#qzCount button')[0].click(); document.querySelectorAll('#qzTime button')[0].click(); }); await W(p, 200);
  await p.evaluate(() => [...document.querySelectorAll('#qzMode button')].find(b => /tour|turn/i.test(b.textContent)).click()); await W(p, 200);
  await p.evaluate(() => document.getElementById('qzGo').click());
  const t0 = Date.now(); while (Date.now() - t0 < 90000) { const st = await p.evaluate(() => { if (!document.getElementById('qzEnd').hidden) return 'end'; const n = document.getElementById('qzNext'); if (!n.hidden) n.click(); return ''; }); if (st) break; await W(p, 400); }
  const end = await p.evaluate(() => !document.getElementById('qzEnd').hidden && document.getElementById('qzEndT').textContent);
  check('quiz à 2 sans aucun point : « Égalité ! »', end === 'Égalité !', end);
  await p.context().close(); }

// ---- 3. écran de connexion : une erreur de saisie n'efface plus le mot de passe ni la case de consentement ----
{ const p = await open(1024, 768);
  await p.evaluate(() => document.querySelector('#topAuth [data-auth=signup]').click()); await W(p, 1500);
  await p.evaluate(() => { const b = document.getElementById('gtEmailGo'); b.disabled = false; b.click(); }); await W(p, 300);
  await p.fill('#gtEmail', 'test@example.com'); await p.fill('#gtPwd', '12345678');
  await p.evaluate(() => { const b = document.getElementById('gtGo'); b.disabled = false; b.click(); }); await W(p, 300);
  const r = await p.evaluate(() => ({ msg: document.getElementById('gtMsg').textContent, pwd: document.getElementById('gtPwd').value }));
  check('inscription sans consentement : message, mot de passe gardé', /politique|privacy/i.test(r.msg) && r.pwd === '12345678', r);
  await p.evaluate(() => document.getElementById('gtOk').click()); await p.fill('#gtEmail', 'pas-un-mail');
  await p.evaluate(() => document.getElementById('gtGo').click()); await W(p, 300);
  const r2 = await p.evaluate(() => ({ msg: document.getElementById('gtMsg').textContent, ok: document.getElementById('gtOk').checked, pwd: document.getElementById('gtPwd').value }));
  check('e-mail invalide : message, consentement et mot de passe gardés', /valide|valid/i.test(r2.msg) && r2.ok && r2.pwd === '12345678', r2);
  await p.context().close(); }

await b.close();
console.log(fails.length ? `\n${fails.length} échec(s)` : '\nTout est bon');
process.exit(fails.length ? 1 : 0);
