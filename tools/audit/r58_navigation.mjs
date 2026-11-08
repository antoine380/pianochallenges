// Chantier NAVIGATION (08/11/2026) : bouton retour sur les pages « une à une » (→ LEARN) et sur « Configurer mon cours » (→ la page
// d'où l'on vient), ordre NOTES | ACCORDS · Révision (picto) · Configurer mon cours, encart des résultats, titre « Configurer mon cours »,
// fin de partie (fautes par exercice, « i » pour l'explication, plus de « Changer de choix », deux boutons sur une ligne), révision :
// le bilan s'ouvre au-dessus de la page des étoiles et y revient, « Nouvelle partie » relance la révision ; touche noire jouée colorée
// dans la fenêtre Clavier MIDI ; « S'inscrire / Se connecter » plus en haut à droite. Usage : PORT=… NODE_PATH=… PW_CHROMIUM=… node tools/audit/r58_navigation.mjs
import { createRequire } from 'module';
import { INIT } from './lib.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = process.env.PORT || '8767', URL = `http://localhost:${PORT}/`;
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d !== undefined && !ok ? ' — ' + JSON.stringify(d).slice(0, 600) : '')); if (!ok) fails.push(n); };
const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const STATE = (o = {}) => ({ xp: 900, gate: 'account', onb: { done: 1 }, tourDone: 1, langV2: true, pwShown: 1, scStars: { notes: { 'C-major': 3, 'D-minor': 3, 'E-minor': 3 } },
  introSeen: { scales: 1, chords: 1, harmony: 1, prog: 1, ear: 1, games: 1, daily: 1 }, midi: { later: Date.now() }, goal: { kind: 'min', v: 10, asked: 1, at: 1 },
  settings: { sc1Tour: 1, uaTour: { chords: 1, harmony: 1, prog: 1, ear: 1 }, lang: o.lang || 'fr', notation: o.lang || 'fr', input: o.input || 'screen', uiSound: false, sc1RvMix: false } });
async function open({ vp = { width: 1024, height: 768 }, st = STATE() } = {}) {
  const c = await b.newContext({ viewport: vp, hasTouch: vp.width < 900 });
  await c.addInitScript(`window.__midiMode="ok";`); await c.addInitScript(INIT.replace('${MODE}', 'ok'));
  await c.route(u => u.href.startsWith(URL) && (u.pathname === '/' || u.pathname === '/index.html'), async r => { const res = await r.fetch(); let h = await res.text(); const e = h.lastIndexOf('})();\n</script>'); h = h.slice(0, e) + '\nwindow.__X=s=>eval(s);\n' + h.slice(e); await r.fulfill({ response: res, body: h, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await c.route('https://ijdxeasxmgevuchyuenn.supabase.co/**', r => r.abort());
  const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.addInitScript(`if(!sessionStorage.getItem('s')){ sessionStorage.setItem('s','1'); localStorage.setItem('memo-gammes-v1', ${JSON.stringify(JSON.stringify(st))}); }`);
  await p.goto(URL); await p.waitForFunction(() => !!window.__X, null, { timeout: 15000 }); await p.waitForTimeout(1500);
  p.X = s => p.evaluate(s => window.__X(s), s); p.c = c; return p;
}
const W = (p, ms) => p.waitForTimeout(ms), ev = (p, f, a) => p.evaluate(f, a), click = (p, sel) => ev(p, s => document.querySelector(s).click(), sel);
const toScales = async p => { await click(p, '#modeNav [data-mode=learn]'); await W(p, 400); await ev(p, () => document.querySelectorAll('#learnTiles .ptile')[1].click()); await W(p, 500); };
const noScroll = p => ev(p, () => { const d = document.scrollingElement, m = document.getElementById('main'); return d.scrollHeight - d.clientHeight <= 1 && m.scrollHeight - m.clientHeight <= 1; });

// 1) page « une à une » : retour, ordre, picto, encart ; aucun défilement
for (const [n, vp] of [['iPad', { width: 1024, height: 768 }], ['iPad portrait', { width: 768, height: 1024 }], ['téléphone', { width: 375, height: 667 }], ['téléphone paysage', { width: 812, height: 375 }], ['ordinateur', { width: 1280, height: 800 }]]) {
  const p = await open({ vp }); await toScales(p);
  const h = await ev(p, () => { const top = document.querySelector('#sc1Panel .sc1-top'), acts = document.getElementById('uaActs');
    return { back: top.firstElementChild?.id, order: acts ? [...acts.children].map(x => x.id) : [], rvIc: !!document.querySelector('#sc1RvB svg'), res: !!document.querySelector('#sc1Sum.ua-res .ua-bar i'),
      lbl: [...document.querySelectorAll('#sc1Sum .ua-rl')].map(x => x.textContent), top: !!document.getElementById('topAuth')?.offsetParent }; });
  check(`${n} : retour en tête, NOTES | ACCORDS · Révision · Configurer, picto Révision, encart avec barre, pas de « S'inscrire » en haut à droite`,
    h.back === 'sc1BackB' && h.order.join() === 'sc1Seg,sc1RvB,uaCfg' && h.rvIc && h.res && h.lbl.join() === 'étoiles,coupes' && !h.top, h);
  check(`${n} : la page « une à une » tient sans défilement`, await noScroll(p));
  if (n === 'iPad') {
    await click(p, '#sc1BackB'); await W(p, 400); check('retour de la page « une à une » → LEARN', await p.X('page') === 'learn');
    await ev(p, () => document.querySelectorAll('#learnTiles .ptile')[0].click()); await W(p, 400); // Accords
    await click(p, '#uaCfg'); await W(p, 500);
    const s = await ev(p, () => ({ page: document.body.dataset.page, cfg: document.body.classList.contains('su-cfg'), k: document.querySelector('#suName .su-cfgk')?.textContent, s: document.querySelector('#suName .su-cfgs')?.textContent, lbl: document.getElementById('suBack')?.getAttribute('aria-label') }));
    check('« Configurer mon cours » en titre, la matière en dessous, retour nommé', s.page === 'practice' && s.cfg && s.k === 'Configurer mon cours' && s.s === 'Accords' && /Accords un à un/.test(s.lbl), s);
    check('écran « Configurer mon cours » sans défilement', await noScroll(p));
    await click(p, '#suBack'); await W(p, 500);
    check('retour de « Configurer mon cours » → la page « une à une » de la matière', await p.X('page+":"+UA.cur') === 'sc1:chords');
    await click(p, '#modeNav [data-mode=games]'); await W(p, 300); await click(p, '#modeNav [data-mode=learn]'); await W(p, 300);
    check('ailleurs, le titre de l\'écran de départ redevient normal', await p.X('UA.cfgFrom') === null);
  }
  check(`${n} : aucune erreur JS`, !p.errs.length, p.errs); await p.c.close();
}

// 2) révision : fin de partie au-dessus des étoiles, fautes par gamme, « i », deux boutons, retour aux étoiles
for (const [n, vp] of [['iPad', { width: 1024, height: 768 }], ['téléphone', { width: 375, height: 667 }]]) {
  const p = await open({ vp }); await toScales(p);
  await click(p, '#sc1RvB'); await W(p, 300); await click(p, '#sc1RvGo'); await W(p, 500);
  const play = async bad => { for (let w = 0; w < 50 && await p.X('phase') !== 'listening'; w++) await W(p, 150);
    const ms = await p.X('revealMidis()'); for (let i = 0; i < bad; i++) { await p.X('noteIn(1)'); await W(p, 60); } for (const m of ms) { await p.X(`noteIn(${m})`); await W(p, 45); } };
  await play(0); await play(2); await play(1);
  for (let w = 0; w < 50 && !await p.X('endOpen'); w++) await W(p, 150);
  const e = await ev(p, () => ({ page: document.body.dataset.page, list: [...document.querySelectorAll('#endBody .end-list li small')].map(x => x.textContent),
    chipsHidden: document.getElementById('endChips')?.hidden, i: !!document.getElementById('endInfo'), foot: [...document.querySelectorAll('#endFoot button')].map(b => b.firstChild.textContent),
    one: (() => { const bs = [...document.querySelectorAll('#endFoot button')]; return bs.length === 2 && Math.abs(bs[0].getBoundingClientRect().top - bs[1].getBoundingClientRect().top) < 4; })() }));
  check(`${n} : bilan de révision au-dessus de la page des étoiles`, e.page === 'sc1', e);
  check(`${n} : « À retravailler » = nombre de fautes par gamme (2 fautes, 1 faute)`, e.list.join('|') === '2 fautes|1 faute', e.list);
  check(`${n} : explication cachée derrière « i », plus de « Changer de choix », deux boutons sur une ligne`, e.i && e.chipsHidden === true && e.foot.join('|') === 'Retravailler mes erreurs|Nouvelle partie' && e.one, e);
  await click(p, '#endInfo'); await W(p, 150);
  const iv = await ev(p, () => ({ on: !document.getElementById('endChips').hidden, ex: document.getElementById('endInfo').getAttribute('aria-expanded'), tx: document.querySelector('#endChips .end-itx')?.textContent }));
  check(`${n} : « i » ouvre l'explication`, iv.on && iv.ex === 'true' && /sans aucune fausse note/.test(iv.tx), iv);
  await click(p, '#endTitle'); await W(p, 150); check(`${n} : clic ailleurs = la bulle se ferme`, await ev(p, () => document.getElementById('endChips').hidden));
  if (n === 'iPad') {
    await click(p, '#endFoot .btn.primary'); await W(p, 600);
    check('« Nouvelle partie » relance la révision (3 gammes, toutes de la révision)', await p.X('!!game && game.queue.length===3 && game.queue.every(it=>it.sc1rv)'));
    await play(0); await play(0); await play(0); for (let w = 0; w < 50 && !await p.X('endOpen'); w++) await W(p, 150);
  }
  await click(p, '#endX'); await W(p, 400);
  check(`${n} : fermer le bilan = page des étoiles (pas l'écran de configuration)`, await p.X('page') === 'sc1' && !(await p.X('document.body.classList.contains("setup")')));
  check(`${n} : aucune erreur JS`, !p.errs.length, p.errs); await p.c.close();
}

// 3) fenêtre Clavier MIDI : la touche noire jouée prend une couleur (avant : transparente)
{ const p = await open({ st: STATE({ input: 'midi' }) });
  await click(p, '#inChip'); await W(p, 500); await ev(p, () => window.__midi.noteOn(61)); await W(p, 200);
  const k = await ev(p, () => { const e = document.querySelector('#mtKb [data-m="61"]'); return e ? { on: e.classList.contains('on'), bg: getComputedStyle(e).backgroundColor } : null; });
  check('Clavier MIDI : Do♯ joué allumé dans une couleur (pas transparent)', k && k.on && k.bg !== 'rgba(0, 0, 0, 0)', k);
  const v = await p.X('[1,3,6,8,10].map(i=>getComputedStyle(document.documentElement).getPropertyValue("--note-"+i).trim())');
  check('--note-1/3/6/8/10 définies (couleur de la blanche de gauche)', v.every(Boolean), v); await p.c.close(); }

await b.close();
if (fails.length) { console.log('\nECHEC r58 :', fails); process.exit(1); } else console.log('\nr58 OK');
