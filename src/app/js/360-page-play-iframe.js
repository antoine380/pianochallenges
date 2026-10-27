// fragment de l'IIFE principale — ordre 360, voir src/app/README.md
// Page Play: the Clavio prototype (play/index.html) runs in a frame; notes played here are forwarded to it.
const SAME_ORIGIN = location.origin && location.origin!=="null" ? location.origin : "*"; // file:// has no origin
function playSend(type,m,vel,hw){ const f=$("playFrame"); if(f && f.contentWindow) f.contentWindow.postMessage(hw?{source:"piano-challenges",type,m,vel,hw}:{source:"piano-challenges",type,m,vel},SAME_ORIGIN); }
let playHash="#songs"; // #songs = song library, #games = Play games, #game=<id> = that game
function playOpen(){ const f=$("playFrame"); const src="play/index.html"+playHash+"&lang="+(S.settings.lang==="fr"?"fr":"en")+(staffOn()?"&staff=1&clef="+staffClef():"")+(S.settings.fing===true?"&fing=1":S.settings.fing===false?"&fing=0":""); const old=f.getAttribute("src");
  if(old!==src){ f.onload=()=>{ if(page==="play" && !anyWin()) f.focus(); }; f.src=src; if(old){ try{ f.contentWindow.location.reload(); }catch(e){} } } // a hash-only change would not reload the page: force it
  $("playPanel").hidden=false; }
addEventListener("message",e=>{ if(SAME_ORIGIN!=="*" && e.origin!==SAME_ORIGIN) return; const d=e.data; if(d && d.source==="clavio" && d.type==="free") openPage("free"); if(d && d.source==="clavio" && d.type==="home" && page==="play") openPage(playHash.startsWith("#game")?"games":"free");
  if(d && d.source==="clavio" && d.type==="askLeave" && page==="play" && !LV.on) lvOpen(actNow()||{k:"play",song:!playHash.startsWith("#game")},()=>{ try{ $("playFrame").contentWindow.clavioLeave(); }catch(e){} }); }); // the frame's back button during a song / a game
function openPlayWith(h){ const sg=/^#song=([a-z]+)(?=&|$)/.exec(h); /* #song=imp:<id> = a song imported on this device: never behind the paywall */ if(sg && !isPremium() && !window.PC_SONGS && typeof pcLoad==="function"){ pcLoad().then(()=>openPlayWith(h)).catch(()=>{}); return; } if(sg && premSong(sg[1])){ pwOpen("songs"); return; } playHash=h; if(page==="play"){ playOpen(); setNav(); } else openPage("play"); }
function goMode(m){ closeDrawer(); if(m==="quiz") openPage("quiz"); else if(m==="piano") openPage("piano"); else if(m==="learn") openPage("learn"); else if(m==="play"){ PC.view="cat"; openPage("free"); } else openPage("games"); }
document.querySelectorAll("[data-mode]").forEach(b=>b.addEventListener("click",()=>{ const m=b.dataset.mode; if(page==="daily" && game && game.daily){ guardLeave(()=>{ game=null; goMode(m); }); return; } goMode(m); }));
function playClose(){ const f=$("playFrame"); if(f.getAttribute("src")) f.removeAttribute("src"); $("playPanel").hidden=true; }
function openPage(pg){
  if(needLogin(pg)){ lockFor=pg; pg="locked"; }
  if(pg===page && pg!=="practice" && pg!=="locked") return;
  const info=INFO_PAGES.includes(pg);
  if(pg!=="games" && !info) runnerClose();
  if(pg!=="quiz" && !info && typeof QZ!=="undefined"){ qzClearTimers(); if(QZ.view==="play"){ QZ.view="setup"; QZ.done=true; } if(NET.ch||NET.lobby) netLeave(); }
  if(pg==="play") playOpen(); else if(!info) playClose();
  const toInfo = INFO_PAGES.includes(pg) && !INFO_PAGES.includes(page);
  const backFromInfo = INFO_PAGES.includes(page) && returnPage && pg===returnPage;
  if(toInfo){ returnPage=page; pauseRound(); }
  else if(!INFO_PAGES.includes(pg) && !backFromInfo){ returnPage=null; if(INFO_PAGES.includes(page)){ paused=false; pendingAdv=false; } } // leaving an info page elsewhere: drop the stale pause
  const keepDaily = (pg==="daily" && game && game.daily) || toInfo || backFromInfo || (INFO_PAGES.includes(pg) && INFO_PAGES.includes(page));
  if(!keepDaily){
    clearTimeout(advanceTimer); cancelAnimationFrame(raf); clearPlayTimers(); closeEnd();
    phase="idle"; cur=null; seq=[]; found=[]; played=[]; idx=0; errors=0; game=null;
    clearKeys(); $("stage").classList.remove("res-good","res-warn","res-bad");
  }
  page=pg; if(backFromInfo){ returnPage=null; setTimeout(resumeRound,0); } if(pg==="locked") renderLock(); if(pg==="settings") renderSettings(); if(pg==="progress") renderMap(); if(pg==="games") renderGames(); if(pg==="notif") renderNotifs(); if(pg==="learn") renderLearn(); if(pg==="quiz"){ if(QZ.view!=="play") QZ.view="setup"; renderQuiz(); if(qzCfg().where==="online") netLobbyPeek(); } if(pg==="free") renderPlaySongs(); if(pg==="rank") renderRank(); if(pg==="account") renderAccount(); if(pg==="daily") dailyPlan();
  if(kbNarrow()) buildKeyboard();
  renderSettings(); render(); renderDaily(); $("main").scrollTo({top:0});
  if(["games","daily"].includes(pg)) autoIntro(pg);
}
const SEC_ICON = sec => { const b=$("secTabs").querySelector('[data-v="'+sec+'"] svg'); return b?b.outerHTML:""; };
function renderDailyPanel(){
  const plan=dailyPlan(), run=game&&game.daily, done=S.daily&&S.daily.date===dayStr();
  const shown = !run && done && S.daily.items ? {items:S.daily.items} : plan;
  const pend = !run && !done ? pendingDailyRun() : null;
  const levels = run ? plan.items.map((_,i)=>game.results[i]?game.results[i].level:null) : (done&&S.daily.levels ? S.daily.levels : pend ? plan.items.map((_,i)=>pend.results[i]?pend.results[i].level:null) : []);
  const curI = run ? game.i : -1;
  const dateTxt = new Date().toLocaleDateString(S.settings.lang==="fr"?"fr-FR":"en-GB",{weekday:"long",day:"numeric",month:"long"});
  $("dpSub").textContent = run ? t("dpRun")(Math.min(game.i,game.total-1)+1,game.total) : done ? t("dpDone")(S.daily.score) : t("dpSubTxt")(dateTxt.charAt(0).toUpperCase()+dateTxt.slice(1), plan.items.length, dueItems().length);
  $("dpStart").hidden = !!run; $("dpCfg").hidden = !!run; $("dpStart").textContent = done ? t("dailyAgain") : pend ? t("dailyResume") : t("dailyStart");
  const ol=$("dTimeline"); ol.innerHTML="";
  const check='<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>', cross='<svg viewBox="0 0 24 24"><path d="M12 7v6M12 17v.5"/></svg>';
  shown.items.forEach((it,i)=>{ const li=document.createElement("li"), lv=levels[i];
    li.className = lv ? lv : i===curI ? "cur" : "todo";
    li.innerHTML='<span class="st-n mono">'+(i+1)+'</span><span class="dot">'+(lv==="good"?check:SEC_ICON(it.sec))+'</span><span class="st-l"></span>';
    li.querySelector(".st-l").textContent=t({scales:"secScales",chords:"secChords",harmony:"secHarmony",prog:"secProg",ear:"secEar"}[it.sec])||"";
    const show = lv || i===curI || (done && !run);
    li.dataset.tip = (i+1)+" · "+(t({scales:"secScales",chords:"secChords",harmony:"secHarmony",prog:"secProg",ear:"secEar"}[it.sec])||"") + (show && !(it.sec==="ear" && !lv) ? " — "+itemName(it) : "");
    li.tabIndex=0;
    ol.appendChild(li); });
  const fin=document.createElement("li"); fin.className="finish "+(done&&!run?"good":"todo");
  fin.innerHTML='<span class="st-n mono">&nbsp;</span><span class="dot">'+(done&&!run?check:'<svg viewBox="0 0 24 24"><path d="M6 20V4M6 4h11l-2.5 4L17 12H6"/></svg>')+'</span><span class="st-l"></span>';
  fin.querySelector(".st-l").textContent=t("dpFinish"); fin.dataset.tip=t("dpFinish"); ol.appendChild(fin);
  const c=ol.querySelector(".cur"); if(c) c.scrollIntoView({block:"nearest",inline:"center"});
}
