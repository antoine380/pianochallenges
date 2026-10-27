// fragment de l'IIFE principale — ordre 040, voir src/app/README.md
const t = k => TXT[S.settings.lang][k];
// data shown to people (scores, XP, other players' names): thousands separators in the app's language,
// cuts by grapheme (never half an emoji), names isolated from the text around them (<bdi>) and without bidi controls
const fmtN = n => (+n||0).toLocaleString(S.settings.lang==="fr"?"fr-FR":"en-GB");
const BIDI_G = /[‎‏‪-‮⁦-⁩]/g, BIDI_1 = /[‎‏‪-‮⁦-⁩]/, CTRL_1 = /[\u0000-\u001f\u007f]/;
const gSeg = (typeof Intl!=="undefined" && Intl.Segmenter) ? new Intl.Segmenter() : null;
function gCut(s,n,cp){ s=String(s==null?"":s); const parts=gSeg?Array.from(gSeg.segment(s),x=>x.segment):Array.from(s); let out="", k=0, c=0;
  for(const p of parts){ const l=Array.from(p).length; if(k>=n || (cp && c+l>cp)) break; out+=p; k++; c+=l; } return out; }
const gLen = s => gSeg ? Array.from(gSeg.segment(String(s))).length : Array.from(String(s)).length;
const pName = s => String(s==null?"":s).replace(BIDI_G,"").replace(/[\u0000-\u001f\u007f]/g,"").trim() || t("qzPlayer");
function nmPut(el,s,suf){ const v=pName(s), bd=document.createElement("bdi"); bd.textContent=v; el.textContent=""; el.appendChild(bd); if(suf) el.appendChild(document.createTextNode(suf)); el.title=v+(suf||""); return v; }
function nmFill(el,fn,s){ const v=pName(s), parts=String(fn("⁣")).split("⁣"), bd=document.createElement("bdi"); bd.textContent=v; el.textContent=parts[0]||""; el.appendChild(bd); if(parts[1]) el.appendChild(document.createTextNode(parts[1])); }
// one's own nickname: 2 to 24 characters, no control or text-direction characters (same rule as the profiles_name_clean check in SQL)
const nameErr = s => { const v=String(s==null?"":s).trim(); return BIDI_1.test(v)||CTRL_1.test(v) ? "pseudoBad" : gLen(v)<2 ? "pseudoShort" : ""; };
// avatar: a photo built with the DOM (never concatenated HTML), the drawn character if it fails to load
function avFill(el,photo,ci){ el.textContent=""; const svg=()=>{ el.innerHTML=avatarSVG(Math.max(0,Math.min(9,ci|0))); };
  if(!(photo && /^https:\/\//.test(photo))){ svg(); return el; }
  const img=document.createElement("img"); img.className="photo"; img.alt=""; img.referrerPolicy="no-referrer"; img.addEventListener("error",svg,{once:true}); img.src=photo; el.appendChild(img); return el; }
// a horizontal row that scrolls: fade the edge(s) that hide content, updated on scroll and resize
function ovFade(el,cb){ if(!el) return; const up=()=>{ const max=el.scrollWidth-el.clientWidth, x=Math.abs(el.scrollLeft); const v=max>2 ? (x>2?"l":"")+(x<max-2?"r":"") : ""; if(v) el.dataset.ov=v; else delete el.dataset.ov; if(cb) cb(el); };
  if(!el._ov){ el._ov=up; el.addEventListener("scroll",()=>requestAnimationFrame(up),{passive:true}); OV_ROWS.add(el); } else el._ov=up; requestAnimationFrame(up); }
const OV_ROWS=new Set(); addEventListener("resize",()=>OV_ROWS.forEach(el=>el._ov&&el._ov()));
const ordFr = n => fmtN(n)+(n===1?"er":"e"), ordEn = n => fmtN(n)+((n%100>=11&&n%100<=13)?"th":["th","st","nd","rd"][n%10]||"th");

