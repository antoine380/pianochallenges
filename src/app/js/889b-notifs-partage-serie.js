// fragment de l'IIFE principale — ordre 889b, voir src/app/README.md
/* ==== Notifications, partage, bilan, série (08/11/2026, retours d'Antoine) ====
// A. Une notification ajoutée (ntfAdd) apparaît en carte en haut à droite (#ntfPop : picto, ou le badge gagné), un clic = l'action ;
//    les toasts texte (toast()) passent aussi en haut à droite avec un picto ; dans la liste des notifications, un badge montre son dessin.
// B. Partager = d'abord une fenêtre dans l'app (#shSheet : aperçu de l'image, WhatsApp, Messages, E-mail, Copier, Enregistrer l'image,
//    « Plus… » = la feuille de partage du système), comme Duolingo / chess.com.
// C. Bilan de partie : sans « Meilleur combo », sans « Aucune erreur, bravo ! » (déjà dit par « n / n exercices sans faute »).
// D. Série : l'animation reste jusqu'au toucher (ou Do) ; temps par jour réglable dans la carte verte (#srMin : 5/10/15/20/30 min =
//    l'objectif du jour, SR_MIN) ; plus de « Semaine : n/7 » ; rond du jour bien rond ; toucher un jour = ses minutes jouées (#pfDayTip). */
Object.assign(TXT.fr,{ntfPopA:"Ouvrir la notification", shT:"Partager", shSub:"Choisis comment partager", shWa:"WhatsApp", shSms:"Messages", shMail:"E-mail", shCopy:"Copier", shSave:"Enregistrer l'image", shMore:"Plus…", shCopied:"Copié !",
  srMinL:"Mon temps par jour", srMinA:n=>n+" minutes par jour", dayMin:(d,n)=>d+" · "+(n ? n+" min jouée"+(n>1?"s":"") : "pas joué"), dayMin0:"moins d'une minute"});
Object.assign(TXT.en,{ntfPopA:"Open the notification", shT:"Share", shSub:"Choose how to share", shWa:"WhatsApp", shSms:"Messages", shMail:"Email", shCopy:"Copy", shSave:"Save image", shMore:"More…", shCopied:"Copied!",
  srMinL:"My time per day", srMinA:n=>n+" minutes a day", dayMin:(d,n)=>d+" · "+(n ? n+" min played" : "not played"), dayMin0:"less than a minute"});

// ---- A. notifications en haut à droite ----
const NP={q:[], on:false, tt:0}, NP_QUIET=["welcome","news"]; // l'accueil et les actualités restent dans la liste, sans carte
const npIcon = n => { const m=/^badge-(.+)$/.exec(n.id||n.key||""); if(m && typeof achSvg==="function") try{ return '<span class="np-badge">'+achSvg(m[1])+'</span>'; }catch(e){}
  return (OBJ[NTF_ICON[n.type]]||OBJ.bell)(); };
function npShow(){ if(NP.on || !NP.q.length) return; const n=NP.q.shift(); let el=$("ntfPop");
  if(!el){ el=document.createElement("button"); el.type="button"; el.id="ntfPop"; el.className="ntf-pop"; el.setAttribute("aria-live","polite"); document.body.appendChild(el);
    el.addEventListener("click",()=>{ const a=el._act; npHide(); if(a){ try{ const it=ntfStore().list.find(x=>x.id===el._id); if(it){ it.read=true; save(); ntfBadge(); } }catch(e){} ntfDo(a); } else openPage("notif"); }); }
  el._act=n.act||null; el._id=n.id; el.setAttribute("aria-label",t("ntfPopA")+" : "+n.ti);
  el.innerHTML='<span class="np-ic" aria-hidden="true">'+npIcon(n)+'</span><span class="np-tx"><b></b>'+(n.tx?'<small></small>':'')+'</span>';
  el.querySelector("b").textContent=n.ti; if(n.tx) el.querySelector("small").textContent=n.tx;
  NP.on=true; el.classList.remove("on"); void el.offsetWidth; el.classList.add("on"); clearTimeout(NP.tt); NP.tt=setTimeout(npHide, 5200); }
function npHide(){ const el=$("ntfPop"); clearTimeout(NP.tt); if(el) el.classList.remove("on"); NP.on=false; setTimeout(npShow, 380); }
{ const o=ntfAdd; ntfAdd=function(n, silent){ const r=o.apply(this,arguments);
    try{ if(r && !silent && !NP_QUIET.includes(n.type) && Date.now()-(n.t||Date.now())<120000){ const it=ntfStore().list.find(x=>x.id===(n.key||"")) || {...n, id:n.key};
        if(NP.q.length<3) NP.q.push(it); npShow(); } }catch(e){} return r; }; }
// le badge gagné : sa notification suffit (plus de toast texte en double)
{ const o=achParty; achParty=function(got){ const tt=toast; toast=()=>{}; try{ return o.apply(this,arguments); } finally { toast=tt; } }; }
// toast() : en haut à droite, avec un picto
{ toast=function(x){ let el=$("toast"); if(!el){ el=document.createElement("div"); el.id="toast"; el.className="pc-toast"; el.setAttribute("role","status"); el.setAttribute("aria-live","polite"); document.body.appendChild(el); }
    el.innerHTML='<span class="np-ic" aria-hidden="true">'+OBJ.bell()+'</span><span class="np-tx"><b></b></span>'; el.querySelector("b").textContent=x;
    el.classList.remove("on"); void el.offsetWidth; el.classList.add("on"); clearTimeout(toastT); toastT=setTimeout(()=>el.classList.remove("on"),2800); }; }
// la liste : un badge montre son dessin
{ const o=renderNotifs; renderNotifs=function(){ const r=o.apply(this,arguments); try{ const L=ntfStore().list.filter(n=>ntfFilter==="all"||n.cat===ntfFilter), lis=[...document.querySelectorAll("#ntfList .ntf-it")];
    lis.forEach((li,i)=>{ const n=L[i]; if(n && /^badge-/.test(n.id||"")){ const ic=li.querySelector(".ntf-ic"); if(ic){ ic.innerHTML=npIcon(n); ic.classList.add("is-badge"); } } }); }catch(e){} return r; }; }

// ---- B. partager : la fenêtre de l'app d'abord ----
const SH={o:null, url:""};
{ const m=document.createElement("div"); m.className="modal"; m.id="shSheet"; m.hidden=true; m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-labelledby","shT");
  m.innerHTML='<div class="modal-bg" data-close="shSheet"></div><div class="modal-card small sh-card"><div class="modal-head"><div><h2 id="shT"></h2><p class="modal-sub" id="shSub"></p></div>'
    +'<button class="modal-close" type="button" data-close="shSheet" aria-label="Close">×</button></div><div class="modal-body"><div class="sh-prev" id="shPrev"></div><div class="sh-opts" id="shOpts"></div></div></div>';
  document.body.appendChild(m); }
const SH_IC={wa:'<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 1c-1-.4-1.6-1-2-2l1-1-1-2z"/>', sms:'<path d="M4 5h16v11H9l-5 4z"/>', mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>', save:'<path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/>', more:'<circle cx="6" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18" cy="12" r="1.6"/>'};
const shText = o => o.text+(o.url?" "+o.url:"");
const shOpen = url => { try{ const w=window.open(url,"_blank","noopener"); if(!w) location.href=url; }catch(e){ location.href=url; } };
function shSheetOpen(o){ SH.o=o; try{ if(SH.url) URL.revokeObjectURL(SH.url); }catch(e){} SH.url="";
  $("shT").textContent=t("shT"); $("shSub").textContent=t("shSub");
  const pv=$("shPrev"); pv.innerHTML=""; pv.hidden=!o.file;
  if(o.file){ try{ SH.url=URL.createObjectURL(o.file); const im=document.createElement("img"); im.src=SH.url; im.alt=""; pv.appendChild(im); }catch(e){ pv.hidden=true; } }
  const nat=!!navigator.share, list=[["wa",t("shWa"),"wa"],["sms",t("shSms"),"sms"],["mail",t("shMail"),"mail"],["copy",t("shCopy"),"copy"]];
  if(o.file) list.push(["save",t("shSave"),"save"]); if(nat) list.push(["more",t("shMore"),"more"]);
  const box=$("shOpts"); box.innerHTML="";
  list.forEach(([k,l])=>{ const b=document.createElement("button"); b.type="button"; b.className="sh-o sh-"+k; b.dataset.k=k;
    b.innerHTML='<span class="sh-i" aria-hidden="true"><svg viewBox="0 0 24 24">'+SH_IC[k]+'</svg></span><span class="sh-l"></span>'; b.querySelector(".sh-l").textContent=l; b.onclick=()=>shDo(k,b); box.appendChild(b); });
  openMod("shSheet"); }
async function shDo(k, b){ const o=SH.o; if(!o) return; const tx=shText(o), e=encodeURIComponent;
  if(k==="wa") shOpen("https://wa.me/?text="+e(tx));
  else if(k==="sms") shOpen("sms:?&body="+e(tx));
  else if(k==="mail") shOpen("mailto:?subject="+e(o.title||"Piano Challenges")+"&body="+e(tx));
  else if(k==="copy"){ try{ await navigator.clipboard.writeText(tx); const l=b.querySelector(".sh-l"), w=l.textContent; l.textContent=t("shCopied"); setTimeout(()=>{ l.textContent=w; },1600); }catch(err){} return; }
  else if(k==="save"){ if(navigator.share && navigator.canShare && navigator.canShare({files:[o.file]})){ try{ await navigator.share({files:[o.file]}); }catch(err){} return; } // iPhone/iPad : « Enregistrer l'image » de la feuille du système
    try{ const a=document.createElement("a"); a.href=SH.url||URL.createObjectURL(o.file); a.download=(o.file.name||"piano-challenges.png"); document.body.appendChild(a); a.click(); a.remove(); }catch(err){} return; }
  else if(k==="more"){ closeMod("shSheet"); SH.native=1; try{ await shareIt(o); } finally { SH.native=0; } return; }
}
{ const o=shareIt; shareIt=async function(x){ if(SH.native || !x || !x.text) return o.apply(this,arguments); shSheetOpen(x); }; }

// ---- C. bilan de partie plus léger ----
{ const o=openEnd; openEnd=function(){ const r=o.apply(this,arguments); try{
    document.querySelectorAll("#endBody .end-stat").forEach(d=>{ if(d.firstChild && d.firstChild.textContent===t("bestCombo")) d.remove(); });
    const st=document.querySelector("#endBody .end-stats"); if(st) st.classList.add("n3");
    document.querySelectorAll("#endBody > h3").forEach(h=>{ if(h.textContent===t("allPerfect")) h.remove(); });
  }catch(e){ console.warn(e); } return r; }; }

// ---- D. série ----
{ const o=srShow; srShow=function(){ const r=o.apply(this,arguments); clearTimeout(SR.hide); return r; }; } // reste à l'écran jusqu'au toucher, Échap/Entrée ou Do
const SR_MINS=[5,10,15,20,30];
{ const o=srRow; srRow=function(){ const r=o.apply(this,arguments); try{ const row=$("pfSr"); if(!row) return r;
    row.querySelectorAll(".gl-chip.wk").forEach(x=>x.remove());
    const sel=document.createElement("label"); sel.className="sr-min"; sel.innerHTML='<span></span><select id="srMin"></select>'; sel.firstChild.textContent=t("srMinL");
    const s=sel.lastChild; s.setAttribute("aria-label",t("srMinL")); SR_MINS.forEach(v=>{ const op=document.createElement("option"); op.value=v; op.textContent=v+" min"; if(v===SR_MIN) op.selected=true; s.appendChild(op); });
    if(!SR_MINS.includes(SR_MIN)){ const op=document.createElement("option"); op.value=SR_MIN; op.textContent=SR_MIN+" min"; op.selected=true; s.prepend(op); }
    s.onchange=()=>{ goalSet("min", +s.value); srSync(); try{ renderFiche(); }catch(e){} try{ srTick(); }catch(e){} };
    row.appendChild(sel); }catch(e){ console.warn(e); } return r; }; }
{ const o=goalFiche; goalFiche=function(){ const r=o.apply(this,arguments); try{ const w=document.querySelector("#pfGoal .gl-chip.wk"); if(w) w.remove(); }catch(e){} return r; }; }
// le calendrier : toucher un jour = ses minutes
{ const o=renderFiche; renderFiche=function(){ const r=o.apply(this,arguments); try{ const cal=$("pfCal"); if(!cal || !pfMonth) return r; const y=pfMonth.getFullYear(), m=pfMonth.getMonth(), td=dayStr();
    cal.querySelectorAll("span").forEach(sp=>{ const d=+sp.textContent; if(!d) return; const k=dayStr(new Date(y,m,d)); if(k>td) return; sp.dataset.k=k; sp.tabIndex=0; sp.setAttribute("role","button");
      sp.setAttribute("aria-label",pfDayTx(k)); }); }catch(e){ console.warn(e); } return r; }; }
function pfDayTx(k){ const d=pDate(k), sec=srSec(k), mn=Math.floor(sec/60), L=S.settings.lang==="fr"?"fr-FR":"en-GB";
  let ds; try{ ds=d.toLocaleDateString(L,{weekday:"long",day:"numeric",month:"long"}); }catch(e){ ds=k; }
  return sec>0 && !mn ? ds+" · "+t("dayMin0") : t("dayMin")(ds, mn); }
function pfDayTip(sp){ let tip=$("pfDayTip"); const card=sp.closest(".pf-cal")||document.body;
  if(!tip){ tip=document.createElement("div"); tip.id="pfDayTip"; tip.className="pf-daytip"; tip.setAttribute("role","status"); }
  if(tip.parentNode!==card) card.appendChild(tip);
  cal_sel(sp); tip.textContent=pfDayTx(sp.dataset.k); tip.hidden=false;
  const cr=card.getBoundingClientRect(), r=sp.getBoundingClientRect(); tip.style.left=Math.max(6,Math.min(cr.width-tip.offsetWidth-6, r.left-cr.left+r.width/2-tip.offsetWidth/2))+"px"; tip.style.top=(r.top-cr.top-tip.offsetHeight-6)+"px";
  clearTimeout(pfDayTip.tt); pfDayTip.tt=setTimeout(()=>{ tip.hidden=true; cal_sel(null); },3500); }
function cal_sel(sp){ document.querySelectorAll("#pfCal span.sel").forEach(x=>x.classList.remove("sel")); if(sp) sp.classList.add("sel"); }
document.addEventListener("click",e=>{ const sp=e.target.closest && e.target.closest("#pfCal span[data-k]"); if(sp) pfDayTip(sp); });
document.addEventListener("keydown",e=>{ if((e.key==="Enter"||e.key===" ") && document.activeElement && document.activeElement.matches && document.activeElement.matches("#pfCal span[data-k]")){ e.preventDefault(); pfDayTip(document.activeElement); } });
/* ==== fin Notifications, partage, bilan, série ==== */
