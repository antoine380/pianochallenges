// What the iOS app ships from the website, and how each file is adapted for the app.
// Shared by copy-web.mjs (app/www, the version built into the app) and tools/live_manifest.mjs
// (live/manifest.json on pianochallenges.com, the version the installed app downloads by itself).
// Both must give exactly the same bytes, so both go through appFiles() below.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

// Version of the native code (Swift) the web needs. Raise it (and NATIVE_VERSION in
// app/ios/App/App/LiveUpdatePlugin.swift) when a web change needs a new native build:
// installed apps with an older native code then stop taking web updates until the new build is installed.
export const NATIVE_MIN = 1;

// The back office (admin/) is never copied: it is a website-only page (list below = what the app ships).
export const WEB_FILES = ["index.html", "assets", "play", "favicon.svg", "favicon-32.png", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "manifest.webmanifest",
  // legal pages, linked from Settings, the consent line, the sign-in screen and the paywall (App Store: the privacy policy must open in the app).
  // They only need /assets/fonts and /favicon.svg, copied above.
  "mentions-legales.html", "confidentialite.html"];

// In the app the pages must not zoom (pinch or double tap): WKWebView honours these viewport limits.
// The website keeps zoom (accessibility): only the app copies are rewritten.
const APP_VIEWPORT = '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover,interactive-widget=resizes-content">';
// capacitor.config.json turns off the web view's own scrolling (no rubber band on the whole app): every screen scrolls inside
// its own containers. The legal pages are plain documents, so in the app their body becomes the scroller.
const LEGAL_CSS = "html{height:100%;overflow:hidden}body{height:100%;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;box-sizing:border-box}\n</style>";

/** The app copy of one file (path with "/" separators, relative to the site root). */
export function appTransform(rel, buf) {
  if (rel === "index.html" || rel === "play/index.html") {
    const html = buf.toString("utf8");
    if (!/<meta name="viewport"[^>]*>/.test(html)) throw new Error("viewport meta not found in " + rel);
    return Buffer.from(html.replace(/<meta name="viewport"[^>]*>/, APP_VIEWPORT), "utf8");
  }
  if (rel === "mentions-legales.html" || rel === "confidentialite.html") {
    return Buffer.from(buf.toString("utf8").replace("</style>", LEGAL_CSS), "utf8");
  }
  return buf;
}

// Hidden files (.DS_Store on a Mac…) are never shipped; names stay simple so the app can check every path.
const SAFE = /^[A-Za-z0-9_][A-Za-z0-9._-]*$/;

/** Every shipped file: [{ rel, abs, data (app copy), changed (app copy differs from the site file) }], sorted by path. */
export function appFiles(site) {
  const out = [];
  const add = (rel, abs) => {
    const st = statSync(abs);
    if (st.isDirectory()) {
      for (const n of readdirSync(abs).sort()) { if (n.startsWith(".")) continue; add(rel + "/" + n, join(abs, n)); }
      return;
    }
    if (!st.isFile()) return;
    if (!rel.split("/").every(p => SAFE.test(p))) throw new Error("file name not allowed in the app: " + rel);
    const raw = readFileSync(abs), data = appTransform(rel, raw);
    out.push({ rel, abs, data, changed: !data.equals(raw) });
  };
  for (const f of WEB_FILES) { const abs = join(site, f); if (existsSync(abs)) add(f, abs); }
  if (out.some(f => f.rel.startsWith("admin/"))) throw new Error("admin/ must not ship in the app");
  return out.sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));
}

export const sha256 = buf => createHash("sha256").update(buf).digest("hex");

/** Web version = the build stamp written by tools/build.py (version.txt), "dev" without a build. */
export function webVersion(site) {
  const p = join(site, "version.txt");
  return existsSync(p) ? readFileSync(p, "utf8").trim() || "dev" : "dev";
}

/** The manifest of the shipped files. `src` (optional) = where the app downloads it on the site, when the app copy differs. */
export function manifest(site, files = appFiles(site)) {
  return {
    version: webVersion(site),
    native_min: NATIVE_MIN,
    files: files.map(f => Object.assign({ path: f.rel, sha256: sha256(f.data), size: f.data.length }, f.changed ? { src: "live/files/" + f.rel } : {})),
  };
}
