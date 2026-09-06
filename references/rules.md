# Design rules

The engine already enforces most of this. Use the list when writing a spec and when reviewing the
rendered image.

## Copy

- **The title is a conclusion**, not a metric name: "Analytics overtook Automation for second place",
  not "ARR by product". The metric name belongs in the `subtitle`, with the period, unit and provenance.
- Two typographic levels: conclusion and context. Allow wrapping; do not shrink Chinese titles to force one line. A data-backed spotlight may sit below them on a hero trend chart.
- Keep titles concise; two lines at narrow widths are preferable to clipped or tiny text.
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

- **Geometry follows the reading task.** Studio bars use up to 48 px width, no more than 0.60 of
  their slot, and a 4 px free-end corner; the baseline stays square. Studio ledger ranking bars are 12 px high below a name/value line;
  lead lines are 3.2 px and comparison lines 1.8 px. Dense marks become thinner with available space.
  Classic retains its 26 px limit and proportional rounding. Do not force every form into the same
  pill silhouette. Heatmap cells have 3 px corners in Studio so the field stays coherent.
- **Volume is dosed by aspect ratio.** A 1:1 mark (KPI token, legend key, unit cell, scatter dot) takes the
  full treatment; a 1:4 bar takes about a third of it and no specular. Applying a 1:1 dose to a long thin
  mark is what makes it look like a plastic cylinder.
- **The axis rule.** Any volumetric cue — gradient, contact shadow, state motion — runs **perpendicular to
  the encoding axis**. A vertical bar encodes height, so it may shade across its width and breathe in
  `scaleX`; shading or scaling it along its height moves the reading. Sides may bulge because width encodes
  nothing. A contact shadow lives entirely below the shared baseline and is identical under every mark.
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

- The story is carried by **one** of: a highlighted entity, an event annotation, a reference line, or one
  cast **expression**. The engine can draw all of them at once; a chart that needs all of them has two
  stories and wants two charts. A cast *silhouette* is identity, not a device, and is not rationed the
  same way — but expressions are: ten faces in a ranking is ten faces and no story.
- The palette is the palette. Hierarchy comes from `highlight` (the rest go to the warm grey `dim`), never
  from tints, ramps across a ranking, gradients under several lines, or a coloured word in the title.
  `finish: "soft"` is not hierarchy — it is a lateral sheen of ±7 % on every mark equally, and it is off
  by default.
- Texture is not data: no tick rings in place of arcs, no notch patterns, no dot grid used as *decoration*
  behind or instead of a bar. A solid arc with a 2 px gap reads faster than a hundred ticks.
  **A unit chart is not texture** — there each mark is one counted unit and the reader counts objects
  instead of measuring an edge. That is a different encoding, and it has its own gate below.
- Motion is one entrance, then stillness. Nothing loops, nothing pulses, nothing waits for a scroll —
  **unless the chart is carrying a `state`**, which is a channel, not decoration. `load / stream / stale /
  refresh / error` let the marks report their own condition instead of a skeleton overlay or a spinner, and
  they obey the axis rule above. A settled chart has no `state` and therefore does not move. A state never
  relies on motion alone: it always ships a word too, for reduced-motion and for the PNG.
- Small caps are for short annotations and reference labels; Studio sources use readable 10 px mixed case — never
  for anything the reader must read to get the number. Minimum for those is 10.5 px.
- Publishing a chart (`register: publish`, PNG, slides) is a reason to *remove* chrome, not to add
  decoration: the toolbar goes, the legend folds into the end labels, the rest stays as it was.

## Shape as the second categorical channel

- Shape follows the entity exactly as colour does, and the two are **redundant**: the chart then survives
  greyscale, colour blindness and a badly calibrated projector. `palette.json → shape.order` fixes the
  slot order; slot 3 is always the triangle whether or not slots 1–2 are on screen.
- **Shape encodes a class, never a magnitude.** A density or heat grid keeps one silhouette throughout —
  a second one sends the reader hunting for a grouping that is not there. `dotmatrix` is built this way
  on purpose.
- **Normalise optical area first.** A triangle fills about half of what a rounded square does; in a unit
  chart one mark is one unit, so an un-normalised triangle group silently reads as half its count. The
  factors live in `palette.json → shape.area_norm` and the engine applies them. Leave room in the cell
  gap for the largest factor (the triangle, ×1.28).
- Off below 14 px — the silhouettes stop separating and only colour is left. Off past 4 groups — they
  start interfering; fold the tail into Other.

## The unit family — waffle / unit / dotmatrix / statuswall

- Use them only for a **countable** quantity: counts, shares, densities, discrete states. A continuous
  measure cannot be cut into marks (you cannot draw 3.7 °C or ¥168.42), and a time series is read as a
  trend, not a tally — those stay with line, area and candle.
- Keep the marks countable: roughly **150 marks per chart** and **30 per column** is where counting stops
  and estimating starts, and a bar chart estimates better. `render.py --validate` enforces both.
- One mark stands for a round number. "One mark = 37.4" is not a unit.
- The remainder mark is **part-filled, never rounded away**, and the exact value is still printed.
- A status wall never encodes severity by colour alone — that is the classic colour-blindness trap. Every
  state carries its own silhouette and its own word.

## Anti-patterns — if the output matches one of these, fix it

- A second y-axis. A rainbow ramp for magnitude. More than 8 categorical colours.
- A bar chart with one bar when a KPI would suffice; a donut with more than six slices. Two-slice donuts can serve a simple share, while bars are better for close comparisons.
- Shading nominal categories by size — that encodes length twice and wastes the colour channel.
- A label clipped by its own bar; a title that is only the metric name; a number on every point.
- Extra metrics, icons or captions added to fill space.
- A ramp that shades a ranking by rank, a gradient fill under more than one line, a tick ring, a glow.
- A gradient or shadow running **along** a bar's length; a drop shadow on a mark; any perspective or
  isometric projection. A bar-top radius at half the bar width (it reads as a finger).
- A cast member sitting *beside* the element it stands for instead of replacing it — an end dot **and** a
  character, a legend swatch **and** a character. That is a sticker, not an identity.
- A cast member used as a **container**: the number bursts out of the silhouette and the label and delta
  end up orphaned outside it. The card is the container; the character is a 22 px token inside it.
- A cast member riding the tip of a bar or the end of a ranking row — it lends the mark length it does not
  have. Heads go on the axis side of the shared origin, in a slot reserved on every row.
- A cast member on a funnel step, a heat cell or a matrix cell: those encode order or magnitude, and shape
  encodes neither.
- Shape used for a magnitude, or unit marks so numerous nobody counts them.
