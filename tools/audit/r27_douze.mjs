// r27 — « Les Douze » (L15, étape 3 de la feuille de route) : tuile GAMES, 12 cases, ordres, renversement libre, fausse note +2 s,
// fantôme du record, paliers, record dans S.gameBest / S.dzRec + fiche Progression, XP, « Quitter la partie ? », Do / Si seuls (MIDI),
// pause au débranchement (mdHold), duel contre un bot (même ordre tiré de la graine, barre #duHud, ELO), fusion entre appareils, EN.
// Usage : python3 -m http.server 8787 à la racine, puis PORT=8787 NODE_PATH=… PW_CHROMIUM=… node tools/audit/r27_douze.mjs
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
const DZ = p => ev(p, () => { const D = window.__dz.DZ; return { state: D.state, i: D.i, step: D.step, ms: D.ms, pen: D.pen, bad: D.bad, cont: D.cont, names: D.items.map(x => x.name), ghost: !!D.ghost, medal: D.medal }; });
const seed = (input, lang, extra = {}) => `(()=>{ try{ if(sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded','1');
  localStorage.setItem('memo-gammes-v1', JSON.stringify(Object.assign({settings:{lang:'${lang}',notation:'${lang}',input:'${input}',earV2:true,diffV2:true,midiV2:true,uiSound:false,midiSound:true},
    langV2:true,gate:'guest',onb:{done:1},tourDone:1,pwShown:1,introSeen:Object.fromEntries(['hub','learn','games','free','play','quiz','chords','scales','harmony','prog','ear','daily','practice','runner','speed','memory','douze','rank','account','settings','progress','notif','section'].map(k=>[k,1])),
    seenTypes:[],stats:{},secStats:{},xp:500,xpDays:{},streak:{days:0}}, ${JSON.stringify(extra)}))); }catch(e){} })();`;
const EXPOSE = `window.__dz={ get DZ(){return DZ}, get DU(){return DU}, get HOLD(){return HOLD}, mergeState, dzItems, duRng };`;
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
async function open(o = {}) {
  const ctx = await b.newContext({ viewport: o.viewport || { width: 1280, height: 800 }, locale: o.lang === 'en' ? 'en-GB' : 'fr-FR' });
  await ctx.route(u => u.pathname === '/' || u.pathname.endsWith('/index.html'), async route => {
    const res = await route.fetch(); let html = await res.text(); const end = html.lastIndexOf('})();\n</script>');
    html = html.slice(0, end) + EXPOSE + '\n' + html.slice(end);
    await route.fulfill({ response: res, body: html, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await ctx.addInitScript(`window.__midiMode="ok";`); await ctx.addInitScript(INIT('ok'));
  await ctx.addInitScript(seed(o.input || 'screen', o.lang || 'fr', o.extra || {}));
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); }); p.errs = errs; p.ctx = ctx;
  await p.goto(URL); await W(p, 1000); return p; }
const games = async p => { await click(p, '#modeNav [data-mode="games"]'); await W(p, 300); };
async function douze(p, solo = true) { await games(p); await ev(p, () => document.querySelectorAll('#gameCards .ptile')[3].click()); await W(p, 400); if (solo) { await click(p, '#duModes [data-m=solo]'); await W(p, 300); } }
const setSel = (p, id, v) => ev(p, ([id, v]) => { const s = document.getElementById(id); s.value = v; s.dispatchEvent(new Event('change')); }, [id, v]);
// a key of the screen keyboard for a pitch class (from the 2nd C up), or the same plus an octave
const key = (p, pc, up = 0, midi = false) => ev(p, ([pc, up, midi]) => { const ks = [...document.querySelectorAll('#kbd [data-m]')].map(k => +k.dataset.m).filter(m => (m % 12 + 12) % 12 === pc).sort((a, b) => a - b);
  const m = (ks.find(x => x >= 48) ?? ks[0]) + 12 * up; if (midi) { window.__midi.noteOn(m); setTimeout(() => window.__midi.noteOff(m), 60); return m; }
  const el = document.querySelector('#kbd [data-m="' + m + '"]') || document.querySelector('#kbd [data-m="' + (m - 12) + '"]'); el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); return m; }, [pc, up, midi]);
async function playCell(p, midi = false) { const it = await ev(p, () => { const D = window.__dz.DZ, x = D.items[D.i]; return x && (x.seq ? { seq: x.seq.slice(D.step) } : { pcs: x.pcs }); });
  if (!it) return; if (it.seq) { for (const pc of it.seq) { await key(p, pc, 0, midi); await W(p, 90); } } else { for (const pc of it.pcs) await key(p, pc, 0, midi); }
  await W(p, 380); }

// ---- 1. GAMES : la tuile « Les Douze » et la grille sans défilement aux 5 tailles ----
for (const [w, h] of [[375, 667], [812, 375], [768, 1024], [1024, 768], [1280, 800]]) {
  const p = await open({ viewport: { width: w, height: h } }); await games(p);
  const r = await ev(p, () => { const g = document.getElementById('gameCards'), ts = [...g.querySelectorAll('.ptile')], m = document.getElementById('main');
    const last = ts[ts.length - 1].getBoundingClientRect(), gr = g.getBoundingClientRect();
    return { n: ts.length, t: ts[3] && ts[3].querySelector('.h3').textContent, obj: !!(ts[3] && ts[3].querySelector('.obj svg')), rec: ts[3] && (ts[3].querySelector('.rec') || {}).textContent,
      scroll: m.scrollHeight - m.clientHeight, doc: document.documentElement.scrollHeight - innerHeight, x: document.documentElement.scrollWidth - innerWidth, inside: last.bottom <= gr.bottom + 2 && last.right <= gr.right + 2 }; });
  check(`GAMES ${w}×${h} : 5 tuiles, « Les Douze » 4e avec son objet 3D, aucun défilement`, r.n === 5 && r.t === 'Les Douze' && r.obj && r.scroll <= 1 && r.doc <= 1 && r.x <= 1 && r.inside, r);
  if (w === 1280) check('tuile : record « — » et ELO du contenu choisi', /Record\s— · ELO\s800\?/.test(r.rec || ''), r.rec);
  check(`aucune erreur ${w}×${h}`, !p.errs.length, p.errs); await p.ctx.close(); }

// ---- 2. Solo : salon, 12 cases, ordres, contenus ----
const A = await open();
await douze(A, false);
check('salon des duels avec les 4 contenus des Douze', await vis(A, 'duLobby') && await ev(A, () => [...document.querySelectorAll('#duCont button')].map(b => b.dataset.v).join() === 'maj,min,dom7,scale'));
await click(A, '#duModes [data-m=solo]'); await W(A, 300);
let d = await DZ(A);
check('12 cases, ordre chromatique descendant depuis Si', await ev(A, () => document.querySelectorAll('#dzRing .dz-cell').length === 12) && d.names[0] === 'Si' && d.names[1] === 'Si♭' && d.names[11] === 'Do' && d.state === 'ready', d.names);
check('prêt : « Prêt ? », paliers bronze 3:00 / argent 2:00 / or 1:30', await ev(A, () => document.getElementById('dzName').textContent === 'Prêt ?' && /Bronze< 3:00Argent< 2:00Or< 1:30/.test(document.getElementById('dzMeds').textContent)));
await setSel(A, 'dzOrder', 'fifths'); await W(A, 200); d = await DZ(A);
check('cercle des quintes : Do, Sol, Ré…', d.names.slice(0, 4).join() === 'Do,Sol,Ré,La', d.names);
await setSel(A, 'dzOrder', 'rand'); await W(A, 200); d = await DZ(A);
check('au hasard : les 12 toniques une fois chacune', new Set(d.names).size === 12, d.names);
await setSel(A, 'dzCont', 'dom7'); await W(A, 200);
check('septièmes de dominante : 4 notes par accord', await ev(A, () => window.__dz.DZ.items.every(x => x.pcs.length === 4)));
await setSel(A, 'dzCont', 'scale'); await W(A, 200);
check('gammes : 8 notes, de la tonique à la tonique, paliers ×2', await ev(A, () => window.__dz.DZ.items.every(x => x.seq.length === 8 && x.seq[0] === x.seq[7]) && /6:00.*4:00.*3:00/.test(document.getElementById('dzMeds').textContent)));
await setSel(A, 'dzCont', 'maj'); await setSel(A, 'dzOrder', 'chrom'); await W(A, 200);
// ---- 3. Une partie : renversement libre, fausse note +2 s, fin, record, XP, médaille ----
const xp0 = (await st(A)).xp;
await A.keyboard.press('Space'); await W(A, 200);
check('Espace lance la partie', (await DZ(A)).state === 'run');
const first = await ev(A, () => window.__dz.DZ.items[0].pcs); // Si majeur : Si Ré♯ Fa♯, joué avec Ré♯ à la basse
await key(A, first[1]); await key(A, first[2]); await key(A, first[0], 1); await W(A, 120);
check('renversement libre : 1er renversement accepté', (await DZ(A)).i === 1);
await key(A, first[0]); await W(A, 120); // a late note of the chord just found: no penalty
check('note de l’accord précédent juste après : pas de pénalité', (await DZ(A)).pen === 0);
await W(A, 400);
const wrong = await ev(A, () => { const D = window.__dz.DZ, it = D.items[D.i]; return [...Array(12).keys()].find(x => !it.pcs.includes(x)); });
await key(A, wrong); await W(A, 100);
d = await DZ(A);
check('fausse note : +2 s et pastille « Fausse note +2 s ×1 »', d.pen === 2000 && d.bad === 1 && await ev(A, () => !document.getElementById('dzPen').hidden && /\+2 s ×1/.test(document.getElementById('dzPen').textContent)), d);
check('cible en grand : nom + « majeur », 2 sur 12', await ev(A, () => document.getElementById('dzName').textContent === 'Si♭' && document.getElementById('dzQual').textContent === 'majeur' && /Accord 2 sur 12/i.test(document.getElementById('dzKick').textContent)));
for (let k = 0; k < 11; k++) await playCell(A);
d = await DZ(A); const s1 = await st(A);
check('fin : 12 cases, temps ≥ 2 s (pénalité comprise)', d.state === 'over' && d.i === 12 && s1.dzRec && s1.dzRec.maj && s1.dzRec.maj.ms >= 2000, { d, rec: s1.dzRec });
check('record : médaille S.gameBest["douze-maj"] = 3 (or) et temps + fantôme S.dzRec.maj (12 temps)', s1.gameBest && s1.gameBest['douze-maj'] === 3 && s1.dzRec.maj.sp.length === 12 && s1.dzRec.maj.sp[11] === s1.dzRec.maj.ms, { gb: s1.gameBest, rec: s1.dzRec });
check('médaille d’or (moins de 90 s) et XP gagnés', d.medal === 2 && /Médaille d'or/.test(await ev(A, () => document.getElementById('dzQual').textContent)) && s1.xp >= xp0 + 22, { medal: d.medal, xp: [xp0, s1.xp] });
check('record affiché en tête du jeu', await ev(A, () => /^Record \d:\d\d,\d$/.test(document.getElementById('rnBest').textContent)));
// ---- 4. Deuxième partie : le fantôme et l’écart ----
await W(A, 600); await A.keyboard.press('Space'); await W(A, 200);
d = await DZ(A);
check('2e partie : le fantôme du record est là', d.state === 'run' && d.ghost && await ev(A, () => !document.getElementById('dzBoard').classList.contains('nog')));
await W(A, 500); await playCell(A);
check('écart avec le record en vert ou en rouge', await ev(A, () => { const g = document.getElementById('dzGap'); return /ahead|behind|even/.test(g.className) && /record/.test(g.textContent); }), await ev(A, () => document.getElementById('dzGap').outerHTML));
// ---- 5. « Quitter la partie ? » et pause ----
await click(A, '#rnQuit'); await W(A, 200);
check('Quitter en pleine partie : « Quitter la partie ? »', await vis(A, 'leaveModal'));
const m0 = (await DZ(A)).ms; await W(A, 700); const m1 = (await DZ(A)).ms;
check('le chrono attend derrière la fenêtre', m1 - m0 < 60, [m0, m1]);
await click(A, '#lvStay'); await W(A, 400);
check('Continuer : la partie reprend', !(await vis(A, 'leaveModal')) && (await DZ(A)).state === 'run' && (await DZ(A)).ms > m1);
// ---- 6. Gammes en notes : dans l’ordre, la même note deux fois n’est pas une faute ----
await click(A, '#rnQuit'); await W(A, 200); await click(A, '#lvGo'); await W(A, 300);
await douze(A); await setSel(A, 'dzCont', 'scale'); await W(A, 200); await A.keyboard.press('Space'); await W(A, 200);
const sc = await ev(A, () => window.__dz.DZ.items[0].seq);
for (const pc of [sc[0], sc[1], sc[1]]) { await key(A, pc); await W(A, 90); }
check('gamme : note répétée sans pénalité', (await DZ(A)).pen === 0 && (await DZ(A)).step === 2);
await key(A, sc[4]); await W(A, 90);
check('gamme : note hors ordre = +2 s', (await DZ(A)).pen === 2000 && (await DZ(A)).step === 2);
for (const pc of sc.slice(2)) { await key(A, pc); await W(A, 90); }
await W(A, 300);
check('gamme jouée jusqu’à la tonique : case suivante', (await DZ(A)).i === 1 && (await DZ(A)).step === 0);
await setSel(A, 'dzCont', 'maj'); await W(A, 200);
// ---- 7. Fiche Progression : le record des Douze ----
await click(A, '#rnQuit'); await W(A, 200); await click(A, '#lvlAv'); await W(A, 600);
check('fiche Progression : « Les Douze · Accords majeurs » avec le temps et la médaille', await ev(A, () => [...document.querySelectorAll('#pfRecs li')].some(li => /Les Douze · Accords majeurs/.test(li.textContent) && /\d:\d\d,\d/.test(li.textContent) && /Or/.test(li.textContent))));
await games(A);
check('tuile : record en temps', await ev(A, () => /Record\s\d:\d\d,\d · ELO/.test(document.querySelectorAll('#gameCards .ptile')[3].textContent)));
// ---- 8. Fusion entre appareils : le plus petit temps gagne, le fantôme suit son record ----
const mg = await ev(A, () => { const M = window.__dz.mergeState, sp = n => Array.from({ length: 12 }, (_, i) => (i + 1) * n);
  const r1 = M({ gameBest: { speed: 3, 'douze-maj': 2 }, dzRec: { maj: { ms: 100000, sp: sp(8000), at: 1 } }, settings: {} }, { gameBest: { speed: 5, 'douze-maj': 3 }, dzRec: { maj: { ms: 85000, sp: sp(7000), at: 2 } } }).merged;
  const r2 = M({ gameBest: { 'douze-min': 3 }, dzRec: { min: { ms: 70000, sp: sp(5000), at: 1 } }, settings: {} }, { gameBest: { 'douze-min': 1 }, dzRec: { min: { ms: 150000, sp: sp(12000), at: 3 } } }).merged;
  const r3 = M({ gameBest: { speed: 2 }, settings: {} }, { gameBest: { speed: 1 } }).merged;
  return { a: r1.gameBest['douze-maj'], ag: r1.dzRec.maj.ms, gs: r1.dzRec.maj.sp[0], sp: r1.gameBest.speed, b: r2.gameBest['douze-min'], bg: r2.dzRec.min.ms, c: 'dzRec' in r3 }; });
check('fusion : meilleure médaille (max), plus petit temps avec son fantôme, pas de clé vide', mg.a === 3 && mg.ag === 85000 && mg.gs === 7000 && mg.sp === 5 && mg.b === 3 && mg.bg === 70000 && !mg.c, mg);
check('aucune erreur (solo)', !A.errs.length, A.errs);
await A.ctx.close();

// ---- 9. MIDI : Do seul démarre, un accord avec un Do ne fait rien, Si seul recommence ; débranchement = pause ----
const M = await open({ input: 'midi' }); await douze(M);
await ev(M, () => { window.__midi.chord([60, 64, 67]); }); await W(M, 400);
check('MIDI : un accord avec un Do ne lance pas la partie', (await DZ(M)).state === 'ready');
await ev(M, () => { window.__midi.noteOn(60); setTimeout(() => window.__midi.noteOff(60), 50); }); await W(M, 400);
check('MIDI : un Do seul lance la partie', (await DZ(M)).state === 'run');
await playCell(M, true); await playCell(M, true);
await ev(M, () => window.__midi.disconnect(0)); await W(M, 500);
check('débranchement en pleine partie : pause (mdLost) et chrono arrêté', await vis(M, 'mdLost') && await ev(M, () => window.__dz.HOLD));
const h0 = (await DZ(M)).ms; await W(M, 600); const h1 = (await DZ(M)).ms;
check('le chrono ne bouge pas pendant la pause', h1 - h0 < 60, [h0, h1]);
await ev(M, () => window.__midi.reconnect(0)); await W(M, 4200);
check('rebranché : la partie reprend', !(await vis(M, 'mdLost')) && !(await ev(M, () => window.__dz.HOLD)) && (await DZ(M)).state === 'run');
for (let k = 0; k < 10; k++) await playCell(M, true);
check('MIDI : partie finie', (await DZ(M)).state === 'over');
await W(M, 800); await ev(M, () => { window.__midi.noteOn(71); setTimeout(() => window.__midi.noteOff(71), 50); }); await W(M, 400);
check('MIDI : un Si seul recommence', (await DZ(M)).state === 'run' && (await DZ(M)).i === 0);
check('aucune erreur (MIDI)', !M.errs.length, M.errs);
await M.ctx.close();

// ---- 10. Duel contre un bot : même ordre (graine), barre des scores, résultat en temps, ELO ----
const D = await open(); await douze(D, false);
await click(D, '#duModes [data-m=bots]'); await W(D, 200);
await ev(D, () => document.querySelectorAll('.du-bot')[9].click()); await click(D, '#duBotGo');
check('duel : compte à rebours puis partie', await waitFor(D, () => !document.getElementById('duHud').hidden && window.__dz.DZ.state === 'run', 6000));
const same = await ev(D, () => { const U = window.__dz.DU, a = window.__dz.dzItems(U.cont, 'rand', window.__dz.duRng(U.seed)).map(x => x.name).join(), b = window.__dz.DZ.items.map(x => x.name).join(); return a === b; });
check('duel : l’ordre vient de la graine partagée (le même des deux côtés)', same);
for (let k = 0; k < 3; k++) await playCell(D);
check('barre des scores : « 3/12 »', await ev(D, () => document.getElementById('duMeSc').textContent === '3/12'), await ev(D, () => document.getElementById('duMeSc').textContent));
for (let k = 0; k < 9; k++) await playCell(D);
check('duel : fini, on attend le bot ou le résultat', await waitFor(D, () => !document.getElementById('duWait').hidden || !document.getElementById('duRes').hidden, 3000));
check('duel : résultat (victoire, temps affichés)', await waitFor(D, () => !document.getElementById('duRes').hidden, 30000) && await ev(D, () => /\d:\d\d,\d/.test(document.querySelector('#duRes .du-rsc b').textContent) && /Les Douze · Accords majeurs/.test(document.querySelector('#duRes .du-rk').textContent)));
const e1 = (await st(D)).elo || {};
check('duel : ELO « douze-maj » mis à jour, pas de record solo', e1['douze-maj'] && e1['douze-maj'].n === 1 && !((await st(D)).gameBest || {})['douze-maj'], e1);
// a bot that finishes first, then the player is already slower: lost at once
await click(D, '#duResLobby'); await W(D, 300); await click(D, '#duModes [data-m=bots]'); await W(D, 200);
await ev(D, () => document.querySelectorAll('.du-bot')[9].click()); await click(D, '#duBotGo');
await waitFor(D, () => window.__dz.DZ.state === 'run', 6000);
check('duel : plus lent que le temps final du bot = fin de partie', await waitFor(D, () => !document.getElementById('duRes').hidden && document.getElementById('duRes').dataset.res === 'loss', 45000));
check('aucune erreur (duel)', !D.errs.length, D.errs);
await D.ctx.close();

// ---- 11. EN ----
const E = await open({ lang: 'en' }); await games(E);
check('EN : tuile « The Twelve »', await ev(E, () => document.querySelectorAll('#gameCards .ptile')[3].querySelector('.h3').textContent === 'The Twelve'));
await douze(E);
check('EN : « Chromatic down from B », cases B, B♭', await ev(E, () => document.getElementById('dzOrder').selectedOptions[0].textContent === 'Chromatic down from B') && (await DZ(E)).names.slice(0, 2).join() === 'B,B♭');
check('EN : « Ready? », medals Bronze / Silver / Gold', await ev(E, () => document.getElementById('dzName').textContent === 'Ready?' && /Silver/.test(document.getElementById('dzMeds').textContent)));
const keys = await ev(E, () => 0); // FR/EN keys
{ const src = readSource();
  const fr = src.slice(src.indexOf('  fr:{help:'), src.indexOf('  en:{help:')), en = src.slice(src.indexOf('  en:{help:'), src.indexOf('const t = k => TXT'));
  const k = s => new Set([...s.matchAll(/\b(dz[A-Za-z]+):/g)].map(m => m[1]));
  const a = k(fr), bb = k(en), miss = [...a].filter(x => !bb.has(x)).concat([...bb].filter(x => !a.has(x)));
  check('toutes les clés dz* en FR et en EN', a.size >= 20 && !miss.length, miss); }
check('aucune erreur (EN)', !E.errs.length, E.errs);
await E.ctx.close();
await b.close();
if (fails.length) { console.log('\nECHEC r27 :', fails); process.exit(1); }
console.log('\nr27 OK');
