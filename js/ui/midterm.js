// 中間評価（5・10・15年目の決算のあと）
(function (RG) {
  'use strict';
  const UI = RG.ui, h = UI.h, D = RG.data, U = RG.util, S = RG.state;
  const T = UI.term;

  const MT = RG.midterm = {};
  MT.EVERY = 5;

  // この年の決算のあとに中間評価を出すか
  MT.due = (st) => !st.gameOver && !st.retired && (st.mode === 'endless' || st.year < st.maxYear) && st.year % MT.EVERY === 0 && st.history.length === st.year;

  // 今の実績と、これまでのペースが20年続いたときの見込み
  // 見込みの区切り：ストーリーは最後の年、エンドレスは「この先10年」
  MT.horizon = (st) => (st.mode === 'endless' ? st.history.length + 10 : st.maxYear);
  MT.evaluate = function (st) {
    const hs = st.history, done = hs.length, last = hs[hs.length - 1], H = MT.horizon(st);
    const now = { eqGain: last.equity - st.initialEquity, avgInc: U.avg(hs.map((x) => x.income)),
      ratio: last.assets > 0 ? last.equity / last.assets : 0, area: last.area, trust: st.trust, brand: st.brand };
    const end = Object.assign({}, now, { eqGain: now.eqGain / done * H });
    now.years = end.years = RG.scoreYears(st);
    const sNow = RG.scoreFrom(now), sEnd = RG.scoreFrom(end);
    const up = RG.RANKS.slice().reverse().find((r) => r[1] > sEnd.total);
    return { done, left: H - done, now: sNow, end: sEnd, up, H };
  };

  const HINTS = {
    equity: '純資産は「利益を出して、借入を返す」ことで増えます。売上に見合わない機械の買いすぎや、赤字の年が続いていないか見直しましょう。',
    income: '所得は「10aあたりの稼ぎ × 面積」です。品種と販路で単価を上げるか、経費を減らすか、面積を増やすかを考えましょう。',
    ratio: '借入に頼る割合が高くなっています。返済を進め、設備は補助事業や自己資金も組み合わせて買いましょう。',
    area: '良い農地の話は地域の信頼が高いほど来ます。広げる前に、機械と人手が足りるかも確かめましょう。',
    trust: '地域の共同作業への参加や、契約どおりの出荷で信頼は育ちます。信頼が高いと良い農地や契約の話が来ます。',
    brand: 'ブランド力は直販や特別栽培、コンクールへの出品で育ちます。直販の顧客が増えると高い値段で売れます。',
  };

  // 経営を続けるための条件（資金繰り・債務超過・後継ぎ）
  MT.guards = function (st, left) {
    const credit = RG.sim.creditLimit(st);
    const bs = RG.accounting.bs(st);
    const op = S.operator(st);
    const out = [];
    out.push(UI.note(st.emergency > credit * 0.5 ? 'warn' : 'good', null,
      '資金繰り：つなぎ資金 ' + U.man(st.emergency || 0) + '（融資枠 ' + U.man(credit) + ' を超えると経営を続けられません）'));
    out.push(UI.note(bs.equity < 0 ? 'bad' : 'good', null, bs.equity < 0
      ? '債務超過：' + st.negEquityYears + '年続いています（3年続くと経営を続けられません）'
      : '債務超過：なし（純資産 ' + U.man(bs.equity) + '）'));
    if (op) {
      if (D.AGING.retire - op.age > left) out.push(UI.note('good', null, '後継ぎ：経営主は' + op.age + '歳。残りの' + left + '年のうちに引退の年（' + D.AGING.retire + '歳）は来ません'));
      else {
        const heir = S.heirAtRetire(st);
        out.push(UI.note(heir ? 'good' : 'bad', null, '後継ぎ：経営主は' + op.age + '歳。' + D.AGING.retire + '歳で引退します。' +
          (heir ? '引き継げる後継者がいます' : '今のままでは引き継ぐ人がいないため、その年で経営が終わります')));
      }
    }
    return out;
  };

  RG.screens.midterm = function (app) {
    const st = app.st;
    const ev = MT.evaluate(st);
    const p = ev.end;
    const prev = (st.midterms || []).filter((m) => m.year < st.year);
    const weak = p.items.slice().sort((a, b) => (b.max - b.pts) - (a.max - a.pts)).slice(0, 2);
    const nowByKey = {};
    ev.now.items.forEach((x) => { nowByKey[x.key] = x; });

    const head = UI.card(st.year + '年目の中間評価', RG.advisor.NAME + 'と経営をふり返る',
      h('div', { class: 'goal-head' },
        h('div', { class: 'goal-rank rank-' + p.rank }, p.rank),
        h('div', null,
          h('div', { class: 'muted small' }, 'このペースで' + ev.H + '年続けたときの見込み'),
          h('div', { class: 'goal-title' }, p.title + '（' + U.num(p.total, 1) + '点 / 100点）'),
          h('div', { class: 'small' }, ev.up ? ev.up[0] + 'ランクまで あと ' + U.num(ev.up[1] - p.total, 1) + '点' : '最高ランクの見込みです'))),
      prev.length ? h('div', { class: 'goal-trend' }, h('span', { class: 'muted small' }, 'これまでの中間評価'),
        prev.concat([{ year: st.year, rank: p.rank, total: p.total }]).map((m, i) => [i ? h('span', { class: 'muted', 'aria-hidden': 'true' }, '→') : null,
          h('span', { class: 'chip goal-chip' }, m.year + '年目 ' + m.rank + '（' + U.num(m.total, 1) + '点）')])) : null,
      h('div', { class: 'goal-years' }, h('div', { class: 'small muted' }, (st.mode === 'endless' ? '経営の年数：' + ev.done + '年（この先' + ev.left + '年の見込み）' : '経営の年数：' + ev.done + '年 / ' + st.maxYear + '年（あと' + ev.left + '年）')), UI.bar(ev.done, ev.H)));

    const items = UI.card('評価の内訳', '得点は' + ev.H + '年後の見込み',
      h('div', { class: 'goal-items' }, p.items.map((x) => h('div', { class: 'goal-item' },
        h('span', { class: 'nm' }, x.key === 'trust' || x.key === 'brand' ? T(x.label) : x.label),
        h('span', { class: 'pt' }, U.num(x.pts, 1) + ' / ' + x.max + '点'),
        UI.bar(x.pts, x.max),
        h('div', { class: 'sub' },
          h('span', null, x.key === 'equity' ? '今：' + nowByKey[x.key].value + ' → ' + ev.H + '年後：' + x.value : '今：' + x.value),
          h('span', null, '満点：' + x.goal))))),
      h('p', { class: 'small muted' }, '純資産の増加は、ここまでの増え方が続くとして見込んでいます。ほかの項目は今の値のままとしています。'));

    const guards = UI.card('経営を続けるための条件', null, h('div', { class: 'notes' }, MT.guards(st, ev.left)));

    const advice = UI.card(UI.whoTitle('takahashi', RG.advisor.NAME + 'からのひとこと'), null,
      h('div', { class: 'notes' }, weak.map((x) => UI.note('tip', '「' + x.label + '」はあと ' + U.num(x.max - x.pts, 1) + '点 伸ばせます', HINTS[x.key]))));

    const next = UI.btn((st.year + 1) + '年目へ進む ▶', () => app.nextYear(), 'primary big');
    return h('div', null, app.topbar(),
      h('div', { class: 'layout one' },
        h('main', { class: 'stack' }, head, RG.chapters.on(st) ? RG.screens.chapterRecap(st, RG.chapters.of(st.year, st).n) : null, items, RG.screens.rivalsCard(st, '地域の農家との比較'), guards, advice,
          h('div', { class: 'row' }, UI.btn('◀ 決算書に戻る', () => { st.phase = 'result'; app.autosave(); app.render(); }, ''), h('span', { class: 'spacer' }), next))));
  };
})(window.RG = window.RG || {});
