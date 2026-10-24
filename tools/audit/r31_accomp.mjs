// r31 — Accompagnement (L7, étape 4 de la feuille de route) : tuile LEARN, écran de départ, grille 2 × 8 avec curseur, clavier coupé
// main gauche / main droite, mode attente et mode en rythme (simulation MIDI avec timing : ±80 ms parfait, ±160 ms correct, élargi par
// midiLat()), compte « 1, 2, 3, 4 », +5 bpm après 2 boucles parfaites, Do seul / Si seul, « Quitter la partie ? », pause au débranchement,
// micro = attente seulement, étoiles / XP / record, clés acc* FR et EN.
// Usage : PORT=8767 NODE_PATH=… PW_CHROMIUM=… node tools/audit/r31_accomp.mjs
import fs from 'fs';
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = process.env.PORT || '8767', URL = `http://localhost:${PORT}/`;
const LIB = fs.readFileSync(new globalThis.URL('./lib.mjs', import.meta.url), 'utf8');
const INIT = mode => /export const INIT = `([\s\S]*?)`;\n/.exec(LIB)[1].split("${'${MODE}'}").join(mode);
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d !== undefined && !ok ? ' — ' + JSON.stringify(d) : '')); if (!ok) fails.push(n); };
const W = (p, ms) => p.waitForTimeout(ms);
const ev = (p, f, a) => p.evaluate(f, a);
const click = (p, s) => ev(p, s => { const e = document.querySelector(s); if (e) e.click(); return !!e; }, s);
const waitFor = async (p, f, ms = 5000, a) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(p, f, a)) return true; await W(p, 50); } return false; };
const st = p => ev(p, () => JSON.parse(localStorage.getItem('memo-gammes-v1') || '{}'));
const vis = (p, id) => ev(p, id => { const e = document.getElementById(id); return !!e && !e.hidden && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden'; }, id);
const seed = (input, acc, extra = {}) => `(()=>{ try{ if(sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded','1');
  localStorage.setItem('memo-gammes-v1', JSON.stringify(Object.assign({settings:{lang:'fr',notation:'fr',input:'${input}',earV2:true,diffV2:true,midiV2:true,uiSound:false,midiSound:true,acc:${JSON.stringify(acc)}},
    langV2:true,gate:'guest',onb:{done:1,level:'notes'},tourDone:1,pwShown:1,introSeen:Object.fromEntries(['hub','learn','games','free','play','quiz','chords','scales','harmony','prog','ear','daily','practice','runner','speed','memory','rank','account','settings','progress','notif','section'].map(k=>[k,1])),
    seenTypes:[],stats:{},secStats:{},xp:500,xpDays:{},streak:{days:0}}, ${JSON.stringify(extra)}))); }catch(e){} })();`;
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
async function open(o = {}) {
  const ctx = await b.newContext({ viewport: o.viewport || { width: 1280, height: 800 }, locale: 'fr-FR' });
  await ctx.addInitScript(`window.__midiMode='ok';`); await ctx.addInitScript(INIT('ok'));
  // midiLat() is the app's own now (MIDI lots 2-3): it reads S.midi.lat, the offset the timing assistant measured
  await ctx.addInitScript(seed(o.input || 'midi', o.acc || {}, o.lat ? { ...(o.extra || {}), midi: { ...((o.extra || {}).midi || {}), lat: o.lat } } : (o.extra || {})));
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load resource/.test(m.text())) errs.push(m.text()); }); p.errs = errs; p.ctx = ctx;
  await p.goto(URL); await W(p, 1200); return p; }
const toAcc = async p => { await click(p, '#modeNav [data-mode="learn"]'); await W(p, 300); await ev(p, () => document.querySelectorAll('#learnTiles .ptile')[5].click()); await W(p, 400); };
const cells = (p, h) => ev(p, h => [...document.querySelectorAll('#acCells .ac-c[data-h="' + h + '"]')].map(e => (e.className.match(/\bs\d\b|\bcur\b/g) || []).join(' ')), h);
// plays notes at a time relative to the timeline (data-t0 = beat 0, data-bpm), inside the page so the delay is exact
const at = (p, beat, notes, i = 0) => ev(p, ([beat, notes, i]) => { const P = document.getElementById('accPanel'), t0 = +P.dataset.t0, bm = 60000 / +P.dataset.bpm;
  setTimeout(() => { (window.__dt = window.__dt || {})[Math.round(beat)] = performance.now() - (t0 + Math.round(beat) * bm); notes.forEach(n => window.__midi.noteOn(n, 100, i)); }, Math.max(0, t0 + beat * bm - performance.now())); return t0 + beat * bm - performance.now(); }, [beat, notes, i]);
// the class expected from the time the notes really left (the machine may be busy): s1 ≤ ±(80+lat), s2 ≤ ±(160+lat), else s3; « any » within 12 ms of a limit
const expect = async (p, beat, lat = 0) => { const d = Math.abs(await ev(p, b => (window.__dt || {})[b], beat)), w1 = 80 + lat, w2 = 160 + lat;
  return { d: Math.round(d), c: [w1, w2].some(w => Math.abs(d - w) < 12) ? 'any' : d <= w1 ? 's1' : d <= w2 ? 's2' : 's3' }; };
const same = (x, e) => e.c === 'any' || x === e.c;
const untilBeat = (p, beat) => ev(p, beat => new Promise(r => { const P = document.getElementById('accPanel'); setTimeout(r, Math.max(0, +P.dataset.t0 + beat * 60000 / +P.dataset.bpm - performance.now())); }), beat);

// ---- clés acc* FR / EN ----
{ const src = fs.readFileSync(new globalThis.URL('../../src/piano-challenges.html', import.meta.url), 'utf8');
  const fr = src.slice(src.indexOf('  fr:{help:'), src.indexOf('  en:{help:')), en = src.slice(src.indexOf('  en:{help:'), src.indexOf('\n};', src.indexOf('  en:{help:')));
  const keys = s => new Set([...s.matchAll(/[\s,{](acc[A-Z]\w*):/g)].map(m => m[1]));
  const kf = keys(fr), ke = keys(en), miss = [...kf].filter(k => !ke.has(k)).concat([...ke].filter(k => !kf.has(k)));
  const used = new Set([...src.matchAll(/t\("(acc[A-Z]\w*)"\)/g)].map(m => m[1]));
  check('clés acc* en FR et en EN (' + kf.size + ')', kf.size > 30 && !miss.length, miss);
  check('chaque clé acc* utilisée existe', [...used].every(k => kf.has(k)), [...used].filter(k => !kf.has(k)));
  check('tuile « Accompagnement » en FR et en EN', /\["accomp","Accompagnement"/.test(fr) && /\["accomp","Accompaniment"/.test(en)); }

// ---- tuile LEARN et écran de départ ----
let A = await open();
await click(A, '#modeNav [data-mode="learn"]'); await W(A, 400);
const tiles = await ev(A, () => [...document.querySelectorAll('#learnTiles .ptile')].map(t => t.querySelector('.h3').textContent));
check('LEARN : 7 tuiles, « Accompagnement » avant l’Entraînement du jour', tiles.length === 7 && tiles[5] === 'Accompagnement' && /Entraînement/.test(tiles[6]), tiles);
await ev(A, () => document.querySelectorAll('#learnTiles .ptile')[5].click()); await W(A, 400);
check('la tuile ouvre l’écran de départ (page acc)', await ev(A, () => document.body.dataset.page === 'acc' && !!document.getElementById('acGo')));
const su = await ev(A, () => ({ styles: [...document.querySelectorAll('#acStyles [data-s]')].map(b => b.dataset.s), pats: document.querySelectorAll('#acPats [data-p]').length, progs: document.querySelectorAll('#acProgs [data-g]').length, keys: document.querySelectorAll('#acKeys [data-k]').length, bpm: [document.getElementById('acBpm').min, document.getElementById('acBpm').max], modes: [...document.querySelectorAll('#acModes [data-v]')].map(b => b.dataset.v + ':' + b.getAttribute('aria-pressed')) }));
check('écran de départ : 7 styles (Ballade, Pop, Valse, Blues, Latin, Gospel, Bossa)', ['ballad', 'pop', 'waltz', 'blues', 'latin', 'gospel', 'bossa'].every(s => su.styles.includes(s)), su);
check('écran de départ : patterns, grilles des Progressions, 12 tonalités, tempo 60 → 120', su.pats >= 2 && su.progs >= 5 && su.keys === 12 && su.bpm[0] === '60' && su.bpm[1] === '120', su);
check('mode attente par défaut pour un débutant', su.modes[0] === 'wait:true', su.modes);
const per = [];
for (const s of su.styles) { await click(A, `#acStyles [data-s="${s}"]`); await W(A, 60); per.push(await ev(A, () => [...document.querySelectorAll('#acPats [data-p]')].map(b => b.querySelector('.ac-df').firstChild.textContent.replace(/[^●]/g, '').length))); }
check('au moins 2 patterns par style, difficultés 1 à 3', per.every(x => x.length >= 2) && [1, 2, 3].every(d => per.flat().includes(d)), per);
check('aucune erreur JS (écran de départ)', !A.errs.length, A.errs);
await A.ctx.close();

// ---- mode attente : main gauche (1) + main droite (accord), mauvaise main = erreur, Do seul démarre ----
A = await open({ acc: { style: 'ballad', pat: { ballad: 'ballad1' }, prog: 'p145', key: 'C', mode: 'wait', bpm: 80 } });
await toAcc(A);
await ev(A, () => window.__midi.noteOn(60)); await W(A, 300);
check('Do seul (MIDI) sur l’écran de départ = la partie démarre', await ev(A, () => !!document.getElementById('acCells') && document.getElementById('accPanel').dataset.mode === 'wait'));
check('grille 2 lignes × 8 cases, accord courant → suivant', await ev(A, () => document.querySelectorAll('#acCells .ac-c').length === 16 && document.getElementById('acChord').textContent === 'Do' && document.getElementById('acNext').textContent === 'Fa'));
check('mode attente : la case attendue est marquée', (await cells(A, 'R'))[0] === 'cur' && (await cells(A, 'L'))[0] === 'cur');
check('clavier coupé au Do central (main gauche / main droite)', await ev(A, () => document.querySelector('#acKb [data-m="59"]').classList.contains('lh') && document.querySelector('#acKb [data-m="60"]').classList.contains('rh') && /Do central/.test(document.querySelector('.ac-kbl').textContent)));
check('touches allumées : basse + accord de Do', await ev(A, () => ['36', '60', '64', '67'].every(m => document.querySelector('#acKb [data-m="' + m + '"]').classList.contains('ac-gd'))));
await ev(A, () => window.__midi.chord([52])); await W(A, 120); // Mi in the left hand: wrong (the 1 of C is C)
check('main gauche : mauvaise note = erreur, la case attend toujours', (await cells(A, 'L'))[0] === 'cur' && await ev(A, () => document.getElementById('acJust').textContent !== '100 %'));
await ev(A, () => window.__midi.chord([48, 60, 64, 67])); await W(A, 400);
check('basse + accord justes : la mesure 2 (Fa) arrive', await ev(A, () => document.getElementById('acChord').textContent === 'Fa' && /Mesure 2/.test(document.getElementById('acMeas').textContent)));
await ev(A, () => window.__midi.chord([41, 45, 48])); await W(A, 120); // F chord played in the left hand: the right hand must play it
const c2 = await cells(A, 'R');
check('accord joué à la main gauche : refusé (seuil main gauche / main droite)', c2[0] === 'cur', c2);
await ev(A, () => window.__midi.chord([53, 65, 69, 72])); await W(A, 400);
check('Fa juste : mesure 3 (Sol)', await ev(A, () => document.getElementById('acChord').textContent === 'Sol'));
// « Quitter la partie ? » after the first note
await click(A, '#modeNav [data-mode="games"]'); await W(A, 300);
check('« Quitter la partie ? » quand on quitte en pleine partie', await vis(A, 'leaveModal'));
await ev(A, () => window.__midi.noteOn(60)); await W(A, 400);
check('Do seul = continuer (la fenêtre se ferme, la partie reste)', !(await vis(A, 'leaveModal')) && await ev(A, () => document.body.dataset.page === 'acc' && !!document.getElementById('acCells')));
// MIDI unplugged: pause (#mdLost), the notes do nothing
await ev(A, () => window.__midi.remove(0)); await W(A, 500);
check('clavier débranché en partie : pause (#mdLost)', await vis(A, 'mdLost'));
await click(A, '#mdGoScreen'); await W(A, 300);
check('« Continuer sur l’écran » : la partie reprend', !(await vis(A, 'mdLost')) && await ev(A, () => !!document.getElementById('acCells')));
// screen keys: hand = side of the split
await ev(A, () => { const k = m => document.querySelector('#acKb [data-m="' + m + '"]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true })); [55, 67, 71, 74].forEach(k); }); await W(A, 400);
check('clavier écran : Sol à gauche + Sol majeur à droite → mesure 4', await ev(A, () => /Mesure 4/.test(document.getElementById('acMeas').textContent)));
await click(A, '#acEnd'); await W(A, 400);
const S1 = await st(A);
check('Terminer : écran de fin (étoiles, critères, XP)', await ev(A, () => !!document.querySelector('.ac-card .pp-stars') && document.querySelectorAll('.ac-crit li').length === 3) && S1.xp > 500, S1.xp);
check('record enregistré (S.acc.best.ballad1)', !!(S1.acc && S1.acc.best && S1.acc.best.ballad1 && S1.acc.best.ballad1.n === 1), S1.acc);
check('aucune erreur JS (mode attente)', !A.errs.length, A.errs);
await A.ctx.close();

// ---- mode en rythme : compte, timing ±80 / ±160, raté, fausse note, Si seul = rejouer ----
A = await open({ acc: { style: 'ballad', pat: { ballad: 'ballad1' }, prog: 'p145', key: 'C', mode: 'rhythm', bpm: 60, up: false, metro: true } });
await toAcc(A); await click(A, '#acGo'); await W(A, 150);
check('compte « 1, 2, 3, 4 » avant la 1re mesure', await waitFor(A, () => { const c = document.getElementById('acCount'); return c && !c.hidden && c.textContent === '1'; }, 1500)
  && await waitFor(A, () => document.getElementById('acCount').textContent === '3', 3000));
await at(A, 0.02, [48, 60, 64, 67]); // +20 ms: perfect
await untilBeat(A, 1); let r = await cells(A, 'R'), l = await cells(A, 'L'), E = await expect(A, 0);
check('mesure 1 : jouée à +20 ms → vert (parfait) [réel +' + E.d + ' ms]', same(r[0], E) && same(l[0], E) && E.c !== 's3', { r, l, E });
await at(A, 4.12, [53, 65, 69, 72]); // +120 ms: ok (yellow)
await untilBeat(A, 5); r = await cells(A, 'R'); l = await cells(A, 'L'); E = await expect(A, 4);
check('mesure 2 : +120 ms → jaune (un peu tard) [réel +' + E.d + ' ms]', same(r[0], E) && same(l[0], E) && E.c !== 's1', { r, l, E });
await at(A, 8.3, [55, 67, 71, 74]); // +300 ms: missed
await untilBeat(A, 9); r = await cells(A, 'R');
check('mesure 3 : +300 ms → rouge (manquée)', r[0] === 's3', r);
await at(A, 12, [48]); await at(A, 12, [61]); // C bass ok, C# in the right hand: wrong
await untilBeat(A, 13); r = await cells(A, 'R'); l = await cells(A, 'L');
check('mesure 4 : basse juste, fausse note à droite → vert / rouge', l[0] === 's1' && r[0] === 's3', { r, l });
check('justesse et régularité affichées', await ev(A, () => /%/.test(document.getElementById('acJust').textContent) && /%/.test(document.getElementById('acReg').textContent)));
await click(A, '#acEnd'); await W(A, 300);
check('Terminer en rythme : écran de fin', await ev(A, () => !!document.querySelector('.ac-card')));
await ev(A, () => window.__midi.noteOn(71)); await W(A, 300);
check('Si seul sur l’écran de fin = rejouer', await ev(A, () => !!document.getElementById('acCells')));
check('aucune erreur JS (rythme)', !A.errs.length, A.errs);
await A.ctx.close();

// ---- midiLat() élargit la fenêtre ----
A = await open({ lat: 100, acc: { style: 'ballad', pat: { ballad: 'ballad1' }, prog: 'p145', key: 'C', mode: 'rhythm', bpm: 60, up: false, metro: false } });
await toAcc(A); await click(A, '#acGo'); await W(A, 100);
await at(A, 0.15, [48, 60, 64, 67]); await at(A, 4.24, [53, 65, 69, 72]);
await untilBeat(A, 1); r = await cells(A, 'R'); E = await expect(A, 0, 100);
check('midiLat() = 100 ms : +150 ms reste « parfait » (±80 + 100) [réel +' + E.d + ' ms]', same(r[0], E) && E.c !== 's3', { r, E });
await untilBeat(A, 5); r = await cells(A, 'R'); E = await expect(A, 4, 100);
check('midiLat() = 100 ms : +240 ms est « correct » (±160 + 100) [réel +' + E.d + ' ms]', same(r[0], E) && E.c !== 's1', { r, E });
await A.ctx.close();

// ---- progressif : 2 boucles parfaites → +5 bpm ----
A = await open({ lat: 60, acc: { style: 'ballad', pat: { ballad: 'ballad1' }, prog: 'p145', key: 'C', mode: 'rhythm', bpm: 120, up: true, metro: false } }); // midiLat 60: room for a busy test machine
await toAcc(A); await click(A, '#acGo'); await W(A, 100);
const chords = [[48, 60, 64, 67], [53, 65, 69, 72], [55, 67, 71, 74], [48, 60, 64, 67]];
for (let bar = 0; bar < 8; bar++) await at(A, bar * 4 + 0.01, chords[bar % 4]);
await untilBeat(A, 32.5);
check('2 boucles parfaites : le tempo passe à 125 bpm', await ev(A, () => document.getElementById('accPanel').dataset.bpm === '125' && /125/.test(document.getElementById('acBpmChip').textContent)), await ev(A, () => document.getElementById('accPanel').dataset.bpm));
await A.ctx.close();

// ---- micro : mode attente seulement ; clavier 25 touches : seuil ajusté ----
A = await open({ input: 'mic', acc: { mode: 'rhythm' } });
await toAcc(A);
check('micro : « En rythme » désactivé, mode attente', await ev(A, () => document.querySelector('#acModes [data-v=rhythm]').disabled && document.querySelector('#acModes [data-v=wait]').getAttribute('aria-pressed') === 'true'));
await A.ctx.close();
A = await open({ extra: { midi: { hw: { name: 'Fake Keyboard 61', lo: 36, hi: 60 } } }, acc: { mode: 'wait' } });
await toAcc(A); await click(A, '#acGo'); await W(A, 300);
check('clavier Do2–Do4 (S.midi.hw) : séparation déplacée au Do2', await ev(A, () => document.querySelector('#acKb [data-m="47"]').classList.contains('lh') && document.querySelector('#acKb [data-m="48"]').classList.contains('rh') && /Séparation/.test(document.querySelector('.ac-kbl').textContent)));
await A.ctx.close();

// ---- aucun défilement : écran de départ et partie, 5 tailles ----
for (const [w, h] of [[375, 667], [812, 375], [768, 1024], [1024, 768], [1280, 800]]) {
  A = await open({ viewport: { width: w, height: h } });
  await toAcc(A);
  const s1 = await ev(A, () => { const m = document.getElementById('main'); return [document.documentElement.scrollHeight - innerHeight, m.scrollHeight - m.clientHeight]; });
  const go = await ev(A, () => { const r = document.getElementById('acGo').getBoundingClientRect(); return r.bottom <= innerHeight + 1 && r.top >= 0; });
  await click(A, '#acGo'); await W(A, 400);
  const s2 = await ev(A, () => { const m = document.getElementById('main'); const k = document.getElementById('acKb').getBoundingClientRect(); return [document.documentElement.scrollHeight - innerHeight, m.scrollHeight - m.clientHeight, k.bottom <= innerHeight + 1, k.height > 50]; });
  check(`${w}×${h} : pas de défilement (départ ${s1}, partie ${s2.slice(0, 2)}), Jouer et clavier visibles`, s1.every(x => x <= 1) && go && s2[0] <= 1 && s2[1] <= 1 && s2[2] && s2[3], { s1, go, s2 });
  await A.ctx.close();
}

// ---- en anglais ----
A = await open({ extra: { settings: { lang: 'en', notation: 'en', input: 'midi', uiSound: false, earV2: true, diffV2: true, midiV2: true } } });
await toAcc(A);
check('EN : écran de départ en anglais', await ev(A, () => /Accompaniment/.test(document.getElementById('accPanel').textContent) && /Wait mode/.test(document.getElementById('acModes').textContent)));
await A.ctx.close();

await b.close();
console.log(fails.length ? `\n${fails.length} échec(s)` : '\nr31 : tout est bon');
process.exit(fails.length ? 1 : 0);
