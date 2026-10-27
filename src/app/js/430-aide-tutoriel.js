// fragment de l'IIFE principale — ordre 430, voir src/app/README.md
// ---------- Help / tutorial ----------
let helpOpen=false, pausedLeft=0, tutI=0;
// any window open: freeze the countdown and auto-advance, keep focus inside the window
let paused=false, pendingAdv=false, modalFocus=[];
function anyWin(){ return helpOpen||midiOpen||endOpen||openMods.length>0; }
function anyModal(){ return anyWin()||INFO_PAGES.includes(page)||(typeof startUI==="function"&&startUI()); }
function pauseRound(){ if(!paused && phase==="listening"){ cancelAnimationFrame(raf); pausedLeft = deadline ? Math.max(0,deadline-performance.now()) : 0; paused=true; } }
function resumeRound(){
  if(anyModal()) return;
  if(paused){ paused=false; if(phase==="listening"){ if(deadline) deadline=performance.now()+pausedLeft; cancelAnimationFrame(raf); raf=requestAnimationFrame(tick); } }
  if(pendingAdv){ pendingAdv=false; setTimeout(()=>{ if(anyModal()){ pendingAdv=true; return; } if(phase==="success") startRound(); else if(phase==="revealed") grade(true); },500); }
}
function modalOpened(){ modalFocus.push(document.activeElement); pauseRound(); try{ $("app").inert=true; }catch(e){} }
function modalClosed(){ if(typeof maybeAskInput==="function") setTimeout(()=>{ maybeAskInput(); },0); if(!anyWin()){ try{ $("app").inert=false; }catch(e){} modalFocus.length=Math.min(modalFocus.length,1); } const f=modalFocus.pop(); try{ if(f&&f.focus&&!anyWin()&&document.contains(f)) f.focus({preventScroll:true}); }catch(e){} resumeRound(); }
// safety net: if no window is open, the app must never stay frozen
setInterval(()=>{ try{ if(!anyWin() && $("app").inert) $("app").inert=false; }catch(e){} }, 1500);
const VB='viewBox="0 0 360 190"';
const svgHead = id => '<svg '+VB+' class="tut-svg" role="img" aria-hidden="true"><defs><marker id="'+id+'" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="s-ah"/></marker></defs>';
const arrow = (id,d) => '<path class="s-arrow" d="'+d+'" marker-end="url(#'+id+')"/>';
const esc = x => String(x).replace(/&/g,"&amp;").replace(/</g,"&lt;");
const txt = (x,y,cls,size,str,anchor="start",extra="") => '<text x="'+x+'" y="'+y+'" class="'+cls+'" font-size="'+size+'" text-anchor="'+anchor+'" '+extra+'>'+esc(str)+'</text>';
function miniKeys(x,y,w,h,hl){ // C..C, hl: {semitoneOffset: "s-hg"|"s-hr"}
  const W=[0,2,4,5,7,9,11,12], ww=w/8, bw=ww*.6; let o="";
  W.forEach((off,i)=>{ o+='<rect x="'+(x+i*ww)+'" y="'+y+'" width="'+ww+'" height="'+h+'" rx="3" class="s-wk '+(hl[off]||"")+'"/>'; });
  [[0,1],[1,3],[3,6],[4,8],[5,10]].forEach(([i,off])=>{ o+='<rect x="'+(x+(i+1)*ww-bw/2)+'" y="'+y+'" width="'+bw+'" height="'+(h*.6)+'" rx="2" class="s-bk '+(hl[off]||"")+'"/>'; });
  return o;
}
function tutSvg(i){
  const L=TXT[S.settings.lang].svg, ex=spellType("major","D","up"), sc=ex.concat([ex[0]]);
  if(i===0){
    const id="ah0";
    return svgHead(id)
      +'<rect x="30" y="16" width="300" height="124" rx="12" class="s-card"/>'
      +txt(52,44,"s-m",10,t("scaleToPlay").toUpperCase(),"start",'letter-spacing="1.2"')
      +txt(52,86,"s-big",31,scaleName("major","D"))
      +'<rect x="52" y="106" width="256" height="9" rx="4.5" class="s-track"/><rect x="52" y="106" width="168" height="9" rx="4.5" class="s-fill"/>'
      +txt(308,100,"s-m",11,"3,4 s".replace(",",S.settings.lang==="fr"?",":"."),"end")
      +arrow(id,"M275 166 C 270 150, 240 146, 226 124")
      +txt(334,180,"s-m",11,"⏱ "+L.count,"end") // anchored right so the French label is never cut
      +'</svg>';
  }
  if(i===1){
    const id="ah1"; let o=svgHead(id);
    // input sources
    const chip=(y,label,icon)=>'<rect x="10" y="'+y+'" width="88" height="32" rx="16" class="s-chip"/>'+icon+txt(46,y+21,"s-t",12,label);
    const pianoIcon=y=>'<rect x="22" y="'+(y+9)+'" width="16" height="14" rx="2" class="s-icon"/><path class="s-icon" d="M27.3 '+(y+9)+' v9 M32.6 '+(y+9)+' v9"/>';
    const micIcon=y=>'<rect x="26" y="'+(y+7)+'" width="8" height="12" rx="4" class="s-icon"/><path class="s-icon" d="M22 '+(y+16)+' a8 8 0 0 0 16 0 M30 '+(y+24)+' v3"/>';
    const scrIcon=y=>'<rect x="21" y="'+(y+8)+'" width="18" height="13" rx="2" class="s-icon"/><path class="s-icon" d="M26 '+(y+25)+' h8"/>';
    o+=chip(84,"MIDI",pianoIcon(84))+chip(120,L.mic,micIcon(120))+chip(156,L.screen,scrIcon(156));
    // slots
    const sx=132, sw=26, gap=2.5;
    sc.forEach((n,j)=>{
      const x=sx+j*(sw+gap), cls=j<3?"s-slot-ok":j===3?"s-slot-cur":"s-slot";
      o+='<rect x="'+x+'" y="14" width="'+sw+'" height="46" rx="5" class="'+cls+'"/>';
      o+=txt(x+sw/2,28,"s-m",8.5,j===7?"I":degLabel(n,sc[0]),"middle");
      if(j<3) o+=txt(x+sw/2,49,"s-gt",S.settings.notation==="fr"?9.5:12,noteName(n),"middle");
    });
    o+=miniKeys(132,104,224,78,{2:"s-hg",4:"s-hg",6:"s-hg"});
    o+=arrow(id,"M100 100 C 116 100, 118 128, 128 128")+arrow(id,"M100 136 L 128 136")+arrow(id,"M100 172 C 116 172, 118 146, 128 146");
    o+=arrow(id,"M206 100 L 206 68");
    return o+'</svg>';
  }
  if(i===2){
    const id="ah2"; const hl={}; [2,4,6,7,9,11,1].forEach(x=>hl[x]="s-hr"); hl[2]="s-hg"; hl[4]="s-hg";
    return svgHead(id)
      +'<rect x="16" y="22" width="150" height="9" rx="4.5" class="s-track"/><rect x="16" y="22" width="8" height="9" rx="4" class="s-badfill"/>'
      +txt(172,31,"s-bad",11,"0 s")
      +arrow(id,"M91 40 L 91 70")
      +miniKeys(16,78,150,92,hl)
      +arrow(id,"M174 124 L 206 124")
      +'<rect x="214" y="84" width="134" height="36" rx="9" class="s-btn-good"/>'+txt(281,107,"s-on",13,t("knew"),"middle")
      +'<rect x="214" y="130" width="134" height="36" rx="9" class="s-btn"/>'+txt(281,153,"s-t",13,t("review"),"middle")
      +'</svg>';
  }
  // step 4
  const id="ah3";
  const pips=(x,y,n)=>[0,1,2,3,4].map(k=>'<rect x="'+(x+k*15)+'" y="'+y+'" width="12" height="5" rx="2" class="'+(k<n?"s-pipg":"s-pip")+'"/>').join("");
  return svgHead(id)
    +'<rect x="12" y="44" width="100" height="92" rx="10" class="s-card"/>'
    +txt(24,72,"s-name",17,noteName(tonicNote("C")))+txt(24,90,"s-m",9.5,sigText("major","C"))+pips(24,104,3)
    +txt(62,156,"s-m",11,"3 / 5","middle")
    +arrow(id,"M118 90 L 146 90")
    +'<rect x="152" y="44" width="100" height="92" rx="10" class="s-tile-new"/>'
    +txt(164,72,"s-name",17,noteName(tonicNote("G")))+txt(164,90,"s-m",9.5,sigText("major","G"))+pips(164,104,0)
    +txt(202,156,"s-m",11,L.unlocked,"middle")
    +'<path class="s-spark" d="M248 34 l6 -8 M258 44 l10 -2 M236 30 l0 -10"/>'
    +arrow(id,"M258 90 L 280 90")
    +'<rect x="286" y="58" width="62" height="40" rx="9" class="s-ink"/>'+txt(317,84,"s-onink",15,t("lvlShort")+"2","middle")
    +'<rect x="286" y="106" width="62" height="6" rx="3" class="s-pip"/><rect x="286" y="106" width="22" height="6" rx="3" class="s-fill"/>'
    +txt(317,132,"s-m",9.5,L.types,"middle")
    +'</svg>';
}
function renderTut(){
  const steps=t("tut"), n=steps.length;
  $("helpTitle").textContent=t("helpTitle");
  $("helpX").setAttribute("aria-label",t("close"));
  $("tutFig").innerHTML=tutSvg(tutI===0?0:Math.max(0,tutI-1));
  $("tutStep").textContent=t("stepOf")(tutI+1,n);
  $("tutH").textContent=steps[tutI].h; $("tutP").textContent=steps[tutI].p;
  const tx=$("tutStep").parentElement; tx.style.animation="none"; void tx.offsetWidth; tx.style.animation="";
  $("tutPrev").disabled=tutI===0; $("tutPrev").setAttribute("aria-label",t("tutPrev"));
  $("tutNextTxt").textContent= tutI===n-1 ? t("helpOk") : t("tutNext");
  const dots=$("tutDots"); dots.innerHTML="";
  steps.forEach((st,k)=>{ const b=document.createElement("button"); b.type="button"; b.setAttribute("aria-label",t("stepOf")(k+1,n));
    if(k===tutI) b.setAttribute("aria-current","step"); b.onclick=()=>{ tutI=k; renderTut(); }; dots.appendChild(b); });
}
function tutGo(d){ const n=t("tut").length; if(tutI+d>=n){ closeHelp(); return; } tutI=Math.max(0,tutI+d); renderTut(); }
function openHelp(){
  if(helpOpen) return; modalOpened(); helpOpen=true; tutI=0;
  renderTut(); $("helpModal").hidden=false; $("tutNext").focus();
}
function closeHelp(){
  if(!helpOpen) return; helpOpen=false; $("helpModal").hidden=true; modalClosed();
  if(window.__nativeMidi) setTimeout(()=>maybeMidiConn(),300);
}
$("helpBtn").addEventListener("click",openHelp);
$("helpX").addEventListener("click",closeHelp);
$("helpBg").addEventListener("click",closeHelp);
$("tutNext").addEventListener("click",()=>tutGo(1));
$("tutPrev").addEventListener("click",()=>tutGo(-1));
let swipeX=null;
$("helpBody").addEventListener("pointerdown",e=>{ swipeX=e.clientX; });
$("helpBody").addEventListener("pointerup",e=>{ if(swipeX==null) return; const dx=e.clientX-swipeX; swipeX=null;
  if(Math.abs(dx)>50){ if(dx<0 && tutI<t("tut").length-1) tutGo(1); else if(dx>0) tutGo(-1); } });

