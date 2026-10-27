// fragment de l'IIFE principale — ordre 900, voir src/app/README.md
/* ==== LiveUpdate ==== */
// App iOS seulement (rien ne change dans le navigateur) : la partie web se met à jour seule depuis pianochallenges.com
// (app/ios/App/App/LiveUpdatePlugin.swift, live/manifest.json écrit par tools/build.py). Ici :
// - ready() dit au natif que cette version a démarré sans erreur (sinon il revient à la précédente au bout de 20 s) ;
// - Réglages › Application : version web active + « Mise à jour prête au prochain lancement » quand une version attend ;
// - 5 touchers rapides sur cette ligne = revenir à la version d'origine de l'app (LiveUpdate.reset, après confirmation).
const LU = { info:null, taps:0, t0:0, on:false };
function luOn(){ const c=window.Capacitor; return isApp() && !!c && typeof c.nativePromise==="function"; }
function luCall(m, o){ return luOn() ? window.Capacitor.nativePromise("LiveUpdate", m, o||{}) : Promise.reject(new Error("web")); }
function luFmt(v){ v=String(v||""); return /^\d{4}-\d\d-\d\dT\d\d:\d\dZ$/.test(v) ? v.replace("T"," ").replace("Z"," UTC") : v; }
function luRender(){ const el=$("setLive"); if(!el) return;
  if(!luOn()){ el.hidden=true; el.textContent=""; return; }
  const i=LU.info||{}, v=i.version||(APP_BUILD!=="dev"?APP_BUILD:"");
  el.hidden=false;
  el.innerHTML='<br>'+esc(t("luVer")(luFmt(v)))+(i.source==="live"?' · '+esc(t("luLive")):"")+(i.pending?'<br><b class="lu-pend">'+esc(t("luPending"))+'</b>':""); }
function luInfo(){ return luCall("info").then(i=>{ if(i && typeof i==="object") LU.info=i; luRender(); }).catch(()=>{}); }
function luTap(){ const now=Date.now(); LU.taps = now-LU.t0<3000 ? LU.taps+1 : 1; if(LU.taps===1) LU.t0=now;
  if(LU.taps<5) return; LU.taps=0;
  if(confirm(t("luResetQ"))) luCall("reset").catch(()=>{}); }
Object.assign(TXT.fr,{luVer:v=>"Version web "+v, luLive:"mise à jour", luPending:"Mise à jour prête au prochain lancement", luResetQ:"Revenir à la version d'origine de l'app ? Ta progression est gardée."});
Object.assign(TXT.en,{luVer:v=>"Web version "+v, luLive:"updated", luPending:"Update ready for next launch", luResetQ:"Go back to the app's original version? Your progress is kept."});
if(luOn()){
  LU.on=true;
  { const el=$("setLive"); if(el) el.addEventListener("click", luTap); }
  { const o=openPage; openPage=function(pg){ const r=o.apply(this,arguments); if(pg==="settings") luInfo(); return r; }; }
  { const o=render; render=function(){ const r=o.apply(this,arguments); try{ luRender(); }catch(e){} return r; }; }
  try{ window.Capacitor.nativeCallback("LiveUpdate","addListener",{eventName:"pending"},(d,err)=>{ if(!err && d && d.version){ LU.info=Object.assign({}, LU.info||{}, {pending:d.version}); luRender(); } }); }catch(e){}
  // la page a démarré : on le dit au natif (dernière ligne du script, après le Boot)
  luCall("ready").then(i=>{ if(i && typeof i==="object") LU.info=i; luRender(); }).catch(()=>{});
}
/* ==== fin LiveUpdate ==== */
