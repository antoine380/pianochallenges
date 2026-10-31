// fragment de l'IIFE principale — ordre 887, voir src/app/README.md
/* ==== Réglages : fermer (31/10/2026) ==== */
// Demande d'Antoine : « aller sur Réglages et ensuite revenir sur la partie où j'étais ». Une croix « Fermer » en haut à droite de
// Réglages et de Progression (en-tête de page ; sur téléphone, dans la barre du haut : #mbClose), Échap, et Si seul au MIDI (comme
// « Si = fermer / quitter » ailleurs) ramènent à la page d'avant (returnPage) avec l'activité en cours telle quelle (openPage gère déjà
// le retour d'une page d'info : la manche en pause reprend). Une langue changée entre-temps : la page d'arrivée est redessinée dans la
// nouvelle langue (openPage la rend de nouveau) ; le lecteur Play en plein morceau ou en pleine partie n'est pas rechargé (il passera
// dans la nouvelle langue à sa prochaine ouverture), sinon il se recharge sur la même vue.
const SCL = { lang:null, keep:false };
const SCL_X = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
function sclBtn(id, cls){ const b=document.createElement("button"); b.type="button"; b.id=id; b.className=cls; b.innerHTML=SCL_X; b.addEventListener("click",()=>setCloseGo()); return b; }
[["settingsPage","setClose"],["progressPage","pfClose"]].forEach(([pg,id])=>{ const h=$(pg) && $(pg).querySelector(".pane-head"); if(h) h.appendChild(sclBtn(id,"ph-x")); });
{ const bar=document.querySelector(".mbar"); if(bar) bar.appendChild(sclBtn("mbClose","mbar-btn ghost mb-x")); }
function sclLabels(){ ["setClose","pfClose","mbClose"].forEach(id=>{ const b=$(id); if(b){ b.setAttribute("aria-label",t("close")); b.title=t("close"); } }); }
sclLabels();
// where the cross leads: the page the info page was opened over (the hub when there is none, e.g. Settings opened at start-up)
function setCloseGo(){ if(!INFO_PAGES.includes(page)) return; closeDrawer(); openPage(returnPage && !INFO_PAGES.includes(returnPage) ? returnPage : "hub"); }
// something else is in front (a window, the menu, the paywall, the sign-in screen, the tour, the leave window…): Échap / Si belong to it
function sclBusy(){ const b=document.body.classList;
  return anyWin() || (typeof startUI==="function" && startUI()) || b.contains("drawer") || b.contains("fj-on") || typesOpen
    || (typeof LV!=="undefined" && LV.on) || (typeof SR!=="undefined" && SR.on) || (typeof MW!=="undefined" && MW.on) || (typeof MKC!=="undefined" && MKC.on)
    || (typeof FN!=="undefined" && FN.on) || (typeof achOpen!=="undefined" && !!achOpen) || !!($("onb") && !$("onb").hidden); }
window.addEventListener("keydown",e=>{ if(e.key!=="Escape" || e.repeat || !INFO_PAGES.includes(page) || sclBusy()) return;
  if(e.target && e.target.matches && e.target.matches("input,select,textarea")) return;
  e.preventDefault(); e.stopImmediatePropagation(); setCloseGo(); },true);
// a lone B on the MIDI keyboard closes it too (C/B: continue / leave everywhere else); the notes never reach the paused round
{ const _mf=midiFlush; midiFlush=function(){ if(INFO_PAGES.includes(page) && midiBufMidi && midiBuf.length===1 && ((midiBuf[0]%12)+12)%12===11 && S.settings.midiC!==false && !sclBusy()){ midiBuf=[]; setCloseGo(); return; } return _mf.apply(this,arguments); }; }
// the language: remembered when an info page opens; on the way back, the page is drawn again in the new language
{ const _op=openPage; openPage=function(pg){ const from=page, toInfo=INFO_PAGES.includes(pg) && !INFO_PAGES.includes(from);
  const back=INFO_PAGES.includes(from) && !INFO_PAGES.includes(pg) && returnPage && pg===returnPage, langChanged=back && SCL.lang && SCL.lang!==S.settings.lang;
  if(toInfo) SCL.lang=S.settings.lang;
  const qv=typeof QZ!=="undefined" ? QZ.view : null;
  if(back && pg==="play" && langChanged){ try{ const w=$("playFrame").contentWindow; SCL.keep=!!(w && w.clavioBusy && w.clavioBusy()); }catch(e){ SCL.keep=false; } }
  let r; try{ r=_op.apply(this,arguments); } finally{ SCL.keep=false; }
  if(back){ if(pg==="quiz" && qv==="end" && QZ.view==="setup"){ QZ.view="end"; renderQuiz(); } // the quiz results stay on screen
    if(langChanged){ SCL.lang=null; try{ setNav(); }catch(e){} } }
  if(!INFO_PAGES.includes(page)) SCL.lang=null;
  return r; }; }
{ const _po=playOpen; playOpen=function(){ if(SCL.keep){ $("playPanel").hidden=false; return; } return _po.apply(this,arguments); }; }
{ const _as=applyStatic; applyStatic=function(){ const r=_as.apply(this,arguments); sclLabels(); return r; }; }
/* ==== fin Réglages : fermer ==== */
