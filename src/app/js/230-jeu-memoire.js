// fragment de l'IIFE principale — ordre 230, voir src/app/README.md
// ---------- Game: Musical memory (repeat a growing sequence) ----------
const MM={state:"ready",seq:[],step:0,round:0,timer:0,timers:[],held:[]};
function mmTempo(){ return {slow:950, mid:680, fast:460, prog:Math.max(380, 900-MM.round*45)}[gmDiff()]; }
function mmReset(){ MM.timers.forEach(clearTimeout); MM.timers=[]; Object.assign(MM,{state:"ready",seq:[],step:0,round:0,held:[]}); MM.pool=gmItems(); gmBoard(); gmScore(); }
function mmGo(){ if(DU.view!=="solo" && DU.view!=="play") return; if(MM.state==="listen"||MM.state==="input") return; MM.seq=[]; MM.round=0; mmAdd(); mmPlay(); }
function mmAdd(){ MM.seq.push(MM.pool[Math.floor(gRnd()*MM.pool.length)]); }
function mmPlay(){
  MM.state="listen"; MM.step=0; gmBoard(); clearKeys();
  const tp=mmTempo();
  MM.seq.forEach((it,i)=>{ MM.timers.push(setTimeout(()=>{ if(!RN.on||GM!=="memory") return; clearKeys(); it.pcs.forEach((pc,j)=>tone(60+pc,0,.55,.16)); rnHintPcs(it.pcs, true); const st=staffTargetSVG(it,200,9); if(st) $("gmBig").innerHTML='<span class="gm-staff">'+st+'</span>'; else $("gmBig").textContent=it.label; }, 500+i*tp));
    MM.timers.push(setTimeout(()=>clearKeys(), 500+i*tp+tp*0.7)); });
  MM.timers.push(setTimeout(()=>{ if(!RN.on||GM!=="memory") return; MM.state="input"; MM.held=[]; clearKeys(); gmBoard(); mmIdle(); }, 500+MM.seq.length*tp));
}
function mmIdle(){ clearTimeout(MM.inT); if(!DU.mode) return; MM.inT=setTimeout(()=>{ if(MM.state!=="input") return; const it=MM.seq[MM.step], pc=[...Array(12).keys()].find(x=>!it.pcs.includes(x)); mmNote(60+pc); },10000); }
function mmNote(m){
  const pc=((m%12)+12)%12;
  if(MM.state==="ready"||MM.state==="over"){ if(pc===0 && midiMode()) mmGo(); return; }
  if(MM.state!=="input") return;
  const it=MM.seq[MM.step], now=performance.now();
  if(!it.pcs.includes(pc)){ MM.state="over"; tone(40,0,.4,.2); if(DU.mode) duMe(MM.round,true); trkGame("memory", MM.round); clearTimeout(MM.inT); const best=(S.gameBest||{}).memory||0; const mmRec=!DU.mode && MM.round>best; MM.newBest=mmRec && recNew(best,MM.round,"memory"); if(mmRec) S.gameBest={...(S.gameBest||{}),memory:MM.round}; if(MM.round && !DU.mode){ addXP(MM.round*2); renderStatus(); } try{ achEnd(); }catch(e){} save(); gmBoard(); gmScore(); return; }
  MM.held=MM.held.filter(h=>now-h.t<1500); MM.held.push({pc,t:now});
  const have=new Set(MM.held.map(h=>h.pc));
  if(it.pcs.every(p=>have.has(p))){ try{ achHit(it.pcs.length); }catch(e){} MM.step++; MM.held=[]; mmIdle(); $("gmBig").textContent=MM.step+" / "+MM.seq.length;
    if(MM.step>=MM.seq.length){ MM.round++; gmScore(); if(DU.mode) duMe(MM.round,false); MM.state="listen"; $("gmSub").textContent=t("mmGood"); mmAdd(); MM.timers.push(setTimeout(mmPlay, 900)); } }
}
// shared board text for the two DOM games
function gmBoard(){
  const k=$("gmKick"), big=$("gmBig"), sub=$("gmSub"), startTxt = midiMode()?t("rnStart"):t("gmTap");
  $("gmBar").parentElement.hidden = GM!=="speed";
  if(GM==="speed"){
    if(SP.state==="ready"){ k.textContent=t("spName"); big.textContent=t("gmReady"); sub.textContent=t("spHow")(spDur())+" "+startTxt; $("gmBar").style.transform="scaleX(1)"; }
    else if(SP.state==="run"){ k.textContent=SP.target&&SP.target.note?t("gmNote"):t("gmChord"); const st=staffTargetSVG(SP.target,200,9); if(st){ big.innerHTML='<span class="gm-staff">'+st+'</span>'; sub.textContent=S.settings.labels?SP.target.label:""; } else { big.textContent=SP.target?SP.target.label:""; sub.textContent=""; } }
    else { k.textContent=SP.newBest?t("rnNew"):t("gmOver"); big.textContent=String(SP.count); sub.textContent=t("spDone")(SP.count)+" "+startTxt; }
  } else {
    if(MM.state==="ready"){ k.textContent=t("mmName"); big.textContent=t("gmReady"); sub.textContent=t("mmHow")+" "+startTxt; }
    else if(MM.state==="listen"){ k.textContent=t("mmListen"); big.textContent="♪"; sub.textContent=t("mmRound")(MM.round+1); }
    else if(MM.state==="input"){ k.textContent=t("mmYou"); big.textContent="0 / "+MM.seq.length; sub.textContent=t("mmRound")(MM.round+1); }
    else { k.textContent=MM.newBest?t("rnNew"):t("gmOver"); big.textContent=String(MM.round); sub.textContent=t("mmDone")(MM.round)+" "+startTxt; }
  }
}
function gmScore(){
  const sc = GM==="speed" ? SP.count : GM==="memory" ? MM.round : 0, best=((S.gameBest||{})[GM])||0;
  $("rnScore").textContent=String(sc).padStart(3,"0"); $("rnBest").textContent=t("rnBestL")+" "+(best?String(best).padStart(3,"0"):"—");
}
function rnHintPcs(pcs, force){ clearKeys(); if(!force && S.settings.rnHint===false) return; pcs.forEach(pc=>{ for(let m=LOW;m<=HIGH;m++){ if(m%12===pc && keyEls[m]){ keyEls[m].classList.add("k-rev"); break; } } }); }
$("gmBoard").addEventListener("pointerdown",()=>{ if(GM==="speed" && SP.state!=="run") spGo(); else if(GM==="memory" && (MM.state==="ready"||MM.state==="over")) mmGo(); });
document.addEventListener("keydown",e=>{ if(!RN.on || GM==="runner" || !gmKeyFree(e)) return; if(e.code==="Space"||e.code==="Enter"){ if(GM==="speed" && SP.state!=="run"){ e.preventDefault(); spGo(); } else if(GM==="memory" && (MM.state==="ready"||MM.state==="over")){ e.preventDefault(); mmGo(); } } });
