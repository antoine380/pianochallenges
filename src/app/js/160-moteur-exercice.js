// fragment de l'IIFE principale — ordre 160, voir src/app/README.md
// ---------- Game ----------
let phase="idle", cur=null, seq=[], found=[], played=[], idx=0, errors=0, startT=0, deadline=0, combo=0, raf=0, advanceTimer=0, lastId=null;
let pStep=0, pFound=new Set(), earPick=null, playTimers=[];
const $=id=>document.getElementById(id);
let page="practice", typesOpen=false;
const sufKey = () => "suite_"+S.section;

function pickNext(){
  const p=pool(), sk=sufKey();
  if(S.section!=="ear" && S.settings.mode==="suite"){ const it=p[(S[sk]||0) % p.length]; S[sk]=((S[sk]||0)+1)%p.length; return it; }
  const cand = p.length>1 ? p.filter(x=>mkey(x)!==lastId) : p;
  const w=cand.map(x=>6-mastI(x)); let r=Math.random()*w.reduce((a,b)=>a+b,0);
  for(let i=0;i<cand.length;i++){ r-=w[i]; if(r<=0) return cand[i]; } return cand[cand.length-1];
}
const dirOf = () => cur && cur.sec==="scales" ? (cur.dir||"up") : "up";
const chSeq = () => !!cur && (cur.sec==="prog" || (cur.sec==="scales" && !!cur.ch));
function buildSeq(){
  if(cur.sec==="chords") return spellChord(cur.tid, cur.k, cur.inv);
  if(cur.sec==="harmony"){ const h=HTYPE[cur.tid]; return hChord(h.scale,cur.k,cur.deg,h.sev).notes; }
  if(cur.sec==="prog") return progSteps(cur.tid, cur.k, S.settings.vl);
  if(cur.sec==="scales" && cur.ch) return scaleChordSteps(cur.tid, cur.k, !!S.settings.sc7, dirOf());
  if(cur.sec==="ear") return [];
  const dir=dirOf();
  let sq=spellType(cur.tid, cur.k, dir);
  if(S.settings.octave) sq=sq.concat([sq[0]]);
  if(dir==="down") sq=sq.slice().reverse();
  return sq;
}
function seqMidis(){
  // ascending midi numbers (for playback / reveal), reversed when a scale is descending
  if(cur && cur.sec==="ear") return earMidis(cur);
  if(cur && chSeq()) return seq[0].voicing.slice();
  const down=dirOf()==="down";
  const asc = down ? seq.slice().reverse() : seq;
  const tpc=asc[0].pc; let prev=-1; const base=60+tpc-(tpc>5?12:0);
  const ms=asc.map(n=>{ let m=base+((n.pc-tpc)%12+12)%12; while(m<=prev) m+=12; prev=m; return m; });
  return down ? ms.reverse() : ms;
}
function clearPlayTimers(){ playTimers.forEach(clearTimeout); playTimers=[]; }
function startRound(item, retry){
  fgStep=-1;
  clearTimeout(advanceTimer); clearPlayTimers(); audio();
  if(!retry){
    if(!game) game=makeGame(null);
    else game.i++;
    // a game on one chosen scale / chord / progression: play it again until it is nailed (12 tries at most)
    if(game.single && game.i>=game.total && game.total<12){ const last=game.results[game.total-1]; if(last && last.level!=="good"){ game.queue.push({...game.queue[0]}); game.total++; } }
    if(game.i>=game.total){ finishGame(); return; }
    if(game.queue && !item) item=game.queue[game.i];
  }
  if(item && item.sec!==S.section){ S.section=item.sec; save(); renderSettings(); }
  cur=item||pickNext();
  if(cur.sec==="scales" && !(retry && cur.dir)) cur={...cur, dir: S.settings.dir==="mix" ? (Math.random()<.5?"up":"down") : S.settings.dir};
  if(cur.sec==="ear" && cur.root==null){
    const span = cur.tid==="scale" ? 0 : cur.tid==="int" ? 9 : 10;
    cur={...cur, root:(cur.tid==="scale"?48:52)+Math.floor(Math.random()*(span+1))+(cur.tid==="scale"?Math.floor(Math.random()*8):0)};
  }
  lastId=mkey(cur); seq=buildSeq(); found=seq.map(()=>false); played=[]; idx=0; hintStage=0; hintUsed=false; hintT=performance.now(); errors=0; pStep=0; pFound=new Set(); earPick=null;
  // retry after a reveal: the answer was shown, so a success now only earns the guided-mode XP
  if(retry && game && game.results[game.i] && game.results[game.i].solved===false) hintUsed=true;
  phase="listening"; startT=performance.now();
  const per = chSeq() ? seq.length : 1;
  deadline=(S.settings.delay>0 && cur.sec!=="ear") ? startT+S.settings.delay*1000*per : 0;
  if(kbNarrow() && !kbFull() && LOW!==phoneStart()) buildKeyboard();
  clearKeys(); resetScore(); $("stage").classList.remove("res-good","res-warn","res-bad");
  S.settings[SEC[cur.sec].view]=cur.tid;
  render(); cancelAnimationFrame(raf); raf=requestAnimationFrame(tick);
  if(cur.sec!=="ear" && seq.length) scrollKbdTo(revealMidis()[0]);
  if(cur.sec==="ear") setTimeout(()=>{ if(phase==="listening") playScale(0); },150);
}
function tick(){
  if(phase!=="listening") return;
  if(S.settings.guideP && cur && cur.sec!=="ear"){ const st=Math.min(2,Math.floor((performance.now()-hintT)/HINT_MS)); if(st>hintStage){ hintStage=st; hintUsed=true; renderSlots(); renderActions(); } }
  if(deadline){
    const per = chSeq() ? seq.length : 1;
    const left=Math.max(0,deadline-performance.now()), frac=left/(S.settings.delay*1000*per);
    $("tFill").style.transform="scaleX("+frac+")"; $("tFill").classList.toggle("low",frac<.25);
    $("secs").textContent=(left/1000).toFixed(1).replace(".", S.settings.lang==="fr"?",":".")+" s";
    if(left<=0){ reveal(true); return; }
  }
  raf=requestAnimationFrame(tick);
}
// most keyboards say their size in their name ("Keystation 49", "Launchkey 61"...); a few are known models
// a virtual MIDI port of the system (macOS / iOS "Network Session 1" / « Session réseau 1 », IAC driver) is not a keyboard: never listed nor listened to
// virtual ports are not keyboards (macOS / iOS network sessions « Session réseau », IAC buses): never listed, counted nor listened to.
// Case and accents do not matter (iOS may send decomposed accents).
// MIDI 4 (Antoine : « Logic Pro Virtual Out » pris pour un clavier) : les ports logiciels ne sont jamais des claviers. Liste courte, à compléter :
const MIDI_VIRTUAL=[
  "virtual","virtuel",                         // « Logic Pro Virtual Out/In », « Virtual MIDI », ports virtuels en français
  "network","session","reseau",                // macOS / iOS : « Network Session 1 », « Session réseau 1 »
  "\\biac\\b","\\bbus\\b",                   // macOS : « IAC Driver Bus 1 », « Gestionnaire IAC »
  "logic pro","garageband","mainstage","ableton","fl studio","bitwig","cubase","reaper", // logiciels de musique (ports créés par l'application)
  "loopmidi","loopbe","rtpmidi","virmidi","bome","vmpk", // Windows / Linux : câbles virtuels, MIDI réseau, traducteurs
  "midi ?through","through port",              // Linux : « Midi Through Port-0 »
  "wavetable"                                  // Windows : « Microsoft GS Wavetable Synth » (une sortie, pas un clavier)
];
const MIDI_VIRTUAL_RE=new RegExp(MIDI_VIRTUAL.join("|"));
const midiVirtual = n => MIDI_VIRTUAL_RE.test(String(n||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase());
// the size a keyboard's name says (null: the name does not tell)
const kbdSzOf = name => { const n=String(name||""), m=n.match(/(^|\D)(24|25|32|37|49|61|76|88)(\D|$)/);
  return m ? m[2] : /lumi|piano ?m\b|keys block/i.test(n) ? "24" : /mpk ?mini(?! ?plus)|launchkey mini|minilab|nanokey|flkey mini|microlab|xkey/i.test(n) ? "25" : /keystep|oxygen pro mini/i.test(n) ? "32" : /seaboard block|songmaker/i.test(n) ? "24" : /rise ?2?/i.test(n) ? "49" : null; };
function guessKbdSize(name){
  if(!name || S.settings.kbdGuessFor===name) return;
  const sz=S.settings.kbdSize||"auto", old=S.settings.kbdGuessFor, size=kbdSzOf(name);
  // MIDI 3 : une taille que l'app a mise pour UN AUTRE clavier (les 24 touches d'un LUMI, ou le modèle choisi dans la liste) ne reste pas collée
  // au clavier suivant (un 25 touches : son Do du haut faisait sauter l'écran d'une octave) : nouvelle devinette, ou automatique
  const mine = /^\d+$/.test(sz) && ((old && kbdSzOf(old)===sz) || (S.settings.kbdCat && S.settings.kbdCat!==name));
  S.settings.kbdGuessFor=name;
  if(mine && size!==sz){ S.settings.kbdSize=size||"auto"; save(); buildKeyboard(); renderSettings(); return; }
  if(size && sz==="auto"){ S.settings.kbdSize=size; save(); buildKeyboard(); renderSettings(); }
  else save();
}
// keep the on-screen keyboard on the same keys as the MIDI keyboard: if a played note is outside, shift by octaves
function followMidi(n){
  if(n>=LOW && n<=HIGH) return;
  if(midiWiden(n)) return; // MIDI 3 : un clavier plus grand que l'écran (le Do du haut d'un 25 touches) élargit l'écran au lieu de le décaler
  const shift = n<LOW ? -Math.ceil((LOW-n)/12)*12 : Math.ceil((n-HIGH)/12)*12; let lo=LOW+shift, hi=HIGH+shift;
  const hw=(S.midi&&S.midi.hw)||{}; if(hw.lo>=21 && hw.hi>hw.lo && hw.hi-hw.lo<=HIGH-LOW && n>=hw.lo && n<=hw.hi){ hi=hw.lo+(HIGH-LOW); lo=hw.lo; } // the measured keyboard (M9) fits: show it whole, in one move
  if(lo<21 || hi>108) return;
  Object.assign(S.settings,{kbdSize:"custom",kbdLow:lo,kbdHigh:hi}); save(); buildKeyboard(); renderSettings();
  if(cur && typeof markPlayed==="function") markPlayed();
}
// a C on the MIDI keyboard starts the game, continues after an answer, or starts a new game from the summary
function midiStart(note){
  const pc=note%12; if((pc!==0&&pc!==11) || !(page==="practice"||page==="daily") || setOpen || openMods.length || helpOpen || midiOpen || S.settings.midiC===false) return false;
  if(pc===11) return midiRestart();
  if(page==="daily" && !game && !endOpen){ startDaily(); return true; }
  if(endOpen && lastGame && lastGame.label){ if(lastGame.single) endNext(lastGame); else endReplay(lastGame); return true; }
  if(endOpen){ closeEnd(); if(page==="daily") return true; idleStart(); return true; }
  if(phase==="idle" || phase==="success"){ idleStart(); return true; }
  if(phase==="revealed"){ grade(true); return true; }
  return false;
}
// a lone B: start the same thing again (the summary of a game, a revealed answer, a nailed exercise); during an exercise a B is an ordinary note
function midiRestart(){
  if(endOpen){ const rw=document.getElementById("endRework"); if(rw){ rw.click(); return true; } if(lastGame && lastGame.label){ endReplay(lastGame); return true; } return false; }
  if(phase==="revealed"){ grade(false); return true; }
  if(phase==="success" && cur){ clearTimeout(advanceTimer); startRound({...cur, dir:null},true); return true; }
  return false; }
// MIDI notes that arrive together (a block chord) are processed lowest first
let midiBuf=[], midiTimer=0, midiReady=false;
// Notes that arrive within 35 ms form one group. A lone C from the MIDI keyboard starts / continues (midiStart); a chord that
// happens to contain a C does not. Notes received within 300 ms after "continue" (grade(true)) are only shown, not graded.
let midiBufMidi=true, roundSwitchAt=0;
function midiIn(m, fromMidi){ midiBuf.push(m); if(!fromMidi) midiBufMidi=false; clearTimeout(midiTimer); midiTimer=setTimeout(midiFlush,35); }
function midiFlush(){
  const b=midiBuf.sort((a,c)=>a-c), lone=midiBufMidi && b.length===1; midiBuf=[]; midiBufMidi=true;
  if(FN.on){ b.forEach(x=>fnNote(x)); return; }
  if(performance.now()-roundSwitchAt<300){ b.forEach(x=>{ pressKey(x); flashKey(x,"k-hit"); }); return; }
  if(lone && midiStart(b[0])) return;
  b.forEach(x=>noteIn(x));
}
function hitSlot(j, m){ try{ achInc("notes"); }catch(e){}
  found[j]=true; if(!chordLike(cur.sec)) hintReset(); idx=found.filter(Boolean).length; played.push(fold(m)); markPlayed(); renderSlots(j);
  if(idx===seq.length) success();
}
function wrongNote(m){
  errors++; flashKey(m,"k-bad",300);
  const sr=$("srNote"); sr.textContent=""; sr.textContent=t("wrongSr")+(S.settings.notation==="fr"?PC_FR:PC_EN)[m%12]; // screen readers hear the wrong note
  const mb=$("sbMiss"); mb.textContent=t("errors")(errors); mb.hidden=false;
  const at = chSeq() ? pStep : chordLike(cur.sec) ? found.indexOf(false) : idx;
  const sl=$("slots").children[at]; if(sl){ sl.classList.remove("err","pop"); void sl.offsetWidth; sl.classList.add("err"); }
  if(errors===3 && phase==="listening") autoHelp();
}
// three wrong notes on the same item: a hand is offered (see the answer, listen, then try again), never forced
// o (optional, Premiers pas): {host, title, sub, show} = where the band goes, its texts and what « Show me » does
function autoHelp(o){ o=o||{}; let h=$("autoHelp"); if(!h){ h=document.createElement("div"); h.id="autoHelp"; h.className="auto-help"; h.setAttribute("role","status"); }
  const host=o.host||$("stage"); if(h.parentNode!==host) host.appendChild(h);
  h.innerHTML='<div><b></b><small></small></div><button class="btn" type="button" data-a="try"></button><button class="btn primary" type="button" data-a="show"></button>';
  h.querySelector("b").textContent=o.title||t("helpT"); h.querySelector("small").textContent=o.sub||t("helpS");
  const [tr,sh]=h.querySelectorAll("button"); tr.textContent=t("helpTry"); sh.textContent=t("helpShow");
  tr.onclick=()=>{ h.hidden=true; }; sh.onclick=()=>{ h.hidden=true; if(o.show) o.show(); else if(phase==="listening") reveal(false); }; h.hidden=false; }
function noteIn(m){ lastNoteAt=Date.now();
  if(FN.on){ fnNote(m); return; } // the first screen (mic)
  if(LV.on) return; // the leave window is open
  if(page==="quiz"){ if(!anyModal()) quizIn("screen",m); return; } // screen keyboard, computer keyboard, mic
  if(page==="play"){ playSend("noteon",m); setTimeout(()=>playSend("noteoff",m),400); return; } // screen keyboard / mic: no release event, so release after 400 ms
  if(!["practice","daily","games","free"].includes(page)) return; // no exercise on the other pages: nothing to feed
  if(midiOpen){ pressKey(m); flashKey(m,"k-hit"); return; } // MIDI window: the notes only test the keyboard
  if(anyModal()) return; // help, end of game, info pages, any other window: the round is paused
  if(page==="games"||page==="free"){ pressKey(m); flashKey(m,"k-hit"); if(page==="games") runnerNote(m); return; }
  if(endOpen) return;
  pressKey(m);
  if(phase!=="listening" || cur.sec==="ear"){ flashKey(m,"k-hit"); return; }
  const pc=((m%12)+12)%12;
  if(chSeq()){
    const st=seq[pStep], pcs=st.notes.map(n=>n.pc);
    if(pFound.has(pc)){ flashKey(m,"k-hit",150); return; }
    if(!pcs.includes(pc)){ wrongNote(m); return; }
    if(cur.sec==="prog" && S.settings.vl && pFound.size===0 && pc!==st.bassPc){ wrongNote(m); return; }
    pFound.add(pc); played.push(fold(m)); markPlayed(); try{ achInc("notes"); }catch(e){}
    if(pFound.size===pcs.length){ try{ achInc("chords"); }catch(e){}
      found[pStep]=true; idx=found.filter(Boolean).length; const done=pStep; pStep++; pFound=new Set(); hintReset();
      renderSlots(done);
      if(idx===seq.length){ success(); return; }
      setTimeout(()=>{ if(phase==="listening"){ played=[]; clearKeys(); renderSlots(); } },260);
    }
    return;
  }
  if(chordLike(cur.sec)){
    const done = seq.some((n,i)=>found[i]&&n.pc===pc);
    if(done){ flashKey(m,"k-hit",150); return; }
    if(!found[0]){ if(pc===seq[0].pc) hitSlot(0,m); else wrongNote(m); return; } // the bass decides the inversion
    const j=seq.findIndex((n,i)=>!found[i]&&n.pc===pc);
    if(j>=0) hitSlot(j,m); else wrongNote(m);
    return;
  }
  if(pc===seq[idx].pc){ hitSlot(idx,m); }
  else if(idx>0 && pc===seq[idx-1].pc){ flashKey(m,"k-hit",150); }
  else wrongNote(m);
}
function markPlayed(){ played.forEach(m=>keyEls[fold(m)]?.classList.add("k-ok")); try{ renderFiche2(); }catch(e){} }
function success(){
  phase="success"; cancelAnimationFrame(raf);
  const secs=(performance.now()-startT)/1000, remaining=deadline?Math.max(0,(deadline-performance.now())/1000):0, perfect=errors===0;
  combo=perfect?combo+1:0; if(game) game.maxCombo=Math.max(game.maxCombo||0,combo);
  // time bonus: share of the allotted time still left (0..10), weighted by the difficulty (5 s x1.5, 10 s x1.2, 20 s x1); no timer: +4 when answered within 8 s
  let tb=0;
  if(deadline){ const per=chSeq()?seq.length:1, d=S.settings.delay||1, coef=d<=5?1.5:d<=10?1.2:1; tb=Math.round(Math.round(10*remaining/(d*per))*coef); }
  else if(secs<8) tb=4;
  let gain=10+tb+(perfect?5:0)+Math.min(combo,10)*2;
  if(cur.sec==="scales" && seq.length>=8) gain+=2;
  if(cur.sec==="chords" && cur.inv) gain+=3;
  if(cur.sec==="prog") gain+=seq.length*3+(S.settings.vl?6:0);
  if(cur.sec==="scales" && cur.ch) gain+=seq.length*2+(S.settings.sc7?4:0);
  if(cur.sec==="ear") gain=8+Math.min(combo,10)*2;
  else if(S.settings.guideN||S.settings.guideK||hintUsed) gain=Math.max(2,Math.round(gain/2));
  try{ if(chordLike(cur.sec)) achInc("chords"); if(cur.inv) achInc("inv"); }catch(e){}
  bumpStreak(); addXP(gain); record(roundLevel(), secs); save();
  if(cur.sec!=="ear"){ const root=48+((chSeq()?seq[0].root.pc:seqMidis()[0])%12); [0,4,7,12].forEach((iv,i)=>tone(root+iv+24,i*.07,.5,.16)); }
  const sep=S.settings.lang==="fr"?",":".";
  if(cur.sec==="ear"){ showEar(true,gain); }
  else showScore([perfect?t("perfect"):t("errors")(errors), "+"+gain+" XP", secs.toFixed(1).replace(".",sep)+" s"]);
  if(cur.sec==="ear") showEarKeys();
  render();
  if(S.settings.autoNext!==false) advanceTimer=setTimeout(()=>{ if(phase!=="success") return; if(anyModal()) pendingAdv=true; else startRound(); }, cur.sec==="ear"?1900:1700);
}
function revealMidis(){
  // the answer as one ascending run, shifted by octaves to sit inside the visible keyboard
  let ms=seqMidis(); const asc=dirOf()==="down"?ms.slice().reverse():ms;
  let k=0; while(asc[0]+12*k<LOW) k++; while(asc[asc.length-1]+12*k>HIGH && asc[0]+12*(k-1)>=LOW) k--;
  if(played.length && cur.sec!=="ear"){ // follow the octave the player actually used, when the whole run still fits
    const k2=Math.round((played[0]-ms[found.indexOf(true)>=0?found.indexOf(true):0])/12);
    if(ms.every(m=>m+12*k2>=LOW && m+12*k2<=HIGH)) k=k2;
  }
  return ms.map(m=>m+12*k);
}
// time (ms) at which note/chord i of the answer sounds, so keys and boxes appear with it
function revealAt(i){
  if(!cur) return 0;
  if(chSeq()) return 150+i*1100;
  if(chordLike(cur.sec)) return 150+i*220;
  return 150+i*300;
}
let revealDone=false;
// step-by-step help: 0 = degree only, 1 = + chord / note name, 2 = + keys lit. Advances every HINT_MS, or with the hint button.
let hintStage=0, hintT=0, hintUsed=false; const HINT_MS=8000;
const guideNamesOn = () => !!S.settings.guideN || (!!S.settings.guideP && hintStage>=1);
const guideKeysOn = () => !!S.settings.guideK || (!!S.settings.guideP && hintStage>=2);
function autoHelpHide(){ const h=$("autoHelp"); if(h) h.hidden=true; }
function hintReset(){ const was=hintStage; hintStage=0; hintT=performance.now(); if(was && S.settings.guideP) renderActions(); }
function hintMore(){ if(hintStage>=2) return false; hintStage++; hintUsed=true; hintT=performance.now(); renderSlots(); renderActions(); return true; }
function showReveal(instant){
  if(chSeq()){ clearKeys(); return; }
  if(cur.sec==="ear"){ showEarKeys(); return; }
  // one continuous run: notes already found in green now, the missing ones in blue one by one
  Object.values(keyEls).forEach(el=>el.classList.remove("k-ok","k-rev"));
  revealMidis().forEach((m,i)=>{ const el=keyEls[m]; if(!el) return;
    if(found[i]) el.classList.add("k-ok");
    else if(instant||revealDone) el.classList.add("k-rev");
    else playTimers.push(setTimeout(()=>{ const e2=keyEls[m]; if(e2 && phase==="revealed") e2.classList.add("k-rev"); }, revealAt(i))); });
  if(!instant) playTimers.push(setTimeout(()=>{ revealDone=true; }, revealAt(seq.length)));
}
function showEarKeys(){ clearKeys(); revealMidis().forEach(m=>keyEls[m]?.classList.add(phase==="success"?"k-ok":"k-rev")); }
function lightChord(v, cls){ clearKeys(); v.forEach(m=>keyEls[fold(m)]?.classList.add(cls)); }
function playScale(delay=.15){
  if(!cur) return;
  clearPlayTimers();
  if(chSeq()){
    seq.forEach((st,i)=>{ const at=delay+i*1.1; st.voicing.forEach(m=>tone(m,at,1.0,.17)); tone(st.voicing[0]-12,at,1.0,.12);
      if(phase!=="listening") playTimers.push(setTimeout(()=>{ fgStep=i; lightChord(st.voicing,"k-rev"); markNow(i); }, at*1000)); });
    if(phase!=="listening") playTimers.push(setTimeout(()=>markNow(-1), (delay+seq.length*1.1)*1000));
    return;
  }
  const ms=seqMidis();
  if(cur.sec==="ear"){
    if(cur.tid==="int"){ tone(ms[0],delay,.7,.24); tone(ms[1],delay+.75,.7,.24); tone(ms[0],delay+1.6,1.1,.18); tone(ms[1],delay+1.6,1.1,.18); return; }
    if(cur.tid==="chord"){ ms.forEach((m,i)=>tone(m,delay+i*.2,.4,.2)); ms.forEach(m=>tone(m,delay+ms.length*.2+.1,1.3,.17)); return; }
    ms.forEach((m,i)=>tone(m,delay+i*.28,.45,.22)); return;
  }
  if(chordLike(cur.sec)){ ms.forEach((m,i)=>tone(m,delay+i*.22,.45,.22)); ms.forEach(m=>tone(m,delay+ms.length*.22+.1,1.3,.18)); return; }
  ms.forEach((m,i)=>tone(m,delay+i*.3,.5,.24));
}
function markNow(i){ if(i<0) fgStep=-1; [...$("slots").children].forEach((el,j)=>el.classList.toggle("now",j===i)); }
function reveal(auto){ autoHelpHide();
  if(phase!=="listening") return;
  phase="revealed"; cancelAnimationFrame(raf); combo=0;
  record(roundLevel(), null); save(); // no streak credit for a revealed answer
  revealDone=false; playScale(); showReveal();
  if(cur.sec==="ear") showEar(false,0);
  else showScore([seq.length-idx?(chSeq()?t("missedP"):t("missed"))(seq.length-idx):"", errors?t("errors")(errors):""]);
  render();
  if(S.settings.autoNext!==false){
    const playMs = chSeq() ? seq.length*1100+600 : cur.sec==="ear" ? 2800 : (seq.length*300+1400);
    advanceTimer=setTimeout(()=>{ if(phase!=="revealed") return; if(anyModal()) pendingAdv=true; else grade(true); }, playMs+2500);
  }
}
function earAnswer(id){
  if(phase!=="listening" || cur.sec!=="ear") return;
  earPick=id;
  if(id===cur.k) success();
  else { errors=1; reveal(false); }
}
function grade(next){
  // after an answer: Continue moves on, Retry replays the same item (same exercise of the game)
  if(phase!=="revealed") return;
  if(next){ roundSwitchAt=performance.now(); startRound(); } else startRound({...cur}, true);
}
// a Do / Space with nothing running: on the start screen it starts the chosen item (or replays the last one)
function idleStart(){ if(page==="practice" && !game && phase==="idle"){ suStart(); return; } startRound(); }
function primaryAction(){
  if(page==="daily" && !game && (phase==="idle"||phase==="success")){ startDaily(); return; }
  if(phase==="idle"||phase==="success") idleStart();
  else if(phase==="listening"){ if(cur.sec==="ear") playScale(0); else if(!(S.settings.guideP && hintMore())) reveal(false); }
  else if(phase==="revealed") grade(true);
}
function switchSection(sec){
  if(S.section===sec) return;
  clearTimeout(advanceTimer); cancelAnimationFrame(raf); clearPlayTimers();
  S.section=sec; save(); phase="idle"; cur=null; seq=[]; found=[]; played=[]; idx=0; errors=0; game=null;
  clearKeys(); $("stage").classList.remove("res-good","res-warn","res-bad");
  if(kbNarrow()) buildKeyboard();
  renderSettings(); render();
}

