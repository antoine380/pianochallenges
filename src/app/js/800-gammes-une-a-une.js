// fragment de l'IIFE principale — ordre 800, voir src/app/README.md
/* ==== Gammes une à une (chantier gammes1) ==== */
// LEARN › tuile « Gammes une à une » (Bêta) → page "sc1" (#sc1Panel) : sélecteur NOTES | ACCORDS (S.settings.sc1Mode), puis toutes les
// gammes en grille : une ligne par tonique (Do → Si, nommage de TONICS), une colonne par type (SC1_T : majeure, mineure naturelle,
// harmonique, mélodique) ; en paysage bas (railMQ) la grille est transposée. Chaque case = 0 à 3 étoiles, gardées dans
// S.scStars = {notes:{"<tonique>-<type>":n}, chords:{…}} (le meilleur score ; fusion entre appareils = le max par case).
// Une case lance CETTE gamme seule avec le moteur des exercices (page practice, game.sc1) : en montée, accords = triades
// (sc1Fix force dir="up" et sc7=false le temps des appels, sans les sauvegarder). Étoiles : 1 = 3 notes (ou accords) justes sans
// finir, 2 = finie avec au moins une faute (ou après « Montre-moi »), 3 = finie sans faute. Fin de partie : #endModal (sc1End),
// Do = gamme suivante (sc1Next : même type, tonique suivante, puis le type suivant), Si = recommencer, « Toutes les gammes » = la liste.
// Sur la liste, un Do seul lance la prochaine gamme à travailler (sc1Todo). Test : tools/audit/r46_gammes1.mjs.
Object.assign(TXT.fr,{sc1Name:"Gammes une à une", sc1Desc:"Toutes les gammes, une par une : vise les 3 étoiles.", sc1Beta:"Bêta", sc1Notes:"Notes", sc1Chords:"Accords",
  sc1Types:[["Majeure","Maj."],["Mineure naturelle","Min."],["Mineure harmonique","Harm."],["Mineure mélodique","Mél."]],
  sc1SumA:(n,m)=>n+(n>1?" étoiles":" étoile")+" sur "+m, sc1Cell:(nm,n)=>nm+" : "+(n?n+(n>1?" étoiles":" étoile")+" sur 3":"pas encore jouée"),
  sc1OrC:c=>"Joue "+c+" pour la prochaine gamme", sc1Cups:(n,m)=>n+(n>1?" coupes":" coupe")+" sur "+m, sc1CupA:(x,on)=>"Coupe de "+x+(on?" : gagnée":" : les 4 gammes à 3 étoiles"), sc1CupWon:x=>"Coupe de "+x+" gagnée !", sc1CupNtf:"Les 4 gammes de la ligne à 3 étoiles.",
  sc1StarsA:n=>n+(n>1?" étoiles":" étoile")+" sur 3",
  sc1R:(n,ch)=>n>=3?"Sans faute !":n===2?"Gamme finie !":n===1?(ch?"3 accords justes, continue !":"3 notes justes, continue !"):"Prêt pour un nouvel essai ?",
  sc1Best:"Ton meilleur :", sc1New:"Nouveau record pour cette gamme !", sc1Back:"Toutes les gammes", sc1Again:"Recommencer", sc1NextB:x=>"Suivante : "+x});
Object.assign(TXT.en,{sc1Name:"Scales one by one", sc1Desc:"Every scale, one at a time: aim for 3 stars.", sc1Beta:"Beta", sc1Notes:"Notes", sc1Chords:"Chords",
  sc1Types:[["Major","Major"],["Natural minor","Minor"],["Harmonic minor","Harm."],["Melodic minor","Mel."]],
  sc1SumA:(n,m)=>n+(n===1?" star":" stars")+" out of "+m, sc1Cell:(nm,n)=>nm+": "+(n?n+(n>1?" stars":" star")+" out of 3":"not played yet"),
  sc1OrC:c=>"Play "+c+" for the next scale", sc1Cups:(n,m)=>n+(n===1?" cup":" cups")+" out of "+m, sc1CupA:(x,on)=>x+" cup"+(on?": won":": all 4 scales at 3 stars"), sc1CupWon:x=>x+" cup won!", sc1CupNtf:"All 4 scales of the row at 3 stars.",
  sc1StarsA:n=>n+(n>1?" stars":" star")+" out of 3",
  sc1R:(n,ch)=>n>=3?"No mistake!":n===2?"Scale finished!":n===1?(ch?"3 right chords, keep going!":"3 right notes, keep going!"):"Ready for another go?",
  sc1Best:"Your best:", sc1New:"New best for this scale!", sc1Back:"All scales", sc1Again:"Start again", sc1NextB:x=>"Next: "+x});
const SC1_T=["major","minor","harm","mel"], SC1_COL="#9a5410";
const SC1={tr:null, tmp:0, keep:null};
const sc1Mode = () => S.settings.sc1Mode==="chords" ? "chords" : "notes";
function sc1S(){ const isO=x=>x&&typeof x==="object"&&!Array.isArray(x); if(!isO(S.scStars)) S.scStars={}; ["notes","chords"].forEach(m=>{ if(!isO(S.scStars[m])) S.scStars[m]={}; }); return S.scStars; }
const sc1Key = (tid,k) => k+"-"+tid;
function sc1Get(mode,tid,k){ const v=Math.floor(+sc1S()[mode][sc1Key(tid,k)]||0); return Math.max(0,Math.min(3,v)); }
function sc1Set(mode,tid,k,n){ if(n<=sc1Get(mode,tid,k)) return false; sc1S()[mode][sc1Key(tid,k)]=n; save(); return true; }
const sc1K = (tid,pc) => TONICS[tid].find(k=>keyPc(k)===pc);
// rows: the natural tonics first (Do Ré Mi Fa Sol La Si), then the altered ones (Ré♭ Mi♭ Fa♯ La♭ Si♭)
const SC1_PC=[0,2,4,5,7,9,11,1,3,6,8,10];
// the order of the list for « next »: the same type, the next row, then the next type
function sc1List(){ const L=[]; SC1_T.forEach(tid=>SC1_PC.forEach(pc=>L.push({tid, k:sc1K(tid,pc)}))); return L; }
// a cup per tonic and per mode: the 4 scales of the row at 3 stars
const sc1Cup = (mode,pc) => SC1_T.every(tid=>sc1Get(mode,tid,sc1K(tid,pc))>=3);
const sc1Cups = mode => SC1_PC.filter(pc=>sc1Cup(mode,pc)).length;
const sc1RowName = pc => noteName(tonicNote(sc1K("major",pc)));
const SC1_TROPHY='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5a3 3 0 0 0 3.5 4M16 6h3.5a3 3 0 0 1-3.5 4M12 13v4M8.5 20h7"/></svg>';
const sc1Lock = (tid,k) => paywallOn() && !isPremium() && (premType("scales",tid) || !keySimple(k));
const sc1Total = mode => sc1List().reduce((a,c)=>a+sc1Get(mode,c.tid,c.k),0);
const SC1_MAX = SC1_T.length*12*3;
function sc1Next(tid,k){ const L=sc1List(), i=L.findIndex(c=>c.tid===tid&&c.k===k); for(let j=1;j<=L.length;j++){ const c=L[(i+j)%L.length]; if(!sc1Lock(c.tid,c.k)) return c; } return null; }
function sc1Todo(mode){ return sc1List().find(c=>!sc1Lock(c.tid,c.k)&&sc1Get(mode,c.tid,c.k)<3) || sc1List()[0]; }
const sc1Item = (tid,k,mode) => mode==="chords" ? {sec:"scales",tid,k,ch:1} : {sec:"scales",tid,k};
const escA = x => esc(x).replace(/"/g,"&quot;");
function sc1Render(){ const P=$("sc1Panel"); if(!P) return; const mode=sc1Mode(), tr=railMQ.matches; SC1.tr=tr; SC1.lang=S.settings.lang+S.settings.notation;
  const TY=t("sc1Types"), tot=sc1Total(mode);
  const R=i=>i<7?i+1:i+2, pos=(r,c)=>tr ? "grid-row:"+(c+1)+";grid-column:"+(r+1) : "grid-row:"+(r+1)+";grid-column:"+(c+1); // row 8 = the thin line between natural and altered tonics
  const star=n=>'<span class="sc1-st" aria-hidden="true">'+[0,1,2].map(i=>'<i'+(i<n?' class="on"':'')+'>★</i>').join("")+'</span>';
  let h='<span class="sc1-corner" style="'+pos(0,0)+'"></span>';
  SC1_T.forEach((tid,j)=>{ h+='<span class="sc1-th" style="'+pos(0,j+1)+'"><b class="lg">'+esc(TY[j][0])+'</b><b class="sh" aria-hidden="true">'+esc(TY[j][1])+'</b></span>'; });
  h+='<span class="sc1-sep" style="'+(tr?"grid-row:1/-1;grid-column:9":"grid-column:1/-1;grid-row:9")+'" aria-hidden="true"></span>';
  SC1_PC.forEach((pc,i)=>{ const names=[...new Set(SC1_T.map(tid=>noteName(tonicNote(sc1K(tid,pc)))))], r=R(i), cup=sc1Cup(mode,pc);
    h+='<span class="sc1-rh" style="'+pos(r,0)+'"><b>'+esc(names[0])+'</b>'+(names[1]?'<small>'+esc(names[1])+'</small>':'')+'</span>';
    h+='<span class="sc1-cup'+(cup?' on':'')+'" style="'+pos(r,SC1_T.length+1)+'" role="img" aria-label="'+escA(t("sc1CupA")(names[0],cup))+'" title="'+escA(t("sc1CupA")(names[0],cup))+'">'+SC1_TROPHY+'</span>';
    SC1_T.forEach((tid,j)=>{ const k=sc1K(tid,pc), n=sc1Get(mode,tid,k), lk=sc1Lock(tid,k), nm=itemName(sc1Item(tid,k,mode)), tn=noteName(tonicNote(k));
      h+='<button type="button" class="sc1-c s'+n+(lk?' pw-lk':'')+'" style="'+pos(r,j+1)+'" data-tid="'+tid+'" data-k="'+escA(k)+'" aria-label="'+escA(t("sc1Cell")(nm,n))+'" title="'+escA(nm)+'">'+star(n)
        +(names[1]?'<small class="sc1-tn">'+esc(tn)+'</small>':'')+(lk?pwChip():'')+'</button>'; }); });
  const midi=midiMode() && S.settings.midiC!==false, nx=sc1Todo(mode);
  P.innerHTML='<div class="sc1-top"><h2 class="sc1-h"><span class="mb-ic">'+SEC_ICON("scales")+'</span><span>'+esc(t("sc1Name"))+'</span></h2>'
    +'<div class="seg sc1-seg" id="sc1Seg" role="group" aria-label="'+escA(t("sc1Notes")+" / "+t("sc1Chords"))+'">'+[["notes","sc1Notes"],["chords","sc1Chords"]].map(([v,l])=>'<button type="button" data-v="'+v+'" aria-pressed="'+(mode===v)+'">'+esc(t(l))+'</button>').join("")+'</div>'
    +'<p class="sc1-sum" id="sc1Sum"><span class="sc1-big" aria-label="'+escA(t("sc1SumA")(tot,SC1_MAX))+'"><i aria-hidden="true">★</i><b class="mono">'+tot+'</b><span aria-hidden="true"> / '+SC1_MAX+'</span></span><span class="sc1-big sc1-cups" aria-label="'+escA(t("sc1Cups")(sc1Cups(mode),12))+'">'+SC1_TROPHY+'<b class="mono">'+sc1Cups(mode)+'</b><span aria-hidden="true"> / 12</span></span>'+'</p></div>'
    +'<div class="sc1-grid'+(tr?' tr':'')+'" id="sc1Grid">'+h+'</div>';
  P.querySelectorAll("#sc1Seg [data-v]").forEach(b=>b.onclick=()=>{ if(S.settings.sc1Mode===b.dataset.v) return; S.settings.sc1Mode=b.dataset.v; save(); sc1Render(); const f=$("sc1Seg").querySelector('[data-v="'+b.dataset.v+'"]'); if(f) f.focus({preventScroll:true}); });
  P.querySelectorAll(".sc1-c").forEach(b=>b.onclick=()=>sc1Play(b.dataset.tid,b.dataset.k)); }
// one scale, alone, in the exercise engine
function sc1Play(tid,k,mode){ mode=mode||sc1Mode(); if(!TONICS[tid] || !TONICS[tid].includes(k)) return;
  if(sc1Lock(tid,k)){ pwOpen(premType("scales",tid)?"types":"keys"); return; }
  closeEnd();
  if(S.section!=="scales"){ S.section="scales"; save(); }
  openPage("practice");
  const it=sc1Item(tid,k,mode);
  game=makeGame([it]); game.label=itemName(it); game.single=false; game.sc1={mode,tid,k,best0:sc1Get(mode,tid,k),cup0:sc1Cup(mode,keyPc(k)),got:0,res:0,rev:false,err:0}; game.i=-1; startRound(); }
// the end of a game: the stars won, Do = next scale, Si = again, back to the list
function sc1End(g){ if(page!=="sc1") openPage("sc1"); const pc=keyPc(g.sc1.k), cupNew=!g.sc1.cup0 && sc1Cup(g.sc1.mode,pc); // the summary opens over the list, with its new stars
  const s=g.sc1, n=s.stars|0, best=sc1Get(s.mode,s.tid,s.k), ch=s.mode==="chords", nx=sc1Next(s.tid,s.k);
  $("endTitle").textContent=itemName(sc1Item(s.tid,s.k,s.mode));
  const B=$("endBody"); B.innerHTML='<div class="sc1-end"><small class="pp-k">'+esc(t("sc1Name")+" · "+t(ch?"sc1Chords":"sc1Notes"))+'</small>'
    +'<p class="pp-stars sc1-stars" role="img" aria-label="'+escA(t("sc1StarsA")(n))+'">'+[0,1,2].map(i=>'<span'+(i<n?' class="on"':'')+' style="--d:'+(i*220)+'ms">★</span>').join("")+'</p>'
    +(cupNew?'<p class="sc1-cupwon"><span class="sc1-cup on" aria-hidden="true">'+SC1_TROPHY+'</span><b>'+esc(t("sc1CupWon")(sc1RowName(pc)))+'</b></p>':'')
    +'<p class="sc1-msg">'+esc(t("sc1R")(n,ch))+'</p>'
    +(best>n?'<p class="sc1-best">'+esc(t("sc1Best"))+' <span role="img" aria-label="'+escA(t("sc1StarsA")(best))+'">'+"★".repeat(best)+"☆".repeat(3-best)+'</span></p>':recNew(s.best0,n,"stars")?'<p class="sc1-best new">'+esc(t("sc1New"))+'</p>':'')
    +'<p class="sc1-tot"><span aria-hidden="true">★ </span>'+esc(t("sc1SumA")(sc1Total(s.mode),SC1_MAX))+' · '+esc(t("sc1Cups")(sc1Cups(s.mode),12))+'</p></div>';
  { const li=levelInfo(S.xp), nxe=document.createElement("div"); nxe.className="end-next"; nxe.id="endNext";
    nxe.innerHTML='<div class="en-row"><b></b><span class="en-bar"><i></i></span></div><p></p>'; nxe.querySelector("b").textContent="+"+fmtN(Math.max(0,S.xp-g.xp0))+" XP · "+t("endNext")(fmtN(li.need-li.into), fmtN(li.L+1));
    const sk=effStreak(); nxe.querySelector("p").textContent = sk ? t("endStreak")(sk) : ""; B.appendChild(nxe); try{ endNextMotion(nxe, g, li, sk); }catch(e){} }
  const F=$("endFoot"); F.innerHTML="";
  const btn=(lbl,cls,fn,k)=>{ const b=document.createElement("button"); b.type="button"; b.className="btn "+cls; b.textContent=lbl; b.onclick=fn; if(k){ const kb=kbdEl(); kb.textContent=k; b.appendChild(kb); } F.appendChild(b); return b; };
  btn(t("sc1Back"),"",()=>{ closeEnd(); if(page!=="sc1") openPage("sc1"); }).id="sc1Back";
  btn(t("sc1Again"),"",()=>sc1Play(s.tid,s.k,s.mode),BNAME()).id="sc1Again";
  const go=nx ? btn(t("sc1NextB")(itemName(sc1Item(nx.tid,nx.k,s.mode))),"primary",()=>sc1Play(nx.tid,nx.k,s.mode),CNAME()) : null; if(go) go.id="sc1Next";
  $("endX").setAttribute("aria-label",t("closeLbl")); if(!endOpen) modalOpened(); endOpen=true; $("endModal").hidden=false;
  (go||F.lastChild).focus({preventScroll:true}); if((cupNew || (n===3 && n>s.best0)) && !lvlUp) setTimeout(()=>{ try{ confetti(); }catch(e){} },150); }
// LEARN: the tile, shown next to « Gammes » (CSS order: it comes last in the page, so the other tiles keep their place for the tests)
function sc1Tile(){ const b=$("learnTiles"); if(!b) return; const old=b.querySelector(".sc1-tile"); if(old) old.remove();
  const c=tile({color:SC1_COL,obj:"sc1",kick:"Learn",title:t("sc1Name"),desc:t("sc1Desc"),btn:t("rnPlay"),rec:"★ "+fmtN(sc1Total("notes")+sc1Total("chords"))+" / "+fmtN(2*SC1_MAX),onOpen:()=>openPage("sc1")});
  c.classList.add("sc1-tile"); c.dataset.id="sc1"; b.appendChild(c); }
TILE_COL.sc1=SC1_COL;
OBJ.sc1=()=>{ const o=O3(); [0,1,2].forEach(i=>o.block(10+i*30,80-i*20,28,32+i*20,NC[i+3],8)); return o.raw('<path d="M90 6l6.6 13.4 14.8 2.2-10.7 10.4 2.5 14.7L90 39.8 76.8 46.7l2.5-14.7L68.6 21.6l14.8-2.2z" fill="#ffc94a" stroke="#c98a00" stroke-width="2.4" stroke-linejoin="round"/>').svg(); };
{ const P=document.createElement("section"); P.className="mode-page sc1-page"; P.id="sc1Panel"; P.setAttribute("aria-label",t("sc1Name")); const lp=$("learnPanel"); lp.parentNode.insertBefore(P,lp.nextSibling); }
// ---- hooks (wrapped here so the rest of the source stays as it was) ----
// during a « one by one » game: up, and triads (the player's own settings are kept, and saved as they were)
const sc1On = () => !!(game && game.sc1);
function sc1Fix(fn){ return function(){ if(!sc1On()) return fn.apply(this,arguments); const s=S.settings;
  if(!SC1.tmp++) SC1.keep={sc7:s.sc7, dir:s.dir}; s.sc7=false; s.dir="up";
  try{ return fn.apply(this,arguments); } finally{ if(!--SC1.tmp){ s.sc7=SC1.keep.sc7; s.dir=SC1.keep.dir; SC1.keep=null; } } }; }
{ const o=save; save=function(){ if(!SC1.tmp || !SC1.keep) return o.apply(this,arguments); const s=S.settings, a=s.sc7, d=s.dir; s.sc7=SC1.keep.sc7; s.dir=SC1.keep.dir; try{ return o.apply(this,arguments); } finally{ s.sc7=a; s.dir=d; } }; }
startRound=sc1Fix(startRound); render=sc1Fix(render);
{ const o=reveal; reveal=sc1Fix(function(){ if(sc1On() && phase==="listening") game.sc1.rev=true; return o.apply(this,arguments); }); }
{ const o=success; success=sc1Fix(function(){ const g=sc1On()?game.sc1:null, e=errors; const r=o.apply(this,arguments);
    if(g){ const n=(e===0 && !g.rev) ? 3 : 2; g.err=Math.max(e,g.err|0); g.res=Math.max(g.res|0,n); sc1Set(g.mode,g.tid,g.k,n);
      const pc=keyPc(g.k); if(!g.cup0 && sc1Cup(g.mode,pc)) try{ ntfAdd({key:"sc1cup-"+g.mode+"-"+pc, cat:"progress", type:"unlock", ti:t("sc1CupWon")(sc1RowName(pc))+" · "+t(g.mode==="chords"?"sc1Chords":"sc1Notes"), tx:t("sc1CupNtf"), act:{k:"learn",l:"ntfPlay"}}); }catch(e){} } return r; }); }
// 3 right notes (or chords) of the scale: the first star at once, even if the scale is not finished
{ const o=noteIn; noteIn=function(){ const r=o.apply(this,arguments); try{ const g=sc1On()?game.sc1:null; if(g && !g.got && !g.train && cur && phase==="listening" && idx>=3){ g.got=1; sc1Set(g.mode,g.tid,g.k,1); } }catch(e){} return r; }; }
{ const o=finishGame; finishGame=function(){ const g=game; if(!(g && g.sc1)) return o.apply(this,arguments);
    const s=g.sc1; s.stars=Math.max(s.res|0, s.got?1:0); g.single=true; const done=g.results.filter(Boolean).length; const r=o.apply(this,arguments);
    if(!done){ if(s.got) sc1End(g); else setTimeout(()=>{ if(!game && page==="practice" && !endOpen) openPage("sc1"); },0); } // stopped before the end
    return r; }; }
{ const o=openEnd; openEnd=function(g){ if(g && g.sc1) return sc1End(g); return o.apply(this,arguments); }; }
{ const o=endNext; endNext=function(g){ if(g && g.sc1){ const nx=sc1Next(g.sc1.tid,g.sc1.k); if(nx) sc1Play(nx.tid,nx.k,g.sc1.mode); return; } return o.apply(this,arguments); }; }
{ const o=endReplay; endReplay=function(g){ if(g && g.sc1){ sc1Play(g.sc1.tid,g.sc1.k,g.sc1.mode); return; } return o.apply(this,arguments); }; }
// on the list, a lone C plays the next scale to work on
{ const o=midiStart; midiStart=function(note){ const pc=((note%12)+12)%12; if(page==="sc1" && S.settings.midiC!==false && (pc===0||pc===11)){
    if(endOpen && lastGame && lastGame.sc1 && !openMods.length && !helpOpen && !midiOpen){ if(pc===0) endNext(lastGame); else endReplay(lastGame); return true; } // the summary: C = next, B = again
    if(pc===0 && !anyModal()){ const c=sc1Todo(sc1Mode()); sc1Play(c.tid,c.k); return true; } return false; }
  return o.apply(this,arguments); }; }
{ const o=renderLearn; renderLearn=function(){ const r=o.apply(this,arguments); try{ sc1Tile(); }catch(e){ console.warn(e); } return r; }; }
{ const o=openPage; openPage=function(pg){ const r=o.apply(this,arguments); if(page==="sc1" && pg==="sc1") sc1Render(); return r; }; }
{ const o=setNav; setNav=function(){ o.apply(this,arguments); if(page==="sc1") $("mbTitle").textContent=t("sc1Name"); }; }
{ const o=render; render=function(){ const r=o.apply(this,arguments); if(page==="sc1" && SC1.lang!==S.settings.lang+S.settings.notation) sc1Render(); return r; }; }
addEventListener("resize",()=>{ if(page==="sc1" && SC1.tr!==railMQ.matches) sc1Render(); });
{ const o=mergeState; mergeState=function(local, cloud){ const r=o.apply(this,arguments); const isO=x=>x&&typeof x==="object"&&!Array.isArray(x);
    const a=isO(local)&&isO(local.scStars)?local.scStars:{}, b=isO(cloud)&&isO(cloud.scStars)?cloud.scStars:{};
    if(Object.keys(a).length || Object.keys(b).length){ const m={};
      ["notes","chords"].forEach(md=>{ const x={}; [a[md],b[md]].forEach(o2=>{ if(isO(o2)) Object.entries(o2).forEach(([k,v])=>{ const n=Math.max(0,Math.min(3,Math.floor(+v)||0)); if(n && /^[A-G][#b]?-[a-z]+$/.test(k)) x[k]=Math.max(x[k]||0,n); }); }); m[md]=x; });
      r.merged.scStars=m; r.changed=!syncSame(r.merged,local); }
    return r; }; }
if(page==="learn") renderLearn();
/* ==== fin Gammes une à une ==== */
