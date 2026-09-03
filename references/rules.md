# Design rules

The engine already enforces most of this. Use the list when writing a spec and when reviewing the
rendered image.

## Copy

- **The title is a conclusion**, not a metric name: "Analytics overtook Automation for second place",
  not "ARR by product". The metric name belongs in the `subtitle`, with the period, unit and provenance.
- Two lines of copy, never three. A third stacked line pushes the chart down and gets skipped anyway.
- Keep the title short enough to stay on one line (~52 English characters at the default width).
- Numbers quoted in the title must be readable somewhere in the chart.
- `note` is for a caveat or a reading hint — not filler. `source` is provenance only — a dataset, an
  export, a report — set in small caps under the chart; leave it out rather than invent one.

## Colour

- Categorical hues come from `palette.json` **in order**, and **colour follows the entity, never its
  rank**: hiding or filtering a series must not repaint the survivors.
- One conclusion → `highlight` one entity and let the rest go grey. Eight colours all shouting is not
  a chart, it is a legend.
- Magnitude → one hue, light to dark. Signed values → two hues with a neutral grey midpoint.
  Status colours (good / warning / critical) always ship with a word or an icon, and are never reused
  as series colours.
- Text wears text colours (ink / ink2 / muted), never the series colour. Identity comes from the swatch,
  line key or dot *beside* the text.
- Re-skinning: edit `assets/palette.json`, mirror it into `assets/chartkit.css`, then
  `python3 scripts/validate_palette.py --from-json assets/palette.json` — light and dark must both pass.

## Marks and layout

- Bars ≤ 30 px, lines 2 px, dots ≥ 8 px. Separate touching fills with a 2 px gap in the surface colour,
  never with a stroke.
- Gridlines are hairlines one step off the surface; keep the baseline plus 4–6 lines. Ticks land on
  round numbers automatically.
- Direct-label selectively: the end of a line, the peak, the latest period, the top few points — never
  every data point.
- Two or more series always get a legend (click to hide). One series gets none — the title already says
  what is plotted.
- Never a second y-axis. Two charts, small multiples, or index both series to a common base.

## Interaction

- Every chart has a hover layer: a crosshair with all series on lines, per-mark tooltips on bars, cells,
  dots and rows. Keyboard focus shows the same thing as hover.
- Hover enhances, it never gates: every value is also reachable from a direct label or the **Table** view.
- Hit areas are bigger than the marks (24 px around a scatter dot).

## One device per chart

- The story is carried by **one** of: a highlighted entity, an event annotation, a reference line. The
  engine can draw all three at once; a chart that needs all three has two stories and wants two charts.
- The palette is the palette. Hierarchy comes from `highlight` (the rest go to the warm grey `dim`), never
  from tints, ramps across a ranking, gradients under several lines, or a coloured word in the title.
- Texture is not data: no tick rings in place of arcs, no dot grids in place of bars, no notch patterns.
  A solid arc with a 2 px gap reads faster than a hundred ticks.
- Motion is one entrance, then stillness. Nothing loops, nothing pulses, nothing waits for a scroll.
- Small caps (9.5 px, letter-spaced) are for annotations, reference labels and the source line — never
  for anything the reader must read to get the number. Minimum for those is 10.5 px.
- Publishing a chart (`register: publish`, PNG, slides) is a reason to *remove* chrome, not to add
  decoration: the toolbar goes, the legend folds into the end labels, the rest stays as it was.

## Anti-patterns — if the output matches one of these, fix it

- A second y-axis. A rainbow ramp for magnitude. More than 8 categorical colours.
- A bar chart with one bar; a two-slice donut; a donut with more than six slices.
- Shading nominal categories by size — that encodes length twice and wastes the colour channel.
- A label clipped by its own bar; a title that is only the metric name; a number on every point.
- Extra metrics, icons or captions added to fill space.
- A ramp that shades a ranking by rank, a gradient fill under more than one line, a tick ring, a glow.
