// シード付き乱数。年・用途ごとに独立した系列を作るので、
// プレイヤーの操作で天候や米価が変わることはない（同じシード＝同じ20年）。
(function (RG) {
  'use strict';
  const R = RG.rng = {};

  function hashStr(s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  R.hash = function () { return hashStr(Array.prototype.join.call(arguments, '|')); };

  R.hash01 = function () {
    let h = R.hash.apply(null, arguments);
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };

  R.make = function () {
    let a = R.hash.apply(null, arguments);
    const next = () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const r = {
      next,
      range: (lo, hi) => lo + (hi - lo) * next(),
      int: (lo, hi) => Math.floor(lo + (hi - lo + 1) * next()),
      chance: (p) => next() < p,
      normal: (mu, sd) => {
        let u = 0;
        while (u === 0) u = next();
        const v = next();
        return (mu || 0) + (sd === undefined ? 1 : sd) * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
      },
      pick: (arr) => arr[Math.floor(next() * arr.length)],
      weighted: (list) => {
        const tot = list.reduce((s, x) => s + x[1], 0);
        let x = next() * tot;
        for (const [k, w] of list) { if ((x -= w) < 0) return k; }
        return list[list.length - 1][0];
      },
    };
    return r;
  };

  R.randomSeed = () => Math.floor(Math.random() * 900000) + 100000;
})(window.RG = window.RG || {});
