// fragment de l'IIFE principale — ordre 510, voir src/app/README.md
/* ==== Objectif (C9 / D21 / D22) : objectif du jour, anneau autour de l'avatar, série hebdomadaire, gels de série ==== */
// S.goal={kind:"min"|"xp", v, at, asked, done:"YYYY-MM-DD"} (absent = 10 min) · S.freeze={n:0..2, used:[jours couverts], at}
const GL={offer:false};
const GOALS=[["min",5],["min",10],["min",20],["xp",50],["xp",100]];
function goalCfg(){ const g=S.goal; return g && (g.kind==="min"||g.kind==="xp") && +g.v>0 ? g : {kind:"min", v:10}; }
const goalUnit = g => g.kind==="xp" ? "XP" : "min";
function goalNow(g=goalCfg(), day=dayStr()){ return g.kind==="xp" ? ((S.xpDays||{})[day]|0) : Math.floor((((S.playSec||{})[day])|0)/60); }
function goalPct(g=goalCfg()){ const v = g.kind==="xp" ? ((S.xpDays||{})[dayStr()]|0) : (((S.playSec||{})[dayStr()])|0)/60; return Math.max(0, Math.min(1, v/g.v)); }
const goalDone = () => !!(S.goal && S.goal.done===dayStr()) || goalPct()>=1;
function goalSet(kind, v){ const o=S.goal&&typeof S.goal==="object"?S.goal:{}; S.goal={...o, kind, v:+v, at:Date.now(), asked:1}; save(); goalRing(); }
// the ring around #lvlAv (menu) and #mbAv (mobile bar); gold once the goal is reached
function goalRing(){ const g=goalCfg(), p=goalPct(g), done=goalDone(), lbl=t("goalDay")+" : "+t("goalOf")(fmtN(Math.min(goalNow(g),g.v)),fmtN(g.v),goalUnit(g));
  [$("lvlAv"), $("mbAv")].forEach(el=>{ if(!el) return; el.classList.add("goal-ring"); el.classList.toggle("done",done); el.style.setProperty("--gp", done?1:p.toFixed(3)); });
  const a=$("lvlAv"); if(a){ const base=(a.getAttribute("aria-label")||"").split(" · "+t("goalDay"))[0]; a.setAttribute("aria-label", base+" · "+lbl); a.title=lbl; }
  const sg=$("segGoal"); if(sg) sg.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed", b.dataset.v===g.kind+":"+g.v)); }
function goalFanfare(){ if(S.settings.uiSound===false || !ctx || ctx.state!=="running") return; [72,76,79,84].forEach((m,i)=>tone(m,i*.11,.32,.12)); [72,76,79,84].forEach(m=>tone(m,.5,1.1,.08)); }
// called on each tick of time played and on each XP: once a day, the ring turns gold, a short fanfare, a notification
function goalTick(){ const today=dayStr(); if(goalPct()>=1 && !(S.goal&&S.goal.done===today)){ const g=goalCfg();
    S.goal={...(S.goal&&typeof S.goal==="object"?S.goal:{kind:g.kind, v:g.v, at:0}), done:today}; save();
    try{ goalFanfare(); }catch(e){}
    try{ ntfAdd({key:"goal-"+today, cat:"progress", type:"goal", ti:t("goalOk"), tx:t("goalNtfX")(fmtN(g.v)+" "+goalUnit(g)), act:{k:"progress",l:"ntfSee"}}); }catch(e){}
    goalRing(); [$("lvlAv"),$("mbAv")].forEach(el=>{ if(!el) return; el.classList.remove("gl-win"); void el.offsetWidth; el.classList.add("gl-win"); setTimeout(()=>el.classList.remove("gl-win"),1000); }); }
  else goalRing(); }
// ---- streak freezes: one earned every 7 days of streak (2 at most), used on their own the day after a missed day ----
function frzStore(){ if(!S.freeze||typeof S.freeze!=="object") S.freeze={n:0, used:[], at:0}; if(!Array.isArray(S.freeze.used)) S.freeze.used=[]; S.freeze.n=Math.max(0,Math.min(2,S.freeze.n|0)); return S.freeze; }
const frzDays = () => new Set((S.freeze&&Array.isArray(S.freeze.used))?S.freeze.used:[]);
function freezeCheck(){ const st=S.streak; if(!st || !st.last || !(st.days>0)) return false; const y=addDays(-1); if(st.last>=y) return false;
  const f=frzStore(); if(!f.n) return false; const miss=[]; const d=pDate(st.last); for(let i=0;i<40;i++){ d.setDate(d.getDate()+1); const k=dayStr(d); if(k>y) break; miss.push(k); }
  if(!miss.length || miss.length>f.n) return false; // more days missed than freezes: a new streak starts (never counted as a loss)
  f.n-=miss.length; f.used=[...new Set([...f.used, ...miss])].sort().slice(-40); f.at=Date.now(); st.last=y; save();
  try{ ntfAdd({key:"frz-"+dayStr(), cat:"progress", type:"freeze", ti:t("streakFrozen"), tx:t("frzNtfX")(f.n), act:{k:"progress",l:"ntfSee"}}); }catch(e){}
  return true; }
function freezeEarn(){ const d=S.streak&&S.streak.days|0; if(!d || d%7) return; const f=frzStore(); if(f.n>=2 || f.won===d+":"+S.streak.last) return;
  f.n++; f.won=d+":"+S.streak.last; f.at=Date.now();
  try{ ntfAdd({key:"frzw-"+S.streak.last, cat:"progress", type:"freezeWon", ti:t("frzWonT"), tx:t("frzWonX"), act:{k:"progress",l:"ntfSee"}}); }catch(e){} }
// ---- the goal row of the progress sheet (streak card): ring, today, this week, freezes ----
function goalFiche(st){ const box=$("pfGoal"); if(!box) return; const g=goalCfg(), done=goalDone(), p=done?1:goalPct(g), r=12, C=2*Math.PI*r;
  const left=Math.max(0, g.v-goalNow(g)), f=frzStore(), y=addDays(-1);
  box.className="pf-goal"+(done?" done":"");
  box.innerHTML='<svg class="gl-r" viewBox="0 0 30 30" aria-hidden="true"><circle class="tr" cx="15" cy="15" r="'+r+'"/><circle class="fg" cx="15" cy="15" r="'+r+'" stroke-dasharray="'+(C*p).toFixed(2)+' '+C.toFixed(2)+'"/></svg>'
    +'<span class="gl-t"><b></b><small></small></span><span class="gl-chips"><span class="gl-chip wk"></span>'+(f.n||f.used.includes(y)?'<span class="gl-chip fz"></span>':'')+'</span>';
  box.querySelector("b").textContent = done ? t("goalOk") : t("goalOf")(fmtN(goalNow(g)),fmtN(g.v),goalUnit(g));
  box.querySelector("small").textContent = done ? t("goalOf")(fmtN(g.v),fmtN(g.v),goalUnit(g)) : t("goalDay");
  const wk=box.querySelector(".wk"); wk.textContent=t("wkNow")(st.wkNow)+(st.wkNow>=3?" ✓":""); wk.classList.toggle("ok",st.wkNow>=3); wk.title=t("wkTip");
  const fz=box.querySelector(".fz"); if(fz){ fz.textContent="❄ "+(f.used.includes(y)&&!(S.xpDays||{})[y]?t("frzUsed"):t("frzN")(f.n)); }
  box.title = done ? "" : t("goalLeft")(fmtN(left), goalUnit(g)); }
// ---- choosing the goal: Settings (tab Partie) and, once, after a game played well ----
$("segGoal").addEventListener("click",e=>{ const b=e.target.closest("button[data-v]"); if(!b) return; const [k,v]=b.dataset.v.split(":"); goalSet(k,+v); });
let glPick="min:10";
function goalOpen(){ const g=goalCfg(); glPick=g.kind+":"+g.v; const gk=$("goalModal").querySelector(".gl-k"); if(gk) gk.textContent=t(page==="pp"?"goalKickL":"goalKick"); /* after a lesson of the first steps: « Bravo pour cette leçon » */ S.goal={...(S.goal&&typeof S.goal==="object"?S.goal:{kind:g.kind, v:g.v, at:0}), asked:1}; save();
  const box=$("glOpts"); box.innerHTML=""; const tags=t("goalTags");
  GOALS.forEach(([k,v],i)=>{ const b=document.createElement("button"); b.type="button"; b.className="gl-opt"; b.dataset.v=k+":"+v; b.innerHTML="<b></b><small></small>"; b.firstChild.textContent=v+" "+(k==="xp"?"XP":"min"); b.lastChild.textContent=tags[i];
    b.setAttribute("aria-pressed", b.dataset.v===glPick); b.onclick=()=>{ glPick=b.dataset.v; box.querySelectorAll(".gl-opt").forEach(x=>x.setAttribute("aria-pressed",x.dataset.v===glPick)); }; box.appendChild(b); });
  openMod("goalModal"); setTimeout(()=>{ const sel=box.querySelector('[aria-pressed="true"]'); if(sel) sel.focus({preventScroll:true}); },30); }
$("glOk").addEventListener("click",()=>{ const [k,v]=glPick.split(":"); goalSet(k,+v); closeMod("goalModal"); toast(t("goalSaved")); });
Object.assign(NTF_ICON,{goal:"medal", freeze:"gift", freezeWon:"gift"});
// on start, and when the app comes back the next day: a freeze may cover yesterday
try{ freezeCheck(); }catch(e){}
document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="visible"){ try{ freezeCheck(); goalRing(); renderStatus(); }catch(e){} } });
setInterval(()=>{ try{ freezeCheck(); goalRing(); }catch(e){} }, 10*60*1000);
/* ==== fin Objectif ==== */
