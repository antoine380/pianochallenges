// Chantier MIDI 4 (retours d'Antoine du 28/10/2026, iPad, app, ROLI LUMI 24 touches), pont natif iOS SIMULÉ comme r49/r50 :
// A. fenêtre Clavier MIDI : ni force, ni « Sensible au toucher », ni « Tu entends le son deux fois ? » ; une seule ligne
//    « Reconnu : ROLI LUMI Keys · 24 touches · Bluetooth » (plus de ligne d'état au-dessus de « Assistant de connexion ») ; plus de
//    « Détecter mon clavier MIDI » ; mini-clavier du test = exactement 24 touches (pas de Do4), décalé d'une octave pour 60–83.
// B. touches exactes : écran LUMI 24 (48–71 puis 60–83, jamais 36 touches), 25 touches garde son Do du haut, 49, 61, 88 (écran + bande),
//    une taille « détectée » d'un autre clavier remise à 24 (kbdFit), assistant (étape test) sans force.
// C. « Signaler un problème avec mon clavier » : la fenêtre de signalement, pré-remplie d'un diagnostic (ports, port choisi, modèle, plage…).
// D. modes d'entrée exclusifs : écran = MIDI ignoré (pas de son, de note, de commande Do/Si, pastille « Écran »), le toast « Utiliser »
//    bascule ; micro = MIDI ignoré et l'écran n'est qu'un affichage ; MIDI = micro coupé ; restent à l'écoute : fenêtre de test, assistant, quiz.
// E. libellé « Mode d'entrée » (EN « Input mode »).
// F. alerte « Nouveau signalement » : dans l'app (faux SDK : am_i_admin + admin_feedback_peek ; non admin et fonction absente = rien)
//    et dans /admin (FAKE_ADMIN, ?poll=, fenêtre #fbPop → écran Support sur le message).
// Usage : PORT=8975 NODE_PATH=… PW_CHROMIUM=… node tools/audit/r54_midi4.mjs   (CAP=dossier pour les captures)
import { createRequire } from 'module';
import fs from 'fs';
import { FAKE_ADMIN } from './fakesb.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = process.env.PORT || '8767', URL = `http://localhost:${PORT}/`, CAP = process.env.CAP || '';
if (CAP) fs.mkdirSync(CAP, { recursive: true });
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d !== undefined && !ok ? ' — ' + JSON.stringify(d).slice(0, 500) : '')); if (!ok) fails.push(n); };
const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const LUMI = 'LUMI Keys BLOCK 3F1A';
const NAT = `window.webkit={messageHandlers:{bridge:{postMessage(){}}}}; window.__cb={}; window.__nl=[]; window.__list=0;
window.__in=[{id:'7',name:'${LUMI}'}];
window.Capacitor={nativePromise:(p,m,o)=>{ if(p==='Midi'&&m==='listInputs') window.__list++; return new Promise(r=>setTimeout(()=>r(m==='start'||m==='listInputs'?{inputs:window.__in.slice()}:{}),150)); },
  nativeCallback:(p,m,o,cb)=>{ if(p==='Midi'&&o.eventName==='midi') window.__nl.push(cb); else window.__cb[p+':'+o.eventName]=cb; return 'id'; }};
window.__nat=(data,id)=>window.__nl.forEach(f=>f({id:id||'7',data}));
window.__ports=list=>{ window.__in=list; const f=window.__cb['Midi:statechange']; if(f) f({inputs:list}); };`;
const STATE = (o = {}) => ({ xp: 900, gate: 'account', onb: { done: 1 }, tourDone: 1, langV2: true, pwShown: 1,
  introSeen: { scales: 1, chords: 1, harmony: 1, prog: 1, ear: 1, games: 1, daily: 1, free: 1, play: 1, piano: 1 }, midi: { later: Date.now(), seenAt: Date.now(), ...(o.midi || {}) }, goal: { kind: 'min', v: 10, asked: 1, at: 1 },
  settings: { sc1Tour: 1, lang: 'fr', notation: 'fr', input: 'midi', uiSound: false, octave: true, delay: 0, ...(o.set || {}) } });
async function open({ vp = { width: 1024, height: 768 }, st = STATE(), ports } = {}) {
  const c = await b.newContext({ viewport: vp, hasTouch: vp.width < 900 });
  await c.addInitScript(NAT + (ports ? `window.__in=${JSON.stringify(ports)};` : ''));
  await c.route(u => u.href.startsWith(URL) && (u.pathname === '/' || u.pathname === '/index.html'), async r => { const res = await r.fetch(); let h = await res.text(); const e = h.lastIndexOf('})();\n</script>'); h = h.slice(0, e) + '\nwindow.__X=s=>eval(s);\n' + h.slice(e); await r.fulfill({ response: res, body: h, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await c.route('https://ijdxeasxmgevuchyuenn.supabase.co/**', r => r.abort());
  const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/net::ERR|Failed to load resource/.test(m.text())) p.errs.push(m.text()); });
  await p.addInitScript(`if(!sessionStorage.getItem('s')){ sessionStorage.setItem('s','1'); localStorage.setItem('memo-gammes-v1', ${JSON.stringify(JSON.stringify(st))}); }`);
  await p.goto(URL); await p.waitForFunction(() => !!window.__X, null, { timeout: 15000 }); await p.waitForTimeout(1800);
  p.X = s => p.evaluate(s => window.__X(s), s);
  await p.X('window.__tc=0; window.__mi=0; window.__qi=0; { const o=tone; tone=function(){ window.__tc++; return o.apply(this,arguments); }; } { const o=midiIn; midiIn=function(){ window.__mi++; return o.apply(this,arguments); }; } { const o=quizIn; quizIn=function(){ window.__qi++; return o.apply(this,arguments); }; }');
  return p;
}
const W = (p, ms) => p.waitForTimeout(ms);
const ev = (p, f, a) => p.evaluate(f, a);
const nat = async (p, data, id, ms = 90) => { await ev(p, ([d, i]) => window.__nat(d, i), [data, id]); await W(p, ms); };
const note = async (p, n, id) => { await nat(p, [0x90, n, 90], id, 60); await nat(p, [0x80, n, 0], id, 60); };
const keys = (p, sel) => ev(p, sel => { const a = [...document.querySelectorAll(sel + ' [data-m]')].map(e => +e.dataset.m); return { n: a.length, lo: Math.min(...a), hi: Math.max(...a) }; }, sel);
const vis = (p, id) => ev(p, id => { const e = document.getElementById(id); return !!e && !e.hidden && getComputedStyle(e).display !== 'none'; }, id);
const waitFor = async (p, f, ms = 5000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(p, f)) return true; await W(p, 100); } return false; };

// ================= A. fenêtre Clavier MIDI =================
let p = await open({ st: STATE({ midi: { hw: { name: LUMI, conn: 'bt' } } }) });
check('LUMI branché : modèle reconnu dans le catalogue (24 touches)', await waitFor(p, () => true) && /^LUMI Keys[^|]*\|24\|24$/.test(await p.X('(S.midi.hw.model||"")+"|"+S.midi.hw.keys+"|"+S.settings.kbdSize')), await p.X('JSON.stringify(S.midi.hw)+S.settings.kbdSize'));
let K = await keys(p, '#kbd');
check('écran : exactement 24 touches (Do2–Si3, 48–71)', K.n === 24 && K.lo === 48 && K.hi === 71, K);
await ev(p, () => document.getElementById('inChip').click()); await W(p, 400);
check('la pastille ouvre la fenêtre Clavier MIDI', await vis(p, 'midiModal') && await vis(p, 'mdTest'));
const txt = await ev(p, () => document.getElementById('midiModal').innerText);
check('ni force, ni « Sensible au toucher », ni « deux fois » (fenêtre)', !/force|Sensible au toucher|deux fois|Appuie fort|Je n'entends rien/i.test(txt) && await ev(p, () => !document.querySelector('#midiModal .mt-vel, #mtTwice, #mtTouch')), txt.slice(0, 300));
check('plus de « Détecter mon clavier MIDI »', await ev(p, () => !document.getElementById('kbDetect')) && !/Détecter mon clavier/.test(txt));
const lines = await ev(p, () => ({ st: getComputedStyle(document.querySelector('#midiModal .midi-status')).display, li: [...document.querySelectorAll('#mDevList li')].map(l => l.textContent) }));
check('une seule ligne de reconnaissance : « Reconnu : ROLI LUMI Keys · 24 touches · Bluetooth »', lines.st === 'none' && lines.li.length === 1 && /^Reconnu : ROLI LUMI Keys( 1)? · 24 touches · Bluetooth$/.test(lines.li[0]) && (txt.match(/LUMI/g) || []).length === 1, { lines, n: (txt.match(/LUMI/g) || []).length });
check('le lien « Assistant de connexion » et le nom du clavier restent', /Assistant de connexion/.test(txt) && await ev(p, () => document.querySelector('#mDevList li').title === 'LUMI Keys BLOCK 3F1A'));
K = await keys(p, '#mtKb');
check('mini-clavier du test : 24 touches, pas de Do4', K.n === 24 && K.lo === 48 && K.hi === 71 && !/Do4/.test(await ev(p, () => document.getElementById('mtKb').textContent)), K);
await note(p, 64);
check('la note jouée s’affiche et s’allume (Mi, Do… gardé)', await ev(p, () => document.getElementById('mtName').textContent === 'Mi' && [...document.querySelectorAll('#mtKb .on')].map(e => +e.dataset.m).join() === '64'));
await note(p, 79);
K = await keys(p, '#mtKb');
check('LUMI décalé d’une octave (Sol 79) : la bande passe à 60–83, toujours 24 touches', K.n === 24 && K.lo === 60 && K.hi === 83, K);
check('son de l’app inchangé, réglage toujours là', await p.X('S.settings.midiSound') === true && await ev(p, () => !!document.getElementById('optMidiSound')));
if (CAP) { await note(p, 64); await p.screenshot({ path: CAP + '/fenetre-midi-1024x768.png' }); }
// C. signalement
await ev(p, () => document.getElementById('mdReport').click()); await W(p, 400);
const fb = await ev(p, () => ({ on: !document.getElementById('fbModal').hidden, v: document.getElementById('fbMsg').value, midi: !document.getElementById('midiModal').hidden }));
check('« Signaler un problème avec mon clavier » ouvre la fenêtre de signalement (fenêtre MIDI fermée)', fb.on && !fb.midi, fb);
check('… pré-remplie : ports, port choisi, modèle, plage, notes, écran, mode d’entrée, version', /Diagnostic du clavier MIDI/.test(fb.v) && /Ports vus : LUMI Keys BLOCK 3F1A/.test(fb.v) && /Port choisi/.test(fb.v) && /Modèle reconnu : ROLI LUMI Keys[^\n]* · 24 touches/.test(fb.v)
  && /Plage : Do2–Si3 \(48–71, 24 touches/.test(fb.v) && /Notes jouées : 64–79/.test(fb.v) && /Clavier à l'écran : 24/.test(fb.v) && /Mode d'entrée : clavier MIDI/.test(fb.v) && /Version web : /.test(fb.v) && /Appareil : [^\n]*app Piano Challenges/.test(fb.v), fb.v);
check('… le joueur écrit en tête (curseur au début, 2 lignes libres)', fb.v.startsWith('\n\n') && await ev(p, () => document.getElementById('fbMsg').selectionStart === 0 && document.activeElement.id === 'fbMsg'));
await ev(p, () => { const m = document.getElementById('fbMsg'); m.value = 'Le Do du haut manque' + m.value; }); await ev(p, () => document.getElementById('fbSend').click()); await W(p, 400);
check('… envoi (en local : rien n’est envoyé) : fenêtre fermée, merci', await ev(p, () => document.getElementById('fbModal').hidden));
// B. écran 24 touches : LUMI 48–71 puis 60–83, jamais élargi à 36
await ev(p, () => document.querySelector('#modeNav [data-mode=learn]').click()); await W(p, 300);
await p.X('openPage("free")'); await W(p, 200);
await note(p, 48); await note(p, 71);
K = await keys(p, '#kbd'); check('LUMI 48–71 : écran 48–71', K.n === 24 && K.lo === 48 && K.hi === 71, K);
await note(p, 83); await note(p, 72);
K = await keys(p, '#kbd'); check('LUMI 60–83 (octave +) : écran décalé 60–83, 24 touches (pas élargi à 36)', K.n === 24 && K.lo === 60 && K.hi === 83, K);
await note(p, 50);
K = await keys(p, '#kbd'); check('retour 48–71 : 24 touches', K.n === 24 && K.lo === 48 && K.hi === 71, K);
await p.X('Object.assign(S.settings,{kbdSize:"custom",kbdLow:48,kbdHigh:72}); buildKeyboard(); kbdFit();'); K = await keys(p, '#kbd');
check('une taille « détectée » de 25 touches restée d’avant : remise aux 24 touches du LUMI (kbdFit)', K.n === 24 && K.lo === 48 && K.hi === 71, K);
check('aucune erreur de page (A–C)', p.errs.length === 0, p.errs);
await p.close();

// B. autres tailles : écran + bande du test
for (const [nm, n, lo, hi] of [['MPK mini 3', 25, 48, 72], ['Keystation 49 MK3', 49, 36, 84], ['Keystation 61 MK3', 61, 36, 96], ['Keystation 88 MK3', 88, 21, 108]]) {
  p = await open({ ports: [{ id: '9', name: nm }], st: STATE() });
  await note(p, 60, '9');
  const S0 = await keys(p, '#kbd');
  await ev(p, () => document.getElementById('inChip').click()); await W(p, 300); await note(p, 60, '9');
  const B0 = await keys(p, '#mtKb');
  check(`${nm} : écran ${n} touches (${lo}–${hi}) et bande du test ${n} touches`, S0.n === n && S0.lo === lo && S0.hi === hi && B0.n === n && B0.lo === lo && B0.hi === hi, { S0, B0, sz: await p.X('S.settings.kbdSize'), hw: await p.X('JSON.stringify(S.midi.hw)') });
  if (n === 25) { await ev(p, () => document.getElementById('midiX').click()); await p.X('openPage("free")'); await W(p, 200); await note(p, 72, '9');
    K = await keys(p, '#kbd'); check('25 touches : le Do du haut (72) est à l’écran, sans décalage', K.n === 25 && K.lo === 48 && K.hi === 72, K); }
  check(`aucune erreur de page (${nm})`, p.errs.length === 0, p.errs);
  await p.close();
}
// l'assistant : étape test sans force, bande 24 touches pour le LUMI
p = await open({ st: STATE({ midi: { hw: { name: LUMI } } }) });
await W(p, 600); await p.X('mwOpen("test")'); await W(p, 300); await note(p, 62);
const mw = await ev(p, () => ({ t: document.getElementById('mwBody').innerText, n: document.querySelectorAll('#mwBody .mw-kb [data-m]').length, hi: Math.max(...[...document.querySelectorAll('#mwBody .mw-kb [data-m]')].map(e => +e.dataset.m)) }));
check('assistant (étape test) : ni force ni « deux fois », bande 24 touches (48–71)', !/Sensible|deux fois|Appuie fort|Force/.test(mw.t) && mw.n === 24 && mw.hi === 71, mw);
await p.X('mwClose()'); await W(p, 200);

// ================= D. modes d'entrée exclusifs =================
await p.X('openPage("free")'); await W(p, 200);
let c0 = await p.X('[window.__tc, window.__mi].join()');
await note(p, 60);
check('MIDI : la note joue (son + note)', await p.X('[window.__tc, window.__mi].join()') !== c0);
// écran, par le choix de l'entrée
await ev(p, () => document.getElementById('inChip').click()); await W(p, 300); await ev(p, () => document.getElementById('mdChange').click()); await W(p, 300);
check('E. le choix de l’entrée s’appelle « Mode d’entrée »', await ev(p, () => document.getElementById('inTitle').textContent) === "Mode d'entrée" && await p.X('TXT.en.inChange') === 'Input mode');
await ev(p, () => [...document.querySelectorAll('#inOpts .inp-opt')].find(b => /écran/i.test(b.textContent)).click()); await W(p, 400);
check('écran choisi : S.settings.input = screen, pastille « Écran » (pas verte)', await p.X('S.settings.input') === 'screen' && await ev(p, () => document.getElementById('inChip').dataset.st) === 'screen', await ev(p, () => document.getElementById('inChip').dataset.st));
c0 = await p.X('[window.__tc, window.__mi].join()');
await note(p, 60); await note(p, 64);
check('écran : les notes MIDI sont ignorées (ni son ni note)', await p.X('[window.__tc, window.__mi].join()') === c0, [c0, await p.X('[window.__tc, window.__mi].join()')]);
await ev(p, () => { const k = document.querySelector('#kbd [data-m="62"]'); k.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 3 })); k.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 3 })); }); await W(p, 100);
check('écran : le toucher de l’écran joue', await p.X('window.__mi') > +c0.split(',')[1]);
// Do / Si : pas de commande (fenêtre « Quitter la partie ? » ouverte à la main = LV.on)
await p.X('openPage("learn")'); await W(p, 200);
const lv0 = await p.X('LV.on'); await p.X('LV.on=true; window.__lvn=0; { const o=lvNote; lvNote=function(){ window.__lvn++; return o.apply(this,arguments); }; }'); await note(p, 60); await note(p, 71);
check('écran : Do / Si MIDI ne sont pas des commandes', await p.X('window.__lvn') === 0); await p.X('LV.on=' + JSON.stringify(lv0));
// la fenêtre de test entend toujours le clavier, et propose « Utiliser ce clavier »
await ev(p, () => document.getElementById('inChip').click()); await W(p, 300); await note(p, 67);
check('écran : la fenêtre Clavier MIDI teste quand même le clavier (Sol)', await ev(p, () => document.getElementById('mtName').textContent) === 'Sol');
check('… « Entrée choisie : écran » + « Utiliser ce clavier »', await ev(p, () => /Entrée choisie : écran/.test(document.getElementById('mStTxt').textContent) && !document.getElementById('md4Use').hidden && getComputedStyle(document.querySelector('#midiModal .midi-status')).display !== 'none'));
if (CAP) await p.screenshot({ path: CAP + '/fenetre-midi-ecran-1024x768.png' });
await ev(p, () => document.getElementById('midiX').click()); await W(p, 200);
// l'assistant entend aussi
await p.X('mwOpen("test")'); await W(p, 200); await note(p, 65);
check('écran : l’assistant entend le clavier (étape test)', await p.X('MW.t && MW.t.n') >= 1); await p.X('mwClose()'); await W(p, 200);
// quiz : un clavier par joueur, MIDI toujours écouté
await p.X('openPage("quiz")'); await W(p, 300); const q0 = await p.X('window.__qi'); await note(p, 60);
check('écran : le quiz écoute toujours les claviers MIDI', await p.X('window.__qi') > q0 || await p.X('anyModal()'), await p.X('[window.__qi, anyModal(), QZ.view]'));
await p.X('openPage("hub")'); await W(p, 300);
// un 2e clavier branché en écran : toast « Utiliser », ses notes ignorées tant qu'il n'est pas choisi
await ev(p, () => window.__ports([{ id: '7', name: 'LUMI Keys BLOCK 3F1A' }, { id: '8', name: 'Roland FP-30X' }])); await W(p, 500);
const tst = await ev(p, () => { const e = document.getElementById('mdToast'); return e && e.classList.contains('on') ? e.innerText : ''; });
check('écran : un clavier branché = toast « Clavier détecté : … » + Utiliser', /Clavier détecté/.test(tst) && await ev(p, () => !!document.querySelector('#mdToast button')), tst);
await p.X('openPage("free")'); await W(p, 200); c0 = await p.X('window.__mi'); await note(p, 60, '8');
check('… ses notes ne jouent pas tant qu’il n’est pas choisi', await p.X('window.__mi') === c0);
await p.X('openPage("hub")'); await W(p, 200);
await ev(p, () => window.__ports([{ id: '7', name: 'LUMI Keys BLOCK 3F1A' }])); await W(p, 300);
await ev(p, () => window.__ports([{ id: '7', name: 'LUMI Keys BLOCK 3F1A' }, { id: '8', name: 'Roland FP-30X' }])); await W(p, 500);
await ev(p, () => document.querySelector('#mdToast button')?.click()); await W(p, 400);
check('« Utiliser » : entrée MIDI, pastille verte', await p.X('S.settings.input') === 'midi' && await ev(p, () => document.getElementById('inChip').dataset.st) === 'ok');
// micro
await p.X('setInput("mic")'); await W(p, 300); await p.X('openPage("free")'); await W(p, 200);
c0 = await p.X('[window.__tc, window.__mi].join()');
await note(p, 60);
await ev(p, () => { const k = document.querySelector('#kbd [data-m="62"]'); k.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 4 })); k.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 4 })); }); await W(p, 100);
await p.keyboard.press('KeyA'); await W(p, 100);
check('micro : MIDI ignoré, l’écran et les lettres ne jouent pas (affichage)', await p.X('[window.__tc, window.__mi].join()') === c0, [c0, await p.X('[window.__tc, window.__mi].join()')]);
check('micro : la pastille dit le micro', /^mic/.test(await ev(p, () => document.getElementById('inChip').dataset.st)));
// mode PIANO en micro : l'écran n'y joue pas non plus
await p.X('openPage("piano")'); await W(p, 300); const pv = await p.X('PN.all.length');
await ev(p, () => { const k = document.querySelector('#kbd [data-m="64"]'); if (k) { k.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 5 })); k.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 5 })); } }); await W(p, 80);
check('micro : mode PIANO, l’écran ne joue pas', await p.X('PN.all.length') === pv);
// MIDI : micro coupé
await p.X('micOn=true'); await p.X('setInput("midi")'); await W(p, 300);
check('MIDI : le micro est coupé', await p.X('micOn') === false && await p.X('S.settings.input') === 'midi');
await p.X('openPage("free")'); await W(p, 200); c0 = await p.X('window.__mi'); await note(p, 60);
check('MIDI : la note joue', await p.X('window.__mi') > c0);
check('aucune erreur de page (D)', p.errs.length === 0, p.errs);
await p.close();

// ================= F. alerte admin dans l'app (faux SDK) =================
p = await open();
const FAKE = (o) => `sb={rpc:async(n,a)=>{ window.__rpc=(window.__rpc||[]).concat(n); ${o} }}; user={id:'00000000-0000-0000-0000-0000000000ad'}; ADM.is=null; ADM.uid=''; ADM.off=false;`;
await p.X(FAKE(`if(n==='am_i_admin') return {data:false,error:null}; return {data:null,error:{message:'forbidden'}};`)); await p.X('admTick()'); await W(p, 200);
check('non admin : am_i_admin faux, aucun autre appel', await p.X('ADM.is') === false && await p.X('window.__rpc.join()') === 'am_i_admin');
await p.X(FAKE(`return {data:null,error:{message:'Could not find the function public.am_i_admin', code:'PGRST202'}};`)); await p.X('window.__rpc=[]; admTick()'); await W(p, 200);
check('fonction absente : silencieux, plus aucun appel', await p.X('ADM.off') === true && p.errs.length === 0);
await p.X(FAKE(`if(n==='am_i_admin') return {data:true,error:null}; if(n==='admin_feedback_peek') return {data:window.__peek(a),error:null}; return {data:null,error:null};`));
await p.X(`window.__fb=[{id:41,at:new Date().toISOString(),kind:'bug',name:'Paul',msg:'Ancien message'}]; window.__peek=a=>({max:Math.max(0,...window.__fb.map(r=>r.id)), new:window.__fb.length, rows:window.__fb.filter(r=>r.id>a.p_after)});`);
await p.X('admTick()'); await W(p, 300);
const n0 = await p.X('ntfStore().list.length');
check('admin, premier passage : point de départ, pas d’alerte pour les anciens', await p.X('localStorage.getItem("pc-adm-fb-00000000")') === '41' && await ev(p, () => !document.getElementById('mdToast')?.classList.contains('on')));
await p.X(`window.__fb.push({id:42,at:new Date().toISOString(),kind:'bug',name:'Léa',msg:'Le Do du haut manque — Diagnostic du clavier MIDI'})`); await p.X('admTick()'); await W(p, 400);
const al = await ev(p, () => { const e = document.getElementById('mdToast'); return { on: !!e && e.classList.contains('on'), t: e ? e.innerText : '', btn: e ? (e.querySelector('button') || {}).textContent : '' }; });
check('admin : nouveau signalement = petite fenêtre « Nouveau signalement de Léa : … » + « Ouvrir le back office »', al.on && /Nouveau signalement de Léa/.test(al.t) && /Le Do du haut manque/.test(al.t) && al.btn === 'Ouvrir le back office', al);
const nt = await p.X('JSON.stringify(ntfStore().list[0])');
check('admin : notification dans la cloche (lien vers /admin)', await p.X('ntfStore().list.length') === n0 + 1 && /fb-42/.test(nt) && /"k":"admin"/.test(nt) && await ev(p, () => !document.getElementById('ntfBadge').hidden), nt);
await p.X('window.__open=[]; window.open=(u)=>window.__open.push(u);'); await p.X('ntfDo({k:"admin"})');
check('… le lien ouvre /admin/', /\/admin\/$/.test(await p.X('window.__open[0]')), await p.X('window.__open'));
await p.X('admTick()'); await W(p, 200);
check('… une seule fois (pas de doublon au passage suivant)', await p.X('ntfStore().list.filter(n=>n.id==="fb-42").length') === 1);
check('aucune erreur de page (F app)', p.errs.length === 0, p.errs);
if (CAP) { await p.X(`window.__fb.push({id:43,at:new Date().toISOString(),kind:'bug',name:'Léa',msg:'Mon LUMI affiche 25 touches'})`); await p.X('admTick()'); await W(p, 500); await p.screenshot({ path: CAP + '/alerte-admin-app-1024x768.png' }); }
await p.close();

// ================= F. alerte dans /admin =================
{ const c = await b.newContext({ viewport: { width: 1280, height: 800 } });
  await c.route('**/assets/js/supabase-*.js', r => r.fulfill({ status: 200, body: FAKE_ADMIN, headers: { 'content-type': 'application/javascript' } }));
  await c.route('https://ijdxeasxmgevuchyuenn.supabase.co/**', r => r.abort());
  const a = await c.newPage(); a.errs = []; a.on('pageerror', e => a.errs.push(e.message)); a.on('console', m => { if (m.type() === 'error' && !/net::ERR|Failed to load resource/.test(m.text())) a.errs.push(m.text()); });
  await a.addInitScript('window.__ADM={}; if(!sessionStorage.getItem("x")){ sessionStorage.setItem("x","1"); localStorage.removeItem("pc-admin-fbmax"); }');
  await a.goto(URL + 'admin/?poll=400'); await a.waitForTimeout(500);
  await a.fill('#lgEmail', 'antoine@example.com'); await a.fill('#lgPass', 'secret'); await a.click('#lgGo'); await a.waitForTimeout(300);
  if (await a.isVisible('#lgEnroll')) { await a.fill('#lgCode1', '123456'); await a.click('#lgEnroll button[type=submit]'); } else { await a.fill('#lgCode2', '123456'); await a.click('#lgCode button[type=submit]'); }
  await a.waitForTimeout(2000);
  check('/admin : premier passage = point de départ, pas de fenêtre', await a.evaluate(() => localStorage.getItem('pc-admin-fbmax')) === '2' && await a.evaluate(() => !document.getElementById('fbPop') || document.getElementById('fbPop').hidden));
  await a.evaluate(() => { window.__ADM.fbExtra = [{ id: 9, at: new Date().toISOString(), kind: 'bug', msg: 'Le Do du haut manque\n\n— Diagnostic du clavier MIDI —', contact: null, ctx: { midi: 'LUMI Keys BLOCK' }, status: 'new', note: null, user_id: null, name: 'Léa' }]; });
  await a.waitForTimeout(900);
  const pop = await a.evaluate(() => { const e = document.getElementById('fbPop'); return e && !e.hidden ? e.innerText : ''; });
  check('/admin : nouveau signalement = fenêtre « Nouveau signalement » (Léa, LUMI, extrait)', /Nouveau signalement/.test(pop) && /Léa/.test(pop) && /LUMI Keys BLOCK/.test(pop) && /Le Do du haut manque/.test(pop), pop);
  if (CAP) await a.screenshot({ path: CAP + '/alerte-admin-backoffice-1280x800.png' });
  await a.click('#fbPopGo'); await a.waitForTimeout(600);
  check('/admin : « Voir le signalement » = écran Support, le message mis en avant', await a.evaluate(() => /Support/.test(document.getElementById('pgTitle').textContent) && !!document.querySelector('.fb.hl[data-id="9"]') && document.getElementById('fbPop').hidden));
  await a.waitForTimeout(900);
  check('/admin : pas de seconde fenêtre pour le même message', await a.evaluate(() => document.getElementById('fbPop').hidden));
  check('aucune erreur de page (/admin)', a.errs.length === 0, a.errs);
  await c.close(); }

// captures de la fenêtre Clavier MIDI : iPad 1024×768 et 375×667
if (CAP) for (const vp of [{ width: 1024, height: 768 }, { width: 375, height: 667 }]) {
  p = await open({ vp, st: STATE({ midi: { hw: { name: LUMI, conn: 'bt' } } }) });
  await p.X('mdPillClick()'); await W(p, 400); await nat(p, [0x90, 64, 90], undefined, 200);
  await p.screenshot({ path: `${CAP}/fenetre-midi-lumi-${vp.width}x${vp.height}.png` });
  await p.close();
}
await b.close();
console.log(fails.length ? `\n${fails.length} échec(s)` : '\nTout est OK');
process.exit(fails.length ? 1 : 0);
