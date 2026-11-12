// ストーリーの会話の場面（じいちゃんとの会話）・約束のカード・エンディング
(function (RG) {
  'use strict';
  const UI = RG.ui, h = UI.h, D = RG.data, U = RG.util, SC = RG.scenes;

  const next = (app) => {
    const st = app.st;
    if (!st || st.phase !== 'scene' || !st.scene) return;
    const lines = SC.lines(st);
    st.scene.i += 1;
    if (st.scene.i >= lines.length) { SC.finish(st); if (RG.sound) RG.sound.play('good'); } else if (RG.sound) { const nx = lines[st.scene.i]; if (nx.who === 'goal') RG.sound.play('medal'); else RG.sound.voice(nx.who); }
    app.autosave();
    app.render();
  };
  const skip = (app) => { SC.finish(app.st); app.autosave(); app.render(); };

  // Enter・スペース・→ で次へ（ダイアログが開いているときは何もしない）
  let keyOn = false;
  function installKeys(app) {
    if (keyOn) return;
    keyOn = true;
    document.addEventListener('keydown', (e) => {
      if (!app.st || app.st.phase !== 'scene' || document.querySelector('.overlay, .movie')) return;
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); next(app); }
    });
  }

  // 約束のカード（プロローグの最後・計画のホーム・エンディング）
  RG.screens.promiseCard = function (st, opts) {
    opts = opts || {};
    const d = SC.def(st), p = SC.promise(st);
    // 計画のホーム：年数のほかの条件（面積・黒字など）をもう満たしていたら、進み具合ではなく「達成中」の短い表示にする
    // （条件を割ったら、また進み具合を出す。約束が果たせたかは最後の年に決まる）
    const rest = p.conds.slice(1), left = Math.max(0, st.maxYear - st.history.length);
    if (opts.progress && rest.length && rest.every((c) => c.ok) && left > 0) {
      return h('div', { class: 'promise done' },
        h('div', { class: 'pr-head' }, UI.face(d.giver, 2), h('b', null, d.goalName), h('span', { class: 'pr-done' }, '✅ 条件クリア')),
        h('p', { class: 'pr-text' }, rest.map((c) => '「' + c.label + '」').join('') + 'はもう満たしています。あと' + left + '年、このまま続ければ約束を果たせます。'),
        h('p', { class: 'small pr-sub' }, '最後の年の決算で、もう一度確かめます。それまでに条件を割ると、また進み具合を表示します。'));
    }
    const pg = opts.progress ? d.progress(st) : null;
    return h('div', { class: 'promise' + (opts.big ? ' big' : '') },
      h('div', { class: 'pr-head' }, UI.face(d.giver, 2), h('b', null, d.goalName),
        opts.stars ? h('span', { class: 'pr-stars', 'aria-label': '星' + p.stars + 'つ' }, [1, 2, 3].map((i) => h('i', { class: i <= p.stars ? 'on' : '' }, '★'))) : null),
      h('p', { class: 'pr-text' }, d.promiseText),
      pg ? h('div', { class: 'pr-bar' }, h('span', null, pg.text), pg.map ? RG.screens.villageMap(st) : UI.bar(pg.v, pg.max)) : null,
      opts.conds ? h('ul', { class: 'pr-conds' }, p.conds.map((c) => h('li', { class: c.ok ? 'ok' : '' }, h('span', { 'aria-hidden': 'true' }, c.ok ? '✅' : '⬜'), c.label, h('small', null, '（' + c.now + '）')))) : null,
      opts.starsNote ? h('ul', { class: 'pr-star-note' },
        h('li', null, '★ 約束を果たす'), h('li', null, '★★ ' + d.star2.label), h('li', null, '★★★ ' + d.star3.label)) : null);
  };

  // 次の約束のカード（計画のホーム・エンディング）
  RG.screens.promise2Card = function (st) {
    const p = SC.isStory(st) ? SC.promise2(st) : null;
    if (!p) return null;
    const d = SC.def(st);
    const state = p.final ? (p.kept ? '✅ 果たした' : '❌ 果たせなかった') : p.kept ? '✅ 今は満たしている' : 'あと' + Math.max(0, st.maxYear - st.history.length) + '年';
    return h('div', { class: 'promise second' + (p.kept ? ' done' : '') },
      h('div', { class: 'pr-head' }, UI.face(d.promise2.who, 2), h('b', null, '次の約束：' + p.opt.icon + ' ' + p.opt.name), h('span', { class: 'pr-done' }, state)),
      h('ul', { class: 'pr-conds' }, p.conds.map((c) => h('li', { class: c.ok ? 'ok' : '' }, h('span', { 'aria-hidden': 'true' }, c.ok ? '✅' : '⬜'), c.label, h('small', null, '（今 ' + c.now + '）')))),
      p.final ? null : h('p', { class: 'small pr-sub' }, '最後の年（' + st.maxYear + '年目）の決算で確かめます。'));
  };

  // 棚田：集落の田んぼの地図（1マス＝1ha。あなたの田・ほかの人が作る田・荒れた田）
  RG.screens.villageMap = function (st) {
    const v = st.village;
    if (!v) return null;
    const mine = Math.round(SC.villageMine(st)), lost = Math.round(v.abandoned);
    const cells = [];
    for (let i = 0; i < SC.VILLAGE; i++) cells.push(i < mine ? 'mine' : i >= SC.VILLAGE - lost ? 'lost' : 'other');
    return h('div', { class: 'vmap-wrap' },
      h('div', { class: 'vmap', role: 'img', 'aria-label': '集落の田んぼ30haのうち、あなたの田 ' + mine + 'ha・ほかの人の田 ' + (SC.VILLAGE - mine - lost) + 'ha・荒れた田 ' + lost + 'ha' },
        cells.map((c) => h('i', { class: 'vm-' + c }))),
      h('div', { class: 'vmap-legend', 'aria-hidden': 'true' }, h('span', null, h('i', { class: 'vm-mine' }), 'あなたの田'), h('span', null, h('i', { class: 'vm-other' }), 'ほかの人の田'), h('span', null, h('i', { class: 'vm-lost' }), '荒れた田')));
  };

  RG.screens.scene = function (app) {
    const st = app.st;
    installKeys(app);
    const lines = SC.lines(st);
    const i = Math.min(st.scene ? st.scene.i : 0, lines.length - 1);
    const ln = lines[i] || { who: 'narr', text: '' };
    // 背景：会話の季節に合わせた月の田んぼ（夕暮れの場面は色をかぶせる）
    const bg = SC.bgOf(st);
    app.sceneMonth = bg.m; app.sceneTrain = !!bg.train; app.sceneDusk = !!bg.dusk; app.sceneTerrace = !!(SC.def(st) && SC.def(st).terrace);
    let canvas = app.sceneCanvas;
    if (!canvas || !canvas._alive) {
      canvas = app.sceneCanvas = h('canvas', { class: 'title-canvas scene-bg', role: 'img' });
      RG.farmScene.mount(canvas, () => app.sceneMonth || 4, { train: () => !!app.sceneTrain, lit: () => !!app.sceneDusk, dusk: () => !!app.sceneDusk, terrace: () => !!app.sceneTerrace }); // 田んぼの向こうのローカル線・山あいの棚田
    }
    canvas.setAttribute('aria-label', '田んぼの様子：' + RG.farmScene.label(bg.m));
    if (canvas._redraw) canvas._redraw();
    const season = bg.m <= 2 || bg.m === 12 ? '冬' : bg.m <= 5 ? '春' : bg.m <= 8 ? '夏' : '秋';
    const person = ln.who !== 'narr' && ln.who !== 'goal' ? D.PEOPLE[ln.who] : null;
    const last = i >= lines.length - 1;
    const box = ln.who === 'goal'
      ? h('div', { class: 'vn-box goal' }, RG.screens.promiseCard(st, { big: true, starsNote: true }),
        h('div', { class: 'vn-actions' }, UI.btn('約束する ▶', () => next(app), 'gold big')))
      : h('div', { class: 'vn-box' + (person ? '' : ' narr'), onclick: () => next(app) },
        person ? h('div', { class: 'vn-name' }, person.name) : null,
        h('p', { class: 'vn-text' }, ln.text),
        h('span', { class: 'vn-next', 'aria-hidden': 'true' }, last ? '■' : '▼'));
    // 場面によっては、会話の前にムービーを流す（1回だけ）
    const mv = SC.def(st).movies && SC.def(st).movies[st.scene.id];
    if (mv && RG.movie && !st.scene.movieShown) { st.scene.movieShown = true; setTimeout(() => RG.movie.play(mv, st), 0); }
    return h('div', { class: 'scene-screen' }, canvas, bg.dusk ? h('div', { class: 'dusk-tint', 'aria-hidden': 'true' }) : null,
      h('div', { class: 'vn-top' },
        h('span', { class: 'vn-chip' }, st.scene.id === 'prologue' ? '📖 プロローグ' : '📖 ' + st.year + '年目の' + season),
        h('span', { class: 'spacer' }),
        h('span', { class: 'vn-count' }, (i + 1) + ' / ' + lines.length),
        UI.btn('とばす ⏭', () => skip(app), 'sm vn-skip')),
      h('div', { class: 'vn-stage' },
        person ? h('div', { class: 'vn-portrait' }, RG.portrait.svg(ln.who, 240, { talk: true, label: person.name })) : null),
      box,
      h('button', { type: 'button', class: 'vn-hit', 'aria-label': '次へ', onclick: () => next(app) }));
  };

  // ---------- エンディング（経営終了の画面の先頭） ----------
  RG.screens.storyEnding = function (st) {
    if (!SC.isStory(st)) return null;
    const e = SC.ending(st);
    return h('section', { class: 'story-ending kind-' + e.kind },
      h('div', { class: 'se-head' }, h('span', { class: 'se-badge' }, 'ENDING'), h('h2', null, e.title)),
      h('div', { class: 'se-talk' }, e.lines.map((ln) => ln.who === 'narr'
        ? h('p', { class: 'se-narr' }, ln.text)
        : h('div', { class: 'se-line' }, UI.face(ln.who, 3, true), h('div', { class: 'saying-bubble' }, h('div', { class: 'saying-who' }, D.PEOPLE[ln.who].name), h('p', null, '「' + ln.text + '」'))))),
      RG.screens.promiseCard(st, { conds: true, stars: true, starsNote: true }), RG.screens.promise2Card(st));
  };
})(window.RG = window.RG || {});
