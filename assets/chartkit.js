/* Chart Forge runtime — zero-dependency interactive charts (SVG + DOM). One JSON spec in, one chart out.
 * Entry: ChartKit.render(container, spec). Spec schema: references/spec.md.
 * Baked-in rules: color follows the entity (never its rank) · thin marks, hairline grid · legend for >= 2 series ·
 * a hover layer on every chart · a table twin for every chart · labels are untrusted text (textContent only).
 * Signature devices (what makes these read faster than a default chart):
 *   bar      — hover lights up the whole category as a soft band; last period is direct-labelled; stacks carry totals
 *   ranking  — a dashed average line through the bars, one highlighted subject (rank numerals on request)
 *   line     — FT-style end labels (name + value), event annotations, peak marker, target line, smooth monotone curves
 *   donut    — legend rows carry proportional data bars; center readout follows the hover
 *   scatter  — hover drop-lines to both axes with value chips; top points labelled; median quadrants
 *   heatmap  — row / column marginal bars so the busiest day and hour read at a glance
 *   funnel   — real "necks" between steps show where people leave, with the step conversion in the neck
 * Registers: `analyse` (default) keeps the toolbar in view; `publish` hides it until hover and never prints it to PNG.
 * Motion: one entrance per card (bars rise, lines draw, slices fade in), then still. See chartkit.css.
 */
(function () {
  'use strict';
  var SVG = 'http://www.w3.org/2000/svg';
  var SERIES = ['var(--ck-s1)', 'var(--ck-s2)', 'var(--ck-s3)', 'var(--ck-s4)', 'var(--ck-s5)', 'var(--ck-s6)', 'var(--ck-s7)', 'var(--ck-s8)'];
  var RAMP = ['var(--ck-q0)', 'var(--ck-q1)', 'var(--ck-q2)', 'var(--ck-q3)', 'var(--ck-q4)', 'var(--ck-q5)', 'var(--ck-q6)', 'var(--ck-q7)'];
  var ORDINAL = ['var(--ck-o1)', 'var(--ck-o2)', 'var(--ck-o3)', 'var(--ck-o4)', 'var(--ck-o5)', 'var(--ck-o6)'];
  var ORDINAL_INK = ['#16161a', '#16161a', '#ffffff', '#ffffff', '#ffffff', '#ffffff'];
  var DIM = 'var(--ck-dim)';
  var uid = 0;
  var DEFAULTS = { register: 'analyse', motion: true };
  function motionOn(spec) {
    if (spec.motion === false || (spec.motion === undefined && !DEFAULTS.motion)) return false;
    if (document.documentElement.getAttribute('data-motion') === 'off') return false;
    try { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false; } catch (e) {}
    return true;
  }
  function delay(ms) { return 'animation-delay:' + ms + 'ms'; }

  /* ---------- i18n ----------
   * Only the CHROME is translated (buttons, table headers, tooltip labels, scale notes).
   * Everything the spec says — titles, series names, categories — is printed as the author wrote it.
   * Language is auto-detected from the spec's own text: any CJK anywhere → zh, otherwise en.
   * Force it with `"lang": "zh" | "en"` on the spec. */
  var STR = {
    en: { table: 'Table', grouped: 'Grouped', stacked: 'Stacked', lineMode: 'Line', areaMode: 'Area', donutMode: 'Donut', barsMode: 'Bars',
      category: 'Category', value: 'Value', total: 'Total', share: 'Share', name: 'Name', group: 'Group', items: 'items', unit: 'unit',
      sortByValue: 'By value', original: 'As given', average: 'Average', baseline: 'Baseline', peak: 'Peak', medians: 'Medians', all: 'All', other: 'Other',
      rankOverall: 'Rank overall', xAxis: 'x · ', yAxis: 'y · ',
      ofFirst: '% of first', ofPrev: '% of previous', stage: 'Stage', count: 'Count', stepLoss: 'Lost here', lostVsPrev: 'Lost vs previous',
      toNext: '% continue', overall: 'Overall conversion · ', biggestDrop: 'Biggest drop: ', worstBadge: 'biggest drop',
      period: 'Period', open: 'Open', high: 'High', low: 'Low', close: 'Close', changePct: 'Change', amplitude: 'Range',
      darkerHigher: ' · darker means higher', darkerAbs: ', darker means larger',
      margSum: ' · grey bars are row and column totals', margAvg: ' · grey bars are row and column averages',
      divergeCn: ' · red positive, green negative', divergeIntl: ' · green positive, red negative',
      unknownType: 'Unknown chart type: ' },
    zh: { table: '表格', grouped: '分组', stacked: '堆叠', lineMode: '折线', areaMode: '面积', donutMode: '环形', barsMode: '条形',
      category: '类别', value: '数值', total: '合计', share: '占比', name: '名称', group: '分组', items: '项', unit: '单位',
      sortByValue: '按值排序', original: '原始顺序', average: '平均', baseline: '基准', peak: '峰值', medians: '中位线', all: '全部', other: '其他',
      rankOverall: '全表排名', xAxis: '横轴 · ', yAxis: '纵轴 · ',
      ofFirst: '占首步比例', ofPrev: '相对上一步', stage: '环节', count: '数量', stepLoss: '本步流失', lostVsPrev: '较上一步流失',
      toNext: '% 进入下一步', overall: '整体转化率 · ', biggestDrop: '流失最多：', worstBadge: '流失最多',
      period: '期间', open: '开', high: '高', low: '低', close: '收', changePct: '涨跌幅', amplitude: '振幅',
      darkerHigher: ' · 颜色越深数值越高', darkerAbs: '，越深绝对值越大',
      margSum: ' · 右侧 / 底部灰条为行列合计', margAvg: ' · 右侧 / 底部灰条为行列均值',
      divergeCn: ' · 红=正值 绿=负值', divergeIntl: ' · 绿=正值 红=负值',
      unknownType: '未知图表类型：' }
  };
  var L = STR.en;
  function hasCJK(s) { return /[\u3400-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af]/.test(s); }
  function pickLang(spec) {
    if (spec.lang === 'zh' || spec.lang === 'en') return spec.lang;
    var probe = [spec.title, spec.subtitle, spec.eyebrow, spec.note].filter(Boolean).join(' ');
    try { probe += JSON.stringify(spec.data || {}) + JSON.stringify(spec.options || {}); } catch (e) {}
    return hasCJK(probe) ? 'zh' : 'en';
  }

  /* ---------- DOM helpers ---------- */
  function el(tag, attrs, children) { var n = document.createElement(tag); setAttrs(n, attrs); append(n, children); return n; }
  function sv(tag, attrs, children) { var n = document.createElementNS(SVG, tag); setAttrs(n, attrs); append(n, children); return n; }
  function setAttrs(node, attrs) {
    if (!attrs) return;
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'text') node.textContent = String(v);
      else if (k === 'style' && typeof v === 'object') Object.keys(v).forEach(function (p) { node.style[p] = v[p]; });
      else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : String(v));
    });
  }
  function append(node, children) {
    if (children === undefined || children === null) return;
    (Array.isArray(children) ? children : [children]).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function textW(s, px) { var w = 0; for (var i = 0; i < s.length; i++) w += s.charCodeAt(i) > 255 ? px : px * 0.58; return w; }

  /* ---------- numbers ---------- */
  function fmt(v, f) {
    f = f || {};
    if (v === null || v === undefined || isNaN(v)) return '—';
    var d = f.decimals, out, abs = Math.abs(v), sign = v < 0 ? '−' : '';
    switch (f.format || 'number') {
      case 'percent': out = abs.toFixed(d === undefined ? 1 : d) + '%'; break;
      case 'compact':
        if (abs >= 1e9) out = (abs / 1e9).toFixed(d === undefined ? 1 : d) + 'B';
        else if (abs >= 1e6) out = (abs / 1e6).toFixed(d === undefined ? 1 : d) + 'M';
        else if (abs >= 1e3) out = (abs / 1e3).toFixed(d === undefined ? 1 : d) + 'K';
        else out = thousands(abs, d);
        break;
      case 'cn':
        if (abs >= 1e8) out = (abs / 1e8).toFixed(d === undefined ? 2 : d) + '亿';
        else if (abs >= 1e4) out = (abs / 1e4).toFixed(d === undefined ? 1 : d) + '万';
        else out = thousands(abs, d);
        break;
      case 'currency': out = (f.currency || '¥') + thousands(abs, d === undefined ? 0 : d); break;
      default: out = thousands(abs, d);
    }
    return sign + out + (f.unit ? ' ' + f.unit : '');
  }
  function thousands(v, d) {
    var n = d === undefined ? (Math.abs(v) < 10 && v % 1 !== 0 ? 2 : (v % 1 !== 0 ? 1 : 0)) : d;
    return Number(v).toLocaleString('en-US', { minimumFractionDigits: n, maximumFractionDigits: n });
  }
  function niceStep(raw) {
    var p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
    return (m <= 1 ? 1 : m <= 1.5 ? 1.5 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 3 ? 3 : m <= 4 ? 4 : m <= 5 ? 5 : 10) * p;
  }
  function niceAxis(max, min, loose) {
    min = min || 0;
    if (min < 0 || loose) { // negative domain, or loose (no zero anchor): round both ends out to a multiple of step
      var best0 = null;
      [4, 5, 6].forEach(function (div) {
        var step = niceStep((max - min || 1) / div);
        var lo = Math.floor(min / step) * step, hi = Math.ceil((max || 0) / step) * step;
        var cand = { min: lo, max: hi, step: step, div: Math.round((hi - lo) / step) };
        if (!best0 || cand.max - cand.min < best0.max - best0.min - 1e-9) best0 = cand;
      });
      return best0;
    }
    if (!(max > 0)) return { min: 0, max: 4, step: 1, div: 4 };
    var best = null;
    [4, 5].forEach(function (div) {
      var step = niceStep(max / div);
      var cand = { min: 0, max: step * div, step: step, div: div };
      if (!best || cand.max < best.max - 1e-9) best = cand;
    });
    return best;
  }
  function sum(a) { return a.reduce(function (x, y) { return x + (y || 0); }, 0); }
  function maxOf(a) { return Math.max.apply(null, a); }
  function minOf(a) { return Math.min.apply(null, a); }
  function median(a) { var s = a.slice().sort(function (x, y) { return x - y; }); var m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
  function deltaText(v) { return (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1) + '%'; }
  function fOf(o) { return { format: o.format, unit: o.unit, currency: o.currency, decimals: o.decimals }; }
  function axisLabel(v, axis, f) {
    f = f || {};
    if ((f.format === 'compact' || f.format === undefined || f.format === 'number') && axis.max >= 10000 && f.format !== 'number') {
      var k = axis.max >= 1e6 ? 1e6 : 1e3, suffix = axis.max >= 1e6 ? 'M' : 'K', t = v / k;
      return v === 0 ? '0' : (Math.round(t * 100) / 100).toString() + suffix;
    }
    if (f.format === 'cn' && axis.max >= 10000) { var w = v / 1e4; return v === 0 ? '0' : (Math.round(w * 100) / 100).toString() + '万'; }
    return fmt(v, Object.assign({}, f, { decimals: axis.step % 1 === 0 ? 0 : undefined, unit: undefined }));
  }

  /* monotone cubic (Fritsch–Carlson): smooth without overshooting the data */
  function smoothPath(pts) {
    var n = pts.length; if (n < 3) return 'M' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' L');
    var dx = [], dy = [], m = [], i;
    for (i = 0; i < n - 1; i++) { dx.push(pts[i + 1][0] - pts[i][0]); dy.push(pts[i + 1][1] - pts[i][1]); m.push(dy[i] / (dx[i] || 1)); }
    var t = [m[0]];
    for (i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2);
    t.push(m[n - 2]);
    for (i = 0; i < n - 1; i++) { if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; } else { var a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b; if (s > 9) { var tau = 3 / Math.sqrt(s); t[i] = tau * a * m[i]; t[i + 1] = tau * b * m[i]; } } }
    var d = 'M' + pts[0][0].toFixed(1) + ',' + pts[0][1].toFixed(1);
    for (i = 0; i < n - 1; i++) { var h = dx[i]; d += ' C' + (pts[i][0] + h / 3).toFixed(1) + ',' + (pts[i][1] + t[i] * h / 3).toFixed(1) + ' ' + (pts[i + 1][0] - h / 3).toFixed(1) + ',' + (pts[i + 1][1] - t[i + 1] * h / 3).toFixed(1) + ' ' + pts[i + 1][0].toFixed(1) + ',' + pts[i + 1][1].toFixed(1); }
    return d;
  }
  function linePath(pts, smooth) { return smooth ? smoothPath(pts) : 'M' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' L'); }
  function roundedTop(x, y, w, h, r) {
    r = Math.min(r, w / 2, h); if (h <= 0) return '';
    return 'M' + x + ',' + (y + h) + ' V' + (y + r) + ' Q' + x + ',' + y + ' ' + (x + r) + ',' + y + ' H' + (x + w - r) + ' Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + ' V' + (y + h) + ' Z';
  }
  function chip(g, x, y, text, anchor) {
    var w = textW(text, 10.5) + 12, h = 17, left = anchor === 'end' ? x - w : anchor === 'middle' ? x - w / 2 : x;
    g.appendChild(sv('rect', { class: 'ck-chip', x: left, y: y - h / 2, width: w, height: h, rx: 8.5 }));
    g.appendChild(sv('text', { class: 'ck-chip-text ck-num', x: left + w / 2, y: y + 3.5, 'text-anchor': 'middle', text: text }));
  }

  /* ---------- card shell ---------- */
  function card(spec, width) {
    var reg = spec.register === 'publish' || spec.register === 'analyse' ? spec.register : DEFAULTS.register;
    var c = el('figure', { class: 'ck-card' + (motionOn(spec) ? ' ck-motion' : ''), 'data-register': reg, style: { width: width + 'px' } });
    if (c.classList.contains('ck-motion')) setTimeout(function () { c.classList.remove('ck-motion'); }, 1800);
    var head = el('div', { class: 'ck-head' }), titles = el('div');
    // Two lines, never three: the conclusion, then one line of context.
    // A legacy `eyebrow` is folded into the front of the subtitle instead of stacking a third line.
    var sub = [spec.eyebrow, spec.subtitle].filter(Boolean).join(' · ');
    if (spec.title) titles.appendChild(el('h3', { class: 'ck-title', text: spec.title }));
    if (sub) titles.appendChild(el('p', { class: 'ck-sub', text: sub }));
    head.appendChild(titles);
    var controls = el('div', { class: 'ck-controls' }); head.appendChild(controls); c.appendChild(head);
    var legend = el('div', { class: 'ck-legend' }); c.appendChild(legend);
    var body = el('div', { class: 'ck-body' }); c.appendChild(body);
    var tip = el('div', { class: 'ck-tip' }); body.appendChild(tip);
    if (spec.note) c.appendChild(el('p', { class: 'ck-note', text: spec.note }));
    if (spec.source) c.appendChild(el('p', { class: 'ck-source', text: spec.source }));
    return { root: c, controls: controls, legend: legend, body: body, tip: tip };
  }
  function segmented(options, value, onChange) {
    var seg = el('div', { class: 'ck-seg', role: 'group' });
    options.forEach(function (o) {
      seg.appendChild(el('button', { type: 'button', 'aria-pressed': String(o.value === value), text: o.label, onclick: function () {
        each(seg.children, function (b, i) { b.setAttribute('aria-pressed', String(options[i].value === o.value)); });
        onChange(o.value);
      } }));
    });
    return seg;
  }
  function toggleButton(label, pressed, onChange) {
    var b = el('button', { type: 'button', class: 'ck-btn', 'aria-pressed': String(!!pressed), text: label });
    b.addEventListener('click', function () { var on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on)); onChange(on); });
    return b;
  }
  function legendFor(ui, series, shape, hidden, onToggle, hide) {
    clear(ui.legend);
    if (series.length < 2 || hide) { ui.legend.style.display = 'none'; return; }
    ui.legend.style.display = '';
    series.forEach(function (s, i) {
      ui.legend.appendChild(el('button', { type: 'button', 'aria-pressed': String(!hidden[i]), onclick: function () { onToggle(i); } }, [el('i', { class: 'ck-key ' + shape, style: { background: s.color } }), s.name]));
    });
  }
  function showTip(ui, title, rows, x, y, plotW) {
    clear(ui.tip);
    if (title) ui.tip.appendChild(el('div', { class: 't', text: title }));
    rows.forEach(function (r) {
      var row = el('div', { class: 'r' + (r.em ? ' em' : '') });
      if (r.color) row.appendChild(el('i', { class: 'ck-key ' + (r.shape || 'line'), style: { background: r.color } }));
      row.appendChild(el('span', { class: 'n', text: r.name }));
      row.appendChild(el('span', { class: 'v ck-num', text: r.value }));
      ui.tip.appendChild(row);
    });
    ui.tip.classList.add('on');
    var w = ui.tip.offsetWidth || 160;
    ui.tip.style.left = Math.max(0, x + 16 + w > plotW ? x - w - 16 : x + 16) + 'px';
    ui.tip.style.top = Math.max(0, y) + 'px';
  }
  function hideTip(ui) { ui.tip.classList.remove('on'); }
  function tableView(columns, rows) {
    var t = el('table', { class: 'ck-table' });
    t.appendChild(el('thead', null, el('tr', null, columns.map(function (c) { return el('th', { text: c }); }))));
    t.appendChild(el('tbody', null, rows.map(function (r) { return el('tr', null, r.map(function (v, i) { return el('td', { class: i ? 'ck-num' : '', text: v }); })); })));
    return el('div', { class: 'ck-table-wrap' }, t);
  }
  function seriesOf(spec) {
    var hl = spec.options && spec.options.highlight;
    return (spec.data.series || []).map(function (s, i) {
      var dimmed = hl && hl.length && hl.indexOf(s.name) === -1;
      return { name: s.name, values: s.values, color: dimmed ? DIM : (s.color || SERIES[i % 8]), dimmed: !!dimmed };
    });
  }
  function hitEvents(node, enter, leave) {
    node.setAttribute('tabindex', '0');
    node.addEventListener('mouseenter', enter); node.addEventListener('focus', enter);
    node.addEventListener('mouseleave', leave); node.addEventListener('blur', leave);
  }
  function axisY(g, plotW, plotH, axis, f) {
    var lo = axis.min || 0;
    for (var i = 0; i <= axis.div; i++) {
      var y = plotH - (plotH * i / axis.div), v = lo + axis.step * i;
      var isZero = Math.abs(v) < axis.step * 1e-6;
      g.appendChild(sv('line', { class: isZero || (i === 0 && lo >= 0) ? 'ck-base' : 'ck-grid', x1: 0, x2: plotW, y1: y + 0.5, y2: y + 0.5 }));
      g.appendChild(sv('text', { x: -10, y: y + 4, 'text-anchor': 'end', class: 'ck-num', text: axisLabel(v, axis, f) }));
    }
  }
  function refLines(g, lines, plotW, yOf, f) {
    (lines || []).forEach(function (r) {
      var y = yOf(r.value);
      g.appendChild(sv('line', { class: 'ck-ref', x1: 0, x2: plotW, y1: y, y2: y }));
      g.appendChild(sv('text', { class: 'ck-ref-label ck-num', x: plotW, y: y - 6, 'text-anchor': 'end', text: (r.label ? r.label + ' ' : '') + fmt(r.value, f) }));
    });
  }
  function axisMax(values, lines) { return maxOf(values.concat((lines || []).map(function (r) { return r.value; }))); }

  /* ---------- BAR (vertical grouped / stacked) ---------- */
  function renderBar(ui, spec, width) {
    var o = spec.options || {}, f = fOf(o);
    if (o.horizontal) return renderRanking(ui, spec, width);
    var cats = spec.data.categories, series = seriesOf(spec);
    var st = { stacked: o.mode === 'stacked', hidden: series.map(function () { return false; }), table: false };
    if (series.length > 1 && o.toggle !== false) ui.controls.appendChild(segmented([{ label: L.grouped, value: false }, { label: L.stacked, value: true }], st.stacked, function (v) { st.stacked = v; draw(); }));
    ui.controls.appendChild(toggleButton(L.table, false, function (v) { st.table = v; draw(); }));
    var padL = 52, padR = 12, plotH = o.height || 260, plotW = width - 52 - padL - padR, labelH = 26;
    var labels = o.valueLabels || (series.length === 1 && cats.length <= 8 ? 'all' : 'last');
    function visible() { return series.filter(function (s, i) { return !st.hidden[i]; }); }
    function draw() {
      clear(ui.body); ui.body.appendChild(ui.tip);
      legendFor(ui, series, 'rect', st.hidden, function (i) { if (!st.hidden[i] && visible().length === 1) return; st.hidden[i] = !st.hidden[i]; draw(); });
      if (st.table) {
        ui.body.appendChild(tableView([o.categoryLabel || L.category].concat(series.map(function (s) { return s.name; })).concat(series.length > 1 ? [L.total] : []),
          cats.map(function (c, i) { var row = [c].concat(series.map(function (s) { return fmt(s.values[i], f); })); if (series.length > 1) row.push(fmt(sum(series.map(function (s) { return s.values[i]; })), f)); return row; })));
        return;
      }
      var vis = visible(), n = cats.length;
      var dataMax = st.stacked ? maxOf(cats.map(function (c, i) { return sum(vis.map(function (s) { return s.values[i]; })); })) : maxOf(vis.map(function (s) { return maxOf(s.values); }));
      // negative values: the axis crosses zero and bars grow downward from it (P&L, YoY growth)
      var dataMin = st.stacked ? 0 : Math.min(0, minOf(vis.map(function (s) { return minOf(s.values); })));
      (o.refLines || []).forEach(function (r) { dataMin = Math.min(dataMin, r.value); });
      var axis = niceAxis(axisMax([dataMax], o.refLines) * 1.08, dataMin < 0 ? dataMin * 1.08 : 0);
      var span = axis.max - (axis.min || 0);
      var yOf = function (v) { return plotH - (v - (axis.min || 0)) / span * plotH; };
      var yZero = axis.min < 0 ? yOf(0) : plotH;
      var svg = sv('svg', { class: 'ck-plot', width: width - 52, height: plotH + labelH });
      var g = sv('g', { transform: 'translate(' + padL + ',0)' }); svg.appendChild(g);
      var bands = sv('g'); g.appendChild(bands);
      axisY(g, plotW, plotH, axis, f);
      var slot = plotW / n, k = vis.length;
      var barW = st.stacked ? Math.min(30, slot * 0.56) : Math.min(28, (slot * 0.72 - 3 * (k - 1)) / k);
      var groupW = st.stacked ? barW : barW * k + 3 * (k - 1);
      var bandEls = [];
      cats.forEach(function (c, ci) {
        var band = sv('rect', { class: 'ck-band', x: slot * ci + 3, y: -4, width: slot - 6, height: plotH + 4, style: 'opacity:0' });
        bands.appendChild(band); bandEls.push(band);
        var x0 = slot * ci + (slot - groupW) / 2, acc = 0;
        vis.forEach(function (s, si) {
          var v = s.values[ci] || 0, neg = v < 0, x, y, h;
          if (st.stacked) { x = x0; y = yOf(acc + v); h = Math.abs(v) / span * plotH; acc += v; }
          else { x = x0 + si * (barW + 3); y = neg ? yZero : yOf(v); h = Math.abs(yOf(v) - yZero); }
          var top = st.stacked ? si === vis.length - 1 : true, gap = st.stacked && si > 0 ? 2 : 0;
          var hh = Math.max(0, h - gap);
          var d = (top && !neg) ? roundedTop(x, y, barW, hh, 5)
                : (neg ? 'M' + x + ',' + (y + hh) + ' h' + barW + ' v' + (-hh) + ' h' + (-barW) + ' Z'
                       : 'M' + x + ',' + y + ' h' + barW + ' v' + hh + ' h' + (-barW) + ' Z');
          g.appendChild(sv('path', { class: 'ck-mark' + (neg ? ' ck-in' : ' ck-rise'), style: delay(ci * 50 + si * 30), d: d, fill: s.color }));
          var showLabel = !st.stacked && (labels === 'all' || (labels === 'last' && ci === n - 1));
          if (showLabel && !s.dimmed) g.appendChild(sv('text', { class: 'ck-vlabel ck-halo ck-num ck-in', style: delay(400 + ci * 50), x: x + barW / 2, y: neg ? y + hh + 13 : y - 7, 'text-anchor': 'middle', text: fmt(v, f) }));
        });
        if (st.stacked && vis.length > 1) g.appendChild(sv('text', { class: 'ck-total ck-halo ck-num ck-in', style: delay(400 + ci * 50), x: x0 + barW / 2, y: yOf(acc) - 7, 'text-anchor': 'middle', text: fmt(acc, f) }));
        var hit = sv('rect', { class: 'ck-hit', x: slot * ci, y: 0, width: slot, height: plotH });
        hitEvents(hit, function () {
          bandEls.forEach(function (b, j) { b.style.opacity = j === ci ? 1 : 0; });
          var total = sum(vis.map(function (ss) { return ss.values[ci]; }));
          var rows = vis.map(function (ss) { return { name: ss.name, color: ss.color, shape: 'rect', value: fmt(ss.values[ci], f) }; });
          var top = yOf(st.stacked ? total : maxOf(vis.map(function (ss) { return ss.values[ci]; })));
          showTip(ui, c + (vis.length > 1 ? ' · ' + L.total + ' ' + fmt(total, f) : ''), rows, padL + slot * ci + slot / 2, Math.max(0, top - 12), width - 52);
        }, function () { bandEls.forEach(function (b) { b.style.opacity = 0; }); hideTip(ui); });
        g.appendChild(hit);
        g.appendChild(sv('text', { class: ci === n - 1 ? 'ck-xlast' : '', x: slot * ci + slot / 2, y: plotH + 19, 'text-anchor': 'middle', text: c }));
      });
      refLines(g, o.refLines, plotW, yOf, f);
      ui.body.appendChild(svg);
    }
    draw();
  }

  /* ---------- RANKING (horizontal bars) ---------- */
  function renderRanking(ui, spec, width) {
    var o = spec.options || {}, f = fOf(o);
    var cats = spec.data.categories, s = seriesOf(spec)[0], hl = o.highlight || [];
    var items = cats.map(function (c, i) { return { name: c, value: s.values[i], hl: hl.indexOf(c) !== -1, color: hl.length ? (hl.indexOf(c) === -1 ? DIM : SERIES[0]) : ((spec.data.colors && spec.data.colors[i]) || s.color) }; });
    var st = { sorted: o.sort !== false, table: false };
    if (o.sortToggle) ui.controls.appendChild(segmented([{ label: L.sortByValue, value: true }, { label: L.original, value: false }], st.sorted, function (v) { st.sorted = v; draw(); }));
    ui.controls.appendChild(toggleButton(L.table, false, function (v) { st.table = v; draw(); }));
    var total = sum(items.map(function (x) { return x.value; })), max = maxOf(items.map(function (x) { return x.value; }));
    var ref = o.reference === 'average' ? { value: total / items.length, label: L.average } : (o.reference && typeof o.reference === 'object' ? o.reference : null);
    var labelW = o.labelWidth || 72, valueW = 120;
    function draw() {
      clear(ui.body); ui.body.appendChild(ui.tip); ui.legend.style.display = 'none';
      var list = st.sorted ? items.slice().sort(function (a, b) { return b.value - a.value; }) : items;
      if (st.table) { ui.body.appendChild(tableView(['#', o.categoryLabel || L.category, s.name || L.value, L.share], list.map(function (it, i) { return [String(i + 1), it.name, fmt(it.value, f), (it.value / total * 100).toFixed(1) + '%']; }))); return; }
      var wrap = el('div', { class: 'ck-rows' });
      if (ref) {
        var head = el('div', { class: 'ck-ref-head' }, [o.rankNumbers ? el('span', { class: 'ck-rank' }) : null, el('span', { style: { width: labelW + 'px', flex: 'none' } }),
          el('div', { style: { flex: 1, position: 'relative', height: '14px' } }, el('span', { class: 'lab ck-num', style: { left: (ref.value / max * 100).toFixed(1) + '%' }, text: (ref.label || L.baseline) + ' ' + fmt(ref.value, f) })), el('span', { style: { width: valueW + 'px', flex: 'none' } })]);
        wrap.appendChild(head);
      }
      list.forEach(function (it, i) {
        var row = el('div', { class: 'ck-row' + (it.hl ? ' hl' : '') });
        if (o.rankNumbers) row.appendChild(el('span', { class: 'ck-rank ck-num', text: (i + 1 < 10 ? '0' : '') + (i + 1) }));
        row.appendChild(el('span', { class: 'lbl', style: { width: labelW + 'px', color: it.hl ? 'var(--ck-ink)' : '', fontWeight: it.hl ? 600 : 400 }, text: it.name }));
        var trk = el('div', { class: 'trk' }, el('div', { class: 'fill ck-mark ck-grow', style: { width: (it.value / max * 100).toFixed(1) + '%', background: it.color, animationDelay: (i * 70) + 'ms' } }));
        if (ref) trk.appendChild(el('div', { class: 'ref', style: { left: (ref.value / max * 100).toFixed(1) + '%' } }));
        row.appendChild(trk);
        var val = el('span', { class: 'val ck-num ck-in', style: { width: valueW + 'px', animationDelay: (300 + i * 70) + 'ms', fontWeight: it.hl || !hl.length ? 600 : 500, color: it.hl || !hl.length ? '' : 'var(--ck-ink2)' }, text: fmt(it.value, f) });
        row.appendChild(val);
        hitEvents(row, function () {
          each(wrap.querySelectorAll('.ck-row'), function (r) { r.classList.toggle('dim', r !== row); });
          val.textContent = (it.value / total * 100).toFixed(1) + '%' + (ref ? ' · ' + deltaText((it.value - ref.value) / ref.value * 100) : '');
        }, function () { each(wrap.querySelectorAll('.ck-row'), function (r) { r.classList.remove('dim'); }); val.textContent = fmt(it.value, f); });
        wrap.appendChild(row);
      });
      ui.body.appendChild(wrap);
    }
    draw();
  }

  /* ---------- LINE / AREA ---------- */
  function renderLine(ui, spec, width) {
    var o = spec.options || {}, f = fOf(o);
    var xs = spec.data.x, series = seriesOf(spec), n = xs.length, smooth = o.smooth !== false, hl = o.highlight || [];
    var st = { area: spec.type === 'area' || !!o.area, hidden: series.map(function () { return false; }), table: false, hover: -1 };
    if (o.toggle !== false) ui.controls.appendChild(segmented([{ label: L.lineMode, value: false }, { label: L.areaMode, value: true }], st.area, function (v) { st.area = v; draw(); }));
    ui.controls.appendChild(toggleButton(L.table, false, function (v) { st.table = v; draw(); }));
    var endLabels = o.endLabels !== false, markMax = o.markMax !== undefined ? o.markMax : series.length === 1;
    var endW = endLabels ? 14 + maxOf(series.map(function (s) { return textW(s.name, 11.5); }).concat(series.map(function (s) { return textW(fmt(s.values[n - 1], f), 11); }))) : 0;
    var padL = 52, padR = Math.max(12, endW), plotH = o.height || 240, plotW = width - 52 - padL - padR, labelH = 26, topPad = (o.annotations && o.annotations.length) ? 22 : (markMax ? 18 : 6);
    function visible() { return series.filter(function (s, i) { return !st.hidden[i]; }); }
    function draw() {
      clear(ui.body); ui.body.appendChild(ui.tip);
      legendFor(ui, series, 'line', st.hidden, function (i) { if (!st.hidden[i] && visible().length === 1) return; st.hidden[i] = !st.hidden[i]; draw(); }, endLabels && o.legend !== true);
      if (st.table) { ui.body.appendChild(tableView([o.xLabel || 'X'].concat(series.map(function (s) { return s.name; })), xs.map(function (x, i) { return [x].concat(series.map(function (s) { return fmt(s.values[i], f); })); }))); return; }
      var vis = visible();
      var dataMin = Math.min(0, minOf(vis.map(function (s) { return minOf(s.values); }).concat((o.refLines || []).map(function (r) { return r.value; }))));
      var axis = niceAxis(axisMax(vis.map(function (s) { return maxOf(s.values); }), o.refLines) * 1.04, dataMin < 0 ? dataMin * 1.04 : 0);
      var xOf = function (i) { return n === 1 ? plotW / 2 : i / (n - 1) * plotW; }, yOf = function (v) { return plotH - (v - (axis.min || 0)) / (axis.max - (axis.min || 0)) * plotH; };
      var yZero = axis.min < 0 ? yOf(0) : plotH;
      var svg = sv('svg', { class: 'ck-plot', width: width - 52, height: plotH + labelH + topPad });
      var defs = sv('defs'); svg.appendChild(defs);
      var g = sv('g', { transform: 'translate(' + padL + ',' + topPad + ')' }); svg.appendChild(g);
      axisY(g, plotW, plotH, axis, f);
      (o.annotations || []).forEach(function (a) {
        var i = xs.indexOf(a.x); if (i === -1) return;
        var x = xOf(i);
        g.appendChild(sv('line', { class: 'ck-anno-line', x1: x, x2: x, y1: -8, y2: plotH }));
        g.appendChild(sv('text', { class: 'ck-anno-text ck-halo', x: x + 6, y: -4, text: a.label }));
      });
      var ordered = vis.slice().sort(function (a, b) { return (a.dimmed ? 0 : 1) - (b.dimmed ? 0 : 1); });
      ordered.forEach(function (s) {
        var pts = s.values.map(function (v, i) { return [xOf(i), yOf(v)]; }), d = linePath(pts, smooth);
        if (st.area) {
          var id = 'ckg' + (++uid);
          defs.appendChild(sv('linearGradient', { id: id, x1: 0, y1: 0, x2: 0, y2: 1 }, [sv('stop', { offset: '0%', style: 'stop-color:' + s.color + ';stop-opacity:' + (s.dimmed ? 0.2 : 0.24) }), sv('stop', { offset: '100%', style: 'stop-color:' + s.color + ';stop-opacity:0.02' })]));
          g.appendChild(sv('path', { class: 'ck-mark ck-in', style: delay(500), d: d + ' L' + plotW.toFixed(1) + ',' + yZero.toFixed(1) + ' L0,' + yZero.toFixed(1) + ' Z', fill: 'url(#' + id + ')' }));
        }
        var si = series.indexOf(s), lead = !s.dimmed && (hl.length ? true : si === 0);
        g.appendChild(sv('path', { class: 'ck-mark ck-draw', style: delay(si * 120), pathLength: 1, d: d, fill: 'none', stroke: s.color, 'stroke-width': lead ? 2.4 : 1.8, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
        // the lead series carries a dot on every point (one dot = one period); the others stay as lines
        if (lead && vis.length > 1 && n <= 40 && plotW / n >= 12) s.values.forEach(function (v, i) { g.appendChild(sv('circle', { class: 'ck-in', style: delay(700 + i * 20), cx: xOf(i), cy: yOf(v), r: 2.2, fill: s.color })); });
        g.appendChild(sv('circle', { class: 'ck-ring ck-in', style: delay(900), cx: xOf(n - 1), cy: yOf(s.values[n - 1]), r: 4, fill: s.color }));
      });
      if (endLabels) {
        var labs = vis.map(function (s) { return { s: s, y: yOf(s.values[n - 1]) }; }).sort(function (a, b) { return a.y - b.y; });
        for (var j = 1; j < labs.length; j++) if (labs[j].y - labs[j - 1].y < 26) labs[j].y = labs[j - 1].y + 26;
        labs.forEach(function (l) {
          g.appendChild(sv('text', { class: 'ck-endname ck-in', style: delay(900) + (l.s.dimmed ? ';fill:var(--ck-muted)' : ''), x: plotW + 12, y: l.y - 2, text: l.s.name }));
          g.appendChild(sv('text', { class: 'ck-endval ck-num ck-in', style: delay(900), x: plotW + 12, y: l.y + 11, text: fmt(l.s.values[n - 1], f) }));
        });
      }
      if (markMax && vis.length) {
        var ms = vis.filter(function (s) { return !s.dimmed; })[0] || vis[0], mi = ms.values.indexOf(maxOf(ms.values)), mx = xOf(mi), my = yOf(ms.values[mi]);
        if (!(endLabels && mi === n - 1)) {
          g.appendChild(sv('circle', { class: 'ck-ring', cx: mx, cy: my, r: 4.5, fill: ms.color }));
          g.appendChild(sv('text', { class: 'ck-peak ck-halo ck-num', x: mx, y: my - 11, 'text-anchor': mi > n * 0.8 ? 'end' : (mi < n * 0.2 ? 'start' : 'middle'), text: L.peak + ' ' + fmt(ms.values[mi], f) }));
        }
      }
      refLines(g, o.refLines, plotW, yOf, f);
      var count = Math.min(o.xTicks || 6, n);
      for (var k = 0; k < count; k++) { var i = Math.round(k * (n - 1) / Math.max(1, count - 1)); g.appendChild(sv('text', { x: xOf(i), y: plotH + 19, 'text-anchor': i === 0 ? 'start' : (i === n - 1 ? 'end' : 'middle'), text: xs[i] })); }
      var cross = sv('g', { style: 'display:none' }), vline = sv('line', { class: 'ck-base', y1: 0, y2: plotH }); cross.appendChild(vline);
      var dots = vis.map(function (s) { var c = sv('circle', { class: 'ck-ring', r: 4.5, fill: s.color }); cross.appendChild(c); return c; });
      g.appendChild(cross);
      var hit = sv('rect', { class: 'ck-hit', x: 0, y: 0, width: plotW, height: plotH, style: 'cursor:crosshair' });
      function show(i) {
        st.hover = i; var x = xOf(i);
        cross.style.display = ''; vline.setAttribute('x1', x); vline.setAttribute('x2', x);
        dots.forEach(function (d, j) { d.setAttribute('cx', x); d.setAttribute('cy', yOf(vis[j].values[i])); });
        showTip(ui, xs[i], vis.map(function (s) { return { name: s.name, color: s.color, value: fmt(s.values[i], f) }; }), padL + x, topPad + 4, width - 52);
      }
      function hide() { st.hover = -1; cross.style.display = 'none'; hideTip(ui); }
      hit.addEventListener('mousemove', function (e) { var r = hit.getBoundingClientRect(); show(Math.max(0, Math.min(n - 1, Math.round((e.clientX - r.left) / r.width * (n - 1))))); });
      hit.addEventListener('mouseleave', hide);
      hit.setAttribute('tabindex', '0');
      hit.addEventListener('focus', function () { show(n - 1); }); hit.addEventListener('blur', hide);
      hit.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') { show(Math.max(0, st.hover - 1)); e.preventDefault(); } if (e.key === 'ArrowRight') { show(Math.min(n - 1, st.hover + 1)); e.preventDefault(); } });
      g.appendChild(hit);
      ui.body.appendChild(svg);
    }
    draw();
  }

  /* ---------- CANDLE (OHLC; default red-up/green-down, options.colors:"intl" flips it) ---------- */
  function renderCandle(ui, spec, width) {
    var o = spec.options || {}, f = fOf(o);
    var xs = spec.data.x, cd = spec.data.candles, n = xs.length;
    var upC = o.colors === 'intl' ? 'var(--ck-pos)' : 'var(--ck-neg)';
    var dnC = o.colors === 'intl' ? 'var(--ck-neg)' : 'var(--ck-pos)';
    var st = { table: false };
    ui.controls.appendChild(toggleButton(L.table, false, function (v) { st.table = v; draw(); }));
    var padL = 52, padR = 12, plotH = o.height || 260, plotW = width - 52 - padL - padR, labelH = 26;
    function chg(i) { var base = i > 0 ? cd[i - 1].c : cd[i].o; return base ? cd[i].c / base - 1 : 0; }
    function pchg(i) { var v = chg(i); return (v >= 0 ? '+' : '') + (v * 100).toFixed(2) + '%'; }
    function draw() {
      clear(ui.body); ui.body.appendChild(ui.tip);
      if (st.table) {
        ui.body.appendChild(tableView([o.categoryLabel || L.period, L.open, L.high, L.low, L.close, L.changePct],
          xs.map(function (x, i) { return [x, fmt(cd[i].o, f), fmt(cd[i].h, f), fmt(cd[i].l, f), fmt(cd[i].c, f), pchg(i)]; })));
        return;
      }
      var hi = maxOf(cd.map(function (c) { return c.h; })), lo = minOf(cd.map(function (c) { return c.l; }));
      (o.refLines || []).forEach(function (r) { hi = Math.max(hi, r.value); lo = Math.min(lo, r.value); });
      var pad = (hi - lo || 1) * 0.03;
      var axis = niceAxis(hi + pad, lo - pad, true);
      var yOf = function (v) { return plotH - (v - axis.min) / (axis.max - axis.min) * plotH; };
      var svg = sv('svg', { class: 'ck-plot', width: width - 52, height: plotH + labelH });
      var g = sv('g', { transform: 'translate(' + padL + ',0)' }); svg.appendChild(g);
      axisY(g, plotW, plotH, axis, f);
      var slot = plotW / n, bw = Math.max(3, Math.min(16, slot * 0.62));
      cd.forEach(function (c, i) {
        var cx = slot * i + slot / 2, up = c.c >= c.o, col = up ? upC : dnC;
        var yo = yOf(c.o), yc = yOf(c.c), top = Math.min(yo, yc), bh = Math.max(1.2, Math.abs(yo - yc));
        g.appendChild(sv('line', { class: 'ck-mark ck-in', style: delay(i * 18), x1: cx, x2: cx, y1: yOf(c.h), y2: yOf(c.l), stroke: col, 'stroke-width': 1.2 }));
        g.appendChild(sv('rect', { class: 'ck-mark ck-in', style: delay(i * 18), x: cx - bw / 2, y: top, width: bw, height: bh, fill: col, stroke: col, rx: 1 }));
        var hit = sv('rect', { class: 'ck-hit', x: slot * i, y: 0, width: slot, height: plotH });
        hitEvents(hit, function () {
          // trading-app tooltip: close + change lead (coloured by direction vs the previous close); OHLC and range follow
          var base = i > 0 ? cd[i - 1].c : c.o, v = chg(i);
          var heroCls = (v >= 0) === (o.colors !== 'intl') ? 'r' : 'g';
          clear(ui.tip);
          ui.tip.appendChild(el('div', { class: 't', text: xs[i] }));
          ui.tip.appendChild(el('div', { class: 'ohero ' + heroCls }, [
            el('b', { class: 'ck-num', text: fmt(c.c, f) }),
            el('span', { class: 'ck-num', text: pchg(i) })]));
          var og = el('div', { class: 'ogrid' });
          [[L.open, fmt(c.o, f)], [L.high, fmt(c.h, f)], [L.low, fmt(c.l, f)],
           [L.amplitude, base ? ((c.h - c.l) / base * 100).toFixed(2) + '%' : '—']]
            .forEach(function (kv) { og.appendChild(el('span', { class: 'k', text: kv[0] })); og.appendChild(el('span', { class: 'v ck-num', text: kv[1] })); });
          ui.tip.appendChild(og);
          ui.tip.classList.add('on');
          var tw = ui.tip.offsetWidth || 160, tx = padL + cx, pw = width - 52;
          ui.tip.style.left = Math.max(0, tx + 14 + tw > pw ? tx - tw - 14 : tx + 14) + 'px';
          ui.tip.style.top = Math.max(0, yOf(c.h) - 12) + 'px';
        }, function () { hideTip(ui); });
        g.appendChild(hit);
      });
      refLines(g, o.refLines, plotW, yOf, f);
      var count = Math.min(o.xTicks || 8, n);
      for (var k = 0; k < count; k++) {
        var i = Math.round(k * (n - 1) / Math.max(1, count - 1));
        g.appendChild(sv('text', { x: slot * i + slot / 2, y: plotH + 19, 'text-anchor': i === 0 ? 'start' : (i === n - 1 ? 'end' : 'middle'), text: xs[i] }));
      }
      ui.body.appendChild(svg);
    }
    draw();
  }

  /* ---------- DONUT (part-to-whole, <= 6 slices, bar alternative built in) ---------- */
  function renderDonut(ui, spec, width) {
    var o = spec.options || {}, f = fOf(o);
    var raw = spec.data.items.slice().sort(function (a, b) { return b.value - a.value; }), maxSlices = o.maxSlices || 6, items = raw;
    if (raw.length > maxSlices) { items = raw.slice(0, maxSlices - 1); items.push({ name: o.otherLabel || L.other, value: sum(raw.slice(maxSlices - 1).map(function (x) { return x.value; })), other: true }); }
    items = items.map(function (it, i) { return { name: it.name, value: it.value, color: it.other || /^其他|^其它|^other$/i.test(it.name) ? 'var(--ck-other)' : (it.color || SERIES[i % 8]) }; });
    var total = sum(items.map(function (x) { return x.value; })), max = maxOf(items.map(function (x) { return x.value; }));
    var st = { view: 'donut' };
    if (o.altBar !== false) ui.controls.appendChild(segmented([{ label: L.donutMode, value: 'donut' }, { label: L.barsMode, value: 'bars' }], 'donut', function (v) { st.view = v; draw(); }));
    ui.controls.appendChild(toggleButton(L.table, false, function (v) { st.view = v ? 'table' : 'donut'; draw(); }));
    var size = o.size || 250, R = size / 2, r0 = R * 0.66;
    function arc(a0, a1) {
      var big = a1 - a0 > Math.PI ? 1 : 0, p = function (rad, a) { return (R + rad * Math.sin(a)).toFixed(2) + ',' + (R - rad * Math.cos(a)).toFixed(2); };
      return 'M' + p(R, a0) + ' A' + R + ',' + R + ' 0 ' + big + ',1 ' + p(R, a1) + ' L' + p(r0, a1) + ' A' + r0 + ',' + r0 + ' 0 ' + big + ',0 ' + p(r0, a0) + ' Z';
    }
    function draw() {
      clear(ui.body); ui.body.appendChild(ui.tip); ui.legend.style.display = 'none';
      if (st.view === 'table') { ui.body.appendChild(tableView([o.categoryLabel || L.category, L.value, L.share], items.map(function (it) { return [it.name, fmt(it.value, f), (it.value / total * 100).toFixed(1) + '%']; }).concat([[L.total, fmt(total, f), '100.0%']]))); return; }
      var rows = el('div', { class: 'ck-rows', style: { flex: 1 } }), marks = [], center = null;
      function setHover(i) {
        marks.forEach(function (m, j) { m.classList.toggle('dim', i !== -1 && i !== j); m.classList.toggle('on', i === j); });
        each(rows.children, function (r, j) { r.classList.toggle('on', i === j); r.classList.toggle('dim', i !== -1 && i !== j); });
        if (!center) return;
        clear(center); var it = i === -1 ? null : items[i];
        center.appendChild(el('div', { style: { fontSize: '12px', color: 'var(--ck-muted)' }, text: it ? it.name : (o.centerLabel || L.total) }));
        center.appendChild(el('div', { class: 'ck-num', style: { fontSize: '32px', fontWeight: 600, lineHeight: 1, letterSpacing: '-0.025em', color: 'var(--ck-ink)' }, text: it ? (it.value / total * 100).toFixed(1) + '%' : fmt(total, Object.assign({}, f, { unit: undefined })) }));
        center.appendChild(el('div', { class: 'ck-num', style: { fontSize: '12px', color: 'var(--ck-ink2)' }, text: it ? fmt(it.value, f) : items.length + ' ' + L.items + (f.unit ? ' · ' + L.unit + ' ' + f.unit : '') }));
      }
      if (st.view === 'donut') {
        var wrap = el('div', { class: 'ck-donut-wrap' }), holder = el('div', { style: { position: 'relative', width: size + 'px', height: size + 'px', flex: 'none' } });
        var svg = sv('svg', { class: 'ck-plot', width: size, height: size }), a = 0;
        items.forEach(function (it, i) {
          var a1 = a + it.value / total * Math.PI * 2, p = sv('path', { class: 'ck-mark ck-ring ck-slice ck-in', style: delay(i * 110), d: arc(a, a1), fill: it.color });
          hitEvents(p, function () { setHover(i); }, function () { setHover(-1); });
          svg.appendChild(p); marks.push(p); a = a1;
        });
        holder.appendChild(svg);
        center = el('div', { style: { position: 'absolute', left: (R - r0 + 6) + 'px', top: (R - r0 + 6) + 'px', width: (r0 * 2 - 12) + 'px', height: (r0 * 2 - 12) + 'px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', textAlign: 'center', pointerEvents: 'none' } });
        holder.appendChild(center); wrap.appendChild(holder); wrap.appendChild(rows); ui.body.appendChild(wrap);
      } else ui.body.appendChild(rows);
      items.forEach(function (it, i) {
        var row;
        if (st.view === 'donut') {
          row = el('div', { class: 'ck-row', style: { height: '44px', position: 'relative', alignItems: 'flex-start', paddingTop: '9px' } }, [
            el('div', { class: 'dtrk' }, el('div', { class: 'dbar ck-grow', style: { width: (it.value / max * 100).toFixed(1) + '%', background: it.color, animationDelay: (300 + i * 80) + 'ms' } })),
            el('i', { class: 'ck-key rect', style: { background: it.color, marginTop: '4px' } }), el('span', { class: 'lbl', style: { flex: 1 }, text: it.name }),
            el('span', { class: 'sub ck-num', style: { width: '80px', textAlign: 'right' }, text: fmt(it.value, f) }), el('span', { class: 'val ck-num', style: { width: '56px', textAlign: 'right' }, text: (it.value / total * 100).toFixed(1) + '%' })]);
        } else {
          row = el('div', { class: 'ck-row', style: { flexDirection: 'column', alignItems: 'stretch', gap: '7px', padding: '9px 12px' } }, [
            el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' } }, [el('span', { class: 'lbl', text: it.name }), el('span', { style: { display: 'flex', gap: '14px', alignItems: 'baseline' } }, [el('span', { class: 'sub ck-num', text: fmt(it.value, f) }), el('span', { class: 'val ck-num', text: (it.value / total * 100).toFixed(1) + '%' })])]),
            el('div', { class: 'fill ck-mark', style: { width: (it.value / max * 100).toFixed(1) + '%', background: it.color } })]);
          marks.push(row.lastChild);
        }
        hitEvents(row, function () { setHover(i); }, function () { setHover(-1); });
        rows.appendChild(row);
      });
      setHover(-1);
    }
    draw();
  }

  /* ---------- SCATTER ---------- */
  function renderScatter(ui, spec, width) {
    var o = spec.options || {}, fx = o.xFormat || {}, fy = o.yFormat || {}, pts = spec.data.points, names = [];
    pts.forEach(function (p) { var g = p.group || L.all; if (names.indexOf(g) === -1) names.push(g); });
    var groups = names.map(function (n, i) { return { name: n, color: (spec.data.colors && spec.data.colors[n]) || SERIES[i % 8] }; });
    var st = { hidden: groups.map(function () { return false; }), medians: !!o.medians, table: false };
    if (o.medianToggle !== false) ui.controls.appendChild(toggleButton(L.medians, st.medians, function (v) { st.medians = v; draw(); }));
    ui.controls.appendChild(toggleButton(L.table, false, function (v) { st.table = v; draw(); }));
    var padL = 52, padR = 20, plotH = o.height || 280, plotW = width - 52 - padL - padR, labelH = 26, extra = o.extra || [];
    var labelTop = o.labelTop !== undefined ? o.labelTop : (pts.length <= 60 && pts.some(function (p) { return p.name; }) ? 3 : 0);
    function draw() {
      clear(ui.body); ui.body.appendChild(ui.tip);
      legendFor(ui, groups, 'dot', st.hidden, function (i) { if (!st.hidden[i] && st.hidden.filter(function (h) { return !h; }).length === 1) return; st.hidden[i] = !st.hidden[i]; draw(); });
      if (st.table) { ui.body.appendChild(tableView([L.name, L.group, o.xLabel || 'x', o.yLabel || 'y'].concat(extra.map(function (e) { return e.label; })), pts.map(function (p) { return [p.name || '', p.group || '', fmt(p.x, fx), fmt(p.y, fy)].concat(extra.map(function (e) { return p[e.key] === undefined ? '' : (typeof p[e.key] === 'number' ? fmt(p[e.key], e) : String(p[e.key])); })); }))); return; }
      var shown = pts.filter(function (p) { return !st.hidden[names.indexOf(p.group || L.all)]; });
      var ax = niceAxis(maxOf(pts.map(function (p) { return p.x; }))), ay = niceAxis(maxOf(pts.map(function (p) { return p.y; })) * 1.05);
      var xOf = function (v) { return v / ax.max * plotW; }, yOf = function (v) { return plotH - v / ay.max * plotH; };
      var svg = sv('svg', { class: 'ck-plot', width: width - 52, height: plotH + labelH }), g = sv('g', { transform: 'translate(' + padL + ',0)' }); svg.appendChild(g);
      axisY(g, plotW, plotH, ay, fy);
      for (var i = 0; i <= ax.div; i++) g.appendChild(sv('text', { class: 'ck-num', x: xOf(ax.step * i), y: plotH + 19, 'text-anchor': i === 0 ? 'start' : (i === ax.div ? 'end' : 'middle'), text: axisLabel(ax.step * i, ax, fx) }));
      if (st.medians && shown.length) {
        var mx = xOf(median(shown.map(function (p) { return p.x; }))), my = yOf(median(shown.map(function (p) { return p.y; })));
        g.appendChild(sv('line', { class: 'ck-ref', x1: mx, x2: mx, y1: 0, y2: plotH })); g.appendChild(sv('line', { class: 'ck-ref', x1: 0, x2: plotW, y1: my, y2: my }));
        var q = o.quadrants || [];
        if (q.length === 4) [[8, 14, 'start', q[0]], [plotW - 8, 14, 'end', q[1]], [8, plotH - 8, 'start', q[2]], [plotW - 8, plotH - 8, 'end', q[3]]].forEach(function (t) { g.appendChild(sv('text', { x: t[0], y: t[1], 'text-anchor': t[2], text: t[3] })); });
      }
      var drops = sv('g', { style: 'display:none' }); g.appendChild(drops);
      var marks = [], top = shown.slice().sort(function (a, b) { return b.y - a.y; }).slice(0, labelTop);
      var placed = [];
      shown.forEach(function (p, pi) {
        var grp = groups[names.indexOf(p.group || L.all)], cx = xOf(p.x), cy = yOf(p.y);
        var dot = sv('circle', { class: 'ck-mark ck-ring ck-in', style: delay(Math.min(600, pi * 12)), cx: cx, cy: cy, r: 4.5, fill: grp.color }), hit = sv('circle', { class: 'ck-hit', cx: cx, cy: cy, r: 12 });
        if (top.indexOf(p) !== -1 && p.name) {
          var lx = cx + (cx > plotW - 60 ? -9 : 9), ly = cy + 4, w = textW(p.name, 11) + 10;
          var x0 = cx > plotW - 60 ? lx - w : lx;
          var clash = placed.some(function (r) { return !(x0 + w < r.x || r.x + r.w < x0 || ly + 14 < r.y || r.y + 14 < ly); });
          if (!clash) { placed.push({ x: x0, y: ly, w: w }); g.appendChild(sv('text', { class: 'ck-ptlabel ck-halo', x: lx, y: ly, 'text-anchor': cx > plotW - 60 ? 'end' : 'start', text: p.name })); }
        }
        hitEvents(hit, function () {
          marks.forEach(function (m) { m.classList.toggle('dim', m !== dot); }); dot.setAttribute('r', 6.5);
          clear(drops); drops.style.display = '';
          drops.appendChild(sv('line', { class: 'ck-drop', x1: cx, x2: cx, y1: cy, y2: plotH })); drops.appendChild(sv('line', { class: 'ck-drop', x1: 0, x2: cx, y1: cy, y2: cy }));
          chip(drops, cx, plotH + 12, fmt(p.x, fx), 'middle'); chip(drops, -6, cy, fmt(p.y, fy), 'end');
          var rows = [{ name: o.xLabel || 'X', value: fmt(p.x, fx) }, { name: o.yLabel || 'Y', value: fmt(p.y, fy) }];
          extra.forEach(function (e) { if (p[e.key] !== undefined) rows.push({ name: e.label, value: typeof p[e.key] === 'number' ? fmt(p[e.key], e) : String(p[e.key]) }); });
          showTip(ui, (p.name || '') + (p.group ? ' · ' + p.group : ''), rows, padL + cx, Math.max(0, cy - 48), width - 52);
        }, function () { marks.forEach(function (m) { m.classList.remove('dim'); }); dot.setAttribute('r', 4.5); drops.style.display = 'none'; hideTip(ui); });
        g.appendChild(dot); g.appendChild(hit); marks.push(dot);
      });
      ui.body.appendChild(svg);
      if (o.xLabel || o.yLabel) ui.body.appendChild(el('div', { class: 'ck-axis-title', style: { paddingLeft: padL + 'px' } }, [el('span', { text: o.xLabel ? L.xAxis + o.xLabel : '' }), el('span', { text: o.yLabel ? L.yAxis + o.yLabel : '' })]));
    }
    draw();
  }

  /* ---------- HEATMAP (one hue, light → dark, with marginals) ---------- */
  function renderHeatmap(ui, spec, width) {
    var o = spec.options || {}, rows = spec.data.rows, cols = spec.data.cols;
    var metrics = spec.data.metrics || [{ name: o.valueLabel || L.value, values: spec.data.values, format: o.format, unit: o.unit, decimals: o.decimals }];
    var st = { m: 0, table: false };
    if (metrics.length > 1) ui.controls.appendChild(segmented(metrics.map(function (m, i) { return { label: m.name, value: i }; }), 0, function (v) { st.m = v; draw(); }));
    ui.controls.appendChild(toggleButton(L.table, false, function (v) { st.table = v; draw(); }));
    var marginals = o.marginals !== false, labelW = o.rowLabelWidth || 48, margW = marginals ? 78 : 0, gap = 3;
    var cellW = Math.floor((width - 52 - labelW - margW - gap * cols.length) / cols.length), cellH = o.cellHeight || 26;
    function draw() {
      clear(ui.body); ui.body.appendChild(ui.tip); ui.legend.style.display = 'none';
      var m = metrics[st.m], f = { format: m.format, unit: m.unit, decimals: m.decimals }, isRate = m.format === 'percent';
      var flat = [].concat.apply([], m.values).filter(function (x) { return x != null; });
      var mn = Math.min.apply(null, flat), mx = maxOf(flat);
      // diverging mode: two hues for sign (default red-positive, colors:"intl" flips), neutral grey at zero
      var diverging = !!o.diverging, amax = Math.max(Math.abs(mn), Math.abs(mx)) || 1;
      var upC = o.colors === 'intl' ? 'var(--ck-pos)' : 'var(--ck-neg)';
      var dnC = o.colors === 'intl' ? 'var(--ck-neg)' : 'var(--ck-pos)';
      var MIX = [15, 31, 48, 66];
      function cellBg(v) {
        if (!diverging) { var t0 = (v - mn) / (mx - mn || 1); return RAMP[Math.min(7, Math.floor(t0 * 8))]; }
        var t = Math.pow(Math.abs(v) / amax, o.gamma || 1);  // gamma < 1 lifts contrast among small values (e.g. monthly cells next to an annual one)
        if (t < 0.03) return 'var(--ck-mid)';
        return 'color-mix(in srgb, ' + (v >= 0 ? upC : dnC) + ' ' + MIX[Math.min(3, Math.floor(t * 4))] + '%, var(--ck-surface))';
      }
      if (st.table) { ui.body.appendChild(tableView([''].concat(cols), rows.map(function (r, i) { return [r].concat(m.values[i].map(function (v) { return v == null ? '—' : fmt(v, f); })); }))); return; }
      var agg = function (arr) { var xs = arr.filter(function (x) { return x != null; }); if (!xs.length) return 0; return isRate ? sum(xs) / xs.length : sum(xs); };
      var rowAgg = m.values.map(agg), colAgg = cols.map(function (c, ci) { return agg(m.values.map(function (r) { return r[ci]; })); });
      var rowMax = maxOf(rowAgg), colMax = maxOf(colAgg), sorted = flat.slice().sort(function (a, b) { return b - a; });
      var grid = el('div', { class: 'ck-heat' }), rowLabels = [], colLabels = [], rowMarg = [], colMarg = [];
      rows.forEach(function (r, ri) {
        var hl = el('div', { class: 'hl', style: { width: labelW + 'px' }, text: r });
        hl.setAttribute('data-row', r);
        var line = el('div', { class: 'hr' }, hl); rowLabels.push(hl);
        cols.forEach(function (c, ci) {
          var v = m.values[ri][ci];
          if (v == null) { // outside the window or missing: leave the cell empty
            var mt = el('div', { class: 'cell empty', style: { width: cellW + 'px', height: cellH + 'px' } });
            mt.setAttribute('data-row', r); mt.setAttribute('data-col', c);
            line.appendChild(mt);
            return;
          }
          var cell = el('div', { class: 'cell ck-in', style: { width: cellW + 'px', height: cellH + 'px', background: cellBg(v), animationDelay: (ri * 40 + ci * 12) + 'ms' } });
          cell.setAttribute('data-row', r); cell.setAttribute('data-col', c);
          if (o.cellLabels) cell.appendChild(el('span', { class: 'cv ck-num', text: fmt(v, f) }));
          hitEvents(cell, function () {
            rowLabels.forEach(function (x, j) { x.classList.toggle('on', j === ri); }); colLabels.forEach(function (x, j) { x.classList.toggle('on', j === ci); });
            rowMarg.forEach(function (x, j) { x.classList.toggle('on', j === ri); }); colMarg.forEach(function (x, j) { x.classList.toggle('on', j === ci); });
            var tipRows = [{ name: m.name, value: fmt(v, f) }];
            if (o.rank !== false) tipRows.push({ name: L.rankOverall, value: (sorted.indexOf(v) + 1) + ' / ' + flat.length });
            showTip(ui, r + ' · ' + c, tipRows, labelW + ci * (cellW + gap) + cellW / 2, ri * (cellH + gap) - 6, width - 52 - margW);
          }, function () { [rowLabels, colLabels, rowMarg, colMarg].forEach(function (arr) { arr.forEach(function (x) { x.classList.remove('on'); }); }); hideTip(ui); });
          line.appendChild(cell);
        });
        if (marginals) { var mr = el('div', { class: 'mrow', style: { width: margW + 'px' } }, [el('i', { style: { width: Math.max(2, rowAgg[ri] / rowMax * 36).toFixed(0) + 'px' } }), el('span', { class: 'ck-num', text: fmt(rowAgg[ri], isRate ? f : { format: 'compact' }) })]); line.appendChild(mr); rowMarg.push(mr); }
        grid.appendChild(line);
      });
      if (marginals) {
        var mline = el('div', { class: 'hr', style: { alignItems: 'flex-end', marginTop: '2px' } }, el('div', { style: { width: labelW + 'px', flex: 'none' } }));
        cols.forEach(function (c, ci) { var mc = el('div', { class: 'mcol', style: { width: cellW + 'px', height: '22px' } }, el('i', { style: { height: Math.max(2, colAgg[ci] / colMax * 22).toFixed(0) + 'px' } })); mline.appendChild(mc); colMarg.push(mc); });
        grid.appendChild(mline);
      }
      var xr = el('div', { class: 'hr' }, el('div', { style: { width: labelW + 'px', flex: 'none' } }));
      cols.forEach(function (c) { var hx = el('div', { class: 'hx', style: { width: cellW + 'px' }, text: c }); hx.setAttribute('data-col', c); xr.appendChild(hx); colLabels.push(hx); });
      grid.appendChild(xr); ui.body.appendChild(grid);
      var margNote = marginals ? (isRate ? L.margAvg : L.margSum) : '';
      if (diverging) {
        var swatches = MIX.slice().reverse().map(function (p) { return el('i', { style: { background: 'color-mix(in srgb, ' + dnC + ' ' + p + '%, var(--ck-surface))' } }); });
        swatches.push(el('i', { style: { background: 'var(--ck-mid)' } }));
        MIX.forEach(function (p) { swatches.push(el('i', { style: { background: 'color-mix(in srgb, ' + upC + ' ' + p + '%, var(--ck-surface))' } })); });
        ui.body.appendChild(el('div', { class: 'ck-scale' }, [el('span', { text: m.name + (o.colors === 'intl' ? L.divergeIntl : L.divergeCn) + L.darkerAbs + margNote }), el('div', { class: 'steps' }, [el('span', { class: 'ck-num', text: fmt(-amax, f) })].concat(swatches).concat([el('span', { class: 'ck-num', text: fmt(amax, f) })]))]));
      } else {
        ui.body.appendChild(el('div', { class: 'ck-scale' }, [el('span', { text: m.name + L.darkerHigher + margNote }), el('div', { class: 'steps' }, [el('span', { class: 'ck-num', text: fmt(mn, f) })].concat(RAMP.map(function (c) { return el('i', { style: { background: c } }); })).concat([el('span', { class: 'ck-num', text: fmt(mx, f) })]))]));
      }
    }
    draw();
  }

  /* ---------- FUNNEL (ordinal ramp, necks show the loss) ---------- */
  function renderFunnel(ui, spec, width) {
    var o = spec.options || {}, f = fOf(o), steps = spec.data.steps, first = steps[0].value;
    var st = { relative: o.mode === 'relative', table: false };
    ui.controls.appendChild(segmented([{ label: L.ofFirst, value: false }, { label: L.ofPrev, value: true }], st.relative, function (v) { st.relative = v; draw(); }));
    ui.controls.appendChild(toggleButton(L.table, false, function (v) { st.table = v; draw(); }));
    function draw() {
      clear(ui.body); ui.body.appendChild(ui.tip); ui.legend.style.display = 'none';
      var rows = steps.map(function (s, i) { return { abs: s.value / first, rel: i === 0 ? 1 : s.value / steps[i - 1].value, lost: i === 0 ? 0 : steps[i - 1].value - s.value }; });
      if (st.table) { ui.body.appendChild(tableView([L.stage, L.count, L.ofFirst, L.ofPrev, L.stepLoss], steps.map(function (s, i) { return [s.name, fmt(s.value, f), (rows[i].abs * 100).toFixed(1) + '%', i ? (rows[i].rel * 100).toFixed(1) + '%' : '—', i ? fmt(rows[i].lost, f) : '—']; }))); return; }
      var wrap = el('div', { class: 'ck-funnel' }), list = el('div', { class: 'ck-rows', style: { gap: '0' } }), worst = 1;
      steps.forEach(function (s, i) { if (i > 0 && rows[i].rel < rows[worst].rel) worst = i; });
      var pcts = steps.map(function (s, i) { return (st.relative ? rows[i].rel : rows[i].abs) * 100; });
      steps.forEach(function (s, i) {
        var pct = pcts[i], inside = pct >= 18, ci = Math.min(i, ORDINAL.length - 1);
        if (i > 0) {
          var neck = el('div', { class: 'neck' }, [el('div', { class: 'who' }),
            el('div', { class: 'lane' }, [sv('svg', { viewBox: '0 0 100 22', preserveAspectRatio: 'none' }, sv('polygon', { points: (50 - pcts[i - 1] / 2).toFixed(2) + ',0 ' + (50 + pcts[i - 1] / 2).toFixed(2) + ',0 ' + (50 + pct / 2).toFixed(2) + ',22 ' + (50 - pct / 2).toFixed(2) + ',22' })), el('span', { class: 'pct ck-num', text: (rows[i].rel * 100).toFixed(1) + L.toNext })]),
            el('div', { class: 'loss' })]);
          list.appendChild(neck);
        }
        var bar = el('div', { class: 'bar ck-mark ck-in', style: { width: pct.toFixed(1) + '%', background: ORDINAL[ci], color: ORDINAL_INK[ci], animationDelay: (i * 90) + 'ms' }, text: inside ? pct.toFixed(1) + '%' : '' });
        var lane = el('div', { class: 'lane' }, bar);
        if (!inside) lane.appendChild(el('div', { class: 'out ck-num', style: { left: (50 + pct / 2).toFixed(1) + '%' }, text: pct.toFixed(1) + '%' }));
        var loss = el('div', { class: 'loss', style: { opacity: i ? 0.8 : 0 } }, [el('small', { text: L.lostVsPrev }), el('b', { class: 'ck-num', text: i ? '−' + fmt(rows[i].lost, f) + ' · ' + ((1 - rows[i].rel) * 100).toFixed(1) + '%' : '' })]);
        var step = el('div', { class: 'step' + (i === worst ? ' worst' : '') }, [el('div', { class: 'who' }, [el('b', { text: s.name, 'data-badge': i === worst ? L.worstBadge : null }), el('span', { class: 'ck-num', text: fmt(s.value, f) })]), lane, loss]);
        hitEvents(step, function () { each(list.querySelectorAll('.step'), function (r, j) { r.classList.toggle('dim', j !== i); r.classList.toggle('on', j === i); }); loss.style.opacity = i ? 1 : 0; }, function () { each(list.querySelectorAll('.step'), function (r) { r.classList.remove('dim'); r.classList.remove('on'); }); loss.style.opacity = i ? 0.8 : 0; });
        list.appendChild(step);
      });
      wrap.appendChild(list);
      wrap.appendChild(el('div', { class: 'sum' }, [el('span', { text: L.overall + steps[0].name + ' → ' + steps[steps.length - 1].name }), el('span', null, [el('b', { class: 'ck-num', text: (steps[steps.length - 1].value / first * 100).toFixed(1) + '%' }), el('span', { text: L.biggestDrop + steps[worst - 1].name + ' → ' + steps[worst].name })])]));
      ui.body.appendChild(wrap);
    }
    draw();
  }

  /* ---------- KPI tiles ---------- */
  function sparkline(values, w, h, color) {
    var mx = maxOf(values), mn = Math.min.apply(null, values), span = mx - mn || 1;
    var pts = values.map(function (v, i) { return [i / (values.length - 1) * w, h - (v - mn) / span * (h - 6) - 3]; });
    var svg = sv('svg', { class: 'ck-plot', width: w, height: h }), last = pts[pts.length - 1], d = smoothPath(pts), id = 'cks' + (++uid);
    svg.appendChild(sv('defs', null, sv('linearGradient', { id: id, x1: 0, y1: 0, x2: 0, y2: 1 }, [sv('stop', { offset: '0%', style: 'stop-color:' + color + ';stop-opacity:0.18' }), sv('stop', { offset: '100%', style: 'stop-color:' + color + ';stop-opacity:0' })])));
    svg.appendChild(sv('path', { d: d + ' L' + w + ',' + h + ' L0,' + h + ' Z', fill: 'url(#' + id + ')' }));
    svg.appendChild(sv('path', { d: d, fill: 'none', stroke: color, 'stroke-width': 1.8, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', opacity: 0.9 }));
    svg.appendChild(sv('circle', { class: 'ck-ring', cx: last[0], cy: last[1], r: 4, fill: color }));
    return svg;
  }
  function renderKpi(container, spec, width) {
    var items = spec.data.items, cols = (spec.options && spec.options.columns) || Math.min(4, items.length);
    var grid = el('div', { class: 'ck-kpis' + (motionOn(spec) ? ' ck-motion' : ''), style: { width: width + 'px', gridTemplateColumns: 'repeat(' + cols + ', minmax(0, 1fr))' } });
    if (grid.classList.contains('ck-motion')) setTimeout(function () { grid.classList.remove('ck-motion'); }, 1800);
    items.forEach(function (it, ti) {
      var tile = el('div', { class: 'ck-kpi ck-in', style: { animationDelay: (ti * 90) + 'ms' } }), good = true, up = true;
      if (typeof it.delta === 'number') { up = it.delta >= 0; good = it.deltaGood === false ? !up : up; }
      var top = el('div', { class: 'top' }, el('div', { class: 'l', text: it.label }));
      if (it.trend && it.trend.length > 1) top.appendChild(sparkline(it.trend, 96, 30, typeof it.delta === 'number' ? (good ? 'var(--ck-pos)' : 'var(--ck-neg)') : 'var(--ck-s1)'));
      tile.appendChild(top);
      tile.appendChild(el('div', { class: 'v' + (it.hero ? ' hero' : ''), text: typeof it.value === 'number' ? fmt(it.value, it) : String(it.value) }));
      if (typeof it.delta === 'number') {
        var meta = el('div', { class: 'meta' }), pill = el('div', { class: 'd ' + (good ? 'up' : 'down') });
        pill.appendChild(sv('svg', { width: 10, height: 10, style: 'display:block' }, sv('polyline', { points: up ? '2,7 5,3 8,7' : '2,3 5,7 8,3', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })));
        pill.appendChild(el('span', { class: 'ck-num', text: deltaText(it.delta) }));
        meta.appendChild(pill);
        if (it.vs) meta.appendChild(el('span', { class: 'vs', text: 'vs ' + it.vs }));
        tile.appendChild(meta);
      } else if (it.caption) tile.appendChild(el('div', { class: 'vs', text: it.caption }));
      grid.appendChild(tile);
    });
    container.appendChild(grid);
    return grid;
  }

  /* ---------- TABLE (sticky header/first column, in-cell bars, tags, click-to-sort) ---------- */
  function renderTable(ui, spec, width) {
    var o = spec.options || {}, cols = spec.data.columns, rows0 = spec.data.rows;
    var cn = o.signColors === 'cn';  // cn: red positive / green negative (East-Asian markets); default green positive / red negative (good-bad)
    var posC = cn ? 'var(--ck-neg)' : 'var(--ck-pos)', negC = cn ? 'var(--ck-pos)' : 'var(--ck-neg)';
    var st = { key: o.sortBy || null, asc: !!o.sortAsc };
    ui.legend.style.display = 'none';

    function raw(r, c) { var v = r[c.key]; return (v === null || v === undefined || v === '') ? null : v; }
    function text(r, c) {
      var v = raw(r, c);
      if (v === null) return c.empty || '—';
      if (typeof v !== 'number') return String(v);
      var s = fmt(v, { format: c.format, decimals: c.decimals, unit: c.unit, currency: c.currency });
      return c.sign && v > 0 && s.charAt(0) !== '+' ? '+' + s : s;
    }
    // bar scale: per column by default; columns sharing a barGroup share one scale (so lengths compare across columns)
    var scale = {}, hasNeg = {};
    cols.forEach(function (c) {
      if (!c.bar) return;
      var g = c.barGroup || c.key, peers = cols.filter(function (x) { return x.bar && (x.barGroup || x.key) === g; });
      var vals = [];
      peers.forEach(function (x) {
        rows0.forEach(function (r) { var v = raw(r, x); if (typeof v === 'number') vals.push(v); });
      });
      scale[c.key] = maxOf(vals.map(Math.abs)) || 1;
      hasNeg[c.key] = vals.some(function (v) { return v < 0; });
    });

    function draw() {
      clear(ui.body);
      var rows = rows0.slice();
      if (st.key) {
        var sc = cols.filter(function (c) { return c.key === st.key; })[0];
        rows.sort(function (a, b) {
          var x = raw(a, sc), y = raw(b, sc);
          if (x === null) return 1;
          if (y === null) return -1;
          var d = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'zh');
          return st.asc ? d : -d;
        });
      }
      var t = el('table', { class: 'ck-dt' + (o.zebra ? ' zebra' : '') });
      var thead = el('thead');
      if (cols.some(function (c) { return c.group; })) {  // two-level header: columns sharing a group are merged
        var top = el('tr', { class: 'grp' }), i = 0;
        while (i < cols.length) {
          var g = cols[i].group, span = 1;
          while (i + span < cols.length && cols[i + span].group === g && g) span++;
          top.appendChild(el('th', {
            colspan: String(span), class: (g ? 'gl' : '') + (cols[i].sticky ? ' sticky' : ''),
            'data-col': cols[i].id || '', text: g || '',
          }));
          i += span;
        }
        thead.appendChild(top);
      }
      var hr = el('tr');
      cols.forEach(function (c) {
        var right = c.align ? c.align === 'right' : (typeof (raw(rows0[0] || {}, c)) === 'number' || !!c.bar);
        var th = el('th', {
          class: (right ? 'r' : '') + (c.sticky ? ' sticky' : '') + (o.sortable !== false ? ' sortable' : '') + (st.key === c.key ? ' sorted' : ''),
          'data-col': c.id || '', text: c.label + (st.key === c.key ? (st.asc ? ' ↑' : ' ↓') : ''),
        });
        if (o.sortable !== false) {
          th.setAttribute('tabindex', '0');
          th.addEventListener('click', function () {
            if (st.key === c.key) st.asc = !st.asc; else { st.key = c.key; st.asc = false; }
            draw();
          });
        }
        hr.appendChild(th);
      });
      thead.appendChild(hr);
      t.appendChild(thead);

      var tb = el('tbody');
      rows.forEach(function (r) {
        var tr = el('tr', { class: r._cls || '' });
        if (r._id) tr.setAttribute('data-row', r._id);
        cols.forEach(function (c) {
          var v = raw(r, c);
          var right = c.align ? c.align === 'right' : (typeof v === 'number' || !!c.bar);
          var cls = (right ? 'r' : '') + (c.sticky ? ' sticky' : '') + (c.muted ? ' muted' : '') + (c.emphasis ? ' em' : '');
          if (c.sign && typeof v === 'number' && v !== 0) cls += v > 0 ? ' up' : ' down';
          var td = el('td', { class: cls, 'data-col': c.id || '' });
          if (c.tag && v !== null) {
            td.appendChild(el('span', { class: 'ck-tag ' + (r[c.key + '_tone'] || 'mute'), text: String(v) }));
            if (r[c.key + '_note']) td.appendChild(el('span', { class: 'note', text: r[c.key + '_note'] }));
          } else {
            td.appendChild(el('span', { class: 'v ck-num', text: text(r, c) }));
            if (c.sub && r[c.sub]) td.appendChild(el('span', { class: 'sub', text: String(r[c.sub]) }));
          }
          if (c.bar && typeof v === 'number') {
            // with no negatives in the group a centered diverging bar is pointless — fall back to one-directional
            var diverging = c.bar === 'diverging' && hasNeg[c.key];
            var pct = Math.abs(v) / scale[c.key] * 100, fill;
            if (diverging) {
              fill = el('i', { style: { left: (v >= 0 ? 50 : 50 - pct / 2) + '%', width: (pct / 2) + '%', background: v >= 0 ? posC : negC } });
              td.appendChild(el('i', { class: 'axis' }));
            } else {
              var color = c.bar === 'diverging' ? (v >= 0 ? posC : negC) : (c.barColor || 'var(--ck-s1)');
              // bar and number share an edge so they read as one object
              fill = el('i', { style: right ? { right: '0', width: pct + '%', background: color } : { left: '0', width: pct + '%', background: color } });
            }
            fill.className = 'fill';
            td.appendChild(fill);
            td.classList.add('hasbar');
          }
          tr.appendChild(td);
        });
        tb.appendChild(tr);
      });
      t.appendChild(tb);
      var wrap = el('div', { class: 'ck-dt-wrap' }, t);
      if (o.maxHeight) wrap.style.maxHeight = o.maxHeight + 'px';
      ui.body.appendChild(wrap);
    }
    draw();
  }

  /* ---------- entry ---------- */
  function render(container, spec) {
    if (typeof container === 'string') container = document.querySelector(container);
    L = STR[pickLang(spec)] || STR.en;
    var width = spec.width || 720;
    if (spec.type === 'kpi') return renderKpi(container, spec, width);
    var ui = card(spec, width);
    var fn = { bar: renderBar, line: renderLine, area: renderLine, candle: renderCandle, donut: renderDonut, scatter: renderScatter, heatmap: renderHeatmap, funnel: renderFunnel, table: renderTable }[spec.type];
    if (!fn) ui.body.appendChild(el('div', { class: 'ck-empty', text: L.unknownType + spec.type }));
    else fn(ui, spec, width);
    container.appendChild(ui.root);
    return ui.root;
  }
  window.ChartKit = { render: render, fmt: fmt, SERIES: SERIES, defaults: DEFAULTS };
})();
