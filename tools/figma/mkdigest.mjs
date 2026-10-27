// Code d'un appel use_figma de digest.js : node tools/figma/mkdigest.mjs <ids séparés par des virgules> [full | lines | '{"id":[n° de ligne]}']
import fs from 'fs';
const ids = process.argv[2].split(',').filter(Boolean), m = process.argv[3] || '', full = m === 'full', lines = m === 'lines', pick = m.startsWith('{') ? JSON.parse(m) : undefined;
process.stdout.write('const JOB = ' + JSON.stringify({ ids, full, lines, pick }) + ';\n' + fs.readFileSync(new globalThis.URL('./digest.js', import.meta.url), 'utf8').replace(/^\/\/.*\n/gm, ''));
