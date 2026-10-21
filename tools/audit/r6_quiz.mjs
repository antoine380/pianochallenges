// Quiz (Oct 2026): questions load on demand; a player answers by playing the note / chord of an answer.
// Checks: solo with notes (easy), 2 players with one MIDI keyboard each (medium chords), 2 players sharing one keyboard in zones,
// taking turns, answering by tapping on screen, and the end podium.
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
  const W = [0, 2, 4, 5, 7, 9, 11], B = [1, 3, 6, 8, 10];
  return [...document.querySelectorAll('#qzAns .qz-a')].map(a => { const r = [...a.querySelectorAll('.qz-play svg rect')];
    const pcs = r.map((x, i) => x.getAttribute('fill') === '#7a5bf5' ? (i < 7 ? W[i] : B[i - 7]) : null).filter(x => x != null);
    return { right: a.querySelector('.qz-at').textContent === right, pcs, name: a.querySelector('.qz-play b').textContent }; });
});
const play = (pcs, dev = 0, base = 60) => ev(([pcs, dev, base]) => pcs.forEach(pc => window.__midi.noteOn(base + pc, 100, dev)), [pcs, dev, base]);
const scores = () => ev(() => [...document.querySelectorAll('#qzScores .qz-ps')].map(d => +d.querySelector('.qz-pts').textContent));
async function openQuiz() { await ev(() => document.querySelector('#modeNav [data-mode=quiz]').click()); await wait(page, 300);
  for (let i = 0; i < 30 && !(await ev(() => !!window.QUIZ_DATA)); i++) await wait(page, 100); await wait(page, 200); }

// 1) solo, easy (notes), 3 questions, right answer on the first keyboard
await set({ n: 1, diff: 1, count: 5, time: 20, theme: 'all', keys: true }); await page.reload(); await wait(page, 800); await closeOnboarding(page);
await openQuiz();
check('quiz : 200 questions chargées à la demande', await ev(() => window.QUIZ_DATA.q.length === 200 && document.querySelectorAll('#qzThemes .qz-theme').length === 11), await ev(() => [window.QUIZ_DATA.q.length, document.querySelectorAll('#qzThemes .qz-theme').length]));
await ev(() => document.getElementById('qzGo').click()); await wait(page, 300);
let c = await cards();
check('solo facile : 4 réponses = Do Ré Mi Fa', c.length === 4 && c.map(x => x.pcs.join()).join('|') === '0|2|4|5', c);
check('solo : la bonne réponse est identifiable', c.filter(x => x.right).length === 1, c);
await play(c.find(x => x.right).pcs); await wait(page, 350);
let s = await scores();
check('solo : la bonne note rapporte des points et révèle', s[0] >= 100 && await ev(() => !document.getElementById('qzNext').hidden), s);
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
check('solo : toucher la bonne carte à l’écran répond', (await scores())[0] >= 200 && await ev(() => !document.getElementById('qzNext').hidden));
await ev(() => document.getElementById('qzQuit').click()); await wait(page, 200);

// 2) two players, one MIDI keyboard each, medium chords
await ev(() => window.__midi.addSecond()); await wait(page, 300);
await set({ n: 2, mode: 'dev', diff: 2, count: 5, devs: ['in-1', 'in-2'] }); await page.reload(); await wait(page, 900); await closeOnboarding(page);
await ev(() => window.__midi.addSecond()); await wait(page, 300);
await openQuiz();
await ev(() => document.getElementById('qzGo').click()); await wait(page, 300);
c = await cards();
check('2 claviers : réponses en accords (3 notes)', c.every(x => x.pcs.length === 3), c.map(x => x.name));
await play(c.find(x => !x.right).pcs, 0); await wait(page, 300);
check('2 claviers : J1 a répondu, la question attend J2', await ev(() => document.getElementById('qzNext').hidden));
await play(c.find(x => x.right).pcs, 1); await wait(page, 350);
s = await scores();
check('2 claviers : J2 (2e clavier) marque, J1 (mauvais accord) non', s[0] === 0 && s[1] >= 100, s);
await ev(() => document.getElementById('qzQuit').click()); await wait(page, 200);

// 3) two players sharing one keyboard in zones
await set({ n: 2, mode: 'zone', diff: 1, count: 5 }); await page.reload(); await wait(page, 900); await closeOnboarding(page);
await openQuiz();
const zones = await ev(() => [...document.querySelectorAll('#qzPlayers .qz-pin')].map(p => p.textContent));
check('zones : chaque joueur a sa zone', zones.length === 2 && zones.every(z => /–/.test(z)), zones);
await ev(() => document.getElementById('qzGo').click()); await wait(page, 300);
c = await cards();
await play(c.find(x => x.right).pcs, 0, 84); await wait(page, 350); // high notes = player 2's zone
s = await scores();
check('zones : une note jouée en haut du clavier compte pour J2', s[0] === 0 && s[1] >= 100, s);
await ev(() => document.getElementById('qzQuit').click()); await wait(page, 200);

// 4) taking turns + end podium
await set({ n: 2, mode: 'turn', diff: 1, count: 5 }); await page.reload(); await wait(page, 900); await closeOnboarding(page);
await openQuiz(); await ev(() => document.getElementById('qzGo').click()); await wait(page, 300);
check('tour par tour : « Au tour de » affiché', await ev(() => !document.getElementById('qzTurn').hidden));
for (let i = 0; i < 5; i++) { c = await cards(); await play(c.find(x => x.right).pcs); await wait(page, 350); await ev(() => document.getElementById('qzNext').click()); await wait(page, 300); }
const pod = await ev(() => [!document.getElementById('qzEnd').hidden, document.querySelectorAll('#qzPodium .qz-pod').length, document.getElementById('qzEndT').textContent]);
check('fin : podium avec 2 joueurs', pod[0] && pod[1] === 2, pod);
const errs = await ev(() => window.__cnt.consoleErrors);
check('aucune erreur JS', errs.length === 0, errs);
await browser.close();
if (fails.length) { console.log('\nECHEC r6 :', fails); process.exit(1); }
console.log('\nr6 OK');
