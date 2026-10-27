// fragment de l'IIFE principale — ordre 330, voir src/app/README.md
// ---------- a game ----------
function qzBotPlayers(n,lvl,from){ return Array.from({length:n},(_,i)=>({name:QZ_BOTS[i%3], col:QZ_COLORS[from+i], bot:lvl, av:QZ_BOT_AV[lvl-1][i%3], ph:"", score:0, shown:0, ok:0})); }
function qzStart(){ const c=qzCfg(); if(!QZ.data) return; if(c.where!=="online" && c.n>1 && c.mode==="zone" && qzZoneSmall(qzZones(c.n))) return;
  const src=QZ.data.q.filter(q=>c.theme==="all"||q[0]===c.theme);
  QZ.list=qzShuffle(src.slice()).slice(0,Math.min(c.count,src.length)); QZ.cfg={diff:c.diff,ans:c.ans,time:c.time,keys:c.keys};
  const myAv=qzMyAv(), others=[3,6,1,9,4].filter(x=>x!==myAv); // player 1 = this account (photo or level), the friends next to them get other characters
  QZ.players=Array.from({length:c.n},(_,i)=>({name:c.names[i]||t("qzPlayer")+" "+(i+1), col:QZ_COLORS[i], dev:c.n===1||c.mode!=="dev"?null:c.devs[i], av:i?others[i-1]:myAv, ph:i?"":qzMyPhoto(), score:0, shown:0, ok:0, zone:c.mode==="zone"&&c.n>1?qzZones(c.n)[i]:null}))
    .concat(qzBotPlayers(c.bots,c.botLvl,c.n));
  QZ.gid=(QZ.gid||0)+1; QZ.mode=c.n===1?"solo":c.mode; QZ.zoneDev = c.mode==="zone" && qzDevices().some(d=>d[0]===c.zoneDev&&d[0]!=="screen") ? c.zoneDev : null; QZ.i=-1; QZ.turn=-1; QZ.view="play"; audio(); qzNext(); }
function qzClearTimers(){ cancelAnimationFrame(QZ.raf); clearTimeout(QZ.revealT); QZ.botT.forEach(clearTimeout); QZ.botT=[]; }
function qzNext(){ if(QZ.mode==="online" && !NET.host) return; const i=QZ.i+1; if(i>=QZ.list.length){ if(QZ.mode==="online") netSend({type:"end"}); qzFinish(); return; }
  if(QZ.mode==="online") netSend({type:"q",i}); qzShowQ(i); }
function qzShowQ(i){ qzClearTimers(); QZ.i=i; const cf=QZ.cfg, q=QZ.list[i], fr=S.settings.lang==="fr";
  const answers=(fr?q[3]:q[5]).map((a,o)=>({txt:a, right:o===0, o})); qzShuffle(answers); const tg=qzTargets(cf.diff,cf.ans); answers.forEach((a,k)=>a.tg=tg[k]);
  QZ.ans=answers; QZ.q=q; QZ.picks={}; QZ.ms={}; QZ.buf={}; QZ.done=false; const humans=QZ.players.filter(p=>!p.bot).length; QZ.turn=(QZ.turn+1)%Math.max(1,humans);
  QZ.dur=cf.time*1000; QZ.t0=performance.now();
  // bots answer after a while, more or less right depending on their level
  QZ.botPlan=[];
  QZ.players.forEach((p,pi)=>{ if(!p.bot || (QZ.mode==="online" && !NET.host)) return; const L=p.bot, acc=[.55,.75,.92][L-1], rng=[[.3,.75],[.18,.5],[.08,.3]][L-1];
    const ms=QZ.dur*(rng[0]+Math.random()*(rng[1]-rng[0])), right=Math.random()<acc, k=right?QZ.ans.findIndex(a=>a.right):QZ.ans.findIndex(a=>!a.right);
    QZ.botPlan.push({pi,k,ms,i}); });
  qzArmBots(); renderQuiz(); QZ.raf=requestAnimationFrame(qzTick); }
// the robots' answers of this question, each at its time (counted from QZ.t0, which moves on after a pause)
function qzArmBots(){ const el=performance.now()-QZ.t0; (QZ.botPlan||[]).forEach(({pi,k,ms,i})=>{ if(QZ.picks[pi]!=null || i!==QZ.i) return; const p=QZ.players[pi];
  QZ.botT.push(setTimeout(()=>{ if(!QZ.done && QZ.i===i){ qzPick(pi,k,ms); if(QZ.mode==="online") netSend({type:"ans",id:p.id,i,o:QZ.ans[k].o,ms:Math.round(ms)}); } },Math.max(0,ms-el))); }); }
// the leave window holds a local quiz still: the clock, the robots and the next question wait
function qzHold(on,d){ if(QZ.view!=="play") return; if(on){ cancelAnimationFrame(QZ.raf); clearTimeout(QZ.revealT); QZ.botT.forEach(clearTimeout); QZ.botT=[]; return; }
  if(QZ.done){ const left=Math.max(800,4200-(LV.at-QZ.doneAt)); QZ.doneAt+=d; QZ.revealT=setTimeout(()=>{ if(page==="quiz"&&QZ.view==="play"&&QZ.done) qzNext(); },left); }
  else { QZ.t0+=d; qzArmBots(); QZ.raf=requestAnimationFrame(qzTick); } }
function qzTick(){ if(page!=="quiz"||QZ.view!=="play"||QZ.done) return; const left=Math.max(0,1-(performance.now()-QZ.t0)/QZ.dur); const b=$("qzBar"); if(b) b.style.transform="scaleX("+left+")";
  if(left<=0){ if(QZ.mode!=="online"||NET.host) qzReveal(); return; } QZ.raf=requestAnimationFrame(qzTick); }
// which local player played this note?
function qzWho(dev,m){ const P=QZ.players; if(QZ.mode==="online") return P.findIndex(p=>p.me); if(QZ.mode==="solo") return 0;
  if(QZ.mode==="turn"){ const hs=P.map((p,i)=>p.bot?-1:i).filter(i=>i>=0); return hs[QZ.turn]; }
  if(QZ.mode==="zone"){ if(QZ.zoneDev && dev!==QZ.zoneDev) return -1; return P.findIndex(p=>!p.bot&&p.zone&&m>=p.zone[0]&&m<=p.zone[1]); }
  return P.findIndex(p=>!p.bot&&p.dev===dev); }
function quizIn(dev,m){ if(S.settings.midiC!==false && (QZ.view==="end" || (QZ.view==="play" && QZ.done))){ qzShortcut(m); return; }
  if(QZ.view!=="play"||QZ.done) return;
  const pi=qzWho(dev,m); if(pi==null||pi<0 || QZ.picks[pi]!=null) return;
  const now=performance.now(), b=QZ.buf[pi]||(QZ.buf[pi]={notes:[],timer:0,at:0}); if(now-b.at>900) b.notes=[]; b.at=now; b.notes.push(m%12);
  clearTimeout(b.timer); b.timer=setTimeout(()=>{ const set=[...new Set(b.notes)].sort((a,c)=>a-c).join(",");
    const k=QZ.ans.findIndex(a=>a.tg.pcs.slice().sort((x,y)=>x-y).join(",")===set); if(k<0){ b.notes=[]; return; } qzLocalPick(pi,k); },170); }
// after the answer is shown: a lone C = next question; at the end: C or B = play again (a chord is ignored)
function qzShortcut(m){ const b=QZ.sc||(QZ.sc={notes:[],t:0,at:0}), now=performance.now(); if(now-b.at>400) b.notes=[]; b.at=now; b.notes.push(m%12); clearTimeout(b.t);
  b.t=setTimeout(()=>{ if(b.notes.length!==1) return; const pc=b.notes[0];
    if(QZ.view==="play" && QZ.done && pc===0 && (QZ.mode!=="online"||NET.host) && performance.now()-QZ.doneAt>600) qzNext();
    else if(QZ.view==="end" && (pc===0||pc===11) && (QZ.mode!=="online"||NET.host)) $("qzAgain").click(); },120); }
function qzLocalPick(pi,k){ if(QZ.done||QZ.picks[pi]!=null) return; const ms=performance.now()-QZ.t0; qzPick(pi,k,ms);
  if(QZ.mode==="online") netSend({type:"ans",id:QZ.players[pi].id,i:QZ.i,o:QZ.ans[k].o,ms:Math.round(ms)}); }
function qzPick(pi,k,ms){ if(QZ.done||QZ.picks[pi]!=null||!QZ.ans[k]) return; const a=QZ.ans[k], p=QZ.players[pi], left=Math.max(0,1-ms/QZ.dur);
  QZ.picks[pi]=k; if(a.right){ const pts=100+Math.round(100*left); p.score+=pts; p.ok++; p.last=pts; } else p.last=0;
  const live=QZ.players.map((p,i)=>i).filter(i=>!QZ.players[i].gone);
  const exp = QZ.mode==="solo"||QZ.mode==="turn" ? live.filter(i=>QZ.players[i].bot || i===qzWho("",0)) : live; // solo / turn: the human who answers and the bots
  const all = exp.every(i=>QZ.picks[i]!=null);
  if(all && (QZ.mode!=="online"||NET.host)) qzReveal(); else renderQzPlay(); }
function qzReveal(fromNet){ if(QZ.done) return; QZ.done=true; QZ.doneAt=performance.now(); qzClearTimers(); QZ.players.forEach(p=>p.shown=p.score);
  if(QZ.mode==="online" && NET.host && !fromNet) netSend({type:"reveal",i:QZ.i});
  const r=QZ.ans.findIndex(a=>a.right); if(uiSound()) QZ.ans[r].tg.mid.forEach((m,i)=>tone(m,i*.03,.9,.16));
  renderQzPlay(); if(QZ.mode!=="online"||NET.host) QZ.revealT=setTimeout(()=>{ if(page==="quiz"&&QZ.view==="play"&&QZ.done) qzNext(); },4200); }
// answer k touched on screen (its card or its key on the quiz piano)
function qzTap(k){ const a=QZ.ans[k]; if(QZ.done||!a) return; if(uiSound()) a.tg.mid.forEach((m,i)=>tone(m,i*.02,.7,.14));
  if(QZ.mode==="zone") return; // one shared piano: a tap cannot tell who answered
  const pi = QZ.mode==="dev" ? QZ.players.findIndex(p=>!p.bot&&p.dev==="screen") : qzWho("screen",a.tg.mid[0]);
  if(pi!=null && pi>=0) qzLocalPick(pi,k); }
// the quiz piano (one octave): each answer is a key in its colour, named; chords are answered on their root
function renderQzKb(){ const kb=$("qzKb"); if(!kb) return; kb.innerHTML=""; kb.setAttribute("aria-label",t("qzKbL"));
  const R=qzRoots(), own={}, cnt={}; QZ.ans.forEach(a=>{ const r=a.tg.pcs[0]; cnt[r]=(cnt[r]||0)+1; });
  QZ.ans.forEach((a,k)=>{ const r=a.tg.pcs[0]; if(cnt[r]===1) own[r]=k; });
  const W=[0,2,4,5,7,9,11], B=[[1,0],[3,1],[6,3],[8,4],[10,5]], col=["#ff5a6e","#3cc8f0","#ffd23f","#3ddc84"], ch=QZ.ans.some(a=>a.tg.pcs.length>1);
  // help "show the keys to play" off: the keys stay neutral (note names only with the note-names option); at the reveal the right key lights up anyway
  const help=!!(QZ.cfg&&QZ.cfg.keys); kb.classList.toggle("plain",!help);
  const key=(pc,cls)=>{ const b=document.createElement("button"); b.type="button"; b.className=cls; const k=own[pc], a=k!=null?QZ.ans[k]:null, lit=a&&(help||(QZ.done&&a.right));
    b.innerHTML='<span></span>'; b.firstChild.textContent = lit ? (a.tg.sym||a.tg.name) : (help||S.settings.labels) ? R[pc] : "";
    if(a && !lit){ b.setAttribute("aria-label",R[pc]); if(QZ.done){ const who=qzPickers(k); if(who.length){ const w=document.createElement("span"); w.className="qz-kw"; w.setAttribute("aria-hidden","true");
        who.forEach(p=>{ const d=document.createElement("i"); d.className="av"; d.style.setProperty("--pc",p.col); avFill(d,p.ph,p.av); w.appendChild(d); }); b.appendChild(w); } } }
    else if(a){ b.classList.add("ans"); b.style.setProperty("--ac",col[k]); b.setAttribute("aria-label",a.tg.name+" : "+a.txt);
      if(QZ.done){ b.classList.add(a.right?"right":"wrong"); const who=qzPickers(k); if(who.length){ const w=document.createElement("span"); w.className="qz-kw"; w.setAttribute("aria-hidden","true");
        who.forEach(p=>{ const d=document.createElement("i"); d.className="av"; d.style.setProperty("--pc",p.col); avFill(d,p.ph,p.av); w.appendChild(d); }); b.appendChild(w); } } } else b.setAttribute("aria-label",R[pc]);
    if(ch && lit) b.classList.add("chd");
    b.addEventListener("pointerdown",e=>{ if(e.button>0) return; b.classList.add("dn"); setTimeout(()=>b.classList.remove("dn"),160);
      if(k!=null) qzTap(k); else if(uiSound()) tone(60+pc,0,.5,.14); });
    b.addEventListener("click",e=>{ if(e.detail===0 && k!=null) qzTap(k); }); // keyboard (Enter / Space)
    return b; };
  W.forEach(pc=>kb.appendChild(key(pc,"qz-w")));
  B.forEach(([pc,i])=>{ const b=key(pc,"qz-b"); b.style.left="calc("+(i+1)+" * 100% / 7 - 4.6%)"; kb.appendChild(b); }); }
// who chose answer k / which player is alone on this screen (solo, online: may see their own choice)
const qzPickers = k => QZ.players.filter((p,i)=>QZ.picks[i]===k);
const qzMine = () => QZ.mode==="solo" ? 0 : QZ.mode==="online" ? QZ.players.findIndex(p=>p.me) : -1;
const qzShort = (s,bot) => gCut(bot?pName(s).split(/\s+/).pop():pName(s),10,24).trim(); // short name on the answers and the staff ("Mozart" for Robo Mozart)
// the race: a staff from the clef to the final bar line, each player is a note whose head is their face, one space each;
// it moves at the reveal by score / best possible score (200 points a question: the faster right answers go further)
const QZ_SPACES=[[2],[1,2],[0,1,2],[0,1,2,3]];
function renderQzRace(turnP){ const box=$("qzRace"); if(!box) return; const P=QZ.players, end=QZ.view==="end";
  const slot=end?$("qzRaceEnd"):$("qzKb"); if(slot){ if(end){ if(box.parentElement!==slot) slot.appendChild(box); } else if(box.previousElementSibling!==slot) slot.after(box); }
  const key=QZ.gid+":"+P.map(p=>p.id||p.name).join("|");
  // three layers moving together: stems, then heads (faces), then name tags, so a name is never hidden by a stem or a neighbour's head
  if(box.dataset.k!==key){ box.dataset.k=key; box.innerHTML='<div class="qz-staff"><svg class="qz-clef" viewBox="0 0 30 40" aria-hidden="true"><text x="2" y="30" font-size="33">\uE050</text></svg><div class="qz-track"><div class="qz-lay qz-stems" aria-hidden="true"></div><div class="qz-lay qz-heads"></div><div class="qz-lay qz-tags" aria-hidden="true"></div></div><span class="qz-fin" aria-hidden="true"></span></div>';
    box.setAttribute("aria-label",t("qzRaceL")); const L=box.querySelectorAll(".qz-lay"), sp=QZ_SPACES[Math.min(4,P.length)-1]||[0,1,2,3];
    P.forEach((p,i)=>{ const cls="qz-ln s"+(sp[i]!=null?sp[i]:i%4), mk=(lay,html)=>{ const d=document.createElement("div"); d.className=cls; d.style.setProperty("--pc",p.col); d.innerHTML=html; L[lay].appendChild(d); return d; };
      mk(0,'<span class="qz-st"></span>'); const h=mk(1,'<span class="qz-hd"><i class="av"></i><i class="qz-ok"></i></span>'); h.setAttribute("role","listitem");
      const tg=mk(2,'<span class="qz-tg"><b></b><span class="qz-pts"></span><small></small></span>');
      avFill(h.querySelector(".av"),p.ph,p.av); nmPut(tg.querySelector("b"),qzShort(p.name,p.bot),p.me?" ("+t("qzYou")+")":""); tg.querySelector("b").title=pName(p.name); });
    if(document.fonts&&document.fonts.load) document.fonts.load("40px Bravura").then(()=>box.classList.add("fnt")).catch(()=>{}); }
  const max=200*Math.max(1,QZ.list.length), top=Math.max(...P.map(p=>p.shown||0)), lead=P.filter(p=>(p.shown||0)===top).length===1&&top>0;
  const L=[...box.querySelectorAll(".qz-lay")].map(x=>x.children), tw=box.querySelector(".qz-track").clientWidth;
  P.forEach((p,i)=>{ const els=[L[0][i],L[1][i],L[2][i]]; if(!els[2]) return; const st=QZ.picks[i], done=QZ.done||end, f=Math.min(1,(p.shown||0)/max);
    const ok=!end&&QZ.done&&st!=null&&QZ.ans[st]&&QZ.ans[st].right;
    const cl={lead:lead&&(p.shown||0)===top, gone:!!p.gone, turn:!done&&turnP===p, ans:!end&&st!=null, wait:!done&&st==null&&!p.gone, ok:!!ok, ko:!end&&QZ.done&&st!=null&&!ok};
    els.forEach(e=>{ e.style.transform="translateX("+(f*100).toFixed(2)+"%)"; for(const c in cl) e.classList.toggle(c,cl[c]); });
    const stt = end ? "" : p.gone ? t("qzLeft") : st==null ? (QZ.done?t("qzNoAns"):"") : !QZ.done ? t("qzAnswered") : ok ? "+"+fmtN(p.last) : t("qzWrong");
    els[2].querySelector(".qz-pts").textContent=fmtN(p.shown||0); els[2].querySelector("small").textContent=stt;
    // the name goes after the note, or before it when it would cross the final bar line
    if(tw){ const hd=els[1].firstChild.offsetWidth, run=tw-hd, w=els[2].firstChild.offsetWidth+12; els[2].classList.toggle("flip", w>(1-f)*run && f*run>(1-f)*run); }
    els[1].setAttribute("aria-label",pName(p.name)+" : "+fmtN(p.shown||0)+" pts"+(stt?" · "+stt:"")); }); }
function renderQzPlay(){ if(!QZ.q) return; const q=QZ.q, fr=S.settings.lang==="fr", th=QZ.data.themes[q[0]]||{fr:"",en:"",col:"#6a4bf0"}, cf=QZ.cfg;
  const chip=$("qzTheme"); chip.lastChild.textContent=fr?th.fr:th.en; chip.style.setProperty("--tc",th.col); if(chip.dataset.img!==th.img){ chip.dataset.img=th.img||""; chip.firstChild.innerHTML=OBJ[th.img]?OBJ[th.img]():""; }
  { const n=t("qzQ")(QZ.i+1,QZ.list.length), j=n.indexOf(String(QZ.i+1)), el=$("qzNum"); el.innerHTML='<span class="qn-w"></span><span></span>'; el.firstChild.textContent=n.slice(0,j); el.lastChild.textContent=n.slice(j); } // phones: "1 / 10"
  $("qzImg").innerHTML=OBJ[q[1]]?OBJ[q[1]]():""; $("qzImg").style.setProperty("--tc",th.col);
  $("qzText").textContent=fr?q[2]:q[4];
  const turnP = QZ.mode==="turn" ? QZ.players[qzWho("",0)] : null;
  $("qzTurn").hidden = !turnP; if(turnP){ nmFill($("qzTurn"),t("qzTurnOf"),turnP.name); $("qzTurn").style.setProperty("--pc",turnP.col); }
  const box=$("qzAns"); box.innerHTML=""; const mine=qzMine();
  QZ.ans.forEach((a,k)=>{ const b=document.createElement("button"); b.type="button"; b.className="qz-a"; b.style.setProperty("--ac",["#ff5a6e","#3cc8f0","#ffd23f","#3ddc84"][k]);
    if(QZ.done) b.classList.add(a.right?"right":"wrong");
    b.innerHTML='<span class="qz-l"></span><span class="qz-at"></span><span class="qz-who"></span>'; b.dataset.pcs=a.tg.pcs.join(",");
    const lb=b.querySelector(".qz-l"); lb.innerHTML='<span class="ln"></span><span class="sh"></span>'; lb.firstChild.textContent=a.tg.name; lb.lastChild.textContent=a.tg.sym||a.tg.name; b.querySelector(".qz-at").textContent=a.txt; b.setAttribute("aria-label",t("qzPlay")+" "+a.tg.name+" : "+a.txt);
    const who=b.querySelector(".qz-who"), pk=QZ.done?qzPickers(k):[]; // before the reveal nothing tells who chose what (the others could copy)
    pk.forEach(p=>{ const d=document.createElement("span"); d.className="qz-wc"; d.style.setProperty("--pc",p.col); d.innerHTML='<i class="av"></i><b></b>'; avFill(d.firstChild,p.ph,p.av); nmPut(d.lastChild,qzShort(p.name,p.bot)); who.appendChild(d); });
    if(pk.length>2) who.classList.add("many"); if(pk.length) b.setAttribute("aria-label",b.getAttribute("aria-label")+" · "+pk.map(p=>pName(p.name)).join(", "));
    if(!QZ.done && QZ.picks[mine]===k) b.classList.add("mine"); // alone on this screen (solo, online): your own choice stays, discreet
    b.onclick=()=>qzTap(k);
    box.appendChild(b); });
  renderQzKb();
  renderQzRace(turnP);
  $("qzNext").hidden=!QZ.done || (QZ.mode==="online" && !NET.host); $("qzBar").parentElement.hidden=QZ.done;
  $("qzNext").innerHTML='<span class="nx-l"></span><span class="nx-s"></span>'; $("qzNext").firstChild.textContent=t("qzNextT"); $("qzNext").lastChild.textContent=t("qzNextS"); if(midiReady && S.settings.midiC!==false){ const kb=kbdEl(); kb.textContent=CNAME(); $("qzNext").appendChild(kb); }
}
function qzFinish(){ qzClearTimers(); QZ.view="end"; QZ.players.forEach(p=>p.shown=p.score); const me=QZ.players.filter(p=>!p.bot&&!p.remote);
  if(me.length===1 && me[0].ok) addXP(Math.min(60,me[0].ok*3)); save(); renderQuiz(); if(QZ.players.some(p=>p.ok) && uiSound()) setTimeout(()=>confetti(),200); }
function renderQzEnd(){ const P=QZ.players.map((p,i)=>({...p,i})).sort((a,b)=>b.score-a.score), box=$("qzPodium"); box.innerHTML="";
  const humans=QZ.players.filter(p=>!p.bot).length;
  if(QZ.players.length>1 && P[0].score===P[1].score) $("qzEndT").textContent=t("qzDraw"); // a tie at the top (0 – 0 included) has no winner
  else if(QZ.players.length>1) nmFill($("qzEndT"),t("qzWinner"),P[0].name); else $("qzEndT").textContent=t("qzSoloEnd")(P[0].ok,QZ.list.length);
  P.forEach((p,r)=>{ const d=document.createElement("div"); d.className="qz-pod r"+(r+1); d.style.setProperty("--pc",p.col);
    d.innerHTML='<span class="qz-rk">'+(r+1)+'</span><b></b><span class="qz-sc"></span><small></small>'; nmPut(d.querySelector("b"),p.name); d.querySelector(".qz-sc").textContent=fmtN(p.score)+" pts"; d.querySelector("small").textContent=t("qzRight")(p.ok,QZ.list.length); box.appendChild(d); });
  renderQzRace(null);
  $("qzAgain").hidden = QZ.mode==="online" && !NET.host; $("qzAgain").textContent=t("qzAgainT"); if(midiReady && S.settings.midiC!==false){ const kb=kbdEl(); kb.textContent=CNAME()+" / "+BNAME(); $("qzAgain").appendChild(kb); } }
function qzQuit(){ qzClearTimers(); if(QZ.mode==="online") netLeave(); QZ.view="setup"; QZ.done=true; renderQuiz(); }
$("qzGo").addEventListener("click",qzStart);
$("qzNext").addEventListener("click",()=>{ if(QZ.done) qzNext(); });
$("qzQuit").addEventListener("click",qzQuit);
$("qzAgain").addEventListener("click",()=>{ if(QZ.mode==="online"){ if(NET.host) netStartGame(); } else qzStart(); });
$("qzBack").addEventListener("click",()=>{ if(QZ.mode==="online") netLeave(); QZ.view="setup"; renderQuiz(); });
$("qzKeysOpt").addEventListener("change",e=>{ qzCfg().keys=e.target.checked; save(); });
$("qzToPlayers").addEventListener("click",()=>{ QZ.tab="players"; renderQzSetup(); });
document.addEventListener("keydown",e=>{ if(page!=="quiz"||anyModal()) return; if(e.target.closest("input,select,textarea")) return;
  if((e.code==="Space"||e.code==="Enter") && QZ.view==="play" && QZ.done && (QZ.mode!=="online"||NET.host)){ e.preventDefault(); qzNext(); } });

