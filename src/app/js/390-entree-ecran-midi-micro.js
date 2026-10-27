// fragment de l'IIFE principale — ordre 390, voir src/app/README.md
// ---------- How the player plays: on-screen keys, MIDI keyboard or microphone ----------
const INPUT_ICONS={"screen": "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><rect x=\"2.5\" y=\"4\" width=\"19\" height=\"13\" rx=\"2\"/><path d=\"M8 21h8M12 17v4M6 8v5M9 8v5M12 8v5M15 8v5M18 8v5\"/></svg>", "midi": "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><rect x=\"2.5\" y=\"7\" width=\"19\" height=\"11\" rx=\"2\"/><path d=\"M6.5 7v6M10 7v6M14 7v6M17.5 7v6M12 7V3.5M12 3.5h4\"/></svg>", "mic": "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><rect x=\"9\" y=\"3\" width=\"6\" height=\"11\" rx=\"3\"/><path d=\"M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7\"/></svg>"};
const mobileWebNow = () => (phoneMQ.matches||railMQ.matches) && !document.documentElement.classList.contains("native");
const midiPossible = () => document.documentElement.classList.contains("native") || (!!navigator.requestMIDIAccess && !mobileWebNow());
const inputModes = () => midiPossible() ? ["screen","midi","mic"] : ["screen","mic"];
function renderInputUI(){
  const m=S.settings.input||"screen", M=t("inModes");
  const seg=$("segInput"); seg.innerHTML="";
  inputModes().forEach(v=>{ const b=document.createElement("button"); b.type="button"; b.dataset.v=v; b.setAttribute("aria-pressed",v===m); b.textContent=M[v][2]; b.onclick=()=>setInput(v,true); seg.appendChild(b); });
  let st="", cfg="";
  if(m==="midi"){ st = !navigator.requestMIDIAccess ? t("inMidiNo") : midiReady ? t("inMidiOk")(midiNames.join(", ")) : t("inMidiNone"); cfg = navigator.requestMIDIAccess ? t("inCfgMidi") : ""; }
  else if(m==="mic"){ st = micOn ? t("inMicOk") : t("inMicOff"); cfg = micOn ? "" : t("inCfgMic"); }
  else st=t("inScreenOk");
  if(!midiPossible() && m!=="midi") st+=" "+t("inMidiApp");
  $("inStatus").textContent=st; $("inCfg").textContent=cfg; $("inCfg").hidden=!cfg; if(page==="hub") renderHubSide();
  const ok = m==="screen" || (m==="midi"&&midiReady) || (m==="mic"&&micOn);
  const chip=$("inChip"); chip.innerHTML=INPUT_ICONS[m]+'<span class="cg"><svg viewBox="0 0 24 24"><path d="M10.3 3.2a1.8 1.8 0 0 1 3.4 0l.4 1.2a1.8 1.8 0 0 0 2.4 1l1.1-.6a1.8 1.8 0 0 1 2.4 2.4l-.6 1.1a1.8 1.8 0 0 0 1 2.4l1.2.4a1.8 1.8 0 0 1 0 3.4l-1.2.4a1.8 1.8 0 0 0-1 2.4l.6 1.1a1.8 1.8 0 0 1-2.4 2.4l-1.1-.6a1.8 1.8 0 0 0-2.4 1l-.4 1.2a1.8 1.8 0 0 1-3.4 0l-.4-1.2a1.8 1.8 0 0 0-2.4-1l-1.1.6a1.8 1.8 0 0 1-2.4-2.4l.6-1.1a1.8 1.8 0 0 0-1-2.4l-1.2-.4a1.8 1.8 0 0 1 0-3.4l1.2-.4a1.8 1.8 0 0 0 1-2.4l-.6-1.1a1.8 1.8 0 0 1 2.4-2.4l1.1.6a1.8 1.8 0 0 0 2.4-1z"/><circle cx="12" cy="12" r="3"/></svg></span><i class="'+(ok?"on":"off")+'"></i>'; chip.title=M[m][0]+" — "+st; chip.setAttribute("aria-label",chip.title);
  mdPill();
}
let midiSetup=null; // {prev} while the player is connecting a MIDI keyboard after choosing MIDI
async function setInput(v, fromUser){
  if(v==="midi" && fromUser){
    midiSetup={prev:S.settings.input||null}; if(micOn) micStop();
    if(navigator.requestMIDIAccess) await enableMidi();
    if(midiReady){ midiSetup=null; S.settings.input="midi"; save(); renderInputUI(); render(); return; }
    openMidi(); return;
  }
  S.settings.input=v; save();
  if(v!=="mic" && micOn) micStop();
  if(v==="midi"){ if(navigator.requestMIDIAccess){ await enableMidi(); } }
  if(v==="mic" && fromUser && !micOn) $("micBtn").click();
  renderInputUI(); render();
}
$("inCfg").addEventListener("click",()=>{ const m=S.settings.input; if(m==="midi") openMidi(); else if(m==="mic") $("micBtn").click(); });
$("inChip").addEventListener("click",()=>mdPillClick());
function openInputChooser(change){
  const box=$("inOpts"), M=t("inModes"), curM=S.settings.input; box.innerHTML="";
  $("inTitle").textContent = change ? t("inChange") : t("inTitle"); $("inSubT").textContent = change ? "" : t("inSub"); $("inX").hidden=!change;
  inputModes().forEach(v=>{ const b=document.createElement("button"); b.type="button"; b.className="inp-opt";
    b.innerHTML='<span class="io-ic">'+INPUT_ICONS[v]+'</span><span class="io-t"><b></b><small></small></span>';
    b.querySelector("b").textContent=M[v][0]; b.querySelector("small").textContent=M[v][1];
    if(change && v===curM){ b.classList.add("cur"); }
    b.onclick=()=>{ closeMod("inputModal"); if(change && v===curM && v!=="midi") return; if(v==="midi" && change && curM==="midi"){ openMidi(); return; } setInput(v,true); }; box.appendChild(b); });
  if(change && curM==="midi"){ const mb=document.createElement("button"); mb.type="button"; mb.className="btn"; mb.textContent=t("inCfgMidi"); mb.onclick=()=>{ closeMod("inputModal"); openMidi(); }; box.appendChild(mb); }
  const note=document.createElement("p"); note.className="inp-note"; note.textContent=t("inMidiApp"); note.hidden=midiPossible(); box.appendChild(note);
  openMod("inputModal");
}
function maybeAskInput(){ if(!S.settings.input && !anyModal()) setTimeout(()=>{ if(!S.settings.input && !anyModal()) openInputChooser(); }, document.documentElement.classList.contains("native")&&performance.now()<2500?1700:350); }
// the chosen input comes back by itself (the mic needs a first tap: browsers require it)
function restoreInput(){
  const m=S.settings.input;
  if(m==="midi" && navigator.requestMIDIAccess) enableMidi();
  if(m==="mic"){ const go=()=>{ document.removeEventListener("pointerdown",go,true); if(S.settings.input==="mic" && !micOn) $("micBtn").click(); }; document.addEventListener("pointerdown",go,true); }
  if(mobileWebNow() && m==="midi"){ S.settings.input="screen"; save(); }
  renderInputUI();
}
