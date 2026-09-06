---
name: chart-forge
description: >-
  Turn datasets, CSVs and query results into polished interactive charts and self-contained HTML,
  with optional PNG export. Choose a truthful chart form, write a JSON spec and render with a
  zero-dependency engine. Supports business charts, rankings, trends, heatmaps, funnels, KPI tiles,
  tables and countable-unit displays; Studio and Classic styles, light/dark themes, tooltips and
  exact table values. Use for charting, plotting, data visualization, 画图、图表美化、趋势、占比、排名、
  热力图、漏斗、指标卡 and 可视化查询结果.
---

# Chart Forge

One chart = one `spec.json` → `scripts/render.py` → a self-contained interactive HTML file
(zero dependencies; Google Fonts optional), plus a PNG when you need one.
The default look is **Studio**: open frames with precise rules, stronger title/number hierarchy, restrained
surfaces, broad flat-ended bars, weighted lines and ledger-style rankings. Light is a clean
research page; dark is a high-contrast instrument panel. `"style": "classic"` restores the preceding
visual treatment. Read `references/design-language.md` when choosing visual emphasis or composing
several charts. `scripts/design_preview.py` builds a runnable same-data comparison.
Every form — including the ones whose marks never change shape — shares one **element layer**: one radius
family, one end token, one stroke scale, one negative-space rule, elevation on containers only, one state
vocabulary, one palette. That is what makes a candlestick and a waffle read as the same family.
The engine handles *drawing it correctly and making it look good*.
**What the chart should say, and which form says it, is your job.**

| Layer | Who | Owns |
|---|---|---|
| Expression | you (the agent) | read the data, write the one-sentence conclusion, pick the form, decide what to emphasise → `spec.json` |
| Aesthetics | `assets/chartkit.css` + `assets/palette.json` | validated colour tokens (two sets), the shape channel and its area normalisation, the geometry constants, type, card and tooltip styling |
| Rendering | `assets/chartkit.js` + `scripts/render.py` | SVG marks, interaction, table view, axis rounding, direct labels, PNG export |

## Workflow

### 1. Decide the message, then the form

Read `references/choosing-a-form.md`. Write the conclusion as one sentence — that sentence *is* the
`title`. Choose the familiar form that makes the comparison easiest first. Countable data can use
ordinary bars, lines or donuts; **countable does not automatically mean a unit chart**. Choose the unit
family only when one-mark-one-thing helps the actual question (small counts, composition, discrete
states). Continuous values stay with position, length or colour scales.

Then pick `type` by the job:

- one number → `kpi` · change over time → `line` / `area` · compare categories → `bar`
- ranking → `bar` + `horizontal` · part of a whole → `donut` (≤ 6 slices) · two measures → `scatter` (≤ 3 groups)
- distribution across two dimensions → `heatmap` · price OHLC → `candle` · heterogeneous columns → `table` · step-by-step drop-off → `funnel`
- countable share → `waffle` (100 marks = 100 %, beats a donut when shares are close) · small counts per category → `unit`
- density that should read as objects → `dotmatrix` · discrete states across many things → `statuswall`

If the data does not suit the form, reshape it first: fold a long tail into "Other" past 8 series,
split scatter groups past 3, and put two measures of different magnitude in **two charts** — never a
second y-axis.

### 2. Write the spec

Follow `references/spec.md`. Every type has a runnable example in `assets/examples/` — copying the
closest one and swapping the data is the fastest path.

Two levels of copy (allow natural wrapping): **`title`** is the conclusion, **`subtitle`** is the context
(what is measured · period · unit · provenance). Add **`source`** when the data has a provenance worth
printing — it becomes a small-caps line under the chart. Use `options.highlight` when the story is about
one entity, `refLines` for a target, `annotations` for the event that explains a turn, and
`reference: "average"` on a ranking. One device per chart: a highlight, an annotation *or* a reference
line carries the story; the others, if present at all, stay quiet.

For a hero trend chart, add `"spotlight": {"series": "exact series name", "compare": "previous"}`.
Use `"layout": "feature"` at widths ≥ 900 px for a metric sidebar beside the plot.
For a two-series trend about the gap itself, `options.difference: true` shades between the lines
and exposes the exact difference in the hover readout.
This spotlight prints the selected series' latest value and derives the change from the previous data point.
It never invents a summary number; omit it on dense analysis charts and most secondary panels.
`options.pointDots: true` restores individual period dots on Studio lead lines when useful.

**Three style opt-ins, all off by default** — turn them on deliberately, not by habit:
`options.finish: "soft"` adds the volumetric pass (lateral sheen + contact shadow, dosed by aspect ratio,
never along the encoding axis); `options.palette: "bloom"` swaps in the saturated alternative set;
`options.cast: true` turns on the eight silhouettes as identity tokens — they always **replace** an
element (the end dot, the legend key, the KPI badge), never sit beside one, and the card stays the
container. Top-level `state` reports live condition through the marks themselves.

Chart chrome (buttons, table headers, tooltip labels) follows the language of the spec's own text:
CJK anywhere → Chinese, otherwise English. Force it with `"lang": "zh" | "en"`.

Use the user's real data as given. If you invent numbers to demonstrate something, say so in the
`subtitle` or `note` — "sample data".

### 3. Render, then look at it

```bash
python3 scripts/render.py spec.json --validate                              # types, lengths, series count, funnel monotonicity…
python3 scripts/render.py spec.json -o out/chart.html                       # self-contained HTML
python3 scripts/render.py spec.json -o out/chart.html --png --theme light   # + PNG (needs Playwright)
python3 scripts/render.py a.json b.json -o out/report.html                  # several charts, one page
python3 scripts/render.py spec.json -o out/classic.html --style classic      # previous visual style
python3 scripts/render.py spec.json -o out/chart.html --no-webfont          # offline / intranet
python3 scripts/render.py spec.json -o out/chart.html --register publish    # toolbar only on hover, never in the PNG
```

Two registers, same spec: **`analyse`** (default) keeps the Table / mode toolbar in view for people who
will work with the chart; **`publish`** hides it until the pointer arrives and never prints it — use it
for anything that leaves the browser (PNG, slides, a post). Set it per spec with `"register"` or for a
whole page with `--register`. `"motion": false` turns the entrance off for one chart; PNG export is
always still.

**Always look at the result** (the PNG, or a screenshot of the page) and check it against the
anti-pattern list in `references/rules.md`: is the title a conclusion, do labels collide, is the axis
sensible, does the colour emphasise only what deserves it. Fix the spec and re-render — do not patch
the engine to work around a bad spec.

### 4. Deliver

- **Web / report** — hand over the HTML. It is one file; it also embeds in an iframe, or paste the
  `<figure class="ck-card">` fragment together with the `<style>` and `<script>`.
- **Docs, chat, slides** — hand over the PNG (`--png`, 2× resolution). Use `--theme dark` for dark decks.
- **Design canvas** — inline `assets/chartkit.css` + `assets/chartkit.js` in the artboard and call
  `ChartKit.render(host, spec)` on mount.

## What the engine already does for you

Know these so you do not rebuild them, and so you know what to reach for:

- **Line** — end-of-line labels (series name + latest value, auto-separated when they collide) stand in
  for the legend, the lead series carries a dot per period, event annotations in small caps, peak marker,
  target lines, monotone smoothing that never overshoots.
- **Bar** — hovering lights the whole category band and lists every series; the latest period is
  direct-labelled; stacks carry totals.
- **Ranking** — a dashed average/target line through the bars, one highlighted subject with the rest
  greyed (order is the rank; `rankNumbers: true` prints numerals), hover swaps the value for share and
  distance from the reference.
- **Donut** — legend rows carry a share line in the slice's own colour, the centre readout follows the
  hover, one click switches to bars when shares are too close to compare as arcs.
- **Scatter** — hover drop-lines to both axes with value chips, automatic labels on the top points
  (skipped when they would overlap), median quadrants.
- **Heatmap** — eight-step single-hue ramp or a diverging one for signed data, row/column marginal
  bars, hover cross-highlights the row and column labels.
- **Funnel** — the neck between two steps *is* the drop-off, the step conversion is printed in it, the
  worst step is badged automatically.
- **Candle** — OHLC with red-up/green-down (`colors: "intl"` flips it), a trading-app tooltip, an axis
  that frames the range instead of anchoring at zero.
- **Table** — sticky header and first column, in-cell bars (`barGroup` to share one scale across
  columns), tags, two-level headers, click-to-sort.
- **KPI** — value + signed pill (direction × whether up is good) + a fading sparkline.

## Re-skinning to a brand

Edit `assets/palette.json` → mirror the values into `:root` and both dark blocks of
`assets/chartkit.css` → run
`python3 scripts/validate_palette.py --from-json assets/palette.json`.
Ship only when light and dark both pass. The **order** of the categorical slots is the
colourblind-safety mechanism, so re-validate after any reordering too.

## Environment

- HTML rendering: Python 3, no third-party packages.
- PNG export: `pip install playwright && playwright install chromium`.
- Fonts: Google Fonts (IBM Plex Sans + Noto Sans SC) by default; `--no-webfont` falls back to system fonts.
