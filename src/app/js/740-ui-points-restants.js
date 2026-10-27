// fragment de l'IIFE principale — ordre 740, voir src/app/README.md
/* ==== UI points restants (25/10) ==== */
Object.assign(TXT.fr,{upDSub:(d,due)=>d+(due?" · "+due+" à revoir":""), upDEx:n=>n>1?"exercices":"exercice", upDMin:"min", upDSecs:n=>n>1?"matières":"matière",
  upRinvT:"Grimpe dans les ligues", upRinvX:"Chaque semaine, ton XP te classe dans un groupe de 20 joueurs : les meilleurs montent de Bronze à Diamant."});
Object.assign(TXT.en,{upDSub:(d,due)=>d+(due?" · "+due+" to review":""), upDEx:n=>n>1?"exercises":"exercise", upDMin:"min", upDSecs:n=>n>1?"topics":"topic",
  upRinvT:"Climb the leagues", upRinvX:"Every week, your XP ranks you in a group of 20 players: the best move up from Bronze to Diamond."});
// Entraînement du jour : résumé (nombre d'exercices, durée ≈ 30 s par exercice, matières) au-dessus des cartes
{ const head=document.querySelector("#dailyPanel .pane-head"); if(head){ const d=document.createElement("div"); d.className="up-dsum"; d.id="upDSum"; head.after(d); }
  const _rd=renderDailyPanel; renderDailyPanel=function(){ const r=_rd.apply(this,arguments); try{
    const box=$("upDSum"); if(!box) return r; const plan=dailyPlan(), run=game&&game.daily, done=S.daily&&S.daily.date===dayStr();
    const items=(!run && done && S.daily.items ? S.daily.items : plan.items)||[], n=items.length, cnt={};
    items.forEach(it=>{ cnt[it.sec]=(cnt[it.sec]||0)+1; });
    const secs=SECS.filter(k=>cnt[k]), NM={scales:"secScales",chords:"secChords",harmony:"secHarmony",prog:"secProg",ear:"secEar"};
    box.innerHTML='<span class="up-dk"><b></b><span></span></span><span class="up-dk"><b></b><span></span></span><span class="up-dk"><b></b><span></span></span><ul class="up-dsecs"></ul>';
    const ks=box.querySelectorAll(".up-dk");
    ks[0].firstChild.textContent=n; ks[0].lastChild.textContent=t("upDEx")(n);
    ks[1].firstChild.textContent="≈ "+Math.max(1,Math.round(n/2)); ks[1].lastChild.textContent=t("upDMin");
    ks[2].firstChild.textContent=secs.length; ks[2].lastChild.textContent=t("upDSecs")(secs.length);
    const ul=box.querySelector("ul"); secs.forEach(k=>{ const li=document.createElement("li"); li.innerHTML=SEC_ICON(k)+'<span></span><i></i>'; li.querySelector("span").textContent=t(NM[k]); li.querySelector("i").textContent="×"+cnt[k]; ul.appendChild(li); });
    if(!run && !done){ const dt=new Date().toLocaleDateString(S.settings.lang==="fr"?"fr-FR":"en-GB",{weekday:"long",day:"numeric",month:"long"}); $("dpSub").textContent=t("upDSub")(dt.charAt(0).toUpperCase()+dt.slice(1), dueItems().length); }
  }catch(e){} return r; }; }
// Classement de la semaine (accueil) pour un invité : invitation aux ligues + « S'inscrire » (la carte restait vide hors connexion)
{ const _hr=renderHubRank; renderHubRank=function(){ const ol=$("hsRank"), card=ol&&ol.closest(".hs-card"); if(!card) return _hr.apply(this,arguments);
    if(!user && !hasSession()){ try{ lgHubOff(); }catch(e){} card.classList.add("up-inv"); ol.innerHTML="";
      const li=document.createElement("li"); li.className="up-rinv"; li.innerHTML='<span class="up-hexes" aria-hidden="true"></span><b></b><p></p><button class="btn primary" type="button" id="upRankJoin"></button>';
      LG_COL.forEach(c=>li.firstChild.appendChild(lgHex(c))); li.querySelector("b").textContent=t("upRinvT"); li.querySelector("p").textContent=t("upRinvX");
      const b=li.querySelector("button"); b.textContent=t("authUp"); b.onclick=()=>authOpen("signup"); ol.appendChild(li);
      if(!sb && !cloudPromise && !hsRankWait){ hsRankWait=true; setTimeout(()=>{ ensureCloud().then(()=>{ hsRankWait=false; hsRankAt=0; if(page==="hub") renderHubRank(); }).catch(()=>{ hsRankWait=false; }); },1200); } // comme avant : le SDK se charge et retrouve une session éventuelle
      return Promise.resolve(); }
    if(card.classList.contains("up-inv")){ card.classList.remove("up-inv"); ol.innerHTML=""; hsRankAt=0; }
    return _hr.apply(this,arguments); }; }
/* ==== fin UI points restants ==== */

