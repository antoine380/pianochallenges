// fragment de l'IIFE principale — ordre 050, voir src/app/README.md
// ---------- Music theory ----------
const LETTERS = ["C","D","E","F","G","A","B"];
const NAT = [0,2,4,5,7,9,11];
const NAME_FR = {C:"Do",D:"Ré",E:"Mi",F:"Fa",G:"Sol",A:"La",B:"Si"};
const PC_FR = ["Do","Do♯","Ré","Ré♯","Mi","Fa","Fa♯","Sol","Sol♯","La","La♯","Si"];
const PC_EN = ["C","C♯","D","D♯","E","F","F♯","G","G♯","A","A♯","B"];
function CNAME(){ return (S.settings.notation==="fr"?PC_FR:PC_EN)[0]; }
function BNAME(){ return (S.settings.notation==="fr"?PC_FR:PC_EN)[11]; } // B / Si: "start again" on the MIDI keyboard // name of C in the current notation, for "play a C" texts
const TYPES = [
  {id:"major", lvl:1, fr:"Majeur",            frP:"Majeures",        en:"Major",            enP:"Major",            iv:[0,2,4,5,7,9,11]},
  {id:"minor", lvl:1, fr:"Mineur",            frP:"Mineures",        en:"Minor",            enP:"Minor",    iv:[0,2,3,5,7,8,10]},
  {id:"pmaj",  lvl:2, fr:"Penta Majeure",     frP:"Penta Majeures",  en:"Major Pentatonic", enP:"Major Penta",      from:"major", pick:[0,1,2,4,5]},
  {id:"pmin",  lvl:2, fr:"Penta Mineure",     frP:"Penta Mineures",  en:"Minor Pentatonic", enP:"Minor Penta",      from:"minor", pick:[0,2,3,4,6]},
  {id:"harm",  lvl:3, fr:"Mineur Harmonique", frP:"Mineures Harm.",  en:"Harmonic Minor",   enP:"Harmonic Minor",   iv:[0,2,3,5,7,8,11]},
  {id:"blues", lvl:3, fr:"Blues",             frP:"Blues",           en:"Blues",            enP:"Blues",            from:"minor", pick:[0,2,3,4,6], blue:true},
  {id:"mel",   lvl:4, fr:"Mineur Mélodique",  frP:"Mineures Mél.",   en:"Melodic Minor",    enP:"Melodic Minor",    iv:[0,2,3,5,7,9,11], down:"minor"},
  {id:"dor",   lvl:5, fr:"Dorien",            frP:"Dorien",          en:"Dorian",           enP:"Dorian",           iv:[0,2,3,5,7,9,10]},
  {id:"mix",   lvl:5, fr:"Mixolydien",        frP:"Mixolydien",      en:"Mixolydian",       enP:"Mixolydian",       iv:[0,2,4,5,7,9,10]},
  {id:"lyd",   lvl:6, fr:"Lydien",            frP:"Lydien",          en:"Lydian",           enP:"Lydian",           iv:[0,2,4,6,7,9,11]},
  {id:"phr",   lvl:6, fr:"Phrygien",          frP:"Phrygien",        en:"Phrygian",         enP:"Phrygian",         iv:[0,1,3,5,7,8,10]},
  {id:"loc",   lvl:7, fr:"Locrien",           frP:"Locrien",         en:"Locrian",          enP:"Locrian",          iv:[0,1,3,5,6,8,10]},
];
const TYPE = Object.fromEntries(TYPES.map(x=>[x.id,x]));
const MAJ = [0,2,4,5,7,9,11];
const ROMAN = ["I","II","III","IV","V","VI","VII"];

function parse(n){ return {L:n[0], acc:n[1]==="#"?1:n[1]==="b"?-1:0}; }
function spellIv(tonic, iv){
  const {L,acc}=parse(tonic), li=LETTERS.indexOf(L), tpc=(NAT[li]+acc+12)%12;
  return iv.map((s,i)=>{ const l=LETTERS[(li+i)%7], pc=(tpc+s)%12;
    let a=((pc-NAT[LETTERS.indexOf(l)])%12+12)%12; if(a>6) a-=12; return {l,a,pc}; });
}
function baseIv(ty){ return ty.iv || TYPE[ty.from].iv; }
function spellType(tid, tonic, dir){
  const ty=TYPE[tid];
  if(ty.iv) return spellIv(tonic, (dir==="down" && ty.down) ? TYPE[ty.down].iv : ty.iv);
  const full=spellIv(tonic, TYPE[ty.from].iv); const s=ty.pick.map(i=>full[i]);
  if(ty.blue){ const f=s[3]; s.splice(3,0,{l:f.l,a:f.a-1,pc:(f.pc+11)%12}); }
  return s;
}
// Choose the most readable spelling of each tonic, then rank the 12 keys by accidentals (sharps first on ties)
const TONICS = {};
TYPES.forEach(ty=>{
  const rows=[];
  for(let pc=0;pc<12;pc++){
    const ni=NAT.indexOf(pc);
    const cands = ni>=0 ? [LETTERS[ni]] : [LETTERS[NAT.indexOf(pc-1)]+"#", LETTERS[NAT.indexOf(pc+1)]+"b"];
    let best=null;
    cands.forEach(c=>{ const sc=spellIv(c, baseIv(ty)); const score=sc.reduce((s,n)=>s+Math.abs(n.a)+(Math.abs(n.a)>1?100:0),0);
      const sharp=sc.some(n=>n.a>0)?0:1; if(!best||score<best.score) best={name:c,score,sharp}; });
    rows.push(best);
  }
  rows.sort((a,b)=>a.score-b.score || a.sharp-b.sharp);
  TONICS[ty.id]=rows.map(r=>r.name);
});
const accSym = a => a===1?"♯":a===-1?"♭":a===2?"𝄪":a===-2?"𝄫":"";
const nameIn = (n,not) => (not==="fr"?NAME_FR[n.l]:n.l)+accSym(n.a);
// simple enharmonic of a double-altered note (F𝄪 → G, B𝄫 → A), in the current notation
const PC_FR_B = ["Do","Ré♭","Ré","Mi♭","Mi","Fa","Sol♭","Sol","La♭","La","Si♭","Si"];
const PC_EN_B = ["C","D♭","D","E♭","E","F","G♭","G","A♭","A","B♭","B"];
const enhName = n => { const ni=NAT.indexOf(n.pc); if(ni>=0) return nameIn({l:LETTERS[ni],a:0,pc:n.pc}, S.settings.notation); return (S.settings.notation==="fr"?(n.a<0?PC_FR_B:PC_FR):(n.a<0?PC_EN_B:PC_EN))[n.pc]; };
const noteName = n => { const s=nameIn(n, S.settings.notation); return Math.abs(n.a)>=2 ? s+" ("+enhName(n)+")" : s; };
const tonicNote = tonic => spellIv(tonic,[0])[0];
function scaleName(tid, tonic){
  const ty=TYPE[tid], lang=S.settings.lang;
  return noteName(tonicNote(tonic))+" "+(lang==="fr"?ty.fr:ty.en);
}
function sigText(tid, tonic){
  const ty=TYPE[tid];
  if(!ty.iv) return spellType(tid,tonic,"up").length+" "+t("notes");
  const sc=spellIv(tonic, ty.iv), n=sc.filter(x=>x.a!==0).length;
  return n ? n+" "+(sc.some(x=>x.a>0)?"♯":"♭") : t("noAcc");
}
function degLabel(n, root){
  const ld=(LETTERS.indexOf(n.l)-LETTERS.indexOf(root.l)+7)%7, semis=(n.pc-root.pc+12)%12;
  let d=semis-MAJ[ld]; if(d>6) d-=12; if(d<-6) d+=12;
  return (d<0?"♭".repeat(-d):d>0?"♯".repeat(d):"")+ROMAN[ld];
}

