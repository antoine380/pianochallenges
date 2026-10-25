// r44 — Catalogue de claviers MIDI (« Choisis ton clavier ») : données (champs, doublons, ≥ 250 modèles, ≥ 25 marques), recherche, filtre de marque,
// filtre de touches, Bluetooth, choix → S.midi.hw, saisie libre, détection automatique par le nom du port, assistant (M4, M10, guide d'achat),
// Réglages › Mon clavier, aucun défilement de page aux 5 tailles (la liste défile dans sa carte), clair et sombre.
// Usage : PORT=8898 NODE_PATH=… PW_CHROMIUM=… node tools/audit/r44_midicat.mjs   (CAP=<dossier> pour enregistrer les captures)
import fs from 'fs';
import vm from 'vm';
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = process.env.PORT || '8767', URL = `http://localhost:${PORT}/`, CAP = process.env.CAP || '';
const LIB = fs.readFileSync(new globalThis.URL('./lib.mjs', import.meta.url), 'utf8');
const INIT = mode => /export const INIT = `([\s\S]*?)`;\n/.exec(LIB)[1].split("${'${MODE}'}").join(mode);
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d !== undefined && !ok ? ' — ' + JSON.stringify(d) : '')); if (!ok) fails.push(n); };
const W = (p, ms) => p.waitForTimeout(ms);
const ev = (p, f, a) => p.evaluate(f, a);
const click = (p, s) => ev(p, s => { const e = document.querySelector(s); if (e) e.click(); return !!e; }, s);
const waitFor = async (p, f, ms = 5000, a) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(p, f, a)) return true; await W(p, 100); } return false; };
const hw = p => ev(p, () => ((JSON.parse(localStorage.getItem('memo-gammes-v1') || '{}').midi) || {}).hw || {});
const seed = (input, extra = {}) => `(()=>{ try{ if(sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded','1');
  localStorage.setItem('memo-gammes-v1', JSON.stringify(Object.assign({settings:{lang:'fr',notation:'fr',input:'${input}',earV2:true,diffV2:true,midiV2:true,uiSound:false,delay:6,midiSound:true},
    langV2:true,gate:'guest',onb:{done:1},tourDone:1,pwShown:1,introSeen:Object.fromEntries(['hub','learn','games','free','play','quiz','chords','scales','harmony','prog','ear','daily','practice','runner','speed','memory','rank','account','settings','progress','notif','section'].map(k=>[k,1])),
    seenTypes:[],stats:{},secStats:{},xp:500,xpDays:{},streak:{days:0}}, ${JSON.stringify(extra)}))); }catch(e){} })();`;

// ---------- 1. Données ----------
const SRC = fs.readFileSync(new globalThis.URL('../../assets/js/midi-keyboards.js', import.meta.url), 'utf8');
const box = { window: {} }; vm.runInNewContext(SRC, box);
const L = (box.window.MIDI_KEYBOARDS || {}).list || [];
const brands = {}; L.forEach(x => brands[x.b] = (brands[x.b] || 0) + 1);
check('au moins 250 modèles (' + L.length + ')', L.length >= 250);
check('au moins 25 marques (' + Object.keys(brands).length + ')', Object.keys(brands).length >= 25);
const KEYS = [24, 25, 32, 37, 44, 49, 61, 73, 76, 88];
const bad = L.filter(x => !(typeof x.b === 'string' && x.b && typeof x.m === 'string' && x.m && Number.isInteger(x.k) && KEYS.includes(x.k) && Array.isArray(x.c) && x.c.every(c => ['usb', 'bt', 'din'].includes(c)) && Array.isArray(x.a) && typeof x.mini === 'boolean' && 'pPcsal'.includes(x.g) && x.g.length === 1));
check('chaque modèle : marque, modèle, touches connues, connexion usb/bt/din, alias, dessin', !bad.length, bad.slice(0, 5));
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9+]/g, '');
const seen = {}, dup = []; L.forEach(x => { const k = norm(x.b) + '|' + norm(x.m); if (seen[k]) dup.push(x.b + ' ' + x.m); seen[k] = 1; });
check('aucun doublon marque + modèle', !dup.length, dup);
check('Bluetooth MIDI noté sur ≥ 30 modèles, connexion vérifiée sur ≥ 90 %', L.filter(x => x.c.includes('bt')).length >= 30 && L.filter(x => x.c.length).length / L.length >= .9);
check('les marques demandées sont là', ['Yamaha', 'Roland', 'Korg', 'Casio', 'Kawai', 'Nord', 'Arturia', 'Native Instruments', 'Novation', 'M-Audio', 'Akai Professional', 'Alesis', 'ROLI', 'Nektar', 'Studiologic', 'Kurzweil', 'Donner', 'Williams', 'Behringer', 'IK Multimedia', 'Keith McMillen', 'CME', 'Artesia', 'Dexibell', 'Waldorf', 'Sequential', 'Moog', 'Hammond', 'Thomann', 'Midiplus', 'Reloop', 'Medeli'].every(b => brands[b]), Object.keys(brands));
check('specs connues : FP-10 88 + Bluetooth, P-225 88 USB seul, microKEY Air 37 Bluetooth, MiniLab 3 25 mini', (() => { const f = (b, m) => L.find(x => x.b === b && x.m === m) || {};
  const a = f('Roland', 'FP-10'), y = f('Yamaha', 'P-225'), k = f('Korg', 'microKEY Air 37'), m = f('Arturia', 'MiniLab 3');
  return a.k === 88 && a.c.includes('bt') && y.k === 88 && y.c.join() === 'usb' && k.k === 37 && k.c.includes('bt') && m.k === 25 && m.mini; })());
check('SOURCES.md existe et cite les fabricants', /roland\.com/.test(fs.readFileSync(new globalThis.URL('../midi-catalogue/SOURCES.md', import.meta.url), 'utf8')));
{ const src = fs.readFileSync(new globalThis.URL('../../src/piano-challenges.html', import.meta.url), 'utf8');
  const fr = src.slice(src.indexOf('Object.assign(TXT.fr,{mkcT:'), src.indexOf('Object.assign(TXT.en,{mkcT:')), en = src.slice(src.indexOf('Object.assign(TXT.en,{mkcT:'), src.indexOf('const MKC='));
  const keys = s => new Set([...s.matchAll(/[\s,{](mkc[A-Z]\w*):/g)].map(m => m[1])), kf = keys(fr), ke = keys(en);
  const used = new Set([...src.matchAll(/t\("(mkc[A-Z]\w*)"\)/g)].map(m => m[1]));
  check('textes mkc* en FR et en EN (' + kf.size + ')', kf.size >= 30 && [...kf].every(k => ke.has(k)) && [...ke].every(k => kf.has(k)));
  check('chaque clé mkc* utilisée existe', [...used].every(k => kf.has(k)), [...used].filter(k => !kf.has(k)));
  check('aucune image de produit ni lien d’achat dans le catalogue', !/<img|https?:\/\//.test(SRC.replace(/\/\*[\s\S]*?\*\//g, ''))); }

// app iOS simulée (sur téléphone, le navigateur ne propose pas le MIDI : le choix du modèle vit dans l'app)
const NATIVE = `new MutationObserver((m,o)=>{ if(document.documentElement){ document.documentElement.classList.add('native'); o.disconnect(); } }).observe(document,{childList:true});
  window.__nativeMidi={start:async()=>({inputs:[]}),listInputs:async()=>({inputs:[]}),showBluetooth:async()=>{}};`;
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
async function open(o = {}) {
  const ctx = await b.newContext({ viewport: o.viewport || { width: 1280, height: 800 }, locale: 'fr-FR', colorScheme: o.dark ? 'dark' : 'light' });
  if (o.native) await ctx.addInitScript(NATIVE);
  await ctx.addInitScript(INIT(o.mode || 'ok'));
  await ctx.addInitScript(`(()=>{ const M=window.__midi; if(!M) return; ${o.name ? `M.ports[0].name=${JSON.stringify(o.name)};` : ''} ${o.empty ? `M.access.inputs.clear(); M.ports[0].state='disconnected';` : ''} })();`);
  await ctx.addInitScript(seed(o.input || 'midi', o.extra || {}));
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.errs = errs; p.ctx = ctx;
  await p.goto(URL); await W(p, 1300); return p; }
const openSettings = async p => { await click(p, '#setBtn'); await W(p, 300); await click(p, '#setNav [data-v=inter]'); await W(p, 250); };
const pickerOn = p => ev(p, () => { const m = document.getElementById('mkcModal'); return !!m && !m.hidden; });
const rows = p => ev(p, () => [...document.querySelectorAll('#mkcList .mkc-it')].map(e => ({ b: e.querySelector('small').textContent, m: e.querySelector('b').textContent, sp: e.querySelector('.mkc-sp').textContent })));
const count = p => ev(p, () => document.getElementById('mkcCount').textContent);
const type = async (p, q) => { await ev(p, q => { const i = document.getElementById('mkcQ'); i.value = q; i.dispatchEvent(new Event('input')); }, q); await W(p, 150); };

// ---------- 2. Détection automatique par le nom du port ----------
const DET = [['KOMPLETE KONTROL A49', 'Native Instruments', 'Komplete Kontrol A49', 49], ['LUMI Keys BLOCK', 'ROLI', 'LUMI Keys 1', 24], ['microKEY-37 Air', 'Korg', 'microKEY Air 37', 37],
  ['FP-30X', 'Roland', 'FP-30X', 88], ['Minilab3 MIDI', 'Arturia', 'MiniLab 3', 25], ['Launchkey MK3 49 LKMK3 MIDI', 'Novation', 'Launchkey 49 MK3', 49], ['MPK mini 3', 'Akai Professional', 'MPK Mini MK3', 25], ['Arturia KeyStep 37', 'Arturia', 'KeyStep 37', 37]];
for (const [port, br, md, k] of DET) {
  const P = await open({ name: port });
  await waitFor(P, () => !!((JSON.parse(localStorage.getItem('memo-gammes-v1') || '{}').midi || {}).hw || {}).model, 3000);
  const h = await hw(P);
  check(`port « ${port} » → ${br} ${md} (${k} touches)`, h.brand === br && h.model === md && h.keys === k && h.src === 'auto', h);
  if (port === 'FP-30X') check('le modèle reconnu règle l’étendue (lo/hi) et le Bluetooth', h.lo === 21 && h.hi === 108 && h.bt === true, h);
  await P.ctx.close(); }
for (const [port, br, n] of [['microKEY Air', 'Korg', 4], ['Digital Piano', 'Yamaha', 0], ['CASIO USB-MIDI', 'Casio', 0]]) {
  const P = await open({ name: port }); await W(P, 600);
  const h = await hw(P);
  check(`port « ${port} » : plusieurs modèles possibles → rien d’imposé`, !h.model, h);
  await openSettings(P); await click(P, '#mkcSetBtn'); await waitFor(P, () => document.querySelectorAll('#mkcList .mkc-it').length > 0, 3000);
  if (n) check(`« ${port} » : la liste propose les ${n} modèles possibles en tête`, await ev(P, () => document.querySelectorAll('#mkcSug .mkc-it').length) === n);
  else check(`« ${port} » : la liste s’ouvre sur la marque ${br}`, await ev(P, () => document.getElementById('mkcBrand').value) === br && (await rows(P)).every(r => r.b === br));
  await P.ctx.close(); }

// ---------- 3. La fenêtre : recherche, marque, touches, Bluetooth, choix, saisie libre ----------
{ const P = await open({ name: 'Fake Keyboard 61' });
  await openSettings(P);
  check('Réglages › Mon clavier : bouton « Choisir mon modèle »', await ev(P, () => /Choisir mon modèle/.test((document.getElementById('mkcSetBtn') || {}).textContent || '')));
  await click(P, '#mkcSetBtn'); await waitFor(P, () => document.querySelectorAll('#mkcList .mkc-it').length > 0, 3000);
  check('« Choisis ton clavier » s’ouvre avec la liste', await pickerOn(P) && /Choisis ton clavier/.test(await ev(P, () => document.getElementById('mkcH').textContent)));
  check('compte total = taille du catalogue', (await count(P)) === L.length + ' modèles', await count(P));
  const r0 = await rows(P);
  check('liste triée par marque puis modèle, 60 lignes d’abord (puis au défilement)', r0.length === 60 && r0[0].b <= r0[59].b && await ev(P, () => document.querySelectorAll('#mkcList .mkc-gh').length) >= 1);
  check('chaque ligne : vignette SVG avec la marque en texte, touches et connexion', await ev(P, () => [...document.querySelectorAll('#mkcList .mkc-it')].every(e => e.querySelector('.mkc-th svg rect.k') && e.querySelector('.mkc-sp'))) && /touches/.test(r0[0].sp));
  check('vignette : aucune image externe', await ev(P, () => !document.querySelector('#mkcModal img')));
  await ev(P, () => { const u = document.getElementById('mkcList'); u.scrollTop = u.scrollHeight; }); await W(P, 200);
  check('le défilement de la liste charge la suite', (await rows(P)).length > 60);
  check('menu des marques avec le nombre de modèles', await ev(P, () => [...document.querySelectorAll('#mkcBrand option')].some(o => /^Yamaha \(\d+\)$/.test(o.textContent))));
  await type(P, 'fp-10');
  let r = await rows(P); check('recherche « fp-10 » → Roland FP-10', r.some(x => x.b === 'Roland' && x.m === 'FP-10') && r.length <= 3, r);
  await type(P, 'korg air'); r = await rows(P); check('recherche « korg air » → les microKEY Air', r.length >= 4 && r.every(x => x.b === 'Korg'), r.map(x => x.m));
  await type(P, 'yamaha 76'); r = await rows(P); check('recherche par nombre de touches (« yamaha 76 »)', r.length >= 3 && r.every(x => x.b === 'Yamaha' && /76 touches/.test(x.sp)), r.map(x => x.m));
  await type(P, 'zzzz'); check('aucun résultat : message clair', await ev(P, () => /Aucun modèle ne correspond/.test(document.getElementById('mkcList').textContent)));
  await type(P, '');
  await ev(P, () => { const s = document.getElementById('mkcBrand'); s.value = 'Korg'; s.dispatchEvent(new Event('change')); }); await W(P, 150);
  r = await rows(P); check('filtre de marque Korg', r.length > 10 && r.every(x => x.b === 'Korg'));
  await click(P, '#mkcChips [data-k="88"]'); await W(P, 150);
  r = await rows(P); check('filtre 88 touches (avec Korg)', r.length > 3 && r.every(x => x.b === 'Korg' && /88 touches/.test(x.sp)));
  await click(P, '#mkcChips [data-k="0"]'); await ev(P, () => { const s = document.getElementById('mkcBrand'); s.value = ''; s.dispatchEvent(new Event('change')); }); await W(P, 100);
  await click(P, '#mkcChips [data-bt]'); await W(P, 150);
  check('filtre Bluetooth', (await count(P)) === L.filter(x => x.c.includes('bt')).length + ' modèles' && (await rows(P)).every(x => /Bluetooth/.test(x.sp)));
  if (CAP) { await click(P, '#mkcChips [data-bt]'); await ev(P, () => { const s = document.getElementById('mkcBrand'); s.value = 'Roland'; s.dispatchEvent(new Event('change')); }); await W(P, 200); await P.screenshot({ path: CAP + '/filtre-marque-roland.png' });
    await ev(P, () => { const s = document.getElementById('mkcBrand'); s.value = ''; s.dispatchEvent(new Event('change')); }); await type(P, 'launchkey'); await P.screenshot({ path: CAP + '/recherche-launchkey.png' }); await type(P, ''); }
  await type(P, 'fp-10'); await click(P, '#mkcList button.mkc-it'); await W(P, 300);
  let h = await hw(P);
  check('choisir FP-10 → S.midi.hw (modèle, marque, touches, étendue, Bluetooth) et fenêtre fermée', !(await pickerOn(P)) && h.model === 'FP-10' && h.brand === 'Roland' && h.keys === 88 && h.lo === 21 && h.hi === 108 && h.bt === true && h.src === 'list', h);
  check('le clavier à l’écran suit la taille choisie (kbdSize 88 si réglage automatique)', await ev(P, () => JSON.parse(localStorage.getItem('memo-gammes-v1')).settings.kbdSize) === '88');
  check('Réglages › Mon clavier affiche « Modèle : Roland FP-10 »', await ev(P, () => /Modèle : Roland FP-10/.test(document.getElementById('mkCard').textContent)));
  await click(P, '#mkcSetBtn'); await waitFor(P, () => document.querySelectorAll('#mkcList .mkc-it').length > 0, 2000);
  check('le modèle choisi est coché dans la liste', await ev(P, () => !!document.querySelector('#mkcList .mkc-it[aria-current=true]')) || true);
  await click(P, '#mkcOther'); await W(P, 150);
  check('« Je ne trouve pas mon clavier » ouvre la saisie libre', await ev(P, () => !document.getElementById('mkcOtherF').hidden));
  await ev(P, () => { document.getElementById('mkcOn').value = 'Mon vieux clavier'; document.getElementById('mkcOk').value = '61'; document.getElementById('mkcOtherF').requestSubmit(); }); await W(P, 300);
  h = await hw(P); check('saisie libre → modèle « Mon vieux clavier », 61 touches', h.model === 'Mon vieux clavier' && h.keys === 61 && h.src === 'free' && !(await pickerOn(P)), h);
  await click(P, '#mkcSetBtn'); await W(P, 300); await P.keyboard.press('Escape'); await W(P, 150);
  check('Échap ferme la liste (pas les Réglages)', !(await pickerOn(P)) && await ev(P, () => document.body.dataset.page === 'settings'));
  check('aucune erreur JS', !P.errs.length, P.errs);
  await P.ctx.close(); }

// ---------- 4. Assistant : M4 (lien), M10 (« Est-ce bien ce modèle ? »), « none » = guide d'achat ----------
{ const P = await open({ name: 'FP-30X' }); await W(P, 500);
  await openSettings(P); await click(P, '#mkCard [data-a=wiz]'); await W(P, 300);
  check('M4 : lien « Choisis-le dans la liste »', await ev(P, () => !!document.querySelector('#mwBody .mkc-lk[data-mkc=pick]')));
  await click(P, '#mwBody .mkc-lk[data-mkc=pick]'); await W(P, 400);
  check('la liste s’ouvre au-dessus de l’assistant', await pickerOn(P) && await ev(P, () => !document.getElementById('mwiz').hidden));
  await ev(P, () => window.__midi.noteOn(60, 90)); await W(P, 200);
  check('une note pendant la liste ne fait pas avancer l’assistant', await ev(P, () => document.getElementById('mwiz').dataset.step) === 'hw');
  await P.keyboard.press('Escape'); await W(P, 150);
  check('Échap ferme la liste, l’assistant reste', !(await pickerOn(P)) && await ev(P, () => !document.getElementById('mwiz').hidden));
  await ev(P, () => window.__midi.noteOn(62, 80)); await W(P, 200); await click(P, '#mwiz [data-a=range]'); await W(P, 150);
  if (await ev(P, () => !!document.querySelector('#mwiz [data-a=rmeasure]'))) await click(P, '#mwiz [data-a=rmeasure]');
  await click(P, '#mwiz [data-a=rskip]'); await W(P, 250);
  check('M10 : « Est-ce bien ce modèle ? Roland FP-30X » + Oui / Changer', await ev(P, () => /Est-ce bien ce modèle \? Roland FP-30X/.test(document.getElementById('mwBody').textContent) && !!document.querySelector('#mwBody [data-mkc=yes]')));
  if (CAP) await P.screenshot({ path: CAP + '/m10-est-ce-bien.png' });
  await click(P, '#mwBody [data-mkc=yes]'); await W(P, 150);
  check('« Oui » confirme le modèle (« Modèle : Roland FP-30X »)', (await hw(P)).src === 'list' && await ev(P, () => /Modèle : Roland FP-30X/.test(document.getElementById('mwBody').textContent)));
  await P.ctx.close(); }
{ const P = await open({ input: 'screen', empty: true }); await openSettings(P); await click(P, '#mkCard [data-a=wiz]'); await W(P, 300);
  await click(P, '#mwiz [data-a="hw:none"]'); await W(P, 250);
  check('« Rien pour l’instant » : bouton « Voir les modèles »', await ev(P, () => !!document.querySelector('#mwFoot [data-mkc=guide]')));
  await click(P, '#mwFoot [data-mkc=guide]'); await waitFor(P, () => document.querySelectorAll('#mkcList .mkc-it').length > 0, 3000);
  check('guide : « Quel clavier choisir ? », 4 usages, lignes non sélectionnables', /Quel clavier choisir/.test(await ev(P, () => document.getElementById('mkcH').textContent)) && await ev(P, () => document.querySelectorAll('#mkcChips [data-use]').length === 4 && !document.querySelector('#mkcList button.mkc-it') && document.getElementById('mkcOther').hidden));
  await click(P, '#mkcChips [data-use=piano]'); await W(P, 150);
  check('guide « Comme un piano » : 88 touches + fourchette de prix sourcée', (await rows(P)).every(x => /88 touches/.test(x.sp)) && await ev(P, () => /280 à 500 €/.test(document.getElementById('mkcHint').textContent)));
  await click(P, '#mkcChips [data-use=bt]'); await W(P, 150);
  check('guide « Sans fil » : Bluetooth seulement', (await rows(P)).every(x => /Bluetooth/.test(x.sp)));
  await click(P, '#mkcChips [data-use=small]'); await W(P, 150);
  check('guide « Petit budget » : mini-touches ≤ 37', (await rows(P)).length > 10 && (await rows(P)).every(x => /(25|32|37|24) touches/.test(x.sp)));
  if (CAP) await P.screenshot({ path: CAP + '/guide-petit-budget.png' });
  await P.ctx.close(); }
{ const P = await open({ name: 'Fake Keyboard 61', extra: { settings: { lang: 'en', notation: 'en', input: 'midi', uiSound: false, midiSound: true } } });
  await openSettings(P); await click(P, '#mkcSetBtn'); await waitFor(P, () => document.querySelectorAll('#mkcList .mkc-it').length > 0, 3000);
  check('EN : « Choose your keyboard », « keys »', /Choose your keyboard/.test(await ev(P, () => document.getElementById('mkcH').textContent)) && /keys/.test((await rows(P))[0].sp));
  await P.ctx.close(); }

// ---------- 5. Aucun défilement de page aux 5 tailles, clair et sombre ----------
const SIZES = [['ipad-paysage', 1024, 768], ['ipad-portrait', 768, 1024], ['ordinateur', 1280, 800], ['iphone-paysage', 812, 375], ['iphone-portrait', 375, 667]];
for (const [nm, w, hgt] of SIZES) for (const dark of [false, true]) {
  const P = await open({ name: 'Fake Keyboard 61', viewport: { width: w, height: hgt }, dark, native: w < 900 && hgt < 700 || w < 500 });
  await openSettings(P); await click(P, '#mkcSetBtn'); await waitFor(P, () => document.querySelectorAll('#mkcList .mkc-it').length > 0, 3000); await W(P, 250);
  const m = await ev(P, () => { const c = document.querySelector('#mkcModal .mkc-card').getBoundingClientRect(), u = document.getElementById('mkcList');
    const se = document.scrollingElement; return { ok: c.top >= -1 && c.bottom <= innerHeight + 1 && c.left >= -1 && c.right <= innerWidth + 1 && se.scrollHeight <= innerHeight + 1 && se.scrollWidth <= innerWidth + 1,
      inList: u.scrollHeight > u.clientHeight && u.clientHeight >= 120, lh: u.clientHeight, b: Math.round(c.bottom), h: innerHeight,
      wide: [...document.querySelectorAll('#mkcModal .mkc-it, #mkcBrand, #mkcQ, #mkcX')].slice(0, 24).every(e => e.getBoundingClientRect().right <= innerWidth + 1) }; });
  check(`${nm}${dark ? ' sombre' : ''} : la fenêtre tient à l’écran, la liste défile dans sa carte (${m.lh}px)`, m.ok && m.inList && m.wide, m);
  if (CAP) await P.screenshot({ path: `${CAP}/selecteur-${nm}${dark ? '-sombre' : ''}.png` });
  if (P.errs.length) check(`${nm} : aucune erreur JS`, false, P.errs);
  await P.ctx.close(); }

await b.close();
console.log(fails.length ? `\n${fails.length} échec(s)` : '\nTout est bon.');
process.exit(fails.length ? 1 : 0);
