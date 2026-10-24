// Succès (chantier SUCCÈS, C10, 24/10/2026) : onglet « Succès » de la fiche Progression : 6 tuiles chiffrées (XP, notes justes,
// accords trouvés, duels gagnés, morceaux à 3 étoiles, temps de jeu) et 30 badges vectoriels (gris tant qu'ils ne sont pas obtenus,
// un clic dit comment les obtenir ; obtenus = partage en image carrée). badgeCheck() au fil du jeu, notification Progrès + petite fête,
// une seule fois ; premier passage silencieux. Compteurs S.cnt / S.songStars (max à la fusion), S.badges (union, date la plus ancienne).
// Aucun défilement de page (iPad, mobile) : la grille défile dans sa carte.
// Usage : PORT=8789 NODE_PATH=… PW_CHROMIUM=… node tools/audit/r29_succes.mjs   (SHOT=/dossier : captures)
import { createRequire } from 'module';
import fs from 'fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = process.env.PORT || '8767', URL = `http://localhost:${PORT}/`, SHOT = process.env.SHOT || '';
if (SHOT) fs.mkdirSync(SHOT, { recursive: true });
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d !== undefined && !ok ? ' — ' + JSON.stringify(d) : '')); if (!ok) fails.push(n); };
const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const BASE = { xp: 120, xpDays: {}, streak: { days: 0, last: '' }, gate: 'guest', onb: { done: 1 }, tourDone: 1, langV2: true, pwShown: 1,
  introSeen: { hub: 1, learn: 1, games: 1, chords: 1, scales: 1, settings: 1, progress: 1, notif: 1 }, stats: {}, mastery: {}, srs: {}, secStats: {},
  notifs: { list: [], keys: {}, init: 1, nv2: 1 }, settings: { lang: 'fr', notation: 'fr', input: 'screen', uiSound: false } };
const W = ms => new Promise(r => setTimeout(r, ms));
async function open(vp, st = BASE, extra = '') {
  const c = await b.newContext({ viewport: vp, hasTouch: vp.width < 900 });
  await c.route(u => u.href.startsWith(URL) && (u.pathname === '/' || u.pathname === '/index.html'), async r => { const res = await r.fetch(); let h = await res.text(); const e = h.lastIndexOf('})();\n</script>'); h = h.slice(0, e) + '\nwindow.__X=s=>eval(s);\n' + h.slice(e); await r.fulfill({ response: res, body: h, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) p.errs.push(m.text()); });
  await p.addInitScript(`if(!sessionStorage.getItem('s')){ sessionStorage.setItem('s','1'); localStorage.setItem('memo-gammes-v1', ${JSON.stringify(JSON.stringify(st))}); ${extra} }`);
  await p.goto(URL); await p.waitForFunction(() => !!window.__X, null, { timeout: 15000 }); await p.waitForTimeout(1900);
  p.X = s => p.evaluate(s => window.__X(s), s); return p;
}
const openSuc = async p => { await p.evaluate(() => (document.getElementById('lvlAv').offsetParent ? document.getElementById('lvlAv') : document.getElementById('mbAv')).click()); await W(400); await p.click('#pfNav [data-v=suc]'); await W(300); };
const errs = [];

// 1) ancien joueur : premier passage silencieux, tuiles chiffrées
const RICH = { ...BASE, xp: 12000, cnt: { notes: 1234, chords: 56 }, elo: { 'runner-chords': { r: 900, n: 12, w: 7, d: 1, l: 4, h: [] } }, playSec: { '2026-10-01': 3600 * 31 + 1200 }, runnerBest: 140,
  mastery: { 'ch:maj:C:0': 2, 'ch:maj:G:1': 1 }, secStats: { ear: { ok: 60 } } };
let p = await open({ width: 1024, height: 768 }, RICH, `localStorage.setItem('clavio:best', JSON.stringify({lune:3,maman:2,ode:1,'ode@2':3,'elise@3':1}));`);
check('premier passage : badges déjà mérités notés (10 000 XP, Oreille d\'or, Premier duel, Saute-notes 100)', await p.X('["xp10k","ear","duel1","rn100","song3"].every(k=>S.badges[k])'), await p.X('JSON.stringify(S.badges)'));
check('premier passage : aucune notification de badge (pas d\'avalanche)', await p.X('S.notifs.list.filter(n=>n.type==="badge").length===0'));
check('clavio:best recopié dans S.songStars (fusion possible)', await p.X('S.songStars.lune===3 && S.songStars.maman===2 && S.songStars["ode@2"]===3'));
check('catalogue C6 : meilleure version par morceau, « Mélomane » sur 10 morceaux', await p.X('JSON.stringify(achProg("songs"))==="[4,10]" && achSongBest(S.songStars).ode===3'), await p.X('JSON.stringify(achProg("songs"))'));
await openSuc(p);
check('fiche Progression : 3 onglets (Vue d\'ensemble, Détail, Succès), Succès actif', await p.evaluate(() => document.querySelectorAll('#pfNav button').length === 3 && document.getElementById('progPane').dataset.tab === 'suc' && document.querySelector('#pfNav [data-v=suc]').getAttribute('aria-selected') === 'true'));
check('onglet Succès : #achBox visible, la vue d\'ensemble masquée', await p.evaluate(() => document.getElementById('achBox').offsetParent !== null && document.getElementById('progFiche').offsetParent === null));
const tiles = await p.evaluate(() => [...document.querySelectorAll('#achTiles .ach-t')].map(d => d.querySelector('b').textContent.replace(/\s/g, ' ') + '|' + d.querySelector('span:last-child').textContent));
check('6 tuiles : XP 12 000, notes 1 234, accords 56, duels 7, 2 morceaux à 3 étoiles (catalogue : versions id@lv), 31 h 20', tiles.length === 6 && /12.000\|XP totale/.test(tiles[0]) && /1.234\|Notes justes/.test(tiles[1]) && /56\|Accords/.test(tiles[2]) && /^7\|Duels/.test(tiles[3]) && /^2\|Morceaux à 3/.test(tiles[4]) && /^31 h 20\|Temps/.test(tiles[5]), tiles);
check('tuiles : objet vectoriel (svg OBJ) dans chacune', await p.evaluate(() => [...document.querySelectorAll('#achTiles .ach-t')].every(d => d.querySelector('.obj svg'))));
check('30 badges dans la grille, compte « N sur 30 »', await p.evaluate(() => document.querySelectorAll('#achGrid .ach-b').length === 30) && new RegExp('^' + await p.X('Object.keys(S.badges).length') + ' sur 30$').test(await p.evaluate(() => document.getElementById('achCount').textContent)));
check('badges vectoriels (svg, aucune image externe)', await p.evaluate(() => [...document.querySelectorAll('#achGrid .ach-b')].every(x => x.querySelector('.ach-i svg') && !x.querySelector('img'))));
check('obtenu = anneau doré (.on), non obtenu = gris (filtre)', await p.evaluate(() => { const on = document.querySelector('#achGrid .ach-b.on'), off = document.querySelector('#achGrid .ach-b:not(.on)'); return !!on && !!off && /grayscale/.test(getComputedStyle(off.querySelector('svg')).filter) && getComputedStyle(on.querySelector('svg')).filter === 'none'; }));
// clic sur un badge non obtenu : comment l'obtenir + progression
await p.click('#achGrid [data-id=maj12]'); await W(200);
const pop = await p.evaluate(() => { const x = document.getElementById('achPop'); return { vis: !x.hidden, t: x.textContent, sh: !!x.querySelector('.ap-sh') }; });
check('badge gris : la bulle dit comment l\'obtenir (« Les 12 majeurs », 2 / 12)', pop.vis && /Les 12 majeurs/.test(pop.t) && /12 tonalités/.test(pop.t) && /2 \/ 12/.test(pop.t) && !pop.sh, pop);
await p.keyboard.press('Escape'); await W(100);
check('Échap ferme la bulle', await p.evaluate(() => document.getElementById('achPop').hidden));
// clic sur un badge obtenu : date + partage en image carrée
await p.evaluate(() => { window.__sh = null; navigator.canShare = () => true; navigator.share = async d => { window.__sh = d; }; });
await p.click('#achGrid [data-id=xp10k]'); await W(200);
check('badge obtenu : « Obtenu le … » et bouton Partager', await p.evaluate(() => /Obtenu le/.test(document.getElementById('achPop').textContent) && !!document.querySelector('#achPop .ap-sh')));
await p.click('#achPop .ap-sh'); await p.waitForFunction(() => !!window.__sh, null, { timeout: 5000 }).catch(() => {});
const sh = await p.evaluate(async () => { const d = window.__sh; if (!d || !d.files) return null; const f = d.files[0]; const bm = await createImageBitmap(f); return { type: f.type, w: bm.width, h: bm.height, text: d.text, url: d.url }; });
check('partage : image PNG carrée 1080 × 1080, texte du badge, lien d\'invitation', sh && sh.type === 'image/png' && sh.w === 1080 && sh.h === 1080 && /10 000 XP/.test(sh.text) && /\?ref=/.test(sh.url), sh);
check('partager compte pour le badge « Ambassadeur »', await p.X('S.cnt.share>=1') && (await p.waitForFunction(() => window.__X('!!S.badges.share'), null, { timeout: 3000 }).then(() => true).catch(() => false)));

// 2) obtention au fil du jeu : notification Progrès, une seule fois, fête
await p.X('S.cnt.night=1; badgeCheck()');
check('Noctambule obtenu : S.badges.night = date du jour', await p.X('S.badges.night===dayStr()'));
check('notification « Badge obtenu : Noctambule » (catégorie Progrès)', await p.X('(()=>{ const n=S.notifs.list.filter(x=>x.type==="badge" && x.id==="badge-night"); return n.length===1 && n[0].cat==="progress" && /Noctambule/.test(n[0].ti); })()'));
check('petite fête : toast « Nouveau badge »', await p.evaluate(() => /Nouveau badge : Noctambule/.test((document.getElementById('toast') || {}).textContent || '')));
await p.X('badgeCheck(); badgeCheck()');
check('une seule fois (pas de doublon)', await p.X('S.notifs.list.filter(x=>x.id==="badge-night").length===1'));
check('la grille se met à jour (Noctambule doré)', await p.evaluate(() => document.querySelector('#achGrid [data-id=night]').classList.contains('on')));
// duels : 10 victoires de suite
await p.X('for(let i=0;i<9;i++) eloApply("speed-notes",800,1); eloApply("speed-notes",800,0); for(let i=0;i<4;i++) eloApply("speed-notes",800,1)');
check('série de victoires : remise à zéro sur une défaite, meilleure série gardée (9)', await p.X('S.cnt.wRun===4 && S.cnt.wBest===9'));
await p.X('for(let i=0;i<6;i++) eloApply("speed-notes",800,1); badgeCheck()');
check('10 victoires de suite : badge obtenu', await p.X('!!S.badges.duel10'));
// Les Douze en or (lecture seule de S.gameBest["douze-*"])
await p.X('S.gameBest={...(S.gameBest||{}),"douze-maj":2}; badgeCheck()');
check('Les Douze : argent (2) ne suffit pas', await p.X('!S.badges.douze'));
await p.X('S.gameBest["douze-maj"]=3; badgeCheck()');
check('Les Douze en or : valeur 3 = or', await p.X('!!S.badges.douze'));
// action de la notification : ouvre l'onglet Succès
await p.click('#homeLink'); await W(300); await p.X('ntfDo({k:"badges"})'); await W(300);
check('notification › Voir : ouvre la fiche Progression sur Succès', await p.X('page==="progress"') && await p.evaluate(() => document.getElementById('progPane').dataset.tab === 'suc'));
errs.push(...p.errs); await p.close();

// 3) compteurs en jouant : notes justes et accords trouvés (LEARN), achHit (jeux)
p = await open({ width: 1024, height: 768 });
await p.click('#modeNav [data-mode=learn]'); await W(300); await p.evaluate(() => document.querySelectorAll('#learnTiles .ptile')[0].click()); await W(500);
await p.click('#suGo'); await W(900);
const pcs = await p.X('JSON.stringify(seq.map(n=>n.pc))');
const before = await p.X('JSON.stringify({n:achN("notes"),c:achN("chords")})');
for (const pc of JSON.parse(pcs)) { await p.X(`noteIn(${60 + pc})`); await W(60); }
await W(300);
const after = JSON.parse(await p.X('JSON.stringify({n:achN("notes"),c:achN("chords")})'));
check('LEARN : un accord réussi = +' + JSON.parse(pcs).length + ' notes justes, +1 accord trouvé', after.n - JSON.parse(before).n === JSON.parse(pcs).length && after.c - JSON.parse(before).c === 1, { before, after, pcs });
await p.X('achHit(3); achHit(1)');
check('jeux : une cible de 3 notes = +3 notes et +1 accord, une note seule = +1 note', await p.X(`achN("notes")===${after.n + 4} && achN("chords")===${after.c + 1}`));
await p.X('const c0=achN("games"); finishGame(); window.__g=achN("games")-c0'); await W(300);
check('fin de partie LEARN : +1 partie (100 parties)', await p.X('window.__g===1'));
await p.X('S.settings.staff=true; S.settings.staffRead=true');
check('état ancien sans S.cnt / S.badges : rien ne casse', await p.X('(()=>{ const o=S.cnt; delete S.cnt; const v=achN("notes"); S.cnt=o; return v===0; })()'));
errs.push(...p.errs); await p.close();

// 4) fusion entre appareils
p = await open({ width: 1024, height: 768 });
const mg = JSON.parse(await p.X(`JSON.stringify(mergeState({...S, cnt:{notes:10,chords:5,night:1}, songStars:{lune:2}, badges:{night:"2026-10-20",xp10k:"2026-10-01"}},
  {cnt:{notes:7,chords:9,wBest:3}, songStars:{lune:3,ode:1}, badges:{night:"2026-10-10",duel1:"2026-09-01"}}).merged)`));
check('fusion : compteurs = max par clé', mg.cnt.notes === 10 && mg.cnt.chords === 9 && mg.cnt.night === 1 && mg.cnt.wBest === 3, mg.cnt);
check('fusion : étoiles des morceaux = max', mg.songStars.lune === 3 && mg.songStars.ode === 1, mg.songStars);
check('fusion : badges = union, date la plus ancienne', mg.badges.night === '2026-10-10' && mg.badges.xp10k === '2026-10-01' && mg.badges.duel1 === '2026-09-01', mg.badges);
const mg2 = JSON.parse(await p.X('JSON.stringify(mergeState({...S, badges:undefined, cnt:undefined}, {}).merged)'));
check('fusion : deux états sans ces clés = pas de clé ajoutée', !('badges' in mg2) && !('cnt' in mg2));
check('textes : 30 badges nommés en FR et en EN', await p.X('ACH.length===30 && ACH.every(([id])=>TXT.fr.achB[id] && TXT.en.achB[id] && TXT.fr.achB[id][1] && TXT.en.achB[id][1]) && Object.keys(TXT.fr.achB).length===30 && Object.keys(TXT.en.achB).length===30'));
check('textes : clés achT/achTab/achGot dans les deux langues', await p.X('["achTab","achBadges","achCount","achT","achGot","achGotN","achNtfT","achOn","achOff","achShareK","achShareTx","achClose"].every(k=>TXT.fr[k]!=null && TXT.en[k]!=null)'));
errs.push(...p.errs); await p.close();
p = await open({ width: 1024, height: 768 }, { ...BASE, settings: { ...BASE.settings, lang: 'en', notation: 'en' } });
await openSuc(p);
check('anglais : onglet « Achievements », tuiles et badges traduits', await p.evaluate(() => document.querySelector('#pfNav [data-v=suc]').textContent === 'Achievements' && /Total XP/.test(document.getElementById('achTiles').textContent) && /of 30/.test(document.getElementById('achCount').textContent) && /Circle of fifths/.test(document.getElementById('achGrid').textContent)));
errs.push(...p.errs); await p.close();

// 5) aucun défilement de page ; la grille défile dans sa carte
const FULL = { ...RICH, badges: { xp10k: '2026-10-01', ear: '2026-10-02', night: '2026-10-03' } };
for (const [w, h] of [[1024, 768], [768, 1024], [1366, 1024], [1280, 800], [375, 667], [812, 375], [390, 844]]) {
  for (const theme of ['dark', 'light']) {
    p = await open({ width: w, height: h }, { ...FULL, settings: { ...FULL.settings, theme } });
    await openSuc(p);
    const m = await p.evaluate(() => { const mn = document.getElementById('main'), g = document.getElementById('achGrid'), box = document.getElementById('achBox').getBoundingClientRect();
      return { main: mn.scrollHeight <= mn.clientHeight + 1, doc: document.documentElement.scrollHeight <= innerHeight + 1, wide: document.documentElement.scrollWidth <= innerWidth + 1,
        grid: getComputedStyle(g).overflowY, inView: box.bottom <= innerHeight + 1, gh: g.clientHeight, tiles: [...document.querySelectorAll('#achTiles .ach-t')].every(t => { const r = t.getBoundingClientRect(); return r.height > 40 && r.bottom <= innerHeight; }) }; });
    check(`${w}×${h} ${theme} : pas de défilement de page, grille qui défile dans sa carte`, m.main && m.doc && m.wide && m.grid === 'auto' && m.inView && m.gh > 60 && m.tiles, m);
    if (SHOT) { if (w === 1024 && theme === 'dark') { await p.click('#achGrid [data-id=fifths]'); await W(200); } await p.screenshot({ path: `${SHOT}/succes-${w}x${h}-${theme}.png` }); }
    errs.push(...p.errs); await p.close();
  }
}

check('aucune erreur JS', errs.length === 0, errs.slice(0, 5));
await b.close();
console.log(fails.length ? `\n${fails.length} échec(s)` : '\nTout est OK');
process.exit(fails.length ? 1 : 0);
