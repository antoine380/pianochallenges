// fragment de l'IIFE principale — ordre 450, voir src/app/README.md
// ---------- Start: sign-in screen, onboarding (5 questions that set the app up), guided tour ----------
// Shown once: S.gate = "guest" | "account" once passed; S.onb = {done, why, level, how, cont}; S.tourDone. Each step can be skipped.
const GATE={mode:"signup", busy:false, msg:"", err:false, otp:false, sent:false, email:"", confirm:false};
function gateNeeded(){ return !S.gate && !hasSession() && !/^#(quiz|duel)-/.test(location.hash||"") && !UNSUB; }
function gateArt(){ // the right half: night scene with the 3D objects, level characters and the piano character
  const av=i=>'<span class="gt-av" style="--i:'+i+'">'+avatarSVG(i)+'</span>';
  return '<div class="gt-art" aria-hidden="true"><div class="gt-glow"></div>'
    +'<span class="gt-o o1">'+OBJ.chords()+'</span><span class="gt-o o2">'+OBJ.speed()+'</span><span class="gt-o o3">'+OBJ.memory()+'</span><span class="gt-o o4">'+OBJ.scales()+'</span><span class="gt-o o5">'+OBJ.medal()+'</span>'
    +'<div class="gt-avs">'+[0,2,4,6,8,9].map(av).join("")+'</div>'
    +'<div class="gt-big"><b>'+esc(t("gtBig"))+'</b><span>'+esc(t("gtBigSub"))+'</span></div>'
    +'<span class="gt-hero">'+OBJ.runner()+'</span>'
    +'<ul class="gt-pts">'+t("gtPoints").map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul></div>'; }
// the start screens cover the app: it does not take the keyboard, MIDI or the Tab key while they are open
const startUI = () => document.body.classList.contains("gate-on") || document.body.classList.contains("pw-on") || !!($("tour") && !$("tour").hidden);
function startInert(){ const on=document.body.classList.contains("gate-on"); [$("side"),$("shell")].forEach(e=>{ if(e) e.inert=on; }); }
const SITE_URL = () => isApp() || !/^https?:/.test(location.protocol) ? "https://pianochallenges.com/" : location.origin+location.pathname;
// keys typed on the start screens stay there (fields keep working: only the app's shortcuts are stopped)
document.addEventListener("keydown",e=>{ if(document.body.classList.contains("gate-on")) e.stopImmediatePropagation(); },true);
function gateOpen(){ let g=$("gate"); if(!g){ g=document.createElement("div"); g.id="gate"; g.className="gate"; g.setAttribute("role","dialog"); g.setAttribute("aria-modal","true"); document.body.appendChild(g); }
  GATE.step="choose"; document.body.classList.add("gate-on"); startInert(); g.hidden=false; gateRender(); gateConnect();
  if(matchMedia("(pointer:fine)").matches) setTimeout(()=>($("gtName")||$("gtEmail"))?.focus(),50); }
// the buttons wait for the sign-in service; offline: a message and "try again"
function gateConnect(){ ensureCloud().then(()=>{ if(!$("gate")||$("gate").hidden) return; if(cloudFail){ GATE.msg=t("cloudErr"); GATE.err=true; GATE.retry=true; }
    else { GATE.retry=false; if(GATE.msg===t("cloudErr")) GATE.msg=""; } gateRender(); }).catch(()=>{}); }
function gateClose(){ const g=$("gate"); if(g) g.hidden=true; document.body.classList.remove("gate-on"); startInert(); }
function gateKeep(){ ["Email","Name"].forEach(k=>{ const e=$("gt"+k); if(e) GATE[k==="Email"?"email":"name"]=e.value.trim(); }); } // keep what was typed through a re-render
// the sign-in screen, chess.com-like: a big title, one illustration, « Continue with email » first, then Google / Apple / Facebook,
// a link to switch Sign up ↔ Log in and a discreet « Continue without an account ». The e-mail step is the form below (password or code).
const GT_ICO={google:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2-1.9 3.2-4.7 3.2-8z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.1a11 11 0 0 0 0 9.9z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.2 1.6l3.1-3.1A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z"/></svg>',
  apple:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.4 12.6c0-2.4 2-3.6 2.1-3.7a4.6 4.6 0 0 0-3.6-2c-1.5-.2-3 .9-3.7.9-.8 0-2-.9-3.2-.8a4.8 4.8 0 0 0-4 2.5c-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8s1.9.8 3.2.8 2.1-1.2 2.9-2.4a10 10 0 0 0 1.3-2.7 4.2 4.2 0 0 1-2.3-4zM14 5.4a4.3 4.3 0 0 0 1-3.1 4.4 4.4 0 0 0-2.9 1.5 4.1 4.1 0 0 0-1 3c1.1.1 2.2-.6 2.9-1.4z"/></svg>',
  facebook:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M14 8.5V7c0-.7.2-1.2 1.3-1.2H17V2.6c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v1.7H7.5V12h2.8v9.5H14V12h2.8l.4-3.5z"/></svg>',
  mail:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13" rx="3"/><path d="M4 7.5l8 6 8-6"/></svg>'};
function gateChoose(){ const g=$("gate"), m=GATE.mode, mark=$("homeLink").querySelector("svg").outerHTML;
  g.innerHTML='<div class="gt-card gt-choose"><div class="gt-form"><div class="gt-top"><span class="gt-logo">'+mark+'<b>Piano Challenges</b></span><button class="gt-lang" type="button" id="gtLang">'+(S.settings.lang==="fr"?"EN":"FR")+'</button></div>'
    +'<h2 class="gt-h"></h2><div class="gt-ill" aria-hidden="true"><i class="gt-ill-glow"></i><span class="gt-ill-o">'+OBJ.runner()+'</span><span class="gt-ill-n">'+OBJ.staff()+'</span></div>'
    +(S.refBy && S.refBy!==S.netId ? '<p class="gt-ref">'+pwI("gift")+'<span>'+esc(t(paywallOn()?"invRef":"invRefF"))+'</span></p>' : '')
    +'<button type="button" class="gt-go gt-mailgo" id="gtEmailGo">'+GT_ICO.mail+'<span></span></button><p class="gt-msg" id="gtMsg" role="status"></p>'
    +'<div class="gt-or"><span></span></div><div class="gt-soc gt-soc1"><button type="button" class="gt-s gt-google" data-p="google"></button><button type="button" class="gt-s gt-apple" data-p="apple"></button><button type="button" class="gt-s gt-fb" data-p="facebook"></button></div>'
    +'<p class="gt-switch"><span></span> <button type="button" class="gt-link" id="gtSwitch"></button></p>'
    +'<button class="gt-link gt-noacct" type="button" id="gateGuest"></button></div>'+gateArt()+'</div>';
  g.querySelector(".gt-h").textContent=t(m==="signup"?"gtTitleNew":"gtTitleBack");
  $("gtEmailGo").lastChild.textContent=t("gtEmailGo"); $("gtEmailGo").disabled=GATE.busy||!sb;
  $("gtEmailGo").onclick=()=>{ Object.assign(GATE,{step:"email",msg:"",err:false}); gateRender(); if(matchMedia("(pointer:fine)").matches) setTimeout(()=>($("gtName")||$("gtEmail"))?.focus(),30); };
  const msg=$("gtMsg"); msg.textContent=GATE.msg||(!sb&&!cloudFail?t("rankLoading"):""); msg.className="gt-msg"+(GATE.err?" err":"");
  if(GATE.retry){ const r=document.createElement("button"); r.type="button"; r.className="gt-link"; r.textContent=t("gtRetry"); r.onclick=()=>{ cloudPromise=null; cloudFail=false; GATE.msg=""; GATE.err=false; GATE.retry=false; gateRender(); gateConnect(); }; msg.after(r); }
  g.querySelector(".gt-or span").textContent=t("orLbl");
  g.querySelectorAll(".gt-s").forEach(b=>{ const pv=b.dataset.p; b.innerHTML=GT_ICO[pv]+"<span></span>"; b.querySelector("span").textContent=t("gtWith")({google:"Google",apple:"Apple",facebook:"Facebook"}[pv]); b.disabled=GATE.busy||!sb; b.onclick=()=>gateOAuth(pv); });
  g.querySelector(".gt-switch span").textContent=t(m==="signup"?"gtHave":"gtNone"); $("gtSwitch").textContent=t(m==="signup"?"authIn":"authUp");
  $("gtSwitch").onclick=()=>{ Object.assign(GATE,{mode:m==="signup"?"login":"signup",msg:"",err:false}); gateRender(); };
  $("gateGuest").textContent=t("gtNoAcct"); $("gateGuest").onclick=gateGuest;
  $("gtLang").onclick=()=>{ document.querySelector('#langSeg [data-v="'+(S.settings.lang==="fr"?"en":"fr")+'"]').click(); gateRender(); }; }
function gateRender(){ if(GATE.step!=="email"){ gateChoose(); return; } gateKeep(); const g=$("gate"), m=GATE.mode, mark=$("homeLink").querySelector("svg").outerHTML;
  g.innerHTML='<div class="gt-card gt-mail"><div class="gt-form"><div class="gt-top"><button class="gt-back" type="button" id="gtBack"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg><span></span></button><button class="gt-lang" type="button" id="gtLang">'+(S.settings.lang==="fr"?"EN":"FR")+'</button></div>'
    +'<h2 class="gt-h"></h2><div class="seg gt-tabs"><button type="button" data-m="signup"></button><button type="button" data-m="login"></button></div>'
    +(S.refBy && S.refBy!==S.netId ? '<p class="gt-ref">'+pwI("gift")+'<span>'+esc(t(paywallOn()?"invRef":"invRefF"))+'</span></p>' : '')
    +'<form class="gt-f" id="gtForm" novalidate></form><p class="gt-msg" id="gtMsg" role="status"></p>'
    +'<div class="gt-or"><span></span></div><div class="gt-soc"><button type="button" class="gt-s gt-google" data-p="google"></button><button type="button" class="gt-s gt-apple" data-p="apple"></button><button type="button" class="gt-s gt-fb" data-p="facebook"></button></div>'
    +'<button class="gt-guest" type="button" id="gateGuest"></button></div>'+gateArt()+'</div>';
  g.querySelector(".gt-h").textContent=t(m==="signup"?"gtTitleUp":"gtTitleIn");
  $("gtBack").lastChild.textContent=t("gtOther"); $("gtBack").onclick=()=>{ gateKeep(); Object.assign(GATE,{step:"choose",msg:"",err:false,otp:false,sent:false,confirm:false}); gateRender(); };
  const [tu,ti]=g.querySelectorAll(".gt-tabs button"); tu.textContent=t("gtSignup"); ti.textContent=t("gtLogin"); tu.setAttribute("aria-pressed",m==="signup"); ti.setAttribute("aria-pressed",m==="login");
  g.querySelectorAll(".gt-tabs button").forEach(b=>b.onclick=()=>{ Object.assign(GATE,{mode:b.dataset.m,msg:"",err:false,otp:false,sent:false,confirm:false}); gateRender(); });
  g.querySelector(".gt-or span").textContent=t("orLbl");
  const ico={google:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2-1.9 3.2-4.7 3.2-8z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.1a11 11 0 0 0 0 9.9z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.2 1.6l3.1-3.1A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z"/></svg>',
    apple:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.4 12.6c0-2.4 2-3.6 2.1-3.7a4.6 4.6 0 0 0-3.6-2c-1.5-.2-3 .9-3.7.9-.8 0-2-.9-3.2-.8a4.8 4.8 0 0 0-4 2.5c-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8s1.9.8 3.2.8 2.1-1.2 2.9-2.4a10 10 0 0 0 1.3-2.7 4.2 4.2 0 0 1-2.3-4zM14 5.4a4.3 4.3 0 0 0 1-3.1 4.4 4.4 0 0 0-2.9 1.5 4.1 4.1 0 0 0-1 3c1.1.1 2.2-.6 2.9-1.4z"/></svg>',
    facebook:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M14 8.5V7c0-.7.2-1.2 1.3-1.2H17V2.6c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v1.7H7.5V12h2.8v9.5H14V12h2.8l.4-3.5z"/></svg>'};
  g.querySelectorAll(".gt-s").forEach(b=>{ const pv=b.dataset.p; b.innerHTML=ico[pv]+"<span></span>"; b.querySelector("span").textContent= pv==="google" ? t("gtWith")("Google") : {apple:"Apple",facebook:"Facebook"}[pv]; b.disabled=GATE.busy||!sb; b.onclick=()=>gateOAuth(pv); });
  const gg=$("gateGuest"); gg.innerHTML="<span></span><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M5 12h14M13 6l6 6-6 6'/></svg>"; gg.firstChild.textContent=t("gtGuest"); gg.onclick=gateGuest;
  $("gtLang").onclick=()=>{ document.querySelector('#langSeg [data-v="'+(S.settings.lang==="fr"?"en":"fr")+'"]').click(); gateRender(); };
  gateForm(); }
function gateField(f, type, ph, val, ac, id){ const i=document.createElement("input"); i.type=type; i.placeholder=ph; i.value=val||""; i.autocomplete=ac; i.className="gt-in"; if(id) i.id=id; f.appendChild(i); return i; }
function gateForm(){ const f=$("gtForm"); f.innerHTML=""; const m=GATE.mode;
  const msg=$("gtMsg"); msg.textContent=GATE.msg||""; msg.className="gt-msg"+(GATE.err?" err":GATE.msg?" ok":"");
  if(!sb && !cloudFail){ const p=document.createElement("p"); p.className="gt-wait"; p.textContent=t("rankLoading"); f.appendChild(p); }
  if(GATE.retry){ const r=document.createElement("button"); r.type="button"; r.className="gt-link"; r.textContent=t("gtRetry"); r.onclick=()=>{ cloudPromise=null; cloudFail=false; GATE.msg=""; GATE.err=false; GATE.retry=false; gateRender(); gateConnect(); }; f.appendChild(r); }
  if(GATE.otp || GATE.confirm){ // code received by e-mail (sign-in without password, or the confirmation of a new account)
    const p=document.createElement("p"); p.className="gt-note"; p.textContent = GATE.sent ? t("codeSent")(GATE.email) : t("gtOtpIntro"); f.appendChild(p);
    const em=GATE.sent?null:gateField(f,"email",t("emailPh"),GATE.email,"email","gtEmail");
    const cd=GATE.sent?gateField(f,"text",t("codePh"),"","one-time-code","gtCode"):null; if(cd){ cd.inputMode="numeric"; cd.maxLength=10; }
    const b=document.createElement("button"); b.type="submit"; b.className="gt-go"; b.textContent=GATE.sent?t("verify"):t("sendCode"); b.disabled=GATE.busy||!sb; f.appendChild(b);
    const back=document.createElement("button"); back.type="button"; back.className="gt-link"; back.textContent=t("gtBackPwd"); back.onclick=()=>{ Object.assign(GATE,{otp:false,sent:false,confirm:false,msg:"",err:false}); gateRender(); }; f.appendChild(back);
    f.onsubmit=async e=>{ e.preventDefault(); if(!sb) return; GATE.busy=true; gateForm(); try{
      if(!GATE.sent){ GATE.email=em.value.trim(); const {error}=await sb.auth.signInWithOtp({email:GATE.email, options:{shouldCreateUser:true, emailRedirectTo: isApp()?undefined:location.origin+location.pathname}});
        GATE.busy=false; if(error){ GATE.msg=authMsg(error); GATE.err=true; } else { GATE.sent=true; GATE.msg=""; GATE.err=false; } gateRender(); return; }
      const token=cd.value.replace(/\D/g,""); const {error}=await sb.auth.verifyOtp({email:GATE.email, token, type:GATE.confirm?"signup":"email"});
      GATE.busy=false; if(error){ GATE.msg=authMsg(error); GATE.err=true; gateRender(); }
      }catch(err){ GATE.busy=false; GATE.msg=authMsg(err); GATE.err=true; gateRender(); } }; // success: setUser() closes the gate
    return; }
  const name = m==="signup" ? gateField(f,"text",t("gtName"),GATE.name,"nickname","gtName") : null; if(name){ name.maxLength=24; name.setAttribute("autocorrect","off"); name.spellcheck=false; name.enterKeyHint="next"; }
  const em=gateField(f,"email",t("emailPh"),GATE.email,"email","gtEmail");
  const pw=gateField(f,"password",t("gtPwd"),"",m==="signup"?"new-password":"current-password","gtPwd");
  const eye=document.createElement("button"); eye.type="button"; eye.className="gt-eye"; eye.setAttribute("aria-label",t("gtShowPwd")); eye.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  eye.onclick=()=>{ pw.type=pw.type==="password"?"text":"password"; }; const wrap=document.createElement("div"); wrap.className="gt-pw"; pw.replaceWith(wrap); wrap.append(pw,eye);
  let ok=null; if(m==="signup"){ const l=document.createElement("label"); l.className="gt-ok"; l.innerHTML='<span class="sw"><input type="checkbox" id="gtOk"><i></i></span><span></span>';
    l.lastChild.innerHTML=esc(t("gtAccept"))+' <a href="/confidentialite.html" target="_blank" rel="noopener"></a>'; l.querySelector("a").textContent=t("gtPrivacy"); f.appendChild(l); ok=l.querySelector("input"); }
  const b=document.createElement("button"); b.type="submit"; b.className="gt-go"; b.id="gtGo"; b.textContent=t(m==="signup"?"gtCreate":"gtSignIn"); b.disabled=GATE.busy||!sb; f.appendChild(b);
  const alt=document.createElement("button"); alt.type="button"; alt.className="gt-link"; alt.textContent=t("gtUseCode"); alt.onclick=()=>{ GATE.email=em.value.trim(); Object.assign(GATE,{otp:true,sent:false,msg:"",err:false}); gateRender(); }; f.appendChild(alt);
  f.onsubmit=async e=>{ e.preventDefault(); if(!sb) return; GATE.email=em.value.trim(); if(name) GATE.name=name.value.trim();
    const bad = !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(GATE.email) ? "gtBadMail" : pw.value.length<8 ? "gtBadPwd" : m==="signup"&&GATE.name&&nameErr(GATE.name) ? nameErr(GATE.name) : m==="signup"&&!ok.checked ? "gtNeedOk" : "";
    if(bad){ GATE.msg=t(bad); GATE.err=true; const g=$("gtMsg"); g.textContent=GATE.msg; g.className="gt-msg err"; return; } // the form stays as typed (password, consent)
    GATE.busy=true; GATE.msg=""; gateForm();
    try{ if(m==="signup"){
        const {data,error}=await sb.auth.signUp({email:GATE.email, password:pw.value, options:{data:{name:GATE.name||undefined}, emailRedirectTo: isApp()?undefined:location.origin+location.pathname}}); if(error) throw error;
        if(data.user && Array.isArray(data.user.identities) && !data.user.identities.length) throw new Error("already registered"); // Supabase does not say it otherwise
        if(GATE.name){ S.profileName=gCut(GATE.name,24,24); save(); }
        if(!data.session){ Object.assign(GATE,{confirm:true,sent:true,busy:false,msg:t("gtConfirm")(GATE.email),err:false}); gateRender(); return; } }
      else { const {error}=await sb.auth.signInWithPassword({email:GATE.email, password:pw.value}); if(error) throw error; }
      GATE.busy=false; // setUser() closes the gate
    }catch(err){ GATE.busy=false; const s=String(err&&err.message||""); GATE.msg = /invalid login|credentials/i.test(s) ? t("gtBadLogin") : /already registered|already exists/i.test(s) ? t("gtExists") : /not confirmed/i.test(s) ? t("gtNotConfirmed") : authMsg(err); GATE.err=true; gateRender(); } }; }
async function gateOAuth(pv){ if(!sb) return; GATE.msg=""; gateKeep();
  if(pv!=="google"){ let on=false; try{ const r=await fetch(SUPA_URL+"/auth/v1/settings",{headers:{apikey:SUPA_KEY}}); const j=await r.json(); on=!!(j&&j.external&&j.external[pv]); }catch(e){}
    if(!on){ GATE.msg=t("gtSoonProv"); GATE.err=true; gateRender(); return; } }
  try{ await oauthLogin(pv); }catch(e){}
  if(loginStep.err && loginStep.msg){ GATE.msg = /not enabled|unsupported provider|provider/i.test(loginStep.msg) ? t("gtSoonProv") : loginStep.msg; GATE.err=true; loginStep.msg=""; loginStep.err=false; gateRender(); } }
function gateGuest(){ S.gate="guest"; save(); gateClose(); startFlow(); }
// guests: « Sign up » / « Log in » in the top bar, at the top of the page (tablets, computers) and in the side menu open the sign-in screen
function authOpen(mode){ closeDrawer(); Object.assign(GATE,{mode:mode==="login"?"login":"signup",msg:"",err:false,otp:false,sent:false,confirm:false}); gateOpen(); }
document.querySelectorAll("[data-auth]").forEach(b=>b.addEventListener("click",()=>authOpen(b.dataset.auth)));
// after the gate: the onboarding questions, then the tour
let deepLink=/^#(quiz|duel)-/.test(location.hash||"") || !!UNSUB;
function startFlow(){ if(deepLink) return; if(!(S.onb&&S.onb.done)) onbOpen(); else if(!S.tourDone) tourStart(); else maybeAskInput(); }

