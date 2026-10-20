# Builds the keyboard buying guide: /clavier/index.html (FR) and /keyboard/index.html (EN)
# from tools/keyboards.json. Usage (from the repo root): python3 tools/build_keyboard_guide.py
# Photos: put <id>.jpg (or .webp/.png) in assets/claviers/ (tools/fetch_keyboard_images.py does it);
# a model without a photo gets a drawn keyboard instead.
import json, pathlib, html, urllib.parse, datetime

ROOT = pathlib.Path(__file__).resolve().parent.parent
D = json.loads((ROOT / "tools/keyboards.json").read_text(encoding="utf-8"))
AFF = D["affiliate"]
IMG_DIR = ROOT / "assets/claviers"
esc = lambda s: html.escape(str(s), quote=True)

RETAILERS = [("amazon", "Amazon"), ("thomann", "Thomann"), ("woodbrass", "Woodbrass"), ("gear4music", "Gear4music"), ("official", None)]

def aff(rid, url):
    """Turn a plain product URL into a tracked affiliate link when the ids are filled in keyboards.json."""
    if rid == "amazon" and AFF.get("amazonTag"):
        return url + ("&" if "?" in url else "?") + "tag=" + urllib.parse.quote(AFF["amazonTag"])
    mid = {"woodbrass": AFF.get("woodbrassAwinMid"), "gear4music": AFF.get("gear4musicAwinMid")}.get(rid)
    if mid and AFF.get("awinAffId"):
        return f"https://www.awin1.com/cread.php?awinmid={mid}&awinaffid={AFF['awinAffId']}&ued={urllib.parse.quote(url, safe='')}"
    return url

T = {
 "fr": dict(lang="fr", path="/clavier/", other="/keyboard/", otherLabel="English", title="Quel clavier MIDI pour iPad ? Guide d'achat · Piano Challenges",
   desc="13 claviers MIDI compatibles iPad et tablette, en Bluetooth ou USB : piles ou batterie, autonomie, nombre de touches. Notre top 3 pour jouer avec Piano Challenges.",
   eyebrow="Guide d'achat", h1="Quel clavier pour jouer avec <em>Piano Challenges</em>&nbsp;?",
   lede="13 claviers qui se branchent à un iPad ou une tablette, en Bluetooth ou en USB. Filtre selon ton usage : sans fil, sur piles, nombre de touches, budget. Nos trois coups de cœur sont juste en dessous.",
   kbAria="Clavier dont les touches s'allument une à une, comme dans l'application",
   top="Notre top 3", topSub="Choisis pour jouer avec une app : connexion facile, confort de jeu et rapport qualité-prix.",
   all="Tous les claviers", allSub="Classés par popularité de vente estimée (meilleures ventes Amazon, Thomann, eBay).",
   models="modèles", reset="Tout réinitialiser", hideF="Masquer les filtres", showF="Afficher les filtres", sortBy="Trier par",
   sorts=[("rank","Popularité"),("price","Prix croissant"),("auto","Autonomie"),("keys","Nombre de touches")],
   empty="Aucun clavier ne correspond à tous ces critères. Retire un filtre pour élargir la sélection.",
   keys="Touches", power="Alimentation", auto="Autonomie", budget="Budget", approx="Environ {} h", noBatt="Sans batterie", unknown="Non publiée",
   kk={"mini":"Touches mini","full":"Pleine taille","weighted":"Lestées"},
   price={1:"Moins de 150 €",2:"150 à 300 €",3:"Plus de 300 €"},
   b=dict(bt="Bluetooth", btOpt="Bluetooth en option", usb="USB", interne="Batterie rechargeable", piles="Sur piles", speaker="Haut-parleurs", lit="Touches lumineuses"),
   groups=[("conn","Connexion",[("bt","Bluetooth"),("usb","USB seulement")]),("power","Alimentation",[("interne","Batterie"),("piles","Piles AA"),("bus","Par la tablette"),("secteur","Secteur")]),
     ("size","Touches",[("s","25-37"),("m","49-61"),("l","76-88")]),("kk","Toucher",[("mini","Mini"),("full","Pleine taille"),("weighted","Lestées")]),
     ("tier","Budget",[("1","< 150 €"),("2","150-300 €"),("3","> 300 €")]),("extra","Bonus",[("speaker","Haut-parleurs"),("lit","Touches lumineuses")])],
   how="Brancher ton clavier en 3 étapes",
   steps=[("En USB","iPad USB-C : un câble USB-C direct. iPad Lightning : l'adaptateur Apple Lightning vers USB 3 pour appareil photo, avec sa prise de recharge."),
          ("En Bluetooth","Allume le clavier, puis appaire-le depuis l'écran MIDI de l'app, et non depuis Réglages › Bluetooth."),
          ("Joue","Lance un défi : l'app reconnaît chaque note jouée. Sur Android, l'USB est plus fiable que le Bluetooth.")],
   cta="Ouvrir Piano Challenges", official="Site officiel", buyAt="Voir chez", photo="Photo",
   drawn="Illustration : clavier {} touches",
   disc1="<strong>Liens affiliés.</strong> Certains liens de cette page sont des liens partenaires : si tu achètes après avoir cliqué, Piano Challenges peut toucher une commission, sans surcoût pour toi. En tant que Partenaire Amazon, nous réalisons un bénéfice sur les achats remplissant les conditions requises.",
   copyright="© 2026 Antoine Bernard · Tous droits réservés.",
   disc2="Prix en fourchettes indicatives, autonomies selon les fabricants. Aucune marque ne publie ses ventes par modèle : le classement est une estimation. Photos : © les fabricants. Mise à jour : {}.",
   legal="Mentions légales", privacy="Confidentialité"),
 "en": dict(lang="en", path="/keyboard/", other="/clavier/", otherLabel="Français", title="Best MIDI keyboard for iPad? Buying guide · Piano Challenges",
   desc="13 MIDI keyboards that work with an iPad or tablet over Bluetooth or USB: batteries, battery life, number of keys. Our top 3 to play Piano Challenges.",
   eyebrow="Buying guide", h1="Which keyboard should you play <em>Piano Challenges</em> on?",
   lede="13 keyboards that connect to an iPad or tablet over Bluetooth or USB. Filter by what matters to you: wireless, battery powered, number of keys, budget. Our three favourites are right below.",
   kbAria="Keyboard whose keys light up one by one, as in the app",
   top="Our top 3", topSub="Picked for playing with an app: easy connection, playing comfort and value for money.",
   all="All keyboards", allSub="Ranked by estimated sales popularity (Amazon, Thomann and eBay best-seller lists).",
   models="models", reset="Reset all", hideF="Hide filters", showF="Show filters", sortBy="Sort by",
   sorts=[("rank","Popularity"),("price","Price, low to high"),("auto","Battery life"),("keys","Number of keys")],
   empty="No keyboard matches all of these filters. Remove one to widen the selection.",
   keys="Keys", power="Power", auto="Battery life", budget="Budget", approx="About {} h", noBatt="No battery", unknown="Not published",
   kk={"mini":"Mini keys","full":"Full-size","weighted":"Weighted"},
   price={1:"Under €150",2:"€150 to €300",3:"Over €300"},
   b=dict(bt="Bluetooth", btOpt="Optional Bluetooth", usb="USB", interne="Rechargeable battery", piles="Battery powered", speaker="Speakers", lit="Light-up keys"),
   groups=[("conn","Connection",[("bt","Bluetooth"),("usb","USB only")]),("power","Power",[("interne","Battery"),("piles","AA batteries"),("bus","From the tablet"),("secteur","Mains")]),
     ("size","Keys",[("s","25-37"),("m","49-61"),("l","76-88")]),("kk","Feel",[("mini","Mini"),("full","Full-size"),("weighted","Weighted")]),
     ("tier","Budget",[("1","< €150"),("2","€150-300"),("3","> €300")]),("extra","Extras",[("speaker","Speakers"),("lit","Light-up keys")])],
   how="Connect your keyboard in 3 steps",
   steps=[("Over USB","USB-C iPad: a direct USB-C cable. Lightning iPad: Apple's Lightning to USB 3 Camera Adapter, with its charging port."),
          ("Over Bluetooth","Turn the keyboard on, then pair it from the app's MIDI screen, not from Settings › Bluetooth."),
          ("Play","Start a challenge: the app recognises every note you play. On Android, USB is more reliable than Bluetooth.")],
   cta="Open Piano Challenges", official="Official site", buyAt="View at", photo="Photo",
   drawn="Illustration: {}-key keyboard",
   disc1="<strong>Affiliate links.</strong> Some links on this page are partner links: if you buy after clicking, Piano Challenges may earn a commission at no extra cost to you. As an Amazon Associate we earn from qualifying purchases.",
   copyright="© 2026 Antoine Bernard · All rights reserved.",
   disc2="Prices shown as rough ranges, battery life as stated by manufacturers. No brand publishes per-model sales, so the ranking is an estimate. Photos © their manufacturers. Updated: {}.",
   legal="Legal notice", privacy="Privacy"),
}

BLACK = {1, 3, 6, 8, 10}
START = {25: 0, 37: 0, 49: 0, 61: 0, 76: 4, 88: 9}

def kb_svg(m, label):
    n, start = m["keys"], START.get(m["keys"], 0)
    notes = [(start + i) % 12 for i in range(n)]
    whites = sum(1 for x in notes if x not in BLACK)
    W, pad = 1000, 22
    mini = m["kk"] == "mini"
    top, kh = (44, 76) if mini else (30, 98)
    H = top + kh + 16
    ww = (W - 2 * pad) / whites
    light = m["body"].lower()[1] in "cdef"
    knob = "#b9bcc3" if light else "#454952"
    s = [f'<svg viewBox="0 0 {W} {H}" role="img" aria-label="{esc(label)}"><rect width="{W}" height="{H}" rx="18" fill="{m["body"]}"/>']
    if mini:
        s += [f'<rect x="{pad+p*34}" y="10" width="26" height="24" rx="5" fill="{knob}"/>' for p in range(4)]
        s += [f'<circle cx="{W-pad-14-k*34}" cy="22" r="10" fill="{knob}"/>' for k in range(3)]
    else:
        s.append(f'<rect x="{W/2-60}" y="10" width="120" height="10" rx="5" fill="{knob}"/>')
    lit = {0, 2, 4, 5, 7, 9, 11} if m.get("lit") else set()
    wi = 0
    for i, nt in enumerate(notes):
        if nt not in BLACK:
            fill = "#46c6de" if (nt in lit and i < 24) else "#fbfbf8"
            s.append(f'<rect x="{pad+wi*ww:.1f}" y="{top}" width="{ww-1.6:.1f}" height="{kh}" rx="2" fill="{fill}"/>')
            wi += 1
    wi = 0
    for nt in notes:
        if nt in BLACK:
            s.append(f'<rect x="{pad+wi*ww-ww*0.32:.1f}" y="{top}" width="{ww*0.62:.1f}" height="{kh*0.6:.1f}" rx="2" fill="#141518"/>')
        else:
            wi += 1
    return "".join(s) + "</svg>"

def photo(m):
    for ext in ("webp", "jpg", "jpeg", "png"):
        if (IMG_DIR / f"{m['id']}.{ext}").exists():
            return f"/assets/claviers/{m['id']}.{ext}"
    return None

def visual(m, t, eager=False):
    p = photo(m)
    alt = f"{m['brand']} {m['name']}"
    if p:
        return f'<img src="{p}" alt="{esc(alt)}" width="600" height="300" {"" if eager else "loading=\"lazy\" "}decoding="async">'
    return kb_svg(m, t["drawn"].format(m["keys"]))

def badges(m, t):
    b = t["b"]; out = []
    if m["bt"]: out.append(f'<span class="badge bt">{b["btOpt"] if m.get("btOpt") else b["bt"]}</span>')
    out.append(f'<span class="badge">{b["usb"]}</span>')
    if m["power"] in ("interne", "piles"): out.append(f'<span class="badge batt">{b[m["power"]]}</span>')
    if m.get("speaker"): out.append(f'<span class="badge">{b["speaker"]}</span>')
    if m.get("lit"): out.append(f'<span class="badge bt">{b["lit"]}</span>')
    return "".join(out)

def buy(m, t):
    out = []
    for i, (rid, name) in enumerate(RETAILERS):
        url = m["links"].get(rid)
        if not url: continue
        name = name or t["official"]
        out.append(f'<a class="{"main" if not out else ""}" href="{esc(aff(rid, url))}" target="_blank" rel="sponsored noopener" aria-label="{esc(t["buyAt"]+" "+name+" : "+m["brand"]+" "+m["name"])}">{name}</a>')
    return "".join(out)

def auto_txt(m, t, L):
    if L.get("auto"): return L["auto"]
    if m["auto"]: return t["approx"].format(m["auto"])
    return t["unknown"] if m["power"] == "piles" else t["noBatt"]

def card(m, t):
    L = m[t["lang"]]
    size = "s" if m["keys"] <= 37 else ("m" if m["keys"] <= 61 else "l")
    data = f'data-rank="{m["rank"]}" data-tier="{m["tier"]}" data-auto="{m["auto"] or 0}" data-keys="{m["keys"]}" data-conn="{"bt" if m["bt"] else "usb"}" data-power="{m["power"]}" data-size="{size}" data-kk="{m["kk"]}" data-extra="{" ".join(x for x in ("speaker","lit") if m.get(x))}"'
    return f'''<article class="card" id="{m["id"]}" {data}>
<div class="visual"><span class="rank">#{m["rank"]}</span>{visual(m, t)}</div>
<div class="body"><div class="brand">{esc(m["brand"])}</div><h3>{esc(m["name"])}</h3>
<div class="badges">{badges(m, t)}</div>
<dl class="specs"><dt>{t["keys"]}</dt><dd>{m["keys"]} · {t["kk"][m["kk"]]}</dd><dt>{t["power"]}</dt><dd>{esc(L["power"])}</dd><dt>{t["auto"]}</dt><dd>{esc(auto_txt(m, t, L))}</dd><dt>{t["budget"]}</dt><dd>{t["price"][m["tier"]]}</dd></dl>
<p class="note">{esc(L["note"])}</p>
<div class="buy">{buy(m, t)}</div></div></article>'''

def pick(i, p, t, byid):
    m = byid[p["id"]]; tag, why = p[t["lang"]]
    return f'''<article class="pick{" first" if i == 0 else ""}"><span class="pick-tag">{esc(tag)}</span>
<div class="visual">{visual(m, t, eager=True)}</div>
<div class="brand">{esc(m["brand"])}</div><h3>{esc(m["name"])}</h3><p>{esc(why)}</p>
<div class="badges">{badges(m, t)}</div><div class="buy">{buy(m, t)}</div></article>'''

CSS = (ROOT / "tools/keyboard_guide.css").read_text(encoding="utf-8")
JS = (ROOT / "tools/keyboard_guide.js").read_text(encoding="utf-8")

def page(t):
    byid = {m["id"]: m for m in D["models"]}
    models = sorted(D["models"], key=lambda m: m["rank"])
    today = datetime.date.today()
    upd = today.strftime("%d/%m/%Y") if t["lang"] == "fr" else today.strftime("%-d %B %Y")
    groups = "".join(f'<div class="fgroup" role="group" aria-label="{g}"><span class="flabel">{g}</span>' + "".join(
        f'<button type="button" class="chip" data-g="{k}" data-v="{v}" aria-pressed="false">{l}</button>' for v, l in opts) + "</div>" for k, g, opts in t["groups"])
    sorts = "".join(f'<option value="{v}">{l}</option>' for v, l in t["sorts"])
    steps = "".join(f"<li><h3>{a}</h3><p>{b}</p></li>" for a, b in t["steps"])
    ld = {"@context": "https://schema.org", "@type": "ItemList", "name": t["all"], "itemListElement": [
        {"@type": "ListItem", "position": m["rank"], "name": f'{m["brand"]} {m["name"]}', "url": f'https://pianochallenges.com{t["path"]}#{m["id"]}'} for m in models]}
    return f'''<!doctype html>
<html lang="{t["lang"]}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{t["title"]}</title>
<meta name="description" content="{esc(t["desc"])}">
<link rel="canonical" href="https://pianochallenges.com{t["path"]}">
<link rel="alternate" hreflang="fr" href="https://pianochallenges.com/clavier/">
<link rel="alternate" hreflang="en" href="https://pianochallenges.com/keyboard/">
<link rel="alternate" hreflang="x-default" href="https://pianochallenges.com/keyboard/">
<meta property="og:type" content="article">
<meta property="og:url" content="https://pianochallenges.com{t["path"]}">
<meta property="og:title" content="{esc(t["title"])}">
<meta property="og:description" content="{esc(t["desc"])}">
<meta property="og:image" content="https://pianochallenges.com/og-image.png">
<meta name="theme-color" content="#eceef2" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#111318" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/assets/fonts/bricolage-grotesque-latin-800-normal.woff2" as="font" type="font/woff2" crossorigin>
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
<style>
{CSS}
</style>
</head>
<body>
<nav class="top"><div class="wrap topin"><a class="logo" href="/">Piano Challenges</a><a class="langlink" href="{t["other"]}" hreflang="{"en" if t["lang"]=="fr" else "fr"}">{t["otherLabel"]}</a></div></nav>
<div class="wrap">
<header class="hero">
<div><div class="eyebrow">{t["eyebrow"]} · Piano Challenges</div><h1>{t["h1"]}</h1><p class="lede">{t["lede"]}</p></div>
<svg class="hero-kb" id="heroKb" viewBox="0 0 980 150" role="img" aria-label="{esc(t["kbAria"])}"></svg>
</header>
<section class="sec" aria-labelledby="top3"><div class="sec-head"><h2 id="top3">{t["top"]}</h2><p>{t["topSub"]}</p></div>
<div class="podium">{"".join(pick(i, p, t, byid) for i, p in enumerate(D["top"]))}</div></section>
<section class="sec" aria-labelledby="all"><div class="sec-head"><h2 id="all">{t["all"]}</h2><p>{t["allSub"]}</p></div>
<div class="filters" id="filters"><div class="frow" id="frow">{groups}</div>
<div class="fmeta"><span><strong id="count">{len(models)}</strong> {t["models"]} · <button class="linkbtn" id="reset" type="button">{t["reset"]}</button> <button class="linkbtn filter-toggle" id="ftoggle" type="button" aria-expanded="true" data-hide="{t["hideF"]}" data-show="{t["showF"]}">{t["hideF"]}</button></span>
<label for="sort">{t["sortBy"]} <select id="sort">{sorts}</select></label></div></div>
<div class="grid" id="grid">{"".join(card(m, t) for m in models)}</div>
<p class="empty" id="empty" hidden>{t["empty"]}</p></section>
<section class="sec" aria-labelledby="howto"><div class="sec-head"><h2 id="howto">{t["how"]}</h2></div><ol class="steps">{steps}</ol>
<p class="cta-row"><a class="cta" href="/">{t["cta"]}</a></p></section>
<footer><p>{t["disc1"]}</p><p>{t["disc2"].format(upd)}</p><p><a href="/mentions-legales.html">{t["legal"]}</a> · <a href="/confidentialite.html">{t["privacy"]}</a></p><p>{t["copyright"]}</p></footer>
</div>
<script>
{JS}
</script>
</body>
</html>
'''

for lang in ("fr", "en"):
    t = T[lang]
    out = ROOT / t["path"].strip("/") / "index.html"
    out.parent.mkdir(exist_ok=True)
    out.write_text(page(t), encoding="utf-8")
    print(out.relative_to(ROOT), out.stat().st_size)
