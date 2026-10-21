// Écran de départ v2 (oct. 2026) : plusieurs gammes à la fois, tonalités Simples (sans ♯/♭) / Toutes / Au choix, puis notes ou accords.
import { launch, closeOnboarding, URL } from './lib.mjs';
const wait = (p, ms) => p.waitForTimeout(ms);
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d ? ' — ' + JSON.stringify(d) : '')); if (!ok) fails.push(n); };
const { browser, page } = await launch({ mode: 'ok' });
await page.goto(URL); await wait(page, 1000); await closeOnboarding(page, 'midi');
await page.evaluate(() => { const S = JSON.parse(localStorage.getItem('memo-gammes-v1')); Object.assign(S.settings, { unlockAll: true, scMode: 'notes', uiSound: false }); delete S.settings.su; localStorage.setItem('memo-gammes-v1', JSON.stringify(S)); });
await page.reload(); await wait(page, 1000); await closeOnboarding(page, 'midi');
await page.evaluate(() => document.querySelector('.mode-item[data-mode="learn"]').click()); await wait(page, 300);
await page.evaluate(() => document.querySelectorAll('#learnTiles .ptile')[1].click()); await wait(page, 500); await closeOnboarding(page);
const ev = f => page.evaluate(f);
const count = () => ev(() => document.getElementById('suCount').textContent);
const n = async () => +((await count()).match(/\d+/) || [0])[0];
check('3 choix de tonalités', await ev(() => document.querySelectorAll('#suKeyMode .su-km').length === 3));
check('par défaut : Simples', await ev(() => document.querySelectorAll('#suKeyMode .su-km')[0].getAttribute('aria-pressed') === 'true'));
check('1 gamme × Simples = 7', await n() === 7, await count());
await ev(() => document.querySelectorAll('#suKeyMode .su-km')[1].click()); await wait(page, 150);
const all1 = await n(); check('1 gamme × Toutes ≥ 12', all1 >= 12, await count());
// add a second scale type
await ev(() => document.querySelectorAll('#suTypes .su-card:not([disabled])')[1].click()); await wait(page, 150);
check('2 gammes sélectionnées', await ev(() => document.querySelectorAll('#suTypes .su-card[aria-pressed=true]').length === 2));
check('2 gammes × Toutes ≈ double', await n() >= all1 + 12, await count());
await ev(() => document.querySelectorAll('#suKeyMode .su-km')[2].click()); await wait(page, 150);
check('Au choix : 12 touches de tonalité visibles', await ev(() => !document.getElementById('suKeys').hidden && document.querySelectorAll('#suKeys .su-key').length === 12));
check('Au choix (Do) × 2 gammes = 2', await n() === 2, await count());
await ev(() => document.querySelectorAll('#suKeys .su-key')[1].click()); await wait(page, 150);
check('Au choix (Do, Sol) × 2 gammes = 4', await n() === 4, await count());
// back to simple, then chords mode: notes/chords cards still there
await ev(() => document.querySelectorAll('#suKeyMode .su-km')[0].click()); await wait(page, 150);
await ev(() => document.querySelectorAll('#suMode .su-mode')[1].click()); await wait(page, 150);
check('mode accords gardé avec plusieurs gammes', await ev(() => document.querySelectorAll('#suMode .su-mode')[1].getAttribute('aria-pressed') === 'true'));
// start a multi-item game
await ev(() => document.getElementById('suGo').click()); await wait(page, 500);
check('la partie démarre', await ev(() => document.body.classList.contains('playing') || !document.body.classList.contains('setup')));
// leave and check the choice is remembered
const errs = await ev(() => window.__cnt.consoleErrors);
check('aucune erreur JS', errs.length === 0, errs);
await browser.close();
if (fails.length) { console.log('\nECHEC r9 :', fails); process.exit(1); }
console.log('\nr9 OK');
