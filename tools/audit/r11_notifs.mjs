// Notifications (Oct 2026): bell with a badge in the menu and the mobile bar, page with groups and filters, mark as read,
// actions, notifications made by the app (daily practice, level up, unlocks), settings by category x channel (e-mail off for guests).
import { launch, closeOnboarding, URL } from './lib.mjs';
const wait = (p, ms) => p.waitForTimeout(ms);
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d ? ' — ' + JSON.stringify(d) : '')); if (!ok) fails.push(n); };
const { browser, page } = await launch({ mode: 'ok' });
await page.goto(URL); await wait(page, 1000); await closeOnboarding(page, 'midi');
await page.evaluate(() => { const S = JSON.parse(localStorage.getItem('memo-gammes-v1')); delete S.notifs; S.xp = 95; localStorage.setItem('memo-gammes-v1', JSON.stringify(S)); });
await page.reload(); await wait(page, 2200); await closeOnboarding(page, 'midi');
const ev = f => page.evaluate(f);
const badge = () => ev(() => { const b = document.getElementById('ntfBadge'); return b.hidden ? 0 : +b.textContent; });
check('pastille : 2 notifications au départ (bienvenue + entraînement du jour)', await badge() === 2, await badge());
check('les anciennes actualités ne s’empilent pas', await ev(() => JSON.parse(localStorage.getItem('memo-gammes-v1')).notifs.list.every(n => n.type !== 'news')));
await ev(() => document.getElementById('ntfBtn').click()); await wait(page, 300);
check('page Notifications ouverte, 2 éléments non lus', await ev(() => document.body.dataset.page === 'notif' && document.querySelectorAll('#ntfList .ntf-it.unread').length === 2));
check('groupe « Aujourd’hui »', await ev(() => document.querySelector('#ntfList .ntf-g').textContent === "Aujourd'hui"));
await ev(() => document.querySelector('#ntfTabs [data-v=news]').click()); await wait(page, 100);
check('filtre Nouveautés : seulement la bienvenue', await ev(() => document.querySelectorAll('#ntfList .ntf-it').length === 1));
await ev(() => document.querySelector('#ntfTabs [data-v=all]').click());
await ev(() => document.querySelectorAll('#ntfList .ntf-it')[1].click()); await wait(page, 100);
check('clic : marquée comme lue, pastille à 1', await badge() === 1);
// the action button of a notification
await ev(() => document.getElementById('ntfBtn').click()); await wait(page, 200);
await ev(() => document.querySelector('#ntfList .ntf-it .ntf-go').click()); await wait(page, 400);
check('action « Jouer » : ouvre l’entraînement du jour', await ev(() => document.body.dataset.page === 'daily'));
check('pastille à 0', await badge() === 0);
// settings
await ev(() => document.getElementById('setBtn').click()); await wait(page, 300);
check('Réglages : 5 lignes (4 catégories + récap), e-mail désactivé pour un invité', await ev(() => document.querySelectorAll('#ntfSet .ntf-row:not(.ntf-hd)').length === 5 && [...document.querySelectorAll('#ntfSet .ntf-row:not(.ntf-hd) .sw:last-child input')].every(i => i.disabled)));
await ev(() => document.querySelectorAll('#ntfSet .ntf-row:not(.ntf-hd)')[1].querySelector('.sw input').click()); await wait(page, 100);
check('Progrès coupé dans l’app : enregistré', await ev(() => JSON.parse(localStorage.getItem('memo-gammes-v1')).settings.ntf.progress.app === false));
check('aucune erreur JS', (await ev(() => window.__cnt.consoleErrors)).length === 0, await ev(() => window.__cnt.consoleErrors));
await browser.close();
if (fails.length) { console.log('\nECHEC r11 :', fails); process.exit(1); }
console.log('\nr11 OK');
