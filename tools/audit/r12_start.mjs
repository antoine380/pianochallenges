// Start flow (Oct 2026): sign-in screen on the first visit (guest button), 5 onboarding questions that set the app up, guided tour (next / close),
// nothing shown again on the next visit; skip buttons; the tour can be replayed from Settings.
import { launch, URL, INIT } from './lib.mjs';
const wait = (p, ms) => p.waitForTimeout(ms);
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d ? ' — ' + JSON.stringify(d) : '')); if (!ok) fails.push(n); };
const { browser, page } = await launch({ mode: 'ok' });
const ev = (f, a) => page.evaluate(f, a), vis = id => ev(id => { const e = document.getElementById(id); return !!e && !e.hidden; }, id);
// 1. first launch (Oct 2026): play a first note as a guest, no form first
{ const c = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'fr-FR' }); await c.addInitScript(INIT.replace('${MODE}', 'ok')); const p = await c.newPage();
  const e = (f, a) => p.evaluate(f, a); await p.goto(URL); await p.waitForTimeout(1500);
  check('premier lancement : « Joue ta première note », pas de formulaire', await e(() => !!document.querySelector('.fn-card') && !document.getElementById('gtEmail')));
  check('clavier MIDI détecté et choisi, 3 niveaux', await e(() => document.querySelector('.fn-in[data-v=midi]').getAttribute('aria-pressed') === 'true' && /Fake/.test(document.querySelector('.fn-in[data-v=midi] small').textContent) && document.querySelectorAll('.fn-lv button').length === 3));
  await e(() => window.__midi.noteOn(62)); await p.waitForTimeout(150);
  check('mauvaise note : on dit laquelle et où est le Do', await e(() => /Presque/.test(document.querySelector('#fnPrompt small').textContent)));
  await e(() => window.__midi.noteOn(60)); await p.waitForTimeout(300);
  check('un Do : bravo et bouton pour continuer', await e(() => /Bravo/.test(document.querySelector('#fnPrompt').textContent) && !document.getElementById('fnGo').hidden));
  await e(() => window.__midi.noteOn(72)); await p.waitForTimeout(1500);
  const S0 = await e(() => JSON.parse(localStorage.getItem('memo-gammes-v1')));
  check('un 2e Do : premier exercice d’accords lancé, invité, sans tutoriel', await e(() => document.body.dataset.page === 'practice' && /Majeur/.test(document.getElementById('prompt').textContent)) && S0.gate === 'guest' && S0.onb && S0.onb.done && S0.tourDone === 1 && S0.settings.input === 'midi', { gate: S0.gate, input: S0.settings.input });
  await p.reload(); await p.waitForTimeout(1200);
  check('visite suivante : plus de premier écran', await e(() => !document.querySelector('.fn-card')));
  await c.close(); }
// 2. "Sign in" from the first screen: the sign-in form, then the full questionnaire when continuing as a guest
await page.goto(URL); await wait(page, 1500);
await ev(() => document.getElementById('fnLogin').click()); await wait(page, 300);
check('« Se connecter » : écran de connexion façon chess.com, en mode Se connecter', await vis('gate') && await ev(() => !!document.querySelector('.gt-choose') && /Connecte-toi/.test(document.querySelector('.gt-h').textContent)));
check('écran : « Continuer avec l’e-mail » d’abord, puis Google / Apple / Facebook, bascule et « Continuer sans compte »', await ev(() => !!document.getElementById('gtEmailGo') && document.querySelectorAll('.gt-s').length === 3 && !!document.getElementById('gtSwitch') && !!document.getElementById('gateGuest') && !document.getElementById('gtEmail')));
await ev(() => document.getElementById('gtSwitch').click()); await wait(page, 100);
check('bascule : « Crée ton compte Piano Challenges »', await ev(() => /Crée ton compte/.test(document.querySelector('.gt-h').textContent)));
await ev(() => document.getElementById('gtEmailGo').click()); await wait(page, 150);
check('« Continuer avec l’e-mail » : formulaire e-mail + mot de passe, retour « Autres options »', await ev(() => !!document.getElementById('gtEmail') && !!document.getElementById('gtPwd') && !!document.getElementById('gtBack') && !!document.getElementById('gateGuest')));
await ev(() => document.querySelector('.gt-tabs [data-m=login]').click()); await wait(page, 100);
check('onglet Se connecter : pas de prénom ni de case à cocher', await ev(() => !document.getElementById('gtName') && !document.getElementById('gtOk')));
await ev(() => document.querySelector('.gt-tabs [data-m=signup]').click()); await wait(page, 100);
await page.fill('#gtEmail', 'pas-un-mail'); await page.fill('#gtPwd', '123'); await ev(() => document.getElementById('gtGo').click()); await wait(page, 100);
check('validation : message d’erreur', await ev(() => document.getElementById('gtMsg').classList.contains('err')));
await ev(() => document.getElementById('gtBack').click()); await wait(page, 100);
check('« Autres options » : retour au choix', await ev(() => !!document.getElementById('gtEmailGo')));
await ev(() => document.getElementById('gateGuest').click()); await wait(page, 400);
check('invité : onboarding question 1', !(await vis('gate')) && await vis('onb') && await ev(() => /1/.test(document.querySelector('.onb-k').textContent)));
const pick = i => ev(i => document.querySelectorAll('.onb-opt')[i].click(), i);
await pick(1); await pick(2); await ev(() => document.getElementById('onbNext').click()); await wait(page, 200);
await pick(0); await wait(page, 500);   // level: beginner (moves on by itself)
check('question 3 : lire les notes sur une portée', await ev(() => document.querySelectorAll('.onb-opt').length === 3 && /portée/.test(document.querySelector('.onb-h').textContent)));
await pick(0); await wait(page, 500);   // reads music: yes
const how = await ev(() => [...document.querySelectorAll('.onb-opt b')].map(b => b.textContent));
check('question 4 : les façons de jouer', how.length >= 2, how);
await ev(() => [...document.querySelectorAll(".onb-opt")].pop().click()); await wait(page, 500);   // screen (last)
await pick(1); await wait(page, 500);   // notes + chords
check('question 6 : inviter des amis (lien)', await ev(() => /\?ref=p/.test(document.querySelector('.onb-link input').value)));
await ev(() => document.getElementById('onbNext').click()); await wait(page, 200);
check('résumé : programme prêt', await ev(() => document.querySelectorAll('.onb-li').length >= 3));
await ev(() => document.getElementById('onbNext').click()); await wait(page, 800);
const S1 = await ev(() => JSON.parse(localStorage.getItem('memo-gammes-v1')));
check('réglages appliqués (débutant, écran, accords)', S1.onb.level === 'debut' && S1.settings.guideK === true && S1.settings.fing === true && S1.settings.gmCont === 'chords' && S1.eloStart === 600 && S1.settings.staff === true, { onb: S1.onb, input: S1.settings.input });
check('tutoriel : bulle sur LEARN', await vis('tour') && await ev(() => document.getElementById('tourH').textContent === 'LEARN'));
await ev(() => document.getElementById('tourNext').click()); await wait(page, 350);
check('Suivant : bulle sur GAMES', await ev(() => document.getElementById('tourH').textContent === 'GAMES'));
await ev(() => document.getElementById('tourX').click()); await wait(page, 200);
check('croix : tutoriel fermé et mémorisé', !(await vis('tour')) && await ev(() => JSON.parse(localStorage.getItem('memo-gammes-v1')).tourDone === 1));
check('mode de jeu appliqué après le tutoriel (écran)', await ev(() => JSON.parse(localStorage.getItem('memo-gammes-v1')).settings.input === 'screen'));
await page.reload(); await wait(page, 1500);
check('deuxième visite : plus rien ne s’affiche', !(await vis('gate')) && !(await vis('onb')) && !(await vis('tour')));
await ev(() => document.getElementById('setBtn').click()); await wait(page, 300); await ev(() => document.getElementById('tourAgain').click()); await wait(page, 600);
check('Réglages : revoir la présentation', await vis('tour'));
// guests: « S'inscrire » / « Se connecter » at the top (and in the side menu), they open the sign-in screen in the right mode
for (const k of ['#onbSkip', '#tourX']) for (let i = 0; i < 6; i++) { if (await page.isVisible(k)) await page.click(k); await wait(page, 150); }
check('invité : « S’inscrire » et « Se connecter » en haut et dans le menu', await ev(() => { const v = s => { const e = document.querySelector(s); return !!e && !!e.offsetParent; };
  return v('#topAuth [data-auth=signup]') && v('#topAuth [data-auth=login]') && (v('#sideAuth [data-auth=signup].btn') || v('#sideAuthIc')) && !v('#accountBtn'); }));
await ev(() => document.querySelector('#topAuth [data-auth=login]').click()); await wait(page, 300);
check('« Se connecter » en haut : écran ouvert en mode Se connecter', await vis('gate') && await ev(() => /Connecte-toi/.test(document.querySelector('.gt-h').textContent)));
await ev(() => document.getElementById('gateGuest').click()); await wait(page, 300);
await ev(() => document.querySelector('#topAuth [data-auth=signup]').click()); await wait(page, 300);
check('« S’inscrire » en haut : écran ouvert en mode inscription', await vis('gate') && await ev(() => /Crée ton compte/.test(document.querySelector('.gt-h').textContent)));
await ev(() => document.getElementById('gateGuest').click()); await wait(page, 300);
check('connecté : plus de boutons S’inscrire / Se connecter, Profil revient', await ev(() => { document.body.classList.remove('guest'); const r = !document.querySelector('#topAuth').offsetParent && !document.querySelector('#sideAuth').offsetParent && !!document.getElementById('accountBtn').offsetParent; document.body.classList.add('guest'); return r; }));
// a player from before the start screens (no gate, no onb in the saved state): the sign-in screen once, settings kept, no first-note screen
await ev(() => { localStorage.setItem('memo-gammes-v1', JSON.stringify({ xp: 500, settings: { lang: 'fr', notation: 'fr', input: 'screen', fing: true } })); }); await page.reload(); await wait(page, 1500);
check('ancien joueur : écran de connexion, pas « Joue ta première note »', await vis('gate') && await ev(() => !!document.getElementById('gateGuest') && !document.getElementById('fnGo')));
await ev(() => document.getElementById('gateGuest').click()); await wait(page, 600);
check('ancien joueur : réglages gardés, pas de questionnaire', !(await vis('onb')) && await ev(() => { const S = JSON.parse(localStorage.getItem('memo-gammes-v1')); return S.settings.fing === true && S.xp === 500; }));
check('aucune erreur JS', (await ev(() => window.__cnt.consoleErrors)).length === 0, await ev(() => window.__cnt.consoleErrors));
await browser.close();
if (fails.length) { console.log('\nECHEC r12 :', fails); process.exit(1); }
console.log('\nr12 OK');
