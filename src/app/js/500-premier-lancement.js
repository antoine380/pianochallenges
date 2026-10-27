// fragment de l'IIFE principale — ordre 500, voir src/app/README.md
// ----- first launch: play a first note right away, as a guest; sign-up comes after the first game played well -----
const FN={on:false, how:"screen", level:"debut", done:false, wrong:""};
function fnModes(){ return inputModes().slice().sort((a,b)=>({midi:0,mic:1,screen:2}[a]-{midi:0,mic:1,screen:2}[b])); }
function fnOpen(){ let g=$("gate"); if(!g){ g=document.createElement("div"); g.id="gate"; g.className="gate"; g.setAttribute("role","dialog"); g.setAttribute("aria-modal","true"); document.body.appendChild(g); }
  FN.on=true; FN.done=false; FN.wrong=""; FN.how = fnModes().includes("midi") && !mobileWebNow() ? "midi" : "screen";
  document.body.classList.add("gate-on"); startInert(); g.hidden=false; fnRender(); if(FN.how==="midi") fnMidi(); }
function fnMidi(){ if(!navigator.requestMIDIAccess && !window.__nativeMidi) return; enableMidi().then(()=>fnRender()).catch(()=>{}); }
function fnMidiName(){ try{ const n=[]; if(midiAcc) midiAcc.inputs.forEach(i=>{ if((!i.state||i.state==="connected") && !midiVirtual(i.name)) n.push(i.name); }); return n[0]||""; }catch(e){ return ""; } }
function fnRender(){ const g=$("gate"); if(!g||!FN.on) return; const mark=$("homeLink").querySelector("svg").outerHTML;
  const W=[0,2,4,5,7,9,11], keys=[0,1].map(o=>W.map(pc=>'<button type="button" class="w" data-m="'+(60+12*o+pc)+'">'+esc((S.settings.notation==="fr"?PC_FR:PC_EN)[pc])+'</button>').join("")).map((h,o)=>o?'<span class="fn-oct2">'+h+'</span>':h).join("");
  const bl=[1,3,6,8,10], blk=[0,1].map(o=>bl.map(pc=>{ const wi=W.indexOf(pc-1)+o*7; return '<button type="button" class="b'+(o?' fn-o2':'')+'" data-m="'+(60+12*o+pc)+'" data-wi="'+wi+'" aria-label="'+esc((S.settings.notation==="fr"?PC_FR:PC_EN)[pc])+'"></button>'; }).join("")).join("");
  const IN=t("fnIn"), nm=fnMidiName();
  g.innerHTML='<div class="fn-card"><div class="fn-hero"><span class="fn-logo">'+mark+'<b>Piano Challenges</b></span><h1>'+t("fnT")+'</h1><p>'+esc(t("fnP"))+'</p>'
    +'<div class="fn-pills">'+t("fnPills").map(x=>'<span>'+esc(x)+'</span>').join("")+'</div><div class="fn-trust">'+t("fnTrust").map(x=>'<span>'+esc(x)+'</span>').join("")+'</div><span class="fn-obj" aria-hidden="true">'+OBJ.runner()+'</span></div>'
    +'<div class="fn-play"><div class="fn-top"><span class="fn-step">'+esc(t("fnStep"))+'</span><button class="fn-skip" type="button" id="fnSkip">'+esc(t("fnSkip"))+'</button></div><h2 id="fnH">'+esc(t("fnH"))+'</h2>'
    +'<p class="fn-lbl">'+esc(t("fnInL"))+'</p><div class="fn-ins">'+fnModes().map(v=>'<button type="button" class="fn-in" data-v="'+v+'" aria-pressed="'+(FN.how===v)+'"><b>'+esc(IN[v][0])+'</b><small'+(v==="midi"&&nm?' class="ok"':'')+'>'+esc(v==="midi"&&FN.how==="midi" ? (nm?t("fnMidiOk")(nm):t("fnMidiWait")) : IN[v][1])+'</small></button>').join("")+'</div>'
    +'<p class="fn-lbl">'+esc(t("fnLvlL"))+'</p><div class="fn-lv">'+["debut","notes","adv"].map((v,i)=>'<button type="button" data-v="'+v+'" aria-pressed="'+(FN.level===v)+'">'+esc(t("fnLvl")[i])+'</button>').join("")+'</div>'
    +'<div class="fn-prompt'+(FN.done?' ok':FN.wrong?' bad':'')+'" id="fnPrompt" role="status"><span class="fn-big">'+(S.settings.notation==="fr"?"Do":"C")+'</span><span><b>'+esc(FN.done?t("fnOk"):t("fnPrompt"))+'</b><small>'+esc(FN.done?t(FN.level==="debut"?"ppFnOkS":"fnOkS"):FN.wrong?t("fnWrong")(FN.wrong):FN.how==="mic"?t("fnMicS"):t("fnPromptS"))+'</small></span></div>'
    +'<div class="fn-kb" id="fnKb">'+keys+blk+'</div>'
    +'<button class="gt-go fn-go" type="button" id="fnGo"'+(FN.done?'':' hidden')+'>'+esc(t(FN.level==="debut"?"ppFnGo":"fnGo"))+'</button>'
    +'<div class="fn-foot"><span>'+esc(t("fnLogin"))+' <button type="button" id="fnLogin">'+esc(t("fnLoginB"))+'</button></span><button type="button" id="fnLang">'+(S.settings.lang==="fr"?"EN":"FR")+'</button></div></div></div>';
  g.setAttribute("aria-labelledby","fnH");
  // black keys over the white ones
  const kb=$("fnKb"), whites=[...kb.querySelectorAll(".w")].filter(w=>w.offsetParent!==null), n=whites.length||7;
  kb.querySelectorAll(".b").forEach(b=>{ const wi=+b.dataset.wi; if(wi>=n){ b.hidden=true; return; } b.style.left="calc("+((wi+1)/n*100)+"% - "+(100/n*.32)+"%)"; b.style.width=(100/n*.62)+"%"; });
  if(!FN.done) kb.querySelectorAll('[data-m="60"],[data-m="72"]').forEach(k=>{ if(FN.level==="debut") k.classList.add("fn-hint"); });
  kb.querySelectorAll("button").forEach(k=>k.addEventListener("pointerdown",e=>{ e.preventDefault(); const m=+k.dataset.m; try{ audio(); tone(m,0,.7,.28); }catch(er){} fnNote(m, k); }));
  kb.addEventListener("contextmenu",e=>e.preventDefault()); // a long press on a key plays it, no iOS menu
  g.querySelectorAll(".fn-in").forEach(b=>b.onclick=()=>{ FN.how=b.dataset.v; FN.wrong=""; if(FN.how==="midi") fnMidi(); if(FN.how==="mic"){ try{ if(!micOn) $("micBtn").click(); }catch(e){} } else if(micOn) micStop(); fnRender(); });
  g.querySelectorAll(".fn-lv button").forEach(b=>b.onclick=()=>{ FN.level=b.dataset.v; fnRender(); });
  $("fnGo").onclick=fnGo; $("fnSkip").onclick=fnSkip;
  $("fnLogin").onclick=()=>{ FN.on=false; if(micOn&&FN.how!=="mic") micStop(); GATE.mode="login"; gateOpen(); };
  $("fnLang").onclick=()=>{ document.querySelector('#langSeg [data-v="'+(S.settings.lang==="fr"?"en":"fr")+'"]').click(); fnRender(); }; }
// a note from the screen keys, the MIDI keyboard or the mic while the first screen is open
function fnNote(m, el){ if(!FN.on) return; const kb=$("fnKb"); const pc=((m%12)+12)%12;
  if(FN.done){ if(pc===0 && el===undefined) fnGo(); return; } // MIDI: a C again carries on
  const k = el || (kb && (kb.querySelector('[data-m="'+m+'"]') || kb.querySelector('[data-m="'+(60+pc)+'"]')));
  if(pc===0){ FN.done=true; FN.wrong=""; fnRender(); const k2=$("fnKb").querySelector('[data-m="'+(m>=72&&m<84?72:60)+'"]'); if(k2) k2.classList.add("fn-good"); setTimeout(()=>$("fnGo")&&$("fnGo").focus(),30);
    // the moment (once): the prompt turns green (colour fade), the big C pops, the button rises in; confetti from the C, inside the card (the stage is under the gate)
    const pr=$("fnPrompt"); pr.classList.remove("ok"); void pr.offsetWidth; pr.classList.add("ok","fn-win"); $("fnGo").classList.add("fn-enter");
    try{ confetti($("gate").querySelector(".fn-card"), k2||pr, 60, 1200); }catch(e){} return; }
  FN.wrong=(S.settings.notation==="fr"?PC_FR:PC_EN)[pc]; const pr=$("fnPrompt"); if(pr){ pr.classList.add("bad"); pr.querySelector("small").textContent=t("fnWrong")(FN.wrong); }
  if(k){ k.classList.add("fn-bad"); setTimeout(()=>k.classList.remove("fn-bad"),320); } }
function fnClose(){ FN.on=false; const g=$("gate"); if(g){ g.hidden=true; g.innerHTML=""; } document.body.classList.remove("gate-on"); startInert(); }
// the two answers set the app up (aids, fingering, unlocks, ELO), the rest of the questions can be done later in Settings
function fnApply(){ S.gate="guest"; ONB.a={why:[],level:FN.level,staff:null,how:FN.how,cont:null}; onbApply(); S.onb={...S.onb, quick:1}; S.tourDone=1;
  S.introSeen={...(S.introSeen||{}), chords:true, learn:true, practice:true, hub:true}; save(); }
function fnGo(){ fnApply(); fnClose(); setInput(FN.how, FN.how!=="screen");
  if(FN.level==="debut"){ ppBegin(); return; } // a complete beginner: the First steps (overview, then lesson 1), not chords
  // the first game: three major chords in simple keys
  try{ S.section="chords"; const st=suState("chords"); st.tids=["maj"].filter(id=>typeList("chords").some(ty=>ty.id===id)); if(!st.tids.length) st.tids=[typeList("chords")[0].id]; st.keys="simple"; st.shuffle=false; save(); }catch(e){}
  openPage("learn"); setTimeout(()=>{ const b=$("secTabs").querySelector('[data-v="chords"]'); if(b) b.click(); setTimeout(()=>{ try{ suStart(); }catch(e){} },250); },60); }
function fnSkip(){ S.gate="guest"; S.onb={done:1, skipped:1, at:Date.now()}; S.tourDone=1; save(); fnClose(); openPage("hub"); maybeAskInput(); } // skip: nothing is set up (like the questionnaire's skip)
