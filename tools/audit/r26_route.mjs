// « Ma route » (C3) and the hub « Pick up » + « For you » (C4), Oct 2026.
// C3: the frieze above the LEARN tiles (6 stages, 9 to 11 steps), First steps first for a beginner (#ppMap kept), steps already
//     passed read from the stored progress (S.mastery), « Continue » with a lone MIDI C opens the next step on its preset start screen,
//     a step passed from the route is recorded (S.route.done), « My path: next » (C) in the end window, stage end = message + surprise song.
// C4: S.resume for every activity (LEARN with its choices, game, Play song), the general card #ppResume (C = pick up at the same item),
//     the row « For you » (daily, duel against the bot of your level, song to improve), mergeState of S.route, no scroll (5 sizes).
// Usage: python3 -m http.server <PORT> at the repo root, then PORT=<PORT> node tools/audit/r26_route.mjs
import { launch, URL, INIT } from './lib.mjs';
const W = (p, ms) => p.waitForTimeout(ms);
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d !== undefined && !ok ? ' — ' + JSON.stringify(d) : '')); if (!ok) fails.push(n); };
const errs = [];
const EXPOSE = `window.__R={ get S(){return S}, get game(){return game}, get page(){return page}, get phase(){return phase}, seqMidis, mergeState, get RT(){return RT}, get endOpen(){return endOpen} };`;
const seed = (o = {}) => `(()=>{ try{ if(sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded','1');
  const S={settings:{lang:${JSON.stringify(o.lang || 'fr')},notation:${JSON.stringify(o.lang || 'fr')},input:"midi",unlockAll:true,labels:true,midiC:true,guideP:false,guideN:false,guideK:false,delay:0},langV2:true,gate:"guest",onb:{done:1,level:${JSON.stringify(o.level || 'chords')}},tourDone:1,
  introSeen:Object.fromEntries(["hub","learn","games","free","play","quiz","chords","scales","harmony","prog","ear","daily","practice","section"].map(k=>[k,1])),seenTypes:[],stats:{},secStats:{},xp:200,xpDays:{},streak:{days:0},mastery:{}};
  ${o.extra || ''}
  localStorage.setItem("memo-gammes-v1",JSON.stringify(S)); }catch(e){} })();`;
async function ctx(browser, { w = 1180, h = 820, init = '', mobile = false, dark = false } = {}) {
  const c = await browser.newContext({ viewport: { width: w, height: h }, locale: 'fr-FR', isMobile: mobile, hasTouch: mobile, colorScheme: dark ? 'dark' : 'light' });
  await c.route(u => u.pathname === '/' || u.pathname.endsWith('/index.html'), async route => { const res = await route.fetch(); let html = await res.text();
    const i = html.indexOf('// ---------- Boot ----------'); html = html.slice(0, i) + EXPOSE + '\n' + html.slice(i);
    await route.fulfill({ response: res, body: html, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await c.addInitScript(`window.__midiMode="ok"; window.__gumMode="none";`); await c.addInitScript(INIT.replace('${MODE}', 'ok')); if (init) await c.addInitScript(init);
  const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load resource/.test(m.text())) errs.push(m.text()); }); return p; }
const note = (p, n) => p.evaluate(n => { window.__midi.noteOn(n); setTimeout(() => window.__midi.noteOff(n), 60); }, n);
const click = (p, sel) => p.evaluate(s => document.querySelector(s).click(), sel);
const R = (p, f, a) => p.evaluate(f, a);
const learn = async p => { await click(p, '#modeNav [data-mode=learn]'); await W(p, 450); };
const hub = async p => { await click(p, '#homeLink'); await W(p, 450); };
async function playItem(p) { // waits for the exercise to listen, plays its notes, tries again once if the answer was not taken
  for (let k = 0; k < 3; k++) { for (let i = 0; i < 20 && await R(p, () => window.__R.phase) !== 'listening'; i++) await W(p, 150);
    const gi = await R(p, () => window.__R.game && window.__R.game.i), ms = await R(p, () => window.__R.seqMidis());
    for (const m of ms) { await note(p, m); await W(p, 160); } await W(p, 900);
    if (await R(p, gi => { const g = window.__R.game; return !g || window.__R.endOpen || !!g.results[gi] || window.__R.phase !== 'listening'; }, gi)) return; } }
const finish = async p => { for (let i = 0; i < 16 && !(await R(p, () => window.__R.endOpen)); i++) await W(p, 150); if (!(await R(p, () => window.__R.endOpen)) && await R(p, () => window.__R.phase) === 'success') { await note(p, 60); await W(p, 900); } };
const { browser } = await launch({ mode: 'ok' });
const ALL14 = 'S.pp={on:true,start:1,cur:"p14",done:Object.fromEntries(Array.from({length:14},(_,i)=>["p"+String(i+1).padStart(2,"0"),{at:1,stars:3}]))};';

// ---------- C3 cohabitation with the First steps
for (const [lbl, o, want] of [['débutant, Premiers pas en cours : #ppMap reste', { level: 'debut', extra: 'S.pp={on:true,start:1,cur:"p02",done:{p01:{at:1,stars:3}}};' }, 'pp'],
  ['joueur d’accords qui n’a pas commencé les Premiers pas : la frise', { level: 'chords' }, 'rt'],
  ['joueur d’accords qui a commencé les Premiers pas : #ppMap reste', { level: 'chords', extra: 'S.pp={on:true,start:1,cur:"p02",done:{p01:{at:1,stars:3}}};' }, 'pp'],
  ['débutant, les 14 Premiers pas finis : la frise', { level: 'debut', extra: ALL14 }, 'rt']]) {
  const p = await ctx(browser, { init: seed(o) }); await p.goto(URL); await W(p, 1200); await learn(p);
  const s = await R(p, () => { const m = document.getElementById('rtMap'), pm = document.getElementById('ppMap'); return { rt: !!m && !m.hidden && !!m.offsetParent, pp: !!pm && !pm.hidden && !!pm.offsetParent }; });
  check('cohabitation — ' + lbl, want === 'rt' ? s.rt && !s.pp : s.pp && !s.rt, s);
  await p.context().close(); }

// ---------- C3 the frieze, progress already stored, Continue with a lone C, a step passed, « next » in the end window
{ const p = await ctx(browser, { init: seed({ extra: 'S.mastery={"ch:maj:C:0":3}; S.route={v:1,done:{"s1.1":1,"s1.3":1,"s1.4":1,"s1.5":1}};' }) });
  await p.goto(URL); await W(p, 1200); await learn(p);
  const f = await R(p, () => { const m = document.getElementById('rtMap'); return { k: m.querySelector('.rt-k').textContent, t: m.querySelector('.rt-tt b').textContent, n: m.querySelectorAll('.rt-pill').length, done: m.querySelectorAll('.rt-pill.done').length, next: m.querySelectorAll('.rt-pill.next').length,
    nextId: (m.querySelector('.rt-pill.next') || {}).dataset?.id, cnt: m.querySelector('.rt-cnt').textContent, chips: m.querySelectorAll('.rt-chip').length, go: /Continuer/.test(document.getElementById('rtGo').textContent), tiles: document.querySelectorAll('#learnTiles .ptile').length,
    ck: m.querySelectorAll('.rt-pill.done .rt-ck').length, free: document.getElementById('rtFreeH').textContent }; });
  check('frise : « Ma route · Étape 1 sur 6 », Les notes, 9 pastilles, 6 étapes, tuiles gardées dessous', /Étape 1 sur 6/.test(f.k) && f.t === 'Les notes' && f.n === 9 && f.chips === 6 && f.tiles === 6 && /Entraînement libre/.test(f.free), f);
  check('pastilles : 4 faites (coche), 1 prochaine (Leçon Do Ré Mi), « 4/9 », Continuer', f.done === 4 && f.ck === 4 && f.next === 1 && f.nextId === 's1.2' && /4\s*\/\s*9/.test(f.cnt) && f.go, f);
  const anim = await R(p, () => getComputedStyle(document.querySelector('.rt-pill.next .rt-dot'), '::after').animationName);
  check('la prochaine pastille pulse', anim === 'rtPulse', anim);
  // a stage viewed: stage 2 already shows « Do majeur » done from the stored progress (C major chord mastered)
  await click(p, '.rt-chip[data-st="1"]'); await W(p, 200);
  const s2 = await R(p, () => ({ t: document.querySelector('.rt-tt b').textContent, d: [...document.querySelectorAll('.rt-pill.done')].map(x => x.dataset.id) }));
  check('progression déjà stockée : l’étape 2 montre « Do majeur » validé (S.mastery)', s2.t === 'Les accords majeurs' && s2.d.includes('s2.1'), s2);
  await learn(p);
  // Continue = a lone C (MIDI) on LEARN: the start screen of the step, preset
  await note(p, 60); await W(p, 700);
  const su = await R(p, () => { const S = window.__R.S; return { page: window.__R.page, setup: document.body.classList.contains('setup'), sec: S.section, su: S.settings.su.scales, gp: S.settings.guideP, sum: document.getElementById('suSum').textContent }; });
  check('Do seul sur LEARN : écran de départ de la leçon, préréglé (Majeure, Do, aide pas à pas)', su.page === 'practice' && su.setup && su.sec === 'scales' && su.su.tids.join() === 'major' && su.su.keys === 'pick' && su.su.picked.join() === '0' && su.gp === true, su);
  await note(p, 60); await W(p, 700); // C on the start screen = start
  check('Do sur l’écran de départ : la partie de la route commence (game.route = s1.2)', await R(p, () => window.__R.game && window.__R.game.route === 's1.2'));
  await playItem(p); await W(p, 800); await finish(p);
  const e = await R(p, () => ({ end: window.__R.endOpen, btn: !!document.getElementById('endRoute') && /Ma route/.test(document.getElementById('endRoute').textContent), done: !!window.__R.S.route.done['s1.2'] }));
  check('leçon réussie : étape validée (S.route.done), fin de partie avec « Ma route : suivant »', e.end && e.btn && e.done, e);
  const res = await R(p, () => window.__R.S.resume);
  check('S.resume = LEARN (matière, réglages, file, étape de la route)', res && res.kind === 'learn' && res.sec === 'scales' && res.route === 's1.2' && res.fin === true && res.su && res.su.keys === 'pick', res);
  await note(p, 60); await W(p, 900); // C = next step of the path (s1.6, the C scale without forced help)
  const n2 = await R(p, () => ({ page: window.__R.page, gp: window.__R.S.settings.guideP, su: window.__R.S.settings.su.scales.picked.join(), cur: window.__R.RT.cur && window.__R.RT.cur.id }));
  check('Do dans la fin de partie : étape suivante (Exercice Gamme de Do), aide pas à pas rendue', n2.page === 'practice' && n2.cur === 's1.6' && n2.gp === false && n2.su === '0', n2);
  check('une leçon réussie une fois ne valide pas l’exercice suivant (maîtrise ≥ 3 seulement)', await R(p, () => !document.querySelector('.rt-pill[data-id="s1.6"].done')) !== false);
  // reduced motion: no pulse
  await p.emulateMedia({ reducedMotion: 'reduce' }); await learn(p);
  check('mouvement réduit : la pastille ne pulse pas', await R(p, () => getComputedStyle(document.querySelector('.rt-pill.next .rt-dot'), '::after').animationName) === 'none');
  await p.context().close(); }

// ---------- C3 a game step: the game opens in solo practice with the step's content, back to LEARN when it closes
{ const p = await ctx(browser, { init: seed() }); await p.goto(URL); await W(p, 1200); await learn(p);
  await click(p, '#rtGo'); await W(p, 700);
  const g = await R(p, () => ({ on: document.body.classList.contains('runner-on'), lob: document.body.classList.contains('du-lob'), cont: window.__R.S.settings.gmCont, diff: window.__R.S.settings.gmDiff, cur: window.__R.RT.cur && window.__R.RT.cur.id, toast: (document.getElementById('toast') || {}).textContent || '' }));
  check('étape « Jeu » : Saute-notes en entraînement solo, notes, lent, objectif annoncé', g.on && !g.lob && g.cont === 'notes' && g.diff === 'slow' && g.cur === 's1.1' && /Objectif/.test(g.toast), g);
  await click(p, '#rnQuit'); await W(p, 500); if (await p.isVisible('#lvGo')) { await click(p, '#lvGo'); await W(p, 500); }
  check('fermer le jeu de la route : retour à LEARN', await R(p, () => window.__R.page === 'learn'));
  await p.context().close(); }

// ---------- C3 end of a stage: message + surprise song, a lone C plays it
{ const done = '{' + ['s1.1', 's1.2', 's1.3', 's1.4', 's1.5', 's1.7', 's1.8', 's1.9'].map(x => `"${x}":1`).join(',') + '}';
  const p = await ctx(browser, { init: seed({ extra: `S.route={v:1,done:${done}};` }) });
  await p.goto(URL); await W(p, 1200); await learn(p);
  await click(p, '#rtGo'); await W(p, 600); await click(p, '#suGo'); await W(p, 600); await playItem(p); await W(p, 700); await finish(p);
  check('dernière étape réussie : « Ma route : suivant » proposé', await R(p, () => !!document.getElementById('endRoute')), await R(p, () => ({ end: window.__R.endOpen, g: window.__R.game, route: window.__R.S.route, res: window.__R.S.resume, ph: window.__R.phase, cur: window.__R.RT.cur && window.__R.RT.cur.id })));
  await click(p, '#endRoute'); await W(p, 900);
  const w = await R(p, () => { const m = document.getElementById('rtWin'); return m && !m.hidden ? { k: document.getElementById('rtWinK').textContent, t: document.getElementById('rtWinT').textContent, s: document.getElementById('rtSong').textContent, st: window.__R.S.route.st } : null; });
  check('fin d’étape : message et morceau surprise (Au clair de la lune)', !!w && /Étape 1 terminée/.test(w.k) && /Les notes/.test(w.t) && /Au clair de la lune/.test(w.s) && w.st && w.st[1] > 0, w);
  await note(p, 60); await W(p, 900);
  const pl = await R(p, () => ({ page: window.__R.page, src: document.getElementById('playFrame').getAttribute('src') || '', res: window.__R.S.resume }));
  check('Do : le morceau s’ouvre dans le lecteur, S.resume = morceau', pl.page === 'play' && /#song=lune/.test(pl.src) && pl.res.kind === 'song' && pl.res.id === 'lune', pl);
  await hub(p);
  const h = await R(p, () => { const r = document.getElementById('ppResume'); return { vis: !r.hidden, rk: r.dataset.rk, txt: r.textContent }; });
  check('accueil : « Reprendre · PLAY › Au clair de la lune »', h.vis && h.rk === 'song' && /Reprendre · PLAY/.test(h.txt) && /Au clair de la lune/.test(h.txt), h);
  check('frise : étape 2 en cours après l’étape 1', await R(p, () => { document.querySelector('#modeNav [data-mode=learn]').click(); return /Étape 2 sur 6/.test(document.querySelector('.rt-k').textContent); }));
  await p.context().close(); }

// ---------- C4 pick up a LEARN game at the same item (lone C on the hub), « For you », a game, a new player
{ const p = await ctx(browser, { init: seed({ extra: 'S.elo={"runner-chords":{r:1040,n:6,w:3,d:0,l:3,h:[]}};' }) });
  await p.goto(URL); await W(p, 1200);
  const nw = await R(p, () => { const r = document.getElementById('ppResume'); return { vis: !r.hidden, rk: r.dataset.rk, txt: r.textContent }; });
  check('nouveau joueur : la carte propose la première étape de Ma route (Commencer)', nw.vis && nw.rk === 'route' && /Ma route/.test(nw.txt) && /Commencer/.test(nw.txt), nw);
  const fy = await R(p, () => [...document.querySelectorAll('#rsFor .rs-fc')].map(b => ({ f: b.dataset.f, t: b.textContent, bot: b.dataset.bot })));
  check('« Pour toi » : entraînement du jour, duel contre le bot de ton niveau (Hector · 1 100 pour 1 040), morceau', fy.length === 3 && fy[0].f === 'daily' && fy[1].f === 'duel' && /ELO/.test(fy[1].t) && fy[1].bot === '4' && fy[2].f === 'song', fy);
  check('la carte « Entraînement du jour » de la colonne ne fait pas doublon', await R(p, () => getComputedStyle(document.getElementById('hsDaily')).display === 'none'));
  await click(p, '#rsFor [data-f=duel]'); await W(p, 600);
  check('duel : salon du jeu, liste des bots, ton bot choisi', await R(p, () => document.body.classList.contains('runner-on') && document.querySelector('.du-bot[aria-pressed="true"]') && [...document.querySelectorAll('.du-bot')].indexOf(document.querySelector('.du-bot[aria-pressed="true"]')) === 4));
  await click(p, '#rnQuit'); await W(p, 400);
  // a LEARN game with 3 chords, one played, then home: the card shows it, a lone C picks it up at chord 2
  await learn(p); await click(p, '#secTabs [data-v="chords"]'); await W(p, 500);
  await R(p, () => { const st = window.__R.S.settings.su.chords; st.tids = ['maj']; st.keys = 'pick'; st.picked = [0, 5, 7]; st.shuffle = false; });
  await click(p, '#suGo'); await W(p, 600); await playItem(p); await note(p, 60); await W(p, 600);
  const i1 = await R(p, () => window.__R.game.i);
  await hub(p); if (await p.isVisible('#lvGo')) { await click(p, '#lvGo'); await W(p, 500); }
  const lr = await R(p, () => { const r = document.getElementById('ppResume'); return { rk: r.dataset.rk, txt: r.textContent, obj: !!r.querySelector('.rs-obj svg'), bar: (r.querySelector('.pp-bar i') || {}).style?.width }; });
  check('accueil : « Reprendre · LEARN › Accords », 1 / 3, objet 3D et barre', lr.rk === 'learn' && /LEARN › Accords/.test(lr.txt) && /1 \/ 3/.test(lr.txt) && lr.obj && lr.bar === '33%', lr);
  await note(p, 60); await W(p, 800);
  const back = await R(p, () => ({ page: window.__R.page, i: window.__R.game && window.__R.game.i, n: window.__R.game && window.__R.game.total }));
  check('Do seul sur l’accueil : la partie reprend au 2e accord', back.page === 'practice' && back.i === i1 && back.n === 3, { back, i1 });
  // a game opened from GAMES becomes the last activity
  await click(p, '#modeNav [data-mode=games]'); await W(p, 400); await click(p, '#gameCards .ptile'); await W(p, 400); await click(p, '#rnQuit'); await W(p, 300); await hub(p);
  check('un jeu ouvert : « Reprendre · GAMES › Saute-notes » avec le record', await R(p, () => { const r = document.getElementById('ppResume'); return r.dataset.rk === 'game' && /GAMES/.test(r.textContent) && /Record/.test(r.textContent); }));
  await click(p, '#ppResume'); await W(p, 500);
  check('Continuer : le jeu s’ouvre en entraînement solo', await R(p, () => document.body.classList.contains('runner-on') && !document.body.classList.contains('du-lob')));
  await p.context().close(); }

// ---------- C4 First steps keep their card (beginner, last activity = a lesson)
{ const p = await ctx(browser, { init: seed({ level: 'debut', extra: 'S.pp={on:true,start:1,cur:"p02",done:{p01:{at:1,stars:3}}}; S.resume={kind:"pp",id:"p02",step:1,at:Date.now(),v:1};' }) });
  await p.goto(URL); await W(p, 1200);
  check('Premiers pas : la carte reste celle de la leçon (Leçon 2)', await R(p, () => { const r = document.getElementById('ppResume'); return !r.hidden && r.dataset.rk === 'pp' && /Leçon 2/.test(r.textContent); }));
  await p.context().close(); }

// ---------- mergeState: steps and stages united, the first date kept; an old state without S.route
{ const p = await ctx(browser, { init: seed() }); await p.goto(URL); await W(p, 1000);
  const m = await R(p, () => { const S = window.__R.S, loc = { ...S, route: { v: 1, done: { 's1.1': 50, 's1.2': 10 }, st: {} } }, cl = { route: { v: 1, done: { 's1.2': 5, 's2.1': 7 }, st: { 1: 9 } } };
    const r = window.__R.mergeState(loc, cl).merged.route, r2 = window.__R.mergeState({ ...S, route: undefined }, {}).merged.route; return { r, r2 }; });
  check('mergeState : union des étapes (date la plus ancienne), étapes finies gardées', m.r.done['s1.1'] === 50 && m.r.done['s1.2'] === 5 && m.r.done['s2.1'] === 7 && m.r.st[1] === 9, m);
  check('mergeState : état ancien sans S.route ni cloud : rien d’inventé', m.r2 === undefined, m);
  await p.context().close(); }

// ---------- English
{ const p = await ctx(browser, { init: seed({ lang: 'en' }) }); await p.goto(URL); await W(p, 1000); await learn(p);
  check('anglais : « My path · Stage 1 of 6 », « The notes », Continue', await R(p, () => /My path · Stage 1 of 6/.test(document.querySelector('.rt-k').textContent) && document.querySelector('.rt-tt b').textContent === 'The notes' && /Continue/.test(document.getElementById('rtGo').textContent)));
  await hub(p); check('anglais : « For you »', await R(p, () => /For you/.test(document.querySelector('.rs-h').textContent)));
  await p.context().close(); }

// ---------- no scroll on the hub and LEARN at 5 sizes, light and dark (route + resume + For you shown)
for (const dark of [false, true]) for (const [w, h, mobile] of [[375, 667, true], [812, 375, true], [768, 1024, false], [1024, 768, false], [1280, 800, false]]) {
  const p = await ctx(browser, { w, h, mobile, dark, init: seed({ extra: 'S.resume={kind:"learn",sec:"chords",q:[{sec:"chords",tid:"maj",k:"C",inv:0},{sec:"chords",tid:"maj",k:"F",inv:0}],i:1,n:2,label:"Majeur · Do, Fa",su:{},at:Date.now()};' }) });
  await p.goto(URL); await W(p, 1100);
  for (const pg of ['hub', 'learn']) { if (pg === 'learn') await learn(p);
    const m = await R(p, () => { const mm = document.getElementById('main'), d = document.scrollingElement; const vis = id => { const e = document.getElementById(id); if (!e || e.hidden || !e.offsetParent) return null; const r = e.getBoundingClientRect(); return r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1; };
      return { sh: mm.scrollHeight, ch: mm.clientHeight, dsh: d.scrollHeight, H: innerHeight, dsw: d.scrollWidth, W: innerWidth, res: vis('ppResume'), fy: vis('rsFor'), rt: vis('rtMap'), go: vis('rtGo') }; });
    const ok = m.sh <= m.ch + 1 && m.dsh <= m.H + 1 && m.dsw <= m.W && (pg === 'hub' ? m.res && m.fy : m.rt && m.go);
    check(`${w}×${h}${dark ? ' sombre' : ''} ${pg} : sans défilement, ${pg === 'hub' ? 'Reprendre et Pour toi visibles' : 'frise et Continuer visibles'}`, ok, m); }
  await p.context().close(); }

check('aucune erreur JS', errs.length === 0, errs.slice(0, 5));
await browser.close();
console.log(fails.length ? `\n${fails.length} échec(s)` : '\nTout passe');
process.exit(fails.length ? 1 : 0);
