// fragment de l'IIFE principale — ordre 440, voir src/app/README.md
// ---------- Unsubscribe link of an e-mail (?unsub=<token>&k=<kind>): ask, then tell the server ----------
const UNSUB = (()=>{ const q=new URLSearchParams(location.search), tk=q.get("unsub"), k=q.get("k")||"all";
  if(!tk || !/^[0-9a-f-]{36}$/i.test(tk)) return null; history.replaceState(null,"",location.pathname+location.hash); return {tk, k:["weekly","streak","social","news","all"].includes(k)?k:"all"}; })();
function unsubOpen(){ if(!UNSUB) return; const o=document.createElement("div"); o.className="onb"; o.id="unsubBox"; o.setAttribute("role","dialog"); o.setAttribute("aria-modal","true");
  const what=t("unsubWhat")[UNSUB.k]||t("unsubWhat").all;
  o.innerHTML='<div class="onb-card unsub-card"><div class="onb-body"><span class="onb-ic">'+OBJ.bell()+'</span><h2 class="onb-h"></h2><p class="onb-sub"></p></div><div class="onb-foot"><button class="gt-go" type="button" id="unsubGo"></button><button class="gt-link" type="button" id="unsubNo"></button></div></div>';
  o.querySelector(".onb-h").textContent=t("unsubT"); o.querySelector(".onb-sub").textContent=t("unsubQ")(what);
  document.body.appendChild(o); $("unsubGo").textContent=t("unsubYes"); $("unsubNo").textContent=t("unsubKeep");
  const done=txt=>{ o.querySelector(".onb-sub").textContent=txt; $("unsubGo").textContent=t("unsubClose"); $("unsubGo").onclick=()=>o.remove(); $("unsubNo").hidden=true; };
  $("unsubNo").onclick=()=>o.remove();
  $("unsubGo").onclick=async()=>{ $("unsubGo").disabled=true;
    try{ const r=await fetch(SUPA_URL+"/functions/v1/notify?unsub="+encodeURIComponent(UNSUB.tk)+"&k="+UNSUB.k,{method:"POST"}); const j=await r.json(); $("unsubGo").disabled=false; done(j&&j.ok?t("unsubDone"):t("unsubBad")); }
    catch(e){ $("unsubGo").disabled=false; done(t("cloudErr")); } }; }
setTimeout(unsubOpen,500);
