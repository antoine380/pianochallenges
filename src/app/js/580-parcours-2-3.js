// fragment de l'IIFE principale — ordre 580, voir src/app/README.md
/* ==== Parcours 2-3 (Premiers pas, lots 2 et 3) ==== */
// Lessons P04–P14 on the same engine (PP), the first launch D2 (what do you play on) → D3 (play a C) → D4 (level asked after the first note),
// labels that fade (D20, S.lbl), bubbles (D19, S.hints), the Play lesson mode for the melody (D14, iframe play/index.html#song=lune&lesson=1),
// the beat (D15, ppBeat*), guided chords (D16, ppChordIt), the split keyboard (P13), the drawn hand (D13), the review (D18, S.pp.rev),
// stickers (S.stickers), the certificate and what's next (D26, view "cert"). ppAllDone() tells another module the 14 lessons are done.
PP_READY.push("p04","p05","p06","p07","p08","p09","p10","p11","p12","p13","p14");
window.__ppTone=(m,sec)=>{ try{ tone(m,0,sec||.6,.26); }catch(e){} }; // the Play frame plays its sounds here (the host's audio is unlocked by the taps)
const md12 = x => ((x%12)+12)%12;
function ppAllDone(){ const d=((S.pp||{}).done)||{}; return PP_IDS.every(id=>d[id]); }
const ppStarSum = () => PP_IDS.reduce((a,id)=>a+ppStarsOf(id),0);
const PP_SI_ANS=["p04","p05","p06","p08","p11","p12","p13","p14"]; // B is an answer here: a lone B is not « start again » (CA-11)
const ppAnd = a => a.length<2 ? (a[0]||"") : a.slice(0,-1).join(", ")+(S.settings.lang==="fr"?" et ":" and ")+a[a.length-1];
const ppMid = () => ppInp()==="mic";
// ---- note times (chords, rhythm): every note's arrival, every release (MIDI note-off, a screen key let go)
const PPT={on:new Map(), off:new Map(), ptr:new Map()};
const ppT = m => { const t=PPT.on.get(m); return t && performance.now()-t<400 ? t : performance.now(); };
{ const _mi=midiIn; midiIn=function(m){ PPT.on.set(m, performance.now()); if(HB.cur) hintClose(true); return _mi.apply(this,arguments); }; }
{ const _kd=keyDown; keyDown=function(m,on){ if(!on){ PPT.off.set(m,performance.now()); if(page==="pp") ppOff(m); } return _kd.apply(this,arguments); }; }
function ppOff(m){ const B=BT.B; if(B && B.holdM!=null && md12(B.holdM)===md12(m)) ppBeatRelease(performance.now()); }
// ---- small keyboards (MIDI): where the left hand ends, a text for small keyboards
const ppKbN = () => { const lo=+S.settings.kbdLow||36, hi=+S.settings.kbdHigh||96; return S.settings.kbdSize && S.settings.kbdSize!=="auto" ? hi-lo+1 : 0; };
const ppSmall = () => ppInp()==="midi" && ppKbN() && ppKbN()<49;
const ppSplit = () => ppSmall() ? Math.round(((+S.settings.kbdLow)+(+S.settings.kbdHigh))/2) : 60;
// ---- items
// a run of exact notes from a first note (n, n+o1, n+o2…); the mic: the same pitch classes (its octave is not reliable)
function ppSeqIt(first, offs, o){ const it={...o, got:[]};
  it.check=m=>{ const pc=md12(m);
    if(it.got.length){ const exp=it.got[0]+offs[it.got.length-1], okN = ppMid() ? md12(exp)===pc : m===exp;
      if(okN){ it.got.push(ppMid()?exp:m); return it.got.length===offs.length+1?"ok":"step"; } if(it.got.includes(m)) return "skip"; }
    if(first(m)){ it.got=[m]; return offs.length?"step":"ok"; } return "bad"; };
  return it; }
// a chord: MIDI = the notes within 120 ms (CA-08), the mic and the screen = one after the other within 4 s; no extra note; P13: a bass under the split
function ppChordIt(root, o){ const pcs=[0,4,7].map(x=>md12(root+x)), N=ppNames(), it={...o, pcs, chord:true, hits:[], got:[], bassPc:o.bass?root:null};
  it.span = () => ppInp()==="midi" ? 120 : 4000;
  it.needBass = () => it.bassPc!=null && !PP.oneHand;
  it.check=m=>{ const pc=md12(m), tm=ppT(m), sp=it.span(); it.extra=null; it.lhBad=false;
    it.hits=it.hits.filter(h=>tm-h.t<=sp); if(it.bassHit && tm-it.bassHit.t>sp) it.bassHit=null;
    const low = ppMid() ? (it.needBass() && !it.bassHit) : m<ppSplit();
    if(it.needBass() && low){ if(pc===it.bassPc){ it.bassHit={m,t:tm}; } else { it.lhBad=true; return "bad"; } }
    else { if(!pcs.includes(pc)){ it.extra=pc; return "bad"; } const h=it.hits.find(x=>x.pc===pc); if(h){ h.t=tm; h.m=m; } else it.hits.push({pc,m,t:tm}); }
    it.got=it.hits.map(h=>h.m).concat(it.bassHit?[it.bassHit.m]:[]);
    const full=pcs.every(p=>it.hits.some(h=>h.pc===p)) && (!it.needBass() || it.bassHit);
    if(full){ if(PP.oneHand && it.bassPc!=null) tone(48+it.bassPc,0,.9,.22); return "ok"; } return "step"; };
  it.bad=(m,x)=> x.lhBad ? t("pp13LH")(N[it.bassPc]) : x.extra!=null ? t("ppExtra")(N[x.extra]) : null;
  it.zone=()=>{ const r=[], lo=ppMid()?60:Math.max(ppSplit(),ppRange()[0]); for(let k=lo;k<=ppRange()[1]&&r.length<3;k++) if(pcs.includes(md12(k)) && (r.length || md12(k)===pcs[0])) r.push(k); if(it.needBass()) r.push(ppBassKey(root)); return r; };
  it.showM=()=>it.zone();
  it.cells=pcs; return it; }
const ppBassKey = root => { let m=48+md12(root); while(m>=ppSplit()) m-=12; return Math.max(m,ppRange()[0]); };
// ---- labels that fade (D20): a mastery score per pitch class; ≥ 0.6 pale, 1 gone; two mistakes in a row on a gone label: back to pale
function lblS(){ const o=S.lbl&&typeof S.lbl==="object"&&!Array.isArray(S.lbl)?S.lbl:{}; S.lbl=o; if(!Array.isArray(o.m)||o.m.length!==12) o.m=Array(12).fill(0); if(o.fade==null) o.fade=true; if(!o.mode) o.mode=""; if(!o.told||typeof o.told!=="object") o.told={}; return o; }
const lblMode = () => lblS().mode || (S.settings.notation==="fr"?"fr":"en");
const lblFadeOn = () => lblS().fade!==false && (S.onb&&S.onb.level)!=="adv";
const LB={queue:[], tm:0, run:{}};
function lblScore(pc, good, fast){ const L=lblS(); let v=+L.m[pc]||0; const was=v;
  if(good){ LB.run[pc]=0; v=Math.min(1, v+(fast?.25:.1)); }
  else { LB.run[pc]=(LB.run[pc]|0)+1; v = was>=1 ? .7 : (LB.run[pc]>=2 && L.gone && L.gone[pc]) ? .6 : Math.max(0, was-.3); } // a gone label comes back pale, never full
  v=Math.round(v*100)/100; L.m[pc]=v; L.at=Date.now();
  if(v>=1 && was<1){ L.gone={...(L.gone||{}), [pc]:1}; if(!L.told[pc] && lblFadeOn()){ L.told[pc]=Date.now(); LB.queue.push(pc); clearTimeout(LB.tm); LB.tm=setTimeout(lblToast,2000); } }
  save(); }
function lblToast(){ const q=[...new Set(LB.queue)].sort((a,b)=>a-b); LB.queue=[]; if(!q.length) return; toast(t("lblFade")(ppAnd(q.map(pc=>ppNames()[pc])))); PP.lblNew=true; }
function lblLevel(pc){ if(!lblFadeOn()) return 0; if(PP.id==="p05" && PP.pale5 && PP.pale5.has(pc)) return 1; const v=+lblS().m[pc]||0; return v>=1?2:v>=.6?1:0; }
function lblName(pc){ const md=lblMode(); return md==="none" ? "" : md==="both" ? PC_FR[pc]+" · "+PC_EN[pc] : (md==="en"?PC_EN:PC_FR)[pc]; }
const lblGone = () => lblS().m.filter(v=>v>=1).length;
// ---- the lesson keyboard: labels, fingers, the split line (P13), the drawn hand (D13)
function ppPaint2(){ const k=$("ppKb"); if(!k) return; const step=PP.L&&PP.L.steps[PP.step], watchS=PP.view==="lesson"&&step&&step.k==="watch";
  k.querySelectorAll(".wk[data-m]").forEach(el=>{ const m=+el.dataset.m, pc=md12(m), sp=el.querySelector("span"); if(!sp) return; const lv=watchS?Math.min(1,lblLevel(pc)):lblLevel(pc);
    sp.textContent=lblName(pc); sp.classList.toggle("lb-pale",lv===1); sp.classList.toggle("lb-off",lv===2); });
  k.querySelectorAll(".pp-fg").forEach(e=>e.remove());
  if(PP.fing) PP.fing.forEach((f,m)=>{ const el=ppKeyEl(m); if(!el) return; const b=document.createElement("b"); b.className="pp-fg"+(PP.fingPale?" pale":"")+(PP.handF===f?" on":""); b.textContent=f; el.appendChild(b); });
  const sp=PP.split; k.classList.toggle("pp-split",sp!=null); k.querySelectorAll("[data-m]").forEach(el=>{ const m=+el.dataset.m; el.classList.toggle("pp-lh",sp!=null&&m<sp); el.classList.toggle("pp-rh",sp!=null&&m>=sp); });
  ppHandPaint(); }
// D13: a vector hand over the keys (right: thumb = 1 on the base key; left: little finger = 5 on the base key), one finger can be lit
function ppHandPaint(){ const w=document.querySelector("#ppPanel .pp-kbw"); if(!w) return; let el=w.querySelector(".pp-hand"); const H=PP.hand;
  if(!H){ if(el) el.remove(); return; }
  const keys=[0,2,4,5,7].map(o=>ppKeyEl(H.base+o)).filter(Boolean); if(keys.length<5){ if(el) el.remove(); return; }
  const wr=w.getBoundingClientRect(), r0=keys[0].getBoundingClientRect(), r4=keys[4].getBoundingClientRect(), x0=r0.left-wr.left, x1=r4.right-wr.left, kh=r0.height;
  if(!el){ el=document.createElement("div"); el.className="pp-hand"; el.setAttribute("aria-hidden","true"); w.appendChild(el); }
  const W=x1-x0, cw=W/5, top=-kh*.55, hh=kh*1.15; el.style.cssText="left:"+x0+"px;width:"+W+"px;top:"+top+"px;height:"+hh+"px";
  const len=[.5,.74,.8,.74,.6], fin=[1,2,3,4,5].map((f,i)=>{ const fi=H.side==="l"?6-f:f, ci=i, x=(ci+.5)*cw, L=len[fi-1]*hh*.95, y0=hh*.36, on=H.f===fi;
    return '<rect x="'+(x-cw*.3)+'" y="'+(y0)+'" width="'+(cw*.6)+'" height="'+L+'" rx="'+(cw*.3)+'" class="'+(on?"on":"")+'"/><circle cx="'+x+'" cy="'+(y0+L-cw*.34)+'" r="'+Math.min(cw*.26,13)+'" class="n'+(on?" on":"")+'"/><text x="'+x+'" y="'+(y0+L-cw*.34)+'" dy=".35em">'+fi+'</text>'; }).join("");
  el.innerHTML='<svg viewBox="0 0 '+W+' '+hh+'" width="'+W+'" height="'+hh+'"><rect x="'+(cw*.25)+'" y="0" width="'+(W-cw*.5)+'" height="'+(hh*.46)+'" rx="'+(cw*.7)+'"/>'+fin+'</svg>'; }
// ---- lesson definitions P04–P14 (§3.3)
const PP_RANGE={p06:[48,72], p10:[48,76], p11:[48,76], p12:[48,76], p13:[48,76], p14:[48,76]};
// Au clair de la lune, first phrase (traditional, public domain): [pitch class, beats]; P14: 8 bars = the phrase twice, our own simple chords
const PP_LUNE=[[0,1],[0,1],[0,1],[2,1],[4,2],[2,2],[0,1],[4,1],[2,1],[2,1],[0,4]];
const PP_LUNE_CH=[[0,0],[4,0],[6,7],[8,0],[10,7],[12,0]]; // [beat, root] per 16-beat phrase
function ppLesson2(id){ const N=ppNames(), C=N[0], g3=ppGroups(3), watch=demo=>({k:"watch", demo}), lit=(m,c,d)=>{ PP.demo.set(ppFold(m),c||"var(--note-"+md12(m)+")"); ppPaint(); if(d) ppLater(()=>{ PP.demo.delete(ppFold(m)); ppPaint(); },d); };
  const one=(pc,o)=>ppPc([pc],{say:t("ppPlay")(N[pc]), ok:t("ppOk")(N[pc]), ...o});
  if(id==="p04"){ const H=t("pp04Hint"), ix={5:0,7:1,9:2,11:3}, F=ppKeys([5]).find(m=>m>=53&&m+6<=ppRange()[1])||53;
    const q=pc=>one(pc,{sub:H[ix[pc]], sub1:H[ix[pc]], zone:()=>g3.flat().concat(ppKeys([5,7,9,11]))});
    return {steps:[watch(()=>{ ppSay(t("pp04W")(N)[0]); const g=g3.find(x=>x[0]===66)||g3[0]; ppLater(()=>{ g.forEach(m=>PP.demo.set(m,"#ff9a3c")); ppPaint(); },300);
        [5,7,9,11].forEach((pc,i)=>ppLater(()=>{ PP.demo.set(60+pc,"var(--note-"+pc+")"); tone(60+pc,0,.55,.26); ppPaint(); },1100+i*700)); ppLater(()=>ppSay(t("pp04W")(N)[1]),3200); }),
      {k:"ex", mk:()=>[ppSeqIt(m=>md12(m)===5,[2,4,6],{say:t("pp04Run")(N), sub:t("pp04RunS")(N[5]), sub1:t("pp04RunS")(N[5]), ok:t("ppGood"), zone:()=>[F,F+2,F+4,F+6], showM:()=>[F,F+2,F+4,F+6]})]},
      {k:"ex", mk:()=>ppShuf([5,7,9,11,5,7,9,11]).map(q)},
      {k:"ex", mk:()=>[ppSeqIt(m=>md12(m)===0 && m+11<=Math.max(ppRange()[1],(+S.settings.kbdHigh||96)),[2,4,5,7,9,11],{say:t("pp04Seven")(N), sub:t("pp04SevenS")(N), sub1:t("pp04SevenS")(N), ok:t("ppGood"), zone:()=>[60,62,64,65,67,69,71].filter(m=>m<=ppRange()[1]), showM:()=>[60,62,64,65,67,69,71]})]}],
      can:t("ppCan")(N)[3]}; }
  if(id==="p05"){ const W=[0,2,4,5,7,9,11];
    const q=(pc,i)=>({...one(pc,{say:t("pp05Q")(N[pc]), sub:t("pp05Sub"), sub1:t("pp05Sub"), ok:t("ppGood"), zone:()=>ppKeys([pc])}), flash:true, reflex:true, count:i===0});
    return {steps:[watch(()=>{ ppSay(t("pp05W")[0]); ppLater(()=>ppSay(t("pp05W")[1]),1800); W.forEach((pc,i)=>ppLater(()=>lit(60+pc,null,500),400+i*220)); }),
      {k:"ex", mk:()=>{ PP.times=[]; PP.pale5=new Set(); PP.fast5={}; const o=ppShuf(W.concat(ppShuf(W).slice(0,5))); for(let i=1;i<o.length;i++) if(o[i]===o[i-1]){ const j=(i+2)%o.length; [o[i],o[j]]=[o[j],o[i]]; } return o.map(q); }}],
      can:t("ppCan")(N)[4], stars:()=>{ const ts=PP.times||[], avg=ts.length?ts.reduce((a,b)=>a+b.ms,0)/ts.length:9e9; return avg<2000&&PP.err<=1?3:avg<3500?2:1; }, extra:ppBravo5, sticker:"lynx"}; }
  if(id==="p06"){ const ref=(pc,up,r)=>({say:t(up?"pp06Up":"pp06Down")(N[pc]), sub:t(up?"pp06UpS":"pp06DownS"), sub1:t(up?"pp06UpS":"pp06DownS"), ok:t("ppGood"), ref:r,
      onStart:()=>{ PP.demo.set(ppFold(r),"var(--note-"+pc+")"); ppPaint(); tone(r,0,.6,.24); },
      check:m=>{ if(md12(m)!==pc) return "bad"; if(up?m>r:m<r) return "ok"; if(ppMid()){ PP.fb=t("pp06MicAgain"); PP.fbk=""; ppPrompt(); return "skip"; } return "bad"; },
      bad:m=>md12(m)===pc?t(up?"pp06NotUp":"pp06NotDown")(N[pc]):null, zone:()=>ppKeys([pc]).filter(m=>up?m>r:m<r), showM:()=>{ const c=ppKeys([pc]).filter(m=>up?m>r:m<r); return [up?c[0]:c[c.length-1]]; }});
    const ear=low=>{ const m=low?[43,45,47,48][Math.floor(Math.random()*4)]:[76,79,81,84][Math.floor(Math.random()*4)];
      return {say:t("pp06Ear"), sub:t("pp06EarS")(C), sub1:t("pp06EarS")(C), ok:t("ppGood"), cards:true, ans:low, play:()=>tone(m,0,.9,.3),
        check:x=>(x<60)===low?"ok":"bad", bad:()=>t("pp06Wrong")(low), zone:()=>ppKeys([0,1,2,3,4,5,6,7,8,9,10,11]).filter(k=>low?k<60:k>=60), showM:()=>[m]}; };
    return {steps:[watch(()=>{ ppSay(t("pp06W")[0]); [48,60,72].forEach((m,i)=>ppLater(()=>lit(m,null,900),400+i*1000)); ppLater(()=>ppSay(t("pp06W")[1]),3400); [48,60,72].forEach((m,i)=>ppLater(()=>lit(m,null,0),3600+i*250)); }),
      {k:"ex", mk:()=>[ref(4,true,52),ref(7,true,55),ref(4,false,64),ref(9,false,69)]},
      {k:"ex", mk:()=>ppShuf([true,false,true,false]).map(ear)}],
      can:t("ppCan")(N)[5]}; }
  if(id==="p07"){ const pos={1:60,2:62,3:64,4:65,5:67}, FN=t("pp07FN"), base=()=>{ PP.fing=new Map(Object.entries(pos).map(([f,m])=>[m,+f])); };
    const exact = () => ppInp()==="screen" || (ppInp()==="midi" && !ppSmall());
    const f1=(f,pale)=>({say:t("pp07F")(f), sub:t("pp07Honest"), sub1:t("pp07Is")(f,FN[f-1]), ok:t("ppGood"), finger:f,
      onStart:()=>{ base(); PP.fingPale=!!pale; PP.hand=null; PP.handF=0; ppPaint(); },
      check:m=>(exact()?m===pos[f]:md12(m)===md12(pos[f]))?"ok":"bad", zone:()=>[pos[f]], showM:()=>[pos[f]], onErr:(it)=>{ if(it.err===2){ PP.hand={side:"r",base:60,f}; PP.handF=f; ppPaint(); } }});
    const order=()=>[3].concat(ppShuf([1,5,2,4]));
    return {steps:[watch(()=>{ base(); PP.hand={side:"r",base:60,f:0}; PP.fingPale=false; ppSay(t("pp07W")(N)[0]); ppPaint(); [1,2,3,4,5].forEach((f,i)=>ppLater(()=>{ PP.hand={side:"r",base:60,f}; PP.handF=f; lit(pos[f],null,450); tone(pos[f],0,.5,.24); },900+i*600));
        ppLater(()=>{ ppSay(t("pp07W")(N)[1]); PP.hand={side:"r",base:60,f:0}; PP.handF=0; ppPaint(); },4200); ppLater(()=>hint("fing",$("ppSay"),t("hintTxt").fing),1200); }),
      {k:"ex", mk:()=>order().map(f=>f1(f,false))},
      {k:"ex", mk:()=>[ppSeqIt(m=>exact()?m===60:md12(m)===0,[2,4,5,7,5,4,2,0],{say:t("pp07Run"), sub:t("pp07RunS")(N), sub1:t("pp07RunS")(N), ok:t("ppGood"), zone:()=>[60,62,64,65,67], showM:()=>[60,62,64,65,67,65,64,62,60],
        onStart:()=>{ base(); PP.fingPale=false; PP.hand=null; ppPaint(); }})]},
      {k:"ex", mk:()=>order().map(f=>({...f1(f,true), say:t("pp07F")(f), sub:t("pp07NoNum"), sub1:t("pp07Is")(f,FN[f-1])}))}],
      can:t("ppCan")(N)[6], fingers:true}; }
  if(id==="p08") return {steps:[{k:"song", watch:true, aid:0, listen:true, say:t("pp08W"), sub:t("pp08Song")},
      {k:"song", aid:0, say:t("pp08Ex")[0], sub:t("pp08ExS")[0]}, {k:"song", aid:1, say:t("pp08Ex")[1], sub:t("pp08ExS")[1]}, {k:"song", aid:2, say:t("pp08Ex")[2], sub:t("pp08ExS")[2]}],
      can:t("ppCan")(N)[7], extra:ppBravo8, sticker:"melody"};
  const mic=ppMid();
  if(id==="p09"){ const bpm=b=>Math.max(40,b+(PP.bpmAdj|0));
    const pulse=()=>({say:t("pp09Hit")(N), sub:mic?t("pp09Mic"):t("pp09HitS"), sub1:t("pp09HitS"), ok:t("ppGood"), beat:()=>({bpm:bpm(70), w1:mic?200:120, ev:Array.from({length:8},(_,i)=>({b:i, pcs:null})), pass:.5, retry:true})});
    const hold=()=>({say:t("pp09Hold")(N), sub:mic?t("pp09Mic"):t("pp09HoldS"), sub1:t("pp09HoldS"), ok:t("ppGood"), beat:()=>({bpm:bpm(70), w1:mic?200:120, ev:[0,4,8,12].map(b=>({b, pcs:null, hold:2})), beats:16})});
    const song=()=>{ let b=0; const ev=PP_LUNE.map(([pc,d])=>{ const e={b, pcs:[pc], lbl:N[pc], d}; b+=d; return e; });
      return {say:t("pp09Song"), sub:t("pp09SongS"), sub1:t("pp09SongS"), ok:t("ppGood"), beat:()=>({bpm:bpm(60), w1:mic?200:150, ev, beats:16, names:true})}; };
    return {steps:[watch(()=>{ ppSay(t("pp09W")[0]); ppLater(()=>ppSay(t("pp09W")[1]),2600); ppBeatStart({bpm:70, ev:Array.from({length:8},(_,i)=>({b:i, pcs:null, play:[60]})), auto:true, count:0}); }),
      {k:"ex", mk:()=>[pulse()]}, {k:"ex", mk:()=>[hold()]}, {k:"ex", mk:()=>[song()]}], can:t("ppCan")(N)[8], rhythm:true}; }
  if(id==="p10"){ const ch=()=>ppChordIt(0,{say:t("pp10All"), sub:mic?t("ppMicChord"):t("pp10AllS")(N), sub1:t("pp10AllS")(N), ok:t("ppGood"), onStart:()=>{ PP.fing=new Map([[60,1],[64,3],[67,5]]); PP.fingPale=false; ppPaint(); }});
    return {steps:[watch(()=>{ PP.fing=new Map([[60,1],[64,3],[67,5]]); ppSay(t("pp10W")[0]); [60,64,67].forEach((m,i)=>ppLater(()=>{ lit(m,null,0); tone(m,0,.6,.24); },400+i*600)); ppLater(()=>{ [60,64,67].forEach(m=>tone(m,0,1.2,.2)); },2400); ppLater(()=>ppSay(t("pp10W")[1]),2600); }),
      {k:"ex", mk:()=>[ppSeqIt(m=>md12(m)===0,[4,7],{say:t("pp10Run")(N), sub:t("pp10RunS"), sub1:t("pp10RunS"), ok:t("ppGood"), zone:()=>[60,64,67], showM:()=>[60,64,67], onStart:()=>{ PP.fing=new Map([[60,1],[64,3],[67,5]]); ppPaint(); }})]},
      {k:"ex", mk:()=>[ch(),ch(),ch()]},
      {k:"ex", mk:()=>[{say:t("pp10Pulse"), sub:mic?t("ppMicChord"):t("pp10PulseS"), sub1:t("pp10PulseS"), ok:t("ppGood"), beat:()=>({bpm:Math.max(40,60+(PP.bpmAdj|0)), w1:mic?350:250, ev:[0,4,8,12].map(b=>({b, pcs:[0,4,7], lbl:N[0]})), beats:16})}]}],
      can:t("ppCan")(N)[9]}; }
  if(id==="p11"){ const ch=(r,o)=>ppChordIt(r,{say:t("pp11Play")(N[r]), sub:mic?t("ppMicChord"):t("pp11From")(N[r]), sub1:t("pp11From")(N[r]), ok:t("ppGood"), big:N[r], ...o});
    return {steps:[watch(()=>{ ppSay(t("pp11W")(N)[0]); [0,5,7].forEach((r,i)=>ppLater(()=>{ PP.demo.clear(); PP.fing=new Map([[60+r,1],[64+r,3],[67+r,5]]); PP.hand={side:"r",base:60+r,f:0}; [60,64,67].forEach(m=>{ PP.demo.set(ppFold(m+r),"var(--note-"+md12(m+r)+")"); tone(m+r,0,1,.18); }); ppPaint(); },400+i*1600));
        ppLater(()=>{ ppSay(t("pp11W")(N)[1]); PP.hand=null; ppPaint(); },5200); }),
      {k:"ex", mk:()=>[ch(5),ch(5),ch(7),ch(7)]},
      {k:"ex", mk:()=>[0,5,7,0].map((r,i)=>ch(r,{say:t("pp11Seq")(N), sub:t("pp11SeqS")(i+1,N[r]), sub1:t("pp11SeqS")(i+1,N[r]), grid:[0,5,7,0].map(x=>N[x]), gi:i}))},
      {k:"ex", mk:()=>{ const o=[]; let last=-1; while(o.length<6){ const r=[0,5,7][Math.floor(Math.random()*3)]; if(r===last) continue; o.push(r); last=r; } return o.map(r=>ch(r,{say:t("pp11Rand"), sub:t("pp11Play")(N[r])})); }}],
      can:t("ppCan")(N)[10]}; }
  const GRID=[0,5,7,0];
  if(id==="p12"){ const tempo=()=>Math.max(40,60+(PP.bpmAdj|0)+(PP.slow12?-10:0));
    return {steps:[watch(()=>{ ppSay(t("pp12W")[0]); ppLater(()=>ppSay(t("pp12W")[1]),3000); ppBeatStart({bpm:72, auto:true, count:0, ev:GRID.map((r,i)=>({b:i*4, pcs:[0,4,7].map(x=>md12(r+x)), lbl:N[r], play:[60,64,67].map(x=>x+(r===7?-5:r))}))}); }),
      {k:"ex", mk:()=>GRID.map((r,i)=>ppChordIt(r,{say:N[r], sub:t("pp12Wait"), sub1:t("pp11From")(N[r]), ok:t("ppGood"), grid:GRID.map(x=>N[x]), gi:i, bigSay:true}))},
      {k:"ex", mk:()=>[{say:t("pp12Go"), sub:mic?t("ppMicChord"):t("pp12GoS"), sub1:t("pp12Prep"), ok:t("ppGood"), beat:()=>({bpm:tempo(), w1:mic?350:250, chordGrid:true, ev:GRID.concat(GRID).map((r,i)=>({b:i*4, pcs:[0,4,7].map(x=>md12(r+x)), lbl:N[r]})), beats:32, rounds:2})}]}],
      can:t("ppCan")(N)[11], rhythm:true, sticker:"accomp"}; }
  if(id==="p13"){ const sp=()=>{ PP.split=ppSplit(); }, base=()=>({onStart:()=>{ sp(); PP.hand=null; ppPaint(); }});
    const bass=(r,i)=>({...base(), say:t("pp13Bass")(N), sub:t("pp13BassOne")(N[r]), sub1:t("pp13BassOne")(N[r]), ok:t("ppGood"), grid:GRID.map(x=>N[x]), gi:i,
      check:m=>md12(m)===r && (ppMid()||m<ppSplit()) ? "ok" : "bad", bad:m=>m>=ppSplit()&&!ppMid()?t("pp13LH")(N[r]):null, zone:()=>ppKeys([0,1,2,3,4,5,6,7,8,9,10,11]).filter(k=>k<ppSplit()), showM:()=>[ppBassKey(r)]});
    const both=(r,o)=>ppChordIt(r,{bass:true, say:t("pp13Both")(N[r]), sub:ppMid()?t("pp13Mic"):ppSmall()?t("pp13Small"):t("pp13BothS"), sub1:t("pp13BothS"), ok:t("ppGood"), onStart:base().onStart, ...o});
    return {steps:[watch(()=>{ sp(); ppSay(t("pp13W")[0]); PP.hand={side:"l",base:48,f:5}; ppPaint(); ppLater(()=>{ lit(48,null,0); tone(48,0,1,.26); },700);
        ppLater(()=>{ ppSay(t("pp13W")[1]); PP.hand={side:"r",base:60,f:0}; PP.fing=new Map([[60,1],[64,3],[67,5]]); [60,64,67].forEach(m=>{ lit(m,null,0); tone(m,0,1,.2); }); },2400); }),
      {k:"ex", mk:()=>GRID.map((r,i)=>bass(r,i))},
      {k:"ex", mk:()=>[0,5,7].map(r=>both(r))},
      {k:"ex", mk:()=>GRID.map((r,i)=>both(r,{say:t("pp13Grid"), sub:t("pp11SeqS")(i+1,N[r]), sub1:t("pp11SeqS")(i+1,N[r]), grid:GRID.map(x=>N[x]), gi:i}))}],
      can:t("ppCan")(N)[12], hands:true}; }
  if(id==="p14"){ const ev2=(two,auto)=>{ const ev=[]; for(let ph=0;ph<2;ph++) PP_LUNE_CH.forEach(([b,r])=>ev.push({b:ph*16+b, pcs:[0,4,7].map(x=>md12(r+x)), bass:two?r:null, lbl:N[r], play:auto?[60,64,67].map(x=>x+(r===7?-5:r)).concat(two?[48+r-(r===7?12:0)]:[]):null})); return ev; };
    const mel=()=>{ const o=[]; for(let ph=0;ph<2;ph++){ let b=0; PP_LUNE.forEach(([pc,d])=>{ o.push({b:ph*16+b, m:72+pc, d}); b+=d; }); } return o; };
    const lbls=ev2(false).map(e=>e.lbl);
    const easy=()=>{ const segs=[]; for(let ph=0;ph<2;ph++) PP_LUNE_CH.forEach(([b,r],i)=>{ const nb=i+1<PP_LUNE_CH.length?PP_LUNE_CH[i+1][0]:16; segs.push({r, notes:mel().filter(n=>n.b>=ph*16+b&&n.b<ph*16+nb).map(n=>({...n, b:n.b-ph*16-b}))}); });
      return segs.map((s,i)=>ppChordIt(s.r,{say:N[s.r], sub:t("pp14EasyS"), sub1:t("pp11From")(N[s.r]), ok:t("ppGood"), grid:lbls, gi:i, bigSay:true, mel:s.notes})); };
    return {steps:[watch(()=>{ ppSay(t("pp14W")[0]); ppLater(()=>ppSay(t("pp14W")[1]),2500); ppBeatStart({bpm:96, auto:true, count:0, ev:ev2(false,true), mel:mel(), beats:32, chordGrid:true}); }),
      {k:"ex", mk:easy},
      {k:"ex", mk:()=>[{say:t("pp14Choose"), sub:t("pp14Go"), sub1:t("pp14Go"), ok:t("ppGood"), choose:true, beat:two=>({bpm:Math.max(40,60+(PP.bpmAdj|0)), w1:mic?350:250, chordGrid:true, ev:ev2(!!two&&!mic), mel:mel(), beats:32})}]}],
      can:t("ppCan")(N)[13], rhythm:true, hands:true, sticker:"pp"}; }
  return null; }
{ const _pl=ppLesson; ppLesson=function(id){ return _pl.apply(this,arguments) || ppLesson2(id); }; }
{ const _pp=ppPc; ppPc=function(pcs,o){ const it=_pp.apply(this,arguments); if(pcs.length===1 && it.pc==null) it.pc=pcs[0]; return it; }; }
// ---- the beat (D15): a ball bouncing on 4 points, a click per beat, a dot per expected hit (green on time, orange early, blue late; never red)
const BT={B:null};
function ppClick(acc){ try{ const c=audio(); if(!c||PP.click===false) return; const o=c.createOscillator(), g=c.createGain(), t0=c.currentTime; o.type="square"; o.frequency.value=acc?1500:1000; g.gain.setValueAtTime(.05,t0); g.gain.exponentialRampToValueAtTime(.0001,t0+.04); o.connect(g); g.connect(master); o.start(t0); o.stop(t0+.06); }catch(e){} }
function ppBeatStart(o){ ppBeatStop(); const w=$("ppWid"); if(!w) return; const spb=60000/o.bpm, cnt=o.count==null?4:o.count, now=performance.now(), N=ppNames();
  const B={...o, spb, t0:now+cnt*spb+500, res:o.ev.map(()=>null), col:o.ev.map(()=>({pcs:[], t:null, bass:false})), lastB:-99, run:{e:0,l:0}, late2:0, holdM:null, done:false, snd:[]};
  if(o.mel) o.mel.forEach(n=>B.snd.push({b:n.b, m:[n.m], d:n.d*spb/1000*.92, v:.2}));
  if(o.auto) o.ev.forEach(e=>{ if(e.play) B.snd.push({b:e.b, m:e.play, d:Math.min(1.4,spb/1000*(e.hold||1)*.95), v:.2}); });
  B.snd.sort((a,b)=>a.b-b.b); B.si=0;
  const lg=t("ppLegend");
  w.innerHTML='<div class="pp-beat'+(o.chordGrid||o.names?' grid':'')+'"><div class="pp-bch" id="ppBch"></div><div class="pp-bst"><span class="pp-ball" id="ppBall"></span>'+[1,2,3,4].map(i=>'<span class="pp-pad" data-i="'+(i-1)+'"><i></i><b>'+i+'</b></span>').join("")+'<span class="pp-bcnt" id="ppBcnt"></span></div>'
    +'<div class="pp-line" id="ppLine">'+o.ev.map((e,i)=>'<i data-j="'+i+'"'+(e.hold?' class="hold"':'')+'>'+(o.names&&e.lbl?'<small>'+esc(e.lbl)+'</small>':'')+(e.hold?'<u></u>':'')+'</i>').join("")+'</div>'
    +(o.auto?'':'<p class="pp-leg"><span class="g">'+esc(lg[0])+'</span><span class="o">'+esc(lg[1])+'</span><span class="b">'+esc(lg[2])+'</span></p>')+'</div>';
  BT.B=B; const RM=matchMedia("(prefers-reduced-motion:reduce)").matches;
  const loop=()=>{ if(BT.B!==B) return; const now=performance.now(), pos=(now-B.t0)/spb, bi=Math.floor(pos);
    if(bi!==B.lastB && pos>-cnt-.01){ B.lastB=bi; const total=B.beats||(Math.max(...B.ev.map(e=>e.b+(e.d||1)))); if(bi<total || bi<0) ppClick(md12(bi)%4===0||(bi<0&&(bi+cnt)%4===0));
      const c=$("ppBcnt"); if(c) c.textContent = bi<0 ? String(bi+cnt+1) : ""; }
    while(B.si<B.snd.length && B.t0+B.snd[B.si].b*spb<=now+8){ const s=B.snd[B.si++]; s.m.forEach(m=>tone(m,0,s.d,s.v)); if(o.auto){ s.m.forEach(m=>{ PP.demo.set(ppFold(m),"var(--note-"+md12(m)+")"); }); ppPaint(); setTimeout(()=>{ s.m.forEach(m=>PP.demo.delete(ppFold(m))); ppPaint(); },Math.min(900,s.d*1000)); } }
    const ball=$("ppBall"), st=ball&&ball.parentNode; if(ball&&st){ const p=Math.max(pos,-cnt), i=Math.floor(p), f=p-i, a=((i%4)+4)%4, b=(a+1)%4, W=st.clientWidth, H=st.clientHeight, x0=(a+.5)/4*W, x1=(b+.5)/4*W;
      const x = b===0 ? x0+(f<.5?f*2*(W/8):0) : x0+(x1-x0)*f, y = RM ? 0 : -Math.sin(Math.PI*f)*H*.62;
      ball.style.transform='translate('+(b===0&&f>=.5?(.5/4*W):x)+'px,'+y+'px)'; st.querySelectorAll(".pp-pad").forEach(e=>e.classList.toggle("on",+e.dataset.i===a && f<.25 && pos>=-cnt)); }
    ppBeatChord(now); if(B.holdM!=null) ppBeatHoldDraw(now);
    if(!o.auto){ B.ev.forEach((e,j)=>{ if(B.res[j]) return; const te=B.t0+e.b*spb; if(now>te+ppW2(B)+ppSpan(B)) ppBeatMark(j,"m"); }); }
    const last=B.t0+Math.max(...B.ev.map(e=>e.b+(e.hold||0)))*spb+ppW2(B)+ppSpan(B)+500;
    if(now>last && !B.done){ B.done=true; if(o.onEnd) o.onEnd(B); return; }
    B.raf=requestAnimationFrame(loop); };
  const bx=w.querySelector(".pp-beat"); bx.dataset.t0=Math.round(B.t0); bx.dataset.spb=Math.round(spb); // read by the tests
  B.raf=requestAnimationFrame(loop); ppBeatChord(now); return B; }
function ppBeatStop(){ const B=BT.B; if(B){ cancelAnimationFrame(B.raf); BT.B=null; } }
const ppW2 = B => Math.max(350, (B.w1||120)+150);
const ppSpan = B => B.ev.some(e=>e.pcs&&e.pcs.length>1) ? (ppInp()==="midi" ? 250 : 1200) : 0;
function ppBeatChord(now){ const B=BT.B, el=$("ppBch"); if(!B||!el||!B.chordGrid) return; const spb=B.spb; let j=B.ev.findIndex(e=>B.t0+e.b*spb+ppW2(B)>now); if(j<0) j=B.ev.length-1;
  const k=j+":"+(B.res[j]?1:0); if(el.dataset.k===k) return; el.dataset.k=k; const e=B.ev[j], nx=B.ev.slice(j+1).find(x=>x.lbl!==e.lbl)||B.ev[j+1];
  el.innerHTML='<b class="pp-chip">'+esc(e.lbl||"")+'</b>'+(nx?'<span class="pp-nx">→ '+esc(nx.lbl||"")+'</span>':''); }
function ppBeatMark(j,k,d){ const B=BT.B; if(!B||B.res[j]) return; B.res[j]={k,d}; const el=document.querySelector('#ppLine [data-j="'+j+'"]'); if(el){ el.classList.add(k); }
  if(k!=="m"){ if(k==="o"){ B.run.e++; B.run.l=0; } else if(k==="b"){ B.run.l++; B.run.e=0; B.late2++; } else { B.run.e=0; B.run.l=0; }
    const it=PP.items[PP.ii]; if(it){ if(B.run.e>=4){ PP.fb=t("pp09Early"); PP.fbk=""; ppPrompt(); B.run.e=0; } else if(B.run.l>=4){ PP.fb=t("pp09Late"); PP.fbk=""; ppPrompt(); B.run.l=0; }
      else if(B.chordGrid && B.late2>=2 && !B.told){ B.told=1; PP.fb=t("pp12Prep"); PP.fbk=""; ppPrompt(); } } } }
// a note during the beat: matched to the nearest open expected hit (latency of the mic taken off)
function ppBeatNote(m){ const B=BT.B; if(!B||B.auto) return; const tm=ppT(m)-(ppInp()==="mic"?80:ppInp()==="midi"&&typeof midiLat==="function"?midiLat():0), pc=md12(m), W1=B.w1||120, W2=ppW2(B), sp=ppSpan(B); let best=-1, bd=1e9;
  B.ev.forEach((e,j)=>{ if(B.res[j]) return; const te=B.t0+e.b*B.spb, d=tm-te; if(d<-W2 || d>W2+sp) return; const c=B.col[j]; if(c.t!=null && d>W2+sp) return; const ad=Math.abs(c.t!=null?0:d); if(ad<bd){ bd=ad; best=j; } });
  if(best<0) return; const e=B.ev[best], c=B.col[best], te=B.t0+e.b*B.spb;
  const cls = d => Math.abs(d)<=W1 ? "g" : d<0 ? "o" : "b";
  if(!e.pcs || e.pcs.length===1){ if(e.pcs && !e.pcs.includes(pc)) return; const d=tm-te; ppBeatMark(best,cls(d),d); if(e.hold){ B.holdM=m; B.holdJ=best; B.holdT=tm; } return; }
  if(e.bass!=null && m<ppSplit() && ppInp()!=="mic"){ if(pc===e.bass) c.bass=true; return; }
  if(!e.pcs.includes(pc)) return; if(c.t==null) c.t=tm; if(!c.pcs.includes(pc)) c.pcs.push(pc);
  const full=e.pcs.every(p=>c.pcs.includes(p)) && (e.bass==null || ppInp()==="mic" || c.bass);
  if(full){ const d=c.t-te; ppBeatMark(best,cls(d),d); } }
function ppBeatRelease(now){ const B=BT.B; if(!B||B.holdM==null) return; const e=B.ev[B.holdJ], held=now-B.holdT, ok=held>=.75*e.hold*B.spb, el=document.querySelector('#ppLine [data-j="'+B.holdJ+'"]');
  if(B.res[B.holdJ]) B.res[B.holdJ].held=ok; if(el) el.classList.add(ok?"held":"short"); B.holdM=null; }
function ppBeatHoldDraw(now){ const B=BT.B, el=document.querySelector('#ppLine [data-j="'+B.holdJ+'"] u'); const e=B.ev[B.holdJ]; if(!el||!e) return; const f=Math.min(1,(now-B.holdT)/(e.hold*B.spb));
  el.style.width=Math.round(f*100)+"%"; if(f>=1 && ppInp()!=="screen"){ /* still held after 2 beats: counts */ } }
// a beat item: starts after the prompt; at the end, a line of results, then the next item (never blocks; one slower retry for P09/P12)
function ppBeatItem(it, two){ if(two!=null) it.two=two; const o=it.beat(it.two); o.onEnd=B=>{ if(B.holdM!=null) ppBeatRelease(performance.now()); const n=B.ev.length, g=B.res.filter(r=>r&&r.k==="g").length, hd=B.ev.filter(e=>e.hold).length, held=B.res.filter((r,j)=>r&&r.k!=="m"&&B.ev[j].hold&&(ppInp()==="mic"||r.held!==false)).length;
    const rounds=o.rounds||1, per=n/rounds, rok=Array.from({length:rounds},(_,i)=>B.res.slice(i*per,(i+1)*per).filter(r=>r&&r.k==="g").length).some(x=>x>=Math.ceil(per*.75));
    PP.fb = hd ? t("pp09Held")(held,hd)+" · "+t("pp09Res")(g,n) : B.chordGrid ? t("pp12Res")(g,n) : t("pp09Res")(g,n); PP.fbk = g>=n/2 ? "ok" : ""; ppPrompt();
    if(PP.id==="p12" && !rok){ const p=ppS(); p.fail.p12=(p.fail.p12|0)+1; }
    const low = g<n/2 && !PP.review; if(low && it.retry!==false && !it.retried && (o.retry || PP.id==="p12" || PP.id==="p10")){ it.retried=true; if(PP.id==="p12") PP.slow12=true; else PP.bpmAdj=(PP.bpmAdj|0)-10;
      ppLater(()=>{ PP.fb=t("pp09Slower"); PP.fbk=""; ppPrompt(); ppLater(()=>ppBeatItem(it),1400); },1800); return; }
    PP.busy=performance.now()+900; ppLater(ppNext,2000); };
  ppBeatStart(o); }
// ---- the widget under the prompt: chord cells (D16), grave / high cards (P06), the reflex bar (P05), the chord grid (P11–P14), the version choice (P14), the song's notes (D14)
function ppWid(){ const w=$("ppWid"); if(!w) return; const it=PP.items[PP.ii], st=PP.L&&PP.L.steps[PP.step], N=ppNames(); if(!st) { w.innerHTML=""; return; }
  if(st.k==="song"){ w.innerHTML='<div class="pp-frise" id="ppFrise">'+PP_LUNE.map(([pc],i)=>'<i data-i="'+i+'" style="--nc:var(--note-'+pc+')">'+esc(N[pc])+'</i>').join("")+'</div>'; ppFrise(PP.songI|0); return; }
  if(!it || st.k!=="ex"){ if(st.k!=="watch") w.innerHTML=""; else if(!BT.B) w.innerHTML=""; return; }
  if(it.beat){ if(it.choose && !it.started){ w.innerHTML='<div class="pp-choose">'+t("pp14V").map((x,i)=>'<button type="button" class="'+(i?"btn":"pp-main")+'" data-v="'+i+'">'+esc(x)+'</button>').join("")+'</div>';
      w.querySelectorAll("button").forEach(b=>b.onclick=()=>{ it.started=true; ppBeatItem(it, +b.dataset.v===1); }); return; }
    return; }
  let h="";
  if(it.grid) h+='<div class="pp-grid">'+it.grid.map((x,i)=>'<span class="'+(i<it.gi?"ok":i===it.gi?"cur":"")+'">'+esc(x)+'</span>').join('<i aria-hidden="true">·</i>')+'</div>';
  if(it.cells) h+='<div class="pp-cells">'+(it.bassPc!=null&&!PP.oneHand?'<span class="bass" data-b="1">'+esc(N[it.bassPc])+' <small>'+esc(t("pp13LHs"))+'</small></span>':'')+it.cells.map(pc=>'<span data-pc="'+pc+'" style="--nc:var(--note-'+pc+')">'+esc(N[pc])+'</span>').join("")+'</div>';
  if(it.cards) h+='<div class="pp-cards"><button type="button" data-v="48">'+esc(t("pp06Low"))+'</button><button type="button" data-v="72">'+esc(t("pp06High"))+'</button></div>';
  if(it.reflex && !it.counting) h+='<div class="pp-reflex"><i></i></div>';
  w.innerHTML=h; w.querySelectorAll(".pp-cards button").forEach(b=>b.onclick=()=>{ if(performance.now()<PP.busy) return; ppAnswer(+b.dataset.v); });
  ppWidUpd(); }
function ppWidUpd(){ const it=PP.items[PP.ii], w=$("ppWid"); if(!it||!w) return;
  if(it.cells){ w.querySelectorAll(".pp-cells [data-pc]").forEach(e=>{ const pc=+e.dataset.pc; e.classList.toggle("on",it.hits.some(h=>h.pc===pc)); }); const b=w.querySelector(".pp-cells .bass"); if(b) b.classList.toggle("on",!!it.bassHit);
    let x=w.querySelector(".pp-cells .x"); if(it.extra!=null){ if(!x){ x=document.createElement("span"); x.className="x"; w.querySelector(".pp-cells").appendChild(x); } x.textContent=ppNames()[it.extra]; } else if(x) x.remove(); } }
function ppFrise(i){ PP.songI=i; document.querySelectorAll("#ppFrise i").forEach(e=>{ const k=+e.dataset.i; e.classList.toggle("ok",k<i); e.classList.toggle("cur",k===i); }); }
// ---- P05: average time, the slowest note, the letters; P08: listen to what I played, share
function ppBravo5(){ const ts=PP.times||[]; if(!ts.length) return ""; const avg=ts.reduce((a,b)=>a+b.ms,0)/ts.length, sl=ts.slice().sort((a,b)=>b.ms-a.ms)[0], s=v=>(v/1000).toFixed(1).replace(".",S.settings.lang==="fr"?",":".");
  const p=ppS(), best=p.best5&&p.best5<avg?p.best5:avg; p.best5=Math.round(best); save();
  return '<p class="pp-xtra"><b>'+esc(t("pp05Avg")(s(avg)))+'</b> · '+esc(t("pp05Rec")(s(best)))+'<br>'+esc(t("pp05Slow")(ppNames()[sl.pc]))+'</p><p class="pp-xtra sm">'+esc(t("pp05Letters"))+'</p>'; }
function ppBravo8(){ return '<p class="pp-xtra"><button class="btn" type="button" id="ppReplayMe">'+esc(t("pp08Replay"))+'</button> <button class="btn" type="button" id="ppShare8">'+esc(t("pp08Share"))+'</button></p>'; }
function ppReplayMine(){ const a=PP.rec||[]; if(!a.length) return; const t0=a[0].t; a.forEach((n,i)=>{ const nx=a[i+1], d=n.off?Math.max(.15,(n.off-n.t)/1000):nx?Math.min(1.2,Math.max(.2,(nx.t-n.t)/1000)):.8; setTimeout(()=>{ tone(n.m,0,d,.26); },n.t-t0); }); }
// ---- the Play lesson mode (D14): the frame plays the phrase, waits for each note, reports back
function ppSongSrc(st){ return "play/index.html#song=lune&lesson=1&aid="+(st.aid|0)+(st.listen?"&listen=1":"")+"&lang="+(S.settings.lang==="fr"?"fr":"en")+(staffOn()?"&staff=1&clef="+staffClef():""); }
function ppSongSend(m){ const f=$("ppFrame"); if(!f||!f.contentWindow) return; f.contentWindow.postMessage({source:"piano-challenges",type:"noteon",m,vel:.8,quiet:true},SAME_ORIGIN); setTimeout(()=>{ try{ f.contentWindow.postMessage({source:"piano-challenges",type:"noteoff",m},SAME_ORIGIN); }catch(e){} },250); }
addEventListener("message",e=>{ if(SAME_ORIGIN!=="*" && e.origin!==SAME_ORIGIN) return; const d=e.data; if(!d||d.source!=="clavio"||d.type!=="lesson") return;
  if(page!=="pp"||PP.view!=="lesson"||!PP.L) return; const st=PP.L.steps[PP.step]; if(!st||st.k!=="song") return;
  if(d.ev==="start"){ ppFrise(0); if(!st.watch) PP.rec=[]; }
  if(d.ev==="press" && !st.watch){ (PP.rec=PP.rec||[]).push({m:d.m, t:performance.now()}); }
  if(d.ev==="note"){ ppFrise(d.i); }
  if(d.ev==="oct"){ PP.fb=t("pp08Oct"); PP.fbk="ok"; ppPrompt(); }
  if(d.ev==="wrong"){ PP.err++; PP.fb=""; ppPrompt(); }
  if(d.ev==="listened"){ ppFrise(11); }
  if(d.ev==="done"){ ppFrise(11); PP.fb=t(PP.step+1<PP.L.steps.length?"pp08Again":"ppGood"); PP.fbk="ok"; ppPrompt(); PP.busy=performance.now()+1500; ppLater(()=>{ if(PP.step+1<PP.L.steps.length) ppStep(PP.step+1); else ppFinish(); },1400); } });
// ---- hooks into the lesson engine
{ const _ct=ppClearTimers; ppClearTimers=function(){ ppBeatStop(); return _ct.apply(this,arguments); }; }
{ const _st=ppStart; ppStart=function(id){ PP.id=id; PP.fing=null; PP.fingPale=false; PP.hand=null; PP.handF=0; PP.split=null; PP.songI=0; PP.lblNew=false; PP.slow12=false; if(!PP.reviewNext){ PP.review=false; PP.bpmAdj=0; } PP.reviewNext=false;
    const r=_st.apply(this,arguments); if(ppNarrow() && (PP_RANGE[id]||id==="p08") && !(S.hints&&S.hints.seen&&S.hints.seen.rotate)){ hintMark("rotate"); toast(t("ppRotate")); } return r; }; }
{ const _sp=ppStep; ppStep=function(s){ PP.split = PP.L && PP.id==="p13" ? PP.split : null; PP.hand=null; PP.handF=0; if(PP.id!=="p07"&&PP.id!=="p10"&&PP.id!=="p13") PP.fing=null; PP.oneHandLock=false; return _sp.apply(this,arguments); }; }
{ const _it=ppItem; ppItem=function(){ const it=PP.items[PP.ii]; _it.apply(this,arguments); if(!it) return; it.t0=performance.now();
    if(it.onStart) it.onStart(it);
    if(it.bigSay){ const s=$("ppSay"); if(s) s.classList.add("pp-chord"); }
    if(it.count){ PP.busy=performance.now()+2700; it.counting=true; const say=it.say; ["3","2","1"].forEach((x,i)=>ppLater(()=>ppSay(x),i*800)); ppLater(()=>{ it.counting=false; ppSay(say); it.t0=performance.now(); ppWid(); },2400); ppSay("3"); }
    ppWid(); if(it.beat && !it.choose) ppLater(()=>ppBeatItem(it),600); }; }
{ const _pr=ppPrompt; ppPrompt=function(){ _pr.apply(this,arguments); const s=$("ppSay"), it=PP.items[PP.ii], st=PP.L&&PP.L.steps[PP.step]; if(s) s.classList.toggle("pp-chord",!!(it&&it.bigSay)); if(st&&st.k==="song"&&$("ppSub")) $("ppSub").textContent=st.sub||""; ppWidUpd(); }; }
{ const _pt=ppPaint; ppPaint=function(){ _pt.apply(this,arguments); ppPaint2(); }; }
{ const _pa=ppAnswer; ppAnswer=function(m){ const it=PP.items[PP.ii]; if(!it) return; if(it.beat){ ppBeatNote(m); return; }
    if(!it.__w){ const c=it.check; it.check=(mm,x)=>{ const r=c(mm,x); it.__r=r; return r; }; it.__w=1; }
    it.__r=null; const e0=it.err|0, sh=PP.show; _pa.apply(this,arguments); const r=it.__r;
    if(r==="bad" && it.onErr) it.onErr(it);
    if(it.pc!=null && (r==="ok"||r==="bad")){ const ms=performance.now()-(it.t0||performance.now()), clean=!e0&&PP.show===sh&&!it.shown;
      if(r==="ok" && clean) lblScore(it.pc,true,ms<2000); else if(r==="bad") lblScore(it.pc,false);
      if(PP.id==="p05" && r==="ok"){ (PP.times=PP.times||[]).push({pc:it.pc, ms}); if(ms<2000 && clean){ PP.fast5[it.pc]=(PP.fast5[it.pc]|0)+1; if(PP.fast5[it.pc]>=2) PP.pale5.add(it.pc); } } }
    if(r==="ok" && it.mel && it.mel.length){ const spb=60/66; it.mel.forEach(n=>setTimeout(()=>tone(n.m,0,n.d*spb*.9,.22),120+n.b*spb*1000)); PP.busy=performance.now()+Math.max(900,120+(Math.max(...it.mel.map(n=>n.b+n.d)))*spb*1000-300); PP.tm.forEach(clearTimeout); PP.tm=[]; ppLater(ppNext,Math.max(650,(Math.max(...it.mel.map(n=>n.b+n.d)))*spb*1000-150)); } }; }
{ const _sm=ppShowMe; ppShowMe=function(){ const it=PP.items[PP.ii]; if(it) it.shown=true; if(it&&it.chord){ PP.show++; it.err=1; const ms=it.showM(); ms.forEach(m=>tone(m,.15,1,.2)); ms.forEach(m=>PP.demo.set(ppFold(m),"var(--reveal)")); ppPaint(); ppLater(()=>{ ms.forEach(m=>PP.demo.delete(ppFold(m))); ppPaint(); },1300); return; } return _sm.apply(this,arguments); }; }
// notes: times, the Play frame (P08), a lone C leaves « Watch » (not in P02 / P03), a lone B is an answer from P04 on
{ const _pi=ppIn; ppIn=function(b, lone){ const now=performance.now(); b.forEach(m=>{ const t0=PPT.on.get(m); if(!t0||now-t0>150) PPT.on.set(m,now); });
    if(HB.cur && HB.cur.k!=="rotate") hintClose(true);
    if(page==="pp" && !anyModal() && PP.view==="lesson" && PP.L){ const st=PP.L.steps[PP.step];
      if(st && st.k==="song"){ b.forEach(ppPress); if(lone && md12(b[0])===0 && st.watch){ ppPrimary(); return; } if(!st.watch) b.forEach(ppSongSend); return; }
      if(st && st.k==="watch" && lone && md12(b[0])===0 && PP.id!=="p02" && PP.id!=="p03"){ ppPrimary(); return; }
      if(st && st.k==="ex" && lone && md12(b[0])===11 && PP_SI_ANS.includes(PP.id)) lone=false;
      const it=PP.items[PP.ii]; if(st && st.k==="ex" && it && it.choose && !it.started){ if(lone && md12(b[0])===0){ it.started=true; ppBeatItem(it,false); } return; } }
    return _pi.call(this,b,lone); }; }
// the screen keys of the lesson: a key let go (the hold of P09)
document.addEventListener("pointerup",e=>{ if(page!=="pp") return; const m=PPT.ptr.get(e.pointerId); if(m!=null){ PPT.ptr.delete(e.pointerId); PPT.off.set(m,performance.now()); ppOff(m); } },true);
document.addEventListener("pointerdown",e=>{ if(page!=="pp") return; const k=e.target.closest&&e.target.closest("#ppKb [data-m]"); if(k){ PPT.ptr.set(e.pointerId,+k.dataset.m); PPT.on.set(+k.dataset.m,performance.now()); } },true);
// ---- lesson end: stars of P05, stickers, fails and the review (D18), fingering on after P07, the certificate after P14
{ const _fi=ppFinish; ppFinish=function(){ const id=PP.id, L=PP.L;
    if(PP.review){ ppClearTimers(); autoHelpHide(); const p=ppS(); if(p.rev) delete p.rev[id]; p.fail[id]=0; save(); PP.review=false; PP.bpmAdj=0; toast(t("ppRevOk")); addXP(10); ppGoPage("path"); return; }
    const want = L && L.stars ? L.stars() : null, prevSt=ppStarsOf(id); _fi.apply(this,arguments); const p=ppS(), d=p.done[id];
    if(want!=null && d){ const s=Math.min(want, PP.show?2:3); d.last=s; d.stars=Math.max(s,prevSt); PP.res.stars=s; }
    if(d && d.last===1) p.fail[id]=(p.fail[id]|0)+1;
    const prev=PP_IDS[PP_IDS.indexOf(id)-1], twoLow = d && d.last===1 && prev && p.done[prev] && p.done[prev].last===1;
    PP.revSug = !!(twoLow || (p.fail[id]|0)>=2); if(PP.revSug){ p.rev={...(p.rev||{}), [id]:Date.now()}; }
    if(L && L.sticker){ const sk=S.stickers&&typeof S.stickers==="object"?S.stickers:(S.stickers={}); if(!sk[L.sticker]){ sk[L.sticker]=Date.now(); PP.res.sticker=L.sticker; } }
    if(id==="p07" && (S.onb&&S.onb.level)!=="adv"){ S.settings.fing=true; }
    if(id==="p14" && ppAllDone()){ try{ ntfAdd({key:"pp-all", cat:"progress", type:"lvl", ti:t("ppCertT"), tx:t("ppCertLine")(ppStarSum()), act:{k:"learn",l:"ntfSee"}}); }catch(e){} PP.res.cert=true; addXP(30*PP_MULT); PP.res.xp+=30*PP_MULT; }
    save(); ppRender(); if(PP.res.cert) ppLater(()=>{ if(page==="pp" && PP.view==="bravo" && PP.id==="p14"){ PP.view="cert"; ppRender(); } },3500); }; }
function ppRevOn(id){ const r=((S.pp||{}).rev||{})[id]; return !!r && Date.now()-r<3*864e5; }
{ const _pd=ppDots; ppDots=function(ids){ let h=_pd.apply(this,arguments); ids.forEach(id=>{ if(ppRevOn(id)) h=h.replace('data-id="'+id+'"','data-id="'+id+'" data-rev="1"'); }); return h; }; }
function ppReview(id){ const L=ppLesson(id); if(!L) return; let s=L.steps.length-1; PP.review=true; PP.reviewNext=true; PP.bpmAdj=-10; ppStart(id,s,0); }
// ---- views: the lesson with the new widgets, the Play frame, the review card (D18), the certificate (D26)
{ const _rd=ppRender; ppRender=function(){ const P=$("ppPanel"); if(!P) return; if(PP.view==="cert"){ ppRenderCert(); return; } if(PP.view==="review"){ ppRenderReview(); return; }
    _rd.apply(this,arguments); const v=PP.view;
    if(v==="lesson" && PP.L){ const st=PP.L.steps[PP.step], mid=P.querySelector(".pp-mid"); if(mid && !$("ppWid")){ const w=document.createElement("div"); w.id="ppWid"; w.className="pp-wid"; mid.appendChild(w); }
      if(st.k==="song"){ const kw=P.querySelector(".pp-kbw"); kw.classList.add("pp-songw"); kw.innerHTML='<iframe id="ppFrame" title="'+esc(t("pp08Song"))+'" src="'+esc(ppSongSrc(st))+'"></iframe>'; $("ppKb")&&0;
        P.querySelector(".pp-mid .pp-k").textContent = st.watch ? t("ppWatch") : t("ppYourTurnN")(PP.step); ppSay(st.say); $("ppSub").textContent=st.sub;
        const ft=P.querySelector(".pp-foot"); if(st.watch){ ft.querySelector("#ppRestart")?.remove(); const g=document.createElement("span"); g.className="pp-gow"; g.innerHTML='<button class="pp-main" type="button" id="ppMain">'+esc(t("ppYourTurn"))+'</button>'+ppOrC(); const rp=document.createElement("button"); rp.className="btn"; rp.type="button"; rp.id="ppReplay"; rp.textContent=t("ppReplay"); ft.appendChild(rp); ft.appendChild(g); $("ppMain").onclick=()=>ppStep(PP.step+1); rp.onclick=()=>ppStep(PP.step); } }
      if(PP.L.hands && PP.id==="p13"){ const ft=P.querySelector(".pp-foot"), b=document.createElement("button"); b.className="btn"; b.type="button"; b.id="ppOneHand"; b.setAttribute("aria-pressed",String(!!PP.oneHand)); b.textContent=t("pp13One"); b.onclick=()=>{ PP.oneHand=!PP.oneHand; b.setAttribute("aria-pressed",String(PP.oneHand)); const it=PP.items[PP.ii]; if(it&&it.chord){ it.bassHit=null; } ppWid(); }; ft.insertBefore(b,ft.querySelector(".pp-push").nextSibling); }
      if(PP.L.rhythm && st.k==="ex" && PP.items.some(x=>x.beat)){ const ft=P.querySelector(".pp-foot"), x=document.createElement("span"); x.className="pp-tempo"; ft.insertBefore(x,ft.querySelector(".pp-push").nextSibling); ppTempoUI(); }
      ppWid(); ppPaint(); if(PP.id==="p02" && st.k==="watch") ppLater(()=>hint("star",P.querySelector(".pp-star"),t("hintTxt").star),900); }
    if(v==="open" && PP.open){ const id=PP.open.id, c=P.querySelector(".pp-opencard .pp-meta"); const notes=[]; if(ppSmall()) notes.push(t("ppSmallKb")(ppKbN()));
      if(ppMid() && ["p10","p11","p12","p13","p14"].includes(id)) notes.push(id==="p13"||id==="p14"?t("pp13Mic"):t("ppMicChord")); if(ppMid() && ["p09","p12","p14"].includes(id)) notes.push(t("pp09Mic"));
      if(c && notes.length){ const n=document.createElement("p"); n.className="pp-onote"; n.textContent=notes.join(" "); c.after(n); } }
    if(v==="bravo"){ const L=PP.L, r=PP.res||{}, card=P.querySelector(".pp-bravo"); if(card && L){ const can=card.querySelector(".pp-can");
        if(L.extra){ const x=document.createElement("div"); x.className="pp-xw"; x.innerHTML=L.extra(); can.after(x); if($("ppReplayMe")) $("ppReplayMe").onclick=ppReplayMine; if($("ppShare8")) $("ppShare8").onclick=async()=>{ const file=await shareCard(t("ppName"),"♪",t("pp08ShareT"),"#1f7a52"); shareIt({text:t("pp08ShareT"),url:refLink(),file}); }; }
        if(r.sticker){ const s=document.createElement("p"); s.className="pp-stk"; s.innerHTML='<span aria-hidden="true">'+ppStkSvg(r.sticker)+'</span><b>'+esc(t("ppStkGot")(t("ppStk")[r.sticker]))+'</b>'; card.querySelector(".pp-stars").after(s); }
        if(PP.revSug){ const a=$("ppAgain")||document.createElement("button"); a.className="pp-link"; a.type="button"; a.id="ppAgain"; a.textContent=t("ppRevBtn"); a.onclick=()=>{ PP.view="review"; ppRender(); }; if(!a.parentNode) card.querySelector(".pp-blinks").prepend(a); }
        if(r.cert){ const m=$("ppMain"); m.innerHTML=esc(t("ppCertBtn")); m.onclick=()=>{ PP.view="cert"; ppRender(); }; }
        if(PP.lblNew) ppLater(()=>hint("labels",card.querySelector(".pp-stars"),t("hintTxt").labels),700); } } }; }
function ppTempoUI(){ const x=document.querySelector("#ppPanel .pp-tempo"); if(!x) return; const it=PP.items.find(i=>i.beat); let b=60; try{ b=it.beat(false).bpm; }catch(e){}
  x.innerHTML='<button class="btn" type="button" data-d="-5" aria-label="−">−</button><b class="mono">'+esc(t("ppTempo")(b))+'</b><button class="btn" type="button" data-d="5" aria-label="+">+</button><button class="btn" type="button" id="ppClickT" aria-pressed="'+(PP.click!==false)+'">'+esc(t("ppClick"))+'</button>';
  x.querySelectorAll("[data-d]").forEach(k=>k.onclick=()=>{ PP.bpmAdj=Math.max(-30,Math.min(30,(PP.bpmAdj|0)+ +k.dataset.d)); ppTempoUI(); const it2=PP.items[PP.ii]; if(it2&&it2.beat&&(!it2.choose||it2.started)){ ppClearTimers(); it2.retried=false; ppBeatItem(it2); } });
  $("ppClickT").onclick=()=>{ PP.click=PP.click===false; $("ppClickT").setAttribute("aria-pressed",String(PP.click!==false)); }; }
function ppRenderReview(){ const P=$("ppPanel"), id=PP.id;
  P.innerHTML='<div class="pp-lesson pp-dim"><div class="pp-mid"></div><div class="pp-kbw"><div class="kbd pp-kb" id="ppKb" aria-hidden="true">'+ppKbHTML()+'</div></div>'
    +'<div class="pp-card pp-rev" role="dialog" aria-labelledby="ppRT"><span class="pp-badge big">'+ppSvg(PP_IDS.indexOf(id))+'</span><h2 id="ppRT">'+esc(t("ppRevT"))+'</h2><p>'+esc(t("ppRevS"))+'</p>'
    +'<button class="pp-main" type="button" id="ppMain">'+esc(t("ppRevYes"))+'</button>'+ppOrC()+'<button class="pp-link" type="button" id="ppRevNo">'+esc(t("ppRevNo"))+'</button></div></div>';
  $("ppMain").onclick=()=>ppReview(id); $("ppRevNo").onclick=()=>{ PP.revSug=false; PP.view="bravo"; ppRender(); }; }
function ppStkSvg(k){ const c={lynx:"#3cc8f0",melody:"#ff5a6e",accomp:"#ffd23f",pp:"#3ddc84"}[k]||"#ffd23f";
  return '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="21" fill="'+c+'"/><circle cx="24" cy="24" r="16" fill="none" stroke="#fff" stroke-width="2.5" stroke-dasharray="3 4"/><path d="M24 13l3.2 6.6 7.3 1-5.3 5.1 1.3 7.2L24 29.5l-6.5 3.4 1.3-7.2-5.3-5.1 7.3-1z" fill="#fff"/></svg>'; }
// D26: certificate (shareable square image) and what's next
function ppRenderCert(){ const P=$("ppPanel"), p=S.pp||{}, stars=ppStarSum(), d0=p.start||Date.now(), d1=p.end||Date.now(), days=Math.max(1,Math.round((d1-d0)/864e5)+1), name=(typeof myNameRaw==="function"&&myNameRaw())||"", dt=new Date(d1).toLocaleDateString(S.settings.lang==="fr"?"fr-FR":"en-GB",{day:"numeric",month:"long",year:"numeric"}), T=t("ppCertTiles"), guest=!(typeof user!=="undefined"&&user);
  P.innerHTML='<div class="pp-cert"><div class="pp-ch"><span class="pp-badge big">'+PP_FOOT+'</span><div><h2>'+esc(t("ppCertT"))+'</h2><p>'+esc(t("ppCertSub")(14,days))+'</p></div></div>'
    +'<div class="pp-cbody"><div class="pp-cleft"><div class="pp-cc"><small>'+esc(t("ppCertK"))+'</small><b class="pp-cn">'+esc(t("ppName"))+'</b><span class="pp-medal" aria-hidden="true">'+ppStkSvg("pp")+'</span>'+(name&&!guest?'<b class="pp-cw">'+esc(name)+'</b>':'<b class="pp-cw"></b>')+'<span>'+esc(t("ppCertLine")(stars))+'</span><small class="pp-cd">'+esc(dt)+'</small><span class="pp-clogo">'+$("homeLink").querySelector("svg").outerHTML+'<b>Piano Challenges</b></span></div>'
    +'<div class="pp-cbtn"><button class="pp-main" type="button" id="ppCShare">'+esc(t("ppCertShare"))+'</button><button class="btn" type="button" id="ppCSave">'+esc(t("ppCertSave"))+'</button></div>'+(guest?'<button class="pp-link" type="button" id="ppCAcct">'+esc(t("ppCertGuest"))+'</button>':'')+'</div>'
    +'<div class="pp-cnext"><h3>'+esc(t("ppCertNext"))+'</h3><div class="pp-ctiles" id="ppCTiles"></div></div></div></div>';
  const box=$("ppCTiles"), go=[()=>{ openPage("learn"); setTimeout(()=>{ const b=$("secTabs")&&$("secTabs").querySelector('[data-v="chords"]'); if(b) b.click(); },80); },()=>openPage("free"),()=>openPage("games"),()=>{ try{ mdPillClick(); }catch(e){} }];
  [["chords","#c9463c"],["moon","#7a5bf5"],["games","#1f7a52"],["learn","#2c56d6"]].slice(0,ppInp()==="screen"?4:3).forEach(([o,c],i)=>box.appendChild(tile({color:c,obj:o,kick:T[i][0],title:T[i][1],desc:T[i][2],btn:T[i][3],onOpen:go[i]})));
  const img=async()=>shareCard(t("ppCertK")+" · "+(name||"Piano Challenges"),t("ppName"),t("ppCertLine")(stars)+" · "+dt,"#1f7a52");
  $("ppCShare").onclick=async()=>{ const file=await img(); shareIt({text:t("ppCertT"),url:refLink(),file}); };
  $("ppCSave").onclick=async()=>{ const file=await img(); if(!file) return; const a=document.createElement("a"); a.href=URL.createObjectURL(file); a.download="premiers-pas.png"; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500); };
  if($("ppCAcct")) $("ppCAcct").onclick=()=>authOpen("signup"); }
// LEARN: the path done → one line « First steps ✓ 14/14 · N stars » + the certificate (another module can replace the map with its own route)
{ const _rm=ppRenderMap; ppRenderMap=function(){ _rm.apply(this,arguments); const el=$("ppMap"); if(!el) return;
    if(ppAllDone()){ el.classList.add("fold","alldone"); el.innerHTML='<button class="pp-mh" type="button" id="ppMapOpen"><span class="pp-badge">'+PP_FOOT+'</span><span class="pp-mt"><b>'+esc(t("ppAllDoneL")(ppStarSum()))+'</b></span></button><button class="pp-main sm" type="button" id="ppMapGo">'+esc(t("ppCertBtn"))+'</button>';
      $("ppMapOpen").onclick=()=>ppGoPage("path"); $("ppMapGo").onclick=()=>{ PP.view="cert"; if(page!=="pp") openPage("pp"); else ppRender(); }; return; }
    if(!el.classList.contains("fold") && page==="learn") setTimeout(()=>hint("map",$("ppMap"),t("hintTxt").map),800); }; }
{ const _rr=ppRenderResume; ppRenderResume=function(){ _rr.apply(this,arguments); const el=$("ppResume"); if(el && !el.hidden && page==="hub") setTimeout(()=>{ hint("resume",el,t("hintTxt").resume); if(ppDoneN()>0){ const pill=[$("inChip"),$("mbMidi")].find(x=>x&&x.offsetParent); hint("inp",pill,t("hintTxt").inp); } },900); }; }
// ---- bubbles (D19): one at a time, never while a note is awaited, first time only (S.hints.seen), 3 per session for a beginner, none for « I already play »
const HB={cur:null, q:[], n:0, lastAt:0, tm:0};
function hintS(){ const o=S.hints&&typeof S.hints==="object"&&!Array.isArray(S.hints)?S.hints:{}; S.hints=o; if(!o.seen||typeof o.seen!=="object") o.seen={}; return o; }
function hintMark(k){ hintS().seen[k]=Date.now(); save(); }
function hint(k, el, txt){ const H=hintS(); if(H.off || H.seen[k] || !el || !txt) return; if((S.onb&&S.onb.level)==="adv") return; if(HB.cur&&HB.cur.k===k || HB.q.some(x=>x.k===k)) return;
  HB.q.push({k, el, txt}); hintPump(); }
const hintBusy = () => FN.on || (typeof LV!=="undefined"&&LV.on) || anyWin() || document.body.classList.contains("gate-on") || (page==="pp" && PP.view==="lesson" && PP.L && PP.L.steps[PP.step] && PP.L.steps[PP.step].k!=="watch");
function hintPump(){ clearTimeout(HB.tm); if(HB.cur || !HB.q.length) return; if(HB.n>=3){ HB.q=[]; return; }
  if(hintBusy() || Date.now()-HB.lastAt<4000){ HB.tm=setTimeout(hintPump,1000); return; }
  const h=HB.q.shift(); if(!h.el.isConnected || !h.el.offsetParent || hintS().seen[h.k]){ hintPump(); return; } hintShow(h); }
function hintShow(h){ const b=document.createElement("div"); b.className="hint-bubble"; b.setAttribute("role","status"); b.innerHTML='<p>'+esc(h.txt)+'</p><button type="button" class="hb-ok">'+esc(t("hintOk"))+'</button><i class="hb-ar" aria-hidden="true"></i>';
  document.body.appendChild(b); HB.cur={...h, b}; HB.n++; b.querySelector(".hb-ok").onclick=()=>hintClose(true); hintPlace(); }
function hintPlace(){ const c=HB.cur; if(!c) return; const b=c.b, r=c.el.getBoundingClientRect(), W=innerWidth, H=innerHeight, bw=Math.min(320,W-24);
  if(!c.el.isConnected || !c.el.offsetParent){ hintClose(false); return; }
  b.style.width=bw+"px"; if(W<640){ b.classList.add("bar"); b.style.left=""; b.style.top=""; return; }
  const kb=c.el.closest&&c.el.closest(".pp-kbw,.kbd-wrap,.fn-kb"), bh=b.offsetHeight, below=!kb && r.bottom+12+bh<H, top=below?r.bottom+12:Math.max(8,r.top-12-bh), left=Math.max(12,Math.min(W-bw-12,r.left+r.width/2-bw/2));
  b.style.left=left+"px"; b.style.top=top+"px"; b.classList.toggle("up",!below); const ar=b.querySelector(".hb-ar"); ar.style.left=Math.max(14,Math.min(bw-14,r.left+r.width/2-left))+"px"; }
function hintClose(seen){ const c=HB.cur; if(!c) return; HB.cur=null; c.b.remove(); HB.lastAt=Date.now(); if(seen) hintMark(c.k); setTimeout(hintPump,600); }
document.addEventListener("pointerdown",e=>{ if(HB.cur && !HB.cur.b.contains(e.target)) hintClose(true); },true);
addEventListener("resize",()=>{ if(HB.cur) hintPlace(); });
{ const _op=openPage; openPage=function(){ if(HB.cur) hintClose(false); return _op.apply(this,arguments); }; }
setInterval(()=>{ if(HB.cur && hintBusy()) { const c=HB.cur; HB.cur=null; c.b.remove(); HB.n--; HB.q.unshift({k:c.k,el:c.el,txt:c.txt}); } if(HB.q.length) hintPump(); },1000);
// ---- Settings: labels (D20) and « See the explanations again » (D19)
{ const f=$("goalField"); if(f){ const d=document.createElement("div"); d.className="field"; d.id="lblField"; f.after(d); } const ta=$("tourAgain"); if(ta){ const b=document.createElement("button"); b.className="btn"; b.type="button"; b.id="hintAgain"; ta.parentNode.appendChild(document.createTextNode(" ")); ta.parentNode.appendChild(b); b.onclick=()=>{ hintS().seen={}; hintS().off=false; HB.n=0; save(); toast(t("hintAgainOk")); }; } }
function lblRenderSet(){ const d=$("lblField"); if(!d) return; const L=lblS(), cur=L.mode||(S.settings.notation==="fr"?"fr":"en"), modes=["none","fr","en","both"];
  d.innerHTML='<span>'+esc(t("lblT"))+' <small class="mono">'+esc(t("lblCount")(lblGone()))+'</small></span><div class="seg" id="segLbl">'+modes.map((v,i)=>'<button type="button" data-v="'+v+'" aria-pressed="'+(cur===v)+'"'+(cur===v?' class="on"':'')+'>'+esc(t("lblModes")[i])+'</button>').join("")+'</div>'
    +'<label class="check"><input type="checkbox" id="optLblFade"'+(L.fade!==false?' checked':'')+'> <span>'+esc(t("lblFadeOpt"))+'</span></label>';
  d.querySelectorAll("#segLbl button").forEach(b=>b.onclick=()=>{ lblS().mode=b.dataset.v; lblS().at=Date.now(); save(); lblRenderSet(); });
  $("optLblFade").onchange=e=>{ lblS().fade=e.target.checked; lblS().at=Date.now(); save(); };
  const ha=$("hintAgain"); if(ha) ha.textContent=t("hintAgain"); }
{ const _rs=renderSettings; renderSettings=function(){ const r=_rs.apply(this,arguments); try{ lblRenderSet(); }catch(e){} return r; }; }
// ---- sync between devices: labels (max per note, settings most recent), bubbles seen (union), stickers (union), reviews and best time
{ const _ms=mergeState; mergeState=function(local, cloud){ const r=_ms.apply(this,arguments); const isO=x=>x&&typeof x==="object"&&!Array.isArray(x), c=isO(cloud)?cloud:{}, M=r.merged;
    const la=isO(local.lbl)?local.lbl:null, lb=isO(c.lbl)?c.lbl:null; if(la||lb){ const nw=!lb?la:!la?lb:(+lb.at||0)>(+la.at||0)?lb:la, m=Array.from({length:12},(_,i)=>Math.max(+((la&&la.m||[])[i])||0,+((lb&&lb.m||[])[i])||0));
      M.lbl={...(lb||{}), ...(la||{}), mode:nw.mode, fade:nw.fade, at:nw.at, m, told:{...((lb&&lb.told)||{}), ...((la&&la.told)||{})}, gone:{...((lb&&lb.gone)||{}), ...((la&&la.gone)||{})}}; }
    const ha=isO(local.hints)?local.hints:null, hb=isO(c.hints)?c.hints:null; if(ha||hb) M.hints={...(hb||{}), ...(ha||{}), seen:{...((hb&&hb.seen)||{}), ...((ha&&ha.seen)||{})}};
    const sa=isO(local.stickers)?local.stickers:null, sb=isO(c.stickers)?c.stickers:null; if(sa||sb){ const o={...(sb||{})}; Object.entries(sa||{}).forEach(([k,v])=>{ o[k]=o[k]?Math.min(+o[k],+v):v; }); M.stickers=o; }
    if(isO(M.pp)){ const pa=isO(local.pp)?local.pp:{}, pb=isO(c.pp)?c.pp:{}; const rv={...(pb.rev||{}), ...(pa.rev||{})}; if(Object.keys(rv).length) M.pp.rev=rv; const b5=[pa.best5,pb.best5].filter(x=>+x>0); if(b5.length) M.pp.best5=Math.min(...b5);
      const e=[pa.end,pb.end].filter(x=>+x>0); if(e.length) M.pp.end=Math.min(...e); }
    r.changed=JSON.stringify(M)!==JSON.stringify(local); return r; }; }
// ---- first launch, remade (D2 → D3 → D4): what you play on, then « play a C », then the level, asked after the first note
FN.st="hw"; FN.miss=0;
const FN_HW_SVG=['<svg viewBox="0 0 64 48" aria-hidden="true"><path d="M44 4c0 6 6 6 6 12v6" fill="none" stroke="#3cc8f0" stroke-width="3" stroke-linecap="round"/><rect x="4" y="20" width="56" height="22" rx="5" fill="#7a5bf5"/><rect x="8" y="27" width="48" height="12" rx="2" fill="#fff"/>'+[0,1,2,3,4,5,6,7].map(i=>'<rect x="'+(9.5+i*6)+'" y="27" width="1" height="12" fill="#7a5bf5"/>').join("")+[0,1,3,4,5].map(i=>'<rect x="'+(13+i*6)+'" y="27" width="3" height="7" fill="#1b1838"/>').join("")+'<circle cx="11" cy="23.5" r="1.5" fill="#ffd23f"/><circle cx="16" cy="23.5" r="1.5" fill="#3ddc84"/></svg>',
  '<svg viewBox="0 0 64 48" aria-hidden="true"><rect x="6" y="6" width="34" height="30" rx="3" fill="#a0673a"/><rect x="9" y="9" width="28" height="11" rx="2" fill="#c08550"/><rect x="5" y="22" width="36" height="6" rx="1" fill="#fff"/>'+[0,1,2,3,4,5,6,7].map(i=>'<rect x="'+(8+i*4.2)+'" y="22" width="1.6" height="3.6" fill="#1b1838"/>').join("")+'<rect x="8" y="36" width="3" height="6" fill="#7a4a26"/><rect x="35" y="36" width="3" height="6" fill="#7a4a26"/><path d="M46 16a12 12 0 0 1 0 16M51 12a18 18 0 0 1 0 24M56 8a24 24 0 0 1 0 32" fill="none" stroke="#3ddc84" stroke-width="2.6" stroke-linecap="round"/></svg>',
  '<svg viewBox="0 0 64 48" aria-hidden="true"><rect x="8" y="4" width="48" height="40" rx="6" fill="none" stroke="#a996ff" stroke-width="3"/><rect x="14" y="22" width="36" height="15" rx="2" fill="#4b438f"/>'+[0,1,2,3,4,5].map(i=>'<rect x="'+(14+i*6)+'" y="22" width="5.4" height="15" rx="1" fill="'+(i?"#6a5fc0":"#ff5a6e")+'"/>').join("")+[0,1,3,4].map(i=>'<rect x="'+(18.5+i*6)+'" y="22" width="3" height="8" fill="#1b1838"/>').join("")+'<path d="M18 46v-9a2 2 0 0 1 4 0v4l6 1c2 .4 3 2 2.6 4l-.6 2z" fill="#ffd9b8"/></svg>'];
const fnNoMidi = () => !navigator.requestMIDIAccess && !window.__nativeMidi;
fnOpen=function(){ let g=$("gate"); if(!g){ g=document.createElement("div"); g.id="gate"; g.className="gate"; g.setAttribute("role","dialog"); g.setAttribute("aria-modal","true"); document.body.appendChild(g); }
  FN.on=true; FN.done=false; FN.wrong=""; FN.miss=0; FN.st="hw"; FN.how="screen"; FN.level="debut"; FN.micErr=false; FN.t0=Date.now();
  document.body.classList.add("gate-on"); startInert(); g.hidden=false; fnRender();
  // a keyboard already plugged in: skip the choice (D3 says its name)
  if(fnModes().includes("midi") && !mobileWebNow() && !fnNoMidi()) enableMidi(true).then(()=>{ if(FN.on && FN.st==="hw" && fnMidiName()){ FN.how="midi"; FN.st="c"; FN.t0=Date.now(); fnRender(); } }).catch(()=>{}); };
fnRender=function(){ const g=$("gate"); if(!g||!FN.on) return; const mark=$("homeLink").querySelector("svg").outerHTML, NN=S.settings.notation==="fr"?PC_FR:PC_EN, C=NN[0];
  const top=k=>'<div class="fn-top"><span class="fn-step">'+esc(k)+'</span><span class="fn-tr"><button class="fn-skip" type="button" id="fnLogin">'+esc(t("ppHasAcct"))+'</button><button class="fn-skip" type="button" id="fnSkip">'+esc(t("fnSkip"))+'</button></span></div>';
  let body="";
  if(FN.st==="hw"){ const H=t("ppHw");
    body=top(t("ppHwKick"))+'<h2 id="fnH">'+esc(t("ppHello"))+'</h2><p class="fn-q">'+esc(t("ppHwQ"))+'</p><div class="fn-hw">'+["midi","mic","screen"].map((v,i)=>{ if(v==="mic" && !fnModes().includes("mic")) return ""; const sub = v==="midi"&&(fnNoMidi()||mobileWebNow()&&!document.documentElement.classList.contains("native")) ? t("ppHwApp") : H[i][1];
      return '<button type="button" class="fn-hwc" data-v="'+v+'"><span class="fn-hwi">'+FN_HW_SVG[i]+'</span><span><b>'+esc(H[i][0])+'</b><small>'+esc(sub)+'</small></span><i aria-hidden="true">›</i></button>'; }).join("")+'</div>'
      +'<div class="fn-foot"><span></span><button type="button" id="fnLang">'+(S.settings.lang==="fr"?"EN":"FR")+'</button></div>'; }
  else if(FN.st==="c"){ const IN=t("ppIn"), nm=fnMidiName();
    const side = FN.how==="midi" ? (nm?'<b class="fn-okk">'+esc(t("ppD3Midi")(nm))+'</b><small>'+esc(t("ppD3MidiS"))+'</small>':'<b>'+esc(t("ppD3MidiWait"))+'</b><button type="button" class="fn-lnk" id="fnLater">'+esc(t("ppD3Later"))+'</button>')
      : FN.how==="mic" ? (FN.micErr?'<small>'+esc(t("ppD3MicNo"))+'</small><button type="button" class="fn-lnk" id="fnLater">'+esc(t("ppD3ScreenB"))+'</button>':'<small>'+esc(t("ppD3Mic"))+'</small>') : '<small>'+esc(t("ppD3Screen"))+'</small>';
    const W=[0,2,4,5,7,9,11], keys=[0,1].map(o=>W.map(pc=>'<button type="button" class="w" data-m="'+(60+12*o+pc)+'">'+esc(NN[pc])+'</button>').join("")).map((h,o)=>o?'<span class="fn-oct2">'+h+'</span>':h).join("");
    const blk=[0,1].map(o=>[1,3,6,8,10].map(pc=>'<button type="button" class="b'+(o?' fn-o2':'')+'" data-m="'+(60+12*o+pc)+'" data-wi="'+(W.indexOf(pc-1)+o*7)+'" aria-label="'+esc(NN[pc])+'"></button>').join("")).join("");
    body=top(t("ppHwKick"))+'<div class="fn-d3"><div class="fn-tip"><svg viewBox="0 0 120 80" aria-hidden="true"><text x="78" y="10" text-anchor="middle">'+esc(t("ppD3Two"))+'</text><rect x="10" y="18" width="32" height="58" rx="4" fill="var(--note-0)"/><rect x="44" y="18" width="32" height="58" rx="4" fill="#4b438f"/><rect x="78" y="18" width="32" height="58" rx="4" fill="#4b438f"/><rect x="31" y="18" width="20" height="34" rx="3" fill="#15122e"/><rect x="67" y="18" width="20" height="34" rx="3" fill="#15122e"/><path d="M22 2v20M16 16l6 7 6-7" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/><text x="24" y="70" class="c">'+esc(C)+'</text></svg><b>'+esc(t("ppFindC"))+'</b></div>'
      +'<div class="fn-d3c"><h2 id="fnH">'+esc(t("ppPlayC")(C))+'</h2><span class="fn-ring'+(FN.done?' ok':'')+'"><b>'+esc(C)+'</b></span></div>'
      +'<div class="fn-d3s"><span class="fn-pill">'+esc(IN[FN.how]||IN.screen)+'</span>'+side+'<button type="button" class="fn-lnk" id="fnBack">'+esc(t("ppD3Change"))+'</button></div></div>'
      +'<div class="fn-prompt'+(FN.done?' ok':FN.wrong?' bad':'')+(FN.miss>=3&&!FN.done?' this':'')+'" id="fnPrompt" role="status" aria-live="polite"><span><b>'+esc(FN.done?t("ppFirstC")(C):FN.miss>=3?t("ppD3This"):FN.wrong?t("ppThatIs")(FN.wrong):t("ppPlayC")(C))+'</b><small>'+esc(FN.wrong?t("ppD3Wrong")(FN.wrong):FN.nothing?t("ppD3Nothing"):"")+'</small></span></div>'
      +(FN.how==="screen"||FN.how==="mic"||!nm?'<div class="fn-kb" id="fnKb">'+keys+blk+'</div>':'<div class="fn-kb fn-kbm" id="fnKb">'+keys+blk+'</div>'); }
  else { const lv=t("ppLvl"), ls=t("ppLvlS");
    body=top(t("ppHwKick"))+'<div class="fn-d4"><span class="fn-ck" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><h2 id="fnH">'+esc(t("ppFirstC")(C))+'</h2><p>'+esc(t("ppFirstCS"))+'</p><h3>'+esc(t("ppNew"))+'</h3>'
      +'<div class="fn-lv fn-lv4">'+["debut","notes","adv"].map((v,i)=>'<button type="button" data-v="'+v+'"'+(i?'':' id="fnGo" class="pri"')+' aria-pressed="'+(FN.level===v)+'"><b>'+esc(lv[i])+'</b><small>'+esc(ls[i])+'</small></button>').join("")+'</div>'
      +(FN.how==="midi"?'<p class="fn-mline">'+esc(t("ppLvlMidi")(C))+'</p>':'')+'</div>'; }
  g.innerHTML='<div class="fn-card'+(FN.st==="hw"?'':' fn-full')+'"><div class="fn-hero"><span class="fn-logo">'+mark+'<b>Piano Challenges</b></span><h1>'+t("ppHeroT")+'</h1><p>'+esc(t("ppHeroP"))+'</p>'
    +'<div class="fn-pills">'+t("ppHeroPills").map(x=>'<span>'+esc(x)+'</span>').join("")+'</div><span class="fn-obj" aria-hidden="true">'+OBJ.learn()+'</span></div><div class="fn-play fn-st-'+FN.st+'">'+body+'</div></div>';
  g.setAttribute("aria-labelledby","fnH");
  $("fnSkip").onclick=fnSkip; $("fnLogin").onclick=()=>{ FN.on=false; if(micOn&&FN.how!=="mic") micStop(); GATE.mode="login"; gateOpen(); };
  if($("fnLang")) $("fnLang").onclick=()=>{ document.querySelector('#langSeg [data-v="'+(S.settings.lang==="fr"?"en":"fr")+'"]').click(); fnRender(); };
  g.querySelectorAll(".fn-hwc").forEach(b=>b.onclick=()=>fnPick(b.dataset.v));
  if($("fnBack")) $("fnBack").onclick=()=>{ FN.st="hw"; FN.wrong=""; FN.miss=0; fnRender(); };
  if($("fnLater")) $("fnLater").onclick=()=>{ FN.how="screen"; FN.micErr=false; if(micOn) micStop(); fnRender(); };
  g.querySelectorAll(".fn-lv4 button").forEach(b=>b.onclick=()=>{ FN.level=b.dataset.v; fnGo(); });
  const kb=$("fnKb"); if(kb){ const whites=[...kb.querySelectorAll(".w")].filter(w=>w.offsetParent!==null), n=whites.length||7;
    kb.querySelectorAll(".b").forEach(b=>{ const wi=+b.dataset.wi; if(wi>=n){ b.hidden=true; return; } b.style.left="calc("+((wi+1)/n*100)+"% - "+(100/n*.32)+"%)"; b.style.width=(100/n*.62)+"%"; });
    if(!FN.done) kb.querySelectorAll('[data-m="60"],[data-m="72"]').forEach(k=>k.classList.add(FN.miss>=3&&k.dataset.m==="60"?"fn-this":"fn-hint"));
    kb.querySelectorAll("button").forEach(k=>k.addEventListener("pointerdown",e=>{ e.preventDefault(); const m=+k.dataset.m; try{ audio(); tone(m,0,.7,.28); }catch(er){} fnNote(m, k); }));
    kb.addEventListener("contextmenu",e=>e.preventDefault()); }
  clearTimeout(FN.nt); if(FN.st==="c" && FN.how==="midi" && !FN.done) FN.nt=setTimeout(()=>{ if(FN.on&&FN.st==="c"&&!FN.done&&!FN.wrong){ FN.nothing=true; fnRender(); } },20000);
  clearInterval(FN.pi); if(FN.st==="c" && FN.how==="midi" && !fnMidiName()) FN.pi=setInterval(()=>{ if(!FN.on||FN.st!=="c"){ clearInterval(FN.pi); return; } if(fnMidiName()){ clearInterval(FN.pi); fnRender(); } },1000); };
function fnPick(v){ FN.wrong=""; FN.miss=0; FN.nothing=false; FN.t0=Date.now();
  if(v==="midi"){ if(fnNoMidi() || (mobileWebNow()&&!document.documentElement.classList.contains("native"))){ FN.how="screen"; FN.st="c"; fnRender(); toast(t("ppHwApp")); return; }
    FN.how="midi"; FN.st="c"; fnRender(); enableMidi(true).then(()=>fnRender()).catch(()=>{}); if(micOn) micStop(); return; }
  if(v==="mic"){ FN.how="mic"; FN.st="c"; FN.micErr=false; fnRender(); try{ if(!micOn) $("micBtn").click(); }catch(e){} setTimeout(()=>{ if(FN.on&&FN.how==="mic"&&!micOn){ FN.micErr=true; fnRender(); } },2500); return; }
  FN.how="screen"; FN.st="c"; if(micOn) micStop(); fnRender(); }
fnNote=function(m, el){ if(!FN.on) return; const pc=md12(m);
  if(FN.st==="hw"){ if(pc===0){ FN.how=el?"screen":micOn?"mic":"midi"; FN.st="c"; } else return; } // a note on the choice screen: that is the input
  if(FN.done){ if(pc===0 && el===undefined) fnGo(); return; } // MIDI or the mic: a second C carries on (the First steps)
  const kb=$("fnKb"), k = el || (kb && (kb.querySelector('[data-m="'+m+'"]') || kb.querySelector('[data-m="'+(60+pc)+'"]')));
  if(pc===0){ FN.done=true; FN.wrong=""; FN.nothing=false; fnRender(); const k2=$("fnKb")&&$("fnKb").querySelector('[data-m="'+(m>=72&&m<84?72:60)+'"]'); if(k2) k2.classList.add("fn-good");
    try{ confetti($("gate").querySelector(".fn-card"), k2||$("fnPrompt"), 60, 1200); }catch(e){}
    setTimeout(()=>{ if(FN.on && FN.done && FN.st==="c"){ FN.st="lvl"; fnRender(); setTimeout(()=>$("fnGo")&&$("fnGo").focus(),30); } },600); return; }
  FN.miss++; FN.wrong=(S.settings.notation==="fr"?PC_FR:PC_EN)[pc]; fnRender(); const k3=$("fnKb")&&($("fnKb").querySelector('[data-m="'+m+'"]')||$("fnKb").querySelector('[data-m="'+(60+pc)+'"]'));
  if(k3){ k3.classList.add("fn-bad"); setTimeout(()=>k3.classList.remove("fn-bad"),320); } };
{ const _go=fnGo; fnGo=function(){ if(FN.level==="adv"){ fnApply(); fnClose(); setInput(FN.how, FN.how!=="screen"); openPage("hub"); return; } return _go.apply(this,arguments); }; }
{ const _fc=fnClose; fnClose=function(){ clearTimeout(FN.nt); clearInterval(FN.pi); return _fc.apply(this,arguments); }; }
/* ==== fin Parcours 2-3 ==== */

