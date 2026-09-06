#!/usr/bin/env python3
"""Chart Forge renderer: JSON spec(s) -> one self-contained interactive HTML page (optionally a PNG).

Usage:
  python3 render.py spec.json                      # writes spec.html next to the spec
  python3 render.py a.json b.json -o report.html   # several charts stacked on one page
  python3 render.py spec.json --png                # also screenshots the chart card(s) via Playwright
  python3 render.py spec.json --png --theme dark   # force a theme (default: follows the OS, with an in-page toggle)
  python3 render.py spec.json --register publish   # publish register: toolbar hidden until hover, never in the PNG
  python3 render.py spec.json --no-webfont         # skip the Google Fonts link (offline / intranet)
  python3 render.py --validate spec.json           # check the spec shape only, render nothing

Output HTML has zero external dependencies except the optional Google Fonts link.
"""
import argparse, json, os, sys, math

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(os.path.dirname(HERE), "assets")
FONT_LINK = ('<link rel="preconnect" href="https://fonts.googleapis.com">'
             '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
             '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Noto+Sans+SC:wght@400;500;600&display=swap">')
TYPES = {"bar", "line", "area", "candle", "donut", "scatter", "heatmap", "funnel", "kpi", "table",
         "waffle", "unit", "dotmatrix", "statuswall"}
# The unit family encodes COUNT, not length. Two limits are enforced below: the quantity has to be
# countable (so no continuous measure and no time series), and the marks have to stay countable —
# past roughly 150 of them nobody counts, they estimate, and a bar chart does that better.


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def validate(spec, path="spec"):
    """Return a list of problems (empty = ok). Mirrors the contract in references/spec.md."""
    errs = []
    t = spec.get("type")
    if t not in TYPES:
        return [f"{path}: type must be one of {sorted(TYPES)}, got {t!r}"]
    if spec.get("style", "studio") not in ("studio", "classic"):
        errs.append(f"{path}: style must be one of studio, classic")
    sp = spec.get("spotlight")
    if sp is not None:
        if t not in ("line", "area") or not isinstance(sp, dict):
            errs.append(f"{path}: spotlight is required to be an object on a line or area chart")
        else:
            matches = [s for s in (spec.get("data") or {}).get("series", []) if s.get("name") == sp.get("series")]
            if len(matches) != 1:
                errs.append(f"{path}: spotlight.series is required to match exactly one series")
            elif not matches[0].get("values") or not isinstance(matches[0]["values"][-1], (int, float)) or not math.isfinite(matches[0]["values"][-1]):
                errs.append(f"{path}: spotlight is required to have a finite latest value")
            if sp.get("compare") not in (None, "previous"):
                errs.append(f"{path}: spotlight.compare must be one of previous or omitted")
    d = spec.get("data")
    if not isinstance(d, dict):
        return [f"{path}: no data object"]
    def need(keys):
        for k in keys:
            if k not in d:
                errs.append(f"{path}: data.{k} is required for a {t} chart")
    if (spec.get("options") or {}).get("difference"):
        ss = d.get("series", [])
        if t != "line" or len(ss) != 2 or not d.get("x") or any(not isinstance(v, (int,float)) or not math.isfinite(v) for sr in ss for v in sr.get("values", [])):
            errs.append(f"{path}: difference is required to use a line with exactly two complete finite series")
    if spec.get("layout") not in (None, "feature"):
        errs.append(f"{path}: layout must be one of feature or omitted")
    if t == "bar":
        need(["categories", "series"])
        if "series" in d:
            for s in d["series"]:
                if len(s.get("values", [])) != len(d.get("categories", [])):
                    errs.append(f"{path}: series {s.get('name')!r} has {len(s.get('values', []))} values for {len(d.get('categories', []))} categories")
    elif t in ("line", "area"):
        need(["x", "series"])
        if "series" in d:
            for s in d["series"]:
                if len(s.get("values", [])) != len(d.get("x", [])):
                    errs.append(f"{path}: series {s.get('name')!r} has {len(s.get('values', []))} values for {len(d.get('x', []))} x entries")
    elif t == "candle":
        need(["x", "candles"])
        if len(d.get("candles", [])) != len(d.get("x", [])):
            errs.append(f"{path}: candles and x must be the same length")
        for i, c in enumerate(d.get("candles", [])):
            if not all(k in c for k in ("o", "h", "l", "c")):
                errs.append(f"{path}: candles[{i}] needs o, h, l and c")
                break
            if not (c["l"] <= min(c["o"], c["c"]) and c["h"] >= max(c["o"], c["c"])):
                errs.append(f"{path}: candles[{i}] breaks l <= min(o,c) <= max(o,c) <= h")
                break
    elif t == "donut":
        need(["items"])
        if len(d.get("items", [])) < 2:
            errs.append(f"{path}: a donut needs at least 2 items — for a single number use kpi")
    elif t == "scatter":
        need(["points"])
        groups = {p.get("group", "_all") for p in d.get("points", [])}
        if len(groups) > 3:
            errs.append(f"{path}: {len(groups)} scatter groups — past 3 the colours stop being distinguishable as dots; merge into Other or facet")
    elif t == "heatmap":
        need(["rows", "cols"])
        if "values" not in d and "metrics" not in d:
            errs.append(f"{path}: heatmap needs data.values or data.metrics")
    elif t == "funnel":
        need(["steps"])
        vals = [s.get("value", 0) for s in d.get("steps", [])]
        if any(b > a for a, b in zip(vals, vals[1:])):
            errs.append(f"{path}: funnel steps must decrease — check the order")
    elif t == "kpi":
        need(["items"])
    elif t == "waffle":
        need(["items"])
        items = d.get("items", [])
        if len(items) < 2:
            errs.append(f"{path}: a waffle needs at least 2 items — for a single number use kpi")
        if len(items) > 6:
            errs.append(f"{path}: {len(items)} waffle groups — past 6 the marks stop being countable; fold the tail into Other")
        if any((it.get("value") or 0) < 0 for it in items):
            errs.append(f"{path}: waffle values must be >= 0 — a count cannot be negative")
        o = spec.get("options") or {}
        cells = (o.get("cols") or 10) * -(-int(o.get("total") or round(sum((it.get("value") or 0) for it in items)) or 100) // (o.get("cols") or 10))
        if cells > 200:
            errs.append(f"{path}: {cells} waffle cells — past ~150 nobody counts them; raise the unit or use bar")
    elif t == "unit":
        need(["categories", "series"])
        cats, ser = d.get("categories", []), d.get("series", [])
        for sr in ser:
            if len(sr.get("values", [])) != len(cats):
                errs.append(f"{path}: series {sr.get('name')!r} has {len(sr.get('values', []))} values for {len(cats)} categories")
        if len(ser) > 4:
            errs.append(f"{path}: {len(ser)} unit series — shape is the second channel here and only ~4 silhouettes stay apart; merge the tail")
        one = (spec.get("options") or {}).get("per") or 1
        tallest = max([sum((sr.get("values") or [0])[i] or 0 for sr in ser) for i in range(len(cats))] or [0])
        if one and tallest / one > 30:
            errs.append(f"{path}: tallest column is {tallest / one:.0f} marks — past ~30 nobody counts; raise options.per or use bar")
    elif t == "dotmatrix":
        need(["rows", "cols", "values"])
        vals = d.get("values", [])
        if len(vals) != len(d.get("rows", [])):
            errs.append(f"{path}: values has {len(vals)} rows for {len(d.get('rows', []))} row labels")
        for i, row in enumerate(vals):
            if len(row) != len(d.get("cols", [])):
                errs.append(f"{path}: values[{i}] has {len(row)} cells for {len(d.get('cols', []))} columns")
                break
    elif t == "statuswall":
        need(["items"])
        states = {sd.get("key") for sd in d.get("states", [])}
        if not states:
            errs.append(f"{path}: statuswall needs data.states — every state carries its own label, colour and silhouette")
        if len(states) > 5:
            errs.append(f"{path}: {len(states)} states — past 5 the silhouettes start interfering; group the tail")
        unknown = sorted({it.get("status") for it in d.get("items", [])} - states)
        if unknown:
            errs.append(f"{path}: items use statuses not declared in data.states: {unknown}")
    elif t == "table":
        need(["columns", "rows"])
        keys = {c.get("key") for c in d.get("columns", [])}
        if None in keys:
            errs.append(f"{path}: every column needs a key")
        for c in d.get("columns", []):
            if not c.get("label"):
                errs.append(f"{path}: column {c.get('key')!r} has no label")
        if sum(1 for c in d.get("columns", []) if c.get("sticky")) > 1:
            errs.append(f"{path}: at most one sticky column")
    series = d.get("series") or []
    if len(series) > 8:
        errs.append(f"{path}: {len(series)} series — fold the tail into Other or use small multiples (8 max)")
    if not spec.get("title") and t != "kpi":
        errs.append(f"{path}: no title — the title is the conclusion, not the metric name")
    return errs


def build_html(specs, title, page_title, theme, webfont, width, register="analyse"):
    tpl = read(os.path.join(ASSETS, "templates", "page.html"))
    html = (tpl.replace("{{CSS}}", read(os.path.join(ASSETS, "chartkit.css")))
               .replace("{{JS}}", read(os.path.join(ASSETS, "chartkit.js")))
               .replace("{{SPECS}}", json.dumps(specs, ensure_ascii=False).replace("</", "<\\/"))
               .replace("{{TITLE}}", esc(title)).replace("{{PAGE_TITLE}}", esc(page_title))
               .replace("{{WIDTH}}", str(width))
               .replace("{{FONT_LINK}}", FONT_LINK if webfont else "")
               .replace("{{THEME_ATTR}}", f' data-theme="{theme}"' if theme in ("light", "dark") else "")
               .replace("{{REGISTER}}", register))
    return html


def esc(s):
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def screenshot(html_path, png_path, theme):
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        sys.exit("PNG export needs Playwright: pip install playwright && playwright install chromium")
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 1400, "height": 1000}, device_scale_factor=2, color_scheme=theme if theme in ("light", "dark") else "light")
        # a PNG is a still: skip the entrance motion and (in the publish register) the hover-only toolbar
        pg.add_init_script("document.documentElement.setAttribute('data-motion','off')")
        pg.goto("file://" + os.path.abspath(html_path))
        pg.wait_for_timeout(600)  # webfont swap
        cards = pg.locator(".ck-card, .ck-kpis")
        n = cards.count()
        if n == 1:
            cards.first.screenshot(path=png_path)
        else:
            pg.locator("#ck-root").screenshot(path=png_path)
        b.close()


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("specs", nargs="+", help="one or more spec.json files")
    ap.add_argument("-o", "--out", help="output HTML path (required with several specs)")
    ap.add_argument("--png", action="store_true", help="also write a PNG next to the HTML")
    ap.add_argument("--theme", choices=["auto", "light", "dark"], default="auto")
    ap.add_argument("--register", choices=["analyse", "publish"], default="analyse", help="analyse: toolbar always visible (default); publish: toolbar appears on hover only and never in the PNG")
    ap.add_argument("--style", choices=["studio", "classic"], help="override the visual style for this page (default: studio)")
    ap.add_argument("--no-webfont", action="store_true")
    ap.add_argument("--title", help="page title (defaults to the first spec's title)")
    ap.add_argument("--validate", action="store_true", help="validate only, render nothing")
    a = ap.parse_args()

    specs = []
    problems = []
    for path in a.specs:
        with open(path, encoding="utf-8") as f:
            spec = json.load(f)
        items = spec if isinstance(spec, list) else [spec]
        for i, s in enumerate(items):
            problems += validate(s, f"{os.path.basename(path)}#{i}" if len(items) > 1 else os.path.basename(path))
        specs += items
    if problems:
        print("spec problems:", file=sys.stderr)
        for p in problems:
            print("  - " + p, file=sys.stderr)
        if a.validate or any("required" in p or "must be one of" in p for p in problems):
            sys.exit(1)
    if a.validate:
        print("ok: %d spec(s) validated" % len(specs))
        return

    out = a.out or (os.path.splitext(a.specs[0])[0] + ".html" if len(a.specs) == 1 else None)
    if not out:
        sys.exit("pass -o when rendering several specs")
    if a.style:
        specs = [dict(s, style=a.style) for s in specs]
    title = a.title or specs[0].get("pageTitle") or specs[0].get("title") or "Chart"
    width = max(int(s.get("width", 720)) for s in specs)
    html = build_html(specs, title, title, a.theme, not a.no_webfont, width, a.register)
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)
    print("wrote " + out)
    if a.png:
        png = os.path.splitext(out)[0] + ".png"
        screenshot(out, png, a.theme)
        print("wrote " + png)


if __name__ == "__main__":
    main()
