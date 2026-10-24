// Chantier BACK OFFICE : la mesure d'usage de l'app (module « Mesure » en fin de script).
// Vérifie : événements mis en file puis envoyés par lots (track_events) avec le contexte (langue, appareil, entrée, version) ;
// acc_end (Accompagnement) et song_open (PLAY) ; réglages à distance app_config (actualités, flags) ; « Signaler un problème » (send_feedback) ; erreurs JS (log_errors) ;
// interrupteur « Aider à améliorer l'app » coupé = rien n'est envoyé ; serveur qui refuse (404, 500, réseau coupé) = aucune
// erreur ; en local sans « pc-trk-test », aucune requête vers Supabase. Aucun service en ligne : tout Supabase est intercepté.
// Usage : PORT=8797 NODE_PATH=… PW_CHROMIUM=… node tools/audit/r41_track.mjs
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = process.env.PORT || '8767', URL = `http://localhost:${PORT}/`;
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d !== undefined && !ok ? ' — ' + JSON.stringify(d).slice(0, 400) : '')); if (!ok) fails.push(n); };
const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const STATE = { gate: 'guest', onb: { done: 1 }, tourDone: 1, langV2: true, introSeen: { scales: 1, chords: 1, harmony: 1, prog: 1, ear: 1, games: 1, daily: 1, hub: 1, learn: 1, practice: 1 },
  settings: { lang: 'fr', notation: 'fr', input: 'screen', uiSound: false } };
const CONFIG = [{ key: 'news', value: { fr: [['Titre test', 'Une actualité venue du back office', '#1f7a52', 'M4 4h16v16H4z']], en: [['Test title', 'News from the back office', '#1f7a52', 'M4 4h16v16H4z']] } },
  { key: 'flags', value: { errSample: 1, paywall: false } }, { key: 'daily', value: { len: 6 } }];

async function open({ force = true, track = 'ok', st = STATE, vp = { width: 1280, height: 800 } } = {}) {
  const c = await b.newContext({ viewport: vp });
  const log = { track: [], cfg: 0, fb: [], err: [], any: 0 };
  await c.route('https://ijdxeasxmgevuchyuenn.supabase.co/**', async r => {
    log.any++; const u = r.request().url(); (log.urls = log.urls || []).push(u.replace(/\?.*/, ''));
    if (u.includes('/rest/v1/app_config')) { log.cfg++; return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(CONFIG) }); }
    if (u.includes('/rpc/track_events')) {
      const body = JSON.parse(r.request().postData() || '{}'); log.track.push(body);
      const mode = typeof track === 'function' ? track() : track;
      if (mode === 'abort') return r.abort('internetdisconnected');
      if (mode === '404') return r.fulfill({ status: 404, contentType: 'application/json', body: '{"code":"PGRST202","message":"Could not find the function public.track_events"}' });
      if (mode === '500') return r.fulfill({ status: 500, body: '' });
      return r.fulfill({ status: 200, contentType: 'application/json', body: String(body.p_evts.length) });
    }
    if (u.includes('/rpc/send_feedback')) { log.fb.push(JSON.parse(r.request().postData() || '{}')); return r.fulfill({ status: 200, contentType: 'application/json', body: 'true' }); }
    if (u.includes('/rpc/log_errors')) { log.err.push(JSON.parse(r.request().postData() || '{}')); return r.fulfill({ status: 200, contentType: 'application/json', body: '1' }); }
    return r.fulfill({ status: 404, body: '' });
  });
  await c.route(u => u.href.startsWith(URL) && (u.pathname === '/' || u.pathname === '/index.html'), async r => { const res = await r.fetch(); let h = await res.text(); const e = h.lastIndexOf('})();\n</script>'); h = h.slice(0, e) + '\nwindow.__X=s=>eval(s);\n' + h.slice(e); await r.fulfill({ response: res, body: h, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  const p = await c.newPage(); p.errs = []; p.cons = [];
  p.on('pageerror', e => p.errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) p.cons.push(m.text()); });
  await p.addInitScript(`if(!sessionStorage.getItem('s')){ sessionStorage.setItem('s','1'); localStorage.clear(); localStorage.setItem('memo-gammes-v1', ${JSON.stringify(JSON.stringify(st))}); ${force ? "localStorage.setItem('pc-trk-test','1');" : ''} }`);
  await p.goto(URL); await p.waitForFunction(() => !!window.__X, null, { timeout: 15000 }); await p.waitForTimeout(3200);
  p.X = s => p.evaluate(s => window.__X(s), s); p.log = log; return p;
}
const evNames = log => log.track.flatMap(x => x.p_evts.map(e => e.n));

// 1) file d'attente, envoi groupé, contexte, réglages à distance
let p = await open();
const q0 = await p.X('TRK.q.map(e=>e.n)');
check('app_open mis en file au démarrage (pas envoyé tout de suite)', q0.includes('app_open') && p.log.track.length === 0, q0);
check('app_config lu au démarrage', p.log.cfg === 1);
const news = await p.evaluate(() => [...document.querySelectorAll('#hsSlides .hs-slide b')].map(b => b.textContent));
check('actualités de l’accueil remplacées par app_config', news.length === 1 && news[0] === 'Titre test', news);
check('flags lus (errSample, paywall) et daily.len', await p.X('RC.flags.errSample===1 && RC.flags.paywall===false && RC.daily.len===6 && paywallOn()===false'));
await p.X('setInput("mic")'); await p.waitForTimeout(300); await p.X('setInput("screen")'); await p.waitForTimeout(200);
await p.X('track("learn_end",{what:"chords",n:3,good:2,complete:true,secret:{x:1}})');
await p.X('trkFlush()'); await p.waitForTimeout(600);
check('un seul lot envoyé avec les événements en file', p.log.track.length === 1, p.log.track.length);
const sent = p.log.track[0] || { p_evts: [] };
const e0 = sent.p_evts.find(e => e.n === 'app_open') || {};
check('lot : identifiant anonyme + événements app_open, input_mode, learn_end', /^[A-Za-z0-9_-]{8,40}$/.test(sent.p_anon || '') && ['app_open', 'input_mode', 'learn_end'].every(n => evNames(p.log).includes(n)), evNames(p.log));
check('contexte joint : langue, appareil, plateforme, entrée, version', e0.l === 'fr' && e0.d === 'desktop' && e0.s === 'web' && ['screen', 'mic', 'midi', 'none'].includes(e0.i) && typeof e0.v === 'string' && e0.v.length > 0, e0);
const le = sent.p_evts.find(e => e.n === 'learn_end') || { p: {} };
check('propriétés : textes courts, objets imbriqués écartés', le.p.what === 'chords' && le.p.n === '3' && le.p.complete === '1' && !('secret' in le.p), le.p);
check('premier lancement repéré (first=1)', e0.p && e0.p.first === '1', e0.p);
check('file vidée après envoi', (await p.X('TRK.q.length')) === 0);
// nouvelles activités (étape 4) : fin d'Accompagnement (acc_end) et ouverture d'un morceau du catalogue (song_open)
await p.X('accOpen(); accStart(); ACC.run.ev=[{st:1},{st:1},{st:2}]; ACC.run.okN=3; ACC.run.badN=0; accFinish();'); await p.waitForTimeout(200);
const ae = await p.X('(TRK.q.find(e=>e.n==="acc_end")||{}).p||null');
check('acc_end : style, pattern, étoiles, tempo', !!ae && !!ae.style && !!ae.pattern && /^[0-3]$/.test(ae.stars) && /^\d+$/.test(ae.tempo) && !!ae.mode, ae);
await p.X('openPlayWith("#song=lune&arr=2")'); await p.waitForTimeout(400);
const so = await p.X('(TRK.q.find(e=>e.n==="song_open")||{}).p||null');
check('song_open : id et version du morceau', !!so && so.id === 'lune' && so.arr === '2', so);
check('badges : pas de fonction de badges → aucun événement badge (et pas d’erreur)', await p.X('typeof badgeCheck!=="function" && !TRK.q.some(e=>e.n==="badge") && typeof trkBadge==="function"'));
await p.X('openPage("hub")'); await p.waitForTimeout(300);
await p.X('trkFlush()'); await p.waitForTimeout(500); p.log.track.length = 1; // ce lot-ci ne compte pas dans les vérifications suivantes
// fermeture : envoi immédiat (keepalive)
await p.X('track("goal_reached",{kind:"min",v:10})'); await p.evaluate(() => dispatchEvent(new Event('pagehide'))); await p.waitForTimeout(600);
check('fermeture de la page : la file part tout de suite', p.log.track.length === 2 && evNames(p.log).includes('goal_reached'), p.log.track.length);
// envoi groupé automatique au bout de 30 s : le minuteur est posé
await p.X('track("badge",{id:"test"})');
check('minuteur d’envoi groupé posé (30 s)', await p.X('TRK.t>0'));
// erreur JS échantillonnée → log_errors
await p.evaluate(() => setTimeout(() => { throw new Error('boom-test'); }, 0)); await p.waitForTimeout(3600);
check('erreur JS remontée par log_errors (échantillon à 100 % via flags)', p.log.err.length === 1 && p.log.err[0].p_errs[0].m.includes('boom-test'), p.log.err);
p.errs = p.errs.filter(e => !e.includes('boom-test'));
// « Signaler un problème »
await p.click('#setBtn'); await p.waitForTimeout(400); await p.X('setTab("app")'); await p.waitForTimeout(200);
check('Réglages › Application : interrupteur coché par défaut + bouton', await p.isVisible('#optAnalytics') && await p.isChecked('#optAnalytics') && await p.isVisible('#fbBtn'));
await p.click('#fbBtn'); await p.waitForTimeout(300);
check('fenêtre « Signaler un problème » ouverte', await p.isVisible('#fbModal'));
await p.click('#fbSend'); await p.waitForTimeout(200);
check('message vide refusé avec une explication', p.log.fb.length === 0 && /quelques mots/.test(await p.textContent('#fbInfo')));
await p.click('#fbKind [data-v=idea]'); await p.fill('#fbMsg', 'Le son craque sur mon iPad'); await p.click('#fbSend'); await p.waitForTimeout(600);
const fb = p.log.fb[0] || {};
check('feedback envoyé avec type, version et appareil', fb.p_kind === 'idea' && fb.p_msg === 'Le son craque sur mon iPad' && fb.p_ctx && fb.p_ctx.ver && fb.p_ctx.dev === 'desktop', fb);
check('fenêtre refermée après l’envoi', !(await p.isVisible('#fbModal')));
await p.click('#fbBtn'); await p.waitForTimeout(250); await p.keyboard.press('Escape'); await p.waitForTimeout(250);
check('Échap ferme la fenêtre sans fermer les Réglages', !(await p.isVisible('#fbModal')) && await p.evaluate(() => document.body.dataset.page === 'settings'));
// interrupteur coupé
await p.uncheck('#optAnalytics'); await p.waitForTimeout(100);
const before = p.log.track.length;
await p.X('track("learn_end",{what:"scales"})'); await p.X('trkFlush()'); await p.evaluate(() => dispatchEvent(new Event('pagehide'))); await p.waitForTimeout(500);
check('interrupteur coupé : rien en file, rien envoyé', (await p.X('TRK.q.length')) === 0 && p.log.track.length === before, { q: await p.X('TRK.q.length'), n: p.log.track.length - before });
check('choix retenu dans S.settings.analytics', await p.X('S.settings.analytics===false'));
check('aucune erreur (page, console)', !p.errs.length && !p.cons.length, [...p.errs, ...p.cons]);
await p.context().close();

// 2) le serveur refuse : fonction absente (404) → plus d'envoi, aucune erreur ; panne (500) / réseau coupé → aucune erreur
p = await open({ track: '404' });
await p.X('trkFlush()'); await p.waitForTimeout(500);
await p.X('track("learn_end",{what:"ear"})'); await p.X('trkFlush()'); await p.waitForTimeout(400);
check('404 (migration pas lancée) : un seul essai, puis plus rien pour la session', p.log.track.length === 1 && await p.X('TRK.off===true && TRK.q.length===0'), p.log.track.length);
check('404 : aucune erreur', !p.errs.length && !p.cons.length, [...p.errs, ...p.cons]);
await p.context().close();
p = await open({ track: 'abort' });
await p.X('trkFlush()'); await p.waitForTimeout(500);
check('réseau coupé : les événements restent en file pour plus tard, aucune erreur', (await p.X('TRK.q.length')) >= 1 && !p.errs.length && !p.cons.length, [...p.errs, ...p.cons]);
await p.context().close();
p = await open({ track: '500' });
await p.X('trkFlush()'); await p.waitForTimeout(500);
check('erreur serveur 500 : aucune erreur dans la page', !p.errs.length && !p.cons.length, [...p.errs, ...p.cons]);
await p.context().close();

// 3) en local sans « pc-trk-test » : aucune requête vers Supabase (développement, autres tests)
p = await open({ force: false });
await p.X('track("learn_end",{what:"chords"})'); await p.X('trkFlush()'); await p.evaluate(() => dispatchEvent(new Event('pagehide'))); await p.waitForTimeout(500);
check('localhost sans pc-trk-test : aucune requête de mesure (track_events, app_config, log_errors)', !(p.log.urls || []).some(u => /track_events|app_config|log_errors|send_feedback/.test(u)), p.log.urls);
// 4) téléphone : la fenêtre tient à l'écran
await p.setViewportSize({ width: 375, height: 667 }); await p.waitForTimeout(300);
await p.X('openSet("settings"); setTab("app")'); await p.waitForTimeout(400); await p.X('fbOpen()'); await p.waitForTimeout(1200);
const box = await p.evaluate(() => { const r = document.querySelector('#fbModal .modal-card').getBoundingClientRect(); return { t: r.top, b: r.bottom, l: r.left, r: r.right }; });
check('375×667 : fenêtre « Signaler un problème » entièrement visible', box.t >= 0 && box.b <= 667 && box.l >= 0 && box.r <= 375, box);
await p.screenshot({ path: '/home/claude/captures-admin/app_feedback_375.png' });
check('aucune erreur', !p.errs.length && !p.cons.length, [...p.errs, ...p.cons]);
await p.context().close();

await b.close();
console.log(fails.length ? `\n${fails.length} échec(s)` : '\nTout est bon');
process.exit(fails.length ? 1 : 0);
