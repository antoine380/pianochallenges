// fragment de l'IIFE principale — ordre 885, voir src/app/README.md
/* ==== MIDI 4 (28/10/2026) : fenêtre clavier, modes d'entrée exclusifs, touches exactes, signalement, alerte admin ==== */
Object.assign(TXT.fr, {
  md4Report:"Signaler un problème avec mon clavier",
  md4Recog:(m,k,c)=>"Reconnu : "+m+(k?" · "+k+" touches":"")+(c?" · "+c:""),
  md4Keys:k=>k+" touches",
  md4NotUsed:m=>"Entrée choisie : "+m+". Ce clavier n'est pas écouté.",
  md4Use:"Utiliser ce clavier",
  md4Conn:{usb:"USB", bt:"Bluetooth", din:"MIDI DIN"},
  md4Ask:"(Décris ton problème ici : ce qui se passe, sur quelle page…)",
  md4Diag:"— Diagnostic du clavier MIDI (rempli par l'app) —",
  md4L:{dev:"Appareil", ports:"Ports vus", pick:"Port choisi", all:"tous", model:"Modèle reconnu", range:"Plage", seen:"Notes jouées", screen:"Clavier à l'écran", input:"Mode d'entrée", ver:"Version web", none:"aucun", noneF:"aucune", meas:"mesurée", guess:"d'après le modèle", virt:"virtuel, ignoré", off:"débranché"},
  md4In:{midi:"clavier MIDI", screen:"écran", mic:"micro", "":"pas encore choisi"},
  md4FbT:n=>"Nouveau signalement"+(n?" de "+n:""),
  md4FbN:n=>n+" nouveaux signalements",
  md4FbGo:"Ouvrir le back office"
});
Object.assign(TXT.en, {
  md4Report:"Report a problem with my keyboard",
  md4Recog:(m,k,c)=>"Recognised: "+m+(k?" · "+k+" keys":"")+(c?" · "+c:""),
  md4Keys:k=>k+" keys",
  md4NotUsed:m=>"Chosen input: "+m+". This keyboard is not listened to.",
  md4Use:"Use this keyboard",
  md4Conn:{usb:"USB", bt:"Bluetooth", din:"MIDI DIN"},
  md4Ask:"(Describe your problem here: what happens, on which page…)",
  md4Diag:"— MIDI keyboard diagnostics (filled in by the app) —",
  md4L:{dev:"Device", ports:"Ports seen", pick:"Chosen port", all:"all", model:"Recognised model", range:"Range", seen:"Notes played", screen:"On-screen keyboard", input:"Input mode", ver:"Web version", none:"none", noneF:"none", meas:"measured", guess:"from the model", virt:"virtual, ignored", off:"unplugged"},
  md4In:{midi:"MIDI keyboard", screen:"screen", mic:"microphone", "":"not chosen yet"},
  md4FbT:n=>"New report"+(n?" from "+n:""),
  md4FbN:n=>n+" new reports",
  md4FbGo:"Open the back office"
});

// ---- modes d'entrée exclusifs ----
// MIDI joue seulement en entrée « MIDI » (ou tant qu'aucune entrée n'a été choisie : anciens états, comme avant). Restent à l'écoute quel que
// soit le mode : l'assistant « Brancher mon clavier » et le test de la fenêtre Clavier MIDI (ils testent le clavier), le quiz (un clavier
// par joueur) et le premier lancement (il choisit lui-même l'entrée). Le micro est déjà coupé hors entrée « micro » (setInput).
const md4MidiOn = () => !S.settings.input || S.settings.input==="midi";
function md4Live(){ if(md4MidiOn()) return true; return !!((MW && MW.on) || midiOpen || page==="quiz" || (FN && FN.on)); }
// le clavier à l'écran et les lettres du clavier d'ordinateur jouent sauf en entrée « micro » (là, l'écran montre seulement ce que le micro entend)
const md4Screen = () => S.settings.input!=="mic" || page==="quiz" || !!(FN && FN.on);

// ---- le nombre de touches du clavier reconnu ----
// modèle du catalogue, mesure de l'assistant (S.midi.hw.keys, même port), sinon le nom du port (kbdSzOf) ; 0 = inconnu
function md4Keys(name){ const h=(S.midi&&S.midi.hw)||{}, nm=String(name||MS.name||S.settings.midiInput||midiNames[0]||"");
  if(+h.keys>0 && (!h.name || !nm || h.name===nm)) return Math.min(88,+h.keys);
  const g=kbdSzOf(nm); return g ? +g : 0; }
// la plage par défaut d'une taille (catalogue, puis tailles de l'écran)
const md4Range = n => (MKC_RANGE && MKC_RANGE[n]) || KB_PRESETS[String(n)] || null;
// la bande des mini-claviers (test de la fenêtre MIDI, assistant) : exactement n touches, décalée par octaves pour montrer la note jouée
function md4Band(m, lo0, port){ let n=md4Keys(port);
  if(!n){ const sz=S.settings.kbdSize||"auto"; n = KB_PRESETS[sz] ? KB_PRESETS[sz][1]-KB_PRESETS[sz][0]+1 : 25; } // inconnu : 25 (MIDI 3)
  n=Math.max(12,Math.min(88,n)); const h=(S.midi&&S.midi.hw)||{}, R=md4Range(n);
  let base = (h.lo>=21 && +h.hi-h.lo+1===n && (!h.name || !port || h.name===port)) ? +h.lo : R ? R[0] : 48;
  if(n===88) base=21;
  let lo = lo0!=null ? lo0 : base;
  if(m!=null && (m<lo || m>lo+n-1)){ const k = m<base ? -Math.ceil((base-m)/12) : Math.max(0, Math.ceil((m-(base+n-1))/12)); lo=base+12*k; }
  lo=Math.max(21, Math.min(109-n, lo)); return {lo, n}; }
function md4BandHTML(lo, hi, on, nc){ const WH=[0,2,4,5,7,9,11], wh=[]; for(let m=lo;m<=hi;m++) if(WH.includes(m%12)) wh.push(m);
  const ww=100/wh.length, lab=wh.length<=22, st=m=>m===on&&nc?' style="--nc:'+nc+'"':'';
  let h=wh.map(m=>'<span class="w'+(m===on?' on':'')+'" data-m="'+m+'"'+st(m)+'>'+(m%12===0 && (lab||m===60)?'<small>'+esc(octName(m))+'</small>':'')+'</span>').join("");
  for(let m=lo;m<=hi;m++) if(!WH.includes(m%12)){ const i=wh.indexOf(m-1); if(i<0) continue;
    h+='<span class="b'+(m===on?' on':'')+'" data-m="'+m+'" style="left:calc('+((i+1)*ww)+'% - '+(ww*.3)+'%);width:'+(ww*.6)+'%'+(m===on&&nc?';--nc:'+nc:'')+'"></span>'; }
  return h; }
// le clavier à l'écran prend la taille du clavier reconnu (avant : une taille « détectée » ou élargie pour un autre clavier restait, un LUMI
// 24 touches pouvait garder un Do du haut en trop) ; la position (octave) affichée est gardée
function kbdFit(name){ const sz=S.settings.kbdSize||"auto"; if(sz==="auto") return false; const K=md4Keys(name); if(!K) return false;
  const w = sz==="custom" ? (+S.settings.kbdHigh)-(+S.settings.kbdLow)+1 : KB_PRESETS[sz] ? KB_PRESETS[sz][1]-KB_PRESETS[sz][0]+1 : 0;
  if(!w || w===K) return false;
  if(sz!=="custom" && KB_PRESETS[String(K)]) S.settings.kbdSize=String(K);
  else { const R=md4Range(K); let lo = sz==="custom" ? +S.settings.kbdLow : R ? R[0] : 48, hi=lo+K-1;
    while(hi>108){ lo-=12; hi-=12; } while(lo<21){ lo+=12; hi+=12; } if(K===88){ lo=21; hi=108; }
    Object.assign(S.settings,{kbdSize:"custom",kbdLow:lo,kbdHigh:hi}); }
  save(); buildKeyboard(); renderSettings(); if(cur && typeof markPlayed==="function") markPlayed(); return true; }
{ const _mp=mdPorts; mdPorts=function(names){ const r=_mp.apply(this,arguments); try{ if(names&&names.length) kbdFit(); }catch(e){} return r; }; }
{ const _ma=mkcApply; mkcApply=function(){ const r=_ma.apply(this,arguments); try{ kbdFit(); }catch(e){} return r; }; }
{ const _rg=mwRangeApply; mwRangeApply=function(){ const r=_rg.apply(this,arguments); try{ kbdFit(); }catch(e){} return r; }; }

// ---- fenêtre Clavier MIDI : une seule ligne par clavier (« Reconnu : … »), pas de ligne d'état en double ----
function md4Line(n){ const h=(S.midi&&S.midi.hw)||{}, mine=h.name===n, k=mine&&+h.keys>0 ? +h.keys : +kbdSzOf(n)||0, c=mine&&h.conn ? (t("md4Conn")[h.conn]||"") : "";
  if(mine && h.model) return t("md4Recog")(mkcModelTxt(), k, c);
  return n+(k?" · "+t("md4Keys")(k):"")+(c?" · "+c:""); }
function md4Modal(){ const box=$("midiModal"); if(!box) return; const st=box.querySelector(".midi-status"), used=midiReady && md4MidiOn();
  // branché et écouté : la liste dit tout ; sinon la ligne d'état reste (activer le MIDI, refusé, aucun appareil, entrée écran / micro)
  st.style.display = used ? "none" : "";
  if(midiReady && !md4MidiOn()) st.classList.remove("on"); // branché mais pas écouté : point gris
  let u=$("md4Use");
  if(midiReady && !md4MidiOn()){ $("mStTxt").textContent=t("md4NotUsed")(t("md4In")[S.settings.input]||S.settings.input);
    if(!u){ u=document.createElement("button"); u.id="md4Use"; u.type="button"; u.className="btn primary";
      u.addEventListener("click",async ()=>{ await setInput("midi"); if(midiOpen) renderMidiModal(); }); st.appendChild(u); }
    u.textContent=t("md4Use"); u.hidden=false; }
  else if(u) u.hidden=true;
  if(midiNames.length){ const dl=$("mDevList"); dl.innerHTML=""; midiNames.forEach(n=>{ const li=document.createElement("li"); li.textContent=md4Line(n); li.title=n; dl.appendChild(li); }); } }
{ const _rm=renderMidiModal; renderMidiModal=function(){ const r=_rm.apply(this,arguments); try{ md4Modal(); }catch(e){} return r; }; }

// ---- « Signaler un problème avec mon clavier » : la fenêtre de signalement, pré-remplie d'un diagnostic ----
function md4Diag(){ const L=t("md4L"), h=(S.midi&&S.midi.hw)||{}, x=trkCtx(), d=mwDev(), rows=[], ports=[];
  try{ if(midiAcc) midiAcc.inputs.forEach(p=>ports.push(p.name+(midiVirtual(p.name)?" ("+L.virt+")":p.state&&p.state!=="connected"?" ("+L.off+")":""))); }catch(e){}
  const sz=S.settings.kbdSize||"auto";
  rows.push([L.dev, mwDevLbl(d)+(d.nat?"":" · "+String(navigator.userAgent||"").slice(0,90))]);
  rows.push([L.ports, ports.join(", ")||L.none]);
  rows.push([L.pick, S.settings.midiInput||L.all]);
  rows.push([L.model, h.model ? mkcModelTxt()+(h.keys?" · "+t("md4Keys")(h.keys):"")+(h.src?" ("+h.src+")":"") : L.none]);
  rows.push([L.range, h.lo>0&&h.hi>h.lo ? octName(+h.lo)+"–"+octName(+h.hi)+" ("+h.lo+"–"+h.hi+", "+t("md4Keys")(+h.hi-h.lo+1)+", "+(h.measured?L.meas:L.guess)+")" : L.none]);
  rows.push([L.seen, MS.lo!=null ? MS.lo+"–"+MS.hi+" ("+MS.name+")" : L.noneF]);
  rows.push([L.screen, sz+" · "+LOW+"–"+HIGH+" ("+t("md4Keys")(HIGH-LOW+1)+")"]);
  rows.push([L.input, t("md4In")[S.settings.input||""]||S.settings.input]);
  rows.push([L.ver, x.v+" · "+x.s+" · "+x.l]);
  return t("md4Diag")+"\n"+rows.map(r=>r[0]+" : "+r[1]).join("\n"); }
function md4Report(){ if(midiOpen) closeMidi(); fbOpen(); fbKind("bug");
  const tx=$("fbMsg"); tx.value="\n\n"+md4Diag().slice(0,1500); tx.placeholder=t("md4Ask");
  setTimeout(()=>{ try{ tx.focus({preventScroll:true}); tx.setSelectionRange(0,0); tx.scrollTop=0; }catch(e){} },60); }
$("mdReport").addEventListener("click", md4Report);

// ---- administrateur connecté dans l'app : nouveau signalement = notification + petite fenêtre ----
// am_i_admin() et admin_feedback_peek() (supabase/migrations/2026-10-28_admin_feedback.sql) : absentes = rien, sans erreur.
const ADM={is:null, uid:"", busy:false, off:false};
const admUrl = () => (document.documentElement.classList.contains("native") || !/^https?:/.test(location.protocol) ? "https://pianochallenges.com" : location.origin)+"/admin/";
function admOpen(){ try{ window.open(admUrl(), "_blank", "noopener"); }catch(e){} }
const ADM_BELL='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0"/></svg>';
function admPop(r, n){ if(!r) return; if(mdQuiet() || (typeof actNow==="function" && actNow())) return; // pas pendant une partie : la cloche suffit
  mdToast("found", n>1 ? t("md4FbN")(n) : t("md4FbT")(r.name||""), String(r.msg||"").slice(0,80), t("md4FbGo"), 9000, admOpen);
  const el=$("mdToast"); if(el){ el.classList.add("adm-fb"); const ic=el.querySelector(".mt-ic"); if(ic) ic.innerHTML=ADM_BELL; } }
async function admTick(){ if(ADM.off || ADM.busy || !sb || !user || document.hidden) return;
  if(ADM.uid!==user.id){ ADM.uid=user.id; ADM.is=null; }
  if(ADM.is===false) return; ADM.busy=true;
  try{ if(ADM.is===null){ const {data,error}=await sb.rpc("am_i_admin"); if(error){ ADM.is=false; if(/function|404|PGRST202/i.test(error.message+" "+(error.code||""))) ADM.off=true; return; } ADM.is=data===true; if(!ADM.is) return; }
    const K="pc-adm-fb-"+String(user.id).slice(0,8); let last=null; try{ const v=localStorage.getItem(K); last=v==null?null:+v; }catch(e){}
    const {data,error}=await sb.rpc("admin_feedback_peek",{p_after:last||0}); if(error || !data || typeof data!=="object") return;
    const put=v=>{ try{ localStorage.setItem(K,String(v)); }catch(e){} };
    if(last==null){ put(+data.max||0); return; } // premier passage : point de départ, aucune alerte pour les anciens messages
    const rows=(Array.isArray(data.rows)?data.rows:[]).filter(r=>r && +r.id>last).sort((a,b)=>b.id-a.id); if(!rows.length) return;
    put(+rows[0].id);
    rows.slice().reverse().forEach(r=>ntfAdd({key:"fb-"+r.id, cat:"news", type:"admfb", ti:t("md4FbT")(String(r.name||"").slice(0,40)), tx:String(r.msg||"").slice(0,120), t:Date.parse(r.at)||Date.now(), act:{k:"admin",l:"md4FbGo"}}));
    admPop(rows[0], rows.length);
  }catch(e){} finally{ ADM.busy=false; } }
setInterval(admTick, 60000);
{ const _su=setUser; setUser=async function(u){ const r=await _su.apply(this,arguments); try{ if(!u){ ADM.is=null; ADM.uid=""; } else if(ADM.uid!==u.id) setTimeout(admTick,3000); }catch(e){} return r; }; }
{ const _nd=ntfDo; ntfDo=function(a){ if(a && a.k==="admin"){ admOpen(); return; } return _nd.apply(this,arguments); }; }
/* ==== fin MIDI 4 ==== */
