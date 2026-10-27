// fragment de l'IIFE principale — ordre 460, voir src/app/README.md
// ---------- Onboarding ----------
const ONB={i:0, a:{why:[], level:null, staff:null, how:null, cont:null}};
function onbQs(){ return [
  {k:"why", multi:true, opts:[["fun","heart"],["songs","play"],["theory","learn"],["accomp","guitar"],["create","palette"],["school","book"]]},
  {k:"level", opts:[["debut","leaf"],["notes","scales"],["simple","chords"],["adv","crown"]]},
  {k:"staff", opts:[["yes","staff"],["learn","book"],["no","play"]]},
  {k:"how", opts:["midi","mic","screen"].filter(v=>inputModes().includes(v)).map(v=>[v,{midi:"games",mic:"bell",screen:"play"}[v]])},
  {k:"cont", opts:[["notes","star"],["chords","harmony"]]},
  {k:"friends"} ]; }
function onbOpen(){ let o=$("onb"); if(!o){ o=document.createElement("div"); o.id="onb"; o.className="onb"; o.setAttribute("role","dialog"); o.setAttribute("aria-modal","true"); document.body.appendChild(o); }
  o.hidden=false; document.body.classList.add("gate-on"); startInert(); ONB.i=0; onbRender(); }
function onbClose(){ $("onb").hidden=true; document.body.classList.remove("gate-on"); startInert(); }
function onbRender(){ const o=$("onb"), Q=onbQs(), n=Q.length, i=ONB.i, fin=i>=n;
  o.innerHTML='<div class="onb-card"><div class="onb-top"><button class="onb-back" type="button" id="onbBack"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button><div class="onb-bar"><i></i></div><button class="gt-link onb-skip" type="button" id="onbSkip"></button></div>'
    +'<div class="onb-body"><p class="onb-k"></p><h2 class="onb-h"></h2><p class="onb-sub"></p><div class="onb-opts" id="onbOpts"></div></div><div class="onb-foot"><button class="gt-go onb-next" type="button" id="onbNext"></button></div></div>';
  o.querySelector(".onb-bar i").style.width=Math.min(100,(i+(fin?1:0))/n*100)+"%"; $("onbBack").style.visibility=i?"visible":"hidden"; $("onbBack").setAttribute("aria-label",t("onbPrev"));
  $("onbBack").onclick=()=>{ ONB.i=Math.max(0,i-1); onbRender(); }; $("onbSkip").textContent=t("onbSkip"); $("onbSkip").onclick=()=>onbFinish(true);
  const box=$("onbOpts"), next=$("onbNext");
  if(fin){ o.querySelector(".onb-k").textContent=t("onbDoneK"); o.querySelector(".onb-h").textContent=t("onbDoneH"); o.querySelector(".onb-sub").textContent=t("onbDoneSub");
    box.className="onb-sum"; onbSummary().forEach(([ic,tx])=>{ const d=document.createElement("div"); d.className="onb-li"; d.innerHTML='<span class="onb-ic">'+OBJ[ic]()+'</span><span></span>'; d.lastChild.textContent=tx; box.appendChild(d); });
    if(ONB.redo){ next.textContent=t("onbFinishT"); next.onclick=()=>{ ONB.redo=false; onbFinish(false,true); }; $("onbSkip").hidden=true; return; }
    next.textContent=t("onbTour"); next.onclick=()=>onbFinish(false);
    const sk=document.createElement("button"); sk.type="button"; sk.className="gt-link"; sk.id="onbNoTour"; sk.textContent=t("onbNoTour"); sk.onclick=()=>{ S.tourDone=1; onbFinish(false,true); }; o.querySelector(".onb-foot").appendChild(sk); $("onbSkip").hidden=true; return; }
  const q=Q[i]; o.querySelector(".onb-k").textContent=t("onbStep")(i+1,n); o.querySelector(".onb-h").textContent=t("onbQ_"+q.k); o.querySelector(".onb-sub").textContent=t(q.k==="friends"&&paywallOn()?"onbS_friendsP":"onbS_"+q.k);
  if(q.k==="friends"){ box.className="onb-friends"; const link="https://pianochallenges.com/?ref="+netId();
    box.innerHTML='<div class="onb-avs">'+[1,3,5].map(x=>'<span class="gt-av">'+avatarSVG(x)+'</span>').join("")+'</div><div class="onb-link"><input readonly class="mono"><button class="btn" type="button" id="onbCopy"></button></div><button class="gt-go onb-share" type="button" id="onbShare"></button>';
    box.querySelector("input").value=link; $("onbCopy").textContent=t("qzCopyT"); $("onbShare").textContent=t("onbShare");
    $("onbCopy").onclick=()=>{ try{ navigator.clipboard.writeText(link).then(()=>{ $("onbCopy").textContent=t("qzCopied"); },()=>{}); }catch(e){} };
    $("onbShare").hidden=!navigator.share; $("onbShare").onclick=()=>{ navigator.share({title:"Piano Challenges", text:t("onbShareTxt"), url:link}).catch(()=>{}); };
    next.textContent=t("onbLater"); next.onclick=()=>{ ONB.i++; onbRender(); }; return; }
  box.className="onb-opts"+(q.opts.length>4?" six":"");
  q.opts.forEach(([v,ic])=>{ const b=document.createElement("button"); b.type="button"; b.className="onb-opt"; const on = q.multi ? ONB.a[q.k].includes(v) : ONB.a[q.k]===v; b.setAttribute("aria-pressed",on);
    b.innerHTML='<span class="onb-ic">'+(OBJ[ic]?OBJ[ic]():"")+'</span><span class="onb-ot"><b></b><small></small></span><i class="su-tick"></i>'; const L=t("onbO_"+q.k)[v]; b.querySelector("b").textContent=L[0]; b.querySelector("small").textContent=L[1];
    b.onclick=()=>{ if(q.multi){ const a=ONB.a[q.k]; ONB.a[q.k]=a.includes(v)?a.filter(x=>x!==v):[...a,v]; } else ONB.a[q.k]=v; onbRender(); if(!q.multi) setTimeout(()=>{ if(ONB.i===i){ ONB.i++; onbRender(); } },260); };
    box.appendChild(b); });
  const has = q.multi ? ONB.a[q.k].length>0 : ONB.a[q.k]!=null; next.textContent=t("onbNextT"); next.disabled=!has; next.onclick=()=>{ ONB.i++; onbRender(); }; }
// what the answers change in the app
const ONB_ELO={debut:600, notes:800, simple:1000, adv:1200};
function onbApply(){ const a=ONB.a, st=S.settings;
  if(a.level){ const L=a.level; st.guideK = L==="debut"; st.labels = L==="debut"||L==="notes"; st.fing = L!=="adv"; st.guideP = L!=="adv"; st.guideN = false;
    st.unlockAll = L==="adv"; S.eloStart=ONB_ELO[L]; }
  if(a.staff){ st.staff = a.staff!=="no"; if(st.staff){ st.labels = st.labels || a.staff==="learn"; try{ bravura(); }catch(e){} } }
  if(a.cont){ st.gmCont=a.cont; st.duCont=a.cont; st.scMode=a.cont==="chords"?"chords":"notes"; st.quiz={...(st.quiz||{}), ans:a.cont}; }
  S.onb={done:1, why:a.why, level:a.level, staff:a.staff, how:a.how, cont:a.cont, at:Date.now()}; save(); renderSettings(); render();
  if(a.how) ONB.pendIn=a.how; } // applied once the onboarding and the tour are closed (the MIDI window must not open under them)
function onbInput(){ const v=ONB.pendIn; ONB.pendIn=null; if(v) setInput(v,true); else if(!S.settings.input) maybeAskInput(); }
function onbSummary(){ const a=ONB.a, out=[], L=a.level;
  if(L) out.push(["learn", t("onbSumLevel")[L]]);
  if(a.staff) out.push(["staff", t("onbSumStaff")[a.staff]]);
  if(a.how) out.push([{midi:"games",mic:"bell",screen:"play"}[a.how], t("onbSumHow")[a.how]]);
  if(a.cont) out.push([a.cont==="chords"?"harmony":"star", t("onbSumCont")[a.cont]]);
  const w=a.why; if(w.includes("songs")) out.push(["play", t("onbSumWhy").songs]); else if(w.includes("theory")||w.includes("school")) out.push(["scales", t("onbSumWhy").theory]); else if(w.length) out.push(["daily", t("onbSumWhy").fun]);
  if(!out.length) out.push(["daily", t("onbSumWhy").fun]); return out; }
function onbFinish(skipped, noTour){ if(skipped) S.onb={...(S.onb&&S.onb.done?S.onb:{}), done:1, skipped:1, at:Date.now()}; else onbApply(); save(); onbClose();
  const w=(!skipped&&S.onb&&S.onb.why)||[]; TOUR.after = w.includes("songs") ? "free" : null;
  const go=()=>{ if(!noTour && !S.tourDone) tourStart(); else { if(TOUR.after){ openPage(TOUR.after); TOUR.after=null; } onbInput(); } };
  go(); }

