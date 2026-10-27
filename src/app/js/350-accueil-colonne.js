// fragment de l'IIFE principale — ordre 350, voir src/app/README.md
// Hub side column: daily practice, MIDI keyboard, news slider, weekly leaderboard
let hsNewsLang="", hsIdx=0, hsTimer=0, hsRankAt=0, hsRankWait=false;
function hsShow(i){ const sl=document.querySelectorAll("#hsSlides .hs-slide"), dots=document.querySelectorAll("#hsDots button"); if(!sl.length) return; hsIdx=(i+sl.length)%sl.length;
  sl.forEach((e,j)=>e.classList.toggle("on",j===hsIdx)); dots.forEach((e,j)=>e.setAttribute("aria-current",j===hsIdx)); }
function hsAuto(){ clearInterval(hsTimer); if(matchMedia("(prefers-reduced-motion: reduce)").matches) return; hsTimer=setInterval(()=>{ if(page==="hub" && !document.hidden) hsShow(hsIdx+1); },5000); }
function renderHubSide(){
  const done=!!(S.daily&&S.daily.date===dayStr());
  $("hsDaily").classList.toggle("done",done); $("hsDailySub").textContent=$("dailySub").textContent; $("hsDailyGo").textContent=t(done?"hsDailyDone":"hsDailyGo");
  mdHub(); // « Ton clavier » card (M2)
  if(hsNewsLang!==S.settings.lang){ hsNewsLang=S.settings.lang; const box=$("hsSlides"), dots=$("hsDots"); box.innerHTML=""; dots.innerHTML="";
    t("hsNews").forEach(([ti,su,c,ic],i)=>{ const d=document.createElement("div"); d.className="hs-slide";
      d.innerHTML='<span class="nb" style="background:linear-gradient(150deg,'+shade(c,.35)+','+c+')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+ic+'"/></svg></span><span><b></b><small></small></span>';
      d.querySelector("b").textContent=ti; d.querySelector("small").textContent=su; box.appendChild(d);
      const b=document.createElement("button"); b.type="button"; b.setAttribute("aria-label",ti); b.onclick=()=>{ hsShow(i); hsAuto(); }; dots.appendChild(b); });
    hsShow(0); hsAuto(); }
  renderHubRank();
}
function hsRow(r,rk,me){ const li=document.createElement("li"); if(me) li.className="me"; const okPhoto=r.photo && /^https:\/\//.test(r.photo);
  li.innerHTML='<span class="rk"></span><span class="av"></span><b></b><span class="num"></span>'; avFill(li.querySelector(".av"),okPhoto?r.photo:"",r.avatar);
  li.querySelector(".rk").textContent=typeof rk==="number"?fmtN(rk):rk; nmPut(li.querySelector("b"),r.name); li.querySelector(".num").textContent=fmtN(r.xp)+" XP"; return li; }
async function renderHubRank(){
  const ol=$("hsRank"); if(getComputedStyle($("hsRank").closest(".hs-card")).display==="none") return;
  const li0=levelInfo(S.xp), now=new Date(), since=addDays(-((now.getDay()+6)%7));
  const myXP=Object.entries(S.xpDays||{}).reduce((a,[d,x])=>d>=since?a+x:a,0);
  const mine=()=>hsRow({name:t("you"),avatar:charIndex(li0.L),photo:userPhoto&&userPhoto(),xp:myXP},"—",true);
  const msg=k=>{ const m=document.createElement("li"); m.className="msg"; m.textContent=t(k); return m; };
  if(!sb){ if(!ol.children.length || hsRankWait){ ol.innerHTML=""; ol.appendChild(msg(cloudFail?"hsRankErr":"hsRankLoad")); ol.appendChild(mine()); }
    if(!cloudPromise && !hsRankWait){ hsRankWait=true; setTimeout(()=>{ ensureCloud().then(()=>{ hsRankWait=false; hsRankAt=0; if(page==="hub") renderHubRank(); }).catch(()=>{}); },1200); }
    return; }
  if(user && !LG.off){ if(await lgHub(ol)) return; } else lgHubOff(); // Ligues (C11): the league card for an account, the weekly leaderboard otherwise
  if(Date.now()-hsRankAt<60000) return; hsRankAt=Date.now();
  const {data,error}=await Promise.race([sb.rpc("leaderboard",{since}), new Promise(r=>setTimeout(()=>r({data:null,error:1}),8000))]);
  ol.innerHTML="";
  try{ ntfRank(data,since); }catch(e){}
  const all=data||[], list=all.slice(0,5); list.forEach((r,i)=>ol.appendChild(hsRow(r,i+1,user&&r.id===user.id)));
  if(error) ol.appendChild(msg("hsRankErr")); else if(!user || !list.some(r=>r.id===user.id)){
    const at=user?all.findIndex(r=>r.id===user.id):-1, row=mine(); ol.appendChild(row);
    const put=(rk,xp)=>{ row.querySelector(".rk").textContent=""; const b=row.querySelector("b"); b.textContent=t("rankOrd")(rk)+" · "+t("you"); b.title=b.textContent; row.querySelector(".num").textContent=fmtN(xp)+" XP"; };
    if(at>=0) put(at+1,all[at].xp); else if(user){ const m=await myRank(since); if(m && ol.contains(row)) put(m.rank,m.xp); } }
}
// my_rank(since): the signed-in player's own rank and XP when outside the top 50 (supabase/migrations/2026-10-21_my_rank.sql).
// Not installed yet, offline or no XP in the period: null, and nothing is shown.
async function myRank(since){ if(!sb||!user) return null;
  try{ const {data,error}=await Promise.race([sb.rpc("my_rank",{since:since||null}), new Promise(r=>setTimeout(()=>r({data:null,error:1}),6000))]);
    const r=Array.isArray(data)?data[0]:data; if(error||!r||!(+r.rank>0)) return null; return {rank:+r.rank|0, xp:+r.xp||0}; }catch(e){ return null; } }
$("hsDaily").addEventListener("click",()=>$("dailyCard").click());
$("hsRankMore").addEventListener("click",()=>$("rankBtn").click());
$("hsMidiBtn").addEventListener("click",()=>{ if(midiReady && S.settings.input!=="mic") openMidi(); else mwOpen(); }); // not connected: the assistant (M4), or M12 without MIDI here
document.querySelectorAll(".obj[data-obj]").forEach(e=>{ e.innerHTML=OBJ[e.dataset.obj](); });
const MODE_COL={quiz:"#2563eb",games:"#26805a",play:"#7a5bf5",learn:"#c9463c"}; // same as --m-games/--m-play/--m-learn; shades only darken so white text stays ≥ 4.5:1
// each tile has its own hue (white text ≥ 4.5:1 on each), like a shelf of game boxes
const TILE_COL={runner:"#1f7a52",speed:"#b4461a",memory:"#6a3fd1",douze:"#2c56d6",soon:"#a3306b",chords:"#c9463c",scales:"#b4461a",harmony:"#2c56d6",prog:"#6a3fd1",ear:"#0e7490",daily:"#a3306b",
  p_runner:"#0e7490",p_pulse:"#b02a6b",p_blaster:"#2c56d6",p_climber:"#1f7a52",p_ear:"#8a3fd1",p_staff:"#b4461a"};
function renderGames(){ const box=$("gameCards"), pbox=$("playCards"); box.innerHTML=""; pbox.innerHTML="";
  t("games").forEach(([title,desc,id],i)=>{ const best=id?((S.gameBest||{})[id]||(id==="runner"?S.runnerBest:0)||0):null;
    box.appendChild(tile({color:TILE_COL[id||"soon"],obj:id||"soon",kick:t("secGames"),title,desc,rec:id?t("rnBestL")+"\u00a0"+(id==="douze"?dzBestTxt():best?fmtN(best):"—")+(DU_GAMES.includes(id)?(e=>" · ELO\u00a0"+fmtN(e.r)+(eloProv(e)?"?":""))(eloGet(id+"-"+(id==="douze"?dzCont():S.settings.duCont==="notes"?"notes":"chords"))):""):null,soon:!id,onOpen:id?()=>gameOpen(id):null})); });
  const h=$("playHead"); h.firstChild.textContent=t("playGamesHead"); h.lastChild.textContent=t("playGamesSub");
  t("playGames").forEach(([title,desc,id],i)=>pbox.appendChild(tile({color:TILE_COL["p_"+id]||MODE_COL.play,obj:id,kick:"Play",title,desc,onOpen:()=>openPlayWith("#game="+id)}))); }
function renderLearn(){ const box=$("learnTiles"); box.innerHTML="";
  t("learnTiles").forEach(([id,title,desc],i)=>box.appendChild(tile({color:TILE_COL[id],obj:id,kick:"Learn",title,desc,btn:t("rnPlay"),
    onOpen:()=>{ if(id==="daily") $("dailyCard").click(); else $("secTabs").querySelector('[data-v="'+id+'"]').click(); }}))); }
const LOCKED=[]; // everything is open to guests; the Profile page keeps the invitation to create an account
let lockFor="";
const needLogin = pg => LOCKED.includes(pg) && !user && !cloudFail && !guestPass;
const INFO_PAGES=["settings","progress"];
let returnPage=null, guestPass=false;
