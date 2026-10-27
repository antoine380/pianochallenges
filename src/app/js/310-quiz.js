// fragment de l'IIFE principale — ordre 310, voir src/app/README.md
// ===================== QUIZ: 1 to 4 players answer general-knowledge questions with notes or chords =====================
// Questions live in assets/js/quiz-data.js (loaded on demand: window.QUIZ_DATA = {themes:{id:{fr,en,img,col}}, q:[[theme,img,qFr,[aFr x4],qEn,[aEn x4]]]}, right answer first).
// Each of the 4 answers is mapped to a note or a chord; a player answers by playing it (or by tapping the card).
// On this device: one MIDI keyboard each ("dev"), zones of one keyboard ("zone"), or one after the other ("turn"), plus bots.
// Online (Supabase Realtime, see NET below): with a friend (room code) or a random player (lobby), the host runs the game.
const QZ_COLORS=["#ff5a6e","#3cc8f0","#ffd23f","#3ddc84"];
const QZ={view:"setup", data:null, loading:null, list:[], i:0, ans:[], players:[], t0:0, dur:20000, raf:0, done:false, revealT:0, botT:[], picks:{}, buf:{}, turn:0, mode:"solo"};
const uiSound = () => S.settings.uiSound!==false;
function qzCfg(){ S.settings.quiz=S.settings.quiz||{}; const c=S.settings.quiz;
  if(!(c.n>=1&&c.n<=4)) c.n=1; if(!["dev","zone","turn"].includes(c.mode)) c.mode="dev"; c.theme=c.theme||"all";
  if(![5,10,20,30].includes(c.count)) c.count=10; if(![1,2,3].includes(c.diff)) c.diff=1; if(![5,10,20,30].includes(c.time)) c.time = typeof c.time==="number"&&c.time>0 ? [5,10,20,30].reduce((a,b)=>Math.abs(b-c.time)<Math.abs(a-c.time)?b:a) : 20;
  if(!c.keysOff1){ c.keys=false; c.keysOff1=1; } // « Montrer les touches à jouer » starts off (Oct 2026), for old settings too
  if(!["notes","chords"].includes(c.ans)) c.ans = c.diff===1 ? "notes" : "chords";
  if(!(c.bots>=0&&c.bots<=3)) c.bots=0; if(![1,2,3].includes(c.botLvl)) c.botLvl=2; if(!["local","online"].includes(c.where)) c.where="local";
  c.names=c.names||[]; c.devs=c.devs||[]; return c; }
function qzLoad(){ if(window.QUIZ_DATA){ QZ.data=window.QUIZ_DATA; return Promise.resolve(); }
  if(!QZ.loading) QZ.loading=new Promise((res,rej)=>{ const sc=document.createElement("script"); sc.src="assets/js/quiz-data.js"; sc.async=true; sc.onload=()=>{ QZ.data=window.QUIZ_DATA; res(); }; sc.onerror=()=>{ QZ.loading=null; rej(); }; document.head.appendChild(sc); });
  return QZ.loading; }
const QZ_ROOT={fr:["Do","Do♯","Ré","Mi♭","Mi","Fa","Fa♯","Sol","La♭","La","Si♭","Si"],en:["C","C♯","D","E♭","E","F","F♯","G","A♭","A","B♭","B"]};
const qzRoots = () => S.settings.notation==="fr"?QZ_ROOT.fr:QZ_ROOT.en;
function qzChord(root,kind){ const iv={maj:[0,4,7],min:[0,3,7],dom7:[0,4,7,10]}[kind], R=qzRoots()[root], fr=S.settings.lang==="fr";
  const name = kind==="maj" ? R+(fr?" majeur":" major") : kind==="min" ? R+(fr?" mineur":" minor") : R+"7";
  return {pcs:iv.map(x=>(root+x)%12), mid:iv.map(x=>60+root+x-(root>6?12:0)), name, sym:R+(kind==="min"?"m":kind==="dom7"?"7":"")}; }
function qzNote(pc){ return {pcs:[pc], mid:[60+pc], name:qzRoots()[pc]}; }
function qzPick4(pool,mk){ const out=[], keys=new Set(); let guard=0; while(out.length<4 && guard++<500){ const x=pool[Math.floor(Math.random()*pool.length)], c=mk(x), key=c.pcs.slice().sort((a,b)=>a-b).join(","); if(keys.has(key)) continue; keys.add(key); out.push(c); } return out; }
// the 4 things to play for one question: notes or chords, easier or harder
function qzTargets(diff,ans){
  if(ans==="notes"){ if(diff===1) return [0,2,4,5].map(qzNote); return qzPick4(diff===2?[0,2,4,5,7,9,11]:[...Array(12).keys()],qzNote); }
  if(diff===1) return [[0,"maj"],[5,"maj"],[7,"maj"],[9,"min"]].map(([r,k])=>qzChord(r,k));
  const pool = diff===2 ? [[0,"maj"],[5,"maj"],[7,"maj"],[9,"min"],[2,"min"],[4,"min"]] : [...Array(12).keys()].flatMap(r=>[[r,"maj"],[r,"min"],[r,"dom7"]]);
  return qzPick4(pool,([r,k])=>qzChord(r,k)); }
function qzShuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function qzKeys(pcs,col){ const W=[0,2,4,5,7,9,11], B=[[1,0],[3,1],[6,3],[8,4],[10,5]], on=new Set(pcs); let s='<svg viewBox="0 0 70 26" aria-hidden="true">';
  W.forEach((pc,i)=>{ s+='<rect x="'+(i*10+.4)+'" y="0" width="9.2" height="26" rx="1.6" fill="'+(on.has(pc)?col:"#ecebfa")+'" stroke="#c3bfe6" stroke-width=".5"/>'; });
  B.forEach(([pc,i])=>{ s+='<rect x="'+(i*10+7)+'" y="0" width="6" height="16" rx="1.2" fill="'+(on.has(pc)?col:"#2b2560")+'"/>'; });
  return s+"</svg>"; }
function qzDevices(){ const out=[["screen",t("qzScreen")]]; try{ if(midiAcc) midiAcc.inputs.forEach(inp=>{ if((!inp.state||inp.state==="connected") && !midiVirtual(inp.name)) out.push([String(inp.id||inp.name),inp.name]); }); }catch(e){} return out; }
// keys of a keyboard from its name (25, 49, 61 keys…), else the range used so far
const QZ_KBD={24:[48,71],25:[48,72],32:[41,72],37:[48,84],49:[36,84],61:[36,96],76:[28,103],88:[21,108]};
function qzRange(){ const c=qzCfg(), d=qzDevices().find(x=>x[0]===c.zoneDev&&x[0]!=="screen"), m=d&&String(d[1]).match(/(^|\D)(24|25|32|37|49|61|76|88)(\D|$)/);
  if(m) return QZ_KBD[m[2]]; if(d && /lumi|keys block/i.test(d[1])) return QZ_KBD[24];
  return S.settings.kbdSize && S.settings.kbdSize!=="auto" ? [LOW,HIGH] : midiReady ? [36,96] : [48,84]; }
function qzZones(n){ const [lo,hi] = qzRange(), oct=Math.max(n,Math.round((hi-lo+1)/12)), base=Math.floor(oct/n), extra=oct%n; let a=lo;
  return Array.from({length:n},(_,i)=>{ const o=base+(i<extra?1:0), b=i===n-1?hi:Math.min(hi,a+o*12-1), z=[a,b]; a=b+1; return z; }); }
const qzMidiName=m=>qzRoots()[m%12]+(Math.floor(m/12)-(S.settings.notation==="fr"?2:1)); // middle C (60) = Do3 / C4, as octName
const QZ_BOTS=["Robo Mozart","Robo Chopin","Robo Bach"];
const QZ_BOT_AV=[[1,2,3],[4,5,6],[7,8,9]]; // a bot wears a character of its level (easy, medium, strong)
// a profile photo from another player is only shown from the Google / Facebook picture hosts (no tracking pixel from anywhere else)
const qzPhotoOk = u => typeof u==="string" && u.length<=400 && /^https:\/\/([a-z0-9-]+\.)*(googleusercontent\.com|fbcdn\.net|fbsbx\.com|facebook\.com)\/[^\s"'<>\\]*$/i.test(u);
const qzMyPhoto = () => { const u=(typeof userPhoto==="function"&&userPhoto())||""; return qzPhotoOk(u)?u:""; };
const qzMyAv = () => charIndex(levelInfo(S.xp).L);
const qzSafe = s => gCut(String(s==null?"":s).replace(/[\u0000-\u001f\u007f<>]/g,"").replace(BIDI_G,"").trim(),14,48).trim(); // 14 graphemes, never half an emoji

