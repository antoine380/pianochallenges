// fragment de l'IIFE principale — ordre 560, voir src/app/README.md
/* ==== Mesure (back office) : événements anonymes, réglages à distance (app_config), « Signaler un problème », erreurs JS ==== */
// Rien ici ne touche la latence : les événements vont dans une file, envoyée par lots toutes les 30 s et à la fermeture
// (fetch keepalive vers la fonction SQL track_events), sans le SDK Supabase. Hors ligne, la file attend. Une table ou une
// fonction absente (migration pas encore lancée) coupe l'envoi sans erreur. En développement (localhost), rien ne part sur
// le réseau, sauf si localStorage « pc-trk-test » = "1" (tests). Interrupteur : S.settings.analytics (absent = activé).
const APP_BUILD="dev"; // remplacé par tools/build.py par la date de construction (version.txt)
const TRK={q:[], t:0, off:false, anon:null, sent:0, errs:[], errT:0, errSeen:new Set(), errOn:null, ports:new Set(), first:false};
const RC={flags:{}, daily:{}, at:0};
const TRK_NAMES=new Set(["song_import","app_open","first_note","input_mode","midi_connected","pp_lesson_done","learn_end","game_end","quiz_end","duel_end","goal_reached","badge","signup","login","play","feedback","acc_end","song_open","route_step","route_stage"]);
function trkDevLocal(){ return location.protocol==="file:" || (/^https?:$/.test(location.protocol) && /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(location.hostname)); }
function trkNet(){ if(!trkDevLocal()) return true; try{ return localStorage.getItem("pc-trk-test")==="1"; }catch(e){ return false; } }
function trkOn(){ return S.settings.analytics!==false && RC.flags.analytics!==false && !TRK.off; }
function trkAnon(){ if(TRK.anon) return TRK.anon; let a=null; try{ a=localStorage.getItem("pc-anon"); }catch(e){}
  if(!a || !/^[A-Za-z0-9_-]{8,40}$/.test(a)){ TRK.first=true; a=((crypto&&crypto.randomUUID)?crypto.randomUUID().replace(/-/g,""):(Math.random().toString(36).slice(2)+Date.now().toString(36))).slice(0,24); try{ localStorage.setItem("pc-anon",a); }catch(e){} }
  return TRK.anon=a; }
function trkDev(){ const w=Math.min(screen.width||innerWidth, screen.height||innerHeight); const touch=matchMedia("(pointer:coarse)").matches; return w<600?"phone":(touch&&w<1100)?"tablet":"desktop"; }
function trkCtx(){ const i=S.settings.input; return {l:S.settings.lang==="en"?"en":"fr", d:trkDev(), s:isApp()?"ios":"web", i:["midi","mic","screen"].includes(i)?i:"none", v:APP_BUILD}; }
// une valeur de propriété : nombre, booléen ou texte court ; 12 propriétés au plus
function trkProps(p){ const o={}; let n=0; Object.entries(p&&typeof p==="object"?p:{}).forEach(([k,v])=>{ if(n>=12 || !/^[a-z][a-zA-Z0-9_]{0,23}$/.test(k)) return;
  if(typeof v==="number"&&Number.isFinite(v)) o[k]=String(Math.round(v*100)/100); else if(typeof v==="boolean") o[k]=v?"1":"0"; else if(typeof v==="string") o[k]=v.replace(/[\u0000-\u001f\u007f]/g,"").slice(0,60); else return; n++; }); return o; }
function track(name, props){ try{
  if(!TRK_NAMES.has(name) || !trkOn()) return;
  TRK.q.push({n:name, t:Date.now(), p:trkProps(props), ...trkCtx()}); if(TRK.q.length>200) TRK.q.splice(0,TRK.q.length-200);
  if(!TRK.t) TRK.t=setTimeout(()=>{ TRK.t=0; trkFlush(false); }, 30000);
}catch(e){} }
function trkHdr(tok){ const h={"Content-Type":"application/json", apikey:SUPA_KEY}; if(tok) h.Authorization="Bearer "+tok; return h; }
async function trkTok(){ try{ if(sb && user){ const {data}=await sb.auth.getSession(); return data&&data.session&&data.session.access_token||null; } }catch(e){} return null; }
async function trkRpc(fn, body, keep){ const tok=await trkTok();
  return fetch(SUPA_URL+"/rest/v1/rpc/"+fn, {method:"POST", keepalive:!!keep, headers:trkHdr(tok), body:JSON.stringify(body)}); }
async function trkFlush(keep){ try{
  trkPlay();
  if(!TRK.q.length || !trkNet() || !trkOn() || (navigator.onLine===false)) return;
  const batch=TRK.q.splice(0,50);
  let r=null; try{ r=await trkRpc("track_events", {p_anon:trkAnon(), p_evts:batch}, keep); }catch(e){ r=null; }
  if(!r){ TRK.q.unshift(...batch); TRK.q.splice(200); return; } // pas de réseau : on réessaiera
  if(r.status===404 || r.status===401 || r.status===403){ TRK.off=true; TRK.q=[]; return; } // fonction absente ou refusée : plus rien pour cette session
  if(r.ok){ TRK.sent+=batch.length; if(TRK.q.length && !keep) trkFlush(false); }
}catch(e){} }
// temps de jeu : les secondes de S.playSec gagnées depuis le dernier envoi (une fois par appareil)
function trkPlay(){ try{ const d=dayStr(), now=((S.playSec||{})[d])|0; let last={}; try{ last=JSON.parse(localStorage.getItem("pc-trk-ps")||"{}"); }catch(e){}
  const prev=last.d===d?(last.s|0):0; if(now>prev){ const sec=now-prev; localStorage.setItem("pc-trk-ps", JSON.stringify({d, s:now})); if(trkOn() && sec>0) TRK.q.push({n:"play", t:Date.now(), p:{sec:String(sec)}, ...trkCtx()}); } }catch(e){} }
addEventListener("pagehide", ()=>trkFlush(true));
document.addEventListener("visibilitychange", ()=>{ if(document.visibilityState==="hidden") trkFlush(true); });

// ---- erreurs JS : une session sur quatre (flags.errSample), 5 messages différents au plus, envoyés 3 s plus tard ----
function trkErr(m, f, l, c, k){ try{
  if(TRK.errOn===null) TRK.errOn = Math.random() < (Number.isFinite(+RC.flags.errSample) ? +RC.flags.errSample : .25);
  if(!TRK.errOn || !trkOn() || !trkNet()) return; m=String(m||"").slice(0,300); if(!m || TRK.errSeen.has(m) || TRK.errSeen.size>=5) return; TRK.errSeen.add(m);
  const x=trkCtx(); TRK.errs.push({m, f:String(f||"").replace(/^https?:\/\/[^/]+/,"").slice(0,200), l:String(l|0), c:String(c|0), k:String(k||"").slice(0,1200), v:x.v, d:x.d, s:x.s, u:navigator.userAgent.slice(0,200)});
  clearTimeout(TRK.errT); TRK.errT=setTimeout(()=>{ const e=TRK.errs.splice(0,5); if(e.length) trkRpc("log_errors", {p_anon:trkAnon(), p_errs:e}).catch(()=>{}); }, 3000);
}catch(e){} }
addEventListener("error", e=>{ if(e && e.message) trkErr(e.message, e.filename, e.lineno, e.colno, e.error&&e.error.stack); });
addEventListener("unhandledrejection", e=>{ const r=e&&e.reason; trkErr("Unhandled: "+(r&&r.message||r), "", 0, 0, r&&r.stack); });

// ---- réglages à distance : app_config (lecture publique), mis en cache pour le démarrage suivant et hors ligne ----
const RC_NEWS_RE=/^[MmLlHhVvCcSsQqTtAaZz0-9 .,\-]{1,600}$/;
function rcNews(list){ if(!Array.isArray(list) || !list.length || list.length>8) return null;
  const out=list.map(n=>Array.isArray(n)?n:(n&&typeof n==="object")?[n.ti||n.title,n.tx||n.text,n.c||n.color,n.ic||n.icon]:null).filter(n=>n && typeof n[0]==="string" && n[0].trim() && n[0].length<=60 && typeof n[1]==="string" && n[1].length<=160)
    .map(n=>[n[0].trim(), n[1].trim(), /^#[0-9a-f]{6}$/i.test(n[2]||"")?n[2]:"#6a4bf0", RC_NEWS_RE.test(n[3]||"")?n[3]:"M12 3l2.4 5 5.6.8-4 3.9.9 5.5L12 15.6 7.1 18.2l.9-5.5-4-3.9 5.6-.8z"]);
  return out.length?out:null; }
function rcApply(rows, boot){ try{
  const m={}; (Array.isArray(rows)?rows:[]).forEach(r=>{ if(r && typeof r.key==="string") m[r.key]=r.value; });
  const f=m.flags&&typeof m.flags==="object"?m.flags:{}; RC.flags={}; Object.entries(f).forEach(([k,v])=>{ if(/^[a-zA-Z0-9_]{1,24}$/.test(k) && (typeof v==="boolean"||Number.isFinite(v))) RC.flags[k]=v; });
  const d=m.daily&&typeof m.daily==="object"?m.daily:{}; RC.daily={}; if(Number.isInteger(d.len) && d.len>=3 && d.len<=20) RC.daily.len=d.len;
  if(m.news && typeof m.news==="object"){ let ch=false; ["fr","en"].forEach(L=>{ const n=rcNews(m.news[L]); if(n){ if(!RC["news0"+L]) RC["news0"+L]=TXT[L].hsNews; TXT[L].hsNews=n; ch=true; } }); if(ch){ hsNewsLang=""; if(!boot && page==="hub") renderHubSide(); } }
  try{ if(m.prem_offer && typeof m.prem_offer==="object" && typeof PREM_OFFER!=="undefined" && PREM_OFFER && typeof PREM_OFFER==="object") Object.assign(PREM_OFFER, m.prem_offer); }catch(e){} // l'offre, si le module qui la définit est là
  if(!boot) try{ premRefresh(); }catch(e){}
}catch(e){} }
function rcLoad(){ try{ const c=JSON.parse(localStorage.getItem("pc-rc")||"null"); if(c && Array.isArray(c.rows)) rcApply(c.rows, true); }catch(e){}
  if(!trkNet()) return;
  setTimeout(()=>{ if(navigator.onLine===false) return;
    fetch(SUPA_URL+"/rest/v1/app_config?select=key,value", {headers:{apikey:SUPA_KEY}}).then(r=>r.ok?r.json():null).then(rows=>{ if(!Array.isArray(rows)) return;
      RC.at=Date.now(); try{ localStorage.setItem("pc-rc", JSON.stringify({at:RC.at, rows})); }catch(e){} rcApply(rows); }).catch(()=>{}); }, 2500); }
{ const o=paywallOn; paywallOn=function(){ if(RC.flags.paywall===false && !/[?&]paywall=1/.test(location.search)) return false; return o() || RC.flags.paywall===true; }; }
{ const o=buildDaily; buildDaily=function(n){ return o(n!=null ? n : (S.settings.dailyLen || RC.daily.len || 10)); }; }
// Premium offert depuis le back office (table prem_grants, lue avec my_premium())
{ const o=premUntil; premUntil=function(){ return Math.max(o(), +((S.prem||{}).gift)||0); }; }
async function trkPremium(){ try{ if(!sb || !user) return; const {data,error}=await sb.rpc("my_premium"); if(error) return; const u=data?Date.parse(data):0;
  const p=S.prem||{}; if((+p.gift||0)!==(u||0)){ S.prem={...p}; if(u) S.prem.gift=u; else delete S.prem.gift; save(); try{ premRefresh(); }catch(e){} } }catch(e){} }

// ---- les événements, posés autour des fonctions existantes (mêmes noms, rien d'autre ne change) ----
{ const o=fnNote; fnNote=function(m, el){ const was=FN.on && !FN.done; const r=o.apply(this, arguments); if(was && FN.done) track("first_note", {how:FN.how||"", level:FN.level||""}); return r; }; }
{ const o=setInput; setInput=async function(v, fromUser){ const prev=S.settings.input||"none"; const r=await o.apply(this, arguments); const now=S.settings.input||"none"; if(now!==prev) track("input_mode", {v:now, from:prev, user:!!fromUser}); return r; }; }
{ const o=mdPorts; mdPorts=function(names){ const r=o.apply(this, arguments); try{ (names||[]).forEach(n=>{ if(n && !TRK.ports.has(n)){ TRK.ports.add(n); track("midi_connected", {name:String(n).slice(0,40), n:names.length}); } }); }catch(e){} return r; }; }
{ const o=ppFinish; ppFinish=function(){ const id=PP.id; const r=o.apply(this, arguments); try{ const d=ppS().done[id]||{}; track("pp_lesson_done", {id, stars:PP.res?PP.res.stars:d.last, err:d.err|0, sec:d.sec|0, tries:d.tries|0}); }catch(e){} return r; }; }
{ const o=finishGame; finishGame=function(){ const g=game; const r=o.apply(this, arguments); try{ if(g){ const done=g.results.filter(Boolean); if(done.length) track("learn_end", {what:g.daily?"daily":(g.sec||""), n:done.length, good:done.filter(x=>x.level==="good").length, total:Number.isFinite(g.total)?g.total:0, complete:!!g.complete}); } }catch(e){} return r; }; }
{ const o=qzFinish; qzFinish=function(){ const r=o.apply(this, arguments); try{ const me=QZ.players.filter(p=>!p.bot&&!p.remote);
  track("quiz_end", {mode:QZ.mode||"", players:QZ.players.length, bots:QZ.players.filter(p=>p.bot).length, q:QZ.list.length, ok:me.length===1?(me[0].ok|0):0, ans:(qzCfg().ans||""), diff:(qzCfg().diff||"")}); }catch(e){} return r; }; }
{ const o=duFinish; duFinish=function(res, why){ const r=o.apply(this, arguments); try{ const e=(S.elo||{})[duKey()];
  track("duel_end", {game:DU.game, cont:DU.cont, res:res===1?"1":res===0?"0":"0.5", opp:DU.mode==="bot"?"bot":DU.rated?"online":"friend", rated:!!DU.rated, why:why||"", elo:DU.rated&&e?Math.round(e.r):0, me:DU.me.score|0, them:(DU.opp&&DU.opp.score)|0}); }catch(e){} return r; }; }
{ const o=goalTick; goalTick=function(){ const today=dayStr(), was=S.goal&&S.goal.done===today; const r=o.apply(this, arguments); try{ if(!was && S.goal && S.goal.done===today){ const g=goalCfg(); track("goal_reached", {kind:g.kind, v:g.v}); } }catch(e){} return r; }; }
// jeux solo (Saute-notes, Contre la montre, Mémoire musicale) : appelé à la fin de partie
function trkGame(game, score){ if(!DU.mode) track("game_end", {game, score:score|0, cont:(typeof gmCont==="function"?gmCont():""), diff:(typeof gmDiff==="function"?gmDiff():"")}); }
// Accompagnement : fin de partie (style, pattern, étoiles, tempo atteint, mode, justesse)
{ const o=accFinish; accFinish=function(){ const r=o.apply(this, arguments); try{ const x=ACC.res; if(x && ACC.view==="end"){ const P=ACC_PATS[x.id]||{};
  track("acc_end", {style:P.st||"", pattern:x.id, stars:x.stars|0, tempo:x.bpm|0, target:x.tg|0, mode:x.mode||"", pct:Math.round(((x.s||{}).just||0)*100), full:!!x.full}); } }catch(e){} return r; }; }
// PLAY : ouverture d'un morceau du catalogue (#song=<id>&arr=<version>), pas quand le paywall l'arrête
{ const o=openPlayWith; openPlayWith=function(h){ const r=o.apply(this, arguments); try{ const m=/^#song=([a-z]+)(?=&|$)(?:&arr=(\d))?/.exec(h||""); /* not for a song imported on this device (#song=imp:…): only song_import */
  if(m && playHash===h) track("song_open", {id:m[1], arr:+(m[2]||1)}); }catch(e){} return r; }; }
// badges (Succès, C10) : badgeCheck renvoie les nouveaux badges → un événement par badge ; sans badgeCheck, rien
function trkBadge(id){ if(id!=null) track("badge", {id:String(id)}); }
if(typeof badgeCheck==="function"){ const o=badgeCheck; badgeCheck=function(silent){ const first=!(S.badges && typeof S.badges==="object"); const r=o.apply(this, arguments);
  try{ if(!first && !silent) (Array.isArray(r)?r:[]).forEach(b=>trkBadge(b&&typeof b==="object"?b.id:b)); }catch(e){} return r; }; } // premier passage (anciens badges notés en silence) : rien
// compte : inscription (compte créé il y a moins de 15 min) ou connexion, puis le Premium offert
{ const o=setUser; setUser=async function(u){ const was=user; const r=await o.apply(this, arguments);
  try{ if(u && (!was || was.id!==u.id)){ const fresh=u.created_at && Date.now()-Date.parse(u.created_at)<15*60e3, k="pc-trk-su-"+String(u.id).slice(0,8);
    let seen=false; try{ seen=localStorage.getItem(k)==="1"; localStorage.setItem(k,"1"); }catch(e){}
    if(!seen) track(fresh?"signup":"login", {via:((u.app_metadata||{}).provider||"email")}); trkPremium(); } }catch(e){} return r; }; }

// ---- Réglages › Application : interrupteur et « Signaler un problème » ----
{ const box=$("optAnalytics"); if(box){ box.checked=S.settings.analytics!==false;
  box.addEventListener("change", e=>{ S.settings.analytics=e.target.checked; if(!e.target.checked){ TRK.q=[]; clearTimeout(TRK.t); TRK.t=0; } save(); }); } }
{ const o=renderSettings; renderSettings=function(){ const r=o.apply(this, arguments); const b=$("optAnalytics"); if(b) b.checked=S.settings.analytics!==false; return r; }; }
const FB={kind:"bug", busy:false};
function fbOpen(){ FB.busy=false; $("fbMsg").value=""; $("fbContact").value=""; $("fbMsg").placeholder=t("fbPh"); $("fbContact").placeholder=t("fbContactPh");
  const x=trkCtx(); const i=$("fbInfo"); i.className="fb-info"; i.textContent=t("fbCtx")(x.v+" · "+x.d+" · "+x.s+" · "+x.i); fbKind("bug"); $("fbSend").disabled=false; openMod("fbModal"); setTimeout(()=>$("fbMsg").focus({preventScroll:true}),40); }
function fbKind(v){ FB.kind=v; $("fbKind").querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed", b.dataset.v===v)); }
async function fbSend(){ if(FB.busy) return; const msg=$("fbMsg").value.trim(), info=$("fbInfo");
  if(msg.length<3){ info.className="fb-info err"; info.textContent=t("fbShort"); $("fbMsg").focus(); return; }
  FB.busy=true; $("fbSend").disabled=true; info.className="fb-info"; info.textContent=t("fbSending");
  const x=trkCtx(), ctx={ver:x.v, dev:x.d, plat:x.s, inp:x.i, lang:x.l, page:String(page||""), w:innerWidth, h:innerHeight, midi:((S.midi||{}).hw||{}).name||"", ua:navigator.userAgent.slice(0,160)};
  let ok=false;
  if(!trkNet()) ok=true; // développement : rien n'est envoyé
  else { try{ const r=await trkRpc("send_feedback", {p_anon:trkAnon(), p_kind:FB.kind, p_msg:msg.slice(0,2000), p_contact:$("fbContact").value.trim().slice(0,120)||null, p_ctx:ctx}); ok=r.ok && (await r.json().catch(()=>false))!==false; }catch(e){ ok=false; } }
  FB.busy=false; $("fbSend").disabled=false;
  if(ok){ track("feedback", {kind:FB.kind}); closeMod("fbModal"); toast(t("fbThanks")); } else { info.className="fb-info err"; info.textContent=t("fbFail"); } }
$("fbBtn").addEventListener("click", fbOpen);
$("fbSend").addEventListener("click", fbSend);
$("fbKind").addEventListener("click", e=>{ const b=e.target.closest("button[data-v]"); if(b) fbKind(b.dataset.v); });
document.addEventListener("keydown", e=>{ if(e.code==="Escape" && !$("fbModal").hidden){ e.preventDefault(); e.stopImmediatePropagation(); closeMod("fbModal"); } }, true);

// ---- démarrage ----
rcLoad();
setTimeout(()=>{ trkAnon(); track("app_open", {first:TRK.first, ret:(()=>{ try{ const l=+localStorage.getItem("pc-trk-last")||0; localStorage.setItem("pc-trk-last", String(Date.now())); return l?Math.min(999,Math.floor((Date.now()-l)/864e5)):-1; }catch(e){ return -1; } })(), midi:!!(S.midi&&S.midi.hw)}); }, 1500);
/* ==== fin Mesure ==== */
