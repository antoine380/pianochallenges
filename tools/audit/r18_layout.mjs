// Mise en page « pleine hauteur » (chantier MISE EN PAGE, 22/10/2026).
// Sur chaque page sans défilement et à chaque taille d'écran :
//   1. rien ne défile (ni #main, ni le document, ni en largeur) ;
//   2. le contenu remplit la hauteur : le bas du dernier élément peint (carte, tuile, touche, bouton…) est à ≥ 90 % de la zone utile de #main.
// 3. (24/10/2026) tablettes et ordinateurs (dont les 6 tailles d'iPad) : les pages de contenu (Réglages et ses onglets,
//    Progression et ses 2 onglets, Notifications, Classement, Profil, Aide) ne défilent pas non plus ; une longue liste défile dans sa carte.
// Usage : python3 -m http.server 8795 à la racine, puis  PORT=8795 node tools/audit/r18_layout.mjs
//   ONLY=hub,learn (scénarios)  SIZES=375x667,1024x768  SHOT=/dossier (captures)  MIN=0.9 (seuil)  THEME=dark
import { createRequire } from 'module';
import fs from 'fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = process.env.PORT || '8767', BASE = `http://localhost:${PORT}/`;
const MIN = +(process.env.MIN || 0.9), SHOT = process.env.SHOT || '';
if (SHOT) fs.mkdirSync(SHOT, { recursive: true });
const SEED = `(()=>{try{if(sessionStorage.getItem("r18"))return;sessionStorage.setItem("r18","1");const S={settings:{lang:"fr",notation:"fr",input:"screen",earV2:true,diffV2:true,midiV2:true,uiSound:false${process.env.THEME ? ',theme:"' + process.env.THEME + '"' : ''}},langV2:true,gate:"guest",onb:{done:1},tourDone:1,pwShown:1,
  introSeen:Object.fromEntries(["hub","learn","games","free","play","quiz","chords","scales","harmony","prog","ear","daily","practice","runner","speed","memory","rank","account","settings","progress","notif","section"].map(k=>[k,1])),seenTypes:[],stats:{},secStats:{},xp:0,xpDays:{},streak:{days:0}};
  localStorage.setItem("memo-gammes-v1",JSON.stringify(S));}catch(e){}})();`;
const W = ms => new Promise(r => setTimeout(r, ms));
const click = (p, s) => p.evaluate(s => { const e = document.querySelector(s); if (e) e.click(); return !!e; }, s);
const mode = (p, m) => click(p, `#modeNav [data-mode="${m}"]`);
const subj = async (p, i) => { await mode(p, 'learn'); await W(300); await p.evaluate(i => document.querySelectorAll('#learnTiles .ptile')[i].click(), i); await W(500); };
const game = async (p, i, start) => { await mode(p, 'games'); await W(300); await p.evaluate(i => document.querySelectorAll('#gameCards .ptile')[i].click(), i); await W(600);
  if (start) { await click(p, '#duModes [data-m=solo]'); await W(500); await p.keyboard.press('Space').catch(() => {}); await W(1500); } };
// [nom, action, élément de référence (sinon #main)]
const SC = [
  ['hub', async p => { await click(p, '#homeLink'); await W(400); }],
  ['learn', async p => { await mode(p, 'learn'); await W(400); }],
  ['games', async p => { await mode(p, 'games'); await W(400); }],
  ['free', async p => { await mode(p, 'play'); await W(500); }],
  ['quiz', async p => { await mode(p, 'quiz'); await W(500); }],
  ['quizq', async p => { await mode(p, 'quiz'); await W(400); await click(p, '#qzGo'); await W(3200); }],
  ['setup', async p => { await subj(p, 0); }],
  ['setupsc', async p => { await subj(p, 1); }],
  ['chords', async p => { await subj(p, 0); await click(p, '#suGo'); await W(700); }],
  ['scales', async p => { await subj(p, 1); await click(p, '#suGo'); await W(700); }],
  ['ear', async p => { await subj(p, 4); await click(p, '#suGo'); await W(900); }],
  ['daily', async p => { await click(p, '#dailyCard'); await W(600); }],
  ['lobby', async p => { await game(p, 0, false); }],
  ['runner', async p => { await game(p, 0, true); }],
  ['speed', async p => { await game(p, 1, true); }],
  ['memory', async p => { await game(p, 2, true); }],
  ['player', async p => { await mode(p, 'play'); await W(300); await click(p, '#playSongs .ptile'); await W(1800); }],
  ['first', async p => {}, { fresh: 1 }],
];
// content pages: they may scroll, but never sideways, and their header is the shared one
const SC2 = [
  ['settings', async p => { await click(p, '#setBtn'); await W(500); }],
  ['progress', async p => { await click(p, '#lvlAv'); await W(600); }],
  ['notif', async p => { await click(p, '#ntfBtn'); await W(500); }],
  ['rank', async p => { await click(p, '#rankBtn'); await W(1200); }],
  ['account', async p => { await click(p, '#accountBtn'); await W(1200); }],
  ['setgame', async p => { await click(p, '#setBtn'); await W(400); await click(p, '#setNav [data-v=game]'); await W(200); }],
  ['setntf', async p => { await click(p, '#setBtn'); await W(400); await click(p, '#setNav [data-v=ntf]'); await W(200); }],
  ['setprem', async p => { await click(p, '#setBtn'); await W(400); await click(p, '#setNav [data-v=prem]'); await W(200); }],
  ['setapp', async p => { await click(p, '#setBtn'); await W(400); await click(p, '#setNav [data-v=app]'); await W(200); }],
  ['progdet', async p => { await click(p, '#lvlAv'); await W(500); await click(p, '#pfNav [data-v=det]'); await W(200); await p.evaluate(() => document.querySelectorAll('#progCats > *')[1]?.click()); await W(300); }],
  ['help', async p => { await click(p, '#helpBtn'); await W(500); }],
];
const SIZES = (process.env.SIZES || '375x667,390x844,812x375,844x390,768x1024,1024x768,1180x820,820x1180,1366x1024,1024x1366,1280x800,1440x900,1920x1080').split(',').map(s => s.split('x').map(Number));
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
const fails = []; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails.push(m); };
const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
// What is the lowest painted thing in the page? Leaves, controls and cards (a background, a border or a shadow), not empty stretched boxes.
const MEASURE = () => {
  const m = document.getElementById('main'), d = document.scrollingElement, cs = getComputedStyle(m), r = m.getBoundingClientRect();
  const top = r.top + parseFloat(cs.paddingTop), bot = r.bottom - parseFloat(cs.paddingBottom);
  let low = top, who = '';
  const painted = e => { if (e.childElementCount === 0 || /^(BUTTON|CANVAS|svg|IFRAME|INPUT|SELECT|IMG)$/.test(e.tagName)) return true;
    const s = getComputedStyle(e); return (s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent') || s.backgroundImage !== 'none' || s.boxShadow !== 'none'; };
  for (const e of m.querySelectorAll('.wrap *')) {
    if (e.closest('svg') && e.tagName !== 'svg') continue;
    const s = getComputedStyle(e); if (s.position === 'fixed' || s.visibility === 'hidden' || s.display === 'none' || +s.opacity === 0) continue;
    const q = e.getBoundingClientRect(); if (q.width < 2 || q.height < 2 || q.bottom > r.bottom + 400) continue;
    if (e.closest('[hidden]')) continue;
    if (e.matches('.sr-only,.du-count,.du-res,.du-wait,.confetti,.dd-pop,.dt-tip') || e.closest('.dd-pop,.du-res,.du-count')) continue;
    if (!painted(e)) continue;
    if (q.bottom > low) { low = q.bottom; who = e.id ? '#' + e.id : e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : e.tagName; }
  }
  const fn = document.querySelector('.fn-card');
  return { sh: m.scrollHeight, ch: m.clientHeight, dsh: d.scrollHeight, dsw: d.scrollWidth, H: innerHeight, W: innerWidth,
    fill: (Math.min(low, bot) - top) / Math.max(1, bot - top), who, page: document.body.dataset.page, mainH: Math.round(bot - top) };
};
for (const [w, h] of SIZES) {
  const phone = w < 700 || h < 500;
  const c = await b.newContext({ viewport: { width: w, height: h }, hasTouch: phone, isMobile: false, locale: 'fr-FR', deviceScaleFactor: SHOT ? 1 : 1, colorScheme: process.env.THEME === 'dark' ? 'dark' : 'light' });
  await c.addInitScript(SEED);
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  for (const [name, fn, o = {}] of SC) {
    if (ONLY.length && !ONLY.includes(name)) continue;
    if (o.fresh) { // first launch: the "Play your first note" card fills the screen, nothing scrolls
      const c2 = await b.newContext({ viewport: { width: w, height: h }, hasTouch: phone, locale: 'fr-FR' }); const q = await c2.newPage();
      await q.goto(BASE + '?r18=first'); await W(1200);
      const f = await q.evaluate(() => { const c = document.querySelector('.fn-card'), pl = document.querySelector('.fn-play'), d = document.scrollingElement; if (!c) return null; const r = c.getBoundingClientRect();
        return { cov: (r.width * r.height) / (innerWidth * innerHeight), pl: pl.scrollHeight <= pl.clientHeight + 1, d: d.scrollHeight <= innerHeight + 1 && d.scrollWidth <= innerWidth + 1 }; });
      ok(!!f && f.pl && f.d && f.cov >= .8, `${w}×${h} first    card ${f ? Math.round(f.cov * 100) : '-'}% of the screen, no scroll`);
      if (SHOT) await q.screenshot({ path: `${SHOT}/first-${w}x${h}.png` });
      await c2.close(); continue; }
    await p.goto(BASE + '?r18=' + name); await W(700);
    for (let i = 0; i < 2; i++) { await p.keyboard.press('Escape'); await W(80); }
    await fn(p); await W(250);
    const m = await p.evaluate(MEASURE);
    const noScroll = m.sh <= m.ch + 1 && m.dsh <= m.H + 1 && m.dsw <= m.W + 1;
    ok(noScroll && m.fill >= MIN, `${w}×${h} ${name.padEnd(8)} fill ${(m.fill * 100).toFixed(0)}% (${m.who}) main ${m.sh}/${m.ch} doc ${m.dsh}/${m.H}${m.dsw > m.W + 1 ? ' width ' + m.dsw : ''}`);
    if (SHOT) await p.screenshot({ path: `${SHOT}/${name}-${w}x${h}.png` });
  }
  for (const [name, fn] of SC2) {
    if (ONLY.length && !ONLY.includes(name)) continue;
    await p.goto(BASE + '?r18=' + name); await W(700); await p.keyboard.press('Escape'); await fn(p); await W(250);
    const m = await p.evaluate(() => { const d = document.scrollingElement, m = document.getElementById('main'), h = [...document.querySelectorAll('.pane:not([hidden]) .pane-head .ph-title, .pane:not([hidden]) .ph-title')].find(e => e.offsetParent);
      const card = [...document.querySelectorAll('.modal:not([hidden]) .modal-card')].find(e => e.offsetParent);
      return { dsw: d.scrollWidth, msw: m.scrollWidth, mcw: m.clientWidth, W: innerWidth, fs: h ? parseFloat(getComputedStyle(h).fontSize) : 0, page: document.body.dataset.page,
        msh: m.scrollHeight, mch: m.clientHeight, dsh: d.scrollHeight, H: innerHeight, card: card ? card.getBoundingClientRect().bottom <= innerHeight + 1 && card.getBoundingClientRect().top >= -1 : true }; });
    ok(m.dsw <= m.W + 1 && m.msw <= m.mcw + 1, `${w}×${h} ${name.padEnd(8)} no sideways scroll (main ${m.msw}/${m.mcw}), title ${m.fs}px`);
    if (!phone) ok(m.msh <= m.mch + 1 && m.dsh <= m.H + 1 && m.card, `${w}×${h} ${name.padEnd(8)} tablet/computer: no page scroll (main ${m.msh}/${m.mch} doc ${m.dsh}/${m.H})`);
    if (SHOT) await p.screenshot({ path: `${SHOT}/${name}-${w}x${h}.png`, fullPage: false });
  }
  if (errs.length) ok(false, `${w}×${h} page errors: ${errs.join(' | ')}`);
  await c.close();
}
await b.close();
console.log(fails.length ? `\n${fails.length} échec(s)` : '\nTout est bon');
process.exit(fails.length ? 1 : 0);
