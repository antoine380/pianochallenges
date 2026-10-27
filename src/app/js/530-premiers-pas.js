// fragment de l'IIFE principale — ordre 530, voir src/app/README.md
/* ==== Premiers pas (chantier Débutant, lot 1) ==== */
// The "First steps" path: 14 two-minute lessons (P01–P03 written in lot 1, the others shown as "soon"). A lesson = Watch (the keyboard
// shows and sounds the idea) → My turn (short exercises, checked by pitch class or by the exact note) → Bravo (1–3 stars, XP ×2).
// Page "pp" (#ppPanel): views "path" (D6 overview), "open" (D9), "lesson" (D10 watch, D11 exercise, D12 help), "bravo" (D17).
// State: S.pp {v,on,cur,step,done:{p01:{at,stars,err,sec,tries,last}},fail,start,end} and S.resume {kind:"pp",id,step,inp,at,v,err,fin}.
// LEARN shows the compact map (#ppMap, D7), the hub a « Pick up » card (#ppResume, D8). Notes reach the lesson through midiFlush (ppIn).
const PP_V=1, PP_IDS=Array.from({length:14},(_,i)=>"p"+String(i+1).padStart(2,"0")), PP_READY=["p01","p02","p03"], PP_XP=20, PP_MULT=2;
const PP_MIN=[2,2,2,3,2,2,3,3,3,2,3,3,3,3];
const PP_FOOT='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21c-2.2 0-3.5-1.8-3.5-4.2 0-2.6 1.4-5.3 3.4-5.3s3 1.9 3 4.2c0 3-1 5.3-2.9 5.3z"/><circle cx="7.3" cy="7.6" r="1.3"/><circle cx="10.3" cy="5.6" r="1.3"/><circle cx="13.6" cy="6.2" r="1.2"/><circle cx="16" cy="8.4" r="1.1"/><circle cx="17.2" cy="11.3" r="1"/></svg>';
const PP_ICON=["M4 5h16v14H4zM9 5v8M15 5v8","M4 11l8-7 8 7v9H4zM10 20v-5h4v5","M4 17l5-5 4 3 7-8M4 17h.01M9 12h.01M13 15h.01M20 7h.01","M6 18V9M10 18V6M14 18V9M18 18V6","M13 3L5 14h6l-1 7 8-11h-6z","M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4",
  "M8 13V6.5a1.5 1.5 0 0 1 3 0V11M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6.5a1.5 1.5 0 0 1 3 0V14c0 4-2.5 7-6 7-2.6 0-4.4-1.4-5.6-3.6L3.6 14a1.5 1.5 0 0 1 2.6-1.5L8 15",
  "M9 18V5l11-2v13M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM20 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z","M3 12h4l2-5 4 10 2-5h6","M12 3.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM12 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM12 16.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4z",
  "M6 6a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM6 14a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM12 12h9M18 9l3 3-3 3","M20 11a8 8 0 0 0-14.5-4.5M4 13a8 8 0 0 0 14.5 4.5M5 3v4h4M19 21v-4h-4","M5 20v-7M9 20V8M13 20V8M17 20v-7M5 13c0-5 12-5 12 0","M5 4h14v16H5zM10 15V8l5-1v6M10 15a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM15 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"];
const ppSvg = i => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+PP_ICON[i]+'"/></svg>';
const PP={view:"path", id:null, L:null, step:0, items:[], ii:0, err:0, errStep:0, show:0, t0:0, tm:[], busy:0, lit:new Set(), zone:[], demo:new Map(), say:"", fb:"", fbk:"", bold:false, res:null, open:null, sayI:0};
// en: "a C", "an E" (bravo texts and prompts)
function ppArt(n){ return (/^[AEF]/.test(n)?"an ":"a ")+n; }
const ppNames = () => (S.settings.notation==="fr"?PC_FR:PC_EN);
const ppNN = pc => ppNames()[((pc%12)+12)%12];
function ppS(){ const o=S.pp&&typeof S.pp==="object"&&!Array.isArray(S.pp)?S.pp:{}; S.pp=o; o.v=PP_V;
  if(!o.done||typeof o.done!=="object"||Array.isArray(o.done)) o.done={}; if(!o.fail||typeof o.fail!=="object") o.fail={}; if(!PP_IDS.includes(o.cur)) o.cur=ppFirstOpen(o); return o; }
function ppFirstOpen(o){ const d=((o||S.pp||{}).done)||{}; return PP_IDS.find(id=>!d[id])||PP_IDS[PP_IDS.length-1]; }
const ppDoneN = () => PP_IDS.filter(id=>(((S.pp||{}).done)||{})[id]).length;
const ppNum = id => PP_IDS.indexOf(id)+1;
const ppReady = id => PP_READY.includes(id);
const ppInp = () => S.settings.input||"screen";
const ppStarsOf = id => ((((S.pp||{}).done)||{})[id]||{}).stars|0;
const ppTitle = id => t("ppTi")(ppNames())[PP_IDS.indexOf(id)];
const ppShortT = id => t("ppShort")(ppNames())[PP_IDS.indexOf(id)];
const ppStarted = () => !!(S.pp && (S.pp.start || Object.keys(S.pp.done||{}).length));
// ---- the lesson keyboard: same keys as the app's keyboard (.kbd/.wk/.bk), 2 octaves C3–C5 (1.5 on a phone held upright)
const ppNarrow = () => matchMedia("(max-width:640px) and (orientation:portrait)").matches;
const ppRange = () => (typeof PP_RANGE!=="undefined" && PP_RANGE[PP.id]) || (ppNarrow()?[48,69]:[48,72]);
const ppFold = m => { const [lo,hi]=ppRange(); while(m<lo) m+=12; while(m>hi) m-=12; return m; };
const ppKeys = pcs => { const [lo,hi]=ppRange(), o=[]; for(let m=lo;m<=hi;m++) if(pcs.includes(m%12)) o.push(m); return o; };
function ppGroups(n){ const [lo,hi]=ppRange(), out=[]; for(let c=lo-(lo%12);c<=hi;c+=12){ const g=(n===2?[1,3]:[6,8,10]).map(x=>c+x).filter(m=>m>=lo&&m<=hi); if(g.length) out.push(g); } return out; }
function ppKbHTML(){ const [lo,hi]=ppRange(), W=[], N=ppNames(); for(let m=lo;m<=hi;m++) if(NAT.includes(m%12)) W.push(m);
  const ww=100/W.length, bw=ww*.62; let h="";
  W.forEach((m,i)=>{ h+='<div class="wk" data-m="'+m+'" role="button" aria-label="'+esc(N[m%12])+'" style="--nc:var(--note-'+(m%12)+')"><span>'+esc(N[m%12])+'</span>'+(m===60?'<i class="pp-star" aria-hidden="true">★</i>':'')+'</div>';
    if([0,2,5,7,9].includes(m%12) && m+1<=hi) h+='<div class="bk" data-m="'+(m+1)+'" role="button" aria-label="'+esc(N[(m+1)%12])+'" style="--nc:var(--note-'+(m%12)+');left:'+((i+1)*ww-bw/2)+'%;width:'+bw+'%"><span></span></div>'; });
  return h; }
const ppKeyEl = m => { const k=$("ppKb"); return k && k.querySelector('[data-m="'+ppFold(m)+'"]'); };
function ppKeyCls(m, cls, ms){ const el=ppKeyEl(m); if(!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); if(ms) setTimeout(()=>el.classList.remove(cls),ms); }
function ppPaint(){ const k=$("ppKb"); if(!k) return; const lit=new Set([...PP.lit].map(ppFold)), zone=new Set(PP.zone.map(ppFold));
  k.querySelectorAll("[data-m]").forEach(el=>{ const m=+el.dataset.m, d=PP.demo.get(m); el.classList.toggle("pp-on",lit.has(m)); el.classList.toggle("pp-zone",zone.has(m));
    el.classList.toggle("pp-lit",!!d); if(d) el.style.setProperty("--lc",d); }); }
function ppLater(fn, ms){ const id=setTimeout(()=>{ PP.tm=PP.tm.filter(x=>x!==id); fn(); }, ms); PP.tm.push(id); }
function ppClearTimers(){ PP.tm.forEach(clearTimeout); PP.tm=[]; }
// ---- lessons (§3.3 of the beginner's path): each exercise step makes its items when it starts (random order each time)
const ppShuf = a => { a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
function ppPc(pcs, o){ return {...o, check:m=>pcs.includes(((m%12)+12)%12)?"ok":"bad", zone:o.zone||(()=>ppKeys(pcs)), showM:o.showM||(()=>[ppKeys(pcs).sort((a,b)=>Math.abs(a-60)-Math.abs(b-60))[0]])}; }
function ppRun(startOk, o){ const it={...o, got:[]}; // C, D, E in a row from a C (the exact notes: n, n+2, n+4)
  it.check=m=>{ const pc=((m%12)+12)%12; if(it.got.length){ const exp=it.got[0]+[0,2,4][it.got.length]; if(m===exp){ it.got.push(m); return it.got.length===3?"ok":"step"; } if(it.got.includes(m)) return "skip"; }
    if(pc===0 && startOk(m)){ it.got=[m]; return "step"; } return "bad"; };
  return it; }
function ppAllC(need, o){ const it={...o, got:[], need}; // every C, left to right
  it.check=m=>{ it.why=null; if(((m%12)+12)%12!==0) return "bad"; if(it.got.includes(m)) return "skip"; if(it.got.length && m<it.got[it.got.length-1]){ it.why="order"; return "bad"; } it.got.push(m); return it.got.length>=need?"ok":"step"; };
  return it; }
function ppEar(seq, o){ const it={...o, got:[], seq}; // listen and play back: the same pitch classes in the same order
  it.check=m=>{ if(((m%12)+12)%12===seq[it.got.length]){ it.got.push(m); return it.got.length===seq.length?"ok":"step"; } return "bad"; };
  it.play=()=>{ PP.demo.clear(); ppPaint(); seq.forEach((pc,i)=>ppLater(()=>{ tone(60+pc,0,.5,.26); PP.demo.set(60+pc,"var(--note-"+pc+")"); ppPaint(); ppLater(()=>{ PP.demo.delete(60+pc); ppPaint(); },380); },i*480)); };
  it.showM=()=>seq.map(pc=>60+pc); it.zone=()=>ppKeys([0,1,2,3,4]).filter(m=>m>=60&&m<=64); return it; }
function ppLesson(id){ const N=ppNames(), C=N[0], D=N[2], E=N[4], g2=ppGroups(2), g3=ppGroups(3);
  const watch=demo=>({k:"watch", demo});
  if(id==="p01"){ const W=t("pp01Where"), side=(g,i)=>()=>{ const ks=g.flat(); return [i===0?ks[0]:i===1?ks[ks.length-1]:ks[Math.floor(ks.length/2)]]; };
    const two=i=>ppPc([1,3],{say:t("pp01Two"), sub:W[i%3], sub1:t("pp01Black")(2), ok:t("ppGood"), zone:()=>g2.flat(), showM:side(g2,i%3)});
    const three=i=>ppPc([6,8,10],{say:t("pp01Three"), sub:W[i%3], sub1:t("pp01Black")(3), ok:t("ppGood"), zone:()=>g3.flat(), showM:side(g3,i%3)});
    return {steps:[watch(()=>{ ppSay(t("pp01W")[0]); let d=350; g2.forEach(g=>{ ppLater(()=>g.forEach((m,i)=>{ PP.demo.set(m,"#3d7bff"); tone(m,i*.16,.35,.2); ppPaint(); }),d); d+=850; });
        ppLater(()=>ppSay(t("pp01W")[1]),d); g3.forEach(g=>{ ppLater(()=>g.forEach((m,i)=>{ PP.demo.set(m,"#ff9a3c"); tone(m,i*.16,.35,.2); ppPaint(); }),d); d+=950; }); }),
      {k:"ex", mk:()=>[0,1,2].map(two)}, {k:"ex", mk:()=>[0,1,2].map(three)}, {k:"ex", mk:()=>ppShuf([two(2),two(0),three(1),three(2)])}],
      can:t("ppCan")(N)[0]}; }
  if(id==="p02"){ const Cs=ppKeys([0]), one=()=>ppPc([0],{say:t("ppPlay")(C), sub:t("ppFindC"), sub1:t("pp02Sub1"), ok:t("ppOk")(C), zone:()=>g2.flat().concat(Cs)});
    const need = ppInp()==="screen" ? Cs.length : 3;
    return {steps:[watch(()=>{ ppSay(t("pp02W")(N)[0]); const g=g2.find(x=>x[0]===61)||g2[0];
        ppLater(()=>{ g.forEach(m=>PP.demo.set(m,"#3d7bff")); ppPaint(); },300); ppLater(()=>{ PP.demo.set(g[0]-1,"var(--note-0)"); tone(g[0]-1,0,.6,.28); ppPaint(); },1100);
        ppLater(()=>{ ppSay(t("pp02W")(N)[1]); PP.demo.clear(); ppPaint(); },2300); Cs.forEach((m,i)=>ppLater(()=>{ PP.demo.set(m,"var(--note-0)"); tone(m,0,.5,.26); ppPaint(); },2600+i*650)); }),
      {k:"ex", mk:()=>[one(),one(),one()]},
      {k:"ex", mk:()=>[ppAllC(need,{say:t("pp02All")(C), sub:t("pp02AllS")(C), sub1:t("pp02Sub1"), zone:()=>Cs, showM:()=>Cs, bad:(m,it)=>it.why==="order"?t("pp02Order")(C):null})]},
      {k:"ex", mk:()=>[{say:t("pp02Mid")(C), sub:t("pp02MidS"), sub1:t("pp02MidS"), ok:t("ppOk")(C), check:m=>m===60?"ok":"bad", zone:()=>[60,61,62,63,64,65,66,67,68,69,70,71].filter(m=>m<=ppRange()[1]), showM:()=>[60], bad:m=>((m%12)+12)%12===0?t("pp02NotMid")(C):null}]}],
      can:t("ppCan")(N)[1]}; }
  if(id==="p03"){ const H=t("pp03Hint"), near=ppKeys([0,1,2,3,4]).filter(m=>m>=60&&m<=64), otherC=ppKeys([0]).find(m=>m!==60&&m+4<=ppRange()[1])||48;
    const run=(mid)=>ppRun(mid?(m=>m===60):(m=>m!==60),{say:t("pp03Run")(N), sub:mid?t("pp03From1")(C):t("pp03From2")(C), sub1:mid?t("pp03From1")(C):t("pp03From2")(C), ok:t("ppGood"), zone:()=>mid?near:[otherC,otherC+1,otherC+2,otherC+3,otherC+4], showM:()=>mid?[60,62,64]:[otherC,otherC+2,otherC+4]});
    const one=pc=>ppPc([pc],{say:t("ppPlay")(N[pc]), sub:H[pc/2], sub1:H[pc/2], ok:t("ppOk")(N[pc]), zone:()=>ppKeys([0,1,2,3,4])});
    const six=()=>{ const o=[]; let last=-1; while(o.length<6){ const pc=[0,2,4][Math.floor(Math.random()*3)]; if(pc===last) continue; o.push(pc); last=pc; } if(!o.includes(2)) o[2]=2; if(!o.includes(4)) o[4]=4; return o.map(one); };
    return {steps:[watch(()=>{ ppSay(t("pp03W")(N)[0]); const g=g2.find(x=>x[0]===61)||g2[0];
        ppLater(()=>{ g.forEach(m=>PP.demo.set(m,"#3d7bff")); ppPaint(); },300);
        [0,2,4].forEach((pc,i)=>ppLater(()=>{ PP.demo.set(60+pc,"var(--note-"+pc+")"); tone(60+pc,0,.55,.26); ppPaint(); },1100+i*700));
        ppLater(()=>ppSay(t("pp03W")(N)[1]),3400); }),
      {k:"ex", mk:()=>[run(true),run(false)]}, {k:"ex", mk:six},
      {k:"ex", mk:()=>ppShuf([ppEar([0,2,4],{say:t("pp03Ear"), sub:t("pp03EarS"), sub1:t("pp03EarS"), ok:t("ppGood")}), ppEar([4,2,0],{say:t("pp03Ear"), sub:t("pp03EarS"), sub1:t("pp03EarS"), ok:t("ppGood")})])}],
      can:t("ppCan")(N)[2]}; }
  return null; }
// ---- where to pick up: the lesson being played (< 24 h: the same step), else the next one
function ppResumeInfo(){ const p=S.pp; if(!p||typeof p!=="object") return null; const r=S.resume;
  let id=ppFirstOpen(p), step=0, old=false, next=false, err=0;
  if(r&&r.kind==="pp"&&PP_IDS.includes(r.id)){ id=r.id; step=r.step|0; err=r.err|0; if(Date.now()-(+r.at||0)>864e5 || r.v!==PP_V){ old=step>0; step=0; err=0; } next=!!r.fin && step===0; }
  if(!ppReady(id)) return null;
  const n=ppLesson(id).steps.length; step=Math.max(0,Math.min(step,n-1)); if(!step) err=0;
  return {id, step, old, next, err, n:ppNum(id), total:n+1}; }
function ppSaveResume(){ if(!PP.id||PP.view!=="lesson") return; S.resume={kind:"pp", id:PP.id, step:PP.step, at:Date.now(), v:PP_V, inp:ppInp(), err:PP.err}; save(); }
// ---- views
function ppGoPage(view){ PP.view=view; if(page!=="pp") openPage("pp"); else ppRender(); }
function ppBegin(){ const p=ppS(); p.on=true; if(!p.start) p.start=Date.now(); save(); ppGoPage("path"); setTimeout(()=>{ if(page==="pp" && PP.view==="path") ppRender(); },900); } // the input is set a moment later (MIDI access): « or play a C »
function ppOpen(id, step, err){ if(!ppReady(id)){ toast(t("ppSoonT")(ppNum(id))); return; } ppStop(); PP.open={id, step:step|0, err:err|0}; ppGoPage("open"); }
function ppStart(id, step, err){ const L=ppLesson(id); if(!L) return; const p=ppS(); p.on=true; if(!p.start) p.start=Date.now();
  ppStop(); PP.id=id; PP.L=L; PP.err=err|0; PP.show=0; PP.t0=Date.now(); PP.res=null; PP.view="lesson"; if(page!=="pp") openPage("pp"); ppStep(Math.min(step|0,L.steps.length-1)); }
function ppStep(s){ ppClearTimers(); autoHelpHide(); PP.step=s; PP.errStep=PP.err; PP.demo.clear(); PP.lit.clear(); PP.zone=[]; PP.fb=""; PP.fbk=""; PP.bold=false;
  const st=PP.L.steps[s]; PP.items = st.k==="ex" ? st.mk() : []; PP.ii=0; ppRender(); ppSaveResume();
  if(st.k==="watch") st.demo(); else ppItem(); }
function ppItem(){ const it=PP.items[PP.ii]; if(!it) return; it.err=0; PP.lit.clear(); PP.zone=[]; PP.fb=""; PP.fbk=""; PP.bold=false; PP.say=it.say; PP.busy=performance.now()+300; autoHelpHide(); ppPrompt(); ppPaint(); if(it.play) ppLater(it.play,450); }
function ppSay(x){ PP.say=x; const e=$("ppSay"); if(e){ e.textContent=x; e.classList.remove("pp-in"); void e.offsetWidth; e.classList.add("pp-in"); } }
function ppPrompt(){ const it=PP.items[PP.ii], s=$("ppSay"); if(!s) return; s.textContent=PP.say||"";
  const sub=$("ppSub"); sub.textContent = it ? (PP.bold&&it.sub1?it.sub1:it.sub)||"" : ""; sub.classList.toggle("pp-bold",PP.bold);
  const fb=$("ppFb"); fb.textContent=PP.fb; fb.className="pp-fb"+(PP.fbk?" "+PP.fbk:"");
  const c=$("ppCnt"); if(c){ const prog = it&&it.got&&it.need ? " · "+it.got.length+"/"+it.need : ""; c.textContent = PP.items.length ? (PP.ii+1)+"/"+PP.items.length+prog : ""; c.hidden=!PP.items.length; } }
function ppPress(m){ const el=ppKeyEl(m); if(!el) return; el.classList.add("k-press"); setTimeout(()=>el.classList.remove("k-press"),130); }
// notes from MIDI, the mic, the screen keys or the computer keyboard; a lone C (MIDI) goes on, a lone B starts the exercise again
function ppIn(b, lone){ if(page!=="pp" || anyModal()) return; b.forEach(ppPress);
  const v=PP.view, st=PP.L&&PP.L.steps[PP.step], k=v==="lesson"&&st?st.k:"";
  if(lone){ const pc=((b[0]%12)+12)%12;
    if(pc===0 && (v==="path"||v==="open"||v==="bravo"||(k==="watch"&&PP.id==="p01"))){ ppPrimary(); return; } // P02, P03: a C is an answer, only Bravo takes it to go on
    if(pc===11 && k==="ex"){ ppRestart(); return; } }
  if(k!=="ex" || performance.now()<PP.busy) return;
  for(const m of b){ if(PP.view!=="lesson"||performance.now()<PP.busy) break; ppAnswer(m); } }
function ppPrimary(){ const b=$("ppMain"); if(b && !b.hidden && !b.disabled) b.click(); }
function ppAnswer(m){ const it=PP.items[PP.ii]; if(!it) return; const r=it.check(m,it);
  if(r==="skip") return;
  if(r==="step"||r==="ok"){ if(it.got) PP.lit=new Set(it.got); else PP.lit.add(m);
    if(r==="step"){ ppPrompt(); ppPaint(); return; }
    PP.zone=[]; PP.fb=it.ok||t("ppOk")(ppNN(m)); PP.fbk="ok"; PP.bold=false; autoHelpHide(); ppPrompt(); ppPaint(); ppKeyCls(m,"k-hit",650);
    PP.busy=performance.now()+900; ppLater(ppNext,650); return; }
  PP.err++; it.err=(it.err||0)+1; ppKeyCls(m,"pp-warn",320);
  const why=(it.bad&&it.bad(m,it))||t("ppThatIs")(ppNN(m)); PP.bold=true; PP.fbk="bad";
  if(it.err===1) PP.fb=why; else { PP.fb=why+" "+t("ppLookZone"); PP.zone=it.zone?it.zone():[]; }
  ppPrompt(); ppPaint();
  if(it.err>=3) autoHelp({host:$("ppHelp"), title:t("ppTogether"), sub:t("ppTogetherS"), show:ppShowMe}); }
function ppShowMe(){ const it=PP.items[PP.ii]; if(!it) return; PP.show++; it.err=1; const ms=it.showM?it.showM():[];
  ms.forEach((m,i)=>ppLater(()=>{ tone(m,0,.6,.28); PP.demo.set(ppFold(m),"var(--reveal)"); ppPaint(); ppLater(()=>{ PP.demo.delete(ppFold(m)); ppPaint(); },700); },200+i*480)); }
function ppNext(){ PP.ii++; if(PP.ii<PP.items.length){ ppItem(); return; } if(PP.step+1<PP.L.steps.length) ppStep(PP.step+1); else ppFinish(); }
function ppRestart(){ PP.err=PP.errStep; ppStep(PP.step); }
function ppFinish(){ ppClearTimers(); autoHelpHide(); const id=PP.id, err=PP.err, p=ppS(), prev=p.done[id];
  const stars=Math.min(err<=1?3:err<=4?2:1, PP.show?2:3), xp0=S.xp|0, xp=PP_XP*PP_MULT;
  p.done[id]={at:prev&&prev.at||Date.now(), stars:Math.max(stars,prev?prev.stars|0:0), last:stars, err, sec:Math.round((Date.now()-PP.t0)/1000), tries:(prev?prev.tries|0:0)+1};
  p.cur=ppFirstOpen(p); p.step=0; if(PP_IDS.every(x=>p.done[x])) p.end=p.end||Date.now();
  addXP(xp); S.resume={kind:"pp", id:p.cur, step:0, at:Date.now(), v:PP_V, inp:ppInp(), fin:id};
  if(!prev) try{ ntfAdd({key:"pp-"+id, cat:"progress", type:"lvl", ti:t("ppDone")(ppNum(id)), tx:PP.L.can, act:{k:"learn",l:"ntfSee"}}); }catch(e){}
  save(); PP.res={stars, xp, xp0, first:!prev}; PP.view="bravo"; PP.items=[]; ppRender();
  [523.25,659.25,783.99].forEach((f,i)=>tone(72+[0,4,7][i],i*.09,.5,.16)); }
function ppStop(){ ppClearTimers(); if(PP.view==="lesson") ppSaveResume(); const h=$("autoHelp"); if(h && $("ppPanel") && $("ppPanel").contains(h)) h.hidden=true; PP.demo.clear(); }
function ppDots(ids, big){ const p=S.pp||{}, d=p.done||{}, cur=ppFirstOpen(p);
  return ids.map(id=>{ const i=PP_IDS.indexOf(id), n=i+1, st=d[id]?d[id].stars|0:0, cls=d[id]?"done":id===cur?"cur":"todo", ti=ppShortT(id);
    return '<button type="button" class="pp-dot '+cls+(ppReady(id)?'':' soon')+'" data-id="'+id+'" aria-label="'+esc(t("ppLesson")(n)+" · "+ppTitle(id)+(st?" · "+t("ppStarsA")(st):""))+'">'
      +(()=>{ const ck=d[id]?'<span class="pp-ck" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>':'', dn='<span class="pp-dn">'+n+'</span>';
        return big ? '<span class="pp-di">'+ppSvg(i)+dn+ck+'</span>' : dn+ck; })()
      +(big?'<span class="pp-dt">'+esc(ti)+'</span>':'')+(st?'<span class="pp-ds" aria-hidden="true">'+"★".repeat(st)+'<i>'+"★".repeat(3-st)+'</i></span>':'')+'</button>'; }).join(""); }
function ppDotClick(box){ box.querySelectorAll(".pp-dot").forEach(b=>b.onclick=e=>{ e.stopPropagation(); const id=b.dataset.id, d=((S.pp||{}).done||{})[id], cur=ppFirstOpen(S.pp);
  if(!ppReady(id)) toast(t("ppSoonT")(ppNum(id))); else if(d||id===cur){ const r=ppResumeInfo(); ppOpen(id, r&&r.id===id?r.step:0, r&&r.id===id?r.err:0); } else toast(t("ppFirst")(ppNum(cur))); }); }
function ppStepsBar(){ const L=PP.L, n=L.steps.length, cur=PP.view==="bravo"?n:PP.step, lbl=i=>i===0?t("ppWatch"):i===n?t("ppBravo"):t("ppYourTurnN")(i);
  return '<ol class="pp-steps" aria-label="'+esc(t("ppStepOf")(cur+1,n+1))+'">'+Array.from({length:n+1},(_,i)=>'<li class="'+(i<cur?"ok":i===cur?"cur":"")+'">'+(i===cur?'<b>'+esc(lbl(i))+'</b>':'')+'<i></i></li>').join("")+'</ol>'; }
function ppHead(){ const n=ppNum(PP.id);
  return '<div class="pp-top"><span class="pp-badge">'+PP_FOOT+'</span><div class="pp-tt"><small>'+esc(t("ppKick")(n))+'</small><b>'+esc(ppTitle(PP.id))+'</b></div>'+ppStepsBar()
    +'<span class="pp-cnt mono" id="ppCnt" hidden></span><button class="pp-x" type="button" id="ppX" aria-label="'+esc(t("ppQuit"))+'"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>'; }
const ppOrC = res => ppInp()==="midi" ? '<small class="pp-orc">'+esc(t(res?"ppOrCRes":"ppOrC")(CNAME()))+'</small>' : '';
function ppRender(){ const P=$("ppPanel"); if(!P) return; const v=PP.view;
  if((v==="lesson"||v==="bravo") && !PP.L){ PP.view="path"; return ppRender(); }
  if(v==="path"){ const p=ppS(), r=ppResumeInfo(), id=r?r.id:p.cur, n=ppNum(id), anyDone=ppDoneN()>0;
    P.innerHTML='<div class="pp-path"><div class="pp-ph"><span class="pp-badge big">'+PP_FOOT+'</span><h2>'+esc(t("ppHello2"))+'</h2></div><p class="pp-psub">'+esc(t("ppSub"))+'</p>'
      +'<div class="pp-pmap">'+ppDots(PP_IDS,true)+'</div><p class="pp-pcur">'+esc(t("ppLesson")(n)+" · "+ppTitle(id))+'</p>'
      +'<ul class="pp-prom">'+t("ppPromise").map((x,i)=>'<li>'+['<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>','<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>','<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="13" cy="4.5" r="1.8"/><path d="M9 21l2.5-6.5L14 17v4M8 11l3-3.5 3 2.5 3 1M11.5 14.5l-1-4"/></svg>'][i]+'<span>'+esc(x)+'</span></li>').join("")+'</ul>'
      +'<div class="pp-pgo"><button class="pp-main" type="button" id="ppMain"'+(r?'':' disabled')+'>'+esc(r?(anyDone||r.step?t("ppContinueN")(n):t("ppStartN")(n)):t("ppSoonT")(n))+(r?' <small>('+t("ppMin")(PP_MIN[n-1])+')</small>':'')+'</button>'+(r?ppOrC():'')+'</div></div>';
    $("ppMain").onclick=()=>{ const r2=ppResumeInfo(); if(r2) ppStart(r2.id,r2.step,r2.err); };
    ppDotClick(P.querySelector(".pp-pmap")); return; }
  if(v==="open"){ const o=PP.open||{id:"p01",step:0}, n=ppNum(o.id), i=PP_IDS.indexOf(o.id), L=ppLesson(o.id), IN=t("ppIn");
    P.innerHTML='<div class="pp-lesson pp-dim"><div class="pp-mid"></div><div class="pp-kbw"><div class="kbd pp-kb" id="ppKb" aria-hidden="true">'+ppKbHTML()+'</div></div>'
      +'<div class="pp-card pp-opencard" role="dialog" aria-labelledby="ppOT"><span class="pp-badge big">'+ppSvg(i)+'</span><small class="pp-k">'+esc(t("ppKick")(n))+'</small><h2 id="ppOT">'+esc(ppTitle(o.id))+'</h2>'
      +'<p>'+esc(t("ppWhat")(ppNames())[i]||"")+'</p><p class="pp-meta"><span>'+esc(t("ppMin")(PP_MIN[i]))+'</span><span>'+esc(IN[ppInp()]||IN.screen)+'</span></p>'
      +(o.step?'<p class="pp-again">'+esc(t("ppResumeStep")(o.step+1))+'</p>':'')
      +'<button class="pp-main" type="button" id="ppMain">'+esc(t("ppGo"))+'</button>'+ppOrC()+'<button class="pp-link" type="button" id="ppToMap">'+esc(t("ppBackMap"))+'</button></div></div>';
    $("ppMain").onclick=()=>ppStart(o.id,o.step,o.err); $("ppToMap").onclick=()=>openPage("learn"); return; }
  if(v==="bravo"){ const r=PP.res||{stars:1,xp:0}, n=ppNum(PP.id), nx=ppFirstOpen(S.pp), nxOk=ppReady(nx)&&!(S.pp.done||{})[nx], li=levelInfo(S.xp), win=Math.max(0,Math.min(PP_IDS.length-7,PP_IDS.indexOf(PP.id)-3));
    P.innerHTML='<div class="pp-lesson pp-dim">'+ppHead()+'<div class="pp-mid"></div><div class="pp-kbw"><div class="kbd pp-kb" id="ppKb" aria-hidden="true">'+ppKbHTML()+'</div></div>'
      +'<div class="pp-card pp-bravo" role="dialog" aria-labelledby="ppBT"><small class="pp-k">'+esc(t("ppKick")(n))+'</small><h2 id="ppBT">'+esc(t("ppDone")(n))+'</h2>'
      +'<p class="pp-stars" aria-label="'+esc(t("ppStarsA")(r.stars))+'">'+[0,1,2].map(i=>'<span class="'+(i<r.stars?"on":"")+'" style="--d:'+(i*220)+'ms">★</span>').join("")+'</p>'
      +'<div class="pp-can"><small>'+esc(t("ppNowYouCan"))+'</small><p>'+esc(PP.L.can)+'</p></div>'
      +'<div class="pp-xp"><b class="mono">+'+fmtN(r.xp)+' XP</b><span class="pp-x2">'+esc(t("ppXp2"))+'</span><span class="pp-bar"><i style="width:'+Math.round(100*li.into/li.need)+'%"></i></span><small>'+esc(t("endNext")(fmtN(li.need-li.into),fmtN(li.L+1)))+'</small></div>'
      +'<div class="pp-mini">'+ppDots(PP_IDS.slice(win,win+7),false)+'</div>'
      +'<div class="pp-bgo"><button class="pp-main" type="button" id="ppMain">'+esc(nxOk?t("ppNext"):t("ppBackMap"))+(nxOk?' <small>('+t("ppMin")(PP_MIN[ppNum(nx)-1])+')</small>':'')+'</button>'+ppOrC()+'</div>'
      +'<div class="pp-blinks">'+(r.stars<3?'<button class="pp-link" type="button" id="ppAgain">'+esc(t("ppRetry3"))+'</button>':'')+'<button class="pp-link" type="button" id="ppDoneDay">'+esc(t("ppStop"))+'</button></div></div></div>';
    $("ppMain").onclick=()=>{ if(nxOk) ppStart(nx,0,0); else openPage("learn"); };
    if($("ppAgain")) $("ppAgain").onclick=()=>ppStart(PP.id,0,0); $("ppDoneDay").onclick=()=>openPage("hub"); $("ppX").onclick=()=>openPage("learn"); ppDotClick(P.querySelector(".pp-mini")); return; }
  // lesson
  const st=PP.L.steps[PP.step], watchS=st.k==="watch", IN=t("ppIn"), ear=!!(PP.items[0]&&PP.items[0].play);
  P.innerHTML='<div class="pp-lesson">'+ppHead()+'<div class="pp-mid"><small class="pp-k">'+esc(watchS?t("ppWatch"):t("ppYourTurnN")(PP.step))+'</small><p class="pp-say" id="ppSay" aria-live="polite"></p><p class="pp-sub" id="ppSub"></p><p class="pp-fb" id="ppFb" role="status"></p></div>'
    +'<div class="pp-help" id="ppHelp"></div><div class="pp-kbw"><div class="kbd pp-kb" id="ppKb" aria-label="Piano">'+ppKbHTML()+'</div></div>'
    +'<div class="pp-foot"><span class="pp-inp">'+esc(IN[ppInp()]||IN.screen)+'</span><span class="pp-push"></span>'
    +(watchS?'<button class="btn" type="button" id="ppReplay">'+esc(t("ppReplay"))+'</button><span class="pp-gow"><button class="pp-main" type="button" id="ppMain">'+esc(t("ppYourTurn"))+'</button>'+(PP.id==="p01"?ppOrC():'')+'</span>'
      :(ear?'<button class="btn" type="button" id="ppListen">'+esc(t("ppListen"))+'</button>':'')+'<button class="btn" type="button" id="ppRestart">'+esc(t("ppRestart"))+'</button>')+'</div></div>';
  $("ppX").onclick=()=>openPage("learn");
  if(watchS){ $("ppMain").onclick=()=>ppStep(PP.step+1); $("ppReplay").onclick=()=>ppStep(PP.step); }
  else { $("ppRestart").onclick=ppRestart; if($("ppListen")) $("ppListen").onclick=()=>{ const it=PP.items[PP.ii]; if(it&&it.play) it.play(); }; }
  const kb=$("ppKb");
  kb.addEventListener("pointerdown",e=>{ const el=e.target.closest("[data-m]"); if(!el) return; e.preventDefault(); const m=+el.dataset.m; try{ tone(m); }catch(er){} ppIn([m],false); });
  kb.addEventListener("contextmenu",e=>e.preventDefault());
  ppPrompt(); if(watchS) ppSay(PP.say||""); ppPaint(); }
// ---- LEARN: the compact map (D7); everyone sees it, folded to one line for players who already play and have not started
function ppRenderMap(){ const lp=$("learnPanel"); if(!lp) return; let el=$("ppMap");
  if(!el){ el=document.createElement("section"); el.id="ppMap"; el.className="pp-map"; lp.insertBefore(el,$("learnTiles")); }
  const p=S.pp||{}, n=ppDoneN(), r=ppResumeInfo(), lvl=S.onb&&S.onb.level, fold=!ppStarted() && !(lvl==="debut"||lvl==="notes");
  el.classList.toggle("fold",fold); el.setAttribute("aria-label",t("ppName"));
  const id=r?r.id:ppFirstOpen(p), sub = fold ? t("ppFold") : r ? t("ppLesson")(ppNum(id))+" · "+ppTitle(id)+" · "+t("ppMin")(PP_MIN[ppNum(id)-1]) : t("ppSoonT")(ppNum(id));
  el.innerHTML='<button class="pp-mh" type="button" id="ppMapOpen"><span class="pp-badge">'+PP_FOOT+'</span><span class="pp-mt"><b>'+esc(t("ppName"))+'</b><small>'+esc(sub)+'</small></span></button>'
    +(fold?'':'<div class="pp-mdots">'+ppDots(PP_IDS,false)+'</div>')+'<span class="pp-mc mono"><b>'+n+'</b>/14</span>'
    +(fold?'<button class="pp-main sm" type="button" id="ppMapGo">'+esc(t("ppDiscover"))+'</button>':r?'<button class="pp-main sm" type="button" id="ppMapGo">'+esc(n||r.step?t("ppContinue"):t("ppBegin"))+'</button>':'');
  $("ppMapOpen").onclick=()=>{ ppS(); ppGoPage("path"); };
  if($("ppMapGo")) $("ppMapGo").onclick=()=>{ if(fold){ ppBegin(); return; } const r2=ppResumeInfo(); if(r2) ppOpen(r2.id,r2.step,r2.err); };
  if(!fold) ppDotClick(el); }
// ---- hub: « Pick up » (D8), only once the path has started (or for a beginner)
function ppRenderResume(){ const hm=document.querySelector("#hubPanel .hub-main"); if(!hm) return; let el=$("ppResume");
  if(!el){ el=document.createElement("button"); el.type="button"; el.id="ppResume"; el.className="pp-res"; hm.insertBefore(el,hm.querySelector(".hub-grid")); el.onclick=ppResumeGo; }
  const r=ppResumeInfo(), show=!!r && (ppStarted() || (S.onb&&S.onb.level==="debut")) && !(ppAllDone() && !r.step); el.hidden=!show; /* all 14 done (or placed past them): no « Lesson 14 » card, the general « Pick up » / Ma route card takes over */ document.body.classList.toggle("pp-hasres",show); if(!show) return;
  const k = r.step ? t("ppResume") : r.next ? t("ppNext") : t("ppName"), pct=Math.round(100*r.step/r.total);
  el.innerHTML='<span class="pp-rk">'+esc(k)+'</span><b class="pp-rt">'+esc(t("ppLesson")(r.n)+" · "+ppTitle(r.id))+'</b>'
    +'<span class="pp-rbar"><span class="pp-bar"><i style="width:'+pct+'%"></i></span><small>'+esc(t("ppStepOf")(r.step+1,r.total)+" · "+t("ppMin")(PP_MIN[r.n-1]))+'</small></span>'
    +'<span class="pp-rgo"><span class="pp-rbtn">'+esc(t("ppContinue"))+'</span>'+(ppInp()==="midi"?'<small>'+esc(t("ppOrCRes")(CNAME()))+'</small>':'')+'</span><span class="pp-ri" aria-hidden="true">'+ppSvg(r.n-1)+'</span>'; }
function ppResumeGo(){ const r=ppResumeInfo(); if(r) ppOpen(r.id,r.step,r.err); }
// ---- hooks into the app (wrapped here so the rest of the source stays as it was)
{ const P=document.createElement("section"); P.className="mode-page pp-page"; P.id="ppPanel"; P.setAttribute("aria-label","Premiers pas"); const lp=$("learnPanel"); lp.parentNode.insertBefore(P,lp.nextSibling); }
{ const _op=openPage; openPage=function(pg){ if(page==="pp" && pg!=="pp" && !INFO_PAGES.includes(pg)) ppStop(); const r=_op.apply(this,arguments); if(page==="pp" && pg==="pp") ppRender(); return r; }; }
{ const _rl=renderLearn; renderLearn=function(){ _rl.apply(this,arguments); try{ ppRenderMap(); }catch(e){ console.warn(e); } }; }
{ const _hs=renderHubSide; renderHubSide=function(){ _hs.apply(this,arguments); try{ ppRenderResume(); }catch(e){ console.warn(e); } }; }
{ const _sn=setNav; setNav=function(){ _sn.apply(this,arguments); if(page==="pp") $("mbTitle").textContent=t("ppName"); }; }
{ const _mf=midiFlush; midiFlush=function(){ // the lesson page gets every note; on the hub a lone C (MIDI) picks the lesson up
    if(!FN.on && !LV.on && (page==="pp" || page==="hub")){ const b=midiBuf.slice().sort((a,c)=>a-c), lone=midiBufMidi && b.length===1;
      if(page==="pp"){ midiBuf=[]; midiBufMidi=true; ppIn(b,lone); return; }
      if(lone && b[0]%12===0 && !anyModal() && $("ppResume") && !$("ppResume").hidden){ midiBuf=[]; midiBufMidi=true; ppResumeGo(); return; } }
    return _mf.apply(this,arguments); }; }
document.addEventListener("keydown",e=>{ if(page!=="pp" || anyModal() || document.body.classList.contains("drawer") || e.target.matches("input,select,textarea")) return; // letters A–; play the keys, as on the other pages
  const m=CODE_MAP[e.code]; if(m==null||e.repeat||e.metaKey||e.ctrlKey||e.altKey) return; tone(m); midiIn(m); });
{ const _ms=mergeState; mergeState=function(local, cloud){ const r=_ms.apply(this,arguments); const isO=x=>x&&typeof x==="object"&&!Array.isArray(x), c=isO(cloud)?cloud:{}, a=isO(local.pp)?local.pp:null, b=isO(c.pp)?c.pp:null;
    if(a||b){ const o={...(b||{}), ...(a||{})}, d={}; // lessons: union, best stars; current lesson: the furthest; fails: max
      [b,a].forEach(p=>{ if(p&&isO(p.done)) Object.entries(p.done).forEach(([k,v])=>{ if(!isO(v)) return; const x=d[k]; d[k]=!x?{...v}:{...x,...v, stars:Math.max(+x.stars||0,+v.stars||0), tries:Math.max(+x.tries||0,+v.tries||0), at:Math.min(+x.at||+v.at||0,+v.at||+x.at||0)}; }); });
      o.done=d; const ix=id=>PP_IDS.indexOf(id), cs=[a&&a.cur,b&&b.cur].filter(x=>PP_IDS.includes(x)).sort((x,y)=>ix(y)-ix(x)); if(cs.length){ o.cur=cs[0]; o.step=(a&&a.cur===o.cur?a.step:b&&b.cur===o.cur?b.step:0)|0; }
      const f={}; [b,a].forEach(p=>{ if(p&&isO(p.fail)) Object.entries(p.fail).forEach(([k,v])=>{ f[k]=Math.max(f[k]|0,v|0); }); }); o.fail=f;
      const st=[a&&a.start,b&&b.start].filter(Boolean); if(st.length) o.start=Math.min(...st); r.merged.pp=o; }
    const ra=isO(local.resume)?local.resume:null, rb=isO(c.resume)?c.resume:null; if(ra||rb) r.merged.resume = !ra ? rb : !rb ? ra : (+rb.at||0)>(+ra.at||0) ? rb : ra; // the most recent
    r.changed=JSON.stringify(r.merged)!==JSON.stringify(local); return r; }; }

