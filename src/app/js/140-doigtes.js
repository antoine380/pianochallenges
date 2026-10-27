// fragment de l'IIFE principale — ordre 140, voir src/app/README.md
// ---------- Fingering (right hand) shown on the keys that are lit, revealed or already played ----------
const FG_BLACK=[1,3,6,8,10];
// scale fingering: thumbs on white keys only, preferably just after a black key or on the tonic, groups of 2-4 fingers (1-2-3, 1-2-3-4)
function scaleFingers(pcs){ const n=pcs.length; if(!n) return [];
  const blk=i=>FG_BLACK.includes(((pcs[(i%n+n)%n])%12+12)%12);
  let best=null;
  const sets = n<=4 ? [[0]] : (()=>{ const a=[]; for(let i=0;i<n;i++) for(let j=i+1;j<n;j++){ const s1=j-i, s2=n-s1; if(s1>=2&&s1<=4&&s2>=2&&s2<=4) a.push([i,j]); } return a; })();
  sets.forEach(T=>{ let sc=0; T.forEach(i=>{ if(blk(i)) sc-=10; if(blk(i-1)) sc+=1; if(i===0) sc+=2; }); const s1 = T.length>1 ? T[1]-T[0] : n;
    const key=[sc, T.includes(0)?1:0, s1===3?1:0, -T[0]], gt=()=>{ for(let k=0;k<key.length;k++) if(key[k]!==best.key[k]) return key[k]>best.key[k]; return false; };
    if(!best || gt()) best={T,key}; });
  const T=best.T, f=new Array(n);
  T.forEach((t,g)=>{ const end = g+1<T.length ? T[g+1] : T[0]+n; for(let i=t,k=1;i<end;i++,k++) f[i%n]=Math.min(5,k); });
  const top = T.includes(0) ? Math.min(5, f[n-1]+1) : f[0];
  return [...f, top]; }
// chord fingering (right hand), notes from low to high
function chordFingers(ms){ const m=ms.slice().sort((a,b)=>a-b), n=m.length;
  if(n===1) return [1]; if(n===2){ const d=m[1]-m[0]; return [1, d<=2?2:d<=4?3:d<=7?4:5]; }
  if(n===3) return m[2]-m[1]>=5 ? [1,2,5] : [1,3,5];
  if(n===4) return m[3]-m[2]>=3 && m[2]-m[1]<=2 ? [1,2,3,5] : m[2]-m[1]>=3 && m[1]-m[0]<=2 ? [1,2,4,5] : [1,2,3,5];
  return m.map((x,i)=>Math.min(5,1+Math.round(i*4/(n-1)))); }
// midi (as shown on the keyboard) -> finger, for the current exercise
let fgStep=-1; // chord of a sequence being played back (reveal / replay), -1 = the one the player is on
function fgMap(){ const map=new Map(); if(!cur || !seq.length || cur.sec==="ear") return map;
  try{
    if(chSeq()){ const v=(seq[fgStep>=0?fgStep:Math.min(pStep,seq.length-1)]||seq[0]).voicing.slice().sort((a,b)=>a-b), f=chordFingers(v); v.forEach((m,i)=>map.set(fold(m),f[i])); return map; }
    const rm=revealMidis();
    if(chordLike(cur.sec)){ const srt=rm.slice().sort((a,b)=>a-b), f=chordFingers(srt); srt.forEach((m,i)=>map.set(fold(m),f[i])); return map; }
    const asc=rm.slice().sort((a,b)=>a-b), oct = asc.length>1 && (asc[asc.length-1]-asc[0])%12===0 && asc.length>2;
    const body = oct ? asc.slice(0,-1) : asc, f=scaleFingers(body.map(m=>m%12));
    body.forEach((m,i)=>map.set(fold(m),f[i])); if(oct) map.set(fold(asc[asc.length-1]),f[f.length-1]);
  }catch(e){}
  return map; }
let fgRaf=0;
function fgRender(){ fgRaf=0; try{ staffSoon(); }catch(e){} const on=!!S.settings.fing, map=on?fgMap():null;
  Object.entries(keyEls).forEach(([m,el])=>{ let b=el.querySelector(".fg"); const show = on && map.has(+m) && /\bk-(guide|rev|ok|hit)\b/.test(el.className);
    if(!show){ if(b) b.remove(); return; } if(!b){ b=document.createElement("i"); b.className="fg"; b.setAttribute("aria-hidden","true"); el.appendChild(b); } b.textContent=map.get(+m); }); }
const fgSoon=()=>{ if(!fgRaf) fgRaf=requestAnimationFrame(fgRender); };
new MutationObserver(muts=>{ if(muts.some(x=>x.attributeName==="class" && x.target.dataset && x.target.dataset.m)) fgSoon(); }).observe(kbd,{attributes:true,subtree:true,attributeFilter:["class"]});
