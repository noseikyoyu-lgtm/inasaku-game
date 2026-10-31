// ドット絵：スプライトと田んぼの風景（外部画像なし・コードで描画）
(function (RG) {
  'use strict';
  const PX = RG.pixel = {};

  const PAL = {
    k: '#2b2416', s: '#f3c89a', S: '#d9a273', e: '#2b2416', w: '#ffffff', L: '#dfe7ef',
    h: '#f0d27a', H: '#b98e3c', c: '#4c9a3f', C: '#2f6f2a', b: '#3a6ea5', B: '#294f78',
    g: '#b9bec4', G: '#6b7177', r: '#d64541', R: '#9c3b2e', n: '#3b3b55', N: '#262638',
    v: '#5f8f3a', y: '#f2c230', o: '#e98f3a', p: '#6b4a2b', W: '#efe2c4', x: '#7aa7d6',
  };

  PX.SPRITES = {
    shinki: [
      '....cccc....', '...cccccc...', '...ccccccCC.', '...kkkkkk...', '...ssssss...', '...sesses...', '...ssssss...', '....sSSs....',
      '..rrrrrrrr..', '.sbbbbbbbbs.', '.sbbwbbwbbs.', '..bbbbbbbb..', '..bbbbbbbb..', '..bbb..bbb..', '..BBB..BBB..', '..kkk..kkk..',
    ],
    young: [
      '............', '....hhhh....', '...hhhhhh...', '.HHHHHHHHHH.', '...ssssss...', '...sesses...', '...ssssss...', '....sSSs....',
      '..oooooooo..', '.soooooooos.', '.soooooooos.', '..pppppppp..', '..pppppppp..', '..ppp..ppp..', '..ppp..ppp..', '..kkk..kkk..',
    ],
    father: [
      '............', '............', '............', '....gggg....', '...gggggg...', '...gssssg...', '...sesses...', '...sSssSs...',
      '....ssss....', '..vvvvvvvv..', '.svvvvvvvvs.', '..vvvvvvvv.p', '..pppppppp.p', '..ppp..ppp.p', '..ppp..ppp.p', '..kkk..kkk.p',
    ],
    hojin: [
      '............', '...kkkkkk...', '..kkkkkkkk..', '..kssssssk..', '...ssssss...', '...sesses...', '...ssssss...', '....sSSs....',
      '..nnnwwnnn..', '.snnnwrwnnns', '.snnnnrnnnns', '..nnnnnnnn..', '..NNNNNNNN..', '..NNN..NNN..', '..NNN..NNN..', '..kkk..kkk..',
    ],
    self: [
      '............', '....wwww....', '...wwwwww...', '...rrrrrr...', '...ssssss...', '...sesses...', '...ssssss...', '....sSSs....',
      '..cccccccc..', '.sccccccccs.', '.sccwccwccs.', '..cccccccc..', '..pppppppp..', '..ppp..ppp..', '..ppp..ppp..', '..kkk..kkk..',
    ],
    advisor: [
      '............', '....gggg....', '...gggggg...', '..gggggggg..', '..gssssssg..', '...kksskk...', '...ssssss...', '....sSSs....',
      '..wwvvvvww..', '.swvvvvvvws.', '.swvvvvvvws.', '..bbbbbbbb..', '..bbbbbbbb..', '..bbb..bbb..', '..bbb..bbb..', '..kkk..kkk..',
    ],
    farmerA: ['..hhh..', '.hhhhh.', 'HHHHHHH', '..sss..', '.bbbbb.', 's.bbb.s', '..bbb..', '..ppp..', '..p.p..', '.kk.kk.'],
    farmerB: ['..hhh..', '.hhhhh.', 'HHHHHHH', '..sss..', '.bbbbb.', 's.bbb.s', '..bbb..', '..ppp..', '.p...p.', 'kk...kk'],
    tractor: [
      '....kkkk......', '....kxxk......', '....kxxk......', '..rrrrrrrrrr..', '.rrrrrrrrrrrrr', '.rrrrrrrrrrrrr',
      'kkkk.....kk...', 'kGGk....kGGk..', 'kkkk.....kk...',
    ],
    combine: [
      '......kkkk....', '......kxxk....', '......kxxk....', '..yyyyyyyyyyy.', 'ooyyyyyyyyyyyy', 'ooyyyyyyyyyyyy',
      'o.kkkkkkkkkkk.', '..kGkGkGkGkGk.', '..kkkkkkkkkkk.',
    ],
    house: [
      '........kk..........', '.......kRRk.........', '......kRRRRk........', '.....kRRRRRRk.......', '....kRRRRRRRRk......',
      '...kRRRRRRRRRRk.....', '..kRRRRRRRRRRRRk....', '.kkkkkkkkkkkkkkkk...', '..WWWWWWWWWWWWWW....', '..WWkkkWWWWWkkWW....',
      '..WWkxkWWWWWkkWW....', '..WWkkkWWWWWkkWW....', '..WWWWWWWWWWkkWW....', '..WWWWWWWWWWkkWW....', '..pppppppppppppp....',
    ],
    cloud: ['.....wwww.......', '...wwwwwwww.....', '.wwwwwwwwwwwww..', 'wwwwwwwwwwwwwwww', '.LLLLLLLLLLLLLL.'],
    ear: ['....y.....', '...yy.y...', '..yy.yy...', '..y.yy.y..', '...yy.yy..', '....yy....', '....c.....', '....c.....', '...cc.....', '...c......'],
  };

  PX.draw = function (ctx, rows, x, y, opts) {
    opts = opts || {};
    const sc = opts.scale || 1, w = rows[0].length;
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      for (let c = 0; c < w; c++) {
        const ch = row[opts.flip ? w - 1 - c : c];
        if (!ch || ch === '.') continue;
        ctx.fillStyle = (opts.pal && opts.pal[ch]) || PAL[ch];
        ctx.fillRect(x + c * sc, y + r * sc, sc, sc);
      }
    }
  };

  // スプライトを並べた canvas を作る（アバター・アイコン用）
  PX.canvas = function (names, scale, label) {
    const list = names.map((n) => PX.SPRITES[n]);
    const gap = 2;
    const w = list.reduce((s, r) => s + r[0].length, 0) + gap * (list.length - 1);
    const h = Math.max.apply(null, list.map((r) => r.length));
    const cv = document.createElement('canvas');
    cv.width = w * scale; cv.height = h * scale;
    cv.className = 'px-sprite';
    cv.style.width = w * scale + 'px';
    cv.setAttribute('role', 'img');
    cv.setAttribute('aria-label', label || '');
    const ctx = cv.getContext('2d');
    let x = 0;
    list.forEach((rows) => { PX.draw(ctx, rows, x * scale, (h - rows.length) * scale, { scale }); x += rows[0].length + gap; });
    return cv;
  };
  PX.AVATARS = { shinki: ['shinki'], oyamoto: ['young', 'father'], hojin: ['hojin'], advisor: ['advisor'], self: ['self'] };
  PX.avatar = (kind, scale) => PX.canvas(PX.AVATARS[kind], scale || 4, kind);

  // ---------- 風景 ----------
  const W = 240, H = 135, HZ = 72;
  const BANDS = [{ top: 79, bot: 95, sc: 0.6 }, { top: 98, bot: 115, sc: 0.8 }, { top: 118, bot: 135, sc: 1 }];
  const VLEVEE = [[78, 80], [158, 160]];
  const STAGE = { 1: 'snow', 2: 'snow', 3: 'bare', 4: 'water', 5: 'sprout', 6: 'young', 7: 'grown', 8: 'heading', 9: 'golden', 10: 'golden', 11: 'stubble', 12: 'stubble' };
  const SEASON = (m) => (m <= 2 || m === 12 ? 'winter' : m <= 5 ? 'spring' : m <= 8 ? 'summer' : 'autumn');
  const SKY = {
    spring: ['#7cc7f2', '#cfeefc'], summer: ['#3fa6f0', '#b7e3fb'], autumn: ['#f2a65a', '#fde0b0'], winter: ['#8fa9bf', '#dde6ee'],
    rain: ['#6d7f8f', '#b3bfca'], storm: ['#4f5d6a', '#8f9ba6'], cold: ['#8a99a6', '#cfd6dc'], heat: ['#f2b44a', '#fff0c0'],
  };
  const rnd = (i) => { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
  const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const lerp = (a, b, t) => { const A = hex(a), B = hex(b); return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',') + ')'; };
  const rect = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w, h); };

  PX.epoch = typeof performance !== 'undefined' ? performance.now() : 0;
  PX.MONTH_NAMES = ['', '1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  // 結果の天候と月から、その月の空模様を決める
  PX.weatherFor = function (weather, m) {
    if (m === 1 || m === 2 || m === 12) return 'snow';
    if (weather === 'rain' && m >= 6 && m <= 8) return 'rain';
    if (weather === 'cold' && m >= 6 && m <= 8) return 'cold';
    if (weather === 'heat' && (m === 7 || m === 8)) return 'heat';
    if (weather === 'typhoon' && m === 9) return 'storm';
    if (m === 6) return 'rain';
    return 'clear';
  };

  // opts: { month（固定）| なし（季節がめぐる）, weather, cycleMs, onMonth, label }
  PX.scene = function (opts) {
    const st = Object.assign({ cycleMs: 2600, startMonth: 4, weather: 'normal' }, opts || {});
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    cv.className = 'px-scene';
    cv.setAttribute('role', 'img');
    cv.setAttribute('aria-label', st.label || '田んぼの風景');
    const ctx = cv.getContext('2d');
    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let was = false, tries = 0, last = 0, lastMonth = 0;
    const frame = (now) => {
      if (!cv.isConnected) {
        if (was || ++tries > 120) return;
        requestAnimationFrame(frame);
        return;
      }
      was = true;
      if (!last || now - last >= 50) {
        last = now;
        const t = now - PX.epoch;
        const m = st.month || ((st.startMonth - 1 + Math.floor(t / st.cycleMs)) % 12) + 1;
        const p = st.month ? (t % 7000) / 7000 : (t % st.cycleMs) / st.cycleMs;
        if (m !== lastMonth) { lastMonth = m; if (st.onMonth) st.onMonth(m); }
        drawScene(ctx, m, p, t, st.month ? PX.weatherFor(st.weather, m) : PX.weatherFor('normal', m));
      }
      if (!reduce) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    return cv;
  };

  function drawScene(ctx, m, p, t, wx) {
    const season = SEASON(m);
    // 空
    const sky = SKY[wx === 'clear' || wx === 'snow' ? season : wx];
    for (let i = 0; i < 9; i++) rect(ctx, lerp(sky[0], sky[1], i / 8), 0, i * 8, W, 8);
    // 太陽
    if (wx === 'clear' || wx === 'heat') {
      const r = wx === 'heat' ? 11 : 7, cx = 206, cy = season === 'autumn' ? 26 : 20;
      for (let y = -r - 1; y <= r + 1; y++) for (let x = -r - 1; x <= r + 1; x++) {
        const d = x * x + y * y;
        if (d <= r * r) rect(ctx, season === 'winter' ? '#fffbe6' : '#fff6b0', cx + x, cy + y, 1, 1);
        else if (d <= (r + 1.5) * (r + 1.5)) rect(ctx, wx === 'heat' ? '#ff9a3c' : '#ffd84a', cx + x, cy + y, 1, 1);
      }
    }
    // 雲
    const grey = wx === 'rain' || wx === 'storm' || wx === 'cold';
    const nCloud = grey ? 6 : 3;
    for (let i = 0; i < nCloud; i++) {
      const speed = wx === 'storm' ? 0.06 : 0.008 + rnd(i) * 0.006;
      const x = ((t * speed + rnd(i + 3) * 300) % (W + 40)) - 30;
      PX.draw(ctx, PX.SPRITES.cloud, x | 0, 6 + ((rnd(i + 9) * 28) | 0), { pal: grey ? { w: '#a3adb7', L: '#7f8a95' } : null });
    }
    // 遠くの山・近くの丘
    const far = { spring: '#88b98a', summer: '#5d9f5f', autumn: '#b9844f', winter: '#c7d3dd' }[season];
    const near = { spring: '#5f9e57', summer: '#3f8040', autumn: '#9a6436', winter: '#a9b8c4' }[season];
    for (let x = 0; x < W; x += 2) {
      const y1 = Math.round(42 + 8 * Math.sin(x / 21) + 4 * Math.sin(x / 8 + 1));
      rect(ctx, far, x, y1, 2, HZ - y1);
      if ((season === 'winter' || m === 11) && y1 < 40) rect(ctx, '#ffffff', x, y1, 2, 2);
      const y2 = Math.round(60 + 4 * Math.sin(x / 13 + 2) + 3 * Math.sin(x / 5));
      rect(ctx, near, x, y2, 2, HZ - y2);
    }
    // 地面の帯
    const grass = { spring: '#7fbf55', summer: '#5aa743', autumn: '#b49a4c', winter: '#e9eef2' }[season];
    rect(ctx, grass, 0, HZ, W, 7);
    // 木と家
    drawTree(ctx, 44, season);
    PX.draw(ctx, PX.SPRITES.house, 4, HZ - 15, wx === 'snow' ? { pal: { R: '#f4f7f9' } } : null);
    // 田んぼ
    drawFields(ctx, m, p, t, wx);
    // 人と機械
    drawActors(ctx, m, p, t);
    // 天気の粒
    drawParticles(ctx, m, t, wx, season);
  }

  function drawTree(ctx, x, season) {
    rect(ctx, '#6b4a2b', x, HZ - 14, 2, 14);
    if (season === 'winter') {
      rect(ctx, '#6b4a2b', x - 3, HZ - 16, 3, 1); rect(ctx, '#6b4a2b', x + 2, HZ - 18, 3, 1); rect(ctx, '#6b4a2b', x - 1, HZ - 20, 1, 4);
      return;
    }
    const c = { spring: ['#f6b8d0', '#e98fb4'], summer: ['#3f8f3c', '#2f6f2f'], autumn: ['#e07b39', '#c2552a'] }[season];
    const cx = x + 1, cy = HZ - 20, r = 7;
    for (let y = -r; y <= r; y++) for (let xx = -r; xx <= r; xx++) {
      if (xx * xx + y * y > r * r) continue;
      rect(ctx, rnd(xx * 31 + y * 7) > 0.7 ? c[1] : c[0], cx + xx, cy + y, 1, 1);
    }
  }

  function fieldGround(stage) {
    return { snow: '#eef3f6', bare: '#7a5a35', water: '#5fa9cf', sprout: '#6bb2c9', young: '#6aa9a8', grown: '#4f7d36', heading: '#5a7f34', golden: '#a8863f', stubble: '#9b7a49' }[stage];
  }

  function drawFields(ctx, m, p, t, wx) {
    const winter = m <= 2 || m === 12;
    const levee = winter ? '#d7dde2' : m === 3 || m === 11 ? '#9a8a5a' : '#7e9a4a';
    const leveeTop = winter ? '#ffffff' : m === 3 || m === 11 ? '#b5a46d' : '#9cc265';
    // 機械が通った境目（4月：代かき、5月：田植え、10月：稲刈り）
    const mx = -16 + p * (W + 32);
    BANDS.forEach((b, bi) => {
      // 機械は真ん中の田で作業中。手前（上）の田はもう終わり、奥（下）の田はこれから
      const working = m === 4 || m === 5 || m === 10;
      const before = { 4: 'bare', 5: 'water', 10: 'golden' }[m], after = { 4: 'water', 5: 'sprout', 10: 'stubble' }[m];
      const stageAt = (x) => (!working ? STAGE[m] : bi === 0 ? after : bi === 2 ? before : x < mx ? after : before);
      for (let x = 0; x < W; x += 4) rect(ctx, fieldGround(stageAt(x)), x, b.top, 4, b.bot - b.top);
      // 水面のきらめき
      for (let i = 0; i < 26; i++) {
        const x = (rnd(i * 7 + bi) * W) | 0, y = b.top + 2 + ((rnd(i * 13 + bi) * (b.bot - b.top - 4)) | 0);
        const s = stageAt(x);
        if ((s === 'water' || s === 'sprout' || s === 'young') && Math.sin(t / 300 + i) > 0.3) rect(ctx, '#bfe7f5', x, y, 2, 1);
        if (s === 'snow' && rnd(i * 3 + bi) > 0.5) rect(ctx, '#b9b19a', x, y, 1, 1);
      }
      // 稲
      const rows = 3;
      for (let k = 0; k < rows; k++) {
        const y = Math.round(b.top + (k + 1) * ((b.bot - b.top) / (rows + 0.2)));
        for (let x = 3 + (k % 2) * 2; x < W - 1; x += 5) {
          if (VLEVEE.some((v) => x >= v[0] - 1 && x <= v[1] + 1)) continue;
          const sway = wx === 'storm' ? 1 : Math.round(Math.sin(t / 700 + x * 0.25 + k) * 0.6);
          drawPlant(ctx, stageAt(x), x, y, b.sc, sway);
        }
      }
      // あぜ
      rect(ctx, levee, 0, b.top - 3, W, 3);
      rect(ctx, leveeTop, 0, b.top - 3, W, 1);
    });
    VLEVEE.forEach((v) => { rect(ctx, levee, v[0], BANDS[0].top, v[1] - v[0] + 1, H - BANDS[0].top); });
  }

  function drawPlant(ctx, stage, x, y, sc, sway) {
    const hgt = (n) => Math.max(1, Math.round(n * sc));
    switch (stage) {
      case 'sprout': rect(ctx, '#9be36b', x, y - hgt(2), 1, hgt(2)); break;
      case 'young': rect(ctx, '#58b947', x, y - hgt(4), 1, hgt(4)); rect(ctx, '#58b947', x - 1, y - hgt(3), 1, 1); rect(ctx, '#58b947', x + 1, y - hgt(3), 1, 1); break;
      case 'grown':
      case 'heading': {
        const h = hgt(7);
        rect(ctx, '#2f7d32', x, y - h + 1, 1, h - 1);
        rect(ctx, '#3f9a3a', x - 1, y - hgt(5), 1, hgt(4));
        rect(ctx, '#3f9a3a', x + 1, y - hgt(5), 1, hgt(4));
        rect(ctx, stage === 'heading' ? '#c7d34a' : '#4fae45', x + sway, y - h, 1, 1);
        break;
      }
      case 'golden': {
        const h = hgt(6);
        rect(ctx, '#d9a83a', x, y - h + 1, 1, h - 1);
        rect(ctx, '#c9952a', x - 1, y - hgt(4), 1, hgt(3));
        rect(ctx, '#f0c94a', x + 1 + sway, y - h, 1, 2);
        break;
      }
      case 'stubble': rect(ctx, '#c2a46a', x, y - 1, 1, 1); break;
      case 'bare': if ((x + y) % 3 === 0) rect(ctx, '#6a4c2c', x, y - 1, 2, 1); break;
      default: break;
    }
  }

  function drawActors(ctx, m, p, t) {
    const mx = (-16 + p * (W + 32)) | 0;
    const y3 = BANDS[1].top + 3;
    if (m === 4 || m === 5) PX.draw(ctx, PX.SPRITES.tractor, mx - 14, y3 - 2 + ((t / 150) % 2 | 0), { pal: m === 5 ? { r: '#3c7fc0' } : null });
    if (m === 10) PX.draw(ctx, PX.SPRITES.combine, mx - 14, y3 - 2 + ((t / 150) % 2 | 0));
    // 農家さん：冬は家の前、それ以外はあぜ道を行ったり来たり
    let fx, flip;
    if (m <= 2 || m === 12) { fx = 26; flip = false; }
    else {
      const period = 9000, q = (t % period) / period, tri = q < 0.5 ? q * 2 : 2 - q * 2;
      fx = Math.round(84 + tri * 66); flip = q >= 0.5;
    }
    const walking = !(m <= 2 || m === 12);
    const frame = walking && Math.floor(t / 250) % 2 ? PX.SPRITES.farmerB : PX.SPRITES.farmerA;
    PX.draw(ctx, frame, fx, BANDS[2].top - 12, { flip });
  }

  function drawParticles(ctx, m, t, wx, season) {
    if (wx === 'rain' || wx === 'storm') {
      const n = wx === 'storm' ? 110 : 70;
      for (let i = 0; i < n; i++) {
        const x = ((rnd(i) * W + t * (wx === 'storm' ? 0.12 : 0.03)) % W) | 0;
        const y = ((rnd(i + 50) * H + t * 0.16) % H) | 0;
        rect(ctx, '#d6ecff', x, y, 1, 2);
        if (wx === 'storm') rect(ctx, '#d6ecff', x + 1, y + 2, 1, 1);
      }
      if (wx === 'storm') for (let i = 0; i < 6; i++) {
        const x = ((rnd(i + 200) * W + t * 0.25) % (W + 30)) - 30, y = 15 + ((rnd(i + 210) * 90) | 0);
        rect(ctx, 'rgba(255,255,255,.55)', x | 0, y, 18, 1);
      }
    }
    if (wx === 'snow') {
      for (let i = 0; i < 55; i++) {
        const x = ((rnd(i) * W + Math.sin(t / 900 + i) * 4) % W + W) % W;
        const y = (rnd(i + 70) * H + t * 0.012) % H;
        rect(ctx, '#ffffff', x | 0, y | 0, 1, 1);
      }
    }
    if (wx === 'heat') {
      for (let k = 0; k < 3; k++) {
        const y = 66 + k * 5;
        for (let x = 0; x < W; x += 3) if (Math.sin(x / 6 + t / 200 + k) > 0.6) rect(ctx, 'rgba(255,240,200,.6)', x, y, 2, 1);
      }
    }
    if (wx === 'clear' && m === 4) {
      for (let i = 0; i < 14; i++) {
        const q = ((t / 6000 + rnd(i)) % 1);
        const x = 40 + q * 120 + Math.sin(t / 500 + i) * 3, y = 50 + q * 60 + rnd(i + 5) * 10;
        rect(ctx, '#f7c6da', x | 0, y | 0, 1, 1);
      }
    }
    if (wx === 'clear' && (m === 9 || m === 10)) {
      for (let i = 0; i < 5; i++) {
        const x = (((t / 40) * (0.4 + rnd(i) * 0.4) + rnd(i + 1) * W) % W) | 0;
        const y = (70 + Math.sin(t / 400 + i * 2) * 8 + rnd(i + 2) * 20) | 0;
        rect(ctx, '#d4342a', x, y, 3, 1);
        if (Math.floor(t / 80 + i) % 2) rect(ctx, 'rgba(255,255,255,.8)', x + 1, y - 1, 1, 1);
      }
    }
    if (wx === 'clear' && (season === 'summer' || season === 'spring')) {
      for (let i = 0; i < 3; i++) {
        const x = (((t / 30) * (0.5 + rnd(i + 30) * 0.3) + rnd(i + 31) * W) % (W + 20)) - 10, y = 12 + rnd(i + 32) * 20 + Math.sin(t / 300 + i) * 2;
        const up = Math.floor(t / 200 + i) % 2;
        rect(ctx, '#2b2416', x | 0, (y + up) | 0, 1, 1); rect(ctx, '#2b2416', (x + 1) | 0, y | 0, 1, 1); rect(ctx, '#2b2416', (x + 2) | 0, (y + up) | 0, 1, 1);
      }
    }
    if (wx === 'cold') rect(ctx, 'rgba(140,160,180,.15)', 0, 0, W, H);
  }
})(window.RG = window.RG || {});
