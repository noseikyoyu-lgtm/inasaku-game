// 登場人物のイラスト（SVG で描く。画像ファイルは使わない）
// 顔の形・髪・眉・目・口・服・小物の組み合わせで、一人ひとりを描き分ける。
// 大きく表示しても見られるよう、陰影・まぶた・瞳・しわ・髪の流れ・服の縫い目まで描く
(function (RG) {
  'use strict';
  const PT = RG.portrait = {};
  const NS = 'http://www.w3.org/2000/svg';
  const OL = '#3a2a22'; // 線の色

  // ---------- 人物の設定 ----------
  PT.PEOPLE = {
    // 白髪頭で四角い顔。いつも目を細めて笑っている、話好きの先生。作業服に名札とペン
    takahashi: { bg: ['#e8f1e4', '#cfe3c6'], skin: '#f2c9a0', shade: '#dba77d', head: 'square', hair: 'whiteSide', hairC: '#f1f1ee', hairS: '#bfbfb9',
      brows: 'bushy', browC: '#e9e9e4', eyes: 'smile', mouth: 'talk', wrinkles: true, cheeks: true,
      cloth: 'work', clothC: '#8f9f86', clothS: '#6f8066', shirt: '#ffffff', pen: true, badge: true },
    // 金融機関の木村さん：きちんと分けた黒髪、細い眉、黒ぶちめがね。紺のスーツ
    kimura: { bg: ['#e6ecf5', '#c9d6ea'], skin: '#f3cfab', shade: '#ddb08a', head: 'oval', hair: 'neat', hairC: '#2f2a2a', hairS: '#141111',
      brows: 'thin', browC: '#2f2a2a', eyes: 'open', glasses: '#2f2f3a', glassShape: 'rect', mouth: 'smile', cloth: 'suit', clothC: '#2f3d5c', clothS: '#1f2b45', shirt: '#ffffff', tie: '#b23a3a' },
    // 地主の佐藤さん：頭の横だけ白髪、おでこのしわ。茶色のカーディガン
    sato: { bg: ['#f3ebdc', '#e5d5b5'], skin: '#efc39b', shade: '#d6a179', head: 'oval', hair: 'baldSides', hairC: '#c9c9c4', hairS: '#9a9a95',
      brows: 'bushy', browC: '#d9d9d4', eyes: 'smile', mouth: 'smile', wrinkles: true, forehead: true, cheeks: true, spots: true,
      cloth: 'cardigan', clothC: '#9b6b45', clothS: '#7d5435', shirt: '#efe6d2' },
    // 米屋の青木さん：はちまきに紺の前かけ
    aoki: { bg: ['#f5ebe6', '#ead2c6'], skin: '#f2c8a2', shade: '#d9a67f', head: 'round', hair: 'short', hairC: '#3b2b22', hairS: '#1f1611',
      brows: 'normal', browC: '#3b2b22', eyes: 'open', mouth: 'grin', cheeks: true, cloth: 'apron', clothC: '#2e4a6b', clothS: '#223a55', shirt: '#ffffff', headband: '#ffffff', logo: true },
    // 研修生の健太さん：短い前髪に帽子、オレンジのTシャツ
    kenta: { bg: ['#fff1dc', '#ffdcae'], skin: '#f5d0ac', shade: '#e0ad84', head: 'oval', hair: 'young', hairC: '#3a2618', hairS: '#1e130b',
      brows: 'normal', browC: '#3a2618', eyes: 'open', mouth: 'grin', cheeks: true, cloth: 'tshirt', clothC: '#f08a3c', clothS: '#d06d24', cap: '#4f8f3e' },
    // 大規模農家の大山さん：無精ひげ、赤い帽子、チェックのシャツにオーバーオール
    oyama: { bg: ['#fde8e2', '#f7c9bb'], skin: '#e9b98f', shade: '#cf9a6e', head: 'square', hair: 'short', hairC: '#2a2420', hairS: '#14100d',
      brows: 'thick', browC: '#2a2420', eyes: 'open', mouth: 'grin', stubble: true, cloth: 'overall', clothC: '#3d6ea8', clothS: '#2d5585', shirt: '#e9e2d0', plaid: '#c45a4a', cap: '#c94a3c' },
    // 直売所の小川さん：ボブの髪に麦わら帽子、緑の前かけ
    ogawa: { bg: ['#eef6e8', '#d6ebc8'], skin: '#f6d3b3', shade: '#e2b18b', head: 'oval', hair: 'bob', hairC: '#5a3a26', hairS: '#3a2416',
      brows: 'thin', browC: '#5a3a26', eyes: 'open', lashes: true, lip: '#d46a5e', mouth: 'smile', cheeks: true, cloth: 'apron', clothC: '#5f9d4c', clothS: '#4a8239', shirt: '#f4efe2', straw: true },
    // じいちゃん：麦わら帽子に首のタオル。白い太い眉とひげ、目尻を下げて笑う。藍色の野良着
    jiichan: { bg: ['#fbf1d8', '#f1dca8'], skin: '#e8b88c', shade: '#cc966a', head: 'round', hair: 'baldSides', hairC: '#f0efea', hairS: '#c4c3bd',
      brows: 'bushy', browC: '#f4f3ee', eyes: 'smile', mouth: 'smile', mustache: '#f4f3ee', wrinkles: true, cheeks: true, spots: true,
      cloth: 'work', clothC: '#3f5583', clothS: '#2f4268', shirt: '#e9e4d6', neckTowel: '#ffffff', straw: true },
    // 区長の森さん：丸めがねの世話役。白髪まじりの短髪、ベスト姿
    kucho: { bg: ['#eef3e2', '#d7e4bd'], skin: '#efc39b', shade: '#d6a179', head: 'square', hair: 'grayShort', hairC: '#c9c8c2', hairS: '#9a9993',
      brows: 'thick', browC: '#8f8e88', eyes: 'smile', mouth: 'smile', wrinkles: true, forehead: true, cheeks: true, glasses: '#6a4a2a', glassShape: 'round',
      cloth: 'vest', clothC: '#6f7f3f', clothS: '#56652f', shirt: '#f3efe3' },
    // ベテラン社員の山根さん：日焼けした頑固な現場の人。会社の帽子と作業服
    yamane: { bg: ['#e4ebf2', '#c3d3e2'], skin: '#d9a278', shade: '#bb835b', head: 'square', hair: 'short', hairC: '#55524d', hairS: '#33312e',
      brows: 'thick', browC: '#3a3834', eyes: 'open', mouth: 'flat', wrinkles: true, stubble: true,
      cloth: 'work', clothC: '#4f6f8f', clothS: '#3d5874', shirt: '#e6e9ec', cap: '#2f4f6f' },
    // 近所の田村さん：頭に手ぬぐい、灰色の作業服
    tamura: { bg: ['#eaeef1', '#d2dbe1'], skin: '#ecbf96', shade: '#d39e74', head: 'oval', hair: 'grayShort', hairC: '#8d8d8a', hairS: '#62625f',
      brows: 'normal', browC: '#777774', eyes: 'smile', mouth: 'smile', wrinkles: true, cloth: 'work', clothC: '#6f8597', clothS: '#566b7c', shirt: '#dfe3e6', towel: '#ffffff' },
  };

  // ---------- 部品 ----------
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  // 左右対称の部品：左側を描いて、鏡に映した右側も描く
  function sym(g, fn) { fn(g); fn(el('g', { transform: 'matrix(-1 0 0 1 100 0)' }, g)); }
  // 色を混ぜる（t=0 で a、t=1 で b）
  function mix(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const c = (s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
    return '#' + ((1 << 24) + (c(16) << 16) + (c(8) << 8) + c(0)).toString(16).slice(1);
  }
  const line = (d, color, w, extra) => Object.assign({ d, fill: 'none', stroke: color, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, extra || {});
  function grad(defs, id, stops, vertical) {
    const lg = el('linearGradient', vertical === false ? { id, x1: 0, y1: 0, x2: 1, y2: 0 } : { id, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    stops.forEach((s) => el('stop', { offset: s[0], 'stop-color': s[1], 'stop-opacity': s[2] == null ? 1 : s[2] }, lg));
    return 'url(#' + id + ')';
  }
  function rgrad(defs, id, stops, cx, cy, r) {
    const rg = el('radialGradient', { id, cx: cx == null ? 0.5 : cx, cy: cy == null ? 0.5 : cy, r: r == null ? 0.5 : r }, defs);
    stops.forEach((s) => el('stop', { offset: s[0], 'stop-color': s[1], 'stop-opacity': s[2] == null ? 1 : s[2] }, rg));
    return 'url(#' + rg.getAttribute('id') + ')';
  }

  // 顔の形
  const HEAD = {
    oval: 'M30 40 C30 24 39 17 50 17 C61 17 70 24 70 40 C70 52.5 63.5 62 50 65 C36.5 62 30 52.5 30 40 Z',
    round: 'M29 42 C29 27.5 38 20 50 20 C62 20 71 27.5 71 42 C71 55 63 63.5 50 64.2 C37 63.5 29 55 29 42 Z',
    square: 'M29 33 C29 22 37 18 50 18 C63 18 71 22 71 33 L71 46.5 C71 56 64 63 50 64.4 C36 63 29 56 29 46.5 Z',
  };
  let uid = 0;

  PT.svg = function (who, size, opts) {
    const p = PT.PEOPLE[who];
    if (!p) return null;
    opts = opts || {};
    const id = 'pt' + (++uid);
    const s = el('svg', { viewBox: '0 0 100 100', width: size || 64, height: size || 64, class: 'portrait' + (opts.talk ? ' talking' : ''), role: 'img', 'aria-label': opts.label || '' });
    const defs = el('defs', {}, s);
    const cp = el('clipPath', { id: id + 'c' }, defs); el('circle', { cx: 50, cy: 50, r: 50 }, cp);
    const fc = el('clipPath', { id: id + 'f' }, defs); el('path', { d: HEAD[p.head] }, fc);
    const ctx = { id, defs, p,
      skin: rgrad(defs, id + 's', [[0, mix(p.skin, '#ffffff', 0.22)], [0.55, p.skin], [1, mix(p.skin, p.shade, 0.7)]], 0.42, 0.38, 0.62),
      hair: grad(defs, id + 'h', [[0, mix(p.hairC, '#ffffff', 0.18)], [0.6, p.hairC], [1, p.hairS]]),
      cloth: grad(defs, id + 'w', [[0, mix(p.clothC, '#ffffff', 0.12)], [1, p.clothS]]),
    };
    const g = el('g', { 'clip-path': 'url(#' + id + 'c)' }, s);
    background(g, ctx);
    body(g, ctx);
    neck(g, ctx);
    hairBack(g, ctx);
    ears(g, ctx);
    face(g, ctx);
    hairFront(g, ctx);
    hat(g, ctx);
    // ふちの線
    el('circle', { cx: 50, cy: 50, r: 49.4, fill: 'none', stroke: 'rgba(58,42,34,.18)', 'stroke-width': 1.2 }, s);
    return s;
  };

  // ---------- 背景 ----------
  function background(g, c) {
    const p = c.p;
    el('rect', { x: 0, y: 0, width: 100, height: 100, fill: grad(c.defs, c.id + 'b', [[0, p.bg[0]], [1, p.bg[1]]]) }, g);
    // 頭のうしろの、やわらかい光
    el('circle', { cx: 50, cy: 42, r: 40, fill: rgrad(c.defs, c.id + 'g', [[0, '#ffffff', 0.55], [1, '#ffffff', 0]]) }, g);
    // ぼんやりした光の玉
    [[14, 22, 9], [86, 30, 7], [82, 66, 10], [18, 64, 6]].forEach((q) => el('circle', { cx: q[0], cy: q[1], r: q[2], fill: '#ffffff', opacity: 0.22 }, g));
    // 下のほうを少し濃く
    el('rect', { x: 0, y: 60, width: 100, height: 40, fill: grad(c.defs, c.id + 'v', [[0, p.bg[1], 0], [1, mix(p.bg[1], '#3a2a22', 0.25), 0.6]]) }, g);
  }

  // ---------- 首 ----------
  function neck(g, c) {
    const p = c.p;
    el('path', { d: 'M43.5 55 L43.2 70.5 Q50 75.5 56.8 70.5 L56.5 55 Z', fill: p.skin, stroke: OL, 'stroke-width': 1.1 }, g);
    // あごの下の影
    el('path', { d: 'M43.4 58 Q50 67 56.6 58 L56.7 64.5 Q50 70.5 43.3 64.5 Z', fill: p.shade, opacity: 0.75 }, g);
    if (p.wrinkles) el('path', line('M46 67.5 Q50 69 54 67.5', p.shade, 0.7, { opacity: 0.8 }), g);
  }

  // ---------- 耳 ----------
  function ears(g, c) {
    const p = c.p, x = p.head === 'square' ? 28.4 : p.head === 'round' ? 29.2 : 30.2;
    sym(g, (q) => {
      el('path', { d: 'M' + (x + 1.6) + ' 39.5 C' + (x - 3.6) + ' 37.6 ' + (x - 5.4) + ' 44.5 ' + (x - 3.4) + ' 49.2 C' + (x - 2.2) + ' 52 ' + (x + 0.6) + ' 52.6 ' + (x + 2.2) + ' 50.4 Z', fill: c.skin, stroke: OL, 'stroke-width': 1.1 }, q);
      el('path', line('M' + (x - 0.2) + ' 41.6 C' + (x - 3) + ' 42.2 ' + (x - 3.4) + ' 46 ' + (x - 1.8) + ' 48.4 C' + (x - 1) + ' 49.4 ' + (x + 0.2) + ' 49 ' + x + ' 47.8', p.shade, 0.9), q);
      el('path', { d: 'M' + (x - 1.2) + ' 44 C' + (x - 2) + ' 45 ' + (x - 1.6) + ' 46.4 ' + (x - 0.6) + ' 46.8 Z', fill: p.shade, opacity: 0.7 }, q);
    });
  }

  // ---------- 顔 ----------
  function face(g, c) {
    const p = c.p;
    el('path', { d: HEAD[p.head], fill: c.skin, stroke: OL, 'stroke-width': 1.3 }, g);
    // 顔の中の陰影（光は左上から）
    const f = el('g', { 'clip-path': 'url(#' + c.id + 'f)' }, g);
    el('path', { d: 'M61 16 C72 26 73.5 50 63 66 L82 66 L82 16 Z', fill: p.shade, opacity: 0.28 }, f);
    el('path', { d: 'M28 50 C33 60 42 64.5 50 64.5 C58 64.5 67 60 72 50 L72 70 L28 70 Z', fill: p.shade, opacity: 0.22 }, f);
    el('ellipse', { cx: 43, cy: 29, rx: 9, ry: 5, fill: '#ffffff', opacity: 0.16 }, f);
    // 髪や帽子の下の影
    if (p.cap) el('rect', { x: 20, y: 29, width: 60, height: 7, fill: p.shade, opacity: 0.45 }, f);
    else if (p.straw) el('ellipse', { cx: 50, cy: 28, rx: 26, ry: 6, fill: p.shade, opacity: 0.5 }, f);
    else if (p.hair !== 'baldSides') el('path', { d: 'M26 30 C34 25 44 26.5 50 27 C57 26 66 25.5 74 30 L74 35 C66 30.5 57 30.5 50 31 C43 30.5 34 30 26 35 Z', fill: p.shade, opacity: 0.35 }, f);
    // ほお
    if (p.cheeks) sym(f, (q) => el('ellipse', { cx: 38.5, cy: 49.5, rx: 5.6, ry: 3.4, fill: rgrad(c.defs, c.id + 'k', [[0, '#f07f6e', 0.55], [1, '#f07f6e', 0]]) }, q));
    // ほお骨のつや
    sym(f, (q) => el('ellipse', { cx: 38, cy: 46.5, rx: 3.2, ry: 1.4, fill: '#ffffff', opacity: 0.13 }, q));
    // 無精ひげ（点の模様）
    if (p.stubble) {
      const pat = el('pattern', { id: c.id + 'p', width: 1.5, height: 1.5, patternUnits: 'userSpaceOnUse' }, c.defs);
      el('circle', { cx: 0.5, cy: 0.5, r: 0.28, fill: '#2a2420' }, pat);
      el('circle', { cx: 1.25, cy: 1.15, r: 0.22, fill: '#2a2420' }, pat);
      el('path', { d: 'M34 49 C36 60 43.5 65 50 65 C56.5 65 64 60 66 49 C63 56 58 57.5 55.5 56.6 C53 55.8 47 55.8 44.5 56.6 C42 57.5 37 56 34 49 Z M44 51.6 C47 50.2 53 50.2 56 51.6 L55.4 53 C52.5 52 47.5 52 44.6 53 Z', fill: 'url(#' + c.id + 'p)', opacity: 0.55 }, f);
    }
    // しみ
    if (p.spots) [[60, 31, 1.1], [63.5, 45, 0.8], [36, 33, 0.7]].forEach((q) => el('ellipse', { cx: q[0], cy: q[1], rx: q[2], ry: q[2] * 0.8, fill: p.shade, opacity: 0.45 }, f));
    // しわ
    if (p.forehead) {
      el('path', line('M41 25.6 Q50 23.6 59 25.6', p.shade, 0.9, { opacity: 0.9 }), f);
      el('path', line('M42.5 28.6 Q50 27 57.5 28.6', p.shade, 0.8, { opacity: 0.8 }), f);
    }
    if (p.wrinkles) {
      sym(f, (q) => {
        el('path', line('M44.6 47.8 C42.4 50.4 41.8 53.2 42.8 56', p.shade, 0.95), q); // ほうれい線
        el('path', line('M37.6 44.2 C39.6 45.4 42.2 45.4 44.2 44.2', p.shade, 0.7, { opacity: 0.8 }), q); // 目の下
      });
      el('path', line('M47.2 33.4 L47.8 35.6 M52.8 33.4 L52.2 35.6', p.shade, 0.7, { opacity: 0.7 }), f); // 眉間
    }
    // 目・眉・鼻・口
    eyes(g, c);
    brows(g, c);
    nose(g, c);
    mouth(g, c);
    if (p.mustache) mustache(g, c);
    if (p.glasses) glasses(g, c);
  }

  function nose(g, c) {
    const p = c.p;
    el('path', line('M51.2 37 C51.6 40.5 52.6 44 53.4 46.2', p.shade, 0.9, { opacity: 0.7 }), g); // 鼻すじの影
    el('path', line('M47 47.6 C47.6 49.6 49.4 50.2 50.4 49.6 C51.4 50.2 53 49.8 53.6 47.8', p.shade, 1.1), g);
    el('ellipse', { cx: 48.4, cy: 48.6, rx: 0.9, ry: 0.55, fill: OL, opacity: 0.45 }, g);
    el('ellipse', { cx: 52.2, cy: 48.6, rx: 0.9, ry: 0.55, fill: OL, opacity: 0.45 }, g);
    el('ellipse', { cx: 49.4, cy: 46.4, rx: 1.4, ry: 0.9, fill: '#ffffff', opacity: 0.4 }, g); // 鼻先のつや
  }

  function eyes(g, c) {
    const p = c.p;
    if (p.eyes === 'smile') {
      // にっこり細めた目（上まぶたの弧・まつげ・下のふくらみ）
      sym(g, (q) => {
        el('path', line('M36.2 41.6 C38.4 37.6 43 37.4 45.6 41', OL, 1.9), q);
        el('path', line('M36.4 41.4 L35 42.4 M38.6 38.9 L38 37.6', OL, 0.9), q);
        el('path', line('M37.6 43.6 C40 45 43.2 44.8 45.2 43.2', p.shade, 0.9, { opacity: 0.8 }), q);
        if (p.wrinkles) el('path', line('M34.8 40 L33 39.2 M34.9 41.6 L32.8 41.8 M35.3 43.1 L33.6 44.2', p.shade, 0.8), q); // 目尻のしわ
      });
      return;
    }
    const ec = el('clipPath', { id: c.id + 'e' }, c.defs);
    const EYE = 'M36.4 41 C37.6 38 40 37 42.1 37.2 C43.9 37.4 45.3 38.6 45.9 40.3 C44.4 42.5 42.4 43.3 40.6 43.2 C38.7 43.1 37.2 42.3 36.4 41 Z';
    el('path', { d: EYE }, ec);
    const iris = rgrad(c.defs, c.id + 'i', [[0, '#7a5236'], [0.6, '#4a2f1e'], [1, '#22150d']], 0.5, 0.35, 0.6);
    sym(g, (q) => {
      el('path', { d: EYE, fill: '#fffaf3' }, q);
      const ig = el('g', { 'clip-path': 'url(#' + c.id + 'e)' }, q);
      el('circle', { cx: 41.6, cy: 40.2, r: 2.75, fill: iris }, ig);
      el('circle', { cx: 41.6, cy: 40.3, r: 1.2, fill: '#120b07' }, ig);
      el('path', { d: 'M36 37 L46.5 37 L46.5 39.4 C44 38 39 38 36 40 Z', fill: OL, opacity: 0.18 }, ig); // まぶたの影
      el('path', line('M36 41.4 C37.4 38 40 36.8 42.2 37 C44.2 37.2 45.6 38.6 46.3 40.4', OL, 1.6), q); // 上まぶた
      el('path', line('M37.4 38.2 C39.4 36 42.8 35.6 45.2 37.4', p.shade, 0.7, { opacity: 0.85 }), q); // 二重
      el('path', line('M37.8 42.2 C39.6 43.6 42.6 43.7 45 41.6', p.shade, 0.7), q); // 下まぶた
      if (p.lashes) el('path', line('M36.6 40.6 L34.8 39.4 M37.4 39.3 L36 37.8 M38.8 38.1 L38 36.6', OL, 0.8), q);
    });
    // 瞳の光（光は左上から、左右とも同じ向き）
    [41.6, 58.4].forEach((x) => {
      el('circle', { cx: x - 0.7 + 1, cy: 39.1, r: 0.95, fill: '#ffffff' }, g);
      el('circle', { cx: x - 1, cy: 41.3, r: 0.45, fill: '#ffffff', opacity: 0.85 }, g);
    });
  }

  function brows(g, c) {
    const p = c.p, col = p.browC, dark = mix(col, '#000000', 0.35);
    if (p.brows === 'bushy') {
      // 年配の人の、ふさふさと長い眉
      sym(g, (q) => {
        el('path', { d: 'M33.6 35 C35.6 31.2 40.8 29.4 46 31.6 C45.8 33 45.4 33.8 45 34.4 C41 32.4 37 33.2 34.4 36.4 C33.6 36.4 33.2 35.8 33.6 35 Z', fill: col, stroke: OL, 'stroke-width': 0.8 }, q);
        el('path', line('M35.4 33.6 L33.2 35.2 M37 32.4 L34.8 33.4 M39.2 31.6 L38.4 30.6 M41.6 31.2 L41.4 30 M43.8 31.4 L44.4 30.4 M36 34.4 L33.8 37.2', dark, 0.6, { opacity: 0.55 }), q);
      });
      return;
    }
    const t = p.brows === 'thick' ? 2.5 : p.brows === 'thin' ? 1.1 : 1.7;
    sym(g, (q) => {
      el('path', { d: 'M35 35.2 C37.6 32.4 41.4 31.4 45.8 32.8 C41.4 ' + (31.4 + t) + ' 37.8 ' + (32.4 + t) + ' 35.4 ' + (35.2 + t * 0.45) + ' Z', fill: col, stroke: col, 'stroke-width': 0.5, 'stroke-linejoin': 'round' }, q);
      el('path', line('M36.6 34.4 L37.6 33.2 M38.6 33.4 L39.8 32.4 M40.8 32.8 L42.2 32.2 M43 32.6 L44.4 32.4', dark, 0.45, { opacity: 0.6 }), q);
    });
  }

  function mouth(g, c) {
    const p = c.p;
    const lipC = p.lip || mix(p.shade, '#c0605a', 0.35);
    if (p.mouth === 'talk') {
      // 話している口（説明中は動く）
      const m = el('g', { class: 'pt-mouth' }, g);
      el('path', { d: 'M42.8 51.4 Q50 49.6 57.2 51.4 Q56.2 58.6 50 59 Q43.8 58.6 42.8 51.4 Z', fill: '#6e2620', stroke: OL, 'stroke-width': 1.1 }, m);
      el('path', { d: 'M44.3 51.6 Q50 50.4 55.7 51.6 L55.2 53.4 Q50 52.6 44.8 53.4 Z', fill: '#ffffff' }, m);
      el('path', line('M47 51.2 L47.1 53 M50 50.9 L50 52.8 M53 51.2 L52.9 53', '#d8d0c4', 0.4), m);
      el('path', { d: 'M45.6 57 Q50 54.4 54.4 57 Q52.4 58.6 50 58.7 Q47.6 58.6 45.6 57 Z', fill: '#e07a6a' }, m);
      el('path', line('M45.6 60.6 Q50 61.8 54.4 60.6', lipC, 0.9, { opacity: 0.7 }), g);
    } else if (p.mouth === 'flat') {
      // 口をへの字に結ぶ
      el('path', line('M43.8 54.4 Q50 52.8 56.2 54.4', OL, 1.7), g);
      el('path', line('M43.6 54.4 L43 55.4 M56.4 54.4 L57 55.4', OL, 0.9), g);
      el('path', line('M46.4 56.6 Q50 57.6 53.6 56.6', lipC, 1, { opacity: 0.8 }), g);
    } else if (p.mouth === 'grin') {
      // 歯を見せて笑う
      el('path', { d: 'M42.4 51.6 Q50 50.4 57.6 51.6 Q56.2 59.2 50 59.4 Q43.8 59.2 42.4 51.6 Z', fill: '#6e2620', stroke: OL, 'stroke-width': 1.1 }, g);
      el('path', { d: 'M43.7 51.9 Q50 51 56.3 51.9 L55.8 54.2 Q50 53.4 44.2 54.2 Z', fill: '#ffffff' }, g);
      el('path', line('M46.6 51.5 L46.8 53.6 M50 51.2 L50 53.4 M53.4 51.5 L53.2 53.6', '#d8d0c4', 0.4), g);
      el('path', { d: 'M45.4 57.2 Q50 54.8 54.6 57.2 Q52.6 59 50 59.1 Q47.4 59 45.4 57.2 Z', fill: '#e07a6a' }, g);
      el('path', line('M41.8 51.2 L41 50.4 M58.2 51.2 L59 50.4', OL, 0.9), g);
      el('path', line('M45.6 61 Q50 62.2 54.4 61', lipC, 0.9, { opacity: 0.7 }), g);
    } else {
      // ほほえみ（口角を上げる）
      el('path', line('M43.2 52.4 Q50 57.8 56.8 52.4', OL, 1.6), g);
      el('path', line('M42.6 52.6 L42 51.4 M57.4 52.6 L58 51.4', OL, 0.9), g);
      el('path', { d: 'M46 55.6 Q50 57.2 54 55.6 Q52.6 58 50 58.2 Q47.4 58 46 55.6 Z', fill: lipC, opacity: p.lip ? 0.85 : 0.45 }, g);
    }
  }

  function mustache(g, c) {
    const p = c.p, dark = mix(p.mustache, '#7a7a74', 0.5);
    el('path', { d: 'M38.8 52 C41.2 47.4 46.2 46.8 50 49 C53.8 46.8 58.8 47.4 61.2 52 C58 51.6 55.4 53 50 51.4 C44.6 53 42 51.6 38.8 52 Z', fill: p.mustache, stroke: OL, 'stroke-width': 0.9 }, g);
    el('path', line('M42 50.6 L43.6 48.8 M44.6 50.8 L46 48.4 M47.4 50.4 L48.4 48.8 M52.6 50.4 L51.6 48.8 M55.4 50.8 L54 48.4 M58 50.6 L56.4 48.8', dark, 0.5, { opacity: 0.7 }), g);
  }

  function glasses(g, c) {
    const p = c.p, col = p.glasses;
    const lens = grad(c.defs, c.id + 'l', [[0, '#ffffff', 0.35], [1, '#bcd4e6', 0.12]]);
    sym(g, (q) => {
      if (p.glassShape === 'round') el('circle', { cx: 40.8, cy: 40.4, r: 5.6, fill: lens, stroke: col, 'stroke-width': 1.4 }, q);
      else el('rect', { x: 34.2, y: 35.6, width: 13, height: 9.2, rx: 2.4, fill: lens, stroke: col, 'stroke-width': 1.5 }, q);
      el('path', line('M34.4 39.4 L29.4 38.2', col, 1.3), q); // つる
      el('path', line('M37 37.6 L39.2 36.8', '#ffffff', 0.9, { opacity: 0.8 }), q); // レンズの光
    });
    el('path', line('M47 39.6 Q50 37.8 53 39.6', col, 1.3), g); // ブリッジ
  }

  // ---------- 体と服 ----------
  function body(g, c) {
    const p = c.p, col = p.clothC, cs = p.clothS;
    const BODY = 'M6 102 C8 82 26 72.5 50 72 C74 72.5 92 82 94 102 Z';
    const bc = el('clipPath', { id: c.id + 'd' }, c.defs); el('path', { d: BODY }, bc);
    const under = p.cloth === 'vest' || p.cloth === 'apron' || p.cloth === 'overall';
    el('path', { d: BODY, fill: under ? p.shirt : c.cloth, stroke: OL, 'stroke-width': 1.3 }, g);
    const inB = el('g', { 'clip-path': 'url(#' + c.id + 'd)' }, g);
    // シャツの柄（チェック）
    if (under && p.plaid) {
      const pat = el('pattern', { id: c.id + 'q', width: 6, height: 6, patternUnits: 'userSpaceOnUse' }, c.defs);
      el('rect', { x: 0, y: 0, width: 6, height: 2, fill: p.plaid, opacity: 0.45 }, pat);
      el('rect', { x: 0, y: 0, width: 2, height: 6, fill: p.plaid, opacity: 0.45 }, pat);
      el('rect', { x: 0, y: 0, width: 2, height: 2, fill: p.plaid, opacity: 0.4 }, pat);
      el('rect', { x: 0, y: 68, width: 100, height: 40, fill: 'url(#' + c.id + 'q)' }, inB);
    }
    // 肩の陰影としわ
    el('path', { d: 'M6 102 C8 88 14 81 22 77.5 C18 85 17 94 18 102 Z', fill: '#000000', opacity: 0.12 }, inB);
    el('path', { d: 'M94 102 C92 88 86 81 78 77.5 C82 85 83 94 82 102 Z', fill: '#000000', opacity: 0.18 }, inB);
    el('path', line('M22 84 Q26 90 24 98 M78 84 Q74 90 76 98', '#000000', 0.7, { opacity: 0.15 }), inB);
    const stitch = (d) => el('path', line(d, mix(cs, '#ffffff', 0.35), 0.5, { 'stroke-dasharray': '1.1 1', opacity: 0.9 }), g);

    if (p.cloth === 'work') {
      // 作業服：えり・前立て・胸ポケット・縫い目
      el('path', { d: 'M43 69 L50 80 L57 69 Z', fill: p.shirt, stroke: OL, 'stroke-width': 1 }, g);
      el('path', line('M46.6 72.6 L50 77.6 L53.4 72.6', mix(p.shirt, '#000000', 0.15), 0.7), g);
      sym(g, (q) => {
        el('path', { d: 'M43.4 68.6 L36.6 76 L40.8 80.2 L47.6 78 Z', fill: c.cloth, stroke: OL, 'stroke-width': 1, 'stroke-linejoin': 'round' }, q);
        el('path', { d: 'M30 83.5 H42 V94 Q36 95.4 30 94 Z', fill: cs, opacity: 0.55, stroke: OL, 'stroke-width': 0.8 }, q);
        el('path', { d: 'M29.6 82.6 H42.4 V86.4 Q36 87.6 29.6 86.4 Z', fill: c.cloth, stroke: OL, 'stroke-width': 0.9 }, q);
        el('circle', { cx: 36, cy: 85.4, r: 0.85, fill: mix(cs, '#000000', 0.3) }, q);
      });
      stitch('M30.6 88 H41.4'); stitch('M58.6 88 H69.4');
      stitch('M27 79 Q22 84 19 94'); stitch('M73 79 Q78 84 81 94');
      el('path', line('M50 80 V102', cs, 1.2), g);
      el('path', line('M51.4 80.5 V102', mix(cs, '#ffffff', 0.3), 0.5, { 'stroke-dasharray': '1.1 1' }), g);
      [85, 92, 99].forEach((y) => el('circle', { cx: 51.6, cy: y, r: 0.9, fill: mix(cs, '#000000', 0.3) }, g));
      if (p.pen) {
        el('rect', { x: 63.6, y: 77.4, width: 2.2, height: 9.6, rx: 1, fill: '#2a3a6b', stroke: OL, 'stroke-width': 0.5 }, g);
        el('rect', { x: 63.2, y: 77, width: 3, height: 2.4, rx: 1, fill: '#d9b23c' }, g);
        el('rect', { x: 66.6, y: 78.4, width: 1.8, height: 8.4, rx: 0.8, fill: '#c94a3c', stroke: OL, 'stroke-width': 0.4 }, g);
      }
      if (p.badge) {
        el('rect', { x: 31, y: 88.6, width: 10, height: 5, rx: 0.8, fill: '#ffffff', stroke: OL, 'stroke-width': 0.6 }, g);
        el('rect', { x: 31.8, y: 89.4, width: 2.6, height: 3.4, fill: '#5f9d4c' }, g);
        el('path', line('M35.4 90.2 H40 M35.4 91.8 H39', '#5a5a5a', 0.5), g);
      }
    } else if (p.cloth === 'suit') {
      el('path', { d: 'M41 70 L50 90 L59 70 Z', fill: p.shirt, stroke: OL, 'stroke-width': 1 }, g);
      sym(g, (q) => {
        el('path', { d: 'M42 69.4 L46.6 76.6 L50 72.2 Z', fill: '#ffffff', stroke: OL, 'stroke-width': 0.8, 'stroke-linejoin': 'round' }, q); // シャツのえり
        el('path', { d: 'M40.6 69.6 L36.2 76.4 L39.2 78.2 L36.6 81.6 L48 90.4 Z', fill: cs, stroke: OL, 'stroke-width': 0.9, 'stroke-linejoin': 'round' }, q); // 下えり
        el('path', line('M38 79 Q30 84 27 96', '#000000', 0.6, { opacity: 0.2 }), q);
      });
      el('path', { d: 'M48 72.6 L52 72.6 L51.3 75.6 L48.7 75.6 Z', fill: p.tie, stroke: OL, 'stroke-width': 0.7 }, g);
      el('path', { d: 'M48.7 75.6 L51.3 75.6 L52.8 88 L50 91.4 L47.2 88 Z', fill: p.tie, stroke: OL, 'stroke-width': 0.7 }, g);
      el('path', line('M48.6 79 L51.6 77.4 M48.2 83 L52.2 80.8 M47.8 87 L52.6 84.4', mix(p.tie, '#ffffff', 0.4), 0.6), g);
      el('path', { d: 'M24.6 86 L26.6 83.4 L28.2 85.6 L30 83.8 L31.2 86 Z', fill: '#ffffff', stroke: OL, 'stroke-width': 0.5 }, g); // ポケットチーフ
      el('path', line('M23.6 86.2 H32.2', OL, 0.7), g);
      el('circle', { cx: 50, cy: 97, r: 1.1, fill: mix(cs, '#000000', 0.3), stroke: OL, 'stroke-width': 0.4 }, g);
    } else if (p.cloth === 'cardigan') {
      // 編み目のたて筋
      const pat = el('pattern', { id: c.id + 'n', width: 2.4, height: 3, patternUnits: 'userSpaceOnUse' }, c.defs);
      el('path', line('M1.2 0 V3', '#000000', 0.5, { opacity: 0.16 }), pat);
      el('rect', { x: 0, y: 70, width: 100, height: 32, fill: 'url(#' + c.id + 'n)' }, inB);
      el('path', { d: 'M43.6 71 L50 85 L56.4 71 Z', fill: p.shirt, stroke: OL, 'stroke-width': 1 }, g);
      sym(g, (q) => {
        el('path', { d: 'M43.2 70.6 L47 76.4 L50 73.2 Z', fill: '#ffffff', stroke: OL, 'stroke-width': 0.8 }, q);
        el('path', line('M43.6 71 L49 85.4 L49 102', cs, 2.4), q);
        el('path', { d: 'M28 84 H39 V93 H28 Z', fill: cs, opacity: 0.35, stroke: OL, 'stroke-width': 0.6 }, q);
      });
      [88, 95].forEach((y) => el('circle', { cx: 52.2, cy: y, r: 1.25, fill: '#e8d9b8', stroke: OL, 'stroke-width': 0.5 }, g));
    } else if (p.cloth === 'apron' || p.cloth === 'overall') {
      // シャツのえり
      el('path', { d: 'M43 70 L50 76.6 L57 70', fill: 'none', stroke: OL, 'stroke-width': 1 }, g);
      sym(g, (q) => el('path', { d: 'M43.2 69.6 L41 76.8 L48.4 76.2 Z', fill: p.shirt, stroke: OL, 'stroke-width': 0.8, 'stroke-linejoin': 'round' }, q));
      el('path', line('M50 76.6 V84', mix(p.shirt, '#000000', 0.2), 0.8), g);
      // 胸当て
      el('path', { d: 'M34 102 V84.6 Q50 81 66 84.6 V102 Z', fill: c.cloth, stroke: OL, 'stroke-width': 1.2 }, g);
      stitch('M35.6 86.2 Q50 83 64.4 86.2');
      sym(g, (q) => el('path', line('M36.4 84.6 L41.6 71.2', col, 3.2), q));
      sym(g, (q) => el('path', line('M36.6 84.4 L41.8 71', mix(col, '#ffffff', 0.25), 0.6, { 'stroke-dasharray': '1 0.9' }), q));
      el('path', { d: 'M43.6 89.6 H56.4 V98 Q50 99.2 43.6 98 Z', fill: cs, stroke: OL, 'stroke-width': 0.8 }, g);
      stitch('M44.4 91 H55.6');
      if (p.cloth === 'overall') {
        sym(g, (q) => {
          el('rect', { x: 35, y: 84.6, width: 4.4, height: 3.6, rx: 0.8, fill: '#d9d4c4', stroke: OL, 'stroke-width': 0.6 }, q);
          el('circle', { cx: 37.2, cy: 90.4, r: 1.3, fill: '#e3c35a', stroke: OL, 'stroke-width': 0.5 }, q);
        });
      }
      if (p.logo) {
        // 米屋の印（丸に稲穂）
        el('circle', { cx: 50, cy: 93.6, r: 2.6, fill: 'none', stroke: '#ffffff', 'stroke-width': 0.7 }, g);
        el('path', line('M49.4 95.6 Q50 93 51.4 91.6 M50.2 93.6 L51.6 94 M50.4 92.6 L51.8 92.8', '#ffffff', 0.55), g);
      }
    } else if (p.cloth === 'vest') {
      el('path', { d: 'M42 70 L50 80 L58 70', fill: p.shirt, stroke: OL, 'stroke-width': 1.1 }, g);
      sym(g, (q) => {
        el('path', { d: 'M42.8 69.6 L39.8 77 L47.6 77.8 Z', fill: '#ffffff', stroke: OL, 'stroke-width': 0.8, 'stroke-linejoin': 'round' }, q);
        el('path', { d: 'M14 102 C16 84 26 75 40 72 L46.6 102 Z', fill: c.cloth, stroke: OL, 'stroke-width': 1.2 }, q);
        el('path', { d: 'M26 84 H37 V92.6 Q31.5 93.6 26 92.6 Z', fill: cs, stroke: OL, 'stroke-width': 0.7 }, q);
        el('path', { d: 'M25.6 83.2 H37.4 V86 H25.6 Z', fill: c.cloth, stroke: OL, 'stroke-width': 0.7 }, q);
        el('path', { d: 'M27 94.6 H37.6 V101 H27 Z', fill: cs, stroke: OL, 'stroke-width': 0.7 }, q);
        el('path', line('M42 74 L46 101', mix(c.p.clothC, '#ffffff', 0.4), 0.5, { 'stroke-dasharray': '1 1' }), q);
      });
      el('path', line('M50 80 V102', mix(p.shirt, '#000000', 0.2), 0.8), g);
    } else if (p.cloth === 'tshirt') {
      el('path', { d: 'M41.6 70.6 Q50 78.8 58.4 70.6 L57 72.8 Q50 79 43 72.8 Z', fill: cs, stroke: OL, 'stroke-width': 0.9 }, g);
      el('path', line('M20 80 Q23 89 21 98 M80 80 Q77 89 79 98', cs, 0.9), g);
      el('path', line('M40 86 Q44 88 41 94 M60 86 Q56 88 59 94', '#000000', 0.6, { opacity: 0.12 }), g);
      // 胸の稲穂の絵
      el('path', line('M50 97 Q50.6 91 53.4 86.6', '#ffffff', 0.9), g);
      [[51.6, 92.4], [52.4, 90.2], [53.2, 88.2]].forEach((q) => { el('ellipse', { cx: q[0] + 1.3, cy: q[1] + 0.2, rx: 1.3, ry: 0.6, transform: 'rotate(25 ' + (q[0] + 1.3) + ' ' + (q[1] + 0.2) + ')', fill: '#ffffff' }, g); el('ellipse', { cx: q[0] - 1.2, cy: q[1] + 0.4, rx: 1.3, ry: 0.6, transform: 'rotate(-25 ' + (q[0] - 1.2) + ' ' + (q[1] + 0.4) + ')', fill: '#ffffff' }, g); });
    }
    // 首のタオル（ねじって巻いた手ぬぐい。青い線入り）
    const tw = p.neckTowel;
    if (tw) {
      el('path', { d: 'M35.4 71.6 Q50 80.6 64.6 71.6 L66.6 76.2 Q50 86.4 33.4 76.2 Z', fill: tw, stroke: OL, 'stroke-width': 0.9 }, g);
      el('path', line('M36.6 73.6 Q50 82 63.4 73.6', '#5a7fb8', 0.8), g);
      el('path', line('M40 75.4 L41.4 79 M45 77.4 L46 81 M55 77.4 L54 81 M60 75.4 L58.6 79', '#d9d4c8', 0.6), g);
      el('path', { d: 'M60.4 78.4 L66.6 76.2 L67.6 88 L63 88.6 Z', fill: tw, stroke: OL, 'stroke-width': 0.8 }, g); // たれた端
      el('path', line('M63.4 84.6 L67.2 84.2', '#5a7fb8', 0.7), g);
    }
  }

  // ---------- 髪 ----------
  function hairBack(g, c) {
    const p = c.p;
    if (p.hair === 'bob') {
      el('path', { d: 'M27 46 C24 26 33 14.5 50 14.5 C67 14.5 76 26 73 46 C73.5 53 75 58 73 61.5 C69 62.5 66 60.5 65 57 L35 57 C34 60.5 31 62.5 27 61.5 C25 58 26.5 53 27 46 Z', fill: c.hair, stroke: OL, 'stroke-width': 1.2 }, g);
      el('path', line('M28.6 52 Q28 57 30.6 60.4 M71.4 52 Q72 57 69.4 60.4', p.hairS, 0.7), g);
    }
  }

  function hairFront(g, c) {
    const p = c.p, col = c.hair, sh = p.hairS, hi = mix(p.hairC, '#ffffff', 0.55);
    const st = { stroke: OL, 'stroke-width': 1.2, 'stroke-linejoin': 'round' };
    const strands = (d, w, op) => el('path', line(d, sh, w || 0.65, { opacity: op == null ? 0.85 : op }), g);
    const shine = (d, w) => el('path', line(d, hi, w || 1.2, { opacity: 0.75 }), g);
    if (p.hair === 'whiteSide') {
      // 豊かな白髪。横分けで、ふんわり立ち上がる
      el('path', Object.assign({ d: 'M27 43 C24.5 30 27.5 18.5 38 13.5 C47 9.5 60 10 68.5 15 C75.5 19.5 77.5 30 74 43 C72.5 36.5 70.5 31.5 67 29 C63 26.5 58.5 26.5 54 25 C49.5 23.5 46 21.5 43.5 19.5 C41 24 36.5 27 33 29.5 C30 32 28.3 37 27 43 Z', fill: col }, st), g);
      strands('M43.5 19.5 C50 15 60 15 67 21 M45.2 21.6 C52 18.4 61 19.6 68.6 25 M41.6 17 C46 12.6 56 12 64 15 M50 23.4 C56 22 62 23.6 66.6 27.4');
      strands('M42.6 20 C38 22 33 26 30 33 M40 17.4 C35 19.6 30.6 24 28.6 31 M38.6 14.6 C33.6 17 29.6 22 28 27');
      shine('M47 14.2 C53 12.6 59 13.2 63 15');
      sym(g, (q) => el('path', { d: 'M28.6 38 C27.6 43 28 47 29.6 50.4 L31.2 50.2 C30.4 46 30.4 42 31 38 Z', fill: col, stroke: OL, 'stroke-width': 0.8 }, q));
    } else if (p.hair === 'neat') {
      el('path', Object.assign({ d: 'M29.5 40 C27.5 26 34 15 50 14.8 C65 14.6 72.8 24 70.6 39 C69.6 32 67 28 62.5 26.5 C55 24.5 47 25.5 41 22.6 C37.5 27.5 33 32 29.5 40 Z', fill: col }, st), g);
      strands('M41 22.6 C42 19 44 16.5 47 15.4', 0.9, 1);
      el('path', line('M42.6 21 C50 18.6 60 19.6 67.6 25.6 M44 18.6 C52 16 61 17.6 68 22.2 M47 24 C54 22.6 61 24 66 27.4', '#5a5050', 0.6, { opacity: 0.8 }), g);
      strands('M40 22.6 C36 26 32.6 31 30.6 36 M38.4 20.6 C34.6 23 31.6 27 30 31.6');
      shine('M51 16.4 C56.6 15.8 61.6 17 65 19.2', 1.1);
      sym(g, (q) => el('path', { d: 'M29.8 37.6 L30 44.4 L31.4 44.4 L31.6 37.6 Z', fill: col, stroke: OL, 'stroke-width': 0.7 }, q));
    } else if (p.hair === 'baldSides') {
      // 頭の横だけ残った髪
      sym(g, (q) => {
        el('path', { d: 'M27.6 46.6 C26 40 27.2 33.6 31.6 30 C31.8 33 31.2 36 32.2 38.6 C32.4 41.6 31.8 44 31.4 47 Z', fill: col, stroke: OL, 'stroke-width': 1 }, q);
        el('path', line('M28.6 44 C28 40 28.6 36 30.4 33 M30 45.4 C29.6 41.6 30.2 38 31.2 35', sh, 0.55), q);
      });
      if (!p.straw) {
        el('path', line('M44 19.6 C47 18 50 18.6 52.4 17.2 M50 18.8 C53 17.6 56 18 58.4 16.8', p.hairC, 0.8), g);
        el('ellipse', { cx: 44, cy: 22.4, rx: 5, ry: 2.4, fill: '#ffffff', opacity: 0.35, transform: 'rotate(-12 44 22.4)' }, g); // 頭のつや
      }
    } else if (p.hair === 'short') {
      el('path', Object.assign({ d: 'M28.8 40 C27.5 24 35.5 15.2 50 15.2 C64.5 15.2 72.5 24 71.2 40 C70 33 67.5 28.5 63.5 27 C58 25.2 53 26.6 48 25.6 C42.5 24.8 38 25.8 35 28.5 C31.8 31.2 30 35 28.8 40 Z', fill: col }, st), g);
      strands('M34 29 L32.6 26.4 M38 26.4 L37.4 23.8 M43 25.4 L42.8 22.8 M48 25.6 L48.4 23 M53.4 26.2 L54.2 23.6 M58.6 26 L59.6 23.6 M63.4 27 L64.8 24.8 M67 29.4 L68.8 27.6');
      shine('M42 18.4 C47 16.8 53 16.8 58 18.4', 1);
      sym(g, (q) => el('path', { d: 'M29 36.6 L29.2 45 L31 45 L31.4 36.6 Z', fill: col, stroke: OL, 'stroke-width': 0.7 }, q));
    } else if (p.hair === 'young') {
      el('path', Object.assign({ d: 'M28.5 42 C26.5 26 35 16 50 16 C65 16 73.5 26 71.5 42 C70.5 36 68.5 32 65.5 30.5 L64.5 34 L61 29.5 L58.5 33.5 L55.5 29 L52 33 L49.5 28.5 L46 32.6 L43.5 28.8 L40 32.4 L38 29.5 C33.5 32 30 36 28.5 42 Z', fill: col }, st), g);
      strands('M40 32 L41.6 27 M46 32.2 L46.8 27 M52 32.6 L51.6 27.4 M58.4 33 L57.4 28 M64.4 33.6 L62.8 29.4 M33.6 33.6 L35.6 29');
      sym(g, (q) => el('path', { d: 'M28.8 38 C28.2 42 28.6 45 29.8 47.6 L31.4 47 C30.8 44 30.8 41 31.4 38 Z', fill: col, stroke: OL, 'stroke-width': 0.7 }, q));
    } else if (p.hair === 'bob') {
      el('path', Object.assign({ d: 'M29 42 C28.5 25 37 17 50 17 C63 17 71.5 25 71 42 C69 35 66.5 31 62.5 28.8 C58 31.5 53 32.2 48 31.4 C43 30.6 39.5 31.5 36.5 33.5 C32.5 36 30.5 39 29 42 Z', fill: col }, st), g);
      strands('M62.5 28.8 C60 24 56 21 50 20 M58 31.4 C56.6 27 53.6 24 49 22.6 M48 31.4 C46.6 27.6 44 25 40 24 M40 32 C38 29.4 35.6 28 32.6 28.4');
      shine('M40 20.6 C45 18.6 52 18.4 57 19.8', 1.2);
      sym(g, (q) => {
        el('path', { d: 'M28.8 38 C27 46 27.4 53 30.6 58.4 L32.4 57.6 C30.6 52 30.6 45 31.4 38.6 Z', fill: col, stroke: OL, 'stroke-width': 0.8 }, q);
        el('path', line('M29.6 44 C29.2 49 29.8 53.6 31.4 57', sh, 0.5), q);
      });
    } else if (p.hair === 'grayShort') {
      el('path', Object.assign({ d: 'M28.8 40 C27.6 24 36 16.2 50 16.2 C64 16.2 72.4 24 71.2 40 C69.6 32 65 28 58 27.2 C52 26.6 46 27 41.5 27.4 C35 28.4 30.8 33 28.8 40 Z', fill: col }, st), g);
      // 短く刈った髪の、白と黒のまじり
      const dots = [[36, 24], [40, 21.4], [45, 19.6], [50, 19], [55, 19.6], [60, 21.4], [64, 24], [38, 26.4], [43, 24], [48, 23], [53, 23], [58, 24], [62, 26.6], [33.6, 28.6], [66.4, 28.6], [31.4, 33], [68.6, 33]];
      dots.forEach((d, i) => el('path', line('M' + d[0] + ' ' + d[1] + ' l' + (i % 2 ? 0.6 : -0.6) + ' -1.1', i % 3 ? sh : hi, 0.55), g));
      shine('M43 18.6 C47 17.6 53 17.6 57 18.6', 1);
      sym(g, (q) => el('path', { d: 'M29 36.6 L29.2 44.6 L31 44.6 L31.4 36.6 Z', fill: col, stroke: OL, 'stroke-width': 0.7 }, q));
    }
  }

  // ---------- 帽子・はちまき ----------
  function hat(g, c) {
    const p = c.p;
    if (p.cap) {
      const capG = grad(c.defs, c.id + 'cp', [[0, mix(p.cap, '#ffffff', 0.2)], [1, mix(p.cap, '#000000', 0.2)]]);
      const dark = mix(p.cap, '#000000', 0.32);
      el('path', { d: 'M27.4 31.4 C27.4 17 37 10.6 50 10.6 C63 10.6 72.6 17 72.6 31.4 Z', fill: capG, stroke: OL, 'stroke-width': 1.3 }, g);
      el('path', line('M50 10.8 V30.6 M38.6 13.4 Q35.2 22 36.2 31 M61.4 13.4 Q64.8 22 63.8 31', dark, 0.7, { opacity: 0.8 }), g); // はぎ目
      el('path', line('M39.6 14.4 Q36.6 22 37.4 30.6 M60.4 14.4 Q63.4 22 62.6 30.6', mix(p.cap, '#ffffff', 0.35), 0.45, { 'stroke-dasharray': '0.9 0.8' }), g);
      el('ellipse', { cx: 50, cy: 11, rx: 2.2, ry: 1, fill: dark, stroke: OL, 'stroke-width': 0.6 }, g);
      el('path', { d: 'M33 18 C36 14.4 42 12.8 46 12.8 C42 14.6 37.6 17.6 35.4 22 Z', fill: '#ffffff', opacity: 0.2 }, g);
      // 前のワッペン（葉っぱの印）
      el('rect', { x: 44, y: 19, width: 12, height: 7.2, rx: 1.6, fill: mix(p.cap, '#ffffff', 0.78), stroke: OL, 'stroke-width': 0.6 }, g);
      el('path', { d: 'M47 24.6 C47 21 50 19.8 53.2 20.4 C53 23.8 50.6 25 47 24.6 Z', fill: '#5f9d4c' }, g);
      el('path', line('M47.4 24.4 L52.4 20.8', '#ffffff', 0.4), g);
      // つば
      el('path', { d: 'M25 31.4 C35 27.6 65 27.6 76.6 31.8 C77.2 34.2 75 36.6 71 35.8 C61 33.2 39 33.2 30 35.4 C26.4 36 24.4 33.8 25 31.4 Z', fill: mix(p.cap, '#000000', 0.12), stroke: OL, 'stroke-width': 1.2 }, g);
      el('path', line('M27.6 33.4 C38 30.6 62 30.6 74 33.6', mix(p.cap, '#ffffff', 0.35), 0.45, { 'stroke-dasharray': '1 0.8' }), g);
    }
    if (p.straw) {
      // 麦わら帽子：編み目・赤いリボン
      const brim = rgrad(c.defs, c.id + 'sb', [[0, '#f2d78f'], [0.7, '#e3c272'], [1, '#c9a253']], 0.5, 0.45, 0.55);
      el('ellipse', { cx: 50, cy: 24.5, rx: 35, ry: 8.6, fill: brim, stroke: OL, 'stroke-width': 1.3 }, g);
      [[29, 6.8], [23, 5.4]].forEach((r) => el('ellipse', { cx: 50, cy: 24.5, rx: r[0], ry: r[1], fill: 'none', stroke: '#b98f45', 'stroke-width': 0.45, opacity: 0.8 }, g));
      for (let a = 0; a < 24; a++) {
        const t = (a / 24) * Math.PI * 2, x1 = 50 + Math.cos(t) * 31, y1 = 24.5 + Math.sin(t) * 7.6, x2 = 50 + Math.cos(t) * 34.4, y2 = 24.5 + Math.sin(t) * 8.4;
        el('path', line('M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' L' + x2.toFixed(1) + ' ' + y2.toFixed(1), '#b98f45', 0.4, { opacity: 0.7 }), g);
      }
      const crown = grad(c.defs, c.id + 'sc', [[0, '#f6e0a2'], [1, '#d8b462']], false);
      el('path', { d: 'M33 24.6 C33 12 40 7.4 50 7.4 C60 7.4 67 12 67 24.6 Z', fill: crown, stroke: OL, 'stroke-width': 1.3 }, g);
      [10.6, 13.4, 16.2, 19].forEach((y) => el('path', line('M' + (y < 12 ? 40 : 34.6) + ' ' + y + ' Q50 ' + (y - 1.6) + ' ' + (y < 12 ? 60 : 65.4) + ' ' + y, '#b98f45', 0.45, { opacity: 0.75 }), g));
      el('path', { d: 'M33.4 20.2 Q50 24.4 66.6 20.2 L66.9 23.4 Q50 27.6 33.1 23.4 Z', fill: '#c94a3c', stroke: OL, 'stroke-width': 0.6 }, g);
      el('path', line('M34 21.6 Q50 25.4 66 21.6', '#e27a6a', 0.5), g);
      el('path', { d: 'M60 10 C64 11.6 66 16 66.4 20 L63.6 20.8 C63.4 16.4 62 13 60 10 Z', fill: '#000000', opacity: 0.08 }, g);
    }
    if (p.headband) {
      // はちまき（横で結ぶ）
      el('path', { d: 'M28.6 30 Q50 22.6 71.4 30 L71.4 34.4 Q50 27.4 28.6 34.4 Z', fill: p.headband, stroke: OL, 'stroke-width': 1 }, g);
      el('path', line('M30 32.2 Q50 25.4 70 32.2', '#d9d4c8', 0.5), g);
      el('path', { d: 'M70.6 30.4 L76.4 27.2 L76.8 31 L72 33.6 Z M71 33.4 L75.4 37.4 L72.6 38.4 L70.2 34.6 Z', fill: p.headband, stroke: OL, 'stroke-width': 0.8, 'stroke-linejoin': 'round' }, g);
      el('ellipse', { cx: 71.4, cy: 32.4, rx: 1.6, ry: 2, fill: p.headband, stroke: OL, 'stroke-width': 0.8 }, g);
    }
    if (p.towel) {
      // 頭の手ぬぐい（豆しぼりの点）
      el('path', { d: 'M28.4 31.4 Q50 23.6 71.6 31.4 L71.4 36.4 Q50 29.2 28.6 36.4 Z', fill: p.towel, stroke: OL, 'stroke-width': 1 }, g);
      [[33, 31.6], [38, 29.6], [43, 28.4], [48, 28], [53, 28], [58, 28.6], [63, 29.8], [68, 31.8], [35.6, 33.6], [45.6, 31.2], [55.6, 31.2], [65.6, 33.6]].forEach((q) => el('circle', { cx: q[0], cy: q[1], r: 0.7, fill: '#4a6fa8' }, g));
      el('path', { d: 'M28.6 33 L24.4 30 L24 34.6 L28.4 36.2 Z', fill: p.towel, stroke: OL, 'stroke-width': 0.8, 'stroke-linejoin': 'round' }, g);
    }
  }
})(window.RG = window.RG || {});
