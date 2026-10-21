// Quiz online + bots (Oct 2026). Supabase Realtime is replaced by a fake built on BroadcastChannel (pages of one browser context talk to each other),
// with presence (track / untrack / sync) and broadcast. Checks: a friend joins with the code, both see the same questions and scores, the host drives the game;
// two players searching are paired and the game starts; the guest is told when the host leaves; local bots answer by themselves.
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = process.env.PORT || '8767', URL = `http://localhost:${PORT}/`;
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d ? ' — ' + JSON.stringify(d) : '')); if (!ok) fails.push(n); };
const FAKE_RT = `(() => {
  const subs = [];
  function channel(name, opts) {
    const key = (opts && opts.config && opts.config.presence && opts.config.presence.key) || Math.random().toString(36).slice(2);
    const bc = new BroadcastChannel('fake-rt-' + name), others = new Map(); let mine = null; const on = { b: [], p: [] };
    const sync = () => on.p.forEach(f => f());
    bc.onmessage = ({ data: m }) => {
      if (m.k === 'b') on.b.filter(x => x.ev === m.ev).forEach(x => x.cb({ payload: m.payload }));
      else if (m.k === 'hello') { if (mine) bc.postMessage({ k: 'p', key, meta: mine }); }
      else if (m.k === 'p') { if (m.meta) others.set(m.key, m.meta); else others.delete(m.key); sync(); }
    };
    const ch = {
      on(type, filter, cb) { if (type === 'broadcast') on.b.push({ ev: filter.event, cb }); else on.p.push(cb); return ch; },
      subscribe(cb) { setTimeout(() => { bc.postMessage({ k: 'hello' }); cb('SUBSCRIBED'); }, 20); return ch; },
      async track(meta) { mine = meta; bc.postMessage({ k: 'p', key, meta }); setTimeout(sync, 0); return 'ok'; },
      async untrack() { mine = null; bc.postMessage({ k: 'p', key, meta: null }); return 'ok'; },
      send(m) { bc.postMessage({ k: 'b', ev: m.event, payload: m.payload }); return Promise.resolve('ok'); },
      presenceState() { const s = {}; others.forEach((v, k) => s[k] = [v]); if (mine) s[key] = [mine]; return s; },
      _close() { if (mine) bc.postMessage({ k: 'p', key, meta: null }); mine = null; bc.close(); }
    };
    subs.push(ch); return ch;
  }
  window.addEventListener('pagehide', () => subs.forEach(c => { try { c._close(); } catch (e) {} }));
  window.supabase = { createClient: () => ({
    auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; }, signOut: async () => ({}) },
    channel, removeChannel(c) { try { c._close(); } catch (e) {} },
    from() { return { select() { return { eq() { return { maybeSingle: async () => ({ data: null, error: null }) }; } }; }, upsert: async () => ({ error: null }) }; },
    rpc: async () => ({ data: [], error: null })
  }) };
})();`;
const seed = (name, extra = {}) => `(()=>{ try{ if(sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded','1');
  localStorage.setItem('memo-gammes-v1', JSON.stringify({settings:{lang:'fr',notation:'fr',input:'screen',earV2:true,diffV2:true,midiV2:true,uiSound:false,
    quiz:Object.assign({where:'online',netName:${JSON.stringify(name)},diff:1,ans:'notes',count:5,time:20,theme:'all',keys:true}, ${JSON.stringify(extra)})},
    langV2:true,gate:'guest',onb:{done:1},tourDone:1,introSeen:{chords:1,scales:1,harmony:1,prog:1,ear:1,games:1,daily:1,section:1},seenTypes:[],stats:{},secStats:{},xp:500,xpDays:{},streak:{days:0}})); }catch(e){} })();`;
const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
await ctx.addInitScript(FAKE_RT);
async function open(name, extra) { const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.errs = errs;
  await p.addInitScript(seed(name, extra)); await p.goto(URL); await p.waitForTimeout(600);
  await p.evaluate(() => document.querySelector('#modeNav [data-mode=quiz]').click());
  for (let i = 0; i < 40 && !(await p.evaluate(() => !!window.QUIZ_DATA)); i++) await p.waitForTimeout(100);
  await p.waitForTimeout(400); return p; }
const rightIdx = p => p.evaluate(() => { const D = window.QUIZ_DATA, txt = document.getElementById('qzText').textContent; const q = D.q.find(x => x[2] === txt); if (!q) return -1;
  return [...document.querySelectorAll('#qzAns .qz-a .qz-at')].findIndex(e => e.textContent === q[3][0]); });
const tap = (p, k) => p.evaluate(k => document.querySelectorAll('#qzAns .qz-a')[k].click(), k);
const scores = p => p.evaluate(() => [...document.querySelectorAll('#qzScores .qz-ps')].map(d => d.querySelector('b').textContent.replace(/ \(toi\)$/, '') + ':' + d.querySelector('.qz-pts').textContent));
const view = p => p.evaluate(() => ['qzSetup', 'qzPlay', 'qzEnd'].find(id => !document.getElementById(id).hidden));
const W = (p, ms) => p.waitForTimeout(ms);

// 1) a friend joins with the code
const A = await open('Alice'), B = await open('Bruno');
check('en ligne : compteur de joueurs affiché', /en ligne/.test(await A.evaluate(() => document.getElementById('qzOnlineN').textContent)));
await A.evaluate(() => document.getElementById('qzCreate').click()); await W(A, 400);
const code = await A.evaluate(() => document.getElementById('qzRoomCode').textContent);
check('ami : un code de 5 caractères est créé', /^[A-Z2-9]{5}$/.test(code), { code });
await B.fill('#qzCodeIn', code); await B.evaluate(() => document.getElementById('qzJoin').click()); await W(B, 600);
const roomA = await A.evaluate(() => [...document.querySelectorAll('#qzRoomPl li b')].map(b => b.textContent));
check('ami : l’hôte voit les 2 joueurs', roomA.length === 2, roomA);
check('ami : seul l’hôte a le bouton Lancer', await A.evaluate(() => !document.getElementById('qzRoomGo').hidden && !document.getElementById('qzRoomGo').disabled) && await B.evaluate(() => document.getElementById('qzRoomGo').hidden));
await A.evaluate(() => document.getElementById('qzRoomGo').click()); await W(A, 600);
check('ami : la partie démarre chez les deux', (await view(A)) === 'qzPlay' && (await view(B)) === 'qzPlay');
const qa = await A.evaluate(() => document.getElementById('qzText').textContent), qb = await B.evaluate(() => document.getElementById('qzText').textContent);
check('ami : même question des deux côtés', qa === qb && qa.length > 5, { qa, qb });
const ra = await rightIdx(A), rb = await rightIdx(B);
await tap(A, ra); await W(A, 200);
check('ami : après la réponse de A, on attend B', await A.evaluate(() => document.getElementById('qzNext').hidden));
await tap(B, (rb + 1) % 4); await W(A, 500);
const sa = await scores(A), sb2 = await scores(B);
check('ami : scores identiques chez A et B (A juste, B faux)', JSON.stringify(sa) === JSON.stringify(sb2) && /Alice:\d{3}/.test(sa[0]) && /Bruno:0/.test(sa[1]), { sa, sb2 });
check('ami : réponse révélée chez les deux, seul l’hôte a « Question suivante »', await A.evaluate(() => !document.getElementById('qzNext').hidden) && await B.evaluate(() => document.getElementById('qzNext').hidden && !!document.querySelector('#qzAns .qz-a.right')));
for (let i = 1; i < 5; i++) { await A.evaluate(() => document.getElementById('qzNext').click()); await W(A, 400); const r = await rightIdx(B); await tap(B, r); await tap(A, (await rightIdx(A) + 1) % 4); await W(A, 400); }
await A.evaluate(() => document.getElementById('qzNext').click()); await W(A, 600);
check('ami : podium chez les deux', (await view(A)) === 'qzEnd' && (await view(B)) === 'qzEnd');
const winB = await B.evaluate(() => document.getElementById('qzEndT').textContent);
check('ami : Bruno gagne (4 bonnes réponses contre 1)', /Bruno/.test(winB), { winB });
// host leaves during a new game
await A.evaluate(() => document.getElementById('qzAgain').click()); await W(A, 600);
check('rejouer : nouvelle partie chez les deux', (await view(A)) === 'qzPlay' && (await view(B)) === 'qzPlay');
await A.close(); await W(B, 700);
check('l’hôte part : l’invité est prévenu', (await view(B)) === 'qzSetup' && /hôte/.test(await B.evaluate(() => document.getElementById('qzNetMsg').textContent)), await B.evaluate(() => document.getElementById('qzNetMsg').textContent));
await B.close();

// 2) random player: two people searching are paired and the game starts by itself
const C = await open('Chloé'), D = await open('David');
await C.evaluate(() => document.getElementById('qzSearchBtn').click()); await W(C, 300);
check('hasard : recherche en cours', await C.evaluate(() => !document.getElementById('qzSearching').hidden));
await D.evaluate(() => document.getElementById('qzSearchBtn').click()); await W(D, 1500);
check('hasard : les deux joueurs sont associés et jouent', (await view(C)) === 'qzPlay' && (await view(D)) === 'qzPlay', [await view(C), await view(D)]);
const names = await D.evaluate(() => [...document.querySelectorAll('#qzScores .qz-ps b')].map(b => b.textContent));
check('hasard : chacun voit l’autre', names.some(n => /Chloé/.test(n)) && names.some(n => /David/.test(n)), names);
await C.close(); await D.close();

// 3) local bots
const E = await open('Emma', { where: 'local', n: 1, bots: 2, botLvl: 3, time: 10 });
await E.evaluate(() => document.getElementById('qzGo').click()); await W(E, 300);
const pl = await E.evaluate(() => [...document.querySelectorAll('#qzScores .qz-ps b')].map(b => b.textContent));
check('bots : 1 joueur + 2 bots', pl.length === 3 && pl.filter(n => /Robo/.test(n)).length === 2, pl);
await tap(E, await rightIdx(E)); await W(E, 3800);
check('bots : les bots répondent seuls et la question se termine', await E.evaluate(() => !document.getElementById('qzNext').hidden));
check('aucune erreur JS', [A, B, C, D, E].every(p => !p.errs.length), [A, B, C, D, E].map(p => p.errs));
await b.close();
if (fails.length) { console.log('\nECHEC r7 :', fails); process.exit(1); }
console.log('\nr7 OK');
