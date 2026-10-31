// Chantier AUDIO PARFAIT (31/10/2026) — garde audio bloquante à chaque mise en ligne (CI dev → main, et la nuit).
// (a) Rendu hors ligne (OfflineAudioContext, vrai code de l'app) de chaque instrument du mode PIANO et des sons de l'app tone() sur des
//     scénarios durs : notes répétées rapides, même note rejouée, accords forts, pédale, plus de voix que le plafond, changement
//     d'instrument et d'effets en jouant, réverbération/chorus/écho au maximum, volume max → 0 discontinuité (__pnClicks), crête ≤ 1,
//     pas de composante continue ; témoin positif (une coupure franche est bien détectée) ; coût de calcul du graphe rapporté à une
//     référence mesurée dans la même exécution (28 sinus) : aucun instrument ne doit redevenir un gouffre (le synthé doux coûtait ~80×).
// (b) Temps réel simulé (Chromium, son réel dans un contexte « interactive ») : ~2 min de notes MIDI simulées (10 évènements/s,
//     accords de 4, pédale) avec effets visuels : PIANO piano à queue + cascade, feux d'artifice, synthé doux, exercice LEARN (son des
//     notes MIDI = tone()), jeu Saute-notes ; mesures : charge du fil audio (CDP WebAudio.getRealtimeData.renderCapacity), trous de
//     sortie (AudioContext.playoutStats, fonction activée par drapeau), tâches longues du fil principal (PerformanceObserver), délai
//     note MIDI → départ du son (JS) ; un seul AudioContext dans toute l'app, lecteur Play compris.
// (c) Fuites : nœuds audio vivants (CDP audioNodeCreated / audioNodeWillBeDestroyed après ramasse-miettes) avant / après 500 notes,
//     au mode PIANO et dans un exercice ; PN.all / AU.live vides.
// Seuils (calibrés sur un conteneur 2 cœurs et pensés pour un runner GitHub lent ; la CI relance le test une fois s'il échoue) :
//   charge audio p95 ≤ 0,6 · trous de sortie ≤ 2 % du temps · tâche longue ≤ 300 ms et ≤ 6 % du temps · délai JS p95 ≤ 8 ms ·
//   coût hors ligne ≤ 30 × la référence · nœuds après ≤ avant + 4.
// Usage : PORT=8980 NODE_PATH=… PW_CHROMIUM=… node tools/audit/r55_audio.mjs   (R55_SEC=30 pour un temps réel plus court en local)
import { createRequire } from 'module';
import { INIT } from './lib.mjs';
import { PN_OFFLINE } from './pn_offline.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = process.env.PORT || '8767', URL = `http://localhost:${PORT}/`, TOTAL = +(process.env.R55_SEC || 120);
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d !== undefined ? ' — ' + JSON.stringify(d).slice(0, 500) : '')); if (!ok) fails.push(n); };
const b = await chromium.launch({ ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--autoplay-policy=no-user-gesture-required', '--enable-blink-features=AudioContextPlayoutStats'] });
const STATE = (piano = {}) => ({ xp: 900, gate: 'account', onb: { done: 1 }, tourDone: 1, langV2: true, pwShown: 1,
  introSeen: { scales: 1, chords: 1, harmony: 1, prog: 1, ear: 1, games: 1, daily: 1 }, midi: { later: Date.now() }, goal: { kind: 'min', v: 10, asked: 1, at: 1 }, srFrom: '2000-01-01', srShown: '2999-01-01',
  settings: { sc1Tour: 1, lang: 'fr', notation: 'fr', input: 'midi', uiSound: false, octave: true, autoNext: true, delay: 0, midiSound: true, piano: { ins: 'grand', rev: .3, dly: 0, cho: .15, vol: .8, snd: true, viz: {}, ...piano } } });
async function open(st = STATE()) {
  const c = await b.newContext({ viewport: { width: 1024, height: 768 } });
  await c.addInitScript(`window.__midiMode="ok";`); await c.addInitScript(INIT.replace('${MODE}', 'ok'));
  await c.addInitScript(() => { window.__lt = []; try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt.push([e.startTime, e.duration]))).observe({ type: 'longtask' }); } catch (e) {}
    window.__lat = []; window.__pend = 0; [AudioScheduledSourceNode.prototype, AudioBufferSourceNode.prototype].forEach(P => { const ss = P.start;
      P.start = function () { if (window.__pend) { window.__lat.push(performance.now() - window.__pend); window.__pend = 0; } return ss.apply(this, arguments); }; }); });
  await c.route(u => u.href.startsWith(URL) && (u.pathname === '/' || u.pathname === '/index.html'), async r => { const res = await r.fetch(); let h = await res.text(); const e = h.lastIndexOf('})();\n</script>'); h = h.slice(0, e) + '\nwindow.__X=s=>eval(s);\n' + h.slice(e); await r.fulfill({ response: res, body: h, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await c.route('https://ijdxeasxmgevuchyuenn.supabase.co/**', r => r.abort());
  const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/net::ERR|Failed to load resource/.test(m.text())) p.errs.push(m.text()); });
  const cdp = await c.newCDPSession(p); await cdp.send('WebAudio.enable'); await cdp.send('HeapProfiler.enable');
  p.ctxs = []; p.live = new Map(); cdp.on('WebAudio.contextCreated', e => p.ctxs.push(e.context)); p.made = 0; cdp.on('WebAudio.audioNodeCreated', e => { p.made++; p.live.set(e.node.nodeId, [e.node.nodeType, e.node.contextId]); }); cdp.on('WebAudio.audioNodeWillBeDestroyed', e => p.live.delete(e.nodeId));
  p.cdp = cdp;
  await p.addInitScript(`if(!sessionStorage.getItem('s')){ sessionStorage.setItem('s','1'); localStorage.setItem('memo-gammes-v1', ${JSON.stringify(JSON.stringify(st))}); }`);
  await p.goto(URL); await p.waitForFunction(() => !!window.__X, null, { timeout: 15000 }); await p.waitForTimeout(1300);
  p.X = s => p.evaluate(s => window.__X(s), s); return p;
}
const W = (p, ms) => p.waitForTimeout(ms);
const gc = async p => { for (let i = 0; i < 2; i++) { await p.cdp.send('HeapProfiler.collectGarbage'); await W(p, 700); } };
// nodes of the realtime context(s) only (the offline renders of the test have their own)
const rtIds = p => new Set(p.ctxs.filter(x => x.contextType === 'realtime').map(x => x.contextId));
const nodes = p => { const ids = rtIds(p); let n = 0; p.live.forEach(v => { if (ids.has(v[1])) n++; }); return n; };
const types = p => { const ids = rtIds(p), o = {}; p.live.forEach(v => { if (ids.has(v[1])) o[v[0]] = (o[v[0]] || 0) + 1; }); return o; };
// « Quitter la partie ? » may ask first: leave
const mode = async (p, m) => { await p.evaluate(m => document.querySelector(`#modeNav [data-mode=${m}]`).click(), m); await W(p, 300);
  if (await p.isVisible('#leaveModal')) { await p.click('#lvGo'); await W(p, 300); if (!(await p.evaluate(m => document.body.dataset.page, m)).startsWith(m === 'play' ? 'free' : m)) await p.evaluate(m => document.querySelector(`#modeNav [data-mode=${m}]`).click(), m); } };
async function toPiano(p) { await mode(p, 'piano'); await W(p, 500); await p.X('pnSmpLoad()'); await p.waitForFunction(() => window.__X('PN_SMP.st') === 2, null, { timeout: 30000 }); }
async function toExercise(p) { await mode(p, 'learn'); await W(p, 400); await p.evaluate(() => document.querySelectorAll('#learnTiles .ptile')[0].click()); await W(p, 500); await p.click('#suGo'); await W(p, 800); }
async function toGame(p) { await mode(p, 'games'); await W(p, 400); await p.evaluate(() => document.querySelectorAll('#gameCards .ptile')[0].click()); await W(p, 600); await p.click('#duModes [data-m=solo]').catch(() => {}); await W(p, 800); }
// sustained playing: 10 events/s, a 4-note chord every 3rd, pedal down/up every 2 s, every note released after 150 ms; pedal up at the end
const play = (p, sec) => p.evaluate(sec => new Promise(res => { const ch = [[48, 55, 60, 64], [53, 57, 60, 65], [43, 50, 55, 59]]; let i = 0; const t0 = performance.now();
  const tick = () => { if (performance.now() - t0 > sec * 1000) { window.__midi.send(0, [0xB0, 64, 0]); setTimeout(res, 300); return; } const k = i++;
    if (k % 20 === 0) window.__midi.send(0, [0xB0, 64, 127]); if (k % 20 === 12) window.__midi.send(0, [0xB0, 64, 0]);
    const ns = k % 3 === 0 ? ch[(k / 3 | 0) % 3] : [60 + ((k * 7) % 24)]; window.__pend = performance.now(); ns.forEach(n => window.__midi.noteOn(n, 70 + (k % 50)));
    setTimeout(() => ns.forEach(n => window.__midi.noteOff(n)), 150); setTimeout(tick, 100); }; tick(); }), sec);
// realtime measurement of one segment
async function segment(p, name, sec) {
  const rid = () => p.ctxs.filter(x => x.contextType === 'realtime').map(x => x.contextId);
  const ps0 = await p.evaluate(() => { const c = window.__cnt.acCtx[0]; return c && c.playoutStats ? { fb: c.playoutStats.fallbackFramesDuration, n: c.playoutStats.fallbackFramesEvents } : null; });
  await p.evaluate(() => { window.__lt.length = 0; window.__lat.length = 0; }); const w0 = Date.now();
  const rc = []; const pr = play(p, sec); let done = false; pr.then(() => { done = true; });
  while (!done) { await W(p, 500); for (const id of rid()) { try { const r = await p.cdp.send('WebAudio.getRealtimeData', { contextId: id }); rc.push(r.realtimeData.renderCapacity); } catch (e) {} } }
  const wall = (Date.now() - w0) / 1000;
  const r = await p.evaluate(() => { const L = window.__lat.slice().sort((a, b) => a - b), q = (a, f) => a.length ? a[Math.min(a.length - 1, Math.floor(a.length * f))] : 0, c = window.__cnt.acCtx[0];
    return { lt: window.__lt.map(x => x[1]), lat95: +q(L, .95).toFixed(2), lat50: +q(L, .5).toFixed(2), latN: L.length, ps: c && c.playoutStats ? { fb: c.playoutStats.fallbackFramesDuration, n: c.playoutStats.fallbackFramesEvents } : null, base: c ? c.baseLatency : null }; });
  rc.sort((a, b) => a - b); const rc95 = rc.length ? rc[Math.min(rc.length - 1, Math.floor(rc.length * .95))] : 0;
  const fbMs = r.ps && ps0 ? r.ps.fb - ps0.fb : 0, ltMax = Math.max(0, ...r.lt), ltSum = r.lt.reduce((a, x) => a + x, 0);
  const m = { sec: +wall.toFixed(1), rc50: +(rc[rc.length >> 1] || 0).toFixed(3), rc95: +rc95.toFixed(3), fbMs, fbN: r.ps && ps0 ? r.ps.n - ps0.n : null, lt: r.lt.length, ltMax: Math.round(ltMax), ltPct: +(ltSum / wall / 10).toFixed(2), lat50: r.lat50, lat95: r.lat95, notes: r.latN };
  check(`temps réel « ${name} » : charge audio p95 ≤ 0,6, trous ≤ 2 %, tâches longues ≤ 300 ms et ≤ 6 %, délai note → son p95 ≤ 8 ms`,
    rc.length > 3 && rc95 <= .6 && fbMs <= wall * 1000 * .02 && ltMax <= 300 && ltSum <= wall * 1000 * .06 && r.lat95 <= 8 && r.latN > sec * 5, m);
  return m;
}

// ---------------- (a) hors ligne ----------------
let p = await open();
await toPiano(p);
await p.evaluate(s => window.__X(s), PN_OFFLINE);
// tone() rendered offline through its real output stage (AU.off = offline context, see 887-audio-parfait.js)
await p.X(`window.__auToneR = async (ev, dur) => { const oc = new OfflineAudioContext(2, Math.round(48000 * dur), 48000); AU.off = oc; AU.offM = oc.createGain(); AU.offM.gain.value = .55; auKctx(oc); AU.offT = auTail(oc, AU.offM); AU.tones = [];
  const by = new Map(); ev.forEach(e => { const q = Math.round(e.t * 48000 / 128) * 128 / 48000; if (!by.has(q)) by.set(q, []); by.get(q).push(e); });
  [...by.keys()].forEach(q => { const run = () => by.get(q).forEach(e => tone(e.m, 0, e.d || .9, .1 + .26 * e.v / 127)); if (q <= 0) run(); else oc.suspend(q).then(() => { run(); oc.resume(); }); });
  try { return await oc.startRendering(); } finally { AU.off = null; AU.offM = null; AU.offT = null; AU.tones = []; } };`);
const OFF = await p.evaluate(async () => { const R = {}, INS = ['grand', 'epiano', 'organ', 'pad', 'lead', 'mallet', 'musicbox'], sc = []; let t = .05;
  for (let i = 0; i < 10; i++) { sc.push({ t, on: 60, v: .9 }, { t: t + .04, off: 60 }); t += .06; }                                         // notes répétées rapides
  t += .1; for (let i = 0; i < 6; i++) { sc.push({ t, on: 62, v: 1 }); t += .045; } sc.push({ t, off: 62 });                                   // même note rejouée sans relâcher
  t += .1; [36, 43, 48, 52, 55, 60, 64, 67, 72, 76].forEach(m => sc.push({ t, on: m, v: 1 }, { t: t + .7, off: m })); t += .9;               // accord fort à deux mains
  sc.push({ t, ped: 1 }); [60, 62, 64, 65, 67, 69, 71, 72].forEach((m, i) => sc.push({ t: t + i * .05, on: m, v: .85 }, { t: t + i * .05 + .04, off: m })); t += .6; sc.push({ t, ped: 0 }); t += .2; // pédale
  for (let i = 0; i < 16; i++) { const m = i % 2 ? 74 : 72; sc.push({ t, on: m, v: .7 }, { t: t + .03, off: m }); t += .035; }                // trille
  for (let i = 0; i < 44; i++) sc.push({ t: t + .1 + i * .008, on: 30 + i, v: .7 }); t += .6;                                                 // 44 voix : au-delà de tous les plafonds
  sc.push({ t, fx: 1 }); for (let i = 0; i < 6; i++) sc.push({ t: t + .05 + i * .07, on: 60 + i * 2, v: .9 }, { t: t + .3 + i * .07, off: 60 + i * 2 }); t += .8; // effets changés en jouant
  for (let i = 0; i < 44; i++) sc.push({ t: t + .2, off: 30 + i });
  const dc = b => { let s = 0, n = 0; for (let c = 0; c < b.numberOfChannels; c++) { const x = b.getChannelData(c); for (let i = 0; i < x.length; i++) s += x[i]; n += x.length; } return Math.abs(s / n); };
  R.ins = {}; for (const ins of INS) { const { b } = await __pnRender(ins, sc, { dur: t + 3, rev: .5, cho: .4, dly: .3, vol: 1 }); R.ins[ins] = { cl: __pnClicks(b).slice(0, 3), pk: +__pnPeak(b).toFixed(3), dc: +dc(b).toFixed(4) }; }
  { const ch = [{ t: 0, on: 48, v: 1 }, { t: .3, ins: 'organ' }, { t: .35, on: 60, v: .8 }, { t: .6, ins: 'pad' }, { t: .65, on: 64, v: .8 }, { t: .9, off: 64 }, { t: 1, ins: 'lead' }, { t: 1.05, on: 67, v: 1 }, { t: 1.3, ins: 'grand' }, { t: 1.35, on: 72, v: 1 }, { t: 1.6, off: 72 }];
    const { b } = await __pnRender('grand', ch, { dur: 3.5, rev: .3, cho: .15, vol: 1 }); R.chg = { cl: __pnClicks(b).slice(0, 3), pk: +__pnPeak(b).toFixed(3) }; }
  { const { b } = await __pnRender('grand', [{ t: 0, on: 60, v: 1 }, { t: .3, cut: 1 }], { dur: .6 }); R.ctrl = __pnClicks(b).length; }
  // tone(): the app's sounds, through their real output stage, on an offline context
  const toneR = window.__auToneR;
  const tv = []; let u = .02;
  for (let k = 0; k < 30; k++) { [48, 55, 60, 64, 67, 72].forEach(m => tv.push({ t: u, m: m + (k % 3) * 2, v: 127 })); u += .1; }               // accords de 6 notes, 10 par seconde
  for (let k = 0; k < 40; k++) { tv.push({ t: u, m: 60 + (k * 5) % 24, v: 110 }); u += .04; }                                                   // 25 notes/s
  [36, 40, 43, 48, 52, 55, 60, 64, 67, 72].forEach(m => tv.push({ t: u + .1, m, v: 127 }));                                                     // 10 notes ensemble
  { const bb = await toneR(tv, u + 1.6); R.tone = { cl: __pnClicks(bb).slice(0, 3), pk: +__pnPeak(bb).toFixed(3), dc: +dc(bb).toFixed(4) }; }
  // CPU: offline render time of the heavy scenario, relative to 28 sines rendered in the same run
  const ref = async () => { const oc = new OfflineAudioContext(2, 48000 * 6, 48000); for (let v = 0; v < 28; v++) { const o = oc.createOscillator(), g = oc.createGain(); g.gain.value = .02; o.frequency.value = 110 * Math.pow(2, v / 12); o.connect(g); g.connect(oc.destination); o.start(); } const t0 = performance.now(); await oc.startRendering(); return (performance.now() - t0) / 6; };
  const heavy = []; for (let k = 0; k < 60; k++) { const ns = k % 3 === 0 ? [48, 55, 60, 64].map(m => m + (k % 5)) : [60 + (k * 7) % 24]; ns.forEach(m => heavy.push({ t: .05 + k * .1, on: m, v: .8 }, { t: .2 + k * .1, off: m })); if (k % 20 === 0) heavy.push({ t: .05 + k * .1, ped: 1 }); if (k % 20 === 12) heavy.push({ t: .05 + k * .1, ped: 0 }); }
  const r0 = Math.min(await ref(), await ref()); R.cost = {};
  for (const ins of INS) { const t0 = performance.now(); await __pnRender(ins, heavy, { dur: 6.6, rev: .3, cho: .15 }); R.cost[ins] = +(((performance.now() - t0) / 6.6) / r0).toFixed(1); }
  return R; });
for (const [ins, r] of Object.entries(OFF.ins)) check(`hors ligne ${ins} (rapide, accords, pédale, 44 voix, effets au max, volume max) : 0 claquement, crête ≤ 1, pas de continu`, !r.cl.length && r.pk <= 1 && r.pk > .05 && r.dc < .01, r);
check('hors ligne : changer d’instrument en jouant (piano → orgue → synthé doux → lead → piano) : 0 claquement, crête ≤ 1', !OFF.chg.cl.length && OFF.chg.pk <= 1, OFF.chg);
check('témoin positif : une coupure franche est détectée', OFF.ctrl >= 1, OFF.ctrl);
check('hors ligne sons de l’app tone() (accords de 6 à 10/s, 25 notes/s, 10 notes ensemble) : 0 claquement, crête ≤ 1, pas de continu', !OFF.tone.cl.length && OFF.tone.pk <= 1 && OFF.tone.pk > .1 && OFF.tone.dc < .01, OFF.tone);
check('coût de calcul hors ligne de chaque instrument ≤ 30 × la référence (28 sinus)', Object.values(OFF.cost).every(x => x <= 30), OFF.cost);
check('aucune erreur JS (hors ligne)', !p.errs.length, p.errs);

// ---------------- (c) fuites de nœuds : 500 notes au mode PIANO ----------------
await p.X('pnAllOff()'); await W(p, 1500); await gc(p); const n0 = nodes(p), ty0 = types(p);
await p.evaluate(() => new Promise(res => { let k = 0; const go = () => { if (k >= 500) { window.__midi.send(0, [0xB0, 64, 0]); return res(); }
  const n = 36 + (k * 7) % 48; if (k % 50 === 0) window.__midi.send(0, [0xB0, 64, 127]); if (k % 50 === 30) window.__midi.send(0, [0xB0, 64, 0]);
  window.__midi.noteOn(n, 60 + k % 60); setTimeout(() => window.__midi.noteOff(n), 60); k++; setTimeout(go, 12); }; go(); }));
await W(p, 8000); await gc(p); const n1 = nodes(p);
const pst = JSON.parse(await p.X('JSON.stringify({all:PN.all.length, live:AU.live.size, on:PN.on.size})'));
check('PIANO : 500 notes puis silence → nœuds audio vivants revenus au départ (≤ +4), PN.all / AU.live / PN.on vides', n1 <= n0 + 4 && !pst.all && !pst.live && !pst.on, { n0, n1, ...pst, ty0, ty1: types(p) });
await p.context().close();

// ---------------- (b) temps réel simulé, ~2 min ----------------
const S = TOTAL / 120, segs = [];
p = await open(); await toPiano(p); await p.X('audio()'); await W(p, 400);
segs.push(await segment(p, 'PIANO piano à queue + cascade de lumière', Math.round(40 * S)));
await p.click('.pn-v[data-viz=fireworks]'); await W(p, 300);
segs.push(await segment(p, 'PIANO piano à queue + feux d’artifice', Math.round(20 * S)));
await p.click('.pn-i[data-ins=pad]'); await W(p, 300);
segs.push(await segment(p, 'PIANO synthé doux + aurore', Math.round(20 * S)));
await p.click('.pn-i[data-ins=grand]'); await W(p, 300);
await toExercise(p); segs.push(await segment(p, 'exercice LEARN (son des notes MIDI)', Math.round(20 * S)));
await toGame(p); segs.push(await segment(p, 'jeu Saute-notes', Math.round(20 * S)));
// the Play frame plays on the app's context: still one realtime AudioContext
await mode(p, 'play'); await W(p, 500); await p.X('openPlayWith("#song=lune")'); await W(p, 2500); const m0 = p.made;
await p.evaluate(() => [60, 64, 67].forEach(n => window.__midi.noteOn(n, 90))); await W(p, 300); await p.evaluate(() => [60, 64, 67].forEach(n => window.__midi.noteOff(n)));
const fr = p.frames().find(f => /play\/index\.html/.test(f.url()));
if (fr) await fr.evaluate(() => { try { document.querySelector('#kbd .key')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); } catch (e) {} });
await W(p, 800); const playMade = p.made - m0;
const rt = p.ctxs.filter(x => x.contextType === 'realtime');
check('un seul AudioContext pour toute l’app (sons de l’app, mode PIANO, lecteur Play en iframe)', rt.length === 1 && !!fr && playMade > 0, { realtime: rt.length, frame: !!fr, playMade });
check('aucune erreur JS (temps réel)', !p.errs.length, p.errs.slice(0, 5));
console.log('mesures temps réel :', JSON.stringify(segs));
await p.context().close();

// ---------------- (c) fuites : 500 sons tone() dans un exercice ----------------
p = await open(); await toExercise(p); await p.X('audio()'); await W(p, 500); await gc(p); const e0 = nodes(p);
await p.evaluate(() => new Promise(res => { let k = 0; const go = () => { if (k >= 500) return res(); const n = 48 + (k * 5) % 36; window.__midi.noteOn(n, 90); setTimeout(() => window.__midi.noteOff(n), 40); k++; setTimeout(go, 10); }; go(); }));
await W(p, 3000); await gc(p); const e1 = nodes(p);
check('exercice : 500 sons de l’app puis silence → nœuds audio vivants revenus au départ (≤ +4)', e1 <= e0 + 4, { e0, e1, ty: types(p) });
check('aucune erreur JS (exercice)', !p.errs.length, p.errs.slice(0, 5));
await p.context().close();

await b.close();
console.log(fails.length ? `\nr55 : ${fails.length} échec(s)` : '\nr55 OK');
process.exit(fails.length ? 1 : 0);
