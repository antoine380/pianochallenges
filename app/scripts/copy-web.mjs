// Copies the website (repo root) into app/www so the app runs offline.
import { cpSync, rmSync, mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const app = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = join(app, "..");
const www = join(app, "www");
rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });
for (const f of ["index.html", "assets", "play", "favicon.svg", "favicon-32.png", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "manifest.webmanifest",
  // legal pages, linked from Settings, the consent line, the sign-in screen and the paywall (App Store: the privacy policy must open in the app).
  // They only need /assets/fonts and /favicon.svg, copied above.
  "mentions-legales.html", "confidentialite.html"]) {
  const src = join(site, f);
  if (existsSync(src)) cpSync(src, join(www, f), { recursive: true });
}
// In the app the pages must not zoom (pinch or double tap): WKWebView honours these viewport limits.
// The website keeps zoom (accessibility): only the copies in app/www are rewritten.
const APP_VIEWPORT = '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover,interactive-widget=resizes-content">';
for (const f of ["index.html", join("play", "index.html")]) {
  const page = join(www, f);
  if (!existsSync(page)) continue;
  const html = readFileSync(page, "utf8");
  if (!/<meta name="viewport"[^>]*>/.test(html)) throw new Error("viewport meta not found in " + f);
  writeFileSync(page, html.replace(/<meta name="viewport"[^>]*>/, APP_VIEWPORT));
}
console.log("Web files copied to", www);
