// fragment de l'IIFE principale — ordre 770, voir src/app/README.md
/* ==== Onboarding 2 (25/10/2026, chantier ONBOARDING) : 3 à 4 questions courtes APRÈS la première note, une par écran, chacune avec
   son effet annoncé (« On a réglé : … »), sautables, puis « Ton programme » ; un seul moteur pour le premier lancement (dans #gate)
   et pour le questionnaire de « Se connecter » / Réglages (dans #onb). Mesure : onb_view, onb_answer, onb_skip, onb_done. ==== */
// OQ = {on, ctx:"fn"|"onb", list:[clés], i, a:{level,why,staff,time,how}, sk:[sautées], fx:"effet de la réponse précédente", t0, done, land, lastV, cAt}
var OQ={on:false, ctx:"fn", list:[], i:0, a:{}, sk:[], fx:"", t0:0, done:false, land:null, lastV:"", cAt:0};
["onb_view","onb_answer","onb_skip","onb_done"].forEach(n=>TRK_NAMES.add(n));
const OQ_OPTS={level:["debut","notes","adv"], why:["songs","theory","fun","school"], staff:["yes","learn","no"], time:["5","10","20"]};
const OQ_ICO={level:{debut:"leaf",notes:"scales",adv:"crown"}, why:{songs:"play",theory:"learn",fun:"games",school:"book"}, staff:{yes:"staff",learn:"book",no:"play"}, time:{"5":"daily","10":"daily","20":"daily"}, how:{midi:"games",mic:"bell",screen:"play"}};
const oqOpts = k => k==="how" ? ["midi","mic","screen"].filter(v=>inputModes().includes(v)) : OQ_OPTS[k];
function oqLabel(k, v){ if(k==="level"){ const i=OQ_OPTS.level.indexOf(v); return [t("ppLvl")[i], t("ppLvlS")[i]]; }
  if(k==="staff") return t("onbO_staff")[v]; if(k==="how") return t("onbO_how")[v]; return t(k==="why"?"oqWhy":"oqTime")[v]; }
function oqFx(k, v){ if(v==null) return ""; if(k==="staff") return t("onbSumStaff")[v]; if(k==="how") return t("onbSumHow")[v]; if(k==="time") return t("oqFxTime")(v); return t(k==="why"?"oqFxWhy":"oqFxLvl")[v]; }
function oqTotal(){ return OQ.ctx==="fn" ? OQ.list.length+1 : OQ.list.length; } // premier lancement : le niveau (D4) est la question 1
function oqPos(){ return OQ.ctx==="fn" ? OQ.i+2 : OQ.i+1; }
function oqLevel(){ return OQ.ctx==="fn" ? FN.level : OQ.a.level; }
function oqDest(){ const L=oqLevel(), w=OQ.a.why; if(L==="debut") return "pp"; if(L==="notes") return "place"; if(L==="adv") return w==="songs"?"free":w==="fun"?"games":"learn"; return "hub"; }
function oqView(s){ if(OQ.lastV===s) return; OQ.lastV=s; track("onb_view", {s, ctx:OQ.ctx}); }
// le corps d'un écran : une question, ou le programme
function oqBody(){ const k=OQ.list[OQ.i], hid=OQ.ctx==="fn"?"fnH":"oqH", midi = OQ.ctx==="fn" ? FN.how==="midi"||FN.how==="mic" : S.settings.input==="midi";
  const fx = OQ.fx ? '<p class="oq-fx" role="status"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg><span><b>'+esc(t("oqSet"))+'</b> '+esc(OQ.fx)+'</span></p>' : '<p class="oq-fx oq-fx0" aria-hidden="true"></p>';
  if(k){ const L=t("oqQ")[k];
    return '<div class="oq" data-q="'+k+'">'+fx+'<p class="oq-k">'+esc(t("onbStep")(oqPos(), oqTotal()))+'</p><h2 id="'+hid+'">'+esc(L[0])+'</h2><p class="oq-sub">'+esc(L[1])+'</p>'
      +'<div class="fn-lv fn-lv4 oq-opts">'+oqOpts(k).map(v=>{ const l=oqLabel(k,v); return '<button type="button" class="oq-opt" data-v="'+v+'" aria-pressed="'+(OQ.a[k]===v)+'"><span class="oq-ic" aria-hidden="true">'+(OBJ[OQ_ICO[k][v]]?OBJ[OQ_ICO[k][v]]():"")+'</span><b>'+esc(l[0])+'</b><small>'+esc(l[1])+'</small></button>'; }).join("")+'</div>'
      +'<div class="oq-foot"><button type="button" class="fn-lnk" id="oqBack"'+(OQ.i===0&&OQ.ctx==="onb"?' hidden':'')+'>‹ '+esc(t("onbPrev"))+'</button>'+(midi?'<span class="oq-midi">'+esc(t("oqMidiQ")(S.settings.notation==="fr"?"Do":"C"))+'</span>':'')+'<button type="button" class="fn-lnk" id="oqSkipQ">'+esc(t("oqSkipQ"))+' ›</button></div></div>'; }
  // « Ton programme »
  const li=oqSummary().map(([ic,b,s,act])=>'<li><span class="oq-ic" aria-hidden="true">'+(OBJ[ic]?OBJ[ic]():"")+'</span><span><b>'+esc(b)+'</b><small>'+esc(s.charAt(0).toUpperCase()+s.slice(1))+'</small></span>'+(act?'<button type="button" class="btn oq-act" id="'+act[0]+'">'+esc(act[1])+'</button>':'')+'</li>').join("");
  const d=oqDest(), redo=OQ.ctx==="onb"&&ONB.redo, tour=OQ.ctx==="onb"&&!redo&&!S.tourDone;
  return '<div class="oq oq-sum">'+(OQ.ctx==="onb"?'<p class="oq-k">'+esc(t("oqSumK"))+'</p>':'')+'<h2 id="'+hid+'">'+esc(t("onbDoneH"))+'</h2><ul class="oq-list">'+li+'</ul>'
    +'<button type="button" class="gt-go oq-go" id="oqGo">'+esc(redo?t("onbFinishT"):tour?t("onbTour"):t("oqGoT")[d])+'</button>'
    +(tour?'<button type="button" class="fn-lnk" id="onbNoTour">'+esc(t("onbNoTour"))+'</button>':'')
    +'<p class="oq-note">'+esc(midi&&!redo?t("oqMidiGo")(S.settings.notation==="fr"?"Do":"C")+" · ":"")+esc(t("oqChange"))+'</p></div>'; }
// les lignes du programme : [icône, ce que tu as dit, ce qui est réglé, action ?]
function oqSummary(){ const a=OQ.a, out=[], L=oqLevel();
  if(L) out.push([OQ_ICO.level[L], oqLabel("level",L)[0], oqFx("level",L)]);
  ["why","staff","time"].forEach(k=>{ if(a[k]!=null) out.push([OQ_ICO[k][a[k]], oqLabel(k,a[k])[0], oqFx(k,a[k])]); });
  const how = OQ.ctx==="fn" ? FN.how : a.how;
  if(how==="midi"){ const nm=OQ.ctx==="fn"?fnMidiName():""; out.push(["games", t("onbO_how").midi[0], nm?t("oqMidiOk")(nm):t("onbSumHow").midi, nm||OQ.ctx!=="fn"?null:["oqMw", t("mdPlug")]]); }
  else if(how==="mic") out.push(["bell", t("onbO_how").mic[0], S.micPrep&&S.micPrep.ok?t("oqMicOk"):t("onbSumHow").mic, S.micPrep&&S.micPrep.ok||OQ.ctx!=="fn"?null:["oqMp", t("oqMicPrep")]]);
  else if(how==="screen") out.push(["play", t("onbO_how").screen[0], t("onbSumHow").screen]);
  return out.slice(0,5); }
function oqWire(root){
  root.querySelectorAll(".oq-opt").forEach(b=>b.onclick=()=>oqPick(b.dataset.v));
  const on=(id,fn)=>{ const e=root.querySelector("#"+id); if(e) e.onclick=fn; };
  on("oqBack", oqBack); on("oqSkipQ", ()=>oqSkip());
  on("oqGo", ()=>oqGo(false)); on("onbNoTour", ()=>oqGo(true));
  on("oqMw", ()=>{ try{ mwOpen(); }catch(e){} }); on("oqMp", ()=>{ try{ mpOpen(()=>oqRender()); }catch(e){} }); }
function oqRender(){ const k=OQ.list[OQ.i]; oqView(k||"recap"); if(OQ.ctx==="fn") fnRender(); else onbRender(); }
function oqPick(v){ const k=OQ.list[OQ.i]; if(!k) return; OQ.a[k]=v; OQ.sk=OQ.sk.filter(x=>x!==k); OQ.fx=oqFx(k,v); track("onb_answer", {q:k, a:String(v), ctx:OQ.ctx});
  const host=OQ.ctx==="fn"?$("gate"):$("onb"); host&&host.querySelectorAll(".oq-opt").forEach(b=>b.setAttribute("aria-pressed", b.dataset.v===v));
  const i=OQ.i; setTimeout(()=>{ if(OQ.on && OQ.i===i){ OQ.i++; oqRender(); } }, matchMedia("(prefers-reduced-motion:reduce)").matches?60:240); }
function oqSkip(){ const k=OQ.list[OQ.i]; if(!k) return; if(!OQ.sk.includes(k)) OQ.sk.push(k); delete OQ.a[k]; OQ.fx=""; track("onb_skip", {q:k, ctx:OQ.ctx}); OQ.i++; oqRender(); }
function oqBack(){ if(OQ.i>0){ OQ.i--; OQ.fx=""; oqRender(); return; } if(OQ.ctx==="fn"){ OQ.on=false; FN.st="lvl"; OQ.fx=""; fnRender(); } }
// un Do seul (MIDI, micro) : question répondue = suivante, sinon passer ; sur le programme = commencer
function oqC(){ const now=Date.now(); if(now-OQ.cAt<450) return; OQ.cAt=now; const k=OQ.list[OQ.i]; if(!k){ oqGo(false); return; } if(OQ.a[k]!=null){ OQ.i++; OQ.fx=oqFx(k,OQ.a[k]); oqRender(); } else oqSkip(); }
function oqStart(ctx, list){ OQ.on=true; OQ.ctx=ctx; OQ.list=list; OQ.i=0; OQ.fx=""; OQ.done=false; OQ.lastV=""; if(!OQ.t0) OQ.t0=Date.now(); }
function oqDone(dest){ const n=Object.keys(OQ.a).filter(k=>OQ.a[k]!=null).length + (OQ.ctx==="fn"?1:0);
  track("onb_done", {ctx:OQ.ctx, sec:Math.round((Date.now()-(OQ.t0||Date.now()))/1000), n, sk:OQ.sk.length, level:oqLevel()||"", dest:dest||""}); }
function oqGo(noTour){ if(!OQ.on) return; const dest=oqDest(); OQ.on=false; OQ.done=true;
  if(OQ.ctx==="fn"){ oqDone(dest); fnGo(); return; }
  const redo=ONB.redo; ONB.redo=false; oqDone(redo?"":dest);
  ONB.a={why:OQ.a.why?[OQ.a.why]:[], level:OQ.a.level||null, staff:OQ.a.staff||null, how:OQ.a.how||null, cont:null, time:OQ.a.time||null};
  onbFinish(false, redo||noTour); TOUR.after=null; if(redo) return;
  OQ.land=dest; if(!($("tour")&&!$("tour").hidden)) oqLand(); }
function oqLand(){ const d=OQ.land; OQ.land=null; if(!d||d==="hub") return;
  setTimeout(()=>{ try{ if(d==="pp") ppBegin(); else if(d==="place") plOpen(); else openPage(d); }catch(e){} }, 80); }
{ const _te=tourEnd; tourEnd=function(){ const r=_te.apply(this,arguments); if(OQ.land) oqLand(); return r; }; }

// ---- ce que les réponses règlent (le même moteur pour les deux parcours) : en plus d'onbApply, le temps par jour = l'objectif du jour
{ const _oa=onbApply; onbApply=function(){ const a=ONB.a||{}; const r=_oa.apply(this,arguments);
  try{ if(a.time && ["5","10","20"].includes(String(a.time))) goalSet("min", +a.time); }catch(e){}
  S.onb={...S.onb, v:2, time:a.time||null, ctx:OQ.ctx, sk:OQ.sk.slice(0,6), sec:Math.round((Date.now()-(OQ.t0||Date.now()))/1000)}; save(); return r; }; }
// premier lancement : les réponses (niveau de D4 + questions) passent à onbApply
fnApply=function(){ S.gate="guest"; const a=OQ.a; ONB.a={why:a.why?[a.why]:[], level:FN.level, staff:a.staff||null, how:FN.how, cont:null, time:a.time||null}; onbApply(); S.onb={...S.onb, quick:1}; S.tourDone=1;
  S.introSeen={...(S.introSeen||{}), chords:true, learn:true, practice:true, hub:true}; save(); };
// le niveau (D4) ouvre les questions ; « Ton programme » relance la suite d'origine (Premiers pas, placement) ; « Je joue déjà » = Ma route / PLAY / GAMES
{ const _go=fnGo; fnGo=function(){ if(!FN.on) return _go.apply(this,arguments);
  if(!OQ.done){ if(OQ.on) return; track("onb_answer", {q:"level", a:FN.level, ctx:"fn"}); OQ.fx=oqFx("level", FN.level); oqStart("fn", ["why","staff","time"]); OQ.fx=oqFx("level", FN.level); FN.st="q"; oqRender(); return; }
  if(FN.level==="adv"){ const d=oqDest(); fnApply(); fnClose(); setInput(FN.how, FN.how!=="screen"); openPage(d); return; }
  return _go.apply(this,arguments); }; }
{ const _fo=fnOpen; fnOpen=function(){ OQ={on:false, ctx:"fn", fn:true, list:[], i:0, a:{}, sk:[], fx:"", t0:Date.now(), done:false, land:null, lastV:"", cAt:0}; return _fo.apply(this,arguments); }; }
{ const _fr=fnRender; fnRender=function(){ const g=$("gate"); if(!g||!FN.on) return;
  if(FN.st==="q" && OQ.on){ _fr.apply(this,arguments); const pl=g.querySelector(".fn-play"); if(!pl) return;
    pl.className="fn-play fn-st-q"; pl.innerHTML='<div class="fn-top"><span class="fn-step">'+esc(t("oqSumK"))+'</span><span class="fn-tr">'+(OQ.list[OQ.i]?'<button class="fn-skip" type="button" id="fnSkip">'+esc(t("oqSkipAll"))+'</button>':'')+'</span></div>'+oqBody();
    g.setAttribute("aria-labelledby","fnH"); if($("fnSkip")) $("fnSkip").onclick=()=>{ track("onb_skip", {q:"rest", ctx:"fn"}); OQ.list.slice(OQ.i).forEach(k=>{ if(!OQ.sk.includes(k)) OQ.sk.push(k); }); OQ.i=OQ.list.length; OQ.fx=""; oqRender(); };
    oqWire(pl); return; }
  _fr.apply(this,arguments);
  oqView(FN.st==="hw"?"hw":FN.st==="c"?"c":"level");
  if(FN.st==="lvl"){ const s=g.querySelector(".fn-step"); if(s) s.textContent=t("onbStep")(1,4); } }; }
// « Passer » avant les questions : rien n'est réglé (comme avant), mesuré
{ const _fs=fnSkip; fnSkip=function(){ track("onb_skip", {q:"all", at:FN.st||"", ctx:"fn"}); return _fs.apply(this,arguments); }; }
// les notes pendant les questions : Do seul = continuer (MIDI), le reste est ignoré
{ const _fn=fnNote; fnNote=function(m, el){ if(FN.on && FN.st==="q" && OQ.on){ if(el===undefined && md12(m)===0) oqC(); return; } return _fn.apply(this,arguments); }; }
{ const _mf=midiFlush; midiFlush=function(){ const onbQ = OQ.on && OQ.ctx==="onb" && $("onb") && !$("onb").hidden;
  if((FN.on && FN.st==="q" && OQ.on) || onbQ){ const b=midiBuf.slice(), lone=midiBufMidi && b.length===1; midiBuf=[]; midiBufMidi=true; if(lone && md12(b[0])===0) oqC(); return; }
  return _mf.apply(this,arguments); }; }

// ---- le questionnaire de « Se connecter » et de Réglages : le même moteur, dans la carte #onb
{ const _oo=onbOpen; onbOpen=function(){ OQ.a = OQ.fn && !OQ.done ? {...OQ.a, level:FN.level} : {}; OQ.fn=false; OQ.sk=[]; OQ.t0=Date.now();
  oqStart("onb", ["level","why","staff","time","how"].filter(k=>k!=="how"||oqOpts("how").length>1)); return _oo.apply(this,arguments); }; }
onbRender=function(){ const o=$("onb"); if(!o) return; if(!OQ.on || OQ.ctx!=="onb") oqStart("onb", ["level","why","staff","time","how"]);
  const n=OQ.list.length, fin=OQ.i>=n; oqView(OQ.list[OQ.i]||"recap");
  o.innerHTML='<div class="onb-card oq-card"><div class="onb-top"><span></span><div class="onb-bar"><i style="width:'+Math.min(100,(OQ.i+(fin?1:0))/n*100)+'%"></i></div><button class="gt-link onb-skip" type="button" id="onbSkip"'+(fin?' hidden':'')+'>'+esc(t("onbSkip"))+'</button></div>'+oqBody()+'</div>';
  o.setAttribute("aria-labelledby","oqH");
  $("onbSkip").onclick=()=>{ track("onb_skip", {q:"all", at:OQ.list[OQ.i]||"", ctx:"onb"}); OQ.on=false; const redo=ONB.redo; ONB.redo=false; onbFinish(true, redo); };
  oqWire(o); };

// ---- objectif → contenu mis en avant : l'ordre de « Pour toi » sur l'accueil
{ const _rf=rsFor; rsFor=function(){ const r=_rf.apply(this,arguments); try{ const w=S.onb&&Array.isArray(S.onb.why)?S.onb.why[0]:null, row=$("rsFor")&&$("rsFor").querySelector(".rs-row");
  const first={songs:"song", fun:"duel"}[w]; if(row && first){ const c=row.querySelector('[data-f="'+first+'"]'); if(c && row.firstChild!==c) row.insertBefore(c,row.firstChild); } }catch(e){} return r; }; }

Object.assign(TXT.fr,{ppLvlS:["14 leçons de 2 min","un test d'1 min","ma route, sans aide"], ppLvlMidi:n=>"Clavier reconnu · un 2e "+n+" = « Oui, je n'y connais rien » : les Premiers pas.",
  oqSet:"On a réglé :", oqSumK:"Ton programme", oqSkipQ:"Passer cette question", oqSkipAll:"Passer", oqChange:"Tu peux tout changer dans Réglages.",
  oqMidiQ:n=>"Joue un "+n+" pour continuer", oqMidiGo:n=>"Joue un "+n+" pour commencer",
  oqQ:{level:["Tu débutes complètement\u00a0?","On règle les aides et ton point de départ."], why:["Qu'est-ce qui te donne envie de jouer\u00a0?","On met en avant ce qui te plaît."], staff:["Sais-tu lire les notes sur une portée\u00a0?","On affiche la portée, ou pas."], time:["Combien de temps par jour\u00a0?","Ce sera ton objectif du jour, l'anneau autour de ton avatar."], how:["Comment vas-tu jouer\u00a0?","Tu pourras changer à tout moment, en bas du menu."]},
  oqWhy:{songs:["Jouer des morceaux","Les airs que j'aime"], theory:["Comprendre la musique","Accords, gammes, harmonie"], fun:["Pour le plaisir","Des jeux et des défis"], school:["Pour mes cours","Conservatoire, école, prof"]},
  oqTime:{"5":["5 min par jour","Tranquille"], "10":["10 min par jour","Régulier"], "20":["20 min par jour","Sérieux"]},
  oqFxLvl:{debut:"touches allumées, noms des notes et doigtés ; tu commences par les Premiers pas.", notes:"un test d'une minute te place au bon endroit des Premiers pas.", adv:"tout est débloqué, sans aide ; Ma route t'attend."},
  oqFxWhy:{songs:"les morceaux passent en premier dans « Pour toi ».", theory:"accords et gammes en avant, avec Ma route dans LEARN.", fun:"les jeux et les duels passent en premier.", school:"l'entraînement du jour en premier, pour réviser entre deux cours."},
  oqFxTime:n=>"objectif du jour de "+n+" min, l'anneau autour de ton avatar.",
  oqGoT:{pp:"Commencer la leçon 1", place:"Faire le test (1 min)", free:"Ouvrir mes morceaux", games:"Ouvrir les jeux", learn:"Voir ma route", hub:"C'est parti"},
  oqMidiOk:n=>n+" est prêt.", oqMicOk:"Ton micro est prêt.", oqMicPrep:"Préparer le micro"});
Object.assign(TXT.en,{ppLvlS:["14 two-minute lessons","a 1-min test","my path, no help"], ppLvlMidi:n=>"Keyboard connected · a second "+n+" = “Yes, I know nothing”: your First steps.",
  oqSet:"We set:", oqSumK:"Your plan", oqSkipQ:"Skip this question", oqSkipAll:"Skip", oqChange:"You can change everything in Settings.",
  oqMidiQ:n=>"Play "+(n==="C"?"a C":n)+" to go on", oqMidiGo:n=>"Play "+(n==="C"?"a C":n)+" to start",
  oqQ:{level:["Are you a complete beginner?","We set the helps and your starting point."], why:["What makes you want to play?","We put forward what you like."], staff:["Can you read notes on a staff?","We show the staff, or not."], time:["How much time a day?","It becomes your daily goal, the ring around your avatar."], how:["How will you play?","You can change it any time, at the bottom of the menu."]},
  oqWhy:{songs:["Play songs","The tunes I love"], theory:["Understand music","Chords, scales, harmony"], fun:["For fun","Games and challenges"], school:["For my lessons","School, conservatory, teacher"]},
  oqTime:{"5":["5 min a day","Easy"], "10":["10 min a day","Steady"], "20":["20 min a day","Serious"]},
  oqFxLvl:{debut:"lit keys, note names and fingering; you start with the First steps.", notes:"a one-minute test puts you at the right place in the First steps.", adv:"everything unlocked, no help; your path is waiting."},
  oqFxWhy:{songs:"songs come first in “For you”.", theory:"chords and scales first, with your path in LEARN.", fun:"games and duels come first.", school:"the daily practice comes first, to revise between lessons."},
  oqFxTime:n=>"a daily goal of "+n+" min, the ring around your avatar.",
  oqGoT:{pp:"Start lesson 1", place:"Take the test (1 min)", free:"Open my songs", games:"Open the games", learn:"See my path", hub:"Let's go"},
  oqMidiOk:n=>n+" is ready.", oqMicOk:"Your mic is ready.", oqMicPrep:"Set up the mic"});
/* ==== fin Onboarding 2 ==== */
