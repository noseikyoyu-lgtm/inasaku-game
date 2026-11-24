// 今年の目標（毎年の初めに3つから1つ選ぶ）と、後半だけの大きな挑戦（4つの段階を順に達成する）。DOM 非依存
(function (RG) {
  'use strict';
  const D = RG.data, U = RG.util, E = RG.events;
  const GO = RG.goals = {};
  const area = (st) => U.sum(st.fields, (f) => f.area);
  const debt = (st) => U.sum(st.loans || [], (l) => l.balance) + (st.emergency || 0);
  const lr = (st) => st.lastResult || null;
  const addPts = (st, n) => { if (RG.skills && n) { const k = RG.skills.state(st); k.pts += n; k.earned = (k.earned || 0) + n; } };
  const r10 = (v) => Math.round(v / 100000) * 100000; // 10万円単位

  // ======================================================================
  // 今年の目標
  // ======================================================================
  // make(st)：その年の目標の中身（target など）。check(st, res, g)：決算で達成したか
  GO.YEARLY = [
    { id: 'grade', icon: '🥇', cond: (st) => !!lr(st) && lr(st).production.marketBales > 0,
      make: () => ({}), label: () => '1等米の割合を 90%以上にする', check: (st, res) => res.production.marketBales > 0 && res.production.r1 >= 0.9 },
    { id: 'cust', icon: '🛒', cond: (st) => (st.direct.customers || 0) >= 20,
      make: (st) => ({ from: st.direct.customers, n: Math.max(10, Math.round(st.direct.customers * 0.12)) }),
      label: (g) => '直販のお客さんを ' + g.n + '人ふやす（今 ' + g.from + '人）', check: (st, res, g) => st.direct.customers >= g.from + g.n },
    { id: 'income', icon: '💰', cond: (st) => !!lr(st),
      make: (st) => ({ v: r10(Math.max(1000000, lr(st).analysis.income * 1.1 + 300000)) }),
      label: (g) => '農業所得を ' + U.man(g.v) + ' 以上にする', check: (st, res, g) => res.analysis.income >= g.v },
    { id: 'yield', icon: '🌾', cond: (st) => !!lr(st) && lr(st).production.yieldPer10a > 0,
      make: (st) => ({ v: Math.round((lr(st).production.yieldPer10a + 10) / 5) * 5 }),
      label: (g) => '10aあたりの収量を ' + g.v + 'kg 以上にする', check: (st, res, g) => res.production.yieldPer10a >= g.v },
    { id: 'cash', icon: '🏦', cond: (st) => !!lr(st) && lr(st).cash.minBalance < 1000000,
      make: () => ({}), label: () => '1年を通して、資金がマイナスになる月を出さない', check: (st, res) => res.cash.minBalance >= 0 && res.cash.emergencyPeak <= res.cash.emergencyStart + 1 },
    { id: 'debt', icon: '📉', cond: (st) => debt(st) >= 3000000,
      make: (st) => ({ from: debt(st), v: r10(Math.max(500000, debt(st) * 0.1)) }),
      label: (g) => '借入を ' + U.man(g.v) + ' 以上へらす（今 ' + U.man(g.from) + '）', check: (st, res, g) => res.bs.longLoans + res.bs.emergency <= g.from - g.v },
    { id: 'contest', icon: '🏆', cond: (st) => !!(RG.skills && RG.skills.contestOn(st)),
      make: () => ({}), label: () => '米の品評会で3位以内に入る', check: (st, res) => !!res.contest && res.contest.rank <= 3 },
    { id: 'labor', icon: '👨‍🌾', cond: (st) => !!lr(st) && D.SEASONS.some((s) => lr(st).labor.seasons[s].ratio > 0.01), // 去年、人手が足りなかった季節があるとき
      make: () => ({}), label: () => 'どの季節も、人手不足を出さない', check: (st, res) => D.SEASONS.every((s) => res.labor.seasons[s].ratio <= 0.01) },
    { id: 'trust', icon: '🤝', cond: (st) => st.trust <= 95,
      make: (st) => ({ from: Math.round(st.trust) }), label: (g) => '地域の信頼を ' + Math.min(100, g.from + 3) + ' 以上にする（今 ' + g.from + '）', check: (st, res, g) => st.trust >= Math.min(100, g.from + 3) },
  ];
  GO.yearlyDef = (id) => GO.YEARLY.find((x) => x.id === id);
  // その年の候補（3つ。シードで決まる）
  GO.candidates = function (st) {
    let c = st.goalCand;
    if (!c || c.year !== st.year) {
      const r = RG.rng.make(st.seed, st.year, 'yeargoal');
      const el = GO.YEARLY.filter((x) => { try { return x.cond(st); } catch (e) { return false; } });
      for (let i = el.length - 1; i > 0; i--) { const j = Math.floor(r.next() * (i + 1)); [el[i], el[j]] = [el[j], el[i]]; }
      c = st.goalCand = { year: st.year, ids: el.slice(0, 3).map((x) => x.id) };
    }
    // 目標の数字（今の値・目標の値）は、目標を選ぶときの値で作る（年の初めの別のできごとで値が変わることがあるため）
    const ids = c.ids || (c.list || []).map((x) => x.id);
    return ids.map((id) => GO.yearlyDef(id)).filter(Boolean).map((x) => Object.assign({ id: x.id }, x.make(st)));
  };
  GO.goalLabel = (g) => { const x = GO.yearlyDef(g.id); return x ? x.icon + ' ' + x.label(g) : ''; };
  const short = (g) => GO.goalLabel(g).replace(/（今 [^）]*）/, ''); // 決算の知らせでは、選んだときの数字を外す
  GO.REWARD = '技術ポイント +1・お守りか振り直し券 +1';
  const pick = (i) => ({
    label: (st) => { const c = GO.candidates(st)[i]; return c ? GO.goalLabel(c) : '—'; },
    desc: () => '達成すると ' + GO.REWARD,
    apply: (st) => { const c = GO.candidates(st)[i]; if (!c) return '目標は決めなかった。'; st.yearGoal = Object.assign({ year: st.year }, c); return '今年の目標：「' + GO.goalLabel(c) + '」'; },
  });
  E.POOL.push({
    id: 'year_goal', who: 'takahashi', once: false, sq: 3,
    cond: (st) => st.year >= 2 && GO.candidates(st).length >= 2 && !(st.yearGoal && st.yearGoal.year === st.year), weight: () => 100,
    title: '今年の目標',
    text: () => '「今年は、何をねらう？ 1つ決めておくと、1年のやることがはっきりするよ。達成できたら、ごほうびもある」',
    choices: [pick(0), pick(1), pick(2), { label: '今年は目標を決めない', desc: '', apply: (st) => { st.yearGoal = { year: st.year, id: null }; return '今年は目標を決めなかった。'; } }],
  });
  GO.yearlyAfterYear = function (st, res) {
    const g = st.yearGoal;
    if (!g || g.year !== st.year || !g.id) return [];
    const x = GO.yearlyDef(g.id);
    if (!x) return [];
    let ok = false;
    try { ok = !!x.check(st, res, g); } catch (e) { ok = false; }
    st.goalLog = (st.goalLog || []).concat([{ year: st.year, id: g.id, ok }]);
    res.yearGoal = { label: GO.goalLabel(g), ok };
    if (!ok) return ['🎯 今年の目標「' + short(g) + '」は、とどかなかった。'];
    addPts(st, 1);
    const item = st.goalLog.filter((y) => y.ok).length % 2 ? 'omamori' : 'reroll';
    st.items[item] += 1;
    return ['🎯 今年の目標「' + short(g) + '」を達成！ 技術ポイント +1・' + (item === 'omamori' ? 'お守り' : '振り直し券') + ' +1'];
  };

  // ======================================================================
  // 大きな挑戦：後半に3つから1つ選ぶ。4つの段階を、最後の年までに順に達成する
  // ======================================================================
  const share = (st, cults) => { const u = RG.sim.planUnits(st), a = U.sum(u, (x) => x.area); return a > 0 ? U.sum(u.filter((x) => cults.indexOf(x.cult) >= 0), (x) => x.area) / a : 0; };
  GO.GRAND = [
    { id: 'export', icon: '🌏', name: '海外に米を届ける', who: 'aoki',
      lead: '「香港やシンガポールの日本食のお店が、品質のそろった新潟の米を探しているんです。輸出は基準がきびしい。でも、やりとげれば、毎年の取引になりますよ」',
      reward: '毎年、輸出の上乗せ（販売用の米 1俵あたり1,500円・1,500俵まで）・ブランド力 +8',
      stages: [
        { label: '1等米の割合を 90%以上にする（輸出の品質の基準）', check: (st, res, e) => res.production.marketBales > 0 && res.production.r1 >= 0.9 - 0.04 * e },
        { label: '販売用の米を 1,200俵以上 作る（まとまった量を出せる）', check: (st, res, e) => res.production.marketBales >= 1200 * (1 - 0.15 * e) },
        { label: 'ブランド力を 55以上にする（名前で選ばれる）', check: (st, res, e) => st.brand >= 55 - 8 * e },
        { label: '1等米 90%以上で、販売用の米を 1,600俵以上 作る（本番の取引）', check: (st, res, e) => res.production.r1 >= 0.9 - 0.04 * e && res.production.marketBales >= 1600 * (1 - 0.15 * e) },
      ],
      done: (st) => { st.brand = U.clamp(st.brand + 8, 0, 100); st.flags.exportDeal = true; } },
    { id: 'region', icon: '🏘️', name: '地域の田んぼを守る仕組みを作る', who: 'ishii',
      lead: '「集落の田んぼを、この先も誰かが作り続けられるように、地域でまとまって引き受ける仕組みを作りたいんです。中心になってもらえませんか」',
      reward: '毎年、地域の取りまとめの交付金 60万円・地域の信頼 +10',
      stages: [
        { label: '地域の信頼を 75以上にする（みんなに頼られる）', check: (st, res, e) => st.trust >= 75 - 8 * e },
        { label: '経営面積を、挑戦を始めたときより 6ha 広げる（地域の田を引き受ける）', check: (st, res, e, g) => res.area.total >= g.area0 + 6 * (1 - 0.25 * e) },
        { label: '正社員を 2人以上 にする（任せられる人を育てる。本気なら正社員1人と常雇用パート1人でもよい）', check: (st, res, e) => st.staff.length >= 2 || (e > 0 && st.staff.length >= 1 && (st.regulars || []).length >= 1) },
        { label: '目が届く広さを超えずに、始めたときより 10ha 広げる（守れる仕組み）', check: (st, res, e, g) => !!res.manage && res.manage.over <= 0.001 && res.area.total >= g.area0 + 10 * (1 - 0.25 * e) },
      ],
      done: (st) => { st.trust = U.clamp(st.trust + 10, 0, 100); st.flags.regionDeal = true; } },
    { id: 'brand', icon: '🏷️', name: '自分の名前の米を立ち上げる', who: 'ogawa',
      lead: '「あなたの農場の名前で、ひとつの米を立ち上げませんか。こだわりの作り方、品評会の評判、お客さんの声。全部そろえば、名前で選ばれる米になります」',
      reward: 'ブランド力 +12・直販のお客さん +60人',
      stages: [
        { label: '特別栽培か有機栽培を、作付の3割以上にする（こだわりの作り方）', check: (st, res, e) => share(st, ['special', 'organic']) >= 0.3 - 0.05 * e },
        { label: '米の品評会で3位以内、または1等米 95%以上（評判を作る）', check: (st, res, e) => (!!res.contest && res.contest.rank <= 3) || (res.production.marketBales > 0 && res.production.r1 >= 0.95 - 0.03 * e) },
        { label: '直販のお客さんを、挑戦を始めたときより 80人 ふやす', check: (st, res, e, g) => st.direct.customers >= g.cust0 + 80 * (1 - 0.2 * e) },
        { label: 'ブランド力を 75以上にする（名前で選ばれる米）', check: (st, res, e) => st.brand >= 75 - 8 * e },
      ],
      done: (st) => { st.brand = U.clamp(st.brand + 12, 0, 100); st.direct.customers += 60; } },
  ];
  GO.grandDef = (id) => GO.GRAND.find((x) => x.id === id);
  GO.grandAt = (st) => (st.maxYear <= 10 ? 6 : st.maxYear <= 15 ? 10 : 11);
  GO.COST = { hard: 1000000, normal: 300000 };
  GO.active = (st) => !!(st.grand && st.grand.id && !st.grand.done && !st.grand.failed);
  E.POOL.push({
    id: 'grand_offer', who: 'takahashi', once: true, sq: 3,
    cond: (st) => st.mode !== 'endless' ? st.year >= GO.grandAt(st) && st.year <= st.maxYear - 3 && !st.grand : st.year >= 11 && !st.grand, weight: () => 100,
    title: '大きな挑戦',
    text: (st) => '「経営も大きくなってきた。ここから' + (st.mode === 'endless' ? '' : '最後の年までの') + '数年で、ひとつ大きなことに挑戦してみないか。どれも4つの段階があって、1年に1つずつ進めていく。やりとげれば、ずっと続くごほうびがあるよ」（毎年の初めに、どれだけ力を入れるかを決めます。' + (st.mode === 'endless' ? '' : st.maxYear + '年目の決算までに、4つの段階を達成すれば成功') + '）',
    choices: GO.GRAND.map((g) => ({ label: g.icon + ' ' + g.name, desc: '段階：' + g.stages.map((s, i) => (i + 1) + '. ' + s.label.replace(/（.*）/, '')).join(' → ') + '。ごほうび：' + g.reward,
      apply: (st) => { st.grand = { id: g.id, stage: 0, from: st.year, area0: area(st), cust0: st.direct.customers, effort: 'normal', effortYear: st.year, log: [] }; return '大きな挑戦「' + g.icon + g.name + '」を始めた。今年の段階：' + g.stages[0].label; } }))
      .concat([{ label: '今は挑戦しない', desc: '今の経営を続ける', apply: (st) => { st.grand = { id: null }; return '大きな挑戦は見送った。'; } }]),
  });
  E.POOL.push({
    id: 'grand_year', once: false, sq: 1,
    cond: (st) => GO.active(st) && st.year > st.grand.from && st.grand.effortYear !== st.year, weight: () => 100,
    title: '大きな挑戦：今年の取り組み',
    text: (st) => { const g = GO.grandDef(st.grand.id), s = g.stages[st.grand.stage]; return g.icon + '「' + g.name + '」の段階 ' + (st.grand.stage + 1) + ' / 4：' + s.label + '。今年は、どれだけ力を入れる？（' + (st.mode === 'endless' ? '' : '最後の年まで あと' + (st.maxYear - st.year + 1) + '年・') + 'のこり ' + (4 - st.grand.stage) + '段階）'; },
    choices: [
      { label: '本気で取り組む', desc: '費用 ' + U.man(GO.COST.hard) + '（視察・商談・研修）。今年の段階の目標が少しやさしくなる', apply: (st) => { st.grand.effort = 'hard'; st.grand.effortYear = st.year; RG.state.addLedger(st, { amount: -GO.COST.hard, cat: 'eventCost', label: '大きな挑戦の取り組み（本気）' }); return '今年は本気で取り組む。'; } },
      { label: 'いつもどおり取り組む', desc: '費用 ' + U.man(GO.COST.normal), apply: (st) => { st.grand.effort = 'normal'; st.grand.effortYear = st.year; RG.state.addLedger(st, { amount: -GO.COST.normal, cat: 'eventCost', label: '大きな挑戦の取り組み' }); return 'いつもどおり取り組む。'; } },
      { label: '今年は休む', desc: '費用はかからないが、今年は段階が進まない', apply: (st) => { st.grand.effort = 'rest'; st.grand.effortYear = st.year; return '今年は、大きな挑戦をひと休みする。'; } },
    ],
  });
  GO.grandAfterYear = function (st, res) {
    const G = st.grand;
    if (!GO.active(st)) return [];
    const g = GO.grandDef(G.id), notes = [];
    if (G.effortYear === st.year && G.effort === 'rest') notes.push(g.icon + ' 大きな挑戦は、今年はひと休みした。');
    else {
      const s = g.stages[G.stage], e = G.effortYear === st.year && G.effort === 'hard' ? 1 : 0;
      let ok = false;
      try { ok = !!s.check(st, res, e, G); } catch (er) { ok = false; }
      G.log.push({ year: st.year, stage: G.stage, ok });
      if (ok) {
        G.stage += 1; addPts(st, 1);
        if (G.stage >= g.stages.length) { G.done = st.year; g.done(st); notes.push('🏔️ 大きな挑戦「' + g.icon + g.name + '」をやりとげた！ ごほうび：' + g.reward + '・技術ポイント +1'); }
        else notes.push(g.icon + ' 大きな挑戦「' + g.name + '」の段階 ' + G.stage + ' / 4 を達成！（技術ポイント +1）。次の段階：' + g.stages[G.stage].label);
      } else notes.push(g.icon + ' 大きな挑戦「' + g.name + '」の段階 ' + (G.stage + 1) + '（' + s.label.replace(/（.*）/, '') + '）は、今年はとどかなかった。');
    }
    if (!G.done && st.mode !== 'endless' && st.year >= st.maxYear) { G.failed = st.year; notes.push(g.icon + ' 大きな挑戦「' + g.name + '」は、' + G.stage + ' / 4 の段階まで進んだところで、時間切れになった。'); }
    return notes;
  };
  // 年の初め：やりとげた挑戦の、毎年のごほうび
  GO.beginYear = function (st) {
    const L = lr(st);
    if (st.flags.exportDeal && L) { const b = Math.min(1500, L.production.marketBales || 0); if (b > 0) RG.state.addLedger(st, { amount: Math.round(b * 1500), cat: 'otherIncome', label: '輸出の取引の上乗せ（' + U.bales(b) + '）', month: 11 }); }
    if (st.flags.regionDeal) RG.state.addLedger(st, { amount: 600000, cat: 'otherIncome', label: '地域の取りまとめの交付金', month: 11 });
  };
  GO.afterYear = function (st, res) { return [].concat(GO.yearlyAfterYear(st, res), GO.grandAfterYear(st, res)); };
})(window.RG = window.RG || {});
