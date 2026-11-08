// ストーリーのムービー：田んぼの風景（月ごとの絵・夕暮れの絵）に字幕を重ね、映画のように流す
// 上下の黒い帯・ゆっくり動くカメラ・場面の切り替えの暗転・花びらやホタル。タップで次の場面、「とばす」で終わる
(function (RG) {
  'use strict';
  const UI = RG.ui, h = UI.h, U = RG.util;
  const MV = RG.movie = {};

  const area = (st) => U.sum(st.fields, (f) => f.area);
  // 場面（shot）：bg＝'dusk'（夕暮れの田んぼ）か月の数字（その月の田んぼ）か 'black'。pan＝カメラの動き。fx＝花びら・ホタル・雪
  // dur＝長さ（ミリ秒）。text＝大きな字幕、sub＝小さな字幕。card＝タイトルのように中央に大きく出す
  MV.MOVIES = {
    // じいちゃんの田んぼ：はじまり
    prologue: () => [
      { bg: 3, tint: 'dusk', train: true, pan: 'right', dur: 6000, text: '春の夕暮れ。', sub: '久しぶりに、じいちゃんの家に帰ってきた。' },
      { bg: 3, pan: 'in', dur: 5200, text: 'ご先祖さんから受け継いだ、2haの田んぼ。', sub: '雪がとけて、黒い土が顔を出している。' },
      { bg: 4, pan: 'left', fx: 'petal', dur: 5200, text: 'この田んぼを、今年から自分が作る。', sub: '機械の動かし方も、お金のことも、まだ何もわからない。' },
      { bg: 'black', card: true, dur: 3600, text: '米道', sub: '第1話　じいちゃんの田んぼ' },
    ],
    // じいちゃんの田んぼ：初めての稲刈り（1年目の決算の前）
    harvest1: () => [
      { bg: 7, pan: 'in', dur: 4600, text: '夏。', sub: '青々と育った稲が、風にゆれている。' },
      { bg: 8, pan: 'right', fx: 'firefly', dur: 4600, text: '穂が出た。', sub: '毎朝、田んぼを見に行くのが楽しみになった。' },
      { bg: 9, pan: 'left', dur: 4800, text: '秋。田んぼが、黄金色に染まった。', sub: '' },
      { bg: 10, pan: 'out', dur: 5200, text: '初めての稲刈り。', sub: '……自分の米が、とれた。' },
      { bg: 'black', card: true, dur: 3000, text: '1年目の決算', sub: 'この1年の経営を、数字でふり返ろう' },
    ],
    // じいちゃんの田んぼ：エンディング（20年を終えたとき）
    ending: (st) => {
      const wife = st.family.some((f) => f.tag === 'spouse');
      return [
        { bg: 5, pan: 'in', dur: 5000, text: '20年前の春。', sub: '2haの小さな田んぼから、すべてが始まった。' },
        { bg: 7, pan: 'right', fx: 'firefly', dur: 5000, text: wife ? '遥と二人で、田んぼを守ってきた。' : '毎年、田んぼと向き合ってきた。', sub: 'いい年も、悪い年もあった。' },
        { bg: 9, pan: 'left', dur: 5200, text: '今、田んぼは ' + U.ha(area(st)) + '。', sub: '集落の景色の中に、自分の米がある。' },
        { bg: 12, pan: 'out', dur: 5000, text: 'じいちゃん、見とるか。', sub: '' },
        { bg: 'dusk', pan: 'right', dur: 5200, text: '米道', sub: st.farmName + '　20年の物語', card: true },
      ];
    },
  };
  MV.has = (id) => !!MV.MOVIES[id];

  // 花びら・ホタル（CSS の小さな粒）
  function particles(kind) {
    const n = kind === 'firefly' ? 22 : 26, box = h('div', { class: 'mv-fx mv-' + kind, 'aria-hidden': 'true' });
    for (let i = 0; i < n; i++) {
      const s = h('i');
      s.style.left = ((i * 37) % 100) + '%';
      s.style.top = kind === 'firefly' ? 40 + ((i * 53) % 55) + '%' : -((i * 13) % 20) + '%';
      s.style.animationDelay = -((i * 0.73) % 6) + 's';
      s.style.animationDuration = (kind === 'firefly' ? 3 + (i % 5) * 0.7 : 6 + (i % 4) * 1.3) + 's';
      box.appendChild(s);
    }
    return box;
  }

  // 流す。onDone：終わったとき（とばしたときも）
  MV.play = function (id, st, onDone) {
    const shots = (MV.MOVIES[id] || (() => []))(st);
    if (!shots.length) { if (onDone) onDone(); return; }
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let month = 1, idx = -1, timer = 0, done = false;
    const farm = h('canvas', { class: 'mv-bg mv-farm', 'aria-hidden': 'true' });
    const dusk = h('canvas', { class: 'mv-bg mv-dusk', 'aria-hidden': 'true' });
    const cam = h('div', { class: 'mv-cam' }, farm, dusk);
    const fx = h('div', { class: 'mv-fxbox' });
    const tint = h('div', { class: 'dusk-tint mv-tint', 'aria-hidden': 'true' });
    const cap = h('div', { class: 'mv-cap', role: 'status', 'aria-live': 'polite' });
    const fade = h('div', { class: 'mv-fade' });
    const skip = h('button', { type: 'button', class: 'mv-skip', onclick: (e) => { e.stopPropagation(); end(); } }, 'とばす ⏭');
    const root = h('div', { class: 'movie' + (reduce ? ' still' : ''), role: 'dialog', 'aria-label': 'ムービー', onclick: () => next() },
      cam, tint, fx, h('div', { class: 'mv-bar top' }), h('div', { class: 'mv-bar bottom' }), cap, fade, skip);
    document.body.appendChild(root);
    let cur = shots[0];
    if (shots.some((s) => typeof s.bg === 'number')) RG.farmScene.mount(farm, () => month, { train: () => !!cur.train, lit: () => cur.tint === 'dusk', dusk: () => cur.tint === 'dusk' });
    if (shots.some((s) => s.bg === 'dusk')) RG.titleScene.mount(dusk);
    requestAnimationFrame(() => root.classList.add('on'));

    function show(i) {
      const s = cur = shots[i];
      if (typeof s.bg === 'number') { month = s.bg; if (farm._redraw) farm._redraw(); } // 動きを控える設定でも、その月の絵にする
      cam.className = 'mv-cam bg-' + (s.bg === 'dusk' ? 'dusk' : s.bg === 'black' ? 'black' : 'farm') + (s.pan && !reduce ? ' pan-' + s.pan : '');
      void cam.offsetWidth; // カメラの動きを最初から
      tint.classList.toggle('on', s.tint === 'dusk'); // 夕暮れの色
      fx.innerHTML = '';
      if (s.fx && !reduce) fx.appendChild(particles(s.fx));
      cap.innerHTML = '';
      cap.className = 'mv-cap' + (s.card ? ' card' : '');
      cap.appendChild(h('div', { class: 'mv-text' }, s.text));
      if (s.sub) cap.appendChild(h('div', { class: 'mv-sub' }, s.sub));
      fade.classList.remove('dark');
      clearTimeout(timer);
      timer = setTimeout(next, s.dur);
    }
    function next() {
      if (done) return;
      clearTimeout(timer);
      if (idx >= shots.length - 1) { end(); return; }
      // 暗転してから次の場面へ
      if (idx < 0) { idx = 0; show(0); return; }
      fade.classList.add('dark');
      timer = setTimeout(() => { idx += 1; show(idx); }, 450);
    }
    function end() {
      if (done) return;
      done = true;
      clearTimeout(timer);
      root.classList.remove('on');
      setTimeout(() => { root.remove(); if (onDone) onDone(); }, 500);
    }
    // キー操作は、うしろの会話の場面に伝えない（ムービー中に台詞が進まないように）
    const onKey = (e) => {
      if (!document.body.contains(root)) { document.removeEventListener('keydown', onKey, true); return; }
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); e.stopImmediatePropagation(); if (e.key === 'Escape') end(); else next(); }
    };
    document.addEventListener('keydown', onKey, true);
    next();
  };
})(window.RG = window.RG || {});
