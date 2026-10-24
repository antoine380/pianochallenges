// « Quitter la partie ? » (chantier UX-NEXT, 24/10/2026) : une seule fenêtre (#leaveModal) avant de quitter une activité en cours.
// Pour chaque activité (exercice LEARN, entraînement du jour, Saute-notes, Contre la montre, Mémoire musicale, duel contre un bot,
// duel en ligne, quiz local, quiz en ligne, morceau du lecteur Play, jeu Play) et chaque déclencheur (bouton Quitter / Salon /
// Terminer la partie, menu, logo, barre du haut, bouton retour du lecteur) : la fenêtre s'ouvre, l'activité attend (sauf en ligne),
// Continuer / Échap / Do MIDI la reprennent, Quitter / Si MIDI quittent. Aucune fenêtre quand rien n'est en cours, ni pour Réglages / Progression.
// Usage : python3 -m http.server 8797 à la racine, puis  PORT=8797 node tools/audit/r19_confirm.mjs
import { createRequire } from 'module';
import fs from 'fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = process.env.PORT || '8767', URL = `http://localhost:${PORT}/`;
const FAKE_RT = /const FAKE_RT = `([\s\S]*?)`;/.exec(fs.readFileSync(new globalThis.URL('./r7_online.mjs', import.meta.url), 'utf8'))[1];
const LIB = fs.readFileSync(new globalThis.URL('./lib.mjs', import.meta.url), 'utf8');
const INIT = /export const INIT = `([\s\S]*?)`;\n/.exec(LIB)[1].split("${'${MODE}'}").join('ok');
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d !== undefined && !ok ? ' — ' + JSON.stringify(d) : '')); if (!ok) fails.push(n); };
const seed = (lang = 'fr', name = 'Alice') => `(()=>{ try{ if(sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded','1');
  localStorage.setItem('memo-gammes-v1', JSON.stringify({settings:{lang:'${lang}',notation:'${lang}',input:'midi',earV2:true,diffV2:true,midiV2:true,uiSound:false,delay:0,quiz:{netName:${JSON.stringify(name)},n:1,bots:1,botLvl:2,count:5,time:30}},
    langV2:true,gate:'guest',onb:{done:1},tourDone:1,pwShown:1,introSeen:Object.fromEntries(['hub','learn','games','free','play','quiz','chords','scales','harmony','prog','ear','daily','practice','runner','speed','memory','rank','account','settings','progress','notif','section'].map(k=>[k,1])),
    seenTypes:[],stats:{},secStats:{},xp:500,xpDays:{},streak:{days:0}})); }catch(e){} })();`;
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, locale: 'fr-FR' });
await ctx.addInitScript(INIT); await ctx.addInitScript(FAKE_RT);
const W = (p, ms) => p.waitForTimeout(ms);
const ev = (p, f, a) => p.evaluate(f, a);
const click = (p, s) => ev(p, s => { const e = document.querySelector(s); if (e) e.click(); return !!e; }, s);
const waitFor = async (p, f, ms = 8000, a) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(p, f, a)) return true; await W(p, 150); } return false; };
const panel = p => ev(p, () => { const m = document.getElementById('leaveModal'); return m && !m.hidden ? { t: document.getElementById('lvTitle').textContent, s: document.getElementById('lvSub').textContent, f: document.activeElement && document.activeElement.id } : null; });
const pg = p => ev(p, () => document.body.dataset.page);
const midiNote = async (p, n) => { await ev(p, n => { window.__midi.noteOn(n); setTimeout(() => window.__midi.noteOff(n), 60); }, n); await W(p, 320); };
const key = (p, m) => ev(p, m => { const el = document.querySelector('#kbd [data-m="' + m + '"]'); el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); }, m);
async function open(lang = 'fr', name) { const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.errs = errs;
  await p.addInitScript(seed(lang, name)); await p.goto(URL); await W(p, 900); await p.keyboard.press('Escape'); await W(p, 100); return p; }
const mode = (p, m) => click(p, `#modeNav [data-mode="${m}"]`);
async function learn(p, i = 0) { await mode(p, 'learn'); await W(p, 300); await ev(p, i => document.querySelectorAll('#learnTiles .ptile')[i].click(), i); await W(p, 400); await click(p, '#suGo'); await W(p, 600); }
async function gameSolo(p, i) { await mode(p, 'games'); await W(p, 300); await ev(p, i => document.querySelectorAll('#gameCards .ptile')[i].click(), i); await W(p, 500); await click(p, '#duModes [data-m=solo]'); await W(p, 300); }

const A = await open();
check('MIDI branché (faux clavier)', await waitFor(A, () => document.getElementById('midiBtn').classList.contains('on'), 5000));

// ---- 1. exercice LEARN ----
await learn(A, 0);
check('exercice démarré (bouton Terminer visible)', await ev(A, () => !document.getElementById('gameEnd').hidden));
await mode(A, 'games'); await W(A, 300);
check('… on est sur Jeux, sans panneau', !(await panel(A)) && await pg(A) === 'games');
await learn(A, 0); await key(A, 61); await W(A, 250);
await mode(A, 'games'); await W(A, 250);
let P = await panel(A);
check('après une note : le menu ouvre « Quitter la partie ? »', P && P.t === 'Quitter la partie ?' && /perdue/.test(P.s), P);
check('… « Continuer » a le focus et la page ne change pas', P && P.f === 'lvStay' && await pg(A) === 'practice');
await A.keyboard.press('Escape'); await W(A, 250);
check('Échap = continuer : fenêtre fermée, exercice repris', !(await panel(A)) && await ev(A, () => !document.getElementById('app').inert && !document.getElementById('gameEnd').hidden) && await pg(A) === 'practice');
await click(A, '#rankBtn'); await W(A, 250);
check('le bouton Classement demande aussi', !!(await panel(A)));
await click(A, '#lvStay'); await W(A, 250);
check('« Continuer » : on reste dans l’exercice', !(await panel(A)) && await pg(A) === 'practice' && await ev(A, () => !document.getElementById('gameEnd').hidden));
await click(A, '#setBtn'); await W(A, 300);
check('Réglages s’ouvre par-dessus sans demander', !(await panel(A)) && await pg(A) === 'settings');
await mode(A, 'quiz'); await W(A, 250);
check('depuis Réglages, quitter vers un autre mode demande (l’exercice est dessous)', !!(await panel(A)));
await midiNote(A, 60);
check('Do MIDI seul = continuer', !(await panel(A)) && await pg(A) === 'settings');
await click(A, '#homeLink'); await W(A, 250);
check('le logo demande aussi', !!(await panel(A)));
await midiNote(A, 71);
check('Si MIDI seul = quitter (accueil)', !(await panel(A)) && await pg(A) === 'hub' && await ev(A, () => document.getElementById('gameEnd').hidden));
await learn(A, 0); await key(A, 61); await W(A, 200);
await click(A, '#gameEnd'); await W(A, 250); P = await panel(A);
check('« Terminer la partie » demande : « Terminer la partie ? »', P && P.t === 'Terminer la partie ?' && await ev(A, () => document.getElementById('lvGo').textContent.startsWith('Terminer')), P);
await click(A, '#lvGo'); await W(A, 400);
check('… Terminer : la partie est terminée', !(await panel(A)) && await ev(A, () => document.getElementById('gameEnd').hidden));
await mode(A, 'games'); await W(A, 300);
check('écran de fin : pas de panneau', !(await panel(A)) && await pg(A) === 'games');

// ---- 2. entraînement du jour ----
await click(A, '#dailyCard'); await W(A, 400); await click(A, '#dpStart'); await W(A, 300); await click(A, '#dcOk'); await W(A, 700); await key(A, 61); await W(A, 200);
await click(A, '#ntfBtn'); await W(A, 250); P = await panel(A);
check('entraînement du jour : titre dédié', P && /entraînement du jour/.test(P.t), P);
await click(A, '#lvGo'); await W(A, 300);
check('… Quitter : page Notifications', await pg(A) === 'notif' && !(await panel(A)));

// ---- 3. Saute-notes (solo) : pause du défilement ----
const on = (p, id) => ev(p, id => !document.getElementById(id).hidden, id);
const txt = (p, id) => ev(p, id => document.getElementById(id).textContent, id);
const tr = (p, id) => ev(p, id => document.getElementById(id).style.transform, id);
const start = p => ev(p, () => { const c = document.getElementById(document.getElementById('rnStage').hidden ? 'gmBoard' : 'rnCanvas'); c.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); });
await gameSolo(A, 0);
await click(A, '#rnQuit'); await W(A, 250);
check('Saute-notes pas démarré : « Quitter » sans panneau', !(await panel(A)) && await ev(A, () => !document.body.classList.contains('runner-on')));
await gameSolo(A, 0); await start(A); await W(A, 900);
await click(A, '#rnQuit'); await W(A, 200); P = await panel(A);
const d1 = await txt(A, 'rnScore'); await W(A, 700); const d2 = await txt(A, 'rnScore');
check('Saute-notes en cours : panneau, le défilement s’arrête (score figé)', P && P.t === 'Quitter la partie ?' && d1 === d2 && +d1 > 0, { P, d1, d2 });
await click(A, '#lvStay'); await W(A, 700);
check('… Continuer : le défilement reprend', +(await txt(A, 'rnScore')) > +d2);
await click(A, '#rnQuit'); await W(A, 200); await click(A, '#lvGo'); await W(A, 300);
check('… Quitter : le jeu se ferme', await ev(A, () => !document.body.classList.contains('runner-on') && document.getElementById('runner').hidden));
// « S'inscrire / Se connecter » (invité) pendant une partie : l'écran de connexion couvrait le jeu qui continuait dessous
await gameSolo(A, 0); await start(A); await W(A, 600);
await click(A, '#topAuth [data-auth=login]'); await W(A, 250); P = await panel(A);
check('« Se connecter » en pleine partie : panneau, pas d’écran de connexion', !!P && await ev(A, () => { const g = document.getElementById('gate'); return !g || g.hidden; }), P);
await click(A, '#lvStay'); await W(A, 250);
await click(A, '#topAuth [data-auth=login]'); await W(A, 250); await click(A, '#lvGo'); await W(A, 600);
check('… Quitter : jeu fermé, accueil, écran de connexion ouvert', await ev(A, () => document.getElementById('runner').hidden && document.body.dataset.page === 'hub' && !document.getElementById('gate').hidden));
await click(A, '#gateGuest'); await W(A, 400);
check('… « Continuer sans compte » : retour à l’accueil', await pg(A) === 'hub' && await ev(A, () => document.getElementById('gate').hidden));

// ---- 4. Contre la montre : le chrono attend ----
await gameSolo(A, 1); await start(A); await W(A, 400);
await click(A, '#modeNav [data-mode="play"]'); await W(A, 200);
const e1 = await tr(A, 'gmBar'); await W(A, 800); const e2 = await tr(A, 'gmBar');
check('Contre la montre : panneau depuis le menu, le chrono attend', !!(await panel(A)) && e1 === e2, { e1, e2 });
await click(A, '#lvStay'); await W(A, 300);
const left = parseFloat(/scaleX\(([\d.]+)/.exec(await tr(A, 'gmBar'))[1]);
check('… Continuer : le temps restant est conservé', left > 0.95 && (await tr(A, 'gmBar')) !== e2, left);
await click(A, '#duToLobby'); await W(A, 200);
check('« Salon » pendant la partie demande aussi', !!(await panel(A)));
await click(A, '#lvGo'); await W(A, 300);
check('… Quitter : retour au salon', await on(A, 'duLobby'));
await click(A, '#rnQuit'); await W(A, 250);

// ---- 5. Mémoire musicale ----
await gameSolo(A, 2); await start(A); await W(A, 300);
const listen = await txt(A, 'gmKick');
await mode(A, 'learn'); await W(A, 200);
check('Mémoire musicale (écoute) : panneau', !!(await panel(A)));
await W(A, 2500);
check('… la séquence attend (toujours en écoute)', (await txt(A, 'gmKick')) === listen && !(await ev(A, () => document.querySelector('#kbd .k-rev'))), listen);
await click(A, '#lvStay');
check('… Continuer : la séquence est rejouée puis c’est à toi', await waitFor(A, l => document.getElementById('gmKick').textContent !== l, 4000, listen));
await mode(A, 'learn'); await W(A, 200); await click(A, '#lvGo'); await W(A, 300);
check('… Quitter : page Learn', await pg(A) === 'learn' && await ev(A, () => !document.body.classList.contains('runner-on')));

// ---- 6. duel contre un bot (classé) ----
await mode(A, 'games'); await W(A, 300); await ev(A, () => document.querySelectorAll('#gameCards .ptile')[0].click()); await W(A, 400);
await click(A, '#duModes [data-m=bots]'); await W(A, 200); await ev(A, () => document.querySelectorAll('.du-bot')[0].click()); await click(A, '#duBotGo');
await waitFor(A, () => !document.getElementById('duHud').hidden && document.getElementById('duCount').hidden, 6000); await W(A, 400);
await click(A, '#rnQuit'); await W(A, 200); P = await panel(A);
check('duel contre un bot : « partie classée … défaite »', P && /classée/.test(P.s) && /défaite/.test(P.s) && !/adversaire continue/.test(P.s), P);
const b1 = await txt(A, 'duOpSc'); await W(A, 2500);
check('… le bot attend aussi (score figé)', (await txt(A, 'duOpSc')) === b1, b1);
await click(A, '#lvStay'); await W(A, 300);
await click(A, '#rnQuit'); await W(A, 200); await click(A, '#lvGo'); await W(A, 300);
const elo = await ev(A, () => (JSON.parse(localStorage.getItem('memo-gammes-v1')).elo || {})['runner-chords']);
check('… Quitter : défaite comptée', elo && elo.l === 1, elo);

// ---- 7. quiz local ----
await mode(A, 'quiz'); await W(A, 500); await click(A, '#qzGo');
await waitFor(A, () => !document.getElementById('qzQuit').hidden && document.getElementById('qzQuit').offsetParent, 8000); await W(A, 300);
await click(A, '#qzQuit'); await W(A, 200); P = await panel(A);
const q1 = await tr(A, 'qzBar'); await W(A, 700); const q2 = await tr(A, 'qzBar');
check('quiz : « Quitter » demande, le chrono attend', P && /perdue/.test(P.s) && q1 === q2, { P, q1, q2 });
await click(A, '#lvStay'); await W(A, 600);
check('… Continuer : le chrono repart', (await tr(A, 'qzBar')) !== q2);
await click(A, '#accountBtn'); await W(A, 200); await click(A, '#lvGo'); await W(A, 400);
check('… Quitter depuis le menu : page Profil', await pg(A) === 'account');
await mode(A, 'quiz'); await W(A, 400);
check('… le quiz est arrêté (réglages affichés)', await ev(A, () => !document.getElementById('qzGo').offsetParent === false));

// ---- 8. lecteur Play : morceau, jeu Play, bouton retour du lecteur ----
await mode(A, 'play'); await W(A, 300); await click(A, '#playSongs .ptile'); await W(A, 1800);
let FR = null; const fr = () => FR; const getFr = async () => { FR = await (await A.$('#playFrame')).contentFrame(); };
check('morceau ouvert, pas commencé : pas de panneau', await ev(A, () => !document.getElementById('playFrame').contentWindow.clavioBusy()));
await mode(A, 'learn'); await W(A, 250);
check('… le menu quitte sans demander', await pg(A) === 'learn' && !(await panel(A)));
await mode(A, 'play'); await W(A, 300); await click(A, '#playSongs .ptile'); await W(A, 1800);
await getFr(); await fr().evaluate(() => document.getElementById('go').click()); await W(A, 300);
await midiNote(A, 61); await midiNote(A, 66);
check('morceau commencé (une note jouée) : il est en cours', await fr().evaluate(() => window.clavioBusy()));
await mode(A, 'games'); await W(A, 250); P = await panel(A);
check('morceau en cours : « Ta progression dans ce morceau… »', P && /morceau/.test(P.s), P);
check('… le morceau attend', await fr().evaluate(() => window.clavioHeld() === true));
await click(A, '#lvStay'); await W(A, 300);
check('… Continuer : le morceau repart', await fr().evaluate(() => window.clavioHeld() === false) && await pg(A) === 'play');
await fr().evaluate(() => [...document.querySelectorAll('[data-home]')].find(x => x.offsetParent).click()); await W(A, 300);
check('bouton retour du lecteur pendant le morceau : panneau de l’hôte', !!(await panel(A)) && await pg(A) === 'play');
await click(A, '#lvGo'); await W(A, 700);
check('… Quitter : retour à la page PLAY', await pg(A) === 'free' && !(await panel(A)));
await mode(A, 'games'); await W(A, 300); await ev(A, () => { const t = document.querySelectorAll('#playCards .ptile'); t[0].click(); }); await W(A, 1800);
await getFr(); await fr().evaluate(() => document.getElementById('go').click()); await W(A, 400);
await click(A, '#homeLink'); await W(A, 250);
check('jeu Play en cours : le logo demande', !!(await panel(A)) && await fr().evaluate(() => window.clavioHeld()));
await click(A, '#lvGo'); await W(A, 400);
check('… Quitter : accueil', await pg(A) === 'hub');

// ---- 9. rien en cours ----
for (const [m, n] of [['games', 'Jeux'], ['play', 'Play'], ['quiz', 'Quiz'], ['learn', 'Learn']]) { await mode(A, m); await W(A, 200); }
await click(A, '#rankBtn'); await W(A, 300); await click(A, '#homeLink'); await W(A, 300);
check('navigation sans activité : jamais de panneau', !(await panel(A)) && await pg(A) === 'hub');
check('aucune erreur de page (A)', A.errs.length === 0, A.errs);
await A.close();

// ---- 10. duel en ligne : pas de pause, rappel de la défaite ----
async function openGame(name, g) { const p = await open('fr', name); await mode(p, 'games'); await W(p, 300); await ev(p, g => document.querySelectorAll('#gameCards .ptile')[g].click(), g); await W(p, 400); return p; }
const B = await openGame('Bruno', 1), C = await openGame('Chloé', 1);
await click(B, '#duModes [data-m=online]'); await W(B, 300); await click(C, '#duModes [data-m=online]');
const playing = () => !document.getElementById('duHud').hidden && document.getElementById('duCount').hidden;
const paired = await waitFor(B, playing, 12000) && await waitFor(C, playing, 6000);
check('duel en ligne : les deux joueurs jouent', paired);
if (paired) {
  await B.bringToFront(); await W(B, 200);
  await click(B, '#rnQuit'); await W(B, 200); P = await panel(B);
  check('duel en ligne : « classée … défaite » + « adversaire continue sans toi »', P && /défaite/.test(P.s) && /adversaire continue sans toi/.test(P.s), P);
  const s1 = await tr(B, 'gmBar'); await W(B, 900);
  check('… pas de pause en ligne (le chrono continue)', (await tr(B, 'gmBar')) !== s1, [s1, await tr(B, 'gmBar'), await txt(B, 'gmKick')]);
  await click(B, '#lvGo'); await W(B, 400);
  check('… Quitter : le jeu se ferme pour celui qui part', await ev(B, () => !document.body.classList.contains('runner-on')));
  check('… l’autre gagne par abandon', await waitFor(C, () => !document.getElementById('duRes').hidden, 8000));
}
await B.close(); await C.close();

// ---- 11. anglais ----
const E = await open('en');
await learn(E, 0); await key(E, 61); await W(E, 200); await mode(E, 'games'); await W(E, 200); P = await panel(E);
check('EN : « Leave the game? » / Keep playing / Leave', P && P.t === 'Leave the game?' && await ev(E, () => document.getElementById('lvStay').textContent.startsWith('Keep playing') && document.getElementById('lvGo').textContent.startsWith('Leave')), P);
await E.close();

// ---- 12. ports MIDI virtuels (retour du 24/10/2026 : « Session réseau » sur l'iPad) ----
const V = await open();
await waitFor(V, () => document.getElementById('midiBtn').classList.contains('on'), 5000);
await ev(V, () => { const M = window.__midi, mk = name => { const p = { id: 'v-' + name, name, state: 'connected', connection: 'open', type: 'input', _h: null }; Object.defineProperty(p, 'onmidimessage', { get() { return p._h; }, set(v) { p._h = v; } }); return p; };
  ['Session re\u0301seau 1', 'SESSION RÉSEAU', 'Network Session 1', 'IAC Driver Bus 1'].forEach(n => M.access.inputs.set('v-' + n, mk(n))); if (M.access.onstatechange) M.access.onstatechange({}); });
await W(V, 300);
const shown = async () => ev(V, () => [document.getElementById('midiTxt').textContent, document.getElementById('hsMidiSub').textContent, document.getElementById('inStatus') ? document.getElementById('inStatus').textContent : ''].join(' | '));
const virt = /session|r[ée]seau|network|iac/i;
check('ports virtuels : ni dans le menu, ni sur l’accueil, ni dans les réglages', !virt.test(await shown()), await shown());
await click(V, '#midiBtn'); await W(V, 300);
check('ports virtuels : absents de la fenêtre Clavier MIDI', await ev(V, () => { const m = document.getElementById('midiModal'); return !/session|r[ée]seau|network|iac/i.test(m.textContent.normalize('NFC')); }));
await V.keyboard.press('Escape'); await W(V, 200);
await mode(V, 'quiz'); await W(V, 600);
check('quiz : « 1 clavier MIDI détecté » (les ports virtuels ne comptent pas)', /^1 clavier MIDI détecté/.test(await txt(V, 'qzMidiHint')), await txt(V, 'qzMidiHint'));
check('aucune erreur de page (V)', V.errs.length === 0, V.errs);
await V.close();

await b.close();
console.log(fails.length ? `\n${fails.length} échec(s)` : '\nTout est bon');
process.exit(fails.length ? 1 : 0);
