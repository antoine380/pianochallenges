// Chantier JEUX 3 (26/10/2026) :
//  1. Saute-notes (et Mémoire) lancé depuis Ma route : objectif affiché « Objectif n / N » (#rnGoal), la partie S'ARRÊTE à l'objectif
//     (carte de réussite #j3Win, étape validée, Do = Ma route : suivant, Si = Rejouer) ; en solo : pas d'objectif, fin à la croche manquée.
//  2. « Nouveau record » : règle commune recNew(prev, now, min) = record précédent ≥ min et battu (pas à la 1re partie, pas pour un petit record).
//  3. Portée de Saute-notes : orthographe (Do m = Do Mi♭ Sol), octave sur la portée, positions identiques à Staff.render
//     (clé de sol et de fa, Do2 à Do6 en notation française = C3 à C7, dièses et bémols, lignes supplémentaires) sur le vrai canvas.
//  4. Lecteur Play : doigtés calculés pour les morceaux qui n'en ont pas (main droite et main gauche), affichés sur les touches attendues,
//     option « Doigtés » de l'hôte relayée (&fing=0|1).
// Usage : PORT=8932 NODE_PATH=… PW_CHROMIUM=… node tools/audit/r51_jeux3.mjs   (CAP=dossier pour des captures)
import { createRequire } from 'module';
import fs from 'fs';
import { INIT } from './lib.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = process.env.PORT || '8767', URL = `http://localhost:${PORT}/`, CAP = process.env.CAP || '';
if (CAP) fs.mkdirSync(CAP, { recursive: true });
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d !== undefined && !ok ? ' — ' + JSON.stringify(d).slice(0, 500) : '')); if (!ok) fails.push(n); };
const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const STATE = (o = {}) => ({ xp: 900, gate: 'account', onb: { done: 1, level: 'adv' }, tourDone: 1, langV2: true, pwShown: 1,
  introSeen: { scales: 1, chords: 1, harmony: 1, prog: 1, ear: 1, games: 1, daily: 1 }, midi: { later: Date.now() }, goal: { kind: 'min', v: 10, asked: 1, at: 1 },
  pp: { done: Object.fromEntries(Array.from({ length: 14 }, (_, i) => ['p' + String(i + 1).padStart(2, '0'), { stars: 3, at: 1 }])) },
  settings: { lang: 'fr', notation: 'fr', input: 'midi', uiSound: false, staff: true, ...(o.settings || {}) } });
const inject = (h, tail, name) => { const e = h.lastIndexOf(tail); return h.slice(0, e) + `\nwindow.${name}=s=>eval(s);\n` + h.slice(e); };
async function open({ vp = { width: 1024, height: 768 }, st = STATE() } = {}) {
  const c = await b.newContext({ viewport: vp, deviceScaleFactor: 1 });
  await c.addInitScript(`window.__midiMode="ok";`); await c.addInitScript(INIT.replace('${MODE}', 'ok'));
  await c.route(u => u.href.startsWith(URL) && (u.pathname === '/' || u.pathname === '/index.html'), async r => { const res = await r.fetch(); const h = inject(await res.text(), '})();\n</script>', '__X'); await r.fulfill({ response: res, body: h, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await c.route(u => u.href.startsWith(URL) && u.pathname === '/play/index.html', async r => { const res = await r.fetch(); const h = inject(await res.text(), '})();\n</script>', '__P'); await r.fulfill({ response: res, body: h, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await c.route('https://ijdxeasxmgevuchyuenn.supabase.co/**', r => r.abort());
  const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/net::ERR|Failed to load resource/.test(m.text())) p.errs.push(m.text()); });
  await p.addInitScript(`if(!sessionStorage.getItem('s')){ sessionStorage.setItem('s','1'); localStorage.setItem('memo-gammes-v1', ${JSON.stringify(JSON.stringify(st))}); }`);
  await p.goto(URL); await p.waitForFunction(() => !!window.__X, null, { timeout: 15000 }); await p.waitForTimeout(1200);
  p.X = s => p.evaluate(s => window.__X(s), s); p.c = c; return p;
}
const W = (p, ms) => p.waitForTimeout(ms);
const ev = (p, f, a) => p.evaluate(f, a);
const shot = async (p, n) => { if (CAP) await p.screenshot({ path: `${CAP}/${n}.png` }); };

const p = await open();
// ---------- 2. règle « Nouveau record »
const R = await p.X(`JSON.stringify([recNew(0,10,"speed"),recNew(3,4,"speed"),recNew(5,6,"speed"),recNew(5,5,"speed"),recNew(40,90,"runner"),recNew(60,70,"runner"),recNew(0,2,"stars"),recNew(1,2,"stars"),recNew(2,2,"stars")])`);
check('recNew : jamais à la 1re partie, ni sous le minimum, seulement quand le record est battu', R === JSON.stringify([false, false, true, false, false, true, false, true, false]), R);

// ---------- 3. portée : orthographe et positions (SVG de Staff.render = canvas de Saute-notes)
const SP = await p.X(`JSON.stringify(["Do m","Fa m","Sol m","Do 7","Si♭","Do♯","La m","Si ø7"].map((l,i)=>[l,pcsToNotes([[0,3,7],[5,8,0],[7,10,2],[0,4,7,10],[10],[1],[9,0,4],[11,2,5,9]][i],l).map(n=>n.l+(n.a<0?"b":n.a>0?"#":"")+(Math.floor((n.m-n.a)/12)-1)).join(" ")]))`);
const SPo = Object.fromEntries(JSON.parse(SP));
check('orthographe : Do m = Do Mi♭ Sol, Fa m = La♭, Sol m = Si♭, Do 7 = Si♭', /Eb/.test(SPo['Do m']) && /Ab/.test(SPo['Fa m']) && /Bb/.test(SPo['Sol m']) && /Bb/.test(SPo['Do 7']) && !/#/.test(SPo['Do m'] + SPo['Fa m'] + SPo['Do 7']), SPo);
check('octave : la cible tient sur la portée (aucune note sous Mi3 / au-dessus de Fa4 pour une note seule)', /^(Bb4)$/.test(SPo['Si♭']) && /^C#5$/.test(SPo['Do♯']), SPo);
await p.X(`bravura()`); await p.waitForFunction(() => window.__X('bravuraReady'), null, { timeout: 8000 });
for (const clef of ['treble', 'bass']) {
  const res = await p.X(`(()=>{ S.settings.clef=${JSON.stringify(clef)}; const out=[];
    for(let m=48;m<=96;m++) for(const fl of [false,true]){ const n=Staff.spell(m,fl); if(fl && !n.a) continue;
      // SVG (Staff.render)
      const d=document.createElement("div"); d.innerHTML=Staff.render({events:[{notes:[n]}],clef:${JSON.stringify(clef)},width:200,sp:10,key:null}).svg;
      const ls=[...d.querySelectorAll("line")].map(l=>({x1:+l.getAttribute("x1"),x2:+l.getAttribute("x2"),y:+l.getAttribute("y1"),y2:+l.getAttribute("y2")})).filter(l=>l.y===l.y2);
      const maxW=Math.max(...ls.map(l=>l.x2-l.x1)), staff=ls.filter(l=>l.x2-l.x1>maxW*0.9).map(l=>l.y).sort((a,b)=>a-b), spS=(staff[4]-staff[0])/4;
      const ledS=ls.filter(l=>l.x2-l.x1<maxW*0.5).length;
      const head=[...d.querySelectorAll("text")].find(t=>t.textContent===Staff.GL.black), posS=(staff[4]-(+head.getAttribute("y")))/spS;
      // canvas (rnStaff), with a recording context
      const cv=document.createElement("canvas"); cv.width=400; cv.height=400; const g=cv.getContext("2d"), segs=[], txt=[]; let mv=null;
      const mo=g.moveTo.bind(g), lo=g.lineTo.bind(g), ft=g.fillText.bind(g);
      g.moveTo=(x,y)=>{ mv={x,y}; return mo(x,y); }; g.lineTo=(x,y)=>{ if(mv && Math.abs(mv.y-y)<1e-6) segs.push({w:x-mv.x,y}); return lo(x,y); }; g.fillText=(s,x,y)=>{ txt.push({s,y}); return ft(s,x,y); };
      const ok=rnStaff(g,{st:[{m:n.m,l:n.l,a:n.a}],pcs:[],label:""},200,120,2,"#000");
      const mW=Math.max(...segs.map(s=>s.w)), st2=segs.filter(s=>s.w>mW*0.9).map(s=>s.y).sort((a,b)=>a-b), spC=(st2[4]-st2[0])/4, ledC=segs.filter(s=>s.w<mW*0.5).length;
      const hC=txt.find(t=>t.s===Staff.GL.black), posC=(st2[4]-hC.y)/spC, accC=txt.some(t=>t.s===Staff.GL.sharp||t.s===Staff.GL.flat), accS=[...d.querySelectorAll("text")].some(t=>t.textContent===Staff.GL.sharp||t.textContent===Staff.GL.flat);
      const clefC=txt[0].s===(${JSON.stringify(clef)}==="bass"?Staff.GL.fClef:Staff.GL.gClef);
      const BOT=${JSON.stringify(clef)}==="bass"?18:30, exp=(Staff.diat(n)-BOT)/2;
      if(!ok || Math.abs(posS-exp)>0.01 || Math.abs(posC-exp)>0.01 || ledS!==ledC || accS!==accC || !!n.a!==accC || !clefC) out.push({m,n:n.l+n.a,exp,posS,posC,ledS,ledC,accS,accC,clefC,ok});
    }
    S.settings.clef="auto"; return JSON.stringify(out); })()`);
  const bad = JSON.parse(res);
  check(`portée en clé de ${clef === 'bass' ? 'fa' : 'sol'} : Do2 à Do6 (C3–C7, dièses et bémols) au même endroit dans Staff.render et sur le canvas de Saute-notes (lignes supplémentaires, altérations, clé)`, bad.length === 0, bad.slice(0, 4));
}
// treble / bass ranges chosen for the targets
const RG = await p.X(`JSON.stringify(["treble","bass"].map(c=>[0,1,2,3,4,5,6,7,8,9,10,11].map(pc=>Staff.diat(j3Notes([pc],"",c)[0]))))`);
const [rt, rb] = JSON.parse(RG);
check('notes seules : sur la portée (Mi3–Fa4 en sol, Sol1–La2 en fa)', rt.every(d => d >= 30 && d <= 38) && rb.every(d => d >= 18 && d <= 26), { rt, rb });

// ---------- 1. Saute-notes dans Ma route : objectif et fin
await p.X(`openPage("learn")`); await W(p, 300);
const pill = JSON.parse(await p.X(`JSON.stringify((()=>{ const x=RT_STAGES.flat().find(q=>q.s.g==="runner"); return {id:x.id, goal:x.s.goal}; })())`));
await p.X(`rtLaunch(RT_STAGES.flat().find(q=>q.id===${JSON.stringify(pill.id)}))`); await W(p, 600);
const g0 = await ev(p, () => ({ on: document.body.classList.contains('runner-on'), goal: !document.getElementById('rnGoal')?.hidden && document.getElementById('rnGoal')?.textContent }));
check('route : Saute-notes s\'ouvre avec l\'objectif affiché « Objectif 0 / N »', g0.on && g0.goal === 'Objectif 0 / ' + pill.goal, g0);
await shot(p, 'route_runner_goal');
await p.X(`rnGo()`); await W(p, 300);
await p.X(`RN.cleared=${pill.goal - 1}`); await W(p, 250);
const g1 = JSON.parse(await p.X(`JSON.stringify({st:RN.state, goal:$("rnGoal").textContent})`));
check('avant l\'objectif : la partie continue, compteur à jour', g1.st === 'run' && g1.goal === `Objectif ${pill.goal - 1} / ${pill.goal}`, g1);
await p.X(`RN.cleared=${pill.goal}`); await W(p, 300);
const d0 = await p.X('RN.dist'); await W(p, 400); const d1 = await p.X('RN.dist');
const g2 = JSON.parse(await p.X(`JSON.stringify({st:RN.state, won:RN.won, card:!!$("j3Win"), done:!!rtS().done[${JSON.stringify(pill.id)}], goal:$("rnGoal").textContent, txt:$("j3Win")&&$("j3Win").textContent})`));
check('objectif atteint : la partie S\'ARRÊTE (plus de défilement), carte de réussite, étape validée', g2.st === 'over' && g2.won && g2.card && g2.done && d0 === d1 && /Objectif atteint/.test(g2.txt) && g2.goal === `Objectif ${pill.goal} / ${pill.goal}`, { ...g2, d0, d1 });
await shot(p, 'route_runner_win');
await ev(p, () => { window.__midi.noteOn(71); window.__midi.noteOff(71); }); await W(p, 400);
const g3 = JSON.parse(await p.X(`JSON.stringify({st:RN.state, card:!!$("j3Win")})`));
check('Si seul sur la carte = Rejouer (nouvelle partie, même objectif)', g3.st === 'run' && !g3.card, g3);
await p.X(`RN.cleared=${pill.goal}`); await W(p, 300);
check('… et la carte revient à l\'objectif', await p.X(`!!$("j3Win") && RN.state==="over"`));
await ev(p, () => { window.__midi.noteOn(60); window.__midi.noteOff(60); }); await W(p, 700);
const g4 = JSON.parse(await p.X(`JSON.stringify({rn:RN.on, card:!!$("j3Win"), cur:RT.cur&&RT.cur.id, page})`));
check('Do seul sur la carte = Ma route : suivant (étape suivante lancée)', !g4.card && g4.cur && g4.cur !== pill.id, g4);
if (await p.X('RN.on')) { await p.X('runnerClose()'); await W(p, 200); }

// Mémoire dans Ma route : s'arrête aussi à l'objectif
const mp = JSON.parse(await p.X(`JSON.stringify((()=>{ const x=RT_STAGES.flat().find(q=>q.s.g==="memory"); return {id:x.id, goal:x.s.goal}; })())`));
await p.X(`rtLaunch(RT_STAGES.flat().find(q=>q.id===${JSON.stringify(mp.id)}))`); await W(p, 600);
check('route : Mémoire musicale avec l\'objectif « Objectif 0 / N »', await p.X(`!$("rnGoal").hidden && $("rnGoal").textContent==="Objectif 0 / ${mp.goal}"`));
await p.X(`MM.pool=[{label:"Do",pcs:[0],note:true}]; MM.seq=[MM.pool[0]]; MM.step=0; MM.round=${mp.goal - 1}; MM.state="input"; MM.held=[]`);
await p.X(`runnerNote(60)`); await W(p, 1400);
const m1 = JSON.parse(await p.X(`JSON.stringify({st:MM.state, card:!!$("j3Win"), done:!!rtS().done[${JSON.stringify(mp.id)}], timers:MM.timers.length})`));
check('Mémoire : objectif atteint = fin de partie (plus de tour suivant), carte, étape validée', m1.st === 'over' && m1.card && m1.done && m1.timers === 0, m1);
await shot(p, 'route_memory_win');
await ev(p, () => document.getElementById('j3Again').click()); await W(p, 300);
check('Mémoire : « Rejouer » relance une partie', await p.X(`!$("j3Win") && (MM.state==="listen"||MM.state==="input")`));
await p.X('runnerClose()'); await W(p, 200);

// ---------- solo : pas d'objectif, fin à la croche manquée ; « Nouveau record » seulement s'il est battu
await p.X(`RT.cur=null; openPage("games"); gameOpen("runner"); DU.view="solo"; duRender(); gameOpen("runner",true)`); await W(p, 500);
check('solo : pas d\'objectif affiché', await p.X(`$("rnGoal").hidden`));
const crash = async (cleared, best) => { await p.X(`${best != null ? `S.runnerBest=${best};` : ''} rnGo(); RN.cleared=${cleared}; RN.dist=0;`); await W(p, 120);
  await p.X(`(()=>{ const cv=$("rnCanvas"), u=cv.clientHeight/200, px=Math.max(60*u,cv.clientWidth*.12); RN.obs=[{x:px+4*u,w:24*u,h:44*u,dbl:false,label:"Do",pcs:[0],armed:false,passed:false,jumped:false}]; RN.y=0; RN.jump=null; })()`);
  await W(p, 300); return JSON.parse(await p.X(`JSON.stringify({st:RN.state, nb:RN.newBest, best:S.runnerBest, sc:RN.score})`)); };
const c1 = await crash(20, 0);
check('solo : la croche manquée termine la partie ; 1re partie = pas de « Nouveau record »', c1.st === 'over' && c1.nb === false && c1.best >= 200, c1);
const c2 = await crash(40);
check('record battu (≥ 50 points avant) = « Nouveau record » une fois, à la fin', c2.st === 'over' && c2.nb === true && c2.best === c2.sc, c2);
const c3 = await crash(1);
check('record pas battu = pas d\'annonce', c3.st === 'over' && c3.nb === false, c3);
const c4 = await crash(4, 30);
check('petit record précédent (< 50) = pas d\'annonce même battu', c4.st === 'over' && c4.nb === false && c4.best === c4.sc, c4);
await shot(p, 'solo_runner_over');
await p.X('runnerClose()');
// Mémoire solo : même règle
await p.X(`gameOpen("memory"); DU.view="solo"; duRender(); gameOpen("memory",true); S.gameBest={...(S.gameBest||{}),memory:0}`); await W(p, 300);
const mm = async round => { await p.X(`MM.pool=[{label:"Do",pcs:[0],note:true}]; MM.seq=[MM.pool[0]]; MM.step=0; MM.round=${round}; MM.state="input"; MM.held=[]`); await p.X('runnerNote(61)'); await W(p, 150);
  return JSON.parse(await p.X(`JSON.stringify({st:MM.state, nb:MM.newBest, best:S.gameBest.memory, kick:$("gmKick").textContent})`)); };
const k1 = await mm(6), k2 = await mm(7), k3 = await mm(3);
check('Mémoire : 1re partie sans annonce, record battu annoncé, record pas battu sans annonce', k1.st === 'over' && !k1.nb && k1.best === 6 && k2.nb && /record/i.test(k2.kick) && !k3.nb && !/record/i.test(k3.kick), { k1, k2, k3 });
await p.X('runnerClose()');

// ---------- 4. doigtés dans les morceaux
const songFrame = async () => { await W(p, 1500); return p.frames().find(f => /play\/index\.html/.test(f.url())); };
await p.X(`S.settings.fing=false; save(); openPage("free")`); await W(p, 800);
await p.X(`openPlayWith("#song=buns&arr=1")`); let fr = await songFrame();
check('option Doigtés coupée dans l\'hôte : le lecteur reçoit &fing=0 et masque les doigts', /fing=0/.test(await p.X(`$("playFrame").getAttribute("src")`)) && await fr.evaluate(() => document.getElementById('tFing').getAttribute('aria-pressed') === 'false' && window.__P('showFing') === false));
await p.X(`S.settings.fing=true; save(); openPage("free")`); await W(p, 500);
await p.X(`openPlayWith("#song=schumanntraumerei&arr=2")`); fr = await songFrame(); await W(p, 1500);
const F = await fr.evaluate(() => window.__P(`(()=>{ const s=SONGS.find(x=>x.id==="schumanntraumerei"); const v=variant(s,2); return JSON.stringify({src:location.hash, n:v.notes.length, rh:v.notes.filter(n=>n.h===1).length, lh:v.notes.filter(n=>n.h===2).length, zero:v.notes.filter(n=>!(n.f>=1&&n.f<=5)).length, show:showFing}); })()`));
const Fo = JSON.parse(F);
check('morceau sans doigtés dans ses données : doigts calculés pour chaque note, main droite et main gauche (1 à 5)', Fo.zero === 0 && Fo.rh > 10 && Fo.lh > 0 && Fo.show === true && /fing=1/.test(Fo.src), Fo);
await fr.evaluate(() => document.getElementById('go') && document.getElementById('go').click()); await W(p, 2600);
const K = await fr.evaluate(() => [...document.querySelectorAll('.key.target')].map(k => k.lastChild.textContent));
check('mode attente : la touche attendue porte son doigt', K.length > 0 && K.every(x => /^[1-5]$/.test(x)), K);
await shot(p, 'song_fingers');
// position logic: a five-note run gets 1..5 in the right hand and 5..1 in the left
const A = await fr.evaluate(() => window.__P(`JSON.stringify((()=>{ const mk=(ms,h)=>ms.map((m,i)=>({m,s:i,d:1,h,f:0})); const a=mk([60,62,64,65,67,65,64,62,60],1), b=mk([48,50,52,53,55],2), c=mk([60,62,64,65,67,69,71,72],1); j3Fing(a); j3Fing(b); j3Fing(c); return [a.map(n=>n.f).join(""), b.map(n=>n.f).join(""), c.map(n=>n.f).join("")]; })())`));
const Ao = JSON.parse(A);
check('position de main : Do→Sol = 1 2 3 4 5 (MD), 5 4 3 2 1 (MG), nouvelle position quand la note est hors de portée', Ao[0] === '123454321' && Ao[1] === '54321' && /^12345/.test(Ao[2]) && Ao[2].length === 8, Ao);

check('aucune erreur JS', p.errs.length === 0, p.errs);
await b.close();
console.log(fails.length ? `\n${fails.length} échec(s)` : '\nTout est OK');
process.exit(fails.length ? 1 : 0);
