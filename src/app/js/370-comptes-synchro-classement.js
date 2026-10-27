// fragment de l'IIFE principale — ordre 370, voir src/app/README.md
// ---------- Accounts, sync and leaderboard (Supabase) ----------
const SUPA_URL="https://ijdxeasxmgevuchyuenn.supabase.co", SUPA_KEY="sb_publishable_6o1XurqA3viU17YsXJQizg_H7HpMtqC";
const SUPA_SRC="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/dist/umd/supabase.js";
let sb=null, user=null, cloudFail=false, pushT=0, loginStep={email:"",sent:false,msg:"",err:false,busy:false};
let lastPushOk=0, lastPushErr=null; // real sync state shown in the profile
let addXpRpc=true; // false once the server says the add_xp function does not exist (migration not applied yet)
function agoText(ts){ const L=S.settings.lang, m=Math.round((Date.now()-ts)/6e4); if(m<1) return L==="fr"?"à l'instant":"just now"; if(m<60) return L==="fr"?"il y a "+m+" min":m+" min ago"; const h=Math.round(m/60); if(h<24) return L==="fr"?"il y a "+h+" h":h+" h ago"; const d=Math.round(h/24); return L==="fr"?"il y a "+d+" j":d+" d ago"; }
function syncText(){ if(lastPushErr) return t("syncErr")(lastPushOk?agoText(lastPushOk):t("agoNever")); if(lastPushOk) return t("syncOk")(agoText(lastPushOk)); return t("synced"); }
const isApp = () => document.documentElement.classList.contains("native");
function loadSupa(){ return new Promise((res,rej)=>{ if(window.supabase&&window.supabase.createClient) return res(window.supabase);
  const sc=document.createElement("script"); sc.src=SUPA_SRC; sc.async=true; sc.onload=()=>res(window.supabase); sc.onerror=rej; document.head.appendChild(sc); }); }
// The Supabase SDK (~170 KB) is loaded on demand: at start only when a session or an auth redirect exists, otherwise when Profile / Leaderboard open (ensureCloud)
let cloudPromise=null;
function hasSession(){ try{ for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i)||""; if(k.startsWith("sb-")&&k.endsWith("-auth-token")) return true; } }catch(e){} return /[?&]code=/.test(location.search) || /access_token=/.test(location.hash); }
function ensureCloud(){ if(!cloudPromise) cloudPromise=initCloud(); return cloudPromise; }
async function initCloud(){
  try{
    const lib=await loadSupa();
    sb=lib.createClient(SUPA_URL,SUPA_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:"pkce"}});
    const {data}=await sb.auth.getSession();
    if(location.search.includes("code=")) history.replaceState(null,"",location.pathname);
    await setUser(data.session ? data.session.user : null);
    sb.auth.onAuthStateChange((ev,session)=>{ const u=session?session.user:null; if((u&&u.id)!==(user&&user.id)) setUser(u); });
  }catch(e){ cloudFail=true; }
  if(page==="account") renderAccount(); if(page==="rank") renderRank();
}
const myNameRaw = () => S.profileName || (user && ((user.user_metadata&&(user.user_metadata.full_name||user.user_metadata.name||[user.user_metadata.given_name,user.user_metadata.family_name].filter(Boolean).join(" "))) || (user.email||"").split("@")[0])) || t("you");
const myName = () => gCut(String(myNameRaw()).replace(BIDI_G,"").replace(/[\u0000-\u001f\u007f]/g,"").trim(),24,24).trim() || t("you");
// the name sent to profiles: 2 to 24 characters, no control or direction characters (check profiles_name_clean)
const myNameDb = () => { const v=myName(); return nameErr(v) ? t("qzPlayer") : v; };
async function setUser(u){
  user=u; renderStatus(); document.body.classList.toggle("guest",!u); document.body.classList.remove("sess-wait");
  if(u && page==="locked" && lockFor) openPage(lockFor);
  if(u){
    if(S.ownerId && S.ownerId!==u.id){
      // another account signs in on this device: its progress must not inherit the previous owner's (settings stay)
      S={...clone(DEFAULTS), settings:S.settings, introSeen:S.introSeen, langV2:true, ownerId:u.id, gate:S.gate, onb:S.onb, tourDone:S.tourDone};
      try{ localStorage.setItem(STORE, JSON.stringify(S)); }catch(e){}
      renderStatus(); render(); renderDaily();
    }
    try{ await cloudPull(); }catch(e){}
    try{ ntfCloud(); }catch(e){}
    if(S.gate!=="account"){ S.gate="account"; save(); } if($("gate") && !$("gate").hidden){ gateClose(); startFlow(); }
    if(S.ownerId!==u.id){ S.ownerId=u.id; save(); } // a guest who signs in keeps everything, and the device is now tied to this account
  }
  if(page==="account") renderAccount(); if(page==="rank") renderRank();
}
// field-by-field merge of this device's state with the account's: nothing is ever lost, the settings stay local
function mergeState(local, cloud){
  const isObj=x=>x&&typeof x==="object"&&!Array.isArray(x), num=x=>Number.isFinite(+x)?+x:0;
  const m=clone(local), c=isObj(cloud)?cloud:{};
  const maxMap=(a,b)=>{ const o={...(isObj(a)?a:{})}; Object.entries(isObj(b)?b:{}).forEach(([k,v])=>{ if(Number.isFinite(+v)) o[k]=Math.max(num(o[k]),num(v)); }); return o; };
  m.xp=Math.max(num(local.xp),num(c.xp));
  m.xpDays=maxMap(local.xpDays,c.xpDays); m.xpPushed=maxMap(local.xpPushed,c.xpPushed);
  { const since=addDays(-7); Object.keys(m.xpPushed).forEach(d=>{ if(d<since) delete m.xpPushed[d]; }); } // same window as cloudPushRaw, which prunes older days: otherwise the cloud brought them back on every pull (changed forever)
  m.mastery=maxMap(local.mastery,c.mastery);
  m.stats=maxMap(local.stats,c.stats);
  m.secStats={...(isObj(local.secStats)?local.secStats:{})}; Object.entries(isObj(c.secStats)?c.secStats:{}).forEach(([sec,v])=>{ m.secStats[sec]=maxMap(m.secStats[sec],v); });
  m.srs={...(isObj(local.srs)?local.srs:{})}; Object.entries(isObj(c.srs)?c.srs:{}).forEach(([k,e])=>{ const l=m.srs[k]; if(!l || (isObj(e) && String(e.due||"")>String(l.due||""))) m.srs[k]=e; });
  const ls=isObj(local.streak)?local.streak:{days:0,last:""}, cs=isObj(c.streak)?c.streak:{days:0,last:""};
  m.streak = String(cs.last||"")>String(ls.last||"") ? {...cs} : String(cs.last||"")<String(ls.last||"") ? {...ls} : {days:Math.max(num(ls.days),num(cs.days)), last:ls.last||""};
  m.elo={...(isObj(local.elo)?local.elo:{})}; Object.entries(isObj(c.elo)?c.elo:{}).forEach(([k,e])=>{ if(isObj(e) && Number.isFinite(+e.r) && num(e.n)>num((m.elo[k]||{}).n)) m.elo[k]=e; }); if(!Object.keys(m.elo).length) delete m.elo; // ratings: the device with more games wins
  if(isObj(c.notifs) && Array.isArray(c.notifs.list)){ const L=isObj(local.notifs)&&Array.isArray(local.notifs.list)?local.notifs.list:[], byId=new Map(L.map(n=>[n.id,{...n}]));
    c.notifs.list.forEach(n=>{ if(!isObj(n)||!n.id) return; const o=byId.get(n.id); if(o) o.read=o.read||!!n.read; else byId.set(n.id,n); });
    m.notifs={...(isObj(local.notifs)?local.notifs:{}), list:[...byId.values()].sort((a,b)=>num(b.t)-num(a.t)).slice(0,60), keys:{...(c.notifs.keys||{}), ...((isObj(local.notifs)&&local.notifs.keys)||{})}}; }
  m.gameBest=maxMap(local.gameBest,c.gameBest); m.runnerBest=Math.max(num(local.runnerBest),num(c.runnerBest));
  const newer=(a,b)=>{ if(!isObj(b)) return a; if(!isObj(a)) return b; return String(b.date||"")>String(a.date||"") ? b : a; };
  m.daily=newer(local.daily,c.daily); m.dailyPlan=newer(local.dailyPlan,c.dailyPlan); m.dailyRun=newer(local.dailyRun,c.dailyRun);
  if(m.daily==null) delete m.daily; if(m.dailyPlan==null) delete m.dailyPlan; if(m.dailyRun==null) delete m.dailyRun;
  m.seenTypes=[...new Set([...(Array.isArray(local.seenTypes)?local.seenTypes:[]), ...(Array.isArray(c.seenTypes)?c.seenTypes:[])])];
  m.introSeen={...(isObj(c.introSeen)?c.introSeen:{}), ...(isObj(local.introSeen)?local.introSeen:{})};
  if(!(isObj(m.onb)&&m.onb.done) && isObj(c.onb)) m.onb=c.onb; if(!m.tourDone && c.tourDone) m.tourDone=c.tourDone; if(m.eloStart==null && c.eloStart!=null) m.eloStart=c.eloStart;
  m.profileName=c.profileName||local.profileName; if(!m.profileName) delete m.profileName;
  { const lg=isObj(local.goal)?local.goal:null, cg=isObj(c.goal)?c.goal:null; if(lg||cg){ const g={...((cg&&num(cg.at)>num(lg&&lg.at))?cg:(lg||cg))}; g.done=[lg&&lg.done,cg&&cg.done].map(x=>String(x||"")).sort().pop()||undefined; if(!g.done) delete g.done; if((lg&&lg.asked)||(cg&&cg.asked)) g.asked=1; m.goal=g; } } // Objectif
  { const lf=isObj(local.freeze)?local.freeze:null, cf=isObj(c.freeze)?c.freeze:null; if(lf||cf){ const f={...((cf&&num(cf.at)>num(lf&&lf.at))?cf:(lf||cf))}; f.used=[...new Set([...((lf&&Array.isArray(lf.used))?lf.used:[]),...((cf&&Array.isArray(cf.used))?cf.used:[])])].filter(x=>typeof x==="string").sort().slice(-40); f.n=Math.max(0,Math.min(2,num(f.n))); m.freeze=f; } }
  m.settings={...(isObj(local.settings)?local.settings:{})}; // this device's settings win
  return {merged:m, changed:JSON.stringify(m)!==JSON.stringify(local)};
}
// Revue UI 25/10 (synchro) : « changé » = une vraie différence de contenu, sans tenir compte de l'ordre des clés, des valeurs undefined
// ni des objets / tableaux vides ajoutés par les fusions (pp.fail, route.st, lbl.gone…). Sinon un aller-retour avec le serveur
// signalait encore des clés modifiées et la page se rechargeait.
function syncCanon(x){ if(Array.isArray(x)) return x.map(v=>v===undefined?null:syncCanon(v));
  if(x&&typeof x==="object"){ const o={}; Object.keys(x).sort().forEach(k=>{ const v=syncCanon(x[k]); if(v===undefined) return; if(v&&typeof v==="object"&&!Object.keys(v).length) return; o[k]=v; }); return o; }
  return typeof x==="function"?undefined:x; }
const syncSame=(a,b)=>JSON.stringify(syncCanon(a))===JSON.stringify(syncCanon(b));
let lastPull=0;
async function cloudPull(){
  if(!sb||!user) return;
  lastPull=Date.now();
  const {data,error}=await sb.from("progress").select("data").eq("user_id",user.id).maybeSingle();
  if(error) throw error;
  const cloud=data&&data.data;
  if(cloud){
    const {merged,changed}=mergeState(S,cloud);
    if(changed){
      const local0=S; S=merged; let stored=false;
      try{ localStorage.setItem(STORE, JSON.stringify(S)); stored=true; }catch(e){}
      try{ await cloudPushNow(); }catch(e){}
      // reload only when the merged state could be written (#36) and no exercise is running; otherwise apply in memory
      // ... nor any other activity (song, Play game, quiz, duel, Accompaniment, which keeps its own state outside phase/game)
      let busy=false; try{ busy = !!actNow() || (lvBase()==="acc" && ACC.view!=="setup"); }catch(e){}
      // at most one reload every 5 min per tab: a field that differs on every pull (e.g. a key kept only on this device) must never loop
      let canReload=false; try{ const last=+sessionStorage.getItem("pc-pull-reload")||0; if(Date.now()-last>5*60e3){ sessionStorage.setItem("pc-pull-reload",String(Date.now())); canReload=true; } }catch(e){}
      if(!canReload){ try{ const ks=Object.keys(merged).filter(k=>!syncSame(merged[k],local0[k])); console.info("[sync] fusion appliquée sans rechargement ; clés différentes du serveur :", ks.slice(0,12)); }catch(e){} }
      if(canReload && stored && phase==="idle" && !game && !busy && !startUI()){ location.reload(); return; }
      renderSettings(); render(); renderDaily(); if(page==="account") renderAccount(); try{ ntfBadge(); }catch(e){}
      return;
    }
  }
  await cloudPushNow();
}
// pull again when the app comes back to the foreground (another device may have played), at most once a minute
document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="visible" && sb && user && Date.now()-lastPull>60000) cloudPull().catch(()=>{}); });
function cloudPush(){ if(!sb||!user) return; clearTimeout(pushT); pushT=setTimeout(()=>cloudPushNow().catch(()=>{}),3000); }
async function cloudPushNow(){
  if(!sb||!user) return;
  try{ await cloudPushRaw(); lastPushOk=Date.now(); lastPushErr=null; }
  catch(e){ lastPushErr=e; throw e; }
  finally{ if(page==="account" && user) $("accountPanel").querySelector(".pane-head p").textContent=syncText(); }
}
async function cloudPushRaw(){
  const li=levelInfo(S.xp), solved=Object.values(S.secStats||{}).reduce((a,x)=>a+(x.ok||0),0), now=new Date().toISOString();
  const r1=await sb.from("progress").upsert({user_id:user.id, data:S, updated_at:now});
  const r2=await sb.from("profiles").upsert({id:user.id, name:myNameDb(), avatar:charIndex(li.L), photo:userPhoto()||null, xp:S.xp, level:li.L, streak:effStreak(), solved, updated_at:now});
  if(r1.error||r2.error) throw (r1.error||r2.error);
  // XP earned per day (last 7 days) feeds the day / week / month / year leaderboards
  const since=addDays(-7), today=dayStr();
  const days=Object.entries(S.xpDays||{}).filter(([d])=>d>=since);
  if(addXpRpc){
    // server-side credit (add_xp, see supabase/schema.sql): only the XP earned since the last push is sent, the server caps it per day
    const pushed={...(S.xpPushed||{})}; Object.keys(pushed).forEach(d=>{ if(d<since) delete pushed[d]; });
    const todo=days.filter(([d,xp])=>+xp>(pushed[d]||0) || d===today); if(!todo.some(([d])=>d===today)) todo.push([today,S.xpDays&&S.xpDays[today]||0]);
    let ok=true;
    for(const [day,xp] of todo){
      const delta=Math.max(0,Math.min(3000,Math.round(+xp||0)-(pushed[day]||0)));
      const r=await sb.rpc("add_xp",{delta, day, streak:effStreak(), solved});
      if(r.error){ if(r.error.code==="PGRST202" || /could not find the function|does not exist|schema cache/i.test(r.error.message||"")){ addXpRpc=false; ok=false; break; } throw r.error; }
      pushed[day]=Math.max(pushed[day]||0, Math.round(+xp||0));
    }
    if(ok){ S.xpPushed=pushed; try{ localStorage.setItem(STORE, JSON.stringify(S)); }catch(e){} return; }
  }
  // fallback while the migration is not applied: write the day totals directly
  if(days.length){ const r3=await sb.from("xp_log").upsert(days.map(([day,xp])=>({user_id:user.id, day, xp}))); if(r3.error) throw r3.error; }
}
function authMsg(err){ const m=(err&&err.message||"").toLowerCase();
  if(err instanceof TypeError || (err&&err.name==="TypeError") || m.includes("fetch") || m.includes("network") || m.includes("load failed")) return t("cloudErr"); // offline / server unreachable
  if(m.includes("sending")||m.includes("smtp")) return t("mailFail"); return m.includes("rate")||m.includes("too many") ? t("tooMany") : m.includes("token")||m.includes("otp")||m.includes("expired")||m.includes("invalid") ? t("badCode") : (err&&err.message)||t("cloudErr"); }
function renderLock(){
  $("lockTitle").textContent=t("lockTitle")(lockFor);
  const ul=$("lockList"); ul.innerHTML=""; t("perks").forEach(x=>{ const li=document.createElement("li"); li.textContent=x; ul.appendChild(li); });
}
$("lockGo").addEventListener("click",()=>authOpen("signup"));
$("lockGuest").addEventListener("click",()=>{ guestPass=true; document.body.classList.remove("guest"); openPage(lockFor||"games"); });
function renderWelcome(){ const ul=$("wcList"); ul.innerHTML=""; t("perks").forEach(x=>{ const li=document.createElement("li"); li.textContent=x; ul.appendChild(li); }); }
$("wcSignup").addEventListener("click",()=>{ closeMod("welcomeModal"); authOpen("signup"); });
function renderRankPer(){ const box=$("rankPer"), P=t("periods"), cur=S.settings.rankPer||"week"; box.innerHTML="";
  Object.keys(P).forEach(k=>{ const b=document.createElement("button"); b.type="button"; b.textContent=P[k]; b.setAttribute("aria-pressed",k===cur); b.onclick=()=>{ S.settings.rankPer=k; save(); renderRank(); }; box.appendChild(b); }); }
let rankTok=0;
async function renderRank(){ const tok=++rankTok;
  renderRankPer(); if(!cloudPromise){ ensureCloud(); } // first opening: load the SDK, initCloud re-renders when ready
  const li=levelInfo(S.xp), ol=$("rankList"); ol.innerHTML="";
  const row=(r,rk,me)=>{ const el=document.createElement("li"); if(me) el.className="me";
    const okPhoto = r.photo && /^https:\/\//.test(r.photo);
    el.innerHTML='<span class="rk"></span><span class="av"></span><span><b></b><small></small></span><span class="num"></span><span class="num"></span>'; avFill(el.querySelector(".av"),okPhoto?r.photo:"",r.avatar);
    el.querySelector(".rk").textContent=typeof rk==="number"?fmtN(rk):rk; nmPut(el.querySelector("b"),r.name); const sm=el.querySelector("small"); sm.textContent=t("acctLevel")+" "+fmtN(r.level)+" · "+t("chars")[Math.max(0,Math.min(9,r.avatar|0))][2]; sm.title=sm.textContent;
    const n=el.querySelectorAll(".num"); n[0].textContent=fmtN(r.xp)+" XP"; n[1].textContent="🔥 "+fmtN(r.streak)+" "+t("day"); return el; };
  const cta=document.querySelector(".rank-cta"); cta.hidden=!!user;
  $("rankPanel").querySelector(".pane-head p").textContent = user ? t("rankSubIn") : t("rankSub");
  const per=S.settings.rankPer||"week", now=new Date();
  const since = per==="day" ? dayStr() : per==="week" ? addDays(-((now.getDay()+6)%7)) : per==="month" ? dayStr().slice(0,8)+"01" : per==="year" ? dayStr().slice(0,5)+"01-01" : null;
  const myXP = since ? Object.entries(S.xpDays||{}).reduce((a,[d,x])=>d>=since?a+x:a,0) : S.xp;
  if(!sb){ ol.appendChild(row({name:t("you"),avatar:charIndex(li.L),level:li.L,xp:myXP,streak:S.streak.days},"—",true)); if(cloudFail){ const p=document.createElement("p"); p.className="rank-msg"; p.textContent=t("rankErr"); ol.prepend(p); } return; }
  const wait=document.createElement("p"); wait.className="rank-msg"; wait.textContent=t("rankLoading"); ol.appendChild(wait);
  if(user){ try{ await Promise.race([cloudPushNow(), new Promise(r=>setTimeout(r,4000))]); }catch(e){} }
  const q = since ? sb.rpc("leaderboard",{since}) : sb.from("profiles").select("id,name,avatar,photo,xp,level,streak").order("xp",{ascending:false}).limit(50);
  const {data,error}=await Promise.race([q, new Promise(r=>setTimeout(()=>r({data:null,error:{message:"timeout"}}),10000))]);
  if(page!=="rank") return;
  ol.innerHTML="";
  if(error){ const p=document.createElement("p"); p.className="rank-msg"; p.textContent=t("rankErr"); ol.appendChild(p); }
  const list=(data||[]).slice(0,50); list.forEach((r,i)=>ol.appendChild(row(r,i+1,user&&r.id===user.id)));
  if(!list.length && !error){ const p=document.createElement("p"); p.className="rank-msg"; p.textContent=since?t("rankEmptyP"):t("rankEmpty"); ol.appendChild(p); }
  if(!user) ol.appendChild(row({name:t("you"),avatar:charIndex(li.L),level:li.L,xp:myXP,streak:S.streak.days},"—",true));
  else if(!error && list.length && !list.some(r=>r.id===user.id)){ // outside the top 50: "…" then "1 284th · You"
    const m=await myRank(since); if(!m || page!=="rank" || tok!==rankTok) return;
    const sep=document.createElement("li"); sep.className="sep"; sep.setAttribute("aria-hidden","true"); sep.textContent="…"; ol.appendChild(sep);
    const me=row({name:t("you"),avatar:charIndex(li.L),photo:userPhoto(),level:li.L,xp:m.xp,streak:effStreak()},"",true); me.classList.add("out");
    me.querySelector("b").textContent=t("rankOrd")(m.rank)+" · "+t("you"); me.querySelector("b").title=me.querySelector("b").textContent; ol.appendChild(me); }
}
async function oauthLogin(provider){
  try{
    if(isApp()){
      const {data,error}=await sb.auth.signInWithOAuth({provider, options:{redirectTo:"pianochallenges://auth", skipBrowserRedirect:true}});
      if(error) throw error;
      const r=await window.Capacitor.nativePromise("Auth","start",{url:data.url, scheme:"pianochallenges"});
      const back=new URL(r.url.replace("pianochallenges://","https://x/")), code=back.searchParams.get("code");
      if(!code) throw new Error(back.searchParams.get("error_description")||"cancelled");
      const ex=await sb.auth.exchangeCodeForSession(code); if(ex.error) throw ex.error;
    } else {
      const {data,error}=await sb.auth.signInWithOAuth({provider, options:{redirectTo:location.origin+location.pathname, skipBrowserRedirect:true}}); if(error) throw error;
      // make sure the auth server answers before leaving the page (otherwise the user lands on a browser error page)
      const ac=new AbortController(), to=setTimeout(()=>ac.abort(),4000);
      try{ const h=await fetch(SUPA_URL+"/auth/v1/health",{signal:ac.signal, headers:{apikey:SUPA_KEY}}); if(!h.ok) throw 0; }
      catch(e){ throw new TypeError("network"); } finally{ clearTimeout(to); }
      location.assign(data.url);
    }
  }catch(err){ const m=String(err&&err.message||err); if(/cancel/i.test(m)) return; loginStep.msg=authMsg(err); loginStep.err=true; renderAccount(); }
}
function renderAccount(){
  if(!cloudPromise){ ensureCloud(); }
  const li=levelInfo(S.xp), ci=charIndex(li.L), c=t("chars")[ci];
  const solved=Object.values(S.secStats||{}).reduce((a,x)=>a+(x.ok||0),0);
  const ph=userPhoto();
  const box=$("acctMe"); box.innerHTML='<div class="acct-top"><span class="av"></span><div><b><span class="nm"></span><span class="lvl-chip"></span></b><small></small></div></div><div class="acct-stats"></div>';
  avFill(box.querySelector(".acct-top .av"),ph,ci); box.querySelector(".nm").textContent = user ? myName() : c[0]+" "+c[1]; box.querySelector(".lvl-chip").textContent=t("acctLevel")+" "+li.L;
  box.querySelector("small").textContent=c[2];
  const st=box.querySelector(".acct-stats");
  [[t("acctXp"),fmtN(S.xp)],[t("acctStreak"),fmtN(S.streak.days)+" "+t("day")],[t("acctDone"),fmtN(solved)],[t("acctLevel"),fmtN(li.L)]].forEach(([k,v])=>{ const d=document.createElement("div"); d.className="end-stat"; d.innerHTML="<span></span><b></b>"; d.querySelector("span").textContent=k; d.querySelector("b").textContent=v; st.appendChild(d); });
  $("accountPanel").querySelector(".pane-head p").textContent = user ? syncText() : t("acctSub");
  const L=$("acctLogin"); L.innerHTML="";
  const h=(tag,txt,cls)=>{ const e=document.createElement(tag); if(txt!=null) e.textContent=txt; if(cls) e.className=cls; L.appendChild(e); return e; };
  if(user){
    h("h3",t("secAccount")); h("p",t("signedAs")(user.email||myName()));
    const f=document.createElement("form"); L.appendChild(f);
    const lb=document.createElement("label"); lb.className="pk-lbl"; lb.textContent=t("nameLbl"); f.appendChild(lb);
    const row=document.createElement("div"); row.className="acct-row"; f.appendChild(row);
    const inp=document.createElement("input"); inp.type="text"; inp.maxLength=24; inp.value=myName(); inp.setAttribute("autocorrect","off"); inp.spellcheck=false; inp.enterKeyHint="done"; row.appendChild(inp);
    const sv=document.createElement("button"); sv.className="btn primary"; sv.type="submit"; sv.textContent=t("saveLbl"); row.appendChild(sv);
    const m=h("p","", "msg");
    f.onsubmit=async e=>{ e.preventDefault(); const v=inp.value.trim(), er=nameErr(v)||(gLen(v)>24||Array.from(v).length>24?"pseudoLong":""); if(er){ m.className="msg err"; m.textContent=t(er); inp.focus(); return; } S.profileName=v; save(); renderStatus(); try{ await cloudPushNow(); m.className="msg ok"; m.textContent=t("saved"); box.querySelector(".nm").textContent=v; }catch(err){ m.className="msg err"; m.textContent=t("cloudErr"); } };
    const lo=h("button",t("logout"),"btn"); lo.type="button"; lo.onclick=async()=>{ try{ await sb.auth.signOut(); }catch(e){} toast(t("signedOut")); };
    return;
  }
  h("h3",t("loginTitle")); const pk=h("ul",null,"wc-list small"); t("perks").forEach(x=>{ const li=document.createElement("li"); li.textContent=x; pk.appendChild(li); });
  h("p", sb ? t("loginReady") : cloudFail ? t("cloudErr") : t("rankLoading"));
  if(!sb) return;
  const f=document.createElement("form"); L.appendChild(f);
  if(!loginStep.sent){
    const em=document.createElement("input"); em.type="email"; em.required=true; em.autocomplete="email"; em.placeholder=t("emailPh"); em.value=loginStep.email; f.appendChild(em);
    const b=document.createElement("button"); b.className="btn primary"; b.type="submit"; b.textContent=t("sendCode"); b.disabled=loginStep.busy; f.appendChild(b);
    f.onsubmit=async e=>{ e.preventDefault(); loginStep.email=em.value.trim(); loginStep.busy=true; renderAccount();
      const {error}=await sb.auth.signInWithOtp({email:loginStep.email, options:{shouldCreateUser:true, emailRedirectTo: isApp()?undefined:location.origin+location.pathname}});
      loginStep.busy=false; if(error){ loginStep.msg=authMsg(error); loginStep.err=true; } else { loginStep.sent=true; loginStep.msg=t("codeSent")(loginStep.email); loginStep.err=false; } renderAccount(); };
  } else {
    const cd=document.createElement("input"); cd.inputMode="numeric"; cd.autocomplete="one-time-code"; cd.className="code-in"; cd.placeholder=t("codePh"); cd.maxLength=10; f.appendChild(cd);
    const b=document.createElement("button"); b.className="btn primary"; b.type="submit"; b.textContent=t("verify"); b.disabled=loginStep.busy; f.appendChild(b);
    const ch=document.createElement("button"); ch.className="linkbtn"; ch.type="button"; ch.textContent=t("changeMail"); f.appendChild(ch);
    ch.onclick=()=>{ loginStep={email:loginStep.email,sent:false,msg:"",err:false,busy:false}; renderAccount(); };
    f.onsubmit=async e=>{ e.preventDefault(); const token=cd.value.replace(/\D/g,""); if(!token) return; loginStep.busy=true; renderAccount();
      const {error}=await sb.auth.verifyOtp({email:loginStep.email, token, type:"email"});
      loginStep.busy=false; if(error){ loginStep.msg=authMsg(error); loginStep.err=true; renderAccount(); } else { loginStep={email:"",sent:false,msg:"",err:false,busy:false}; } };
    setTimeout(()=>cd.focus(),50);
  }
  if(loginStep.msg){ const m=h("p",loginStep.msg,"msg"+(loginStep.err?" err":" ok")); f.appendChild(m); }
  h("div",t("orLbl"),"or");
  const lb=h("div",null,"login-btns");
  const prov=(label,fn,soon)=>{ const b=document.createElement("button"); b.type="button"; b.innerHTML="<span></span><small></small>"; b.querySelector("span").textContent=label; if(soon){ b.disabled=true; b.querySelector("small").textContent=soon; } else { b.querySelector("small").remove(); b.onclick=fn; } lb.appendChild(b); };
  prov(t("loginWith")("Google"), ()=>oauthLogin("google"), null);
  prov(t("loginWith")("Apple"), null, t("soon"));
  prov(t("loginWith")("Facebook"), null, t("soon"));
  const cs=h("p","", "msg"); cs.innerHTML='<a href="/confidentialite.html"></a>'; cs.querySelector("a").textContent=t("consent");
}
