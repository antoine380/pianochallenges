// fragment de l'IIFE principale — ordre 700, voir src/app/README.md
// ======================= D28 · préparer le micro (piano acoustique) =======================
// Fenêtre « On t'écoute » : 3 conseils, vu-mètre en direct (analyseur sur le flux du micro existant), la note entendue en grand,
// « Ça marche » dès qu'un Do est reconnu. Bruit permanent, piano désaccordé (écart moyen → S.settings.micCents, utilisé par le moteur).
const MP={on:false, raf:0, an:null, src:null, heard:null, okM:null, cents:[], noise:0, quiet:0, t0:0, after:null, tm:0, hist:[]};
function mpDev(){ try{ const d=typeof mwDev==="function"?mwDev():null; if(d&&d.kind) return d.kind==="ipad"?"ipad":d.kind==="iphone"?"iphone":d.kind==="android"?"android":"other"; }catch(e){} return /iPad/.test(navigator.userAgent)?"ipad":/iPhone/.test(navigator.userAgent)?"iphone":"other"; }
function mpEl(){ let m=$("mpModal"); if(m) return m; m=document.createElement("div"); m.className="modal goal-modal mp-modal"; m.id="mpModal"; m.hidden=true; m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-labelledby","mpT");
  m.innerHTML='<div class="modal-bg"></div><div class="modal-card"><div class="modal-body gl-body mp-body"><span class="mp-chip" id="mpChip"></span><h2 id="mpT"></h2><ul class="mp-tips" id="mpTips"></ul>'
    +'<div class="mp-live"><div class="mp-vu" id="mpVu" aria-hidden="true">'+Array.from({length:22},()=>'<i></i>').join("")+'</div><b class="mp-note" id="mpNote" aria-live="polite"></b><span class="mp-ck" id="mpCk" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span></div>'
    +'<p class="mp-msg" id="mpMsg" role="status"></p><div class="mp-btns" id="mpBtns"></div></div></div>';
  document.body.appendChild(m); return m; }
const MP_TIP=['<rect x="6" y="3" width="12" height="18" rx="2"/><path d="M10.5 18h3"/>','<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M8 3l4 3 4-3M9 21h6"/>','<path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V11M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6.5a1.5 1.5 0 0 1 3 0V14c0 4-2.5 7-6 7-2.6 0-4.4-1.4-5.6-3.6L3.6 14a1.5 1.5 0 0 1 2.6-1.5L8 15"/>'];
function mpOpen(after){ const m=mpEl(); MP.on=true; MP.after=after||null; MP.heard=null; MP.okM=null; MP.cents=[]; MP.tune=null; MP.msgK=null; MP.noise=0; MP.quiet=0; MP.t0=performance.now(); MP.hist=[]; MP.st="wait";
  $("mpT").textContent=t("mpT"); $("mpTips").innerHTML=t("mpTips")(t("mpDev")[mpDev()]).map((x,i)=>'<li><svg viewBox="0 0 24 24" aria-hidden="true">'+(i?MP_TIP[i]:MP_DEV_ICO[mpDev()]||MP_TIP[0])+'</svg><span>'+esc(x)+'</span></li>').join("");
  if(!openMods.includes("mpModal")) openMod("mpModal"); m.classList.toggle("mw-top", !!FN.on); mpPaint();
  if(!micOn){ try{ $("micBtn").click(); }catch(e){} }
  clearInterval(MP.tm); let tries=0; MP.tm=setInterval(()=>{ tries++; if(micStream && micOn){ clearInterval(MP.tm); MP.st="ok"; mpListen(); mpPaint(); } else if($("micBtn").classList.contains("err") || tries>40){ clearInterval(MP.tm); MP.st="no"; mpPaint(); } },150); }
function mpListen(){ const c=audio(); if(!c||!micStream) return; try{ MP.src=c.createMediaStreamSource(micStream); MP.an=c.createAnalyser(); MP.an.fftSize=2048; MP.src.connect(MP.an); }catch(e){ return; }
  const buf=new Float32Array(MP.an.fftSize), vu=$("mpVu"), bars=vu?[...vu.children]:[]; let last=0;
  const loop=now=>{ if(!MP.on||!MP.an) return; MP.raf=requestAnimationFrame(loop); if(now-last<45) return; last=now;
    MP.an.getFloatTimeDomainData(buf); let rms=0; for(let i=0;i<buf.length;i+=4) rms+=buf[i]*buf[i]; rms=Math.sqrt(rms/(buf.length/4));
    MP.hist.push(Math.min(1,rms*9)); if(MP.hist.length>bars.length) MP.hist.shift(); bars.forEach((b,i)=>{ const v=MP.hist[i]||0; b.style.transform="scaleY("+Math.max(.08,v).toFixed(3)+")"; b.classList.toggle("hi",v>.25); });
    const f=rms>=0.012?autoCorrelate(buf,c.sampleRate):-1;
    if(f>0){ const x=69+12*Math.log2(f/440), cents=Math.round((x-Math.round(x))*100); MP.cents.push(cents); if(MP.cents.length>12) MP.cents.shift(); MP.noise=0; MP.quiet=0;
      // a steady note (12 frames ≈ 0.5 s): its offset from the nearest semitone is how the piano is tuned (a sung or bent note is not steady)
      if(MP.cents.length===12 && !MP.tune){ const s2=MP.cents.slice().sort((a,b)=>a-b), med=s2[6], spread=s2[10]-s2[1];
        if(spread<=12 && Math.abs(med)>=25 && Math.abs(med)<=50){ S.settings.micCents=med; save(); MP.tune=med<0?"low":"high"; mpPaint(); }
        else if(spread<=12 && Math.abs(med)<=12 && S.settings.micCents){ delete S.settings.micCents; save(); MP.tune="ok"; } } }
    else { if(++MP.quiet>3) MP.cents=[]; if(rms>0.02){ MP.noise++; if(MP.noise===60 && !MP.okM){ MP.msgK="noise"; mpPaint(); } } else MP.noise=0; } };
  MP.raf=requestAnimationFrame(loop); }
function mpNoteIn(m){ if(!MP.on) return; const pc=md12(m); MP.heard=m; if(pc===0) MP.okM=m; MP.msgK=null;
  mpPaint(); }
function mpPaint(){ if(!$("mpModal")) return; const N=ppNames(), C=N[0], chip=$("mpChip"), st=MP.st;
  chip.className="mp-chip "+(st==="ok"?"ok":st==="no"?"no":""); chip.innerHTML=INPUT_ICONS.mic+'<span></span>'; chip.lastChild.textContent=t(st==="ok"?"mpOk":st==="no"?"mpNo":"mpWait");
  const note=$("mpNote"), ck=$("mpCk"); note.textContent=MP.heard!=null?N[md12(MP.heard)]:""; note.style.color=MP.heard!=null?"var(--note-"+md12(MP.heard)+")":""; ck.hidden=MP.okM==null;
  $("mpVu").hidden = st==="no";
  const msg = st==="no" ? t("mpDenied")+" "+t(isApp()?"mpDeniedApp":"mpDeniedWeb") : MP.okM!=null ? t("mpGot")(C)+(MP.tune==="low"||MP.tune==="high"?" "+t(MP.tune==="low"?"mpLow":"mpHigh"):"") : MP.msgK==="noise" ? t("mpNoise") : MP.heard!=null ? t("mpHeard")(N[md12(MP.heard)],C) : t("mpPlay")(C);
  $("mpMsg").textContent=msg; $("mpMsg").classList.toggle("warn", MP.msgK==="noise" || st==="no");
  const B=$("mpBtns"); B.innerHTML = st==="no"
    ? '<button class="btn" type="button" id="mpScreen">'+esc(t("mpScreen"))+'</button><button class="pp-main" type="button" id="mpRetry">'+esc(t("mpRetry"))+'</button>'
    : '<button class="linkbtn" type="button" id="mpLater">'+esc(t("mpLater"))+'</button><button class="pp-main" type="button" id="mpGo"'+(MP.okM==null?" disabled":"")+'>'+esc(t("mpGo"))+'</button>';
  if($("mpLater")) $("mpLater").onclick=()=>mpClose(false); if($("mpGo")) $("mpGo").onclick=()=>mpClose(true);
  if($("mpRetry")) $("mpRetry").onclick=()=>{ $("micBtn").classList.remove("err"); mpStopAn(); mpOpen(MP.after); };
  if($("mpScreen")) $("mpScreen").onclick=()=>{ mpClose(false, true); }; }
function mpStopAn(){ cancelAnimationFrame(MP.raf); clearInterval(MP.tm); try{ if(MP.src) MP.src.disconnect(); }catch(e){} MP.src=null; MP.an=null; }
function mpClose(ok, screen){ mpStopAn(); MP.on=false; S.micPrep={at:Date.now(), ok:!!ok}; save(); closeMod("mpModal"); const after=MP.after; MP.after=null;
  if(screen){ if(FN.on){ FN.how="screen"; FN.micErr=false; if(micOn) micStop(); fnRender(); } else setInput("screen",true); return; }
  if(after) try{ after(ok?MP.okM:null); }catch(e){} }
// every note goes to the window while it is open (the mic, the screen keys or a MIDI keyboard: only the mic is expected)
{ const _mi=midiIn; midiIn=function(m, fromMidi){ if(MP.on){ mpNoteIn(m); return; } return _mi.apply(this,arguments); }; }
// opened when the mic is chosen: first launch (« A real piano »), the input choice the first time, and from Settings
{ const _fp=fnPick; fnPick=function(v){ const r=_fp.apply(this,arguments); if(v==="mic" && !S.micPrep) setTimeout(()=>{ if(FN.on && FN.how==="mic") mpOpen(m=>{ if(m!=null && FN.on && FN.st==="c" && !FN.done) fnNote(m); }); },60); return r; }; }
{ const _si=setInput; setInput=async function(v, fromUser){ const r=await _si.apply(this,arguments); if(v==="mic" && fromUser && !S.micPrep && !FN.on && !MP.on) mpOpen(); return r; }; }
{ const ta=$("tourAgain"); if(ta){ const b=document.createElement("button"); b.className="btn"; b.type="button"; b.id="plSetBtn"; ta.parentNode.appendChild(document.createTextNode(" ")); ta.parentNode.appendChild(b); b.onclick=()=>plOpen(); }
  const ic=$("inCfg"); if(ic){ const b=document.createElement("button"); b.className="btn"; b.type="button"; b.id="mpSetBtn"; ic.after(b); b.onclick=()=>{ if(S.settings.input!=="mic") setInput("mic",true).then(()=>{ if(!MP.on) mpOpen(); }); else mpOpen(); }; } }
{ const _rs=renderSettings; renderSettings=function(){ const r=_rs.apply(this,arguments); const a=$("plSetBtn"); if(a) a.textContent=t("plSet"); const b=$("mpSetBtn"); if(b){ b.textContent=t("mpSet"); b.hidden=!inputModes().includes("mic"); } return r; }; }
try{ renderSettings(); }catch(e){}

// ---- fusion entre appareils : compte proposé (nombre max), rappels (le plus récent), bilan (dernière semaine vue) ; micPrep reste local
{ const _ms=mergeState; mergeState=function(local, cloud){ const r=_ms.apply(this,arguments), c=L4isO(cloud)?cloud:{}, M=r.merged;
    const la=L4isO(local.acct)?local.acct:null, ca=L4isO(c.acct)?c.acct:null; if(la||ca){ const a={...(ca||{}), ...(la||{})}; a.n=Math.max(+(la&&la.n)||0, +(ca&&ca.n)||0); M.acct=a; }
    const lr=L4isO(local.ppRem)?local.ppRem:null, cr=L4isO(c.ppRem)?c.ppRem:null; if(lr||cr) M.ppRem = !lr ? cr : !cr ? lr : String(cr.last||"")>String(lr.last||"") ? cr : lr;
    const lw=L4isO(local.wkRev)?local.wkRev:null, cw=L4isO(c.wkRev)?c.wkRev:null; if(lw||cw) M.wkRev={last:[lw&&lw.last,cw&&cw.last].map(x=>String(x||"")).sort().pop()};
    r.changed=JSON.stringify(M)!==JSON.stringify(local); return r; }; }
/* ==== fin Premiers pas lot 4 ==== */

