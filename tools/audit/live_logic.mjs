// Miroir JS de la logique de choix de version de app/ios/App/App/LiveUpdatePlugin.swift (LiveUpdateStore),
// pour la tester sans Xcode (tools/audit/r47_live.mjs). Garder les deux en phase : mêmes règles, mêmes noms.
// `disk` simule Library/NoCloud/live : { "<version>": { complete: true, native_min: 1, index: true } }.
export const NATIVE_VERSION = 1;

export const validVersion = v => typeof v === 'string' && v.length > 0 && v.length <= 64 && /^[0-9]/.test(v) && /^[A-Za-z0-9._:-]+$/.test(v);
export const validPath = p => typeof p === 'string' && p.length > 0 && p.length <= 200 && !p.startsWith('/') && !p.endsWith('/')
  && p.split('/').every(x => x.length > 0 && x[0] !== '.' && /^[A-Za-z0-9._-]+$/.test(x));
export const validSha = s => typeof s === 'string' && /^[0-9a-f]{64}$/.test(s);
export function isNewer(a, b) { if (!validVersion(a)) return false; if (!validVersion(b)) return true; return a > b; }

/** LiveManifest.parse : null au moindre doute. */
export function parseManifest(obj, limits = { maxFiles: 3000, maxFile: 30e6, maxTotal: 100e6 }) {
  if (!obj || typeof obj !== 'object' || !validVersion(obj.version) || !Array.isArray(obj.files) || !obj.files.length || obj.files.length > limits.maxFiles) return null;
  const nativeMin = typeof obj.native_min === 'number' ? Math.trunc(obj.native_min) : 1;
  const seen = new Set(); let total = 0; const files = [];
  for (const f of obj.files) {
    if (!f || !validPath(f.path) || f.path.startsWith('live/') || !validSha(f.sha256) || typeof f.size !== 'number') return null;
    const src = typeof f.src === 'string' ? f.src : f.path;
    if (f.size < 0 || f.size > limits.maxFile || !validPath(src) || seen.has(f.path)) return null;
    seen.add(f.path); total += f.size; files.push({ path: f.path, src, sha256: f.sha256, size: f.size });
  }
  if (total > limits.maxTotal || !seen.has('index.html')) return null;
  return { version: obj.version, nativeMin, files };
}

export function newState() { return { active: null, pending: null, trial: null, trialCount: 0, bad: [], lastCheck: 0 }; }
function markBad(st, v) { if (!st.bad.includes(v)) st.bad.push(v); if (st.active === v) st.active = null; if (st.pending === v) st.pending = null; if (st.trial === v) { st.trial = null; st.trialCount = 0; } }

export function usable(v, st, embedded, disk) {
  if (st.bad.includes(v) || !isNewer(v, embedded)) return false;
  const d = disk[v]; return !!(d && d.complete && d.native_min <= NATIVE_VERSION && d.index);
}

/** bootLocation : renvoie { st, running, trial } ; running null = version embarquée. */
export function boot(st0, embedded, disk) {
  const st = structuredClone(st0);
  if (st.trial && st.trialCount >= 2) markBad(st, st.trial);
  if (!st.trial && st.pending) { const p = st.pending; st.pending = null; if (usable(p, st, embedded, disk)) { st.trial = p; st.trialCount = 0; } }
  if (st.trial) { if (usable(st.trial, st, embedded, disk)) { st.trialCount++; return { st, running: st.trial, trial: true }; } st.trial = null; st.trialCount = 0; }
  if (st.active) { if (usable(st.active, st, embedded, disk)) return { st, running: st.active, trial: false }; st.active = null; }
  return { st, running: null, trial: false };
}

/** confirmRunning (ready reçu). */
export function confirm(st0, run) { const st = structuredClone(st0); if (run.trial && st.trial === run.running) { st.active = run.running; st.trial = null; st.trialCount = 0; } return st; }

/** rollback (pas de ready à temps) : { st, running }. */
export function rollback(st0, run, embedded, disk) {
  const st = structuredClone(st0); if (run.running) markBad(st, run.running);
  if (st.active && usable(st.active, st, embedded, disk)) return { st, running: st.active };
  st.active = null; return { st, running: null };
}

/** Décision de check() avant téléchargement : 'busy' | 'trial' | 'recent' | 'uptodate' | 'native' | 'download'. */
export function checkDecision(st, run, embedded, remote, { force = false, now = Date.now() / 1000, checking = false } = {}) {
  if (checking) return 'busy';
  if (run.trial) return 'trial';
  if (!force && st.lastCheck > 0 && now >= st.lastCheck && now - st.lastCheck < 3600) return 'recent';
  const man = parseManifest(remote); if (!man) return 'error';
  let newest = embedded; for (const v of [run.running, st.active, st.pending]) if (v && isNewer(v, newest)) newest = v;
  if (!isNewer(man.version, newest) || st.bad.includes(man.version)) return 'uptodate';
  if (man.nativeMin > NATIVE_VERSION) return 'native';
  return 'download';
}

/** Dossiers gardés après purge. */
export const purgeKeep = (names, keep) => names.filter(n => keep.includes(n));
