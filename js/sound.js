// 効果音とBGM（音のファイルは使わず、ブラウザで合成する）
// 最初にどこかを押したときに鳴らせるようになる（ブラウザの決まり）
(function (RG) {
  'use strict';
  const SD = RG.sound = {};
  const KEY = 'inasaku.sound';
  let ctx = null, master = null, bgmGain = null, bgmTimer = null, bgmStep = 0;

  SD.settings = (function () {
    try { return Object.assign({ sfx: true, bgm: true }, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { return { sfx: true, bgm: true }; }
  })();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(SD.settings)); } catch (e) { /* 無視 */ } }

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    bgmGain = ctx.createGain(); bgmGain.gain.value = 0.12; bgmGain.connect(master);
    return ctx;
  }

  // 1音（矩形波などのピコピコ音）
  function tone(freq, start, dur, opts) {
    opts = opts || {};
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = opts.type || 'square';
    o.frequency.setValueAtTime(freq, start);
    if (opts.slide) o.frequency.linearRampToValueAtTime(opts.slide, start + dur);
    const v = opts.vol == null ? 0.25 : opts.vol;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(v, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, start + dur);
    o.connect(g); g.connect(opts.out || master);
    o.start(start); o.stop(start + dur + 0.02);
  }
  const N = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDIの番号 → 周波数

  const SFX = {
    click: (t) => tone(880, t, 0.05, { vol: 0.12 }),
    step: (t) => { tone(N(72), t, 0.07, { vol: 0.15 }); tone(N(79), t + 0.07, 0.09, { vol: 0.15 }); },
    tick: (t) => tone(1200 + Math.random() * 600, t, 0.03, { vol: 0.1, type: 'triangle' }),
    good: (t) => [72, 76, 79, 84].forEach((n, i) => tone(N(n), t + i * 0.09, 0.16, { vol: 0.2 })),
    great: (t) => [72, 76, 79, 84, 79, 84, 88].forEach((n, i) => tone(N(n), t + i * 0.08, 0.18, { vol: 0.2 })),
    bad: (t) => [64, 61, 57].forEach((n, i) => tone(N(n), t + i * 0.14, 0.22, { vol: 0.2, type: 'sawtooth' })),
    coin: (t) => { tone(N(83), t, 0.07, { vol: 0.18 }); tone(N(88), t + 0.07, 0.25, { vol: 0.18 }); },
    fanfare: (t) => [[67, 0], [72, 0.12], [76, 0.24], [79, 0.36], [76, 0.56], [79, 0.68], [84, 0.8]].forEach(([n, d]) => tone(N(n), t + d, d >= 0.8 ? 0.6 : 0.14, { vol: 0.2 })),
    title: (t) => [[60, 0], [64, 0.1], [67, 0.2], [72, 0.3]].forEach(([n, d]) => tone(N(n), t + d, 0.25, { vol: 0.16, type: 'triangle' })),
  };

  SD.play = function (name) {
    if (!SD.settings.sfx || !SFX[name] || !ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
    SFX[name](ctx.currentTime + 0.01);
  };

  // ---------- BGM：のどかな田園のループ（ペンタトニック） ----------
  const MELODY = [72, 0, 74, 76, 79, 0, 76, 74, 72, 0, 69, 72, 74, 0, 0, 0, 76, 0, 79, 81, 79, 0, 76, 74, 76, 0, 74, 72, 72, 0, 0, 0];
  const BASS = [48, 55, 52, 55, 45, 52, 50, 55];
  function bgmTick() {
    if (!ctx || !SD.settings.bgm) return;
    const t = ctx.currentTime + 0.05, beat = 0.26;
    const n = MELODY[bgmStep % MELODY.length];
    if (n) tone(N(n), t, beat * 0.9, { vol: 0.5, type: 'triangle', out: bgmGain });
    if (bgmStep % 4 === 0) tone(N(BASS[(bgmStep / 4) % BASS.length]), t, beat * 3.5, { vol: 0.45, type: 'sine', out: bgmGain });
    bgmStep++;
  }
  SD.startBgm = function () {
    if (!SD.settings.bgm || bgmTimer || !ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
    bgmTimer = setInterval(bgmTick, 260);
  };
  SD.stopBgm = function () { if (bgmTimer) { clearInterval(bgmTimer); bgmTimer = null; } };

  SD.toggle = function (kind) {
    SD.settings[kind] = !SD.settings[kind];
    save();
    if (kind === 'bgm') { if (SD.settings.bgm) SD.startBgm(); else SD.stopBgm(); }
    return SD.settings[kind];
  };

  // 最初の操作で音を使えるようにし、BGMを始める
  SD.install = function () {
    const first = () => {
      document.removeEventListener('pointerdown', first, true);
      document.removeEventListener('keydown', first, true);
      if (ensure()) { if (ctx.state === 'suspended') ctx.resume(); SD.startBgm(); }
    };
    document.addEventListener('pointerdown', first, true);
    document.addEventListener('keydown', first, true);
    // ボタンを押したときの小さな音
    document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('button.btn, button.px-btn')) SD.play('click'); }, true);
  };
})(window.RG = window.RG || {});
