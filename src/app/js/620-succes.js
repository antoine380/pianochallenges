// fragment de l'IIFE principale — ordre 620, voir src/app/README.md
/* ==== Succès (C10) : onglet « Succès » de la fiche Progression : 6 tuiles chiffrées et 30 badges ==== */
// État : S.cnt = compteurs {notes, chords, inv, games, quiz, quiz4, night, early, sun, staff, share, wRun, wBest} (absents = 0) ;
//   S.songStars = {id: étoiles 0-3} (copie de clavio:best, que le lecteur Play garde dans son localStorage) ; S.badges = {id: "AAAA-MM-JJ"}.
// Fusion (mergeState) : compteurs et étoiles = max par clé (l'état fusionné repart vers le cloud : une somme compterait deux fois) ;
//   badges = union, la date la plus ancienne.
// badgeCheck() tourne en différé (badgeSoon, hors du chemin touche → son) après addXP, chaque fin de partie (achEnd), le quiz,
// un duel classé, un partage, le retour du lecteur Play, et à l'ouverture de la fiche. Premier passage (S.badges absent) : les badges
// déjà mérités sont notés sans notification ni fête (pas d'avalanche pour les anciens joueurs).
const achO = x => !!x && typeof x==="object" && !Array.isArray(x);
function achC(){ if(!achO(S.cnt)) S.cnt={}; return S.cnt; }
const achN = k => { const v=+achC()[k]; return Number.isFinite(v)&&v>0?v:0; };
function achInc(k,n=1){ achC()[k]=achN(k)+n; }
function achHit(n){ achInc("notes",n); if(n>=3) achInc("chords"); } // a target of the games found: its notes, and a chord when it has 3 notes or more
function achEnd(){ achInc("games"); badgeSoon(); }
function achSongs(){ let cb={}; try{ cb=JSON.parse(localStorage.getItem("clavio:best")||"{}")||{}; }catch(e){} if(!achO(S.songStars)) S.songStars={};
  if(achO(cb)) Object.entries(cb).forEach(([k,v])=>{ v=Math.min(3,+v||0); if(v>(+S.songStars[k]||0)) S.songStars[k]=v; }); return S.songStars; }
// stars of a catalogue song (C6) = the best of its versions: clavio:best keys "id" (1st version) and "id@lv" (the others)
function achSongBest(songs){ const o={}; Object.entries(achO(songs)?songs:{}).forEach(([k,v])=>{ const id=String(k).split("@")[0]; if(id.startsWith("imp:")) return; /* imported songs (this device only) do not count */ v=Math.min(3,+v||0); if(v>(o[id]||0)) o[id]=v; }); return o; }
const ACH_SONGS=10; // « Mélomane » : 10 morceaux différents du catalogue joués (au moins 1 étoile)
const achWins = () => Object.values(S.elo||{}).reduce((a,e)=>a+((achO(e)&&+e.w)|0),0);
const achSec = (sec,k) => (+((S.secStats||{})[sec]||{})[k])|0;
// what the mastery says: chords found per type (as pitch classes), scales per type, inverted chords
function achMast(){ const o={ch:{},sc:{},inv:0}; Object.entries(S.mastery||{}).forEach(([k,v])=>{ if(!(+v>=1)) return; const p=k.split(":"); let pc; try{
    if(p[0]==="ch" && CTYPE[p[1]]){ pc=keyPc(p[2]); (o.ch[p[1]]=o.ch[p[1]]||new Set()).add(pc); if(+p[3]>0) o.inv++; }
    else if(p.length===2 && TYPE[p[0]]){ pc=keyPc(p[1]); (o.sc[p[0]]=o.sc[p[0]]||new Set()).add(pc); } }catch(e){} }); return o; }
const achSz = s => s ? s.size : 0;
function achGoalDays(){ let n=0; try{ const g=goalCfg(); new Set([...Object.keys(S.xpDays||{}),...Object.keys(S.playSec||{})]).forEach(d=>{ if(goalNow(g,d)>=g.v) n++; }); }catch(e){} return n; }
// « Les Douze en or » reads the other worksite's best scores without depending on it: a key douze-* worth "gold"/"or", {medal:"gold"} or a number ≥ 3 (1 bronze, 2 silver, 3 gold)
const achDouze = () => Object.entries(S.gameBest||{}).some(([k,v])=>k.startsWith("douze-") && (v==="gold"||v==="or"||(achO(v)&&(v.medal==="gold"||v.gold))||(typeof v==="number"&&v>=3)));
const achElo = () => Math.max(0,...Object.values(S.elo||{}).filter(e=>achO(e)&&(+e.n||0)>=5).map(e=>+e.r||0));
// the 30 badges: [id, picture (OBJ), progress (c) => [value, goal]]
const ACH=[
  ["pp","feet",()=>[PP_READY.filter(id=>(((S.pp||{}).done)||{})[id]).length, PP_READY.length]],
  ["goal7","pulse",()=>[achGoalDays(),7]],
  ["maj12","chords",c=>[achSz(c.m.ch.maj),12]],
  ["fifths","compass",c=>[achSz(c.m.sc.major),12]],
  ["minor","scales",c=>[achSz(c.m.sc.minor),12]],
  ["sev","seven",c=>[["maj7","dom7","min7","hdim7","dim7"].reduce((a,k)=>a+achSz(c.m.ch[k]),0),12]],
  ["inv","climber",c=>[Math.max(c.m.inv,achN("inv")),12]],
  ["harm","harmony",()=>[achSec("harmony","ok"),25]],
  ["prog","prog",()=>[achSec("prog","ok"),25]],
  ["ear","ear",()=>[achSec("ear","ok"),50]],
  ["duel1","medal",()=>[achWins(),1]],
  ["duel10","crown",()=>[Math.max(achN("wBest"),achN("wRun")),10]],
  ["elo","soon",()=>[achElo(),1200]],
  ["str7","daily",c=>[c.st.best,7]],
  ["str30","mountain",c=>[c.st.best,30]],
  ["night","moon",()=>[achN("night")?1:0,1]],
  ["early","sun",()=>[achN("early")?1:0,1]],
  ["sun","croissant",()=>[achN("sun")?1:0,1]],
  ["g100","heart",()=>[achN("games"),100]],
  ["rn100","runner",()=>[+S.runnerBest||0,100]],
  ["mem10","memory",()=>[+((S.gameBest||{}).memory)||0,10]],
  ["sp","speed",()=>[+((S.gameBest||{}).speed)||0,25]],
  ["quiz50","quiz",()=>[achN("quiz"),50]],
  ["quiz4","quizhub",()=>[achN("quiz4")?1:0,1]],
  ["songs","play",c=>[Object.values(achSongBest(c.songs)).filter(v=>v>=1).length,ACH_SONGS]],
  ["song3","star",c=>[Object.values(achSongBest(c.songs)).some(v=>v>=3)?1:0,1]],
  ["staff","staff",()=>[achN("staff")?1:0,1]],
  ["xp10k","planet",()=>[+S.xp||0,10000]],
  ["share","gift",()=>[Math.max(achN("share"),+((S.refStats||{}).n)||0),1]],
  ["douze","douze",()=>[achDouze()?1:0,1]]];
const achName = id => (t("achB")[id]||[id])[0], achHow = id => (t("achB")[id]||["",""])[1];
// new pictures (full 120 × 120 box, already centred)
Object.assign(OBJ,{
  feet:()=>{ const o=O3(); [[40,74,-12],[80,46,12]].forEach(([x,y,r])=>{ o.raw('<g transform="rotate('+r+' '+x+' '+y+')">').ball(x,y+8,14,"#3ddc84",22); [[-12,-22,5],[-4,-27,5],[4,-27,4.5],[11,-22,4]].forEach(([dx,dy,rr])=>o.ball(x+dx,y+dy-4,rr,"#3ddc84")); o.raw('</g>'); }); return o.svg(); },
  seven:()=>{ const o=O3(); o.raw('<g transform="rotate(-10 60 60)">').block(26,14,68,92,"#fbfbff",12).block(32,20,56,16,"#5b7cff",6).raw('<text x="60" y="92" text-anchor="middle" font-family="Fredoka,Nunito,sans-serif" font-weight="700" font-size="54" fill="#2b2560">7</text></g>'); return o.svg(); },
  douze:()=>{ const o=O3(); o.ball(60,62,46,"#ffc94a"); return o.raw('<circle cx="60" cy="62" r="34" fill="none" stroke="#e59b12" stroke-width="4"/><text x="60" y="78" text-anchor="middle" font-family="Fredoka,Nunito,sans-serif" font-weight="700" font-size="42" fill="#8a5a00">12</text>').svg(); }
});
const achSvg = id => { const b=ACH.find(x=>x[0]===id); return ((OBJ[b&&b[1]]||OBJ.star)()).replace("xMaxYMin","xMidYMid"); };
function achCtx(){ return {m:achMast(), st:streaks(), songs:achSongs()}; }
function achProg(id,c){ const b=ACH.find(x=>x[0]===id); try{ const [v,g]=b[2](c||achCtx()); return [Math.max(0,+v||0),g]; }catch(e){ return [0,1]; } }
let achT=0, achNew=new Set();
function badgeSoon(){ clearTimeout(achT); achT=setTimeout(()=>{ try{ badgeCheck(); }catch(e){} },500); }
function badgeCheck(silent){ const first=!achO(S.badges); if(first) S.badges={}; const c=achCtx(), today=dayStr(), got=[];
  ACH.forEach(([id])=>{ if(S.badges[id]) return; const [v,g]=achProg(id,c); if(v>=g){ S.badges[id]=today; got.push(id); } });
  save(); if(!got.length) return got;
  if(!(silent||first)){ got.forEach(id=>{ achNew.add(id); try{ ntfAdd({key:"badge-"+id, cat:"progress", type:"badge", ti:t("achNtfT")(achName(id)), tx:achHow(id), act:{k:"badges",l:"ntfSee"}}); }catch(e){} }); achParty(got); }
  if(page==="progress") renderAch(); return got; }
// the small celebration: a toast, three soft notes (interface sounds on), confetti when nothing is being played
function achParty(got){ const n=achName(got[0]); toast(got.length>1?t("achGotN")(n,got.length-1):t("achGot")(n));
  try{ if(S.settings.uiSound!==false && ctx && ctx.state==="running") [79,84,88].forEach((m,i)=>tone(m,i*.09,.35,.07)); }catch(e){}
  const busy = phase==="listening" || (RN.on && RN.state==="run") || SP.state==="run" || MM.state==="input" || MM.state==="listen";
  if(!busy && ["practice","daily"].includes(page)) try{ confetti(); }catch(e){} }
const achFmtDur = sec => { const h=Math.floor(sec/3600), m=Math.floor(sec%3600/60); return h ? h+" h "+String(m).padStart(2,"0") : m+" min"; };
const ACH_TILES=[["star","#6a3fd1"],["staff","#1f7a52"],["chords","#c9463c"],["medal","#b4461a"],["moon","#2c56d6"],["speed","#0e7490"]];
function renderAch(){ const box=$("achBox"); if(!box) return; const c=achCtx(), L=t("achT"), sec=Object.values(S.playSec||{}).reduce((a,v)=>a+(+v||0),0);
  const vals=[fmtN(S.xp), fmtN(achN("notes")), fmtN(achN("chords")), fmtN(achWins()), fmtN(Object.values(achSongBest(c.songs)).filter(v=>v>=3).length), achFmtDur(sec)];
  const tl=$("achTiles"); tl.innerHTML=""; ACH_TILES.forEach(([o,col],i)=>{ const d=document.createElement("div"); d.className="ach-t"; d.style.setProperty("--c",col);
    d.innerHTML='<span class="obj" aria-hidden="true">'+OBJ[o]()+'</span><b></b><span></span>'; d.children[1].textContent=vals[i]; d.children[2].textContent=L[i]; tl.appendChild(d); });
  const B=S.badges||{}, n=ACH.filter(([id])=>B[id]).length; $("achCount").textContent=t("achCount")(n,ACH.length);
  const gr=$("achGrid"); gr.innerHTML=""; ACH.forEach(([id])=>{ const on=!!B[id], b=document.createElement("button"); b.type="button"; b.className="ach-b"+(on?" on":"")+(achNew.has(id)?" new":""); b.dataset.id=id;
    b.setAttribute("role","listitem"); b.setAttribute("aria-expanded","false"); b.setAttribute("aria-label",achName(id)+" · "+(on?t("achOn")(achDate(B[id])):t("achOff")));
    b.innerHTML='<span class="ach-i" aria-hidden="true">'+achSvg(id)+'</span><span class="ach-n"></span>'; b.lastChild.textContent=achName(id); gr.appendChild(b); });
  achNew.clear(); achPopClose(); }
const achDate = d => { try{ return pDate(d).toLocaleDateString(S.settings.lang==="fr"?"fr-FR":"en-GB",{day:"numeric",month:"long",year:"numeric"}); }catch(e){ return d; } };
// a click on a badge: how to get it (with the progress), or when it was earned and a « Share » button
let achOpen=null, achST=0;
function achPopClose(){ const p=$("achPop"); if(p) p.hidden=true; if(achOpen){ const b=$("achGrid").querySelector('[data-id="'+achOpen+'"]'); if(b) b.setAttribute("aria-expanded","false"); } achOpen=null; }
function achPopOpen(id, btn){ const p=$("achPop"), box=$("achBox"), on=!!(S.badges||{})[id]; if(achOpen===id){ achPopClose(); return; } achPopClose(); achOpen=id; btn.setAttribute("aria-expanded","true"); achST=$("achGrid").scrollTop;
  const [v,g]=achProg(id); p.innerHTML='<div class="ap-h"><b id="achPopT"></b><button type="button" class="ap-x">×</button></div><p></p>'+(on?'<small></small><button type="button" class="btn ap-sh"></button>':'<div class="bar"><i></i></div><small></small>');
  p.querySelector("b").textContent=achName(id); p.querySelector(".ap-x").setAttribute("aria-label",t("achClose")); p.querySelector("p").textContent=achHow(id);
  if(on){ p.querySelector("small").textContent=t("achOn")(achDate(S.badges[id])); const sh=p.querySelector(".ap-sh"); sh.innerHTML=pwI("share")+"<span></span>"; sh.lastChild.textContent=t("shareBtn"); sh.onclick=()=>achShare(id); }
  else { p.querySelector(".bar i").style.width=Math.min(100,v/g*100)+"%"; p.querySelector("small").textContent=t("achOff")+" · "+fmtN(Math.min(v,g))+" / "+fmtN(g); }
  p.querySelector(".ap-x").onclick=()=>{ achPopClose(); btn.focus(); };
  p.hidden=false; const br=btn.getBoundingClientRect(), r=box.getBoundingClientRect(), pw=p.offsetWidth, ph=p.offsetHeight;
  let x=br.left+br.width/2-r.left-pw/2; x=Math.max(8,Math.min(r.width-pw-8,x)); let y=br.bottom-r.top+6; if(y+ph>r.height-4) y=Math.max(4,br.top-r.top-ph-6);
  p.style.left=x+"px"; p.style.top=y+"px"; (p.querySelector(".ap-sh")||p.querySelector(".ap-x")).focus({preventScroll:true}); }
$("achGrid").addEventListener("click",e=>{ const b=e.target.closest(".ach-b"); if(b) achPopOpen(b.dataset.id,b); });
// a scroll of the grid closes the bubble, but not the one that brought a half-hidden badge into view just before the click (its event comes after)
$("achGrid").addEventListener("scroll",()=>{ if(achOpen && Math.abs($("achGrid").scrollTop-achST)>2) achPopClose(); },{passive:true});
document.addEventListener("pointerdown",e=>{ if(achOpen && !e.target.closest("#achPop,.ach-b")) achPopClose(); });
document.addEventListener("keydown",e=>{ if(e.key==="Escape" && achOpen && page==="progress"){ const id=achOpen; achPopClose(); const b=$("achGrid").querySelector('[data-id="'+id+'"]'); if(b) b.focus(); e.stopPropagation(); } },true);
// share a badge: the square picture of the app (shareCard) with the badge drawn on it
function achImg(id){ return new Promise(res=>{ let done=false; const fin=x=>{ if(!done){ done=true; res(x); } }; try{ const sv=achSvg(id).replace("<svg ",'<svg xmlns="http://www.w3.org/2000/svg" width="360" height="360" ');
    const im=new Image(); im.onload=()=>fin(im); im.onerror=()=>fin(null); im.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(sv); setTimeout(()=>fin(null),1500); }catch(e){ fin(null); } }); }
async function achShare(id){ const img=await achImg(id), file=await shareCard(t("achShareK"), achName(id), achHow(id)+" · "+t("achOn")(achDate(S.badges[id])), "#c9900f", img);
  shareIt({text:t("achShareTx")(achName(id)), url:refLink(), file}); }
// hooks (wrappers: the original functions are not changed)
{ const f=addXP; addXP=function(n){ const r=f.apply(this,arguments); if(n>0){ const d=new Date(), h=d.getHours(), c=achC(); if(h>=23||h<5) c.night=1; else if(h<7) c.early=1; if(d.getDay()===0) c.sun=1; } badgeSoon(); return r; }; }
{ const f=finishGame; finishGame=function(){ const g=game; const r=f.apply(this,arguments); try{ if(g && g.results && g.results.some(Boolean)){ achInc("games"); if(S.settings.staff && S.settings.staffRead) achInc("staff"); } badgeSoon(); }catch(e){} return r; }; }
{ const f=qzFinish; qzFinish=function(){ const r=f.apply(this,arguments); try{ const me=QZ.players.filter(p=>!p.bot&&!p.remote); achInc("quiz",me.reduce((a,p)=>a+((+p.ok)|0),0)); if(QZ.players.length>=4) achC().quiz4=1; achInc("games"); badgeSoon(); }catch(e){} return r; }; }
{ const f=eloApply; eloApply=function(key,opp,res){ const r=f.apply(this,arguments); try{ const c=achC(); if(res===1){ c.wRun=achN("wRun")+1; c.wBest=Math.max(achN("wBest"),c.wRun); } else c.wRun=0; badgeSoon(); }catch(e){} return r; }; }
{ const f=shareIt; shareIt=function(){ try{ achInc("share"); badgeSoon(); }catch(e){} return f.apply(this,arguments); }; }
{ const f=pfTab; pfTab=function(v){ f.apply(this,arguments); document.body.classList.toggle("pf-suc",v==="suc"); achPopClose(); if(v==="suc"){ try{ badgeCheck(); }catch(e){} renderAch(); } }; }
{ const f=renderFiche; renderFiche=function(){ const r=f.apply(this,arguments); if($("progPane").dataset.tab==="suc"){ try{ badgeCheck(); }catch(e){} renderAch(); } return r; }; }
{ const f=ntfDo; ntfDo=function(a){ if(a && a.k==="badges"){ openSet("progress"); pfTab("suc"); return; } return f.apply(this,arguments); }; }
NTF_ICON.badge="medal";
window.addEventListener("message",e=>{ if(e.origin===location.origin && e.data && e.data.source==="clavio") badgeSoon(); }); // back from a song of the Play player: its stars
{ const _ms=mergeState; mergeState=function(local, cloud){ const r=_ms.apply(this,arguments); const c=achO(cloud)?cloud:{}, m=r.merged;
    const mx=(a,b)=>{ const o={}; [a,b].forEach(x=>{ if(achO(x)) Object.entries(x).forEach(([k,v])=>{ v=+v; if(Number.isFinite(v)) o[k]=Math.max(o[k]||0,v); }); }); return o; };
    if(achO(local.cnt)||achO(c.cnt)) m.cnt=mx(local.cnt,c.cnt); // counters: max per key
    if(achO(local.songStars)||achO(c.songStars)) m.songStars=mx(local.songStars,c.songStars);
    if(achO(local.badges)||achO(c.badges)){ const o={}; [local.badges,c.badges].forEach(x=>{ if(achO(x)) Object.entries(x).forEach(([k,d])=>{ if(typeof d==="string" && (!o[k] || d<o[k])) o[k]=d; }); }); m.badges=o; } // union, the earliest date
    r.changed=JSON.stringify(m)!==JSON.stringify(local); return r; }; }
setTimeout(()=>{ try{ badgeCheck(); }catch(e){} },1500);
/* ==== fin Succès ==== */

