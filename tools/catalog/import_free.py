#!/usr/bin/env python3
"""Piano Challenges — catalogue libre : import hors ligne de pièces libres de droits.

Sources (clonées à part, données non fiables, jamais exécutées) :
  - OpenScore Lieder (CC0)            : fichiers MusicXML compressés (.mxl) + métadonnées YAML
  - Mutopia Project (domaine public / CC BY) : MIDI produits depuis le LilyPond par tools/catalog/render_mutopia.sh
    (compilation dans un bac à sable bubblewrap, sans réseau)

Ce script ne fait que lire des fichiers (XML, MIDI, en-têtes LilyPond en texte) et écrit :
  - assets/js/songs-free.js           : les morceaux au format de songs-data.js (+ champ src)
  - tools/catalog/report.json         : toutes les pièces examinées, gardées ou écartées (et pourquoi)
  - CREDITS-MUSIQUE.md                : la liste des crédits (attribution exigée par CC BY)

Usage (lancer avec python3 -I) :
  python3 -I tools/catalog/import_free.py --lieder <clone Lieder> --mutopia <clone Mutopia> --midi <dossier des MIDI rendus> [--list]

Pour chaque pièce : mélodie (voix du lied, ou ligne supérieure de la main droite au piano), harmonie lue dans
l'accompagnement (un accord par mesure ou demi-mesure), extrait du début jusqu'à une cadence si la pièce est longue,
transposition dans une tonalité confortable, mélodie dans Do4..Si5 (la main gauche Do3..Si3 est construite par
songs-data.js à partir de la grille), rythme sur une grille de doubles croches, mesures complètes, levée gérée.
"""
import argparse, json, math, os, re, sys, zipfile, hashlib
import xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
Q = 0.25            # rhythmic grid: sixteenth notes (in quarter notes)
LO, HI = 60, 83     # melody C4..B5
ALLOWED_LIC = {"CC0 1.0", "Domaine public", "CC BY 2.5", "CC BY 3.0", "CC BY 4.0"}

# ---------------------------------------------------------------- small helpers
NAMES_S = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
NAMES_F = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]
STEP = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
def near(x, g=Q): return round(x / g) * g
def fmt(x):
    s = ("%.4f" % x).rstrip("0").rstrip(".")
    return s[1:] if s.startswith("0.") else s
def note_name(m): return NAMES_S[m % 12] + str(m // 12 - 1)

# ---------------------------------------------------------------- MIDI (SMF type 0/1)
def parse_midi(data):
    def u32(b, i): return int.from_bytes(b[i:i + 4], "big")
    def u16(b, i): return int.from_bytes(b[i:i + 2], "big")
    if data[:4] != b"MThd": raise ValueError("not a MIDI file")
    hl = u32(data, 4); fmt_, ntr, div = u16(data, 8), u16(data, 10), u16(data, 12)
    if div & 0x8000: raise ValueError("SMPTE time")
    i = 8 + hl; tracks = []; tsig = []; tempo = []; ksig = []
    for _ in range(ntr):
        if data[i:i + 4] != b"MTrk": break
        ln = u32(data, i + 4); b = data[i + 8:i + 8 + ln]; i += 8 + ln
        j = 0; t = 0; st = 0; on = {}; notes = []; name = ""
        while j < len(b):
            v = 0
            while True:
                c = b[j]; j += 1; v = (v << 7) | (c & 0x7F)
                if not c & 0x80: break
            t += v; c = b[j]
            if c == 0xFF:
                ty = b[j + 1]; j += 2; L = 0
                while True:
                    cc = b[j]; j += 1; L = (L << 7) | (cc & 0x7F)
                    if not cc & 0x80: break
                d = b[j:j + L]; j += L
                if ty == 0x03: name = d.decode("latin-1", "replace")
                elif ty == 0x58 and L >= 2: tsig.append((t, d[0], 2 ** d[1]))
                elif ty == 0x51 and L == 3: tempo.append((t, 60e6 / int.from_bytes(d, "big")))
                elif ty == 0x59 and L == 2: ksig.append((t, (d[0] ^ 0x80) - 0x80, d[1]))
                continue
            if c in (0xF0, 0xF7):
                j += 1; L = 0
                while True:
                    cc = b[j]; j += 1; L = (L << 7) | (cc & 0x7F)
                    if not cc & 0x80: break
                j += L; continue
            if c & 0x80: st = c; j += 1
            hi = st & 0xF0; ch = st & 0x0F
            if hi in (0xC0, 0xD0): j += 1; continue
            d1, d2 = b[j], b[j + 1]; j += 2
            if hi == 0x90 and d2 > 0:
                on.setdefault((ch, d1), []).append(t)
            elif hi == 0x80 or (hi == 0x90 and d2 == 0):
                k = (ch, d1)
                if on.get(k):
                    s = on[k].pop(0); notes.append((s / div, (t - s) / div, d1, ch))
        tracks.append({"name": name, "notes": sorted(notes)})
    return {"tracks": tracks, "tsig": [(t / div, n, d) for t, n, d in tsig], "tempo": [(t / div, b) for t, b in tempo],
            "ksig": [(t / div, s, mi) for t, s, mi in ksig]}

# ---------------------------------------------------------------- MusicXML (partwise, .mxl)
def parse_mxl(path):
    z = zipfile.ZipFile(path)
    names = [n for n in z.namelist() if not n.startswith("META-INF") and n.endswith((".xml", ".musicxml"))]
    if not names: raise ValueError("no score in mxl")
    if len(z.read(names[0])) > 8_000_000: raise ValueError("score too large")
    root = ET.fromstring(z.read(names[0]))
    if root.tag != "score-partwise": raise ValueError("not partwise")
    info = {"title": (root.findtext("movement-title") or root.findtext("work/work-title") or "").strip(),
            "work": (root.findtext("work/work-title") or "").strip(),
            "composer": next((c.text or "" for c in root.iter("creator") if c.get("type") == "composer"), "")}
    pl = {sp.get("id"): (sp.findtext("part-name") or "").strip() for sp in root.iter("score-part")}
    parts = []; measures = None; tempo = None
    for part in root.findall("part"):
        divs = 1; t = 0.0; notes = []; ms = []; lyr = 0; open_ties = {}
        beats, btype = 4, 4; fifths = 0
        for meas in part.findall("measure"):
            mstart = t; mlen = 0.0; cur = t; last_on = t
            for el in meas:
                tag = el.tag
                if tag == "attributes":
                    d = el.findtext("divisions")
                    if d: divs = float(d)
                    tm = el.find("time")
                    if tm is not None and tm.findtext("beats"):
                        try: beats, btype = int(tm.findtext("beats").split("+")[0]), int(tm.findtext("beat-type"))
                        except ValueError: pass
                    k = el.find("key")
                    if k is not None and k.findtext("fifths"): fifths = int(k.findtext("fifths"))
                elif tag == "backup":
                    cur -= float(el.findtext("duration") or 0) / divs
                elif tag == "forward":
                    cur += float(el.findtext("duration") or 0) / divs
                elif tag == "sound" or tag == "direction":
                    snd = el if tag == "sound" else el.find("sound")
                    if snd is not None and snd.get("tempo") and tempo is None:
                        try: tempo = float(snd.get("tempo"))
                        except ValueError: pass
                elif tag == "note":
                    if el.find("grace") is not None or el.find("cue") is not None: continue
                    dur = float(el.findtext("duration") or 0) / divs
                    chord = el.find("chord") is not None
                    on = last_on if chord else cur
                    if el.find("lyric") is not None: lyr += 1
                    if el.find("rest") is None and el.find("pitch") is not None:
                        p = el.find("pitch"); m = 12 * (int(p.findtext("octave")) + 1) + STEP[p.findtext("step")] + int(float(p.findtext("alter") or 0))
                        staff = int(el.findtext("staff") or 1); voice = el.findtext("voice") or "1"
                        ties = [x.get("type") for x in el.findall("tie")]
                        key = (m, staff, voice)
                        if "stop" in ties and key in open_ties and abs(open_ties[key][0] + open_ties[key][1] - on) < 1e-3:
                            n0 = open_ties[key]; n0[1] += dur
                            if "start" not in ties: del open_ties[key]
                        else:
                            n = [on, dur, m, staff, voice]; notes.append(n)
                            if "start" in ties: open_ties[key] = n
                    if not chord: last_on = cur; cur += dur
                mlen = max(mlen, cur - mstart)
            nominal = beats * 4 / btype
            ln = mlen if mlen > 1e-6 else nominal
            ms.append({"s": mstart, "len": ln, "beats": beats, "btype": btype, "fifths": fifths, "implicit": meas.get("implicit") == "yes"})
            t = mstart + ln
        parts.append({"name": pl.get(part.get("id"), ""), "notes": [tuple(n) for n in notes], "lyrics": lyr})
        if measures is None: measures = ms
    return {"info": info, "parts": parts, "measures": measures or [], "tempo": tempo}

# ---------------------------------------------------------------- key, chords
MAJ = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
MIN = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]
def corr(a, b):
    ma, mb = sum(a) / 12, sum(b) / 12
    num = sum((x - ma) * (y - mb) for x, y in zip(a, b)); den = math.sqrt(sum((x - ma) ** 2 for x in a) * sum((y - mb) ** 2 for y in b))
    return num / den if den else 0
def key_of(notes):
    h = [0.0] * 12
    for s, d, m, *_ in notes: h[m % 12] += d
    best = None
    for r in range(12):
        for mode, prof in (("maj", MAJ), ("min", MIN)):
            c = corr(h, prof[-r:] + prof[:-r])
            if best is None or c > best[0]: best = (c, r, mode)
    return best[1], best[2]

def keys_of(notes, n=3):
    """The n most likely keys (tonic, mode), most likely first."""
    h = [0.0] * 12
    for s, d, m, *_ in notes: h[m % 12] += d
    res = sorted(((corr(h, prof[-r:] + prof[:-r]), r, mode) for r in range(12) for mode, prof in (("maj", MAJ), ("min", MIN))), reverse=True)
    return [(r, mode) for c, r, mode in res[:n]]

def chord_at(notes, a, b, tonic, mode):
    """Best triad for the window [a, b): weighted pitch classes of the accompaniment, the bass counts more."""
    w = [0.0] * 12; bass = None
    for s, d, m, *_ in notes:
        o = min(b, s + d) - max(a, s)
        if o <= 1e-6: continue
        w[m % 12] += o
        if s <= a + 0.26 and (bass is None or m < bass[0]): bass = (m, o)
    if sum(w) < 1e-6: return None
    if bass: w[bass[0] % 12] += 0.8 * (b - a)
    scale = [0, 2, 4, 5, 7, 9, 11] if mode == "maj" else [0, 2, 3, 5, 7, 8, 10, 11]
    best = None
    for r in range(12):
        for q, iv in (("", (0, 4, 7)), ("m", (0, 3, 7)), ("7", (0, 4, 7, 10)), ("dim", (0, 3, 6))):
            tones = {(r + i) % 12 for i in iv}
            sc = sum(w[p] for p in tones) - 0.6 * sum(w[p] for p in range(12) if p not in tones)
            if q in ("7", "dim"): sc -= 0.15 * (b - a)
            if bass and bass[0] % 12 == r: sc += 0.3 * (b - a)
            if (r - tonic) % 12 in scale: sc += 0.1 * (b - a)
            if best is None or sc > best[0]: best = (sc, r, q)
    _, r, q = best
    if q == "dim": r, q = (r - 4) % 12, ""      # B° = rootless G7 -> G
    if q == "7": q = ""
    return (r, q == "m")

# ---------------------------------------------------------------- melody line
def skyline(notes):
    """Top line of a staff: at each onset the highest note, cut at the next onset."""
    by = {}
    for s, d, m, *_ in notes:
        k = round(s * 48) / 48
        if k not in by or m > by[k][1]: by[k] = (d, m)
    on = sorted(by); keep = []; held = None          # held = (end, pitch) of the last melody note
    for s in on:
        d, m = by[s]
        if held and held[0] > s + 1e-3 and held[1] > m: continue   # an inner voice moves under a held melody note
        keep.append(s); held = (s + d, m)
    out = []
    for i, s in enumerate(keep):
        d, m = by[s]
        if i + 1 < len(keep): d = min(d, keep[i + 1] - s)
        if d > 1e-6: out.append((s, d, m))
    return out

def mono(notes):
    """A sung line (already one note at a time): keep the highest note of a chord, no overlap."""
    return skyline(notes)

# ---------------------------------------------------------------- bars
def bars_from_midi(mid, pickup):
    ts = [x for x in mid["tsig"] if x[0] < 1e-6] or [(0, 4, 4)]
    n, d = ts[-1][1], ts[-1][2]
    per = n * 4 / d
    changes = sorted(x[0] for x in mid["tsig"] if x[0] > 1e-6 and (x[1], x[2]) != (n, d))
    end = max((s + du for tr in mid["tracks"] for s, du, *_ in tr["notes"]), default=0)
    stop = min(changes) if changes else end
    bars = []
    if pickup > 1e-6: bars.append((0.0, pickup))
    t = pickup
    while t < stop - 1e-6: bars.append((t, per)); t += per
    return bars, (n, d), stop

# ---------------------------------------------------------------- one candidate -> song (or a reason to drop it)
EASY_KEYS = {  # tonic pc, mode -> accidentals in the key signature
    ("maj", 0): 0, ("maj", 7): 1, ("maj", 5): 1, ("maj", 2): 2, ("maj", 10): 2, ("maj", 9): 3, ("maj", 3): 3,
    ("min", 9): 0, ("min", 4): 1, ("min", 2): 1, ("min", 11): 2, ("min", 7): 2, ("min", 6): 3, ("min", 0): 3}
FLAT_KEYS = {("maj", 5), ("maj", 10), ("maj", 3), ("maj", 8), ("min", 2), ("min", 7), ("min", 0), ("min", 5)}

def build_song(mel, acc, bars, meter, bpm_src, opts):
    """mel/acc: [(s, d, m)] in quarter notes; bars: [(start, len)] (first one may be a pickup). Returns dict or raises Drop."""
    per = meter[0] * 4 / meter[1]
    if meter not in [(2, 4), (3, 4), (4, 4), (2, 2), (3, 8), (6, 8), (9, 8), (12, 8), (3, 2)]: raise Drop("mesure %d/%d" % meter)
    if meter == (2, 2): meter = (4, 4)
    if meter == (3, 2): raise Drop("mesure 3/2")
    if not mel: raise Drop("pas de mélodie")
    # ---- first melody bar (skips an instrumental introduction)
    first = mel[0][0]
    bi = next(i for i, (s, l) in enumerate(bars) if s + l > first + 1e-6)
    bs, bl = bars[bi]
    full = abs(bl - per) < 1e-6
    if not full:                       # the score's own pickup
        start = first; pickup = bs + bl - first
    elif first - bs >= per / 2 - 1e-6 and bi + 1 < len(bars):   # the melody enters late in a bar: a pickup
        start = first; pickup = bs + bl - first
    else:
        start = bs; pickup = 0.0
    if pickup > 1e-6:
        pickup = near(pickup)
        if pickup < Q or pickup >= per: pickup = 0.0; start = bs
    body = [b for b in bars if b[0] >= bs + bl - 1e-6] if pickup > 1e-6 else [b for b in bars if b[0] >= bs - 1e-6]
    run = []
    for b in body:                     # full bars, one after another (stops at a meter change or a split bar)
        if abs(b[1] - per) > 1e-6 or (run and abs(run[-1][0] + per - b[0]) > 1e-6): break
        run.append(b)
    body = run
    if len(body) < 4: raise Drop("trop court")
    t0 = body[0][0] - pickup             # song time 0
    # ---- quantize the melody of the candidate bars, find where the rhythm stops being on the grid
    qm = []; bad_at = None
    for s, d, m in mel:
        if s < t0 - 1e-6: continue
        rs, re_ = s - t0, s + d - t0
        if abs(rs - near(rs)) > 0.04 or (not opts.get("legato") and abs(re_ - near(re_)) > 0.04 and d > 0.2):
            if bad_at is None: bad_at = rs
        qs, qe = near(rs), near(re_)
        if qe - qs < Q - 1e-9: qe = qs + Q
        qm.append([qs, qe, m])
    # remove overlaps created by rounding
    out = []
    for n in qm:
        if out and n[0] < out[-1][1] - 1e-9:
            if n[0] <= out[-1][0] + 1e-9: continue
            out[-1][1] = n[0]
        out.append(n)
    qm = out
    if not qm: raise Drop("pas de mélodie")
    if opts.get("legato"):             # MIDI from LilyPond shortens staccato notes: close the small gaps
        for a, b in zip(qm, qm[1:]):
            if 0 < b[0] - a[1] <= 0.5 + 1e-9: a[1] = b[0]
    # key of the opening (8 bars): a whole lied modulates, its beginning says where we are
    w0, w1 = t0, t0 + pickup + 8 * per
    win = [(s, d, m) for s, d, m in acc + mel if w0 - 1e-6 <= s < w1]
    KEYS = keys_of(win or acc + mel)
    tonic, mode = KEYS[0]
    # ---- harmony per bar (or half bar)
    halves = 2 if meter in [(4, 4), (12, 8)] else 1
    def chords_of_bar(k):
        a = t0 + pickup + k * per; seg = per / halves; res = []
        for h in range(halves):
            res.append(chord_at(acc, a + h * seg, a + (h + 1) * seg, tonic, mode))
        return res
    # ---- candidate ends: bar boundaries, judged as cadences
    nb = len(body)
    last_mel = max(e for s, e, m in qm)
    nb = min(nb, int(math.ceil((last_mel - pickup) / per - 1e-6)))
    if nb < 4: raise Drop("trop court")
    lim_bar = nb
    if bad_at is not None:
        lim_bar = min(lim_bar, int((bad_at - pickup) // per))
    # stop before a long silence of the melody (more than 2 bars) after the first phrase
    ons = [s for s, e, m in qm]
    for i in range(1, len(qm)):
        gap = qm[i][0] - qm[i - 1][1]
        if gap > 2 * per + 1e-6 and qm[i][0] > pickup + 4 * per:
            lim_bar = min(lim_bar, int(math.ceil((qm[i - 1][1] - pickup) / per - 1e-6))); break
    if lim_bar < 4: raise Drop("rythme hors grille (triolets, ornements) dès le début" if bad_at is not None and bad_at < pickup + 4 * per else "trop court")
    chs = [chords_of_bar(k) for k in range(lim_bar)]
    def notes_until(k):
        e = pickup + k * per
        return [n for n in qm if n[0] < e - 1e-9]
    bpm = bpm_src or opts.get("bpm") or 92
    best = None
    lo_run, hi_run = 999, 0
    for k in range(1, lim_bar + 1):
        ns = notes_until(k)
        if not ns: continue
        lo_run = min(n[2] for n in ns); hi_run = max(n[2] for n in ns)
        if hi_run - lo_run > HI - LO: break
        if k < 4: continue
        beats = pickup + k * per
        dens = len(ns) / beats
        b2 = min(bpm, 210 / max(dens, 0.1), 116); b2 = max(b2, 52)
        secs = beats * 60 / b2
        if secs < 30 and b2 > 50: b2 = max(50, beats * 2); secs = beats * 60 / b2   # a short piece played a bit slower
        if secs > 180: break
        last = ns[-1]
        endb = pickup + k * per
        c_last = chs[k - 1][-1]; c_prev = chs[k - 2][-1] if k >= 2 else None
        sc = -9; kbest = KEYS[0]
        for ki, (tn, md) in enumerate(KEYS):      # the cadence also tells the key (the opening may sit on the dominant)
            s1 = -1.2 * ki
            if chs[0][0] and chs[0][0][0] == tn: s1 += 1      # it also starts on that chord
            if c_last and c_last[0] == tn and c_last[1] == (md == "min"): s1 += 3
            if c_prev and (c_prev[0] - tn) % 12 in (7, 5) and c_last and c_last[0] == tn: s1 += 2
            if last[2] % 12 == tn: s1 += 2
            elif c_last and (last[2] - c_last[0]) % 12 in (0, 3, 4, 7): s1 += 0.5
            if s1 > sc: sc, kbest = s1, (tn, md)
        if last[0] <= endb - per + 1e-6 + per / 2 and (min(last[1], endb) - last[0]) >= min(1, per / 2) - 1e-6: sc += 1.5
        if k % 8 == 0: sc += 1.5
        elif k % 4 == 0: sc += 1
        if len(ns) < 16: sc -= 6
        if secs < 30: sc -= 6
        sc -= abs(secs - 70) / 40          # aim at about a minute
        whole = k == nb
        if whole: sc += 2.5
        if best is None or sc > best[0]: best = (sc, k, b2, secs, whole, kbest)
    if not best: raise Drop("étendue de la mélodie trop large")
    sc, k, bpm2, secs, whole, (tonic, mode) = best
    ns = notes_until(k); endb = pickup + k * per
    if len(ns) < 16: raise Drop("moins de 16 notes")
    if secs < 30: raise Drop("moins de 30 s")
    if sc < 1.5: raise Drop("pas de fin cohérente (cadence) dans l'étendue")
    rest = 1 - sum(min(e, endb) - s for s, e, m in ns) / endb
    if rest > opts.get("maxrest", 0.3): raise Drop("mélodie peu lisible (%d %% de silences)" % round(rest * 100))
    dia = [0, 2, 4, 5, 7, 9, 11] if mode == "maj" else [0, 2, 3, 5, 7, 8, 10, 11]
    flat_chs = [c for b in chs[:k] for c in b if c]
    chrom = sum(1 for c in flat_chs if (c[0] - tonic) % 12 not in dia) / max(1, len(flat_chs))
    if chrom > 0.35: raise Drop("harmonie trop chromatique")
    ivs = [abs(b[2] - a[2]) for a, b in zip(ns, ns[1:])]
    if sum(1 for x in ivs if x > 9) / max(1, len(ivs)) > 0.12: raise Drop("mélodie trop sautillante (ligne brisée)")
    # ---- transposition: an easy key, the melody in C4..B5
    lo, hi = min(n[2] for n in ns), max(n[2] for n in ns)
    cand = []
    for t in range(-6, 6):
        for o in (-24, -12, 0, 12, 24):
            sh = t + o
            if lo + sh < LO or hi + sh > HI: continue
            kk = (mode, (tonic + t) % 12)
            acc_n = EASY_KEYS.get(kk, 6)
            blacks = sum(1 for n in ns if (n[2] + sh) % 12 in (1, 3, 6, 8, 10)) / len(ns)
            center = (lo + hi) / 2 + sh
            cost = acc_n * 2 + blacks * 6 + abs(center - 71) / 8 + (0 if t == 0 else 0.6)
            cand.append((cost, sh, t))
    if not cand: raise Drop("étendue de la mélodie trop large")
    _, sh, t = min(cand)
    ktonic = (tonic + t) % 12
    flat = (mode, ktonic) in FLAT_KEYS
    # ---- melody tokens (no note across a barline: the rest of a tied note becomes a rest)
    toks = []; cur = 0.0
    def put(name, a, b):
        nonlocal cur
        x = a
        while x < b - 1e-9:
            bar_end = pickup + (math.floor((x - pickup) / per + 1e-9) + 1) * per if x >= pickup - 1e-9 else pickup
            y = min(b, bar_end)
            toks.append((name if x == a else "R", y - x)); x = y
        cur = b
    for s, e, m in ns:
        e = min(e, endb)
        if s > cur + 1e-9: put("R", cur, s)
        put(note_name(m + sh), s, e)
    if cur < endb - 1e-9: put("R", cur, endb)
    # merge consecutive rests inside a bar
    merged = []; tt = 0.0
    for n, d in toks:
        if n == "R" and merged and merged[-1][0] == "R":
            ps = tt - merged[-1][1]
            same_bar = math.floor((ps - pickup) / per + 1e-9) == math.floor((tt + d - 1e-6 - pickup) / per + 1e-9) if ps >= pickup - 1e-9 else tt + d <= pickup + 1e-9
            if same_bar: merged[-1] = ("R", merged[-1][1] + d); tt += d; continue
        merged.append((n, d)); tt += d
    if any(d <= 1e-9 for n, d in merged): raise Drop("durée nulle")
    mel_s = " ".join("%s:%s" % (n, fmt(d)) for n, d in merged)
    # ---- chord chart over the k bars
    def spell(pc):
        deg = (pc - ktonic) % 12
        if deg in (1, 3, 8, 10): return NAMES_F[pc]          # bII, bIII, bVI, bVII
        if deg == 6: return NAMES_S[pc] if mode == "maj" else NAMES_F[pc]
        return (NAMES_F if flat else NAMES_S)[pc]
    names = [spell(i) for i in range(12)]
    def cname(c): return None if c is None else names[(c[0] + t) % 12] + ("m" if c[1] else "")
    prev = cname((tonic, mode == "min"))
    bars_s = []
    for b in range(k):
        cs = [cname(c) for c in chs[b]]
        cs = [c or prev for c in cs]
        prev = cs[-1]
        bars_s.append(cs[0] if len(set(cs)) == 1 else " ".join(cs))
    ch_s = "|".join(bars_s)
    m_out = [meter[0], meter[1]]
    return {"m": m_out, "p": fmt(pickup) if pickup > 1e-6 else None, "bpm": int(bpm2 // 2 * 2), "beats": endb, "mel": mel_s, "ch": ch_s,
            "tr": t, "key": (names[ktonic] + ("m" if mode == "min" else "")), "okey": NAMES_F[tonic] + ("m" if mode == "min" else ""),
            "bars": k, "secs": round(secs), "whole": whole, "notes": len(ns), "score": round(sc, 2)}

class Drop(Exception): pass

# ---------------------------------------------------------------- tiny YAML reader (the Lieder metadata: 2 levels, "key: value")
def read_yaml(path):
    out = {}; cur = None
    for line in open(path, encoding="utf-8"):
        if not line.strip() or line.lstrip().startswith("#"): continue
        if not line.startswith(" "):
            k = line.split(":", 1)[0].strip().strip("'\""); cur = out.setdefault(k, {})
        elif cur is not None and ":" in line:
            k, v = line.strip().split(":", 1); cur[k.strip()] = v.strip().strip("'\"")
    return out

# ---------------------------------------------------------------- Mutopia headers (LilyPond text, read as data)
MUT_FIELDS = ("meter", "title", "mutopiatitle", "composer", "mutopiacomposer", "opus", "mutopiaopus", "date", "license", "copyright",
              "mutopiainstrument", "instrument", "footer", "maintainer", "source", "style", "piece", "subtitle")
def ly_header(text):
    h = {}
    for k in MUT_FIELDS:
        m = re.search(r'(?<![A-Za-z])' + k + r'\s*=\s*"((?:[^"\\]|\\.)*)"', text)
        if m: h[k] = m.group(1).replace('\\"', '"').strip()
    return h

TEMPO_WORDS = [(r"grave|largo|lento|lent\\b|adagio|langsam|douloureux|sehr ruhig", 66), (r"larghetto|andante|ruhig|mässig|massig|innig|zart", 80),
               (r"andantino|moderato|modéré|commodo|menuet|minuet|tempo di", 96), (r"allegretto", 104), (r"allegro|vivo|lebhaft|munter", 112), (r"presto|vivace|rasch|schnell", 120)]
def words_tempo(txt):
    t = (txt or "").lower(); best = None
    for rx, b in TEMPO_WORDS:
        if re.search(rx, t): best = b if best is None else min(best, b) if b < 90 else best
    return best

def mut_license(h):
    l = (h.get("license") or h.get("copyright") or "").strip()
    if l == "Public Domain": return "Domaine public"
    m = re.fullmatch(r"Creative Commons Attribution ([234]\.[05])", l)
    return "CC BY " + m.group(1) if m else None      # ShareAlike, other or missing licences are refused

def mut_number(h):
    m = re.search(r"Mutopia-\d{4}/\d\d/\d\d-(\d+)", h.get("footer", ""))
    return int(m.group(1)) if m else None

def ly_pickup(text):
    m = re.search(r"\\partial\s+(\d+)(\.*)(?:\s*\*\s*(\d+)(?:/(\d+))?)?", text)
    if not m: return 0.0
    v = 4 / int(m.group(1)); dot = len(m.group(2)); v *= (2 - 0.5 ** dot)
    if m.group(3): v *= int(m.group(3)) / (int(m.group(4)) if m.group(4) else 1)
    return v

def ly_tempo(text):
    m = re.search(r"\\tempo\s+(?:\"[^\"]*\"\s*)?(\d+)(\.?)\s*=\s*(\d+)", text)
    if not m: return None
    unit = 4 / int(m.group(1)) * (1.5 if m.group(2) else 1)
    return float(m.group(3)) * unit

def mut_list(ftp):
    """Every Mutopia .ly with an allowed licence for a keyboard (or voice and piano), sorted, with a stable id."""
    rows = []
    for dp, dn, fn in os.walk(ftp):
        dn.sort()
        for f in sorted(fn):
            if not f.endswith(".ly"): continue
            p = os.path.join(dp, f)
            try: tx = open(p, encoding="utf-8", errors="replace").read()
            except OSError: continue
            if "mutopia" not in tx.lower(): continue
            h = ly_header(tx); lic = mut_license(h); no = mut_number(h)
            inst = h.get("mutopiainstrument") or h.get("instrument") or ""
            rel = os.path.relpath(p, ftp)
            rows.append({"rel": rel, "id": "m%s-%s" % (no, hashlib.sha1(rel.encode()).hexdigest()[:6]) if no else None,
                         "lic": lic, "no": no, "inst": inst, "h": h, "pickup": ly_pickup(tx), "tempo": ly_tempo(tx) or words_tempo(h.get("meter", "") + " " + h.get("subtitle", ""))})
    return rows

KEYBOARD = re.compile(r"piano|harpsichord|clavier|clavichord", re.I)
NOT_SOLO = re.compile(r"duet|violin|flute|cello|orchestra|string|horn|guitar", re.I)
def mut_eligible(r):
    if not r["id"]: return "pas de numéro Mutopia"
    if not r["lic"]: return "licence refusée ou absente : " + ((r["h"].get("license") or r["h"].get("copyright") or "aucune")[:60])
    if not KEYBOARD.search(r["inst"]) or NOT_SOLO.search(r["inst"]): return "instrument : " + r["inst"][:40]
    return None

# ---------------------------------------------------------------- melody / accompaniment from a source
def overlap_ratio(notes):
    ns = sorted(notes); over = 0
    for a, b in zip(ns, ns[1:]):
        if b[0] < a[0] + a[1] - 0.05: over += 1
    return over / max(1, len(ns))

def midi_clean(mid):
    """LilyPond MIDI: a grace note at the very start shifts everything; grace notes elsewhere are short and off the grid."""
    al = [s for t in mid["tracks"] for s, d, m, c in t["notes"]]
    if not al: return
    fr = {}
    for s in al: k = round((s % Q) * 96) / 96; fr[k] = fr.get(k, 0) + 1
    delta = max(fr, key=fr.get)
    if delta > 1e-6 and fr[delta] > 0.6 * len(al):
        delta = delta - Q if delta > Q / 2 else delta
        for t in mid["tracks"]: t["notes"] = [(s - delta, d, m, c) for s, d, m, c in t["notes"] if s - delta > -1e-6]
    for t in mid["tracks"]:
        t["notes"] = [n for n in t["notes"] if not (n[1] < 0.2 and abs(n[0] / Q - round(n[0] / Q)) > 0.16)]

def from_midi(mid, inst):
    midi_clean(mid)
    trs = [t for t in mid["tracks"] if len(t["notes"]) >= 8]
    if not trs: raise Drop("MIDI vide")
    voice = None
    if re.search(r"voice|voix|gesang|sing|soprano", inst, re.I):
        for t in trs:
            if overlap_ratio(t["notes"]) < 0.05 and not re.search(r"piano|klavier|pf", t["name"], re.I): voice = t; break
        if voice is None: raise Drop("voix introuvable")
        mel = mono([(s, d, m) for s, d, m, c in voice["notes"]])
        acc = [(s, d, m) for t in trs if t is not voice for s, d, m, c in t["notes"]]
        return mel, acc, "voice"
    mean = lambda t: sum(n[2] for n in t["notes"]) / len(t["notes"])
    rh = max(trs, key=mean)
    # a right hand that is mostly chords is not a clear melody
    ons = {}
    for s, d, m, c in rh["notes"]: ons.setdefault(round(s * 48), []).append(m)
    chordy = sum(1 for v in ons.values() if len(v) > 1) / max(1, len(ons))
    if chordy > 0.6: raise Drop("main droite surtout en accords")
    mel = skyline([(s, d, m) for s, d, m, c in rh["notes"]])
    acc = [(s, d, m) for t in trs for s, d, m, c in t["notes"]]
    return mel, acc, "rh"

def from_mxl(sc):
    parts = [p for p in sc["parts"] if p["notes"]]
    if len(parts) < 2: raise Drop("pas de partie voix + piano")
    voices = [p for p in parts if p["lyrics"] > 0 and not re.search(r"piano|pianoforte|klavier", p["name"], re.I)]
    if not voices: raise Drop("voix introuvable")
    if len(voices) > 1: raise Drop("plusieurs voix (duo, chœur)")
    v = voices[0]
    mel = mono([(n[0], n[1], n[2]) for n in v["notes"]])
    acc = [(n[0], n[1], n[2]) for p in parts if p is not v for n in p["notes"]]
    return mel, acc

def bars_from_mxl(sc):
    ms = sc["measures"]
    if not ms: raise Drop("pas de mesures")
    m0 = ms[1] if len(ms) > 1 and ms[0]["implicit"] else ms[0]
    meter = (m0["beats"], m0["btype"]); per = meter[0] * 4 / meter[1]
    bars = []
    for i, m in enumerate(ms):
        if (m["beats"], m["btype"]) != meter and i > 0: break
        bars.append((m["s"], m["len"]))
    # a measure split in two (anacrusis at a repeat) is not a full bar: build_song only keeps full bars after the start
    return bars, meter

# ---------------------------------------------------------------- the two sources -> candidates
def lieder_candidates(root):
    meta = read_yaml(os.path.join(root, "data", "scores.yaml"))
    comps = read_yaml(os.path.join(root, "data", "composers.yaml"))
    cby = {c.get("path"): c for c in comps.values()}
    out = []
    for sid, m in sorted(meta.items()):
        path = m.get("path")
        if not path: continue
        f = os.path.join(root, "scores", path, "lc%s.mxl" % sid)
        if not os.path.exists(f): continue
        c = cby.get(path.split("/")[0], {})
        out.append({"src": "lieder", "id": "l" + sid, "file": f, "path": path, "comp": c, "meta": m})
    return out

def process_lieder(c):
    died = int(c["comp"].get("died") or 9999)
    if died > 1945: raise Drop("compositeur mort après 1945 (%s)" % died)
    sc = parse_mxl(c["file"])
    mel, acc = from_mxl(sc)
    bars, meter = bars_from_mxl(sc)
    song = build_song(mel, acc, bars, meter, sc["tempo"], {"maxrest": 0.45})
    info = sc["info"]
    return song, {"title": info["title"], "work": info["work"], "composer": c["comp"].get("name") or info["composer"],
                  "born": c["comp"].get("born"), "died": c["comp"].get("died"), "lic": "CC0 1.0",
                  "url": "https://github.com/OpenScore/Lieder/tree/main/scores/" + c["path"].replace(" ", "%20"), "kind": "voice"}

def process_mutopia(r, midi_dir):
    f = os.path.join(midi_dir, r["id"] + ".midi")
    if not os.path.exists(f): raise Drop("MIDI non produit par LilyPond")
    mid = parse_midi(open(f, "rb").read())
    mel, acc, kind = from_midi(mid, r["inst"])
    bars, meter, stop = bars_from_midi(mid, r["pickup"])
    song = build_song(mel, acc, bars, (meter[0], meter[1]), r["tempo"], {"legato": True, "maxrest": 0.45 if kind == "voice" else 0.25})
    h = r["h"]
    return song, {"title": h.get("title") or h.get("mutopiatitle", ""), "work": h.get("opus") or h.get("mutopiaopus", ""),
                  "composer": h.get("composer", ""), "code": h.get("mutopiacomposer", ""), "date": h.get("date", ""),
                  "who": h.get("maintainer", ""), "no": r["no"], "lic": r["lic"],
                  "url": "https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=%d" % r["no"], "kind": kind, "inst": r["inst"]}

def run_all(args):
    rep = []
    if args.lieder:
        for c in lieder_candidates(args.lieder):
            row = {"id": c["id"], "src": "lieder", "path": c["path"]}
            try: song, meta = process_lieder(c); row.update(ok=True, song=song, meta=meta)
            except Drop as e: row.update(ok=False, why=str(e))
            except Exception as e: row.update(ok=False, why="lecture impossible : %s" % type(e).__name__)
            rep.append(row)
    if args.mutopia:
        for r in mut_list(os.path.join(args.mutopia, "ftp")):
            row = {"id": r["id"] or r["rel"], "src": "mutopia", "path": r["rel"], "lic": r["lic"]}
            why = mut_eligible(r)
            if why: row.update(ok=False, why=why, skip=True); rep.append(row); continue
            try: song, meta = process_mutopia(r, args.midi); row.update(ok=True, song=song, meta=meta)
            except Drop as e: row.update(ok=False, why=str(e))
            except Exception as e: row.update(ok=False, why="lecture impossible : %s" % type(e).__name__)
            rep.append(row)
    return rep


# ---------------------------------------------------------------- selection, titles, output
TITLES = json.load(open(os.path.join(HERE, "titles.json"), encoding="utf-8")) if os.path.exists(os.path.join(HERE, "titles.json")) else {}
# Mutopia composer codes -> (full name, born, died)
MUT_COMP = {
  "BachJS": ("Johann Sebastian Bach", 1685, 1750), "BachCPE": ("Carl Philipp Emanuel Bach", 1714, 1788), "BeethovenLv": ("Ludwig van Beethoven", 1770, 1827),
  "BrahmsJ": ("Johannes Brahms", 1833, 1897), "BurgmullerJFF": ("Friedrich Burgmüller", 1806, 1874), "ChopinFF": ("Frédéric Chopin", 1810, 1849),
  "ClementiM": ("Muzio Clementi", 1752, 1832), "CouperinF": ("François Couperin", 1668, 1733), "CzernyC": ("Carl Czerny", 1791, 1857),
  "DebussyC": ("Claude Debussy", 1862, 1918), "DvorakA": ("Antonín Dvořák", 1841, 1904), "FaureG": ("Gabriel Fauré", 1845, 1924),
  "FosterSC": ("Stephen Foster", 1826, 1864), "GriegE": ("Edvard Grieg", 1843, 1907), "HandelGF": ("Georg Friedrich Händel", 1685, 1759),
  "HaydnFJ": ("Joseph Haydn", 1732, 1809), "JoplinS": ("Scott Joplin", 1868, 1917), "KuhlauF": ("Friedrich Kuhlau", 1786, 1832),
  "LisztF": ("Franz Liszt", 1811, 1886), "Mendelssohn-BartholdyF": ("Felix Mendelssohn", 1809, 1847), "MozartWA": ("Wolfgang Amadeus Mozart", 1756, 1791),
  "MuellerAE": ("August Eberhard Müller", 1767, 1817), "MussorgskyM": ("Modeste Moussorgski", 1839, 1881), "PleyelIJ": ("Ignace Pleyel", 1757, 1831),
  "PurcellH": ("Henry Purcell", 1659, 1695), "RameauJP": ("Jean-Philippe Rameau", 1683, 1764), "SatieE": ("Erik Satie", 1866, 1925),
  "ScarlattiD": ("Domenico Scarlatti", 1685, 1757), "SchubertF": ("Franz Schubert", 1797, 1828), "SchumannR": ("Robert Schumann", 1810, 1856),
  "SilcherF": ("Friedrich Silcher", 1789, 1860), "StraussJJ": ("Johann Strauss II", 1825, 1899), "TchaikovskyPI": ("Piotr Ilitch Tchaïkovski", 1840, 1893),
  "WanhalJ": ("Johann Baptist Vanhal", 1739, 1813), "Anonymous": ("Anonyme", None, None), "Traditional": ("Traditionnel", None, None),
  "SaintSaensC": ("Camille Saint-Saëns", 1835, 1921), "Saint-SaensC": ("Camille Saint-Saëns", 1835, 1921)}
TIER_A = {"Bach", "Mozart", "Beethoven", "Schubert", "Schumann", "Chopin", "Brahms", "Tchaïkovski", "Händel", "Haydn", "Mendelssohn", "Grieg",
          "Satie", "Debussy", "Joplin", "Burgmüller", "Clementi", "Fauré", "Dvořák", "Liszt", "Gounod", "Bizet"}
TIER_B = {"Czerny", "Kuhlau", "Massenet", "Foster", "Silcher", "Rameau", "Scarlatti", "Purcell", "Elgar", "Wagner", "Verdi", "Rossini", "Mahler",
          "Hensel", "Viardot", "Chaminade", "Couperin", "Strauss II", "Saint-Saëns", "Müller", "Vanhal", "Pleyel", "Chausson", "Hahn", "Holmès"}
CAP = {"Schubert": 20, "Schumann": 12, "Brahms": 9, "Bach": 16, "Mozart": 8, "Beethoven": 9, "Burgmüller": 10, "Czerny": 6, "Tchaïkovski": 7,
       "Chopin": 5, "Händel": 8, "Traditionnel": 14, "Rameau": 3, "Kuhlau": 3, "Fauré": 5, "Gounod": 4, "Mendelssohn": 5, "Joplin": 4, "Grieg": 4, "Satie": 4}
# already in the base catalogue (songs-data.js): never twice
BASE_DUP = re.compile(r"BWVAnh114|WoO59|Op\.?49,? ?No\.? ?4|5_Lieder,_Op\.49/4_Wiegenlied|antre_du_roi|Mountain_King|Eine.kleine|KV525", re.I)

def surname(full):
    full = re.sub(r"\s*\(.*?\)", "", full).strip()
    if full in ("Anonyme", "Traditionnel"): return full
    if full.endswith(" II"): return full.split()[-2] + " II"
    return full.split()[-1] if full else ""

def short_name(full):
    full = re.sub(r"\s*\(.*?\)", "", full).strip()
    if full in ("Anonyme", "Traditionnel") or not full: return full or "?"
    parts = full.split()
    if parts[-1] == "II": return " ".join(p[0] + "." for p in parts[:-2]) + " " + parts[-2] + " II"
    pre = []
    for p in parts[:-1]:
        if p in ("van", "von", "de", "d’", "da"): pre.append(p)
        else: pre.append(p[0] + ".")
    return " ".join(pre + [parts[-1]])

def clean_title(t):
    t = re.sub(r",?\s*(D|Op|op|WoO|BWV|HWV|KV|K|S|Hob|CG|DO|WWV|L)\.?\s?[\dA-Za-z./-]*\d[\w./-]*.*$", "", t).strip(" ,")
    t = re.sub(r"^\d+\.?\s+", "", t)
    return t.replace("_", " ").strip() or t

def letters(x):
    import unicodedata
    x = unicodedata.normalize("NFKD", x).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z]", "", x)

def fame(meta, title):
    sn = surname(meta["composer"])
    b = 4 if sn in TIER_A else 2 if sn in TIER_B else 0
    return b, sn

def select(rep, base_ids, target):
    ok = [r for r in rep if r["ok"]]
    for r in ok:
        m = r["meta"]
        if r["src"] == "mutopia":
            fullc = MUT_COMP.get(m.get("code"), (re.sub(r"\s*\(.*?\)", "", m["composer"]), None, None))
            m["composer"] = fullc[0]; m["born"], m["died"] = fullc[1], fullc[2]
        tk = TITLES.get(r["id"], {})
        b, sn = fame(m, m["title"])
        r["sn"] = sn
        r["prio"] = r["song"]["score"] + b + (6 if tk.get("famous") else 0) + (1.5 if r["song"]["whole"] else 0) + (3 if r["src"] == "mutopia" and m.get("kind") == "rh" else 0)
        if tk.get("skip"): r["prio"] = -99
        if BASE_DUP.search(r["path"]): r["prio"] = -99; r["dup"] = "déjà dans le catalogue de base"
    # duplicates between sources: same composer + same cleaned title -> the best one (Lieder first: CC0)
    seen = {}
    for r in sorted(ok, key=lambda r: (-(r["src"] == "lieder"), -r["prio"])):
        k = (r["sn"], letters(clean_title(r["meta"]["title"]))[:16])
        if k in seen and seen[k][1] != r["src"]: r["prio"] = -99; r["dup"] = "doublon de " + seen[k][0]   # the same song in both sources
        elif k not in seen: seen[k] = (r["id"], r["src"])
    picked = []; per = {}
    for r in sorted(ok, key=lambda r: -r["prio"]):
        if r["prio"] < 0: continue
        cap = CAP.get(r["sn"], 4 if r["sn"] in TIER_A else 3 if r["sn"] in TIER_B else 1)
        if per.get(r["sn"], 0) >= cap: r["capped"] = True; continue
        per[r["sn"]] = per.get(r["sn"], 0) + 1; picked.append(r)
        if len(picked) >= target: break
    return picked

COLORS = ["#2c56d6", "#6a3fd1", "#b4461a", "#1f7a52", "#a3306b", "#0e7490", "#c9463c", "#26805a", "#8a3fd1", "#b02a6b"]
OBJS = {"lieder": ["heart", "moon", "star", "leaf", "sun", "bell"], "masters": ["staff", "crown", "palette", "planet", "globe", "heart"],
        "etudes": ["medal", "compass", "mountain", "staff", "star", "palette"], "dances": ["guitar", "fish", "sun", "castle", "compass", "apple"]}
ETUDES = re.compile(r"Burgmuller|Czerny|BWVAnh|BWV9[23]\d|KuhlauF|ClementiM|MuellerAE|TchaikovskyPI/O39|SchumannR/O15|BWV994|HandelGF/Aylesford|KV2/|PleyelIJ|WanhalJ", re.I)
DANCES = re.compile(r"^Traditional|FosterSC|JoplinS|SilcherF|StraussJJ|Anonymous", re.I)

def collection(r):
    if r["src"] == "lieder" or r["meta"].get("kind") == "voice": return "lieder"
    if DANCES.search(r["path"]): return "dances"
    if ETUDES.search(r["path"]): return "etudes"
    return "masters"

WORDS_FR = [(r"\bMinuet\b|\bMenuett\b", "Menuet"), (r"\bMarch\b", "Marche"), (r"\bWaltz\b|\bWalzer\b", "Valse"), (r"\bSonatina\b|\bSonatine\b", "Sonatine"),
            (r"\bPraeludium\b|\bPrelude\b", "Prélude"), (r"\bStudy\b|\bEtüde\b", "Étude"), (r"\bLullaby\b|\bWiegenlied\b", "Berceuse"), (r"\bSong\b", "Chanson"),
            (r"\bExercises?\b", "Exercice"), (r"\bTheme\b", "Thème"), (r"\bDance\b", "Danse"), (r"\bBourree\b", "Bourrée")]
WORDS_EN = [(r"\bMenuett?\b", "Minuet"), (r"\bMarche\b", "March"), (r"\bValse\b|\bWalzer\b", "Waltz"), (r"\bSonatine\b", "Sonatina"), (r"\bPraeludium\b|\bPrélude\b", "Prelude"),
            (r"\bÉtude\b|\bEtüde\b", "Study"), (r"\bBerceuse\b", "Lullaby"), (r"\bBourree\b", "Bourrée")]
def catalogue_no(path):
    for rx, f in ((r"BWV ?Anh\.? ?(\d+)", "BWV Anh. %s"), (r"BWV ?(\d+)", "BWV %s"), (r"KV ?(\d+)", "K. %s"), (r"HWV ?(\d+)", "HWV %s"), (r"/D(\d{2,3})/", "D. %s"),
                  (r"/O(\d+)/", "op. %s"), (r"Op_(\d+)", "op. %s"), (r"WoO ?(\d+)", "WoO %s")):
        m = re.search(rx, path)
        if m: return f % m.group(1)
    return ""
KEYNAME = re.compile(r"\s*(?:in|en)\s+[A-Ga-g](?:[- ]?(?:flat|sharp|dur|moll|bémol|dièse|b|#))?(?:\s+(?:major|minor|majeur|mineur))?\b|\s*[a-gA-G](?:is|es)?-(?:moll|dur)\b", re.I)
def auto_titles(r):
    m = r["meta"]; t = clean_title(m["title"])
    if r["src"] == "lieder": return t, t
    sw = re.search(r"swenska_folk_dansar\.(\d+)\.(\d+)", r["path"])
    if sw: return "Danse populaire suédoise (%s.%s)" % sw.groups(), "Swedish Folk Dance (%s.%s)" % sw.groups()
    t = KEYNAME.sub("", t).strip(" ,-:")
    t = re.sub(r"^(Das Wohltemperierte Clavier [I]+, )", "", t)
    no = re.search(r"No\.? ?(\d+)", m["title"])
    fr = en = t
    for rx, w in WORDS_FR: fr = re.sub(rx, w, fr)
    for rx, w in WORDS_EN: en = re.sub(rx, w, en)
    cat = catalogue_no(r["path"])
    if cat and cat not in t and len(t) < 26: fr, en = fr + " (" + cat + ")", en + " (" + cat + ")"
    return fr, en

def song_entry(r, used):
    m, s = r["meta"], r["song"]; tk = TITLES.get(r["id"], {})
    af, ae = auto_titles(r)
    fr, en = tk.get("fr") or af, tk.get("en") or ae
    base = letters(r["sn"])[:8] + letters(tk.get("slug") or en)[:12]
    sid = base or "piece"; n = 0
    while sid in used: n += 1; sid = base + "abcdefghijklmnopqrstuvwxyz"[n % 26] * (1 + n // 26)
    used.add(sid)
    c = collection(r)
    h = int(hashlib.sha1(sid.encode()).hexdigest(), 16)
    born, died = m.get("born"), m.get("died")
    dates = "%s–%s" % (born, died) if born and died else ""
    d = tk.get("d") or (m.get("date") if re.search(r"1[5-9]\d\d", m.get("date") or "") else "") or dates or "—"
    by = "trad" if m["composer"] == "Traditionnel" else short_name(m["composer"])
    src = {"t": m["title"] + ((" · " + m["work"]) if m.get("work") and m["work"] not in m["title"] else ""), "by": m["composer"], "dt": dates,
           "ed": "OpenScore Lieder" if r["src"] == "lieder" else "Mutopia Project", "lic": m["lic"], "url": m["url"]}
    if r["src"] == "mutopia": src["no"] = m["no"]; src["who"] = m.get("who") or ""
    e = {"id": sid, "t": [fr, en], "by": by, "d": str(d), "c": c, "o": OBJS[c][h % len(OBJS[c])], "k": COLORS[h % len(COLORS)],
         "bpm": int(min(tk.get("bpm") or s["bpm"], s["beats"] * 2)), "m": s["m"]}   # never under 30 s
    if by == "trad": e["from"] = tk.get("from", "se" if "swenska" in r["path"].lower() else "eu")
    elif by == "Anonyme": e["by"] = "Anon."
    if s["p"]: e["p"] = float(s["p"])
    e["mel"] = s["mel"]; e["ch"] = s["ch"]
    if not s["whole"]: e["x"] = 1
    e["src"] = src
    return e

def js_val(v):
    if isinstance(v, str): return json.dumps(v, ensure_ascii=False)
    if isinstance(v, bool): return "1" if v else "0"
    if isinstance(v, float): return fmt(v) if v != int(v) else str(int(v))
    if isinstance(v, (int,)): return str(v)
    if isinstance(v, list): return "[" + ",".join(js_val(x) for x in v) + "]"
    if isinstance(v, dict): return "{" + ",".join(("%s:%s" % (k, js_val(x))) for k, x in v.items()) + "}"
    return json.dumps(v)

HEADER = """/* Piano Challenges — catalogue libre (généré par tools/catalog/import_free.py, ne pas éditer à la main).
   %(n)d morceaux libres de droits, ajoutés au catalogue de songs-data.js (même format) quand ce fichier est chargé :
     - OpenScore Lieder (https://github.com/OpenScore/Lieder) : partitions CC0 ; on garde la mélodie de la voix
     - Mutopia Project (https://www.mutopiaproject.org) : domaine public ou Creative Commons Attribution (CC BY), jamais CC BY-SA
   Nos arrangements (versions Facile / Moyen / Avancé, main gauche tirée de l'harmonie) sont des adaptations : œuvres d'origine du
   domaine public, éditions numériques citées dans src (titre, compositeur, éditeur numérique, n° de pièce, saisie, licence, lien).
   x = 1 : extrait (du début jusqu'à une cadence). Liste complète : CREDITS-MUSIQUE.md et Réglages › Application › Crédits musicaux.
*/
"""

def write_js(entries, path):
    out = [HEADER % {"n": len(entries)}, "(function (G) {\n  const L = [\n"]
    for e in entries: out.append("  {" + ",".join("%s:%s" % (k, js_val(v)) for k, v in e.items()) + "},\n")
    out.append("""  ];
  const P = G.PC_SONG; G.PC_FREE = L;
  if (P) { const have = new Set(P.list.map(s => s.id)); L.forEach(s => { if (!have.has(s.id)) P.list.push(s); });
    ["masters", "lieder", "etudes", "dances"].forEach(c => { if (!P.COLL.includes(c)) P.COLL.push(c); }); }
})(typeof window !== "undefined" ? window : globalThis);
""")
    open(path, "w", encoding="utf-8").write("".join(out))

def write_credits(entries, path):
    L = ["# Crédits musicaux — Piano Challenges", "",
         "Les morceaux de PLAY sont des œuvres du domaine public. Les 32 morceaux du catalogue de base (`assets/js/songs-data.js`) sont des arrangements maison d'airs traditionnels et d'œuvres anciennes.",
         "Les %d morceaux de la **Bibliothèque** (`assets/js/songs-free.js`) viennent de deux éditions numériques libres :" % len(entries), "",
         "- **OpenScore Lieder** (https://github.com/OpenScore/Lieder, https://musescore.com/openscore-lieder-corpus) — licence CC0 1.0 (aucune restriction ; merci à OpenScore).",
         "- **Mutopia Project** (https://www.mutopiaproject.org) — chaque pièce a sa licence : domaine public ou Creative Commons Attribution (CC BY 2.5 / 3.0 / 4.0). Les pièces sous CC BY-SA ou sans licence claire ont été écartées.", "",
         "Nos versions sont des **adaptations** : mélodie (voix ou ligne supérieure de la main droite), main gauche simplifiée tirée de l'harmonie, transposition dans une tonalité confortable, extrait du début jusqu'à une cadence pour les pièces longues (« extrait »). Elles ne sont pas les partitions d'origine.", "",
         "| Morceau | Compositeur | Source | Saisie | Licence | Lien |", "|---|---|---|---|---|---|"]
    for e in sorted(entries, key=lambda e: (surname(e["src"]["by"]), e["t"][0])):
        s = e["src"]; ed = s["ed"] + (" n° %d" % s["no"] if s.get("no") else "")
        L.append("| %s%s | %s%s | %s | %s | %s | %s |" % (s["t"].replace("|", "/"), " (extrait)" if e.get("x") else "", s["by"], (" (" + s["dt"] + ")") if s["dt"] else "",
                 ed, s.get("who", "") or "—", s["lic"], s["url"]))
    L += ["", "Généré par `tools/catalog/import_free.py` (voir l'en-tête du script pour refaire l'import)."]
    open(path, "w", encoding="utf-8").write("\n".join(L) + "\n")

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--lieder"); ap.add_argument("--mutopia"); ap.add_argument("--midi")
    ap.add_argument("--list", help="write the Mutopia render list (TSV id<TAB>path) and stop")
    ap.add_argument("--report", default=os.path.join(HERE, "report.json"))
    ap.add_argument("--target", type=int, default=170)
    ap.add_argument("--out", default=os.path.join(ROOT, "assets", "js", "songs-free.js"))
    ap.add_argument("--credits", default=os.path.join(ROOT, "CREDITS-MUSIQUE.md"))
    ap.add_argument("--dry", action="store_true", help="report only")
    args = ap.parse_args()
    if args.list:
        rows = [r for r in mut_list(os.path.join(args.mutopia, "ftp")) if not mut_eligible(r)]
        open(args.list, "w").write("".join("%s\t%s\n" % (r["id"], r["rel"]) for r in rows)); print(len(rows), "pièces à rendre"); sys.exit(0)
    rep = run_all(args)
    base = set(re.findall(r'\bid:"([a-z]+)"', open(os.path.join(ROOT, "assets", "js", "songs-data.js"), encoding="utf-8").read()))
    picked = select(rep, base, args.target)
    used = set(base); entries = [song_entry(r, used) for r in picked]
    order = {"masters": 0, "lieder": 1, "etudes": 2, "dances": 3}
    entries.sort(key=lambda e: (order[e["c"]], surname(e["src"]["by"]), e["t"][0]))
    pk = {r["id"] for r in picked}
    slim = [{k: r[k] for k in ("id", "src", "path", "ok", "why", "dup", "capped") if k in r} | ({"picked": True} if r["id"] in pk else {}) for r in rep
            if not str(r.get("why", "")).startswith(("instrument", "pas de numéro"))]   # other instruments: not listed
    with open(args.report, "w") as f: f.write("[\n" + ",\n".join(json.dumps(x, ensure_ascii=False) for x in slim) + "\n]\n")
    ok = [r for r in rep if r["ok"]]
    print(len(rep), "examinées,", len(ok), "possibles,", len(entries), "gardées")
    if not args.dry:
        write_js(entries, args.out); write_credits(entries, args.credits)
