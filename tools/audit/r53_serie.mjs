// Chantier GAMMES v4 + SÉRIE 10 MIN (retours d'Antoine du 27/10/2026).
// A. Série : un jour compte quand on a joué 10 minutes (S.playSec du jour, horloge simulée par page.clock + noteIn) :
//    anneau à 0 / 5 / 10 min (menu #streakStat, fiche #pfSr), « Encore 5 min pour valider ta série » + pulsation au passage des 5 min,
//    l'XP seul ne fait plus avancer la série, animation #srCel à 10 min (une seule fois par jour, PLEIN ÉCRAN au centre, maquette
//    serie-anim-plein.html : voile, anneau ½ → plein, flamme, « Tes 10 minutes du jour sont faites. », initiales des jours, confettis),
//    jamais pendant une note attendue (exercice, partie de jeu), centrée et couvrant l'écran aux 5 tailles, fermée au clic / Échap /
//    Do seul MIDI (faux Web MIDI ; ce Do n'est pas compté par l'exercice en dessous, en pause pendant l'animation),
//    ancienne règle gardée pour les jours d'avant la bascule (S.srFrom),
//    fusion mergeState (playSec max par jour, srFrom le plus ancien, srShown le plus récent), mouvement réduit, EN.
// B. Fin de Gammes une à une : messages variés, pas de « coupe sur 12 », pas de ligne « Série : … Reviens demain ».
// C. Tutoriel : la pointe de la bulle vise le centre de la cible (mesure géométrique), tutoriel de Gammes une à une et tutoriel
//    général, 5 tailles ; NOTES / ACCORDS, Entraînement / Évaluation en gras, pictos, étoiles dorées, « au moins une faute ».
// D. Pas de défilement (fiche Progression, accueil) aux 5 tailles, clair / sombre ; aucune erreur JS.
// Usage : PORT=8945 NODE_PATH=… PW_CHROMIUM=… node tools/audit/r53_serie.mjs   (CAP=dossier pour des captures)
import { createRequire } from 'module';
import fs from 'fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = process.env.PORT || '8767', URL = `http://localhost:${PORT}/`, CAP = process.env.CAP || '';
if (CAP) fs.mkdirSync(CAP, { recursive: true });
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d !== undefined && !ok ? ' — ' + JSON.stringify(d).slice(0, 400) : '')); if (!ok) fails.push(n); };
const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const ds = d => { const z = new Date(d.getTime() - d.getTimezoneOffset() * 6e4); return z.toISOString().slice(0, 10); };
const D = n => { const d = new Date(); d.setDate(d.getDate() + n); return ds(d); };
const TODAY = D(0);
const STATE = (o = {}) => ({ xp: 900, gate: 'account', onb: { done: 1 }, tourDone: 1, langV2: true, pwShown: 1,
  introSeen: { scales: 1, chords: 1, harmony: 1, prog: 1, ear: 1, games: 1, daily: 1 }, midi: { later: Date.now() }, goal: { kind: 'min', v: 10, asked: 1, at: 1 },
  xpDays: { [D(-1)]: 40, [D(-2)]: 30, [D(-3)]: 30 }, streak: { days: 3, last: D(-1) }, playSec: {}, wkRev: { last: '9999-12-31' }, ...(o.st || {}),
  settings: { lang: o.lang || 'fr', notation: o.lang || 'fr', input: 'screen', uiSound: false, sc1Tour: 1, ...(o.set || {}) } });
async function open({ vp = { width: 1024, height: 768 }, st = STATE(), scheme = 'light', clock = false, rm = 'no-preference' } = {}) {
  const c = await b.newContext({ viewport: vp, hasTouch: vp.width < 900, colorScheme: scheme, reducedMotion: rm });
  await c.route(u => u.href.startsWith(URL) && (u.pathname === '/' || u.pathname === '/index.html'), async r => { const res = await r.fetch(); let h = await res.text(); const e = h.lastIndexOf('})();\n</script>'); h = h.slice(0, e) + '\nwindow.__X=s=>eval(s);\n' + h.slice(e); await r.fulfill({ response: res, body: h, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await c.route('https://ijdxeasxmgevuchyuenn.supabase.co/**', r => r.abort());
  const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/net::ERR|Failed to load resource/.test(m.text())) p.errs.push(m.text()); });
  if (clock) await p.clock.install();
  await p.addInitScript(`if(!sessionStorage.getItem('s')){ sessionStorage.setItem('s','1'); localStorage.setItem('memo-gammes-v1', ${JSON.stringify(JSON.stringify(st))}); }`);
  await p.goto(URL); await p.waitForFunction(() => !!window.__X, null, { timeout: 15000 }); await p.waitForTimeout(1500);
  p.X = s => p.evaluate(s => window.__X(s), s);
  return p;
}
const W = (p, ms) => p.waitForTimeout(ms);
const ev = (p, f, a) => p.evaluate(f, a);
const stored = p => ev(p, () => JSON.parse(localStorage.getItem('memo-gammes-v1')));
// playing time: one note then 15 s of (simulated) clock = one tick of S.playSec
const play = async (p, ticks) => { for (let i = 0; i < ticks; i++) { await p.X('lastNoteAt=Date.now()'); const s0 = await p.X('(S.playSec||{})[dayStr()]|0'); for (let k = 0; k < 17; k++) { await p.clock.runFor(1000); if ((await p.X('(S.playSec||{})[dayStr()]|0')) !== s0) break; } } };
const ringP = p => ev(p, () => { const f = document.querySelector('#streakStat .sr-ic .fg'); if (!f) return null; const C = 2 * Math.PI * 16; return +(1 - (+f.getAttribute('stroke-dashoffset')) / C).toFixed(2); });
const cel = p => ev(p, () => { const c = document.getElementById('srCel'); if (!c || c.classList.contains('out')) return null; const r = c.getBoundingClientRect(), bx = c.querySelector('.sr-box').getBoundingClientRect(), W = innerWidth, H = innerHeight;
  return { t: c.querySelector('.sr-t').textContent, s: c.querySelector('.sr-s').textContent, h: c.querySelector('.sr-hint').textContent, role: c.getAttribute('role'), modal: c.getAttribute('aria-modal'), lbl: !!document.getElementById(c.getAttribute('aria-labelledby')),
    pe: getComputedStyle(c).pointerEvents, z: +getComputedStyle(c).zIndex, cover: r.left <= 0 && r.top <= 0 && r.right >= W && r.bottom >= H,
    centred: Math.abs((bx.left + bx.right) / 2 - W / 2) <= 2 && Math.abs((bx.top + bx.bottom) / 2 - H / 2) <= 24, fits: bx.top >= 0 && bx.left >= 0 && bx.right <= W && bx.bottom <= H,
    top: (() => { const e = document.elementFromPoint(W / 2, H - 8); return !!e && c.contains(e); })(), days: [...c.querySelectorAll('.sr-days i')].map(i => i.textContent), td: c.querySelectorAll('.sr-days i.td').length }; });
// faux Web MIDI minimal (un clavier) : window.__mon(n) envoie une note-on
const FAKE_MIDI = `(()=>{ const p={id:'in-1',name:'Fake Keyboard 61',state:'connected',connection:'open',type:'input',manufacturer:'Fake',onmidimessage:null};
  const acc={inputs:new Map([[p.id,p]]),outputs:new Map(),onstatechange:null,addEventListener(){},removeEventListener(){}};
  navigator.requestMIDIAccess=async()=>acc; window.__mon=(n,v=100)=>{ if(p.onmidimessage) p.onmidimessage({data:new Uint8Array([0x90,n,v]),timeStamp:performance.now(),target:p}); return !!p.onmidimessage; }; })();`;
const noScroll = p => ev(p, () => { const d = document.scrollingElement, m = document.getElementById('main'); return d.scrollHeight - d.clientHeight <= 1 && d.scrollWidth - d.clientWidth <= 1 && (!m || m.scrollHeight - m.clientHeight <= 1); });
const fiche = async p => { await p.X('openPage("progress")'); await W(p, 500); };

// ================= A. Série 10 min =================
let p = await open({ clock: true });
let s0 = await stored(p);
check('bascule mémorisée : S.srFrom = aujourd’hui (état ancien sans la clé)', s0.srFrom === TODAY, s0.srFrom);
check('0 min : anneau vide sur la flamme du menu, « Joue 10 min pour valider ta série »', await ringP(p) === 0 && /Joue 10 min pour valider ta série/.test(await ev(p, () => document.getElementById('streakStat').title)), [await ringP(p), await ev(p, () => document.getElementById('streakStat').title)]);
await p.X('addXP(25)'); await W(p, 100);
check('de l’XP aujourd’hui sans 10 min : la série n’avance pas (3 j, dernier jour = hier)', await p.X('S.streak.days===3 && S.streak.last===addDays(-1) && effStreak()===3'));
await p.X('openPage("learn")'); await W(p, 300);
await play(p, 19); await W(p, 100);
check('4 min 45 : pas encore de pulsation', !(await p.X('SR.pulseAt')));
await play(p, 1);
check('5 min : S.playSec du jour = 300', await p.X('S.playSec[dayStr()]') === 300);
check('5 min : petite pulsation au passage (menu)', !!(await p.X('SR.pulseAt')) && await ev(p, () => !!document.querySelector('#streakStat .sr-ic.sr-pulse')));
check('5 min : anneau à moitié', await ringP(p) === 0.5, await ringP(p));
await fiche(p);
const half = await ev(p, () => { const r = document.getElementById('pfSr'); return r && { cls: r.className, b: r.querySelector('b').textContent, s: r.querySelector('small').textContent, goalHidden: document.getElementById('pfGoal').hidden, chips: !!r.querySelector('.gl-chips') }; });
check('5 min, carte verte de la fiche : demi-anneau + « Encore 5 min pour valider ta série »', half && /half/.test(half.cls) && half.b === 'Série du jour : 5 / 10 min' && half.s === 'Encore 5 min pour valider ta série', half);
check('objectif = 10 min : la ligne de l’objectif n’est pas répétée, ses pastilles passent dans la ligne de la série', half && half.goalHidden && half.chips, half);
check('fiche : pas de défilement avec la ligne de la série', await noScroll(p));
if (CAP) await p.screenshot({ path: `${CAP}/02_carte_verte_5min_ipad.png` });
await p.X('openPage("games")'); await W(p, 300);
await play(p, 19);
check('9 min 45 : pas d’animation, série toujours à 3', !(await cel(p)) && await p.X('S.streak.days') === 3);
await play(p, 1); await p.clock.runFor(300);
const c1 = await cel(p);
check('10 min, sur une autre page (GAMES) : l’animation « Série : 4 jours ! » / « Tes 10 minutes du jour sont faites. » apparaît', !!c1 && c1.t === 'Série : 4 jours !' && c1.s === 'Tes 10 minutes du jour sont faites.' && c1.h === "Touche l'écran pour continuer", c1);
const pg1 = await p.X('[page, anyWin(), SR.on]');
check('plein écran : couvre tout l’écran, au-dessus des fenêtres (z ≥ 9500), centrée, dialogue accessible (aria-modal, titre), capte les clics ; page inchangée en dessous', c1 && c1.cover && c1.top && c1.centred && c1.fits && c1.z >= 9500 && c1.role === 'dialog' && c1.modal === 'true' && c1.lbl && c1.pe === 'auto' && pg1[0] === 'games' && !pg1[1] && pg1[2], [c1, pg1]);
check('… la série est validée : 4 j, dernier jour = aujourd’hui, animation notée (S.srShown)', await p.X('S.streak.days===4 && S.streak.last===dayStr() && S.srShown===dayStr()'));
check('anneau plein sur la flamme du menu', await ringP(p) === 1);
const DAYS = await ev(p, () => [3, 2, 1, 0].map(i => { const d = new Date(); d.setDate(d.getDate() - i); return new Intl.DateTimeFormat('fr-FR', { weekday: 'narrow' }).format(d).toUpperCase(); }));
check('les 4 pastilles des jours = initiales des 4 derniers jours (série réelle), la dernière s’allume', JSON.stringify(c1.days) === JSON.stringify(DAYS) && c1.td === 1 && await ev(p, () => document.querySelector('#srCel .sr-days i:last-child').classList.contains('td')), [c1.days, DAYS]);
if (CAP) await p.screenshot({ path: `${CAP}/03_animation_10min_ipad.png` });
await p.clock.runFor(Math.max(0, 4000 - await p.X('Date.now()-SR.at')));
check('à 4 s elle est encore là', !!(await cel(p)));
await p.clock.runFor(2000);
check('l’animation s’efface seule (≈ 5 s), SR.on retombe', !(await cel(p)) && !(await p.X('SR.on')));
await play(p, 8); await p.clock.runFor(1500);
check('encore du jeu le même jour : pas de 2e animation', !(await cel(p)));
await fiche(p);
const ok = await ev(p, () => ({ b: document.querySelector('#pfSr b').textContent, done: document.getElementById('pfSr').classList.contains('done'), day: document.getElementById('pfDay').textContent, cal: !!document.querySelector('#pfCal .today.on') }));
check('fiche après 10 min : « Série validée aujourd’hui », 4 j, aujourd’hui coché au calendrier', ok.b === 'Série validée aujourd\'hui' && ok.done && /4/.test(ok.day) && ok.cal, ok);
check('aucune erreur JS (A)', !p.errs.length, p.errs);
await p.context().close();
// a reload the same day: no second animation
p = await open({ clock: true, st: STATE({ st: { srFrom: TODAY, srShown: TODAY, playSec: { [TODAY]: 900 }, streak: { days: 4, last: TODAY } } }) });
await play(p, 2); await p.clock.runFor(1500);
check('rechargement le même jour (déjà vue) : pas d’animation', !(await cel(p)) && await p.X('S.streak.days') === 4);
await p.context().close();

// ---- pendant un exercice : l'animation attend la fin de la gamme ----
p = await open({ clock: true, st: STATE({ st: { srFrom: TODAY, playSec: { [TODAY]: 590 } } }) });
await p.X('openPage("learn")'); await W(p, 300);
await ev(p, () => document.querySelector('#learnTiles .sc1-tile').click()); await p.clock.runFor(700);
await ev(p, () => document.querySelector('.sc1-c[data-tid="major"][data-k="C"]').click()); await p.clock.runFor(400);
await ev(p, () => document.getElementById('sc1PkEval').click()); await p.clock.runFor(600);
check('exercice lancé (Évaluation, note attendue)', await p.X('phase') === 'listening' && await p.X('page') === 'practice');
await p.X('noteIn(60)'); await p.clock.runFor(15000); await p.clock.runFor(1000);
check('10 min atteintes pendant la note attendue : série validée, mais pas d’animation (elle attend, S.srShown pas encore posé)', await p.X('S.streak.last===dayStr()') && !(await cel(p)) && await p.X('phase') === 'listening' && await p.X('S.srShown!==dayStr() && SR.pend===1'));
await p.clock.runFor(30000);
check('… toujours rien 30 s plus tard tant que la note est attendue', !(await cel(p)) && await p.X('phase') === 'listening');
for (const m of [62, 64, 65, 67, 69, 71, 72]) { await p.X(`noteIn(${m})`); await p.clock.runFor(60); }
await p.clock.runFor(1200);
check('gamme jouée, écran de fin pas encore ouvert (phase success, actNow) : toujours rien', !(await cel(p)) || await p.X('endOpen'));
await p.clock.runFor(3000);
const c2 = await cel(p);
check('gamme finie (écran de fin, calme) : l’animation apparaît, au-dessus de la fenêtre de fin', !!c2 && c2.cover && c2.top && c2.z > await ev(p, () => +getComputedStyle(document.getElementById('endModal')).zIndex || 0), c2);
await ev(p, () => document.getElementById('srCel').click()); await p.clock.runFor(400);
check('fermée au clic (toucher), la fenêtre de fin reste', !(await cel(p)) && await ev(p, () => !document.getElementById('endModal').hidden));
check('aucune erreur JS (exercice)', !p.errs.length, p.errs);
await p.context().close();

// ---- fermeture : Échap, Do seul MIDI (non compté par l'exercice en dessous, en pause pendant l'animation) ; pas pendant un jeu ----
p = await open({ clock: true, st: STATE({ st: { srFrom: TODAY, playSec: { [TODAY]: 900 }, streak: { days: 4, last: TODAY }, srShown: D(-1) }, set: { input: 'midi' } }) });
await p.addInitScript(FAKE_MIDI); await p.evaluate(FAKE_MIDI); await p.X('enableMidi(true)'); await p.clock.runFor(300);
check('faux clavier MIDI branché', await p.X('midiMode()') && await ev(p, () => window.__mon(30, 0)));
await p.X('srCelebrate()'); await p.clock.runFor(300);
let c4 = await cel(p);
check('en MIDI : « Touche l’écran ou joue Do pour continuer »', !!c4 && c4.h === "Touche l'écran ou joue Do pour continuer", c4);
await p.keyboard.press('Escape'); await p.clock.runFor(400);
check('fermée par Échap', !(await cel(p)) && !(await p.X('SR.on')));
await p.X('openPage("learn")'); await p.clock.runFor(300);
await ev(p, () => document.querySelector('#learnTiles .sc1-tile').click()); await p.clock.runFor(700);
await ev(p, () => document.querySelector('.sc1-c[data-tid="major"][data-k="C"]').click()); await p.clock.runFor(400);
await ev(p, () => document.getElementById('sc1PkEval').click()); await p.clock.runFor(600);
check('exercice en écoute (Do majeur, Évaluation) : srBusy', await p.X('phase') === 'listening' && await p.X('srBusy()'));
await p.X('srCelebrate()'); await p.clock.runFor(2000);
check('demandée pendant la note attendue : elle attend', !(await cel(p)) && await p.X('SR.pend') === 1);
await p.X('SR.pend=0; srShow()'); await p.clock.runFor(300); // le pire cas, forcé : l'animation est là alors qu'une note est attendue
check('pendant l’animation : l’exercice en dessous est en pause', !!(await cel(p)) && await p.X('paused') === true);
await ev(p, () => window.__mon(64)); await ev(p, () => window.__mon(67)); await p.clock.runFor(300);
check('un accord (Mi + Sol) ne ferme pas et n’est pas compté', !!(await cel(p)) && await p.X('idx===0 && errors===0'));
await ev(p, () => window.__mon(62)); await p.clock.runFor(300);
check('une note seule autre que Do (Ré) ne ferme pas', !!(await cel(p)) && await p.X('idx===0 && errors===0'));
await ev(p, () => window.__mon(60)); await p.clock.runFor(400);
check('Do seul MIDI : fermée ; ce Do n’est PAS compté par l’exercice, qui reprend', !(await cel(p)) && await p.X('idx===0 && errors===0 && played.length===0 && phase==="listening" && paused===false'), await p.X('({idx,errors,phase,paused})'));
await ev(p, () => window.__mon(60)); await p.clock.runFor(200);
check('le Do suivant compte normalement (1re note de la gamme)', await p.X('idx') === 1);
await p.X('openPage("games")'); await p.clock.runFor(300); await ev(p, () => { const e = document.getElementById('lvGo'); if (e && !document.getElementById('leaveModal').hidden) e.click(); }); await p.clock.runFor(300);
await p.X('openPage("games")'); await p.clock.runFor(300);
await ev(p, () => document.querySelectorAll('#gameCards .ptile')[1].click()); await p.clock.runFor(600); await ev(p, () => document.querySelector('#duModes [data-m=solo]').click()); await p.clock.runFor(400);
await ev(p, () => { const c = document.getElementById(document.getElementById('rnStage').hidden ? 'gmBoard' : 'rnCanvas'); c.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); }); await p.clock.runFor(500);
const gRun = await p.X('JSON.stringify(actNow())');
await p.X('srCelebrate()'); await p.clock.runFor(2000);
check('partie de jeu en cours (Contre la montre, actNow) : pas d’animation, elle attend', gRun === '{"k":"game"}' && !(await cel(p)) && await p.X('SR.pend') === 1, gRun);
check('aucune erreur JS (fermeture)', !p.errs.length, p.errs);
await p.context().close();

// ---- couvre l'écran et reste centrée aux 5 tailles, clair / sombre ----
for (const scheme of ['light', 'dark']) for (const vp of [{ width: 375, height: 667 }, { width: 812, height: 375 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }, { width: 1280, height: 800 }]) {
  p = await open({ vp, scheme, clock: true, st: STATE({ st: { srFrom: TODAY, playSec: { [TODAY]: 590 }, streak: { days: 6, last: D(-1) }, xpDays: { [D(-1)]: 9, [D(-2)]: 9, [D(-3)]: 9, [D(-4)]: 9, [D(-5)]: 9, [D(-6)]: 9 } } }) });
  await play(p, 1); await p.clock.runFor(300);
  if (CAP && (vp.width === 375 || vp.width === 1024)) await W(p, 2700); // l'horloge simulée avance aussi en temps réel : ~3 s après l'apparition, tout est allumé
  const c5 = await cel(p);
  check(`${vp.width}×${vp.height} ${scheme} : plein écran, contenu centré et entier, 7 jours`, !!c5 && c5.cover && c5.top && c5.centred && c5.fits && c5.days.length === 7 && c5.t === 'Série : 7 jours !', c5);
  check(`${vp.width}×${vp.height} ${scheme} : la fenêtre « Garde tes progrès » (premier objectif) attend la fin de l’animation`, await ev(p, () => { const m = document.getElementById('accModal'); return !m || m.hidden; }));
  if (CAP && (vp.width === 375 || vp.width === 1024)) await p.screenshot({ path: `${CAP}/05_plein_ecran_${vp.width}_${scheme}.png` });
  await p.context().close();
}

// ---- ancienne règle pour les jours d'avant la bascule ----
p = await open({ st: STATE({ st: { srFrom: D(-2), xpDays: { [D(-5)]: 10, [D(-4)]: 10, [D(-3)]: 10, [D(-2)]: 10, [D(-1)]: 10 }, playSec: { [D(-1)]: 700, [D(-2)]: 120 }, streak: { days: 1, last: D(-1) } } }) });
const old = await p.X('(()=>{ const s=streaks(); return {set:[...s.set].sort(), cur:s.cur, best:s.best}; })()');
check('jours d’avant la bascule : l’XP suffit (J-5, J-4, J-3 comptés) ; après : 10 min (J-2 à 2 min non compté, J-1 à 11 min compté)', JSON.stringify(old.set) === JSON.stringify([D(-5), D(-4), D(-3), D(-1)]) && old.cur === 1 && old.best === 3, old);
const mg = await p.X(`(()=>{ const L={xp:1,streak:{days:0,last:""},settings:{},playSec:{"2026-10-01":100,"2026-10-02":900},srFrom:"2026-10-27",srShown:"2026-10-20"}, C={xp:1,streak:{days:0,last:""},settings:{},playSec:{"2026-10-01":400,"2026-10-03":50},srFrom:"2026-10-22",srShown:"2026-10-25"};
  const r=mergeState(L,C), r2=mergeState(r.merged,C); return {ps:r.merged.playSec, f:r.merged.srFrom, sh:r.merged.srShown, ch:r.changed, ch2:r2.changed}; })()`);
check('mergeState : temps de jeu = max par jour, bascule = la plus ancienne, animation vue = la plus récente, stable au 2e passage', mg.ps['2026-10-01'] === 400 && mg.ps['2026-10-02'] === 900 && mg.ps['2026-10-03'] === 50 && mg.f === '2026-10-22' && mg.sh === '2026-10-25' && mg.ch && !mg.ch2, mg);
const mg2 = await p.X(`(()=>{ const r=mergeState({xp:1,streak:{days:0,last:""},settings:{}}, {xp:1,streak:{days:0,last:""},settings:{}}); return 'playSec' in r.merged || 'srFrom' in r.merged; })()`);
check('mergeState : états anciens sans les clés = rien d’ajouté', mg2 === false);
await p.context().close();

// ---- jeu au quiz (MIDI), au mode PIANO et dans le lecteur Play : compté aussi ----
p = await open();
const cnt = await p.X(`(()=>{ const r={}; lastNoteAt=0; try{ quizIn("screen",60); }catch(e){} r.q=Date.now()-lastNoteAt<1000; lastNoteAt=0; try{ pnOn(60,.5,"screen"); pnOff&&pnOff(60); }catch(e){} r.p=Date.now()-lastNoteAt<1000; lastNoteAt=0; playSend("noteon",60,.5); r.l=Date.now()-lastNoteAt<1000; return r; })()`);
check('temps de jeu : le quiz, le mode PIANO et le lecteur Play remettent l’horloge en marche', cnt.q && cnt.p && cnt.l, cnt);
await p.context().close();

// ---- mouvement réduit + EN ----
p = await open({ clock: true, rm: 'reduce', lang: 'en', st: STATE({ lang: 'en', st: { srFrom: TODAY, playSec: { [TODAY]: 590 } } }) });
await play(p, 1); await p.clock.runFor(300);
const c3 = await cel(p);
const anims = await ev(p, () => { const c = document.getElementById('srCel'); return c ? c.getAnimations({ subtree: true }).filter(a => a instanceof CSSAnimation).length : -1; });
check('EN + mouvement réduit : « Streak: 4 days! », même contenu, plein écran, aucune animation CSS', !!c3 && c3.t === 'Streak: 4 days!' && c3.s === 'Your 10 minutes for today are done.' && c3.cover && c3.days.length === 4 && anims === 0, [c3, anims]);
await p.clock.runFor(6000);
check('mouvement réduit : se ferme seule aussi', !(await cel(p)));
await fiche(p);
check('EN : fiche « Streak locked in today »', await ev(p, () => document.querySelector('#pfSr b').textContent) === 'Streak locked in today');
await p.context().close();
p = await open({ lang: 'en', st: STATE({ lang: 'en', st: { srFrom: TODAY, playSec: { [TODAY]: 330 } } }) });
await fiche(p);
check('EN, 5 min : « 5 more min to lock in your streak »', await ev(p, () => document.querySelector('#pfSr small').textContent) === '5 more min to lock in your streak');
await p.context().close();

// ================= B. Fin de Gammes une à une =================
p = await open({ st: STATE({ st: { scStars: { notes: { 'C-major': 3, 'C-minor': 3, 'C-harm': 3 } } } }) });
await p.X('openPage("sc1")'); await W(p, 500);
const RV = await p.X('t("sc1RV")');
const msgs = [];
for (let i = 0; i < 4; i++) {
  await ev(p, () => { const e = document.getElementById('endModal'); if (e && !e.hidden) document.getElementById('sc1Back')?.click(); }); await W(p, 200);
  await ev(p, () => document.querySelector('.sc1-c[data-tid="major"][data-k="G"]').click()); await W(p, 400);
  await ev(p, () => document.getElementById('sc1PkEval').click()); await W(p, 500);
  for (const m of [67, 69, 71, 72, 74, 76, 78, 79]) { await p.X(`noteIn(${m})`); await W(p, 40); } await W(p, 1800);
  msgs.push(await ev(p, () => ({ m: document.querySelector('.sc1-msg')?.textContent, tot: document.querySelector('.sc1-tot')?.textContent, nx: document.querySelector('#endNext p')?.textContent, nxv: (() => { const x = document.querySelector('#endNext p'); return x ? getComputedStyle(x).display : 'none'; })() })));
}
check('sans faute : message pris dans la liste des 3 étoiles (6 variantes)', msgs.every(x => RV[3].includes(x.m)) && RV[3].length >= 4, msgs);
check('jamais deux fois le même message de suite', msgs.every((x, i) => !i || x.m !== msgs[i - 1].m), msgs.map(x => x.m));
check('plus de « · 0 coupe sur 12 » sur le panneau (seulement les étoiles)', msgs.every(x => /144/.test(x.tot) && !/coupe/.test(x.tot)), msgs.map(x => x.tot));
check('plus de ligne « Série : … Reviens demain pour la garder. »', msgs.every(x => !x.nx && x.nxv === 'none'), msgs.map(x => x.nx));
if (CAP) await p.screenshot({ path: `${CAP}/01_fin_gamme_ipad.png` });
// the cup of the C row (4th scale at 3 stars): the cup line stays, the message comes from the cup list
await ev(p, () => document.getElementById('sc1Back')?.click()); await W(p, 200);
await ev(p, () => document.querySelector('.sc1-c[data-tid="mel"][data-k="C"]').click()); await W(p, 400);
await ev(p, () => document.getElementById('sc1PkEval').click()); await W(p, 500);
for (const m of [60, 62, 63, 65, 67, 69, 71, 72]) { await p.X(`noteIn(${m})`); await W(p, 40); } await W(p, 1800);
const cup = await ev(p, () => ({ won: document.querySelector('.sc1-cupwon')?.textContent, m: document.querySelector('.sc1-msg')?.textContent }));
check('coupe gagnée : « Coupe de Do gagnée ! » gardée + message varié de la coupe', cup.won === 'Coupe de Do gagnée !' && RV.cup.includes(cup.m), cup);
check('variantes FR et EN pour chaque résultat (3, 2, 1, 0, coupe, record)', await p.X('["3","2","1","1c","0","cup","rec"].every(k=>TXT.fr.sc1RV[k].length>=4 && TXT.en.sc1RV[k].length===TXT.fr.sc1RV[k].length)'));
check('aucune erreur JS (B)', !p.errs.length, p.errs);
await p.context().close();

// ================= C. Tutoriel : pointe centrée =================
const arrowOff = p => ev(p, () => { const tip = document.getElementById('tourTip'), st = window.__X('TOUR.steps[TOUR.i]'), el = document.querySelector(st[0]); const r = el.getBoundingClientRect(), tr = tip.getBoundingClientRect(), bs = getComputedStyle(tip, '::before'), side = tip.dataset.side;
  if (side === 'right') { const cy = tr.top + parseFloat(bs.top) + 8; const lim = cy > tr.top + 20 && cy < tr.bottom - 20; return { side, d: Math.abs(cy - (r.top + r.height / 2)), clamp: !(r.top + r.height / 2 > tr.top + 22 && r.top + r.height / 2 < tr.bottom - 22), lim }; }
  const cx = tr.left + parseFloat(bs.left) + 8; return { side, d: Math.abs(cx - (r.left + r.width / 2)), clamp: !(r.left + r.width / 2 > tr.left + 24 && r.left + r.width / 2 < tr.right - 24) }; });
const SIZES = [{ width: 375, height: 667 }, { width: 812, height: 375 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }, { width: 1280, height: 800 }];
for (const vp of SIZES) {
  p = await open({ vp, st: STATE({ set: { sc1Tour: 0 } }) });
  await ev(p, () => document.querySelector('#modeNav [data-mode=learn]').click()); await W(p, 400); await ev(p, () => document.querySelector('#learnTiles .sc1-tile').click()); await W(p, 900);
  const off = [];
  for (let i = 0; i < 5; i++) { if (!(await ev(p, () => !!document.getElementById('tour') && !document.getElementById('tour').hidden))) break; await W(p, 320); off.push(await arrowOff(p)); if (CAP && i === 1 && (vp.width === 1024 || vp.width === 375)) await p.screenshot({ path: `${CAP}/00_tutoriel_fleche_${vp.width}.png` }); await ev(p, () => document.getElementById('tourNext').click()); }
  check(`${vp.width}×${vp.height} : tutoriel Gammes, pointe sur le centre de la cible aux 5 étapes (≤ 2 px, sauf cible hors bulle)`, off.length === 5 && off.every(o => o.d <= 2 || o.clamp), off);
  await p.context().close();
}
p = await open({ st: STATE({ set: { sc1Tour: 0 } }) });
await ev(p, () => document.querySelector('#modeNav [data-mode=learn]').click()); await W(p, 400); await ev(p, () => document.querySelector('#learnTiles .sc1-tile').click()); await W(p, 900);
const seg = await ev(p, () => [...document.querySelectorAll('#tourL li b')].map(x => x.textContent));
check('étape 1 : NOTES et ACCORDS en gras', seg.join() === 'NOTES,ACCORDS', seg);
await ev(p, () => document.getElementById('tourNext').click()); await W(p, 300);
const cellT = await ev(p, () => ({ b: [...document.querySelectorAll('#tourL li b')].map(x => x.textContent), ic: document.querySelectorAll('#tourL .tu-ic svg').length, eye: !!document.querySelector('#tourL .tu-ic svg circle') }));
check('étape 2 : Entraînement et Évaluation en gras avec les pictos œil / étoile', cellT.b.join() === 'Entraînement,Évaluation' && cellT.ic === 2 && cellT.eye, cellT);
await ev(p, () => document.getElementById('tourNext').click()); await W(p, 300);
const stT = await ev(p, () => ({ st: [...document.querySelectorAll('#tourL .tu-st')].map(x => x.textContent), col: getComputedStyle(document.querySelector('#tourL .tu-st')).color, l2: document.querySelectorAll('#tourL li')[1].textContent }));
check('étape 3 : ★ / ★★ / ★★★ dorées devant chaque niveau, « avec au moins une faute »', stT.st.join() === '★,★★,★★★' && stT.col !== 'rgb(0, 0, 0)' && /au moins une faute/.test(stT.l2), stT);
await p.context().close();
// the general tour (menu): same engine, the arrow on the centre of each menu item
for (const vp of [{ width: 1024, height: 768 }, { width: 1280, height: 800 }, { width: 768, height: 1024 }]) {
  p = await open({ vp });
  await p.X('tourStart()'); await W(p, 700);
  const off = [];
  for (let i = 0; i < 12; i++) { if (!(await ev(p, () => !document.getElementById('tour').hidden))) break; await W(p, 320); off.push(await arrowOff(p)); await ev(p, () => document.getElementById('tourNext').click()); }
  check(`${vp.width}×${vp.height} : tutoriel général, pointe centrée sur chaque élément`, off.length >= 5 && off.every(o => o.d <= 2 || o.clamp), off);
  check(`${vp.width}×${vp.height} : tutoriel général terminé normalement`, await p.X('S.tourDone') === 1 && !p.errs.length, p.errs);
  await p.context().close();
}

// ================= D. Pas de défilement =================
for (const scheme of ['light', 'dark']) for (const vp of SIZES) {
  p = await open({ vp, scheme, st: STATE({ st: { srFrom: TODAY, playSec: { [TODAY]: 320 } } }) });
  const h = await noScroll(p);
  await fiche(p); const phone = vp.width < 700 || vp.height < 500; // téléphone : la fiche Progression défile déjà dans #main (voulu) ; on vérifie seulement la page
  const f = phone ? await ev(p, () => { const d = document.scrollingElement; return d.scrollHeight - d.clientHeight <= 1 && d.scrollWidth - d.clientWidth <= 1; }) : await noScroll(p);
  const vis = await ev(p, () => { const r = document.getElementById('pfSr'); return !!r && r.getClientRects().length > 0; });
  if (CAP && (vp.width === 375 || vp.width === 1024)) await p.screenshot({ path: `${CAP}/04_fiche_5min_${vp.width}_${scheme}.png` });
  check(`${vp.width}×${vp.height} ${scheme} : accueil sans défilement, fiche sans défilement (iPad / ordinateur ; téléphone : page seule), ligne de la série présente`, h && f && vis && !p.errs.length, { h, f, vis, e: p.errs });
  await p.context().close();
}
await b.close();
console.log(fails.length ? `\nr53 FAIL ${fails.length}` : '\nr53 OK');
process.exit(fails.length ? 1 : 0);
