// fragment de l'IIFE principale — ordre 680, voir src/app/README.md
// ======================= D24 · rappel de la prochaine leçon =======================
// Dans l'app (catégorie Rappels, clé ppr-<jour>) : Premiers pas commencés et pas finis, pas encore joué aujourd'hui, à partir de l'heure
// choisie (défaut 18 h, jamais à partir de 21 h), jamais si l'objectif du jour est atteint, 3 rappels sans retour au plus, puis un seul
// « Ta place est gardée » 14 jours après la dernière séance. L'e-mail vient du serveur (job « path » de la fonction notify).
const remHour = () => { const h=+S.settings.remindH; return Number.isInteger(h) && h>=6 && h<=20 ? h : 18; };
function remS(){ if(!L4isO(S.ppRem)) S.ppRem={n:0}; return S.ppRem; }
const lastPlayDay = () => Object.keys(S.xpDays||{}).filter(k=>(S.xpDays[k]|0)>0).sort().pop() || "";
function remTitle(id, n){ const k=ppNum(id); return n===0 ? t("remT0")(k) : n===1 ? (id==="p08"?t("remMel"):t("remT1")(k)) : t("remT2")(k); }
function remCheck(now=new Date()){ if(!ppStarted() || ppAllDone()) return false; const today=dayStr(now), h=now.getHours(); if(h<remHour() || h>=21) return false;
  if(goalDone()) return false; const last=lastPlayDay(); if(!last || last>=today) return false;
  const r=remS(); if(r.last===today) return false; const n = r.last && last<r.last ? (r.n|0) : 0; // played since the last reminder: the count starts again
  if(n>=3){ if(last===addDays(-14) && r.kept!==last){ r.kept=last; save(); ntfAdd({key:"ppk-"+last, cat:"remind", type:"path", ti:t("remKeptT"), tx:t("remKeptX"), act:{k:"pp",l:"ntfPlay"}}); return true; } return false; }
  const ri=ppResumeInfo(), id=ri?ri.id:ppFirstOpen(S.pp), i=PP_IDS.indexOf(id);
  ntfAdd({key:"ppr-"+today, cat:"remind", type:"path", ti:remTitle(id,n), tx:ppTitle(id)+" · "+t("ppMin")(PP_MIN[i]), act:{k:"pp",l:"ntfPlay"}});
  r.n=n+1; r.last=today; save(); return true; }
{ const _nc=ntfCheck; ntfCheck=function(){ const r=_nc.apply(this,arguments); try{ remCheck(); }catch(e){} return r; }; }
{ const _nd=ntfDo; ntfDo=function(a){ if(a && a.k==="pp"){ guardLeave(()=>{ const r=ppResumeInfo(); if(r) ppOpen(r.id,r.step,r.err); else openPage("learn"); }); return; } if(a && a.k==="week"){ wkOpen(a.v); return; } return _nd.apply(this,arguments); }; }
// Réglages › Notifications : l'heure du rappel (aussi envoyée au serveur avec le fuseau)
{ const _rn=renderNtfSet; renderNtfSet=function(){ _rn.apply(this,arguments); const box=$("ntfSet"); if(!box) return; const r=document.createElement("div"); r.className="ntf-row ntf-hour";
    r.innerHTML='<span><b></b><small></small></span><select id="remHour"></select>'; r.querySelector("b").textContent=t("remHourL"); r.querySelector("small").textContent=t("remHourD");
    const s=r.querySelector("select"); s.setAttribute("aria-label",t("remHourL")); for(let h=8;h<=20;h++){ const o=document.createElement("option"); o.value=h; o.textContent=(h<10?"0":"")+h+":00"; s.appendChild(o); } s.value=remHour();
    s.onchange=()=>{ S.settings.remindH=+s.value; save(); ntfSavePrefs(); }; const note=box.querySelector(".ntf-note"); box.insertBefore(r, note||null); }; }

