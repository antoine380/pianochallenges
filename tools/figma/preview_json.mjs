// Contrôle local de l'exportateur, sans Figma : redessine un JSON de dom2json.js en HTML (mêmes règles que le constructeur Figma :
// cadres, textes, SVG, images), le photographie et le place à côté de la capture d'origine, avec l'écart en pourcentage de pixels.
// Usage : NODE_PATH=… PW_CHROMIUM=… node tools/figma/preview_json.mjs <fichier.json|dossier> [sortie]
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const { chromium } = createRequire(import.meta.url)('playwright');
const arg = process.argv[2]; const outDir = process.argv[3] || '/tmp/figma-preview'; fs.mkdirSync(outDir, { recursive: true });
const files = fs.statSync(arg).isDirectory() ? fs.readdirSync(arg, { recursive: true }).filter(f => /\d+x\d+\.json$/.test(f)).map(f => path.join(arg, f)) : [arg];
const FONT = path.resolve(new globalThis.URL('../../assets/fonts', import.meta.url).pathname);
const rgba = c => c ? `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${c.a})` : 'transparent';
const paint = (p, w, h) => {
  if (p.k === 's') return `linear-gradient(${rgba(p.c)},${rgba(p.c)})`;
  const st = p.s.map(s => `${rgba(s.c)} ${(s.p * 100).toFixed(2)}%`).join(',');
  if (p.k === 'lin') { const a = Math.atan2(p.p1[0] - p.p0[0], -(p.p1[1] - p.p0[1])) * 180 / Math.PI; return `linear-gradient(${a}deg,${st})`; }
  return `radial-gradient(${p.rx}px ${p.ry}px at ${p.c[0]}px ${p.c[1]}px,${st})`;
};
function html(n, img) {
  if (n.rt) { const { rt, ...m } = n; const [a, b, c, d, tx, ty] = rt; return `<div style="position:absolute;left:0;top:0;width:0;height:0;transform:translate(${tx}px,${ty}px)"><div style="position:absolute;left:0;top:0;transform-origin:${n.x + n.w / 2}px ${n.y + n.h / 2}px;transform:matrix(${a},${b},${c},${d},0,0)">${html(m, img)}</div></div>`; }
  const pos = `position:absolute;left:${n.x}px;top:${n.y}px;width:${n.w}px;height:${n.h}px;`;
  const op = n.op != null ? `opacity:${n.op};` : '';
  if (n.t === 'f') {
    let s = pos + op;
    if (n.bg) s += `background:${n.bg.slice().reverse().map(p => paint(p, n.w, n.h)).join(',')};`;
    if (n.rad) s += `border-radius:${n.rad.map(r => r + 'px').join(' ')};`;
    if (n.bd) s += n.bd.out ? `outline:${n.bd.w[0]}px solid ${rgba(n.bd.c)};` : `box-shadow:${n.bd.w.map((w, i) => w ? `inset ${[0, -w, 0, w][i]}px ${[w, 0, -w, 0][i]}px 0 0 ${rgba(n.bd.c)}` : null).filter(Boolean).join(',')}${n.sh ? ',' : ';'}`;
    if (n.sh) s += (n.bd && !n.bd.out ? '' : 'box-shadow:') + n.sh.map(x => `${x.t === 'in' ? 'inset ' : ''}${x.x}px ${x.y}px ${x.b}px ${x.s}px ${rgba(x.c)}`).join(',') + ';';
    if (n.clip) s += 'overflow:hidden;';
    const inner = (n.ref && img[n.ref] ? `<img src="data:image/png;base64,${img[n.ref]}" style="position:absolute;inset:0;width:100%;height:100%">` : '') + (n.ch || []).map(c => html(c, img)).join('');
    return `<div title="${(n.n || '').replace(/"/g, '&quot;')}" style="${s}">${inner}</div>`;
  }
  if (n.t === 'x') {
    const segs = n.seg.map(g => `<span style="font-family:${g.f};font-weight:${g.wt};font-style:${g.it ? 'italic' : 'normal'};font-size:${g.sz}px;color:${rgba(g.c)};letter-spacing:${g.ls}px;${g.td === 'u' ? 'text-decoration:underline;' : g.td === 's' ? 'text-decoration:line-through;' : ''}">${g.s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>')}</span>`).join('');
    const wrap = n.fixw ? `width:${n.w}px;` : 'white-space:nowrap;';
    const al = n.al.toLowerCase();
    let left = n.x; if (!n.fixw && n.al === 'CENTER') left = n.x; // largeur auto : on garde le bord gauche mesuré
    return `<div style="position:absolute;left:${left}px;top:${n.y}px;${wrap}font-size:${n.seg[0].sz}px;line-height:${n.lh}px;${n.sh ? `text-shadow:${n.sh.map(x => `${x.x}px ${x.y}px ${x.b}px ${rgba(x.c)}`).join(',')};` : ''}text-align:${al === 'justified' ? 'justify' : al};${n.trunc ? `overflow:hidden;text-overflow:ellipsis;${n.maxl ? `display:-webkit-box;-webkit-line-clamp:${n.maxl};-webkit-box-orient:vertical;` : 'white-space:nowrap;'}` : ''}">${segs}</div>`;
  }
  if (n.t === 'v') return `<div style="${pos}${op}">${n.svg}</div>`;
  if (n.t === 'i') return img[n.ref] ? `<img src="data:image/png;base64,${img[n.ref]}" style="${pos}${op}${n.rad ? `border-radius:${n.rad.map(r => r + 'px').join(' ')};` : ''}">` : `<div style="${pos}background:#f0f"></div>`;
  return '';
}
const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const res = [];
for (const f of files) {
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  const css = [['Fredoka', 600], ['Fredoka', 700], ['Nunito', 500], ['Nunito', 600], ['Nunito', 700], ['Nunito', 800]].map(([f, w]) => `@font-face{font-family:${f};font-weight:${w};src:url(file://${FONT}/${f.toLowerCase()}-latin-${w}-normal.woff2)}`).join('') + `body{margin:0}`;
  const page = `<!doctype html><meta charset=utf-8><style>${css}</style><div style="position:relative;width:${d.w}px;height:${d.h}px;overflow:hidden">${html({ ...d.root, x: 0, y: 0 }, d.img)}</div>`;
  const c = await b.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: 1 }); const p = await c.newPage();
  const tmp = path.join(outDir, 'tmp.html'); fs.writeFileSync(tmp, page); await p.goto('file://' + tmp); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(150);
  const shot = await p.screenshot(); const ref = f.replace(/\.json$/, '.png');
  const name = `${d.id}-${d.w}x${d.h}`; fs.writeFileSync(path.join(outDir, name + '-json.png'), shot);
  if (fs.existsSync(ref)) {
    const r64 = fs.readFileSync(ref).toString('base64'), s64 = shot.toString('base64');
    const diff = await p.evaluate(async ([a, bb, w, h]) => { const ld = s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; });
      const [ia, ib] = await Promise.all([ld(a), ld(bb)]); const cv = document.createElement('canvas'); cv.width = w * 2 + 10; cv.height = h; const x = cv.getContext('2d');
      x.drawImage(ia, 0, 0, w, h); const da = x.getImageData(0, 0, w, h).data; x.drawImage(ib, w + 10, 0, w, h); const db = x.getImageData(w + 10, 0, w, h).data; let bad = 0;
      for (let i = 0; i < da.length; i += 4) if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 60) bad++;
      return { pct: Math.round(bad / (w * h) * 1000) / 10, png: cv.toDataURL('image/png').split(',')[1] }; }, [r64, s64, d.w, d.h]);
    fs.writeFileSync(path.join(outDir, name + '-cote.png'), Buffer.from(diff.png, 'base64')); res.push({ name, pct: diff.pct }); console.log(name, 'écart', diff.pct + ' %');
  }
  await c.close();
}
await b.close(); fs.writeFileSync(path.join(outDir, 'ecarts.json'), JSON.stringify(res, null, 1));
