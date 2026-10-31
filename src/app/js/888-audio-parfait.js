// fragment de l'IIFE principale — ordre 888, voir src/app/README.md
/* ==== Audio parfait (chantier audio5) ==== */
// Craquements en temps réel (31/10/2026). Les rendus hors ligne étaient propres : les trous venaient du fil audio qui ne tenait pas le
// rythme (charge du graphe) et de pointes de travail du fil principal pendant le jeu. Ce bloc :
// - un seul AudioContext pour tout (sons de l'app tone(), mode PIANO, lecteur Play en iframe via window.__pcAudio, métronome),
//   créé avec latencyHint "interactive" (ou "balanced" = « Mode audio stable » de Réglages › Application › Diagnostic audio,
//   localStorage pc-audio-lat, propre à l'appareil, appliqué au prochain lancement) ;
// - filtres en automatisation « k-rate » sur ce contexte (auKctx : coefficients calculés une fois par bloc de 128 échantillons au lieu
//   de chaque échantillon ; le synthé doux coûtait ~100 % d'un cœur avec 28 voix) ; dérive du synthé doux en k-rate ;
// - plafond de voix par instrument, voix en relâche comprises (AU_CAP ; la plus ancienne part en fondu de 15 ms, auKill) ; voix
//   retirées de PN.all / PN.on à la fin (« ended ») : aucune fuite de nœuds ;
// - sortie des sons de l'app tone() : niveau selon le nombre de sons simultanés + écrêtage doux (pnSoftCurve) + fondu de reprise ;
//   chaque son se déconnecte à la fin, fin en rampe jusqu'à 0 ;
// - reprise après une interruption iOS (appel, autre app, changement de sortie) ou une suspension : fondu de 30 ms (auFadeArm) ;
// - lumières du mode PIANO : la position de la touche n'est plus lue pendant la note (getBoundingClientRect forçait une mise en page
//   à chaque note d'un accord) mais au début de l'image suivante (pnSpawn mis en file, vidée par vzLoop) ; particules plafonnées ;
// - Diagnostic audio (Réglages › Application) : contexte, latences, voix, charge, décrochages estimés, tâches longues ; Copier,
//   Joindre à un signalement (fbOpen) ; Mode audio stable.
// Garde de CI : tools/audit/r55_audio.mjs (rendu hors ligne de chaque instrument et de tone(), temps réel simulé 2 min, fuites).
const AU={off:null, offM:null, T:null, cx:0, lat:"low", live:new Set(), tones:[], lv:1, peak:0, gap:0, gapMs:0, sw:0, sa:0, lt:[], q:[], made:0};
try{ AU.lat = localStorage.getItem("pc-audio-lat")==="safe" ? "safe" : "low"; }catch(e){}
const AU_CAP={grand:40, epiano:24, organ:20, pad:10, lead:14, mallet:32, musicbox:32};
// filters of this context: k-rate automation (a filter sweep or a slow LFO does not need a new filter every sample)
function auKctx(c){ if(!c || c.__auK) return; c.__auK=1; const mk=c.createBiquadFilter;
  c.createBiquadFilter=function(){ const f=mk.apply(c,arguments); try{ ["frequency","Q","detune","gain"].forEach(k=>{ f[k].automationRate="k-rate"; }); }catch(e){} return f; }; }
// tone() output: low-pass (as before), level by number of sounds, soft clipper (no look-ahead, no latency), resume fade
function auTail(c,m){ const lp=c.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=3200;
  const lv=c.createGain(), pre=c.createGain(), ws=c.createWaveShaper(), fd=c.createGain(); pre.gain.value=.5; ws.curve=pnSoftCurve(); ws.oversample="none";
  m.connect(lp); lp.connect(lv); lv.connect(pre); pre.connect(ws); ws.connect(fd); fd.connect(c.destination); return {c,lv,fd}; }
// a context that stopped (iOS interruption, suspension) starts again from silence: the outputs ramp up over 30 ms
function auFadeArm(){ [AU.T, PN.A].forEach(o=>{ if(!o || !o.fd) return; const c=o.c, p=o.fd.gain; try{ const t=c.currentTime; p.cancelScheduledValues(t); p.setValueAtTime(0,t); p.linearRampToValueAtTime(1,t+.03); }catch(e){} }); AU.sw=0; }
audio=function(){ if(AU.off) return AU.off;
  if(!ctx){ const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return null;
    try{ ctx=new AC({latencyHint: AU.lat==="safe" ? "balanced" : "interactive"}); }catch(e){ ctx=new AC(); }
    AU.cx++; auKctx(ctx); master=ctx.createGain(); master.gain.value=.55; AU.T=auTail(ctx,master);
    const c=ctx; try{ c.addEventListener("statechange",()=>{ if(c.state!=="running") auFadeArm(); AU.sw=0; }); }catch(e){} }
  if(ctx.state==="suspended" || ctx.state==="interrupted"){ auFadeArm(); try{ const p=ctx.resume(); if(p && p.catch) p.catch(()=>{}); }catch(e){} } // "interrupted": iOS (a call, another app, a Bluetooth route change)
  return ctx; };
window.__pcAudio=()=>{ try{ return audio(); }catch(e){ return null; } }; // the Play frame (same origin) plays on this context: one context for the whole app
// audio clock vs wall clock, sampled when notes are played (no timer): the audio clock falling behind = audio dropouts (estimate)
function auSample(c){ if(!c || c===AU.off || c.state!=="running") return; const w=performance.now();
  if(!AU.sw){ AU.sw=w; AU.sa=c.currentTime; return; } const dw=(w-AU.sw)/1000; if(dw<2) return;
  if(dw<12){ const lag=dw-(c.currentTime-AU.sa); if(lag>.02){ AU.gap++; AU.gapMs+=Math.round(lag*1000); } }
  AU.sw=w; AU.sa=c.currentTime; }
try{ new PerformanceObserver(l=>l.getEntries().forEach(e=>{ AU.lt.push([e.startTime,e.duration]); if(AU.lt.length>200) AU.lt.splice(0,AU.lt.length-200); })).observe({type:"longtask"}); }catch(e){}
// the app's sounds (exercises, games, quiz, MIDI notes outside PIANO): same timbre as before; the sound disconnects when it ends
tone=function(midi, when=0, dur=.6, vol=.28){ const c=audio(); if(!c) return; const m=AU.off ? AU.offM : master, T=AU.off ? AU.offT : AU.T;
  const t0=c.currentTime+when, f=440*Math.pow(2,(midi-69)/12), end=t0+dur+.05;
  [["triangle",1,vol],["sine",2,vol*.25]].forEach(([type,mul,v])=>{
    const o=c.createOscillator(), g=c.createGain(); o.type=type; o.frequency.value=f*mul;
    g.gain.setValueAtTime(0,t0); g.gain.linearRampToValueAtTime(v,t0+.012); g.gain.exponentialRampToValueAtTime(.0008,t0+dur); g.gain.linearRampToValueAtTime(0,t0+dur+.04);
    o.connect(g); g.connect(m); o.start(t0); o.stop(end); o.onended=()=>{ try{ g.disconnect(); }catch(e){} }; });
  AU.made+=4; const now=c.currentTime; AU.tones=AU.tones.filter(x=>x[1]>now); AU.tones.push([t0,end]);
  if(when<.05 && T){ const n=AU.tones.filter(x=>x[0]<=t0+.03).length, g=Math.min(1,2.4/Math.sqrt(Math.max(1,n))); // up to 5 sounds: unchanged
    if(Math.abs(g-(T.lv.__v||1))>.02){ const up=g>(T.lv.__v||1); T.lv.__v=g; try{ T.lv.gain.cancelScheduledValues(now); T.lv.gain.setTargetAtTime(g,now,up?.12:.01); }catch(e){} } }
  AU.peak=Math.max(AU.peak, AU.tones.length+AU.live.size); auSample(c);
  micMuteUntil=Math.max(micMuteUntil, performance.now()+(when+dur)*1000+180); };

// ---- mode PIANO ----
// the bus gets a resume fade after the soft clipper; the context's filters are k-rate
// + a DC blocker before the soft clipper (high-pass 15 Hz): an offset ate the headroom and clipped one side
{ const o=pnAudio; pnAudio=function(){ const had=PN.A, A=o.apply(this,arguments); if(A && A!==had && !A.fd){ const c=A.c; auKctx(c);
      A.fd=c.createGain(); try{ A.ws.disconnect(); }catch(e){} A.ws.connect(A.fd); A.fd.connect(c.destination);
      const hp=c.createBiquadFilter(); hp.type="highpass"; hp.frequency.value=15; hp.Q.value=.6; const pre=c.createGain(); pre.gain.value=.5;
      try{ A.out.disconnect(); }catch(e){} A.out.connect(hp); hp.connect(pre); pre.connect(A.ws); A.hp=hp; } return A; }; }
// electric piano: its FM carriers (modulation deeper than the pitch: the frequency crosses zero) left a strong offset (mean up to
// +0.6 on a loud chord, ~6 % of a single note) → each voice goes through its own DC blocker (high-pass 25 Hz)
{ const o=PN_SYN.epiano; PN_SYN.epiano=function(c,t,m,f,v,out){ const hp=c.createBiquadFilter(); hp.type="highpass"; hp.frequency.value=25; hp.Q.value=.6; hp.connect(out);
    const r=o.call(this,c,t,m,f,v,hp); return r; }; }
// soft pad: the slow drift of one saw is k-rate too (an a-rate detune recomputed the pitch every sample)
{ const o=PN_SYN.pad; PN_SYN.pad=function(){ const r=o.apply(this,arguments); try{ r.src.forEach(s=>{ if(s.detune) s.detune.automationRate="k-rate"; }); }catch(e){} return r; }; }
// a voice that must go now (over the cap): 15 ms fade, then stop
function auKill(vc){ if(!vc) return; vc.done=true; vc.killed=true; const c=vc.c, t=c.currentTime, p=vc.g.gain;
  try{ if(p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(t); else { const x=p.value; p.cancelScheduledValues(t); p.setValueAtTime(x,t); } p.setTargetAtTime(0,t,.004); }catch(e){}
  vc.src.forEach(s=>{ try{ s.stop(t+.03); }catch(e){} }); AU.live.delete(vc); auForget(vc); }
function auForget(vc){ const i=PN.all.indexOf(vc); if(i>=0) PN.all.splice(i,1); const l=PN.on.get(vc.m); if(l){ const j=l.indexOf(vc); if(j>=0){ l.splice(j,1); if(!l.length) PN.on.delete(vc.m); } } }
{ const o=pnVoice; pnVoice=function(m,v){ const A=pnAudio(); if(!A) return null; const c=A.c, cap=AU_CAP[pnCfg().ins]||28;
    for(const x of AU.live) if(x.c!==c) AU.live.delete(x);
    if(AU.live.size>=cap){ const old=[...AU.live].sort((a,b)=>((b.done?1:0)-(a.done?1:0)) || a.t0-b.t0); // releasing voices first, then the oldest
      while(AU.live.size>=cap && old.length) auKill(old.shift()); }
    const vc=o.apply(this,arguments); if(!vc) return vc; vc.t0=c.currentTime; AU.live.add(vc); AU.made+=vc.src.length+2;
    const s0=vc.src[0]; if(s0 && s0.addEventListener) s0.addEventListener("ended",()=>{ AU.live.delete(vc); auForget(vc); });
    AU.peak=Math.max(AU.peak, AU.live.size+AU.tones.length); auSample(c); return vc; }; }
// lights: the key's position is read at the start of the next frame (one layout per frame), not inside the note handler
const AU_PMAX=520;
{ const sp=pnSpawn, off=vzOff, lp=vzLoop;
  pnSpawn=function(m,v){ if(page!=="piano" || !VZ.cv) return; AU.q.push({m,v}); if(!VZ.raf) VZ.raf=requestAnimationFrame(vzLoop); };
  vzOff=function(m){ AU.q.forEach(e=>{ if(e.m===m) e.off=1; }); return off.apply(this,arguments); };
  vzLoop=function(ts){ if(AU.q.length){ const q=AU.q; AU.q=[]; q.forEach(e=>{ sp(e.m,e.v); if(e.off) off(e.m); });
      if(VZ.P.length>AU_PMAX) VZ.P.splice(0,VZ.P.length-AU_PMAX); }
    return lp.apply(this,arguments); }; }
{ const o=pnAllOff; pnAllOff=function(){ AU.q.length=0; return o.apply(this,arguments); }; }

// ---- Diagnostic audio (Réglages › Application) ----
Object.assign(TXT.fr,{auDiagH:"Diagnostic audio", auDiagS:"Pour comprendre un craquement : joue un moment, puis copie ces informations dans un signalement.",
  auCtx:"Contexte audio", auLat:"Latence", auVoices:"Voix", auLoad:"Charge audio", auGaps:"Décrochages estimés", auMain:"Tâches longues (1 min)", auFx:"Mode PIANO", auDev:"Appareil",
  auBase:"base", auOut:"sortie", auNow:"en cours", auMax:"maximum", auNA:"non mesurable ici", auNone:"aucun", auOff:"pas encore créé (joue une note)",
  auSafe:"Mode audio stable", auSafeS:"Un peu plus de latence (≈ 20 ms), moins de risques de craquements. Appliqué au prochain lancement de l'app.",
  auCopy:"Copier", auCopied:"Copié", auReport:"Joindre à un signalement", auModeLow:"minimale", auModeSafe:"stable", auAsk:"Décris ce que tu entends (quand, sur quel écran, avec quel son) :", auSt:{running:"actif",suspended:"en pause",interrupted:"interrompu",closed:"fermé"}, auCx:n=>n+(n>1?" contextes":" contexte")});
Object.assign(TXT.en,{auDiagH:"Audio diagnostics", auDiagS:"To understand a crackle: play for a while, then copy this information into a report.",
  auCtx:"Audio context", auLat:"Latency", auVoices:"Voices", auLoad:"Audio load", auGaps:"Estimated dropouts", auMain:"Long tasks (1 min)", auFx:"PIANO mode", auDev:"Device",
  auBase:"base", auOut:"output", auNow:"now", auMax:"max", auNA:"not measurable here", auNone:"none", auOff:"not created yet (play a note)",
  auSafe:"Stable audio mode", auSafeS:"A little more latency (≈ 20 ms), less risk of crackles. Applied the next time the app starts.",
  auCopy:"Copy", auCopied:"Copied", auReport:"Attach to a report", auModeLow:"minimal", auModeSafe:"stable", auAsk:"Describe what you hear (when, on which screen, with which sound):", auSt:{running:"running",suspended:"suspended",interrupted:"interrupted",closed:"closed"}, auCx:n=>n+(n>1?" contexts":" context")});
function auRows(){ const c=ctx, rows=[], ms=x=>x==null||!isFinite(x)?"?":(x*1000).toFixed(1)+" ms";
  if(!c) rows.push([t("auCtx"), t("auOff")]);
  else { rows.push([t("auCtx"), (t("auSt")[c.state]||c.state)+" · "+c.sampleRate+" Hz · "+t("auCx")(AU.cx)]);
    rows.push([t("auLat"), t("auBase")+" "+ms(c.baseLatency)+" · "+t("auOut")+" "+ms(c.outputLatency)+" · "+(AU.lat==="safe"?t("auModeSafe"):t("auModeLow"))]);
    const now=c.currentTime, pv=[...AU.live].filter(x=>x.c===c).length, tv=AU.tones.filter(x=>x[1]>now).length;
    rows.push([t("auVoices"), t("auNow")+" "+(pv+tv)+" (PIANO "+pv+", app "+tv+") · "+t("auMax")+" "+AU.peak]);
    let ld=t("auNA"); try{ if(c.renderCapacity && c.renderCapacity.averageLoad!=null) ld=Math.round(c.renderCapacity.averageLoad*100)+" %"; }catch(e){}
    rows.push([t("auLoad"), ld]);
    let g=AU.gap ? AU.gap+" ("+AU.gapMs+" ms)" : t("auNone"); try{ const ps=c.playoutStats; if(ps && ps.fallbackFramesEvents!=null) g+=" · fallback "+ps.fallbackFramesEvents+" ("+Math.round(ps.fallbackFramesDuration)+" ms)"; }catch(e){}
    rows.push([t("auGaps"), g]); }
  const w=performance.now()-60000, lt=AU.lt.filter(x=>x[0]>w);
  rows.push([t("auMain"), lt.length ? lt.length+" · max "+Math.round(Math.max(...lt.map(x=>x[1])))+" ms" : (typeof PerformanceObserver!=="undefined" && (PerformanceObserver.supportedEntryTypes||[]).includes("longtask") ? t("auNone") : t("auNA"))]);
  try{ const k=pnCfg(); rows.push([t("auFx"), (t("pnIns")[k.ins]||k.ins)+" · "+(t("pnViz")[pnVizNow()]||"")+" · rev "+Math.round(k.rev*100)+" · cho "+Math.round(k.cho*100)+" · dly "+Math.round(k.dly*100)+" · vol "+Math.round(k.vol*100)]); }catch(e){}
  try{ const x=trkCtx(); rows.push([t("auDev"), x.v+" · "+x.d+" · "+x.s+" · "+String(navigator.userAgent||"").slice(0,80)]); }catch(e){}
  return rows; }
const auText = () => t("auDiagH")+"\n"+auRows().map(r=>r[0]+" : "+r[1]).join("\n");
function auDiagRender(){ const D=$("auDiag"); if(!D) return; D.querySelector("summary").textContent=t("auDiagH"); D.querySelector(".au-s").textContent=t("auDiagS");
  D.querySelector(".au-t").innerHTML=auRows().map(r=>"<dt>"+esc(r[0])+"</dt><dd>"+esc(r[1])+"</dd>").join("");
  $("auCopy").textContent=t("auCopy"); $("auRep").textContent=t("auReport");
  const s=$("auSafe"); s.checked=AU.lat==="safe" ? (s.dataset.v!=="low") : s.dataset.v==="safe"; D.querySelector(".au-safe b").textContent=t("auSafe"); D.querySelector(".au-safe small").textContent=t("auSafeS"); }
{ const sec=document.querySelector("#setPane .set-app"), ref=sec && sec.querySelector(".trk-set");
  if(sec){ const D=document.createElement("details"); D.className="au-diag"; D.id="auDiag";
    D.innerHTML='<summary></summary><p class="au-s"></p><dl class="au-t"></dl><label class="check au-safe"><input type="checkbox" id="auSafe"> <span><b></b><small></small></span></label>'
      +'<p class="au-b"><button class="btn" id="auCopy" type="button"></button> <button class="btn" id="auRep" type="button"></button></p>';
    sec.insertBefore(D, ref ? ref.nextSibling : null); let tm=0;
    D.addEventListener("toggle",()=>{ clearInterval(tm); if(D.open){ auDiagRender(); tm=setInterval(()=>{ if(!D.open || !D.offsetParent){ clearInterval(tm); return; } auDiagRender(); },1000); } });
    $("auSafe").addEventListener("change",e=>{ const v=e.target.checked?"safe":"low"; e.target.dataset.v=v; try{ if(v==="safe") localStorage.setItem("pc-audio-lat","safe"); else localStorage.removeItem("pc-audio-lat"); }catch(x){} if(!ctx) AU.lat=v; });
    $("auCopy").addEventListener("click",async ()=>{ const b=$("auCopy"); try{ await navigator.clipboard.writeText(auText()); b.textContent=t("auCopied"); setTimeout(()=>{ b.textContent=t("auCopy"); },1500); }catch(e){} });
    $("auRep").addEventListener("click",()=>{ const tx=auText(); D.open=false; fbOpen(); fbKind("bug"); const m=$("fbMsg"); m.value="\n\n"+tx.slice(0,1500); m.placeholder=t("auAsk");
      setTimeout(()=>{ try{ m.focus({preventScroll:true}); m.setSelectionRange(0,0); m.scrollTop=0; }catch(e){} },60); }); } }
{ const o=renderSettings; renderSettings=function(){ const r=o.apply(this,arguments); try{ const D=$("auDiag"); if(D && D.open) auDiagRender(); else if(D) D.querySelector("summary").textContent=t("auDiagH"); }catch(e){} return r; }; }
/* ==== fin Audio parfait ==== */
