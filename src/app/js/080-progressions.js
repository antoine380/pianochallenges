// fragment de l'IIFE principale — ordre 080, voir src/app/README.md
// ---------- Progressions ----------
const PROGS = [
  {id:"p145",   lvl:1, scale:"major", deg:[0,3,4,0]},
  {id:"pop",    lvl:1, scale:"major", deg:[0,4,5,3]},
  {id:"pop2",   lvl:2, scale:"major", deg:[5,3,0,4]},
  {id:"fifties",lvl:2, scale:"major", deg:[0,5,3,4]},
  {id:"m145",   lvl:2, scale:"minor", deg:[0,3,4,0]},
  {id:"ii5i",   lvl:3, scale:"major", deg:[1,4,0]},
  {id:"mpop",   lvl:3, scale:"minor", deg:[0,5,2,6]},
  {id:"jazz",   lvl:4, scale:"major", deg:[1,4,0], sev:true},
  {id:"canon",  lvl:5, scale:"major", deg:[0,4,5,2,3,0,3,4]},
  {id:"blues",  lvl:3, scale:"major", deg:[0,0,0,0,3,3,0,0,4,3,0,4], nm:"progBlues"}, // L11: the 12-bar blues (triads)
];
const PROG = Object.fromEntries(PROGS.map(x=>[x.id,x]));
const progName = pid => { if(PROG[pid].nm) return t(PROG[pid].nm); const pr=PROG[pid], k=pr.scale==="major"?"C":"A"; return pr.deg.map(d=>hChord(pr.scale,k,d,pr.sev).roman).join("–"); };
// close voicing of a chord (spelled notes, inversion) with its bass at midi `bass`
function voiceAt(notes, inv, bass){
  const ord=notes.slice(inv).concat(notes.slice(0,inv)); let prev=bass-1;
  return ord.map((n,i)=>{ let m = i===0 ? bass : prev+1; while(((m%12)+12)%12!==n.pc) m++; prev=m; return m; });
}
function progSteps(pid, key, vl){
  const pr=PROG[pid]; let prevV=null;
  return pr.deg.map(d=>{
    const ch=hChord(pr.scale,key,d,pr.sev); let best=null;
    if(!vl || !prevV){ let b=48+ch.root.pc; if(b<52) b+=12; best={inv:0,v:voiceAt(ch.notes,0,b)}; }
    else {
      for(let inv=0;inv<ch.notes.length;inv++){
        const bpc=ch.notes[inv].pc;
        for(let b=prevV[0]-7;b<=prevV[0]+7;b++){ if(((b%12)+12)%12!==bpc) continue;
          const v=voiceAt(ch.notes,inv,b), a=v.slice().sort((x,y)=>x-y), q=prevV.slice().sort((x,y)=>x-y);
          const cost=a.reduce((sum,m,i)=>sum+Math.abs(m-q[Math.min(i,q.length-1)]),0)+Math.abs(b-prevV[0])*.1;
          if(!best||cost<best.cost) best={inv,v,cost}; }
      }
    }
    prevV=best.v;
    return {...ch, inv:best.inv, voicing:best.v, bassPc:ch.notes[best.inv].pc};
  });
}
const slashSym = st => chordSymOf(st)+(st.inv? "/"+noteName(st.notes[st.inv]) : "");

