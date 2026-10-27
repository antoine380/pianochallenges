// fragment de l'IIFE principale — ordre 120, voir src/app/README.md
// ---------- Audio ----------
let ctx=null, master=null, micMuteUntil=0;
function audio(){
  if(!ctx){ const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return null;
    ctx=new AC(); const lp=ctx.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=3200;
    master=ctx.createGain(); master.gain.value=.55; master.connect(lp); lp.connect(ctx.destination); }
  if(ctx.state==="suspended" || ctx.state==="interrupted") try{ ctx.resume(); }catch(e){} // "interrupted": iOS (a call, another app, a Bluetooth route change)
  return ctx;
}
function tone(midi, when=0, dur=.6, vol=.28){
  const c=audio(); if(!c) return;
  const t0=c.currentTime+when, f=440*Math.pow(2,(midi-69)/12);
  [["triangle",1,vol],["sine",2,vol*.25]].forEach(([type,mul,v])=>{
    const o=c.createOscillator(), g=c.createGain(); o.type=type; o.frequency.value=f*mul;
    g.gain.setValueAtTime(0,t0); g.gain.linearRampToValueAtTime(v,t0+.012); g.gain.exponentialRampToValueAtTime(.0008,t0+dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0+dur+.05); });
  micMuteUntil=Math.max(micMuteUntil, performance.now()+(when+dur)*1000+180);
}

