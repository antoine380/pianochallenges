// Chantier LIGUES (C11, étape 3) : vue Ligue du Classement, carte de l'accueil, repli sans la fonction serveur, invité.
// Faux Supabase : FAKE_SDK de fakesb.mjs (my_league selon window.__FAKE.league ; absent = migration pas encore lancée).
// Usage : PORT=8788 NODE_PATH=… PW_CHROMIUM=… node tools/audit/r28_ligues.mjs   (CAP=/chemin pour enregistrer les captures)
import { createRequire } from 'module';
import { FAKE_SDK } from './fakesb.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = process.env.PORT || '8767', URL = `http://localhost:${PORT}/`, CAP = process.env.CAP || '';
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d !== undefined && !ok ? ' — ' + JSON.stringify(d) : '')); if (!ok) fails.push(n); };
const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});

const NAMES = ['Lucie_M', 'Malo.piano', 'Nora88', 'Toi', 'Inès', 'Gabin', 'Yanis_keys', 'Chloé', 'Hugo.R', 'Lina', 'Sacha', 'Mathis', 'Jade', 'Raphaël', 'Zoé.do', 'Louis', 'Emma_B', 'Noé', 'Alice', 'Timéo'];
const XP = [2480, 2310, 2150, 1960, 1890, 1720, 1600, 1510, 1420, 1380, 1260, 1190, 1100, 980, 920, 840, 610, 450, 300, 120];
const ends = new Date(Date.now() + 3 * 864e5 + 6 * 36e5 + 6e5).toISOString();
const league = (tier = 1, n = 20, mePos = 4, extra = {}) => Array.from({ length: n }, (_, i) => ({ week: '2026-10-19', tier, pos: i + 1, name: NAMES[i], avatar: i % 10, photo: null, level: 12 - (i >> 1), xp: XP[i], me: i + 1 === mePos, ends_at: ends, closed: false, ...extra }));
const LB = Array.from({ length: 12 }, (_, i) => ({ id: 'w' + i, name: 'Joueur ' + (i + 1), avatar: i % 10, photo: null, level: 20 - i, streak: i, xp: 5000 - i * 300 }));
const USER = { id: 'me', email: 'toi@example.com', user_metadata: { full_name: 'Toi Test' } };
const today = new Date(); const ds = x => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
const STATE = (lang = 'fr', theme) => ({ xp: 4200, xpDays: { [ds(today)]: 120 }, streak: { days: 12, last: ds(today) }, gate: 'account', onb: { done: 1 }, tourDone: 1, langV2: true, netId: 'pabcd1234',
  introSeen: { scales: 1, chords: 1, harmony: 1, prog: 1, ear: 1, games: 1, daily: 1 }, stats: {}, mastery: {}, srs: {}, daily: {}, midi: { later: Date.now() },
  settings: { lang, notation: lang, input: 'screen', unlockAll: true, labels: true, uiSound: false, ...(theme ? { theme } : {}) } });

async function open(vp, fake, st = STATE()) {
  const c = await b.newContext({ viewport: vp, hasTouch: vp.width < 900 });
  await c.route('**/assets/js/supabase-*.js', r => r.fulfill({ status: 200, body: FAKE_SDK, headers: { 'content-type': 'application/javascript' } }));
  await c.route(u => u.href.startsWith(URL) && (u.pathname === '/' || u.pathname === '/index.html'), async r => { const res = await r.fetch(); let h = await res.text(); const e = h.lastIndexOf('})();\n</script>'); h = h.slice(0, e) + '\nwindow.__X=s=>eval(s);\n' + h.slice(e); await r.fulfill({ response: res, body: h, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') p.errs.push(m.text()); });
  // a saved session token so that the app loads the (fake) SDK at start, like a real account
  await p.addInitScript(`window.__FAKE=${JSON.stringify(fake)}; if(!sessionStorage.getItem('s')){ sessionStorage.setItem('s','1'); localStorage.setItem('memo-gammes-v1', ${JSON.stringify(JSON.stringify(st))}); ${fake.user ? "localStorage.setItem('sb-x-auth-token','1');" : ''} }`);
  await p.goto(URL); await p.waitForFunction(() => !!window.__X, null, { timeout: 15000 }); await p.waitForTimeout(1800);
  p.X = s => p.evaluate(s => window.__X(s), s); return p;
}
const rankOpen = async p => { await p.evaluate(() => document.getElementById('rankBtn').click()); await p.waitForTimeout(1200); };
const noScroll = p => p.evaluate(() => { const m = document.querySelector('.main'), d = document.scrollingElement; return { doc: d.scrollHeight - d.clientHeight, main: m ? m.scrollHeight - m.clientHeight : 0, w: d.scrollWidth - d.clientWidth }; });
const errs = [];
const VPS = [{ width: 375, height: 667 }, { width: 812, height: 375 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }, { width: 1280, height: 800 }];

// 1) compte, ligue Argent, 4e : carte de l'accueil
let p = await open({ width: 1280, height: 800 }, { user: USER, league: league(), leaderboard: LB });
await p.X('hsRankAt=0;renderHubRank()'); await p.waitForTimeout(800);
const hub = await p.evaluate(() => { const c = document.getElementById('hsRank').closest('.hs-card'); return { lg: c.classList.contains('lg'), t: c.querySelector('.hs-h b').textContent, sub: (c.querySelector('li.lg-sub') || {}).textContent, n: c.querySelectorAll('#hsRank li:not(.lg-sub)').length, me: (c.querySelector('li.me b') || {}).textContent, up: c.querySelectorAll('li.up').length }; });
check('accueil : « Ligue Argent »', hub.lg && hub.t === 'Ligue Argent', hub);
check('accueil : « Tu es 4e · 3 jours restants »', hub.sub === 'Tu es 4e · 3 jours restants', hub.sub);
check('accueil : 5 lignes autour de toi, ta ligne marquée « Toi », zone de promotion en vert', hub.n === 5 && hub.me === 'Toi' && hub.up >= 4, hub);

// 2) page Classement : vue Ligue par défaut pour un compte
await rankOpen(p);
const rk = await p.evaluate(() => { const L = [...document.querySelectorAll('#lgView .lg-list li:not(.lg-band)')];
  return { pressed: document.getElementById('rankLg')?.getAttribute('aria-pressed'), n: L.length, up: L.filter(l => l.classList.contains('up')).map(l => +l.querySelector('.rk').textContent), down: L.filter(l => l.classList.contains('down')).map(l => +l.querySelector('.rk').textContent),
    bands: [...document.querySelectorAll('#lgView .lg-band')].map(x => x.className.split(' ')[1] + ':' + x.textContent), me: document.querySelector('#lgView .lg-list li.me b')?.textContent, title: document.querySelector('#lgView .lg-head h3')?.textContent,
    cur: document.querySelector('#lgView .lg-tiers li.cur span:last-child')?.textContent, youAre: document.querySelector('#lgView .lg-me b')?.textContent, msg: document.querySelector('#lgView .lg-me small')?.textContent,
    stats: [...document.querySelectorAll('#lgView .lg-stats .card')].map(c => c.textContent), oldHidden: getComputedStyle(document.querySelector('#rankPanel .rank-card')).display === 'none' }; });
check('classement : onglet « Ligue » choisi par défaut', rk.pressed === 'true', rk.pressed);
check('classement : les 20 du groupe, ancien classement masqué', rk.n === 20 && rk.oldHidden, rk);
check('classement : top 5 en vert, 3 derniers en rouge', JSON.stringify(rk.up) === '[1,2,3,4,5]' && JSON.stringify(rk.down) === '[18,19,20]', rk);
check('classement : bandeaux « monter en Or » après le 5e et « descendre en Bronze » avant le 18e', rk.bands.length === 2 && /Or$/.test(rk.bands[0]) && rk.bands[0].startsWith('up') && /Bronze$/.test(rk.bands[1]), rk.bands);
check('classement : titre, division en cours, « Tu es 4e », message de promotion', rk.title === 'Ligue Argent' && rk.cur === 'Argent' && rk.youAre === 'Tu es 4e' && /promotion.*Or/.test(rk.msg), rk);
check('classement : temps restant « 3 j 6 h » et écart avec le 3e « 190 XP »', /3 j 6 h/.test(rk.stats[0] || '') && /3e/.test(rk.stats[1] || '') && /190\sXP/.test(rk.stats[1] || ''), rk.stats);
// basculer sur « Cette semaine » puis revenir
await p.evaluate(() => [...document.querySelectorAll('#rankPer button')].find(x => x.id !== 'rankLg' && /Semaine/.test(x.textContent)).click()); await p.waitForTimeout(900);
const wk = await p.evaluate(() => ({ lg: document.getElementById('lgView').hidden, rows: document.querySelectorAll('#rankList li').length, on: document.body.classList.contains('lg-on') }));
check('classement : « Semaine » rend l’ancien classement', wk.lg && !wk.on && wk.rows >= 12, wk);
await p.evaluate(() => document.getElementById('rankLg').click()); await p.waitForTimeout(700);
check('classement : retour à la Ligue', await p.evaluate(() => !document.getElementById('lgView').hidden && document.querySelectorAll('#lgView .lg-list li.me').length === 1));
errs.push(...p.errs); await p.context().close();

// 3) aucune page qui défile, la liste défile dans sa carte ; captures clair / sombre
for (const theme of ['light', 'dark']) for (const vp of VPS) {
  p = await open(vp, { user: USER, league: league(), leaderboard: LB }, STATE('fr', theme));
  await rankOpen(p); await p.waitForTimeout(300);
  const s = await noScroll(p), inner = await p.evaluate(() => { const o = document.querySelector('#lgView .lg-list'), r = o.getBoundingClientRect(), me = o.querySelector('li.me').getBoundingClientRect(); return { sh: o.scrollHeight, ch: o.clientHeight, bottom: Math.round(r.bottom), vh: innerHeight, meVis: me.top >= r.top - 1 && me.bottom <= r.bottom + 1 }; });
  if (theme === 'light') {
    check(`${vp.width}×${vp.height} : pas de défilement de page`, s.doc <= 1 && s.main <= 1 && s.w <= 0, s);
    check(`${vp.width}×${vp.height} : la liste tient dans l’écran, ta ligne visible`, inner.bottom <= inner.vh + 1 && inner.ch >= 100 && inner.meVis, inner);
  }
  if (CAP) await p.screenshot({ path: `${CAP}/ligue_${vp.width}x${vp.height}_${theme}.png` });
  if (CAP && theme === 'light' && vp.width >= 1024) { await p.evaluate(() => document.getElementById('homeLink').click()); await p.waitForTimeout(400); await p.X('hsRankAt=0;renderHubRank()'); await p.waitForTimeout(600); await p.screenshot({ path: `${CAP}/accueil_${vp.width}x${vp.height}.png` }); }
  errs.push(...p.errs); await p.context().close();
}

// 4) fonction my_league pas encore installée : l'ancien classement, sans erreur
p = await open({ width: 1280, height: 800 }, { user: USER, leaderboard: LB });
await p.X('hsRankAt=0;renderHubRank()'); await p.waitForTimeout(900);
const off = await p.evaluate(() => { const c = document.getElementById('hsRank').closest('.hs-card'); return { t: c.querySelector('.hs-h b').textContent, lg: c.classList.contains('lg'), n: c.querySelectorAll('#hsRank li').length }; });
check('sans my_league : carte « Classement de la semaine » avec les joueurs', !off.lg && off.t === 'Classement de la semaine' && off.n >= 5, off);
await rankOpen(p);
const off2 = await p.evaluate(() => ({ btn: !!document.getElementById('rankLg'), lg: document.getElementById('lgView').hidden, rows: document.querySelectorAll('#rankList li').length, on: document.body.classList.contains('lg-on') }));
check('sans my_league : pas d’onglet Ligue, ancien classement de la semaine', !off2.btn && off2.lg && !off2.on && off2.rows >= 12, off2);
check('sans my_league : aucune erreur console', p.errs.length === 0, p.errs);
errs.push(...p.errs); await p.context().close();

// 5) réseau coupé : message, pas d'erreur
p = await open({ width: 1024, height: 768 }, { user: USER, leaderboard: LB, league: 'fail' });
await rankOpen(p);
check('réseau coupé : message « indisponible », pas de liste', await p.evaluate(() => !!document.querySelector('#lgView .lg-msg') && !document.querySelector('#lgView .lg-list')));
errs.push(...p.errs); await p.context().close();

// 6) invité : onglet Ligue → invitation à créer un compte → écran de connexion
p = await open({ width: 1024, height: 768 }, { league: [], leaderboard: LB }, { ...STATE(), gate: 'guest' });
await rankOpen(p);
check('invité : onglet Ligue proposé, l’ancien classement reste par défaut', await p.evaluate(() => !!document.getElementById('rankLg') && document.getElementById('rankLg').getAttribute('aria-pressed') === 'false' && document.getElementById('lgView').hidden));
await p.evaluate(() => document.getElementById('rankLg').click()); await p.waitForTimeout(900);
const g = await p.evaluate(() => ({ t: document.querySelector('#lgView .lg-guest h3')?.textContent, btn: !!document.getElementById('lgJoin') }));
check('invité : « Rejoins les ligues » + bouton S’inscrire', g.t === 'Rejoins les ligues' && g.btn, g);
if (CAP) await p.screenshot({ path: `${CAP}/ligue_invite_1024x768.png` });
await p.evaluate(() => document.getElementById('lgJoin').click()); await p.waitForTimeout(700);
check('invité : le bouton ouvre l’écran de connexion (authOpen)', await p.evaluate(() => !document.getElementById('gate').hidden));
errs.push(...p.errs); await p.context().close();
// invité, fonction absente : pas d'onglet après la vérification
p = await open({ width: 1024, height: 768 }, { leaderboard: LB }, { ...STATE(), gate: 'guest', settings: { ...STATE().settings, rankPer: 'league' } });
await rankOpen(p); await p.waitForTimeout(500);
check('invité sans my_league : retour au classement, pas d’onglet Ligue', await p.evaluate(() => !document.getElementById('rankLg') && document.getElementById('lgView').hidden && document.querySelectorAll('#rankList li').length >= 12));
errs.push(...p.errs); await p.context().close();

// 7) divisions extrêmes, petit groupe, ligue close, anglais
p = await open({ width: 1024, height: 768 }, { user: USER, league: league(5, 20, 2), leaderboard: LB });
await rankOpen(p);
check('Diamant : pas de zone de promotion, relégation vers Rubis', await p.evaluate(() => !document.querySelector('#lgView .lg-band.up') && /Rubis$/.test(document.querySelector('#lgView .lg-band.down').textContent) && !document.querySelector('#lgView li.up')));
errs.push(...p.errs); await p.context().close();
p = await open({ width: 1024, height: 768 }, { user: USER, league: league(0, 4, 4), leaderboard: LB });
await rankOpen(p);
check('Bronze, groupe de 4 : tous en zone de promotion, pas de relégation', await p.evaluate(() => document.querySelectorAll('#lgView li.up:not(.lg-band)').length === 4 && !document.querySelector('#lgView .lg-band.down') && document.querySelectorAll('#lgView .lg-band.up').length === 1));
errs.push(...p.errs); await p.context().close();
p = await open({ width: 1024, height: 768 }, { user: USER, league: league(1, 20, 19, { closed: true }), leaderboard: LB });
await rankOpen(p);
check('ligue close, 19e : « tu descends en Bronze lundi »', await p.evaluate(() => /descends en Bronze lundi/.test(document.querySelector('#lgView .lg-me small').textContent)));
errs.push(...p.errs); await p.context().close();
p = await open({ width: 1280, height: 800 }, { user: USER, league: league(), leaderboard: LB }, STATE('en'));
await p.X('hsRankAt=0;renderHubRank()'); await p.waitForTimeout(800);
const en = await p.evaluate(() => { const c = document.getElementById('hsRank').closest('.hs-card'); return c.querySelector('.hs-h b').textContent + ' | ' + c.querySelector('li.lg-sub').textContent; });
check('anglais : « Silver league | You\'re 4th · 3 days left »', en === "Silver league | You're 4th · 3 days left", en);
await rankOpen(p);
check('anglais : bandeau « move up to Gold »', await p.evaluate(() => /move up to Gold$/.test(document.querySelector('#lgView .lg-band.up').textContent) && document.getElementById('rankLg').textContent === 'League'));
errs.push(...p.errs); await p.context().close();

check('aucune erreur JS ni console', errs.length === 0, errs.slice(0, 5));
await b.close();
console.log(fails.length ? `\n${fails.length} échec(s)` : '\nTout est OK'); process.exit(fails.length ? 1 : 0);
