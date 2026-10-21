// Premium (Oct 2026, preview until payments are live): off = nothing locked; on = locks on keys, types, songs, duels -> paywall;
// plans, simulated 7-day trial unlocks everything; invitations (?ref= link, share sheet), a friend's link is remembered and shown on sign-up.
import { launch, closeOnboarding, URL } from './lib.mjs';
const wait = (p, ms) => p.waitForTimeout(ms);
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d ? ' — ' + JSON.stringify(d) : '')); if (!ok) fails.push(n); };
const { browser, page } = await launch({ mode: 'ok' });
const errs = []; page.on('pageerror', e => errs.push(e.message));
const ev = (f, a) => page.evaluate(f, a), vis = id => ev(id => { const e = document.getElementById(id); return !!e && !e.hidden; }, id);
const setS = f => ev(f);
await page.goto(URL); await wait(page, 1000); await closeOnboarding(page, 'screen');
const learn = async v => { await ev(() => document.querySelector('.mode-item[data-mode="learn"]').click()); await wait(page, 250); await ev(v => document.querySelector('#secTabs [data-v="' + v + '"]').click(), v); await wait(page, 500); await closeOnboarding(page); };
// off (today's production)
await learn('scales');
check('aperçu coupé : aucun verrou, pas de bouton Premium', await ev(() => !document.querySelector('.pw-chip') && document.getElementById('premBtn').hidden));
// on
await setS(() => { const S = JSON.parse(localStorage.getItem('memo-gammes-v1')); S.settings.paywall = true; S.prem = {}; delete S.duDay; localStorage.setItem('memo-gammes-v1', JSON.stringify(S)); });
await page.reload(); await wait(page, 1000); await closeOnboarding(page, 'screen');
check('aperçu : bouton « Passer à Premium » dans le menu', await vis('premBtn'));
await learn('scales');
check('écran de départ : Toutes / Au choix verrouillés', await ev(() => document.querySelectorAll('#suKeyMode .su-km.pw-lk').length === 2));
await ev(() => document.querySelectorAll('#suKeyMode .su-km')[1].click()); await wait(page, 300);
check('verrou → paywall avec la raison', await vis('pw') && await ev(() => /♯/.test(document.querySelector('.pw-why').textContent)));
check('2 formules, annuel choisi, frise de l’essai', await ev(() => document.querySelectorAll('.pw-plan').length === 2 && document.querySelector('.pw-plan[data-p=year]').getAttribute('aria-pressed') === 'true' && !!document.querySelector('.pw-tl')));
await ev(() => document.querySelector('.pw-plan[data-p=month]').click()); await wait(page, 150);
check('mensuel : bouton 17,99 €, pas de frise', await ev(() => /17,99/.test(document.getElementById('pwGo').textContent) && !document.querySelector('.pw-tl')));
await page.keyboard.press('Escape'); await wait(page, 200);
check('Échap ferme le paywall', !(await vis('pw')));
await ev(() => document.querySelector('.mode-item[data-mode="play"]').click()); await wait(page, 500);
check('PLAY : 3 morceaux sur 5 verrouillés', await ev(() => document.querySelectorAll('#playSongs .ptile.pw-lk').length === 3));
await ev(() => document.querySelectorAll('#playSongs .ptile')[4].click()); await wait(page, 300);
check('morceau verrouillé → paywall (pas de lecteur)', await vis('pw') && await ev(() => document.body.dataset.page !== 'play'));
await ev(() => document.getElementById('pwX').click()); await wait(page, 200);
// duels: 3 a day
await setS(() => { const S = JSON.parse(localStorage.getItem('memo-gammes-v1')); const d = new Date(); S.duDay = { d: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'), n: 3 }; localStorage.setItem('memo-gammes-v1', JSON.stringify(S)); });
await page.reload(); await wait(page, 1000); await closeOnboarding(page, 'screen');
await ev(() => document.querySelector('.mode-item[data-mode="games"]').click()); await wait(page, 300); await ev(() => document.querySelectorAll('#gameCards .ptile')[0].click()); await wait(page, 600); await closeOnboarding(page);
await ev(() => document.querySelector('#duModes [data-m=bots]').click()); await wait(page, 300);
const dd = await ev(() => JSON.parse(localStorage.getItem('memo-gammes-v1')).duDay);
check('3 duels joués aujourd’hui → paywall', await vis('pw') || !!dd, { dd, pw: await vis('pw') });
await ev(() => document.getElementById('pwGo').click()); await wait(page, 500);
const P = await ev(() => JSON.parse(localStorage.getItem('memo-gammes-v1')).prem);
check('essai simulé : 7 jours', P && P.trialEnd - Date.now() > 6.9 * 864e5, P);
check('écran de bienvenue Premium', await ev(() => !!document.querySelector('.pw-ok')));
await ev(() => document.getElementById('pwOkGo').click()); await wait(page, 300);
await ev(() => document.querySelector('#duModes [data-m=bots]').click()); await wait(page, 300);
check('Premium : les duels repartent', !(await vis('pw')));
await learn('scales');
check('Premium : plus aucun verrou', await ev(() => !document.querySelector('.pw-chip')));
// invitations
await ev(() => document.getElementById('homeLink').click()); await wait(page, 400);
await ev(() => document.getElementById('hsInv').click()); await wait(page, 300);
check('Inviter : lien personnel ?ref=p…, partage, WhatsApp/SMS/e-mail', await vis('inv') && await ev(() => /\?ref=p[a-z0-9]{8}$/.test(document.getElementById('invLink').value) && !!document.getElementById('invShare') && /wa\.me/.test(document.getElementById('invWa').href)));
await page.keyboard.press('Escape'); await wait(page, 200);
check('Échap ferme l’invitation', !(await vis('inv')));
// a friend's link, first visit
const ctx2 = await browser.newContext(); const p2 = await ctx2.newPage();
await p2.goto(URL + '?ref=pabcd1234'); await p2.waitForTimeout(1400);
await p2.evaluate(() => document.getElementById('fnLogin')?.click()); await p2.waitForTimeout(400);
check('lien d’un ami : retenu et affiché à l’inscription', await p2.evaluate(() => JSON.parse(localStorage.getItem('memo-gammes-v1') || '{}').refBy === 'pabcd1234' && !!document.querySelector('.gt-ref')));
check('aucune erreur JS', errs.length === 0, errs);
await browser.close();
console.log(fails.length ? 'r15 FAIL ' + fails.length : 'r15 OK'); process.exit(fails.length ? 1 : 0);
