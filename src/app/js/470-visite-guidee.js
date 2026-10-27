// fragment de l'IIFE principale — ordre 470, voir src/app/README.md
// ---------- Guided tour: a bubble on each part of the app (next / close) ----------
const TOUR={i:0, steps:[]};
function tourSteps(){ return [["#modeNav [data-mode=learn]","learn"],["#modeNav [data-mode=games]","games"],["#modeNav [data-mode=play]","play"],["#modeNav [data-mode=quiz]","quiz"],
  ["#hsDaily","daily"],["#lvlAv","level"],["#ntfBtn","ntf"],["#rankBtn","rank"],["#inChip","input"],["#setBtn","settings"]]; }
const menuIsDrawer = () => !!($("menuBtn") && $("menuBtn").offsetParent);
function tourStart(){ if(!TOUR.custom && page!=="hub" && !(NET.ch||NET.lobby||DU.ch||DU.mode)) openPage("hub"); TOUR.steps=TOUR.custom ? TOUR.custom.slice() : tourSteps(); TOUR.i=0; let o=$("tour"); if(!o){ o=document.createElement("div"); o.id="tour"; o.className="tour"; document.body.appendChild(o);
    o.innerHTML='<div class="tour-hole" id="tourHole"></div><div class="tour-tip" id="tourTip" role="dialog" aria-live="polite"><button class="tour-x" type="button" id="tourX"></button><p class="tour-k" id="tourK"></p><h3 id="tourH"></h3><ul id="tourL"></ul><div class="tour-foot"><button class="gt-link" type="button" id="tourSkip"></button><button class="btn" type="button" id="tourPrev"></button><button class="btn primary" type="button" id="tourNext"></button></div></div>';
    $("tourX").innerHTML="×"; $("tourX").onclick=tourEnd; $("tourSkip").onclick=tourEnd; $("tourNext").onclick=()=>tourGo(1); $("tourPrev").onclick=()=>tourGo(-1);
    addEventListener("resize",()=>{ if(!$("tour").hidden) tourShow(); }); document.addEventListener("keydown",e=>{ if($("tour").hidden) return; const k=e.key;
      if(k==="Escape"||k==="ArrowRight"||k==="ArrowLeft"){ e.preventDefault(); if(k==="Escape") tourEnd(); else tourGo(k==="ArrowRight"?1:-1); }
      else if(!(e.target.closest && e.target.closest("#tour"))) e.preventDefault(); // nothing reaches the app behind the tour
      e.stopImmediatePropagation(); },true); }
  o.hidden=false; const dr=!TOUR.custom && menuIsDrawer(); if(dr) openDrawer(); setTimeout(tourShow,dr?340:0); }
function tourGo(d){ const n=TOUR.steps.length; TOUR.i+=d; if(TOUR.i>=n){ tourEnd(); return; } TOUR.i=Math.max(0,TOUR.i); tourShow(); }
function tourEnd(){ if(TOUR.custom){ const f=TOUR.onEnd; TOUR.custom=null; TOUR.onEnd=null; TOUR.kf=null; $("tour").hidden=true; if(f) f(); return; } // a page tutorial (Gammes une à une)
  $("tour").hidden=true; S.tourDone=1; save(); closeDrawer(); if(TOUR.after){ openPage(TOUR.after); TOUR.after=null; } onbInput(); }
function tourShow(){ const st=TOUR.steps[TOUR.i]; if(!st) return tourEnd(); const el=document.querySelector(st[0]);
  if(!el || !el.getClientRects().length){ TOUR.steps.splice(TOUR.i,1); return tourShow(); }
  try{ el.scrollIntoView({block:"nearest",inline:"nearest"}); }catch(e){}
  const r=el.getBoundingClientRect(), pad=6, hole=$("tourHole"), tip=$("tourTip"), n=TOUR.steps.length;
  Object.assign(hole.style,{left:(r.left-pad)+"px",top:(r.top-pad)+"px",width:(r.width+pad*2)+"px",height:(r.height+pad*2)+"px"});
  $("tourK").textContent=TOUR.kf ? TOUR.kf(TOUR.i+1,n) : (TOUR.i+1)+" / "+n; const d=st[2]||t("tourT")[st[1]]; $("tourH").textContent=d[0];
  const ul=$("tourL"); ul.innerHTML=""; d[1].forEach(x=>{ const li=document.createElement("li"); li.textContent=x; ul.appendChild(li); });
  $("tourNext").textContent = TOUR.i===n-1 ? t("tourDone") : t("onbNextT"); $("tourPrev").textContent=t("onbPrev"); $("tourPrev").hidden=!TOUR.i; $("tourSkip").textContent=t("tourSkipT"); $("tourX").setAttribute("aria-label",t("close"));
  // place the bubble next to the element: on the right of the menu, otherwise below / above
  const W=document.documentElement.clientWidth, H=innerHeight; tip.style.maxWidth=Math.min(340,W-24)+"px"; const tw=Math.min(340,W-24), th=tip.offsetHeight||200; let x,y; tip.dataset.side="";
  if(r.right+16+tw<W && r.left<W/2 && r.right>0){ x=r.right+16; y=Math.max(12,Math.min(H-th-12, r.top+r.height/2-th/2)); tip.dataset.side="right"; }
  else if(r.bottom+16+th<H){ x=Math.max(12,Math.min(W-tw-12, r.left+r.width/2-tw/2)); y=r.bottom+14; tip.dataset.side="below"; }
  else { x=Math.max(12,Math.min(W-tw-12, r.left+r.width/2-tw/2)); y=Math.max(12,r.top-th-14); tip.dataset.side="above"; }
  x=Math.max(12,Math.min(W-tw-12,x)); tip.style.left=x+"px"; tip.style.top=y+"px"; $("tourNext").focus({preventScroll:true}); }
$("tourAgain").addEventListener("click",()=>{ S.tourDone=0; save(); tourStart(); });
$("onbAgain").addEventListener("click",()=>{ ONB.a={why:[],level:null,staff:null,how:null,cont:null}; ONB.redo=true; onbOpen(); });

addEventListener("resize",()=>{ try{ staffSoon(); }catch(e){} });
if(S.settings.staff) setTimeout(()=>{ try{ bravura(); }catch(e){} },300);
