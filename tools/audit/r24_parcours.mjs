// First steps, lots 2 and 3 (Oct 2026): first launch D2 → D3 → D4 (level asked after the first C), lessons P04–P14, labels that fade (D20),
// the Play lesson mode (D14), bubbles (D19), the beat (D15), guided chords (D16), both hands (P13), the review (D18), the certificate (D26).
// Covers CA-01, CA-02, CA-04, CA-08, CA-09, CA-10, CA-11, CA-14, CA-15, CA-24 (+ no scroll on the new screens).
// Usage: python3 -m http.server <PORT> at the repo root, then PORT=<PORT> node tools/audit/r24_parcours.mjs
import { launch, URL, INIT } from './lib.mjs';
const W = (p, ms) => p.waitForTimeout(ms);
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d !== undefined && !ok ? ' — ' + JSON.stringify(d) : '')); if (!ok) fails.push(n); };
const errs = [];
const PCN = { 'Do': 0, 'Ré': 2, 'Mi': 4, 'Fa': 5, 'Sol': 7, 'La': 9, 'Si': 11 };
const IDS = Array.from({ length: 14 }, (_, i) => 'p' + String(i + 1).padStart(2, '0'));
// a state where lessons before `id` are done and the lesson `id` is to pick up at `step`
const seed = (id, step, extra = '', input = 'midi') => `(()=>{ try{ if(sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded','1'); const S={settings:{lang:"fr",notation:"fr",input:${JSON.stringify(input)}},langV2:true,gate:"guest",onb:{done:1,level:"debut"},tourDone:1,
  introSeen:Object.fromEntries(["hub","learn","games","free","play","quiz","chords","scales","harmony","prog","ear","daily","practice","section"].map(k=>[k,1])),seenTypes:[],stats:{},secStats:{},xp:0,xpDays:{},streak:{days:0},
  hints:{seen:{resume:1,map:1,inp:1,star:1,fing:1,labels:1,rotate:1}}, pp:{v:1,on:true,start:Date.now()-5*864e5,done:{},fail:{}}, resume:{kind:"pp",id:"${id}",step:${step},v:1,at:Date.now(),inp:${JSON.stringify(input)}}};
  ${JSON.stringify(IDS)}.slice(0,${IDS.indexOf(id)}).forEach(k=>S.pp.done[k]={stars:3,last:3,at:Date.now()-864e5}); ${extra}
  localStorage.setItem("memo-gammes-v1",JSON.stringify(S)); }catch(e){} })();`;
async function ctx(browser, { w = 1180, h = 820, init = '', gum = 'none', midi = 'ok', mobile = false, dark = false } = {}) {
  const c = await browser.newContext({ viewport: { width: w, height: h }, locale: 'fr-FR', isMobile: mobile, hasTouch: mobile, colorScheme: dark ? 'dark' : 'light' });
  await c.addInitScript(`window.__midiMode=${JSON.stringify(midi)}; window.__gumMode=${JSON.stringify(gum)};`); await c.addInitScript(INIT.replace('${MODE}', midi)); if (init) await c.addInitScript(init);
  const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message)); return p; }
const S = p => p.evaluate(() => JSON.parse(localStorage.getItem('memo-gammes-v1')));
const note = (p, n) => p.evaluate(n => { window.__midi.noteOn(n); setTimeout(() => window.__midi.noteOff(n), 60); }, n);
const say = p => p.evaluate(() => (document.getElementById('ppSay') || {}).textContent || '');
const fb = p => p.evaluate(() => { const f = document.getElementById('ppFb'); return f ? { t: f.textContent, k: f.className } : {}; });
const cnt = p => p.evaluate(() => (document.getElementById('ppCnt') || {}).textContent || '');
const view = p => p.evaluate(() => { const P = document.getElementById('ppPanel'); return document.body.dataset.page !== 'pp' ? document.body.dataset.page : P.querySelector('.pp-cert') ? 'cert' : P.querySelector('.pp-rev') ? 'review' : P.querySelector('.pp-bravo') ? 'bravo' : P.querySelector('.pp-opencard') ? 'open' : P.querySelector('.pp-lesson') ? 'lesson' : P.querySelector('.pp-path') ? 'path' : '?'; });
const stepLbl = p => p.evaluate(() => (document.querySelector('.pp-mid .pp-k') || {}).textContent || '');
const click = (p, sel) => p.evaluate(s => document.querySelector(s).click(), sel);
const open = async p => { await click(p, '#ppResume'); await W(p, 300); await click(p, '#ppMain'); await W(p, 700); };
const fit = (p, tag) => p.evaluate(tag => { const m = document.getElementById('main'), d = document.scrollingElement, P = document.getElementById('ppPanel'), g = document.getElementById('gate');
  const pl = g && !g.hidden ? g.querySelector('.fn-play') : null, card = P && P.querySelector('.pp-card');
  const over = (pl && pl.scrollHeight > pl.clientHeight + 1) || (card && card.scrollHeight > card.clientHeight + 1);
  return { ok: m.scrollHeight <= m.clientHeight + 1 && d.scrollHeight <= innerHeight + 1 && d.scrollWidth <= innerWidth + 1 && !over, tag, sh: m.scrollHeight, ch: m.clientHeight, over }; }, tag);

const { browser } = await launch({ mode: 'ok' });

// ---------- CA-01: first launch without MIDI: D2 (no field), the screen, a C → D4 in 2 actions
{ const p = await ctx(browser, { w: 1024, h: 768, midi: 'none' }); await p.goto(URL); await W(p, 1500);
  check('CA-01 D2 « Joue ta première note » : 3 cartes (ou 2 sans micro), aucun champ de saisie', await p.evaluate(() => document.querySelectorAll('.fn-hwc').length >= 2 && !document.querySelector('#gate input') && /première note/.test(document.getElementById('fnH').textContent)));
  await click(p, '.fn-hwc[data-v=screen]'); await W(p, 300);
  check('D3 « Joue un Do » : repère des 2 noires, deux Do qui brillent', await p.evaluate(() => !!document.querySelector('.fn-d3') && /Joue un Do/.test(document.getElementById('fnH').textContent) && document.querySelectorAll('#fnKb .fn-hint').length === 2));
  await p.evaluate(() => document.querySelector('#fnKb [data-m="64"]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))); await W(p, 200);
  check('D3 mauvaise note : « Ça, c’est un Mi » + où chercher (pas de rouge)', await p.evaluate(() => /Ça, c'est un Mi/.test(document.getElementById('fnPrompt').textContent) && /2 touches noires/.test(document.getElementById('fnPrompt').textContent)));
  for (const m of [62, 65]) { await p.evaluate(m => document.querySelector('#fnKb [data-m="' + m + '"]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })), m); await W(p, 200); }
  check('D3 trois mauvaises notes : « Celui-ci ! », le Do s’allume', await p.evaluate(() => /Celui-ci/.test(document.getElementById('fnPrompt').textContent) && !!document.querySelector('#fnKb .fn-this')));
  await p.evaluate(() => document.querySelector('#fnKb [data-m="60"]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))); await W(p, 1000);
  check('CA-01 un Do joué à l’écran mène à D4 (niveau demandé après)', await p.evaluate(() => !!document.querySelector('.fn-d4') && /Tu viens de jouer un Do/.test(document.getElementById('fnH').textContent) && document.querySelectorAll('.fn-lv4 button').length === 3));
  await p.context().close(); }

// ---------- CA-02: a MIDI keyboard at launch: D2 skipped, D3 says its name, note 60 → D4; CA-04 « I already play » → home, no First steps card
{ const p = await ctx(browser, { w: 1024, h: 768 }); await p.goto(URL); await W(p, 1500);
  check('CA-02 clavier MIDI présent : D2 sauté, D3 affiche le nom du port', await p.evaluate(() => !document.querySelector('.fn-hwc') && !!document.querySelector('.fn-d3') && /Fake Keyboard 61/.test(document.querySelector('.fn-d3s').textContent)));
  await note(p, 60); await W(p, 1000);
  check('CA-02 une note 60 mène à D4, rappel « joue un 2e Do »', await p.evaluate(() => !!document.querySelector('.fn-d4') && /2e Do/.test(document.querySelector('.fn-d4').textContent)));
  await click(p, '.fn-lv4 [data-v=adv]'); await W(p, 800);
  const s = await S(p);
  check('CA-04 « Je joue déjà » : accueil, aucune carte des Premiers pas', await p.evaluate(() => document.body.dataset.page === 'hub' && (!document.getElementById('ppResume') || document.getElementById('ppResume').hidden) && !document.querySelector('#hubSide .pp-map, #hubSide #ppMap')) && s.onb.level === 'adv');
  await click(p, '#modeNav [data-mode=learn]'); await W(p, 400);
  check('CA-04 LEARN : Premiers pas repliés en une ligne', await p.evaluate(() => document.getElementById('ppMap').classList.contains('fold')));
  await p.context().close(); }

// ---------- CA-11: P04, a lone B is an answer (not « start again »)
{ const p = await ctx(browser, { init: seed('p04', 2) }); await p.goto(URL); await W(p, 1200); await open(p);
  check('P04 À toi 2 : « Joue un Fa / Sol / La / Si »', /Joue un (Fa|Sol|La|Si)/.test(await say(p)), await say(p));
  const c0 = await cnt(p), s0 = await say(p); await note(p, 71); await W(p, 400); const f = await fb(p);
  check('CA-11 une note 71 seule est une réponse en P04', /Si/.test(s0) ? /ok/.test(f.k) : /bad/.test(f.k) && /Si/.test(f.t), { s0, f, c0 });
  await p.context().close(); }

// ---------- P04 to the end + D18: a lesson with many mistakes, the second time at 1 star → review offered (1 minute), done → back to the path
{ const p = await ctx(browser, { init: seed('p04', 3, 'S.pp.fail={p04:1}; S.resume.err=6;') }); await p.goto(URL); await W(p, 1200); await open(p);
  check('P04 À toi 3 : « Joue les 7 notes »', /7 notes/.test(await say(p)));
  for (const n of [60, 62, 64, 65, 67, 69, 71]) { await note(p, n); await W(p, 250); } await W(p, 900);
  let st = await S(p);
  check('P04 finie à 1 étoile (6 erreurs reprises)', await view(p) === 'bravo' && st.pp.done.p04 && st.pp.done.p04.last === 1, st.pp.done.p04);
  check('D18 révision proposée : deuxième fois à 1 étoile, point orange sur la pastille', /petite révision/.test(await p.evaluate(() => document.querySelector('.pp-blinks').textContent)) && st.pp.rev && st.pp.rev.p04 > 0 && await p.evaluate(() => !!document.querySelector('.pp-mini [data-id=p04][data-rev]')));
  await click(p, '#ppAgain'); await W(p, 300);
  check('D18 « On refait un petit tour ? » : Oui, 1 minute / Non, je continue', await view(p) === 'review' && /1 minute/.test(await p.evaluate(() => document.getElementById('ppMain').textContent)));
  await click(p, '#ppMain'); await W(p, 700);
  check('révision : la dernière étape de la leçon', await view(p) === 'lesson' && /7 notes/.test(await say(p)));
  for (const n of [48, 50, 52, 53, 55, 57, 59]) { await note(p, n); await W(p, 250); } await W(p, 900);
  st = await S(p);
  check('révision finie : « Beaucoup mieux ! », retour au parcours, point orange retiré', await view(p) === 'path' && !(st.pp.rev && st.pp.rev.p04) && st.pp.done.p04.last === 1);
  await p.context().close(); }

// ---------- CA-14: labels fade (P03 À toi 2): 4 quick right answers on E → no label; 2 mistakes on E → pale again
{ const p = await ctx(browser, { init: seed('p03', 2) }); await p.goto(URL); await W(p, 1200); await open(p);
  let mi = 0, guard = 0;
  while (mi < 4 && guard++ < 40) { const s = await say(p); const m = /Joue un (\S+)\./.exec(s); if (!m) { await click(p, '#ppRestart'); await W(p, 700); continue; }
    await note(p, 60 + PCN[m[1]]); if (m[1] === 'Mi') mi++; await W(p, 1000); if (await view(p) !== 'lesson' || !/À toi 2/.test(await stepLbl(p))) { await p.evaluate(() => { const S = JSON.parse(localStorage.getItem('memo-gammes-v1')); S.resume = { kind: 'pp', id: 'p03', step: 2, v: 1, at: Date.now() }; localStorage.setItem('memo-gammes-v1', JSON.stringify(S)); }); await p.reload(); await W(p, 1200); await open(p); } }
  const lb = () => p.evaluate(() => { const sp = document.querySelector('#ppKb .wk[data-m="64"] span'); return sp ? { cls: sp.className, op: +getComputedStyle(sp).opacity } : null; });
  let st = await S(p);
  check('CA-14 quatre bonnes réponses rapides sur Mi : plus d’étiquette', st.lbl && st.lbl.m[4] >= 1 && /lb-off/.test((await lb() || {}).cls || ''), { m: st.lbl && st.lbl.m, lb: await lb() });
  check('D20 annonce « Tu connais Mi : on enlève leurs étiquettes »', await p.evaluate(() => /Tu connais .*Mi.* on enlève/.test(document.body.innerText)) || (st.lbl.told && st.lbl.told[4] > 0));
  guard = 0; while (!/Joue un Mi\./.test(await say(p)) && guard++ < 20) { const m = /Joue un (\S+)\./.exec(await say(p)); if (!m) { await click(p, '#ppRestart'); await W(p, 700); continue; } await note(p, 60 + PCN[m[1]]); await W(p, 1000); if (await view(p) !== 'lesson' || !/À toi 2/.test(await stepLbl(p))) { await p.evaluate(() => { const S = JSON.parse(localStorage.getItem('memo-gammes-v1')); S.resume = { kind: 'pp', id: 'p03', step: 2, v: 1, at: Date.now() }; localStorage.setItem('memo-gammes-v1', JSON.stringify(S)); }); await p.reload(); await W(p, 1200); await open(p); } }
  await note(p, 65); await W(p, 400); await note(p, 65); await W(p, 400);
  const l2 = await lb();
  check('CA-14 deux erreurs sur Mi : l’étiquette revient, pâle (opacité < 1)', !!l2 && /lb-pale/.test(l2.cls) && l2.op < 1, l2);
  await p.context().close(); }

// ---------- CA-15: bubbles: one at a time, never while a note is awaited, closed = not shown again
{ const p = await ctx(browser, { init: seed('p02', 0, 'S.hints={seen:{}};') }); await p.goto(URL); await W(p, 2600);
  const nb = () => p.evaluate(() => [...document.querySelectorAll('.hint-bubble')].filter(b => b.getClientRects().length).length);
  check('CA-15 accueil : une bulle sur la carte « Reprendre », une seule', await nb() === 1 && /Ta leçon t'attend/.test(await p.evaluate(() => document.querySelector('.hint-bubble').textContent)));
  await p.evaluate(() => document.querySelector('.hint-bubble .hb-ok').click()); await W(p, 300);
  check('bulle fermée = vue', (await S(p)).hints.seen.resume > 0);
  let max = 0; await p.reload(); for (let i = 0; i < 8; i++) { await W(p, 600); max = Math.max(max, await nb()); }
  check('CA-15 jamais plus d’une bulle à la fois, la bulle fermée ne revient pas après rechargement', max <= 1 && !(await p.evaluate(() => [...document.querySelectorAll('.hint-bubble')].some(b => /Ta leçon t'attend/.test(b.textContent)))));
  await p.evaluate(() => { const b = document.querySelector('.hint-bubble .hb-ok'); if (b) b.click(); });
  await open(p); await click(p, '#ppMain'); await W(p, 400); // P02 « Your turn 1 »: a note is awaited
  max = 0; for (let i = 0; i < 6; i++) { await W(p, 500); max = Math.max(max, await nb()); }
  check('CA-15 aucune bulle pendant qu’une consigne attend une note', /À toi 1/.test(await stepLbl(p)) && max === 0, { lbl: await stepLbl(p), max });
  await p.context().close(); }

// ---------- D14: P08 in the Play lesson mode (the phrase, wait mode, another octave counts), sticker « First melody »
{ const p = await ctx(browser, { init: seed('p08', 1) }); await p.goto(URL); await W(p, 1200); await open(p); await W(p, 2600);
  check('D14 P08 : lecteur Play en mode leçon (phrase 1, 11 notes)', await p.evaluate(() => { const f = document.getElementById('ppFrame'); return !!f && /lesson=1/.test(f.src) && document.querySelectorAll('#ppFrise i').length === 11 && /phrase 1/.test(f.contentDocument.getElementById('sTitle').textContent); }));
  const PH = [[60, 1], [60, 1], [60, 1], [62, 1], [64, 2], [62, 2], [60, 1], [64, 1], [62, 1], [62, 1], [60, 4]];
  const waitNote = async j => { for (let i = 0; i < 100; i++) { if (await p.evaluate(j => { try { const c = document.querySelector('#ppFrise .cur'); return !!c && +c.dataset.i === j && document.getElementById('ppFrame').contentWindow.clavioWaiting(); } catch (e) { return false; } }, j)) return; await W(p, 100); } };
  for (let k = 0; k < 3; k++) { for (const [i, [m]] of PH.entries()) { await waitNote(i); await note(p, k === 1 && i === 0 ? 72 : m); await W(p, 150);
      if (k === 1 && i === 0) check('D14 même note, autre octave : c’est bon', /autre octave/.test((await fb(p)).t)); }
    await W(p, 3600);
    if (k === 0) check('D14 phrase jouée : frise complète, étape suivante (étiquettes pâles)', /À toi 2/.test(await stepLbl(p)) && await p.evaluate(() => /aid=1/.test(document.getElementById('ppFrame').src))); }
  const st = await S(p);
  check('P08 finie (3 phrases) : autocollant « Première mélodie », réécouter, partager', await view(p) === 'bravo' && st.stickers && st.stickers.melody > 0 && await p.evaluate(() => !!document.getElementById('ppReplayMe') && !!document.getElementById('ppShare8') && /Première mélodie/.test((document.querySelector('.pp-stk')||{}).textContent)), { v: await view(p), st: st.stickers });
  check('P08 finie : la leçon 9 est proposée', /Leçon suivante/.test(await p.evaluate(() => (document.getElementById('ppMain') || {}).textContent)));
  await p.context().close(); }

// ---------- CA-10: P09 at MIDI: hits at ± 60 ms are green, + 200 ms is blue
{ const p = await ctx(browser, { init: seed('p09', 1) }); await p.goto(URL); await W(p, 1200); await open(p); await W(p, 900);
  const bt = await p.evaluate(() => { const b = document.querySelector('.pp-beat'); return b ? { t0: +b.dataset.t0, spb: +b.dataset.spb, now: performance.now() } : null; });
  check('D15 P09 : la balle, 4 points, 8 frappes attendues', !!bt && await p.evaluate(() => document.querySelectorAll('.pp-pad').length === 4 && document.querySelectorAll('#ppLine i').length === 8));
  if (bt) { await p.evaluate(({ t0, spb }) => { const off = [60, -60, 40, -40, 60, -60, 0, 200]; off.forEach((o, i) => { const at = t0 + i * spb + o - performance.now(); setTimeout(() => { window.__midi.noteOn(60); setTimeout(() => window.__midi.noteOff(60), 80); }, at); }); }, bt);
    await W(p, Math.max(0, bt.t0 - bt.now) + 8 * bt.spb + 900);
    const r = await p.evaluate(() => ({ g: document.querySelectorAll('#ppLine i.g').length, b: document.querySelectorAll('#ppLine i.b').length, o: document.querySelectorAll('#ppLine i.o').length }));
    check('CA-10 sept frappes à ± 60 ms : points verts ; une à + 200 ms : point bleu', r.g === 7 && r.b === 1 && r.o === 0, r);
    await W(p, 2600); check('P09 : 7 sur 8 à l’heure, on passe à « tiens-le 2 temps »', /tiens-le/.test(await say(p)), await say(p)); }
  await p.context().close(); }

// ---------- CA-08: P10 at MIDI: C E G at 0 / 40 / 90 ms = a chord; at 0 / 500 / 1000 ms = not a chord; at the mic, note after note in 3 s
{ const p = await ctx(browser, { init: seed('p10', 2) }); await p.goto(URL); await W(p, 1200); await open(p);
  check('D16 P10 « Les trois ensemble » : 3 cases Do · Mi · Sol', /trois ensemble/.test(await say(p)) && await p.evaluate(() => document.querySelectorAll('.pp-cells [data-pc]').length === 3) && /1\/3/.test(await cnt(p)));
  await p.evaluate(() => { [[60, 0], [64, 40], [67, 90]].forEach(([n, t]) => setTimeout(() => window.__midi.noteOn(n), t)); }); await W(p, 1300);
  check('CA-08 Do, Mi, Sol à 0, 40 et 90 ms : accord validé', /2\/3/.test(await cnt(p)), await cnt(p));
  for (const n of [60, 64, 67]) await p.evaluate(n => window.__midi.noteOff(n), n);
  await p.evaluate(() => { [[60, 0], [64, 500], [67, 1000]].forEach(([n, t]) => setTimeout(() => { window.__midi.noteOn(n); setTimeout(() => window.__midi.noteOff(n), 100); }, t)); }); await W(p, 1800);
  check('CA-08 à 0, 500 et 1000 ms : pas d’accord', /2\/3/.test(await cnt(p)) && !/ok/.test((await fb(p)).k), { c: await cnt(p), f: await fb(p) });
  await p.evaluate(() => { window.__midi.chord([60, 64, 65]); }); await W(p, 400);
  check('D16 note en trop : « Ce Fa n’est pas dans l’accord »', /Fa n'est pas dans l'accord/.test((await fb(p)).t), await fb(p));
  await p.context().close(); }
{ const p = await ctx(browser, { gum: 'osc', init: seed('p10', 2, '', 'mic') }); await p.goto(URL); await W(p, 1200);
  await p.evaluate(() => document.getElementById('micBtn').click()); await W(p, 900); await open(p);
  check('micro : « joue les trois notes l’une après l’autre »', /l'une après l'autre/.test(await p.evaluate(() => document.getElementById('ppSub').textContent)));
  for (const f of [261.63, 329.63, 392.0]) { await p.evaluate(f => window.__setFreqs([f]), f); await W(p, 700); await p.evaluate(() => window.__setFreqs([])); await W(p, 300); }
  await W(p, 600);
  check('CA-08 micro : les 3 notes en 3 s valident l’accord', /2\/3/.test(await cnt(p)), await cnt(p));
  await p.context().close(); }

// ---------- CA-09: P13 at MIDI: 48 + {60, 64, 67} = « C low + C chord »; {65, 69, 72} alone is not « F low + F chord »
{ const p = await ctx(browser, { init: seed('p13', 2) }); await p.goto(URL); await W(p, 1200); await open(p);
  check('P13 : clavier séparé au Do central, « Do en bas + accord de Do »', /en bas \+ accord de Do/.test(await say(p)) && await p.evaluate(() => document.getElementById('ppKb').classList.contains('pp-split') && !!document.querySelector('#ppKb .pp-lh') && !!document.querySelector('#ppKb .pp-rh')));
  await p.evaluate(() => window.__midi.chord([48, 60, 64, 67])); await W(p, 1300);
  check('CA-09 48 + {60, 64, 67} valide « Do en bas + accord de Do »', /2\/3/.test(await cnt(p)), await cnt(p));
  for (const n of [48, 60, 64, 67]) await p.evaluate(n => window.__midi.noteOff(n), n);
  await p.evaluate(() => window.__midi.chord([65, 69, 72])); await W(p, 1000);
  check('CA-09 l’accord seul, sans basse : pas validé', /2\/3/.test(await cnt(p)) && !/ok/.test((await fb(p)).k));
  await click(p, '#ppOneHand'); await W(p, 200);
  for (const n of [65, 69, 72]) await p.evaluate(n => window.__midi.noteOff(n), n);
  await p.evaluate(() => window.__midi.chord([65, 69, 72])); await W(p, 1300);
  check('« Une main à la fois » : l’accord seul suffit (l’app joue la basse)', /3\/3/.test(await cnt(p)), await cnt(p));
  await p.context().close(); }

// ---------- CA-24: P14 done → sticker, certificate (D26), notification, the map folds to one line (ppAllDone)
{ const p = await ctx(browser, { init: seed('p14', 2) }); await p.goto(URL); await W(p, 1200); await open(p);
  check('P14 À toi 2 : choix Facile / Deux mains', await p.evaluate(() => document.querySelectorAll('.pp-choose button').length === 2));
  for (let i = 0; i < 6; i++) await p.evaluate(() => document.querySelector('.pp-tempo [data-d="5"]').click());
  await click(p, '.pp-choose button[data-v="0"]'); await W(p, 800);
  const bt = await p.evaluate(() => { const b = document.querySelector('.pp-beat'); return b ? { t0: +b.dataset.t0, spb: +b.dataset.spb, now: performance.now() } : null; });
  check('P14 : grille en rythme, la mélodie jouée par l’app', !!bt && bt.spb < 700 && await p.evaluate(() => document.querySelectorAll('#ppLine i').length === 12));
  await W(p, (bt ? bt.t0 - bt.now + 32 * bt.spb : 30000) + 4300);
  const st = await S(p);
  check('CA-24 P14 finie : autocollant « Premiers pas », notification de progrès', ['bravo', 'cert'].includes(await view(p)) && st.stickers && st.stickers.pp > 0 && st.notifs && st.notifs.list.some(n => n.cat === 'progress' && /fini les Premiers pas/.test(n.ti)), { v: await view(p), stk: st.stickers });
  await W(p, 3800);
  check('CA-24 D26 s’ouvre : certificat, Partager / Enregistrer, « Et maintenant ? » 3 tuiles', await view(p) === 'cert' && await p.evaluate(() => /14 leçons/.test(document.querySelector('.pp-cc').textContent) && !!document.getElementById('ppCShare') && !!document.getElementById('ppCSave') && document.querySelectorAll('#ppCTiles .ptile').length >= 3));
  await click(p, '#modeNav [data-mode=learn]'); await W(p, 400);
  check('CA-24 LEARN : la carte se replie « Premiers pas ✓ 14/14 · N étoiles » (ppAllDone)', await p.evaluate(() => { const m = document.getElementById('ppMap'); return m.classList.contains('alldone') && /14\/14/.test(m.textContent) && /Mon certificat/.test(m.textContent); }));
  await p.context().close(); }

// ---------- no scroll: D2 / D3 / D4 and the new lesson screens at 5 sizes
const SIZES = [{ w: 1024, h: 768 }, { w: 768, h: 1024 }, { w: 1280, h: 800 }, { w: 812, h: 375, mobile: true }, { w: 375, h: 667, mobile: true }];
for (const v of SIZES) { const lbl = v.w + '×' + v.h, res = [];
  { const p = await ctx(browser, { w: v.w, h: v.h, mobile: !!v.mobile, midi: 'none', dark: v.w === 1024 }); await p.goto(URL); await W(p, 1300); res.push(await fit(p, 'D2'));
    await click(p, '.fn-hwc[data-v=screen]'); await W(p, 300); res.push(await fit(p, 'D3'));
    await p.evaluate(() => document.querySelector('#fnKb [data-m="60"]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))); await W(p, 1000); res.push(await fit(p, 'D4')); await p.context().close(); }
  for (const [id, step, tag] of [['p07', 1, 'P07 doigts'], ['p08', 1, 'P08 lecteur'], ['p09', 1, 'P09 pulsation'], ['p10', 2, 'P10 accord'], ['p12', 2, 'P12 grille'], ['p13', 2, 'P13 deux mains']]) {
    const p = await ctx(browser, { w: v.w, h: v.h, mobile: !!v.mobile, init: seed(id, step), dark: v.w === 768 }); await p.goto(URL); await W(p, 1200); await open(p); await W(p, 700); res.push(await fit(p, tag)); await p.context().close(); }
  { const p = await ctx(browser, { w: v.w, h: v.h, mobile: !!v.mobile, init: seed('p14', 0, 'S.pp.done.p14={stars:3,last:3,at:Date.now()}; S.pp.end=Date.now();') }); await p.goto(URL); await W(p, 1200);
    await click(p, '#modeNav [data-mode=learn]'); await W(p, 300); await click(p, '#ppMapGo'); await W(p, 500); res.push(await fit(p, 'D26 certificat')); await p.context().close(); }
  const bad = res.filter(r => !r.ok);
  check('aucun défilement ' + lbl + ' : D2, D3, D4, P07, P08, P09, P10, P12, P13, D26', bad.length === 0, bad); }

check('aucune erreur JS', errs.length === 0, errs);
await browser.close();
console.log(fails.length ? 'r24 FAIL ' + fails.length : 'r24 OK'); process.exit(fails.length ? 1 : 0);
