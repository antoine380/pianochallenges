// fragment de l'IIFE principale — ordre 260, voir src/app/README.md
// ----- Play home: song tiles (the songs open in the Play frame), the free keyboard below -----
Object.assign(OBJ,{
  moon:()=>{ const o=O3(); const g=o.grad("#ffd23f"); return o.raw('<path d="M70 14a46 46 0 1 0 36 66A38 38 0 0 1 70 14z" fill="'+g+'"/><ellipse cx="44" cy="44" rx="9" ry="16" fill="#fff" opacity=".4" transform="rotate(25 44 44)"/>').ball(92,30,6,"#fff3b0").svg(); },
  star:()=>{ const o=O3(); const g=o.grad("#ffc94a"); return o.raw('<path d="M60 8l14 30 32 4-24 22 6 32-28-16-28 16 6-32L14 42l32-4z" fill="'+g+'" stroke="#e59b12" stroke-width="3" stroke-linejoin="round"/><ellipse cx="50" cy="40" rx="8" ry="5" fill="#fff" opacity=".55" transform="rotate(-25 50 40)"/>').svg(); },
  bell:()=>{ const o=O3(); const g=o.grad("#ffc94a"); return o.ball(60,104,10,"#e59b12").raw('<path d="M60 12c-22 0-30 20-30 40v22l-10 16h80L90 74V52c0-20-8-40-30-40z" fill="'+g+'"/><ellipse cx="46" cy="40" rx="6" ry="14" fill="#fff" opacity=".45" transform="rotate(15 46 40)"/>').block(52,4,16,12,"#e59b12",5).svg(); },
  heart:()=>{ const o=O3(); const g=o.grad("#ff5a8a"); return o.raw('<path d="M60 104C30 82 10 64 10 40a24 24 0 0 1 50-10 24 24 0 0 1 50 10c0 24-20 42-50 64z" fill="'+g+'"/><ellipse cx="34" cy="34" rx="10" ry="6" fill="#fff" opacity=".5" transform="rotate(-30 34 34)"/>').svg(); }
});
// the song tiles of the PLAY page: see the module « Morceaux » (C6 catalogue, L11 grids) at the end of the script

// ----- time played: counted while notes come in (15 s ticks, 45 s of silence stops the clock) -----
let lastNoteAt=0, playTick=0;
setInterval(()=>{ if(document.hidden || Date.now()-lastNoteAt>45000) return; const d=dayStr(); if(!S.playSec||typeof S.playSec!=="object") S.playSec={};
  S.playSec[d]=(S.playSec[d]|0)+15; if(++playTick%4===0) save(); try{ goalTick(); }catch(e){} },15000);

// ----- the light musical touch: a soft note when the pointer passes over a card (only once sound is unlocked) -----
const HOVER_NOTES=[72,74,76,79,81,84];
document.addEventListener("pointerover",e=>{ if(e.pointerType!=="mouse") return; const c=e.target.closest(".ptile:not(.soon),.hs-daily"); if(!c || c.contains(e.relatedTarget)) return;
  if(!ctx || ctx.state!=="running" || S.settings.uiSound===false) return; const all=[...c.parentNode.children], i=Math.max(0,all.indexOf(c)); tone(HOVER_NOTES[i%HOVER_NOTES.length],0,.5,.045); });

