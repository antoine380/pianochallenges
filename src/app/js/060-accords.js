// fragment de l'IIFE principale — ordre 060, voir src/app/README.md
// ---------- Chords ----------
const CTYPES = [
  {id:"maj",   lvl:1, fr:"Majeur",          en:"Major",           sym:"",     iv:[0,4,7],    ls:[0,2,4]},
  {id:"min",   lvl:1, fr:"Mineur",          en:"Minor",           sym:"m",    iv:[0,3,7],    ls:[0,2,4]},
  {id:"dim",   lvl:2, fr:"Diminué",         en:"Diminished",      sym:"°",    iv:[0,3,6],    ls:[0,2,4]},
  {id:"aug",   lvl:2, fr:"Augmenté",        en:"Augmented",       sym:"+",    iv:[0,4,8],    ls:[0,2,4]},
  {id:"sus2",  lvl:3, fr:"Sus2",            en:"Sus2",            sym:"sus2", iv:[0,2,7],    ls:[0,1,4]},
  {id:"sus4",  lvl:3, fr:"Sus4",            en:"Sus4",            sym:"sus4", iv:[0,5,7],    ls:[0,3,4]},
  {id:"maj7",  lvl:3, fr:"Majeur 7",        en:"Major 7",         sym:"maj7", iv:[0,4,7,11], ls:[0,2,4,6]},
  {id:"dom7",  lvl:3, fr:"7 de Dominante",  en:"Dominant 7",      sym:"7",    iv:[0,4,7,10], ls:[0,2,4,6]},
  {id:"min7",  lvl:4, fr:"Mineur 7",        en:"Minor 7",         sym:"m7",   iv:[0,3,7,10], ls:[0,2,4,6]},
  {id:"hdim7", lvl:5, fr:"Demi-Diminué",    en:"Half-Diminished", sym:"ø7",   iv:[0,3,6,10], ls:[0,2,4,6]},
  {id:"dim7",  lvl:5, fr:"Diminué 7",       en:"Diminished 7",    sym:"°7",   iv:[0,3,6,9],  ls:[0,2,4,6]},
];
const CTYPE = Object.fromEntries(CTYPES.map(x=>[x.id,x]));
function spellIvL(tonic, iv, ls){
  const {L,acc}=parse(tonic), li=LETTERS.indexOf(L), tpc=(NAT[li]+acc+12)%12;
  return iv.map((s,i)=>{ const l=LETTERS[(li+ls[i])%7], pc=(tpc+s)%12;
    let a=((pc-NAT[LETTERS.indexOf(l)])%12+12)%12; if(a>6) a-=12; return {l,a,pc}; });
}
function spellChord(tid, root, inv){ const ty=CTYPE[tid], b=spellIvL(root, ty.iv, ty.ls); return b.slice(inv).concat(b.slice(0,inv)); }
const CROOTS = {};
CTYPES.forEach(ty=>{
  const rows=[];
  for(let pc=0;pc<12;pc++){
    const ni=NAT.indexOf(pc);
    const cands = ni>=0 ? [LETTERS[ni]] : [LETTERS[NAT.indexOf(pc-1)]+"#", LETTERS[NAT.indexOf(pc+1)]+"b"];
    let best=null;
    cands.forEach(c=>{ const sc=spellIvL(c, ty.iv, ty.ls); const score=sc.reduce((s,n)=>s+Math.abs(n.a)+(Math.abs(n.a)>1?100:0),0);
      const flat=sc[0].a<0?1:0; if(!best||score<best.score) best={name:c,score,flat}; });
    rows.push({...best,pc});
  }
  // white-key roots first (C D E F G A B), then black-key roots in keyboard order
  const white=pc=>NAT.includes(pc)?0:1;
  rows.sort((a,b)=>white(a.pc)-white(b.pc) || a.pc-b.pc);
  CROOTS[ty.id]=rows.map(r=>r.name);
});
function chordToneLabel(n, root){
  const ld=(LETTERS.indexOf(n.l)-LETTERS.indexOf(root.l)+7)%7, semis=(n.pc-root.pc+12)%12;
  if(ld===0) return t("rootLbl");
  let d=semis-MAJ[ld]; if(d>6) d-=12; if(d<-6) d+=12;
  return (d===-2?"𝄫":d<0?"♭".repeat(-d):d>0?"♯".repeat(d):"")+(ld+1);
}
const chordSym = (tid,root) => noteName(tonicNote(root))+(S.settings.notation==="fr"&&CTYPE[tid].sym?" ":"")+CTYPE[tid].sym;
const chordName = (tid,root) => noteName(tonicNote(root))+" "+(S.settings.lang==="fr"?CTYPE[tid].fr:CTYPE[tid].en);
const noteStr = n => n.l+(n.a>0?"#".repeat(n.a):"b".repeat(-n.a));
const symOf = (ct, n) => noteName(n)+(S.settings.notation==="fr"&&CTYPE[ct].sym?" ":"")+CTYPE[ct].sym;

