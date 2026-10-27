// fragment de l'IIFE principale — ordre 380, voir src/app/README.md
// ---- simple windows: characters + intros
const openMods=[];
function openMod(id){ if(!openMods.includes(id)){ modalOpened(); openMods.push(id); } $(id).hidden=false; const f=$(id).querySelector(".modal-close"); if(f) f.focus({preventScroll:true}); }
function closeMod(id){ $(id).hidden=true; const i=openMods.indexOf(id); if(i>=0){ openMods.splice(i,1); if(id==="leaveModal") lvAfter(); modalClosed(); } }
document.addEventListener("click",e=>{ const c=e.target.closest("[data-close]"); if(c) closeMod(c.dataset.close); });
$("lvGo").addEventListener("click",()=>{ const k=LV.a&&LV.a.k; closeMod("leaveModal"); const f=leaveFn; leaveFn=null; if(f){ if(k==="learn"||k==="daily"){ clearTimeout(advanceTimer); cancelAnimationFrame(raf); clearPlayTimers(); } f(); } });
function openChars(){
  closeDrawer(); const L=levelInfo(S.xp).L, ci=charIndex(L), g=$("charGrid"); g.innerHTML="";
  t("chars").forEach((c,i)=>{ const got=L>=CHAR_LVL[i], d=document.createElement("div");
    d.className="char"+(got?" got":" locked")+(i===ci?" me":"");
    d.innerHTML='<span class="lv-n"></span><span class="av">'+avatarSVG(i)+'</span><b></b><span class="ct"></span><span class="cx"></span>';
    d.querySelector(".lv-n").textContent=t("acctLevel")+" "+CHAR_LVL[i]; d.querySelector("b").textContent=c[2]; d.querySelector(".ct").textContent=c[0]+" "+c[1];
    d.querySelector(".cx").textContent= got ? t("charGot") : fmtN(xpForLevel(CHAR_LVL[i]))+" XP"; g.appendChild(d); });
  const nx=ci+1<CHAR_LVL.length ? ci+1 : -1;
  $("charSub").textContent = nx<0 ? t("charSub")(null) : t("charSub")(t("acctLevel").toLowerCase()+" "+CHAR_LVL[nx], xpForLevel(CHAR_LVL[nx])-S.xp);
  openMod("charModal");
}
$("charMore").addEventListener("click",e=>{ e.stopPropagation(); openChars(); });
["lvlAv","mbLvlBtn"].forEach(id=>$(id).addEventListener("click",()=>openSet("progress")));
$("lvlCard").addEventListener("click",e=>{ if(!e.target.closest("button")) openSet("progress"); });
let dcSel=null, dcLenV=10, dcRev=true;
function renderDailyCfg(){
  const ok=SECS.filter(sectionUsable), box=$("dcSecs"); box.innerHTML="";
  SECS.forEach(sec=>{ const b=document.createElement("button"); b.type="button"; b.disabled=!ok.includes(sec);
    b.setAttribute("aria-pressed", dcSel.includes(sec)&&ok.includes(sec)); b.innerHTML=SEC_ICON(sec)+"<span></span>";
    b.querySelector("span").textContent=t({scales:"secScales",chords:"secChords",harmony:"secHarmony",prog:"secProg",ear:"secEar"}[sec]);
    b.onclick=()=>{ const i=dcSel.indexOf(sec); if(i>=0){ if(dcSel.filter(x=>ok.includes(x)).length>1) dcSel.splice(i,1); } else dcSel.push(sec); renderDailyCfg(); };
    box.appendChild(b); });
  $("dcLen").querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed", +b.dataset.v===dcLenV));
  $("dcReview").checked=dcRev;
}
let dcStartAfter=false;
let dcPrev=null;
function openDailyCfg(start){ dcStartAfter=!!start; dcPrev=[S.settings.dailySecs, S.settings.dailyLen, S.settings.dailyReview]; dcSel=[...dailySecs()]; dcLenV=S.settings.dailyLen||10; dcRev=S.settings.dailyReview!==false; renderDailyCfg(); $("dcOk").textContent = start ? t("dcStart") : t("dcApply"); openMod("dailyCfgModal"); }
$("dpCfg").addEventListener("click",()=>openDailyCfg(false));
$("dcLen").addEventListener("click",e=>{ const b=e.target.closest("button"); if(!b) return; dcLenV=+b.dataset.v; renderDailyCfg(); });
$("dcReview").addEventListener("change",e=>{ dcRev=e.target.checked; });
$("dcOk").addEventListener("click",()=>{ S.settings.dailySecs=SECS.filter(x=>dcSel.includes(x)); S.settings.dailyLen=dcLenV; S.settings.dailyReview=dcRev; const changed=JSON.stringify([S.settings.dailySecs,S.settings.dailyLen,S.settings.dailyReview])!==JSON.stringify([dcPrev&&dcPrev[0],dcPrev&&dcPrev[1],dcPrev&&dcPrev[2]]); save(); closeMod("dailyCfgModal");
  if(dcStartAfter){ dcStartAfter=false; if(changed) dailyPlan(true); startDaily(); return; } if(!(game&&game.daily)){ dailyPlan(true); renderDaily(); } });
const userPhoto = () => user && user.user_metadata && (user.user_metadata.avatar_url || user.user_metadata.picture) || "";
function showIntro(key){
  const k = key==="section" ? (page==="practice"?S.section:page) : key, d=t("intro")[k]; if(!d) return;
  S.introSeen=S.introSeen||{}; S.introSeen[k]=true; save();
  $("introTitle").textContent=d[0];
  $("introIc").innerHTML = k==="daily" ? $("dailyCard").querySelector("svg").outerHTML : SEC_ICON(k);
  $("introSteps").innerHTML=d[1].map(x=>"<li><span>"+x.replace(/\{C\}/g,CNAME())+"</span></li>").join("");
  openMod("introModal");
}
function autoIntro(k){ if(!(S.introSeen||{})[k]) setTimeout(()=>showIntro(k),250); }
document.querySelectorAll("[data-intro]").forEach(b=>b.addEventListener("click",()=>showIntro(b.dataset.intro)));
$("rankBtn").addEventListener("click",()=>{ closeDrawer(); guardLeave(()=>openPage("rank")); });
$("accountBtn").addEventListener("click",()=>{ closeDrawer(); guardLeave(()=>openPage("account")); });
$("rankLogin").addEventListener("click",()=>authOpen("signup")); // guests: the sign-in screen (the Profile page is hidden for them)
function goHome(){
  page="practice"; closeDrawer();
  // back to the start screen: no game running, first tab, top of the page
  clearTimeout(advanceTimer); cancelAnimationFrame(raf); clearPlayTimers(); closeEnd(); closeHelp();
  game=null; phase="idle"; cur=null; seq=[]; found=[]; played=[]; idx=0; errors=0;
  clearKeys(); $("stage").classList.remove("res-good","res-warn","res-bad");
  if(S.section!=="chords"){ S.section="chords"; save(); if(kbNarrow()) buildKeyboard(); }
  renderSettings(); render(); renderDaily(); $("main").scrollTo({top:0,behavior:"smooth"});
}
$("endX").addEventListener("click",closeEnd); $("endBg").addEventListener("click",closeEnd); bindSeg("segNot","notation",false); bindSeg("segDir","dir",true);

$("optVL").addEventListener("change",e=>{ S.settings.vl=e.target.checked; save(); if(cur&&cur.sec==="prog"&&phase!=="idle") startRound({sec:cur.sec,tid:cur.tid,k:cur.k},true); else render(); });
$("secTabs").addEventListener("click",e=>{ const b=e.target.closest("button"); if(!b) return; closeDrawer();
  if(page==="daily" && game && game.daily){ guardLeave(()=>{ game=null; $("secTabs").querySelector('[data-v="'+b.dataset.v+'"]').click(); }); return; }
  const v=b.dataset.v;
  if(v==="games"){ openPage("games"); return; }
  if(page!=="practice"){ if(S.section!==v){ S.section=v; save(); returnPage=null; } openPage(INFO_PAGES.includes(page)&&returnPage==="practice"?"practice":"practice"); }
  else switchSection(v);
  autoIntro(v); });
function retime(prev){
  // the timer setting changed during an exercise: rescale the time left, never restart the round
  if(phase!=="listening" || !cur || cur.sec==="ear"){ renderTimeline(); return; }
  const per=chSeq()?seq.length:1, d=S.settings.delay, now=performance.now();
  const left = paused ? pausedLeft : (deadline ? Math.max(0,deadline-now) : 0);
  let nl=0;
  if(d>0) nl = (prev>0 && (deadline||paused)) ? left/(prev*1000*per)*d*1000*per : Math.max(1000, startT+d*1000*per-now);
  if(paused) pausedLeft=nl;
  deadline = d>0 ? now+nl : 0;
  renderTimeline();
}
function setDelay(v){ const prev=S.settings.delay; S.settings.delay=v; save(); renderSettings(); renderGameBar(); retime(prev); }
$("timerSel").addEventListener("change",e=>setDelay(+e.target.value));
$("optGuideN").addEventListener("change",e=>{ S.settings.guideN=e.target.checked; if(e.target.checked) S.settings.guideP=false; save(); render(); });
$("optGuideK").addEventListener("change",e=>{ S.settings.guideK=e.target.checked; if(e.target.checked) S.settings.guideP=false; save(); render(); });
$("optGuideP").addEventListener("change",e=>{ S.settings.guideP=e.target.checked; if(e.target.checked){ S.settings.guideN=false; S.settings.guideK=false; } save(); render(); });
$("segDiff").addEventListener("click",e=>{ const b=e.target.closest("button"); if(!b) return; setDelay(+b.dataset.v); });
$("delay").addEventListener("input",e=>{ const prev=S.settings.delay; S.settings.delay=+e.target.value; save(); renderSettings(); retime(prev); });
$("optOct").addEventListener("change",e=>{ S.settings.octave=e.target.checked; save(); if(cur&&phase!=="idle") startRound(cur,true); else render(); });
$("optLabels").addEventListener("change",e=>{ S.settings.labels=e.target.checked; save(); labelKeys(); });
$("optFing").addEventListener("change",e=>{ S.settings.fing=e.target.checked; save(); fgRender(); });
$("segStaff").addEventListener("click",e=>{ const b=e.target.closest("[data-v]"); if(!b) return; S.settings.staff=b.dataset.v!=="off"; S.settings.staffRead=b.dataset.v==="read"; save(); bravura(); renderSettings(); staffSoon(); });
$("segClef").addEventListener("click",e=>{ const b=e.target.closest("[data-v]"); if(!b) return; S.settings.clef=b.dataset.v; save(); renderSettings(); staffSoon(); });
$("optUiSound").addEventListener("change",e=>{ S.settings.uiSound=e.target.checked; save(); });
$("optMidiSound").addEventListener("change",e=>{ S.settings.midiSound=e.target.checked; save(); });
$("optAuto").addEventListener("change",e=>{ S.settings.autoNext=e.target.checked; save(); if(!e.target.checked) clearTimeout(advanceTimer); });
$("optAll").addEventListener("change",e=>{ S.settings.unlockAll=e.target.checked; save(); renderSettings(); render(); });
let resetArmed=false;
$("resetBtn").addEventListener("click",e=>{
  if(!resetArmed){ resetArmed=true; e.target.textContent=t("confirmReset"); setTimeout(()=>{ resetArmed=false; e.target.textContent=t("reset"); },4000); return; }
  const keep=S.settings, sec=S.section; S=clone(DEFAULTS); S.settings=keep; S.section=sec;
  Object.assign(S.settings,{types:["major"],view:"major",ctypes:["maj"],cview:"maj",invs:[0],htypes:["maj"],hview:"maj",ptypes:["p145","pop"],pview:"pop",etypes:["chord","int"],eview:"chord",unlockAll:false});
  save(); resetArmed=false; e.target.textContent=t("reset"); phase="idle"; cur=null; seq=[]; found=[]; played=[]; combo=0; game=null; renderDaily(); clearKeys(); renderSettings(); render(); toast(t("resetDone"));
});
narrowMQ.addEventListener?.("change",()=>buildKeyboard()); tabMQ.addEventListener?.("change",()=>buildKeyboard());
// a keyboard wider than its frame (Settings › keyboard size) can be dragged sideways with a finger (touch-action pan-x);
// one that fits keeps touch-action none, so fast taps, chords and slides between keys all go to the notes
{ const kw=$("kbdWrap"), kbdFit=()=>kw.classList.toggle("kbd-scroll", kw.scrollWidth>kw.clientWidth+2);
  if(window.ResizeObserver){ const ro=new ResizeObserver(kbdFit); ro.observe(kw); ro.observe(kbd); } else addEventListener("resize",kbdFit); kbdFit(); }
// iOS Safari only applies :active (the press feedback of buttons and tiles) when the page listens to touchstart
document.addEventListener("touchstart",()=>{},{passive:true});

document.addEventListener("change",e=>{ if(e.target.matches("select, input[type=checkbox], input[type=range]") && !e.target.closest(".acct-login")) setTimeout(()=>e.target.blur(),0); });
