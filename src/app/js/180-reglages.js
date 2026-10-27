// fragment de l'IIFE principale — ordre 180, voir src/app/README.md
// ---------- Settings wiring ----------
$("langSeg").addEventListener("click",e=>{ const b=e.target.closest("button"); if(!b) return;
  S.settings.lang=b.dataset.v; S.settings.notation=b.dataset.v; save(); closeTypes(); applyStatic(); applySide(); renderGames(); renderInputUI(); if(page==="rank") renderRank(); if(page==="account") renderAccount(); if(helpOpen) renderTut(); renderSettings(); labelKeys(); render(); renderDaily(); if(endOpen&&lastGame) openEnd(lastGame); if(page==="play") playOpen(); Object.entries(keyEls).forEach(([m,el])=>keyA11y(el,+m)); });
function bindSeg(id,key,restart){ $(id).addEventListener("click",e=>{ const b=e.target.closest("button"); if(!b) return;
  S.settings[key]=b.dataset.v; save(); renderSettings(); labelKeys();
  if(restart && cur && (phase==="listening"||phase==="revealed")) startRound(key==="dir"?{...cur,dir:null}:cur,true); else render(); }); }
bindSeg("segMode","mode",false);
$("segScMode").addEventListener("click",e=>{ const b=e.target.closest("button"); if(!b || b.dataset.v===S.settings.scMode) return;
  S.settings.scMode=b.dataset.v; S[sufKey()]=0; save(); renderSettings();
  if(cur && cur.sec==="scales" && phase!=="idle" && game && !game.queue) startRound(undefined,true); else render(); });
$("optSc7").addEventListener("change",e=>{ S.settings.sc7=e.target.checked; save(); if(cur&&cur.sec==="scales"&&cur.ch&&phase!=="idle") startRound(cur,true); else render(); });
$("segLen").addEventListener("click",e=>{ const b=e.target.closest("button"); if(!b) return; S.settings.gameLen=+b.dataset.v; save();
  if(game && !game.queue){ game.total=S.settings.gameLen||Infinity; if(game.i>=game.total) game.total=game.i+1; } renderSettings(); renderGameBar(); });
$("gameEnd").addEventListener("click",()=>{ if(game){ clearTimeout(advanceTimer); cancelAnimationFrame(raf); clearPlayTimers(); if(game.results[game.i]==null) game.results.length=game.i; finishGame(); } });
$("dailyCard").addEventListener("click",()=>{ closeDrawer(); openPage("daily"); });
$("dpStart").addEventListener("click",()=>{ if(!(game&&game.daily)) openDailyCfg(true); });
// timeline bubbles: hover on computers, tap on tablets and phones
(()=>{ let tt=0; const show=li=>{ const tip=$("dtTip"); if(!li||!li.dataset.tip){ tip.hidden=true; return; } tip.textContent=li.dataset.tip; tip.hidden=false;
    const r=li.getBoundingClientRect(), w=$("dTimeline").parentElement.getBoundingClientRect(); const x=Math.min(Math.max(r.left+r.width/2-w.left, 70), w.width-70); tip.style.left=x+"px";
    clearTimeout(tt); tt=setTimeout(()=>tip.hidden=true, 2600); };
  $("dTimeline").addEventListener("pointerover",e=>{ if(e.pointerType==="mouse") show(e.target.closest("li")); });
  $("dTimeline").addEventListener("pointerleave",e=>{ if(e.pointerType==="mouse") $("dtTip").hidden=true; });
  $("dTimeline").addEventListener("click",e=>show(e.target.closest("li")));
  $("dTimeline").addEventListener("focusin",e=>show(e.target.closest("li"))); })();

// settings / progress window
let setOpen=false; // always false since Settings became a page; still read by keydown/midiStart/noteIn
// Settings and Progress are pages of their own (the old window's content is moved into them)
$("setHost").appendChild($("setPane")); $("progHost").appendChild($("progPane"));
$("setPane").classList.remove("modal-body"); $("progPane").classList.remove("modal-body"); $("progPane").hidden=false; $("setModal").remove();
// Settings on tablets and computers: one section at a time behind tabs (no page scroll); phones keep the whole list
const setTabsMQ=window.matchMedia("(min-width:641px) and (min-height:521px)");
let setTabV="inter";
function setTab(v){ setTabV=v||setTabV; $("setNav").querySelectorAll("button").forEach(b=>{ const on=b.dataset.v===setTabV; b.setAttribute("aria-pressed",on); b.setAttribute("aria-selected",on); });
  $("setPane").querySelectorAll(".set-sec[data-tab]").forEach(x=>x.classList.toggle("on",x.dataset.tab===setTabV)); }
$("setNav").addEventListener("click",e=>{ const b=e.target.closest("button[data-v]"); if(b) setTab(b.dataset.v); });
setTab();
// Progress on tablets and computers: the overview (fiche) and the detail per topic are two tabs
function pfTab(v){ $("progPane").dataset.tab=v; $("pfNav").querySelectorAll("button").forEach(b=>{ const on=b.dataset.v===v; b.setAttribute("aria-pressed",on); b.setAttribute("aria-selected",on); }); }
$("pfNav").addEventListener("click",e=>{ const b=e.target.closest("button[data-v]"); if(b) pfTab(b.dataset.v); });
pfTab("ov");
function openSet(tab){ closeDrawer(); if(tab==="progress") progSec=S.section; openPage(tab==="progress"?"progress":"settings"); }
function closeSet(){ if(INFO_PAGES.includes(page)){ page="practice"; returnPage=null; paused=false; render(); renderDaily(); } } // e.g. a tile picked on the Progress page starts that exercise
$("setBtn").addEventListener("click",()=>openSet("settings")); $("mbSet").addEventListener("click",()=>openSet("settings")); $("progBtn").addEventListener("click",()=>openSet("progress"));
document.querySelectorAll("[data-back]").forEach(b=>b.addEventListener("click",()=>openPage(returnPage||"practice")));
$("kbSize").addEventListener("change",e=>{ S.settings.kbdSize=e.target.value; save(); buildKeyboard(); renderSettings(); if(cur&&seq.length) scrollKbdTo(revealMidis()[0]); });
$("kbDetect").addEventListener("click",()=>{ if(calib){ calibApply(); return; } if(!midiReady){ calibMsg(t("calibNeedMidi")); return; } calib={lo:null,hi:null}; $("kbDetect").textContent=t("kbValidate"); calibMsg(t("calibListen")); });
$("homeLink").addEventListener("click",e=>{ e.preventDefault(); guardLeave(()=>{ goHome(); openPage("hub"); }); });
$("homeLink2").addEventListener("click",e=>{ e.preventDefault(); goHome(); openPage("hub"); });

