// fragment de l'IIFE principale — ordre 210, voir src/app/README.md
// ---------- Game: Note Jumper (a running piano jumps over notes when you play the chord shown) ----------
const RN={on:false,state:"ready",raf:0,obs:[],held:[],t0:0,last:0,dist:0,speed:0,y:0,vy:0,cleared:0,spawnIn:0,crashAt:0,xp:0,newBest:false};
if(location.search.includes("rndebug")) window.__rn={RN, note:m=>runnerNote(m)};
function rnChords(){
  const out=[]; typeList("chords").filter(ty=>typeOpenS("chords",ty.id)).forEach(ty=>openRoots("chords",ty.id).forEach(k=>{
    const pcs=[...new Set(spellChord(ty.id,k,0).map(n=>n.pc))]; out.push({label:chordSym(ty.id,k), pcs}); }));
  return out.length?out:[{label:"C",pcs:[0,4,7]}];
}
let GM="runner"; // which game is open: runner | speed | memory
const gmDiff = () => DU.mode ? "prog" : S.settings.gmDiff||"prog", gmCont = () => DU.mode ? DU.cont : S.settings.gmCont||"chords";
function gmFill(){
  const d=$("gmDiff"), c=$("gmCont"), D=t("gmDiffs"), C=t("gmConts");
  d.innerHTML=Object.keys(D).map(k=>'<option value="'+k+'">'+D[k]+'</option>').join(""); d.value=gmDiff();
  c.innerHTML=Object.keys(C).map(k=>'<option value="'+k+'">'+C[k]+'</option>').join(""); c.value=gmCont();
}
$("gmDiff").addEventListener("change",e=>{ S.settings.gmDiff=e.target.value; save(); gameRestart(); });
$("gmCont").addEventListener("change",e=>{ S.settings.gmCont=e.target.value; save(); gameRestart(); });
// what the games ask for: chords (default) or single notes
function gmItems(){
  if(DU.mode) return duPool(DU.cont);
  if(gmCont()==="notes"){
    const easy = gmDiff()==="slow" || gmDiff()==="prog";
    return rootsOf("chords","maj").map(k=>tonicNote(k)).filter(n=>!easy || n.acc===0 || n.acc==null && !/[#b♯♭]/.test(noteName(n)))
      .filter((n,i,a)=>a.findIndex(x=>x.pc===n.pc)===i).map(n=>({label:noteName(n), pcs:[n.pc], note:true}));
  }
  return rnChords();
}
function gameOpen(id, keep){
  if(!keep){ duEnd(); duStopSearch(); DU.view="lobby"; DU.cont=id==="douze"?dzCont():S.settings.duCont==="notes"?"notes":"chords"; }
  GM=id; DU.game=id; gmFill(); $("rnHelp").checked=S.settings.rnHint!==false;
  document.body.classList.add("runner-on"); $("runner").hidden=false; $("rnQuit").textContent=t("rnQuit");
  $("rnTitle").textContent=t({runner:"rnName",speed:"spName",memory:"mmName",douze:"dzName"}[id]); $("runner").dataset.gm=id;
  $("rnStage").hidden = id!=="runner"; $("gmBoard").hidden = id==="runner"||id==="douze"; $("dzBoard").hidden = id!=="douze";
  RN.on=true; clearKeys();
  if(id==="runner"){ rnReset(); RN.state="ready"; cancelAnimationFrame(RN.raf); RN.last=performance.now(); RN.raf=requestAnimationFrame(rnLoop); }
  else if(id==="speed") spReset(); else if(id==="douze") dzReset(); else mmReset();
  duRender();
}
function gameRestart(){ if(!RN.on) return; gameOpen(GM,true); }
function runnerClose(){ if(!RN.on) return; duEnd(); duStopSearch(); DU.view="lobby"; document.body.classList.remove("du-lob"); RN.on=false; clearKeys(); cancelAnimationFrame(SP.raf); clearTimeout(MM.inT); MM.timers.forEach(clearTimeout); MM.timers=[]; cancelAnimationFrame(RN.raf); $("runner").hidden=true; document.body.classList.remove("runner-on"); if(RN.xp){ addXP(RN.xp); RN.xp=0; save(); renderStatus(); } if(page==="games") renderGames(); }
$("rnQuit").addEventListener("click",runnerClose);
$("rnHelp").addEventListener("change",e=>{ S.settings.rnHint=e.target.checked; save(); RN.hintFor=undefined; });
function rnGo(){ if(DU.view!=="solo" && DU.view!=="play") return; if(RN.state==="run") return; if(RN.state==="over") rnReset(); RN.state="run"; }
$("rnCanvas").addEventListener("pointerdown",()=>{ if(RN.state!=="run" && performance.now()-RN.crashAt>500) rnGo(); });
// Space / Enter start a game, unless a button / field has the focus, a window or the start screens are open, or a lobby is shown
const gmKeyFree = e => !(anyWin() || document.body.classList.contains("gate-on") || ($("tour") && !$("tour").hidden) || (e.target && e.target.closest && e.target.closest("button,a,input,select,textarea,[role=button]")) || (DU.view!=="solo" && DU.view!=="play"));
document.addEventListener("keydown",e=>{ if(RN.on && GM==="runner" && RN.state!=="run" && (e.code==="Space"||e.code==="Enter") && performance.now()-RN.crashAt>500 && gmKeyFree(e)){ e.preventDefault(); rnGo(); } });
function rnReset(){ Object.assign(RN,{obs:[],held:[],dist:0,y:0,vy:0,jump:null,cleared:0,spawnIn:1.2,newBest:false,speed:0,bonus:0,flash:null,hintFor:null,blink:0}); clearKeys(); RN.pool=gmItems(); rnScore(); }
// show the keys of the chord to play (the next note), in the "reveal" colour, while the hint is on
function rnHint(o){ clearKeys(); if(!o || S.settings.rnHint===false) return; o.pcs.forEach(pc=>{ for(let m=LOW;m<=HIGH;m++){ if(m%12===pc && keyEls[m]){ keyEls[m].classList.add("k-rev"); break; } } }); }
function rnScore(){ const sc=RN.cleared*10+(RN.bonus||0)+(DU.mode?0:Math.floor(RN.dist/40)); RN.score=sc; if(DU.mode && RN.state==="run") duMe(sc,false); $("rnScore").textContent=String(sc).padStart(5,"0"); $("rnBest").textContent=t("rnBestL")+" "+(S.runnerBest?String(S.runnerBest).padStart(5,"0"):"—"); }
function runnerNote(m){
  if(!RN.on) return;
  if(duNote(m)) return;
  if(GM==="speed") return spNote(m);
  if(GM==="memory") return mmNote(m);
  if(GM==="douze") return dzNote(m);
  const pc=((m%12)+12)%12;
  if(RN.state!=="run"){ if(pc===0 && midiMode() && performance.now()-RN.crashAt>700) rnGo(); return; }
  const now=performance.now(); RN.held=RN.held.filter(h=>now-h.t<1400); RN.held.push({pc,t:now});
  const target=RN.obs.find(o=>!o.armed && !o.passed);
  if(!target) return;
  const have=new Set(RN.held.map(h=>h.pc));
  if(target.pcs.every(p=>have.has(p))){ target.armed=true; RN.held=[]; try{ achHit(target.pcs.length); }catch(e){}
    if(target.inRing){ target.perfect=true; RN.cleared+=0; RN.bonus=(RN.bonus||0)+5; RN.flash={txt:t("rnPerfect"),t:performance.now()}; }
    rnHint(null); }
}
function rnLoop(now){
  if(!RN.on) return;
  const dt=Math.min(.05,(now-RN.last)/1000); RN.last=now;
  const cv=$("rnCanvas"), dpr=window.devicePixelRatio||1, W=cv.clientWidth, H=cv.clientHeight;
  if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){ cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); }
  const g=cv.getContext("2d"); g.setTransform(dpr,0,0,dpr,0,0);
  const u=H/200, ground=H-26*u, px=Math.max(60*u,W*.12), pw=46*u, ph=44*u;
  if(RN.state==="run" && !HOLD){
    const df=gmDiff(), base={slow:W/5.6, mid:W/4, fast:W/2.9, prog:W/5.6}[df];
    if(!RN.speed) RN.speed=base;
    if(df==="prog" && RN.cleared>=3) RN.speed=Math.min(W/2.4, RN.speed + dt*W*0.0064);
    const dx=RN.speed*dt; RN.dist+=dx;
    RN.spawnIn-=dt;
    if(RN.spawnIn<=0){
      const r1=gRnd(), r2=gRnd(), r3=gRnd(), ch=RN.pool[Math.floor(r1*RN.pool.length)], dbl=(gmDiff()==="prog"?RN.cleared>=4:gmDiff()!=="slow") && r2<.35;
      RN.obs.push({x:W+20*u, w:(dbl?50:24)*u, h:(dbl?50:44)*u, dbl, label:ch.label, pcs:ch.pcs, armed:false, passed:false, jumped:false});
      const gapT={slow:3.6, mid:2.8, fast:2.1, prog:Math.max(1.9, 3.5-RN.cleared*0.07)}[gmDiff()]; RN.spawnIn=gapT*(0.85+r3*.4);
    }
    RN.obs.forEach(o=>o.x-=dx);
    const ringX=px+pw+Math.max(18*u,(pw+28*u)*0.5)+70*u;
    RN.obs.forEach(o=>{ o.inRing = Math.abs((o.x+o.w/2)-ringX) < 46*u; });
    const tgt=RN.obs.find(o=>!o.armed && !o.passed); if(tgt!==RN.hintFor){ RN.hintFor=tgt; rnHint(tgt||null); }
    // auto-jump for an armed obstacle when it gets close enough
    const o=RN.obs.find(o=>!o.passed);
    if(o && o.armed && !o.jumped && !RN.jump){
      // a symmetric arc centred on the obstacle: high enough at the edges, whatever the screen size
      const margin=Math.max(18*u,(pw+o.w)*0.5), D=pw+o.w+2*margin;
      if(o.x-(px+pw) <= margin){ o.jumped=true; const s1=margin/D, need=o.h+10*u;
        RN.jump={t:0, T:D/RN.speed, top:Math.min(ground-14*u, Math.max(need*1.15/(4*s1*(1-s1)), need*1.3))}; }
    }
    if(RN.jump){ const j=RN.jump; j.t+=dt; const k=j.t/j.T; if(k>=1){ RN.jump=null; RN.y=0; } else RN.y=j.top*4*k*(1-k); }
    RN.obs.forEach(o=>{
      if(!o.passed && o.x+o.w < px){ o.passed=true; RN.cleared++; if(!DU.mode) RN.xp+=2; tone(84,0,.12,.08); }
      const hit = o.x < px+pw-6*u && o.x+o.w > px+6*u && RN.y < o.h-6*u;
      if(hit && RN.state==="run"){ RN.state="over"; clearKeys(); RN.crashAt=performance.now(); tone(40,0,.4,.2); if(DU.mode) duMe(RN.score,true);
        if(!DU.mode && RN.score>(S.runnerBest||0)){ RN.newBest=recNew(S.runnerBest,RN.score,"runner"); S.runnerBest=RN.score; } trkGame("runner", RN.score); if(RN.xp){ addXP(RN.xp); RN.xp=0; } try{ achEnd(); }catch(e){} save(); renderStatus(); }
    });
    RN.obs=RN.obs.filter(o=>o.x+o.w>-40);
    rnScore();
  }
  if(!document.body.classList.contains("du-lob")) rnDraw(g,W,H,u,ground,px,pw,ph);
  RN.raf=requestAnimationFrame(rnLoop);
}
function rnDraw(g,W,H,u,ground,px,pw,ph){
  const cs=getComputedStyle(document.documentElement), C=k=>cs.getPropertyValue(k).trim();
  const ink=C("--ink"), muted=C("--muted"), line=C("--line"), acc=C("--accent"), good=C("--good"), surf=C("--surface");
  g.clearRect(0,0,W,H);
  // staff lines drifting in the background
  g.strokeStyle=line; g.lineWidth=1; const off=-(RN.dist*0.3)%(80*u);
  for(let i=0;i<5;i++){ const y=28*u+i*9*u; g.beginPath(); g.moveTo(0,y); g.lineTo(W,y); g.stroke(); }
  g.fillStyle=line; for(let x=off;x<W;x+=80*u){ g.fillRect(x,28*u,1.5,36*u); }
  // ground
  g.strokeStyle=muted; g.lineWidth=2*u; g.beginPath(); g.moveTo(0,ground); g.lineTo(W,ground); g.stroke();
  g.fillStyle=line; for(let x=-(RN.dist%(26*u));x<W;x+=26*u){ g.fillRect(x,ground+7*u,8*u,2*u); }
  // timing ring: play the chord while the note crosses it
  const ringX=px+pw+Math.max(18*u,(pw+28*u)*0.5)+70*u, ringY=ground-26*u, tgt=RN.obs.find(o=>!o.armed&&!o.passed), hot=tgt&&tgt.inRing;
  g.strokeStyle=hot?good:acc; g.globalAlpha=hot?0.9:0.45; g.lineWidth=(hot?4:3)*u; g.setLineDash(hot?[]:[6*u,5*u]);
  g.beginPath(); g.arc(ringX,ringY,40*u,0,Math.PI*2); g.stroke(); g.setLineDash([]); g.globalAlpha=1;
  if(RN.flash && performance.now()-RN.flash.t<700){ g.fillStyle=good; g.font="800 "+Math.round(16*u)+"px "+C("--f-display"); g.textAlign="center"; g.fillText(RN.flash.txt, ringX, ringY-52*u); }
  // obstacles: eighth notes and beamed sixteenths, with the chord to play
  RN.obs.forEach(o=>{
    g.fillStyle=ink; g.strokeStyle=ink; g.lineWidth=3*u;
    const heads=o.dbl?[o.x+8*u,o.x+o.w-8*u]:[o.x+9*u];
    heads.forEach(hx=>{ g.beginPath(); g.ellipse(hx,ground-7*u,8.5*u,6*u,-0.4,0,Math.PI*2); g.fill(); g.beginPath(); g.moveTo(hx+7.5*u,ground-9*u); g.lineTo(hx+7.5*u,ground-o.h); g.stroke(); });
    if(o.dbl){ g.lineWidth=5*u; [0,9*u].forEach(d=>{ g.beginPath(); g.moveTo(heads[0]+7.5*u,ground-o.h+d); g.lineTo(heads[1]+7.5*u,ground-o.h+d); g.stroke(); }); }
    else { g.lineWidth=3*u; g.beginPath(); g.moveTo(heads[0]+7.5*u,ground-o.h); g.quadraticCurveTo(heads[0]+22*u,ground-o.h+14*u,heads[0]+16*u,ground-o.h+26*u); g.stroke(); }
    if(!o.passed && staffOn() && rnStaff(g, o, o.x+o.w/2, ground-o.h-60*u, u, "#1b1838")){ if(o.armed){ g.fillStyle=good; g.beginPath(); g.arc(o.x+o.w/2+38*u,ground-o.h-56*u,7*u,0,7); g.fill(); } }
    else if(!o.passed){
      g.font="800 "+Math.round(15*u)+"px "+C("--f-display"); const tw=g.measureText(o.label).width+16*u, bx=o.x+o.w/2-tw/2, by=ground-o.h-30*u;
      g.fillStyle=o.armed?good:acc; rr(g,bx,by,tw,22*u,8*u); g.fill();
      g.fillStyle="#fff"; g.textAlign="center"; g.textBaseline="middle"; g.fillText((o.armed?"✓ ":"")+o.label,o.x+o.w/2,by+11.5*u);
    }
  });
  // the piano character: an upright piano with big eyes (they look at the next note, and blink)
  const y=ground-ph-RN.y, run=RN.state==="run"&&RN.y===0, step=Math.floor(RN.dist/(14*u))%2, crashed=RN.state==="over"&&!RN.won;
  g.fillStyle=ink; [0,1].forEach(i=>{ const lx=px+(i?pw-14*u:8*u), lift=run&&(step===i)?4*u:0; g.fillRect(lx,y+ph-8*u-lift-(RN.y>0?3*u:0),6*u,8*u); });
  rr(g,px,y-6*u,pw,ph,8*u); g.fill();                              // body
  g.fillStyle=surf; rr(g,px+4*u,y+ph*0.52,pw-8*u,ph*0.3,3*u); g.fill(); // keyboard
  g.fillStyle=ink; for(let i=1;i<6;i++){ if(i===3) continue; g.fillRect(px+4*u+i*(pw-8*u)/6-2*u,y+ph*0.52,4*u,ph*0.17); }
  g.fillStyle=acc; g.fillRect(px+pw*0.42,y+ph*0.52,pw*0.12,ph*0.3);
  const tgtO=RN.obs.find(o=>!o.passed), look = tgtO ? Math.max(-1,Math.min(1,(tgtO.x-px)/(200*u))) : 1;
  RN.blink=(RN.blink||0)+1; const blinking = !crashed && (RN.blink%190)<7;
  [px+pw*0.3,px+pw*0.7].forEach(ex=>{ const ey=y+9*u;
    if(crashed){ g.strokeStyle=surf; g.lineWidth=2.4*u; g.beginPath(); g.moveTo(ex-5*u,ey-5*u); g.lineTo(ex+5*u,ey+5*u); g.moveTo(ex+5*u,ey-5*u); g.lineTo(ex-5*u,ey+5*u); g.stroke(); return; }
    g.fillStyle="#fff"; g.beginPath(); g.ellipse(ex,ey,8.5*u, blinking?1.5*u:9*u,0,0,Math.PI*2); g.fill();
    if(!blinking){ g.fillStyle="#161920"; g.beginPath(); g.arc(ex+2.6*u*look,ey+1*u,4.3*u,0,Math.PI*2); g.fill(); g.fillStyle="#fff"; g.beginPath(); g.arc(ex+2.6*u*look+1.4*u,ey-0.6*u,1.4*u,0,Math.PI*2); g.fill(); } });
  g.strokeStyle=surf; g.lineWidth=2*u; g.beginPath();
  if(crashed){ g.arc(px+pw/2,y+ph*0.43,4*u,Math.PI*1.15,Math.PI*1.85); } else { g.arc(px+pw/2,y+ph*0.3,5*u,Math.PI*0.2,Math.PI*0.8); }
  g.stroke();
  // messages
  if(RN.state!=="run"){
    g.fillStyle=ink; g.textAlign="center"; g.textBaseline="middle";
    g.font="800 "+Math.round(20*u)+"px "+C("--f-display");
    const startTxt = midiMode() ? t("rnStart") : t("rnTap");
    g.fillText(RN.state==="over"?(RN.won?t("j3Won"):RN.newBest?t("rnNew"):t("rnOverShort")):startTxt, W/2, H*0.42);
    g.font="400 "+Math.round(12*u)+"px "+C("--f-body"); g.fillStyle=muted;
    g.fillText(RN.state==="over"?(midiMode()?t("rnStart"):t("rnTap")):t("rnHow"), W/2, H*0.42+22*u);
  }
}
function rr(g,x,y,w,h,r){ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }
