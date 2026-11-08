// チャレンジ（しばり）：始めるときに選ぶお題。守ることと、達成・失敗の判定。DOM 非依存
(function (RG) {
  'use strict';
  const D = RG.data, U = RG.util;
  const CL = RG.challenge = {};

  const area = (st) => U.sum(st.fields, (f) => f.area);
  const debt = (st) => U.sum(st.loans, (l) => l.balance) + (st.emergency || 0);
  const wins = (st) => st.history.filter((h) => h.income > 0).length;

  // done：達成の判定（決算のあと）。fail：失敗の判定。progress：今の進み具合
  CL.LIST = [
    { id: 'noloan', icon: '🕊️', name: '借入なしで20ha',
      desc: '借入をしない（機械・農地を借入で買うこともできない）。経営面積20ha以上で、借入0円の年を迎えれば達成。資金が足りなくなったときのつなぎ資金は入るが、返して0円にすること',
      progress: (st) => '経営面積 ' + U.ha(area(st)) + ' / 20ha・借入 ' + U.man(debt(st)),
      done: (st) => area(st) >= 20 && debt(st) <= 0 },
    { id: 'organic', icon: '🐸', name: '有機だけで10年',
      desc: '販売する米は、有機栽培だけで作る（飼料用米は除く）。10年のうち5年以上、所得を黒字にすれば達成',
      progress: (st) => '黒字の年 ' + wins(st) + ' / 5（' + Math.min(st.history.length, 10) + ' / 10年）',
      done: (st) => st.history.length >= 10 && wins(st) >= 5,
      fail: (st) => st.history.length >= 10 && wins(st) < 5 },
    { id: 'noloss5', icon: '📈', name: '赤字ゼロで5年',
      desc: '始めてから5年間、毎年の所得を黒字にすれば達成。1年でも赤字になったら失敗',
      progress: (st) => '黒字の年 ' + st.history.slice(0, 5).filter((h) => h.income > 0).length + ' / 5',
      done: (st) => st.history.length >= 5 && st.history.slice(0, 5).every((h) => h.income > 0),
      fail: (st) => st.history.slice(0, 5).some((h) => h.income <= 0) },
    { id: 'small', icon: '🏡', name: '10ha以下で所得500万円',
      desc: '経営面積を10ha以下に保ったまま、所得500万円以上の年を出せば達成（10haを超える農地の話は受けられない）',
      progress: (st) => '経営面積 ' + U.ha(area(st)) + '（10haまで）・いちばん良い年の所得 ' + U.man(Math.max(0, ...st.history.map((h) => h.income))),
      done: (st, res) => area(st) <= 10 + 1e-9 && res.analysis.income >= 5000000 },
  ];
  CL.def = (id) => CL.LIST.find((c) => c.id === id) || null;
  CL.make = (id) => (CL.def(id) ? { id, done: false, failed: false } : null);
  // 挑戦中（達成も失敗もしていない）
  CL.on = (st, id) => !!(st.challenge && st.challenge.id === id && !st.challenge.done && !st.challenge.failed);

  // ---------- 守ること ----------
  CL.blockLoan = (st) => (CL.on(st, 'noloan') ? '🕊️ チャレンジ「借入なしで20ha」の途中なので、借入はできません' : null);
  CL.blockLand = (st, add) => (CL.on(st, 'small') && area(st) + add > 10 + 1e-9
    ? '🏡 チャレンジ「10ha以下で所得500万円」の途中なので、経営面積が10haを超える農地の話は受けられません' : null);
  CL.blockPlan = (st) => (CL.on(st, 'organic') && st.plan.some((r) => r.area > 0 && D.CROPS[r.crop] && D.CROPS[r.crop].market && r.cult !== 'organic')
    ? '🐸 チャレンジ「有機だけで10年」の途中です。販売する米の作付は、すべて有機栽培にしてください（「作付計画」タブ。飼料用米は除く）' : null);

  // ---------- 決算のあと：達成・失敗 ----------
  CL.afterYear = function (st, res) {
    const c = st.challenge;
    if (!c || c.done || c.failed) return [];
    const d = CL.def(c.id);
    if (!d) return [];
    if (d.done(st, res)) { c.done = true; c.year = st.year; return ['🎯 チャレンジ達成！「' + d.name + '」をやりとげた（' + st.year + '年目）。称号「' + d.name + '」を手に入れた']; }
    if (d.fail && d.fail(st, res)) { c.failed = true; c.year = st.year; return ['🎯 チャレンジ「' + d.name + '」は達成できなかった。経営はこのまま続けられる']; }
    return [];
  };
})(window.RG = window.RG || {});
