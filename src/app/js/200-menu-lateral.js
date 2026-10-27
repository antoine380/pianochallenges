// fragment de l'IIFE principale — ordre 200, voir src/app/README.md
// ---------- Sidebar, drawer, games page ----------
const phoneMQ=window.matchMedia("(max-width:640px)"), railMQ=window.matchMedia("(max-height:520px) and (orientation:landscape)");
function setNav(){
  const mark=(el,on)=>{ if(on) el.setAttribute("aria-current","page"); else el.removeAttribute("aria-current"); };
  $("secTabs").querySelectorAll("button").forEach(b=>mark(b, page==="practice" ? b.dataset.v===S.section : b.dataset.v===page));
  const mode = page==="quiz" ? "quiz" : page==="play"||page==="free" ? (page==="play"&&playHash.startsWith("#game")?"games":"play") : page==="games" ? "games" : ["hub","settings","rank","account","progress","notif"].includes(page) ? "" : page==="locked" ? (lockFor==="games"?"games":"learn") : "learn";
  $("side").dataset.mode=mode; $("modeNav").querySelectorAll("button").forEach(b=>mark(b,b.dataset.mode===mode));
  mark($("dailyCard"),page==="daily"); mark($("rankBtn"),page==="rank"); mark($("ntfBtn"),page==="notif"); mark($("accountBtn"),page==="account"); mark($("setBtn"),page==="settings"); mark($("progBtn"),page==="progress");
  const pv = page==="practice"?S.section : page==="locked"?lockFor : page;
  $("mbTitle").textContent = t({chords:"secChords",scales:"secScales",harmony:"secHarmony",prog:"secProg",ear:"secEar",games:"secGames",play:"secPlay",free:"secPlay",quiz:"quizT",hub:"hub",learn:"learn",daily:narrowMQ.matches?"dailyShort":"dailyTitle",rank:"secRank",account:"secAccount",settings:"settings",progress:"progress",notif:"ntfTitle"}[pv]);
  if(page==="locked"){ $("secTabs").querySelectorAll("button").forEach(b=>mark(b,b.dataset.v===lockFor)); mark($("dailyCard"),lockFor==="daily"); }
}
function applySide(){
  if(S.settings.sideCollapsed==null) S.settings.sideCollapsed = window.innerWidth<1100;
  const col = !phoneMQ.matches && !railMQ.matches && S.settings.sideCollapsed;
  $("side").classList.toggle("collapsed", col);
  const lbl=t(col?"expand":"collapse"); $("sideToggle").querySelector(".lbl").textContent=lbl; $("sideToggle").setAttribute("aria-label",lbl);
  $("side").querySelectorAll(".nav-item").forEach(b=>{ const l=b.querySelector(".lbl"); if(col && l) b.title=l.textContent.trim(); else b.removeAttribute("title"); });
  if(cur && seq.length) requestAnimationFrame(()=>scrollKbdTo(revealMidis()[0]));
}
$("sideToggle").addEventListener("click",()=>{ S.settings.sideCollapsed=!$("side").classList.contains("collapsed"); save(); applySide(); });
phoneMQ.addEventListener?.("change",()=>{ closeDrawer(); applySide(); }); railMQ.addEventListener?.("change",()=>{ closeDrawer(); applySide(); });
function openDrawer(){ document.body.classList.add("drawer"); $("menuBtn").setAttribute("aria-expanded","true"); }
function closeDrawer(){ document.body.classList.remove("drawer"); $("menuBtn").setAttribute("aria-expanded","false"); }
$("menuBtn").addEventListener("click",openDrawer); $("sideScrim").addEventListener("click",closeDrawer);
[$("progBtn"),$("setBtn"),$("helpBtn")].forEach(b=>b.addEventListener("click",closeDrawer));
function closeTypes(){ document.querySelectorAll(".dd-pop").forEach(p=>p.hidden=true); document.querySelectorAll(".dd-btn").forEach(b=>b.setAttribute("aria-expanded","false")); typesOpen=false; }
document.querySelectorAll(".dd-btn[data-pop]").forEach(b=>b.addEventListener("click",()=>{
  if(b.id==="langBtn" && document.getElementById("side").classList.contains("collapsed")){ closeTypes(); document.querySelector('#langSeg [data-v="'+(S.settings.lang==="fr"?"en":"fr")+'"]').click(); return; } const p=$(b.dataset.pop), open=p.hidden; closeTypes(); if(open){ p.hidden=false; b.setAttribute("aria-expanded","true"); typesOpen=true; } }));
document.addEventListener("pointerdown",e=>{ if(typesOpen && !e.target.closest(".dd")) closeTypes(); });
