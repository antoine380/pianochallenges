// fragment de l'IIFE principale — ordre 630, voir src/app/README.md
/* ==== Ligues (C11) : groupes de 20 par division, vue Ligue du Classement, carte de l'accueil ==== */
// Serveur : supabase/migrations/2026-10-24_leagues.sql, fonction my_league() (une ligne par membre du groupe de l'appelant :
// week, tier 0..5, pos, name, avatar, photo, level, xp de la semaine, me, ends_at, closed). Pas encore installée : LG.off = true
// et l'app garde l'ancien classement de la semaine, sans erreur. Rien dans S (le choix de la vue reste S.settings.rankPer = "league").
const LG={rows:null, at:0, uid:null, off:false, busy:null, ok:false};
const LG_COL=["#c27a45","#a9b4c8","#e0ad2c","#2f6fd6","#d0394f","#4cc3dc"];
const lgTier = i => Math.max(0,Math.min(5,i|0));
const lgTN = i => t("lgTiers")[lgTier(i)];
const lgMissing = e => !!e && (e.code==="PGRST202" || e.code==="42883" || /could not find the function|does not exist/i.test(String(e.message||"")));
async function lgLoad(force){
  if(!sb || LG.off) return null;
  const uid=user?user.id:"";
  if(LG.uid!==uid){ LG.rows=null; LG.at=0; LG.uid=uid; }
  if(!force && LG.at && Date.now()-LG.at<60000) return LG.rows;
  if(LG.busy) return LG.busy;
  LG.busy=(async()=>{
    try{
      const {data,error}=await Promise.race([sb.rpc("my_league"), new Promise(r=>setTimeout(()=>r({data:null,error:{message:"timeout"}}),8000))]);
      if(error){ if(lgMissing(error)) LG.off=true; return null; }
      LG.ok=true;
      const rows=(Array.isArray(data)?data:[]).filter(r=>r && Number.isFinite(+r.pos) && +r.pos>0).map(r=>({pos:+r.pos|0, tier:lgTier(r.tier), name:r.name, avatar:r.avatar|0,
        photo:typeof r.photo==="string"&&/^https:\/\//.test(r.photo)?r.photo:"", level:r.level|0, xp:Math.max(0,+r.xp||0), me:r.me===true, end:Date.parse(r.ends_at)||0, closed:r.closed===true}))
        .sort((a,b)=>a.pos-b.pos).slice(0,40);
      if(uid!==(user?user.id:"")) return null;
      LG.rows=rows.length?rows:[]; LG.at=Date.now(); return LG.rows;
    }catch(e){ return null; } finally{ LG.busy=null; } })();
  return LG.busy; }
function lgInfo(rows){ const r0=rows[0], me=rows.find(r=>r.me)||null; return {n:rows.length, me, tier:r0.tier, end:r0.end, closed:r0.closed||(r0.end&&Date.now()>=r0.end), pos:me?me.pos:0}; }
// zones: the same rule as league_close() (top 5 up, except in Diamond; bottom 3 down, outside the top 5, except in Bronze)
function lgZone(pos,n,tier){ if(tier<5 && pos<=5) return "up"; if(tier>0 && pos>Math.max(5,n-3)) return "down"; return ""; }
function lgLeft(end){ const ms=end-Date.now(); if(!end) return ""; if(ms<=0) return t("lgOver"); const d=Math.floor(ms/864e5); return d>=1 ? t("lgDays")(d) : t("lgHours")(Math.max(1,Math.ceil(ms/36e5))); }
function lgHex(c){ const h=document.createElement("span"); h.className="lg-hex"; h.setAttribute("aria-hidden","true"); if(c) h.style.setProperty("--lg-c",c); return h; }
function lgEndHour(end){ const d=new Date(end||Date.now()); if(S.settings.lang==="en") return new Intl.DateTimeFormat("en",{hour:"numeric",minute:d.getMinutes()?"2-digit":undefined}).format(d).toLowerCase();
  return d.getHours()+" h"+(d.getMinutes()?" "+String(d.getMinutes()).padStart(2,"0"):""); }
function lgMeText(I,rows){ const tier=I.tier, me=I.me, up=tier<5?lgTN(tier+1):"", down=tier>0?lgTN(tier-1):"", z=me?lgZone(me.pos,I.n,tier):"";
  if(!me) return "";
  if(I.closed) return z==="up"&&me.xp>0 ? t("lgEndUp")(up) : z==="down" ? t("lgEndDown")(down) : t("lgEndStay")(lgTN(tier));
  if(z==="up") return me.xp>0 ? t("lgMeUp")(up) : t("lgMeZero")(up);
  if(z==="down") return t("lgMeDown")(down);
  if(tier<5){ const fifth=rows.find(r=>r.pos===5); if(fifth) return t("lgMeMid")(Math.max(1,fifth.xp-me.xp+1),up); }
  return tier===5 && me.pos<=5 ? t("lgMeTop") : t("lgMeSafe"); }
// ---- accueil : « Ligue Argent · tu es 4e · 3 jours restants » + 5 lignes autour de toi ----
function lgHubOff(){ const card=$("hsRank").closest(".hs-card"); if(!card.classList.contains("lg")) return; card.classList.remove("lg"); card.querySelector(".hs-h b").textContent=t("hsRankT"); }
async function lgHub(ol){
  const rows=await lgLoad(); const card=ol.closest(".hs-card");
  if(!rows || !rows.length || !user || page!=="hub"){ lgHubOff(); return false; }
  const I=lgInfo(rows), hb=card.querySelector(".hs-h b"); card.classList.add("lg");
  hb.textContent=""; hb.appendChild(lgHex(LG_COL[I.tier])); hb.appendChild(document.createTextNode(t("lgName")(lgTN(I.tier))));
  ol.innerHTML="";
  const sub=document.createElement("li"); sub.className="lg-sub"; sub.textContent=[I.me?t("lgYouAre")(I.me.pos):"", lgLeft(I.end)].filter(Boolean).join(" · "); ol.appendChild(sub);
  const at=I.me?I.me.pos-1:0, st=Math.max(0,Math.min(at-2,I.n-5)), li0=levelInfo(S.xp);
  rows.slice(st,st+5).forEach(r=>{ const li=hsRow(r.me?{...r,name:t("you"),photo:r.photo||(userPhoto&&userPhoto())||"",avatar:r.photo?r.avatar:charIndex(li0.L)}:r, r.pos, r.me); const z=lgZone(r.pos,I.n,I.tier); if(z) li.classList.add(z); ol.appendChild(li); });
  return true; }
// ---- page Classement : bouton « Ligue » en tête des périodes, vue #lgView ----
let lgTok=0;
const lgView=(()=>{ const v=document.createElement("div"); v.id="lgView"; v.hidden=true; $("rankPer").after(v); return v; })();
const lgWanted = () => !LG.off && (S.settings.rankPer==="league" || (!S.settings.rankPer && !!user && !(LG.at && LG.rows && !LG.rows.length && LG.uid===user.id))); // no league this week (yet): the default stays the weekly leaderboard
const _lgRankPer=renderRankPer;
renderRankPer=function(){ _lgRankPer(); if(LG.off) return; const box=$("rankPer"), on=lgWanted();
  const b=document.createElement("button"); b.type="button"; b.id="rankLg"; b.textContent=t("lgTab"); b.setAttribute("aria-pressed",on);
  b.onclick=()=>{ S.settings.rankPer="league"; save(); renderRank(); }; box.prepend(b);
  if(on) box.querySelectorAll("button:not(#rankLg)").forEach(x=>x.setAttribute("aria-pressed","false")); };
const _lgRank=renderRank;
renderRank=async function(){ const tok=++lgTok;
  if(!lgWanted()){ document.body.classList.remove("lg-on"); lgView.hidden=true; return _lgRank(); }
  rankTok++; // an older leaderboard load must not write over this view
  document.body.classList.add("lg-on"); lgView.hidden=false; renderRankPer();
  if(!cloudPromise) ensureCloud();
  const head=$("rankPanel").querySelector(".pane-head p");
  if(!sb){ head.textContent=t("rankSub"); lgView.innerHTML='<p class="lg-msg"></p>'; lgView.firstChild.textContent=cloudFail?t("rankErr"):t("rankLoading"); return; }
  if(!user){ // guest: only show the league tab if the server has my_league() (anon may call it: it returns nothing)
    if(!LG.ok){ await lgLoad(true); if(tok!==lgTok || page!=="rank") return; if(LG.off) return renderRank(); }
    head.textContent=t("rankSub"); lgView.innerHTML='<div class="card lg-guest"><h3 class="ph-title"></h3><p class="lg-msg"></p><button class="btn primary" type="button" id="lgJoin"></button></div>';
    lgView.querySelector("h3").textContent=t("lgGuestT"); lgView.querySelector("p").textContent=t("lgGuestX"); const j=lgView.querySelector("#lgJoin"); j.textContent=t("authUp"); j.onclick=()=>authOpen("signup"); return; }
  if(!LG.rows || LG.uid!==user.id){ lgView.innerHTML='<p class="lg-msg"></p>'; lgView.firstChild.textContent=t("rankLoading"); }
  const rows=await lgLoad(); if(tok!==lgTok || page!=="rank") return;
  if(LG.off) return renderRank(); // not installed yet: back to the usual leaderboard
  if(!rows){ lgView.innerHTML='<p class="lg-msg"></p>'; lgView.firstChild.textContent=t("rankErr"); return; }
  if(!rows.length && !lgWanted()) return renderRank();
  lgRender(rows); };
function lgRender(rows){
  const head=$("rankPanel").querySelector(".pane-head p"); lgView.innerHTML="";
  if(!rows.length){ head.textContent=t("rankSubIn"); const c=document.createElement("div"); c.className="card lg-guest"; const p=document.createElement("p"); p.className="lg-msg"; p.textContent=t("lgWait"); c.appendChild(p); lgView.appendChild(c); return; }
  const I=lgInfo(rows), col=LG_COL[I.tier]; lgView.style.setProperty("--lg-c",col);
  head.textContent=t("lgSub")(lgEndHour(I.end));
  const left=document.createElement("div"); left.className="lg-left";
  const hd=document.createElement("div"); hd.className="card lg-head";
  const h3=document.createElement("h3"); h3.textContent=t("lgName")(lgTN(I.tier));   const ul=document.createElement("ul"); ul.className="lg-tiers";
  t("lgTiers").forEach((nm,i)=>{ const li=document.createElement("li"); if(i<=I.tier) li.classList.add("got"); if(i===I.tier){ li.classList.add("cur"); li.setAttribute("aria-current","true"); }
    li.appendChild(lgHex(LG_COL[i])); const s=document.createElement("span"); s.textContent=nm; li.appendChild(s); ul.appendChild(li); });
  hd.append(h3,ul); left.appendChild(hd);
  if(I.me){ const mc=document.createElement("div"); mc.className="card lg-me"; mc.innerHTML='<span class="lg-pos"></span><span><b></b><small></small></span>';
    mc.querySelector(".lg-pos").textContent=fmtN(I.me.pos); mc.querySelector("b").textContent=t("lgYouAre")(I.me.pos); mc.querySelector("small").textContent=lgMeText(I,rows); left.appendChild(mc);
    const st=document.createElement("div"); st.className="lg-stats"; const ms=Math.max(0,I.end-Date.now());
    const card=(k,v)=>{ const c=document.createElement("div"); c.className="card"; const a=document.createElement("small"), b=document.createElement("b"); a.textContent=k; b.textContent=v; c.append(a,b); st.appendChild(c); };
    card(t("lgLeftT"), I.closed||!I.end ? t("lgOver") : t("lgLeftV")(Math.floor(ms/864e5), Math.floor(ms%864e5/36e5)));
    if(I.n>1){ if(I.me.pos>1){ const up=rows.find(r=>r.pos===I.me.pos-1); card(t("lgGapT")(I.me.pos-1), fmtN(Math.max(0,(up?up.xp:0)-I.me.xp))+" XP"); }
      else { const nx=rows.find(r=>r.pos===2); card(t("lgLeadT"), fmtN(Math.max(0,I.me.xp-(nx?nx.xp:0)))+" XP"); } }
    left.appendChild(st); }
  lgView.appendChild(left);
  const lc=document.createElement("div"); lc.className="card lg-listc"; const ol=document.createElement("ol"); ol.className="lg-list"; ol.setAttribute("aria-label",t("lgName")(lgTN(I.tier)));
  const band=(z,txt)=>{ const b=document.createElement("li"); b.className="lg-band "+z; b.textContent=(z==="up"?"▲ ":"▼ ")+txt; ol.appendChild(b); };
  const dn=Math.max(5,I.n-3), li0=levelInfo(S.xp);
  rows.forEach(r=>{ const z=lgZone(r.pos,I.n,I.tier);
    if(z==="down" && r.pos===dn+1) band("down",t("lgDownBand")(lgTN(I.tier-1)));
    const li=document.createElement("li"); if(z) li.classList.add(z); if(r.me) li.classList.add("me");
    li.innerHTML='<span class="rk"></span><span class="av"></span><b></b><span class="num"></span>';
    avFill(li.querySelector(".av"), r.me?(r.photo||userPhoto()||""):r.photo, r.me&&!r.photo?charIndex(li0.L):r.avatar);
    li.querySelector(".rk").textContent=fmtN(r.pos); nmPut(li.querySelector("b"), r.me?t("you"):r.name); li.querySelector(".num").textContent=fmtN(r.xp)+" XP"; ol.appendChild(li);
    if(z==="up" && (r.pos===5 || r.pos===I.n) && I.n>1) band("up",t("lgUpBand")(lgTN(I.tier+1))); });
  lc.appendChild(ol); lgView.appendChild(lc);
  const me=ol.querySelector("li.me"); if(me){ const r=me.getBoundingClientRect(), o=ol.getBoundingClientRect(); if(r.bottom>o.bottom-8) ol.scrollTop+=r.top-o.top-(ol.clientHeight-r.height)/2; } }
/* ==== fin Ligues ==== */
