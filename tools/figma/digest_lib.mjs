// Empreinte attendue d'un écran construit par figma_core.js à partir de son JSON (même calcul que digest.js dans Figma).
// Usage : node tools/figma/digest_lib.mjs <écran.json> → lignes ; importé par compare_digest.mjs.
import fs from 'fs';
const H2 = v => Math.round(v * 255).toString(16).padStart(2, '0');
const f32 = v => Math.fround(v);
const solid = c => '#' + H2(f32(c.r)) + H2(f32(c.g)) + H2(f32(c.b)) + (c.a != null && c.a < 0.995 ? '/' + Math.round(c.a * 100) : '');
const paint = pt => pt.k === 's' ? solid(pt.c) : pt.k === 'lin' ? 'LIN' : 'RAD';
export const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };
const icon = n => { let txt = false, sv = false; const sc = m => { if (m.t === 'x') txt = true; else if (m.t === 'v') sv = true; else (m.ch || []).forEach(sc); }; (n.ch || []).forEach(sc); return sv && !txt; };
export function expected(doc) {
  const img = doc.img || {}; const L = [];
  const walk = (n, d) => {
    if (n.t === 'x') { const chars = n.seg.map(g => g.s).join(''); const segs = n.seg.filter(g => g.s.length);
      const cols = [...new Set(segs.map(g => solid(g.c)))]; const col = !chars ? '#000000' : cols.length === 1 ? cols[0] : 'mix';
      L.push(d + '|X|' + (n.n || 'texte').slice(0, 60) + '|' + col + '|' + (chars || ' ')); return; }
    if (n.t === 'v') { L.push(d + '|V|' + (n.n || 'svg')); return; }
    if (n.t === 'f' && d > 0 && icon(n)) { L.push(d + '|V|' + (n.n || 'cadre')); return; }
    if (n.t === 'i') { L.push(d + '|R|' + (n.n || 'image') + '|' + (n.ref != null && img[n.ref] ? 'IMG' : '#ff00ff/30')); return; }
    let fl = (n.bg || []).map(paint); if (n.ref != null && img[n.ref]) fl.push('IMG');
    let sh = n.sh;
    if (sh && !n.bd) { const ring = sh.find(x => x.t === 'in' && !x.x && !x.y && !x.b && x.s > 0); if (ring) sh = sh.filter(x => x !== ring); }
    let extra = null;
    if (d > 0 && !n.clip && (sh || []).some(x => x.s && x.t !== 'in')) {
      const inside = (n.ch || []).every(c => c.x >= -1 && c.y >= -1 && c.x + c.w <= n.w + 1 && c.y + c.h <= n.h + 1 && !c.rt);
      if (!inside) { extra = (d + 1) + '|R|fond + ombre|' + fl.join('+'); fl = []; } }
    let g;
    if (d === 0) g = [n.w, n.h].map(Math.round).join(',');
    else if (n.rt) { const [a, b, c, dd, tx, ty] = n.rt; g = (Math.abs(a - 1) > 1e-6 || Math.abs(b) > 1e-6 || Math.abs(c) > 1e-6 || Math.abs(dd - 1) > 1e-6) ? '~' : [n.x + tx, n.y + ty, Math.max(n.w, 0.01), Math.max(n.h, 0.01)].map(Math.round).join(','); }
    else g = [n.x, n.y, Math.max(n.w, 0.01), Math.max(n.h, 0.01)].map(Math.round).join(',');
    L.push(d + '|F|' + (d === 0 ? '' : (n.n || 'cadre')) + '|' + g + '|' + fl.join('+'));
    if (extra) L.push(extra);
    for (const c of n.ch || []) walk(c, d + 1);
  };
  walk(doc.root, 0); return L;
}
if (process.argv[1] && process.argv[1].endsWith('digest_lib.mjs') && process.argv[2]) console.log(expected(JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))).join('\n'));
