// Écrit /home/claude/figma-baseline/index.json : { écran@taille → { section, title, json, png, node } } à partir du manifeste de l'export
// et (facultatif) de la réponse de read_index.js (ou du fichier figma-index.json téléchargé depuis le greffon).
// Usage : node tools/figma/write_index.mjs [réponse.json] [/home/claude/figma-baseline]
import fs from 'fs';
import path from 'path';
const src = process.argv[2], BASE = process.argv[3] || '/home/claude/figma-baseline';
const man = JSON.parse(fs.readFileSync(path.join(BASE, 'manifest.json'), 'utf8')).filter(m => m.json);
const prev = fs.existsSync(path.join(BASE, 'index.json')) ? JSON.parse(fs.readFileSync(path.join(BASE, 'index.json'), 'utf8')) : { screens: {} };
let got = {}, secs = prev.sections || {};
if (src) { const r = JSON.parse(fs.readFileSync(src, 'utf8')); secs = r.sections || secs; for (const [k, v] of Object.entries(r.screens || {})) got[k] = typeof v === 'string' ? v : v.node; }
const screens = {};
for (const m of man) { const k = `${m.id}@${m.w}x${m.h}`; screens[k] = { section: m.secName, title: m.title, json: m.json, png: m.png, node: got[k] || (prev.screens[k] && prev.screens[k].node) || null }; }
const out = { file: 'kSjus0D2fZoVxs5MMZeItG', page: '0:1', updated: new Date().toISOString(), sections: secs, screens };
fs.writeFileSync(path.join(BASE, 'index.json'), JSON.stringify(out, null, 1));
console.log(Object.keys(screens).length, 'écrans,', Object.values(screens).filter(s => s.node).length, 'avec nodeId');
