// Compare deux exports (référence posée dans Figma / nouvel export) écran par écran avec l'empreinte de digest_lib.mjs :
// identiques, changés (à remplacer dans Figma), nouveaux (à ajouter). Usage : node tools/figma/diff_versions.mjs <ancien> <nouveau> [sortie.json]
import fs from 'fs';
import path from 'path';
import { expected, fnv } from './digest_lib.mjs';
const [A, B, OUTF] = process.argv.slice(2);
const man = d => JSON.parse(fs.readFileSync(path.join(d, 'manifest.json'), 'utf8')).filter(m => m.json && !m.fail);
const old = Object.fromEntries(man(A).map(m => [`${m.id}@${m.w}x${m.h}`, m]));
const dig = (d, m) => { const L = expected(JSON.parse(fs.readFileSync(path.join(d, m.json), 'utf8'))); return { h: fnv(L.join('\n')), L }; };
const res = { same: [], changed: [], added: [], why: {} };
for (const m of man(B)) { const k = `${m.id}@${m.w}x${m.h}`;
  if (!old[k]) { res.added.push(k); continue; }
  const a = dig(A, old[k]), b = dig(B, m);
  if (a.h === b.h) res.same.push(k); else { res.changed.push(k); const sa = new Set(a.L), sb = new Set(b.L);
    res.why[k] = { moins: a.L.filter(x => !sb.has(x)).length, plus: b.L.filter(x => !sa.has(x)).length, ex: b.L.filter(x => !sa.has(x) && /\|X\|/.test(x)).slice(0, 3).map(x => x.slice(0, 120)) }; } }
console.log('identiques', res.same.length, '· changés', res.changed.length, '· nouveaux', res.added.length);
if (OUTF) fs.writeFileSync(OUTF, JSON.stringify(res, null, 1));
