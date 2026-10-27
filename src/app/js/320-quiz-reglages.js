// fragment de l'IIFE principale — ordre 320, voir src/app/README.md
// ---------- setup ----------
function renderQuiz(){ ["qzSetup","qzPlay","qzEnd"].forEach(id=>$(id).hidden = id!=="qz"+QZ.view[0].toUpperCase()+QZ.view.slice(1));
  if(QZ.view==="setup") renderQzSetup(); else if(QZ.view==="play") renderQzPlay(); else renderQzEnd(); }
function qzSeg(id,vals,cur,lbl,on){ const box=$(id); box.innerHTML=""; vals.forEach(v=>{ const b=document.createElement("button"); b.type="button"; b.textContent=lbl(v); b.setAttribute("aria-pressed",cur===v); b.onclick=()=>on(v); box.appendChild(b); }); }
// the zones of the shared piano drawn on a small keyboard: one colour, one name and its bounds per player
function qzZoneMap(c,zones){ const box=$("qzZoneMap"); box.innerHTML=""; const isW=m=>[0,2,4,5,7,9,11].includes(m%12);
  zones.forEach(([a,b],i)=>{ const z=document.createElement("div"); z.className="qz-zone"; z.style.setProperty("--pc",QZ_COLORS[i]); let w=0; for(let m=a;m<=b;m++) if(isW(m)) w++; z.style.flexGrow=w;
    let k='<svg viewBox="0 0 '+(w*10)+' 30" preserveAspectRatio="none" aria-hidden="true">', x=0; const xs={};
    for(let m=a;m<=b;m++) if(isW(m)){ xs[m]=x; k+='<rect x="'+(x*10+.5)+'" y="0" width="9" height="30" rx="1.5" class="zw"/>'; x++; }
    for(let m=a;m<=b;m++) if(!isW(m) && xs[m-1]!=null) k+='<rect x="'+(xs[m-1]*10+6.5)+'" y="0" width="6" height="18" rx="1" class="zb"/>';
    z.innerHTML='<span class="zl"><b></b><small></small></span>'+k+'</svg>'; nmPut(z.querySelector("b"),c.names[i]||t("qzPlayer")+" "+(i+1)); z.querySelector("small").textContent=qzMidiName(a)+" – "+qzMidiName(b);
    box.appendChild(z); }); }
const qzTabsMQ=matchMedia("(max-width:640px) and (min-height:421px)"); // phones upright: the quiz tab is full, the help goes to the players tab
// the help row: last row of the game settings card; with the two tabs (small screens) it goes to the Players tab, under the robots
function qzHelpPlace(){ const hb=$("qzHelpBox"); if(!hb) return; const on=qzCfg().where==="online";
  if(!qzTabsMQ.matches){ if(hb.parentElement!==$("qzConf")) $("qzConf").appendChild(hb); }
  else if(on){ if(hb.parentElement!==$("qzOnlineBox")) $("qzOnlineBox").appendChild(hb); }
  else if(hb.previousElementSibling!==$("qzBotLvlRow")) $("qzBotLvlRow").after(hb); }
qzTabsMQ.addEventListener&&qzTabsMQ.addEventListener("change",qzHelpPlace);
function renderQzSetup(){ const c=qzCfg(), fr=S.settings.lang==="fr", re=()=>{ save(); renderQzSetup(); }; qzHelpPlace();
  QZ.tab=QZ.tab||"quiz"; $("qzSetup").dataset.tab=QZ.tab; qzSeg("qzTabs",["quiz","players"],QZ.tab,v=>t(v==="quiz"?"qzTabQuiz":"qzTabPlayers"),v=>{ QZ.tab=v; renderQzSetup(); });
  const th=$("qzThemes"); th.innerHTML="";
  if(!QZ.data){ th.innerHTML='<p class="qz-load">'+t("qzLoading")+"</p>"; qzLoad().then(()=>{ if(page==="quiz") renderQuiz(); }).catch(()=>{ th.innerHTML='<p class="qz-load">'+t("qzLoadErr")+"</p>"; }); }
  else { const all=[["all",{fr:"Tous les thèmes",en:"All topics",img:"globe",col:"#4338ca"}],...Object.entries(QZ.data.themes)];
    all.forEach(([id,o])=>{ const n = id==="all" ? QZ.data.q.length : QZ.data.q.filter(q=>q[0]===id).length;
      const b=document.createElement("button"); b.type="button"; b.className="qz-theme"+(id==="all"?" qz-all":""); b.style.setProperty("--tc",o.col); b.setAttribute("aria-pressed",c.theme===id);
      b.innerHTML='<span class="qz-ti">'+(OBJ[o.img]?OBJ[o.img]():"")+'</span><b></b><small></small>'; b.querySelector("b").textContent=fr?o.fr:o.en; b.querySelector("small").textContent=n+" "+t("qzQuestions");
      b.onclick=()=>{ c.theme=id; re(); }; th.appendChild(b); }); }
  // Mode and difficulty: the same big choice cards (Notes / Chords, then Easy / Medium / Hard described for the mode)
  const card=(box,on,title,sub,fn)=>{ const b=document.createElement("button"); b.type="button"; b.className="qz-diff"; b.setAttribute("aria-pressed",on);
    b.innerHTML="<b></b><small></small>"; b.querySelector("b").textContent=title; b.querySelector("small").textContent=sub; b.onclick=fn; box.appendChild(b); };
  const al=$("qzAnsType"); al.innerHTML=""; ["notes","chords"].forEach(v=>card(al,c.ans===v,t(v==="notes"?"qzNotes":"qzChords"),t(v==="notes"?"qzAnsDN":"qzAnsDC"),()=>{ c.ans=v; re(); }));
  const dl=$("qzDiff"); dl.innerHTML=""; [1,2,3].forEach(v=>card(dl,c.diff===v,t("qzDiffs")[v-1],t(c.ans==="notes"?"qzDiffN":"qzDiffC")[v-1],()=>{ c.diff=v; re(); }));
  qzSeg("qzCount",[5,10,20,30],c.count,String,v=>{ c.count=v; re(); });
  qzSeg("qzTime",[5,10,20,30],c.time,v=>v+" s",v=>{ c.time=v; re(); });
  $("qzKeysOpt").checked=!!c.keys; $("qzHelpBox").title=t("qzKeysD");
  qzSeg("qzKeysSeg",[false,true],!!c.keys,v=>t(v?"qzHelpKeys":"qzHelpNo"),v=>{ c.keys=v; $("qzKeysOpt").checked=v; re(); });
  qzSeg("qzWhere",["local","online"],c.where,v=>t(v==="local"?"qzLocal":"qzOnline"),v=>{ c.where=v; save(); if(v==="online") netLobbyPeek(); else netLeave(); renderQzSetup(); });
  $("qzLocalBox").hidden = c.where!=="local"; $("qzOnlineBox").hidden = c.where!=="online"; qzHelpPlace();
  if(c.where==="online"){ renderQzNet(); return; }
  qzSeg("qzN",[1,2,3,4],c.n,v=>v===1?t("qzSoloT"):String(v),v=>{ c.n=v; c.bots=Math.min(c.bots,4-v); re(); });
  $("qzModeRow").hidden = c.n===1;
  qzSeg("qzMode",["dev","zone","turn"],c.mode,v=>t("qzModes")[["dev","zone","turn"].indexOf(v)],v=>{ c.mode=v; re(); });
  $("qzModeHelp").textContent = c.n===1 ? "" : t("qzModeD")[["dev","zone","turn"].indexOf(c.mode)];
  const devs=qzDevices(), midis=devs.filter(d=>d[0]!=="screen"), pl=$("qzPlayers"); pl.innerHTML=""; pl.dataset.mode=c.n>1?c.mode:"solo";
  // zones: the shared keyboard is chosen, and the zones are drawn on it
  const zm=c.n>1&&c.mode==="zone"; $("qzZoneDevRow").hidden=!zm||!midis.length;
  if(zm && midis.length){ if(!midis.some(d=>d[0]===c.zoneDev)) c.zoneDev=midis[0][0]; const zs=$("qzZoneDev"); zs.innerHTML=""; zs.setAttribute("aria-label",t("qzZoneKbd"));
    midis.forEach(([v,l])=>{ const o=document.createElement("option"); o.value=v; o.textContent=l; zs.appendChild(o); }); zs.value=c.zoneDev; zs.onchange=()=>{ c.zoneDev=zs.value; re(); }; }
  const zones=qzZones(c.n);
  // one keyboard each: each player picks among the keyboards + the screen; picking one already used swaps the two players
  if(c.n>1 && c.mode==="dev"){ for(let i=0;i<c.n;i++){ if(!devs.some(d=>d[0]===c.devs[i])){ const free=devs.find(d=>!c.devs.slice(0,c.n).includes(d[0])); c.devs[i]=(free||devs[0])[0]; } } }
  const dup = c.n>1 && c.mode==="dev" ? c.devs.slice(0,c.n).find((d,i,a)=>a.indexOf(d)!==i) : null;
  for(let i=0;i<c.n;i++){ const row=document.createElement("div"); row.className="qz-pl"; row.style.setProperty("--pc",QZ_COLORS[i]);
    row.innerHTML='<i></i><input type="text" maxlength="14" autocorrect="off" spellcheck="false" enterkeyhint="done"><span class="qz-pin"></span>'; const inp=row.querySelector("input"); inp.id="qzName"+i; inp.value=c.names[i]||t("qzPlayer")+" "+(i+1); inp.setAttribute("aria-label",t("qzPlayer")+" "+(i+1));
    inp.oninput=()=>{ c.names[i]=qzSafe(inp.value); save(); if(zm) qzZoneMap(c,zones); };
    const pin=row.querySelector(".qz-pin");
    if(c.n>1 && c.mode==="dev"){ const sel=document.createElement("select"); sel.id="qzDev"+i; sel.className="qz-sel"; sel.setAttribute("aria-label",t("qzKeyboard"));
      devs.forEach(([v,l])=>{ const o=document.createElement("option"); o.value=v; const j=c.devs.slice(0,c.n).indexOf(v); o.textContent=l+(j>=0&&j!==i?t("qzTaken")(pName(c.names[j]||t("qzPlayer")+" "+(j+1))):""); sel.appendChild(o); });
      sel.value=c.devs[i]; if(dup&&c.devs[i]===dup) row.classList.add("dup");
      sel.onchange=()=>{ const old=c.devs[i], j=c.devs.slice(0,c.n).indexOf(sel.value); if(j>=0&&j!==i) c.devs[j]=old; c.devs[i]=sel.value; re(); }; pin.appendChild(sel); }
    else if(zm) pin.textContent=qzMidiName(zones[i][0])+" – "+qzMidiName(zones[i][1]);
    else if(c.n>1) pin.textContent=t("qzTurnN")(i+1);
    pl.appendChild(row); }
  const warn=$("qzDevWarn"); warn.hidden=!dup && !(zm&&!midis.length); warn.textContent = zm&&!midis.length ? t("qzNoMidiZ") : dup==="screen" ? t("qzScreenOnce") : dup ? t("qzKbdOnce") : "";
  $("qzZoneMap").hidden=!zm; if(zm) qzZoneMap(c,zones);
  qzSmallShow(c,zm&&qzZoneSmall(zones),re); // Finitions: a keyboard too small for this many zones
  qzSeg("qzBots",[...Array(5-c.n).keys()],c.bots,String,v=>{ c.bots=v; re(); });
  $("qzBotLvlRow").hidden = !c.bots;
  qzSeg("qzBotLvl",[1,2,3],c.botLvl,v=>t("qzBotLvls")[v-1],v=>{ c.botLvl=v; re(); });
  const midiN=devs.length-1; $("qzMidiHint").textContent = midiN ? t("qzMidiOk")(midiN) : t("qzMidiNone");
  $("qzGo").disabled=!QZ.data || (zm&&qzZoneSmall(zones));
}
