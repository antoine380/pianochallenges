// fragment de l'IIFE principale — ordre 540, voir src/app/README.md
/* ==== Morceaux (C6 catalogue, L11 grilles) ==== */
// PLAY page = a catalogue of public-domain songs (assets/js/songs-data.js, shared with the Play player), in rows by collection
// that scroll sideways, a level filter (Easy / Medium / Advanced, coloured dots), a row of chord grids (L11) and the free piano
// behind a chip. A grid opens a sheet without scrolling: degrees, chords in the chosen key (12 pills), structure, "why it works",
// public-domain songs of the catalogue on it, and "Play it" = the LEARN › Progressions start screen set to that grid and key.
const PC={lv:0, view:"cat", gr:"g145", keys:{}, kb:false, loading:null};
const PC_COLL=[["first","pcCFirst"],["classic","pcCClassic"],["xmas","pcCXmas"],["world","pcCWorld"]];
const PC_LVCOL=["","#3ddc84","#ffd23f","#ff5a6e"];
const GRILLES=[
  {id:"g145",   pid:"p145",    obj:"chords",   col:"#6a3fd1", core:[0,3,4],         st:[0,0,3,0,4,4,0,0],             songs:["maman","oldmac","saints","jingle","douce","amazing","yankee","deck"]},
  {id:"pop",    pid:"pop",     obj:"guitar",   col:"#0e7490", core:[0,4,5,3],       st:[0,4,5,3,0,4,5,3],             songs:[]},
  {id:"pop2",   pid:"pop2",    obj:"moon",     col:"#b02a6b", core:[5,3,0,4],       st:[5,3,0,4,5,3,0,4],             songs:[]},
  {id:"ii5i",   pid:"ii5i",    obj:"palette",  col:"#1f7a52", core:[1,4,0],         st:[1,4,0,0,1,4,0,0],             songs:[]},
  {id:"blues",  pid:"blues",   obj:"drum",     col:"#2c56d6", core:[0,3,4],         st:[0,0,0,0,3,3,0,0,4,3,0,4],     songs:[], nm:"grBlues"},
  {id:"fifties",pid:"fifties", obj:"heart",    col:"#a3306b", core:[0,5,3,4],       st:[0,5,3,4,0,5,3,4],             songs:[]},
  {id:"canon",  pid:"canon",   obj:"crown",    col:"#b4461a", core:[0,4,5,2,3,0,3,4], st:[0,4,5,2,3,0,3,4],           songs:["canon"], nm:"grCanon"},
  {id:"m145",   pid:"m145",    obj:"mountain", col:"#c9463c", core:[0,3,4],         st:[0,3,4,0,0,3,4,0],             songs:[]},
];
const grOf = id => GRILLES.find(g=>g.id===id)||GRILLES[0];
function pcLoad(){ if(window.PC_SONG) return Promise.resolve();
  if(!PC.loading) PC.loading=new Promise((res,rej)=>{ const sc=document.createElement("script"); sc.src="assets/js/songs-data.js"; sc.async=true; sc.onload=()=>res(); sc.onerror=()=>{ PC.loading=null; rej(); }; document.head.appendChild(sc); });
  return PC.loading; }
function pcBest(){ try{ return JSON.parse(localStorage.getItem("clavio:best")||"{}")||{}; }catch(e){ return {}; } }
// rows [id, French title, English title, -, level of the 1st version, OBJ key, colour] for the hub (« Pour toi », « Reprendre ») and Ma route:
// the catalogue once loaded, before that the 5 first songs (and the catalogue is fetched, then the hub is drawn again)
const PC_ROWS0=[["lune","Au clair de la lune","Au clair de la lune",0,1,"moon","#2c56d6"],["maman","Ah ! vous dirai-je, maman","Twinkle, Twinkle, Little Star",0,1,"star","#6a3fd1"],
  ["jacques","Frère Jacques","Frère Jacques",0,1,"bell","#b4461a"],["ode","Ode à la joie","Ode to Joy",0,1,"staff","#1f7a52"],["elise","Lettre à Élise","Für Elise",0,3,"heart","#b02a6b"]];
function pcRows(){ const P=window.PC_SONG;
  if(!P){ pcLoad().then(()=>{ try{ if(page==="hub") renderHubSide(); }catch(e){} }).catch(()=>{}); return PC_ROWS0; }
  return P.list.map(d=>[d.id,d.t[0],d.t[1],0,(P.arrs(d)[0]||{}).lv||1,d.o,d.k]); }
// best stars of a song over its versions (clavio:best keys "id" and "id@lv"), and the version that has them
function pcBestOf(best,id){ let st=0, lv=0; Object.entries(best||{}).forEach(([k,v])=>{ const [i,l]=String(k).split("@"); v=Math.min(3,+v||0); if(i===id && v>st){ st=v; lv=+l||0; } }); return {st,lv}; }
const pcBy = d => d.by==="trad" ? (t("pcFrom")[d.from]||t("pcTrad")) : d.by;
const pcTitle = d => d.t[S.settings.lang==="fr"?0:1];
const pcStars = (d,best,lv) => { const A=window.PC_SONG.arrs(d); return lv ? (best[(A.find(a=>a.lv===lv)||{}).key]|0) : Math.max(0,...A.map(a=>best[a.key]|0)); };
const pcStarTxt = n => "★".repeat(n)+"☆".repeat(3-n);
// records of the progress sheet: the songs with stars (catalogue loaded on demand)
function pcRecRows(best){ if(!window.PC_SONG){ pcLoad().then(()=>{ if(page==="progress") renderFiche(); }).catch(()=>{}); return []; }
  return window.PC_SONG.list.map(d=>[d,pcStars(d,best,0)]).filter(([,n])=>n>0).map(([d,n])=>[pcTitle(d),pcStarTxt(n)]); }
function pcBar(){ const bar=$("pcBar"); bar.innerHTML=""; bar.hidden = PC.view==="grid" && !PC.kb; bar.setAttribute("aria-label",t("pcFilter"));
  [0,1,2,3].forEach(lv=>{ const b=document.createElement("button"); b.type="button"; b.className="pc-chip"; b.dataset.lv=lv; b.setAttribute("aria-pressed",!PC.kb&&PC.lv===lv);
    b.innerHTML=lv?'<i style="--dc:'+PC_LVCOL[lv]+'"></i><span></span>':'<span></span>'; b.lastChild.textContent=lv?t("pcLv")[lv]:t("pcAll"); if(lv) b.title=t("pcLvD")[lv];
    b.onclick=()=>{ PC.lv=lv; PC.kb=false; PC.view="cat"; renderPlaySongs(); }; bar.appendChild(b); });
  const sp=document.createElement("span"); sp.className="pc-sp"; bar.appendChild(sp);
  const f=document.createElement("button"); f.type="button"; f.className="pc-chip pc-free"; f.id="pcFree"; f.setAttribute("aria-pressed",PC.kb);
  f.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M7 6v7M12 6v7M17 6v7"/></svg><span></span>'; f.lastChild.textContent=t("pcFree"); f.setAttribute("aria-label",t("pcFree"));
  f.onclick=()=>{ PC.kb=!PC.kb; if(PC.kb) PC.view="cat"; renderPlaySongs(); }; bar.appendChild(f); }
function pcRow(title,sub,cls){ const el=document.createElement("section"); el.className="pc-row"+(cls?" "+cls:"");
  el.innerHTML='<h3><b></b><small></small></h3><div class="pc-strip"></div>'; el.querySelector("b").textContent=title; el.querySelector("small").textContent=sub;
  const strip=el.lastChild; strip.addEventListener("wheel",e=>{ if(Math.abs(e.deltaY)>Math.abs(e.deltaX) && strip.scrollWidth>strip.clientWidth){ strip.scrollLeft+=e.deltaY; e.preventDefault(); } },{passive:false});
  return {el,strip}; }
function pcTile(d,best){ const P=window.PC_SONG, A=P.arrs(d), a=(PC.lv&&A.find(x=>x.lv===PC.lv))||A[0], st=pcStars(d,best,PC.lv), lk=premSong(d.id);
  const el=tile({color:d.k,obj:d.o,kick:pcBy(d),title:pcTitle(d),desc:pcBy(d)+" · "+d.d,rec:pcStarTxt(st),btn:lk?t("lockT"):t("rnPlay"),onOpen:()=>openPlayWith("#song="+d.id+"&arr="+a.lv)});
  el.dataset.song=d.id; el.querySelector(".rec").insertAdjacentHTML("afterbegin",'<span class="pc-dots" aria-hidden="true">'+A.map(x=>'<i style="--dc:'+PC_LVCOL[x.lv]+'"'+(x.lv===a.lv?' class="on"':'')+'></i>').join("")+'</span>');
  el.setAttribute("aria-label",pcTitle(d)+" · "+pcBy(d)+" · "+A.map(x=>t("pcLv")[x.lv]).join(", ")+" · "+st+"/3");
  if(lk){ el.classList.add("pw-lk"); el.querySelector(".go").insertAdjacentHTML("afterbegin",pwI("lock")); el.querySelector(".rec").insertAdjacentHTML("beforeend",'<span class="pc-lk" aria-hidden="true">'+pwI("lock")+'</span>'); el.setAttribute("aria-label",el.getAttribute("aria-label")+" · "+t("lockT")); } return el; }
const grDegs = (g,list) => { const pr=PROG[g.pid], k=pr.scale==="major"?"C":"A"; return list.map(d=>hChord(pr.scale,k,d,pr.sev).roman); };
const grName = g => g.nm ? t(g.nm) : grDegs(g,g.core).join(" – ");
function grTile(g){ const n=g.songs.length;
  const el=tile({color:g.col,obj:g.obj,kick:t("grKick"),title:grName(g),desc:t("grWhy")[g.id],rec:t("grSongs")(n),btn:t("grPlay"),onOpen:()=>{ PC.view="grid"; PC.gr=g.id; PC.kb=false; renderPlaySongs(); }});
  el.classList.add("gr-tile"); el.dataset.gr=g.id; return el; }
function renderPlaySongs(){ const box=$("playSongs"); if(!box) return;
  if(!window.PC_SONG){ if(page!=="free") return; pcBar(); pcLoad().then(renderPlaySongs).catch(()=>{}); return; }
  document.body.classList.toggle("pc-kb",PC.kb); pcBar();
  const grid = PC.view==="grid" && !PC.kb; $("grPanel").hidden=!grid; box.hidden=grid;
  if(grid){ grRender(); return; }
  const P=window.PC_SONG, best=pcBest(); box.innerHTML="";
  PC_COLL.forEach(([c,k])=>{ const songs=P.list.filter(d=>d.c===c && (!PC.lv || P.arrs(d).some(a=>a.lv===PC.lv)));
    const r=pcRow(t(k),t("pcCount")(songs.length)); r.el.dataset.coll=c; songs.forEach(d=>r.strip.appendChild(pcTile(d,best)));
    if(!songs.length){ const e=document.createElement("p"); e.className="pc-empty"; e.textContent=t("pcEmpty"); r.strip.appendChild(e); } box.appendChild(r.el); });
  const r=pcRow(t("grRow"),t("grCount")(GRILLES.length),"gr-row"); GRILLES.forEach(g=>r.strip.appendChild(grTile(g))); box.appendChild(r.el); }
// the grid sheet
function grKeyName(sc,pc){ return TONICS[sc].find(k=>keyPc(k)===pc)||TONICS[sc][0]; }
function grRender(){ const box=$("grPanel"), g=grOf(PC.gr), pr=PROG[g.pid], sc=pr.scale, pc=PC.keys[g.id]!=null?PC.keys[g.id]:(sc==="minor"?9:0), K=grKeyName(sc,pc);
  const ch=d=>{ const c=hChord(sc,K,d,pr.sev); return {ro:c.roman, nm:c.ct?symOf(c.ct,c.root):noteName(c.root)+c.sym}; };
  box.style.setProperty("--gc",g.col); box.innerHTML="";
  // list of the grids (a column on iPad and computer, a row of chips on phones)
  const list=document.createElement("div"); list.className="gr-list"; list.setAttribute("role","tablist"); list.setAttribute("aria-label",t("grListH"));
  GRILLES.forEach(x=>{ const b=document.createElement("button"); b.type="button"; b.setAttribute("role","tab"); b.setAttribute("aria-selected",x.id===g.id); b.dataset.gr=x.id; b.style.setProperty("--gc",x.col);
    b.innerHTML="<b></b><small></small>"; b.firstChild.textContent=grName(x); b.lastChild.textContent=t("grSongs")(x.songs.length); b.onclick=()=>{ PC.gr=x.id; grRender(); }; list.appendChild(b); });
  const card=document.createElement("div"); card.className="gr-card"; card.setAttribute("role","tabpanel");
  const core=g.core.map(ch), open=typeOpenS("prog",g.pid);
  card.innerHTML='<button type="button" class="gr-x" id="grClose"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>'+
    '<div class="gr-top"><div class="gr-degs'+(core.length>4?' many':'')+'">'+core.map(c=>'<span><b>'+esc(c.ro)+'</b><small>'+esc(c.nm)+'</small></span>').join('<i aria-hidden="true">·</i>')+'</div>'+
    '<div class="gr-side"><span class="gr-lvl"></span><button type="button" class="gr-play" id="grPlay"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5l12 7.5-12 7.5z"/></svg><span></span></button></div></div>'+
    '<div class="gr-keys" id="grKeys" role="group"></div>'+
    '<div class="gr-sec"><h4 class="gr-h"></h4><div class="gr-struct" style="--n:'+g.st.length+'">'+g.st.map(d=>{ const c=ch(d); return '<span><b>'+esc(c.ro)+'</b><small>'+esc(c.nm)+'</small></span>'; }).join("")+'</div></div>'+
    '<div class="gr-info"><section class="gr-why"><h4 class="gr-h"></h4><p></p></section><section class="gr-ex"><h4 class="gr-h"></h4><div class="gr-chips"></div></section></div>';
  card.querySelector(".gr-x").setAttribute("aria-label",t("grClose")); card.querySelector(".gr-x").onclick=()=>{ PC.view="cat"; renderPlaySongs(); };
  card.querySelector(".gr-lvl").textContent=t("grLvl")(pr.lvl,new Set(g.core).size);
  const pb=card.querySelector("#grPlay"); pb.lastChild.textContent=open?t("grPlay"):t("grLocked")(pr.lvl); pb.disabled=!open; pb.onclick=()=>grPlay(g,pc);
  const kb=card.querySelector("#grKeys"); kb.setAttribute("aria-label",t("grKeyH"));
  for(let k=0;k<12;k++){ const b=document.createElement("button"); b.type="button"; b.setAttribute("aria-pressed",k===pc); b.textContent=noteName(tonicNote(grKeyName(sc,k)));
    b.onclick=()=>{ PC.keys[g.id]=k; grRender(); }; kb.appendChild(b); }
  const hs=card.querySelectorAll(".gr-h"); hs[0].textContent=t("grStructH")(g.st.length); hs[1].textContent=t("grWhyH"); hs[2].textContent=t("grExH");
  card.querySelector(".gr-why p").textContent=t("grWhy")[g.id];
  const chips=card.querySelector(".gr-chips"), best=pcBest();
  if(!g.songs.length){ const p=document.createElement("p"); p.className="gr-none"; p.textContent=t("grNoEx"); chips.appendChild(p); }
  g.songs.forEach(id=>{ const d=window.PC_SONG.list.find(x=>x.id===id); if(!d) return; const b=document.createElement("button"); b.type="button"; b.className="gr-song"; b.dataset.song=id;
    b.textContent=(pcStars(d,best,0)?"✓ ":"")+pcTitle(d); b.onclick=()=>openPlayWith("#song="+id+"&arr=2"); chips.appendChild(b); });
  box.append(list,card); }
// "Play it": the LEARN › Progressions start screen, set to this grid and this key (falls back to the simple keys if the key is still locked)
function grPlay(g,pc){ const st=suState("prog"); st.tids=[g.pid]; st.keys = openRoots("prog",g.pid).some(k=>keyPc(k)===pc) ? "pick" : "simple"; st.picked=[pc]; st.shuffle=false;
  S.settings.pview=g.pid; save(); const b=$("secTabs").querySelector('[data-v="prog"]'); if(b) b.click(); }
/* ==== fin Morceaux ==== */
