// fragment de l'IIFE principale — ordre 889d, voir src/app/README.md
/* ==== Compte : connexion, confirmation, déconnexion, changer de compte (08/11/2026) ====
// Après une connexion voulue (Google, e-mail, code) : fenêtre #authOk « Bienvenue, Prénom ! » (compte créé / connecté), photo, e-mail,
// « Ce n'est pas toi ? Changer de compte ». Profil : « Se déconnecter » demande confirmation (#authOut) ; « Changer de compte » = déconnexion
// puis écran de connexion (Google propose le choix du compte : prompt=select_account). Menu : #accountBtn montre la photo du compte. */
Object.assign(TXT.fr,{auNew:"Ton compte est créé", auBack:"Te revoilà !", auHi:n=>"Bienvenue, "+n+" !", auSync:"Ta progression est enregistrée dans ton compte et suit tous tes appareils.", auGo:"C'est parti", auNotMe:"Ce n'est pas toi ? Changer de compte",
  auOutT:"Se déconnecter ?", auOutS:"Ta progression reste dans ton compte : tu la retrouves en te reconnectant, sur n'importe quel appareil.", auOutGo:"Se déconnecter", auCancel:"Annuler", auSwitch:"Changer de compte", auOutDone:"Tu es déconnecté", auVia:{google:"avec Google",apple:"avec Apple",facebook:"avec Facebook",email:"avec ton e-mail"}});
Object.assign(TXT.en,{auNew:"Your account is ready", auBack:"Welcome back!", auHi:n=>"Welcome, "+n+"!", auSync:"Your progress is saved in your account and follows you on every device.", auGo:"Let's go", auNotMe:"Not you? Switch account",
  auOutT:"Sign out?", auOutS:"Your progress stays in your account: sign back in on any device to get it.", auOutGo:"Sign out", auCancel:"Cancel", auSwitch:"Switch account", auOutDone:"You're signed out", auVia:{google:"with Google",apple:"with Apple",facebook:"with Facebook",email:"with your email"}});
const AUT={want:0, shown:""};
function auModal(id, inner){ let m=$(id); if(m) return m; m=document.createElement("div"); m.className="modal"; m.id=id; m.hidden=true; m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-labelledby",id+"T");
  m.innerHTML='<div class="modal-bg" data-close="'+id+'"></div><div class="modal-card small au-card">'+inner+'</div>'; document.body.appendChild(m); return m; }
auModal("authOk",'<button class="modal-close au-x" type="button" data-close="authOk" aria-label="Close">×</button><div class="au-hero"><span class="av au-av"></span><span class="au-ok" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span></div><p class="au-kick" id="auKick"></p><h2 id="authOkT"></h2><p class="au-mail" id="auMail"></p><p class="au-s" id="auSyncS"></p><button class="btn primary au-go" id="auGo" type="button"></button><button class="mw-link au-not" id="auNot" type="button"></button>');
auModal("authOut",'<h2 id="authOutT"></h2><p class="au-s" id="auOutS"></p><div class="au-acts"><button class="btn" id="auCancel" type="button"></button><button class="btn primary au-danger" id="auOutGo" type="button"></button></div>');
const auName = () => { const m=(user&&user.user_metadata)||{}; return (m.full_name||m.name||"").split(" ")[0] || myName(); };
const auProv = () => { const p=user && user.app_metadata && user.app_metadata.provider; return t("auVia")[p] ? p : "email"; };
function auWelcome(){ if(!user || AUT.shown===user.id) return; AUT.shown=user.id; const fresh = user.created_at && Date.now()-Date.parse(user.created_at) < 15*60e3;
  const m=$("authOk"), av=m.querySelector(".au-av"); try{ avFill(av, userPhoto(), charIndex(levelInfo(S.xp).L)); }catch(e){}
  $("auKick").textContent = fresh ? t("auNew") : t("auBack"); $("authOkT").textContent = t("auHi")(auName());
  $("auMail").textContent = (user.email||"")+(user.email?" · ":"")+t("auVia")[auProv()]; $("auSyncS").textContent=t("auSync");
  $("auGo").textContent=t("auGo"); $("auGo").onclick=()=>closeMod("authOk"); $("auNot").textContent=t("auNotMe"); $("auNot").onclick=()=>{ closeMod("authOk"); auSwitch(); };
  const go=()=>{ if(anyWin() || (typeof actNow==="function" && actNow())){ setTimeout(go, 800); return; } openMod("authOk"); setTimeout(()=>{ try{ $("auGo").focus(); }catch(e){} }, 60); }; go(); }
// une connexion « voulue » : écran de connexion ouvert, Google lancé, ou retour de Google sur le site (?code=)
{ const o=authOpen; authOpen=function(){ AUT.want=Date.now(); return o.apply(this,arguments); }; }
{ const o=gateOpen; gateOpen=function(){ AUT.want=Date.now(); return o.apply(this,arguments); }; }
try{ const w=+sessionStorage.getItem("pc-auth-want")||0; if(w && Date.now()-w<15*60e3) AUT.want=w; sessionStorage.removeItem("pc-auth-want"); }catch(e){}
{ const o=setUser; setUser=async function(u){ const before=user, r=await o.apply(this,arguments);
    try{ if(u && (!before || before.id!==u.id) && AUT.want && Date.now()-AUT.want < 15*60e3){ AUT.want=0; auWelcome(); } auMenu(); }catch(e){ console.warn(e); } return r; }; }
// déconnexion : avec confirmation ; changer de compte
async function auSignOut(){ try{ if(sb) await sb.auth.signOut(); }catch(e){} try{ await setUser(null); }catch(e){} AUT.shown=""; auMenu(); }
function auOutOpen(){ $("authOutT").textContent=t("auOutT"); $("auOutS").textContent=t("auOutS"); $("auCancel").textContent=t("auCancel"); $("auOutGo").textContent=t("auOutGo");
  $("auCancel").onclick=()=>closeMod("authOut"); $("auOutGo").onclick=async()=>{ closeMod("authOut"); await auSignOut(); openPage("hub"); toast(t("auOutDone")); }; openMod("authOut"); setTimeout(()=>{ try{ $("auCancel").focus(); }catch(e){} },60); }
async function auSwitch(){ await auSignOut(); authOpen("login"); }
{ const o=renderAccount; renderAccount=function(){ const r=o.apply(this,arguments); try{ if(!user) return r; const L=$("acctLogin"); const lo=[...L.querySelectorAll("button")].find(b=>b.textContent===t("logout")); if(!lo) return r;
    lo.onclick=auOutOpen; lo.classList.add("au-lo"); const row=document.createElement("div"); row.className="au-row"; lo.before(row); const sw=document.createElement("button"); sw.type="button"; sw.className="btn"; sw.id="auSwitchB"; sw.textContent=t("auSwitch"); sw.onclick=auSwitch; row.append(sw, lo); }catch(e){ console.warn(e); } return r; }; }
// menu : la photo du compte sur « Profil »
function auMenu(){ const b=$("accountBtn"); if(!b) return; let im=b.querySelector(".au-mav"); const ph=user?userPhoto():"";
  if(ph){ if(!im){ im=document.createElement("img"); im.className="au-mav"; im.alt=""; im.referrerPolicy="no-referrer"; b.prepend(im); } if(im.src!==ph) im.src=ph; b.classList.add("has-photo"); im.onerror=()=>{ im.remove(); b.classList.remove("has-photo"); }; }
  else { if(im) im.remove(); b.classList.remove("has-photo"); } }
auMenu();
/* ==== fin Compte ==== */
