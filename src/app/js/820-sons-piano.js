// fragment de l'IIFE principale — ordre 820, voir src/app/README.md
/* ==== Sons du piano (chantier sons) ==== */
// Piano à queue = vrais échantillons « Salamander Grand Piano » (Alexander Holm, CC BY 3.0, MP3 repris sans modification de
// github.com/Tonejs/audio) : 30 fichiers dans assets/audio/piano/ (La0 → Do8, une note toutes les tierces mineures, ~2 Mo), chargés à la
// demande (pnSmpLoad : à l'ouverture du mode PIANO quand le piano à queue est choisi, ou au choix de l'instrument), décodés une seule fois
// (début silencieux du MP3 retiré, notes coupées à 6 s (grave), 5 s (médium), 4 s (aigu) avec une fin en fondu : ~55 Mo décodés en stéréo) ; tant que ce n'est pas prêt (ou si le chargement
// échoue), la synthèse d'avant joue. Lecture pnGrandSmp : AudioBufferSourceNode de l'échantillon le plus proche (≤ 1,5 demi-ton,
// playbackRate), force → volume et filtre passe-bas, relâche = étouffoir (plus long dans le grave, aucun étouffoir au-dessus de Fa6).
// Synthé doux refait (pad : deux dents de scie désaccordées et écartées en stéréo, filtre qui s'ouvre lentement et ondule, attaque 0,3 s,
// relâche 1,8 s ; plus de sous-octave sinus qui faisait orgue). Anti-claquements : fondu de 5 ms avant la fin naturelle d'une voix,
// arrêt des sources après une relâche complète, note rejouée = relâche courte (80 ms au piano), sortie : compresseur puis écrêtage doux
// (WaveShaper, sans suréchantillonnage = aucune latence). PN.off = contexte hors ligne des tests (r48_piano : rendu, claquements, spectres).
const PN_SMP={st:0, buf:{}, p:null, base:"assets/audio/piano/", list:[]};
["C","Ds","Fs","A"].forEach((n,i)=>{ for(let o=0;o<=8;o++){ const m=12*(o+1)+i*3; if(m>=21 && m<=108) PN_SMP.list.push({n:n+o,m}); } });
PN_SMP.list.sort((a,b)=>a.m-b.m);
const PN_QREL={grand:.08, pad:.12};
function pnSmpDecode(c,ab){ return new Promise((res,rej)=>{ try{ const p=c.decodeAudioData(ab,res,rej); if(p && p.then) p.then(res,rej); }catch(e){ rej(e); } }); }
function pnSmpTrim(c,b,m){ const sr=b.sampleRate, nc=Math.min(2,b.numberOfChannels), L=b.getChannelData(0), R=nc>1?b.getChannelData(1):L, thr=.0015;
  let pk=0; for(let i=0, z=Math.min(L.length,Math.round(sr*.25));i<z;i++) pk=Math.max(pk,Math.abs(L[i]),Math.abs(R[i]));
  const th=Math.max(thr,pk*.04); let s=0; while(s<L.length && Math.abs(L[s])<th && Math.abs(R[s])<th) s++;
  s=Math.max(0,s-Math.round(sr*.0015)); // the MP3 starts with silence and a quiet pre-echo: start 1.5 ms before the hammer (no added latency)
  const cap=m<45?6:m<69?5:4, n=Math.max(1,Math.min(b.length-s, Math.round(cap*sr))), fade=Math.round(Math.min(.8,n/sr*.25)*sr), o=c.createBuffer(nc,n,sr);
  for(let k=0;k<nc;k++){ const d=o.getChannelData(k); d.set(b.getChannelData(k).subarray(s,s+n)); for(let i=0;i<fade;i++) d[n-fade+i]*=.5+.5*Math.cos(Math.PI*i/fade); d[n-1]=0; }
  return o; }
function pnSmpLoad(){ if(PN_SMP.st===1 || PN_SMP.st===2) return PN_SMP.p; const c=audio(); if(!c || !window.fetch) return null;
  PN_SMP.st=1; const order=[...PN_SMP.list].sort((a,b)=>Math.abs(a.m-62)-Math.abs(b.m-62)); let i=0;
  const worker=async()=>{ while(i<order.length){ const s=order[i++]; const r=await fetch(PN_SMP.base+s.n+".mp3"); if(!r.ok) throw new Error("smp "+r.status);
    PN_SMP.buf[s.m]=pnSmpTrim(c, await pnSmpDecode(c, await r.arrayBuffer()), s.m); } };
  PN_SMP.p=Promise.all([worker(),worker(),worker()]).then(()=>{ PN_SMP.st=2; }, ()=>{ PN_SMP.st=3; PN_SMP.p=null; }); // 3 = failed: the synthesis keeps playing, retried next time
  return PN_SMP.p; }
function pnSmpNear(m){ let best=null, d=99; for(const s of PN_SMP.list){ const x=Math.abs(s.m-m); if(x<d && PN_SMP.buf[s.m]){ d=x; best=s.m; } } return d<=6?best:null; }
function pnGrandSmp(c,t,m,f,v,out){ const near=pnSmpNear(m); if(near==null) return null; const b=PN_SMP.buf[near], rate=Math.pow(2,(m-near)/12);
  const s=c.createBufferSource(); s.buffer=b; s.playbackRate.value=rate;
  const lp=c.createBiquadFilter(); lp.type="lowpass"; lp.Q.value=.5; lp.frequency.value=Math.min(20000, 700*Math.pow(2,4.8*v)+f*3);
  const g=c.createGain(), a=(.16+.84*Math.pow(v,1.5))*2.6; g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(a,t+.0015);
  s.connect(lp); lp.connect(g); g.connect(out); s.start(t);
  return {src:[s], hold:true, rel:m>=90?2.4:m<48?.5:m<72?.36:.26, life:b.duration/rate}; }
{ const syn=PN_SYN.grand; PN_SYN.grand=function(c,t,m,f,v,out){ if(PN_SMP.st===2){ const r=pnGrandSmp(c,t,m,f,v,out); if(r) return r; } return syn.apply(this,arguments); }; }
// the electric piano's chords were much louder than the others: −3 dB
{ const o=PN_SYN.epiano; PN_SYN.epiano=function(c,t,m,f,v,out){ const g=c.createGain(); g.gain.value=.7; g.connect(out); return o.call(this,c,t,m,f,v,g); }; }
// soft pad (was too close to the organ): two detuned saws spread left/right + a quiet triangle, a low-pass that opens slowly and breathes
PN_SYN.pad=function(c,t,m,f,v,out){ const a=.26+.18*v, f1=Math.min(6500,f*2.2+600+v*1500);
  const lp=c.createBiquadFilter(); lp.type="lowpass"; lp.Q.value=2.4; lp.frequency.setValueAtTime(Math.max(160,f*.8),t); lp.frequency.setTargetAtTime(f1,t+.04,.75);
  const fl=pnOsc(c,"sine",.17+Math.random()*.08,t), fg=c.createGain(); fg.gain.value=f1*.22; fl.connect(fg); fg.connect(lp.frequency);
  const amp=c.createGain(); amp.gain.setValueAtTime(0,t); amp.gain.linearRampToValueAtTime(a,t+.3); amp.gain.setTargetAtTime(a*.8,t+.35,1.4); lp.connect(amp); amp.connect(out);
  const src=[fl], mk=(type,cents,pan,lvl)=>{ const o=pnOsc(c,type,f,t); o.detune.value=cents; const g=c.createGain(); g.gain.value=lvl; o.connect(g);
    if(c.createStereoPanner){ const p=c.createStereoPanner(); p.pan.value=pan; g.connect(p); p.connect(lp); } else g.connect(lp); src.push(o); return o; };
  const o1=mk("sawtooth",-11,-.65,.5), o2=mk("sawtooth",11,.65,.5); mk("triangle",0,0,.45);
  const dr=pnOsc(c,"sine",.31,t), dg=c.createGain(); dg.gain.value=5; dr.connect(dg); dg.connect(o1.detune); src.push(dr); // slow drift, the pad "moves"
  return {src, hold:true, rel:1.8, life:0}; };
// output: compressor, then a soft clipper (no oversampling: no added latency); PN.off = offline context (tests)
function pnSoftCurve(){ const n=4096, cv=new Float32Array(n); for(let i=0;i<n;i++){ const u=(i/(n-1)*2-1)*2, a=Math.abs(u); cv[i]=Math.sign(u)*(a<.8?a:.8+.2*Math.tanh((a-.8)/.2)); } return cv; }
pnAudio=function(){ const c=PN.off||audio(); if(!c) return null; if(PN.A && PN.A.c===c) return PN.A;
  // no DynamicsCompressor (its 6 ms look-ahead delayed every note): the level follows the number of voices (pnLevel) and a soft clipper catches the rest
  const out=c.createGain(), pre=c.createGain(); pre.gain.value=.5; const ws=c.createWaveShaper(); ws.curve=pnSoftCurve(); ws.oversample="none";
  out.connect(pre); pre.connect(ws); ws.connect(c.destination);
  const bus=c.createGain(); bus.connect(out);
  const conv=c.createConvolver(); conv.buffer=pnImpulse(c,2.6); const rv=c.createGain(); bus.connect(rv); rv.connect(conv); conv.connect(out);
  const dl=c.createDelay(1.5); dl.delayTime.value=.34; const fb=c.createGain(); fb.gain.value=.36; const dlf=c.createBiquadFilter(); dlf.type="lowpass"; dlf.frequency.value=2400; const ds=c.createGain();
  bus.connect(ds); ds.connect(dl); dl.connect(dlf); dlf.connect(fb); fb.connect(dl); dlf.connect(out);
  const ch=c.createDelay(.06); ch.delayTime.value=.016; const lfo=c.createOscillator(); lfo.frequency.value=.8; const lg=c.createGain(); lg.gain.value=.004; lfo.connect(lg); lg.connect(ch.delayTime); lfo.start();
  const cs=c.createGain(); bus.connect(ch); ch.connect(cs); cs.connect(out);
  const nb=c.createBuffer(1,Math.floor(c.sampleRate*.06),c.sampleRate), nd=nb.getChannelData(0); for(let i=0;i<nd.length;i++) nd[i]=Math.random()*2-1; PN.noise=nb;
  PN.A={c,out,bus,rv,ds,cs,ws}; PN.wave={}; pnFx(true); return PN.A; };
// without the compressor's make-up gain the output is ~3 dB quieter: volume curve 1.25·vol² (was 1.1·vol²)
pnFx=function(now){ const A=PN.A; if(!A) return; const k=pnCfg(), t=A.c.currentTime, set=(p,v)=>{ if(now) p.value=v; else p.setTargetAtTime(v,t,.03); };
  set(A.out.gain,1.25*k.vol*k.vol); set(A.rv.gain,k.rev*1.2); set(A.ds.gain,k.dly*.6); set(A.cs.gain,k.cho*.95); };
// many voices at once: the bus goes down smoothly (fast when a chord starts, slow when notes end), like a gentle compressor without delay
function pnLevel(){ const A=PN.A; if(!A) return; const t=A.c.currentTime, n=PN.all.filter(x=>!x.done && (!x.end || x.end>t)).length, g=Math.min(1,1.7/Math.sqrt(Math.max(1,n)));
  const p=A.bus.gain; if(Math.abs((A.lv||1)-g)<.01) return; const up=g>(A.lv||1); A.lv=g; p.cancelScheduledValues(t); p.setTargetAtTime(g,t,up?.25:.012); }
// no clicks: sources stop only once the release is inaudible; the scheduled disconnect never runs on an offline (test) context
// (disconnect on the source's "ended", not on a timer: on iOS the audio clock stops while the context is interrupted, a timer then cut notes)
pnStop=function(vc,t){ vc.src.forEach(s=>{ try{ s.stop(t); }catch(e){} }); const s0=vc.src[0]; if(s0 && !vc.unhook){ vc.unhook=1; s0.onended=()=>{ try{ vc.g.disconnect(); }catch(e){} }; } };
pnRel=function(vc,quick){ if(vc.done) return; vc.done=true; const c=vc.c, t=c.currentTime, r=quick?(vc.qrel||.03):vc.rel, p=vc.g.gain;
  try{ if(p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(t); else { const x=p.value; p.cancelScheduledValues(t); p.setValueAtTime(x,t); } }catch(e){}
  p.setTargetAtTime(0,t,r/4); pnStop(vc,t+r*2.4+.05); if(vc.c===(PN.A&&PN.A.c)) pnLevel(); };
// a voice that ends by itself (struck notes, the end of a sample) fades out over the last few ms instead of being cut
{ const o=pnVoice; pnVoice=function(m,v){ const vc=o.apply(this,arguments); if(!vc) return vc; vc.qrel=PN_QREL[pnCfg().ins]||0;
    if(vc.end){ const p=vc.g.gain, e=vc.end; try{ p.setValueAtTime(1,Math.max(vc.c.currentTime,e-.03)); p.linearRampToValueAtTime(0,e-.004); }catch(x){} } pnLevel(); return vc; }; }
// load the samples when the PIANO page shows the grand piano (page opened, instrument chosen)
{ const o=pnRender; pnRender=function(){ const r=o.apply(this,arguments); if(page==="piano" && pnCfg().ins==="grand") try{ pnSmpLoad(); }catch(e){} return r; }; }
// credits (Settings › App › Credits): the piano sound first
Object.assign(TXT.fr,{snCredH:"Sons", snCredT:"Piano à queue : « Salamander Grand Piano » d'Alexander Holm", snCredS:"Échantillons repris sans modification · Licence CC BY 3.0 · "});
Object.assign(TXT.en,{snCredH:"Sounds", snCredT:"Grand piano: “Salamander Grand Piano” by Alexander Holm", snCredS:"Samples used unchanged · Licence CC BY 3.0 · "});
{ const o=credRender; credRender=function(){ const r=o.apply(this,arguments), list=$("credList"); if(!list) return r;
    const box=document.createElement("div"), h=document.createElement("h3"), it=document.createElement("div"), b=document.createElement("b"), s=document.createElement("small"), a=document.createElement("a");
    box.id="snCred"; h.textContent=t("snCredH"); it.className="cred-item"; b.textContent=t("snCredT"); s.textContent=t("snCredS");
    a.href="https://creativecommons.org/licenses/by/3.0/"; a.target="_blank"; a.rel="noopener"; a.textContent="creativecommons.org/licenses/by/3.0"; s.appendChild(a); it.append(b,s); box.append(h,it);
    list.insertBefore(box,list.firstChild); return r; }; }
/* ==== fin Sons du piano ==== */
