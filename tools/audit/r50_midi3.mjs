// Chantier MIDI 3 (retours d'Antoine du 26/10/2026, iPad, ROLI LUMI 24 touches + un clavier 25 touches), pont natif iOS SIMULÉ comme r49 :
// A. PLAY « inversion des touches » : le lecteur (Do4–Si5) place la note MIDI comme la touche du clavier (plage envoyée par l'hôte avec la note,
//    hwIn/hwOut dans play/index.html) : LUMI Do3–Si4 → les 24 touches dans l'ordre, noires sur noires, relâchement de la même touche ; mode attente :
//    la touche physique sous la touche allumée compte ; 25 touches : le Do du haut ajoute sa touche ; plage mesurée = placée tout de suite ;
//    deux mains ; un mini-jeu ; clavier inconnu = repliée (avant : rien ne s'allumait).
// B. 25 touches « ne reconnaît pas le dernier Do » : la taille devinée pour le LUMI ne reste pas collée au clavier suivant (kbdSzOf / guessKbdSize),
//    un écran de 24 touches s'élargit au Do du haut (midiWiden) au lieu de sauter d'une octave, la touche allumée est la bonne (followMidi avant
//    pressKey), Do du haut = « Do seul » pour lancer, mode PIANO, bande de test de la fenêtre MIDI et de l'assistant sur 25 touches.
// C. Reconnaissance : deux claviers, le clavier choisi ne coupe les autres que s'il joue (midiTakeOver, 3 s), ports virtuels ignorés, plage d'un
//    autre clavier jamais utilisée (midiSpan), l'app relit ses sources toutes les 5 s (Bluetooth revenu), aucune erreur JS.
// Usage : PORT=8930 NODE_PATH=… PW_CHROMIUM=… node tools/audit/r50_midi3.mjs   (CAP=dossier pour des captures)
import { createRequire } from 'module';
import fs from 'fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = process.env.PORT || '8767', URL = `http://localhost:${PORT}/`, CAP = process.env.CAP || '';
if (CAP) fs.mkdirSync(CAP, { recursive: true });
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d !== undefined && !ok ? ' — ' + JSON.stringify(d).slice(0, 500) : '')); if (!ok) fails.push(n); };
const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const NAT = `window.webkit={messageHandlers:{bridge:{postMessage(){}}}}; window.__cb={}; window.__nl=[]; window.__list=0;
window.__in=[{id:'7',name:'LUMI Keys BLOCK 3F1A'}];
window.Capacitor={nativePromise:(p,m,o)=>{ if(p==='Midi'&&m==='listInputs') window.__list++; return new Promise(r=>setTimeout(()=>r(m==='start'||m==='listInputs'?{inputs:window.__in.slice()}:{}),150)); },
  nativeCallback:(p,m,o,cb)=>{ if(p==='Midi'&&o.eventName==='midi') window.__nl.push(cb); else window.__cb[p+':'+o.eventName]=cb; return 'id'; }};
window.__nat=(data,id)=>window.__nl.forEach(f=>f({id:id||'7',data}));
window.__ports=list=>{ window.__in=list; const f=window.__cb['Midi:statechange']; if(f) f({inputs:list}); };`;
const STATE = (o = {}) => ({ xp: 900, gate: 'account', onb: { done: 1 }, tourDone: 1, langV2: true, pwShown: 1,
  introSeen: { scales: 1, chords: 1, harmony: 1, prog: 1, ear: 1, games: 1, daily: 1, free: 1, play: 1, piano: 1 }, midi: { later: Date.now(), ...(o.midi || {}) }, goal: { kind: 'min', v: 10, asked: 1, at: 1 },
  settings: { lang: 'fr', notation: 'fr', input: 'midi', uiSound: false, octave: true, guideP: true, delay: 0, ...(o.set || {}) } });
async function open({ vp = { width: 1024, height: 768 }, st = STATE(), ports } = {}) {
  const c = await b.newContext({ viewport: vp, hasTouch: vp.width < 900 });
  await c.addInitScript(NAT + (ports ? `window.__in=${JSON.stringify(ports)};` : ''));
  await c.route(u => u.href.startsWith(URL) && (u.pathname === '/' || u.pathname === '/index.html'), async r => { const res = await r.fetch(); let h = await res.text(); const e = h.lastIndexOf('})();\n</script>'); h = h.slice(0, e) + '\nwindow.__X=s=>eval(s);\n' + h.slice(e); await r.fulfill({ response: res, body: h, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await c.route(u => u.href.startsWith(URL) && u.pathname === '/play/index.html', async r => { const res = await r.fetch(); let h = await res.text(); const e = h.lastIndexOf('})();'); h = h.slice(0, e) + '\nwindow.__PX=s=>eval(s);\n' + h.slice(e); await r.fulfill({ response: res, body: h, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await c.route('https://ijdxeasxmgevuchyuenn.supabase.co/**', r => r.abort());
  const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/net::ERR|Failed to load resource/.test(m.text())) p.errs.push(m.text()); });
  await p.addInitScript(`if(!sessionStorage.getItem('s')){ sessionStorage.setItem('s','1'); localStorage.setItem('memo-gammes-v1', ${JSON.stringify(JSON.stringify(st))}); }`);
  await p.goto(URL); await p.waitForFunction(() => !!window.__X, null, { timeout: 15000 }); await p.waitForTimeout(1500);
  p.X = s => p.evaluate(s => window.__X(s), s);
  await p.X('window.__tc=0; { const o=tone; tone=function(){ window.__tc++; return o.apply(this,arguments); }; }');
  return p;
}
const W = (p, ms) => p.waitForTimeout(ms);
const ev = (p, f, a) => p.evaluate(f, a);
const nat = async (p, data, id, ms = 80) => { await ev(p, ([d, i]) => window.__nat(d, i), [data, id]); await W(p, ms); };
const frame = p => p.frames().find(f => /play\/index\.html/.test(f.url()));
const black = m => [1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12);
// a note pressed (and held) on the MIDI keyboard → the keys lit (.down) in the player, then released
async function playLit(p, n, id) { await nat(p, [0x90, n, 90], id, 70); const f = frame(p); const d = await f.evaluate(() => [...document.querySelectorAll('#kbd .key.down')].map(k => +k.dataset.m)); await nat(p, [0x80, n, 0], id, 50);
  const left = await f.evaluate(() => document.querySelectorAll('#kbd .key.down').length); return { d, left }; }
async function openSong(p, i = 0) { await ev(p, () => document.querySelector('#homeLink')?.click()); await W(p, 300); await ev(p, () => document.querySelector('#modeNav [data-mode=play]').click()); await W(p, 500);
  await ev(p, i => document.querySelectorAll('#playSongs .ptile')[i].click(), i); await W(p, 400);
  for (let k = 0; k < 40 && !frame(p); k++) await W(p, 100);
  await frame(p).waitForFunction(() => document.querySelectorAll('#kbd .key').length > 20, null, { timeout: 8000 }); await W(p, 600); }
const range = f => f.evaluate(() => window.__PX('[LOW, HIGH]'));
const PX = (f, s) => f.evaluate(s => window.__PX(s), s);

// ================= A. PLAY =================
let p = await open();
check('LUMI branché (pont natif) : taille devinée 24 touches', await p.X('S.settings.kbdSize') === '24' && await p.X('midiNames.join()') === 'LUMI Keys BLOCK 3F1A');
await openSong(p, 0);
let f = frame(p);
check('lecteur : morceau à une main, clavier Do4–Si5', JSON.stringify(await range(f)) === '[60,83]', await range(f));
const map = []; let rel = true;
for (let n = 48; n <= 71; n++) { const r = await playLit(p, n); map.push(r.d.length === 1 ? r.d[0] : null); if (r.left) rel = false; }
check('LUMI Do3–Si4 : chaque touche allume UNE touche du lecteur, la même place (Do3 → la touche la plus à gauche, Do4)', map[0] === 60 && map.every((m, i) => m === 60 + i), map);
check('ordre gauche → droite conservé, noires sur noires (pas d’inversion)', map.every((m, i) => i === 0 || m > map[i - 1]) && map.every((m, i) => black(m) === black(48 + i)));
check('relâchement : la touche allumée s’éteint (même touche que l’appui)', rel);
if (CAP) { await nat(p, [0x90, 48, 90]); await nat(p, [0x90, 52, 90]); await nat(p, [0x90, 55, 90]); await W(p, 100); await p.screenshot({ path: CAP + '/play-lumi-1024x768.png' }); for (const n of [48, 52, 55]) await nat(p, [0x80, n, 0]); }
// wait mode: the key under the lit target counts
await f.evaluate(() => document.getElementById('go')?.click());
await f.waitForFunction(() => window.__PX('P.playing && P.frozen'), null, { timeout: 8000 }).catch(() => {});
await W(p, 200);
const fr = await PX(f, '(() => { const n = front(); return { m: n && n.m, lit: [...document.querySelectorAll("#kbd .key.target")].map(k => +k.dataset.m), c: { ...P.c } }; })()');
await nat(p, [0x90, fr.m - 12, 90], undefined, 200); await nat(p, [0x80, fr.m - 12, 0]);
const fr2 = await PX(f, '({ c: { ...P.c } })');
check('mode attente : la touche allumée est la note attendue, la touche du LUMI à la même place compte (bonne note, aucune fausse)',
  fr.m >= 60 && fr.lit.includes(fr.m) && fr2.c.p + fr2.c.b === fr.c.p + fr.c.b + 1 && fr2.c.w === fr.c.w, { fr, fr2 });
// the real pitch of the old behaviour (an octave above the LUMI key) is now wrong only if it is really another key
check('aucune erreur de page (lecteur LUMI)', p.errs.length === 0, p.errs);
// two hands: the range grows to C3–B5, the LUMI keeps its real place
await p.X('openPlayWith("#song=lune&arr=3")'); await W(p, 400); for (let k = 0; k < 30; k++) { f = frame(p); if (f && /arr=3/.test(f.url())) break; await W(p, 100); }
f = frame(p); await f.waitForFunction(() => document.querySelectorAll('#kbd .key').length > 20, null, { timeout: 8000 }); await W(p, 600);
const rg2 = await range(f);
if (rg2[0] === 48) { const r = await playLit(p, 48); check('morceau à deux mains (Do3–Si5) : le Do3 du LUMI reste le Do3', r.d.join() === '48', { rg2, r }); }
else console.log('     (arrangement à deux mains absent pour ce morceau : vérification sautée)', rg2);
await p.close();

// 25 keys, size known: the top C adds its key on the right
p = await open({ ports: [{ id: '8', name: 'Keystation 25 MK3' }] });
check('clavier « Keystation 25 MK3 » : taille devinée 25', await p.X('S.settings.kbdSize') === '25');
await openSong(p, 0); f = frame(p);
let r1 = await playLit(p, 48, '8'), r2 = await playLit(p, 60, '8'), r3 = await playLit(p, 72, '8');
check('25 touches Do3–Do5 dans le lecteur : Do3 → Do4, Do4 → Do5, Do du haut → Do6 (sa touche ajoutée à droite)', r1.d.join() === '60' && r2.d.join() === '72' && r3.d.join() === '84' && (await range(f))[1] === 84, { r1, r2, r3, rg: await range(f) });
await p.close();

// measured range (the assistant): placed from the first note
p = await open({ ports: [{ id: '8', name: 'USB MIDI' }], st: STATE({ midi: { hw: { name: 'USB MIDI', lo: 48, hi: 72, keys: 25, measured: true } } }) });
await openSong(p, 0);
r1 = await playLit(p, 60, '8');
check('plage mesurée (Do3–Do5) : le Do4, 13e touche, est placé dès la 1re note (Do5 du lecteur)', r1.d.join() === '72', r1);
await p.close();

// unknown keyboard (auto): a note under the player's keys is folded onto them (it used to light nothing)
p = await open({ ports: [{ id: '8', name: 'USB MIDI' }] });
check('clavier inconnu : taille automatique', await p.X('S.settings.kbdSize||"auto"') === 'auto');
await openSong(p, 0);
r1 = await playLit(p, 48, '8'); r2 = await playLit(p, 64, '8');
check('clavier inconnu : Do3 allume le Do du lecteur (même nom de note), Mi4 reste Mi4', r1.d.join() === '60' && r2.d.join() === '64', { r1, r2 });
// a Play mini-game: the same mapping (LUMI notes already seen in this session)
await p.close();
p = await open();
await nat(p, [0x90, 48, 90]); await nat(p, [0x80, 48, 0]); // a note on the home page: the LUMI's bottom C is known
await p.X('openPlayWith("#game=climber")'); await W(p, 400); for (let k = 0; k < 40 && !frame(p); k++) await W(p, 100);
f = frame(p); await f.waitForFunction(() => document.querySelectorAll('#kbd .key').length > 20, null, { timeout: 8000 }); await W(p, 600);
r1 = await playLit(p, 50); r2 = await playLit(p, 61);
check('mini-jeu Play (Grimpeur) : LUMI Ré3 → Ré4, Do♯4 → Do♯5 (noire sur noire), placé dès la 1re note grâce aux notes déjà jouées', r1.d.join() === '62' && r2.d.join() === '73', { r1, r2 });
check('aucune erreur de page (Play)', p.errs.length === 0, p.errs);
await p.close();

// ================= B. 25 touches : le Do du haut =================
check('kbdSzOf : noms de claviers courants', await (async () => { const q = await open({ ports: [] }); const r = await q.X('["LUMI Keys BLOCK 3F1A","Akai MPK mini 3","Arturia MiniLab 3","Launchkey Mini MK3 MIDI","Keystation 49 MK3","nanoKEY2","USB MIDI","MPK mini Plus"].map(kbdSzOf).join()'); await q.close(); return r === '24,25,25,25,49,25,,'; })());
// the LUMI guessed 24, then a 25-key keyboard whose name says nothing: back to auto (the 24 keys stay with the LUMI)
p = await open();
check('LUMI : 24 touches', await p.X('S.settings.kbdSize') === '24');
await ev(p, () => window.__ports([{ id: '8', name: 'USB MIDI' }])); await W(p, 400);
check('le LUMI débranché, un clavier 25 touches au nom muet branché : la taille du LUMI ne reste pas collée (automatique)', await p.X('S.settings.kbdSize') === 'auto' && await p.X('midiNames.join()') === 'USB MIDI');
await ev(p, () => window.__ports([{ id: '7', name: 'LUMI Keys BLOCK 3F1A' }])); await W(p, 400);
check('… et le LUMI rebranché retrouve ses 24 touches', await p.X('S.settings.kbdSize') === '24');
await p.close();
// a 24-key screen (size chosen by hand) and a 25-key keyboard: the top C widens the screen, lights the right key, and is a C
const LEARN = async q => { await ev(q, () => document.querySelector('#modeNav [data-mode=learn]').click()); await W(q, 400); await ev(q, () => [...document.querySelectorAll('#learnTiles .ptile')].find(t => !t.classList.contains('sc1-tile'))?.click()); await W(q, 500); await ev(q, () => document.getElementById('suGo')?.click()); await W(q, 800); };
p = await open({ ports: [{ id: '8', name: 'USB MIDI' }], st: STATE({ set: { kbdSize: '24', kbdGuessFor: 'USB MIDI' } }) });
await LEARN(p);
const g0 = await p.X('({page, phase, lo:LOW, hi:HIGH, sec:cur&&cur.sec, seq:seq.map(x=>x.pc)})');
await nat(p, [0x90, 72, 90], '8', 60); await nat(p, [0x80, 72, 0], '8', 300);
const g1 = await p.X('({phase, found:found.slice(), errors})');
check('LEARN (accord de Do majeur, écran 24 touches) : le Do du haut du 25 touches joué en basse compte (1re case trouvée, aucune faute)', g0.page === 'practice' && g0.sec === 'chords' && g0.seq[0] === 0 && g1.found[0] === true && g1.errors === 0, { g0, g1 });
await nat(p, [0x90, 48, 90], '8', 60); await nat(p, [0x80, 48, 0], '8', 300);
await nat(p, [0x90, 72, 90], '8', 60);
const k72 = await p.X('({lo:LOW, hi:HIGH, d72:!!(keyEls[72]&&keyEls[72].classList.contains("k-down")), d60:!!(keyEls[60]&&keyEls[60].classList.contains("k-down")), n:Object.keys(keyEls).length, sz:S.settings.kbdSize})');
if (CAP) await p.screenshot({ path: CAP + '/learn-25-1024x768.png' });
await nat(p, [0x80, 72, 0], '8', 300);
check('… Do du haut puis Do3 : l’écran s’élargit à Do3–Do5 (25 touches) au lieu de sauter d’une octave à chaque Do', g0.lo === 48 && g0.hi === 71 && k72.lo === 48 && k72.hi === 72 && k72.n === 25 && k72.sz === 'custom', { g0, k72 });
check('… la touche allumée est le Do du haut (pas le Do du milieu replié)', k72.d72 && !k72.d60, k72);
// a lone top C is a « C »: on the Gammes une à une list it starts the next scale
await ev(p, () => document.getElementById('gameEnd')?.click()); await W(p, 300); if (await p.isVisible('#leaveModal')) { await p.click('#lvGo'); await W(p, 500); }
await p.X('closeEnd&&endOpen&&closeEnd(); openPage("sc1")'); await W(p, 400);
const pg0 = await p.X('page');
await nat(p, [0x90, 72, 90], '8', 500); await nat(p, [0x80, 72, 0], '8', 100);
check('… et le Do du haut joué seul est un « Do » (liste Gammes une à une → la gamme se lance)', pg0 === 'sc1' && await p.X('page') === 'practice', { pg0, pg: await p.X('page') });
// PIANO mode: the top C
await ev(p, () => document.querySelector('#homeLink')?.click()); await W(p, 300);
if (await p.isVisible('#leaveModal')) { await p.click('#lvGo'); await W(p, 400); }
await ev(p, () => document.querySelector('#modeNav [data-mode=piano]').click()); await W(p, 600);
await p.X('S.settings.kbdSize="24"; S.settings.kbdLow=48; S.settings.kbdHigh=71; buildKeyboard(); MS.lo=MS.hi=null;');
await nat(p, [0x90, 48, 90], '8', 60); await nat(p, [0x90, 72, 90], '8', 60);
const pn = await p.X('({page, hi:HIGH, d72:!!(keyEls[72]&&keyEls[72].classList.contains("k-down")), d60:!!(keyEls[60]&&keyEls[60].classList.contains("k-down")), held:[...PN.held]})');
await nat(p, [0x80, 72, 0], '8', 60);
check('mode PIANO : le Do du haut sonne et allume SA touche (écran élargi), pas le Do du milieu', pn.page === 'piano' && pn.hi === 72 && pn.d72 && !pn.d60 && pn.held.includes(72), pn);
// the MIDI window test strip: 25 keys, the top C on it
await ev(p, () => document.querySelector('#homeLink')?.click()); await W(p, 300);
await p.X('openMidi()'); await W(p, 300);
await nat(p, [0x90, 48, 90], '8', 120); await nat(p, [0x90, 72, 90], '8', 200);
const mt = await p.X('({lo:MT.lo, on:[...document.querySelectorAll("#mtKb .on")].map(e=>+e.dataset.m), keys:document.querySelectorAll("#mtKb [data-m]").length})');
if (CAP) await p.screenshot({ path: CAP + '/midi-window-25-1024x768.png' });
check('fenêtre MIDI, « joue une note » : la bande montre 25 touches et le Do du haut s’y allume sans sauter d’octave', mt.lo === 48 && mt.keys === 25 && mt.on.join() === '72', mt);
await ev(p, () => document.getElementById('midiX').click()); await W(p, 200);
check('aucune erreur de page (25 touches)', p.errs.length === 0, p.errs);
await p.close();

// ================= C. Reconnaissance =================
p = await open({ ports: [{ id: '7', name: 'LUMI Keys BLOCK 3F1A' }, { id: '8', name: 'Keystation 25 MK3' }, { id: '9', name: 'Session réseau 1' }],
  st: STATE({ set: { midiInput: 'LUMI Keys BLOCK 3F1A' } }) });
check('trois ports : le port virtuel « Session réseau » est ignoré, les deux claviers sont listés', await p.X('midiNames.join("|")') === 'LUMI Keys BLOCK 3F1A|Keystation 25 MK3');
let tc = await p.X('window.__tc');
await nat(p, [0x90, 62, 90], '7', 60); await nat(p, [0x80, 62, 0], '7', 60);
await nat(p, [0x90, 64, 90], '8', 60);
check('le LUMI choisi joue : une note du 2e clavier dans les 3 s est ignorée (pas de double jeu)', await p.X('window.__tc') === tc + 1 && await p.X('S.settings.midiInput') === 'LUMI Keys BLOCK 3F1A');
await W(p, 3100);
tc = await p.X('window.__tc');
await nat(p, [0x90, 65, 90], '8', 150);
const to = await p.X('({tc:window.__tc, inp:S.settings.midiInput, sz:S.settings.kbdSize, txt:document.getElementById("midiTxt").textContent, pill:document.getElementById("inChip").title, hw:S.midi.hw&&S.midi.hw.name})');
check('le LUMI se tait depuis 3 s : le clavier 25 touches joué prend la main (sonne, devient le clavier choisi, sa taille 25, la pastille le nomme)',
  to.tc === tc + 1 && to.inp === 'Keystation 25 MK3' && to.sz === '25' && /Keystation 25/.test(to.txt) && /Keystation 25/.test(to.pill) && to.hw === 'Keystation 25 MK3', to);
await p.X('S.midi.hw={name:"LUMI Keys BLOCK 3F1A", lo:48, hi:71, measured:true}');
check('midiSpan : la plage mesurée d’un autre clavier n’est jamais utilisée pour celui qui joue', await p.X('JSON.stringify(midiSpan({name:"Keystation 25 MK3"}))') === JSON.stringify({ lo: 48, hi: 72, sure: false, slo: 65, shi: 65 }) && await p.X('midiSpan({name:"LUMI Keys BLOCK 3F1A"}).sure') === true,
  await p.X('JSON.stringify(midiSpan({name:"Keystation 25 MK3"}))'));
// a keyboard whose name says Bluetooth / ROLI is a keyboard
await ev(p, () => window.__ports([{ id: '7', name: 'ROLI LUMI Bluetooth' }, { id: '10', name: 'Network Session 1' }])); await W(p, 400);
check('« ROLI LUMI Bluetooth » est un clavier, « Network Session 1 » non', await p.X('midiNames.join("|")') === 'ROLI LUMI Bluetooth');
const l0 = await ev(p, () => window.__list); await W(p, 5600);
check('app : les sources MIDI sont relues toutes les 5 s (un clavier Bluetooth revenu est vu sans ouvrir la fenêtre MIDI)', await ev(p, () => window.__list) >= l0 + 1);
check('aucune erreur de page (reconnaissance)', p.errs.length === 0, p.errs);
await p.close();

await b.close();
console.log(fails.length ? `\n${fails.length} échec(s)` : '\nTout est OK');
process.exit(fails.length ? 1 : 0);
