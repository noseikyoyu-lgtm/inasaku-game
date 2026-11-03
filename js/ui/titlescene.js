// タイトル画面の風景：夕暮れの黄金色の田んぼ（画像は使わず canvas で描く）
// 畦（あぜ）で区切られた田んぼが山のふもとまで続き、実った稲穂の上を風の波が渡っていく。
// 手前には重く垂れた稲穂の株が並び、風になびく。山並みは画面の動きに合わせてわずかに奥行きを見せる
(function (RG) {
  'use strict';
  const TS = RG.titleScene = {};

  // 山の稜線（いくつかの sin を重ねたなめらかな起伏）
  function ridge(x, seed) {
    let v = 0, a = 1, f = 1, n = 0;
    for (let i = 0; i < 4; i++) {
      v += a * (Math.sin(x * f * 0.0042 + seed * 1.7 + i * 2.3) + 0.6 * Math.sin(x * f * 0.0093 + seed * 2.9 + i * 1.1));
      n += a * 1.6; a *= 0.5; f *= 2.05;
    }
    return v / n;
  }

  // スマホ（指で触る画面）では、絵の細かさを下げて軽くする（メモリが足りずに点滅しないように）
  const TOUCH = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  const DPR = () => Math.min(TOUCH ? 1.5 : 2, window.devicePixelRatio || 1);

  TS.mount = function (canvas) {
    canvas._alive = true;
    const ctx = canvas.getContext('2d');
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let W = 0, H = 0, raf = 0, stalks = [], motes = [], clouds = [], birds = [], layers = [], trees = [];
    let carpet = null, levees = null, nearY = 0, waveC = null, waveX = null, waveImg = null; // 田んぼ（稲の面）と畦は、大きさが変わったときに描いておく
    const OVER = 60; // 左右の動き（視差）のぶん、少し広く描く
    // 奥行き：z=1 が画面の下端、z が大きいほど遠い（地平線に近づく）
    const zy = (z) => horizon() + (H - horizon()) / z;
    const unit = () => Math.max(W * 0.5, (H - horizon()) * 1.4); // 横の広さの基準（縦長の画面でも区画がつぶれないように）
    const ROWS = [1.45, 2.05, 2.9, 4.1, 5.9, 8.6, 12.5, 19, 30]; // 横の畦の位置（手前から）
    // 風の波：田んぼの上を、右から左へ明るい帯が渡っていく（0〜1）
    const waveAt = (X, z, t) => 0.5 + 0.5 * Math.sin(X * 2.4 + z * 0.9 + t * 0.0016) * Math.cos(X * 0.7 - z * 0.35 + t * 0.0007);
    let px = 0, py = 0, tx = 0, ty = 0;
    const start = performance.now();

    function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
    const horizon = () => H * 0.6;

    function build() {
      const r = rng(20261031);
      const hz = horizon();
      // 山並み（遠い順に3層）
      layers = [
        { seed: 1, base: hz - H * 0.13, amp: H * 0.09, top: '#9b7a8c', bot: '#d7a07e', depth: 0.25 },
        { seed: 4, base: hz - H * 0.07, amp: H * 0.07, top: '#6d5670', bot: '#b9846f', depth: 0.5 },
        { seed: 7, base: hz - H * 0.025, amp: H * 0.045, top: '#3f3346', bot: '#7a5a52', depth: 0.8 },
      ];
      // 地平線の木立と家
      trees = [];
      for (let i = 0; i < 9; i++) trees.push({ x: r() * W, w: 18 + r() * 46, h: 10 + r() * 22, house: r() < 0.25 });
      // 手前の田んぼの稲：株（4〜7本）が列になって植わっている。手前ほど大きい
      stalks = [];
      nearY = zy(ROWS[0]);
      const rowGap = Math.max(12, (H - nearY) / 9);
      for (let y = nearY + rowGap * 0.35, ri = 0; y < H + (26 + 90) * 0.7; y += rowGap * (0.85 + 0.3 * r()), ri++) {
        const d = Math.min(1.15, (y - nearY) / (H - nearY));
        const colGap = 24 + d * 40;
        for (let x = -OVER + (ri % 2) * colGap * 0.5; x < W + OVER; x += colGap * (0.8 + 0.4 * r())) {
          const n = 3 + Math.floor(r() * 3);
          for (let k = 0; k < n; k++) {
            const len = (26 + d * 90) * (0.8 + r() * 0.35);
            stalks.push({ x: x + (r() - 0.5) * colGap * 0.35, d, y: y + r() * rowGap * 0.3, len, ph: r() * Math.PI * 2, sp: 0.75 + r() * 0.5,
              lean: (r() - 0.5) * 0.35, dir: r() < 0.7 ? 1 : -1, hue: r(), grains: 7 + Math.floor(r() * 4) });
          }
        }
      }
      stalks.sort((a, b) => a.y - b.y);
      buildField(r);
      // 光の粒
      motes = [];
      for (let i = 0; i < 46; i++) motes.push({ x: r() * W, y: hz - H * 0.15 + r() * H * 0.55, r: 0.6 + r() * 2.2, vx: -0.05 - r() * 0.12, vy: -0.03 - r() * 0.08, ph: r() * 6.28 });
      // 雲
      clouds = [];
      for (let i = 0; i < 7; i++) clouds.push({ x: r() * W * 1.3, y: H * (0.08 + r() * 0.3), w: W * (0.18 + r() * 0.25), h: H * (0.025 + r() * 0.04), v: 0.004 + r() * 0.01, a: 0.18 + r() * 0.25 });
      // 鳥の群れ
      birds = [];
      for (let i = 0; i < 7; i++) birds.push({ ox: (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 18, oy: Math.ceil(i / 2) * 9, ph: r() * 6.28 });
    }

    // 田んぼ（稲の面）と畦を、別の canvas に描いておく
    function buildField(r) {
      const hz = horizon(), FH = H - hz, dpr = DPR(), CW = W + OVER * 2;
      const mk = () => { const c = document.createElement('canvas'); c.width = Math.round(CW * dpr); c.height = Math.round(FH * dpr); const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); return [c, x]; };
      const [cc, c] = mk(), [lc, l] = mk();
      const vx = CW / 2;
      const Y = (z) => FH / z; // この canvas の中での y
      const X = (Xw, z) => vx + Xw * unit() / z;
      // 稲の面の下地：遠くは夕もやで明るく、手前ほど濃い黄金色
      const base = c.createLinearGradient(0, 0, 0, FH);
      base.addColorStop(0, '#f0c47c'); base.addColorStop(0.18, '#e2a957'); base.addColorStop(0.55, '#c98b34'); base.addColorStop(1, '#8a5a1e');
      c.fillStyle = base; c.fillRect(0, 0, CW, FH);
      const zs = ROWS.concat([60]); // 区画の奥行きの区切り（手前の区画は z=1〜1.45）
      const zEdges = [1].concat(zs);
      for (let i = zEdges.length - 2; i >= 0; i--) {
        const zN = zEdges[i], zF = zEdges[i + 1];
        const yN = Math.min(FH, Y(zN)), yF = Y(zF);
        const sp = 2.2 + (i % 3) * 0.35, off = (i * 0.83) % sp; // 縦の畦の間隔（区画ごとにずらす）
        for (let Xw = -40 + off; Xw < 40; Xw += sp) {
          const x1N = X(Xw, zN), x2N = X(Xw + sp, zN), x1F = X(Xw, zF), x2F = X(Xw + sp, zF);
          if (Math.max(x2N, x2F) < -20 || Math.min(x1N, x1F) > CW + 20) continue;
          c.save();
          c.beginPath(); c.moveTo(x1F, yF); c.lineTo(x2F, yF); c.lineTo(x2N, yN); c.lineTo(x1N, yN); c.closePath(); c.clip();
          // 稲の面：区画の奥（畦ぎわ）は夕日を受けて明るく、手前ほど陰になる。区画ごとに実り方で色が少し違う
          const tone = r();
          const pg = c.createLinearGradient(0, yF, 0, yN);
          pg.addColorStop(0, tone < 0.5 ? '#f7d277' : '#f0c260'); pg.addColorStop(0.5, tone < 0.5 ? '#dda443' : '#d29638'); pg.addColorStop(1, tone < 0.5 ? '#b0731f' : '#a0651a');
          c.fillStyle = pg; c.fillRect(0, yF, CW, yN - yF);
          // 稲の列（縦の畦と同じ向きに、遠くへ向かって集まる）
          if (zN < 9) {
            c.strokeStyle = 'rgba(110,60,10,.16)'; c.lineWidth = Math.max(0.5, 1.6 / zN);
            for (let q = Xw; q < Xw + sp; q += 0.3) { c.beginPath(); c.moveTo(X(q, zF), yF); c.lineTo(X(q, zN), yN); c.stroke(); }
          }
          // 垂れた穂（遠いほど小さく密に）。手前の区画では一本一本の穂が見える
          const sz = Math.max(0.8, 9 / zF);
          const area = Math.abs((x2N - x1N + x2F - x1F) / 2 * (yN - yF));
          const n = Math.min(5000, area / (sz * sz * 0.9));
          c.lineCap = 'round';
          for (let k = 0; k < n; k++) {
            const yy = yF + (yN - yF) * Math.pow(r(), 0.85);
            const zz = FH / Math.max(1, yy);
            const sz2 = Math.max(0.7, 9 / zz);
            const xx = X(Xw + r() * sp, zz);
            const lit = r(), shade = (yy - yF) / Math.max(1, yN - yF); // 区画の手前ほど暗い穂が多い
            c.strokeStyle = lit < 0.45 - shade * 0.25 ? 'rgba(255,226,130,.75)' : lit < 0.82 ? 'rgba(226,160,58,.7)' : 'rgba(120,70,18,.55)';
            c.lineWidth = Math.max(0.5, sz2 * 0.32);
            const dir = r() < 0.75 ? 1 : -1;
            c.beginPath(); c.moveTo(xx, yy + sz2 * 0.5); c.quadraticCurveTo(xx + dir * sz2 * 0.4, yy - sz2 * 0.7, xx + dir * sz2 * 1.2, yy + sz2 * 0.2); c.stroke();
          }
          c.restore();
        }
        // 縦の畦（区画と区画のあいだ）。いちばん手前は稲に隠れるので描かない
        if (i > 0) for (let Xw = -40 + off; Xw < 40; Xw += sp) {
          const w = 0.085; // 畦の幅
          const aN = X(Xw - w, zN), bN = X(Xw + w, zN), aF = X(Xw - w, zF), bF = X(Xw + w, zF);
          if (Math.max(bN, bF) < -20 || Math.min(aN, aF) > CW + 20) continue;
          l.fillStyle = '#6f7038';
          l.beginPath(); l.moveTo(aF, yF); l.lineTo(bF, yF); l.lineTo(bN, yN); l.lineTo(aN, yN); l.closePath(); l.fill();
          l.fillStyle = 'rgba(200,200,120,.45)'; // 夕日の当たる側（草の色）
          l.beginPath(); l.moveTo((aF + bF) / 2, yF); l.lineTo(bF, yF); l.lineTo(bN, yN); l.lineTo((aN + bN) / 2, yN); l.closePath(); l.fill();
        }
      }
      // 横の畦（奥から手前へ。手前ほど太く、草が見える）
      for (let i = ROWS.length - 1; i >= 0; i--) {
        const z = ROWS[i], yTop = Y(z + 0.06 * z), yMid = Y(z), yBot = Y(z - 0.035 * z);
        // 上の面は草で明るく、手前の面（土の壁）は暗い
        const g = l.createLinearGradient(0, yTop, 0, yBot);
        g.addColorStop(0, '#9d9a52'); g.addColorStop(0.5, '#7b7a3c'); g.addColorStop(0.62, '#4f4322'); g.addColorStop(1, '#33280f');
        l.fillStyle = g; l.fillRect(0, yTop, CW, yBot - yTop);
        // 畦の草
        const th = Math.max(1, (yBot - yTop));
        if (th > 3) {
          l.strokeStyle = 'rgba(150,150,80,.7)'; l.lineWidth = Math.max(0.6, th * 0.06);
          for (let x = 0; x < CW; x += Math.max(2, th * 0.35)) {
            const hgt = th * (0.25 + r() * 0.45);
            l.beginPath(); l.moveTo(x, yMid); l.lineTo(x + (r() - 0.5) * hgt * 0.6, yMid - hgt); l.stroke();
          }
        }
        // 手前の区画のいちばん奥の列の穂が、畦に少しかぶさる
        if (th > 2) {
          for (let x = 0; x < CW; x += Math.max(1.5, th * 0.22)) {
            const e = th * (0.7 + r() * 0.6), dir = r() < 0.75 ? 1 : -1;
            l.strokeStyle = r() < 0.5 ? 'rgba(244,198,96,.95)' : 'rgba(205,140,48,.95)'; l.lineWidth = Math.max(0.6, e * 0.14);
            l.beginPath(); l.moveTo(x, yBot + e * 0.4); l.quadraticCurveTo(x + dir * e * 0.3, yBot - e * 0.75, x + dir * e * 0.9, yBot - e * 0.1); l.stroke();
          }
        }
        // 手前の畦には彼岸花
        if (i <= 2) {
          const nF = 3 + Math.floor(r() * 4);
          for (let k = 0; k < nF; k++) {
            const fx = r() * CW, fs = Math.min(th, 9) * (0.9 + r() * 0.8);
            l.strokeStyle = '#3e6a2a'; l.lineWidth = Math.max(0.6, fs * 0.05);
            l.beginPath(); l.moveTo(fx, yMid); l.lineTo(fx, yMid - fs * 1.2); l.stroke();
            l.strokeStyle = '#d8342a'; l.lineWidth = Math.max(0.5, fs * 0.05);
            for (let a = 0; a < 10; a++) {
              const ang = -Math.PI / 2 + (a / 10 - 0.5) * Math.PI * 1.6;
              l.beginPath(); l.moveTo(fx, yMid - fs * 1.2);
              l.quadraticCurveTo(fx + Math.cos(ang) * fs * 0.5, yMid - fs * 1.2 + Math.sin(ang) * fs * 0.5, fx + Math.cos(ang) * fs * 0.75, yMid - fs * 1.2 + Math.sin(ang) * fs * 0.2);
              l.stroke();
            }
          }
        }
      }
      // 遠くは夕もやでかすむ
      const haze = l.createLinearGradient(0, 0, 0, FH * 0.35);
      haze.addColorStop(0, 'rgba(255,214,160,.55)'); haze.addColorStop(1, 'rgba(255,214,160,0)');
      l.fillStyle = haze; l.fillRect(0, 0, CW, FH * 0.35);
      carpet = cc; levees = lc;
    }

    function resize(force) {
      const dpr = DPR();
      const nW = canvas.clientWidth || window.innerWidth, nH = canvas.clientHeight || window.innerHeight;
      // スマホでは、スクロールでアドレスバーが出たり消えたりするたびに高さが少し変わる。
      // そのたびに描き直すと画面が点滅するので、幅が同じで高さの変化が小さいときは描き直さない（絵はそのまま伸び縮みさせる）
      if (!force && W && nW === W && Math.abs(nH - H) < 160) return;
      W = nW; H = nH;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
      if (reduce) draw(9000);
    }

    function draw(t) {
      // 画面が隠れていて大きさが0のときは描かない（見えるようになったら測り直す）
      if (!W || !H) { if (canvas.clientWidth) resize(); return; }
      const hz = horizon();
      px += (tx - px) * 0.04; py += (ty - py) * 0.04;
      // 空
      const sky = ctx.createLinearGradient(0, 0, 0, hz);
      sky.addColorStop(0, '#1d2540'); sky.addColorStop(0.32, '#4d4468'); sky.addColorStop(0.62, '#c9765a');
      sky.addColorStop(0.84, '#f2b46d'); sky.addColorStop(1, '#fbdca0');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, hz + 2);
      // 太陽と光
      const sx = W * 0.66 - px * 10, sy = hz - H * 0.085 - py * 6, sr = Math.min(W, H) * 0.055;
      let g = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 9);
      g.addColorStop(0, 'rgba(255,226,160,.55)'); g.addColorStop(0.25, 'rgba(255,196,120,.22)'); g.addColorStop(1, 'rgba(255,180,110,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, hz);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const rot = t * 0.00002;
      for (let i = 0; i < 12; i++) {
        const a = rot + (i / 12) * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(sx, sy);
        ctx.arc(sx, sy, Math.max(W, H) * 1.2, a, a + 0.07);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,214,150,' + (0.025 + 0.015 * Math.sin(t * 0.0007 + i)) + ')';
        ctx.fill();
      }
      ctx.restore();
      g = ctx.createRadialGradient(sx, sy - sr * 0.3, sr * 0.1, sx, sy, sr);
      g.addColorStop(0, '#fffbe8'); g.addColorStop(0.7, '#ffe2a0'); g.addColorStop(1, 'rgba(255,214,140,.9)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
      // 雲（下から夕日に照らされる）
      clouds.forEach((c) => {
        const x = ((c.x - t * c.v) % (W * 1.4) + W * 1.4) % (W * 1.4) - W * 0.2 - px * 4;
        const cg = ctx.createRadialGradient(x, c.y + c.h * 0.4, 0, x, c.y, c.w * 0.6);
        cg.addColorStop(0, 'rgba(255,200,150,' + c.a + ')'); cg.addColorStop(0.6, 'rgba(210,140,140,' + c.a * 0.5 + ')'); cg.addColorStop(1, 'rgba(120,90,130,0)');
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.ellipse(x, c.y, c.w * 0.6, c.h, 0, 0, Math.PI * 2); ctx.fill();
      });
      // 鳥
      const bx = W * 1.15 - ((t * 0.018) % (W * 1.6)), by = H * 0.2 + Math.sin(t * 0.0004) * 10;
      ctx.strokeStyle = 'rgba(40,30,40,.55)'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
      birds.forEach((b) => {
        const x = bx + b.ox + px * 3, y = by + b.oy, f = Math.sin(t * 0.012 + b.ph) * 3;
        ctx.beginPath(); ctx.moveTo(x - 6, y - f); ctx.quadraticCurveTo(x - 3, y - 3, x, y); ctx.quadraticCurveTo(x + 3, y - 3, x + 6, y - f); ctx.stroke();
      });
      // 山並み
      layers.forEach((L) => {
        const off = px * 18 * L.depth;
        const lg = ctx.createLinearGradient(0, L.base - L.amp, 0, hz);
        lg.addColorStop(0, L.top); lg.addColorStop(1, L.bot);
        ctx.fillStyle = lg;
        ctx.beginPath(); ctx.moveTo(-20, hz + 2);
        for (let x = -20; x <= W + 20; x += 8) ctx.lineTo(x, L.base - L.amp * (0.5 + 0.5 * ridge(x + off * 8 + 400 * L.seed, L.seed)) + py * 4 * L.depth);
        ctx.lineTo(W + 20, hz + 2); ctx.closePath(); ctx.fill();
      });
      // 地平線の木立と家
      ctx.fillStyle = '#2f2630';
      trees.forEach((tr) => {
        const x = tr.x - px * 14;
        if (tr.house) { ctx.fillRect(x, hz - tr.h * 0.6, tr.w * 0.5, tr.h * 0.6); ctx.beginPath(); ctx.moveTo(x - 4, hz - tr.h * 0.6); ctx.lineTo(x + tr.w * 0.25, hz - tr.h); ctx.lineTo(x + tr.w * 0.5 + 4, hz - tr.h * 0.6); ctx.fill(); }
        else { ctx.beginPath(); ctx.ellipse(x, hz, tr.w * 0.5, tr.h, 0, Math.PI, 0); ctx.fill(); }
      });
      // もや
      const mist = ctx.createLinearGradient(0, hz - H * 0.06, 0, hz + H * 0.05);
      mist.addColorStop(0, 'rgba(255,224,180,0)'); mist.addColorStop(0.5, 'rgba(255,220,175,' + (0.38 + 0.06 * Math.sin(t * 0.0005)) + ')'); mist.addColorStop(1, 'rgba(255,214,160,0)');
      ctx.fillStyle = mist; ctx.fillRect(0, hz - H * 0.06, W, H * 0.11);
      // 田んぼ：稲の面 → 風の波 → 畦
      const FH = H - hz, ox = -OVER - px * 10;
      if (carpet) ctx.drawImage(carpet, ox, hz, W + OVER * 2, FH);
      // 風の波：明るい帯が田んぼを渡っていく（手前ほど大きく、遠いほど細かい）
      const vx = W * 0.5 - px * 10;
      // （毎フレーム軽く済むよう、小さな画像に描いて引き伸ばす）
      const WW = 96, WH = 48;
      if (!waveC) { waveC = document.createElement('canvas'); waveC.width = WW; waveC.height = WH; waveX = waveC.getContext('2d'); waveImg = waveX.createImageData(WW, WH); }
      const wd = waveImg.data;
      for (let j = 0; j < WH; j++) {
        const z = WH / (j + 0.5), fade = Math.min(1, 6 / z);
        for (let i = 0; i < WW; i++) {
          const v = waveAt(((i + 0.5) / WW * W - vx) * z / unit(), z, t), o = (j * WW + i) * 4;
          if (v > 0.55) { wd[o] = 255; wd[o + 1] = 236; wd[o + 2] = 160; wd[o + 3] = (v - 0.55) * 1.0 * fade * 255; }
          else { wd[o] = 70; wd[o + 1] = 36; wd[o + 2] = 6; wd[o + 3] = (0.55 - v) * 0.55 * fade * 255; }
        }
      }
      waveX.putImageData(waveImg, 0, 0);
      ctx.drawImage(waveC, 0, hz, W, FH);
      if (levees) ctx.drawImage(levees, ox, hz, W + OVER * 2, FH);
      // 稲穂：茎がしなり、実った穂が重さで垂れ下がる
      ctx.lineCap = 'round';
      for (const s of stalks) {
        const x = s.x - px * (12 + 24 * s.d), y = s.y;
        if (x < -s.len || x > W + s.len) continue;
        // 風の波が来ると、株ごと大きくなびく
        const zS = FH / Math.max(1, y - hz), wv = waveAt((x - vx) * zS / unit(), zS, t);
        const sway = (Math.sin(t * 0.0016 * s.sp + s.ph) * 0.18 + (wv - 0.35) * 1.1) * (0.4 + 0.6 * s.d) + s.lean;
        const tipX = x + sway * s.len * 0.35, tipY = y - s.len;
        const k = 0.5 + 0.5 * s.d; // 手前ほど明るくはっきり
        ctx.strokeStyle = 'rgba(' + Math.round(120 + 70 * k) + ',' + Math.round(100 + 55 * k) + ',' + Math.round(40 + 20 * k) + ',' + (0.45 + 0.5 * s.d) + ')';
        ctx.lineWidth = 0.5 + s.d * 1.8;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + sway * s.len * 0.05, y - s.len * 0.6, tipX, tipY); ctx.stroke();
        // 穂：先端から外側へ弧を描いて垂れる
        const pl = s.len * 0.36, N = s.d < 0.3 ? 4 : s.grains;
        let gx = tipX, gy = tipY;
        // 先端で外側へ折れ、実の重みで下へ垂れる
        const a0 = -Math.PI / 2 + s.dir * (0.55 + 0.35 * s.d) + sway * 0.5;
        const gold = s.hue < 0.5 ? [246, 202, 104] : [232, 178, 76];
        const col = 'rgba(' + Math.round(gold[0] * k + 18) + ',' + Math.round(gold[1] * k + 12) + ',' + Math.round(gold[2] * k) + ',' + (0.55 + 0.45 * s.d) + ')';
        if (s.d < 0.3) {
          ctx.strokeStyle = col; ctx.lineWidth = 1 + s.d * 4;
          ctx.beginPath(); ctx.moveTo(gx, gy);
          for (let j = 1; j <= N; j++) { const ang = a0 + s.dir * (j / N) * 1.9; gx += Math.cos(ang) * pl / N; gy += Math.sin(ang) * pl / N; ctx.lineTo(gx, gy); }
          ctx.stroke();
          continue;
        }
        ctx.strokeStyle = col; ctx.lineWidth = 0.6 + s.d;
        ctx.beginPath(); ctx.moveTo(gx, gy);
        const pts = [];
        for (let j = 1; j <= N; j++) {
          const ang = a0 + s.dir * Math.pow(j / N, 0.8) * 1.9 + Math.sin(t * 0.002 + s.ph) * 0.05;
          gx += Math.cos(ang) * pl / N; gy += Math.sin(ang) * pl / N;
          pts.push([gx, gy, ang]); ctx.lineTo(gx, gy);
        }
        ctx.stroke();
        ctx.fillStyle = col; ctx.beginPath();
        // もみ：枝分かれした小穂に、細長い粒がふぞろいにつく（根元が太く、先へ細く）
        const gw = 0.7 + s.d * 1.9;
        pts.forEach((q, j) => {
          const taper = 1 - j / N * 0.5, w = gw * taper;
          const per = q[2] + 1.57;
          for (let m = -1; m <= 1; m++) {
            if (m === 0 && j % 2) continue;
            const jit = Math.sin(s.ph * 7 + j * 3.1 + m * 1.7);
            const off = m * w * (1.0 + 0.4 * jit) * taper;
            const ga = q[2] + m * 0.5 + jit * 0.2;
            const ex = q[0] + Math.cos(per) * off + Math.cos(ga) * w * 0.6, ey = q[1] + Math.sin(per) * off + Math.sin(ga) * w * 0.6;
            ctx.moveTo(ex + Math.cos(ga) * w * 1.9, ey + Math.sin(ga) * w * 1.9);
            ctx.ellipse(ex, ey, w * 1.9, w * 0.85, ga, 0, Math.PI * 2);
          }
        });
        ctx.fill();
        if (s.d > 0.6) { // 夕日の当たる側のつや
          ctx.fillStyle = 'rgba(255,240,190,' + (0.35 * s.d) + ')';
          ctx.beginPath();
          pts.forEach((q, j) => { if (j % 2) return; const ex = q[0] + Math.cos(q[2]) * gw, ey = q[1] - gw * 0.5; ctx.moveTo(ex + Math.cos(q[2]) * gw * 1.1, ey + Math.sin(q[2]) * gw * 1.1); ctx.ellipse(ex, ey, gw * 1.1, gw * 0.4, q[2], 0, Math.PI * 2); });
          ctx.fill();
        }
      }
      // 光の粒
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      motes.forEach((m) => {
        const x = ((m.x + t * m.vx * 0.06) % W + W) % W, y = m.y + Math.sin(t * 0.001 + m.ph) * 12 + (t * m.vy * 0.02) % 40;
        const a = 0.35 + 0.35 * Math.sin(t * 0.002 + m.ph);
        const mg = ctx.createRadialGradient(x, y, 0, x, y, m.r * 4);
        mg.addColorStop(0, 'rgba(255,236,180,' + a + ')'); mg.addColorStop(1, 'rgba(255,200,120,0)');
        ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(x, y, m.r * 4, 0, Math.PI * 2); ctx.fill();
      });
      ctx.restore();
      // 周辺を暗くして文字を読みやすく
      const vg = ctx.createRadialGradient(W * 0.5, H * 0.42, Math.min(W, H) * 0.3, W * 0.5, H * 0.5, Math.max(W, H) * 0.8);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,6,4,.55)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }

    let lastDraw = -1e9;
    function loop(now) {
      if (!canvas.isConnected) { cleanup(); return; }
      if (!TOUCH || now - lastDraw >= 33) { lastDraw = now; draw(now - start); } // スマホは30コマ/秒で十分（電池と熱のため）
      raf = requestAnimationFrame(loop);
    }
    const onMove = (e) => { tx = (e.clientX / window.innerWidth - 0.5) * 2; ty = (e.clientY / window.innerHeight - 0.5) * 2; };
    let resizeTimer = 0;
    const onResize = () => { if (!canvas.isConnected) { cleanup(); return; } clearTimeout(resizeTimer); resizeTimer = setTimeout(() => resize(), 150); };
    function cleanup() { canvas._alive = false; cancelAnimationFrame(raf); window.removeEventListener('pointermove', onMove); window.removeEventListener('resize', onResize); }

    window.addEventListener('resize', onResize);
    if (!reduce) window.addEventListener('pointermove', onMove);
    // DOM に入ってから大きさを測る
    requestAnimationFrame(() => { resize(true); if (!reduce) raf = requestAnimationFrame(loop); });
  };
})(window.RG = window.RG || {});
