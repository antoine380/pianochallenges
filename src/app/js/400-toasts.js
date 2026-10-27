// fragment de l'IIFE principale — ordre 400, voir src/app/README.md
// ---------- Toasts & notices ----------
function unlockNote(x){ try{ ntfAdd({key:"unl-"+x, cat:"progress", type:"unlock", ti:t("ntfUnlockT"), tx:x, act:{k:"learn",l:"ntfPlay"}}); }catch(e){} } // no toast (removed on request): it goes to the notifications
let toastT=0;
function toast(x){
  // discreet notification (level up, sign-out…), 2.5 s, created on demand
  let el=$("toast");
  if(!el){ el=document.createElement("div"); el.id="toast"; el.setAttribute("role","status"); el.setAttribute("aria-live","polite");
    el.style.cssText="position:fixed;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%) translateY(8px);z-index:400;max-width:min(92vw,420px);padding:9px 14px;border-radius:999px;background:var(--ink);color:var(--surface);font:500 14px/1.3 var(--f-body,system-ui,sans-serif);box-shadow:0 6px 24px rgba(0,0,0,.25);opacity:0;transition:opacity 250ms var(--ease-out),transform 250ms var(--ease-out);pointer-events:none;text-align:center";
    document.body.appendChild(el); }
  el.textContent=x; clearTimeout(toastT);
  requestAnimationFrame(()=>{ el.style.opacity="1"; el.style.transform="translateX(-50%) translateY(0)"; });
  toastT=setTimeout(()=>{ el.style.opacity="0"; el.style.transform="translateX(-50%) translateY(8px)"; },2500);
}
function notice(x){ const n=$("notice"); n.textContent=x; n.hidden=!x; }

