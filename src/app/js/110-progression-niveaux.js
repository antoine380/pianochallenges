// fragment de l'IIFE principale — ordre 110, voir src/app/README.md
// ---------- Progression ----------
function levelInfo(xp){ let L=1, base=0, need=100; while(xp>=base+need){ base+=need; L++; need=100+(L-1)*40; } return {L, into:xp-base, need}; }
const CHAR_LVL=[1,3,5,7,10,13,16,20,25,30];
const xpForLevel = L => { let x=0; for(let l=1;l<L;l++) x+=100+(l-1)*40; return x; };
const charIndex = L => { let i=0; CHAR_LVL.forEach((lv,j)=>{ if(L>=lv) i=j; }); return i; };
const charName = i => { const c=t("chars")[i]; return c[0]+" · "+c[2]; };
const titleFor = L => t("acctLevel")+" "+L+" · "+t("chars")[charIndex(L)][2];
function avatarSVG(i){
  const E=(x,y,r=2.6)=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="#1b1d23"/><circle cx="'+(x+r*.35)+'" cy="'+(y-r*.35)+'" r="'+(r*.36)+'" fill="#fff"/>';
  const W=(c)=>'<path d="M19 44h-8M19 47l-7 2M45 44h8M45 47l7 2" stroke="'+c+'" stroke-width="1.2" stroke-linecap="round"/>';
  const bg=["#dfe6fa","#fbe3cf","#d5efe2","#f7dada","#e6dcf5","#e2e6ec","#fff1d6","#d5efe2","#fbe3cf","#dceef0"][i];
  const body=[
    '<circle cx="18" cy="22" r="10" fill="#a7adb9"/><circle cx="18" cy="22" r="5.5" fill="#f2b8c6"/><circle cx="46" cy="22" r="10" fill="#a7adb9"/><circle cx="46" cy="22" r="5.5" fill="#f2b8c6"/><ellipse cx="32" cy="38" rx="16" ry="15" fill="#b8bec9"/>'+E(26,36)+E(38,36)+'<circle cx="32" cy="43" r="2.4" fill="#e88aa0"/>'+W("#6b7180"),
    '<path d="M27 22q5-10 10-1z" fill="#8a5a32"/><circle cx="32" cy="38" r="17" fill="#b07a4a"/><ellipse cx="32" cy="46" rx="10" ry="8" fill="#ecd3b0"/>'+E(25,34)+E(39,34)+'<path d="M28.5 39h7L32 45z" fill="#f0a020"/>',
    '<path d="M16 31l2-19 12 11z" fill="#e39b4a"/><path d="M48 31l-2-19-12 11z" fill="#e39b4a"/><path d="M19 27l1-10 6 6z" fill="#f6c9a0"/><path d="M45 27l-1-10-6 6z" fill="#f6c9a0"/><ellipse cx="32" cy="37" rx="17" ry="15" fill="#e9a456"/><path d="M32 23v5M27 24l1 4M37 24l-1 4" stroke="#c9772b" stroke-width="2" stroke-linecap="round"/>'+E(25,35)+E(39,35)+'<path d="M30 41h4l-2 2.4z" fill="#d9607a"/><path d="M32 43.4q-2 2-4 1M32 43.4q2 2 4 1" stroke="#6b4a2a" stroke-width="1.2" fill="none" stroke-linecap="round"/>'+W("#8a5a32"),
    '<ellipse cx="25" cy="16" rx="5" ry="13" fill="#f5f2ec"/><ellipse cx="25" cy="17" rx="2.4" ry="9" fill="#f2b8c6"/><ellipse cx="39" cy="16" rx="5" ry="13" fill="#f5f2ec"/><ellipse cx="39" cy="17" rx="2.4" ry="9" fill="#f2b8c6"/><ellipse cx="32" cy="40" rx="15" ry="14" fill="#f5f2ec"/><circle cx="23" cy="44" r="3" fill="#f2b8c6" opacity=".6"/><circle cx="41" cy="44" r="3" fill="#f2b8c6" opacity=".6"/>'+E(26,38)+E(38,38)+'<ellipse cx="32" cy="44" rx="2.4" ry="1.8" fill="#e88aa0"/><rect x="30.5" y="46" width="3" height="3" rx=".6" fill="#fff" stroke="#c9ced8" stroke-width=".6"/>',
    '<path d="M18 22l-2-10 10 6z" fill="#8a6a4a"/><path d="M46 22l2-10-10 6z" fill="#8a6a4a"/><rect x="15" y="17" width="34" height="36" rx="15" fill="#8a6a4a"/><circle cx="25" cy="33" r="8" fill="#f3e3c8"/><circle cx="39" cy="33" r="8" fill="#f3e3c8"/>'+E(25,33,3.6)+E(39,33,3.6)+'<path d="M30 38h4l-2 5z" fill="#f0a020"/><path d="M26 47l2 2 2-2M34 47l2 2 2-2" stroke="#5e4630" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    '<path d="M16 28l3-14 10 8z" fill="#6f7684"/><path d="M48 28l-3-14-10 8z" fill="#6f7684"/><path d="M19 25l1.5-7 5 4z" fill="#c8ccd4"/><path d="M45 25l-1.5-7-5 4z" fill="#c8ccd4"/><ellipse cx="32" cy="38" rx="18" ry="15" fill="#a2a8b4"/><path d="M32 23v7" stroke="#6f7684" stroke-width="3" stroke-linecap="round"/><path d="M14 36q9-9 18-2 9-7 18 2-9 6-18 0-9 6-18 0z" fill="#2a2d35"/><circle cx="24" cy="36" r="3.2" fill="#fff"/><circle cx="40" cy="36" r="3.2" fill="#fff"/><circle cx="24.4" cy="36" r="1.8" fill="#1b1d23"/><circle cx="39.6" cy="36" r="1.8" fill="#1b1d23"/><ellipse cx="32" cy="45" rx="7" ry="5" fill="#eef0f3"/><ellipse cx="32" cy="42.6" rx="2.6" ry="1.8" fill="#1b1d23"/>',
    '<path d="M15 31l3-20 12 11z" fill="#e07a2f"/><path d="M49 31l-3-20-12 11z" fill="#e07a2f"/><path d="M18.5 26l1-11 6.5 6z" fill="#3a2a20"/><path d="M45.5 26l-1-11-6.5 6z" fill="#3a2a20"/><path d="M14 32Q32 14 50 32Q46 48 32 53Q18 48 14 32z" fill="#e8823a"/><path d="M16 36Q25 40 32 53Q39 40 48 36Q45 48 32 53Q19 48 16 36z" fill="#fbf3ea"/>'+E(25,33)+E(39,33)+'<circle cx="32" cy="49" r="2.4" fill="#1b1d23"/>',
    '<circle cx="18" cy="22" r="7" fill="#1b1d23"/><circle cx="46" cy="22" r="7" fill="#1b1d23"/><ellipse cx="32" cy="38" rx="18" ry="16" fill="#fbfbf8" stroke="#d8dbe2"/><ellipse cx="24.5" cy="36" rx="5" ry="6.5" transform="rotate(-25 24.5 36)" fill="#1b1d23"/><ellipse cx="39.5" cy="36" rx="5" ry="6.5" transform="rotate(25 39.5 36)" fill="#1b1d23"/><circle cx="25" cy="35" r="1.8" fill="#fff"/><circle cx="39" cy="35" r="1.8" fill="#fff"/><ellipse cx="32" cy="43" rx="2.8" ry="2" fill="#1b1d23"/><path d="M32 45q-2 2.5-4 1M32 45q2 2.5 4 1" stroke="#1b1d23" stroke-width="1.2" fill="none" stroke-linecap="round"/>',
    [0,30,60,90,120,150,180,210,240,270,300,330].map(a=>'<circle cx="'+(32+19*Math.cos(a*Math.PI/180)).toFixed(1)+'" cy="'+(36+19*Math.sin(a*Math.PI/180)).toFixed(1)+'" r="7" fill="#c77d2a"/>').join("")+'<circle cx="32" cy="36" r="19" fill="#c77d2a"/><circle cx="21.5" cy="26" r="4" fill="#e0a94a"/><circle cx="42.5" cy="26" r="4" fill="#e0a94a"/><circle cx="32" cy="37" r="14" fill="#f2c66d"/>'+E(27,35)+E(37,35)+'<ellipse cx="32" cy="42.5" rx="6" ry="4.5" fill="#fbe3b0"/><path d="M29.5 39.5h5L32 42.1z" fill="#6b3f1c"/>',
    '<path d="M21 24l-4-15 10 11z" fill="#f3e3b5"/><path d="M43 24l4-15-10 11z" fill="#f3e3b5"/><path d="M26 22l3-6 3 5 3-5 3 6z" fill="#3f8a59"/><ellipse cx="32" cy="37" rx="18" ry="16" fill="#4fa36b"/><ellipse cx="32" cy="45" rx="10" ry="7" fill="#7cc191"/><circle cx="29" cy="44" r="1.2" fill="#1f4d30"/><circle cx="35" cy="44" r="1.2" fill="#1f4d30"/><circle cx="25" cy="33" r="3.6" fill="#f6d34a"/><circle cx="39" cy="33" r="3.6" fill="#f6d34a"/><ellipse cx="25" cy="33" rx="1" ry="2.8" fill="#1b1d23"/><ellipse cx="39" cy="33" rx="1" ry="2.8" fill="#1b1d23"/>'
  ][i];
  return '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="32" fill="'+bg+'"/><g>'+body+'</g></svg>';
}
const typeOpenS = (sec,tid) => S.settings.unlockAll || levelInfo(S.xp).L>=typeDef(sec,tid).lvl;
const typeOpen = tid => typeOpenS("scales",tid);
const earOpen = (cat,id) => S.settings.unlockAll || levelInfo(S.xp).L>=earAnswers(cat).find(a=>a.id===id).lvl;
function openRoots(sec,tid){
  const list=rootsOf(sec,tid);
  if(sec==="ear") return list.filter(id=>earOpen(tid,id));
  if(S.settings.unlockAll) return list.slice();
  const m=list.filter(k=>tileMast(sec,tid,k)>=3).length; return list.slice(0, Math.min(12, 3+m));
}
const openTonics = tid => openRoots("scales",tid);
function activeTypes(sec){
  const a=S.settings[SEC[sec].sel].filter(id=>typeOpenS(sec,id)); return a.length?a:[SEC[sec].def];
}
function pool(){
  const all=poolAll(), f=focusOf(S.section);
  if(f.length && S.section!=="ear"){ const only=all.filter(x=>f.includes(x.k)); if(only.length) return only; }
  return all;
}
function poolAll(){
  const sec=S.section, act=activeTypes(sec), out=[];
  if(sec==="ear"){ act.forEach(cat=>openRoots(sec,cat).forEach(k=>out.push({sec,tid:cat,k}))); return out; }
  const invs=S.settings.invs.slice().sort(), degs=S.settings.hdegs.slice().sort();
  for(let r=0;r<12;r++) typeList(sec).forEach(ty=>{
    if(!act.includes(ty.id)) return; const k=rootsOf(sec,ty.id)[r]; if(!openRoots(sec,ty.id).includes(k) && !focusOf(sec).includes(k)) return;
    if(sec==="chords"){ const ok=invs.filter(i=>i<ty.iv.length); (ok.length?ok:[0]).forEach(inv=>out.push({sec,tid:ty.id,k,inv})); }
    else if(sec==="harmony") degs.forEach(deg=>out.push({sec,tid:ty.id,k,deg}));
    else if(sec==="scales" && S.settings.scMode==="chords"){ if(TYPE[ty.id].iv) out.push({sec,tid:ty.id,k,ch:1}); } // pentatonic / blues scales have no chord per degree
    else out.push({sec,tid:ty.id,k});
  });
  if(!out.length && sec==="scales" && S.settings.scMode==="chords"){ const m=S.settings.scMode; S.settings.scMode="notes"; const o=poolAll(); S.settings.scMode=m; return o; }
  return out;
}
let lvlUp=0; // level reached during the current LEARN game (not saved): celebrated when the game ends, then #lvlAv pulses once
function addXP(n){
  if(n>0) bumpStreak();
  S.xpDays=S.xpDays||{}; const dk=dayStr(); S.xpDays[dk]=(S.xpDays[dk]||0)+n;
  const before=levelInfo(S.xp).L; S.xp+=n; const after=levelInfo(S.xp).L;
  if(after>before){
    if(game && (page==="practice"||page==="daily")) lvlUp=after; else toast(titleFor(after)); // LEARN: celebrated in #endNext at the end of the game
    try{ ntfLevel(after); }catch(e){}
    const unl=[]; SECS.forEach(sec=>typeList(sec).forEach(ty=>{ const key=sec==="scales"?ty.id:sec+":"+ty.id;
      if(typeOpenS(sec,ty.id) && !S.seenTypes.includes(key)){ S.seenTypes.push(key); if(ty.lvl>1) unl.push(SEC[sec].name(ty)); } }));
    // one notification for everything a new level opens (not 9 « New exercise unlocked » in a row)
    if(unl.length===1) unlockNote(t("newType")+unl[0]);
    else if(unl.length>1) try{ ntfAdd({key:"unl-lvl-"+after, cat:"progress", type:"unlock", ti:t("ntfUnlockN")(unl.length), tx:t("newType")+unl.join(", "), act:{k:"learn",l:"ntfPlay"}}); }catch(e){}
  }
  try{ goalTick(); }catch(e){}
}
const effStreak = () => S.streak && (S.streak.last===dayStr()||S.streak.last===addDays(-1)) ? S.streak.days|0 : 0; // a streak not kept yesterday is over
function bumpStreak(){
  const today=dayStr();
  if(S.streak.last===today) return;
  try{ freezeCheck(); }catch(e){} // Objectif: a missed day covered by a freeze keeps the streak going
  const y=addDays(-1);
  S.streak.days = S.streak.last===y ? S.streak.days+1 : 1; S.streak.last=today;
  try{ freezeEarn(); }catch(e){}
}
function setMastery(it,v){
  const before=openRoots(it.sec,it.tid);
  S.mastery[mkey(it)]=Math.max(0,Math.min(5,v));
  if(it.sec==="ear") return;
  openRoots(it.sec,it.tid).filter(x=>!before.includes(x)).forEach(x=>{
    const label = it.sec==="scales" ? t("newScale")+scaleName(it.tid,x) : it.sec==="chords" ? t("newChord")+chordName(it.tid,x)
      : t("newType")+scaleName(it.sec==="harmony"?HTYPE[it.tid].scale:PROG[it.tid].scale, x);
    unlockNote(label); });
}

