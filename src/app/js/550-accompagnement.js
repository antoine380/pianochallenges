// fragment de l'IIFE principale — ordre 550, voir src/app/README.md
/* ==== Accompagnement (L7, étape 4) ==== */
// LEARN « Accompaniment »: a sequencer grid of 2 rows × 8 cells (6 in 3/4): the top row = the right hand plays the chord, the bottom row =
// the left hand plays the 1, 5 or 8 of the chord. Patterns are our own (7 styles, difficulty 1 to 3). Page "acc" (#accPanel), views
// "setup" (start screen), "play" (grid, cursor, split keyboard), "end" (stars, XP, record). Wait mode: the cursor waits on each cell;
// rhythm mode: the cursor runs at the tempo, with a count-in and a metronome, each cell graded ±80 ms (perfect) / ±160 ms (ok), widened
// by midiLat() when it exists. A note is the left hand under the split (middle C, moved for a small keyboard via S.midi.hw.lo/hi).
// State: S.settings.acc {style,pat:{style:id},prog,key,bpm,mode,up,metro,guide} (this device), S.acc {v,best:{id:{st,bpm,pct,n,at}}} (merged).
// rh: "x" = the chord, ">" = the next bar's chord (anticipation), "." = nothing; lh: "1" / "5" / "8" of the chord, "." = nothing.
const ACC_ST=[
  {id:"ballad", m:4, pats:[["ballad1",1,"x.......","1.......",80],["ballad2",2,"x...x...","1...5...",85],["ballad3",3,"..x...x.","1.5.8.5.",90]]},
  {id:"pop",    m:4, pats:[["pop1",1,"x.x.x.x.","1.......",100],["pop2",2,"x..x.xx.","1...5.8.",100],["pop3",3,"x.xx.xx.","1..5..8.",110]]},
  {id:"waltz",  m:3, pats:[["waltz1",1,"..x.x.","1.....",90],["waltz2",2,"..x.x.","1.5.8.",100],["waltz3",3,"...x.x","158...",100]]},
  {id:"blues",  m:4, sw:1, pats:[["blues1",1,"..x...x.","1...5...",90],["blues2",2,"x...x...","1.5.8.5.",100],["blues3",3,".x...x.x","1.5.8.5.",110]]},
  {id:"latin",  m:4, pats:[["latin1",2,"..x...x.","1..5..8.",90],["latin2",3,".xx..xx.","1..5..8.",100]]},
  {id:"gospel", m:4, pats:[["gospel1",2,"x..xx..x","1...8...",80],["gospel2",3,"x.xx.x.>","1..5.8..",90]]},
  {id:"bossa",  m:4, pats:[["bossa1",2,"..x..x..","1..55...",90],["bossa2",3,"x..x...>","1..55...",100]]}];
const ACC_PATS={}; ACC_ST.forEach(s=>s.pats.forEach(([id,d,rh,lh,tg],i)=>{ ACC_PATS[id]={id,d,rh,lh,tg,n:i+1,st:s.id,m:s.m,sw:!!s.sw}; }));
const ACC_IDS=Object.keys(ACC_PATS), ACC_COL="#1f7a52";
const ACC={view:"setup", run:null, res:null, lang:"", src:null, gkey:"", tm:[]};
const ACC_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 12h18M9 4v16M15 4v16"/><circle cx="6" cy="8" r="1.2" fill="currentColor"/><circle cx="18" cy="16" r="1.2" fill="currentColor"/></svg>';
function accCfg(){ const s=S.settings; let c=s.acc; if(!c||typeof c!=="object"||Array.isArray(c)) c=s.acc={};
  if(!ACC_ST.some(x=>x.id===c.style)) c.style="ballad";
  if(!c.pat||typeof c.pat!=="object"||Array.isArray(c.pat)) c.pat={};
  ACC_ST.forEach(st=>{ const p=ACC_PATS[c.pat[st.id]]; if(!p||p.st!==st.id) c.pat[st.id]=st.pats[0][0]; });
  if(!PROG[c.prog]) c.prog="p145";
  const keys=TONICS[PROG[c.prog].scale]; if(!keys.includes(c.key)) c.key=keys[0];
  c.bpm=Math.max(60,Math.min(120,Math.round((+c.bpm||0)/5)*5||80));
  if(c.mode!=="wait"&&c.mode!=="rhythm") c.mode = (S.onb&&["simple","adv"].includes(S.onb.level)) ? "rhythm" : "wait"; // beginners: wait mode
  ["up","metro","guide"].forEach(k=>{ if(typeof c[k]!=="boolean") c[k]=true; });
  return c; }
function accS(){ let o=S.acc; if(!o||typeof o!=="object"||Array.isArray(o)) o=S.acc={}; o.v=1; if(!o.best||typeof o.best!=="object"||Array.isArray(o.best)) o.best={}; return o; }
const accMic = () => S.settings.input==="mic";
const accModeOf = c => accMic() ? "wait" : c.mode; // the mic: wait mode only (no reliable timing)
const accStyleName = id => (t("accStyles")||{})[id]||id;
const accPatTitle = id => { const p=ACC_PATS[id]; return accStyleName(p.st)+" · "+t("accPatN")(p.n); };
const accBest = id => (accS().best[id])||null;
const accDoneN = () => ACC_IDS.filter(id=>{ const b=accBest(id); return b&&(b.st|0)>0; }).length;
// the grid: one bar per chord (a 3-chord grid repeats its last chord: 4 bars)
function accBars(c){ const pr=PROG[c.prog], degs=pr.deg.slice(); if(degs.length===3) degs.push(degs[2]);
  return degs.map(d=>{ const ch=hChord(pr.scale,c.key,d,pr.sev); return {ch, sym:chordSymOf(ch), roman:ch.roman, root:ch.root.pc, fifth:ch.notes[2].pc, pcs:ch.notes.map(n=>n.pc)}; }); }
const accProgLabel = pid => { const pr=PROG[pid]; let d=pr.deg.map(x=>hChord(pr.scale,pr.scale==="major"?"C":"A",x,pr.sev).roman); return d.join("–"); };
// left hand / right hand: under / from the split. Middle C, unless the keyboard (S.midi.hw.lo/hi, when known) does not reach around it
function accSplit(){ const hw=S.midi&&S.midi.hw, lo=hw?+hw.lo:NaN, hi=hw?+hw.hi:NaN;
  if(Number.isFinite(lo)&&Number.isFinite(hi)&&hi-lo>=11&&!(lo<=53&&hi>=71)) return Math.max(lo+5,Math.min(hi-6,12*Math.round((lo+hi)/24)));
  return 60; }
const accNarrow = () => matchMedia("(max-width:640px) and (orientation:portrait)").matches;
function accRange(){ const sp=accSplit(), w=($("accPanel")&&$("accPanel").clientWidth)||innerWidth; return accNarrow()?[sp-12,sp+12]:w<900?[sp-24,sp+12]:[sp-24,sp+24]; }
const accFold = m => { const [lo,hi]=accRange(); while(m<lo) m+=12; while(m>hi) m-=12; return m; };
const accLat = () => { try{ return typeof midiLat==="function" ? Math.max(0,+midiLat()||0) : 0; }catch(e){ return 0; } };
const accWin = () => { const l=accLat(); return [80+l,160+l]; };
// notes shown on the keys: the left hand an octave or two under the split, the chord in close position from the split
const accLhNote = (bar,deg) => { const sp=accSplit(), r=sp-24+(((bar.root-sp)%12)+12)%12; return deg===5?r+((bar.fifth-bar.root+12)%12):deg===8?r+12:r; };
const accRhNotes = bar => voiceAt(bar.ch.notes,0,accSplit()+(((bar.root-accSplit())%12)+12)%12);
// ---- the run ----
const accBeat = R => 60000/R.bpm;
const accCellT = (R,ab,c) => R.t0+(ab*R.m+(c>>1)+((c&1)?(R.sw?2/3:.5):0))*accBeat(R);
function accGen(R, ab){ const P=R.pat, bar=R.bars[ab%R.nB], nx=R.bars[(ab+1)%R.nB], out=[];
  for(let c=0;c<R.N;c++){ const r=P.rh[c], l=P.lh[c];
    if(r==="x"||r===">"){ const b=r===">"?nx:bar; out.push({ab,c,h:"R",need:b.pcs.slice(),got:new Set(),bar:b,st:0,ant:r===">"}); }
    if(l==="1"||l==="5"||l==="8") out.push({ab,c,h:"L",deg:+l,pc:l==="5"?bar.fifth:bar.root,bar,st:0}); }
  return out; }
function accStart(){ const c=accCfg(), P=ACC_PATS[c.pat[c.style]], bars=accBars(c), mode=accModeOf(c), nB=bars.length;
  const base = mode==="wait" ? 2 : c.up ? 8 : 4, loops=Math.max(1,Math.round(base*4/nB));
  accStopRun(); ACC.res=null;
  const R=ACC.run={cfg:{...c}, id:P.id, pat:P, m:P.m, N:P.m*2, sw:P.sw, bars, nB, loops, TB:loops*nB, mode, bpm:c.bpm, maxBpm:c.bpm, t0:0, ev:[], gen:-1, ab:0,
    countFrom:0, nextK:0, held:0, stray:0, notes:0, okN:0, badN:0, perf:0, l1:null, pos:null, cur:[], busy:0, t1:performance.now(), raf:0, lastCnt:null, flash:""};
  ACC.view="play"; if(page!=="acc") openPage("acc"); else accRender();
  if(mode==="wait") accWaitNext(R);
  else { R.t0=performance.now()+250+R.m*accBeat(R); R.countFrom=0; R.nextK=-R.m; } // beat 0 of bar 0 after one bar of count-in
  accDs(R); accPaint(); R.raf=requestAnimationFrame(accTick); }
const accDs = R => { const P=$("accPanel"); if(P){ P.dataset.t0=R.t0; P.dataset.bpm=R.bpm; P.dataset.mode=R.mode; P.dataset.res=R.resumes|0; } }; // timeline for the tests (r31)
function accStopRun(){ const R=ACC.run; if(R) cancelAnimationFrame(R.raf); ACC.tm.forEach(clearTimeout); ACC.tm=[]; ACC.run=null; ACC.gkey=""; }
function accStop(){ accStopRun(); if(ACC.view==="play") ACC.view="setup"; }
const accHeld = () => page!=="acc" || ACC.view!=="play" || anyModal() || document.hidden || (typeof LV!=="undefined"&&LV.on);
// back from a window (leave?, MIDI unplugged, settings…): the bar being played starts again after one bar of count-in
function accResume(R, now){ if(R.mode==="wait"){ accPaint(); return; }
  const bm=accBeat(R), ab=Math.max(0,Math.min(R.TB-1,Math.floor((now-R.t0)/bm/R.m)));
  R.ev=R.ev.filter(e=>e.ab<ab); R.gen=ab-1; R.t0=now+250+R.m*bm-ab*R.m*bm; R.countFrom=ab*R.m; R.nextK=R.countFrom-R.m; R.ab=ab; R.resumes=(R.resumes|0)+1; accDs(R); accPaint(); }
function accClick(at, acc){ const c=audio(); if(!c||!master) return; const when=Math.max(c.currentTime,c.currentTime+(at-performance.now())/1000);
  const o=c.createOscillator(), g=c.createGain(); o.type="square"; o.frequency.value=acc?1568:1175;
  g.gain.setValueAtTime(0,when); g.gain.linearRampToValueAtTime(acc?.16:.09,when+.002); g.gain.exponentialRampToValueAtTime(.0005,when+.05);
  o.connect(g); g.connect(master); o.start(when); o.stop(when+.07); }
function accTick(){ const R=ACC.run; if(!R||ACC.run!==R) return; R.raf=requestAnimationFrame(accTick); const now=performance.now();
  if(accHeld()){ if(!R.held) R.held=now; return; }
  if(R.held){ R.held=0; accResume(R,now); }
  if(R.mode==="wait") return;
  let bm=accBeat(R);
  while(R.t0+R.nextK*bm<now+120){ const k=R.nextK++; if(k<R.countFrom || R.cfg.metro) accClick(R.t0+k*bm, ((k%R.m)+R.m)%R.m===0); }
  while(R.gen+1<R.TB && R.t0+(R.gen+1)*R.m*bm-250<now){ const ab=R.gen+1; if(ab>0&&ab%R.nB===0) accLoopEnd(R,ab); R.gen=ab; bm=accBeat(R); accGen(R,ab).forEach(e=>{ e.t=accCellT(R,ab,e.c); R.ev.push(e); }); }
  const W2=accWin()[1];
  R.ev.forEach(e=>{ if(!e.st && now>Math.max(e.t+W2,(e.first||0)+150)){ e.st=3; e.miss=!(e.got&&e.got.size); accCell(e); accMeters(); } });
  const pos=(now-R.t0)/bm, ab=Math.floor(pos/R.m);
  if(pos>=R.countFrom && ab!==R.ab && ab<R.TB){ R.ab=ab; accPaint(); }
  accCount(pos);
  accCursor(R,pos); accGuide();
  if(pos>=R.TB*R.m+.5 && (R.ev.every(e=>e.st) || pos>=R.TB*R.m+2)) accFinish(); }
// end of a loop: 2 perfect loops in a row (no cell missed, ≥ 75 % perfect) = +5 bpm in progressive mode
function accLoopEnd(R, ab){ const lp=ab/R.nB-1, evs=R.ev.filter(e=>Math.floor(e.ab/R.nB)===lp && e.st), ok=evs.filter(e=>e.st===1).length;
  const perfect = evs.length>0 && !evs.some(e=>e.st===3) && ok/evs.length>=.75; R.perf = perfect ? R.perf+1 : 0;
  if(R.cfg.up && R.perf>=2 && R.bpm<160){ const kB=ab*R.m, T=R.t0+kB*accBeat(R); R.bpm+=5; R.t0=T-kB*accBeat(R); R.perf=0; R.maxBpm=Math.max(R.maxBpm,R.bpm); accDs(R); accFlash(t("accUpNow")(R.bpm)); accMeters(); } }
function accCount(pos){ const R=ACC.run, el=$("acCount"); if(!el) return; const k=Math.floor(pos), on=pos<R.countFrom;
  const n = on ? k-(R.countFrom-R.m)+1 : null; if(n===R.lastCnt) return; R.lastCnt=n;
  el.hidden=!on||n<1; if(on&&n>=1){ el.textContent=n; el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop"); } $("acChordW").classList.toggle("counting",on);
  $("acNext").textContent=R.bars[(R.ab+(on?0:1))%R.nB].sym; } // counting: « 3  Am » (the chord to come)
// a note: rhythm mode = the nearest cell of that hand within ±160 ms; wait mode = the cell the cursor waits on
function accNote(m, tn, src){ const R=ACC.run; if(!R||accHeld()) return; lastNoteAt=Date.now(); R.notes++;
  const hand = (src==="midi"||src==="screen") ? (m<accSplit()?"L":"R") : null; // computer keys, mic: the hand is guessed from the note
  accPress(m); if(R.mode==="wait") accNoteW(R,m,hand); else accNoteR(R,m,tn,hand); }
function acc8ok(R,e,m){ return e.deg!==8 || !R.l1 || R.l1.ab!==e.ab || m>R.l1.m; } // the 8 is above the 1 of the same bar
function accNoteR(R, m, tn, hand){ const pc=((m%12)+12)%12, [W1,W2]=accWin(); if(tn<R.t0+R.countFrom*accBeat(R)-W2) return; // the count-in: not graded
  let best=null, bs=Infinity;
  for(const e of R.ev){ if(e.st||(hand&&e.h!==hand)) continue; let s;
    if(e.h==="R"&&e.got.size){ if(tn-e.first>150) continue; s=-1; } else { const d=Math.abs(tn-e.t); if(d>W2) continue; s=d; }
    if(!hand){ const fits=e.h==="R"?e.need.includes(pc):pc===e.pc; if(!fits) s+=1000; }
    if(s<bs){ bs=s; best=e; } }
  if(!best){ R.stray++; accKeyBad(m); accMeters(); return; }
  const e=best;
  if(e.h==="R"){ if(!e.need.includes(pc)){ e.st=3; R.badN++; accKeyBad(m); accCell(e); accMeters(); return; }
    if(e.got.has(pc)) return; if(!e.got.size) e.first=tn; e.got.add(pc); R.okN++;
    if(e.got.size===e.need.length){ e.dt=e.first-e.t; e.st=Math.abs(e.dt)<=W1?1:2; accCell(e); accMeters(); } return; }
  if(pc!==e.pc||!acc8ok(R,e,m)){ e.st=3; R.badN++; accKeyBad(m); accCell(e); accMeters(); return; }
  R.okN++; e.dt=tn-e.t; e.st=Math.abs(e.dt)<=W1?1:2; if(e.deg===1) R.l1={ab:e.ab,m}; accCell(e); accMeters(); }
function accNoteW(R, m, hand){ if(performance.now()<R.busy) return; const pc=((m%12)+12)%12, evs=R.cur;
  const e=evs.find(e=>!e.st&&(!hand||e.h===hand)&&(e.h==="R"?e.need.includes(pc)&&!e.got.has(pc):pc===e.pc&&acc8ok(R,e,m)));
  if(!e){ if(evs.some(x=>(x.h==="R"&&x.got.has(pc)&&(!hand||hand==="R"))||(x.h==="L"&&x.st&&x.pc===pc&&(!hand||hand==="L")))) return; // the same note again
    R.badN++; const mine=evs.filter(x=>!x.st&&(!hand||x.h===hand)); (mine.length?mine:evs.filter(x=>!x.st)).forEach(x=>{ x.err=(x.err|0)+1; accCell(x,true); }); accKeyBad(m); accMeters(); return; }
  R.okN++;
  if(e.h==="R"){ e.got.add(pc); if(e.got.size===e.need.length) e.st=e.err?2:1; } else { e.st=e.err?2:1; if(e.deg===1) R.l1={ab:e.ab,m}; }
  accCell(e); accMeters(); accGuide();
  if(evs.every(x=>x.st)){ R.busy=performance.now()+160; ACC.tm.push(setTimeout(()=>{ if(ACC.run===R) accWaitNext(R); },160)); } }
function accWaitNext(R){ let ab=R.pos?R.pos.ab:0, c=R.pos?R.pos.c:-1;
  for(;;){ c++; if(c>=R.N){ c=0; ab++; } if(ab>=R.TB){ accFinish(); return; }
    if(R.gen<ab){ R.gen=ab; R.ev.push(...accGen(R,ab)); }
    const evs=R.ev.filter(e=>e.ab===ab&&e.c===c); if(evs.length){ R.pos={ab,c}; R.cur=evs; break; } }
  if(R.ab!==ab){ R.ab=ab; accPaint(); } else accPaintCells(); accCursor(R); accGuide(); }
// ---- end of the game: 3 stars (accuracy, steadiness, tempo reached), XP, record ----
function accStats(R){ const ev=R.ev.filter(e=>e.st), ok=ev.filter(e=>e.st===1).length, mid=ev.filter(e=>e.st===2).length, bad=ev.filter(e=>e.st===3).length;
  if(R.mode==="wait"){ const notes=R.okN+R.badN; return {n:ev.length, ok, mid, bad, just:notes?R.okN/notes:0, reg:ev.length?ok/ev.length:0}; }
  return {n:ev.length, ok, mid, bad, just:ev.length?(ok+mid)/(ev.length+R.stray*.5):0, reg:(ok+mid)?ok/(ok+mid):0}; }
function accFinish(){ const R=ACC.run; if(!R) return; cancelAnimationFrame(R.raf); const s=accStats(R);
  if(!s.n){ accStopRun(); ACC.view="setup"; accRender(); return; }
  const full = R.mode==="wait" ? R.pos && R.pos.ab>=R.TB-1 : performance.now()>=R.t0+R.TB*R.m*accBeat(R);
  const sJ=s.just>=.9, sR=s.reg>=(R.mode==="wait"?.8:.7), sT=R.mode==="rhythm" && full && R.maxBpm>=R.pat.tg, stars=(sJ?1:0)+(sR?1:0)+(sT?1:0);
  const o=accS(), prev=o.best[R.id], xp=Math.min(40,5+5*stars+Math.floor(s.ok/8)), rec=!prev || stars>(prev.st|0) || (R.mode==="rhythm"&&sJ&&R.maxBpm>(prev.bpm|0));
  o.best[R.id]={st:Math.max(stars,prev?prev.st|0:0), bpm:Math.max(prev?prev.bpm|0:0, R.mode==="rhythm"&&sJ?R.maxBpm:0), pct:Math.max(prev?prev.pct|0:0,Math.round(s.just*100)), n:(prev?prev.n|0:0)+1, at:prev&&prev.at||Date.now()};
  const xp0=S.xp|0; addXP(xp); save();
  ACC.res={id:R.id, s, stars, sJ, sR, sT, xp, xp0, rec:rec&&stars>0&&!!prev&&(recNew(prev.st|0,stars,"stars")||(R.mode==="rhythm"&&sJ&&recNew(prev.bpm|0,R.maxBpm,1))), mode:R.mode, bpm:R.maxBpm, tg:R.pat.tg, full};
  accStopRun(); ACC.view="end"; accRender();
  if(stars) [0,4,7].forEach((d,i)=>tone(72+d,i*.09,.5,.16)); }
const accPassed = r => r.stars>=3 || (r.mode==="wait" && r.stars>=2); // wait mode has no tempo star
// Do = continue: the next pattern (same style, then the next style); Si = play it again
function accNextGo(){ const c=accCfg(), r=ACC.res, id=r?r.id:c.pat[c.style], i=ACC_IDS.indexOf(id), nx=ACC_IDS[(i+1)%ACC_IDS.length];
  if(r && !accPassed(r)){ accStart(); return; } // not yet: the same pattern again
  c.style=ACC_PATS[nx].st; c.pat[c.style]=nx; save(); accStart(); }
// ---- drawing ----
function accKbHTML(){ const [lo,hi]=accRange(), sp=accSplit(), W=[], N=S.settings.notation==="fr"?PC_FR:PC_EN; for(let m=lo;m<=hi;m++) if(NAT.includes(m%12)) W.push(m);
  const ww=100/W.length, bw=ww*.62; let h="", sx=0;
  W.forEach((m,i)=>{ if(m===sp) sx=i*ww; const hd=m<sp?"lh":"rh", oct=m%12===0?'<span>'+esc(octName(m))+'</span>':'<span></span>';
    h+='<div class="wk '+hd+'" data-m="'+m+'" role="button" aria-label="'+esc(N[m%12])+'" style="--nc:var(--note-'+(m%12)+')">'+oct+'</div>';
    if([0,2,5,7,9].includes(m%12)&&m+1<=hi) h+='<div class="bk '+(m+1<sp?"lh":"rh")+'" data-m="'+(m+1)+'" role="button" aria-label="'+esc(N[(m+1)%12])+'" style="--nc:var(--note-'+((m+1)%12)+');left:'+((i+1)*ww-bw/2)+'%;width:'+bw+'%"><span></span></div>'; });
  return h+'<i class="ac-split" style="left:'+sx+'%"></i>'; }
const accKey = m => { const k=$("acKb"); return k&&k.querySelector('[data-m="'+accFold(m)+'"]'); };
function accPress(m){ const el=accKey(m); if(!el) return; el.classList.add("ac-on","k-press"); /* no forced layout here: the note's time matters */ clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove("ac-on","k-press"),220); }
function accKeyBad(m){ const el=accKey(m); if(!el) return; el.classList.add("k-bad"); setTimeout(()=>el.classList.remove("k-bad"),300); }
function accFlash(x){ const el=$("acFlash"); if(!el) return; el.textContent=x; el.classList.remove("on"); void el.offsetWidth; el.classList.add("on"); }
// keys to play next: the cell the cursor waits on (wait mode) or the next cell to come (rhythm)
function accGuide(){ const R=ACC.run, kb=$("acKb"); if(!R||!kb) return; let evs=[];
  if(R.cfg.guide){ if(R.mode==="wait") evs=R.cur.filter(e=>!e.st);
    else { const now=performance.now(), W2=accWin()[1], pend=R.ev.filter(e=>!e.st&&e.t>now-W2).sort((a,b)=>a.t-b.t); if(pend.length && pend[0].t-now<accBeat(R)*1.2) evs=pend.filter(e=>e.ab===pend[0].ab&&e.c===pend[0].c); } }
  const ms=[]; evs.forEach(e=>{ if(e.h==="L") ms.push(accLhNote(e.bar,e.deg)); else accRhNotes(e.bar).forEach((m,i)=>{ if(!e.got.has(e.bar.pcs[i])) ms.push(m); }); });
  const key=ms.map(accFold).sort().join(","); if(key===ACC.gkey) return; ACC.gkey=key; const on=new Set(key?key.split(",").map(Number):[]);
  kb.querySelectorAll("[data-m]").forEach(el=>el.classList.toggle("ac-gd",on.has(+el.dataset.m))); }
function accCursor(R, pos){ const cur=$("acCur"), cells=$("acCells"); if(!cur||!cells) return; const N=R.N; let x;
  if(R.mode==="wait"){ if(!R.pos) return; x=R.pos.c; } // the left edge of a cell = its moment
  else { if(pos==null||pos<R.countFrom){ cur.style.opacity="0"; return; } cur.style.opacity="";
    const inBar=pos-R.ab*R.m, b=Math.floor(inBar), f=inBar-b, off=R.sw?2/3:.5; x=Math.min(N,Math.max(0,b*2+(f<off?f/off:1+(f-off)/(1-off)))); }
  const W=cells.clientWidth; cur.style.transform="translateX("+((x/N)*W).toFixed(1)+"px)"; }
function accCellEl(e){ const g=$("acCells"); return g&&g.querySelector('.ac-c[data-h="'+e.h+'"][data-c="'+e.c+'"]'); }
function accCell(e, shake){ const R=ACC.run; if(!R||e.ab!==R.ab) return; const el=accCellEl(e); if(!el) return;
  el.classList.remove("s1","s2","s3"); if(e.st) el.classList.add("s"+e.st);
  if(R.mode==="wait") el.classList.toggle("cur", !e.st && R.pos && R.pos.ab===e.ab && R.pos.c===e.c);
  if(shake){ el.classList.remove("shk"); void el.offsetWidth; el.classList.add("shk"); } }
function accPaintCells(){ const R=ACC.run, g=$("acCells"); if(!R||!g) return; g.querySelectorAll(".ac-c").forEach(el=>{ el.classList.remove("s1","s2","s3","cur"); });
  R.ev.filter(e=>e.ab===R.ab).forEach(e=>accCell(e)); }
function accMeters(){ const R=ACC.run; if(!R) return; const s=accStats(R), j=$("acJust"), r=$("acReg"), tp=$("acTempo");
  if(j){ j.textContent=s.n?Math.round(s.just*100)+" %":"–"; j.parentNode.classList.toggle("ok",!!s.n&&s.just>=.9); }
  if(r){ r.textContent=s.n?Math.round(s.reg*100)+" %":"–"; r.parentNode.classList.toggle("ok",!!s.n&&s.reg>=(R.mode==="wait"?.8:.7)); }
  if(tp){ tp.innerHTML = R.mode==="wait" ? esc(t("accWaitShort")) : '<b>'+R.bpm+'</b> / '+R.pat.tg; tp.parentNode.classList.toggle("ok",R.mode==="rhythm"&&R.maxBpm>=R.pat.tg); const b=$("acBpmChip"); if(b&&R.mode==="rhythm") b.textContent="♩ = "+R.bpm; } }
function accPaint(){ const R=ACC.run; if(!R||ACC.view!=="play") return; const bar=R.bars[R.ab%R.nB], nx=R.bars[(R.ab+1)%R.nB], lp=Math.floor(R.ab/R.nB);
  const ch=$("acChord"), nn=$("acNext"), ms=$("acMeas"); if(!ch) return;
  ch.textContent=bar.sym; nn.textContent=nx.sym; ms.textContent=t("accMeasure")(R.ab%R.nB+1,R.nB,lp+1,R.loops);
  $("acSegs").querySelectorAll("i").forEach((s,i)=>s.className = i<R.ab%R.nB?"done":i===R.ab%R.nB?"cur":"");
  accPaintCells(); accMeters(); accCursor(R); ACC.gkey=""; accGuide(); }
function accHead(){ const c=accCfg(), R=ACC.run, id=R?R.id:c.pat[c.style];
  return '<div class="ac-top"><span class="ac-crumb">'+esc(t("accName"))+' · <b>'+esc(accPatTitle(id))+'</b></span>'
    +(R?'<span class="ac-chip mono" id="acBpmChip">'+(R.mode==="wait"?esc(t("accWaitShort")):"♩ = "+R.bpm)+'</span>'
      +(R.mode==="rhythm"?'<button class="ac-chip" type="button" id="acMetro" aria-pressed="'+!!R.cfg.metro+'">'+esc(t("accMetro"))+'</button>':'')
      +'<span class="ac-chip ac-gridc">'+esc(t("accGrid")+" "+accProgLabel(R.cfg.prog)+" · "+noteName(tonicNote(R.cfg.key)))+'</span>'
      +'<span class="ac-segs" id="acSegs" aria-hidden="true">'+R.bars.map(()=>'<i></i>').join("")+'</span>':'')
    +'<button class="ac-end" type="button" id="acEnd">'+esc(t("accEnd"))+'</button></div>'; }
function accRenderPlay(P){ const R=ACC.run, N=R.N, beats=[]; for(let c=0;c<N;c++) beats.push(c%2?(R.sw?"a":"&"):String(c/2+1));
  const cells=h=>Array.from({length:N},(_,c)=>{ const v=h==="R"?R.pat.rh[c]:R.pat.lh[c], on=v!=="."; return '<div class="ac-c '+(h==="R"?"rh":"lh")+(on?" ev":"")+(v===">"?" ant":"")+'" data-h="'+h+'" data-c="'+c+'">'+(on?(h==="R"?'<i></i>':'<b>'+v+'</b>'):'')+'</div>'; }).join("");
  const sp=accSplit(), spl=sp===60?t("accSplitC"):t("accSplit");
  P.innerHTML='<div class="ac-play'+(R.mode==="wait"?" wait":"")+'">'+accHead()
    +'<div class="ac-info"><div class="ac-ch" id="acChordW"><small class="ac-meas mono" id="acMeas"></small><div class="ac-chl" aria-live="polite"><b id="acChord"></b><span class="ac-arr" aria-hidden="true">→</span><span id="acNext"></span><em class="ac-count" id="acCount" hidden></em></div></div>'
    +'<div class="ac-mets"><div class="ac-met"><small>'+esc(t("accJust"))+'</small><b id="acJust">–</b></div><div class="ac-met"><small>'+esc(t("accReg"))+'</small><b id="acReg">–</b></div><div class="ac-met"><small>'+esc(t("accTempoL"))+'</small><span id="acTempo"></span></div></div></div>'
    +'<div class="ac-seq" style="--n:'+N+'"><div class="ac-lbls" aria-hidden="true"><span></span><span><b>'+esc(t("accRH"))+'</b><small>'+esc(t("accRHs"))+'</small></span><span><b>'+esc(t("accLH"))+'</b><small>'+esc(t("accLHs"))+'</small></span></div>'
    +'<div class="ac-cells" id="acCells">'+beats.map(b=>'<span class="ac-bt mono">'+b+'</span>').join("")+'<span class="ac-rl"><b>'+esc(t("accRH"))+'</b> '+esc(t("accRHs"))+'</span>'+cells("R")+'<span class="ac-rl"><b>'+esc(t("accLH"))+'</b> '+esc(t("accLHs"))+'</span>'+cells("L")+'<i class="ac-cur" id="acCur" aria-hidden="true"></i></div></div>'
    +'<div class="ac-leg"><span class="g">'+esc(R.mode==="wait"?t("accLegWOk"):t("accLegOk"))+'</span><span class="y">'+esc(R.mode==="wait"?t("accLegWMid"):t("accLegMid"))+'</span><span class="r">'+esc(t("accLegBad"))+'</span>'
    +(R.mode==="rhythm"&&R.cfg.up?'<span class="ac-up">'+esc(t("accUpHint"))+'</span>':'')+'<span class="ac-flash" id="acFlash" role="status"></span></div>'
    +'<div class="ac-kbw"><div class="ac-kbl" aria-hidden="true"><span class="l">'+esc(t("accLH"))+'</span><span class="c">'+esc(spl)+'</span><span class="r">'+esc(t("accRH"))+'</span></div><div class="kbd ac-kb" id="acKb" aria-label="Piano">'+accKbHTML()+'</div></div></div>';
  $("acEnd").onclick=()=>accFinish();
  if($("acMetro")) $("acMetro").onclick=e=>{ R.cfg.metro=!R.cfg.metro; const c=accCfg(); c.metro=R.cfg.metro; save(); e.currentTarget.setAttribute("aria-pressed",R.cfg.metro); };
  const kb=$("acKb"), spEl=kb.querySelector(".ac-split"), lbl=P.querySelector(".ac-kbl .c"); if(spEl&&lbl) lbl.style.left=spEl.style.left;
  kb.addEventListener("pointerdown",e=>{ const el=e.target.closest("[data-m]"); if(!el) return; e.preventDefault(); const m=+el.dataset.m; try{ tone(m); }catch(er){} accNote(m,performance.now(),"screen"); });
  kb.addEventListener("contextmenu",e=>e.preventDefault());
  accPaint(); }
function accPatPreview(p){ const N=p.m*2; let h='<span class="ac-pv" style="--n:'+N+'" aria-hidden="true">'; for(let c=0;c<N;c++) h+='<i class="'+(p.rh[c]!=="."?"r":"")+'"></i>'; for(let c=0;c<N;c++) h+='<i class="'+(p.lh[c]!=="."?"l":"")+'"></i>'; return h+'</span>'; }
const accStars = n => '<span class="ac-st" aria-hidden="true">'+"★".repeat(n)+'<i>'+"★".repeat(3-n)+'</i></span>';
function accRenderSetup(P){ const c=accCfg(), st=ACC_ST.find(x=>x.id===c.style), pid=c.pat[c.style], P0=ACC_PATS[pid], re=()=>{ save(); accRender(); }, keys=TONICS[PROG[c.prog].scale], mode=accModeOf(c);
  const nB=accBars(c).length, loops=Math.max(1,Math.round((mode==="wait"?2:c.up?8:4)*4/nB)), sel=(a)=>' aria-pressed="'+!!a+'"';
  P.innerHTML='<div class="su ac-su" style="--mc:'+ACC_COL+'"><div class="mode-h"><h2 class="mode-big" style="--mc:'+ACC_COL+'"><span class="mb-ic">'+ACC_ICON+'</span><span>'+esc(t("accName"))+'</span></h2><p>'+esc(t("accSub"))+'</p></div>'
    +'<div class="su-wrap"><div class="su-main">'
    +'<div class="su-hrow"><h3 class="su-h"><span class="su-n">1</span><span>'+esc(t("accStyleH"))+'</span></h3><small class="ac-coll mono">'+esc(t("accColl")(accDoneN(),ACC_IDS.length))+'</small></div>'
    +'<div class="su-cards ac-styles" id="acStyles">'+ACC_ST.map(s=>{ const won=s.pats.filter(p=>{ const b=accBest(p[0]); return b&&b.st>0; }).length;
        return '<button type="button" class="su-card" data-s="'+s.id+'"'+sel(s.id===c.style)+'><i class="su-tick"></i><b>'+esc(accStyleName(s.id))+'</b><small>'+esc(t("accNPat")(s.pats.length)+(s.m===3?" · 3/4":s.sw?" · swing":""))+(won?' · '+won+'★':'')+'</small></button>'; }).join("")+'</div>'
    +'<div class="ac-pats" id="acPats">'+st.pats.map(([id])=>{ const p=ACC_PATS[id], b=accBest(id);
        return '<button type="button" class="su-km ac-pat" data-p="'+id+'"'+sel(id===pid)+'>'+accPatPreview(p)+'<span class="ac-pt"><b>'+esc(t("accPatN")(p.n))+'</b><span class="ac-df" title="'+esc(t("accDiff")[p.d])+'">'+'●'.repeat(p.d)+'<i>'+'●'.repeat(3-p.d)+'</i></span></span><small>'+esc((t("accPatD")||{})[id]||"")+'</small>'+(b?'<small class="ac-rec">'+accStars(b.st|0)+(b.bpm?' · '+b.bpm+' bpm':'')+'</small>':'')+'</button>'; }).join("")+'</div>'
    +'<h3 class="su-h"><span class="su-n">2</span><span>'+esc(t("accGridH"))+'</span></h3>'
    +'<div class="su-chips ac-progs" id="acProgs">'+PROGS.map(pr=>'<button type="button" data-g="'+pr.id+'"'+sel(pr.id===c.prog)+'>'+esc(accProgLabel(pr.id))+'</button>').join("")+'</div>'
    +'<div class="su-keys ac-keys" id="acKeys">'+keys.map(k=>'<button type="button" class="su-key" data-k="'+esc(k)+'"'+sel(k===c.key)+'><b>'+esc(noteName(tonicNote(k))+(PROG[c.prog].scale==="minor"?(S.settings.notation==="fr"?" m":"m"):""))+'</b></button>').join("")+'</div>'
    +'</div><aside class="su-side"><section class="su-box ac-box"><h3 class="su-h"><span class="su-n">3</span><span>'+esc(t("accPlayH"))+'</span></h3>'
    +'<div class="ac-modes" id="acModes">'+[["wait","accWait","accWaitD"],["rhythm","accRhythm","accRhythmD"]].map(([v,l,d])=>'<button type="button" class="su-km" data-v="'+v+'"'+sel(mode===v)+(v==="rhythm"&&accMic()?' disabled':'')+'><b>'+esc(t(l))+'</b><small>'+esc(t(d))+'</small></button>').join("")+'</div>'
    +(accMic()?'<p class="ac-mic">'+esc(t("accMicOnly"))+'</p>':'')
    +'<div class="ac-tempo"><label class="su-lbl" for="acBpm">'+esc(t("accTempoL"))+'</label><input type="range" id="acBpm" min="60" max="120" step="5" value="'+c.bpm+'"'+(mode==="wait"?' disabled':'')+'><b class="mono" id="acBpmV">'+c.bpm+'</b></div>'
    +'<div class="ac-checks"><label class="su-help mini"><input type="checkbox" id="acUp"'+(c.up?' checked':'')+(mode==="wait"?' disabled':'')+'><span><b>'+esc(t("accUp"))+'</b><small>'+esc(t("accUpD"))+'</small></span></label>'
    +'<label class="su-help mini"><input type="checkbox" id="acMetroS"'+(c.metro?' checked':'')+(mode==="wait"?' disabled':'')+'><span><b>'+esc(t("accMetro"))+'</b></span></label>'
    +'<label class="su-help mini"><input type="checkbox" id="acGuideS"'+(c.guide?' checked':'')+'><span><b>'+esc(t("accGuide"))+'</b></span></label></div></section>'
    +'<button class="su-go" id="acGo" type="button" style="--mc:'+ACC_COL+'"><span><small>'+esc(t("accSum")(nB,loops)+(S.settings.input==="midi"?" · "+t("accOrC")(CNAME()):""))+'</small><b>'+esc(accPatTitle(pid)+" · "+noteName(tonicNote(c.key)))+'</b></span><span class="su-play">'+esc(t("accGo"))+'</span></button></aside></div></div>';
  P.querySelectorAll("#acStyles [data-s]").forEach(b=>b.onclick=()=>{ c.style=b.dataset.s; re(); });
  P.querySelectorAll("#acPats [data-p]").forEach(b=>b.onclick=()=>{ c.pat[c.style]=b.dataset.p; re(); });
  P.querySelectorAll("#acProgs [data-g]").forEach(b=>b.onclick=()=>{ c.prog=b.dataset.g; re(); });
  P.querySelectorAll("#acKeys [data-k]").forEach(b=>b.onclick=()=>{ c.key=b.dataset.k; re(); });
  P.querySelectorAll("#acModes [data-v]").forEach(b=>b.onclick=()=>{ c.mode=b.dataset.v; re(); });
  const bp=$("acBpm"); bp.oninput=()=>{ $("acBpmV").textContent=bp.value; }; bp.onchange=()=>{ c.bpm=+bp.value; save(); };
  [["acUp","up"],["acMetroS","metro"],["acGuideS","guide"]].forEach(([id,k])=>{ $(id).onchange=e=>{ c[k]=e.target.checked; save(); }; });
  $("acGo").onclick=accStart;
  try{ ["acStyles","acKeys"].forEach(id=>ovFade($(id))); ovFade($("acProgs")); }catch(e){} }
function accRenderEnd(P){ const r=ACC.res; if(!r){ ACC.view="setup"; return accRenderSetup(P); } const li=levelInfo(S.xp), pct=x=>Math.round(x*100)+" %", nx3=accPassed(r);
  const crit=[[r.sJ,t("accJust"),pct(r.s.just)],[r.sR,t("accReg"),pct(r.s.reg)],[r.sT,t("accTempoL"),r.mode==="wait"?t("accStarTW"):r.bpm+" / "+r.tg+" bpm"]];
  P.innerHTML='<div class="ac-endw"><div class="pp-card ac-card" role="dialog" aria-labelledby="acET"><small class="pp-k">'+esc(t("accName")+" · "+accPatTitle(r.id))+'</small>'
    +'<h2 id="acET">'+esc(r.stars?t("accDone"):t("accDoneLow"))+'</h2>'
    +'<p class="pp-stars" aria-label="'+esc(t("ppStarsA")(r.stars))+'">'+[0,1,2].map(i=>'<span class="'+(i<r.stars?"on":"")+'" style="--d:'+(i*220)+'ms">★</span>').join("")+'</p>'
    +'<ul class="ac-crit">'+crit.map(([ok,l,v])=>'<li class="'+(ok?"ok":"")+'"><i aria-hidden="true">'+(ok?"★":"☆")+'</i><span>'+esc(l)+'</span><b class="mono">'+esc(v)+'</b></li>').join("")+'</ul>'
    +(r.rec?'<p class="ac-newrec">'+esc(t("accNew"))+'</p>':'')
    +'<div class="pp-xp"><b class="mono">+'+fmtN(r.xp)+' XP</b><span class="pp-bar"><i style="width:'+Math.round(100*li.into/li.need)+'%"></i></span><small>'+esc(t("endNext")(fmtN(li.need-li.into),fmtN(li.L+1)))+'</small></div>'
    +'<div class="pp-bgo"><button class="pp-main ac-main" type="button" id="acNext2">'+esc(nx3?t("accNext"):t("accAgain"))+'</button>'+(S.settings.input==="midi"?'<small class="pp-orc">'+esc(t("accOrCB")(CNAME(),BNAME()))+'</small>':'')+'</div>'
    +'<div class="pp-blinks">'+(nx3?'<button class="pp-link" type="button" id="acAgain">'+esc(t("accAgain"))+'</button>':'')+'<button class="pp-link" type="button" id="acSet">'+esc(t("accSetup"))+'</button></div></div></div>';
  $("acNext2").onclick=accNextGo; if($("acAgain")) $("acAgain").onclick=accStart; $("acSet").onclick=()=>{ ACC.view="setup"; accRender(); }; }
function accRender(){ const P=$("accPanel"); if(!P) return; ACC.lang=S.settings.lang+S.settings.notation; ACC.gkey="";
  if(ACC.view==="play" && ACC.run) return accRenderPlay(P);
  if(ACC.view==="end") return accRenderEnd(P);
  ACC.view="setup"; accRenderSetup(P); }
function accOpen(){ if(ACC.view!=="play") ACC.view="setup"; if(page!=="acc") openPage("acc"); else accRender(); }
// ---- hooks into the app (wrapped here so the rest of the source stays as it was) ----
{ const P=document.createElement("section"); P.className="mode-page ac-page"; P.id="accPanel"; P.setAttribute("aria-label","Accompagnement"); const lp=$("learnPanel"); lp.parentNode.insertBefore(P,lp.nextSibling); }
TILE_COL.accomp=ACC_COL;
OBJ.accomp=()=>{ const o=O3(); o.block(8,28,104,74,"#3a3478",14); [0,1,2,3].forEach(i=>{ o.block(16+i*23,38,19,24,i===0||i===2?"#ff5a6e":"#5a5390",6); o.block(16+i*23,68,19,24,i===0||i===3?"#5b7cff":"#5a5390",6); });
  return o.raw('<rect x="58" y="32" width="5" height="66" rx="2.5" fill="#fff"/>').svg(); };
{ const _rl=renderLearn; renderLearn=function(){ _rl.apply(this,arguments); const b=$("learnTiles"); if(!b) return; // the tile opens our page (the others open #setupPanel)
    const i=t("learnTiles").findIndex(x=>x[0]==="accomp"), el=b.children[i]; if(el&&i>=0){ const c=el.cloneNode(true); c.addEventListener("click",accOpen); el.replaceWith(c);
      const r=accDoneN(); if(r){ let rec=c.querySelector(".rec"); if(!rec){ rec=document.createElement("span"); rec.className="rec"; c.insertBefore(rec,c.querySelector(".go")); } rec.textContent=t("accColl")(r,ACC_IDS.length); } } }; }
{ const _op=openPage; openPage=function(pg){ if(page==="acc" && pg!=="acc" && !INFO_PAGES.includes(pg)) accStop(); const r=_op.apply(this,arguments); if(page==="acc" && pg==="acc") accRender(); return r; }; }
{ const _sn=setNav; setNav=function(){ _sn.apply(this,arguments); if(page==="acc") $("mbTitle").textContent=t("accName"); }; }
{ const _rd=render; render=function(){ const r=_rd.apply(this,arguments); if(page==="acc" && ACC.lang && ACC.lang!==S.settings.lang+S.settings.notation) accRender(); return r; }; }
{ const _fm=followMidi; followMidi=function(){ if(page==="acc") return; return _fm.apply(this,arguments); }; } // our own keyboard: no rebuild of the main one (it would delay the note's time)
{ const _an=actNow; actNow=function(){ if(lvBase()==="acc"){ const R=ACC.run; return ACC.view==="play" && R && (R.notes>0 || R.ev.some(e=>e.st)) ? {k:"learn"} : null; } return _an.apply(this,arguments); }; }
// notes: during a game each one goes straight to the grid with its time (no 35 ms grouping); otherwise a lone C / B is a command
{ const _mi=midiIn; midiIn=function(m, fromMidi){ if(page==="acc" && ACC.view==="play" && ACC.run && !FN.on && !LV.on){ accNote(m, performance.now(), fromMidi?"midi":ACC.src||(S.settings.input==="mic"?"mic":"kbd")); return; } return _mi.apply(this,arguments); }; }
{ const _mf=midiFlush; midiFlush=function(){ if(page==="acc" && !FN.on && !LV.on){ const b=midiBuf.slice().sort((a,c)=>a-c), lone=midiBufMidi&&b.length===1; midiBuf=[]; midiBufMidi=true;
      if(lone && !anyModal() && S.settings.midiC!==false){ const pc=((b[0]%12)+12)%12; if(ACC.view==="setup"&&pc===0) accStart(); else if(ACC.view==="end"){ if(pc===0) accNextGo(); else if(pc===11) accStart(); } }
      return; }
    return _mf.apply(this,arguments); }; }
document.addEventListener("keydown",e=>{ if(page!=="acc" || anyModal() || document.body.classList.contains("drawer") || e.target.matches("input,select,textarea")) return;
  const m=CODE_MAP[e.code]; if(m==null||e.repeat||e.metaKey||e.ctrlKey||e.altKey) return; tone(m); ACC.src="kbd"; try{ midiIn(m); }finally{ ACC.src=null; } });
addEventListener("resize",()=>{ if(page==="acc" && ACC.view==="play" && ACC.run){ const k=$("acKb"); if(k){ k.innerHTML=accKbHTML(); const s=k.querySelector(".ac-split"), l=document.querySelector(".ac-kbl .c"); if(s&&l) l.style.left=s.style.left; } ACC.gkey=""; accGuide(); accCursor(ACC.run); } });
{ const _ms=mergeState; mergeState=function(local, cloud){ const r=_ms.apply(this,arguments); const isO=x=>x&&typeof x==="object"&&!Array.isArray(x), c=isO(cloud)?cloud:{}, a=isO(local.acc)&&isO(local.acc.best)?local.acc.best:{}, b=isO(c.acc)&&isO(c.acc.best)?c.acc.best:{};
    if(Object.keys(a).length||Object.keys(b).length){ const best={}; // records: best stars and tempo, most games, first time
      [b,a].forEach(o=>Object.entries(o).forEach(([k,v])=>{ if(!isO(v)) return; const x=best[k]; best[k]=!x?{...v}:{st:Math.max(+x.st||0,+v.st||0), bpm:Math.max(+x.bpm||0,+v.bpm||0), pct:Math.max(+x.pct||0,+v.pct||0), n:Math.max(+x.n||0,+v.n||0), at:Math.min(+x.at||+v.at||0,+v.at||+x.at||0)}; }));
      r.merged.acc={v:1, best}; }
    r.changed=JSON.stringify(r.merged)!==JSON.stringify(local); return r; }; }
/* ==== fin Accompagnement ==== */

