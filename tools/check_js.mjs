// Vérifie la syntaxe JS (sans rien exécuter) : scripts en ligne des pages HTML, assets/js/*.js, scripts Node des outils.
// Usage (racine du dépôt) : node tools/check_js.mjs     → code de sortie 1 et ligne fautive si une erreur est trouvée.
// Utilisé par la CI (.github/workflows/ci.yml) ; aucune dépendance.
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const fails = [];
let n = 0;

// Script classique : compilé par V8 (vm.Script) sans être exécuté.
function checkClassic(label, code, lineOffset = 0) {
  n++;
  try { new vm.Script(code, { filename: label, lineOffset }); }
  catch (e) {
    const m = /:(\d+)/.exec((e.stack || "").split("\n")[0]);
    fails.push(label + (m ? " (ligne " + m[1] + ")" : "") + " : " + e.message);
  }
}
// Module ES : node --check sur une copie temporaire (vm ne compile pas les modules sans option expérimentale).
const TMP = mkdtempSync(join(tmpdir(), "pc-checkjs-"));
function checkFile(label, path) {
  n++;
  const r = spawnSync(process.execPath, ["--check", path], { encoding: "utf8" });
  if (r.status !== 0) fails.push(label + " : " + (r.stderr || r.stdout).trim().split("\n").slice(0, 5).join(" | "));
}

// 1. pages HTML : chaque <script> en ligne (sans src, hors JSON)
const PAGES = ["index.html", "play/index.html", "admin/index.html", "src/piano-challenges.html", "clavier/index.html", "keyboard/index.html",
  "mentions-legales.html", "confidentialite.html"];
for (const p of PAGES) {
  const abs = join(ROOT, p);
  if (!existsSync(abs)) continue;
  const html = readFileSync(abs, "utf8");
  const re = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi;
  let m, k = 0;
  while ((m = re.exec(html))) {
    const attrs = m[1] || "";
    if (/\ssrc=/i.test(attrs)) continue;
    const type = (/\stype=["']?([^"'\s>]+)/i.exec(attrs) || [])[1] || "";
    if (/json/i.test(type)) { try { JSON.parse(m[2]); } catch (e) { fails.push(p + " (JSON " + (k + 1) + ") : " + e.message); } continue; }
    const line = html.slice(0, m.index + m[0].indexOf(">") + 1).split("\n").length - 1;
    k++;
    if (type === "module") { const f = join(TMP, "m" + n + ".mjs"); writeFileSync(f, m[2]); checkFile(p + " (module " + k + ")", f); }
    else checkClassic(p + " (script " + k + ")", m[2], line);
  }
}
// 2. scripts du site
const JS = join(ROOT, "assets/js");
for (const f of readdirSync(JS).filter(f => f.endsWith(".js")).sort()) checkClassic("assets/js/" + f, readFileSync(join(JS, f), "utf8"));
// 3. scripts Node des outils (tests, construction)
for (const d of ["tools", "tools/audit", "app/scripts"]) {
  const abs = join(ROOT, d);
  if (!existsSync(abs)) continue;
  for (const f of readdirSync(abs).filter(f => f.endsWith(".mjs")).sort()) checkFile(d + "/" + f, join(abs, f));
}
rmSync(TMP, { recursive: true, force: true });
if (fails.length) { console.log("ÉCHEC syntaxe JS (" + fails.length + "/" + n + ") :\n  " + fails.join("\n  ")); process.exit(1); }
console.log("Syntaxe JS OK (" + n + " scripts)");
