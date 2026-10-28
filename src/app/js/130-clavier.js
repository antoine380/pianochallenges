// fragment de l'IIFE principale — ordre 130, voir src/app/README.md
// ---------- Keyboard ----------
const kbd=document.getElementById("kbd");
const narrowMQ=window.matchMedia("(max-width:640px)");
const tabMQ=window.matchMedia("(min-width:641px) and (max-width:900px) and (orientation:portrait)"); // tablet held upright: two octaves, so the keys stay wide enough to be tall
const kbNarrow=()=>narrowMQ.matches||tabMQ.matches;
let LOW=48, HIGH=72, keyEls={};
function phoneStart(){
  if(!cur||!seq.length) return 48;
  if(cur.sec==="ear") return 48;
  let pc = chSeq() ? seq[0].voicing[0]%12 : chordLike(cur.sec) ? seq[0].pc : tonicNote(cur.k).pc;
  while(!NAT.includes(pc)) pc--; return 48+pc;
}
const KB_PRESETS={"24":[48,71],"25":[48,72],"32":[41,72],"37":[48,84],"49":[36,84],"61":[36,96],"76":[28,103],"88":[21,108]};
const kbFull = () => (S.settings.kbdSize||"auto")!=="auto";
const octName = m => (S.settings.notation==="fr"?PC_FR:PC_EN)[m%12]+(Math.floor(m/12)-(S.settings.notation==="fr"?2:1));
function buildKeyboard(){
  const size=S.settings.kbdSize||"auto";
  if(size!=="auto"){ // the same keys as the player's MIDI keyboard
    let [lo,hi] = size==="custom" ? [S.settings.kbdLow,S.settings.kbdHigh] : KB_PRESETS[size];
    while(!NAT.includes(lo%12)) lo--; while(!NAT.includes(hi%12)) hi++; LOW=lo; HIGH=hi;
  } else if(kbNarrow()){ // phone: 10 white keys from the white key at/below the tonic (upright tablet: 15)
    const nw=narrowMQ.matches?10:15; LOW=phoneStart(); let m=LOW, w=0; while(w<nw){ if(NAT.includes(m%12)) w++; if(w<nw) m++; } HIGH=m;
  } else { LOW=48; HIGH=84; } // desktop: three octaves C3–C6
  kbd.innerHTML=""; keyEls={};
  const whites=[]; for(let m=LOW;m<=HIGH;m++) if(NAT.includes(m%12)) whites.push(m);
  const ww=100/whites.length, bw=ww*.62;
  kbd.style.minWidth = size!=="auto" ? whites.length*(narrowMQ.matches?30:16)+"px" : "";
  whites.forEach((m,i)=>{
    const el=document.createElement("div"); el.className="wk"; el.dataset.m=m; el.style.setProperty("--nc","var(--note-"+(m%12)+")"); el.appendChild(document.createElement("span")); keyA11y(el,m);
    kbd.appendChild(el); keyEls[m]=el;
    if([0,2,5,7,9].includes(m%12) && m+1<=HIGH){
      const b=document.createElement("div"); b.className="bk"; b.dataset.m=m+1; b.style.setProperty("--nc","var(--note-"+(m%12)+")"); b.style.left=((i+1)*ww-bw/2)+"%"; b.style.width=bw+"%";
      b.appendChild(document.createElement("span")); keyA11y(b,m+1); kbd.appendChild(b); keyEls[m+1]=b; }
  });
  labelKeys();
  if(phase==="revealed") showReveal(true);
  else markPlayed();
}
function keyNames(){
  // names of the 12 pitch classes: the notes of the current exercise keep their own spelling (E♭ major is written with flats),
  // the other keys follow the key signature (flats in a flat key, sharps otherwise)
  const not=S.settings.notation;
  const notes=[]; if(cur && seq.length) seq.forEach(x=>{ if(x.notes) x.notes.forEach(n=>notes.push(n)); else if(x.pc!=null) notes.push(x); });
  const flat = notes.some(n=>n.a<0) && !notes.some(n=>n.a>0);
  const names=(not==="fr" ? (flat?PC_FR_B:PC_FR) : (flat?PC_EN_B:PC_EN)).slice();
  notes.forEach(n=>{ names[n.pc] = Math.abs(n.a)>=2 ? enhName(n) : nameIn(n,not); }); // a double sharp / flat is labelled by the key it lands on
  return names;
}
function labelKeys(){
  const names=keyNames();
  const full=kbFull();
  Object.entries(keyEls).forEach(([m,el])=>{ const pc=m%12; el.querySelector("span").textContent = pc===0 && full ? octName(+m) : (S.settings.labels||pc===0)?names[pc]:""; });
}
const fold = m => { while(m<LOW) m+=12; while(m>HIGH) m-=12; return m; };
function scrollKbdTo(m){
  const wrap=$("kbdWrap"), el=keyEls[fold(m)]; if(!el || wrap.scrollWidth<=wrap.clientWidth+2) return;
  wrap.scrollTo({left:Math.max(0, el.offsetLeft - wrap.clientWidth/2 + 60), behavior:"auto"}); // instant: the player should not wait for the keyboard to stop at the start of a round
}
const kbdPtr=new Map(); // pointerId -> key held down (the key stays down until the finger or the mouse is released)
kbd.addEventListener("pointerdown", e=>{
  const el=e.target.closest("[data-m]"); if(!el) return;
  e.preventDefault(); if(!md4Screen()) return; // MIDI 4 : en entrée « micro », le clavier à l'écran est un affichage
  const m=+el.dataset.m; keyDown(m,true); kbdPtr.set(e.pointerId,m); pressKey(m); tone(m); midiIn(m); // key lit before the grouping; same 35 ms grouping as MIDI (two-finger chords)
});
// keys are buttons for assistive tech (not in the Tab order: the letter keys are the shortcuts); Enter/Space on a focused key plays it
function keyA11y(el,m){ el.setAttribute("role","button"); el.tabIndex=-1; el.setAttribute("aria-label",(S.settings.notation==="fr"?PC_FR:PC_EN)[m%12]+" "+(Math.floor(m/12)-(S.settings.notation==="fr"?2:1))); }
kbd.addEventListener("keydown", e=>{ const el=e.target.closest("[data-m]"); if(!el || (e.code!=="Enter" && e.code!=="Space")) return; e.preventDefault(); e.stopPropagation(); if(!md4Screen()) return; const m=+el.dataset.m; tone(m); noteIn(m); });
function pressKey(m){ const el=keyEls[fold(m)]; if(!el) return; el.classList.add("k-press"); setTimeout(()=>el.classList.remove("k-press"),130); }
// k-down: the key stays down while the note is held (MIDI note-off, pointer up, key up); k-press (130 ms) stays for the mic
function keyDown(m,on){ const el=keyEls[fold(m)]; if(el) el.classList.toggle("k-down",on); }
["pointerup","pointercancel","pointerleave"].forEach(ty=>kbd.addEventListener(ty,e=>{ const m=kbdPtr.get(e.pointerId); if(m!=null){ kbdPtr.delete(e.pointerId); keyDown(m,false); } }));
document.addEventListener("keyup",e=>{ const m=CODE_MAP[e.code]; if(m!=null) keyDown(fold(m),false); });
kbd.addEventListener("contextmenu", e=>e.preventDefault());
const CODE_MAP={KeyA:60,KeyW:61,KeyS:62,KeyE:63,KeyD:64,KeyF:65,KeyT:66,KeyG:67,KeyY:68,KeyH:69,KeyU:70,KeyJ:71,KeyK:72,KeyO:73,KeyL:74,KeyP:75,Semicolon:76};
document.addEventListener("keydown", e=>{
  if(helpOpen){ if(e.code==="Escape") closeHelp(); else if(e.code==="ArrowRight") tutGo(1); else if(e.code==="ArrowLeft") tutGo(-1); return; }
  if(endOpen){ if(e.code==="Escape") closeEnd(); return; }
  if(midiOpen){ if(e.code==="Escape") closeMidi(); return; }
  if(setOpen){ if(e.code==="Escape") closeSet(); return; }
  if(e.target.matches("input,select,textarea")) return;
  if(document.body.classList.contains("drawer")){ if(e.code==="Escape") closeDrawer(); return; }
  if(openMods.length){ if(e.code==="Escape") closeMod(openMods[openMods.length-1]); return; }
  if(e.code==="Escape" && typesOpen){ closeTypes(); return; }
  // Play: only the note letters are forwarded to the frame (no host sound); other pages without an exercise ignore the keyboard
  if(page==="play"){ const m=CODE_MAP[e.code]; if(m!=null && !e.repeat && !e.metaKey && !e.ctrlKey && !e.altKey) noteIn(fold(m)); return; }
  if(page==="quiz"){ const m=CODE_MAP[e.code]; if(m!=null && !e.repeat && !e.metaKey && !e.ctrlKey && !e.altKey) midiIn(fold(m)); return; }
  if(page==="piano"){ pnKey(e); return; }
  if(!["practice","daily","games","free"].includes(page)) return;
  if((page==="games"||page==="free") && (e.code==="Space"||e.code==="Enter"||e.code==="Backspace")) return;
  if(e.code==="Space"){ e.preventDefault(); primaryAction(); return; }
  if(e.code==="Enter" && phase==="revealed"){ e.preventDefault(); grade(true); return; }
  if(e.code==="Backspace" && phase==="revealed"){ e.preventDefault(); grade(false); return; }
  const m=CODE_MAP[e.code]; if(m==null||e.repeat||e.metaKey||e.ctrlKey||e.altKey) return;
  if(!md4Screen()) return; // MIDI 4 : micro = l'écran et les lettres ne jouent pas
  const mm=fold(m); pressKey(mm); keyDown(mm,true); tone(mm); midiIn(mm);
});
function flashKey(m, cls, ms=220){ const el=keyEls[fold(m)]; if(!el) return; el.classList.add(cls); setTimeout(()=>el.classList.remove(cls), ms); }
function clearKeys(){ Object.values(keyEls).forEach(el=>el.classList.remove("k-ok","k-rev","k-hit","k-bad","k-guide")); }
// guide: light up what to play next (the next note, the rest of the chord, or the current chord of a sequence)
function guideKeys(){
  Object.values(keyEls).forEach(el=>el.classList.remove("k-guide"));
  if(!guideKeysOn() || phase!=="listening" || !cur || cur.sec==="ear" || page==="games" || page==="free" || !seq.length) return;
  let ms;
  if(chSeq()){ if(!seq[pStep]) return; ms=seq[pStep].voicing.map(fold); } // the last chord just found: nothing next
  else if(chordLike(cur.sec)){ const rm=revealMidis(); ms=rm.filter((m,i)=>!found[i]); }
  else ms=[revealMidis()[idx]];
  ms.forEach(m=>keyEls[m]?.classList.add("k-guide"));
}


