// fragment de l'IIFE principale — ordre 840, voir src/app/README.md
/* ==== Gammes une à une : choix du mode (chantier sc1-pop) ==== */
// Chaque lancement d'une gamme depuis la liste (case, Do seul sur la liste, « Suivante » et Do sur la fin de partie) ouvre d'abord la fenêtre
// #sc1Pick (sc1Ask) : la gamme et ses étoiles, puis deux grands choix expliqués, Entraînement (Do) et Évaluation (Mi). Le choix conseillé
// (sc1TrPick : Entraînement à 0 étoile, sinon le dernier mode choisi) est mis en avant et reçoit le focus (Entrée). Si, Échap, la croix ou un
// clic à côté ferment sans rien lancer. Clavier d'ordinateur : les touches du clavier de notes (A = Do, D = Mi, J = Si, position physique).
// sc1Play sans mode demande toujours ; avec un mode (pastilles #sc1Tm, « Passer à l'évaluation », « Recommencer ») il lance directement.
// Fin d'entraînement : Do = rejouer, Mi = passer à l'évaluation, Si = revoir. Tests : tools/audit/r46_gammes1.mjs, r49_sc1train.mjs.
Object.assign(TXT.fr,{sc1PkQ:"Comment veux-tu la jouer ?", sc1PkRec:"Conseillé", sc1PkNone:"Pas encore jouée",
  sc1PkTr:"Je te montre la gamme note par note, puis tu la rejoues avec les touches allumées. Rien n'est noté, à ton rythme.",
  sc1PkTrC:"Je te montre les accords de la gamme un par un, puis tu les rejoues avec les touches allumées. Rien n'est noté, à ton rythme.",
  sc1PkEv:"Tu joues la gamme sans aide. Sans faute : 3 étoiles.", sc1PkEvC:"Tu joues les accords de la gamme sans aide. Sans faute : 3 étoiles."});
Object.assign(TXT.en,{sc1PkQ:"How do you want to play it?", sc1PkRec:"Recommended", sc1PkNone:"Not played yet",
  sc1PkTr:"I show you the scale note by note, then you play it back with the keys lit. Nothing is scored, take your time.",
  sc1PkTrC:"I show you the chords of the scale one by one, then you play them back with the keys lit. Nothing is scored, take your time.",
  sc1PkEv:"You play the scale without help. No mistake: 3 stars.", sc1PkEvC:"You play the chords of the scale without help. No mistake: 3 stars."});
const ENAME = () => (S.settings.notation==="fr"?PC_FR:PC_EN)[4];
const SC1P={c:null};
{ const m=document.createElement("div"); m.className="modal"; m.id="sc1Pick"; m.hidden=true; m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-labelledby","sc1PkT");
  m.innerHTML='<div class="modal-bg" data-close="sc1Pick"></div><div class="modal-card sc1-pk"><div class="modal-head"><div><h2 id="sc1PkT"></h2><p class="modal-sub sc1pk-sub" id="sc1PkS"></p></div>'
    +'<button class="modal-close" id="sc1PkX" type="button" data-close="sc1Pick" aria-label="Close">×</button></div><div class="modal-body"><p class="sc1pk-q" id="sc1PkQ"></p><div class="sc1pk-opts" id="sc1PkO"></div></div></div>';
  $("leaveModal").after(m); }
const SC1_PK_IC={train:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.6-6.5 9.5-6.5S21.5 12 21.5 12s-3.6 6.5-9.5 6.5S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  eval:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2l2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8-5.3 2.8 1-6-4.4-4.2 6-.9z"/></svg>'};
// open the choice for one scale (nothing starts until a choice is made)
function sc1Ask(tid,k,mode){ mode=mode||sc1Mode(); const d=uaDef(mode); if(!d.ok(tid,k,mode)) return; uaUse(d.sec);
  if(sc1Lock(tid,k,mode)){ pwOpen(d.why(tid,k,mode)); return; }
  if(endOpen) closeEnd();
  openMods.slice().forEach(id=>{ if(id!=="sc1Pick") closeMod(id); }); // one window at a time
  const n=sc1Get(mode,tid,k), ch=mode==="chords", rec=sc1TrPick(tid,k,mode) ? "train" : "eval", md=midiMode() && S.settings.midiC!==false;
  SC1P.c={tid,k,mode};
  $("sc1PkT").textContent=sc1CellName(tid,k,mode)+" · "+sc1ModeName(mode);
  $("sc1PkS").innerHTML='<span class="sc1-st" role="img" aria-label="'+escA(t("sc1StarsA")(n))+'">'+[0,1,2].map(i=>'<i'+(i<n?' class="on"':'')+'>★</i>').join("")+'</span>'+(n?'':'<span>'+esc(t("sc1PkNone"))+'</span>');
  $("sc1PkQ").textContent=t("sc1PkQ"); $("sc1PkX").setAttribute("aria-label",t("closeLbl"));
  const O=$("sc1PkO"); O.innerHTML="";
  [["train","sc1Train",ch?"sc1PkTrC":"sc1PkTr",CNAME()],["eval","sc1Eval",ch?"sc1PkEvC":"sc1PkEv",ENAME()]].forEach(([v,l,d,key])=>{
    const b=document.createElement("button"); b.type="button"; b.className="sc1pk-o"+(v===rec?" rec":""); b.dataset.v=v; b.id=v==="train"?"sc1PkTrain":"sc1PkEval";
    b.innerHTML='<span class="sc1pk-ic">'+SC1_PK_IC[v]+'</span><b>'+esc(t(l))+'</b>'+'<p>'+esc(t(d))+'</p>'+'<kbd class="kn">'+esc(key)+'</kbd>'; // v3 : plus d'étiquette « Conseillé » ; la touche ne se montre qu'avec un clavier MIDI branché (body.midi-ok)
    b.onclick=()=>sc1Pick(v); O.appendChild(b); });
  openMod("sc1Pick"); const f=O.querySelector(".rec"); if(f) f.focus({preventScroll:true}); }
// the choice: remembered (it becomes the recommended one next time), then the scale starts in that mode
function sc1Pick(v){ const c=SC1P.c; if(!c || $("sc1Pick").hidden) return; SC1P.c=null; S.settings.sc1Train=v==="train"?"train":"eval"; save(); closeMod("sc1Pick"); sc1Play(c.tid,c.k,c.mode,S.settings.sc1Train); }
const sc1PkOn = () => !$("sc1Pick").hidden && openMods[openMods.length-1]==="sc1Pick";
// ---- hooks ----
// without a mode, a scale is always asked first (the list, Do on the list, « Next »); with a mode it starts at once
{ const o=sc1Play; sc1Play=function(tid,k,mode,tm){ if(!tm) return sc1Ask(tid,k,mode); return o.apply(this,arguments); }; }
// « Recommencer » (button and Si on the summary): the same scale, again in Evaluation (the summary only follows an Evaluation)
{ const o=sc1End; sc1End=function(g){ const r=o.apply(this,arguments); const b=$("sc1Again"), s=g&&g.sc1; if(b && s) b.onclick=()=>sc1Play(s.tid,s.k,s.mode,"eval"); return r; }; }
{ const o=endReplay; endReplay=function(g){ if(g && g.sc1){ sc1Play(g.sc1.tid,g.sc1.k,g.sc1.mode,"eval"); return; } return o.apply(this,arguments); }; }
// MIDI, a lone note: in the window Do = Training, Mi = Test, Si = close; after a training, Mi = take the test
{ const o=midiStart; midiStart=function(note){ const pc=((note%12)+12)%12;
    if(sc1PkOn()){ if(S.settings.midiC===false) return false; if(pc===0){ sc1Pick("train"); return true; } if(pc===4){ sc1Pick("eval"); return true; } if(pc===11){ closeMod("sc1Pick"); return true; } return false; }
    if(pc===4 && sc1Tr() && phase==="success" && S.settings.midiC!==false && !anyModal() && !setOpen){ sc1Switch("eval"); return true; }
    return o.apply(this,arguments); }; }
// the computer keyboard: the note keys (C, E, B) as on the MIDI keyboard; Enter = the focused (recommended) choice
document.addEventListener("keydown",e=>{ if(!sc1PkOn() || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return; const m=CODE_MAP[e.code]; if(m==null) return; const pc=m%12;
  if(pc===0||pc===4||pc===11){ e.preventDefault(); e.stopImmediatePropagation(); if(pc===11) closeMod("sc1Pick"); else sc1Pick(pc===0?"train":"eval"); } },true);
// the end of a training: « Take the test » shows its key (Mi)
{ const o=renderActions; renderActions=function(){ const r=o.apply(this,arguments); try{ const b=$("sc1ToEval"); if(b && sc1Tr() && phase==="success" && midiMode() && S.settings.midiC!==false && !b.querySelector("kbd")){ const x=kbdEl(); x.textContent=ENAME(); b.appendChild(x); } }catch(e){} return r; }; }
// Accords d'une gamme (Gammes une à une) : par défaut, chaque accord prend le renversement le plus pratique à la suite (sc1Voice) : parmi
// fondamental / 1er / 2e renversement (et les octaves proches), le moindre déplacement des voix depuis l'accord précédent, la main gardée près
// de l'accord de tonique (coût = mouvement des voix + 3 × écart du centre à celui de l'accord de tonique ; égalité = le moins renversé).
// Do majeur : Do-Mi-Sol, Ré-Fa-La, Si-Mi-Sol, Do-Fa-La, Si-Ré-Sol, Do-Mi-La, Si-Ré-Fa, Do-Mi-Sol. Montré par la démo, les touches guidées et
// « Montre-moi », doigtés (chordFingers) d'après ce renversement ; la case l'indique (.sc1-inv). L'évaluation accepte tout renversement
// (comparaison par classes de hauteur, inchangée).
Object.assign(TXT.fr,{sc1Inv:["","1er renv.","2e renv.","3e renv."], sc1InvS:["","1er","2e","3e"]});
Object.assign(TXT.en,{sc1Inv:["","1st inv.","2nd inv.","3rd inv."], sc1InvS:["","1st","2nd","3rd"]});
const sc1Mean = v => v.reduce((a,m)=>a+m,0)/v.length;
function sc1Voice(steps){ if(!steps.length || !steps[0].notes) return steps; const A=steps[0].voicing.slice().sort((a,b)=>a-b), am=sc1Mean(A), lo=A[0]-7, hi=A[A.length-1]+9;
  let prev=A; const out=steps.map((st,i)=>{ if(!i) return st; const N=st.notes; let best=null;
    for(let inv=0;inv<N.length;inv++){ const bpc=N[inv].pc;
      for(let b=prev[0]-9;b<=prev[0]+9;b++){ if(((b%12)+12)%12!==bpc) continue; const v=voiceAt(N,inv,b), s=v.slice().sort((x,y)=>x-y);
        if(s[0]<lo || s[s.length-1]>hi) continue;
        const cost=s.reduce((a,m,j)=>a+Math.abs(m-prev[Math.min(j,prev.length-1)]),0)+3*Math.abs(sc1Mean(s)-am);
        if(!best || cost<best.cost-1e-9) best={inv,v,cost}; } }
    if(!best) return st; prev=best.v.slice().sort((x,y)=>x-y); return {...st, inv:best.inv, voicing:best.v, bassPc:N[best.inv].pc}; });
  // the whole sequence moved by octaves to sit inside the visible keyboard (a chord split by the fold would show wrong keys and fingers)
  const all=out.flatMap(st=>st.voicing), mn=Math.min(...all), mx=Math.max(...all); let k=0;
  while(mn+12*k<LOW) k++; while(mx+12*k>HIGH && mn+12*(k-1)>=LOW) k--;
  return k ? out.map(st=>({...st, voicing:st.voicing.map(m=>m+12*k)})) : out; }
{ const o=scaleChordSteps; scaleChordSteps=function(){ const r=o.apply(this,arguments); try{ if(sc1On() && game.sc1.mode==="chords") return sc1Voice(r); }catch(e){ console.warn(e); } return r; }; }
// the box says which inversion (discreetly)
{ const o=renderSlots; renderSlots=function(){ const r=o.apply(this,arguments); try{ if(sc1On() && game.sc1.mode==="chords" && seq.length && seq[0].voicing){ const box=$("slots");
      [...box.children].forEach((d,i)=>{ const st=seq[i]; if(!st || !d.classList.contains("chordslot")) return; const n=st.inv|0, x=document.createElement("small"); x.className="sc1-inv"+(n?"":" none");
        x.innerHTML='<span class="lg">'+esc(t("sc1Inv")[n]||"")+'</span><span class="sh">'+esc(t("sc1InvS")[n]||"")+'</span>'; if(!n) x.setAttribute("aria-hidden","true"); d.appendChild(x); }); } }catch(e){ console.warn(e); } return r; }; }
// Les aides suivent l'octave jouée (tous les exercices LEARN, Gammes une à une compris) : touches guidées, doigtés, « Je sèche » et la
// démonstration se placent dans l'octave où le joueur a réellement joué sa dernière bonne note (gammes en notes : la dernière note trouvée ;
// accords d'une suite : chaque note juste recale toute la suite) ; le clavier à l'écran se décale pour les montrer (followMidi).
// OSH = {key, d} : décalage en demi-tons (multiple de 12) gardé pour la même gamme le temps des reprises (« À toi », « Revoir la gamme »),
// remis à zéro à chaque nouvel exercice (startRound sans reprise).
const OSH={key:"", d:0, busy:false};
const oshKey = () => cur ? [cur.sec,cur.tid,cur.k,cur.ch?1:0,cur.pid||"",cur.root||""].join("|") : "";
const oshOn = () => OSH.key && OSH.key===oshKey();
// only when something is shown there (guided keys, a reveal or the demo): otherwise the keyboard stays as MIDI left it (midiWiden, followMidi)
const oshVis = () => phase==="revealed" || (phase==="listening" && guideKeysOn());
function oshShow(lo,hi){ if(OSH.busy || !oshVis() || (lo>=LOW && hi<=HIGH) || hi-lo>HIGH-LOW) return; OSH.busy=true;
  try{ if(hi>HIGH) followMidi(hi); if(lo<LOW) followMidi(lo); } finally{ OSH.busy=false; } }
{ const o=revealMidis; revealMidis=function(){ if(!cur || cur.sec==="ear" || chSeq() || !seq.length) return o.apply(this,arguments);
    const ms=seqMidis(); let d=null;
    if(played.length){ if(chordLike(cur.sec)){ const j=found.indexOf(true); d=12*Math.round((played[0]-ms[j>=0?j:0])/12); }
      else { const j=Math.max(0,idx-1); d=12*Math.round((played[played.length-1]-ms[j])/12); } }
    else if(oshOn()) d=OSH.d;
    if(d===null) return o.apply(this,arguments);
    OSH.key=oshKey(); OSH.d=d; const r=ms.map(m=>m+d); oshShow(Math.min(...r),Math.max(...r)); return r; }; }
// a sequence of chords: a right note in another octave moves the whole sequence there (guide, fingering, reveal, demo)
function oshShiftSeq(dd){ if(!dd) return; seq.forEach(st=>{ if(st.voicing) st.voicing=st.voicing.map(m=>m+dd); }); }
function oshChord(){ if(!cur || !chSeq() || phase!=="listening" || !played.length || !seq[pStep]) return;
  const m=played[played.length-1], st=seq[pStep], v=st.voicing.find(x=>((x-m)%12+12)%12===0); if(v==null) return;
  const dd=12*Math.round((m-v)/12); if(!dd) return; oshShiftSeq(dd); OSH.key=oshKey(); OSH.d=(oshOn()?OSH.d:0)+dd;
  oshShow(Math.min(...st.voicing),Math.max(...st.voicing)); guideKeys(); }
{ const o=markPlayed; markPlayed=function(){ const r=o.apply(this,arguments); try{ if(!OSH.busy) oshChord(); }catch(e){ console.warn(e); } return r; }; }
{ const o=startRound; startRound=function(item,retry){ const k0=oshKey(), d0=OSH.d, keep=!!retry && OSH.key===k0; const r=o.apply(this,arguments);
    try{ if(keep && OSH.key===oshKey()){ if(chSeq()){ OSH.d=0; oshShiftSeq(d0); OSH.d=d0; oshShow(Math.min(...seq[0].voicing),Math.max(...seq[0].voicing)); guideKeys(); } }
      else if(!keep){ OSH.key=""; OSH.d=0; } }catch(e){ console.warn(e); } return r; }; }
// Fin d'une Évaluation à 3 étoiles en NOTES : « Jouer en accords » (#sc1ToCh) ouvre la fenêtre du choix pour la même gamme en ACCORDS et
// bascule la liste sur ACCORDS. Mis en avant (Do) tant que cette gamme n'a pas 3 étoiles en accords ; sinon « Suivante » reste le bouton
// principal (Do) et « Jouer en accords » passe en secondaire. Le bouton secondaire des deux prend Mi ; Si = Recommencer.
Object.assign(TXT.fr,{sc1ToCh:"Jouer en accords"}); Object.assign(TXT.en,{sc1ToCh:"Play it in chords"});
function sc1ToChords(tid,k){ S.settings.sc1Mode="chords"; save(); if(page==="sc1") sc1Render(); sc1Ask(tid,k,"chords"); }
{ const o=sc1End; sc1End=function(g){ const r=o.apply(this,arguments); try{ const s=g&&g.sc1; if(s && s.mode==="notes" && (s.stars|0)>=3){
      const F=$("endFoot"), nx=$("sc1Next"), md=midiMode() && S.settings.midiC!==false, main=sc1Get("chords",s.tid,s.k)<3 || !nx;
      const b=document.createElement("button"); b.type="button"; b.id="sc1ToCh"; b.className="btn"+(main?" primary":""); b.textContent=t("sc1ToCh"); b.onclick=()=>sc1ToChords(s.tid,s.k);
      const kb=x=>{ const e=kbdEl(); e.textContent=x; return e; };
      const sec=main?nx:b; if(main && nx){ nx.classList.remove("primary"); const e=nx.querySelector("kbd"); if(e) e.remove(); }
      { b.appendChild(kb(main?CNAME():ENAME())); if(main && nx) nx.appendChild(kb(ENAME())); }
      if(sec) sec.dataset.mi="1";
      if(main){ F.appendChild(b); b.focus({preventScroll:true}); } else F.insertBefore(b, nx); } }catch(e){ console.warn(e); } return r; }; }
// MIDI on that summary: Do = the main button, Mi = the other one (Si stays « Start again »)
{ const o=midiStart; midiStart=function(note){ const pc=((note%12)+12)%12;
    if((pc===0||pc===4) && page==="sc1" && endOpen && $("sc1ToCh") && !openMods.length && !helpOpen && !midiOpen && S.settings.midiC!==false){
      const b = pc===0 ? $("endFoot").querySelector(".btn.primary") : $("endFoot").querySelector('[data-mi="1"]'); if(b){ b.click(); return true; } }
    return o.apply(this,arguments); }; }
// RÉVISION : bouton #sc1RvB près de NOTES | ACCORDS (« Révision · n », désactivé sans gamme à 3 étoiles dans le mode) → fenêtre #sc1Rv :
// explication, nombre de gammes, chrono par gamme (S.settings.sc1RvT = 0 | 30 | 20 | 10 s), « Mélanger l'ordre » (S.settings.sc1RvMix,
// coché par défaut), « Lancer la révision » (Do ; Si = fermer). La révision = une partie à plusieurs éléments du moteur LEARN (items marqués
// sc1rv, gardés par stripItem pour « Retravailler les erreurs »), en montée et en triades, le chrono appliqué à chaque gamme par S.settings.delay
// prêté (rvFix, jamais sauvegardé), écran de fin habituel. Les étoiles ne bougent pas (ni perdues ni gagnées).
Object.assign(TXT.fr,{sc1Rv:"Révision", sc1RvB:n=>"Révision · "+(n>1?"tes "+n+" gammes":"ta gamme"), sc1RvBS:n=>n>1?"Tes "+n+" gammes":"Ta gamme", sc1RvTi:n=>"Révision de "+(n>1?"tes "+n+" gammes":"ta gamme"), sc1RvNone:"Obtiens 3 étoiles sur une gamme pour la réviser ici.",
  sc1RvTx:"Rejoue d'un coup toutes les gammes que tu as réussies sans faute (3 étoiles), pour les garder en mémoire.",
  sc1RvN:(n,m)=>n+(n>1?" gammes":" gamme")+" · "+m, sc1RvT:"Chrono par gamme", sc1RvMix:"Mélanger l'ordre", sc1RvGo:"Lancer la révision"});
Object.assign(TXT.en,{sc1Rv:"Review", sc1RvB:n=>"Review · "+(n>1?"your "+n+" scales":"your scale"), sc1RvBS:n=>n>1?"Your "+n+" scales":"Your scale", sc1RvTi:n=>"Review your "+(n>1?n+" scales":"scale"), sc1RvNone:"Get 3 stars on a scale to review it here.",
  sc1RvTx:"Play again, in one go, every scale you nailed without a mistake (3 stars), to keep them in mind.",
  sc1RvN:(n,m)=>n+(n>1?" scales":" scale")+" · "+m, sc1RvT:"Timer per scale", sc1RvMix:"Shuffle the order", sc1RvGo:"Start the review"});
const SC1_RVT=[0,30,20,10];
const sc1RvList = mode => sc1List(mode).filter(c=>!sc1Lock(c.tid,c.k,mode) && sc1Get(mode,c.tid,c.k)>=3);
const sc1RvT = () => 0; // v3 (Antoine) : pas de chrono dans la révision ; S.settings.sc1RvT, s'il existe, est ignoré
const sc1RvMix = () => S.settings.sc1RvMix!==false;
{ const m=document.createElement("div"); m.className="modal"; m.id="sc1Rv"; m.hidden=true; m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-labelledby","sc1RvTi");
  m.innerHTML='<div class="modal-bg" data-close="sc1Rv"></div><div class="modal-card small sc1-rv"><div class="modal-head"><div><h2 id="sc1RvTi"></h2><p class="modal-sub" id="sc1RvS"></p></div>'
    +'<button class="modal-close" id="sc1RvX" type="button" data-close="sc1Rv" aria-label="Close">×</button></div>'
    +'<div class="modal-body"><p class="sc1rv-tx" id="sc1RvTx"></p>'
    +'<label class="sc1rv-mix"><input type="checkbox" id="sc1RvMix"> <span id="sc1RvMixL"></span></label></div>'
    +'<div class="modal-foot end-foot"><button class="btn primary" type="button" id="sc1RvGo"></button></div></div>';
  $("sc1Pick").after(m);
  $("sc1RvGo").onclick=()=>sc1RvStart(); $("sc1RvMix").onchange=e=>{ S.settings.sc1RvMix=!!e.target.checked; save(); }; }
function sc1RvRender(){ const mode=sc1Mode(), n=sc1RvList(mode).length, md=midiMode() && S.settings.midiC!==false, T=sc1RvT();
  $("sc1RvTi").textContent=n?t("sc1RvTi")(n):t("sc1Rv"); $("sc1RvS").textContent=t("sc1RvN")(n,sc1ModeName(mode)); $("sc1RvTx").textContent=t("sc1RvTx");
  $("sc1RvMixL").textContent=t("sc1RvMix"); $("sc1RvMix").checked=sc1RvMix(); $("sc1RvX").setAttribute("aria-label",t("closeLbl"));
  // v3 : plus de chrono dans la révision (gardé pour les jeux et les duels)
  const go=$("sc1RvGo"); go.textContent=t("sc1RvGo"); { const k=kbdEl(); k.textContent=CNAME(); go.appendChild(k); } go.disabled=!n; }
function sc1RvOpen(){ if(!sc1RvList(sc1Mode()).length) return; if(endOpen) closeEnd(); openMods.slice().forEach(id=>{ if(id!=="sc1Rv") closeMod(id); }); sc1RvRender(); openMod("sc1Rv"); $("sc1RvGo").focus({preventScroll:true}); }
function sc1RvStart(){ const mode=sc1Mode(), L=sc1RvList(mode); if(!L.length) return; if(!$("sc1Rv").hidden) closeMod("sc1Rv");
  const d=uaDef(mode), q=L.flatMap(c=>(d.rvItems ? d.rvItems(c.tid,c.k,mode) : [sc1Item(c.tid,c.k,mode)]).map(it=>({...it, sc1rv:1}))); if(sc1RvMix()) for(let i=q.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [q[i],q[j]]=[q[j],q[i]]; }
  closeEnd(); if(S.section!==d.sec){ S.section=d.sec; save(); } openPage("practice");
  game=makeGame(q); game.label=t("sc1Rv")+" · "+sc1ModeName(mode); game.single=false; game.i=-1; startRound(); }
const sc1RvOn = () => !$("sc1Rv").hidden && openMods[openMods.length-1]==="sc1Rv";
// during a review: up, triads, and the chosen timer per scale (lent, never saved)
const rvOn = () => !!(game && game.queue && game.queue.length && game.queue.every(it=>it && it.sc1rv));
const RV={tmp:0, keep:null};
function rvFix(fn){ return function(){ if(!rvOn()) return fn.apply(this,arguments); const s=S.settings;
  if(!RV.tmp++){ RV.keep={sc7:s.sc7, dir:s.dir, delay:s.delay}; const T=sc1RvT(), ch=!!game.queue[0].ch; s.sc7=false; s.dir="up"; s.delay=T ? T/(ch?(s.octave?8:7):1) : 0; }
  try{ return fn.apply(this,arguments); } finally{ if(!--RV.tmp){ const k=RV.keep; RV.keep=null; ["sc7","dir","delay"].forEach(x=>{ if(k[x]===undefined) delete s[x]; else s[x]=k[x]; }); } } }; }
{ const o=save; save=function(){ if(!RV.tmp || !RV.keep) return o.apply(this,arguments); const s=S.settings, now={sc7:s.sc7, dir:s.dir, delay:s.delay};
    ["sc7","dir","delay"].forEach(x=>{ if(RV.keep[x]===undefined) delete s[x]; else s[x]=RV.keep[x]; }); try{ return o.apply(this,arguments); } finally{ Object.assign(s,now); } }; }
startRound=rvFix(startRound); render=rvFix(render); success=rvFix(success); reveal=rvFix(reveal); tick=rvFix(tick); grade=rvFix(grade);
{ const o=stripItem; stripItem=function(it){ const r=o.apply(this,arguments); if(it && it.sc1rv) r.sc1rv=1; return r; }; }
// the list: the button next to NOTES | CHORDS
{ const o=sc1Render; sc1Render=function(){ const r=o.apply(this,arguments); try{ const seg=$("sc1Seg"); if(!seg) return r; const n=sc1RvList(sc1Mode()).length;
      const b=document.createElement("button"); b.type="button"; b.id="sc1RvB"; b.className="btn sc1-rvb"; if(n){ b.innerHTML='<span class="lg">'+esc(t("sc1RvB")(n))+'</span><span class="sh" aria-hidden="true">'+esc(t("sc1RvBS")(n))+'</span>'; b.setAttribute("aria-label",t("sc1RvB")(n)); } else b.textContent=t("sc1Rv");
      if(!n){ b.setAttribute("aria-disabled","true"); b.title=t("sc1RvNone"); b.setAttribute("aria-label",t("sc1Rv")+" : "+t("sc1RvNone")); } b.onclick=()=>{ if(n) sc1RvOpen(); };
      seg.after(b); }catch(e){ console.warn(e); } return r; }; }
// MIDI in the review window: Do = start, Si = close
{ const o=midiStart; midiStart=function(note){ const pc=((note%12)+12)%12;
    if(sc1RvOn()){ if(S.settings.midiC===false) return false; if(pc===0){ sc1RvStart(); return true; } if(pc===11){ closeMod("sc1Rv"); return true; } return false; }
    return o.apply(this,arguments); }; }
/* ==== fin Gammes une à une : choix du mode ==== */
