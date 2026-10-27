// Compare les empreintes relevées dans Figma (digest.js) à celles attendues des JSON de la référence (digest_lib.mjs).
// Faux positifs connus (SVG qui contiennent du texte, devenus cadres + textes dans Figma) : m4, m6, mkc (2 tailles), prog-suc iPad.
// Usage : node tools/figma/compare_digest.mjs <empreintes.json>[,<autre.json>] [/home/claude/figma-baseline] → écrans différents (clé, nodeId, lignes)
import fs from 'fs';
import path from 'path';
import { expected, fnv } from './digest_lib.mjs';
const got = Object.assign({}, ...process.argv[2].split(',').map(f => JSON.parse(fs.readFileSync(f, 'utf8'))));
const BASE = process.argv[3] || '/home/claude/figma-baseline';
const idx = JSON.parse(fs.readFileSync(path.join(BASE, 'index.json'), 'utf8')).screens;
const diff = [];
for (const [k, s] of Object.entries(idx)) { if (!s.node || !(s.node in got)) continue;
  const L = expected(JSON.parse(fs.readFileSync(path.join(BASE, s.json), 'utf8'))); const e = fnv(L.join('\n')) + ':' + L.length;
  if (got[s.node] !== e) diff.push([k, s.node, got[s.node], e]); }
console.log(JSON.stringify(diff)); console.error(diff.length, 'écrans différents sur', Object.keys(got).length);
