// fragment de l'IIFE principale — ordre 710, voir src/app/README.md
/* ==== Catalogue libre (≈ 200 morceaux : catalogue de base + bibliothèque libre de droits) ==== */
// assets/js/songs-free.js (généré par tools/catalog/import_free.py) ajoute ~170 morceaux au catalogue de songs-data.js, avec leur source et leur
// licence (src) : OpenScore Lieder (CC0) et Mutopia (domaine public / CC BY). Chargé à la demande avec le catalogue (pcLoad), jamais au démarrage.
// PLAY : pastille « Bibliothèque » #pcLib dans #pcBar → vue PC.view="lib" (4 rangées : Grands compositeurs, Lieder et mélodies, Études faciles,
// Danses et airs ; le filtre de niveau s'applique) ; la vue « Tous » garde ses 5 rangées. Crédits : Réglages › Application › « Crédits musicaux »
// (#credBtn → #credModal, credOpen()), aussi par le lien « Crédits » de la bibliothèque. Lecteur : « Source : … · Licence … » dans la fenêtre d'accueil.
Object.assign(TXT.fr,{pcLib:"Bibliothèque", pcLibT:n=>"Bibliothèque libre de droits : "+n+" morceaux", pcCMasters:"Grands compositeurs", pcCLieder:"Lieder et mélodies", pcCEtudes:"Études faciles", pcCDances:"Danses et airs",
  pcLibWait:"Chargement de la bibliothèque…", pcCredL:"Crédits", credBtnT:"Crédits musicaux",
  credSub:n=>"Tous les morceaux sont des œuvres du domaine public. Le catalogue de base est fait d'arrangements maison. Les "+n+" morceaux de la Bibliothèque sont adaptés (mélodie, main gauche simplifiée, transposition, extrait du début jusqu'à une cadence) d'éditions numériques libres : OpenScore Lieder (CC0) et Mutopia Project (domaine public ou Creative Commons Attribution). Merci à leurs bénévoles.",
  credBase:"Catalogue de base", credBaseS:"Arrangements maison d'airs traditionnels et d'œuvres du domaine public", credLib:"Bibliothèque libre de droits",
  credTyped:"saisie", credLic:"Licence", credExtract:"extrait", credLoad:"Chargement…", credFail:"Impossible de charger la liste. Vérifie ta connexion."});
Object.assign(TXT.en,{pcLib:"Library", pcLibT:n=>"Public-domain library: "+n+" pieces", pcCMasters:"Great composers", pcCLieder:"Songs and lieder", pcCEtudes:"Easy studies", pcCDances:"Dances and tunes",
  pcLibWait:"Loading the library…", pcCredL:"Credits", credBtnT:"Music credits",
  credSub:n=>"Every piece is in the public domain. The base catalogue is made of our own arrangements. The "+n+" pieces of the Library are adapted (melody, simplified left hand, transposition, excerpt from the start to a cadence) from free digital editions: OpenScore Lieder (CC0) and the Mutopia Project (public domain or Creative Commons Attribution). Thanks to their volunteers.",
  credBase:"Base catalogue", credBaseS:"Our own arrangements of traditional tunes and public-domain works", credLib:"Public-domain library",
  credTyped:"typeset by", credLic:"Licence", credExtract:"excerpt", credLoad:"Loading…", credFail:"Could not load the list. Check your connection."});
TXT.fr.pcFrom.se="Trad. suédois"; TXT.en.pcFrom.se="Swedish trad.";
const PC_LIB=[["masters","pcCMasters"],["lieder","pcCLieder"],["etudes","pcCEtudes"],["dances","pcCDances"]];
const LIB={loading:null};
// the catalogue = songs-data.js then songs-free.js (premSong: the first PREM_OFFER.freeSongs of this order, i.e. still the 10 first songs)
const _libLoad=pcLoad;
pcLoad=function(){ if(window.PC_FREE && window.PC_SONG) return Promise.resolve();
  if(!LIB.loading) LIB.loading=_libLoad().then(()=>window.PC_FREE?null:new Promise((res,rej)=>{ const sc=document.createElement("script"); sc.src="assets/js/songs-free.js"; sc.async=true;
    sc.onload=()=>res(); sc.onerror=()=>{ LIB.loading=null; rej(); }; document.head.appendChild(sc); }));
  return LIB.loading; };
const libSongs = () => (window.PC_FREE||[]);
const LIB_ICO='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 5.5h4v13h-4zM10 5.5h4v13h-4z"/><path d="M15.6 6.2l3.6-1 3 12.6-3.6 1z"/></svg>';
function libChip(){ const bar=$("pcBar"); if(!bar) return; const on=PC.view==="lib" && !PC.kb, n=libSongs().length;
  const b=document.createElement("button"); b.type="button"; b.className="pc-chip pc-lib"; b.id="pcLib"; b.setAttribute("aria-pressed",on);
  b.innerHTML=LIB_ICO+'<span></span>'+(n?'<em class="pc-n"></em>':''); b.querySelector("span").textContent=t("pcLib"); if(n) b.querySelector("em").textContent=n;
  b.setAttribute("aria-label",n?t("pcLibT")(n):t("pcLib"));
  b.onclick=()=>{ PC.kb=false; PC.view = PC.view==="lib" ? "cat" : "lib"; renderPlaySongs(); };
  const mine=$("pcMine"), fr=$("pcFree"); bar.insertBefore(b, mine||fr||null);
  // the level filter stays in the library view
  bar.querySelectorAll(".pc-chip[data-lv]").forEach(c=>{ c.onclick=()=>{ PC.lv=+c.dataset.lv; PC.kb=false; if(PC.view!=="lib") PC.view="cat"; renderPlaySongs(); }; }); }
const _libBar=pcBar; pcBar=function(){ _libBar(); libChip(); };
const _libRPS=renderPlaySongs;
renderPlaySongs=function(){ if(PC.view!=="lib" || PC.kb) return _libRPS();
  const box=$("playSongs"); if(!box) return;
  document.body.classList.remove("pc-kb"); const ip=$("impPanel"); if(ip) ip.hidden=true; $("grPanel").hidden=true; box.hidden=false;
  if(!window.PC_FREE || !window.PC_SONG){ pcBar(); box.innerHTML='<p class="pc-lib-wait"></p>'; box.firstChild.textContent=t("pcLibWait");
    pcLoad().then(()=>{ if(page==="free" && PC.view==="lib") renderPlaySongs(); }).catch(()=>{ PC.view="cat"; if(page==="free") renderPlaySongs(); }); return; }
  pcBar(); const P=window.PC_SONG, best=pcBest(); box.innerHTML="";
  PC_LIB.forEach(([c,k],i)=>{ const songs=P.list.filter(d=>d.c===c && (!PC.lv || P.arrs(d).some(a=>a.lv===PC.lv)));
    const r=pcRow(t(k),t("pcCount")(songs.length)); r.el.dataset.coll=c; songs.forEach(d=>r.strip.appendChild(pcTile(d,best)));
    if(!songs.length){ const e=document.createElement("p"); e.className="pc-empty"; e.textContent=t("pcEmpty"); r.strip.appendChild(e); }
    if(!i){ const cb=document.createElement("button"); cb.type="button"; cb.className="pc-cred"; cb.id="pcCred"; cb.textContent=t("pcCredL"); cb.onclick=credOpen; r.el.querySelector("h3").appendChild(cb); }
    box.appendChild(r.el); }); };
// ---- music credits (Settings › App): the base catalogue in one line, then every piece of the library with its source and licence
function credRender(){ const list=$("credList"), fr=S.settings.lang==="fr", L=libSongs(); list.innerHTML="";
  $("credSub").textContent=t("credSub")(L.length);
  const h=(txt,sub)=>{ const e=document.createElement("h3"); e.textContent=txt; list.appendChild(e); if(sub){ const p=document.createElement("p"); p.className="cred-item"; p.textContent=sub; list.appendChild(p); } };
  h(t("credBase"), t("credBaseS")+" ("+((window.PC_SONG?window.PC_SONG.list.length:0)-L.length)+")");
  h(t("credLib")+" ("+L.length+")");
  const sn=x=>String(x.src.by).split(" ").filter(w=>!/^(II|van|von|de)$/.test(w)).pop()||"";
  [...L].sort((a,b)=>sn(a).localeCompare(sn(b),"fr")||a.t[0].localeCompare(b.t[0],"fr")).forEach(d=>{ const s=d.src, it=document.createElement("div"); it.className="cred-item";
    const b=document.createElement("b"); b.textContent=d.t[fr?0:1]; it.appendChild(b);
    if(d.x){ const x=document.createElement("span"); x.className="cred-x"; x.textContent=t("credExtract"); it.appendChild(x); }
    const s1=document.createElement("small"); s1.textContent=s.by+(s.dt?" ("+s.dt+")":"")+" · "+s.t; it.appendChild(s1);
    const s2=document.createElement("small"); s2.textContent=s.ed+(s.no?" n° "+s.no:"")+(s.who?" · "+t("credTyped")+" : "+s.who:"")+" · "+t("credLic")+" "+s.lic+" · "; 
    const a=document.createElement("a"); a.href=s.url; a.target="_blank"; a.rel="noopener"; a.textContent=s.url.replace(/^https?:\/\//,""); s2.appendChild(a); it.appendChild(s2);
    list.appendChild(it); }); }
function credOpen(){ const list=$("credList"); openMod("credModal");
  if(window.PC_FREE && window.PC_SONG){ credRender(); list.scrollTop=0; return; }
  list.textContent=t("credLoad"); $("credSub").textContent="";
  pcLoad().then(()=>{ if(!$("credModal").hidden) credRender(); }).catch(()=>{ list.textContent=t("credFail"); }); }
$("credBtn").addEventListener("click", credOpen);
/* ==== fin Catalogue libre ==== */

