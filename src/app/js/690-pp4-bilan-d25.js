// fragment de l'IIFE principale — ordre 690, voir src/app/README.md
// ======================= D25 · bilan de la semaine =======================
// Le lundi (ou à la première ouverture de la semaine), une fois : la semaine passée (lundi → dimanche) si au moins un jour joué.
function wkS(){ if(!L4isO(S.wkRev)) S.wkRev={}; return S.wkRev; }
const wkPrev = () => { const d=pDate(wkKey(new Date())); d.setDate(d.getDate()-7); return dayStr(d); };
function wkDays(mon){ const d=pDate(mon); return Array.from({length:7},(_,i)=>{ const x=new Date(d); x.setDate(d.getDate()+i); return dayStr(x); }); }
const PL_NOTES={p02:1,p03:2,p04:4};
function wkData(mon){ const days=wkDays(mon), xd=S.xpDays||{}, ps=S.playSec||{}, played=days.filter(k=>(xd[k]|0)>0||(ps[k]|0)>=60), sec=days.reduce((a,k)=>a+(ps[k]|0),0), g=goalCfg();
  const t0=pDate(days[0]).getTime(), t1=(e=>(e.setDate(e.getDate()+1),e.getTime()))(pDate(days[6])) /* next Monday 00:00: a week with a DST change lasts 167 or 169 h */, done=(S.pp&&S.pp.done)||{}, les=PP_IDS.filter(id=>{ const x=done[id]; return x && !x.place && +x.at>=t0 && +x.at<t1; });
  const notes=les.reduce((a,id)=>a+(PL_NOTES[id]||0),0), goalOk=days.filter(k=>g.kind==="xp" ? (xd[k]|0)>=g.v : (ps[k]|0)>=g.v*60).length;
  let best=null; if(les.length){ const b=les.slice().sort((a,c)=>((+done[c].stars||0)-(+done[a].stars||0))||PP_IDS.indexOf(c)-PP_IDS.indexOf(a))[0]; best={k:"les", id:b, txt:b==="p08"?t("pp08Song")||ppTitle(b):t("ppLesson")(ppNum(b))+" · "+ppTitle(b), stars:+done[b].stars||0}; }
  else { const bd=days.slice().sort((a,c)=>(ps[c]|0)-(ps[a]|0))[0]; if((ps[bd]|0)>=60) best={k:"day", txt:t("wkBestDay")(pDate(bd).toLocaleDateString(S.settings.lang==="fr"?"fr-FR":"en-GB",{weekday:"long"}), Math.round((ps[bd]|0)/60))}; }
  const xp=days.reduce((a,k)=>a+(xd[k]|0),0);
  return {mon, days, played, n:played.length, min:Math.round(sec/60), les:les.length, notes, goalOk, xp, best, pp:ppStarted()}; }
function wkCheck(){ try{ if(page!=="hub" || anyModal() || FN.on || ACCT.pend || actNow() || document.body.classList.contains("gate-on")) return; if(!(S.onb&&S.onb.done) && !S.gate) return;
    const mon=wkPrev(), w=wkS(); if(w.last && w.last>=mon) return; const d=wkData(mon); if(!d.n) return; w.last=mon; save();
    try{ ntfAdd({key:"wk-"+mon, cat:"progress", type:"week", ti:t("wkNtfT"), tx:t("wkNtfX")(d.n,fmtN(d.min)), act:{k:"week",v:mon,l:"ntfSee"}}); }catch(e){}
    wkOpen(mon); }catch(e){ console.warn(e); } }
function wkEl(){ let m=$("wkModal"); if(m) return m; m=document.createElement("div"); m.className="modal goal-modal wk-modal"; m.id="wkModal"; m.hidden=true; m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-labelledby","wkT");
  m.innerHTML='<div class="modal-bg" data-close="wkModal"></div><div class="modal-card"><div class="modal-body wk-body" id="wkBody"></div></div>'; document.body.appendChild(m); return m; }
const WK_IC=['<rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>','<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>','<path d="M5 12.5l4.5 4.5L19 7.5"/>','<path d="M9 18V5l11-2v13M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM20 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>'];
function wkOpen(mon){ mon=mon||wkPrev(); const d=wkData(mon), m=wkEl(), B=$("wkBody"), g=goalCfg(), L=S.settings.lang==="fr"?"fr-FR":"en-GB", fd=k=>pDate(k).toLocaleDateString(L,{day:"numeric",month:"long"}), valid=d.n>=3;
  const tiles=[[d.n+"/7",t("wkDays")],[fmtN(d.min)+" min",t("wkMin")], d.pp?[fmtN(d.les),t("wkLes")]:[fmtN(d.xp),t("wkXp")], d.pp?[fmtN(d.notes),t("wkNotes")]:[fmtN(streaks().best||0),t("wkBestS")]];
  const ri=ppStarted()&&!ppAllDone()?ppResumeInfo():null;
  B.innerHTML='<div class="wk-h"><span class="wk-hi" aria-hidden="true"><svg viewBox="0 0 24 24">'+WK_IC[0]+'</svg></span><div><h2 id="wkT">'+esc(t("wkT"))+'</h2><p>'+esc(t("wkRange")(fd(d.days[0]),fd(d.days[6])))+'</p></div>'+(valid?'<span class="wk-valid">🏆 '+esc(t("wkValid"))+'</span>':'')+'</div>'
    +'<div class="wk-tiles">'+tiles.map((x,i)=>'<div class="wk-tile"><span class="wk-ti c'+i+'" aria-hidden="true"><svg viewBox="0 0 24 24">'+WK_IC[i]+'</svg></span><b>'+esc(x[0])+'</b><small>'+esc(x[1])+'</small></div>').join("")+'</div>'
    +'<div class="wk-row"><div class="wk-left"><div class="wk-cal"><small class="pp-k">'+esc(t("wkYour"))+'</small><ol>'+d.days.map((k,i)=>'<li class="'+(d.played.includes(k)?"on":"")+'"><i>'+(d.played.includes(k)?'<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>':'')+'</i><span>'+esc(t("wkDOW")[i])+'</span></li>').join("")+'</ol></div>'
    +(d.n===1?'<p class="wk-one">'+esc(t("wkOne")(ri?ri.n:0))+'</p>':d.best?'<div class="wk-best"><small>'+esc(t("wkBest"))+'</small><b>'+esc(d.best.txt)+'</b>'+(d.best.stars?'<span aria-hidden="true">'+"★".repeat(d.best.stars)+'</span>':'')+'<span class="wk-bo" aria-hidden="true">'+(OBJ.moon?OBJ.moon():"")+'</span></div>':'')+'</div>'
    +'<div class="wk-goal"><b>'+esc(t("wkGoalQ")(g.v+" "+goalUnit(g)))+'</b><p>'+esc(t("wkGoalX")(d.goalOk,d.n))+'</p><div class="seg wk-adj" id="wkAdj">'+t("wkGoalB").map((x,i)=>'<button type="button" data-a="'+i+'" aria-pressed="'+(i===0)+'">'+esc(x)+'</button>').join("")+'</div>'
    +'<div class="wk-btns"><button class="btn" type="button" id="wkShare">'+esc(t("wkShare"))+'</button><button class="pp-main" type="button" id="wkGo">'+esc(t("wkGo"))+'</button></div></div></div>';
  let adj=0; $("wkAdj").querySelectorAll("button").forEach(b=>b.onclick=()=>{ adj=+b.dataset.a; $("wkAdj").querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",x===b)); });
  $("wkGo").onclick=()=>{ if(adj){ const L2=GOALS.filter(([k])=>k===g.kind).map(([,v])=>v), i=L2.indexOf(g.v), j=Math.max(0,Math.min(L2.length-1,i+(adj===1?1:-1))); if(L2[j]!==g.v){ goalSet(g.kind,L2[j]); toast(t("wkSaved")); } } closeMod("wkModal"); };
  $("wkShare").onclick=async()=>{ const file=await shareCard(t("wkT"), d.n+"/7", t("wkShareT")(d.n,fmtN(d.min)), "#1f7a52"); shareIt({text:t("wkShareT")(d.n,fmtN(d.min)), url:refLink(), file}); };
  if(!openMods.includes("wkModal")) openMod("wkModal"); else m.hidden=false; setTimeout(()=>{ try{ $("wkGo").focus({preventScroll:true}); }catch(e){} },30); }
document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="visible") setTimeout(wkCheck,900); });
setTimeout(wkCheck, 2600);

