// fragment de l'IIFE principale — ordre 730, voir src/app/README.md
/* ==== Revue UI (25/10) ==== */
// synchro : la fusion complète (avec tous ses enrobages) dit « changé » seulement pour une vraie différence de contenu (syncSame)
// Les conflits « l'appareil local gagne » ne convergent pas entre deux appareils (chacun garde sa version, le serveur oscille) :
// notifications créées des deux côtés avec la même clé (entraînement du jour, badges…) et dates « vu » (bulles, étiquettes) → la plus ancienne gagne, des deux côtés.
{ const isO=x=>x&&typeof x==="object"&&!Array.isArray(x), num=x=>Number.isFinite(+x)?+x:0;
  const minMap=(a,b)=>{ const o={}; [a,b].forEach(m=>{ if(isO(m)) Object.entries(m).forEach(([k,v])=>{ o[k]=(k in o)?(Number.isFinite(+v)&&Number.isFinite(+o[k])?Math.min(+o[k],+v):o[k]||v):v; }); }); return Object.fromEntries(Object.keys(o).sort().map(k=>[k,o[k]])); };
  const _ms=mergeState; mergeState=function(local, cloud){ const r=_ms.apply(this,arguments), M=r.merged, c=isO(cloud)?cloud:{};
    if(isO(M.notifs) && isO(c.notifs) && Array.isArray(c.notifs.list)){ const L=isO(local.notifs)&&Array.isArray(local.notifs.list)?local.notifs.list:[], by=new Map();
      [...L,...c.notifs.list].forEach(n=>{ if(!isO(n)||!n.id) return; const o=by.get(n.id); if(!o){ by.set(n.id,{...n}); return; } const w=num(n.t)<num(o.t)?{...n}:o; if(o.read||n.read) w.read=true; else if("read" in o||"read" in n) w.read=false; by.set(n.id,w); });
      M.notifs.list=[...by.values()].sort((a,b)=>num(b.t)-num(a.t)||String(a.id).localeCompare(String(b.id))).slice(0,60);
      M.notifs.keys=minMap(isO(local.notifs)&&local.notifs.keys, c.notifs.keys); }
    if(isO(M.hints) && isO(c.hints)) M.hints.seen=minMap(isO(local.hints)&&local.hints.seen, c.hints.seen);
    if(isO(M.lbl) && isO(c.lbl)){ M.lbl.told=minMap(isO(local.lbl)&&local.lbl.told, c.lbl.told); M.lbl.gone=minMap(isO(local.lbl)&&local.lbl.gone, c.lbl.gone); }
    r.changed=!syncSame(M,local); return r; }; }
// en-tête des jeux : « Salon » et « Quitter » restent ensemble quand la ligne passe à la ligne (Saute-notes les séparait sur deux rangées)
{ const q=$("rnQuit"), l=$("duToLobby"); if(q&&l&&q.parentNode){ const g=document.createElement("span"); g.className="rn-acts"; q.parentNode.insertBefore(g,l); g.appendChild(l); g.appendChild(q); } }
// états vides et petites explications (textes ru* en FR et EN)
Object.assign(TXT.fr,{ruRecNone:"Pas encore de record : joue une partie dans GAMES ou un morceau dans PLAY pour inscrire le premier.", ruHistX:"Joue en ligne ou contre un bot : ton ELO se fixe après 5 parties classées.", ruHistGo:"Jouer contre un bot",
  ruNtfGo:"Choisir mes notifications", ruAchHelp:"Touche un badge pour savoir comment l'obtenir.", ruPremFree:"Tout est gratuit pour l'instant", ruPremFreeD:"Toutes les matières, tous les morceaux et les duels sont ouverts, sans limite. Rien à payer, rien à activer.",
  ruFreeTip:"Joue ce que tu veux : rien n'est noté, chaque note s'allume dans sa couleur."});
Object.assign(TXT.en,{ruRecNone:"No record yet: play a game in GAMES or a song in PLAY to set your first one.", ruHistX:"Play online or against a bot: your ELO settles after 5 rated games.", ruHistGo:"Play a bot",
  ruNtfGo:"Choose my notifications", ruAchHelp:"Tap a badge to see how to earn it.", ruPremFree:"Everything is free for now", ruPremFreeD:"Every topic, every song and duels are open, with no limit. Nothing to pay, nothing to turn on.",
  ruFreeTip:"Play anything you like: nothing is scored, each note lights up in its colour."});
TXT.fr.rankErr=TXT.fr.hsRankErr="Classement injoignable pour l'instant (pas de connexion ?). Ta progression reste gardée sur cet appareil.";
TXT.en.rankErr=TXT.en.hsRankErr="Can't reach the leaderboard right now (offline?). Your progress stays saved on this device.";
{ const e=$("ntfEmpty"); if(e){ const art=e.querySelector(".ntf-eart"); if(art) art.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>';
    const b=document.createElement("button"); b.type="button"; b.className="btn"; b.id="ntfEmptyGo"; b.dataset.i="ruNtfGo"; b.onclick=()=>{ openPage("settings"); try{ setTab("ntf"); }catch(x){} }; e.appendChild(b); } }
{ const h=document.querySelector("#achBox .ach-h"); if(h){ const p=document.createElement("p"); p.className="ru-ach-help"; p.dataset.i="ruAchHelp"; h.after(p); } }
{ const bar=$("pcBar"); if(bar){ const p=document.createElement("p"); p.className="ru-free-tip"; p.dataset.i="ruFreeTip"; bar.after(p); } }
{ const b=$("rnBest"); if(b){ const d=document.createElement("span"); d.className="ru-gm-desc"; d.id="ruGmDesc"; b.after(d); } }
{ const _rl=duRenderLobby; duRenderLobby=function(){ const r=_rl.apply(this,arguments); try{ const g=(t("games")||[]).find(x=>x[2]===DU.game); $("ruGmDesc").textContent=g?g[1]:""; }catch(e){} return r; }; }
{ const _sp=renderSetPrem; renderSetPrem=function(){ const r=_sp.apply(this,arguments), box=$("setPremBox"); if(box && box.classList.contains("off") && !box.querySelector(".ru-prem")){ const d=document.createElement("div"); d.className="ru-prem"; d.innerHTML='<b></b><span></span>'; d.firstChild.textContent=t("ruPremFree"); d.lastChild.textContent=t("ruPremFreeD"); box.prepend(d); } return r; }; }
/* ==== fin Revue UI ==== */
