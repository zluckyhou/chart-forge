# Choosing a form — start from what the reader must see

The form follows the **job the data has to do**, not the shape the data happens to have.
Write the conclusion as one sentence first (that sentence becomes the title), then pick the chart
that proves it fastest.

| The job | Sounds like | Form | Notes |
|---|---|---|---|
| One number, and whether it moved | "What is MRR this month, and is it up?" | `kpi` | Never draw one bar for one number. Pair it with a delta and a sparkline. |
| Change over time | "How did DAU move, and where did it turn?" | `line` (several series) / `area` (one) | Annotate the event that explains the turn; add the target as a reference line. ≤ 4 series, otherwise small multiples. |
| Compare categories | "Which channel/month/version is biggest?" | `bar` (vertical, grouped or stacked) | Vertical when the categories have a time order. ≤ 8 categories. |
| Rank, find the head or the tail | "Who leads, who is below average?" | `bar` + `horizontal: true` | Sorted, numbered, with an average line. Highlight only the subject of the sentence. |
| Part of a whole | "Where do orders come from?" | `donut` | ≤ 6 slices; switch to bars when shares are close. Two slices is a `kpi`, not a donut. |
| Relationship between two measures | "Does spend actually buy signups?" | `scatter` | ≤ 3 groups. Turn on medians to read it as quadrants. |
| Density across two dimensions | "Which weekday and hour is busiest?" | `heatmap` | One hue, light → dark. Marginal bars give the row and column totals. |
| Price / OHLC over time | "How did it trade this quarter?" | `candle` | Axis frames the range instead of anchoring at zero. |
| Several unlike measures per row | "Per variant: users, conversion, delta, verdict" | `table` | In-cell bars, tags, sorting. |
| Step-by-step drop-off | "Where do people leave checkout?" | `funnel` | Steps must decrease. The neck shows the loss; the worst step is badged. |
| Composition changing over time | "How did the channel mix shift?" | stacked `bar`, or `area` small multiples | Avoid 100 % stacked areas — the middle bands are unreadable. |
| Two measures of very different magnitude | "Users vs revenue" | **two charts**, or index both to 100 | Never a second y-axis. |
| Part of a whole, and the reader will **count** | "How much of revenue is subscription?" | `waffle` | 100 marks = 100 %. Beats a donut when shares are close, because counting beats estimating an angle. |
| A small count, per category | "How many customers signed this week?" | `unit` | One mark = one whole thing. Only when the tallest column is ≤ 30 marks. |
| Density, when the grid should read as objects | "Which weekday and hour is busiest?" | `dotmatrix` | Size **and** shade say the same thing, so it survives greyscale. One silhouette throughout — see below. |
| Discrete states across many things | "Which services are down?" | `statuswall` | Every state has its own silhouette as well as its colour. Severity is never colour alone. |

## The countable / continuous fork

Before anything else, ask **what kind of quantity this is** — it decides a whole family of forms:

- **Countable** — counts, shares, densities, discrete states. The unit family (`waffle`, `unit`,
  `dotmatrix`, `statuswall`) encodes *quantity of marks*: the reader counts objects instead of measuring
  an edge, and every mark is a 1:1 shape that carries the full plump treatment. It also opens a second
  channel — **shape** — so a group survives greyscale and colour blindness.
- **Continuous** — prices, rates, temperatures, anything with a decimal that means something. It cannot
  be cut into marks, so it stays with `bar`, `line`, `area`, `candle`, `heatmap`. These keep the same
  element layer (radius, end token, stroke scale, elevation, state motion, palette) but never change form.

Two guards: keep it under ~150 marks per chart and ~30 per column — past that nobody counts, they
estimate, and a bar chart estimates better. And **one mark must stand for a round number**; "one mark =
37.4" is not a unit. `--validate` enforces both.

`waffle` vs `donut`: reach for the waffle when the shares are close or the reader will be quoted the
number, and for the donut when one slice obviously dominates and the shape of the split is the point.

## After picking, do three things

1. **Write a conclusion title.** `title` is the sentence ("Mobile passed desktop in September");
   `subtitle` carries what is measured, the period, the unit and the provenance
   ("Sessions by device · Jan 2025 – Jun 2026 · thousands · sample data"). Two lines, never three.
2. **Decide the emphasis.** One subject → `highlight` it and let the rest go grey. A target → `refLines`.
   A turning point with a cause → `annotations`.
3. **Check the data fits the form.** Fold a long tail into "Other" past 8 series; split scatter groups
   past 3; merge donut slices past 6; re-check the definition if a funnel is not monotonic.

## When not to draw a chart at all

- A single number → `kpi`.
- The reader needs exact values, not the shape → a table (every chart already ships a **Table** view).
- More than ~12 unordered categories → filter or aggregate first.

## table vs heatmap — the mistake that costs a redraw

Both take matrix-shaped data, and picking the wrong one hides the point:

- **One measure spread over two dimensions** → `heatmap`. One colour scale covers the whole grid, so
  any cell is comparable to any other. Use `diverging` for signed values, the default ramp for
  all-positive ones, and `cellLabels` when exact numbers matter too.
- **Each row carrying several unlike measures** → `table` (Δ return / Δ drawdown / Δ Sharpe / a verdict).
  Sorting, tags, sub-rows and two-level headers are table-only.

The test: *can every cell share one unit and one colour scale?* Yes → heatmap. No → table.

In a table, any `bar` used to compare **across** columns **must** declare `barGroup`; otherwise each
column normalises to its own maximum and the bar lengths contradict each other.
