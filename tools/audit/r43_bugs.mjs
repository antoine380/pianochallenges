// r43 — chasse aux bugs (25/10/2026) : un test de non-régression par bug corrigé.
// Usage : python3 -m http.server 8891 à la racine, puis PORT=8891 NODE_PATH=… PW_CHROMIUM=… node tools/audit/r43_bugs.mjs
import fs from 'fs';
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = process.env.PORT || '8767', URL = `http://localhost:${PORT}/`;
const LIB = fs.readFileSync(new globalThis.URL('./lib.mjs', import.meta.url), 'utf8');
const INIT = (mode, gum) => `window.__midiMode=${JSON.stringify(mode)}; window.__gumMode=${JSON.stringify(gum)};\n` + /export const INIT = `([\s\S]*?)`;\n/.exec(LIB)[1].split("${'${MODE}'}").join(mode);
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d !== undefined && !ok ? ' — ' + JSON.stringify(d) : '')); if (!ok) fails.push(n); };
const W = (p, ms) => p.waitForTimeout(ms);
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined, args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream'] });
const BASE = (extra = {}) => ({ settings: { lang: 'fr', notation: 'fr', input: 'midi', earV2: true, diffV2: true, midiV2: true, uiSound: false }, langV2: true, gate: 'guest', onb: { done: 1, level: 'mid' }, tourDone: 1,
  introSeen: { chords: 1, scales: 1, harmony: 1, prog: 1, ear: 1, games: 1, daily: 1, section: 1 }, seenTypes: [], stats: {}, secStats: {}, xp: 500, xpDays: {}, streak: { days: 0 }, ...extra });
// opens the app with `state`; p.ev("expr") evaluates inside the app script (internal functions and variables)
async function open(state, { mode = 'ok', gum = 'none', tz, clock, viewport = { width: 1180, height: 820 }, init } = {}) {
  const ctx = await browser.newContext({ viewport, timezoneId: tz, locale: 'fr-FR' });
  if (clock) await ctx.clock.install({ time: clock });
  await ctx.route(u => !/^(localhost|127\.0\.0\.1)$/.test(u.hostname), r => r.abort());
  await ctx.route(u => u.pathname === '/' || u.pathname === '/index.html', async route => {
    const res = await route.fetch(); let html = await res.text(); const end = html.lastIndexOf('})();\n</script>');
    html = html.slice(0, end) + '\nwindow.__ev=s=>eval(s);\n' + html.slice(end);
    await route.fulfill({ response: res, body: html, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await ctx.addInitScript(INIT(mode, gum));
  if (init) await ctx.addInitScript(init);
  if (state) await ctx.addInitScript(v => { try { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('memo-gammes-v1', v); } } catch (e) {} }, JSON.stringify(state));
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/ERR_|Failed to load resource|WebSocket|supabase/.test(m.text())) p.errs.push(m.text()); });
  await p.goto(URL); await W(p, 900);
  p.ev = s => p.evaluate(s => window.__ev ? window.__ev(s) : undefined, s);
  return p;
}

// 1) S.duPend (a rated duel left by closing the app): applied at launch without killing the script (save() → cloudPush before « let sb »)
{ const p = await open(BASE({ duPend: { key: 'memory-chords', o: 900, bot: true, nm: 'Bot', av: 2 } }));
  const r = await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('memo-gammes-v1')); return { pend: 'duPend' in s, elo: s.elo && s.elo['memory-chords'], ev: typeof window.__ev }; });
  check('duPend : le script démarre en entier (pas de ReferenceError)', r.ev === 'function' && !p.errs.some(e => /before initialization/.test(e)), p.errs);
  check('duPend : la défaite est comptée une fois puis oubliée', !r.pend && r.elo && r.elo.n === 1 && r.elo.l === 1, r);
  await p.evaluate(() => document.querySelector('#modeNav [data-mode=learn]').click()); await W(p, 400);
  check('duPend : le menu répond ensuite', await p.ev('page') === 'learn');
  await p.context().close(); }

// 2) goalOpen() remembers it asked (code had fallen into a // comment): the window is not offered after every good game
{ const p = await open(BASE());
  await p.ev('goalOpen()'); await W(p, 300);
  check('objectif : goalOpen() note S.goal.asked', await p.ev('!!(S.goal&&S.goal.asked)'), await p.ev('S.goal'));
  // 3) ppRenderResume(): nothing to resume → no TypeError on the home page
  await p.ev('S.pp={}; S.resume=null; openPage("hub")'); await W(p, 300);
  await p.ev('S.pp={on:true,start:1,done:{}}; S.resume={kind:"pp",id:"zz",step:2,at:Date.now()}; renderHubSide()'); await W(p, 200);
  check('premiers pas : accueil sans erreur quand il n’y a rien à reprendre', !p.errs.some(e => /reading 'step'|ppRenderResume/.test(e)), p.errs);
  await p.context().close(); }

// 4) weekly recap: a lesson finished on Sunday 25/10/2026 at 23:30 (Paris, 25-hour day) belongs to the week of the 19th
{ const at = new Date('2026-10-25T23:30:00+01:00').getTime();
  const p = await open(BASE({ pp: { on: true, start: at - 864e5, done: { p01: { at, stars: 3 } } }, xpDays: { '2026-10-25': 40 } }), { tz: 'Europe/Paris', clock: new Date('2026-10-26T09:00:00+01:00') });
  const d = await p.ev('wkData("2026-10-19")');
  check('bilan de la semaine : leçon du dimanche 23 h 30 (heure d’hiver) comptée', d && d.les === 1, d);
  await p.context().close(); }

// 5) microphone: two quick taps while the permission prompt is open → one stream and one detection timer
{ const p = await open(BASE({ settings: { lang: 'fr', notation: 'fr', input: 'screen', uiSound: false } }), { gum: 'osc', init: `(()=>{ const g=navigator.mediaDevices.getUserMedia; window.__gum=0; navigator.mediaDevices.getUserMedia=async function(){ window.__gum++; await new Promise(r=>setTimeout(r,400)); return g.apply(this,arguments); }; })();` });
  await p.evaluate(() => { const b = document.getElementById('micBtn'); b.click(); b.click(); }); await W(p, 900);
  const r = await p.evaluate(() => ({ gum: window.__gum }));
  check('micro : deux appuis rapides = un seul flux (une seule détection)', r.gum === 1 && await p.ev('micOn'), r);
  const tm = await p.ev('micTimer');
  await p.evaluate(() => document.getElementById('micBtn').click()); await W(p, 200);
  check('micro : couper arrête la détection', !(await p.ev('micOn')) && !(await p.evaluate(tm => window.__cnt.intervals.has(tm), tm)));
  await p.context().close(); }

// 6) the app in the background: a solo game waits (Contre la montre keeps its time), a timed LEARN round too
{ const p = await open(BASE());
  const hide = h => p.evaluate(h => { Object.defineProperty(document, 'visibilityState', { value: h ? 'hidden' : 'visible', configurable: true }); Object.defineProperty(document, 'hidden', { value: h, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }, h);
  await p.ev('openPage("games"); gameOpen("speed")'); await W(p, 600);
  await p.evaluate(() => document.querySelector('#duModes [data-m=solo]').click()); await W(p, 500);
  await p.evaluate(() => { window.__midi.noteOn(60); setTimeout(() => window.__midi.noteOff(60), 50); }); await W(p, 1200);
  const l0 = await p.ev('SP.state==="run" ? (SP.end-performance.now())/1000 : -1');
  await hide(true); await W(p, 2500); await hide(false); await W(p, 100);
  const l1 = await p.ev('(SP.end-performance.now())/1000');
  check('arrière-plan : Contre la montre garde son temps', l0 > 0 && l0 - l1 < 0.8, { l0, l1 });
  check('arrière-plan : la partie reprend (pas de pause restée)', !(await p.ev('HOLD')));
  await p.ev('S.settings.delay=8; openPage("learn")'); await W(p, 400);
  await p.evaluate(() => document.querySelector('#learnTiles .ptile').click()); await W(p, 500);
  await p.ev('suState("chords").timer=true; try{ S.settings.su.chords.timed=true }catch(e){}'); await p.evaluate(() => document.getElementById('suGo').click()); await W(p, 900);
  const d0 = await p.ev('deadline ? deadline-performance.now() : null');
  if (d0 != null) { await hide(true); await W(p, 2500); await hide(false); await W(p, 150);
    const d1 = await p.ev('deadline-performance.now()');
    check('arrière-plan : le chrono LEARN attend', d0 - d1 < 900 && await p.ev('phase') === 'listening', { d0, d1 }); }
  else console.log('     (chrono LEARN non activé dans cet état : vérification sautée)');
  check('arrière-plan : aucune erreur', !p.errs.length, p.errs);
  await p.context().close(); }

await browser.close();
console.log(fails.length ? `\n${fails.length} échec(s)` : '\nTous les tests r43 passent.');
process.exit(fails.length ? 1 : 0);
