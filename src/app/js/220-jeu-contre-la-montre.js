// fragment de l'IIFE principale — ordre 220, voir src/app/README.md
// ---------- Game: Against the clock (play as many chords / notes as you can) ----------
const SP={state:"ready",count:0,end:0,dur:60,target:null,held:[],raf:0,last:-1};
function spDur(){ return {slow:90, mid:60, fast:40, prog:60}[gmDiff()]; }
function spReset(){ cancelAnimationFrame(SP.raf); Object.assign(SP,{state:"ready",count:0,held:[],target:null}); SP.pool=gmItems(); gmBoard(); gmScore(); }
function spGo(){ if(DU.view!=="solo" && DU.view!=="play") return; if(SP.state==="run") return; SP.state="run"; SP.count=0; SP.dur=spDur(); SP.end=performance.now()+SP.dur*1000; spNext(); SP.raf=requestAnimationFrame(spTick); }
function spNext(){ let n; do{ n=SP.pool[Math.floor(gRnd()*SP.pool.length)]; }while(SP.pool.length>1 && SP.target && n.label===SP.target.label); SP.target=n; SP.held=[]; rnHintPcs(n.pcs); gmBoard(); }
function spTick(now){
  if(!RN.on || GM!=="speed" || SP.state!=="run") return;
  if(HOLD){ SP.raf=requestAnimationFrame(spTick); return; } // the leave window is open: the clock waits (SP.end moves on resume)
  let left=(SP.end-now)/1000;
  // progressive: each answer gives back a little time, less and less
  if(left<=0){ SP.state="over"; clearKeys(); if(DU.mode) duMe(SP.count,true); trkGame("speed", SP.count); const best=(S.gameBest||{}).speed||0; SP.newBest=false; if(!DU.mode){ if(SP.count>best){ S.gameBest={...(S.gameBest||{}),speed:SP.count}; SP.newBest=recNew(best,SP.count,"speed"); } if(SP.count){ addXP(SP.count); renderStatus(); } } try{ achEnd(); }catch(e){} save(); tone(48,0,.4,.15); gmBoard(); gmScore(); return; }
  $("gmBar").style.transform="scaleX("+Math.max(0,left/SP.dur)+")"; $("gmBar").classList.toggle("low",left<10);
  SP.raf=requestAnimationFrame(spTick);
}
function spNote(m){
  const pc=((m%12)+12)%12;
  if(SP.state!=="run"){ if(pc===0 && midiMode()) spGo(); return; }
  const now=performance.now(); SP.held=SP.held.filter(h=>now-h.t<1300); SP.held.push({pc,t:now});
  const have=new Set(SP.held.map(h=>h.pc));
  if(SP.target && SP.target.pcs.every(p=>have.has(p))){ try{ achHit(SP.target.pcs.length); }catch(e){} SP.count++; if(DU.mode) duMe(SP.count,false); if(gmDiff()==="prog") SP.end+=Math.max(300,1500-SP.count*60); tone(84,0,.1,.08); gmScore(); $("gmBoard").classList.remove("hit"); void $("gmBoard").offsetWidth; $("gmBoard").classList.add("hit"); spNext(); }
}
