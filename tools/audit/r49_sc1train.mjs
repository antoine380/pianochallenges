// Chantier GAMMES UNE À UNE : ENTRAÎNEMENT + MIDI.
// A. MIDI avec le pont natif iOS SIMULÉ (window.Capacitor + webkit.messageHandlers.bridge, événements "midi" {id,data} et "statechange"),
//    comme l'app iPad avec un ROLI LUMI en Bluetooth : parcours réel accueil → LEARN → tuile → liste sc1, une note sonne, Do lance la gamme,
//    messages LUMI réalistes (canaux MPE 2-16, pression / CC74 / pitch-bend en rafale, plusieurs messages dans un même paquet, running status,
//    SysEx et temps réel mêlés, vélocité faible), le même clavier sur deux ports (USB-C + Bluetooth : chaque note arrivait deux fois → Do jamais
//    « seul »), un nom de clavier enregistré qui n'est plus là, deux demandes d'accès simultanées (une seule écoute), le test « joue une note »
//    de la fenêtre MIDI, une partie LEARN normale et le mode PIANO.
// B. Mode Entraînement / Évaluation : démonstration jouée (touches allumées une à une, sons), « À toi » guidé sans étoiles ni XP ni fautes
//    comptées, fin « Bien joué ! » (Rejouer / Passer à l'évaluation / Revoir la gamme ; Do = rejouer, Si = revoir), « Revoir la gamme »,
//    bascule dans les deux sens (S.settings.sc1Train), évaluation inchangée (3 étoiles), aides du joueur jamais sauvegardées modifiées,
//    accords, pas de défilement aux 5 tailles, aucune erreur JS.
// Usage : PORT=8925 NODE_PATH=… PW_CHROMIUM=… node tools/audit/r49_sc1train.mjs   (CAP=dossier pour des captures)
import { createRequire } from 'module';
import fs from 'fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = process.env.PORT || '8767', URL = `http://localhost:${PORT}/`, CAP = process.env.CAP || '';
if (CAP) fs.mkdirSync(CAP, { recursive: true });
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d !== undefined && !ok ? ' — ' + JSON.stringify(d).slice(0, 400) : '')); if (!ok) fails.push(n); };
const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
// the iOS bridge as test_buttons.py simulates it; start/listInputs answer after 150 ms like the real plugin; window.__ports() changes the inputs
const NAT = `window.webkit={messageHandlers:{bridge:{postMessage(){}}}}; window.__cb={}; window.__nl=[]; window.__starts=0;
window.__in=[{id:'7',name:'LUMI Keys BLOCK 3F1A'}];
window.Capacitor={nativePromise:(p,m,o)=>{ if(p==='Midi'&&m==='start') window.__starts++; return new Promise(r=>setTimeout(()=>r(m==='start'||m==='listInputs'?{inputs:window.__in.slice()}:{}),150)); },
  nativeCallback:(p,m,o,cb)=>{ if(p==='Midi'&&o.eventName==='midi') window.__nl.push(cb); else window.__cb[p+':'+o.eventName]=cb; return 'id'; }};
window.__nat=(data,id)=>window.__nl.forEach(f=>f({id:id||'7',data}));
window.__ports=list=>{ window.__in=list; const f=window.__cb['Midi:statechange']; if(f) f({inputs:list}); };`;
const STATE = (o = {}) => ({ xp: 900, gate: 'account', onb: { done: 1 }, tourDone: 1, langV2: true, pwShown: 1, ...(o.stars ? { scStars: o.stars } : {}),
  introSeen: { scales: 1, chords: 1, harmony: 1, prog: 1, ear: 1, games: 1, daily: 1 }, midi: { later: Date.now() }, goal: { kind: 'min', v: 10, asked: 1, at: 1 },
  settings: { lang: o.lang || 'fr', notation: o.lang || 'fr', input: 'midi', uiSound: false, octave: true, fing: true, guideK: false, guideN: false, guideP: true, delay: 0, ...(o.set || {}) } });
async function open({ vp = { width: 1024, height: 768 }, st = STATE(), scheme = 'light' } = {}) {
  const c = await b.newContext({ viewport: vp, hasTouch: vp.width < 900, colorScheme: scheme });
  await c.addInitScript(NAT);
  await c.route(u => u.href.startsWith(URL) && (u.pathname === '/' || u.pathname === '/index.html'), async r => { const res = await r.fetch(); let h = await res.text(); const e = h.lastIndexOf('})();\n</script>'); h = h.slice(0, e) + '\nwindow.__X=s=>eval(s);\n' + h.slice(e); await r.fulfill({ response: res, body: h, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await c.route('https://ijdxeasxmgevuchyuenn.supabase.co/**', r => r.abort());
  const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/net::ERR|Failed to load resource/.test(m.text())) p.errs.push(m.text()); });
  await p.addInitScript(`if(!sessionStorage.getItem('s')){ sessionStorage.setItem('s','1'); localStorage.setItem('memo-gammes-v1', ${JSON.stringify(JSON.stringify(st))}); }`);
  await p.goto(URL); await p.waitForFunction(() => !!window.__X, null, { timeout: 15000 }); await p.waitForTimeout(1500);
  p.X = s => p.evaluate(s => window.__X(s), s);
  await p.X('window.__tc=0; { const o=tone; tone=function(){ window.__tc++; return o.apply(this,arguments); }; }');
  return p;
}
const W = (p, ms) => p.waitForTimeout(ms);
const ev = (p, f, a) => p.evaluate(f, a);
const nat = async (p, data, id, ms = 120) => { await ev(p, ([d, i]) => window.__nat(d, i), [data, id]); await W(p, ms); };
const toList = async p => { await ev(p, () => document.querySelector('#homeLink')?.click()); await W(p, 300); await ev(p, () => document.querySelector('#modeNav [data-mode=learn]').click()); await W(p, 400); await ev(p, () => document.querySelector('#learnTiles .sc1-tile').click()); await W(p, 400); };
const quit = async p => { await ev(p, () => document.getElementById('gameEnd').click()); await W(p, 300); if (await p.isVisible('#leaveModal')) { await p.click('#lvGo'); await W(p, 500); } if (await p.isVisible('#endModal')) { await ev(p, () => document.getElementById('sc1Back')?.click()); await W(p, 300); } };
const G = p => p.X('({page, phase, tr:!!(game&&game.sc1&&game.sc1.train), k:cur&&cur.k, tid:cur&&cur.tid, demo:!!SC1.demo, errors, tc:window.__tc})');
const stored = p => ev(p, () => JSON.parse(localStorage.getItem('memo-gammes-v1')));
const noScroll = p => ev(p, () => { const d = document.scrollingElement, m = document.getElementById('main'); return d.scrollHeight - d.clientHeight <= 1 && d.scrollWidth - d.clientWidth <= 1 && m.scrollHeight - m.clientHeight <= 1; });
const C_MAJ = [60, 62, 64, 65, 67, 69, 71, 72];

// ================= A. MIDI, pont natif simulé =================
let p = await open();
const boot = await p.X('({acc:!!midiAcc, ready:midiReady, names:midiNames, nat:document.documentElement.classList.contains("native"), nl:window.__nl.length, starts:window.__starts})');
check('app (pont natif simulé) : accès MIDI au démarrage, LUMI listé, une seule écoute "midi"', boot.acc && boot.ready && boot.names.join() === 'LUMI Keys BLOCK 3F1A' && boot.nat && boot.nl === 1 && boot.starts === 1, boot);
// two requests at once (two start-up paths): one access, one listener
await p.X('Promise.all([navigator.requestMIDIAccess(), navigator.requestMIDIAccess()])'); await W(p, 300);
check('deux demandes d’accès : toujours une seule écoute (sinon chaque note arrive deux fois)', await p.evaluate(() => window.__nl.length) === 1);
await toList(p);
check('parcours réel accueil → LEARN → tuile : page sc1', await p.X('page') === 'sc1');
let t0 = await p.X('window.__tc');
await nat(p, [0x90, 62, 90]); await nat(p, [0x80, 62, 0]);
check('liste sc1 : un Ré (canal 1) sonne sans rien lancer', await p.X('window.__tc') === t0 + 1 && await p.X('page') === 'sc1');
await nat(p, [0x90, 60, 90], undefined, 500);
let g = await G(p);
check('liste sc1 : Do (MIDI natif) lance la prochaine gamme (Do majeur), en Entraînement car 0 étoile', g.page === 'practice' && g.k === 'C' && g.tid === 'major' && g.tr, g);
await quit(p); await W(p, 300);
check('« Terminer la partie » pendant l’entraînement : retour direct à la liste', await p.X('page') === 'sc1' && await ev(p, () => document.getElementById('endModal').hidden));
// LUMI MPE: channel 2, pitch bend + CC74 + pressure before the note, all in ONE packet
await nat(p, [0xE1, 0, 64, 0xB1, 74, 64, 0xD1, 20, 0x91, 60, 70], undefined, 500);
check('paquet BLE de plusieurs messages (pitch-bend, CC74, pression puis Do sur le canal MPE 2) : la gamme se lance', (await G(p)).page === 'practice');
await quit(p);
// running status + SysEx + clock in the same packet, and a note split across two events
await nat(p, [0xF0, 0x00, 0x21, 0x10, 0x77, 0x37, 0xF7, 0xF8, 0xFE, 0x9F, 62, 40, 64, 0], undefined, 300);
t0 = await p.X('window.__tc');
await nat(p, [0x9F, 60]); await nat(p, [90], undefined, 500);
check('SysEx / horloge ignorés, running status et note coupée en deux paquets : Do (canal 16) lance la gamme', (await G(p)).page === 'practice' && await p.X('window.__tc') >= t0 + 1);
await quit(p);
// low velocity
await nat(p, [0x90, 60, 3], undefined, 500);
check('Do joué très doucement (vélocité 3) : compte quand même', (await G(p)).page === 'practice');
await quit(p);
// the same LUMI on two ports (USB-C to charge + Bluetooth): every note twice
await ev(p, () => window.__ports([{ id: '7', name: 'LUMI Keys BLOCK 3F1A' }, { id: '8', name: 'LUMI Keys BLOCK' }])); await W(p, 300);
t0 = await p.X('window.__tc');
await ev(p, () => { window.__nat([0x90, 62, 90], '7'); window.__nat([0x90, 62, 90], '8'); }); await W(p, 300);
const dupTc = await p.X('window.__tc');
await ev(p, () => { window.__nat([0x90, 60, 90], '7'); window.__nat([0x90, 60, 90], '8'); }); await W(p, 500);
g = await G(p);
check('le même clavier sur deux ports (chaque note reçue deux fois) : un seul son, Do reste « seul » et lance la gamme', g.page === 'practice' && dupTc === t0 + 1, { ...g, t0, dupTc });
await quit(p);
await ev(p, () => window.__ports([{ id: '7', name: 'LUMI Keys BLOCK 3F1A' }])); await W(p, 300);
// a keyboard name saved earlier (another device / USB) that is not connected: no longer mutes the LUMI
await p.X('S.settings.midiInput="LUMI Keys BLOCK"; save()');
await nat(p, [0x90, 60, 90], undefined, 500);
check('un clavier choisi autrefois mais absent (« LUMI Keys BLOCK ») ne coupe plus le LUMI branché', (await G(p)).page === 'practice');
await quit(p);
await ev(p, () => window.__ports([{ id: '7', name: 'LUMI Keys BLOCK 3F1A' }, { id: '9', name: 'LUMI Keys BLOCK' }])); await W(p, 300);
await nat(p, [0x90, 62, 90], '7', 300);
check('… mais quand le clavier choisi est là, les autres ports restent ignorés', await p.X('page') === 'sc1' && await p.X('window.__tc') === (await p.X('window.__tc')));
const tcSel = await p.X('window.__tc'); await nat(p, [0x90, 64, 90], '7', 200);
check('… (aucun son pour un port non choisi)', await p.X('window.__tc') === tcSel);
await p.X('S.settings.midiInput=""; save()'); await ev(p, () => window.__ports([{ id: '7', name: 'LUMI Keys BLOCK 3F1A' }])); await W(p, 300);
// the MIDI window: « play a note » shows the last note, even from a multi-message MPE packet
await p.X('openMidi()'); await W(p, 400);
await nat(p, [0xE3, 0, 64, 0xB3, 74, 30, 0x93, 67, 77], undefined, 300);
const mt = await p.X('({open:midiOpen, m:MT.last&&MT.last.m, v:MT.last&&MT.last.v, port:MT.last&&MT.last.port})');
check('fenêtre MIDI, test « joue une note » : la dernière note d’un paquet MPE est affichée (Sol, vélocité 77, nom du port)', mt.open && mt.m === 67 && mt.v === 77 && mt.port === 'LUMI Keys BLOCK 3F1A', mt);
await ev(p, () => document.getElementById('midiX').click()); await W(p, 300);
// a normal LEARN game with the same bridge
await ev(p, () => document.querySelector('#modeNav [data-mode=learn]').click()); await W(p, 400);
await ev(p, () => document.querySelectorAll('#learnTiles .ptile')[0].click()); await W(p, 500);
await ev(p, () => document.getElementById('suGo')?.click()); await W(p, 600);
const lg = await p.X('({page, phase, n:seq.length, notes:seq.map(x=>x.midi!=null?x.midi:null), pcs:seq.map(x=>x.pc)})');
for (const pc of lg.pcs) await nat(p, [0x91, 60 + pc, 90], undefined, 60);
await W(p, 400);
const lg2 = await p.X('({phase, idx, errors})');
check('partie LEARN normale (accords) au pont natif, notes sur le canal 2 : réussie', lg.page === 'practice' && lg.phase === 'listening' && lg2.phase === 'success' && lg2.errors === 0, { lg, lg2 });
await ev(p, () => document.getElementById('gameEnd').click()); await W(p, 300); if (await p.isVisible('#leaveModal')) { await p.click('#lvGo'); await W(p, 400); }
if (await p.isVisible('#endModal')) { await ev(p, () => document.getElementById('endX').click()); await W(p, 300); }
// the PIANO mode with the same bridge
await ev(p, () => document.querySelector('#modeNav [data-mode=piano]').click()); await W(p, 500);
const pn0 = await p.X('PN.n');
await nat(p, [0xE1, 0, 64, 0xD1, 30, 0x91, 64, 100, 0xD1, 50], undefined, 150); await nat(p, [0x81, 64, 0]);
check('mode PIANO au pont natif (paquet MPE) : une voix jouée', await p.X('page') === 'piano' && await p.X('PN.n') === pn0 + 1, { pn0, n: await p.X('PN.n') });
check('A : aucune erreur JS', p.errs.length === 0, p.errs);
await p.context().close();

// ================= B. Entraînement / Évaluation =================
p = await open();
await toList(p);
await ev(p, () => document.querySelector('.sc1-c[data-tid=major][data-k=C]').click()); await W(p, 300);
g = await G(p);
const bar = await ev(p, () => ({ seg: [...document.querySelectorAll('#sc1Tm button')].map(b => b.textContent + ':' + b.getAttribute('aria-pressed')), lbl: getComputedStyle(document.getElementById('gameLbl')).display, see: !!document.getElementById('sc1See'), your: !!document.getElementById('sc1Your') }));
check('case à 0 étoile : Entraînement par défaut, pastilles « Entraînement | Évaluation » en haut, démonstration en cours', g.tr && g.demo && g.phase === 'revealed' && bar.seg.join() === 'Entraînement:true,Évaluation:false' && bar.see && bar.your, { g, bar });
const tcA = await p.X('window.__tc'); await W(p, 1500); // the demo sounds each note when it lights it
const d1 = await p.X('({rev:[...document.querySelectorAll("#kbd .k-rev")].map(k=>+k.dataset.m), seen:document.querySelectorAll("#slots .sc1-seen").length, tc:window.__tc, sub:$("promptSub").textContent})');
check('démonstration : la gamme jouée note par note (touches allumées une à une, noms sur les cases), tempo calme', d1.rev.length >= 2 && d1.rev.length <= 4 && d1.seen === d1.rev.length && d1.tc > tcA && /Regarde et écoute/.test(d1.sub), d1);
if (CAP) await p.screenshot({ path: `${CAP}/r49_demo.png` });
await W(p, 5200);
g = await G(p);
const guide = await p.X('({k:[...document.querySelectorAll("#kbd .k-guide")].map(k=>+k.dataset.m%12), names:document.querySelectorAll("#slots .pre").length, sub:$("promptSub").textContent})');
check('fin de la démo : « À toi », la touche suivante allumée et les noms affichés (aides prêtées), sans chrono', g.phase === 'listening' && !g.demo && guide.k.join() === '0' && guide.names === 8 && /À toi/.test(guide.sub) && await p.X('deadline===0'), { g, guide });
const st1 = await stored(p);
check('les aides du joueur ne sont jamais sauvegardées modifiées (guideK/guideN false, guideP true)', st1.settings.guideK === false && st1.settings.guideN === false && st1.settings.guideP === true, st1.settings);
const xp0 = await p.X('S.xp');
for (const m of [60, 61, 61, 61, 62, 64]) { await p.X(`noteIn(${m})`); await W(p, 40); }
const wr = await p.X('({errors, help:!!($("autoHelp")&&!$("autoHelp").hidden), miss:!$("sbMiss").hidden, idx})');
check('fausses notes en entraînement : signalées, jamais comptées (pas de compteur, pas de « Je sèche » au bout de 3)', wr.errors === 0 && !wr.help && !wr.miss && wr.idx === 3, wr);
check('3 notes justes en entraînement : aucune étoile', await p.X('sc1Get("notes","major","C")') === 0);
for (const m of [65, 67, 69, 71, 72]) { await p.X(`noteIn(${m})`); await W(p, 40); }
await W(p, 400);
g = await G(p);
const end1 = await ev(p, () => ({ well: document.getElementById('sc1Well')?.textContent, b: [...document.querySelectorAll('#actions button')].map(x => x.id), endModal: !document.getElementById('endModal').hidden }));
check('gamme rejouée : « Bien joué ! » avec Revoir la gamme / Passer à l’évaluation / Rejouer, pas d’écran de fin noté', g.phase === 'success' && end1.well === 'Bien joué !' && end1.b.join() === 'sc1See,sc1ToEval,sc1Replay' && !end1.endModal, { g, end1 });
check('entraînement : ni étoiles ni XP', await p.X('sc1Get("notes","major","C")') === 0 && await p.X('S.xp') === xp0 && !(await stored(p)).scStars?.notes?.['C-major']);
if (CAP) await p.screenshot({ path: `${CAP}/r49_fin.png` });
// MIDI: Si = see it again, Do = play again (the lone-note shortcuts only when a command is awaited)
await p.X('midiStart(71)'); await W(p, 300);
check('Si seul sur « Bien joué » = revoir la démonstration', (await G(p)).demo);
await p.X('midiStart(60)'); await W(p, 300);
g = await G(p);
check('Do seul pendant la démo : une simple note (la démo continue)', g.demo && g.phase === 'revealed', g);
await ev(p, () => document.getElementById('sc1Your').click()); await W(p, 300);
check('« À toi » passe la démonstration', (await G(p)).phase === 'listening');
await p.X('midiStart(60)'); await W(p, 200);
check('Do seul pendant que tu joues : une note de la gamme, pas une commande', (await G(p)).phase === 'listening' && await p.X('midiStart(60)') === false);
await ev(p, () => document.getElementById('sc1See').click()); await W(p, 300);
check('« Revoir la gamme » (toujours visible) relance la démonstration', (await G(p)).demo);
await ev(p, () => document.getElementById('sc1Your').click()); await W(p, 200);
for (const m of C_MAJ) { await p.X(`noteIn(${m})`); await W(p, 40); } await W(p, 300);
await p.X('midiStart(60)'); await W(p, 300);
g = await G(p);
check('Do seul sur « Bien joué » = rejouer (à toi, sans démo)', g.phase === 'listening' && !g.demo && g.tr, g);
// → Evaluation (the button) : unchanged, stars
for (const m of C_MAJ) { await p.X(`noteIn(${m})`); await W(p, 40); } await W(p, 300);
await ev(p, () => document.getElementById('sc1ToEval').click()); await W(p, 400);
g = await G(p);
const bar2 = await ev(p, () => [...document.querySelectorAll('#sc1Tm button')].map(b => b.getAttribute('aria-pressed')).join());
check('« Passer à l’évaluation » : la même gamme, notée, mode retenu (S.settings.sc1Train="eval"), aides du joueur rendues', g.phase === 'listening' && !g.tr && g.k === 'C' && bar2 === 'false,true' && await p.X('S.settings.sc1Train') === 'eval' && await p.X('S.settings.guideK===false && S.settings.guideP===true'), { g, bar2 });
for (const m of C_MAJ) { await p.X(`noteIn(${m})`); await W(p, 40); } await W(p, 2400);
check('évaluation inchangée : 3 étoiles, fin au-dessus de la liste', await p.X('sc1Get("notes","major","C")') === 3 && await ev(p, () => !document.getElementById('endModal').hidden && document.querySelectorAll('#endBody .sc1-stars span.on').length === 3) && await p.X('page') === 'sc1' && await p.X('S.xp') > xp0);
await ev(p, () => document.getElementById('sc1Back').click()); await W(p, 300);
// a scale with stars: the last chosen mode (eval)
await ev(p, () => document.querySelector('.sc1-c[data-tid=major][data-k=C]').click()); await W(p, 300);
check('gamme déjà étoilée : le dernier mode choisi (Évaluation)', !(await G(p)).tr);
// eval half-way → training: no penalty
for (const m of [60, 62, 64]) { await p.X(`noteIn(${m})`); await W(p, 40); }
await ev(p, () => document.querySelector('#sc1Tm [data-v=train]').click()); await W(p, 400);
g = await G(p);
check('Évaluation → Entraînement en pleine partie : tentative abandonnée sans pénalité (3 étoiles gardées), démonstration', g.tr && g.demo && await p.X('sc1Get("notes","major","C")') === 3 && await p.X('S.settings.sc1Train') === 'train' && await ev(p, () => document.getElementById('endModal').hidden), g);
await ev(p, () => document.querySelector('#sc1Tm [data-v=eval]').click()); await W(p, 400);
check('… et retour à l’Évaluation par les pastilles', !(await G(p)).tr && await p.X('S.settings.sc1Train') === 'eval');
await quit(p);
await p.X('S.settings.sc1Train="train"; save()');
await ev(p, () => document.querySelector('.sc1-c[data-tid=major][data-k=C]').click()); await W(p, 300);
check('gamme étoilée, dernier mode choisi = Entraînement : Entraînement', (await G(p)).tr);
await quit(p);
// chords: the demo lights chord after chord, then the chords are played without stars
await ev(p, () => document.querySelector('#sc1Seg [data-v=chords]').click()); await W(p, 300);
await ev(p, () => document.querySelector('.sc1-c[data-tid=major][data-k=D]').click()); await W(p, 1900);
const cd = await p.X('({ch:chSeq(), rev:[...document.querySelectorAll("#kbd .k-rev")].length, demo:SC1.demo, sub:$("promptSub").textContent})');
check('accords : démonstration accord par accord (3 touches allumées)', cd.ch && cd.demo && cd.rev === 3 && /accords/.test(cd.sub), cd);
await ev(p, () => document.getElementById('sc1Your').click()); await W(p, 200);
const tri = await p.X('seq.map(s=>s.notes.map(n=>n.pc))');
for (const c of tri) { for (const pc of c) { await p.X(`noteIn(${60 + pc})`); await W(p, 20); } await W(p, 300); }
await W(p, 300);
check('accords en entraînement : « Bien joué », aucune étoile', (await G(p)).phase === 'success' && await p.X('sc1Get("chords","major","D")') === 0);
// mergeState: the chosen mode is a setting of this device; an old state without the key = Evaluation for starred scales
const ms = await p.X('(()=>{ const r=mergeState({settings:{sc1Train:"train"}},{settings:{}}), r2=mergeState({settings:{}},{settings:{sc1Train:"train"}}); return [r.merged.settings.sc1Train, r2.merged.settings.sc1Train===undefined]; })()');
check('mergeState : S.settings.sc1Train gardé (réglage de l’appareil), état ancien sans la clé accepté', ms[0] === 'train' && ms[1] === true, ms);
// leaving during the demo: no timer goes on, the player's aids come back
await ev(p, () => document.querySelector('#sc1See').click()); await W(p, 200);
await ev(p, () => document.querySelector('#modeNav [data-mode=learn]').click()); await W(p, 300); if (await p.isVisible('#leaveModal')) { await p.click('#lvGo'); await W(p, 400); }
await W(p, 6000);
check('quitter pendant la démo : rien ne se relance ailleurs, aides du joueur rendues', await p.X('page') !== 'practice' && await p.X('S.settings.guideK===false && S.settings.guideN===false && S.settings.guideP===true && !SC1.tk'), await G(p));
check('B : aucune erreur JS', p.errs.length === 0, p.errs);
await p.context().close();

// ================= no scroll, 5 sizes, light and dark, FR / EN =================
for (const [w, h] of [[375, 667], [812, 375], [768, 1024], [1024, 768], [1280, 800]]) for (const scheme of ['light', 'dark']) {
  const lang = scheme === 'dark' ? 'en' : 'fr';
  p = await open({ vp: { width: w, height: h }, scheme, st: STATE({ lang }) });
  await p.X('openPage("sc1")'); await W(p, 300);
  await ev(p, () => document.querySelector('.sc1-c[data-tid=major][data-k=C]').click()); await W(p, 1200);
  const a = await noScroll(p);
  if (CAP) await p.screenshot({ path: `${CAP}/r49_demo_${w}x${h}_${scheme}.png` });
  await ev(p, () => document.getElementById('sc1Your').click()); await W(p, 300);
  const b1 = await noScroll(p);
  if (CAP) await p.screenshot({ path: `${CAP}/r49_atoi_${w}x${h}_${scheme}.png` });
  for (const m of C_MAJ) { await p.X(`noteIn(${m})`); await W(p, 30); } await W(p, 400);
  const c1 = await noScroll(p);
  const vis = await ev(p, () => [...document.querySelectorAll('#actions button')].every(x => { const r = x.getBoundingClientRect(); return r.width > 0 && r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1; }) && [...document.querySelectorAll('#sc1Tm button')].every(x => { const r = x.getBoundingClientRect(); return r.width > 0 && r.right <= innerWidth + 1; }));
  if (CAP) await p.screenshot({ path: `${CAP}/r49_fin_${w}x${h}_${scheme}.png` });
  const txt = await ev(p, () => document.querySelector('#sc1Tm button').textContent);
  check(`${w}×${h} ${scheme} ${lang} : démo, à toi et fin sans défilement, pastilles et boutons visibles`, a && b1 && c1 && vis && txt === (lang === 'fr' ? 'Entraînement' : 'Practice'), { a, b1, c1, vis, txt });
  if (p.errs.length) check(`${w}×${h} : aucune erreur JS`, false, p.errs);
  await p.context().close();
}

await b.close();
console.log(fails.length ? `\n${fails.length} échec(s)` : '\nTout est OK');
process.exit(fails.length ? 1 : 0);
