// Cœur commun du constructeur Figma (code du greffon tools/figma/plugin et appels use_figma) : décodage du conteneur de données,
// recréation des écrans en calques natifs, mise en page des lignes d'une section. Pas d'import : ce fichier est concaténé par make_figma.mjs.

// --- conteneur 'PCJ2' (octets) → { PK, blob, IMG0 }
function pcUnpack(blob) {
  if (String.fromCharCode(blob[0], blob[1], blob[2], blob[3]) !== 'PCJ2') throw new Error('Fichier de données inconnu');
  const jl = (blob[4] << 24 | blob[5] << 16 | blob[6] << 8 | blob[7]) >>> 0; let js = '';
  for (let i = 8; i < 8 + jl; i += 8192) js += String.fromCharCode.apply(null, blob.subarray(i, Math.min(8 + jl, i + 8192)));
  return { PK: JSON.parse(js), blob, IMG0: 8 + jl };
}
// --- PNG de données (RVB, deflate stocké) → octets du conteneur
function pcFromDataPng(png) {
  let p = 8, W = 0; const idat = [];
  while (p < png.length) { const len = (png[p] << 24 | png[p + 1] << 16 | png[p + 2] << 8 | png[p + 3]) >>> 0; const t = String.fromCharCode(png[p + 4], png[p + 5], png[p + 6], png[p + 7]);
    if (t === 'IHDR') W = (png[p + 8] << 24 | png[p + 9] << 16 | png[p + 10] << 8 | png[p + 11]) >>> 0; if (t === 'IDAT') idat.push(png.subarray(p + 8, p + 8 + len)); p += 12 + len; }
  const zl = new Uint8Array(idat.reduce((a, x) => a + x.length, 0)); { let o = 0; for (const x of idat) { zl.set(x, o); o += x.length; } }
  const parts = []; let q = 2, rawLen = 0; for (;;) { const fin = zl[q] & 1, len = zl[q + 1] | (zl[q + 2] << 8); q += 5; parts.push(zl.subarray(q, q + len)); rawLen += len; q += len; if (fin) break; }
  const raw = new Uint8Array(rawLen); { let o = 0; for (const x of parts) { raw.set(x, o); o += x.length; } }
  const row = W * 3, H = raw.length / (row + 1), data = new Uint8Array(H * row);
  for (let y = 0; y < H; y++) data.set(raw.subarray(y * (row + 1) + 1, (y + 1) * (row + 1)), y * row);
  const n = (data[0] << 24 | data[1] << 16 | data[2] << 8 | data[3]) >>> 0; return data.subarray(8, 8 + n);
}

const PC_SZ = { '1024x768': ['iPad paysage', 720], '390x844': ['iPhone', 1844] };
const PC_ST = { Fredoka: { 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold' }, Nunito: { 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' } };
const pcFont = g => { const fam = PC_ST[g.f] ? g.f : 'Nunito'; let s = PC_ST[fam][g.wt] || 'Regular'; if (g.it && fam === 'Nunito') s = s === 'Regular' ? 'Italic' : s + ' Italic'; return { family: fam, style: s }; };
const pcRgb = c => ({ r: c.r, g: c.g, b: c.b });
const pcInv = m => { const [[a, c, e], [b, d, f]] = m, det = a * d - b * c; return [[d / det, -c / det, (c * f - d * e) / det], [-b / det, a / det, (b * e - a * f) / det]]; };
function pcPaint(pt, w, h) {
  if (pt.k === 's') return { type: 'SOLID', color: pcRgb(pt.c), opacity: pt.c.a };
  const stops = pt.s.map(s => ({ position: s.p, color: { r: s.c.r, g: s.c.g, b: s.c.b, a: s.c.a } }));
  if (pt.k === 'lin') { const [x0, y0] = pt.p0, [x1, y1] = pt.p1, dx = x1 - x0, dy = y1 - y0; const vx = -dy / w, vy = dx / h;
    return { type: 'GRADIENT_LINEAR', gradientStops: stops, gradientTransform: pcInv([[dx / w, vx, x0 / w - 0.5 * vx], [dy / h, vy, y0 / h - 0.5 * vy]]) }; }
  const rx = 2 * pt.rx / w, ry = 2 * pt.ry / h, cx = pt.c[0] / w, cy = pt.c[1] / h;
  return { type: 'GRADIENT_RADIAL', gradientStops: stops, gradientTransform: pcInv([[rx, 0, cx - 0.5 * rx], [0, ry, cy - 0.5 * ry]]) };
}
const pcEffects = n => { const e = []; (n.sh || []).forEach(s => e.push(s.t === 'in' ? { type: 'INNER_SHADOW', color: { r: s.c.r, g: s.c.g, b: s.c.b, a: s.c.a }, offset: { x: s.x, y: s.y }, radius: s.b, spread: s.s, visible: true, blendMode: 'NORMAL' }
  : { type: 'DROP_SHADOW', color: { r: s.c.r, g: s.c.g, b: s.c.b, a: s.c.a }, offset: { x: s.x, y: s.y }, radius: s.b, spread: s.s, visible: true, blendMode: 'NORMAL', showShadowBehindNode: false }));
  if (n.bblur) e.push({ type: 'BACKGROUND_BLUR', radius: n.bblur, visible: true }); if (n.blur) e.push({ type: 'LAYER_BLUR', radius: n.blur, visible: true }); return e; };
const pcRadius = (node, r) => { if (!r) return; if (r[0] === r[1] && r[1] === r[2] && r[2] === r[3]) node.cornerRadius = r[0]; else { node.topLeftRadius = r[0]; node.topRightRadius = r[1]; node.bottomRightRadius = r[2]; node.bottomLeftRadius = r[3]; } };

async function pcLoadFonts(packs) {
  const need = new Map(); const scan = n => { if (n.t === 'x') n.seg.forEach(g => { const f = pcFont(g); need.set(f.family + '|' + f.style, f); }); (n.ch || []).forEach(scan); };
  packs.forEach(P => P.screens.forEach(s => scan(s.root))); ['Bold', 'Regular', 'ExtraBold'].forEach(s => need.set('Nunito|' + s, { family: 'Nunito', style: s }));
  await Promise.all([...need.values()].map(f => figma.loadFontAsync(f)));
}

// Construit les écrans d'un paquet dans une section. o = { section, rows, dx, y0, rowH, labeled:Set, only, shots, onScreen }
async function pcBuildPack(U, o) {
  const { PK, blob, IMG0 } = U; const imgCache = {}; const st = { made: 0, svgFail: 0, fail: 0, screens: {}, shots: [] };
  const image = k => { if (k == null || !PK.imgs[k]) return null; if (!imgCache[k]) { const [a, l] = PK.imgs[k]; imgCache[k] = figma.createImage(blob.slice(IMG0 + a, IMG0 + a + l)).hash; } return imgCache[k]; };
  const mkImage = (n, k) => { const r = figma.createRectangle(); r.name = n.n || 'image'; r.resize(Math.max(n.w, 0.01), Math.max(n.h, 0.01)); const h = image(k);
    r.fills = h ? [{ type: 'IMAGE', imageHash: h, scaleMode: 'FILL' }] : [{ type: 'SOLID', color: { r: 1, g: 0, b: 1 }, opacity: 0.3 }]; pcRadius(r, n.rad); if (n.op != null) r.opacity = n.op; return r; };
  function build(n, parent) {
    let node;
    if (n.t === 'f') {
      node = figma.createFrame(); node.name = n.n || 'cadre'; node.resize(Math.max(n.w, 0.01), Math.max(n.h, 0.01));
      const fills = (n.bg || []).map(pt => pcPaint(pt, n.w, n.h)); const h = n.ref != null ? image(n.ref) : null; if (h) fills.push({ type: 'IMAGE', imageHash: h, scaleMode: 'FILL' });
      node.fills = fills; node.clipsContent = !!n.clip; pcRadius(node, n.rad);
      // ombre intérieure sans flou ni décalage (anneau CSS « inset 0 0 0 2px ») = bordure intérieure
      if (n.sh && !n.bd) { const ring = n.sh.find(x => x.t === 'in' && !x.x && !x.y && !x.b && x.s > 0); if (ring) { n.bd = { w: [ring.s, ring.s, ring.s, ring.s], c: ring.c }; n.sh = n.sh.filter(x => x !== ring); if (!n.sh.length) delete n.sh; } }
      if (n.bd) { node.strokes = [{ type: 'SOLID', color: pcRgb(n.bd.c), opacity: n.bd.c.a }]; const w = n.bd.w;
        if (n.bd.out) { node.strokeAlign = 'OUTSIDE'; node.strokeWeight = w[0]; }
        else { node.strokeAlign = 'INSIDE'; if (w[0] === w[1] && w[1] === w[2] && w[2] === w[3]) node.strokeWeight = w[0]; else { node.strokeTopWeight = w[0]; node.strokeRightWeight = w[1]; node.strokeBottomWeight = w[2]; node.strokeLeftWeight = w[3]; } }
        if (n.bd.dash) node.dashPattern = n.bd.dash === 1 ? [Math.max(3, w[0] * 3), Math.max(2, w[0] * 2)] : [Math.max(1, w[0]), Math.max(1, w[0])]; }
      let ef = pcEffects(n);
      // Figma n'applique l'étalement (spread) d'une ombre qu'aux cadres qui découpent : on découpe si rien ne dépasse, sinon l'ombre passe sur un rectangle de fond
      if (!n.clip && (n.sh || []).some(x => x.s && x.t !== 'in')) {
        const inside = (n.ch || []).every(c => c.x >= -1 && c.y >= -1 && c.x + c.w <= n.w + 1 && c.y + c.h <= n.h + 1 && !c.rt);
        if (inside) node.clipsContent = true;
        else { const r = figma.createRectangle(); r.name = 'fond + ombre'; r.resize(Math.max(n.w, 0.01), Math.max(n.h, 0.01)); pcRadius(r, n.rad); r.fills = node.fills; r.effects = ef.filter(e => /SHADOW/.test(e.type));
          node.appendChild(r); r.x = 0; r.y = 0; node.fills = []; ef = ef.filter(e => !/SHADOW/.test(e.type)); } }
      if (ef.length) node.effects = ef; if (n.op != null) node.opacity = n.op;
      parent.appendChild(node); node.x = n.x; node.y = n.y;
      for (const c of n.ch || []) { try { build(c, node); } catch (e) { st.fail++; if (!st.err) st.err = String(e && e.message || e).slice(0, 200); } }
    } else if (n.t === 'x') {
      node = figma.createText(); node.name = (n.n || 'texte').slice(0, 60);
      node.fontName = pcFont(n.seg[0]); node.characters = n.seg.map(g => g.s).join('') || ' ';
      let a = 0; for (const g of n.seg) { const e = a + g.s.length; if (e > a) { node.setRangeFontName(a, e, pcFont(g)); node.setRangeFontSize(a, e, g.sz); node.setRangeFills(a, e, [{ type: 'SOLID', color: pcRgb(g.c), opacity: g.c.a }]);
          if (g.ls) node.setRangeLetterSpacing(a, e, { unit: 'PIXELS', value: g.ls }); if (g.td) node.setRangeTextDecoration(a, e, g.td === 'u' ? 'UNDERLINE' : 'STRIKETHROUGH'); } a = e; }
      node.lineHeight = { unit: 'PIXELS', value: n.lh }; node.textAlignHorizontal = n.al || 'LEFT'; if (n.sh) node.effects = pcEffects(n);
      parent.appendChild(node);
      if (n.fixw) { node.textAutoResize = 'HEIGHT'; node.resize(Math.max(1, n.w + 1), Math.max(1, n.h));
        if (n.trunc) { node.textAutoResize = 'NONE'; node.resize(Math.max(1, n.w + 1), n.lh * (n.maxl || 1)); node.textTruncation = 'ENDING'; node.maxLines = n.maxl || 1; } node.x = n.x; }
      else { node.textAutoResize = 'WIDTH_AND_HEIGHT'; const W2 = node.width; node.x = n.al === 'CENTER' ? n.x + n.w / 2 - W2 / 2 : (n.al === 'RIGHT' ? n.x + n.w - W2 : n.x); }
      node.y = n.y;
    } else if (n.t === 'v') {
      try { if (n.fb != null && /font-family="Bravura/i.test(n.svg)) throw new Error('Bravura'); // police absente de Figma : image
        node = figma.createNodeFromSvg(n.svg); node.name = n.n || 'svg'; parent.appendChild(node);
        if (Math.abs(node.width - n.w) > 0.5 || Math.abs(node.height - n.h) > 0.5) node.resize(Math.max(n.w, 0.01), Math.max(n.h, 0.01)); node.clipsContent = false; }
      catch (e) { if (!/Bravura/.test(e.message)) st.svgFail++; else st.bravura = (st.bravura || 0) + 1; if (node && !node.removed) node.remove(); node = mkImage(n, n.fb); node.name = (n.n || 'svg') + ' (image)'; parent.appendChild(node); }
      if (n.op != null) node.opacity = n.op; node.x = n.x; node.y = n.y;
    } else if (n.t === 'i') { node = mkImage(n, n.ref); parent.appendChild(node); node.x = n.x; node.y = n.y; }
    if (n.rt && node) { const [a, b, c, d, tx, ty] = n.rt, w = node.width, h = node.height, cx = n.x + n.w / 2 + tx, cy = n.y + n.h / 2 + ty;
      try { node.relativeTransform = [[a, c, cx - (a * w / 2 + c * h / 2)], [b, d, cy - (b * w / 2 + d * h / 2)]]; } catch (e) { /* rotation non appliquée */ } }
    st.made++; return node;
  }
  const ink = { r: 0.17, g: 0.15, b: 0.38 }, mute = { r: 0.42, g: 0.41, b: 0.55 };
  const tx = (s, f, size, col, x, y, name) => { const t = figma.createText(); t.fontName = f; t.characters = s; t.fontSize = size; t.fills = [{ type: 'SOLID', color: col }]; t.name = name; o.section.appendChild(t); t.x = x; t.y = y; return t; };
  for (const s of PK.screens) {
    if (o.only && !o.only.includes(s.id)) continue;
    const ri = o.rows.indexOf(s.id); const y = o.y0 + Math.max(0, ri) * o.rowH; const key = s.w + 'x' + s.h; const [szName, x0] = PC_SZ[key] || [key, 720];
    if (!o.labeled.has(s.id)) { o.labeled.add(s.id); const a = tx(s.title, { family: 'Nunito', style: 'Bold' }, 30, ink, o.dx + 80, y, 'Titre · ' + s.id); a.textAutoResize = 'HEIGHT'; a.resize(560, a.height);
      const b = tx('id : ' + s.id, { family: 'Nunito', style: 'Regular' }, 20, mute, o.dx + 80, y + a.height + 14, 'id · ' + s.id); st.screens[s.id + ':label'] = [a.id, b.id]; }
    const fr = figma.createFrame(); fr.name = `${s.id} · ${szName} ${s.w}×${s.h}`; o.section.appendChild(fr); fr.x = o.dx + x0; fr.y = y; fr.resize(s.w, s.h); fr.clipsContent = true;
    fr.fills = (s.root.bg || []).map(pt => pcPaint(pt, s.w, s.h));
    for (const c of s.root.ch || []) { try { build(c, fr); } catch (e) { st.fail++; if (!st.err) st.err = String(e && e.message || e).slice(0, 200); } }
    st.screens[s.id + '@' + key] = fr.id; if (o.onScreen) o.onScreen(s, fr);
    if (o.shots && o.shots.includes(s.id + '@' + key)) st.shots.push(await fr.screenshot({ scale: 0.5 }));
  }
  return st;
}

// Retire d'une section tout sauf son titre et sa description (les deux premiers textes) et les nœuds de keep : anciennes captures (cadres à
// remplissage IMAGE), anciens libellés et en-têtes de colonnes. Renvoie le nombre de nœuds retirés.
function pcClearSection(section, keep) {
  const keepSet = new Set(keep || []); const texts = section.children.filter(c => c.type === 'TEXT'); const title = texts[0], desc = texts[1]; let removed = 0;
  for (const c of [...section.children]) { if (keepSet.has(c.id) || c === title || c === desc) continue; c.remove(); removed++; }
  return removed;
}
// En-têtes des deux colonnes, largeur de la description, taille de la section.
async function pcLayoutSection(section, nRows, rowH, y0) {
  const texts = section.children.filter(c => c.type === 'TEXT'); const desc = texts[1];
  if (desc && desc.fontName !== figma.mixed) { await figma.loadFontAsync(desc.fontName); desc.textAutoResize = 'HEIGHT'; desc.resize(2240, desc.height); }
  const ink = { r: 0.42, g: 0.41, b: 0.55 };
  for (const [s, x] of [['iPad paysage · 1024×768', 720], ['iPhone · 390×844', 1844]]) { const t = figma.createText(); t.fontName = { family: 'Nunito', style: 'Bold' }; t.characters = s; t.fontSize = 24; t.fills = [{ type: 'SOLID', color: ink }]; t.name = 'Colonne · ' + s; section.appendChild(t); t.x = x; t.y = y0 - 70; }
  section.resizeWithoutConstraints(2400, y0 + nRows * rowH + 60);
}
// Empile les sections de la page dans l'ordre de leur numéro (13 E-mails à la fin), sous le cadre « Lisez-moi ».
function pcStackSections(page, top) {
  const secs = page.children.filter(c => c.type === 'SECTION').sort((a, b) => parseInt(a.name) - parseInt(b.name)); let y = top;
  for (const s of secs) { s.x = 0; s.y = y; y += s.height + 160; } return secs.map(s => [s.name, s.id]);
}
