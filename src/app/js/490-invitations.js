// fragment de l'IIFE principale — ordre 490, voir src/app/README.md
// ----- invitations: a personal link (?ref=), the native share sheet, quick buttons, a counter (filled by the server once accounts are linked) -----
function refLink(){ return "https://pianochallenges.com/?ref="+netId(); }
function invOpen(){ const o=pwLayer("inv","inv"); o.hidden=false; document.body.classList.add("pw-on"); pwInert(); closeDrawer&&closeDrawer(); invRender(); }
function invClose(){ const o=$("inv"); if(!o||o.hidden) return; o.hidden=true; document.body.classList.remove("pw-on"); pwInert(); if(PW.after){ const f=PW.after; PW.after=null; f(); } }
function invRender(){ const o=$("inv"), link=refLink(), msg=t(paywallOn()?"invMsg":"invMsgF"), r=S.refStats||{n:0,m:0};
  o.innerHTML='<div class="inv-card"><button class="inv-x" type="button" id="invX" aria-label="'+esc(t("closeLbl"))+'">×</button>'
    +'<div class="inv-top"><span class="obj">'+OBJ.gift()+'</span><h2 id="invH">'+esc(t("invTitle"))+'</h2><p>'+esc(t(paywallOn()?"invSub":"invSubF"))+'</p></div>'
    +'<div class="inv-body"><ol class="inv-steps">'+t(paywallOn()?"invSteps":"invStepsF").map(x=>'<li>'+esc(x)+'</li>').join("")+'</ol>'
    +'<button class="gt-go" type="button" id="invShare">'+esc(t("invShare"))+'</button>'
    +'<div class="inv-link"><input readonly class="mono" id="invLink" aria-label="Link"><button class="btn" type="button" id="invCopy">'+esc(t("invCopy"))+'</button></div>'
    +'<div class="inv-quick"><a id="invWa" target="_blank" rel="noopener" style="--c:#25d366"><i></i>WhatsApp</a><a id="invSms" style="--c:#3cc8f0"><i></i>SMS</a><a id="invMail" style="--c:#7a5bf5"><i></i>E-mail</a></div>'
    +'<div class="inv-stats"><div><b>'+esc(fmtN(r.n|0))+'</b><small>'+esc(t("invStatF")((r.n|0)))+'</small></div>'+(paywallOn()?'<div><b>'+esc(fmtN(r.m|0))+'</b><small>'+esc(t("invStatM")((r.m|0)))+'</small></div>':'')+'</div>'
    +'<p class="pw-fine">'+esc(t("invStatNote"))+'</p></div></div>';
  o.setAttribute("aria-labelledby","invH");
  $("invLink").value=link; $("invX").onclick=invClose;
  const full=msg+" "+link; $("invWa").href="https://wa.me/?text="+encodeURIComponent(full); $("invSms").href="sms:?&body="+encodeURIComponent(full); $("invMail").href="mailto:?subject="+encodeURIComponent(t("invMail"))+"&body="+encodeURIComponent(full);
  $("invCopy").onclick=()=>copyText(link,$("invCopy"));
  $("invShare").onclick=()=>shareIt({title:"Piano Challenges",text:msg,url:link}); }
function copyText(x,btn){ const done=()=>{ if(btn){ const o=btn.textContent; btn.textContent=t("invCopied"); setTimeout(()=>btn.textContent=o,1600); } else toast(t("shareCopied")); };
  try{ navigator.clipboard.writeText(x).then(done,()=>{}); }catch(e){} }
// the native share sheet (with a picture when the device can), otherwise the text is copied
async function shareIt(o){ const text=o.text+(o.url?" "+o.url:"");
  try{ if(navigator.share){ const d={title:o.title||"Piano Challenges",text:o.text,url:o.url};
      if(o.file && navigator.canShare && navigator.canShare({files:[o.file]})) d.files=[o.file];
      await navigator.share(d); return; } }catch(e){ if(e&&e.name==="AbortError") return; }
  copyText(text,null); }
// a square picture of the result, in the app's colours
function shareCard(k,big,sub,col,pic){ return new Promise(res=>{ try{ const c=document.createElement("canvas"); c.width=c.height=1080; const g=c.getContext("2d");
    const bg=g.createLinearGradient(0,0,1080,1080); bg.addColorStop(0,"#2b1f74"); bg.addColorStop(1,col||"#7a5bf5"); g.fillStyle=bg; g.fillRect(0,0,1080,1080);
    g.globalAlpha=.18; g.fillStyle="#fff"; for(let i=0;i<14;i++){ g.fillRect(60+i*70,820,60,200); } g.globalAlpha=.3; g.fillStyle="#15122e"; for(let i=0;i<14;i++){ if([2,6,9,13].includes(i)) continue; g.fillRect(105+i*70,820,30,120); } g.globalAlpha=1;
    g.fillStyle="#ffd77a"; g.font="800 40px Nunito, system-ui, sans-serif"; g.fillText(t("shareImgK").toUpperCase(),80,130);
    if(pic){ g.fillStyle="#221d47"; g.beginPath(); g.arc(880,200,140,0,Math.PI*2); g.fill(); g.lineWidth=14; g.strokeStyle="#ffd77a"; g.stroke(); g.drawImage(pic,790,110,180,180); } // Succès: the badge
    g.fillStyle="#fff"; g.font="700 64px Fredoka, Nunito, system-ui, sans-serif"; wrapTxt(g,k,80,230,pic?640:920,72,2);
    let fs=260; g.font="700 "+fs+"px Fredoka, Nunito, system-ui, sans-serif"; while(g.measureText(big).width>920 && fs>80){ fs-=10; g.font="700 "+fs+"px Fredoka, Nunito, system-ui, sans-serif"; } g.fillText(big,72,560);
    g.font="700 48px Nunito, system-ui, sans-serif"; g.fillStyle="#e9e4ff"; wrapTxt(g,sub,80,650,920,58);
    g.font="800 40px Nunito, system-ui, sans-serif"; g.fillStyle="#fff"; g.fillText(t("shareImgCta"),80,790);
    c.toBlob(b=>res(b?new File([b],"piano-challenges.png",{type:"image/png"}):null),"image/png"); }catch(e){ res(null); } }); }
function wrapTxt(g,s,x,y,w,lh,max){ const lines=[]; let line=""; String(s).split(" ").forEach(word=>{ const tt=line?line+" "+word:word; if(g.measureText(tt).width>w && line){ lines.push(line); line=word; } else line=tt; }); if(line) lines.push(line);
  // a word wider than the card (no space to break on) is cut by grapheme
  const fit=l=>{ if(g.measureText(l).width<=w) return l; let n=gLen(l); while(n>1 && g.measureText(gCut(l,n)+"…").width>w) n--; return gCut(l,n)+"…"; };
  let out=lines.map(fit); if(max && out.length>max){ out=out.slice(0,max); let l=lines[max-1]; while(l && g.measureText(l+"…").width>w) l=gCut(l,gLen(l)-1); out[max-1]=(l||"")+"…"; }
  out.forEach((l,i)=>g.fillText(l,x,y+i*lh)); }
async function shareEnd(g,good,n){ const lbl=g.label||t("endTitle"), file=await shareCard(lbl,fmtN(good)+" / "+fmtN(n),t("shareImgEnd"),"#c9463c");
  shareIt({text:t("shareEnd")(good,n,lbl),url:refLink(),file}); }
async function shareDuel(){ const r=DU.res, o=DU.opp; if(!r||!o) return; const gn=duGameName(), w=r.res, file=await shareCard(gn+" · "+pName(o.name),duScTxt(r.me)+" – "+duScTxt(r.opp),(t("shareImgDu")[w]||"")+(r.elo?" · ELO "+fmtN(r.elo.after):""),"#26805a");
  shareIt({text:t("shareDu")(w,gn,r.me,r.opp,pName(o.name)),url:refLink(),file}); }
// a friend's link: remembered for the sign-up (the server credits both accounts)
(()=>{ try{ const rf=new URLSearchParams(location.search).get("ref"); if(rf && /^p[a-z0-9]{8}$/.test(rf) && rf!==S.netId && !S.refBy){ S.refBy=rf; save(); } }catch(e){} })();
document.addEventListener("keydown",e=>{ if(!document.body.classList.contains("pw-on")) return; if(e.key==="Escape"){ e.preventDefault(); if($("inv")&&!$("inv").hidden) invClose(); else pwClose(); } e.stopImmediatePropagation(); },true);
$("premBtn").addEventListener("click",()=>pwOpen("menu"));
$("hsInv").addEventListener("click",()=>invOpen());
premRefresh();

