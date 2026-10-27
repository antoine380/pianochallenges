// fragment de l'IIFE principale — ordre 790, voir src/app/README.md
/* ==== Famille et paiement ==== */
// Deux formules : Solo (mensuel / annuel avec essai) et Famille (jusqu'à PREM_OFFER.familySeats personnes, chacun son compte).
// Paiement préparé mais COUPÉ : payLive() = PAY_LIVE ou app_config.flags.payLive. Tant qu'il est coupé, payStart simule (comme avant).
//   - site : Stripe Checkout via la fonction Edge « stripe » (/checkout, /portal) ; retour sur /?go=premium&ok=1 (MAIL_GO → ntfDo k:"premium") ;
//   - app iOS : RevenueCat (plugin Capacitor @revenuecat/purchases-capacitor, nom natif « Purchases »), appelé par le pont natif
//     sans @capacitor/core, seulement si la clé publique iOS est remplie (PAY_KEYS.rcIos ou app_config.pay.rc_ios).
//   Clés PUBLIQUES seulement (pk_test_… / appl_…) : aucune clé secrète dans l'app. Procédure complète : docs/PAIEMENT.md.
// Droits : my_entitlement() (abonnement perso, famille ou mois offert) → S.prem.ent, pris par premUntil ; sans la fonction
// (migration pas encore lancée), repli sur my_premium() comme avant.
// Famille : Réglages › Abonnement › « Ma famille » (#famBox, famLoad/famRender) ; lien ?fam=<CODE> (8 caractères, 7 jours) →
// fenêtre #famJoin « Rejoindre la famille de X » (famJoinOpen), après création de compte / connexion si besoin (authOpen).
Object.assign(TXT.fr,{pwUpTo:n=>"jusqu'à "+n+" personnes", pwGrpSolo:"Solo · 1 personne", pwGrpFam:n=>"Famille · jusqu'à "+n+" personnes", pwSave:n=>"−"+n+" % sur l'année", pwSolo:"Solo",
  pwOkPF:n=>"Tout est débloqué. Invite jusqu'à "+(n-1)+" personnes dans Réglages › Abonnement : chacun garde son compte et sa progression.",
  pwCmpFree:"Gratuit", pwCmpPrem:"Premium", pwCmpRows:(ty,so,du,all)=>[["Tonalités","Simples","Toutes"],["Types par matière",String(ty),"Tous"],["Morceaux",String(so),all?"Tous ("+all+")":"Tous"],["Duels",du+" par jour","Illimités"],["Quiz en local","Illimité","Illimité"]],
  paySoon:"Le paiement arrive bientôt.", paySignIn:"Crée ton compte (ou connecte-toi) pour t'abonner : ton Premium suivra ton compte sur tous tes appareils.", payErr:"Le paiement n'a pas pu démarrer. Réessaie dans un instant.",
  payWait:"Paiement reçu : on active ton Premium…", payCancel:"Paiement annulé : rien n'a été débité.", payRestored:"Achats restaurés.", payWebManage:"Ton abonnement se gère sur pianochallenges.com, dans Réglages › Abonnement.", setPremGift:"Premium offert",
  famVia:x=>"Premium avec la famille de "+x+".", famH:"Ma famille", famSubO:n=>"Jusqu'à "+n+" personnes, chacun son compte et sa progression.", famSubM:x=>"Tu fais partie de la famille de "+x+".",
  famOwner:"Titulaire", famYou:"toi", famRm:"Retirer", famSure:"Confirmer ?", famInv:"Inviter", famFull:"Famille complète", famLeft:n=>n+(n>1?" places restantes":" place restante"),
  famInvT:"Lien d'invitation", famInvD:d=>"Pour une personne · valable jusqu'au "+d, famCopy:"Copier", famShare:"Partager", famNew:"Nouveau lien",
  famShareTx:x=>x+" t'invite dans sa famille Piano Challenges : Premium pour toi aussi, avec ton propre compte.", famLeave:"Quitter la famille", famLeft0:"Tu as quitté la famille.", famRmOk:"Retiré de la famille.",
  famOff:x=>"L'abonnement Famille de "+x+" n'est plus actif : le Premium partagé est en pause.",
  famJT:x=>"Rejoindre la famille de "+x, famJGuestT:"On t'invite dans une famille", famJGuest:"Crée ton compte ou connecte-toi pour la rejoindre : Premium pour toi aussi, avec ta propre progression.",
  famJD:x=>"Tu gardes ton compte et ta progression. Ton Premium dure tant que l'abonnement de "+x+" est actif.", famJSeats:(u,n)=>u+" / "+n+" personnes", famJGo:"Rejoindre", famJLater:"Plus tard",
  famJOk:x=>"Bienvenue dans la famille de "+x+" !", famJOkD:"Tout est débloqué pour toi aussi.", famJClose:"Fermer", famGate:"Tu rejoins une famille : crée ton compte ou connecte-toi pour en profiter.", famJGuestNP:"Crée ton compte ou connecte-toi pour la rejoindre, avec ta propre progression.", famJDNP:"Tu gardes ton compte et ta progression.",
  famE:{not_signed_in:"Connecte-toi d'abord.", no_family:"Il faut un abonnement Famille pour inviter.", not_owner:"Seul le titulaire de l'abonnement peut faire ça.", family_full:"Cette famille est complète.",
    family_inactive:"L'abonnement de cette famille n'est plus actif.", invite_invalid:"Ce lien d'invitation n'existe pas.", invite_expired:"Ce lien a expiré : demande un nouveau lien.", invite_used:"Ce lien a déjà servi : demande un nouveau lien.",
    is_owner:"C'est ta propre famille.", already_member:"Tu fais déjà partie d'une famille.", not_member:"Cette personne ne fait plus partie de la famille.", too_many_invites:"Trop de liens aujourd'hui : réessaie demain.", other:"Ça n'a pas marché. Réessaie dans un instant."}});
Object.assign(TXT.en,{pwUpTo:n=>"up to "+n+" people", pwGrpSolo:"Solo · 1 person", pwGrpFam:n=>"Family · up to "+n+" people", pwSave:n=>"Save "+n+"% a year", pwSolo:"Solo",
  pwOkPF:n=>"Everything is unlocked. Invite up to "+(n-1)+" people in Settings › Subscription: everyone keeps their own account and progress.",
  pwCmpFree:"Free", pwCmpPrem:"Premium", pwCmpRows:(ty,so,du,all)=>[["Keys","Simple","All"],["Types per topic",String(ty),"All"],["Songs",String(so),all?"All ("+all+")":"All"],["Duels",du+" a day","Unlimited"],["Local quiz","Unlimited","Unlimited"]],
  paySoon:"Payment is coming soon.", paySignIn:"Create your account (or sign in) to subscribe: your Premium follows your account on all your devices.", payErr:"Payment couldn't start. Try again in a moment.",
  payWait:"Payment received: turning on your Premium…", payCancel:"Payment cancelled: nothing was charged.", payRestored:"Purchases restored.", payWebManage:"Your subscription is managed on pianochallenges.com, in Settings › Subscription.", setPremGift:"Gifted Premium",
  famVia:x=>"Premium through "+x+"'s family.", famH:"My family", famSubO:n=>"Up to "+n+" people, each with their own account and progress.", famSubM:x=>"You're part of "+x+"'s family.",
  famOwner:"Owner", famYou:"you", famRm:"Remove", famSure:"Confirm?", famInv:"Invite", famFull:"Family full", famLeft:n=>n+(n!==1?" spots left":" spot left"),
  famInvT:"Invitation link", famInvD:d=>"For one person · valid until "+d, famCopy:"Copy", famShare:"Share", famNew:"New link",
  famShareTx:x=>x+" invites you to their Piano Challenges family: Premium for you too, with your own account.", famLeave:"Leave the family", famLeft0:"You left the family.", famRmOk:"Removed from the family.",
  famOff:x=>x+"'s Family subscription isn't active: shared Premium is paused.",
  famJT:x=>"Join "+x+"'s family", famJGuestT:"You're invited to a family", famJGuest:"Create your account or sign in to join: Premium for you too, with your own progress.",
  famJD:x=>"You keep your own account and progress. Your Premium lasts as long as "+x+"'s subscription is active.", famJSeats:(u,n)=>u+" / "+n+" people", famJGo:"Join", famJLater:"Not now",
  famJOk:x=>"Welcome to "+x+"'s family!", famJOkD:"Everything is unlocked for you too.", famJClose:"Close", famGate:"You're joining a family: create your account or sign in to enjoy it.", famJGuestNP:"Create your account or sign in to join, with your own progress.", famJDNP:"You keep your own account and progress.",
  famE:{not_signed_in:"Sign in first.", no_family:"You need a Family subscription to invite.", not_owner:"Only the subscription owner can do that.", family_full:"This family is full.",
    family_inactive:"This family's subscription isn't active anymore.", invite_invalid:"This invitation link doesn't exist.", invite_expired:"This link has expired: ask for a new one.", invite_used:"This link has already been used: ask for a new one.",
    is_owner:"This is your own family.", already_member:"You're already part of a family.", not_member:"This person is no longer in the family.", too_many_invites:"Too many links today: try again tomorrow.", other:"That didn't work. Try again in a moment."}});

const FAM={st:null, at:0, busy:false, sure:null, off:false, noEnt:false};
// ---- réglages du paiement : clés PUBLIQUES (vides tant qu'Antoine n'a pas créé ses comptes), aussi lues dans app_config.pay ----
const PAY_KEYS={stripePk:"", rcIos:""};                       // pk_test_… / pk_live_… (Stripe) ; appl_… (RevenueCat, iOS)
const PAY_PLANS={month:"solo_month", year:"solo_year", family:"family_year"}; // plan du paywall → produit (Stripe : prix STRIPE_PRICE_* ; Apple : APPLE_IDS)
const APPLE_IDS={month:"pc_solo_month", year:"pc_solo_year", family:"pc_family_year"}; // identifiants produits App Store (docs/PAIEMENT.md)
const PAY_FN=SUPA_URL+"/functions/v1/stripe";
function payCfgApply(rows){ try{ const r=(Array.isArray(rows)?rows:[]).find(x=>x && x.key==="pay"), v=r && r.value; if(!v || typeof v!=="object") return;
  if(typeof v.stripe_pk==="string" && /^pk_(test|live)_[A-Za-z0-9]{10,200}$/.test(v.stripe_pk)) PAY_KEYS.stripePk=v.stripe_pk;
  if(typeof v.rc_ios==="string" && /^appl_[A-Za-z0-9]{10,100}$/.test(v.rc_ios)) PAY_KEYS.rcIos=v.rc_ios; }catch(e){} }
try{ const c=JSON.parse(localStorage.getItem("pc-rc")||"null"); if(c) payCfgApply(c.rows); }catch(e){}
{ const o=rcApply; rcApply=function(rows, boot){ const r=o.apply(this, arguments); payCfgApply(rows); return r; }; }
function payLive(){ return PAY_LIVE===true || RC.flags.payLive===true; }
function payWebReady(){ return /^pk_(test|live)_/.test(PAY_KEYS.stripePk); }
function payAppReady(){ return isApp() && /^appl_/.test(PAY_KEYS.rcIos) && !!(window.Capacitor && window.Capacitor.nativePromise); }
async function payFetch(path, body){ const tok=await trkTok(); if(!tok) throw new Error("not_signed_in");
  const r=await fetch(PAY_FN+path, {method:"POST", headers:{"Content-Type":"application/json", apikey:SUPA_KEY, Authorization:"Bearer "+tok}, body:JSON.stringify(body||{})});
  const j=await r.json().catch(()=>({})); if(!r.ok || !j.url) throw new Error(j.error||"http "+r.status); return j; }
function payNeedAcct(){ if(user) return false; pwClose(); toast(t("paySignIn")); authOpen("signup"); return true; }
async function payStripe(plan){ if(payNeedAcct()) return; try{ const j=await payFetch("/checkout", {plan:PAY_PLANS[plan], lang:S.settings.lang==="en"?"en":"fr"});
    if(/^https:\/\/checkout\.stripe\.com\//.test(j.url)) location.href=j.url; else throw new Error("url"); }catch(e){ if(e && e.message==="already_subscribed"){ pwClose(); payManage(premEnt()); return; } toast(t("payErr")); } }
async function payManage(ent){ if(isApp() && ent && ent.store==="stripe"){ toast(t("payWebManage")); return; } // dans l'app : pas de lien vers un paiement hors App Store
  if(ent && ent.store==="apple"){ window.open("https://apps.apple.com/account/subscriptions","_blank","noopener"); return; }
  try{ const j=await payFetch("/portal", {}); if(/^https:\/\/billing\.stripe\.com\//.test(j.url)) location.href=j.url; else throw new Error("url"); }catch(e){ toast(t("payErr")); } }
// ---- RevenueCat dans l'app (rien ne se passe tant que la clé est vide ; le plugin sera ajouté au projet Xcode avec Antoine) ----
const PAYRC={ok:false, uid:null};
function rcCall(method, opts){ return window.Capacitor.nativePromise("Purchases", method, opts||{}); }
async function rcSetup(){ if(!payAppReady()) throw new Error("off"); if(!PAYRC.ok){ await rcCall("configure", {apiKey:PAY_KEYS.rcIos, appUserID:user?user.id:null}); PAYRC.ok=true; PAYRC.uid=user?user.id:null; }
  if(user && PAYRC.uid!==user.id){ await rcCall("logIn", {appUserID:user.id}); PAYRC.uid=user.id; } } // l'identifiant RevenueCat = l'id Supabase : le webhook sait à qui donner le Premium
async function payApple(plan){ if(payNeedAcct()) return; try{ await rcSetup(); const off=await rcCall("getOfferings"), cur=off && off.current, L=(cur && cur.availablePackages)||[];
    const pk=L.find(p=>p && p.product && p.product.identifier===APPLE_IDS[plan]); if(!pk) throw new Error("package");
    await rcCall("purchasePackage", {aPackage:pk}); payAfter(); }catch(e){ if(e && (e.userCancelled || /cancel/i.test(e.code||e.message||""))) return; toast(t("payErr")); } }
async function restorePurchases(){ try{ await rcSetup(); await rcCall("restorePurchases"); toast(t("payRestored")); payAfter(); }catch(e){ toast(t("pwRestoreNone")); } }
// après un achat : le serveur (webhook) écrit l'abonnement, l'app relit ses droits quelques fois
function payAfter(){ let n=0; const tick=async()=>{ await trkPremium(); if(premEnt() || ++n>=6){ if(premEnt()){ pwOpen("menu"); PW.done=true; pwRender(); setTimeout(()=>confetti(),120); } return; } setTimeout(tick, 2500); }; tick(); }
// retour de Stripe Checkout : /?go=premium&ok=1 (ou &cancel=1) ; ?go=premium seul = Réglages › Abonnement
const PAYQ=(()=>{ try{ const q=new URLSearchParams(location.search), r={ok:q.get("ok")==="1", cancel:q.get("cancel")==="1"}; if(q.has("ok")||q.has("cancel")){ q.delete("ok"); q.delete("cancel"); const s=q.toString(); history.replaceState(null,"",location.pathname+(s?"?"+s:"")+location.hash); } return r; }catch(e){ return {}; } })();
function payReturn(){ if(PAYQ.cancel){ toast(t("payCancel")); pwOpen("menu"); return; }
  if(PAYQ.ok){ toast(t("payWait")); ensureCloud().then(()=>payAfter()).catch(()=>{}); return; }
  openSet("settings"); try{ setTab("prem"); }catch(e){} }
{ const o=ntfDo; ntfDo=function(a){ if(a && a.k==="premium") return payReturn(); return o.apply(this, arguments); }; }

// ---- droits : my_entitlement() → S.prem.ent ----
function premEnt(){ const e=(S.prem||{}).ent; return e && +e.until>Date.now() ? e : null; }
function premPlanName(ent){ if(ent){ if(ent.source==="grant") return t("setPremGift"); if(ent.source==="family") return t("pwFam");
    const k={solo_month:"pwMonth", solo_year:"pwYear", family_year:"pwFam", pc_solo_month:"pwMonth", pc_solo_year:"pwYear", pc_family_year:"pwFam"}[ent.product]; return t(k||(ent.plan==="family"?"pwFam":"pwSolo")); }
  return {month:t("pwMonth"), year:t("pwYear"), family:t("pwFam")}[(S.prem||{}).plan]||""; }
{ const o=premUntil; premUntil=function(){ const e=premEnt(); return Math.max(o(), e?+e.until:0); }; }
{ const o=trkPremium; trkPremium=async function(){ try{ if(!sb || !user) return; if(FAM.noEnt) return o.apply(this, arguments);
    const {data, error}=await sb.rpc("my_entitlement"); if(error){ if(error.code==="PGRST202" || /schema cache|does not exist/i.test(error.message||"")){ FAM.noEnt=true; return o.apply(this, arguments); } return; }
    const d=data && typeof data==="object" ? data : {}, u=d.until ? Date.parse(d.until) : 0, p={...(S.prem||{})};
    const ent=u>Date.now() && d.plan ? {plan:String(d.plan).slice(0,12), status:String(d.status||"").slice(0,12), until:u, source:String(d.source||"").slice(0,8), store:String(d.store||"").slice(0,8),
      product:String(d.product||"").slice(0,40), owner:d.family_owner?gCut(String(d.family_owner).replace(BIDI_G,""),24,24):"", trialEnd:d.trial_end?Date.parse(d.trial_end)||0:0, at:Date.now()} : null;
    const same=JSON.stringify({...(p.ent||{}),at:0})===JSON.stringify(ent?{...ent,at:0}:{at:0});
    if(ent) p.ent=ent; else delete p.ent; delete p.gift; S.prem=p; save(); if(!same) try{ premRefresh(); }catch(e){} }catch(e){} }; }

// ---- Ma famille (Réglages › Abonnement) ----
async function famRpc(name, args){ if(!sb || !user) throw new Error("not_signed_in"); const {data, error}=await sb.rpc(name, args||{});
  if(error){ if(error.code==="PGRST202"){ FAM.off=true; throw new Error("other"); } throw new Error(String(error.message||"other").slice(0,40)); } return data; }
function famErr(e){ const m=(e && e.message)||"other", E=t("famE"); return E[m]||E.other; }
async function famLoad(force){ if(FAM.off || !sb || !user){ FAM.st=null; famRender(); return; } if(!force && Date.now()-FAM.at<30e3) return famRender();
  FAM.at=Date.now(); try{ const d=await famRpc("family_status"); FAM.st=d && d.role ? d : null; }catch(e){ FAM.st=null; } famRender(); }
function famDate(iso){ try{ return new Date(iso).toLocaleDateString(S.settings.lang==="en"?"en-GB":"fr-FR",{day:"numeric",month:"long"}); }catch(e){ return ""; } }
function famRender(){ const sec=$("setPrem"); if(!sec) return; let box=$("famBox"); const d=FAM.st;
  if(!d){ if(box) box.remove(); return; }
  if(!box){ box=document.createElement("div"); box.id="famBox"; box.className="fam-box"; sec.appendChild(box); }
  const own=d.role==="owner", mem=Array.isArray(d.members)?d.members:[], ownerName=(mem.find(m=>m.owner)||{}).name||"?", n=d.seats|0||PREM_OFFER.familySeats;
  box.innerHTML='<div class="fam-h"><b></b><span class="fam-n"></span></div><p class="fam-sub"></p><ul class="fam-list"></ul><div class="fam-foot"></div>';
  box.querySelector(".fam-h b").textContent=t("famH"); box.querySelector(".fam-n").textContent=(d.used|0)+" / "+n;
  const sub=box.querySelector(".fam-sub"); sub.textContent=!d.active?t("famOff")(ownerName):own?t("famSubO")(n):t("famSubM")(ownerName); sub.classList.toggle("warn",!d.active);
  const ul=box.querySelector(".fam-list");
  mem.forEach(m=>{ const li=document.createElement("li"); li.innerHTML='<span class="av"></span><span class="fam-nm"><b></b><small></small></span>'; avFill(li.querySelector(".av"),"",m.avatar|0); nmPut(li.querySelector("b"),m.name||"?");
    li.querySelector("small").textContent=[m.owner?t("famOwner"):"", m.me?t("famYou"):""].filter(Boolean).join(" · ");
    if(own && !m.owner){ const b=document.createElement("button"); b.type="button"; b.className="btn fam-rm"; b.dataset.u=m.user_id; b.textContent=FAM.sure===m.user_id?t("famSure"):t("famRm"); b.classList.toggle("danger",FAM.sure===m.user_id);
      b.onclick=()=>famRemove(m.user_id); li.appendChild(b); }
    ul.appendChild(li); });
  const ft=box.querySelector(".fam-foot");
  if(own){ const left=Math.max(0,n-(d.used|0)), inv=d.invite;
    if(inv && inv.code && left>0){ const url="https://pianochallenges.com/?fam="+inv.code;
      ft.innerHTML='<span class="fam-it"></span><div class="inv-link"><input readonly class="mono" id="famLink" aria-label="Link"><button class="btn" type="button" id="famCopy"></button><button class="btn primary" type="button" id="famShare"></button></div><small class="fam-ex"></small> <button class="gt-link" type="button" id="famNew"></button>';
      ft.querySelector(".fam-it").textContent=t("famInvT"); $("famLink").value=url; $("famCopy").textContent=t("famCopy"); $("famShare").textContent=t("famShare");
      ft.querySelector(".fam-ex").textContent=t("famInvD")(famDate(inv.expires_at))+" · "+t("famLeft")(left); $("famNew").textContent=t("famNew");
      $("famCopy").onclick=()=>copyText(url,$("famCopy")); $("famShare").onclick=()=>shareIt({text:t("famShareTx")(myName()), url}); $("famNew").onclick=famInvite; }
    else { ft.innerHTML='<button class="btn primary" type="button" id="famInv"></button><small class="fam-ex"></small>'; const b=$("famInv"); b.textContent=left?t("famInv"):t("famFull"); b.disabled=!left||!d.active||FAM.busy; b.onclick=famInvite;
      ft.querySelector(".fam-ex").textContent=left?t("famLeft")(left):""; } }
  else { ft.innerHTML='<button class="btn" type="button" id="famLeave"></button>'; const b=$("famLeave"); b.textContent=FAM.sure==="leave"?t("famSure"):t("famLeave"); b.classList.toggle("danger",FAM.sure==="leave"); b.onclick=famLeave; } }
async function famInvite(){ if(FAM.busy) return; FAM.busy=true; try{ const r=await famRpc("family_invite"); if(FAM.st) FAM.st.invite={code:r.code, expires_at:r.expires_at}; FAM.at=0; await famLoad(true); }catch(e){ toast(famErr(e)); } FAM.busy=false; famRender(); }
async function famRemove(uid){ if(FAM.sure!==uid){ FAM.sure=uid; famRender(); clearTimeout(FAM.sureT); FAM.sureT=setTimeout(()=>{ FAM.sure=null; famRender(); },4000); return; }
  FAM.sure=null; try{ await famRpc("family_remove", {p_user:uid}); toast(t("famRmOk")); }catch(e){ toast(famErr(e)); } famLoad(true); }
async function famLeave(){ if(FAM.sure!=="leave"){ FAM.sure="leave"; famRender(); clearTimeout(FAM.sureT); FAM.sureT=setTimeout(()=>{ FAM.sure=null; famRender(); },4000); return; }
  FAM.sure=null; try{ await famRpc("family_leave"); toast(t("famLeft0")); }catch(e){ toast(famErr(e)); } await famLoad(true); trkPremium(); }
{ const o=renderSetPrem; renderSetPrem=function(){ const r=o.apply(this, arguments); famRender(); if(user && sb && Date.now()-FAM.at>30e3) famLoad(); return r; }; }

// ---- rejoindre une famille : ?fam=<CODE> ----
const FAMJ_KEY="pc-fam-join", FAMJ={shown:false, info:null, st:""};
(()=>{ try{ const q=new URLSearchParams(location.search), c=(q.get("fam")||"").toUpperCase(); if(!q.has("fam")) return;
  if(/^[A-HJ-NP-Z2-9]{8}$/.test(c)) localStorage.setItem(FAMJ_KEY, JSON.stringify({c, at:Date.now()}));
  q.delete("fam"); const s=q.toString(); history.replaceState(null,"",location.pathname+(s?"?"+s:"")+location.hash); }catch(e){} })();
function famPending(){ try{ const j=JSON.parse(localStorage.getItem(FAMJ_KEY)||"null"); if(j && /^[A-HJ-NP-Z2-9]{8}$/.test(j.c) && Date.now()-(+j.at||0)<7*864e5) return j.c; }catch(e){} return null; }
function famPendClear(){ try{ localStorage.removeItem(FAMJ_KEY); }catch(e){} }
function famJoinLayer(){ let o=$("famJoin"); if(!o){ o=document.createElement("div"); o.id="famJoin"; o.className="fj"; o.setAttribute("role","dialog"); o.setAttribute("aria-modal","true"); o.hidden=true; document.body.appendChild(o);
    o.addEventListener("click",e=>{ if(e.target===o) famJoinClose(); }); } return o; }
function famJoinClose(clear){ const o=$("famJoin"); if(!o || o.hidden) return; o.hidden=true; document.body.classList.remove("fj-on"); if(clear) famPendClear(); pwInert(); }
async function famJoinOpen(){ const c=famPending(); if(!c) return; const o=famJoinLayer(); FAMJ.shown=true; o.hidden=false; document.body.classList.add("fj-on"); [$("side"),$("shell")].forEach(e=>{ if(e) e.inert=true; });
  if(!user){ FAMJ.st="guest"; famJoinRender(); return; }
  FAMJ.st="load"; famJoinRender();
  try{ await ensureCloud(); const d=await famRpc("family_invite_info", {p_code:c}); FAMJ.info=d||{}; FAMJ.st=d && d.mine ? "ok" : d && d.ok ? "ask" : "err"; if(d && d.mine) famPendClear(); }catch(e){ FAMJ.info={error:e.message}; FAMJ.st="err"; }
  famJoinRender(); }
function famJoinRender(){ const o=$("famJoin"); if(!o || o.hidden) return; const I=FAMJ.info||{}, who=I.owner?gCut(String(I.owner).replace(BIDI_G,""),24,24):"?";
  o.innerHTML='<div class="fj-card"><button class="pw-x" type="button" id="fjX"></button><div class="fj-top"><span class="fj-fam"></span><h2 id="fjH"></h2><p class="fj-p"></p></div><div class="fj-acts"></div></div>';
  o.setAttribute("aria-labelledby","fjH"); $("fjX").textContent="×"; $("fjX").setAttribute("aria-label",t("closeLbl")); $("fjX").onclick=()=>famJoinClose(FAMJ.st!=="guest"&&FAMJ.st!=="ask");
  const h=o.querySelector("h2"), p=o.querySelector(".fj-p"), A=o.querySelector(".fj-acts"), fam=o.querySelector(".fj-fam");
  fam.innerHTML=famDots(PREM_OFFER.familySeats);
  const btn=(id,txt,cls,fn)=>{ const b=document.createElement("button"); b.type="button"; b.id=id; b.className=cls; b.textContent=txt; b.onclick=fn; A.appendChild(b); return b; };
  if(FAMJ.st==="guest"){ h.textContent=t("famJGuestT"); p.textContent=t(payLive()?"famJGuest":"famJGuestNP"); // paiement coupé : aucune promesse de Premium
    btn("fjUp",t("authUp"),"gt-go",()=>{ famJoinClose(); authOpen("signup"); }); btn("fjIn",t("authIn"),"btn",()=>{ famJoinClose(); authOpen("login"); }); btn("fjLater",t("famJLater"),"gt-link",()=>famJoinClose(true)); }
  else if(FAMJ.st==="load"){ h.textContent="…"; p.textContent=t("rankLoading"); }
  else if(FAMJ.st==="ask"){ h.textContent=t("famJT")(who); p.textContent=payLive()?t("famJD")(who):t("famJDNP");
    const s=document.createElement("p"); s.className="fj-seats"; s.textContent=t("famJSeats")(I.used|0, I.seats|0||PREM_OFFER.familySeats); p.after(s);
    btn("fjGo",t("famJGo"),"gt-go",famJoinGo); btn("fjLater",t("famJLater"),"gt-link",()=>famJoinClose(true)); }
  else if(FAMJ.st==="ok"){ h.textContent=t("famJOk")(who); p.textContent=t("famJOkD"); btn("fjOk",t("pwOkGo"),"gt-go",()=>famJoinClose(true)); }
  else { h.textContent=t("famJGuestT"); p.textContent=famErr({message:I.error}); p.classList.add("err"); btn("fjOk",t("famJClose"),"gt-go",()=>famJoinClose(true)); }
  setTimeout(()=>{ const f=o.querySelector(".fj-acts button"); if(f) f.focus({preventScroll:true}); },20); }
async function famJoinGo(){ const c=famPending(); if(!c) return; const b=$("fjGo"); if(b) b.disabled=true;
  try{ const r=await famRpc("family_join", {p_code:c}); FAMJ.info={...FAMJ.info, owner:r.owner||FAMJ.info.owner}; FAMJ.st="ok"; famPendClear(); await trkPremium(); famLoad(true); setTimeout(()=>{ try{ confetti(); }catch(e){} },150); }
  catch(e){ FAMJ.info={...FAMJ.info, error:e.message}; FAMJ.st="err"; }
  famJoinRender(); }
document.addEventListener("keydown",e=>{ if(!document.body.classList.contains("fj-on")) return; if(e.key==="Escape"){ e.preventDefault(); famJoinClose(FAMJ.st!=="guest"&&FAMJ.st!=="ask"); } e.stopImmediatePropagation(); },true);
// premier lancement avec un lien de famille : l'écran de compte d'abord (pas le « Joue ta première note »)
{ const o=fnOpen; fnOpen=function(){ if(famPending() && !hasSession()){ authOpen("signup"); return; } return o.apply(this, arguments); }; }
{ const o=gateRender; gateRender=function(){ const r=o.apply(this, arguments); try{ const g=$("gate"); if(famPending() && payLive() && g && !g.querySelector(".gt-fam")){ const at=g.querySelector("#gtEmailGo")||g.querySelector("#gtForm");
    if(at){ const pp=document.createElement("p"); pp.className="gt-ref gt-fam"; pp.innerHTML=pwI("gift")+"<span></span>"; pp.lastChild.textContent=t("famGate"); at.before(pp); } } }catch(e){} return r; }; }
// après connexion : la famille, les droits, et l'invitation en attente
{ const o=setUser; setUser=async function(u){ const was=user; const r=await o.apply(this, arguments);
  try{ if(!u){ FAM.st=null; FAM.at=0; famRender(); } else if(!was || was.id!==u.id){ FAM.at=0; if(page==="settings") famLoad(true); if(famPending()) setTimeout(famBoot, 600); } }catch(e){} return r; }; }
function famBoot(){ if(!famPending() || FAMJ.shown && !user) return; const g=$("gate");
  if(startUI() || (g && !g.hidden) || document.body.classList.contains("pw-on") || anyWin()){ setTimeout(famBoot, 1500); return; } // une seule fenêtre à la fois : on attend que l'autre se ferme
  if(!user && hasSession() && !cloudFail){ ensureCloud(); setTimeout(famBoot, 1500); return; } // la session se charge : on attend setUser
  famJoinOpen(); }
setTimeout(famBoot, isApp()?2000:900);
// #famJoin compte comme une fenêtre : les autres (bilan de la semaine, objectif…) attendent qu'elle se ferme, et les notes ne vont pas derrière
{ const o=anyWin; anyWin=function(){ return o.apply(this,arguments) || document.body.classList.contains("fj-on"); }; }
/* ==== fin Famille et paiement ==== */

