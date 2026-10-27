// fragment de l'IIFE principale — ordre 780, voir src/app/README.md
/* ==== Catalogue de claviers MIDI (25/10/2026) ====
   Données : assets/js/midi-keyboards.js (window.MIDI_KEYBOARDS, chargé à la demande par mkcLoad()) : marque, modèle, touches, connexion USB / Bluetooth MIDI.
   Fenêtre « Choisis ton clavier » #mkcModal (mkcOpen(opt) : opt.mode "pick" | "guide", opt.port = nom du port détecté) : recherche, menu des marques (avec le
   nombre de modèles), touches 25…88, Bluetooth, liste par marque puis modèle (vignettes SVG mkcArt), « Je ne trouve pas mon clavier » (saisie libre).
   Le modèle choisi remplit S.midi.hw (model, brand, keys, lo/hi, bt, src "list" | "auto" | "free"), propre à l'appareil comme le reste de S.midi.
   Détection : mkcMatch(nom du port) → {it} (un seul modèle) ou {cands} ; enrobage de mdPorts → mkcAuto(). Branché sur l'assistant (M4, M10, « none » = guide
   d'achat M14) et sur Réglages › Mon clavier. */
Object.assign(TXT.fr,{mkcT:"Choisis ton clavier", mkcGuideT:"Quel clavier choisir ?", mkcQ:"Marque, modèle, nombre de touches…", mkcAll:n=>"Toutes les marques ("+n+")",
  mkcAllK:"Toutes", mkcKeys:n=>n+" touches", mkcBt:"Bluetooth", mkcUsb:"USB", mkcUnk:"Connexion à vérifier", mkcN:n=>n+(n>1?" modèles":" modèle"),
  mkcMore:n=>"Encore "+n+" modèles : continue à faire défiler", mkcNone:"Aucun modèle ne correspond. Essaie un autre mot, ou ajoute le tien ci-dessous.",
  mkcOther:"Je ne trouve pas mon clavier", mkcOtherHide:"Revenir à la liste", mkcOName:"Nom de ton clavier", mkcOKeys:"Nombre de touches", mkcOKnow:"Je ne sais pas", mkcOSave:"Enregistrer",
  mkcNote:"Noms des fabricants cités pour t'aider à t'y retrouver, sans partenariat. Dessins simplifiés.",
  mkcSug:"Ton clavier est peut-être :", mkcLoadErr:"Impossible de charger la liste des claviers. Vérifie ta connexion.", mkcLoading:"Chargement de la liste…",
  mkcPicked:m=>"C'est noté : "+m, mkcPick:"Choisir mon modèle", mkcChange:"Changer", mkcYes:"Oui", mkcIsIt:"Est-ce bien ce modèle ?", mkcWhich:"Quel est ton modèle ?",
  mkcModel:m=>"Modèle : "+m, mkcRecog:m=>"Reconnu : "+m, mkcM4:"Tu connais ton modèle ? Choisis-le dans la liste", mkcSeeAll:"Voir les modèles",
  mkcBtTip:"Il a le Bluetooth MIDI : tu peux aussi le brancher sans fil.",
  mkcUse:[["small","Petit budget","Mini-touches, de 25 à 37 : ≈ 90 à 130 € pour un 25 touches (prix indicatifs relevés en octobre 2026, sans lien d'achat)."],["bt","Sans fil","Bluetooth MIDI : idéal sur iPad, sans câble."],
    ["two","Deux mains","49 touches ou plus pour jouer aux deux mains : ≈ 100 à 260 € pour un clavier de 49 touches."],["piano","Comme un piano","88 touches : ≈ 280 à 500 € pour un modèle à touches lestées."]]});
Object.assign(TXT.en,{mkcT:"Choose your keyboard", mkcGuideT:"Which keyboard should I get?", mkcQ:"Brand, model, number of keys…", mkcAll:n=>"All brands ("+n+")",
  mkcAllK:"All", mkcKeys:n=>n+" keys", mkcBt:"Bluetooth", mkcUsb:"USB", mkcUnk:"Connection not checked", mkcN:n=>n+(n>1?" models":" model"),
  mkcMore:n=>n+" more models: keep scrolling", mkcNone:"No model matches. Try another word, or add yours below.",
  mkcOther:"I can't find my keyboard", mkcOtherHide:"Back to the list", mkcOName:"Your keyboard's name", mkcOKeys:"Number of keys", mkcOKnow:"I don't know", mkcOSave:"Save",
  mkcNote:"Manufacturer names are shown to help you find yours, with no partnership. Simplified drawings.",
  mkcSug:"Your keyboard may be:", mkcLoadErr:"Couldn't load the keyboard list. Check your connection.", mkcLoading:"Loading the list…",
  mkcPicked:m=>"Saved: "+m, mkcPick:"Choose my model", mkcChange:"Change", mkcYes:"Yes", mkcIsIt:"Is this the right model?", mkcWhich:"Which model is it?",
  mkcModel:m=>"Model: "+m, mkcRecog:m=>"Recognised: "+m, mkcM4:"Know your model? Pick it from the list", mkcSeeAll:"See the models",
  mkcBtTip:"It has Bluetooth MIDI: you can also connect it wirelessly.",
  mkcUse:[["small","Small budget","Mini keys, 25 to 37: about €90 to €130 for a 25-key one (rough prices seen in October 2026, no shop links)."],["bt","Wireless","Bluetooth MIDI: ideal on an iPad, no cable."],
    ["two","Two hands","49 keys or more to play with both hands: about €100 to €260 for a 49-key keyboard."],["piano","Like a piano","88 keys: about €280 to €500 for a weighted-key model."]]});
const MKC={on:false, list:null, loading:null, err:false, q:"", brand:"", keys:0, bt:false, use:"", mode:"pick", shown:0, rows:[], sug:null, other:false, port:""};
const MKC_KEYS=[25,37,49,61,76,88];
const MKC_RANGE={24:[48,71],25:[48,72],32:[41,72],37:[48,84],44:[41,84],49:[36,84],61:[36,96],73:[28,100],76:[28,103],88:[21,108]};
function mkcLoad(){ if(MKC.list) return Promise.resolve(MKC.list);
  if(window.MIDI_KEYBOARDS && window.MIDI_KEYBOARDS.list){ mkcPrep(window.MIDI_KEYBOARDS.list); return Promise.resolve(MKC.list); }
  if(!MKC.loading) MKC.loading=new Promise((res,rej)=>{ const sc=document.createElement("script"); sc.src="assets/js/midi-keyboards.js"; sc.async=true;
    sc.onload=()=>{ if(window.MIDI_KEYBOARDS && window.MIDI_KEYBOARDS.list){ mkcPrep(window.MIDI_KEYBOARDS.list); res(MKC.list); } else { MKC.loading=null; rej(); } };
    sc.onerror=()=>{ MKC.loading=null; rej(); }; document.head.appendChild(sc); });
  return MKC.loading; }
const mkcNorm=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
// tokens for the port-name match: the model alone when it is distinctive (letters and digits, ≥ 3 characters), brand + model always, known aliases
function mkcPrep(list){ const L=list.filter(x=>x&&x.b&&x.m&&x.k>0).map((x,i)=>{ const mt=mkcNorm(x.m), bt=mkcNorm(x.b), tok=[];
    if(mt.length>=3 && /\d/.test(mt) && /[a-z]/.test(mt)) tok.push([mt,mt.length]); tok.push([bt+mt, mt.length+.5]);
    (x.a||[]).forEach(a=>{ const n=mkcNorm(a); if(n.length>=4) tok.push([n,n.length]); });
    return Object.assign({}, x, {i, c:Array.isArray(x.c)?x.c:[], tok, hay:bt+"|"+mt+"|"+mkcNorm(x.b+" "+x.m)+"|"+x.k+"touches"+x.k+"keys|"+(x.a||[]).map(mkcNorm).join("|")}); });
  const col=new Intl.Collator(undefined,{numeric:true,sensitivity:"base"}); L.sort((a,b)=>col.compare(a.b,b.b)||col.compare(a.m,b.m)); L.forEach((x,i)=>x.i=i); MKC.list=L; }
function mkcMatch(name){ const L=MKC.list; if(!L || !name) return null; const p=mkcNorm(name); if(!p) return null; let best=0, c=[];
  L.forEach(x=>{ let s=0; x.tok.forEach(([t,w])=>{ if(w>s && p.includes(t)) s=w; }); if(!s) return; if(s>best){ best=s; c=[x]; } else if(s===best) c.push(x); });
  if(!c.length) return null; if(c.length>1){ const m=String(name).match(/(^|\D)(24|25|32|37|49|61|73|76|88)(\D|$)/); if(m){ const k=+m[2], f=c.filter(x=>x.k===k); if(f.length) c=f; } }
  return c.length===1 ? {it:c[0], cands:c} : {it:null, cands:c}; }
// ---- vignettes : le clavier vu de dessus, dessiné à partir des données (touches, mini-touches, forme), la marque écrite en texte ----
const MKC_ART={};
function mkcArt(x){ const key=x.b+"|"+x.k+"|"+(x.mini?1:0)+"|"+x.g; if(MKC_ART[key]) return MKC_ART[key];
  const R=MKC_RANGE[x.k]||[48,48+x.k-1], WH=[0,2,4,5,7,9,11], lo=R[0], hi=lo+x.k-1, whites=[]; for(let m=lo;m<=hi;m++) if(WH.includes(m%12)) whites.push(m);
  const nw=whites.length, g=x.g||"c", W=Math.round((40+76*Math.min(1,nw/52))*(x.mini?.9:1)), X=(120-W)/2, piano=g==="p"||g==="a"||g==="l";
  const H = x.mini ? 34 : piano ? 30 : 32, Y=(60-H)/2, kh = x.mini ? H*.46 : H*.58, wheels = (g==="s"||g==="c"||g==="P") && x.k>=37 && W>70, kx=X+(wheels?9:3), kw=W-(wheels?12:6), ky=Y+H-kh-2.5;
  let o='<svg class="kbt" viewBox="0 0 120 60" aria-hidden="true"><rect class="bd'+(x.b==="Nord"?" nord":"")+'" x="'+X.toFixed(1)+'" y="'+Y+'" width="'+W+'" height="'+H+'" rx="3"/>';
  const top=Y+2.5, th=H-kh-6.5; // panel above the keys
  if(wheels) o+='<rect class="wh" x="'+(X+2.2).toFixed(1)+'" y="'+(ky+1).toFixed(1)+'" width="2.6" height="'+(kh-3).toFixed(1)+'" rx="1.2"/><rect class="wh" x="'+(X+5.6).toFixed(1)+'" y="'+(ky+1).toFixed(1)+'" width="2.6" height="'+(kh-3).toFixed(1)+'" rx="1.2"/>';
  if(th>3){ const cx=X+W/2;
    if(g==="p"){ o+='<path class="gr" d="M'+(X+4)+' '+(top+th/2).toFixed(1)+'h'+(W*.18).toFixed(1)+'M'+(X+W-4-W*.18).toFixed(1)+' '+(top+th/2).toFixed(1)+'h'+(W*.18).toFixed(1)+'"/><rect class="dk" x="'+(cx-5)+'" y="'+(top+th/2-1.4).toFixed(1)+'" width="10" height="2.8" rx=".8"/>'; }
    else if(g==="a"||g==="l"){ o+='<circle class="wh" cx="'+(X+6)+'" cy="'+(top+th/2).toFixed(1)+'" r="'+Math.min(3,th/2).toFixed(1)+'"/><circle class="wh" cx="'+(X+W-6)+'" cy="'+(top+th/2).toFixed(1)+'" r="'+Math.min(3,th/2).toFixed(1)+'"/><rect class="sc" x="'+(cx-7)+'" y="'+(top+.5).toFixed(1)+'" width="14" height="'+Math.max(2.5,th-1).toFixed(1)+'" rx=".8"/>';
      for(let i=0;i<4;i++) o+='<rect class="ac2" x="'+(cx-17+i*2.6).toFixed(1)+'" y="'+(top+th/2-.8).toFixed(1)+'" width="1.6" height="1.6" rx=".3"/><rect class="ac2" x="'+(cx+10+i*2.6).toFixed(1)+'" y="'+(top+th/2-.8).toFixed(1)+'" width="1.6" height="1.6" rx=".3"/>'; }
    else if(g==="s"){ o+='<rect class="sc" x="'+(cx-6)+'" y="'+(top+.5).toFixed(1)+'" width="12" height="'+Math.max(2.5,th-1).toFixed(1)+'" rx=".8"/>'; const n=Math.max(2,Math.min(8,Math.floor((W*.35)/4.2)));
      for(let i=0;i<n;i++){ o+='<circle class="ac2" cx="'+(X+5+i*4.2).toFixed(1)+'" cy="'+(top+th/2).toFixed(1)+'" r="1.3"/>'; o+='<circle class="ac2" cx="'+(X+W-5-i*4.2).toFixed(1)+'" cy="'+(top+th/2).toFixed(1)+'" r="1.3"/>'; } }
    else { const pads = g==="P" ? (W<70?4:8) : 0, pw=Math.min(5,(W*.45)/Math.max(1,pads)-1.2);
      for(let i=0;i<pads;i++) o+='<rect class="ac" x="'+(X+W-4-(pads-i)*(pw+1.2)).toFixed(1)+'" y="'+(top+th/2-pw/2).toFixed(1)+'" width="'+pw.toFixed(1)+'" height="'+pw.toFixed(1)+'" rx=".8"/>';
      const kn=Math.max(2,Math.min(8,Math.floor((W*(pads?.4:.5))/4.4))); for(let i=0;i<kn;i++) o+='<circle class="ac2" cx="'+(X+(wheels?11:6)+i*4.4).toFixed(1)+'" cy="'+(top+th/2).toFixed(1)+'" r="1.4"/>';
      if(!pads) o+='<rect class="dk" x="'+(X+W-14)+'" y="'+(top+th/2-1.5).toFixed(1)+'" width="10" height="3" rx=".8"/>'; } }
  const ww=kw/nw; o+='<rect class="k" x="'+kx.toFixed(1)+'" y="'+ky.toFixed(1)+'" width="'+kw.toFixed(1)+'" height="'+kh.toFixed(1)+'" rx=".8"/>';
  let ln=''; for(let i=1;i<nw;i++) ln+='M'+(kx+i*ww).toFixed(2)+' '+ky.toFixed(1)+'v'+kh.toFixed(1); o+='<path class="kl" d="'+ln+'"/>';
  const lit = g==="l" ? [0,4,7] : null;
  for(let m=lo;m<=hi;m++){ if(WH.includes(m%12)) continue; const i=whites.indexOf(m-1); if(i<0) continue; o+='<rect class="kb" x="'+(kx+(i+1)*ww-ww*.32).toFixed(2)+'" y="'+ky.toFixed(1)+'" width="'+(ww*.64).toFixed(2)+'" height="'+(kh*.6).toFixed(1)+'"/>'; }
  if(lit) whites.forEach((m,i)=>{ if(m%12===0||m%12===4||m%12===7) o+='<rect x="'+(kx+i*ww+ww*.18).toFixed(2)+'" y="'+(ky+kh*.7).toFixed(1)+'" width="'+(ww*.64).toFixed(2)+'" height="'+(kh*.22).toFixed(1)+'" rx=".4" fill="var(--note-'+(m%12)+')"/>'; });
  const bn=x.b.length>14?x.b.split(" ")[0]:x.b; if(W>=56) o+='<text class="tx" x="'+(X+3.2).toFixed(1)+'" y="'+(Y+5.6).toFixed(1)+'">'+esc(bn.toUpperCase())+'</text>';
  return MKC_ART[key]=o+'</svg>'; }
// ---- filtres ----
function mkcUseOk(x,u){ return u==="small" ? (x.mini && x.k<=37) : u==="bt" ? x.c.includes("bt") : u==="two" ? x.k>=49 : u==="piano" ? x.k===88 : true; }
function mkcFilter(){ const L=MKC.list||[], terms=String(MKC.q||"").split(/\s+/).map(mkcNorm).filter(Boolean);
  return L.filter(x=>(!MKC.brand||x.b===MKC.brand) && (!MKC.keys||x.k===MKC.keys) && (!MKC.bt||x.c.includes("bt")) && (MKC.mode!=="guide"||mkcUseOk(x,MKC.use)) && terms.every(tm=>x.hay.includes(tm))); }
function mkcSpecs(x){ const s=['<span>'+esc(t("mkcKeys")(x.k))+'</span>']; if(x.c.includes("usb")) s.push('<span>'+esc(t("mkcUsb"))+'</span>'); if(x.c.includes("bt")) s.push('<span class="bt">'+esc(t("mkcBt"))+'</span>');
  if(x.c.includes("din")) s.push('<span>MIDI DIN</span>'); if(!x.c.length) s.push('<span class="unk">'+esc(t("mkcUnk"))+'</span>'); return '<span class="mkc-sp">'+s.join("")+'</span>'; }
function mkcItem(x, tag){ const h=mwHw(), cur=h.model===x.m && h.brand===x.b, pick=MKC.mode!=="guide", el=pick?'button type="button"':'div';
  return (tag?'<'+tag+'>':'')+'<'+el+' class="mkc-it" data-i="'+x.i+'"'+(cur?' aria-current="true"':'')+'><span class="mkc-th">'+mkcArt(x)+'</span><span class="mkc-tx"><small>'+esc(x.b)+'</small><b>'+esc(x.m)+'</b>'+mkcSpecs(x)+'</span>'+(cur?'<span class="mkc-ck" aria-hidden="true">✓</span>':'')+'</'+(pick?'button':'div')+'>'+(tag?'</'+tag+'>':''); }
// ---- rendu ----
function mkcRender(){ if(!MKC.on) return; const guide=MKC.mode==="guide";
  $("mkcH").textContent=t(guide?"mkcGuideT":"mkcT"); $("mkcQ").placeholder=t("mkcQ"); $("mkcOther").textContent=t(MKC.other?"mkcOtherHide":"mkcOther"); $("mkcOther").hidden=guide; $("mkcNote").textContent=t("mkcNote");
  const L=MKC.list;
  if(!L){ $("mkcList").innerHTML='<li class="mkc-empty">'+esc(MKC.err?t("mkcLoadErr"):t("mkcLoading"))+'</li>'; $("mkcChips").innerHTML=""; $("mkcBrand").innerHTML=""; $("mkcCount").textContent=""; return; }
  const cnt={}; L.forEach(x=>{ if(!guide||mkcUseOk(x,MKC.use)) cnt[x.b]=(cnt[x.b]||0)+1; }); const brands=Object.keys(cnt).sort((a,b)=>a.localeCompare(b));
  if(MKC.brand && !cnt[MKC.brand]) MKC.brand="";
  const tot=brands.reduce((s,b)=>s+cnt[b],0); $("mkcBrand").innerHTML='<option value="">'+esc(t("mkcAll")(tot))+'</option>'+brands.map(b=>'<option value="'+esc(b)+'"'+(b===MKC.brand?' selected':'')+'>'+esc(b)+' ('+cnt[b]+')</option>').join("");
  const bti='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10-5 4V3l5 4L7 17"/></svg>';
  $("mkcChips").innerHTML = guide
    ? t("mkcUse").map(u=>'<button type="button" data-use="'+u[0]+'" aria-pressed="'+(MKC.use===u[0])+'">'+(u[0]==="bt"?bti:'')+esc(u[1])+'</button>').join("")
    : '<button type="button" data-k="0" aria-pressed="'+(!MKC.keys)+'">'+esc(t("mkcAllK"))+'</button>'+MKC_KEYS.map(k=>'<button type="button" data-k="'+k+'" aria-pressed="'+(MKC.keys===k)+'">'+k+'</button>').join("")+'<span class="mkc-sep" aria-hidden="true"></span><button type="button" data-bt="1" aria-pressed="'+MKC.bt+'">'+bti+esc(t("mkcBt"))+'</button>';
  const use=guide && t("mkcUse").find(u=>u[0]===MKC.use); $("mkcHint").hidden=!use; $("mkcHint").textContent=use?use[2]:"";
  const sg=$("mkcSug"), sug=!guide&&MKC.sug&&MKC.sug.length&&MKC.sug.length<=12&&!MKC.q ? MKC.sug : null; sg.hidden=!sug;
  sg.innerHTML = sug ? '<b>'+esc(t("mkcSug"))+'</b><div class="mkc-row">'+sug.map(x=>mkcItem(x)).join("")+'</div>' : "";
  $("mkcOtherF").hidden=!MKC.other; if(MKC.other){ $("mkcOnL").textContent=t("mkcOName"); $("mkcOkL").textContent=t("mkcOKeys"); $("mkcOs").textContent=t("mkcOSave");
    const ks=$("mkcOk"); if(!ks.options.length) ks.innerHTML='<option value="0"></option>'+[24,25,32,37,49,61,73,76,88].map(k=>'<option value="'+k+'">'+k+'</option>').join(""); ks.options[0].textContent=t("mkcOKnow"); }
  MKC.rows=mkcFilter(); $("mkcCount").textContent=t("mkcN")(MKC.rows.length); MKC.shown=0; $("mkcList").innerHTML=""; $("mkcList").scrollTop=0; mkcMore(); }
// the list is long (500 models): rows arrive 60 at a time while scrolling
function mkcMore(){ const ul=$("mkcList"), R=MKC.rows, from=MKC.shown, to=Math.min(R.length, from+60); const m=ul.querySelector(".mkc-more"); if(m) m.remove();
  if(!R.length){ ul.innerHTML='<li class="mkc-empty">'+esc(t("mkcNone"))+'</li>'; return; }
  let h=''; for(let i=from;i<to;i++){ const x=R[i]; if(i===0 || R[i-1].b!==x.b){ const n=R.filter(y=>y.b===x.b).length; h+='<li class="mkc-gh" role="presentation">'+esc(x.b)+' <i>'+esc(t("mkcN")(n))+'</i></li>'; } h+=mkcItem(x,"li"); }
  if(to<R.length) h+='<li class="mkc-more">'+esc(t("mkcMore")(R.length-to))+'</li>';
  ul.insertAdjacentHTML("beforeend",h); MKC.shown=to; }
$("mkcList").addEventListener("scroll",()=>{ const ul=$("mkcList"); if(MKC.shown<MKC.rows.length && ul.scrollTop+ul.clientHeight>ul.scrollHeight-240) mkcMore(); },{passive:true});
// ---- ouvrir / fermer / choisir ----
function mkcOpen(opt){ opt=opt||{}; Object.assign(MKC,{on:true, mode:opt.mode||"pick", q:"", brand:"", keys:0, bt:false, use:opt.use||"", other:false, sug:null, port:opt.port||""});
  $("mkcQ").value=""; openMod("mkcModal"); mkcRender();
  mkcLoad().then(()=>{ if(!MKC.on) return; const p=MKC.port || (MKC.mode==="pick" && !mwHw().model ? (mwHw().name||midiNames[0]||"") : "");
      if(p){ const r=mkcMatch(p); if(r){ MKC.sug=r.cands; if(r.cands.length>12){ const bs=[...new Set(r.cands.map(x=>x.b))]; if(bs.length===1) MKC.brand=bs[0]; } } }
      mkcRender(); }, ()=>{ MKC.err=true; mkcRender(); });
  if(!phoneMQ.matches) setTimeout(()=>{ if(MKC.on) try{ $("mkcQ").focus({preventScroll:true}); }catch(e){} },60); }
function mkcClose(){ if(!MKC.on) return; MKC.on=false; closeMod("mkcModal"); try{ if(MW.on) mwRender(); }catch(e){} try{ mkRender(); }catch(e){} }
function mkcApply(x, src){ const s=mdS(), h=mwHw(); if(!x) return;
  Object.assign(h,{model:x.m, brand:x.b||"", keys:x.k||h.keys, bt:!!(x.c&&x.c.includes("bt")), src:src||"list"}); if(!x.k){ delete h.keys; }
  const r=MKC_RANGE[x.k]; if(r && !(h.lo>0 && h.hi-h.lo+1===x.k)){ h.lo=r[0]; h.hi=r[1]; }
  const sz=S.settings.kbdSize||"auto"; if(x.k && KB_PRESETS[String(x.k)] && (sz==="auto" || /^\d+$/.test(sz)) && sz!==String(x.k)){ S.settings.kbdSize=String(x.k); S.settings.kbdCat=h.name||""; save(); buildKeyboard(); renderSettings(); }
  s.hw=h; save(); try{ mdHub(); }catch(e){} try{ mkRender(); }catch(e){} }
function mkcModelTxt(){ const h=(S.midi&&S.midi.hw)||{}; return h.model ? (h.brand?h.brand+" ":"")+h.model : ""; }
$("mkcModal").addEventListener("click",e=>{ if(e.target.id==="mkcBg"||e.target.closest("#mkcX")){ mkcClose(); return; }
  const it=e.target.closest("button.mkc-it"); if(it){ const x=MKC.list&&MKC.list[+it.dataset.i]; if(x){ mkcApply(x,"list"); mkcClose(); toast(t("mkcPicked")(x.b+" "+x.m)); } return; }
  const k=e.target.closest("[data-k]"); if(k){ MKC.keys=+k.dataset.k; mkcRender(); return; }
  if(e.target.closest("[data-bt]")){ MKC.bt=!MKC.bt; mkcRender(); return; }
  const u=e.target.closest("[data-use]"); if(u){ MKC.use = MKC.use===u.dataset.use ? "" : u.dataset.use; mkcRender(); return; }
  if(e.target.closest("#mkcOther")){ MKC.other=!MKC.other; mkcRender(); if(MKC.other) setTimeout(()=>{ try{ $("mkcOn").focus(); }catch(er){} },30); return; } });
$("mkcQ").addEventListener("input",()=>{ MKC.q=$("mkcQ").value; mkcRender(); });
$("mkcBrand").addEventListener("change",()=>{ MKC.brand=$("mkcBrand").value; mkcRender(); });
$("mkcOtherF").addEventListener("submit",e=>{ e.preventDefault(); const nm=$("mkcOn").value.trim().slice(0,60), k=+$("mkcOk").value||0; if(!nm){ $("mkcOn").focus(); return; }
  mkcApply({m:nm, b:"", k, c:[]},"free"); mkcClose(); toast(t("mkcPicked")(nm)); });
addEventListener("keydown",e=>{ if(MKC.on && e.key==="Escape"){ e.preventDefault(); e.stopImmediatePropagation(); mkcClose(); } },true);
// ---- détection automatique (M13) : le nom du port → le modèle, s'il n'y en a qu'un ----
function mkcAuto(nm){ const h=mwHw(); if(!nm || h.name!==nm || (h.model && h.src!=="auto") || h.autoFor===nm) return;
  const r=mkcMatch(nm); h.autoFor=nm; if(r && r.it){ mkcApply(r.it,"auto"); const ts=$("mdToast"); if(ts && ts.classList.contains("on") && !ts.querySelector(".mkc-tst")){ const tx=ts.querySelector(".mt-tx"); if(tx) tx.insertAdjacentHTML("beforeend",'<small class="mkc-tst">'+esc(t("mkcRecog")(r.it.b+" "+r.it.m+" · "+t("mkcKeys")(r.it.k)))+'</small>'); } }
  else save(); try{ if(MW.on) mwRender(); }catch(e){} }
{ const _mp=mdPorts; mdPorts=function(names){ const prev=Object.assign({},mwHw()); _mp.apply(this,arguments); try{
    // a model chosen before any keyboard was plugged in stays with the first keyboard that arrives
    const h=mwHw(); if(prev.model && !prev.name && h.name && !h.model){ ["model","brand","keys","lo","hi","bt","src"].forEach(k=>{ if(prev[k]!=null) h[k]=prev[k]; }); save(); } if(names&&names.length){ const nm=mwHw().name; if(nm && !midiVirtual(nm)) mkcLoad().then(()=>mkcAuto(nm),()=>{}); } }catch(e){} }; }
// ---- assistant : M4 (lien vers la liste), M10 (« Est-ce bien ce modèle ? »), « none » (guide d'achat) ----
{ const _mr=mwRender; mwRender=function(){ _mr.apply(this,arguments); try{ mkcWiz(); }catch(e){} }; }
function mkcWiz(){ if(!MW.on) return; const st=MW.step, body=$("mwBody"); if(!body) return; const h=mwHw();
  if(st==="hw"){ const sub=body.querySelector(".mw-sub"); if(sub && !sub.querySelector(".mkc-lk")) sub.insertAdjacentHTML("beforeend",' <button type="button" class="mkc-lk" data-mkc="pick">'+esc(t("mkcM4"))+' ›</button>'); }
  else if(st==="ready"){ const f=body.querySelector(".mw-fiche"); if(!f || f.querySelector(".mkc-is")) return; const m=mkcModelTxt();
    let x = h.model && h.src==="auto" ? '<span>'+esc(t("mkcIsIt"))+' <b>'+esc(m)+'</b></span><button type="button" class="btn" data-mkc="yes">'+esc(t("mkcYes"))+'</button><button type="button" class="btn ghost" data-mkc="pick">'+esc(t("mkcChange"))+'</button>'
      : h.model ? '<span>'+esc(t("mkcModel")(m))+'</span><button type="button" class="mkc-lk" data-mkc="pick">'+esc(t("mkcChange"))+'</button>'
      : '<span>'+esc(t("mkcWhich"))+'</span><button type="button" class="btn" data-mkc="pick">'+esc(t("mkcPick"))+'</button>';
    if(h.model && h.bt && MW.conn!=="bt" && h.conn!=="bt") x+='<small class="mkc-bt" style="flex-basis:100%;color:var(--muted)">'+esc(t("mkcBtTip"))+'</small>';
    f.insertAdjacentHTML("beforeend",'<div class="mkc-is">'+x+'</div>'); }
  else if(st==="none"){ const ft=$("mwFoot"); if(ft && !ft.querySelector("[data-mkc]")) ft.insertAdjacentHTML("afterbegin",'<button type="button" class="btn" data-mkc="guide"><span>'+esc(t("mkcSeeAll"))+'</span></button>'); } }
$("mwiz").addEventListener("click",e=>{ const b=e.target.closest("[data-mkc]"); if(!b) return; const a=b.dataset.mkc;
  if(a==="pick") mkcOpen({mode:"pick"}); else if(a==="guide") mkcOpen({mode:"guide"}); else if(a==="yes"){ mwHw().src="list"; save(); mwRender(); } });
// M9 : a model from the list gives its size (« We think your keyboard has 49 keys. Right? ») unless it was measured; a size that came from another
// keyboard's model is not a guess for this one (measure)
{ const _rs=mwRangeStart; mwRangeStart=function(){ _rs.apply(this,arguments); try{ const R=MW.r, h=mwHw(); if(!R) return;
    if(h.model && h.keys && KB_PRESETS[String(h.keys)] && !h.measured){ if(S.settings.kbdSize!==String(h.keys)){ S.settings.kbdSize=String(h.keys); save(); buildKeyboard(); } R.mode="guess"; }
    else if(!h.model && S.settings.kbdCat && S.settings.kbdCat!==h.name && R.mode==="guess") R.mode="measure"; }catch(e){} }; }
{ const _ra=mwRangeApply; mwRangeApply=function(){ const R=MW.r, ok=R && R.lo!=null && R.hi-R.lo>=11; _ra.apply(this,arguments); if(ok){ try{ mwHw().measured=true; save(); }catch(e){} } }; }
// while the list is open above the assistant, the keyboard's notes do not move the assistant along
{ const _mm=mwMsg; mwMsg=function(){ if(MKC.on) return true; return _mm.apply(this,arguments); }; }
// ---- Réglages › Mon clavier : « Choisir mon modèle » + le modèle dans la fiche ----
{ const _mk=mkRender; mkRender=function(){ _mk.apply(this,arguments); try{ const c=$("mkCard"); if(!c||!midiPossible()) return; const acts=c.querySelector(".mk-acts"), sm=c.querySelector(".mk-t small"), m=mkcModelTxt();
    if(acts && !acts.querySelector("[data-mkc]")) acts.insertAdjacentHTML("afterbegin",'<button type="button" class="btn" data-mkc="pick" id="mkcSetBtn"><span>'+esc(t("mkcPick"))+'</span></button>');
    if(m && sm){ const keep=sm.textContent; sm.textContent=t("mkcModel")(m)+(keep?" · "+keep:""); } }catch(e){} }; }
$("mkCard").addEventListener("click",e=>{ const b=e.target.closest("[data-mkc]"); if(b){ e.stopPropagation(); mkcOpen({mode:"pick"}); } });
/* ==== fin Catalogue de claviers MIDI ==== */

