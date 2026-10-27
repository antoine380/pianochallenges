// fragment de l'IIFE principale — ordre 880, voir src/app/README.md
/* ==== Gammes v4 + Série 10 min (chantier sc1-v4, 27/10/2026) ==== */
// A. Tutoriel : la pointe de la bulle vise le CENTRE de l'élément (même quand la bulle est recadrée au bord de l'écran) ;
//    mise en forme des puces (**gras**, {train}/{eval} = pictos de la fenêtre du choix, {s1..s3} = étoiles dorées).
// B. Fin de Gammes une à une : messages variés (sc1RV, jamais deux fois le même de suite), plus de compteur de coupes, plus de ligne de série.
// C. Série : un jour compte quand on a joué SR_MIN minutes ce jour-là (S.playSec). Bascule S.srFrom (les jours d'avant gardent l'ancienne
//    règle : XP = jour compté). Anneau 0 → 10 min sur la flamme du menu (#streakStat) et dans la carte verte de la fiche (#pfSr) ;
//    à 5 min : demi-anneau + « Encore 5 min… » + pulsation ; à 10 min : animation non modale en coin (#srCel), une fois par jour (S.srShown).
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
  srOkT:"Série validée aujourd'hui", srOkS:n=>n+" min jouées : aujourd'hui compte !", srCelT:n=>"Série : "+n+" jour"+(n>1?"s":"")+" !", srCelS:n=>n+" minutes jouées aujourd'hui"});
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
  srOkT:"Streak locked in today", srOkS:n=>n+" min played: today counts!", srCelT:n=>"Streak: "+n+" day"+(n!==1?"s":"")+"!", srCelS:n=>n+" minutes played today"});

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
const SR={prev:-1, t0:0, wait:0, fanAt:0, force:0};
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
    if(S.srShown!==d){ S.srShown=d; save(); srCelebrate(); } }
  else if(was>=0 && was<SR_SEC/2 && s>=SR_SEC/2) srPulse();
  srPaint(); }
{ const o=goalTick; goalTick=function(){ const r=o.apply(this,arguments); try{ srTick(); }catch(e){ console.warn(e); } return r; }; }
// l'animation : jamais pendant une note attendue d'un exercice (elle attend la fin, 90 s au plus), non modale, sans focus
const srBusy = () => !!(game && (page==="practice"||page==="daily") && phase==="listening");
function srCelebrate(){ SR.t0=Date.now(); clearTimeout(SR.wait); srSoon(); }
function srSoon(){ if(srBusy() && Date.now()-SR.t0<90000){ SR.wait=setTimeout(srSoon,400); return; } srShow(); }
function srShow(){ let c=$("srCel"); if(c) c.remove(); clearTimeout(SR.hide); c=document.createElement("div"); c.id="srCel"; c.className="sr-cel"; c.setAttribute("role","status"); c.setAttribute("aria-live","polite");
  // maquette validée (captures-sc1v4-proto/serie-anim.html) : bandeau qui descend en haut à droite, anneau de la moitié au plein (jaune → orange),
  // flamme grise qui s'allume avec un rebond et une onde, le chiffre qui rebondit, les points des jours (le dernier s'allume), remonte vers 4,5 s
  const n=Math.max(1,effStreak()), dots=Math.min(7,n), R=28, C=2*Math.PI*R;
  c.innerHTML='<span class="sr-big"><svg class="sr-rg" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="srGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffcf3f"/><stop offset="1" stop-color="#ff6a1f"/></linearGradient></defs>'
    +'<circle class="tr" cx="32" cy="32" r="'+R+'"/><circle class="fg" cx="32" cy="32" r="'+R+'" stroke="url(#srGrad)" stroke-dasharray="'+C.toFixed(2)+'" style="--c:'+C.toFixed(2)+'px"/></svg>'
    +'<svg class="sr-fl" viewBox="0 0 24 24" aria-hidden="true">'+SR_FLAME+'</svg><i class="sr-burst" aria-hidden="true"></i></span>'
    +'<span class="sr-tx"><b></b><small></small><span class="sr-days" aria-hidden="true">'+'<i></i>'.repeat(dots-1)+'<i class="td"></i></span></span>';
  const T=String(t("srCelT")(fmtN(n))), k=T.indexOf(fmtN(n)), b=c.querySelector("b");
  if(k>=0){ b.append(T.slice(0,k)); const sp=document.createElement("span"); sp.className="n"; sp.textContent=fmtN(n); b.append(sp, T.slice(k+fmtN(n).length)); } else b.textContent=T;
  c.querySelector("small").textContent=t("srCelS")(fmtN(SR_MIN));
  document.body.appendChild(c); void c.offsetWidth; c.classList.add("in");
  if(uiSound() && ctx && ctx.state==="running" && Date.now()-SR.fanAt>1500){ try{ tone(79,1.7,.35,.07); tone(84,1.84,.7,.06); }catch(e){} } // au moment où la flamme s'allume
  SR.hide=setTimeout(()=>{ c.classList.add("out"); SR.hide=setTimeout(()=>c.remove(),300); }, 4500); }
// fusion entre appareils : temps de jeu = max par jour, bascule = la plus ancienne, animation vue = la plus récente
{ const o=mergeState; mergeState=function(local, cloud){ const r=o.apply(this,arguments); try{ const isO=x=>x&&typeof x==="object"&&!Array.isArray(x), c=isO(cloud)?cloud:{}, M=r.merged;
    const ps={...(isO(local.playSec)?local.playSec:{})}; Object.entries(isO(c.playSec)?c.playSec:{}).forEach(([k,v])=>{ if(Number.isFinite(+v)) ps[k]=Math.max(+ps[k]||0,+v); }); if(Object.keys(ps).length) M.playSec=ps;
    const f=[local.srFrom,c.srFrom].filter(x=>typeof x==="string"&&x).sort()[0]; if(f) M.srFrom=f;
    const sh=[local.srShown,c.srShown].filter(x=>typeof x==="string"&&x).sort().pop(); if(sh) M.srShown=sh;
    r.changed=!syncSame(M,local); }catch(e){} return r; }; }
srFrom(); SR.prev=srSec(); setTimeout(srPaint,0);
/* ==== fin Gammes v4 + Série 10 min ==== */
