// Exportateur DOM → JSON pour la page Figma « Revue des écrans » (calques modifiables).
// Injecté par export_screens.mjs puis appelé dans la page : window.__dom2json(opts) → { w, h, root, rasters }.
// Arbre : f = cadre (fond, dégradés, bordure, rayons, ombres, opacité, découpe), x = texte (segments stylés), v = SVG inline (chaîne pour
// figma.createNodeFromSvg, avec repli image si besoin), i = image découpée (canvas, <img>, glyphes Bravura). Positions relatives au cadre parent.
// Les éléments sans rien de visible (simples enveloppes de mise en page, sans id) sont aplatis : leurs enfants remontent au cadre parent.
(() => {
  const HOSTED = { Fredoka: [600, 700], Nunito: [500, 600, 700, 800] }; // @font-face de index.html / admin/index.html
  const FIG_FONTS = { Fredoka: [300, 400, 500, 600, 700], Nunito: [200, 300, 400, 500, 600, 700, 800, 900] };
  const cv = document.createElement('canvas'); cv.width = cv.height = 1; const cx = cv.getContext('2d', { willReadFrequently: true });
  const colCache = new Map();
  // n'importe quelle couleur CSS (rgb, color(srgb…), oklch, color-mix…) → {r,g,b,a} (0-1) en la peignant sur un pixel
  function col(s) {
    if (!s || s === 'transparent' || s === 'none') return null;
    if (colCache.has(s)) return colCache.get(s);
    let out = null;
    const m = /^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(s);
    if (m) { let a = m[4] === undefined ? 1 : (m[4].endsWith('%') ? parseFloat(m[4]) / 100 : +m[4]); out = { r: +m[1] / 255, g: +m[2] / 255, b: +m[3] / 255, a }; }
    else {
      cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = s; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data;
      out = d[3] ? { r: d[0] / 255 / (d[3] / 255), g: d[1] / 255 / (d[3] / 255), b: d[2] / 255 / (d[3] / 255), a: d[3] / 255 } : null;
      if (out) for (const k of ['r', 'g', 'b']) out[k] = Math.min(1, out[k]);
    }
    if (out && out.a <= 0.003) out = null;
    if (out) for (const k of ['r', 'g', 'b', 'a']) out[k] = Math.round(out[k] * 1000) / 1000;
    colCache.set(s, out); return out;
  }
  // découpe au premier niveau (virgules hors parenthèses)
  function splitTop(s, sep = ',') { const out = []; let d = 0, cur = ''; for (const ch of s) { if (ch === '(') d++; if (ch === ')') d--; if (ch === sep && d === 0) { out.push(cur.trim()); cur = ''; } else cur += ch; } if (cur.trim()) out.push(cur.trim()); return out; }
  function splitSpace(s) { return splitTop(s, ' ').filter(Boolean); }
  const px = (v, ref) => { if (v == null) return 0; v = String(v).trim(); if (v.endsWith('%')) return parseFloat(v) / 100 * ref; return parseFloat(v) || 0; };

  function stops(parts, len) {
    const st = [];
    for (const p of parts) {
      const t = splitSpace(p); const c = col(t[0]); const poss = t.slice(1).map(x => x.endsWith('%') ? parseFloat(x) / 100 : (len ? parseFloat(x) / len : 0));
      if (!c) { if (/^[\d.]+(%|px)?$/.test(t[0])) continue; } // indication d'interpolation : ignorée
      if (!poss.length) st.push({ c: c || { r: 0, g: 0, b: 0, a: 0 }, p: null }); else poss.forEach(q => st.push({ c: c || { r: 0, g: 0, b: 0, a: 0 }, p: q }));
    }
    if (!st.length) return null;
    if (st[0].p == null) st[0].p = 0; if (st[st.length - 1].p == null) st[st.length - 1].p = 1;
    for (let i = 1; i < st.length; i++) if (st[i].p == null) { let j = i; while (st[j].p == null) j++; const a = st[i - 1].p, b = st[j].p; for (let k = i; k < j; k++) st[k].p = a + (b - a) * (k - i + 1) / (j - i + 1); }
    let last = 0; st.forEach(s => { s.p = Math.max(last, Math.min(1, Math.max(0, s.p))); last = s.p; });
    return st;
  }
  // dégradé CSS → peinture {k:'lin'|'rad', s:[stops], p0,p1 (px) | c,rx,ry}
  function gradient(g, w, h) {
    let m = /^(repeating-)?(linear|radial)-gradient\((.*)\)$/s.exec(g.trim()); if (!m || m[1]) return null;
    const parts = splitTop(m[3]);
    if (m[2] === 'linear') {
      let ang = 180; const f = parts[0];
      if (/^-?[\d.]+(deg|turn|rad|grad)$/.test(f)) { ang = parseFloat(f) * (f.endsWith('turn') ? 360 : f.endsWith('rad') && !f.endsWith('grad') ? 180 / Math.PI : f.endsWith('grad') ? 0.9 : 1); parts.shift(); }
      else if (/^to /.test(f)) { const d = f.slice(3).split(/\s+/); const has = k => d.includes(k);
        if (d.length === 1) ang = { top: 0, right: 90, bottom: 180, left: 270 }[d[0]];
        else { const a = Math.atan2(w, h) * 180 / Math.PI; ang = has('top') ? (has('right') ? a : 360 - a) : (has('right') ? 180 - a : 180 + a); }
        parts.shift(); }
      const r = ang * Math.PI / 180, dx = Math.sin(r), dy = -Math.cos(r), L = Math.abs(w * dx) + Math.abs(h * dy);
      const cxp = w / 2, cyp = h / 2; const s = stops(parts, L); if (!s) return null;
      return { k: 'lin', s, p0: [cxp - dx * L / 2, cyp - dy * L / 2], p1: [cxp + dx * L / 2, cyp + dy * L / 2] };
    }
    // radial
    let shape = 'ellipse', size = 'farthest-corner', at = [w / 2, h / 2], first = parts[0];
    if (!col(splitSpace(first)[0]) || /\bat\b|circle|ellipse|closest|farthest/.test(first)) {
      if (/circle|ellipse|closest|farthest|\bat\b|px|%/.test(first) && !/^(rgb|#|hsl|color|oklch|oklab)/.test(first)) {
        parts.shift(); const [a, b] = first.split(/\bat\b/); if (/circle/.test(a)) shape = 'circle';
        const sz = (a || '').replace(/circle|ellipse/g, '').trim(); if (sz) size = sz;
        if (b) { const q = b.trim().split(/\s+/); const kw = { left: '0%', center: '50%', right: '100%', top: '0%', bottom: '100%' };
          let xs = q[0], ys = q[1] || 'center'; if (q.length === 1 && (xs === 'top' || xs === 'bottom')) { ys = xs; xs = 'center'; }
          at = [px(kw[xs] || xs, w), px(kw[ys] || ys, h)]; }
      }
    }
    let rx, ry; const cxs = [at[0], w - at[0]], cys = [at[1], h - at[1]];
    if (/px|%/.test(size)) { const q = size.split(/\s+/); rx = px(q[0], w); ry = q[1] ? px(q[1], h) : rx; }
    else { const far = /farthest/.test(size); const fx = far ? Math.max(...cxs) : Math.min(...cxs), fy = far ? Math.max(...cys) : Math.min(...cys);
      if (shape === 'circle') { rx = ry = /corner/.test(size) ? Math.hypot(fx, fy) : (far ? Math.max(fx, fy) : Math.min(fx, fy)); }
      else if (/corner/.test(size)) { rx = fx * Math.SQRT2; ry = fy * Math.SQRT2; } else { rx = fx; ry = fy; } }
    const s = stops(parts, rx); if (!s) return null;
    return { k: 'rad', s, c: at, rx: Math.max(rx, 0.5), ry: Math.max(ry, 0.5) };
  }
  function shadows(v) {
    if (!v || v === 'none') return [];
    return splitTop(v).map(sh => { const t = splitSpace(sh); let inset = false, c = null; const n = [];
      for (const x of t) { if (x === 'inset') inset = true; else if (/^-?[\d.]+(px)?$/.test(x)) n.push(parseFloat(x)); else c = col(x); }
      if (!c) return null; return { t: inset ? 'in' : 'drop', c, x: n[0] || 0, y: n[1] || 0, b: n[2] || 0, s: n[3] || 0 }; }).filter(Boolean);
  }
  const isVisibleStyle = cs => cs.display !== 'none' && cs.visibility !== 'hidden' && cs.visibility !== 'collapse' && parseFloat(cs.opacity) > 0.01;
  const INLINE = new Set(['inline', 'contents']);
  const r2 = v => Math.round(v * 100) / 100;

  function nameOf(el, txt) {
    let n = el.id ? '#' + el.id : el.tagName.toLowerCase() + ([...el.classList].slice(0, 2).map(c => '.' + c).join(''));
    if (!el.id && el.classList.length) n = [...el.classList].slice(0, 2).map(c => '.' + c).join('');
    for (const a of ['data-v', 'data-mode', 'data-m', 'data-a', 'data-p', 'data-song', 'data-k', 'data-step']) { const v = el.getAttribute && el.getAttribute(a); if (v && v.length < 24) { n += `[${a}=${v}]`; break; } }
    if (txt === undefined) { const al = el.getAttribute && (el.getAttribute('aria-label') || el.getAttribute('title')); txt = al || ''; if (!txt && el.innerText !== undefined) txt = (el.innerText || '').trim().split('\n')[0]; }
    txt = (txt || '').replace(/\s+/g, ' ').trim(); if (txt) n += ' ' + (txt.length > 28 ? txt.slice(0, 27) + '…' : txt);
    return n;
  }
  function fontOf(cs) {
    const fams = cs.fontFamily.split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
    let fam = fams.find(f => FIG_FONTS[f]); const first = fams[0];
    if (/bravura/i.test(first)) return { fam: 'Bravura' };
    if (!fam) fam = /mono/i.test(first) ? 'Nunito' : 'Nunito';
    // graisse réellement affichée : règle CSS de correspondance sur les fichiers auto-hébergés (HOSTED), puis la plus proche dans Figma
    const want = parseInt(cs.fontWeight) || 400; const hw = HOSTED[fam] || FIG_FONTS[fam]; let wt;
    if (hw.includes(want)) wt = want;
    else if (want >= 400 && want <= 500) wt = hw.filter(x => x >= want && x <= 500)[0] ?? hw.filter(x => x < want).pop() ?? hw.filter(x => x > 500)[0];
    else if (want < 400) wt = hw.filter(x => x < want).pop() ?? hw.filter(x => x > want)[0];
    else wt = hw.filter(x => x > want)[0] ?? hw.filter(x => x < want).pop();
    const ws = FIG_FONTS[fam]; wt = ws.reduce((a, b) => Math.abs(b - wt) < Math.abs(a - wt) ? b : a, ws[0]);
    return { fam, wt, it: cs.fontStyle === 'italic' || cs.fontStyle.startsWith('oblique') };
  }
  function tx(s, cs) { const t = cs.textTransform; if (t === 'uppercase') return s.toUpperCase(); if (t === 'lowercase') return s.toLowerCase(); if (t === 'capitalize') return s.replace(/(^|\s)(\S)/g, (a, b, c) => b + c.toUpperCase()); return s; }

  function exportDoc(opts) {
    const VW = opts.w, VH = opts.h, rasters = []; let rid = 0, count = 0;
    const addRaster = (kind, el, rect, extra = {}) => { const id = 'r' + (rid++); rasters.push({ id, kind, rect: { x: rect.x, y: rect.y, w: rect.w, h: rect.h }, ...extra, _el: el }); return id; };

    // fond + bordure + ombres d'un élément → propriétés de cadre (null si rien de visible)
    function boxStyle(el, cs, w, h) {
      const o = {}; let vis = false;
      const fills = [];
      const bi = cs.backgroundImage;
      if (bi && bi !== 'none') {
        const layers = splitTop(bi).reverse(); // CSS : la 1re couche est au-dessus ; Figma : la dernière peinture est au-dessus
        for (const L of layers) { if (/gradient\(/.test(L)) { const g = gradient(L, w, h); if (g) fills.push(g); } else if (/^url\(/.test(L)) o.bgImg = 1; }
      }
      const bc = col(cs.backgroundColor); if (bc) fills.unshift({ k: 's', c: bc });
      if (fills.length) { o.bg = fills; vis = true; }
      const bw = ['Top', 'Right', 'Bottom', 'Left'].map(s => cs['border' + s + 'Style'] !== 'none' && cs['border' + s + 'Style'] !== 'hidden' ? parseFloat(cs['border' + s + 'Width']) || 0 : 0);
      const bcs = ['Top', 'Right', 'Bottom', 'Left'].map(s => col(cs['border' + s + 'Color']));
      if (bw.some((x, i) => x > 0 && bcs[i])) { const i = bw.findIndex((x, k) => x > 0 && bcs[k]); o.bd = { w: bw.map((x, k) => bcs[k] ? x : 0), c: bcs[i], dash: cs['border' + ['Top', 'Right', 'Bottom', 'Left'][i] + 'Style'] === 'dashed' ? 1 : (cs['border' + ['Top', 'Right', 'Bottom', 'Left'][i] + 'Style'] === 'dotted' ? 2 : 0) }; vis = true; }
      const ol = cs.outlineStyle !== 'none' ? parseFloat(cs.outlineWidth) || 0 : 0; const oc = col(cs.outlineColor);
      if (ol > 0 && oc && !o.bd) { o.bd = { w: [ol, ol, ol, ol], c: oc, out: 1 }; vis = true; }
      const rad = ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'].map(k => { const v = cs['border' + k + 'Radius'].split(' ')[0]; return Math.min(px(v, k.includes('Left') || k.includes('Right') ? w : h), Math.min(w, h) / 2); });
      if (rad.some(x => x > 0)) o.rad = rad.map(r2);
      const sh = shadows(cs.boxShadow); if (sh.length) { o.sh = sh; vis = true; }
      const bf = /blur\(([\d.]+)px\)/.exec(cs.backdropFilter || cs.webkitBackdropFilter || ''); if (bf && parseFloat(bf[1]) > 0) o.bblur = parseFloat(bf[1]);
      const lb = /blur\(([\d.]+)px\)/.exec(cs.filter || ''); if (lb && parseFloat(lb[1]) > 0) o.blur = parseFloat(lb[1]);
      return { o, vis };
    }

    function svgString(svg, rect, rot) {
      const clone = svg.cloneNode(true);
      const src = [svg, ...svg.querySelectorAll('*')], dst = [clone, ...clone.querySelectorAll('*')];
      const PROPS = ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'opacity', 'fill-opacity', 'stroke-opacity', 'stop-color', 'stop-opacity', 'font-family', 'font-weight', 'font-size', 'text-anchor', 'fill-rule', 'display', 'visibility'];
      let hasText = false, risky = false;
      src.forEach((e, i) => {
        const d = dst[i]; if (!d || !d.setAttribute) return; const cs = getComputedStyle(e);
        if (e.tagName === 'text' || e.tagName === 'tspan') hasText = true;
        if (/^(foreignObject|filter|mask|pattern|image|use)$/i.test(e.tagName)) risky = true;
        for (const p of PROPS) {
          let v = cs.getPropertyValue(p); if (!v) continue;
          if ((p === 'fill' || p === 'stroke' || p === 'stop-color') && v !== 'none' && !/^url\(/.test(v)) { const c = col(v); if (!c) v = p === 'stop-color' ? 'rgba(0,0,0,0)' : 'none'; else { v = `rgb(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)})`; if (c.a < 1) d.setAttribute(p === 'stop-color' ? 'stop-opacity' : p + '-opacity', String(c.a * (parseFloat(cs.getPropertyValue(p === 'stop-color' ? 'stop-opacity' : p + '-opacity')) || 1))); } }
          if (/^url\(/.test(v)) v = v.replace(/^url\("?.*?(#[^")]+)"?\)$/, 'url($1)');
          if (p === 'font-family') { const f = v.split(',').map(s => s.trim().replace(/^["']|["']$/g, '')); v = f.find(x => FIG_FONTS[x]) || f[0]; if (!FIG_FONTS[v] && (e.tagName === 'text' || e.tagName === 'tspan')) risky = true; }
          if (p === 'display' && v !== 'none') continue; if (p === 'visibility' && v === 'visible') continue;
          if (p === 'opacity' && v === '1') continue;
          if ((p === 'fill-opacity' || p === 'stroke-opacity' || p === 'stop-opacity') && v === '1' && !d.hasAttribute(p)) continue;
          if (!d.hasAttribute(p) || p === 'fill' || p === 'stroke' || p === 'stop-color' || p === 'font-family') d.setAttribute(p, v);
        }
        d.removeAttribute('class'); d.removeAttribute('style');
      });
      // <use href="#x"> : recopier les cibles dans un <defs>
      const uses = clone.querySelectorAll('use'); if (uses.length) { const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs'); const seen = new Set();
        uses.forEach(u => { const h = (u.getAttribute('href') || u.getAttribute('xlink:href') || '').replace(/^#/, ''); if (h && !seen.has(h) && !clone.querySelector('#' + CSS.escape(h))) { const t = svg.ownerDocument.getElementById(h); if (t) { seen.add(h); defs.appendChild(t.cloneNode(true)); } } }); clone.insertBefore(defs, clone.firstChild); }
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); clone.setAttribute('width', r2(rect.w)); clone.setAttribute('height', r2(rect.h));
      if (!clone.getAttribute('viewBox')) { const bb = svg.viewBox && svg.viewBox.baseVal; if (bb && bb.width) clone.setAttribute('viewBox', `${bb.x} ${bb.y} ${bb.width} ${bb.height}`); else clone.setAttribute('viewBox', `0 0 ${r2(rect.w)} ${r2(rect.h)}`); }
      clone.removeAttribute('id');
      if (rot) { const vb = clone.getAttribute('viewBox').split(/[ ,]+/).map(Number); const cx2 = vb[0] + vb[2] / 2, cy2 = vb[1] + vb[3] / 2; const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('transform', `translate(${cx2} ${cy2}) matrix(${rot.map(r2).join(' ')} 0 0) translate(${-cx2} ${-cy2})`); [...clone.childNodes].forEach(k => { if (k.tagName !== 'defs') g.appendChild(k); }); clone.appendChild(g); }
      const ov = getComputedStyle(svg).overflow; if (ov === 'visible') clone.setAttribute('overflow', 'visible');
      return { s: new XMLSerializer().serializeToString(clone), hasText, risky };
    }

    // rectangle visible = intersection avec les ancêtres qui découpent
    const inter = (a, b) => { const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y), x2 = Math.min(a.x + a.w, b.x + b.w), y2 = Math.min(a.y + a.h, b.y + b.h); return x2 > x && y2 > y ? { x, y, w: x2 - x, h: y2 - y } : null; };

    // bloc de texte : élément dont tout le contenu est en ligne (texte + éléments inline sans décor)
    function inlineOnly(el) {
      for (const c of el.childNodes) {
        if (c.nodeType === 3) continue; if (c.nodeType !== 1) continue;
        if (c.tagName === 'BR') continue;
        const cs = getComputedStyle(c); if (!isVisibleStyle(cs)) { if (cs.display === 'none') continue; }
        if (!INLINE.has(cs.display)) return false;
        if (/^(svg|img|canvas|input|select|textarea|button|iframe|video)$/i.test(c.tagName)) return false;
        const bs = boxStyle(c, cs, 10, 10); if (bs.vis || parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) > 2) return false;
        if (cs.position !== 'static' && cs.position !== 'relative') return false;
        if (!inlineOnly(c)) return false;
      }
      return true;
    }
    function segmentsOf(el, base) {
      const segs = []; const ws = getComputedStyle(el).whiteSpace; const pre = /pre/.test(ws);
      const walk = (n) => {
        for (const c of n.childNodes) {
          if (c.nodeType === 3) { const pcs = getComputedStyle(c.parentElement); if (!isVisibleStyle(pcs)) continue; let s = c.data; if (!pre) s = s.replace(/[\t\n\r ]+/g, ' '); if (!s) continue;
            const f = fontOf(pcs); segs.push({ s: tx(s, pcs), f: f.fam, wt: f.wt, it: f.it ? 1 : 0, sz: parseFloat(pcs.fontSize), c: col(pcs.color) || { r: 0, g: 0, b: 0, a: 1 }, ls: parseFloat(pcs.letterSpacing) || 0, td: /underline/.test(pcs.textDecorationLine) ? 'u' : (/line-through/.test(pcs.textDecorationLine) ? 's' : '') }); }
          else if (c.nodeType === 1) { if (c.tagName === 'BR') segs.push({ br: 1 }); else { const ccs = getComputedStyle(c); if (ccs.display !== 'none' && ccs.visibility !== 'hidden') walk(c); } }
        }
      };
      walk(el);
      // fusion, espaces de début/fin, <br>
      const out = []; for (const s of segs) { if (s.br) { if (out.length) out[out.length - 1].s += '\n'; else out.push({ ...base, s: '\n' }); continue; } const L = out[out.length - 1];
        if (L && L.f === s.f && L.wt === s.wt && L.it === s.it && L.sz === s.sz && L.ls === s.ls && L.td === s.td && JSON.stringify(L.c) === JSON.stringify(s.c)) L.s += s.s; else out.push(s); }
      if (!pre) { for (let i = 0; i < out.length; i++) { if (i > 0 && /[ \n]$/.test(out[i - 1].s)) out[i].s = out[i].s.replace(/^ +/, ''); } if (out.length) { out[0].s = out[0].s.replace(/^ +/, ''); out[out.length - 1].s = out[out.length - 1].s.replace(/[ \n]+$/, ''); } out.forEach(s => s.s = s.s.replace(/ *\n */g, '\n')); }
      return out.filter(s => s.s.length);
    }
    function textNode(el, rng, cs, clip, off) {
      const ox = off ? off.x : 0, oy = off ? off.y : 0;
      const rects = [...rng.getClientRects()].filter(r => r.width > 0.5 && r.height > 0.5).map(r => ({ left: r.left + ox, right: r.right + ox, top: r.top + oy, bottom: r.bottom + oy, width: r.width, height: r.height })); if (!rects.length) return null;
      let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity; rects.forEach(r => { x1 = Math.min(x1, r.left); y1 = Math.min(y1, r.top); x2 = Math.max(x2, r.right); y2 = Math.max(y2, r.bottom); });
      const box = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }; if (!inter(box, clip)) return null;
      const tops = []; rects.forEach(r => { if (!tops.some(t => Math.abs(t - r.top) < r.height * 0.5)) tops.push(r.top); });
      return { box, lines: tops.length, rh: Math.max(...rects.map(r => r.height)) };
    }

    // éléments tournés (transform: rotate) : on mesure le sous-arbre sans la rotation, puis on la remet sur le calque (n.rt)
    const PRIM = [];
    function walk(el, parentFrame, clip, offset, depth, iz) {
      if (count > 6000) return;
      let rot = null;
      if (el.tagName !== 'svg' && el.style) { const cs0 = getComputedStyle(el); const tf = cs0.transform; const m = tf && tf !== 'none' && /matrix\(([^)]+)\)/.exec(tf);
        if (m) { const v = m[1].split(',').map(Number); if (Math.abs(v[1]) > 1e-3) { const sc = Math.hypot(v[0], v[1]); rot = { v, sc, old: el.style.getPropertyValue('transform'), pri: el.style.getPropertyPriority('transform'), o: cs0.transformOrigin }; el.style.setProperty('transform', 'none', 'important'); } } }
      const tok = { el, node: null }; PRIM.push(tok);
      try { walkInner(el, parentFrame, clip, offset, depth, iz); }
      finally { PRIM.pop(); if (rot) { el.style.removeProperty('transform'); if (rot.old) el.style.setProperty('transform', rot.old, rot.pri);
        if (tok.node) { const r = el.getBoundingClientRect(); el.style.setProperty('transform', 'none', 'important'); const u = el.getBoundingClientRect(); el.style.removeProperty('transform'); if (rot.old) el.style.setProperty('transform', rot.old, rot.pri);
          const [a, b, c, d] = rot.v.map(x => x / rot.sc); const ucx = u.left + u.width / 2, ucy = u.top + u.height / 2;
          tok.node.rt = [a, b, c, d, r.left + r.width / 2 - ucx, r.top + r.height / 2 - ucy].map(x => Math.round(x * 10000) / 10000); } } }
    }
    function walkInner(el, parentFrame, clip, offset, depth, iz) {
      // offset : décalage du document (iframe)
      const cs = getComputedStyle(el);
      if (!isVisibleStyle(cs) && cs.display !== 'contents') { if (cs.display === 'none' || parseFloat(cs.opacity) <= 0.01) return; }
      const hiddenSelf = cs.visibility === 'hidden';
      const tag = el.tagName;
      if (/^(SCRIPT|STYLE|TEMPLATE|NOSCRIPT|LINK|META|HEAD|TITLE)$/.test(tag)) return;
      if (el.hasAttribute && el.hasAttribute('hidden') && cs.display === 'none') return;
      const r = el.getBoundingClientRect(); const rect = { x: r.left + offset.x, y: r.top + offset.y, w: r.width, h: r.height };
      const visRect = cs.display === 'contents' ? clip : inter(rect, clip);
      if (cs.display !== 'contents' && !visRect && cs.overflow === 'visible' && (rect.w > 0 && rect.h > 0)) { /* hors champ : on regarde quand même les enfants positionnés */ }
      const fixed = cs.position === 'fixed';
      let pf = parentFrame;
      if (fixed && opts.root) { pf = opts.root; iz = null; }
      // ordre d'empilement relatif au cadre parent : z-index du contexte d'empilement le plus haut entre le cadre et l'élément
      const zi = parseInt(cs.zIndex), positioned = cs.position !== 'static';
      const myZ = positioned && !isNaN(zi) ? zi : (positioned ? 0.5 : 0);
      const zKey = iz != null ? iz : myZ; const stackCtx = positioned && !isNaN(zi);
      const reg = node => { const t = PRIM[PRIM.length - 1]; if (t && t.el === el && !t.node) t.node = node; };
      const push = (arr, node) => { node._z = zKey; arr.push(node); reg(node); };
      const pushMe = (meF, node) => { node._z = meF === pf ? zKey : 0; meF.ch.push(node); if (node.t === 'x' || node.t === 'i') reg(node); };

      // éléments remplacés
      if (tag === 'svg' || el instanceof SVGSVGElement) {
        if (hiddenSelf || !visRect || rect.w < 1 || rect.h < 1) return;
        // boîte de contenu (le viewBox s'y applique) : rectangle sans transformation, moins bordures et marges intérieures
        let cb = rect, rot = null; const tf = cs.transform;
        if (tf && tf !== 'none') { const m = /matrix\(([^)]+)\)/.exec(tf); if (m) { const v = m[1].split(',').map(Number); const sc = Math.hypot(v[0], v[1]); if (Math.abs(v[1]) > 1e-3 || v[0] < 0 || v[3] < 0) rot = [v[0] / sc, v[1] / sc, v[2] / sc, v[3] / sc];
          const ow = el.clientWidth || (el.width && el.width.baseVal && el.width.baseVal.value) || rect.w, oh = el.clientHeight || (el.height && el.height.baseVal && el.height.baseVal.value) || rect.h;
          if (rot) cb = { x: rect.x + (rect.w - ow) / 2, y: rect.y + (rect.h - oh) / 2, w: ow, h: oh }; } }
        const pl = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.borderLeftWidth) || 0), pt = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.borderTopWidth) || 0);
        const prr = (parseFloat(cs.paddingRight) || 0) + (parseFloat(cs.borderRightWidth) || 0), pb = (parseFloat(cs.paddingBottom) || 0) + (parseFloat(cs.borderBottomWidth) || 0);
        const inner = { x: cb.x + pl, y: cb.y + pt, w: cb.w - pl - prr, h: cb.h - pt - pb }; if (inner.w < 1 || inner.h < 1) return;
        const { s, hasText, risky } = svgString(el, inner, rot);
        const bs = boxStyle(el, cs, rect.w, rect.h);
        let node = { t: 'v', n: nameOf(el, ''), x: inner.x, y: inner.y, w: inner.w, h: inner.h, svg: s };
        if (bs.vis) { node = { t: 'f', n: nameOf(el, '') + ' (fond)', x: cb.x, y: cb.y, w: cb.w, h: cb.h, ...bs.o, ch: [node] }; }
        if (parseFloat(cs.opacity) < 1) node.op = +cs.opacity;
        if (hasText || risky || s.length > 60000) (node.t === 'v' ? node : node.ch[0]).fb = addRaster('clip', el, inner);
        push(pf.ch, node); count++; return;
      }
      if (tag === 'CANVAS' || tag === 'IMG' || tag === 'VIDEO') {
        if (hiddenSelf || !visRect || rect.w < 1 || rect.h < 1) return;
        const node = { t: 'i', n: nameOf(el, el.getAttribute('alt') || ''), x: rect.x, y: rect.y, w: rect.w, h: rect.h };
        const bs = boxStyle(el, cs, rect.w, rect.h); if (bs.o.rad) node.rad = bs.o.rad;
        if (tag === 'IMG' && /\.svg(\?|$)/i.test(el.currentSrc || el.src)) node.svgUrl = el.currentSrc || el.src;
        node.ref = addRaster(tag === 'CANVAS' ? 'canvas' : (tag === 'IMG' ? 'img' : 'clip'), el, rect);
        if (parseFloat(cs.opacity) < 1) node.op = +cs.opacity;
        push(pf.ch, node); count++; return;
      }
      if (tag === 'IFRAME') {
        if (!visRect) return; let doc; try { doc = el.contentDocument; } catch (e) { doc = null; }
        const bl = parseFloat(cs.borderLeftWidth) || 0, bt = parseFloat(cs.borderTopWidth) || 0;
        const fr = { t: 'f', n: nameOf(el, '') + ' (lecteur)', x: rect.x, y: rect.y, w: rect.w, h: rect.h, clip: 1, ch: [] };
        const bs = boxStyle(el, cs, rect.w, rect.h); Object.assign(fr, bs.o); push(pf.ch, fr); count++;
        if (doc && doc.documentElement) { const sub = { x: rect.x + bl, y: rect.y + bt }; const html = doc.documentElement; const bcs = doc.defaultView.getComputedStyle(doc.body);
          const bg = col(bcs.backgroundColor) || col(doc.defaultView.getComputedStyle(html).backgroundColor); if (bg) fr.bg = [{ k: 's', c: bg }];
          const bsb = boxStyle(doc.body, bcs, rect.w, rect.h); if (bsb.o.bg) fr.bg = bsb.o.bg;
          const icl = inter(clip, rect) || clip;
          const getCS = doc.defaultView.getComputedStyle.bind(doc.defaultView);
          const saved = window.getComputedStyle; window.getComputedStyle = getCS;
          try { for (const c of doc.body.children) walk(c, fr, icl, sub, depth + 1, null); } finally { window.getComputedStyle = saved; }
        } else fr.ref = addRaster('clip', el, rect);
        return;
      }
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        if (hiddenSelf || !visRect) return;
        const type = (el.type || '').toLowerCase();
        if (tag === 'INPUT' && (type === 'checkbox' || type === 'radio' || type === 'range' || type === 'color' || type === 'file')) {
          if (cs.appearance === 'none' || cs.webkitAppearance === 'none') { const bs = boxStyle(el, cs, rect.w, rect.h); if (bs.vis || bs.o.bgImg) { const fr = { t: 'f', n: nameOf(el, '') + (el.checked ? ' (coché)' : ''), x: rect.x, y: rect.y, w: rect.w, h: rect.h, ...bs.o, ch: [] }; if (bs.o.bgImg) fr.ref = addRaster('clip', el, rect); push(pf.ch, fr); count++; } return; }
          if (type === 'file') return; push(pf.ch, { t: 'i', n: nameOf(el, type), x: rect.x, y: rect.y, w: rect.w, h: rect.h, ref: addRaster('clip', el, rect) }); count++; return;
        }
        const bs = boxStyle(el, cs, rect.w, rect.h);
        const fr = { t: 'f', n: nameOf(el, el.placeholder || el.name || ''), x: rect.x, y: rect.y, w: rect.w, h: rect.h, clip: 1, ...bs.o, ch: [] };
        if (parseFloat(cs.opacity) < 1) fr.op = +cs.opacity;
        let val = tag === 'SELECT' ? (el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : '') : el.value; let ph = false;
        if (!val && el.placeholder) { val = el.placeholder; ph = true; }
        if (type === 'password' && val && !ph) val = '•'.repeat(val.length);
        if (val) { const f = fontOf(cs); const pcs = ph ? getComputedStyle(el, '::placeholder') : cs; const pl = parseFloat(cs.paddingLeft) + (parseFloat(cs.borderLeftWidth) || 0);
          const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.25;
          fr.ch.push({ t: 'x', n: ph ? 'placeholder' : 'valeur', x: rect.x + pl, y: rect.y + (rect.h - lh) / 2, w: rect.w - pl * 2 - (tag === 'SELECT' ? 18 : 0), h: lh, lines: 1, al: cs.textAlign === 'center' ? 'CENTER' : 'LEFT', lh, trunc: 1, fixw: 1,
            seg: [{ s: val, f: f.fam === 'Bravura' ? 'Nunito' : f.fam, wt: f.wt || 400, it: 0, sz: parseFloat(cs.fontSize), c: col(pcs.color) || col(cs.color) || { r: .4, g: .4, b: .4, a: 1 }, ls: 0, td: '' }] }); }
        if (tag === 'SELECT') fr.ch.push({ t: 'v', n: 'flèche', x: rect.x + rect.w - 20, y: rect.y + rect.h / 2 - 4, w: 10, h: 8, svg: `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="8" viewBox="0 0 10 8"><path d="M1 2l4 4 4-4" fill="none" stroke="${(() => { const c = col(cs.color) || { r: .3, g: .3, b: .3 }; return `rgb(${c.r * 255 | 0},${c.g * 255 | 0},${c.b * 255 | 0})`; })()}" stroke-width="1.6" stroke-linecap="round"/></svg>` });
        push(pf.ch, fr); count++; return;
      }

      // cadre ou aplati ?
      const isContents = cs.display === 'contents';
      const { o: box, vis } = isContents ? { o: {}, vis: false } : boxStyle(el, cs, rect.w, rect.h);
      const op = parseFloat(cs.opacity);
      const clips = !isContents && (cs.overflowX !== 'visible' || cs.overflowY !== 'visible' || cs.clipPath !== 'none' && /inset|circle/.test(cs.clipPath));
      const major = el.id || el === opts.rootEl || /^(MAIN|NAV|ASIDE|HEADER|FOOTER|SECTION|DIALOG|BUTTON|A|LABEL|LI)$/.test(tag) || el.classList.contains('ptile') || el.classList.contains('tile') || el.getAttribute('role') === 'button' || /^(kbd|keys|keyboard)$/i.test(el.className);
      const isTxtBlock = !isContents && [...el.childNodes].some(c => c.nodeType === 3 && c.data.trim()) && inlineOnly(el) && (!/flex|grid/.test(cs.display) || el.childNodes.length === 1 || [...el.childNodes].every(c => c.nodeType === 3 || c.tagName === 'BR' || INLINE.has(getComputedStyle(c).display)));
      let me = pf;
      if (!hiddenSelf && (vis || box.bgImg || clips || op < 0.999 || (major && rect.w > 0 && rect.h > 0)) && (visRect || clips === false)) {
        if (!visRect) { /* entièrement hors champ */ if (clips) return; }
        const fr = { t: 'f', n: nameOf(el), x: rect.x, y: rect.y, w: Math.max(rect.w, 0.01), h: Math.max(rect.h, 0.01), ch: [], ...box };
        if (op < 0.999) fr.op = r2(op); if (clips) fr.clip = 1;
        const z = parseInt(cs.zIndex); if (!isNaN(z) && cs.position !== 'static') fr.z = z;
        if (box.bgImg && !el.children.length && !(el.textContent || '').trim()) fr.ref = addRaster('clip', el, rect);
        push(pf.ch, fr); count++; me = fr; if (stackCtx || op < 0.999 || (cs.transform && cs.transform !== 'none')) fr._sc = 1;
      } else if (hiddenSelf && !el.children.length) return;
      const childClip = clips && visRect ? visRect : (clips ? null : clip);
      if (!childClip) return;

      // pseudo-éléments ::before / ::after (boîtes simples en position absolue, ou texte court)
      for (const pse of ['::before', '::after']) {
        if (isContents || hiddenSelf) break;
        const ps = getComputedStyle(el, pse); const ct = ps.content; if (!ct || ct === 'none' || ct === 'normal' || ps.display === 'none' || parseFloat(ps.opacity) <= 0.01) continue;
        const txt = /^"(.*)"$/.exec(ct) ? JSON.parse(ct.replace(/\\([0-9a-f]{1,6})\s?/gi, (a, h) => String.fromCodePoint(parseInt(h, 16)))) : '';
        let pr = null;
        if (ps.position === 'absolute' || ps.position === 'fixed') {
          const bl = parseFloat(cs.borderLeftWidth) || 0, bt = parseFloat(cs.borderTopWidth) || 0, iw = rect.w - bl - (parseFloat(cs.borderRightWidth) || 0), ih = rect.h - bt - (parseFloat(cs.borderBottomWidth) || 0);
          let w = ps.width === 'auto' ? null : px(ps.width, iw), h = ps.height === 'auto' ? null : px(ps.height, ih);
          const L = ps.left === 'auto' ? null : px(ps.left, iw), R = ps.right === 'auto' ? null : px(ps.right, iw), T = ps.top === 'auto' ? null : px(ps.top, ih), B = ps.bottom === 'auto' ? null : px(ps.bottom, ih);
          if (w == null && L != null && R != null) w = iw - L - R; if (h == null && T != null && B != null) h = ih - T - B;
          if (w != null && h != null && w > 0 && h > 0) { const x = L != null ? L : (R != null ? iw - R - w : 0), y = T != null ? T : (B != null ? ih - B - h : 0);
            if (!/matrix|rotate|scale/.test(ps.transform) || ps.transform === 'none') pr = { x: rect.x + bl + x, y: rect.y + bt + y, w, h };
            else { const m = /matrix\(([^)]+)\)/.exec(ps.transform); if (m) { const v = m[1].split(',').map(Number); if (Math.abs(v[1]) < 1e-3 && Math.abs(v[2]) < 1e-3) { const nw = w * v[0], nh = h * v[3]; pr = { x: rect.x + bl + x + (w - nw) / 2 + v[4], y: rect.y + bt + y + (h - nh) / 2 + v[5], w: nw, h: nh }; } } } }
        }
        if (pr) { const bs = boxStyle(el, ps, pr.w, pr.h); if (bs.vis) { const node = { t: 'f', n: pse, x: pr.x, y: pr.y, w: pr.w, h: pr.h, ch: [], ...bs.o }; if (parseFloat(ps.opacity) < 1) node.op = +ps.opacity; pushMe(me, node); count++; }
          if (txt.trim()) { const f = fontOf(ps); if (f.fam !== 'Bravura') { const lh = parseFloat(ps.lineHeight) || parseFloat(ps.fontSize) * 1.2; pushMe(me, { t: 'x', n: pse + ' ' + txt, x: pr.x, y: pr.y + (pr.h - lh) / 2, w: pr.w, h: lh, lines: 1, lh, al: 'CENTER', fixw: 1, seg: [{ s: tx(txt, ps), f: f.fam, wt: f.wt, it: 0, sz: parseFloat(ps.fontSize), c: col(ps.color) || { r: 0, g: 0, b: 0, a: 1 }, ls: 0, td: '' }] }); } } }
      }

      if (isTxtBlock && !hiddenSelf) {
        const rng = el.ownerDocument.createRange(); rng.selectNodeContents(el);
        const m = textNode(el, rng, cs, childClip, offset);
        if (m) { const base = fontOf(cs);
          if (base.fam === 'Bravura') { pushMe(me, { t: 'i', n: nameOf(el) + ' (Bravura)', x: m.box.x, y: m.box.y, w: m.box.w, h: m.box.h, ref: addRaster('clip', el, m.box) }); count++; }
          else { const seg = segmentsOf(el, { f: base.fam, wt: base.wt, it: 0, sz: parseFloat(cs.fontSize), c: col(cs.color), ls: 0, td: '' });
            if (seg.length) { let lh = parseFloat(cs.lineHeight); if (isNaN(lh)) lh = m.lines > 1 ? m.box.h / m.lines : Math.max(m.rh, parseFloat(cs.fontSize) * 1.2);
              const al = { center: 'CENTER', right: 'RIGHT', end: 'RIGHT', justify: 'JUSTIFIED', '-webkit-center': 'CENTER' }[cs.textAlign] || 'LEFT';
              const pl = parseFloat(cs.paddingLeft) + (parseFloat(cs.borderLeftWidth) || 0), pr2 = parseFloat(cs.paddingRight) + (parseFloat(cs.borderRightWidth) || 0);
              const contentX = rect.x + pl, contentW = rect.w - pl - pr2;
              const trunc = cs.textOverflow === 'ellipsis' && cs.overflowX !== 'visible' && el.scrollWidth > el.clientWidth + 1;
              const clampN = parseInt(cs.webkitLineClamp) || 0;
              const node = { t: 'x', n: nameOf(el, seg.map(s => s.s).join('')), x: m.box.x, y: m.box.y + (m.rh - lh) / 2, w: m.box.w, h: m.lines * lh, lines: m.lines, lh: r2(lh), al, seg, cxw: [contentX, contentW] };
              if (m.lines > 1 || trunc || clampN) { node.x = m.box.x; node.w = m.box.w + 2; node.fixw = 1; if (al === 'LEFT' && /flex|grid/.test(cs.display) && /center/.test(cs.justifyContent)) node.al = 'CENTER'; } // largeur = ligne la plus longue (gère text-wrap: balance)
              if (trunc) { node.trunc = 1; node.x = contentX; node.w = contentW; }
              const tsh = shadows(cs.textShadow); if (tsh.length) node.sh = tsh;
              if (clampN && m.lines >= clampN) { node.trunc = 1; node.maxl = clampN; }
              if (el !== me.el && me !== pf && me.t === 'f') { /* texte dans son propre cadre (bouton, pastille) */ }
              pushMe(me, node); count++; } } }
        return;
      }
      // enfants : texte direct (hors bloc) + éléments, triés par z-index
      const kids = [];
      for (const c of el.childNodes) {
        if (c.nodeType === 3 && c.data.trim() && !hiddenSelf) {
          const rng = el.ownerDocument.createRange(); rng.selectNodeContents(c); const m = textNode(el, rng, cs, childClip, offset); if (!m) continue; const f = fontOf(cs);
          if (f.fam === 'Bravura') { kids.push({ z: 0, fn: () => { pushMe(me, { t: 'i', n: 'Bravura ' + c.data.trim(), x: m.box.x, y: m.box.y, w: m.box.w, h: m.box.h, ref: addRaster('clip', el, m.box) }); count++; } }); continue; }
          let lh = parseFloat(cs.lineHeight); if (isNaN(lh)) lh = m.lines > 1 ? m.box.h / m.lines : Math.max(m.rh, parseFloat(cs.fontSize) * 1.2);
          const s = tx((/pre/.test(cs.whiteSpace) ? c.data : c.data.replace(/\s+/g, ' ')).trim(), cs);
          kids.push({ z: 0, fn: () => { pushMe(me, { t: 'x', n: s.slice(0, 40), x: m.box.x, y: m.box.y + (m.rh - lh) / 2, w: m.box.w, h: m.lines * lh, lines: m.lines, lh: r2(lh), al: m.lines > 1 ? ({ center: 'CENTER', right: 'RIGHT' }[cs.textAlign] || 'LEFT') : 'LEFT', fixw: m.lines > 1 ? 1 : 0,
            seg: [{ s, f: f.fam, wt: f.wt, it: f.it ? 1 : 0, sz: parseFloat(cs.fontSize), c: col(cs.color) || { r: 0, g: 0, b: 0, a: 1 }, ls: parseFloat(cs.letterSpacing) || 0, td: '' }] }); count++; } });
        } else if (c.nodeType === 1) {
          const ciz = me !== pf ? null : (stackCtx || iz != null ? zKey : null);
          kids.push({ z: 0, fn: () => walk(c, me, childClip, offset, depth + 1, ciz) });
        }
      }
      kids.map((k, i) => ({ ...k, i })).sort((a, b) => a.z - b.z || a.i - b.i).forEach(k => k.fn());
    }

    const de = document.documentElement, bcs = getComputedStyle(document.body), hcs = getComputedStyle(de);
    const root = { t: 'f', n: opts.name || 'écran', x: 0, y: 0, w: VW, h: VH, clip: 1, ch: [] };
    const bg = boxStyle(document.body, bcs, VW, VH).o.bg || boxStyle(de, hcs, VW, VH).o.bg; root.bg = bg || [{ k: 's', c: { r: 1, g: 1, b: 1, a: 1 } }];
    opts.root = root;
    const sx = window.scrollX, sy = window.scrollY;
    for (const c of document.body.children) walk(c, root, { x: 0, y: 0, w: VW, h: VH }, { x: 0, y: 0 }, 0, null);
    const zsort = n => { if (n.ch) { n.ch.forEach(zsort); if (n !== root && !n._sc) { const m = Math.max(...n.ch.map(c => c._z || 0)); if (m > (n._z || 0)) n._z = m; } n.ch = n.ch.map((c, i) => [c, i]).sort((a, b) => (a[0]._z || 0) - (b[0]._z || 0) || a[1] - b[1]).map(a => a[0]); } }; zsort(root); const clean = n => { delete n._z; delete n._sc; (n.ch || []).forEach(clean); }; clean(root);
    // coordonnées relatives au parent, nettoyage
    const rel = (n, ox, oy) => { const ax = n.x, ay = n.y; n.x = r2(ax - ox); n.y = r2(ay - oy); n.w = r2(n.w); n.h = r2(n.h); if (n.ch) { n.ch.forEach(c => rel(c, ax, ay)); n.ch = n.ch.filter(c => !(c.t === 'f' && !(c.ch && c.ch.length) && !c.bg && !c.bd && !c.sh && !c.ref && !(c.n || '').startsWith('#'))); if (!n.ch.length) delete n.ch; } };
    rel(root, 0, 0); root.x = 0; root.y = 0;
    return { w: VW, h: VH, root, rasters, count, scroll: [sx, sy] };
  }
  window.__dom2json = (opts) => { let out; try { out = exportDoc(opts || { w: innerWidth, h: innerHeight }); } catch (e) { throw new Error(e.stack); } if (0) out = exportDoc(opts || { w: innerWidth, h: innerHeight }); window.__d2jRasters = out.rasters; out.rasters = out.rasters.map(({ _el, ...r }) => r); return out; };
  // image d'un canvas / <img> par son identifiant (dataURL PNG), ou null (on prendra alors une capture découpée)
  window.__d2jRaster = (id) => { const r = (window.__d2jRasters || []).find(x => x.id === id); if (!r) return null; const el = r._el;
    try { if (r.kind === 'canvas') { if (!el.width || !el.height) return null; return el.toDataURL('image/png'); }
      if (r.kind === 'img') { if (!el.complete || !el.naturalWidth) return null; const c = document.createElement('canvas'); const sc = Math.min(2, Math.max(1, (r.rect.w * 2) / el.naturalWidth)); c.width = Math.round(Math.min(el.naturalWidth * sc, r.rect.w * 2)) || 1; c.height = Math.round(c.width * r.rect.h / r.rect.w) || 1;
        const ctx = c.getContext('2d'); const cs = el.ownerDocument.defaultView.getComputedStyle(el); const fit = cs.objectFit; const iw = el.naturalWidth, ih = el.naturalHeight;
        if (fit === 'cover' || fit === 'contain') { const s = (fit === 'cover' ? Math.max : Math.min)(c.width / iw, c.height / ih); const dw = iw * s, dh = ih * s; ctx.drawImage(el, (c.width - dw) / 2, (c.height - dh) / 2, dw, dh); } else ctx.drawImage(el, 0, 0, c.width, c.height);
        return c.toDataURL('image/png'); } } catch (e) { return null; } return null; };
})();
