// プレイの記録：毎年の判断（計画・できごとの選択・サイコロ）と結果を、セーブの中に残す
// 感想やアンケートと一緒に送り、ゲームの改善に使う。名前・地名は残さない。DOM 非依存
(function (RG) {
  'use strict';
  const D = RG.data, U = RG.util, E = RG.events;
  const PL = RG.playlog = {};

  PL.get = (st) => {
    const L = st.playlog || (st.playlog = { plans: [], events: [], results: [], notes: [] });
    // ゲームごとの番号（同じ人が同じ条件で遊び直しても、別のゲームとして数えるため）
    if (!L.gid) L.gid = 'g' + Math.random().toString(36).slice(2, 10);
    return L;
  };
  const r0 = (v) => Math.round(v || 0);
  const r1 = (v) => Math.round((v || 0) * 10) / 10;

  // できごとの選択を記録する
  const choose = E.choose;
  E.choose = function (st, id, idx) {
    if (st.playlog) {
      const ev = E.get(id);
      if (ev && ev.cond(st)) PL.get(st).events.push({ y: st.year, id, c: idx, label: ev.choices[idx] ? ev.choices[idx].label : '' });
    }
    return choose.apply(this, arguments);
  };

  // シーズンを始めたときの計画
  PL.plan = function (st) {
    const L = PL.get(st);
    L.plans = L.plans.filter((p) => p.y !== st.year);
    const crops = {};
    st.plan.filter((r) => r.area > 0).forEach((r) => { const k = r.crop + '/' + r.cult + '/' + r.sow; crops[k] = r1((crops[k] || 0) + r.area); });
    L.plans.push({
      y: st.year, area: r1(U.sum(st.fields, (f) => f.area)), crops,
      machines: st.machines.map((m) => m.model + (m.lease ? '(L)' : '') + ':' + m.age),
      staff: st.staff.length, part: st.partTimers, family: st.family.length,
      contracts: st.contracts.map((c) => c.crop + ':' + r0(c.volume)),
      direct: { alloc: r0(st.direct.alloc), price5: r0(st.direct.price5), marketing: r0(st.direct.marketing), customers: r0(st.direct.customers) },
      store: r0(st.storePlan), biz: Object.assign({}, st.biz), insurance: st.insurance,
      loans: r0(U.sum(st.loans, (l) => l.balance)), shortLoan: r0(st.shortLoan), living: r0(st.corp ? st.execPay : st.living),
      advance: st.jaAdvance ? (st.jaAdvance.on ? (st.jaAdvance.auto ? 'auto' : r0(st.jaAdvance.qty)) : 'off') : 'off',
      luck: st.luck && st.luck.year === st.year ? { rolls: st.luck.rolls, card: st.luck.card, omamori: !!st.luck.omamori } : null,
    });
  };

  // 決算の結果
  PL.result = function (st, res) {
    const L = PL.get(st);
    L.results = L.results.filter((p) => p.y !== st.year);
    const cr = (st.yearFlags || {}).crisis || {};
    L.results.push({
      y: st.year, weather: res.weather, price: r0(res.price), yield10a: r0(res.production.yieldPer10a), r1: r1(res.production.r1 * 100),
      sales: r0(res.pl.sales), income: r0(res.analysis.income), preTax: r0(res.pl.preTax), cashEnd: r0(st.cash), minCash: r0(res.cash.minBalance),
      emergencyPeak: r0(res.cash.emergencyPeak), equity: r0(res.bs.equity), debt: r0(res.bs.longLoans + res.bs.emergency),
      area: r1(res.area.total), laborShort: r1(Math.max.apply(null, D.SEASONS.map((s) => res.labor.seasons[s].ratio)) * 100),
      crises: Object.keys(cr).map((id) => id + ':' + (cr[id].choice === 'guard' ? 'guard' : 'dice' + (cr[id].rolls || []).join(''))),
      events: res.events.map((e) => e.id + ':' + e.sev), titles: res.newTitles || [],
      gameOver: st.gameOver ? st.gameOver.reason : null, retired: !!st.retired,
    });
  };

  // 送る・書き出すときのまとめ（名前・地名・農場名は入れない）
  PL.summary = function (st) {
    const L = PL.get(st);
    return {
      gid: L.gid, scenario: st.scenarioId, custom: st.scenarioId === 'custom', seed: st.seed, year: st.year, maxYear: st.maxYear, phase: st.phase, mode: st.mode, closed: !!st.closed,
      corp: !!st.corp, gameOver: st.gameOver ? { reason: st.gameOver.reason, year: st.gameOver.year } : null,
      score: st.history.length && RG.score ? { rank: RG.score(st).rank, total: r1(RG.score(st).total) } : null,
      midterms: (st.midterms || []).map((m) => m.year + ':' + m.rank + r0(m.total)),
      titles: Object.keys(st.titles || {}),
      plans: L.plans, events: L.events, results: L.results,
    };
  };
})(window.RG = window.RG || {});
