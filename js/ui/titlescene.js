// タイトル画面の風景：夕暮れの黄金色の田んぼ（画像は使わず canvas で描く）
// 稲穂が風にそよぎ、光の粒が舞い、山並みは画面の動きに合わせてわずかに奥行きを見せる
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

  TS.mount = function (canvas) {
    canvas._alive = true;
    const ctx = canvas.getContext('2d');
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let W = 0, H = 0, raf = 0, stalks = [], motes = [], clouds = [], birds = [], layers = [], trees = [];
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
      // 稲（奥ほど小さく、手前ほど大きい）。高さをばらつかせ、穂の列ができないようにする
      stalks = [];
      const n = Math.round(Math.min(700, Math.max(220, W * 0.5)));
      for (let i = 0; i < n; i++) {
        const d = Math.pow(r(), 1.9); // 0 奥 … 1 手前
        const len = (10 + d * d * 175) * (0.65 + r() * 0.7);
        stalks.push({ x: r() * (W + 120) - 60, d, y: hz + (H - hz) * (0.04 + 1.02 * d) + r() * 12 * d, len,
          ph: r() * Math.PI * 2, sp: 0.75 + r() * 0.5, lean: (r() - 0.5) * 0.3, dir: r() < 0.72 ? 1 : -1, hue: r(), grains: 7 + Math.floor(r() * 4) });
      }
      stalks.sort((a, b) => a.y - b.y);
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

    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = canvas.clientWidth || window.innerWidth; H = canvas.clientHeight || window.innerHeight;
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
      // 田んぼの面
      const fg = ctx.createLinearGradient(0, hz, 0, H);
      fg.addColorStop(0, '#e6b468'); fg.addColorStop(0.25, '#c48a3a'); fg.addColorStop(1, '#5a3a17');
      ctx.fillStyle = fg; ctx.fillRect(0, hz, W, H - hz);
      // 畝の線（消失点に向かう）
      const vx = W * 0.5 - px * 30;
      ctx.strokeStyle = 'rgba(80,50,20,.18)'; ctx.lineWidth = 1;
      for (let i = -24; i <= 24; i++) { ctx.beginPath(); ctx.moveTo(vx + i * 6, hz); ctx.lineTo(vx + i * W * 0.09, H); ctx.stroke(); }
      // 稲穂：茎がしなり、実った穂が重さで垂れ下がる
      const wind = Math.sin(t * 0.00045) * 0.6 + Math.sin(t * 0.0011) * 0.25;
      ctx.lineCap = 'round';
      for (const s of stalks) {
        const x = s.x - px * 30 * s.d, y = s.y;
        const sway = (Math.sin(t * 0.0016 * s.sp + s.ph + s.x * 0.01) * 0.3 + wind * 0.8) * (0.3 + 0.7 * s.d) + s.lean;
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
        ctx.fillStyle = col;
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
            ctx.beginPath();
            ctx.ellipse(q[0] + Math.cos(per) * off + Math.cos(ga) * w * 0.6, q[1] + Math.sin(per) * off + Math.sin(ga) * w * 0.6, w * 1.9, w * 0.85, ga, 0, Math.PI * 2);
            ctx.fill();
          }
        });
        if (s.d > 0.6) { // 夕日の当たる側のつや
          ctx.fillStyle = 'rgba(255,240,190,' + (0.35 * s.d) + ')';
          pts.forEach((q, j) => { if (j % 2) return; ctx.beginPath(); ctx.ellipse(q[0] + Math.cos(q[2]) * gw, q[1] - gw * 0.5, gw * 1.1, gw * 0.4, q[2], 0, Math.PI * 2); ctx.fill(); });
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

    function loop(now) {
      if (!canvas.isConnected) { cleanup(); return; }
      draw(now - start);
      raf = requestAnimationFrame(loop);
    }
    const onMove = (e) => { tx = (e.clientX / window.innerWidth - 0.5) * 2; ty = (e.clientY / window.innerHeight - 0.5) * 2; };
    const onResize = () => { if (!canvas.isConnected) { cleanup(); return; } resize(); };
    function cleanup() { canvas._alive = false; cancelAnimationFrame(raf); window.removeEventListener('pointermove', onMove); window.removeEventListener('resize', onResize); }

    window.addEventListener('resize', onResize);
    if (!reduce) window.addEventListener('pointermove', onMove);
    // DOM に入ってから大きさを測る
    requestAnimationFrame(() => { resize(); if (!reduce) raf = requestAnimationFrame(loop); });
  };
})(window.RG = window.RG || {});
