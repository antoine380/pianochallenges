// Assemble le code Figma à partir de figma_core.js :
//   node tools/figma/make_figma.mjs plugin            → tools/figma/plugin/code.js (greffon à importer dans Figma)
//   node tools/figma/make_figma.mjs mcp '<JOB JSON>'  → code d'un appel use_figma sur la sortie standard
//   node tools/figma/make_figma.mjs update '<JOB JSON>' → idem, mise à jour d'une page existante (mcp_update_glue.js)
import fs from 'fs';
const R = f => fs.readFileSync(new globalThis.URL('./' + f, import.meta.url), 'utf8');
const strip = s => s.replace(/^\s*\/\/.*$/gm, '').replace(/\n{2,}/g, '\n');
const mode = process.argv[2];
if (mode === 'plugin') { fs.writeFileSync(new globalThis.URL('./plugin/code.js', import.meta.url), '// Généré par tools/figma/make_figma.mjs — ne pas éditer.\n' + R('figma_core.js') + '\n' + R('plugin_glue.js')); console.log('plugin/code.js écrit'); }
else if (mode === 'mcp') process.stdout.write(`const JOB = ${process.argv[3]};\n` + strip(R('figma_core.js').split('// Retire d')[0]) + '\n' + strip(R('mcp_glue.js')));
else if (mode === 'update') process.stdout.write(`const JOB = ${process.argv[3]};\n` + strip(R('figma_core.js').split('// Retire d')[0]) + '\n' + strip(R('mcp_update_glue.js')));
else console.log('usage : make_figma.mjs plugin | mcp <JOB> | update <JOB>');
