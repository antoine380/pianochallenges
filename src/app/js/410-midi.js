// fragment de l'IIFE principale — ordre 410, voir src/app/README.md
// ---------- MIDI ----------
let midiAcc=null, midiNames=[], midiOpen=false;
function renderMidiModal(){
  const setup=!!midiSetup, ok=$("midiOk");
  ok.textContent = setup ? t("midiDone") : t("closeLbl"); ok.disabled = setup && !midiReady;
  $("midiSetupMsg").hidden=!setup && !midiDenied; $("midiSetupMsg").textContent = midiDenied ? t("midiBlockedMsg") : midiReady ? t("midiSetupOk") : t("midiSetupNeed");
  $("midiModal").querySelector(".midi-status").classList.toggle("on",midiReady);
  $("mStTxt").textContent = midiReady ? $("midiTxt").textContent : midiDenied ? t("midiBlocked") : (midiAcc ? t("midiNone") : t("midiOffState"));
  $("mEnable").hidden = !!midiAcc || !navigator.requestMIDIAccess;
  const nat=!!window.__nativeMidi, dl=$("mDevList"); dl.innerHTML="";
  if(midiNames.length) midiNames.forEach(n=>{ const li=document.createElement("li"); li.textContent=n; dl.appendChild(li); });
  else { const li=document.createElement("li"); li.className="none"; li.textContent = !navigator.requestMIDIAccess ? t("midiUnsupported") : midiDenied ? t("midiBlockedMsg") : midiAcc ? t("midiNoneLong") : t("midiOffState"); dl.appendChild(li); }
  $("mcUsb").textContent=t(nat?"mcUsbApp":"mcUsbWeb"); $("mcBt").textContent=t(nat?"mcBtApp":"mcBtWeb"); $("mBt").hidden=!nat;
  const sel=$("mInput"); sel.innerHTML=""; $("mInField").hidden = midiNames.length<2;
  [["",t("midiAll")],...midiNames.map(n=>[n,n])].forEach(([v,l])=>{ const o=document.createElement("option"); o.value=v; o.textContent=l; sel.appendChild(o); });
  sel.value = midiNames.includes(S.settings.midiInput) ? S.settings.midiInput : "";
  renderSettings();
}
function openMidi(){ if(!midiOpen) modalOpened(); midiOpen=true; mtReset(); renderMidiModal(); startMidiPoll(); $("midiModal").hidden=false; $("midiOk").focus(); }
function closeMidi(){ if(!midiOpen) return; midiOpen=false; $("midiModal").hidden=true;
  if(midiSetup){ const prev=midiSetup.prev; midiSetup=null; S.settings.input = midiReady ? "midi" : (prev && prev!=="midi" ? prev : undefined); if(!S.settings.input) delete S.settings.input; save(); renderInputUI(); render(); } if(calib){ calib=null; calibMsg(""); $("kbDetect").textContent=t("kbDetect"); } clearInterval(midiPoll); modalClosed(); }
let midiPoll=0; // in the app, look for newly paired / plugged keyboards while the window is open
function startMidiPoll(){ clearInterval(midiPoll); if(window.__nativeMidi && midiAcc) midiPoll=setInterval(()=>{ window.__nativeMidi.listInputs().catch(()=>{}); },2000); }
function calibMsg(x){ const m=$("calibMsg"); m.textContent=x; m.hidden=!x; if(!midiOpen) notice(x); }
$("midiCfg").addEventListener("click",openMidi);
$("midiX").addEventListener("click",closeMidi); $("midiBg").addEventListener("click",closeMidi); $("midiOk").addEventListener("click",closeMidi);
$("mEnable").addEventListener("click",()=>$("midiBtn").click());
$("mBt").addEventListener("click",async ()=>{ if(!window.__nativeMidi) return; if(!midiAcc) $("midiBtn").click(); try{ await window.__nativeMidi.showBluetooth(); }catch(e){} });
function maybeMidiConn(){}
$("mInput").addEventListener("change",e=>{ S.settings.midiInput=e.target.value; save(); if(midiAcc&&midiAcc.onstatechange) midiAcc.onstatechange(); renderMidiModal(); });
$("optMidiC").addEventListener("change",e=>{ S.settings.midiC=e.target.checked; save(); render(); });
$("midiBtn").addEventListener("click", ()=>{ if(midiAcc) openMidi(); else enableMidi(); });
let midiDenied=false; // the browser refused requestMIDIAccess
// One MIDI event can carry several messages: a Bluetooth packet, the pressure / CC74 / pitch-bend burst an MPE keyboard (ROLI LUMI, Seaboard)
// sends with each note, running status (the status byte left out). Every channel message is handed over as [status, data1, data2];
// SysEx (F0…F7), system common (F1–F6) and real-time bytes (F8–FF, clock, active sensing) are skipped. The usual case (one message) is not copied.
const midiLen = s => { const k=s&0xf0; return k===0xC0||k===0xD0 ? 2 : 3; };
function midiEach(data, inp, fn){ const n=data ? data.length : 0; if(!n) return; const s0=data[0];
  if(s0>=0x80 && s0<0xF0 && n===midiLen(s0) && !inp.__pm){ inp.__rs=s0; fn(data); return; }
  let rs=inp.__rs||0, m=inp.__pm||null, need=m?midiLen(m[0]):0, sx=false; // __pm: a message cut between two packets
  for(let i=0;i<n;i++){ const b=data[i];
    if(b>=0xF8) continue;
    if(b===0xF0){ sx=true; m=null; continue; } if(b===0xF7){ sx=false; continue; } if(sx) continue;
    if(b&0x80){ m=null; if(b>0xF0){ rs=0; continue; } rs=b; m=[b]; need=midiLen(b); continue; }
    if(!m){ if(!rs) continue; m=[rs]; need=midiLen(rs); }
    m.push(b); if(m.length===need){ fn(need===2 ? [m[0],m[1],0] : m); m=null; } }
  inp.__rs=rs; inp.__pm=m; }
// the same keyboard seen on two ports (a LUMI charging on USB-C and paired in Bluetooth, a keyboard listed twice): each note came twice,
// so a lone C was never alone (« Do » to start, Gammes une à une) and every note sounded twice. A note-on for the same note within 40 ms
// on ANOTHER port is dropped (the quiz, where each keyboard is a player, is served before this).
const MIDI_DUP=new Map();
function midiDup(note, inp){ const now=performance.now(), k=String(inp.id||inp.name), o=MIDI_DUP.get(note);
  if(o && o.k!==k && now-o.t<40) return true; MIDI_DUP.set(note,{t:now,k}); return false; }
async function enableMidi(quiet){
  if(!quiet) audio(); // quiet: watching for a keyboard in the background (M13), no sound needed yet
  if(!navigator.requestMIDIAccess){ $("midiBtn").classList.add("err"); $("midiTxt").textContent=t("midiNo"); notice(t("midiUnsupported")); return; }
  try{
    const acc=await navigator.requestMIDIAccess(); midiAcc=acc;
    const bind=()=>{ if(midiVirtual(S.settings.midiInput)){ S.settings.midiInput=""; save(); } // a virtual port saved as « the » keyboard would mute the real ones
      document.querySelectorAll("#kbd .k-down").forEach(e=>e.classList.remove("k-down")); const names=[]; acc.inputs.forEach(inp=>{
        if((inp.state && inp.state!=="connected") || midiVirtual(inp.name)){ inp.onmidimessage=null; return; } // Chrome keeps unplugged ports in the map; virtual ports are not keyboards
        names.push(inp.name); inp.onmidimessage=ev=>midiEach(ev.data, inp, d=>{
        const [st,note,vel]=d;
        if(LV.on){ if((st&0xf0)===0x90 && vel>0) lvNote(note); return; } // the leave window: C = keep playing, B = leave
        if(SR.on){ if((st&0xf0)===0x90 && vel>0) srNote(note); return; } // série validée (plein écran) : un Do seul ferme, aucune note ne passe en dessous
        if(MW.on && mwMsg(st,note,vel,inp)) return; // the « Connect my keyboard » assistant (MIDI lots 2-3) gets every message while it is open
        if(midiOpen && !calib && (st&0xf0)===0x90 && vel>0){ pressKey(note); mtNote(note,vel,inp.name); return; } // the MIDI window: the « play a note » test (M8)
        if(page==="quiz"){ if((st&0xf0)===0x90 && vel>0){ if(S.settings.midiSound) tone(note,0,.9,.1+.26*vel/127); if(!anyModal()) quizIn(String(inp.id||inp.name),note); } return; } // every keyboard counts: one per player
        if(S.settings.midiInput && inp.name!==S.settings.midiInput && midiNames.includes(S.settings.midiInput) && !midiTakeOver(st,vel,inp)) return; // the chosen keyboard only, while it is played (MIDI 3 : un autre clavier joué quand le choisi se tait depuis 3 s prend la main)
        if((st&0xf0)===0x90 && vel>0 && midiDup(note,inp)) return; // the same keyboard on a second port
        if((st&0xf0)===0x90 && vel>0) midiSeen(note,inp); // MIDI 3 : les notes vraiment jouées sur ce clavier (sa plage)
        if(page==="piano"){ pnMidi(st,note,vel); return; } // the PIANO mode: an instrument (its own sound, the sustain pedal)
        if(page==="play"){ if((st&0xf0)===0x90 && vel>0) playSend("noteon",note,vel/127,midiSpan(inp)); else if((st&0xf0)===0x80 || ((st&0xf0)===0x90 && vel===0)) playSend("noteoff",note); return; } // MIDI 3 : la plage du clavier part avec la note (le lecteur place ses touches comme celles du clavier)
        if((st&0xf0)===0x80 || ((st&0xf0)===0x90 && vel===0)){ keyDown(note,false); return; }
        if((st&0xf0)===0x90 && vel>0){
          if(S.settings.midiSound) tone(note,0,.9,.1+.26*vel/127);
          if(!calib) followMidi(note); // MIDI 3 : le clavier à l'écran suit AVANT d'allumer la touche (le Do du haut allumait le Do du milieu, replié, puis l'écran sautait)
          pressKey(note); keyDown(note,true); // light the key at once, before the 35 ms grouping
          if(calib){ calibNote(note); return; }
          midiIn(note,true); } }); });
      $("midiBtn").classList.toggle("on",names.length>0); $("midiBtn").classList.remove("err");
      const shown = S.settings.midiInput && names.includes(S.settings.midiInput) ? S.settings.midiInput : names[0];
      $("midiTxt").textContent=names.length ? t("midiDev")+shown : t("midiNone");
      if(names.length) guessKbdSize(shown); midiReady=names.length>0; midiNames=names; render(); if(midiOpen) renderMidiModal(); renderInputUI(); if(page==="quiz"&&QZ.view==="setup") renderQzSetup(); mdPorts(names); };
    midiDenied=false; bind(); acc.onstatechange=bind; notice("");
  }catch(err){ midiDenied=true; $("midiBtn").classList.add("err"); $("midiTxt").textContent=t("midiBlocked"); notice(t("blocked")); if(midiOpen) renderMidiModal(); }
}

