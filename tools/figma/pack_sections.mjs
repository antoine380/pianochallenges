// Regroupe les JSON exportés (export_screens.mjs) par section dans des « PNG de données » (datapng.mjs) à envoyer dans Figma par upload_assets.
// Conteneur binaire : 'PCJ2' | u32 longueur du JSON | JSON en ASCII (\uXXXX) | images PNG brutes à la suite ; le JSON donne [début, longueur] de chaque image.
// Sortie : _figma/secNN-k.png (pour upload_assets + use_figma) et secNN-k.bin (même contenu, pour le greffon tools/figma/plugin).
// Usage : node tools/figma/pack_sections.mjs [/home/claude/figma-baseline] [Mo max par paquet, 9] [écrans.json]
import fs from 'fs';
import path from 'path';
import { encodeDataPng } from './datapng.mjs';
const BASE = process.argv[2] || '/home/claude/figma-baseline', MAX = (+process.argv[3] || 9) * 1024 * 1024;
const OUT = path.join(BASE, '_figma'); fs.mkdirSync(OUT, { recursive: true });
const all = JSON.parse(fs.readFileSync(path.join(BASE, 'manifest.json'), 'utf8')).filter(m => m.json && !m.fail);
// 3e argument facultatif : fichier JSON [« id@WxH », …] = seulement ces écrans (les lignes restent celles de toute la section)
const KEEP = process.argv[4] ? new Set(JSON.parse(fs.readFileSync(process.argv[4], 'utf8'))) : null;
const man = KEEP ? all.filter(m => KEEP.has(`${m.id}@${m.w}x${m.h}`)) : all;
const ascii = s => s.replace(/[\u007f-\uffff]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
const packs = []; let cur = null;
const flush = () => { if (!cur || !cur.screens.length) return;
  const rows = [...new Set(all.filter(m => m.sec === cur.sec).map(m => m.id))];
  const json = Buffer.from(ascii(JSON.stringify({ sec: cur.sec, secName: cur.secName, part: cur.part, rows, screens: cur.screens, imgs: cur.imgs })), 'latin1');
  const head = Buffer.alloc(8); head.write('PCJ2', 0); head.writeUInt32BE(json.length, 4);
  const blob = Buffer.concat([head, json, ...cur.bufs]);
  const file = `sec${String(cur.sec).padStart(2, '0')}-${cur.part}.png`; fs.writeFileSync(path.join(OUT, file), encodeDataPng(blob, 2048)); fs.writeFileSync(path.join(OUT, file.replace('.png', '.bin')), blob);
  packs.push({ file, sec: cur.sec, secName: cur.secName, part: cur.part, screens: cur.screens.map(s => s.id + '@' + s.w + 'x' + s.h), mb: Math.round(blob.length / 1048576 * 10) / 10 }); cur = null; };
for (const m of man) {
  const d = JSON.parse(fs.readFileSync(path.join(BASE, m.json), 'utf8'));
  const imgs = Object.fromEntries(Object.entries(d.img).map(([k, v]) => [k, Buffer.from(v, 'base64')]));
  const size = Object.values(imgs).reduce((a, b) => a + b.length, 0) + JSON.stringify(d.root).length;
  if (cur && (cur.sec !== m.sec || cur.size + size > MAX)) { const s = cur.sec, p = cur.part; flush(); if (s === m.sec) cur = { sec: s, secName: m.secName, part: p + 1, screens: [], imgs: [], bufs: [], size: 0, off: 0 }; }
  if (!cur) cur = { sec: m.sec, secName: m.secName, part: 1, screens: [], imgs: [], bufs: [], size: 0, off: 0 };
  const rmap = {}; const crop = Object.fromEntries((d.rasters || []).map(r => [r.id, r.crop]));
  for (const [k, b] of Object.entries(imgs)) { rmap[k] = cur.imgs.length; cur.imgs.push([cur.off, b.length]); cur.bufs.push(b); cur.off += b.length; }
  const fix = n => { if (n.ref) { if (rmap[n.ref] === undefined) delete n.ref; else { const c = crop[n.ref]; if (c && n.t === 'i') { n.x += c[0]; n.y += c[1]; n.w = c[2]; n.h = c[3]; } n.ref = rmap[n.ref]; } }
    if (n.fb) { if (rmap[n.fb] === undefined) delete n.fb; else n.fb = rmap[n.fb]; } (n.ch || []).forEach(fix); };
  fix(d.root);
  cur.screens.push({ id: m.id, title: m.title, w: m.w, h: m.h, root: d.root }); cur.size += size;
}
flush();
// décalage des images : relatif au début du blob (après l'en-tête et le JSON) → le constructeur ajoute 8 + longueur du JSON
fs.writeFileSync(path.join(OUT, 'packs.json'), JSON.stringify(packs, null, 1));
console.log(packs.map(p => `${p.file} ${p.mb} Mo ${p.screens.length} écrans`).join('\n'));
