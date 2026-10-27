// fragment de l'IIFE principale — ordre 890, voir src/app/README.md
// ---------- Boot ----------

applyStatic(); applySide(); buildKeyboard(); renderSettings(); render(); renderDaily(); openPage("hub");
setTimeout(()=>{ if(hasSession()) ensureCloud(); }, 400);
{ const sp=$("splash"); if(document.documentElement.classList.contains("native")){ const t0=performance.now(); setTimeout(()=>{ sp.classList.add("out"); setTimeout(()=>sp.remove(),400); }, Math.max(0,1500-t0)); } else sp.remove(); }
const mobileWeb = (phoneMQ.matches||railMQ.matches) && !document.documentElement.classList.contains("native");
document.body.classList.add("guest"); if(hasSession()) document.body.classList.add("sess-wait"); // a saved session: no « Sign up » flash before it loads
restoreInput(); mdWatch();
{ const nat=isApp(), wait=nat?1600:300;
  if(gateNeeded()){ save(); const op=(S.onb&&S.onb.legacy)?gateOpen:fnOpen; /* older players keep their settings: the sign-in screen once, not the first-note screen */ if(nat) setTimeout(op,wait); else op(); }
  else if(!(S.onb&&S.onb.done) || !S.tourDone){ save(); if(hasSession()) ensureCloud().finally(()=>setTimeout(startFlow,wait)); else setTimeout(startFlow,wait); }
  else maybeAskInput(); }
setTimeout(mailGo, isApp()?1800:700); // un bouton d'e-mail ouvre directement l'écran (entraînement du jour, leçon, progression)

