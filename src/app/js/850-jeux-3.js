// fragment de l'IIFE principale — ordre 850, voir src/app/README.md
/* ==== Jeux 3 (chantier JEUX 3) : objectif des jeux de Ma route, « Nouveau record » plus rare, portée de Saute-notes ==== */
// « Nouveau record » : une règle pour tous les jeux et exercices. Annoncé une fois, à la fin, seulement si un record
// précédent existait, d'au moins `min` (5 réussites : 50 points au Saute-notes, 5 réponses, 5 tours ; 1 étoile), et qu'il est battu.
const REC_MIN={runner:50, speed:5, memory:5, stars:1};
function recNew(prev, now, k){ const p=+prev||0, n=+now||0, min=typeof k==="number"?k:(REC_MIN[k]!=null?REC_MIN[k]:5); return p>0 && p>=min && n>p; }
Object.assign(TXT.fr,{j3Goal:(n,g)=>"Objectif "+n+" / "+g, j3Won:"Objectif atteint !", j3WinS:(n,g)=>n+" / "+g+" · étape de ta route validée", j3Next:"Ma route : suivant", j3Again:"Rejouer"});
Object.assign(TXT.en,{j3Goal:(n,g)=>"Goal "+n+" / "+g, j3Won:"Goal reached!", j3WinS:(n,g)=>n+" / "+g+" · a step of your path is done", j3Next:"My path: next", j3Again:"Play again"});
// ---- a game launched from Ma route: goal shown during the game, the game stops once it is reached (Saute-notes and Mémoire never ended)
const J3={card:null};
function j3Route(){ const p=(typeof RT!=="undefined")&&RT.cur; return p && p.s && p.s.g && p.s.g===GM && RN.on && !DU.mode && DU.view==="solo" ? p : null; }
const j3Count = () => GM==="runner"?RN.cleared:GM==="speed"?SP.count:GM==="memory"?MM.round:0;
function j3Hud(){ let el=$("rnGoal"); if(!el){ const b=$("rnBest"); if(!b) return; el=document.createElement("span"); el.id="rnGoal"; el.className="rn-goal mono"; b.after(el); }
  const p=j3Route(), txt=p?t("j3Goal")(Math.min(j3Count(),p.s.goal),p.s.goal):""; el.hidden=!p; if(el.textContent!==txt) el.textContent=txt; }
function j3Hide(){ const c=$("j3Win"); if(c) c.remove(); J3.card=null; }
function j3Show(p){ if(J3.card) return; const host=GM==="runner"?$("rnStage"):$("gmBoard"); if(!host) return;
  const c=document.createElement("div"); c.className="j3-win"; c.id="j3Win"; c.setAttribute("role","status");
  c.innerHTML='<b class="j3-wk">★ '+esc(t("j3Won"))+'</b><p>'+esc(t("j3WinS")(p.s.goal,p.s.goal))+'</p><div class="j3-wb"></div>';
  const row=c.querySelector(".j3-wb"), mk=(id,txt,cls,key)=>{ const b=document.createElement("button"); b.type="button"; b.id=id; b.className="btn"+(cls?" "+cls:""); b.textContent=txt; duKbd(b,key); row.appendChild(b); return b; };
  const nx=mk("j3Next",t("j3Next"),"primary",CNAME()); mk("j3Again",t("j3Again"),"",(S.settings.notation==="fr"?PC_FR:PC_EN)[11]);
  c.addEventListener("pointerdown",e=>e.stopPropagation()); // the board/canvas behind would start a new game
  host.appendChild(c); J3.card=p; setTimeout(()=>{ if(nx.isConnected) nx.focus({preventScroll:true}); },30); }
function j3Next(){ j3Hide(); runnerClose(); if(RT.win!=null){ if($("rtWin") && $("rtWin").hidden && !anyWin()) rtWinOpen(RT.win); return; } setTimeout(rtGo,60); }
function j3Again(){ j3Hide(); if(GM==="runner") rnGo(); else if(GM==="speed") spGo(); else if(GM==="memory") mmGo(); }
document.addEventListener("click",e=>{ const b=e.target.closest&&e.target.closest("#j3Next,#j3Again"); if(!b) return; if(b.id==="j3Next") j3Next(); else j3Again(); });
// after a goal check: the success card (rtGameCheck has already marked the step done)
function j3After(p){ if(!p || J3.card) return; const over = GM==="runner"?RN.state==="over":GM==="speed"?SP.state==="over":MM.state==="over";
  if(over && j3Count()>=p.s.goal) j3Show(p); }
function j3WinRunner(){ RN.state="over"; RN.won=true; clearKeys(); RN.crashAt=performance.now(); RN.jump=null; RN.y=0;
  tone(72,0,.14,.1); tone(76,.12,.14,.1); tone(79,.24,.3,.12);
  if(RN.score>(S.runnerBest||0)){ RN.newBest=recNew(S.runnerBest,RN.score,"runner"); S.runnerBest=RN.score; }
  trkGame("runner", RN.score); if(RN.xp){ addXP(RN.xp); RN.xp=0; } try{ achEnd(); }catch(e){} save(); renderStatus(); }
function j3WinMemory(){ MM.timers.forEach(clearTimeout); MM.timers=[]; clearTimeout(MM.inT); MM.state="over"; clearKeys(); tone(72,0,.14,.1); tone(76,.12,.14,.1); tone(79,.24,.3,.12);
  trkGame("memory", MM.round); const best=(S.gameBest||{}).memory||0, rec=MM.round>best; MM.newBest=rec && recNew(best,MM.round,"memory"); if(rec) S.gameBest={...(S.gameBest||{}),memory:MM.round};
  if(MM.round){ addXP(MM.round*2); renderStatus(); } try{ achEnd(); }catch(e){} save(); gmBoard(); }
{ const o=rnScore; rnScore=function(){ const p=j3Route(); if(p && GM==="runner" && RN.state==="run" && RN.cleared>=p.s.goal) j3WinRunner();
    const r=o.apply(this,arguments); try{ j3Hud(); j3After(p); }catch(e){ console.warn(e); } return r; }; }
{ const o=gmScore; gmScore=function(){ const p=j3Route(); const r=o.apply(this,arguments); try{ j3Hud(); j3After(p); }catch(e){ console.warn(e); } return r; }; }
{ const o=mmNote; mmNote=function(m){ const p=j3Route(); const r=o.apply(this,arguments); if(p && MM.state==="listen" && MM.round>=p.s.goal){ j3WinMemory(); gmScore(); } return r; }; }
{ const o=rnReset; rnReset=function(){ j3Hide(); const r=o.apply(this,arguments); RN.won=false; return r; }; }
{ const o=spGo; spGo=function(){ if(J3.card) j3Hide(); return o.apply(this,arguments); }; }
{ const o=mmGo; mmGo=function(){ if(J3.card) j3Hide(); return o.apply(this,arguments); }; }
{ const o=spReset; spReset=function(){ j3Hide(); return o.apply(this,arguments); }; }
{ const o=mmReset; mmReset=function(){ j3Hide(); return o.apply(this,arguments); }; }
{ const o=runnerClose; runnerClose=function(){ j3Hide(); const r=o.apply(this,arguments); try{ j3Hud(); }catch(e){} return r; }; }
{ const o=gameOpen; gameOpen=function(){ const r=o.apply(this,arguments); try{ j3Hud(); }catch(e){} return r; }; }
// on the success card: C alone = next step of the path, B alone = play again
{ const o=runnerNote; runnerNote=function(m){ if(J3.card && RN.on){ const pc=((m%12)+12)%12; if(pc===0) j3Next(); else if(pc===11) j3Again(); return; } return o.apply(this,arguments); }; }
// ---- the target written on a staff (Saute-notes canvas, Contre la montre, Mémoire): right spelling, right octave, right clef
// The note names come from the label (« Do m » → C E♭ G, not C D♯ G) and the chord type from its intervals; the octave keeps the
// notes on the staff (E4–F5 in treble, G2–A3 in bass), heads placed with Staff.diat exactly like Staff.render.
const J3_LET={Do:"C",Ré:"D",Re:"D",Mi:"E",Fa:"F",Sol:"G",La:"A",Si:"B"};
function j3Spell(pcs, label){
  const mt=/^(Do|Ré|Re|Mi|Fa|Sol|La|Si|[A-G])\s?([♯#♭b]?)/.exec(String(label||"").trim()); if(!mt||!pcs||!pcs.length) return null;
  const L=J3_LET[mt[1]]||mt[1], acc=/[♯#]/.test(mt[2])?1:/[♭b]/.test(mt[2])?-1:0, tpc=(NAT[LETTERS.indexOf(L)]+acc+12)%12; if(tpc!==pcs[0]) return null;
  if(pcs.length===1) return [{l:L,a:acc,pc:tpc}];
  const iv=pcs.map(p=>((p-tpc)%12+12)%12), ty=CTYPES.find(x=>x.iv.length===iv.length && x.iv.every((v,i)=>v===iv[i])); if(!ty) return null;
  return spellIvL(L+(acc>0?"#":acc<0?"b":""), ty.iv, ty.ls); }
const j3Clef = () => staffClef()==="bass"?"bass":"treble";
function j3Notes(pcs, label, clef){ if(!pcs||!pcs.length) return [];
  const flat=/♭|b(?![a-z])/.test(label||""), sp=j3Spell(pcs,label)||pcs.map(pc=>{ const x=Staff.spell(60+pc,flat); return {l:x.l,a:x.a,pc}; });
  const R=clef==="bass"?[18,26]:[30,38], mid=(R[0]+R[1])/2;
  const build=base=>{ let prev=-1; return sp.map(n=>{ let m=base+n.pc; while(m<=prev) m+=12; prev=m; return {m,l:n.l,a:n.a}; }); };
  let best=null; [24,36,48,60,72].forEach(b=>{ const ns=build(b), ds=ns.map(n=>Staff.diat(n)), out=ds.reduce((s,d)=>s+Math.max(0,R[0]-d,d-R[1]),0), avg=ds.reduce((s,d)=>s+d,0)/ds.length, sc=out*10+Math.abs(avg-mid);
    if(!best||sc<best.sc) best={sc,ns}; });
  return best.ns; }
pcsToNotes=function(pcs, label){ return j3Notes(pcs, label, staffClef()==="bass"?"bass":"treble"); };
// canvas staff of Saute-notes: same positions as Staff.render (bottom line = E4 in treble, G2 in bass), ledger lines, accidentals
function j3StaffLayout(ns, clef, yb, sp){ const BOT=clef==="bass"?18:30, y=d=>yb-(d-BOT)*sp/2; let prevD=-99, off=0;
  return ns.map(n=>{ const d=Staff.diat(n); off = d-prevD===1 && !off ? sp*1.18 : 0; prevD=d; const led=[];
    for(let L=BOT-2; L>=d; L-=2) led.push(y(L)); for(let L=BOT+10; L<=d; L+=2) led.push(y(L)); return {n, d, y:y(d), off, led}; }); }
rnStaff=function(g, it, cx, top, u, ink){ if(!bravuraReady){ bravura(); return false; }
  const GL=Staff.GL, clef=j3Clef(), BOT=clef==="bass"?18:30, sp=6*u, fs=sp*4, ns=it.st||pcsToNotes(it.pcs,it.label), x0=cx-sp*5, x1=cx+sp*5, yb=top+sp*6.2;
  const L=j3StaffLayout(ns, clef, yb, sp), ys=L.map(h=>h.y), bt=Math.min(top, Math.min(...ys)-sp*1.4), bb=Math.max(top+sp*8.6, Math.max(...ys)+sp*1.4);
  g.save(); g.fillStyle="rgba(255,255,255,.96)"; rr(g,x0-sp,bt,x1-x0+sp*2,bb-bt,sp*1.4); g.fill(); g.strokeStyle="rgba(27,24,56,.14)"; g.lineWidth=Math.max(1,u); g.stroke();
  g.strokeStyle=ink; g.lineWidth=Math.max(1,sp*.13); for(let i=0;i<5;i++){ g.beginPath(); g.moveTo(x0,yb-i*sp); g.lineTo(x1,yb-i*sp); g.stroke(); }
  g.fillStyle=ink; g.font=fs+"px Bravura"; g.textAlign="left"; g.textBaseline="alphabetic";
  g.fillText(clef==="bass"?GL.fClef:GL.gClef, x0+sp*.2, yb-(clef==="bass"?24-BOT:32-BOT)*sp/2);
  L.forEach(h=>{ const hx=cx+h.off-sp*0.3; h.led.forEach(ly=>{ g.beginPath(); g.moveTo(hx-sp*.4,ly); g.lineTo(hx+sp*1.6,ly); g.stroke(); });
    const a=h.n.a|0; if(a) g.fillText(a===1?GL.sharp:a===-1?GL.flat:a===2?GL.dsharp:GL.dflat, hx-sp*1.35, h.y); g.fillText(GL.black, hx, h.y); });
  g.restore(); return true; };
// with the staff, the hint lights the written keys (same octave as on the staff) when the keyboard shows them
{ const o=rnHint; rnHint=function(ob){ if(ob && staffOn() && S.settings.rnHint!==false){ const ms=(ob.st||pcsToNotes(ob.pcs,ob.label)).map(n=>n.m);
      if(ms.every(m=>keyEls[m])){ clearKeys(); ms.forEach(m=>keyEls[m].classList.add("k-rev")); return; } } return o.apply(this,arguments); }; }
/* ==== fin Jeux 3 ==== */

