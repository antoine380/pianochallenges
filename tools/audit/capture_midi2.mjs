// Captures de l'assistant « Brancher mon clavier » (MIDI lots 2-3) : M3, M4 à M12, Réglages « Mon clavier ».
// Usage : PORT=8785 NODE_PATH=… PW_CHROMIUM=… OUT=/home/claude/captures-midi2 node tools/audit/capture_midi2.mjs [écran…]
import fs from 'fs';
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = process.env.PORT || '8767', URL = `http://localhost:${PORT}/`, OUT = process.env.OUT || '/tmp/captures-midi2';
fs.mkdirSync(OUT, { recursive: true });
const LIB = fs.readFileSync(new globalThis.URL('./lib.mjs', import.meta.url), 'utf8');
const INIT = mode => /export const INIT = `([\s\S]*?)`;\n/.exec(LIB)[1].split("${'${MODE}'}").join(mode);
const SIZES = [[375, 667], [812, 375], [768, 1024], [1024, 768], [1280, 800]];
const only = process.argv.slice(2);
const seed = (input, extra) => `(()=>{ try{ if(sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded','1');
  localStorage.setItem('memo-gammes-v1', JSON.stringify(Object.assign({settings:{lang:'fr',notation:'fr',input:'${input}',uiSound:false,midiSound:true},
    langV2:true,gate:'guest',onb:{done:1},tourDone:1,pwShown:1,introSeen:Object.fromEntries(['hub','learn','games','free','play','quiz','settings','progress'].map(k=>[k,1])),xp:500}, ${JSON.stringify(extra || {})}))); }catch(e){} })();`;
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
const W = (p, ms) => p.waitForTimeout(ms);
const wiz = p => p.evaluate(() => document.querySelector('#mkCard [data-a=wiz]').click());
const A = (p, a) => p.evaluate(a => { const e = document.querySelector('#mwiz [data-a="' + a + '"]'); if (e) e.click(); return !!e; }, a);
// each screen: how to get there
const SHOTS = {
  M4: { empty: true, go: async p => { await p.evaluate(() => document.getElementById('hsMidiBtn').click()); } },
  M5: { empty: true, go: async p => { await p.evaluate(() => document.getElementById('hsMidiBtn').click()); await W(p, 200); await A(p, 'hw:midi'); await W(p, 100); await A(p, 'conn:usb'); } },
  M5ios: { empty: true, ios: true, go: async p => { await p.evaluate(() => document.getElementById('hsMidiBtn').click()); await W(p, 200); await A(p, 'hw:digital'); await W(p, 100); await A(p, 'conn:usb'); await W(p, 100); await A(p, 'port:usbc'); } },
  M6: { empty: true, ios: true, go: async p => { await p.evaluate(() => document.getElementById('hsMidiBtn').click()); await W(p, 200); await A(p, 'hw:midi'); await A(p, 'conn:usb'); await A(p, 'port:usbc'); await A(p, 'next'); } },
  M6pc: { empty: true, go: async p => { await p.evaluate(() => document.getElementById('hsMidiBtn').click()); await W(p, 200); await A(p, 'hw:midi'); await A(p, 'conn:usb'); await A(p, 'next'); } },
  M7: { empty: true, ios: true, go: async p => { await p.evaluate(() => document.getElementById('hsMidiBtn').click()); await W(p, 200); await A(p, 'hw:digital'); await A(p, 'conn:bt'); await A(p, 'next'); } },
  M8: { go: async p => { await wiz(p); await W(p, 300); await A(p, 'totest'); await W(p, 200); await p.evaluate(() => { window.__midi.noteOn(64, 30); window.__midi.noteOn(67, 112); }); await W(p, 150); await A(p, 'tw:no'); } },
  M9: { go: async p => { await wiz(p); await W(p, 300); await A(p, 'totest'); await W(p, 200); await p.evaluate(() => window.__midi.noteOn(60, 90)); await W(p, 100); await A(p, 'range'); await W(p, 150); await A(p, 'rmeasure'); await p.evaluate(() => { window.__midi.noteOn(36); window.__midi.noteOn(84); }); } },
  M10: { go: async p => { await wiz(p); await W(p, 300); await A(p, 'totest'); await W(p, 200); await p.evaluate(() => { window.__midi.noteOn(60, 20); window.__midi.noteOn(64, 110); window.__midi.send(0, [0xB0, 64, 127]); }); await W(p, 100); await A(p, 'tw:yes'); await A(p, 'range'); await W(p, 150); await A(p, 'rmeasure'); await p.evaluate(() => { window.__midi.noteOn(36); window.__midi.noteOn(84); }); await W(p, 100); await A(p, 'rok'); } },
  M11: { empty: true, ios: true, go: async p => { await p.evaluate(() => document.getElementById('hsMidiBtn').click()); await W(p, 200); await A(p, 'hw:midi'); await A(p, 'conn:usb'); await A(p, 'port:light'); await A(p, 'next'); await W(p, 100); await A(p, 'trouble'); await W(p, 100); await A(p, 'fix:2'); } },
  M12: { mode: 'none', go: async p => { await p.evaluate(() => document.getElementById('hsMidiBtn').click()); } },
  lat: { go: async p => { await p.evaluate(() => document.querySelector('#mkCard [data-a=lat]').click()); await W(p, 200); await A(p, 'latgo'); await W(p, 900); await p.evaluate(() => window.__midi.noteOn(60, 90)); } },
  set: { go: async p => { await p.evaluate(() => document.getElementById('setBtn').click()); await W(p, 500); } },
  M3: { gate: true, empty: true, go: async p => { } },
  M3found: { gate: true, go: async p => { } },
};
for (const [id, o] of Object.entries(SHOTS)) {
  if (only.length && !only.includes(id)) continue;
  for (const theme of ['light', 'dark']) for (const [w, h] of SIZES) {
    if (theme === 'dark' && !(w === 1024 || w === 375 || w === 812)) continue;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: 'fr-FR', colorScheme: theme, userAgent: o.ios ? 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148' : undefined });
    const nat = o.ios || (o.mode !== 'none' && !o.gate && w < 900 && h < 900 && Math.min(w, h) < 600);
    if (nat) await ctx.addInitScript(`new MutationObserver((m,o)=>{ if(document.documentElement){ document.documentElement.classList.add('native'); o.disconnect(); } }).observe(document,{childList:true}); window.__nativeMidi={start:async()=>({inputs:[]}),listInputs:async()=>({inputs:[]}),showBluetooth:async()=>{}};`);
    await ctx.addInitScript(INIT(o.mode || 'ok'));
    if (o.empty) await ctx.addInitScript(`(()=>{ const M=window.__midi; M.access.inputs.clear(); M.ports[0].state='disconnected'; })();`);
    if (!o.gate) await ctx.addInitScript(seed(o.mode === 'none' ? 'screen' : 'midi', {}));
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(URL); await W(p, 1300);
    try { await o.go(p); } catch (e) { errs.push('go: ' + e.message); }
    await W(p, 500);
    const f = `${OUT}/${id}_${w}x${h}${theme === 'dark' ? '_dark' : ''}.png`;
    await p.screenshot({ path: f });
    const sc = await p.evaluate(() => { const bd = document.getElementById('mwBody'); return bd && !document.getElementById('mwiz').hidden ? { sh: bd.scrollHeight, ch: bd.clientHeight } : null; });
    console.log(id, w + 'x' + h, theme, sc && sc.sh > sc.ch + 1 ? 'DÉFILE ' + JSON.stringify(sc) : 'ok', errs.length ? errs : '');
    await ctx.close();
  }
}
await b.close();
