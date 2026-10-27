// fragment de l'IIFE principale — ordre 880, voir src/app/README.md
/* ==== Gammes v4 + Série 10 min (chantier sc1-v4, 27/10/2026) ==== */
// A. Tutoriel : la pointe de la bulle vise le CENTRE de l'élément (même quand la bulle est recadrée au bord de l'écran) ;
//    mise en forme des puces (**gras**, {train}/{eval} = pictos de la fenêtre du choix, {s1..s3} = étoiles dorées).
// B. Fin de Gammes une à une : messages variés (sc1RV, jamais deux fois le même de suite), plus de compteur de coupes, plus de ligne de série.
// C. Série : un jour compte quand on a joué SR_MIN minutes ce jour-là (S.playSec). Bascule S.srFrom (les jours d'avant gardent l'ancienne
//    règle : XP = jour compté). Anneau 0 → 10 min sur la flamme du menu (#streakStat) et dans la carte verte de la fiche (#pfSr) ;
//    à 5 min : demi-anneau + « Encore 5 min… » + pulsation ; à 10 min : animation PLEIN ÉCRAN au centre (#srCel, srShow), une fois par jour
//    (S.srShown), jamais pendant une note attendue (srBusy), fermée au toucher / Échap / Do seul MIDI (note avalée) ou seule après ~5 s.
//    Test : tools/audit/r53_serie.mjs.
Object.assign(TXT.fr,{
  sc1Tu:{seg:["Notes ou accords",["**NOTES** : tu joues chaque gamme note par note.","**ACCORDS** : tu joues les accords de la gamme, un par un.","Chaque mode a ses propres étoiles."]],
    cell:["Une case = une gamme",["Touche une case pour la jouer.","{train}**Entraînement** : je te montre la gamme, puis tu la rejoues avec les touches allumées et les doigtés. Rien n'est noté.","{eval}**Évaluation** : tu la joues seul, sans aide, pour gagner des étoiles."]],
    stars:["Les étoiles",["{s1}1 étoile : 3 notes justes.","{s2}2 étoiles : la gamme finie, avec au moins une faute.","{s3}3 étoiles : la gamme finie sans faute."]],
    cup:["La coupe",["Au bout de chaque ligne, une coupe.","Tu la gagnes quand les 4 gammes de la note ont 3 étoiles."]],
    rv:["La révision",["Rejoue d'un coup toutes tes gammes à 3 étoiles, pour les garder en mémoire.","Elle s'ouvre dès ta première gamme à 3 étoiles."]]},
  sc1RV:{3:["Sans faute !","Parfait, pas une seule faute !","Impeccable, du premier coup !","Zéro faute, bravo !","Propre et net : 3 étoiles !","Tes doigts connaissent la route !"],
    2:["Gamme finie !","Gamme bouclée ! Le sans-faute est tout près.","Tu l'as jouée jusqu'au bout !","Bien tenu jusqu'à la fin !","Jusqu'à la dernière note, bravo !"],
    1:["3 notes justes, continue !","Bon début, continue !","Le début est là, la suite va venir !","Ça démarre bien, accroche-toi !"],
    "1c":["3 accords justes, continue !","Bon début, continue !","Le début est là, la suite va venir !","Ça démarre bien, accroche-toi !"],
    0:["Prêt pour un nouvel essai ?","On remet ça ?","Chaque essai compte, on recommence ?","Pas grave, on y retourne ?"],
    cup:["Toute la ligne à 3 étoiles, chapeau !","Quelle régularité : la ligne complète !","Une coupe de plus dans ta vitrine !","Les 4 gammes de la ligne, maîtrisées !"],
    rec:["Nouveau record pour cette gamme !","Tu bats ton record sur cette gamme !","Mieux que la dernière fois !","Record battu, tu progresses !"]},
  endStreak:()=>"", ntfStreakX:"Joue 10 minutes avant minuit pour la garder.",
  srOf:(a,b)=>"Série du jour : "+a+" / "+b+" min", srLeft:n=>"Encore "+n+" min pour valider ta série", srHow:n=>"Joue "+n+" min pour valider ta série",
  srOkT:"Série validée aujourd'hui", srOkS:n=>n+" min jouées : aujourd'hui compte !", srCelT:n=>"Série : "+n+" jour"+(n>1?"s":"")+" !", srCelS:n=>"Tes "+n+" minutes du jour sont faites.", srCelH:"Touche l'écran pour continuer", srCelHm:c=>"Touche l'écran ou joue "+c+" pour continuer"});
Object.assign(TXT.en,{
  sc1Tu:{seg:["Notes or chords",["**NOTES**: you play each scale note by note.","**CHORDS**: you play the chords of the scale, one by one.","Each mode has its own stars."]],
    cell:["One box = one scale",["Tap a box to play it.","{train}**Practice**: I show you the scale, then you play it back with the keys lit and the fingering. Nothing is scored.","{eval}**Test**: you play it on your own, with no help, to win stars."]],
    stars:["The stars",["{s1}1 star: 3 right notes.","{s2}2 stars: the scale finished, with at least one mistake.","{s3}3 stars: the scale finished with no mistake."]],
    cup:["The cup",["At the end of each row, a cup.","You win it when the 4 scales of that note have 3 stars."]],
    rv:["The review",["Play all your 3-star scales again in one go, to keep them in mind.","It opens with your first 3-star scale."]]},
  sc1RV:{3:["No mistake!","Perfect, not a single mistake!","Spotless, first time!","Zero mistakes, well done!","Clean and neat: 3 stars!","Your fingers know the way!"],
    2:["Scale finished!","Scale done! A clean run is close.","You played it to the end!","You held on to the end!","Right to the last note, well done!"],
    1:["3 right notes, keep going!","Good start, keep going!","The start is there, the rest will come!","Nice start, hang in there!"],
    "1c":["3 right chords, keep going!","Good start, keep going!","The start is there, the rest will come!","Nice start, hang in there!"],
    0:["Ready for another go?","Shall we go again?","Every try counts, again?","No problem, let's go again?"],
    cup:["The whole row at 3 stars, hats off!","So steady: the full row!","One more cup in your cabinet!","All 4 scales of the row, mastered!"],
    rec:["New best for this scale!","You beat your best on this scale!","Better than last time!","Record broken, you're improving!"]},
  endStreak:()=>"", ntfStreakX:"Play 10 minutes before midnight to keep it.",
  srOf:(a,b)=>"Today's streak: "+a+" / "+b+" min", srLeft:n=>n+" more min to lock in your streak", srHow:n=>"Play "+n+" min to lock in your streak",
  srOkT:"Streak locked in today", srOkS:n=>n+" min played: today counts!", srCelT:n=>"Streak: "+n+" day"+(n!==1?"s":"")+"!", srCelS:n=>"Your "+n+" minutes for today are done.", srCelH:"Tap the screen to continue", srCelHm:c=>"Tap the screen or play "+c+" to continue"});

// ---- A. tutoriel : puces mises en forme, pointe centrée sur la cible ----
function tuFmt(s){ return esc(s).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>")
  .replace(/\{(train|eval)\}/g,(m,v)=>'<span class="tu-ic" aria-hidden="true">'+SC1_PK_IC[v]+'</span>')
  .replace(/\{s([1-3])\}/g,(m,n)=>'<span class="tu-st" aria-hidden="true">'+"★".repeat(+n)+'</span>'); }
function tuPlace(el, tip){ const r=el.getBoundingClientRect(), W=document.documentElement.clientWidth, H=innerHeight, tw=Math.min(340,W-24), th=tip.offsetHeight||200;
  let x,y,side; const cl=(v,a,b)=>Math.max(a,Math.min(b,v));
  if(r.right+16+tw<W && r.left<W/2 && r.right>0){ x=r.right+16; y=cl(r.top+r.height/2-th/2,12,H-th-12); side="right"; }
  else if(r.bottom+16+th<H){ x=r.left+r.width/2-tw/2; y=r.bottom+14; side="below"; }
  else { x=r.left+r.width/2-tw/2; y=Math.max(12,r.top-th-14); side="above"; }
  x=cl(x,12,W-tw-12); tip.dataset.side=side; tip.style.left=x+"px"; tip.style.top=y+"px";
  if(side==="right") tip.style.setProperty("--tay", cl(r.top+r.height/2-y, 22, th-22).toFixed(1)+"px");
  else tip.style.setProperty("--tax", cl(r.left+r.width/2-x, 24, tw-24).toFixed(1)+"px"); }
{ const o=tourShow; tourShow=function(){ const r=o.apply(this,arguments); try{ const ov=$("tour"), st=TOUR.steps[TOUR.i]; if(ov && !ov.hidden && st){
      $("tourL").querySelectorAll("li").forEach(li=>{ const s=li.textContent; if(/\*\*|\{(train|eval|s[1-3])\}/.test(s)) li.innerHTML=tuFmt(s); });
      const el=document.querySelector(st[0]); if(el) tuPlace(el, $("tourTip")); } }catch(e){ console.warn(e); } return r; }; }

// ---- B. fin de Gammes une à une : messages variés, sans coupes ni série ----
const SC1V={last:{}};
function sc1Var(cat){ const L=(t("sc1RV")||{})[cat]||[]; if(L.length<2) return L[0]||""; let i; do{ i=Math.floor(Math.random()*L.length); }while(L[i]===SC1V.last[cat]); SC1V.last[cat]=L[i]; return L[i]; }
{ const o=sc1End; sc1End=function(g){ const r=o.apply(this,arguments); try{ const s=g&&g.sc1; if(s){ const n=s.stars|0, B=$("endBody");
      const m=B.querySelector(".sc1-msg"); if(m) m.textContent=sc1Var(B.querySelector(".sc1-cupwon") ? "cup" : n===1 && s.mode==="chords" ? "1c" : String(Math.max(0,Math.min(3,n))));
      const nw=B.querySelector(".sc1-best.new"); if(nw) nw.textContent=sc1Var("rec");
      const tot=B.querySelector(".sc1-tot"); if(tot) tot.innerHTML='<span aria-hidden="true">★ </span>'+esc(t("sc1SumA")(sc1Total(s.mode),SC1_MAX)); } }catch(e){ console.warn(e); } return r; }; }

// ---- C. série validée au bout de SR_MIN minutes de jeu ----
const SR_MIN=10, SR_SEC=SR_MIN*60;
const SR={prev:-1, wait:0, fanAt:0, force:0, pend:0, on:false, buf:[], bt:0, h:null, hide:0, gone:0, prevFocus:null};
const srSec = d => (((S.playSec||{})[d||dayStr()])|0);
// date de bascule : la nouvelle règle compte à partir de ce jour (un jour déjà compté par l'ancienne règle aujourd'hui reste compté)
function srFrom(){ if(typeof S.srFrom!=="string" || !/^\d{4}-\d\d-\d\d$/.test(S.srFrom)){ S.srFrom = (S.streak && S.streak.last===dayStr()) ? addDays(1) : dayStr(); save(); } return S.srFrom; }
function srOk(d){ d=d||dayStr(); return d<srFrom() ? ((S.xpDays||{})[d]|0)>0 : srSec(d)>=SR_SEC; }
const srPct = () => srOk() ? 1 : Math.min(1, srSec()/SR_SEC);
// le temps de jeu compte aussi le quiz au MIDI, le mode PIANO, le lecteur Play (MIDI relayé et touches de l'iframe)
{ const o=quizIn; quizIn=function(){ lastNoteAt=Date.now(); return o.apply(this,arguments); }; }
{ const o=pnOn; pnOn=function(){ lastNoteAt=Date.now(); return o.apply(this,arguments); }; }
{ const o=playSend; playSend=function(type){ if(type==="noteon") lastNoteAt=Date.now(); return o.apply(this,arguments); }; }
{ const f=$("playFrame"); if(f) f.addEventListener("load",()=>{ try{ const d=f.contentDocument; if(d){ const on=()=>{ lastNoteAt=Date.now(); }; d.addEventListener("pointerdown",on,true); d.addEventListener("keydown",on,true); } }catch(e){} }); }
// XP ne suffit plus pour la série : seulement un jour validé (ou un jour d'avant la bascule)
{ const o=bumpStreak; bumpStreak=function(){ if(!SR.force && dayStr()>=srFrom() && srSec()<SR_SEC) return; return o.apply(this,arguments); }; } // avant la bascule : comme avant (addXP appelle bumpStreak avant d'écrire l'XP du jour)
// la série de la fiche (jours, record, calendrier) suit la même règle ; les semaines gardent « 3 jours joués » (XP)
streaks=function(){ const xd=S.xpDays||{}, ps=S.playSec||{}, all=[...new Set([...Object.keys(xd),...Object.keys(ps)])].filter(k=>/^\d{4}-\d\d-\d\d$/.test(k)).sort();
  const days=all.filter(k=>srOk(k)), wdays=Object.keys(xd).filter(k=>(xd[k]|0)>0).sort();
  let best=0,run=0,prev=null; const fz=frzDays(); days.forEach(k=>{ const d=pDate(k); let gap=prev?Math.round((d-prev)/864e5):0; if(prev && gap>1){ const x=new Date(prev); let ok=true; for(let i=1;i<gap;i++){ x.setDate(x.getDate()+1); if(!fz.has(dayStr(x))){ ok=false; break; } } if(ok) gap=1; }
    run = prev && gap===1 ? run+1 : 1; best=Math.max(best,run); prev=d; });
  const set=new Set(days), frz=frzDays(); let cur=0; const d=new Date(); if(!set.has(dayStr(d))) d.setDate(d.getDate()-1); while(set.has(dayStr(d))||frz.has(dayStr(d))){ if(set.has(dayStr(d))) cur++; d.setDate(d.getDate()-1); }
  cur=Math.max(cur, effStreak());
  const wn={}; wdays.forEach(k=>{ const w=wkKey(pDate(k)); wn[w]=(wn[w]|0)+1; }); const wkNow=wn[wkKey(new Date())]|0;
  const wks=Object.keys(wn).filter(w=>wn[w]>=3).sort(); let wb=0,wr=0,wp=null; wks.forEach(k=>{ const dd=pDate(k); wr = wp && Math.round((dd-wp)/864e5)===7 ? wr+1 : 1; wb=Math.max(wb,wr); wp=dd; });
  const ws=new Set(wks); let wc=0; const w=pDate(wkKey(new Date())); if(!ws.has(dayStr(w))) w.setDate(w.getDate()-7); while(ws.has(dayStr(w))){ wc++; w.setDate(w.getDate()-7); }
  return {cur,best:Math.max(best,cur),wc,wb:Math.max(wb,wc),set,frz,wkNow}; };
const SR_FLAME='<path d="M12 2c1 3.5 5 6 5 11a5 5 0 0 1-10 0c0-2.2 1-3.8 2.2-5 .2 1.6 1 2.8 2.3 3.3C11 8.3 11.3 5 12 2z"/>';
const srRingSVG = (p, cls) => { const r=16, C=2*Math.PI*r; return '<svg class="'+cls+'" viewBox="0 0 40 40" aria-hidden="true"><circle class="tr" cx="20" cy="20" r="'+r+'"/><circle class="fg" cx="20" cy="20" r="'+r+'" stroke-dasharray="'+C.toFixed(2)+'" stroke-dashoffset="'+(C*(1-p)).toFixed(2)+'"/></svg>'; };
function srLabel(){ const s=srSec(), mn=Math.floor(s/60); return srOk() ? [t("srOkT"), t("srOkS")(fmtN(Math.max(SR_MIN,mn)))] : [t("srOf")(fmtN(Math.min(mn,SR_MIN)),fmtN(SR_MIN)), s>=SR_SEC/2 ? t("srLeft")(fmtN(Math.max(1,SR_MIN-mn))) : t("srHow")(fmtN(SR_MIN))]; }
// la flamme du menu : un anneau qui se remplit
function srMenu(){ const st=$("streakStat"); if(!st) return; let ic=st.querySelector(".sr-ic");
  if(!ic){ const fl=st.querySelector("svg"); if(!fl) return; ic=document.createElement("span"); ic.className="sr-ic"; fl.before(ic); ic.appendChild(fl); ic.insertAdjacentHTML("beforeend",srRingSVG(0,"sr-rg")); }
  const p=srPct(), r=16, C=2*Math.PI*r; ic.querySelector(".fg").setAttribute("stroke-dashoffset",(C*(1-p)).toFixed(2));
  ic.classList.toggle("done",srOk()); ic.style.setProperty("--srp",p.toFixed(3)); const L=srLabel(); st.title=L[0]+" · "+L[1]; st.setAttribute("aria-label",($("streak").textContent||"")+" · "+L[0]+" · "+L[1]); }
// la carte verte de la fiche Progression : ligne de la série du jour
function srRow(){ const card=document.querySelector(".pf-streak"); if(!card) return; let row=$("pfSr");
  if(!row){ row=document.createElement("div"); row.id="pfSr"; row.className="pf-sr"; card.insertBefore(row,$("pfGoal")||card.children[1]||null); }
  const ok=srOk(), s=srSec(), L=srLabel(); row.classList.toggle("done",ok); row.classList.toggle("half",!ok && s>=SR_SEC/2);
  row.innerHTML='<span class="sr-ic">'+srRingSVG(srPct(),"sr-rg")+'<svg class="sr-fl" viewBox="0 0 24 24" aria-hidden="true">'+SR_FLAME+'</svg></span><span class="gl-t"><b></b><small></small></span>';
  row.querySelector("b").textContent=L[0]; row.querySelector("small").textContent=L[1];
  const g=goalCfg(), gb=$("pfGoal"), same=g.kind==="min" && +g.v===SR_MIN; // même objectif que la série : la ligne de l'objectif n'est pas répétée, ses pastilles (semaine, gels) passent dans la ligne de la série
  if(gb){ gb.hidden=same; const ch=gb.querySelector(".gl-chips"); if(same && ch) row.appendChild(ch.cloneNode(true)); } }
function srPaint(){ try{ srMenu(); }catch(e){} try{ if($("pfSr")) srRow(); }catch(e){} }
{ const o=goalRing; goalRing=function(){ const r=o.apply(this,arguments); srPaint(); return r; }; }
{ const o=renderFiche; renderFiche=function(){ const r=o.apply(this,arguments); try{ srRow(); }catch(e){ console.warn(e); } return r; }; }
{ const o=goalFanfare; goalFanfare=function(){ SR.fanAt=Date.now(); return o.apply(this,arguments); }; }
function srPulse(){ SR.pulseAt=Date.now(); [$("streakStat")&&$("streakStat").querySelector(".sr-ic"), $("pfSr")].forEach(el=>{ if(!el) return; el.classList.remove("sr-pulse"); void el.offsetWidth; el.classList.add("sr-pulse"); setTimeout(()=>el.classList.remove("sr-pulse"),1300); }); }
// chaque tick de temps de jeu (et chaque XP) : passage des 5 min, validation à 10 min
function srTick(){ const d=dayStr(), s=srSec(d), was=SR.prev; SR.prev=s;
  if(d>=srFrom() && s>=SR_SEC){ if(S.streak.last!==d){ SR.force=1; try{ bumpStreak(); }finally{ SR.force=0; } save(); try{ renderStatus(); }catch(e){} }
    if(S.srShown!==d && !SR.pend && !SR.on) srCelebrate(); } // S.srShown est posé quand elle se montre vraiment
  else if(was>=0 && was<SR_SEC/2 && s>=SR_SEC/2) srPulse();
  srPaint(); }
{ const o=goalTick; goalTick=function(){ const r=o.apply(this,arguments); try{ srTick(); }catch(e){ console.warn(e); } return r; }; }
// l'animation plein écran (maquette validée captures-sc1v4-proto/serie-anim-plein.html) : un « happening » au milieu, au-dessus de tout.
// Jamais pendant qu'une note est attendue (srBusy : exercice en écoute, activité en cours actNow(), leçon, placement, accompagnement,
// écrans de départ, assistant MIDI, app en arrière-plan) : elle attend l'écran calme suivant. Se ferme au toucher / clic, Échap, Entrée,
// Espace, Do seul MIDI (note avalée, jamais comptée en dessous) ou seule après ~5 s. Les activités solo en dessous attendent (srHold).
const srBusy = () => { try{
  if(document.hidden || LV.on || FN.on || MW.on || midiOpen) return true;
  if(game && (page==="practice"||page==="daily") && phase==="listening") return true;
  if(actNow()) return true;
  if(page==="pp" && (PP.view==="lesson"||PP.view==="place")) return true;
  if(page==="acc" && ACC.view==="play") return true;
  return ["gate","onb","tour"].some(id=>{ const e=$(id); return e && !e.hidden; }) || document.body.classList.contains("gate-on");
}catch(e){ return false; } };
function srCelebrate(){ SR.pend=1; clearTimeout(SR.wait); srSoon(); }
function srSoon(){ clearTimeout(SR.wait); if(!SR.pend) return; if(srBusy()){ SR.wait=setTimeout(srSoon,400); return; } SR.pend=0; srShow(); }
// pause des activités solo en dessous (même mécanique que l'arrière-plan, bloc « Chasse aux bugs ») ; rien en ligne
function srHold(on){ try{
  if(on){ if(SR.h || LV.on || HOLD) return; const pg=lvBase();
    if((pg==="practice"||pg==="daily") && game && phase==="listening" && !paused){ pauseRound(); SR.h={k:"learn"}; return; }
    const a=actNow(); if(!a || a.online) return;
    if(a.k==="learn"||a.k==="daily"){ if(!paused){ pauseRound(); SR.h=a; } return; }
    const keep=LV.a; LV.a=a; lvHold(true); LV.a=keep; SR.h=a; return; }
  const a=SR.h; if(!a) return; SR.h=null;
  if(a.k==="learn"||a.k==="daily"){ resumeRound(); return; }
  if(HOLD && !LV.on){ const keep=LV.a; LV.a=a; lvHold(false); LV.a=keep; }
}catch(e){ console.warn(e); } }
// les initiales des derniers jours de série (L M M J V S D), le dernier = aujourd'hui
function srDays(n){ const out=[]; let f; try{ f=new Intl.DateTimeFormat(S.settings.lang==="en"?"en-GB":"fr-FR",{weekday:"narrow"}); }catch(e){}
  for(let i=n-1;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); out.push(f ? f.format(d).toUpperCase() : ""); } return out; }
const SR_CONF=["--note-0","--note-2","--note-4","--note-5","--note-7","--note-9","--note-11"];
function srShow(){ let c=$("srCel"); if(c) c.remove(); clearTimeout(SR.hide); clearTimeout(SR.gone);
  S.srShown=dayStr(); save();
  const n=Math.max(1,effStreak()), N=fmtN(n), days=srDays(Math.min(7,n)), R=46, C=2*Math.PI*R;
  c=document.createElement("div"); c.id="srCel"; c.className="sr-cel"; c.tabIndex=-1;
  c.setAttribute("role","dialog"); c.setAttribute("aria-modal","true"); c.setAttribute("aria-labelledby","srCelT"); c.setAttribute("aria-describedby","srCelS");
  let conf=""; for(let i=0;i<40;i++) conf+='<i class="sr-cf" style="left:'+(Math.random()*100).toFixed(1)+'%;background:var('+SR_CONF[i%7]+');animation-delay:'+(2+Math.random()*.8).toFixed(2)+'s;--r:'+(Math.random()<.5?-1:1)+'"></i>';
  c.innerHTML='<div class="sr-conf" aria-hidden="true">'+conf+'</div><div class="sr-box">'
    +'<span class="sr-big"><svg class="sr-rg" viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="srGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffcf3f"/><stop offset="1" stop-color="#ff6a1f"/></linearGradient></defs>'
    +'<circle class="tr" cx="50" cy="50" r="'+R+'"/><circle class="fg" cx="50" cy="50" r="'+R+'" stroke="url(#srGrad)" stroke-dasharray="'+C.toFixed(2)+'" style="--c:'+C.toFixed(2)+'px"/></svg>'
    +'<svg class="sr-fl" viewBox="0 0 24 24" aria-hidden="true">'+SR_FLAME+'</svg><i class="sr-wave" aria-hidden="true"></i><i class="sr-wave b" aria-hidden="true"></i></span>'
    +'<h2 class="sr-t" id="srCelT"></h2><p class="sr-s" id="srCelS"></p>'
    +'<span class="sr-days" aria-hidden="true">'+days.map((d,i)=>'<i'+(i===days.length-1?' class="td"':'')+'>'+esc(d)+'</i>').join("")+'</span>'
    +'<small class="sr-hint"></small></div>';
  const T=String(t("srCelT")(N)), k=T.indexOf(N), h=c.querySelector(".sr-t");
  if(k>=0){ h.append(T.slice(0,k)); const sp=document.createElement("span"); sp.className="n"; sp.textContent=N; h.append(sp, T.slice(k+N.length)); } else h.textContent=T;
  c.querySelector(".sr-s").textContent=t("srCelS")(fmtN(SR_MIN));
  c.querySelector(".sr-hint").textContent = midiMode() && S.settings.midiC!==false ? t("srCelHm")(CNAME()) : t("srCelH");
  c.addEventListener("click",e=>{ e.preventDefault(); e.stopPropagation(); srClose(); });
  SR.prevFocus=document.activeElement; SR.on=true; SR.buf=[]; SR.at=Date.now();
  document.body.appendChild(c); void c.offsetWidth; c.classList.add("in");
  try{ c.focus({preventScroll:true}); }catch(e){}
  addEventListener("keydown",srKey,true); srHold(true);
  if(uiSound() && ctx && ctx.state==="running" && Date.now()-SR.fanAt>1500){ try{ tone(79,2.0,.35,.06); tone(84,2.12,.7,.05); }catch(e){} } // discret, quand la flamme s'allume
  SR.hide=setTimeout(srClose, 5200); }
function srClose(){ const c=$("srCel"); clearTimeout(SR.hide); clearTimeout(SR.bt); if(!SR.on){ return; } SR.on=false; SR.buf=[];
  removeEventListener("keydown",srKey,true); srHold(false);
  if(c){ c.classList.add("out"); SR.gone=setTimeout(()=>c.remove(),320); }
  const f=SR.prevFocus; SR.prevFocus=null; try{ if(f && f.isConnected && f!==document.body) f.focus({preventScroll:true}); }catch(e){} }
// clavier d'ordinateur : Échap / Entrée / Espace ferment, les autres touches (notes A…J, raccourcis) ne passent pas en dessous
function srKey(e){ if(!SR.on) return; e.preventDefault(); e.stopImmediatePropagation(); if(e.repeat) return; if(["Escape","Enter"," ","Spacebar"].includes(e.key)) srClose(); }
// MIDI (appelé par onmidimessage avant tout le reste) : toutes les notes sont avalées ; un Do seul (120 ms) ferme
function srNote(m){ if(S.settings.midiC===false) return; SR.buf.push(((m%12)+12)%12); clearTimeout(SR.bt);
  SR.bt=setTimeout(()=>{ const b=SR.buf; SR.buf=[]; if(SR.on && b.length===1 && b[0]===0) srClose(); },120); }
// écran, micro, clavier d'ordinateur : rien ne passe à l'exercice pendant l'animation
{ const o=noteIn; noteIn=function(){ if(SR.on) return; return o.apply(this,arguments); }; }
{ const o=midiIn; midiIn=function(){ if(SR.on) return; return o.apply(this,arguments); }; }
// la fenêtre « Garde tes progrès » (D23, ouverte au premier objectif atteint, souvent la même seconde) attend la fin de la fête
{ const o=acctBusy; acctBusy=function(){ return SR.on || !!SR.pend || (dayStr()>=srFrom() && srSec()>=SR_SEC && S.srShown!==dayStr()) || o.apply(this,arguments); }; }
// fusion entre appareils : temps de jeu = max par jour, bascule = la plus ancienne, animation vue = la plus récente
{ const o=mergeState; mergeState=function(local, cloud){ const r=o.apply(this,arguments); try{ const isO=x=>x&&typeof x==="object"&&!Array.isArray(x), c=isO(cloud)?cloud:{}, M=r.merged;
    const ps={...(isO(local.playSec)?local.playSec:{})}; Object.entries(isO(c.playSec)?c.playSec:{}).forEach(([k,v])=>{ if(Number.isFinite(+v)) ps[k]=Math.max(+ps[k]||0,+v); }); if(Object.keys(ps).length) M.playSec=ps;
    const f=[local.srFrom,c.srFrom].filter(x=>typeof x==="string"&&x).sort()[0]; if(f) M.srFrom=f;
    const sh=[local.srShown,c.srShown].filter(x=>typeof x==="string"&&x).sort().pop(); if(sh) M.srShown=sh;
    r.changed=!syncSame(M,local); }catch(e){} return r; }; }
srFrom(); SR.prev=srSec(); setTimeout(srPaint,0);
/* ==== fin Gammes v4 + Série 10 min ==== */
