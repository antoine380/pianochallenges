// Mobile-native audit (Oct 2026): hover only for a mouse, press feedback (:active) on controls but never on piano keys,
// 16px fields on touch screens, no tap flash, controls not selectable (text is), overscroll contained, theme-color follows the
// app theme, wide keyboard scrollable with a finger, Play keeps zoom on the website, app files (legal pages, viewport, scroll).
import { createRequire } from 'module';
import { readFileSync, existsSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = process.env.PORT || '8767', URL = `http://localhost:${PORT}/`;
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d ? ' — ' + JSON.stringify(d) : '')); if (!ok) fails.push(n); };
const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const seed = (extra = {}) => `(()=>{ try{ localStorage.setItem('memo-gammes-v1', JSON.stringify(Object.assign({settings:Object.assign({lang:'fr',notation:'fr',input:'screen',earV2:true,diffV2:true,midiV2:true},${JSON.stringify(extra.settings || {})}),
  gate:'guest', onb:{done:1}, tourDone:1, langV2:true, introSeen:{chords:1,scales:1,harmony:1,prog:1,ear:1,games:1,daily:1,section:1},seenTypes:[],stats:{},secStats:{},xp:0,xpDays:{},streak:{days:0}}))); }catch(e){} })();`;
async function open(vp, extra, touch = true) {
  const c = await b.newContext({ viewport: vp, isMobile: touch, hasTouch: touch, locale: 'fr-FR' }); await c.addInitScript(seed(extra));
  const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); await p.goto(URL); await p.waitForTimeout(800);
  for (let i = 0; i < 3; i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(80); } return p;
}
const ev = (p, f, a) => p.evaluate(f, a);
const errs = [];

// 1) CSS: every :hover is gated, :active exists, never on keys
const src = readFileSync(join(ROOT, 'src/piano-challenges.html'), 'utf8'), css = src.slice(src.indexOf('<style>') + 7, src.indexOf('</style>')).replace(/\/\*[\s\S]*?\*\//g, '');
const loose = []; { let depth = 0, gated = [], i = 0, start = 0;
  for (; i < css.length; i++) { const ch = css[i];
    if (ch === '{') { const sel = css.slice(start, i); if (/:hover/.test(sel) && !gated.some(Boolean) && !/^\s*@/.test(sel) && sel.trim() !== '.ptile,.ptile:hover' /* only resets the shadow on phones */) loose.push(sel.trim().slice(-60)); gated.push(/@media\s*\(hover:hover\)\s*and\s*\(pointer:fine\)/.test(sel)); depth++; start = i + 1; }
    else if (ch === '}') { gated.pop(); depth--; start = i + 1; } else if (ch === ';' ) start = i + 1; } }
check(':hover réservé à la souris dans la source', loose.length === 0, loose.slice(0, 5));
const play = readFileSync(join(ROOT, 'play/index.html'), 'utf8');
check(':hover réservé à la souris dans Play', !/^[^@\n]*:hover/m.test(play.replace(/@media \(hover:hover\) and \(pointer:fine\)\{[^{}]*\{[^}]*\}\}/g, '')));
check('plus de bloc (hover:none)', !/@media \(hover:none\)/.test(css));
check(':active présent, jamais sur les touches de piano', /:active\{transform:scale\(\.97\)\}/.test(css) && !/\.(wk|bk|fn-kb[^{]*|key)[^,{]*:active/.test(css));
check('Play : zoom permis sur le site', /<meta name="viewport" content="[^"]*"/.test(play) && !/user-scalable=no|maximum-scale/.test(play.match(/<meta name="viewport"[^>]*>/)[0]));

// 2) phone: tap highlight, selection, touch-action, 16px fields, overscroll, active feedback on a tile, keys untouched
let p = await open({ width: 375, height: 667 });
const r = await ev(p, () => { const cs = s => { const e = document.querySelector(s); return e ? getComputedStyle(e) : null; };
  return { hl: getComputedStyle(document.documentElement).webkitTapHighlightColor, os: getComputedStyle(document.documentElement).overscrollBehaviorY, osMain: cs('#main').overscrollBehaviorY,
    btnSel: cs('#setBtn').webkitUserSelect || cs('#setBtn').userSelect, btnTa: cs('#setBtn').touchAction, bodySel: getComputedStyle(document.body).webkitUserSelect || getComputedStyle(document.body).userSelect,
    tileTa: cs('.ptile') && cs('.ptile').touchAction }; });
check('pas de flash au toucher (html)', /rgba\(0, 0, 0, 0\)|transparent/.test(r.hl), r.hl);
check('overscroll : none sur la page, contain dans #main', r.os === 'none' && r.osMain === 'contain', r);
check('boutons : pas de sélection, touch-action manipulation ; le texte reste sélectionnable', r.btnSel === 'none' && r.btnTa === 'manipulation' && r.bodySel !== 'none', r);
await ev(p, () => document.querySelector('#modeNav [data-mode=games]').click()); await p.waitForTimeout(400);
await ev(p, () => document.querySelector('#gameCards .ptile').click()); await p.waitForTimeout(600);
await ev(p, () => { const x = [...document.querySelectorAll('#duLobby button')].find(b => /Entra/i.test(b.textContent)); if (x) x.click(); }); await p.waitForTimeout(500);
const f = await ev(p, () => ['#gmDiff', '#gmCont', '#timerSel'].map(s => { const e = document.getElementById(s.slice(1)); return e ? getComputedStyle(e).fontSize : null; }));
check('champs à 16 px sur écran tactile (#gmDiff, #gmCont, #timerSel)', f.every(x => x === '16px'), f);
await ev(p, () => document.querySelector('#modeNav [data-mode=learn]').click()); await p.waitForTimeout(400);
await ev(p, () => document.querySelector('#learnTiles .ptile').click()); await p.waitForTimeout(500);
await ev(p, () => document.getElementById('suGo').click()); await p.waitForTimeout(700);
const keyT = await ev(p, () => { const k = document.querySelector('#kbd .wk'); return getComputedStyle(k).transform; });
check('touche de piano : aucun scale au repos', !/matrix\(0\.9/.test(keyT), keyT);
errs.push(...p.errs); await p.context().close();

// 3) wide keyboard (88 keys) on a phone: a finger drag scrolls it; the default keyboard keeps touch-action none
p = await open({ width: 812, height: 375 }, { settings: { kbdSize: '88' } });
await ev(p, () => document.querySelector('#modeNav [data-mode=learn]').click()); await p.waitForTimeout(300);
await ev(p, () => document.querySelector('#learnTiles .ptile').click()); await p.waitForTimeout(400);
await ev(p, () => document.getElementById('suGo').click()); await p.waitForTimeout(700);
const k0 = await ev(p, () => { const w = document.getElementById('kbdWrap'); return { cls: w.classList.contains('kbd-scroll'), ta: getComputedStyle(document.getElementById('kbd')).touchAction, sl: w.scrollLeft }; });
const c2 = await p.context().newCDPSession(p);
const bx = await ev(p, () => { const r = document.getElementById('kbdWrap').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * .85 }; });
await c2.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [bx] });
for (let i = 1; i <= 10; i++) { await c2.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: bx.x - 15 * i, y: bx.y }] }); await p.waitForTimeout(16); }
await c2.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(400);
const k1 = await ev(p, () => document.getElementById('kbdWrap').scrollLeft);
check('clavier élargi : pan-x et glissé au doigt qui le fait défiler', k0.cls && k0.ta === 'pan-x' && k1 > k0.sl, { k0, k1 });
errs.push(...p.errs); await p.context().close();
p = await open({ width: 812, height: 375 });
await ev(p, () => document.querySelector('#modeNav [data-mode=learn]').click()); await p.waitForTimeout(300);
await ev(p, () => document.querySelector('#learnTiles .ptile').click()); await p.waitForTimeout(400);
await ev(p, () => document.getElementById('suGo').click()); await p.waitForTimeout(700);
check('clavier qui tient : touch-action none (jeu au doigt inchangé)', await ev(p, () => !document.getElementById('kbdWrap').classList.contains('kbd-scroll') && getComputedStyle(document.getElementById('kbd')).touchAction === 'none'));
errs.push(...p.errs); await p.context().close();

// 4) press feedback: a tile and a button scale down while pressed (headless Chromium sets :active on a mouse press only;
//    on iOS the touchstart listener does it for a finger), a piano key does not
p = await open({ width: 1280, height: 800 }, {}, false);
await ev(p, () => document.querySelector('#modeNav [data-mode=learn]').click()); await p.waitForTimeout(400);
const pressT = async sel => { const r = await ev(p, s => { const e = document.querySelector(s).getBoundingClientRect(); return { x: e.left + e.width / 2, y: e.top + e.height / 2 }; }, sel);
  await p.mouse.move(r.x, r.y); await p.mouse.down(); await p.waitForTimeout(250); const v = await ev(p, s => getComputedStyle(document.querySelector(s)).transform, sel);
  await p.mouse.move(5, 5); await p.mouse.up(); await p.waitForTimeout(200); return v; };
const tT = await pressT('#learnTiles .ptile'); check('tuile enfoncée (scale .98)', /^matrix\(0\.98/.test(tT), tT);
await ev(p, () => document.querySelector('#learnTiles .ptile').click()); await p.waitForTimeout(500);
const gT = await pressT('#suGo'); check('bouton Commencer enfoncé (scale .97)', /^matrix\(0\.97/.test(gT), gT);
await ev(p, () => document.getElementById('suGo').click()); await p.waitForTimeout(700);
const kT = await pressT('#kbd .wk'); check('touche de piano enfoncée : pas de scale .97/.98', !/^matrix\(0\.9[78]/.test(kT), kT);
await p.mouse.up();
errs.push(...p.errs); await p.context().close();

// 5) theme-color follows the day/night button
p = await open({ width: 1280, height: 800 }, {}, false);
const tc = async () => ev(p, () => [...document.querySelectorAll('meta[name="theme-color"]')].map(m => m.content));
const t0 = await tc(); await ev(p, () => document.getElementById('themeBtn').click()); await p.waitForTimeout(150); const t1 = await tc();
await ev(p, () => document.getElementById('themeBtn').click()); await p.waitForTimeout(150); const t2 = await tc();
check('theme-color suit le bouton jour/nuit', t0.join() === '#f1f2fb,#15122e' && new Set(t1).size === 1 && new Set(t2).size === 1 && t1[0] !== t2[0], { t0, t1, t2 });
errs.push(...p.errs); await p.context().close();

// 6) first run keys: no callout, no selection
p = await (async () => { const c = await b.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, locale: 'fr-FR' }); const pg = await c.newPage(); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message)); await pg.goto(URL); await pg.waitForTimeout(800); await pg.evaluate(() => document.querySelector('.fn-hwc[data-v=screen]')?.click()); await pg.waitForTimeout(300); return pg; })(); // D2 → D3
check('« Joue ta première note » : touches sans sélection ni menu', await ev(p, () => { const k = document.querySelector('#fnKb .w'), s = getComputedStyle(k), e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true }); k.dispatchEvent(e);
  return (s.webkitUserSelect || s.userSelect) === 'none' && e.defaultPrevented; }) && /\.fn-kb,\.fn-kb \*\{[^}]*-webkit-touch-callout:none/.test(css)); // Chromium has no -webkit-touch-callout: read from the CSS
errs.push(...p.errs); await p.context().close();

// 7) app files: copy-web copies the legal pages and blocks zoom only in app/www; Swift creates MainViewController
execFileSync('node', [join(ROOT, 'app/scripts/copy-web.mjs')], { stdio: 'ignore' });
const www = join(ROOT, 'app/www'), vp = f => (readFileSync(join(www, f), 'utf8').match(/<meta name="viewport"[^>]*>/) || [''])[0];
check('app : pages légales copiées', existsSync(join(www, 'mentions-legales.html')) && existsSync(join(www, 'confidentialite.html')));
check('app : zoom bloqué dans index.html et play/index.html', /user-scalable=no/.test(vp('index.html')) && /user-scalable=no/.test(vp('play/index.html')));
rmSync(www, { recursive: true, force: true });
const cfg = JSON.parse(readFileSync(join(ROOT, 'app/capacitor.config.json'), 'utf8'));
check('app : scrollEnabled false', cfg.ios.scrollEnabled === false);
check('app : SceneDelegate crée MainViewController', /rootViewController = MainViewController\(\)/.test(readFileSync(join(ROOT, 'app/ios/App/App/SceneDelegate.swift'), 'utf8')));

check('aucune erreur JS', errs.length === 0, errs);
await b.close();
console.log(fails.length ? 'r17 FAIL ' + fails.length : 'r17 OK'); process.exit(fails.length ? 1 : 0);
