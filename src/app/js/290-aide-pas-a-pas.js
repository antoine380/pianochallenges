// fragment de l'IIFE principale — ordre 290, voir src/app/README.md
// ----- Step-by-step help: a card that builds the picture of the scale / chord as the notes are found -----
function renderFiche2(){
  const box=$("fiche"); const on = page==="practice" && cur && cur.sec!=="ear" && S.settings.guideP && phase!=="idle";
  box.hidden=!on; if(!on) return;
  const all=revealMidis(), done=phase!=="listening", got=new Set(played.map(m=>m%12));
  const pcs=[...new Set(all.map(m=>m%12))], lo=Math.min(...all), start=lo-(lo%12), hi=Math.max(...all), octs=Math.max(1,Math.ceil((hi-start+1)/12));
  const W=[0,2,4,5,7,9,11], wN=octs*7, ww=100/wN; let svg='<svg viewBox="0 0 100 34" preserveAspectRatio="none" aria-hidden="true">';
  for(let o=0;o<octs;o++) W.forEach((pc,i)=>{ const m=start+o*12+pc, show=all.includes(m)&&(done||got.has(pc)); svg+='<rect x="'+((o*7+i)*ww+.3)+'" y="0" width="'+(ww-.6)+'" height="34" rx="1.6" class="'+(show?"on":"")+'" style="'+(show?"fill:var(--note-"+(NAT_OF(pc))+")":"")+'"/>'; });
  for(let o=0;o<octs;o++) [1,3,6,8,10].forEach(pc=>{ const m=start+o*12+pc, show=all.includes(m)&&(done||got.has(pc)), wi=W.indexOf(pc-1), x=(o*7+wi+1)*ww-ww*.3; svg+='<rect x="'+x+'" y="0" width="'+(ww*.6)+'" height="21" rx="1.2" class="bk'+(show?" on":"")+'" style="'+(show?"fill:var(--note-"+NAT_OF(pc)+")":"")+'"/>'; });
  svg+="</svg>";
  const KN=keyNames(), seen=new Set(), names=[]; all.forEach(m=>{ const pc=m%12; if(seen.has(pc)) return; seen.add(pc); const ok=done||got.has(pc); names.push('<span class="'+(ok?"ok":"")+'" style="'+(ok?"--c:var(--note-"+NAT_OF(pc)+")":"")+'">'+(ok?KN[pc]:"?")+"</span>"); });
  box.innerHTML='<div class="fc-h"><b></b><small></small></div><div class="fc-kb">'+svg+'</div><div class="fc-n">'+names.join("")+"</div>";
  box.querySelector("b").textContent=t("ficheT"); box.querySelector("small").textContent=t("ficheS")(done?pcs.length:pcs.filter(p=>got.has(p)).length,pcs.length);
}
const NAT_OF = pc => [0,0,2,2,4,5,5,7,7,9,9,11][pc];

