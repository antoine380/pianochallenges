// fragment de l'IIFE principale — ordre 480, voir src/app/README.md
// ---------- Premium: freemium limits, paywall (mobile-app style), invitations and shared results ----------
// Off until payments are live: everyone keeps everything. Preview with ?paywall=1 or Settings › Subscription.
/* PREM_OFFER : TOUTE l'offre Premium au même endroit (prix en euros TTC, limites de la formule gratuite).
   Deux formules (décision d'Antoine, oct. 2026) : Solo (1 personne, au mois ou à l'année) et Famille (jusqu'à familySeats
   personnes, à l'année, chacun son compte et sa progression). Rien n'est « à vie ». Changer une valeur ici (ou dans
   app_config.prem_offer, lu au démarrage) suffit : paywall, Réglages › Abonnement, économie de l'annuel, « soit X €/mois »,
   verrous et textes suivent (FR « 149 € », EN « €149 »). Les identifiants des produits Stripe / App Store : docs/PAIEMENT.md. */
const PREM_OFFER={
  month:17.99,       // Solo mensuel, sans engagement (prix pas encore confirmé)
  year:149,          // Solo annuel, avec l'essai gratuit ; « Le plus choisi » (économie et prix par mois calculés)
  family:199,        // Famille annuel
  familySeats:4,     // personnes au total dans la formule Famille, titulaire compris (même valeur que families.seats côté serveur)
  trialDays:7,       // essai gratuit de l'annuel Solo
  trialRemind:5,     // jour du rappel par e-mail pendant l'essai
  launchSeats:0,     // prix de lancement pour les N premiers abonnés (0 = mention masquée)
  freeTypes:2,       // gratuit : les N premiers types de chaque matière
  freeDuels:5,       // gratuit : duels par jour
  freeSongs:10,      // gratuit : les N premiers morceaux du catalogue (assets/js/songs-data.js, ordre du fichier)
  currency:"EUR"     // le quiz reste illimité en local, les tonalités Simples restent gratuites
};
const PAY_LIVE=false; // Stripe (site) and Apple in-app purchase (app) come next; until then the trial is simulated on the device
function money(v){ const fr=S.settings.lang==="fr", w=Math.abs(v-Math.round(v))<.005, d=w?0:2;
  return new Intl.NumberFormat(fr?"fr-FR":"en-IE",{style:"currency",currency:PREM_OFFER.currency,minimumFractionDigits:d,maximumFractionDigits:d}).format(w?Math.round(v):v); }
// free songs = the first PREM_OFFER.freeSongs songs of the catalogue (songs-data.js order), only when the paywall is on
function premCat(){ const L=window.PC_SONGS; return L ? L.map(s=>s.id) : null; }
function premFreeSongs(){ const c=premCat(); return Math.min(PREM_OFFER.freeSongs, c?c.length:PREM_OFFER.freeSongs); }
function pwI(k){ return ({lock:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>',gift:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="9" width="17" height="11.5" rx="2"/><path d="M2.5 9h19v3.5h-19zM12 9v11.5M12 9c-1.6-3.6-6-4.6-6-1.8C6 9 9.6 9 12 9zM12 9c1.6-3.6 6-4.6 6-1.8C18 9 14.4 9 12 9z"/></svg>',share:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3.5M7.5 8 12 3.5 16.5 8"/><path d="M5 12.5v6A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5v-6"/></svg>',crown:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 8.5l4 3.5L12 5l4.5 7 4-3.5-1.8 10h-13.4z"/><path d="M6 20.5h12"/></svg>'})[k]; } // icons (functions: usable before this module runs)
const PW={why:"",plan:"year",done:false,after:null};
function paywallOn(){ return !!(S.settings && S.settings.paywall) || /[?&]paywall=1/.test(location.search); }
function premUntil(){ const p=S.prem||{}; return Math.max(+p.until||0,+p.trialEnd||0,+p.refUntil||0); }
function isPremium(){ return !paywallOn() || premUntil()>Date.now(); }
function premDays(){ return Math.max(0,Math.ceil((premUntil()-Date.now())/864e5)); }
function premType(sec,id){ if(isPremium()) return false; const L=typeList(sec); return L.findIndex(ty=>ty.id===id)>=PREM_OFFER.freeTypes; }
function premSong(id){ if(isPremium()) return false; const c=premCat(); if(!c) return false; const i=c.indexOf(id); return i<0 || i>=PREM_OFFER.freeSongs; }
function duFreeLeft(){ const d=dayStr(), n=PREM_OFFER.freeDuels; return !S.duDay||S.duDay.d!==d ? n : Math.max(0,n-(S.duDay.n|0)); }
function duelGate(){ if(isPremium()||duFreeLeft()>0) return true; pwOpen("duels"); return false; }
function duCount(){ if(isPremium()) return; const d=dayStr(); if(!S.duDay||S.duDay.d!==d) S.duDay={d,n:0}; S.duDay.n++; save(); }
function pwChip(){ return '<span class="pw-chip">'+pwI("lock")+'<span>'+esc(t("lockT"))+'</span></span>'; }
function pwLayer(id,cls){ let o=$(id); if(!o){ o=document.createElement("div"); o.id=id; o.className=cls; o.setAttribute("role","dialog"); o.setAttribute("aria-modal","true"); o.hidden=true; document.body.appendChild(o);
    o.addEventListener("click",e=>{ if(e.target===o) (id==="pw"?pwClose:invClose)(); }); } return o; }
function pwInert(){ const on=document.body.classList.contains("pw-on")||document.body.classList.contains("gate-on")||document.body.classList.contains("fj-on"); [$("side"),$("shell")].forEach(e=>{ if(e) e.inert=on; }); }
function pwOpen(why){ PW.why=why||"menu"; PW.plan="year"; PW.done=false; const o=pwLayer("pw","pw"); o.hidden=false; document.body.classList.add("pw-on"); pwInert(); closeDrawer&&closeDrawer(); pwRender(); if(!window.PC_SONGS && typeof pcLoad==="function") pcLoad().then(()=>{ const o=$("pw"); if(o&&!o.hidden&&!PW.done) pwRender(); }).catch(()=>{}); setTimeout(()=>$("pwGo")&&$("pwGo").focus(),30); }
function pwClose(){ const o=$("pw"); if(!o||o.hidden) return; o.hidden=true; document.body.classList.remove("pw-on"); pwInert(); premRefresh(); if(PW.after){ const f=PW.after; PW.after=null; f(); } }
function pwRender(){ const o=$("pw"); if(!o) return; const app=isApp(), O=PREM_OFFER;
  if(PW.done){ o.innerHTML='<div class="pw-card"><div class="pw-ok"><span class="pw-crown">'+OBJ.crown()+'</span><h2 class="pw-h"></h2><p></p><button class="gt-go" type="button" id="pwOkGo"></button>'+(payLive()?'':'<p class="pw-note"></p>')+'</div></div>';
    o.querySelector("h2").textContent=t("pwOkT"); o.querySelector("p").textContent=S.prem&&S.prem.trialEnd>Date.now()?t("pwOkP")(premDays(),O.trialDays-O.trialRemind):(PW.plan==="family"||(S.prem&&S.prem.plan==="family")||((premEnt()||{}).plan==="family"&&(premEnt()||{}).source==="self"))?t("pwOkPF")(O.familySeats):t("pwOkPM"); o.querySelector("#pwOkGo").textContent=t("pwOkGo"); o.querySelector("#pwOkGo").onclick=pwClose;
    const nt=o.querySelector(".pw-note"); if(nt) nt.textContent=t("pwPreview"); return; }
  const why=(t("pwWhy")||{})[PW.why], whyS=typeof why==="function" ? why(PW.why==="duels"?O.freeDuels:O.trialDays) : (why||"");
  const sv=premSave(), seats=O.familySeats|0||4;
  const col=(k,name,price,per,sub,btn,id,extra)=>'<div class="pw-col'+(k==="year"?' best':'')+(k==="family"?' fam':'')+'" data-p="'+k+'">'+(k==="year"?'<span class="pw-badge">'+esc(t("pwBest"))+'</span>':'')
    +'<span class="pw-pk">'+esc(name)+'</span><span class="pw-pp">'+esc(price)+'<small>'+esc(per)+'</small></span><span class="pw-ps">'+sub+'</span>'+(extra||'')
    +'<button class="pw-pick" type="button" data-p="'+k+'"'+(id?' id="'+id+'"':'')+'>'+esc(btn)+'</button></div>';
  const feats=["♪","⚔","♯","★"];
  o.innerHTML='<div class="pw-card"><button class="pw-x" type="button" id="pwX" aria-label="'+esc(t("closeLbl"))+'">×</button>'
    +'<div class="pw-head"><span class="pw-crown">'+OBJ.crown()+'</span><p class="pw-k">'+esc(t("pwKick"))+'</p><h2 class="pw-h" id="pwH">'+esc(t("pwTitle"))+'</h2><p class="pw-sub">'+esc(t("pwSub"))+'</p><p class="pw-why">'+esc(whyS)+'</p></div>'
    +'<div class="pw-cols"><span class="pw-grp pw-g1">'+esc(t("pwGrpSolo"))+'</span><span class="pw-grp pw-g2">'+esc(t("pwGrpFam")(seats))+'</span>'
    +col("month",t("pwMonth"),money(O.month),t("pwPerM"),esc(t("pwMonthSub")),t("pwChoose"),"")
    +col("year",t("pwYear"),money(O.year),t("pwPerY"),'<b>'+esc(t("pwYearPM")(money(O.year/12)))+'</b>'+(sv>0?' · <span class="pw-save">'+esc(t("pwSave")(sv))+'</span>':'')+' · '+esc(t("pwYearTrial")(O.trialDays)),t("pwTry")(O.trialDays),"pwGo")
    +col("family",t("pwFam"),money(O.family),t("pwPerY"),esc(t("pwFamSub")(seats)),t("pwChoose"),"",famDots(seats))+'</div>'
    +'<div class="pw-row"><ol class="pw-tl">'+t("pwTl")(O.trialDays,O.trialRemind).map(([a,b])=>'<li><b>'+esc(a)+'</b><span>'+esc(b)+'</span></li>').join("")+'</ol>'
    +premCmp("pw-free pw-cmp")+'</div>'
    +'<ul class="pw-feats">'+t("pwFeats").map((x,i)=>'<li><span aria-hidden="true">'+feats[i]+'</span>'+esc(x)+'</li>').join("")+'</ul>'
    +'<div class="pw-foot">'+(O.launchSeats?'<p class="pw-launch">★ '+esc(t("pwLaunch")(fmtN(O.launchSeats)))+'</p>':'')+'<span class="pw-sp"></span>'
    +'<button type="button" class="pw-later" id="pwLater">'+esc(t("pwLater"))+'</button></div>'
    +'<p class="pw-fine">'+esc(t("pwFine")(money(O.year),O.trialDays))+(app?" "+esc(t("pwFineApp")):"")+'</p>'
    +(payLive()?'':'<p class="pw-note">'+esc(t("pwPreview"))+'</p>')
    +'<div class="pw-links"><button type="button" class="pw-inv" id="pwInv">'+pwI("gift")+'<span>'+esc(t("pwInvite"))+'</span></button><button type="button" id="pwRestore">'+esc(t("pwRestore"))+'</button><a href="mentions-legales.html" target="_blank" rel="noopener">'+esc(t("pwTerms"))+'</a><a href="confidentialite.html" target="_blank" rel="noopener">'+esc(t("pwPrivacy"))+'</a></div>'
    +'</div>';
  o.setAttribute("aria-labelledby","pwH");
  o.querySelectorAll(".pw-pick").forEach(b=>b.onclick=()=>{ PW.plan=b.dataset.p; payStart(PW.plan); });
  $("pwX").onclick=pwClose; $("pwLater").onclick=pwClose;
  $("pwInv").onclick=()=>{ const a=PW.after; PW.after=null; pwClose(); PW.after=a; invOpen(); };
  $("pwRestore").onclick=()=>{ if(isApp() && payAppReady()) restorePurchases(); else toast(t("pwRestoreNone")); }; }
// économie de l'annuel Solo par rapport à 12 mois au prix mensuel (en %, arrondi), et le petit tableau Gratuit / Premium
function premSave(){ const O=PREM_OFFER, m=+O.month*12, y=+O.year; return m>0 && y>0 && y<m ? Math.round((1-y/m)*100) : 0; }
function famDots(n){ return '<span class="pw-fam" aria-hidden="true">'+[0,4,7,9,2,11].slice(0,Math.max(1,Math.min(6,n|0))).map(c=>'<i style="background:var(--note-'+c+')"><svg viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="4"/><path d="M4.5 21c.6-4.4 3.6-7 7.5-7s6.9 2.6 7.5 7z"/></svg></i>').join("")+'</span>'; }
function premCmp(cls){ const O=PREM_OFFER, c=premCat(), R=t("pwCmpRows")(O.freeTypes, premFreeSongs(), O.freeDuels, c?c.length:0);
  return '<div class="'+cls+'"><table><thead><tr><th scope="col"></th><th scope="col">'+esc(t("pwCmpFree"))+'</th><th scope="col">'+esc(t("pwCmpPrem"))+'</th></tr></thead><tbody>'
    +R.map(([a,f,p])=>'<tr><th scope="row">'+esc(a)+'</th><td>'+esc(f)+'</td><td>'+esc(p)+'</td></tr>').join("")+'</tbody></table></div>'; }
// payment: Stripe Checkout on the site and Apple in-app purchase in the app (next step); here the trial is simulated
// plans: month (30 days), year (trial then 1 year), family (1 year), life (one payment)
function payStart(plan){ const now=Date.now(), D=864e5, O=PREM_OFFER; if(!PAY_PLANS[plan]) return;
  if(payLive()){ if(isApp()){ if(payAppReady()) payApple(plan); else toast(t("paySoon")); } else if(payWebReady()) payStripe(plan); else toast(t("paySoon")); return; } // Famille et paiement (fin du script)
  const until = plan==="month" ? now+30*D : plan==="family" ? now+365*D : 0;
  S.prem={...(S.prem||{}), plan, preview:1, trialEnd: plan==="year" ? now+O.trialDays*D : 0, until, at:now}; save();
  PW.done=true; pwRender(); setTimeout(()=>confetti(),120); }
function premRefresh(){ const hs=$("hsInv"); if(hs){ const sm=hs.querySelector("small"); if(sm) sm.textContent=t(paywallOn()?"invHubS":"invHubSF"); } const b=$("premBtn"); if(b){ b.hidden=!paywallOn() || (premUntil()>Date.now() && !(S.prem&&S.prem.trialEnd>Date.now()));
    $("premSub").textContent = S.prem&&S.prem.trialEnd>Date.now() ? t("premSubTrial")(premDays()) : t("premSub")(PREM_OFFER.trialDays); }
  try{ if(document.body.classList.contains("setup")) renderSetup(); }catch(e){} try{ renderPlaySongs(); }catch(e){} try{ if(RN.on&&DU.view==="lobby") duRender(); }catch(e){} try{ renderSetPrem(); }catch(e){} }
function renderSetPrem(){ const box=$("setPremBox"); if(!box) return; if(paywallOn() && !window.PC_SONGS && typeof pcLoad==="function") pcLoad().then(()=>{ if(window.PC_SONGS) renderSetPrem(); }).catch(()=>{}); const on=paywallOn(), p=premUntil()>Date.now(), tr=S.prem&&S.prem.trialEnd>Date.now(), O=PREM_OFFER;
  box.classList.toggle("off",!on); // offer not launched: only the preview switch, no subscription status
  const ent=premEnt(), pn=premPlanName(ent), own=ent && ent.source==="self" && ent.store && ent.store!=="manual";
  const st = !on || (p && !tr) ? [t("setPremOn")+(on&&pn?" · "+pn:""),t("setPremOnD")] : tr ? [t("setPremTrial")(premDays()),t("setPremOnD")] : [t("setPremFree"),t("setPremFreeD")(O.freeTypes,premFreeSongs(),O.freeDuels)];
  box.innerHTML='<span class="sp-st"></span><button class="btn primary" type="button" id="spSee"></button><button class="btn" type="button" id="spInv"></button>'
    +(on?'<span class="sp-grid">'+[["pwMonth",O.month,"pwPerM"],["pwYear",O.year,"pwPerY"],["pwFam",O.family,"pwPerY"]].map(([k,v,per])=>'<span data-p="'+k+'"><b>'+esc(t(k))+'</b> '+esc(money(v))+esc(t(per))+(k==="pwFam"?' <small>'+esc(t("pwUpTo")(O.familySeats))+'</small>':'')+'</span>').join("")+'</span>'+(p?'':premCmp("sp-cmp")):'')
    +'<label><input type="checkbox" id="spPrev"><span></span></label>';
  const s1=box.querySelector(".sp-st"); s1.textContent=st[0]; const sm=document.createElement("small"); sm.textContent=ent&&ent.source==="family"&&p?t("famVia")(ent.owner||"?"):st[1]; s1.appendChild(sm);
  const see=$("spSee"); see.hidden=!on;
  if(p && on && own){ see.textContent=t("setPremManage"); see.onclick=()=>payManage(ent); }
  else if(p && on && ent && ent.source){ see.hidden=true; } // Premium par la famille ou offert : rien à gérer ici
  else if(p && on){ see.textContent=t("setPremReset"); see.onclick=()=>{ S.prem={}; save(); premRefresh(); toast(t("setPremReset")); }; }
  else { see.textContent=t("setPremSee"); see.onclick=()=>pwOpen("menu"); }
  $("spInv").textContent=t("invBtn"); $("spInv").onclick=()=>invOpen();
  const cb=$("spPrev"); cb.checked=!!S.settings.paywall; cb.nextSibling.textContent=t("setPremPreview"); cb.onchange=()=>{ S.settings.paywall=cb.checked; save(); premRefresh(); }; }
