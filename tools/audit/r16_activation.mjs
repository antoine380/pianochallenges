// Audit follow-up (Oct 2026): end of a game points to tomorrow (next level, streak, account for guests); the offer (preview on)
// opens once after a first game played well, not after the questions; 3 wrong notes offer a hand; no Premium promise while the offer is off.
import { launch, closeOnboarding, URL, midi } from './lib.mjs';
const wait = (p, ms) => p.waitForTimeout(ms);
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d ? ' — ' + JSON.stringify(d) : '')); if (!ok) fails.push(n); };
const { browser, page } = await launch({ mode: 'ok', viewport: { width: 1280, height: 800 } });
const errs = []; page.on('pageerror', e => errs.push(e.message));
const ev = (f, a) => page.evaluate(f, a), vis = id => ev(id => { const e = document.getElementById(id); return !!e && !e.hidden; }, id);
const PC = { 'Do': 0, 'Ré': 2, 'Mi': 4, 'Fa': 5, 'Sol': 7, 'La': 9, 'Si': 11 };
await page.goto(URL); await wait(page, 1000); await closeOnboarding(page, 'midi');
// offer off (production): no Premium promise
await ev(() => document.getElementById('homeLink').click()); await wait(page, 400);
check('offre coupée : la carte d’invitation ne promet pas de Premium', await ev(() => !/Premium/.test(document.getElementById('hsInv').textContent)));
await ev(() => document.getElementById('setBtn').click()); await wait(page, 300);
check('offre coupée : pas de « Premium actif » dans Réglages', await ev(() => { const b = document.getElementById('setPremBox'); return b.classList.contains('off') && getComputedStyle(b.querySelector('.sp-st')).display === 'none'; }));
await page.keyboard.press('Escape'); await wait(page, 200);
// preview on, then a first game of 3 chords played well
await ev(() => { const S = JSON.parse(localStorage.getItem('memo-gammes-v1')); S.settings.paywall = true; S.prem = {}; delete S.pwShown; localStorage.setItem('memo-gammes-v1', JSON.stringify(S)); });
await page.reload(); await wait(page, 1000); await closeOnboarding(page, 'midi');
await ev(() => document.querySelector('.mode-item[data-mode="learn"]').click()); await wait(page, 300); await ev(() => document.querySelector('#secTabs [data-v="chords"]').click()); await wait(page, 500); await closeOnboarding(page);
await ev(() => document.getElementById('suGo').click()); await wait(page, 700);
for (let i = 0; i < 4; i++) { if (await vis('endModal')) break; const p = await ev(() => document.getElementById('prompt').textContent); const m = /^(\S+)\s+Majeur/.exec(p); if (!m) break; const r = 60 + PC[m[1]];
  for (const n of [r, r + 4, r + 7]) { await midi.on(page, n); await wait(page, 80); } await wait(page, 500); for (const n of [r, r + 4, r + 7]) await midi.off(page, n); await wait(page, 700); await page.keyboard.press('Enter'); await wait(page, 900); }
await wait(page, 500);
check('fin de partie : XP avant le niveau suivant et série', await ev(() => /avant le niveau/.test(document.getElementById('endNext').textContent) && /Série/.test(document.getElementById('endNext').textContent)));
check('fin de partie (invité) : « Garde ta série », créer un compte', await vis('endAcct'));
check('l’offre ne s’ouvre pas par-dessus la fin de partie', !(await vis('pw')));
await ev(() => document.getElementById('endX').click()); await wait(page, 800);
check('après la fermeture : l’offre, une fois, avec « Bien joué »', await vis('pw') && /Bien joué/.test(await ev(() => document.querySelector('.pw-why').textContent)));
await ev(() => document.getElementById('pwLater').click()); await wait(page, 300);
check('mémorisé : elle ne revient pas', await ev(() => JSON.parse(localStorage.getItem('memo-gammes-v1')).pwShown === 1));
// 3 wrong notes -> a hand
await ev(() => document.getElementById('suGo').click()); await wait(page, 700);
for (let i = 0; i < 3; i++) { await midi.on(page, 61); await wait(page, 120); await midi.off(page, 61); await wait(page, 300); }
check('3 fausses notes : un coup de main proposé', await vis('autoHelp'));
await ev(() => document.querySelector('#autoHelp [data-a=show]').click()); await wait(page, 500);
check('« Montre-moi » révèle la réponse', !(await vis('autoHelp')) && await ev(() => document.body.classList.contains('revealed') || /Réessayer|Continuer/.test(document.getElementById('stage').innerText)));
check('aucune erreur JS', errs.length === 0, errs);
await browser.close();
console.log(fails.length ? 'r16 FAIL ' + fails.length : 'r16 OK'); process.exit(fails.length ? 1 : 0);
