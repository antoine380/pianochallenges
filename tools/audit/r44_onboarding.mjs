// Chantier ONBOARDING (25/10/2026) : les questions courtes après la première note (module « Onboarding 2 » en fin de script).
// Vérifie : D2 → D3 → D4 (niveau = question 1 sur 4) → objectif → lecture → temps → « Ton programme » → branchement
// (débutant = Premiers pas, quelques notes = test de placement, je joue déjà = Ma route / PLAY / GAMES) ; effet annoncé
// « On a réglé : … » ; question sautée ; « Passer » = programme direct ; Do seul MIDI = continuer ; réponses dans S.onb,
// objectif du jour (S.goal), portée ; événements onb_view / onb_answer / onb_skip / onb_done (sans donnée personnelle) ;
// le questionnaire de « Se connecter » et de Réglages passe par le même moteur ; « Pour toi » suit l'objectif ; aucun défilement.
// Usage : PORT=<port> NODE_PATH=… PW_CHROMIUM=… node tools/audit/r44_onboarding.mjs
import { INIT, URL } from './lib.mjs';
import { chromium } from 'playwright';
const W = (p, ms) => p.waitForTimeout(ms);
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d !== undefined && !ok ? ' — ' + JSON.stringify(d).slice(0, 400) : '')); if (!ok) fails.push(n); };
const errs = [];
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
async function open({ w = 1024, h = 768, midi = 'none', st = null, mobile = false } = {}) {
  const c = await b.newContext({ viewport: { width: w, height: h }, locale: 'fr-FR', isMobile: mobile, hasTouch: mobile });
  await c.route('https://ijdxeasxmgevuchyuenn.supabase.co/**', r => r.fulfill({ status: 404, body: '' }));
  await c.route(u => u.href.startsWith(URL) && (u.pathname === '/' || u.pathname === '/index.html'), async r => { const res = await r.fetch(); let x = await res.text(); const e = x.lastIndexOf('})();\n</script>'); x = x.slice(0, e) + '\nwindow.__X=s=>eval(s);\n' + x.slice(e); await r.fulfill({ response: res, body: x, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await c.addInitScript(`window.__midiMode=${JSON.stringify(midi)}; window.__gumMode="none";`); await c.addInitScript(INIT.replace('${MODE}', midi));
  if (st) await c.addInitScript(`if(!sessionStorage.getItem('s')){ sessionStorage.setItem('s','1'); localStorage.setItem('memo-gammes-v1', ${JSON.stringify(JSON.stringify(st))}); }`);
  const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL); await p.waitForFunction(() => !!window.__X, null, { timeout: 15000 }); await W(p, 1500);
  p.X = s => p.evaluate(s => window.__X(s), s); return p;
}
const click = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (e) e.click(); return !!e; }, sel);
const S = p => p.evaluate(() => JSON.parse(localStorage.getItem('memo-gammes-v1')));
const q = p => p.evaluate(() => { const o = document.querySelector('#gate .oq, #onb .oq'); return o ? (o.dataset.q || 'recap') : null; });
const fx = p => p.evaluate(() => (document.querySelector('.oq-fx:not(.oq-fx0)') || {}).textContent || '');
const fit = p => p.evaluate(() => { const pl = document.querySelector('#gate:not([hidden]) .fn-play') || document.querySelector('#onb:not([hidden]) .onb-card'); const d = document.scrollingElement;
  return !!pl && pl.scrollHeight <= pl.clientHeight + 1 && d.scrollWidth <= innerWidth + 1; });
const ev = p => p.X('TRK.q.map(e=>e.n+(e.p.s?":"+e.p.s:"")+(e.p.q?":"+e.p.q:"")+(e.p.a?"="+e.p.a:""))');
const playC = p => p.evaluate(() => { const k = document.querySelector('#fnKb [data-m="60"]'); k.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); });
const midiC = p => p.evaluate(() => { window.__midi.noteOn(60); setTimeout(() => window.__midi.noteOff(60), 40); });
const toD4 = async p => { await click(p, '.fn-hwc[data-v=screen]'); await W(p, 300); await playC(p); await W(p, 1200); };

// ---- A. débutant, à l'écran : 3 questions après le niveau, une sautée, puis la leçon 1
{ const p = await open();
  await toD4(p);
  check('D4 : le niveau est la question 1 sur 4', await p.evaluate(() => /1 sur 4/i.test(document.querySelector('#gate .fn-step').textContent) && !!document.querySelector('.fn-lv4 [data-v=debut]')));
  await click(p, '.fn-lv4 [data-v=debut]'); await W(p, 300);
  check('niveau → question « objectif » (2 sur 4)', await q(p) === 'why' && await p.evaluate(() => /2 sur 4/.test(document.querySelector('.oq-k').textContent)));
  check('effet du niveau annoncé : « On a réglé : … Premiers pas »', /On a réglé/.test(await fx(p)) && /Premiers pas/.test(await fx(p)), await fx(p));
  check('question sans défilement (iPad paysage)', await fit(p));
  check('pas encore réglé dans S (on règle à la fin)', !((await S(p)) || {}).onb);
  await click(p, '.oq-opt[data-v=songs]'); await W(p, 450);
  check('objectif → question « lecture », effet « Pour toi »', await q(p) === 'staff' && /Pour toi/.test(await fx(p)));
  await click(p, '#oqSkipQ'); await W(p, 250);
  check('question sautée → temps par jour, sans effet annoncé', await q(p) === 'time' && (await fx(p)) === '');
  await click(p, '#oqBack'); await W(p, 200); check('Précédent revient à la question d’avant', await q(p) === 'staff'); await click(p, '#oqSkipQ'); await W(p, 250);
  await click(p, '.oq-opt[data-v="10"]'); await W(p, 450);
  check('programme : 4 lignes (niveau, objectif, temps, entrée) et « Commencer la leçon 1 »', await q(p) === 'recap' && await p.evaluate(() => document.querySelectorAll('.oq-list li').length === 4 && /leçon 1/.test(document.getElementById('oqGo').textContent)));
  check('programme sans défilement', await fit(p));
  await click(p, '#oqGo'); await W(p, 1500);
  const s = await S(p);
  check('« Commencer » → Premiers pas', await p.evaluate(() => document.body.dataset.page === 'pp'));
  check('S.onb garde les réponses (niveau, objectif, temps, sautée)', s.onb && s.onb.done && s.onb.level === 'debut' && JSON.stringify(s.onb.why) === '["songs"]' && s.onb.time === '10' && s.onb.staff == null && JSON.stringify(s.onb.sk) === '["staff"]' && s.onb.v === 2 && s.onb.ctx === 'fn', s.onb);
  check('temps par jour → objectif du jour 10 min', s.goal && s.goal.kind === 'min' && s.goal.v === 10 && s.goal.asked === 1, s.goal);
  check('aides du débutant réglées (touches allumées, noms, doigtés)', s.settings.guideK === true && s.settings.labels === true && s.settings.fing === true);
  const e = await ev(p);
  const need = ['onb_view:hw', 'onb_view:c', 'first_note', 'onb_view:level', 'onb_answer:level=debut', 'onb_view:why', 'onb_answer:why=songs', 'onb_view:staff', 'onb_skip:staff', 'onb_view:time', 'onb_answer:time=10', 'onb_view:recap', 'onb_done'];
  check('événements de l’entonnoir dans l’ordre', need.every(n => e.includes(n)) && e.indexOf('onb_view:hw') < e.indexOf('onb_view:recap'), e);
  const done = await p.X('TRK.q.find(e=>e.n==="onb_done").p');
  check('onb_done : durée, nombre de réponses, sautées, destination', +done.sec >= 0 && done.n === '3' && done.sk === '1' && done.dest === 'pp' && done.level === 'debut', done);
  check('aucune donnée personnelle dans les réponses (clés q, a, ctx seulement)', await p.X('TRK.q.filter(e=>e.n==="onb_answer").every(e=>Object.keys(e.p).sort().join()==="a,ctx,q")'));
  await p.context().close(); }

// ---- B. « Je joue déjà » + pour le plaisir, « Passer » = programme direct → GAMES
{ const p = await open({ w: 1280, h: 800 });
  await toD4(p); await click(p, '.fn-lv4 [data-v=adv]'); await W(p, 300);
  await click(p, '.oq-opt[data-v=fun]'); await W(p, 450);
  await click(p, '#fnSkip'); await W(p, 300);
  check('« Passer » pendant les questions → programme', await q(p) === 'recap' && await p.evaluate(() => /jeux/i.test(document.getElementById('oqGo').textContent)));
  await click(p, '#oqGo'); await W(p, 1000); const s = await S(p);
  check('« Je joue déjà » + plaisir → GAMES, tout débloqué, sans aide', await p.evaluate(() => document.body.dataset.page === 'games') && s.settings.unlockAll === true && s.settings.guideK === false);
  check('pas d’objectif imposé quand le temps est sauté', !s.goal || !s.goal.asked);
  check('onb_skip « rest » mesuré', (await ev(p)).includes('onb_skip:rest'));
  await p.context().close(); }

// ---- C. « Je connais quelques notes » → test de placement après le programme
{ const p = await open();
  await toD4(p); await click(p, '.fn-lv4 [data-v=notes]'); await W(p, 300);
  for (const v of ['theory', 'yes', '20']) { await click(p, `.oq-opt[data-v="${v}"]`); await W(p, 450); }
  check('« Faire le test (1 min) »', await p.evaluate(() => /test/.test(document.getElementById('oqGo').textContent)));
  await click(p, '#oqGo'); await W(p, 1500); const s = await S(p);
  check('→ test de placement (D5)', await p.evaluate(() => document.body.dataset.page === 'pp' && !!document.querySelector('#ppPanel .pl-intro, #ppPanel [id^=pl]')));
  check('lecture « oui » → portée activée ; objectif 20 min', s.settings.staff === true && s.goal.v === 20);
  await p.context().close(); }

// ---- D. MIDI : le clavier branché saute D2 ; Do seul = continuer partout
{ const p = await open({ midi: 'ok' }); await W(p, 800);
  check('clavier détecté → D3 directement', await p.evaluate(() => !!document.querySelector('.fn-d3')));
  await midiC(p); await W(p, 1300);
  check('un Do → D4', await p.evaluate(() => !!document.querySelector('.fn-lv4')));
  await midiC(p); await W(p, 500); check('un 2e Do → questions (débutant par défaut)', await q(p) === 'why');
  check('consigne « Joue un Do pour continuer »', await p.evaluate(() => /Joue un Do/.test((document.querySelector('.oq-midi') || {}).textContent || '')));
  await p.evaluate(() => window.__midi.chord([60, 64, 67])); await W(p, 500); check('un accord ne fait rien', await q(p) === 'why');
  for (let i = 0; i < 3; i++) { await midiC(p); await W(p, 600); }
  check('3 Do → programme (questions passées)', await q(p) === 'recap');
  await midiC(p); await W(p, 1500); const s = await S(p);
  check('Do sur le programme → Premiers pas, 3 questions sautées', await p.evaluate(() => document.body.dataset.page === 'pp') && s.onb.sk.length === 3 && s.onb.level === 'debut', s.onb);
  await p.context().close(); }

// ---- E. le questionnaire après « Se connecter » : même moteur, 5 questions (avec l'entrée), rien de présélectionné
{ const p = await open({ st: { settings: { lang: 'fr', notation: 'fr' }, langV2: true, gate: 'account' } });
  check('#onb : question 1 sur 5 « Tu débutes complètement ? », rien de coché', await q(p) === 'level' && await p.evaluate(() => /1 sur 5/.test(document.querySelector('#onb .oq-k').textContent) && !document.querySelector('#onb .oq-opt[aria-pressed=true]')));
  check('#onb sans défilement', await fit(p));
  for (const v of ['adv', 'theory', 'no', '20', 'screen']) { await click(p, `#onb .oq-opt[data-v="${v}"]`); await W(p, 450); }
  check('programme du questionnaire : « Découvrir l’app » + « Passer la présentation »', await q(p) === 'recap' && await p.evaluate(() => !!document.getElementById('onbNoTour') && /Découvrir/.test(document.getElementById('oqGo').textContent)));
  await click(p, '#onbNoTour'); await W(p, 1200); const s = await S(p);
  check('→ Ma route (LEARN), réponses gardées (ctx onb), objectif 20 min, sans portée', await p.evaluate(() => document.body.dataset.page === 'learn') && s.onb.ctx === 'onb' && s.onb.level === 'adv' && s.goal.v === 20 && s.settings.staff === false, s.onb);
  // Réglages › « Refaire le questionnaire » : même moteur, « Terminer »
  await click(p, '#setBtn'); await W(p, 500); await p.evaluate(() => { try{ setTab('app'); }catch(e){} }); await click(p, '#onbAgain'); await W(p, 400);
  check('Refaire le questionnaire : même écran', await q(p) === 'level');
  for (let i = 0; i < 5; i++) { await click(p, '#onb #oqSkipQ'); await W(p, 200); }
  check('refait : « Terminer », pas de présentation', await p.evaluate(() => /Terminer/.test(document.getElementById('oqGo').textContent) && !document.getElementById('onbNoTour')));
  await click(p, '#oqGo'); await W(p, 600);
  check('refait → l’écran se ferme, on reste dans Réglages', await p.evaluate(() => document.getElementById('onb').hidden && document.body.dataset.page === 'settings'));
  await p.context().close(); }

// ---- F. objectif → « Pour toi » sur l'accueil
{ const p = await open({ w: 1280, h: 800, st: { settings: { lang: 'fr', notation: 'fr', input: 'screen' }, langV2: true, gate: 'guest', onb: { done: 1, why: ['songs'], level: 'adv' }, tourDone: 1, introSeen: { hub: 1, learn: 1 } } });
  check('objectif « morceaux » → le morceau en premier dans « Pour toi »', await p.evaluate(() => { const f = document.querySelector('#rsFor .rs-row .rs-fc'); return !!f && f.dataset.f === 'song'; }));
  await p.context().close(); }

// ---- G. tailles : questions et programme sans défilement (téléphones, iPad portrait), clair et sombre
for (const [w, h, mob] of [[375, 667, true], [812, 375, true], [768, 1024, false]]) {
  const p = await open({ w, h, mobile: mob }); await toD4(p); await click(p, '.fn-lv4 [data-v=debut]'); await W(p, 300);
  const a = await fit(p); for (const v of ['school', 'learn', '5']) { await click(p, `.oq-opt[data-v="${v}"]`); await W(p, 450); }
  check(`${w}×${h} : question et programme tiennent sans défilement`, a && await fit(p) && await q(p) === 'recap', { a });
  await p.context().close(); }

check('aucune erreur JS', errs.length === 0, errs);
await b.close();
console.log(fails.length ? `\n${fails.length} échec(s)` : '\nTout est bon.'); process.exit(fails.length ? 1 : 0);
