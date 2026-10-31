// 共通ユーティリティ（DOM 非依存）
(function (RG) {
  'use strict';
  const U = RG.util = {};

  U.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  U.sum = (arr, f) => arr.reduce((s, x) => s + (f ? f(x) : x), 0);
  U.clone = (o) => JSON.parse(JSON.stringify(o));
  U.round = (v, d) => { const p = Math.pow(10, d || 0); return Math.round(v * p) / p; };
  U.avg = (arr) => (arr.length ? U.sum(arr) / arr.length : 0);

  U.num = (v, d) => {
    d = d || 0;
    if (!isFinite(v)) return '—';
    return Number(v).toLocaleString('ja-JP', { maximumFractionDigits: d, minimumFractionDigits: d });
  };
  U.yen = (v) => U.num(Math.round(v)) + '円';
  // 万円表記（経営判断で見やすい単位）
  U.man = (v, d) => {
    if (!isFinite(v)) return '—';
    if (Math.abs(v) < 50) return '0円';
    const x = v / 10000;
    if (d === undefined) d = Math.abs(x) >= 100 ? 0 : 1;
    return U.num(x, d) + '万円';
  };
  U.pct = (v, d) => (isFinite(v) ? (v * 100).toFixed(d || 0) + '%' : '—');
  U.ha = (v) => U.num(v, 1) + 'ha';
  U.bales = (v) => U.num(v, 0) + '俵';

  U.uid = (st, prefix) => (prefix || 'id') + (st.nextId++);
})(window.RG = window.RG || {});
