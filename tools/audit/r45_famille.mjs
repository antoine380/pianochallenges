// Chantier FAMILLE ET PAIEMENT : offre Solo / Famille dans le paywall et Réglages › Abonnement (prix lus dans PREM_OFFER,
// économie de l'annuel et « soit X/mois » calculés, pas d'offre à vie), tableau Gratuit / Premium, « Ma famille » du titulaire
// (inviter, lien ?fam= de 8 caractères, limite de 4 personnes, retirer), rejoindre par le lien (invité → compte → « Rejoindre
// la famille de X »), quitter, droits par la famille (my_entitlement → Premium), repli sur my_premium sans la migration,
// retour de paiement ?go=premium&ok=1, paiement coupé = simulation (aucun appel à la fonction stripe), paiement branché
// (flags.payLive + clé publique pk_test_) = appel /functions/v1/stripe/checkout puis redirection vers Stripe.
// Faux Supabase : FAKE_FAM (tools/audit/fakesb.mjs). Aucun service en ligne. Captures : CAP=/home/claude/captures-famille
// Usage : PORT=8900 NODE_PATH=… PW_CHROMIUM=… node tools/audit/r45_famille.mjs
import { createRequire } from 'module';
import fs from 'fs';
import { FAKE_FAM } from './fakesb.mjs';
import { readSource } from '../source.mjs'; // source assemblée depuis src/app/ (voir src/app/README.md)
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = process.env.PORT || '8767', URL = `http://localhost:${PORT}/`, CAP = process.env.CAP || '/home/claude/captures-famille';
fs.mkdirSync(CAP, { recursive: true });
const SRC = readSource();
const O = Function('return ' + /const PREM_OFFER=(\{[\s\S]*?\n\});/.exec(SRC)[1])();
const money = (v, fr = 1) => { const w = Math.abs(v - Math.round(v)) < .005, d = w ? 0 : 2; return new Intl.NumberFormat(fr ? 'fr-FR' : 'en-IE', { style: 'currency', currency: O.currency, minimumFractionDigits: d, maximumFractionDigits: d }).format(w ? Math.round(v) : v).replace(/[  ]/g, ' '); };
const norm = x => String(x || '').replace(/[  ]/g, ' ');
const SAVE = Math.round((1 - O.year / (O.month * 12)) * 100);
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d !== undefined && !ok ? ' — ' + JSON.stringify(d).slice(0, 500) : '')); if (!ok) fails.push(n); };
const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const today = new Date(); const ds = x => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
const STATE = (o = {}) => ({ xp: 900, xpDays: { [ds(today)]: 40 }, gate: o.gate === undefined ? 'account' : o.gate, onb: { done: 1 }, tourDone: 1, langV2: true, netId: 'pabcd1234', pwShown: 1,
  introSeen: { scales: 1, chords: 1, harmony: 1, prog: 1, ear: 1, games: 1, daily: 1 }, stats: {}, mastery: {}, srs: {}, daily: {}, midi: { later: Date.now() }, goal: { kind: 'min', v: 10, asked: 1, at: 1 },
  settings: { lang: o.lang || 'fr', notation: o.lang || 'fr', input: 'screen', labels: true, uiSound: false, paywall: o.paywall !== false, ...(o.theme ? { theme: o.theme } : {}) } });
const D = 864e5, NOW = Date.now();
const U = id => ({ id, email: id + '@example.com', user_metadata: { full_name: id }, created_at: new Date(NOW - 90 * D).toISOString() });
const NAMES = { u1: ['Maman', 3], u2: ['Léo', 1], u3: ['Inès', 2], u4: ['Noé', 4], u5: ['Sam', 5] };
const famSrv = (members = [], extra = {}) => ({ names: NAMES, subs: { u1: { plan: 'family', status: 'active', until: NOW + 300 * D, store: 'stripe', product: 'family_year' } }, fams: { fu1: { owner: 'u1', seats: 4, members } }, invites: {}, ...extra });

async function open({ vp = { width: 1280, height: 800 }, fake = {}, st = STATE(), query = '', scheme = 'light', route } = {}) {
  const c = await b.newContext({ viewport: vp, hasTouch: vp.width < 900, colorScheme: scheme });
  await c.route('**/assets/js/supabase-*.js', r => r.fulfill({ status: 200, body: FAKE_FAM, headers: { 'content-type': 'application/javascript' } }));
  await c.route(u => u.href.startsWith(URL) && (u.pathname === '/' || u.pathname === '/index.html'), async r => { const res = await r.fetch(); let h = await res.text(); const e = h.lastIndexOf('})();\n</script>'); h = h.slice(0, e) + '\nwindow.__X=s=>eval(s);\n' + h.slice(e); await r.fulfill({ response: res, body: h, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  c.net = []; await c.route('https://ijdxeasxmgevuchyuenn.supabase.co/**', r => { c.net.push(r.request().url()); return route ? route(r) : r.abort(); });
  const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/net::ERR|Failed to load resource/.test(m.text())) p.errs.push(m.text()); });
  await p.addInitScript(`window.__FAKE=${JSON.stringify(fake)}; if(!sessionStorage.getItem('s')){ sessionStorage.setItem('s','1'); ${st ? `localStorage.setItem('memo-gammes-v1', ${JSON.stringify(JSON.stringify(st))});` : ''} ${fake.user ? "localStorage.setItem('sb-x-auth-token','1');" : ''} ${fake.rc ? `localStorage.setItem('pc-rc', ${JSON.stringify(JSON.stringify({ at: 1, rows: fake.rc }))});` : ''} }`);
  await p.goto(URL + query); await p.waitForFunction(() => !!window.__X, null, { timeout: 15000 }); await p.waitForTimeout(1600);
  p.X = s => p.evaluate(s => window.__X(s), s); p.ctx = c; return p;
}
const ev = (p, f, a) => p.evaluate(f, a);
const vis = (p, id) => ev(p, id => { const e = document.getElementById(id); return !!e && !e.hidden && e.getBoundingClientRect().width > 0; }, id);
async function setPrem(p) { await ev(p, () => document.getElementById('setBtn').click()); await p.waitForTimeout(300); await ev(p, () => document.querySelector('#setNav [data-v="prem"]').click()); await p.waitForTimeout(900); }
const famTxt = p => ev(p, () => document.getElementById('famBox')?.textContent || '');
const noScroll = p => ev(p, () => { const d = document.scrollingElement; return d.scrollHeight - d.clientHeight <= 1 && d.scrollWidth - d.clientWidth <= 1; });

// 1) l'offre : paywall Solo / Famille (FR), prix de PREM_OFFER, économie et prix par mois calculés, pas d'offre à vie
let p = await open({ fake: {} });
await ev(p, () => document.getElementById('premBtn').click()); await p.waitForTimeout(500);
const pw = await ev(p, () => { const c = k => document.querySelector('.pw-col[data-p=' + k + ']'); return { n: document.querySelectorAll('.pw-col').length, g: [...document.querySelectorAll('.pw-grp')].map(x => x.textContent), m: c('month')?.textContent, y: c('year')?.textContent, f: c('family')?.textContent, best: c('year')?.classList.contains('best'), life: !!document.getElementById('pwLife'), all: document.querySelector('.pw-card').textContent, cmp: [...document.querySelectorAll('.pw-cmp tr')].map(r => [...r.children].map(x => x.textContent)), dots: c('family')?.querySelectorAll('.pw-fam i').length, note: !!document.querySelector('.pw-note') }; });
['m', 'y', 'f', 'all'].forEach(k => pw[k] = norm(pw[k]));
check('paywall : 3 formules, groupes « Solo · 1 personne » et « Famille · jusqu’à ' + O.familySeats + ' personnes »', pw.n === 3 && pw.g[0] === 'Solo · 1 personne' && pw.g[1] === 'Famille · jusqu\'à ' + O.familySeats + ' personnes', pw.g);
check('prix de PREM_OFFER : Solo mensuel ' + money(O.month) + ', Solo annuel ' + money(O.year) + ', Famille ' + money(O.family), pw.m.includes('Solo mensuel') && pw.m.includes(money(O.month)) && pw.y.includes('Solo annuel') && pw.y.includes(money(O.year)) && pw.f.includes(money(O.family)), [pw.m, pw.y, pw.f]);
check('annuel : « soit » ' + money(O.year / 12) + '/mois et −' + SAVE + ' % calculés, essai ' + O.trialDays + ' jours, « Le plus choisi »', pw.best && pw.y.includes(money(O.year / 12) + '/mois') && pw.y.includes('−' + SAVE + ' %') && pw.y.includes(O.trialDays + ' jours'), pw.y);
check('Famille : « Jusqu’à ' + O.familySeats + ' personnes, chacun son compte et sa progression » + ' + O.familySeats + ' visages', pw.f.includes('Jusqu\'à ' + O.familySeats + ' personnes, chacun son compte et sa progression') && pw.dots === O.familySeats, pw.f);
check('aucune offre à vie (ni lien, ni texte)', !pw.life && !/à vie|vie :|Lifetime/i.test(pw.all), pw.all.match(/.{20}vie.{20}/));
check('tableau Gratuit / Premium : tonalités, types, morceaux, duels, quiz', pw.cmp.length === 6 && pw.cmp[0][1] === 'Gratuit' && pw.cmp[0][2] === 'Premium' && pw.cmp[1][1] === 'Simples' && pw.cmp[2][1] === String(O.freeTypes) && pw.cmp[4][1] === O.freeDuels + ' par jour', pw.cmp);
check('paiement coupé : mention « aperçu »', pw.note);
for (const [w, h] of [[1280, 800], [1024, 768], [768, 1024], [812, 375], [375, 667]]) { await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(250); await p.screenshot({ path: `${CAP}/paywall_${w}x${h}.png` }); }
await p.setViewportSize({ width: 1280, height: 800 });
// le choix d'une formule simule (aucun appel au serveur de paiement)
await ev(p, () => document.querySelector('.pw-col[data-p=family] .pw-pick').click()); await p.waitForTimeout(400);
const sim = await ev(p, () => ({ ok: !!document.querySelector('.pw-ok'), txt: document.querySelector('.pw-ok p')?.textContent, plan: JSON.parse(localStorage.getItem('memo-gammes-v1')).prem?.plan }));
check('paiement coupé : Famille simulée, message « Invite jusqu’à ' + (O.familySeats - 1) + ' personnes »', sim.ok && sim.plan === 'family' && sim.txt.includes('Invite jusqu\'à ' + (O.familySeats - 1)) && !p.ctx.net.some(u => /functions\/v1\/stripe/.test(u)), sim);
await ev(p, () => document.getElementById('pwOkGo').click()); await p.waitForTimeout(300);
await ev(p, () => { const S = JSON.parse(localStorage.getItem('memo-gammes-v1')); S.prem = {}; localStorage.setItem('memo-gammes-v1', JSON.stringify(S)); });
await p.reload(); await p.waitForTimeout(1500);
await setPrem(p);
const sp = norm(await ev(p, () => document.getElementById('setPremBox').textContent));
check('Réglages › Abonnement : Solo mensuel / Solo annuel / Famille (jusqu’à ' + O.familySeats + ') + tableau, pas d’« À vie »', ['Solo mensuel', 'Solo annuel', 'Famille'].every(x => sp.includes(x)) && [O.month, O.year, O.family].every(v => sp.includes(money(v))) && sp.includes('jusqu\'à ' + O.familySeats) && /GratuitPremium/.test(sp) && !/vie/i.test(sp), sp);
check('aucune erreur (offre FR)', !p.errs.length, p.errs);
await p.ctx.close();
// EN
p = await open({ st: STATE({ lang: 'en' }), scheme: 'dark' });
await ev(p, () => document.getElementById('premBtn').click()); await p.waitForTimeout(500);
const en = norm(await ev(p, () => document.querySelector('.pw-card').textContent));
check('EN : Solo / Family, « Up to ' + O.familySeats + ' people », prix ' + money(O.year, 0) + ', « Save ' + SAVE + '% a year »', en.includes('Solo · 1 person') && en.includes('Family · up to ' + O.familySeats + ' people') && en.includes('Up to ' + O.familySeats + ' people, each with their own account and progress') && en.includes(money(O.year, 0)) && en.includes('Save ' + SAVE + '% a year') && !/lifetime/i.test(en), en.slice(0, 600));
await p.screenshot({ path: `${CAP}/paywall_en_1280_dark.png` });
check('aucune erreur (EN)', !p.errs.length, p.errs);
await p.ctx.close();

// 2) titulaire Famille : Premium par son abonnement, « Ma famille » 1/4, inviter (lien ?fam= de 8 caractères)
p = await open({ fake: { user: U('u1'), srv: famSrv() } });
check('titulaire : droits lus par my_entitlement → Premium (aucun verrou)', await p.X('isPremium() && premEnt() && premEnt().source==="self"') && await ev(p, () => document.getElementById('premBtn').hidden));
await setPrem(p);
let ft = await famTxt(p);
check('Ma famille : titulaire seul, 1 / ' + O.familySeats + ', bouton « Inviter »', /Ma famille/.test(ft) && ft.includes('1 / ' + O.familySeats) && /Maman/.test(ft) && /Titulaire/.test(ft) && await vis(p, 'famInv'), ft);
check('statut : « Premium actif · Famille » et « Gérer mon abonnement »', /Premium actif · Famille/.test(await ev(p, () => document.querySelector('.sp-st').textContent)) && /Gérer mon abonnement/.test(await ev(p, () => document.getElementById('spSee').textContent)));
await ev(p, () => document.getElementById('famInv').click()); await p.waitForTimeout(600);
const link = await ev(p, () => document.getElementById('famLink')?.value || '');
check('Inviter : lien https://pianochallenges.com/?fam=<8 caractères>, Copier, Partager, validité', /^https:\/\/pianochallenges\.com\/\?fam=[A-HJ-NP-Z2-9]{8}$/.test(link) && await vis(p, 'famCopy') && await vis(p, 'famShare') && /valable jusqu/.test(await famTxt(p)), link);
await p.screenshot({ path: `${CAP}/ma_famille_1280.png` });
for (const [w, h] of [[1024, 768], [375, 667]]) { await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(300); await p.screenshot({ path: `${CAP}/ma_famille_${w}x${h}.png` }); check(`Ma famille ${w}×${h} : pas de défilement de la page`, await noScroll(p)); }
await p.setViewportSize({ width: 1280, height: 800 });
const code = link.split('=')[1];
const srvAfter = await ev(p, () => window.__SRV);
check('aucune erreur (titulaire)', !p.errs.length, p.errs);
await p.ctx.close();

// 3) un invité ouvre le lien : « On t'invite… » → se connecte → « Rejoindre la famille de Maman » → Premium par la famille
p = await open({ fake: { srv: srvAfter }, query: '?fam=' + code.toLowerCase() });
check('lien ?fam= retiré de l’adresse et gardé en attente', !/fam=/.test(await p.evaluate(() => location.search)) && await p.X('famPending()===' + JSON.stringify(code)));
check('invité : fenêtre « On t’invite dans une famille » avec Créer un compte / Se connecter', await vis(p, 'famJoin') && /On t'invite dans une famille/.test(await ev(p, () => document.getElementById('famJoin').textContent)) && await vis(p, 'fjUp') && await vis(p, 'fjIn'));
check('paiement coupé : pas de « Premium pour toi aussi » dans #famJoin', !/Premium/.test(await ev(p, () => document.getElementById('famJoin').textContent)));
check('#famJoin ouverte : le menu et la page restent inertes même si pwInert() passe', await p.X('pwInert(), $("side").inert && $("shell").inert && anyWin()'));
await p.screenshot({ path: `${CAP}/rejoindre_invite_375.png` }).catch(() => {});
await ev(p, () => document.getElementById('fjUp').click()); await p.waitForTimeout(500);
check('« Créer un compte » : écran de compte, sans la mention .gt-fam tant que le paiement est coupé', await ev(p, () => !document.getElementById('gate').hidden && !document.querySelector('#gate .gt-fam')));
// la connexion réussit (faux SDK) : setUser → la fenêtre « Rejoindre la famille de Maman »
await p.X('(async()=>{ await ensureCloud(); window.__fakeLogin(' + JSON.stringify(U('u5')) + '); })()'); await p.waitForTimeout(2600);
const ask = await ev(p, () => ({ v: !document.getElementById('famJoin')?.hidden, t: document.getElementById('famJoin')?.textContent || '' }));
check('connecté : « Rejoindre la famille de Maman », 1 / ' + O.familySeats + ' personnes', ask.v && /Rejoindre la famille de Maman/.test(ask.t) && ask.t.includes('1 / ' + O.familySeats + ' personnes') && /gardes ton compte/.test(ask.t), ask);
await p.screenshot({ path: `${CAP}/rejoindre_1280.png` });
await p.setViewportSize({ width: 375, height: 667 }); await p.waitForTimeout(250); await p.screenshot({ path: `${CAP}/rejoindre_375x667.png` }); await p.setViewportSize({ width: 1280, height: 800 });
await ev(p, () => document.getElementById('fjGo').click()); await p.waitForTimeout(900);
check('Rejoindre : « Bienvenue dans la famille de Maman ! », Premium par la famille', /Bienvenue dans la famille de Maman/.test(await ev(p, () => document.getElementById('famJoin').textContent)) && await p.X('premEnt() && premEnt().source==="family" && isPremium()'));
await ev(p, () => document.getElementById('fjOk').click()); await p.waitForTimeout(300);
check('le lien en attente est oublié après avoir rejoint', await p.X('famPending()===null'));
await setPrem(p);
ft = await famTxt(p);
check('membre : « Tu fais partie de la famille de Maman », 2 / ' + O.familySeats + ', « Quitter la famille », pas d’invitation', /Tu fais partie de la famille de Maman/.test(ft) && ft.includes('2 / ' + O.familySeats) && await vis(p, 'famLeave') && !(await vis(p, 'famInv')) && /Premium avec la famille de Maman/.test(await ev(p, () => document.querySelector('.sp-st').textContent)), ft);
await p.screenshot({ path: `${CAP}/membre_1280.png` });
await ev(p, () => document.getElementById('famLeave').click()); await p.waitForTimeout(200);
check('Quitter : demande confirmation (2e clic)', /Confirmer/.test(await ev(p, () => document.getElementById('famLeave').textContent)));
await ev(p, () => document.getElementById('famLeave').click()); await p.waitForTimeout(1000);
check('Quitter : plus de famille, plus de Premium partagé', !(await ev(p, () => !!document.getElementById('famBox'))) && await p.X('!premEnt() && !isPremium()'));
check('aucune erreur (rejoindre, quitter)', !p.errs.length, p.errs);
await p.ctx.close();

// 4) limite de 4 personnes : titulaire + 2 membres → une invitation, un 3e rejoint, plus de place ; un 5e est refusé
let srv = famSrv(['u2', 'u3']);
p = await open({ fake: { user: U('u1'), srv } });
await setPrem(p);
check('3 / ' + O.familySeats + ' : « 1 place restante »', (await famTxt(p)).includes('3 / ' + O.familySeats) && /1 place restante/.test(await famTxt(p)));
await ev(p, () => document.getElementById('famInv').click()); await p.waitForTimeout(600);
const code2 = (await ev(p, () => document.getElementById('famLink').value)).split('=')[1];
srv = await ev(p, () => window.__SRV); await p.ctx.close();
p = await open({ fake: { user: U('u4'), srv }, query: '?fam=' + code2 });
await p.waitForTimeout(1500);
await ev(p, () => document.getElementById('fjGo')?.click()); await p.waitForTimeout(900);
check('le 4e rejoint (4 / 4)', await p.X('premEnt() && premEnt().source==="family"'));
srv = await ev(p, () => window.__SRV); await p.ctx.close();
p = await open({ fake: { user: U('u1'), srv } });
await setPrem(p);
check('famille complète : « Famille complète » grisé, 4 / 4', (await famTxt(p)).includes('4 / 4') && await ev(p, () => document.getElementById('famInv').disabled && /complète/.test(document.getElementById('famInv').textContent)));
await p.screenshot({ path: `${CAP}/famille_complete_1024.png` });
// retirer Inès (deux clics)
await ev(p, () => document.querySelector('.fam-rm[data-u="u3"]').click()); await p.waitForTimeout(150);
check('Retirer : confirmation au 2e clic', /Confirmer/.test(await ev(p, () => document.querySelector('.fam-rm[data-u="u3"]').textContent)));
await ev(p, () => document.querySelector('.fam-rm[data-u="u3"]').click()); await p.waitForTimeout(900);
check('Retirer : 3 / 4, Inès n’est plus là, une place se libère', (await famTxt(p)).includes('3 / 4') && !/Inès/.test(await famTxt(p)) && !(await ev(p, () => document.getElementById('famInv').disabled)));
check('aucune erreur (limite, retirer)', !p.errs.length, p.errs);
srv = await ev(p, () => window.__SRV); await p.ctx.close();
// 5e personne avec un vieux lien sur une famille pleine (on remet Inès) : refus clair
srv.fams.fu1.members.push('u3'); srv.invites.ABCDEFGH = { fam: 'fu1', exp: NOW + D, used: null };
p = await open({ fake: { user: U('u5'), srv }, query: '?fam=ABCDEFGH' });
await p.waitForTimeout(1200);
check('5e personne : « Cette famille est complète. », pas de bouton Rejoindre', /Cette famille est complète/.test(await ev(p, () => document.getElementById('famJoin')?.textContent || '')) && !(await vis(p, 'fjGo')));
await ev(p, () => document.getElementById('fjOk').click()); await p.waitForTimeout(200);
check('aucune erreur (5e personne)', !p.errs.length, p.errs);
await p.ctx.close();

// 5) premier lancement avec un lien de famille : l'écran de compte (pas « Joue ta première note »), avec la mention
p = await open({ st: null, query: '?fam=ABCDEFGH' });
check('premier lancement + ?fam= : écran de compte « Crée ton compte » (sans .gt-fam, paiement coupé)', await ev(p, () => !document.getElementById('gate').hidden && !document.querySelector('.fn-card') && !document.querySelector('#gate .gt-fam')));
await p.screenshot({ path: `${CAP}/premier_lancement_fam_768x1024.png` });
await p.ctx.close();

// 6) sans la migration (my_entitlement absente) : repli sur my_premium, sans erreur
p = await open({ fake: { user: U('u2'), noEnt: true, srv: { grants: { u2: NOW + 20 * D } } } });
check('sans my_entitlement : repli sur my_premium (mois offert)', await p.X('isPremium() && !premEnt() && (S.prem||{}).gift>Date.now()') && (await p.X('JSON.stringify(window.__FAKE.calls)')).includes('my_premium'));
check('aucune erreur (repli)', !p.errs.length, p.errs);
await p.ctx.close();

// 7) retour de Stripe : /?go=premium&ok=1 → confirmation quand le webhook a écrit l'abonnement
p = await open({ fake: { user: U('u1'), srv: famSrv() }, query: '?go=premium&ok=1' });
await p.waitForTimeout(1500);
check('?go=premium&ok=1 : écran « Bienvenue dans Premium ! », adresse nettoyée', await ev(p, () => !!document.querySelector('#pw .pw-ok') && !/ok=|go=/.test(location.search)));
await p.ctx.close();

// 8) paiement branché (flags.payLive + clé publique de test) : appel à la fonction stripe puis redirection vers Stripe Checkout
let body = null, redir = null;
p = await open({ fake: { user: U('u5'), srv: { names: NAMES }, rc: [{ key: 'flags', value: { payLive: true } }, { key: 'pay', value: { stripe_pk: 'pk_test_51Abcdefghijklmnop' } }] },
  route: r => { const u = r.request().url(); if (/functions\/v1\/stripe\/checkout/.test(u)) { body = r.request().postDataJSON(); return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: 'https://checkout.stripe.com/c/pay/cs_test_123' }) }); } return r.abort(); } });
await p.ctx.route('https://checkout.stripe.com/**', r => { redir = r.request().url(); return r.fulfill({ status: 200, contentType: 'text/html', body: '<p>stripe</p>' }); });
check('paiement branché : payLive() et clé publique lues dans app_config', await p.X('payLive() && payWebReady()'));
await ev(p, () => document.getElementById('premBtn').click()); await p.waitForTimeout(400);
check('paiement branché : pas de mention « aperçu »', !(await ev(p, () => !!document.querySelector('#pw .pw-note'))));
await ev(p, () => document.querySelector('.pw-col[data-p=year] .pw-pick').click()); await p.waitForTimeout(1500);
check('Solo annuel → POST /functions/v1/stripe/checkout {plan:"solo_year"} puis redirection vers checkout.stripe.com', body && body.plan === 'solo_year' && /checkout\.stripe\.com\/c\/pay\/cs_test_123/.test(redir || ''), { body, redir });
await p.ctx.close();
// invité + paiement branché : on lui demande un compte d'abord
p = await open({ fake: { rc: [{ key: 'flags', value: { payLive: true } }, { key: 'pay', value: { stripe_pk: 'pk_test_51Abcdefghijklmnop' } }] } });
await ev(p, () => document.getElementById('premBtn').click()); await p.waitForTimeout(400);
await ev(p, () => document.querySelector('.pw-col[data-p=month] .pw-pick').click()); await p.waitForTimeout(600);
check('invité + paiement branché : écran de compte d’abord, aucun appel à Stripe', await ev(p, () => !document.getElementById('gate').hidden) && !p.ctx.net.some(u => /functions\/v1\/stripe/.test(u)));
await p.ctx.close();

// 9) paiement branché + ?fam= au premier lancement : la mention .gt-fam revient
p = await open({ st: null, query: '?fam=ABCDEFGH', fake: { rc: [{ key: 'flags', value: { payLive: true } }] } });
check('paiement branché + ?fam= : mention .gt-fam sur l’écran de compte', await ev(p, () => !document.getElementById('gate').hidden && !!document.querySelector('#gate .gt-fam')));
await p.ctx.close();
// 10) une seule fenêtre à la fois : #famJoin attend que le bilan de la semaine soit fermé, et le bilan n'ouvre pas par-dessus #famJoin
p = await open({ fake: { user: U('u5'), srv: famSrv() } });
await p.X('localStorage.setItem(FAMJ_KEY, JSON.stringify({c:"ABCDEFGH", at:Date.now()})); wkOpen(); famBoot();'); await p.waitForTimeout(400);
check('bilan de la semaine ouvert : #famJoin ne s’ouvre pas par-dessus', await vis(p, 'wkModal') && !(await vis(p, 'famJoin')));
await ev(p, () => document.getElementById('wkGo').click()); await p.waitForTimeout(2600);
check('bilan fermé : #famJoin s’ouvre ensuite', await vis(p, 'famJoin') && !(await vis(p, 'wkModal')));
await p.X('S.wkRev={}; wkCheck()'); await p.waitForTimeout(300);
check('#famJoin ouverte : le bilan de la semaine attend (anyModal)', !(await vis(p, 'wkModal')) && await p.X('anyModal()'));
await ev(p, () => document.getElementById('fjLater')?.click() || document.getElementById('fjOk')?.click()); await p.waitForTimeout(300);
check('#famJoin fermée : menu de nouveau actif', await p.X('!$("side").inert && !$("shell").inert && !document.body.classList.contains("fj-on")'));
check('aucune erreur (une fenêtre à la fois)', !p.errs.length, p.errs);
await p.ctx.close();

await b.close();
console.log(fails.length ? `\nr45 FAIL ${fails.length}` : '\nr45 OK');
process.exit(fails.length ? 1 : 0);
