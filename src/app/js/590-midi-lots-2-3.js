// fragment de l'IIFE principale — ordre 590, voir src/app/README.md
/* ==== MIDI lots 2-3 (24/10/2026) : assistant « Brancher mon clavier » M4–M7 (matrice par appareil), M9 étendue, M10 prêt, M11 dépannage, M12 navigateur sans MIDI,
   M3 (lien depuis le premier lancement), Réglages « Mon clavier », calage de latence (midiLat) ==== */
// S.midi (lot 1, propre à l'appareil) gagne : hw.{keys,lo,hi,ped,conn:"usb"|"bt"|"din",dev:"ipad-usbc"|"ipad-lightning"|"iphone-…"|"mac"|"win"|"android"|"cros"|"linux"}, wizard:{step,done,gaveUp}, lat (ms, −50…150)
var MW={on:false, step:"hw", hist:[], hw:"", conn:"", port:"", found:"", still:false, tm:0, poll:0, go:0, t:null, r:null, lat:null, open:-1, retry:0, solved:false, detecting:false, msg:"", btAsked:false, copied:false};
const MW_SUPPORT="a.bernard@me.com"; // « Écrire au support » (e-mail prérempli : appareil, navigateur, noms des ports, rien de personnel)
const mwHw=()=>{ const s=mdS(); if(!s.hw||typeof s.hw!=="object") s.hw={}; return s.hw; };
function midiLat(){ const v=+(S.midi&&S.midi.lat); return isFinite(v) ? Math.max(-50,Math.min(150,Math.round(v))) : 0; }
try{ window.midiLat=midiLat; }catch(e){} // the Play frame (same origin) widens its rhythm windows with it
// ---- the device (§4.1) ----
function mwDev(){ const de=document.documentElement, nat=de.classList.contains("native"), ua=navigator.userAgent||"", pf=String((navigator.userAgentData&&navigator.userAgentData.platform)||navigator.platform||"");
  const touchMac=/mac/i.test(pf) && navigator.maxTouchPoints>1, ios=/iPad|iPhone|iPod/.test(ua) || touchMac;
  const kind = ios ? (/iPhone|iPod/.test(ua) ? "iphone" : "ipad") : /android/i.test(ua+" "+pf) ? "android" : /cros/i.test(ua+" "+pf) ? "cros" : /win/i.test(pf) ? "win" : /mac/i.test(pf) ? "mac" : "linux";
  const br = nat ? "" : /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /(Chrome|CriOS)\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "";
  return {nat, ios, kind, br, ok:midiPossible()}; }
const mwDevLbl=d=>t("mdDevL")[d.kind]+(d.nat ? ", "+t("mdApp") : d.br ? ", "+d.br : "");
function mwDevKey(){ const d=mwDev(); return d.ios ? d.kind+"-"+(MW.port==="light"?"lightning":"usbc") : d.kind; }
// ---- simple vector drawings (no brand): instruments, plugs, devices ----
const mwKeys=(x,y,w,h,n)=>{ const ww=w/n; let o='<rect class="k" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="2"/>'; for(let i=1;i<n;i++) o+='<path class="kl" d="M'+(x+i*ww).toFixed(1)+' '+y+'v'+h+'"/>';
  for(let i=0;i<n-1;i++){ if([2,6].includes(i%7)) continue; o+='<rect class="kb" x="'+(x+(i+1)*ww-ww*.3).toFixed(1)+'" y="'+y+'" width="'+(ww*.6).toFixed(1)+'" height="'+(h*.6).toFixed(1)+'" rx="1"/>'; } return o; };
const MWA={
  midi:()=>'<svg viewBox="0 0 120 72" aria-hidden="true"><rect class="bd" x="10" y="16" width="100" height="42" rx="7"/><circle class="ac2" cx="21" cy="25" r="3.5"/><circle class="ac2" cx="31" cy="25" r="3.5"/>'+[42,52,62,72].map(x=>'<rect class="ac" x="'+x+'" y="21.5" width="7.5" height="7" rx="1.5"/>').join("")+'<rect class="dk" x="86" y="22" width="16" height="6" rx="1.5"/>'+mwKeys(16,33,88,20,14)+'</svg>',
  digital:()=>'<svg viewBox="0 0 120 72" aria-hidden="true"><path class="ln" d="M22 44v24M98 44v24"/><rect class="bd" x="6" y="14" width="108" height="32" rx="5"/>'+[12,17,22].map(x=>'<circle class="ac2" cx="'+x+'" cy="20" r="1.4"/>').join("")+'<rect class="dk" x="50" y="17.5" width="14" height="4" rx="1"/><circle class="ok" cx="70" cy="19.5" r="1.8"/>'+mwKeys(11,25,98,17,20)+'</svg>',
  acoustic:()=>'<svg viewBox="0 0 120 72" aria-hidden="true"><rect class="wd" x="28" y="6" width="64" height="40" rx="4"/><rect class="wd2" x="35" y="12" width="50" height="14" rx="2"/>'+[42,50,58,66,74].map((x,i)=>'<path class="ln2" d="M'+x+' 15v'+(i%2?8:6)+'"/>').join("")+'<rect class="wd" x="22" y="44" width="76" height="6" rx="2"/>'+mwKeys(26,50,68,9,14)+'<path class="wd3" d="M30 59v9M90 59v9"/><rect class="gd" x="57" y="62" width="2.6" height="2.6"/><rect class="gd" x="61" y="62" width="2.6" height="2.6"/></svg>',
  none:()=>'<svg viewBox="0 0 120 72" aria-hidden="true"><rect class="dash" x="22" y="18" width="76" height="36" rx="8"/><text x="60" y="46" text-anchor="middle" class="q">?</text></svg>',
  usbb:()=>'<svg viewBox="0 0 48 32" aria-hidden="true"><path class="pl" d="M14 6h20v20H14z"/><path class="ph" d="M18 11l3-2h6l3 2v10H18z"/></svg>',
  usbc:()=>'<svg viewBox="0 0 48 32" aria-hidden="true"><rect class="pl" x="6" y="9" width="36" height="14" rx="7"/><rect class="ph" x="13" y="14" width="22" height="4" rx="2"/></svg>',
  usba:()=>'<svg viewBox="0 0 48 32" aria-hidden="true"><rect class="pl" x="6" y="9" width="36" height="14" rx="1.5"/><rect class="ph" x="10" y="12" width="28" height="5" rx="1"/></svg>',
  light:()=>'<svg viewBox="0 0 48 32" aria-hidden="true"><rect class="pl" x="9" y="11" width="30" height="10" rx="5"/><rect class="ph" x="14" y="14.5" width="20" height="3" rx="1.5"/></svg>',
  din:()=>'<svg viewBox="0 0 48 32" aria-hidden="true"><circle class="pl" cx="24" cy="16" r="12"/>'+[[16,16],[32,16],[18.3,10.3],[29.7,10.3],[24,8]].map(([x,y])=>'<circle class="ph" cx="'+x+'" cy="'+y+'" r="1.8"/>').join("")+'<rect class="ph" x="22" y="24.5" width="4" height="3" rx="1"/></svg>',
  waves:()=>'<svg viewBox="0 0 48 32" aria-hidden="true"><rect class="pl" x="5" y="13" width="24" height="12" rx="2"/><path class="wv" d="M33 12a6 6 0 0 1 0 10M37 9a10 10 0 0 1 0 16M41 6a14 14 0 0 1 0 22"/></svg>',
  ipad:()=>'<svg viewBox="0 0 60 80" aria-hidden="true"><rect class="dv" x="6" y="4" width="48" height="72" rx="7"/><rect class="sc" x="11" y="10" width="38" height="58" rx="3"/><rect class="ac" x="14" y="56" width="32" height="8" rx="1.5"/></svg>',
  iphone:()=>'<svg viewBox="0 0 60 80" aria-hidden="true"><rect class="dv" x="14" y="4" width="32" height="72" rx="8"/><rect class="sc" x="18" y="11" width="24" height="56" rx="3"/><rect class="ac" x="20" y="56" width="20" height="7" rx="1.5"/></svg>',
  laptop:()=>'<svg viewBox="0 0 80 60" aria-hidden="true"><rect class="dv" x="12" y="6" width="56" height="38" rx="4"/><rect class="sc" x="17" y="11" width="46" height="28" rx="2"/><path class="dv" d="M4 46h72l-5 7H9z"/></svg>',
  monitor:()=>'<svg viewBox="0 0 80 60" aria-hidden="true"><rect class="dv" x="6" y="4" width="68" height="42" rx="4"/><rect class="sc" x="11" y="9" width="58" height="32" rx="2"/>'+[16,21,26].map((x,i)=>'<circle cx="'+x+'" cy="14" r="1.6" fill="'+["#f0566b","#f2b23a","#35c58a"][i]+'"/>').join("")+'<rect class="ac" x="20" y="27" width="40" height="6" rx="1.5"/><path class="dv" d="M34 46h12l3 8H31z"/></svg>',
  appdev:()=>'<svg viewBox="0 0 60 80" aria-hidden="true"><rect class="dv" x="10" y="4" width="40" height="72" rx="7"/><rect class="sc" x="15" y="10" width="30" height="60" rx="3"/><rect x="20" y="26" width="20" height="20" rx="5" fill="#fff"/><path d="M25 30v12M30 30v12M35 30v12" stroke="#7a5bf5" stroke-width="3" stroke-linecap="round"/><rect class="ac" x="20" y="54" width="20" height="4" rx="2"/></svg>',
  cablex:()=>'<svg viewBox="0 0 120 72" aria-hidden="true"><path class="ln" d="M14 36h92"/><rect class="pl" x="6" y="29" width="14" height="14" rx="2"/><rect class="pl" x="100" y="29" width="14" height="14" rx="3"/><circle cx="60" cy="36" r="13" fill="none" stroke="#f0566b" stroke-width="4"/><path d="M52 28l16 16M68 28L52 44" stroke="#f0566b" stroke-width="4" stroke-linecap="round"/></svg>'
};
const MW_ICON={kb:'<svg viewBox="0 0 24 24"><rect x="2.5" y="7" width="19" height="11" rx="2"/><path d="M6.5 7v6M10 7v6M14 7v6M17.5 7v6"/></svg>', fix:'<svg viewBox="0 0 24 24"><path d="M9 3v4M15 3v4M7 7h10v4a5 5 0 0 1-10 0zM12 16v5"/></svg>', web:'<svg viewBox="0 0 24 24"><rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="M3 9h18M6.5 6.8h.01M9 6.8h.01"/></svg>', clock:'<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/></svg>',
  search:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>', mic:'<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>', screen:'<svg viewBox="0 0 24 24"><rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
  chev:'<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>', retry:'<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4"/></svg>', copy:'<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>', check:'<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'};
// cable drawing (M6): keyboard → cable → device, the right plug at each end
function mwCableArt(){ const d=mwDev(), din=MW.conn==="din", key=mwCableKey(), dev=d.kind, devArt = dev==="ipad"?MWA.ipad():dev==="iphone"||dev==="android"?MWA.iphone():dev==="mac"||dev==="cros"?MWA.laptop():MWA.monitor();
  const end2 = key==="light" ? "light" : key==="pc" ? "usba" : "usbc";
  let h='<svg class="mw-cable" viewBox="0 0 600 176" role="img" aria-label="'+esc(t("mdCableN")[key])+'"><g transform="translate(6,62)">'+(din?'<rect class="wd" x="0" y="0" width="150" height="46" rx="6"/>'+mwKeys(8,22,134,20,18):'<rect class="bd" x="0" y="4" width="150" height="42" rx="7"/>'+mwKeys(8,18,134,22,18))+'</g>';
  h+='<path class="ln" d="M156 84H'+(din?250:470)+'"/>'; if(din) h+='<rect class="dk2" x="250" y="66" width="80" height="36" rx="8"/><path class="ln" d="M330 84H470"/>';
  h+='<rect class="pl" x="150" y="76" width="14" height="16" rx="2"/><rect class="pl" x="460" y="77" width="14" height="14" rx="4"/>';
  h+='<g transform="translate(478,20) scale(1.6)">'+devArt.replace(/^<svg[^>]*>|<\/svg>$/g,"")+'</g>';
  const art=s=>s.replace(/^<svg[^>]*>|<\/svg>$/g,""), bub=(cx,a)=>'<g transform="translate('+(cx-22)+',2)"><circle class="bub" cx="22" cy="22" r="21"/><g transform="translate(4,8) scale(.75)">'+art(a)+'</g></g><path class="ln3" d="M'+cx+' 44v26"/>';
  h+=bub(160, din?MWA.din():MWA.usbb())+bub(466, MWA[end2]());
  h+='<text class="tl" x="80" y="140" text-anchor="middle">'+esc(t("mdKbYou"))+'</text><text class="ts" x="80" y="158" text-anchor="middle">'+esc(t("mdEnd")[din?"din":"usbb"])+'</text>';
  h+='<text class="tl ac3" x="'+(din?290:310)+'" y="'+(din?126:72)+'" text-anchor="middle">'+esc(t("mdCableN")[key])+'</text>';
  h+='<text class="tl" x="518" y="164" text-anchor="middle">'+esc(t("mdYourDev")[dev])+'</text>';
  return h+'</svg>'; }
function mwCableKey(){ const d=mwDev(); if(MW.conn==="din") return "din"; if(d.ios) return MW.port==="light"?"light":"usbc"; return d.kind==="mac"?"mac":d.kind==="android"?"android":d.kind==="cros"?"pc":"pc"; }
// ---- open / close / navigate ----
function mwOpen(step){ try{ closeDrawer(); }catch(e){} if(midiOpen) closeMidi(); const d=mwDev(), h=mwHw();
  Object.assign(MW,{on:true, hist:[], hw:"", found:"", still:false, solved:false, detecting:false, msg:"", btAsked:false, copied:false, open:-1});
  MW.conn=h.conn||""; MW.port = /lightning/.test(h.dev||"") ? "light" : /usbc/.test(h.dev||"") ? "usbc" : "";
  MW.step = !d.ok ? "safari" : (step||"hw");
  const el=$("mwiz"); el.classList.toggle("mw-top", document.body.classList.contains("gate-on") || (typeof startUI==="function"&&startUI()));
  openMod("mwiz"); mwEnter(); }
function mwClose(){ if(!MW.on) return; MW.on=false; mwStop(); if(MW.lat) MW.lat.run=false; const s=mdS(); s.wizard={...(s.wizard||{}), step:MW.step}; save(); closeMod("mwiz"); mdPill(); try{ mdHub(); }catch(e){} try{ mkRender(); }catch(e){}
  if(FN.on){ if(midiReady && fnModes().includes("midi") && (fnMidiName() || FN.st!=="hw")){ FN.how="midi"; if(FN.st==="hw"){ FN.st="c"; FN.t0=Date.now(); } } fnRender(); } }
function mwStop(){ clearTimeout(MW.tm); clearInterval(MW.poll); clearTimeout(MW.go); MW.tm=MW.poll=MW.go=0; if(MW.lat) clearTimeout(MW.lat.tm); }
function mwGo(step, back){ if(!back && step!==MW.step) MW.hist.push(MW.step); MW.step=step; MW.found=""; MW.still=false; MW.solved=false; MW.msg=""; MW.open=-1; mwStop(); mwEnter(); }
function mwPrev(){ const p=MW.hist.pop(); if(p) mwGo(p,true); }
function mwEnter(){ const st=MW.step, s=mdS(); s.wizard={...(s.wizard||{}), step:st};
  if(["hw","cable","bt","trouble"].includes(st)) mwListen();
  if(st==="cable"){ MW.tm=setTimeout(()=>{ if(MW.on&&MW.step==="cable"&&!midiReady){ MW.still=true; mwRender(); } },20000); }
  if(st==="test"){ MW.t={vels:[], last:null, lo:null, lo0:null, ped:!!mwHw().ped, pedAsk:true, twice:"", picked:"", n:0}; MW.tm=setTimeout(()=>{ if(MW.on&&MW.step==="test"&&MW.t&&!MW.t.n){ MW.t.silent=true; mwRender(); } },15000); }
  if(st==="range") mwRangeStart();
  if(st==="ready") mwFinish();
  if(st==="lat") MW.lat={run:false, beats:[], hits:[], res:undefined};
  mwRender(); }
// detection in the background: the browser asks once for MIDI (a step the player chose), the app re-reads its ports every 2 s (Bluetooth pairing, hub…)
function mwListen(){ if(!midiPossible()) return; if(!midiAcc && !midiDenied && navigator.requestMIDIAccess && MW.step!=="hw") enableMidi(true).then(()=>{ if(MW.on) mwRender(); });
  clearInterval(MW.poll); if(window.__nativeMidi) MW.poll=setInterval(()=>{ if(!MW.on) return; try{ window.__nativeMidi.listInputs().catch(()=>{}); }catch(e){} },2000); }
// a port arrives or leaves while the assistant is open (called by mdPorts)
function mwPorts(names){ if(!MW.on) return; const n=names[0];
  if(n && ["cable","bt","trouble"].includes(MW.step)){ MW.found=n; if(MW.step==="trouble") MW.solved=true; mwRender(); clearTimeout(MW.go); MW.go=setTimeout(()=>{ if(MW.on && midiReady) mwGo("test"); },1000); return; }
  mwRender(); }
// every MIDI message goes here first while the assistant is open (the game underneath does not get them)
function mwMsg(st, note, vel, inp){ if(!MW.on) return false; const ty=st&0xf0, name=inp&&inp.name||"";
  if(ty===0xB0){ if(note===64 && vel>=64 && MW.step==="test" && MW.t){ MW.t.ped=true; mwHw().ped=true; save(); mwRender(); } return true; }
  if(ty!==0x90 || !vel) return true;
  if(S.settings.midiSound) tone(note,0,.9,.1+.26*vel/127);
  const st2=MW.step;
  if(["hw","how","cable","bt","trouble"].includes(st2)){ mwGo("test"); mwTestNote(note,vel,name); return true; }
  if(st2==="test") mwTestNote(note,vel,name);
  else if(st2==="range") mwRangeNote(note);
  else if(st2==="lat") mwLatHit(performance.now());
  else if(st2==="ready" && note%12===0) mwPlay();
  return true; }
// ---- M8 in the assistant: a note, loud / soft, twice, pedal ----
function mwTestNote(m, v, name){ const T=MW.t; if(!T) return; T.n++; T.vels.push(v); T.last={m,v,name}; T.silent=false;
  if(midiNames.length>1 && !T.picked && name){ T.picked=name; S.settings.midiInput=name; }
  const s=mdS(), h=mwHw(); s.tested=Date.now(); if(name && h.name!==name){ s.hw={name}; } const r=mwTouch(); if(r!=null) mwHw().vel=r; save();
  const bd=md4Band(m, T.lo0, name); T.lo=T.lo0=bd.lo; T.nk=bd.n; mwRender(); }
function mwTouch(){ const v=MW.t?MW.t.vels:[]; if(v.length<2) return null; const mx=Math.max(...v), mn=Math.min(...v); if(mx-mn>=30) return true; if(mx===mn) return false; return null; }
// MIDI 4 : exactement les touches du clavier reconnu (24 pour un LUMI, 25, 49…), voir md4Band
function mwKb2(lo, on, nc, n){ if(lo==null){ const b=md4Band(null,null,""); lo=b.lo; n=b.n; } return '<div class="mt-kb mw-kb" aria-hidden="true">'+md4BandHTML(lo, lo+(n||25)-1, on, nc)+'</div>'; }
// ---- M9 range ----
function mwRangeStart(){ const sz=S.settings.kbdSize||"auto", h=mwHw(); MW.r={lo:null, hi:null, mode: /^\d+$/.test(sz) && !(h.lo>0) ? "guess" : "measure", err:""}; }
function mwRangeNote(m){ const R=MW.r; if(!R) return; if(R.mode==="guess") R.mode="measure"; R.lo=R.lo==null?m:Math.min(R.lo,m); R.hi=R.hi==null?m:Math.max(R.hi,m); R.err=""; mwRender(); }
function mwRangeApply(){ const R=MW.r; if(!R||R.lo==null||R.hi-R.lo<11){ if(R){ R.err=t("mdRangeShort"); mwRender(); } return; }
  let lo=R.lo, hi=R.hi; const white=m=>[0,2,4,5,7,9,11].includes(m%12); while(!white(lo)) lo--; while(!white(hi)) hi++;
  Object.assign(S.settings,{kbdSize:"custom",kbdLow:lo,kbdHigh:hi}); Object.assign(mwHw(),{lo,hi,keys:hi-lo+1}); save(); buildKeyboard(); renderSettings(); mwGo("ready"); }
function mwRangeGuessOk(){ const sz=S.settings.kbdSize; if(KB_PRESETS && KB_PRESETS[sz]){ const [lo,hi]=KB_PRESETS[sz]; Object.assign(mwHw(),{lo,hi,keys:+sz}); save(); } mwGo("ready"); }
function mwKeysTxt(){ const h=mwHw(); if(h.lo>0 && h.hi>h.lo) return t("mdKeys")(h.keys||h.hi-h.lo+1, octName(h.lo), octName(h.hi)); const sz=S.settings.kbdSize;
  if(sz==="custom" && S.settings.kbdHigh>S.settings.kbdLow) return t("mdKeys")(S.settings.kbdHigh-S.settings.kbdLow+1, octName(S.settings.kbdLow), octName(S.settings.kbdHigh));
  return /^\d+$/.test(sz||"") ? t("mdKeysN")(sz) : ""; }
// a strip of the 88 keys with the measured part lit (M9)
function mwStrip(lo, hi){ let w='', b=''; const WH=[0,2,4,5,7,9,11], wh=[]; for(let m=21;m<=108;m++) if(WH.includes(m%12)) wh.push(m); const ww=100/wh.length;
  wh.forEach(m=>{ const inR=lo!=null&&m>=lo&&m<=hi, edge=m===lo||m===hi; w+='<span class="w'+(inR?' in':'')+(edge?' edge':'')+'"></span>'; });
  for(let m=22;m<108;m++) if(!WH.includes(m%12)){ const i=wh.indexOf(m-1); b+='<span class="b'+(lo!=null&&m>=lo&&m<=hi?' in':'')+'" style="left:calc('+((i+1)*ww)+'% - '+(ww*.32)+'%);width:'+(ww*.64)+'%"></span>'; }
  return '<div class="mw-strip" aria-hidden="true">'+w+b+'</div>'; }
// ---- M10 ----
function mwFinish(){ const s=mdS(), h=mwHw(); if(MW.conn) h.conn=MW.conn; h.dev=mwDevKey(); if(!h.name && midiNames[0]) h.name=midiNames[0]; s.wizard={...(s.wizard||{}), done:Date.now()}; save();
  if(midiReady && S.settings.input!=="midi" && !FN.on) setInput("midi"); }
function mwPlay(){ mwClose(); if(FN.on && $("fnKb")) return; /* the first screen: « play a C » comes next */ }
function mwFallback(v){ const s=mdS(); s.wizard={...(s.wizard||{}), gaveUp:Date.now()}; save(); mwClose();
  if(FN.on){ if(typeof fnPick==="function" && FN.st) fnPick(v); else { const b=$("gate")&&$("gate").querySelector('.fn-in[data-v="'+v+'"]'); if(b) b.click(); } return; }
  setInput(v, v!=="screen"); }
// ---- M11 trouble: 5 lines at most, by device, connection and step ----
function mwFixes(){ const d=mwDev(), seen=midiNames.length>0, c=MW.conn||mwHw().conn||"", L=[], add=(i,p)=>{ if(!L.some(x=>x.i===i)) L.push({i,p}); };
  if(!seen){ if(!d.nat && midiDenied) add(4,0); if(d.kind==="win") add(5,1); if(d.ios && MW.port==="light") add(3,1); if(c==="bt"){ add(6,1); add(7,3); } if(c==="din") add(13,1);
    if(c!=="bt") add(2,2); add(1,2); if(MW.hw==="digital") add(9,3); if(!d.nat && !midiDenied) add(4,4); }
  else { add(8,1); if(c!=="bt") add(9,2); add(10,2); if(c==="bt"){ add(12,1); add(7,2); } add(11,3); add(12,3); if(d.kind==="win") add(5,3); }
  return L.sort((a,b)=>a.p-b.p).slice(0,5).map(x=>x.i); }
async function mwRetry(){ MW.retry=1; MW.msg=""; mwRender(); try{ if(window.__nativeMidi){ if(!midiAcc) await enableMidi(true); await window.__nativeMidi.listInputs(); } else if(!midiAcc || midiDenied) await enableMidi(); else if(midiAcc.onstatechange) midiAcc.onstatechange(); }catch(e){}
  setTimeout(()=>{ if(!MW.on) return; MW.retry=0; if(midiReady){ MW.solved=true; MW.found=midiNames[0]; mwRender(); clearTimeout(MW.go); MW.go=setTimeout(()=>{ if(MW.on&&MW.step==="trouble") mwGo("test"); },1000); } else { MW.msg=t("mdStillNo"); mwRender(); } },1200); }
function mwMail(){ const d=mwDev(), ua=(navigator.userAgent||"").slice(0,160); return "mailto:"+MW_SUPPORT+"?subject="+encodeURIComponent(t("mdMailS"))+"&body="+encodeURIComponent(t("mdMailB")(mwDevLbl(d), d.nat?"app":ua, midiNames.join(", ")||"—")); }
// ---- calibration: a key on each click of a metronome (80 bpm, 8 clicks) ----
function mwLatGo(){ const c=audio(), per=750, lead=700, out=c ? ((c.outputLatency||c.baseLatency||0)*1000) : 0, L=MW.lat; clearTimeout(L.tm);
  for(let i=0;i<8;i++) tone(i%4===0?96:91,(lead+i*per)/1000,.05,.32);
  L.t0=performance.now()+lead+out; L.per=per; L.beats=Array.from({length:8},(_,i)=>L.t0+i*per); L.hits=[]; L.got={}; L.run=true; L.res=undefined; mwRender();
  L.tm=setTimeout(mwLatEnd, lead+8*per+350); }
function mwLatHit(ts){ const L=MW.lat; if(!L||!L.run) return; let k=0; L.beats.forEach((b,i)=>{ if(Math.abs(ts-b)<Math.abs(ts-L.beats[k])) k=i; }); const dlt=ts-L.beats[k];
  if(Math.abs(dlt)>300 || L.got[k]) return; L.got[k]=1; L.hits.push(dlt); const dot=$("mwBody").querySelector('.mw-ldots [data-k="'+k+'"]'); if(dot) dot.classList.add("on"); }
function mwLatEnd(){ const L=MW.lat; if(!L) return; L.run=false; if(L.hits.length>=4){ const v=Math.max(-50,Math.min(150,Math.round(L.hits.reduce((a,b)=>a+b,0)/L.hits.length))); mdS().lat=v; L.res=v; save(); } else L.res=null; if(MW.on && MW.step==="lat") mwRender(); try{ mkRender(); }catch(e){} }
// ---- rendering ----
const mwB=(a,txt,cls,ic,dis)=>'<button type="button" class="btn'+(cls?' '+cls:'')+'" data-a="'+a+'"'+(dis?' disabled':'')+'>'+(ic?'<span class="mw-bi" aria-hidden="true">'+MW_ICON[ic]+'</span>':'')+'<span>'+esc(txt)+'</span></button>';
function mwFoot(primary, opt){ opt=opt||{}; let h=''; if(opt.back!==false && MW.hist.length) h+=mwB("prev",t("mdPrev"),"ghost mw-back");
  if(opt.fb!==false) h+='<span class="mw-fb">'+esc(t("mdNoKb"))+'</span>'+mwB("mic",t("mdUseMic"),"ghost","mic")+mwB("screen",t("mdUseScreen"),"ghost","screen");
  if(opt.extra) h+=opt.extra; h+='<span class="mw-sp"></span>'; if(primary) h+=primary; return h; }
function mwRender(){ if(!MW.on) return; const st=MW.step, d=mwDev(), body=$("mwBody"), foot=$("mwFoot"); let h='', f='', ic=MW_ICON.kb, ti=t("mdWizT"), dot=0;
  const found = midiNames.length ? '<div class="mw-found" role="status"><span class="mw-ok">'+MW_ICON.check+'</span><b>'+esc(t("mdFound")(mdTrunc(midiNames[0])))+'</b><span class="mw-sp"></span>'+mwB("totest",t("mdTestNow"),"primary")+'</div>' : '';
  if(st==="hw"){ dot=1;
    h='<h2 id="mwH">'+esc(t("mdWhat"))+'</h2><p class="mw-sub">'+esc(t("mdWhatS")(mwDevLbl(d)))+'</p>'+found
      +'<div class="mw-opts n4">'+["midi","digital","acoustic","none"].map((k,i)=>'<button type="button" class="mw-opt" data-a="hw:'+k+'"><span class="mw-art">'+MWA[k]()+'</span><b>'+esc(t("mdHw")[i])+'</b><small>'+esc(t("mdHwS")[i])+'</small><span class="mw-go">'+esc(t("mdHwGo")[i])+'</span></button>').join("")+'</div>'
      +(midiNames.length?'':'<div class="mw-row"><span class="mw-radio'+(MW.detecting?' on':'')+'"></span><span class="mw-rt"><b>'+esc(t("mdAlready"))+'</b><small>'+esc(MW.detecting?t("mdLooking"):MW.msg||t("mdAlreadyS"))+'</small></span>'+(MW.msg?mwB("trouble",t("mdTrouble"),"ghost"):'')+mwB("detect",t("mdDetect"),"","search",MW.detecting)+'</div>');
    f=mwFoot("",{back:false}); }
  else if(st==="how"){ dot=2; const C=t("mdConn"), P=t("mdPorts"), needPort=d.ios && MW.conn && MW.conn!=="bt", ready=MW.conn && (!needPort || MW.port);
    h='<h2 id="mwH">'+esc(t("mdHow"))+'</h2><div class="mw-opts n3 mw-conn">'+[["usb",MWA.usbb()+MWA.usbc()],["bt",MWA.waves()],["din",MWA.din()+MWA.din()]].map(([k,a],i)=>'<button type="button" class="mw-opt" data-a="conn:'+k+'" aria-pressed="'+(MW.conn===k)+'"><span class="mw-art mw-plugs">'+a+'</span><b>'+esc(C[i][0])+'</b><small>'+esc(C[i][1])+'</small></button>').join("")+'</div>'
      +'<p class="mw-tip"><button type="button" class="mw-link" data-a="dunno">'+esc(t("mdDunno"))+'</button> <span'+(MW.dunno?'':' hidden')+'>'+esc(t("mdDunnoS"))+'</span></p>'
      +(needPort?'<p class="mw-q"><b>'+esc(t("mdPort")(t("mdDevL")[d.kind]))+'</b> <small>'+esc(t("mdPortS"))+'</small></p><div class="mw-opts n2 mw-port">'+[["usbc",MWA.usbc()],["light",MWA.light()]].map(([k,a],i)=>'<button type="button" class="mw-opt mw-h" data-a="port:'+k+'" aria-pressed="'+(MW.port===k)+'"><span class="mw-art mw-plugs">'+a+'</span><span class="mw-rt"><b>'+esc(P[i][0])+'</b><small>'+esc(P[i][1])+'</small></span></button>').join("")+'</div>':'')
      +(d.kind==="win" && MW.conn==="bt" && !d.nat ? '<p class="mw-warn" role="note">'+esc(t("mdWinBt"))+'</p>':'');
    f=mwFoot(mwB("next",t("mdNext"),"primary","",!ready)); }
  else if(st==="cable"){ dot=3; const key=mwCableKey(), txt={usbc:"mdCableUsbc",light:"mdCableLight",mac:"mdCableMac",pc:"mdCablePc",android:"mdCableAndroid",din:"mdCableDin"}[key];
    h='<h2 id="mwH">'+esc(t("mdCableT"))+'</h2><div class="mw-draw">'+mwCableArt()+'</div><p class="mw-txt">'+esc(t(txt))+(key!=="din"&&key!=="light"?' <small>'+esc(t("mdCableAlt"))+'</small>':'')+'</p>'
      +'<div class="mw-two"><div class="mw-row mw-wait'+(MW.found?' ok':'')+'" role="status"><span class="mw-spin'+(MW.found?' ok':'')+'"></span><span class="mw-rt"><b>'+esc(MW.found?t("mdFound")(mdTrunc(MW.found)):t("mdLooking"))+'</b><small>'+esc(t("mdLookingS"))+'</small></span></div>'
      +(MW.still?'<div class="mw-still"><b>'+esc(t("mdStill"))+'</b> <button type="button" class="mw-link" data-a="trouble">'+esc(t("mdMoreHelp"))+'</button><ul>'+t("mdStillL").map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul></div>':'')+'</div>';
    f=mwFoot(midiNames.length?mwB("totest",t("mdTestNow"),"primary"):mwB("trouble",t("mdTrouble"),"")); }
  else if(st==="bt"){ dot=3; const steps = d.nat ? t("mdBtIos") : d.kind==="mac" ? t("mdBtMac") : null;
    h='<h2 id="mwH">'+esc(t("mdBtT"))+'</h2>'+(steps?'<ol class="mw-steps">'+steps.map((x,i)=>'<li><span class="mw-n">'+(i+1)+'</span><span class="mw-rt"><b>'+esc(x[0])+'</b><small>'+esc(x[1])+'</small></span></li>').join("")+'</ol>':'<p class="mw-warn">'+esc(t("mdBtOther"))+'</p>')
      +(MW.found?'<div class="mw-found" role="status"><span class="mw-ok">'+MW_ICON.check+'</span><b>'+esc(t("mdFound")(mdTrunc(MW.found)))+'</b></div>':d.nat?'<p class="mw-sub">'+esc(t("mdBtAfter"))+'</p>':'')
      +(MW.btAsked && !MW.found?'<p class="mw-tip"><b>'+esc(t("mdBtNot"))+'</b> <button type="button" class="mw-link" data-a="trouble">'+esc(t("mdMoreHelp"))+'</button></p>':'');
    f=mwFoot(d.nat ? mwB("bt",t("mdBtFind"),"primary","search") : d.kind==="mac" ? (midiNames.length?mwB("totest",t("mdTestNow"),"primary"):mwB("trouble",t("mdTrouble"),"")) : mwB("tocable",t("mdBtCable"),"primary")); }
  else if(st==="test"){ dot=4; const T=MW.t||{vels:[],lo:null}, L=T.last, nc=L?"var(--note-"+(L.m%12)+")":"", many=midiNames.length>1 && !T.picked;
    h='<h2 id="mwH">'+esc(t("mdPressAny"))+'</h2>'
      +'<p class="mw-msg'+(L?' ok':'')+(T.silent?' bad':'')+'" role="status">'+(L?'<span class="mw-ok">'+MW_ICON.check+'</span>':'')+'<span><b>'+esc(L?t("mdTalks"):T.silent?t("mdSilent"):many?t("mdPickKb"):t("mdLooking"))+'</b><small>'+esc(L?t("mdFrom")(octName(L.m),L.name)+(T.picked&&midiNames.length>1?" · "+t("mdPicked")(T.picked):""):"")+'</small></span>'+(T.silent?mwB("trouble",t("mdTrouble"),"ghost"):'')+'</p>'
      +'<div class="mt-row mw-trow"><div class="mt-note"'+(L?' style="--nc:'+nc+'"':'')+'><b>'+(L?esc((S.settings.notation==="fr"?PC_FR:PC_EN)[L.m%12]):"♪")+'</b><small>'+(L?esc(octName(L.m)):"")+'</small></div>'+mwKb2(T.lo,L?L.m:-1,nc,T.nk)+'</div>'
      +'<div class="mw-tsteps">'
      +'<div class="mt-step'+(T.ped||T.noPed?' done':'')+'"><b>'+esc(t("mdPedal"))+'</b><small class="'+(T.ped?'ok':'')+'">'+(T.ped?esc(t("mdPedalOk")):T.noPed?'—':'<button type="button" class="mw-link" data-a="noped">'+esc(t("mdNoPedal"))+'</button>')+'</small></div></div>'
      +((MW.conn==="bt"||mwHw().conn==="bt")?'<p class="mw-tip"><button type="button" class="mw-link" data-a="lat">'+esc(t("mdLatAsk"))+'</button></p>':'');
    f=mwFoot(mwB("range",t("mdNext"),"primary","",!L)); }
  else if(st==="range"){ dot=4; const R=MW.r||{}, ok=R.lo!=null&&R.hi-R.lo>=11;
    if(R.mode==="guess"){ h='<h2 id="mwH">'+esc(t("mdGuess")(S.settings.kbdSize))+'</h2><p class="mw-sub">'+esc(t("mdRangeS"))+'</p>'+mwStrip(...(KB_PRESETS[S.settings.kbdSize]||[null,null]));
      f=mwFoot(mwB("rmeasure",t("mdMeasure"),"")+mwB("rguess",t("mdYes"),"primary"),{fb:false}); }
    else { h='<h2 id="mwH" class="mw-range-h">'+esc(t("mdRangeT"))+'</h2><p class="mw-sub">'+esc(t("mdRangeS"))+'</p>'
      +'<div class="mw-ends"><span class="'+(R.lo!=null?'ok':'')+'">← '+esc(t("mdLeft"))+(R.lo!=null?' · '+esc(octName(R.lo))+' ✓':'')+'</span><span class="'+(ok?'ok':'')+'">'+(ok?esc(octName(R.hi))+' ✓ · ':'')+esc(t("mdRight"))+' →</span></div>'
      +mwStrip(R.lo,R.hi)+'<p class="mw-res" role="status">'+(ok?'<b>'+esc(t("mdKeys")(R.hi-R.lo+1,octName(R.lo),octName(R.hi)))+'</b>':R.err?'<span class="bad">'+esc(R.err)+'</span>':'')+'<small>'+esc(t("mdFull88"))+'</small></p>';
      f=mwFoot(mwB("rredo",t("mdRedo"),"ghost","retry")+mwB("rskip",t("mdSkip"),"ghost")+mwB("rok",t("mdOkBtn"),"primary"),{fb:false}); } }
  else if(st==="ready"){ dot=5; const hw=mwHw(), kt=mwKeysTxt(), vel=hw.vel, nm=hw.name||midiNames[0]||"";
    h='<div class="mw-ready"><span class="mw-robj" aria-hidden="true">'+OBJ.midikbd()+'</span><h2 id="mwH">'+esc(t("mdReady"))+'</h2><p class="mw-sub">'+esc(t("mdReadyS"))+'</p>'
      +'<div class="mw-fiche"><b class="mw-nm"><i></i>'+esc(nm)+(midiReady?'<span class="mw-tag">'+esc(t("mdConnected"))+'</span>':'')+'</b><span class="mw-chips">'+(kt?'<span>'+esc(kt)+'</span>':'')+(vel!=null?'<span'+(vel?' class="ok"':'')+'>'+esc(t(vel?"mdVelOk":"mdVelNo"))+'</span>':'')+(hw.ped?'<span class="ok">'+esc(t("mdPedOk"))+'</span>':'')+'<span>'+esc(t(S.settings.midiSound===false?"mdSndPiano":"mdSndApp"))+'</span>'+(S.midi&&S.midi.lat?'<span>'+esc(t("mdLatN")(midiLat()))+'</span>':'')+'</span></div>'
      +'<ul class="mw-adv">'+[0,1,2].map(i=>'<li><span class="mw-ai a'+i+'" aria-hidden="true">'+["♪♫","Do","f p"][i].replace("Do",S.settings.notation==="fr"?"Do":"C")+'</span><span>'+esc(i===2&&vel===false?t("mdAdvNoVel"):t("mdAdv")[i])+'</span></li>').join("")+'</ul></div>';
    f=mwFoot(mwB("retest",t("mdRetest"),"ghost")+((hw.conn==="bt"||MW.conn==="bt")?mwB("lat",t("mdLatB"),"ghost","clock"):'')+mwB("play",t(FN.on?"mdPlayC":"mdPlay"),"primary mw-big"),{fb:false,back:false}); }
  else if(st==="trouble"){ ic=MW_ICON.fix; ti=t("mdTrouble"); const fx=mwFixes(), F=t("mdFix"), A=t("mdFixAct"), c=MW.conn||mwHw().conn, prev=MW.hist[MW.hist.length-1];
    const chips=[mwDevLbl(d)].concat(c?[t("mdConnN")[c]+(d.ios&&MW.port&&c!=="bt"?" · "+(MW.port==="light"?"Lightning":"USB-C"):"")]:[]).concat(prev&&t("mdStepN")[prev]?[t("mdStepN")[prev]]:[]);
    h='<h2 id="mwH" class="mw-dup">'+esc(t("mdTrouble"))+'</h2><div class="mw-chips2">'+chips.map(x=>'<span>'+esc(x)+'</span>').join("")+'</div>'
      +(MW.solved?'<div class="mw-found" role="status"><span class="mw-ok">'+MW_ICON.check+'</span><b>'+esc(t("mdSolved"))+' '+esc(MW.found?t("mdFound")(mdTrunc(MW.found)):"")+'</b></div>':'')
      +'<ul class="mw-fix">'+fx.map((i,k)=>{ const o=MW.open===i, x=F[i-1]; return '<li class="'+(o?'open':'')+'" data-fix="'+i+'"><button type="button" class="mw-fh" data-a="fix:'+i+'" aria-expanded="'+o+'"><span class="mw-rt"><b>'+esc(x[0])+'</b><small>'+esc(x[1])+'</small></span><span class="mw-chev">'+MW_ICON.chev+'</span></button>'
        +(o?'<div class="mw-fb2">'+(i===2?'<span class="mw-fart">'+MWA.cablex()+'</span>':'')+'<p>'+esc(x[2])+'</p>'+(A[i]?mwB("fixact:"+i,A[i],"primary"):mwB("retry",t("mdRetry"),"primary","retry",MW.retry))+'</div>':'')+'</li>'; }).join("")+'</ul>'
      +(MW.msg?'<p class="mw-warn" role="status">'+esc(MW.msg)+'</p>':'');
    f=mwFoot('<a class="mw-link mw-mail" href="'+esc(mwMail()).replace(/"/g,"&quot;")+'">'+esc(t("mdSupport"))+'</a>',{fb:true}); }
  else if(st==="safari"){ ic=MW_ICON.web; ti=t("mdWizT"); const saf=d.ios||d.br==="Safari", macSaf=!d.ios&&d.kind==="mac";
    const app='<div class="mw-card2'+(d.ios?' best':'')+'"><span class="mw-art">'+MWA.appdev()+'</span><span class="mw-rt"><b>'+esc(t("mdAppT"))+'</b><small>'+esc(t("mdAppS"))+'</small></span><span class="mw-soon">'+esc(t("mdAppSoon"))+'</span></div>';
    const chr='<div class="mw-card2'+(macSaf?' best':'')+'"><span class="mw-art">'+MWA.monitor()+'</span><span class="mw-rt"><b>'+esc(t(macSaf?"mdChromeHere":"mdChromeT"))+'</b><small>'+esc(t(macSaf?"mdChromeHereS":"mdChromeS"))+'</small></span>'+mwB("copy",t(MW.copied?"mdCopied":"mdCopy"),"","copy")+'</div>';
    h='<h2 id="mwH">'+esc(t(saf?"mdSafari":"mdNoMidiT"))+'</h2><p class="mw-sub">'+esc(t(saf?"mdSafariS":"mdNoMidiS"))+'</p><p class="mw-k">'+esc(t("mdForKb"))+'</p>'+(macSaf?chr+app:app+chr);
    f=mwFoot("",{back:false}).replace(esc(t("mdNoKb")),esc(t("mdMeanwhile"))); }
  else if(st==="none"){ dot=1; h='<h2 id="mwH">'+esc(t("mdNoneT"))+'</h2><p class="mw-sub">'+esc(t("mdNoneS"))+'</p><div class="mw-opts n3 mw-buy">'+t("mdBuy").map((x,i)=>'<div class="mw-opt"><span class="mw-art">'+[MWA.midi(),MWA.digital(),MWA.digital()][i]+'</span><b>'+esc(x[0])+'</b><small>'+esc(x[1])+'</small></div>').join("")+'</div>';
    f=mwFoot(mwB("screen",t("mdUseScreen"),"primary","screen"),{fb:false}); }
  else if(st==="lat"){ ic=MW_ICON.clock; ti=t("mdMine"); const L=MW.lat||{};
    h='<h2 id="mwH">'+esc(t("mdLatT"))+'</h2><p class="mw-sub">'+esc(t("mdLatS"))+'</p><div class="mw-lat" id="mwLat" data-t0="'+(L.t0||0)+'" data-per="'+(L.per||0)+'" data-run="'+(L.run?1:0)+'"><div class="mw-ldots">'+Array.from({length:8},(_,i)=>'<i data-k="'+i+'" class="'+(L.got&&L.got[i]?'on':'')+'" style="--d:'+(i*750+700)+'ms"></i>').join("")+'</div>'
      +'<button type="button" class="mw-tap" id="mwTap"'+(L.run?'':' disabled')+'>'+esc(t("mdLatTap"))+'</button></div>'
      +'<p class="mw-res" role="status">'+(L.res===undefined?'':L.res===null?'<span class="bad">'+esc(t("mdLatNone"))+'</span>':'<b>'+esc(t("mdLatRes")(L.res))+'</b><small>'+esc(t("mdLatHint"))+'</small>')+'</p>';
    f=mwFoot((L.run?'':mwB("latgo",L.res===undefined?t("mdLatGo"):t("mdLatAgain"),L.res===undefined?"primary":"ghost","clock"))+(L.res!=null&&!L.run?mwB("prevok",t("mdOkBtn"),"primary"):''),{fb:false}); }
  $("mwIc").innerHTML=ic; $("mwTi").textContent=ti; $("mwiz").dataset.step=st;
  $("mwDots").innerHTML=dot?[1,2,3,4].map(i=>'<li class="'+(i<dot?'done':i===dot?'cur':'')+'">'+(i<dot?MW_ICON.check:i)+'</li>').join(""):''; $("mwDots").hidden=!dot;
  body.innerHTML=h; foot.innerHTML=f;
  const tap=$("mwTap"); if(tap) tap.addEventListener("pointerdown",e=>{ e.preventDefault(); mwLatHit(e.timeStamp||performance.now()); }); }
// ---- actions ----
$("mwiz").addEventListener("click",async e=>{ const b=e.target.closest("[data-a]"); if(!b || b.disabled) return; const [a,v]=b.dataset.a.split(":");
  if(a==="hw"){ MW.hw=v; if(v==="acoustic"){ mwFallback("mic"); return; } if(v==="none"){ mwGo("none"); return; } mwGo("how"); return; }
  if(a==="conn"){ MW.conn=v; mwRender(); return; } if(a==="port"){ MW.port=v; mwRender(); return; } if(a==="dunno"){ MW.dunno=!MW.dunno; mwRender(); return; }
  if(a==="next"){ mwGo(MW.conn==="bt"?"bt":"cable"); return; } if(a==="prev"){ mwPrev(); return; }
  if(a==="detect"){ MW.detecting=true; MW.msg=""; mwRender(); try{ if(!midiAcc || midiDenied) await enableMidi(); else if(window.__nativeMidi) await window.__nativeMidi.listInputs(); }catch(er){} setTimeout(()=>{ if(!MW.on) return; MW.detecting=false; if(midiReady) mwGo("test"); else { MW.msg=midiDenied?t("mdFix")[3][0]:t("mdNoneFound"); mwRender(); } },midiReady?50:1500); return; }
  if(a==="totest"){ mwGo("test"); return; }
  if(a==="mic"||a==="screen"){ mwFallback(a); return; }
  if(a==="bt"){ try{ if(!midiAcc) await enableMidi(true); await window.__nativeMidi.showBluetooth(); }catch(er){} MW.btAsked=true; mwListen(); mwRender(); return; }
  if(a==="tocable"){ MW.conn="usb"; mwGo("cable"); return; }
  if(a==="trouble"){ mwGo("trouble"); return; }
  if(a==="fix"){ MW.open = MW.open===+v ? -1 : +v; mwRender(); return; }
  if(a==="retry"){ mwRetry(); return; }
  if(a==="fixact"){ if(v==="10"){ S.settings.midiSound=false; save(); renderSettings(); MW.msg=t("mdTwiceYes"); mwRender(); } else mwGo(v==="11"?"range":"lat"); return; }
  if(a==="tw"){ MW.t.twice=v; if(v==="yes") S.settings.midiSound=false; else if(v==="none") S.settings.midiSound=true; save(); renderSettings(); mwRender(); return; }
  if(a==="noped"){ MW.t.noPed=true; mwHw().ped=false; save(); mwRender(); return; }
  if(a==="range"){ mwGo("range"); return; } if(a==="rmeasure"){ MW.r.mode="measure"; mwRender(); return; } if(a==="rguess"){ mwRangeGuessOk(); return; }
  if(a==="rredo"){ MW.r={lo:null,hi:null,mode:"measure",err:""}; mwRender(); return; } if(a==="rskip"){ mwGo("ready"); return; } if(a==="rok"){ mwRangeApply(); return; }
  if(a==="play"){ mwPlay(); return; } if(a==="retest"){ mwGo("test"); return; }
  if(a==="lat"){ mwGo("lat"); return; } if(a==="latgo"){ mwLatGo(); return; } if(a==="prevok"){ if(MW.hist.length) mwPrev(); else mwClose(); return; }
  if(a==="copy"){ const u="https://pianochallenges.com/"; try{ await navigator.clipboard.writeText(u); }catch(er){} MW.copied=true; mwRender(); return; } });
$("mwX").addEventListener("click",mwClose);
document.addEventListener("keydown",e=>{ if(MW.on && e.key==="Escape"){ e.preventDefault(); e.stopImmediatePropagation(); mwClose(); } },true);
// ---- hooks into the rest of the app (wrappers: the original code stays as it is) ----
{ const _mp=mdPorts; mdPorts=function(names){ _mp.apply(this,arguments); try{ mwPorts(names); }catch(e){} try{ mkRender(); }catch(e){} }; }
// M3: the first screen gets one link « Connect my keyboard » next to « You play with » (fnRender itself is untouched)
{ const _fr=fnRender; fnRender=function(){ _fr.apply(this,arguments); try{ mwFnLink(); }catch(e){} }; }
function mwFnLink(){ const g=$("gate"); if(!g||!FN.on||fnMidiName()) return;
  // Étape 2 : the first launch is now D2 (what you play on) → D3 (« play a C ») → D4; one link, in the foot of D2, or under « Plug in your keyboard » on D3 (MIDI waiting)
  const host = FN.st==="hw" ? g.querySelector(".fn-play .fn-foot > span") : (FN.st==="c" && FN.how==="midi") ? g.querySelector(".fn-play .fn-d3s") : null;
  if(!host || host.querySelector(".fn-mw")) return; const b=document.createElement("button"); b.type="button"; b.className="fn-mw"; b.id="fnMw"; b.textContent=t("mdPlug")+" ›"; b.onclick=()=>mwOpen(); host.appendChild(b); }
// the choice of input, without MIDI here: « See how » opens M12
{ const _oc=openInputChooser; openInputChooser=function(){ _oc.apply(this,arguments); const n=$("inOpts")&&$("inOpts").querySelector(".inp-note"); if(n && !n.hidden && !n.querySelector(".mw-link")){ const b=document.createElement("button"); b.type="button"; b.className="mw-link"; b.textContent=" "+t("mdHubHow")+" ›"; b.onclick=()=>{ closeMod("inputModal"); mwOpen(); }; n.appendChild(b); } }; }
$("mdWizB").addEventListener("click",()=>{ closeMidi(); mwOpen(); });
// ---- Settings › Interaction › « My keyboard » ----
function mkRender(){ const f=$("mkField"), c=$("mkCard"); if(!f||!c) return; f.hidden=false; const poss=midiPossible(), h=(S.midi&&S.midi.hw)||{}, on=midiReady, kt=mwKeysTxt(), lat=S.midi&&S.midi.lat!=null&&S.midi.lat!==0;
  const facts=[kt, h.vel===true?t("mdVelOk"):h.vel===false?t("mdVelNo"):"", h.ped?t("mdPedOk"):"", lat?t("mdLatN")(midiLat()):""].filter(Boolean);
  const nm = on ? (h.name&&midiNames.includes(h.name)?h.name:midiNames[0]) : (h.name||"");
  c.className="mk-card"+(on?" on":"");
  c.innerHTML='<span class="mk-dot" aria-hidden="true"></span><span class="mk-t"><b></b><small></small></span><span class="mk-acts">'+(!poss?mwB("safari",t("mdHubHow"),""):mwB("wiz",t("mdWizard"),on?"":"primary")+(on?mwB("test",t("mdTest"),"")+mwB("range",t("mdRangeB"),"")+mwB("lat",t("mdLatB"),""):"")+mwB("trouble",t("mdTrouble"),"ghost"))+'</span>';
  c.querySelector("b").textContent = nm || t("mdMineNone"); c.querySelector("b").title=nm; c.querySelector("small").textContent = facts.join(" · ") || (!poss ? t("mdHubNo") : on ? t("mdConnected") : ""); }
$("mkCard").addEventListener("click",e=>{ const b=e.target.closest("[data-a]"); if(!b) return; const a=b.dataset.a; if(a==="test"){ openMidi(); return; } mwOpen(a==="wiz"||a==="safari"?"hw":a); });
{ const _rs=renderSettings; renderSettings=function(){ _rs.apply(this,arguments); try{ mkRender(); }catch(e){} }; }
/* ==== fin MIDI lots 2-3 ==== */

