// Revue UI complète (25/10/2026) : captures de tous les écrans à plusieurs tailles + mesures automatiques des défauts.
// Pour chaque capture : défilement de la page (#main / document / largeur), erreurs console, textes coupés sans points de suspension,
// éléments qui sortent de l'écran, cibles tactiles < 40 px (tailles tactiles), conteneurs de liste vides.
// Usage : PORT=8890 NODE_PATH=… PW_CHROMIUM=… OUT=/home/claude/captures-ui/avant node tools/audit/capture_ui.mjs
//   ONLY=hub,learn (écrans)  SIZES=1024x768,390x844  THEME=dark  LANG=en
import { createRequire } from 'module';
import fs from 'fs';
import { FAKE_ADMIN } from './fakesb.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = process.env.PORT || '8767', BASE = `http://localhost:${PORT}/`;
const OUT = process.env.OUT || '/home/claude/captures-ui/avant'; fs.mkdirSync(OUT, { recursive: true });
const LANG = process.env.LANG_UI || 'fr';
const W = ms => new Promise(r => setTimeout(r, ms));
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
const SIZES = (process.env.SIZES || '1024x768,768x1024,1180x820,1366x1024,375x667,390x844,844x390,1440x900').split(',').map(s => s.split('x').map(Number));
const THEMES = (process.env.THEME || 'light').split(',');

// ---- états de test ----
const d = n => { const x = new Date(); x.setDate(x.getDate() - n); return x.toISOString().slice(0, 10); };
const intro = Object.fromEntries(['hub','learn','games','free','play','quiz','chords','scales','harmony','prog','ear','daily','practice','runner','speed','memory','douze','rank','account','settings','progress','notif','section'].map(k => [k, 1]));
const base = (theme, extra = {}) => ({ settings: { lang: LANG, notation: LANG, input: 'screen', earV2: true, diffV2: true, midiV2: true, uiSound: false, theme },
  langV2: true, gate: 'guest', onb: { done: 1, level: 'notes' }, tourDone: 1, pwShown: 1, introSeen: intro, seenTypes: [], stats: {}, secStats: {}, xp: 0, xpDays: {}, streak: { days: 0, last: '' }, hints: { seen: { resume: 1, map: 1, inp: 1, star: 1, fing: 1, labels: 1, rotate: 1 } }, goal: { kind: 'min', v: 10, at: 1, asked: 1 }, ...extra });
const rich = theme => { const xpDays = {}; for (let i = 0; i < 70; i++) if (i % 5 !== 3) xpDays[d(i)] = 30 + (i * 7) % 90;
  const ppd = {}; for (let i = 1; i <= 14; i++) ppd['p' + String(i).padStart(2, '0')] = { at: Date.now() - i * 864e5, stars: 1 + (i % 3), last: Date.now() - i * 864e5, err: i % 4, sec: 120, tries: 1 };
  const now = Date.now();
  return base(theme, { xp: 9400, xpDays, streak: { days: 23, last: d(0) }, profileName: 'Antoine',
    mastery: { 'major:C': 3, 'major:G': 3, 'major:F': 2, 'minor:A': 2, 'maj:C': 3, 'maj:G': 3, 'min:A': 2 },
    stats: { ok: 820, perfect: 400, revealed: 30, errors: 120 }, secStats: { chords: { ok: 420, perfect: 200, revealed: 10, errors: 50 }, scales: { ok: 300, perfect: 150, revealed: 12, errors: 40 }, harmony: { ok: 60, perfect: 30, revealed: 4, errors: 20 }, prog: { ok: 30, perfect: 10, revealed: 2, errors: 8 }, ear: { ok: 10, perfect: 5, revealed: 2, errors: 4 } },
    seenTypes: ['major', 'minor', 'maj', 'min'], gameBest: { speed: 31, memory: 12, 'douze-maj': 2 }, runnerBest: 2400,
    elo: { 'runner-chords': { r: 1012, n: 18, w: 11, d: 1, l: 6 }, 'speed-notes': { r: 860, n: 7, w: 4, d: 0, l: 3 }, 'memory-chords': { r: 790, n: 3, w: 1, d: 0, l: 2 } },
    notifs: { nv2: 1, init: 1, keys: {}, list: [
      { id: 'n1', cat: 'challenge', type: 'elo', t: now - 3600e3, ti: 'Nouveau record d’ELO : 1012', tx: 'Saute-notes en accords.', act: null, read: false },
      { id: 'n2', cat: 'progress', type: 'level', t: now - 5 * 3600e3, ti: 'Niveau 7 atteint', tx: 'Continue comme ça !', act: null, read: false },
      { id: 'n3', cat: 'remind', type: 'streak', t: now - 30 * 3600e3, ti: 'Ta série de 22 jours est en danger', tx: 'Joue un exercice avant minuit pour la garder.', act: null, read: true },
      { id: 'n4', cat: 'news', type: 'news', t: now - 4 * 864e5, ti: 'Nouveau : la bibliothèque', tx: '200 morceaux libres de droits.', act: null, read: true } ] },
    pp: { v: 1, done: ppd, cur: 'p14', fail: {} }, route: { v: 1, done: { 's1.1': '2026-10-10', 's1.2': '2026-10-11', 's1.3': '2026-10-12', 's2.1': '2026-10-13' }, st: {} },
    cnt: { notes: 6400, chords: 900, inv: 120, games: 60, quiz: 14, quiz4: 2, night: 1, early: 0, sun: 3, staff: 40, share: 1, wRun: 3, wBest: 5 },
    songStars: { lune: 3, maman: 3, jacques: 2, ode: 1, 'lune@2': 2 }, freeze: { n: 1, used: [d(8)], at: now - 864e5 }, playSec: Object.fromEntries(Object.keys(xpDays).map(k => [k, 600])),
    dzRec: { maj: { ms: 104000, sp: [], at: now - 864e5 } } }); };
const empty = theme => base(theme, { onb: { done: 1, level: 'simple' } });
const STATES = { neuf: empty, avance: rich, vide: empty };

// ---- écrans : [id, titre, état, action, options] ----
const click = (p, s) => p.evaluate(s => { const e = document.querySelector(s); if (e) e.click(); return !!e; }, s);
const ev = (p, code) => p.evaluate(c => window.__ev(c), code);
const mode = (p, m) => click(p, `#modeNav [data-mode="${m}"]`);
const tileL = async (p, i) => { await mode(p, 'learn'); await W(350); await p.evaluate(i => document.querySelectorAll('#learnTiles .ptile')[i].click(), i); await W(600); };
const gameT = async (p, i) => { await mode(p, 'games'); await W(350); await p.evaluate(i => document.querySelectorAll('#gameCards .ptile')[i].click(), i); await W(700); };
const solo = async p => { await click(p, '#duModes [data-m=solo]'); await W(500); await p.keyboard.press('Space').catch(() => {}); await W(1800); };
const playRound = async p => { for (let k = 0; k < 40; k++) { const vis = await p.evaluate(() => { const e = document.getElementById('endModal'); return e && !e.hidden; }); if (vis) break;
  await ev(p, 'try{ const ms=revealMidis(); ms.forEach(m=>midiIn(m)); }catch(e){}'); await W(450); } await W(800); };
const SC = [
  ['first-d2', 'Premier lancement D2', 'fresh', async p => {}],
  ['first-d3', 'Premier lancement D3 (Joue un Do)', 'fresh', async p => { await p.evaluate(() => { const b = document.querySelectorAll('.fn-hwc'); (b[2] || b[0]) && (b[2] || b[0]).click(); }); await W(600); }],
  ['first-d4', 'Premier lancement D4 (niveau)', 'fresh', async p => { await p.evaluate(() => { const b = document.querySelectorAll('.fn-hwc'); (b[2] || b[0]) && (b[2] || b[0]).click(); }); await W(600); await ev(p, 'fnNote(60)'); await W(900); }],
  ['gate', 'Connexion', 'neuf', async p => { await ev(p, 'authOpen("login")'); await W(600); }],
  ['gate-mail', 'Connexion — e-mail', 'neuf', async p => { await ev(p, 'authOpen("signup")'); await W(500); await click(p, '#gtMail'); await p.evaluate(() => { const b = [...document.querySelectorAll('#gate button')].find(b => /e-mail|email/i.test(b.textContent)); b && b.click(); }); await W(500); }],
  ['hub', 'Accueil (neuf)', 'neuf', async p => { await click(p, '#homeLink'); await W(500); }],
  ['hub-av', 'Accueil (avancé)', 'avance', async p => { await click(p, '#homeLink'); await W(700); }],
  ['learn', 'LEARN (neuf)', 'neuf', async p => { await mode(p, 'learn'); await W(500); }],
  ['learn-av', 'LEARN (avancé, Ma route)', 'avance', async p => { await mode(p, 'learn'); await W(600); }],
  ['setup', 'Écran de départ — Accords', 'neuf', async p => { await tileL(p, 0); }],
  ['setup-sc', 'Écran de départ — Gammes', 'neuf', async p => { await tileL(p, 1); }],
  ['setup-ear', 'Écran de départ — Oreille', 'neuf', async p => { await tileL(p, 4); }],
  ['ex', 'Exercice — Accords', 'neuf', async p => { await tileL(p, 0); await click(p, '#suGo'); await W(800); }],
  ['ex-sc', 'Exercice — Gammes', 'neuf', async p => { await tileL(p, 1); await click(p, '#suGo'); await W(800); }],
  ['end', 'Fin de partie LEARN', 'neuf', async p => { await tileL(p, 0); await click(p, '#suGo'); await W(800); await playRound(p); }],
  ['daily', 'Entraînement du jour', 'neuf', async p => { await click(p, '#dailyCard'); await W(800); }],
  ['pp-path', 'Premiers pas — présentation', 'neuf', async p => { await ev(p, 'ppBegin()'); await W(900); }],
  ['pp-lesson', 'Premiers pas — leçon', 'neuf', async p => { await ev(p, 'ppStart("p01",0)'); await W(1200); }],
  ['pp-place', 'Test de placement', 'neuf', async p => { await ev(p, 'plOpen()'); await W(800); }],
  ['pp-cert', 'Certificat', 'avance', async p => { await ev(p, 'openPage("pp"); PP.view="cert"; ppRender()'); await W(900); }],
  ['acc', 'Accompagnement — départ', 'neuf', async p => { await tileL(p, 5); await W(300); }],
  ['acc-play', 'Accompagnement — partie', 'neuf', async p => { await tileL(p, 5); await ev(p, 'accStart()'); await W(1200); }],
  ['games', 'GAMES (neuf)', 'neuf', async p => { await mode(p, 'games'); await W(500); }],
  ['games-av', 'GAMES (avancé)', 'avance', async p => { await mode(p, 'games'); await W(500); }],
  ['lobby', 'Salon de duel', 'neuf', async p => { await gameT(p, 0); }],
  ['lobby-bots', 'Duel — bots', 'avance', async p => { await gameT(p, 0); await click(p, '#duModes [data-m=bots]'); await W(600); }],
  ['runner', 'Saute-notes', 'neuf', async p => { await gameT(p, 0); await solo(p); }],
  ['speed', 'Contre la montre', 'neuf', async p => { await gameT(p, 1); await solo(p); }],
  ['memory', 'Mémoire musicale', 'neuf', async p => { await gameT(p, 2); await solo(p); }],
  ['douze', 'Les Douze', 'neuf', async p => { await gameT(p, 3); await W(300); }],
  ['douze-play', 'Les Douze — partie', 'neuf', async p => { await gameT(p, 3); await solo(p); }],
  ['quiz', 'QUIZ — réglages', 'neuf', async p => { await mode(p, 'quiz'); await W(600); }],
  ['quiz-q', 'QUIZ — question', 'neuf', async p => { await mode(p, 'quiz'); await W(400); await click(p, '#qzGo'); await W(3500); }],
  ['quiz-end', 'QUIZ — podium', 'neuf', async p => { await mode(p, 'quiz'); await W(400); await click(p, '#qzGo'); await W(3000); await ev(p, 'qzFinish()'); await W(1200); }],
  ['quiz-online', 'QUIZ — en ligne', 'neuf', async p => { await ev(p, 'S.settings.quiz=Object.assign(S.settings.quiz||{}, {where:"online"}); save()'); await mode(p, 'quiz'); await W(800); }],
  ['free', 'PLAY — catalogue', 'neuf', async p => { await mode(p, 'play'); await W(900); }],
  ['free-lib', 'PLAY — bibliothèque', 'neuf', async p => { await mode(p, 'play'); await W(700); await click(p, '#pcLib'); await W(1200); }],
  ['free-mine', 'PLAY — Mes morceaux (vide)', 'vide', async p => { await mode(p, 'play'); await W(700); await click(p, '#pcMine'); await W(800); }],
  ['free-help', 'PLAY — tuto import', 'neuf', async p => { await mode(p, 'play'); await W(700); await ev(p, 'PC.view="help"; renderPlaySongs()'); await W(800); }],
  ['grille', 'PLAY — grille', 'neuf', async p => { await mode(p, 'play'); await W(900); await click(p, '.gr-tile'); await W(800); }],
  ['player', 'Lecteur — accueil du morceau', 'neuf', async p => { await mode(p, 'play'); await W(900); await click(p, '[data-song]'); await W(2200); }],
  ['free-kb', 'PLAY — piano libre', 'neuf', async p => { await mode(p, 'play'); await W(700); await click(p, '#pcFree'); await W(700); }],
  ['set-inter', 'Réglages — Interaction', 'neuf', async p => { await click(p, '#setBtn'); await W(500); }],
  ['set-game', 'Réglages — Jeu', 'neuf', async p => { await click(p, '#setBtn'); await W(400); await click(p, '#setNav [data-v=game]'); await W(300); }],
  ['set-ntf', 'Réglages — Notifications', 'neuf', async p => { await click(p, '#setBtn'); await W(400); await click(p, '#setNav [data-v=ntf]'); await W(300); }],
  ['set-prem', 'Réglages — Abonnement', 'neuf', async p => { await click(p, '#setBtn'); await W(400); await click(p, '#setNav [data-v=prem]'); await W(300); }],
  ['set-app', 'Réglages — Application', 'neuf', async p => { await click(p, '#setBtn'); await W(400); await click(p, '#setNav [data-v=app]'); await W(300); }],
  ['prog', 'Progression (vide)', 'vide', async p => { await click(p, '#lvlAv'); await W(700); }],
  ['prog-av', 'Progression (avancé)', 'avance', async p => { await click(p, '#lvlAv'); await W(700); }],
  ['prog-det', 'Progression — détail', 'avance', async p => { await click(p, '#lvlAv'); await W(500); await click(p, '#pfNav [data-v=det]'); await W(400); }],
  ['prog-suc', 'Progression — succès (vide)', 'vide', async p => { await click(p, '#lvlAv'); await W(500); await click(p, '#pfNav [data-v=suc]'); await W(500); }],
  ['prog-suc-av', 'Progression — succès (avancé)', 'avance', async p => { await click(p, '#lvlAv'); await W(500); await click(p, '#pfNav [data-v=suc]'); await W(500); }],
  ['rank', 'Classement (invité)', 'vide', async p => { await click(p, '#rankBtn'); await W(1500); }],
  ['notif', 'Notifications (vide)', 'vide', async p => { await ev(p, 'S.notifs={list:[],keys:{},nv2:1,init:1}; save()'); await click(p, '#ntfBtn'); await W(600); }],
  ['notif-av', 'Notifications (avancé)', 'avance', async p => { await click(p, '#ntfBtn'); await W(600); }],
  ['m-goal', 'Fenêtre objectif', 'neuf', async p => { await ev(p, 'goalOpen()'); await W(600); }],
  ['m-acct', 'Fenêtre compte (D23)', 'neuf', async p => { await ev(p, 'acctOpen()'); await W(600); }],
  ['m-week', 'Bilan de la semaine', 'avance', async p => { await ev(p, 'wkOpen()'); await W(700); }],
  ['m-pw', 'Paywall', 'neuf', async p => { await ev(p, 'pwOpen("menu")'); await W(900); }, { q: '?paywall=1' }],
  ['m-leave', 'Quitter la partie ?', 'neuf', async p => { await tileL(p, 0); await click(p, '#suGo'); await W(700); await ev(p, 'midiIn(60)'); await W(400); await click(p, '#homeLink'); await W(600); }],
  ['m-lost', 'MIDI perdu', 'neuf', async p => { await ev(p, 'mdLostRender(); openMod("mdLost")'); await W(500); }],
  ['m-input', 'Choix de l’entrée', 'neuf', async p => { await ev(p, 'openInputChooser(true)'); await W(500); }],
  ['m-midi', 'Fenêtre MIDI', 'neuf', async p => { await ev(p, 'openMidi()'); await W(600); }],
  ['m-wiz', 'Assistant MIDI — matériel', 'neuf', async p => { await ev(p, 'mwOpen("hw")'); await W(600); }],
  ['m-wiz-cable', 'Assistant MIDI — câble', 'neuf', async p => { await ev(p, 'mwOpen("cable")'); await W(600); }],
  ['m-wiz-trouble', 'Assistant MIDI — pannes', 'neuf', async p => { await ev(p, 'mwOpen("trouble")'); await W(600); }],
  ['m-cred', 'Crédits musicaux', 'neuf', async p => { await ev(p, 'credOpen()'); await W(1200); }],
  ['m-fb', 'Signaler un problème', 'neuf', async p => { await ev(p, 'fbOpen()'); await W(500); }],
  ['m-inv', 'Invite tes amis', 'neuf', async p => { await ev(p, 'invOpen()'); await W(500); }],
  ['m-rtwin', 'Fin d’étape (Ma route)', 'avance', async p => { await ev(p, 'rtWinOpen(0)'); await W(700); }],
];
const EXPOSE = '\nwindow.__ev = function(c){ return eval(c); };\n';
const MEASURE = (touch) => {
  const m = document.getElementById('main'), dd = document.scrollingElement, out = { };
  out.page = document.body.dataset.page;
  out.mainScroll = m ? m.scrollHeight - m.clientHeight : 0; out.docScroll = dd.scrollHeight - innerHeight; out.docScrollX = dd.scrollWidth - innerWidth;
  const vis = e => { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1 && !e.closest('[hidden],[inert]'); };
  const lab = e => (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + (e.id || e.className ? '' : e.tagName.toLowerCase()) + ' «' + (e.textContent || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 28) + '»';
  // cut text: overflow hidden without ellipsis, or text wider than its box
  out.cut = []; out.off = []; out.small = []; out.scrollers = [];
  for (const e of document.querySelectorAll('body *')) {
    if (!vis(e) || e.closest('svg') || e.closest('iframe')) continue;
    const s = getComputedStyle(e), r = e.getBoundingClientRect();
    const hasText = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (hasText && e.scrollWidth > e.clientWidth + 2 && s.overflowX !== 'visible' && s.textOverflow !== 'ellipsis' && !/auto|scroll/.test(s.overflowX)) out.cut.push(lab(e) + ' ' + e.scrollWidth + '>' + e.clientWidth);
    if (hasText && e.scrollHeight > e.clientHeight + 3 && s.overflowY === 'hidden' && !/-webkit-box/.test(s.display) && s.webkitLineClamp === 'none' && r.height > 8) out.cut.push(lab(e) + ' h ' + e.scrollHeight + '>' + e.clientHeight);
    if (hasText && s.position !== 'fixed' && (r.right > innerWidth + 1 || r.left < -1) && !e.closest('.pc-strip,.dz-ring,[style*="translate"],.kbd-wrap,.marquee')) { let sc = e.parentElement, inS = false; while (sc) { const cs = getComputedStyle(sc); if (/auto|scroll|hidden/.test(cs.overflowX)) { inS = true; break; } sc = sc.parentElement; } if (!inS) out.off.push(lab(e)); }
    if (touch && e.matches('button,a[href],[role=button],input:not([type=hidden]),select,summary') && !e.closest('.kbd,.wk,.bk,#kbd,.kbd-wrap,.qz-kbd,.pp-kbd') && !e.matches('.wk,.bk,[data-m]')) { if (r.width < 40 || r.height < 40) { if (!(e.tagName === 'INPUT' && /checkbox|radio/.test(e.type) && e.closest('label'))) out.small.push(lab(e) + ' ' + Math.round(r.width) + '×' + Math.round(r.height)); } }
    if (/auto|scroll/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 2 && r.height > 40) out.scrollers.push(lab(e));
  }
  // empty list containers
  out.empty = [];
  for (const e of document.querySelectorAll('ul,ol,.list,[class*=list],[id$=List],[id$=Grid],[id$=Mine]')) { if (!vis(e)) continue; if (!e.textContent.trim() && !e.querySelector('svg,img,canvas')) out.empty.push(lab(e)); }
  ['cut', 'off', 'small', 'scrollers', 'empty'].forEach(k => out[k] = [...new Set(out[k])].slice(0, 25));
  return out;
};
const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const report = [];
for (const theme of THEMES) for (const [w, h] of SIZES) {
  const touch = w < 1100 || h < 500;
  for (const [id, title, st, fn, o = {}] of SC) {
    if (ONLY.length && !ONLY.includes(id)) continue;
    const c = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, locale: LANG === 'fr' ? 'fr-FR' : 'en-GB', colorScheme: theme === 'dark' ? 'dark' : 'light' });
    await c.route(u => u.pathname === '/' || u.pathname.endsWith('/index.html'), async route => { const res = await route.fetch(); let html = process.env.NEWHTML ? fs.readFileSync(process.env.NEWHTML, 'utf8') : await res.text(); const end = html.lastIndexOf('})();\n</script>'); html = html.slice(0, end) + EXPOSE + html.slice(end); await route.fulfill({ response: res, body: html, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
    await c.route('https://ijdxeasxmgevuchyuenn.supabase.co/**', r => r.abort());
    if (st !== 'fresh') await c.addInitScript(([s]) => { if (!sessionStorage.getItem('seed')) { sessionStorage.setItem('seed', '1'); localStorage.setItem('memo-gammes-v1', s); } }, [JSON.stringify(STATES[st](theme))]);
    const p = await c.newPage(); const errs = [];
    p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 160)); });
    try {
      await p.goto(BASE + (o.q || '')); await W(1100);
      if (st !== 'fresh') { await p.keyboard.press('Escape'); await W(100); }
      await fn(p); await W(400);
      const m = await p.evaluate(MEASURE, touch);
      const file = `${id}-${w}x${h}${theme === 'dark' ? '-dark' : ''}${LANG !== 'fr' ? '-' + LANG : ''}.png`;
      await p.screenshot({ path: `${OUT}/${file}` });
      report.push({ id, title, w, h, theme, file, errs, ...m });
      console.log(`${id} ${w}x${h} ${theme} page=${m.page} main+${m.mainScroll} doc+${m.docScroll} x+${m.docScrollX} cut${m.cut.length} off${m.off.length} small${m.small.length} empty${m.empty.length} err${errs.length}`);
    } catch (e) { console.log('ERR', id, w, h, e.message.split('\n')[0]); report.push({ id, w, h, theme, fail: e.message.split('\n')[0] }); }
    await c.close();
  }
}
// back office (faux SDK)
if (!ONLY.length || ONLY.includes('admin')) for (const [w, h] of [[1440, 900], [1024, 768], [375, 667]]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 900 });
  await c.route('**/assets/js/supabase-*.js', r => r.fulfill({ status: 200, body: FAKE_ADMIN, headers: { 'content-type': 'application/javascript' } }));
  await c.route('https://ijdxeasxmgevuchyuenn.supabase.co/**', r => r.abort());
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(`window.__ADM=${JSON.stringify({ enrolled: true })};`);
  await p.goto(BASE + 'admin/'); await W(500);
  await p.screenshot({ path: `${OUT}/admin-login-${w}x${h}.png` });
  await p.fill('#lgEmail', 'antoine@example.com'); await p.fill('#lgPass', 'secret'); await p.click('#lgGo'); await W(300);
  if (await p.isVisible('#lgCode')) { await p.fill('#lgCode2', '123456'); await p.click('#lgCode button[type=submit]'); } await W(700);
  for (const k of ['dash', 'stats', 'users', 'content', 'notifs', 'leagues', 'support', 'system', 'pay']) {
    if (await p.isVisible('#menuBtn')) { await p.click('#menuBtn'); await W(250); }
    await p.click(`#navList [data-p="${k}"]`).catch(() => {}); await W(600);
    const m = await p.evaluate(() => ({ docScroll: document.documentElement.scrollHeight - innerHeight, docScrollX: document.documentElement.scrollWidth - innerWidth }));
    await p.screenshot({ path: `${OUT}/admin-${k}-${w}x${h}.png` });
    report.push({ id: 'admin-' + k, w, h, theme: 'light', file: `admin-${k}-${w}x${h}.png`, errs: [...errs], ...m, cut: [], off: [], small: [], empty: [] });
    console.log(`admin-${k} ${w}x${h} doc+${m.docScroll} x+${m.docScrollX} err${errs.length}`);
  }
  await c.close();
}
fs.writeFileSync(`${OUT}/report${ONLY.length ? '-' + ONLY.join('_') : ''}${process.env.THEME ? '-' + process.env.THEME : ''}${process.env.SIZES ? '-' + SIZES.map(s => s.join('x')).join('_') : ''}.json`, JSON.stringify(report, null, 1));
await b.close(); console.log('DONE', report.length);
