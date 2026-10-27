// fragment de l'IIFE principale — ordre 420, voir src/app/README.md
// ---------- Microphone pitch detection ----------
let micOn=false, micAsking=false;
$("micBtn").addEventListener("click", async ()=>{
  if(micOn){ micStop(); renderInputUI(); return; } // toggle: a second click stops the microphone
  if(micAsking) return; // the permission prompt is still open: a second tap would open a second stream and a timer nobody stops
  const c=audio(); if(!c) return;
  try{
    micAsking=true; let stream; try{ stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}}); }finally{ micAsking=false; }
    if(micOn){ stream.getTracks().forEach(tr=>tr.stop()); return; } // started meanwhile by another path
    clearInterval(micTimer);
    const src=c.createMediaStreamSource(stream), an=c.createAnalyser(); an.fftSize=1024; src.connect(an); // 1024 samples: enough down to ~100 Hz, autocorrelation 4× cheaper
    const buf=new Float32Array(an.fftSize); let cand=null, count=0, lastEmit=null;
    micStream=stream; micOn=true; $("micBtn").classList.add("on"); $("micBtn").classList.remove("err"); $("micTxt").textContent=t("micOn"); notice("");
    micTimer=setInterval(()=>{
      an.getFloatTimeDomainData(buf); const f=autoCorrelate(buf,c.sampleRate);
      if(f<0){ cand=null; count=0; lastEmit=null; return; }
      if(performance.now()<micMuteUntil) return;
      const m=Math.round(69+12*Math.log2(f/440)-(+S.settings.micCents||0)/100); // micCents: a piano tuned a little low/high (D28)
      if(m===cand) count++; else { cand=m; count=1; }
      if(count===3 && m!==lastEmit){ lastEmit=m; flashKey(m,"k-hit",150); midiIn(m); } // compare the full note: Do4 then Do5 are two notes
    },25);
  }catch(err){ $("micBtn").classList.add("err"); $("micTxt").textContent=t("micBlocked"); notice(t("blocked")); }
  renderInputUI();
});
let micStream=null, micTimer=0;
function micStop(){ clearInterval(micTimer); if(micStream) micStream.getTracks().forEach(tr=>tr.stop()); micStream=null; micOn=false; $("micBtn").classList.remove("on"); $("micTxt").textContent=t("micOff"); }
function autoCorrelate(buf,sr){
  let SIZE=buf.length, rms=0; for(let i=0;i<SIZE;i++) rms+=buf[i]*buf[i]; rms=Math.sqrt(rms/SIZE);
  if(rms<0.012) return -1;
  let r1=0, r2=SIZE-1; const th=0.2;
  for(let i=0;i<SIZE/2;i++) if(Math.abs(buf[i])<th){ r1=i; break; }
  for(let i=1;i<SIZE/2;i++) if(Math.abs(buf[SIZE-i])<th){ r2=SIZE-i; break; }
  const b=buf.slice(r1,r2); SIZE=b.length; if(SIZE<64) return -1;
  const c=new Float32Array(SIZE);
  for(let i=0;i<SIZE;i++){ let s=0; for(let j=0;j<SIZE-i;j++) s+=b[j]*b[j+i]; c[i]=s; }
  let d=0; while(d<SIZE-1 && c[d]>c[d+1]) d++;
  let maxv=-1, maxp=-1; for(let i=d;i<SIZE;i++) if(c[i]>maxv){ maxv=c[i]; maxp=i; }
  if(maxp<1||maxp>=SIZE-1) return -1;
  const x1=c[maxp-1], x2=c[maxp], x3=c[maxp+1], a=(x1+x3-2*x2)/2, bb=(x3-x1)/2;
  const T0=a?maxp-bb/(2*a):maxp, f=sr/T0;
  return (f<55||f>1600)?-1:f;
}

