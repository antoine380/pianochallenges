// Vérifications statiques (ESLint, règles dans eslint.config.mjs) : l'app (source src/app/ assemblée), les <script> en ligne
// de play/, admin/, clavier/, keyboard/, et assets/js/*.js. Une erreur est située dans son fichier d'origine (src/app/js/NNN-….js:ligne).
// Usage (racine du dépôt) : node tools/lint.mjs [--warnings]   → code de sortie 1 s'il y a au moins une erreur ;
//   les avertissements (variables inutilisées, affectation dans un if) sont comptés, et listés avec --warnings.
// Prérequis : npm ci --prefix tools/audit (eslint, globals). Utilisé par la CI (.github/workflows/ci.yml, job « Construction à jour »).
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { readSource, where } from "./source.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const req = createRequire(join(ROOT, "tools/audit/package.json"));
let ESLint;
try { ({ ESLint } = await import(pathToFileURL(req.resolve("eslint")).href)); }
catch (e) { console.log("ESLint introuvable : lance « npm ci --prefix tools/audit » (ou npm install dans tools/audit)."); process.exit(2); }
const SHOW_WARN = process.argv.includes("--warnings");
const eslint = new ESLint({ cwd: ROOT, overrideConfigFile: join(ROOT, "eslint.config.mjs") });

// <script> en ligne d'une page (sans src, hors JSON/module) : [{code, line}] avec line = ligne de la balise ouvrante
function inlineScripts(html) {
  const out = [], re = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi; let m;
  while ((m = re.exec(html))) {
    const attrs = m[1] || "";
    if (/\ssrc=/i.test(attrs) || /\stype=["']?[^"'\s>]*(json|module)/i.test(attrs)) continue;
    out.push({ code: m[2], line: html.slice(0, m.index + m[0].indexOf(">") + 1).split("\n").length - 1 });
  }
  return out;
}
const results = []; // {loc, sev, msg, rule}
async function lint(code, virtualPath, locate) {
  const [r] = await eslint.lintText(code, { filePath: join(ROOT, virtualPath) });
  if (!r) return;
  for (const m of r.messages) results.push({ loc: locate(m.line || 0) + (m.column ? ":" + m.column : ""), sev: m.severity === 2 || m.fatal ? "erreur" : "avert.", msg: m.message, rule: m.ruleId || "syntaxe" });
}
// les scripts extraits gardent leurs numéros de ligne (lignes vides devant)
const pad = s => "\n".repeat(s.line) + s.code;

// 1. l'app : source assemblée depuis src/app/ (une ligne de la page → son fragment)
for (const s of inlineScripts(readSource())) await lint(pad(s), "src/app/__page__.js", where);
// 2. pages autonomes
for (const p of ["play/index.html", "admin/index.html", "clavier/index.html", "keyboard/index.html"]) {
  const abs = join(ROOT, p); if (!existsSync(abs)) continue;
  for (const s of inlineScripts(readFileSync(abs, "utf8"))) await lint(pad(s), dirname(p) + "/__page__.js", l => p + ":" + l);
}
// 3. scripts du site (sauf la copie du SDK Supabase)
for (const f of readdirSync(join(ROOT, "assets/js")).filter(f => f.endsWith(".js") && !/^supabase-/.test(f)).sort())
  await lint(readFileSync(join(ROOT, "assets/js", f), "utf8"), "assets/js/" + f, l => "assets/js/" + f + ":" + l);

const errs = results.filter(r => r.sev === "erreur"), warns = results.filter(r => r.sev !== "erreur");
const show = r => console.log(`  ${r.loc}  ${r.sev}  ${r.msg} (${r.rule})`);
if (errs.length) { console.log(`ESLint : ${errs.length} erreur(s)`); errs.forEach(show); }
if (warns.length) {
  if (SHOW_WARN) { console.log(`ESLint : ${warns.length} avertissement(s)`); warns.forEach(show); }
  else {
    const by = {}; for (const w of warns) { const f = w.loc.replace(/:\d+(:\d+)?$/, ""); by[f] = (by[f] || 0) + 1; }
    console.log(`ESLint : ${warns.length} avertissement(s) (non bloquants ; détail : node tools/lint.mjs --warnings) : ` +
      Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([f, n]) => f.replace(/^src\/app\/js\//, "") + " " + n).join(", ") + (Object.keys(by).length > 8 ? ", …" : ""));
  }
}
if (errs.length) process.exit(1);
console.log("ESLint OK : aucune erreur");
