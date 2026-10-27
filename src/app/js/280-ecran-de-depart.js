// fragment de l'IIFE principale — ordre 280, voir src/app/README.md
// ----- Start screen of a LEARN game: pick the scale / chord as cards, the timer and the helps, then play that one item -----
const SU_COL={chords:"#c9463c",scales:"#b4461a",harmony:"#2c56d6",prog:"#6a3fd1",ear:"#0e7490"};
const SU_NAME={chords:"secChords",scales:"secScales",harmony:"secHarmony",prog:"secProg",ear:"secEar"};
// a start-screen choice: one or more types, keys (simple = no sharp / flat in the name, all, or picked), then notes or chords, then the options
const LET_PC={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const keyPc = k => { const n=tonicNote(k); return ((LET_PC[n.l]+n.a)%12+12)%12; };
const keySimple = k => tonicNote(k).a===0;
function suState(sec){ S.settings.su=S.settings.su||{}; const st=S.settings.su[sec]||(S.settings.su[sec]={});
  const types=typeList(sec), open=id=>types.some(ty=>ty.id===id)&&typeOpenS(sec,id);
  if(!Array.isArray(st.tids)) st.tids = st.tid ? [st.tid] : [];
  st.tids=st.tids.filter(open); if(!st.tids.length){ const d=types.find(ty=>ty.id===S.settings[SEC[sec].view]&&open(ty.id))||types.find(ty=>open(ty.id))||types[0]; st.tids=[d.id]; }
  if(!["simple","all","pick"].includes(st.keys)) st.keys = st.k ? "pick" : "simple";
  if(!Array.isArray(st.picked)) st.picked = st.k && sec!=="ear" ? [keyPc(st.k)] : [0];
  if(!isPremium()){ if(st.keys!=="simple") st.keys="simple"; const fr=st.tids.filter(id=>!premType(sec,id)); if(fr.length!==st.tids.length) st.tids = fr.length ? fr : [types[0].id]; }
  st.tid=st.tids[0]; return st; }
function suKeys(sec,tid){ const st=suState(sec), open=openRoots(sec,tid);
  return open.filter(k => st.keys==="all" ? true : st.keys==="simple" ? keySimple(k) : st.picked.includes(keyPc(k))); }
function suQueue(sec){ const st=suState(sec), out=[];
  if(sec==="ear"){ const n=S.settings.gameLen&&isFinite(S.settings.gameLen)?S.settings.gameLen:10, all=st.tids.flatMap(tid=>openRoots(sec,tid).map(k=>({sec,tid,k}))); return Array.from({length:n},()=>({...all[Math.floor(Math.random()*all.length)]})); }
  st.tids.forEach(tid=>suKeys(sec,tid).forEach(k=>{
    if(sec==="chords"){ const ty=typeDef(sec,tid), invs=S.settings.invs.filter(i=>i<ty.iv.length); (invs.length?invs:[0]).forEach(inv=>out.push({sec,tid,k,inv})); }
    else if(sec==="harmony") S.settings.hdegs.slice().sort().forEach(deg=>out.push({sec,tid,k,deg}));
    else if(sec==="scales" && S.settings.scMode==="chords" && TYPE[tid].iv) out.push({sec,tid,k,ch:1});
    else out.push({sec,tid,k}); }));
  return st.shuffle ? qzShuffle(out) : out; }
function suItemLabel(it){ const sec=it.sec, ty=typeDef(sec,it.tid);
  if(sec==="chords") return noteName(tonicNote(it.k))+" "+SEC[sec].name(ty)+(it.inv?" · "+t("invNames")[it.inv]:"");
  return itemName(it); }
function suLabel(sec){ const st=suState(sec), q=suQueue(sec), fr=S.settings.lang==="fr";
  if(q.length===1 && sec!=="ear") return suItemLabel(q[0]);
  const names=st.tids.map(id=>SEC[sec].name(typeDef(sec,id))), tn = names.length<=2 ? names.join(", ") : names[0]+", "+names[1]+" +"+(names.length-2);
  if(sec==="ear") return tn;
  return tn+" · "+(st.keys==="all" ? t("suKeysAll") : st.keys==="simple" ? t("suKeysSimple") : [...new Set(q.map(it=>noteName(tonicNote(it.k))))].join(", ")); }
// the full summary (every type and key), for the tooltip of the shortened one
function suLabelFull(sec){ const st=suState(sec), q=suQueue(sec), names=st.tids.map(id=>SEC[sec].name(typeDef(sec,id))).join(", ");
  if(sec==="ear") return names; return names+" · "+(st.keys==="all" ? t("suKeysAll") : st.keys==="simple" ? t("suKeysSimple") : [...new Set(q.map(it=>noteName(tonicNote(it.k))))].join(", ")); }
function renderSetup(){
  const sec=S.section, st=suState(sec), col=SU_COL[sec], re=()=>{ save(); renderSetup(); };
  const h=$("suTitle"); h.style.setProperty("--mc",col); $("suIc").innerHTML=SEC_ICON(sec); $("suName").textContent=t(SU_NAME[sec]); $("suSub").textContent=t("suSub_"+sec);
  // 1. the types (several allowed)
  $("suTypesH").textContent=t(sec==="chords"?"suPickChord":sec==="ear"?"suPickEar":sec==="prog"?"suPickProg":"suPickScale");
  const tb=$("suTypes"); tb.innerHTML=""; tb.style.setProperty("--mc",col);
  typeList(sec).forEach(ty=>{ const open=typeOpenS(sec,ty.id), on=st.tids.includes(ty.id), b=document.createElement("button"); b.type="button"; b.className="su-card"; b.disabled=!open; b.setAttribute("aria-pressed",on);
    b.innerHTML="<i class='su-tick'></i><b></b><small></small>"; b.querySelector("b").textContent=SEC[sec].name(ty);
    b.querySelector("small").textContent= open ? (sec==="ear"?"":rootsOf(sec,ty.id).filter(k=>tileMast(sec,ty.id,k)>=3).length+" / "+rootsOf(sec,ty.id).length+" "+t("suMastered")) : t("lvlShort")+ty.lvl;
    b.onclick=()=>{ if(on){ if(st.tids.length>1) st.tids=st.tids.filter(x=>x!==ty.id); } else st.tids=[...st.tids,ty.id]; re(); };
    if(open && premType(sec,ty.id)){ b.classList.add("pw-lk"); b.insertAdjacentHTML("beforeend",pwChip()); b.onclick=()=>pwOpen("types"); } tb.appendChild(b); });
  // 2. the keys
  const kw=$("suKeysWrap"); kw.hidden = sec==="ear";
  if(sec!=="ear"){ const seg=$("suKeyMode"); seg.innerHTML=""; seg.style.setProperty("--mc",col);
    [["simple","suKeysSimple","suKeysSimpleD"],["all","suKeysAll","suKeysAllD"],["pick","suKeysPick","suKeysPickD"]].forEach(([v,l,d])=>{ const b=document.createElement("button"); b.type="button"; b.className="su-km"; b.setAttribute("aria-pressed",st.keys===v);
      b.innerHTML="<b></b><small></small>"; b.querySelector("b").textContent=t(l); b.querySelector("small").textContent=t(d); b.onclick=()=>{ st.keys=v; re(); };
      if(v!=="simple" && !isPremium()){ b.classList.add("pw-lk"); b.insertAdjacentHTML("beforeend",pwChip()); b.onclick=()=>pwOpen("keys"); } seg.appendChild(b); });
    const kb=$("suKeys"); kb.hidden = st.keys!=="pick"; kb.innerHTML=""; kb.style.setProperty("--mc",col);
    if(st.keys==="pick"){ const openPc=new Set(st.tids.flatMap(tid=>openRoots(sec,tid).map(keyPc)));
      const spell={}; st.tids.forEach(tid=>rootsOf(sec,tid).forEach(k=>{ const pc=keyPc(k); if(spell[pc]==null) spell[pc]=noteName(tonicNote(k)); }));
      [0,7,2,9,4,11,6,1,8,3,10,5].forEach(pc=>{ const b=document.createElement("button"); b.type="button"; b.className="su-key"; const ok=openPc.has(pc), on=st.picked.includes(pc); b.disabled=!ok; b.setAttribute("aria-pressed",on&&ok);
        b.innerHTML="<b></b>"; b.querySelector("b").textContent=spell[pc]||qzRoots()[pc]; b.title= ok ? "" : tx("lockedTip");
        b.onclick=()=>{ if(on){ if(st.picked.length>1) st.picked=st.picked.filter(x=>x!==pc); } else st.picked=[...st.picked,pc]; re(); }; kb.appendChild(b); }); }
    const locked=st.tids.reduce((a,tid)=>a+rootsOf(sec,tid).length-openRoots(sec,tid).length,0);
    $("suKeysHint").textContent = locked && !S.settings.unlockAll ? t("suLockedKeys")(locked) : "";
    $("suShuffle").checked=!!st.shuffle; }
  // extra choices for some topics
  const ex=$("suExtra"); ex.innerHTML="";
  const chipRow=(label,names,key,max)=>{ const w=document.createElement("div"); w.className="su-row"; w.innerHTML="<span class='su-lbl'></span><div class='su-chips'></div>"; w.firstChild.textContent=label;
    names.slice(0,max).forEach((nm,i)=>{ const b=document.createElement("button"); b.type="button"; b.textContent=nm; b.setAttribute("aria-pressed",S.settings[key].includes(i));
      b.onclick=()=>{ const set=new Set(S.settings[key]); if(set.has(i)){ if(set.size>1) set.delete(i); } else set.add(i); S.settings[key]=[...set].sort(); re(); }; w.lastChild.appendChild(b); }); ex.appendChild(w); };
  if(sec==="chords") chipRow(t("inversions"),t("invNames"),"invs",Math.max(...st.tids.map(id=>typeDef(sec,id).iv.length)));
  if(sec==="harmony") chipRow(t("degrees"),ROMAN,"hdegs",7);
  // 3. scales: notes or chords
  const sm=$("suMode"); sm.hidden = sec!=="scales"; sm.innerHTML="";
  if(sec==="scales"){ const anyChord=st.tids.some(id=>TYPE[id].iv); if(!anyChord && S.settings.scMode==="chords") S.settings.scMode="notes";
    [["notes",[0,2,4,5,7,9,11]],["chords",[0,4,7]]].forEach(([v,pcs])=>{ const b=document.createElement("button"); b.type="button"; b.className="su-mode"; b.style.setProperty("--mc",col);
      b.setAttribute("aria-pressed",(S.settings.scMode||"notes")===v); if(v==="chords" && !anyChord){ b.disabled=true; b.title=t("suNoChords"); }
      b.innerHTML='<span class="su-mk">'+qzKeys(pcs,"#ffb02e")+'</span><span><b></b><small></small></span>'; b.querySelector("b").textContent=t(v==="notes"?"suModeN":"suModeC"); b.querySelector("small").textContent=t(v==="notes"?"suModeND":"suModeCD");
      b.onclick=()=>{ S.settings.scMode=v; re(); }; sm.appendChild(b); });
    if(S.settings.scMode==="chords"){ const w=document.createElement("label"); w.className="su-help mini su-7"; w.innerHTML='<input type="checkbox"><span><b></b></span>'; const cb=w.querySelector("input"); cb.id="suSc7"; cb.checked=!!S.settings.sc7; w.querySelector("b").textContent=t("optSc7");
      cb.onchange=()=>{ S.settings.sc7=cb.checked; re(); }; sm.appendChild(w); } }
  // 4. timer and helps
  const tm=$("suTimer"); tm.innerHTML=""; [0,20,10,5].forEach(v=>{ const b=document.createElement("button"); b.type="button"; b.textContent=v?v+" s":t("noTimer"); b.setAttribute("aria-pressed",S.settings.delay===v); b.onclick=()=>{ setDelay(v); renderSetup(); }; tm.appendChild(b); });
  [["suHelpN","guideN"],["suHelpK","guideK"],["suHelpP","guideP"]].forEach(([id,k])=>{ $(id).checked=!!S.settings[k]; });
  $("suLabels").checked=!!S.settings.labels; $("suFing").checked=!!S.settings.fing; $("suStaff").checked=!!S.settings.staff;
  // summary
  ["suTypes","suKeys"].forEach(id=>ovFade($(id))); ex.querySelectorAll(".su-chips").forEach(c=>ovFade(c));
  const q=suQueue(sec); $("suSum").textContent=suLabel(sec); $("suSum").title=suLabelFull(sec); $("suCount").textContent=q.length ? t("suCount")(q.length, sec) : t("suNone");
  $("suGo").disabled=!q.length; $("suGo").style.setProperty("--mc",col);
}
function suStart(){ const sec=S.section, st=suState(sec), q=suQueue(sec); if(!q.length) return;
  S.settings[SEC[sec].view]=q[0].tid; S.settings[SEC[sec].sel]=st.tids.slice(); save();
  game=makeGame(q); game.label=suLabel(sec); game.single=q.length===1; game.i=-1; startRound(); }
$("suShuffle").addEventListener("change",e=>{ suState(S.section).shuffle=e.target.checked; save(); renderSetup(); });

$("suGo").addEventListener("click",suStart);
[["suHelpN","guideN"],["suHelpK","guideK"],["suHelpP","guideP"]].forEach(([id,k])=>$(id).addEventListener("change",e=>{ S.settings[k]=e.target.checked;
  if(k==="guideP" && e.target.checked){ S.settings.guideN=false; S.settings.guideK=false; } else if(e.target.checked) S.settings.guideP=false; save(); renderSetup(); renderGameBar(); }));
$("suLabels").addEventListener("change",e=>{ S.settings.labels=e.target.checked; save(); labelKeys(); renderSettings(); });
$("suFing").addEventListener("change",e=>{ S.settings.fing=e.target.checked; save(); fgRender(); renderSettings(); });
$("suStaff").addEventListener("change",e=>{ S.settings.staff=e.target.checked; if(!e.target.checked) S.settings.staffRead=false; save(); bravura(); renderSettings(); staffSoon(); });
$("suHow").addEventListener("click",()=>{ const b=document.getElementById("helpBtn"); if(b) b.click(); });

