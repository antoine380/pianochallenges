// Audit fixes (Oct 2026): quiz solo + bot waits for the human, Settings during a quiz keeps it, a shared #quiz link does not open the
// questionnaire, switching language adds no notification, Apple sign-in says "soon" instead of leaving the app, the tour opens the menu on phones.
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = process.env.PORT || '8767', URL = `http://localhost:${PORT}/`;
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d ? ' — ' + JSON.stringify(d) : '')); if (!ok) fails.push(n); };
const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const seed = (extra = {}) => `(()=>{ try{ if(sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded','1');
  localStorage.setItem('memo-gammes-v1', JSON.stringify(Object.assign({settings:{lang:'fr',notation:'fr',input:'screen',earV2:true,diffV2:true,midiV2:true,uiSound:false,
    quiz:{n:1,bots:1,botLvl:1,where:'local',diff:1,ans:'notes',count:5,time:20,theme:'all',keys:true}}, gate:'guest', onb:{done:1}, tourDone:1, langV2:true,
    introSeen:{chords:1,scales:1,harmony:1,prog:1,ear:1,games:1,daily:1,section:1},seenTypes:[],stats:{},secStats:{},xp:0,xpDays:{},streak:{days:0}}, ${JSON.stringify(extra)}))); }catch(e){} })();`;
async function open(vp, init, url = URL) { const c = await b.newContext({ viewport: vp }); const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); if (init) await p.addInitScript(init); await p.goto(url); await p.waitForTimeout(900); return p; }
const ev = (p, f, a) => p.evaluate(f, a);

// 1) quiz, 1 player + 1 bot: the bot's answer does not end the question
let p = await open({ width: 1024, height: 768 }, seed());
await ev(p, () => document.querySelector('#modeNav [data-mode=quiz]').click());
for (let i = 0; i < 30 && !(await ev(p, () => !!window.QUIZ_DATA)); i++) await p.waitForTimeout(100);
await p.waitForTimeout(200); await ev(p, () => document.getElementById('qzGo').click()); await p.waitForTimeout(4500);
check('quiz solo + bot : la question attend le joueur', await ev(p, () => document.getElementById('qzNext').hidden));
// 2) Settings during the quiz, then back: the question is still there
await ev(p, () => document.getElementById('setBtn').click()); await p.waitForTimeout(300);
check('Réglages par-dessus le quiz : le quiz est masqué', await ev(p, () => document.body.dataset.page === 'settings' && getComputedStyle(document.getElementById('quizPanel')).display === 'none'));
await ev(p, () => document.querySelector('#modeNav [data-mode=quiz]').click()); await p.waitForTimeout(300);
check('retour au quiz : la partie continue', await ev(p, () => !document.getElementById('qzPlay').hidden));
// 3) switching the language adds no notification
const before = await ev(p, () => JSON.parse(localStorage.getItem('memo-gammes-v1')).notifs.list.length);
await ev(p, () => document.querySelector('#langSeg [data-v=en]').click()); await p.waitForTimeout(200); await ev(p, () => document.querySelector('#langSeg [data-v=fr]').click()); await p.waitForTimeout(200);
await p.reload(); await p.waitForTimeout(2200);
check('changer de langue : pas de nouvelles notifications', await ev(p, () => JSON.parse(localStorage.getItem('memo-gammes-v1')).notifs.list.length) === before);
check('aucune erreur JS (quiz)', !p.errs.length, p.errs); await p.context().close();

// 4) a shared quiz link on a first visit: no sign-in screen and no questionnaire over the room
p = await open({ width: 1024, height: 768 }, null, URL + '#quiz-ABCDE'); await p.waitForTimeout(1200);
check('lien #quiz- : ni écran de connexion ni questionnaire', await ev(p, () => document.body.dataset.page === 'quiz' && !document.querySelector('#onb:not([hidden])') && !document.querySelector('#gate:not([hidden])')));
await p.context().close();

// 5) the sign-in screen: Apple says "soon" (provider not turned on) and stays in the app
p = await open({ width: 1280, height: 800 }); await p.waitForTimeout(800);
await ev(p, () => document.getElementById('fnLogin')?.click()); await p.waitForTimeout(300); // first screen -> sign in
await ev(p, () => document.querySelector('.gt-apple').disabled = false); await ev(p, () => document.querySelector('.gt-apple').click()); await p.waitForTimeout(1500);
check('Apple : message « bientôt » et on reste dans l’app', await ev(p, () => location.origin === 'http://localhost:' + location.port && /bientôt|soon/.test(document.getElementById("gtMsg").textContent)), await ev(p, () => document.getElementById('gtMsg').textContent));
await p.context().close();

// 6) the tour opens the menu on a phone in landscape
p = await open({ width: 812, height: 375 }, seed({ tourDone: 0 })); await p.waitForTimeout(1200);
const tr = await ev(p, () => { const h = document.getElementById('tourHole').getBoundingClientRect(); return [document.body.classList.contains('drawer'), Math.round(h.top), Math.round(h.bottom), innerHeight, document.getElementById('tourH').textContent]; });
check('tutoriel en paysage : le menu s’ouvre et la bulle est à l’écran', tr[0] && tr[2] <= tr[3] + 2 && tr[1] >= -2, tr);
await p.context().close();
await b.close();
if (fails.length) { console.log('\nECHEC r13 :', fails); process.exit(1); }
console.log('\nr13 OK');
