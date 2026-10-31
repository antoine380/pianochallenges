// Chantier MATIÈRES UNE À UNE : chaque matière LEARN (Accords, Gammes, Harmonie, Progressions, Oreille) s'ouvre sur l'écran « une à une »
// (page sc1, moteur UA). Vérifie pour chaque matière : la tuile, la grille (cases, en-têtes, sous-modes), « Configurer mon cours » = l'ancien
// écran de départ, le tutoriel de première visite (une fois par matière), la fenêtre du choix, l'Évaluation (étoiles 3 / 2 / meilleur gardé),
// l'Entraînement (démonstration puis à toi, rien n'est noté), les renversements (plusieurs éléments), l'Oreille (6 écoutes, réponses = le
// son et ses voisins), la révision, la fusion mergeState (max par case, état ancien sans la clé), pas de défilement aux 5 tailles
// (clair et sombre), aucune erreur JS. Usage : PORT=8984 NODE_PATH=… PW_CHROMIUM=… node tools/audit/r57_matieres.mjs (CAP=dossier : captures)
import { createRequire } from 'module';
import fs from 'fs';
import { INIT } from './lib.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = process.env.PORT || '8767', URL = `http://localhost:${PORT}/`, CAP = process.env.CAP || '';
if (CAP) fs.mkdirSync(CAP, { recursive: true });
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d !== undefined && !ok ? ' — ' + JSON.stringify(d).slice(0, 500) : '')); if (!ok) fails.push(n); };
const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const TOURS = { sc1Tour: 1, uaTour: { chords: 1, harmony: 1, prog: 1, ear: 1 } };
const STATE = (o = {}) => ({ xp: 900, gate: 'account', onb: { done: 1 }, tourDone: 1, langV2: true, pwShown: 1, ...(o.extra || {}),
  introSeen: { scales: 1, chords: 1, harmony: 1, prog: 1, ear: 1, games: 1, daily: 1 }, midi: { later: Date.now() }, goal: { kind: 'min', v: 10, asked: 1, at: 1 },
  settings: { ...(o.tours === false ? {} : TOURS), lang: o.lang || 'fr', notation: o.lang || 'fr', input: o.input || 'midi', uiSound: false, vl: false, autoNext: true, delay: 0, ...(o.settings || {}) } });
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
const IDX = { chords: 0, scales: 1, harmony: 2, prog: 3, ear: 4 };
const toSubj = async (p, sec) => { await ev(p, () => document.querySelector('#homeLink')?.click()); await W(p, 200); await ev(p, () => document.querySelector('#modeNav [data-mode=learn]').click()); await W(p, 400);
  await ev(p, i => document.querySelectorAll('#learnTiles .ptile')[i].click(), IDX[sec]); await W(p, 450); };
const seg = async (p, v) => { await ev(p, v => document.querySelector(`#sc1Seg [data-v="${v}"]`).click(), v); await W(p, 200); };
const cell = (p, tid, k) => ev(p, ([tid, k]) => document.querySelector(`.sc1-c[data-tid="${tid}"][data-k="${k}"]`).click(), [tid, k]);
const pick = async (p, v) => { await W(p, 250); await ev(p, v => document.getElementById(v === 'train' ? 'sc1PkTrain' : 'sc1PkEval').click(), v); await W(p, 400); };
const notes = async (p, ms) => { for (const m of ms) { await p.X(`noteIn(${m})`); await W(p, 40); } };
const ua = (p, sec, mode, key) => p.X(`((S.uaStars||{})[${JSON.stringify(sec)}]||{})[${JSON.stringify(mode)}] ? (S.uaStars[${JSON.stringify(sec)}][${JSON.stringify(mode)}][${JSON.stringify(key)}]|0) : 0`);
const endStars = p => ev(p, () => document.querySelectorAll('#endBody .sc1-stars span.on').length);
const endOn = p => ev(p, () => !document.getElementById('endModal').hidden);
const closeEndM = async p => { await ev(p, () => document.getElementById('sc1Back')?.click()); await W(p, 300); };
const noScroll = p => ev(p, () => { const d = document.scrollingElement, m = document.getElementById('main'); return d.scrollHeight - d.clientHeight <= 1 && d.scrollWidth - d.clientWidth <= 1 && m.scrollHeight - m.clientHeight <= 1; });
const gridFits = p => ev(p, () => { const g = document.getElementById('sc1Grid'), r = g.getBoundingClientRect(); let ok = true;
  g.querySelectorAll('.sc1-c').forEach(c => { const q = c.getBoundingClientRect(); if (q.bottom > innerHeight + 1 || q.right > innerWidth + 1 || q.height < 18 || q.width < 18) ok = false; }); return ok && r.bottom <= innerHeight + 1; });
const grid = p => ev(p, () => ({ page: document.body.dataset.page, sec: document.getElementById('sc1Panel').dataset.sec, h: document.querySelector('.sc1-h span:last-child')?.textContent, cells: document.querySelectorAll('#sc1Grid .sc1-c').length,
  th: [...document.querySelectorAll('.sc1-th .lg')].map(x => x.textContent), rows: [...document.querySelectorAll('.sc1-rh b')].map(x => x.textContent), cups: document.querySelectorAll('#sc1Grid .sc1-cup').length,
  seg: [...document.querySelectorAll('#sc1Seg button')].map(x => x.textContent + ':' + x.getAttribute('aria-pressed')), sum: document.querySelector('.sc1-big b')?.textContent, max: document.querySelector('.sc1-big span[aria-hidden]')?.textContent,
  cfg: !!document.getElementById('uaCfg'), cfgT: document.getElementById('uaCfg')?.textContent, rv: !!document.getElementById('sc1RvB'), help: !!document.getElementById('sc1Help') }));

// 1) LEARN : 7 tuiles (plus de doublon « Gammes une à une »), chaque matière ouvre sa page « une à une »
let p = await open();
await ev(p, () => document.querySelector('#modeNav [data-mode=learn]').click()); await W(p, 400);
const tiles = await ev(p, () => [...document.querySelectorAll('#learnTiles .ptile')].map(t => ({ id: t.dataset.id, h: t.querySelector('.h3').textContent, rec: t.querySelector('.rec,.pt-rec,[class*=rec]')?.textContent || '', ua: t.classList.contains('ua-tile'), sc1: t.classList.contains('sc1-tile') })));
check('LEARN : 7 tuiles, les 5 matières en « une à une », la tuile Gammes = sc1-tile, pas de doublon', tiles.length === 7 && tiles.filter(x => x.ua).length === 5 && tiles[1].sc1 && tiles.filter(x => x.sc1).length === 1 && tiles[0].h === 'Accords' && tiles[1].h === 'Gammes', tiles);
const EXP = { chords: { h: 'Accords un à un', cells: 72, th: 'Majeur|Mineur|Diminué|Augmenté|Sus2|Sus4', rows: 12, cups: 12, seg: 3, max: ' / 216' },
  scales: { h: 'Gammes une à une', cells: 48, th: 'Majeure|Mineure naturelle|Mineure harmonique|Mineure mélodique', rows: 12, cups: 12, seg: 2, max: ' / 144' },
  harmony: { h: 'Harmonie degré par degré', cells: 84, th: 'I|ii|iii|IV|V|vi|vii°', rows: 12, cups: 12, seg: 4, max: ' / 252' },
  prog: { h: 'Progressions une à une', cells: 60, th: '', rows: 12, cups: 12, seg: 2, max: ' / 180' },
  ear: { h: 'Oreille son par son', cells: 12, th: '', rows: 0, cups: 0, seg: 3, max: ' / 36' } };
for (const sec of ['chords', 'scales', 'harmony', 'prog', 'ear']) {
  await toSubj(p, sec); const g = await grid(p), e = EXP[sec];
  check(`${sec} : page sc1, titre « ${e.h} », ${e.cells} cases, ${e.seg} sous-modes, Configurer mon cours, révision, « ? »`, g.page === 'sc1' && g.sec === sec && g.h === e.h && g.cells === e.cells && g.seg.length === e.seg && /true$/.test(g.seg[0]) && g.cfg && /Configurer mon cours/.test(g.cfgT) && g.rv && g.help && g.max === e.max, g);
  check(`${sec} : en-têtes, lignes (naturelles puis altérées), coupes`, (!e.th || g.th.join('|') === e.th) && g.rows.length === e.rows && g.cups === e.cups && (!e.rows || g.rows.slice(0, 7).join(' ') === 'Do Ré Mi Fa Sol La Si'), g);
}
// sous-modes : Accords 7e (60 cases) puis renversements (72), Harmonie mineur 7e, Oreille accords (11)
await toSubj(p, 'chords'); await seg(p, 'sev'); let g = await grid(p);
check('Accords › 7e : 5 colonnes × 12 = 60 cases, choix retenu (S.settings.uaMode.chords)', g.cells === 60 && g.th.join('|') === 'Majeur 7|7 de Dominante|Mineur 7|Demi-Diminué|Diminué 7' && await p.X('S.settings.uaMode.chords') === 'sev', g);
await seg(p, 'tri');
await toSubj(p, 'ear'); await seg(p, 'echord'); g = await grid(p); check('Oreille › Accords : 11 cases', g.cells === 11, g); await seg(p, 'eint');

// 2) « Configurer mon cours » = l'ancien écran de départ de la matière, inchangé
for (const sec of ['chords', 'scales', 'harmony', 'prog', 'ear']) {
  await toSubj(p, sec); await ev(p, () => document.getElementById('uaCfg').click()); await W(p, 500);
  const s = await ev(p, () => ({ page: document.body.dataset.page, setup: document.body.classList.contains('setup'), go: !!document.getElementById('suGo') && document.getElementById('suGo').offsetParent !== null, name: document.getElementById('suName').textContent, types: document.querySelectorAll('#suTypes .su-card').length }));
  check(`${sec} : Configurer mon cours → écran de départ (${s.name}, ${s.types} types)`, s.page === 'practice' && s.setup && s.go && s.types > 0 && (await p.X('S.section')) === sec, s);
}
// une partie classique part comme avant
await ev(p, () => document.getElementById('suGo').click()); await W(p, 500);
check('écran de départ : « C’est parti » lance une partie classique (sans game.sc1)', await p.X('!!game && !game.sc1 && phase==="listening"'));
await ev(p, () => document.getElementById('gameEnd').click()); await W(p, 300); if (await p.isVisible('#leaveModal')) { await p.click('#lvGo'); await W(p, 400); }
check('aucune erreur JS (navigation)', !p.errs.length, p.errs);
await p.context().close();

// 3) Accords : Évaluation (3 étoiles, puis 2 sur une autre case, meilleur gardé), Entraînement (démo puis à toi, rien n'est noté), renversements
p = await open();
await toSubj(p, 'chords'); await cell(p, 'maj', 'C');
const pk = await ev(p, () => ({ on: !document.getElementById('sc1Pick').hidden, t: document.getElementById('sc1PkT').textContent, tr: document.getElementById('sc1PkTrain').textContent, ev: document.getElementById('sc1PkEval').textContent }));
check('Accords : fenêtre du choix (Entraînement / Évaluation, textes de l’accord)', pk.on && /Do Majeur · Triades/.test(pk.t) && /accord/.test(pk.tr) && /accord/.test(pk.ev), pk);
await pick(p, 'eval'); await notes(p, [60, 64, 67]); await W(p, 2200);
check('Accords › Évaluation sans faute : 3 étoiles (S.uaStars.chords.tri["C-maj"]), fin au-dessus de la liste', await ua(p, 'chords', 'tri', 'C-maj') === 3 && await endOn(p) && await endStars(p) === 3 && (await p.X('page')) === 'sc1', await p.X('JSON.stringify(S.uaStars)'));
const endT = await ev(p, () => ({ t: document.getElementById('endTitle').textContent, back: document.getElementById('sc1Back')?.textContent, nx: document.getElementById('sc1Next')?.textContent }));
check('fin : « Tous les accords », « Suivante : Ré Majeur »', endT.back === 'Tous les accords' && /Ré Majeur/.test(endT.nx || ''), endT);
await ev(p, () => document.getElementById('sc1Again').click()); await W(p, 400); await notes(p, [60, 62, 64, 67]); await W(p, 2200);
check('meilleur gardé : rejouée avec une faute → reste à 3', await ua(p, 'chords', 'tri', 'C-maj') === 3 && await endStars(p) === 2);
await closeEndM(p); await cell(p, 'min', 'D'); await pick(p, 'eval'); await notes(p, [62, 66, 65, 69]); await W(p, 2200);
check('Ré mineur avec une faute : 2 étoiles', await ua(p, 'chords', 'tri', 'D-min') === 2);
await closeEndM(p);
// Entraînement
await cell(p, 'maj', 'F'); await pick(p, 'train');
const tr0 = await p.X('({ph:phase, tr:!!(game&&game.sc1&&game.sc1.train), demo:SC1.demo})');
check('Accords › Entraînement : démonstration d’abord', tr0.tr && tr0.ph === 'revealed' && tr0.demo, tr0);
await W(p, 3600); const tr1 = await p.X('({ph:phase, gk:S.settings.guideK, fing:S.settings.fing})');
check('puis « À toi » avec les touches allumées et les doigtés (aides prêtées)', tr1.ph === 'listening' && tr1.gk === true && tr1.fing === true, tr1);
await notes(p, [65, 69, 72]); await W(p, 400);
check('fin d’entraînement : « Bien joué », aucune étoile', await ev(p, () => !!document.getElementById('sc1Well')) && await ua(p, 'chords', 'tri', 'F-maj') === 0);
await ev(p, () => document.getElementById('gameEnd').click()); await W(p, 300); if (await p.isVisible('#leaveModal')) { await p.click('#lvGo'); await W(p, 500); }
// Renversements : l'accord dans ses 3 positions, à la suite
await toSubj(p, 'chords'); await seg(p, 'inv'); await cell(p, 'maj', 'C'); await pick(p, 'eval');
check('Renversements : 3 éléments (fondamental, 1er, 2e renversement)', await p.X('game.total===3 && game.sc1.multi===true'));
await notes(p, [60, 64, 67]); await W(p, 300);
check('après le 1er : pas encore d’étoiles finales (1 étoile = 3 notes justes)', await ua(p, 'chords', 'inv', 'C-maj') === 1);
await W(p, 1800); await notes(p, [64, 67, 72]); await W(p, 2100); await notes(p, [67, 72, 76]); await W(p, 2300);
check('Renversements sans faute : 3 étoiles', await ua(p, 'chords', 'inv', 'C-maj') === 3 && await endStars(p) === 3, await p.X('JSON.stringify(S.uaStars.chords)'));
await closeEndM(p);
// Renversements en entraînement : chaque position passe à la suivante
await cell(p, 'min', 'A'); await pick(p, 'train'); await W(p, 3400);
check('Renversements › Entraînement : à toi sur le 1er élément', await p.X('phase==="listening" && game.i===0'));
await notes(p, [57, 60, 64]); await W(p, 1300);
check('… puis démonstration du 1er renversement', await p.X('game.i===1 && (phase==="revealed"||phase==="listening")'));
await ev(p, () => document.getElementById('gameEnd').click()); await W(p, 300); if (await p.isVisible('#leaveModal')) { await p.click('#lvGo'); await W(p, 500); }
check('aucune erreur JS (accords)', !p.errs.length, p.errs);

// 4) Harmonie (V de Do majeur = Sol Si Ré) et Progressions (I–IV–V–I en Do)
await toSubj(p, 'harmony'); await cell(p, '4', 'C'); await pick(p, 'eval');
check('Harmonie : la case = le degré (V de Do Majeur)', await p.X('cur.sec==="harmony" && cur.deg===4 && cur.tid==="maj"'));
await notes(p, [55, 59, 62]); await W(p, 2200);
check('Harmonie › Évaluation sans faute : 3 étoiles', await ua(p, 'harmony', 'hmaj', 'C-4') === 3 && await endOn(p));
await closeEndM(p);
await toSubj(p, 'prog'); await cell(p, 'p145', 'C'); await pick(p, 'eval');
const steps = await p.X('seq.map(st=>st.voicing)');
for (const v of steps) { await notes(p, v); await W(p, 320); }
await W(p, 2200);
check('Progressions › Évaluation sans faute : 3 étoiles', await ua(p, 'prog', 'pbase', 'C-p145') === 3 && await endOn(p), steps);
await closeEndM(p);
// Progression en entraînement : démonstration accord par accord
await cell(p, 'pop', 'G'); await pick(p, 'train');
check('Progressions › Entraînement : démonstration', await p.X('phase==="revealed" && SC1.demo===true && chSeq()'));
await ev(p, () => document.getElementById('gameEnd').click()); await W(p, 300); if (await p.isVisible('#leaveModal')) { await p.click('#lvGo'); await W(p, 500); }

// 5) Oreille : 6 écoutes, réponses = le son et ses 3 voisins
await toSubj(p, 'ear'); await cell(p, 'M3', 'int'); await pick(p, 'eval');
const e0 = await p.X('({n:game.total, set:cur.uaSet, multi:game.sc1.multi, btn:[...document.querySelectorAll("#answers button")].length, act:!!document.querySelector("#actions .btn")})');
check('Oreille : 6 écoutes, 4 réponses (tierce majeure et ses voisins), « Réécouter » en évaluation', e0.n === 6 && e0.multi && e0.set.length === 4 && e0.set.includes('M3') && e0.btn === 4 && e0.act, e0);
for (let i = 0; i < 6; i++) { await p.X('earAnswer(cur.k)'); await W(p, 2100); }
check('Oreille › 6 bonnes réponses : 3 étoiles', await ua(p, 'ear', 'eint', 'int-M3') === 3 && await endOn(p) && await endStars(p) === 3, await p.X('JSON.stringify(S.uaStars.ear)'));
await closeEndM(p);
await cell(p, 'P5', 'int'); await pick(p, 'eval');
for (let i = 0; i < 6; i++) { if (i === 2) await p.X('earAnswer(cur.uaSet.find(x=>x!==cur.k))'); else await p.X('earAnswer(cur.k)'); await W(p, i === 2 ? 5600 : 2100); }
await W(p, 500);
check('Oreille › une erreur : 2 étoiles', await ua(p, 'ear', 'eint', 'int-P5') === 2, await p.X('JSON.stringify(S.uaStars.ear)+" "+phase+" "+(game&&game.i)'));
await closeEndM(p);
// entraînement : chaque son nommé, puis une écoute
await cell(p, 'm3', 'int'); await pick(p, 'train');
check('Oreille › Entraînement : les sons joués un par un, nommés', await p.X('phase==="revealed" && SC1.demo===true'));
await W(p, 9500);
check('… puis à toi (une écoute, « Réécouter »)', await p.X('phase==="listening"') && await ev(p, () => !!document.getElementById('uaReplay')));
await p.X('earAnswer(cur.k)'); await W(p, 300);
check('bonne réponse : « Bien joué », rien de noté', await ev(p, () => !!document.getElementById('sc1Well')) && await ua(p, 'ear', 'eint', 'int-m3') === 0);
await ev(p, () => document.getElementById('gameEnd').click()); await W(p, 300); if (await p.isVisible('#leaveModal')) { await p.click('#lvGo'); await W(p, 500); }

// 6) Révision : « tes n accords » à 3 étoiles
await toSubj(p, 'chords'); await seg(p, 'tri');
const rv = await ev(p, () => ({ t: document.getElementById('sc1RvB').textContent, dis: document.getElementById('sc1RvB').getAttribute('aria-disabled') }));
check('Accords : bouton Révision « tes … » actif (1 accord à 3 étoiles)', /Révision · ton accord/.test(rv.t) && rv.dis !== 'true', rv);
await ev(p, () => document.getElementById('sc1RvB').click()); await W(p, 300);
check('fenêtre de révision : « Révision de ton accord »', /Révision de ton accord/.test(await ev(p, () => document.getElementById('sc1RvTi').textContent)));
await ev(p, () => document.getElementById('sc1RvGo').click()); await W(p, 400);
check('révision lancée : partie des accords à 3 étoiles (éléments sc1rv)', await p.X('!!game && game.queue.length===1 && game.queue[0].sc1rv===1 && cur.sec==="chords"'));
await ev(p, () => document.getElementById('gameEnd').click()); await W(p, 300); if (await p.isVisible('#leaveModal')) { await p.click('#lvGo'); await W(p, 500); }
// les gammes gardent leurs étoiles et leurs textes
await toSubj(p, 'scales'); g = await grid(p);
check('Gammes : textes des gammes rendus (titre, « Tous les … » non appliqué)', g.h === 'Gammes une à une' && g.cells === 48 && await p.X('t("sc1Back")') === 'Toutes les gammes', g);
check('aucune erreur JS (parties)', !p.errs.length, p.errs);
const saved = await ev(p, () => JSON.parse(localStorage.getItem('memo-gammes-v1')).uaStars);
check('étoiles sauvegardées (S.uaStars dans localStorage)', saved && saved.chords && saved.chords.tri['C-maj'] === 3 && saved.ear.eint['int-M3'] === 3, saved);
await p.context().close();

// 7) mergeState : max par case, état ancien sans la clé, tutoriels vus réunis
p = await open();
const mg = await p.X(`(()=>{ const a={uaStars:{chords:{tri:{"C-maj":2}}},settings:{uaTour:{chords:1}}}, c={uaStars:{chords:{tri:{"C-maj":3,"D-min":1}},ear:{eint:{"int-M3":2}},bad:{x:{"y":3}}},settings:{uaTour:{ear:1}}};
  const r=mergeState(a,c), r2=mergeState({xp:1},{xp:2}); return {m:r.merged.uaStars, t:r.merged.settings.uaTour, old:!!(r2.merged&&r2.merged.uaStars)}; })()`);
check('mergeState : max par case, matières inconnues écartées, tutoriels réunis, état ancien sans uaStars', mg.m.chords.tri['C-maj'] === 3 && mg.m.chords.tri['D-min'] === 1 && mg.m.ear.eint['int-M3'] === 2 && !mg.m.bad && mg.t.chords === 1 && mg.t.ear === 1 && !mg.old, mg);
await p.context().close();

// 8) tutoriel de première visite, par matière (Étape i sur n), une seule fois
p = await open({ st: STATE({ tours: false }) });
for (const sec of ['chords', 'ear']) {
  await toSubj(p, sec); await W(p, 400);
  const tu = await ev(p, () => ({ on: !document.getElementById('tour').hidden, k: document.getElementById('tourTip')?.textContent || '' }));
  check(`${sec} : tutoriel à la première visite (« Étape 1 sur … »)`, tu.on && /Étape 1 sur (5|6)/.test(tu.k), tu);
  for (let i = 0; i < 8 && await p.isVisible('#tour'); i++) { await ev(p, () => document.getElementById('tourNext').click()); await W(p, 200); }
  check(`${sec} : tutoriel retenu (S.settings.uaTour.${sec})`, await p.X(`!!S.settings.uaTour && S.settings.uaTour.${sec}===1`) && !(await p.isVisible('#tour')));
  await toSubj(p, sec); await W(p, 400); check(`${sec} : pas de tutoriel à la 2e visite`, !(await p.isVisible('#tour')));
}
const lastStep = await ev(p, async () => { document.getElementById('sc1Help').click(); await new Promise(r => setTimeout(r, 300)); let n = 0; while (!document.getElementById('tour').hidden && n < 9) { const s = document.getElementById('tourTip').textContent; if (/Étape (\d) sur \1/.test(s)) { const x = s; document.getElementById('tourNext').click(); return x; } document.getElementById('tourNext').click(); await new Promise(r => setTimeout(r, 150)); n++; } return ''; });
check('bouton « ? » : le tutoriel finit sur « Configurer mon cours »', /Configurer mon cours/.test(lastStep), lastStep);
check('aucune erreur JS (tutoriel)', !p.errs.length, p.errs);
await p.context().close();

// 9) aucune page ne défile, grilles entières à l'écran : 5 tailles × 5 matières (clair et sombre) ; anglais
const VPS = [{ width: 1024, height: 768, n: 'ipad-paysage' }, { width: 768, height: 1024, n: 'ipad-portrait' }, { width: 1280, height: 800, n: 'ordi' }, { width: 812, height: 375, n: 'tel-paysage' }, { width: 375, height: 667, n: 'tel-portrait' }];
for (const scheme of ['light', 'dark']) for (const vp of VPS) {
  p = await open({ vp, scheme }); const bad = [];
  for (const sec of ['chords', 'scales', 'harmony', 'prog', 'ear']) {
    await toSubj(p, sec);
    const modes = await ev(p, () => [...document.querySelectorAll('#sc1Seg button')].map(x => x.dataset.v));
    for (const m of modes) { await seg(p, m); if (!(await noScroll(p)) || !(await gridFits(p))) bad.push(sec + '/' + m); }
    await seg(p, modes[0]);
    if (CAP && (vp.n === 'ipad-paysage' || vp.n === 'tel-portrait' || vp.n === 'tel-paysage')) await p.screenshot({ path: `${CAP}/${sec}-${vp.n}-${scheme}.png` });
  }
  check(`pas de défilement, grilles entières : ${vp.n} ${scheme}`, !bad.length && !p.errs.length, { bad, errs: p.errs });
  await p.context().close();
}
p = await open({ st: STATE({ lang: 'en' }) });
await toSubj(p, 'chords'); g = await grid(p); await toSubj(p, 'ear'); const ge = await grid(p);
check('anglais : « Chords one by one », « Set up my lesson », « Ear, sound by sound »', g.h === 'Chords one by one' && /Set up my lesson/.test(g.cfgT) && ge.h === 'Ear, sound by sound', [g, ge]);
if (CAP) { await toSubj(p, 'chords'); await cell(p, 'maj', 'C'); await W(p, 300); await p.screenshot({ path: `${CAP}/choix-en.png` }); }
await p.context().close();
if (CAP) { // captures parlantes : fenêtre du choix, fin de partie, oreille en démonstration, écran de départ
  p = await open({ st: STATE({ extra: { uaStars: { chords: { tri: { 'C-maj': 3, 'D-min': 2, 'E-min': 1, 'F-maj': 3, 'G-maj': 3 } }, harmony: { hmaj: { 'C-0': 3, 'C-3': 2, 'C-4': 3 } } } } }) });
  await toSubj(p, 'chords'); await p.screenshot({ path: `${CAP}/accords-etoiles-ipad.png` });
  await cell(p, 'maj', 'A'); await W(p, 300); await p.screenshot({ path: `${CAP}/accords-choix-ipad.png` }); await pick(p, 'eval'); await notes(p, [57, 61, 64]); await W(p, 2400); await p.screenshot({ path: `${CAP}/accords-fin-ipad.png` });
  await closeEndM(p); await toSubj(p, 'ear'); await cell(p, 'M3', 'int'); await pick(p, 'train'); await W(p, 2600); await p.screenshot({ path: `${CAP}/oreille-demo-ipad.png` });
  await ev(p, () => document.getElementById('gameEnd').click()); await W(p, 300); if (await p.isVisible('#leaveModal')) { await p.click('#lvGo'); await W(p, 500); }
  await toSubj(p, 'harmony'); await ev(p, () => document.getElementById('uaCfg').click()); await W(p, 500); await p.screenshot({ path: `${CAP}/harmonie-configurer-ipad.png` });
  await p.context().close();
}
await b.close();
console.log(fails.length ? `\n${fails.length} échec(s)` : '\nTout est OK'); process.exit(fails.length ? 1 : 0);
