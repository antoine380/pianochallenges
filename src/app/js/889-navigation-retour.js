// fragment de l'IIFE principale — ordre 889, voir src/app/README.md
/* ==== Navigation : retour, en-tête des matières (08/11/2026) ====
// Bouton retour ← (#sc1BackB) devant le titre des pages « une à une » → LEARN ; (#suBack) devant le titre de l'écran de départ
// (« Configurer mon cours ») → la page « une à une » d'où l'on vient (UA.cfgFrom), sinon LEARN.
// En-tête : NOTES | ACCORDS, puis Révision (avec picto), puis Configurer mon cours ; résultats dans un encart (.sc1-sum.ua-res :
// étoiles et coupes, barre de progression). « S'inscrire / Se connecter » n'est plus en haut à droite (il est dans le menu, CSS 470). */
const NAV_BACK_SVG='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
const NAV_RV_SVG='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v4.5h-4.5"/><path d="M12 8v4l2.5 2"/></svg>';
Object.assign(TXT.fr,{sc1ToN:"Jouer en notes", endErr:n=>n+(n>1?" fautes":" faute"), endInfoA:"Comment sont comptés les exercices", endInfoT:"Un exercice est sans faute quand tu le joues en entier sans aucune fausse note.", navBack:"Retour", navBackLearn:"Retour à LEARN", navBackUa:x=>"Retour à « "+x+" »", uaResStars:"étoiles", uaResCups:"coupes"});
Object.assign(TXT.en,{sc1ToN:"Play it in notes", endErr:n=>n+(n>1?" mistakes":" mistake"), endInfoA:"How exercises are counted", endInfoT:"An exercise is flawless when you play it all the way through without a single wrong note.", navBack:"Back", navBackLearn:"Back to LEARN", navBackUa:x=>"Back to “"+x+"”", uaResStars:"stars", uaResCups:"cups"});
function navBtn(id, label, go){ const b=document.createElement("button"); b.type="button"; b.id=id; b.className="nav-back"; b.innerHTML=NAV_BACK_SVG; b.setAttribute("aria-label",label); b.title=label; b.onclick=go; return b; }
// ---- page « une à une » : retour, ordre des boutons, picto Révision, encart des résultats ----
{ const o=sc1Render; sc1Render=function(){ const r=o.apply(this,arguments); try{ const P=$("sc1Panel"), top=P&&P.querySelector(".sc1-top"); if(!top) return r;
    top.prepend(navBtn("sc1BackB", t("navBackLearn"), ()=>{ sc1TipHide(); openPage("learn"); }));
    const seg=$("sc1Seg"), rv=$("sc1RvB"), cfg=$("uaCfg"), acts=document.createElement("div"); acts.className="ua-acts"; acts.id="uaActs";
    if(rv) rv.insertAdjacentHTML("afterbegin",NAV_RV_SVG);
    [seg,rv,cfg].forEach(x=>{ if(x) acts.appendChild(x); }); top.appendChild(acts);
    const sum=$("sc1Sum"); if(sum){ sum.classList.add("ua-res"); const bigs=sum.querySelectorAll(".sc1-big");
      bigs.forEach((x,i)=>{ const l=document.createElement("small"); l.className="ua-rl"; l.setAttribute("aria-hidden","true"); l.textContent=t(i?"uaResCups":"uaResStars"); x.appendChild(l); });
      const m=sc1Mode(), tot=sc1Total(m), mx=sc1Max(m)||1; const bar=document.createElement("span"); bar.className="ua-bar"; bar.setAttribute("aria-hidden","true");
      bar.innerHTML='<i style="width:'+Math.round(100*tot/mx)+'%"></i>'; sum.appendChild(bar); acts.before(sum); }
  }catch(e){ console.warn(e); } return r; }; }
// ---- « Configurer mon cours » : retour vers la page « une à une » ----
UA.cfgFrom=null;
{ const o=uaCfg; uaCfg=function(){ UA.cfgFrom=UA.cur; return o.apply(this,arguments); }; }
{ const o=openPage; openPage=function(pg){ if(pg!=="practice" && !INFO_PAGES.includes(pg)) UA.cfgFrom=null; return o.apply(this,arguments); }; }
function suBackGo(){ const s=UA.cfgFrom; if(s && UA_DEF[s]) uaOpen(s); else openPage("learn"); }
{ const h=$("suTitle"); if(h && !$("suBack")) h.prepend(navBtn("suBack", t("navBack"), suBackGo)); }
{ const o=renderSetup; renderSetup=function(){ const r=o.apply(this,arguments); try{ const nm=$("suName"), from=UA.cfgFrom && UA_DEF[UA.cfgFrom];
    document.body.classList.toggle("su-cfg", !!from); // « Configurer mon cours » bien visible dans le titre, la matière en dessous
    if(nm && from){ const sec=nm.textContent; nm.innerHTML='<span class="su-cfgk">'+esc(t("uaCfg"))+'</span><span class="su-cfgs">'+esc(sec)+'</span>'; }
    const b=$("suBack"); if(b){ const s=UA.cfgFrom, L = s && UA_DEF[s] ? t("navBackUa")(uaName(s)) : t("navBackLearn"); b.setAttribute("aria-label",L); b.title=L; } }catch(e){} return r; }; }
function uaName(s){ const c=UA.cur; try{ uaUse(s); return t("sc1Name"); } finally { if(c!==s) uaUse(c); } }
// ---- fin de partie (toutes les matières LEARN) ----
// fautes par exercice : fausses notes + notes manquantes (même compte que roundLevel)
{ const o=record; record=function(){ const fresh = !!(game && !game.results[game.i]), r=o.apply(this,arguments);
    try{ const R = fresh && game && game.results[game.i]; if(R && cur && cur.sec!=="ear") R.err=(errors|0)+Math.max(0,seq.length-idx); }catch(e){} return r; }; }
const endRv = g => !!(g && g.queue && g.queue.length && g.queue.every(it=>it && it.sc1rv));
{ const o=openEnd; openEnd=function(g){ if(endRv(g) && page!=="sc1" && UA_DEF[UA.cur]){ try{ uaUse(UA.cur); openPage("sc1"); }catch(e){} } // une révision : le bilan s'ouvre au-dessus de la page des étoiles
  const r=o.apply(this,arguments); try{
    // « À retravailler » : le nombre de fautes au lieu de « 8 / 8 »
    const R=g.results.filter(Boolean), byName=new Map(); R.forEach(x=>{ if(x.err!=null){ const k=itemName(x.it); byName.set(k, Math.max(byName.get(k)||0, x.err)); } });
    document.querySelectorAll("#endBody .end-list li").forEach(li=>{ const n=byName.get(li.children[1].textContent); if(n) li.children[2].textContent=t("endErr")(n); });
    // l'explication (sans faute / avec 1 à 3 fautes…) derrière un « i »
    const hero=document.querySelector("#endBody .end-hero"), sub=hero&&hero.querySelector(".end-sub"), chips=hero&&hero.querySelector(".end-chips");
    if(sub && chips){ chips.id="endChips"; chips.hidden=true; const i=document.createElement("button"); i.type="button"; i.className="end-i"; i.id="endInfo"; i.textContent="i";
      i.setAttribute("aria-label",t("endInfoA")); i.setAttribute("aria-expanded","false"); i.setAttribute("aria-controls","endChips");
      const tx=document.createElement("p"); tx.className="end-itx"; tx.textContent=t("endInfoT"); chips.prepend(tx);
      i.onclick=e=>{ e.stopPropagation(); const on=chips.hidden; chips.hidden=!on; i.setAttribute("aria-expanded",String(on)); }; sub.appendChild(i); }
    // plus de « Changer de choix » (la croix revient à l'écran d'avant) : les deux boutons sur une ligne
    const f=$("endFoot"); [...f.querySelectorAll("button")].forEach(b=>{ if(b.firstChild && b.firstChild.nodeType===3 && b.firstChild.textContent===t("suChange")) b.remove(); });
    f.classList.add("end-one");
  }catch(e){ console.warn(e); } return r; }; }
// une révision : « Nouvelle partie » relance la révision, fermer revient à la page des étoiles
{ const o=endReplay; endReplay=function(g){ if(endRv(g)){ closeEnd(); sc1RvStart(); return; } return o.apply(this,arguments); }; }
function endRvBack(g){ if(!endRv(g)) return; const sec=UA.cur; setTimeout(()=>{ if(!game && phase==="idle" && page==="practice" && !endOpen) uaOpen(sec); },0); }
{ const o=closeEnd; closeEnd=function(){ const was=endOpen, g=lastGame, r=o.apply(this,arguments); if(was) endRvBack(g); return r; }; }
["endX","endBg"].forEach(id=>{ const el=$(id); if(el) el.addEventListener("click",()=>endRvBack(lastGame)); }); // ces deux-là appellent l'ancien closeEnd (lié au chargement)
document.addEventListener("click",e=>{ const c=$("endChips"); if(c && !c.hidden && !c.contains(e.target)){ c.hidden=true; const i=$("endInfo"); if(i) i.setAttribute("aria-expanded","false"); } });
// ---- fin d'une case « une à une » (08/11) : 3 boutons ; à refaire → « Recommencer » en bleu ; réussie → « Suivante » en bleu ----
// Gammes : « Toutes les gammes » devient « Jouer en accords » (en NOTES) / « Jouer en notes » (en ACCORDS) ; la croix ramène à la liste.
// Touches MIDI : Do = le bouton bleu, Mi = le bouton marqué data-mi, Si = Recommencer.
function sc1ToNotes(tid,k){ S.settings.sc1Mode="notes"; save(); if(page==="sc1") sc1Render(); sc1Ask(tid,k,"notes"); }
{ const o=sc1End; sc1End=function(g){ const r=o.apply(this,arguments); try{ const s=g&&g.sc1; if(!s) return r;
    const F=$("endFoot"), n=s.stars|0, scales=uaSecOf(s.mode)==="scales", again=$("sc1Again"), nx=$("sc1Next");
    const kb=(b,x)=>{ if(!b) return; b.querySelectorAll("kbd").forEach(e=>e.remove()); delete b.dataset.mi; if(x){ const e=kbdEl(); e.textContent=x; b.appendChild(e); } };
    let sw=$("sc1ToCh");
    if(scales){ const back=$("sc1Back"); if(back) back.remove();
      if(!sw){ sw=document.createElement("button"); sw.type="button"; sw.className="btn";
        if(s.mode==="notes"){ sw.id="sc1ToCh"; sw.textContent=t("sc1ToCh"); sw.onclick=()=>sc1ToChords(s.tid,s.k); } else { sw.id="sc1ToN"; sw.textContent=t("sc1ToN"); sw.onclick=()=>sc1ToNotes(s.tid,s.k); } } }
    else sw=$("sc1Back");
    [sw,again,nx].forEach(b=>{ if(b) b.classList.remove("primary"); });
    const main = n<3 || !nx ? again : nx; if(main) main.classList.add("primary");
    // ordre : l'autre mode (ou la liste), Recommencer, Suivante
    [sw,again,nx].forEach(b=>{ if(b) F.appendChild(b); });
    kb(main,CNAME()); if(main!==again) kb(again,BNAME());
    const other = main===nx ? sw : nx; [sw,nx].forEach(b=>{ if(b && b!==main) kb(b, b===other?ENAME():""); }); if(other && other!==main) other.dataset.mi="1";
    if(main) main.focus({preventScroll:true});
  }catch(e){ console.warn(e); } return r; }; }
{ const o=midiStart; midiStart=function(note){ const pc=((note%12)+12)%12;
    if((pc===0||pc===4) && page==="sc1" && endOpen && lastGame && lastGame.sc1 && $("sc1Again") && !openMods.length && !helpOpen && !midiOpen && S.settings.midiC!==false){
      const b = pc===0 ? $("endFoot").querySelector(".btn.primary") : $("endFoot").querySelector('[data-mi="1"]'); if(b){ b.click(); return true; } if(pc===4) return false; }
    return o.apply(this,arguments); }; }
/* ==== fin Navigation ==== */
