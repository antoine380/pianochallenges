// Copies the website (repo root) into app/www so the app runs offline.
import { cpSync, rmSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const app = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = join(app, "..");
const www = join(app, "www");
rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });
for (const f of ["index.html", "assets", "favicon.svg", "favicon-32.png", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "manifest.webmanifest"]) {
  const src = join(site, f);
  if (existsSync(src)) cpSync(src, join(www, f), { recursive: true });
}
console.log("Web files copied to", www);
