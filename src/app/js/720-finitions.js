// fragment de l'IIFE principale — ordre 720, voir src/app/README.md
/* ==== Finitions ==== */
// Quiz, zones of one piano: a zone under 5 white keys is too small to play in → warning + « Switch to N-1 players », no game
function qzZoneSmall(zones){ const isW=m=>[0,2,4,5,7,9,11].includes(m%12); return zones.some(([a,b])=>{ let w=0; for(let m=a;m<=b;m++) if(isW(m)) w++; return w<5; }); }
function qzSmallShow(c,small,re){ const sw=$("qzSmallWarn"); if(!sw) return; sw.hidden=!small; if(!small) return;
  let fit=c.n-1; while(fit>2 && qzZoneSmall(qzZones(fit))) fit--; // the most players this keyboard can take
  sw.firstChild.textContent=t("qzZoneSmall")(c.n); const b=$("qzFewer"); b.hidden=fit<2 || qzZoneSmall(qzZones(fit)); b.textContent=t("qzZoneFewer")(fit);
  b.onclick=()=>{ c.n=fit; c.bots=Math.min(c.bots,4-c.n); re(); }; }
// D28: the icon of the first tip is the device the text names (computer, tablet, phone)
const MP_DEV_ICO={iphone:'<rect x="7" y="2.5" width="10" height="19" rx="2.2"/><path d="M11 18.5h2"/>', android:'<rect x="7" y="2.5" width="10" height="19" rx="2.2"/><path d="M11 18.5h2"/>',
  ipad:'<rect x="4" y="3" width="16" height="18" rx="2.2"/><path d="M11 18h2"/>', other:'<rect x="5" y="4.5" width="14" height="10" rx="1.5"/><path d="M2.5 18.5h19M4.5 14.5l-2 4M19.5 14.5l2 4"/>'};
// the sign-in screen opened from the app (not the first launch): a cross and Escape go back where you were (nothing is lost, no sign-out)
const gateFromApp = () => !!S.gate && !FN.on;
{ const _go=gateOpen; gateOpen=function(){ GATE.closable=gateFromApp(); return _go.apply(this,arguments); }; }
{ const _gr=gateRender; gateRender=function(){ const r=_gr.apply(this,arguments); const g=$("gate"), card=g&&g.querySelector(".gt-card");
    if(card && GATE.closable && !card.querySelector(".gt-x")){ const x=document.createElement("button"); x.type="button"; x.className="gt-x"; x.id="gtClose"; x.setAttribute("aria-label",t("close")); x.title=t("close");
      x.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>'; x.onclick=gateDismiss; card.appendChild(x); }
    return r; }; }
function gateDismiss(){ if(!GATE.closable) return; GATE.busy=false; GATE.closable=false; gateClose(); }
window.addEventListener("keydown",e=>{ if(e.key!=="Escape" || !GATE.closable || !document.body.classList.contains("gate-on") || document.body.classList.contains("pw-on")) return;
  const g=$("gate"); if(!g || g.hidden || g.querySelector(".fn-card")) return; e.preventDefault(); e.stopImmediatePropagation(); gateDismiss(); },true);
Object.assign(TXT.fr,{qzZoneSmall:n=>"Ton clavier est trop petit pour "+n+" zones.", qzZoneFewer:n=>"Passer à "+n+" joueurs", goalKickL:"Bravo pour cette leçon"});
Object.assign(TXT.en,{qzZoneSmall:n=>"Your keyboard is too small for "+n+" zones.", qzZoneFewer:n=>"Switch to "+n+" players", goalKickL:"Well done on this lesson"});
/* ==== fin Finitions ==== */
