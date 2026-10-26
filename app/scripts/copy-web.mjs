// Copies the website (repo root) into app/www so the app runs offline.
// The list of files and the app adaptations (no zoom, scrolling legal pages) live in web-files.mjs,
// shared with tools/live_manifest.mjs (remote updates): both give exactly the same bytes.
// www/live/manifest.json = the embedded version, read by LiveUpdatePlugin.swift (version, and files it can reuse).
import { rmSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { appFiles, manifest } from "./web-files.mjs";
const app = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = join(app, "..");
const www = join(app, "www");
rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });
const files = appFiles(site);
for (const f of files) {
  const dest = join(www, ...f.rel.split("/"));
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, f.data);
}
const man = manifest(site, files);
mkdirSync(join(www, "live"), { recursive: true });
writeFileSync(join(www, "live", "manifest.json"), JSON.stringify(man));
console.log("Web files copied to", www, "· version", man.version, "·", files.length, "files");
