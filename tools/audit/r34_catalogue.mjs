// Catalogue libre (25/10/2026): ≈ 200 songs = songs-data.js (32, base) + songs-free.js (library, OpenScore Lieder CC0 / Mutopia PD or CC BY).
// 1. EVERY library piece, no browser: complete bars (pickup included), no note across a barline, melody in C4..B5, ≥ 16 notes, no note of zero
//    length, chord chart as long as the melody, left hand in C3..B3 (Medium / Advanced), 30 s – 3 min at its tempo, licence in the allowed list
//    (CC0 1.0, Domaine public, CC BY 2.5/3.0/4.0: never BY-SA), source present (title, composer, digital edition, link; Mutopia: piece number),
//    unique letters-only ids that do not collide with the base catalogue, the 4 library collections with ≥ 6 pieces each, ≥ 190 songs in all.
// 2. PLAY: « Library » chip (count), 4 rows that scroll sideways, the level filter, no page scroll at 5 sizes (light + dark); « All » keeps its 5 rows.
// 3. Settings › App › « Music credits » (and the « Credits » link of the library): one line per library piece, with source and licence.
// 4. The player: a sample of 20 library pieces opens (title, source + licence line, 2 or 3 octaves); 3 pieces played to the end through the
//    host's MIDI (stars saved under their key); the hub « For you » picks a library piece to improve; Succès counts library pieces.
// 5. Paywall (off by default; on with ?paywall=1): the 10 first songs of the whole catalogue stay free, every library piece is locked.
// Usage: python3 -m http.server <PORT> at the repo root, then PORT=<PORT> node tools/audit/r34_catalogue.mjs
import { readFileSync } from 'fs';
import { launch, URL, INIT } from './lib.mjs';
const W = (p, ms) => p.waitForTimeout(ms);
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d !== undefined && !ok ? ' — ' + JSON.stringify(d).slice(0, 600) : '')); if (!ok) fails.push(n); };
const root = new globalThis.URL('../../', import.meta.url);
const G = {}; new Function('globalThis', readFileSync(new globalThis.URL('assets/js/songs-data.js', root), 'utf8'))(G);
const nBase = G.PC_SONG.list.length;
new Function('globalThis', readFileSync(new globalThis.URL('assets/js/songs-free.js', root), 'utf8'))(G);
const PS = G.PC_SONG, LIB = G.PC_FREE, ALLOWED = ['CC0 1.0', 'Domaine public', 'CC BY 2.5', 'CC BY 3.0', 'CC BY 4.0'];

// ---------- 1. every piece
{ const L = PS.list, ids = L.map(s => s.id);
  check('≈ 200 morceaux en tout (' + L.length + ' = ' + nBase + ' + ' + LIB.length + ')', L.length >= 190 && LIB.length >= 150 && nBase === 32);
  check('identifiants uniques, lettres seulement, aucun conflit avec le catalogue de base', new Set(ids).size === ids.length && ids.every(i => /^[a-z]+$/.test(i)));
  check('les 10 premiers du catalogue complet = les 10 premiers de songs-data.js', L.slice(0, 10).every(s => !s.src));
  check('4 collections de bibliothèque, ≥ 6 morceaux chacune', ['masters', 'lieder', 'etudes', 'dances'].every(c => PS.COLL.includes(c) && LIB.filter(s => s.c === c).length >= 6), ['masters', 'lieder', 'etudes', 'dances'].map(c => c + ':' + LIB.filter(s => s.c === c).length));
  const bad = [];
  for (const s of LIB) { const e = [], per = PS.per(s), pk = s.p || 0;
    let parsed; try { parsed = PS.parseSeq(s.mel); } catch (x) { bad.push(s.id + ': ' + x.message); continue; }
    const { notes, len } = parsed, whole = x => Math.abs(x / per - Math.round(x / per)) < 1e-6;
    if (!whole(len - pk)) e.push('mesures incomplètes');
    let t = 0; for (const tok of s.mel.trim().split(/\s+/)) { const d = parseFloat(tok.split(':')[1]); if (!(d > 0)) e.push('durée nulle ' + tok); const a = t - pk, b = t + d - pk; if (a >= -1e-6 && Math.floor(a / per + 1e-9) !== Math.floor((b - 1e-6) / per)) e.push('barre traversée ' + tok + '@' + t); t += d; }
    if (notes.length < 16) e.push('moins de 16 notes');
    if (Math.min(...notes.map(n => n.m)) < 60 || Math.max(...notes.map(n => n.m)) > 83) e.push('mélodie hors Do4..Si5');
    const secs = len * 60 / s.bpm; if (secs < 29.5 || secs > 181) e.push('durée ' + Math.round(secs) + ' s');
    if (!s.ch) e.push('pas de grille'); else {
      const tot = PS.parseChart(s).reduce((a, x) => a + x.d, 0); if (Math.abs(tot - (len - pk)) > 1e-6) e.push('grille ' + tot + ' ≠ ' + (len - pk));
      const lv = PS.arrs(s).map(a => a.lv); if (!lv.includes(1) || !lv.includes(2)) e.push('pas de Facile + Moyen');
      for (const l of lv.filter(x => x > 1)) { const lh = PS.build(s, l).filter(n => n.h === 2); if (!lh.length || lh.some(n => n.m < 48 || n.m > 59 || !(n.d > 0))) e.push('main gauche (' + l + ')'); } }
    const x = s.src || {};
    if (!ALLOWED.includes(x.lic)) e.push('licence ' + x.lic);
    if (!(x.t && x.by && x.ed && /^https:\/\//.test(x.url || ''))) e.push('source incomplète');
    if (x.ed === 'Mutopia Project' && !(x.no > 0 && /mutopiaproject\.org/.test(x.url))) e.push('n° Mutopia');
    if (x.ed === 'OpenScore Lieder' && (x.lic !== 'CC0 1.0' || !/github\.com\/OpenScore\/Lieder/.test(x.url))) e.push('OpenScore ≠ CC0');
    if (!(s.t && s.t[0] && s.t[1] && s.by && s.d && s.o && /^#[0-9a-f]{6}$/i.test(s.k))) e.push('métadonnées');
    if (e.length) bad.push(s.id + ': ' + [...new Set(e)].join(', ')); }
  check('chaque pièce (' + LIB.length + ') : mesures complètes, aucune note à cheval ni de durée nulle, ≥ 16 notes, étendues, grille, 30 s – 3 min, licence autorisée, source', bad.length === 0, bad.slice(0, 8));
  const by = {}; LIB.forEach(s => { const k = s.src.ed + ' · ' + s.src.lic; by[k] = (by[k] || 0) + 1; });
  console.log('     sources : ' + Object.entries(by).map(([k, v]) => k + ' = ' + v).join(' ; '));
  check('aucune licence CC BY-SA', !LIB.some(s => /SA/.test(s.src.lic))); }

const errs = [];
const seed = (extra = '') => `(()=>{ try{ if(sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded','1'); localStorage.removeItem('clavio:best'); localStorage.removeItem('clavio:sheet');
  const S={settings:{lang:"fr",notation:"fr",input:"midi"},langV2:true,gate:"guest",onb:{done:1},tourDone:1,pwShown:1,introSeen:Object.fromEntries(["hub","learn","games","free","play","quiz","chords","scales","harmony","prog","ear","daily","practice","section"].map(k=>[k,1])),seenTypes:[],stats:{},secStats:{},xp:0,xpDays:{},streak:{days:0}};
  ${extra}
  localStorage.setItem("memo-gammes-v1",JSON.stringify(S)); }catch(e){} })();`;
const { browser } = await launch({ mode: 'ok' });
async function ctx({ w = 1180, h = 820, dark = false, extra = '' } = {}) {
  const c = await browser.newContext({ viewport: { width: w, height: h }, locale: 'fr-FR', colorScheme: dark ? 'dark' : 'light', hasTouch: w < 900, isMobile: w < 900 && h > w });
  await c.addInitScript(`window.__midiMode="ok";`); await c.addInitScript(INIT.replace('${MODE}', 'ok')); await c.addInitScript(seed(extra));
  const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|ERR_PROXY|favicon|Failed to load resource/.test(m.text())) errs.push(m.text()); }); return p; }
const ev = (p, f, a) => p.evaluate(f, a);
const toPlay = async p => { await ev(p, () => document.querySelector('#modeNav [data-mode=play]').click()); await W(p, 900); };
const toLib = async p => { await ev(p, () => document.getElementById('pcLib').click()); await p.waitForFunction(() => document.querySelectorAll('#playSongs .pc-row').length === 4, null, { timeout: 15000 }); await W(p, 200); };
const noScroll = p => ev(p, () => { const m = document.getElementById('main'), d = document.scrollingElement; return m.scrollHeight <= m.clientHeight + 1 && d.scrollHeight <= innerHeight + 1 && d.scrollWidth <= innerWidth; });

// ---------- 2. PLAY: library view at 5 sizes
for (const [w, h] of [[1024, 768], [768, 1024], [1280, 800], [812, 375], [375, 667]]) for (const dark of [false, true]) {
  const p = await ctx({ w, h, dark }); await p.goto(URL); await W(p, 1200); await toPlay(p);
  const tag = w + '×' + h + (dark ? ' sombre' : '');
  const cat = await ev(p, () => ({ rows: document.querySelectorAll('#playSongs .pc-row').length, chip: !!document.getElementById('pcLib') }));
  await toLib(p);
  const info = await ev(p, () => ({ rows: document.querySelectorAll('#playSongs .pc-row').length, songs: document.querySelectorAll('#playSongs .ptile[data-song]').length,
    pressed: document.getElementById('pcLib').getAttribute('aria-pressed'), n: (document.querySelector('#pcLib .pc-n') || {}).textContent, chipIn: (() => { const r = document.getElementById('pcLib').getBoundingClientRect(); return r.right <= innerWidth + 1 && r.width > 0; })(),
    strip: [...document.querySelectorAll('.pc-strip')].every(s => getComputedStyle(s).overflowX === 'auto'), cred: !!document.getElementById('pcCred') }));
  check(tag + ' : « Tous » garde 5 rangées ; Bibliothèque = 4 rangées, ' + info.songs + ' morceaux, pastille ' + info.n, cat.rows === 5 && cat.chip && info.rows === 4 && info.songs === LIB.length && info.pressed === 'true' && +info.n === LIB.length && info.strip && info.cred && info.chipIn, { cat, info });
  check(tag + ' : bibliothèque sans défilement de page', await noScroll(p));
  if (w === 1024 && !dark) {
    await ev(p, () => document.querySelector('#pcBar [data-lv="1"]').click()); await W(p, 300);
    const f = await ev(p, () => ({ rows: document.querySelectorAll('#playSongs .pc-row').length, lib: document.getElementById('pcLib').getAttribute('aria-pressed'), easy: document.querySelector('#pcBar [data-lv="1"]').getAttribute('aria-pressed') }));
    check('filtre Facile : on reste dans la bibliothèque', f.rows === 4 && f.lib === 'true' && f.easy === 'true', f);
    await ev(p, () => document.getElementById('pcLib').click()); await W(p, 300);
    check('re-clic sur Bibliothèque : retour aux 5 rangées', await ev(p, () => document.querySelectorAll('#playSongs .pc-row').length === 5 && document.getElementById('pcLib').getAttribute('aria-pressed') === 'false'));
  }
  await p.context().close(); }

// ---------- 3. music credits
{ const p = await ctx({ w: 1024, h: 768 }); await p.goto(URL); await W(p, 1200);
  await ev(p, () => document.getElementById('setBtn').click()); await W(p, 400);
  await ev(p, () => { const b = document.querySelector('#setNav [data-v=app]'); if (b) b.click(); }); await W(p, 300);
  check('Réglages › Application : bouton « Crédits musicaux » visible', await ev(p, () => { const b = document.getElementById('credBtn'); const r = b.getBoundingClientRect(); return r.height > 0 && r.bottom <= innerHeight && /Crédits musicaux/.test(b.textContent); }));
  await ev(p, () => document.getElementById('credBtn').click());
  await p.waitForFunction(n => document.querySelectorAll('#credList .cred-item b').length === n, LIB.length, { timeout: 15000 }).catch(() => {});
  const c = await ev(p, () => ({ open: !document.getElementById('credModal').hidden, items: [...document.querySelectorAll('#credList .cred-item b')].filter(b => !b.closest('#snCred')).length /* hors « Sons » (#snCred, 26/10) */, txt: document.getElementById('credList').textContent,
    scroll: getComputedStyle(document.getElementById('credList')).overflowY, fit: document.querySelector('#credModal .modal-card').getBoundingClientRect().bottom <= innerHeight + 1 }));
  check('fenêtre des crédits : une ligne par pièce (' + c.items + '), source, licence, lien, la liste défile dans sa carte', c.open && c.items === LIB.length && /OpenScore Lieder/.test(c.txt) && /Mutopia Project n° \d+/.test(c.txt) && /Licence CC0 1\.0/.test(c.txt) && c.scroll === 'auto' && c.fit, { ...c, txt: c.txt.slice(0, 200) });
  await p.keyboard.press('Escape'); await W(p, 200);
  if (!(await ev(p, () => document.getElementById('credModal').hidden))) await ev(p, () => document.querySelector('#credModal [data-close]').click());
  check('… et elle se ferme', await ev(p, () => document.getElementById('credModal').hidden));
  await p.context().close(); }

// ---------- 4. the player: 20 pieces open, 3 played to the end
const sample = LIB.filter((s, i) => i % Math.max(1, Math.floor(LIB.length / 20)) === 0).slice(0, 20);
{ const p = await ctx({ w: 1024, h: 768 }); const bad = [];
  for (const s of sample) { const A = PS.arrs(s), a = A[1] || A[0];
    await p.goto(URL.replace(/\/$/, '') + '/play/index.html?' + s.id + '#song=' + s.id + '&arr=' + a.lv + '&lang=fr');
    await p.waitForFunction(() => !document.getElementById('ov').hidden && document.querySelector('#ovCard h2'), null, { timeout: 8000 }).catch(() => {});
    const r = await ev(p, () => ({ title: (document.querySelector('#ovCard h2') || {}).textContent, src: (document.querySelector('#ovCard .src') || {}).textContent || '', keys: document.querySelectorAll('#kbd .key').length, lv: (document.querySelector('#ovCard [data-lv][aria-pressed=true]') || {}).dataset?.lv }));
    if (r.title !== s.t[0] || !r.src.includes('Source') || !r.src.includes(s.src.lic) || r.keys !== (a.hands > 1 ? 36 : 24) || +r.lv !== a.lv || (s.x && !/Extrait/.test(r.src))) bad.push(s.id + ' ' + JSON.stringify(r)); }
  check('le lecteur ouvre ' + sample.length + ' pièces de la bibliothèque (titre, « Source : … · Licence … », version, clavier)', bad.length === 0 && sample.length === 20, bad.slice(0, 4));
  await p.context().close(); }
async function playThrough(p, id, lv) {
  const s = PS.list.find(x => x.id === id), notes = PS.build(s, lv), groups = [];
  notes.forEach(n => { const g = groups[groups.length - 1]; if (g && Math.abs(g.s - n.s) < 1e-6) g.m.push(n.m); else groups.push({ s: n.s, m: [n.m] }); });
  const f = p.frames().find(x => x.url().includes('play/'));
  await f.waitForFunction(() => document.getElementById('go'), null, { timeout: 10000 });
  await f.evaluate(() => { if (document.getElementById('tSheet').getAttribute('aria-pressed') !== 'true') document.getElementById('tSheet').click(); document.getElementById('go').click(); });
  const frozen = () => f.waitForFunction(() => /attend/.test(document.getElementById('sheetMsg').textContent), null, { timeout: 15000, polling: 'raf' });
  const moving = () => f.waitForFunction(() => !/attend/.test(document.getElementById('sheetMsg').textContent), null, { timeout: 15000, polling: 'raf' });
  for (const g of groups) { await frozen();
    await ev(p, ms => { ms.forEach(m => window.__midi.noteOn(m, 90)); setTimeout(() => ms.forEach(m => window.__midi.noteOff(m)), 40); }, g.m); await moving(); }
  await f.waitForFunction(() => !!document.querySelector('.big-stars'), null, { timeout: 30000 });
  return f.evaluate(() => ({ stars: document.querySelectorAll('.big-stars span:not(.off)').length, best: JSON.parse(localStorage.getItem('clavio:best') || '{}') })); }
const short = [...LIB].sort((a, b) => PS.parseSeq(a.mel).notes.length - PS.parseSeq(b.mel).notes.length);
const plays = [[short[0], 1], [short.find(s => s.c !== short[0].c) || short[1], 1], [short.find(s => s.c === 'lieder' && s !== short[0]) || short[2], 2]];
{ const p = await ctx({ w: 1024, h: 768 }); await p.goto(URL); await W(p, 1500); await toPlay(p); await toLib(p);
  for (const [s, lv] of plays) {
    if (await ev(p, () => document.body.dataset.page !== 'free')) await toPlay(p);
    if (await ev(p, () => document.querySelectorAll('#playSongs .pc-row').length !== 4)) await toLib(p);
    if (lv > 1) { await ev(p, l => document.querySelector('#pcBar [data-lv="' + l + '"]').click(), lv); await W(p, 300); }
    await ev(p, id => { const t = document.querySelector('#playSongs [data-song="' + id + '"]'); t.scrollIntoView(); t.click(); }, s.id); await W(p, 1500);
    check('tuile → lecteur (#song=' + s.id + '&arr=' + lv + ')', await ev(p, id => document.body.dataset.page === 'play' && document.getElementById('playFrame').getAttribute('src').includes('#song=' + id + '&arr='), s.id));
    const r = await playThrough(p, s.id, lv), key = lv === PS.arrs(s)[0].lv ? s.id : s.id + '@' + lv;
    check(s.id + ' (' + s.c + ', ' + (lv > 1 ? 'deux mains' : 'une main') + ', ' + PS.build(s, lv).length + ' notes) joué en entier au MIDI : 3 étoiles sous « ' + key + ' »', r.stars === 3 && r.best[key] === 3, r);
    const f = p.frames().find(x => x.url().includes('play/')); await f.evaluate(() => document.querySelector('[data-h]') && document.querySelector('[data-h]').click()); await W(p, 1200);
    if (lv > 1) { await ev(p, () => document.querySelector('#pcBar [data-lv="0"]').click()); await W(p, 200); } }
  // Succès: the library pieces count
  await W(p, 800);
  const st = await ev(p, () => { const S = JSON.parse(localStorage.getItem('memo-gammes-v1')); return S.songStars || {}; });
  check('Succès : les étoiles des pièces de la bibliothèque sont copiées dans S.songStars', plays.every(([s, lv]) => (st[lv === PS.arrs(s)[0].lv ? s.id : s.id + '@' + lv] | 0) === 3), st);
  await p.context().close(); }
// « For you »: a library piece with 2 stars is the one to improve
{ const s = LIB.find(x => x.c === 'masters') || LIB[0];
  const p = await ctx({ w: 1280, h: 800, extra: `localStorage.setItem('clavio:best', JSON.stringify({"${s.id}":2}));` }); await p.goto(URL);
  await p.waitForFunction(t => (document.getElementById('rsFor') || {}).textContent?.includes(t), s.t[0], { timeout: 15000 }).catch(() => {});
  check('accueil « Pour toi » : « ' + s.t[0] + ' » (2 étoiles) proposé à améliorer', await ev(p, t => (document.getElementById('rsFor') || {}).textContent.includes(t), s.t[0]));
  await p.context().close(); }

// ---------- 5. paywall on: 10 first songs free, the library locked
{ const p = await ctx({ w: 1280, h: 800 }); await p.goto(URL.replace(/\/$/, '') + '/?paywall=1'); await W(p, 1500); await toPlay(p);
  const cat = await ev(p, () => [...document.querySelectorAll('#playSongs .ptile[data-song]')].map(e => [e.dataset.song, e.classList.contains('pw-lk')]));
  const first10 = PS.list.slice(0, 10).map(s => s.id);
  check('paywall : les 10 premiers morceaux du catalogue complet restent gratuits, les autres ont un cadenas', cat.filter(([id, lk]) => first10.includes(id) && lk).length === 0 && cat.filter(([id, lk]) => !first10.includes(id) && !lk).length === 0, cat.filter(([id, lk]) => first10.includes(id) === lk));
  await toLib(p);
  check('paywall : toute la bibliothèque a un cadenas', await ev(p, () => [...document.querySelectorAll('#playSongs .ptile[data-song]')].every(e => e.classList.contains('pw-lk'))));
  await ev(p, () => document.querySelector('#playSongs .ptile[data-song]').click()); await W(p, 600);
  check('… une tuile verrouillée ouvre le paywall', await ev(p, () => !document.getElementById('pw').hidden));
  await p.context().close(); }

check('aucune erreur JS', errs.length === 0, errs.slice(0, 5));
await browser.close();
console.log(fails.length ? `\n${fails.length} échec(s)` : '\nTout est OK'); process.exit(fails.length ? 1 : 0);
