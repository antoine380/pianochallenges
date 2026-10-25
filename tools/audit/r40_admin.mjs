// Chantier BACK OFFICE : la page /admin avec un faux Supabase (tools/audit/fakesb.mjs, FAKE_ADMIN) — aucun service en ligne.
// Vérifie : sans aal2 rien ne s'affiche (mot de passe seul, compte non admin, mauvais code) ; enrôlement TOTP (QR code) puis
// code ; avec aal2 chaque écran se charge sans erreur ; une action écrit le journal ; rôle « lecture » = actions grisées ;
// pas de défilement de page à 1280×800 et 1024×768 ; page utilisable en 375×667 (menu, pas de défilement horizontal) ;
// déconnexion après inactivité (?idle= en local) ; thème clair / sombre. Captures dans /home/claude/captures-admin/.
// Usage : PORT=8797 NODE_PATH=… PW_CHROMIUM=… node tools/audit/r40_admin.mjs
import { createRequire } from 'module';
import { mkdirSync, readFileSync } from 'fs';
import { FAKE_ADMIN } from './fakesb.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = process.env.PORT || '8767', URL = `http://localhost:${PORT}/admin/`;
const CAP = '/home/claude/captures-admin'; mkdirSync(CAP, { recursive: true });
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d !== undefined && !ok ? ' — ' + JSON.stringify(d).slice(0, 400) : '')); if (!ok) fails.push(n); };
const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const PAGES = ['dash', 'stats', 'users', 'content', 'notifs', 'leagues', 'support', 'system', 'pay'];

async function open({ vp = { width: 1280, height: 800 }, adm = {}, query = '', scheme = 'light', theme = null } = {}) {
  const c = await b.newContext({ viewport: vp, colorScheme: scheme, hasTouch: vp.width < 900 });
  let net = 0;
  await c.route('**/assets/js/supabase-*.js', r => r.fulfill({ status: 200, body: FAKE_ADMIN, headers: { 'content-type': 'application/javascript' } }));
  await c.route('https://ijdxeasxmgevuchyuenn.supabase.co/**', r => { net++; return r.abort(); });
  const p = await c.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') p.errs.push(m.text()); });
  await p.addInitScript(`window.__ADM=${JSON.stringify(adm)}; ${theme ? `localStorage.setItem('pc-admin-theme','${theme}');` : ''}`);
  await p.goto(URL + query); await p.waitForTimeout(500); p.net = () => net; return p;
}
async function login(p, code = '123456') {
  await p.fill('#lgEmail', 'antoine@example.com'); await p.fill('#lgPass', 'secret'); await p.click('#lgGo'); await p.waitForTimeout(300);
  if (await p.isVisible('#lgEnroll')) { await p.fill('#lgCode1', code); await p.click('#lgEnroll button[type=submit]'); }
  else if (await p.isVisible('#lgCode')) { await p.fill('#lgCode2', code); await p.click('#lgCode button[type=submit]'); }
  await p.waitForTimeout(500);
}
const shown = p => p.evaluate(() => !document.getElementById('shell').hidden);
const noScroll = p => p.evaluate(() => ({ h: document.documentElement.scrollHeight <= innerHeight + 1 && document.body.scrollHeight <= innerHeight + 1, w: document.documentElement.scrollWidth <= innerWidth + 1, sh: document.documentElement.scrollHeight, sw: document.documentElement.scrollWidth }));
async function goPage(p, k) { if (await p.isVisible('#menuBtn')) { await p.click('#menuBtn'); await p.waitForTimeout(300); } await p.click(`#navList [data-p="${k}"]`); await p.waitForTimeout(450); }

// 1) sans aal2 : rien ne s'affiche
let p = await open();
check('page de connexion au départ, back office caché', await p.isVisible('#lgPw') && !(await shown(p)));
await p.fill('#lgEmail', 'a@b.c'); await p.fill('#lgPass', 'bad'); await p.click('#lgGo'); await p.waitForTimeout(300);
check('mauvais mot de passe : message, rien d’affiché', /incorrect/.test(await p.textContent('#lgMsg')) && !(await shown(p)));
await p.fill('#lgPass', 'secret'); await p.click('#lgGo'); await p.waitForTimeout(400);
check('premier passage : enrôlement TOTP avec QR code et clé', await p.isVisible('#lgEnroll') && (await p.getAttribute('#lgQr', 'src')).startsWith('data:image/svg') && (await p.textContent('#lgSecret')).length > 10);
check('mot de passe seul (aal1) : aucune donnée chargée', !(await shown(p)) && (await p.evaluate(() => window.__ADM.calls.filter(c => c !== 'admin_me').length)) === 0);
check('aal1 : les fonctions admin_* répondent « forbidden »', await p.evaluate(async () => (await window.supabase.createClient().rpc('admin_dashboard')).error.code === '42501'));
await p.fill('#lgCode1', '000000'); await p.click('#lgEnroll button[type=submit]'); await p.waitForTimeout(300);
check('mauvais code : message, toujours rien d’affiché', /Code incorrect/.test(await p.textContent('#lgMsg')) && !(await shown(p)));
await p.fill('#lgCode1', '123456'); await p.click('#lgEnroll button[type=submit]'); await p.waitForTimeout(700);
check('bon code (aal2) : tableau de bord affiché', await shown(p) && /Actifs aujourd/.test(await p.textContent('#main')));
check('aucune requête vers le vrai Supabase', p.net() === 0);
await p.reload(); await p.waitForTimeout(700);
check('rechargement de l’onglet : la session aal2 reste (sessionStorage)', await shown(p));
await p.click('#outBtn'); await p.waitForTimeout(400);
check('Se déconnecter : retour à la connexion', !(await shown(p)) && await p.isVisible('#lgPw'));
await login(p);
check('2e connexion : code demandé directement (facteur déjà vérifié)', await shown(p));
await p.context().close();

p = await open({ adm: { notAdmin: true } });
await login(p);
check('compte non administrateur (même en aal2) : « pas accès », rien d’affiché', await p.isVisible('#lgDenied') && !(await shown(p)));
await p.context().close();

// 2) owner : chaque écran se charge sans erreur, actions et journal, pas de défilement
p = await open({ adm: { leagues: true } });
await login(p);
for (const k of PAGES) {
  await goPage(p, k);
  const st = await p.evaluate(() => ({ err: !!document.querySelector('#main [data-err]'), loading: /Chargement…/.test(document.getElementById('main').textContent), len: document.getElementById('main').textContent.length, cur: document.querySelector('#navList [aria-current=page]')?.dataset.p }));
  check(`écran « ${k} » chargé sans erreur`, !st.err && !st.loading && st.len > 40 && st.cur === k, st);
  const ns = await noScroll(p); check(`écran « ${k} » : pas de défilement de page à 1280×800`, ns.h && ns.w, ns);
  if (['dash', 'stats', 'users'].includes(k)) await p.screenshot({ path: `${CAP}/admin_${k}_1280.png` });
}
check('aucun script injecté par un pseudo', !(await p.evaluate(() => window.__pwn)));
// statistiques : filtres et export
await goPage(p, 'stats');
await p.selectOption('#fLang', 'en'); await p.waitForTimeout(400);
check('filtre de langue : la page se recharge avec le filtre', await p.evaluate(() => document.getElementById('fLang').value === 'en'));
const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 3000 }).catch(() => null), p.click('#fCsv')]);
check('export CSV téléchargé', !!dl && /\.csv$/.test(dl.suggestedFilename()), dl && dl.suggestedFilename());
if (dl) { const csv = readFileSync(await dl.path(), 'utf8'); // a cell starting with = + - @ is neutralised (apostrophe), numbers stay numbers
  check('export CSV : formules neutralisées (« \'= »), chiffres intacts', /"'=HYPERLINK\(""http:\/\/x""\)",1/.test(csv) && !/^=|,=/m.test(csv) && /Roland FP-30X,40/.test(csv), csv.split('\n').filter(l => /HYPER|Roland/.test(l))); }
// onboarding (chantier Onboarding, migration 2026-10-26) : entonnoir écran par écran, réponses, sauts, filtre de parcours
await p.selectOption('#fLang', ''); await p.waitForTimeout(400);
check('Statistiques › Onboarding : entonnoir de 9 écrans (sans « Entrée » vide) et réponses par question', await p.evaluate(() => { const c = [...document.querySelectorAll('#main .onb-card')]; return c.length === 3 && c[0].querySelectorAll('.bar').length === 9 && document.querySelectorAll('#main .onb-q').length === 4 && /sautée/.test(c[2].textContent) && /Premiers pas 190/.test(c[1].textContent); }));
check('onboarding : mêmes filtres que les statistiques (période, appareil…)', await p.evaluate(() => window.__ADM.onbArgs && 'p_dev' in window.__ADM.onbArgs && 'p_from' in window.__ADM.onbArgs));
await p.click('#obCtx [data-c=onb]'); await p.waitForTimeout(500);
check('onboarding : filtre « Questionnaire » (p_ctx)', await p.evaluate(() => window.__ADM.onbArgs.p_ctx === 'onb' && document.querySelector('#obCtx [data-c=onb]').getAttribute('aria-pressed') === 'true'));
await p.click('#obCtx [data-c=""]'); await p.waitForTimeout(500);
await p.screenshot({ path: `${CAP}/admin_onboarding_1280.png` });
// joueurs : fiche + action → journal
await goPage(p, 'users');
await p.fill('#uQ', 'léa'); await p.click('#uGo'); await p.waitForTimeout(400);
check('recherche de joueur', (await p.locator('#main tr[data-id]').count()) === 1);
await p.click('#main tr[data-id]'); await p.waitForTimeout(400);
check('fiche du joueur ouverte', await p.isVisible('#userPane') && /Identifiant/.test(await p.textContent('#upBody')));
check('fiche : réponses d’onboarding (niveau, objectif, temps, sautées)', await p.evaluate(() => { const t = (document.getElementById('upOnb') || {}).textContent || ''; return /Je débute/.test(t) && /Jouer des morceaux/.test(t) && /10 min/.test(t) && /sautées : Lecture des notes/.test(document.getElementById('upBody').textContent); }));
await p.screenshot({ path: `${CAP}/admin_user_1280.png` });
await p.click('#uaPrem'); await p.waitForTimeout(150); await p.click('#dlgOk'); await p.waitForTimeout(500);
check('« Offrir 1 mois Premium » : écrit le journal', await p.evaluate(() => window.__ADM.log.includes('user.premium')));
await p.click('#uaDel'); await p.waitForTimeout(150);
check('suppression : bouton bloqué tant que SUPPRIMER n’est pas tapé', await p.isDisabled('#dlgOk'));
await p.fill('#dlgF input', 'SUPPRIMER'); await p.click('#dlgOk'); await p.waitForTimeout(500);
check('suppression : passe par la fonction Edge admin', await p.evaluate(() => window.__ADM.log.includes('edge.delete_user')));
await p.keyboard.press('Escape'); await p.waitForTimeout(200);
// contenu : publier une actualité
await goPage(p, 'content');
await p.click('[data-add="fr"]'); const row = p.locator('#cNews_fr .news-row').last();
await row.locator('input').nth(0).fill('Nouveau quiz'); await row.locator('input').nth(1).fill('Joue à quatre sur un seul piano.');
await p.click('#cNewsSave'); await p.waitForTimeout(150); await p.click('#dlgOk'); await p.waitForTimeout(600);
check('actualité publiée (admin_config_set → journal)', await p.evaluate(() => window.__ADM.log.includes('config.set:news')));
// notifications : envoi à un groupe
await goPage(p, 'notifs');
await p.fill('#nTitle', 'Nouveau : le quiz'); await p.fill('#nBody', 'Viens jouer.'); await p.click('#nSend'); await p.waitForTimeout(150);
check('confirmation avec le nombre de destinataires', /233 comptes/.test(await p.textContent('#dlgP')));
await p.click('#dlgOk'); await p.waitForTimeout(500);
check('notification envoyée par la fonction Edge', await p.evaluate(() => window.__ADM.log.includes('edge.notify')));
// ligues : former
await goPage(p, 'leagues'); await p.click('#lgForm'); await p.waitForTimeout(150); await p.click('#dlgOk'); await p.waitForTimeout(500);
check('ligues installées : « Former les groupes » écrit le journal', await p.evaluate(() => window.__ADM.log.includes('league.form')));
// paiements (2026-10-26_family) : abonnés, essais, revenus estimés, familles ; clic = fiche + famille
await goPage(p, 'pay');
const pay = await p.textContent('#main');
check('Paiements : plus « bientôt », abonnés / essais / revenus mensuels estimés / résiliations / familles', !(await p.evaluate(() => !!document.querySelector('#navList [data-p=pay] .soon'))) && /Abonnés payants46/.test(pay) && /Essais en cours9/.test(pay) && /Revenus mensuels estimés/.test(pay) && /Famille annuel/.test(pay) && /Membres invités15/.test(pay), pay.slice(0, 400));
await p.screenshot({ path: `${CAP}/admin_pay_1280.png` }); await p.screenshot({ path: '/home/claude/captures-famille/admin_paiements_1280.png' });
await p.click('#main tr[data-id]'); await p.waitForTimeout(400); await p.click('#uaFam'); await p.waitForTimeout(400);
check('fiche du joueur : « Famille et abonnements » (titulaire, membres, places)', /Titulaire/.test(await p.textContent('#upFam')) && /3 \/ 4/.test(await p.textContent('#upFam')));
await p.screenshot({ path: '/home/claude/captures-famille/admin_famille_joueur_1280.png' });
await p.click('#uaFamRm'); await p.waitForTimeout(150); await p.click('#dlgOk'); await p.waitForTimeout(500);
check('« Retirer de la famille » écrit le journal', await p.evaluate(() => window.__ADM.log.includes('family.remove')));
await p.keyboard.press('Escape'); await p.waitForTimeout(200);
await goPage(p, 'system');
check('journal visible dans Système', /user\.premium/.test(await p.textContent('#main')));
check('aucune erreur (owner, 1280×800)', !p.errs.length, p.errs);
// 1024×768 : pas de défilement de page
await p.setViewportSize({ width: 1024, height: 768 });
for (const k of PAGES) { await goPage(p, k); const ns = await noScroll(p); check(`écran « ${k} » : pas de défilement de page à 1024×768`, ns.h && ns.w, ns); }
await goPage(p, 'stats'); await p.screenshot({ path: `${CAP}/admin_stats_1024.png` });
await p.context().close();

// 3) rôle lecture : pas d'e-mail, actions grisées, réglages en lecture seule
p = await open({ adm: { role: 'lecture', enrolled: true } });
await login(p);
await goPage(p, 'users'); await p.click('#main tr[data-id]'); await p.waitForTimeout(400);
check('lecture : actions de la fiche grisées', await p.isDisabled('#uaPrem') && await p.isDisabled('#uaDel'));
check('lecture : pas d’e-mail dans la liste ni la fiche', !/@example\.com/.test(await p.textContent('#main')) && !/@example\.com/.test(await p.textContent('#upBody')));
await p.click('#upClose'); await goPage(p, 'content');
check('lecture : réglages en lecture seule', await p.isDisabled('#cFlagsSave') && /Lecture seule/.test(await p.textContent('#main')));
check('aucune erreur (lecture)', !p.errs.length, p.errs);
await p.context().close();

// 3 bis) migration de l'onboarding pas encore lancée : message clair, le reste des statistiques s'affiche
p = await open({ adm: { enrolled: true, noOnb: true } });
await login(p); await goPage(p, 'stats');
check('sans la migration 2026-10-26 : bloc Onboarding « à lancer », statistiques chargées', await p.evaluate(() => !!document.querySelector('[data-onb-missing]') && !document.querySelector('#main [data-err]') && /Entonnoir du premier lancement/.test(document.getElementById('main').textContent)));
await goPage(p, 'users'); await p.click('#main tr[data-id]'); await p.waitForTimeout(400);
check('sans la migration : fiche joueur sans bloc d’onboarding, sans erreur', await p.isVisible('#userPane') && !(await p.evaluate(() => !!document.getElementById('upOnb'))) && !p.errs.length, p.errs);
await p.context().close();

// 4) téléphone 375×667, thème sombre
p = await open({ vp: { width: 375, height: 667 }, scheme: 'dark', adm: { enrolled: true } });
await p.screenshot({ path: `${CAP}/admin_login_375_dark.png` });
await login(p);
for (const k of PAGES) { await goPage(p, k); const ns = await noScroll(p); check(`375×667 « ${k} » : ni défilement de page ni débordement horizontal`, ns.h && ns.w, ns); }
const mainScroll = await p.evaluate(() => { const m = document.getElementById('main'); return getComputedStyle(m).overflowY; });
check('375×667 : le contenu défile dans sa zone', mainScroll === 'auto');
await goPage(p, 'dash'); await p.screenshot({ path: `${CAP}/admin_dash_375_dark.png` });
await p.click('#menuBtn'); await p.waitForTimeout(350); await p.screenshot({ path: `${CAP}/admin_menu_375_dark.png` });
check('375×667 : le menu s’ouvre en tiroir', await p.evaluate(() => document.getElementById('side').getBoundingClientRect().left >= -1));
await p.click(`#navList [data-p="stats"]`); await p.waitForTimeout(500);
check('375×667 : un choix du menu ferme le tiroir', await p.evaluate(() => !document.body.classList.contains('drawer')));
check('aucune erreur (téléphone, sombre)', !p.errs.length, p.errs);
await p.context().close();

// 5) captures en sombre 1280 + déconnexion après inactivité
p = await open({ theme: 'dark', adm: { enrolled: true }, query: '?idle=1500' });
await login(p);
await p.screenshot({ path: `${CAP}/admin_dash_1280_dark.png` });
await p.waitForTimeout(2200);
check('inactivité : déconnecté tout seul avec un message', !(await shown(p)) && /sans activité/.test(await p.textContent('#lgMsg')));
check('aucune erreur', !p.errs.length, p.errs);
await p.context().close();

await b.close();
console.log(fails.length ? `\n${fails.length} échec(s)` : '\nTout est bon');
process.exit(fails.length ? 1 : 0);
