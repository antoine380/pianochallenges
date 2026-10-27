// fragment de l'IIFE principale — ordre 150, voir src/app/README.md
// ---------- Solfège: the notes written on a staff (setting S.settings.staff; clef S.settings.clef; reading mode S.settings.staffRead) ----------
const staffOn = () => !!S.settings.staff && typeof Staff!=="undefined";
const staffClef = () => S.settings.clef||"auto";
function noteHex(pc){ return getComputedStyle(document.documentElement).getPropertyValue("--note-"+(((pc%12)+12)%12)).trim()||"#7a5bf5"; }
const SC_MODE={major:"major",pmaj:"major",minor:"minor",pmin:"minor",harm:"minor",blues:"minor",mel:"minor",dor:"dorian",mix:"mixolydian",lyd:"lydian",phr:"phrygian",loc:"locrian"};
function staffKeyOf(it){ if(!it||typeof Staff==="undefined") return null; const tn=tonicNote(it.k); if(!tn) return null;
  if(it.sec==="scales") return Staff.keyOf(tn.l, tn.a, SC_MODE[it.tid]||"major");
  if(it.sec==="harmony") return Staff.keyOf(tn.l, tn.a, HTYPE[it.tid].scale==="minor"?"minor":"major");
  if(it.sec==="prog") return Staff.keyOf(tn.l, tn.a, PROG[it.tid].scale==="minor"?"minor":"major");
  return null; }
// spelled note for a MIDI number, from the spelled notes of the exercise (same pitch class)
function spellFrom(list, m){ const pc=((m%12)+12)%12, n=(list||[]).find(x=>x&&x.pc===pc); return n ? {m, l:n.l, a:n.a} : {m}; }
const readMode = () => staffOn() && !!S.settings.staffRead;
let staffRaf=0; const staffSoon=()=>{ if(!staffRaf) staffRaf=requestAnimationFrame(renderStaff); };
function renderStaff(){ staffRaf=0; const box=$("staffBox"); if(!box) return;
  const on = staffOn() && cur && cur.sec!=="ear" && seq.length && (page==="practice"||page==="daily");
  box.hidden=!on; document.body.classList.toggle("staff-on", !!on); document.body.classList.toggle("staff-seq", !!on && !chSeq() && !chordLike(cur.sec)); if(!on){ box.innerHTML=""; return; }
  const rev = phase==="revealed" || phase==="success", read = readMode(), revHex = getComputedStyle(document.documentElement).getPropertyValue("--reveal").trim()||"#7a5bf5";
  const vis = (pc,f) => f ? {color:noteHex(pc)} : rev ? {color:revHex} : read ? {} : null; // found: its colour; shown answer: reveal colour; reading: written in ink
  let events=[], cursor=null;
  if(chSeq()){
    events=seq.map((st,i)=>({notes:st.voicing.map(m=>{ const pc=((m%12)+12)%12, f = i<pStep || (i===pStep && pFound.has(pc)), v=vis(pc,f); return v ? {...spellFrom(st.notes||[],m), ...v} : null; }).filter(Boolean)}));
    if(phase==="listening") cursor=pStep;
  } else if(chordLike(cur.sec)){
    const rm=revealMidis(); events=[{notes:rm.map((m,i)=>{ const v=vis(seq[i]&&seq[i].pc, !!found[i]); return v ? {...spellFrom(seq,m), ...(seq[i]?{l:seq[i].l,a:seq[i].a}:{}), m, ...v} : null; }).filter(Boolean)}];
  } else {
    const rm=revealMidis(); events=seq.map((n,i)=>{ const v=vis(n.pc, !!found[i]); return {notes: v ? [{m:rm[i], l:n.l, a:n.a, ...v}] : []}; });
    if(phase==="listening") cursor=idx;
  }
  const w=Math.max(240, box.clientWidth||600), sp=Math.max(6.5, Math.min(10, w/68, (innerHeight<520?7:10)));
  const labels = !read && !chordLike(cur.sec) && !chSeq() && (S.settings.labels||S.settings.guideN) ? seq.map((n,i)=>found[i]||rev ? noteName(n) : "") : null;
  try{ box.innerHTML=Staff.render({events, key:staffKeyOf(cur), clef:staffClef(), width:w, sp, cur:cursor, labels, aria:t("staffAria")}).svg; }catch(e){ box.innerHTML=""; }
  if(read && phase==="listening"){ $("prompt").textContent=t("readT"); } }
// games: the target written on a staff
function pcsToNotes(pcs, label){ const flat=/♭|b(?![a-z])/.test(label||""); let prev=-1; return pcs.map((pc,i)=>{ let m=60+pc; if(i===0 && pc>7) m-=12; while(m<=prev) m+=12; prev=m; return Staff.spell(m, flat); }); }
function staffTargetSVG(it, w, sp){ if(!staffOn()||!it) return ""; try{ return Staff.render({events:[{notes:pcsToNotes(it.pcs,it.label)}], clef:staffClef()==="bass"?"bass":staffClef()==="grand"?"grand":"treble", width:w||180, sp:sp||9, key:null, aria:it.label}).svg; }catch(e){ return ""; } }
let bravuraReady=false; function bravura(){ if(bravuraReady||!document.fonts) return; document.fonts.load("40px Bravura").then(()=>{ bravuraReady=true; staffSoon(); }).catch(()=>{}); }
// canvas version for Note Jumper: 5 lines, clef, heads (Bravura glyphs)
function rnStaff(g, it, cx, top, u, ink){ if(!bravuraReady){ bravura(); return false; } const sp=6*u, fs=sp*4, ns=pcsToNotes(it.pcs,it.label), x0=cx-sp*5, x1=cx+sp*5, yb=top+sp*6.2; // E4 on the bottom line
  g.save(); g.fillStyle="rgba(255,255,255,.96)"; rr(g,x0-sp,top,x1-x0+sp*2,sp*8.6,sp*1.4); g.fill(); g.strokeStyle="rgba(27,24,56,.14)"; g.lineWidth=Math.max(1,u); g.stroke();
  g.strokeStyle=ink; g.lineWidth=Math.max(1,sp*.13); for(let i=0;i<5;i++){ g.beginPath(); g.moveTo(x0,yb-i*sp); g.lineTo(x1,yb-i*sp); g.stroke(); }
  g.fillStyle=ink; g.font=fs+"px Bravura"; g.textAlign="left"; g.textBaseline="alphabetic"; g.fillText("",x0+sp*.2,yb-sp);
  const D=n=>Staff.diat(n), y=d=>yb-(d-30)*sp/2; let prevD=-9, off=0;
  ns.forEach(n=>{ const d=D(n); off = d-prevD===1 && !off ? sp*1.18 : 0; prevD=d; const hx=cx+off-sp*0.3;
    for(let L=28; L>=d; L-=2){ g.beginPath(); g.moveTo(hx-sp*.4,y(L)); g.lineTo(hx+sp*1.6,y(L)); g.stroke(); }
    for(let L=40; L<=d; L+=2){ g.beginPath(); g.moveTo(hx-sp*.4,y(L)); g.lineTo(hx+sp*1.6,y(L)); g.stroke(); }
    if(n.a) g.fillText(n.a>0?"":"", hx-sp*1.35, y(d)); g.fillText("", hx, y(d)); });
  g.restore(); return true; }

