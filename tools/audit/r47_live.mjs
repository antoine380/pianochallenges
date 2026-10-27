// Mise à jour à distance de l'app iOS (chantier LIVE UPDATE, 26/10/2026).
// 1. build.py écrit live/manifest.json : version = version.txt, native_min = NATIVE_MIN = NATIVE_VERSION (Swift),
//    exactement les fichiers de app/www (copy-web.mjs), SHA-256 et tailles justes, copies app servies depuis live/files/.
// 2. .htaccess : /live servi, manifeste jamais mis en cache. Swift : plugin enregistré, fichier dans le projet Xcode.
// 3. Logique de choix de version (miroir JS de LiveUpdateStore : tools/audit/live_logic.mjs).
// 4. Web : rien dans le navigateur ; dans l'app (pont simulé) ready() appelé une fois, Réglages affiche la version
//    et « Mise à jour prête au prochain lancement », 5 touchers = reset après confirmation.
// Lancer un serveur à la racine (python3 -m http.server $PORT) avant.
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, statSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import * as L from './live_logic.mjs';
import { NATIVE_MIN } from '../../app/scripts/web-files.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const URL = process.env.PC_URL || ('http://localhost:' + (process.env.PORT || '8767') + '/');
const fails = []; const check = (n, ok, d) => { console.log((ok ? 'OK   ' : 'FAIL ') + n + (d !== undefined && !ok ? ' — ' + JSON.stringify(d).slice(0, 400) : '')); if (!ok) fails.push(n); };
const sha = b => createHash('sha256').update(b).digest('hex');
const walk = d => readdirSync(d).flatMap(n => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });

// ---------- 1. manifeste ----------
// même horodatage que la construction commitée (PC_BUILD_STAMP) : le test ne modifie pas index.html / version.txt / live/ (CI, arbre propre)
const stamp0 = existsSync(join(ROOT, 'version.txt')) ? readFileSync(join(ROOT, 'version.txt'), 'utf8').trim() : '';
execFileSync('python3', [join(ROOT, 'tools/build.py')], { stdio: 'ignore', env: { ...process.env, ...(stamp0 && stamp0 !== 'dev' ? { PC_BUILD_STAMP: stamp0 } : {}) } });
const version = readFileSync(join(ROOT, 'version.txt'), 'utf8').trim();
const man = JSON.parse(readFileSync(join(ROOT, 'live/manifest.json'), 'utf8'));
check('manifeste : version = version.txt', man.version === version, [man.version, version]);
check('manifeste : APP_BUILD de index.html = version', readFileSync(join(ROOT, 'index.html'), 'utf8').includes('const APP_BUILD="' + version + '"'));
const swift = readFileSync(join(ROOT, 'app/ios/App/App/LiveUpdatePlugin.swift'), 'utf8');
const natV = +((swift.match(/static let nativeVersion = (\d+)/) || [])[1]);
check('manifeste : native_min = NATIVE_MIN (web-files.mjs) = nativeVersion (Swift)', man.native_min === NATIVE_MIN && NATIVE_MIN === natV, [man.native_min, NATIVE_MIN, natV]);
check('manifeste : accepté par la validation de l’app (miroir de LiveManifest.parse)', !!L.parseManifest(man));
execFileSync('node', [join(ROOT, 'app/scripts/copy-web.mjs')], { stdio: 'ignore' });
const www = join(ROOT, 'app/www');
const wfiles = walk(www).map(p => relative(www, p).split(sep).join('/')).filter(p => p !== 'live/manifest.json').sort();
const mpaths = man.files.map(f => f.path).sort();
check('manifeste : exactement les fichiers de app/www', JSON.stringify(wfiles) === JSON.stringify(mpaths), { wwwSeul: wfiles.filter(p => !mpaths.includes(p)), manifesteSeul: mpaths.filter(p => !wfiles.includes(p)) });
const bad = man.files.filter(f => { const b = readFileSync(join(www, f.path)); return b.length !== f.size || sha(b) !== f.sha256; }).map(f => f.path);
check('manifeste : SHA-256 et tailles = fichiers de app/www', bad.length === 0, bad);
// ce que le site sert : live/files/<path> pour les copies app, sinon le fichier du site
const served = man.files.filter(f => { const p = join(ROOT, f.src || f.path); return !existsSync(p) || sha(readFileSync(p)) !== f.sha256; }).map(f => f.src || f.path);
check('site : chaque fichier téléchargé (src) a le bon SHA-256', served.length === 0, served);
check('site : index.html et play/index.html de l’app (sans zoom) dans live/files', man.files.filter(f => f.src).map(f => f.path).sort().join() === 'confidentialite.html,index.html,mentions-legales.html,play/index.html'
  && /user-scalable=no/.test(readFileSync(join(ROOT, 'live/files/index.html'), 'utf8')) && !/user-scalable=no/.test(readFileSync(join(ROOT, 'index.html'), 'utf8')));
const emb = JSON.parse(readFileSync(join(www, 'live/manifest.json'), 'utf8'));
check('app/www/live/manifest.json (version embarquée) = manifeste publié', JSON.stringify(emb) === JSON.stringify(JSON.parse(JSON.stringify(man))));
check('admin/ jamais dans le manifeste', !mpaths.some(p => p.startsWith('admin')));
rmSync(www, { recursive: true, force: true });

// ---------- 2. serveur et natif ----------
const ht = readFileSync(join(ROOT, '.htaccess'), 'utf8');
check('.htaccess : /live non bloqué', !/RedirectMatch[^\n]*live/.test(ht));
check('.htaccess : manifest.json et version.txt sans cache', /<FilesMatch "\^\(manifest\\\.json\|version\\\.txt\)\$">\s*Header set Cache-Control "no-cache/.test(ht));
const mvc = readFileSync(join(ROOT, 'app/ios/App/App/MainViewController.swift'), 'utf8');
check('Swift : plugin enregistré + instanceDescriptor sert la version téléchargée', /registerPluginInstance\(LiveUpdatePlugin\(\)\)/.test(mvc) && /override func instanceDescriptor\(\) -> InstanceDescriptor/.test(mvc) && /descriptor\.appLocation = dir/.test(mvc));
const pbx = readFileSync(join(ROOT, 'app/ios/App/App.xcodeproj/project.pbxproj'), 'utf8');
check('Xcode : LiveUpdatePlugin.swift dans le projet (référence + compilation)', (pbx.match(/LiveUpdatePlugin\.swift/g) || []).length === 6);
check('Swift : HTTPS pianochallenges.com seulement, Library/NoCloud/live, ready 20 s', /static let host = "pianochallenges.com"/.test(swift) && /c\.scheme = "https"/.test(swift) && /"NoCloud"/.test(swift) && /readyTimeout: TimeInterval = 20/.test(swift));
check('Swift : méthodes ready / info / check / reset', ['ready', 'info', 'check', 'reset'].every(m => swift.includes('CAPPluginMethod(name: "' + m + '"')));

// ---------- 3. logique de choix de version ----------
{
  const E = '2026-10-26T10:00Z', A = '2026-10-27T09:00Z', B = '2026-10-28T09:00Z';
  const disk = { [A]: { complete: true, native_min: 1, index: true }, [B]: { complete: true, native_min: 1, index: true } };
  let st = L.newState();
  let r = L.boot(st, E, disk); check('logique : rien de téléchargé = version embarquée', r.running === null && !r.trial);
  check('logique : manifeste plus récent → téléchargement', L.checkDecision(r.st, r, E, { ...man, version: A }, { force: true }) === 'download');
  check('logique : même version que l’embarquée → rien', L.checkDecision(r.st, r, E, { ...man, version: E }, { force: true }) === 'uptodate');
  check('logique : native_min trop haut → rien (il faut une nouvelle app)', L.checkDecision(r.st, r, E, { ...man, version: A, native_min: 2 }, { force: true }) === 'native');
  check('logique : au plus une vérification par heure', L.checkDecision({ ...r.st, lastCheck: 1000 }, r, E, man, { now: 1000 + 1800 }) === 'recent' && L.checkDecision({ ...r.st, lastCheck: 1000 }, r, E, { ...man, version: A }, { now: 1000 + 3700 }) === 'download');
  check('logique : manifeste abîmé → erreur (rien ne change)', L.checkDecision(r.st, r, E, { version: A, files: [{ path: '../x', sha256: 'a'.repeat(64), size: 1 }] }, { force: true }) === 'error'
    && !L.parseManifest({ version: 'dev', files: man.files }) && !L.parseManifest({ ...man, files: man.files.filter(f => f.path !== 'index.html') }));
  st = { ...r.st, pending: A };
  r = L.boot(st, E, disk); check('logique : version en attente servie au lancement suivant, à l’essai', r.running === A && r.trial && r.st.trialCount === 1);
  check('logique : pas de nouvelle vérification pendant l’essai', L.checkDecision(r.st, r, E, { ...man, version: B }, { force: true }) === 'trial');
  st = L.confirm(r.st, r); check('logique : ready → version active', st.active === A && !st.trial);
  r = L.boot(st, E, disk); check('logique : lancement suivant = version active confirmée', r.running === A && !r.trial);
  st = { ...r.st, pending: B }; r = L.boot(st, E, disk);
  const rb = L.rollback(r.st, r, E, disk); check('logique : pas de ready en 20 s → retour à la version précédente, essai écarté', rb.running === A && rb.st.bad.includes(B));
  check('logique : version écartée jamais reprise', L.checkDecision(rb.st, { running: A, trial: false }, E, { ...man, version: B }, { force: true }) === 'uptodate' && !L.boot({ ...rb.st, pending: B }, E, disk).trial);
  // deux lancements de suite sans ready (app tuée / plantage) → écartée
  let s2 = { ...L.newState(), active: A, pending: B }; let r1 = L.boot(s2, E, disk); let r2 = L.boot(r1.st, E, disk); let r3 = L.boot(r2.st, E, disk);
  check('logique : 2 lancements sans ready → retour à la version active', r1.running === B && r2.running === B && r3.running === A && r3.st.bad.includes(B));
  // nouvelle app installée avec une version embarquée plus récente : la version téléchargée plus ancienne est laissée
  r = L.boot({ ...L.newState(), active: A }, B, disk); check('logique : embarquée plus récente (nouvelle app) → embarquée', r.running === null && r.st.active === null);
  r = L.boot({ ...L.newState(), pending: A }, E, { [A]: { complete: false, native_min: 1, index: true } }); check('logique : téléchargement incomplet jamais servi', r.running === null);
  r = L.boot({ ...L.newState(), pending: A }, E, { [A]: { complete: true, native_min: 2, index: true } }); check('logique : version qui demande un natif plus récent jamais servie', r.running === null);
  check('logique : versions ISO comparées dans l’ordre du temps', L.isNewer('2026-10-26T18:27Z', '2026-10-26T09:59Z') && !L.isNewer('2026-01-01T00:00Z', '2026-10-26T09:59Z') && L.isNewer(E, '') && L.isNewer(E, 'dev'));
  check('logique : au plus 2 versions gardées (en cours + attente)', L.purgeKeep(['v1', 'v2', 'v3'], ['v2', 'v3']).length === 2);
}

// ---------- 4. côté web ----------
const NATIVE = (pending) => `window.webkit={messageHandlers:{bridge:{postMessage(){}}}}; window.__lu=[]; window.__cbs={};
window.Capacitor={nativePromise:(p,m,o)=>{ if(p==='LiveUpdate'){ window.__lu.push(m); return Promise.resolve(m==='reset'?{}:{version:'2026-10-27T09:00Z',embedded:'2026-10-26T10:00Z',source:'live'${pending ? ",pending:'2026-10-28T09:00Z'" : ''}}); }
  return Promise.resolve(m==='start'||m==='listInputs'?{inputs:[]}:{}); }, nativeCallback:(p,m,o,cb)=>{ window.__cbs[p+':'+o.eventName]=cb; return 'id'; }};
window.confirm=()=>{ window.__confirmed=(window.__confirmed||0)+1; return true; };`;
const STATE = `localStorage.setItem('memo-gammes-v1', JSON.stringify({gate:'guest', onb:{done:1}, tourDone:1, settings:{lang:'fr', notation:'fr', input:'screen'}}));`;
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
const errs = [];
async function open(init) {
  const c = await b.newContext({ viewport: { width: 1180, height: 820 }, locale: 'fr-FR' });
  await c.addInitScript(STATE); if (init) await c.addInitScript(init);
  const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.goto(URL); await p.waitForTimeout(2600);
  for (const sel of ['#fnSkip', '#gateGuest', '#onbSkip', '#tourX']) if (await p.isVisible(sel)) { await p.click(sel); await p.waitForTimeout(300); }
  return p;
}
const ev = (p, f) => p.evaluate(f);
const openSettings = async p => { await ev(p, () => document.getElementById('setBtn').click()); await p.waitForTimeout(300); await ev(p, () => { const x = document.querySelector('#setNav [data-v=app]'); if (x) x.click(); }); await p.waitForTimeout(300); };
{ // navigateur : rien
  const p = await open(null); await openSettings(p);
  check('navigateur : ligne de version cachée, aucun appel natif', await ev(p, () => document.getElementById('setLive').hidden && !window.Capacitor));
  await p.context().close(); }
{ // app sans mise à jour en attente
  const p = await open(NATIVE(false));
  check('app : ready() appelé une fois après le démarrage', await ev(p, () => window.__lu.filter(m => m === 'ready').length === 1), await ev(p, () => window.__lu));
  await openSettings(p);
  check('app : Réglages › Application affiche la version web active', await ev(p, () => { const e = document.getElementById('setLive'); return !e.hidden && e.offsetParent !== null && /Version web 2026-10-27 09:00 UTC/.test(e.textContent) && !/prochain lancement/.test(e.textContent); }), await ev(p, () => document.getElementById('setLive').textContent));
  check('app : info() relu à l’ouverture des Réglages', await ev(p, () => window.__lu.includes('info')));
  await ev(p, () => window.__cbs['LiveUpdate:pending']({ version: '2026-10-28T09:00Z' })); await p.waitForTimeout(100);
  check('app : événement « pending » → « Mise à jour prête au prochain lancement »', await ev(p, () => /Mise à jour prête au prochain lancement/.test(document.getElementById('setLive').textContent)));
  for (let i = 0; i < 5; i++) await p.click('#setLive');
  await p.waitForTimeout(200);
  check('app : 5 touchers sur la version → confirmation puis reset()', await ev(p, () => window.__confirmed === 1 && window.__lu.includes('reset')));
  await p.context().close(); }
{ // app avec une version en attente dès le démarrage, en anglais
  const c = await b.newContext({ viewport: { width: 812, height: 375 }, locale: 'en-GB' });
  await c.addInitScript(STATE.replace("lang:'fr', notation:'fr'", "lang:'en', notation:'en'")); await c.addInitScript(NATIVE(true));
  const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.goto(URL); await p.waitForTimeout(2600);
  await openSettings(p);
  check('app (EN) : « Update ready for next launch »', await ev(p, () => /Web version 2026-10-27 09:00 UTC.*Update ready for next launch/.test(document.getElementById('setLive').textContent)), await ev(p, () => document.getElementById('setLive').textContent));
  await c.close(); }
check('aucune erreur JS', errs.length === 0, errs);
await b.close();
console.log(fails.length ? 'r47 FAIL ' + fails.length : 'r47 OK'); process.exit(fails.length ? 1 : 0);
