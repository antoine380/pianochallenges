// fragment de l'IIFE principale — ordre 660, voir src/app/README.md
// ======================= D5 · test de placement =======================
// 7 consignes de 8 s : Fa, Si, Do Ré Mi Fa Sol, Do central, Do majeur, un rythme, Sol majeur. Première erreur (ou « Je ne sais pas »,
// ou temps écoulé) = place : P04, P04, P04, P02, P07, P09, P11 ; tout juste = étape 2 de Ma route (accords). Jamais d'échec : on place.
const PL_Q=[{k:"note",pc:5,to:"p04"},{k:"note",pc:11,to:"p04"},{k:"seq",pcs:[0,2,4,5,7],to:"p04"},{k:"mid",to:"p02"},{k:"chord",pcs:[0,4,7],to:"p07"},{k:"beat",to:"p09"},{k:"chord",pcs:[7,11,2],to:"p11"}];
const PL_SEC=8;
let PL={st:"intro", i:0, ok:0, to:null, got:[], ch:new Map(), busy:0, t0:0, tm:[], hits:[], beats:[], fb:"", placed:[], rt:[]};
function plClear(){ PL.tm.forEach(clearTimeout); PL.tm=[]; clearInterval(PL.iv); }
function plLater(fn, ms){ const id=setTimeout(()=>{ PL.tm=PL.tm.filter(x=>x!==id); fn(); },ms); PL.tm.push(id); }
function plOpen(){ plClear(); PL={st:"intro", i:0, ok:0, to:null, got:[], ch:new Map(), busy:0, t0:0, tm:[], hits:[], beats:[], fb:"", placed:[], rt:[]}; PP.id=null; PP.L=null; PP.lit.clear(); PP.demo.clear(); PP.zone=[];
  if(INFO_PAGES.includes(page)) closeSet(); ppGoPage("place"); }
function plSay(q){ const N=ppNames();
  if(q.k==="note") return [t("plNote")(N[q.pc]), t("plNoteS")];
  if(q.k==="seq") return [t("plSeq")(q.pcs.map(p=>N[p])), PL.got.length ? PL.got.map(m=>N[md12(m)]).join(", ")+" ✓ "+t("plCont") : t("plSeqS")];
  if(q.k==="mid") return [t("plMid")(N[0]), t("plMidS")];
  if(q.k==="beat") return [t("plBeat")(N[0]), t("plBeatS")];
  return [t("plChord")(N[q.pcs[0]]), t("plChordS")(q.pcs.map(p=>N[p]))+(ppInp()!=="midi"?" "+t("plChordM"):"")]; }
function plRender(){ const P=$("ppPanel"); if(!P) return; const n=PL_Q.length, C=CNAME();
  if(PL.st==="res"){ plRenderRes(P); return; }
  const top='<div class="pl-top"><span class="pp-badge">'+PP_FOOT+'</span><div class="pp-tt"><small>'+esc(t("plKick"))+'</small><b>'+esc(t("plT"))+'</b></div><span class="pp-push"></span><button class="pp-x" type="button" id="plX" aria-label="'+esc(t("ppQuit"))+'"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>';
  let mid;
  if(PL.st==="intro") mid='<div class="pl-mid pl-intro"><p class="pp-sub">'+esc(t("plSub")(n))+'</p><p class="pl-ix">'+esc(t("plIntro"))+'</p><button class="pp-main" type="button" id="plGo">'+esc(t("plGo"))+'</button>'+(ppInp()==="midi"?'<small class="pp-orc">'+esc(t("plOrC")(C))+'</small>':'')+'</div>';
  else { const q=PL_Q[PL.i], [say,sub]=plSay(q), beat=q.k==="beat";
    mid='<div class="pl-mid"><div class="pl-qh"><small class="pp-k">'+esc(t("plQ")(PL.i+1,n))+'</small><ol class="pl-prog" aria-hidden="true">'+PL_Q.map((_,i)=>'<li class="'+(i<PL.i?"ok":i===PL.i?"cur":"")+'"></li>').join("")+'</ol></div>'
      +'<div class="pl-q"><div class="pl-qt"><p class="pp-say" id="plSay" aria-live="polite">'+esc(say)+'</p><p class="pp-sub" id="plSub">'+esc(sub)+'</p><p class="pp-fb ok" id="plFb" role="status">'+esc(PL.fb)+'</p></div>'
      +(beat?'<div class="pl-beat" id="plBeat" aria-hidden="true">'+Array.from({length:8},(_,i)=>'<i class="'+(i<4?"l":"y")+'"></i>').join("")+'</div>'
        :'<div class="pl-ring" id="plRing" aria-hidden="true"><svg viewBox="0 0 44 44"><circle class="tr" cx="22" cy="22" r="19"/><circle class="fg" cx="22" cy="22" r="19" pathLength="100"/></svg><b id="plSec">'+PL_SEC+'</b></div>')+'</div></div>'; }
  P.innerHTML='<div class="pp-lesson pl-wrap">'+top+mid+'<div class="pp-kbw"><div class="kbd pp-kb" id="ppKb" aria-label="Piano">'+ppKbHTML()+'</div></div>'
    +'<div class="pp-foot pl-foot"><span class="pp-inp">'+esc((t("ppIn")||{})[ppInp()]||"")+'</span><span class="pp-push"></span>'+(PL.st==="q"?'<button class="btn" type="button" id="plDunno">'+esc(t("plDunno"))+'</button>':'')+'</div></div>';
  $("plX").onclick=()=>{ plClear(); openPage("learn"); };
  if($("plGo")) $("plGo").onclick=plStart;
  if($("plDunno")) $("plDunno").onclick=()=>plDoubt(null);
  const kb=$("ppKb"); kb.addEventListener("pointerdown",e=>{ const el=e.target.closest("[data-m]"); if(!el) return; e.preventDefault(); const m=+el.dataset.m; try{ tone(m); }catch(er){} ppIn([m],false); });
  kb.addEventListener("contextmenu",e=>e.preventDefault()); ppPaint(); }
function plStart(){ PL.st="q"; PL.i=0; PL.ok=0; plAsk(); }
function plAsk(){ plClear(); const q=PL_Q[PL.i]; PL.got=[]; PL.ch=new Map(); PL.fb=""; PP.lit.clear(); PL.hits=[]; PL.beats=[]; PL.t0=performance.now(); PL.busy=PL.t0+350; plRender();
  if(q.k==="beat"){ plBeatRun(); return; }
  const ring=$("plRing"); if(ring) ring.style.setProperty("--dur",PL_SEC+"s");
  PL.iv=setInterval(()=>{ const left=Math.max(0,Math.ceil(PL_SEC-(performance.now()-PL.t0)/1000)), b=$("plSec"); if(b) b.textContent=left; if(left<=0){ clearInterval(PL.iv); plDoubt(null); } },200); }
function plBeatRun(){ const spb=750, t0=performance.now()+700, lat=ppInp()==="mic"?80:ppInp()==="midi"?midiLat():0; PL.lat=lat;
  for(let i=0;i<8;i++){ const at=t0+i*spb; PL.beats.push(at); plLater(()=>{ try{ tone(i<4?96:91,0,.05,i<4?.16:.12); }catch(e){} const box=$("plBeat"); if(box){ box.querySelectorAll("i").forEach((x,j)=>x.classList.toggle("on",j===i)); }
      if(i===4){ const s=$("plSub"); if(s) s.textContent=t("plBeatY"); } if(i===0){ const s=$("plSub"); if(s) s.textContent=t("plBeatL"); } }, Math.max(0,at-performance.now())); }
  plLater(plBeatEnd, t0+7*spb+500-performance.now()); }
function plBeatEnd(){ const win=ppInp()==="mic"?300:220, tg=PL.beats.slice(4), hit=tg.filter(b=>PL.hits.some(h=>Math.abs(h-b)<=win)).length;
  if(hit>=3) plOk(); else plDoubt(null); }
function plIn(b, lone){ if(PL.st==="intro"){ if(lone && md12(b[0])===0) plStart(); return; }
  if(PL.st==="res"){ if(lone && md12(b[0])===0){ const m=$("plMain"); if(m) m.click(); } return; }
  const q=PL_Q[PL.i], now=performance.now(); if(!q || now<PL.busy) return;
  if(q.k==="beat"){ b.forEach(m=>{ PL.hits.push(now-35-(PL.lat||0)); }); return; }
  for(const m of b){ const pc=md12(m);
    if(q.k==="note"){ if(pc===q.pc) return plOk(m); return plDoubt(m); }
    if(q.k==="mid"){ if(m===60) return plOk(m); return plDoubt(m); }
    if(q.k==="seq"){ const g=PL.got;
      if(g.length && pc===q.pcs[g.length]){ g.push(m); PP.lit.add(m); if(g.length===q.pcs.length) return plOk(m); plSub(); ppPaint(); continue; }
      if(g.length && pc===md12(g[g.length-1])) continue; // the mic hears the same note twice
      if(pc===q.pcs[0]){ PL.got=[m]; PP.lit=new Set([m]); plSub(); ppPaint(); continue; }
      return plDoubt(m); }
    if(q.k==="chord"){ if(!q.pcs.includes(pc)) return plDoubt(m); PL.ch.set(pc,now); PP.lit.add(m); ppPaint();
      if(q.pcs.every(x=>PL.ch.has(x) && now-PL.ch.get(x)<4000)) return plOk(m); } } }
function plSub(){ const s=$("plSub"); if(s) s.textContent=plSay(PL_Q[PL.i])[1]; }
function plOk(m){ plClear(); PL.ok++; PL.busy=performance.now()+9e9; if(m!=null) ppKeyCls(m,"k-hit",600); PL.fb=t("plOk"); const f=$("plFb"); if(f) f.textContent=PL.fb;
  plLater(()=>{ if(PL.i+1<PL_Q.length){ PL.i++; plAsk(); } else plDone(null); },650); }
function plDoubt(m){ if(PL.st!=="q") return; plClear(); if(m!=null) ppKeyCls(m,"pp-warn",320); plDone(PL_Q[PL.i].to); }
function plDone(to){ plClear(); PL.st="res"; PL.to=to||"s2"; plApply(PL.to); plRender(); }
// the lessons before the start are « known » (stars 0, place:1): the map ticks them in light grey, they can still be opened
function plApply(to){ const p=ppS(), now=Date.now(), upto = to==="s2" ? PP_IDS.length : PP_IDS.indexOf(to); PL.placed=[]; PL.rt=[];
  PP_IDS.slice(0,upto).forEach(id=>{ if(!p.done[id]){ p.done[id]={at:now, stars:0, place:1, tries:0}; PL.placed.push(id); } });
  p.on=true; if(!p.start) p.start=now; p.cur=ppFirstOpen(p); p.step=0; p.place={to, at:now, ok:PL.ok};
  S.onb={...(L4isO(S.onb)?S.onb:{}), place:to};
  if(to==="s2"){ const r=rtS(); RT_STAGES[0].forEach(x=>{ if(!r.done[x.id]){ r.done[x.id]=now; PL.rt.push(x.id); } }); if(!r.st[1]) r.st[1]=now; }
  else S.resume={kind:"pp", id:to, step:0, at:now, v:PP_V, inp:ppInp()};
  save(); }
function plUndo(){ const p=ppS(); Object.keys(p.done).forEach(id=>{ const d=p.done[id]; if(d && d.place && !(+d.stars>0)) delete p.done[id]; }); p.cur=ppFirstOpen(p); delete p.place;
  const r=rtS(); (PL.rt||[]).forEach(id=>delete r.done[id]); if(PL.rt&&PL.rt.length && !RT_STAGES[0].every(x=>r.done[x.id])) delete r.st[1];
  if(L4isO(S.onb)) delete S.onb.place; if(S.resume&&S.resume.kind==="pp") S.resume=null; save(); }
const plAcqIds = () => PP_IDS.filter(id=>{ const d=((S.pp||{}).done||{})[id]; return d && d.place && !(+d.stars>0); });
function plRenderRes(P){ const all=PL.to==="s2", n=all?0:ppNum(PL.to), acq=plAcqIds().length;
  P.innerHTML='<div class="pp-lesson pl-wrap pl-res"><div class="pl-top"><span class="pp-badge">'+PP_FOOT+'</span><div class="pp-tt"><small>'+esc(t("plRes"))+'</small><b>'+esc(t("plT"))+'</b></div><span class="pp-push"></span></div>'
    +'<div class="pl-rc">'+(PL.ok?'<span class="pl-chip">✓ '+esc(t("plGood")(PL.ok))+'</span>':'')+'<h2>'+esc(all?t("plAllT"):t("plStart")(n))+'</h2><p class="pl-rs">'+esc(all?t("plAllX"):ppTitle(PL.to))+'</p>'
    +'<div class="pp-pmap pl-map">'+ppDots(PP_IDS,true)+'</div>'+(!all&&acq?'<p class="pl-note">'+esc(t("plAcqN")(acq))+'</p>':'')
    +'<div class="pl-btns"><span><button class="pp-main" type="button" id="plMain">'+esc(all?t("plAllGo"):t("plHere"))+'</button>'+(ppInp()==="midi"?'<small class="pp-orc">'+esc(t("plOrC")(CNAME()))+'</small>':'')+'</span>'
    +'<button class="pp-link" type="button" id="plRestart">'+esc(all?t("plAllPp"):t("plFromStart"))+'</button></div></div></div>';
  P.querySelectorAll(".pl-map .pp-dot.acq .pp-dt").forEach(x=>x.textContent=t("plAcq"));
  ppDotClick(P.querySelector(".pl-map"));
  $("plMain").onclick=()=>{ if(all){ openPage("learn"); } else ppOpen(PL.to,0,0); };
  $("plRestart").onclick=()=>{ plUndo(); ppBegin(); }; }
{ const _pd=ppDots; ppDots=function(ids){ let h=_pd.apply(this,arguments); const d=((S.pp||{}).done)||{}; ids.forEach(id=>{ const x=d[id]; if(x && x.place && !(+x.stars>0)) h=h.replace(new RegExp('class="pp-dot done([^"]*)" data-id="'+id+'"'),'class="pp-dot done acq$1" data-id="'+id+'"'); }); return h; }; }
{ const _rd=ppRender; ppRender=function(){ if(PP.view==="place"){ plRender(); return; } return _rd.apply(this,arguments); }; }
{ const _pi=ppIn; ppIn=function(b, lone){ if(page==="pp" && PP.view==="place"){ if(anyModal()) return; b.forEach(ppPress); plIn(b, lone); return; } return _pi.apply(this,arguments); }; }
{ const _ps=ppStop; ppStop=function(){ plClear(); return _ps.apply(this,arguments); }; }
// first launch: « I know a few notes » → the placement test instead of the 3 chords
{ const _go=fnGo; fnGo=function(){ if(FN.level==="notes"){ fnApply(); fnClose(); setInput(FN.how, FN.how!=="screen"); plOpen(); return; } return _go.apply(this,arguments); }; }

