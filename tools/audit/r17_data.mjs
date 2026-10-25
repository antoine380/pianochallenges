// Chantier DATA (audit break-ui du 21/10/2026) : données de pire cas (pseudos longs / RTL / bidi / vides, 9 999 999 XP,
// toi classé 1 284e, scores à 5 chiffres, 60 notifications…) sur le classement, l'accueil, la fiche Progression,
// les notifications, le HUD de duel, la carte de partage, les tuiles des jeux et le podium du quiz.
// Usage : PORT=8793 NODE_PATH=… PW_CHROMIUM=… node tools/audit/r17_data.mjs
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = process.env.PORT || '8767', URL = `http://localhost:${PORT}/`;
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d ? ' — ' + JSON.stringify(d) : '')); if (!ok) fails.push(n); };
const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});

// faux SDK Supabase : session connectée, leaderboard de 50 lignes, my_rank selon window.__FAKE.myRank (absent = RPC pas encore installée)
const FAKESB = `(()=>{ const F=()=>window.__FAKE||{};
  const qb=t=>{ const b={ select(){return b;}, eq(){return b;}, gte(){return b;}, order(){return b;}, limit(){return b;}, upsert(){return b;}, insert(){return b;}, update(){return b;},
    maybeSingle:async()=>({data:null,error:null}), single:async()=>({data:null,error:null}), then(ok,ko){ return Promise.resolve(t==='profiles'?{data:F().leaderboard||[],error:null}:{data:null,error:null}).then(ok,ko); } }; return b; };
  const ch=()=>{ const c={ on(){return c;}, subscribe(cb){ setTimeout(()=>cb&&cb('SUBSCRIBED'),10); return c; }, track:async()=>'ok', untrack:async()=>'ok', send:async()=>'ok', presenceState(){ return {}; } }; return c; };
  const client={ auth:{ getSession:async()=>({data:{session:F().user?{user:F().user,access_token:'x'}:null}}), onAuthStateChange(){ return {data:{subscription:{unsubscribe(){}}}}; }, signOut:async()=>({error:null}) },
    from:qb, channel:ch, removeChannel(){},
    rpc:async(n)=>{ const f=F(); if(n==='leaderboard') return {data:f.leaderboard||[],error:null}; if(n==='add_xp') return {data:0,error:null};
      if(n==='my_rank') return f.myRank===undefined?{data:null,error:{message:'Could not find the function public.my_rank',code:'PGRST202'}}:{data:f.myRank,error:null}; return {data:null,error:null}; } };
  window.supabase={ createClient:()=>client }; })();`;
const NAMES = ['Aleksandra Wiśniewska-Ko', 'bartholomew.fitzgerald.n', 'J', '   ', '👩🏽‍💻 Priya 🎹🎶✨🎼', 'نور الهدى عبد الرحمن', 'Ana‮321 PX 0009', '<img src=x onerror="window.__pwn=1">'];
const LB = Array.from({ length: 50 }, (_, i) => ({ id: 'w' + i, name: NAMES[i] ?? ('Joueur ' + (i + 1)), avatar: i % 10, photo: i === 2 ? 'https://example.com/404.png' : null, level: 60 - i, streak: i < 2 ? 1000 : i, xp: [9999999, 8888888, 1284000][i] ?? 9000 - i * 150 }));
const USER = { id: 'me', email: 'bartholomew.fitzgerald+piano@northwind-industries-holdings.example.com', user_metadata: { full_name: 'Christopher Alexander Montgomery-Wettstein III' } };
const today = new Date(); const d = n => { const x = new Date(today); x.setDate(x.getDate() - n); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
const STATE = { xp: 9999999, xpDays: { [d(0)]: 9999 }, streak: { days: 1000, last: d(0) }, gate: 'guest', onb: { done: 1 }, tourDone: 1, langV2: true, netId: 'pabcd1234',
  introSeen: { scales: 1, chords: 1, harmony: 1, prog: 1, ear: 1, games: 1, daily: 1 }, stats: {}, mastery: {}, srs: {}, daily: {},
  gameBest: { runner: 99999, speed: 1284, memory: 87 }, runnerBest: 99999, secStats: { chords: { ok: 1, perfect: 1 } }, refStats: { n: 1, m: 1 },
  elo: { 'runner-chords': { r: 3000, n: 1284, w: 999, d: 12, l: 273, h: [] }, 'speed-chords': { r: 812, n: 3, w: 2, d: 0, l: 1, h: [] } },
  notifs: { list: Array.from({ length: 60 }, (_, i) => ({ id: 'x' + i, cat: 'social', type: 'rank', t: Date.now() - i * 3600e3, ti: 'bartholomew.fitzgerald.nbartholomew.fitzgerald.nbartholomew', tx: 'Tu es 1284e au classement de la semaine. '.repeat(5), act: i % 2 ? null : { k: 'rank', l: 'ntfSee' }, read: false })), keys: {}, init: 1, nv2: 1 },
  settings: { lang: 'fr', notation: 'fr', input: 'screen', unlockAll: true, labels: true, uiSound: false } };

async function open(vp, fake, st = STATE) {
  const c = await b.newContext({ viewport: vp, hasTouch: vp.width < 900 });
  await c.route('**/assets/js/supabase-*.js', r => r.fulfill({ status: 200, body: FAKESB, headers: { 'content-type': 'application/javascript' } }));
  await c.route('https://example.com/**', r => r.fulfill({ status: 404, body: '' }));
  await c.route(u => u.href.startsWith(URL) && (u.pathname === '/' || u.pathname === '/index.html'), async r => { const res = await r.fetch(); let h = await res.text(); const e = h.lastIndexOf('})();\n</script>'); h = h.slice(0, e) + '\nwindow.__X=s=>eval(s);\n' + h.slice(e); await r.fulfill({ response: res, body: h, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.addInitScript(`window.__FAKE=${JSON.stringify(fake)}; if(!sessionStorage.getItem('s')){ sessionStorage.setItem('s','1'); localStorage.setItem('memo-gammes-v1', ${JSON.stringify(JSON.stringify(st))}); }`);
  await p.goto(URL); await p.waitForFunction(() => !!window.__X, null, { timeout: 15000 }); await p.waitForTimeout(1500);
  p.X = s => p.evaluate(s => window.__X(s), s); return p;
}
const errs = [];

// 1) classement sur téléphone + toi 1 284e
let p = await open({ width: 375, height: 667 }, { leaderboard: LB, user: USER, myRank: [{ rank: 1284, xp: 12840 }] });
await p.X('openPage("rank")'); await p.waitForTimeout(2000);
const rk = await p.evaluate(() => { const L = [...document.querySelectorAll('#rankList li:not(.sep)')]; return { n: L.length, hMax: Math.max(...L.map(l => l.getBoundingClientRect().height)),
  me: [...document.querySelectorAll('#rankList li.me b')].map(b => b.textContent), sep: !!document.querySelector('#rankList li.sep'),
  overlap: L.some(l => { const b = l.querySelector('b').getBoundingClientRect(), n = l.querySelector('.num').getBoundingClientRect(); return b.right > n.left + 1; }),
  bdi: L.slice(0, 8).every(l => l.querySelector('b bdi')), names: L.slice(0, 8).map(l => l.querySelector('b').textContent), imgs: L.slice(0, 4).map(l => l.querySelector('.av').firstElementChild.tagName), w: document.documentElement.scrollWidth }; });
check('classement 375 : lignes d’une hauteur ≤ 60 px, nom sans chevauchement de l’XP', rk.hMax <= 60 && !rk.overlap, rk.hMax);
check('classement : « … » puis « 1 284e · Toi »', rk.sep && rk.me.length === 1 && /^1\s284e · Toi$/.test(rk.me[0]), rk.me);
check('classement : noms en <bdi>, sans contrôle bidi, « Joueur » pour un nom vide, HTML en texte', rk.bdi && rk.names[3] === 'Joueur' && rk.names[6] === 'Ana321 PX 0009' && rk.names[7].startsWith('<img'), rk.names);
check('classement : photo en 404 remplacée par l’avatar dessiné', rk.imgs[2] === 'svg', rk.imgs);
check('classement : XP formatée « 9 999 999 XP »', await p.evaluate(() => /^9\s999\s999 XP$/.test(document.querySelector('#rankList .num').textContent)));
check('aucun script injecté', !(await p.evaluate(() => window.__pwn)));
await p.X('openPage("hub")'); await p.X('hsRankAt=0;renderHubRank()'); await p.waitForTimeout(1500);
errs.push(...p.errs); await p.context().close();
p = await open({ width: 1280, height: 800 }, { leaderboard: LB, user: USER, myRank: [{ rank: 1284, xp: 12840 }] });
await p.X('hsRankAt=0;renderHubRank()'); await p.waitForTimeout(1500);
check('accueil : classement de la semaine avec « 1 284e · Toi »', await p.evaluate(() => /1\s284e · Toi/.test(document.querySelector('#hsRank li.me').textContent)));
errs.push(...p.errs); await p.context().close();
// RPC absente : rien d'affiché, rien de cassé
p = await open({ width: 375, height: 667 }, { leaderboard: LB, user: USER });
await p.X('openPage("rank")'); await p.waitForTimeout(2000);
check('my_rank pas encore installée : pas de ligne « Toi », 50 lignes', await p.evaluate(() => !document.querySelector('#rankList li.me') && !document.querySelector('#rankList li.sep') && document.querySelectorAll('#rankList li').length === 50));
errs.push(...p.errs); await p.context().close();

// 2) fiche Progression : 4 cartes visibles sur grand écran, carrousel avec points sur téléphone
for (const [vp, mode] of [[{ width: 1280, height: 800 }, 'grid'], [{ width: 768, height: 1024 }, 'grid'], [{ width: 375, height: 667 }, 'row']]) {
  p = await open(vp, { leaderboard: LB, user: USER });
  await p.X('openSet("progress")'); await p.waitForTimeout(900);
  const f = await p.evaluate(() => { const r = document.querySelector('#progFiche .pf-row'), R = r.getBoundingClientRect(); const C = [...r.children].map(c => c.getBoundingClientRect());
    return { inside: C.every(c => c.left >= R.left - 1 && c.right <= R.right + 1), ov: r.dataset.ov || '', dots: getComputedStyle(document.getElementById('pfDots')).display, nDots: document.querySelectorAll('#pfDots button').length,
      rec: [...document.querySelectorAll('#pfRecs li')].find(l => l.querySelector('small')), recH: (() => { const l = [...document.querySelectorAll('#pfRecs li')].find(l => l.querySelector('small')); return l && Math.round(l.firstChild.getBoundingClientRect().height); })() }; });
  if (mode === 'grid') check(`fiche ${vp.width} : les 4 cartes entières, pas de points`, f.inside && f.dots === 'none', f);
  else check('fiche 375 : carrousel avec fondu à droite et 4 points', f.ov === 'r' && f.dots !== 'none' && f.nDots === 4, f);
  check(`fiche ${vp.width} : record ELO avec bilan V/N/D sur sa ligne, libellé ≤ 2 lignes`, f.rec && f.recH <= 44, f.recH);
  errs.push(...p.errs); await p.context().close();
}

// 3) notifications : titre insécable dans la carte, texte ≤ 2 lignes
p = await open({ width: 375, height: 667 }, {});
await p.X('openPage("notif")'); await p.waitForTimeout(700);
const nt = await p.evaluate(() => [...document.querySelectorAll('#ntfList .ntf-it')].slice(0, 6).map(li => { const b = li.querySelector('.ntf-tx b').getBoundingClientRect(), c = li.getBoundingClientRect(), go = li.querySelector('.ntf-go'), sp = li.querySelector('.ntf-tx span');
  return { out: b.right > c.right + 1 || (go && b.right > go.getBoundingClientRect().left + 1), lines: Math.round(sp.getBoundingClientRect().height / parseFloat(getComputedStyle(sp).lineHeight)) }; }));
check('notifications : titre insécable dans la carte, texte sur 2 lignes max', nt.every(x => !x.out && x.lines <= 2), nt);
errs.push(...p.errs); await p.context().close();

// 4) HUD de duel 99 999 – 99 998 sur téléphone, carte de partage
p = await open({ width: 375, height: 667 }, {});
await p.X('openPage("games")'); await p.X('gameOpen("runner")'); await p.waitForTimeout(400);
await p.X('duBegin({mode:"online",seed:1,rated:true,game:"runner",cont:"chords",opp:{id:"pzzzz0001",name:qzSafe("Aleksandra Wiśniewska-Kowalczyk"),elo:3500,av:9}})'); await p.waitForTimeout(3000);
await p.X('DU.me.score=99999;DU.opp.score=99998;duHud()'); await p.waitForTimeout(150);
const hud = await p.evaluate(() => { const s = document.getElementById('duOpSc'), n = document.getElementById('duOpName'), sr = s.getBoundingClientRect(), nr = n.getBoundingClientRect(); return { txt: s.textContent, overlap: sr.right > nr.left + 1, spill: s.scrollWidth > s.clientWidth + 1, title: n.title }; });
check('HUD duel 375 : score à 5 chiffres sans chevaucher le nom', !hud.overlap && !hud.spill && /^99\s998$/.test(hud.txt), hud);
const share = await p.X(`(async()=>{ const W=[]; for(const big of ["312 – 287","99 999 – 99 998"]){ const c=document.createElement('canvas').getContext('2d'); let fs=260; c.font='700 '+fs+'px Fredoka, Nunito, system-ui, sans-serif'; while(c.measureText(big).width>920 && fs>80){ fs-=10; c.font='700 '+fs+'px Fredoka, Nunito, system-ui, sans-serif'; } W.push(Math.round(72+c.measureText(big).width)); } const f=await shareCard("Saute-notes · "+"x".repeat(80),"99 999 – 99 998","Victoire","#26805a"); return {W, ok:!!f}; })()`);
check('carte de partage : le score tient dans 1 080 px', share.ok && share.W.every(w => w <= 1000), share);
check('qzSafe : 14 graphèmes, pas de demi-emoji, pas de bidi', await p.X('[qzSafe("Jo 🎹🎹🎹🎹🎹🎹🎹🎹🎹🎹🎹🎹🎹🎹"), qzSafe("Ana\\u202e321")].every(s=>!/[\\ud800-\\udbff](?![\\udc00-\\udfff])/.test(s) && !/[\\u202a-\\u202e]/.test(s))'));
check('pseudo : « J », espaces et bidi refusés, 24 caractères acceptés', await p.X('nameErr("J")==="pseudoShort" && nameErr("   ")==="pseudoShort" && nameErr("Ana\\u202e321")==="pseudoBad" && nameErr("Aleksandra Wiśniewska-Ko")===""'));
errs.push(...p.errs); await p.context().close();

// 5) tuiles des jeux (EN, 375) : objet 3D hors du titre, « ? » sur l'ELO provisoire ; pluriel « 1 réussi »
p = await open({ width: 375, height: 667 }, {}, { ...STATE, settings: { ...STATE.settings, lang: 'en', notation: 'en' } });
await p.X('openPage("games")'); await p.waitForTimeout(800);
const tl = await p.evaluate(() => [...document.querySelectorAll('#gameCards .ptile,#playCards .ptile')].filter(t => { const h = t.querySelector('.h3'), o = t.querySelector('.obj').getBoundingClientRect(); const rg = document.createRange(); rg.selectNodeContents(h); return [...rg.getClientRects()].some(r => r.right > o.left + 4 && r.left < o.right && r.bottom > o.top + 4 && r.top < o.bottom - 4); }).map(t => t.querySelector('.h3').textContent));
check('tuiles 375 EN : aucun titre sous l’objet 3D', !tl.length, tl);
check('tuiles : « ELO 812? » provisoire, « 99,999 »', await p.evaluate(() => /ELO\s812\?/.test(document.querySelector('#gameCards').textContent) && /99,999/.test(document.querySelector('#gameCards').textContent)));
check('pluriels EN : 0 mistakes, 1 mistake', await p.X('t("errors")(0)==="0 mistakes" && t("errors")(1)==="1 mistake"'));
await p.X('S.settings.lang="fr"'); check('pluriel FR : « 1 réussi », « 2 réussis », « 1 ami inscrit »', await p.X('t("pcSolved")(1)==="1 réussi" && t("pcSolved")(2)==="2 réussis" && t("invStatF")(1)==="Ami inscrit"'));
errs.push(...p.errs); await p.context().close();

// 6) podium du quiz 2×2 sur téléphone
p = await open({ width: 375, height: 667 }, {});
await p.X('openPage("quiz")'); await p.X('qzLoad()'); await p.waitForTimeout(1200);
await p.X(`NET.host=true; qzOnlineBegin({idx:[0,1,2,3,4],cfg:{diff:1,ans:"notes",time:20,keys:true},players:[{id:"pabcd1234",name:qzSafe("山田太郎ピアノ大好きです")},{id:"pq1",name:"Aleksandra Wiś"},{id:"pq2",name:"نور الهدى"},{id:"pq3",name:"J"}]})`); await p.waitForTimeout(800);
await p.X('QZ.players.forEach((q,i)=>q.score=[99999,1284,7,0][i]); qzFinish()'); await p.waitForTimeout(800);
const pod = await p.evaluate(() => { const P = [...document.querySelectorAll('#qzPodium .qz-pod')].map(e => e.getBoundingClientRect()); return { n: P.length, allVisible: P.every(r => r.bottom <= innerHeight), cols: new Set(P.map(r => Math.round(r.left))).size, bdi: !!document.querySelector('#qzEndT bdi') }; });
check('fin de quiz 375 : podium 2×2, les 4 visibles, gagnant en <bdi>', pod.n === 4 && pod.allVisible && pod.cols === 2 && pod.bdi, pod);
errs.push(...p.errs); await p.context().close();

check('aucune erreur JS', !errs.length, errs.slice(0, 3));
await b.close();
console.log(fails.length ? `\n${fails.length} échec(s)` : '\nTout est OK'); process.exit(fails.length ? 1 : 0);
