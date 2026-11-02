// 6年目からの経営の厳しさ：期限つきの危機（達成できないと経営終了）と、経営を圧迫するできごと。DOM 非依存
// 1〜5年目はチュートリアルの期間として、ここのできごとは起きない
(function (RG) {
  'use strict';
  const D = RG.data, U = RG.util, E = RG.events;
  const PR = RG.pressure = {};
  PR.FROM = 6;

  const an = (st) => (st.lastResult && st.lastResult.analysis) || null;
  const rentedShare = (st) => { const t = U.sum(st.fields, (f) => f.area); return t > 0 ? U.sum(st.fields.filter((f) => !f.owned), (f) => f.area) / t : 0; };
  const lastR1 = (st) => { const h = st.history[st.history.length - 1]; return h ? h.r1 : 1; };

  // ---------- 期限つきの危機 ----------
  // trigger：起きる条件。goal：達成の判定（決算のあと）。years：期限（何年目の決算まで）
  PR.DEADLINES = {
    bank: { icon: '🏦', title: '金融機関からの最後通告', who: 'kimura', years: 2,
      // 返す力がほとんどない（償還年数20年超え）うえに、つなぎ資金に頼っているとき
      trigger: (st) => { const a = an(st); return !!a && a.debt > 0 && !(a.repayYears <= 20) && (st.emergency || 0) > RG.sim.creditLimit(st) * 0.3; },
      text: (st) => '「借入の返済が追いついていません。このままでは、これ以上お貸しできません。' + (st.year + 1) + '年目の決算までに、つなぎ資金をなくし、借入を15年以内に返せる経営（債務償還年数15年以内）にしてください。できなければ、融資を引き揚げます」',
      goalText: 'つなぎ資金 0・債務償還年数15年以内',
      goal: (st, res) => (st.emergency || 0) <= 0 && (res.analysis.debt <= 0 || res.analysis.repayYears <= 15),
      fail: '期限までに返済の見通しを立てられず、金融機関が融資を引き揚げました。資金繰りがつかなくなり、経営を続けられなくなりました。' },
    buyer: { icon: '📦', title: '大口の取引先からの品質の警告', who: 'aoki', years: 2,
      trigger: (st) => st.contracts.length > 0 && lastR1(st) < 0.65,
      text: (st) => '「今年のお米、1等米が少なすぎます。' + (st.year + 1) + '年目までに1等米の割合を75%以上に戻してください。戻らなければ、すべての契約を打ち切り、違約金をいただきます。うちとの取引がなくなれば、あなたの米の売り先はほとんどなくなりますよ」',
      goalText: '1等米の割合 75%以上の年を出す',
      goal: (st, res) => res.production.r1 >= 0.75,
      fail: '品質を戻せず、大口の取引先から契約を打ち切られ、多額の違約金を求められました。売り先と信用を失い、経営を続けられなくなりました。' },
    landlords: { icon: '📜', title: '地主たちの話し合い', who: 'sato', years: 3,
      trigger: (st) => rentedShare(st) > 0.5 && st.trust < 40,
      text: (st) => '「あんたに貸しとる田んぼのこと、地主どうしで話し合ったんじゃ。最近は集落の行事にも顔を出さんし、評判も良くない。' + (st.year + 2) + '年目までに地域の信頼を50以上にしてくれんなら、田んぼはみんな引き上げさせてもらう」',
      goalText: '地域の信頼 50以上',
      goal: (st) => st.trust >= 50,
      fail: '地主たちが田んぼを一斉に引き上げました。経営面積の半分以上を失い、経営を続けられなくなりました。' },
  };
  PR.state = (st) => st.deadlines || (st.deadlines = []);
  PR.active = (st) => PR.state(st).filter((d) => !d.done);
  PR.def = (id) => PR.DEADLINES[id];

  // 危機を知らせるできごと（年の初めに必ず届く）
  Object.keys(PR.DEADLINES).forEach((id) => {
    const d = PR.DEADLINES[id];
    E.POOL.push({
      id: 'deadline_' + id, who: d.who, sq: 0,
      cond: (st) => st.year >= PR.FROM && (st.mode === 'endless' || st.year <= st.maxYear - d.years) && !PR.state(st).some((x) => x.id === id && (!x.done || st.year - x.year < 3)) && d.trigger(st),
      weight: () => 100,
      title: '⏳ ' + d.title,
      text: (st) => d.text(st),
      choices: [{ label: '必ず期限までに立て直す', desc: '期限：' + d.goalText + '（' + d.years + '年以内）。できなければ経営終了', apply: (st) => {
        PR.state(st).push({ id, year: st.year, until: st.year + d.years - 1, done: false });
        return '「' + d.title + '」：' + (st.year + d.years - 1) + '年目の決算までに、' + d.goalText + '。';
      } }],
    });
  });

  // 決算のあと：達成したか・期限切れか
  PR.afterYear = function (st, res) {
    const notes = [];
    PR.active(st).forEach((x) => {
      const d = PR.def(x.id);
      if (d.goal(st, res)) { x.done = true; x.ok = true; notes.push('【危機を乗り越えた】' + d.icon + ' ' + d.title + '：' + d.goalText + 'を達成した！'); return; }
      if (st.year >= x.until) { x.done = true; x.ok = false; st.gameOver = { reason: 'deadline', year: st.year, text: d.fail }; return; }
      notes.push('【期限まであと' + (x.until - st.year) + '年】' + d.icon + ' ' + d.title + '：' + d.goalText);
    });
    return notes;
  };

  // ---------- 6年目からの、経営を圧迫するできごと ----------
  const ramp = (st) => (st.year >= PR.FROM ? 0.5 + 0.05 * (st.year - PR.FROM) : 0);
  // 同じできごとは4年に1回まで（値上がりが毎年重ならないように）
  const cool = (st, id) => st.year - (st.events.seen[id] || -99) >= 4;
  const addCost = (st, amount, label) => RG.state.addLedger(st, { amount: -amount, cat: 'eventCost', label });
  E.POOL.push({
    id: 'rent_up', who: 'sato', sq: 0,
    cond: (st) => st.year >= PR.FROM && cool(st, 'rent_up') && st.fields.some((f) => !f.owned), weight: ramp,
    title: '地代の値上げを求められた',
    text: () => '「米の値段も上がったり下がったりじゃが、固定資産税も水利費も上がっとる。地代を上げさせてもらえんか」と、地主さんたちから言われた。',
    choices: [
      { label: '受け入れる', desc: '借りている田の地代がすべて +10%', apply: (st) => { st.fields.forEach((f) => { if (!f.owned) f.rent = Math.round(f.rent * 1.1); }); return '地代を上げた。'; } },
      { label: 'いちばん地代の高い田を返す', desc: 'その田が減る。地域の信頼 −2。ほかの田の地代はそのまま', apply: (st) => {
        const f = st.fields.filter((x) => !x.owned).sort((a, b) => b.rent - a.rent)[0];
        st.fields = st.fields.filter((x) => x !== f); RG.state.fitPlan(st); st.trust = Math.max(0, st.trust - 2);
        if (f.village && st.village) st.village.abandoned = U.round(st.village.abandoned + f.area, 1); // 棚田：返した集落の田は荒れてしまう
        return f.name + 'を返した。'; } },
    ],
  });
  E.POOL.push({
    id: 'part_shortage', who: 'tamura', sq: 0,
    cond: (st) => st.year >= PR.FROM && cool(st, 'part_shortage') && (st.partTimers > 0 || (st.regulars || []).length > 0), weight: ramp,
    title: 'パートが集まらない',
    text: () => '町に大きな工場ができ、パートの人がそちらに流れている。「時給を上げんと、もう人は来んよ」と言われた。',
    choices: [
      { label: '時給を上げて集める', desc: 'パートの時給がこれから +6%', apply: (st) => { st.market.partWageBoost = (st.market.partWageBoost || 1) * 1.06; return 'パートの時給を上げた。'; } },
      { label: '人数を減らしてしのぐ', desc: '季節パートが2人減る（人手が足りなくなるおそれ）', apply: (st) => { RG.state.addParts(st, -2); return 'パートを減らした。'; } },
    ],
  });
  E.POOL.push({
    id: 'cost_up', who: 'takahashi', sq: 0,
    cond: (st) => st.year >= PR.FROM && cool(st, 'cost_up'), weight: ramp,
    title: '資材と機械の値上がり',
    text: () => '「世界的な物価高で、肥料も農薬も機械も、また値上がりだ。これからは、同じことをしていても毎年お金が余計にかかるよ」',
    choices: [{ label: 'わかった', desc: '資材・機械の値段がこれから +4%', apply: (st) => { st.market.matInfl *= 1.04; return '資材と機械が値上がりした。'; } }],
  });
  E.POOL.push({
    id: 'tax_audit', who: 'kimura', sq: 0,
    cond: (st) => st.year >= PR.FROM + 2 && cool(st, 'tax_audit'), weight: (st) => ramp(st) * 0.6,
    title: '税務署の調査',
    text: () => '税務署から調査の連絡があった。帳簿を見せたところ、経費の計上にいくつか誤りが見つかった。',
    choices: [{ label: '追加の税金を払う', desc: '追徴課税 30万円（と、帳簿の見直しで冬の作業 +10時間）', apply: (st) => { addCost(st, 300000, '追徴課税'); const yf = st.yearFlags; yf.cardLabor = yf.cardLabor || {}; yf.cardLabor.winter = (yf.cardLabor.winter || 0) + 10; return '追徴課税を払った。'; } }],
  });
})(window.RG = window.RG || {});
