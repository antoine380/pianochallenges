// fragment de l'IIFE principale — ordre 520, voir src/app/README.md
/* ==== MIDI lot 1 (24/10/2026) : pastille d'état M1, toasts et pause M13, carte d'accueil M2, test « joue une note » M8 ==== */
// S.midi = {hw:{name, vel}, seenAt, tested, later} : propre à cet appareil (mergeState garde la valeur locale ; un état ancien sans la clé marche)
var MD={prev:null, paused:null, hold:false, cd:0, tt:0, wait:false};
const mdS=()=>{ if(!S.midi||typeof S.midi!=="object"||Array.isArray(S.midi)) S.midi={}; return S.midi; };
const mdTrunc=n=>{ n=String(n||""); return n.length>18 ? n.slice(0,17)+"…" : n; };
const mdQuiet=()=>(typeof startUI==="function"&&startUI()) || FN.on;
const MD_GEAR='<span class="cg"><svg viewBox="0 0 24 24"><path d="M10.3 3.2a1.8 1.8 0 0 1 3.4 0l.4 1.2a1.8 1.8 0 0 0 2.4 1l1.1-.6a1.8 1.8 0 0 1 2.4 2.4l-.6 1.1a1.8 1.8 0 0 0 1 2.4l1.2.4a1.8 1.8 0 0 1 0 3.4l-1.2.4a1.8 1.8 0 0 0-1 2.4l.6 1.1a1.8 1.8 0 0 1-2.4 2.4l-1.1-.6a1.8 1.8 0 0 0-2.4 1l-.4 1.2a1.8 1.8 0 0 1-3.4 0l-.4-1.2a1.8 1.8 0 0 0-2.4-1l-1.1.6a1.8 1.8 0 0 1-2.4-2.4l.6-1.1a1.8 1.8 0 0 0-1-2.4l-1.2-.4a1.8 1.8 0 0 1 0-3.4l1.2-.4a1.8 1.8 0 0 0 1-2.4l-.6-1.1a1.8 1.8 0 0 1 2.4-2.4l1.1.6a1.8 1.8 0 0 0 2.4-1z"/><circle cx="12" cy="12" r="3"/></svg></span>';
const MD_PLUG='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3v4M15 3v4M7 7h10v4a5 5 0 0 1-10 0zM12 16v5"/></svg>';
const MD_UNPLUG='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3v4M15 3v4M7 7h10v4a5 5 0 0 1-10 0zM12 16v5M4 4l16 16"/></svg>';
const MD_CHECK='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
OBJ.midikbd=()=>{ const o=O3(); o.raw('<path d="M98 86c14 4 16 18 6 26" stroke="#2b2560" stroke-width="5" fill="none" stroke-linecap="round"/>'); o.block(96,104,14,14,"#d8d6ee",4);
  o.block(8,48,104,46,"#3a3478",12); o.block(14,54,92,8,"#5b4bd6",4); o.raw('<rect x="16" y="66" width="88" height="24" rx="4" fill="#fbfbff"/><g fill="#2b2560">'+[25,37,55,67,79].map(x=>'<rect x="'+x+'" y="66" width="7" height="14" rx="2"/>').join("")+'</g><g stroke="#d8d6ee" stroke-width="1.2">'+[28,40,52,64,76,88].map(x=>'<path d="M'+(x+.5)+' 80v10"/>').join("")+'</g>');
  return o.ball(30,26,9,"#ff5a6e").ball(58,16,8,"#ffd23f").ball(84,28,8,"#3cc8f0").svg(); };
// ---- état affiché (M1) ----
function mdState(){ const m=S.settings.input, poss=midiPossible();
  if(m==="mic") return {k:micOn?"mic":"micoff", lbl:t(micOn?"mdMic":"mdMicOff")};
  if(m==="screen" && (midiReady || !poss || mdS().seenAt)) return {k:"screen", lbl:t("mdScreen")}; // MIDI 4 : l'entrée « écran » n'écoute pas le clavier MIDI branché
  if(midiReady){ const n=midiNames.length, one=S.settings.midiInput&&midiNames.includes(S.settings.midiInput)?S.settings.midiInput:(n===1?midiNames[0]:"");
    return one ? {k:"ok", lbl:mdTrunc(one), full:one} : {k:"ok", lbl:t("mdNKb")(n), full:midiNames.join(", ")}; }
  if(m==="midi" && poss) return {k:"wait", lbl:t("mdWait")};
  if(poss && !mdS().seenAt) return {k:"plug", lbl:t("mdPlugShort")};
  return {k:"screen", lbl:t("mdScreen")}; }
function mdPill(){ if(!MD) return; const s=mdState(), c=$("inChip"), mb=$("mbMidi");
  const ic = s.k==="plug" ? MD_PLUG : INPUT_ICONS[s.k==="ok"||s.k==="wait" ? "midi" : s.k==="screen" ? "screen" : "mic"];
  if(c){ c.className="inp-chip md-pill md-"+s.k; c.innerHTML='<span class="mp-ic">'+ic+'</span><span class="lbl mp-t"></span>'+MD_GEAR+'<i class="'+(s.k==="wait"||s.k==="micoff"?"off":"on")+'"></i>';
    c.querySelector(".mp-t").textContent=s.lbl; c.title=s.full||s.lbl; c.setAttribute("aria-label",c.title); c.dataset.st=s.k; }
  if(mb){ mb.className="mbar-btn ghost md-mb md-"+s.k; mb.innerHTML=INPUT_ICONS[s.k==="screen"?"screen":s.k.startsWith("mic")?"mic":"midi"]+'<i></i>'; mb.title=s.full||s.lbl; mb.setAttribute("aria-label",mb.title); } }
function mdPillClick(){ closeDrawer(); if(!midiPossible()){ openInputChooser(true); return; }
  if(mdState().k==="plug"){ mwOpen(); return; } // never connected here: the step-by-step assistant (M4)
  if(!midiAcc && !midiDenied && S.settings.input!=="mic"){ setInput("midi",true).then(()=>{ if(!midiOpen) openMidi(); }); return; }
  openMidi(); }
$("mbMidi").addEventListener("click",mdPillClick);
$("mdChange").addEventListener("click",()=>{ closeMidi(); openInputChooser(true); });
// ---- carte « Ton clavier » de l'accueil (M2) ----
function mdHub(){ const c=$("hsMidi"); if(!c||!MD) return; const s=mdS(), poss=midiPossible(), ok=midiReady && md4MidiOn();
  const st = ok ? "ok" : !poss ? "no" : (s.later && Date.now()-s.later<7*864e5) ? "later" : "promo";
  c.className="hs-card hs-midi md-"+st; $("hsMidiDot").classList.toggle("on",ok);
  const o=$("hsMidiObj"); if(st==="promo" && !o.firstChild) o.innerHTML=OBJ.midikbd();
  const kb=/^\d+$/.test(S.settings.kbdSize||"") ? t("mdKeysN")(S.settings.kbdSize) : t("mdConnected"), st1=mdState();
  $("hsMidiK").textContent=t("mdHubK");
  $("hsMidiT").textContent = st==="ok" ? (st1.k==="ok"?st1.lbl:mdTrunc(midiNames[0])) : st==="promo" ? t("mdHubT") : t("hsMidiT");
  $("hsMidiT").title = st==="ok" ? (st1.full||"") : "";
  $("hsMidiSub").textContent = st==="ok" ? kb : st==="promo" ? t("mdHubS") : st==="no" ? t("mdHubNo") : t("mdHubOff");
  $("hsMidiBtn").textContent = st==="ok" ? t("mdTest") : st==="promo" ? t("mdPlug") : st==="no" ? t("mdHubHow") : t("hsMidiConnect"); }
$("hsMidiLater").addEventListener("click",()=>{ mdS().later=Date.now(); save(); mdHub(); });
// ---- branchements à chaud (M13) ----
function mdToast(kind, title, sub, btn, ms, act){ let el=$("mdToast");
  if(!el){ el=document.createElement("div"); el.id="mdToast"; el.setAttribute("role","status"); el.setAttribute("aria-live","polite"); document.body.appendChild(el); }
  el.className="md-toast md-"+kind; el.innerHTML='<span class="mt-ic">'+(kind==="lost"?MD_UNPLUG:kind==="ok"?MD_CHECK:INPUT_ICONS.midi)+'</span><span class="mt-tx"><b></b><small></small></span>'+(btn?'<button class="btn primary" type="button"></button>':'');
  el.querySelector("b").textContent=title; const sm=el.querySelector("small"); sm.textContent=sub||""; sm.hidden=!sub;
  if(btn){ const b=el.querySelector("button"); b.textContent=btn; b.onclick=()=>{ mdToastHide(); if(act) act(); }; }
  requestAnimationFrame(()=>el.classList.add("on")); clearTimeout(MD.tt); MD.tt=setTimeout(mdToastHide,ms||3000); }
function mdToastHide(){ const el=$("mdToast"); if(el) el.classList.remove("on"); clearTimeout(MD.tt); }
function mdPorts(names){ const prev=MD.prev, s=mdS(); MD.prev=names.slice(); if(midiOpen) mtRender();
  if(names.length){ const nm=S.settings.midiInput&&names.includes(S.settings.midiInput)?S.settings.midiInput:names[0];
    if(!s.seenAt || !s.hw || s.hw.name!==nm){ s.seenAt=s.seenAt||Date.now(); s.hw = s.hw&&s.hw.name===nm ? s.hw : {name:nm}; save(); } }
  if(prev===null) return; // the first look is not a change
  const added=names.filter(n=>!prev.includes(n)), gone=prev.filter(n=>!names.includes(n));
  if(added.length){ if(MD.paused){ mdBack(); return; } if(mdQuiet() || midiOpen || (MW&&MW.on)) return;
    if(S.settings.input==="midi") mdToast("ok", t("mdOnNow")(mdTrunc(added[0])), "", null, 3000);
    else mdToast("found", t("mdDetected")(mdTrunc(added[0])), t(S.settings.input==="mic"?"mdWasMic":S.settings.input==="screen"?"mdWasScreen":"mdWasNone"), t("mdUse"), 5000, ()=>{ setInput("midi"); }); return; }
  if(gone.length && !names.length){ if(MD.paused){ mdCdStop(); return; } mdLostNow(); } }
function mdLostNow(){ if(MW&&MW.on) return; const a = (S.settings.input==="midi" && !LV.on) ? actNow() : null;
  const pause = a && (a.k==="learn" || a.k==="daily" || a.k==="game" || (a.k==="duel" && !a.online));
  if(!pause){ if(!mdQuiet()) mdToast("lost", t("mdLostT"), a&&a.online ? t("mdLostOn") : S.settings.input==="midi" ? t("mdLostPill") : "", null, a&&a.online?4000:3000); return; }
  mdToastHide(); MD.paused=a; MD.wait=false; mdHold(true); mdLostRender(); openMod("mdLost"); $("mdGoScreen").focus({preventScroll:true}); }
// the games hold still like behind the « Leave the game? » window (lvHold); LEARN pauses by itself under a window (pauseRound)
function mdHold(on){ const a=MD.paused; if(!a || a.k==="learn" || a.k==="daily") return;
  if(on){ if(HOLD) return; const keep=LV.a; LV.a=a; lvHold(true); LV.a=keep; MD.hold=true; return; }
  if(!MD.hold) return; MD.hold=false; const keep=LV.a; LV.a=a; lvHold(false); LV.a=keep; }
function mdLostRender(back){ $("mdLostS").textContent=t("mdLostSub"); $("mdLost").querySelector(".md-lost").classList.toggle("back",!!back);
  $("mdLostWaitT").textContent = back ? t("mdBack")(back) : MD.wait ? t("mdWaiting") : t("mdWaitAuto"); $("mdWaitKb").setAttribute("aria-pressed",MD.wait); }
function mdBack(){ mdCdStop(); let n=3; mdLostRender(n); MD.cd=setInterval(()=>{ n--; if(n<=0){ mdCdStop(); mdResume(); } else mdLostRender(n); },1000); }
function mdCdStop(){ clearInterval(MD.cd); MD.cd=0; if(MD.paused) mdLostRender(); }
function mdResume(){ if(!MD.paused) return; clearInterval(MD.cd); MD.cd=0; mdHold(false); MD.paused=null; closeMod("mdLost"); renderInputUI(); }
$("mdGoScreen").addEventListener("click",async ()=>{ if(!MD.paused) return; await setInput("screen"); mdResume(); });
$("mdWaitKb").addEventListener("click",()=>{ MD.wait=true; if(!MD.cd) mdLostRender(); });
document.addEventListener("keydown",e=>{ if(MD.paused && e.key==="Escape"){ e.preventDefault(); e.stopImmediatePropagation(); $("mdGoScreen").click(); } },true);
// watch for a keyboard in the background when MIDI was already allowed (the app, or a browser permission granted before): no prompt
function mdWatch(){ if(midiAcc || !navigator.requestMIDIAccess || !midiPossible() || S.settings.input==="midi") return;
  if(document.documentElement.classList.contains("native")){ enableMidi(true); return; }
  try{ navigator.permissions.query({name:"midi"}).then(p=>{ if(p && p.state==="granted" && !midiAcc) enableMidi(true); }).catch(()=>{}); }catch(e){} }
// ---- test « joue une note » en tête de la fenêtre Clavier MIDI (M8) ----
// MIDI 4 (28/10/2026) : plus de force ni de « Tu entends le son deux fois ? » ; la bande montre exactement les touches du clavier reconnu (md4Band)
const MT={lo:null, n:25, last:null};
function mtReset(){ MT.last=null; MT.lo=null; mtRender(); }
function mtNote(m, v, port){ MT.last={m,v,port};
  if(S.settings.midiSound) tone(m,0,.9,.1+.26*v/127);
  const s=mdS(); s.tested=Date.now(); s.hw={...(s.hw&&s.hw.name===port?s.hw:{}), name:port}; save();
  const b=md4Band(m, MT.lo, port); MT.lo=b.lo; MT.n=b.n;
  mtRender(); }
function mtKb(){ const kb=$("mtKb"); if(!kb) return; if(MT.lo==null){ const b=md4Band(null,null,MT.last&&MT.last.port); MT.lo=b.lo; MT.n=b.n; }
  const key=MT.lo+":"+MT.n; if(kb.dataset.lo===key) return; kb.dataset.lo=key; kb.innerHTML=md4BandHTML(MT.lo, MT.lo+MT.n-1); }
function mtRender(){ const box=$("mdTest"); if(!box) return; box.hidden=!midiReady; if(!midiReady) return; mtKb();
  const L=MT.last, kb=$("mtKb"); kb.querySelectorAll(".on").forEach(e=>e.classList.remove("on"));
  const msg=$("mtMsg"); msg.classList.toggle("ok",!!L);
  if(L){ const pc=L.m%12, nc="var(--note-"+pc+")"; const k=kb.querySelector('[data-m="'+L.m+'"]'); if(k){ k.style.setProperty("--nc",nc); k.classList.add("on"); }
    $("mtName").textContent=(S.settings.notation==="fr"?PC_FR:PC_EN)[pc]; $("mtName").parentNode.style.setProperty("--nc",nc);
    $("mtSub").textContent=octName(L.m);
    msg.textContent=t("mdTalks"); const sm=document.createElement("small"); sm.textContent=t("mdFrom")(octName(L.m),L.port); msg.appendChild(sm); }
  else { $("mtName").textContent="♪"; $("mtName").parentNode.style.removeProperty("--nc"); $("mtSub").textContent=""; msg.textContent=t("mdPressAny"); } }
/* ==== fin MIDI lot 1 ==== */
