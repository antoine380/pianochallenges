// Duels in the games (Oct 2026): lobby, bot game with ELO, online matchmaking and friend code with a fake Supabase Realtime
// (the same BroadcastChannel fake as r7), same challenge on both sides, live scores, result, rating changes, forfeit when the other leaves.
import { createRequire } from 'module';
import fs from 'fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = process.env.PORT || '8767', URL = `http://localhost:${PORT}/`;
const FAKE_RT = /const FAKE_RT = `([\s\S]*?)`;/.exec(fs.readFileSync(new globalThis.URL('./r7_online.mjs', import.meta.url), 'utf8'))[1];
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d ? ' — ' + JSON.stringify(d) : '')); if (!ok) fails.push(n); };
const seed = name => `(()=>{ try{ if(sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded','1');
  localStorage.setItem('memo-gammes-v1', JSON.stringify({settings:{lang:'fr',notation:'fr',input:'screen',earV2:true,diffV2:true,midiV2:true,uiSound:false,quiz:{netName:${JSON.stringify(name)}}},
    langV2:true,introSeen:{chords:1,scales:1,harmony:1,prog:1,ear:1,games:1,daily:1,section:1},seenTypes:[],stats:{},secStats:{},xp:500,xpDays:{},streak:{days:0}})); }catch(e){} })();`;
const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const ctx = await b.newContext({ viewport: { width: 1024, height: 768 } });
await ctx.addInitScript(FAKE_RT);
const W = (p, ms) => p.waitForTimeout(ms);
async function open(name, game = 2) { const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.errs = errs;
  await p.addInitScript(seed(name)); await p.goto(URL); await W(p, 600);
  await p.evaluate(() => document.querySelector('.mode-item[data-mode="games"]').click()); await W(p, 300);
  await p.evaluate(g => document.querySelectorAll('#gameCards .ptile')[g].click(), game); await W(p, 400); return p; }
const ev = (p, f, a) => p.evaluate(f, a);
const elo = (p, k) => ev(p, k => (JSON.parse(localStorage.getItem('memo-gammes-v1')).elo || {})[k], k);
const visible = (p, id) => ev(p, id => !document.getElementById(id).hidden, id);
const key = (p, m) => ev(p, m => { const el = document.querySelector('#kbd [data-m="' + m + '"]'); el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); }, m);
const waitFor = async (p, f, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(p, f)) return true; await W(p, 200); } return false; };

// 1) lobby + a bot game (memory, chords): lose on purpose at round 1
const A = await open('Alice');
check('salon : 4 modes de jeu et ELO 800 provisoire', await ev(A, () => document.querySelectorAll('#duModes .du-mode').length === 4 && document.getElementById('duRate').textContent === '800?'));
await ev(A, () => document.querySelector('#duModes [data-m=bots]').click()); await W(A, 200);
check('bots : 10 bots, celui de ton niveau est présélectionné', await ev(A, () => document.querySelectorAll('.du-bot').length === 10 && document.querySelector('.du-bot[aria-pressed=true] em') !== null));
await ev(A, () => document.querySelectorAll('.du-bot')[0].click()); await ev(A, () => document.getElementById('duBotGo').click());
check('compte à rebours puis partie avec la barre des scores', await visible(A, 'duCount') && await waitFor(A, () => !document.getElementById('duHud').hidden && document.getElementById('duCount').hidden, 5000));
await waitFor(A, () => /toi|joue/i.test(document.getElementById('gmKick').textContent), 8000);
await key(A, 61); // a wrong note: out at round 1 with 0
check('éliminé : on attend l’adversaire ou le résultat', await waitFor(A, () => !document.getElementById('duWait').hidden || !document.getElementById('duRes').hidden, 3000));
check('résultat affiché', await waitFor(A, () => !document.getElementById('duRes').hidden, 30000));
const e1 = await elo(A, 'memory-chords');
check('ELO mis à jour après la partie classée contre un bot', e1 && e1.n === 1 && e1.r !== 800 && e1.h.length === 1 && e1.h[0].bot, e1);
await ev(A, () => document.getElementById('duResLobby').click()); await W(A, 200);
check('retour au salon : la partie apparaît dans « Dernières parties »', await ev(A, () => document.querySelectorAll('#duHist li .du-av').length === 1));
await A.close();

// 2) online: two players searching on the same game are paired, see the same challenge, the rating changes for both
const B = await open('Bruno', 1), C = await open('Chloé', 1); // Contre la montre
await ev(B, () => document.querySelector('#duModes [data-m=online]').click()); await W(B, 300);
check('en ligne : recherche en cours', await ev(B, () => !!document.querySelector('.du-search')));
await ev(C, () => document.querySelector('#duModes [data-m=online]').click());
check('en ligne : les deux joueurs sont associés', await waitFor(B, () => !document.getElementById('duHud').hidden, 8000) && await waitFor(C, () => !document.getElementById('duHud').hidden, 8000));
const names = await ev(C, () => document.getElementById('duOpName').textContent);
check('en ligne : chacun voit le nom de l’autre', /Bruno/.test(names), names);
await waitFor(B, () => document.body.classList.contains('runner-on') && /Accord|Note/i.test(document.getElementById('gmKick').textContent), 6000);
await W(B, 300);
const tb = await ev(B, () => document.getElementById('gmBig').textContent), tc = await ev(C, () => document.getElementById('gmBig').textContent);
check('en ligne : même premier accord des deux côtés', tb === tc && tb.length > 0, { tb, tc });
// B plays the right chord a few times: the score reaches C
const playTarget = p => ev(p, () => { const lbl = document.getElementById('gmBig').textContent; const keys = [...document.querySelectorAll('#kbd .k-rev')].map(k => +k.dataset.m); keys.forEach(m => document.querySelector('#kbd [data-m="' + m + '"]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))); return lbl; });
for (let i = 0; i < 3; i++) { await playTarget(B); await W(B, 350); }
check('en ligne : le score de B arrive chez C', await waitFor(C, () => +document.getElementById('duOpSc').textContent >= 2, 4000), await ev(C, () => document.getElementById('duOpSc').textContent));
// C leaves: B wins by forfeit, both ratings are kept
await C.close();
check('abandon : B gagne quand C quitte', await waitFor(B, () => !document.getElementById('duRes').hidden && /parti/.test(document.getElementById('duRes').textContent), 6000));
const eb = await elo(B, 'speed-chords');
check('abandon : partie classée, ELO de B en hausse', eb && eb.n === 1 && eb.r > 800, eb);
await B.close();

// 3) friend code: not rated
const D = await open('David', 0), E = await open('Emma', 0);
await ev(D, () => document.querySelector('#duModes [data-m=friend]').click()); await W(D, 200);
await ev(D, () => document.querySelector('.du-friend [data-a=create]').click()); await W(D, 500);
const code = await ev(D, () => document.querySelector('.du-code b').textContent);
check('ami : un code de 5 caractères', /^[A-Z2-9]{5}$/.test(code), { code });
await ev(E, () => document.querySelector('#duModes [data-m=friend]').click()); await W(E, 200);
await E.fill('.du-friend input', code); await ev(E, () => document.querySelector('.du-friend [data-a=join]').click()); await W(E, 700);
check('ami : l’hôte voit les 2 joueurs et peut lancer', await ev(D, () => document.querySelectorAll('.du-peers li').length === 2 && !document.querySelector('.du-friend [data-a=go]').disabled));
await ev(D, () => document.querySelector('.du-friend [data-a=go]').click());
check('ami : la partie démarre chez les deux', await waitFor(D, () => !document.getElementById('duHud').hidden, 5000) && await waitFor(E, () => !document.getElementById('duHud').hidden, 5000));
check('ami : partie amicale (pas d’ELO affiché)', await ev(E, () => document.getElementById('duMeElo').textContent === 'Amical'));
check('aucune erreur JS', [D, E].every(p => !p.errs.length), [D.errs, E.errs]);
await b.close();
if (fails.length) { console.log('\nECHEC r10 :', fails); process.exit(1); }
console.log('\nr10 OK');
