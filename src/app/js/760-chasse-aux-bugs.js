// fragment de l'IIFE principale — ordre 760, voir src/app/README.md
/* ==== Chasse aux bugs ==== */
// The app goes to the background (another tab, the iPad home button, a call): a running solo activity waits, like behind
// the « Leave the game? » window (a timed LEARN round, Contre la montre, the quiz timer, memory, a duel against a bot),
// and starts again where it was on return. Online games keep going (the others still play).
Object.assign(TXT.fr,{saveFull:"Mémoire de l'appareil pleine : ta progression n'est plus enregistrée ici. Libère de la place ou crée un compte pour la garder."});
Object.assign(TXT.en,{saveFull:"Your device storage is full: your progress is no longer saved here. Free some space or create an account to keep it."});
const BG={a:null};
document.addEventListener("visibilitychange",()=>{ try{
  if(document.hidden){ if(BG.a || LV.on || HOLD) return; const pg=lvBase();
    if((pg==="practice"||pg==="daily") && game && phase==="listening"){ pauseRound(); BG.a={k:"learn"}; return; } // even before the first note: the chrono runs
    const a=actNow(); if(!a || a.online) return;
    if(a.k==="learn"||a.k==="daily"){ pauseRound(); BG.a=a; return; }
    const keep=LV.a; LV.a=a; lvHold(true); LV.a=keep; BG.a=a; return; }
  const a=BG.a; if(!a) return; BG.a=null;
  if(a.k==="learn"||a.k==="daily"){ resumeRound(); return; }
  if(typeof MD!=="undefined" && MD.paused){ if(HOLD && !MD.hold) MD.hold=true; return; } // the keyboard was unplugged meanwhile: its window keeps the game still and releases it
  if(HOLD && !LV.on){ const keep=LV.a; LV.a=a; lvHold(false); LV.a=keep; }
}catch(e){} });
// Two tabs (or the app and a browser window) share localStorage: each tab kept its own S and its next save() erased what
// the other had just won (XP, records, lessons). A write from another tab is now merged in memory like a cloud pull
// (mergeState: maxima, unions), never written back here (no ping-pong); this tab's next save() keeps both.
addEventListener("storage",e=>{ try{ if(e.key!==STORE || !e.newValue || e.storageArea!==localStorage) return;
  const other=JSON.parse(e.newValue); if(!other || typeof other!=="object" || Array.isArray(other)) return;
  const {merged,changed}=mergeState(S,other); if(!changed) return; S=merged;
  try{ renderSettings(); render(); renderDaily(); if(page==="learn") renderLearn(); if(page==="games") renderGames(); ntfBadge(); renderStatus(); }catch(x){}
}catch(err){} });
