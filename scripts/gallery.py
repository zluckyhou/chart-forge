#!/usr/bin/env python3
"""Regenerate assets/gallery/*.png (light + dark) from assets/examples/*.json, plus the README hero.

  python3 scripts/gallery.py            # everything
  python3 scripts/gallery.py line-crossover donut-share   # just these

Needs Playwright (pip install playwright && playwright install chromium).
"""
import json, os, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
EX, GAL = os.path.join(ROOT, "assets", "examples"), os.path.join(ROOT, "assets", "gallery")
HERO = ["line-crossover", "bar-ranking", "heatmap-hours", "table-experiment"]


def render(paths, out, theme, extra=()):
    subprocess.run([sys.executable, os.path.join(HERE, "render.py"), *paths, "-o", out, "--theme", theme, "--png", *extra], check=True)


def hero(theme, png):
    """Two columns of cards on the plane, screenshotted as one image."""
    from playwright.sync_api import sync_playwright
    sys.path.insert(0, HERE)
    import render as r
    specs = [json.load(open(os.path.join(EX, n + ".json"), encoding="utf-8")) for n in HERO]
    html = r.build_html(specs, "Chart Forge", "Chart Forge", theme, True, 1464, "publish")
    html = html.replace("root.style.display = 'flex'; root.style.flexDirection = 'column'; root.style.gap = '32px';",
                        "root.style.display = 'grid'; root.style.gridTemplateColumns = 'repeat(2, max-content)'; root.style.gap = '24px'; root.style.alignItems = 'start';")
    html = html.replace('<div class="ck-page-head"', '<div class="ck-page-head" style="display:none"')
    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8") as f:
        f.write(html); tmp = f.name
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 1720, "height": 1000}, device_scale_factor=1, color_scheme=theme)
        pg.add_init_script("document.documentElement.setAttribute('data-motion','off')")
        pg.goto("file://" + tmp); pg.wait_for_timeout(800)
        pg.locator(".ck-page").screenshot(path=png)
        b.close()
    os.unlink(tmp)


def main():
    names = sys.argv[1:] or sorted(os.path.splitext(f)[0] for f in os.listdir(EX) if f.endswith(".json"))
    os.makedirs(GAL, exist_ok=True)
    tmpdir = tempfile.mkdtemp()
    for n in names:
        for theme, suffix in (("light", ""), ("dark", "-dark")):
            out = os.path.join(tmpdir, n + suffix + ".html")
            render([os.path.join(EX, n + ".json")], out, theme, ("--register", "publish"))
            os.replace(os.path.splitext(out)[0] + ".png", os.path.join(GAL, n + suffix + ".png"))
    if not sys.argv[1:] or any(n in HERO for n in names):
        hero("light", os.path.join(GAL, "hero.png")); hero("dark", os.path.join(GAL, "hero-dark.png"))
    print("gallery updated:", GAL)


if __name__ == "__main__":
    main()
