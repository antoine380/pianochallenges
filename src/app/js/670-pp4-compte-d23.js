// fragment de l'IIFE principale — ordre 670, voir src/app/README.md
// ======================= D23 · Garde tes progrès =======================
// Proposé une fois après la leçon 3 (après le choix de l'objectif D21) ou au premier objectif atteint ; refusé = reproposé une seule fois
// après la leçon 8, puis seulement dans Profil. Jamais pendant une partie ni au-dessus d'une autre fenêtre ; déjà connecté = rien.
const ACCT={pend:null, t:0, afterGoal:false};
function acctS(){ if(!L4isO(S.acct)) S.acct={n:0}; S.acct.n=Math.max(0,Math.min(2,S.acct.n|0)); return S.acct; }
const acctGuest = () => !user;
function acctWant(why){ if(!acctGuest()) return false; const a=acctS(); if(why==="p08" ? a.n!==1 : a.n!==0) return false; ACCT.pend=why; acctTry(); return true; }
function acctBusy(){ return anyModal() || FN.on || !!actNow() || (page==="pp" && (PP.view==="lesson"||PP.view==="place")) || !!($("gate") && !$("gate").hidden) || document.body.classList.contains("gate-on"); }
function acctTry(){ clearTimeout(ACCT.t); if(!ACCT.pend) return; if(!acctGuest()){ ACCT.pend=null; return; } if(acctBusy()){ ACCT.t=setTimeout(acctTry,2000); return; } const w=ACCT.pend; ACCT.pend=null; acctOpen(w); }
function acctEl(){ let m=$("accModal"); if(m) return m; m=document.createElement("div"); m.className="modal goal-modal acc-modal"; m.id="accModal"; m.hidden=true; m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-labelledby","accT");
  m.innerHTML='<div class="modal-bg" data-close="accModal"></div><div class="modal-card"><div class="modal-body gl-body acc-body"><span class="pp-badge big">'+PP_FOOT+'</span><h2 id="accT"></h2><p id="accX"></p><div class="acc-chips" id="accChips"></div>'
    +'<button class="acc-g" type="button" id="accG"><span class="acc-gi" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22"><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2-1.9 3.2-4.7 3.2-8z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.1a11 11 0 0 0 0 9.9z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.2 1.6l3.1-3.1A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z"/></svg></span><span></span></button><button class="acc-m" type="button" id="accM"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/></svg><span></span></button>'
    +'<div class="gl-foot"><small id="accFree"></small><button class="linkbtn" type="button" data-close="accModal" id="accLater"></button></div></div></div>';
  document.body.appendChild(m);
  $("accG").onclick=()=>{ closeMod("accModal"); authOpen("signup"); (async()=>{ for(let i=0;i<60 && !sb;i++) await new Promise(r=>setTimeout(r,100)); if(sb && typeof gateOAuth==="function") gateOAuth("google"); })(); };
  $("accM").onclick=()=>{ closeMod("accModal"); authOpen("signup"); GATE.step="email"; GATE.otp=true; try{ gateRender(); }catch(e){} };
  return m; }
function acctOpen(why){ const a=acctS(), m=acctEl(), n=ppDoneN(), st=typeof ppStarSum==="function"?ppStarSum():0, sk=Math.max(1,typeof effStreak==="function"?effStreak()|0:1);
  a.n++; a.at=Date.now(); a.why=why; save();
  $("accT").textContent=t("accT"); $("accX").textContent = n ? t("accX")(n) : t("accXg");
  $("accChips").innerHTML=(n?'<span class="ok">✓ '+esc(t("accLes")(n))+'</span>':'')+(st?'<span class="st">★ '+esc(t("accSt")(st))+'</span>':'')+'<span class="fl">'+esc(t("accDay")(sk))+'</span>';
  $("accG").lastChild.textContent=t("accG"); $("accM").lastChild.textContent=t("accMail"); $("accFree").textContent=t("accFree"); $("accLater").textContent=t("accLater");
  openMod("accModal"); setTimeout(()=>{ try{ $("accG").focus({preventScroll:true}); }catch(e){} },30); }
// after lesson 3 (first time): D21 (daily goal, if never asked) then D23; after lesson 8: D23 again if it was put off once
{ const _fi=ppFinish; ppFinish=function(){ const id=PP.id, d0=((S.pp||{}).done||{})[id], first=!d0 || (d0.place && !(+d0.stars>0)), rev=!!PP.review; const r=_fi.apply(this,arguments);
    if(!rev && first && id==="p03") setTimeout(()=>{ if(!(S.goal&&S.goal.asked) && page==="pp" && !anyModal()){ ACCT.afterGoal=true; goalOpen(); } else acctWant("p03"); },1400);
    if(!rev && first && id==="p08") setTimeout(()=>acctWant("p08"),1400);
    return r; }; }
{ const _cm=closeMod; closeMod=function(id){ const r=_cm.apply(this,arguments); if(id==="goalModal" && ACCT.afterGoal){ ACCT.afterGoal=false; setTimeout(()=>acctWant("p03"),350); } return r; }; }
// the first daily goal reached
{ const _gt=goalTick; goalTick=function(){ const was=S.goal&&S.goal.done; const r=_gt.apply(this,arguments); const now=S.goal&&S.goal.done; if(now===dayStr() && was!==now && acctGuest() && acctS().n===0) setTimeout(()=>acctWant("goal"),1200); return r; }; }
{ const _op=openPage; openPage=function(){ const r=_op.apply(this,arguments); if(ACCT.pend) setTimeout(acctTry,400); setTimeout(wkCheck,700); return r; }; }

