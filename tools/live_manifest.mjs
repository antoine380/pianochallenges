// Publishes the web version the installed iOS app downloads by itself (see app/README.md, « Mise à jour à distance »).
// Called by tools/build.py after index.html and version.txt. Writes:
//   live/manifest.json  { version, native_min, files:[{ path, sha256, size, src? }] } = exactly what copy-web.mjs puts in app/www
//   live/files/<path>   the app copies that differ from the site file (index.html and play/index.html without zoom,
//                       legal pages that scroll); every other file is downloaded from its normal address on the site.
import { rmSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { appFiles, manifest } from "../app/scripts/web-files.mjs";
const site = join(dirname(fileURLToPath(import.meta.url)), "..");
const live = join(site, "live");
const files = appFiles(site);
rmSync(live, { recursive: true, force: true });
for (const f of files.filter(f => f.changed)) {
  const dest = join(live, "files", ...f.rel.split("/"));
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, f.data);
}
const man = manifest(site, files);
mkdirSync(live, { recursive: true });
writeFileSync(join(live, "manifest.json"), JSON.stringify(man, null, 1) + "\n");
console.log("live/manifest.json", man.version, "·", man.files.length, "files ·", files.filter(f => f.changed).length, "app copies");
