// fragment de l'IIFE principale — ordre 889c, voir src/app/README.md
/* ==== Micro et mode d'entrée (08/11/2026) ====
// Une seule fenêtre « Mode d'entrée » (#midiModal) à 3 onglets Clavier MIDI / Micro / Écran (#mdInSeg, panneaux #mdPaneMidi/Mic/Screen,
// « Utiliser … » #mdUse) ; onglet Micro : état + Activer/Pause (#micGo), vu-mètre, note entendue, sensibilité (S.settings.micSens),
// accordage (S.settings.micCents + « Mesurer ») ; onglet Écran : taille du clavier à l'écran (#kbField déplacé). Moteur du micro refait (MIC) : contexte audio à lui, créé dans le geste et recréé à la fréquence du
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

// ---- une seule fenêtre « Mode d'entrée » à 3 onglets (la fenêtre Clavier MIDI #midiModal) ----
// Onglets #mdInSeg Clavier MIDI / Micro / Écran : on regarde les réglages de chacun ; l'onglet d'un autre mode que l'entrée choisie
// montre en tête « Utiliser … » (#mdUse) ; la pastille du menu ouvre sur l'onglet de l'entrée choisie (MDT.want sinon).
Object.assign(TXT.fr,{ipUse:{midi:"Utiliser le clavier MIDI",mic:"Utiliser le micro",screen:"Utiliser l'écran"}, ipActive:"Mode d'entrée actif"});
Object.assign(TXT.en,{ipUse:{midi:"Use the MIDI keyboard",mic:"Use the microphone",screen:"Use the screen"}, ipActive:"Current input mode"});
const MDT={tab:null, want:null, mic:""};
const mdtTabs = () => ["midi","mic","screen"].filter(v=>v!=="midi"||midiPossible());
const mdtCur = () => { const m=S.settings.input; return m==="mic"||m==="screen"||m==="midi" ? (m==="midi"&&!midiPossible()?"screen":m) : (midiPossible()?"midi":"screen"); };
{ const body=$("midiModal").querySelector(".midi-body"), pm=document.createElement("div"); pm.id="mdPaneMidi"; pm.className="md-pane"; while(body.firstChild) pm.appendChild(body.firstChild);
  const tabs=document.createElement("div"); tabs.id="mdInSeg"; tabs.className="ip-tabs"; tabs.setAttribute("role","tablist");
  const use=document.createElement("div"); use.id="mdUse"; use.className="md-use";
  const mic=document.createElement("div"); mic.id="mdPaneMic"; mic.className="md-pane"; mic.hidden=true;
  const sc=document.createElement("div"); sc.id="mdPaneScreen"; sc.className="md-pane"; sc.hidden=true; sc.innerHTML='<p class="ip-p" id="ipScreenS"></p>';
  body.append(tabs, use, pm, mic, sc); }
function mdtOpen(tab){ MDT.want=tab||null; if(midiOpen){ MDT.tab=MDT.want||mdtCur(); MDT.want=null; mdtRender(true); } else openMidi(); }
function mdtRender(full){ const M=$("midiModal"); if(!M) return; const tab=MDT.tab||mdtCur(), cur=mdtCur(), L=mdtTabs(); if(!L.includes(tab)) MDT.tab=L[0];
  $("midiTitle").textContent=t("ipT");
  const tb=$("mdInSeg"); tb.setAttribute("aria-label",t("ipT"));
  if(tb.dataset.k!==L.join()+tab+cur+S.settings.lang){ tb.dataset.k=L.join()+tab+cur+S.settings.lang; const N=t("ipModes");
    tb.innerHTML=L.map(v=>'<button type="button" role="tab" id="mdTab-'+v+'" data-v="'+v+'" aria-selected="'+(v===tab)+'" aria-controls="'+(v==="midi"?"mdPaneMidi":v==="mic"?"mdPaneMic":"mdPaneScreen")+'"><span class="ip-ic" aria-hidden="true">'+INPUT_ICONS[v]+'</span><span>'+esc(N[v])+'</span>'+(v===cur?'<i class="ip-on" aria-hidden="true"></i>':'')+'</button>').join("");
    tb.querySelectorAll("button").forEach(b=>b.onclick=()=>{ MDT.tab=b.dataset.v; mdtRender(true); }); }
  $("mdPaneMidi").hidden = tab!=="midi"; $("mdPaneMic").hidden = tab!=="mic"; $("mdPaneScreen").hidden = tab!=="screen";
  const kb=$("kbField"); if(kb){ const host = tab==="screen" ? $("mdPaneScreen") : $("mdPaneMidi"); if(kb.parentNode!==host){ if(tab==="screen") host.appendChild(kb); else { const a=$("optMidiSound"); const lab=a&&a.closest("label"); if(lab && lab.parentNode===host) host.insertBefore(kb, lab); else host.appendChild(kb); } } }
  const u=$("mdUse"); if(tab===cur){ u.className="md-use on"; u.innerHTML='<span class="ip-dot" aria-hidden="true"></span><span></span>'; u.lastChild.textContent=t("ipActive"); }
  else { u.className="md-use"; u.innerHTML='<button type="button" class="btn primary" id="mdUseB"></button>'; const b=$("mdUseB"); b.textContent=t("ipUse")[tab];
    b.onclick=()=>{ const v=tab; if(v!=="mic" && micOn) micStop(); MDT.want=v; setInput(v,true).then(()=>{ MDT.tab=v; mdtRender(true); }); }; }
  if(tab==="screen") $("ipScreenS").textContent=t("ipScreenS");
  const mk=[tab, micOn, MIC.err, micSens(), S.settings.micCents, MIC.tune?1:0, MIC.tuned, S.settings.lang].join("|");
  if(tab==="mic" && (full || MDT.mic!==mk)){ MDT.mic=mk; ipMic($("mdPaneMic")); ipLoop(); } }
function ipMic(B){ const err=!!MIC.err && !micOn, sens=micSens(), c=+S.settings.micCents||0, cur=mdtCur()==="mic";
  B.innerHTML=(cur?'<div class="ip-st'+(micOn?" on":err?" err":"")+'"><span class="ip-dot" aria-hidden="true"></span><span class="ip-stt"><b id="micStT"></b>'+(err?'<small id="micStS"></small>':'')+'</span><button type="button" class="btn'+(micOn?"":" primary")+'" id="micGo"></button></div>':'')
    +'<div class="ip-live"><span class="ip-vu" aria-hidden="true"><i id="micVu"></i></span><div class="ip-note"><small id="micHeardL"></small><b id="micNote" aria-live="polite">—</b><span class="mono" id="micHz"></span></div></div>'
    +'<div class="ip-row"><span class="ip-l" id="micSensL"></span><div class="seg" id="micSens" role="group">'+t("micSens").map((x,i)=>'<button type="button" data-v="'+(i+1)+'" aria-pressed="'+(sens===i+1)+'">'+esc(x)+'</button>').join("")+'</div><small class="ip-h" id="micSensH"></small></div>'
    +'<div class="ip-row"><span class="ip-l" id="micTuneL"></span><div class="ip-tune"><input type="range" min="-50" max="50" step="1" id="micCents" value="'+c+'"><b class="mono" id="micCentsV"></b><button type="button" class="btn" id="micTune"></button></div><small class="ip-h" id="micTuneH"></small></div>'
    +'<p class="ip-tip" id="micTip"></p>';
  if(cur){ $("micStT").textContent=t(micOn?"micOnT":err?"micErrT":"micOffT"); if(err) $("micStS").textContent=t("micErrS");
    $("micGo").textContent=t(micOn?"micPause":err?"micRetry":"micStart"); $("micGo").onclick=()=>{ if(micOn){ micStop(); renderInputUI(); } else { MIC.err=""; micStart(); } }; }
  $("micHeardL").textContent=t("micHeard"); $("micSensL").textContent=t("micSensL"); $("micSensH").textContent=t("micSensH"); $("micTuneL").textContent=t("micTuneL"); $("micTip").textContent=t("micTips");
  $("micSens").setAttribute("aria-label",t("micSensL"));
  $("micTuneH").textContent = MIC.tune ? t("micTuneWait") : MIC.tuned!=null ? t("micTuneOk")(MIC.tuned) : t("micTuneH");
  $("micCentsV").textContent=(c>0?"+":"")+c+" ct"; $("micCents").setAttribute("aria-label",t("micTuneL"));
  $("micCents").oninput=e=>{ S.settings.micCents=+e.target.value; save(); $("micCentsV").textContent=(+e.target.value>0?"+":"")+e.target.value+" ct"; };
  $("micTune").textContent=t("micTuneGo"); $("micTune").disabled=!micOn; $("micTune").onclick=()=>{ MIC.tune=[]; MIC.tuned=null; mdtRender(true); };
  $("micSens").querySelectorAll("button").forEach(b=>b.onclick=()=>{ S.settings.micSens=+b.dataset.v; save(); mdtRender(true); }); }
function ipRender(){ if(midiOpen) mdtRender(); } // appelé par le moteur (micro allumé, coupé, mesure)
const IP={raf:0};
function ipLoop(){ cancelAnimationFrame(IP.raf); const step=()=>{ if(!midiOpen || (MDT.tab||mdtCur())!=="mic") return; IP.raf=requestAnimationFrame(step);
    const vu=$("micVu"); if(vu) vu.style.transform="scaleX("+Math.min(1, MIC.lvl*14).toFixed(3)+")";
    const n=$("micNote"), hz=$("micHz"); if(n){ if(micOn && MIC.f>0 && MIC.m!=null){ n.textContent=octName(MIC.m); n.style.setProperty("--nc","var(--note-"+(((MIC.m%12)+12)%12)+")"); n.classList.add("hit"); hz.textContent=t("micHz")(MIC.f, MIC.cents); } else if(!micOn || MIC.lvl<MIC_RMS[micSens()]){ n.textContent=micOn?t("micNone"):"—"; n.classList.remove("hit"); hz.textContent=""; } } };
  IP.raf=requestAnimationFrame(step); }
{ const o=openMidi; openMidi=function(){ MDT.tab=MDT.want||mdtCur(); MDT.want=null; const r=o.apply(this,arguments); try{ mdtRender(true); }catch(e){ console.warn(e); }
    requestAnimationFrame(()=>{ const b=document.querySelector("#midiModal .midi-body"); if(b) b.scrollTop=0; }); return r; }; }
{ const o=renderMidiModal; renderMidiModal=function(){ const r=o.apply(this,arguments); try{ mdtRender(false); }catch(e){ console.warn(e); } return r; }; }
{ const o=renderInputUI; renderInputUI=function(){ const r=o.apply(this,arguments); try{ if(midiOpen) mdtRender(false); }catch(e){} return r; }; }
// la pastille du menu : la fenêtre s'ouvre sur l'onglet de l'entrée choisie (micro, écran) ; MIDI : comme avant (assistant si jamais branché)
{ const o=mdPillClick; mdPillClick=function(){ const m=S.settings.input; if(m==="mic" || (m==="screen" && mdState().k!=="plug")){ try{ closeDrawer(); }catch(e){} mdtOpen(m); return; } return o.apply(this,arguments); }; }
$("mbMidi").addEventListener("click", e=>{ const m=S.settings.input; if(m==="mic" || (m==="screen" && mdState().k!=="plug")){ e.stopImmediatePropagation(); mdtOpen(m); } }, true);
$("inCfg").addEventListener("click", e=>{ const m=S.settings.input; if(m==="mic"){ e.stopImmediatePropagation(); mdtOpen("mic"); } }, true);
function ipOpen(){ mdtOpen(mdtCur()); }
/* ==== fin Micro et mode d'entrée ==== */
