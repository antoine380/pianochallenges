// Assemble la source de l'app à partir de src/app/ (ordre : src/app/order.txt), comme tools/build.py.
// La page complète n'existe plus dans le dépôt : les tests et outils Node qui lisent « la source » passent par ici.
//   import { readSource, sourceMap, where } from "../source.mjs";
//   readSource()        → texte de la page complète (= build/piano-challenges.html, sans aucune transformation)
//   sourceMap()         → [{file, start, lines}] : 1re ligne (1-based) de chaque fragment dans la page assemblée
//   where(line)         → "src/app/js/160-moteur-exercice.js:42" pour une ligne de la page assemblée
// Les .js commencent par une ligne « // fragment … voir src/app/README.md » qui n'est pas recopiée dans la page.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const APP = join(ROOT, "src/app");
const HDR = /^\/\/ fragment [^\n]*voir src\/app\/README\.md\n/;

export function orderList() {
  return readFileSync(join(APP, "order.txt"), "utf8").split("\n").map(s => s.trim()).filter(s => s && !s.startsWith("#"));
}
export function fragment(rel) {
  let s = readFileSync(join(APP, rel), "utf8");
  if (rel.endsWith(".js")) {
    if (!HDR.test(s)) throw new Error("src/app/" + rel + " : 1re ligne « // fragment … voir src/app/README.md » manquante");
    s = s.replace(HDR, "");
  }
  return s;
}
let cache = null;
function build() {
  if (cache) return cache;
  const parts = [], map = [];
  let line = 1;
  for (const rel of orderList()) {
    const s = fragment(rel);
    if (s && !s.endsWith("\n")) throw new Error("src/app/" + rel + " doit finir par un retour à la ligne");
    const n = (s.match(/\n/g) || []).length;
    map.push({ file: "src/app/" + rel, start: line, lines: n });
    parts.push(s); line += n;
  }
  return (cache = { text: parts.join(""), map });
}
export const readSource = () => build().text;
export const sourceMap = () => build().map;
export function where(line) {
  const m = sourceMap().find(f => line >= f.start && line < f.start + f.lines);
  if (!m) return "page assemblée:" + line;
  return m.file + ":" + (line - m.start + 1 + (m.file.endsWith(".js") ? 1 : 0)); // +1 : la ligne d'en-tête du fragment
}
