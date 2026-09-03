---
name: chart-forge
description: >-
  Draw the right chart from a dataset — a good-looking, interactive one. Decide what the chart has to
  say, pick the form that says it fastest, write a small JSON spec, and render it with a zero-dependency
  engine into a self-contained interactive HTML page (PNG optional). Ships a colourblind- and
  contrast-validated palette, conclusion-style titles, end-of-line labels, event annotations, average
  lines, funnel necks, heatmap marginals, in-cell table bars — across bar, ranking, line, area,
  candlestick, donut, scatter, heatmap, funnel, KPI tiles and data tables, each with hover readouts,
  a table view and dark mode. Use when someone says "chart this", "plot this", "visualise this data",
  "make a graph", "trend chart", "share breakdown", "funnel", "heatmap", "KPI cards", "a chart for the
  report", "nicer than the default charts", 画个图 / 做张图表 / 可视化这份数据 / 趋势图 / 占比图 / 漏斗 /
  热力图 / 指标卡, or hands over a table, a CSV or a SQL result that needs a picture.
---

# Chart Forge

One chart = one `spec.json` → `scripts/render.py` → a self-contained interactive HTML file
(zero dependencies; Google Fonts optional), plus a PNG when you need one.
The look is editorial, not dashboard: a rounded white card with a hairline edge and no shadow on a warm
plane, a conclusion title, small-caps annotations and an optional source line, a quiet toolbar, and one
entrance motion (bars rise, lines draw, slices fade in) after which the chart is still.
The engine handles *drawing it correctly and making it look good*.
**What the chart should say, and which form says it, is your job.**

| Layer | Who | Owns |
|---|---|---|
| Expression | you (the agent) | read the data, write the one-sentence conclusion, pick the form, decide what to emphasise → `spec.json` |
| Aesthetics | `assets/chartkit.css` + `assets/palette.json` | validated colour tokens, type, card and tooltip styling |
| Rendering | `assets/chartkit.js` + `scripts/render.py` | SVG marks, interaction, table view, axis rounding, direct labels, PNG export |

## Workflow

### 1. Decide the message, then the form

Read `references/choosing-a-form.md`. Write the conclusion as one sentence — that sentence *is* the
`title`. Then pick `type` by the job:

- one number → `kpi` · change over time → `line` / `area` · compare categories → `bar`
- ranking → `bar` + `horizontal` · part of a whole → `donut` (≤ 6 slices) · two measures → `scatter` (≤ 3 groups)
- distribution across two dimensions → `heatmap` · price OHLC → `candle` · heterogeneous columns → `table` · step-by-step drop-off → `funnel`

If the data does not suit the form, reshape it first: fold a long tail into "Other" past 8 series,
split scatter groups past 3, and put two measures of different magnitude in **two charts** — never a
second y-axis.

### 2. Write the spec

Follow `references/spec.md`. Every type has a runnable example in `assets/examples/` — copying the
closest one and swapping the data is the fastest path.

Two lines of copy, never three: **`title`** is the conclusion, **`subtitle`** is the context
(what is measured · period · unit · provenance). Add **`source`** when the data has a provenance worth
printing — it becomes a small-caps line under the chart. Use `options.highlight` when the story is about
one entity, `refLines` for a target, `annotations` for the event that explains a turn, and
`reference: "average"` on a ranking. One device per chart: a highlight, an annotation *or* a reference
line carries the story; the others, if present at all, stay quiet.

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
