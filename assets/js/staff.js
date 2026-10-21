/* Piano Challenges — music staff (SVG) shared by the app and the Play player.
   Glyphs from the Bravura font (SMuFL, © Steinberg, SIL Open Font License 1.1, unmodified file assets/fonts/bravura.woff2).
   Staff.render({events, clef, key, mode, meter, pickup, width, sp, labels, cur, color, stroke}) -> {svg, xs, width, height, systems}
   - events: [{notes:[{m, l?, a?, color?}], dur?, rest?}]  m = MIDI number, l = letter C..B, a = -2..2 (spelling; guessed when missing)
   - clef: "treble" | "bass" | "grand" | "auto" (auto: treble, bass or both from the notes)
   - key: number of sharps (>0) or flats (<0), or null
   - mode: "free" (note heads, evenly spaced: scales, chords) | "measures" (durations in beats, bar lines, rests)
*/
(function (G) {
  "use strict";
  const LI = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 }, LET = "CDEFGAB";
  const SH = "FCGDAEB", FL = "BEADGCF";
  const SHARP_ORDER_D = [38, 35, 39, 36, 33, 37, 34], FLAT_ORDER_D = [34, 37, 33, 36, 32, 35, 31]; // treble positions; bass = -14
  const GL = { gClef: "", fClef: "", black: "", half: "", whole: "", sharp: "", flat: "", natural: "", dsharp: "", dflat: "",
    rWhole: "", rHalf: "", rQuarter: "", r8: "", r16: "", f8u: "", f8d: "", f16u: "", f16d: "", dot: "", brace: "" };
  const tsDigit = n => String(n).split("").map(c => String.fromCharCode(0xE080 + +c)).join("");
  const SPELL_S = [["C", 0], ["C", 1], ["D", 0], ["D", 1], ["E", 0], ["F", 0], ["F", 1], ["G", 0], ["G", 1], ["A", 0], ["A", 1], ["B", 0]];
  const SPELL_F = [["C", 0], ["D", -1], ["D", 0], ["E", -1], ["E", 0], ["F", 0], ["G", -1], ["G", 0], ["A", -1], ["A", 0], ["B", -1], ["B", 0]];
  function spell(m, flat) { const pc = ((m % 12) + 12) % 12, s = (flat ? SPELL_F : SPELL_S)[pc]; return { m, l: s[0], a: s[1] }; }
  function norm(n, flat) { if (n && n.l && LI[n.l] != null && Number.isFinite(n.a)) return n; return Object.assign(spell(n.m, flat), n.color ? { color: n.color } : {}); }
  const diat = n => (Math.floor((n.m - n.a) / 12) - 1) * 7 + LI[n.l];
  function keyAcc(f) { const k = {}; if (f > 0) for (let i = 0; i < Math.min(7, f); i++) k[SH[i]] = 1; if (f < 0) for (let i = 0; i < Math.min(7, -f); i++) k[FL[i]] = -1; return k; }
  // fifths of a key from its tonic spelling and mode (major, minor, dorian ...); null when beyond 7 accidentals
  const LF = { F: -1, C: 0, G: 1, D: 2, A: 3, E: 4, B: 5 }, MODE_SHIFT = { major: 0, ionian: 0, minor: -3, aeolian: -3, dorian: -2, phrygian: -4, lydian: 1, mixolydian: -1, locrian: -5 };
  function keyOf(l, a, mode) { if (LF[l] == null) return null; const f = LF[l] + 7 * (a || 0) + (MODE_SHIFT[mode] || 0); return Math.abs(f) <= 7 ? f : null; }
  function durGlyph(d) { // beats (quarter = 1) -> [head, flags, dots]
    if (d >= 4) return ["whole", 0, 0]; if (d >= 3) return ["half", 0, 1]; if (d >= 2) return ["half", 0, 0]; if (d >= 1.5) return ["black", 0, 1];
    if (d >= 1) return ["black", 0, 0]; if (d >= 0.75) return ["black", 1, 1]; if (d >= 0.5) return ["black", 1, 0]; return ["black", 2, 0]; }
  function restGlyph(d) { return d >= 4 ? "rWhole" : d >= 2 ? "rHalf" : d >= 1 ? "rQuarter" : d >= 0.5 ? "r8" : "r16"; }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function render(o) {
    const sp = o.sp || 9, fs = sp * 4, ink = o.stroke || "currentColor", mode = o.mode || "free";
    const keyF = Number.isFinite(o.key) ? Math.max(-7, Math.min(7, o.key)) : 0, KA = keyAcc(keyF), flat = keyF < 0;
    const evs = (o.events || []).map(e => ({ ...e, notes: (e.notes || []).map(n => norm(n, flat)) }));
    const all = evs.flatMap(e => e.notes);
    let clef = o.clef || "auto";
    if (clef === "auto") { const lo = Math.min(...all.map(n => n.m), 60), hi = Math.max(...all.map(n => n.m), 60); clef = lo >= 55 ? "treble" : hi <= 64 ? "bass" : "grand"; if (!all.length) clef = "treble"; }
    const staves = clef === "grand" ? ["treble", "bass"] : [clef];
    // vertical layout: room above / below for ledger lines
    const ds = all.map(diat), BOT = { treble: 30, bass: 18 };
    const onStaff = n => clef === "grand" ? (n.m >= 60 ? "treble" : "bass") : clef;
    const ext = st => { const mine = all.filter(n => onStaff(n) === st).map(diat), b = BOT[st]; const lo = Math.min(b, ...mine), hi = Math.max(b + 8, ...mine); return [Math.max(0, (b - lo) / 2), Math.max(0, (hi - b - 8) / 2)]; };
    let y = sp * (1.2 + (o.labelsTop ? 1.4 : 0)); const SY = {};
    staves.forEach((st, i) => { const [below, above] = ext(st); y += Math.max(above, 1.6) * sp + (i ? sp * 1.2 : 0); SY[st] = y + 4 * sp; /* y of the bottom line */ y = SY[st] + Math.max(below, 1.6) * sp; });
    const labH = o.labels ? sp * 2.2 : 0, H = Math.ceil(y + labH + sp * 0.6);
    const yOf = (d, st) => SY[st] - (d - BOT[st]) * sp / 2;
    // horizontal layout
    const W = o.width || 600, x0 = sp * 0.6 + (staves.length > 1 ? sp * 1.2 : 0);
    let x = x0 + sp * 0.8; const head = [];
    head.push({ x, glyph: true });
    const clefW = sp * 3.2, ksW = Math.abs(keyF) * sp * 1.05, tsW = mode === "measures" && o.meter && o.ts !== false ? sp * 2.6 : 0;
    const startX = x + clefW + ksW + tsW + sp * 1.2, endX = W - sp * 1.2;
    const parts = [];
    // staff lines, clefs, key signatures, time signature
    staves.forEach(st => {
      for (let i = 0; i < 5; i++) { const ly = SY[st] - i * sp; parts.push(`<line x1="${x0}" x2="${W - sp * 0.4}" y1="${ly}" y2="${ly}" stroke="${ink}" stroke-width="${sp * 0.13}" opacity=".55"/>`); }
      const cg = st === "treble" ? GL.gClef : GL.fClef, cy = st === "treble" ? yOf(32, st) : yOf(24, st);
      parts.push(`<text x="${x}" y="${cy}" font-family="Bravura" font-size="${fs}" fill="${ink}">${cg}</text>`);
      const order = keyF > 0 ? SHARP_ORDER_D : FLAT_ORDER_D, gl = keyF > 0 ? GL.sharp : GL.flat, off = st === "bass" ? -14 : 0;
      for (let i = 0; i < Math.abs(keyF); i++) parts.push(`<text x="${x + clefW + i * sp * 1.05}" y="${yOf(order[i] + off, st)}" font-family="Bravura" font-size="${fs}" fill="${ink}">${gl}</text>`);
      if (tsW) { const tx = x + clefW + ksW + sp * 0.3; parts.push(`<text x="${tx}" y="${yOf(BOT[st] + 6, st)}" font-family="Bravura" font-size="${fs}" fill="${ink}">${tsDigit(o.meter[0])}</text><text x="${tx}" y="${yOf(BOT[st] + 2, st)}" font-family="Bravura" font-size="${fs}" fill="${ink}">${tsDigit(o.meter[1])}</text>`); }
    });
    if (staves.length > 1) parts.push(`<line x1="${x0}" x2="${x0}" y1="${SY.treble - 4 * sp}" y2="${SY.bass}" stroke="${ink}" stroke-width="${sp * 0.16}"/><line x1="${W - sp * 0.4}" x2="${W - sp * 0.4}" y1="${SY.treble - 4 * sp}" y2="${SY.bass}" stroke="${ink}" stroke-width="${sp * 0.16}" opacity=".55"/>`);
    // x of each event: even spacing (free) or by duration with bar lines (measures)
    const xs = [], bars = [];
    if (mode === "measures") {
      const per = o.meter ? o.meter[0] * 4 / o.meter[1] : 4, off = o.offset || 0; // off: beats before the first event in its bar (pickup)
      const tot = evs.reduce((a, e) => a + (e.dur || 1), 0), nBars = Math.max(1, Math.ceil((off + tot) / per - 1e-6));
      const w1 = (endX - startX) / (nBars * per); let pos = off;
      evs.forEach(e => { xs.push(startX + pos * w1 + sp * 0.6); pos += e.dur || 1; });
      for (let b = 1; b < nBars; b++) bars.push(startX + b * per * w1);
      bars.forEach(bx => staves.forEach(st => parts.push(`<line x1="${bx}" x2="${bx}" y1="${SY[st] - 4 * sp}" y2="${SY[st]}" stroke="${ink}" stroke-width="${sp * 0.16}" opacity=".7"/>`)));
      if (o.final !== false) staves.forEach(st => parts.push(`<line x1="${endX + sp * 0.5}" x2="${endX + sp * 0.5}" y1="${SY[st] - 4 * sp}" y2="${SY[st]}" stroke="${ink}" stroke-width="${o.final === "thin" ? sp * 0.16 : sp * 0.4}"/>`));
    } else { const n = Math.max(1, evs.length), step = Math.min(sp * 7, (endX - startX) / n); evs.forEach((e, i) => xs.push(startX + step * (i + 0.5) - sp * 0.6)); }
    // highlight of the current event
    if (o.cur != null && xs[o.cur] != null) parts.unshift(`<rect x="${xs[o.cur] - sp * 1.1}" y="${sp * 0.3}" width="${sp * 3.4}" height="${H - sp * 0.6}" rx="${sp}" fill="${o.curColor || "rgba(122,91,245,.16)"}"/>`);
    // events
    const carried = {}; // accidentals carried in the bar (measures) or in the whole line (free)
    let barIdx = 0;
    evs.forEach((e, i) => {
      const ex = xs[i]; if (ex == null) return;
      if (mode === "measures") { while (barIdx < bars.length && ex > bars[barIdx]) { barIdx++; for (const k in carried) delete carried[k]; } }
      const dur = e.dur || (mode === "measures" ? 1 : 4);
      if (e.rest || !e.notes.length) { if (mode === "measures") staves.forEach(st => parts.push(`<text x="${ex}" y="${yOf(BOT[st] + 4, st)}" font-family="Bravura" font-size="${fs}" fill="${ink}" opacity=".8">${GL[restGlyph(dur)]}</text>`)); return; }
      const [hg, flags, dots] = mode === "measures" ? durGlyph(dur) : [o.head || "black", 0, 0];
      staves.forEach(st => {
        const ns = e.notes.filter(n => onStaff(n) === st).map(n => ({ n, d: diat(n) })).sort((a, b) => a.d - b.d); if (!ns.length) return;
        const hw = (hg === "whole" ? 1.69 : 1.18) * sp;
        // seconds: the upper head of a second moves right
        ns.forEach((h, j) => { h.dx = j && ns[j - 1].d === h.d - 1 && !ns[j - 1].dx ? hw : 0; });
        // ledger lines
        const b = BOT[st], lo = ns[0].d, hi = ns[ns.length - 1].d;
        for (let d = b - 2; d >= lo; d -= 2) parts.push(`<line x1="${ex - sp * 0.4}" x2="${ex + hw + sp * 0.4 + (ns.some(h => h.dx) ? hw : 0)}" y1="${yOf(d, st)}" y2="${yOf(d, st)}" stroke="${ink}" stroke-width="${sp * 0.16}"/>`);
        for (let d = b + 10; d <= hi; d += 2) parts.push(`<line x1="${ex - sp * 0.4}" x2="${ex + hw + sp * 0.4 + (ns.some(h => h.dx) ? hw : 0)}" y1="${yOf(d, st)}" y2="${yOf(d, st)}" stroke="${ink}" stroke-width="${sp * 0.16}"/>`);
        // accidentals (shown when they differ from the key / the bar), stacked to the left when close
        let col = 0, lastD = 99;
        ns.slice().reverse().forEach(h => { const want = h.n.a, have = carried[h.n.l + h.d] != null ? carried[h.n.l + h.d] : (KA[h.n.l] || 0);
          if (want === have) return; carried[h.n.l + h.d] = want; col = lastD - h.d < 6 ? col + 1 : 0; lastD = h.d;
          const g = want === 2 ? GL.dsharp : want === -2 ? GL.dflat : want === 1 ? GL.sharp : want === -1 ? GL.flat : GL.natural;
          parts.push(`<text x="${ex - sp * 1.35 - col * sp * 1.1}" y="${yOf(h.d, st)}" font-family="Bravura" font-size="${fs}" fill="${h.n.color || ink}">${g}</text>`); });
        // heads
        ns.forEach(h => parts.push(`<text x="${ex + h.dx}" y="${yOf(h.d, st)}" font-family="Bravura" font-size="${fs}" fill="${h.n.color || ink}">${GL[hg]}</text>`));
        // stem, flags, dots
        if (mode === "measures" && hg !== "whole") {
          const mid = b + 4, up = (lo + hi) / 2 < mid, len = 3.5 * sp;
          if (up) { const sx = ex + 1.18 * sp - sp * 0.06, y1 = yOf(lo, st) - 0.168 * sp, y2 = Math.min(yOf(hi, st) - len, yOf(mid, st)); parts.push(`<line x1="${sx}" x2="${sx}" y1="${y1}" y2="${y2}" stroke="${ink}" stroke-width="${sp * 0.12}"/>`);
            if (flags) parts.push(`<text x="${sx - sp * 0.06}" y="${y2}" font-family="Bravura" font-size="${fs}" fill="${ink}">${flags > 1 ? GL.f16u : GL.f8u}</text>`); }
          else { const sx = ex + sp * 0.06, y1 = yOf(hi, st) + 0.168 * sp, y2 = Math.max(yOf(lo, st) + len, yOf(mid, st)); parts.push(`<line x1="${sx}" x2="${sx}" y1="${y1}" y2="${y2}" stroke="${ink}" stroke-width="${sp * 0.12}"/>`);
            if (flags) parts.push(`<text x="${sx - sp * 0.06}" y="${y2}" font-family="Bravura" font-size="${fs}" fill="${ink}">${flags > 1 ? GL.f16d : GL.f8d}</text>`); }
          if (dots) ns.forEach(h => { const dy = h.d % 2 === (b % 2) ? -sp / 2 : 0; parts.push(`<text x="${ex + hw + sp * 0.35}" y="${yOf(h.d, st) + dy}" font-family="Bravura" font-size="${fs}" fill="${h.n.color || ink}">${GL.dot}</text>`); });
        }
      });
      if (o.labels && o.labels[i] != null) parts.push(`<text x="${ex + sp * 0.6}" y="${H - sp * 0.7}" text-anchor="middle" font-family="Nunito,system-ui,sans-serif" font-weight="800" font-size="${sp * 1.25}" fill="${(e.notes[0] && e.notes[0].color) || ink}">${esc(o.labels[i])}</text>`);
    });
    if (o.cursorX != null) parts.push(`<line x1="${o.cursorX}" x2="${o.cursorX}" y1="${sp * 0.4}" y2="${H - sp * 0.4}" stroke="${o.cursorColor || "#7a5bf5"}" stroke-width="${sp * 0.3}" stroke-linecap="round"/>`);
    const svg = `<svg class="staff-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(o.aria || "")}" xmlns="http://www.w3.org/2000/svg">${parts.join("")}</svg>`;
    return { svg, xs, width: W, height: H, clef, bars };
  }
  // split events in bars (measures mode) to page through them, e.g. 4 bars per line
  function bars(events, meter, pickup) { const per = meter ? meter[0] * 4 / meter[1] : 4, out = []; let cur = [], room = pickup ? pickup : per;
    events.forEach((e, i) => { cur.push(i); room -= (e.dur || 1); if (room <= 1e-6) { out.push(cur); cur = []; room = per; } }); if (cur.length) out.push(cur); return out; }
  G.Staff = { render, spell, keyOf, bars, diat, GL };
})(typeof window !== "undefined" ? window : globalThis);
