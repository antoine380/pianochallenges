// Export des écrans pour la page Figma « Revue des écrans » en calques modifiables (26/10/2026 ; écrans du 27/10 ajoutés en fin de section :
// Gammes une à une, mode PIANO, Ma route dans les jeux, série de 10 minutes).
// Reprend les états et les actions de tools/audit/capture_figma.mjs (mêmes sections, identifiants et titres) + les écrans ajoutés depuis
// (questionnaire « Onboarding 2 », catalogue de claviers #mkcModal, Ma famille #famBox, Rejoindre une famille #famJoin).
// Pour chaque écran et chaque taille : une capture PNG (référence) + l'arbre des calques en JSON (dom2json.js), images découpées incluses.
// Usage : PORT=8905 NODE_PATH=… PW_CHROMIUM=… OUT=/home/claude/figma-baseline node tools/figma/export_screens.mjs
//   ONLY=hub-cpt,ex (identifiants)  SEC=1,2 (sections)  SIZES=1024x768,390x844  NOPNG=1 (sans capture)
// Sortie : OUT/<section>/<id>/<w>x<h>.json et .png + OUT/manifest.json [{sec, secName, id, title, w, h, json, png, nodes, errs}].
import { createRequire } from 'module';
import fs from 'fs';
import { FAKE_ADMIN, FAKE_SDK, FAKE_FAM } from '../audit/fakesb.mjs';
import path from 'path';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = process.env.PORT || '8767', BASE = `http://localhost:${PORT}/`;
const OUT = process.env.OUT || '/home/claude/figma-baseline'; fs.mkdirSync(OUT, { recursive: true });
const D2J = fs.readFileSync(new globalThis.URL('./dom2json.js', import.meta.url), 'utf8');
const W = ms => new Promise(r => setTimeout(r, ms));
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean), SECS = (process.env.SEC || '').split(',').filter(Boolean).map(Number);
const SIZES = (process.env.SIZES || '1024x768,390x844').split(',').map(s => s.split('x').map(Number));
const LIB = fs.readFileSync(new globalThis.URL('../audit/lib.mjs', import.meta.url), 'utf8');
const INIT = mode => /export const INIT = `([\s\S]*?)`;\n/.exec(LIB)[1].split("${'${MODE}'}").join(mode);

// ---- états ----
const d = n => { const x = new Date(); x.setDate(x.getDate() - n); return x.toISOString().slice(0, 10); };
const intro = Object.fromEntries(['hub','learn','games','free','play','quiz','chords','scales','harmony','prog','ear','daily','practice','runner','speed','memory','douze','rank','account','settings','progress','notif','section','pp','acc'].map(k => [k, 1]));
const base = (theme, extra = {}) => ({ settings: { lang: 'fr', notation: 'fr', input: 'screen', earV2: true, diffV2: true, midiV2: true, uiSound: false, theme },
  langV2: true, gate: 'guest', onb: { done: 1, level: 'notes' }, tourDone: 1, pwShown: 1, introSeen: intro, seenTypes: [], stats: {}, secStats: {}, xp: 0, xpDays: {}, streak: { days: 0, last: '' },
  hints: { seen: { resume: 1, map: 1, inp: 1, star: 1, fing: 1, labels: 1, rotate: 1 } }, goal: { kind: 'min', v: 10, at: 1, asked: 1 }, midi: { later: Date.now() }, ...extra });
const rich = (theme, extra = {}) => { const xpDays = {}; for (let i = 0; i < 70; i++) if (i % 5 !== 3) xpDays[d(i)] = 30 + (i * 7) % 90;
  const ppd = {}; for (let i = 1; i <= 14; i++) ppd['p' + String(i).padStart(2, '0')] = { at: Date.now() - i * 864e5, stars: 1 + (i % 3), last: Date.now() - i * 864e5, err: i % 4, sec: 120, tries: 1 };
  const now = Date.now();
  return base(theme, { xp: 9400, xpDays, streak: { days: 23, last: d(0) }, profileName: 'Camille',
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
    dzRec: { maj: { ms: 104000, sp: [], at: now - 864e5 } }, acct: { n: 2, at: now - 864e5 }, ...extra }); };
const debut = theme => { const done = {}; for (let i = 1; i <= 4; i++) done['p0' + i] = { at: Date.now() - (5 - i) * 864e5, stars: 2 + (i % 2), last: Date.now() - (5 - i) * 864e5, err: 1, sec: 140, tries: 1 };
  return base(theme, { onb: { done: 1, level: 'debut' }, xp: 320, xpDays: { [d(0)]: 40, [d(1)]: 60, [d(2)]: 50 }, streak: { days: 3, last: d(0) }, pp: { v: 1, on: true, start: Date.now() - 5 * 864e5, done, cur: 'p05', fail: {} },
    resume: { kind: 'pp', id: 'p05', step: 1, at: Date.now() - 3600e3, v: 1, inp: 'screen', err: 0 } }); };
const U = id => ({ id, email: id + '@example.com', user_metadata: { full_name: id }, created_at: new Date(Date.now() - 90 * 864e5).toISOString() });
const famSrv = (members = [], extra = {}) => ({ names: { u1: ['Maman', 3], u2: ['Léo', 1], u3: ['Inès', 2], u4: ['Noé', 4], u5: ['Sam', 5] }, subs: { u1: { plan: 'family', status: 'active', until: Date.now() + 300 * 864e5, store: 'stripe', product: 'family_year' } }, fams: { fu1: { owner: 'u1', seats: 4, members } }, invites: {}, ...extra });
const FAM_OWNER = { user: U('u1'), srv: famSrv(['u2', 'u3']) };
const FAM_JOIN = { user: U('u5'), srv: famSrv(['u2'], { invites: { ABCD2345: { fam: 'fu1', exp: Date.now() + 6 * 864e5, used: null } } }) };
const STATES = { onbcpt: t => ({ settings: { lang: 'fr', notation: 'fr', theme: t, uiSound: false }, langV2: true, gate: 'account' }), famille: t => rich(t, { gate: 'account', netId: 'pabcd1234', settings: { ...base(t).settings, paywall: true } }), neuf: t => base(t, { onb: { done: 1, level: 'simple' } }), avance: t => rich(t), debut,
  compte: t => rich(t, { gate: 'account', netId: 'pabcd1234' }), midi: t => rich(t, { settings: { ...base(t).settings, input: 'midi' } }),
  // 27/10 : Gammes une à une (tutoriel déjà vu, sauf sc1tuto), série à 5 min (fiche Progression), mode PIANO en cascade
  sc1: t => rich(t, { settings: { ...base(t).settings, sc1Tour: 1, sc1Mode: 'notes' } }), sc1ch: t => rich(t, { settings: { ...base(t).settings, sc1Tour: 1, sc1Mode: 'chords' } }),
  sc1tuto: t => rich(t, { settings: { ...base(t).settings, sc1Mode: 'notes' } }),
  sr5: t => rich(t, { srFrom: d(20), playSec: Object.fromEntries([...Array(70).keys()].map(i => [d(i), i ? 900 : 300])), streak: { days: 23, last: d(1) } }),
  piano: t => base(t, { settings: { ...base(t).settings, piano: { ins: 'grand', viz: { grand: 'cascade' }, rev: 0.3, dly: 0.15, cho: 0.2, vol: 0.8 } } }) };
// ligue et classement (faux Supabase, comme r28_ligues.mjs)
const NAMES = ['Lucie_M', 'Malo.piano', 'Nora88', 'Camille', 'Inès', 'Gabin', 'Yanis_keys', 'Chloé', 'Hugo.R', 'Lina', 'Sacha', 'Mathis', 'Jade', 'Raphaël', 'Zoé.do', 'Louis', 'Emma_B', 'Noé', 'Alice', 'Timéo'];
const XP = [2480, 2310, 2150, 1960, 1890, 1720, 1600, 1510, 1420, 1380, 1260, 1190, 1100, 980, 920, 840, 610, 450, 300, 120];
const ends = new Date(Date.now() + 3 * 864e5 + 6 * 36e5 + 6e5).toISOString();
const FAKE = { user: { id: 'me', email: 'camille@example.com', user_metadata: { full_name: 'Camille' } },
  league: Array.from({ length: 20 }, (_, i) => ({ week: '2026-10-19', tier: 1, pos: i + 1, name: NAMES[i], avatar: i % 10, photo: null, level: 12 - (i >> 1), xp: XP[i], me: i === 3, ends_at: ends, closed: false })),
  leaderboard: Array.from({ length: 12 }, (_, i) => ({ id: 'w' + i, name: NAMES[i], avatar: i % 10, photo: null, level: 20 - i, streak: i, xp: 5000 - i * 300 })) };
// fichier MIDI d'exemple pour l'import (comme r32_import.mjs)
const vlq = n => { const b = [n & 0x7f]; while (n >>= 7) b.unshift((n & 0x7f) | 0x80); return b; };
const u32 = n => [24, 16, 8, 0].map(s => (n >>> s) & 255);
const trk = ev => { const dd = []; ev.forEach(e => dd.push(...e)); dd.push(0, 0xff, 0x2f, 0); return [0x4d, 0x54, 0x72, 0x6b, ...u32(dd.length), ...dd]; };
const smf = (type, tracks, div = 480) => Buffer.from([0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, type, 0, tracks.length, div >> 8, div & 255, ...tracks.flat()]);
const nm = s => [0, 0xff, 0x03, s.length, ...Buffer.from(s)];
function midi1() { const tempo = trk([[0, 0xff, 0x51, 3, 0x09, 0x27, 0xc0], [0, 0xff, 0x58, 4, 3, 2, 24, 8], nm('Conductor')]);
  const mel = [67, 72, 76, 74, 72, 71, 72], md = [3, 1, 1, 1, 2, 1, 3]; const a = [nm('Piano'), [0, 0xc0, 0]]; let first = true;
  mel.forEach((m, i) => { a.push([...vlq(0), ...(first ? [0x90] : []), m, 96]); first = false; a.push([...vlq(md[i] * 480), m, 0]); });
  const b = [nm('Basse'), [0, 0xc1, 33]]; [48, 43, 48, 43].forEach(m => { b.push([0, 0x91, m, 80], [...vlq(3 * 480), 0x81, m, 0]); });
  const dr = [nm('Batterie')]; for (let i = 0; i < 12; i++) dr.push([0, 0x99, 36, 100], [...vlq(480), 0x89, 36, 0]);
  return smf(1, [tempo, trk(a), trk(b), trk(dr)]); }

// ---- actions ----
const click = (p, s) => p.evaluate(s => { const e = document.querySelector(s); if (e) e.click(); return !!e; }, s);
const ev = (p, code) => p.evaluate(c => window.__ev(c), code);
const mode = (p, m) => click(p, `#modeNav [data-mode="${m}"]`);
const tileL = async (p, i) => { await mode(p, 'learn'); await W(350); await p.evaluate(i => document.querySelectorAll('#learnTiles .ptile')[i].click(), i); await W(600); };
const gameT = async (p, i) => { await mode(p, 'games'); await W(350); await p.evaluate(i => document.querySelectorAll('#gameCards .ptile')[i].click(), i); await W(700); };
const solo = async p => { await click(p, '#duModes [data-m=solo]'); await W(500); await p.keyboard.press('Space').catch(() => {}); await W(1800); };
const playRound = async p => { for (let k = 0; k < 40; k++) { const vis = await p.evaluate(() => { const e = document.getElementById('endModal'); return e && !e.hidden; }); if (vis) break;
  await ev(p, 'try{ const ms=revealMidis(); ms.forEach(m=>midiIn(m)); }catch(e){}'); await W(450); } await W(800); };
const frame = p => p.frames().find(f => /play\/index\.html/.test(f.url()));
const song = async p => { await mode(p, 'play'); await W(900); await click(p, '[data-song]'); await W(2400); };
const songGo = async p => { await song(p); const f = frame(p); if (f) { await f.evaluate(() => document.getElementById('go') && document.getElementById('go').click()); await W(3200); } };
const wizA = (p, a) => p.evaluate(a => { const e = document.querySelector('#mwiz [data-a="' + a + '"]'); if (e) e.click(); return !!e; }, a);
const hsMidi = async p => { await click(p, '#homeLink'); await W(300); await click(p, '#hsMidiBtn'); await W(400); };
const mkWiz = async p => { await click(p, '#setBtn'); await W(400); await p.evaluate(() => document.querySelector('#mkCard [data-a=wiz]').click()); await W(400); };
const qzPlay = async p => { await mode(p, 'quiz'); await W(400); await click(p, '#qzGo'); await W(3500); };
const fnD3 = async p => { await p.evaluate(() => { const b = document.querySelectorAll('.fn-hwc'); (b[2] || b[0]) && (b[2] || b[0]).click(); }); await W(600); };
// Réglages : onglet, ou sur téléphone (pas d'onglets, tout à la suite) défilement jusqu'à la section
const setT = async (p, v) => { await click(p, '#setBtn'); await W(500); await click(p, `#setNav [data-v=${v}]`); await W(300);
  await p.evaluate(v => { const n = document.getElementById('setNav'); if (n && getComputedStyle(n).display === 'none') { const s = document.querySelector(`.set-sec[data-tab=${v}]`); s && s.scrollIntoView({ block: 'start' }); } }, v); await W(400); };
// Gammes une à une : étoiles posées (une coupe sur la ligne Do), puis la liste (LEARN › 8e tuile)
const SC1_STARS = { notes: [[0, 'major', 3], [0, 'minor', 3], [0, 'harm', 3], [0, 'mel', 3], [2, 'major', 3], [2, 'minor', 2], [2, 'harm', 1], [4, 'major', 2], [5, 'major', 3], [5, 'minor', 1], [7, 'major', 3], [7, 'minor', 3], [7, 'harm', 2], [7, 'mel', 1], [9, 'minor', 3]],
  chords: [[0, 'major', 3], [0, 'minor', 2], [7, 'major', 1]] };
const sc1List = async p => { await ev(p, `S.scStars={notes:{},chords:{}}; Object.entries(${JSON.stringify(SC1_STARS)}).forEach(([m,L])=>L.forEach(([pc,tid,n])=>S.scStars[m][sc1Key(tid,sc1K(tid,pc))]=n)); save()`);
  await mode(p, 'learn'); await W(400); await click(p, '#learnTiles .sc1-tile'); await W(900); };
const sc1Go = async (p, md, k = 'C', tid = 'major') => { await sc1List(p); await ev(p, `sc1Play(${JSON.stringify(tid)},${JSON.stringify(k)},"notes",${JSON.stringify(md)})`); await W(700); };
const notes = async (p, ms, w = 320) => { for (const m of ms) { await ev(p, `midiIn(${m})`); await W(w); } };
const C_MAJ = [60, 62, 64, 65, 67, 69, 71, 72], E_MAJ = [64, 66, 68, 69, 71, 73, 75, 76];
const rtRun = async (p, left) => { await ev(p, 'rtLaunch(RT_STAGES.flat().find(q=>q.s.g==="runner"))'); await W(700); await ev(p, 'rnGo()'); await W(400);
  await ev(p, `RN.cleared=RT_STAGES.flat().find(q=>q.s.g==="runner").s.goal-${left}`); await W(left ? 700 : 1100); };
const pnPlay = async p => { await mode(p, 'piano'); await W(1200); for (const m of [48, 55, 60, 64, 67, 72, 76, 79, 64, 67]) { await ev(p, `pnOn(${m},96,"screen")`); await W(110); } await W(450); };
const hubRank = async p => { await click(p, '#homeLink'); await W(600); await ev(p, 'hsRankAt=0; renderHubRank()'); await W(1200); };

// [section, id, titre, état, action, options] ; état fresh = premier lancement sans données
// options : motion (animations réelles), midi (faux Web MIDI : ok | none), empty (aucun clavier branché), ios (agent iPad), gum (micro simulé), q (paramètres d'URL), fake (faux Supabase avec compte), dark (aussi en sombre)
const SC = [
  [1, 'd2', 'D2 · Avec quoi vas-tu jouer ?', 'fresh', async p => {}],
  [1, 'd3', 'D3 · Joue un Do (écran)', 'fresh', fnD3],
  [1, 'd3-midi', 'D3 · Joue un Do (clavier détecté)', 'fresh', async p => {}, { midi: 'ok' }],
  [1, 'd4', 'D4 · Ton niveau (après la première note)', 'fresh', async p => { await fnD3(p); await ev(p, 'fnNote(60)'); await W(900); }],
  [1, 'oq-why', 'Questionnaire · ton objectif (2 sur 4)', 'fresh', async p => { await fnD3(p); await ev(p, 'fnNote(60)'); await W(900); await click(p, '.fn-lv4 [data-v=debut]'); await W(600); }],
  [1, 'oq-staff', 'Questionnaire · lire les notes (3 sur 4)', 'fresh', async p => { await fnD3(p); await ev(p, 'fnNote(60)'); await W(900); await click(p, '.fn-lv4 [data-v=debut]'); await W(500); await click(p, '.oq-opt[data-v=songs]'); await W(700); }],
  [1, 'oq-time', 'Questionnaire · temps par jour (4 sur 4)', 'fresh', async p => { await fnD3(p); await ev(p, 'fnNote(60)'); await W(900); await click(p, '.fn-lv4 [data-v=debut]'); await W(500); await click(p, '.oq-opt[data-v=songs]'); await W(600); await click(p, '.oq-opt[data-v=learn]'); await W(700); }],
  [1, 'oq-prog', 'Questionnaire · ton programme', 'fresh', async p => { await fnD3(p); await ev(p, 'fnNote(60)'); await W(900); await click(p, '.fn-lv4 [data-v=debut]'); await W(500); await click(p, '.oq-opt[data-v=songs]'); await W(600); await click(p, '.oq-opt[data-v=learn]'); await W(600); await click(p, '.oq-opt[data-v="10"]'); await W(800); }],
  [1, 'oq-cpt', 'Questionnaire après « Se connecter » (compte)', 'onbcpt', async p => {}],
  [1, 'gate', 'Connexion', 'neuf', async p => { await ev(p, 'authOpen("login")'); await W(600); }],
  [1, 'gate-signup', 'Connexion · créer un compte', 'neuf', async p => { await ev(p, 'authOpen("signup")'); await W(600); }],
  [1, 'm4', 'M4 · Assistant MIDI : ton instrument', 'neuf', hsMidi, { midi: 'ok', empty: 1, nat: 1 }],
  [1, 'm5', 'M5 · Assistant MIDI : la connexion', 'neuf', async p => { await hsMidi(p); await wizA(p, 'hw:midi'); await W(100); await wizA(p, 'conn:usb'); await W(300); }, { midi: 'ok', empty: 1, nat: 1 }],
  [1, 'm6', 'M6 · Assistant MIDI : brancher (iPad, USB-C)', 'neuf', async p => { await hsMidi(p); for (const a of ['hw:midi', 'conn:usb', 'port:usbc', 'next']) { await wizA(p, a); await W(120); } await W(300); }, { midi: 'ok', empty: 1, ios: 1 }],
  [1, 'm7', 'M7 · Assistant MIDI : Bluetooth', 'neuf', async p => { await hsMidi(p); for (const a of ['hw:digital', 'conn:bt', 'next']) { await wizA(p, a); await W(120); } await W(300); }, { midi: 'ok', empty: 1, ios: 1 }],
  [1, 'm8', 'M8 · Assistant MIDI : test du toucher', 'midi', async p => { await mkWiz(p); await wizA(p, 'totest'); await W(200); await p.evaluate(() => { window.__midi.noteOn(64, 30); window.__midi.noteOn(67, 112); }); await W(150); await wizA(p, 'tw:no'); await W(300); }, { midi: 'ok', nat: 1 }],
  [1, 'm9', 'M9 · Assistant MIDI : étendue du clavier', 'midi', async p => { await mkWiz(p); await wizA(p, 'totest'); await W(200); await p.evaluate(() => window.__midi.noteOn(60, 90)); await W(100); await wizA(p, 'range'); await W(150); await wizA(p, 'rmeasure'); await p.evaluate(() => { window.__midi.noteOn(36); window.__midi.noteOn(84); }); await W(300); }, { midi: 'ok', nat: 1 }],
  [1, 'm10', 'M10 · Assistant MIDI : clavier prêt', 'midi', async p => { await mkWiz(p); await wizA(p, 'totest'); await W(200); await p.evaluate(() => { window.__midi.noteOn(60, 20); window.__midi.noteOn(64, 110); window.__midi.send(0, [0xB0, 64, 127]); }); await W(100); await wizA(p, 'tw:yes'); await wizA(p, 'range'); await W(150); await wizA(p, 'rmeasure'); await p.evaluate(() => { window.__midi.noteOn(36); window.__midi.noteOn(84); }); await W(100); await wizA(p, 'rok'); await W(300); }, { midi: 'ok', nat: 1 }],
  [1, 'm11', 'M11 · Assistant MIDI : dépannage', 'neuf', async p => { await hsMidi(p); for (const a of ['hw:midi', 'conn:usb', 'port:light', 'next']) { await wizA(p, a); await W(120); } await wizA(p, 'trouble'); await W(120); await wizA(p, 'fix:2'); await W(300); }, { midi: 'ok', empty: 1, ios: 1 }],
  [1, 'm12', 'M12 · Navigateur sans MIDI', 'neuf', hsMidi, { midi: 'none' }],
  [1, 'mkc', 'Choisis ton clavier (catalogue #mkcModal)', 'midi', async p => { await ev(p, 'mkcOpen({mode:"pick"})'); await W(1500); }, { midi: 'ok' }],
  [2, 'hub-neuf', 'Accueil · invité neuf', 'neuf', async p => { await click(p, '#homeLink'); await W(600); }],
  [2, 'hub-debut', 'Accueil · Reprendre la leçon (débutant)', 'debut', async p => { await click(p, '#homeLink'); await W(700); }],
  [2, 'hub-av', 'Accueil · Ma route, Pour toi, invitation (invité avancé)', 'avance', async p => { await click(p, '#homeLink'); await W(700); }],
  [2, 'hub-cpt', 'Accueil · compte, ligue de la semaine', 'compte', hubRank, { fake: 1, dark: 1 }],
  [2, 'hub-midi', 'Accueil · carte clavier branché', 'midi', async p => { await click(p, '#homeLink'); await W(900); }, { midi: 'ok' }],
  [3, 'learn', 'LEARN · tuiles (neuf)', 'neuf', async p => { await mode(p, 'learn'); await W(500); }],
  [3, 'learn-route', 'LEARN · Ma route', 'avance', async p => { await mode(p, 'learn'); await W(600); }],
  [3, 'setup', 'Écran de départ · Accords', 'neuf', async p => { await tileL(p, 0); }],
  [3, 'setup-sc', 'Écran de départ · Gammes', 'neuf', async p => { await tileL(p, 1); }],
  [3, 'ex', 'Exercice · Accords', 'neuf', async p => { await tileL(p, 0); await click(p, '#suGo'); await W(800); }],
  [3, 'ex-sc', 'Exercice · Gammes', 'neuf', async p => { await tileL(p, 1); await click(p, '#suGo'); await W(800); }],
  [3, 'end', 'Fin de partie', 'neuf', async p => { await tileL(p, 0); await click(p, '#suGo'); await W(800); await playRound(p); }],
  [3, 'daily', 'Entraînement du jour', 'avance', async p => { await click(p, '#homeLink'); await W(300); await click(p, '#dailyCard'); await W(900); }],
  [3, 'acc', 'Accompagnement · départ', 'neuf', async p => { await tileL(p, 5); await W(300); }],
  [3, 'acc-play', 'Accompagnement · partie', 'neuf', async p => { await tileL(p, 5); await ev(p, 'accStart()'); await W(1400); }],
  [3, 'rt-win', 'Ma route · étape réussie', 'avance', async p => { await mode(p, 'learn'); await W(400); await ev(p, 'rtWinOpen(0)'); await W(800); }],
  [3, 'sc1-list', 'Gammes une à une · liste en notes (étoiles, une coupe)', 'sc1', sc1List],
  [3, 'sc1-chords', 'Gammes une à une · liste en accords', 'sc1ch', sc1List],
  [3, 'sc1-tuto', 'Gammes une à une · tutoriel (1re bulle)', 'sc1tuto', async p => { await sc1List(p); await W(600); }],
  [3, 'sc1-pick', 'Gammes une à une · choix Entraînement / Évaluation', 'sc1', async p => { await sc1List(p); await ev(p, 'sc1Ask("minor",sc1K("minor",2))'); await W(700); }],
  [3, 'sc1-demo', 'Gammes une à une · entraînement, démonstration (doigtés)', 'sc1', async p => { await sc1Go(p, 'train'); await W(1500); }],
  [3, 'sc1-turn', 'Gammes une à une · entraînement, « À toi » guidé', 'sc1', async p => { await sc1Go(p, 'train'); await ev(p, 'sc1Turn()'); await W(500); await notes(p, C_MAJ.slice(0, 3)); }],
  [3, 'sc1-well', 'Gammes une à une · fin d’entraînement « Bien joué ! »', 'sc1', async p => { await sc1Go(p, 'train'); await ev(p, 'sc1Turn()'); await W(500); await notes(p, C_MAJ); await W(900); }],
  [3, 'sc1-eval', 'Gammes une à une · évaluation en cours (sans aide)', 'sc1', async p => { await sc1Go(p, 'eval', 'E'); await notes(p, E_MAJ.slice(0, 3)); }],
  [3, 'sc1-end3', 'Gammes une à une · fin à 3 étoiles, « Jouer en accords »', 'sc1', async p => { await sc1Go(p, 'eval', 'E'); await notes(p, E_MAJ); await W(1800); }],
  [3, 'sc1-rv', 'Gammes une à une · fenêtre Révision', 'sc1', async p => { await sc1List(p); await ev(p, 'sc1RvOpen()'); await W(700); }],
  [3, 'sc1-leave', 'Gammes une à une · « Terminer la partie ? »', 'sc1', async p => { await sc1Go(p, 'eval'); await notes(p, [60]); await click(p, '#gameEnd'); await W(700); }],
  [4, 'd6', 'D6 · Le parcours Premiers pas', 'debut', async p => { await ev(p, 'ppBegin()'); await W(900); }],
  [4, 'd9', 'D9 · Ouverture de la leçon', 'debut', async p => { await ev(p, 'ppOpen("p05")'); await W(900); }],
  [4, 'pp-watch', 'Leçon · Regarde', 'neuf', async p => { await ev(p, 'ppStart("p01",0)'); await W(1500); }],
  [4, 'pp-turn', 'Leçon · À toi', 'neuf', async p => { await ev(p, 'ppStart("p01",1)'); await W(1200); }],
  [4, 'pp-bravo', 'Leçon · Bravo', 'neuf', async p => { await ev(p, 'ppStart("p01",1)'); await W(800); await ev(p, 'ppFinish()'); await W(1400); }],
  [4, 'p09', 'P09 · La pulsation', 'debut', async p => { await ev(p, 'ppStart("p09",1)'); await W(1600); }],
  [4, 'p10', 'P10 · Premiers accords', 'debut', async p => { await ev(p, 'ppStart("p10",1)'); await W(1400); }],
  [4, 'p13', 'P13 · Les deux mains', 'debut', async p => { await ev(p, 'ppStart("p13",1)'); await W(1400); }],
  [4, 'cert', 'Certificat Premiers pas', 'avance', async p => { await ev(p, 'openPage("pp"); PP.view="cert"; ppRender()'); await W(1000); }],
  [4, 'place', 'Test de placement · accueil', 'neuf', async p => { await ev(p, 'plOpen()'); await W(800); }],
  [4, 'place-q', 'Test de placement · question', 'neuf', async p => { await ev(p, 'plOpen()'); await W(500); await ev(p, 'plStart()'); await W(1000); }],
  [4, 'mic', 'D28 · Préparer le micro', 'neuf', async p => { await ev(p, 'mpOpen()'); await W(1500); }, { gum: 1 }],
  [5, 'games', 'GAMES · tuiles', 'avance', async p => { await mode(p, 'games'); await W(600); }],
  [5, 'lobby', 'Salon des duels', 'avance', async p => { await gameT(p, 0); }],
  [5, 'lobby-bots', 'Duel · choisir un bot', 'avance', async p => { await gameT(p, 0); await click(p, '#duModes [data-m=bots]'); await W(600); }],
  [5, 'runner', 'Saute-notes · partie', 'neuf', async p => { await gameT(p, 0); await solo(p); }],
  [5, 'speed', 'Contre la montre · partie', 'neuf', async p => { await gameT(p, 1); await solo(p); }],
  [5, 'memory', 'Mémoire musicale · partie', 'neuf', async p => { await gameT(p, 2); await solo(p); }],
  [5, 'douze', 'Les Douze · salon', 'avance', async p => { await gameT(p, 3); await W(300); }],
  [5, 'douze-play', 'Les Douze · partie', 'neuf', async p => { await gameT(p, 3); await solo(p); }],
  [5, 'du-res', 'Résultat de duel (contre un bot)', 'avance', async p => { await gameT(p, 0); await ev(p, 'duStartBot(3)'); await W(4500); await ev(p, 'DU.me.score=420; DU.opp.score=310; duFinish(1)'); await W(1200); }],
  [5, 'rt-runner', 'Ma route · Saute-notes, « Objectif n / N »', 'avance', async p => { await rtRun(p, 3); }],
  [5, 'rt-runner-win', 'Ma route · Saute-notes, « Objectif atteint ! »', 'avance', async p => { await rtRun(p, 0); }],
  [6, 'quiz', 'QUIZ · réglages', 'neuf', async p => { await mode(p, 'quiz'); await W(600); }, { set: { quiz: { bots: 2, botLvl: 2 } } }],
  [6, 'quiz-q', 'QUIZ · question', 'neuf', qzPlay, { set: { quiz: { bots: 2, botLvl: 2 } } }],
  [6, 'quiz-rev', 'QUIZ · révélation', 'neuf', async p => { await qzPlay(p); await ev(p, 'qzReveal()'); await W(900); }, { set: { quiz: { bots: 2, botLvl: 2 } } }],
  [6, 'quiz-end', 'QUIZ · podium', 'neuf', async p => { await qzPlay(p); await ev(p, 'QZ.players.forEach((x,i)=>{x.score=900-i*230; x.ok=6-i;}); qzFinish()'); await W(1400); }, { set: { quiz: { bots: 2, botLvl: 2 } } }],
  [7, 'free', 'PLAY · catalogue', 'avance', async p => { await mode(p, 'play'); await W(1000); }],
  [7, 'free-lib', 'PLAY · Bibliothèque', 'neuf', async p => { await mode(p, 'play'); await W(700); await click(p, '#pcLib'); await W(1300); }],
  [7, 'free-mine', 'PLAY · Mes morceaux (vide)', 'neuf', async p => { await mode(p, 'play'); await W(700); await click(p, '#pcMine'); await W(800); }],
  [7, 'free-help', 'PLAY · tuto import', 'neuf', async p => { await mode(p, 'play'); await W(700); await ev(p, 'impHelp()'); await W(800); }],
  [7, 'imp', 'PLAY · import d’un fichier MIDI', 'neuf', async p => { await mode(p, 'play'); await W(700); await click(p, '#pcMine'); await W(700);
    const [ch] = await Promise.all([p.waitForEvent('filechooser'), click(p, '#impAdd')]); await ch.setFiles({ name: 'Ma_valse.mid', mimeType: 'application/octet-stream', buffer: midi1() }); await W(1200); }],
  [7, 'grille', 'PLAY · grille d’accords', 'neuf', async p => { await mode(p, 'play'); await W(900); await click(p, '.gr-tile'); await W(900); }],
  [7, 'player', 'Lecteur · accueil du morceau', 'neuf', song],
  [7, 'cascade', 'Lecteur · cascade', 'neuf', songGo],
  [7, 'sheet', 'Lecteur · partition', 'neuf', songGo, { set: { staff: true }, sheet: 1 }],
  [7, 'free-kb', 'PLAY · piano libre', 'neuf', async p => { await mode(p, 'play'); await W(700); await click(p, '#pcFree'); await W(700); }],
  [7, 'piano', 'Mode PIANO · ambiance Cascade (notes simulées)', 'piano', pnPlay, { motion: 1 }],
  [7, 'piano-fx', 'Mode PIANO · Effets', 'piano', async p => { await pnPlay(p); await click(p, '#pnFxBtn'); await W(500); }, { motion: 1 }],
  [8, 'prog', 'Progression · vue d’ensemble', 'avance', async p => { await click(p, '#lvlAv'); await W(800); }],
  [8, 'prog-det', 'Progression · détail', 'avance', async p => { await click(p, '#lvlAv'); await W(500); await click(p, '#pfNav [data-v=det]'); await W(500); }],
  [8, 'prog-suc', 'Progression · Succès', 'avance', async p => { await click(p, '#lvlAv'); await W(500); await click(p, '#pfNav [data-v=suc]'); await W(600); }],
  [8, 'prog-neuf', 'Progression · joueur neuf', 'neuf', async p => { await click(p, '#lvlAv'); await W(800); }],
  [9, 'rank-lg', 'Classement · ligue de la semaine (compte)', 'compte', async p => { await click(p, '#rankBtn'); await W(1500); }, { fake: 1 }],
  [9, 'rank-wk', 'Classement · cette semaine (compte)', 'compte', async p => { await click(p, '#rankBtn'); await W(1200); await p.evaluate(() => { const b = [...document.querySelectorAll('#rankPer button')].find(x => x.id !== 'rankLg' && /Semaine/.test(x.textContent)); b && b.click(); }); await W(1000); }, { fake: 1 }],
  [9, 'rank-inv', 'Classement · invité', 'neuf', async p => { await click(p, '#rankBtn'); await W(1500); }],
  [9, 'notif', 'Notifications', 'avance', async p => { await click(p, '#ntfBtn'); await W(700); }],
  [9, 'notif-vide', 'Notifications · vide', 'neuf', async p => { await ev(p, 'S.notifs={list:[],keys:{},nv2:1,init:1}; save()'); await click(p, '#ntfBtn'); await W(700); }],
  [10, 'set-inter', 'Réglages · Interaction', 'avance', p => setT(p, 'inter')],
  [10, 'set-game', 'Réglages · Jeu', 'avance', p => setT(p, 'game')],
  [10, 'set-ntf', 'Réglages · Notifications', 'avance', p => setT(p, 'ntf')],
  [10, 'set-prem', 'Réglages · Abonnement', 'avance', p => setT(p, 'prem')],
  [10, 'set-app', 'Réglages · Application', 'avance', p => setT(p, 'app')],
  [10, 'set-fam', 'Réglages · Abonnement · Ma famille (titulaire)', 'famille', async p => { await setT(p, 'prem'); await W(800); await click(p, '#famInv'); await W(700); await p.evaluate(() => { const b = document.getElementById('famBox'); const n = document.getElementById('setNav'); if (b && n && getComputedStyle(n).display === 'none') b.scrollIntoView({ block: 'start' }); }); await W(400); }, { famFake: FAM_OWNER }],
  [11, 'm-goal', 'Objectif du jour', 'neuf', async p => { await ev(p, 'goalOpen()'); await W(700); }],
  [11, 'm-acct', 'Garde tes progrès', 'avance', async p => { await ev(p, 'acctOpen()'); await W(700); }],
  [11, 'm-week', 'Bilan de la semaine', 'avance', async p => { await ev(p, 'wkOpen()'); await W(800); }],
  [11, 'm-leave', 'Quitter la partie ?', 'neuf', async p => { await tileL(p, 0); await click(p, '#suGo'); await W(700); await ev(p, 'midiIn(60)'); await W(400); await click(p, '#homeLink'); await W(700); }],
  [11, 'm-lost', 'Clavier déconnecté', 'midi', async p => { await click(p, '#homeLink'); await W(500); await ev(p, 'mdLostRender(); openMod("mdLost")'); await W(600); }, { midi: 'ok' }],
  [11, 'm-inv', 'Invite tes amis', 'avance', async p => { await ev(p, 'invOpen()'); await W(600); }],
  [11, 'm-famjoin', 'Rejoindre la famille (#famJoin)', 'famille', async p => { await W(1800); }, { famFake: FAM_JOIN, q: '?fam=abcd2345' }],
  [11, 'm-pw', 'Paywall (aperçu ?paywall=1)', 'neuf', async p => { await ev(p, 'pwOpen("menu")'); await W(1000); }, { q: '?paywall=1' }],
  [11, 'sr-cel', 'Série validée (animation plein écran, fin)', 'avance', async p => { await click(p, '#homeLink'); await W(400); await ev(p, 'srShow()'); await W(1500); }],
  [11, 'prog-sr', 'Fiche Progression · série à 5 min (#pfSr)', 'sr5', async p => { await click(p, '#lvlAv'); await W(900); await ev(p, `(()=>{ const c=document.querySelector('.pf-streak'); if(c && innerWidth<600) c.scrollIntoView({inline:'start',block:'nearest'}); })()`); await W(600); }],
];
const EXPOSE = '\nwindow.__ev = function(c){ return eval(c); };\n';
const SECNAMES = { 1: '1 Premier lancement et connexion', 2: '2 Accueil', 3: '3 LEARN', 4: '4 Premiers pas', 5: '5 GAMES', 6: '6 QUIZ', 7: '7 PLAY', 8: '8 Progression', 9: '9 Classement, ligues et notifications', 10: '10 Réglages', 11: '11 Fenêtres', 12: '12 Back office /admin' };
const b = await chromium.launch({ ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
const MANF = `${OUT}/manifest.json`;
const man = fs.existsSync(MANF) ? JSON.parse(fs.readFileSync(MANF, 'utf8')) : [];
const put = e => { const k = man.findIndex(m => m.id === e.id && m.w === e.w && m.h === e.h); if (k >= 0) man[k] = e; else man.push(e); };
const DPR = +(process.env.DPR || 2);
// export d'un écran déjà affiché : JSON des calques (+ images découpées) et capture
async function exportPage(p, sec, id, title, w, h, errs) {
  const dir = `${OUT}/${String(sec).padStart(2, '0')}/${id}`; fs.mkdirSync(dir, { recursive: true });
  await p.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  await p.evaluate(D2J); for (const f of p.frames()) if (f !== p.mainFrame()) await f.evaluate(D2J).catch(() => {});
  const out = await p.evaluate(([w, h, n]) => window.__dom2json({ w, h, name: n }), [w, h, `${id} · ${w}×${h}`]);
  const img = {};
  for (const r of out.rasters) {
    let d = await p.evaluate(id => window.__d2jRaster(id), r.id).catch(() => null);
    if (!d) { const c = { x: Math.max(0, r.rect.x), y: Math.max(0, r.rect.y) }; c.width = Math.min(w, r.rect.x + r.rect.w) - c.x; c.height = Math.min(h, r.rect.y + r.rect.h) - c.y;
      if (c.width >= 1 && c.height >= 1) { const buf = await p.screenshot({ clip: c, type: 'png' }).catch(() => null); if (buf) d = 'data:image/png;base64,' + buf.toString('base64'); r.crop = [c.x - r.rect.x, c.y - r.rect.y, c.width, c.height]; } }
    if (d) img[r.id] = d.replace(/^data:image\/png;base64,/, '');
  }
  const doc = { v: 1, sec, secName: SECNAMES[sec], id, title, w, h, at: new Date().toISOString(), root: out.root, rasters: out.rasters, img };
  fs.writeFileSync(`${dir}/${w}x${h}.json`, JSON.stringify(doc));
  if (!process.env.NOPNG) await p.screenshot({ path: `${dir}/${w}x${h}.png` });
  const e = { sec, secName: SECNAMES[sec], id, title, w, h, json: path.relative(OUT, `${dir}/${w}x${h}.json`), png: path.relative(OUT, `${dir}/${w}x${h}.png`), nodes: out.count, rasters: out.rasters.length, kb: Math.round(fs.statSync(`${dir}/${w}x${h}.json`).size / 1024), errs };
  put(e); return e;
}
async function shot(sec, id, title, st, fn, o, w, h, theme) {
  const touch = w < 1100 || h < 500;
  const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: DPR, hasTouch: touch, locale: 'fr-FR', colorScheme: theme, reducedMotion: o.motion ? 'no-preference' : 'reduce',
    userAgent: o.ios ? 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148' : undefined, permissions: o.gum ? ['microphone'] : [] });
  await c.route(u => u.pathname === '/' || u.pathname.endsWith('/index.html') && !u.pathname.includes('/play/') && !u.pathname.includes('/admin/'), async route => { const res = await route.fetch(); let html = await res.text(); const end = html.lastIndexOf('})();\n</script>'); html = html.slice(0, end) + EXPOSE + html.slice(end); await route.fulfill({ response: res, body: html, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await c.route('https://ijdxeasxmgevuchyuenn.supabase.co/**', r => r.abort());
  if (o.fake) await c.route('**/assets/js/supabase-*.js', r => r.fulfill({ status: 200, body: FAKE_SDK, headers: { 'content-type': 'application/javascript' } }));
  if (o.famFake) await c.route('**/assets/js/supabase-*.js', r => r.fulfill({ status: 200, body: FAKE_FAM, headers: { 'content-type': 'application/javascript' } }));
  if (o.ios || (o.nat && w < 900 && h < 900)) await c.addInitScript(`new MutationObserver((m,ob)=>{ if(document.documentElement){ document.documentElement.classList.add('native'); ob.disconnect(); } }).observe(document,{childList:true}); window.__nativeMidi={start:async()=>({inputs:[]}),listInputs:async()=>({inputs:[]}),showBluetooth:async()=>{}};`);
  if (o.midi) await c.addInitScript(INIT(o.midi));
  if (o.empty) await c.addInitScript(`(()=>{ const M=window.__midi; if(!M) return; M.access.inputs.clear(); M.ports[0].state='disconnected'; })();`);
  if (o.fake) await c.addInitScript(`window.__FAKE=${JSON.stringify(FAKE)};`);
  if (o.famFake) await c.addInitScript(`window.__FAKE=${JSON.stringify(o.famFake)};`);
  if (o.sheet) await c.addInitScript(`try{ if(location.pathname.includes('/play/')) localStorage.setItem('clavio:sheet','1'); }catch(e){}`);
  if (st !== 'fresh') { const S = STATES[st](theme); if (o.set) Object.assign(S.settings, o.set);
    await c.addInitScript(([s, tok]) => { if (location.pathname.includes('/play/')) return; if (!sessionStorage.getItem('seed')) { sessionStorage.setItem('seed', '1'); localStorage.setItem('memo-gammes-v1', s); if (tok) localStorage.setItem('sb-x-auth-token', '1'); } }, [JSON.stringify(S), !!(o.fake || o.famFake)]); }
  const p = await c.newPage(); const errs = [];
  p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 160)); });
  try {
    await p.goto(BASE + (o.q || '')); await W(o.fake || o.famFake ? 2600 : 1200);
    if (st !== 'fresh' && st !== 'onbcpt' && !o.q?.includes('fam=')) { await p.keyboard.press('Escape'); await W(100); }
    await fn(p); await W(500);
    if (o.sheet) { const f = frame(p); if (f) { await f.evaluate(() => { const t = document.getElementById('tSheet'); if (t && !/on|active/.test(t.className) && t.getAttribute('aria-pressed') !== 'true') t.click(); }); await W(1500); } }
    const e = await exportPage(p, sec, id, title, w, h, errs);
    console.log(`${sec} ${id} ${w}x${h} ${theme} page=${await p.evaluate(() => document.body.dataset.page + (document.body.classList.contains('guest') ? '/invité' : '/compte'))} nodes=${e.nodes} img=${e.rasters} ${e.kb}Ko err${errs.length}${errs.length ? ' ' + errs[0] : ''}`);
  } catch (e) { console.log('ERR', id, w, h, e.message.slice(0, 900)); put({ sec, id, title, w, h, theme, fail: e.message.split('\n')[0] }); }
  await c.close();
}
for (const [sec, id, title, st, fn, o = {}] of SC) {
  if (ONLY.length && !ONLY.includes(id) && !ONLY.includes(id + '-sombre')) continue; if (SECS.length && !SECS.includes(sec)) continue;
  for (const [w, h] of SIZES) { if (!ONLY.length || ONLY.includes(id)) await shot(sec, id, title, st, fn, o, w, h, 'light'); if (o.dark && (!ONLY.length || ONLY.includes(id + '-sombre'))) await shot(sec, id + '-sombre', title + ' (sombre)', st, fn, o, w, h, 'dark'); }
  fs.writeFileSync(MANF, JSON.stringify(man, null, 1));
}
// 12 · back office (faux SDK admin)
const ADM = [['login', 'Connexion'], ['dash', 'Tableau de bord'], ['stats', 'Statistiques'], ['users', 'Joueurs'], ['content', 'Contenu et réglages'], ['notifs', 'Notifications'], ['leagues', 'Ligues et duels'], ['support', 'Support'], ['system', 'Système'], ['pay', 'Paiements']];
const admOnly = ONLY.filter(x => x.startsWith('admin'));
if ((!ONLY.length || admOnly.length) && (!SECS.length || SECS.includes(12))) for (const [w, h] of SIZES) {
  const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: DPR, hasTouch: w < 900, locale: 'fr-FR', colorScheme: 'light', reducedMotion: 'reduce' });
  await c.route('**/assets/js/supabase-*.js', r => r.fulfill({ status: 200, body: FAKE_ADMIN, headers: { 'content-type': 'application/javascript' } }));
  await c.route('https://ijdxeasxmgevuchyuenn.supabase.co/**', r => r.abort());
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 160)); });
  await p.addInitScript(`window.__ADM=${JSON.stringify({ enrolled: true, leagues: true })};`);
  await p.goto(BASE + 'admin/'); await W(800);
  const want = k => !admOnly.length || admOnly.includes('admin') || admOnly.includes('admin-' + k);
  if (want('login')) { const e = await exportPage(p, 12, 'admin-login', 'Connexion', w, h, [...errs]); console.log(`12 admin-login ${w}x${h} nodes=${e.nodes}`); }
  await p.fill('#lgEmail', 'antoine@example.com'); await p.fill('#lgPass', 'secret'); await p.click('#lgGo'); await W(400);
  if (await p.isVisible('#lgCode')) { await p.fill('#lgCode2', '123456'); await p.click('#lgCode button[type=submit]'); } await W(900);
  for (const [k, t] of ADM.slice(1)) {
    if (!want(k)) continue;
    if (await p.isVisible('#menuBtn')) { await p.click('#menuBtn'); await W(250); }
    await p.click(`#navList [data-p="${k}"]`).catch(() => {}); await W(800);
    if (await p.isVisible('#menuBtn') && await p.evaluate(() => document.body.classList.contains('nav-open'))) { await p.click('#menuBtn').catch(() => {}); await W(250); }
    const e = await exportPage(p, 12, 'admin-' + k, t, w, h, [...errs]); console.log(`12 admin-${k} ${w}x${h} nodes=${e.nodes} ${e.kb}Ko`);
  }
  await c.close();
}
// ordre des écrans (celui de SC, puis le back office)
const ORDER = [...SC.flatMap(([, id, , , , o = {}]) => o.dark ? [id, id + '-sombre'] : [id]), ...ADM.map(a => 'admin-' + a[0])];
man.sort((a, b) => a.sec - b.sec || ORDER.indexOf(a.id) - ORDER.indexOf(b.id) || b.w - a.w);
fs.writeFileSync(MANF, JSON.stringify(man, null, 1));
await b.close(); console.log('DONE', man.length, 'errors:', man.filter(m => m.fail || (m.errs && m.errs.length)).length);
