// Quiz (Oct 2026): questions load on demand; a player answers by playing the note / chord of an answer.
// Checks: solo with notes (easy), 2 players with one MIDI keyboard each (medium chords), 2 players sharing one keyboard in zones,
// taking turns, answering by tapping on screen, and the end podium.
// Quiz v3: « Seul · 2 · 3 · 4 », the theme chip is bigger with its picture, nobody's choice shows before the reveal (only « answered »),
// the names are on the chosen answers (and faces on the keys) after it, and each player's note moves on the staff by score / best possible score.
import { launch, closeOnboarding, URL } from './lib.mjs';
const wait = (p, ms) => p.waitForTimeout(ms);
const fails = [];
const check = (name, ok, detail) => { console.log((ok ? 'OK   ' : 'FAIL ') + name + (detail ? ' — ' + JSON.stringify(detail) : '')); if (!ok) fails.push(name); };
const { browser, page } = await launch({ mode: 'ok' });
await page.goto(URL); await wait(page, 1000); await closeOnboarding(page, 'midi');
const ev = (f, a) => page.evaluate(f, a);
const set = cfg => ev(c => { const S = JSON.parse(localStorage.getItem('memo-gammes-v1')); S.settings.quiz = Object.assign(S.settings.quiz || {}, c); localStorage.setItem('memo-gammes-v1', JSON.stringify(S)); }, cfg);
// the cards of the current question: [{right, pcs}] (right answer found from the data, keys read from the mini keyboard)
const cards = () => ev(() => {
  const D = window.QUIZ_DATA, txt = document.getElementById('qzText').textContent, fr = document.documentElement.lang !== 'en';
  const q = D.q.find(x => x[2] === txt || x[4] === txt), right = q ? (q[2] === txt ? q[3][0] : q[5][0]) : null;
  return [...document.querySelectorAll('#qzAns .qz-a')].map(a => ({ right: a.querySelector('.qz-at').textContent === right,
    pcs: a.dataset.pcs.split(',').map(Number), name: a.querySelector('.qz-l .ln').textContent }));
});
const play = (pcs, dev = 0, base = 60) => ev(([pcs, dev, base]) => pcs.forEach(pc => window.__midi.noteOn(base + pc, 100, dev)), [pcs, dev, base]);
const scores = () => ev(() => [...document.querySelectorAll('#qzRace .qz-tags .qz-pts')].map(d => +d.textContent.replace(/\D/g, '')));
// where each note is on the staff: the translateX of its head (% of the run)
const pos = () => ev(() => [...document.querySelectorAll('#qzRace .qz-heads .qz-ln')].map(l => parseFloat((/translateX\(([\d.]+)%/.exec(l.style.transform) || [0, 0])[1])));
async function openQuiz() { await ev(() => document.querySelector('#modeNav [data-mode=quiz]').click()); await wait(page, 300);
  for (let i = 0; i < 30 && !(await ev(() => !!window.QUIZ_DATA)); i++) await wait(page, 100); await wait(page, 200); }

// 0) defaults (Oct 2026): help « Montrer les touches à jouer » off (also for an old saved true), time 5 / 10 / 20 / 30 s, robots
await set({ keys: true, time: 15 }); await page.reload(); await wait(page, 800); await closeOnboarding(page);
await openQuiz();
check('aide : « Montrer les touches à jouer » désactivé par défaut (même si l’ancien réglage était oui)', await ev(() => !document.getElementById('qzKeysOpt').checked));
check('temps pour répondre : 5 / 10 / 20 / 30 s, une ancienne valeur va à la plus proche', await ev(() => [...document.querySelectorAll('#qzTime button')].map(b => b.textContent).join() === '5 s,10 s,20 s,30 s' && /^(10|20) s$/.test(document.querySelector('#qzTime [aria-pressed=true]').textContent)));
check('configuration de la partie et aide : deux sections', await ev(() => /Configuration de la partie/i.test(document.getElementById('qzSetup').textContent) && /Aide/.test(document.getElementById('qzHelpBox').textContent)));
check('« Robots » au lieu de « Bots »', await ev(() => /Robots/.test(document.getElementById('qzLocalBox').textContent) && !/\bBots\b/.test(document.getElementById('qzLocalBox').textContent)));
await ev(() => document.getElementById('qzGo').click()); await wait(page, 300);
check('aide désactivée : piano des réponses neutre, cartes étiquetées', await ev(() => document.querySelectorAll('#qzKb .ans').length === 0 && [...document.querySelectorAll('#qzAns .qz-l .ln')].every(x => x.textContent.length > 0)));
await ev(() => document.querySelectorAll('#qzAns .qz-a')[0].click()); await wait(page, 300);
check('aide désactivée : à la révélation, la bonne touche s’allume quand même', await ev(() => document.querySelectorAll('#qzKb .ans.right').length === 1));
await ev(() => document.getElementById('qzQuit').click()); await wait(page, 200);

// 1) solo, easy (notes), 3 questions, right answer on the first keyboard
await set({ n: 1, diff: 1, ans: 'notes', bots: 0, where: 'local', count: 5, time: 20, theme: 'all', keys: true, keysOff1: 1 }); await page.reload(); await wait(page, 800); await closeOnboarding(page);
await openQuiz();
check('quiz : 200 questions chargées à la demande', await ev(() => window.QUIZ_DATA.q.length === 200 && document.querySelectorAll('#qzThemes .qz-theme').length === 11), await ev(() => [window.QUIZ_DATA.q.length, document.querySelectorAll('#qzThemes .qz-theme').length]));
check('réglages : « Seul · 2 · 3 · 4 » sur une ligne', await ev(() => { const b = [...document.querySelectorAll('#qzN button')]; return b.map(x => x.textContent).join('·') === 'Seul·2·3·4' && new Set(b.map(x => Math.round(x.getBoundingClientRect().top))).size === 1; }));
await ev(() => document.getElementById('qzGo').click()); await wait(page, 300);
check('thème plus gros : image + nom, plus grand que le numéro', await ev(() => { const c = document.getElementById('qzTheme'), n = document.getElementById('qzNum');
  return !!c.querySelector('.qz-ci svg') && c.textContent.length > 2 && parseFloat(getComputedStyle(c).fontSize) >= 16 && parseFloat(getComputedStyle(c).fontSize) > parseFloat(getComputedStyle(n).fontSize) * 1.2
    && parseFloat(getComputedStyle(document.getElementById('qzText')).fontSize) > parseFloat(getComputedStyle(c).fontSize); }));
check('course : une portée avec la clé de sol, une note par joueur au départ', await ev(() => !!document.querySelector('#qzRace .qz-clef text') && !!document.querySelector('#qzRace .qz-fin') && document.querySelectorAll('#qzRace .qz-heads .qz-ln .av').length === 1) && (await pos())[0] === 0);
let c = await cards();
check('solo facile : 4 réponses = Do Ré Mi Fa', c.length === 4 && c.map(x => x.pcs.join()).join('|') === '0|2|4|5', c);
check('solo : la bonne réponse est identifiable', c.filter(x => x.right).length === 1, c);
await play(c.find(x => x.right).pcs); await wait(page, 350);
let s = await scores();
check('solo : la bonne note rapporte des points et révèle', s[0] >= 100 && await ev(() => !document.getElementById('qzNext').hidden), s);
{ const p = await pos(); check('course : la note avance de score / score maximal (5 questions × 200)', Math.abs(p[0] - s[0] / 1000 * 100) < 0.05, { p, s }); }
check('solo : à la révélation, ton nom sur ta réponse et ta tête sur sa touche', await ev(() => { const r = document.querySelector('#qzAns .qz-a.right'); return !!r && r.querySelectorAll('.qz-wc').length === 1 && document.querySelectorAll('#qzKb .right .qz-kw .av').length === 1; }));
await ev(() => document.getElementById('qzNext').click()); await wait(page, 300);
c = await cards(); await play(c.find(x => !x.right).pcs); await wait(page, 350);
s = await scores();
check('solo : une mauvaise note ne rapporte rien', s[0] < 300 && await ev(() => document.querySelector('#qzAns .qz-a.right') !== null), s);
// a note that matches no answer is ignored
await ev(() => document.getElementById('qzNext').click()); await wait(page, 300);
await play([11]); await wait(page, 350);
check('solo : une note hors réponses est ignorée', await ev(() => document.getElementById('qzNext').hidden));
// screen: tap the right card
c = await cards(); const k = c.findIndex(x => x.right); await ev(k => document.querySelectorAll('#qzAns .qz-a')[k].click(), k); await wait(page, 300);
check('piano du quiz : plus de A B C D, la note est l’étiquette', await ev(() => [...document.querySelectorAll('#qzAns .qz-l .ln')].map(x => x.textContent).join() === 'Do,Ré,Mi,Fa'), await ev(() => [...document.querySelectorAll('#qzAns .qz-l')].map(x => x.textContent)));
check('piano du quiz : 12 touches, les 4 réponses en couleur', await ev(() => document.querySelectorAll('#qzKb button').length === 12 && document.querySelectorAll('#qzKb .ans').length === 4));
check('solo : toucher la bonne carte à l’écran répond', (await scores())[0] >= 200 && await ev(() => !document.getElementById('qzNext').hidden));
await ev(() => document.getElementById('qzNext').click()); await wait(page, 300);
{ const before = (await scores())[0]; c = await cards(); const rp = c.find(x => x.right).pcs[0];
  await ev(rp => { const W = [0, 2, 4, 5, 7, 9, 11], B = [1, 3, 6, 8, 10], ks = document.querySelectorAll('#qzKb button'), i = W.indexOf(rp);
    ks[i >= 0 ? i : 7 + B.indexOf(rp)].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 })); }, rp); await wait(page, 300);
  check('piano du quiz : toucher la touche de la bonne note répond', (await scores())[0] >= before + 100 && await ev(() => !!document.querySelector('#qzKb .right')), await scores()); }
await ev(() => document.getElementById('qzQuit').click()); await wait(page, 200);

// 2) two players, one MIDI keyboard each, medium chords
await ev(() => window.__midi.addSecond()); await wait(page, 300);
await set({ n: 2, mode: 'dev', diff: 2, ans: 'chords', count: 5, devs: ['in-1', 'in-2'], names: ['Anna', 'Bob'] }); await page.reload(); await wait(page, 900); await closeOnboarding(page);
await ev(() => { window.__midi.addSecond(); window.__midi.addVirtual(); }); await wait(page, 300);
await openQuiz();
{ const o = await ev(() => [...document.querySelectorAll('#qzDev0 option')].map(x => x.textContent));
  check('claviers : écran + les 2 claviers MIDI, jamais « Network Session »', o.length === 3 && !o.some(x => /Network|réseau/i.test(x)), o); }
check('claviers : tous les joueurs voient les mêmes choix, celui d’un autre est signalé', await ev(() => /pris par/.test([...document.querySelectorAll('#qzDev0 option')].map(x => x.textContent).join())));
await ev(() => { const s = document.getElementById('qzDev1'); s.value = 'in-1'; s.dispatchEvent(new Event('change')); }); await wait(page, 200);
check('claviers : prendre le clavier d’un autre échange les deux', await ev(() => document.getElementById('qzDev0').value === 'in-2' && document.getElementById('qzDev1').value === 'in-1' && document.getElementById('qzDevWarn').hidden));
await ev(() => { const s = document.getElementById('qzDev1'); s.value = 'in-2'; s.dispatchEvent(new Event('change')); }); await wait(page, 200);
await ev(() => document.getElementById('qzGo').click()); await wait(page, 300);
c = await cards();
check('2 claviers : réponses en accords (3 notes)', c.every(x => x.pcs.length === 3), c.map(x => x.name));
await play(c.find(x => x.right).pcs, 0); await wait(page, 300);
check('2 claviers : J1 a répondu, la question attend J2', await ev(() => document.getElementById('qzNext').hidden));
{ const h = await ev(() => ({ chips: document.querySelectorAll('#qzAns .qz-wc, #qzKb .qz-kw, #qzAns .mine').length, right: document.querySelectorAll('#qzAns .right, #qzKb .right').length,
    ans: [...document.querySelectorAll('#qzRace .qz-heads .qz-ln')].map(l => l.classList.contains('ans')), txt: document.querySelector('#qzRace .qz-tags .qz-ln small').textContent }));
  check('caché : rien sur les cartes ni le piano, seulement « a répondu » sur la note de J1', h.chips === 0 && h.right === 0 && h.ans[0] && !h.ans[1] && /répondu/.test(h.txt), h);
  check('caché : les points de J1 ne bougent pas avant la révélation', (await scores())[0] === 0 && (await pos())[0] === 0, await scores()); }
await play(c.find(x => !x.right).pcs, 1); await wait(page, 350);
s = await scores();
check('2 claviers : J1 (1er clavier) marque, J2 (mauvais accord du 2e clavier) non', s[0] >= 100 && s[1] === 0, s);
{ const n = await ev(() => [...document.querySelectorAll('#qzAns .qz-a')].map(a => [a.classList.contains('right'), [...a.querySelectorAll('.qz-wc b')].map(b => b.textContent).join()]));
  check('révélation : Anna sur la bonne réponse, Bob sur la sienne', n.some(([r, x]) => r && x === 'Anna') && n.some(([r, x]) => !r && x === 'Bob'), n);
  const p = await pos(); check('course : J1 devant, J2 au départ, J1 mis en avant', p[0] > 0 && p[1] === 0 && await ev(() => document.querySelector('#qzRace .qz-heads .qz-ln').classList.contains('lead')), p); }
await ev(() => document.getElementById('qzQuit').click()); await wait(page, 200);

// 3) two players sharing one keyboard in zones
await set({ n: 2, mode: 'zone', diff: 1, ans: 'notes', count: 5, devs: [] }); await page.reload(); await wait(page, 900); await closeOnboarding(page);
await openQuiz();
const zones = await ev(() => [...document.querySelectorAll('#qzPlayers .qz-pin')].map(p => p.textContent));
check('zones : chaque joueur a sa zone', zones.length === 2 && zones.every(z => /–/.test(z)), zones);
check('zones : le piano partagé se choisit et les zones sont dessinées (nom + bornes)', await ev(() => !document.getElementById('qzZoneDevRow').hidden && document.querySelectorAll('#qzZoneMap .qz-zone').length === 2 && /Anna/.test(document.getElementById('qzZoneMap').textContent) && /–/.test(document.querySelector('#qzZoneMap small').textContent)));
await ev(() => document.getElementById('qzGo').click()); await wait(page, 300);
c = await cards();
await play(c.find(x => x.right).pcs, 0, 84); await wait(page, 350); // high notes = player 2's zone
check('zones : la note du haut est la réponse de J2 (sa note s’allume, celle de J1 non)', await ev(() => [...document.querySelectorAll('#qzRace .qz-heads .qz-ln')].map(l => l.classList.contains('ans')).join() === 'false,true'));
await play(c.find(x => !x.right).pcs, 0, 48); await wait(page, 350); // low notes = player 1 (a wrong answer): the reveal
s = await scores();
check('zones : une note jouée en haut du clavier compte pour J2', s[0] === 0 && s[1] >= 100, s);
await ev(() => document.getElementById('qzQuit').click()); await wait(page, 200);

// 4) taking turns + end podium
await set({ n: 2, mode: 'turn', diff: 1, ans: 'notes', count: 5 }); await page.reload(); await wait(page, 900); await closeOnboarding(page);
await openQuiz(); await ev(() => document.getElementById('qzGo').click()); await wait(page, 300);
check('tour par tour : « Au tour de » affiché', await ev(() => !document.getElementById('qzTurn').hidden));
for (let i = 0; i < 5; i++) { c = await cards(); await play(c.find(x => x.right).pcs); await wait(page, 350); await ev(() => document.getElementById('qzNext').click()); await wait(page, 300); }
const pod = await ev(() => [!document.getElementById('qzEnd').hidden, document.querySelectorAll('#qzPodium .qz-pod').length, document.getElementById('qzEndT').textContent]);
check('fin : podium avec 2 joueurs', pod[0] && pod[1] === 2, pod);
check('fin : la course reste sous le podium', await ev(() => !!document.querySelector('#qzRaceEnd #qzRace') && document.querySelectorAll('#qzRace .qz-heads .qz-ln').length === 2));
const errs = await ev(() => window.__cnt.consoleErrors);
check('aucune erreur JS', errs.length === 0, errs);
await browser.close();
if (fails.length) { console.log('\nECHEC r6 :', fails); process.exit(1); }
console.log('\nr6 OK');
