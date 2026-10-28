// Premiers pas, lot 4 (24/10/2026) : D5 test de placement, D23 « Garde tes progrès » (faux Supabase), D24 rappel de la prochaine leçon
// (notification « Rappels », heure dans Réglages › Notifications), D25 bilan de la semaine, D28 préparer le micro (flux d'oscillateur),
// critères CA-19 à CA-23 de parcours-debutant.md (vocabulaire, D21 puis D23 une seule fois, objectif atteint = pas de rappel,
// série jamais à « 0 jour », fusion). Le SQL du rappel e-mail se teste à part : bash tools/audit/sql/run.sh
// Usage : PORT=8834 NODE_PATH=… PW_CHROMIUM=… node tools/audit/r33_lot4.mjs
import { createRequire } from 'module';
import { FAKE_SDK } from './fakesb.mjs';
import { INIT } from './lib.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = process.env.PORT || '8767', URL = `http://localhost:${PORT}/`, SHOTS = process.env.SHOTS || '';
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d !== undefined && !ok ? ' — ' + JSON.stringify(d) : '')); if (!ok) fails.push(n); };
const b = await chromium.launch({ ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream'] });
const BASE = { xp: 120, xpDays: {}, streak: { days: 0, last: '' }, gate: 'guest', onb: { done: 1, level: 'debut' }, tourDone: 1, langV2: true, pwShown: 1,
  introSeen: { hub: 1, learn: 1, games: 1, chords: 1, scales: 1, harmony: 1, prog: 1, ear: 1, daily: 1, settings: 1, progress: 1, notif: 1 }, stats: {}, mastery: {}, srs: {}, secStats: {},
  hints: { seen: { resume: 1, map: 1, inp: 1, star: 1, fing: 1, labels: 1 }, off: true }, wkRev: { last: '2099-01-01' },
  notifs: { list: [], keys: {}, init: 1, nv2: 1 }, settings: { lang: 'fr', notation: 'fr', input: 'screen', uiSound: false } };
const errs = [];
async function open(vp, st, o = {}) {
  const c = await b.newContext({ viewport: vp, hasTouch: vp.width < 900, locale: 'fr-FR', colorScheme: o.dark ? 'dark' : 'light' });
  await c.route(u => u.href.startsWith(URL) && (u.pathname === '/' || u.pathname === '/index.html'), async r => { const res = await r.fetch(); let h = await res.text(); const e = h.lastIndexOf('})();\n</script>'); h = h.slice(0, e) + '\nwindow.__X=s=>eval(s);\n' + h.slice(e); await r.fulfill({ response: res, body: h, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await c.route('**/assets/js/supabase-*.js', r => r.fulfill({ status: 200, body: FAKE_SDK, headers: { 'content-type': 'application/javascript' } }));
  if (o.gum) { await c.addInitScript(`window.__midiMode=${JSON.stringify(o.midi || 'ok')}; window.__gumMode=${JSON.stringify(o.gum)};`); await c.addInitScript(INIT.replace('${MODE}', o.midi || 'ok')); }
  if (o.fake) await c.addInitScript(`window.__FAKE=${JSON.stringify(o.fake)};`);
  const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) p.errs.push(m.text()); });
  if (st) await p.addInitScript(`if(!sessionStorage.getItem('s')){ sessionStorage.setItem('s','1'); localStorage.setItem('memo-gammes-v1', ${JSON.stringify(JSON.stringify(st))}); }`);
  await p.goto(URL); await p.waitForFunction(() => !!window.__X, null, { timeout: 15000 }); await p.waitForTimeout(1300);
  p.X = s => p.evaluate(s => window.__X(s), s); return p;
}
const done = async p => { errs.push(...p.errs); await p.context().close(); };
const vis = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (!e || e.closest('[hidden]')) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; }, sel);
const noScroll = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (!e) return 'absent'; const els = [e, ...e.querySelectorAll('*')]; return els.every(x => x.scrollHeight <= x.clientHeight + 2 || getComputedStyle(x).overflowY === 'visible' || x.clientHeight === 0) && document.scrollingElement.scrollHeight <= innerHeight + 2; }, sel);
const shot = async (p, n) => { if (SHOTS) await p.screenshot({ path: `${SHOTS}/${n}.png` }); };
const T = (p, ms) => p.waitForTimeout(ms);

// ---------- CA-19 (vocabulaire) et CA-18 étendu (clés dans les deux langues) ----------
let p = await open({ width: 1024, height: 768 }, BASE);
const voc = await p.X(`(()=>{ const bad=/\\b(perdu|raté|échec|dommage)\\b|tu n'as pas joué/i, out=[], miss=[]; const flat=v=>{ try{ if(typeof v==="function"){ const r=v(["Do","Ré","Mi","Fa","Sol","La","Si","Do","Ré","Mi","Fa","Sol"],3); return flat(r); } if(Array.isArray(v)) return v.map(flat).join(" "); if(v&&typeof v==="object") return Object.values(v).map(flat).join(" "); return String(v); }catch(e){ return ""; } };
  Object.keys(TXT.fr).filter(k=>/^(pp|pl|acc|rem|wk|mp|goal|streak|lbl)/.test(k)).forEach(k=>{ if(bad.test(flat(TXT.fr[k]))) out.push(k); if(!(k in TXT.en)) miss.push(k); });
  Object.keys(TXT.en).filter(k=>/^(pl|acc|rem|wk|mp)[A-Z]/.test(k)).forEach(k=>{ if(!(k in TXT.fr)) miss.push("en:"+k); }); return JSON.stringify({out,miss}); })()`);
check('CA-19 aucun texte des Premiers pas (pp, pl, acc, rem, wk, mp, goal, streak) ne dit « perdu », « raté », « échec », « dommage »', JSON.parse(voc).out.length === 0, voc);
check('CA-18 chaque clé du lot 4 existe en FR et en EN', JSON.parse(voc).miss.length === 0, voc);

// ---------- CA-22 série cassée : jamais « 0 jour » ----------
await p.X('S.streak={days:6,last:addDays(-4)}; S.xpDays={[addDays(-4)]:20}; renderStatus()');
const sk = await p.evaluate(() => document.getElementById('streak').textContent);
check('CA-22 série cassée : le menu n\'affiche pas « 0 jour »', !/^\s*0/.test(sk) && !/0 j/.test(sk), sk);
await p.click('#lvlAv'); await T(p, 400);
check('CA-22 fiche Progression : « Nouvelle série : joue aujourd\'hui »', await p.evaluate(() => document.getElementById('pfDay').textContent) === await p.X('t("streakNew")'));
await p.X('closeSet()'); await T(p, 200);

// ---------- CA-23 fusion ----------
const mg = await p.X(`(()=>{ const a={pp:{v:1,cur:"p04",done:{p01:{at:1,stars:3},p02:{at:1,stars:3},p03:{at:5,stars:2}}}, acct:{n:1,at:5}, ppRem:{n:2,last:"2026-10-20"}, wkRev:{last:"2026-10-12"}},
  c={pp:{v:1,cur:"p06",done:{p01:{at:1,stars:2},p02:{at:1,stars:1},p03:{at:3,stars:3},p04:{at:4,stars:1},p05:{at:4,stars:2}}}, acct:{n:2,at:3}, ppRem:{n:1,last:"2026-10-22"}, wkRev:{last:"2026-10-19"}};
  const m=mergeState(a,c).merged; return JSON.stringify({s3:m.pp.done.p03.stars, s1:m.pp.done.p01.stars, n:Object.keys(m.pp.done).length, cur:m.pp.cur, acct:m.acct.n, rem:m.ppRem.last, wk:m.wkRev.last}); })()`);
const M = JSON.parse(mg);
check('CA-23 fusion : done.p03 à 2 et 3 étoiles = 3 étoiles, leçons réunies', M.s3 === 3 && M.s1 === 3 && M.n === 5, mg);
check('CA-23 fusion : cur = la leçon la plus avancée (p06)', M.cur === 'p06', mg);
check('fusion lot 4 : compte proposé (max), rappels (le plus récent), bilan (dernière semaine vue)', M.acct === 2 && M.rem === '2026-10-22' && M.wk === '2026-10-19', mg);
await done(p);

// ---------- D5 · test de placement depuis le premier lancement ----------
p = await open({ width: 1024, height: 768 }, null);
check('premier lancement : D2 affiché', await vis(p, '#gate .fn-hwc'));
await p.click('#gate .fn-hwc[data-v=screen]'); await T(p, 300);
await p.locator('#fnKb [data-m="60"]').dispatchEvent('pointerdown'); await T(p, 1200);
check('un Do → D4 (niveau)', await vis(p, '.fn-lv4 [data-v=notes]'));
await p.click('.fn-lv4 [data-v=notes]'); await T(p, 400);
await p.click('#fnSkip'); await T(p, 200); await p.click('#oqGo'); await T(p, 600); // chantier Onboarding : questions passées
check('« Je connais quelques notes » → test de placement (pas les 3 accords)', await p.X('page==="pp" && PP.view==="place" && PL.st==="intro" && !game'), await p.X('page+" "+PP.view'));
check('placement : « Montre-moi ce que tu sais », 7 petites questions, bouton « C\'est parti »', await vis(p, '#plGo') && /Montre-moi ce que tu sais/.test(await p.evaluate(() => document.getElementById('ppPanel').textContent)) && /7 petites questions/.test(await p.evaluate(() => document.getElementById('ppPanel').textContent)));
await shot(p, 'd5_intro_1024');
await p.click('#plGo'); await T(p, 500);
check('question 1 : « Joue un Fa », anneau de 8 s, « Je ne sais pas » visible', /Joue un Fa/.test(await p.evaluate(() => document.getElementById('plSay').textContent)) && await vis(p, '#plRing') && await vis(p, '#plDunno'));
await shot(p, 'd5_q1_1024');
const key = async m => { await p.X(`ppIn([${m}],false)`); await T(p, 90); };
await key(65); await T(p, 1100); await key(71); await T(p, 1100);
for (const m of [60, 62, 64]) await key(m);
check('gamme en cours : « Do, Ré, Mi ✓ … continue »', /Do, Ré, Mi ✓/.test(await p.evaluate(() => document.getElementById('plSub').textContent)), await p.evaluate(() => document.getElementById('plSub').textContent));
await shot(p, 'd5_seq_1024');
for (const m of [65, 67]) await key(m); await T(p, 1100);
await key(60); await T(p, 1100);
await p.X('ppIn([60,64,67],true)'); await T(p, 1100);
check('question 6 : un rythme (4 clics puis 4 Do)', await p.X('PL.i===5 && PL_Q[5].k==="beat"') && await vis(p, '#plBeat'));
await shot(p, 'd5_beat_1024');
// les 4 temps à jouer : une note à l'heure de chacun
await p.X(`PL.beats.slice(4).forEach(b=>setTimeout(()=>ppIn([60],true), Math.max(0,b-performance.now()+35)))`);
await T(p, 7600);
check('rythme réussi → question 7 (Sol majeur)', await p.X('PL.i===6'), await p.X('JSON.stringify({i:PL.i,st:PL.st,to:PL.to})'));
await p.X('ppIn([67],false)'); await T(p, 300); await p.X('ppIn([71],false)'); await T(p, 300); await p.X('ppIn([74],false)'); await T(p, 1100);
check('tout juste → « Tu connais les bases ! » (étape 2 de Ma route)', await p.X('PL.st==="res" && PL.to==="s2" && PL.ok===7') && /Tu connais les bases/.test(await p.evaluate(() => document.getElementById('ppPanel').textContent)));
check('placement s2 : les 14 leçons « acquises » (sans étoiles), étape 1 de Ma route faite, frise affichée', await p.X('PP_IDS.every(id=>S.pp.done[id].place && !S.pp.done[id].stars) && RT_STAGES[0].every(x=>S.route.done[x.id]) && rtShown() && rtCurStage()===1 && S.onb.place==="s2"'));
await shot(p, 'd5_all_1024');
await p.click('#plMain'); await T(p, 500);
check('« Aller aux accords » → LEARN', await p.X('page==="learn"'));
await done(p);

// placement : erreur au Do central → P02 ; « Je ne sais pas » → P04 ; « Reprendre depuis le début »
p = await open({ width: 1024, height: 768 }, { ...BASE, onb: { done: 1, level: 'notes' } });
await p.X('plOpen()'); await T(p, 300); await p.click('#plGo'); await T(p, 500);
await key(65); await T(p, 1100); await key(71); await T(p, 1100); for (const m of [60, 62, 64, 65, 67]) await key(m); await T(p, 1100);
await key(72); await T(p, 600);
check('erreur au Do central → « Tu commences à la leçon 2 »', await p.X('PL.to==="p02" && PL.ok===3') && /leçon 2/.test(await p.evaluate(() => document.querySelector('.pl-rc h2').textContent)));
check('P01 marquée « acquise » (pastille grise, « Acquise »), reprise sur P02', await p.X('S.pp.done.p01.place===1 && !S.pp.done.p02 && ppFirstOpen(S.pp)==="p02" && S.resume.id==="p02"') && await p.evaluate(() => { const d = document.querySelector('.pl-map .pp-dot[data-id=p01]'); return d.classList.contains('acq') && /Acquise/.test(d.textContent); }));
await shot(p, 'd5_res_1024');
await p.click('#plMain'); await T(p, 400);
check('« Commencer ici » ouvre la leçon 2', await p.X('page==="pp" && PP.view==="open" && PP.open.id==="p02"'));
await p.X('plOpen()'); await T(p, 300); await p.click('#plGo'); await T(p, 400); await p.click('#plDunno'); await T(p, 400);
check('« Je ne sais pas » dès la 1re question → leçon 4 (jamais d\'échec : on place)', await p.X('PL.to==="p04" && ["p01","p02","p03"].every(id=>S.pp.done[id])'));
await p.click('#plRestart'); await T(p, 500);
check('« Reprendre depuis le début » : plus de leçon acquise, présentation des Premiers pas (leçon 1)', await p.X('!Object.keys(S.pp.done).length && !S.pp.place && page==="pp" && PP.view==="path" && ppFirstOpen(S.pp)==="p01"'));
// le temps écoulé place aussi
await p.X('plOpen()'); await T(p, 300); await p.click('#plGo'); await T(p, 8700);
check('8 s sans réponse → placé (P04)', await p.X('PL.st==="res" && PL.to==="p04"'));
await p.X('plUndo()');
// Réglages : « Test de placement »
await p.click('#setBtn'); await T(p, 300); await p.click('#setNav [data-v=app]').catch(() => {}); await T(p, 200);
check('Réglages : bouton « Test de placement »', await p.evaluate(() => (document.getElementById('plSetBtn') || {}).textContent) === 'Test de placement');
await p.evaluate(() => document.getElementById('plSetBtn').click()); await T(p, 400);
check('il ouvre le test', await p.X('page==="pp" && PP.view==="place" && PL.st==="intro"'));
await done(p);
// pas de défilement sur téléphone (question et résultat)
for (const vp of [{ width: 375, height: 667 }, { width: 812, height: 375 }, { width: 768, height: 1024 }]) {
  p = await open(vp, { ...BASE, onb: { done: 1, level: 'notes' } });
  await p.X('plOpen()'); await T(p, 300); await p.click('#plGo'); await T(p, 400);
  await p.X('PL.i=4; plAsk()'); await T(p, 300);
  const q = await noScroll(p, '#ppPanel'); await shot(p, `d5_q_${vp.width}x${vp.height}`);
  await p.X('plDoubt(null)'); await T(p, 300);
  const r = await noScroll(p, '#ppPanel'); await shot(p, `d5_res_${vp.width}x${vp.height}`);
  check(`placement sans défilement ${vp.width}×${vp.height} (question, résultat)`, q === true && r === true, { q, r });
  await done(p);
}

// ---------- D23 · Garde tes progrès (CA-20) ----------
p = await open({ width: 1024, height: 768 }, { ...BASE, pp: { v: 1, on: true, start: Date.now(), done: { p01: { at: 1, stars: 3 }, p02: { at: 1, stars: 3 } } } }, { fake: {} });
const finish = async id => { await p.X(`ppStart("${id}",0,0)`); await T(p, 200); await p.X('ppFinish()'); await T(p, 1700); };
await finish('p03');
check('CA-20 fin de P03 (1re fois) : D21 « Combien de temps par jour ? » d\'abord', await vis(p, '#goalModal') && !await vis(p, '#accModal'));
check('Finitions : après une leçon, en-tête « Bravo pour cette leçon »', await p.evaluate(() => document.querySelector('#goalModal .gl-k').textContent) === 'Bravo pour cette leçon', await p.evaluate(() => document.querySelector('#goalModal .gl-k').textContent));
await p.click('#goalModal .linkbtn[data-close=goalModal]').catch(async () => { await p.X('closeMod("goalModal")'); }); await T(p, 900);
check('CA-20 puis D23 « Garde tes progrès »', await vis(p, '#accModal') && await p.evaluate(() => document.getElementById('accT').textContent) === 'Garde tes progrès');
check('D23 : 3 leçons, étoiles, série ; Google, code par e-mail, « Gratuit. Pas de carte bancaire. », « Plus tard »', await p.evaluate(() => { const m = document.getElementById('accModal'); return /3 leçons/.test(m.textContent) && /étoiles/.test(m.textContent) && /Continuer avec Google/.test(m.textContent) && /Recevoir un code par e-mail/.test(m.textContent) && /Gratuit\. Pas de carte bancaire\./.test(m.textContent) && /Plus tard/.test(m.textContent); }));
check('D23 : aucun reproche (ni « perdu », ni « tu dois »)', !/perdu|tu dois|sinon/i.test(await p.evaluate(() => document.getElementById('accModal').textContent)));
await shot(p, 'd23_1024');
await p.click('#accLater'); await T(p, 300);
check('« Plus tard » : fermé, compté une fois (S.acct.n = 1)', !await vis(p, '#accModal') && await p.X('S.acct.n===1'));
await finish('p03');
check('CA-20 P03 refaite : ni D21 ni D23', !await vis(p, '#goalModal') && !await vis(p, '#accModal'));
for (const id of ['p04', 'p05', 'p06', 'p07']) await finish(id);
check('CA-20 refusé : pas reproposé avant P08 (P04 à P07)', !await vis(p, '#accModal') && await p.X('S.acct.n===1'));
await p.X('openPage("hub")'); await finish('p08'); await p.X('PP.view="bravo"; ppRender()'); await T(p, 2200);
check('après P08 : reproposé une seule fois', await vis(p, '#accModal') && await p.X('S.acct.n===2'));
await p.click('#accM'); await T(p, 600);
check('« Recevoir un code par e-mail » ouvre l\'inscription (authOpen("signup"), étape e-mail, code)', await p.X('GATE.mode==="signup" && GATE.step==="email" && GATE.otp===true') && await vis(p, '#gate'));
await p.X('gateClose()'); await T(p, 300);
await p.X('ppStart("p09",0,0)'); await T(p, 200); await p.X('ppFinish()'); await T(p, 1700);
check('ensuite : plus jamais (seulement dans Profil)', !await vis(p, '#accModal'));
await done(p);
// premier objectif atteint, jamais pendant une partie ; compte connecté : rien
p = await open({ width: 1024, height: 768 }, { ...BASE, goal: { kind: 'min', v: 5, at: 1, asked: 1 } }, { fake: {} });
await p.X('openPage("games"); gameOpen("speed",true)'); await T(p, 400); await p.X('DU.view="solo"; duRender()').catch(() => {});
await p.X('ACCT.pend=null; window.__busy=true; actNow=()=>({k:"game"})'); // une partie en cours
await p.X('S.playSec={[dayStr()]:300}; goalTick()'); await T(p, 1800);
check('premier objectif atteint pendant une partie : D23 attend', !await vis(p, '#accModal') && await p.X('ACCT.pend==="goal"'));
await p.X('actNow=()=>null; openPage("hub")'); await T(p, 2600);
check('… et s\'affiche une fois la partie finie', await vis(p, '#accModal'));
await done(p);
p = await open({ width: 1024, height: 768 }, { ...BASE, gate: 'account', pp: { v: 1, on: true, start: 1, done: { p01: { at: 1, stars: 3 }, p02: { at: 1, stars: 3 } } } }, { fake: { user: { id: 'u-1', email: 'a@b.c', user_metadata: {} } } });
await p.X('ensureCloud()'); await T(p, 1500);
await p.X('S.goal={kind:"min",v:10,at:1,asked:1}'); await finish('p03');
check('compte connecté : D23 sauté', await p.X('!!user') && !await vis(p, '#accModal'), await p.X('String(!!user)'));
await done(p);

// ---------- D24 · rappel de la prochaine leçon (dans l'app) + CA-21 ----------
const RST = { ...BASE, goal: { kind: 'min', v: 5, at: 1, asked: 1 }, pp: { v: 1, on: true, start: 1, done: { p01: { at: 1, stars: 3 }, p02: { at: 1, stars: 3 }, p03: { at: 1, stars: 2 } } } };
p = await open({ width: 1024, height: 768 }, RST);
const at = h => `(()=>{ const d=new Date(); d.setHours(${h},10,0,0); return d; })()`;
await p.X('S.xpDays={[addDays(-1)]:40}; S.playSec={[addDays(-1)]:400}; S.ppRem=undefined');
check('avant l\'heure (10 h) : pas de rappel', await p.X(`remCheck(${at(10)})`) === false);
check('à partir de 21 h : jamais', await p.X(`remCheck(${at(21)})`) === false);
check('18 h (défaut) : rappel créé', await p.X(`remCheck(${at(18)})`) === true);
const rn = JSON.parse(await p.X('JSON.stringify(S.notifs.list.find(n=>n.id==="ppr-"+dayStr())||null)'));
check('D24 : « Ta leçon 4 t\'attend » · « Fa, Sol, La, Si · 3 min », catégorie Rappels', rn && rn.cat === 'remind' && rn.ti === 'Ta leçon 4 t\'attend' && /^Fa, Sol, La, Si · \d min$/.test(rn.tx), rn);
check('une seule fois par jour', await p.X(`remCheck(${at(19)})`) === false && await p.X('S.notifs.list.filter(n=>n.type==="path").length===1'));
await p.click('#ntfBtn'); await T(p, 400); await shot(p, 'd24_notifs_1024');
// le bouton du rappel lui-même : l'entraînement du jour (ntfCheck à ~1,5 s du démarrage) peut arriver après lui et passer en tête de liste
await p.locator('#ntfList .ntf-it', { hasText: 'Ta leçon 4 t\'attend' }).locator('.ntf-go').click(); await T(p, 500);
check('« Jouer » ouvre la prochaine leçon (P04)', await p.X('page==="pp" && PP.view==="open" && PP.open.id==="p04"'));
// 3 rappels sans retour, puis « Ta place est gardée » à J14
await p.X('S.xpDays={[addDays(-3)]:40}; S.ppRem={n:3,last:addDays(-1)}');
check('3 rappels sans retour : plus de rappel', await p.X(`remCheck(${at(18)})`) === false);
await p.X('S.xpDays={[addDays(-14)]:40}; S.ppRem={n:3,last:addDays(-10)}');
check('14 jours après la dernière séance : « Ta place est gardée » (une fois)', await p.X(`remCheck(${at(18)})`) === true && await p.X('S.notifs.list.some(n=>n.ti==="Ta place est gardée")') && await p.X(`remCheck(${at(18)})`) === false);
// rotation : 2e rappel sans retour
await p.X('S.xpDays={[addDays(-3)]:40}; S.ppRem={n:1,last:addDays(-1)}; delete S.notifs.keys["ppr-"+dayStr()]; S.notifs.list=S.notifs.list.filter(n=>n.id!=="ppr-"+dayStr())');
await p.X(`remCheck(${at(18)})`);
check('textes en rotation : 2e rappel « 2 minutes pour ta leçon 4 ? »', await p.X('(S.notifs.list.find(n=>n.id==="ppr-"+dayStr())||{}).ti') === '2 minutes pour ta leçon 4 ?');
// CA-21 objectif atteint : anneau doré, aucun rappel ce jour-là
await p.X('delete S.notifs.keys["ppr-"+dayStr()]; S.notifs.list=S.notifs.list.filter(n=>n.type!=="path"); S.ppRem=undefined; S.xpDays={[addDays(-1)]:40}; S.playSec={[dayStr()]:300}; goalTick()'); await T(p, 300);
check('CA-21 objectif 5 min atteint : anneau .done', await p.evaluate(() => document.getElementById('lvlAv').classList.contains('done')));
check('CA-21 … et aucun rappel créé ce jour-là', await p.X(`remCheck(${at(19)})`) === false && await p.X('!S.notifs.list.some(n=>n.type==="path")'));
// Réglages › Notifications : heure du rappel
await p.X('openPage("hub")'); await p.click('#setBtn'); await T(p, 300); await p.click('#setNav [data-v=ntf]'); await T(p, 200);
check('Réglages › Notifications : « Heure du rappel », 18:00 par défaut', await vis(p, '#remHour') && await p.evaluate(() => document.getElementById('remHour').value) === '18');
await p.selectOption('#remHour', '20'); await T(p, 100);
check('heure choisie (20 h) enregistrée', await p.X('S.settings.remindH===20 && remHour()===20'));
check('Réglages › Notifications sans défilement de page (1024×768)', await p.evaluate(() => document.scrollingElement.scrollHeight <= innerHeight + 2));
await shot(p, 'd24_settings_1024');
await done(p);

// ---------- D25 · bilan de la semaine ----------
const wkState = days => { const now = new Date(); const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate()); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7) - 7);
  const ds = n => { const d = new Date(mon); d.setDate(mon.getDate() + n); const z = new Date(d.getTime() - d.getTimezoneOffset() * 6e4); return z.toISOString().slice(0, 10); };
  const xd = {}, ps = {}; days.forEach(([i, min]) => { xd[ds(i)] = 30; ps[ds(i)] = min * 60; });
  const t0 = mon.getTime() + 864e5 * 2;
  return { ...BASE, wkRev: undefined, xpDays: xd, playSec: ps, goal: { kind: 'min', v: 5, at: 1, asked: 1 }, pp: { v: 1, on: true, start: 1, done: { p01: { at: t0, stars: 3 }, p02: { at: t0, stars: 3 }, p03: { at: t0 + 864e5, stars: 2 } } }, _mon: ds(0) }; };
const W5 = wkState([[0, 12], [1, 8], [3, 6], [4, 4], [6, 9]]);
for (const [vp, dark] of [[{ width: 1024, height: 768 }, false], [{ width: 375, height: 667 }, false], [{ width: 812, height: 375 }, true], [{ width: 768, height: 1024 }, true]]) {
  p = await open(vp, W5, { dark }); await T(p, 2400);
  const ok = await vis(p, '#wkModal'); await shot(p, `d25_${vp.width}x${vp.height}${dark ? '_dark' : ''}`);
  if (vp.width === 1024) {
    check('D25 : la semaine passée s\'ouvre une fois à l\'accueil', ok);
    const tx = await p.evaluate(() => document.getElementById('wkModal').textContent);
    check('D25 : « Ta semaine », 5/7 jours, 39 min, 3 leçons, 3 notes apprises, semaine validée', /Ta semaine/.test(tx) && /5\/7/.test(tx) && /39 min/.test(tx) && /3leçons/.test(tx.replace(/\s/g, '')) && /3notesapprises/.test(tx.replace(/\s/g, '')) && /Semaine validée/.test(tx), tx.slice(0, 300));
    check('D25 : calendrier 7 jours (5 joués), plus belle réussite, objectif tenu « 4 jours sur 5 »', await p.evaluate(() => document.querySelectorAll('.wk-cal li').length === 7 && document.querySelectorAll('.wk-cal li.on').length === 5) && /Leçon 1|Leçon 2|Leçon 3/.test(tx) && /4 jours sur 5/.test(tx), tx);
    check('D25 : notification « Ton bilan de la semaine » (Progrès)', await p.X('S.notifs.list.some(n=>n.type==="week" && n.cat==="progress")'));
    check('D25 : partageable (bouton Partager)', await vis(p, '#wkShare'));
    await p.click('#wkAdj [data-a="1"]'); await p.click('#wkGo'); await T(p, 300);
    check('« Plus » puis Continuer : objectif 5 → 10 min, fenêtre fermée', await p.X('goalCfg().v===10') && !await vis(p, '#wkModal'));
    await p.X('openPage("learn"); openPage("hub")'); await T(p, 1200);
    check('une seule fois par semaine', !await vis(p, '#wkModal'));
  } else check(`D25 sans défilement ${vp.width}×${vp.height}${dark ? ' (sombre)' : ''}`, ok && await noScroll(p, '#wkModal .modal-card') === true && await p.evaluate(() => { const r = document.querySelector('#wkGo').getBoundingClientRect(); return r.bottom <= innerHeight && r.top >= 0; }));
  await done(p);
}
p = await open({ width: 1024, height: 768 }, wkState([[2, 6]])); await T(p, 2400);
check('semaine à 1 jour : « Une semaine chargée ? 1 jour, c\'est déjà ça. Ta leçon 4 t\'attend. »', /Une semaine chargée \? 1 jour, c'est déjà ça\. Ta leçon 4 t'attend\./.test(await p.evaluate(() => document.getElementById('wkModal').textContent)));
await shot(p, 'd25_one_1024'); await done(p);
p = await open({ width: 1024, height: 768 }, wkState([])); await T(p, 2400);
check('semaine sans jeu : pas de bilan', !await vis(p, '#wkModal')); await done(p);

// ---------- D28 · préparer le micro ----------
p = await open({ width: 1024, height: 768 }, { ...BASE }, { gum: 'osc' });
await p.X('setInput("mic",true)'); await T(p, 1200);
check('micro choisi : « On t\'écoute » s\'ouvre, « Micro autorisé », 3 conseils', await vis(p, '#mpModal') && /Micro autorisé/.test(await p.evaluate(() => document.getElementById('mpChip').textContent)) && await p.evaluate(() => document.querySelectorAll('#mpTips li').length === 3));
check('« Ça marche » désactivé avant une note', await p.evaluate(() => document.getElementById('mpGo').disabled));
await p.evaluate(() => window.__setFreqs([329.63])); await T(p, 900);
check('un Mi entendu : « On entend un Mi. Essaie un Do. »', /On entend un Mi\. Essaie un Do\./.test(await p.evaluate(() => document.getElementById('mpMsg').textContent)), await p.evaluate(() => document.getElementById('mpMsg').textContent));
await p.evaluate(() => window.__setFreqs([])); await T(p, 300);
const vu0 = await p.evaluate(() => [...document.querySelectorAll('#mpVu i')].some(i => i.classList.contains('hi')));
// un Do un peu bas (−35 cents) : reconnu, et le moteur s'adapte
await p.evaluate(() => window.__setFreqs([261.63 * Math.pow(2, -35 / 1200)])); await T(p, 1400);
const mp = JSON.parse(await p.X('JSON.stringify({note:$("mpNote").textContent, ok:!$("mpCk").hidden, go:!$("mpGo").disabled, msg:$("mpMsg").textContent, cents:S.settings.micCents})'));
check('D28 : « Do ✓ » en grand, « Ça marche » actif', mp.note === 'Do' && mp.ok && mp.go, mp);
check('D28 : vu-mètre en direct', await p.evaluate(() => [...document.querySelectorAll('#mpVu i')].some(i => i.classList.contains('hi'))) || vu0);
check('D28 : piano un peu bas → « on s\'adapte » (S.settings.micCents < 0)', /un peu bas : on s'adapte/.test(mp.msg) && mp.cents < -20, mp);
await shot(p, 'd28_ok_1024');
await p.evaluate(() => window.__setFreqs([])); await T(p, 200);
await p.click('#mpGo'); await T(p, 300);
check('« Ça marche » : fermé, S.micPrep.ok, plus proposé ensuite', !await vis(p, '#mpModal') && await p.X('S.micPrep.ok===true'));
await p.X('setInput("screen",true)'); await T(p, 200); await p.X('setInput("mic",true)'); await T(p, 600);
check('choisi à nouveau : pas rouvert tout seul', !await vis(p, '#mpModal'));
await p.X('closeMod("mpModal"); MP.on=false; openPage("hub")'); await p.click('#setBtn'); await T(p, 300);
check('Réglages › Interaction : « Préparer le micro »', await vis(p, '#mpSetBtn'));
await p.click('#mpSetBtn'); await T(p, 600);
check('… qui rouvre la fenêtre', await vis(p, '#mpModal'));
await p.click('#mpLater'); await T(p, 200);
await done(p);
p = await open({ width: 375, height: 667 }, { ...BASE }, { gum: 'osc' });
await p.X('setInput("mic",true)'); await T(p, 1000); await p.evaluate(() => window.__setFreqs([261.63])); await T(p, 1000);
check('D28 sans défilement 375×667', await vis(p, '#mpModal') && await noScroll(p, '#mpModal .modal-card') === true);
await shot(p, 'd28_375x667'); await done(p);
p = await open({ width: 812, height: 375 }, { ...BASE }, { gum: 'osc', dark: true });
await p.X('setInput("mic",true)'); await T(p, 1000);
check('D28 sans défilement 812×375', await vis(p, '#mpModal') && await noScroll(p, '#mpModal .modal-card') === true);
await shot(p, 'd28_812x375_dark'); await done(p);
// refusé
p = await open({ width: 1024, height: 768 }, { ...BASE }, { gum: 'deny' });
await p.X('setInput("mic",true)'); await T(p, 1500);
check('micro refusé : « Micro refusé », explication, « Réessayer » et « Jouer sur l\'écran »', /Micro refusé/.test(await p.evaluate(() => document.getElementById('mpChip').textContent)) && await vis(p, '#mpRetry') && await vis(p, '#mpScreen') && /cadenas|Réglages/.test(await p.evaluate(() => document.getElementById('mpMsg').textContent)));
await shot(p, 'd28_denied_1024');
await p.click('#mpScreen'); await T(p, 300);
check('« Jouer sur l\'écran » : entrée écran', await p.X('S.settings.input==="screen"') && !await vis(p, '#mpModal'));
await done(p);
// premier lancement « Un vrai piano » : D28 au-dessus, un Do → D4
p = await open({ width: 1024, height: 768 }, null, { gum: 'osc', midi: 'none' });
await p.click('#gate .fn-hwc[data-v=mic]'); await T(p, 1300);
check('premier lancement « Un vrai piano » : D28 au-dessus du premier écran', await vis(p, '#mpModal') && await p.X('FN.on'));
await shot(p, 'd28_first_1024');
await p.evaluate(() => window.__setFreqs([261.63])); await T(p, 1000); await p.evaluate(() => window.__setFreqs([])); await T(p, 200);
await p.click('#mpGo'); await T(p, 1200);
check('… « Ça marche » avec un Do → « Tu viens de jouer un Do ! » (D4)', await p.X('FN.st==="lvl"'), await p.X('FN.st'));
await done(p);

// intégration étape 4 : une seule fenêtre à la fois (paywall, D23, D25, objectif), jamais pendant une activité
p = await open({ width: 1024, height: 768 }, { ...BASE, settings: { ...BASE.settings, paywall: true }, prem: {}, pwShown: 1, goal: { kind: 'min', v: 5, at: 1, asked: 1 } }, { fake: {} });
await p.X('openPage("hub"); pwOpen("menu")'); await T(p, 400);
await p.X('ACCT.pend=null; acctWant("goal"); S.wkRev={}; wkCheck()'); await T(p, 2600);
const stack = async () => JSON.parse(await p.X('JSON.stringify({pw:document.body.classList.contains("pw-on"), mods:openMods.slice()})'));
let st = await stack();
check('paywall ouvert : ni D23 ni D25 par-dessus (une seule fenêtre)', st.pw && !st.mods.includes('accModal') && !st.mods.includes('wkModal'), st);
await p.X('pwClose()'); await T(p, 2600); st = await stack();
check('paywall fermé : la fenêtre en attente (D23) s’ouvre seule', !st.pw && st.mods.length === 1 && st.mods[0] === 'accModal', st);
await p.X('closeMod("accModal"); openPage("games"); gameOpen("speed",true); actNow=()=>({k:"game"}); ACCT.pend=null; acctWant("goal")'); await T(p, 2600); st = await stack();
check('partie en cours : aucune fenêtre ne s’ouvre (D23 attend)', !st.pw && st.mods.length === 0, st);
await done(p);

console.log(errs.length ? 'Erreurs console : ' + JSON.stringify(errs.slice(0, 5)) : 'Console : 0 erreur');
check('zéro erreur console', errs.length === 0, errs.slice(0, 3));
await b.close();
console.log(fails.length ? `\n${fails.length} échec(s)` : '\nTout est OK'); process.exit(fails.length ? 1 : 0);
