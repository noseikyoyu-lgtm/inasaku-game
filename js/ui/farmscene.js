// シーズン画面の風景：月ごとに田んぼの様子が変わる（雪 → 田起こし → 田植え → 青田 → 穂 → 黄金 → 稲刈り）
(function (RG) {
  'use strict';
  const FS = RG.farmScene = {};

  // 月ごとの空・地面・稲の様子
  const SKY = { 1: ['#aebfd4', '#e7edf3'], 2: ['#b6c6d9', '#eaf0f5'], 3: ['#8fc3e8', '#e3f1f8'], 4: ['#79b9ea', '#dff0fa'], 5: ['#5fb0ea', '#d6eefb'],
    6: ['#7ea7c9', '#d9e6ee'], 7: ['#3f9ee6', '#c8e9fb'], 8: ['#3a98e2', '#ffe9b8'], 9: ['#5aa6e0', '#ffe2a6'], 10: ['#7fb2dc', '#fbe1b4'], 11: ['#9db0c4', '#ece3d3'], 12: ['#a9b8ca', '#e9eef3'] };
  // stage：0 雪 / 1 土 / 2 水を張った田 / 3 苗 / 4 青田 / 5 穂 / 6 黄金 / 7 稲刈りあと / 8 秋起こし
  const STAGE = { 1: 0, 2: 0, 3: 1, 4: 2, 5: 3, 6: 4, 7: 4, 8: 5, 9: 6, 10: 7, 11: 8, 12: 0 };
  const LABEL = { 0: '雪の田んぼ', 1: '雪どけ・田起こし', 2: '水を張った田んぼ', 3: '田植え', 4: '青々と育つ稲', 5: '穂が出た', 6: '黄金色の田んぼ', 7: '稲刈りのあと', 8: '秋起こし' };
  FS.label = (m) => LABEL[STAGE[m]];

  FS.mount = function (canvas, getMonth, opts) {
    opts = opts || {};
    canvas._alive = true;
    const ctx = canvas.getContext('2d');
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let W = 0, H = 0, raf = 0;
    const t0 = performance.now();
    const flakes = Array.from({ length: 60 }, (_, i) => ({ x: (i * 97) % 1000 / 1000, y: (i * 61) % 1000 / 1000, s: 0.6 + (i % 5) * 0.35, v: 0.3 + (i % 7) * 0.08 }));

    function size() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = canvas.clientWidth; H = canvas.clientHeight;
      if (!W || !H) return;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function mountain(base, amp, seed, color) {
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, base + 30);
      for (let x = 0; x <= W; x += 10) ctx.lineTo(x, base - amp * (0.55 + 0.45 * Math.sin(x * 0.012 + seed) * Math.cos(x * 0.005 + seed * 2)));
      ctx.lineTo(W, base + 30); ctx.closePath(); ctx.fill();
    }
    function draw(t) {
      if (!W || !H) { if (canvas.clientWidth) size(); return; }
      const m = getMonth(), st = STAGE[m], sky = SKY[m];
      const hz = H * 0.42;
      let g = ctx.createLinearGradient(0, 0, 0, hz);
      g.addColorStop(0, sky[0]); g.addColorStop(1, sky[1]);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, hz + 1);
      // 太陽と雲
      if (st !== 0) {
        ctx.fillStyle = m >= 8 && m <= 10 ? '#ffd27a' : '#fff4c2';
        ctx.beginPath(); ctx.arc(W * 0.82, H * 0.14, 14, 0, 7); ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      for (let i = 0; i < 4; i++) {
        const x = ((i * 260 + t * 0.008 * (1 + i * 0.3)) % (W + 160)) - 80, y = H * (0.08 + 0.06 * (i % 2));
        ctx.beginPath(); ctx.ellipse(x, y, 34, 9, 0, 0, 7); ctx.ellipse(x + 20, y - 6, 22, 9, 0, 0, 7); ctx.fill();
      }
      // 山（冬は雪をかぶる）
      mountain(hz, H * 0.2, 1.3, st === 0 ? '#c9d3de' : m >= 9 && m <= 11 ? '#9c8a6e' : '#7fa57a');
      mountain(hz + 4, H * 0.12, 3.1, st === 0 ? '#e8edf2' : m >= 9 && m <= 11 ? '#b39a6b' : '#5f8f58');
      // 家
      ctx.fillStyle = '#7a4b2a'; ctx.fillRect(W * 0.08, hz - 16, 30, 16);
      ctx.fillStyle = st === 0 ? '#f2f5f8' : '#9b3b2e';
      ctx.beginPath(); ctx.moveTo(W * 0.08 - 5, hz - 16); ctx.lineTo(W * 0.08 + 15, hz - 30); ctx.lineTo(W * 0.08 + 35, hz - 16); ctx.fill();
      // 田んぼ（地面）
      const ground = { 0: ['#f1f4f7', '#dfe5ea'], 1: ['#8a6a4a', '#6a4c33'], 2: ['#8fb3c9', '#6b8ea4'], 3: ['#8fb3c9', '#6b8ea4'], 4: ['#6fae4f', '#3f7f31'],
        5: ['#8fb24c', '#5f8a2d'], 6: ['#e8bd52', '#c08a26'], 7: ['#d9c38a', '#b49a5c'], 8: ['#8b6b48', '#6a4c33'] }[st];
      g = ctx.createLinearGradient(0, hz, 0, H);
      g.addColorStop(0, ground[0]); g.addColorStop(1, ground[1]);
      ctx.fillStyle = g; ctx.fillRect(0, hz, W, H - hz);
      // あぜ道（区画）
      ctx.strokeStyle = st === 0 ? 'rgba(255,255,255,.7)' : 'rgba(80,60,30,.35)'; ctx.lineWidth = 2;
      [0.58, 0.78].forEach((f) => { ctx.beginPath(); ctx.moveTo(0, H * f); ctx.lineTo(W, H * f); ctx.stroke(); });
      for (let i = -6; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + i * 40, hz); ctx.lineTo(W / 2 + i * 190, H); ctx.stroke(); }
      // 水面のきらめき
      if (st === 2 || st === 3) {
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        for (let i = 0; i < 18; i++) { const x = (i * 137 + t * 0.02) % W, y = hz + 10 + (i * 53) % (H - hz - 14); ctx.fillRect(x, y, 14, 1.5); }
      }
      // 稲
      if (st >= 3 && st <= 7) {
        const hgt = { 3: 5, 4: 14, 5: 20, 6: 20, 7: 3 }[st];
        const col = { 3: '#5fae45', 4: '#3e8f34', 5: '#5d8f2a', 6: '#e0a933', 7: '#c9b077' }[st];
        const head = st === 5 ? '#c9c25a' : st === 6 ? '#f5cc5c' : null;
        for (let r = 0; r < 9; r++) {
          const f = r / 8, y = hz + 6 + (H - hz - 6) * Math.pow(f, 1.3), sc = 0.35 + f * 0.9;
          const n = Math.round(14 + f * 16);
          for (let i = 0; i < n; i++) {
            const x = (i + (r % 2) * 0.5) / n * (W + 40) - 20;
            const sway = reduce ? 0 : Math.sin(t * 0.002 + i * 0.7 + r) * 2 * sc;
            ctx.strokeStyle = col; ctx.lineWidth = 1.4 * sc;
            for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(x + k * 2 * sc, y); ctx.lineTo(x + k * 3.5 * sc + sway, y - hgt * sc); ctx.stroke(); }
            if (head) { ctx.fillStyle = head; ctx.beginPath(); ctx.ellipse(x + sway + 2 * sc, y - hgt * sc + 1, 2.6 * sc, 1.6 * sc, 0.5, 0, 7); ctx.fill(); }
          }
        }
      }
      // 稲刈りのあと：はさがけ（稲を干す棚）
      if (st === 7) {
        for (let i = 0; i < 3; i++) {
          const x = W * (0.3 + i * 0.2), y = hz + 24 + i * 6;
          ctx.fillStyle = '#6b4a2a'; ctx.fillRect(x, y - 18, 2, 20); ctx.fillRect(x + 60, y - 18, 2, 20);
          ctx.fillStyle = '#d7aa4a'; ctx.fillRect(x - 2, y - 20, 66, 10);
        }
      }
      // 機械：田植え（5月）・稲刈り（9〜10月）
      if (m === 5 || m === 9 || m === 10) {
        const x = (t * 0.03) % (W + 80) - 40, y = H * 0.7;
        ctx.fillStyle = m === 5 ? '#d84a3a' : '#e8a12a';
        ctx.fillRect(x, y - 14, 34, 12); ctx.fillRect(x + 20, y - 24, 12, 10);
        ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(x + 7, y, 5, 0, 7); ctx.arc(x + 27, y, 5, 0, 7); ctx.fill();
      }
      // 雪・雨
      if (st === 0) {
        ctx.fillStyle = 'rgba(255,255,255,.9)';
        flakes.forEach((f) => { const x = ((f.x * W + Math.sin(t * 0.001 + f.y * 9) * 10) % W + W) % W, y = ((f.y * H + t * 0.02 * f.v) % H); ctx.beginPath(); ctx.arc(x, y, f.s * 1.6, 0, 7); ctx.fill(); });
      } else if (opts.rain && opts.rain(m)) {
        ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1;
        flakes.forEach((f) => { const x = (f.x * W + t * 0.05) % W, y = (f.y * H + t * 0.4 * f.v) % H; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 9); ctx.stroke(); });
      }
    }
    function loop(now) {
      if (!canvas.isConnected) { canvas._alive = false; window.removeEventListener('resize', size); return; }
      draw(now - t0);
      if (!reduce) raf = requestAnimationFrame(loop);
    }
    window.addEventListener('resize', size);
    requestAnimationFrame(() => { size(); draw(0); if (!reduce) raf = requestAnimationFrame(loop); });
    canvas._redraw = () => { if (reduce) draw(0); };
    void raf;
  };
})(window.RG = window.RG || {});
