// Songs (C6) and chord grids (L11), Oct 2026.
// 1. The catalogue itself (assets/js/songs-data.js, no browser): ≥ 30 songs, ids, FR/EN titles, public-domain metadata, complete bars
//    (pickup included), no note across a barline, melody in C4..B5, left hand in C3..B3, chord chart as long as the melody,
//    Easy + Medium (+ Advanced) for every song with chords, grid examples really on their grid.
// 2. The PLAY page: rows by collection that scroll sideways, level filter, free piano chip, grid sheet, no page scroll at 5 sizes (light + dark).
// 3. The player loads every arrangement (#song=<id>&arr=<lv>), a whole song is played in wait mode through the host's MIDI (stars saved
//    under the arrangement key), a two-hand arrangement widens the keyboard to C3..B5.
// 4. "Play it" on a grid = LEARN › Progressions start screen set to that grid and key. Texts pc* / gr* exist in FR and EN.
// Usage: python3 -m http.server <PORT> at the repo root, then PORT=<PORT> node tools/audit/r30_morceaux.mjs
import { readFileSync } from 'fs';
import { launch, URL, INIT } from './lib.mjs';
import { readSource } from '../source.mjs'; // source assemblée depuis src/app/ (voir src/app/README.md)
const W = (p, ms) => p.waitForTimeout(ms);
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d !== undefined && !ok ? ' — ' + JSON.stringify(d).slice(0, 400) : '')); if (!ok) fails.push(n); };
const root = new globalThis.URL('../../', import.meta.url);
const G = {}; new Function('globalThis', readFileSync(new globalThis.URL('assets/js/songs-data.js', root), 'utf8'))(G);
const PS = G.PC_SONG;

// ---------- 1. the catalogue
{ const L = PS.list, ids = L.map(s => s.id);
  check('au moins 30 morceaux (' + L.length + ')', L.length >= 30);
  check('identifiants uniques, lettres seulement', new Set(ids).size === ids.length && ids.every(i => /^[a-z]+$/.test(i)));
  check('les 5 morceaux d’avant gardent leur identifiant', ['lune', 'maman', 'ode', 'jacques', 'elise'].every(i => ids.includes(i)));
  check('titres FR et EN, compositeur, date, collection connue', L.every(s => s.t && s.t[0] && s.t[1] && s.by && s.d && PS.COLL.includes(s.c) && (s.by !== 'trad' || s.from)), L.filter(s => !(s.t && s.by && s.d && PS.COLL.includes(s.c))).map(s => s.id));
  check('chaque collection a au moins 6 morceaux', PS.COLL.every(c => L.filter(s => s.c === c).length >= 6));
  const bad = [];
  for (const s of L) { const per = PS.per(s), pk = s.p || 0, { notes, len } = PS.parseSeq(s.mel), e = [];
    const whole = x => Math.abs(x / per - Math.round(x / per)) < 1e-6;
    if (!(whole(len - pk) || whole(len))) e.push('mesures incomplètes');
    let t = 0; for (const tok of s.mel.trim().split(/\s+/)) { const d = parseFloat(tok.split(':')[1]), a = t - pk, b = t + d - pk; if (a >= -1e-6 && Math.floor(a / per + 1e-9) !== Math.floor((b - 1e-6) / per)) e.push('barre traversée ' + tok + '@' + t); t += d; }
    const lo = Math.min(...notes.map(n => n.m)), hi = Math.max(...notes.map(n => n.m)); if (lo < 60 || hi > 83) e.push('mélodie hors Do4..Si5');
    if (s.ch) { const tot = PS.parseChart(s).reduce((a, x) => a + x.d, 0); if (Math.abs(tot - (len - pk)) > 1e-6) e.push('grille ' + tot + ' ≠ ' + (len - pk));
      const lv = PS.arrs(s).map(a => a.lv); if (!lv.includes(1) || !lv.includes(2)) e.push('pas de Facile + Moyen');
      for (const l of [2, 3]) { const lh = PS.build(s, l).filter(n => n.h === 2); if (!lh.length || lh.some(n => n.m < 48 || n.m > 59)) e.push('main gauche hors Do3..Si3 (' + l + ')'); if (Math.max(...lh.map(n => n.s + n.d)) > len + 1e-6) e.push('main gauche trop longue'); } }
    if (e.length) bad.push(s.id + ': ' + e.join(', ')); }
  check('mesures complètes, aucune note à cheval, étendues justes, grilles d’accords de la bonne longueur', bad.length === 0, bad);
  // grid examples: the songs listed under I–IV–V only use I, IV and V (their key = first chord)
  const src = readSource();
  const g145 = JSON.parse(/id:"g145".*?songs:(\[[^\]]*\])/.exec(src)[1]);
  const off = g145.filter(id => { const s = L.find(x => x.id === id), ch = PS.parseChart(s), I = ch[0].chord.pc; return !ch.every(c => !c.chord.minor && [0, 5, 7].includes((c.chord.pc - I + 12) % 12)); });
  check('exemples de I–IV–V : uniquement I, IV et V (' + g145.length + ' morceaux)', g145.length >= 5 && off.length === 0, off);
  // texts
  const fr = src.slice(src.indexOf('  fr:{help:'), src.indexOf('  en:{help:')), en = src.slice(src.indexOf('  en:{help:'), src.indexOf('const t = k =>'));
  const keys = b => new Set([...b.matchAll(/[\s,{]((?:pc|gr)[A-Z][A-Za-z0-9]*|progBlues)\s*:/g)].map(m => m[1]));
  const kf = keys(fr), ke = keys(en), miss = [...kf].filter(k => !ke.has(k)).concat([...ke].filter(k => !kf.has(k)).map(k => 'fr:' + k));
  check('textes pc* / gr* en FR et en EN (' + kf.size + ')', kf.size >= 25 && miss.length === 0, miss);
  check('aucun titre de chanson récente dans les grilles (exemples = catalogue seulement)', !/Let It Be|Stand by Me|Hallelujah|Wonderwall|Despacito/i.test(src)); }

const errs = [];
const seed = `(()=>{ try{ if(sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded','1'); localStorage.removeItem('clavio:best'); localStorage.removeItem('clavio:sheet');
  const S={settings:{lang:"fr",notation:"fr",input:"midi"},langV2:true,gate:"guest",onb:{done:1},tourDone:1,pwShown:1,introSeen:Object.fromEntries(["hub","learn","games","free","play","quiz","chords","scales","harmony","prog","ear","daily","practice","section"].map(k=>[k,1])),seenTypes:[],stats:{},secStats:{},xp:0,xpDays:{},streak:{days:0}};
  localStorage.setItem("memo-gammes-v1",JSON.stringify(S)); }catch(e){} })();`;
const { browser } = await launch({ mode: 'ok' });
async function ctx({ w = 1180, h = 820, dark = false, lang = 'fr' } = {}) {
  const c = await browser.newContext({ viewport: { width: w, height: h }, locale: lang === 'fr' ? 'fr-FR' : 'en-US', colorScheme: dark ? 'dark' : 'light', hasTouch: w < 900, isMobile: w < 900 && h > w });
  await c.addInitScript(`window.__midiMode="ok";`); await c.addInitScript(INIT.replace('${MODE}', 'ok')); await c.addInitScript(seed);
  const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|ERR_PROXY|favicon|Failed to load resource/.test(m.text())) errs.push(m.text()); }); return p; }
const ev = (p, f, a) => p.evaluate(f, a);
const toPlay = async p => { await ev(p, () => document.querySelector('#modeNav [data-mode=play]').click()); await W(p, 900); };
const noScroll = p => ev(p, () => { const m = document.getElementById('main'), d = document.scrollingElement; return m.scrollHeight <= m.clientHeight + 1 && d.scrollHeight <= innerHeight + 1 && d.scrollWidth <= innerWidth; });

// ---------- 2. PLAY page at 5 sizes, light and dark
for (const [w, h] of [[1024, 768], [768, 1024], [1280, 800], [812, 375], [375, 667]]) for (const dark of [false, true]) {
  const p = await ctx({ w, h, dark }); await p.goto(URL); await W(p, 1200); await toPlay(p);
  const tag = w + '×' + h + (dark ? ' sombre' : '');
  const info = await ev(p, () => ({ rows: document.querySelectorAll('#playSongs .pc-row').length, songs: document.querySelectorAll('#playSongs .ptile[data-song]').length, grids: document.querySelectorAll('#playSongs .gr-tile').length,
    stage: !!document.getElementById('stage').offsetParent, strip: [...document.querySelectorAll('.pc-strip')].every(s => getComputedStyle(s).overflowX === 'auto'),
    first: (document.querySelector('#playSongs .ptile') || {}).dataset?.song }));
  check(tag + ' : 5 rangées (4 collections + grilles), ' + info.songs + ' morceaux, 8 grilles, piano libre caché', info.rows === 5 && info.songs === PS.list.length && info.grids === 8 && !info.stage && info.strip && info.first === 'lune', info);
  check(tag + ' : catalogue sans défilement de page', await noScroll(p));
  await ev(p, () => document.querySelector('#playSongs .gr-tile').click()); await W(p, 300);
  check(tag + ' : fiche de grille sans défilement (12 tonalités, Joue-la visible)', await noScroll(p) && await ev(p, () => { const b = document.getElementById('grPlay').getBoundingClientRect(); return document.querySelectorAll('#grKeys button').length === 12 && b.bottom <= innerHeight && b.height > 0; }));
  await ev(p, () => document.getElementById('grClose').click()); await W(p, 200);
  await ev(p, () => document.getElementById('pcFree').click()); await W(p, 300);
  check(tag + ' : « Piano libre » ouvre le mode PIANO (clavier visible, catalogue caché), sans défilement', await noScroll(p) && await ev(p, () => document.body.dataset.page === 'piano' && !!document.getElementById('stage').offsetParent && !document.getElementById('playSongs').offsetParent));
  await p.context().close(); }

// ---------- filter, grid sheet, Play it
{ const p = await ctx({ w: 1024, h: 768 }); await p.goto(URL); await W(p, 1200); await toPlay(p);
  await ev(p, () => document.querySelector('#pcBar [data-lv="2"]').click()); await W(p, 200);
  const f = await ev(p, () => ({ pressed: document.querySelector('#pcBar [data-lv="2"]').getAttribute('aria-pressed'), elise: !!document.querySelector('#playSongs [data-song=elise]'), ode: !!document.querySelector('#playSongs [data-song=ode]'), on: [...document.querySelectorAll('#playSongs [data-song=ode] .pc-dots i')].map(i => i.className) }));
  check('filtre Moyen : Lettre à Élise (une main, avancé) masquée, Ode à la joie gardée, son point jaune allumé', f.pressed === 'true' && !f.elise && f.ode && f.on.join() === ',on,', f);
  await ev(p, () => document.querySelector('#playSongs .gr-tile[data-gr=g145]').click()); await W(p, 300);
  const names = () => ev(p, () => [...document.querySelectorAll('.gr-degs small')].map(e => e.textContent).join(' '));
  check('I–IV–V en Do : Do Fa Sol, 8 mesures', await names() === 'Do Fa Sol' && await ev(p, () => document.querySelectorAll('.gr-struct span').length === 8), await names());
  await ev(p, () => [...document.querySelectorAll('#grKeys button')].find(b => b.textContent === 'Sol').click()); await W(p, 200);
  check('tonalité Sol : Sol Do Ré (calcul automatique)', await names() === 'Sol Do Ré', await names());
  check('exemples cliquables du catalogue (dont Jingle Bells)', await ev(p, () => [...document.querySelectorAll('.gr-song')].some(b => b.dataset.song === 'jingle')));
  await ev(p, () => [...document.querySelectorAll('.gr-list button')].find(b => b.dataset.gr === 'blues').click()); await W(p, 200);
  check('blues : 12 mesures, I IV V', await ev(p, () => document.querySelectorAll('.gr-struct span').length === 12 && document.querySelectorAll('.gr-degs b').length === 3));
  await ev(p, () => [...document.querySelectorAll('.gr-list button')].find(b => b.dataset.gr === 'g145').click()); await W(p, 200);
  await ev(p, () => document.getElementById('grPlay').click()); await W(p, 900);
  const su = await ev(p, () => { const S = JSON.parse(localStorage.getItem('memo-gammes-v1')); return { setup: document.body.classList.contains('setup'), page: document.body.dataset.page, st: S.settings.su && S.settings.su.prog, sec: S.section, sum: (document.getElementById('suSum') || {}).textContent }; });
  check('Joue-la : écran de départ des Progressions, I–IV–V, Sol', su.setup && su.st && su.st.tids.join() === 'p145' && su.st.picked.join() === '7' && su.st.keys === 'pick' && /Sol/.test(su.sum), su);
  await ev(p, () => document.getElementById('suGo').click()); await W(p, 800);
  check('… et la partie démarre', await ev(p, () => !document.body.classList.contains('setup')));
  await p.context().close(); }

// ---------- 3. the player: every arrangement loads; a whole song played in wait mode through the host's MIDI
{ const p = await ctx({ w: 1024, h: 768 }); const bad = [];
  for (const s of PS.list) for (const a of PS.arrs(s)) {
    await p.goto(URL.replace(/\/$/, '') + '/play/index.html?' + s.id + a.lv + '#song=' + s.id + '&arr=' + a.lv + '&lang=fr'); await W(p, 120);
    const r = await ev(p, () => ({ ov: !document.getElementById('ov').hidden, keys: document.querySelectorAll('#kbd .key').length, title: (document.querySelector('#ovCard h2') || {}).textContent, pressed: (document.querySelector('#ovCard [data-lv][aria-pressed=true]') || {}).dataset?.lv }));
    if (!r.ov || r.keys !== (a.hands > 1 ? 36 : 24) || r.title !== s.t[0] || (PS.arrs(s).length > 1 && +r.pressed !== a.lv)) bad.push(s.id + '@' + a.lv + ' ' + JSON.stringify(r)); }
  check('le lecteur ouvre les ' + PS.list.reduce((n, s) => n + PS.arrs(s).length, 0) + ' versions (titre, version choisie, clavier 2 ou 3 octaves)', bad.length === 0, bad.slice(0, 5));
  await p.context().close(); }
// headless frames are slow: wait for the song to stop on each note (sheet view: "The song is waiting for the right note"), then play it
async function playThrough(p, id, lv) {
  const s = PS.list.find(x => x.id === id), notes = PS.build(s, lv), groups = [];
  notes.forEach(n => { const g = groups[groups.length - 1]; if (g && Math.abs(g.s - n.s) < 1e-6) g.m.push(n.m); else groups.push({ s: n.s, m: [n.m] }); });
  const f = p.frames().find(x => x.url().includes('play/'));
  await f.evaluate(() => { if (document.getElementById('tSheet').getAttribute('aria-pressed') !== 'true') document.getElementById('tSheet').click(); document.getElementById('go').click(); });
  const frozen = () => f.waitForFunction(() => /attend/.test(document.getElementById('sheetMsg').textContent), null, { timeout: 15000, polling: 'raf' });
  const moving = () => f.waitForFunction(() => !/attend/.test(document.getElementById('sheetMsg').textContent), null, { timeout: 15000, polling: 'raf' });
  for (const g of groups) { await frozen();
    await ev(p, ms => { ms.forEach(m => window.__midi.noteOn(m, 90)); setTimeout(() => ms.forEach(m => window.__midi.noteOff(m)), 40); }, g.m); await moving(); }
  await f.waitForFunction(() => !!document.querySelector('.big-stars'), null, { timeout: 30000 });
  return f.evaluate(() => ({ stars: document.querySelectorAll('.big-stars span:not(.off)').length, best: JSON.parse(localStorage.getItem('clavio:best') || '{}'), sheet: !!document.querySelector('#sheetIn svg') })); }
{ const p = await ctx({ w: 1024, h: 768 }); await p.goto(URL); await W(p, 1500); await toPlay(p);
  await ev(p, () => document.querySelector('#playSongs [data-song=buns]').click()); await W(p, 1500);
  check('tuile → lecteur Play (#song=buns&arr=1)', await ev(p, () => document.body.dataset.page === 'play' && /#song=buns&arr=1/.test(document.getElementById('playFrame').getAttribute('src'))));
  const r1 = await playThrough(p, 'buns', 1);
  check('Facile joué en entier au MIDI (vue Partition) : 3 étoiles, record sous « buns »', r1.stars === 3 && r1.best.buns === 3 && r1.sheet, r1);
  const f = p.frames().find(x => x.url().includes('play/'));
  await f.evaluate(() => document.querySelector('[data-h]') && document.querySelector('[data-h]').click()); await W(p, 1200);
  check('Bibliothèque → retour à la page PLAY de l’hôte', await ev(p, () => document.body.dataset.page === 'free'));
  await ev(p, () => document.querySelector('#pcBar [data-lv="2"]').click()); await W(p, 200);
  await ev(p, () => document.querySelector('#playSongs [data-song=buns]').click()); await W(p, 1500);
  const f2 = p.frames().find(x => x.url().includes('play/'));
  check('filtre Moyen → version deux mains, clavier Do3..Si5', await f2.evaluate(() => document.querySelectorAll('#kbd .key').length === 36 && +document.querySelector('#kbd .key').dataset.m === 48));
  const r2 = await playThrough(p, 'buns', 2);
  check('Moyen (deux mains) joué en entier : record sous « buns@2 », la tuile montre 3 étoiles', r2.stars === 3 && r2.best['buns@2'] === 3, r2);
  await p.context().close(); }

// ---------- English
{ const p = await ctx({ w: 1280, h: 800, lang: 'en' }); await ev(p, () => 0); await p.goto(URL); await W(p, 300);
  await ev(p, () => { const S = JSON.parse(localStorage.getItem('memo-gammes-v1')); S.settings.lang = 'en'; S.settings.notation = 'en'; localStorage.setItem('memo-gammes-v1', JSON.stringify(S)); }); await p.reload(); await W(p, 1200); await toPlay(p);
  check('anglais : collections et titres traduits', await ev(p, () => /First steps/.test(document.getElementById('playSongs').textContent) && /Twinkle, Twinkle/.test(document.getElementById('playSongs').textContent) && /Free piano/.test(document.getElementById('pcBar').textContent)));
  await p.context().close(); }

check('aucune erreur JS', errs.length === 0, errs.slice(0, 5));
await browser.close();
console.log(fails.length ? `\n${fails.length} échec(s)` : '\nTout est OK'); process.exit(fails.length ? 1 : 0);
