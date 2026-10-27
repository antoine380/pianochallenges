// fragment de l'IIFE principale — ordre 070, voir src/app/README.md
// ---------- Harmony: chords of a key ----------
const HTYPES = [
  {id:"maj",  lvl:1, scale:"major", sev:false, fr:"Tonalités Majeures", en:"Major Keys"},
  {id:"min",  lvl:2, scale:"minor", sev:false, fr:"Tonalités Mineures", en:"Minor Keys"},
  {id:"maj7", lvl:4, scale:"major", sev:true,  fr:"Majeures · 7e",      en:"Major Keys · 7ths"},
  {id:"min7", lvl:5, scale:"minor", sev:true,  fr:"Mineures · 7e",      en:"Minor Keys · 7ths"},
];
const HTYPE = Object.fromEntries(HTYPES.map(x=>[x.id,x]));
const CSUF = {dim:"°",aug:"+",maj7:"maj7",dom7:"7",min7:"7",hdim7:"ø7",dim7:"°7"};
function hChord(scale, key, deg, sev){
  const sc=spellIv(key, TYPE[scale].iv);
  const notes=[0,2,4].concat(sev?[6]:[]).map(o=>sc[(deg+o)%7]);
  const r=notes[0], semis=notes.map(n=>(n.pc-r.pc+12)%12);
  const ct=CTYPES.find(c=>c.iv.length===semis.length && c.iv.every((v,i)=>v===semis[i]));
  if(!ct){ // chords of the harmonic / melodic minor that are not in the chord list
    const x=HEXTRA[semis.join(",")]||{sym:"?"};
    return {notes, ct:null, sym:x.sym, roman:(x.low?ROMAN[deg].toLowerCase():ROMAN[deg])+(x.sup||""), root:r};
  }
  let roman=ROMAN[deg]; if(["min","dim","min7","hdim7","dim7"].includes(ct.id)) roman=roman.toLowerCase();
  return {notes, ct:ct.id, roman:roman+(CSUF[ct.id]||""), root:r};
}
const HEXTRA={"0,3,7,11":{sym:"m(maj7)",low:true,sup:"maj7"},"0,4,8,11":{sym:"+maj7",sup:"+maj7"},"0,4,8,10":{sym:"+7",sup:"+7"}};
const chordSymOf = st => st.ct ? symOf(st.ct, st.root) : noteName(st.root)+st.sym;
// the 7 chords of a scale, in root position, climbing from the tonic (plus the octave chord when the scale has it)
function scaleChordSteps(tid, key, sev, dir){
  const sc=spellIv(key, TYPE[tid].iv), b0=48+sc[0].pc;
  const steps=[0,1,2,3,4,5,6].map(d=>{ const ch=hChord(tid,key,d,sev); const b=b0+((ch.root.pc-sc[0].pc+12)%12); return {...ch, inv:0, voicing:voiceAt(ch.notes,0,b), bassPc:ch.root.pc}; });
  if(S.settings.octave){ const ch=hChord(tid,key,0,sev); steps.push({...ch, inv:0, voicing:voiceAt(ch.notes,0,b0+12), bassPc:ch.root.pc}); }
  return dir==="down" ? steps.reverse() : steps;
}

