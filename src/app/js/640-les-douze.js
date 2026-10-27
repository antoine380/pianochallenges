// fragment de l'IIFE principale — ordre 640, voir src/app/README.md
/* ==== Les Douze (L15, étape 3 de la feuille de route) ==== */
// A GAMES race through the 12 major triads, minor triads, dominant 7ths or major scales (in notes). 12 cells in a circle (two rows
// of six on small screens), the clock in the middle, the target in big; chords in any inversion (pitch classes), scales note by note
// going up (tonic to tonic). A wrong note adds 2 s. The ghost of the record runs alongside (gap in green / red). Bronze < 3 min,
// silver < 2 min, gold < 90 s (scales: x2). Best medal: S.gameBest["douze-<cont>"] = 1 bronze | 2 silver | 3 gold (merged as the max,
// read by the achievements); best time and its ghost: S.dzRec[cont]={ms,sp:[ms after each cell],at} (mergeState keeps the smaller ms). XP at the end (none in a duel). Settings: S.settings.dzCont
// (maj|min|dom7|scale), dzOrder (chrom = chromatic down from B | fifths | rand), dzHint (light the keys). Duels go through DU like
// the other games (same random order from the shared seed); a duel score is the number of cells, then 40000 + (59999 - centiseconds).
const DZ_CONTS=["maj","min","dom7","scale"], DZ_ORDERS=["chrom","fifths","rand"], DZ_TIERS=[180000,120000,90000];
const DZ={state:"ready",items:[],i:0,step:0,ms:0,pen:0,bad:0,sp:[],last:0,raf:0,held:[],cmd:[],cmdT:0,doneAt:0,grace:null,cont:"maj",ghost:null,medal:-1,newBest:false,prev:0,final:0,late:false,tier:-2};
function dzCont(){ return ["maj","min","dom7","scale"].includes(S.settings.dzCont) ? S.settings.dzCont : "maj"; }
function dzOrder(){ return ["chrom","fifths","rand"].includes(S.settings.dzOrder) ? S.settings.dzOrder : "chrom"; }
function dzTiers(c){ return [180000,120000,90000].map(x=>x*((c||dzCont())==="scale"?2:1)); }
function duContOk(g,c){ return g==="douze" ? (["maj","min","dom7","scale"].includes(c)?c:"maj") : c==="notes"?"notes":"chords"; }
function duContName(g,c){ return g==="douze" ? t("dzConts")[duContOk(g,c)] : t(c==="notes"?"duNotes":"duChords"); }
function dzFmt(ms){ ms=Math.max(0,Math.round(+ms||0)); const tn=Math.floor(ms/100), m=Math.floor(tn/600), s=Math.floor(tn/10)%60; return m+":"+String(s).padStart(2,"0")+(S.settings.lang==="fr"?",":".")+(tn%10); }
const dzFmtM = ms => Math.floor(ms/60000)+":"+String(Math.round(ms/1000)%60).padStart(2,"0"); // 3:00, 1:30
function dzScore(ms){ return 40000+Math.max(0,59999-Math.round(ms/10)); }
function dzScMs(v){ return (59999-(v-40000))*10; }
function dzScTxt(v){ v=+v||0; return v>=40000 ? dzFmt(dzScMs(v)) : Math.min(12,v)+"/12"; }
function duScTxt(v){ return DU.game==="douze" ? dzScTxt(v) : fmtN(v); }
const dzSec = ms => (Math.round(Math.abs(ms)/100)/10).toLocaleString(S.settings.lang==="fr"?"fr-FR":"en-GB",{minimumFractionDigits:1});
function dzRecOf(c){ const r=(S.dzRec||{})[c]; return r && Number.isFinite(+r.ms) && r.ms>0 && Array.isArray(r.sp) && r.sp.length===12 ? r : null; }
function dzBestMs(c){ const r=dzRecOf(c); return r ? +r.ms : 0; }
function dzBestTxt(c){ const b=dzBestMs(c||dzCont()); return b ? dzFmt(b) : "—"; }
function dzRecRows(title){ const rows=[]; DZ_CONTS.forEach(c=>{ const b=dzBestMs(c); if(!b) return; const tr=dzTiers(c), m=b<tr[2]?2:b<tr[1]?1:b<tr[0]?0:-1;
    rows.push([title+" · "+t("dzConts")[c], dzFmt(b), m>=0?t("dzMeds")[m]:""]); }); return rows.length ? rows : [[title,"—"]]; }
// the 12 items of a content in an order: {name, pcs} for a chord, {name, seq:[8 pitch classes]} for a scale
function dzItems(c, ord, rnd){
  const roots = c==="scale" ? TONICS.major : CROOTS[c], byPc={};
  roots.forEach(r=>{ byPc[tonicNote(r).pc]=r; });
  let pcs = ord==="fifths" ? [0,7,2,9,4,11,6,1,8,3,10,5] : [11,10,9,8,7,6,5,4,3,2,1,0];
  if(ord==="rand"){ for(let i=pcs.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [pcs[i],pcs[j]]=[pcs[j],pcs[i]]; } }
  return pcs.map(pc=>{ const r=byPc[pc], name=noteName(tonicNote(r));
    if(c==="scale"){ const sc=spellIv(r, TYPE.major.iv); return {root:r, name, seq:[...sc.map(n=>n.pc), sc[0].pc], label:scaleName("major",r)}; }
    return {root:r, name, pcs:[...new Set(spellChord(c,r,0).map(n=>n.pc))], label:chordSym(c,r)}; }); }
const dzTotal = () => DZ.ms+DZ.pen;
function dzReset(){ cancelAnimationFrame(DZ.raf); clearTimeout(DZ.cmdT);
  Object.assign(DZ,{state:"ready",i:0,step:0,ms:0,pen:0,bad:0,sp:[],held:[],cmd:[],grace:null,medal:-1,newBest:false,prev:0,final:0,late:false,tier:-2});
  DZ.cont = DU.mode ? duContOk("douze",DU.cont) : dzCont();
  DZ.items = dzItems(DZ.cont, DU.mode ? "rand" : dzOrder(), DU.mode ? gRnd : Math.random);
  DZ.ghost = DU.mode ? null : dzRecOf(DZ.cont);
  dzFill(); dzBuild(); dzRender(); }
function dzGo(){ if(DU.view!=="solo" && DU.view!=="play") return; if(DZ.state==="run") return;
  if(DZ.state==="over"){ if(DU.mode) return; dzReset(); }
  DZ.state="run"; DZ.last=performance.now(); audio(); dzTarget(); dzRender(); DZ.raf=requestAnimationFrame(dzTick); }
function dzTick(now){ if(!RN.on || GM!=="douze" || DZ.state!=="run") return;
  const dt=now-DZ.last; DZ.last=now; if(!HOLD) DZ.ms+=Math.min(Math.max(0,dt),250); // held still behind « Quit the game? » and an unplugged keyboard
  dzClock();
  if(DU.mode && DU.opp && DU.opp.done && DU.opp.score>=40000 && dzTotal()>dzScMs(DU.opp.score)){ DZ.late=true; dzFinish(); return; } // already slower than the other's final time
  DZ.raf=requestAnimationFrame(dzTick); }
// MIDI before and after a game: a lone C (continue) or a lone B (start again) plays; a chord does nothing
function dzCmd(pc){ if(!midiMode() || S.settings.midiC===false) return; DZ.cmd.push(pc); clearTimeout(DZ.cmdT);
  DZ.cmdT=setTimeout(()=>{ const b=DZ.cmd; DZ.cmd=[]; if(b.length!==1 || DZ.state==="run" || !RN.on || GM!=="douze") return;
    if(DZ.state==="over" && performance.now()-DZ.doneAt<700) return; if(b[0]===0||b[0]===11) dzGo(); },120); }
function dzNote(m){ const pc=((m%12)+12)%12, now=performance.now();
  if(DZ.state!=="run"){ dzCmd(pc); return; }
  if(HOLD) return;
  const it=DZ.items[DZ.i]; if(!it) return;
  if(DZ.grace && now-DZ.grace.t<350 && DZ.grace.pcs.includes(pc) && !(it.seq ? it.seq[DZ.step]===pc : it.pcs.includes(pc))) return; // the last notes of the chord just found
  if(it.seq){ if(pc===it.seq[DZ.step]){ DZ.step++; if(DZ.step>=it.seq.length) dzCell(now,[pc]); else { dzTarget(); dzRender(); } }
    else if(!(DZ.step>0 && pc===it.seq[DZ.step-1])) dzBad(m); // the same note twice is no mistake
    return; }
  if(!it.pcs.includes(pc)){ dzBad(m); return; }
  DZ.held=DZ.held.filter(h=>now-h.t<1300); DZ.held.push({pc,t:now});
  const have=new Set(DZ.held.map(h=>h.pc)); if(it.pcs.every(p=>have.has(p))) dzCell(now,it.pcs); }
function dzBad(m){ DZ.pen+=2000; DZ.bad++; flashKey(m,"k-bad",300); const p=$("dzPen"); p.hidden=false; p.textContent=t("dzPen")(DZ.bad); p.classList.remove("pop"); void p.offsetWidth; p.classList.add("pop"); dzClock(); }
function dzCell(now,pcs){ DZ.sp.push(dzTotal()); DZ.i++; DZ.held=[]; DZ.step=0; DZ.grace={t:now,pcs}; tone(84,0,.1,.08);
  const c=$("dzRing").children[DZ.i-1]; if(c && !matchMedia("(prefers-reduced-motion: reduce)").matches && c.animate) c.animate([{transform:getComputedStyle(c).transform+" scale(1.18)"},{transform:getComputedStyle(c).transform}],{duration:260,easing:"ease-out"});
  if(DU.mode) duMe(DZ.i<12?DZ.i:dzScore(dzTotal()), DZ.i>=12);
  if(DZ.i>=12){ dzFinish(); return; } dzTarget(); dzRender(); }
function dzTarget(){ clearKeys(); const it=DZ.items[DZ.i]; if(!it || DZ.state!=="run" || DU.mode || !S.settings.dzHint) return; rnHintPcs(it.seq?[it.seq[DZ.step]]:it.pcs, true); }
function dzXP(c,medal){ return (c==="scale"?24:12)+(medal>=0?[3,6,10][medal]:0); }
function dzFinish(){ cancelAnimationFrame(DZ.raf); DZ.state="over"; clearKeys(); DZ.final=dzTotal(); DZ.doneAt=performance.now();
  if(DU.mode){ if(DU.view==="play"||DU.view==="wait") duMe(dzScore(DZ.final), true); dzRender(); return; }
  const tr=dzTiers(DZ.cont), ms=DZ.final, key="douze-"+DZ.cont; DZ.medal = ms<tr[2]?2 : ms<tr[1]?1 : ms<tr[0]?0 : -1;
  DZ.prev=dzBestMs(DZ.cont); DZ.newBest=!DZ.prev || ms<DZ.prev;
  if(DZ.newBest) S.dzRec={...(S.dzRec||{}),[DZ.cont]:{ms,sp:DZ.sp.slice(),at:Date.now()}};
  if(DZ.medal>=0 && DZ.medal+1>(+(S.gameBest||{})[key]||0)) S.gameBest={...(S.gameBest||{}),[key]:DZ.medal+1};
  DZ.xp=dzXP(DZ.cont,DZ.medal); addXP(DZ.xp); renderStatus(); save();
  if(DZ.newBest||DZ.medal>=0){ tone(84,0,.2,.12); tone(88,.12,.3,.12); } else tone(60,0,.3,.1);
  dzRender(); }
// ---- the board ----
function dzFill(){ const c=$("dzCont"), o=$("dzOrder"), C=t("dzConts"), O=t("dzOrders");
  c.innerHTML=DZ_CONTS.map(k=>'<option value="'+k+'">'+C[k]+'</option>').join(""); c.value=dzCont();
  o.innerHTML=DZ_ORDERS.map(k=>'<option value="'+k+'">'+O[k](BNAME())+'</option>').join(""); o.value=dzOrder(); $("dzHelp").checked=!!S.settings.dzHint; }
function dzBuild(){ const r=$("dzRing"); r.innerHTML=""; r.classList.toggle("sc",DZ.cont==="scale");
  DZ.items.forEach((it,k)=>{ const c=document.createElement("span"); c.className="dz-cell"; c.style.setProperty("--a",(k*30)+"deg"); c.textContent=it.name; r.appendChild(c); });
  const k=document.createElement("div"); k.className="dz-clock"; k.innerHTML='<small></small><b class="mono" id="dzTime"></b><span class="mono" id="dzCount"></span>'; k.firstChild.textContent=t("dzClock"); r.appendChild(k);
  $("dzBoard").classList.toggle("duel",!!DU.mode); }
function dzClock(){ const T=dzTotal(), tm=$("dzTime"); if(!tm) return; tm.textContent=dzFmt(DZ.state==="over"?DZ.final:T);
  const g=DZ.ghost; if(g && DZ.state==="run"){ let n=0; while(n<12 && g.sp[n]<=T) n++; const a=n?g.sp[n-1]:0, f=n<12?Math.min(1,(T-a)/Math.max(1,g.sp[n]-a)):0; $("dzBarGh").style.transform="scaleX("+Math.min(1,(n+f)/12)+")"; }
  if(DZ.state==="run" && !DU.mode){ const k=dzTierOf(T); if(k!==DZ.tier){ DZ.tier=k; dzMeds(k,false); } } }
function dzMeds(on,won){ const box=$("dzMeds"), tr=dzTiers(DZ.cont), M=t("dzMeds");
  box.innerHTML=[0,1,2].map(i=>'<span class="dz-med m'+i+(i===on?(won?" won":" on"):"")+(DZ.state==="run"&&i>on?" gone":"")+'"><i></i><span><b></b><small></small></span></span>').join("");
  box.querySelectorAll(".dz-med").forEach((m,i)=>{ m.querySelector("b").textContent=M[i]; m.querySelector("small").textContent="< "+dzFmtM(tr[i]); }); }
function dzRender(){ if(GM!=="douze") return; const st=DZ.state, it=DZ.items[DZ.i], g=DZ.ghost, cells=$("dzRing").children;
  for(let k=0;k<12;k++){ const c=cells[k]; c.classList.toggle("done",k<DZ.i); c.classList.toggle("cur",st==="run"&&k===DZ.i); }
  const tc=$("dzCount"); if(tc) tc.textContent=DZ.i+" / 12";
  $("dzBoard").dataset.st=st; $("dzBoard").classList.toggle("duel",!!DU.mode);
  const kick=$("dzKick"), name=$("dzName"), qual=$("dzQual"), gap=$("dzGap"), stf=$("dzStaff"), startTxt=midiMode()?t("dzAgain")(CNAME(),BNAME()):t("gmTap");
  stf.innerHTML=""; gap.className="dz-gap"; gap.textContent="";
  if(st==="ready"){ kick.textContent=t("dzName")+" · "+t("dzConts")[DZ.cont]+(DU.mode?"":" · "+t("dzOrders")[dzOrder()](BNAME()).toLowerCase());
    name.textContent=t("gmReady"); qual.textContent=""; gap.textContent=(DZ.cont==="scale"?t("dzHowS"):t("dzHowC"))+" "+(midiMode()?t("rnStart")+".":t("gmTap")); }
  else if(st==="run" && it){ kick.textContent = it.seq ? t("dzKickS")(DZ.i+1,DZ.step+1) : t("dzKickC")(DZ.i+1);
    name.textContent=it.name; qual.textContent=t("dzQual")[DZ.cont];
    if(!it.seq && staffOn()){ const sv=staffTargetSVG({pcs:it.pcs,label:it.label},150,7); if(sv) stf.innerHTML=sv; }
    if(DU.mode) gap.textContent=t("dzDuelHow");
    else if(g && DZ.i>0){ const d=DZ.sp[DZ.i-1]-g.sp[DZ.i-1]; gap.classList.add(d<0?"ahead":d>0?"behind":"even"); gap.textContent=d<0?t("dzAhead")(dzSec(d)):d>0?t("dzBehind")(dzSec(d)):t("dzEven"); }
    else if(!g) gap.textContent=t("dzNoRec"); }
  else if(st==="over"){ const tr=dzTiers(DZ.cont);
    kick.textContent = DU.mode ? (DZ.late?t("dzLate"):t("gmOver")) : DZ.newBest&&DZ.prev ? t("rnNew") : t("gmOver");
    name.textContent=dzFmt(DZ.final); qual.textContent=DU.mode?"":DZ.medal>=0?t("dzMedal")[DZ.medal]:"";
    if(!DU.mode){ const nx=DZ.medal<2?DZ.medal+1:-1, d=DZ.prev?DZ.final-DZ.prev:0;
      gap.textContent=(DZ.prev&&d?(d<0?t("dzAhead")(dzSec(d)):t("dzBehind")(dzSec(d)))+" · ":"")+(nx>=0?t("dzAim")(nx,dzFmtM(tr[nx])):t("dzAllGold"))+" "+t("dzXp")(DZ.xp||0)+" · "+(midiMode()?startTxt:t("dzTapAgain"));
      if(DZ.prev&&d) gap.classList.add(d<0?"ahead":"behind"); } }
  // you / ghost
  const sf=it&&it.seq&&st==="run"?DZ.step/8:0; $("dzBarMe").style.transform="scaleX("+Math.min(1,(DZ.i+sf)/12)+")";
  $("dzTMe").textContent = st==="over" ? dzFmt(DZ.final) : DZ.i ? dzFmt(DZ.sp[DZ.i-1]) : "—";
  $("dzTGh").textContent = !g ? "—" : st==="over" ? dzFmt(g.ms) : DZ.i ? dzFmt(g.sp[DZ.i-1]) : dzFmt(g.ms);
  $("dzBoard").classList.toggle("nog",!g);
  if(st!=="run") $("dzBarGh").style.transform="scaleX("+(g&&st==="over"?1:0)+")";
  const p=$("dzPen"); p.hidden=!DZ.bad; if(DZ.bad) p.textContent=t("dzPen")(DZ.bad);
  const live = st==="run" ? dzTierOf(dzTotal()) : -1; dzMeds(st==="over"?DZ.medal:live, st==="over"); DZ.tier=live;
  $("rnBest").textContent=t("rnBestL")+" "+dzBestTxt(DZ.cont); $("rnScore").textContent="";
  dzClock(); }
function dzTierOf(T){ const tr=dzTiers(DZ.cont); return T<tr[2]?2:T<tr[1]?1:T<tr[0]?0:-1; }
// bots: one cell after the other, their pace from their rating (a 800 bot runs the 12 major chords in about 2 minutes)
function dzBotPlan(elo, seed){ const r=duRng(seed^0x2545f491), s=Math.max(0,Math.min(1,(elo-100)/2100)), k={maj:1,min:1.1,dom7:1.35,scale:2.2}[duContOk("douze",DU.cont)];
  const ev=[]; let tm=0; for(let i=1;i<=12;i++){ tm+=(14-12.5*s)*k*1000*(0.6+r()*0.8); if(r()<(1-s)*0.35) tm+=2000; ev.push(i<12?[tm,i]:[tm,dzScore(tm),1]); } return ev; }
// ---- wiring ----
$("dzCont").addEventListener("change",e=>{ S.settings.dzCont=e.target.value; if(!DU.mode) DU.cont=dzCont(); save(); gameRestart(); });
$("dzOrder").addEventListener("change",e=>{ S.settings.dzOrder=e.target.value; save(); gameRestart(); });
$("dzHelp").addEventListener("change",e=>{ S.settings.dzHint=e.target.checked; save(); dzTarget(); });
$("dzBoard").addEventListener("pointerdown",()=>{ if(GM==="douze" && DZ.state!=="run" && performance.now()-DZ.doneAt>500) dzGo(); });
document.addEventListener("keydown",e=>{ if(!RN.on || GM!=="douze" || DZ.state==="run" || !gmKeyFree(e) || !(e.code==="Space"||e.code==="Enter")) return; if(performance.now()-DZ.doneAt<500) return; e.preventDefault(); dzGo(); });
// the duel lobby offers the four contents of the Douze (its own setting, the other games keep theirs)
function dzDuCont(){ const box=$("duCont"), k=DU.game==="douze"?"douze":"std";
  if(box.dataset.k!==k){ box.dataset.k=k; box.innerHTML = k==="douze" ? DZ_CONTS.map(c=>'<button type="button" data-v="'+c+'"></button>').join("") : '<button type="button" data-v="chords"></button><button type="button" data-v="notes"></button>'; }
  box.querySelectorAll("button").forEach(b=>b.textContent = k==="douze" ? t("dzContsS")[b.dataset.v] : t(b.dataset.v==="notes"?"duNotes":"duChords")); }
$("duCont").addEventListener("click",e=>{ if(DU.game!=="douze") return; const b=e.target.closest("[data-v]"); e.stopImmediatePropagation(); if(!b) return;
  DU.cont=duContOk("douze",b.dataset.v); S.settings.dzCont=DU.cont; save(); DU.botPick=null; dzFill(); if(GM==="douze" && !DU.mode) dzReset(); duRender(); },true);
{ const _rl=duRenderLobby; duRenderLobby=function(){ dzDuCont(); return _rl.apply(this,arguments); }; }
{ const _sg=duStopGame; duStopGame=function(){ if(DZ.state==="run"){ cancelAnimationFrame(DZ.raf); DZ.state="over"; DZ.doneAt=performance.now(); } return _sg.apply(this,arguments); }; }
OBJ.douze=()=>{ const o=O3(), C=["#ff5a6e","#ff7a4f","#ff9a3c","#ffb83d","#ffd23f","#9ad85a","#3ddc84","#3cc8f0","#4c9cff","#5b7cff","#8a6bff","#b26bff"];
  o.ball(60,62,26,"#fbfbff").raw('<path d="M60 62V46" stroke="#2b2560" stroke-width="5" stroke-linecap="round"/><path d="M60 62l10 7" stroke="#ff5a6e" stroke-width="4" stroke-linecap="round"/><circle cx="60" cy="62" r="4" fill="#2b2560"/>');
  C.forEach((c,k)=>{ const a=(k*30-90)*Math.PI/180; o.ball(+(60+44*Math.cos(a)).toFixed(1), +(62+44*Math.sin(a)).toFixed(1), 9.5, c); }); return o.svg(); };
// best times: the smaller wins between devices, the ghost goes with its record (the medals in gameBest are merged as the max)
{ const _ms=mergeState; mergeState=function(local, cloud){ const r=_ms.apply(this,arguments); const isO=x=>x&&typeof x==="object"&&!Array.isArray(x), c=isO(cloud)?cloud:{};
    const ra=isO(local.dzRec)?local.dzRec:{}, rc=isO(c.dzRec)?c.dzRec:{}, rec={};
    DZ_CONTS.forEach(k=>{ const g=[ra[k],rc[k]].filter(x=>isO(x)&&Number.isFinite(+x.ms)&&Array.isArray(x.sp)).sort((x,y)=>x.ms-y.ms)[0]; if(g) rec[k]=g; });
    if(Object.keys(rec).length) r.merged.dzRec=rec; else delete r.merged.dzRec;
    r.changed=JSON.stringify(r.merged)!==JSON.stringify(local); return r; }; }
/* ==== fin Les Douze ==== */
