// Chantier FINITIONS (25/10/2026) : petites retouches.
// Vérifie : quiz en zones sur un clavier trop petit (avertissement, « Passer à N joueurs », pas de partie) ; écran de connexion
// ouvert depuis l'app (croix + Échap, rien de perdu) mais pas au premier lancement ; libellés « Continuer sans compte » / « Sign in » ;
// numéros d'octave (Do central = Do3 en français, C4 en anglais) dans le quiz, l'import et le clavier ; « Motif » en français
// dans l'Accompagnement ; icône de l'appareil dans la préparation du micro.
// Usage : PORT=8860 NODE_PATH=… PW_CHROMIUM=… node tools/audit/r42_finitions.mjs
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = process.env.PORT || '8767', URL = `http://localhost:${PORT}/`;
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d !== undefined && !ok ? ' — ' + JSON.stringify(d) : '')); if (!ok) fails.push(n); };
const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const STATE = (lang = 'fr', extra = {}) => ({ xp: 120, xpDays: {}, gate: 'guest', onb: { done: 1 }, tourDone: 1, langV2: true, pwShown: 1,
  introSeen: { hub: 1, learn: 1, games: 1, chords: 1, scales: 1, settings: 1, progress: 1, notif: 1, quiz: 1 }, stats: {}, mastery: {}, srs: {}, secStats: {},
  acct: { n: 2 }, notifs: { list: [], keys: {}, init: 1, nv2: 1 }, settings: { lang, notation: lang, input: 'screen', uiSound: false }, ...extra });

async function open(vp, st) {
  const c = await b.newContext({ viewport: vp, hasTouch: vp.width < 900, locale: 'fr-FR' });
  await c.route(u => u.href.startsWith(URL) && (u.pathname === '/' || u.pathname === '/index.html'), async r => { const res = await r.fetch(); let h = await res.text(); const e = h.lastIndexOf('})();\n</script>'); h = h.slice(0, e) + '\nwindow.__X=s=>eval(s);\n' + h.slice(e); await r.fulfill({ response: res, body: h, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await c.route('https://ijdxeasxmgevuchyuenn.supabase.co/**', r => r.abort());
  const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED|supabase/i.test(m.text())) p.errs.push(m.text()); });
  if (st) await p.addInitScript(`if(!sessionStorage.getItem('s')){ sessionStorage.setItem('s','1'); localStorage.setItem('memo-gammes-v1', ${JSON.stringify(JSON.stringify(st))}); }`);
  await p.goto(URL); await p.waitForFunction(() => !!window.__X, null, { timeout: 15000 }); await p.waitForTimeout(1200);
  p.X = s => p.evaluate(s => window.__X(s), s); return p;
}
const vis = (p, s) => p.evaluate(s => { const e = document.querySelector(s); return !!e && !e.hidden && e.checkVisibility() && e.getClientRects().length > 0; }, s);

// 1) quiz, zones d'un même piano
{ const p = await open({ width: 1180, height: 820 }, STATE('fr', { settings: { lang: 'fr', notation: 'fr', input: 'screen', uiSound: false, quiz: { n: 4, mode: 'zone', where: 'local', bots: 0 } } }));
  await p.X('qzRange=()=>[48,84]'); // a 37-key keyboard (Do2..Do5)
  await p.click('#modeNav [data-mode=quiz]'); await p.waitForTimeout(400);
  for (let i = 0; i < 30 && !(await p.X('!!QZ.data')); i++) await p.waitForTimeout(100); await p.X('renderQzSetup()');
  const w = await p.evaluate(() => ({ on: !document.getElementById('qzSmallWarn').hidden, txt: document.getElementById('qzSmallWarn').textContent, go: document.getElementById('qzGo').disabled }));
  check('37 touches, 4 zones : « Ton clavier est trop petit pour 4 zones » + « Passer à 3 joueurs », Commencer grisé', w.on && /Ton clavier est trop petit pour 4 zones/.test(w.txt) && /Passer à 3 joueurs/.test(w.txt) && w.go, w);
  await p.X('qzStart()'); await p.waitForTimeout(200);
  check('… aucune partie à 4 zones ne se lance', await p.X('QZ.view') === 'setup');
  await p.click('#qzFewer'); await p.waitForTimeout(200);
  const w2 = await p.evaluate(() => ({ n: document.querySelector('#qzN [aria-pressed=true]').textContent, warn: document.getElementById('qzSmallWarn').hidden, zones: document.querySelectorAll('#qzZoneMap .qz-zone').length, pins: [...document.querySelectorAll('#qzPlayers .qz-pin')].map(x => x.textContent) }));
  check('« Passer à 3 joueurs » : 3 joueurs, 3 zones, plus d’avertissement', w2.n === '3' && w2.warn && w2.zones === 3, w2);
  check('zones nommées avec le Do central = Do3 (Do2 – Si2, Do3 – Si3, Do4 – Do5)', w2.pins.join('|') === 'Do2 – Si2|Do3 – Si3|Do4 – Do5', w2.pins);
  await p.X('qzRange=()=>[48,72]; qzCfg().n=4; renderQzSetup()'); // 25 keys: only 2 fit
  check('25 touches : « Passer à 2 joueurs »', /Passer à 2 joueurs/.test(await p.evaluate(() => document.getElementById('qzFewer').textContent)));
  check('octaves : octName(60)=Do3, qzMidiName(60)=Do3, impNote(60)=Do3, touche 60 « Do 3 »', await p.X('[octName(60),qzMidiName(60),impNote(60)].join()') === 'Do3,Do3,Do3'
    && await p.evaluate(() => (document.querySelector('#kbd [data-m="60"]') || { getAttribute: () => 'Do 3' }).getAttribute('aria-label')) === 'Do 3');
  check('accompagnement : « Motif » en français', await p.X('[t("accNext"),t("accStyleH"),t("accPatN")(2),t("accNPat")(3)].join("|")') === 'Motif suivant|Style et motif|Motif 2|3 motifs');
  check('libellé : « Continuer sans compte » (plus « en invité »)', await p.X('t("gtGuest")') === 'Continuer sans compte' && !/invité/.test(await p.X('t("gtSoonProv")')));
  // 2) écran de connexion ouvert depuis l'app (invité) : croix et Échap
  await p.click('#modeNav [data-mode=learn]'); await p.waitForTimeout(400);
  await p.X('authOpen("signup")'); await p.waitForTimeout(400);
  check('connexion depuis l’app : croix de fermeture visible', await vis(p, '#gate') && await vis(p, '#gtClose'));
  const xr = await p.evaluate(() => { const r = document.getElementById('gtClose').getBoundingClientRect(), c = document.querySelector('.gt-card').getBoundingClientRect(); return { dx: Math.round(c.right - r.right), dy: Math.round(r.top - c.top) }; });
  check('… en haut à droite de la carte', xr.dx >= 0 && xr.dx < 50 && xr.dy >= 0 && xr.dy < 50, xr);
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  check('Échap : retour à LEARN, toujours invité, app utilisable', !(await vis(p, '#gate')) && await p.evaluate(() => document.body.dataset.page) === 'learn' && await p.X('S.gate') === 'guest' && await p.evaluate(() => !document.body.classList.contains('gate-on') && !document.getElementById('shell').inert));
  await p.X('authOpen("login")'); await p.waitForTimeout(300);
  if (await p.evaluate(() => !document.getElementById('gtEmailGo').disabled)) { await p.click('#gtEmailGo'); await p.waitForTimeout(200); }
  check('formulaire : « Continuer sans compte » et croix', /Continuer sans compte/.test(await p.evaluate(() => document.getElementById('gateGuest').textContent)) && await vis(p, '#gtClose'));
  await p.click('#gtClose'); await p.waitForTimeout(300);
  check('croix : écran fermé, rien de perdu', !(await vis(p, '#gate')) && await p.evaluate(() => document.body.dataset.page) === 'learn');
  // 7) icône de l'appareil (ordinateur ici)
  await p.X('try{ mpOpen() }catch(e){}'); await p.waitForTimeout(300);
  check('micro : icône ordinateur quand le texte dit « Place l’ordinateur »', await p.evaluate(() => { const li = document.querySelector('#mpTips li'); return /ordinateur/.test(li.textContent) && /M2\.5 18\.5h19/.test(li.querySelector('svg').innerHTML); })
    && await p.X('MP_DEV_ICO.ipad!==MP_DEV_ICO.iphone && MP_DEV_ICO.ipad!==MP_DEV_ICO.other'));
  await p.X('mpClose(false)');
  check('aucune erreur de page (FR)', p.errs.length === 0, p.errs);
  await p.context().close(); }

// 3) anglais : « Sign in » / « Sign up », C4
{ const p = await open({ width: 1180, height: 820 }, STATE('en'));
  check('EN : « Sign in » pour se connecter, « Sign up » pour s’inscrire (plus « Log in »)', await p.X('[t("authIn"),t("authUp"),t("gtLogin"),t("gtSignIn")].join()') === 'Sign in,Sign up,Sign in,Sign in'
    && !/Log in/i.test(await p.evaluate(() => document.body.innerText)));
  check('EN : octName(60)=C4, qzMidiName(60)=C4, « Pattern » gardé', await p.X('[octName(60),qzMidiName(60),t("accNext")].join()') === 'C4,C4,Next pattern');
  check('aucune erreur de page (EN)', p.errs.length === 0, p.errs);
  await p.context().close(); }

// 4) premier lancement : l'écran de connexion ouvert depuis « Se connecter » reste sans croix, Échap ne le ferme pas
{ const p = await open({ width: 1180, height: 820 }, null);
  if (await vis(p, '#fnLogin')) { await p.click('#fnLogin'); await p.waitForTimeout(400); }
  check('premier lancement → Se connecter : pas de croix', await vis(p, '#gate') && !(await vis(p, '#gtClose')));
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  check('… Échap ne le ferme pas', await vis(p, '#gate'));
  await p.context().close(); }

// 5) lecteur Play : le Do central s'appelle Do3 en français (noms des Do sur le clavier)
{ const c = await b.newContext({ viewport: { width: 1180, height: 820 } }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL + 'play/index.html#song=lune&lang=fr'); await p.waitForTimeout(1500);
  await p.evaluate(() => document.getElementById('tNames')?.click()); await p.waitForTimeout(300); // names off: only the Cs keep their octave name
  const labs = await p.evaluate(() => [...document.querySelectorAll('#kbd .lbl')].map(l => l.textContent.trim()).filter(x => /^Do\d$/.test(x)));
  console.log('   (noms des Do du lecteur :', labs.join(' '), ')');
  check('lecteur Play (FR) : Do des octaves nommés selon Do central = Do3', labs.includes('Do3') && !labs.includes('Do6'), labs);
  const intro = await p.evaluate(() => document.body.innerText);
  check('lecteur Play (FR) : pas de « Do3 à Si3 » pour la main gauche', !/Do3 à Si3/.test(intro));
  check('lecteur Play : aucune erreur', errs.length === 0, errs);
  await c.close(); }

await b.close();
console.log(fails.length ? `\n${fails.length} échec(s)` : '\nTout est bon');
process.exit(fails.length ? 1 : 0);
