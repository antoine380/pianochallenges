// Copies the website (repo root) into app/www so the app runs offline.
import { cpSync, rmSync, mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
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
// In the app the page must not zoom (pinch or double tap): WKWebView honours these viewport limits.
const page = join(www, "index.html");
let html = readFileSync(page, "utf8");
html = html.replace(/<meta name="viewport"[^>]*>/, '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">');
writeFileSync(page, html);
console.log("Web files copied to", www);
