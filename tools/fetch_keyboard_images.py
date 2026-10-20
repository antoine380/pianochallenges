# Downloads the official product photo of each keyboard listed in tools/keyboards.json ("image" field)
# into assets/claviers/<id>.jpg (white background, 800 px wide max), then rebuilds the guide pages.
# Usage (from the repo root): pip install pillow && python3 tools/fetch_keyboard_images.py [--force]
# Runs automatically in GitHub Actions (.github/workflows/keyboard-images.yml).
import json, pathlib, sys, io, urllib.request, subprocess
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "assets/claviers"; OUT.mkdir(parents=True, exist_ok=True)
data = json.loads((ROOT / "tools/keyboards.json").read_text(encoding="utf-8"))
force = "--force" in sys.argv
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
ok, failed = [], []
for m in data["models"]:
    url, dest = m.get("image"), OUT / f"{m['id']}.jpg"
    if not url or (dest.exists() and not force):
        continue
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "image/avif,image/webp,image/png,image/jpeg,*/*"})
        raw = urllib.request.urlopen(req, timeout=30).read()
        im = Image.open(io.BytesIO(raw))
        im.load()
        if im.mode in ("RGBA", "LA", "P"):
            im = im.convert("RGBA")
            bg = Image.new("RGB", im.size, (255, 255, 255)); bg.paste(im, mask=im.split()[-1]); im = bg
        else:
            im = im.convert("RGB")
        if im.width > 800:
            im = im.resize((800, round(im.height * 800 / im.width)), Image.LANCZOS)
        im.save(dest, "JPEG", quality=84, optimize=True, progressive=True)
        ok.append(m["id"])
    except Exception as e:
        failed.append(f"{m['id']}: {e}")
print("downloaded:", ", ".join(ok) or "none")
if failed:
    print("failed:\n  " + "\n  ".join(failed))
subprocess.run([sys.executable, str(ROOT / "tools/build_keyboard_guide.py")], check=True)
