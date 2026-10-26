// Appel use_figma (lecture seule) : relit l'index { « <id> · iPad paysage 1024×768 » → nodeId } de la page « Revue des écrans »,
// à recopier dans /home/claude/figma-baseline/index.json (champ node) avec : node tools/figma/write_index.mjs <réponse.json>
const page = await figma.getNodeByIdAsync('0:1'); await figma.setCurrentPageAsync(page);
const out = { sections: {}, screens: {} };
for (const s of page.children.filter(c => c.type === 'SECTION')) { out.sections[s.name] = s.id;
  for (const c of s.children) { const m = /^(.+) · (iPad paysage|iPhone) (\d+)×(\d+)$/.exec(c.name); if (c.type === 'FRAME' && m) out.screens[`${m[1]}@${m[3]}x${m[4]}`] = c.id; } }
return out;
