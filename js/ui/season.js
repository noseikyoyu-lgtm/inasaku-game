// シーズン進行：1か月ずつボタンで進める。サイコロ勝負の月はそこで止まる
(function (RG) {
  'use strict';
  const UI = RG.ui, h = UI.h, D = RG.data, U = RG.util, DI = RG.dice, FW = RG.fieldwork;

  const WORK = {
    1: '冬：機械の整備と今年の計画', 2: '冬：確定申告と資材の予約', 3: '春の準備：種もみの消毒・育苗の準備', 4: '春作業：育苗と田起こし',
    5: '春作業：田植え', 6: '夏：中干しと溝切り', 7: '夏：水の管理と追肥', 8: '夏：穂が出る・病害虫の防除',
    9: '秋：稲刈り', 10: '秋：乾燥調製と出荷', 11: '秋：秋起こしと出荷の精算', 12: '冬：決算と来年の準備',
  };

  // まだ決算していないシーズンの結果（勝負の選び方が変わったら計算し直す）
  function seasonResult(app) {
    const st = app.st;
    if (!st.seasonPending) return st.lastResult;
    const key = st.seed + '|' + st.year + '|' + JSON.stringify((st.yearFlags || {}).crisis || {}) + JSON.stringify((st.yearFlags || {}).work || {}) + JSON.stringify((st.yearFlags || {}).mev || {});
    if (!app.seasonRes || app.seasonResKey !== key) { app.seasonRes = RG.sim.simulate(st); app.seasonResKey = key; }
    return app.seasonRes;
  }

  // できごとの文に合うアイコン（すでに絵文字で始まる文はそのまま）
  const LINE_ICONS = [[/田植え|直播/, '🌱'], [/育苗|田起こし/, '🚜'], [/稲刈り|刈り/, '🌾'], [/資材|種もみ|肥料/, '🧺'], [/税金/, '🧾'], [/米価|概算金|需給/, '💹'],
    [/契約/, '🤝'], [/直販/, '📦'], [/借入|つなぎ資金|返済|融資/, '🏦'], [/出荷契約金/, '💴'], [/故障/, '🔧'], [/収量|1等/, '📊'], [/労働|作業/, '👨‍🌾'],
    [/傾向|天候|気象/, '⛅'], [/決算/, '📋'], [/経営が始まった/, '🌅'], [/発生|被害/, '⚠️']];
  const startsWithEmoji = (t) => /^[\u2600-\u27BF\uD83C-\uDBFF]/.test(t);
  function lineIcon(t) { const f = LINE_ICONS.find((x) => x[0].test(t)); return f ? f[1] : '📝'; }
  function monthLines(res, m) {
    const lines = res.log[m] || [];
    return lines.length ? lines.map((l) => h('div', { class: 'ln ' + l.kind },
      startsWithEmoji(l.text) ? null : h('span', { class: 'ln-ic', 'aria-hidden': 'true' }, lineIcon(l.text)), h('span', null, l.text)))
      : [h('div', { class: 'ln' }, h('span', { class: 'ln-ic', 'aria-hidden': 'true' }, '🌤️'), h('span', null, '日々の作業を続けた。'))];
  }

  // その月のお金の動き
  function monthCash(res, m) {
    const cm = res.cash.months[m - 1];
    if (!cm) return null;
    const by = {};
    cm.items.forEach((it) => { by[it.label] = (by[it.label] || 0) + it.amount; });
    const top = Object.keys(by).map((k) => [k, by[k]]).filter((x) => Math.abs(x[1]) >= 1).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
    const shown = top.slice(0, 6);
    const rest = top.slice(6);
    if (rest.length) shown.push(['そのほか ' + rest.length + '件', U.sum(rest, (x) => x[1])]);
    return h('div', { class: 'month-cash' },
      h('div', { class: 'kpis' },
        UI.kpi('今月の入金', U.man(cm.inflow), null, cm.inflow > 0 ? 'good' : ''),
        UI.kpi('今月の出金', U.man(-cm.outflow), null),
        UI.kpi('月末の資金', U.man(cm.end), cm.emergency > 0 ? 'つなぎ資金 ' + U.man(cm.emergency) : null, cm.borrowed > 0 ? 'bad' : '')),
      shown.length ? UI.table([{ label: '今月のお金の動き' }, { label: '金額', num: true }],
        shown.map((x) => [x[0], { v: U.man(x[1]), cls: 'num ' + (x[1] < 0 ? 'neg' : 'pos') }])) : null);
  }

  // 月ごとの田んぼの風景（1つの canvas を使い回し、月が変わると絵が変わる）
  function farmCanvas(app, res) {
    let cv = app.farmCanvas;
    if (!cv || !cv._alive) {
      cv = app.farmCanvas = h('canvas', { class: 'farm-scene', role: 'img', 'aria-label': '田んぼの様子' });
      RG.farmScene.mount(cv, () => (app.st && app.st.seasonMonth) || 1,
        { rain: (m) => m >= 7 && m <= 9 && app.farmRes && (app.farmRes.weather === 'rain' || app.farmRes.weather === 'typh') });
    }
    app.farmRes = res;
    cv.setAttribute('aria-label', '田んぼの様子：' + RG.farmScene.label((app.st && app.st.seasonMonth) || 1));
    if (cv._redraw) cv._redraw();
    return cv;
  }

  RG.screens.season = function (app) {
    const st = app.st;
    const res = seasonResult(app);
    if (!st.seasonMonth) st.seasonMonth = st.seasonPending ? 1 : 12; // 古いセーブは決算済みなので全部の月を見せる
    const m = st.seasonMonth;
    const pending = st.seasonPending ? DI.pending(st) : null;
    const workP = st.seasonPending && FW ? FW.pending(st) : null;
    // 同じ月なら作業の判断を先に、サイコロ勝負はそのあと
    const workNow = workP && workP.month <= m && (!pending || workP.month <= pending.month) ? workP : null;
    const crisisNow = !workNow && pending && pending.month <= m ? pending : null;
    // 毎月のできごと（作業の判断・サイコロ勝負のあと）
    const mevNow = !workNow && !crisisNow && RG.monthly && RG.monthly.pending(st, m) ? m : null;
    const mevDone = st.seasonPending && RG.monthly && RG.monthly.choiceOf(st, m);
    const done = m >= 12 && !crisisNow && !workNow && !mevNow;
    const W = D.WEATHER[res.weather];

    const strip = h('div', { class: 'month-strip', 'aria-hidden': 'true' }, Array.from({ length: 12 }, (_, i) =>
      h('span', { class: i + 1 < m ? 'past' : i + 1 === m ? 'now' : '' }, (i + 1) + '月')));

    // 月の音：悪い知らせのある月は警告、稲刈りの月（9・10月）は収穫の音
    const go = (to) => {
      // まとめて進めた月のできごとは見送ったことにする
      if (RG.monthly) for (let k = m; k < to; k++) RG.monthly.pass(st, k);
      st.seasonMonth = to;
      if (RG.sound) RG.sound.play((res.log[to] || []).some((l) => l.kind === 'bad') ? 'warn' : to === 9 || to === 10 ? 'harvest' : 'step');
      app.autosave(); app.render();
    };
    // 次に止まる月：勝負のある月か12月
    const stopAt = () => {
      const p = DI.pending(st), wp = FW ? FW.pending(st) : null;
      const at = Math.min(p ? p.month : 13, wp ? wp.month : 13);
      return at <= 12 ? Math.min(12, Math.max(m + 1, at)) : 12;
    };
    let nav;
    if (crisisNow || workNow || mevNow) nav = null;
    else if (done) nav = h('div', { class: 'row' }, h('span', { class: 'spacer' }), UI.btn('決算を見る ▶', () => app.toResult(), 'primary big'));
    else nav = h('div', { class: 'row' },
      UI.btn('残りをまとめて進める', () => go(stopAt()), 'ghost sm', { title: '途中の月のできごとは見送ります' }),
      h('span', { class: 'spacer' }),
      UI.btn((m + 1) + '月へ進む ▶', () => go(m + 1), 'primary big'));

    const current = workNow ? RG.screens.workCard(app, workNow) : crisisNow ? UI.crisisCard(app, crisisNow) : mevNow ? UI.monthEventCard(app, m)
      : [mevDone && mevDone.ci >= 0 ? UI.monthEventCard(app, m) : null, UI.card(m + '月のできごと', null, h('div', { class: 'season-now' }, monthLines(res, m)), monthCash(res, m))];

    const past = [];
    for (let i = m - 1; i >= 1; i--) past.push(h('div', { class: 'month' }, h('div', { class: 'm' }, i + '月'), h('div', null, monthLines(res, i))));

    return h('div', null, app.topbar(),
      h('div', { class: 'layout one' },
        h('main', { class: 'stack' },
          UI.card(st.year + '年目 ' + m + '月', WORK[m] + (m >= 7 ? '　今年の天候：' + W.icon + ' ' + W.name : ''), farmCanvas(app, res), strip),
          current,
          nav,
          past.length ? UI.card('これまでの月', null, h('div', { class: 'season-list' }, past)) : null)));
  };
})(window.RG = window.RG || {});
