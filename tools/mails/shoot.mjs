// PNG of the e-mails rendered by tools/mails/render.ts: 600 px (desktop) and 375 px (mobile) wide, whole height, network blocked.
// Usage: NODE_PATH=node_modules PW_CHROMIUM=/path/to/chrome node tools/mails/shoot.mjs <html dir> <png dir> [dark]
import { chromium } from "playwright";
import { readdirSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
const [dir, out = dir, dark] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
for (const [w, tag] of [[600, "600"], [375, "375"]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, deviceScaleFactor: 1, colorScheme: dark ? "dark" : "light" });
  await ctx.route("**/*", r => r.request().url().startsWith("file:") ? r.continue() : r.abort()); // no image, font or tracker is fetched
  const page = await ctx.newPage();
  for (const f of readdirSync(dir).filter(f => f.endsWith(".html")).sort()) {
    await page.goto("file://" + resolve(join(dir, f)));
    await page.screenshot({ path: join(out, f.replace(/\.html$/, `-${tag}${dark ? "-sombre" : ""}.png`)), fullPage: true });
  }
  await ctx.close();
}
await browser.close();
