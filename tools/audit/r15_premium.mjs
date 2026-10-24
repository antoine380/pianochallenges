// Premium (Oct 2026, preview until payments are live): off = nothing locked; on = locks on keys, types, songs, duels -> paywall;
// C18 grid read from the PREM_OFFER constant of the source: Monthly / Yearly (most chosen, trial) / Family, lifetime link, J0/J5/J7 timeline,
// launch price, generous free plan (freeDuels a day, the first freeSongs songs of the catalogue assets/js/songs-data.js); prices formatted per language (FR « 59,99 € », EN « €59.99 »);
// simulated trial unlocks everything; Settings › Subscription shows the grid; invitations (?ref= link, share sheet), a friend's link is remembered.
import { launch, closeOnboarding, URL } from './lib.mjs';
import fs from 'fs';
const SRC = fs.readFileSync(new globalThis.URL('../../src/piano-challenges.html', import.meta.url), 'utf8');
const O = Function('return ' + /const PREM_OFFER=(\{[\s\S]*?\n\});/.exec(SRC)[1])();
const CAT = (fs.readFileSync(new globalThis.URL('../../assets/js/songs-data.js', import.meta.url), 'utf8').match(/\bid:"([a-z]+)"/g) || []).map(x => x.slice(4, -1)); // catalogue order (C6)
const NSONGS = CAT.length, NFREE = Math.min(O.freeSongs, NSONGS), FREE = CAT.slice(0, NFREE);
const money = (v, fr) => { const w = Math.abs(v - Math.round(v)) < .005, d = w ? 0 : 2; return new Intl.NumberFormat(fr ? 'fr-FR' : 'en-IE', { style: 'currency', currency: O.currency, minimumFractionDigits: d, maximumFractionDigits: d }).format(w ? Math.round(v) : v); };
const norm = x => x.replace(/[\u00a0\u202f]/g, ' ');
const wait = (p, ms) => p.waitForTimeout(ms);
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d ? ' — ' + JSON.stringify(d) : '')); if (!ok) fails.push(n); };
const { browser, page } = await launch({ mode: 'ok' });
const errs = []; page.on('pageerror', e => errs.push(e.message));
const ev = (f, a) => page.evaluate(f, a), vis = id => ev(id => { const e = document.getElementById(id); return !!e && !e.hidden; }, id);
const setS = (f, a) => ev(f, a);
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
const grid = await ev(() => { const c = k => document.querySelector('.pw-col[data-p=' + k + ']'); return { n: document.querySelectorAll('.pw-col').length, m: c('month')?.textContent, y: c('year')?.textContent, f: c('family')?.textContent, best: !!c('year')?.classList.contains('best') && !!c('year').querySelector('.pw-badge'), go: c('year')?.querySelector('#pwGo')?.textContent, tl: [...document.querySelectorAll('.pw-tl li b')].map(b => b.textContent), life: document.getElementById('pwLife')?.textContent || '', launch: document.querySelector('.pw-launch')?.textContent || '', free: document.querySelector('.pw-free')?.textContent || '' }; });
for (const k of ['m', 'y', 'f', 'life', 'launch', 'free']) grid[k] = norm(grid[k] || '');
check('3 formules : Mensuel / Annuel / Famille aux prix de PREM_OFFER (FR)', grid.n === 3 && grid.m.includes(norm(money(O.month, 1))) && grid.y.includes(norm(money(O.year, 1))) && grid.f.includes(norm(money(O.family, 1))), grid);
check('annuel « Le plus choisi », prix par mois et essai ' + O.trialDays + ' jours', grid.best && grid.y.includes(norm(money(O.year / 12, 1)) + '/mois') && new RegExp(O.trialDays + ' jours').test(grid.go), grid);
check('Famille : ' + O.familyProfiles + ' profils', grid.f.includes(O.familyProfiles + ' profils'), grid.f);
check('frise J0 / J' + O.trialRemind + ' / J' + O.trialDays, JSON.stringify(grid.tl) === JSON.stringify(['J0', 'J' + O.trialRemind, 'J' + O.trialDays]), grid.tl);
check('lien « À vie » et prix de lancement garanti', (!O.life || grid.life.includes(norm(money(O.life, 1)))) && (!O.launchSeats || /garanti/.test(grid.launch)), [grid.life, grid.launch]);
check('gratuit généreux : ' + O.freeDuels + ' duels par jour, quiz illimité', grid.free.includes(O.freeDuels + ' duels par jour') && /quiz illimité/.test(grid.free), grid.free);
await page.keyboard.press('Escape'); await wait(page, 200);
check('Échap ferme le paywall', !(await vis('pw')));
await ev(() => document.querySelector('.mode-item[data-mode="play"]').click()); await wait(page, 1200); // catalogue (C6) loaded on demand
const LK = NSONGS - NFREE;
const pl = await ev(() => { const all = [...document.querySelectorAll('#playSongs .ptile[data-song]')]; return { all: [...new Set(all.map(e => e.dataset.song))], lk: [...new Set(all.filter(e => e.classList.contains('pw-lk')).map(e => e.dataset.song))] }; });
check('PLAY : les ' + NFREE + ' premiers morceaux du catalogue gratuits, ' + LK + ' verrouillés sur ' + NSONGS, NSONGS >= 30 && pl.all.length === NSONGS && pl.lk.length === LK && !FREE.some(id => pl.lk.includes(id)), { n: pl.all.length, lk: pl.lk.length, free: FREE });
if (LK) { await ev(() => document.querySelector('#playSongs .ptile.pw-lk').click()); await wait(page, 300);
  check('morceau verrouillé → paywall (pas de lecteur)', await vis('pw') && await ev(() => document.body.dataset.page !== 'play'));
  check('paywall : titre neutre et « ' + NFREE + ' morceaux » dans la formule gratuite', await ev(n => document.getElementById('pwH').textContent === 'Tout le piano, sans limite' && document.querySelector('.pw-free').textContent.includes(n + ' morceaux'), NFREE));
  await ev(() => document.getElementById('pwX').click()); await wait(page, 200); }
await ev(id => document.querySelector('#playSongs .ptile[data-song="' + id + '"]').click(), FREE[NFREE - 1]); await wait(page, 600);
check('morceau gratuit (' + FREE[NFREE - 1] + ') → lecteur, pas de paywall', !(await vis('pw')) && await ev(() => document.body.dataset.page === 'play'));
await ev(() => document.getElementById('homeLink').click()); await wait(page, 400);
// Settings › Subscription: free plan text and the grid
await ev(() => document.getElementById('setBtn').click()); await wait(page, 300); await ev(() => document.querySelector('#setNav [data-v="prem"]')?.click()); await wait(page, 200);
const sp = norm(await ev(() => document.getElementById('setPremBox').textContent));
check('Réglages › Abonnement : formule gratuite et grille (mensuel, annuel, famille, à vie)', sp.includes(O.freeDuels + ' duels par jour') && sp.includes(NFREE + ' morceaux') && [O.month, O.year, O.family].every(v => sp.includes(norm(money(v, 1)))), sp);
// English: prices formatted « €59.99 »
await setS(() => { const S = JSON.parse(localStorage.getItem('memo-gammes-v1')); S.settings.lang = 'en'; localStorage.setItem('memo-gammes-v1', JSON.stringify(S)); });
await page.reload(); await wait(page, 1000); await closeOnboarding(page, 'screen');
await ev(() => document.getElementById('premBtn').click()); await wait(page, 300);
const en = norm(await ev(() => document.querySelector('.pw-cols').textContent));
check('EN : prix « ' + money(O.year, 0) + ' »', en.includes(norm(money(O.year, 0))) && en.includes(norm(money(O.month, 0))) && /Most chosen/.test(en), en);
await page.keyboard.press('Escape'); await wait(page, 200);
await setS(() => { const S = JSON.parse(localStorage.getItem('memo-gammes-v1')); S.settings.lang = 'fr'; localStorage.setItem('memo-gammes-v1', JSON.stringify(S)); });
// duels: freeDuels a day
await setS(n => { const S = JSON.parse(localStorage.getItem('memo-gammes-v1')); const d = new Date(); S.duDay = { d: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'), n }; localStorage.setItem('memo-gammes-v1', JSON.stringify(S)); }, O.freeDuels);
await page.reload(); await wait(page, 1000); await closeOnboarding(page, 'screen');
await ev(() => document.querySelector('.mode-item[data-mode="games"]').click()); await wait(page, 300); await ev(() => document.querySelectorAll('#gameCards .ptile')[0].click()); await wait(page, 600); await closeOnboarding(page);
await ev(() => document.querySelector('#duModes [data-m=bots]').click()); await wait(page, 300);
const dd = await ev(() => JSON.parse(localStorage.getItem('memo-gammes-v1')).duDay);
check(O.freeDuels + ' duels joués aujourd’hui → paywall', await vis('pw') && /duels gratuits/.test(await ev(() => document.querySelector('.pw-why').textContent)), { dd, pw: await vis('pw') });
await ev(() => document.getElementById('pwGo').click()); await wait(page, 500);
const P = await ev(() => JSON.parse(localStorage.getItem('memo-gammes-v1')).prem);
check('essai simulé : ' + O.trialDays + ' jours', P && P.plan === 'year' && P.trialEnd - Date.now() > (O.trialDays - .1) * 864e5 && P.trialEnd - Date.now() <= O.trialDays * 864e5, P);
check('écran de bienvenue Premium', await ev(() => !!document.querySelector('.pw-ok')));
await ev(() => document.getElementById('pwOkGo').click()); await wait(page, 300);
await ev(() => document.querySelector('#duModes [data-m=bots]').click()); await wait(page, 300);
check('Premium : les duels repartent', !(await vis('pw')));
await learn('scales');
check('Premium : plus aucun verrou', await ev(() => !document.querySelector('.pw-chip')));
// lifetime link (simulated)
if (O.life) { await setS(() => { const S = JSON.parse(localStorage.getItem('memo-gammes-v1')); S.prem = {}; localStorage.setItem('memo-gammes-v1', JSON.stringify(S)); });
  await page.reload(); await wait(page, 1000); await closeOnboarding(page, 'screen');
  await ev(() => document.getElementById('premBtn').click()); await wait(page, 300); await ev(() => document.getElementById('pwLife').click()); await wait(page, 400);
  const L = await ev(() => JSON.parse(localStorage.getItem('memo-gammes-v1')).prem);
  check('« À vie » : accès simulé sans fin', L && L.plan === 'life' && L.until - Date.now() > 50 * 365 * 864e5, L);
  await ev(() => document.getElementById('pwOkGo').click()); await wait(page, 300); }
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
