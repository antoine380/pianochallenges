// Solfège (Oct 2026): setting Sans / Portée / Lecture + clefs, notes on a staff in LEARN, the Play player's sheet view (bars, cursor)
// with its Cascade / Partition button, and nothing shown when the setting is off.
import { launch, closeOnboarding, URL } from './lib.mjs';
const wait = (p, ms) => p.waitForTimeout(ms);
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d ? ' — ' + JSON.stringify(d) : '')); if (!ok) fails.push(n); };
const { browser, page } = await launch({ mode: 'ok' });
const errs = []; page.on('pageerror', e => errs.push(e.message));
const ev = (f, a) => page.evaluate(f, a);
const st = () => ev(() => JSON.parse(localStorage.getItem('memo-gammes-v1')).settings);
await page.goto(URL); await wait(page, 1000); await closeOnboarding(page, 'screen');
await ev(() => { const S = JSON.parse(localStorage.getItem('memo-gammes-v1')); Object.assign(S.settings, { staff: false, staffRead: false, uiSound: false }); localStorage.setItem('memo-gammes-v1', JSON.stringify(S)); });
await page.reload(); await wait(page, 1000); await closeOnboarding(page, 'screen');

// Settings
await ev(() => document.getElementById('setBtn').click()); await wait(page, 300);
check('Réglages : Sans / Portée / Lecture', await ev(() => document.querySelectorAll('#segStaff button').length === 3));
check('Sans : clés masquées', await ev(() => document.getElementById('clefField').hidden));
await ev(() => document.querySelector('#segStaff [data-v=on]').click()); await wait(page, 150);
check('Portée : réglage enregistré, clés visibles', (await st()).staff === true && await ev(() => !document.getElementById('clefField').hidden));
await ev(() => document.querySelector('#segClef [data-v=treble]').click()); await wait(page, 100);
check('clé de sol enregistrée', (await st()).clef === 'treble');
await ev(() => document.querySelector('#segClef [data-v=auto]').click()); await wait(page, 100);

// LEARN: scales
await ev(() => document.querySelector('.mode-item[data-mode="learn"]').click()); await wait(page, 300);
await ev(() => document.querySelectorAll('#learnTiles .ptile')[1].click()); await wait(page, 500); await ev(() => document.getElementById('uaCfg')?.click()); await wait(page, 400); await closeOnboarding(page);
check('écran de départ : case « Notes sur la portée » cochée', await ev(() => document.getElementById('suStaff').checked));
await ev(() => document.getElementById('suGo').click()); await wait(page, 900);
const L = await ev(() => { const b = document.getElementById('staffBox'); return { vis: !b.hidden, svg: !!b.querySelector('svg'), lines: b.querySelectorAll('line').length, sw: document.documentElement.scrollWidth, cw: innerWidth }; });
check('LEARN : portée affichée', L.vis && L.svg && L.lines >= 5, L);
check('LEARN : pas de défilement horizontal', L.sw <= L.cw, L);
// reading mode: the prompt asks to read the notes
await ev(() => { const S = JSON.parse(localStorage.getItem('memo-gammes-v1')); S.settings.staffRead = true; localStorage.setItem('memo-gammes-v1', JSON.stringify(S)); });
await page.reload(); await wait(page, 1000); await closeOnboarding(page, 'screen');
await ev(() => document.querySelector('.mode-item[data-mode="learn"]').click()); await wait(page, 300);
await ev(() => document.querySelectorAll('#learnTiles .ptile')[1].click()); await wait(page, 500); await ev(() => document.getElementById('uaCfg')?.click()); await wait(page, 400); await closeOnboarding(page);
await ev(() => document.getElementById('suGo').click()); await wait(page, 900);
check('Lecture : notes écrites à l’encre et consigne de lecture', await ev(() => document.querySelectorAll('#staffBox svg text').length > 4 && /lis|read/i.test(document.getElementById('prompt').textContent)), await ev(() => document.getElementById('prompt').textContent));

// PLAY: the song opens in the sheet view
await ev(() => document.querySelector('.mode-item[data-mode="play"]').click()); await wait(page, 500); await closeOnboarding(page);
await ev(() => document.querySelector('#playSongs .ptile').click()); await wait(page, 1500);
const src = await ev(() => document.getElementById('playFrame').getAttribute('src'));
check('PLAY : le lecteur reçoit le réglage (staff=1)', /staff=1/.test(src), src);
const fr = page.frameLocator('#playFrame');
const frame = page.frames().find(f => /play\/index\.html/.test(f.url()));
await frame.evaluate(() => document.getElementById('go').click()); await wait(page, 2800);
const P1 = await frame.evaluate(() => ({ sheet: !document.getElementById('sheet').hidden, sys: document.querySelectorAll('#sheetIn .sys').length, bars: document.querySelectorAll('#sheetIn svg').length, cur: !!document.getElementById('sheetCur'), btn: document.getElementById('tSheet').getAttribute('aria-pressed'), canvas: getComputedStyle(document.getElementById('cv')).visibility }));
check('PLAY : partition en mesures avec curseur', P1.sheet && P1.sys >= 1 && P1.cur && P1.btn === 'true' && P1.canvas === 'hidden', P1);
check('PLAY : chiffrage 4/4 sur la première ligne seulement', await frame.evaluate(() => { const s = [...document.querySelectorAll('#sheetIn .sys')]; const ts = el => [...el.querySelectorAll('text')].filter(t => /[-]/.test(t.textContent)).length; return ts(s[0]) === 2 && (!s[1] || ts(s[1]) === 0); }));
// play the first note: it turns to its colour
await frame.evaluate(() => { const k = document.querySelector('.key.target'); k && k.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 })); }); await wait(page, 150);
await frame.evaluate(() => { const k = document.querySelector('.key.down'); k && k.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 })); }); await wait(page, 300);
check('PLAY : note jouée en couleur sur la partition', await frame.evaluate(() => [...document.querySelectorAll('#sheetIn .sys:first-child text')].some(t => /hsla/.test(t.getAttribute('fill') || ''))));
// Cascade / Partition button, remembered
await frame.evaluate(() => document.getElementById('tSheet').click()); await wait(page, 200);
check('bouton Partition : retour à la cascade', await frame.evaluate(() => document.getElementById('sheet').hidden && getComputedStyle(document.getElementById('cv')).visibility !== 'hidden'));
check('choix mémorisé', await frame.evaluate(() => localStorage.getItem('clavio:sheet') === 'false'));
await frame.evaluate(() => { localStorage.removeItem('clavio:sheet'); });

// setting off: no staff anywhere, no staff=1 in the player
await ev(() => { const S = JSON.parse(localStorage.getItem('memo-gammes-v1')); S.settings.staff = false; S.settings.staffRead = false; localStorage.setItem('memo-gammes-v1', JSON.stringify(S)); });
await page.reload(); await wait(page, 1000); await closeOnboarding(page, 'screen');
await ev(() => document.querySelector('.mode-item[data-mode="learn"]').click()); await wait(page, 300);
await ev(() => document.querySelectorAll('#learnTiles .ptile')[1].click()); await wait(page, 500); await ev(() => document.getElementById('uaCfg')?.click()); await wait(page, 400); await closeOnboarding(page);
await ev(() => document.getElementById('suGo').click()); await wait(page, 900);
check('Sans : aucune portée dans LEARN', await ev(() => document.getElementById('staffBox').hidden && !document.body.classList.contains('staff-on')));
await ev(() => document.querySelector('.mode-item[data-mode="play"]').click()); await wait(page, 500); await closeOnboarding(page);
await ev(() => document.querySelector('#playSongs .ptile').click()); await wait(page, 1500);
const src2 = await ev(() => document.getElementById('playFrame').getAttribute('src'));
check('Sans : le lecteur reste en cascade', !/staff=1/.test(src2), src2);
check('aucune erreur JS', errs.length === 0, errs);
await browser.close();
console.log(fails.length ? 'r14 FAIL ' + fails.length : 'r14 OK');
process.exit(fails.length ? 1 : 0);
