// Non-regression checks from the October 2026 audit:
//  - #13/#14  the Hub, Learn and Games pages never scroll on iPad (1024×768, 768×1024), on a short laptop (1280×800) and on phones (812×375, 375×667)
//  - #16      white text on the mode tiles keeps a contrast of 4.5:1 or more (light and dark themes)
//  - #15      the Play page follows the host language: "Songs" and C D E in English, "Morceaux" and Do Ré Mi in French
// Usage: python3 -m http.server 8767 at the repo root, then  node tools/audit/regression.mjs   (PORT=8773 to use another port).
// Needs Playwright for Node (NODE_PATH=/path/to/node_modules is honoured) and a Chromium (PW_CHROMIUM=/path/to/chrome, otherwise Playwright's own).
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT=process.env.PORT||'8767', BASE=`http://localhost:${PORT}/`;
const SEED=lang=>`(()=>{try{const S={settings:{lang:${JSON.stringify(lang)},notation:${JSON.stringify(lang)},input:"screen",earV2:true,diffV2:true,midiV2:true},langV2:true,gate:"guest",onb:{done:1},tourDone:1,
  introSeen:{chords:1,scales:1,harmony:1,prog:1,ear:1,games:1,daily:1,section:1},seenTypes:[],stats:{},secStats:{},xp:0,xpDays:{},streak:{days:0}};
  localStorage.setItem("memo-gammes-v1",JSON.stringify(S));}catch(e){}})();`;
const fails=[]; const ok=(cond,msg)=>{ console.log((cond?'ok   ':'FAIL ')+msg); if(!cond) fails.push(msg); };
const b=await chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{});
async function open({w,h,lang,dark=false,mobile=false}){
  const c=await b.newContext({viewport:{width:w,height:h},colorScheme:dark?'dark':'light',isMobile:mobile,hasTouch:mobile,locale:lang==='fr'?'fr-FR':'en-GB'});
  await c.addInitScript(SEED(lang)); const pg=await c.newPage(); await pg.goto(BASE); await pg.waitForTimeout(700);
  for(let i=0;i<3;i++){ await pg.keyboard.press('Escape'); await pg.waitForTimeout(100); }
  return pg;
}
const click=(pg,sel)=>pg.evaluate(s=>document.querySelector(s).click(),sel);
const GO={hub:'#homeLink',learn:'#modeNav [data-mode=learn]',games:'#modeNav [data-mode=games]'};

// ---- #13/#14 no scrolling on the mode pages
for(const v of [{w:1024,h:768},{w:768,h:1024},{w:1280,h:800},{w:812,h:375,mobile:true},{w:375,h:667,mobile:true}]){
  for(const lang of ['fr','en']){
    const pg=await open({...v,lang});
    for(const p of ['hub','learn','games']){
      await click(pg,GO[p]); await pg.waitForTimeout(350);
      const m=await pg.evaluate(()=>{ const m=document.getElementById('main'); const d=document.scrollingElement; return {sh:m.scrollHeight,ch:m.clientHeight,dsh:d.scrollHeight,dsw:d.scrollWidth,H:innerHeight,W:innerWidth}; });
      ok(m.sh<=m.ch+1 && m.dsh<=m.H+1 && m.dsw<=m.W, `${v.w}×${v.h} ${lang} ${p}: no scroll (main ${m.sh}/${m.ch}, doc ${m.dsh}/${m.H})`);
    }
    await pg.context().close();
  }
}

// ---- #16 contrast of white text on the tiles (hub, Learn, Games), light and dark
const lum=c=>{ const [r,g,b]=c.map(v=>{ v/=255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4); }); return 0.2126*r+0.7152*g+0.0722*b; };
const ratio=(a,b)=>{ const l1=lum(a),l2=lum(b); return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05); };
for(const dark of [false,true]){
  const pg=await open({w:1280,h:800,lang:'fr',dark});
  for(const [p,sel] of [['hub','.hub-grid .ptile'],['learn','#learnTiles .ptile'],['games','#gameCards .ptile, #playCards .ptile']]){
    await click(pg,GO[p]); await pg.waitForTimeout(350);
    const rows=await pg.evaluate(sel=>[...document.querySelectorAll(sel)].map(tile=>{
      const parse=s=>{ const m=s.match(/rgba?\(([^)]+)\)/); const q=m[1].split(',').map(Number); return {c:q.slice(0,3),a:q.length>3?q[3]:1}; };
      // background: the tile color blended over the page when the tile is translucent (the "soon" tile)
      let bg=parse(getComputedStyle(tile).backgroundColor).c; const op=parseFloat(getComputedStyle(tile).opacity);
      if(op<1){ const page=parse(getComputedStyle(document.body).backgroundColor).c; bg=bg.map((v,i)=>Math.round(v*op+page[i]*(1-op))); }
      return [...tile.querySelectorAll('.h3, p, .pk, .rec, .tags')].filter(e=>e.offsetParent).map(e=>({txt:e.textContent.trim().slice(0,24),fg:parse(getComputedStyle(e).color).c,bg}));
    }).flat(),sel);
    for(const r of rows){ const rr=ratio(r.fg,r.bg); ok(rr>=4.5, `${dark?'dark':'light'} ${p} "${r.txt}" ${rr.toFixed(2)}:1`); }
  }
  await pg.context().close();
}

// ---- #15 Play page in the host language (song titles in the host tiles, the frame's own headings and note names)
for(const [lang,h2,note] of [['en','Songs','C'],['fr','Morceaux','Do']]){
  const pg=await open({w:1024,h:768,lang});
  await click(pg,'#modeNav [data-mode=play]'); await pg.waitForTimeout(400); // PLAY opens the host's song tiles; a song opens in the Play frame
  await click(pg,'#playSongs .ptile'); await pg.waitForTimeout(1500);
  const f=pg.frame({url:/play\/index/});
  const r=f ? await f.evaluate(()=>({lang:document.documentElement.lang,h2:document.querySelector('#secSongs h2').textContent,key:document.querySelector('#kbd .key.w .lbl').textContent})) : null;
  ok(!!r && r.h2===h2 && r.key===note && r.lang===lang, `Play ${lang}: ${JSON.stringify(r)}`);
  await pg.context().close();
}
await b.close();
console.log(fails.length?`\n${fails.length} échec(s)`:'\nTout passe');
process.exit(fails.length?1:0);
