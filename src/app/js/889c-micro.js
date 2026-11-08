// fragment de l'IIFE principale — ordre 889c, voir src/app/README.md
/* ==== Micro et mode d'entrée (08/11/2026) ====
// Panneau « Mode d'entrée » #inPanel ouvert par la pastille du menu (#inChip, #mbMidi) en entrée micro ou écran : 3 boutons Clavier MIDI /
// Micro / Écran (#inSeg) ; en micro : état + Activer/Pause (#micGo), vu-mètre, note entendue (nom, octave, Hz, écart), sensibilité
// (S.settings.micSens 1/2/3), accordage du piano (S.settings.micCents, curseur + « Mesurer »), conseils. La fenêtre Clavier MIDI reçoit
// les mêmes 3 boutons (#mdInSeg). Moteur du micro refait (MIC) : contexte audio à lui, créé dans le geste et recréé à la fréquence du
// micro si elle diffère (iPad : sinon l'analyse ne reçoit que du silence), relancé s'il est suspendu ; détection MPM (NSDF) sur 2048
// échantillons, Do1 → Do7 ; une note répétée est reconnue à chaque attaque (montée du niveau) ; 2 lectures identiques suffisent. */
Object.assign(TXT.fr,{ipT:"Mode d'entrée", ipModes:{midi:"Clavier MIDI",mic:"Micro",screen:"Écran"},
  micOnT:"Le micro écoute ton piano", micOffT:"Micro en pause", micErrT:"Le micro est bloqué", micErrS:"Autorise le micro pour Piano Challenges (Réglages de l'iPad ou de ton navigateur), puis réessaie.",
  micStart:"Activer le micro", micPause:"Mettre en pause", micRetry:"Réessayer", micHeard:"Note entendue", micNone:"Joue une note…",
  micSensL:"Sensibilité", micSens:["Faible","Normale","Forte"], micSensH:"« Forte » entend un piano doux ou lointain ; « Faible » ignore le bruit de la pièce.",
  micTuneL:"Accordage de ton piano", micTuneH:"Si ton piano est un peu bas ou haut, l'app corrige.", micTuneGo:"Mesurer", micTuneWait:"Tiens une note…", micTuneOk:c=>"Mesuré : "+(c>0?"+":"")+c+" cents",
  micTips:"Pose l'iPad près du piano, joue une note à la fois au début.", ipMidiS:"Branche ton clavier en USB ou en Bluetooth.", ipMidiGo:"Réglages du clavier MIDI", ipScreenS:"Tu joues sur le clavier à l'écran (ou avec les lettres du clavier d'ordinateur).",
  micHz:(hz,c)=>Math.round(hz)+" Hz · "+(c>0?"+":"")+c+" cents"});
Object.assign(TXT.en,{ipT:"Input mode", ipModes:{midi:"MIDI keyboard",mic:"Microphone",screen:"Screen"},
  micOnT:"The microphone is listening to your piano", micOffT:"Microphone paused", micErrT:"The microphone is blocked", micErrS:"Allow the microphone for Piano Challenges (iPad Settings or your browser), then try again.",
  micStart:"Turn on the microphone", micPause:"Pause", micRetry:"Try again", micHeard:"Note heard", micNone:"Play a note…",
  micSensL:"Sensitivity", micSens:["Low","Normal","High"], micSensH:"“High” hears a soft or distant piano; “Low” ignores room noise.",
  micTuneL:"Your piano's tuning", micTuneH:"If your piano is a little flat or sharp, the app corrects it.", micTuneGo:"Measure", micTuneWait:"Hold a note…", micTuneOk:c=>"Measured: "+(c>0?"+":"")+c+" cents",
  micTips:"Put the iPad near the piano and play one note at a time to start.", ipMidiS:"Plug in your keyboard with USB or Bluetooth.", ipMidiGo:"MIDI keyboard settings", ipScreenS:"You play on the on-screen keyboard (or with your computer's letter keys).",
  micHz:(hz,c)=>Math.round(hz)+" Hz · "+(c>0?"+":"")+c+" cents"});

// ---- le moteur ----
const MIC={ctx:null, an:null, src:null, lvl:0, f:-1, m:null, cents:0, clar:0, err:"", tune:null, avg:0};
const MIC_RMS=[0, .02, .009, .004]; // sensibilité 1/2/3 → seuil de niveau
const micSens = () => [1,2,3].includes(+S.settings.micSens) ? +S.settings.micSens : 2;
const AC_ = () => window.AudioContext || window.webkitAudioContext;
function micNewCtx(sr){ const A=AC_(); if(!A) return null; try{ return sr ? new A({latencyHint:"interactive", sampleRate:sr}) : new A({latencyHint:"interactive"}); }catch(e){ try{ return new A(); }catch(_){ return null; } } }
// hauteur par la fonction de différence normalisée (McLeod) : robuste aux octaves, bonne dans le grave
function micPitch(buf, sr, thr){ const N=buf.length, W=1024; let rms=0; for(let i=0;i<N;i++) rms+=buf[i]*buf[i]; rms=Math.sqrt(rms/N); MIC.lvl=rms;
  if(rms<thr) return -1;
  const minL=Math.max(2,Math.floor(sr/2200)), maxL=Math.min(N-W-1,Math.ceil(sr/31)), nsdf=new Float32Array(maxL+2);
  for(let tau=minL; tau<=maxL+1; tau++){ let acf=0, m=0; for(let i=0;i<W;i++){ const a=buf[i], b=buf[i+tau]; acf+=a*b; m+=a*a+b*b; } nsdf[tau]= m>0 ? 2*acf/m : 0; }
  let i=minL; while(i<=maxL && nsdf[i]>0) i++; // sortir du premier lobe
  const peaks=[]; let best=-1, bi=-1;
  for(; i<=maxL; i++){ if(nsdf[i]>0){ if(nsdf[i]>best){ best=nsdf[i]; bi=i; } } else if(bi>0){ peaks.push([bi,best]); best=-1; bi=-1; } }
  if(bi>0) peaks.push([bi,best]); if(!peaks.length) return -1;
  const top=Math.max(...peaks.map(p=>p[1])); if(top<.6) return -1;
  const [p,v]=peaks.find(q=>q[1]>=top*.88); MIC.clar=v;
  const a=nsdf[p-1], b=nsdf[p], c=nsdf[p+1], d=a-2*b+c, sh = d ? (a-c)/(2*d) : 0;
  return sr/(p+sh); }
async function micStart(){ if(micOn || micAsking) return; const md=navigator.mediaDevices; if(!md || !md.getUserMedia){ MIC.err="nogum"; micErrUI(); return; }
  // le contexte d'analyse : créé tout de suite (dans le geste, iOS), à part du son de l'app
  let ctx=MIC.ctx; if(!ctx || ctx.state==="closed"){ ctx=micNewCtx(); MIC.ctx=ctx; } try{ if(ctx && ctx.state!=="running") ctx.resume(); }catch(e){}
  micAsking=true; let stream;
  try{ stream=await md.getUserMedia({audio:{echoCancellation:false, noiseSuppression:false, autoGainControl:false, channelCount:1}}); }
  catch(err){ MIC.err=(err&&err.name)||"err"; micAsking=false; micErrUI(); return; }
  micAsking=false; if(micOn){ stream.getTracks().forEach(tr=>tr.stop()); return; }
  try{ const tr=stream.getAudioTracks()[0], sr=tr && tr.getSettings && tr.getSettings().sampleRate;
    if(sr && ctx && Math.abs(ctx.sampleRate-sr)>1){ try{ ctx.close(); }catch(e){} ctx=micNewCtx(sr)||micNewCtx(); MIC.ctx=ctx; } }catch(e){}
  if(!ctx){ ctx=audio(); MIC.ctx=null; } if(!ctx){ stream.getTracks().forEach(tr=>tr.stop()); MIC.err="noctx"; micErrUI(); return; }
  try{ if(ctx.state!=="running") await ctx.resume(); }catch(e){}
  try{ MIC.src=ctx.createMediaStreamSource(stream); MIC.an=ctx.createAnalyser(); MIC.an.fftSize=2048; MIC.an.smoothingTimeConstant=0; MIC.src.connect(MIC.an); }
  catch(e){ stream.getTracks().forEach(tr=>tr.stop()); MIC.err="src"; micErrUI(); return; }
  MIC.err=""; micStream=stream; micOn=true; $("micBtn").classList.add("on"); $("micBtn").classList.remove("err"); $("micTxt").textContent=t("micOn"); notice("");
  const buf=new Float32Array(MIC.an.fftSize); let cand=null, count=0, lastEmit=null, env=0, held=0;
  clearInterval(micTimer);
  micTimer=setInterval(()=>{ const c=MIC.an&&MIC.an.context; if(!c) return; if(c.state==="suspended"||c.state==="interrupted"){ try{ c.resume(); }catch(e){} }
    MIC.an.getFloatTimeDomainData(buf); const f=micPitch(buf, c.sampleRate, MIC_RMS[micSens()]), lv=MIC.lvl;
    const attack = lv > env*1.8 && lv > MIC_RMS[micSens()]*1.5; env = Math.max(lv, env*.85); // une nouvelle attaque (même note rejouée)
    if(f<0 || f<30 || f>2300){ MIC.f=-1; held++; if(held>3){ cand=null; count=0; lastEmit=null; } return; } held=0;
    const exact=69+12*Math.log2(f/440)-(+S.settings.micCents||0)/100, m=Math.round(exact); MIC.f=f; MIC.m=m; MIC.cents=Math.round((exact-m)*100);
    if(MIC.tune){ MIC.tune.push((69+12*Math.log2(f/440)-m)*100); if(MIC.tune.length>=24) micTuneEnd(); }
    if(performance.now()<micMuteUntil) return;
    if(attack && m===lastEmit) lastEmit=null;
    if(m===cand) count++; else { cand=m; count=1; }
    if(count>=2 && m!==lastEmit){ lastEmit=m; flashKey(m,"k-hit",150); midiIn(m); }
  },25);
  renderInputUI(); ipRender(); }
{ const o=micStop; micStop=function(){ const r=o.apply(this,arguments); try{ if(MIC.src) MIC.src.disconnect(); }catch(e){} MIC.src=null; MIC.an=null; MIC.f=-1; MIC.lvl=0;
    try{ if(MIC.ctx && MIC.ctx.state!=="closed") MIC.ctx.suspend(); }catch(e){} ipRender(); return r; }; }
function micErrUI(){ $("micBtn").classList.add("err"); $("micTxt").textContent=t("micBlocked"); notice(t("blocked")); renderInputUI(); ipRender(); }
// le bouton historique #micBtn (et tout ce qui le « clique ») passe par ce moteur
$("micBtn").addEventListener("click", e=>{ e.stopImmediatePropagation(); e.preventDefault(); if(micOn){ micStop(); renderInputUI(); return; } micStart(); }, true);
// la fenêtre « Préparer le micro » (D28) lit le même contexte
{ const o=mpListen; mpListen=function(){ const a=audio; if(MIC.an) audio=()=>MIC.an.context; try{ return o.apply(this,arguments); } finally { audio=a; } }; }
function micTuneEnd(){ const L=MIC.tune.slice().sort((a,b)=>a-b); MIC.tune=null; const med=L[Math.floor(L.length/2)]; S.settings.micCents=Math.max(-50,Math.min(50,Math.round(med))); save(); MIC.tuned=S.settings.micCents; ipRender(); }

// ---- le panneau « Mode d'entrée » ----
{ const m=document.createElement("div"); m.className="modal"; m.id="inPanel"; m.hidden=true; m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-labelledby","ipT");
  m.innerHTML='<div class="modal-bg" data-close="inPanel"></div><div class="modal-card small ip-card"><div class="modal-head"><h2 id="ipT"></h2><button class="modal-close" type="button" data-close="inPanel" aria-label="Close">×</button></div>'
    +'<div class="modal-body"><div class="seg ip-seg" id="inSeg" role="group"></div><div id="ipBody"></div></div></div>';
  document.body.appendChild(m); }
const IP={raf:0};
function ipSegHTML(id){ const M=t("ipModes"), cur=S.settings.input||"screen", L=["midi","mic","screen"].filter(v=>v!=="midi"||midiPossible());
  return L.map(v=>'<button type="button" data-v="'+v+'" aria-pressed="'+(cur===v)+'"><span class="ip-ic" aria-hidden="true">'+INPUT_ICONS[v]+'</span><span>'+esc(M[v])+'</span></button>').join(""); }
function ipPick(v){ if(v===(S.settings.input||"screen") && v!=="midi") return;
  if(v==="midi"){ closeMod("inPanel"); setInput("midi",true).then(()=>{ if(!midiOpen) openMidi(); }); return; }
  setInput(v,true); if(v!=="mic" && micOn) micStop(); setTimeout(ipRender,0); }
function ipOpen(){ openMod("inPanel"); ipRender(); ipLoop(); }
function ipRender(){ const P=$("inPanel"); if(!P || P.hidden) return; $("ipT").textContent=t("ipT");
  const seg=$("inSeg"); seg.setAttribute("aria-label",t("ipT")); seg.innerHTML=ipSegHTML(); seg.querySelectorAll("button").forEach(b=>b.onclick=()=>ipPick(b.dataset.v));
  const m=S.settings.input||"screen", B=$("ipBody");
  if(m==="mic"){ const err=!!MIC.err && !micOn, sens=micSens(), c=+S.settings.micCents||0;
    B.innerHTML='<div class="ip-st'+(micOn?" on":err?" err":"")+'"><span class="ip-dot" aria-hidden="true"></span><span class="ip-stt"><b id="micStT"></b>'+(err?'<small id="micStS"></small>':'')+'</span><button type="button" class="btn'+(micOn?"":" primary")+'" id="micGo"></button></div>'
      +'<div class="ip-live"><span class="ip-vu" aria-hidden="true"><i id="micVu"></i></span><div class="ip-note"><small id="micHeardL"></small><b id="micNote" aria-live="polite">—</b><span class="mono" id="micHz"></span></div></div>'
      +'<div class="ip-row"><span class="ip-l" id="micSensL"></span><div class="seg" id="micSens" role="group">'+t("micSens").map((x,i)=>'<button type="button" data-v="'+(i+1)+'" aria-pressed="'+(sens===i+1)+'">'+esc(x)+'</button>').join("")+'</div><small class="ip-h" id="micSensH"></small></div>'
      +'<div class="ip-row"><span class="ip-l" id="micTuneL"></span><div class="ip-tune"><input type="range" min="-50" max="50" step="1" id="micCents" value="'+c+'"><b class="mono" id="micCentsV"></b><button type="button" class="btn" id="micTune"></button></div><small class="ip-h" id="micTuneH"></small></div>'
      +'<p class="ip-tip" id="micTip"></p>';
    $("micStT").textContent=t(micOn?"micOnT":err?"micErrT":"micOffT"); if(err) $("micStS").textContent=t("micErrS");
    $("micGo").textContent=t(micOn?"micPause":err?"micRetry":"micStart"); $("micGo").onclick=()=>{ if(micOn){ micStop(); renderInputUI(); } else { MIC.err=""; micStart(); } };
    $("micHeardL").textContent=t("micHeard"); $("micSensL").textContent=t("micSensL"); $("micSensH").textContent=t("micSensH"); $("micTuneL").textContent=t("micTuneL"); $("micTip").textContent=t("micTips");
    $("micTuneH").textContent = MIC.tune ? t("micTuneWait") : MIC.tuned!=null ? t("micTuneOk")(MIC.tuned) : t("micTuneH");
    $("micCentsV").textContent=(c>0?"+":"")+c+" ct"; $("micCents").setAttribute("aria-label",t("micTuneL"));
    $("micCents").oninput=e=>{ S.settings.micCents=+e.target.value; save(); $("micCentsV").textContent=(+e.target.value>0?"+":"")+e.target.value+" ct"; };
    $("micTune").textContent=t("micTuneGo"); $("micTune").disabled=!micOn; $("micTune").onclick=()=>{ MIC.tune=[]; MIC.tuned=null; ipRender(); };
    $("micSens").querySelectorAll("button").forEach(b=>b.onclick=()=>{ S.settings.micSens=+b.dataset.v; save(); ipRender(); }); }
  else if(m==="midi"){ B.innerHTML='<p class="ip-p" id="ipMidiS"></p><button type="button" class="btn primary" id="ipMidiGo"></button>'; $("ipMidiS").textContent=t("ipMidiS"); $("ipMidiGo").textContent=t("ipMidiGo"); $("ipMidiGo").onclick=()=>{ closeMod("inPanel"); openMidi(); }; }
  else { B.innerHTML='<p class="ip-p" id="ipScreenS"></p>'; $("ipScreenS").textContent=t("ipScreenS"); } }
function ipLoop(){ cancelAnimationFrame(IP.raf); const step=()=>{ const P=$("inPanel"); if(!P || P.hidden) return; IP.raf=requestAnimationFrame(step);
    const vu=$("micVu"); if(vu) vu.style.transform="scaleX("+Math.min(1, MIC.lvl*14).toFixed(3)+")";
    const n=$("micNote"), hz=$("micHz"); if(n){ if(micOn && MIC.f>0 && MIC.m!=null){ n.textContent=octName(MIC.m); n.style.setProperty("--nc","var(--note-"+(((MIC.m%12)+12)%12)+")"); n.classList.add("hit"); hz.textContent=t("micHz")(MIC.f, MIC.cents); } else if(!micOn || MIC.lvl<MIC_RMS[micSens()]){ n.textContent=micOn?t("micNone"):"—"; n.classList.remove("hit"); hz.textContent=""; } } };
  IP.raf=requestAnimationFrame(step); }
// la pastille : micro / écran → ce panneau ; MIDI → la fenêtre Clavier MIDI (avec les 3 boutons)
{ const o=mdPillClick; mdPillClick=function(){ const m=S.settings.input; if(m==="mic" || (m==="screen" && mdState().k!=="plug")){ try{ closeDrawer(); }catch(e){} ipOpen(); return; } return o.apply(this,arguments); }; }
$("mbMidi").addEventListener("click", e=>{ const m=S.settings.input; if(m==="mic" || (m==="screen" && mdState().k!=="plug")){ e.stopImmediatePropagation(); ipOpen(); } }, true);
$("inCfg").addEventListener("click", e=>{ if(S.settings.input==="mic"){ e.stopImmediatePropagation(); ipOpen(); } }, true);
// les 3 boutons aussi en tête de la fenêtre Clavier MIDI
{ const o=renderMidiModal; renderMidiModal=function(){ const r=o.apply(this,arguments); try{ const body=document.querySelector("#midiModal .midi-body"); if(!body) return r;
    let s=$("mdInSeg"); if(!s){ s=document.createElement("div"); s.id="mdInSeg"; s.className="seg ip-seg"; s.setAttribute("role","group"); body.prepend(s); }
    s.setAttribute("aria-label",t("ipT")); s.innerHTML=ipSegHTML(); s.querySelectorAll("button").forEach(b=>b.onclick=()=>{ const v=b.dataset.v; if(v==="midi"){ if(S.settings.input!=="midi") setInput("midi",true); return; } closeMidi(); setInput(v,true); setTimeout(ipOpen,0); }); }catch(e){ console.warn(e); } return r; }; }
{ const o=openMidi; openMidi=function(){ const r=o.apply(this,arguments); requestAnimationFrame(()=>{ const b=document.querySelector("#midiModal .midi-body"); if(b) b.scrollTop=0; }); return r; }; }
{ const o=renderInputUI; renderInputUI=function(){ const r=o.apply(this,arguments); try{ if($("inPanel") && !$("inPanel").hidden) ipRender(); }catch(e){} return r; }; }
/* ==== fin Micro et mode d'entrée ==== */
