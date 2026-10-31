// 登場人物のイラスト（SVG で描く。画像ファイルは使わない）
// 顔の形・髪・眉・目・口・服・小物の組み合わせで、一人ひとりを描き分ける
(function (RG) {
  'use strict';
  const PT = RG.portrait = {};
  const NS = 'http://www.w3.org/2000/svg';
  const OL = '#3a2a22'; // 線の色

  // ---------- 人物の設定 ----------
  PT.PEOPLE = {
    // 白髪頭で四角い顔。いつも目を細めて笑っている、話好きの先生。JAの作業服姿
    takahashi: { bg: ['#e8f1e4', '#cfe3c6'], skin: '#f2c9a0', shade: '#dba77d', head: 'square', hair: 'whiteSide', hairC: '#f1f1ee', hairS: '#c9c9c4',
      brows: 'bushy', browC: '#e9e9e4', eyes: 'smile', mouth: 'talk', wrinkles: true, cheeks: true,
      cloth: 'work', clothC: '#8f9f86', clothS: '#6f8066', shirt: '#ffffff', pen: true },
    kimura: { bg: ['#e6ecf5', '#c9d6ea'], skin: '#f3cfab', shade: '#ddb08a', head: 'oval', hair: 'neat', hairC: '#2f2a2a', hairS: '#1d1919',
      brows: 'thin', browC: '#2f2a2a', eyes: 'open', glasses: '#2f2f3a', mouth: 'smile', cloth: 'suit', clothC: '#2f3d5c', clothS: '#23304a', shirt: '#ffffff', tie: '#b23a3a' },
    sato: { bg: ['#f3ebdc', '#e5d5b5'], skin: '#efc39b', shade: '#d6a179', head: 'oval', hair: 'baldSides', hairC: '#bdbdb8', hairS: '#9a9a95',
      brows: 'bushy', browC: '#cfcfca', eyes: 'smile', mouth: 'smile', wrinkles: true, cheeks: true, cloth: 'cardigan', clothC: '#9b6b45', clothS: '#7d5435', shirt: '#efe6d2' },
    aoki: { bg: ['#f5ebe6', '#ead2c6'], skin: '#f2c8a2', shade: '#d9a67f', head: 'round', hair: 'short', hairC: '#3b2b22', hairS: '#271c16',
      brows: 'normal', browC: '#3b2b22', eyes: 'open', mouth: 'grin', cheeks: true, cloth: 'apron', clothC: '#2e4a6b', clothS: '#223a55', shirt: '#ffffff', headband: '#ffffff' },
    kenta: { bg: ['#fff1dc', '#ffdcae'], skin: '#f5d0ac', shade: '#e0ad84', head: 'oval', hair: 'young', hairC: '#3a2618', hairS: '#24170e',
      brows: 'normal', browC: '#3a2618', eyes: 'open', mouth: 'grin', cheeks: true, cloth: 'tshirt', clothC: '#f08a3c', clothS: '#d06d24', cap: '#4f8f3e' },
    oyama: { bg: ['#fde8e2', '#f7c9bb'], skin: '#e9b98f', shade: '#cf9a6e', head: 'square', hair: 'short', hairC: '#2a2420', hairS: '#1a1512',
      brows: 'thick', browC: '#2a2420', eyes: 'open', mouth: 'grin', stubble: true, cloth: 'overall', clothC: '#3d6ea8', clothS: '#2d5585', shirt: '#e9e2d0', cap: '#c94a3c' },
    ogawa: { bg: ['#eef6e8', '#d6ebc8'], skin: '#f6d3b3', shade: '#e2b18b', head: 'oval', hair: 'bob', hairC: '#5a3a26', hairS: '#3f281a',
      brows: 'thin', browC: '#5a3a26', eyes: 'open', mouth: 'smile', cheeks: true, cloth: 'apron', clothC: '#5f9d4c', clothS: '#4a8239', shirt: '#f4efe2', straw: true },
    tamura: { bg: ['#eaeef1', '#d2dbe1'], skin: '#ecbf96', shade: '#d39e74', head: 'oval', hair: 'grayShort', hairC: '#8d8d8a', hairS: '#6c6c69',
      brows: 'normal', browC: '#777774', eyes: 'smile', mouth: 'smile', wrinkles: true, cloth: 'work', clothC: '#6f8597', clothS: '#566b7c', shirt: '#dfe3e6', towel: '#ffffff' },
  };

  // ---------- 部品 ----------
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  let uid = 0;

  PT.svg = function (who, size, opts) {
    const p = PT.PEOPLE[who];
    if (!p) return null;
    opts = opts || {};
    const id = 'pt' + (++uid);
    const s = el('svg', { viewBox: '0 0 100 100', width: size || 64, height: size || 64, class: 'portrait' + (opts.talk ? ' talking' : ''), role: 'img', 'aria-label': opts.label || '' });
    const defs = el('defs', {}, s);
    const cp = el('clipPath', { id: id + 'c' }, defs); el('circle', { cx: 50, cy: 50, r: 50 }, cp);
    const bg = el('linearGradient', { id: id + 'b', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: 0, 'stop-color': p.bg[0] }, bg); el('stop', { offset: 1, 'stop-color': p.bg[1] }, bg);
    const g = el('g', { 'clip-path': 'url(#' + id + 'c)' }, s);
    el('rect', { x: 0, y: 0, width: 100, height: 100, fill: 'url(#' + id + 'b)' }, g);

    // 体と服
    body(g, p);
    // 首
    el('path', { d: 'M42 58 h16 v14 q-8 6 -16 0 z', fill: p.shade }, g);
    // 後ろ髪
    hairBack(g, p);
    // 耳
    el('ellipse', { cx: p.head === 'square' ? 27.5 : 29, cy: 45, rx: 4.2, ry: 6, fill: p.skin, stroke: OL, 'stroke-width': 1.2 }, g);
    el('ellipse', { cx: p.head === 'square' ? 72.5 : 71, cy: 45, rx: 4.2, ry: 6, fill: p.skin, stroke: OL, 'stroke-width': 1.2 }, g);
    // 顔
    const face = p.head === 'square' ? el('rect', { x: 29, y: 19, width: 42, height: 44, rx: 11, fill: p.skin, stroke: OL, 'stroke-width': 1.4 }, g)
      : p.head === 'round' ? el('ellipse', { cx: 50, cy: 42, rx: 21, ry: 21.5, fill: p.skin, stroke: OL, 'stroke-width': 1.4 }, g)
        : el('ellipse', { cx: 50, cy: 41.5, rx: 20, ry: 23, fill: p.skin, stroke: OL, 'stroke-width': 1.4 }, g);
    void face;
    // あごの影
    el('path', { d: p.head === 'square' ? 'M33 56 q17 9 34 0 v2 q-17 8 -34 0z' : 'M36 56 q14 9 28 0 q-14 11 -28 0z', fill: p.shade, opacity: 0.45 }, g);
    if (p.cheeks) { el('ellipse', { cx: 38, cy: 49, rx: 4.5, ry: 2.6, fill: '#f08a7a', opacity: 0.35 }, g); el('ellipse', { cx: 62, cy: 49, rx: 4.5, ry: 2.6, fill: '#f08a7a', opacity: 0.35 }, g); }
    if (p.stubble) el('path', { d: 'M36 52 q14 12 28 0 q-2 9 -14 10 q-12 -1 -14 -10z', fill: '#2a2420', opacity: 0.12 }, g);
    if (p.wrinkles) {
      el('path', { d: 'M42 27 q8 -2 16 0', fill: 'none', stroke: p.shade, 'stroke-width': 1.1, 'stroke-linecap': 'round' }, g);
      el('path', { d: 'M38 51 q-2 3 0 6 M62 51 q2 3 0 6', fill: 'none', stroke: p.shade, 'stroke-width': 1.1, 'stroke-linecap': 'round' }, g);
    }
    // 目・眉・鼻・口
    eyes(g, p);
    brows(g, p);
    el('path', { d: 'M50 41 q-2.5 6 0.5 7', fill: 'none', stroke: p.shade, 'stroke-width': 1.6, 'stroke-linecap': 'round' }, g);
    mouth(g, p);
    if (p.glasses) {
      el('rect', { x: 34.5, y: 35, width: 12.5, height: 9, rx: 3.5, fill: 'rgba(255,255,255,.18)', stroke: p.glasses, 'stroke-width': 1.5 }, g);
      el('rect', { x: 53, y: 35, width: 12.5, height: 9, rx: 3.5, fill: 'rgba(255,255,255,.18)', stroke: p.glasses, 'stroke-width': 1.5 }, g);
      el('path', { d: 'M47 39 h6 M34.5 38 l-5 -1 M65.5 38 l5 -1', stroke: p.glasses, 'stroke-width': 1.4, fill: 'none' }, g);
    }
    // 前髪・帽子など
    hairFront(g, p);
    hat(g, p);
    return s;
  };

  function body(g, p) {
    const c = p.clothC, cs = p.clothS;
    el('path', { d: 'M8 102 C10 80 28 70 50 70 C72 70 90 80 92 102 Z', fill: p.cloth === 'vest' || p.cloth === 'apron' || p.cloth === 'overall' ? p.shirt : c, stroke: OL, 'stroke-width': 1.4 }, g);
    if (p.cloth === 'vest') {
      el('path', { d: 'M14 102 C16 84 26 75 40 72 L46 102 Z', fill: c, stroke: OL, 'stroke-width': 1.3 }, g);
      el('path', { d: 'M86 102 C84 84 74 75 60 72 L54 102 Z', fill: c, stroke: OL, 'stroke-width': 1.3 }, g);
      el('path', { d: 'M42 70 L50 80 L58 70', fill: p.shirt, stroke: OL, 'stroke-width': 1.2 }, g);
      el('rect', { x: 62, y: 84, width: 10, height: 8, rx: 1.5, fill: cs }, g);
      if (p.pen) { el('rect', { x: 66, y: 79, width: 2.2, height: 9, rx: 1, fill: '#2a3a6b' }, g); el('rect', { x: 65.6, y: 78.5, width: 3, height: 2.5, rx: 1, fill: '#d9b23c' }, g); }
    } else if (p.cloth === 'suit') {
      el('path', { d: 'M40 71 L50 92 L60 71 Z', fill: p.shirt, stroke: OL, 'stroke-width': 1.1 }, g);
      el('path', { d: 'M48 74 L50 72 L52 74 L51 90 L50 92 L49 90 Z', fill: p.tie, stroke: OL, 'stroke-width': 0.8 }, g);
      el('path', { d: 'M40 71 L46 86 L38 80 Z M60 71 L54 86 L62 80 Z', fill: cs }, g);
    } else if (p.cloth === 'cardigan') {
      el('path', { d: 'M44 71 L50 84 L56 71 Z', fill: p.shirt, stroke: OL, 'stroke-width': 1.1 }, g);
      el('path', { d: 'M50 84 V102', stroke: cs, 'stroke-width': 1.6 }, g);
      [88, 95].forEach((y) => el('circle', { cx: 52.5, cy: y, r: 1.2, fill: '#e8d9b8' }, g));
    } else if (p.cloth === 'apron' || p.cloth === 'overall') {
      el('path', { d: 'M34 102 V84 Q50 80 66 84 V102 Z', fill: c, stroke: OL, 'stroke-width': 1.3 }, g);
      el('path', { d: 'M36 84 L32 72 M64 84 L68 72', stroke: c, 'stroke-width': 3.5, 'stroke-linecap': 'round' }, g);
      if (p.cloth === 'overall') { el('circle', { cx: 37, cy: 86, r: 1.6, fill: '#e3c35a' }, g); el('circle', { cx: 63, cy: 86, r: 1.6, fill: '#e3c35a' }, g); el('rect', { x: 44, y: 88, width: 12, height: 7, rx: 1.5, fill: cs }, g); }
      el('path', { d: 'M43 70 L50 76 L57 70', fill: 'none', stroke: OL, 'stroke-width': 1.1 }, g);
    } else if (p.cloth === 'work') {
      el('path', { d: 'M42 70 L50 80 L58 70 L56 69 L50 76 L44 69 Z', fill: p.shirt, stroke: OL, 'stroke-width': 1 }, g);
      el('path', { d: 'M50 80 V102', stroke: cs, 'stroke-width': 1.4 }, g);
      // 作業服のえり
      el('path', { d: 'M42 69.5 L36 77 L46 78.5 Z M58 69.5 L64 77 L54 78.5 Z', fill: c, stroke: OL, 'stroke-width': 1.1, 'stroke-linejoin': 'round' }, g);
      el('rect', { x: 30, y: 84, width: 11, height: 8, rx: 1.5, fill: cs }, g);
      el('rect', { x: 59, y: 84, width: 11, height: 8, rx: 1.5, fill: cs }, g);
      if (p.pen) { el('rect', { x: 63, y: 79, width: 2.2, height: 9, rx: 1, fill: '#2a3a6b' }, g); el('rect', { x: 62.6, y: 78.5, width: 3, height: 2.5, rx: 1, fill: '#d9b23c' }, g); }
    } else if (p.cloth === 'tshirt') {
      el('path', { d: 'M42 71 Q50 77 58 71', fill: 'none', stroke: cs, 'stroke-width': 2 }, g);
    }
    if (p.towel) el('path', { d: 'M36 72 Q50 80 64 72 L66 76 Q50 85 34 76 Z', fill: p.towel, stroke: OL, 'stroke-width': 1 }, g);
  }

  function hairBack(g, p) {
    if (p.hair === 'bob') el('path', { d: 'M27 44 Q26 16 50 15 Q74 16 73 44 L74 60 Q66 62 64 56 L36 56 Q34 62 26 60 Z', fill: p.hairC, stroke: OL, 'stroke-width': 1.3 }, g);
  }

  function hairFront(g, p) {
    const c = p.hairC, sh = p.hairS;
    const st = { stroke: OL, 'stroke-width': 1.3 };
    if (p.hair === 'whiteSide') {
      // 豊かな白髪。横分けで、ふんわり立ち上がる
      el('path', Object.assign({ d: 'M27 40 Q24 20 36 14 Q46 8 58 11 Q72 13 75 27 Q76 34 73 41 Q70 31 64 27 Q60 22 50 23 Q44 18 38 24 Q31 28 30 41 Z', fill: c }, st), g);
      el('path', { d: 'M38 22 Q46 15 58 17 M44 19 Q52 14 62 18', fill: 'none', stroke: sh, 'stroke-width': 1.2, 'stroke-linecap': 'round' }, g);
      el('path', { d: 'M28 38 Q27 46 29 50 M72 38 Q73 46 71 50', fill: 'none', stroke: c, 'stroke-width': 3.2, 'stroke-linecap': 'round' }, g);
    } else if (p.hair === 'neat') {
      el('path', Object.assign({ d: 'M30 38 Q29 16 50 15 Q71 16 70 36 Q66 26 56 24 Q46 22 40 28 Q34 31 30 38 Z', fill: c }, st), g);
      el('path', { d: 'M44 18 Q48 22 47 27', fill: 'none', stroke: '#5a5050', 'stroke-width': 1 }, g);
    } else if (p.hair === 'baldSides') {
      el('path', Object.assign({ d: 'M29 44 Q27 34 32 30 Q34 36 33 46 Z', fill: c }, st), g);
      el('path', Object.assign({ d: 'M71 44 Q73 34 68 30 Q66 36 67 46 Z', fill: c }, st), g);
      el('path', { d: 'M40 21 Q50 18 60 21', fill: 'none', stroke: '#fff', 'stroke-width': 1.5, opacity: 0.5, 'stroke-linecap': 'round' }, g);
    } else if (p.hair === 'short') {
      el('path', Object.assign({ d: 'M29 40 Q27 17 50 16 Q73 17 71 40 Q68 28 62 26 Q50 22 38 26 Q32 29 29 40 Z', fill: c }, st), g);
    } else if (p.hair === 'young') {
      el('path', Object.assign({ d: 'M29 42 Q26 18 50 16 Q74 18 71 42 Q69 32 64 30 L62 26 L58 31 L54 25 L50 31 L46 25 L42 31 L38 27 Q32 31 29 42 Z', fill: c }, st), g);
    } else if (p.hair === 'bob') {
      el('path', Object.assign({ d: 'M29 40 Q30 18 50 18 Q70 18 71 40 Q66 30 56 27 Q48 30 38 30 Q32 33 29 40 Z', fill: c }, st), g);
    } else if (p.hair === 'grayShort') {
      el('path', Object.assign({ d: 'M29 39 Q28 18 50 17 Q72 18 71 39 Q67 29 50 27 Q33 29 29 39 Z', fill: c }, st), g);
    }
    void sh;
  }

  function hat(g, p) {
    if (p.cap) {
      el('path', { d: 'M28 30 Q30 12 50 12 Q70 12 72 30 Z', fill: p.cap, stroke: OL, 'stroke-width': 1.4 }, g);
      el('path', { d: 'M26 30 Q50 25 78 31 Q76 36 70 34 Q50 30 30 34 Z', fill: p.cap, stroke: OL, 'stroke-width': 1.4 }, g);
      el('path', { d: 'M50 12 V29', stroke: 'rgba(0,0,0,.15)', 'stroke-width': 1.2 }, g);
    }
    if (p.straw) {
      el('ellipse', { cx: 50, cy: 24, rx: 34, ry: 8, fill: '#e8c97a', stroke: OL, 'stroke-width': 1.4 }, g);
      el('path', { d: 'M33 24 Q34 8 50 8 Q66 8 67 24 Z', fill: '#efd48c', stroke: OL, 'stroke-width': 1.4 }, g);
      el('path', { d: 'M33.5 20 Q50 24 66.5 20 L66.8 23 Q50 27 33.2 23 Z', fill: '#c94a3c' }, g);
    }
    if (p.headband) el('path', { d: 'M29 30 Q50 22 71 30 L71 34 Q50 27 29 34 Z', fill: p.headband, stroke: OL, 'stroke-width': 1.1 }, g);
    if (p.towel) el('path', { d: 'M29 31 Q50 24 71 31 L71 35 Q50 29 29 35 Z', fill: p.towel, stroke: OL, 'stroke-width': 1 }, g);
  }

  function eyes(g, p) {
    if (p.eyes === 'smile') {
      // にっこり細めた目
      el('path', { d: 'M36.5 41 Q40.5 37 44.5 41', fill: 'none', stroke: OL, 'stroke-width': 2, 'stroke-linecap': 'round' }, g);
      el('path', { d: 'M55.5 41 Q59.5 37 63.5 41', fill: 'none', stroke: OL, 'stroke-width': 2, 'stroke-linecap': 'round' }, g);
    } else {
      [40.5, 59.5].forEach((x) => {
        el('ellipse', { cx: x, cy: 40, rx: 2.6, ry: 3.1, fill: OL }, g);
        el('circle', { cx: x + 0.9, cy: 38.9, r: 0.9, fill: '#fff' }, g);
      });
    }
  }

  function brows(g, p) {
    const c = p.browC;
    if (p.brows === 'bushy') {
      el('path', { d: 'M34 33 Q40 28.5 46 32 L45.5 34 Q40 31.5 34.5 35 Z', fill: c, stroke: OL, 'stroke-width': 0.9 }, g);
      el('path', { d: 'M66 33 Q60 28.5 54 32 L54.5 34 Q60 31.5 65.5 35 Z', fill: c, stroke: OL, 'stroke-width': 0.9 }, g);
    } else {
      const w = p.brows === 'thick' ? 2.8 : p.brows === 'thin' ? 1.4 : 2;
      el('path', { d: 'M35.5 33.5 Q40.5 30.5 45 33', fill: 'none', stroke: c, 'stroke-width': w, 'stroke-linecap': 'round' }, g);
      el('path', { d: 'M64.5 33.5 Q59.5 30.5 55 33', fill: 'none', stroke: c, 'stroke-width': w, 'stroke-linecap': 'round' }, g);
    }
  }

  function mouth(g, p) {
    if (p.mouth === 'talk') {
      // 話している口（説明中は動く）
      const m = el('g', { class: 'pt-mouth' }, g);
      el('path', { d: 'M43 51 Q50 49.5 57 51 Q56 58 50 58.5 Q44 58 43 51 Z', fill: '#7a2e2a', stroke: OL, 'stroke-width': 1.2 }, m);
      el('path', { d: 'M44.5 51.4 Q50 50.4 55.5 51.4 L55 53 Q50 52.2 45 53 Z', fill: '#fff' }, m);
      el('ellipse', { cx: 50, cy: 56.4, rx: 3.6, ry: 1.6, fill: '#e07a6a' }, m);
    } else if (p.mouth === 'grin') {
      el('path', { d: 'M42.5 51 Q50 50 57.5 51 Q55.5 57.5 50 57.5 Q44.5 57.5 42.5 51 Z', fill: '#fff', stroke: OL, 'stroke-width': 1.2 }, g);
    } else {
      el('path', { d: 'M43.5 52 Q50 57 56.5 52', fill: 'none', stroke: OL, 'stroke-width': 1.8, 'stroke-linecap': 'round' }, g);
    }
  }
})(window.RG = window.RG || {});
