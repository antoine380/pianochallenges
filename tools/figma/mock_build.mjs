// Essai hors ligne du code Figma avec une fausse API « figma » (aucun appel à Figma) : décodage des données, création des calques,
// nettoyage et mise en page des sections. Deux modes :
//   node tools/figma/mock_build.mjs mcp <secNN-k.png>          (code d'un appel use_figma)
//   node tools/figma/mock_build.mjs plugin <dossier _figma>    (greffon : toutes les sections .bin)
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
const [mode, arg] = process.argv.slice(2);
let nid = 0; const counts = {}; const fontsLoaded = new Set();
function node(type, props = {}) { counts[type] = (counts[type] || 0) + 1; const n = { id: '9:' + (++nid), type, name: '', children: [], x: 0, y: 0, width: 100, height: 100, fills: [], removed: false, ...props,
  appendChild(c) { if (c.parent) c.parent.children = c.parent.children.filter(k => k !== c); this.children.push(c); c.parent = this; }, resize(w, h) { if (!(w > 0) || !(h > 0)) throw new Error('resize ' + w + 'x' + h + ' ' + this.name); this.width = w; this.height = h; },
  resizeWithoutConstraints(w, h) { this.resize(w, h); }, remove() { this.removed = true; if (this.parent) this.parent.children = this.parent.children.filter(k => k !== this); },
  findAll(f) { const o = []; const w = n => n.children.forEach(c => { if (f(c)) o.push(c); w(c); }); w(this); return o; }, async screenshot() { return 'png'; } };
  if (type === 'TEXT') Object.defineProperties(n, Object.getOwnPropertyDescriptors({ _fn: props._fn || null, set fontName(f) { if (!fontsLoaded.has(f.family + '|' + f.style)) throw new Error('police non chargée ' + f.family + ' ' + f.style); this._fn = f; }, get fontName() { return this._fn; },
    set characters(s) { if (!this._fn || !fontsLoaded.has(this._fn.family + '|' + this._fn.style)) throw new Error('police non chargée (characters)'); this._c = s; this.width = s.length * 7; }, get characters() { return this._c; },
    set textAutoResize(v) { if (v !== 'NONE' && v !== 'HEIGHT' && v !== 'WIDTH_AND_HEIGHT' && v !== 'TRUNCATE') throw new Error('autoresize'); }, get textAutoResize() { return 'NONE'; },
    setRangeFontName(a, b, f) { if (!fontsLoaded.has(f.family + '|' + f.style)) throw new Error('police non chargée ' + f.style); if (b > this._c.length) throw new Error('plage'); }, setRangeFontSize() {}, setRangeFills() {}, setRangeLetterSpacing() {}, setRangeTextDecoration() {} }));
  return n; }
const page = node('PAGE', { name: 'Revue des écrans' });
const readme = node('FRAME', { name: 'Lisez-moi', height: 420 }); page.appendChild(readme); readme.appendChild(node('TEXT', { _fn: { family: 'Nunito', style: 'Bold' } })); readme.appendChild(node('TEXT', { _fn: { family: 'Nunito', style: 'Regular' } }));
const NAMES = ['1 Premier lancement et connexion', '2 Accueil', '3 LEARN', '4 Premiers pas', '5 GAMES', '6 QUIZ', '7 PLAY', '8 Progression', '9 Classement, ligues et notifications', '10 Réglages', '11 Fenêtres', '12 Back office /admin', '13 E-mails'];
for (const nm of NAMES) { const s = node('SECTION', { name: nm }); page.appendChild(s); s.appendChild(node('TEXT', { name: 'titre', _fn: { family: 'Fredoka', style: 'Bold' } })); s.appendChild(node('TEXT', { name: 'desc', _fn: { family: 'Nunito', style: 'Regular' }, width: 6000 }));
  for (let i = 0; i < 5; i++) s.appendChild(node('FRAME', { name: 'ancienne capture', fills: [{ type: 'IMAGE' }] })); }
let bytes = null; const holder = node('RECTANGLE', { fills: [{ type: 'IMAGE', imageHash: 'h' }] });
const msgs = [];
globalThis.figma = { root: { children: [page] }, fileKey: 'TEST', mixed: Symbol('mixed'),
  getNodeByIdAsync: async id => id === '0:1' ? page : id === 'DATA' ? holder : page.children.find(c => c.id === id) || page.children[1],
  setCurrentPageAsync: async () => {}, getImageByHash: () => ({ getBytesAsync: async () => bytes }), saveVersionHistoryAsync: async () => ({ id: 'v' }),
  loadFontAsync: async f => { fontsLoaded.add(f.family + '|' + f.style); }, createImage: b => { if (!(b instanceof Uint8Array) || b[1] !== 0x50) throw new Error('image invalide'); return { hash: 'img' + b.length }; },
  createFrame: () => node('FRAME'), createText: () => node('TEXT'), createRectangle: () => node('RECTANGLE'),
  createNodeFromSvg: s => { if (!/^<svg/.test(s)) throw new Error('svg'); return node('SVGFRAME'); },
  showUI() {}, ui: { postMessage: m => { msgs.push(m); if (m.type !== 'prog') console.log('  ui:', m.type, m.text || ''); } } };
const AsyncFn = Object.getPrototypeOf(async function () {}).constructor;
const t0 = Date.now();
if (mode === 'mcp') {
  bytes = new Uint8Array(fs.readFileSync(arg));
  const code = execFileSync('node', [new globalThis.URL('./make_figma.mjs', import.meta.url).pathname, 'mcp', JSON.stringify({ data: 'DATA', section: page.children[1].id, dx: 8000, y0: 380, rowH: 984, shots: [] })], { encoding: 'utf8' });
  const r = await new AsyncFn(code)();
  console.log(JSON.stringify({ ms: Date.now() - t0, len: code.length, err: r.err, sec: r.sec, made: r.made, svgFail: r.svgFail, fail: r.fail, screens: Object.keys(r.screens).filter(k => k.includes('@')).length, counts }));
} else {
  const code = fs.readFileSync(new globalThis.URL('./plugin/code.js', import.meta.url), 'utf8');
  new Function('__html__', code)('');
  const files = fs.readdirSync(arg).filter(f => f.endsWith('.bin')).map(f => ({ name: f, bytes: new Uint8Array(fs.readFileSync(path.join(arg, f))) }));
  await figma.ui.onmessage({ type: 'run', files, opts: { version: true, clear: true } });
  const done = msgs.find(m => m.type === 'done'); const err = msgs.find(m => m.type === 'err');
  console.log(JSON.stringify({ ms: Date.now() - t0, err: err && err.text, screens: done && Object.keys(done.index.screens).length, order: done && done.order.map(o => o[0]), counts }));
  const s1 = page.children.find(c => c.name === NAMES[0]); console.log('section 1 :', s1.children.length, 'enfants ; anciennes captures restantes :', s1.children.filter(c => c.name === 'ancienne capture').length);
}
