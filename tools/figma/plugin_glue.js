// Greffon « Piano Challenges · Revue modifiable » (code.js généré par make_figma.mjs = figma_core.js + ce fichier).
// L'interface envoie les fichiers secNN-k.bin (ou .png) de figma-baseline/_figma ; le greffon reconstruit chaque section de la page
// « Revue des écrans » en calques modifiables, retire les anciennes captures, réempile les sections et renvoie l'index écran → nodeId.
figma.showUI(__html__, { width: 440, height: 560 });
const post = m => figma.ui.postMessage(m);
const tick = () => new Promise(r => setTimeout(r, 0));
figma.ui.onmessage = async msg => {
  if (msg.type !== 'run') return;
  try { await run(msg.files, msg.opts || {}); } catch (e) { post({ type: 'err', text: String(e && e.message || e) }); }
};
async function run(files, opts) {
  const page = figma.root.children.find(p => p.name === 'Revue des écrans'); if (!page) throw new Error('Page « Revue des écrans » introuvable');
  await figma.setCurrentPageAsync(page);
  if (opts.version) { try { await figma.saveVersionHistoryAsync('Avant la revue modifiable', 'Captures images remplacées par des calques modifiables (greffon)'); post({ type: 'log', text: 'Version enregistrée dans l’historique.' }); } catch (e) { post({ type: 'log', text: 'Historique : ' + e.message }); } }
  const units = files.map(f => { let b = new Uint8Array(f.bytes); if (b[0] === 0x89 && b[1] === 0x50) b = pcFromDataPng(b); const u = pcUnpack(b); u.file = f.name; return u; });
  units.sort((a, b) => a.PK.sec - b.PK.sec || a.PK.part - b.PK.part);
  post({ type: 'log', text: `${units.length} paquet(s), ${units.reduce((a, u) => a + u.PK.screens.length, 0)} écrans. Chargement des polices…` });
  await pcLoadFonts(units.map(u => u.PK));
  const index = { file: figma.fileKey || null, page: page.id, at: new Date().toISOString(), sections: {}, screens: {} };
  const Y0 = 380, ROWH = 984; const bySec = {};
  units.forEach(u => (bySec[u.PK.sec] = bySec[u.PK.sec] || []).push(u));
  for (const sec of Object.keys(bySec).map(Number).sort((a, b) => a - b)) {
    const us = bySec[sec], name = us[0].PK.secName, rows = us[0].PK.rows;
    const section = page.children.find(c => c.type === 'SECTION' && (c.name === name || parseInt(c.name) === sec));
    if (!section) { post({ type: 'log', text: 'Section introuvable : ' + name }); continue; }
    const removed = opts.clear !== false ? pcClearSection(section) : 0;
    post({ type: 'log', text: `${name} : ${removed} anciens calques retirés, ${rows.length} écrans à construire…` });
    const labeled = new Set(); let made = 0, svgFail = 0, fail = 0;
    for (const u of us) {
      const st = await pcBuildPack(u, { section, rows, dx: 0, y0: Y0, rowH: ROWH, labeled, onScreen: (s) => post({ type: 'prog', text: `${name} · ${s.id} ${s.w}×${s.h}` }) });
      made += st.made; svgFail += st.svgFail; fail += st.fail;
      for (const [k, v] of Object.entries(st.screens)) if (k.includes('@')) index.screens[k] = { node: v, sec: name, section: section.id };
      await tick();
    }
    await pcLayoutSection(section, rows.length, ROWH, Y0);
    index.sections[name] = section.id;
    post({ type: 'log', text: `${name} : ${made} calques, ${svgFail} SVG passés en image, ${fail} calques en erreur.` });
    await tick();
  }
  const readme = page.children.find(c => c.name === 'Lisez-moi');
  const order = pcStackSections(page, readme ? readme.y + readme.height + 140 : 560);
  if (readme && opts.readme) { const t = readme.findAll(n => n.type === 'TEXT')[1]; if (t && t.fontName !== figma.mixed) { await figma.loadFontAsync(t.fontName); t.characters = opts.readme; } }
  post({ type: 'done', index, order });
}
