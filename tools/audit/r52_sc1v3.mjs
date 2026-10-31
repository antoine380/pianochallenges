// Chantier GAMMES UNE À UNE v3 (retours d'Antoine du 27/10/2026).
// A. Tutoriel à la première visite de la page sc1 (moteur #tour : « Étape i sur 6 » (6e : Configurer mon cours, chantier MATIÈRES), bulle sur NOTES | ACCORDS, une case, les étoiles,
//    la coupe, la Révision ; Suivant / Précédent / croix ; Do MIDI = Suivant ; mémorisé dans S.settings.sc1Tour ; « ? » #sc1Help pour le revoir ; EN).
// B. Info-bulles exactes (#sc1Tip) : Révision désactivée, coupe éteinte / gagnée (survol souris, tap).
// C. Touches de notes (kbd.kn) seulement avec un vrai clavier MIDI : fenêtre du choix sans « Conseillé », débranchement / rebranchement,
//    ports virtuels ignorés (« Logic Pro Virtual Out » seul = aucun clavier ; avec un LUMI, seul le LUMI compte).
// D. Entraînement : doigtés toujours (option coupée) ; Évaluation : aucune aide (touches, noms, aide progressive, « Je sèche », autoHelp,
//    portée) ni chrono, réglages du joueur jamais modifiés dans la sauvegarde ; fin d'entraînement : Rejouer (gris) puis « Passer à
//    l'évaluation » (principal, à droite).
// E. « Terminer la partie » : bouton gris + confirmation (Continuer / Terminer, textes exacts), avant même la première note.
// F. Révision : plus de réglage de chrono, pas de chrono ni d'aide pendant la révision.
// G. Pas de défilement aux 5 tailles (clair / sombre), aucune erreur JS.
// Usage : PORT=8940 NODE_PATH=… PW_CHROMIUM=… node tools/audit/r52_sc1v3.mjs   (CAP=dossier pour des captures)
import { createRequire } from 'module';
import fs from 'fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = process.env.PORT || '8767', URL = `http://localhost:${PORT}/`, CAP = process.env.CAP || '';
if (CAP) fs.mkdirSync(CAP, { recursive: true });
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d !== undefined && !ok ? ' — ' + JSON.stringify(d).slice(0, 400) : '')); if (!ok) fails.push(n); };
const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const NAT = `window.webkit={messageHandlers:{bridge:{postMessage(){}}}}; window.__cb={}; window.__nl=[];
window.__in=window.__in0||[{id:'7',name:'LUMI Keys BLOCK 3F1A'}];
window.Capacitor={nativePromise:(p,m,o)=>new Promise(r=>setTimeout(()=>r(m==='start'||m==='listInputs'?{inputs:window.__in.slice()}:{}),150)),
  nativeCallback:(p,m,o,cb)=>{ if(p==='Midi'&&o.eventName==='midi') window.__nl.push(cb); else window.__cb[p+':'+o.eventName]=cb; return 'id'; }};
window.__nat=(data,id)=>window.__nl.forEach(f=>f({id:id||'7',data}));
window.__ports=list=>{ window.__in=list; const f=window.__cb['Midi:statechange']; if(f) f({inputs:list}); };`;
const ALL3 = Object.fromEntries(['major', 'minor', 'harm', 'mel'].map(t => [(t === 'major' ? 'C' : 'C') + '-' + t, 3]));
const STATE = (o = {}) => ({ xp: 900, gate: 'account', onb: { done: 1 }, tourDone: 1, langV2: true, pwShown: 1, ...(o.stars ? { scStars: o.stars } : {}),
  introSeen: { scales: 1, chords: 1, harmony: 1, prog: 1, ear: 1, games: 1, daily: 1 }, midi: { later: Date.now() }, goal: { kind: 'min', v: 10, asked: 1, at: 1 },
  settings: { lang: o.lang || 'fr', notation: o.lang || 'fr', input: o.input || 'midi', uiSound: false, octave: true, ...(o.set || {}) } });
async function open({ vp = { width: 1024, height: 768 }, st = STATE(), scheme = 'light', ports, touch } = {}) {
  const c = await b.newContext({ viewport: vp, hasTouch: touch ?? vp.width < 900, colorScheme: scheme });
  if (ports) await c.addInitScript(`window.__in0=${JSON.stringify(ports)};`);
  await c.addInitScript(NAT);
  await c.route(u => u.href.startsWith(URL) && (u.pathname === '/' || u.pathname === '/index.html'), async r => { const res = await r.fetch(); let h = await res.text(); const e = h.lastIndexOf('})();\n</script>'); h = h.slice(0, e) + '\nwindow.__X=s=>eval(s);\n' + h.slice(e); await r.fulfill({ response: res, body: h, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await c.route('https://ijdxeasxmgevuchyuenn.supabase.co/**', r => r.abort());
  const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/net::ERR|Failed to load resource/.test(m.text())) p.errs.push(m.text()); });
  await p.addInitScript(`if(!sessionStorage.getItem('s')){ sessionStorage.setItem('s','1'); localStorage.setItem('memo-gammes-v1', ${JSON.stringify(JSON.stringify(st))}); }`);
  await p.goto(URL); await p.waitForFunction(() => !!window.__X, null, { timeout: 15000 }); await p.waitForTimeout(1500);
  p.X = s => p.evaluate(s => window.__X(s), s);
  return p;
}
const W = (p, ms) => p.waitForTimeout(ms);
const ev = (p, f, a) => p.evaluate(f, a);
const nat = async (p, data, ms = 150) => { await ev(p, d => window.__nat(d), data); await W(p, ms); };
const toList = async p => { await ev(p, () => document.querySelector('#modeNav [data-mode=learn]').click()); await W(p, 400); await ev(p, () => document.querySelector('#learnTiles .sc1-tile').click()); await W(p, 700); };
const tourVis = p => ev(p, () => !!document.getElementById('tour') && !document.getElementById('tour').hidden);
const tour = p => ev(p, () => ({ k: document.getElementById('tourK')?.textContent, h: document.getElementById('tourH')?.textContent, kbd: (() => { const k = document.querySelector('#tourNext kbd'); return k ? getComputedStyle(k).display !== 'none' && k.textContent : null; })() }));
const holeOn = (p, sel) => ev(p, sel => { const h = document.getElementById('tourHole').getBoundingClientRect(), r = document.querySelector(sel).getBoundingClientRect(); return Math.abs(h.left + 6 - r.left) < 2 && Math.abs(h.top + 6 - r.top) < 2; }, sel);
const kbdShown = (p, sel) => ev(p, sel => [...document.querySelectorAll(sel)].filter(k => getComputedStyle(k).display !== 'none').map(k => k.textContent), sel);
const noScroll = p => ev(p, () => { const d = document.scrollingElement, m = document.getElementById('main'); return d.scrollHeight - d.clientHeight <= 1 && d.scrollWidth - d.clientWidth <= 1 && m.scrollHeight - m.clientHeight <= 1; });
const stored = p => ev(p, () => JSON.parse(localStorage.getItem('memo-gammes-v1')));
const pick = async (p, v) => { await ev(p, v => document.getElementById(v === 'eval' ? 'sc1PkEval' : 'sc1PkTrain').click(), v); await W(p, 400); };
const cell = async (p, tid, k) => { await ev(p, ([tid, k]) => document.querySelector(`.sc1-c[data-tid="${tid}"][data-k="${k}"]`).click(), [tid, k]); await W(p, 400); };
const C_MAJ = [60, 62, 64, 65, 67, 69, 71, 72];

// ================= A. Tutoriel =================
let p = await open({ st: STATE({ set: {} }) });
await toList(p);
check('1re visite de Gammes une à une : le tutoriel s’ouvre', await tourVis(p));
let tu = await tour(p);
check('étape 1 : « Étape 1 sur 6 », NOTES / ACCORDS, bulle sur le sélecteur', tu.k === 'Étape 1 sur 6' && /Notes ou accords/.test(tu.h) && await holeOn(p, '#sc1Seg'), tu);
check('bouton Suivant : la touche Do affichée (clavier MIDI branché)', tu.kbd === 'Do', tu);
if (CAP) await p.screenshot({ path: `${CAP}/01_tutoriel_ipad.png` });
await ev(p, () => document.getElementById('tourNext').click()); await W(p, 350);
tu = await tour(p);
check('étape 2 : une case de gamme, Entraînement et Évaluation expliqués', tu.k === 'Étape 2 sur 6' && await holeOn(p, '#sc1Grid .sc1-c') && await ev(p, () => /Entraînement/.test(document.getElementById('tourL').textContent) && /Évaluation/.test(document.getElementById('tourL').textContent)), tu);
await nat(p, [0x90, 60, 90], 300); await nat(p, [0x80, 60, 0]);
tu = await tour(p);
check('Do seul (MIDI) = Suivant : étape 3, les étoiles (1 / 2 / 3)', tu.k === 'Étape 3 sur 6' && await holeOn(p, '#sc1Grid .sc1-c .sc1-st') && await ev(p, () => document.querySelectorAll('#tourL li').length === 3) && await p.X('page') === 'sc1' && await ev(p, () => document.getElementById('sc1Pick').hidden), tu);
await ev(p, () => document.getElementById('tourPrev').click()); await W(p, 350);
check('Précédent : retour à l’étape 2', (await tour(p)).k === 'Étape 2 sur 6');
await ev(p, () => document.getElementById('tourNext').click()); await W(p, 300); await ev(p, () => document.getElementById('tourNext').click()); await W(p, 350);
check('étape 4 : la coupe en bout de ligne', (await tour(p)).k === 'Étape 4 sur 6' && await holeOn(p, '#sc1Grid .sc1-cup'));
await ev(p, () => document.getElementById('tourNext').click()); await W(p, 350);
check('étape 5 : le bouton Révision', (await tour(p)).k === 'Étape 5 sur 6' && await holeOn(p, '#sc1RvB'));
await ev(p, () => document.getElementById('tourNext').click()); await W(p, 350);
check('étape 6 (chantier MATIÈRES) : « Configurer mon cours »', (await tour(p)).k === 'Étape 6 sur 6' && await holeOn(p, '#uaCfg'));
await ev(p, () => document.getElementById('tourNext').click()); await W(p, 350);
check('Terminé : tutoriel fermé, mémorisé (S.settings.sc1Tour), le tutoriel général non touché', !await tourVis(p) && (await stored(p)).settings.sc1Tour === 1 && (await stored(p)).tourDone === 1);
await ev(p, () => document.getElementById('homeLink').click()); await W(p, 300); await toList(p);
check('2e visite : pas de tutoriel', !await tourVis(p));
check('bouton « ? » discret pour le revoir', await ev(p, () => { const h = document.getElementById('sc1Help'); return !!h && h.getAttribute('aria-label') === 'Revoir le tutoriel' && h.getBoundingClientRect().width <= 32; }));
await ev(p, () => document.getElementById('sc1Help').click()); await W(p, 350);
check('« ? » relance le tutoriel à l’étape 1', await tourVis(p) && (await tour(p)).k === 'Étape 1 sur 6');
await ev(p, () => document.getElementById('tourX').click()); await W(p, 300);
check('croix : fermé', !await tourVis(p));
check('aucune erreur JS (A)', !p.errs.length, p.errs);
await p.context().close();
// EN, screen keyboard (no MIDI): no Do on Next
p = await open({ st: STATE({ lang: 'en', input: 'screen' }), ports: [] });
await toList(p);
tu = await tour(p);
check('EN : « Step 1 of 5 », « Notes or chords », pas de touche Do sans clavier MIDI', tu.k === 'Step 1 of 5' && /Notes or chords/.test(tu.h) && !tu.kbd, tu);
for (const v of [{ width: 375, height: 667 }, { width: 812, height: 375 }]) { await p.setViewportSize(v); await W(p, 400);
  check(`tutoriel ${v.width}×${v.height} : bulle entière à l’écran, pas de défilement`, await ev(p, () => { const r = document.getElementById('tourTip').getBoundingClientRect(); return r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; }) && await noScroll(p)); }
await p.context().close();

// ================= B. Info-bulles =================
p = await open({ st: STATE({ set: { sc1Tour: 1 } }), touch: false });
await toList(p);
const tip = () => ev(p, () => { const t = document.getElementById('sc1Tip'); return t && !t.hidden ? t.textContent : null; });
await p.hover('#sc1RvB'); await W(p, 200);
check('survol de Révision (aucune gamme à 3 étoiles) : info-bulle exacte', await tip() === 'Termine une gamme avec 3 étoiles pour débloquer la révision.', await tip());
check('Révision : le texte aussi pour les lecteurs d’écran', /débloquer la révision/.test(await ev(p, () => document.getElementById('sc1RvB').getAttribute('aria-label'))));
await p.mouse.move(2, 2); await W(p, 150);
check('la souris s’en va : la bulle disparaît', await tip() === null);
await p.hover('#sc1Grid .sc1-cup'); await W(p, 200);
check('survol d’une coupe éteinte : « Termine les 4 gammes de Do avec 3 étoiles pour gagner la coupe. »', await tip() === 'Termine les 4 gammes de Do avec 3 étoiles pour gagner la coupe.', await tip());
await p.context().close();
p = await open({ vp: { width: 375, height: 667 }, st: STATE({ set: { sc1Tour: 1 }, stars: { notes: ALL3 } }) });
await toList(p);
await p.tap('#sc1Grid .sc1-cup'); await W(p, 200);
check('mobile, tap sur la coupe gagnée : « Coupe de Do gagnée ! »', await tip() === 'Coupe de Do gagnée !', await tip());
await W(p, 3000);
check('… puis la bulle s’efface seule', await tip() === null);
check('Révision active (4 gammes à 3 étoiles) : pas d’info-bulle', await ev(p, () => !document.getElementById('sc1RvB').dataset.tip));
await p.context().close();

// ================= C. Touches de notes seulement avec un vrai clavier MIDI =================
p = await open({ st: STATE({ set: { sc1Tour: 1 } }) });
await toList(p); await cell(p, 'major', 'D');
check('fenêtre du choix : plus d’étiquette « Conseillé »', await ev(p, () => !document.querySelector('#sc1PkO .sc1pk-tag') && !/Conseillé/.test(document.getElementById('sc1PkO').textContent)));
check('fenêtre du choix, LUMI branché : touches Do / Mi affichées', (await kbdShown(p, '#sc1PkO kbd')).join() === 'Do,Mi');
if (CAP) await p.screenshot({ path: `${CAP}/02_choix_ipad.png` });
await ev(p, () => window.__ports([])); await W(p, 400);
check('débranché (fenêtre ouverte) : touches masquées tout de suite', (await kbdShown(p, '#sc1PkO kbd')).length === 0 && await p.X('midiReady') === false);
await ev(p, () => window.__ports([{ id: '9', name: 'Logic Pro Virtual Out' }])); await W(p, 400);
check('seul « Logic Pro Virtual Out » : aucun clavier (midiReady faux, pas listé, touches masquées)', await p.X('midiReady') === false && (await p.X('midiNames')).length === 0 && (await kbdShown(p, '#sc1PkO kbd')).length === 0);
await ev(p, () => window.__ports([{ id: '9', name: 'Logic Pro Virtual Out' }, { id: '7', name: 'LUMI Keys BLOCK 3F1A' }])); await W(p, 400);
check('Logic + LUMI : seul le LUMI compte, touches revenues', (await p.X('midiNames')).join() === 'LUMI Keys BLOCK 3F1A' && (await kbdShown(p, '#sc1PkO kbd')).join() === 'Do,Mi');
const virt = await p.X(`["Logic Pro Virtual Out","Logic Pro Virtual In","IAC Driver Bus 1","Gestionnaire IAC Bus 1","Network Session 1","Session réseau 1","loopMIDI Port","Midi Through Port-0","GarageBand Virtual Out","Ableton Live","MainStage","FL Studio MIDI","rtpMIDI session","Microsoft GS Wavetable Synth","Port virtuel"].filter(n=>!midiVirtual(n))`);
check('ports logiciels reconnus (Logic, IAC, sessions réseau, loopMIDI, Midi Through, GarageBand, Ableton, MainStage, FL Studio, rtpMIDI, Wavetable, « virtuel »)', virt.length === 0, virt);
const real = await p.X(`["LUMI Keys BLOCK 3F1A","Keystation 49 MK3","Roland Digital Piano","Yamaha P-125","MPK mini 3","Launchkey 61 MK3","Arturia KeyStep 37","CASIO USB-MIDI","Nord Stage 3"].filter(n=>midiVirtual(n))`);
check('vrais claviers jamais pris pour des ports virtuels', real.length === 0, real);
await nat(p, [0x90, 60, 90], 500);
check('Do (LUMI) = Entraînement depuis la fenêtre', await p.X('page') === 'practice' && await p.X('!!game.sc1.train'));
await p.X('sc1Turn()'); await W(p, 300);
for (const m of C_MAJ.map(x => x + 2).map(x => x)) {} // (Ré majeur ci-dessous)
for (const m of [62, 64, 66, 67, 69, 71, 73, 74]) { await p.X(`noteIn(${m})`); await W(p, 40); } await W(p, 400);
check('fin d’entraînement avec MIDI : touches Mi / Si / Do', (await kbdShown(p, '#actions kbd')).join() === 'Mi,Si,Do', await kbdShown(p, '#actions kbd'));
await ev(p, () => window.__ports([])); await W(p, 400);
const noKb = await kbdShown(p, '#actions kbd');
check('débranché sur la fin d’entraînement : plus aucune touche de note (au plus Espace)', noKb.every(k => /Espace|Space/.test(k)), noKb);
check('aucune erreur JS (B, C)', !p.errs.length, p.errs);
await p.context().close();

// ================= D. Entraînement : doigtés ; Évaluation : aucune aide, pas de chrono =================
const AIDS = { sc1Tour: 1, diffV2: true, fing: false, guideK: true, guideN: true, guideP: true, staff: true, delay: 10 };
p = await open({ st: STATE({ set: AIDS }) });
await toList(p); await cell(p, 'major', 'C'); await pick(p, 'train');
await W(p, 1500);
check('Entraînement, démo : doigtés affichés alors que l’option est coupée', await ev(p, () => document.querySelectorAll('#kbd .fg').length > 0));
await p.X('sc1Turn()'); await W(p, 300);
check('Entraînement, à toi : touche guidée + doigté', await ev(p, () => !!document.querySelector('#kbd .k-guide .fg')));
for (const m of C_MAJ) { await p.X(`noteIn(${m})`); await W(p, 40); } await W(p, 400);
const fin = await ev(p, () => ({ ids: [...document.querySelectorAll('#actions button')].map(b => b.id), prim: [...document.querySelectorAll('#actions .btn.primary')].map(b => b.id), last: document.querySelector('#actions button:last-of-type')?.id }));
check('fin d’entraînement : « Passer à l’évaluation » principal tout à droite, « Rejouer » gris juste à sa gauche, « Revoir » à gauche', fin.ids.join() === 'sc1See,sc1Replay,sc1ToEval' && fin.prim.join() === 'sc1ToEval', fin);
const bg = await ev(p, () => [getComputedStyle(document.getElementById('sc1ToEval')).backgroundImage, getComputedStyle(document.getElementById('sc1Replay')).backgroundImage]);
check('« Passer à l’évaluation » en violet (dégradé principal), « Rejouer » sans', /gradient/.test(bg[0]) && bg[1] === 'none', bg);
if (CAP) await p.screenshot({ path: `${CAP}/03_fin_entrainement_ipad.png` });
await ev(p, () => document.getElementById('sc1ToEval').click()); await W(p, 500);
const evs = await p.X('({tr:!!game.sc1.train, phase, deadline, gk:S.settings.guideK, gn:S.settings.guideN, gp:S.settings.guideP, st:S.settings.staff, d:S.settings.delay, guide:document.querySelectorAll("#kbd .k-guide").length, gpc:document.body.classList.contains("gp"), timer:getComputedStyle($("timerSel")).display, gdd:getComputedStyle(document.querySelector(".guide-dd")).display, staff:!!document.querySelector("#staffBox svg") && getComputedStyle($("staffBox")).display!=="none", acts:document.querySelectorAll("#actions button").length})');
check('Évaluation : aucune aide (touches, noms, aide progressive, portée), ni chrono, ni bouton « Je sèche »', !evs.tr && evs.phase === 'listening' && !evs.deadline && evs.guide === 0 && !evs.gpc && evs.timer === 'none' && evs.gdd === 'none' && !evs.staff && evs.acts === 0, evs);
await p.X('noteIn(60)'); await W(p, 60);
for (const m of [61, 61, 61]) { await p.X(`noteIn(${m})`); await W(p, 60); }
check('Évaluation : 3 fausses notes, pas de « Je sèche » automatique', await p.X('!($("autoHelp") && !$("autoHelp").hidden)'));
await p.keyboard.press('Space'); await W(p, 300);
check('Évaluation : Espace ne révèle rien', await p.X('phase') === 'listening');
check('Évaluation : doigtés selon l’option (coupée = aucun)', await ev(p, () => document.querySelectorAll('#kbd .fg').length === 0));
let sv = (await stored(p)).settings;
check('réglages du joueur intacts dans la sauvegarde (aides, portée, chrono 10 s, doigtés coupés)', sv.guideK === true && sv.guideN === true && sv.guideP === true && sv.staff === true && sv.delay === 10 && sv.fing === false, sv);

// ================= E. Terminer la partie =================
const ge = await ev(p, () => { const s = getComputedStyle(document.getElementById('gameEnd')); return { bg: s.backgroundColor, td: s.textDecorationLine, br: parseFloat(s.borderTopLeftRadius), txt: document.getElementById('gameEnd').textContent }; });
check('« Terminer la partie » : un vrai bouton gris (fond, arrondi, pas souligné)', ge.bg !== 'rgba(0, 0, 0, 0)' && ge.td === 'none' && ge.br > 8, ge);
await ev(p, () => document.getElementById('gameEnd').click()); await W(p, 350);
const lv = await ev(p, () => ({ open: !document.getElementById('leaveModal').hidden, t: document.getElementById('lvTitle').textContent, s: document.getElementById('lvSub').textContent, go: document.getElementById('lvGo').firstChild.textContent, stay: document.getElementById('lvStay').firstChild.textContent, prim: document.getElementById('lvStay').classList.contains('primary') && !document.getElementById('lvGo').classList.contains('primary') }));
check('confirmation : « Terminer la partie ? » / « Ta progression sur cette gamme ne sera pas comptée. » [Continuer] (principal) [Terminer] (gris)', lv.open && lv.t === 'Terminer la partie ?' && lv.s === 'Ta progression sur cette gamme ne sera pas comptée.' && lv.go === 'Terminer' && lv.stay === 'Continuer' && lv.prim, lv);
check('confirmation avec MIDI : Do = Continuer, Si = Terminer affichés', (await kbdShown(p, '#leaveModal kbd')).join() === 'Si,Do', await kbdShown(p, '#leaveModal kbd'));
if (CAP) await p.screenshot({ path: `${CAP}/04_confirmation_ipad.png` });
await nat(p, [0x90, 60, 90], 300); await nat(p, [0x80, 60, 0]);
check('Do (MIDI) = Continuer : la partie reprend', await ev(p, () => document.getElementById('leaveModal').hidden) && await p.X('page') === 'practice' && await p.X('phase') === 'listening');
await ev(p, () => document.getElementById('gameEnd').click()); await W(p, 300);
await ev(p, () => document.getElementById('lvGo').click()); await W(p, 600);
check('Terminer : la partie s’arrête', await p.X('page') !== 'practice' || await p.X('!game'));
await ev(p, () => { const x = document.getElementById('endModal'); if (!x.hidden) document.getElementById('sc1Back')?.click(); }); await W(p, 300);
// training, before any note: still asked
await cell(p, 'major', 'G'); await pick(p, 'train'); await W(p, 300);
await ev(p, () => document.getElementById('gameEnd').click()); await W(p, 300);
check('Entraînement, pendant la démo (aucune note jouée) : la confirmation s’ouvre aussi', await ev(p, () => !document.getElementById('leaveModal').hidden));
await ev(p, () => document.getElementById('lvStay').click()); await W(p, 300);
check('Continuer : on reste dans la partie', await p.X('page') === 'practice' && await p.X('!!game'));
await ev(p, () => document.getElementById('gameEnd').click()); await W(p, 300); await ev(p, () => document.getElementById('lvGo').click()); await W(p, 600);
check('Terminer pendant l’entraînement : retour à la liste', await p.X('page') === 'sc1');
sv = (await stored(p)).settings;
check('après les parties : réglages du joueur rendus (aides, portée, chrono, doigtés)', await p.X('S.settings.guideK===true && S.settings.guideP===true && S.settings.staff===true && S.settings.delay===10 && S.settings.fing===false') && sv.delay === 10 && sv.fing === false);
check('aucune erreur JS (D, E)', !p.errs.length, p.errs);
await p.context().close();

// ================= F. Révision : pas de chrono =================
p = await open({ st: STATE({ set: { ...AIDS, sc1RvT: 10 }, stars: { notes: { 'C-major': 3, 'G-major': 3 } } }) });
await toList(p);
await ev(p, () => document.getElementById('sc1RvB').click()); await W(p, 350);
check('fenêtre de révision : plus de réglage de chrono, « Mélanger l’ordre » gardé', await ev(p, () => !document.getElementById('sc1RvTm') && !document.querySelector('#sc1Rv .sc1rv-row') && !!document.getElementById('sc1RvMix')));
await ev(p, () => document.getElementById('sc1RvGo').click()); await W(p, 500);
const rv = await p.X('({rv:rvOn(), deadline, guide:document.querySelectorAll("#kbd .k-guide").length, timer:getComputedStyle($("timerSel")).display, acts:document.querySelectorAll("#actions button").length})');
check('révision : ni chrono (même avec un ancien réglage de 10 s), ni aide', rv.rv && !rv.deadline && rv.guide === 0 && rv.timer === 'none' && rv.acts === 0, rv);
await ev(p, () => document.getElementById('gameEnd').click()); await W(p, 300);
check('révision : « Terminer la partie » confirmé avec le texte de la révision', await ev(p, () => !document.getElementById('leaveModal').hidden && document.getElementById('lvSub').textContent === 'Ta progression dans cette révision ne sera pas comptée.'));
await ev(p, () => document.getElementById('lvStay').click()); await W(p, 200);
check('aucune erreur JS (F)', !p.errs.length, p.errs);
await p.context().close();

// ================= G. Pas de défilement, clair / sombre =================
for (const scheme of ['light', 'dark']) for (const vp of [{ width: 375, height: 667 }, { width: 812, height: 375 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }, { width: 1280, height: 800 }]) {
  p = await open({ vp, scheme, st: STATE({ set: { sc1Tour: 1 } }) });
  await toList(p);
  const okL = await noScroll(p);
  await cell(p, 'major', 'C'); const okP = await noScroll(p);
  if (CAP && vp.width === 375) await p.screenshot({ path: `${CAP}/02_choix_${vp.width}_${scheme}.png` });
  await pick(p, 'eval'); await ev(p, () => document.getElementById('gameEnd').click()); await W(p, 300);
  const okC = await noScroll(p);
  if (CAP && (vp.width === 375 || vp.width === 812)) await p.screenshot({ path: `${CAP}/04_confirmation_${vp.width}_${scheme}.png` });
  check(`${vp.width}×${vp.height} ${scheme} : liste, choix et confirmation sans défilement`, okL && okP && okC && !p.errs.length, { okL, okP, okC, e: p.errs });
  await p.context().close();
}
await b.close();
console.log(fails.length ? `\nr52 FAIL ${fails.length}` : '\nr52 OK');
process.exit(fails.length ? 1 : 0);
