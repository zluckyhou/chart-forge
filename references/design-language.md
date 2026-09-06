# Studio: practical charts with a visible point of view

Use the existing renderer instead of building a different design from scratch for every dataset.
The signature is **precise geometry + an asymmetric reading hierarchy + restrained colour**.
Studio now uses open frames and horizontal rules instead of uniform rounded floating cards.
On a wide trend, `layout: feature` places its spotlight alongside the plot.
`options.difference: true` turns the gap between two comparable series into the main visual.

## Choose the focal point

A chart should read in this order: conclusion, key comparison, exact values. On one hero trend chart,
`spotlight` can promote a real latest value. Secondary panels usually omit it. KPI rows and a
spotlight that repeat the same value are redundant; choose one. Do not add invented badges or numbers
for visual balance. Keep the currency/magnitude unit explicit in the subtitle.

Start with `studio` in both light and dark. Use the ordinary validated palette; `highlight` should
explain a conclusion. Keep non-highlighted entities visible in dark mode. Use `bloom` for genuinely
categorical comparisons that benefit from stronger separation, not as an automatic beauty switch.
`finish: soft` and `cast` are for an explicit soft/playful brief. They are not the default upgrade path.

## Shape is deliberate

Broad bars work well for a few categories; square baselines make their values unambiguous. Thicker
lead lines provide a clear reading route; use end labels and interactive crosshairs instead of a bead
on every point. Heatmaps should read as one continuous field. Rankings put each exact value on the same ledger line as its name, with a shared-origin bar below. Tables get generous row spacing,
aligned tabular numbers, restrained header contrast and in-cell evidence. KPI groups share one frame
with internal dividers, rather than four equally loud floating cards.

For dense plots, preserve label size and horizontal scrolling at small widths. Do not shrink an
entire 24-column heatmap into illegible mobile pixels. The Studio renderer wraps the plot in an
independent scrolling viewport; the title and controls remain readable.

## Compose, do not decorate

For an explicit multi-chart page: a wide main trend next to a narrower ranking works when their
content fits. Use one shared spacing grid and a small number of column widths. Standalone charts
remain standalone; a request to draw one chart does not imply a dashboard or branded landing page.
Use whitespace between reading groups, not a large empty toolbar band. Keep sources at the bottom.

A brief entrance, a crosshair that tracks data, keyboard focus and a responsive tooltip provide the
motion. Do not add perpetual animation to make static data feel live. Respect reduced motion, and
make still export communicate the full conclusion.

## Review the design in use

Run `python3 scripts/design_preview.py /tmp/chart-forge-preview.html` for a same-data Studio/Classic
comparison. It includes a sample KPI strip, trend, ranking, heatmap, bars and table. Check both themes,
a wide and a narrow viewport, then use the toolbar and keyboard. Preview data is explicitly synthetic.
For a full form smoke check, render all `assets/examples/*.json` in both themes.

Retain the practical contracts: honest scales, stable entity colours, exact table values, readable
provenance, and appropriate chart choice. Counts are eligible for ordinary charts; the unit family is
an alternative encoding when counting marks actually helps, not an aesthetic prerequisite.
