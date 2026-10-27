// fragment de l'IIFE principale — ordre 250, voir src/app/README.md
// ---------- Notifications: a page of their own (bell in the menu with a badge), filled by the app and, for accounts, by the server ----------
// S.notifs = {list:[{id,cat,type,t,ti,tx,act,read}], keys:{key:time}} (60 kept). Categories: social | progress | remind | news.
// Preferences: S.settings.ntf = {social:{app,mail}, progress:{app,mail}, remind:{app,mail}, news:{app,mail}, weekly}; the e-mail ones are also saved
// in Supabase (notif_prefs) so the server knows what it may send. Server notifications (weekly recap, reminders) come from the "notifications" table.
const NTF_CATS=["social","progress","remind","news"];
const NTF_ICON={lvl:"star", unlock:"scales", elo:"crown", streak:"daily", daily:"learn", news:"bell", rank:"medal", recap:"scroll", welcome:"heart", duel:"games"};
function ntfPrefs(){ const d={social:{app:true,mail:true},progress:{app:true,mail:false},remind:{app:true,mail:true},news:{app:true,mail:false},weekly:true}, p=S.settings.ntf||{};
  const o={weekly:p.weekly!==false}; NTF_CATS.forEach(c=>{ o[c]={app:!(p[c]&&p[c].app===false), mail: p[c]&&p[c].mail!=null ? !!p[c].mail : d[c].mail}; }); return o; }
function ntfStore(){ if(!S.notifs||!Array.isArray(S.notifs.list)) S.notifs={list:[],keys:{}}; if(!S.notifs.keys) S.notifs.keys={}; return S.notifs; }
// add one notification (once per key); silent=true for the first fill so old news do not pile up
function ntfAdd(o, silent){ const st=ntfStore(), key=o.key||(o.type+"-"+Date.now()); if(st.keys[key]) return false; st.keys[key]=Date.now();
  const old=Date.now()-90*86400000; Object.entries(st.keys).forEach(([k,v])=>{ if(v<old && !k.startsWith("news-") && k!=="welcome") delete st.keys[k]; });
  if(silent || !ntfPrefs()[o.cat||"progress"].app){ save(); return false; }
  st.list.unshift({id:key, cat:o.cat||"progress", type:o.type, t:o.t||Date.now(), ti:String(o.ti||"").slice(0,90), tx:String(o.tx||"").slice(0,200), act:o.act||null, read:false});
  st.list.sort((a,b)=>b.t-a.t); st.list=st.list.slice(0,60); save(); ntfBadge(); if(page==="notif") renderNotifs(); return true; }
function ntfUnread(){ return ntfStore().list.filter(n=>!n.read).length; }
function ntfBadge(){ const n=ntfUnread(); ["ntfBadge","mbNtfBadge"].forEach(id=>{ const b=$(id); if(!b) return; b.hidden=!n; b.textContent=n>9?"9+":n; });
  $("ntfBtn")?.setAttribute("aria-label", t("ntfTitle")+(n?" ("+n+")":"")); $("mbNtf")?.setAttribute("aria-label", t("ntfTitle")+(n?" ("+n+")":"")); }
function ntfAgo(ts){ const s=(Date.now()-ts)/1000, fr=S.settings.lang==="fr";
  if(s<60) return t("ntfNow"); if(s<3600) return t("ntfMin")(Math.floor(s/60)); if(s<86400 && new Date(ts).getDate()===new Date().getDate()) return t("ntfH")(Math.floor(s/3600));
  if(dayStr(new Date(ts))===addDays(-1)) return t("ntfYest"); return new Date(ts).toLocaleDateString(fr?"fr-FR":"en-GB",{day:"numeric",month:"short"}); }
function ntfGroup(ts){ const d=dayStr(new Date(ts)); if(d===dayStr()) return "ntfToday"; if(d===addDays(-1)) return "ntfYesterday"; if(d>=addDays(-7)) return "ntfWeek"; return "ntfOlder"; }
let ntfFilter="all";
function renderNotifs(){ const st=ntfStore(), ul=$("ntfList"); ul.innerHTML="";
  document.querySelectorAll("#ntfTabs button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.v===ntfFilter));
  const L=st.list.filter(n=>ntfFilter==="all"||n.cat===ntfFilter); $("ntfAllRead").disabled=!st.list.some(n=>!n.read);
  $("ntfEmpty").hidden=!!L.length; ul.hidden=!L.length;
  let g=""; L.forEach(n=>{ const gg=ntfGroup(n.t); if(gg!==g){ g=gg; const h=document.createElement("li"); h.className="ntf-g"; h.textContent=t(gg); ul.appendChild(h); }
    const li=document.createElement("li"); li.className="ntf-it"+(n.read?"":" unread"); li.dataset.cat=n.cat;
    li.innerHTML='<span class="ntf-ic"></span><span class="ntf-tx"><b></b><span></span><small></small></span>'+(n.act?'<button class="btn ntf-go" type="button"></button>':'')+'<i class="ntf-dot" aria-hidden="true"></i>';
    li.querySelector(".ntf-ic").innerHTML=(OBJ[NTF_ICON[n.type]]||OBJ.bell)(); li.querySelector("b").textContent=n.ti; li.querySelector(".ntf-tx span").textContent=n.tx; li.querySelector(".ntf-tx span").title=n.tx||""; li.querySelector("small").textContent=ntfAgo(n.t);
    if(n.act){ const b=li.querySelector(".ntf-go"); b.textContent=t(n.act.l||"ntfOpen"); b.onclick=e=>{ e.stopPropagation(); n.read=true; save(); ntfBadge(); ntfDo(n.act); }; }
    li.onclick=()=>{ if(!n.read){ n.read=true; save(); ntfBadge(); renderNotifs(); } };
    ul.appendChild(li); });
  const m=$("ntfMailHint"); m.textContent = user ? (ntfPrefs().weekly||ntfPrefs().remind.mail ? t("ntfMailOn") : t("ntfMailOff")) : t("ntfMailGuest"); }
function ntfDo(a){ if(!a) return; const k=a.k;
  if(k==="daily") guardLeave(()=>openPage("daily")); else if(k==="rank") openPage("rank"); else if(k==="game"){ openPage("games"); if(DU_GAMES.includes(a.v)) gameOpen(a.v); }
  else if(k==="learn") openPage("learn"); else if(k==="free") openPage("free"); else if(k==="progress") openSet("progress"); else if(k==="settings") openSet("settings"); else if(k==="hub") openPage("hub"); }
// ---- what the app itself notices ----
const ntfNewsKey = n => { let h=0; const x=n[3]||n[0]; for(let i=0;i<x.length;i++) h=(h*31+x.charCodeAt(i))|0; return "news-"+(h>>>0).toString(36); }; // from the icon: the same in every language
function ntfCheck(){ const st=ntfStore(), first=!S.notifs.init, today=dayStr(), h=new Date().getHours();
  if(!st.nv2){ st.nv2=1; t("hsNews").forEach(n=>ntfAdd({key:ntfNewsKey(n), cat:"news", type:"news", ti:n[0]}, true)); } // news already listed before: no flood
  if(first){ S.notifs.init=1;
    ntfAdd({key:"welcome", cat:"news", type:"welcome", ti:t("ntfWelcomeT"), tx:t("ntfWelcomeX"), act:{k:"settings",l:"ntfSetGo"}}); }
  // news of the home page that this player has not seen yet
  t("hsNews").forEach(n=>ntfAdd({key:ntfNewsKey(n), cat:"news", type:"news", ti:n[0], tx:n[1], act:{k:"hub",l:"ntfOpen"}}));
  // the daily practice of the day
  if(!(S.daily&&S.daily.date===today)) ntfAdd({key:"daily-"+today, cat:"remind", type:"daily", ti:t("ntfDailyT"), tx:t("ntfDailyX"), act:{k:"daily",l:"ntfPlay"}});
  // the streak is in danger in the evening
  const sd=S.streak&&S.streak.days|0; if(sd>=2 && S.streak.last===addDays(-1) && h>=17) ntfAdd({key:"streak-"+today, cat:"remind", type:"streak", ti:t("ntfStreakT")(sd), tx:t("ntfStreakX"), act:{k:"daily",l:"ntfPlay"}});
  ntfBadge(); }
setInterval(()=>{ try{ ntfCheck(); }catch(e){} }, 30*60*1000);
// a new level (and the character of the level), a new rating record, the weekly leaderboard
function ntfLevel(L){ const ci=CHAR_LVL.indexOf(L), c=ci>=0?t("chars")[ci]:null;
  ntfAdd({key:"lvl-"+L, cat:"progress", type:"lvl", ti:t("ntfLvlT")(L), tx: c ? t("ntfLvlChar")(c[0]+" "+c[1]) : t("ntfLvlX"), act:{k:"progress",l:"ntfSee"}}); }
function ntfElo(key, r){ const [g,c]=key.split("-"), e=(S.elo||{})[key]; if(!e || e.n<5) return; const peak=e.peak||0; if(r>peak){ e.peak=r; if(peak) ntfAdd({key:"elo-"+key+"-"+Math.floor(r/50), cat:"progress", type:"elo", ti:t("ntfEloT")(r), tx:duGameName(g)+" · "+duContName(g,c), act:{k:"game",v:g,l:"ntfPlay"}}); } }
function ntfRank(rows, since){ if(!user||!Array.isArray(rows)) return; const me=rows.findIndex(r=>r.id===user.id); if(me<0) return; const old=S.ntfRk&&S.ntfRk.since===since?S.ntfRk:null;
  if(old && me>old.pos){ const by=rows.slice(0,me).find(r=>!old.above.includes(r.id)); if(by) ntfAdd({key:"rk-"+since+"-"+me+"-"+by.id, cat:"social", type:"rank", ti:t("ntfRankT")(qzSafe(by.name)||"?"), tx:t("ntfRankX")(me+1), act:{k:"rank",l:"ntfSee"}}); }
  S.ntfRk={since, pos:me, above:rows.slice(0,me).map(r=>r.id)}; save(); }
// ---- server side (accounts): notifications written by the server, e-mail preferences ----
async function ntfCloud(){ if(!sb||!user) return;
  try{ const since=new Date(Date.now()-30*86400000).toISOString();
    const {data,error}=await sb.from("notifications").select("id,cat,kind,title,body,action,created_at").eq("user_id",user.id).gte("created_at",since).order("created_at",{ascending:true}).limit(50);
    if(!error && Array.isArray(data)) data.forEach(r=>{ const act = typeof r.action==="string" && /^(daily|rank|learn|free|progress|hub|game:(runner|speed|memory))$/.test(r.action) ? (r.action.startsWith("game:")?{k:"game",v:r.action.slice(5),l:"ntfPlay"}:{k:r.action,l:"ntfOpen"}) : null;
      const ts=Date.parse(r.created_at)||Date.now(), day=dayStr(new Date(ts));
      if(r.kind==="path"){ ntfAdd({key:"ppr-"+day, cat:"remind", type:"path", ti:r.title, tx:r.body, t:ts, act:{k:"pp",l:"ntfPlay"}}); return; } // D24: the next lesson (lot 4)
      if(r.kind==="streak"){ if(S.streak&&S.streak.last===dayStr()) return; ntfAdd({key:"streak-"+day, cat:"remind", type:"streak", ti:r.title, tx:r.body, t:ts, act}); return; } // the same reminder as the app's own
      ntfAdd({key:"srv-"+r.id, cat:NTF_CATS.includes(r.cat)?r.cat:"news", type:NTF_ICON[r.kind]?r.kind:"news", ti:r.title, tx:r.body, t:ts, act}); });
  }catch(e){}
  try{ const {data:pr,error}=await sb.from("notif_prefs").select("email_weekly,email_streak,email_social,email_news,lang,updated_at").eq("user_id",user.id).maybeSingle();
    if(error) return;
    if(!pr){ ntfSavePrefs(); return; } // first time: the server gets this device's choice
    const at=Date.parse(pr.updated_at)||0; if(at>(S.settings.ntfAt||0)){ const n=S.settings.ntf=S.settings.ntf||{};
      n.weekly=!!pr.email_weekly; n.remind={...ntfPrefs().remind, mail:!!pr.email_streak}; n.social={...ntfPrefs().social, mail:!!pr.email_social}; n.news={...ntfPrefs().news, mail:!!pr.email_news};
      S.settings.ntfAt=at; save(); renderNtfSet(); }
  }catch(e){} }
let ntfPrefT=0;
function ntfSavePrefs(){ clearTimeout(ntfPrefT); ntfPrefT=setTimeout(async()=>{ if(!sb||!user) return; const p=ntfPrefs(), now=new Date();
  try{ const row={user_id:user.id, email_weekly:p.weekly, email_streak:p.remind.mail, email_social:p.social.mail, email_news:p.news.mail, lang:S.settings.lang==="en"?"en":"fr", updated_at:now.toISOString()};
    let tz="Europe/Paris"; try{ tz=Intl.DateTimeFormat().resolvedOptions().timeZone||tz; }catch(e){}
    let {error}=await sb.from("notif_prefs").upsert({...row, remind_hour:(typeof remHour==="function"?remHour():18), tz},{onConflict:"user_id"}); // D24 (lot 4): reminder hour and time zone
    if(error && /remind_hour|tz|column|PGRST204/i.test(String(error.message||"")+(error.code||""))) ({error}=await sb.from("notif_prefs").upsert(row,{onConflict:"user_id"})); // migration 2026-10-25 not run yet
    if(error) console.warn("notif_prefs", error.message); else { S.settings.ntfAt=now.getTime(); save(); } }catch(e){} },800); }
// ---- settings: categories x channels ----
function renderNtfSet(){ const box=$("ntfSet"); if(!box) return; const p=ntfPrefs(); box.innerHTML="";
  const head=document.createElement("div"); head.className="ntf-row ntf-hd"; head.innerHTML="<span></span><b></b><b></b>"; head.children[1].textContent=t("ntfApp"); head.children[2].textContent=t("ntfMail"); box.appendChild(head);
  const row=(label,sub,app,mail,onApp,onMail)=>{ const r=document.createElement("div"); r.className="ntf-row"; r.innerHTML='<span><b></b><small></small></span><label class="sw"><input type="checkbox"><i></i></label><label class="sw"><input type="checkbox"><i></i></label>';
    r.querySelector("b").textContent=label; r.querySelector("small").textContent=sub; const [a,m]=r.querySelectorAll("input");
    if(app==null){ a.closest("label").style.visibility="hidden"; } else { a.checked=app; a.onchange=()=>onApp(a.checked); a.setAttribute("aria-label",label+" · "+t("ntfApp")); }
    if(mail==null){ m.disabled=true; m.closest("label").style.visibility="hidden"; } else { m.checked=mail; m.disabled=!user; m.onchange=()=>onMail(m.checked); m.setAttribute("aria-label",label+" · "+t("ntfMail")); } box.appendChild(r); };
  const set=(c,ch,v)=>{ S.settings.ntf=S.settings.ntf||{}; S.settings.ntf[c]={...ntfPrefs()[c],[ch]:v}; save(); ntfSavePrefs(); renderNtfSet(); };
  NTF_CATS.forEach(c=>row(t("ntfCat_"+c), t("ntfCatD_"+c), p[c].app, c==="remind"?p[c].mail:null, v=>set(c,"app",v), v=>set(c,"mail",v)));
  row(t("ntfWeeklyT"), t("ntfWeeklyD"), null, p.weekly, null, v=>{ S.settings.ntf=S.settings.ntf||{}; S.settings.ntf.weekly=v; save(); ntfSavePrefs(); renderNtfSet(); });
  const n=document.createElement("p"); n.className="qz-hint ntf-note"; n.textContent = user ? t("ntfMailNote") : t("ntfMailGuest"); box.appendChild(n); }
// ---- buttons ----
$("ntfBtn").addEventListener("click",()=>{ closeDrawer(); guardLeave(()=>openPage("notif")); });
$("mbNtf").addEventListener("click",()=>guardLeave(()=>openPage("notif")));
$("ntfAllRead").addEventListener("click",()=>{ ntfStore().list.forEach(n=>n.read=true); save(); ntfBadge(); renderNotifs(); });
$("ntfSetBtn").addEventListener("click",()=>{ openSet("settings"); setTab("ntf"); setTimeout(()=>{ if(!setTabsMQ.matches) $("ntfSet")?.scrollIntoView({block:"start",behavior:"smooth"}); },80); });
$("ntfTabs").addEventListener("click",e=>{ const b=e.target.closest("[data-v]"); if(!b) return; ntfFilter=b.dataset.v; renderNotifs(); });
setTimeout(()=>{ try{ ntfCheck(); }catch(e){ console.warn(e); } },1500);

// one tile: glossy colored card, a 3D-look object overflowing its top-right corner, then kicker, name, line, button
function tile({color,obj,kick,title,desc,btn,rec,soon,onOpen}){
  const c=document.createElement(soon?"div":"button"); c.className="ptile"+(soon?" soon":""); if(!soon) c.type="button"; c.style.setProperty("--tc",color); c.style.setProperty("--tc2",shade(color,.32));
  c.innerHTML='<span class="obj">'+(OBJ[obj]?OBJ[obj]():"")+'</span><span class="pk"></span><span class="h3"></span><p></p>'+(rec!=null?'<span class="rec"></span>':'')+(soon?'<span class="rec"></span>':'<span class="go"></span>');
  c.querySelector(".pk").textContent=kick; c.querySelector(".h3").textContent=title; c.querySelector("p").textContent=desc;
  if(rec!=null) c.querySelector(".rec").textContent=rec; if(soon) c.querySelector(".rec:last-child").textContent=t("soon"); else c.querySelector(".go").textContent=btn||t("rnPlay");
  if(onOpen) c.addEventListener("click",onOpen); return c; }
const shade=(hex,k)=>{ const n=parseInt(hex.slice(1),16), r=n>>16, g=(n>>8)&255, b=n&255, f=x=>Math.max(0,Math.min(255,Math.round(x))); return "#"+[r,g,b].map(x=>f(x+(k>0?(255-x)*k:x*k)).toString(16).padStart(2,"0")).join(""); };

// 3D-look objects for the tiles: glossy SVG "toys" (radial gradient + white sheen + drop shadow), one per game/topic
let g3n=0;
const G3=col=>{ const id="g3"+(++g3n); return [id,'<radialGradient id="'+id+'" cx=".34" cy=".28" r=".9"><stop offset="0" stop-color="'+shade(col,.6)+'"/><stop offset=".45" stop-color="'+col+'"/><stop offset="1" stop-color="'+shade(col,-.42)+'"/></radialGradient>']; };
const L3=col=>{ const id="l3"+(++g3n); return [id,'<linearGradient id="'+id+'" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="'+shade(col,.45)+'"/><stop offset=".55" stop-color="'+col+'"/><stop offset="1" stop-color="'+shade(col,-.38)+'"/></linearGradient>']; };
function O3(){ const defs=[], parts=[];
  const o={
    ball(cx,cy,r,col,ry){ const [id,d]=G3(col); defs.push(d); ry=ry||r; parts.push('<ellipse cx="'+cx+'" cy="'+cy+'" rx="'+r+'" ry="'+ry+'" fill="url(#'+id+')"/><ellipse cx="'+(cx-r*.34)+'" cy="'+(cy-ry*.42)+'" rx="'+(r*.34)+'" ry="'+(ry*.17)+'" fill="#fff" opacity=".6" transform="rotate(-28 '+(cx-r*.34)+' '+(cy-ry*.42)+')"/>'); return o; },
    block(x,y,w,h,col,rx){ const [id,d]=L3(col); defs.push(d); rx=rx==null?Math.min(w,h)*.28:rx; parts.push('<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+rx+'" fill="url(#'+id+')"/><rect x="'+(x+w*.14)+'" y="'+(y+Math.min(h*.1,5))+'" width="'+(w*.5)+'" height="'+Math.max(3,Math.min(h*.14,7))+'" rx="3" fill="#fff" opacity=".45"/>'); return o; },
    raw(s){ parts.push(s); return o; },
    grad(col){ const [id,d]=L3(col); defs.push(d); return "url(#"+id+")"; },
    svg(){ return '<svg viewBox="0 0 120 120" aria-hidden="true"><defs>'+defs.join("")+'</defs>'+parts.join("")+'</svg>'; } };
  return o; }
const NC=["#ff5a6e","#ff9a3c","#ffd23f","#3ddc84","#3cc8f0","#5b7cff","#b26bff"];
const OBJ={
  chords:()=>O3().ball(58,92,17,NC[0],13).ball(64,68,17,NC[2],13).ball(70,44,17,NC[4],13).svg(),
  scales:()=>{ const o=O3(); [0,1,2,3].forEach(i=>o.block(8+i*27,84-i*20,25,26+i*20,NC[i],8)); return o.svg(); },
  harmony:()=>{ const o=O3(); [[18,58,NC[5]],[48,34,NC[4]],[78,48,NC[6]]].forEach(([x,y,c])=>o.block(x,y,24,104-y,c,9).ball(x+12,y-2,13,shade(c,.2))); return o.svg(); },
  prog:()=>{ const o=O3(); [[-16,"I",NC[0]],[0,"IV",NC[4]],[16,"V",NC[2]]].forEach(([r,l,c],i)=>o.raw('<g transform="rotate('+r+' 60 104)">').block(38,26,44,62,"#fbfbff",10).block(44,32,32,14,c,6).raw('<text x="60" y="76" text-anchor="middle" font-family="Fredoka,Nunito,sans-serif" font-weight="700" font-size="20" fill="#2b2560">'+l+'</text></g>')); return o.svg(); },
  ear:()=>{ const o=O3(); return o.raw('<path d="M24 70a36 36 0 0 1 72 0" fill="none" stroke="'+o.grad("#7a5bf5")+'" stroke-width="11" stroke-linecap="round"/>').block(14,62,24,40,"#ff5a6e",11).block(82,62,24,40,"#ff5a6e",11).svg(); },
  daily:()=>{ const o=O3(); const g=o.grad("#ff8a2a"); return o.raw('<path d="M62 10c6 20 32 32 32 62a34 34 0 0 1-68 0c0-15 8-24 15-31 0 11 4 18 11 20-4-22 1-37 10-51z" fill="'+g+'"/><path d="M62 66c5 9 15 13 15 26a15 15 0 0 1-30 0c0-9 6-13 8-17 2 4 4 7 7 7z" fill="#ffe27a"/><ellipse cx="48" cy="52" rx="7" ry="13" fill="#fff" opacity=".35" transform="rotate(20 48 52)"/>').svg(); },
  runner:()=>{ const o=O3(); o.block(12,22,96,62,"#3a3478",22).ball(46,48,13,"#ffffff").ball(78,48,13,"#ffffff").raw('<circle cx="49" cy="50" r="6" fill="#15122e"/><circle cx="81" cy="50" r="6" fill="#15122e"/><circle cx="51" cy="47.5" r="2" fill="#fff"/><circle cx="83" cy="47.5" r="2" fill="#fff"/>').block(16,76,88,30,"#fbfbff",8);
    o.raw('<g fill="#2b2560">'+[29,45,71,87].map(x=>'<rect x="'+x+'" y="76" width="8" height="17" rx="3"/>').join("")+'</g>'); return o.svg(); },
  speed:()=>O3().block(52,8,16,14,"#e59b12",4).ball(60,66,44,"#ffc94a").raw('<circle cx="60" cy="66" r="31" fill="#fffaf0"/><path d="M60 66V44" stroke="#15122e" stroke-width="6" stroke-linecap="round"/><path d="M60 66l15 9" stroke="#ff5a6e" stroke-width="5" stroke-linecap="round"/><circle cx="60" cy="66" r="5" fill="#15122e"/>').svg(),
  memory:()=>{ const o=O3(); o.raw('<g transform="rotate(-14 40 70)">').block(14,26,52,72,"#6a4bf0",11).raw('<text x="40" y="74" text-anchor="middle" font-family="Fredoka,Nunito,sans-serif" font-weight="700" font-size="30" fill="#fff">?</text></g><g transform="rotate(10 82 64)">').block(56,20,52,72,"#fbfbff",11).raw('<path d="M90 36v34" stroke="#15122e" stroke-width="5" stroke-linecap="round"/><path d="M90 36q10 4 12 14" stroke="#15122e" stroke-width="5" fill="none" stroke-linecap="round"/></g>'); o.ball(80,74,11,NC[0],8); return o.svg(); },
  soon:()=>{ const o=O3(); const g=o.grad("#ffc94a"); return o.raw('<path d="M30 16h60v24a30 30 0 0 1-60 0z" fill="'+g+'"/><path d="M30 24H16a14 14 0 0 0 16 20M90 24h14a14 14 0 0 1-16 20" fill="none" stroke="#e59b12" stroke-width="7"/>').block(52,66,16,22,"#e59b12",3).block(34,86,52,18,"#7a5bf5",7).raw('<ellipse cx="44" cy="28" rx="6" ry="11" fill="#fff" opacity=".45"/>').svg(); },
  pulse:()=>{ const o=O3(); [[52,"#ff5a6e"],[38,"#fbfbff"],[24,"#ff5a6e"]].forEach(([r,c])=>o.ball(60,62,r,c)); return o.ball(60,62,10,"#ffd23f").svg(); },
  blaster:()=>{ const o=O3(); const f=o.grad("#ff9a3c"); return o.raw('<g transform="rotate(35 60 60)"><path d="M52 92l8 22 8-22z" fill="'+f+'"/>').block(36,74,14,22,"#ff5a6e",6).block(70,74,14,22,"#ff5a6e",6).ball(60,56,22,"#fbfbff",40).ball(60,46,9,"#3cc8f0").raw('</g>').svg(); },
  climber:()=>{ const o=O3(); [0,1,2].forEach(i=>o.block(22+i*8,86-i*26,76-i*16,26,NC[[3,4,5][i]],8)); return o.block(58,10,5,28,"#fbfbff",2).raw('<path d="M63 12l22 7-22 8z" fill="#ff5a6e"/>').svg(); },
  staff:()=>{ const o=O3(); return o.block(70,16,9,76,"#fbfbff",4).raw('<path d="M75 18q26 10 22 40q-4-16-22-20z" fill="'+o.grad("#fbfbff")+'"/>').ball(56,92,22,"#b26bff",16).svg(); },
  games:()=>{ const o=O3(); return o.block(10,38,100,58,"#3a3478",29).block(26,58,22,8,"#fbfbff",4).block(33,51,8,22,"#fbfbff",4).ball(80,56,8,"#ff5a6e").ball(94,70,8,"#ffd23f").ball(66,70,8,"#3cc8f0").ball(80,84,8,"#3ddc84").svg(); },
  play:()=>{ const o=O3(); [[16,"#ff5a6e",40],[40,"#ffd23f",62],[64,"#3cc8f0",30],[88,"#b26bff",52]].forEach(([x,c,h])=>o.block(x,78-h,16,h,c,8)); o.block(6,82,108,30,"#fbfbff",8); o.raw('<g fill="#2b2560">'+[22,46,70,94].map(x=>'<rect x="'+x+'" y="82" width="9" height="16" rx="3"/>').join("")+'</g>'); return o.svg(); },
  learn:()=>{ const o=O3(); o.block(32,62,56,34,"#3a3478",10); o.raw('<path d="M60 24l52 22-52 22L8 46z" fill="'+o.grad("#5b4bd6")+'"/><path d="M60 30l40 16-40 16" fill="#fff" opacity=".18"/><path d="M98 50v26" stroke="#ffc94a" stroke-width="4" stroke-linecap="round"/>'); return o.ball(98,80,7,"#ffc94a").svg(); }
};



