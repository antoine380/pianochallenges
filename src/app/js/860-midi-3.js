// fragment de l'IIFE principale — ordre 860, voir src/app/README.md
/* ==== MIDI 3 (chantier fix-midi3, 26/10/2026) ==== */
// Les notes vraiment jouées sur le clavier MIDI en cours (cette session) : MS.name, MS.lo / MS.hi, et l'heure de la dernière note de chaque port.
const MS={name:"", lo:null, hi:null, last:new Map()};
function midiSeen(note, inp){ const nm=String(inp&&inp.name||""); MS.last.set(nm, performance.now());
  if(nm!==MS.name){ MS.name=nm; MS.lo=MS.hi=null; }
  MS.lo = MS.lo==null ? note : Math.min(MS.lo,note); MS.hi = MS.hi==null ? note : Math.max(MS.hi,note); }
// a note outside the screen keyboard: when the notes played on this keyboard span more keys than the screen shows (a 25-key keyboard
// on a 24-key screen: its top C), the screen grows to those keys instead of jumping an octave (up to 37 keys; bigger ones say their size)
function midiWiden(n){ if(MS.lo==null || n<MS.lo || n>MS.hi || (S.settings.kbdSize||"auto")==="auto") return false;
  let lo=MS.lo, hi=MS.hi; if(hi-lo<=HIGH-LOW || hi-lo>36) return false;
  const white=m=>[0,2,4,5,7,9,11].includes(((m%12)+12)%12); while(!white(lo)) lo--; while(!white(hi)) hi++;
  if(lo<21 || hi>108) return false;
  Object.assign(S.settings,{kbdSize:"custom",kbdLow:lo,kbdHigh:hi}); save(); buildKeyboard(); renderSettings();
  if(cur && typeof markPlayed==="function") markPlayed(); return true; }
// the chosen keyboard (S.settings.midiInput) mutes the other ports only while it is played: another keyboard played when the chosen one has
// been silent for 3 s takes over (it becomes the chosen one). Before, a LUMI picked in the assistant silently muted a 25-key keyboard plugged next.
function midiTakeOver(st, vel, inp){ if((st&0xf0)!==0x90 || !vel || !inp || !inp.name || midiVirtual(inp.name)) return false;
  const t0=MS.last.get(S.settings.midiInput); if(t0!=null && performance.now()-t0<3000) return false;
  S.settings.midiInput=inp.name; save();
  try{ $("midiTxt").textContent=t("midiDev")+inp.name; guessKbdSize(inp.name); mdPorts(midiNames.slice()); mdPill(); if(midiOpen) renderMidiModal(); }catch(e){}
  return true; }
// the keys of the MIDI keyboard, for the Play player: {lo, hi, sure} (sure = measured in the assistant; otherwise a size, placed by the notes played)
function midiSpan(inp){ const h=(S.midi&&S.midi.hw)||{}, nm=inp&&inp.name, sz=S.settings.kbdSize||"auto"; let r=null;
  if(h.lo>=21 && h.hi>h.lo && (!h.name || h.name===nm)) r={lo:+h.lo, hi:+h.hi, sure:!!h.measured};
  else if(KB_PRESETS[sz]) r={lo:KB_PRESETS[sz][0], hi:KB_PRESETS[sz][1], sure:false};
  else if(sz==="custom" && +S.settings.kbdHigh>+S.settings.kbdLow) r={lo:+S.settings.kbdLow, hi:+S.settings.kbdHigh, sure:false};
  if(r && MS.name===nm && MS.lo!=null){ r.slo=MS.lo; r.shi=MS.hi; } // the notes already played on it (LEARN, the games…): the player places it at once
  return r; }
// the app: a Bluetooth keyboard that comes back (same source, back online) is reported by the plugin only when it re-reads its sources;
// it did so every 2 s only while the MIDI window or the assistant was open. Now every 5 s while the app is in front (cheap, no prompt).
if(document.documentElement.classList.contains("native")) setInterval(()=>{ try{ if(document.hidden || !midiAcc || !window.__nativeMidi) return; window.__nativeMidi.listInputs().catch(()=>{}); }catch(e){} },5000);
/* ==== fin MIDI 3 ==== */

