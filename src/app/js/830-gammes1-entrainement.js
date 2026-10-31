// fragment de l'IIFE principale — ordre 830, voir src/app/README.md
/* ==== Gammes une à une : entraînement (chantier sc1-train) ==== */
// Au lancement d'une gamme (case de la liste sc1), deux modes, pastilles #sc1Tm dans la barre du jeu : ENTRAÎNEMENT (game.sc1.train) et
// ÉVALUATION (l'actuel, étoiles). Entraînement = d'abord une démonstration (sc1Demo : la gamme jouée et allumée note par note, à un tempo calme,
// noms sur les cases, doigtés si activés), puis « À toi » (sc1Turn) : la même gamme, guidée (touche suivante allumée et noms, comme les aides
// guideK + guideN, sans les sauvegarder), fausses notes signalées sans compter, ni chrono, ni étoiles, ni XP. Fin : « Bien joué ! » +
// Revoir la gamme (Si) / Passer à l'évaluation / Rejouer (Do). « Revoir la gamme » relance la démonstration à tout moment.
// Choix conseillé (sc1TrPick) dans la fenêtre #sc1Pick (chantier sc1-pop, plus de lancement direct) : entraînement si la gamme a 0 étoile,
// sinon le dernier mode choisi (S.settings.sc1Train = "train" | "eval", retenu seulement quand le joueur le choisit). Passer d'Évaluation à Entraînement en pleine partie abandonne la tentative, sans pénalité.
// Test : tools/audit/r49_sc1train.mjs.
Object.assign(TXT.fr,{sc1Train:"Entraînement", sc1Eval:"Évaluation", sc1TmA:"Mode de la gamme", sc1See:"Revoir la gamme", sc1Your:"À toi",
  sc1DemoSub:"Regarde et écoute la gamme, note par note.", sc1DemoSubC:"Regarde et écoute les accords de la gamme, un par un.", sc1TurnSub:"À toi : rejoue-la. Ici, rien n'est noté.", sc1Well:"Bien joué !", sc1WellSub:"Rejoue-la ou passe à l'évaluation.",
  sc1Replay:"Rejouer", sc1ToEval:"Passer à l'évaluation", sc1SeeS:"Revoir"});
Object.assign(TXT.en,{sc1Train:"Practice", sc1Eval:"Test", sc1TmA:"Scale mode", sc1See:"See the scale again", sc1Your:"Your turn",
  sc1DemoSub:"Watch and listen to the scale, note by note.", sc1DemoSubC:"Watch and listen to the chords of the scale, one by one.", sc1TurnSub:"Your turn: play it again. Nothing is scored here.", sc1Well:"Well played!", sc1WellSub:"Play it again or take the test.",
  sc1Replay:"Play again", sc1ToEval:"Take the test", sc1SeeS:"Watch"});
const sc1Tr = () => !!(page==="practice" && game && game.sc1 && game.sc1.train);
const sc1TrPick = (tid,k,mode,tm) => tm ? tm==="train" : sc1Get(mode,tid,k)===0 ? true : S.settings.sc1Train==="train";
// the guides of the training (next key lit, names on the boxes) are lent, never saved: the player's own aids come back after
function sc1TrGuide(){ const on=sc1Tr(), s=S.settings;
  if(on && !SC1.tk){ SC1.tk={guideK:s.guideK, guideN:s.guideN, guideP:s.guideP}; s.guideK=true; s.guideN=true; s.guideP=false; }
  else if(!on && SC1.tk){ const k=SC1.tk; SC1.tk=null; ["guideK","guideN","guideP"].forEach(x=>{ if(k[x]===undefined) delete s[x]; else s[x]=k[x]; }); } }
{ const o=save; save=function(){ const k=SC1.tk; if(!k) return o.apply(this,arguments); const s=S.settings, now={guideK:s.guideK, guideN:s.guideN, guideP:s.guideP};
    ["guideK","guideN","guideP"].forEach(x=>{ if(k[x]===undefined) delete s[x]; else s[x]=k[x]; }); try{ return o.apply(this,arguments); } finally{ Object.assign(s,now); } }; }
// the demonstration: the whole scale (or its chords), calm, lit and named one after the other, then « Your turn »
function sc1Demo(){ if(!sc1Tr() || !cur || !seq.length) return; const g=game, ch=chSeq();
  clearTimeout(advanceTimer); clearPlayTimers(); autoHelpHide(); cancelAnimationFrame(raf);
  phase="revealed"; SC1.demo=true; revealDone=false; found=seq.map(()=>false); idx=0; played=[]; pStep=0; pFound=new Set(); errors=0; fgStep=-1; deadline=0;
  clearKeys(); render(); const sl=$("slots"); sl.classList.add("sc1-dm");
  const step=ch?1.4:.62, d0=.35, ms=ch?null:revealMidis();
  seq.forEach((st,i)=>{ const at=d0+i*step;
    playTimers.push(setTimeout(()=>{ if(game!==g || !SC1.demo || phase!=="revealed") return; fgStep=i; // the sound at the same moment (« À toi » stops what is left)
      if(ch){ st.voicing.forEach(m=>tone(m,0,1.1,.17)); tone(st.voicing[0]-12,0,1.1,.12); } else tone(ms[i],0,.55,.24);
      if(ch) lightChord(st.voicing,"k-rev"); else keyEls[ms[i]]?.classList.add("k-rev");
      const c=$("slots").children[i]; if(c) c.classList.add("sc1-seen"); markNow(i); }, at*1000)); });
  playTimers.push(setTimeout(()=>{ if(game===g && SC1.demo && phase==="revealed") sc1Turn(); }, (d0+seq.length*step+.9)*1000)); }
// your turn: the same scale again, guided, nothing counted
function sc1Turn(){ if(!sc1Tr() || !cur) return; SC1.demo=false; clearPlayTimers(); $("slots").classList.remove("sc1-dm"); markNow(-1); startRound({...cur}, true); }
// Training ⇄ Test (the pills, « Take the test »): the choice is remembered; leaving a test half-way costs nothing
function sc1Switch(v){ if(!(page==="practice" && sc1On())) return; const s=game.sc1; S.settings.sc1Train=v; save(); if((v==="train")===!!s.train) return; SC1.demo=false; sc1Play(s.tid,s.k,s.mode,v); }
function sc1Bar(){ const on=page==="practice" && sc1On(), tr=sc1Tr(); document.body.classList.toggle("sc1g",on); document.body.classList.toggle("sc1tr",tr);
  let el=$("sc1Tm"); if(!on){ if(el) el.hidden=true; return; }
  if(!el){ el=document.createElement("div"); el.id="sc1Tm"; el.className="seg sc1-tm"; el.setAttribute("role","group"); $("gameLbl").after(el); }
  el.hidden=false; el.setAttribute("aria-label",t("sc1TmA")); const v=tr?"train":"eval";
  const h=[["train","sc1Train"],["eval","sc1Eval"]].map(([x,l])=>'<button type="button" data-v="'+x+'" aria-pressed="'+(v===x)+'">'+esc(t(l))+'</button>').join("");
  if(el.dataset.h!==h){ el.innerHTML=h; el.dataset.h=h; el.querySelectorAll("button").forEach(b=>b.onclick=()=>sc1Switch(b.dataset.v)); } }
// ---- hooks ----
{ const o=sc1Play; sc1Play=function(tid,k,mode,tm){ mode=mode||sc1Mode(); SC1.nextTr=sc1TrPick(tid,k,mode,tm); SC1.demo=false; let r; try{ r=o.call(this,tid,k,mode); } finally{ SC1.nextTr=null; }
    if(sc1Tr()) sc1Demo(); return r; }; }
{ const o=startRound; startRound=function(){ if(game && game.sc1 && game.sc1.train===undefined) game.sc1.train=!!SC1.nextTr; sc1TrGuide();
    const r=o.apply(this,arguments); sc1TrGuide(); if(sc1Tr()){ deadline=0; SC1.demo=false; $("slots").classList.remove("sc1-dm"); render(); } return r; }; }
{ const o=success; success=function(){ if(!sc1Tr()) return o.apply(this,arguments);
    phase="success"; SC1.demo=false; cancelAnimationFrame(raf); clearTimeout(advanceTimer);
    try{ const root=48+((chSeq()?seq[0].root.pc:seqMidis()[0])%12); [0,4,7,12].forEach((iv,i)=>tone(root+iv+24,i*.07,.5,.16)); }catch(e){}
    render(); const f=$("actions").querySelector(".primary"); if(f) f.focus({preventScroll:true}); }; }
// a wrong note in training: shown softly, never counted (no « Show me » band either)
{ const o=wrongNote; wrongNote=function(m){ if(!sc1Tr() || phase!=="listening") return o.apply(this,arguments);
    flashKey(m,"k-bad",300); const sl=$("slots").children[chSeq()?pStep:idx]; if(sl){ sl.classList.remove("err","pop"); void sl.offsetWidth; sl.classList.add("err"); } }; }
{ const o=reveal; reveal=function(){ if(sc1Tr()){ sc1Demo(); return; } return o.apply(this,arguments); }; }
{ const o=grade; grade=function(){ if(sc1Tr()){ if(phase==="revealed") sc1Turn(); return; } return o.apply(this,arguments); }; }
{ const o=primaryAction; primaryAction=function(){ if(!sc1Tr()) return o.apply(this,arguments); if(phase==="listening") sc1Demo(); else sc1Turn(); }; }
// MIDI: during the demo and while you play, Do and Si are notes; once the scale is played, Do = play again, Si = see it again
{ const o=midiStart; midiStart=function(note){ if(sc1Tr()){ const pc=((note%12)+12)%12;
      if(phase==="success" && (pc===0||pc===11) && S.settings.midiC!==false && !anyModal() && !setOpen){ if(pc===0) sc1Turn(); else sc1Demo(); return true; }
      return false; }
    return o.apply(this,arguments); }; }
{ const o=finishGame; finishGame=function(){ SC1.demo=false; const r=o.apply(this,arguments); sc1TrGuide(); sc1Bar(); return r; }; }
{ const o=renderActions; renderActions=function(){ const r=o.apply(this,arguments); if(!sc1Tr() || !cur) return r;
    const a=$("actions"); a.innerHTML=""; const kb=hasKeyboard(), space=kb?(S.settings.lang==="fr"?"Espace":"Space"):null, md=midiMode() && S.settings.midiC!==false;
    const mk=(label,cls,fn,k,id)=>{ const b=document.createElement("button"); b.type="button"; b.className="btn "+cls; if(id) b.id=id;
      if(Array.isArray(label)){ b.innerHTML='<span class="lg">'+esc(label[0])+'</span><span class="sh" aria-hidden="true">'+esc(label[1])+'</span>'; b.setAttribute("aria-label",label[0]); } else b.textContent=label;
      if(k){ const x=kbdEl(k); x.textContent=k; b.appendChild(x); } b.onclick=fn; a.appendChild(b); return b; };
    const sp=()=>{ const s2=document.createElement("span"); s2.className="spacer"; a.appendChild(s2); };
    if(phase==="revealed"){ mk(t("sc1See"),"",sc1Demo,null,"sc1See"); sp(); mk(t("sc1Your"),"primary",sc1Turn,space,"sc1Your"); }
    else if(phase==="listening") mk(t("sc1See"),"",sc1Demo,space,"sc1See");
    else if(phase==="success"){ const w=document.createElement("p"); w.className="sc1-well"; w.id="sc1Well"; w.setAttribute("role","status"); w.textContent=t("sc1Well"); a.appendChild(w);
      mk([t("sc1See"),t("sc1SeeS")],"",sc1Demo,md?BNAME():null,"sc1See"); sp(); mk([t("sc1ToEval"),t("sc1Eval")],"",()=>sc1Switch("eval"),null,"sc1ToEval"); mk(t("sc1Replay"),"primary",sc1Turn,md?CNAME():space,"sc1Replay"); }
    return r; }; }
{ const o=renderPrompt; renderPrompt=function(){ const r=o.apply(this,arguments); if(sc1Tr() && cur){
      $("eyebrow").textContent=t("sc1Train")+" · "+sc1ModeName(game.sc1.mode);
      $("promptSub").textContent = phase==="revealed" ? t(chSeq()?"sc1DemoSubC":"sc1DemoSub") : phase==="success" ? t("sc1Well")+" "+t("sc1WellSub") : t("sc1TurnSub"); }
    return r; }; }
{ const o=render; render=function(){ sc1TrGuide(); const r=o.apply(this,arguments); try{ sc1Bar(); }catch(e){ console.warn(e); } return r; }; }
{ const o=openPage; openPage=function(){ const r=o.apply(this,arguments); if(page!=="practice"){ if(SC1.demo){ SC1.demo=false; clearPlayTimers(); } sc1TrGuide(); try{ sc1Bar(); }catch(e){} } return r; }; }
/* ==== fin Gammes une à une : entraînement ==== */
