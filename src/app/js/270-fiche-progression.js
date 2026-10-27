// fragment de l'IIFE principale — ordre 270, voir src/app/README.md
// ----- progress sheet (ROLI-style): level, achievements, streak calendar, journey, records -----
let pfMonth=null;
const pDate=s=>{ const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d); };
const wkKey=dt=>{ const d=new Date(dt.getFullYear(),dt.getMonth(),dt.getDate()); d.setDate(d.getDate()-((d.getDay()+6)%7)); return dayStr(d); };
function streaks(){ const days=Object.keys(S.xpDays||{}).filter(k=>(S.xpDays[k]|0)>0).sort();
  let best=0,run=0,prev=null; const fz=frzDays(); days.forEach(k=>{ const d=pDate(k); let gap=prev?Math.round((d-prev)/864e5):0; if(prev && gap>1){ const x=new Date(prev); let ok=true; for(let i=1;i<gap;i++){ x.setDate(x.getDate()+1); if(!fz.has(dayStr(x))){ ok=false; break; } } if(ok) gap=1; }
    run = prev && gap===1 ? run+1 : 1; best=Math.max(best,run); prev=d; });
  const set=new Set(days), frz=frzDays(); let cur=0; const d=new Date(); if(!set.has(dayStr(d))) d.setDate(d.getDate()-1); while(set.has(dayStr(d))||frz.has(dayStr(d))){ if(set.has(dayStr(d))) cur++; d.setDate(d.getDate()-1); }
  cur=Math.max(cur, effStreak());
  const wn={}; days.forEach(k=>{ const w=wkKey(pDate(k)); wn[w]=(wn[w]|0)+1; }); const wkNow=wn[wkKey(new Date())]|0;
  const wks=Object.keys(wn).filter(w=>wn[w]>=3).sort(); let wb=0,wr=0,wp=null; wks.forEach(k=>{ const d=pDate(k); wr = wp && Math.round((d-wp)/864e5)===7 ? wr+1 : 1; wb=Math.max(wb,wr); wp=d; });
  const ws=new Set(wks); let wc=0; const w=pDate(wkKey(new Date())); if(!ws.has(dayStr(w))) w.setDate(w.getDate()-7); while(ws.has(dayStr(w))){ wc++; w.setDate(w.getDate()-7); }
  return {cur,best:Math.max(best,cur),wc,wb:Math.max(wb,wc),set,frz,wkNow}; }
const fmtDur=sec=>{ const h=Math.floor(sec/3600), m=Math.round(sec%3600/60); return h? h+" h "+String(m).padStart(2,"0")+" min" : m+" min"; };
function renderFiche(){
  const li=levelInfo(S.xp), ph=(typeof userPhoto==="function"&&userPhoto())||"";
  avFill($("pfAv"),ph,charIndex(li.L));
  $("pfK").textContent=(typeof user!=="undefined"&&user)?myName():t("you"); $("pfName").textContent=titleFor(li.L);
  $("pfXp").style.transform="scaleX("+(li.into/li.need)+")"; $("pfXpTxt").textContent=fmtN(li.into)+" / "+fmtN(li.need)+" XP"; 
  const secs=["chords","scales","harmony","prog","ear"], NM={chords:"secChords",scales:"secScales",harmony:"secHarmony",prog:"secProg",ear:"secEar"}, COL={chords:"#c9463c",scales:"#b4461a",harmony:"#2c56d6",prog:"#6a3fd1",ear:"#0e7490"};
  let mAll=0,nAll=0; const jr=secs.map(sec=>{ let m=0,n=0; try{ typeList(sec).forEach(ty=>{ const r=rootsOf(sec,ty.id); n+=r.length; m+=r.filter(k=>tileMast(sec,ty.id,k)>=3).length; }); }catch(e){} mAll+=m; nAll+=n; return [sec,m,n]; });
  const ss=S.secStats||{}, sum=k=>Object.values(ss).reduce((a,v)=>a+((v&&v[k])|0),0);
  const play=S.playSec||{}, tot=Object.values(play).reduce((a,v)=>a+(v|0),0);
  const L=t("pfSt"), vals=[fmtN(S.xp)+" XP",fmtN(sum("ok")),fmtN(sum("perfect")),fmtN(mAll),fmtDur(tot),fmtDur(play[dayStr()]|0)], SC=["#0e7490","#8a3fd1","#6a3fd1","#b4461a","#c9463c","#1f7a52"];
  const ul=$("pfStats"); ul.innerHTML=""; L.forEach((l,i)=>{ const li2=document.createElement("li"); li2.style.background=SC[i]; li2.innerHTML="<span></span><b></b>"; li2.firstChild.textContent=l; li2.lastChild.textContent=vals[i]; ul.appendChild(li2); });
  const st=streaks(); $("pfDay").textContent=st.cur?t("pfDayS")(fmtN(st.cur)):t("streakNew"); $("pfDay").classList.toggle("gl-new",!st.cur); try{ goalFiche(st); }catch(e){} $("pfDayBest").textContent=t("pfBest")(fmtN(st.best)); $("pfWeek").textContent=t("pfWeekS")(fmtN(st.wc)); $("pfWeekBest").textContent=t("pfBest")(fmtN(st.wb));
  if(!pfMonth){ const d=new Date(); pfMonth=new Date(d.getFullYear(),d.getMonth(),1); }
  $("pfMonth").textContent=t("pfMonths")[pfMonth.getMonth()]+" "+pfMonth.getFullYear();
  const cal=$("pfCal"); cal.innerHTML=t("pfDays").map(x=>"<i>"+x+"</i>").join(""); const first=(pfMonth.getDay()+6)%7, nd=new Date(pfMonth.getFullYear(),pfMonth.getMonth()+1,0).getDate(), today=dayStr();
  for(let i=0;i<first;i++) cal.appendChild(document.createElement("span"));
  for(let d=1;d<=nd;d++){ const k=dayStr(new Date(pfMonth.getFullYear(),pfMonth.getMonth(),d)), e=document.createElement("span"); e.textContent=d; if(st.set.has(k)) e.className="on"; else if(st.frz.has(k)){ e.className="frz"; e.title=t("frzUsed"); } if(k===today) e.classList.add("today"); cal.appendChild(e); }
  $("pfJourneySub").textContent=t("pfJSub")(mAll,nAll); const ju=$("pfJourney"); ju.innerHTML="";
  jr.forEach(([sec,m,n])=>{ const li2=document.createElement("li"); li2.innerHTML='<span class="pj-t"><b></b><span class="pj-n"></span></span><span class="bar"><i></i></span>'; li2.querySelector("b").textContent=t(NM[sec]); li2.querySelector(".pj-n").textContent=fmtN(m)+" / "+fmtN(n); const bi=li2.querySelector(".bar i"); bi.style.width=(n?m/n*100:0)+"%"; bi.style.background=COL[sec]; ju.appendChild(li2); });
  $("pfRecsSub").textContent=t("pfRSub"); const ru=$("pfRecs"); ru.innerHTML=""; let cb={}, cg={}; try{ cb=JSON.parse(localStorage.getItem("clavio:best")||"{}")||{}; cg=JSON.parse(localStorage.getItem("clavio:gbest")||"{}")||{}; }catch(e){}
  const rows=[]; t("games").forEach(([title,,id])=>{ if(id==="douze") rows.push(...dzRecRows(title)); else if(id) rows.push([title,fmtN((S.gameBest||{})[id]||(id==="runner"?S.runnerBest:0)||0)]); });
  Object.entries(S.elo||{}).filter(([,e])=>e&&e.n).forEach(([k,e])=>{ const [g,c]=k.split("-"); if(DU_GAMES.includes(g)) rows.push([t("pfEloL")(duGameName(g),duContName(g,c)), "ELO "+fmtN(e.r)+(eloProv(e)?"?":""), t("duRecord")(fmtN(e.w),fmtN(e.d),fmtN(e.l))]); });
  t("playGames").forEach(([title,,id])=>rows.push([title,fmtN(cg[id]|0)])); pcRecRows(cb).forEach(r=>rows.push(r));
  if(rows.every(r=>r[1]==="0"||r[1]==="—")) $("pfRecsSub").textContent=t("ruRecNone"); // empty state: no record yet (Revue UI)
  rows.forEach(([a,b,c])=>{ const li2=document.createElement("li"); li2.innerHTML="<span></span><b></b>"+(c?"<small></small>":""); li2.firstChild.textContent=a; li2.children[1].textContent=b==="0"?"—":b; if(c) li2.children[2].textContent=c; ru.appendChild(li2); });
  pfDotsInit();
}
// phone: the 4 cards are a swipeable row, with a fade on the edge and one dot per card
function pfDotsInit(){ const row=document.querySelector("#progFiche .pf-row"), dots=$("pfDots"); if(!row||!dots) return; const cards=[...row.children];
  if(dots.children.length!==cards.length){ dots.innerHTML=""; cards.forEach((c,i)=>{ const b=document.createElement("button"); b.type="button"; b.setAttribute("aria-label",(c.querySelector("h3")||{}).textContent||t("acctStreak"));
    b.onclick=()=>row.scrollTo({left:c.offsetLeft-row.offsetLeft,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"}); dots.appendChild(b); }); }
  cards.forEach((c,i)=>{ const b=dots.children[i]; if(b) b.setAttribute("aria-label",(c.querySelector("h3")||{}).textContent||t("acctStreak")); });
  ovFade(row,()=>{ const w=cards[0]?cards[0].offsetWidth+14:1, i=Math.max(0,Math.min(cards.length-1,Math.round(row.scrollLeft/w))); [...dots.children].forEach((b,j)=>b.setAttribute("aria-current",j===i)); }); }
$("pfPrev").addEventListener("click",()=>{ pfMonth=new Date(pfMonth.getFullYear(),pfMonth.getMonth()-1,1); renderFiche(); });
$("pfNext").addEventListener("click",()=>{ pfMonth=new Date(pfMonth.getFullYear(),pfMonth.getMonth()+1,1); renderFiche(); });
$("pfLevels").addEventListener("click",()=>openChars());

