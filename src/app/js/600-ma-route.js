// fragment de l'IIFE principale — ordre 600, voir src/app/README.md
/* ==== Ma route (chantier Route, C3 + C4) ==== */
// C3 « Ma route »: 6 stages (notes → major chords → minor chords → inversions → scales → progressions and 7ths), 9 to 11 steps each
// (lesson / exercise / ear / game / end-of-stage challenge) built from what the app already has: a LEARN subject opened on its start
// screen with the right choices (lesson = guided help on, challenge = 10 s timer and no help), a game in solo practice with a goal,
// Ear training. A step is done when it was played from the route and passed (S.route.done) or when the progress already stored
// says so (every chord / scale of the step mastered, S.mastery ≥ 3 as on the start screen). The frieze (#rtMap) sits above the LEARN tiles, unless the
// First steps are still under way for a beginner (then #ppMap stays). End of a stage: message + a surprise song of the catalogue (pcRows, #rtWin).
// C4 « Reprendre »: S.resume now keeps the last activity of any kind ({kind:"learn",sec,q,i,n,label,su,route}, {kind:"game",id,cont},
// {kind:"song",id}, {kind:"pgame",id}, the First steps' {kind:"pp",…}); the hub card #ppResume shows it (or the next step of the route),
// and the row « Pour toi » (#rsFor): daily training, a duel against the bot of your level, a song to improve.
Object.assign(TXT.fr,{rtName:"Ma route", rtStageOf:(i,n)=>"Étape "+i+" sur "+n, rtStages:["Les notes","Les accords majeurs","Les accords mineurs","Les renversements","Les gammes","Progressions et 7e"],
  rtK:{lecon:"Leçon",exo:"Exercice",oreille:"Oreille",jeu:"Jeu",defi:"Défi"}, rtGo:"Continuer", rtFree:"Entraînement libre", rtFreeS:"Les matières, réglées comme tu veux",
  rtSub:"Ta route, étape par étape. Ou entraîne-toi librement en dessous.", rtGoalT:{runner:n=>"Objectif : passer "+n+" obstacles",speed:n=>"Objectif : "+n+" bonnes réponses",memory:n=>"Objectif : "+n+" manches"},
  rtGoalOk:"Bravo, étape de ta route validée", rtGoalMiss:(a,b)=>a+" sur "+b+" : encore un essai ?", rtNextB:"Ma route : suivant", rtWinK:n=>"Ma route · Étape "+n+" terminée", rtWinT:s=>"Bravo ! "+s+", c'est fait.",
  rtWinX:"Ta récompense : un morceau surprise.", rtWinSong:"Jouer le morceau", rtLater:"Plus tard", rtAllT:"Ta route est terminée !", rtAllX:"Bravo pour tout ce chemin. Tous les morceaux t'attendent dans PLAY.", rtAllB:"Aller à PLAY",
  rtAllDone:"Route terminée : rejoue l'étape de ton choix", rtStepsL:"Étapes", rtOf:(a,b)=>a+" sur "+b, rtNames:{int:"Intervalles",earMaj:"Majeur ?",earMin:"Majeur ou mineur ?",earScale:"Gammes à l'oreille",earCh:"Accords à l'oreille",
  simple:"Tonalités simples",mixed:"Mélangés",inv1:"1er renversement",inv2:"2e renversement",invAll:"Tous les renversements",scaleOf:n=>"Gamme de "+n,inChords:"La gamme en accords",chordsOf:n=>"Accords de "+n+" majeur",sev:"Accords de 7e",notesN:n=>n+" notes"},
  rsK:"Reprendre", rsFor:"Pour toi", rsDuelK:g=>"Duel · "+g, rsBot:(n,r)=>n+" · ELO "+r, rsMyElo:r=>"Ton niveau : "+r, rsSongK:"Morceau à améliorer", rsSongNew:"Nouveau morceau", rsSongAim:"vise 3 étoiles",
  rsSongFun:"rejoue-le pour le plaisir", rsDailyDone:"Fait aujourd'hui ✓", rsRecord:(b,m)=>"Record "+b+" · prochain palier "+m, rsDone:"Partie terminée : on rejoue ?", rsAt:(a,b)=>a+" / "+b, rsNew:"Commencer"});
Object.assign(TXT.en,{rtName:"My path", rtStageOf:(i,n)=>"Stage "+i+" of "+n, rtStages:["The notes","Major chords","Minor chords","Inversions","Scales","Progressions and 7ths"],
  rtK:{lecon:"Lesson",exo:"Exercise",oreille:"Ear",jeu:"Game",defi:"Challenge"}, rtGo:"Continue", rtFree:"Free practice", rtFreeS:"The subjects, set the way you like",
  rtSub:"Your path, step by step. Or practise freely below.", rtGoalT:{runner:n=>"Goal: clear "+n+" obstacles",speed:n=>"Goal: "+n+" right answers",memory:n=>"Goal: "+n+" rounds"},
  rtGoalOk:"Well done, a step of your path is done", rtGoalMiss:(a,b)=>a+" of "+b+": one more try?", rtNextB:"My path: next", rtWinK:n=>"My path · Stage "+n+" complete", rtWinT:s=>"Well done! "+s+": done.",
  rtWinX:"Your reward: a surprise song.", rtWinSong:"Play the song", rtLater:"Later", rtAllT:"Your path is complete!", rtAllX:"Well done for coming all this way. Every song is waiting for you in PLAY.", rtAllB:"Go to PLAY",
  rtAllDone:"Path complete: replay any stage you like", rtStepsL:"Stages", rtOf:(a,b)=>a+" of "+b, rtNames:{int:"Intervals",earMaj:"Major?",earMin:"Major or minor?",earScale:"Scales by ear",earCh:"Chords by ear",
  simple:"Simple keys",mixed:"Mixed",inv1:"1st inversion",inv2:"2nd inversion",invAll:"All inversions",scaleOf:n=>n+" scale",inChords:"The scale in chords",chordsOf:n=>"Chords of "+n+" major",sev:"7th chords",notesN:n=>n+" notes"},
  rsK:"Pick up", rsFor:"For you", rsDuelK:g=>"Duel · "+g, rsBot:(n,r)=>n+" · ELO "+r, rsMyElo:r=>"Your rating: "+r, rsSongK:"Song to improve", rsSongNew:"New song", rsSongAim:"aim for 3 stars",
  rsSongFun:"play it again for fun", rsDailyDone:"Done today ✓", rsRecord:(b,m)=>"Best "+b+" · next milestone "+m, rsDone:"Game over: play again?", rsAt:(a,b)=>a+" / "+b, rsNew:"Start"});
// ---- the path: [kind, spec, name]; spec = a LEARN start screen ({sec,t:types,k:pitch classes|"s" simple keys,inv,deg,sm,sh,dl,ans}) or a game ({g,c,d,goal})
const RT_V=1, RT_SONG=["lune","maman","jacques","ode","elise",null];
const rtN = pc => (S.settings.notation==="fr"?PC_FR:PC_EN)[pc];
const rtL = (fr,en) => S.settings.lang==="fr"?fr:en;
const rtCh = (pc,q) => rtN(pc)+(q==="m"?rtL(" mineur"," minor"):q==="7"?"7":q==="m7"?"m7":rtL(" majeur"," major"));
const rtX = k => t("rtNames")[k];
const rtGm = id => id==="douze" ? (((t("games")||[]).find(g=>g[2]==="douze")||[])[0]||"Les Douze") : t({runner:"rnName",speed:"spName",memory:"mmName"}[id]); // étape 3 : Les Douze
const RT_STAGES=[
  [["jeu",{g:"runner",c:"notes",d:"slow",goal:5},()=>rtGm("runner")],
   ["lecon",{sec:"scales",t:["major"],k:[0]},()=>[0,2,4].map(rtN).join(" ")+"…"],
   ["jeu",{g:"speed",c:"notes",d:"slow",goal:8},()=>rtGm("speed")],
   ["jeu",{g:"memory",c:"notes",d:"slow",goal:3},()=>rtGm("memory")],
   ["oreille",{sec:"ear",t:["int"]},()=>rtX("int")],
   ["exo",{sec:"scales",t:["major"],k:[0]},()=>rtX("scaleOf")(rtN(0))],
   ["jeu",{g:"runner",c:"notes",d:"mid",goal:10},()=>rtGm("runner")],
   ["jeu",{g:"memory",c:"notes",d:"mid",goal:5},()=>rtGm("memory")],
   ["defi",{g:"speed",c:"notes",d:"mid",goal:15},()=>rtX("notesN")(15)]],
  [["lecon",{sec:"chords",t:["maj"],k:[0]},()=>rtCh(0)],
   ["exo",{sec:"chords",t:["maj"],k:[0,5,7]},()=>[0,5,7].map(rtN).join(" · ")],
   ["oreille",{sec:"ear",t:["chord"],ans:["maj"]},()=>rtX("earMaj")],
   ["jeu",{g:"runner",c:"chords",d:"slow",goal:5},()=>rtGm("runner")],
   ["lecon",{sec:"chords",t:["maj"],k:[2,4,9]},()=>[2,4,9].map(rtN).join(", ")],
   ["exo",{sec:"chords",t:["maj"],k:"s"},()=>rtX("simple")],
   ["jeu",{g:"speed",c:"chords",d:"slow",goal:8},()=>rtGm("speed")],
   ["jeu",{g:"memory",c:"chords",d:"slow",goal:3},()=>rtGm("memory")],
   ["exo",{sec:"chords",t:["maj"],k:[0,2,4,5,7,9],sh:1},()=>rtX("mixed")],
   ["defi",{sec:"chords",t:["maj"],k:"s",dl:10,sh:1},()=>rtL("7 majeurs en 10 s","7 majors in 10 s")]],
  [["lecon",{sec:"chords",t:["min"],k:[9]},()=>rtCh(9,"m")],
   ["exo",{sec:"chords",t:["min"],k:[9,2,4]},()=>[9,2,4].map(n=>rtN(n)+"m").join(" · ")],
   ["oreille",{sec:"ear",t:["chord"],ans:["maj","min"]},()=>rtX("earMin")],
   ["lecon",{sec:"chords",t:["min"],k:[0,5,7]},()=>[0,5,7].map(n=>rtN(n)+"m").join(", ")],
   ["exo",{sec:"chords",t:["min"],k:"s"},()=>rtX("simple")],
   ["jeu",{g:"runner",c:"chords",d:"mid",goal:10},()=>rtGm("runner")],
   ["exo",{sec:"chords",t:["maj","min"],k:[0,2,4,5,7,9],sh:1},()=>rtL("Majeurs et mineurs","Major and minor")],
   ["jeu",{g:"speed",c:"chords",d:"mid",goal:12},()=>rtGm("speed")],
   ["exo",{sec:"harmony",t:["maj"],k:[0],deg:[0,1,2,3,4,5]},()=>rtX("chordsOf")(rtN(0))],
   ["defi",{sec:"chords",t:["maj","min"],k:"s",dl:10,sh:1},()=>rtL("14 accords en 10 s","14 chords in 10 s")]],
  [["lecon",{sec:"chords",t:["maj"],k:[0],inv:[1]},()=>rtX("inv1")],
   ["exo",{sec:"chords",t:["maj"],k:[0,5,7],inv:[1]},()=>[0,5,7].map(rtN).join(" · ")],
   ["lecon",{sec:"chords",t:["maj"],k:[0],inv:[2]},()=>rtX("inv2")],
   ["exo",{sec:"chords",t:["maj"],k:[0,5,7],inv:[0,1,2]},()=>rtX("invAll")],
   ["jeu",{g:"memory",c:"chords",d:"mid",goal:4},()=>rtGm("memory")],
   ["exo",{sec:"chords",t:["min"],k:[9,2,4],inv:[1,2]},()=>[9,2,4].map(n=>rtN(n)+"m").join(" · ")],
   ["oreille",{sec:"ear",t:["chord"],ans:["maj","min"]},()=>rtX("earCh")],
   ["exo",{sec:"chords",t:["maj","min"],k:"s",inv:[0,1,2],sh:1},()=>rtX("mixed")],
   ["jeu",{g:"runner",c:"chords",d:"fast",goal:15},()=>rtGm("runner")],
   ["defi",{sec:"chords",t:["maj","min"],k:[0,2,4,5,7,9],inv:[0,1,2],dl:10,sh:1},()=>rtL("Renversés en 10 s","Inverted in 10 s")]],
  [["lecon",{sec:"scales",t:["major"],k:[7]},()=>rtX("scaleOf")(rtN(7))],
   ["exo",{sec:"scales",t:["major"],k:[0,7,5]},()=>[0,7,5].map(rtN).join(" · ")],
   ["lecon",{sec:"scales",t:["major"],k:[2]},()=>rtX("scaleOf")(rtN(2))],
   ["exo",{sec:"scales",t:["major"],k:"s"},()=>rtX("simple")],
   ["lecon",{sec:"scales",t:["minor"],k:[9]},()=>rtX("scaleOf")(rtCh(9,"m"))],
   ["exo",{sec:"scales",t:["minor"],k:[9,4,2]},()=>[9,4,2].map(n=>rtN(n)+"m").join(" · ")],
   ["oreille",{sec:"ear",t:["scale"],ans:["major","minor"]},()=>rtX("earScale")],
   ["exo",{sec:"scales",t:["major"],k:[0],sm:"chords"},()=>rtX("inChords")],
   ["jeu",{g:"speed",c:"notes",d:"fast",goal:20},()=>rtGm("speed")],
   ["defi",{sec:"scales",t:["major","minor"],k:"s",dl:20,sh:1},()=>rtL("Gammes en 20 s","Scales in 20 s")]],
  [["lecon",{sec:"prog",t:["p145"],k:[0]},()=>"I–IV–V–I"],
   ["exo",{sec:"prog",t:["p145"],k:[0,7,5]},()=>"I–IV–V–I · "+[0,7,5].map(rtN).join(" ")],
   ["lecon",{sec:"prog",t:["pop"],k:[0]},()=>"I–V–vi–IV"],
   ["exo",{sec:"prog",t:["pop"],k:"s"},()=>rtX("simple")],
   ["lecon",{sec:"chords",t:["dom7"],k:[7]},()=>rtCh(7,"7")],
   ["exo",{sec:"chords",t:["maj7","dom7"],k:[0,5,7]},()=>rtX("sev")],
   ["lecon",{sec:"chords",t:["min7"],k:[9,2]},()=>rtCh(9,"m7")+", "+rtCh(2,"m7")],
   ["exo",{sec:"harmony",t:["maj7"],k:[0]},()=>rtX("chordsOf")(rtN(0))+" · 7"],
   ["oreille",{sec:"ear",t:["chord"],ans:["maj","min","dom7"]},()=>rtX("earCh")],
   ["jeu",{g:"runner",c:"chords",d:"fast",goal:20},()=>rtGm("runner")],
   ["defi",{sec:"prog",t:["p145","pop"],k:"s",dl:10,sh:1},()=>rtL("Progressions en 10 s","Progressions in 10 s")]]
].map((L,si)=>L.map(([k,s,n],i)=>({id:"s"+(si+1)+"."+(i+1), si, i, k, s, n})));
const RT_ALL=RT_STAGES.flat(), rtPill = id => RT_ALL.find(p=>p.id===id);
const RT={view:null, cur:null, saved:null, gOver:false, win:null};
function rtS(){ const isO=x=>x&&typeof x==="object"&&!Array.isArray(x); if(!isO(S.route)) S.route={v:RT_V, done:{}, st:{}}; if(!isO(S.route.done)) S.route.done={}; if(!isO(S.route.st)) S.route.st={}; return S.route; }
// the items behind a LEARN step (locks ignored), to read the progress already stored
function rtItems(p){ const s=p.s, out=[]; if(!s.sec) return out;
  if(s.sec==="ear"){ (s.ans||[]).forEach(a=>out.push({sec:"ear",tid:s.t[0],k:a})); return out; }
  s.t.forEach(tid=>{ const roots=rootsOf(s.sec,tid).filter(k=>s.k==="s"?keySimple(k):s.k.includes(keyPc(k)));
    roots.forEach(k=>{ if(s.sec==="chords") (s.inv||[0]).forEach(inv=>out.push({sec:"chords",tid,k,inv}));
      else if(s.sec==="harmony") (s.deg||[0,1,2,3,4,5,6]).forEach(deg=>out.push({sec:"harmony",tid,k,deg}));
      else if(s.sec==="scales" && s.sm==="chords") out.push({sec:"scales",tid,k,ch:1});
      else out.push({sec:s.sec,tid,k}); }); });
  return out; }
function rtAuto(p){ if(p.k==="jeu"||(p.k==="defi"&&p.s.g)) return false; const it=rtItems(p); if(!it.length) return false;
  try{ return it.every(x=>(S.mastery[mkey(x)]||0)>=3); }catch(e){ return false; } }
const rtIsDone = p => !!rtS().done[p.id] || rtAuto(p);
const rtStageDone = si => RT_STAGES[si].every(rtIsDone);
function rtCurStage(){ for(let i=0;i<RT_STAGES.length;i++) if(!rtStageDone(i)) return i; return -1; }
function rtNext(){ const si=rtCurStage(); if(si<0) return null; return RT_STAGES[si].find(p=>!rtIsDone(p)); }
// First steps first: the frieze replaces #ppMap once the First steps are done, or for a player who neither is a beginner nor started them
function rtPpDone(){ if(typeof ppAllDone==="function"){ try{ return !!ppAllDone(); }catch(e){} } const d=S.pp&&S.pp.done; return !!d && typeof d==="object" && PP_IDS.every(id=>d[id]); }
function rtShown(){ if(!(S.onb&&S.onb.done) && !S.gate) return false; if(rtPpDone()) return true; const lvl=S.onb&&S.onb.level; return !(lvl==="debut"||lvl==="notes"||(typeof ppStarted==="function"&&ppStarted())); }
const rtObj = p => p.k==="lecon"?"learn":p.k==="oreille"?"ear":p.s.g?(p.k==="defi"?"soon":p.s.g):p.k==="defi"?"soon":p.s.sec;
const rtCol = p => p.s.g?TILE_COL[p.s.g]:TILE_COL[p.s.sec]||MODE_COL.learn;
// ---- playing a step
function rtRestore(){ const v=RT.saved; RT.saved=null; if(!v) return; ["guideP","guideN","guideK"].forEach(k=>{ S.settings[k]=v[k]; }); if(S.settings.delay!==v.delay) setDelay(v.delay); save(); }
function rtLaunch(p){ if(!p) return; rtRestore(); RT.cur=p; RT.gOver=false; const s=p.s;
  if(s.g){ S.settings.gmCont=s.c; S.settings.gmDiff=s.d; save(); if(page!=="games") openPage("games"); gameOpen(s.g); DU.view="solo"; duRender(); gameOpen(s.g,true); toast(t("rtGoalT")[s.g](s.goal)); return; }
  const sec=s.sec; S.settings.su=S.settings.su||{}; const st=S.settings.su[sec]||(S.settings.su[sec]={}); st.tids=s.t.slice(); st.tid=st.tids[0];
  if(sec!=="ear"){ if(s.k==="s") st.keys="simple"; else { st.keys="pick"; st.picked=s.k.slice(); } st.shuffle=!!s.sh; }
  if(sec==="chords") S.settings.invs=(s.inv||[0]).slice();
  if(sec==="harmony") S.settings.hdegs=(s.deg||[0,1,2,3,4,5,6]).slice();
  if(sec==="scales"){ S.settings.scMode=s.sm||"notes"; if(s.sm) S.settings.sc7=false; }
  RT.saved={delay:S.settings.delay, guideP:S.settings.guideP, guideN:S.settings.guideN, guideK:S.settings.guideK};
  if(p.k==="lecon"){ S.settings.guideP=true; S.settings.guideN=false; S.settings.guideK=false; }
  if(p.k==="defi"){ S.settings.guideP=S.settings.guideN=S.settings.guideK=false; }
  save(); if(sec!=="ear" && !suQueue(sec).length){ st.keys="simple"; save(); } // keys still locked: the open simple keys
  const tab=$("secTabs").querySelector('[data-v="'+sec+'"]'); if(tab) tab.click();
  if(p.k==="defi" && s.dl) setDelay(s.dl); else if(p.k!=="defi" && RT.saved.delay!==S.settings.delay) setDelay(RT.saved.delay);
  if(page==="practice") renderSetup(); }
function rtGo(){ const p=rtNext(); if(p) rtLaunch(p); else { RT.view=0; rtRender(); } }
function rtDone(id){ const r=rtS(), p=rtPill(id); if(!p) return; const fresh=!r.done[id]; if(fresh){ r.done[id]=Date.now(); r.at=Date.now(); }
  if(rtStageDone(p.si) && !r.st[p.si+1]){ r.st[p.si+1]=Date.now(); RT.win=p.si; } save(); }
// ---- the stage-end window (message + surprise song)
function rtWinEl(){ let m=$("rtWin"); if(m) return m; m=document.createElement("div"); m.className="modal goal-modal rt-win"; m.id="rtWin"; m.hidden=true; m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-labelledby","rtWinT");
  m.innerHTML='<div class="modal-bg" data-close="rtWin"></div><div class="modal-card"><div class="modal-body gl-body"><span class="gl-k" id="rtWinK"></span><h2 id="rtWinT"></h2><p id="rtWinX"></p><div class="rt-song" id="rtSong"></div><div class="gl-foot"><button class="linkbtn" type="button" data-close="rtWin" id="rtWinLater"></button><button class="btn primary" id="rtWinGo" type="button"></button></div></div></div>';
  document.body.appendChild(m); return m; }
function rtWinOpen(si){ RT.win=null; const m=rtWinEl(), song=RT_SONG[si], last=si>=RT_STAGES.length-1, fr=S.settings.lang==="fr";
  $("rtWinK").textContent=t("rtWinK")(si+1); $("rtWinT").textContent=last?t("rtAllT"):t("rtWinT")(t("rtStages")[si]); $("rtWinX").textContent=last?t("rtAllX"):t("rtWinX"); $("rtWinLater").textContent=t("rtLater");
  const box=$("rtSong"), row=song&&pcRows().find(x=>x[0]===song); box.innerHTML=""; box.hidden=!row;
  if(row){ box.style.setProperty("--tc",row[6]); box.innerHTML='<span class="obj">'+OBJ[row[5]]()+'</span><b></b><small></small>'; box.querySelector("b").textContent=fr?row[1]:row[2]; box.querySelector("small").textContent=t("pfLvl")+" "+row[4]; }
  const go=$("rtWinGo"); go.textContent=last?t("rtAllB"):t("rtWinSong"); duKbd(go,CNAME());
  go.onclick=()=>{ closeMod("rtWin"); if(row) openPlayWith("#song="+row[0]); else openPage("free"); };
  openMod("rtWin"); setTimeout(()=>go.focus({preventScroll:true}),30); if(!matchMedia("(prefers-reduced-motion: reduce)").matches) try{ confetti(); }catch(e){} }
function rtWinLater(){ if(RT.win!=null) setTimeout(()=>{ if(RT.win!=null && !anyWin()) rtWinOpen(RT.win); },400); }
// ---- LEARN: the frieze
function rtDotHTML(p, st){ return '<button class="rt-pill '+st+'" type="button" data-id="'+p.id+'" style="--tc:'+rtCol(p)+'" title="'+esc(t("rtK")[p.k]+" · "+p.n()+(p.s.g?" · "+t("rtGoalT")[p.s.g](p.s.goal):""))+'">'
  +'<span class="rt-dot"><span class="obj">'+(OBJ[rtObj(p)]?OBJ[rtObj(p)]():"")+'</span>'+(st==="done"?'<i class="rt-ck"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></i>':'')+'</span>'
  +'<span class="rt-pk">'+esc(t("rtK")[p.k])+'</span><span class="rt-pn">'+esc(p.n())+'</span></button>'; }
function rtRender(){ const lp=$("learnPanel"); if(!lp) return; let el=$("rtMap"), fh=$("rtFreeH"); const on=rtShown();
  document.body.classList.toggle("rt-on",on); const pm=$("ppMap"); if(pm) pm.hidden=on;
  if(!el){ el=document.createElement("section"); el.id="rtMap"; el.className="rt-map"; lp.insertBefore(el,$("learnTiles"));
    fh=document.createElement("h3"); fh.id="rtFreeH"; fh.className="rt-free"; lp.insertBefore(fh,$("learnTiles"));
    const sb=document.createElement("span"); sb.className="rt-sub"; sb.id="rtSub"; lp.querySelector(".mode-h p").appendChild(sb);
    el.addEventListener("click",e=>{ const b=e.target.closest("[data-id]"); if(b){ rtLaunch(rtPill(b.dataset.id)); return; } const s=e.target.closest("[data-st]"); if(s){ RT.view=+s.dataset.st; rtRender(); return; } if(e.target.closest("#rtGo")) rtGo(); }); }
  el.hidden=!on; fh.hidden=!on; if(!on) return;
  $("rtSub").textContent=t("rtSub"); fh.innerHTML='<b></b> <span></span>'; fh.firstChild.textContent=t("rtFree"); fh.lastChild.textContent=t("rtFreeS");
  const cs=rtCurStage(), si=RT.view!=null?RT.view:(cs<0?RT_STAGES.length-1:cs), L=RT_STAGES[si], nx=rtNext(), nd=L.filter(rtIsDone).length;
  const pills=L.map(p=>rtDotHTML(p, rtIsDone(p)?"done":nx&&p.id===nx.id?"next":"todo")).join("");
  const chips=RT_STAGES.map((_,i)=>{ const d=rtStageDone(i); return '<button type="button" class="rt-chip'+(d?" done":"")+(i===si?" on":"")+'" data-st="'+i+'" aria-pressed="'+(i===si)+'"><i>'+(d?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>':(i+1))+'</i><span>'+esc(t("rtStages")[i])+'</span></button>'; }).join("");
  el.innerHTML='<div class="rt-head"><div class="rt-tt"><span class="rt-k">'+esc(t("rtName")+" · "+t("rtStageOf")(si+1,RT_STAGES.length))+'</span><b>'+esc(t("rtStages")[si])+'</b></div>'
    +'<div class="rt-prog"><span class="rt-cnt mono"><b>'+nd+'</b>/'+L.length+'</span><span class="pp-bar rt-bar"><i style="width:'+Math.round(100*nd/L.length)+'%"></i></span></div>'
    +(nx?'<button class="btn primary rt-go" type="button" id="rtGo"><span>'+esc(t("rtGo"))+'</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>':'<span class="rt-alldone">'+esc(t("rtAllDone"))+'</span>')+'</div>'
    +'<div class="rt-strip" role="list" aria-label="'+esc(t("rtStages")[si])+'">'+pills+'</div><div class="rt-chips" aria-label="'+esc(t("rtStepsL"))+'">'+chips+'</div>';
  const g=$("rtGo"); if(g) duKbd(g,CNAME());
  const n=el.querySelector(".rt-pill.next"), sp=el.querySelector(".rt-strip"); if(n && sp.scrollWidth>sp.clientWidth+2) sp.scrollLeft=Math.max(0,n.offsetLeft-sp.clientWidth/2+n.offsetWidth/2); }
// ---- hub: « Pick up » (any last activity) and « For you »
const RS_MS=[10,25,50,100,200,400,800,1600,3200,6400];
function rsSongPick(){ let best={}; try{ best=JSON.parse(localStorage.getItem("clavio:best")||"{}")||{}; }catch(e){}
  const R=pcRows(), ok=R.filter(s=>!premSong(s[0])), L=ok.length?ok:R, st=id=>pcBestOf(best,id).st;
  const imp=L.filter(s=>st(s[0])>0&&st(s[0])<3).sort((a,b)=>st(a[0])-st(b[0]))[0]; if(imp) return {s:imp,st:st(imp[0]),k:"imp"};
  const nw=L.find(s=>!st(s[0])); if(nw) return {s:nw,st:0,k:"new"}; return {s:L[0],st:3,k:"fun"}; }
function rsInfo(r){ const fr=S.settings.lang==="fr", K=t("rsK");
  if(r.kind==="learn" && SEC[r.sec] && Array.isArray(r.q) && r.q.length){ const p=r.route&&rtPill(r.route), n=Math.max(1,r.n|0), i=Math.min(n,Math.max(0,r.i|0)), fin=!!r.fin;
    return {k:K+" · "+(p&&!rtIsDone(p)?t("rtName")+" › "+t("rtStages")[p.si]:"LEARN › "+t(SU_NAME[r.sec])), t:r.label||t(SU_NAME[r.sec]), pct:fin?1:i/n, bar:fin?t("rsDone"):t("rsAt")(i,n), col:TILE_COL[r.sec], obj:r.sec}; }
  if(r.kind==="game" && r.id==="douze"){ return {k:K+" · GAMES", t:rtGm("douze"), pct:null, bar:t("rnBestL")+" "+(typeof dzBestTxt==="function"?dzBestTxt():"—"), col:TILE_COL.douze||MODE_COL.games, obj:OBJ.douze?"douze":"games"}; } // étape 3 : record en temps
  if(r.kind==="game" && DU_GAMES.includes(r.id)){ const b=((S.gameBest||{})[r.id]||(r.id==="runner"?S.runnerBest:0)||0), m=RS_MS.find(x=>x>b)||b+1000;
    return {k:K+" · GAMES"+(r.cont?" › "+t("gmConts")[r.cont==="notes"?"notes":"chords"]:""), t:rtGm(r.id), pct:b/m, bar:t("rsRecord")(fmtN(b),fmtN(m)), col:TILE_COL[r.id], obj:r.id}; }
  if(r.kind==="song"){ const s=pcRows().find(x=>x[0]===r.id); if(!s) return null; let best={}; try{ best=JSON.parse(localStorage.getItem("clavio:best")||"{}")||{}; }catch(e){} const st=pcBestOf(best,s[0]).st;
    return {k:K+" · PLAY", t:fr?s[1]:s[2], pct:st/3, bar:"★".repeat(st)+"☆".repeat(3-st), col:s[6], obj:s[5]}; }
  if(r.kind==="pgame"){ const g=(t("playGames")||[]).find(x=>x[2]===r.id); if(!g) return null; return {k:K+" · PLAY › Games", t:g[0], pct:null, bar:"", col:TILE_COL["p_"+r.id]||MODE_COL.play, obj:OBJ[r.id]?r.id:"play"}; }
  return null; }
function rsRouteInfo(){ if(!rtShown()) return null; const p=rtNext(); if(!p) return null; const L=RT_STAGES[p.si], nd=L.filter(rtIsDone).length;
  return {k:t("rtName")+" · "+t("rtStageOf")(p.si+1,RT_STAGES.length)+" · "+t("rtStages")[p.si], t:t("rtK")[p.k]+" · "+p.n(), pct:nd/L.length, bar:t("rtOf")(nd,L.length), col:rtCol(p), obj:rtObj(p), route:1}; }
function rsRender(){ const el=$("ppResume"); if(!el) return; el.onclick=rsGo;
  const r=S.resume, ppShow=!el.hidden && (!r || r.kind==="pp");
  let info = r && r.kind && r.kind!=="pp" ? rsInfo(r) : null; if(!info && !ppShow) info=rsRouteInfo();
  el.classList.toggle("rs-gen",!!info); el.dataset.rk = info ? (info.route?"route":r.kind) : "pp";
  if(info){ el.hidden=false; el.style.setProperty("--tc",info.col); el.style.setProperty("--tc2",shade(info.col,.3));
    el.innerHTML='<span class="pp-rk"></span><b class="pp-rt"></b><span class="pp-rbar">'+(info.pct!=null?'<span class="pp-bar"><i style="width:'+Math.round(100*Math.min(1,info.pct))+'%"></i></span>':'')+'<small></small></span>'
      +'<span class="pp-rgo"><span class="pp-rbtn"></span>'+(midiMode()&&S.settings.midiC!==false?'<small></small>':'')+'</span><span class="obj rs-obj" aria-hidden="true">'+(OBJ[info.obj]?OBJ[info.obj]():"")+'</span>';
    el.querySelector(".pp-rk").textContent=info.k; el.querySelector(".pp-rt").textContent=info.t; el.querySelector(".pp-rbar small").textContent=info.bar; el.querySelector(".pp-rbtn").textContent=info.route&&!(rtS().at)?t("rsNew"):t("rtGo");
    const sm=el.querySelector(".pp-rgo small"); if(sm) sm.textContent=t("ppOrCRes")(CNAME()); }
  else el.style.removeProperty("--tc");
  document.body.classList.toggle("rs-on",!el.hidden); rsFor(); }
function rsGo(){ const el=$("ppResume"), r=S.resume; if(!el || el.hidden) return; const rk=el.dataset.rk;
  if(rk==="pp"){ ppResumeGo(); return; } if(rk==="route"){ rtGo(); return; } if(!r || typeof r!=="object") return;
  if(r.kind==="learn"){ const p=r.route&&rtPill(r.route); if(p&&rtIsDone(p)){ rtGo(); return; }
    if(r.su && S.settings.su){ S.settings.su[r.sec]=JSON.parse(JSON.stringify(r.su)); } RT.cur=p&&!rtIsDone(p)?p:null;
    const tab=$("secTabs").querySelector('[data-v="'+r.sec+'"]'); if(tab) tab.click(); if(page!=="practice") return;
    if(r.fin || Date.now()-(+r.at||0)>864e5 || !Array.isArray(r.q) || !r.q.length){ renderSetup(); return; }
    game=makeGame(r.q.map(it=>({...it}))); game.label=r.label; game.single=r.q.length===1; game.i=Math.max(0,r.i|0)-1; startRound(); return; }
  if(r.kind==="game"){ if(r.cont) S.settings.gmCont=r.cont; save(); if(page!=="games") openPage("games"); gameOpen(r.id); DU.view="solo"; duRender(); gameOpen(r.id,true); return; }
  if(r.kind==="song"){ openPlayWith("#song="+r.id); return; }
  if(r.kind==="pgame"){ openPlayWith("#game="+r.id); } }
function rsFor(){ const hm=document.querySelector("#hubPanel .hub-main"); if(!hm) return; let el=$("rsFor");
  if(!el){ el=document.createElement("section"); el.id="rsFor"; el.className="rs-for"; const g=hm.querySelector(".hub-grid"); hm.insertBefore(el,g);
    el.addEventListener("click",e=>{ const b=e.target.closest("[data-f]"); if(!b) return; const f=b.dataset.f;
      if(f==="daily") $("dailyCard").click();
      else if(f==="duel"){ if(page!=="games") openPage("games"); gameOpen("runner"); DU.view="bots"; DU.botPick=+b.dataset.bot; duRender(); }
      else if(f==="song"){ const v=pcBestOf(pcBest(),b.dataset.id).lv; openPlayWith("#song="+b.dataset.id+(v?"&arr="+v:"")); } }); } // the version to improve (C6: id@lv)
  const show = !!(S.onb&&S.onb.done) || !!S.gate; el.hidden=!show; document.body.classList.toggle("rs-for",show); if(!show) return;
  const fr=S.settings.lang==="fr", done=!!(S.daily&&S.daily.date===dayStr()), e=eloGet("runner-"+(S.settings.duCont==="notes"?"notes":"chords")), bi=duBotFor(e.r), sp=rsSongPick(), ch=t("chars")[bi];
  const card=(f,col,obj,k,ti,sub,extra)=>'<button class="rs-fc'+(f==="daily"&&done?" done":"")+'" type="button" data-f="'+f+'" '+(extra||"")+' style="--tc:'+col+';--tc2:'+shade(col,.3)+'"><span class="obj">'+(OBJ[obj]?OBJ[obj]():"")+'</span><span class="rs-fk">'+esc(k)+'</span><b>'+esc(ti)+'</b><small>'+esc(sub)+'</small></button>';
  el.innerHTML='<h3 class="rs-h">'+esc(t("rsFor"))+'</h3><div class="rs-row">'
    +card("daily",TILE_COL.daily,"daily",$("dailySub").textContent||"",t("dailyTitle"),done?t("rsDailyDone"):(t("hsDailyK")||""))
    +card("duel",TILE_COL.runner,"runner",t("rsDuelK")(rtGm("runner")),t("rsBot")(ch[0],fmtN(DU_BOTS[bi])),t("rsMyElo")(fmtN(e.r)+(eloProv(e)?"?":"")),'data-bot="'+bi+'"')
    +card("song",sp.s[6],sp.s[5],sp.k==="new"?t("rsSongNew"):t("rsSongK"),fr?sp.s[1]:sp.s[2],"★".repeat(sp.st)+"☆".repeat(3-sp.st)+" · "+(sp.k==="fun"?t("rsSongFun"):t("rsSongAim")),'data-id="'+sp.s[0]+'"')+'</div>'; }
// ---- hooks (wrapped here so the rest of the source stays as it was)
{ const _rl=renderLearn; renderLearn=function(){ _rl.apply(this,arguments); try{ rtRender(); }catch(e){ console.warn(e); } }; }
{ const _hs=renderHubSide; renderHubSide=function(){ _hs.apply(this,arguments); try{ rsRender(); }catch(e){ console.warn(e); } }; }
{ const _op=openPage; openPage=function(pg){ const r=_op.apply(this,arguments); if(pg!=="practice" && !INFO_PAGES.includes(pg) && !(pg==="games" && RT.cur && RT.cur.s.g)){ if(RT.saved) rtRestore(); if(!(RT.cur&&RT.cur.s.g&&RN.on)) RT.cur=null; } if(pg==="learn") RT.view=null; return r; }; }
{ const _mg=makeGame; makeGame=function(queue, daily){ const g=_mg.apply(this,arguments); if(!daily && RT.cur && RT.cur.s.sec && RT.cur.s.sec===S.section) g.route=RT.cur.id; return g; }; }
{ const _sr=startRound; startRound=function(){ const r=_sr.apply(this,arguments); try{ const g=game; if(g && !g.daily && Array.isArray(g.queue) && g.queue.length){ const sec=g.sec||S.section;
      S.resume={kind:"learn", sec, q:g.queue.slice(0,160).map(stripItem), i:Math.max(0,g.i), n:g.total, label:g.label||suLabel(sec), su:JSON.parse(JSON.stringify((S.settings.su||{})[sec]||{})), at:Date.now(), route:g.route||null}; save(); } }catch(e){} return r; }; }
{ const _fg=finishGame; finishGame=function(){ const g=game; if(g && !g.daily && S.resume && S.resume.kind==="learn"){ S.resume.fin=true; S.resume.i=S.resume.n; S.resume.at=Date.now(); }
    if(g && g.route){ const R=g.results.filter(Boolean), good=R.filter(x=>x.level==="good").length, p=rtPill(g.route), done=g.queue ? R.length>=g.total : true;
      if(p && done && R.length && good/R.length>=(p.k==="defi"?.8:.6)) rtDone(g.route); }
    return _fg.apply(this,arguments); }; }
{ const _oe=openEnd; openEnd=function(g){ const r=_oe.apply(this,arguments); try{ const p=g&&g.route&&rtPill(g.route); if(p && rtIsDone(p) && (rtNext()||RT.win!=null)){ const foot=$("endFoot");
      foot.querySelectorAll(".btn.primary").forEach(b=>b.classList.remove("primary")); const b=document.createElement("button"); b.type="button"; b.className="btn primary"; b.id="endRoute"; b.textContent=t("rtNextB");
      duKbd(b,CNAME()); b.onclick=()=>{ closeEnd(); if(RT.win==null) setTimeout(rtGo,60); }; foot.appendChild(b); setTimeout(()=>{ if(b.isConnected) b.focus({preventScroll:true}); },30); } }catch(e){ console.warn(e); } return r; }; }
["endX","endBg"].forEach(id=>{ $(id).addEventListener("click",()=>{ if(RT.win!=null) GL.offer=false; },true); $(id).addEventListener("click",rtWinLater); }); // bound to the first closeEnd
{ const _ce=closeEnd; closeEnd=function(){ const was=endOpen; if(was && RT.win!=null) GL.offer=false; const r=_ce.apply(this,arguments); if(was) rtWinLater(); return r; }; }
{ const _go=gameOpen; gameOpen=function(id, keep){ const r=_go.apply(this,arguments); if(!keep){ RT.gOver=false; if(RT.cur && RT.cur.s.g!==id) RT.cur=null; S.resume={kind:"game", id, cont:gmCont(), at:Date.now()}; save(); } return r; }; }
$("rnQuit").addEventListener("click",()=>{ const p=RT.cur; if(!RN.on && p && p.s.g){ RT.cur=null; if(page==="games") openPage("learn"); } }); // after runnerClose (bound first): a game of the route goes back to the path
{ const _pw=openPlayWith; openPlayWith=function(h){ const m=/^#(song|game)=([a-z_]+)/.exec(h||""); if(m){ S.resume={kind:m[1]==="song"?"song":"pgame", id:m[2], at:Date.now()}; save(); } return _pw.apply(this,arguments); }; }
// a game played from the route: its goal is checked when the game ends (score shown → game over)
function rtGameCheck(){ const p=RT.cur; if(!p || !p.s.g || !RN.on || DU.mode || GM!==p.s.g || (DU.view!=="solo")) return;
  const over = GM==="runner"?RN.state==="over":GM==="speed"?SP.state==="over":MM.state==="over"; if(!over){ RT.gOver=false; return; } if(RT.gOver) return; RT.gOver=true;
  const sc = GM==="runner"?RN.cleared:GM==="speed"?SP.count:MM.round;
  if(sc>=p.s.goal){ rtDone(p.id); toast(t("rtGoalOk")); if(RT.win!=null) setTimeout(()=>{ if(RT.win!=null && !anyWin()) rtWinOpen(RT.win); },1200); else { const nx=rtNext(); if(nx && nx.s.g===GM && nx.s.c===gmCont()) RT.cur=nx; } }
  else toast(t("rtGoalMiss")(sc,p.s.goal)); }
{ const _rs=rnScore; rnScore=function(){ const r=_rs.apply(this,arguments); try{ rtGameCheck(); }catch(e){} return r; }; }
{ const _gs=gmScore; gmScore=function(){ const r=_gs.apply(this,arguments); try{ rtGameCheck(); }catch(e){} return r; }; }
// a lone C: LEARN = Continue on the path, hub = pick up, end of a route game = next step, stage window = play the song (B = later)
{ const _mf=midiFlush; midiFlush=function(){ try{ if(!FN.on && !LV.on && midiBufMidi && midiBuf.length===1){ const pc=midiBuf[0]%12;
      if(!$("rtWin")?.hidden && $("rtWin")){ if(pc===0||pc===11){ midiBuf=[]; if(pc===0) $("rtWinGo").click(); else closeMod("rtWin"); return; } }
      else if(pc===0 && endOpen && $("endRoute") && S.settings.midiC!==false){ midiBuf=[]; $("endRoute").click(); return; }
      else if(pc===0 && page==="learn" && !anyModal() && $("rtGo") && !$("rtMap").hidden){ midiBuf=[]; rtGo(); return; }
      else if(pc===0 && page==="hub" && !anyModal() && $("ppResume") && !$("ppResume").hidden && $("ppResume").dataset.rk!=="pp"){ midiBuf=[]; rsGo(); return; } } }catch(e){ console.warn(e); }
    return _mf.apply(this,arguments); }; }
// several devices: steps done = union (first date kept), stages = union
{ const _ms=mergeState; mergeState=function(local, cloud){ const r=_ms.apply(this,arguments); const isO=x=>x&&typeof x==="object"&&!Array.isArray(x), c=isO(cloud)?cloud:{}, a=isO(local.route)?local.route:null, b=isO(c.route)?c.route:null;
    if(a||b){ const o={v:RT_V, done:{}, st:{}}; [b,a].forEach(x=>{ if(!x) return; ["done","st"].forEach(k=>{ if(isO(x[k])) Object.entries(x[k]).forEach(([id,at])=>{ const v=+at||1; o[k][id]=o[k][id]?Math.min(o[k][id],v):v; }); }); });
      o.at=Math.max(+(a&&a.at)||0, +(b&&b.at)||0)||undefined; if(!o.at) delete o.at; r.merged.route=o; r.changed=JSON.stringify(r.merged)!==JSON.stringify(local); }
    return r; }; }
/* ==== fin Ma route ==== */
