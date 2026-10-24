// r25 — MIDI lots 2-3 (rapport midi.md §4, §7, §8.4) : assistant « Brancher mon clavier » M4 à M7 (matrice par appareil), M8 dans l'assistant,
// M9 étendue, M10 prêt, M11 dépannage, M12 navigateur sans MIDI, M3 (lien du premier lancement), Réglages « Mon clavier », calage de latence (midiLat).
// CA-M06, 07, 08 (assistant), 09, 10, 11, 12, 14, 15 (pas de défilement), 16. Faux Web MIDI de lib.mjs ; app iOS simulée (classe native + faux __nativeMidi).
// Usage : PORT=8767 NODE_PATH=… PW_CHROMIUM=… node tools/audit/r25_midi2.mjs
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
const A = (p, a) => click(p, `#mwiz [data-a="${a}"]`);
const waitFor = async (p, f, ms = 5000, a) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(p, f, a)) return true; await W(p, 100); } return false; };
const st = p => ev(p, () => JSON.parse(localStorage.getItem('memo-gammes-v1') || '{}'));
const step = p => ev(p, () => { const m = document.getElementById('mwiz'); return m && !m.hidden ? m.dataset.step : ''; });
const body = p => ev(p, () => document.getElementById('mwBody').textContent);
const noScroll = p => ev(p, () => { const b = document.getElementById('mwBody'), c = document.querySelector('#mwiz .mw-card'), r = c.getBoundingClientRect();
  return { ok: b.scrollHeight <= b.clientHeight + 1 && r.top >= -1 && r.bottom <= innerHeight + 1 && document.documentElement.scrollWidth <= innerWidth + 1, sh: b.scrollHeight, ch: b.clientHeight, bottom: Math.round(r.bottom), h: innerHeight }; });
const seed = (input = 'midi', extra = {}) => `(()=>{ try{ if(sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded','1');
  localStorage.setItem('memo-gammes-v1', JSON.stringify(Object.assign({settings:{lang:'fr',notation:'fr',input:'${input}',earV2:true,diffV2:true,midiV2:true,uiSound:false,delay:6,midiSound:true},
    langV2:true,gate:'guest',onb:{done:1},tourDone:1,pwShown:1,introSeen:Object.fromEntries(['hub','learn','games','free','play','quiz','chords','scales','harmony','prog','ear','daily','practice','runner','speed','memory','rank','account','settings','progress','notif','section'].map(k=>[k,1])),
    seenTypes:[],stats:{},secStats:{},xp:500,xpDays:{},streak:{days:0}}, ${JSON.stringify(extra)}))); }catch(e){} })();`;
const NATIVE = `new MutationObserver((m,o)=>{ if(document.documentElement){ document.documentElement.classList.add('native'); o.disconnect(); } }).observe(document,{childList:true});
  window.__nat={bt:0,list:0}; window.__nativeMidi={start:async()=>({inputs:[]}),listInputs:async()=>{ window.__nat.list++; return {inputs:[]}; },showBluetooth:async()=>{ window.__nat.bt++; }};`;
const PLATFORM = pf => `Object.defineProperty(Navigator.prototype,'platform',{get:()=>${JSON.stringify(pf)},configurable:true}); Object.defineProperty(Navigator.prototype,'userAgentData',{get:()=>undefined,configurable:true});`;
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
// o: input, mode (ok|none), empty, name, native, ua, platform, viewport, fresh (first launch), extra
async function open(o = {}) {
  const ctx = await b.newContext({ viewport: o.viewport || { width: 1280, height: 800 }, locale: 'fr-FR', userAgent: o.ua });
  if (o.native) await ctx.addInitScript(NATIVE);
  if (o.platform) await ctx.addInitScript(PLATFORM(o.platform));
  await ctx.addInitScript(INIT(o.mode || 'ok'));
  await ctx.addInitScript(`(()=>{ const M=window.__midi; if(!M) return; ${o.name ? `M.ports[0].name=${JSON.stringify(o.name)};` : ''} ${o.empty ? `M.access.inputs.clear(); M.ports[0].state='disconnected';` : ''} })();`);
  if (!o.fresh) await ctx.addInitScript(seed(o.input || 'midi', o.extra || {}));
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.errs = errs; p.ctx = ctx;
  await p.goto(URL); await W(p, 1300); return p; }
const wiz = p => ev(p, () => { const e = document.querySelector('#mkCard [data-a=wiz]'); if (e) e.click(); return !!e; });

// ---- CA-M16 : clés md* FR / EN ----
{ const src = fs.readFileSync(new globalThis.URL('../../src/piano-challenges.html', import.meta.url), 'utf8');
  const fr = src.slice(src.indexOf('  fr:{help:'), src.indexOf('  en:{help:')), en = src.slice(src.indexOf('  en:{help:'), src.indexOf('\n};', src.indexOf('  en:{help:')));
  const keys = s => new Set([...s.matchAll(/[\s,{](md[A-Z]\w*):/g)].map(m => m[1]));
  const kf = keys(fr), ke = keys(en), miss = [...kf].filter(k => !ke.has(k)).concat([...ke].filter(k => !kf.has(k)));
  const used = new Set([...src.matchAll(/t\("(md[A-Z]\w*)"\)|data-i="(md[A-Z]\w*)"/g)].map(m => m[1] || m[2]));
  check('CA-M16 clés md* en FR et en EN (' + kf.size + ')', kf.size > 80 && !miss.length, miss);
  check('CA-M16 chaque clé md* utilisée existe', [...used].every(k => kf.has(k)), [...used].filter(k => !kf.has(k)));
  check('les 13 pannes du dépannage (4.4) sont traduites', /mdFix:\[(\[[^\]]*\],?){13}\]/.test(fr) && /mdFix:\[(\[[^\]]*\],?){13}\]/.test(en)); }

// ---- M1 / M2 : jamais branché → l'assistant (M4) ----
let P = await open({ input: 'screen', empty: true });
await click(P, '#inChip'); await W(P, 300);
check('M1 « Brancher un clavier » ouvre l’assistant à l’étape 1 (M4)', await step(P) === 'hw' && /Qu'as-tu devant toi/.test(await body(P)) && await ev(P, () => document.querySelectorAll('#mwBody .mw-opt').length === 4));
check('M4 dit l’appareil détecté (ordinateur, Chrome)', /ordinateur, Chrome/.test(await body(P)));
check('M4 : aucune autorisation MIDI demandée à l’ouverture', await ev(P, () => window.__cnt.midiAccessCalls === 0));
await P.keyboard.press('Escape'); await W(P, 200);
check('Échap ferme l’assistant', await step(P) === '');
await click(P, '#hsMidiBtn'); await W(P, 300);
check('M2 « Brancher mon clavier » ouvre l’assistant', await step(P) === 'hw');
// « Mon clavier est déjà branché » sans clavier : message, lien dépannage
await A(P, 'detect'); await W(P, 1900);
check('M4 « Le détecter » sans clavier : « Aucun clavier trouvé » + Ça ne marche pas ?', /Aucun clavier trouvé/.test(await body(P)) && await ev(P, () => !!document.querySelector('#mwBody [data-a=trouble]')));
// a keyboard arrives on M4: banner + « Test it now »
await ev(P, () => window.__midi.reconnect(0)); await W(P, 400);
check('M4 un port arrive : bandeau « ✓ … détecté » + « Tester maintenant », pas de toast', /Fake Keyboard 61 détecté/.test(await body(P)) && await ev(P, () => !!document.querySelector('#mwBody [data-a=totest]')) && await ev(P, () => !document.getElementById('mdToast')?.classList.contains('on')));
await A(P, 'totest'); await W(P, 200);
check('« Tester maintenant » → M8', await step(P) === 'test');
check('aucune erreur de page (M1/M2/M4)', P.errs.length === 0, P.errs);
await P.ctx.close();

// ---- CA-M06 : navigateur sans Web MIDI, premier lancement → M12 ----
P = await open({ mode: 'none', fresh: true });
check('premier lancement : écran « Joue ta première note » avec le lien « Brancher mon clavier »', await waitFor(P, () => !!document.querySelector('#gate .fn-card') && !!document.getElementById('fnMw') && document.getElementById('fnMw').offsetParent !== null, 3000));
await click(P, '#fnMw'); await W(P, 300);
check('CA-M06 sans requestMIDIAccess : le lien ouvre M12 (jamais d’autorisation)', await step(P) === 'safari' && await ev(P, () => window.__cnt.midiAccessCalls === 0) && /Chrome ou Edge/.test(await body(P)) && /L'app Piano Challenges/.test(await body(P)));
check('M12 au-dessus de l’écran de premier lancement', await ev(P, () => { const r = document.querySelector('#mwiz .mw-card').getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + 30); return !!el && !!el.closest('#mwiz'); }));
await A(P, 'screen'); await W(P, 300);
check('M12 « Jouer sur l’écran » referme et choisit l’écran sur le premier lancement', await step(P) === '' && await ev(P, () => document.querySelector('#gate .fn-in[data-v=screen]')?.getAttribute('aria-pressed') === 'true'));
check('aucune erreur de page (M06)', P.errs.length === 0, P.errs);
await P.ctx.close();

// ---- M3 : premier lancement, clavier branché → le lien disparaît (le clavier est déjà vu) ----
P = await open({ fresh: true });
await waitFor(P, () => !!document.querySelector('#gate .fn-card'), 3000); await W(P, 600);
check('M3 clavier détecté au premier lancement : pas de lien d’aide, « Détecté : … »', await ev(P, () => !document.getElementById('fnMw') && /Détecté : Fake Keyboard 61/.test(document.getElementById('gate').textContent)));
await P.ctx.close();
P = await open({ fresh: true, empty: true, viewport: { width: 1024, height: 768 } });
await waitFor(P, () => !!document.getElementById('fnMw'), 3000);
await click(P, '#fnMw'); await W(P, 300);
check('M3 le lien ouvre l’assistant (M4) par-dessus le premier lancement', await step(P) === 'hw');
await A(P, 'hw:midi'); await A(P, 'conn:usb'); await A(P, 'next'); await W(P, 300);
await ev(P, () => window.__midi.reconnect(0)); await W(P, 1600);
check('M3 → M6 → clavier branché : passage automatique au test', await step(P) === 'test');
await ev(P, () => window.__midi.noteOn(62, 80)); await W(P, 150); await A(P, 'range'); await W(P, 150);
if (await ev(P, () => !!document.querySelector('#mwiz [data-a=rmeasure]'))) await A(P, 'rmeasure');
await A(P, 'rskip'); await W(P, 200);
check('M10 au premier lancement : bouton « Joue un Do pour commencer »', await step(P) === 'ready' && /Joue un Do pour commencer/.test(await ev(P, () => document.getElementById('mwFoot').textContent)));
await ev(P, () => window.__midi.noteOn(60, 90)); await W(P, 400);
check('M10 un Do seul referme l’assistant, retour au premier lancement en MIDI', await step(P) === '' && await ev(P, () => document.querySelector('#gate .fn-in[data-v=midi]')?.getAttribute('aria-pressed') === 'true'));
await ev(P, () => window.__midi.noteOn(60, 90)); await W(P, 300);
check('… puis un Do valide la première note', await ev(P, () => /c'est un Do/.test(document.getElementById('fnPrompt')?.textContent || '')));
check('aucune erreur de page (M3)', P.errs.length === 0, P.errs);
await P.ctx.close();

// ---- Windows : M5 avertissement Bluetooth, M6 câble USB-A, M7 « passer au câble », CA-M14 ----
P = await open({ input: 'screen', empty: true, platform: 'Win32' });
await click(P, '#hsMidiBtn'); await W(P, 300);
check('Windows : M4 dit « PC Windows »', /PC Windows/.test(await body(P)));
await A(P, 'hw:midi'); await A(P, 'conn:bt'); await W(P, 100);
check('M5 Windows + Bluetooth : « Sur Windows, le câble est plus simple »', /Sur Windows, le câble est plus simple/.test(await body(P)));
await A(P, 'next'); await W(P, 200);
check('M7 Windows : conseil du câble + bouton « Passer au câble »', await step(P) === 'bt' && /Le plus simple : un câble USB/.test(await body(P)) && await ev(P, () => !!document.querySelector('#mwiz [data-a=tocable]')));
await A(P, 'tocable'); await W(P, 200);
check('M6 Windows : câble USB-B vers USB-A', await step(P) === 'cable' && /prise rectangulaire côté ordinateur/.test(await body(P)) && /Câble USB-B vers USB-A/.test(await body(P)));
await A(P, 'trouble'); await W(P, 200);
let fx = await ev(P, () => [...document.querySelectorAll('#mwBody .mw-fix li')].map(l => l.querySelector('b').textContent));
check('CA-M14 Windows : la ligne « port déjà utilisé », 5 lignes au plus', fx.length <= 5 && fx.some(x => /Rien sous Windows/.test(x)), fx);
check('M11 puces : appareil, connexion, étape', await ev(P, () => /PC Windows.*Câble USB.*Étape 3 : le câble/.test(document.querySelector('#mwBody .mw-chips2').textContent)));
await A(P, 'fix:5'); await W(P, 100); await A(P, 'fix:1'); await W(P, 100);
check('M11 accordéon : un seul symptôme ouvert à la fois, avec « Réessayer »', await ev(P, () => document.querySelectorAll('#mwBody .mw-fix li.open').length === 1 && !!document.querySelector('#mwBody .mw-fix li.open[data-fix="1"] [data-a=retry]')));
check('M11 « Écrire au support » : e-mail prérempli sans donnée personnelle', await ev(P, () => { const a = document.querySelector('#mwFoot .mw-mail'); return !!a && /^mailto:/.test(a.href) && /Appareil/.test(decodeURIComponent(a.href)) && !/@.*@/.test(decodeURIComponent(a.href).replace(/^mailto:[^?]*/, '')); }));
await ev(P, () => window.__midi.reconnect(0)); await W(P, 400);
check('M11 un clavier arrive : « ✓ Résolu ! » puis le test', /Résolu/.test(await body(P)) && await waitFor(P, () => document.getElementById('mwiz').dataset.step === 'test', 2000));
check('aucune erreur de page (Windows)', P.errs.length === 0, P.errs);
await P.ctx.close();

// ---- Mac + Chrome : M7 Configuration audio et MIDI ----
P = await open({ input: 'screen', empty: true, platform: 'MacIntel' });
await click(P, '#hsMidiBtn'); await W(P, 300); await A(P, 'hw:digital'); await A(P, 'conn:bt'); await A(P, 'next'); await W(P, 200);
check('M7 Mac : les étapes de Configuration audio et MIDI', /Configuration audio et MIDI/.test(await body(P)) && /studio MIDI/.test(await body(P)));
await A(P, 'prev'); await A(P, 'conn:usb'); await A(P, 'next'); await W(P, 200);
check('M6 Mac : câble USB-B vers USB-C', /USB-B vers USB-C/.test(await body(P)));
await P.ctx.close();

// ---- App iOS simulée (iPad) : port USB-C / Lightning, CA-M07 Bluetooth, CA-M14 Lightning ----
const IPAD = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
P = await open({ input: 'screen', empty: true, native: true, ua: IPAD, viewport: { width: 1024, height: 768 } });
await click(P, '#hsMidiBtn'); await W(P, 300);
check('iPad app : M4 dit « iPad, app Piano Challenges »', /iPad, app Piano Challenges/.test(await body(P)));
await A(P, 'hw:midi'); await A(P, 'conn:usb'); await W(P, 100);
check('M5 iPad : « Quel port a ton iPad ? » USB-C / Lightning, Continuer bloqué avant', /Quel port a ton iPad/.test(await body(P)) && await ev(P, () => document.querySelector('#mwiz [data-a=next]').disabled));
await A(P, 'port:light'); await A(P, 'next'); await W(P, 200);
check('M6 iPad Lightning : l’adaptateur Lightning vers USB 3 et le secteur', /adaptateur Lightning vers USB 3/.test(await body(P)) && /secteur/.test(await body(P)));
await A(P, 'trouble'); await W(P, 200);
fx = await ev(P, () => [...document.querySelectorAll('#mwBody .mw-fix li')].map(l => l.querySelector('b').textContent));
check('CA-M14 iPad Lightning : la ligne « adaptateur », 5 lignes au plus', fx.length <= 5 && fx.some(x => /Lightning/.test(x)), fx);
await A(P, 'prev'); await A(P, 'prev'); await A(P, 'conn:bt'); await W(P, 100);
check('M5 Bluetooth : pas de question de port', !/Quel port/.test(await body(P)));
await A(P, 'next'); await W(P, 200);
const l0 = await ev(P, () => window.__nat.list);
await A(P, 'bt'); await W(P, 2600);
check('CA-M07 « Chercher mon clavier » appelle __nativeMidi.showBluetooth', await ev(P, () => window.__nat.bt === 1));
check('CA-M07 … puis la liste des ports est relue', await ev(P, l0 => window.__nat.list > l0, l0));
check('M7 après la recherche : « Le clavier n’est pas apparu ? » + aide', /Le clavier n'est pas apparu/.test(await body(P)));
check('aucune erreur de page (iPad)', P.errs.length === 0, P.errs);
await P.ctx.close();

// ---- M8 dans l'assistant : CA-M08, 09, 11, 12 ; M9 : CA-M10 ; M10 ----
P = await open({ name: 'Roland FP-10' });
await waitFor(P, () => document.getElementById('inChip').dataset.st === 'ok');
await wiz(P); await W(P, 300); await A(P, 'totest'); await W(P, 200);
await ev(P, () => window.__midi.addSecond()); await W(P, 300);
check('CA-M12 deux claviers : « Appuie sur une touche du clavier que tu veux utiliser »', /clavier que tu veux utiliser/.test(await body(P)));
await ev(P, () => window.__midi.noteOn(64, 20, 1)); await W(P, 200);
check('CA-M12 une note sur le second : ce port est choisi (midiInput)', (await st(P)).settings.midiInput === 'Fake Keyboard 25');
check('CA-M08 (assistant) la bonne touche s’allume, son nom s’affiche', await ev(P, () => document.querySelector('#mwBody .mt-note b').textContent === 'Mi' && document.querySelectorAll('#mwBody .mw-kb .on').length === 1));
await ev(P, () => window.__midi.noteOn(67, 110, 1)); await W(P, 200);
check('CA-M08 (assistant) 20 puis 110 : « Sensible au toucher ✓ »', /Sensible au toucher ✓/.test(await body(P)) && (await st(P)).midi.hw.vel === true);
check('les notes de l’assistant ne vont pas au jeu dessous', await ev(P, () => document.querySelectorAll('#kbd .k-hit, #kbd .k-bad').length === 0));
await ev(P, () => window.__midi.send(1, [0xB0, 64, 127])); await W(P, 150);
check('CA-M11 CC64 ≥ 64 pendant le test : « Pédale reconnue ✓ », S.midi.hw.ped', /Pédale reconnue/.test(await body(P)) && (await st(P)).midi.hw.ped === true);
await A(P, 'tw:yes'); await W(P, 100);
check('CA-M09 (assistant) Oui → son de l’app coupé', (await st(P)).settings.midiSound === false);
await A(P, 'tw:none'); await W(P, 100);
check('CA-M09 (assistant) Je n’entends rien → son activé', (await st(P)).settings.midiSound === true);
await A(P, 'range'); await W(P, 200);
check('M9 : étape « Joue la touche la plus à gauche… »', await step(P) === 'range' && /la plus à gauche, puis la plus à droite/.test(await body(P)));
await ev(P, () => window.__midi.noteOn(36, 90, 1)); await W(P, 80); await A(P, 'rok'); await W(P, 100);
check('M9 une seule touche : « Joue bien les deux extrémités »', /Joue bien les deux extrémités/.test(await body(P)) && await step(P) === 'range');
await ev(P, () => window.__midi.noteOn(84, 90, 1)); await W(P, 150);
check('CA-M10 notes 36 puis 84 : « 49 touches · de Do1 à Do5 »', /49 touches · de Do1 à Do5/.test(await body(P)));
await A(P, 'rok'); await W(P, 300);
let S1 = await st(P);
check('CA-M10 … kbdLow=36, kbdHigh=84, S.midi.hw.lo/hi', S1.settings.kbdLow === 36 && S1.settings.kbdHigh === 84 && S1.settings.kbdSize === 'custom' && S1.midi.hw.lo === 36 && S1.midi.hw.hi === 84 && S1.midi.hw.keys === 49, { s: S1.settings.kbdLow, h: S1.midi.hw });
check('M10 « Ton clavier est prêt ! » : fiche (touches, toucher, pédale, son) et 3 avantages', await step(P) === 'ready' && /Ton clavier est prêt/.test(await body(P)) && /49 touches/.test(await body(P)) && /Pédale ✓/.test(await body(P)) && await ev(P, () => document.querySelectorAll('#mwBody .mw-adv li').length === 3));
check('M10 enregistre l’assistant terminé et la connexion', !!S1.midi.wizard?.done && !!S1.midi.hw.dev);
await A(P, 'play'); await W(P, 300);
check('M10 « Jouer » referme l’assistant', await step(P) === '' && await ev(P, () => !document.getElementById('app').inert));
check('followMidi : le clavier mesuré tient à l’écran, il ne bouge pas', await ev(P, () => { window.__midi.noteOn(40, 80); return true; }) && (await st(P)).settings.kbdLow === 36);
check('aucune erreur de page (M8-M10)', P.errs.length === 0, P.errs);
await P.ctx.close();

// ---- M9 : taille devinée par le nom ----
P = await open({ name: 'Keystation 49 MK3' });
await waitFor(P, () => document.getElementById('inChip').dataset.st === 'ok');
await wiz(P); await W(P, 300); await A(P, 'totest'); await W(P, 150); await ev(P, () => window.__midi.noteOn(60, 80)); await W(P, 100); await A(P, 'range'); await W(P, 150);
check('M9 taille devinée : « On pense que ton clavier a 49 touches. C’est juste ? »', /On pense que ton clavier a 49 touches/.test(await body(P)));
await A(P, 'rguess'); await W(P, 200);
S1 = await st(P);
check('M9 « Oui » garde la taille devinée (hw.keys 49, 36 à 84)', await step(P) === 'ready' && S1.midi.hw.keys === 49 && S1.midi.hw.lo === 36 && S1.midi.hw.hi === 84, S1.midi.hw);
await P.ctx.close();

// ---- calage de latence : midiLat() ----
P = await open();
await waitFor(P, () => document.getElementById('inChip').dataset.st === 'ok');
await ev(P, () => document.querySelector('#mkCard [data-a=lat]').click()); await W(P, 200);
check('Réglages « Caler le rythme » ouvre le calage', await step(P) === 'lat');
await A(P, 'latgo'); await W(P, 50);
await ev(P, () => { const L = document.getElementById('mwLat'), t0 = +L.dataset.t0, per = +L.dataset.per; for (let i = 0; i < 8; i++) setTimeout(() => window.__midi.noteOn(60, 90), t0 + i * per + 40 - performance.now()); });
await waitFor(P, () => /Décalage mesuré/.test(document.getElementById('mwBody').textContent), 9000);
S1 = await st(P); const lat = await ev(P, () => window.midiLat());
check('calage : 8 notes 40 ms après les clics → S.midi.lat ≈ 40 ms, midiLat() idem', Math.abs(S1.midi.lat - 40) <= 20 && lat === S1.midi.lat, { lat: S1.midi.lat, f: lat });
await A(P, 'prevok'); await W(P, 200);
check('Réglages « Mon clavier » : nom, touches, décalage', await ev(P, () => /Fake Keyboard 61/.test(document.getElementById('mkCard').textContent) && /décalage \d+ ms/.test(document.getElementById('mkCard').textContent)));
check('aucune erreur de page (calage)', P.errs.length === 0, P.errs);
await P.ctx.close();

// ---- Réglages › Interaction : pas de défilement ajouté sur iPad ----
for (const vp of [{ width: 1024, height: 768 }, { width: 768, height: 1024 }]) {
  P = await open({ viewport: vp }); await waitFor(P, () => document.getElementById('inChip').dataset.st === 'ok');
  await click(P, '#setBtn'); await W(P, 500);
  const r = await ev(P, () => { const pn = document.getElementById('setPane'), f = document.getElementById('mkField'), rr = f.getBoundingClientRect(); return { vis: !f.hidden && rr.height > 0, sh: pn.scrollHeight, ch: pn.clientHeight, doc: document.scrollingElement.scrollHeight <= innerHeight + 1, inView: rr.bottom <= innerHeight }; });
  check(`Réglages « Mon clavier » visible sans défilement (${vp.width}×${vp.height})`, r.vis && r.sh <= r.ch + 1 && r.doc && r.inView, r);
  await P.ctx.close();
}

// ---- CA-M15 : aucun défilement dans l'assistant, 5 tailles ----
const SIZES = [[375, 667], [812, 375], [768, 1024], [1024, 768], [1280, 800]];
for (const [w, h] of SIZES) {
  const phone = Math.min(w, h) < 600;
  P = await open({ input: 'screen', empty: true, native: true, ua: IPAD, viewport: { width: w, height: h } });
  const bad = [];
  const look = async n => { const r = await noScroll(P); if (!r.ok) bad.push(n + ' ' + JSON.stringify(r)); };
  await click(P, '#hsMidiBtn'); await W(P, 300); await look('M4');
  await A(P, 'hw:midi'); await A(P, 'conn:usb'); await A(P, 'port:light'); await W(P, 100); await look('M5');
  await A(P, 'next'); await W(P, 200); await look('M6');
  await A(P, 'trouble'); await W(P, 150); await A(P, 'fix:2'); await W(P, 100); await look('M11');
  await A(P, 'prev'); await A(P, 'prev'); await A(P, 'conn:bt'); await A(P, 'next'); await W(P, 150); await look('M7');
  await A(P, 'prev'); await A(P, 'prev'); await A(P, 'hw:none'); await W(P, 100); await look('aucun clavier');
  await click(P, '#mwX'); await W(P, 150);
  await ev(P, () => window.__midi.reconnect(0)); await W(P, 400);
  await wiz(P); await W(P, 250); await A(P, 'totest'); await W(P, 150);
  await ev(P, () => { window.__midi.noteOn(60, 30); window.__midi.noteOn(64, 110); }); await W(P, 150); await A(P, 'tw:yes'); await look('M8');
  await A(P, 'range'); await W(P, 150); if (await ev(P, () => !!document.querySelector('#mwiz [data-a=rmeasure]'))) await A(P, 'rmeasure');
  await ev(P, () => { window.__midi.noteOn(36); window.__midi.noteOn(84); }); await W(P, 150); await look('M9');
  await A(P, 'rok'); await W(P, 200); await look('M10');
  await A(P, 'lat'); await W(P, 150); await A(P, 'latgo'); await W(P, 100); await look('calage');
  await click(P, '#mwX'); await P.ctx.close();
  // M12 (navigator without Web MIDI)
  P = await open({ mode: 'none', input: 'screen', viewport: { width: w, height: h } });
  await click(P, '#hsMidiBtn'); await W(P, 300); await look('M12');
  check(`CA-M15 aucun défilement dans l’assistant (${w}×${h})`, !bad.length, bad);
  await P.ctx.close();
}
// contrast of the main texts in the assistant (light and dark)
for (const scheme of ['light', 'dark']) {
  const ctx = await b.newContext({ viewport: { width: 1024, height: 768 }, locale: 'fr-FR', colorScheme: scheme });
  await ctx.addInitScript(INIT('ok')); await ctx.addInitScript(`(()=>{ const M=window.__midi; M.access.inputs.clear(); M.ports[0].state='disconnected'; })();`); await ctx.addInitScript(seed('screen'));
  P = await ctx.newPage(); await P.goto(URL); await W(P, 1200); await click(P, '#hsMidiBtn'); await W(P, 300);
  const low = await ev(P, () => { const lum = c => { const m = c.match(/[\d.]+/g).map(Number); const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(m[0]) + .7152 * f(m[1]) + .0722 * f(m[2]); };
    const bgOf = el => { while (el) { const c = getComputedStyle(el).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c) && !/, 0\)$/.test(c)) return c; el = el.parentElement; } return 'rgb(255,255,255)'; };
    const out = []; document.querySelectorAll('#mwiz h2, #mwiz .mw-opt b, #mwiz .mw-opt small, #mwiz .mw-sub, #mwiz .mw-go, #mwiz .mw-rt b, #mwiz .mw-rt small').forEach(e => { if (!e.offsetParent) return; const a = lum(getComputedStyle(e).color), bb = lum(bgOf(e)); const r = (Math.max(a, bb) + .05) / (Math.min(a, bb) + .05); if (r < 4.5) out.push(e.textContent.slice(0, 30) + ' ' + r.toFixed(2)); }); return out; });
  check(`CA-M15 contraste ≥ 4,5:1 dans M4 (${scheme})`, !low.length, low);
  await ctx.close();
}

await b.close();
console.log(fails.length ? `\n${fails.length} échec(s)` : '\nr25 OK');
process.exit(fails.length ? 1 : 0);
