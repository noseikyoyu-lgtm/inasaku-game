// 効果音とBGM（音のファイルは使わず、ブラウザで合成する）
// 最初にどこかを押したときに鳴らせるようになる（ブラウザの決まり）
// BGM は場面ごとの曲（タイトル・物語・計画・四季・梅雨・試練・決算・エンディングなど）を、画面が変わるたびにフェードで切り替える
// 多くの場面は2〜3曲あり、年ごとに順番に変わる（タイトルは4曲からランダム）
(function (RG) {
  'use strict';
  const SD = RG.sound = {};
  const KEY = 'inasaku.sound';
  let ctx = null, master = null, bgmBus = null, sfxBus = null, noiseBuf = null;

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
    bgmBus = ctx.createGain(); bgmBus.gain.value = 0; bgmBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master);
    // 打楽器・風の音に使うノイズ
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }
  const N = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDIの番号 → 周波数

  // ---------- 音の部品 ----------
  function env(g, start, dur, v, att, rel) {
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(v, start + (att || 0.01));
    g.gain.setValueAtTime(v, Math.max(start + (att || 0.01), start + dur - (rel || 0.05)));
    g.gain.exponentialRampToValueAtTime(0.0008, start + dur + (rel || 0.05));
  }
  function osc(type, freq, start, dur, vol, out, o) {
    o = o || {};
    const os = ctx.createOscillator(), g = ctx.createGain();
    os.type = type;
    os.frequency.setValueAtTime(freq, start);
    if (o.slide) os.frequency.exponentialRampToValueAtTime(o.slide, start + dur);
    if (o.detune) os.detune.value = o.detune;
    if (o.vib) { // ゆれ（ビブラート）
      const l = ctx.createOscillator(), lg = ctx.createGain();
      l.frequency.value = o.vib; lg.gain.value = freq * 0.012;
      l.connect(lg); lg.connect(os.frequency); l.start(start); l.stop(start + dur + 0.3);
    }
    let node = os;
    if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(o.lp, start); if (o.lpTo) f.frequency.exponentialRampToValueAtTime(o.lpTo, start + dur); os.connect(f); node = f; }
    env(g, start, dur, vol, o.att, o.rel);
    node.connect(g); g.connect(out || sfxBus);
    os.start(start); os.stop(start + dur + (o.rel || 0.05) + 0.05);
  }
  function noise(start, dur, vol, out, o) {
    o = o || {};
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf;
    f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.freq || 1000, start); f.Q.value = o.q || 1;
    if (o.freqTo) f.frequency.exponentialRampToValueAtTime(o.freqTo, start + dur);
    env(g, start, dur, vol, o.att || 0.005, o.rel || 0.04);
    s.connect(f); f.connect(g); g.connect(out || sfxBus);
    s.start(start, Math.random() * 0.5); s.stop(start + dur + 0.1);
  }

  // 楽器（BGM と効果音で共通）
  const INST = {
    koto: (f, t, d, v, out) => { osc('triangle', f, t, Math.min(d, 0.9), v, out, { rel: 0.35 }); osc('sawtooth', f, t, 0.12, v * 0.25, out, { lp: 3000, lpTo: 600 }); },
    pluck: (f, t, d, v, out) => osc('square', f, t, Math.min(d, 0.35), v * 0.6, out, { lp: 2400, lpTo: 400, rel: 0.12 }),
    flute: (f, t, d, v, out) => { osc('sine', f, t, d, v, out, { att: 0.06, vib: 5.5, rel: 0.12 }); noise(t, Math.min(d, 0.12), v * 0.15, out, { freq: f * 2, q: 4 }); },
    bell: (f, t, d, v, out) => { osc('sine', f, t, 0.9, v, out, { rel: 0.6 }); osc('sine', f * 2.01, t, 0.5, v * 0.35, out, { rel: 0.3 }); osc('sine', f * 3.02, t, 0.25, v * 0.15, out, { rel: 0.15 }); },
    lead: (f, t, d, v, out) => osc('triangle', f, t, d, v, out, { vib: 5, rel: 0.08 }),
    pad: (f, t, d, v, out) => { osc('sawtooth', f, t, d, v * 0.35, out, { att: 0.35, rel: 0.6, lp: 900, detune: -7 }); osc('sawtooth', f, t, d, v * 0.35, out, { att: 0.35, rel: 0.6, lp: 900, detune: 7 }); },
    bass: (f, t, d, v, out) => osc('triangle', f, t, d, v, out, { rel: 0.1 }),
    taiko: (f, t, d, v, out) => { osc('sine', 150, t, 0.35, v, out, { slide: 45, rel: 0.2 }); noise(t, 0.06, v * 0.5, out, { type: 'lowpass', freq: 600 }); },
    kick: (f, t, d, v, out) => osc('sine', 110, t, 0.18, v, out, { slide: 40, rel: 0.08 }),
    snare: (f, t, d, v, out) => noise(t, 0.12, v, out, { freq: 1800, q: 0.8 }),
    hat: (f, t, d, v, out) => noise(t, 0.03, v, out, { type: 'highpass', freq: 7000 }),
    kane: (f, t, d, v, out) => { osc('square', 1650, t, 0.12, v * 0.35, out, { lp: 5000, rel: 0.15 }); osc('square', 2330, t, 0.1, v * 0.25, out, { lp: 6000, rel: 0.12 }); },
    mushi: (f, t, d, v, out) => { for (let i = 0; i < 4; i++) osc('sine', 4200, t + i * 0.045, 0.025, v, out, { att: 0.005, rel: 0.015 }); }, // 秋の虫の声
    drop: (f, t, d, v, out) => { const fr = 1300 + Math.random() * 1500; osc('sine', fr, t, 0.07, v, out, { slide: fr * 1.6, rel: 0.06 }); }, // 雨のしずく
  };

  // ---------- 効果音 ----------
  const sfx = (inst, notes, step, vol) => (t) => notes.forEach((n, i) => { if (n) INST[inst](N(n), t + i * step, step * 1.6, vol); });
  const SFX = {
    click: (t) => osc('square', 880, t, 0.04, 0.08, sfxBus, { lp: 3000 }),
    tab: (t) => osc('sine', 660, t, 0.06, 0.12, sfxBus, { slide: 990 }),
    pop: (t) => { osc('sine', 520, t, 0.08, 0.18, sfxBus, { slide: 1040 }); },
    step: (t) => { INST.koto(N(72), t, 0.1, 0.16); INST.koto(N(79), t + 0.07, 0.15, 0.16); },
    tick: (t) => osc('triangle', 1200 + Math.random() * 600, t, 0.03, 0.1),
    roll: (t) => { for (let i = 0; i < 6; i++) noise(t + i * 0.05, 0.03, 0.25, sfxBus, { freq: 2500 + Math.random() * 2000, q: 3 }); },
    good: sfx('bell', [72, 76, 79, 84], 0.09, 0.2),
    great: (t) => { sfx('bell', [72, 76, 79, 84, 79, 84, 88], 0.08, 0.2)(t); INST.kane(0, t + 0.56, 0, 0.3); },
    bad: (t) => [64, 61, 57].forEach((n, i) => osc('sawtooth', N(n), t + i * 0.14, 0.2, 0.14, sfxBus, { lp: 1600 })),
    coin: (t) => { osc('square', N(83), t, 0.07, 0.14, sfxBus, { lp: 4000 }); osc('square', N(88), t + 0.07, 0.25, 0.14, sfxBus, { lp: 4000, rel: 0.2 }); },
    buy: (t) => { noise(t, 0.05, 0.3, sfxBus, { freq: 3000, q: 2 }); osc('square', N(88), t + 0.05, 0.08, 0.12, sfxBus, { lp: 5000 }); osc('square', N(93), t + 0.12, 0.3, 0.12, sfxBus, { lp: 5000, rel: 0.25 }); },
    stamp: (t) => { INST.taiko(0, t, 0, 0.35); noise(t, 0.05, 0.2, sfxBus, { type: 'lowpass', freq: 900 }); },
    unlock: (t) => { sfx('bell', [79, 83, 86, 91, 95], 0.06, 0.16)(t); for (let i = 0; i < 8; i++) osc('sine', 2000 + Math.random() * 2500, t + 0.3 + i * 0.04, 0.08, 0.04); },
    medal: (t) => { sfx('lead', [67, 72, 76, 79, 84], 0.07, 0.18)(t); INST.kane(0, t + 0.36, 0, 0.35); INST.bell(N(84), t + 0.4, 0.6, 0.18); },
    warn: (t) => [0, 0.22].forEach((d) => { osc('square', N(76), t + d, 0.1, 0.1, sfxBus, { lp: 2500 }); osc('square', N(71), t + d + 0.1, 0.1, 0.1, sfxBus, { lp: 2500 }); }),
    harvest: (t) => { noise(t, 0.35, 0.18, sfxBus, { freq: 600, freqTo: 3000, q: 1.5 }); INST.koto(N(79), t + 0.25, 0.2, 0.16); INST.koto(N(84), t + 0.35, 0.3, 0.16); },
    error: (t) => osc('sawtooth', 140, t, 0.18, 0.12, sfxBus, { lp: 900 }),
    ping: (t) => INST.bell(N(88), t, 0.3, 0.1),
    gong: (t) => { osc('sine', 98, t, 2.2, 0.35, sfxBus, { rel: 1.2 }); osc('sine', 147.5, t, 1.6, 0.18, sfxBus, { rel: 1 }); osc('sine', 233, t, 1.2, 0.1, sfxBus, { rel: 0.8 }); noise(t, 0.15, 0.15, sfxBus, { type: 'lowpass', freq: 500 }); },
    whoosh: (t) => noise(t, 0.4, 0.2, sfxBus, { freq: 400, freqTo: 4000, q: 0.8 }),
    fanfare: (t) => { [[67, 0], [72, 0.12], [76, 0.24], [79, 0.36], [76, 0.56], [79, 0.68], [84, 0.8]].forEach(([n, d]) => INST.lead(N(n), t + d, d >= 0.8 ? 0.6 : 0.14, 0.2)); INST.taiko(0, t, 0, 0.3); INST.taiko(0, t + 0.8, 0, 0.4); INST.kane(0, t + 0.8, 0, 0.3); },
    title: sfx('koto', [62, 66, 69, 74], 0.1, 0.18),
  };

  SD.play = function (name) {
    if (!SD.settings.sfx || !SFX[name] || !ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
    SFX[name](ctx.currentTime + 0.01);
  };
  // 会話の声（話す人ごとに高さを変えた「ぽぽぽ」）
  const VOICE = { jiichan: 52, kucho: 55, takahashi: 64, kimura: 64, yamane: 50, sato: 57, aoki: 62, kenta: 67, oyama: 55, ogawa: 69, tamura: 58, haruka: 72, narr: 0 };
  SD.voice = function (who) {
    if (!SD.settings.sfx || !ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
    const base = VOICE[who] == null ? 62 : VOICE[who], t = ctx.currentTime + 0.01;
    if (!base) { noise(t, 0.25, 0.06, sfxBus, { freq: 900, freqTo: 1600, q: 0.7 }); return; }
    [0, 2, -1, 3].forEach((d, i) => osc('triangle', N(base + 12 + d), t + i * 0.06, 0.05, 0.07, sfxBus, { lp: 2500 }));
  };

  // ---------- BGM の曲 ----------
  // 音符は [MIDI番号, 長さ（16分音符いくつ分）]。0 は休み。どのパートも1周の長さをそろえる
  const seq = (list) => { const out = []; list.forEach(([n, len]) => { out.push(n ? [n, len] : null); for (let i = 1; i < len; i++) out.push(null); }); return out; };
  const hold = (notes, len) => seq(notes.map((n) => [n, len]));
  const chords = (list, len) => { const out = []; list.forEach((c) => { out.push([c, len]); for (let i = 1; i < len; i++) out.push(null); }); return out; };
  const beat = (bars, hits, size) => { const out = []; size = size || 16; for (let b = 0; b < bars; b++) for (let i = 0; i < size; i++) out.push(hits.indexOf(i) >= 0 ? [1, 1] : null); return out; };
  // 3拍子の伴奏（1拍目は休み、2・3拍目に和音）
  const waltz = (list) => [].concat.apply([], list.map((c) => [null, null, null, null, [c, 4], null, null, null, [c, 4], null, null, null]));
  const arp = (chordList, pattern, len) => seq([].concat.apply([], chordList.map((c) => pattern.map((i) => [c[i], len]))));

  const TRACKS = {
    // タイトル：雄大に。琴と和太鼓
    title: { bpm: 72, parts: [
      { inst: 'koto', vol: 0.32, notes: seq([[74, 4], [76, 2], [78, 2], [81, 6], [78, 2], [76, 4], [74, 2], [71, 2], [74, 8], [69, 4], [71, 2], [74, 2], [76, 4], [78, 4], [76, 6], [74, 2], [74, 8]]) },
      { inst: 'pad', vol: 0.22, chord: true, notes: chords([[62, 66, 69], [59, 62, 66], [55, 59, 62], [57, 62, 64]], 16) },
      { inst: 'bass', vol: 0.4, notes: hold([38, 45, 35, 42, 31, 38, 33, 40], 8) },
      { inst: 'taiko', vol: 0.35, notes: beat(4, [0, 10]) },
    ] },
    // 物語：あたたかく、少しせつなく
    story: { bpm: 64, parts: [
      { inst: 'flute', vol: 0.26, notes: seq([[72, 6], [74, 2], [77, 4], [76, 4], [74, 8], [72, 8], [69, 6], [72, 2], [74, 4], [77, 4], [76, 4], [74, 4], [72, 8]]) },
      { inst: 'bell', vol: 0.12, notes: arp([[65, 69, 72], [62, 65, 69], [58, 62, 65], [60, 64, 67]], [0, 1, 2, 1, 0, 1, 2, 1], 2) },
      { inst: 'pad', vol: 0.2, chord: true, notes: chords([[53, 57, 60], [50, 53, 57], [46, 50, 53], [48, 52, 55]], 16) },
      { inst: 'bass', vol: 0.35, notes: hold([41, 38, 34, 36], 16) },
    ] },
    // 計画：のどかな田園
    field: { bpm: 104, parts: [
      { inst: 'lead', vol: 0.3, notes: seq([[72, 2], [0, 2], [74, 2], [76, 2], [79, 2], [0, 2], [76, 2], [74, 2], [72, 2], [0, 2], [69, 2], [72, 2], [74, 2], [0, 6],
        [76, 2], [0, 2], [79, 2], [81, 2], [79, 2], [0, 2], [76, 2], [74, 2], [76, 2], [0, 2], [74, 2], [72, 2], [72, 2], [0, 6]]) },
      { inst: 'bell', vol: 0.08, notes: arp([[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]], [0, 1, 2, 1], 4) },
      { inst: 'bass', vol: 0.4, notes: hold([48, 55, 52, 55, 45, 52, 50, 55], 8) },
      { inst: 'hat', vol: 0.04, notes: beat(4, [4, 12]) },
    ] },
    // 春（3〜6月）：明るく、篠笛と軽いリズム
    spring: { bpm: 112, parts: [
      { inst: 'flute', vol: 0.24, notes: seq([[74, 2], [76, 2], [79, 4], [76, 2], [74, 2], [71, 4], [69, 2], [71, 2], [74, 4], [71, 4], [67, 4],
        [74, 2], [76, 2], [79, 2], [81, 2], [79, 4], [76, 4], [74, 2], [71, 2], [69, 4], [67, 8]]) },
      { inst: 'pluck', vol: 0.16, notes: arp([[55, 59, 62], [52, 55, 59], [48, 52, 55], [50, 54, 57]], [0, 1, 2, 1, 0, 1, 2, 1], 2) },
      { inst: 'bass', vol: 0.38, notes: hold([43, 50, 40, 47, 36, 43, 38, 45], 8) },
      { inst: 'kick', vol: 0.3, notes: beat(4, [0, 8]) },
      { inst: 'hat', vol: 0.05, notes: beat(4, [2, 6, 10, 14]) },
    ] },
    // 夏（7〜8月）：力強く、三味線のような音と太鼓
    summer: { bpm: 124, parts: [
      { inst: 'pluck', vol: 0.3, notes: seq([[69, 2], [72, 2], [74, 2], [76, 2], [74, 2], [72, 2], [69, 4], [67, 2], [69, 2], [72, 4], [69, 4], [67, 2], [64, 2],
        [76, 2], [79, 2], [76, 2], [74, 2], [72, 4], [74, 4], [72, 2], [69, 2], [67, 4], [69, 8]]) },
      { inst: 'bass', vol: 0.4, notes: hold([45, 45, 45, 45, 43, 43, 43, 43, 41, 41, 41, 41, 40, 40, 40, 40], 4) },
      { inst: 'taiko', vol: 0.3, notes: beat(4, [0, 6, 8, 12]) },
      { inst: 'kane', vol: 0.12, notes: beat(4, [4, 12]) },
      { inst: 'hat', vol: 0.04, notes: beat(4, [2, 6, 10, 14]) },
    ] },
    // 秋（9〜11月）：収穫のお祭り
    harvest: { bpm: 132, parts: [
      { inst: 'flute', vol: 0.26, notes: seq([[72, 2], [74, 2], [76, 4], [79, 2], [76, 2], [74, 4], [72, 2], [69, 2], [72, 4], [74, 8],
        [76, 2], [79, 2], [81, 4], [79, 2], [76, 2], [74, 4], [76, 2], [74, 2], [72, 4], [72, 8]]) },
      { inst: 'bass', vol: 0.4, notes: hold([48, 60, 48, 60, 45, 57, 45, 57, 41, 53, 41, 53, 43, 55, 43, 55], 4) },
      { inst: 'taiko', vol: 0.3, notes: beat(4, [0, 3, 6, 8, 11, 14]) },
      { inst: 'kane', vol: 0.16, notes: beat(4, [2, 6, 10, 14]) },
    ] },
    // 冬（12〜2月）：静かなオルゴール
    winter: { bpm: 70, parts: [
      { inst: 'bell', vol: 0.18, notes: seq([[76, 4], [74, 4], [72, 4], [67, 4], [69, 4], [72, 4], [74, 8], [76, 4], [79, 4], [76, 4], [74, 4], [72, 16]]) },
      { inst: 'pad', vol: 0.16, chord: true, notes: chords([[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50]], 16) },
    ] },
    // 試練の年・勝負：緊張感（都節）
    tension: { bpm: 100, parts: [
      { inst: 'pluck', vol: 0.24, notes: seq([[64, 2], [65, 2], [69, 2], [71, 2], [72, 4], [71, 2], [69, 2], [65, 4], [64, 4], [0, 8],
        [76, 2], [77, 2], [76, 2], [72, 2], [71, 4], [69, 4], [65, 2], [64, 2], [65, 4], [64, 8]]) },
      { inst: 'bass', vol: 0.42, notes: hold([40, 0, 40, 41], 4).concat(hold([40, 0, 40, 41], 4), hold([45, 0, 45, 46], 4), hold([40, 0, 40, 41], 4)) },
      { inst: 'taiko', vol: 0.32, notes: beat(4, [0, 3]) },
      { inst: 'pad', vol: 0.14, chord: true, notes: chords([[52, 53, 57], [52, 53, 57], [57, 58, 62], [52, 53, 59]], 16) },
    ] },
    // 運だめし：わくわく
    dice: { bpm: 140, parts: [
      { inst: 'pluck', vol: 0.24, notes: arp([[72, 76, 79], [74, 77, 81], [72, 76, 79], [71, 74, 79]], [0, 1, 2, 1, 2, 1, 0, 1], 2) },
      { inst: 'bass', vol: 0.36, notes: hold([48, 0, 48, 55, 50, 0, 50, 57, 48, 0, 48, 55, 43, 0, 47, 50], 4) },
      { inst: 'kick', vol: 0.28, notes: beat(4, [0, 8]) },
      { inst: 'snare', vol: 0.1, notes: beat(4, [4, 12]) },
      { inst: 'hat', vol: 0.05, notes: beat(4, [2, 6, 10, 14]) },
    ] },
    // 章の扉：勇ましく
    chapter: { bpm: 84, parts: [
      { inst: 'flute', vol: 0.28, notes: seq([[74, 4], [76, 2], [78, 2], [81, 6], [78, 2], [76, 4], [74, 2], [71, 2], [74, 8], [69, 4], [71, 2], [74, 2], [76, 4], [78, 4], [81, 6], [78, 2], [74, 8]]) },
      { inst: 'pad', vol: 0.22, chord: true, notes: chords([[62, 66, 69], [59, 62, 66], [55, 59, 62], [57, 61, 64]], 16) },
      { inst: 'bass', vol: 0.4, notes: hold([38, 38, 35, 35, 31, 31, 33, 33], 8) },
      { inst: 'taiko', vol: 0.36, notes: beat(4, [0, 6, 8, 11, 12, 14]) },
    ] },
    // 決算・中間評価：ふり返り
    result: { bpm: 92, parts: [
      { inst: 'bell', vol: 0.2, notes: seq([[79, 4], [76, 4], [74, 4], [76, 4], [79, 4], [81, 4], [79, 8], [76, 4], [74, 4], [71, 4], [74, 4], [76, 8], [79, 8]]) },
      { inst: 'pad', vol: 0.2, chord: true, notes: chords([[55, 59, 62], [52, 55, 59], [48, 52, 55], [50, 54, 57]], 16) },
      { inst: 'bass', vol: 0.36, notes: hold([43, 50, 40, 47, 36, 43, 38, 45], 8) },
      { inst: 'hat', vol: 0.03, notes: beat(4, [4, 12]) },
    ] },
    // エンディング：感動的に
    ending: { bpm: 66, parts: [
      { inst: 'flute', vol: 0.28, notes: seq([[74, 4], [76, 2], [78, 2], [81, 6], [78, 2], [76, 4], [74, 2], [71, 2], [74, 8], [69, 4], [71, 2], [74, 2], [76, 4], [78, 4], [76, 6], [74, 2], [74, 8]]) },
      { inst: 'bell', vol: 0.1, notes: arp([[62, 66, 69], [59, 62, 66], [55, 59, 62], [57, 62, 64]], [0, 1, 2, 1, 0, 1, 2, 1], 2) },
      { inst: 'pad', vol: 0.22, chord: true, notes: chords([[62, 66, 69], [59, 62, 66], [55, 59, 62], [57, 62, 64]], 16) },
      { inst: 'bass', vol: 0.36, notes: hold([38, 35, 31, 33], 16) },
      { inst: 'taiko', vol: 0.2, notes: beat(4, [0]) },
    ] },
    // 経営終了（続けられなかったとき）：しずかに
    sad: { bpm: 58, parts: [
      { inst: 'flute', vol: 0.24, notes: seq([[76, 8], [77, 4], [76, 4], [72, 8], [71, 8], [69, 8], [71, 4], [72, 4], [71, 16]]) },
      { inst: 'pad', vol: 0.2, chord: true, notes: chords([[57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]], 16) },
      { inst: 'bass', vol: 0.32, notes: hold([45, 41, 38, 40], 16) },
    ] },

    // ----- 同じ場面の別の曲（年ごとに切り替わる） -----
    // タイトル2「月夜の田んぼ」：琴と秋の虫
    title2: { bpm: 66, parts: [
      { inst: 'koto', vol: 0.3, notes: seq([[81, 4], [79, 2], [76, 2], [74, 8], [76, 4], [79, 4], [81, 4], [83, 4], [81, 6], [79, 2], [76, 8], [74, 4], [76, 4], [71, 8],
        [69, 4], [71, 2], [74, 2], [76, 8], [79, 4], [76, 4], [74, 4], [71, 4], [69, 6], [71, 2], [74, 4], [76, 4], [74, 16]]) },
      { inst: 'pad', vol: 0.18, chord: true, notes: chords([[62, 66, 69], [64, 67, 71], [62, 67, 71], [62, 66, 71], [62, 64, 69], [62, 67, 71], [64, 67, 71], [62, 66, 69]], 16) },
      { inst: 'bass', vol: 0.34, notes: hold([38, 40, 43, 35, 33, 31, 40, 38], 16) },
      { inst: 'mushi', vol: 0.05, notes: beat(8, [6, 13]) },
    ] },
    // タイトル3「朝もやの田んぼ」：篠笛とオルゴール
    title3: { bpm: 80, parts: [
      { inst: 'flute', vol: 0.25, notes: seq([[67, 4], [71, 4], [74, 8], [76, 4], [74, 4], [71, 4], [74, 4], [79, 8], [76, 4], [74, 4], [71, 12], [0, 4],
        [72, 4], [76, 4], [79, 8], [81, 4], [79, 4], [76, 4], [74, 4], [76, 4], [74, 4], [71, 4], [69, 4], [67, 12], [0, 4]]) },
      { inst: 'bell', vol: 0.07, notes: arp([[55, 59, 62], [52, 55, 59], [55, 60, 64], [54, 57, 62], [55, 60, 64], [57, 60, 64], [54, 57, 62], [55, 59, 62]], [0, 1, 2, 1], 4) },
      { inst: 'pad', vol: 0.16, chord: true, notes: chords([[55, 59, 62], [52, 55, 59], [55, 60, 64], [54, 57, 62], [55, 60, 64], [57, 60, 64], [54, 57, 62], [55, 59, 62]], 16) },
      { inst: 'bass', vol: 0.32, notes: hold([43, 40, 36, 38, 36, 45, 38, 43], 16) },
    ] },
    // タイトル4「稲穂の海」：琴と和太鼓でおおらかに
    title4: { bpm: 76, parts: [
      { inst: 'koto', vol: 0.3, notes: seq([[76, 2], [78, 2], [81, 4], [83, 4], [81, 4], [78, 4], [76, 4], [73, 8], [71, 2], [73, 2], [76, 4], [78, 4], [76, 4], [73, 4], [71, 4], [69, 8],
        [76, 2], [78, 2], [81, 4], [83, 4], [85, 4], [83, 4], [81, 4], [78, 8], [76, 4], [78, 4], [73, 4], [71, 4], [69, 16]]) },
      { inst: 'pad', vol: 0.2, chord: true, notes: chords([[57, 61, 64], [54, 57, 61], [57, 62, 66], [56, 59, 64], [57, 61, 64], [57, 62, 66], [56, 59, 64], [57, 61, 64]], 16) },
      { inst: 'bass', vol: 0.36, notes: hold([45, 42, 38, 40, 45, 38, 40, 45], 16) },
      { inst: 'taiko', vol: 0.28, notes: beat(8, [0, 10]) },
    ] },
    // 物語2「ふるさとの記憶」：篠笛と琴の分散和音
    story2: { bpm: 60, parts: [
      { inst: 'flute', vol: 0.25, notes: seq([[71, 6], [72, 2], [74, 8], [76, 4], [74, 4], [71, 8], [69, 6], [71, 2], [72, 4], [74, 4], [71, 16],
        [71, 6], [72, 2], [74, 4], [79, 4], [78, 4], [76, 4], [74, 8], [72, 4], [71, 4], [69, 4], [71, 4], [67, 16]]) },
      { inst: 'koto', vol: 0.1, notes: arp([[55, 59, 62], [52, 55, 59], [57, 60, 64], [55, 59, 62], [55, 59, 62], [54, 57, 62], [55, 60, 64], [55, 59, 62]], [0, 1, 2, 1, 0, 1, 2, 1], 2) },
      { inst: 'pad', vol: 0.14, chord: true, notes: chords([[55, 59, 62], [52, 55, 59], [57, 60, 64], [55, 59, 62], [55, 59, 62], [54, 57, 62], [55, 60, 64], [55, 59, 62]], 16) },
      { inst: 'bass', vol: 0.32, notes: hold([43, 40, 45, 43, 43, 38, 36, 43], 16) },
    ] },
    // 計画2「あぜ道さんぽ」：はずむ足どり
    field2: { bpm: 96, parts: [
      { inst: 'pluck', vol: 0.28, notes: seq([[72, 2], [69, 2], [72, 2], [74, 2], [72, 4], [69, 4], [67, 2], [69, 2], [70, 2], [69, 2], [67, 4], [65, 4],
        [69, 2], [72, 2], [77, 2], [76, 2], [74, 4], [72, 4], [70, 2], [69, 2], [67, 2], [69, 2], [65, 8],
        [74, 2], [72, 2], [74, 2], [77, 2], [76, 4], [74, 4], [72, 2], [70, 2], [69, 2], [70, 2], [72, 8],
        [74, 2], [76, 2], [77, 4], [74, 2], [72, 2], [69, 4], [70, 2], [67, 2], [69, 2], [67, 2], [65, 8]]) },
      { inst: 'bass', vol: 0.36, notes: hold([41, 45, 48, 45, 36, 40, 43, 40, 41, 45, 48, 50, 46, 45, 43, 40, 38, 41, 45, 41, 36, 40, 43, 40, 46, 41, 46, 48, 43, 36, 41, 41], 4) },
      { inst: 'kick', vol: 0.18, notes: beat(8, [0, 8]) },
      { inst: 'hat', vol: 0.04, notes: beat(8, [4, 12]) },
    ] },
    // 計画3「縁側でひと休み」：3拍子のワルツ
    field3: { bpm: 84, parts: [
      { inst: 'flute', vol: 0.24, notes: seq([[74, 8], [76, 2], [74, 2], [71, 8], [67, 4], [69, 4], [71, 4], [72, 4], [74, 12],
        [76, 8], [78, 2], [79, 2], [76, 4], [74, 8], [72, 4], [71, 4], [69, 4], [67, 12]]) },
      { inst: 'koto', vol: 0.14, chord: true, notes: waltz([[59, 62, 67], [59, 64, 67], [60, 64, 69], [57, 62, 66], [60, 64, 67], [59, 62, 67], [57, 62, 66], [59, 62, 67]]) },
      { inst: 'bass', vol: 0.36, notes: hold([43, 40, 45, 38, 36, 43, 38, 43], 12) },
      { inst: 'hat', vol: 0.03, notes: beat(8, [0], 12) },
    ] },
    // 春2「田植えうた」：篠笛の呼びかけに琴が答える
    spring2: { bpm: 104, parts: [
      { inst: 'flute', vol: 0.25, notes: seq([[74, 2], [77, 2], [79, 4], [77, 2], [74, 2], [72, 4], [74, 4], [69, 4], [74, 8], [0, 32],
        [79, 2], [81, 2], [84, 4], [81, 2], [79, 2], [77, 4], [79, 4], [77, 2], [74, 2], [74, 8], [0, 32]]) },
      { inst: 'koto', vol: 0.24, notes: seq([[0, 32], [72, 2], [74, 2], [77, 4], [74, 2], [72, 2], [69, 4], [72, 4], [67, 4], [69, 8],
        [0, 32], [77, 2], [79, 2], [81, 4], [79, 2], [77, 2], [74, 4], [72, 4], [69, 4], [74, 8]]) },
      { inst: 'pad', vol: 0.12, chord: true, notes: chords([[62, 65, 69], [62, 65, 69], [60, 64, 67], [57, 60, 64], [62, 67, 69], [62, 65, 69], [60, 65, 67], [62, 65, 69]], 16) },
      { inst: 'bass', vol: 0.34, notes: hold([38, 38, 36, 33, 38, 38, 36, 38], 16) },
      { inst: 'taiko', vol: 0.26, notes: beat(8, [0, 8]) },
      { inst: 'kane', vol: 0.1, notes: beat(8, [12]) },
    ] },
    // 梅雨（6月）「梅雨のしずく」：雨だれとオルゴール
    tsuyu: { bpm: 72, parts: [
      { inst: 'bell', vol: 0.16, notes: seq([[76, 4], [0, 4], [72, 4], [74, 4], [76, 8], [0, 8], [79, 4], [0, 4], [76, 4], [74, 4], [72, 8], [0, 8],
        [74, 4], [0, 4], [72, 4], [69, 4], [71, 8], [0, 8], [72, 4], [74, 4], [76, 4], [79, 4], [76, 16]]) },
      { inst: 'pad', vol: 0.16, chord: true, notes: chords([[57, 60, 64], [53, 57, 60], [55, 60, 64], [55, 59, 62], [57, 62, 65], [52, 55, 59], [53, 57, 60], [57, 60, 64]], 16) },
      { inst: 'bass', vol: 0.28, notes: hold([45, 41, 48, 43, 38, 40, 41, 45], 16) },
      { inst: 'drop', vol: 0.05, notes: beat(8, [1, 5, 7, 11, 14]) },
    ] },
    // 夏2「盆おどり」：ドン・ドン・ドドンの太鼓と篠笛
    summer2: { bpm: 118, parts: [
      { inst: 'flute', vol: 0.25, notes: seq([[79, 4], [76, 2], [74, 2], [76, 4], [79, 4], [81, 4], [79, 2], [76, 2], [74, 8], [72, 4], [74, 2], [76, 2], [79, 4], [76, 4], [74, 4], [72, 2], [69, 2], [67, 8],
        [69, 4], [72, 2], [74, 2], [76, 4], [74, 4], [76, 4], [79, 2], [81, 2], [79, 8], [76, 4], [74, 2], [72, 2], [74, 4], [76, 4], [74, 4], [69, 2], [72, 2], [67, 8]]) },
      { inst: 'bass', vol: 0.38, notes: hold([43, 50, 43, 50, 43, 50, 43, 50, 48, 55, 48, 55, 43, 50, 43, 50, 48, 55, 48, 55, 43, 50, 43, 50, 38, 45, 38, 45, 43, 50, 43, 43], 4) },
      { inst: 'taiko', vol: 0.3, notes: beat(8, [0, 4, 6]) },
      { inst: 'kane', vol: 0.12, notes: beat(8, [8, 12]) },
      { inst: 'hat', vol: 0.04, notes: beat(8, [2, 10, 14]) },
    ] },
    // 秋2「実りの秋」：琴と虫の声
    harvest2: { bpm: 92, parts: [
      { inst: 'koto', vol: 0.3, notes: seq([[76, 4], [79, 4], [81, 6], [79, 2], [76, 4], [74, 4], [72, 8], [74, 4], [76, 4], [79, 4], [76, 4], [74, 12], [0, 4],
        [72, 4], [74, 4], [76, 6], [79, 2], [81, 4], [84, 4], [81, 8], [79, 4], [76, 4], [74, 4], [76, 4], [72, 12], [0, 4]]) },
      { inst: 'bell', vol: 0.07, notes: arp([[60, 64, 67], [57, 60, 64], [57, 60, 65], [55, 59, 62], [60, 64, 67], [57, 60, 65], [55, 59, 62], [60, 64, 67]], [0, 1, 2, 1], 4) },
      { inst: 'bass', vol: 0.36, notes: hold([48, 55, 45, 52, 41, 48, 43, 50, 48, 55, 41, 48, 43, 50, 48, 48], 8) },
      { inst: 'taiko', vol: 0.15, notes: beat(8, [0]) },
      { inst: 'mushi', vol: 0.04, notes: beat(8, [2, 10]) },
    ] },
    // 冬2「雪の夜」：しんしんと
    winter2: { bpm: 60, parts: [
      { inst: 'bell', vol: 0.17, notes: seq([[69, 4], [72, 4], [76, 8], [74, 4], [72, 4], [71, 8], [69, 4], [72, 4], [77, 8], [76, 16],
        [74, 4], [76, 4], [79, 8], [77, 4], [76, 4], [74, 8], [72, 4], [71, 4], [69, 4], [71, 4], [69, 16]]) },
      { inst: 'pad', vol: 0.14, chord: true, notes: chords([[57, 60, 64], [55, 59, 62], [53, 57, 60], [55, 60, 64], [55, 59, 62], [57, 62, 65], [52, 56, 59], [57, 60, 64]], 16) },
      { inst: 'bass', vol: 0.26, notes: hold([45, 43, 41, 48, 43, 38, 40, 45], 16) },
    ] },
    // 試練2「嵐の前」：刻むリズム
    tension2: { bpm: 120, parts: [
      { inst: 'pluck', vol: 0.24, notes: seq([[64, 2], [64, 2], [67, 2], [64, 2], [71, 4], [69, 4], [67, 2], [66, 2], [64, 4], [0, 8],
        [64, 2], [64, 2], [67, 2], [69, 2], [71, 4], [74, 4], [72, 2], [71, 2], [69, 2], [66, 2], [64, 8]]) },
      { inst: 'bass', vol: 0.4, notes: hold([40, 40, 52, 40, 40, 40, 52, 40, 40, 40, 52, 40, 40, 40, 52, 40, 36, 36, 48, 36, 36, 36, 48, 36, 35, 35, 47, 35, 35, 35, 47, 35], 2) },
      { inst: 'pad', vol: 0.12, chord: true, notes: chords([[52, 55, 59], [52, 55, 59], [48, 52, 55], [47, 51, 54]], 16) },
      { inst: 'kick', vol: 0.24, notes: beat(4, [0, 4, 8, 12]) },
      { inst: 'snare', vol: 0.08, notes: beat(4, [4, 12]) },
      { inst: 'taiko', vol: 0.2, notes: beat(4, [14]) },
    ] },
    // 決算2「帳簿をつける夜」：おだやかに
    result2: { bpm: 84, parts: [
      { inst: 'koto', vol: 0.28, notes: seq([[74, 2], [78, 2], [81, 4], [78, 4], [76, 4], [74, 4], [71, 4], [69, 8], [71, 2], [74, 2], [76, 4], [78, 4], [81, 4], [79, 4], [78, 4], [76, 8],
        [74, 2], [78, 2], [81, 4], [83, 4], [81, 4], [79, 4], [76, 4], [78, 8], [76, 4], [74, 4], [73, 4], [76, 4], [74, 16]]) },
      { inst: 'pad', vol: 0.16, chord: true, notes: chords([[62, 66, 69], [59, 62, 66], [55, 59, 62], [57, 61, 64], [62, 66, 69], [55, 59, 64], [57, 61, 64], [62, 66, 69]], 16) },
      { inst: 'bass', vol: 0.34, notes: hold([38, 45, 35, 42, 31, 38, 33, 40, 38, 45, 40, 47, 33, 40, 38, 38], 8) },
      { inst: 'hat', vol: 0.03, notes: beat(8, [4, 12]) },
    ] },
  };
  SD.TRACKS = Object.keys(TRACKS);
  // 同じ場面で使う曲の組（年ごとに順番に切り替わる。タイトルは開くたび・戻るたびにランダムに選ぶ）
  const VARIANTS = {
    title: ['title', 'title2', 'title3', 'title4'], story: ['story', 'story2'], field: ['field', 'field2', 'field3'],
    spring: ['spring', 'spring2'], summer: ['summer', 'summer2'], harvest: ['harvest', 'harvest2'], winter: ['winter', 'winter2'],
    tension: ['tension', 'tension2'], result: ['result', 'result2'],
  };
  let titlePick = Math.floor(Math.random() * VARIANTS.title.length);
  // タイトルの曲を選び直す（さっきと同じ曲にはしない）
  function rerollTitle() {
    const n = VARIANTS.title.length;
    titlePick = (titlePick + 1 + Math.floor(Math.random() * (n - 1))) % n;
  }
  function variant(base, st) {
    const list = VARIANTS[base];
    if (!list) return base;
    const i = st ? ((st.year || 1) - 1) % list.length : titlePick;
    return list[i];
  }

  // ---------- BGM の再生（先読みスケジューラ） ----------
  let cur = null, step = 0, nextAt = 0, timer = null, pending = null;
  const LEN = (tr) => Math.max.apply(null, tr.parts.map((p) => p.notes.length));
  function schedule() {
    if (!ctx || !cur || !SD.settings.bgm) return;
    const tr = TRACKS[cur], dt = 60 / tr.bpm / 4, len = LEN(tr);
    if (nextAt < ctx.currentTime) nextAt = ctx.currentTime + 0.05;
    while (nextAt < ctx.currentTime + 0.2) {
      const i = step % len;
      tr.parts.forEach((p) => {
        const ev = p.notes[i % p.notes.length];
        if (!ev) return;
        const dur = ev[1] * dt * 0.95;
        if (p.chord) ev[0].forEach((n) => INST[p.inst](N(n), nextAt, dur, p.vol / 2, bgmBus));
        else INST[p.inst](N(ev[0]), nextAt, dur, p.vol, bgmBus);
      });
      step++;
      nextAt += dt;
    }
  }
  function fadeTo(v, sec) {
    const t = ctx.currentTime;
    bgmBus.gain.cancelScheduledValues(t);
    bgmBus.gain.setValueAtTime(bgmBus.gain.value, t);
    bgmBus.gain.linearRampToValueAtTime(v, t + sec);
  }
  const BGM_VOL = 0.22;
  // 曲を切り替える（同じ曲なら何もしない）。フェードアウト→切り替え→フェードイン
  SD.setBgm = function (name) {
    if (!TRACKS[name]) return;
    SD.want = name;
    if (!SD.settings.bgm || !ctx || ctx.state !== 'running') return;
    if (name === cur && !pending) return;
    if (pending) clearTimeout(pending);
    if (!cur) { cur = name; step = 0; nextAt = 0; fadeTo(BGM_VOL, 0.8); ensureTimer(); return; }
    fadeTo(0, 0.5);
    pending = setTimeout(() => { pending = null; cur = SD.want; step = 0; nextAt = 0; fadeTo(BGM_VOL, 0.8); }, 520);
  };
  function ensureTimer() { if (!timer) timer = setInterval(schedule, 50); }
  SD.startBgm = function () {
    if (!SD.settings.bgm || !ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
    ensureTimer();
    if (SD.want && SD.want !== cur) SD.setBgm(SD.want); else if (cur) fadeTo(BGM_VOL, 0.6);
  };
  SD.stopBgm = function () { if (ctx) fadeTo(0, 0.3); cur = null; };
  SD.now = () => cur; // 今鳴っている曲の名前

  // 画面の状態から曲を選ぶ
  SD.trackFor = function (app) {
    const st = app && app.st;
    return variant(baseTrack(st), st);
  };
  function baseTrack(st) {
    if (!st) return 'title';
    const ph = st.phase;
    if (ph === 'scene') return 'story';
    if (ph === 'chapter') return 'chapter';
    if (ph === 'dice') return 'dice';
    if (ph === 'season') {
      const m = st.seasonMonth || 1;
      const trial = RG.era && RG.era.trialOf(st, st.year);
      const crisis = st.seasonPending && RG.dice && RG.dice.pending && RG.dice.pending(st);
      if ((trial && m >= 6 && m <= 9) || (crisis && crisis.month <= m)) return 'tension';
      if (m === 6) return 'tsuyu';
      return m >= 3 && m <= 5 ? 'spring' : m <= 8 && m >= 7 ? 'summer' : m >= 9 && m <= 11 ? 'harvest' : 'winter';
    }
    if (ph === 'result' || ph === 'midterm') return 'result';
    if (ph === 'gameover') return 'sad';
    if (ph === 'end') return RG.scenes && RG.scenes.isStory(st) && RG.scenes.ending(st).kind === 'bad' ? 'sad' : 'ending';
    return 'field';
  }
  // 画面を描くたびに呼ぶ（曲の切り替えと、章の扉などの合図の音）
  let lastPhase = null;
  SD.sync = function (app) {
    const ph = app && app.st ? app.st.phase : 'title';
    if (ph !== lastPhase) {
      if (ph === 'title' && lastPhase) rerollTitle(); // ゲームからタイトルに戻ったら別の曲に
      if (ph === 'chapter') SD.play('gong');
      else if (ph === 'scene' && lastPhase && lastPhase !== 'scene') SD.play('whoosh');
      lastPhase = ph;
    }
    SD.setBgm(SD.trackFor(app));
  };

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
      if (ensure()) { if (ctx.state === 'suspended') ctx.resume().then(() => SD.startBgm()); else SD.startBgm(); }
    };
    document.addEventListener('pointerdown', first, true);
    document.addEventListener('keydown', first, true);
    // ボタンを押したときの小さな音（大きなボタンは「カチッ」、タブやカードは「ぽっ」）
    document.addEventListener('click', (e) => {
      const b = e.target.closest && e.target.closest('button');
      if (!b || b.disabled) return;
      if (b.matches('.btn, .px-btn')) SD.play('click'); else SD.play('tab');
    }, true);
    // 別のタブを見ているあいだは音を止める
    document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else ctx.resume(); });
  };
})(window.RG = window.RG || {});
