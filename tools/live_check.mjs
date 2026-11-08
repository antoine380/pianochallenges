// Vérifie la mise à jour à distance de l'app iOS telle que le site la sert, comme le fait LiveUpdatePlugin.swift :
// lit https://pianochallenges.com/live/manifest.json puis télécharge chaque fichier (/src?v=<12 premiers du SHA>) et compare taille + SHA-256.
// Usage : node tools/live_check.mjs [https://pianochallenges.com] ; code de sortie 1 si un fichier ne correspond pas.
import { createHash } from 'node:crypto';
const SITE = (process.argv[2] || 'https://pianochallenges.com').replace(/\/$/, '');
const get = async u => { const r = await fetch(u, { headers: { 'Accept-Encoding': 'gzip, deflate, br', 'User-Agent': 'PianoChallenges-LiveCheck' } }); return { st: r.status, buf: Buffer.from(await r.arrayBuffer()), h: Object.fromEntries(r.headers) }; };
const m = await get(SITE + '/live/manifest.json?v=' + Math.floor(Date.now() / 1000));
if (m.st !== 200) { console.log('manifeste : HTTP', m.st); process.exit(1); }
const man = JSON.parse(m.buf.toString('utf8'));
console.log('version', man.version, '· native_min', man.native_min, '·', man.files.length, 'fichiers');
let bad = 0, bytes = 0;
for (const f of man.files) {
  const src = f.src || f.path, u = SITE + '/' + src + '?v=' + f.sha256.slice(0, 12);
  let r; try { r = await get(u); } catch (e) { console.log('ÉCHEC réseau', src, e.message); bad++; continue; }
  const sha = createHash('sha256').update(r.buf).digest('hex'); bytes += r.buf.length;
  if (r.st !== 200 || r.buf.length !== f.size || sha !== f.sha256) { bad++; console.log('NE CORRESPOND PAS', src, '· HTTP', r.st, '· taille', r.buf.length, 'attendu', f.size, '· sha', sha.slice(0, 12), 'attendu', f.sha256.slice(0, 12), '· cache', r.h['cache-control'] || '-', '· type', r.h['content-type'] || '-'); }
}
console.log(bad ? bad + ' fichier(s) ne correspondent pas : l’app refuse la mise à jour.' : 'Tous les fichiers correspondent (' + Math.round(bytes / 1024) + ' Ko).');
process.exit(bad ? 1 : 0);
