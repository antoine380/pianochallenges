// fragment de l'IIFE principale — ordre 570, voir src/app/README.md
/* ==== Import de morceaux (MIDI / MusicXML, chantier IMPORT) ==== */
// PLAY › « Mes morceaux » : a row after the catalogue with an « Import a song » tile and the player's own songs. The file is read here
// (assets/js/song-import.js, loaded on demand), converted to the catalogue's format and kept on this device only (IndexedDB "pc-import",
// memory fallback window.PC_IMP_MEM shared with the player frame). Never uploaded; track() only gets {fmt, n, ok, err}.
// Views of the PLAY page (PC.view): "imp" = preview (tracks, hands, options), "help" = how to import (4 steps + FAQ), "mine" = manage list.
const IMP={list:[], loaded:false, loading:null, draft:null, err:null, editId:null, ren:null, del:null, from:"cat", step:0};
const IMP_COL=["#6a3fd1","#2c56d6","#0e7490","#1f7a52","#b4461a","#a3306b","#c9463c","#8a3fd1"];
const impT = k => t("impTx")[k];
function impLib(){ if(window.PCImp) return Promise.resolve();
  if(!IMP.loading) IMP.loading=new Promise((res,rej)=>{ const sc=document.createElement("script"); sc.src="assets/js/song-import.js"; sc.async=true; sc.onload=()=>res(); sc.onerror=()=>{ IMP.loading=null; rej(); }; document.head.appendChild(sc); });
  return IMP.loading; }
async function impRefresh(){ try{ await impLib(); IMP.list=await PCImp.db.list(); }catch(e){ IMP.list=[]; } IMP.loaded=true; }
const impDur = sec => { sec=Math.max(1,Math.round(sec)); return sec<60 ? sec+" s" : Math.floor(sec/60)+" min"+(sec%60?" "+String(sec%60).padStart(2,"0"):""); };
const impNote = m => (S.settings.notation==="fr"?PC_FR:PC_EN)[((m%12)+12)%12]+(Math.floor(m/12)-(S.settings.notation==="fr"?2:1)); // as octName: middle C = Do3 / C4
const impKey = k => { const n=(S.settings.notation==="fr"?PC_FR:PC_EN)[k.pc]; return S.settings.lang==="fr" ? (k.minor ? n.toLowerCase()+" mineur" : n+" majeur") : n+(k.minor?" minor":" major"); };
function impDevice(){ const ua=navigator.userAgent||"", ios=/iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints>1);
  if(ios) return isApp() ? "iosApp" : "iosWeb"; if(/Android/.test(ua)) return "android"; if(/Macintosh/.test(ua)) return "mac"; if(/Windows/.test(ua)) return "win"; return "other"; }
// ---- the hidden file input: no accept attribute (iOS greys out .musicxml / .mxl, which have no system type): the content is checked after reading
function impPick(){ let i=$("impFile"); if(!i){ i=document.createElement("input"); i.type="file"; i.id="impFile"; i.hidden=true; i.setAttribute("aria-hidden","true"); i.tabIndex=-1; document.body.appendChild(i);
    i.addEventListener("change",()=>{ const f=i.files&&i.files[0]; i.value=""; if(f) impFile(f); }); }
  i.click(); }
function impFail(code){ IMP.err=code; IMP.draft=null; PC.view="imp"; renderPlaySongs(); try{ track("song_import",{fmt:"?",n:0,ok:false,err:code}); }catch(e){} }
async function impFile(f){ IMP.editId=null; impTipDone();
  try{ await impLib(); }catch(e){ impFail("load"); return; }
  if(!IMP.loaded) await impRefresh();
  if(IMP.list.length>=PCImp.MAX_SONGS){ impFail("full"); return; }
  if(f.size>PCImp.MAX_BYTES){ impFail("size"); return; }
  let model; try{ model=await PCImp.parse(f.name, await f.arrayBuffer()); }catch(e){ impFail(e&&e.code||"format"); return; }
  const roles=PCImp.autoRoles(model), lh=model.tracks.some(x=>roles[x.id]==="lh"||roles[x.id]==="both");
  IMP.err=null; IMP.draft={model, title:model.title, opts:{roles, tr:0, mono:true, q:4, lv:lh?2:1}};
  PC.view="imp"; PC.kb=false; if(page!=="free") openPage("free"); renderPlaySongs(); }
function impConv(){ const d=IMP.draft; return PCImp.convert(d.model,d.opts); }
async function impSave(){ const d=IMP.draft; if(!d) return null; const c=impConv(); if(!c.notes.length) return null;
  const old=IMP.editId ? IMP.list.find(r=>r.id===IMP.editId) : null;
  const rec={ id: old?old.id:PCImp.newId(), title:(d.title||"").trim().slice(0,60)||d.model.title, fmt:d.model.fmt, created: old?old.created:Date.now(), n:c.notes.length,
    dur:Math.round(c.end/c.bpm*60), model:d.model, opts:{...d.opts}, best: old&&old.best || {stars:0,score:0} };
  const where=await PCImp.db.put(rec); IMP.mem = where==="mem";
  if(!old) try{ track("song_import",{fmt:d.model.fmt, n:c.notes.length, ok:true}); }catch(e){}
  await impRefresh(); return rec; }
async function impPlay(){ const d=IMP.draft; if(!d) return; const rec=await impSave(); if(!rec) return; const lv=d.opts.lv===2&&impConv().nL?2:1;
  IMP.draft=null; IMP.editId=null; PC.view="cat"; openPlayWith("#song=imp:"+rec.id+"&arr="+lv); }
function impPlayRec(r){ const lv=r.opts&&r.opts.lv===2?2:1; openPlayWith("#song=imp:"+r.id+"&arr="+lv); }
function impEdit(r){ IMP.editId=r.id; IMP.err=null; IMP.draft={model:r.model, title:r.title, opts:{...r.opts, roles:{...r.opts.roles}}}; PC.view="imp"; renderPlaySongs(); }
const impBest = r => { const b=pcBest(); return Math.max(r.best&&r.best.stars|0, b["imp:"+r.id]|0, b["imp:"+r.id+"@2"]|0); };
// ---- first-use bubble (once per device: closed, tutorial opened or a song imported)
const impTipOn = () => { try{ return !localStorage.getItem("pc-imp-tip"); }catch(e){ return false; } };
function impTipDone(){ try{ localStorage.setItem("pc-imp-tip","1"); }catch(e){} document.querySelectorAll(".imp-tip").forEach(e=>e.remove()); const hb=$("impHelpBtn"); if(hb) hb.hidden=false; }
function impHelp(from){ impTipDone(); IMP.from=from||PC.view||"cat"; PC.view="help"; PC.kb=false; renderPlaySongs(); }

// ---- the « My songs » chip of the PLAY bar (the catalogue keeps its 5 rows: no page scroll) and its first-use bubble
const IMP_ICO='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 7.5a2 2 0 012-2h4l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2h-13a2 2 0 01-2-2z"/><path d="M12 10.5v6M9 13.5h6"/></svg>';
function impChip(){ const bar=$("pcBar"); if(!bar) return; const mine=["imp","help","mine"].includes(PC.view) && !PC.kb;
  if(mine){ bar.hidden=false; bar.querySelectorAll("[data-lv]").forEach(x=>x.setAttribute("aria-pressed","false")); }
  const n=IMP.list.length, b=document.createElement("button"); b.type="button"; b.className="pc-chip pc-mine"; b.id="pcMine"; b.setAttribute("aria-pressed",mine);
  b.innerHTML=IMP_ICO+'<span></span>'+(n?'<em class="pc-n"></em>':''); b.querySelector("span").textContent=t("impRow"); if(n) b.querySelector("em").textContent=n;
  b.setAttribute("aria-label",t("impRow")+(n?" · "+t("impCount")(n):"")); b.title=impT("addS");
  b.onclick=()=>{ impTipDone(); PC.kb=false; PC.view = PC.view==="mine" ? "cat" : "mine"; IMP.ren=IMP.del=null; renderPlaySongs(); };
  const fr=$("pcFree"); bar.insertBefore(b, fr||null); }
function impTip(){ document.getElementById("impTip")?.remove(); const c=$("pcMine"); if(!c || !impTipOn() || page!=="free" || PC.view!=="cat" || PC.kb) return;
  const panel=$("freePanel"), pr=panel.getBoundingClientRect(), r=c.getBoundingClientRect(); if(!r.width || r.right>innerWidth+1) return;
  const tip=document.createElement("div"); tip.id="impTip"; tip.className="imp-tip"; tip.setAttribute("role","note");
  tip.innerHTML='<b></b><span class="imp-tip-r"><button type="button" class="imp-tip-go"></button><button type="button" class="imp-tip-x"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></span>';
  tip.querySelector("b").textContent=impT("tip"); tip.querySelector(".imp-tip-go").textContent=impT("how"); tip.querySelector(".imp-tip-go").onclick=()=>impHelp("cat");
  tip.querySelector(".imp-tip-x").setAttribute("aria-label",t("close")); tip.querySelector(".imp-tip-x").onclick=impTipDone;
  panel.appendChild(tip); const w=tip.offsetWidth, x=Math.max(4, Math.min(r.left+r.width/2-pr.left-w/2, pr.width-w-4));
  tip.style.left=x+"px"; tip.style.top=(r.bottom-pr.top+10)+"px"; tip.style.setProperty("--ax",(r.left+r.width/2-pr.left-x)+"px"); }
addEventListener("resize",()=>{ if(page==="free") impTip(); });
// ---- small SVG preview of a track (a piano roll squeezed into one line)
function impRoll(x,col){ const ns=x.notes, end=Math.max(1,...ns.map(n=>n.s+n.d)), lo=x.lo, sp=Math.max(1,x.hi-lo), k=Math.max(1,Math.ceil(ns.length/600));
  let r=""; for(let i=0;i<ns.length;i+=k){ const n=ns[i]; r+='<rect x="'+(n.s/end*300).toFixed(1)+'" y="'+(19-(n.m-lo)/sp*16).toFixed(1)+'" width="'+Math.max(1.4,n.d/end*300-.6).toFixed(1)+'" height="3" rx="1.2"/>'; }
  return '<svg class="imp-roll" viewBox="0 0 300 24" preserveAspectRatio="none" aria-hidden="true" style="fill:'+col+'">'+r+'</svg>'; }
const impTrackName = (x,i) => x.name || (x.drum ? t("impGm")[16] : x.prog>=0 ? t("impGm")[x.prog>>3] : impT("track")+" "+(i+1));
const IMP_ROLE_COL={rh:"#7a5bf5", lh:"#c9463c", both:"#0e7490", off:"#8a86a8"};

// ---- the preview screen
function impRender(){ const box=$("impPanel"); box.innerHTML=""; box.dataset.v=PC.view;
  if(PC.view==="help") return impRenderHelp(box); if(PC.view==="mine") return impRenderMine(box);
  const card=document.createElement("div"); card.className="imp-card"; box.appendChild(card);
  const x=document.createElement("button"); x.type="button"; x.className="gr-x imp-x"; x.id="impClose"; x.setAttribute("aria-label",t("close")); x.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  x.onclick=()=>{ IMP.draft=null; IMP.err=null; IMP.editId=null; PC.view="cat"; renderPlaySongs(); }; card.appendChild(x);
  if(IMP.err || !IMP.draft){ const code=IMP.err||"format", e=t("impErr");
    card.insertAdjacentHTML("beforeend",'<div class="imp-errb" role="alert"><span class="imp-fi err" aria-hidden="true">!</span><div><h3></h3><p></p></div></div><div class="imp-acts"><button type="button" class="btn primary" id="impRetry"></button><button type="button" class="btn" id="impErrHelp"></button></div>');
    card.querySelector("h3").textContent=impT("errT"); card.querySelector(".imp-errb p").textContent=e[code]||e.format;
    $("impRetry").textContent=code==="full"?t("impRow"):impT("other"); $("impRetry").onclick=code==="full"?()=>{ PC.view="mine"; renderPlaySongs(); }:impPick;
    $("impErrHelp").textContent=impT("how"); $("impErrHelp").onclick=()=>impHelp("imp"); return; }
  const d=IMP.draft, m=d.model, c=impConv(), key=PCImp.keyOf(m,d.opts), kk={pc:((key.pc+d.opts.tr)%12+12)%12, minor:key.minor};
  const ext=m.fmt==="mid"?".mid":m.fmt==="mxl"?".mxl":".xml";
  card.insertAdjacentHTML("beforeend",'<div class="imp-top"><span class="imp-fi" aria-hidden="true"></span><div class="imp-tt"><span class="imp-k"></span><input id="impTitle" class="imp-title" maxlength="60" autocomplete="off" spellcheck="false"><small class="imp-meta" id="impMeta"></small></div><button type="button" class="imp-hb" id="impHelp2"><span aria-hidden="true">?</span><span></span></button></div>'
    +'<div class="imp-body"><section class="imp-tracks" aria-labelledby="impTrH"><h4 id="impTrH"></h4><div class="imp-tl" id="impTracks"></div></section>'
    +'<section class="imp-opts"><h4></h4><div class="imp-opt"><span></span><div class="imp-seg" id="impLv" role="group"></div></div>'
    +'<div class="imp-opt"><span></span><div class="imp-tr"><button type="button" class="imp-sq" id="impTrM">−</button><b id="impTrV"></b><button type="button" class="imp-sq" id="impTrP">+</button><button type="button" class="imp-pill" id="impEasy"></button></div></div>'
    +'<div class="imp-opt"><span></span><div class="imp-seg" id="impQ" role="group"></div></div>'
    +'<label class="imp-ck"><input type="checkbox" id="impMono"><span></span></label>'
    +'<p class="imp-key" id="impKeyL"></p></section></div>'
    +'<div class="imp-foot"><p class="imp-priv"></p><button type="button" class="btn primary imp-go" id="impGo"><span></span><kbd class="kn">'+(S.settings.notation==="fr"?"Do":"C")+'</kbd></button></div>');
  card.querySelector(".imp-fi").textContent=ext; card.querySelector(".imp-k").textContent=IMP.editId?impT("editK"):impT("previewK");
  const ti=$("impTitle"); ti.value=d.title; ti.setAttribute("aria-label",impT("titleL")); ti.oninput=()=>{ d.title=ti.value.replace(/[<>&"]/g,""); };
  ti.onkeydown=e=>{ if(e.key==="Enter") ti.blur(); };
  $("impHelp2").lastChild.textContent=impT("how"); $("impHelp2").setAttribute("aria-label",impT("howL")); $("impHelp2").onclick=()=>impHelp("imp");
  $("impMeta").textContent=[t("impTracks")(m.tracks.length), impDur(c.end/c.bpm*60), c.bpm+" BPM", m.meter.join("/"), c.notes.length+" "+impT("notes")].join(" · ");
  card.querySelector("#impTrH").textContent=impT("tracksH");
  const tl=$("impTracks");
  m.tracks.forEach((x,i)=>{ const role=d.opts.roles[x.id]||"off", row=document.createElement("div"); row.className="imp-trk"+(role==="off"?" off":""); row.dataset.t=x.id; row.style.setProperty("--rc",IMP_ROLE_COL[role]);
    row.innerHTML='<i class="imp-bar" aria-hidden="true"></i><div class="imp-ti"><b></b><small></small>'+impRoll(x,IMP_ROLE_COL[role])+'</div><div class="imp-seg imp-role" role="group"></div>';
    row.querySelector("b").textContent=impTrackName(x,i);
    row.querySelector("small").textContent=x.drum ? impT("drums") : impT("range")(impNote(x.lo),impNote(x.hi))+" · "+x.notes.length+" "+impT("notes");
    const g=row.querySelector(".imp-role"); g.setAttribute("aria-label",impTrackName(x,i));
    ["rh","lh","both","off"].forEach(k=>{ const b=document.createElement("button"); b.type="button"; b.dataset.r=k; b.textContent=impT("role")[k]; b.title=impT("roleL")[k]; b.setAttribute("aria-pressed",role===k);
      b.onclick=()=>{ d.opts.roles[x.id]=k; const lh=impConv().nL>0; if(!lh) d.opts.lv=1; else if(k==="lh"||k==="both") d.opts.lv=2; impRender(); }; g.appendChild(b); });
    tl.appendChild(row); });
  const opts=card.querySelector(".imp-opts"), labs=opts.querySelectorAll(".imp-opt>span");
  opts.querySelector("h4").textContent=impT("optsH"); labs[0].textContent=impT("versionH"); labs[1].textContent=impT("trH"); labs[2].textContent=impT("qH");
  const seg=(el,items,cur,fn)=>items.forEach(([v,l,dis])=>{ const b=document.createElement("button"); b.type="button"; b.dataset.v=v; b.textContent=l; b.setAttribute("aria-pressed",cur===v); if(dis){ b.disabled=true; b.title=impT("noLh"); } b.onclick=()=>{ fn(v); impRender(); }; el.appendChild(b); });
  seg($("impLv"),[[1,impT("easy")],[2,impT("two"),!c.nL]],c.nL?d.opts.lv:1,v=>d.opts.lv=v); $("impLv").setAttribute("aria-label",impT("versionH"));
  seg($("impQ"),[[0,impT("qOff")],[2,"1/8"],[4,"1/16"]],d.opts.q,v=>d.opts.q=v); $("impQ").setAttribute("aria-label",impT("qH"));
  $("impTrV").textContent=(d.opts.tr>0?"+":"")+d.opts.tr; $("impTrM").disabled=d.opts.tr<=-6; $("impTrP").disabled=d.opts.tr>=6;
  $("impTrM").setAttribute("aria-label",impT("trDown")); $("impTrP").setAttribute("aria-label",impT("trUp"));
  $("impTrM").onclick=()=>{ d.opts.tr=Math.max(-6,d.opts.tr-1); impRender(); }; $("impTrP").onclick=()=>{ d.opts.tr=Math.min(6,d.opts.tr+1); impRender(); };
  const ez=PCImp.easyTr(m,d.opts); $("impEasy").textContent=impT("easyKey"); $("impEasy").setAttribute("aria-pressed",d.opts.tr===ez && ez!==0); $("impEasy").onclick=()=>{ d.opts.tr=ez; impRender(); };
  $("impMono").checked=!!d.opts.mono; $("impMono").onchange=e=>{ d.opts.mono=e.target.checked; impRender(); }; opts.querySelector(".imp-ck span").textContent=impT("mono");
  $("impKeyL").textContent=impT("keyL")(impKey(kk));
  card.querySelector(".imp-priv").textContent=impT("priv");
  $("impGo").firstChild.textContent=impT("play"); $("impGo").disabled=!c.notes.length; $("impGo").onclick=impPlay; }

// ---- « My songs »: play, settings, rename, delete
function impRenderMine(box){ const card=document.createElement("div"); card.className="imp-card imp-coll"; box.appendChild(card);
  card.insertAdjacentHTML("beforeend",'<button type="button" class="gr-x imp-x" id="impClose"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>'
    +'<div class="imp-top"><span class="imp-fi imp-fo" aria-hidden="true">'+IMP_ICO+'</span><div class="imp-tt"><h3 class="imp-h"></h3><small class="imp-meta"></small></div><button type="button" class="imp-hb" id="impHelpBtn"><span aria-hidden="true">?</span><span></span></button></div>'
    +'<div class="imp-cb"><button type="button" class="imp-add" id="impAdd">'+'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><b></b><small></small><small class="imp-drop"></small></button><ul class="imp-mine" id="impMine"></ul></div>');
  $("impClose").setAttribute("aria-label",t("close")); $("impClose").onclick=()=>{ PC.view="cat"; renderPlaySongs(); };
  card.querySelector(".imp-h").textContent=t("impRow"); card.querySelector(".imp-meta").textContent=impT("kept")(IMP.list.length,window.PCImp?PCImp.MAX_SONGS:50);
  const hb=$("impHelpBtn"); hb.lastChild.textContent=impT("how"); hb.setAttribute("aria-label",impT("howL")); hb.onclick=()=>impHelp("mine");
  const add=$("impAdd"); add.querySelector("b").textContent=impT("add"); add.querySelector("small").textContent=impT("addS"); add.querySelector(".imp-drop").textContent=matchMedia("(hover:hover) and (pointer:fine)").matches?impT("drop"):"";
  add.setAttribute("aria-label",impT("add")+" · "+impT("addS")); add.onclick=impPick;
  const ul=$("impMine");
  if(!IMP.list.length){ const H=t("impHelp"), li=document.createElement("li"); li.className="imp-empty"; li.innerHTML='<b></b><ol></ol><button type="button" class="imp-hb" id="impHelpBtn2"><span aria-hidden="true">?</span><span></span></button>';
    li.querySelector("b").textContent=impT("empty"); [H.s1t,H.s2t,H.s3t,H.s4t].forEach(x=>{ const e=document.createElement("li"); e.textContent=x; li.querySelector("ol").appendChild(e); });
    li.querySelector("#impHelpBtn2").lastChild.textContent=impT("howL"); li.querySelector("#impHelpBtn2").onclick=()=>impHelp("mine"); ul.appendChild(li); }
  IMP.list.forEach((r,i)=>{ const li=document.createElement("li"); li.dataset.imp=r.id; li.style.setProperty("--rc",IMP_COL[i%IMP_COL.length]); const st=impBest(r);
    if(IMP.ren===r.id){ li.innerHTML='<i class="imp-dot"></i><input class="imp-title" maxlength="60"><button type="button" class="btn primary" data-a="ok"></button><button type="button" class="btn" data-a="no"></button>';
      const inp=li.querySelector("input"); inp.value=r.title; inp.setAttribute("aria-label",impT("titleL"));
      const ok=async()=>{ const v=inp.value.replace(/[<>&"]/g,"").trim().slice(0,60); if(v){ r.title=v; await PCImp.db.put(r); await impRefresh(); } IMP.ren=null; impRender(); };
      li.querySelector("[data-a=ok]").textContent=impT("ok"); li.querySelector("[data-a=ok]").onclick=ok; li.querySelector("[data-a=no]").textContent=impT("cancel"); li.querySelector("[data-a=no]").onclick=()=>{ IMP.ren=null; impRender(); };
      inp.onkeydown=e=>{ if(e.key==="Enter") ok(); if(e.key==="Escape"){ e.stopPropagation(); IMP.ren=null; impRender(); } }; ul.appendChild(li); setTimeout(()=>{ inp.focus(); inp.select(); },0); return; }
    if(IMP.del===r.id){ li.innerHTML='<i class="imp-dot"></i><span class="imp-mt"><b></b><small></small></span><button type="button" class="btn imp-danger" data-a="yes"></button><button type="button" class="btn" data-a="no"></button>';
      li.querySelector("b").textContent=impT("delQ")(r.title); li.querySelector("small").textContent=impT("delS");
      li.querySelector("[data-a=yes]").textContent=impT("del"); li.querySelector("[data-a=yes]").onclick=async()=>{ await PCImp.db.del(r.id); try{ const b=pcBest(); delete b["imp:"+r.id]; delete b["imp:"+r.id+"@2"]; localStorage.setItem("clavio:best",JSON.stringify(b)); }catch(e){} IMP.del=null; await impRefresh(); impRender(); };
      li.querySelector("[data-a=no]").textContent=impT("cancel"); li.querySelector("[data-a=no]").onclick=()=>{ IMP.del=null; impRender(); }; ul.appendChild(li); return; }
    li.innerHTML='<i class="imp-dot"></i><span class="imp-mt"><b></b><small></small></span><span class="imp-st" aria-hidden="true"></span><button type="button" class="btn primary" data-a="play"></button><span class="imp-ic">'
      +'<button type="button" data-a="set"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg></button>'
      +'<button type="button" data-a="ren"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg></button>'
      +'<button type="button" data-a="del"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/></svg></button></span>';
    li.querySelector("b").textContent=r.title; li.querySelector("small").textContent=[r.n+" "+impT("notes"), impDur(r.dur), r.best&&r.best.score?impT("rec")(r.best.score):""].filter(Boolean).join(" · ");
    li.querySelector(".imp-st").textContent=pcStarTxt(st);
    const A=k=>li.querySelector('[data-a="'+k+'"]');
    A("play").textContent=impT("play"); A("play").onclick=()=>impPlayRec(r);
    A("set").setAttribute("aria-label",impT("settingsL")+" · "+r.title); A("set").title=impT("settingsL"); A("set").onclick=()=>impEdit(r);
    A("ren").setAttribute("aria-label",impT("renL")+" · "+r.title); A("ren").title=impT("renL"); A("ren").onclick=()=>{ IMP.ren=r.id; IMP.del=null; impRender(); };
    A("del").setAttribute("aria-label",impT("del")+" · "+r.title); A("del").title=impT("del"); A("del").onclick=()=>{ IMP.del=r.id; IMP.ren=null; impRender(); };
    ul.appendChild(li); }); }

// ---- « How to import a song? »: 4 illustrated steps (texts for the device in hand) + a short FAQ
const IMP_ILL=[
  '<svg viewBox="0 0 96 72" aria-hidden="true"><rect x="22" y="6" width="40" height="54" rx="6" class="f2"/><path d="M50 6v12h12" class="ln"/><path d="M34 44V24l16-4v20" class="ln"/><circle cx="31" cy="44" r="4" class="ac"/><circle cx="47" cy="40" r="4" class="ac"/><rect x="52" y="44" width="30" height="16" rx="5" class="ac"/><text x="67" y="55.5" text-anchor="middle">.mid</text></svg>',
  '<svg viewBox="0 0 96 72" aria-hidden="true"><path d="M12 22a5 5 0 015-5h20l6 6h36a5 5 0 015 5v30a5 5 0 01-5 5H17a5 5 0 01-5-5z" class="f2"/><path d="M48 8v30M38 28l10 10 10-10" class="ln ac2"/><rect x="34" y="46" width="28" height="10" rx="3" class="ac"/></svg>',
  '<svg viewBox="0 0 96 72" aria-hidden="true"><rect x="10" y="20" width="62" height="26" rx="13" class="ac"/><path d="M33 33h16M41 25v16" class="ln w"/><path d="M66 40l4 22 6-7 9 9 4-4-9-9 8-5z" class="hand"/></svg>',
  '<svg viewBox="0 0 96 72" aria-hidden="true"><rect x="6" y="22" width="84" height="40" rx="5" class="f2"/>'+[0,1,2,3,4,5,6,7,8,9,10,11].map(i=>'<rect x="'+(8+i*6.8)+'" y="24" width="6" height="36" rx="1.5" class="wk'+(i<5?' lh':i>6?' rh':'')+'"/>').join("")+'<text x="24" y="16" text-anchor="middle" class="tl">{L}</text><text x="68" y="16" text-anchor="middle" class="tr2">{R}</text></svg>'];
function impRenderHelp(box){ const dev=impDevice(), H=t("impHelp"), D=H.dev[dev]||H.dev.other;
  const card=document.createElement("div"); card.className="imp-card imp-help"; box.appendChild(card);
  card.insertAdjacentHTML("beforeend",'<button type="button" class="gr-x imp-x" id="impClose"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>'
    +'<div class="imp-hh"><h3 class="imp-h" id="impHelpT"></h3><span class="imp-dev"></span></div><div class="imp-scroll"><ol class="imp-steps"></ol><div class="imp-faq"><h4></h4></div></div>'
    +'<div class="imp-acts"><button type="button" class="btn primary" id="impHelpGo"></button></div>');
  if(dev==="iosWeb"||dev==="mac") card.querySelector(".imp-hh").classList.add("dv");
  $("impClose").setAttribute("aria-label",t("close")); $("impClose").onclick=()=>{ PC.view=IMP.from==="imp"&&(IMP.draft||IMP.err)?"imp":IMP.from==="mine"?"mine":"cat"; renderPlaySongs(); };
  $("impHelpT").textContent=H.title; card.querySelector(".imp-dev").textContent=D.name;
  const ol=card.querySelector(".imp-steps");
  [[H.s1t,H.s1],[H.s2t,D.save],[H.s3t,D.imp],[H.s4t,H.s4]].forEach(([ti,tx],i)=>{ const li=document.createElement("li"); li.innerHTML='<span class="imp-ill">'+IMP_ILL[i].replace("{L}",S.settings.lang==="fr"?"MG":"LH").replace("{R}",S.settings.lang==="fr"?"MD":"RH")+'</span><span class="imp-n">'+(i+1)+'</span><b></b><div class="imp-sx"></div>';
    li.querySelector("b").textContent=ti; [].concat(tx).forEach(p=>{ const e=document.createElement("p"); e.textContent=p; li.querySelector(".imp-sx").appendChild(e); }); ol.appendChild(li); });
  const fq=card.querySelector(".imp-faq"); fq.querySelector("h4").textContent=H.faqH;
  H.faq.forEach(([q,a])=>{ const dt=document.createElement("details"); dt.innerHTML="<summary></summary><p></p>"; dt.firstChild.textContent=q; dt.lastChild.textContent=a; fq.appendChild(dt); });
  $("impHelpGo").textContent=impT("add"); $("impHelpGo").onclick=impPick; }

// ---- PLAY page: the views above take the place of the catalogue; the « My songs » chip sits in the bar
const _impBar=pcBar; pcBar=function(){ _impBar(); impChip(); };
const _impRPS=renderPlaySongs;
renderPlaySongs=function(){ const ip=$("impPanel"); const mine=["imp","help","mine"].includes(PC.view) && !PC.kb;
  if(ip) ip.hidden=!mine;
  if(!IMP.loaded && page==="free" && !IMP.refreshing){ IMP.refreshing=1; impRefresh().then(()=>{ IMP.refreshing=0; if(page==="free") renderPlaySongs(); }); }
  if(mine && window.PC_SONG){ document.body.classList.remove("pc-kb"); pcBar(); $("grPanel").hidden=true; $("playSongs").hidden=true; impTip();
    if(PC.view!=="help" && !window.PCImp){ impLib().then(()=>{ if(page==="free") renderPlaySongs(); }).catch(()=>{}); return; }
    impRender(); return; }
  if(mine) PC.view="cat";
  _impRPS(); requestAnimationFrame(impTip); };
// Do alone on the MIDI keyboard = Play on the preview
const _impMS=midiStart;
midiStart=function(note){ if(page==="free" && PC.view==="imp" && IMP.draft && note%12===0 && !anyWin() && S.settings.midiC!==false && !$("impPanel").hidden){ impPlay(); return true; } return _impMS(note); };
// the screen keyboard / computer keyboard / mic go through noteIn: same shortcut there when the free piano is hidden
// drag and drop on a computer: drop a file anywhere on the PLAY page
addEventListener("dragover",e=>{ if(page!=="free" || !e.dataTransfer || ![...(e.dataTransfer.types||[])].includes("Files")) return; e.preventDefault(); e.dataTransfer.dropEffect="copy"; document.body.classList.add("imp-drag"); });
addEventListener("dragleave",e=>{ if(e.target===document.documentElement || !e.relatedTarget) document.body.classList.remove("imp-drag"); });
addEventListener("drop",e=>{ document.body.classList.remove("imp-drag"); if(page!=="free" || !e.dataTransfer || !e.dataTransfer.files || !e.dataTransfer.files.length) return; e.preventDefault(); if(anyWin()) return; impFile(e.dataTransfer.files[0]); });
/* ==== fin Import de morceaux ==== */

