// 登場人物のイラスト（SVG で描く。画像ファイルは使わない）
// 顔の形・髪・眉・目・口・服・小物の組み合わせで、一人ひとりを描き分ける。
// 顔はすっきり簡単に、服や帽子はえり・縫い目・ポケット・編み目まで描く
(function (RG) {
  'use strict';
  const PT = RG.portrait = {};
  const NS = 'http://www.w3.org/2000/svg';
  const OL = '#3a2a22'; // 線の色

  // ---------- 人物の設定 ----------
  PT.PEOPLE = {
    // 幼なじみの遥さん：黒髪のボブ、明るい笑顔。サーモン色のカーディガン
    haruka: { bg: ['#f8eaf1', '#edd0df'], skin: '#f6d3b3', shade: '#e2b18b', head: 'oval', hair: 'bob', hairC: '#2b211c', hairS: '#16100c',
      brows: 'thin', browC: '#2b211c', eyes: 'open', mouth: 'smile', cheeks: true, cloth: 'cardigan', clothC: '#e08e6d', clothS: '#c47456', shirt: '#fff7ee' },
    // 30代後半の営農指導員。短い黒髪、目を細めて笑う、話好きの先生。作業服に名札とペン
    takahashi: { bg: ['#e8f1e4', '#cfe3c6'], skin: '#f4cfa8', shade: '#dfac82', head: 'square', hair: 'short', hairC: '#2e2620', hairS: '#17120e',
      brows: 'normal', browC: '#2e2620', eyes: 'smile', mouth: 'talk', cheeks: true,
      cloth: 'work', clothC: '#8f9f86', clothS: '#6f8066', shirt: '#ffffff', pen: true, badge: true },
    // 金融機関の木村さん：きちんと分けた黒髪、細い眉、黒ぶちめがね。紺のスーツ
    kimura: { bg: ['#e6ecf5', '#c9d6ea'], skin: '#f3cfab', shade: '#ddb08a', head: 'oval', hair: 'neat', hairC: '#2f2a2a', hairS: '#141111',
      brows: 'thin', browC: '#2f2a2a', eyes: 'open', glasses: '#2f2f3a', mouth: 'smile', cloth: 'suit', clothC: '#2f3d5c', clothS: '#1f2b45', shirt: '#ffffff', tie: '#b23a3a' },
    // 地主の佐藤さん：頭の横だけ白髪、おでこのしわ。茶色のカーディガン
    sato: { bg: ['#f3ebdc', '#e5d5b5'], skin: '#efc39b', shade: '#d6a179', head: 'oval', hair: 'baldSides', hairC: '#c9c9c4', hairS: '#9a9a95',
      brows: 'bushy', browC: '#d9d9d4', eyes: 'smile', mouth: 'smile', wrinkles: true, cheeks: true,
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
      brows: 'thin', browC: '#5a3a26', eyes: 'open', mouth: 'smile', cheeks: true, cloth: 'apron', clothC: '#5f9d4c', clothS: '#4a8239', shirt: '#f4efe2', straw: true },
    // じいちゃん：麦わら帽子に首のタオル。白い太い眉とひげ、目尻を下げて笑う。藍色の野良着
    jiichan: { bg: ['#fbf1d8', '#f1dca8'], skin: '#e8b88c', shade: '#cc966a', head: 'round', hair: 'baldSides', hairC: '#f0efea', hairS: '#c4c3bd',
      brows: 'bushy', browC: '#f4f3ee', eyes: 'smile', mouth: 'smile', mustache: '#f4f3ee', wrinkles: true, cheeks: true,
      cloth: 'work', clothC: '#3f5583', clothS: '#2f4268', shirt: '#e9e4d6', neckTowel: '#ffffff', straw: true },
    // 区長の中山さん：丸めがねの世話役。白髪まじりの短髪、ベスト姿
    kucho: { bg: ['#eef3e2', '#d7e4bd'], skin: '#efc39b', shade: '#d6a179', head: 'square', hair: 'grayShort', hairC: '#c9c8c2', hairS: '#9a9993',
      brows: 'thick', browC: '#8f8e88', eyes: 'smile', mouth: 'smile', wrinkles: true, cheeks: true, glasses: '#6a4a2a',
      cloth: 'vest', clothC: '#6f7f3f', clothS: '#56652f', shirt: '#f3efe3' },
    // ベテラン社員の山根さん：日焼けした頑固な現場の人。会社の帽子と作業服
    yamane: { bg: ['#e4ebf2', '#c3d3e2'], skin: '#d9a278', shade: '#bb835b', head: 'square', hair: 'short', hairC: '#55524d', hairS: '#33312e',
      brows: 'thick', browC: '#3a3834', eyes: 'open', mouth: 'flat', wrinkles: true, stubble: true,
      cloth: 'work', clothC: '#4f6f8f', clothS: '#3d5874', shirt: '#e6e9ec', cap: '#2f4f6f' },
    // 近所の田村さん：頭に手ぬぐい、灰色の作業服
    tamura: { bg: ['#eaeef1', '#d2dbe1'], skin: '#ecbf96', shade: '#d39e74', head: 'oval', hair: 'grayShort', hairC: '#8d8d8a', hairS: '#62625f',
      brows: 'normal', browC: '#777774', eyes: 'smile', mouth: 'smile', wrinkles: true, cloth: 'work', clothC: '#6f8597', clothS: '#566b7c', shirt: '#dfe3e6', towel: '#ffffff' },
    // 集落法人の石井さん：白髪まじりの短髪、法人の帽子と緑の作業服に名札。しっかり者の代表
    ishii: { bg: ['#e6f2ea', '#c6e2cf'], skin: '#ebbd93', shade: '#d09d72', head: 'square', hair: 'grayShort', hairC: '#a9a8a2', hairS: '#7d7c77',
      brows: 'thick', browC: '#6d6c67', eyes: 'open', mouth: 'smile', wrinkles: true, cloth: 'work', clothC: '#3f7a52', clothS: '#2f6040', shirt: '#eef2ec', badge: true, cap: '#2f6040' },
    // 営農組合の西川さん：頭の横だけ白髪、めがね。紺のベストの世話好きな組合長
    nishikawa: { bg: ['#ece8f4', '#d6cde8'], skin: '#efc39b', shade: '#d6a179', head: 'round', hair: 'baldSides', hairC: '#dcdcd6', hairS: '#a9a9a3',
      brows: 'bushy', browC: '#cfcfc9', eyes: 'smile', mouth: 'talk', wrinkles: true, cheeks: true, glasses: '#4a4a52',
      cloth: 'vest', clothC: '#34466e', clothS: '#26365a', shirt: '#f1ece0' },
    // 新規就農の林さん：短い前髪にはちまき、チェックのシャツ
    hayashi: { bg: ['#e4f1f6', '#c4e1ec'], skin: '#f4cfa9', shade: '#dfac82', head: 'oval', hair: 'young', hairC: '#2b2420', hairS: '#16110e',
      brows: 'normal', browC: '#2b2420', eyes: 'open', mouth: 'grin', cheeks: true, cloth: 'overall', clothC: '#5c7f9e', clothS: '#47677f', shirt: '#eae4d4', plaid: '#3f8f8a', headband: '#2e6fb0' },
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

  let uid = 0;

  PT.svg = function (who, size, opts) {
    const p = PT.PEOPLE[who];
    if (!p) return null;
    opts = opts || {};
    const id = 'pt' + (++uid);
    const s = el('svg', { viewBox: '0 0 100 100', width: size || 64, height: size || 64, class: 'portrait' + (opts.talk ? ' talking' : ''), role: 'img', 'aria-label': opts.label || '' });
    const defs = el('defs', {}, s);
    const cp = el('clipPath', { id: id + 'c' }, defs); el('circle', { cx: 50, cy: 50, r: 50 }, cp);
    const ctx = { id, defs, p, cloth: grad(defs, id + 'w', [[0, mix(p.clothC, '#ffffff', 0.12)], [1, p.clothS]]) };
    const g = el('g', { 'clip-path': 'url(#' + id + 'c)' }, s);
    background(g, ctx);
    // 体と服（えり・縫い目・ポケットまで描く）
    body(g, ctx);
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
    if (p.mustache) el('path', { d: 'M39 50 Q44 45.5 50 48 Q56 45.5 61 50 Q56 51.5 50 50.2 Q44 51.5 39 50 Z', fill: p.mustache, stroke: OL, 'stroke-width': 1 }, g);
    if (p.glasses) {
      el('rect', { x: 34.5, y: 35, width: 12.5, height: 9, rx: 3.5, fill: 'rgba(255,255,255,.18)', stroke: p.glasses, 'stroke-width': 1.5 }, g);
      el('rect', { x: 53, y: 35, width: 12.5, height: 9, rx: 3.5, fill: 'rgba(255,255,255,.18)', stroke: p.glasses, 'stroke-width': 1.5 }, g);
      el('path', { d: 'M47 39 h6 M34.5 38 l-5 -1 M65.5 38 l5 -1', stroke: p.glasses, 'stroke-width': 1.4, fill: 'none' }, g);
    }
    // 前髪・帽子など
    hairFront(g, p);
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

  // ---------- 髪・顔の部品 ----------
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
    } else if (p.mouth === 'flat') {
      el('path', { d: 'M44 53.5 Q50 52.5 56 53.5', fill: 'none', stroke: OL, 'stroke-width': 1.9, 'stroke-linecap': 'round' }, g);
    } else if (p.mouth === 'grin') {
      el('path', { d: 'M42.5 51 Q50 50 57.5 51 Q55.5 57.5 50 57.5 Q44.5 57.5 42.5 51 Z', fill: '#fff', stroke: OL, 'stroke-width': 1.2 }, g);
    } else {
      el('path', { d: 'M43.5 52 Q50 57 56.5 52', fill: 'none', stroke: OL, 'stroke-width': 1.8, 'stroke-linecap': 'round' }, g);
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
