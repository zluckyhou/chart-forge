# The spec

One spec is one chart. Common fields:

```json
{
  "type": "bar | line | area | candle | donut | scatter | heatmap | funnel | kpi | table",
  "title": "The conclusion, in one sentence (required except for kpi)",
  "subtitle": "What is measured · period · unit · provenance",
  "note": "A caveat or a reading hint (optional)",
  "source": "Provenance, printed as a small-caps line under the chart (optional)",
  "register": "analyse | publish",
  "motion": true,
  "state": "load | stream | stale | refresh | error",
  "width": 720,
  "lang": "zh | en",
  "data": { "…per type" },
  "options": { "…per type" }
}
```

`title` + `subtitle` are the whole header — two lines, never three. (A legacy `eyebrow` is folded
into the front of the subtitle rather than stacking a third line.)

`register` picks how much chrome is in view: `analyse` (default) keeps the Table / mode toolbar visible,
`publish` shows it only on hover and never in a PNG. `motion` (default true) is the one-time entrance —
bars rise, lines draw, slices fade in — after which the chart is still; PNG export always renders still.

`state` is the live condition of the data, and it is a *channel*, not decoration: the marks report it
themselves instead of a skeleton overlay or a spinner. `load` dims the plot to a breathing placeholder and
hides the labels, `stream` pulses only the newest mark (its number is withheld until it lands), `refresh`
runs a sweep, `stale` desaturates and slows to a 6.5 s breath, `error` nudges the last mark once and dims.
Every keyframe moves `scaleX` / opacity / saturation only, so **the top edge of a mark is the true value at
every frame**. A state always ships a word as well as motion, so it survives `prefers-reduced-motion` and
the PNG. Leave `state` out and the chart is still, exactly as before.

Three options are shared by every type, all off by default:

- **`options.finish: "soft"`** adds the volumetric pass — a lateral sheen and a contact shadow under the
  baseline. It runs *perpendicular to the encoding axis* and is dosed by the mark's aspect ratio, so it
  changes no reading. Flat stays the default and remains right for anything editorial.
- **`options.palette: "bloom"`** switches to the saturated alternative set. Same slot-order discipline,
  gated by the same validator (`scripts/validate_palette.py --set bloom`).
- **`options.cast: true`** turns on the cast — eight silhouettes bound to the eight colour slots. It always
  **replaces** an element, never joins one: the end dot of a line *becomes* the character, the legend key
  *becomes* the character, the KPI badge *becomes* the character. Its geometric centre sits on the datum,
  so position is still the value. Pass an object to pin shapes by series name:
  `"cast": {"Subscriptions": "circle", "One-off": "droplet"}`. The card is always the container — never
  let the character be the tile.

`lang` controls the chrome only — buttons, table headers, tooltip labels, scale notes. Leave it out
and the language is detected from the spec's own text: any CJK anywhere → Chinese, otherwise English.
Titles, series names and categories are always printed exactly as written.

**Number formats** appear wherever a value is displayed, either inline in `options` or as a nested
object (`xFormat`, `yFormat`, a column, a metric):
`{"format": "number|compact|cn|percent|currency", "decimals": 1, "unit": "orders", "currency": "$"}`

- `number` → 1,234 · `compact` → 1.2K / 3.4M / 1.2B · `cn` → 1.2万 / 3.4亿
- `percent` takes an already-scaled number (6.5 → 6.5 %) · `currency` prefixes the symbol

Every chart ships hover readouts (mouse and keyboard), a **Table** view, and dark mode.

## bar — vertical, grouped or stacked

```json
"data": { "categories": ["Mar", "Apr"], "series": [{ "name": "Organic", "values": [9800, 10400] }] },
"options": {
  "mode": "grouped | stacked", "toggle": true,
  "format": "compact", "categoryLabel": "Month",
  "valueLabels": "last | all | none",
  "highlight": ["Paid"],
  "refLines": [{ "value": 12000, "label": "Target" }],
  "height": 260
}
```

Negative values are supported: the axis crosses zero and bars grow downward from it.
One series with ≤ 8 categories is labelled on every bar; otherwise only the latest period is.
Stacks print their total above the column.

## bar + `horizontal: true` — ranking

```json
"data": { "categories": ["Messaging", "Analytics"], "series": [{ "name": "ARR", "values": [1860, 1180] }] },
"options": {
  "horizontal": true, "sort": true, "sortToggle": false, "rankNumbers": false,
  "highlight": ["Analytics"], "reference": "average",
  "labelWidth": 96, "format": "currency", "currency": "$"
}
```

`reference` is `"average"` or `{ "value": 1000, "label": "Target" }` and draws a dashed line through
all the bars. Hovering a row swaps its value for share and distance from that reference. The order of the
rows is the rank; `rankNumbers: true` prints 01 / 02 / … in front of them as well.

## line / area

```json
"data": { "x": ["2025-01", "2025-02"], "series": [{ "name": "Mobile", "values": [246, 258] }] },
"options": {
  "area": false, "smooth": true, "toggle": true, "endLabels": true, "legend": false, "markMax": null,
  "xTicks": 6, "xLabel": "Month", "format": "number",
  "refLines": [{ "value": 3500, "label": "Quarterly target" }],
  "annotations": [{ "x": "2025-09", "label": "Mobile takes the lead" }],
  "highlight": ["Mobile"], "height": 240
}
```

`type: "area"` is `line` + `area: true`; the fill is a fading gradient, best with one series.
With `endLabels` on, the end labels *are* the legend and the legend row is not drawn; `legend: true`
brings it back (it is also the click-to-hide control). The lead series — the highlighted one, else the
first — is drawn heavier with a dot per period when there is room.
`markMax` defaults to on for a single series, off for several. An `annotations.x` must be one of the
values in `data.x`. End labels print the series name and its latest value and are nudged apart when
they collide.

## candle — OHLC

```json
"data": { "x": ["W1", "W2"], "candles": [{ "o": 100, "h": 102.6, "l": 99.1, "c": 101.8 }] },
"options": {
  "format": "number", "decimals": 1, "colors": "cn | intl",
  "xTicks": 10, "categoryLabel": "Week",
  "refLines": [{ "value": 100, "label": "Start" }], "height": 260
}
```

Every candle needs `o/h/l/c` with `l ≤ min(o,c) ≤ max(o,c) ≤ h`. The y-axis frames the data range
instead of anchoring at zero. `colors` defaults to `"cn"` (red up, green down); `"intl"` flips it.
The tooltip leads with close and change against the previous close.

## donut

```json
"data": { "items": [{ "name": "Organic search", "value": 4820 }] },
"options": {
  "maxSlices": 6, "otherLabel": "Other", "altBar": true,
  "centerLabel": "Orders", "size": 250,
  "format": "number", "unit": "orders", "categoryLabel": "Source"
}
```

Slices are sorted by value from 12 o'clock. Anything past `maxSlices` is merged into a grey "Other",
as is any slice already named Other / 其他.

## scatter

```json
"data": { "points": [{ "name": "Campaign 01", "group": "EMEA", "x": 18, "y": 310, "cac": 58.1 }] },
"options": {
  "xLabel": "Spend (thousands of USD)", "yLabel": "Signups",
  "xFormat": { "format": "number" }, "yFormat": { "format": "number" },
  "medians": true, "medianToggle": true,
  "quadrants": ["Low spend · high yield", "High spend · high yield",
                "Low spend · low yield", "High spend · low yield"],
  "labelTop": 3,
  "extra": [{ "key": "cac", "label": "Cost per signup", "format": "currency", "currency": "$" }],
  "height": 280
}
```

At most 3 `group` values. `extra` fields appear in the tooltip and the table view. `labelTop` labels
the highest points by name and silently skips a label that would overlap one already placed.

## heatmap

```json
"data": {
  "rows": ["Mon", "Tue"], "cols": ["0", "1"],
  "values": [[150, 130], [160, 135]],
  "metrics": [{ "name": "Sessions", "format": "number", "values": [[…]] },
              { "name": "Conversion", "format": "percent", "decimals": 1, "values": [[…]] }]
},
"options": {
  "valueLabel": "Sessions", "format": "number", "marginals": true,
  "cellHeight": 26, "rowLabelWidth": 48,
  "diverging": false, "cellLabels": false, "colors": "cn | intl", "gamma": 1, "rank": true
}
```

Supply `metrics` to get a metric switcher, or a single `values` grid. `marginals` adds row and column
bars (totals, or averages for a percentage metric). `diverging` switches to a two-hue signed scale
with grey at zero — required for returns, changes and correlations. `cellLabels` prints the number in
the cell. `gamma` < 1 lifts contrast among small magnitudes. `rank: false` drops the "rank overall"
line from the tooltip where ranking is meaningless.

## funnel

```json
"data": { "steps": [{ "name": "Visit", "value": 128400 }, { "name": "Paid", "value": 12300 }] },
"options": { "mode": "absolute | relative", "format": "number" }
```

Steps must decrease. The neck between two steps is the drop-off and carries the step conversion; the
worst step is badged and the overall rate is printed in the footer.

## kpi — tiles

```json
"data": { "items": [
  { "label": "New users", "value": 36800, "format": "compact",
    "delta": 31.4, "deltaGood": true, "vs": "previous period",
    "trend": [2100, 2300, 2600], "hero": false, "caption": "" }
] },
"options": { "columns": 4 },
"width": 960
```

`delta` is a percentage. `deltaGood: false` means up is bad (cost, churn) and flips the colour.
`trend` draws a sparkline tinted by that judgement. `hero: true` enlarges one tile — at most one per view.

## table

```json
"data": {
  "columns": [
    { "key": "variant", "label": "Variant", "sticky": true, "sub": "owner" },
    { "key": "cvr", "label": "Conversion", "format": "percent", "decimals": 2, "group": "Result" },
    { "key": "dcvr", "label": "vs control", "format": "percent", "sign": true,
      "bar": "diverging", "barGroup": "delta", "group": "Result", "emphasis": true },
    { "key": "verdict", "label": "Verdict", "tag": true }
  ],
  "rows": [
    { "variant": "Simplified form", "owner": "growth", "cvr": 7.31, "dcvr": 13.86,
      "verdict": "ship", "verdict_tone": "good", "verdict_note": "both up", "_id": "b", "_cls": "" }
  ]
},
"options": { "zebra": true, "sortable": true, "sortBy": "dcvr", "sortAsc": false,
             "maxHeight": 520, "signColors": "gb | cn" }
```

Columns: `sticky` pins the first column (at most one), `sub` prints another field as a small second
line in the cell, `bar` draws an in-cell bar (`"positive"` from 0 to the maximum, `"diverging"`
centred on 0), **`barGroup` makes several columns share one bar scale — required whenever bars are
meant to be compared across columns**, `sign` colours by sign, `emphasis` bolds, `muted` recedes,
`align` overrides the default, `group` merges adjacent columns under a second-level header, `id`
is written to `data-col`.

Rows: `_id` becomes `data-row`, `_cls` adds a class; a tag column reads `<key>_tone`
(good / warn / info / mute) and `<key>_note` (trailing small text).

`signColors` defaults to `gb` (green positive, red negative — good/bad). `cn` is red positive,
green negative — price movement in East-Asian markets.

## waffle — 100 marks = 100 %

```json
"data": { "items": [{ "name": "Subscription", "value": 42, "shape": "circle", "color": "…" }] },
"options": { "total": 100, "cols": 10, "cell": 13, "gap": 4,
             "format": "percent", "decimals": 0, "unitLabel": "of revenue", "palette": "bloom" }
```

Fills bottom-up, so the block reads as a level rising. Each group gets a colour **and** a silhouette, and
the two are redundant — the chart still reads in greyscale and in colour blindness. Optical area is
normalised per shape (a triangle fills about half of what a rounded square does; without the correction
that group silently reads as half its count). ≤ 6 groups, ≤ 200 cells.

## unit — a column built from counted marks

```json
"data": { "categories": ["Mon", "Tue"],
          "series": [{ "name": "New", "values": [2, 3], "shape": "circle" }] },
"options": { "per": 1, "unitLabel": "customers", "cell": 13, "gap": 3, "format": "number" }
```

**`per`** is how many of the measure one mark stands for — deliberately not `unit`, which is already the
number-format suffix. Series stack, and the silhouette changes with the series, so a stack is legible
without relying on hue. A remainder is drawn as a **part-filled** mark over a 16 % ghost, so 216 with
`per: 40` is 5 marks and a 40 % sliver, never a rounded 200; the exact total is still printed above the
column. ≤ 4 series, ≤ 30 marks in the tallest column.

## dotmatrix — density that reads as objects

```json
"data": { "rows": ["Mon"], "cols": ["0", "1"], "values": [[150, 130]] },
"options": { "cell": 18, "min": 0.3, "valueLabel": "Sessions", "format": "number" }
```

Cell size **and** shade both grow with the value — two channels saying one thing, so it survives greyscale
and shrinks well. It uses **one silhouette throughout, on purpose**: sessions are a magnitude, and a second
shape here would send the reader looking for a grouping that does not exist. `min` is the smallest cell as
a fraction of `cell`.

## statuswall — discrete states across many things

```json
"data": {
  "states": [{ "key": "ok", "label": "Healthy", "tone": "good", "shape": "circle" },
             { "key": "down", "label": "Down", "tone": "critical", "shape": "squircle" }],
  "items": [{ "name": "api-gateway", "status": "ok" },
            { "name": "pay-router", "status": "down", "note": "upstream timeout" }]
},
"options": { "cols": 8, "cell": 20 }
```

Every state carries its own **silhouette as well as its colour** — severity encoded by red/amber/green
alone is the classic colour-blindness failure. `tone` is `good | warning | serious | critical` and picks
the status colour; `shape` and `color` override. ≤ 5 states. Any `status` not declared in `states` is a
validation error.

## Validation

`python3 scripts/render.py spec.json --validate` checks the type, the required data, matching lengths,
series count ≤ 8, scatter groups ≤ 3, funnel monotonicity, OHLC ordering, donut ≥ 2 items, table
column keys, and the presence of a title. For the unit family it also enforces what keeps marks
countable: ≤ 6 waffle groups and ≤ 200 cells, ≤ 4 unit series and ≤ 30 marks in the tallest column,
≤ 5 wall states, no undeclared status, and matching matrix dimensions.
