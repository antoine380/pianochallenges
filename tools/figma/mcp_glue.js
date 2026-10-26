// Appel use_figma (généré par make_figma.mjs = « const JOB = … » + figma_core.js + ce fichier) : relit le PNG de données posé sur le
// rectangle JOB.data, construit les écrans du paquet dans la section JOB.section (décalés de JOB.dx tant que les anciennes captures sont là)
// et renvoie les nodeId créés. JOB = { data, section, dx, y0, rowH, labeled: [ids déjà libellés], shots: ['id@1024x768', …] }
const page = await figma.getNodeByIdAsync('0:1'); await figma.setCurrentPageAsync(page);
const holder = await figma.getNodeByIdAsync(JOB.data), section = await figma.getNodeByIdAsync(JOB.section);
const U = pcUnpack(pcFromDataPng(await figma.getImageByHash(holder.fills[0].imageHash).getBytesAsync()));
await pcLoadFonts([U.PK]);
const st = await pcBuildPack(U, { section, rows: U.PK.rows, dx: JOB.dx, y0: JOB.y0, rowH: JOB.rowH, labeled: new Set(JOB.labeled || []), shots: JOB.shots });
return { sec: U.PK.secName, part: U.PK.part, err: st.err, made: st.made, svgFail: st.svgFail, fail: st.fail, screens: st.screens, shots: st.shots };
