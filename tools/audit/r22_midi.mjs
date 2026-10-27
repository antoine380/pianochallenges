// r22 — MIDI lot 1 (rapport midi.md §8.4) : pastille d'état M1, toasts et pause M13, carte d'accueil M2, test « joue une note » M8.
// CA-M01 à 04, 08, 09, 13 (+ clés md* FR/EN, CA-M16). Faux Web MIDI de lib.mjs (ports, statechange, permission midi simulée).
// Usage : PORT=8767 NODE_PATH=… PW_CHROMIUM=… node tools/audit/r22_midi.mjs
import fs from 'fs';
import { createRequire } from 'module';
import { readSource } from '../source.mjs'; // source assemblée depuis src/app/ (voir src/app/README.md)
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = process.env.PORT || '8767', URL = `http://localhost:${PORT}/`;
const LIB = fs.readFileSync(new globalThis.URL('./lib.mjs', import.meta.url), 'utf8');
const INIT = mode => /export const INIT = `([\s\S]*?)`;\n/.exec(LIB)[1].split("${'${MODE}'}").join(mode);
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d !== undefined && !ok ? ' — ' + JSON.stringify(d) : '')); if (!ok) fails.push(n); };
const W = (p, ms) => p.waitForTimeout(ms);
const ev = (p, f, a) => p.evaluate(f, a);
const click = (p, s) => ev(p, s => { const e = document.querySelector(s); if (e) e.click(); return !!e; }, s);
const waitFor = async (p, f, ms = 5000, a) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(p, f, a)) return true; await W(p, 100); } return false; };
const st = p => ev(p, () => JSON.parse(localStorage.getItem('memo-gammes-v1') || '{}'));
const vis = (p, id) => ev(p, id => { const e = document.getElementById(id); return !!e && !e.hidden; }, id);
const pill = p => ev(p, () => { const c = document.getElementById('inChip'); return { st: c.dataset.st, lbl: (c.querySelector('.mp-t') || {}).textContent, title: c.title, dot: getComputedStyle(c.querySelector('i')).backgroundColor, good: getComputedStyle(document.body).getPropertyValue('--good').trim(), mb: document.getElementById('mbMidi').className }; });
const toastTxt = p => ev(p, () => { const e = document.getElementById('mdToast'); return e && e.classList.contains('on') ? e.textContent : ''; });
const seed = (input = 'midi', extra = {}) => `(()=>{ try{ if(sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded','1');
  localStorage.setItem('memo-gammes-v1', JSON.stringify(Object.assign({settings:{lang:'fr',notation:'fr',input:'${input}',earV2:true,diffV2:true,midiV2:true,uiSound:false,delay:6,midiSound:true},
    langV2:true,gate:'guest',onb:{done:1},tourDone:1,pwShown:1,introSeen:Object.fromEntries(['hub','learn','games','free','play','quiz','chords','scales','harmony','prog','ear','daily','practice','runner','speed','memory','rank','account','settings','progress','notif','section'].map(k=>[k,1])),
    seenTypes:[],stats:{},secStats:{},xp:500,xpDays:{},streak:{days:0}}, ${JSON.stringify(extra)}))); }catch(e){} })();`;
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
// opts: input, mode (ok|none), name (port 1 renamed), empty (no port at start), granted (permission « midi » already given), extra (state)
async function open(o = {}) {
  const ctx = await b.newContext({ viewport: o.viewport || { width: 1280, height: 800 }, locale: 'fr-FR' });
  await ctx.addInitScript(`window.__midiMode=${JSON.stringify(o.mode || 'ok')};`);
  await ctx.addInitScript(INIT(o.mode || 'ok'));
  await ctx.addInitScript(`(()=>{ const M=window.__midi; if(!M) return; ${o.name ? `M.ports[0].name=${JSON.stringify(o.name)};` : ''} ${o.empty ? `M.access.inputs.clear(); M.ports[0].state='disconnected';` : ''}
    ${o.granted ? `const q=navigator.permissions.query.bind(navigator.permissions); navigator.permissions.query=d=>d&&d.name==='midi'?Promise.resolve({state:'granted'}):q(d);` : ''} })();`);
  await ctx.addInitScript(seed(o.input || 'midi', o.extra || {}));
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.errs = errs; p.ctx = ctx;
  await p.goto(URL); await W(p, 1200); return p; }
const mode = (p, m) => click(p, `#modeNav [data-mode="${m}"]`);
async function learn(p, i = 0) { await mode(p, 'learn'); await W(p, 300); await ev(p, i => document.querySelectorAll('#learnTiles .ptile')[i].click(), i); await W(p, 400); await click(p, '#suGo'); await W(p, 700); }
async function gameSolo(p, i) { await mode(p, 'games'); await W(p, 300); await ev(p, i => document.querySelectorAll('#gameCards .ptile')[i].click(), i); await W(p, 500); await click(p, '#duModes [data-m=solo]'); await W(p, 300); }
const fill = p => ev(p, () => document.getElementById('tFill').style.transform);

// ---- CA-M16 : toutes les clés md* en FR et en EN ----
{ const src = readSource();
  const fr = src.slice(src.indexOf('  fr:{help:'), src.indexOf('  en:{help:')), en = src.slice(src.indexOf('  en:{help:'), src.indexOf('\n};', src.indexOf('  en:{help:')));
  const keys = s => new Set([...s.matchAll(/[\s,{](md[A-Z]\w*):/g)].map(m => m[1]));
  const kf = keys(fr), ke = keys(en), miss = [...kf].filter(k => !ke.has(k)).concat([...ke].filter(k => !kf.has(k)));
  const used = new Set([...src.matchAll(/t\("(md[A-Z]\w*)"\)|data-i="(md[A-Z]\w*)"/g)].map(m => m[1] || m[2]));
  check('CA-M16 clés md* présentes en FR et en EN (' + kf.size + ')', kf.size > 20 && !miss.length, miss);
  check('CA-M16 chaque clé md* utilisée existe', [...used].every(k => kf.has(k)), [...used].filter(k => !kf.has(k))); }

// ---- CA-M01 : états de la pastille ----
let A = await open({ input: 'screen', mode: 'none' });
let P = await pill(A);
check('CA-M01 sans Web MIDI : la pastille dit « Écran »', P.st === 'screen' && P.lbl === 'Écran', P);
await click(A, '#inChip'); await W(A, 300);
check('CA-M01 sans Web MIDI : la pastille ouvre le choix de l’entrée (jamais « connecter »)', await vis(A, 'inputModal') && !(await vis(A, 'midiModal')));
await A.ctx.close();
A = await open({ input: 'screen', empty: true });
P = await pill(A);
check('CA-M01 Web MIDI, jamais branché : « Brancher un clavier »', P.st === 'plug' && P.lbl === 'Brancher un clavier', P);
check('CA-M02/M2 accueil : carte « Branche ton clavier »', await ev(A, () => document.getElementById('hsMidi').classList.contains('md-promo') && /Branche ton clavier/.test(document.getElementById('hsMidi').textContent)));
await click(A, '#hsMidiLater'); await W(A, 150);
check('M2 « Plus tard » : la carte redevient discrète et c’est retenu', await ev(A, () => document.getElementById('hsMidi').classList.contains('md-later')) && !!(await st(A)).midi?.later);
await A.ctx.close();
A = await open({ name: 'Roland FP-10' });
await waitFor(A, () => document.getElementById('inChip').dataset.st === 'ok');
P = await pill(A);
check('CA-M01 un port « Roland FP-10 » : point vert et nom', P.st === 'ok' && P.lbl === 'Roland FP-10' && P.title === 'Roland FP-10' && /md-ok/.test(P.mb), P);
check('CA-M01 le point est vert (--good)', await ev(A, () => { const i = document.querySelector('#inChip i'), d = document.createElement('i'); d.style.background = 'var(--good)'; document.body.appendChild(d); const g = getComputedStyle(d).backgroundColor; d.remove(); return getComputedStyle(i).backgroundColor === g; }));
check('M2 accueil branché : « ✓ Roland FP-10 » + Tester', await ev(A, () => { const c = document.getElementById('hsMidi'); return c.classList.contains('md-ok') && document.getElementById('hsMidiT').textContent === 'Roland FP-10' && document.getElementById('hsMidiBtn').textContent === 'Tester'; }));
check('S.midi.seenAt et hw.name enregistrés', await st(A).then(s => !!s.midi?.seenAt && s.midi.hw?.name === 'Roland FP-10'));
// ---- CA-M13 : ports virtuels ----
await ev(A, () => window.__midi.addVirtual()); await W(A, 300);
P = await pill(A);
check('CA-M13 un port virtuel ne compte pas (pastille, toast)', P.lbl === 'Roland FP-10' && !/session|network/i.test(P.title) && !(await toastTxt(A)), { P, t: await toastTxt(A) });
// ---- M13 hors partie : débranché / rebranché ----
await ev(A, () => window.__midi.disconnect(0)); await W(A, 400);
P = await pill(A);
check('M13 débranché hors partie : toast « Clavier déconnecté », pastille orange', /Clavier déconnecté/.test(await toastTxt(A)) && P.st === 'wait' && P.lbl === 'Clavier : en attente' && !(await vis(A, 'mdLost')), { P, t: await toastTxt(A) });
check('CA-M13 seul le port virtuel reste : la pastille n’est pas verte', P.st !== 'ok');
await ev(A, () => window.__midi.reconnect(0)); await W(A, 400);
check('M13 rebranché (entrée déjà MIDI) : toast « Roland FP-10 connecté »', /Roland FP-10 connecté/.test(await toastTxt(A)), await toastTxt(A));
check('aucune erreur de page (A)', A.errs.length === 0, A.errs);
await A.ctx.close();

// ---- CA-M02 : nom long ----
A = await open({ name: 'Yamaha Clavinova CLP-745 Port 1' });
await waitFor(A, () => document.getElementById('inChip').dataset.st === 'ok');
P = await pill(A);
check('CA-M02 nom > 18 caractères tronqué avec « … », complet dans title', P.lbl.length === 18 && P.lbl.endsWith('…') && P.title === 'Yamaha Clavinova CLP-745 Port 1', P);
await A.ctx.close();

// ---- CA-M03 : branchement à chaud, entrée écran, permission déjà donnée ----
A = await open({ input: 'screen', empty: true, granted: true });
await waitFor(A, () => !!document.getElementById('inChip'));
await ev(A, () => window.__midi.reconnect(0));
const t0 = Date.now(); const seen = await waitFor(A, () => { const e = document.getElementById('mdToast'); return !!e && e.classList.contains('on'); }, 1000);
check('CA-M03 port ajouté : toast « Clavier détecté » en moins de 1 s', seen && /Clavier détecté : Fake Keyboard 61/.test(await toastTxt(A)) && Date.now() - t0 < 1500, await toastTxt(A));
check('CA-M03 … avec « Utiliser » (on jouait sur l’écran)', /Tu jouais sur l'écran/.test(await toastTxt(A)) && await ev(A, () => !!document.querySelector('#mdToast button')));
await click(A, '#mdToast button'); await W(A, 400);
check('CA-M03 « Utiliser » passe S.settings.input à midi', (await st(A)).settings.input === 'midi');
await ev(A, () => window.__midi.addVirtual()); await W(A, 300);
check('CA-M13 port virtuel ajouté : aucun toast', !(await toastTxt(A)) || !/Network/i.test(await toastTxt(A)));
check('aucune erreur de page (M03)', A.errs.length === 0, A.errs);
await A.ctx.close();

// ---- CA-M08 / M09 : test « joue une note » ----
A = await open({ name: 'Roland FP-10' });
await waitFor(A, () => document.getElementById('inChip').dataset.st === 'ok');
await click(A, '#inChip'); await W(A, 300);
check('CA-M08 la pastille ouvre la fenêtre Clavier MIDI, test en tête', await vis(A, 'midiModal') && await vis(A, 'mdTest') && /Appuie sur n'importe quelle touche/.test(await ev(A, () => document.getElementById('mtMsg').textContent)));
await ev(A, () => window.__midi.noteOn(64, 96)); await W(A, 200);
let T = await ev(A, () => ({ name: document.getElementById('mtName').textContent, on: [...document.querySelectorAll('#mtKb .on')].map(e => +e.dataset.m), msg: document.getElementById('mtMsg').textContent, vel: document.getElementById('mtVel').textContent }));
check('CA-M08 une note : la bonne touche s’allume et son nom s’affiche', T.name === 'Mi' && T.on.length === 1 && T.on[0] === 64 && /parle à Piano Challenges/.test(T.msg) && /Roland FP-10/.test(T.msg) && T.vel === '96', T);
await ev(A, () => window.__midi.noteOn(60, 20)); await ev(A, () => window.__midi.noteOn(62, 110)); await W(A, 200);
check('CA-M08 vélocités 20 puis 110 : « Sensible au toucher ✓ »', /Sensible au toucher ✓/.test(await ev(A, () => document.getElementById('mtTouchRes').textContent)) && (await st(A)).midi.hw.vel === true);
check('CA-M08 les notes du test ne jouent pas dans l’exercice (fenêtre ouverte)', await ev(A, () => document.querySelectorAll('#kbd .k-hit, #kbd .k-bad').length === 0));
await click(A, '#midiX'); await W(A, 200); await click(A, '#inChip'); await W(A, 300);
await ev(A, () => { window.__midi.noteOn(60, 100); window.__midi.noteOn(64, 100); }); await W(A, 200);
check('CA-M08 vélocités 100 puis 100 : S.midi.hw.vel = false', (await st(A)).midi.hw.vel === false && /pas sensible/.test(await ev(A, () => document.getElementById('mtTouchRes').textContent)));
await click(A, '#mtTwice [data-v=yes]'); await W(A, 150);
check('CA-M09 « Tu entends le son deux fois ? » Oui → son de l’app coupé', (await st(A)).settings.midiSound === false && await ev(A, () => !document.getElementById('optMidiSound').checked));
await click(A, '#mtTwice [data-v=none]'); await W(A, 150);
check('CA-M09 « Je n’entends rien » → son de l’app activé', (await st(A)).settings.midiSound === true);
await click(A, '#mdChange'); await W(A, 300);
check('M1 « Changer d’entrée » ouvre le choix de l’entrée', await vis(A, 'inputModal') && !(await vis(A, 'midiModal')));
await A.keyboard.press('Escape'); await W(A, 200);
check('aucune erreur de page (M08)', A.errs.length === 0, A.errs);
await A.ctx.close();

// ---- CA-M04 : débranché en pleine partie LEARN ----
A = await open();
await waitFor(A, () => document.getElementById('midiBtn').classList.contains('on'));
await learn(A, 0);
await ev(A, () => { window.__midi.noteOn(61); setTimeout(() => window.__midi.noteOff(61), 60); }); await W(A, 400); // a first (wrong) note: the game is under way
const f1 = await fill(A); await W(A, 500); const f2 = await fill(A);
check('LEARN : le chrono tourne avant le débranchement', f1 !== f2, { f1, f2 });
const score0 = await ev(A, () => document.getElementById('sbVal')?.textContent);
await ev(A, () => window.__midi.disconnect(0)); await W(A, 300);
check('CA-M04 port retiré en partie LEARN : fenêtre « Ton clavier s’est déconnecté »', await vis(A, 'mdLost') && /Rebranche ton clavier ou continue à l'écran/.test(await ev(A, () => document.getElementById('mdLost').textContent)));
const g1 = await fill(A); await W(A, 900); const g2 = await fill(A);
check('CA-M04 … la partie est en pause (le chrono ne s’écoule pas)', g1 === g2, { g1, g2 });
await ev(A, () => window.__midi.reconnect(0)); await W(A, 400);
check('CA-M04 rebranché : « reprise dans 3 s », fenêtre encore ouverte', await vis(A, 'mdLost') && /reprise dans/.test(await ev(A, () => document.getElementById('mdLostWaitT').textContent)));
await W(A, 3000);
check('CA-M04 … après 3 s la partie reprend', !(await vis(A, 'mdLost')) && await ev(A, () => !document.getElementById('app').inert));
const h1 = await fill(A); await W(A, 500); const h2 = await fill(A);
check('CA-M04 … le chrono repart', h1 !== h2, { h1, h2 });
await ev(A, () => window.__midi.disconnect(0)); await W(A, 300);
check('CA-M04 second débranchement : pause à nouveau', await vis(A, 'mdLost'));
await click(A, '#mdGoScreen'); await W(A, 400);
check('CA-M04 « Continuer sur l’écran » : entrée écran, partie reprise, score gardé', (await st(A)).settings.input === 'screen' && !(await vis(A, 'mdLost')) && await ev(A, () => document.body.dataset.page === 'practice' && !document.getElementById('gameEnd').hidden) && await ev(A, () => document.getElementById('sbVal')?.textContent) === score0, { input: (await st(A)).settings.input });
await ev(A, () => window.__midi.reconnect(0)); await W(A, 400);
check('M13 rebranché après « Continuer sur l’écran » : toast « Clavier détecté » + Utiliser', /Clavier détecté/.test(await toastTxt(A)) && /Utiliser/.test(await toastTxt(A)), await toastTxt(A));
check('aucune erreur de page (M04)', A.errs.length === 0, A.errs);
await A.ctx.close();

// ---- M13 : débranché en plein jeu (Saute-notes) ----
A = await open();
await waitFor(A, () => document.getElementById('midiBtn').classList.contains('on'));
await gameSolo(A, 0);
await ev(A, () => { const c = document.getElementById(document.getElementById('rnStage').hidden ? 'gmBoard' : 'rnCanvas'); c.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); }); await W(A, 900);
await ev(A, () => window.__midi.disconnect(0)); await W(A, 300);
const r1 = await ev(A, () => document.getElementById('rnScore').textContent); await W(A, 700); const r2 = await ev(A, () => document.getElementById('rnScore').textContent);
check('jeu : débranché = fenêtre de pause et défilement arrêté', await vis(A, 'mdLost') && r1 === r2 && +r1 > 0, { r1, r2 });
// compte à rebours de 3 s (setInterval) puis le score monte d'environ 4 points/s : on attend la fermeture (≤ 6 s, machine chargée)
// puis la reprise du score (≤ 3 s) au lieu d'un délai fixe de 3,6 s qui laissait parfois moins d'un point d'avance
const tRe = Date.now(); await ev(A, () => window.__midi.reconnect(0)); await W(A, 2500);
const stillAt25 = await vis(A, 'mdLost');
const closed = await waitFor(A, () => { const e = document.getElementById('mdLost'); return !e || e.hidden; }, 6000); const dRe = Date.now() - tRe;
const moved = closed && await waitFor(A, r2 => +document.getElementById('rnScore').textContent > +r2, 3000, r2);
check('jeu : rebranché = reprise après 3 s, le défilement repart', stillAt25 && closed && moved && dRe >= 2900, { stillAt25, closed, moved, dRe, r2, now: await ev(A, () => document.getElementById('rnScore').textContent) });
check('aucune erreur de page (jeu)', A.errs.length === 0, A.errs);
await A.ctx.close();

await b.close();
console.log(fails.length ? `\n${fails.length} échec(s)` : '\nr22 OK');
process.exit(fails.length ? 1 : 0);
