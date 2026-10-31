// fragment de l'IIFE principale — ordre 870, voir src/app/README.md
/* ==== Gammes une à une v3 (chantier sc1-v3, 27/10/2026) ==== */
// Retours d'Antoine : tutoriel à la première visite de la page sc1 (moteur du tutoriel guidé #tour : TOUR.custom / TOUR.kf / TOUR.onEnd,
// mémorisé dans S.settings.sc1Tour, bouton « ? » #sc1Help pour le revoir, Do = Suivant au clavier MIDI) ; doigtés toujours montrés en
// Entraînement ; info-bulles (#sc1Tip : survol, focus, tap) sur la Révision désactivée et sur chaque coupe ; plus d'étiquette « Conseillé » ;
// touches de notes (kbd.kn) affichées seulement si un clavier MIDI est vraiment branché (body.midi-ok) ; fin d'entraînement : « Passer à
// l'évaluation » principal à droite (Do), « Rejouer » gris à sa gauche (Si), « Revoir la gamme » à gauche (Mi) ; Évaluation et Révision
// sans aucune aide ni chrono (réglages du joueur prêtés le temps de la partie, jamais sauvegardés : sc1Lend) ; « Terminer la partie » en
// bouton gris + confirmation (#leaveModal). Test : tools/audit/r52_sc1v3.mjs.
Object.assign(TXT.fr,{sc1RvNone:"Termine une gamme avec 3 étoiles pour débloquer la révision.", sc1CupOff:x=>"Termine les 4 gammes de "+x+" avec 3 étoiles pour gagner la coupe.",
  sc1TuK:(i,n)=>"Étape "+i+" sur "+n, sc1TuAgain:"Revoir le tutoriel",
  sc1Tu:{seg:["Notes ou accords",["NOTES : tu joues chaque gamme note par note.","ACCORDS : tu joues les accords de la gamme, un par un.","Chaque mode a ses propres étoiles."]],
    cell:["Une case = une gamme",["Touche une case pour la jouer.","Entraînement : je te montre la gamme, puis tu la rejoues avec les touches allumées et les doigtés. Rien n'est noté.","Évaluation : tu la joues seul, sans aide, pour gagner des étoiles."]],
    stars:["Les étoiles",["1 étoile : 3 notes justes.","2 étoiles : la gamme finie, avec une ou plusieurs fautes.","3 étoiles : la gamme finie sans faute."]],
    cup:["La coupe",["Au bout de chaque ligne, une coupe.","Tu la gagnes quand les 4 gammes de la note ont 3 étoiles."]],
    rv:["La révision",["Rejoue d'un coup toutes tes gammes à 3 étoiles, pour les garder en mémoire.","Elle s'ouvre dès ta première gamme à 3 étoiles."]]},
  sc1EndS:"Ta progression sur cette gamme ne sera pas comptée.", sc1EndSR:"Ta progression dans cette révision ne sera pas comptée."});
Object.assign(TXT.en,{sc1RvNone:"Finish a scale with 3 stars to unlock the review.", sc1CupOff:x=>"Finish the 4 "+x+" scales with 3 stars to win the cup.",
  sc1TuK:(i,n)=>"Step "+i+" of "+n, sc1TuAgain:"See the tutorial again",
  sc1Tu:{seg:["Notes or chords",["NOTES: you play each scale note by note.","CHORDS: you play the chords of the scale, one by one.","Each mode has its own stars."]],
    cell:["One box = one scale",["Tap a box to play it.","Practice: I show you the scale, then you play it back with the keys lit and the fingering. Nothing is scored.","Test: you play it on your own, with no help, to win stars."]],
    stars:["The stars",["1 star: 3 right notes.","2 stars: the scale finished, with one mistake or more.","3 stars: the scale finished with no mistake."]],
    cup:["The cup",["At the end of each row, a cup.","You win it when the 4 scales of that note have 3 stars."]],
    rv:["The review",["Play all your 3-star scales again in one go, to keep them in mind.","It opens with your first 3-star scale."]]},
  sc1EndS:"Your progress on this scale won't count.", sc1EndSR:"Your progress in this review won't count."});
// ---- touches de notes : seulement avec un clavier MIDI vraiment branché ----
function kbdIsNote(k){ return String(k||"").split(" / ").every(p=>PC_FR.includes(p)||PC_EN.includes(p)); }
function kbdEl(k){ const e=document.createElement("kbd"); if(k===undefined || kbdIsNote(k)) e.className="kn"; return e; }
function midiOkSync(){ try{ document.body.classList.toggle("midi-ok", !!(midiMode() && S.settings.midiC!==false)); }catch(e){} }
{ const o=render; render=function(){ midiOkSync(); return o.apply(this,arguments); }; }
{ const o=renderInputUI; renderInputUI=function(){ const r=o.apply(this,arguments); midiOkSync(); return r; }; }
setInterval(midiOkSync,1500); midiOkSync();
// ---- Évaluation, Révision : aucune aide ni chrono ; Entraînement : touches, noms et doigtés (prêtés, jamais sauvegardés) ----
const sc1Ev = () => page==="practice" && ((sc1On() && !game.sc1.train) || rvOn());
function sc1Want(){ if(page!=="practice" || !game) return null;
  if(sc1Tr()) return {guideK:true, guideN:true, guideP:false, fing:true};
  if(sc1On()) return {guideK:false, guideN:false, guideP:false, staff:false, delay:0};
  if(rvOn()) return {guideK:false, guideN:false, guideP:false, staff:false}; // le chrono de la révision : rvFix (sc1RvT = 0)
  return null; }
const SC1L={on:null, keep:null};
const sc1Back = () => { const k=SC1L.keep, s=S.settings; Object.keys(k).forEach(x=>{ if(k[x]===undefined) delete s[x]; else s[x]=k[x]; }); };
sc1TrGuide=function(){ const w=sc1Want(), sig=w?JSON.stringify(w):"", s=S.settings;
  if(SC1L.on!==null && SC1L.on!==sig){ sc1Back(); SC1L.on=null; SC1L.keep=null; }
  if(w){ if(SC1L.on===null){ SC1L.keep={}; Object.keys(w).forEach(x=>SC1L.keep[x]=s[x]); SC1L.on=sig; } Object.assign(s,w); }
  try{ document.body.classList.toggle("sc1ev", sc1Ev()); document.body.classList.toggle("sc1x", page==="practice" && !!game && (sc1On()||rvOn())); }catch(e){} };
{ const o=save; save=function(){ if(SC1L.on===null) return o.apply(this,arguments); const s=S.settings, now={}; Object.keys(SC1L.keep).forEach(x=>now[x]=s[x]); sc1Back();
    try{ return o.apply(this,arguments); } finally{ Object.assign(s,now); } }; }
{ const o=autoHelp; autoHelp=function(){ if(sc1Ev()) return; return o.apply(this,arguments); }; }
{ const o=primaryAction; primaryAction=function(){ if(sc1Ev() && phase==="listening" && !(cur && cur.sec==="ear")) return; // Oreille : Espace = réécouter // pas de « Je sèche » en évaluation : on bascule en Entraînement
    if(sc1Tr() && phase==="success"){ sc1Switch("eval"); return; } return o.apply(this,arguments); }; }
{ const o=reveal; reveal=function(){ if(sc1Ev() && phase==="listening" && !(cur && cur.sec==="ear")) return; return o.apply(this,arguments); }; } // Oreille : une mauvaise réponse montre la bonne
{ const o=renderGameBar; renderGameBar=function(){ const r=o.apply(this,arguments); try{ sc1TrGuide(); }catch(e){} return r; }; }
{ const o=renderActions; renderActions=function(){ const r=o.apply(this,arguments); try{
    if(sc1Ev() && phase==="listening" && !(cur && cur.sec==="ear")){ $("actions").innerHTML=""; return r; }
    // fin d'entraînement : Revoir (Mi) à gauche … Rejouer (gris, Si) puis « Passer à l'évaluation » (principal, Do) à droite
    if(sc1Tr() && phase==="success"){ const a=$("actions"), see=$("sc1See"), ev=$("sc1ToEval"), rp=$("sc1Replay"); if(!(see&&ev&&rp)) return r;
      const md=midiMode() && S.settings.midiC!==false, kb=hasKeyboard(), space=kb?(S.settings.lang==="fr"?"Espace":"Space"):null;
      [see,ev,rp].forEach(b=>b.querySelectorAll("kbd").forEach(x=>x.remove()));
      const add=(b,k)=>{ if(!k) return; const x=kbdEl(k); x.textContent=k; b.appendChild(x); };
      rp.classList.remove("primary"); ev.classList.add("primary"); add(see,md?ENAME():null); add(rp,md?BNAME():null); add(ev,md?CNAME():space);
      a.appendChild(rp); a.appendChild(ev); } }catch(e){ console.warn(e); } return r; }; }
// ---- « Terminer la partie » : un bouton gris, et une confirmation ----
addEventListener("click",e=>{ if(LV.pass || LV.on || !e.target.closest) return; const el=e.target.closest("#gameEnd"); if(!el || !(page==="practice" && game && (sc1On()||rvOn()))) return;
  e.preventDefault(); e.stopImmediatePropagation();
  lvOpen(actNow()||{k:"learn"},()=>{ LV.pass=true; try{ el.click(); }finally{ LV.pass=false; } },true); },true);
{ const o=lvOpen; lvOpen=function(a,fn,end){ const r=o.apply(this,arguments); if(end && page==="practice" && game && (sc1On()||rvOn())){
      $("lvTitle").textContent=t("lvEndT"); $("lvSub").textContent=t(rvOn()?"sc1EndSR":"sc1EndS"); } return r; }; }
// ---- tutoriel de la page (première visite, puis le bouton « ? ») ----
function sc1TourSteps(){ const T=t("sc1Tu"); return [["#sc1Seg","",T.seg],["#sc1Grid .sc1-c","",T.cell],["#sc1Grid .sc1-c .sc1-st","",T.stars],["#sc1Grid .sc1-cup","",T.cup],["#sc1RvB","",T.rv]].filter(x=>x[2] && document.querySelector(x[0])); } // une matière sans coupe (Oreille) : 4 bulles
const sc1TourOn = () => !!(TOUR.custom && $("tour") && !$("tour").hidden);
function sc1TourStart(){ if(page!=="sc1" || ($("tour") && !$("tour").hidden)) return; sc1TipHide();
  TOUR.custom=sc1TourSteps(); TOUR.kf=t("sc1TuK"); TOUR.onEnd=()=>{ uaTourSet(UA.cur); save(); const h=$("sc1Help"); if(h) h.focus({preventScroll:true}); }; tourStart(); }
function sc1TourAuto(){ if(page!=="sc1" || uaTourDone(UA.cur) || startUI() || anyWin() || endOpen) return; sc1TourStart(); }
{ const o=tourShow; tourShow=function(){ const r=o.apply(this,arguments); try{ if(TOUR.custom){ const n=$("tourNext"); if(n && !n.querySelector("kbd")){ const x=kbdEl(); x.textContent=CNAME(); n.appendChild(x); } } }catch(e){} return r; }; }
{ const o=openPage; openPage=function(pg){ const r=o.apply(this,arguments); if(page==="sc1" && pg==="sc1") setTimeout(sc1TourAuto,300); else if(sc1TourOn() && page!=="sc1") tourEnd(); sc1TipHide(); return r; }; }
// ---- info-bulles : la Révision désactivée, les coupes ----
function sc1TipHide(){ const p=$("sc1Tip"); if(p) p.hidden=true; clearTimeout(SC1L.tt); }
function sc1TipShow(el, auto){ const tx=el && el.dataset.tip; if(!tx) return; let p=$("sc1Tip");
  if(!p){ p=document.createElement("div"); p.id="sc1Tip"; p.className="sc1-tip"; p.setAttribute("role","tooltip"); document.body.appendChild(p); }
  p.textContent=tx; p.hidden=false; const r=el.getBoundingClientRect(), W=document.documentElement.clientWidth, w=p.offsetWidth, h=p.offsetHeight;
  const x=Math.max(8,Math.min(W-w-8, r.left+r.width/2-w/2)), up=r.top-h-10>=8; p.dataset.side=up?"above":"below";
  p.style.left=x+"px"; p.style.top=(up ? r.top-h-10 : r.bottom+10)+"px"; p.style.setProperty("--ax",Math.max(12,Math.min(w-12,r.left+r.width/2-x))+"px");
  clearTimeout(SC1L.tt); if(auto) SC1L.tt=setTimeout(sc1TipHide,2800); }
{ const P=$("sc1Panel");
  P.addEventListener("pointerover",e=>{ if(e.pointerType!=="mouse") return; const el=e.target.closest("[data-tip]"); if(el) sc1TipShow(el); });
  P.addEventListener("pointerout",e=>{ if(e.pointerType!=="mouse") return; const el=e.target.closest("[data-tip]"); if(el && !el.contains(e.relatedTarget)) sc1TipHide(); });
  P.addEventListener("click",e=>{ const el=e.target.closest("[data-tip]"); if(el) sc1TipShow(el,true); });
  P.addEventListener("focusin",e=>{ const el=e.target.closest("[data-tip]"); if(el && el.matches(":focus-visible")) sc1TipShow(el); });
  P.addEventListener("focusout",()=>sc1TipHide());
  P.addEventListener("contextmenu",e=>{ if(e.target.closest("[data-tip]")) e.preventDefault(); }); // appui long sur mobile : la bulle, pas le menu
  addEventListener("scroll",sc1TipHide,true); addEventListener("resize",sc1TipHide); }
{ const o=sc1Render; sc1Render=function(){ const r=o.apply(this,arguments); try{ const P=$("sc1Panel"), mode=sc1Mode();
      P.querySelectorAll(".sc1-cup").forEach(c=>{ const pc=uaDef(mode).rows(mode).find(r=>String(r.id)===c.dataset.row).id, nm=sc1RowName(pc,mode), tx=sc1Cup(mode,pc) ? t("sc1CupWon")(nm) : t("sc1CupOff")(nm);
        c.removeAttribute("title"); c.dataset.tip=tx; c.setAttribute("aria-label",tx); c.tabIndex=0; });
      const rb=$("sc1RvB"); if(rb && rb.getAttribute("aria-disabled")==="true"){ rb.removeAttribute("title"); rb.dataset.tip=t("sc1RvNone"); rb.setAttribute("aria-label",t("sc1Rv")+" : "+t("sc1RvNone")); }
      const top=P.querySelector(".sc1-top"), hd=P.querySelector(".sc1-h"); if(top && hd){ const b=document.createElement("button"); b.type="button"; b.id="sc1Help"; b.className="sc1-help";
        b.textContent="?"; b.setAttribute("aria-label",t("sc1TuAgain")); b.dataset.tip=t("sc1TuAgain"); b.onclick=e=>{ e.stopPropagation(); sc1TourStart(); }; hd.after(b); } }catch(e){ console.warn(e); } return r; }; }
// ---- MIDI : le tutoriel (Do = Suivant), la fin d'entraînement (Do = évaluation, Si = rejouer, Mi = revoir) ----
{ const o=midiStart; midiStart=function(note){ const pc=((note%12)+12)%12;
    if(sc1TourOn()){ if(pc===0 && S.settings.midiC!==false) tourGo(1); return true; }
    if(sc1Tr() && phase==="success" && (pc===0||pc===4||pc===11) && S.settings.midiC!==false && !anyModal() && !setOpen){ if(pc===0) sc1Switch("eval"); else if(pc===11) sc1Turn(); else sc1Demo(); return true; }
    return o.apply(this,arguments); }; }
{ const o=mergeState; mergeState=function(local, cloud){ const r=o.apply(this,arguments); try{ const a=local&&local.settings, b=cloud&&cloud.settings;
      if(r.merged && r.merged.settings && !r.merged.settings.sc1Tour && ((a&&a.sc1Tour)||(b&&b.sc1Tour))) r.merged.settings.sc1Tour=1; }catch(e){} return r; }; }
/* ==== fin Gammes une à une v3 ==== */
