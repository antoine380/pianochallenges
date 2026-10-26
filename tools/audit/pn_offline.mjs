// Outils de rendu hors ligne du mode PIANO (utilisés par r48_piano.mjs) : injectés dans la page, ils rejouent des scénarios de notes
// dans un OfflineAudioContext avec le vrai code des instruments (PN.off), puis mesurent les claquements, la crête et le spectre.
export const PN_OFFLINE = String.raw`
window.__pnRender = async (ins, events, o = {}) => {
  const sr = o.sr || 48000, dur = o.dur || 4, oc = new OfflineAudioContext(2, Math.round(sr * dur), sr);
  const k = pnCfg(), keep = { ins: k.ins, rev: k.rev, dly: k.dly, cho: k.cho, vol: k.vol }, A = PN.A;
  pnAllOff(); Object.assign(k, { ins, rev: o.rev ?? 0, dly: o.dly ?? 0, cho: o.cho ?? 0, vol: o.vol ?? .8 }); PN.A = null; PN.off = oc; pnAudio();
  const info = { voices: [], t0: [] };
  const run = e => { if (e.on != null) { PN.held.add(e.on); const vc = pnVoice(e.on, e.v ?? .8); info.voices.push(vc ? vc.src.map(s => s.constructor.name).join(',') : null); }
    else if (e.off != null) pnOff(e.off); else if (e.ped != null) pnSusSet(!!e.ped, true); else if (e.ins) { pnAllOff(); pnCfg().ins = e.ins; } else if (e.fx) { Object.assign(pnCfg(), { rev: .6, dly: .4, cho: .5, vol: .6 }); pnFx(); }
    else if (e.cut) PN.all.forEach(x => x.src.forEach(s => { try { s.stop(); } catch (er) {} })); };
  const by = new Map(); events.forEach(e => { const q = Math.round(e.t * sr / 128) * 128 / sr; if (!by.has(q)) by.set(q, []); by.get(q).push(e); });
  [...by.keys()].sort((a, b) => a - b).forEach(q => { if (q <= 0) by.get(q).forEach(run); else oc.suspend(q).then(() => { by.get(q).forEach(run); oc.resume(); }); });
  let b; try { b = await oc.startRendering(); } finally { pnAllOff(); PN.off = null; PN.A = A; Object.assign(k, keep); }
  return { b, info };
};
// discontinuities: a sample-to-sample jump much larger than the jumps around it (± 2 ms)
window.__pnClicks = b => { const out = []; for (let ch = 0; ch < b.numberOfChannels; ch++) { const x = b.getChannelData(ch), n = x.length, W = 96, S = new Float64Array(n + 1);
    for (let i = 1; i < n; i++) { const d = x[i] - x[i - 1]; S[i + 1] = S[i] + d * d; }
    for (let i = 1; i < n; i++) { const d = Math.abs(x[i] - x[i - 1]); if (d < .006) continue; const a = Math.max(1, i - W), z = Math.min(n - 1, i + W);
      const loc = Math.sqrt(Math.max(0, S[z + 1] - S[a] - d * d) / (z - a)); if (d > 8 * loc + .003) { const t = i / b.sampleRate; if (!out.length || t - out[out.length - 1].t > .005) out.push({ t: +t.toFixed(4), d: +d.toFixed(4), r: +(d / (loc || 1e-9)).toFixed(1), ch }); } } }
  return out; };
window.__pnPeak = b => { let p = 0; for (let ch = 0; ch < b.numberOfChannels; ch++) { const x = b.getChannelData(ch); for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > p) p = a; } } return p; };
window.__pnOnset = (b, t) => { const x = b.getChannelData(0), s = Math.round(t * b.sampleRate); for (let i = s; i < x.length; i++) if (Math.abs(x[i]) > .003) return (i - s) / b.sampleRate * 1000; return 1e9; };
// timbre: harmonic profile (12 harmonics, 0.5–0.9 s) and loudness envelope, both in dB from their maximum
window.__pnFeat = (b, f0) => { const x = b.getChannelData(0), sr = b.sampleRate, a = Math.round(.5 * sr), z = Math.round(.9 * sr), N = z - a, H = [];
  for (let k = 1; k <= 12; k++) { const w = 2 * Math.PI * k * f0 / sr; let re = 0, im = 0; for (let i = 0; i < N; i++) { const h = .5 - .5 * Math.cos(2 * Math.PI * i / N), v = x[a + i] * h; re += v * Math.cos(w * i); im -= v * Math.sin(w * i); } H.push(Math.hypot(re, im)); }
  const T = [.005, .02, .05, .1, .2, .35, .6, .9, 1.15, 1.3, 1.5, 1.8], E = T.map(t => { const s = Math.round(t * sr), n = Math.round(.02 * sr); let q = 0; for (let i = s; i < s + n && i < x.length; i++) q += x[i] * x[i]; return Math.sqrt(q / n); });
  const db = (arr, fl) => { const m = Math.max(...arr) || 1e-9; return arr.map(v => Math.max(fl, 20 * Math.log10((v || 1e-9) / m))); };
  let num = 0, den = 0; for (let k = 0; k < 12; k++) { num += (k + 1) * H[k]; den += H[k]; }
  return { h: db(H, -50), e: db(E, -60), cent: den ? num / den : 0 }; };
window.__pnDist = (p, q) => { let a = 0, c = 0; for (let i = 0; i < p.h.length; i++) a += Math.abs(p.h[i] - q.h[i]); for (let i = 0; i < p.e.length; i++) c += Math.abs(p.e[i] - q.e[i]); return +(a / p.h.length / 10 + c / p.e.length / 10).toFixed(2); };
`;
