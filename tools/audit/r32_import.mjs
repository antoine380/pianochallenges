// Chantier IMPORT DE MORCEAUX : PLAY › « Mes morceaux » (fichiers MIDI et MusicXML du joueur, gardés sur l'appareil).
// Génère dans le test : MIDI type 0 (une piste, 3 canaux dont la batterie), MIDI type 1 (piste de tempo + Piano + Basse + batterie,
// running status), MusicXML (2 portées, levée, liaisons, accords, backup) et le même en .mxl (zip deflate). Vérifie :
// 1. le parseur sans navigateur (MIDI) ; 2. la pastille « Mes morceaux » de la barre PLAY, la bulle de premier usage, la collection, le tuto (4 étapes, FAQ, appareil) ;
// 3. import (sélecteur de fichier) → aperçu (pistes, rôles automatiques, batterie ignorée, transposition, tonalité facile, simplifier) ;
// 4. Jouer → lecteur Play (#song=imp:<id>), morceau joué en entier au MIDI simulé en mode attente → étoiles (lecteur, record local, tuile) ;
// 5. persistance après rechargement ; renommer, régler, supprimer ; fichier invalide / trop gros = message clair ; Do seul = Jouer ;
// 6. aucune requête réseau ne contient le titre ou les notes ; l'événement song_import n'a que {fmt, n, ok, err} ;
// 7. aucun défilement de page aux 5 tailles (clair / sombre) : catalogue + pastille + bulle, collection, aperçu, tuto ; anglais.
// Usage : python3 -m http.server <PORT> à la racine, puis PORT=<PORT> NODE_PATH=… PW_CHROMIUM=… node tools/audit/r32_import.mjs  (CAP=1 : captures dans /home/claude/captures-import)
import { readFileSync, mkdirSync } from 'fs';
import { deflateRawSync } from 'zlib';
import { launch, URL, INIT } from './lib.mjs';
import { readSource } from '../source.mjs'; // source assemblée depuis src/app/ (voir src/app/README.md)
const W = (p, ms) => p.waitForTimeout(ms);
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d !== undefined && !ok ? ' — ' + JSON.stringify(d).slice(0, 500) : '')); if (!ok) fails.push(n); };
const root = new globalThis.URL('../../', import.meta.url);
const G = {}; new Function('globalThis', readFileSync(new globalThis.URL('assets/js/song-import.js', root), 'utf8'))(G);
const I = G.PCImp;
const CAP = process.env.CAP ? '/home/claude/captures-import/' : null; if (CAP) mkdirSync(CAP, { recursive: true });

// ---------- file generators
const vlq = n => { const b = [n & 0x7f]; while (n >>= 7) b.unshift((n & 0x7f) | 0x80); return b; };
const u32 = n => [24, 16, 8, 0].map(s => (n >>> s) & 255);
const trk = ev => { const d = []; ev.forEach(e => d.push(...e)); d.push(0, 0xff, 0x2f, 0); return [0x4d, 0x54, 0x72, 0x6b, ...u32(d.length), ...d]; };
const smf = (type, tracks, div = 480) => Buffer.from([0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, type, 0, tracks.length, div >> 8, div & 255, ...tracks.flat()]);
const name = s => [0, 0xff, 0x03, s.length, ...Buffer.from(s)];
// melody: Ode to Joy, first 8 notes in quarter notes; bass on beats 1 of each bar (C2 / G2): folded to C3..B3 by the app
const MEL = [64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 64, 62, 62];
const MD = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5, .5, 2];
function midi0() { const ev = [[0, 0xff, 0x51, 3, 0x07, 0xa1, 0x20], [0, 0xff, 0x58, 4, 4, 2, 24, 8], name('Ode')]; let t = 0, last = 0; const E = [];
  MEL.forEach((m, i) => { const s = t * 480, d = MD[i] * 480; E.push([s, 0x90, m, 90], [s + d - 10, 0x80, m, 0]); if (Math.abs(t % 4) < 1e-6) { E.push([s, 0x91, t % 8 ? 43 : 36, 80], [s + 1900, 0x81, t % 8 ? 43 : 36, 0]); } E.push([s, 0x99, 42, 70], [s + 100, 0x89, 42, 0]); t += MD[i]; });
  E.sort((a, b) => a[0] - b[0]); E.forEach(([at, ...b]) => { ev.push([...vlq(at - last), ...b]); last = at; });
  return smf(0, [trk(ev)]); }
function midi1() { const tempo = trk([[0, 0xff, 0x51, 3, 0x09, 0x27, 0xc0], [0, 0xff, 0x58, 4, 3, 2, 24, 8], name('Conductor')]);
  // 3/4 at 100 bpm, a waltz; the melody uses running status (0x90 once, then note-on velocity 0 as note-off)
  const mel = [67, 72, 76, 74, 72, 71, 72], md = [3, 1, 1, 1, 2, 1, 3]; const a = [name('Piano'), [0, 0xc0, 0]]; let first = true;
  mel.forEach((m, i) => { a.push([...vlq(0), ...(first ? [0x90] : []), m, 96]); first = false; a.push([...vlq(md[i] * 480), m, 0]); });
  const b = [name('Basse'), [0, 0xc1, 33]]; [48, 43, 48, 43].forEach(m => { b.push([0, 0x91, m, 80], [...vlq(3 * 480), 0x81, m, 0]); });
  const d = [name('Batterie')]; for (let i = 0; i < 12; i++) d.push([0, 0x99, 36, 100], [...vlq(480), 0x89, 36, 0]);
  return smf(1, [tempo, trk(a), trk(b), trk(d)]); }
const XML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0"><work><work-title>Petite valse d'essai</work-title></work>
<part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
<part id="P1">
<measure number="0" implicit="yes"><attributes><divisions>2</divisions><key><fifths>0</fifths></key><time><beats>3</beats><beat-type>4</beat-type></time><staves>2</staves></attributes>
<direction><sound tempo="90"/></direction>
<note><pitch><step>G</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><staff>1</staff></note></measure>
<measure number="1">
<note><pitch><step>C</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><staff>1</staff></note>
<note><grace/><pitch><step>D</step><octave>5</octave></pitch><voice>1</voice><staff>1</staff></note>
<note><pitch><step>E</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><staff>1</staff></note>
<note><chord/><pitch><step>C</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><staff>1</staff></note>
<note><pitch><step>G</step><octave>5</octave></pitch><duration>2</duration><tie type="start"/><voice>1</voice><staff>1</staff></note>
<backup><duration>6</duration></backup>
<note><pitch><step>C</step><octave>3</octave></pitch><duration>6</duration><voice>2</voice><staff>2</staff></note></measure>
<measure number="2">
<note><pitch><step>G</step><octave>5</octave></pitch><duration>2</duration><tie type="stop"/><voice>1</voice><staff>1</staff></note>
<note><pitch><step>F</step><alter>1</alter><octave>5</octave></pitch><duration>2</duration><voice>1</voice><staff>1</staff></note>
<note><rest/><duration>2</duration><voice>1</voice><staff>1</staff></note>
<backup><duration>6</duration></backup>
<note><pitch><step>D</step><octave>3</octave></pitch><duration>6</duration><voice>2</voice><staff>2</staff></note></measure>
<measure number="3">
<note><pitch><step>G</step><octave>5</octave></pitch><duration>6</duration><voice>1</voice><staff>1</staff></note>
<backup><duration>6</duration></backup>
<note><pitch><step>G</step><octave>2</octave></pitch><duration>6</duration><voice>2</voice><staff>2</staff></note></measure>
</part></score-partwise>`;
const crc32 = b => { let c, crc = 0xffffffff; for (const x of b) { c = (crc ^ x) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xffffffff) >>> 0; };
function zip(files) { const le16 = n => [n & 255, (n >> 8) & 255], le32 = n => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255]; const loc = [], cen = []; let off = 0;
  for (const [nm, data, store] of files) { const raw = Buffer.from(data), comp = store ? raw : deflateRawSync(raw), n = Buffer.from(nm), crc = crc32(raw), meth = store ? 0 : 8;
    const h = Buffer.from([0x50, 0x4b, 3, 4, ...le16(20), ...le16(0), ...le16(meth), 0, 0, 0, 0, ...le32(crc), ...le32(comp.length), ...le32(raw.length), ...le16(n.length), ...le16(0)]);
    loc.push(h, n, comp); cen.push(Buffer.from([0x50, 0x4b, 1, 2, ...le16(20), ...le16(20), ...le16(0), ...le16(meth), 0, 0, 0, 0, ...le32(crc), ...le32(comp.length), ...le32(raw.length), ...le16(n.length), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...le32(off)]), n); off += h.length + n.length + comp.length; }
  const c = Buffer.concat(cen); return Buffer.concat([...loc, c, Buffer.from([0x50, 0x4b, 5, 6, 0, 0, 0, 0, ...le16(files.length), ...le16(files.length), ...le32(c.length), ...le32(off), 0, 0])]); }
const MXL = zip([['mimetype', 'application/vnd.recordare.musicxml', true], ['META-INF/container.xml', '<?xml version="1.0"?><container><rootfiles><rootfile full-path="score/valse.musicxml"/></rootfiles></container>'], ['score/valse.musicxml', XML.replace("Petite valse d'essai", 'Valse compressée')]]);

// ---------- 1. parser without a browser
{ const m0 = await I.parse('ode_test.mid', midi0()), r0 = I.autoRoles(m0);
  check('MIDI type 0 : 3 canaux = 3 pistes, batterie détectée, tempo 120, 4/4, titre = nom du fichier', m0.tracks.length === 3 && m0.tracks.filter(x => x.drum).length === 1 && m0.bpm === 120 && m0.meter.join() === '4,4' && m0.title === 'ode test', m0.tracks.map(x => [x.ch, x.drum, x.notes.length]));
  check('rôles automatiques : la plus aiguë main droite, la plus grave main gauche, batterie ignorée', Object.values(r0).sort().join() === 'lh,off,rh' && r0[m0.tracks.find(x => x.drum).id] === 'off', r0);
  const c0 = I.convert(m0, { roles: r0, q: 4, mono: true });
  check('conversion : 15 notes main droite dans Do4..Si5, basse repliée dans Do3..Si3, durées au 1/16', c0.nR === 15 && c0.nL === 4 && c0.notes.every(n => n.h === 1 ? n.m >= 60 && n.m <= 83 : n.m >= 48 && n.m <= 59) && c0.notes.every(n => Math.abs(n.s * 4 - Math.round(n.s * 4)) < 1e-6), c0);
  check('doigtés calculés (position de 5 doigts sur les blanches)', c0.notes.filter(n => n.h === 1).every(n => n.f >= 1 && n.f <= 5));
  const m1 = await I.parse('valse.mid', midi1()), r1 = I.autoRoles(m1);
  check('MIDI type 1 : piste de tempo sans notes écartée, Piano / Basse / Batterie, 3/4, 100 bpm, running status lu', m1.tracks.map(x => x.name).join() === 'Piano,Basse,Batterie' && m1.meter.join() === '3,4' && m1.bpm === 100 && m1.tracks[0].notes.length === 7, m1.tracks.map(x => [x.name, x.notes.length]));
  check('MIDI type 1 : Piano main droite, Basse main gauche, Batterie ignorée', r1[m1.tracks[0].id] === 'rh' && r1[m1.tracks[1].id] === 'lh' && r1[m1.tracks[2].id] === 'off', r1);
  const t2 = I.convert(m1, { roles: r1, tr: 2, q: 4 }), t0 = I.convert(m1, { roles: r1, q: 4 });
  check('transposer +2 décale toutes les notes de 2 demi-tons (avant repli)', t2.notes.filter(n => n.h === 1).every((n, i) => (n.m - t0.notes.filter(x => x.h === 1)[i].m + 12) % 12 === 2));
  const bad = []; for (const [nm, buf, code] of [['x.mid', Buffer.from('MThd'), 'midiBad'], ['photo.jpg', Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]), 'format'], ['vide.mid', Buffer.alloc(0), 'empty'], ['gros.mid', Buffer.alloc(2 * 1024 * 1024 + 10, 0x4d), 'size']]) {
    try { await I.parse(nm, buf); bad.push(nm + ' accepté'); } catch (e) { if (e.code !== code) bad.push(nm + ' → ' + e.code); } }
  check('fichiers invalides : codes d’erreur (abîmé, autre format, vide, > 2 Mo)', bad.length === 0, bad);
  const src = readSource();
  const fr = src.slice(src.indexOf('  fr:{help:'), src.indexOf('  en:{help:')), en = src.slice(src.indexOf('  en:{help:'), src.indexOf('const t = k =>'));
  const keys = b => new Set([...b.matchAll(/[\s,{](imp[A-Z][A-Za-z0-9]*)\s*:/g)].map(m => m[1]));
  const kf = keys(fr), ke = keys(en); check('textes imp* en FR et en EN (' + kf.size + ')', kf.size >= 7 && [...kf].every(k => ke.has(k)) && [...ke].every(k => kf.has(k)));
  check('l’input fichier n’a pas d’attribut accept (iOS griserait .musicxml / .mxl)', !/impFile[^\n]*accept/.test(src) && !/i\.accept\s*=/.test(src)); }

// ---------- browser
const errs = [];
const seed = (lang = 'fr') => `(()=>{ try{ if(sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded','1'); localStorage.removeItem('clavio:best'); localStorage.removeItem('clavio:sheet'); localStorage.removeItem('pc-imp-tip'); localStorage.setItem('pc-trk-test','1');
  const S={settings:{lang:"${lang}",notation:"${lang}",input:"midi"},langV2:true,gate:"guest",onb:{done:1},tourDone:1,pwShown:1,introSeen:Object.fromEntries(["hub","learn","games","free","play","quiz","chords","scales","harmony","prog","ear","daily","practice","section"].map(k=>[k,1])),seenTypes:[],stats:{},secStats:{},xp:0,xpDays:{},streak:{days:0}};
  localStorage.setItem("memo-gammes-v1",JSON.stringify(S)); try{ indexedDB.deleteDatabase("pc-import"); }catch(e){} }catch(e){} })();`;
const { browser } = await launch({ mode: 'ok' });
const NET = { posts: [], other: [], track: [] };
async function ctx({ w = 1024, h = 768, dark = false, lang = 'fr' } = {}) {
  const c = await browser.newContext({ viewport: { width: w, height: h }, locale: lang === 'fr' ? 'fr-FR' : 'en-US', colorScheme: dark ? 'dark' : 'light', hasTouch: w < 900, isMobile: w < 900 && h > w });
  await c.addInitScript(`window.__midiMode="ok";`); await c.addInitScript(INIT.replace('${MODE}', 'ok')); await c.addInitScript(seed(lang));
  await c.route(u => !u.href.startsWith(URL), r => { const q = r.request(); NET.other.push(q.url()); if (q.postData()) NET.posts.push(q.postData());
    if (q.url().includes('/rpc/track_events')) { try { NET.track.push(JSON.parse(q.postData())); } catch (e) {} return r.fulfill({ status: 200, contentType: 'application/json', body: '1' }); }
    return r.fulfill({ status: 404, body: '' }); });
  const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|ERR_PROXY|favicon|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  p.on('request', q => { if (q.url().startsWith(URL) && q.postData()) NET.posts.push(q.postData()); });
  return p; }
const ev = (p, f, a) => p.evaluate(f, a);
const toPlay = async p => { await ev(p, () => document.querySelector('#modeNav [data-mode=play]').click()); await W(p, 1000); };
const noScroll = p => ev(p, () => { const m = document.getElementById('main'), d = document.scrollingElement; return m.scrollHeight <= m.clientHeight + 1 && d.scrollHeight <= innerHeight + 1 && d.scrollWidth <= innerWidth; });
async function pick(p, file, nm, sel = '#impAdd') { const [ch] = await Promise.all([p.waitForEvent('filechooser'), ev(p, s => document.querySelector(s).click(), sel)]); await ch.setFiles({ name: nm, mimeType: 'application/octet-stream', buffer: file }); await W(p, 700); }
const frame = p => p.frames().find(x => x.url().includes('play/'));
async function playThrough(p) {
  const f = frame(p); await f.waitForFunction(() => !!document.getElementById('go'), null, { timeout: 10000 });
  const groups = await f.evaluate(async () => { const id = /song=imp:([a-z0-9]+)/.exec(location.hash)[1], lv = +(/arr=(\d)/.exec(location.hash) || [0, 1])[1]; const r = await PCImp.db.get(id);
    const ns = PCImp.convert(r.model, r.opts).notes.filter(n => lv > 1 || n.h === 1), g = []; ns.forEach(n => { const x = g[g.length - 1]; if (x && Math.abs(x.s - n.s) < 1e-6) x.m.push(n.m); else g.push({ s: n.s, m: [n.m] }); }); return g; });
  await f.evaluate(() => { if (document.getElementById('tSheet').getAttribute('aria-pressed') !== 'true') document.getElementById('tSheet').click(); document.getElementById('go').click(); });
  const frozen = () => f.waitForFunction(() => /attend|waiting/.test(document.getElementById('sheetMsg').textContent), null, { timeout: 15000, polling: 'raf' });
  const moving = () => f.waitForFunction(() => !/attend|waiting/.test(document.getElementById('sheetMsg').textContent), null, { timeout: 15000, polling: 'raf' });
  for (const g of groups) { await frozen(); await ev(p, ms => { ms.forEach(m => window.__midi.noteOn(m, 90)); setTimeout(() => ms.forEach(m => window.__midi.noteOff(m)), 40); }, g.m); await moving(); }
  await f.waitForFunction(() => !!document.querySelector('.big-stars'), null, { timeout: 30000 });
  return f.evaluate(() => ({ stars: document.querySelectorAll('.big-stars span:not(.off)').length, best: JSON.parse(localStorage.getItem('clavio:best') || '{}'), sheet: !!document.querySelector('#sheetIn svg'), keys: document.querySelectorAll('#kbd .key').length, groups: 0 })); }
const dbList = p => ev(p, async () => { await new Promise(r => setTimeout(r, 200)); return window.PCImp ? (await PCImp.db.list()).map(r => ({ id: r.id, title: r.title, best: r.best, n: r.n, opts: r.opts })) : null; });

// ---------- 2-6. the main flow (iPad landscape)
{ const p = await ctx(); await p.goto(URL); await W(p, 1300); await toPlay(p);
  const row = await ev(p, () => { const c = document.getElementById('pcMine'), tip = document.getElementById('impTip'); return { chip: c && c.textContent, inBar: c && c.parentNode.id === 'pcBar', tip: tip && tip.textContent, rows: document.querySelectorAll('#playSongs .pc-row').length, first: document.querySelector('#playSongs .ptile').dataset.song }; });
  check('pastille « Mes morceaux » dans la barre de PLAY, bulle de premier usage ; le catalogue garde ses 5 rangées', row.chip === 'Mes morceaux' && row.inBar && /Nouveau/.test(row.tip || '') && row.rows === 5 && row.first === 'lune', row);
  if (CAP) await p.screenshot({ path: CAP + 'r32-catalogue-bulle.png' });
  // tutorial
  await ev(p, () => document.querySelector('#impTip .imp-tip-go').click()); await W(p, 500);
  const h = await ev(p, () => ({ v: document.getElementById('impPanel').dataset.v, steps: document.querySelectorAll('.imp-steps li').length, svgs: document.querySelectorAll('.imp-steps li svg').length, faq: [...document.querySelectorAll('.imp-faq summary')].map(s => s.textContent), dev: document.querySelector('.imp-dev').textContent, txt: document.querySelector('.imp-steps').textContent, cat: !!document.getElementById('playSongs').offsetParent }));
  check('tuto : 4 étapes illustrées (SVG), appareil détecté, MuseScore, droits d’usage, catalogue caché', h.v === 'help' && h.steps === 4 && h.svgs === 4 && /Sur ton/.test(h.dev) && /MuseScore/.test(h.txt) && /droit/.test(h.txt) && !h.cat, h);
  check('FAQ : trop difficile, trop de notes / batterie, ne s’ouvre pas, partagés ?', h.faq.length === 4 && /difficile/.test(h.faq[0]) && /batterie/.test(h.faq[1]) && /ouvre pas/.test(h.faq[2]) && /partagés/.test(h.faq[3]), h.faq);
  check('tuto sans défilement de page', await noScroll(p));
  if (CAP) await p.screenshot({ path: CAP + 'r32-tuto-1024x768.png' });
  await ev(p, () => document.getElementById('impClose').click()); await W(p, 400);
  check('la bulle ne revient pas après le tuto', await ev(p, () => !document.getElementById('impTip') && !!document.getElementById('pcMine')));
  await ev(p, () => document.getElementById('pcMine').click()); await W(p, 500);
  const co = await ev(p, () => ({ v: document.getElementById('impPanel').dataset.v, add: !!document.getElementById('impAdd'), empty: (document.querySelector('#impMine .imp-empty') || {}).textContent, pressed: document.getElementById('pcMine').getAttribute('aria-pressed') }));
  check('« Mes morceaux » : collection vide avec la grande tuile Importer, les 4 étapes en bref et le tuto', co.v === 'mine' && co.add && /Aucun morceau.*Trouve un fichier.*Choisis les mains/.test(co.empty || '') && co.pressed === 'true', co);
  check('collection sans défilement de page', await noScroll(p));
  // import a type-1 MIDI
  await pick(p, midi1(), 'Ma_valse.mid');
  const pv = await ev(p, () => ({ v: document.getElementById('impPanel').dataset.v, title: document.getElementById('impTitle').value, meta: document.getElementById('impMeta').textContent,
    tracks: [...document.querySelectorAll('.imp-trk')].map(r => [r.querySelector('b').textContent, r.querySelector('[aria-pressed=true]').dataset.r, !!r.querySelector('svg.imp-roll rect')]), lv: document.querySelector('#impLv [aria-pressed=true]').dataset.v, key: document.getElementById('impKeyL').textContent, priv: document.querySelector('.imp-priv').textContent }));
  check('aperçu : titre du fichier modifiable, 3 pistes · durée · 100 BPM · 3/4, mini aperçu de chaque piste', pv.v === 'imp' && pv.title === 'Ma valse' && /3 pistes/.test(pv.meta) && /100 BPM/.test(pv.meta) && /3\/4/.test(pv.meta) && pv.tracks.every(x => x[2]), pv);
  check('aperçu : Piano = main droite, Basse = main gauche, Batterie = ignorée, version Deux mains, tonalité probable', pv.tracks.map(x => x[1]).join() === 'rh,lh,off' && pv.lv === '2' && /Tonalité probable : Do majeur/.test(pv.key) && /jamais envoyé/.test(pv.priv), pv);
  check('aperçu sans défilement de page', await noScroll(p));
  if (CAP) await p.screenshot({ path: CAP + 'r32-apercu-1024x768.png' });
  await ev(p, () => { document.getElementById('impTrP').click(); }); await W(p, 150);
  check('transposer +1 : valeur affichée, tonalité recalculée (Do♯/Ré♭)', await ev(p, () => document.getElementById('impTrV').textContent === '+1' && /Do♯/.test(document.getElementById('impKeyL').textContent)));
  await ev(p, () => document.getElementById('impEasy').click()); await W(p, 150);
  check('« Tonalité facile » revient à 0 (Do majeur, aucune noire)', await ev(p, () => document.getElementById('impTrV').textContent === '0'));
  await ev(p, () => document.querySelector('.imp-trk:nth-child(2) [data-r=off]').click()); await W(p, 150);
  check('basse ignorée → version Deux mains grisée, Facile choisie', await ev(p, () => document.querySelector('#impLv [data-v="2"]').disabled && document.querySelector('#impLv [aria-pressed=true]').dataset.v === '1'));
  await ev(p, () => document.querySelector('.imp-trk:nth-child(2) [data-r=lh]').click()); await W(p, 150);
  await ev(p, () => { const i = document.getElementById('impTitle'); i.value = 'Valse <b>du test</b>'; i.dispatchEvent(new Event('input')); }); await W(p, 100);
  // Do alone on the MIDI keyboard = Play
  await ev(p, () => { window.__midi.noteOn(60, 90); setTimeout(() => window.__midi.noteOff(60), 30); }); await W(p, 1800);
  const op = await ev(p, () => ({ page: document.body.dataset.page, src: document.getElementById('playFrame').getAttribute('src') }));
  check('Do seul sur l’aperçu = Jouer → lecteur #song=imp:<id>&arr=2', op.page === 'play' && /#song=imp:[a-z0-9]+&arr=2/.test(op.src), op);
  const f = frame(p); await f.waitForFunction(() => !!document.querySelector('#ovCard h2'), null, { timeout: 8000 });
  const ov = await f.evaluate(() => ({ h2: document.querySelector('#ovCard h2').textContent, lv: [...document.querySelectorAll('#ovCard [data-lv]')].map(b => b.dataset.lv + b.getAttribute('aria-pressed')), keys: document.querySelectorAll('#kbd .key').length, sub: document.getElementById('sSub').textContent }));
  check('lecteur : titre nettoyé (pas de HTML), 2 versions (une main / deux mains), clavier Do3..Si5', ov.h2 === 'Valse bdu test/b' && ov.lv.join() === '1false,2true' && ov.keys === 36 && /Mon morceau/.test(ov.sub), ov);
  const r = await playThrough(p);
  const id = /song=imp:([a-z0-9]+)/.exec(op.src)[1];
  check('morceau importé joué en entier au MIDI (mode attente, vue Partition) : 3 étoiles', r.stars === 3 && r.sheet && r.best['imp:' + id + '@2'] === 3, r);
  let L = await dbList(p);
  check('record local du morceau (IndexedDB) : 3 étoiles et un score', L && L.length === 1 && L[0].best && L[0].best.stars === 3 && L[0].best.score > 0, L);
  // leave the song: back to PLAY, the tile shows the stars
  await frame(p).evaluate(() => document.querySelector('[data-h]').click()); await W(p, 1300);
  const pg = await ev(p, () => ({ page: document.body.dataset.page, n: (document.querySelector('#pcMine .pc-n') || {}).textContent }));
  await ev(p, () => document.getElementById('pcMine').click()); await W(p, 400);
  const tl = await ev(p, () => { const t = document.querySelector('#impMine li[data-imp]'); return t && { st: t.querySelector('.imp-st').textContent, title: t.querySelector('b').textContent, meta: document.querySelector('.imp-coll .imp-meta').textContent }; });
  check('retour à PLAY : pastille « 1 », le morceau dans « Mes morceaux » avec ★★★ et « 1 / 50 »', pg.page === 'free' && pg.n === '1' && tl && tl.st === '★★★' && tl.title === 'Valse bdu test/b' && /^1 \/ 50/.test(tl.meta), [pg, tl]);
  // MusicXML, then .mxl
  await pick(p, Buffer.from(XML), 'valse.musicxml');
  const x = await ev(p, () => ({ title: document.getElementById('impTitle').value, meta: document.getElementById('impMeta').textContent, tracks: [...document.querySelectorAll('.imp-trk')].map(r => [r.querySelector('b').textContent, r.querySelector('small').textContent, r.querySelector('[aria-pressed=true]').dataset.r]), fi: document.querySelector('.imp-fi').textContent }));
  check('MusicXML : titre de la partition, 2 portées = main droite / main gauche, 90 BPM, 3/4', x.title === "Petite valse d'essai" && x.tracks.length === 2 && x.tracks[0][2] === 'rh' && x.tracks[1][2] === 'lh' && /90 BPM/.test(x.meta) && /3\/4/.test(x.meta) && x.fi === '.xml', x);
  const xm = await ev(p, async () => { const r = await (await fetch('/assets/js/song-import.js')).text(); return 1; });
  await ev(p, () => document.getElementById('impGo').click()); await W(p, 1800);
  const fx = frame(p); await fx.waitForFunction(() => !!document.getElementById('go'), null, { timeout: 8000 });
  const xs = await fx.evaluate(async () => { const id = /song=imp:([a-z0-9]+)/.exec(location.hash)[1]; const r = await PCImp.db.get(id); const c = PCImp.convert(r.model, r.opts); return { rh: c.notes.filter(n => n.h === 1).map(n => [n.m, n.s, n.d]), lh: c.notes.filter(n => n.h === 2).length, pickup: c.pickup }; });
  check('MusicXML converti : levée d’un temps, note d’ornement ignorée, accord gardé en une note (la plus aiguë), liaison fusionnée (Sol5 de 2 temps), Fa♯', xs.pickup === 1 && JSON.stringify(xs.rh) === JSON.stringify([[67, 0, 1], [72, 1, 1], [76, 2, 1], [79, 3, 2], [78, 5, 1], [79, 7, 3]]) && xs.lh === 3, xs);
  const rx = await playThrough(p);
  check('MusicXML joué en entier : étoiles', rx.stars >= 2, rx);
  await frame(p).evaluate(() => document.querySelector('[data-h]').click()); await W(p, 1300);
  await ev(p, () => document.getElementById('pcMine').click()); await W(p, 400);
  await pick(p, MXL, 'valse.mxl');
  const mx = await ev(p, () => ({ title: document.getElementById('impTitle').value, n: document.querySelectorAll('.imp-trk').length, fi: document.querySelector('.imp-fi').textContent }));
  check('.mxl (zip deflate) : décompressé, titre « Valse compressée », 2 pistes', mx.title === 'Valse compressée' && mx.n === 2 && mx.fi === '.mxl', mx);
  await ev(p, () => document.getElementById('impGo').click()); await W(p, 1500);
  await frame(p).evaluate(() => document.querySelector('[data-h]') ? document.querySelector('[data-h]').click() : document.querySelector('[data-home]').click()); await W(p, 1300);
  await ev(p, () => document.getElementById('pcMine').click()); await W(p, 400);
  // invalid files
  await pick(p, Buffer.from('%PDF-1.4 bonjour'), 'partition.pdf');
  const e1 = await ev(p, () => ({ alert: (document.querySelector('.imp-errb[role=alert]') || {}).textContent || '', retry: !!document.getElementById('impRetry'), help: !!document.getElementById('impErrHelp') }));
  check('fichier invalide : message clair (formats acceptés), Choisir un autre fichier, Comment faire ?', /ne s'ouvre pas/.test(e1.alert) && /\.mid, \.midi, \.musicxml/.test(e1.alert) && e1.retry && e1.help, e1);
  await pick(p, Buffer.from('MThd\0\0\0\x06\0\x01\0\x02\x01\xe0MTrk\0\0\0\x09\0\x90<', 'latin1'), 'abime.mid', '#impRetry');
  check('MIDI abîmé : message « abîmé ou incomplet »', await ev(p, () => /abîmé/.test(document.querySelector('.imp-errb').textContent)));
  await pick(p, Buffer.concat([Buffer.from('MThd'), Buffer.alloc(2 * 1024 * 1024 + 1)]), 'enorme.mid', '#impRetry');
  check('fichier > 2 Mo : message « dépasse 2 Mo »', await ev(p, () => /2 Mo/.test(document.querySelector('.imp-errb').textContent)));
  await ev(p, () => document.getElementById('impClose').click()); await W(p, 300);
  // persistence after reload (the analytics queue is sent on pagehide: sent here explicitly, the test reads it)
  await ev(p, () => dispatchEvent(new Event('pagehide'))); await W(p, 800);
  await p.reload(); await W(p, 1500); await toPlay(p); await W(p, 600);
  await ev(p, () => document.getElementById('pcMine').click()); await W(p, 500);
  const pr = await ev(p, () => [...document.querySelectorAll('#impMine li[data-imp] b')].map(t => t.textContent));
  check('après rechargement : les 3 morceaux importés sont toujours là (le plus récent d’abord)', pr.length === 3 && pr[0] === 'Valse compressée' && pr.includes('Valse bdu test/b'), pr);
  // manage: rename, settings, delete
  check('« Mes morceaux » : liste des 3 morceaux (Jouer, Réglages, Renommer, Supprimer), sans défilement de page', await ev(p, () => document.querySelectorAll('#impMine li[data-imp]').length === 3 && document.querySelectorAll('#impMine [data-a=play]').length === 3 && document.querySelectorAll('#impMine [data-a=del]').length === 3) && await noScroll(p));
  if (CAP) await p.screenshot({ path: CAP + 'r32-gerer-1024x768.png' });
  await ev(p, () => document.querySelector('#impMine li:nth-child(1) [data-a=ren]').click()); await W(p, 200);
  await p.fill('#impMine li input', 'Valse renommée'); await p.keyboard.press('Enter'); await W(p, 500);
  check('renommer', await ev(p, () => document.querySelector('#impMine li:nth-child(1) b').textContent === 'Valse renommée'));
  await ev(p, () => document.querySelector('#impMine li:nth-child(1) [data-a=set]').click()); await W(p, 400);
  check('réglages d’un morceau gardé : aperçu « Réglages du morceau » avec ses pistes', await ev(p, () => /Réglages du morceau/.test(document.querySelector('.imp-k').textContent) && document.querySelectorAll('.imp-trk').length === 2));
  await ev(p, () => document.querySelector('#impLv [data-v="1"]').click()); await W(p, 100);
  await ev(p, () => document.getElementById('impGo').click()); await W(p, 1500);
  check('… Jouer après réglage : même morceau (pas de doublon), version Facile', (await dbList(p)).length === 3 && /arr=1/.test(await ev(p, () => document.getElementById('playFrame').getAttribute('src'))));
  await toPlay(p); await W(p, 300); if (await p.isVisible('#leaveModal')) { await p.click('#lvGo'); await W(p, 500); }
  await ev(p, () => document.getElementById('pcMine').click()); await W(p, 400);
  const toDel = await ev(p, () => document.querySelector('#impMine li:nth-child(3) b').textContent);
  await ev(p, () => document.querySelector('#impMine li:nth-child(3) [data-a=del]').click()); await W(p, 200);
  check('supprimer demande confirmation', await ev(p, () => /Supprimer « /.test(document.querySelector('#impMine li:nth-child(3) b').textContent)));
  await ev(p, () => document.querySelector('#impMine li:nth-child(3) [data-a=yes]').click()); await W(p, 500);
  await p.reload(); await W(p, 1500); await toPlay(p); await W(p, 600);
  await ev(p, () => document.getElementById('pcMine').click()); await W(p, 500);
  const left = await ev(p, () => [...document.querySelectorAll('#impMine li[data-imp] b')].map(t => t.textContent));
  check('supprimé, même après rechargement (' + toDel + ')', left.length === 2 && !left.includes(toDel), left);
  // a deleted song opened by its link: clear message
  await p.goto(URL.replace(/\/$/, '') + '/play/index.html#song=imp:inconnu&lang=fr'); await W(p, 800);
  check('lien vers un morceau qui n’est plus là : message clair', await ev(p, () => /n'est plus sur cet appareil/.test(document.getElementById('ovCard').textContent)));
  await p.goto(URL); await W(p, 3500); await p.goto('about:blank'); await W(p, 800);
  await p.context().close(); }

// ---------- privacy: nothing with the content left the device; song_import has only {fmt, n, ok, err}
{ const all = NET.posts.join('\n'), si = NET.track.flatMap(b => (b.p_evts || []).filter(e => (e.n || e.name || e.e) === 'song_import' || JSON.stringify(e).includes('song_import')));
  const leak = /valse|Valse|Ma_valse|\.musicxml|MThd|work-title|partition\.pdf|"imp"/.exec(all);
  check('aucune requête ne contient un titre, un nom de fichier ou une note (' + NET.posts.length + ' envois)', !leak, leak && all.slice(Math.max(0, leak.index - 200), leak.index + 100));
  check('événement song_import envoyé (réussites et échecs) avec seulement format, nb de notes, réussite / erreur', si.length >= 3 && si.every(e => { const p = e.p || e.props || e.d || {}; return Object.keys(p).every(k => ['fmt', 'n', 'ok', 'err'].includes(k)); }), si.slice(0, 4)); }

// ---------- 7. no page scroll at 5 sizes, light and dark
for (const [w, h] of [[1024, 768], [768, 1024], [1280, 800], [812, 375], [375, 667]]) for (const dark of [false, true]) {
  const p = await ctx({ w, h, dark }); await p.goto(URL); await W(p, 1200); await toPlay(p); await W(p, 400);
  const tag = w + '×' + h + (dark ? ' sombre' : ''), sfx = '-' + w + 'x' + h + (dark ? '-dark' : '');
  check(tag + ' : catalogue sans défilement, pastille « Mes morceaux » entière à l’écran, bulle visible', await noScroll(p) && await ev(p, () => { const b = document.getElementById('pcMine').getBoundingClientRect(), t = document.getElementById('impTip').getBoundingClientRect(); return b.height > 20 && b.right <= innerWidth && b.left >= 0 && t.height > 20 && t.right <= innerWidth && t.bottom <= innerHeight; }));
  if (CAP) await p.screenshot({ path: CAP + 'r32-catalogue' + sfx + '.png' });
  await ev(p, () => document.getElementById('pcMine').click()); await W(p, 400);
  check(tag + ' : « Mes morceaux » sans défilement de page, tuile Importer visible', await noScroll(p) && await ev(p, () => { const b = document.getElementById('impAdd').getBoundingClientRect(); return b.height > 30 && b.bottom <= innerHeight; }));
  if (CAP) await p.screenshot({ path: CAP + 'r32-collection' + sfx + '.png' });
  await pick(p, midi1(), 'valse.mid');
  check(tag + ' : aperçu sans défilement de page, bouton Jouer atteignable', await noScroll(p) && await ev(p, () => { const g = document.getElementById('impGo'); g.scrollIntoView({ block: 'nearest' }); const b = g.getBoundingClientRect(); return b.height > 30 && b.bottom <= innerHeight + 1; }) && await noScroll(p));
  if (CAP) { await ev(p, () => { const s = document.querySelector('.imp-body'); if (s) s.scrollTop = 0; }); await p.screenshot({ path: CAP + 'r32-apercu' + sfx + '.png' }); }
  await ev(p, () => document.getElementById('impHelp2').click()); await W(p, 300);
  check(tag + ' : tuto sans défilement de page (les étapes défilent dans la carte)', await noScroll(p) && await ev(p, () => !!document.getElementById('impHelpGo').getBoundingClientRect().height));
  if (CAP) await p.screenshot({ path: CAP + 'r32-tuto' + sfx + '.png' });
  await p.context().close(); }

// ---------- English
{ const p = await ctx({ w: 1280, h: 800, lang: 'en' }); await p.goto(URL); await W(p, 1200); await toPlay(p);
  await ev(p, () => document.getElementById('pcMine').click()); await W(p, 400);
  const en = await ev(p, () => ({ row: document.getElementById('pcMine').textContent, add: document.querySelector('#impAdd b').textContent }));
  await ev(p, () => document.getElementById('impHelpBtn').click()); await W(p, 300);
  const t = await ev(p, () => document.getElementById('impHelpT').textContent);
  check('anglais : My songs, Import a song, How to import a song?', en.row === 'My songs' && en.add === 'Import a song' && t === 'How to import a song?', [en, t]);
  await p.context().close(); }

check('aucune erreur JS', errs.length === 0, errs.slice(0, 5));
await browser.close();
console.log(fails.length ? '\n' + fails.length + ' ÉCHEC(S)' : '\nTOUT OK'); process.exit(fails.length ? 1 : 0);
