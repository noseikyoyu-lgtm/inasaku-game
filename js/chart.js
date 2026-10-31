// 軽量SVGグラフ（外部ライブラリなし）
(function (RG) {
  'use strict';
  const C = RG.chart = {};
  const NS = 'http://www.w3.org/2000/svg';
  const U = RG.util;

  function el(tag, attrs, text) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function niceTicks(lo, hi, n) {
    if (lo === hi) { hi = lo + 1; lo = lo - 1; }
    const span = hi - lo;
    const step0 = span / n;
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0) || mag * 10;
    const t0 = Math.floor(lo / step) * step, t1 = Math.ceil(hi / step) * step;
    const ticks = [];
    for (let v = t0; v <= t1 + step / 2; v += step) ticks.push(Math.round(v / step) * step);
    return ticks;
  }

  const shortMan = (v) => {
    const x = v / 10000;
    return Math.abs(x) >= 1000 ? U.num(x / 10000, 1) + '億' : U.num(x, Math.abs(x) < 10 && x !== 0 ? 1 : 0) + '万';
  };
  C.fmtMan = shortMan;

  // series: [{name, values, cls}] / labels: x軸ラベル
  C.line = function (opts) {
    const W = 520, H = opts.height || 220, L = 58, R = 12, T = 12, B = 26;
    const all = [];
    opts.series.forEach((s) => s.values.forEach((v) => { if (isFinite(v)) all.push(v); }));
    if (opts.zero !== false) all.push(0);
    const lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
    const ticks = niceTicks(lo, hi, 4);
    const y0 = ticks[0], y1 = ticks[ticks.length - 1];
    const n = opts.labels.length;
    const x = (i) => L + (n <= 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (n - 1));
    const y = (v) => T + (H - T - B) * (1 - (v - y0) / (y1 - y0 || 1));
    const fmt = opts.fmt || shortMan;
    const svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart', role: 'img', 'aria-label': opts.title || 'グラフ' });
    ticks.forEach((t) => {
      svg.appendChild(el('line', { x1: L, x2: W - R, y1: y(t), y2: y(t), class: t === 0 ? 'zero' : 'grid' }));
      svg.appendChild(el('text', { x: L - 6, y: y(t) + 3, 'text-anchor': 'end' }, fmt(t)));
    });
    const every = Math.ceil(n / 10);
    opts.labels.forEach((lb, i) => {
      if (i % every === 0 || i === n - 1) svg.appendChild(el('text', { x: x(i), y: H - 8, 'text-anchor': 'middle' }, lb));
    });
    opts.series.forEach((s, si) => {
      const cls = s.cls || 'c' + (si + 1);
      const pts = s.values.map((v, i) => (isFinite(v) ? x(i) + ',' + y(v) : null)).filter(Boolean);
      if (pts.length > 1) svg.appendChild(el('polyline', { points: pts.join(' '), class: 'ln ' + cls, 'stroke-dasharray': s.dash || '' }));
      s.values.forEach((v, i) => {
        if (!isFinite(v)) return;
        const c = el('circle', { cx: x(i), cy: y(v), r: n > 12 ? 2.5 : 3.5, class: cls });
        c.appendChild(el('title', {}, s.name + ' ' + opts.labels[i] + '：' + (opts.tipFmt || U.man)(v)));
        svg.appendChild(c);
      });
    });
    return wrap(svg, opts.series);
  };

  // 月次資金繰り：入金・出金の棒＋月末残高の線
  C.cash = function (months, startCash) {
    const W = 560, H = 240, L = 58, R = 12, T = 12, B = 26;
    const vals = [startCash, 0];
    months.forEach((m) => { vals.push(m.inflow, m.outflow, m.before, m.end); });
    const ticks = niceTicks(Math.min.apply(null, vals), Math.max.apply(null, vals), 4);
    const y0 = ticks[0], y1 = ticks[ticks.length - 1];
    const bw = (W - L - R) / 12;
    const x = (i) => L + bw * i + bw / 2;
    const y = (v) => T + (H - T - B) * (1 - (v - y0) / (y1 - y0 || 1));
    const svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart', role: 'img', 'aria-label': '月次資金繰り' });
    ticks.forEach((t) => {
      svg.appendChild(el('line', { x1: L, x2: W - R, y1: y(t), y2: y(t), class: t === 0 ? 'zero' : 'grid' }));
      svg.appendChild(el('text', { x: L - 6, y: y(t) + 3, 'text-anchor': 'end' }, shortMan(t)));
    });
    months.forEach((m, i) => {
      const w = bw * 0.32;
      const rin = el('rect', { x: x(i) - w - 1, y: y(m.inflow), width: w, height: Math.max(0, y(0) - y(m.inflow)), class: 'bar-in' });
      rin.appendChild(el('title', {}, m.m + '月 入金 ' + U.man(m.inflow)));
      const rout = el('rect', { x: x(i) + 1, y: y(0), width: w, height: Math.max(0, y(m.outflow) - y(0)), class: 'bar-out' });
      rout.appendChild(el('title', {}, m.m + '月 出金 ' + U.man(-m.outflow)));
      svg.appendChild(rin); svg.appendChild(rout);
      svg.appendChild(el('text', { x: x(i), y: H - 8, 'text-anchor': 'middle' }, m.m + '月'));
    });
    const pts = months.map((m, i) => x(i) + ',' + y(m.before));
    svg.appendChild(el('polyline', { points: pts.join(' '), class: 'ln c3' }));
    months.forEach((m, i) => {
      const c = el('circle', { cx: x(i), cy: y(m.before), r: 3.5, class: m.before < 0 ? 'c4' : 'c3' });
      c.appendChild(el('title', {}, m.m + '月末の残高（つなぎ資金を借りる前）' + U.man(m.before)));
      svg.appendChild(c);
    });
    return wrap(svg, [{ name: '入金', cls: 'c1' }, { name: '出金', cls: 'c4' }, { name: '月末の資金残高', cls: 'c3' }]);
  };

  function wrap(svg, series) {
    const d = document.createElement('div');
    d.appendChild(svg);
    const lg = document.createElement('div');
    lg.className = 'legend';
    series.forEach((s, i) => {
      const sp = document.createElement('span');
      const ic = document.createElement('i');
      ic.className = s.cls || 'c' + (i + 1);
      sp.appendChild(ic);
      sp.appendChild(document.createTextNode(s.name));
      lg.appendChild(sp);
    });
    d.appendChild(lg);
    return d;
  }
})(window.RG = window.RG || {});
