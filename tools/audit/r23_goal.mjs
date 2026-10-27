// Objectif du jour (chantier OBJECTIF, C9 / D21 / D22, 24/10/2026) : « Mon objectif » 5/10/20 min ou 50/100 XP (Réglages › Partie
// et proposé une fois après une partie réussie), anneau autour de l'avatar qui se remplit puis devient doré (fanfare + notification
// une fois par jour), série hebdomadaire (3 jours sur 7), gels de série (1 tous les 7 jours, 2 au maximum, appliqués tout seuls),
// fiche Progression, fusion entre appareils (mergeState), série jamais affichée à « 0 jour ».
// Usage : PORT=8783 NODE_PATH=… PW_CHROMIUM=… node tools/audit/r23_goal.mjs
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = process.env.PORT || '8767', URL = `http://localhost:${PORT}/`;
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d !== undefined && !ok ? ' — ' + JSON.stringify(d) : '')); if (!ok) fails.push(n); };
const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const STATE = { xp: 120, xpDays: {}, streak: { days: 0, last: '' }, srFrom: '9999-12-31', /* ancienne règle (XP = jour compté) : les gels et l'objectif sont testés ici, la série des 10 min dans r53 */ gate: 'guest', onb: { done: 1 }, tourDone: 1, langV2: true, pwShown: 1,
  introSeen: { hub: 1, learn: 1, games: 1, chords: 1, scales: 1, settings: 1, progress: 1, notif: 1 }, stats: {}, mastery: {}, srs: {}, secStats: {},
  acct: { n: 2 }, notifs: { list: [], keys: {}, init: 1, nv2: 1 }, settings: { lang: 'fr', notation: 'fr', input: 'screen', uiSound: true } };

async function open(vp, st = STATE) {
  const c = await b.newContext({ viewport: vp, hasTouch: vp.width < 900 });
  await c.route(u => u.href.startsWith(URL) && (u.pathname === '/' || u.pathname === '/index.html'), async r => { const res = await r.fetch(); let h = await res.text(); const e = h.lastIndexOf('})();\n</script>'); h = h.slice(0, e) + '\nwindow.__X=s=>eval(s);\n' + h.slice(e); await r.fulfill({ response: res, body: h, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) p.errs.push(m.text()); });
  await p.addInitScript(`if(!sessionStorage.getItem('s')){ sessionStorage.setItem('s','1'); localStorage.setItem('memo-gammes-v1', ${JSON.stringify(JSON.stringify(st))}); }`);
  await p.goto(URL); await p.waitForFunction(() => !!window.__X, null, { timeout: 15000 }); await p.waitForTimeout(1200);
  p.X = s => p.evaluate(s => window.__X(s), s); return p;
}
const errs = [];
let p = await open({ width: 1024, height: 768 });
const X = s => p.X(s);
const ring = () => p.evaluate(() => { const a = document.getElementById('lvlAv'); return { on: a.classList.contains('goal-ring'), done: a.classList.contains('done'), gp: +getComputedStyle(a).getPropertyValue('--gp') }; });

// 1) défaut et Réglages
check('objectif par défaut : 10 min, anneau vide autour de #lvlAv', await X('JSON.stringify(goalCfg())') === '{"kind":"min","v":10}' && (await ring()).on && (await ring()).gp === 0, await ring());
await p.click('#setBtn'); await p.waitForTimeout(300); await p.click('#setNav [data-v=game]'); await p.waitForTimeout(150);
check('Réglages › Partie : « Mon objectif du jour » avec 5 choix, 10 min sélectionné', await p.evaluate(() => { const s = document.getElementById('segGoal'); return s.offsetParent !== null && s.querySelectorAll('button').length === 5 && s.querySelector('[aria-pressed=true]').dataset.v === 'min:10'; }));
check('Réglages › Partie : pas de défilement (1024×768)', await p.evaluate(() => { const e = document.getElementById('setPane'); return e.scrollHeight <= e.clientHeight + 1; }));
await p.click('#segGoal [data-v="min:5"]'); await p.waitForTimeout(100);
check('choix 5 min enregistré dans S.goal {kind,v,at}', await p.evaluate(() => { const g = JSON.parse(localStorage.getItem('memo-gammes-v1')).goal; return g && g.kind === 'min' && g.v === 5 && g.at > 0; }));
await X('closeSet()'); await p.waitForTimeout(200);

// 2) l'anneau se remplit avec le temps de jeu, doré à 100 %, une seule fois par jour
await X('S.playSec={[dayStr()]:150}; goalTick()');
check('2 min 30 sur 5 : anneau à moitié, pas doré', (await ring()).gp === 0.5 && !(await ring()).done, await ring());
const osc0 = await X('0'); // (fanfare: sons de l'interface actifs mais AudioContext pas démarré sans geste : pas d'erreur)
await X('S.playSec[dayStr()]=300; goalTick()'); await p.waitForTimeout(100);
check('5 min sur 5 : anneau doré (classe done), aussi sur la barre mobile', (await ring()).done && await p.evaluate(() => document.getElementById('mbAv').classList.contains('done')));
check('objectif atteint noté pour aujourd\'hui (S.goal.done)', await X('S.goal.done===dayStr()'));
check('notification « Objectif du jour atteint ! » (catégorie Progrès)', await X('S.notifs.list.filter(n=>n.type==="goal").length===1 && S.notifs.list.find(n=>n.type==="goal").cat==="progress"'));
await X('S.playSec[dayStr()]=600; goalTick(); goalTick()');
check('une seule fois par jour', await X('S.notifs.list.filter(n=>n.type==="goal").length===1'));
// objectif en XP
await X('S.goal={kind:"xp",v:50,at:Date.now()}; S.xpDays={[dayStr()]:25}; goalRing()');
check('objectif 50 XP : 25 XP = anneau à moitié', (await ring()).gp === 0.5 && !(await ring()).done, await ring());
await X('addXP(30)');
check('objectif 50 XP : addXP(30) = doré', (await ring()).done, await ring());

// 3) série hebdomadaire : 3 jours sur 7 (lundi → dimanche)
const wk = await X(`(()=>{ const m=pDate(wkKey(new Date())); const d=n=>{ const x=new Date(m); x.setDate(x.getDate()+n); return dayStr(x); };
  S.xpDays={[d(-7)]:10,[d(-6)]:10}; const a=streaks(); S.xpDays[d(-8)]=10; const b2=streaks(); S.xpDays={[d(-7)]:10,[d(-5)]:10,[d(-1)]:10}; const c=streaks();
  return JSON.stringify({a:a.wc,b:b2.wc,c:c.wc}); })()`);
check('semaine passée : 2 jours = non validée, 3 jours = validée (1 semaine)', JSON.parse(wk).a === 0 && JSON.parse(wk).c === 1, wk);
check('les jours comptent dans leur semaine (lundi → dimanche)', JSON.parse(wk).b === 0, wk);
const wkNow = await X(`(()=>{ S.xpDays={[dayStr()]:10}; return streaks().wkNow; })()`);
check('semaine en cours : jours joués comptés (wkNow)', wkNow === 1, wkNow);

// 4) gels : gagné tous les 7 jours, 2 au maximum, appliqué tout seul le lendemain d'un jour manqué
await X('S.freeze=undefined; S.streak={days:6,last:addDays(-1)}; bumpStreak()');
check('7e jour de série : 1 gel gagné (+ notification)', await X('S.streak.days===7 && S.freeze.n===1 && S.notifs.list.some(n=>n.type==="freezeWon")'));
await X('S.streak={days:13,last:addDays(-1)}; bumpStreak(); S.streak={days:20,last:addDays(-1)}; bumpStreak()');
check('14e et 21e jour : 2 gels au maximum', await X('S.freeze.n===2'));
await X('S.freeze={n:1,used:[],at:1}; S.streak={days:9,last:addDays(-2)}; S.xpDays={}');
check('avant : un jour manqué, la série envoyée vaudrait 0', await X('effStreak()===0'));
check('gel appliqué tout seul (freezeCheck)', await X('freezeCheck()===true'));
check('après le gel : série gardée (effStreak = 9), gel utilisé hier, 0 restant', await X('effStreak()===9 && S.streak.last===addDays(-1) && S.freeze.used.includes(addDays(-1)) && S.freeze.n===0'));
check('notification « Ta série est protégée »', await X('S.notifs.list.some(n=>n.type==="freeze" && /protégée/.test(n.ti))'));
check('fiche : le jour gelé n\'interrompt pas la série', await X('streaks().cur===9'));
await X('addXP(5)');
check('le lendemain du gel, jouer continue la série (10)', await X('S.streak.days===10 && effStreak()===10'));
await X('S.freeze={n:1,used:[],at:1}; S.streak={days:9,last:addDays(-3)}');
check('2 jours manqués avec 1 seul gel : pas de gel utilisé, nouvelle série', await X('freezeCheck()===false && S.freeze.n===1 && effStreak()===0'));
await X('renderStatus()');
check('menu : jamais « 0 j » (« À toi »)', await p.evaluate(() => document.getElementById('streak').textContent === 'À toi'));

// 5) fiche Progression : objectif, semaine, gels, sans défilement
await X('S.freeze={n:2,used:[],at:1}; S.streak={days:3,last:dayStr()}; S.goal={kind:"min",v:20,at:1}; S.playSec={[dayStr()]:240}; S.xpDays={[dayStr()]:10}'); // 20 min : avec 10 min, la ligne de l'objectif se fond dans celle de la série (r53)
await p.click('#lvlAv'); await p.waitForTimeout(500);
const pf = await p.evaluate(() => { const g = document.getElementById('pfGoal'), pane = document.getElementById('progPane'); return { txt: g.textContent, vis: g.offsetParent !== null, scroll: pane.scrollHeight - pane.clientHeight, day: document.getElementById('pfDay').textContent }; });
check('fiche : ligne objectif « 4 / 20 min », semaine, 2 gels', pf.vis && /4 \/ 20 min/.test(pf.txt) && /Semaine : 1\/7/.test(pf.txt) && /2 gels/.test(pf.txt), pf);
check('fiche : pas de défilement ajouté (1024×768)', pf.scroll <= 1, pf);
await X('S.streak={days:5,last:addDays(-4)}; S.xpDays={}; renderFiche()');
check('fiche : série cassée = « Nouvelle série : joue aujourd\'hui », jamais 0', await p.evaluate(() => document.getElementById('pfDay').textContent === "Nouvelle série : joue aujourd'hui"));
await X('closeSet()'); await p.waitForTimeout(200);

// 6) proposé une fois après une partie réussie
await X('S.goal=undefined; save(); GL.offer=true; endOpen=true; closeEnd()'); await p.waitForTimeout(600);
check('fin de partie réussie : la fenêtre « Ton objectif du jour » s\'ouvre, 10 min présélectionné', await p.evaluate(() => !document.getElementById('goalModal').hidden && document.querySelectorAll('#glOpts .gl-opt').length === 5 && document.querySelector('#glOpts [aria-pressed=true]').dataset.v === 'min:10'));
check('Finitions : après une partie, l\'en-tête reste « Bravo pour cette partie »', await p.evaluate(() => document.querySelector('#goalModal .gl-k').textContent) === 'Bravo pour cette partie');
await p.click('#glOpts [data-v="min:20"]'); await p.click('#glOk'); await p.waitForTimeout(200);
check('« C\'est noté » : 20 min enregistré, fenêtre fermée', await X('S.goal.kind==="min" && S.goal.v===20 && S.goal.asked===1') && await p.evaluate(() => document.getElementById('goalModal').hidden));
check('la partie suivante ne la repropose pas', await X('(()=>{ GL.offer=false; return !!(S.goal&&S.goal.asked); })()'));

// 7) fusion entre appareils
const mg = await X(`JSON.stringify((()=>{ const base={xp:0,streak:{days:0,last:""},settings:{}};
  const L={...base, goal:{kind:"min",v:5,at:100,done:"2026-10-20"}, freeze:{n:2,used:["2026-10-01"],at:100}};
  const C={...base, goal:{kind:"xp",v:100,at:200,done:"2026-10-22"}, freeze:{n:0,used:["2026-10-10"],at:200}};
  const m=mergeState(L,C).merged, o=mergeState(base,{...base}).merged, k=mergeState(base,C).merged;
  return {g:m.goal, f:m.freeze, old:("goal" in o)||("freeze" in o), cloudOnly:k.goal&&k.goal.v===100&&k.freeze.n===0}; })())`);
const M = JSON.parse(mg);
check('fusion : réglage le plus récent, jour atteint le plus récent', M.g.kind === 'xp' && M.g.v === 100 && M.g.done === '2026-10-22', M);
check('fusion : nombre de gels le plus récent, jours gelés réunis', M.f.n === 0 && M.f.used.join() === '2026-10-01,2026-10-10', M);
check('fusion : état ancien sans les clés = rien d\'ajouté ; clés du cloud reprises', !M.old && M.cloudOnly, M);
errs.push(...p.errs); await p.context().close();

// 8) téléphone : anneau autour de l'avatar de la barre du haut, fenêtre sans débordement
p = await open({ width: 375, height: 667 });
check('375 (compte connecté : avatar dans la barre du haut) : anneau sur l\'avatar', await p.evaluate(() => { document.body.classList.remove('guest'); const a = document.getElementById('mbAv'); return a.classList.contains('goal-ring') && a.offsetParent !== null; }));
await p.X('goalOpen()'); await p.waitForTimeout(300);
check('375 : fenêtre objectif entière à l\'écran', await p.evaluate(() => { const c = document.querySelector('#goalModal .modal-card').getBoundingClientRect(); const bd = document.querySelector('#goalModal .gl-body'); return c.top >= 0 && c.bottom <= innerHeight + 1 && c.right <= innerWidth + 1 && bd.scrollHeight <= bd.clientHeight + 1; }));
errs.push(...p.errs); await p.context().close();
p = await open({ width: 812, height: 375 });
await p.X('goalOpen()'); await p.waitForTimeout(300);
check('812×375 : fenêtre objectif sans défilement', await p.evaluate(() => { const bd = document.querySelector('#goalModal .gl-body'); const c = document.querySelector('#goalModal .modal-card').getBoundingClientRect(); return bd.scrollHeight <= bd.clientHeight + 1 && c.bottom <= innerHeight + 1; }));
errs.push(...p.errs); await p.context().close();

check('aucune erreur JS', errs.length === 0, errs);
await b.close();
if (fails.length) { console.log('\nECHEC r23 :', fails); process.exit(1); }
console.log('\nr23 OK');
