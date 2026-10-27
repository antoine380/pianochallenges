// Chantier GAMMES UNE PAR UNE : tuile LEARN « Gammes une à une » (Bêta) → page "sc1" (#sc1Panel) : NOTES | ACCORDS, 12 toniques × 4 types
// (majeure, mineure naturelle, harmonique, mélodique), 0 à 3 étoiles par case (S.scStars). Vérifie : étoiles 0/1/2/3 selon les fautes
// (notes et accords), meilleur score gardé, réglages sc7/dir du joueur intacts, fin de partie au-dessus de la liste, Do = gamme suivante,
// Si = recommencer, retour à la liste, ordre des lignes (naturelles puis altérées), coupe par tonique (4 gammes à 3 étoiles), Do sur la liste, fusion mergeState (max par case, état ancien sans la clé), cadenas du paywall,
// pas de défilement aux 5 tailles (liste et LEARN), aucune erreur JS.
// Usage : PORT=8910 NODE_PATH=… PW_CHROMIUM=… node tools/audit/r46_gammes1.mjs   (CAP=dossier pour des captures)
import { createRequire } from 'module';
import fs from 'fs';
import { INIT } from './lib.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = process.env.PORT || '8767', URL = `http://localhost:${PORT}/`, CAP = process.env.CAP || '';
if (CAP) fs.mkdirSync(CAP, { recursive: true });
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d !== undefined && !ok ? ' — ' + JSON.stringify(d).slice(0, 400) : '')); if (!ok) fails.push(n); };
const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const STATE = (o = {}) => ({ xp: 900, gate: 'account', onb: { done: 1 }, tourDone: 1, langV2: true, pwShown: 1, ...(o.stars ? { scStars: o.stars } : {}),
  introSeen: { scales: 1, chords: 1, harmony: 1, prog: 1, ear: 1, games: 1, daily: 1 }, midi: { later: Date.now() }, goal: { kind: 'min', v: 10, asked: 1, at: 1 },
  settings: { sc1Tour: 1, lang: o.lang || 'fr', notation: o.lang || 'fr', input: o.input || 'midi', uiSound: false, octave: true, sc7: true, dir: 'down', autoNext: true, delay: 0, ...(o.paywall ? { paywall: true } : {}) } });
async function open({ vp = { width: 1024, height: 768 }, st = STATE(), scheme = 'light' } = {}) {
  const c = await b.newContext({ viewport: vp, hasTouch: vp.width < 900, colorScheme: scheme });
  await c.addInitScript(`window.__midiMode="ok";`); await c.addInitScript(INIT.replace('${MODE}', 'ok'));
  await c.route(u => u.href.startsWith(URL) && (u.pathname === '/' || u.pathname === '/index.html'), async r => { const res = await r.fetch(); let h = await res.text(); const e = h.lastIndexOf('})();\n</script>'); h = h.slice(0, e) + '\nwindow.__X=s=>eval(s);\n' + h.slice(e); await r.fulfill({ response: res, body: h, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await c.route('https://ijdxeasxmgevuchyuenn.supabase.co/**', r => r.abort());
  const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/net::ERR|Failed to load resource/.test(m.text())) p.errs.push(m.text()); });
  await p.addInitScript(`if(!sessionStorage.getItem('s')){ sessionStorage.setItem('s','1'); localStorage.setItem('memo-gammes-v1', ${JSON.stringify(JSON.stringify(st))}); }`);
  await p.goto(URL); await p.waitForFunction(() => !!window.__X, null, { timeout: 15000 }); await p.waitForTimeout(1500);
  p.X = s => p.evaluate(s => window.__X(s), s); return p;
}
const W = (p, ms) => p.waitForTimeout(ms);
const ev = (p, f, a) => p.evaluate(f, a);
const toList = async p => { await ev(p, () => document.querySelector('#modeNav [data-mode=learn]').click()); await W(p, 400); await ev(p, () => document.querySelector('#learnTiles .sc1-tile').click()); await W(p, 400); };
const cell = (p, tid, k) => ev(p, ([tid, k]) => document.querySelector(`.sc1-c[data-tid="${tid}"][data-k="${k}"]`).click(), [tid, k]);
// chantier sc1-pop : chaque lancement (case, Do sur la liste, « Suivante ») ouvre d'abord la fenêtre #sc1Pick ; ce test vérifie l'Évaluation
// (inchangée) : on la choisit dans la fenêtre (sinon, si une partie d'entraînement tourne, par les pastilles)
const toEval = async p => { if (await p.evaluate(() => !document.getElementById('sc1Pick').hidden)) { await p.evaluate(() => document.getElementById('sc1PkEval').click()); await p.waitForTimeout(400); }
  if (await p.evaluate(() => !!document.querySelector('#sc1Tm [data-v=eval][aria-pressed=false]') && document.body.dataset.page === 'practice')) { await p.evaluate(() => document.querySelector('#sc1Tm [data-v=eval]').click()); await p.waitForTimeout(400); } };
const notes = async (p, ms) => { for (const m of ms) { await p.X(`noteIn(${m})`); await W(p, 30); } };
const stars = (p, mode, key) => p.X(`(S.scStars&&S.scStars.${mode}&&S.scStars.${mode}[${JSON.stringify(key)}])|0`);
const stored = p => ev(p, () => JSON.parse(localStorage.getItem('memo-gammes-v1')));
const endStars = p => ev(p, () => document.querySelectorAll('#endBody .sc1-stars span.on').length);
const noScroll = p => ev(p, () => { const d = document.scrollingElement, m = document.getElementById('main'); return d.scrollHeight - d.clientHeight <= 1 && d.scrollWidth - d.clientWidth <= 1 && m.scrollHeight - m.clientHeight <= 1; });
const quit = async p => { await ev(p, () => document.getElementById('gameEnd').click()); await W(p, 300); if (await p.isVisible('#leaveModal')) { await p.click('#lvGo'); await W(p, 500); } };
const C_MAJ = [60, 62, 64, 65, 67, 69, 71, 72];

// 1) LEARN : la tuile, à côté de Gammes, avec la pastille Bêta ; la page : 12 × 4 cases, en-têtes, total 0 / 144
let p = await open();
await ev(p, () => document.querySelector('#modeNav [data-mode=learn]').click()); await W(p, 400);
const tl = await ev(p, () => { const T = [...document.querySelectorAll('#learnTiles .ptile')], r = e => e.getBoundingClientRect(), s = T.find(x => x.classList.contains('sc1-tile')), g = T[1];
  const vis = T.slice().sort((a, c) => (r(a).top - r(c).top) || (r(a).left - r(c).left));
  return { n: T.length, title: s && s.querySelector('.h3').textContent, beta: s && s.querySelector('.sc1-new')?.textContent, after: vis.indexOf(s) === vis.indexOf(g) + 1, last: T[T.length - 1] === s }; });
check('LEARN : tuile « Gammes une à une » sans pastille, juste après « Gammes » à l’écran, dernière dans la page (index des autres tuiles inchangés)', tl.n === 8 && tl.title === 'Gammes une à une' && !tl.beta && tl.after && tl.last, tl);
await toList(p);
const L = await ev(p, () => ({ page: document.body.dataset.page, cells: document.querySelectorAll('#sc1Grid .sc1-c').length, th: [...document.querySelectorAll('.sc1-th .lg')].map(x => x.textContent),
  rows: [...document.querySelectorAll('.sc1-rh b')].map(x => x.textContent), sep: !!document.querySelector('#sc1Grid .sc1-sep'), cups: document.querySelectorAll('#sc1Grid .sc1-cup').length, cupsOn: document.querySelectorAll('#sc1Grid .sc1-cup.on').length, legend: /★|justes|faute/.test(document.querySelector('.sc1-sum small')?.textContent || ''), cupSum: document.querySelector('.sc1-cups b')?.textContent, seg: [...document.querySelectorAll('#sc1Seg button')].map(x => x.textContent + ':' + x.getAttribute('aria-pressed')), sum: document.querySelector('.sc1-big b').textContent }));
check('page sc1 : 48 cases, 4 types, NOTES sélectionné, total 0, pas de légende des étoiles', L.page === 'sc1' && L.cells === 48 && L.th.join('|') === 'Majeure|Mineure naturelle|Mineure harmonique|Mineure mélodique' && L.seg[0] === 'Notes:true' && L.sum === '0' && !L.legend, L);
check('ordre des lignes : Do Ré Mi Fa Sol La Si, séparation, puis Ré♭ Mi♭ Fa♯ La♭ Si♭', L.rows.join(' ') === 'Do Ré Mi Fa Sol La Si Ré♭ Mi♭ Fa♯ La♭ Si♭' && L.sep, L.rows);
check('une coupe par tonique (12), toutes éteintes, résumé « 0 / 12 »', L.cups === 12 && L.cupsOn === 0 && L.cupSum === '0', L);
check('mergeState / état ancien : aucune clé scStars tant qu’on n’a rien joué, total lisible', await p.X('sc1Total("notes")===0 && sc1Total("chords")===0'));

// 2) notes, sans faute → 3 étoiles ; la fin s'ouvre au-dessus de la liste ; sc7 / dir du joueur intacts
await cell(p, 'major', 'C'); await W(p, 400); await toEval(p);
const g1 = await p.X('({page, sec:S.section, tid:cur&&cur.tid, k:cur&&cur.k, dir:cur&&cur.dir, n:seq.length, ch:!!(cur&&cur.ch), sc7:S.settings.sc7, d:S.settings.dir})');
check('clic sur Do majeur : cette gamme seule, en montée, 8 notes (réglage du joueur « descendante » ignoré)', g1.page === 'practice' && g1.tid === 'major' && g1.k === 'C' && g1.dir === 'up' && g1.n === 8 && !g1.ch && g1.sc7 === true && g1.d === 'down', g1);
const st1 = await stored(p);
check('pendant la partie, la sauvegarde garde sc7 et dir du joueur', st1.settings.sc7 === true && st1.settings.dir === 'down', st1.settings);
await notes(p, C_MAJ); await W(p, 2400);
const e1 = await ev(p, () => ({ end: !document.getElementById('endModal').hidden, page: document.body.dataset.page, t: document.getElementById('endTitle').textContent, next: document.getElementById('sc1Next')?.textContent, back: !!document.getElementById('sc1Back'), again: !!document.getElementById('sc1Again') }));
check('sans faute : 3 étoiles (S.scStars.notes["C-major"]=3), fin au-dessus de la liste (« Suivante : Ré Majeur »), message court « Sans faute ! »', await stars(p, 'notes', 'C-major') === 3 && await endStars(p) === 3 && e1.end && e1.page === 'sc1' && e1.back && e1.again && /Suivante : Ré Majeur/.test(e1.next || '') && await ev(p, () => document.querySelector('.sc1-msg').textContent === 'Sans faute !'), e1);
check('XP habituel gagné', await p.X('S.xp>900'));
const st2 = await stored(p);
check('après la partie : sc7=true et dir="down" toujours là (mémoire et sauvegarde)', await p.X('S.settings.sc7===true && S.settings.dir==="down"') && st2.settings.sc7 === true && st2.settings.dir === 'down');
if (CAP) await p.screenshot({ path: `${CAP}/r46_fin_3.png` });

// 3) Do (MIDI) = gamme suivante : Ré♭ majeur ; une faute → 2 étoiles
// chantier sc1-pop : à 3 étoiles en notes, Do = « Jouer en accords » (principal) et Mi = « Suivante »
await ev(p, () => window.__midi.noteOn(64)); await W(p, 500); await toEval(p);
const g2 = await p.X('({tid:cur&&cur.tid, k:cur&&cur.k, page})');
check('Mi seul (MIDI) sur la fin à 3 étoiles = gamme suivante (même type, ligne suivante : Ré majeur)', g2.tid === 'major' && g2.k === 'D' && g2.page === 'practice', g2);
await notes(p, [62, 61, 64, 66, 67, 69, 71, 73, 74]); await W(p, 2400); // 61 = faute
check('une faute : 2 étoiles, message court « Gamme finie ! » sans règle', await stars(p, 'notes', 'D-major') === 2 && await endStars(p) === 2 && await ev(p, () => document.querySelector('.sc1-msg').textContent === 'Gamme finie !'));
// Si = recommencer la même ; sans faute cette fois → 3 (meilleur score monte)
await ev(p, () => window.__midi.noteOn(71)); await W(p, 500); await toEval(p);
check('Si seul (MIDI) sur la fin = recommencer la même gamme', await p.X('cur&&cur.k==="D"&&cur.tid==="major"&&page==="practice"'));
// 3 notes justes puis on quitte : 1 étoile pour cette partie, le meilleur (2) reste
await notes(p, [62, 64, 66]); await W(p, 200);
check('3 notes justes : 1re étoile tout de suite (le meilleur reste 2)', await stars(p, 'notes', 'D-major') === 2 && await p.X('game&&game.sc1&&game.sc1.got===1'));
await quit(p);
const e3 = await ev(p, () => ({ end: !document.getElementById('endModal').hidden, best: document.querySelector('.sc1-best')?.textContent || '', page: document.body.dataset.page }));
check('quitter après 3 notes : fin avec 1 étoile et « Ton meilleur » (2)', e3.end && await endStars(p) === 1 && /Ton meilleur/.test(e3.best) && e3.page === 'sc1', e3);
// « Toutes les gammes » = la liste, mise à jour
await ev(p, () => document.getElementById('sc1Back').click()); await W(p, 400);
const L2 = await ev(p, () => ({ page: document.body.dataset.page, end: !document.getElementById('endModal').hidden, s: document.querySelector('.sc1-c[data-tid=major][data-k=D]').className, sum: document.querySelector('.sc1-big b').textContent }));
check('« Toutes les gammes » : retour à la liste, case Ré majeur à 2 étoiles, total 5', L2.page === 'sc1' && !L2.end && /\bs2\b/.test(L2.s) && L2.sum === '5', L2);

// 4) 1 étoile sur une case neuve (Mi majeur : 3 notes puis quitter) ; 0 étoile (Fa majeur : 2 notes puis quitter → liste)
await cell(p, 'major', 'E'); await W(p, 400); await toEval(p); await notes(p, [64, 66, 68]); await quit(p);
check('Mi majeur, 3 notes justes puis quitter : 1 étoile', await stars(p, 'notes', 'E-major') === 1 && await endStars(p) === 1);
await ev(p, () => document.getElementById('endX').click()); await W(p, 400);
check('× sur la fin : la liste', await ev(p, () => document.body.dataset.page === 'sc1' && document.getElementById('endModal').hidden));
await cell(p, 'major', 'F'); await W(p, 400); await toEval(p); await notes(p, [65, 67]); await quit(p);
check('Fa majeur, 2 notes puis quitter : 0 étoile, retour direct à la liste', await stars(p, 'notes', 'F-major') === 0 && await ev(p, () => document.body.dataset.page === 'sc1' && document.getElementById('endModal').hidden));
// v3 : en Évaluation, plus de « Montre-moi » (aucune aide ; on bascule en Entraînement si on bloque) : reveal ne fait rien, pas de bouton
await cell(p, 'minor', 'A'); await W(p, 400); await toEval(p); await p.X('reveal(false)'); await W(p, 300);
check('Évaluation : « Montre-moi » sans effet, aucun bouton d’aide', await p.X('phase') === 'listening' && await ev(p, () => document.querySelectorAll('#actions button').length === 0));
await notes(p, [69, 71, 72, 74, 76, 77, 79, 81]); await W(p, 2400);
check('Évaluation : gamme finie sans faute = 3 étoiles', await stars(p, 'notes', 'A-minor') === 3, await stars(p, 'notes', 'A-minor'));
await ev(p, () => document.getElementById('sc1Back').click()); await W(p, 300);

// 5) accords : triades de la gamme, en montée ; sans faute → 3 étoiles (notes inchangées) ; une fausse note → 2
await ev(p, () => document.querySelector('#sc1Seg [data-v=chords]').click()); await W(p, 300);
check('ACCORDS sélectionné (S.settings.sc1Mode), total accords 0', await p.X('S.settings.sc1Mode==="chords"') && await ev(p, () => document.querySelector('.sc1-big b').textContent === '0'));
await cell(p, 'major', 'C'); await W(p, 400); await toEval(p);
const g5 = await p.X('({ch:!!cur.ch, n:seq.length, sizes:seq.map(s=>s.notes.length), first:seq[0].root.pc, last:seq[6].root.pc})');
check('Do majeur en accords : triades (3 notes), du I au VII en montée', g5.ch && g5.sizes.slice(0, 7).every(x => x === 3) && g5.first === 0 && g5.last === 11, g5);
const TRI = [[60, 64, 67], [62, 65, 69], [64, 67, 71], [65, 69, 72], [67, 71, 74], [69, 72, 76], [71, 74, 77], [72, 76, 79]];
for (const c of TRI.slice(0, g5.n)) { await notes(p, c); await W(p, 320); }
await W(p, 2400);
check('accords sans faute : 3 étoiles en accords, la case notes de Do majeur reste à 3', await stars(p, 'chords', 'C-major') === 3 && await stars(p, 'notes', 'C-major') === 3 && await endStars(p) === 3);
await ev(p, () => document.getElementById('sc1Next').click()); await W(p, 500); await toEval(p); // Ré majeur en accords
check('« Suivante » en accords : Ré majeur en accords', await p.X('cur.k==="D" && !!cur.ch'));
await quit(p); await W(p, 200);
await cell(p, 'minor', 'A'); await W(p, 400); await toEval(p);
const TRIm = [[69, 72, 76], [71, 74, 77], [72, 76, 79], [74, 77, 81], [76, 79, 83], [77, 81, 84], [79, 83, 86], [81, 84, 88]];
await notes(p, [61]); // faute
const nA = await p.X('seq.length');
for (const c of TRIm.slice(0, nA)) { await notes(p, c); await W(p, 320); }
await W(p, 2400);
check('accords avec une faute : 2 étoiles', await stars(p, 'chords', 'A-minor') === 2, await stars(p, 'chords', 'A-minor'));
await ev(p, () => document.getElementById('sc1Back').click()); await W(p, 300);
// Do seul sur la liste = la prochaine gamme à travailler (accords : Ré majeur, la 1re sans 3 étoiles)
await ev(p, () => window.__midi.noteOn(60)); await W(p, 500);
check('Do seul sur la liste : la fenêtre du choix pour la prochaine gamme (Ré majeur, Accords)', await ev(p, () => !document.getElementById('sc1Pick').hidden && /Ré Majeur.*Accords/i.test(document.getElementById('sc1PkT').textContent)), await ev(p, () => document.getElementById('sc1PkT').textContent));
await ev(p, () => window.__midi.noteOn(64)); await W(p, 500);
check('… Mi = Évaluation : prochaine gamme à travailler (Ré majeur en accords)', await p.X('page==="practice" && cur && cur.k==="D" && cur.tid==="major" && !!cur.ch && !game.sc1.train'));
await quit(p);
check('aucune erreur JS (parties)', !p.errs.length, p.errs);
await p.context().close();

// 5b) la coupe : Sol mineure, harmonique et mélodique déjà à 3 étoiles ; Sol majeur sans faute → coupe de Sol gagnée (notes seulement)
p = await open({ st: STATE({ stars: { notes: { 'G-minor': 3, 'G-harm': 3, 'G-mel': 3 }, chords: { 'G-minor': 3, 'G-harm': 3, 'G-mel': 3 } } }) });
await toList(p);
const cupOff = await ev(p, () => [...document.querySelectorAll('#sc1Grid .sc1-cup')].map(x => x.classList.contains('on')));
check('coupe de Sol éteinte tant que Sol majeur n’a pas 3 étoiles', cupOff.every(x => !x), cupOff);
await cell(p, 'major', 'G'); await W(p, 400); await toEval(p); await notes(p, [67, 69, 71, 72, 74, 76, 78, 79]); await W(p, 2400);
const cw = await ev(p, () => ({ won: document.querySelector('.sc1-cupwon')?.textContent || '', on: [...document.querySelectorAll('#sc1Grid .sc1-cup.on')].map(x => x.getAttribute('aria-label')), sum: document.querySelector('.sc1-cups b')?.textContent }));
check('fin de partie : « Coupe de Sol gagnée ! », coupe de Sol allumée, résumé 1 / 12', /Coupe de Sol gagnée !/.test(cw.won) && cw.on.length === 1 && /Sol/.test(cw.on[0]) && cw.sum === '1', cw);
if (CAP) await p.screenshot({ path: `${CAP}/r46_coupe_gagnee.png` });
check('notification Progrès « Coupe de Sol gagnée ! » (une seule fois)', await p.X('S.notifs.list.filter(n=>/Coupe de Sol/.test(n.ti)).length===1 && !!S.notifs.keys["sc1cup-notes-7"]'));
await ev(p, () => document.getElementById('sc1Again').click()); await W(p, 400); await toEval(p); await notes(p, [67, 69, 71, 72, 74, 76, 78, 79]); await W(p, 2400);
check('rejouer une ligne déjà gagnée : pas de nouvelle annonce de coupe', !(await ev(p, () => !!document.querySelector('.sc1-cupwon'))) && await p.X('S.notifs.list.filter(n=>/Coupe de Sol/.test(n.ti)).length===1'));
await ev(p, () => document.getElementById('sc1Back').click()); await W(p, 300);
await ev(p, () => document.querySelector('#sc1Seg [data-v=chords]').click()); await W(p, 300);
check('coupes séparées par mode : accords 0 / 12 (Sol majeur en accords pas joué)', await ev(p, () => document.querySelector('.sc1-cups b').textContent === '0' && !document.querySelector('#sc1Grid .sc1-cup.on')));
check('aucune erreur JS (coupes)', !p.errs.length, p.errs);
await p.context().close();

// 6) fusion entre appareils : le max par case ; état ancien sans la clé
p = await open({ st: STATE({ stars: { notes: { 'C-major': 2, 'D-minor': 1 } } }) });
const mg = await p.X(`(()=>{ const r=mergeState({...S}, {xp:1, scStars:{notes:{"C-major":3,"G-major":1,"D-minor":0,"bad key":3}, chords:{"A-minor":2}}}); const o=mergeState({xp:1,settings:{}}, {xp:1,settings:{}}); return {m:r.merged.scStars, ch:r.changed, old:"scStars" in o.merged}; })()`);
check('mergeState : max par case, clés invalides écartées', mg.m.notes['C-major'] === 3 && mg.m.notes['G-major'] === 1 && mg.m.notes['D-minor'] === 1 && !('bad key' in mg.m.notes) && mg.m.chords['A-minor'] === 2 && mg.ch, mg);
check('mergeState : état ancien sans scStars → pas de clé ajoutée', mg.old === false, mg);
await p.context().close();

// 7) paywall actif sans Premium : cadenas sur les types payants et les tonalités avec ♯/♭ ; clic = paywall
p = await open({ st: STATE({ paywall: true }) });
await toList(p);
const lk = await ev(p, () => ({ harm: document.querySelector('.sc1-c[data-tid=harm][data-k=A]').classList.contains('pw-lk'), db: document.querySelector('.sc1-c[data-tid=major][data-k=Db]').classList.contains('pw-lk'), c: document.querySelector('.sc1-c[data-tid=major][data-k=C]').classList.contains('pw-lk') }));
check('paywall : harmonique et Ré♭ verrouillés, Do majeur libre', lk.harm && lk.db && !lk.c, lk);
await cell(p, 'harm', 'A'); await W(p, 400);
check('paywall : clic sur une case verrouillée = #pw', await ev(p, () => !document.getElementById('pw')?.hidden && document.body.dataset.page === 'sc1'));
check('aucune erreur JS (paywall)', !p.errs.length, p.errs);
await p.context().close();

// 8) pas de défilement : liste (notes et accords) et LEARN, 5 tailles, clair et sombre ; EN
for (const scheme of ['light', 'dark']) for (const [w, h] of [[1024, 768], [768, 1024], [812, 375], [375, 667], [1280, 800]]) {
  p = await open({ vp: { width: w, height: h }, scheme, st: STATE({ stars: { notes: { 'C-major': 3, 'Db-major': 2 } }, lang: scheme === 'dark' ? 'en' : 'fr' }) });
  await ev(p, () => document.querySelector('#modeNav [data-mode=learn]').click()); await W(p, 400);
  const lOk = await noScroll(p);
  await ev(p, () => document.querySelector('#learnTiles .sc1-tile').click()); await W(p, 400);
  const a = await noScroll(p), fit = await ev(p, () => { const g = document.getElementById('sc1Grid').getBoundingClientRect(), c = [...document.querySelectorAll('.sc1-c')].map(x => x.getBoundingClientRect()); return c.every(r => r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1 && r.height >= 18) && g.height > 100; });
  await ev(p, () => document.querySelector('#sc1Seg [data-v=chords]').click()); await W(p, 200);
  const c2 = await noScroll(p);
  if (CAP) await p.screenshot({ path: `${CAP}/r46_liste_${w}x${h}_${scheme}.png` });
  const en = scheme === 'dark' ? await ev(p, () => document.querySelector('.sc1-h').textContent.includes('Scales one by one')) : true;
  check(`${w}×${h} ${scheme} : LEARN et liste sans défilement, toutes les cases visibles (≥ 18 px)${scheme === 'dark' ? ', textes EN' : ''}`, lOk && a && c2 && fit && en, { lOk, a, c2, fit, en });
  if (p.errs.length) check(`${w}×${h} ${scheme} : aucune erreur JS`, false, p.errs);
  await p.context().close();
}
await b.close();
console.log(fails.length ? `\nr46 FAIL ${fails.length}` : '\nr46 OK');
process.exit(fails.length ? 1 : 0);
