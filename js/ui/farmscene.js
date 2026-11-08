// シーズン画面の風景：月ごとに田んぼの様子が変わる（雪 → 雪どけ → 田起こし・代かき → 田植え → 青田 → 出穂 → 黄金 → 稲刈り → 秋起こし）
// 動かない部分（空・山・集落・田んぼ）は月と大きさが変わったときだけ描いておき、毎フレームは雲・手前の稲・機械・雪や雨だけを描く
(function (RG) {
  'use strict';
  const FS = RG.farmScene = {};

  // 月ごとの様子
  // ground：snow 雪 / melt 雪どけ / till 田起こし・代かき / plant 田植え / young 植えたばかりの青田 / green 青田 / head 出穂 / gold 黄金 / stubble 稲刈りのあと / plow 秋起こし
  const MONTH = {
    1: { sky: ['#9fb2c8', '#dfe6ee'], ground: 'snow', mtn: 'winter', sun: false },
    2: { sky: ['#a7bbd0', '#e4ebf2'], ground: 'snow', mtn: 'winter', sun: false },
    3: { sky: ['#86b4dc', '#dbe9f3'], ground: 'melt', mtn: 'early', sun: true },
    4: { sky: ['#6eaee3', '#d9ecf8'], ground: 'till', mtn: 'spring', sun: true },
    5: { sky: ['#57a6e6', '#d3ebfa'], ground: 'plant', mtn: 'spring', sun: true },
    6: { sky: ['#7c9fbf', '#d3dee6'], ground: 'young', mtn: 'summer', sun: false },
    7: { sky: ['#3b97e0', '#c6e6f8'], ground: 'green', mtn: 'summer', sun: true },
    8: { sky: ['#3a92dc', '#f3e6c4'], ground: 'head', mtn: 'summer', sun: true },
    9: { sky: ['#5aa2dc', '#f6e2b2'], ground: 'gold', mtn: 'late', sun: true },
    10: { sky: ['#77acd9', '#f3dfb8'], ground: 'stubble', mtn: 'autumn', sun: true },
    11: { sky: ['#93a8bd', '#e6ddd0'], ground: 'plow', mtn: 'autumn', sun: true },
    12: { sky: ['#a3b3c5', '#e5eaf0'], ground: 'snow', mtn: 'winter', sun: false, light: true },
  };
  const LABEL = { snow: '雪の田んぼ', melt: '雪どけ', till: '田起こし・代かき', plant: '田植え', young: '植えたばかりの青田', green: '青々と育つ稲',
    head: '穂が出た', gold: '黄金色の田んぼ', stubble: '稲刈りのあと・はさがけ', plow: '秋起こし' };
  FS.label = (m) => LABEL[MONTH[m].ground];

  // ---------- 小さな道具 ----------
  function rnd(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const hex = (c) => (c[0] === '#' ? [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)] : c.match(/\d+/g).slice(0, 3).map(Number)); // '#rrggbb' か 'rgb(r,g,b)'
  function mix(a, b, t) { const x = hex(a), y = hex(b); return 'rgb(' + x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',') + ')'; }
  function shade(c, k) { return k >= 0 ? mix(c, '#ffffff', k) : mix(c, '#000000', -k); }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const TOUCH = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); // スマホは絵の細かさを少し下げる

  FS.mount = function (canvas, getMonth, opts) {
    opts = opts || {};
    canvas._alive = true;
    const ctx = canvas.getContext('2d');
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let W = 0, H = 0, dpr = 1, raf = 0, bg = null, bgKey = '', last = -1e9;
    const t0 = performance.now();
    const flakes = Array.from({ length: 70 }, (_, i) => ({ x: (i * 97) % 1000 / 1000, y: (i * 61) % 1000 / 1000, s: 0.6 + (i % 5) * 0.3, v: 0.3 + (i % 7) * 0.08 }));

    function size() {
      const nd = Math.min(TOUCH ? 1.5 : 2, window.devicePixelRatio || 1), nW = canvas.clientWidth, nH = canvas.clientHeight;
      // 大きさが変わっていなければ描き直さない（スマホでアドレスバーが出入りするたびに絵が消えて点滅しないように）
      if (nW === W && nH === H && nd === dpr && canvas.width) return;
      dpr = nd; W = nW; H = nH;
      if (!W || !H) return;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bgKey = '';
    }

    // ---------- 遠近：奥行き Z（1 が画面の下端）と横位置 X から画面の位置へ ----------
    const hz = () => Math.round(H * 0.4);
    const VX = () => W * 0.46;
    const S = () => Math.max(W * 0.55, (H - hz()) * 2.4);
    const sy = (Z) => hz() + (H - hz()) / Z;
    const sx = (X, Z) => VX() + X * S() / Z;

    // ---------- 山の稜線 ----------
    // 新潟の田んぼの向こうに見える、なだらかな里山（細かいギザギザは入れない）
    function ridge(x, base, amp, seed) {
      const n = 0.62 * Math.sin(x * 0.0045 + seed) + 0.28 * Math.sin(x * 0.0115 + seed * 2.3) + 0.1 * Math.sin(x * 0.026 + seed * 4.1);
      return base - amp * (0.5 + 0.5 * n);
    }
    function mountainPath(c, base, amp, seed) {
      c.beginPath(); c.moveTo(0, base + 4);
      for (let x = 0; x <= W + 6; x += 4) c.lineTo(x, ridge(x, base, amp, seed));
      c.lineTo(W, base + 4); c.closePath();
    }

    // ---------- 動かない部分を描く ----------
    function buildBg(m) {
      const M = MONTH[m], g0 = M.ground;
      const c = document.createElement('canvas');
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
      const g = c.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const h0 = hz(), R = rnd(m * 7919 + 13);
      const haze = M.sky[1];

      // 空
      let gr = g.createLinearGradient(0, 0, 0, h0);
      gr.addColorStop(0, M.sky[0]); gr.addColorStop(1, M.sky[1]);
      g.fillStyle = gr; g.fillRect(0, 0, W, h0 + 2);
      if (M.sun) {
        const sxp = W * 0.84, syp = H * 0.13;
        const rg = g.createRadialGradient(sxp, syp, 2, sxp, syp, 70);
        rg.addColorStop(0, m >= 8 && m <= 10 ? 'rgba(255,236,190,.95)' : 'rgba(255,250,225,.95)'); rg.addColorStop(0.18, 'rgba(255,245,210,.55)'); rg.addColorStop(1, 'rgba(255,245,210,0)');
        g.fillStyle = rg; g.fillRect(0, 0, W, h0);
        g.fillStyle = '#fffbe8'; g.beginPath(); g.arc(sxp, syp, 9, 0, 7); g.fill();
      }

      // 遠くの山（青くかすむ。冬〜5月は頂に雪）。夕暮れの場面は、タイトル画面と同じ夕焼けの色
      const dusk = !!(opts.dusk && opts.dusk());
      const farBase = h0 - 6, farAmp = H * 0.19;
      gr = g.createLinearGradient(0, farBase - farAmp, 0, farBase);
      if (dusk) { gr.addColorStop(0, '#9b7a8c'); gr.addColorStop(1, '#d7a07e'); }
      else { const fc = M.mtn === 'winter' ? '#8e9db0' : mix('#7f95ad', haze, 0.35); gr.addColorStop(0, shade(fc, -0.08)); gr.addColorStop(1, mix(fc, haze, 0.45)); }
      g.fillStyle = gr; mountainPath(g, farBase, farAmp, 1.7); g.fill();
      if (m <= 5 || m === 12) {
        const deep = m <= 2 || m === 12 ? 0.42 : m <= 4 ? 0.3 : 0.16;
        g.fillStyle = 'rgba(250,252,255,.92)'; g.beginPath();
        for (let x = 0; x <= W + 6; x += 4) g.lineTo(x, ridge(x, farBase, farAmp, 1.7));
        for (let x = W + 6; x >= 0; x -= 4) g.lineTo(x, Math.max(ridge(x, farBase, farAmp, 1.7), farBase - farAmp * (1 - deep) + 2.5 * Math.sin(x * 0.035) + 1.2 * Math.sin(x * 0.08)));
        g.closePath(); g.fill();
      }
      // 手前の山（季節の色と、木の粒々）
      const midBase = h0 - 2, midAmp = H * 0.1;
      const mtnCol = { winter: '#b7c1cc', early: '#7f927a', spring: '#86ad6c', summer: '#4d7d47', late: '#5f7d45', autumn: '#8a6b3f' }[M.mtn];
      // 上は濃く、ふもとはかすんで明るく（岩のように見えないよう、なめらかな色の移り変わりに）
      gr = g.createLinearGradient(0, midBase - midAmp, 0, midBase);
      if (dusk) { gr.addColorStop(0, '#6d5670'); gr.addColorStop(1, '#b9846f'); }
      else { gr.addColorStop(0, shade(mtnCol, -0.12)); gr.addColorStop(1, mix(mtnCol, haze, 0.4)); }
      g.fillStyle = gr; mountainPath(g, midBase, midAmp, 4.2); g.fill();
      g.save(); mountainPath(g, midBase, midAmp, 4.2); g.clip();
      const dots = M.mtn === 'winter' ? ['#6f7b86', '#8d98a3', '#f4f7fa', '#ffffff'] : M.mtn === 'autumn' ? ['#b5532c', '#c98a2e', '#6d5a32', '#9b3c24', '#7a6a3a']
        : M.mtn === 'late' ? ['#4f6f3a', '#7a8a3e', '#a8862e'] : M.mtn === 'early' ? ['#6f7558', '#a2a088', '#e9ecef'] : M.mtn === 'spring' ? ['#a6c97f', '#6e9a55', '#c9dc9a'] : ['#3f6c3a', '#5e8e4f', '#2f5a2c'];
      // 木々のこんもりした重なり（やわらかく、うすく）
      for (let i = 0; i < (dusk ? 0 : W * 0.9); i++) { // 夕暮れは山がシルエットになるので、木の粒は描かない
        const x = R() * W, top = ridge(x, midBase, midAmp, 4.2), y = top + 2 + R() * (midBase - top);
        g.fillStyle = dots[(R() * dots.length) | 0]; g.globalAlpha = 0.28;
        g.beginPath(); g.arc(x, y, 2 + R() * 3, 0, 7); g.fill();
      }
      g.globalAlpha = 1; g.restore();
      // 山すそのかすみ
      gr = g.createLinearGradient(0, h0 - H * 0.12, 0, h0);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, haze);
      g.fillStyle = gr; g.globalAlpha = 0.55; g.fillRect(0, h0 - H * 0.12, W, H * 0.12); g.globalAlpha = 1;

      // 集落と木立（地平線の上）
      village(g, m, M, R);

      // 田んぼ
      paddies(g, m, M, R);

      // 遠くの田をかすませる
      gr = g.createLinearGradient(0, h0, 0, h0 + (H - h0) * 0.4);
      gr.addColorStop(0, haze); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.globalAlpha = 0.45; g.fillStyle = gr; g.fillRect(0, h0, W, (H - h0) * 0.4); g.globalAlpha = 1;

      // 動かない添え物：はさがけ・白鷺・雪の手前
      if (g0 === 'stubble') hasa(g);
      if (g0 === 'young' || g0 === 'green') egrets(g);
      if (g0 === 'snow') {
        gr = g.createLinearGradient(0, H * 0.86, 0, H);
        gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(250,252,255,.95)');
        g.fillStyle = gr; g.fillRect(0, H * 0.86, W, H * 0.14);
      }
      return c;
    }

    function village(g, m, M, R) {
      const h0 = hz(), winter = M.ground === 'snow';
      // 木立（スギと広葉樹）
      const treeCol = winter ? ['#5d6a5f', '#7d877e'] : M.mtn === 'autumn' ? ['#6f6a3a', '#9a6a32', '#4f5f35'] : M.mtn === 'spring' ? ['#5f8f4a', '#86b064'] : ['#2f5a2e', '#3f6e38'];
      const groves = [[0.02, 0.2], [0.55, 0.12], [0.68, 0.16], [0.9, 0.12]];
      groves.forEach(([a, w]) => {
        for (let i = 0; i < W * w / 3; i++) {
          const x = W * a + R() * W * w, hgt = 6 + R() * 12;
          g.fillStyle = treeCol[(R() * treeCol.length) | 0];
          if (R() < 0.45) { g.beginPath(); g.moveTo(x, h0 - hgt - 4); g.lineTo(x - 3.5, h0 + 1); g.lineTo(x + 3.5, h0 + 1); g.fill(); } // スギ
          else { g.beginPath(); g.arc(x, h0 - hgt * 0.45, 3 + R() * 4, 0, 7); g.fill(); }
          if (winter && R() < 0.6) { g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(x, h0 - hgt * 0.5 - 2, 2, 0, 7); g.fill(); }
        }
      });
      // 家と作業小屋
      const houses = [[0.1, 26, '#e7e1d3', '#4b5866'], [0.19, 20, '#cfc2a6', '#7c3a2c'], [0.6, 22, '#e9e4d8', '#3f5d7c'], [0.74, 16, '#a88a62', '#5a5a5a']];
      houses.forEach(([a, w, wall, roof]) => {
        const x = W * a, y = h0 + 1, hh = w * 0.42, rh = w * 0.32;
        g.fillStyle = shade(wall, -0.18); g.fillRect(x + w * 0.62, y - hh, w * 0.38, hh); // 妻側の影
        g.fillStyle = wall; g.fillRect(x, y - hh, w * 0.62, hh);
        g.fillStyle = 'rgba(60,50,40,.55)'; for (let k = 0; k < 2; k++) g.fillRect(x + 3 + k * w * 0.26, y - hh * 0.62, w * 0.12, hh * 0.32); // 窓
        g.fillStyle = winter ? '#f4f7fa' : roof;
        g.beginPath(); g.moveTo(x - 2, y - hh); g.lineTo(x + w * 0.62, y - hh); g.lineTo(x + w * 0.81, y - hh - rh); g.lineTo(x + w * 0.2, y - hh - rh); g.closePath(); g.fill();
        g.fillStyle = winter ? '#dfe7ef' : shade(roof, -0.2);
        g.beginPath(); g.moveTo(x + w * 0.62, y - hh); g.lineTo(x + w + 1, y - hh); g.lineTo(x + w * 0.81, y - hh - rh); g.closePath(); g.fill();
      });
      // 電柱と電線
      g.strokeStyle = 'rgba(60,55,50,.75)'; g.lineWidth = 1;
      const poles = [0.3, 0.42, 0.52].map((a) => W * a);
      poles.forEach((x) => { g.beginPath(); g.moveTo(x, h0 + 2); g.lineTo(x, h0 - 22); g.moveTo(x - 3, h0 - 20); g.lineTo(x + 3, h0 - 20); g.stroke(); });
      g.strokeStyle = 'rgba(60,55,50,.35)'; g.lineWidth = 0.6;
      for (let i = 0; i < poles.length - 1; i++) { g.beginPath(); g.moveTo(poles[i], h0 - 20); g.quadraticCurveTo((poles[i] + poles[i + 1]) / 2, h0 - 16, poles[i + 1], h0 - 20); g.stroke(); }
    }

    // ---------- 田んぼ ----------
    const BANDS = [0.86, 1.22, 1.72, 2.55, 3.9, 6.2, 10.5, 19, 38, 80];
    function plotsList(R) {
      const out = [];
      for (let b = 0; b < BANDS.length - 1; b++) {
        const Za = BANDS[b], Zb = BANDS[b + 1];
        const reach = (W / S()) * Zb * 0.62 + 1.6;
        let X = -reach - R() * 1.3;
        while (X < reach) {
          const w = 1.05 + R() * 0.55;
          out.push({ b, Za, Zb, Xl: X, Xr: X + w, r: R() });
          X += w;
        }
      }
      return out;
    }
    function poly(g, p) {
      g.beginPath();
      g.moveTo(sx(p.Xl, p.Za), sy(p.Za)); g.lineTo(sx(p.Xr, p.Za), sy(p.Za));
      g.lineTo(sx(p.Xr, p.Zb), sy(p.Zb)); g.lineTo(sx(p.Xl, p.Zb), sy(p.Zb)); g.closePath();
    }
    // 区画の中の「列」（奥へまっすぐ伸びる線）。間隔が細かすぎるときは描かない
    function rows(g, p, dx, fn) {
      const span = Math.abs(sx(p.Xr, p.Za) - sx(p.Xl, p.Za));
      const n = Math.floor((p.Xr - p.Xl) / dx);
      if (span / Math.max(1, n) < 1.6) return;
      for (let i = 1; i < n; i++) { const X = p.Xl + i * dx; fn(sx(X, p.Za), sy(p.Za), sx(X, p.Zb), sy(p.Zb), X); }
    }
    function along(p, X, dz, fn) { // 列に沿って点を打つ（手前ほど間隔が広い）
      for (let Z = p.Za + dz * 0.5; Z < p.Zb; Z += dz * Z) { const y = sy(Z); fn(sx(X, Z), y, 1 / Z); if (sy(Z) - sy(Z + dz * Z) < 1.2) break; }
    }
    function plotKind(g0, p) {
      if (g0 === 'till') return p.r < 0.55 ? 'water' : 'soil';
      if (g0 === 'plant') return p.r < 0.72 ? 'seedling' : 'water';
      if (g0 === 'gold') return p.r < 0.14 ? 'stubble' : 'gold';
      if (g0 === 'stubble') return p.r < 0.12 ? 'gold' : 'stubble';
      if (g0 === 'plow') return p.r < 0.6 ? 'plow' : 'stubble';
      return g0;
    }
    function paddies(g, m, M, R) {
      const h0 = hz(), list = plotsList(R);
      const BASE = {
        snow: ['#f2f5f9', '#e2e9f0'], melt: ['#7d6247', '#6a5139'], soil: ['#7c5d3f', '#684b31'], water: ['#9fc3dc', '#6f97b4'], seedling: ['#94b9cf', '#6b93ad'],
        young: ['#86ad84', '#5e8c52'], green: ['#6e9f52', '#3f7b2e'], head: ['#7fa443', '#557f2c'], gold: ['#e3b445', '#c8902a'], stubble: ['#cdb985', '#ad9561'],
        plow: ['#6f5138', '#55391f'],
      };
      const waters = []; // 水を張った田（あとで空と山を映す）
      list.forEach((p) => {
        const kind = plotKind(M.ground, p), far = clamp((p.Za - 1) / 28, 0, 1);
        const base = BASE[kind];
        const y0 = sy(p.Zb), y1 = sy(p.Za);
        const gr = g.createLinearGradient(0, y0, 0, y1);
        const vary = (p.r - 0.5) * 0.12;
        gr.addColorStop(0, mix(shade(base[0], vary), M.sky[1], far * 0.55 + 0.1));
        gr.addColorStop(1, mix(shade(base[1], vary), M.sky[1], far * 0.45));
        poly(g, p); g.fillStyle = gr; g.fill();
        if (kind === 'water' || kind === 'seedling') waters.push(p);
        p.kind = kind;
      });
      // 水を張った田に、空と山が映る
      // 古いスマホでも動くように、Path2D を使わず1つの道筋にまとめて切り抜く
      g.save(); g.beginPath();
      waters.forEach((p) => { g.moveTo(sx(p.Xl, p.Za), sy(p.Za)); g.lineTo(sx(p.Xr, p.Za), sy(p.Za)); g.lineTo(sx(p.Xr, p.Zb), sy(p.Zb)); g.lineTo(sx(p.Xl, p.Zb), sy(p.Zb)); g.closePath(); });
      g.clip();
      g.save(); g.translate(0, h0 * 2); g.scale(1, -1);
      const gr = g.createLinearGradient(0, h0 - H * 0.3, 0, h0);
      gr.addColorStop(0, M.sky[0]); gr.addColorStop(1, M.sky[1]);
      g.globalAlpha = 0.45; g.fillStyle = gr; g.fillRect(0, 0, W, h0);
      g.globalAlpha = 0.35; g.fillStyle = '#6f8aa3'; mountainPath(g, h0 - 6, H * 0.25, 1.7); g.fill();
      g.fillStyle = M.mtn === 'spring' ? '#6f9a5c' : '#4d7d47'; mountainPath(g, h0 - 2, H * 0.13, 4.2); g.fill();
      g.restore(); g.globalAlpha = 1; g.restore();

      // 区画ごとの模様
      list.forEach((p) => {
        const k = p.kind, near = 1 / p.Za;
        g.save(); poly(g, p); g.clip();
        if (k === 'snow') {
          // 雪から少しだけ出ている切り株
          if (!M.light) g.globalAlpha = 0.25;
          g.fillStyle = '#9a8d74';
          rows(g, p, 0.16, (x0, y0, x1, y1, X) => along(p, X, 0.06, (x, y, s) => { if (R() < (M.light ? 0.7 : 0.25)) g.fillRect(x, y - 1.2 * s * 3, 0.8, 1.2 * s * 3); }));
          g.globalAlpha = 1;
        } else if (k === 'melt') {
          g.fillStyle = 'rgba(246,249,252,.92)';
          for (let i = 0; i < 9; i++) { const X = p.Xl + R() * (p.Xr - p.Xl), Z = p.Za + R() * (p.Zb - p.Za); const w = (0.1 + R() * 0.28) * S() / Z; g.beginPath(); g.ellipse(sx(X, Z), sy(Z), w, w * 0.18, 0, 0, 7); g.fill(); }
        } else if (k === 'soil' || k === 'plow') {
          rows(g, p, k === 'plow' ? 0.09 : 0.12, (x0, y0, x1, y1) => { g.strokeStyle = 'rgba(40,25,10,.35)'; g.lineWidth = Math.max(0.5, near * 1.6); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
            g.strokeStyle = 'rgba(170,135,95,.35)'; g.lineWidth = Math.max(0.4, near * 0.8); g.beginPath(); g.moveTo(x0 + near * 2, y0); g.lineTo(x1, y1); g.stroke(); });
        } else if (k === 'water') {
          g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 0.7;
          for (let i = 0; i < 3; i++) { const Z = p.Za + R() * (p.Zb - p.Za), X = p.Xl + R() * (p.Xr - p.Xl - 0.4); g.beginPath(); g.moveTo(sx(X, Z), sy(Z)); g.lineTo(sx(X + 0.3, Z), sy(Z)); g.stroke(); }
        } else if (k === 'seedling') {
          g.fillStyle = '#5f9a3a';
          rows(g, p, 0.1, (x0, y0, x1, y1, X) => along(p, X, 0.05, (x, y, s) => { const hh = Math.max(0.8, s * 6); g.fillRect(x - Math.max(0.5, s), y - hh, Math.max(0.8, s * 2), hh); }));
        } else if (k === 'young') {
          rows(g, p, 0.1, (x0, y0, x1, y1, X) => along(p, X, 0.05, (x, y, s) => { const hh = Math.max(1, s * 10); g.fillStyle = '#4f8f36'; g.beginPath(); g.moveTo(x - s * 2.5, y); g.lineTo(x, y - hh); g.lineTo(x + s * 2.5, y); g.fill(); }));
        } else if (k === 'green' || k === 'head' || k === 'gold') {
          const lines = { green: ['rgba(30,80,20,.35)', 'rgba(150,200,110,.25)'], head: ['rgba(40,75,20,.32)', 'rgba(205,205,110,.25)'], gold: ['rgba(140,85,15,.3)', 'rgba(255,225,130,.35)'] }[k];
          rows(g, p, 0.1, (x0, y0, x1, y1) => { g.strokeStyle = lines[0]; g.lineWidth = Math.max(0.5, near * 2.2); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); });
          // 穂波のムラ
          for (let i = 0; i < 5; i++) { const X = p.Xl + R() * (p.Xr - p.Xl), Z = p.Za + R() * (p.Zb - p.Za); const w = (0.3 + R() * 0.5) * S() / Z; g.fillStyle = lines[1]; g.beginPath(); g.ellipse(sx(X, Z), sy(Z), w, w * 0.2, 0, 0, 7); g.fill(); }
          if (k !== 'green') { // 手前の田は、穂の粒々
            g.fillStyle = k === 'gold' ? 'rgba(250,215,110,.7)' : 'rgba(215,215,120,.6)';
            if (p.Za < 3) rows(g, p, 0.1, (x0, y0, x1, y1, X) => along(p, X, 0.04, (x, y, s) => { g.beginPath(); g.ellipse(x + s * 2, y - s * 6, Math.max(0.6, s * 2.2), Math.max(0.4, s * 1.1), 0.5, 0, 7); g.fill(); }));
          }
        } else if (k === 'stubble') {
          g.fillStyle = 'rgba(120,95,50,.55)';
          rows(g, p, 0.1, (x0, y0, x1, y1, X) => along(p, X, 0.05, (x, y, s) => { const hh = Math.max(0.6, s * 3); g.fillRect(x - s, y - hh, Math.max(0.6, s * 1.6), hh); }));
          // 刈ったわらが散らばる
          g.strokeStyle = 'rgba(235,215,150,.5)'; g.lineWidth = 0.8;
          for (let i = 0; i < 6; i++) { const X = p.Xl + R() * (p.Xr - p.Xl), Z = p.Za + R() * (p.Zb - p.Za); const x = sx(X, Z), y = sy(Z), l = 6 / Z; g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y - l * 0.3); g.stroke(); }
        }
        g.restore();
      });

      // あぜ（区画の境目）：季節で色が変わる。手前ほど太い
      const lev = M.ground === 'snow' ? ['#ffffff', '#d4dde6'] : (m >= 5 && m <= 9) ? ['#7fa64e', '#5b7f35'] : m === 4 ? ['#9a9a62', '#7c7a4a'] : ['#a99a68', '#86764a'];
      const levee = (x0, y0, x1, y1, w0, w1) => {
        g.fillStyle = lev[1]; g.beginPath(); g.moveTo(x0 - w0, y0); g.lineTo(x0 + w0, y0); g.lineTo(x1 + w1, y1); g.lineTo(x1 - w1, y1); g.closePath(); g.fill();
        g.strokeStyle = lev[0]; g.lineWidth = Math.max(0.4, w0 * 0.5); g.beginPath(); g.moveTo(x0 - w0 * 0.3, y0); g.lineTo(x1 - w1 * 0.3, y1); g.stroke();
      };
      list.forEach((p) => {
        levee(sx(p.Xl, p.Za), sy(p.Za), sx(p.Xl, p.Zb), sy(p.Zb), 1.8 / p.Za, 1.8 / p.Zb);
      });
      for (let b = 1; b < BANDS.length; b++) {
        const Z = BANDS[b], y = sy(Z), th = Math.max(0.7, 5.5 / Z);
        g.fillStyle = lev[1]; g.fillRect(0, y - th * 0.5, W, th);
        g.fillStyle = lev[0]; g.fillRect(0, y - th * 0.5, W, Math.max(0.5, th * 0.35));
        if (Z < 3 && m >= 5 && m <= 9) { // 手前のあぜの草
          g.strokeStyle = '#6d9a3e'; g.lineWidth = 0.8;
          for (let x = 0; x < W; x += 3 + R() * 4) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 3, y - th * (0.6 + R())); g.stroke(); }
        }
        if (Z < 2.6 && m === 9 && R() < 1) { // 彼岸花
          g.fillStyle = '#d8372b';
          for (let i = 0; i < 6; i++) { const x = R() * W; g.beginPath(); g.arc(x, y - th * 0.8, 1.6, 0, 7); g.fill(); }
        }
      }
    }

    // はさがけ（稲を干す木の棚）
    function hasa(g) {
      [[1.6, -0.6], [2.2, 0.9], [3.2, -1.9]].forEach(([Z, X]) => {
        const y = sy(Z), x = sx(X, Z), s = 1 / Z, w = 120 * s, hh = 34 * s;
        g.strokeStyle = '#5b4126'; g.lineWidth = Math.max(1, 2.2 * s);
        for (let k = 0; k <= 3; k++) { g.beginPath(); g.moveTo(x + w * k / 3, y); g.lineTo(x + w * k / 3, y - hh * 1.1); g.stroke(); }
        g.fillStyle = '#c79a3e'; g.fillRect(x - 3 * s, y - hh, w + 6 * s, hh * 0.55);
        g.fillStyle = 'rgba(120,80,25,.45)';
        for (let i = 0; i < w; i += Math.max(2, 5 * s)) g.fillRect(x + i, y - hh, Math.max(0.6, 1.4 * s), hh * 0.55);
        g.fillStyle = '#e2b95a'; g.fillRect(x - 3 * s, y - hh, w + 6 * s, Math.max(1, hh * 0.12));
      });
    }
    // 白鷺（夏の田んぼ）
    function egrets(g) {
      [[2.0, 1.1], [2.9, -2.3]].forEach(([Z, X]) => {
        const x = sx(X, Z), y = sy(Z), s = 1.6 / Z;
        g.fillStyle = '#ffffff'; g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(1, 1.6 * s);
        g.beginPath(); g.ellipse(x, y - 9 * s, 5 * s, 3 * s, -0.3, 0, 7); g.fill();
        g.beginPath(); g.moveTo(x + 3 * s, y - 10 * s); g.quadraticCurveTo(x + 7 * s, y - 13 * s, x + 5 * s, y - 17 * s); g.stroke();
        g.strokeStyle = '#2f2a20'; g.lineWidth = Math.max(0.6, s); g.beginPath(); g.moveTo(x - 1 * s, y - 7 * s); g.lineTo(x - 1 * s, y); g.moveTo(x + 1 * s, y - 7 * s); g.lineTo(x + 2 * s, y); g.stroke();
        g.strokeStyle = '#e0b030'; g.beginPath(); g.moveTo(x + 5 * s, y - 17 * s); g.lineTo(x + 9 * s, y - 16.5 * s); g.stroke();
      });
    }

    // ---------- 毎フレーム描くもの ----------
    function clouds(t, M, m) {
      const n = M.ground === 'snow' || m === 6 ? 6 : 4;
      for (let i = 0; i < n; i++) {
        const span = W + 260, x = ((i * 233 + t * 0.006 * (1 + (i % 3) * 0.4)) % span) - 130, y = H * (0.06 + 0.07 * (i % 3)), s = 0.7 + (i % 3) * 0.25;
        const col = M.ground === 'snow' || m === 6 ? 'rgba(235,240,246,.75)' : 'rgba(255,255,255,.8)';
        ctx.fillStyle = col;
        [[0, 0, 26], [18, -6, 18], [36, 0, 20], [-16, 3, 14], [52, 4, 12]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.ellipse(x + dx * s, y + dy * s, r * s, r * 0.55 * s, 0, 0, 7); ctx.fill(); });
        ctx.fillStyle = 'rgba(160,175,195,.18)'; ctx.beginPath(); ctx.ellipse(x + 18 * s, y + 7 * s, 40 * s, 5 * s, 0, 0, 7); ctx.fill();
      }
    }
    // 手前の稲株（風で揺れる）
    function foreground(t, M) {
      const k = M.ground;
      if (!{ young: 1, green: 1, head: 1, gold: 1 }[k]) return;
      const hgt = { young: 16, green: 30, head: 36, gold: 34 }[k];
      const leaf = { young: ['#5c9a3c', '#3f7f2b'], green: ['#4b8a33', '#2f6a24'], head: ['#5d8c32', '#41702a'], gold: ['#c79a35', '#a77a22'] }[k];
      const step = 11;
      for (let row = 0; row < 2; row++) {
        const base = H + 4 - row * 10, sc = 1 - row * 0.28;
        for (let x = (row ? step / 2 : 0) - 6; x < W + 10; x += step) {
          const sway = reduce ? 0 : Math.sin(t * 0.0018 + x * 0.045 + row) * 3 * sc;
          for (let j = -2; j <= 2; j++) {
            const hh = hgt * sc * (0.75 + 0.25 * Math.cos(j)), tipX = x + j * 3.2 * sc + sway * (1 + Math.abs(j) * 0.2);
            ctx.strokeStyle = leaf[(j + 4) % 2]; ctx.lineWidth = 1.6 * sc;
            ctx.beginPath(); ctx.moveTo(x + j * 0.8, base); ctx.quadraticCurveTo(x + j * 1.5, base - hh * 0.6, tipX, base - hh); ctx.stroke();
          }
          if (k === 'head' || k === 'gold') { // 穂（実るほど垂れる）
            const tx = x + sway * 1.2, ty = base - hgt * sc;
            const droop = k === 'gold' ? 9 : 4;
            ctx.strokeStyle = k === 'gold' ? '#b8862a' : '#8aa040'; ctx.lineWidth = 1 * sc;
            ctx.beginPath(); ctx.moveTo(tx, ty + 4); ctx.quadraticCurveTo(tx + 5 * sc, ty - 3, tx + droop * sc, ty + droop * 0.6 * sc); ctx.stroke();
            ctx.fillStyle = k === 'gold' ? '#f0c55a' : '#c7c96a';
            for (let q = 0; q < 5; q++) { const u = q / 5; ctx.beginPath(); ctx.ellipse(tx + (2 + u * (droop - 2)) * sc, ty + (-1.5 + u * (droop * 0.6 + 1)) * sc, 1.5 * sc, 0.9 * sc, 0.8, 0, 7); ctx.fill(); }
          }
        }
      }
    }
    // 機械：4月 トラクター / 5月 田植機 / 9・10月 コンバイン
    function machine(t, m) {
      const kind = m === 4 ? 'tractor' : m === 5 ? 'planter' : m === 9 || m === 10 ? 'combine' : null;
      if (!kind) return;
      // 大きさは、田んぼの区画と同じ遠近で決める（区画の幅の1割くらい。画面が大きいほど大きく描く）
      const Z = 1.9, y = sy(Z) + (sy(1.22) - sy(Z)) * 0.55, Zm = 1.5;
      const s = Math.max(0.6, Math.min(2.4, (0.13 * S() / Zm) / 50));
      const span = W + 140 * s, x = (t * 0.02 * s) % span - 70 * s;
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(2, 1, 24, 3, 0, 0, 7); ctx.fill();
      if (kind === 'tractor') {
        // 稲作のトラクター（30馬力くらい）を横から：前は長いボンネット、後ろは大きな後輪と泥よけ、運転席の後ろに安全フレーム、
        // いちばん後ろに代かき・耕うんのロータリー。全長（ロータリー込み）約4m・安全フレームまで約2.4m・後輪の直径は前輪の約1.6倍
        const body = '#e8641f', bodyD = '#b84a14';
        // ロータリー（後ろ）と、はね上げた泥
        ctx.fillStyle = 'rgba(120,88,58,.55)'; ctx.beginPath(); ctx.ellipse(-33, -1.5, 9, 3, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = '#555'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-17, -9); ctx.lineTo(-25, -11); ctx.moveTo(-17, -13); ctx.lineTo(-25, -15); ctx.stroke(); // 3点リンク
        ctx.fillStyle = '#7d7d78'; ctx.beginPath(); ctx.moveTo(-38, -2); ctx.lineTo(-38, -10); ctx.quadraticCurveTo(-37, -16, -30, -16); ctx.lineTo(-24, -16); ctx.lineTo(-24, -2); ctx.closePath(); ctx.fill(); // カバー
        ctx.fillStyle = body; ctx.fillRect(-36, -16, 12, 2.5); // カバーの上の帯
        ctx.strokeStyle = '#4a4a46'; ctx.lineWidth = 1; for (let k = -36; k <= -26; k += 3) { ctx.beginPath(); ctx.moveTo(k, -2); ctx.lineTo(k + 1.5, 0.5); ctx.stroke(); } // 爪
        // 後輪と泥よけ
        lugWheel(-10, -10, 10);
        ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(-22, -11); ctx.quadraticCurveTo(-21, -23, -10, -23); ctx.quadraticCurveTo(1, -23, 2, -11); ctx.lineTo(-1, -11); ctx.quadraticCurveTo(-2, -20, -10, -20); ctx.quadraticCurveTo(-18, -20, -19, -11); ctx.closePath(); ctx.fill();
        // 車体の下まわり（エンジンとミッション）
        ctx.fillStyle = '#4b4b48'; ctx.fillRect(-6, -10, 27, 4);
        // ボンネット（前に向かって少し下がる）と、前のグリル・ライト
        ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(-2, -9); ctx.lineTo(-2, -18); ctx.lineTo(18, -17); ctx.quadraticCurveTo(24, -16.5, 24, -12); ctx.lineTo(24, -9); ctx.closePath(); ctx.fill();
        ctx.fillStyle = bodyD; ctx.fillRect(-2, -12, 26, 1.6); // 側面の線
        ctx.fillStyle = '#2b2b2b'; ctx.fillRect(21.5, -15, 2.5, 5); // グリル
        ctx.fillStyle = '#fff7d6'; ctx.beginPath(); ctx.arc(22.5, -16.2, 1.1, 0, 7); ctx.fill(); // ライト
        ctx.strokeStyle = '#333'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(10, -18); ctx.lineTo(10, -25); ctx.stroke(); // マフラー
        // 前輪
        lugWheel(17, -6, 6);
        // ハンドルと座席
        ctx.strokeStyle = '#333'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-1, -18); ctx.lineTo(-3, -23); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(-3.5, -23.5, 3, 1, -0.3, 0, 7); ctx.stroke();
        ctx.fillStyle = '#2d2d2d'; ctx.fillRect(-13, -25, 6, 2.5); ctx.fillRect(-14, -30, 2, 6); // 座席
        driver(-9, -25);
        // 安全フレーム（2本の柱を立てた状態）
        ctx.strokeStyle = '#2f2f2f'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-16, -21); ctx.lineTo(-16, -40); ctx.lineTo(-11, -40); ctx.lineTo(-11, -23); ctx.stroke();
      } else if (kind === 'planter') {
        // 乗用田植機（6条植え）を横から：前に小さなエンジンのボンネット、細い車輪（後輪が大きい）、真ん中に運転席、
        // 後ろに斜めに立ち上がる苗載せ台（緑の苗のマット）、いちばん下に植え付け部とフロート。植えたあとに苗の列が残る
        const bd = '#f2f0ea', st2 = '#d23c2a';
        // 植えたあとの苗の列
        ctx.fillStyle = 'rgba(70,140,60,.8)'; for (let k = 0; k < 7; k++) { ctx.fillRect(-30 - k * 5, -2.5, 1.2, 2.5); ctx.fillRect(-32 - k * 5, -1.6, 1, 1.6); }
        // 植え付け部とフロート（水面をすべる板）
        ctx.fillStyle = '#9a9a94'; ctx.fillRect(-27, -3.5, 20, 2.5);
        ctx.strokeStyle = '#555'; ctx.lineWidth = 1; for (let k = -25; k <= -11; k += 4.5) { ctx.beginPath(); ctx.moveTo(k, -4); ctx.lineTo(k - 1.5, 0); ctx.stroke(); } // 植え付けの爪
        // 苗載せ台（後ろに斜めに立ち上がる）と苗のマット
        ctx.fillStyle = '#c9c7bf'; ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(-21, -29); ctx.lineTo(-29, -25); ctx.lineTo(-14, -3); ctx.closePath(); ctx.fill(); // 台の枠
        ctx.fillStyle = '#4f9a37'; ctx.beginPath(); ctx.moveTo(-7.5, -8); ctx.lineTo(-21, -27.5); ctx.lineTo(-27, -24.5); ctx.lineTo(-13.5, -5); ctx.closePath(); ctx.fill(); // 苗のマット
        ctx.strokeStyle = '#86d35c'; ctx.lineWidth = 0.9; for (let k = 0; k < 7; k++) { const px = -9 - k * 2, py = -9 - k * 2.9; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 5, py + 2.6); ctx.stroke(); } // 苗の列
        ctx.strokeStyle = '#3a7a28'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-14, -18); ctx.lineTo(-20, -15); ctx.stroke();
        // 後輪（細くて大きい）と前輪
        thinWheel(-4, -7, 7); 
        // 車体（運転席のまわりの床と、前のボンネット）
        ctx.fillStyle = bd; ctx.beginPath(); ctx.moveTo(-9, -9); ctx.lineTo(6, -9); ctx.lineTo(8, -15); ctx.lineTo(20, -14); ctx.quadraticCurveTo(24, -13, 24, -9); ctx.lineTo(24, -6); ctx.lineTo(-9, -6); ctx.closePath(); ctx.fill();
        ctx.fillStyle = st2; ctx.fillRect(8, -12, 16, 2); // ボンネットの赤い帯
        ctx.fillStyle = '#2b2b2b'; ctx.fillRect(22.5, -12.5, 1.8, 3.5); // 前のグリル
        ctx.fillStyle = '#9bbcd4'; ctx.fillRect(18, -18, 5, 3); // 予備の苗を置く台（前）
        ctx.fillStyle = '#5aa63e'; ctx.fillRect(18, -20, 5, 2);
        thinWheel(16, -5, 5);
        // 運転席とハンドル
        ctx.fillStyle = '#2d2d2d'; ctx.fillRect(-5, -14, 6, 2.5); ctx.fillRect(-6, -19, 2, 6);
        ctx.strokeStyle = '#333'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(6, -14); ctx.lineTo(4, -19); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(3.6, -19.5, 3, 1, -0.3, 0, 7); ctx.stroke();
        driver(-1, -14);
      } else {
        ctx.fillStyle = '#2f2f2f'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-22, -7, 38, 8, 4) : ctx.rect(-22, -7, 38, 8); ctx.fill(); // クローラー
        ctx.strokeStyle = '#555'; ctx.lineWidth = 0.8; for (let i = -18; i < 14; i += 4) { ctx.beginPath(); ctx.moveTo(i, -6); ctx.lineTo(i, 0); ctx.stroke(); }
        ctx.fillStyle = '#e8a32a'; ctx.fillRect(-22, -22, 30, 15); // 本体
        ctx.fillStyle = '#c9861c'; ctx.fillRect(-22, -22, 30, 3);
        ctx.fillStyle = '#e8a32a'; ctx.fillRect(8, -26, 11, 19); // 運転席
        ctx.fillStyle = '#a9d6ee'; ctx.fillRect(10, -24, 7, 8);
        ctx.fillStyle = '#6a6a6a'; ctx.beginPath(); ctx.moveTo(18, -10); ctx.lineTo(30, -6); ctx.lineTo(30, -1); ctx.lineTo(18, -3); ctx.closePath(); ctx.fill(); // 刈り取り部
        ctx.strokeStyle = '#555'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-18, -22); ctx.lineTo(-24, -32); ctx.lineTo(-10, -34); ctx.stroke(); // 排出オーガ
        ctx.fillStyle = 'rgba(230,200,120,.6)'; ctx.beginPath(); ctx.ellipse(-28, -2, 8, 2.5, 0, 0, 7); ctx.fill(); // わらくず
      }
      ctx.restore();
      // 田植機の細い車輪（ぬかるみで沈みにくい、細くて背の高い車輪）
      function thinWheel(cx, cy, r) {
        ctx.strokeStyle = '#1f1f1f'; ctx.lineWidth = Math.max(1.4, r * 0.32); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
        ctx.strokeStyle = '#d8d3c4'; ctx.lineWidth = 0.9; for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI + x * 0.05; ctx.beginPath(); ctx.moveTo(cx - Math.cos(a) * r * 0.8, cy - Math.sin(a) * r * 0.8); ctx.lineTo(cx + Math.cos(a) * r * 0.8, cy + Math.sin(a) * r * 0.8); ctx.stroke(); }
        ctx.fillStyle = '#d8d3c4'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.22, 0, 7); ctx.fill();
      }
      // ぬかるんだ田を走る、ラグ（突起）の付いたタイヤ
      function lugWheel(cx, cy, r) {
        ctx.fillStyle = '#1f1f1f'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
        for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2 + (x * 0.05); ctx.save(); ctx.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.rotate(a); ctx.fillRect(-0.6, -1.2, 1.6, 2.4); ctx.restore(); }
        ctx.fillStyle = '#d8d3c4'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.5, 0, 7); ctx.fill(); // ホイール
        ctx.fillStyle = '#8f8a7c'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.18, 0, 7); ctx.fill();
      }
      function wheel(cx, cy, r) { ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); ctx.fillStyle = '#d9b52a'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.42, 0, 7); ctx.fill(); }
      function driver(cx, cy) { ctx.fillStyle = '#3d5f8a'; ctx.fillRect(cx - 2.5, cy - 8, 5, 8); ctx.fillStyle = '#f0c8a0'; ctx.beginPath(); ctx.arc(cx, cy - 10, 2.4, 0, 7); ctx.fill(); ctx.fillStyle = '#f4f4f0'; ctx.fillRect(cx - 3, cy - 13, 6, 2); }
    }
    // 雁の群れ（11月）
    function geese(t) {
      const x0 = ((t * 0.02) % (W + 200)) - 100, y0 = H * 0.18;
      ctx.strokeStyle = 'rgba(50,50,60,.7)'; ctx.lineWidth = 1;
      for (let i = 0; i < 7; i++) {
        const side = i % 2 ? 1 : -1, k = Math.ceil(i / 2), x = x0 - k * 9, y = y0 + side * k * 5, f = Math.sin(t * 0.01 + i) * 1.5;
        ctx.beginPath(); ctx.moveTo(x - 4, y - f); ctx.lineTo(x, y); ctx.lineTo(x + 4, y - f); ctx.stroke();
      }
    }

    // ---------- 田んぼの向こうを走るローカル線（opts.train のときだけ。物語の場面・ムービー） ----------
    // 2両の気動車が、ときどき田んぼの向こうの土手を横切る。夕暮れ（opts.lit）は窓に明かりがともる
    function train(t) {
      const y = hz() + 4, L = Math.max(34, W * 0.06), hg = L * 0.25, gap = 2, n = 2, total = n * L + gap;
      // 土手とレール
      ctx.fillStyle = 'rgba(92,80,62,.55)'; ctx.fillRect(0, y, W, 2.2);
      ctx.fillStyle = 'rgba(40,36,32,.65)'; ctx.fillRect(0, y - 0.4, W, 0.8);
      const cross = 16000, rest = 9000, cyc = cross + rest, ph = t % cyc; // 16秒で横切り、9秒あいだをあける
      if (ph > cross) return;
      const x0 = -total + (W + total) * (ph / cross), lit = !!(opts.lit && opts.lit()), top = y - hg - 1;
      for (let k = 0; k < n; k++) {
        const x = x0 + k * (L + gap), r = hg * 0.3;
        ctx.fillStyle = '#ece6d6'; // 車体（クリーム色）
        ctx.beginPath(); ctx.moveTo(x + r, top); ctx.lineTo(x + L - r, top); ctx.quadraticCurveTo(x + L, top, x + L, top + r); ctx.lineTo(x + L, y - 1);
        ctx.lineTo(x, y - 1); ctx.lineTo(x, top + r); ctx.quadraticCurveTo(x, top, x + r, top); ctx.fill();
        ctx.fillStyle = '#3f7f4a'; ctx.fillRect(x, top + hg * 0.66, L, hg * 0.16); // 緑の帯
        ctx.fillStyle = lit ? 'rgba(255,212,120,.95)' : 'rgba(64,86,108,.85)'; // 窓
        for (let i = 0; i < 6; i++) ctx.fillRect(x + L * 0.07 + i * L * 0.148, top + hg * 0.2, L * 0.1, hg * 0.32);
        ctx.fillStyle = 'rgba(45,42,40,.7)'; ctx.fillRect(x + 2, y - 1.5, L - 4, 1.5); // 床下
      }
      if (lit) { // 先頭のライト
        const fx = x0 + total;
        const g = ctx.createRadialGradient(fx, top + hg * 0.55, 0, fx, top + hg * 0.55, hg * 1.6);
        g.addColorStop(0, 'rgba(255,240,190,.9)'); g.addColorStop(1, 'rgba(255,240,190,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(fx, top + hg * 0.55, hg * 1.6, 0, 7); ctx.fill();
      }
    }

    function draw(t) {
      if (!W || !H) { if (canvas.clientWidth) size(); if (!W || !H) return; }
      const m = getMonth(), M = MONTH[m];
      const key = m + '/' + W + 'x' + H + '@' + dpr + (opts.dusk && opts.dusk() ? '/dusk' : '');
      if (key !== bgKey) { bg = buildBg(m); bgKey = key; }
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(bg, 0, 0); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, hz()); ctx.clip(); clouds(t, M, m); ctx.restore();
      if (m === 11) geese(t);
      if (opts.train && opts.train()) train(t);
      // 水面のきらめき
      if (M.ground === 'till' || M.ground === 'plant') {
        ctx.fillStyle = 'rgba(255,255,255,.4)';
        for (let i = 0; i < 14; i++) { const Z = 1.25 + (i * 0.37) % 3, x = ((i * 137 + t * 0.012) % (W + 40)) - 20, y = sy(Z); ctx.fillRect(x, y, 10 / Z, 1); }
      }
      machine(t, m);
      foreground(t, M);
      const rain = opts.rain && opts.rain(m);
      if (rain) { ctx.fillStyle = 'rgba(70,85,100,.22)'; ctx.fillRect(0, 0, W, H); }
      if (M.ground === 'snow') {
        ctx.fillStyle = 'rgba(255,255,255,.9)';
        flakes.forEach((f) => { const x = ((f.x * W + Math.sin(t * 0.001 + f.y * 9) * 10) % W + W) % W, y = ((f.y * H + t * 0.02 * f.v) % H); ctx.beginPath(); ctx.arc(x, y, f.s * 1.5, 0, 7); ctx.fill(); });
      } else if (rain) {
        ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1;
        flakes.forEach((f) => { const x = (f.x * W + t * 0.05) % W, y = (f.y * H + t * 0.4 * f.v) % H; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 9); ctx.stroke(); });
      }
    }
    function loop(now) {
      if (!canvas.isConnected) { canvas._alive = false; window.removeEventListener('resize', onResize); return; }
      if (now - last >= 33) { last = now; draw(now - t0); } // 30コマ/秒で十分
      if (!reduce) raf = requestAnimationFrame(loop);
    }
    // 動きを控える設定ではアニメーションしないので、画面の大きさが変わったら描き直す（大きさを変えると絵が消えるため）
    const onResize = () => { if (!canvas.isConnected) { window.removeEventListener('resize', onResize); return; } size(); if (reduce) draw(0); };
    window.addEventListener('resize', onResize);
    requestAnimationFrame(() => { size(); draw(0); if (!reduce) raf = requestAnimationFrame(loop); });
    canvas._redraw = () => { if (reduce) draw(0); };
    void raf;
  };
})(window.RG = window.RG || {});
