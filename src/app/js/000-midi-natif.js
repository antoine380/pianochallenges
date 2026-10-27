// fragment du script principal, avant l'IIFE — ordre 000, voir src/app/README.md
// Inside the Piano Challenges iOS app, MIDI comes from CoreMIDI through a native plugin.
// It is exposed with the same shape as the browser's Web MIDI API, so the rest of the code is unchanged.
(function(){
  // window.Capacitor here is the native bridge only (no @capacitor/core bundle), so talk to it directly
  const cap=window.Capacitor, wk=window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.bridge;
  if(!cap || !wk || typeof cap.nativePromise!=="function" || typeof cap.nativeCallback!=="function") return;
  const call=(m,o)=>cap.nativePromise("Midi",m,o||{});
  const on=(ev,fn)=>cap.nativeCallback("Midi","addListener",{eventName:ev},(d,err)=>{ if(!err && d) fn(d); });
  window.__nativeMidi={ start:()=>call("start"), listInputs:()=>call("listInputs"), showBluetooth:()=>call("showBluetooth") };
  let access=null, asking=null;
  // asked twice before the first answer (two paths at start-up): one access only, otherwise two "midi" listeners send every note twice
  navigator.requestMIDIAccess=()=>access ? Promise.resolve(access) : asking || (asking=open().finally(()=>{ asking=null; }));
  const open=async()=>{
    const acc={inputs:new Map(), onstatechange:null};
    // MIDI 3 : same source id, new name (a Bluetooth keyboard publishes its full name a moment after connecting): the name follows,
    // otherwise the chosen keyboard, its size guess and its model were matched against a stale name
    const sync=list=>{ const old=acc.inputs, m=new Map(); (list||[]).forEach(d=>{ const k=String(d.id), o=old.get(k); if(o) o.name=d.name; m.set(k, o||{id:k,name:d.name,onmidimessage:null}); }); acc.inputs=m; };
    on("midi", ev=>{ const inp=acc.inputs.get(String(ev.id)); if(inp && inp.onmidimessage) inp.onmidimessage({data:new Uint8Array(ev.data||[])}); });
    on("statechange", ev=>{ sync(ev.inputs); if(acc.onstatechange) acc.onstatechange(); });
    const r=await call("start"); sync(r && r.inputs);
    access=acc; return acc;
  };
  // no pinch / double-tap zoom inside the app
  document.addEventListener("gesturestart",e=>e.preventDefault());
  document.addEventListener("dblclick",e=>e.preventDefault(),{passive:false});
  // local pages opened "in a new tab" (legal pages from the sign-in screen and the paywall): WKWebView has no tabs and
  // Capacitor hands them to iOS, which cannot open capacitor://localhost, so open them in place (their link "/" comes back)
  document.addEventListener("click",e=>{ const a=e.target.closest&&e.target.closest('a[target="_blank"][href]'); if(!a) return; let u; try{ u=new URL(a.href,location.href); }catch(_){ return; } if(u.origin!==location.origin) return; e.preventDefault(); location.assign(u.href); },true);
})();
