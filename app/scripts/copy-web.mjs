// Copies the website (repo root) into app/www so the app runs offline.
import { cpSync, rmSync, mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const app = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = join(app, "..");
const www = join(app, "www");
rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });
// The back office (admin/) is never copied: it is a website-only page (list below = what the app ships).
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
// capacitor.config.json turns off the web view's own scrolling (no rubber band on the whole app): every screen scrolls inside
// its own containers. The legal pages are plain documents, so in the app their body becomes the scroller.
for (const f of ["mentions-legales.html", "confidentialite.html"]) {
  const page = join(www, f);
  if (!existsSync(page)) continue;
  const html = readFileSync(page, "utf8");
  writeFileSync(page, html.replace("</style>", "html{height:100%;overflow:hidden}body{height:100%;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;box-sizing:border-box}\n</style>"));
}
if (existsSync(join(www, "admin"))) throw new Error("admin/ must not ship in the app");
console.log("Web files copied to", www);
