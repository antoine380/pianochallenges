// Chantier MODE PIANO : 5e mode du menu « PIANO » (#modeNav [data-mode=piano], juste sous QUIZ, couleur --m-piano) → page "piano"
// (#pianoPanel + scène lumineuse #pnScene/#pnViz dans #stage, au-dessus du clavier). Vérifie : le mode dans le menu (et le menu mobile),
// le contraste du texte blanc, la page sans défilement aux 5 tailles (clair et sombre), 7 instruments et 6 ambiances, choix mémorisés
// dans S.settings.piano (et restaurés au rechargement, état ancien / abîmé complété), ambiance par défaut de chaque instrument,
// notes MIDI simulées → voix de l'instrument créée et particules dessinées sur le canvas (même si « Son des notes MIDI » est coupé
// ailleurs), « Son de l'app » coupé = pas de son pour le MIDI mais les touches de l'écran sonnent, pédale CC64 et bouton Sustain,
// curseurs d'effets, prefers-reduced-motion (version calme : halos seulement), PLAY › « Piano libre » mène ici, étape du tutoriel,
// sortie de page = sons et lumières arrêtés ; Gammes une à une : sur la liste, une note MIDI sonne (son de l'app) et un Do seul lance
// la gamme même sans S.settings.midiC ; aucune erreur JS.
// Sons du piano (chantier sons) : échantillons Salamander chargés une fois à l'ouverture (30 MP3 de assets/audio/piano, dans le manifeste
// de l'app), piano à queue joué par AudioBufferSourceNode, repli sur la synthèse si les fichiers manquent, crédits ; rendu hors ligne
// (OfflineAudioContext, outils pn_offline.mjs) de scénarios rapides par instrument : aucun claquement (saut d'échantillon), témoin
// positif détecté, crête ≤ 1 (écrêtage doux), attaque du piano < 4 ms, 7 instruments distincts (harmoniques + enveloppe), synthé doux ≠ orgue.
// Usage : PORT=8920 NODE_PATH=… PW_CHROMIUM=… node tools/audit/r48_piano.mjs   (CAP=dossier pour des captures)
import { createRequire } from 'module';
import fs from 'fs';
import { INIT } from './lib.mjs';
import { PN_OFFLINE } from './pn_offline.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = process.env.PORT || '8767', URL = `http://localhost:${PORT}/`, CAP = process.env.CAP || '';
if (CAP) fs.mkdirSync(CAP, { recursive: true });
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d !== undefined && !ok ? ' — ' + JSON.stringify(d).slice(0, 400) : '')); if (!ok) fails.push(n); };
const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const STATE = (o = {}) => ({ xp: 900, gate: 'account', onb: { done: 1 }, tourDone: 1, langV2: true, pwShown: 1,
  introSeen: { scales: 1, chords: 1, harmony: 1, prog: 1, ear: 1, games: 1, daily: 1 }, midi: { later: Date.now() }, goal: { kind: 'min', v: 10, asked: 1, at: 1 },
  settings: { lang: o.lang || 'fr', notation: o.lang || 'fr', input: 'midi', uiSound: false, octave: true, autoNext: true, delay: 0, ...(o.set || {}) } });
async function open({ vp = { width: 1024, height: 768 }, st = STATE(), scheme = 'light', reduce = 'no-preference' } = {}) {
  const c = await b.newContext({ viewport: vp, hasTouch: vp.width < 900, colorScheme: scheme, reducedMotion: reduce });
  await c.addInitScript(`window.__midiMode="ok";`); await c.addInitScript(INIT.replace('${MODE}', 'ok'));
  await c.route(u => u.href.startsWith(URL) && (u.pathname === '/' || u.pathname === '/index.html'), async r => { const res = await r.fetch(); let h = await res.text(); const e = h.lastIndexOf('})();\n</script>'); h = h.slice(0, e) + '\nwindow.__X=s=>eval(s);\n' + h.slice(e); await r.fulfill({ response: res, body: h, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await c.route('https://ijdxeasxmgevuchyuenn.supabase.co/**', r => r.abort());
  const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/net::ERR|Failed to load resource/.test(m.text())) p.errs.push(m.text()); });
  await p.addInitScript(`if(!sessionStorage.getItem('s')){ sessionStorage.setItem('s','1'); localStorage.setItem('memo-gammes-v1', ${JSON.stringify(JSON.stringify(st))}); }`);
  await p.goto(URL); await p.waitForFunction(() => !!window.__X, null, { timeout: 15000 }); await p.waitForTimeout(1300);
  p.X = s => p.evaluate(s => window.__X(s), s); return p;
}
const W = (p, ms) => p.waitForTimeout(ms);
const ev = (p, f, a) => p.evaluate(f, a);
const toPiano = async p => { if (await p.isVisible('#menuBtn')) { await p.click('#menuBtn'); await W(p, 300); } await ev(p, () => document.querySelector('#modeNav [data-mode=piano]').click()); await W(p, 600); };
const noScroll = p => ev(p, () => { const d = document.scrollingElement, m = document.getElementById('main'); return d.scrollHeight - d.clientHeight <= 1 && d.scrollWidth - d.clientWidth <= 1 && m.scrollHeight - m.clientHeight <= 1; });
const stored = p => ev(p, () => JSON.parse(localStorage.getItem('memo-gammes-v1')));
const lit = p => ev(p, () => { const c = document.getElementById('pnViz'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 16) if (d[i] > 8) n++; return n; });
const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4)); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
const contrast = h => 1.05 / (lum(h) + .05);

// 1) le menu : 5 modes, PIANO juste sous QUIZ, couleur lisible
let p = await open();
const nav = await ev(p, () => ({ modes: [...document.querySelectorAll('#modeNav [data-mode]')].map(b => b.dataset.mode), sub: document.querySelector('#modeNav [data-mode=piano] small').textContent,
  col: getComputedStyle(document.documentElement).getPropertyValue('--m-piano').trim() }));
check('menu : GAMES PLAY LEARN QUIZ PIANO (PIANO juste sous QUIZ), sous-titre rempli', nav.modes.join(' ') === 'games play learn quiz piano' && nav.sub === 'Instruments et effets', nav);
check('couleur --m-piano : texte blanc ≥ 4,5:1', /^#[0-9a-f]{6}$/i.test(nav.col) && contrast(nav.col) >= 4.5, { col: nav.col, c: nav.col && contrast(nav.col) });
const insCols = await p.X('PN_INS.map(i=>i.col)');
check('couleurs des 7 instruments : texte blanc ≥ 4,5:1', insCols.length === 7 && insCols.every(c => contrast(c) >= 4.5), insCols.map(c => [c, contrast(c).toFixed(2)]));
const tour = await p.X('tourSteps().map(s=>s[1]).join(" ")');
check('tutoriel guidé : une bulle PIANO juste après QUIZ, textes FR/EN', /quiz piano/.test(tour) && await p.X('!!(TXT.fr.tourT.piano && TXT.en.tourT.piano)'), tour);

// 2) la page
await toPiano(p);
const pg = await ev(p, () => ({ page: document.body.dataset.page, cur: document.querySelector('#modeNav [data-mode=piano]').getAttribute('aria-current'), ins: document.querySelectorAll('.pn-i').length, viz: document.querySelectorAll('.pn-v').length,
  sel: document.querySelector('.pn-i[aria-checked="true"]')?.dataset.ins, vsel: document.querySelector('.pn-v[aria-checked="true"]')?.dataset.viz, canvas: document.getElementById('pnViz').width > 0, kb: document.getElementById('kbd').getBoundingClientRect().height,
  snd: document.getElementById('pnSnd').getAttribute('aria-pressed'), cap: document.getElementById('pnCap').classList.contains('on') }));
check('page piano : menu sélectionné, 7 instruments, 6 ambiances, Piano à queue + Cascade par défaut, canvas dimensionné, clavier visible, « Son de l’app » activé',
  pg.page === 'piano' && pg.cur === 'page' && pg.ins === 7 && pg.viz === 6 && pg.sel === 'grand' && pg.vsel === 'cascade' && pg.canvas && pg.kb > 80 && pg.snd === 'true' && pg.cap, pg);
check('état ancien sans S.settings.piano : rien n’est écrit tant qu’on ne change rien, pnCfg() complète', !(await stored(p)).settings.piano && await p.X('pnCfg().ins==="grand" && pnCfg().snd===true && pnCfg().rev===.3'));

// 3) notes MIDI → son de l'instrument puis lumière ; même avec « Son des notes MIDI » coupé ailleurs
await p.X('S.settings.midiSound=false; window.__tc=0; { const o=tone; tone=function(){ window.__tc++; return o.apply(this,arguments); }; }');
const n0 = await p.X('PN.n'), d0 = await p.X('VZ.drawn');
for (const ch of [[60, 64, 67], [62], [65, 69, 72]]) { await ev(p, ch => ch.forEach(n => window.__midi.noteOn(n, 100)), ch); await W(p, 120); await ev(p, ch => ch.forEach(n => window.__midi.noteOff(n)), ch); }
await W(p, 200);
const m1 = await p.X('({n:PN.n, drawn:VZ.drawn, P:VZ.P.length, tone:window.__tc, ctx:ctx&&ctx.state, held:PN.held.size, bars:VZ.P.filter(x=>x.k==="bar").length, cap:$("pnCap").classList.contains("on")})');
const px = await lit(p);
check('7 notes MIDI : 7 voix de l’instrument (sans passer par tone()), même avec midiSound=false', m1.n - n0 === 7 && m1.tone === 0, m1);
check('lumière : particules dessinées sur le canvas (cascade), touches relâchées, légende cachée', m1.drawn > d0 && m1.bars >= 7 && px > 50 && m1.held === 0 && !m1.cap, { ...m1, px });
const k1 = await ev(p, () => { window.__midi.noteOn(64, 90); const k = document.querySelector('#kbd [data-m="64"]'); return k && k.classList.contains('k-down'); });
await ev(p, () => window.__midi.noteOff(64));
check('la touche jouée s’allume tant qu’elle est tenue', k1);

// 4) pédale CC64 et bouton Sustain
await ev(p, () => { window.__midi.send(0, [0xB0, 64, 127]); window.__midi.noteOn(67, 100); window.__midi.noteOff(67); });
const s1 = await p.X('({on:PN.on.has(67), ped:PN.ped, btn:$("pnSus").getAttribute("aria-pressed")})');
await ev(p, () => window.__midi.send(0, [0xB0, 64, 0]));
const s2 = await p.X('({on:PN.on.has(67), ped:PN.ped, btn:$("pnSus").getAttribute("aria-pressed")})');
check('pédale CC64 : la note continue après la touche, puis s’arrête au relâché ; le bouton Sustain le montre', s1.on && s1.ped && s1.btn === 'true' && !s2.on && !s2.ped && s2.btn === 'false', { s1, s2 });
await p.click('#pnSus'); await ev(p, () => { window.__midi.noteOn(69, 100); window.__midi.noteOff(69); });
const s3 = await p.X('PN.on.has(69)'); await p.click('#pnSus'); const s4 = await p.X('PN.on.has(69)');
check('bouton Sustain (pédale virtuelle) : même effet', s3 && !s4, { s3, s4 });

// 5) instruments, ambiances et effets mémorisés
await p.click('.pn-i[data-ins=lead]'); await W(p, 250);
let st = await stored(p);
check('Synthé lead choisi : sauvegardé, son ambiance par défaut = Feux d’artifice', st.settings.piano?.ins === 'lead' && await p.X('pnVizNow()') === 'fireworks' && await ev(p, () => document.querySelector('.pn-v[aria-checked="true"]').dataset.viz) === 'fireworks', st.settings.piano);
await p.click('.pn-v[data-viz=bubbles]'); await W(p, 200);
await ev(p, () => { const r = document.querySelector('input[data-fx=rev]'); r.value = 72; r.dispatchEvent(new Event('input')); const v = document.querySelector('input[data-fx=vol]'); v.value = 55; v.dispatchEvent(new Event('input')); });
await W(p, 450); st = await stored(p);
check('ambiance Bulles retenue pour cet instrument, Salle 72 %, Volume 55 % sauvegardés', st.settings.piano.viz?.lead === 'bubbles' && st.settings.piano.rev === .72 && st.settings.piano.vol === .55, st.settings.piano);
await p.click('.pn-i[data-ins=musicbox]'); await W(p, 200);
check('Boîte à musique : son ambiance par défaut (Bulles), l’ambiance du Synthé lead reste à part', await p.X('pnVizNow()') === 'bubbles' && (await stored(p)).settings.piano.viz.musicbox === undefined);
const sw = [];
for (const id of ['grand', 'epiano', 'organ', 'pad', 'lead', 'mallet', 'musicbox']) { await p.click(`.pn-i[data-ins=${id}]`); await W(p, 60); const a = await p.X('PN.n'); await ev(p, () => { window.__midi.noteOn(55, 100); }); await W(p, 60); await ev(p, () => window.__midi.noteOff(55)); sw.push((await p.X('PN.n')) - a); }
check('chaque instrument joue une note sans erreur', sw.every(x => x === 1) && !p.errs.length, { sw, errs: p.errs });
await p.click('.pn-i[data-ins=epiano]'); await W(p, 300);
await p.reload(); await p.waitForFunction(() => !!window.__X); await W(p, 1200); await toPiano(p);
const rl = await ev(p, () => ({ ins: document.querySelector('.pn-i[aria-checked="true"]')?.dataset.ins, viz: document.querySelector('.pn-v[aria-checked="true"]')?.dataset.viz, rev: document.querySelector('input[data-fx=rev]').value }));
check('après rechargement : Piano électrique, son ambiance par défaut (Ondes), Salle 72', rl.ins === 'epiano' && rl.viz === 'ripples' && rl.rev === '72', rl);

// 6) « Son de l'app » coupé : le MIDI se tait (le clavier a ses haut-parleurs), l'écran sonne toujours, la lumière reste
await p.click('#pnSnd'); await W(p, 150);
const a0 = await p.X('PN.n'), dr0 = await p.X('VZ.drawn');
await ev(p, () => { window.__midi.noteOn(60, 100); window.__midi.noteOff(60); }); await W(p, 200);
const a1 = await p.X('PN.n'), dr1 = await p.X('VZ.drawn');
const box = await ev(p, () => { const r = document.querySelector('#kbd .wk').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.bottom - 12 }; });
await p.mouse.move(box.x, box.y); await p.mouse.down(); await W(p, 80); const held = await p.X('PN.held.size'); await p.mouse.up(); await W(p, 80);
const a2 = await p.X('PN.n'), held2 = await p.X('PN.held.size');
check('« Son de l’app » coupé : note MIDI muette mais éclairée, touche de l’écran jouée (tenue jusqu’au relâché)', a1 === a0 && dr1 > dr0 && a2 === a1 + 1 && held === 1 && held2 === 0 && (await stored(p)).settings.piano.snd === false, { a0, a1, a2, dr0, dr1, held, held2 });
await p.click('#pnSnd');

// 7) clavier d'ordinateur, puis sortie de page
const c0 = await p.X('PN.n'); await p.keyboard.down('KeyA'); await W(p, 60); const ck = await p.X('PN.held.size'); await p.keyboard.up('KeyA'); await W(p, 60);
check('clavier d’ordinateur (A = Do) : une voix, relâchée avec la touche', (await p.X('PN.n')) === c0 + 1 && ck === 1 && (await p.X('PN.held.size')) === 0);
await ev(p, () => { window.__midi.noteOn(72, 100); }); await W(p, 60);
await ev(p, () => document.querySelector('#modeNav [data-mode=learn]').click()); await W(p, 400);
const out = await p.X('({page, held:PN.held.size, on:PN.on.size, P:VZ.P.length, n:PN.n})');
await ev(p, () => window.__midi.noteOn(74, 100)); await W(p, 100);
check('quitter PIANO : sons et lumières arrêtés, les notes MIDI ne passent plus par l’instrument', out.page === 'learn' && out.held === 0 && out.on === 0 && out.P === 0 && (await p.X('PN.n')) === out.n, out);

// 8) PLAY › « Piano libre » mène au mode PIANO
await ev(p, () => document.querySelector('#modeNav [data-mode=play]').click()); await W(p, 500);
await ev(p, () => document.getElementById('pcFree').click()); await W(p, 400);
check('PLAY › « Piano libre » ouvre le mode PIANO', await p.X('page') === 'piano' && await p.X('!document.body.classList.contains("pc-kb")'));
check('aucune erreur JS (parcours complet)', !p.errs.length, p.errs);
await p.context().close();

// 9) état abîmé : pnCfg répare ; mergeState garde les réglages de l'appareil
p = await open({ st: { ...STATE(), settings: { ...STATE().settings, piano: { ins: 'kazoo', rev: 'x', vol: 7, viz: { lead: 'laser', pad: 'aurora', zz: 'bubbles' }, snd: 'oui' } } } });
const fx = await p.X('JSON.stringify(pnCfg())');
check('réglages abîmés réparés (instrument inconnu, nombres hors bornes, ambiances inconnues)', fx === JSON.stringify({ ins: 'grand', rev: .3, vol: 1, viz: { pad: 'aurora' }, snd: true, dly: 0, cho: .15 }) || (() => { const o = JSON.parse(fx); return o.ins === 'grand' && o.rev === .3 && o.vol === 1 && o.snd === true && JSON.stringify(o.viz) === '{"pad":"aurora"}'; })(), fx);
const mg = await p.X('(()=>{ const l={settings:{lang:"fr",piano:{ins:"organ",viz:{organ:"ripples"}}}}, c={settings:{lang:"fr",piano:{ins:"lead"}}}; return mergeState(l,c).merged.settings.piano.ins; })()');
check('mergeState : les réglages PIANO de cet appareil gagnent', mg === 'organ', mg);
await p.context().close();

// 10) prefers-reduced-motion : version calme (halos, rien qui file)
p = await open({ reduce: 'reduce', scheme: 'dark' });
await toPiano(p);
for (const v of ['fireworks', 'bubbles', 'cascade']) { await p.click(`.pn-v[data-viz=${v}]`); await W(p, 100); await ev(p, () => { [60, 64, 67].forEach(n => window.__midi.noteOn(n, 100)); }); await W(p, 60); await ev(p, () => [60, 64, 67].forEach(n => window.__midi.noteOff(n))); }
const kinds = await p.X('[...new Set(VZ.P.map(x=>x.k))].sort().join(",")');
check('reduced-motion : seulement des halos (glow/flare), pas de bulles, fusées ni barres', kinds && kinds.split(',').every(k => k === 'glow' || k === 'flare'), kinds);
check('reduced-motion : quelque chose s’allume quand même', await lit(p) > 20);
check('aucune erreur JS (reduced-motion)', !p.errs.length, p.errs);
await p.context().close();

// 11) Gammes une à une : sur la liste, une note MIDI sonne, un Do seul lance la gamme (sans S.settings.midiC)
p = await open();
await ev(p, () => document.querySelector('#modeNav [data-mode=learn]').click()); await W(p, 400);
await ev(p, () => document.querySelector('#learnTiles .sc1-tile').click()); await W(p, 400);
await p.X('window.__tc=0; { const o=tone; tone=function(){ window.__tc++; return o.apply(this,arguments); }; } delete S.settings.midiC;');
const ac = await p.X('!!ctx');
await ev(p, () => { window.__midi.noteOn(62, 90); }); await W(p, 150); await ev(p, () => window.__midi.noteOff(62));
const g1 = await p.X('({page, tc:window.__tc})');
check('Gammes une à une : le son est prêt dès l’ouverture de la liste (geste), une note MIDI y sonne sans rien lancer', ac && g1.page === 'sc1' && g1.tc >= 1, { ac, ...g1 });
await ev(p, () => { window.__midi.noteOn(60, 90); }); await W(p, 400);
const g2 = await p.X('({page, k:cur&&cur.k, midiC:S.settings.midiC})');
check('Gammes une à une : un Do seul lance la prochaine gamme (S.settings.midiC absent)', g2.page === 'practice' && !!g2.k && g2.midiC === undefined, g2);
check('aucune erreur JS (Gammes une à une)', !p.errs.length, p.errs);
await p.context().close();

// 12a) Sons du piano : échantillons, repli, rendu hors ligne (claquements, crête, attaque, timbres distincts)
{
  const man = JSON.parse(fs.readFileSync(new globalThis.URL('../../live/manifest.json', import.meta.url), 'utf8'));
  const mp3 = man.files.filter(f => /^assets\/audio\/piano\/[A-Za-z0-9]+\.mp3$/.test(f.path)), tot = mp3.reduce((a, f) => a + f.size, 0);
  check('manifeste de l’app : 30 MP3 du piano + LICENSE.txt, ≤ 2,5 Mo', mp3.length === 30 && man.files.some(f => f.path === 'assets/audio/piano/LICENSE.txt') && tot <= 2.5e6, { n: mp3.length, tot });
  p = await open(); let req = 0; p.on('request', r => { if (/\/assets\/audio\/piano\/.*\.mp3$/.test(r.url())) req++; });
  check('rien n’est chargé avant d’ouvrir PIANO', await p.X('PN_SMP.st') === 0 && req === 0);
  await toPiano(p); await p.waitForFunction(() => window.__X('PN_SMP.st') >= 2, null, { timeout: 20000 }).catch(() => {});
  const sm = await p.X('({st:PN_SMP.st, n:Object.keys(PN_SMP.buf).length, dur:Math.max(...Object.values(PN_SMP.buf).map(b=>b.duration)), mb:Object.values(PN_SMP.buf).reduce((a,b)=>a+b.length*b.numberOfChannels*4,0)/1e6})');
  check('ouverture de PIANO (piano à queue) : 30 échantillons chargés et décodés une fois, notes coupées ≤ 6 s, ≤ 60 Mo décodés', sm.st === 2 && sm.n === 30 && req === 30 && sm.dur <= 6.01 && sm.mb <= 60, { ...sm, req });
  const pv = await p.X('(()=>{ const t=performance.now(); const vc=pnVoice(60,.8); const dt=performance.now()-t; const r={dt, kind:vc&&vc.src.map(s=>s.constructor.name).join(",")}; pnOff(60); return r; })()');
  check('une note du piano à queue = AudioBufferSourceNode de l’échantillon, créée sans décodage (< 5 ms)', pv.kind === 'AudioBufferSourceNode' && pv.dt < 5, pv);
  await p.click('.pn-i[data-ins=organ]'); await W(p, 100); await p.click('.pn-i[data-ins=grand]'); await W(p, 300);
  check('changer d’instrument puis revenir : rien n’est rechargé', req === 30, req);
  await p.X('credOpen()'); await W(p, 1500);
  const cr = await ev(p, () => { const e = document.getElementById('snCred'); return e && e.parentNode.firstChild === e ? e.textContent : ''; });
  check('Réglages › Crédits : les sons du piano en tête (Alexander Holm, CC BY 3.0)', /Salamander/.test(cr) && /Alexander Holm/.test(cr) && /CC BY 3\.0/.test(cr), cr);
  await p.X('closeMod("credModal")');
  // rendu hors ligne
  await p.evaluate(s => window.__X(s), PN_OFFLINE);
  const R = await p.evaluate(async () => { const R = {}, INS = ['grand', 'epiano', 'organ', 'pad', 'lead', 'mallet', 'musicbox'], sc = []; let t = .05;
    for (let i = 0; i < 8; i++) { sc.push({ t, on: 60, v: .9 }, { t: t + .04, off: 60 }); t += .07; }                 // notes répétées
    t += .1; for (let i = 0; i < 6; i++) { sc.push({ t, on: 60, v: .9 }); t += .05; } sc.push({ t, off: 60 });          // même note rejouée sans relâcher
    t += .1; const C = [48, 52, 55, 60, 64, 67, 72]; C.forEach(m => sc.push({ t, on: m, v: 1 }, { t: t + .6, off: m })); t += .8; // accord fort
    sc.push({ t, ped: 1 }); [60, 62, 64, 65, 67].forEach((m, i) => sc.push({ t: t + i * .06, on: m, v: .8 }, { t: t + i * .06 + .05, off: m })); t += .7; sc.push({ t, ped: 0 }); t += .2; // pédale
    for (let i = 0; i < 12; i++) { const m = i % 2 ? 62 : 60; sc.push({ t, on: m, v: .7 }, { t: t + .035, off: m }); t += .04; } // trille rapide
    sc.push({ t: t + .1, on: 96, v: .8 }, { t: t + .15, off: 96 }, { t: t + .1, on: 72, v: .8 }, { t: t + .15, off: 72 });
    for (let i = 0; i < 32; i++) sc.push({ t: t + .3 + i * .01, on: 36 + i, v: .6 });                                 // plus de 28 voix : vol de voix
    sc.push({ t: t + .9, fx: 1 });
    R.cl = {}; R.pk = {};
    for (const ins of INS) { const { b, info } = await __pnRender(ins, sc, { dur: t + 2.6, rev: 0, cho: 0 }); R.cl[ins] = __pnClicks(b); R.pk[ins] = +__pnPeak(b).toFixed(3); if (ins === 'grand') R.gk = [...new Set(info.voices)]; }
    { const { b } = await __pnRender('grand', [{ t: 0, on: 60, v: 1 }, { t: .3, cut: 1 }], { dur: .6 }); R.ctrl = __pnClicks(b).length; }
    { const { b } = await __pnRender('grand', [{ t: 0, on: 48, v: 1 }, { t: 0, on: 60, v: 1 }, { t: .4, ins: 'organ' }, { t: .45, on: 60, v: .8 }, { t: .9, ins: 'pad' }, { t: .95, on: 64, v: .8 }, { t: 1.5, off: 64 }, { t: 1.6, ins: 'mallet' }, { t: 1.65, on: 72, v: 1 }], { dur: 4 }); R.chg = __pnClicks(b); }
    R.big = {}; for (const ins of INS) { const { b } = await __pnRender(ins, [36, 43, 48, 52, 55, 60, 64, 67, 72, 76].map(m => ({ t: 0, on: m, v: 1 })), { dur: 1.5, rev: .3, cho: .15, vol: 1 }); R.big[ins] = +__pnPeak(b).toFixed(3); }
    { const { b } = await __pnRender('grand', [{ t: .1, on: 60, v: .8 }], { dur: .5 }); R.onset = +__pnOnset(b, .1).toFixed(2); }
    const F = {}; for (const ins of INS) { const { b } = await __pnRender(ins, [{ t: 0, on: 60, v: .8 }, { t: 1.2, off: 60 }], { dur: 2 }); F[ins] = __pnFeat(b, 261.63); }
    R.d = {}; INS.forEach((a, i) => INS.forEach((c, j) => { if (j > i) R.d[a + '/' + c] = __pnDist(F[a], F[c]); }));
    return R; });
  const ncl = Object.values(R.cl).reduce((a, l) => a + l.length, 0);
  check('témoin : une note coupée net est bien détectée comme claquement', R.ctrl >= 1, R.ctrl);
  check('7 instruments × scénarios rapides (notes répétées, rejouées, accord fort, pédale, trille, vol de voix, effets) : aucun claquement', ncl === 0, R.cl);
  check('changement d’instrument pendant que des notes sonnent : aucun claquement', R.chg.length === 0, R.chg);
  check('le piano à queue joue bien les échantillons pendant les scénarios', R.gk.length === 1 && R.gk[0] === 'AudioBufferSourceNode', R.gk);
  check('crête ≤ 1 partout (accord de 10 notes fortissimo, volume max : écrêtage doux, jamais de saturation dure)', Object.values(R.pk).concat(Object.values(R.big)).every(v => v <= 1.0001), { pk: R.pk, big: R.big });
  check('attaque du piano à queue < 4 ms après la touche (aucune latence ajoutée)', R.onset < 4, R.onset);
  const dmin = Math.min(...Object.values(R.d));
  console.log('     distances de timbre (harmoniques + enveloppe) :', JSON.stringify(R.d));
  check('7 instruments distincts (distance de timbre ≥ 0,8 entre chaque paire), synthé doux loin de l’orgue (≥ 2)', dmin >= .8 && R.d['organ/pad'] >= 2, { dmin, pad: R.d['organ/pad'] });
  check('aucune erreur JS (sons du piano)', !p.errs.length, p.errs);
  await p.context().close();
  // repli : fichiers introuvables → la synthèse joue, sans erreur
  p = await open(); await p.context().route('**/assets/audio/piano/*.mp3', r => r.abort());
  await toPiano(p); await p.waitForFunction(() => window.__X('PN_SMP.st') === 3, null, { timeout: 15000 }).catch(() => {});
  const fb = await p.X('(()=>{ const vc=pnVoice(60,.8); const k=vc&&vc.src.map(s=>s.constructor.name).join(","); pnOff(60); return {st:PN_SMP.st, k}; })()');
  check('échantillons introuvables : le piano à queue joue en synthèse (OscillatorNode), aucune erreur', fb.st === 3 && /OscillatorNode/.test(fb.k || '') && !p.errs.length, { ...fb, errs: p.errs });
  await p.context().close();
}

// 12) pas de défilement aux 5 tailles, clair et sombre (et le menu mobile montre PIANO)
for (const scheme of ['light', 'dark']) for (const [w, h] of [[375, 667], [812, 375], [768, 1024], [1024, 768], [1280, 800]]) {
  p = await open({ vp: { width: w, height: h }, scheme });
  if (await p.isVisible('#menuBtn')) { await p.click('#menuBtn'); await W(p, 300);
    const vis = await ev(p, () => { const r = document.querySelector('#modeNav [data-mode=piano]').getBoundingClientRect(); return r.height > 20 && r.bottom <= innerHeight + 1 && r.top >= 0; });
    check(`${w}×${h} ${scheme} : PIANO visible dans le menu mobile`, vis); }
  await ev(p, () => document.querySelector('#modeNav [data-mode=piano]').click()); await W(p, 600);
  const ns = await noScroll(p), fit = await ev(p, () => { const r = s => document.querySelector(s).getBoundingClientRect(), k = r('#kbd'), sc = r('#pnScene'), bar = r('.pn-bar'), ins = r('.pn-ins');
    return { k: Math.round(k.height), kb: k.bottom <= innerHeight + 1, sc: Math.round(sc.height), bar: bar.bottom <= sc.top + 1 && bar.height > 20, ins: ins.height > 20 }; });
  await ev(p, () => { [48, 52, 55, 60, 64, 67].forEach(n => window.__midi.noteOn(n, 100)); }); await W(p, 250);
  const px2 = await lit(p);
  if (CAP) await p.screenshot({ path: `${CAP}/r48_${w}x${h}_${scheme}.png` });
  check(`${w}×${h} ${scheme} : sans défilement, clavier ≥ 80 px entier, scène ≥ 90 px, choix au-dessus, lumière dessinée`, ns && fit.kb && fit.k >= 80 && fit.sc >= 90 && fit.bar && fit.ins && px2 > 20, { ns, ...fit, px2 });
  if (p.errs.length) check(`${w}×${h} ${scheme} : aucune erreur JS`, false, p.errs);
  await p.context().close();
}
await b.close();
console.log(fails.length ? `\nr48 FAIL ${fails.length}` : '\nr48 OK');
process.exit(fails.length ? 1 : 0);
