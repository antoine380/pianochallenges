// fragment de l'IIFE principale — ordre 340, voir src/app/README.md
// ===================== ONLINE (Supabase Realtime: presence + broadcast, no table) =====================
// Lobby channel "pcq-lobby": everyone on the online tab (count), players who search are tracked with wait:true; the two oldest waiting are paired,
// the first one creates a room and sends {match} to the other. Room channel "pcq-room-<CODE>": presence = players, the host (creator) sends start / q / reveal / end,
// everyone sends {ans} with the original answer index and the time taken. Everything received is checked before use (names cut to 14 characters, indexes in range).
const NET={ch:null,lobby:null,host:false,code:"",peers:[],online:0,searching:false,searchAt:0,auto:false,state:"idle",err:""};
function netId(){ if(!S.netId||!/^p[a-z0-9]{8}$/.test(S.netId)){ S.netId="p"+Math.random().toString(36).slice(2,10).padEnd(8,"0"); save(); } return S.netId; }
function netName(){ const c=qzCfg(); return qzSafe(c.netName) || qzSafe(user?myName():"") || (t("qzGuest")+" "+netId().slice(-3).toUpperCase()); }
const NET_CODE="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const netCode = () => Array.from({length:5},()=>NET_CODE[Math.floor(Math.random()*NET_CODE.length)]).join("");
async function netSb(){ await ensureCloud(); if(!sb) throw new Error("offline"); return sb; }
function netPeersOf(ch){ try{ return Object.values(ch.presenceState()).map(a=>a&&a[0]).filter(x=>x&&typeof x.id==="string"&&/^p[a-z0-9]{8}$/.test(x.id))
  .map(x=>({id:x.id,name:qzSafe(x.name)||"?",lvl:Math.max(1,Math.min(999,x.lvl|0)),ph:qzPhotoOk(x.ph)?x.ph:"",host:!!x.host,wait:!!x.wait,at:+x.at||0})).sort((a,b)=>(b.host-a.host)||(a.at-b.at)||(a.id<b.id?-1:1)); }catch(e){ return []; } }
function netSubscribe(ch){ return new Promise((res,rej)=>{ const to=setTimeout(()=>rej(new Error("timeout")),10000); ch.subscribe(st=>{ if(st==="SUBSCRIBED"){ clearTimeout(to); res(); } else if(st==="CHANNEL_ERROR"||st==="TIMED_OUT"||st==="CLOSED"){ clearTimeout(to); rej(new Error(st)); } }); }); }
function netFail(){ NET.state="error"; NET.err=t("qzNetErr"); NET.searching=false; renderQzNet(); }
function netDrop(ch){ try{ ch.untrack&&ch.untrack(); }catch(e){} try{ sb&&sb.removeChannel(ch); }catch(e){} }
function netLeave(){ if(NET.ch) netDrop(NET.ch); if(NET.lobby) netDrop(NET.lobby); clearTimeout(NET.searchT);
  Object.assign(NET,{ch:null,lobby:null,host:false,code:"",peers:[],searching:false,auto:false,state:"idle",err:""}); }
// see how many people are on the online tab (and be ready to search)
async function netLobbyPeek(){ if(NET.lobby) return; if(NET.lobbyP) return NET.lobbyP; NET.lobbyP=netLobbyOpen(); try{ await NET.lobbyP; } finally{ NET.lobbyP=null; } }
async function netLobbyOpen(){ try{ const c=await netSb(); if(NET.lobby) return; const lb=c.channel("pcq-lobby",{config:{broadcast:{self:false},presence:{key:netId()}}}); NET.lobby=lb;
    lb.on("presence",{event:"sync"},()=>{ const ps=netPeersOf(lb); NET.online=ps.length; netPair(ps); if(page==="quiz"&&QZ.view==="setup") renderQzNet(); });
    lb.on("broadcast",{event:"match"},({payload:p})=>{ if(!p||p.b!==netId()||!NET.searching||typeof p.room!=="string"||!/^[A-Z2-9]{5}$/.test(p.room)) return;
      NET.searching=false; lb.track({id:netId(),name:netName(),lvl:levelInfo(S.xp).L,wait:false,at:Date.now()}); netJoin(p.room,false); });
    await netSubscribe(lb); await lb.track({id:netId(),name:netName(),lvl:levelInfo(S.xp).L,wait:false,at:Date.now()}); renderQzNet();
  }catch(e){ NET.lobby=null; netFail(); } }
async function netSearch(){ await netLobbyPeek(); if(!NET.lobby) return; NET.searching=true; NET.searchAt=Date.now(); NET.state="search"; NET.err="";
  await NET.lobby.track({id:netId(),name:netName(),lvl:levelInfo(S.xp).L,wait:true,at:Date.now()}); renderQzNet();
  clearTimeout(NET.searchT); NET.searchT=setTimeout(()=>{ if(NET.searching){ NET.state="nobody"; renderQzNet(); } },25000); }
function netStopSearch(){ NET.searching=false; clearTimeout(NET.searchT); if(NET.lobby) NET.lobby.track({id:netId(),name:netName(),lvl:levelInfo(S.xp).L,wait:false,at:Date.now()}); NET.state="idle"; renderQzNet(); }
// pair the waiting players two by two, the older one of each pair hosts
function netPair(ps){ if(!NET.searching) return; const w=ps.filter(p=>p.wait).sort((a,b)=>(a.at-b.at)||(a.id<b.id?-1:1));
  for(let i=0;i+1<w.length;i+=2){ if(w[i].id===netId()){ const room=netCode(), b=w[i+1].id; NET.searching=false;
      NET.lobby.send({type:"broadcast",event:"match",payload:{room,a:netId(),b}}); NET.lobby.track({id:netId(),name:netName(),lvl:levelInfo(S.xp).L,wait:false,at:Date.now()});
      NET.auto=true; netJoin(room,true); return; } if(w[i+1].id===netId()) return; } }
async function netJoin(code,asHost){ try{ const c=await netSb(); if(NET.ch) netDrop(NET.ch);
    const ch=c.channel("pcq-room-"+code,{config:{broadcast:{self:false},presence:{key:netId()}}});
    Object.assign(NET,{ch,code,host:asHost,peers:[],state:asHost?"host":"guest",err:""});
    ch.on("broadcast",{event:"m"},({payload})=>netRecv(payload));
    ch.on("presence",{event:"sync"},()=>{ NET.peers=netPeersOf(ch); netPeersChanged(); });
    await netSubscribe(ch); await ch.track({id:netId(),name:netName(),lvl:levelInfo(S.xp).L,ph:qzMyPhoto(),host:asHost,at:Date.now()}); renderQzNet();
    if(!asHost) setTimeout(()=>{ if(NET.ch===ch && !NET.peers.some(p=>p.host)){ NET.err=t("qzNoRoom"); netDrop(ch); NET.ch=null; NET.state="idle"; renderQzNet(); } },4000);
  }catch(e){ netFail(); } }
function netSend(p){ if(NET.ch) try{ NET.ch.send({type:"broadcast",event:"m",payload:p}); }catch(e){} }
function netPeersChanged(){ const P=NET.peers;
  if(QZ.view==="play" && QZ.mode==="online"){ // someone left during a game
    if(!NET.host && !P.some(p=>p.host)){ qzClearTimers(); QZ.view="setup"; NET.err=t("qzHostLeft"); netLeave(); NET.err=t("qzHostLeft"); renderQuiz(); return; }
    let changed=false; QZ.players.forEach(p=>{ if(!p.bot && !p.me && !P.some(x=>x.id===p.id) && !p.gone){ p.gone=true; changed=true; } });
    if(changed){ if(NET.host && !QZ.done && QZ.players.every((p,i)=>p.gone||QZ.picks[i]!=null)) qzReveal(); else renderQzPlay(); } return; }
  if(NET.host && NET.auto && P.length>=2 && QZ.view==="setup"){ NET.auto=false; netStartGame(); return; }
  renderQzNet(); }
// the host starts: same questions for everyone, players in arrival order
function netStartGame(){ if(!NET.host||!QZ.data) return; const c=qzCfg(), Q=QZ.data.q;
  const idx=qzShuffle([...Q.keys()].filter(i=>c.theme==="all"||Q[i][0]===c.theme)).slice(0,c.count);
  const players=NET.peers.slice(0,4).map(p=>({id:p.id,name:p.name,lvl:p.lvl,ph:p.ph}));
  const p={type:"start",idx,cfg:{diff:c.diff,ans:c.ans,time:c.time,keys:c.keys},players}; netSend(p); qzOnlineBegin(p); }
function qzOnlineBegin(p){ const Q=QZ.data.q; QZ.list=p.idx.map(i=>Q[i]).filter(Boolean); QZ.cfg=p.cfg;
  QZ.players=p.players.map((pl,i)=>{ const me=pl.id===netId(); return {id:pl.id,name:pl.name,col:QZ_COLORS[i],me,remote:!me,av:me?qzMyAv():charIndex(pl.lvl||1),ph:me?qzMyPhoto():(pl.ph||""),score:0,shown:0,ok:0}; });
  QZ.gid=(QZ.gid||0)+1; QZ.mode="online"; QZ.i=-1; QZ.turn=-1; QZ.q=null; QZ.view="play"; audio(); if(NET.host) qzNext(); else renderQuiz(); } // the guest waits for the host's first question
function netRecv(m){ if(!m||typeof m!=="object") return; const ok=(x,max)=>Number.isInteger(x)&&x>=0&&x<max;
  if(m.type==="start" && !NET.host && QZ.data){ if(!Array.isArray(m.idx)||!m.idx.every(i=>ok(i,QZ.data.q.length))||m.idx.length>30||!Array.isArray(m.players)||!m.players.length||m.players.length>4) return;
    const cfg={diff:[1,2,3].includes(m.cfg&&m.cfg.diff)?m.cfg.diff:1, ans:m.cfg&&m.cfg.ans==="chords"?"chords":"notes", time:[5,10,20,30].includes(m.cfg&&m.cfg.time)?m.cfg.time:20, keys:!!(m.cfg&&m.cfg.keys)};
    const players=m.players.filter(x=>x&&typeof x.id==="string").map(x=>({id:x.id,name:qzSafe(x.name)||"?",lvl:Math.max(1,Math.min(999,x.lvl|0)),ph:qzPhotoOk(x.ph)?x.ph:""}));
    if(!players.some(x=>x.id===netId())) return; qzOnlineBegin({idx:m.idx,cfg,players}); return; }
  if(QZ.mode!=="online"||QZ.view!=="play") return;
  if(m.type==="q" && !NET.host && ok(m.i,QZ.list.length)){ qzShowQ(m.i); return; }
  if(m.type==="ans" && ok(m.i,QZ.list.length) && m.i===QZ.i && ok(m.o,4)){ const pi=QZ.players.findIndex(p=>p.id===m.id&&!p.me); if(pi<0) return;
    const k=QZ.ans.findIndex(a=>a.o===m.o); const ms=Math.min(QZ.dur,Math.max(0,+m.ms||QZ.dur)); qzPick(pi,k,ms); return; }
  if(m.type==="reveal" && !NET.host && m.i===QZ.i){ qzReveal(true); return; }
  if(m.type==="end" && !NET.host){ qzFinish(); } }
function renderQzNet(){ if(page!=="quiz"||QZ.view!=="setup"||qzCfg().where!=="online") return;
  const st=NET.state, inRoom=!!NET.ch, P=NET.peers;
  $("qzOnlineN").textContent = NET.lobby ? t("qzOnlineN")(Math.max(1,NET.online)) : t("qzConnecting");
  $("qzNetName").value = document.activeElement===$("qzNetName") ? $("qzNetName").value : netName();
  $("qzFriendIdle").hidden = inRoom; $("qzFriendRoom").hidden = !inRoom || NET.auto;
  if(inRoom){ $("qzRoomCode").textContent=NET.code; $("qzRoomHint").textContent = NET.host ? t("qzShareCode") : t("qzWaitHost");
    const ul=$("qzRoomPl"); ul.innerHTML=""; P.slice(0,4).forEach((p,i)=>{ const li=document.createElement("li"); li.style.setProperty("--pc",QZ_COLORS[i]); li.innerHTML="<i></i><b></b><small></small>"; nmPut(li.querySelector("b"),p.name,p.id===netId()?" ("+t("qzYou")+")":""); li.querySelector("small").textContent=(p.host?t("qzHost")+" · ":"")+t("pfLvl")+" "+p.lvl; ul.appendChild(li); });
    $("qzRoomGo").hidden=!NET.host; $("qzRoomGo").disabled=P.length<2 || !QZ.data; }
  $("qzSearchBtn").hidden = NET.searching || st==="nobody"; $("qzSearching").hidden = !NET.searching && st!=="nobody";
  $("qzSearchTxt").textContent = st==="nobody" ? t("qzNobody") : t("qzSearchingT"); $("qzSearchBot").hidden = st!=="nobody";
  $("qzNetMsg").textContent = NET.err||"";
}
$("qzCreate").addEventListener("click",()=>{ netStopSearch(); netJoin(netCode(),true); });
$("qzJoin").addEventListener("click",()=>{ const code=$("qzCodeIn").value.toUpperCase().replace(/[^A-Z2-9]/g,""); if(code.length!==5){ NET.err=t("qzBadCode"); renderQzNet(); return; } netStopSearch(); netJoin(code,false); });
$("qzCodeIn").addEventListener("keydown",e=>{ if(e.key==="Enter") $("qzJoin").click(); });
$("qzRoomLeave").addEventListener("click",()=>{ if(NET.ch) netDrop(NET.ch); Object.assign(NET,{ch:null,host:false,code:"",peers:[],state:"idle",auto:false}); renderQzNet(); });
$("qzRoomGo").addEventListener("click",netStartGame);
$("qzCopy").addEventListener("click",()=>{ const link=SITE_URL()+"#quiz-"+NET.code; const done=()=>{ $("qzCopy").textContent=t("qzCopied"); setTimeout(()=>{ $("qzCopy").textContent=t("qzCopyT"); },1800); };
  try{ navigator.clipboard.writeText(link).then(done,()=>{}); }catch(e){} });
$("qzSearchBtn").addEventListener("click",netSearch);
$("qzSearchCancel").addEventListener("click",netStopSearch);
$("qzSearchBot").addEventListener("click",()=>{ netStopSearch(); const c=qzCfg(); c.where="local"; c.n=1; c.bots=Math.max(1,c.bots); save(); netLeave(); qzStart(); });
$("qzNetName").addEventListener("change",e=>{ qzCfg().netName=qzSafe(e.target.value); save(); const tr={id:netId(),name:netName(),lvl:levelInfo(S.xp).L,at:Date.now()};
  if(NET.ch) NET.ch.track({...tr,ph:qzMyPhoto(),host:NET.host}); if(NET.lobby) NET.lobby.track({...tr,wait:NET.searching}); });
// a shared link pianochallenges.com/#quiz-ABCDE opens the quiz and joins that room
function netFromHash(){ const m=/^#quiz-([A-Z2-9]{5})$/.exec(location.hash||""); if(!m) return; history.replaceState(null,"",location.pathname+location.search);
  const c=qzCfg(); c.where="online"; save(); openPage("quiz"); qzLoad().then(()=>{ netLobbyPeek(); netJoin(m[1],false); }); }
setTimeout(netFromHash,0);

