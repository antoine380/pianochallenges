# Construit index.html (racine, servi par OVH et copié dans l'app) à partir de la source découpée src/app/ (voir src/app/README.md).
# Usage (racine du dépôt) :
#   python3 tools/build.py            → index.html, version.txt, live/ (mise à jour à distance de l'app)
#   python3 tools/build.py --single   → build/piano-challenges.html seulement : la page complète, prévisualisable seule
#                                       (polices Google, Supabase via jsdelivr ; ancien src/piano-challenges.html)
import re, pathlib, sys
ROOT=pathlib.Path(__file__).resolve().parent.parent
APP=ROOT/"src/app"
HDR=re.compile(r'// fragment [^\n]*voir src/app/README\.md\n')
def assemble():
    """Concatène src/app/** dans l'ordre de src/app/order.txt (sans la 1re ligne « // fragment … » des .js). Même logique : tools/source.mjs."""
    out=[]
    for rel in (APP/"order.txt").read_text(encoding="utf-8").split("\n"):
        rel=rel.strip()
        if not rel or rel.startswith("#"): continue
        s=(APP/rel).read_text(encoding="utf-8")
        if rel.endswith(".js"):
            m=HDR.match(s); assert m, "src/app/"+rel+" : 1re ligne « // fragment … voir src/app/README.md » manquante"
            s=s[m.end():]
        assert s.endswith("\n"), "src/app/"+rel+" doit finir par un retour à la ligne"
        out.append(s)
    return "".join(out)
SRC=assemble()
if "--single" in sys.argv[1:]:
    (ROOT/"build").mkdir(exist_ok=True)
    (ROOT/"build/piano-challenges.html").write_text(SRC,encoding="utf-8",newline="")
    print("build/piano-challenges.html", len(SRC.encode("utf-8")))
    sys.exit(0)
body=SRC
for pat in [r'<title>.*?</title>\n', r'<meta name="claude:viewport-fit-sides"[^>]*>\n', r'<link rel="preconnect"[^>]*>\n', r'<link rel="stylesheet" href="https://fonts.googleapis.com[^>]*>\n']:
    body, n = re.subn(pat, '', body, count=2); assert n>=1, pat
faces=[("Fredoka","fredoka",[600,700]),("Nunito","nunito",[500,600,700,800])]
ff="\n".join(f"@font-face{{font-family:\"{name}\";font-style:normal;font-weight:{w};font-display:swap;src:url(/assets/fonts/{slug}-latin-{w}-normal.woff2) format(\"woff2\")}}" for name,slug,ws in faces for w in ws)
DESC_EN="Learn piano scales, chords, inversions, harmony and chord progressions by playing on your own piano (MIDI or mic). Ear training, daily practice, levels and challenges."
head=f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,interactive-widget=resizes-content">
<title>Piano Challenges · Scales, chords and progressions on your piano</title>
<meta name="description" content="{DESC_EN}">
<link rel="canonical" href="https://pianochallenges.com/">
<meta name="theme-color" content="#f1f2fb" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#15122e" media="(prefers-color-scheme: dark)">
<meta property="og:type" content="website">
<meta property="og:url" content="https://pianochallenges.com/">
<meta property="og:title" content="Piano Challenges">
<meta property="og:description" content="{DESC_EN}">
<meta property="og:image" content="https://pianochallenges.com/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Piano Challenges">
<link rel="preload" href="/assets/fonts/fredoka-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/nunito-latin-500-normal.woff2" as="font" type="font/woff2" crossorigin>
<style>
{ff}
html{{color-scheme:light;-webkit-text-size-adjust:100%}}
body{{margin:0}}
img{{max-width:100%}}
</style>
</head>
<body>
'''
# version de la construction, lue par l'app (APP_BUILD : événements de mesure, « Signaler un problème ») et par le back office (version.txt)
# PC_BUILD_STAMP=<horodatage> refait exactement une construction déjà commitée (la CI vérifie ainsi que index.html, version.txt et live/ sont à jour).
import os
STAMP=os.environ.get("PC_BUILD_STAMP") or __import__("datetime").datetime.now(__import__("datetime").timezone.utc).strftime("%Y-%m-%dT%H:%MZ")
assert 'const APP_BUILD="dev";' in body
body=body.replace('const APP_BUILD="dev";','const APP_BUILD="'+STAMP+'";',1)
body=body.replace("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/dist/umd/supabase.js","/assets/js/supabase-2.116.0.js")
assert "/assets/js/supabase-2.116.0.js" in body
out=head+body+"\n</body>\n</html>\n"
(ROOT/"index.html").write_text(out,encoding="utf-8")
(ROOT/"version.txt").write_text(STAMP+"\n")
print("index.html", len(out))
# Mise à jour à distance de l'app iOS : live/manifest.json (+ live/files/) = la version que l'app installée télécharge seule.
# À publier avec index.html et version.txt (même commit). Sans Node, l'app garde simplement la version précédente.
import subprocess, shutil
if shutil.which("node"):
    subprocess.run(["node", str(ROOT/"tools/live_manifest.mjs")], check=True)
else:
    print("ATTENTION : node introuvable, live/manifest.json n'est pas à jour (l'app iOS ne verra pas cette version)")
