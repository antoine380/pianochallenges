// Code de l'appel use_figma de mise à jour d'une section (mcp_update_glue.js) pour un paquet de pack_sections.mjs.
// Usage : node tools/figma/mkupdate.mjs <nouvel export> <paquet secNN-k.png> <nodeId du rectangle de données> [référence /home/claude/figma-baseline]
// Écrans déjà dans Figma (index.json de la référence) = remplacés dans leur cadre ; les autres = nouvelles lignes avec leur libellé.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
const [NEW, PACK, DATA, REF = '/home/claude/figma-baseline'] = process.argv.slice(2);
const packs = JSON.parse(fs.readFileSync(path.join(NEW, '_figma', 'packs.json'), 'utf8')); const P = packs.find(p => p.file === PACK);
const idx = JSON.parse(fs.readFileSync(path.join(REF, 'index.json'), 'utf8'));
const man = JSON.parse(fs.readFileSync(path.join(NEW, 'manifest.json'), 'utf8')).filter(m => m.json && !m.fail && m.sec === P.sec);
const rows = [...new Set(man.map(m => m.id))];
const replace = {}; for (const k of P.screens) if (idx.screens[k] && idx.screens[k].node) replace[k] = idx.screens[k].node;
const labeled = [...new Set(Object.keys(idx.screens).filter(k => idx.screens[k].section === P.secName && idx.screens[k].node).map(k => k.split('@')[0]))];
const JOB = { data: DATA, section: idx.sections[P.secName], y0: 380, rowH: 984, replace, labeled, h: 380 + rows.length * 984 + 60 };
process.stdout.write(execFileSync('node', [new globalThis.URL('./make_figma.mjs', import.meta.url).pathname, 'update', JSON.stringify(JOB)], { encoding: 'utf8', maxBuffer: 1e7 }));
