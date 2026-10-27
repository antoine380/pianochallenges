// fragment de l'IIFE principale — ordre 190, voir src/app/README.md
// ---------- Leaving an activity in progress asks first (#leaveModal) ----------
// An exercise or the daily practice (after the first note), a game, a duel, a song or a Play game, a quiz. Asked by the quit buttons
// (Quitter, Salon, Terminer la partie) and by the menu (modes, sections, home, ranking, notifications, profile). Settings and Progress
// open on top without stopping anything: they never ask. The activity holds still while the window is open (HOLD), except online
// (the others keep playing). Esc / a lone C = keep playing, a lone B = leave.
let leaveFn=null, HOLD=false;
const LV={on:false,a:null,at:0,pass:false,buf:[],t:0,mm:false};
const lvBase = () => INFO_PAGES.includes(page) ? returnPage : page;
function actNow(){ const pg=lvBase();
  if(pg==="play"){ try{ const w=$("playFrame").contentWindow; if(w && w.clavioBusy && w.clavioBusy()) return {k:"play", song:!playHash.startsWith("#game")}; }catch(e){} return null; }
  if(pg==="quiz") return QZ.view==="play" ? {k:"quiz", online:QZ.mode==="online"} : null;
  if(pg==="games"){ if(!RN.on) return null;
    if(DU.mode && ["count","play","wait"].includes(DU.view)) return {k:"duel", online:DU.mode!=="bot", rated:!!DU.rated};
    if(DU.view!=="solo") return null;
    const run = GM==="runner" ? RN.state==="run" : GM==="douze" ? DZ.state==="run" : GM==="speed" ? SP.state==="run" : MM.state==="listen"||MM.state==="input";
    return run ? {k:"game"} : null; }
  if((pg==="practice"||pg==="daily") && game && !endOpen && (game.i>0 || game.results.some(Boolean) || played.length>0 || errors>0 || idx>0)) return {k:game.daily?"daily":"learn"};
  return null; }
function guardLeave(fn){ const a=LV.pass||LV.on ? null : actNow(); if(a){ lvOpen(a,fn); return true; } fn(); return false; }
function lvOpen(a, fn, end){ leaveFn=fn; LV.a=a; closeDrawer();
  $("lvTitle").textContent = end ? t("lvEndT") : a.k==="daily" ? t("leaveTitle") : t("lvT");
  $("lvSub").textContent = end ? t("lvEndS") : a.k==="daily" ? t("leaveSub") : a.k==="duel" ? (a.rated ? t("lvDuelR") : t("lvDuelF"))+(a.online ? " "+t("lvDuelOn") : "")
    : a.k==="quiz" && a.online ? t("lvQuizOn") : a.k==="play" && a.song ? t("lvSong") : t("lvLost");
  const go=$("lvGo"), st=$("lvStay"); go.textContent = end ? t("lvEndGo") : t("leaveGo"); st.textContent=t("leaveStay"); duKbd(st,CNAME()); duKbd(go,BNAME());
  lvHold(true); LV.on=true; openMod("leaveModal"); st.focus({preventScroll:true}); }
// called by closeMod("leaveModal"): Keep playing (button, Esc, backdrop, C) or just before Leave runs
function lvAfter(){ if(!LV.on) return; LV.on=false; lvHold(false); LV.a=null; }
function lvHold(on){ const a=LV.a; if(!a) return; const now=performance.now();
  if(on){ if(HOLD || a.online) return; HOLD=true; LV.at=now;
    if(a.k==="play"){ try{ $("playFrame").contentWindow.clavioHold(true); }catch(e){} }
    if(a.k==="game"||a.k==="duel"){ if(MM.state==="listen"){ MM.timers.forEach(clearTimeout); MM.timers=[]; LV.mm=true; } clearTimeout(MM.inT); }
    if(a.k==="quiz") qzHold(true);
    return; }
  if(!HOLD) return; HOLD=false; const d=now-LV.at;
  if(a.k==="play"){ try{ $("playFrame").contentWindow.clavioHold(false); }catch(e){} }
  if(a.k==="game"||a.k==="duel"){ if(SP.state==="run") SP.end+=d; DU.t0+=d;
    if(LV.mm){ LV.mm=false; if(RN.on && GM==="memory" && MM.state==="listen") mmPlay(); } else if(MM.state==="input") mmIdle(); }
  if(a.k==="quiz") qzHold(false,d); }
// MIDI while the window is open: the notes are commands only (a lone C stays, a lone B leaves, a chord does nothing)
function lvNote(m){ if(S.settings.midiC===false) return; LV.buf.push(((m%12)+12)%12); clearTimeout(LV.t);
  LV.t=setTimeout(()=>{ const b=LV.buf; LV.buf=[]; if(b.length!==1 || !LV.on) return; if(b[0]===0) closeMod("leaveModal"); else if(b[0]===11) $("lvGo").click(); },120); }
// the menu and the quit buttons: asked first when they would end the activity; "Leave" replays the click
const LV_NAV="#homeLink,#modeNav [data-mode],#secTabs button,#dailyCard,#rankBtn,#ntfBtn,#mbNtf,#accountBtn,[data-auth]", LV_QUIT="#rnQuit,#duToLobby,#gameEnd,#qzQuit";
function lvLeaves(el){ const base=lvBase();
  if(el.matches(LV_QUIT)) return true;
  if(el.dataset.mode) return ({quiz:"quiz",learn:"learn",play:"free",games:"games"})[el.dataset.mode]!==base;
  if(el.id==="dailyCard") return base!=="daily";
  if(el.closest("#secTabs")) return !(el.dataset.v==="games" && base==="games");
  return true; }
document.addEventListener("click",e=>{ if(LV.pass || LV.on || !e.target.closest) return; const el=e.target.closest(LV_NAV+","+LV_QUIT); if(!el || !lvLeaves(el)) return;
  const a=actNow(); if(!a) return; e.preventDefault(); e.stopImmediatePropagation();
  // Sign up / Log in: the sign-in screen covers the app, so the activity stops first (back home, as with the logo)
  lvOpen(a,()=>{ LV.pass=true; try{ if(el.dataset.auth) $("homeLink").click(); el.click(); }finally{ LV.pass=false; } }, el.id==="gameEnd"); },true);
