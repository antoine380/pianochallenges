// fragment de l'IIFE principale — ordre 100, voir src/app/README.md
// ---------- Persistence ----------
const STORE="memo-gammes-v1";
const clone = o => JSON.parse(JSON.stringify(o)); // works on every iOS version
let firstVisit=false;
// First visit: French browsers start in French (and French note names), everyone else in English
const DEFAULT_LANG=((navigator.language||"en")+"").toLowerCase().startsWith("fr")?"fr":"en";
const DEFAULTS={xp:0, mastery:{}, stats:{ok:0,perfect:0,revealed:0,errors:0}, streak:{days:0,last:""}, suiteIdx:0, csuiteIdx:0,
  seenTypes:["major","minor","chords:maj","chords:min"], langV2:true, secStats:{}, srs:{}, daily:{}, section:"chords",
  settings:{lang:DEFAULT_LANG, mode:"suite", delay:0, notation:DEFAULT_LANG, dir:"up", octave:true, labels:false, midiSound:true, midiC:true, midiInput:"", autoNext:true, kbdSize:"auto", kbdLow:36, kbdHigh:96, unlockAll:false,
    types:["major"], view:"major", ctypes:["maj"], cview:"maj", invs:[0],
    htypes:["maj"], hview:"maj", hdegs:[0,1,2,3,4,5,6], ptypes:["p145","pop"], pview:"pop", vl:false, etypes:["chord","int"], eview:"chord", earV2:true, scMode:"notes", sc7:false, gameLen:10}};
const SECS=["scales","chords","harmony","prog","ear"];
function load(){
  let raw=null;
  try{ raw=localStorage.getItem(STORE); if(raw){ let d=JSON.parse(raw);
    if(!d || typeof d!=="object" || Array.isArray(d)) throw new Error("bad state");
    // defensive normalisation: a field of the wrong type falls back to its default instead of crashing the app
    const isObj=x=>x && typeof x==="object" && !Array.isArray(x), num=(x,dflt)=>{ const v=typeof x==="string"?parseFloat(x):x; return Number.isFinite(v)?v:dflt; };
    const s={...clone(DEFAULTS), ...d, stats:{...DEFAULTS.stats,...(isObj(d.stats)?d.stats:{})}, settings:{...DEFAULTS.settings,...(isObj(d.settings)?d.settings:{})}, mastery:{}};
    ["streak","stats","secStats","srs","daily","xpDays","xpPushed"].forEach(k=>{ if(!isObj(s[k])) s[k]=clone(DEFAULTS[k]||{}); });
    s.streak={days:num(s.streak.days,0), last:typeof s.streak.last==="string"?s.streak.last:""};
    if("introSeen" in s && !isObj(s.introSeen)) s.introSeen={}; ["su","quiz","acc","ntf"].forEach(k=>{ if(k in s.settings && !isObj(s.settings[k])) delete s.settings[k]; }); if(!["fr","en"].includes(s.settings.lang)) s.settings.lang=DEFAULTS.settings.lang; if(!["fr","en"].includes(s.settings.notation)) s.settings.notation=s.settings.lang; if("input" in s.settings && !["midi","mic","screen"].includes(s.settings.input)) delete s.settings.input; // t() and renderInputUI index tables with them // objects written into later (showIntro, suState, qzCfg…)
    if(!isObj(s.dailyPlan)) delete s.dailyPlan; if(!isObj(s.dailyRun)) delete s.dailyRun;
    s.xp=Math.max(0,num(s.xp,0)); Object.keys(s.xpDays).forEach(k=>{ s.xpDays[k]=num(s.xpDays[k],0); });
    Object.keys(s.stats).forEach(k=>{ s.stats[k]=num(s.stats[k],0); });
    Object.keys(s.secStats).forEach(k=>{ if(!isObj(s.secStats[k])) delete s.secStats[k]; });
    Object.keys(s.srs).forEach(k=>{ const e=s.srs[k]; if(!isObj(e)||!isObj(e.it)||typeof e.due!=="string") delete s.srs[k]; });
    if(!Array.isArray(s.seenTypes)) s.seenTypes=clone(DEFAULTS.seenTypes); s.seenTypes=s.seenTypes.filter(x=>typeof x==="string");
    ["types","ctypes","htypes","ptypes","etypes","invs","hdegs"].forEach(k=>{ if(!Array.isArray(s.settings[k])) s.settings[k]=clone(DEFAULTS.settings[k]); });
    s.settings.delay=num(s.settings.delay,0);
    Object.entries(isObj(d.mastery)?d.mastery:{}).forEach(([k,v])=>{ const n=num(v,NaN); if(Number.isFinite(n)) s.mastery[k.includes(":")?k:"major:"+k]=n; });
    s.settings.types=(s.settings.types||["major"]).filter(id=>TYPE[id]); if(!s.settings.types.length) s.settings.types=["major"];
    s.settings.ctypes=(s.settings.ctypes||["maj"]).filter(id=>CTYPE[id]); if(!s.settings.ctypes.length) s.settings.ctypes=["maj"];
    s.settings.invs=(s.settings.invs||[0]).filter(i=>i>=0&&i<=3); if(!s.settings.invs.length) s.settings.invs=[0];
    if(!TYPE[s.settings.view]) s.settings.view="major";
    if(!CTYPE[s.settings.cview]) s.settings.cview="maj";
    if(!SECS.includes(s.section)) s.section="scales";
    s.settings.htypes=s.settings.htypes.filter(id=>HTYPE[id]); if(!s.settings.htypes.length) s.settings.htypes=["maj"];
    s.settings.ptypes=s.settings.ptypes.filter(id=>PROG[id]); if(!s.settings.ptypes.length) s.settings.ptypes=["pop"];
    s.settings.etypes=s.settings.etypes.filter(id=>EARCAT[id]); if(!s.settings.etypes.length) s.settings.etypes=["int"];
    if(!HTYPE[s.settings.hview]) s.settings.hview="maj"; if(!PROG[s.settings.pview]) s.settings.pview="pop"; if(!EARCAT[s.settings.eview]) s.settings.eview="int";
    s.settings.hdegs=(s.settings.hdegs||[]).filter(d=>d>=0&&d<7); if(!s.settings.hdegs.length) s.settings.hdegs=[0,1,2,3,4,5,6];
    s.seenTypes=s.seenTypes.map(x=>x.startsWith("ch:")?"chords:"+x.slice(3):x);
    if(!d.secStats){ s.secStats={scales:{...DEFAULTS.stats,...(d.stats||{})}}; }
    if(!s.settings.earV2){ s.settings.eview="chord"; s.settings.etypes=EARCATS.map(c=>c.id).filter(id=>s.settings.etypes.includes(id)); s.settings.earV2=true; }
    if(!s.settings.diffV2){ s.settings.delay=0; s.settings.diffV2=true; }
    if(!s.settings.midiV2){ s.settings.midiSound=true; s.settings.midiV2=true; }
    if(!s.langV2){ s.settings.lang="en"; s.settings.notation="en"; s.langV2=true; }
    if(d.gate===undefined && !d.onb) s.onb={done:1, legacy:1}; // played before the start screens existed: no questionnaire (their settings stay), the sign-in screen and the tour once
    return s; } }catch(e){ try{ if(raw) localStorage.setItem(STORE+".bak", raw); }catch(e2){} } // keep an unreadable state aside before it gets overwritten
  firstVisit=true;
  return clone(DEFAULTS);
}
function save(){ try{ localStorage.setItem(STORE, JSON.stringify(S)); }catch(e){ if(!save.warned && e && (e.name==="QuotaExceededError"||e.code===22)){ save.warned=true; setTimeout(()=>{ try{ toast(t("saveFull")); }catch(x){} },0); } } try{ cloudPush(); }catch(e){} } // cloudPush can run before « let sb » at boot (S.duPend): never abort the script
let S=load();
// day / night: S.settings.theme = "light" | "dark", absent = follow the system
const darkMQ=matchMedia("(prefers-color-scheme: dark)");
const isDark=()=>{ const th=document.documentElement.getAttribute("data-theme"); return th ? th==="dark" : darkMQ.matches; };
function applyTheme(){ const th=S.settings&&S.settings.theme; if(th==="light"||th==="dark") document.documentElement.setAttribute("data-theme",th); else document.documentElement.removeAttribute("data-theme");
  const b=document.getElementById("themeBtn"); if(b){ const d=isDark(); b.classList.toggle("light",!d); const l=typeof t==="function"?t(d?"themeDay":"themeNight"):""; b.setAttribute("aria-label",l); b.title=l; const lb=document.getElementById("themeLbl"); if(lb) lb.textContent=typeof t==="function"?t(d?"themeDayS":"themeNightS"):""; }
  // browser bar / status bar colour follows the app's theme, not only the system's (two metas, one per scheme: a forced theme sets both)
  document.querySelectorAll('meta[name="theme-color"]').forEach(m=>{ if(!m.dataset.sys) m.dataset.sys=m.content; m.content = th==="light" ? "#f1f2fb" : th==="dark" ? "#15122e" : m.dataset.sys; }); }
applyTheme();
document.getElementById("themeBtn").addEventListener("click",()=>{ S.settings.theme=isDark()?"light":"dark"; save(); applyTheme(); });
darkMQ.addEventListener&&darkMQ.addEventListener("change",applyTheme);
const isCh = () => S.section==="chords";
const SUF = {chords:"C", harmony:"H", prog:"P", ear:"E"};
const tx = k => { const scc=S.section==="scales" && (cur&&cur.sec==="scales" ? !!cur.ch : S.settings.scMode==="chords"); if(scc && k==="replay") return t("replaySC"); if(scc && (k==="correct"||k==="missed")) return t(k+"P"); if(scc && k==="idleSub") return t("idleSubSC"); const sf=SUF[S.section]; const d=TXT[S.settings.lang]; return (sf && d[k+sf]!==undefined) ? d[k+sf] : t(k); };
const chordLike = sec => sec==="chords" || sec==="harmony";
// per-section configuration
const SEC = {
  scales: {list:()=>TYPES,   sel:"types",  view:"view",  def:"major", name:ty=>S.settings.lang==="fr"?ty.frP:ty.enP},
  chords: {list:()=>CTYPES,  sel:"ctypes", view:"cview", def:"maj",   name:ty=>S.settings.lang==="fr"?ty.fr:ty.en},
  harmony:{list:()=>HTYPES,  sel:"htypes", view:"hview", def:"maj",   name:ty=>S.settings.lang==="fr"?ty.fr:ty.en},
  prog:   {list:()=>PROGS,   sel:"ptypes", view:"pview", def:"pop",   name:ty=>progName(ty.id)+(ty.scale==="minor"?(S.settings.lang==="fr"?" (Mineur)":" (Minor)"):"")},
  ear:    {list:()=>EARCATS, sel:"etypes", view:"eview", def:"int",   name:ty=>S.settings.lang==="fr"?ty.fr:ty.en}
};
// an "item" is {sec, tid, k, inv?, deg?, root?}
function mkey(it){
  switch(it.sec){
    case "chords": return "ch:"+it.tid+":"+it.k+":"+it.inv;
    case "harmony": return "h:"+it.tid+":"+it.k+":"+it.deg;
    case "prog": return "p:"+it.tid+":"+it.k+(S.settings.vl?":vl":"");
    case "ear": return "e:"+it.tid+":"+it.k;
    default: return (it.ch ? "sc:"+it.tid+":"+it.k+(S.settings.sc7?":7":"") : it.tid+":"+it.k);
  }
}
const mastI = it => S.mastery[mkey(it)]||0;
function secStats(){ S.secStats=S.secStats||{}; return S.secStats[S.section] || (S.secStats[S.section]={ok:0,perfect:0,revealed:0,errors:0}); }
function rootsOf(sec,tid){
  if(sec==="chords") return CROOTS[tid];
  if(sec==="harmony") return TONICS[HTYPE[tid].scale];
  if(sec==="prog") return TONICS[PROG[tid].scale];
  if(sec==="ear") return earAnswers(tid).map(a=>a.id);
  return TONICS[tid];
}
const typeDef = (sec,tid) => SEC[sec].list().find(x=>x.id===tid);
const typeList = sec => SEC[sec].list();
function tileMast(sec,tid,k){
  if(sec==="chords") return Math.max(...[0,1,2,3].map(inv=>mastI({sec,tid,k,inv})));
  if(sec==="harmony"){ let sum=0; for(let d=0;d<7;d++) sum+=mastI({sec,tid,k,deg:d}); return Math.min(5,Math.floor(sum/4)); }
  if(sec==="scales" && S.settings.scMode==="chords" && TYPE[tid].iv) return mastI({sec,tid,k,ch:1});
  return mastI({sec,tid,k});
}
function itemName(it){
  if(it.sec==="chords") return chordName(it.tid,it.k);
  if(it.sec==="harmony"){ const h=HTYPE[it.tid]; return hChord(h.scale,it.k,it.deg,h.sev).roman+t("ofKey")+scaleName(h.scale,it.k); }
  if(it.sec==="prog") return progName(it.tid)+" · "+scaleName(PROG[it.tid].scale,it.k);
  if(it.sec==="ear") return earLabel(it.tid,it.k);
  return scaleName(it.tid,it.k)+(it.ch?t("scChordsOf"):"");
}

