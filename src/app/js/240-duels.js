// fragment de l'IIFE principale — ordre 240, voir src/app/README.md
// ---------- Duels (multiplayer in every game, chess.com-like): online against a player of your level, a bot, or a friend; ELO per game ----------
// Both players get the same challenge (same random seed: same chords in the same order, same tempo) and see each other's score live.
// Rating: S.elo["<game>-<cont>"] = {r, n, w, d, l, h:[{d,r,o,res,bot}]}; online and bot games are rated, friend games are not.
// Online: lobby channel "pcd-lobby" (presence {id,name,elo,av,game,cont,wait,at}): waiting players of the same game are paired when their ratings
// are close (the window grows with the waiting time); the older one creates the room "pcd-room-<CODE>" and sends {match}. In the room the host sends
// {t:"start"}, both send {t:"sc"} (score, finished), {t:"re"} asks for a rematch. Everything received is checked.
const DU_GAMES=["runner","speed","memory","douze"];
const DU_BOTS=[250,500,700,900,1100,1300,1500,1750,2000,2300]; // one bot per character of the levels (Mimi ... Draco)
const DU={view:"lobby",game:"runner",cont:"chords",mode:null,rated:false,opp:null,me:{score:0,done:false},seed:0,t0:0,sim:0,
  ch:null,lobby:null,code:"",host:false,peers:[],searching:false,searchAt:0,err:"",res:null,botPick:null,want:false,oppWant:false,online:0,countT:0};
let gRnd=Math.random;
function duRng(seed){ let a=seed>>>0; return ()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
const duKey = (g,c) => (g||DU.game)+"-"+(c||DU.cont);
function eloGet(key){ S.elo=S.elo||{}; const e=S.elo[key||duKey()]; return e && Number.isFinite(e.r) ? e : {r:S.eloStart||800,n:0,w:0,d:0,l:0,h:[]}; }
const eloProv = e => e.n<5; // provisional rating, shown with a "?" like chess.com
function eloApply(key, opp, res, bot, nm, av){ const e={...eloGet(key)}; e.h=(e.h||[]).slice(-19);
  const E=1/(1+Math.pow(10,(opp-e.r)/400)), K = e.n<10?40 : e.n<30?24 : 16, d=Math.round(K*(res-E));
  const before=e.r; e.r=Math.max(100,e.r+d); e.n++; if(res===1) e.w++; else if(res===0) e.l++; else e.d++;
  e.h.push({d:dayStr(),r:e.r,o:Math.round(opp),res,bot:!!bot,nm:qzSafe(nm),av:av|0,dd:e.r-before}); S.elo={...(S.elo||{}),[key]:e}; try{ ntfElo(key,e.r); }catch(x){} save(); return {before, after:e.r, d:e.r-before}; }
function duGameName(g){ return t({runner:"rnName",speed:"spName",memory:"mmName",douze:"dzName"}[g||DU.game]); }
function duMyAv(){ return charIndex(levelInfo(S.xp).L); }
function duMyName(){ return typeof netName==="function" ? netName() : t("qzYou"); }
// the challenge is the same for everybody: natural notes, or major and minor chords on the natural notes
function duPool(cont){
  const nat=k=>tonicNote(k).a===0;
  if(cont==="notes") return rootsOf("chords","maj").filter(nat).map(k=>tonicNote(k)).filter((n,i,a)=>a.findIndex(x=>x.pc===n.pc)===i).map(n=>({label:noteName(n),pcs:[n.pc],note:true}));
  const out=[]; ["maj","min"].forEach(tid=>rootsOf("chords",tid).filter(nat).forEach(k=>out.push({label:chordSym(tid,k), pcs:[...new Set(spellChord(tid,k,0).map(n=>n.pc))]})));
  return out; }
// ---- bots: the score they reach and when, from their rating ----
function duBotFor(elo){ let best=0; DU_BOTS.forEach((r,i)=>{ if(Math.abs(r-elo)<Math.abs(DU_BOTS[best]-elo)) best=i; }); return best; }
function duBotPlan(elo, game, seed){ const r=duRng(seed^0x5bd1e995), s=Math.max(0,Math.min(1,(elo-100)/2100)), gauss=()=>{ let u=0; for(let i=0;i<6;i++) u+=r(); return u-3; };
  if(game==="douze") return dzBotPlan(elo, seed);
  const ev=[]; // [time (ms after the start), score]
  if(game==="speed"){ let tm=0, end=60000, n=0; while(true){ const mean=(4.6-3.6*s)*1000; tm+=mean*(0.6+r()*0.8); if(tm>end) break; n++; ev.push([tm,n]); end+=Math.max(300,1500-n*60); } ev.push([end,n,1]); }
  else if(game==="memory"){ const R=Math.max(0,Math.round(1.5+13*s+gauss()*1.2)); let tm=0; for(let k=1;k<=R+1;k++){ const tp=Math.max(380,900-(k-1)*45); tm+=500+k*tp+k*tp*(1.6-0.8*s)+900; if(k<=R) ev.push([tm,k]); else ev.push([tm,R,1]); } }
  else { const k=Math.max(0,Math.round(2+35*Math.pow(s,1.2)+gauss()*(1.5+3*s))), p=0.15+0.6*s; let tm=5600, sc=0; for(let i=0;i<=k;i++){ const gap=Math.max(1.9,3.5-i*0.07)*(0.85+r()*0.4)*1000;
      if(i<k){ sc+=10+(r()<p?5:0); ev.push([tm,sc]); tm+=gap; } else ev.push([tm-gap*0.4,sc,1]); } }
  return ev; }
// ---- views ----
function duSet(view){ DU.view=view; duRender(); }
function duRender(){ if(!RN.on) return;
  const lob = DU.view==="lobby"||DU.view==="bots"||DU.view==="friend"||DU.view==="search";
  document.body.classList.toggle("du-lob", lob); $("duLobby").hidden=!lob; $("duWrap").hidden=lob;
  const duel = !!DU.mode && !lob;
  $("duHud").hidden=!duel; document.querySelectorAll("#runner .gm-opt, #runner .rn-help").forEach(e=>e.hidden=duel||lob);
  $("rnScore").hidden=duel||lob; $("rnBest").hidden=duel||lob; $("duToLobby").hidden = lob || duel;
  $("duCount").hidden = DU.view!=="count"; $("duRes").hidden = DU.view!=="result";
  if(lob) duRenderLobby(); if(duel) duHud(); if(DU.view==="result") duRenderRes(); }
function duAv(i){ return avatarSVG(Math.max(0,Math.min(9,i|0))); }
function duArt(){ const a=q=>document.querySelector("#duModes .du-m-"+q+" .du-art");
  a("online").innerHTML=OBJ.globe(); a("solo").innerHTML=(OBJ[DU.game]||OBJ.games)();
  a("bots").innerHTML=[0,4,9].map(i=>'<span class="du-av">'+duAv(i)+'</span>').join(""); a("friend").innerHTML=[duMyAv(),3].map(i=>'<span class="du-av">'+duAv(i)+'</span>').join(""); }
function duRenderLobby(){ duArt();
  const e=eloGet(); $("duRateAv").innerHTML=duAv(duMyAv()); $("duRate").textContent=e.r+(eloProv(e)?"?":"");
  $("duRateK").textContent=t("duYourElo")(duGameName()); $("duRec").textContent=(e.n ? t("duRecord")(e.w,e.d,e.l) : t("duNew"))+(isPremium()?"":" · "+t("duFreeLeft")(duFreeLeft()));
  document.querySelectorAll("#duCont button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.v===DU.cont)); $("duCont").hidden = DU.view!=="lobby";
  const hl=$("duHist"); hl.innerHTML=""; const H=(e.h||[]).slice(-6).reverse();
  if(!H.length){ const li=document.createElement("li"); li.className="du-hempty"; li.innerHTML="<p><b></b><span></span></p><button type='button' class='btn sm'></button>"; li.querySelector("b").textContent=t("duHistNone"); li.querySelector("span").textContent=t("ruHistX"); const bb=li.querySelector("button"); bb.textContent=t("ruHistGo"); bb.onclick=()=>{ const m=document.querySelector('#duModes [data-m=bots]'); if(m) m.click(); }; hl.appendChild(li); }
  H.forEach(x=>{ const li=document.createElement("li"); li.innerHTML='<span class="r"></span><span class="du-av"></span><b></b><i></i>'; const r=li.querySelector(".r"); r.className="r "+(x.res===1?"w":x.res===0?"l":"d"); r.textContent=x.res===1?t("duW1"):x.res===0?t("duL1"):t("duD1");
    li.querySelector(".du-av").innerHTML=duAv(x.av); nmPut(li.querySelector("b"),x.nm," ("+x.o+")"); const i=li.querySelector("i"); if(x.dd!=null){ i.textContent=(x.dd>=0?"+":"")+x.dd; i.className=x.dd>=0?"up":"down"; } hl.appendChild(li); });
  const sub = DU.view!=="lobby"; $("duModes").hidden=sub; $("duPanel").hidden=!sub;
  if(!sub) return;
  const body=$("duPBody"); body.innerHTML=""; $("duPTitle").textContent=t({bots:"duBots",friend:"duFriend",search:"duOnline"}[DU.view]);
  if(DU.view==="bots"){ const me=eloGet().r, near=duBotFor(me), g=document.createElement("div"); g.className="du-bots";
    if(DU.botPick==null) DU.botPick=near;
    DU_BOTS.forEach((r,i)=>{ const b=document.createElement("button"); b.type="button"; b.className="du-bot"; b.setAttribute("aria-pressed",DU.botPick===i);
      b.innerHTML='<span class="du-av"></span><b></b><small></small>'+(i===near?'<em></em>':''); b.querySelector(".du-av").innerHTML=duAv(i); b.querySelector("b").textContent=t("chars")[i][0]; b.querySelector("small").textContent=r;
      if(i===near) b.querySelector("em").textContent=t("duNear"); b.onclick=()=>{ DU.botPick=i; duRender(); }; g.appendChild(b); });
    body.appendChild(g); const card=document.createElement("div"); card.className="du-bcard";
    card.innerHTML='<span class="du-av"></span><div><b></b><small class="mono"></small><p></p></div>'; card.querySelector(".du-av").innerHTML=duAv(DU.botPick);
    card.querySelector("b").textContent=t("chars")[DU.botPick][0]+" · "+t("chars")[DU.botPick][1]; card.querySelector("small").textContent="ELO "+DU_BOTS[DU.botPick]; card.querySelector("p").textContent=t("duBotDesc")[DU.botPick];
    const go=document.createElement("button"); go.type="button"; go.className="btn primary du-go"; go.id="duBotGo";
    go.textContent=t("duPlayVs")(t("chars")[DU.botPick][0], DU_BOTS[DU.botPick]); duKbd(go,CNAME()); go.onclick=()=>duStartBot(DU.botPick); card.appendChild(go); body.appendChild(card); return; }
  if(DU.view==="friend"){ const w=document.createElement("div"); w.className="du-friend";
    if(DU.ch && !DU.auto){ w.innerHTML='<p class="du-code"><span></span><b class="mono"></b></p><p class="qz-hint"></p><ul class="du-peers"></ul><div class="du-row"><button class="btn" type="button" data-a="copy"></button><button class="btn" type="button" data-a="leave"></button><button class="btn primary" type="button" data-a="go"></button></div>';
      w.querySelector(".du-code span").textContent=t("qzCodeL"); w.querySelector(".du-code b").textContent=DU.code;
      w.querySelector(".qz-hint").textContent = DU.host ? t("duShare") : t("qzWaitHost");
      DU.peers.slice(0,2).forEach(p=>{ const li=document.createElement("li"); li.innerHTML='<span class="du-av"></span><b></b><small></small>'; li.querySelector(".du-av").innerHTML=duAv(p.av); nmPut(li.querySelector("b"),p.name,p.id===netId()?" ("+t("qzYou")+")":""); li.querySelector("small").textContent=p.elo; w.querySelector("ul").appendChild(li); });
      const [cp,lv,go]=w.querySelectorAll(".du-row button"); cp.textContent=t("qzCopyT"); lv.textContent=t("qzLeaveT"); go.textContent=t("duGoT");
      cp.onclick=()=>{ const link=SITE_URL()+"#duel-"+DU.code; try{ navigator.clipboard.writeText(link).then(()=>{ cp.textContent=t("qzCopied"); setTimeout(()=>cp.textContent=t("qzCopyT"),1800); },()=>{}); }catch(e){} };
      lv.onclick=()=>{ duLeaveRoom(); duRender(); }; go.hidden=!DU.host; go.disabled=DU.peers.length<2; go.onclick=duHostStart; }
    else { w.innerHTML='<button class="btn primary" type="button" data-a="create"></button><span class="du-or"></span><div class="du-row"><input class="mono" maxlength="5" autocomplete="off" spellcheck="false" autocapitalize="characters" autocorrect="off" enterkeyhint="go"><button class="btn" type="button" data-a="join"></button></div><p class="qz-hint"></p>';
      const [cr,jn]=w.querySelectorAll("button"), inp=w.querySelector("input"); cr.textContent=t("qzCreateT"); jn.textContent=t("qzJoinT"); inp.placeholder="CODE"; w.querySelector(".du-or").textContent=t("duOr"); w.querySelector(".qz-hint").textContent=t("duFriendHint");
      cr.onclick=()=>duJoin(netCode(),true,false); jn.onclick=()=>{ const c=inp.value.toUpperCase().replace(/[^A-Z2-9]/g,""); if(c.length!==5){ DU.err=t("qzBadCode"); duRender(); return; } duJoin(c,false,false); };
      inp.addEventListener("keydown",e=>{ if(e.key==="Enter") jn.click(); }); }
    const m=document.createElement("p"); m.className="du-err"; m.textContent=DU.err||""; w.appendChild(m); body.appendChild(w); return; }
  if(DU.view==="search"){ const w=document.createElement("div"); w.className="du-search"; const secs=Math.floor((Date.now()-DU.searchAt)/1000), me=eloGet().r;
    w.innerHTML='<span class="du-spin"></span><b></b><small></small><div class="du-row"><button class="btn" type="button"></button></div><p class="du-err"></p>';
    w.querySelector("b").textContent = DU.lobby ? t("duSearching") : t("qzConnecting"); w.querySelector("small").textContent=t("duWindow")(me, duWin(secs), DU.online);
    const c=w.querySelector(".du-row button"); c.textContent=t("qzCancelT"); c.onclick=()=>{ duStopSearch(); duSet("lobby"); };
    if(secs>=20){ const bi=duBotFor(me), b=document.createElement("button"); b.type="button"; b.className="btn primary"; b.id="duSearchBot"; b.textContent=t("duBotWait")(t("chars")[bi][0],DU_BOTS[bi]); duKbd(b,CNAME()); b.onclick=()=>{ duStopSearch(); duStartBot(bi); }; w.querySelector(".du-row").appendChild(b); }
    w.querySelector(".du-err").textContent=DU.err||""; body.appendChild(w); } }
function duKbd(b,k){ if(midiMode() && S.settings.midiC!==false){ const kb=kbdEl(); kb.textContent=k; b.appendChild(kb); } return b; }
function duHud(){ const o=DU.opp||{}, me=DU.me;
  $("duMeAv").innerHTML=duAv(duMyAv()); nmPut($("duMeName"),duMyName()); $("duMeElo").textContent = DU.rated ? String(eloGet().r) : t("duFriendly");
  $("duOpAv").innerHTML=duAv(o.av); nmPut($("duOpName"),o.name,o.bot?" · "+t("duBotTag"):""); $("duOpElo").textContent = o.gone ? t("duGone") : o.done ? t("duOut") : (o.elo!=null?String(o.elo):"");
  [["duMeSc",me.score],["duOpSc",o.score||0]].forEach(([id,v])=>{ const e=$(id); e.textContent=duScTxt(v); if(String(v|0).length>4) e.dataset.long=""; else delete e.dataset.long; });
  $("duHud").dataset.lead = me.score>(o.score||0) ? "me" : me.score<(o.score||0) ? "opp" : ""; }
// ---- a duel ----
function duBegin(o){ // o: {mode, seed, opp, rated, game, cont}
  clearInterval(DU.sim); clearTimeout(DU.countT);
  Object.assign(DU,{mode:o.mode, seed:o.seed>>>0, opp:{...o.opp, score:0, done:false}, rated:!!o.rated, me:{score:0,done:false}, res:null, want:false, oppWant:false, game:o.game||DU.game, cont:o.cont||DU.cont});
  duCount();
  if(DU.rated){ S.duPend={key:duKey(), o:DU.opp.elo, bot:DU.opp.bot!=null, nm:DU.opp.name, av:DU.opp.av}; save(); }
  DU.opp.lastAt=Date.now();
  gRnd=duRng(DU.seed); GM=DU.game; gameOpen(DU.game, true); // resets the game with the shared pool
  gRnd=duRng(DU.seed);
  DU.view="count"; duRender(); let n=3; const cd=$("duCount");
  const tick=()=>{ if(!RN.on||DU.view!=="count") return; if(n>0){ cd.textContent=n; cd.classList.remove("pop"); void cd.offsetWidth; cd.classList.add("pop"); tone(n===1?79:72,0,.12,.1); n--; DU.countT=setTimeout(tick,800); } else duGo(); };
  tick(); }
function duGo(){ DU.view="play"; DU.t0=performance.now(); duRender(); audio();
  clearInterval(DU.hb); if(DU.mode!=="bot"){ DU.opp.lastAt=Date.now(); DU.hb=setInterval(()=>{ if(DU.view!=="play"&&DU.view!=="wait"){ clearInterval(DU.hb); return; } duSend({t:"hb"});
      if(!DU.opp.done && Date.now()-DU.opp.lastAt>25000){ duSend({t:"stall"}); duFinish(1,"forfeit"); } },4000); }
  if(DU.game==="runner"){ RN.state="ready"; rnGo(); } else if(DU.game==="speed") spGo(); else if(DU.game==="douze") dzGo(); else mmGo();
  if(DU.opp.bot!=null && DU.opp.plan){ let i=0; DU.sim=setInterval(()=>{ if(DU.view!=="play"&&DU.view!=="wait"){ clearInterval(DU.sim); return; } if(HOLD) return; const el=performance.now()-DU.t0, P=DU.opp.plan;
      while(i<P.length && P[i][0]<=el){ DU.opp.score=P[i][1]; if(P[i][2]) DU.opp.done=true; i++; } duHud(); duCheck(); },200); } }
function duMe(score, done){ if(!DU.mode || (DU.view!=="play"&&DU.view!=="wait")) return; if(score===DU.me.score && done===DU.me.done) return;
  DU.me={score, done:DU.me.done||done}; if(DU.mode!=="bot") duSend({t:"sc",s:score,d:DU.me.done});
  if(DU.me.done && DU.view==="play"){ DU.view="wait"; } duHud(); duCheck(); }
// the duel is over when both have finished, or when the one still playing has already passed the other's final score
function duCheck(){ if(DU.view!=="play"&&DU.view!=="wait") return; const me=DU.me, o=DU.opp;
  const over = (me.done&&o.done) || (o.done&&me.score>o.score) || (me.done&&o.score>me.score);
  if(!over) { if(DU.view==="wait"){ $("duWait").hidden=false; nmFill($("duWait"),n=>t("duWaitOpp")(n, duScTxt(o.score||0), duScTxt(me.score)),o.name); } return; }
  duFinish(me.score>o.score?1:me.score<o.score?0:.5); }
function duStopGame(){ clearInterval(DU.sim); clearInterval(DU.hb); clearTimeout(DU.countT); clearTimeout(MM.inT); cancelAnimationFrame(SP.raf); MM.timers.forEach(clearTimeout); MM.timers=[]; clearKeys();
  if(RN.state==="run") RN.state="over"; if(SP.state==="run") SP.state="over"; if(MM.state!=="ready") MM.state="over"; }
function duFinish(res, why){ duStopGame(); $("duWait").hidden=true; delete S.duPend; DU.resAt=performance.now();
  const key=duKey(); DU.res={res, why:why||"", me:DU.me.score, opp:DU.opp.score, elo: DU.rated ? eloApply(key, DU.opp.elo, res, DU.opp.bot!=null, DU.opp.name, DU.opp.av) : null};
  if(res===1) tone(84,0,.2,.12), tone(88,.12,.3,.12); else if(res===0) tone(52,0,.4,.15);
  if(DU.me.score){ addXP(Math.min(30,Math.round(DU.me.score/(DU.game==="runner"?10:1)))+(res===1?5:0)); renderStatus(); }
  DU.view="result"; duRender();
  if(DU.ch) try{ DU.ch.track(duMeta({host:DU.host})); }catch(e){} } // the new rating, for a rematch
function duRenderRes(){ const r=DU.res, o=DU.opp, box=$("duRes"); if(!r) return;
  box.dataset.res = r.res===1?"win":r.res===0?"loss":"draw";
  box.innerHTML='<div class="du-rcard"><p class="du-rk"></p><h3></h3><div class="du-rsc"><span><span class="du-av"></span><b class="mono"></b></span><i>–</i><span><b class="mono"></b><span class="du-av"></span></span></div><p class="du-relo"></p><div class="du-row"></div></div>';
  box.querySelector(".du-rk").textContent=duGameName()+" · "+duContName(DU.game,DU.cont)+(DU.rated?" · "+t("duRated"):"");
  box.querySelector("h3").textContent = r.why==="forfeit" ? t("duWinForfeit") : r.why==="stalled" ? t("duStalled") : r.res===1 ? t("duWin") : r.res===0 ? t("duLoss") : t("duDraw");
  const av=box.querySelectorAll(".du-av"), sc=box.querySelectorAll(".du-rsc b"); av[0].innerHTML=duAv(duMyAv()); av[1].innerHTML=duAv(o.av); sc[0].textContent=duScTxt(r.me); sc[1].textContent=duScTxt(r.opp);
  const el=box.querySelector(".du-relo"); if(r.elo){ el.innerHTML='<span></span> <b></b>'; el.firstChild.textContent=t("duNewElo")+" "+r.elo.after; el.lastChild.textContent=(r.elo.d>=0?"+":"")+r.elo.d; el.lastChild.className=r.elo.d>=0?"up":"down"; }
  else el.textContent=t("duUnrated");
  const row=box.querySelector(".du-row"), btn=(txt,cls,fn,k)=>{ const b=document.createElement("button"); b.type="button"; b.className="btn "+cls; b.textContent=txt; b.onclick=fn; if(k) duKbd(b,k); row.appendChild(b); return b; };
  btn(t("duLobby"),"",()=>{ duEnd(); duSet("lobby"); },BNAME()).id="duResLobby";
  if(DU.mode==="bot"){ btn(t("duNewOpp"),"",()=>{ duEnd(); DU.view="bots"; duRender(); }); btn(t("duRematch"),"primary",()=>duStartBot(DU.opp.bot),CNAME()).id="duRematch"; }
  else if(DU.ch && !DU.opp.gone){ if(DU.mode==="online") btn(t("duNewOpp"),"",()=>{ duEnd(); duSearch(); });
    const rm=btn(DU.want?t("duRematchSent"):DU.oppWant?t("duRematchAccept"):t("duRematch"),"primary",duRematch,CNAME()); rm.id="duRematch"; rm.disabled=DU.want; }
  else if(DU.mode==="online") btn(t("duNewOpp"),"primary",()=>{ duEnd(); duSearch(); },CNAME()).id="duRematch";
  const card=box.querySelector(".du-rcard"), sh=document.createElement("button"); sh.type="button"; sh.className="du-share"; sh.id="duShare"; sh.innerHTML=pwI("share")+"<span></span>"; sh.lastChild.textContent=t("shareBtn"); sh.setAttribute("aria-label",t("shareBtn"));
  sh.onclick=()=>shareDuel(); card.appendChild(sh);
  if(DU.mode!=="friend"){ const ch=document.createElement("button"); ch.type="button"; ch.className="du-chal"; ch.id="duChal"; ch.textContent=t("shareChal"); ch.onclick=()=>{ duEnd(); DU.view="friend"; duRender(); duJoin(netCode(),true,false); }; card.appendChild(ch); }
  if(box._r!==r){ box._r=r; duResIn(box, r.res===1); } } // enters once per result (re-renders for a rematch request stay still)
// the result enters (the buttons and C/B work at once): backdrop fade, card rises, ELO change after it, a win's title pops. Reduced motion: fades only.
function duResIn(box, win){ if(!box.animate) return; const cs=getComputedStyle(document.documentElement), EO=cs.getPropertyValue("--ease-out").trim()||"ease-out", EP=cs.getPropertyValue("--ease-pop").trim()||"ease-out";
  const card=box.querySelector(".du-rcard"), d=box.querySelector(".du-relo b"), h=box.querySelector("h3");
  if(matchMedia("(prefers-reduced-motion: reduce)").matches){ box.animate([{opacity:0},{opacity:1}],{duration:150,easing:"ease"}); return; }
  box.animate([{opacity:0},{opacity:1}],{duration:200,easing:"ease"});
  card.animate([{opacity:0,transform:"translateY(8px) scale(.97)"},{opacity:1,transform:"none"}],{duration:300,easing:EO});
  if(d) d.animate([{opacity:0,transform:"translateY(4px)"},{opacity:1,transform:"none"}],{duration:200,delay:250,easing:EO,fill:"backwards"});
  if(win) h.animate([{transform:"scale(.86)"},{transform:"scale(1.08)",offset:.6},{transform:"none"}],{duration:380,easing:EP}); }
function duEnd(){ if(DU.mode && DU.rated && DU.opp && !DU.opp.gone && ["count","play","wait"].includes(DU.view)){ eloApply(duKey(), DU.opp.elo, 0, DU.opp.bot!=null, DU.opp.name, DU.opp.av); duSend({t:"sc",s:DU.me.score,d:true,quit:1}); } // leaving a rated game counts as a loss
  delete S.duPend; duStopGame(); if(DU.ch) duLeaveRoom(); DU.mode=null; DU.opp=null; gRnd=Math.random; }
function duStartBot(i){ if(!duelGate()) return; duEnd(); const seed=(Math.random()*4294967296)>>>0, elo=DU_BOTS[i];
  duBegin({mode:"bot", seed, rated:true, opp:{name:t("chars")[i][0], elo, av:i, bot:i, plan:duBotPlan(elo,DU.game,seed)}}); }
// MIDI: a lone C plays (quick game against the bot of your level, rematch), a lone B goes back to the lobby
const duBlocks = () => DU.view!=="play" && DU.view!=="solo"; // the game itself only takes notes while it is played
function duNote(m){ const pc=((m%12)+12)%12, now=performance.now(), prev=DU.lastNote||0; DU.lastNote=now;
  if(DU.cmdT){ clearTimeout(DU.cmdT); DU.cmdT=0; return duBlocks(); } // a second note: it was a chord
  if(pc!==0&&pc!==11 || !midiMode() || S.settings.midiC===false || now-prev<120 || duBlocks()===false) return duBlocks();
  if(DU.view==="result" && now-(DU.resAt||0)<900) return true;
  DU.cmdT=setTimeout(()=>{ DU.cmdT=0; duCmd(pc); },90); return true; }
function duCmd(pc){
  if(DU.view==="result"){ const b=$(pc===0?"duRematch":"duResLobby"); if(b&&!b.disabled) b.click(); return true; }
  if(DU.view==="bots" && pc===0){ $("duBotGo")?.click(); return true; }
  if(DU.view==="search" && pc===0 && $("duSearchBot")){ $("duSearchBot").click(); return true; }
  if(DU.view==="lobby" && pc===0){ duStartBot(DU.botPick??duBotFor(eloGet().r)); return true; }
  if(pc===11 && ["bots","friend","search"].includes(DU.view)){ duStopSearch(); if(DU.ch && !DU.mode) duLeaveRoom(); duSet("lobby"); return true; }
  return false; }
// ---- online ----
const duWin = secs => secs>=45 ? 9999 : 120+secs*12; // rating window of the matchmaking, wider and wider
function duSafeElo(x){ x=Math.round(+x); return Number.isFinite(x) ? Math.max(100,Math.min(3500,x)) : 800; }
function duPeersOf(ch){ try{ return Object.values(ch.presenceState()).map(a=>a&&a[0]).filter(x=>x&&typeof x.id==="string"&&/^p[a-z0-9]{8}$/.test(x.id))
  .map(x=>({id:x.id,name:qzSafe(x.name)||"?",elo:duSafeElo(x.elo),av:Math.max(0,Math.min(9,x.av|0)),host:!!x.host,wait:!!x.wait,at:+x.at||0,
    game:DU_GAMES.includes(x.game)?x.game:"",cont:duContOk(DU_GAMES.includes(x.game)?x.game:"",x.cont)})).sort((a,b)=>(b.host-a.host)||(a.at-b.at)||(a.id<b.id?-1:1)); }catch(e){ return []; } }
const duMeta = extra => ({id:netId(),name:duMyName(),elo:eloGet().r,av:duMyAv(),game:DU.game,cont:DU.cont,at:DU.searchAt||Date.now(),...extra});
async function duLobbyJoin(){ if(DU.lobby) return; try{ const c=await netSb(); if(!RN.on || !DU.searching || DU.lobby) return; const lb=c.channel("pcd-lobby",{config:{broadcast:{self:false},presence:{key:netId()}}}); DU.lobby=lb;
    lb.on("presence",{event:"sync"},()=>{ const ps=duPeersOf(lb); DU.online=ps.length; duPair(ps); if(DU.view==="search") duRender(); });
    lb.on("broadcast",{event:"match"},({payload:p})=>{ if(!p||p.b!==netId()||!DU.searching||typeof p.room!=="string"||!/^[A-Z2-9]{5}$/.test(p.room)) return;
      DU.searching=false; clearInterval(DU.searchTick); netDrop(lb); DU.lobby=null; duJoin(p.room,false,true); });
    await netSubscribe(lb); if(DU.lobby!==lb) return; await lb.track(duMeta({wait:DU.searching}));
  }catch(e){ DU.lobby=null; DU.err=t("qzNetErr"); DU.searching=false; duRender(); } }
async function duSearch(){ DU.err=""; DU.searching=true; DU.searchAt=Date.now(); DU.view="search"; duRender(); clearInterval(DU.searchTick);
  DU.searchTick=setInterval(()=>{ if(DU.view!=="search"){ clearInterval(DU.searchTick); return; } if(DU.lobby) duPair(duPeersOf(DU.lobby)); duRender(); },1000);
  await duLobbyJoin(); if(DU.lobby && DU.searching) DU.lobby.track(duMeta({wait:true})); }
function duStopSearch(){ DU.searching=false; clearInterval(DU.searchTick); if(DU.lobby) netDrop(DU.lobby); DU.lobby=null; if(DU.ch && DU.auto && !DU.mode) duLeaveRoom(); }
// greedy pairing in arrival order, the same on every client: the older player of a pair creates the room
function duPair(ps){ if(!DU.searching) return; const now=Date.now(), w=ps.filter(p=>p.wait&&p.game===DU.game&&p.cont===DU.cont).sort((a,b)=>(a.at-b.at)||(a.id<b.id?-1:1)), used=new Set();
  for(const a of w){ if(used.has(a.id)) continue; const win=duWin((now-a.at)/1000); const b=w.find(x=>x.id!==a.id&&!used.has(x.id)&&Math.abs(x.elo-a.elo)<=win); if(!b) continue; used.add(a.id); used.add(b.id);
    if(a.id===netId()){ const room=netCode(), lb=DU.lobby; DU.searching=false; clearInterval(DU.searchTick); lb.send({type:"broadcast",event:"match",payload:{room,a:a.id,b:b.id}}); setTimeout(()=>netDrop(lb),1500); DU.lobby=null; duJoin(room,true,true); return; }
    if(b.id===netId()) return; } }
async function duJoin(code,asHost,auto){ try{ const c=await netSb(); if(!RN.on) return; if(DU.ch) netDrop(DU.ch);
    const ch=c.channel("pcd-room-"+code,{config:{broadcast:{self:false},presence:{key:netId()}}});
    Object.assign(DU,{ch,code,host:asHost,auto,peers:[],err:""}); if(!auto) DU.view="friend";
    ch.on("broadcast",{event:"m"},({payload})=>duRecv(payload));
    ch.on("presence",{event:"sync"},()=>{ DU.peers=duPeersOf(ch); duPeers(); });
    await netSubscribe(ch); await ch.track(duMeta({host:asHost})); duRender();
    setTimeout(()=>{ if(DU.ch===ch && !asHost && !DU.peers.some(p=>p.host)){ duLeaveRoom(); if(auto){ duSearch(); return; } DU.err=t("qzNoRoom"); duSet("friend"); } },5000);
    if(auto && asHost) setTimeout(()=>{ if(DU.ch===ch && DU.peers.length<2 && !DU.mode){ duLeaveRoom(); duSearch(); } },6000); // the other one never came: search again
  }catch(e){ DU.err=t("qzNetErr"); duRender(); } }
function duSend(p){ if(DU.ch) try{ DU.ch.send({type:"broadcast",event:"m",payload:{...p, from:netId()}}); }catch(e){} }
function duLeaveRoom(){ if(DU.ch) netDrop(DU.ch); Object.assign(DU,{ch:null,code:"",host:false,peers:[],auto:false}); }
function duPeers(){ const P=DU.peers;
  if(DU.mode && DU.mode!=="bot" && DU.opp && !DU.opp.gone && !P.some(p=>p.id===DU.opp.id)){ // the other one left
    DU.opp.gone=true; if(DU.view==="play"||DU.view==="wait"||DU.view==="count"){ duFinish(1,"forfeit"); return; } if(DU.view==="result"){ duRender(); return; } }
  if(DU.host && DU.auto && P.length>=2 && !DU.mode){ duHostStart(); return; }
  if(DU.view==="friend") duRender(); }
function duHostStart(){ if(!DU.host||DU.peers.length<2) return; const opp=DU.peers.find(p=>p.id!==netId()); if(!opp) return;
  const me=DU.peers.find(p=>p.id===netId())||duMeta({});
  const p={t:"start",seed:(Math.random()*4294967296)>>>0,game:DU.game,cont:DU.cont,rated:!!DU.auto,players:[{id:me.id,name:me.name,elo:eloGet().r,av:duMyAv()},{id:opp.id,name:opp.name,elo:opp.elo,av:opp.av}]};
  duSend(p); duStartOnline(p); }
function duStartOnline(p){ const opp=p.players.find(x=>x.id!==netId()); if(!opp) return;
  duBegin({mode:p.rated?"online":"friend", seed:p.seed, rated:p.rated, game:p.game, cont:p.cont, opp:{id:opp.id,name:opp.name,elo:opp.elo,av:opp.av}}); }
function duRecv(m){ if(!m||typeof m!=="object") return;
  if(m.t==="start" && !DU.host){ if(typeof m.from!=="string" || m.from===netId() || !Array.isArray(m.players) || !m.players.some(x=>x&&x.id===m.from) || (DU.peers.length && !DU.peers.some(p=>p.host && p.id===m.from)) || (DU.mode && DU.view!=="result") || !["friend","search","result","lobby"].includes(DU.view)) return;
    if(!DU_GAMES.includes(m.game)||!Number.isInteger(m.seed)||!Array.isArray(m.players)||m.players.length!==2) return;
    const players=m.players.filter(x=>x&&typeof x.id==="string").map(x=>({id:x.id,name:qzSafe(x.name)||"?",elo:duSafeElo(x.elo),av:Math.max(0,Math.min(9,x.av|0))}));
    if(!players.some(x=>x.id===netId())) return;
    duStartOnline({seed:m.seed>>>0,game:m.game,cont:duContOk(m.game,m.cont),rated:!!m.rated&&!!DU.auto,players}); return; }
  if(!DU.mode||!DU.opp||m.from!==DU.opp.id) return;
  DU.opp.lastAt=Date.now();
  if(m.t==="stall" && ["play","wait"].includes(DU.view)){ duFinish(0,"stalled"); return; }
  if(m.t==="sc" && m.quit && !DU.opp.gone){ DU.opp.gone=true; if(["count","play","wait"].includes(DU.view)) duFinish(1,"forfeit"); else duRender(); return; }
  if(m.t==="sc" && Number.isInteger(m.s) && m.s>=0 && m.s<100000){ DU.opp.score=m.s; if(m.d) DU.opp.done=true; duHud(); duCheck(); return; }
  if(m.t==="re" && DU.view==="result"){ DU.oppWant=true; if(DU.want && DU.host) duHostStart(); else duRender(); } }
function duRematch(){ if(DU.mode==="bot"){ duStartBot(DU.opp.bot); return; } DU.want=true; duSend({t:"re"}); if(DU.oppWant && DU.host) duHostStart(); else duRender(); }
// a shared link pianochallenges.com/#duel-ABCDE opens the games and joins that room (the host picks the game)
function duFromHash(){ const m=/^#duel-([A-Z2-9]{5})$/.exec(location.hash||""); if(!m) return; history.replaceState(null,"",location.pathname+location.search);
  openPage("games"); gameOpen("runner"); duJoin(m[1],false,false); }
setTimeout(duFromHash,0);
setTimeout(()=>{ if(S.duPend){ const pd=S.duPend; delete S.duPend; try{ eloApply(pd.key, pd.o, 0, pd.bot, pd.nm, pd.av); }catch(e){} save(); } },0); // a rated duel left by closing the app (after the whole script: eloApply needs qzSafe, declared further down)
// ---- lobby buttons ----
$("duModes").addEventListener("click",e=>{ const b=e.target.closest("[data-m]"); if(!b) return; const m=b.dataset.m; DU.err="";
  if(m==="solo"){ DU.view="solo"; duRender(); gameOpen(DU.game,true); return; }
  if(!duelGate()) return;
  if(m==="online"){ duSearch(); return; } if(m==="bots"){ DU.botPick=null; duSet("bots"); return; } duSet("friend"); });
$("duCont").addEventListener("click",e=>{ const b=e.target.closest("[data-v]"); if(!b) return; DU.cont=b.dataset.v; S.settings.duCont=DU.cont; save(); DU.botPick=null; duRender(); });
$("duPBack").addEventListener("click",()=>{ duStopSearch(); if(DU.ch && !DU.mode) duLeaveRoom(); duSet("lobby"); });
$("duToLobby").addEventListener("click",()=>{ duEnd(); gameOpen(DU.game,true); duSet("lobby"); });

