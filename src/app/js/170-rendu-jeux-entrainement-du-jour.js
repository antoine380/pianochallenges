// fragment de l'IIFE principale — ordre 170, voir src/app/README.md
// ---------- Rendering ----------
function resetScore(){
  const n = seq.length || (chordLike(S.section)?3:S.section==="prog"?4:(S.settings.octave?8:7));
  $("feedback").className="score-box"; $("sbLabel").textContent=tx("correct"); $("sbMiss").hidden=true; $("srNote").textContent="";
  if(S.section==="ear"){ $("sbLabel").textContent=t("answerLbl"); $("sbVal").innerHTML="—"; $("sbDetail").textContent=""; return; }
  $("sbVal").innerHTML='—<span class="of"> / '+n+'</span>'; $("sbDetail").textContent="";
}
// ---------- Round score + session ----------
// ---------- Games, spaced repetition, daily practice ----------
let game=null, endOpen=false, lastGame=null;
const SRS_DAYS=[0,1,2,4,7,14,30];
const dayStr = (d=new Date()) => { const z=new Date(d.getTime()-d.getTimezoneOffset()*6e4); return z.toISOString().slice(0,10); };
const addDays = n => { const d=new Date(); d.setDate(d.getDate()+n); return dayStr(d); }; // calendar days (DST-safe), also used by the SRS
function makeGame(queue, daily){
  lvlUp=0;
  const n = queue ? queue.length : (S.settings.gameLen||Infinity);
  return {queue:queue||null, daily:!!daily, total:n, i:0, results:[], xp0:S.xp, sk0:effStreak(), maxCombo:0, sec:S.section};
}
function roundLevel(){
  if(cur.sec==="ear") return errors?"bad":"good";
  const f=(seq.length-idx)+errors; return f===0?"good":f<=3?"warn":"bad";
}
function stripItem(it){ const o={sec:it.sec,tid:it.tid,k:it.k}; if(it.inv!=null) o.inv=it.inv; if(it.deg!=null) o.deg=it.deg; if(it.ch) o.ch=1; return o; }
function record(level, secs){
  // first finish of the current exercise only: retries never change the result
  if(!game || game.results[game.i]) return false;
  const ok = cur.sec==="ear" ? (level==="good"?1:0) : idx, total = cur.sec==="ear" ? 1 : seq.length;
  game.results[game.i]={it:stripItem(cur), level, ok, total, secs, solved:secs!=null};
  if(game.daily) S.dailyRun={date:dayStr(), i:game.i, results:game.results, xp0:game.xp0, maxCombo:game.maxCombo||0}; // resumable after a reload
  const ss=secStats();
  if(secs!=null){ ss.ok++; if(level==="good") ss.perfect++; } else ss.revealed++;
  ss.errors+=errors;
  if(level==="good") setMastery(cur,mastI(cur)+1); else if(secs==null) setMastery(cur,mastI(cur)-1);
  // spaced repetition (Leitner boxes)
  S.srs=S.srs||{}; const key=mkey(cur), e=S.srs[key]||{it:stripItem(cur),box:0};
  e.box = level==="good" ? Math.min(SRS_DAYS.length-1,e.box+1) : level==="warn" ? Math.max(1,e.box) : 0;
  e.due = addDays(level==="bad"?0:SRS_DAYS[e.box]); e.it=stripItem(cur); S.srs[key]=e;
  return true;
}
function sectionUsable(sec){ return typeList(sec).some(ty=>typeOpenS(sec,ty.id)); }
function poolFor(sec){ const keep=S.section; S.section=sec; const p=pool(); S.section=keep; return p; }
function dueItems(){
  const today=dayStr();
  return Object.entries(S.srs||{}).filter(([k,e])=>e.due<=today && typeDef(e.it.sec,e.it.tid) && typeOpenS(e.it.sec,e.it.tid))
    .sort((a,b)=>a[1].due.localeCompare(b[1].due)||a[1].box-b[1].box).map(([k,e])=>e.it);
}
function dailySecs(){ const ch=S.settings.dailySecs; const ok=SECS.filter(sectionUsable); const sel=(ch&&ch.length?ch:SECS).filter(x=>ok.includes(x)); return sel.length?sel:ok; }
function buildDaily(n=S.settings.dailyLen||10){
  const out=[], seen=new Set(), add=it=>{ const k=mkey(it); if(seen.has(k)) return false; seen.add(k); out.push(it); return true; };
  const secs=dailySecs();
  if(S.settings.dailyReview!==false) dueItems().filter(it=>secs.includes(it.sec)).slice(0,Math.ceil(n*.6)).forEach(add);
  const pools=Object.fromEntries(secs.map(sec=>[sec,poolFor(sec).sort(()=>Math.random()-.5).sort((a,b)=>mastI(a)-mastI(b))]));
  let guard=0;
  while(out.length<n && guard++<200){ for(const sec of secs){ if(out.length>=n) break; const p=pools[sec]; while(p.length && !add(p.shift())); } }
  // mix sections so the same tab does not repeat back to back
  return out.sort(()=>Math.random()-.5);
}
function dailyPlan(fresh){
  const today=dayStr();
  if(fresh || !S.dailyPlan || S.dailyPlan.date!==today){ S.dailyPlan={date:today, items:buildDaily().map(stripItem)}; delete S.dailyRun; save(); }
  return S.dailyPlan;
}
function pendingDailyRun(){
  const r=S.dailyRun, today=dayStr();
  if(!r || r.date!==today || !Array.isArray(r.results) || !S.dailyPlan || S.dailyPlan.date!==today) return null;
  if(S.daily && S.daily.date===today) return null;
  return r.results.some(Boolean) ? r : null;
}
function startDaily(){
  if(phase==="listening") cancelAnimationFrame(raf); clearTimeout(advanceTimer); clearPlayTimers();
  const done=S.daily&&S.daily.date===dayStr();
  page="daily"; const plan=dailyPlan(done); game=makeGame(plan.items.map(it=>({...it})), true); game.i=-1;
  const run=pendingDailyRun();
  if(run){ // exercises already done today are kept (no XP given twice): resume at the first one left
    game.results=run.results.slice(0,game.total).map(r=>r||undefined); game.xp0=Math.min(S.xp, run.xp0!=null?run.xp0:S.xp); game.maxCombo=run.maxCombo||0;
    let j=0; while(j<game.total && game.results[j]) j++; game.i=j-1;
  }
  startRound(); renderDaily();
}
function finishGame(){
  const g=game; lastGame=g; game=null; phase="idle"; cur=null; seq=[]; found=[]; played=[]; clearKeys();
  $("stage").classList.remove("res-good","res-warn","res-bad");
  const doneN=g.results.filter(Boolean).length; g.complete = g.queue ? doneN>=g.total : true;
  if(g.daily && g.complete){ const good=g.results.filter(r=>r&&r.level==="good").length; S.daily={date:dayStr(), score:good+"/"+doneN, items:g.queue.map(stripItem), levels:g.queue.map((_,i)=>g.results[i]?g.results[i].level:null)}; delete S.dailyRun; }
  save(); render(); renderDaily();
  if(doneN) openEnd(g);
}
// #endNext: the XP bar fills from where the game started (g.xp0); a level reached in the game is celebrated here (bar to the end,
// "Level N reached" with the new avatar, confetti, then the bar starts again); the streak line enters if the game raised it.
// Nothing waits for it: focus and the C/B shortcuts work at once. Reduced motion: final state, the level line only fades in.
function endNextMotion(nx, g, li, sk){
  const bar=nx.querySelector("i"), fin=li.into/li.need, L0=levelInfo(g.xp0||0), up=li.L>L0.L?li.L:0;
  const b0=up ? L0.into/L0.need : Math.min(fin, Math.max(0,(g.xp0||0)-(S.xp-li.into))/li.need);
  bar.style.transform="scaleX("+fin+")"; lvlUp=up;
  const RM=matchMedia("(prefers-reduced-motion: reduce)").matches, cs=getComputedStyle(document.documentElement);
  const EO=cs.getPropertyValue("--ease-out").trim()||"ease-out", EP=cs.getPropertyValue("--ease-pop").trim()||"ease-out";
  const grew = g.sk0!=null && sk>g.sk0, p=nx.querySelector("p");
  let lv=null;
  if(up){ lv=document.createElement("div"); lv.className="en-lvl"; lv.innerHTML='<span class="av"></span><b></b>'; lv.firstChild.innerHTML=avatarSVG(charIndex(up)); lv.lastChild.textContent=t("ntfLvlT")(up); nx.prepend(lv); }
  if(!bar.animate) return;
  if(RM){ if(lv) lv.animate([{opacity:0},{opacity:1}],{duration:200,easing:"ease"}); return; }
  if(up){
    bar.animate([{transform:"scaleX("+b0+")",easing:EO},{transform:"scaleX(1)",offset:.33},{transform:"scaleX(1)",offset:.75},{transform:"scaleX(0)",offset:.75,easing:EO},{transform:"scaleX("+fin+")"}],{duration:1200,delay:150,fill:"backwards"});
    lv.animate([{opacity:0,transform:"scale(.9)"},{opacity:1,transform:"none"}],{duration:500,delay:550,easing:EP,fill:"backwards"});
    setTimeout(()=>{ if(endOpen && lv.isConnected) confetti($("endModal"), lv.firstChild, 70, 1300); },550);
  } else if(fin>b0+.005) bar.animate([{transform:"scaleX("+b0+")"},{transform:"scaleX("+fin+")"}],{duration:400,delay:150,easing:EO,fill:"backwards"});
  if(grew && p.textContent) p.animate([{opacity:0,transform:"translateY(4px)"},{opacity:1,transform:"none"}],{duration:200,delay:up?1350:400,easing:EO,fill:"backwards"});
}
function openEnd(g){
  const L=S.settings.lang, R=g.results.filter(Boolean), n=R.length;
  const cnt=lv=>R.filter(r=>r.level===lv).length, good=cnt("good");
  const notesOk=R.reduce((a,r)=>a+r.ok,0), notesTot=R.reduce((a,r)=>a+r.total,0);
  const solved=R.filter(r=>r.solved), avg=solved.length?solved.reduce((a,r)=>a+r.secs,0)/solved.length:0;
  const pct=notesTot?Math.round(notesOk/notesTot*100):0, sep=L==="fr"?",":".", per=L==="fr"?" %":"%";
  $("endTitle").textContent = g.daily && g.complete ? t("endDaily") : t("endTitle");
  const body=$("endBody"); body.innerHTML="";
  const hero=document.createElement("div"); hero.className="end-hero";
  hero.innerHTML='<div class="end-big"></div><div><div class="end-sub hint"></div><div class="end-chips"></div></div>';
  hero.querySelector(".end-big").innerHTML=good+'<small> / '+n+'</small>';
  hero.querySelector(".end-sub").textContent=t("outOf");
  [["good",t("perfectN")],["warn",t("warnN")],["bad",t("badN")]].forEach(([lv,lbl])=>{ if(lv!=="good" && !cnt(lv)) return; const c=document.createElement("span"); c.className="end-chip "+lv; c.textContent=cnt(lv)+" "+lbl; hero.querySelector(".end-chips").appendChild(c); });
  { const sb=document.createElement("button"); sb.type="button"; sb.className="end-share"; sb.id="endShare"; sb.innerHTML=pwI("share")+"<span></span>"; sb.lastChild.textContent=t("shareBtn"); sb.onclick=()=>shareEnd(g,good,n); hero.appendChild(sb); }
  body.appendChild(hero);
  const stats=document.createElement("div"); stats.className="end-stats";
  [[t("accuracy"),pct+per],[t("avgTime"),solved.length?avg.toFixed(1).replace(".",sep)+" s":"—"],[t("xpWon"),"+"+(S.xp-g.xp0)],[t("bestCombo"),"×"+(g.maxCombo||0)]]
    .forEach(([a,b])=>{ const d=document.createElement("div"); d.className="end-stat"; d.innerHTML="<span></span><b></b>"; d.children[0].textContent=a; d.children[1].textContent=b; stats.appendChild(d); });
  body.appendChild(stats);
  { const li=levelInfo(S.xp), nx=document.createElement("div"); nx.className="end-next"; nx.id="endNext";
    nx.innerHTML='<div class="en-row"><b></b><span class="en-bar"><i></i></span></div><p></p>'; nx.querySelector("b").textContent=t("endNext")(fmtN(li.need-li.into), fmtN(li.L+1));
    const sk=effStreak(); nx.querySelector("p").textContent = sk ? t("endStreak")(sk) : ""; body.appendChild(nx);
    endNextMotion(nx, g, li, sk); 
    if(!user){ const ac=document.createElement("div"); ac.className="end-acct"; ac.id="endAcct"; ac.innerHTML='<div><b></b><small></small></div><button class="btn primary" type="button"></button>';
      ac.querySelector("b").textContent=t("endAcct"); ac.querySelector("small").textContent=t("endAcctS"); const ab=ac.querySelector("button"); ab.textContent=t("endAcctB");
      ab.onclick=()=>{ closeEnd(); PW.pending=false; GATE.mode="signup"; gateOpen(); }; body.appendChild(ac); }
    if(paywallOn() && !isPremium() && !S.pwShown && n && good/n>=.8) PW.pending=true;
    else if(n && good/n>=.8 && !(S.goal&&S.goal.asked)) GL.offer=true; }
  // one line per item, keeping its worst result
  const rank={good:0,warn:1,bad:2}, byKey=new Map();
  R.filter(r=>r.level!=="good").forEach(r=>{ const k=mkey(r.it), o=byKey.get(k); if(!o||rank[r.level]>rank[o.level]) byKey.set(k,r); });
  const misses = g.single ? R.slice(-1).filter(r=>r.level!=="good") : [...byKey.values()]; // one item replayed until nailed: its last try counts
  const h=document.createElement("h3"); h.textContent = misses.length ? t("toRework") : t("allPerfect"); body.appendChild(h);
  if(misses.length){
    const ul=document.createElement("ul"); ul.className="end-list";
    misses.forEach(r=>{ const li=document.createElement("li"); li.innerHTML='<i class="'+r.level+'"></i><span></span><small></small>';
      li.children[1].textContent=itemName(r.it); li.children[2].textContent=r.it.sec==="ear"?"✗":r.ok+" / "+r.total; ul.appendChild(li); });
    body.appendChild(ul);
  }
  const foot=$("endFoot"); foot.innerHTML="";
  const btn=(lbl,cls,fn)=>{ const b=document.createElement("button"); b.type="button"; b.className="btn "+cls; b.textContent=lbl; b.onclick=fn; foot.appendChild(b); return b; };
  const hint=(b,k)=>{ if(midiMode() && S.settings.midiC!==false){ const kb=kbdEl(); kb.textContent=k; b.appendChild(kb); } return b; };
  if(g.label){ // a game chosen on the start screen: change, start again (B), next key (C, one item) or play again (C, several)
    btn(t("suChange"),"",()=>{ closeEnd(); render(); });
    if(g.single) hint(btn(t("againB"),"",()=>endReplay(g)),BNAME());
    else if(misses.length){ const rw=hint(btn(t("reworkBtn"),"",()=>{ closeEnd(); page="practice"; game=makeGame(misses.map(r=>r.it)); game.label=g.label; game.orig=g.orig||g.queue; game.i=-1; startRound(); }),BNAME()); rw.id="endRework"; }
    const nx = g.single ? hint(btn(t("nextKeyB")(endNextLabel(g)),"primary",()=>endNext(g)),CNAME()) : hint(btn(t("newGame"),"primary",()=>endReplay(g)),CNAME());
    $("endX").setAttribute("aria-label",t("closeLbl")); if(!endOpen) modalOpened(); endOpen=true; $("endModal").hidden=false; nx.focus(); if(n && good/n>=.8 && !lvlUp) setTimeout(()=>confetti(),150); return; }
  btn(t("closeLbl"),"",closeEnd);
  if(misses.length){ const rw=hint(btn(t("reworkBtn"),"",()=>{ closeEnd(); page="practice"; game=makeGame(misses.map(r=>r.it)); game.i=-1; startRound(); }),BNAME()); rw.id="endRework"; }
  const main=btn(t("newGame"),"primary",()=>{ closeEnd(); page="practice"; if(g.sec&&!g.daily&&g.sec!==S.section) switchSection(g.sec);
    startRound(); });

  $("endX").setAttribute("aria-label",t("closeLbl"));
  if(!endOpen) modalOpened(); endOpen=true; $("endModal").hidden=false; main.focus();
  if(n && good/n>=.8 && !lvlUp) setTimeout(()=>confetti(),150);
}
// one-item game: the next open key of the same scale / chord / progression
function endNextKey(g){ const it=g.queue[0], open=openRoots(it.sec,it.tid); const i=open.indexOf(it.k); return open[(i+1)%open.length]; }
function endNextLabel(g){ return suItemLabel({...g.queue[0], k:endNextKey(g)}); }
function endNext(g){ closeEnd(); page="practice"; if(g.sec!==S.section) switchSection(g.sec); const it={...g.queue[0], k:endNextKey(g)};
  game=makeGame([it]); game.label=suItemLabel(it); game.single=true; game.i=-1; startRound(); }
function endReplay(g){ closeEnd(); page="practice"; if(g.sec!==S.section) switchSection(g.sec);
  if(g.orig || (!g.single && g.sec!=="ear" && suState(g.sec).shuffle)){ if(g.orig){ game=makeGame(g.orig.map(it=>({...it}))); game.label=g.label; game.i=-1; startRound(); } else suStart(); return; } // the whole choice again (shuffled again)
  const q=g.sec==="ear"?suQueue(g.sec):g.single?[{...g.queue[0]}]:g.queue.map(it=>({...it})); game=makeGame(q); game.label=g.label; game.single=!!g.single; game.i=-1; startRound(); }
function closeEnd(){ if(!endOpen) return; endOpen=false; $("endModal").hidden=true; modalClosed();
  if(lvlUp){ lvlUp=0; ["lvlAv","mbLvlBtn"].forEach(id=>{ const a=$(id); if(!a) return; a.classList.remove("pulse"); void a.offsetWidth; a.classList.add("pulse"); a.addEventListener("animationend",()=>a.classList.remove("pulse"),{once:true}); }); }
  if(PW.pending){ PW.pending=false; S.pwShown=1; save(); setTimeout(()=>{ if(!anyModal()) pwOpen("success"); },350); } // the offer, once, after a first game played well
  else if(GL.offer){ GL.offer=false; setTimeout(()=>{ if(!anyModal() && !game && phase==="idle") goalOpen(); },350); } } // Objectif: the daily goal, once
function renderGameBar(){
  const bar=$("gamebar"), segs=$("segs"), lbl=$("gameLbl"), end=$("gameEnd");
  const g=game, total = g ? g.total : (S.settings.gameLen||Infinity);
  end.hidden = !g; end.textContent=t("endGame");
  lbl.className="glbl"+(g&&g.daily?" is-daily":""); lbl.innerHTML="";
  const pre = g&&g.daily ? t("dailyLbl")+" · " : "";
  if(!g){ lbl.textContent = isFinite(total) ? t("gameOf")(total) : t("endlessLbl"); }
  else if(g.label){ lbl.append(g.label); if(total>1){ const b=document.createElement("b"); b.textContent=" · "+(Math.min(g.i,total-1)+1)+" / "+total; lbl.append(b); } }
  else if(isFinite(total)){ lbl.append(pre+t("exercise")+" "); const b=document.createElement("b"); b.textContent=(Math.min(g.i,total-1)+1)+" / "+total; lbl.append(b); }
  else { lbl.append(t("endlessLbl")+" · "+t("exercise")+" "); const b=document.createElement("b"); b.textContent=g.i+1; lbl.append(b); }
  const ts=$("timerSel"), opts=[0,20,10,5]; if(!opts.includes(S.settings.delay)) opts.push(S.settings.delay);
  ts.innerHTML=""; opts.forEach(v=>{ const o=document.createElement("option"); o.value=v; o.textContent = v ? v+" s" : t("noTimer"); ts.appendChild(o); });
  ts.value=String(S.settings.delay);
  const gN=!!S.settings.guideN, gK=!!S.settings.guideK, gP=!!S.settings.guideP, gs=$("guideSum");
  gs.textContent=t("guideLbl")+(S.settings.lang==="fr"?" : ":": ")+(gP ? t("guidePShort") : gN&&gK ? t("guideNShort")+" + "+t("guideKShort") : gN ? t("guideNShort") : gK ? t("guideKShort") : t("guideOff"));
  $("guideBtn").classList.toggle("on",gN||gK||gP); $("optGuideN").checked=gN; $("optGuideK").checked=gK; $("optGuideP").checked=gP;
  segs.innerHTML="";
  if(isFinite(total)){
    segs.hidden=false;
    for(let i=0;i<total;i++){ const d=document.createElement("i"); const r=g&&g.results[i];
      if(r) d.className=r.level; else if(g && i===g.i && phase!=="idle") d.className="cur"; segs.appendChild(d); }
  } else {
    segs.hidden = !(g&&g.results.length);
    (g?g.results.slice(-20):[]).forEach(r=>{ const d=document.createElement("i"); if(r) d.className=r.level; segs.appendChild(d); });
  }
}
function diffLabel(){
  const d=S.settings.delay, names={15:"dEasy",10:"dMedium",5:"dHard",3:"dExpert"};
  if(!d) return t("noTimer");
  return (names[d]?t(names[d])+" · ":"")+d+" s";
}
function renderDaily(){
  const today=dayStr(), done=S.daily&&S.daily.date===today, due=dueItems().length;
  $("dailyCard").classList.toggle("done",!!done);
  const run = game && game.daily;
  $("dailySub").textContent = run ? t("dpRun")(Math.min(game.i,game.total-1)+1,game.total) : done ? t("dpDone")(S.daily.score) : t("dailySub")((S.dailyPlan&&S.dailyPlan.date===today?S.dailyPlan.items.length:(S.settings.dailyLen||10)),due);
  if(page==="daily") renderDailyPanel();
}
function showScore(detailParts){
  const total=seq.length, ok=idx, faults=(total-ok)+errors;
  const level = faults===0 ? "good" : faults<=3 ? "warn" : "bad";
  $("feedback").className="score-box "+level; $("sbLabel").textContent=tx("correct");
  $("sbVal").innerHTML=ok+'<span class="of"> / '+total+'</span>';
  $("sbDetail").textContent=detailParts.filter(Boolean).join(" · ");
  const st=$("stage"); st.classList.remove("res-good","res-warn","res-bad"); st.classList.add("res-"+level);
  renderSession();
  return level;
}
function showEar(ok,gain){
  const level=ok?"good":"bad";
  $("feedback").className="score-box "+level; $("sbLabel").textContent=t("answerLbl");
  $("sbVal").textContent = ok ? "✓" : "✗";
  $("sbDetail").textContent = ok ? t("right")+" · +"+gain+" XP" : t("wrong")+earLabel(cur.tid,cur.k);
  const st=$("stage"); st.classList.remove("res-good","res-warn","res-bad"); st.classList.add("res-"+level);
  renderSession();
}
function renderSession(){
  // running total for the current game
  const el=$("session"), R=game?game.results.filter(Boolean):[]; if(!R.length){ el.textContent=""; return; }
  const ok=R.reduce((a,r)=>a+r.ok,0), tot=R.reduce((a,r)=>a+r.total,0), pct=Math.round(ok/tot*100);
  el.innerHTML=""; el.append(t("session")+" · ");
  const b=document.createElement("b"); b.textContent=ok+"/"+tot; el.append(b);
  el.append(" ("+pct+(S.settings.lang==="fr"?" %":"%")+")");
}
// host: the positioned element to draw in (default the exercise stage), from: the element the burst starts from, n particles, dur ms
function confetti(host, from, n=90, dur=1500){
  if(window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const st=host||$("stage"), cv=document.createElement("canvas"); cv.className="confetti"; st.appendChild(cv);
  const r=st.getBoundingClientRect(), dpr=Math.min(2,window.devicePixelRatio||1);
  cv.width=r.width*dpr; cv.height=r.height*dpr; const c=cv.getContext("2d"); c.scale(dpr,dpr);
  const cs=getComputedStyle(document.documentElement), cols=["--good","--accent","--reveal","--warn","--bad"].map(v=>cs.getPropertyValue(v).trim()||"#e9a33a");
  const fb=(from||$("feedback")).getBoundingClientRect(), ox=fb.left-r.left+fb.width/2, oy=fb.top-r.top+fb.height/2;
  const P=Array.from({length:n},()=>{ const a=Math.random()*Math.PI*2, v=3+Math.random()*7;
    return {x:ox,y:oy,vx:Math.cos(a)*v,vy:Math.sin(a)*v-4,w:5+Math.random()*5,h:3+Math.random()*4,r:Math.random()*6,vr:(Math.random()-.5)*.4,c:cols[Math.random()*cols.length|0]}; });
  const t0=performance.now();
  (function frame(now){
    const el=now-t0; c.clearRect(0,0,r.width,r.height);
    P.forEach(p=>{ p.vy+=.25; p.vx*=.985; p.x+=p.vx; p.y+=p.vy; p.r+=p.vr;
      c.save(); c.globalAlpha=Math.max(0,1-el/dur); c.translate(p.x,p.y); c.rotate(p.r); c.fillStyle=p.c; c.fillRect(-p.w/2,-p.h/2,p.w,p.h); c.restore(); });
    if(el<dur) requestAnimationFrame(frame); else cv.remove();
  })(t0);
}
function applyStatic(){
  document.documentElement.lang=S.settings.lang;
  document.querySelectorAll("[data-i]").forEach(el=>{ el.textContent=t(el.dataset.i); }); applyTheme();
  $("resetBtn").textContent=t("reset");
  if(!$("midiBtn").classList.contains("on")&&!$("midiBtn").classList.contains("err")) $("midiTxt").textContent=t("midiOff");
  if(!micOn&&!$("micBtn").classList.contains("err")) $("micTxt").textContent=t("micOff");
  if(micOn) $("micTxt").textContent=t("micOn");
  document.querySelectorAll(".how-btn").forEach(b=>{ b.title=t("howBtn"); b.setAttribute("aria-label",t("howBtn")); });
}
function renderSlots(popIdx){
  guideKeys();
  const box=$("slots"), sec=S.section, ans=$("answers");
  box.hidden = sec==="ear"; ans.hidden = sec!=="ear";
  if(sec==="ear"){ renderAnswers(); return; }
  box.innerHTML="";
  if(sec==="prog" || (sec==="scales" && (seq.length ? !!cur.ch : S.settings.scMode==="chords"))){
    const steps = seq.length ? seq : sec==="prog" ? progSteps(S.settings.pview, PROG[S.settings.pview].scale==="major"?"C":"A", S.settings.vl) : scaleChordSteps("major","C",!!S.settings.sc7,S.settings.dir==="down"?"down":"up");
    box.style.gridTemplateColumns="repeat("+steps.length+",minmax(0,1fr))";
    steps.forEach((st,i)=>{
      const d=document.createElement("div"); d.className="slot chordslot"; let txt="";
      if(seq.length){
        if(found[i]){ d.classList.add("ok"); txt=slashSym(st); if(i===popIdx) d.classList.add("pop"); }
        else if(phase==="revealed"){ d.classList.add("rev"); d.style.animationDelay=revealAt(i)+"ms"; txt=slashSym(st); }
        else if(phase==="listening"){ if(i===pStep) d.classList.add("cur"); if(S.settings.guideN || (guideNamesOn() && i===pStep)){ d.classList.add("pre"); txt=slashSym(st); } }
      }
      d.innerHTML='<span class="deg"></span><span class="nn"></span>';
      d.children[0].textContent=st.roman; d.children[1].textContent=txt;
      box.appendChild(d);
    });
    return;
  }
  const ch=chordLike(sec);
  let sq=seq;
  if(!sq.length){ sq = ch ? spellChord("maj","C",0) : (()=>{ let x=spellType("major","C","up"); if(S.settings.octave) x=x.concat([x[0]]); return S.settings.dir==="down"?x.reverse():x; })(); }
  const dd = seq.length ? dirOf() : (S.settings.dir==="down"?"down":"up");
  const root = ch ? (seq.length ? (sec==="harmony"?seq[0]:tonicNote(cur.k)) : sq[0]) : (dd==="down"?sq[sq.length-1]:sq[0]);
  box.style.gridTemplateColumns="repeat("+sq.length+",minmax(0,1fr))";
  sq.forEach((n,i)=>{
    const d=document.createElement("div"); d.className="slot"; let txt="";
    if(seq.length){
      if(found[i]){ d.classList.add("ok"); txt=noteName(n); if(i===popIdx) d.classList.add("pop"); }
      else if(phase==="revealed"){ d.classList.add("rev"); d.style.animationDelay=revealAt(i)+"ms"; txt=noteName(n); }
      else if(phase==="listening"){ if(ch ? (!found[0] && i===0) : i===idx) d.classList.add("cur"); if(S.settings.guideN || (guideNamesOn() && (ch || i===idx))){ d.classList.add("pre"); txt=noteName(n); } }
    }
    const isOct = !ch && S.settings.octave && (dd==="down" ? i===0 : i===sq.length-1);
    d.innerHTML='<span class="deg"></span><span class="nn"></span>';
    d.children[0].textContent = ch ? chordToneLabel(n,root) : (isOct ? "I" : degLabel(n,root));
    d.children[1].textContent = txt;
    box.appendChild(d);
  });
}
function renderAnswers(){
  const box=$("answers"); box.innerHTML="";
  const cat = cur ? cur.tid : activeTypes("ear")[0];
  let opts = openRoots("ear",cat);
  if(cur && opts.length>6){
    const others=opts.filter(x=>x!==cur.k); const keep=new Set([cur.k]);
    let seed=0; for(const ch of mkey(cur)+cur.root) seed=(seed*31+ch.charCodeAt(0))>>>0;
    while(keep.size<6){ seed=(seed*1103515245+12345)>>>0; keep.add(others[seed%others.length]); }
    opts=opts.filter(x=>keep.has(x));
  }
  opts.forEach(id=>{
    const b=document.createElement("button"); b.type="button"; b.textContent=earLabel(cat,id);
    if(!cur || phase==="idle"){ b.disabled=true; }
    else if(phase!=="listening"){ b.disabled=true; if(id===cur.k) b.classList.add("right"); else if(id===earPick) b.classList.add("wrong"); }
    b.onclick=()=>earAnswer(id);
    box.appendChild(b);
  });
}
function renderActions(){
  const a=$("actions"); a.innerHTML="";
  const mk=(label,cls,fn,k)=>{ const b=document.createElement("button"); b.type="button"; b.className="btn "+cls; b.textContent=label;
    if(k){ const kb=kbdEl(k); kb.textContent=k; b.appendChild(kb); } b.onclick=fn; a.appendChild(b); };
  const sp=()=>{ const s=document.createElement("span"); s.className="spacer"; a.appendChild(s); };
  const kb=hasKeyboard(), space=kb?(S.settings.lang==="fr"?"Espace":"Space"):null, enter=kb?(S.settings.lang==="fr"?"Entrée":"Enter"):null;
  const cKey = midiMode() && S.settings.midiC!==false ? CNAME() : null, bKey = midiMode() && S.settings.midiC!==false ? BNAME() : null;
  if(phase==="idle" && page==="daily" && !game) return; // the header already has "Start"
  if(phase==="idle") mk(t("start"),"primary big",()=>startRound(),cKey||space);
  else if(phase==="listening" && cur.sec==="ear") mk(tx("replay"),"primary",()=>playScale(0),space);
  else if(phase==="listening"){ if(S.settings.guideP && hintStage<2) mk(t("hintBtn"),"",()=>hintMore(),space); else mk(t("giveUp"),"",()=>reveal(false),space); }
  else if(phase==="revealed"){ mk(tx("replay"),"",()=>{ playScale(0); if(cur.sec!=="prog") showReveal(true); }); sp(); mk(t("review"),"",()=>grade(false),bKey||(kb?"⌫":null)); mk(t("knew"),"good",()=>grade(true),cKey||enter); }
  else if(phase==="success"){ mk(tx("replay"),"",()=>{ clearTimeout(advanceTimer); playScale(0); if(!chSeq()) showReveal(true); }); sp(); if(bKey) mk(t("againB"),"",()=>{ clearTimeout(advanceTimer); startRound({...cur, dir:null},true); },bKey); mk(t("next"),"primary",()=>startRound(),cKey||space); }
}
function renderPrompt(){
  const sec=S.section;
  $("invTag").hidden = true;
  if(!cur){
    $("eyebrow").textContent = sec==="chords"?t("chordToPlay"):sec==="harmony"?t("chordOfKey"):sec==="prog"?t("progLbl"):sec==="ear"?t("listenLbl"):S.settings.scMode==="chords"?t("scChordsLbl"):t("scaleToPlay");
    $("prompt").textContent=t("ready"); $("promptSub").textContent=tx("idleSub")+(midiMode()&&S.settings.midiC!==false?" "+t("midiStartTip"):""); return;
  }
  const order = S.settings.mode==="suite"?t("inOrder"):t("random");
  const shown = phase==="revealed"||phase==="success";
  if(sec==="ear"){
    $("eyebrow").textContent=t("listenLbl")+" · "+EARCAT[cur.tid][S.settings.lang];
    $("prompt").textContent=t("whichE")[cur.tid];
    $("promptSub").textContent = shown ? earLabel(cur.tid,cur.k) : (S.settings.lang==="fr"?"Réécouter : Espace":"Listen again: Space");
    return;
  }
  if(sec==="prog"){
    const pr=PROG[cur.tid];
    $("eyebrow").textContent=t("progLbl")+" · "+order;
    $("prompt").textContent=progName(cur.tid);
    $("promptSub").textContent=t("inKey")+scaleName(pr.scale,cur.k)+" · "+seq.length+" "+(S.settings.lang==="fr"?"accords":"chords");
    if(S.settings.vl){ $("invTag").hidden=false; $("invTxt").textContent=t("vlOn"); }
    return;
  }
  if(sec==="harmony"){
    const h=HTYPE[cur.tid], hc=hChord(h.scale,cur.k,cur.deg,h.sev);
    $("eyebrow").textContent=t("chordOfKey")+" · "+order;
    $("prompt").textContent=hc.roman+t("ofKey")+scaleName(h.scale,cur.k);
    $("promptSub").textContent = shown ? chordName(hc.ct,noteStr(hc.root))+(CTYPE[hc.ct].sym?" ("+symOf(hc.ct,hc.root)+")":"") : "? · "+seq.length+" "+t("notes");
    return;
  }
  if(sec==="chords"){
    $("eyebrow").textContent=t("chordToPlay")+" · "+order;
    $("prompt").textContent=chordName(cur.tid,cur.k);
    $("promptSub").textContent=(CTYPE[cur.tid].sym?chordSym(cur.tid,cur.k)+" · ":"")+seq.length+" "+t("notes");
    $("invTag").hidden=false; $("invTxt").textContent=t("invNames")[cur.inv];
    return;
  }
  $("eyebrow").textContent=(cur.ch?t("scChordsLbl")+" · ":"")+(dirOf()==="down"?t("descending"):t("ascending"))+" · "+order;
  $("prompt").textContent=scaleName(cur.tid,cur.k);
  $("promptSub").textContent = cur.ch ? t("chordsN")(seq.length)+(S.settings.sc7?(S.settings.lang==="fr"?" · 7e":" · 7ths"):"") : seq.length+" "+t("notes") + (cur.tid==="mel" && dirOf()==="down" ? t("melDown") : "");
}
function renderHint(){ $("kbdHint").textContent=tx("kbdHint"); $("kbdHint").hidden=!hasKeyboard(); }
// a physical computer keyboard is likely only on desktop browsers (not in the app, not on iPad / phones)
function hasKeyboard(){ if(document.documentElement.classList.contains("native")) return false; const ua=navigator.userAgent; if(/iPad|iPhone|Android|Mobile/.test(ua) || (navigator.platform==="MacIntel" && navigator.maxTouchPoints>1)) return false; return matchMedia("(hover:hover) and (pointer:fine)").matches; }
const midiMode = () => (S.settings.input||"screen")==="midi" && midiReady;
function renderTimeline(){
  const d=S.settings.delay; $("timeline").hidden=!(d>0) || S.section==="ear"; $("ticks").innerHTML="";
  for(let i=1;i<d;i++){ const x=document.createElement("i"); x.style.left=(i/d*100)+"%"; $("ticks").appendChild(x); }
  if(phase!=="listening"){ $("tFill").style.transform=phase==="idle"?"scaleX(1)":"scaleX(0)"; $("tFill").classList.remove("low"); $("secs").textContent=phase==="idle"?d+" s":""; }
}
function renderStatus(){
  const li=levelInfo(S.xp);
  $("lvlNum").textContent=li.L; $("mbLvl").textContent=li.L; $("lvlTitle").textContent=titleFor(li.L);
  const ci=charIndex(li.L), ph=(typeof userPhoto==="function"&&userPhoto())||"", key=ph||String(ci);
  if($("lvlAvatar").dataset.c!==key){ avFill($("lvlAvatar"),ph,ci); avFill($("mbAv"),ph,ci); $("lvlAvatar").dataset.c=key; }
  if(typeof user!=="undefined" && user) $("lvlTitle").textContent=myName();
  $("lvlAv").setAttribute("aria-label",titleFor(li.L)+" · "+t("charMore"));
  $("xpFill").style.transform="scaleX("+(li.into/li.need)+")"; $("xpTxt").textContent=fmtN(li.into)+" / "+fmtN(li.need)+" XP"; 
  const cEl=$("combo"), prevC=cEl.textContent; cEl.textContent="×"+combo;
  $("comboStat").classList.toggle("off",combo===0);
  if(prevC!==cEl.textContent && combo>0){ const st=$("comboStat"); st.classList.remove("pulse"); void st.offsetWidth; st.classList.add("pulse"); }
  { const sk=effStreak(); $("streak").textContent=sk?fmtN(sk)+" "+t("day"):t("streakGo"); $("streakStat").classList.toggle("off",!sk); $("streakStat").title=sk?"":t("streakNew"); }
  try{ goalRing(); }catch(e){}
}
function renderTypes(){
  const sec=S.section, cfg=SEC[sec], box=$("types"); box.innerHTML="";
  $("secTitle").innerHTML = SEC_ICON(sec)+"<span></span>"; $("secTitle").querySelector("span").textContent = t({scales:"secScales",chords:"secChords",harmony:"secHarmony",prog:"secProg",ear:"secEar"}[sec]);
  $("practiseLbl").textContent = {scales:t("practiseS"),chords:t("practiseC"),harmony:t("practiseH"),prog:t("practiseP"),ear:t("practiseE")}[sec];
  typeList(sec).forEach(ty=>{
    const b=document.createElement("button"); b.type="button";
    const noCh = sec==="scales" && S.settings.scMode==="chords" && !ty.iv; // no chord per degree in pentatonic / blues scales
    const open=typeOpenS(sec,ty.id) && !noCh, on=S.settings[cfg.sel].includes(ty.id)&&open;
    b.setAttribute("aria-pressed",on); b.disabled=!open; if(noCh) b.title=t("scNotes");
    b.textContent = cfg.name(ty);
    if(!open){ const sm=document.createElement("small"); sm.textContent=t("lvlShort")+ty.lvl; b.appendChild(sm); }
    b.onclick=()=>{ const set=new Set(S.settings[cfg.sel].filter(id=>typeOpenS(sec,id)));
      if(set.has(ty.id)){ if(set.size>1) set.delete(ty.id); } else set.add(ty.id);
      S.settings[cfg.sel]=typeList(sec).map(x=>x.id).filter(id=>set.has(id)); S[sufKey()]=0; save(); renderTypes();
      if(phase==="idle") render(); };
    box.appendChild(b);
  });
  if(typeList(sec).some(ty=>!typeOpenS(sec,ty.id)) || S.settings.unlockAll){ // locked by level: one click opens everything
    const u=document.createElement("button"); u.type="button"; u.className="dd-unlock"; u.textContent=t(S.settings.unlockAll?"relockBtn":"unlockBtn");
    u.onclick=()=>{ S.settings.unlockAll=!S.settings.unlockAll; save(); renderSettings(); render(); };
    box.appendChild(u);
  }
  const chips=(boxId, labels, key, after)=>{ const ib=$(boxId); ib.innerHTML="";
    labels.forEach((nm,i)=>{ const b=document.createElement("button"); b.type="button"; b.textContent=nm;
      b.setAttribute("aria-pressed", S.settings[key].includes(i));
      b.onclick=()=>{ const set=new Set(S.settings[key]); if(set.has(i)){ if(set.size>1) set.delete(i); } else set.add(i);
        S.settings[key]=[...set].sort(); S[sufKey()]=0; save(); renderTypes(); if(after) after(); };
      ib.appendChild(b); }); };
  const selNames=typeList(sec).filter(ty=>S.settings[cfg.sel].includes(ty.id)&&typeOpenS(sec,ty.id)).map(ty=>cfg.name(ty));
  $("typesSum").textContent = selNames.length<=2 ? selNames.join(", ") : selNames[0]+", "+selNames[1]+" +"+(selNames.length-2);
  chips("invs", t("invNames"), "invs", renderTypes);
  chips("degs", ROMAN, "hdegs", renderTypes);
  const iv=S.settings.invs.map(i=>t("invNames")[i]); $("invsSum").textContent = iv.length<=1 ? iv.join("") : iv[0]+" +"+(iv.length-1);
  $("degsSum").textContent = S.settings.hdegs.length===7 ? t("allKeys") : S.settings.hdegs.map(i=>ROMAN[i]).join(" ");
  $("optVL").checked=S.settings.vl;
}
function focusOf(sec){ const f=(S.settings.focus||{})[sec]; return Array.isArray(f) ? f : (f ? [f] : []); }
function renderKeySel(){
  const sec=S.section; $("keyField").hidden = sec==="ear";
  if(sec==="ear") return;
  const keys=[]; activeTypes(sec).forEach(tid=>rootsOf(sec,tid).forEach(k=>{ if(!keys.includes(k)) keys.push(k); }));
  const f=focusOf(sec).filter(k=>keys.includes(k)), box=$("keyChecks"); box.innerHTML="";
  const row=(label,checked,onch,cls)=>{ const l=document.createElement("label"); l.className="check"+(cls?" "+cls:""); const i=document.createElement("input"); i.type="checkbox"; i.checked=checked; i.onchange=()=>onch(i.checked); l.appendChild(i); const sp=document.createElement("span"); sp.textContent=label; l.appendChild(sp); box.appendChild(l); };
  const setF=v=>{ S.settings.focus=S.settings.focus||{}; S.settings.focus[sec]=v; S[sufKey()]=0; save(); renderKeySel(); if(phase==="listening"&&game&&!game.queue) startRound(undefined,true); };
  row(t("allKeys"), !f.length, on=>{ if(on) setF([]); else renderKeySel(); }, "all");
  keys.forEach(k=>row(noteName(tonicNote(k)), f.includes(k), on=>{ const n=new Set(f); if(on) n.add(k); else n.delete(k); setF(keys.filter(x=>n.has(x))); }));
  const names=f.map(k=>noteName(tonicNote(k)));
  $("keysSum").textContent = !names.length ? t("allKeys") : names.join(", ");
}
let progSec=null;
function secProgress(sec){ let tot=0, got=0; typeList(sec).filter(ty=>typeOpenS(sec,ty.id)).forEach(ty=>rootsOf(sec,ty.id).forEach(k=>{ tot++; if(tileMast(sec,ty.id,k)>=3) got++; })); const st=(S.secStats||{})[sec]||{}; return {tot,got,pct:tot?Math.round(got/tot*100):0,ok:st.ok||0}; }
function renderProgCats(){
  const box=$("progCats"); box.innerHTML="";
  SECS.slice().sort((a,b)=>["chords","scales","harmony","prog","ear"].indexOf(a)-["chords","scales","harmony","prog","ear"].indexOf(b)).forEach(sec=>{
    const p=secProgress(sec), b=document.createElement("button"); b.type="button"; b.className="pc-card"; b.setAttribute("aria-pressed", sec===(progSec||S.section));
    b.innerHTML=SEC_ICON(sec)+'<span class="pc-t"><b></b><small></small></span><span class="pc-bar"><i style="width:'+p.pct+'%"></i></span><span class="pc-n mono"></span>';
    b.querySelector("b").textContent=t({scales:"secScales",chords:"secChords",harmony:"secHarmony",prog:"secProg",ear:"secEar"}[sec]);
    b.querySelector("small").textContent=t("pcSolved")(p.ok); b.querySelector(".pc-n").textContent=p.pct+(S.settings.lang==="fr"?" %":"%");
    b.onclick=()=>{ progSec=sec; renderMap(); }; box.appendChild(b); });
}
function renderMap(){
  if(!progSec) progSec=S.section; try{ renderFiche(); }catch(e){ console.warn(e); }
  renderProgCats();
  const sec=progSec, cfg=SEC[sec], vk=cfg.view;
  $("pdTitle").innerHTML=SEC_ICON(sec)+"<span></span>"; $("pdTitle").querySelector("span").textContent=t({scales:"secScales",chords:"secChords",harmony:"secHarmony",prog:"secProg",ear:"secEar"}[sec]);
  const tb=$("pdTypes"); tb.innerHTML="";
  typeList(sec).forEach(ty=>{ const b=document.createElement("button"); b.type="button"; const open=typeOpenS(sec,ty.id);
    b.setAttribute("aria-pressed", S.settings[vk]===ty.id); b.textContent=cfg.name(ty);
    if(!open){ const sm=document.createElement("small"); sm.textContent=t("lvlShort")+ty.lvl; b.appendChild(sm); }
    b.onclick=()=>{ S.settings[vk]=ty.id; save(); renderMap(); }; tb.appendChild(b); });
  const sel=$("viewSel"); sel.innerHTML="";
  typeList(sec).forEach(ty=>{ const o=document.createElement("option"); o.value=ty.id;
    o.textContent=cfg.name(ty)+(typeOpenS(sec,ty.id)?"":" · "+t("lvlShort")+ty.lvl); sel.appendChild(o); });
  sel.value=S.settings[vk];
  const tid=S.settings[vk], open=typeOpenS(sec,tid), un=openRoots(sec,tid), map=$("map"); map.innerHTML="";
  rootsOf(sec,tid).forEach(k=>{
    const b=document.createElement("button"); b.type="button"; b.className="tile";
    const m=tileMast(sec,tid,k); if(m>=3) b.classList.add("mastered");
    if(cur && cur.sec===sec && cur.tid===tid && cur.k===k && phase!=="idle") b.classList.add("cur");
    const avail=open&&un.includes(k); b.disabled=!avail;
    b.innerHTML='<span class="tn"></span><span class="ta"></span><span class="pips">'+[0,1,2,3,4].map(i=>'<i class="'+(i<m?"f":"")+'"></i>').join("")+"</span>";
    let it, title, sub;
    if(sec==="ear"){
      title=earLabel(tid,k,true); sub=avail?(tid==="int"?earLabel(tid,k):t("playSound")):t("lvlShort")+earAnswers(tid).find(a=>a.id===k).lvl;
      b.querySelector(".tn").textContent=title; b.querySelector(".ta").textContent=sub;
      b.title=earLabel(tid,k);
      b.onclick=()=>{ const q={sec,tid,k,root:tid==="scale"?55:57}; const keep=cur; cur=q; playScale(0); cur=keep; };
      map.appendChild(b); return;
    }
    if(sec==="chords"){ it={sec,tid,k,inv:S.settings.invs[0]||0}; sub=chordSym(tid,k); }
    else if(sec==="harmony"){ it={sec,tid,k,deg:S.settings.hdegs[0]||0}; sub=HTYPE[tid].scale==="minor"?(S.settings.lang==="fr"?"Mineur":"Minor"):(S.settings.lang==="fr"?"Majeur":"Major"); }
    else if(sec==="prog"){ it={sec,tid,k}; sub=PROG[tid].scale==="minor"?(S.settings.lang==="fr"?"Mineur":"Minor"):(S.settings.lang==="fr"?"Majeur":"Major"); }
    else { it={sec,tid,k}; if(S.settings.scMode==="chords" && TYPE[tid].iv) it.ch=1; sub=sigText(tid,k); }
    b.querySelector(".tn").textContent=noteName(tonicNote(k));
    b.querySelector(".ta").textContent=avail?sub:t("locked");
    b.title=avail?t("practiseTip")+itemName(it):tx("lockedTip");
    b.onclick=()=>{ if(S.section!==sec){ S.section=sec; save(); renderSettings(); } closeSet(); startRound(it); };
    map.appendChild(b);
  });
  const locked=rootsOf(sec,tid).length-un.length;
  $("unlockHint").textContent = sec==="ear" ? t("earHint") : !open ? tx("typeLocked")(typeDef(sec,tid).lvl) : locked ? tx("lockedHint")(locked) : t("allOpen");
  const st=(S.secStats||{})[sec]||{ok:0,perfect:0,revealed:0}, tot=st.ok+st.revealed, L=t("st"), n=rootsOf(sec,tid).length;
  $("stats").innerHTML="";
  [[L[0],st.ok],[L[1],st.perfect],[L[2],st.revealed],[L[3],rootsOf(sec,tid).filter(k=>tileMast(sec,tid,k)>=3).length+" / "+n],[L[4],tot?Math.round(st.ok/tot*100)+(S.settings.lang==="fr"?" %":"%"):"—"]]
    .forEach(([l,v])=>{ const sp=document.createElement("span"); sp.textContent=l+" "; const b=document.createElement("b"); b.textContent=v; sp.appendChild(b); $("stats").appendChild(sp); });
}
function renderSettings(){
  try{ renderNtfSet(); }catch(e){} try{ renderSetPrem(); }catch(e){}
  try{ const v=!S.settings.staff?"off":S.settings.staffRead?"read":"on"; $("segStaff").querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.v===v)); $("clefField").hidden=!S.settings.staff;
    $("segClef").querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.v===(S.settings.clef||"auto"))); }catch(e){}
  const set=(id,v)=>$(id).querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.v===v));
  set("segMode",S.settings.mode); set("segDiff",String(S.settings.delay));
  $("langSum").innerHTML = S.settings.lang==="fr" ? '<span class="flag">🇫🇷</span><span class="ltxt"> Français</span>' : '<span class="flag">🇬🇧</span><span class="ltxt"> English</span>';
  const ks=$("kbSize"); ks.innerHTML="";
  [["auto",t("kbAuto")],...["24","25","32","37","49","61","76","88"].map(n=>[n,n+" "+t("keys")]),...(S.settings.kbdSize==="custom"?[["custom",t("kbCustom")+" · "+(S.settings.kbdHigh-S.settings.kbdLow+1)+" "+t("keys")]]:[])]
    .forEach(([v,l])=>{ const o=document.createElement("option"); o.value=v; o.textContent=l; ks.appendChild(o); });
  ks.value=S.settings.kbdSize||"auto";
  $("kbRange").textContent = kbFull() ? t("kbRangeTxt")(Object.keys(keyEls).length,octName(LOW),octName(HIGH)) : ""; set("segLen",String(S.settings.gameLen)); set("segNot",S.settings.notation); set("segDir",S.settings.dir); set("langSeg",S.settings.lang);
  $("delay").value=S.settings.delay; $("delayOut").textContent=S.settings.delay?S.settings.delay+" s":t("never");
  $("optOct").checked=S.settings.octave; $("optUiSound").checked=S.settings.uiSound!==false; $("optLabels").checked=S.settings.labels; $("optFing").checked=!!S.settings.fing; $("optMidiSound").checked=S.settings.midiSound; $("optMidiC").checked=S.settings.midiC!==false; $("optAuto").checked=S.settings.autoNext!==false; $("optAll").checked=S.settings.unlockAll;
  const sec=S.section;
  $("invField").hidden=sec!=="chords"; $("degField").hidden=sec!=="harmony"; $("vlField").hidden=sec!=="prog";
  $("scModeField").hidden=sec!=="scales"; $("sc7Field").hidden=!(sec==="scales" && S.settings.scMode==="chords"); set("segScMode",S.settings.scMode||"notes"); $("optSc7").checked=!!S.settings.sc7;
  $("dirField").hidden=sec!=="scales"; $("octField").hidden=sec!=="scales";
  $("orderField").hidden=sec==="ear"; $("lenField").hidden=false; $("delayField").hidden=sec==="ear";
  setNav();
  renderTypes(); renderKeySel();
}
function render(){ try{ staffSoon(); }catch(e){} if(page==="hub") try{ renderHubSide(); }catch(e){} /* the first renders run before the input code is defined */
  const suOn = page==="practice" && !game && phase==="idle"; document.body.classList.toggle("setup",suOn); document.body.classList.toggle("gp",!!S.settings.guideP);
  const sp=document.getElementById("setupPanel"); if(sp){ sp.hidden=!suOn; if(suOn) try{ renderSetup(); }catch(e){ console.warn(e); } try{ renderFiche2(); }catch(e){} } document.body.classList.toggle("playing", !!game || phase!=="idle"); document.body.dataset.page=page; $("gamesPanel").hidden = page!=="games"; $("hubPanel").hidden = page!=="hub"; $("quizPanel").hidden = page!=="quiz"; $("freePanel").hidden = page!=="free"; $("learnPanel").hidden = page!=="learn"; $("dailyPanel").hidden = page!=="daily"; $("rankPanel").hidden = page!=="rank"; $("notifPanel").hidden = page!=="notif"; $("accountPanel").hidden = page!=="account"; $("lockPanel").hidden = page!=="locked"; $("settingsPage").hidden = page!=="settings"; $("progressPage").hidden = page!=="progress"; renderDaily(); renderGameBar(); setNav();
  if(phase==="idle"||phase==="listening") resetScore(); renderSession(); renderHint(); renderPrompt(); renderTimeline(); renderSlots(); renderActions(); renderStatus(); renderMap(); labelKeys(); }

