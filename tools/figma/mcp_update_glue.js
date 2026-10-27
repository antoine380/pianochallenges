// Appel use_figma de mise à jour (généré par make_figma.mjs update '<JOB>') : relit le PNG de données posé sur le rectangle JOB.data,
// reconstruit les écrans du paquet dans la section JOB.section : écrans existants (JOB.replace { 'id@WxH': nodeId }) vidés et refaits dans
// leur cadre, nouveaux écrans ajoutés à leur ligne (libellé compris) ; puis retire le rectangle de données et agrandit la section (JOB.h).
// Ne retire jamais rien d'autre. JOB = { data, section, y0, rowH, replace, labeled: [ids déjà libellés], shots: ['id@1024x768', …], h }
const page = await figma.getNodeByIdAsync('0:1'); await figma.setCurrentPageAsync(page);
const holder = await figma.getNodeByIdAsync(JOB.data), section = await figma.getNodeByIdAsync(JOB.section);
const U = pcUnpack(pcFromDataPng(await figma.getImageByHash(holder.fills[0].imageHash).getBytesAsync()));
await pcLoadFonts([U.PK]);
const st = await pcBuildPack(U, { section, rows: U.PK.rows, dx: 0, y0: JOB.y0, rowH: JOB.rowH, labeled: new Set(JOB.labeled || []), shots: JOB.shots, replace: JOB.replace });
holder.remove(); if (JOB.h && section.height < JOB.h) section.resizeWithoutConstraints(section.width, JOB.h);
return { sec: U.PK.secName, part: U.PK.part, err: st.err, made: st.made, svgFail: st.svgFail, bravura: st.bravura, fail: st.fail, screens: st.screens, shots: st.shots };
