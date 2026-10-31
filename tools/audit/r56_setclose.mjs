// Réglages : fermer (31/10/2026). Demande d'Antoine : « aller sur Réglages et ensuite revenir sur la partie où j'étais ».
// Croix « Fermer » en haut à droite de Réglages et de Progression (#setClose, #pfClose ; téléphone : #mbClose dans la barre du haut),
// Échap et Si seul au MIDI = retour à la page d'avant avec l'activité telle quelle : accueil, exercice LEARN, Saute-notes en cours,
// quiz en question, morceau du lecteur Play en cours (pas rechargé), Gammes une à une, mode PIANO. Langue changée dans Réglages :
// visible au retour, sans perdre l'état. Échap avec une fenêtre ouverte ferme d'abord la fenêtre. Mise en page : iPad, ordinateur, téléphone.
// Usage : python3 -m http.server <PORT> à la racine, puis PORT=<PORT> node tools/audit/r56_setclose.mjs
import { createRequire } from 'module';
import fs from 'fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = process.env.PORT || '8767', URL = `http://localhost:${PORT}/`;
const LIB = fs.readFileSync(new globalThis.URL('./lib.mjs', import.meta.url), 'utf8');
const INIT = /export const INIT = `([\s\S]*?)`;\n/.exec(LIB)[1].split("${'${MODE}'}").join('ok');
const CAP = process.env.CAP || '';
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d !== undefined && !ok ? ' — ' + JSON.stringify(d) : '')); if (!ok) fails.push(n); };
const seed = (lang = 'fr') => `(()=>{ try{ if(sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded','1');
  localStorage.setItem('memo-gammes-v1', JSON.stringify({settings:{lang:'${lang}',notation:'${lang}',input:'midi',earV2:true,diffV2:true,midiV2:true,uiSound:false,delay:0,sc1Tour:1,quiz:{n:1,bots:1,botLvl:2,count:5,time:30}},
    langV2:true,gate:'guest',onb:{done:1},tourDone:1,pwShown:1,introSeen:Object.fromEntries(['hub','learn','games','free','play','quiz','chords','scales','harmony','prog','ear','daily','practice','runner','speed','memory','rank','account','settings','progress','notif','section','piano','sc1'].map(k=>[k,1])),
    seenTypes:[],stats:{},secStats:{},xp:500,xpDays:{},streak:{days:0}})); }catch(e){} })();`;
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
const W = (p, ms) => p.waitForTimeout(ms);
const ev = (p, f, a) => p.evaluate(f, a);
const click = (p, s) => ev(p, s => { const e = document.querySelector(s); if (e) e.click(); return !!e; }, s);
const waitFor = async (p, f, ms = 8000, a) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(p, f, a)) return true; await W(p, 150); } return false; };
const pg = p => ev(p, () => document.body.dataset.page);
const midiNote = async (p, n) => { await ev(p, n => { window.__midi.noteOn(n); setTimeout(() => window.__midi.noteOff(n), 60); }, n); await W(p, 350); };
const key = (p, m) => ev(p, m => { const el = document.querySelector('#kbd [data-m="' + m + '"]'); el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); }, m);
const mode = (p, m) => click(p, `#modeNav [data-mode="${m}"]`);
const lang = async (p, l) => { await click(p, `#langSeg [data-v="${l}"]`); await W(p, 300); };
const errsAll = [];
async function open(w = 1180, h = 820, mobile = false) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: 'fr-FR', isMobile: mobile, hasTouch: mobile });
  await ctx.addInitScript(INIT); const p = await ctx.newPage(); p.on('pageerror', e => errsAll.push(e.message));
  await p.addInitScript(seed('fr')); await p.goto(URL); await W(p, 1000); await p.keyboard.press('Escape'); await W(p, 100); return p; }
// the cross: visible, at the top right of the page head, labelled
const cross = (p, id) => ev(p, id => { const x = document.getElementById(id); if (!x || !x.offsetParent) return null; const r = x.getBoundingClientRect(), m = document.getElementById('main').getBoundingClientRect();
  return { label: x.getAttribute('aria-label'), right: m.right - r.right, top: r.top - m.top, w: r.width }; }, id);
const noScroll = p => ev(p, () => { const m = document.getElementById('main'), d = document.scrollingElement; return m.scrollHeight <= m.clientHeight + 1 && d.scrollHeight <= innerHeight + 1 && d.scrollWidth <= innerWidth; });

const A = await open();
check('MIDI branché (faux clavier)', await waitFor(A, () => document.getElementById('midiBtn').classList.contains('on'), 5000));

// ---- 1. accueil → Réglages → langue EN → croix : accueil en anglais ----
await click(A, '#setBtn'); await W(A, 300);
let X = await cross(A, 'setClose');
check('Réglages : croix « Fermer » en haut à droite de l’en-tête', X && X.label === 'Fermer' && X.right < 60 && X.top < 80 && X.w >= 38, X);
check('Réglages : pas de défilement ajouté (ordinateur)', await noScroll(A));
await lang(A, 'en');
check('… libellé de la croix en anglais : Close', (await cross(A, 'setClose') || {}).label === 'Close');
await click(A, '#setClose'); await W(A, 400);
check('1. croix : retour à l’accueil', await pg(A) === 'hub');
check('… l’accueil est en anglais', await ev(A, () => document.documentElement.lang === 'en' && /[A-Za-z]/.test(document.getElementById('mbTitle').textContent) && !/Qu'est-ce/.test(document.getElementById('hubPanel') ? document.getElementById('hubPanel').innerText : document.body.innerText)));
await click(A, '#setBtn'); await W(A, 250); await lang(A, 'fr'); await A.keyboard.press('Escape'); await W(A, 300);
check('… Échap : retour à l’accueil, de nouveau en français', await pg(A) === 'hub' && await ev(A, () => document.documentElement.lang === 'fr'));

// ---- 2. exercice LEARN en cours → Réglages → EN → croix : même élément, même progression, texte en anglais ----
await mode(A, 'learn'); await W(A, 300); await ev(A, () => document.querySelectorAll('#learnTiles .ptile')[0].click()); await W(A, 400); await click(A, '#suGo'); await W(A, 700);
const ex0 = await ev(A, () => ({ t: document.getElementById('promptTitle') ? document.getElementById('promptTitle').textContent : '', end: document.getElementById('gameEnd').textContent }));
const pk = await ev(A, () => [...document.querySelectorAll('#kbd .k-rev,#kbd .k-guide')].map(k => +k.dataset.m));
await key(A, 61); await W(A, 300);
const st0 = await ev(A, () => document.getElementById('slots') ? document.getElementById('slots').innerHTML.length : 0);
await click(A, '#setBtn'); await W(A, 300); await lang(A, 'en');
await click(A, '#setClose'); await W(A, 500);
const ex1 = await ev(A, () => ({ pg: document.body.dataset.page, endOn: !document.getElementById('gameEnd').hidden, t: document.getElementById('promptTitle') ? document.getElementById('promptTitle').textContent : '', end: document.getElementById('gameEnd').textContent, setup: document.body.classList.contains('setup') }));
check('2. exercice LEARN : retour dans la même partie (pas l’écran de départ)', ex1.pg === 'practice' && ex1.endOn && !ex1.setup, ex1);
check('… le bouton « Terminer la partie » est passé en anglais', ex0.end !== ex1.end && /End|Finish/i.test(ex1.end), { ex0, ex1 });
check('… la partie n’a pas été recommencée (cases déjà jouées gardées)', await ev(A, () => document.getElementById('slots') ? document.getElementById('slots').innerHTML.length : 0) >= st0 * 0.5 && st0 > 0, { st0, pk });
await click(A, '#setBtn'); await W(A, 250); await lang(A, 'fr'); await click(A, '#setClose'); await W(A, 400);

// ---- 3. Saute-notes en cours → Réglages → Échap : la partie continue ----
await click(A, '#gameEnd'); await W(A, 250); if (await ev(A, () => !document.getElementById('leaveModal').hidden)) { await click(A, '#lvGo'); await W(A, 300); }
await mode(A, 'games'); await W(A, 300); await ev(A, () => document.querySelectorAll('#gameCards .ptile')[0].click()); await W(A, 500); await click(A, '#duModes [data-m=solo]'); await W(A, 300);
await ev(A, () => document.getElementById('rnCanvas').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))); await W(A, 900);
await click(A, '#setBtn'); await W(A, 300);
check('Saute-notes : Réglages s’ouvre par-dessus', await pg(A) === 'settings');
await A.keyboard.press('Escape'); await W(A, 400);
const s1 = await ev(A, () => document.getElementById('rnScore').textContent); await W(A, 900); const s2 = await ev(A, () => document.getElementById('rnScore').textContent);
check('3. Échap : retour dans Saute-notes, la partie continue', await pg(A) === 'games' && await ev(A, () => document.body.classList.contains('runner-on')) && +s2 > +s1, { s1, s2 });
await click(A, '#rnQuit'); await W(A, 250); if (await ev(A, () => !document.getElementById('leaveModal').hidden)) { await click(A, '#lvGo'); await W(A, 300); }

// ---- 4. quiz en question → Progression → croix : la question est toujours là ----
await mode(A, 'quiz'); await W(A, 500); await click(A, '#qzGo');
await waitFor(A, () => !document.getElementById('qzQuit').hidden && document.getElementById('qzQuit').offsetParent, 8000); await W(A, 300);
await click(A, '#lvlAv'); await W(A, 400);
X = await cross(A, 'pfClose');
check('Progression : même croix « Fermer » en haut à droite', await pg(A) === 'progress' && X && X.label === 'Fermer' && X.right < 60, X);
await click(A, '#pfClose'); await W(A, 400);
check('4. quiz : retour à la question en cours', await pg(A) === 'quiz' && await ev(A, () => !!document.getElementById('qzQuit').offsetParent));
await click(A, '#qzQuit'); await W(A, 250); if (await ev(A, () => !document.getElementById('leaveModal').hidden)) { await click(A, '#lvGo'); await W(A, 300); }

// ---- 5. morceau du lecteur Play en cours → Réglages → EN → croix : le morceau n'est pas rechargé ----
await mode(A, 'play'); await W(A, 300); await click(A, '#playSongs .ptile, .pc-strip [data-song]'); await W(A, 1800);
let FR = await (await A.$('#playFrame')).contentFrame();
await FR.evaluate(() => { window.__mark = 1; document.getElementById('go').click(); }); await W(A, 300);
await midiNote(A, 61); await midiNote(A, 66);
check('morceau commencé', await FR.evaluate(() => window.clavioBusy()));
await click(A, '#setBtn'); await W(A, 300); await lang(A, 'en'); await click(A, '#setClose'); await W(A, 600);
FR = await (await A.$('#playFrame')).contentFrame();
check('5. morceau en cours : retour au lecteur, même morceau, pas rechargé', await pg(A) === 'play' && await FR.evaluate(() => window.__mark === 1 && window.clavioBusy()));
check('… le menu de l’app est en anglais', await ev(A, () => document.documentElement.lang === 'en'));
await click(A, '#setBtn'); await W(A, 250); await lang(A, 'fr'); await click(A, '#setClose'); await W(A, 600);

// ---- 6. Gammes une à une → Réglages → Si seul au MIDI ----
await mode(A, 'learn'); await W(A, 250); if (await ev(A, () => !document.getElementById('leaveModal').hidden)) { await click(A, '#lvGo'); await W(A, 300); }
await click(A, '.sc1-tile'); await W(A, 600);
check('Gammes une à une ouverte', await pg(A) === 'sc1');
await click(A, '#setBtn'); await W(A, 300); await midiNote(A, 71);
check('6. Si seul au MIDI : retour à Gammes une à une', await pg(A) === 'sc1');
await click(A, '#setBtn'); await W(A, 300); await ev(A, () => { window.__midi.noteOn(60); window.__midi.noteOn(64); window.__midi.noteOn(71); }); await W(A, 400);
check('… un accord avec Si ne ferme pas', await pg(A) === 'settings');
await click(A, '#setClose'); await W(A, 300);

// ---- 7. mode PIANO → Réglages → croix ; Échap avec une fenêtre ouverte ne ferme que la fenêtre ----
await mode(A, 'piano'); await W(A, 500);
await click(A, '#setBtn'); await W(A, 300); await click(A, '#setNav [data-v=app]'); await W(A, 200);
if (await click(A, '#credBtn')) { await W(A, 300); await A.keyboard.press('Escape'); await W(A, 300);
  check('Échap avec la fenêtre Crédits ouverte : seule la fenêtre se ferme', await pg(A) === 'settings' && await ev(A, () => document.getElementById('credModal').hidden)); }
await click(A, '#setClose'); await W(A, 400);
check('7. croix : retour au mode PIANO', await pg(A) === 'piano');
if (CAP) { await mode(A, 'learn'); await W(A, 300); }

// ---- 8. tailles : iPad (paysage, portrait), téléphone (barre du haut) ----
for (const v of [{ w: 1024, h: 768 }, { w: 768, h: 1024 }, { w: 1280, h: 800 }, { w: 812, h: 375, m: 1 }, { w: 375, h: 667, m: 1 }]) {
  const p = await open(v.w, v.h, !!v.m); const lbl = v.w + '×' + v.h;
  await mode(p, 'learn'); await W(p, 300); await click(p, v.m ? '#mbSet' : '#setBtn'); await W(p, 400);
  if (v.m) { const r = await ev(p, () => { const x = document.getElementById('mbClose'), bar = document.querySelector('.mbar'); if (!x || !x.offsetParent) return null; const a = x.getBoundingClientRect(), c = bar.getBoundingClientRect();
      return { inBar: a.top >= c.top && a.bottom <= c.bottom, right: innerWidth - a.right, label: x.getAttribute('aria-label'), barW: bar.scrollWidth <= bar.clientWidth + 1 }; });
    check(lbl + ' : croix dans la barre du haut, à droite', r && r.inBar && r.right < 70 && r.label === 'Fermer' && r.barW, r);
    if (!await ev(p, () => !!document.getElementById('mbSet').offsetParent)) { /* invité : le bouton Réglages de la barre est masqué ; on passe par le menu */ }
  } else {
    X = await cross(p, 'setClose'); check(lbl + ' : croix en haut à droite de Réglages', X && X.right < 60 && X.top < 90, X);
    check(lbl + ' : Réglages ne défile pas', await noScroll(p));
  }
  if (CAP && v.w === 1024) await p.screenshot({ path: CAP + '/ipad-1024-reglages.png' });
  if (CAP && v.w === 375) await p.screenshot({ path: CAP + '/iphone-375-reglages.png' });
  await click(p, v.m ? '#mbClose' : '#setClose'); await W(p, 400);
  check(lbl + ' : la croix ramène à LEARN', await pg(p) === 'learn');
  await p.context().close(); }

check('aucune erreur JS', errsAll.length === 0, errsAll);
await b.close();
console.log(fails.length ? 'r56 FAIL ' + fails.length : 'r56 OK'); process.exit(fails.length ? 1 : 0);
