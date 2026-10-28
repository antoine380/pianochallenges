// fragment de l'IIFE principale — ordre 810, voir src/app/README.md
/* ==== Mode PIANO (chantier piano) ==== */
// 5e mode du menu (#modeNav [data-mode=piano], couleur --m-piano) → page "piano" (#pianoPanel) : instruments PN_INS (synthèse Web Audio
// maison, aucun échantillon), effets sonores (salle = réverbération à réponse impulsionnelle générée, écho, chorus, volume), sustain
// (bouton #pnSus ou pédale MIDI CC64), « Son de l'app » #pnSnd (coupe le son des notes MIDI seulement, pour un clavier qui a ses
// haut-parleurs), ambiances visuelles PN_VIZ dessinées sur le canvas #pnViz (#pnScene, dans #stage juste au-dessus du clavier),
// couleurs des notes --note-0…11, version calme si prefers-reduced-motion. Le son part avant tout dessin (pnOn → voix, puis pnSpawn qui
// ne fait qu'empiler des particules lues par requestAnimationFrame). Réglages : S.settings.piano = {ins, viz:{<instrument>:<ambiance>},
// rev, dly, cho, vol, snd} (pnCfg() complète un état ancien ; les réglages de l'appareil gagnent dans mergeState). La pastille
// « Piano libre » de PLAY mène ici. Test : tools/audit/r48_piano.mjs.
const PN_INS=[{id:"grand",col:"#3d3bb8",viz:"cascade"},{id:"epiano",col:"#b02a5c",viz:"ripples"},{id:"organ",col:"#8a4b08",viz:"aurora"},
  {id:"pad",col:"#0f6b65",viz:"aurora"},{id:"lead",col:"#6a2fd0",viz:"fireworks"},{id:"mallet",col:"#b03a12",viz:"ripples"},{id:"musicbox",col:"#1f5bc7",viz:"bubbles"}];
const PN_VIZ=["none","bubbles","fireworks","ripples","cascade","aurora"];
const PN_DEF={ins:"grand",rev:.3,dly:0,cho:.15,vol:.8,snd:true};
const PN_IC={
  grand:'<path d="M3.5 17v-7a6 6 0 0 1 6-6H12a4 4 0 0 1 4 4c0 1.6 1.2 2.4 2.6 3.1a3.5 3.5 0 0 1 1.9 3.1V17z"/><path d="M3.5 17h17M6 17v3.5M18 17v3.5M7.5 13.5h8"/>',
  epiano:'<rect x="2.5" y="6.5" width="19" height="6.5" rx="1.5"/><path d="M6.5 6.5V10M10 6.5V10M14 6.5V10M17.5 6.5V10M7 13l-2 7.5M17 13l2 7.5M8.5 17.5h7"/>',
  organ:'<rect x="2" y="11" width="3" height="9" rx="1"/><rect x="6.25" y="7" width="3" height="13" rx="1"/><rect x="10.5" y="4" width="3" height="16" rx="1"/><rect x="14.75" y="7" width="3" height="13" rx="1"/><rect x="19" y="11" width="3" height="9" rx="1"/>',
  pad:'<path d="M2.5 12c2.4-4.5 4.8-4.5 7.2 0s4.8 4.5 7.2 0 3.6-3 4.6-1.5"/><path d="M2.5 17.5c2.4-3 4.8-3 7.2 0s4.8 3 7.2 0 3.6-2 4.6-1M2.5 6.5c2.4-3 4.8-3 7.2 0s4.8 3 7.2 0 3.6-2 4.6-1" opacity=".55"/>',
  lead:'<path d="M2.5 16.5 8 7.5v9l5.5-9v9l5.5-9v9"/>',
  mallet:'<path d="M3.5 5.5v13M7.5 7v10M11.5 8.5v7"/><path d="M14 20 19.2 9"/><circle cx="19.9" cy="7.2" r="2.1"/>',
  musicbox:'<rect x="3" y="10" width="15" height="9.5" rx="1.5"/><path d="M3 10l2.5-4.5h10L18 10M18 14.5h3V12M7 14.5h7"/>',
  none:'<circle cx="12" cy="12" r="8"/><path d="M6.5 17.5l11-11"/>',
  bubbles:'<circle cx="9" cy="14" r="4.5"/><circle cx="16.5" cy="7.5" r="2.8"/><circle cx="17.5" cy="16.5" r="1.6"/>',
  fireworks:'<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
  ripples:'<circle cx="12" cy="12" r="2"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="9" opacity=".55"/>',
  cascade:'<path d="M5 21v-8M9.5 21V5M14 21v-6M18.5 21V9"/>',
  aurora:'<path d="M2.5 14.5c3-6 6.5-8 9.5-4s6 4 9.5-3"/><path d="M2.5 19.5c3-4 6.5-5 9.5-2s6 3 9.5-1.5" opacity=".6"/>',
  fx:'<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  sus:'<path d="M6 20.5h12M9 20.5l1.6-12a1.4 1.4 0 0 1 2.8 0l1.6 12"/><path d="M12 6.5V3"/>',
  snd:'<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  mute:'<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>'};
const pnSvg = k => '<svg viewBox="0 0 24 24" aria-hidden="true">'+PN_IC[k]+'</svg>';
Object.assign(TXT.fr,{modePianoSub:"Instruments et effets", pnSub:"Choisis un son et une ambiance, puis joue ce que tu veux : chaque note s'allume dans sa couleur.",
  pnIns:{grand:"Piano à queue",epiano:"Piano électrique",organ:"Orgue",pad:"Synthé doux",lead:"Synthé lead",mallet:"Marimba",musicbox:"Boîte à musique"},
  pnViz:{none:"Aucune",bubbles:"Bulles",fireworks:"Feux d'artifice",ripples:"Ondes",cascade:"Cascade de lumière",aurora:"Aurore"},
  pnVizS:{none:"Aucune",bubbles:"Bulles",fireworks:"Feux",ripples:"Ondes",cascade:"Cascade",aurora:"Aurore"},
  pnInsL:"Instruments", pnAmb:"Ambiance", pnFx:"Effets", pnRev:"Salle", pnDly:"Écho", pnCho:"Chorus", pnVol:"Volume", pnSus:"Sustain", pnSusTip:"Pédale de sustain : les notes continuent après la touche (la pédale de ton clavier marche aussi)",
  pnSnd:"Son de l'app", pnSndTip:"Coupe-le si ton clavier MIDI a déjà ses haut-parleurs (les touches de l'écran sonnent toujours)", pnHint:"Joue : chaque note s'allume dans sa couleur", pnTitle:"Piano"});
Object.assign(TXT.en,{modePianoSub:"Instruments & effects", pnSub:"Pick a sound and a mood, then play anything: every note lights up in its colour.",
  pnIns:{grand:"Grand piano",epiano:"Electric piano",organ:"Organ",pad:"Soft pad",lead:"Synth lead",mallet:"Marimba",musicbox:"Music box"},
  pnViz:{none:"None",bubbles:"Bubbles",fireworks:"Fireworks",ripples:"Ripples",cascade:"Light trails",aurora:"Aurora"},
  pnVizS:{none:"None",bubbles:"Bubbles",fireworks:"Fireworks",ripples:"Ripples",cascade:"Trails",aurora:"Aurora"},
  pnInsL:"Instruments", pnAmb:"Mood", pnFx:"Effects", pnRev:"Room", pnDly:"Echo", pnCho:"Chorus", pnVol:"Volume", pnSus:"Sustain", pnSusTip:"Sustain pedal: notes keep ringing after the key (your keyboard's pedal works too)",
  pnSnd:"App sound", pnSndTip:"Turn it off if your MIDI keyboard has its own speakers (the on-screen keys always sound)", pnHint:"Play: every note lights up in its colour", pnTitle:"Piano"});
TXT.fr.tourT.piano=["PIANO",["Un instrument pour jouer librement","7 sons, des effets et des ambiances lumineuses"]];
TXT.en.tourT.piano=["PIANO",["An instrument to play freely","7 sounds, effects and light shows"]];
{ const o=tourSteps; tourSteps=function(){ const s=o.apply(this,arguments), i=s.findIndex(x=>x[1]==="quiz"); s.splice(i+1,0,["#modeNav [data-mode=piano]","piano"]); return s; }; }

// ---- réglages ----
function pnCfg(){ const st=S.settings; let c=st.piano; if(!c || typeof c!=="object" || Array.isArray(c)) c=st.piano={};
  if(!PN_INS.some(i=>i.id===c.ins)) c.ins=PN_DEF.ins;
  ["rev","dly","cho","vol"].forEach(k=>{ const v=+c[k]; c[k]=Number.isFinite(v)?Math.max(0,Math.min(1,v)):PN_DEF[k]; });
  if(typeof c.snd!=="boolean") c.snd=true;
  if(!c.viz || typeof c.viz!=="object" || Array.isArray(c.viz)) c.viz={};
  Object.keys(c.viz).forEach(k=>{ if(!PN_INS.some(i=>i.id===k) || !PN_VIZ.includes(c.viz[k])) delete c.viz[k]; });
  return c; }
const pnInsDef = id => PN_INS.find(i=>i.id===id)||PN_INS[0];
const pnVizNow = () => { const c=pnCfg(); return c.viz[c.ins] || pnInsDef(c.ins).viz; };

// ---- son ----
const PN={on:new Map(), all:[], held:new Set(), sus:false, ped:false, A:null, wave:{}, ptr:new Map(), noise:null, n:0};
function pnImpulse(c,sec){ const n=Math.floor(c.sampleRate*sec), b=c.createBuffer(2,n,c.sampleRate), a=Math.floor(c.sampleRate*.008);
  for(let ch=0;ch<2;ch++){ const d=b.getChannelData(ch); for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/n,3.4)*(i<a?i/a:1)*.6; } return b; }
function pnAudio(){ const c=audio(); if(!c) return null; if(PN.A && PN.A.c===c) return PN.A;
  const out=c.createGain(), comp=c.createDynamicsCompressor(); comp.threshold.value=-16; comp.knee.value=14; comp.ratio.value=5; comp.attack.value=.003; comp.release.value=.25;
  out.connect(comp); comp.connect(c.destination);
  const bus=c.createGain(); bus.connect(out);
  const conv=c.createConvolver(); conv.buffer=pnImpulse(c,2.6); const rv=c.createGain(); bus.connect(rv); rv.connect(conv); conv.connect(out);
  const dl=c.createDelay(1.5); dl.delayTime.value=.34; const fb=c.createGain(); fb.gain.value=.36; const dlf=c.createBiquadFilter(); dlf.type="lowpass"; dlf.frequency.value=2400; const ds=c.createGain();
  bus.connect(ds); ds.connect(dl); dl.connect(dlf); dlf.connect(fb); fb.connect(dl); dlf.connect(out);
  const ch=c.createDelay(.06); ch.delayTime.value=.016; const lfo=c.createOscillator(); lfo.frequency.value=.8; const lg=c.createGain(); lg.gain.value=.004; lfo.connect(lg); lg.connect(ch.delayTime); lfo.start();
  const cs=c.createGain(); bus.connect(ch); ch.connect(cs); cs.connect(out);
  const nb=c.createBuffer(1,Math.floor(c.sampleRate*.06),c.sampleRate), nd=nb.getChannelData(0); for(let i=0;i<nd.length;i++) nd[i]=Math.random()*2-1; PN.noise=nb;
  PN.A={c,out,bus,rv,ds,cs}; PN.wave={}; pnFx(true); return PN.A; }
function pnFx(now){ const A=PN.A; if(!A) return; const k=pnCfg(), t=A.c.currentTime, set=(p,v)=>{ if(now) p.value=v; else p.setTargetAtTime(v,t,.03); };
  set(A.out.gain,1.1*k.vol*k.vol); set(A.rv.gain,k.rev*1.2); set(A.ds.gain,k.dly*.6); set(A.cs.gain,k.cho*.95); }
function pnWave(c,key,amps){ if(PN.wave[key]) return PN.wave[key]; const re=new Float32Array(amps.length+1), im=new Float32Array(amps.length+1); amps.forEach((a,i)=>{ im[i+1]=a; }); return PN.wave[key]=c.createPeriodicWave(re,im); }
function pnOsc(c,type,f,t){ const o=c.createOscillator(); if(typeof type==="string") o.type=type; else o.setPeriodicWave(type); o.frequency.value=f; o.start(t); return o; }
function pnNoise(c,t,dst,f,g0,tau){ const s=c.createBufferSource(); s.buffer=PN.noise; const bp=c.createBiquadFilter(); bp.type="bandpass"; bp.frequency.value=Math.min(9000,f); bp.Q.value=1.2;
  const g=c.createGain(); g.gain.setValueAtTime(g0,t); g.gain.setTargetAtTime(0,t+.002,tau); s.connect(bp); bp.connect(g); g.connect(dst); s.start(t); s.stop(t+.06); return s; }
// a partial that decays on its own: sine (or wave) → its gain → dst
function pnPart(c,t,dst,type,f,a,tau){ const o=pnOsc(c,type,f,t), g=c.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(a,t+.003); g.gain.setTargetAtTime(0,t+.003,tau); o.connect(g); g.connect(dst); return o; }
// each instrument: (c, t, m, f, v, out) → {src:[…], hold (sustains while held), rel (s), life (s, natural end; 0 = until released)}
const PN_SYN={
  grand(c,t,m,f,v,out){ const hi=Math.max(0,Math.min(1,(m-36)/60)), lp=c.createBiquadFilter(); lp.type="lowpass"; lp.Q.value=.4;
    lp.frequency.setValueAtTime(Math.min(15000,f*(3+v*13)),t); lp.frequency.setTargetAtTime(Math.max(380,f*1.8),t+.01,.35+.5*(1-hi)); lp.connect(out);
    const a=.36*v+.04, dec=.6+2.6*(1-hi), w=pnWave(c,"pf",[1,.6,.36,.24,.16,.11,.07,.05,.03,.02,.015]);
    const g=c.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(a,t+.004); g.gain.setTargetAtTime(a*.42,t+.005,.08); g.gain.setTargetAtTime(0,t+.12,dec); g.connect(lp);
    const o1=pnOsc(c,w,f,t), o2=pnOsc(c,"sine",f*1.0011,t), g2=c.createGain(); g2.gain.value=.35; o1.connect(g); o2.connect(g2); g2.connect(g);
    const n=pnNoise(c,t,out,f*4,.05*v,.012); return {src:[o1,o2,n], hold:true, rel:.16, life:dec*5+.3}; },
  epiano(c,t,m,f,v,out){ const hi=Math.max(0,Math.min(1,(m-36)/60)), a=.34*v+.05, dec=.5+1.6*(1-hi);
    const car=pnOsc(c,"sine",f,t), mod=pnOsc(c,"sine",f,t), mg=c.createGain(); mg.gain.setValueAtTime(f*(.6+2.4*v),t); mg.gain.setTargetAtTime(f*.18,t+.005,.3); mod.connect(mg); mg.connect(car.frequency);
    const car2=pnOsc(c,"sine",f*2,t), mod2=pnOsc(c,"sine",f*14,t), m2=c.createGain(); m2.gain.setValueAtTime(f*2*v,t); m2.gain.setTargetAtTime(0,t+.002,.03); mod2.connect(m2); m2.connect(car2.frequency);
    const g=c.createGain(), g2=c.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(a,t+.003); g.gain.setTargetAtTime(a*.5,t+.004,.15); g.gain.setTargetAtTime(0,t+.2,dec);
    g2.gain.setValueAtTime(a*.35*v,t); g2.gain.setTargetAtTime(0,t+.003,.12); car.connect(g); car2.connect(g2); g.connect(out); g2.connect(out);
    return {src:[car,mod,car2,mod2], hold:true, rel:.22, life:dec*5+.4}; },
  organ(c,t,m,f,v,out){ const a=.15+.05*v, w=pnWave(c,"org",[1,.85,.55,.7,0,.42,0,.3]);
    const g=c.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(a,t+.012); g.connect(out);
    const o1=pnOsc(c,w,f,t), o2=pnOsc(c,"sine",f/2,t), g2=c.createGain(); g2.gain.value=.45; o1.connect(g); o2.connect(g2); g2.connect(g);
    const n=pnNoise(c,t,out,f*6,.025,.004); return {src:[o1,o2,n], hold:true, rel:.08, life:0}; },
  pad(c,t,m,f,v,out){ const a=.1+.08*v, lp=c.createBiquadFilter(); lp.type="lowpass"; lp.Q.value=.8;
    lp.frequency.setValueAtTime(380+v*500,t); lp.frequency.setTargetAtTime(Math.min(6000,900+v*2400+f*.8),t,.6); lp.connect(out);
    const g=c.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(a,t+.45); g.connect(lp);
    const o1=pnOsc(c,"sawtooth",f*.9960,t), o2=pnOsc(c,"sawtooth",f*1.0040,t), o3=pnOsc(c,"sine",f/2,t), g3=c.createGain(); g3.gain.value=.9; o1.connect(g); o2.connect(g); o3.connect(g3); g3.connect(g);
    return {src:[o1,o2,o3], hold:true, rel:1.3, life:0}; },
  lead(c,t,m,f,v,out){ const a=.085+.07*v, lp=c.createBiquadFilter(); lp.type="lowpass"; lp.Q.value=6;
    lp.frequency.setValueAtTime(f*1.5,t); lp.frequency.linearRampToValueAtTime(Math.min(14000,f*(5+6*v)),t+.03); lp.frequency.setTargetAtTime(Math.min(9000,f*3.5),t+.03,.25); lp.connect(out);
    const g=c.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(a,t+.006); g.gain.setTargetAtTime(a*.78,t+.05,.2); g.connect(lp);
    const o1=pnOsc(c,"sawtooth",f,t), o2=pnOsc(c,"square",f*1.004,t), g2=c.createGain(); g2.gain.value=.45; o1.connect(g); o2.connect(g2); g2.connect(g);
    const lfo=pnOsc(c,"sine",5.5,t), lg=c.createGain(); lg.gain.setValueAtTime(0,t); lg.gain.linearRampToValueAtTime(f*.006,t+.5); lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency);
    return {src:[o1,o2,lfo], hold:true, rel:.18, life:0}; },
  mallet(c,t,m,f,v,out){ const lo=Math.max(0,(76-m)/40), a=.4*v+.06, tau=.14+.42*lo;
    const o1=pnPart(c,t,out,"sine",f,a,tau), o2=pnPart(c,t,out,"sine",f*3.93,a*.3,.045+.03*lo), o3=pnPart(c,t,out,"sine",f*9.2,a*.08,.012), n=pnNoise(c,t,out,f*2.5,.04*v,.006);
    return {src:[o1,o2,o3,n], hold:false, rel:.3, life:tau*6+.1}; },
  musicbox(c,t,m,f,v,out){ const F=f*2, a=.22*v+.05, tau=Math.max(.35,1.3-(m-48)*.02);
    const o1=pnPart(c,t,out,"sine",F,a,tau), o2=pnPart(c,t,out,"sine",F*3.01,a*.18,tau*.22), o3=pnPart(c,t,out,"sine",F*5.42,a*.09,.07), n=pnNoise(c,t,out,F*3,.03*v,.004);
    return {src:[o1,o2,o3,n], hold:false, rel:.6, life:tau*6+.1}; }};
function pnStop(vc,t){ vc.src.forEach(s=>{ try{ s.stop(t); }catch(e){} }); setTimeout(()=>{ try{ vc.g.disconnect(); }catch(e){} }, Math.max(0,(t-vc.c.currentTime)*1000)+80); }
function pnRel(vc,quick){ if(vc.done) return; vc.done=true; const c=vc.c, t=c.currentTime, r=quick?.03:vc.rel, p=vc.g.gain;
  try{ if(p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(t); else { const x=p.value; p.cancelScheduledValues(t); p.setValueAtTime(x,t); } }catch(e){}
  p.setTargetAtTime(0,t,r/4); pnStop(vc,t+r*1.6+.05); }
function pnVoice(m,v){ const A=pnAudio(); if(!A) return null; const c=A.c, t=c.currentTime, ins=pnCfg().ins;
  (PN.on.get(m)||[]).forEach(x=>pnRel(x,true)); PN.on.delete(m);
  const now=c.currentTime; PN.all=PN.all.filter(x=>!x.done && (!x.end || x.end>now));
  while(PN.all.length>=28){ pnRel(PN.all.shift(),true); }
  const g=c.createGain(); g.connect(A.bus); let r;
  try{ r=(PN_SYN[ins]||PN_SYN.grand)(c,t,m,440*Math.pow(2,(m-69)/12),v,g); }catch(e){ try{ g.disconnect(); }catch(e2){} return null; }
  const vc={c,g,src:r.src,hold:r.hold,rel:r.rel,end:r.life?t+r.life:0,m};
  if(r.life) pnStop(vc,t+r.life);
  PN.all.push(vc); PN.on.set(m,[vc]); PN.n++; micMuteUntil=Math.max(micMuteUntil, performance.now()+800); return vc; }
// a note starts: the sound first, then the key and the light
function pnOn(m,v,src){ const k=pnCfg(); if(src!=="mic" && (src!=="midi" || k.snd!==false)) pnVoice(m,v);
  PN.held.add(m); keyDown(m,true); pressKey(m); pnSpawn(m,v); }
function pnOff(m){ PN.held.delete(m); keyDown(m,false); vzOff(m); const l=PN.on.get(m); if(!l) return;
  if(PN.sus||PN.ped){ l.forEach(x=>{ x.sus=1; }); return; }
  l.forEach(x=>{ if(x.hold) pnRel(x); }); PN.on.delete(m); }
function pnSusSet(on,ped){ if(ped) PN.ped=on; else PN.sus=on; const b=$("pnSus"); if(b) b.setAttribute("aria-pressed",String(PN.sus||PN.ped));
  if(PN.sus||PN.ped) return; [...PN.on.entries()].forEach(([m,l])=>{ if(PN.held.has(m)) return; l.forEach(x=>{ if(x.hold) pnRel(x); }); PN.on.delete(m); }); }
function pnAllOff(){ PN.all.forEach(x=>pnRel(x,true)); PN.all=[]; PN.on.clear(); PN.held.forEach(m=>keyDown(m,false)); PN.held.clear(); PN.ptr.clear(); PN.sus=false; PN.ped=false; }
// MIDI (called from the onmidimessage of enableMidi while page==="piano")
function pnMidi(st,note,vel){ const ty=st&0xf0;
  if(ty===0x90 && vel>0){ followMidi(note); pnOn(note,Math.pow(vel/127,.8),"midi"); return; } // MIDI 3 : l'écran suit d'abord, la touche allumée est la bonne
  if(ty===0x80 || ty===0x90){ pnOff(note); return; }
  if(ty===0xB0 && note===64) pnSusSet(vel>=64,true);
  if(ty===0xB0 && (note===120||note===123)) pnAllOff(); }
// the screen keys (capture: the exercise handler does not run here) and the computer keyboard
kbd.addEventListener("pointerdown",e=>{ if(page!=="piano") return; const el=e.target.closest("[data-m]"); if(!el) return;
  e.preventDefault(); e.stopImmediatePropagation(); if(!md4Screen()) return; const m=+el.dataset.m; PN.ptr.set(e.pointerId,m); pnOn(m,.72,"screen"); },true);
["pointerup","pointercancel","pointerleave"].forEach(ty=>kbd.addEventListener(ty,e=>{ const m=PN.ptr.get(e.pointerId); if(m==null) return; PN.ptr.delete(e.pointerId); pnOff(m); }));
function pnKey(e){ const m=CODE_MAP[e.code]; if(m==null||e.repeat||e.metaKey||e.ctrlKey||e.altKey||!md4Screen()) return; pnOn(fold(m),.72,"key"); }
document.addEventListener("keyup",e=>{ if(page!=="piano") return; const m=CODE_MAP[e.code]; if(m!=null) pnOff(fold(m)); });
// the mic (an acoustic piano): light only, no app sound
{ const o=noteIn; noteIn=function(m){ if(page==="piano"){ if(LV.on||FN.on) return o.apply(this,arguments); pnOn(m,.7,"mic"); setTimeout(()=>{ if(page==="piano") pnOff(m); },350); return; } return o.apply(this,arguments); }; }

// ---- lumière (canvas au-dessus du clavier) ----
const VZ={cv:null, x:null, w:0, h:0, dpr:1, P:[], cols:[], raf:0, last:0, en:0, au:[], drawn:0, ro:null, capT:0};
const pnCalm = () => { try{ return matchMedia("(prefers-reduced-motion: reduce)").matches; }catch(e){ return false; } };
function vzCols(){ const cs=getComputedStyle(document.documentElement); VZ.cols=[...Array(12)].map((_,i)=>cs.getPropertyValue("--note-"+i).trim()||"#8b7bff"); }
function vzSize(){ const cv=VZ.cv; if(!cv) return; const r=cv.getBoundingClientRect(); if(!r.width||!r.height) return;
  const dpr=Math.min(window.devicePixelRatio||1, 2, Math.sqrt(1.8e6/(r.width*r.height))); VZ.w=r.width; VZ.h=r.height; VZ.dpr=dpr;
  cv.width=Math.round(r.width*dpr); cv.height=Math.round(r.height*dpr); VZ.x=cv.getContext("2d"); VZ.x.setTransform(dpr,0,0,dpr,0,0); }
function vzKey(m){ const el=keyEls[fold(m)], cv=VZ.cv; if(!el||!cv) return {x:VZ.w/2, w:30}; let r=el.getBoundingClientRect(); const c=cv.getBoundingClientRect();
  if(r.right<c.left || r.left>c.right){ scrollKbdTo(m); r=el.getBoundingClientRect(); } // a wide keyboard on a phone scrolls: show the key that was played
  return {x:Math.max(6,Math.min(VZ.w-6,r.left+r.width/2-c.left)), w:r.width}; }
const R=(a,b)=>a+Math.random()*(b-a);
function pnSpawn(m,v){ if(page!=="piano" || !VZ.cv) return; const viz=pnVizNow(); pnCapHide(); if(viz==="none") return;
  if(!VZ.w) vzSize(); if(!VZ.cols.length) vzCols();
  const P=VZ.P, k=vzKey(m), c=VZ.cols[((m%12)+12)%12], H=VZ.h, W=VZ.w, pp=Math.max(0,Math.min(1,(m-36)/60));
  P.push({k:"flare",x:k.x,w:k.w,c,t:0,life:.5,a:.6+.4*v});
  if(pnCalm()){ P.push({k:"glow",x:k.x,y:H*(.78-.5*pp),r:40+70*v,c,t:0,life:1.1}); }
  else if(viz==="bubbles"){ const n=3+Math.round(v*4); for(let i=0;i<n;i++){ const r=R(4,9)+v*R(4,12); P.push({k:"bub",x:k.x+R(-k.w*.4,k.w*.4),y:H+r-R(0,12),vx:R(-12,12),vy:-R(50,110)-v*70,r,c,t:i*.06,ph:R(0,6.3),life:6}); } }
  else if(viz==="fireworks"){ P.push({k:"rk",x:k.x,y:H,ty:H*(.62-.45*pp)+R(-H*.06,H*.06),c,t:0,life:.22,v}); }
  else if(viz==="ripples"){ const y=H*(.7-.42*pp); for(let i=0;i<3;i++) P.push({k:"ring",x:k.x,y,R:(60+180*v)*(1-i*.18),c,t:-i*.13,life:1.5}); P.push({k:"glow",x:k.x,y,r:30+40*v,c,t:0,life:.7}); }
  else if(viz==="cascade"){ P.push({k:"bar",m,x:k.x,w:Math.max(6,k.w*.62),y0:H,y1:H,held:true,c,t:0,a:.55+.45*v,life:30}); }
  else if(viz==="aurora"){ VZ.en=Math.min(1.5,VZ.en+.3+.35*v); VZ.au.unshift({c,w:1}); if(VZ.au.length>4) VZ.au.length=4;
    for(let i=0;i<4;i++) P.push({k:"spk",x:k.x+R(-k.w,k.w),y:H-R(0,20),vx:R(-8,8),vy:-R(20,60),r:R(1,2.4),c,t:0,life:R(1.4,2.4)}); }
  if(P.length>700) P.splice(0,P.length-700);
  if(!VZ.raf) VZ.raf=requestAnimationFrame(vzLoop); }
function vzOff(m){ VZ.P.forEach(p=>{ if(p.k==="bar" && p.m===m && p.held){ p.held=false; p.t=0; } }); }
function vzBurst(p){ const n=Math.round(24+p.v*34), sp=110+p.v*130, P=VZ.P;
  for(let i=0;i<n;i++){ const a=i/n*6.283+R(-.1,.1), s=sp*R(.45,1); P.push({k:"spark",x:p.x,y:p.ty,vx:Math.cos(a)*s,vy:Math.sin(a)*s,c:Math.random()<.22?"#ffffff":p.c,t:0,life:R(.9,1.5),r:R(1.3,2.6)}); }
  P.push({k:"glow",x:p.x,y:p.ty,r:30+40*p.v,c:p.c,t:0,life:.4}); }
function vzLoop(ts){ VZ.raf=0; const x=VZ.x; if(!x) return;
  if(page!=="piano" || document.hidden){ VZ.P.length=0; VZ.en=0; x.clearRect(0,0,VZ.w,VZ.h); VZ.last=0; return; }
  const dt=VZ.last?Math.min(.05,(ts-VZ.last)/1000):.016; VZ.last=ts; const W=VZ.w, H=VZ.h, viz=pnVizNow(), calm=pnCalm();
  const trails=!calm && (viz==="fireworks"||viz==="cascade");
  if(trails){ x.globalCompositeOperation="destination-out"; x.globalAlpha=1; x.fillStyle="rgba(0,0,0,"+(1-Math.exp(-dt*9)).toFixed(3)+")"; x.fillRect(0,0,W,H); }
  else x.clearRect(0,0,W,H);
  x.globalCompositeOperation="lighter";
  if(VZ.en>.005 && viz==="aurora"){ vzAurora(x,W,H,ts/1000,calm); VZ.en*=Math.exp(-dt*(calm?.9:.45)); } else if(viz!=="aurora") VZ.en=0;
  const P=VZ.P, keep=[];
  for(const p of P){ p.t+=dt; if(p.t<0){ keep.push(p); continue; } const f=p.t/p.life; if(f>=1 && p.k!=="bar") continue; VZ.drawn++;
    if(p.k==="flare"){ const r=p.w*1.3, g=x.createRadialGradient(0,0,0,0,0,r); g.addColorStop(0,p.c); g.addColorStop(1,"rgba(0,0,0,0)"); x.save(); x.translate(p.x,H); x.scale(1,2.4); x.globalAlpha=p.a*(1-f)*.75; x.fillStyle=g; x.beginPath(); x.arc(0,0,r,3.1416,6.2832); x.fill(); x.restore(); }
    else if(p.k==="glow"){ const a=f<.15?f/.15:1-(f-.15)/.85, g=x.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r); g.addColorStop(0,p.c); g.addColorStop(1,"rgba(0,0,0,0)"); x.globalAlpha=a*.7; x.fillStyle=g; x.beginPath(); x.arc(p.x,p.y,p.r,0,6.283); x.fill(); }
    else if(p.k==="bub"){ p.x+=(p.vx+Math.sin(p.t*2.6+p.ph)*22)*dt; p.y+=p.vy*dt; if(p.y<-p.r*2){ continue; } const a=Math.min(1,p.t*5)*(p.y<H*.2?Math.max(0,p.y/(H*.2)):1);
      x.globalAlpha=a*.28; x.fillStyle=p.c; x.beginPath(); x.arc(p.x,p.y,p.r,0,6.283); x.fill(); x.globalAlpha=a*.9; x.lineWidth=1.6; x.strokeStyle=p.c; x.stroke();
      x.globalAlpha=a*.75; x.fillStyle="#fff"; x.beginPath(); x.arc(p.x-p.r*.35,p.y-p.r*.38,Math.max(1,p.r*.18),0,6.283); x.fill(); }
    else if(p.k==="rk"){ const y=p.y+(p.ty-p.y)*Math.min(1,f*1.05); x.globalAlpha=.9; x.fillStyle=p.c; x.beginPath(); x.arc(p.x,y,2.4,0,6.283); x.fill(); x.globalAlpha=.35; x.fillRect(p.x-1,y,2,Math.min(40,H-y)); if(f>=.98||p.t+dt>=p.life){ vzBurst(p); continue; } }
    else if(p.k==="spark"){ p.vx*=Math.pow(.25,dt); p.vy=p.vy*Math.pow(.25,dt)+70*dt; p.x+=p.vx*dt; p.y+=p.vy*dt; x.globalAlpha=Math.max(0,1-f)*(f<.1?1:.9); x.fillStyle=p.c; x.beginPath(); x.arc(p.x,p.y,p.r*(1-f*.5),0,6.283); x.fill(); }
    else if(p.k==="ring"){ const e=1-Math.pow(1-f,2.4); x.globalAlpha=(1-f)*.9; x.strokeStyle=p.c; x.lineWidth=Math.max(.6,4*(1-f)); x.beginPath(); x.arc(p.x,p.y,6+p.R*e,0,6.283); x.stroke(); }
    else if(p.k==="spk"){ p.x+=p.vx*dt; p.y+=p.vy*dt; x.globalAlpha=(1-f)*.85; x.fillStyle=p.c; x.beginPath(); x.arc(p.x,p.y,p.r,0,6.283); x.fill(); }
    else if(p.k==="bar"){ const sp=calm?0:170; if(p.held){ p.y1-=sp*dt; if(calm) p.y1=Math.max(H*.25,p.y1-120*dt); } else { p.y0-=sp*dt; p.y1-=sp*dt; if(calm){ p.a-=dt*1.5; } }
      if(p.y0<-4 || p.a<=0){ continue; } const top=Math.max(-10,p.y1), h=Math.max(3,p.y0-top), g=x.createLinearGradient(0,top,0,top+h);
      g.addColorStop(0,"rgba(255,255,255,0)"); g.addColorStop(Math.min(.35,30/h),p.c); g.addColorStop(1,p.c);
      x.globalAlpha=p.a*.18; x.fillStyle=g; vzRound(x,p.x-p.w*.5-6,top,p.w+12,h,(p.w+12)/2); x.fill();
      x.globalCompositeOperation="source-over"; x.globalAlpha=p.a*.92; vzRound(x,p.x-p.w*.5,top,p.w,h,Math.min(p.w/2,8)); x.fill();
      const hl=x.createLinearGradient(p.x-p.w*.5,0,p.x+p.w*.5,0); hl.addColorStop(0,"rgba(255,255,255,0)"); hl.addColorStop(.35,"rgba(255,255,255,.45)"); hl.addColorStop(.6,"rgba(255,255,255,0)"); x.globalAlpha=p.a*.7; x.fillStyle=hl; vzRound(x,p.x-p.w*.5,top,p.w,h,Math.min(p.w/2,8)); x.fill(); x.globalCompositeOperation="lighter";
      if(p.held){ const gg=x.createRadialGradient(p.x,H,0,p.x,H,p.w*1.8); gg.addColorStop(0,"rgba(255,255,255,.9)"); gg.addColorStop(.3,p.c); gg.addColorStop(1,"rgba(0,0,0,0)"); x.globalAlpha=.55; x.fillStyle=gg; x.fillRect(p.x-p.w*1.8,H-p.w*1.8,p.w*3.6,p.w*1.8); } }
    keep.push(p); }
  VZ.P=keep; x.globalAlpha=1; x.globalCompositeOperation="source-over";
  if(keep.length || (VZ.en>.005 && viz==="aurora") || trails && VZ.trail!==0){ if(!keep.length && trails){ VZ.trail=(VZ.trail||30)-1; if(VZ.trail<=0){ VZ.trail=0; x.clearRect(0,0,W,H); VZ.last=0; return; } } else VZ.trail=30; VZ.raf=requestAnimationFrame(vzLoop); }
  else { x.clearRect(0,0,W,H); VZ.last=0; VZ.trail=30; } }
function vzRound(x,X,Y,w,h,r){ r=Math.max(0,Math.min(r,w/2,h/2)); x.beginPath(); x.moveTo(X+r,Y); x.arcTo(X+w,Y,X+w,Y+h,r); x.arcTo(X+w,Y+h,X,Y+h,r); x.arcTo(X,Y+h,X,Y,r); x.arcTo(X,Y,X+w,Y,r); x.closePath(); }
function vzAurora(x,W,H,T,calm){ const cols=VZ.au.length?VZ.au.map(a=>a.c):[VZ.cols[11]||"#b26bff"], e=Math.min(1,VZ.en), yy=[];
  for(let i=0;i<3;i++){ const c1=cols[i%cols.length], c2=cols[(i+1)%cols.length], base=H*(.22+.17*i), amp=H*(.06+.025*i), sp=calm?0:.45+.16*i, ys=[];
    for(let X=0;X<=W+24;X+=24) ys.push(base+Math.sin(X*.0055+T*sp+i*1.7)*amp+Math.sin(X*.016-T*sp*1.3+i)*amp*.35);
    const path=()=>{ x.beginPath(); ys.forEach((y,j)=>j?x.lineTo(j*24,y):x.moveTo(0,y)); };
    const cg=x.createLinearGradient(0,base-amp,0,base+amp+H*.3); cg.addColorStop(0,c1); cg.addColorStop(1,"rgba(0,0,0,0)");
    x.globalAlpha=e*.16; x.fillStyle=cg; path(); for(let j=ys.length-1;j>=0;j--) x.lineTo(j*24,ys[j]+H*.26+Math.sin(j*.9+T*sp)*H*.03); x.closePath(); x.fill();
    const g=x.createLinearGradient(0,0,W,0); g.addColorStop(0,c1); g.addColorStop(.5,c2); g.addColorStop(1,c1); x.strokeStyle=g; x.lineCap="round"; x.lineJoin="round";
    [[26,.1],[11,.22],[2.5,.85]].forEach(([lw,al])=>{ x.globalAlpha=e*al; x.lineWidth=lw; path(); x.stroke(); }); } }

// ---- page ----
function pnCapShow(ms){ const cp=$("pnCap"); if(!cp) return; const k=pnCfg(); cp.querySelector("b").textContent=t("pnIns")[k.ins]; cp.querySelector("small").textContent=ms?t("pnViz")[pnVizNow()]:t("pnHint");
  cp.classList.add("on"); clearTimeout(VZ.capT); if(ms) VZ.capT=setTimeout(pnCapHide,ms); }
function pnCapHide(){ const cp=$("pnCap"); if(cp && cp.classList.contains("on")){ clearTimeout(VZ.capT); cp.classList.remove("on"); } }
function pnRender(){ const P=$("pianoPanel"); if(!P) return; const k=pnCfg(), viz=pnVizNow(), L=S.settings.lang;
  if(P.dataset.lang!==L){ P.dataset.lang=L;
    P.innerHTML='<div class="mode-h pn-h"><h2 class="mode-big" style="--mc:var(--m-piano)"><span class="mb-ic">'+pnSvg("grand")+'</span>PIANO</h2><p>'+esc(t("pnSub"))+'</p></div>'
      +'<div class="pn-ins" id="pnIns" role="radiogroup" aria-label="'+esc(t("pnInsL"))+'">'+PN_INS.map(i=>'<button class="pn-i" type="button" role="radio" data-ins="'+i.id+'" style="--ic:'+i.col+'"><span class="pi">'+pnSvg(i.id)+'</span><span class="pn-n">'+esc(t("pnIns")[i.id])+'</span></button>').join("")+'</div>'
      +'<div class="pn-bar"><div class="pn-vz" id="pnVz" role="radiogroup" aria-label="'+esc(t("pnAmb"))+'"><span class="pn-lbl">'+esc(t("pnAmb"))+'</span>'+PN_VIZ.map(v=>'<button class="pn-v" type="button" role="radio" data-viz="'+v+'" title="'+esc(t("pnViz")[v])+'">'+pnSvg(v)+'<span>'+esc(t("pnVizS")[v])+'</span></button>').join("")+'</div>'
      +'<div class="pn-tools"><div class="pn-dd"><button class="pn-t" type="button" id="pnFxBtn" aria-haspopup="true" aria-expanded="false" aria-controls="pnFx" title="'+esc(t("pnFx"))+'">'+pnSvg("fx")+'<span>'+esc(t("pnFx"))+'</span></button>'
      +'<div class="pn-fx" id="pnFx" hidden>'+[["rev","pnRev"],["dly","pnDly"],["cho","pnCho"],["vol","pnVol"]].map(([id,l])=>'<label class="pn-sl"><span>'+esc(t(l))+'</span><input type="range" min="0" max="100" step="1" data-fx="'+id+'"><b class="mono"></b></label>').join("")+'</div></div>'
      +'<button class="pn-t" type="button" id="pnSus" aria-pressed="false" title="'+esc(t("pnSusTip"))+'">'+pnSvg("sus")+'<span>'+esc(t("pnSus"))+'</span></button>'
      +'<button class="pn-t pn-snd" type="button" id="pnSnd" aria-pressed="true" title="'+esc(t("pnSndTip"))+'"><i class="on">'+pnSvg("snd")+'</i><i class="off">'+pnSvg("mute")+'</i><span>'+esc(t("pnSnd"))+'</span></button></div></div>';
    P.querySelectorAll(".pn-i").forEach(b=>b.onclick=()=>{ const c=pnCfg(); if(c.ins===b.dataset.ins) return; c.ins=b.dataset.ins; save(); pnAllOff(); pnRender(); pnCapShow(1800); pnDemo(); });
    P.querySelectorAll(".pn-v").forEach(b=>b.onclick=()=>{ const c=pnCfg(); c.viz[c.ins]=b.dataset.viz; save(); VZ.P.length=0; VZ.en=0; if(VZ.x) VZ.x.clearRect(0,0,VZ.w,VZ.h); pnRender(); pnCapShow(1400); pnDemo(true); });
    P.querySelectorAll("input[data-fx]").forEach(r=>r.oninput=()=>{ pnCfg()[r.dataset.fx]=r.value/100; pnFx(); r.nextElementSibling.textContent=r.value; clearTimeout(PN.svT); PN.svT=setTimeout(save,300); });
    $("pnFxBtn").onclick=()=>{ const p=$("pnFx"), op=p.hidden; p.hidden=!op; $("pnFxBtn").setAttribute("aria-expanded",String(op)); };
    $("pnSus").onclick=()=>pnSusSet(!PN.sus,false);
    $("pnSnd").onclick=()=>{ const c=pnCfg(); c.snd=!c.snd; save(); pnRender(); }; }
  P.querySelectorAll(".pn-i").forEach(b=>b.setAttribute("aria-checked",String(b.dataset.ins===k.ins)));
  P.querySelectorAll(".pn-v").forEach(b=>b.setAttribute("aria-checked",String(b.dataset.viz===viz)));
  P.querySelectorAll("input[data-fx]").forEach(r=>{ const v=Math.round(k[r.dataset.fx]*100); r.value=v; r.nextElementSibling.textContent=v; r.style.setProperty("--v",v+"%"); });
  $("pnSnd").setAttribute("aria-pressed",String(k.snd!==false)); $("pnSus").setAttribute("aria-pressed",String(PN.sus||PN.ped));
  [[".pn-ins",'.pn-i[aria-checked="true"]'],[".pn-vz",'.pn-v[aria-checked="true"]']].forEach(([sq,oq])=>{ const s=P.querySelector(sq), on=P.querySelector(oq); if(s && on && s.scrollWidth>s.clientWidth+2) s.scrollLeft=Math.max(0,on.offsetLeft-s.offsetLeft-s.clientWidth/2+on.offsetWidth/2); }); }
// a short glimpse of the mood when it changes (visual only, no sound)
function pnDemo(vizOnly){ if(pnCalm()) return; const ms=[60,64,67,72], n0=Math.max(LOW,Math.min(HIGH-12,60)); ms.forEach((m,i)=>setTimeout(()=>{ if(page!=="piano") return; const mm=n0+(m-60); pnSpawn(mm,.55); setTimeout(()=>vzOff(mm),260); },i*90)); }
document.addEventListener("pointerdown",e=>{ const p=$("pnFx"); if(p && !p.hidden && !e.target.closest(".pn-dd")){ p.hidden=true; $("pnFxBtn").setAttribute("aria-expanded","false"); } },true);
document.addEventListener("keydown",e=>{ if(page!=="piano") return; const p=$("pnFx"); if(e.key==="Escape" && p && !p.hidden){ p.hidden=true; $("pnFxBtn").setAttribute("aria-expanded","false"); $("pnFxBtn").focus(); e.stopImmediatePropagation(); } },true);
{ const P=document.createElement("section"); P.className="mode-page pn-page"; P.id="pianoPanel"; P.setAttribute("aria-label","Piano"); const q=$("quizPanel"); q.parentNode.insertBefore(P,q.nextSibling);
  const sc=document.createElement("div"); sc.className="pn-scene"; sc.id="pnScene"; sc.innerHTML='<canvas id="pnViz" aria-hidden="true"></canvas><div class="pn-cap" id="pnCap" aria-hidden="true"><b></b><small></small></div>';
  $("stage").insertBefore(sc,$("kbdWrap")); VZ.cv=$("pnViz");
  try{ VZ.ro=new ResizeObserver(()=>{ if(page==="piano") vzSize(); }); VZ.ro.observe(sc); }catch(e){} }
{ const o=openPage; openPage=function(pg){ const was=page; if(pg==="piano"||pg==="sc1") try{ audio(); }catch(e){} const r=o.apply(this,arguments);
    if(page==="piano"){ if(was!=="piano"){ pnRender(); pnAudio(); vzCols(); requestAnimationFrame(()=>{ vzSize(); if(page==="piano") pnCapShow(); }); } }
    else if(was==="piano" && !INFO_PAGES.includes(page)){ pnAllOff(); VZ.P.length=0; VZ.en=0; if(VZ.x) VZ.x.clearRect(0,0,VZ.w,VZ.h); }
    return r; }; }
{ const o=setNav; setNav=function(){ o.apply(this,arguments); if(page!=="piano") return; $("side").dataset.mode="piano";
    $("modeNav").querySelectorAll("button").forEach(b=>{ if(b.dataset.mode==="piano") b.setAttribute("aria-current","page"); else b.removeAttribute("aria-current"); }); $("mbTitle").textContent=t("pnTitle"); }; }
{ const o=render; render=function(){ const r=o.apply(this,arguments); if(page==="piano"){ const P=$("pianoPanel"); if(P && P.dataset.lang!==S.settings.lang) pnRender(); } return r; }; }
// PLAY › « Piano libre » now opens the PIANO mode
{ const o=pcBar; pcBar=function(){ const r=o.apply(this,arguments); const f=$("pcFree"); if(f){ f.setAttribute("aria-pressed","false"); f.onclick=()=>goMode("piano"); } return r; }; }
// theme switch: the note colours may change
try{ new MutationObserver(()=>{ if(page==="piano") vzCols(); }).observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]}); }catch(e){}
document.addEventListener("visibilitychange",()=>{ if(document.hidden && page==="piano") pnAllOff(); });
/* ==== fin Mode PIANO ==== */
