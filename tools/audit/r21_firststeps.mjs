// First steps, lot 1 (Oct 2026): a complete beginner plays a C, sees the path (D6), does lessons 1 to 3, leaves, comes back and picks up.
// Covers CA-03 (beginner → D6 → P01, no chord game; other levels unchanged), CA-05 (P01 stars 3 / 2 / 1 for 0 / 3 / 6 mistakes),
// CA-06 (3 mistakes → « Show me », the exercise still ends), CA-07 (P02 middle C: note 60 at MIDI, a C4 at the simulated mic),
// CA-12 (pick up at the same step from the hub, from step 1 after 24 h), CA-13 (a lone MIDI C on the hub picks up),
// CA-16 (no scroll: path, lesson, bravo, LEARN map, hub card at 5 sizes), CA-18 (every pp* text in FR and EN).
// Usage: python3 -m http.server <PORT> at the repo root, then PORT=<PORT> node tools/audit/r21_firststeps.mjs (CPU=4 : processeur ralenti, comme le runner de nuit)
import { readFileSync } from 'fs';
import { launch, URL, INIT } from './lib.mjs';
import { readSource } from '../source.mjs'; // source assemblée depuis src/app/ (voir src/app/README.md)
const W = (p, ms) => p.waitForTimeout(ms);
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d !== undefined && !ok ? ' — ' + JSON.stringify(d) : '')); if (!ok) fails.push(n); };
const errs = [];
const seed = (extra = '') => `(()=>{ try{ if(sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded','1'); const S={settings:{lang:"fr",notation:"fr",input:"midi"},langV2:true,gate:"guest",onb:{done:1,level:"debut"},tourDone:1,
  introSeen:Object.fromEntries(["hub","learn","games","free","play","quiz","chords","scales","harmony","prog","ear","daily","practice","section"].map(k=>[k,1])),seenTypes:[],stats:{},secStats:{},xp:0,xpDays:{},streak:{days:0}}; ${extra}
  localStorage.setItem("memo-gammes-v1",JSON.stringify(S)); }catch(e){} })();`;
async function ctx(browser, { w = 1180, h = 820, init = '', gum = 'none', mobile = false, dark = false } = {}) {
  const c = await browser.newContext({ viewport: { width: w, height: h }, locale: 'fr-FR', isMobile: mobile, hasTouch: mobile, colorScheme: dark ? 'dark' : 'light' });
  await c.addInitScript(`window.__midiMode="ok"; window.__gumMode=${JSON.stringify(gum)};`); await c.addInitScript(INIT.replace('${MODE}', 'ok')); if (init) await c.addInitScript(init);
  const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message));
  if (+process.env.CPU > 1) await (await c.newCDPSession(p)).send('Emulation.setCPUThrottlingRate', { rate: +process.env.CPU }); // CPU=4: a slow runner
  return p; }
const S = p => p.evaluate(() => JSON.parse(localStorage.getItem('memo-gammes-v1')));
const note = (p, n) => p.evaluate(n => { window.__midi.noteOn(n); setTimeout(() => window.__midi.noteOff(n), 60); }, n);
// on a phone (web), the app switches the input to « screen » and, since MIDI 4 (28/10), ignores MIDI notes there: tap the screen key instead
const play = (p, n) => p.evaluate(n => { const inp = (JSON.parse(localStorage.getItem('memo-gammes-v1')) || {settings:{}}).settings.input;
  if (inp !== 'screen') { window.__midi.noteOn(n); setTimeout(() => window.__midi.noteOff(n), 60); return 'midi'; }
  const el = document.querySelector('#kbd [data-m="' + n + '"]'); if (!el) return 'nokey'; const r = el.getBoundingClientRect(), o = { bubbles: true, pointerId: 7, clientX: r.x + r.width / 2, clientY: r.bottom - 8 };
  el.dispatchEvent(new PointerEvent('pointerdown', o)); setTimeout(() => el.dispatchEvent(new PointerEvent('pointerup', o)), 60); return 'screen'; }, n);
const waitView = async (p, want, ms = 5000) => { const t0 = Date.now(); let v; while ((v = await view(p)) !== want && Date.now() - t0 < ms) await W(p, 100); return v; };
const say = p => p.evaluate(() => (document.getElementById('ppSay') || {}).textContent || '');
const view = p => p.evaluate(() => { const P = document.getElementById('ppPanel'); return document.body.dataset.page !== 'pp' ? document.body.dataset.page : P.querySelector('.pp-path') ? 'path' : P.querySelector('.pp-bravo') ? 'bravo' : P.querySelector('.pp-opencard') ? 'open' : P.querySelector('.pp-lesson') ? 'lesson' : '?'; });
const stepLbl = p => p.evaluate(() => (document.querySelector('.pp-mid .pp-k') || {}).textContent || '');
const click = (p, sel) => p.evaluate(s => document.querySelector(s).click(), sel);
const PCN = { 'Do': 0, 'Ré': 2, 'Mi': 4, 'Fa': 5, 'Sol': 7, 'La': 9, 'Si': 11 };
// one P01 item answered right: a black key of a group of 2 (C♯) or 3 (F♯)
const p01Right = async p => { const s = await say(p); await note(p, /groupe de 2/.test(s) ? 61 : 66); await W(p, 1000); };
const p01Wrong = async p => { await note(p, 64); await W(p, 380); };
async function p01Play(p, wrongPlan = [], showAt = -1) { // wrongPlan[i] = mistakes on item i (0..9)
  for (let i = 0; i < 10; i++) { for (let k = 0; k < (wrongPlan[i] || 0); k++) await p01Wrong(p);
    if (i === showAt) { await W(p, 300); const vis = await p.evaluate(() => { const h = document.getElementById('autoHelp'); return !!h && !h.hidden && document.getElementById('ppPanel').contains(h) && !!h.querySelector('[data-a=show]'); });
      check('CA-06 trois erreurs : « Montre-moi » proposé dans la leçon', vis);
      await p.evaluate(() => document.querySelector('#autoHelp [data-a=show]').click()); await W(p, 900); }
    await p01Right(p); } }

const { browser } = await launch({ mode: 'ok' }); // the shared browser (contexts below)

// ---------- CA-18 / CA-19: every pp* text in both languages, no blaming words in French
{ const src = readSource();
  const fr = src.slice(src.indexOf('  fr:{help:'), src.indexOf('  en:{help:')), en = src.slice(src.indexOf('  en:{help:'), src.indexOf('const t = k =>'));
  const keys = b => new Set([...b.matchAll(/[\s,{](pp[A-Za-z0-9]*)\s*:/g)].map(m => m[1]));
  const kf = keys(fr), ke = keys(en), miss = [...kf].filter(k => !ke.has(k)).concat([...ke].filter(k => !kf.has(k)).map(k => 'fr:' + k));
  check('CA-18 toutes les clés pp* existent en FR et en EN (' + kf.size + ')', kf.size > 40 && miss.length === 0, miss);
  const ppFr = [...fr.matchAll(/[\s,{]pp[A-Za-z0-9]*\s*:([^\n]*?)(?=, pp[A-Za-z0-9]*\s*:|\n)/g)].map(m => m[1]).join(' ');
  check('CA-19 aucun « perdu / raté / échec / dommage » dans les textes FR des Premiers pas', !/perdu|raté|échec|dommage/i.test(ppFr)); }

// ---------- CA-03: first launch, "I'm starting" → D6 then P01; no chord game. Other levels still get the chords.
{ const p = await ctx(browser, { w: 1280, h: 800 });
  await p.goto(URL); await W(p, 1500);
  check('premier lancement : « Joue un Do » d’abord, le niveau vient après (lot 2, D3)', await p.evaluate(() => !!document.querySelector('.fn-d3') && !document.querySelector('.fn-lv')));
  await note(p, 60); await W(p, 1000);
  check('après le Do (D4) : « Oui, je n’y connais rien » mène aux Premiers pas, ou un 2e Do', await p.evaluate(() => /je n'y connais rien/.test(document.getElementById('fnGo').textContent) && /Premiers pas/.test(document.querySelector('.fn-d4').textContent)));
  await note(p, 72); await W(p, 600);
  // chantier Onboarding (25/10) : 3 questions courtes puis « Ton programme » ; un Do seul passe chaque question puis commence
  for (let i = 0; i < 4; i++) { await note(p, 60); await W(p, 600); }
  await W(p, 1000);
  const s0 = await S(p);
  check('CA-03 débutant : présentation des Premiers pas (D6), aucune partie d’accords', await view(p) === 'path' && await p.evaluate(() => !document.body.classList.contains('playing') && !document.getElementById('endModal')?.offsetParent), await view(p));
  check('marques gardées : invité, tutoriel fait, introductions vues, parcours commencé', s0.gate === 'guest' && s0.tourDone === 1 && s0.introSeen && s0.introSeen.chords && s0.pp && s0.pp.start > 0 && s0.onb.level === 'debut');
  check('D6 : 14 pastilles, 3 promesses, « Commencer la leçon 1 »', await p.evaluate(() => document.querySelectorAll('.pp-pmap .pp-dot').length === 14 && document.querySelectorAll('.pp-prom li').length === 3 && /Commencer la leçon 1/.test(document.getElementById('ppMain').textContent)));
  await click(p, '#ppMain'); await W(p, 500);
  check('CA-03 « Commencer » : leçon 1, étape Regarde', await view(p) === 'lesson' && /Regarde/i.test(await stepLbl(p)) && /se répète/.test(await p.evaluate(() => document.querySelector('.pp-tt b').textContent)));
  // ---- P01 played through (CA-05: 0 mistakes → 3 stars); a lone C (MIDI) leaves « Watch » in lesson 1
  await note(p, 60); await W(p, 500);
  check('P01 : un Do seul passe « Regarde »', /À toi 1/i.test(await stepLbl(p)));
  await p01Play(p); await W(p, 400);
  let st = await S(p);
  check('CA-05 P01 : 10 notes noires justes terminent la leçon, 3 étoiles', await view(p) === 'bravo' && st.pp.done.p01 && st.pp.done.p01.stars === 3 && st.pp.done.p01.err === 0, st.pp && st.pp.done);
  check('Bravo : +40 XP (×2 Premiers pas), « Ce que tu sais faire », leçon suivante', st.xp === 40 && await p.evaluate(() => /\+40 XP/.test(document.querySelector('.pp-xp').textContent) && !!document.querySelector('.pp-can') && /Leçon suivante/.test(document.getElementById('ppMain').textContent)));
  check('notification de progrès « Leçon 1 réussie »', st.notifs && st.notifs.list.some(n => n.cat === 'progress' && /Leçon 1 réussie/.test(n.ti)));
  // ---- P02 (CA-07 MIDI): a lone C on Bravo goes on; the C is an answer in P02 (it does not leave « Watch »)
  await note(p, 60); await W(p, 600);
  check('Bravo : un Do seul ouvre la leçon suivante', await view(p) === 'lesson' && /Trouve tous les Do/.test(await p.evaluate(() => document.querySelector('.pp-tt b').textContent)));
  await note(p, 60); await W(p, 500);
  check('P02 : le Do est une réponse, il ne passe pas « Regarde »', /Regarde/i.test(await stepLbl(p)));
  await click(p, '#ppMain'); await W(p, 700); // the exercise takes notes 300 ms after it shows (busy)
  for (const n of [48, 60, 72]) { await note(p, n); await W(p, 1000); }
  check('P02 À toi 2 : « Joue tous les Do »', /tous les Do/.test(await say(p)));
  await note(p, 60); await W(p, 300); await note(p, 48); await W(p, 400);
  check('P02 : un Do plus grave après un plus aigu = de gauche à droite', /De gauche à droite/.test(await p.evaluate(() => document.getElementById('ppFb').textContent)));
  await note(p, 72); await W(p, 300); await note(p, 84); await W(p, 1000);
  check('P02 À toi 3 : le Do central', /central/.test(await say(p)));
  await note(p, 72); await W(p, 400);
  check('CA-07 MIDI : un Do d’une autre octave est refusé (« pas celui du milieu »)', /pas celui du milieu/.test(await p.evaluate(() => document.getElementById('ppFb').textContent)) && /central/.test(await say(p)));
  await note(p, 60); await W(p, 1000);
  st = await S(p);
  check('CA-07 MIDI : la note 60 termine la leçon 2 (2 erreurs voulues → 2 étoiles)', await view(p) === 'bravo' && st.pp.done.p02 && st.pp.done.p02.stars === 2 && st.pp.done.p02.err === 2, st.pp.done.p02);
  // ---- P03 up to « Your turn 2 », then leave (CA-12)
  await click(p, '#ppMain'); await W(p, 500); await click(p, '#ppMain'); await W(p, 400);
  for (const n of [60, 62, 64]) { await note(p, n); await W(p, 380); } await W(p, 700);
  check('P03 À toi 1 : depuis un autre Do', /autre Do/.test(await p.evaluate(() => document.getElementById('ppSub').textContent)));
  for (const n of [48, 50, 52]) { await note(p, n); await W(p, 380); } await W(p, 700);
  check('P03 : passé à « À toi 2 »', /À toi 2/i.test(await stepLbl(p)));
  await click(p, '#ppX'); await W(p, 400);
  st = await S(p);
  check('quitter : retour à LEARN, reprise enregistrée (leçon 3, étape 3)', await p.evaluate(() => document.body.dataset.page) === 'learn' && st.resume && st.resume.kind === 'pp' && st.resume.id === 'p03' && st.resume.step === 2);
  check('D7 carte du parcours en tête de LEARN : 2/14, Continuer', await p.evaluate(() => { const m = document.getElementById('ppMap'); return !!m && !m.classList.contains('fold') && /2/.test(m.querySelector('.pp-mc b').textContent) && m.querySelectorAll('.pp-dot.done').length === 2 && /Continuer/.test(document.getElementById('ppMapGo').textContent); }));
  await p.reload(); await W(p, 1500);
  check('CA-12 retour : carte « Reprendre » sur l’accueil, étape 3 sur 5', await p.evaluate(() => { const r = document.getElementById('ppResume'); return document.body.dataset.page === 'hub' && !!r && !r.hidden && /Reprendre/.test(r.textContent) && /Leçon 3/.test(r.textContent) && /étape 3 sur 5/.test(r.textContent); }));
  await click(p, '#ppResume'); await W(p, 400);
  check('D9 ouverture : « On reprend à l’étape 3 »', await view(p) === 'open' && /On reprend à l'étape 3/.test(await p.evaluate(() => document.querySelector('.pp-opencard').textContent)));
  await click(p, '#ppMain'); await W(p, 500);
  check('CA-12 « Continuer » ouvre l’étape 3 (À toi 2)', await view(p) === 'lesson' && /À toi 2/i.test(await stepLbl(p)));
  for (let i = 0; i < 6; i++) { const m = /Joue un (\S+)\./.exec(await say(p)); await note(p, 60 + PCN[m ? m[1] : 'Do']); await W(p, 1000); }
  check('P03 À toi 3 : « Écoute et rejoue »', /Écoute/.test(await say(p)));
  for (let k = 0; k < 2; k++) { await W(p, 1800); await note(p, 60); await W(p, 300);
    const bad = await p.evaluate(() => document.getElementById('ppFb').classList.contains('bad'));
    for (const n of bad ? [64, 62, 60] : [62, 64]) { await note(p, n); await W(p, 300); } await W(p, 900); }
  st = await S(p);
  check('3 leçons faites : P03 réussie, 3/14', await view(p) === 'bravo' && st.pp.done.p03 && Object.keys(st.pp.done).length === 3, st.pp.done);
  check('après P03 : la leçon 4 est proposée (lot 2)', /Leçon suivante/.test(await p.evaluate(() => document.getElementById('ppMain').textContent)));
  // CA-12, older than 24 h: back to step 1
  await p.evaluate(() => { const S = JSON.parse(localStorage.getItem('memo-gammes-v1')); S.resume = { kind: 'pp', id: 'p02', step: 2, v: 1, at: Date.now() - 25 * 3600e3 }; localStorage.setItem('memo-gammes-v1', JSON.stringify(S)); });
  await p.reload(); await W(p, 1500);
  check('CA-12 plus de 24 h : reprise au début de la leçon (étape 1)', await p.evaluate(() => /étape 1 sur 5/.test(document.getElementById('ppResume').textContent)));
  await note(p, 60); await W(p, 500);
  check('CA-13 un Do seul (MIDI) sur l’accueil ouvre la leçon à reprendre', await view(p) === 'open' && /Trouve tous les Do/.test(await p.evaluate(() => document.querySelector('.pp-opencard h2').textContent)));
  await p.context().close(); }

// ---------- other levels: unchanged (chords right away)
{ const p = await ctx(browser, { w: 1280, h: 800 }); await p.goto(URL); await W(p, 1500);
  await note(p, 60); await W(p, 1000); await p.evaluate(() => document.querySelector('.fn-lv4 [data-v=notes]').click()); await W(p, 400);
  await p.evaluate(() => { document.getElementById('fnSkip').click(); document.getElementById('oqGo').click(); }); await W(p, 1600); // questions passées (chantier Onboarding)
  check('CA-03 niveau « Je connais quelques notes » : test de placement D5 (lot 4), pas de partie', await p.evaluate(() => document.body.dataset.page === 'pp' && !!document.getElementById('plGo')));
  await p.context().close(); }

// ---------- CA-05: 3 mistakes → 2 stars (CA-06 « Show me » on the way), 6 mistakes → 1 star
for (const [plan, show, want, name] of [[[3], 0, 2, '3 erreurs (dont « Montre-moi »)'], [[2, 2, 2], -1, 1, '6 erreurs']]) {
  const p = await ctx(browser, { init: seed('S.pp={v:1,on:true,start:Date.now(),done:{},fail:{}};') }); await p.goto(URL); await W(p, 1200);
  await click(p, '#modeNav [data-mode=learn]'); await W(p, 400); await click(p, '#ppMapGo'); await W(p, 300); await click(p, '#ppMain'); await W(p, 300); await click(p, '#ppMain'); await W(p, 300);
  await p01Play(p, plan, show); await W(p, 400);
  const st = await S(p);
  check('CA-05 P01 avec ' + name + ' : ' + want + ' étoile(s)', st.pp.done.p01 && st.pp.done.p01.stars === want && st.pp.done.p01.err === plan.reduce((a, b) => a + b, 0), st.pp.done.p01);
  if (show === 0) check('CA-06 la consigne se termine après « Montre-moi » puis la bonne note', await view(p) === 'bravo');
  await p.context().close(); }

// ---------- CA-07 at the (simulated) mic: middle C = a C4, another C is refused
{ const p = await ctx(browser, { gum: 'osc', init: seed('S.settings.input="mic"; S.pp={v:1,on:true,start:Date.now(),cur:"p02",done:{p01:{stars:3,at:Date.now()}},fail:{}}; S.resume={kind:"pp",id:"p02",step:3,v:1,at:Date.now()};') });
  await p.goto(URL); await W(p, 1200);
  await p.evaluate(() => document.getElementById('micBtn').click()); await W(p, 900);
  await click(p, '#ppResume'); await W(p, 300); await click(p, '#ppMain'); await W(p, 500);
  check('micro : reprise sur « le Do central »', /central/.test(await say(p)));
  await p.evaluate(() => window.__setFreqs([523.25])); await W(p, 700); await p.evaluate(() => window.__setFreqs([])); await W(p, 400);
  check('CA-07 micro : un Do5 n’est pas le Do central', /pas celui du milieu/.test(await p.evaluate(() => document.getElementById('ppFb').textContent)), await p.evaluate(() => document.getElementById('ppFb').textContent));
  await p.evaluate(() => window.__setFreqs([261.63])); await W(p, 900); await p.evaluate(() => window.__setFreqs([])); await W(p, 600);
  check('CA-07 micro : un Do4 (261,6 Hz) est accepté', await view(p) === 'bravo', await view(p));
  await p.context().close(); }

// ---------- CA-16: no scroll at 5 sizes (path, lesson, bravo, LEARN with the map, hub with the card), light and dark
const SIZES = [{ w: 1024, h: 768 }, { w: 768, h: 1024 }, { w: 1280, h: 800 }, { w: 812, h: 375, mobile: true }, { w: 375, h: 667, mobile: true }];
const fit = (p, tag) => p.evaluate(tag => { const m = document.getElementById('main'), d = document.scrollingElement, P = document.getElementById('ppPanel');
  const card = P.querySelector('.pp-card'), over = card ? card.scrollHeight > card.clientHeight + 1 : false;
  const btn = document.getElementById('ppMain'), b = btn && btn.offsetParent ? btn.getBoundingClientRect() : null;
  return { ok: m.scrollHeight <= m.clientHeight + 1 && d.scrollHeight <= innerHeight + 1 && d.scrollWidth <= innerWidth && !over && (!b || (b.bottom <= innerHeight + 1 && b.top >= 0)), tag, sh: m.scrollHeight, ch: m.clientHeight, over }; }, tag);
for (const v of SIZES) for (const dark of [false, true]) {
  const p = await ctx(browser, { w: v.w, h: v.h, mobile: !!v.mobile, dark, init: seed('S.pp={v:1,on:true,start:Date.now(),cur:"p02",done:{p01:{stars:2,at:Date.now()}},fail:{}}; S.resume={kind:"pp",id:"p02",step:2,v:1,at:Date.now(),inp:"midi"};') });
  await p.goto(URL); await W(p, 1200); const lbl = v.w + '×' + v.h + (dark ? ' sombre' : ' clair');
  const res = [];
  res.push(await fit(p, 'accueil + carte Reprendre'));
  await click(p, '#modeNav [data-mode=learn]'); await W(p, 400); res.push(await fit(p, 'LEARN + carte du parcours'));
  await click(p, '#ppMapOpen'); await W(p, 400); res.push(await fit(p, 'D6 présentation'));
  await click(p, '#ppMain'); await W(p, 500); res.push(await fit(p, 'leçon (À toi 2)'));
  for (let i = 0; i < 3; i++) { await play(p, 61); await W(p, 380); } res.push(await fit(p, 'aide palier 3'));
  await click(p, '#ppX'); await W(p, 300); await click(p, '#ppMapGo'); await W(p, 300); res.push(await fit(p, 'D9 ouverture'));
  const bad = res.filter(r => !r.ok);
  check('CA-16 ' + lbl + ' : aucun défilement (accueil, LEARN, D6, leçon, aide, D9)', bad.length === 0, bad);
  await p.context().close(); }
// bravo at 2 sizes that matter most (phone landscape and portrait)
for (const v of [{ w: 812, h: 375, mobile: true }, { w: 375, h: 667, mobile: true }, { w: 1024, h: 768 }]) {
  const p = await ctx(browser, { w: v.w, h: v.h, mobile: !!v.mobile, init: seed('S.pp={v:1,on:true,start:Date.now(),cur:"p02",done:{p01:{stars:3,at:Date.now()}},fail:{}}; S.resume={kind:"pp",id:"p02",step:3,v:1,at:Date.now(),inp:"midi"};') });
  await p.goto(URL); await W(p, 1200); await click(p, '#ppResume'); await W(p, 300); await click(p, '#ppMain'); await W(p, 400); const how = await play(p, 60);
  const vw = await waitView(p, 'bravo'); await W(p, 300); // the bravo arrives ~0,9 s after the note on a slow runner
  const f = await fit(p, 'bravo'); check('CA-16 ' + v.w + '×' + v.h + ' : la fin de leçon tient sur l’écran', vw === 'bravo' && f.ok, { ...f, view: vw, how });
  await p.context().close(); }

check('aucune erreur JS', errs.length === 0, errs);
await browser.close();
console.log(fails.length ? 'r21 FAIL ' + fails.length : 'r21 OK'); process.exit(fails.length ? 1 : 0);
