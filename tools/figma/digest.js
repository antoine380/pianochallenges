// Appel use_figma (lecture seule) : empreinte des cadres d'écran de la page « Revue des écrans » (détection des écrans retouchés à la
// main dans Figma). Même calcul que digest_lib.mjs côté Node à partir des JSON de /home/claude/figma-baseline.
// JOB = { ids: ['90:4', …], full, lines, pick } → { id: empreinte } (full : les lignes ; lines : l'empreinte de chaque ligne ; pick : { id: [n° de ligne] } → ces lignes).
// Ligne par calque : profondeur|type|nom|géométrie (cadres)|remplissage|texte. Un cadre sans texte qui contient un SVG (ou son image de secours) est une feuille V ; couleur d'un texte = celle de ses segments (mix si plusieurs).
const page = await figma.getNodeByIdAsync('0:1'); await figma.setCurrentPageAsync(page);
const H2 = v => Math.round(v * 255).toString(16).padStart(2, '0');
const paint = p => p.type === 'SOLID' ? '#' + H2(p.color.r) + H2(p.color.g) + H2(p.color.b) + (p.opacity != null && p.opacity < 0.995 ? '/' + Math.round(p.opacity * 100) : '') : p.type === 'IMAGE' ? 'IMG' : p.type === 'GRADIENT_LINEAR' ? 'LIN' : p.type === 'GRADIENT_RADIAL' ? 'RAD' : p.type;
const fills = n => n.fills === figma.mixed ? 'mix' : (n.fills || []).filter(p => p.visible !== false).map(paint).join('+');
const BUILT = new Set(['FRAME', 'TEXT', 'RECTANGLE']);
const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };
const out = {};
for (const id of JOB.ids) {
  const fr = await figma.getNodeByIdAsync(id); if (!fr) { out[id] = null; continue; }
  const L = [];
  const svgLeaf = n => n.type !== 'FRAME' && !BUILT.has(n.type) || (n.type === 'RECTANGLE' && / \(image\)$/.test(n.name));
  const icon = n => { let txt = false, sv = false; const sc = m => { if (m.type === 'TEXT') txt = true; else if (svgLeaf(m)) sv = true; else if ('children' in m) m.children.forEach(sc); }; n.children.forEach(sc); return sv && !txt; };
  const tcol = n => { if (!n.characters.length) return fills(n); const c = [...new Set(n.getStyledTextSegments(['fills']).map(g => g.fills.filter(p => p.visible !== false).map(paint).join('+')))]; return c.length === 1 ? c[0] : 'mix'; };
  const walk = (n, d) => {
    const kids = 'children' in n ? n.children : [];
    const vis = n.visible === false ? '|HIDDEN' : '';
    if (n.type === 'TEXT') { L.push(d + '|X|' + n.name + '|' + tcol(n) + '|' + n.characters + vis); return; }
    if (n.type === 'RECTANGLE' && / \(image\)$/.test(n.name)) { L.push(d + '|V|' + n.name.replace(/ \(image\)$/, '') + vis); return; }
    if (n.type === 'RECTANGLE') { L.push(d + '|R|' + n.name + '|' + fills(n) + vis); return; }
    if (n.type !== 'FRAME' || (d > 0 && (kids.some(c => !BUILT.has(c.type)) || icon(n)))) { L.push(d + '|V|' + n.name + vis + (n.type !== 'FRAME' ? '|' + n.type : '')); return; }
    const t = n.relativeTransform, rot = Math.abs(t[0][0] - 1) > 1e-6 || Math.abs(t[0][1]) > 1e-6 || Math.abs(t[1][0]) > 1e-6 || Math.abs(t[1][1] - 1) > 1e-6;
    const g = d === 0 ? [n.width, n.height].map(Math.round).join(',') : rot ? '~' : [n.x, n.y, n.width, n.height].map(Math.round).join(',');
    L.push(d + '|F|' + (d === 0 ? '' : n.name) + '|' + g + '|' + fills(n) + vis);
    for (const c of kids) walk(c, d + 1);
  };
  walk(fr, 0); out[id] = JOB.pick ? (JOB.pick[id] || []).map(i => i + ' ' + L[i]) : JOB.lines ? L.map(fnv).join(' ') : JOB.full ? L.join('\n') : fnv(L.join('\n')) + ':' + L.length;
}
return out;
