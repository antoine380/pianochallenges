/* Piano Challenges — import of the player's own songs (MIDI / MusicXML), shared by the host page (PLAY › Mes morceaux) and the Play player.
   Everything happens on the device: the file is read in the browser, converted to the catalogue's note format and kept in IndexedDB
   (database "pc-import", store "songs"; in-memory fallback when IndexedDB is not available). Nothing is ever sent to a server.
   PCImp.parse(name, ArrayBuffer) -> model {fmt, title, bpm, meter, pickup, tracks:[{id, name, prog, ch, drum, notes:[{m, s, d}]}]}  (s, d in quarter notes)
   PCImp.convert(model, opts) -> {notes:[{m, s, d, h, f}], bpm, meter, pickup, end, nR, nL}  (same shape as PC_SONG.build: h 1 = right hand, 2 = left hand)
   PCImp.db: list / get / put / del / best  (records {id, title, fmt, created, n, dur, model, opts, best:{stars, score}})
   Errors: PCImp.Err with .code = size | empty | format | midiBad | xmlBad | timewise | mxlBad | mxlNoDs | protected | noNotes
*/
(function (G) {
  const MAX_BYTES = 2 * 1024 * 1024, MAX_SONGS = 50;
  class Err extends Error { constructor(code) { super(code); this.code = code; } }
  const LET = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

  // ---------- format detection (by content, never by the file extension: iOS may rename or strip it)
  function sniff(u8) {
    const s = String.fromCharCode(...u8.subarray(0, 4));
    if (s === "MThd") return "mid";
    if (s === "RIFF" && String.fromCharCode(...u8.subarray(8, 12)) === "RMID") return "rmid";
    if (u8[0] === 0x50 && u8[1] === 0x4b && u8[2] === 3 && u8[3] === 4) return "mxl";
    const head = text(u8.subarray(0, 2048));
    if (/<score-(partwise|timewise)/.test(head) || (/<\?xml/.test(head) && /musicxml|score-partwise/i.test(head))) return "musicxml";
    return null; }
  function text(u8) {
    let enc = "utf-8"; if (u8[0] === 0xff && u8[1] === 0xfe) enc = "utf-16le"; else if (u8[0] === 0xfe && u8[1] === 0xff) enc = "utf-16be";
    try { return new TextDecoder(enc).decode(u8); } catch (e) { return String.fromCharCode(...u8.subarray(0, 4096)); } }

  // ---------- Standard MIDI File (type 0, 1; type 2 read as type 1): running status, tempo, time signature, several tracks, channel 10 = drums
  function parseMidi(u8) {
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), N = u8.length;
    const str = (o, n) => String.fromCharCode(...u8.subarray(o, o + n));
    if (N < 14 || str(0, 4) !== "MThd") throw new Err("midiBad");
    const hl = dv.getUint32(4), ntr = dv.getUint16(10), div = dv.getInt16(12);
    if (!div) throw new Err("midiBad");
    const perBeat = div > 0 ? div : (-(div >> 8)) * (div & 0xff) / 2; // SMPTE: ticks per second / 2 = beats at 120 bpm
    let p = 8 + hl, t = 0, guard = 0; const tempos = [], out = []; let ts = null, title = "";
    while (t < ntr && p + 8 <= N && guard++ < 4096) {
      const id = str(p, 4), len = dv.getUint32(p + 4); let q = p + 8; const end = Math.min(N, q + len); p = q + len;
      if (id !== "MTrk") continue; t++;
      let tick = 0, rs = 0, name = "";
      const on = new Map(), chs = new Map();
      const vlq = () => { let v = 0, k = 0; for (;;) { if (q >= end || k++ > 4) throw new Err("midiBad"); const b = u8[q++]; v = (v << 7) | (b & 0x7f); if (!(b & 0x80)) return v; } };
      const ch = c => { let o = chs.get(c); if (!o) chs.set(c, o = { prog: -1, notes: [] }); return o; };
      while (q < end) {
        tick += vlq(); if (q >= end) break;
        let st = u8[q];
        if (st & 0x80) { q++; if (st < 0xf0) rs = st; } else { if (!rs) throw new Err("midiBad"); st = rs; }
        if (st === 0xff) { const type = u8[q++], l = vlq(), d = u8.subarray(q, q + l); q += l;
          if (type === 0x51 && l >= 3) tempos.push({ tick, us: (d[0] << 16) | (d[1] << 8) | d[2] });
          else if (type === 0x58 && l >= 2 && !ts) ts = { tick, n: d[0], d: 2 ** d[1] };
          else if (type === 0x03 && !name) name = text(d).replace(/\0/g, "").trim();
          else if (type === 0x2f) break; }
        else if (st === 0xf0 || st === 0xf7) { const l = vlq(); q += l; rs = 0; }
        else { const hi = st & 0xf0, c = st & 15, two = hi !== 0xc0 && hi !== 0xd0; const a = u8[q], b = two ? u8[q + 1] : 0; q += two ? 2 : 1;
          if (q > end) throw new Err("midiBad");
          const key = c * 128 + a;
          if (hi === 0x90 && b > 0) { let l = on.get(key); if (!l) on.set(key, l = []); l.push(tick); }
          else if (hi === 0x80 || hi === 0x90) { const l = on.get(key); if (l && l.length) { const s = l.shift(); ch(c).notes.push({ m: a, s, e: tick }); } }
          else if (hi === 0xc0 && ch(c).prog < 0) ch(c).prog = a; } }
      on.forEach((l, key) => l.forEach(s => ch(key >> 7).notes.push({ m: key & 127, s, e: Math.max(tick, s + perBeat / 4) })));
      const n = [...chs.entries()].filter(([, o]) => o.notes.length);
      n.forEach(([c, o]) => out.push({ id: "t" + out.length, name: name + (n.length > 1 ? " · " + (c + 1) : ""), ch: c, prog: o.prog, drum: c === 9,
        notes: o.notes.map(x => ({ m: x.m, s: x.s / perBeat, d: Math.max(1 / 64, (x.e - x.s) / perBeat) })).sort((x, y) => x.s - y.s || x.m - y.m) })); }
    if (!out.length) throw new Err("noNotes");
    tempos.sort((a, b) => a.tick - b.tick);
    const us = div > 0 && tempos.length ? tempos[0].us : 500000;
    return { fmt: "mid", title: "", bpm: Math.max(30, Math.min(240, Math.round(60e6 / us))), meter: ts && ts.n > 0 && [1, 2, 4, 8, 16].includes(ts.d) ? [ts.n, ts.d] : [4, 4], pickup: 0, tracks: out }; }

  // RIFF-wrapped MIDI (.rmi): the "data" chunk is a standard MIDI file
  function unRiff(u8) { const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength); let p = 12;
    while (p + 8 <= u8.length) { const id = String.fromCharCode(...u8.subarray(p, p + 4)), l = dv.getUint32(p + 4, true); if (id === "data") return u8.subarray(p + 8, p + 8 + l); p += 8 + l + (l & 1); }
    throw new Err("midiBad"); }

  // ---------- MusicXML (score-partwise): parts × staves = tracks, ties merged, grace and cue notes skipped, chords, backup / forward, pickup bar
  function parseXml(src) {
    if (typeof DOMParser === "undefined") throw new Err("xmlBad");
    const doc = new DOMParser().parseFromString(src, "application/xml"), root = doc.documentElement;
    if (!root || doc.getElementsByTagName("parsererror").length) throw new Err("xmlBad");
    if (root.nodeName === "score-timewise") throw new Err("timewise");
    if (root.nodeName !== "score-partwise") throw new Err("xmlBad");
    const kid = (el, n) => { for (const c of el.children) if (c.nodeName === n) return c; return null; };
    const val = (el, n) => { const c = el && kid(el, n); return c ? c.textContent.trim() : null; };
    const title = (val(kid(root, "work") || root, "work-title") || val(root, "movement-title") || "").trim();
    const names = {}; const pl = kid(root, "part-list");
    if (pl) for (const sp of pl.getElementsByTagName("score-part")) names[sp.getAttribute("id")] = { name: val(sp, "part-name") || "", prog: +(sp.getElementsByTagName("midi-program")[0] || {}).textContent - 1 };
    let bpm = 0, meter = null, pickup = 0; const tracks = new Map();
    const parts = [...root.children].filter(c => c.nodeName === "part");
    parts.forEach((part, pi) => {
      const pid = part.getAttribute("id") || "P" + pi; let div = 1, cur = 0;
      const last = new Map(); // staff -> start of the last note (for <chord/>)
      [...part.children].filter(c => c.nodeName === "measure").forEach((ms, mi) => {
        const m0 = cur; let mx = cur;
        for (const el of ms.children) {
          const nn = el.nodeName;
          if (nn === "attributes") { const d = +val(el, "divisions"); if (d > 0) div = d; const tm = kid(el, "time"); if (tm && !meter) { const b = parseInt(val(tm, "beats")), u = +val(tm, "beat-type"); if (b > 0 && [1, 2, 4, 8, 16].includes(u)) meter = [b, u]; } }
          else if (nn === "direction" || nn === "sound") { const snd = nn === "sound" ? el : el.getElementsByTagName("sound")[0]; const tp = snd && +snd.getAttribute("tempo");
            if (tp > 0 && !bpm) bpm = tp;
            if (!bpm) { const pm = el.getElementsByTagName("per-minute")[0], bu = val(el.getElementsByTagName("metronome")[0] || el, "beat-unit"); if (pm && +pm.textContent > 0) bpm = +pm.textContent * ({ half: 2, eighth: .5, whole: 4 }[bu] || 1); } }
          else if (nn === "backup") { cur -= (+val(el, "duration") || 0) / div; }
          else if (nn === "forward") { cur += (+val(el, "duration") || 0) / div; mx = Math.max(mx, cur); }
          else if (nn === "note") {
            if (kid(el, "grace") || kid(el, "cue")) continue;
            const d = (+val(el, "duration") || 0) / div, staff = +val(el, "staff") || 1, isCh = !!kid(el, "chord");
            const s = isCh && last.has(staff) ? last.get(staff) : cur;
            if (!isCh) { last.set(staff, cur); cur += d; mx = Math.max(mx, cur); }
            const pt = kid(el, "pitch"); if (!pt || kid(el, "rest") || d <= 0) continue;
            const step = val(pt, "step"), oct = +val(pt, "octave"), alt = Math.round(+val(pt, "alter") || 0);
            if (LET[step] == null || !Number.isFinite(oct)) continue;
            const m = 12 * (oct + 1) + LET[step] + alt, key = pid + ":" + staff;
            let tr = tracks.get(key); if (!tr) tracks.set(key, tr = { id: "x" + tracks.size, part: pid, staff, notes: [] });
            const ties = [...el.children].filter(c => c.nodeName === "tie").map(c => c.getAttribute("type"));
            if (ties.includes("stop")) { const prev = tr.notes.slice(-8).reverse().find(x => x.m === m && Math.abs(x.s + x.d - s) < 1e-3); if (prev) { prev.d += d; continue; } }
            tr.notes.push({ m, s, d }); } }
        cur = Math.max(cur, mx);
        if (mi === 0 && pi === 0 && (ms.getAttribute("implicit") === "yes" || ms.getAttribute("number") === "0")) pickup = cur - m0; }); });
    const out = [...tracks.values()].filter(x => x.notes.length);
    if (!out.length) throw new Err("noNotes");
    const multi = new Set(out.map(x => x.part)).size < out.length;
    out.forEach(x => { const nm = names[x.part] || {}; x.name = (nm.name || "") + (multi && out.filter(y => y.part === x.part).length > 1 ? " · " + x.staff : ""); x.prog = Number.isFinite(nm.prog) ? nm.prog : -1; x.ch = -1; x.drum = false;
      x.notes.sort((a, b) => a.s - b.s || a.m - b.m); delete x.part; });
    return { fmt: "musicxml", title, bpm: Math.round(Math.max(30, Math.min(240, bpm || 100))), meter: meter || [4, 4], pickup: pickup > 0 && pickup < 8 ? pickup : 0, tracks: out }; }

  // ---------- .mxl = a zip with the MusicXML inside (deflate through DecompressionStream("deflate-raw"))
  async function unzipXml(u8) {
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength); let e = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 66000); i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
    if (e < 0) throw new Err("mxlBad");
    const cnt = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const ent = {};
    for (let k = 0; k < cnt && p + 46 <= u8.length; k++) { if (dv.getUint32(p, true) !== 0x02014b50) throw new Err("mxlBad");
      const flag = dv.getUint16(p + 8, true), meth = dv.getUint16(p + 10, true), comp = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
      ent[new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nl))] = { flag, meth, comp, off }; p += 46 + nl + xl + cl; }
    const read = async name => { const x = ent[name]; if (!x) throw new Err("mxlBad"); if (x.flag & 1) throw new Err("protected");
      const ds = x.off + 30 + dv.getUint16(x.off + 26, true) + dv.getUint16(x.off + 28, true), data = u8.subarray(ds, ds + x.comp);
      if (x.meth === 0) return data; if (x.meth !== 8) throw new Err("mxlBad");
      if (typeof DecompressionStream === "undefined") throw new Err("mxlNoDs");
      try { return new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer()); } catch (er) { throw new Err("mxlBad"); } };
    let main = null;
    if (ent["META-INF/container.xml"]) { const m = /full-path\s*=\s*"([^"]+)"/.exec(text(await read("META-INF/container.xml"))); if (m && ent[m[1]]) main = m[1]; }
    if (!main) main = Object.keys(ent).find(n => !n.startsWith("META-INF") && /\.(musicxml|xml)$/i.test(n));
    if (!main) throw new Err("mxlBad");
    return text(await read(main)); }

  async function parse(name, buf) {
    const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    if (!u8.length) throw new Err("empty"); if (u8.length > MAX_BYTES) throw new Err("size");
    const kind = sniff(u8); let model;
    if (kind === "mid") model = parseMidi(u8);
    else if (kind === "rmid") model = parseMidi(unRiff(u8));
    else if (kind === "musicxml") model = parseXml(text(u8));
    else if (kind === "mxl") { model = parseXml(await unzipXml(u8)); model.fmt = "mxl"; }
    else throw new Err("format");
    const base = String(name || "").replace(/\.[a-z0-9]{2,8}$/i, "").replace(/[_]+/g, " ");
    model.title = clean(model.title || base) || "?";
    model.tracks.forEach(x => { x.name = clean(x.name); x.lo = Math.min(...x.notes.map(n => n.m)); x.hi = Math.max(...x.notes.map(n => n.m)); x.mean = x.notes.reduce((a, n) => a + n.m, 0) / x.notes.length; });
    return model; }
  const clean = s => String(s || "").replace(/[<>&"\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim().slice(0, 60);

  // ---------- default roles: drums ignored, highest track = right hand, lowest = left hand, the others ignored;
  // a single melodic track that spans both sides of middle C is split there ("both")
  function autoRoles(model) { const R = {}, mel = model.tracks.filter(x => !x.drum);
    model.tracks.forEach(x => R[x.id] = "off");
    if (mel.length === 1) { const x = mel[0]; R[x.id] = x.lo < 57 && x.hi >= 60 && x.notes.filter(n => n.m < 60).length > 3 ? "both" : "rh"; }
    else if (mel.length > 1) { const s = mel.slice().sort((a, b) => b.mean - a.mean); R[s[0].id] = "rh"; R[s[s.length - 1].id] = "lh"; }
    return R; }

  // ---------- conversion to the catalogue's note list
  // opts: {roles:{trackId: rh|lh|both|off}, tr: -6..6, mono: true = one note at a time in the right hand, q: 2 (1/8) | 4 (1/16) | 0 (as played)}
  function gather(model, opts) { const R = opts.roles || autoRoles(model), out = [];
    model.tracks.forEach(x => { const r = R[x.id]; if (!r || r === "off") return; x.notes.forEach(n => out.push({ m: n.m + (opts.tr | 0), s: n.s, d: n.d, h: r === "rh" ? 1 : r === "lh" ? 2 : n.m >= 60 ? 1 : 2 })); });
    return out; }
  function convert(model, opts) { opts = opts || {};
    const per = model.meter[0] * 4 / model.meter[1], g = opts.q ? 1 / opts.q : 1 / 24;
    let ns = gather(model, opts);
    if (!ns.some(n => n.h === 1)) ns.forEach(n => n.h = 1); // nothing for the right hand: everything goes there
    ns.forEach(n => { const s = Math.round(n.s / g) * g; let e = Math.round((n.s + n.d) / g) * g; if (e <= s) e = s + g; n.s = s; n.d = e - s; });
    if (!ns.length) return { notes: [], bpm: model.bpm, meter: model.meter, pickup: 0, end: 0, nR: 0, nL: 0 };
    // start on the bar of the first note (no long silence before it)
    const pk = model.pickup || 0, first = Math.min(...ns.map(n => n.s)), shift = first >= pk ? Math.floor((first - pk) / per + 1e-9) * per : 0;
    ns.forEach(n => { n.s = +(n.s - shift).toFixed(6); });
    // fold into the app's keyboard: right hand C4..B5, left hand C3..B3
    ns.forEach(n => { const [lo, hi] = n.h === 1 ? [60, 83] : [48, 59]; while (n.m < lo) n.m += 12; while (n.m > hi) n.m -= 12; });
    // one key per hand and onset (the longest), the left hand gives way to the right on the same key
    const key = n => n.s.toFixed(4) + ":" + n.m; const seen = new Map();
    ns.sort((a, b) => a.h - b.h || b.d - a.d).forEach(n => { if (!seen.has(key(n))) seen.set(key(n), n); });
    ns = [...seen.values()];
    if (opts.mono) { const top = new Map(); ns.filter(n => n.h === 1).forEach(n => { const k = n.s.toFixed(4), o = top.get(k); if (!o || n.m > o.m) top.set(k, n); });
      ns = ns.filter(n => n.h === 2).concat([...top.values()]); }
    ns.sort((a, b) => a.s - b.s || a.m - b.m);
    // a note never rings over the next one of the same hand when it plays one note at a time, nor over the same key
    [1, 2].forEach(h => { const hs = ns.filter(n => n.h === h);
      for (let i = 0; i < hs.length; i++) { const n = hs[i]; for (let j = i + 1; j < hs.length; j++) { const o = hs[j]; if (o.s <= n.s + 1e-6) continue; if (o.s >= n.s + n.d) break;
        if (o.m === n.m || (h === 1 && opts.mono)) { n.d = Math.max(g, o.s - n.s); break; } } } });
    // fingering of the right hand when it fits a five-finger position on white keys (like the catalogue)
    const W = [0, 2, 4, 5, 7, 9, 11], wi = m => Math.floor(m / 12) * 7 + W.indexOf(m % 12), rh = ns.filter(n => n.h === 1);
    if (rh.length && !rh.some(n => W.indexOf(n.m % 12) < 0)) { const lo = Math.min(...rh.map(n => wi(n.m))), hi = Math.max(...rh.map(n => wi(n.m))); if (hi - lo <= 4) rh.forEach(n => n.f = wi(n.m) - lo + 1); }
    const end = Math.max(...ns.map(n => n.s + n.d)), nL = ns.filter(n => n.h === 2).length;
    return { notes: ns.map(n => ({ m: n.m, s: n.s, d: +n.d.toFixed(6), h: n.h, f: n.f || 0 })), bpm: model.bpm, meter: model.meter, pickup: pk && shift === 0 ? pk : 0, end, nR: ns.length - nL, nL }; }

  // ---------- analysis: probable key (Krumhansl profiles, weighted by duration) and the transposition with the fewest black keys
  const PMAJ = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88], PMIN = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
  function keyOf(model, opts) { const w = new Array(12).fill(0); gather(model, { ...opts, tr: 0 }).forEach(n => w[((n.m % 12) + 12) % 12] += Math.min(4, n.d));
    const mean = a => a.reduce((x, y) => x + y, 0) / 12, corr = (a, b) => { const ma = mean(a), mb = mean(b); let n = 0, da = 0, db = 0; for (let i = 0; i < 12; i++) { n += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; } return da && db ? n / Math.sqrt(da * db) : 0; };
    let best = { pc: 0, minor: false, r: -2 };
    for (let k = 0; k < 12; k++) for (const [P, minor] of [[PMAJ, false], [PMIN, true]]) { const r = corr(w, w.map((_, i) => P[(i - k + 12) % 12])); if (r > best.r) best = { pc: k, minor, r }; }
    return best; }
  function easyTr(model, opts) { const ns = gather(model, { ...opts, tr: 0 }); let best = 0, bw = Infinity;
    for (const t of [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6]) { let b = 0; ns.forEach(n => { if ([1, 3, 6, 8, 10].includes((((n.m + t) % 12) + 12) % 12)) b += Math.min(2, n.d); }); if (b < bw - 1e-6) { bw = b; best = t; } }
    return best; }

  // ---------- local storage (IndexedDB, in-memory fallback shared with the player frame through the host window)
  let dbp = null;
  function open() { if (dbp) return dbp;
    dbp = new Promise((res, rej) => { try { if (!G.indexedDB) return rej(); const r = G.indexedDB.open("pc-import", 1);
      r.onupgradeneeded = () => { try { r.result.createObjectStore("songs", { keyPath: "id" }); } catch (e) {} };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); r.onblocked = () => rej(); } catch (e) { rej(e); } }).catch(() => null);
    return dbp; }
  function mem() { try { if (G.parent && G.parent !== G && G.parent.PC_IMP_MEM) return G.parent.PC_IMP_MEM; } catch (e) {} return G.PC_IMP_MEM || (G.PC_IMP_MEM = new Map()); }
  async function req(mode, fn) { const db = await open(); if (!db) throw new Error("no idb");
    return new Promise((res, rej) => { try { const t = db.transaction("songs", mode), r = fn(t.objectStore("songs")); t.oncomplete = () => res(r && r.result); t.onerror = t.onabort = () => rej(t.error); } catch (e) { rej(e); } }); }
  const db = {
    MAX: MAX_SONGS,
    async list() { let a = []; try { a = (await req("readonly", s => s.getAll())) || []; } catch (e) {} const ids = new Set(a.map(r => r.id)); mem().forEach(r => { if (!ids.has(r.id)) a.push(r); }); return a.sort((x, y) => (y.created || 0) - (x.created || 0)); },
    async get(id) { let r = null; try { r = await req("readonly", s => s.get(id)); } catch (e) {} return r || mem().get(id) || null; },
    async put(rec) { try { await req("readwrite", s => s.put(rec)); mem().delete(rec.id); return "idb"; } catch (e) { mem().set(rec.id, rec); return "mem"; } },
    async del(id) { try { await req("readwrite", s => s.delete(id)); } catch (e) {} mem().delete(id); },
    async best(id, stars, score) { const r = await db.get(id); if (!r) return; const b = r.best || { stars: 0, score: 0 };
      if (stars > (b.stars | 0) || score > (b.score | 0)) { r.best = { stars: Math.max(b.stars | 0, stars), score: Math.max(b.score | 0, score) }; await db.put(r); } },
    async persistent() { return !!(await open()); } };
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  G.PCImp = { parse, convert, autoRoles, keyOf, easyTr, db, newId, Err, MAX_BYTES, MAX_SONGS, sniff, parseMidi, parseXml, unzipXml };
})(typeof window !== "undefined" ? window : globalThis);
