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
// ---- MOTEUR « UNE À UNE » (chantier MATIÈRES, 31/10/2026) : la page sc1 sert à toutes les matières LEARN. Une matière = une entrée de
// UA_DEF (les gammes ici, les autres dans js/886-matieres-une-a-une.js) : ses sous-modes (ids uniques dans toute l'app : le mode dit la
// matière, uaSecOf), ses colonnes (cols, coupure après sep), ses lignes (rows, coupure après rsep ; flat = cases sans lignes), la case →
// {tid, k} (k), l'élément du moteur LEARN (item, ou queue = plusieurs éléments), son nom, la validité, le cadenas, la ligne de la coupe.
// UA.cur = la matière affichée / jouée. Étoiles : gammes = S.scStars[mode] (inchangé), autres = S.uaStars[sec][mode] ; clé "<k>-<tid>".
const UA={cur:"scales"}, UA_DEF={};
const uaIsO = x => !!x && typeof x==="object" && !Array.isArray(x);
const uaSecOf = mode => { for(const s in UA_DEF) if(UA_DEF[s].modes.some(m=>m.v===mode)) return s; return "scales"; };
const uaDef = mode => UA_DEF[uaSecOf(mode)] || UA_DEF.scales;
function uaUse(sec){ UA.cur = UA_DEF[sec] ? sec : "scales"; try{ document.body.style.setProperty("--sc1c", UA_DEF[UA.cur].col); }catch(e){} }
function uaModeGet(sec){ const d=UA_DEF[sec]||UA_DEF.scales; if(d.sec==="scales") return S.settings.sc1Mode==="chords" ? "chords" : "notes";
  const v=uaIsO(S.settings.uaMode) ? S.settings.uaMode[d.sec] : null; return d.modes.some(m=>m.v===v) ? v : d.modes[0].v; }
function uaModeSet(sec,v){ if(sec==="scales") S.settings.sc1Mode=v; else { if(!uaIsO(S.settings.uaMode)) S.settings.uaMode={}; S.settings.uaMode[sec]=v; } save(); }
const sc1Mode = () => uaModeGet(UA.cur);
// the tutorial of the page, once per subject (scales: S.settings.sc1Tour as before; the others: S.settings.uaTour[sec])
const uaTourDone = sec => sec==="scales" ? !!S.settings.sc1Tour : !!(uaIsO(S.settings.uaTour) && S.settings.uaTour[sec]);
function uaTourSet(sec){ if(sec==="scales") S.settings.sc1Tour=1; else { if(!uaIsO(S.settings.uaTour)) S.settings.uaTour={}; S.settings.uaTour[sec]=1; } }
const sc1ModeName = mode => { const m=uaDef(mode).modes.find(x=>x.v===mode); return m ? m.l() : ""; };
function sc1S(){ if(!uaIsO(S.scStars)) S.scStars={}; ["notes","chords"].forEach(m=>{ if(!uaIsO(S.scStars[m])) S.scStars[m]={}; }); return S.scStars; }
function uaStore(mode){ const sec=uaSecOf(mode); if(sec==="scales") return sc1S()[mode==="chords"?"chords":"notes"];
  if(!uaIsO(S.uaStars)) S.uaStars={}; if(!uaIsO(S.uaStars[sec])) S.uaStars[sec]={}; if(!uaIsO(S.uaStars[sec][mode])) S.uaStars[sec][mode]={}; return S.uaStars[sec][mode]; }
const sc1Key = (tid,k) => k+"-"+tid;
function sc1Get(mode,tid,k){ const v=Math.floor(+uaStore(mode)[sc1Key(tid,k)]||0); return Math.max(0,Math.min(3,v)); }
function sc1Set(mode,tid,k,n){ if(n<=sc1Get(mode,tid,k)) return false; uaStore(mode)[sc1Key(tid,k)]=n; save(); return true; }
const sc1K = (tid,pc) => TONICS[tid].find(k=>keyPc(k)===pc);
// rows: the natural tonics first (Do Ré Mi Fa Sol La Si), then the altered ones (Ré♭ Mi♭ Fa♯ La♭ Si♭)
const SC1_PC=[0,2,4,5,7,9,11,1,3,6,8,10];
// the order of the list for « next »: the same column, the next row, then the next column
function sc1List(mode){ mode=mode||sc1Mode(); const d=uaDef(mode), L=[], R=d.rows(mode);
  d.cols(mode).forEach(c=>R.forEach(r=>{ const k=d.k(mode,c.id,r.id); if(k!=null) L.push({tid:c.id, k}); })); return L; }
// a cup per row and per mode: every cell of the row at 3 stars
const sc1Cup = (mode,row) => { const d=uaDef(mode); return d.cols(mode).every(c=>{ const k=d.k(mode,c.id,row); return k==null || sc1Get(mode,c.id,k)>=3; }); };
const sc1Cups = mode => uaDef(mode).cups ? uaDef(mode).rows(mode).filter(r=>sc1Cup(mode,r.id)).length : 0;
const sc1RowName = (row,mode) => { mode=mode||sc1Mode(); return uaDef(mode).rowName(row,mode); };
const SC1_TROPHY='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5a3 3 0 0 0 3.5 4M16 6h3.5a3 3 0 0 1-3.5 4M12 13v4M8.5 20h7"/></svg>';
const sc1Lock = (tid,k,mode) => { mode=mode||sc1Mode(); return paywallOn() && !isPremium() && !!uaDef(mode).lock(tid,k,mode); };
const sc1Total = mode => sc1List(mode).reduce((a,c)=>a+sc1Get(mode,c.tid,c.k),0);
const SC1_MAX = SC1_T.length*12*3;
const sc1Max = mode => sc1List(mode).length*3;
function sc1Next(tid,k,mode){ mode=mode||sc1Mode(); const L=sc1List(mode), i=L.findIndex(c=>c.tid===tid&&c.k===k); for(let j=1;j<=L.length;j++){ const c=L[(i+j)%L.length]; if(!sc1Lock(c.tid,c.k,mode)) return c; } return null; }
function sc1Todo(mode){ const L=sc1List(mode); return L.find(c=>!sc1Lock(c.tid,c.k,mode)&&sc1Get(mode,c.tid,c.k)<3) || L[0]; }
const sc1Item = (tid,k,mode) => uaDef(mode).item(tid,k,mode);
const sc1CellName = (tid,k,mode) => uaDef(mode).name(tid,k,mode);
const escA = x => esc(x).replace(/"/g,"&quot;");
// the scales: the first subject of the engine (unchanged since the « Gammes une à une » chantiers)
UA_DEF.scales={sec:"scales", col:SC1_COL, cups:true, rsep:7, sep:0, modes:[{v:"notes",l:()=>t("sc1Notes")},{v:"chords",l:()=>t("sc1Chords")}],
  cols:()=>{ const TY=t("sc1Types"); return SC1_T.map((id,j)=>({id, lg:TY[j][0], sh:TY[j][1]})); },
  rows:()=>SC1_PC.map(pc=>({id:pc, names:[...new Set(SC1_T.map(tid=>noteName(tonicNote(sc1K(tid,pc)))))]})),
  k:(mode,tid,pc)=>sc1K(tid,pc),
  item:(tid,k,mode)=>mode==="chords" ? {sec:"scales",tid,k,ch:1} : {sec:"scales",tid,k},
  name:(tid,k,mode)=>itemName(mode==="chords" ? {sec:"scales",tid,k,ch:1} : {sec:"scales",tid,k}),
  ok:(tid,k)=>!!TONICS[tid] && TONICS[tid].includes(k), lock:(tid,k)=>premType("scales",tid) || !keySimple(k), why:tid=>premType("scales",tid)?"types":"keys",
  row:(tid,k)=>keyPc(k), rowName:pc=>noteName(tonicNote(sc1K("major",pc))), tn:k=>noteName(tonicNote(k))};
function sc1Render(){ const P=$("sc1Panel"); if(!P) return; const mode=sc1Mode(), d=uaDef(mode), tr=railMQ.matches; SC1.tr=tr; SC1.lang=S.settings.lang+S.settings.notation;
  const tot=sc1Total(mode), mx=sc1Max(mode), C=d.cols(mode), Rw=d.rows(mode); P.dataset.sec=d.sec; uaUse(d.sec);
  const star=n=>'<span class="sc1-st" aria-hidden="true">'+[0,1,2].map(i=>'<i'+(i<n?' class="on"':'')+'>★</i>').join("")+'</span>';
  const cell=(tid,k,n,lk,nm,pos,lead,tail)=>'<button type="button" class="sc1-c s'+n+(lk?' pw-lk':'')+'"'+(pos?' style="'+pos+'"':'')+' data-tid="'+escA(tid)+'" data-k="'+escA(k)+'" aria-label="'+escA(t("sc1Cell")(nm,n))+'" title="'+escA(nm)+'">'+lead+star(n)+tail+(lk?pwChip():'')+'</button>';
  let h="", tpl="";
  if(d.flat){ // one cell per element (Oreille), no rows
    const row=Rw[0].id; C.forEach(c=>{ const k=d.k(mode,c.id,row); if(k==null) return; const n=sc1Get(mode,c.id,k), lk=sc1Lock(c.id,k,mode), nm=sc1CellName(c.id,k,mode);
      h+=cell(c.id,k,n,lk,nm,"",'<b class="ua-lb"><span class="lg">'+esc(c.lg)+'</span><span class="sh" aria-hidden="true">'+esc(c.sh)+'</span></b>',""); }); }
  else {
    const rs=d.rsep||0, cs=d.sep||0, nr=Rw.length, nc=C.length, cup=!!d.cups;
    const R=i=>rs && i>=rs ? i+2 : i+1, CC=j=>cs && j>=cs ? j+2 : j+1, pos=(r,c)=>tr ? "grid-row:"+(c+1)+";grid-column:"+(r+1) : "grid-row:"+(r+1)+";grid-column:"+(c+1);
    const fr=n=>"repeat("+n+",minmax(0,1fr))", lines=(n,sp)=>sp&&sp<n ? fr(sp)+" 3px "+fr(n-sp) : fr(n);
    tpl = tr ? "grid-template-columns:max-content "+lines(nr,rs)+";grid-template-rows:auto "+lines(nc,cs)+(cup?" clamp(18px,7vh,30px)":"")
             : "grid-template-columns:minmax(52px,max-content) "+lines(nc,cs)+(cup?" clamp(22px,4vw,34px)":"")+";grid-template-rows:auto "+lines(nr,rs);
    const lastC=cs&&cs<nc ? nc+1 : nc;
    h='<span class="sc1-corner" style="'+pos(0,0)+'"></span>';
    C.forEach((c,j)=>{ h+='<span class="sc1-th" style="'+pos(0,CC(j))+'"><b class="lg">'+esc(c.lg)+'</b><b class="sh" aria-hidden="true">'+esc(c.sh)+'</b></span>'; });
    if(rs && rs<nr) h+='<span class="sc1-sep" style="'+(tr?"grid-row:1/-1;grid-column:"+(rs+2):"grid-column:1/-1;grid-row:"+(rs+2))+'" aria-hidden="true"></span>';
    if(cs && cs<nc) h+='<span class="sc1-sep v" style="'+(tr?"grid-column:1/-1;grid-row:"+(cs+2):"grid-row:1/-1;grid-column:"+(cs+2))+'" aria-hidden="true"></span>';
    Rw.forEach((rw,i)=>{ const names=rw.names, r=R(i), on=cup && sc1Cup(mode,rw.id);
      h+='<span class="sc1-rh" style="'+pos(r,0)+'"><b>'+esc(names[0])+'</b>'+(names[1]?'<small>'+esc(names[1])+'</small>':'')+'</span>';
      if(cup) h+='<span class="sc1-cup'+(on?' on':'')+'" data-row="'+escA(rw.id)+'" style="'+pos(r,lastC+1)+'" role="img" aria-label="'+escA(t("sc1CupA")(names[0],on))+'" title="'+escA(t("sc1CupA")(names[0],on))+'">'+SC1_TROPHY+'</span>';
      C.forEach((c,j)=>{ const k=d.k(mode,c.id,rw.id); if(k==null) return; const n=sc1Get(mode,c.id,k), lk=sc1Lock(c.id,k,mode), nm=sc1CellName(c.id,k,mode);
        h+=cell(c.id,k,n,lk,nm,pos(r,CC(j)),"",names[1]&&d.tn?'<small class="sc1-tn">'+esc(d.tn(k))+'</small>':''); }); }); }
  const cups=d.cups ? Rw.length : 0;
  P.innerHTML='<div class="sc1-top"><h2 class="sc1-h"><span class="mb-ic">'+SEC_ICON(d.sec)+'</span><span>'+esc(t("sc1Name"))+'</span></h2>'
    +'<div class="seg sc1-seg" id="sc1Seg" role="group" aria-label="'+escA(d.modes.map(m=>m.l()).join(" / "))+'">'+d.modes.map(m=>'<button type="button" data-v="'+m.v+'" aria-pressed="'+(mode===m.v)+'"'+(m.s?' aria-label="'+escA(m.l())+'"><span class="lg">'+esc(m.l())+'</span><span class="sh" aria-hidden="true">'+esc(m.s())+'</span>':'>'+esc(m.l()))+'</button>').join("")+'</div>'
    +'<p class="sc1-sum" id="sc1Sum"><span class="sc1-big" aria-label="'+escA(t("sc1SumA")(tot,mx))+'"><i aria-hidden="true">★</i><b class="mono">'+tot+'</b><span aria-hidden="true"> / '+mx+'</span></span>'+(cups?'<span class="sc1-big sc1-cups" aria-label="'+escA(t("sc1Cups")(sc1Cups(mode),cups))+'">'+SC1_TROPHY+'<b class="mono">'+sc1Cups(mode)+'</b><span aria-hidden="true"> / '+cups+'</span></span>':'')+'</p></div>'
    +'<div class="sc1-grid'+(tr?' tr':'')+(d.flat?' ua-flat':'')+'" id="sc1Grid"'+(tpl?' style="'+tpl+'"':'')+'>'+h+'</div>';
  P.querySelectorAll("#sc1Seg [data-v]").forEach(b=>b.onclick=()=>{ if(sc1Mode()===b.dataset.v) return; uaModeSet(d.sec,b.dataset.v); sc1Render(); const f=$("sc1Seg").querySelector('[data-v="'+b.dataset.v+'"]'); if(f) f.focus({preventScroll:true}); });
  P.querySelectorAll(".sc1-c").forEach(b=>b.onclick=()=>sc1Play(b.dataset.tid,b.dataset.k)); }
// one scale, alone, in the exercise engine
function sc1Play(tid,k,mode){ mode=mode||sc1Mode(); const d=uaDef(mode); if(!d.ok(tid,k,mode)) return; uaUse(d.sec);
  if(sc1Lock(tid,k,mode)){ pwOpen(d.why(tid,k,mode)); return; }
  closeEnd();
  if(S.section!==d.sec){ S.section=d.sec; save(); }
  openPage("practice");
  const q=d.queue ? d.queue(tid,k,mode) : [sc1Item(tid,k,mode)];
  game=makeGame(q); game.label=sc1CellName(tid,k,mode); game.single=false; game.sc1={mode,sec:d.sec,tid,k,multi:q.length>1,best0:sc1Get(mode,tid,k),cup0:d.cups?sc1Cup(mode,d.row(tid,k,mode)):true,got:0,res:0,rev:false,err:0,errT:0,hits0:0}; game.i=-1; startRound(); }
// the end of a game: the stars won, Do = next scale, Si = again, back to the list
function sc1End(g){ uaUse(uaSecOf(g.sc1.mode)); if(page!=="sc1") openPage("sc1"); const d=uaDef(g.sc1.mode), pc=d.cups?d.row(g.sc1.tid,g.sc1.k,g.sc1.mode):null, cupNew=d.cups && !g.sc1.cup0 && sc1Cup(g.sc1.mode,pc); // the summary opens over the list, with its new stars
  const s=g.sc1, n=s.stars|0, best=sc1Get(s.mode,s.tid,s.k), ch=s.mode==="chords", nx=sc1Next(s.tid,s.k,s.mode);
  $("endTitle").textContent=sc1CellName(s.tid,s.k,s.mode);
  const B=$("endBody"); B.innerHTML='<div class="sc1-end"><small class="pp-k">'+esc(t("sc1Name")+" · "+sc1ModeName(s.mode))+'</small>'
    +'<p class="pp-stars sc1-stars" role="img" aria-label="'+escA(t("sc1StarsA")(n))+'">'+[0,1,2].map(i=>'<span'+(i<n?' class="on"':'')+' style="--d:'+(i*220)+'ms">★</span>').join("")+'</p>'
    +(cupNew?'<p class="sc1-cupwon"><span class="sc1-cup on" aria-hidden="true">'+SC1_TROPHY+'</span><b>'+esc(t("sc1CupWon")(sc1RowName(pc,s.mode)))+'</b></p>':'')
    +'<p class="sc1-msg">'+esc(t("sc1R")(n,ch))+'</p>'
    +(best>n?'<p class="sc1-best">'+esc(t("sc1Best"))+' <span role="img" aria-label="'+escA(t("sc1StarsA")(best))+'">'+"★".repeat(best)+"☆".repeat(3-best)+'</span></p>':recNew(s.best0,n,"stars")?'<p class="sc1-best new">'+esc(t("sc1New"))+'</p>':'')
    +'<p class="sc1-tot"><span aria-hidden="true">★ </span>'+esc(t("sc1SumA")(sc1Total(s.mode),sc1Max(s.mode)))+(d.cups?' · '+esc(t("sc1Cups")(sc1Cups(s.mode),d.rows(s.mode).length)):'')+'</p></div>';
  { const li=levelInfo(S.xp), nxe=document.createElement("div"); nxe.className="end-next"; nxe.id="endNext";
    nxe.innerHTML='<div class="en-row"><b></b><span class="en-bar"><i></i></span></div><p></p>'; nxe.querySelector("b").textContent="+"+fmtN(Math.max(0,S.xp-g.xp0))+" XP · "+t("endNext")(fmtN(li.need-li.into), fmtN(li.L+1));
    const sk=effStreak(); nxe.querySelector("p").textContent = sk ? t("endStreak")(sk) : ""; B.appendChild(nxe); try{ endNextMotion(nxe, g, li, sk); }catch(e){} }
  const F=$("endFoot"); F.innerHTML="";
  const btn=(lbl,cls,fn,k)=>{ const b=document.createElement("button"); b.type="button"; b.className="btn "+cls; b.textContent=lbl; b.onclick=fn; if(k){ const kb=kbdEl(); kb.textContent=k; b.appendChild(kb); } F.appendChild(b); return b; };
  btn(t("sc1Back"),"",()=>{ closeEnd(); if(page!=="sc1") openPage("sc1"); }).id="sc1Back";
  btn(t("sc1Again"),"",()=>sc1Play(s.tid,s.k,s.mode),BNAME()).id="sc1Again";
  const go=nx ? btn(t("sc1NextB")(sc1CellName(nx.tid,nx.k,s.mode)),"primary",()=>sc1Play(nx.tid,nx.k,s.mode),CNAME()) : null; if(go) go.id="sc1Next";
  $("endX").setAttribute("aria-label",t("closeLbl")); if(!endOpen) modalOpened(); endOpen=true; $("endModal").hidden=false;
  (go||F.lastChild).focus({preventScroll:true}); if((cupNew || (n===3 && n>s.best0)) && !lvlUp) setTimeout(()=>{ try{ confetti(); }catch(e){} },150); }
// LEARN: the tiles of the subjects open this page (uaTiles in js/886-matieres-une-a-une.js) ; « Gammes » = the scales
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
{ const o=success; success=sc1Fix(function(){ const g=sc1On()?game.sc1:null, e=errors, last=!!game && game.i>=game.total-1, add=cur ? (cur.sec==="ear" ? 1 : seq.length) : 0; const r=o.apply(this,arguments);
    if(g){ g.err=Math.max(e,g.err|0); g.errT=(g.errT|0)+e;
      if(g.multi){ g.hits0=(g.hits0|0)+add; if(!g.got && g.hits0>=3){ g.got=1; sc1Set(g.mode,g.tid,g.k,1); } if(!last) return r; } // several elements (inversions, listens): the stars at the last one
      const n=((g.multi?g.errT:e)===0 && !g.rev) ? 3 : 2; g.res=Math.max(g.res|0,n); sc1Set(g.mode,g.tid,g.k,n);
      const d=uaDef(g.mode), pc=d.cups ? d.row(g.tid,g.k,g.mode) : null; if(d.cups && !g.cup0 && sc1Cup(g.mode,pc)) try{ ntfAdd({key:"sc1cup-"+g.mode+"-"+pc, cat:"progress", type:"unlock", ti:t("sc1CupWon")(sc1RowName(pc,g.mode))+" · "+sc1ModeName(g.mode), tx:t("sc1CupNtf"), act:{k:"learn",l:"ntfPlay"}}); }catch(e){} } return r; }); }
// 3 right notes (or chords) of the scale: the first star at once, even if the scale is not finished
{ const o=noteIn; noteIn=function(){ const r=o.apply(this,arguments); try{ const g=sc1On()?game.sc1:null; if(g && !g.got && !g.train && cur && phase==="listening" && (g.hits0|0)+idx>=3){ g.got=1; sc1Set(g.mode,g.tid,g.k,1); } }catch(e){} return r; }; }
{ const o=finishGame; finishGame=function(){ const g=game; if(!(g && g.sc1)) return o.apply(this,arguments);
    const s=g.sc1; if(s.multi && !s.train && g.results.filter(Boolean).length>=g.total && !s.res){ s.res=2; sc1Set(s.mode,s.tid,s.k,2); } // the last listen missed: finished, with a mistake
    s.stars=Math.max(s.res|0, s.got?1:0); g.single=true; const done=g.results.filter(Boolean).length; const r=o.apply(this,arguments);
    if(!done){ if(s.got) sc1End(g); else setTimeout(()=>{ if(!game && page==="practice" && !endOpen) openPage("sc1"); },0); } // stopped before the end
    return r; }; }
{ const o=openEnd; openEnd=function(g){ if(g && g.sc1) return sc1End(g); return o.apply(this,arguments); }; }
{ const o=endNext; endNext=function(g){ if(g && g.sc1){ const nx=sc1Next(g.sc1.tid,g.sc1.k,g.sc1.mode); if(nx) sc1Play(nx.tid,nx.k,g.sc1.mode); return; } return o.apply(this,arguments); }; }
{ const o=endReplay; endReplay=function(g){ if(g && g.sc1){ sc1Play(g.sc1.tid,g.sc1.k,g.sc1.mode); return; } return o.apply(this,arguments); }; }
// on the list, a lone C plays the next scale to work on
{ const o=midiStart; midiStart=function(note){ const pc=((note%12)+12)%12; if(page==="sc1" && S.settings.midiC!==false && (pc===0||pc===11)){
    if(endOpen && lastGame && lastGame.sc1 && !openMods.length && !helpOpen && !midiOpen){ if(pc===0) endNext(lastGame); else endReplay(lastGame); return true; } // the summary: C = next, B = again
    if(pc===0 && !anyModal()){ const c=sc1Todo(sc1Mode()); sc1Play(c.tid,c.k); return true; } return false; }
  return o.apply(this,arguments); }; }
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
/* ==== fin Gammes une à une ==== */
