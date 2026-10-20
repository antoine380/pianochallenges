// T2b : conséquences de l'exercice invisible démarré par un Do sur le hub (XP, sons, compte à rebours).
import { launch, closeOnboarding, gotoExercise, state, midi, URL } from './lib.mjs';
const wait = (p, ms) => p.waitForTimeout(ms);
const { browser, page } = await launch({ mode: 'ok' });
await page.goto(URL); await wait(page, 1000);
await closeOnboarding(page, 'midi');
await gotoExercise(page, 'chords');
// réglages : compte à rebours 5 s, guide touches
await page.evaluate(() => { const S = JSON.parse(localStorage.getItem('memo-gammes-v1')); S.settings.delay = 5; S.settings.diffV2 = true; S.settings.guideK = true; localStorage.setItem('memo-gammes-v1', JSON.stringify(S)); });
await page.reload(); await wait(page, 1000); await closeOnboarding(page, 'midi');
const xp = () => page.evaluate(() => JSON.parse(localStorage.getItem('memo-gammes-v1')).xp || 0);
const S = () => page.evaluate(() => { const s = JSON.parse(localStorage.getItem('memo-gammes-v1')); return { xp: s.xp, xpDays: s.xpDays, progress: Object.keys(s.progress || {}).length }; });
console.log('hub, état initial:', JSON.stringify(await S()), (await state(page)).page);
// 1) Do sur le hub, puis l'accord juste → XP gagné sans rien voir ?
await midi.on(page, 60); await wait(page, 150);
let s = await state(page); console.log('après Do sur hub:', { playing: s.playing, prompt: s.prompt, osc: s.osc });
const exp = await page.evaluate(() => [...document.querySelectorAll('#kbd [data-m].k-guide')].map(k => +k.dataset.m));
console.log('réponse attendue (invisible):', exp);
await page.evaluate(ns => ns.forEach(n => window.__midi.noteOn(n)), exp); await wait(page, 300);
s = await state(page); console.log('après accord juste sur hub:', { playing: s.playing, sbVal: s.sbVal, sbDetail: s.sbDetail, stage: s.stage.slice(0, 80) }, JSON.stringify(await S()));
await wait(page, 2000);
s = await state(page); console.log('2 s plus tard (auto-avance ?):', { playing: s.playing, prompt: s.prompt, slots: s.slots });
// 2) laisser le compte à rebours expirer sur le hub : la réponse est jouée (oscillateurs) ?
const osc0 = s.osc;
await wait(page, 5600);
s = await state(page); console.log('après expiration 5 s sur hub:', { playing: s.playing, slots: s.slots, oscCreated: s.osc - osc0, stage: s.stage.slice(0, 60) });
// 3) Espace sur PLAY avec compte à rebours : son de la révélation joué par l'hôte pendant le morceau
await page.click('.mode-item[data-mode="play"]'); await wait(page, 800);
const osc1 = (await state(page)).osc;
await page.keyboard.press('Space'); await wait(page, 200);
s = await state(page); console.log('PLAY après Espace:', { page: s.page, playing: s.playing, prompt: s.prompt });
await wait(page, 5600);
s = await state(page); console.log('PLAY 5,6 s plus tard:', { playing: s.playing, slots: s.slots, oscCreatedHost: s.osc - osc1 });
console.log('état final XP:', JSON.stringify(await S()));
await browser.close();
