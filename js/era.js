// 時代の流れ：予告される試練の年・制度の見直し・少しずつ開放される新しい要素。DOM 非依存
(function (RG) {
  'use strict';
  const D = RG.data, U = RG.util, E = RG.events;
  const ERA = RG.era = {};

  // ---------- 試練の年（1年前に予告。年はシードで少しずれる） ----------
  ERA.TRIALS = [
    { id: 'coldSummer', icon: '❄️', name: '大冷夏', range: [7, 9], yearType: 'cold', force: [['cold', 'heavy'], ['sun', 'mid']],
      notice: '長期予報では、来年の夏は冷たい空気が居座り、記録的な冷夏になるおそれ。冷えに強い品種を混ぜる、田植えの時期をずらす、収量共済に入るなどで備えておこう。',
      hit: '記録的な冷夏。日照不足と低温で、稲の実入りが悪い。' },
    { id: 'priceCrash', icon: '📉', name: '米価暴落', range: [12, 14], priceMult: 0.72, forecastMult: 0.86,
      notice: '全国で作付が増え、米の在庫が積み上がっている。来年は米価が大きく下がるおそれ。値段の決まった売り先、収入保険、経費の見直しで備えておこう。',
      hit: '在庫の山で、米価が大きく下がった。' },
    { id: 'heatWave', icon: '🔥', name: '記録的猛暑', range: [17, 19], yearType: 'hot', force: [['heat', 'heavy'], ['foehn', 'heavy'], ['sun', 'mid']], hedgeOff: true, // 全国の収量は平年並みで、品質だけが落ちる（値上がりしない）
      notice: '来年の夏は、記録的な暑さになるおそれ。暑さに強い品種（新之助・にじのきらめき・なつひめ）への切り替えや、水の管理の人手を考えておこう。',
      hit: '記録的な猛暑。高温で白く濁った米が増え、品質が落ちた。' },
  ];
  ERA.trialYear = (st, t) => t.range[0] + (RG.rng.hash(st.seed, 'trial', t.id) % (t.range[1] - t.range[0] + 1));
  // 試練・制度の見直し・段階的な開放はストーリー（20年）だけ。自分の経営モードは最初から全部使え、試練もない
  ERA.on = (st) => st.mode !== 'endless';
  ERA.trialOf = (st, year) => !ERA.on(st) ? null : ERA.TRIALS.find((t) => ERA.trialYear(st, t) === year) || null;

  // 天候・米価を決めるときに、試練の年の分を上書きする（market.genWorld から呼ばれる）
  ERA.forceYearType = (st, year) => { const t = ERA.trialOf(st, year); return t && t.yearType ? t.yearType : null; };
  ERA.forceEvents = function (st, year, events) {
    const t = ERA.trialOf(st, year);
    if (!t || !t.force) return events;
    const out = events.filter((e) => !t.force.some((f) => f[0] === e.id));
    t.force.forEach(([id, sev]) => out.push({ id, hit: true, sev }));
    return out;
  };
  ERA.priceMult = (st, year) => { const t = ERA.trialOf(st, year); return t && t.priceMult ? t.priceMult : 1; };
  ERA.hedgeOff = (st, year) => { const t = ERA.trialOf(st, year); return !!(t && t.hedgeOff); };
  ERA.forecastMult = (st, year) => { const t = ERA.trialOf(st, year); return t && t.forecastMult ? t.forecastMult : 1; };

  // ---------- 少しずつ開放される新しい要素 ----------
  // year：使えるようになる年。path：その道を選んでいれば早く使える年。「自分の経営」は最初から全部使える
  ERA.UNLOCKS = [
    { id: 'store', year: 3, icon: '⏳', name: '米を保管して春に売る', tab: 'sales' },
    { id: 'niji', year: 3, icon: '🌾', name: '新品種「にじのきらめき」', tab: 'crops', crop: 'niji' },
    { id: 'drone', year: 4, icon: '🛸', name: '防除用ドローン', tab: 'machines', mtype: 'drone' },
    { id: 'harvest', year: 6, icon: '🌾', name: '稲刈りの作業受託', tab: 'biz' },
    { id: 'stand', year: 6, icon: '🏪', name: '農産物の直売所', tab: 'biz' },
    { id: 'proc', year: 8, path: { sixth: 6 }, icon: '🍡', name: '餅・米粉の加工場', tab: 'biz' },
    { id: 'droneBiz', year: 8, path: { local: 6 }, icon: '🛸', name: 'ドローン防除の請負', tab: 'biz' },
    { id: 'smart', year: 11, path: { grow: 9 }, icon: '📡', name: 'スマート農業（自動操舵・水管理）', tab: 'machines', mtype: 'smart' },
  ];
  ERA.unlock = (id) => ERA.UNLOCKS.find((u) => u.id === id);
  ERA.openYear = (st, u) => (st.path && u.path && u.path[st.path] ? Math.min(u.year, u.path[st.path]) : u.year);
  ERA.isOpen = function (st, id) {
    const u = ERA.unlock(id);
    if (!u || !ERA.on(st)) return true;
    return st.year >= ERA.openYear(st, u);
  };
  ERA.cropLocked = (st, crop) => ERA.UNLOCKS.some((u) => u.crop === crop && !ERA.isOpen(st, u.id));
  ERA.mtypeLocked = (st, mtype) => ERA.UNLOCKS.some((u) => u.mtype === mtype && !ERA.isOpen(st, u.id));
  // 「○年目から」
  ERA.lockText = (st, id) => { const u = ERA.unlock(id); return '🔒 ' + ERA.openYear(st, u) + '年目から使えます（あと' + (ERA.openYear(st, u) - st.year) + '年）'; };

  // ---------- 制度の見直し（12年目） ----------
  E.POOL.push({
    id: 'policy_review', who: 'takahashi', once: true, sq: 0,
    cond: (st) => ERA.on(st) && st.year === 12, weight: () => 100,
    title: '国の制度の見直し',
    text: () => '「国の方針が変わって、飼料用米の交付金が3割減ることになった。その代わり、収入保険の掛金の補助が手厚くなる。制度は変わるもの。制度に頼りきらない経営が強いんだ」',
    choices: [{ label: 'わかった', desc: '飼料用米の交付金 −30%・収入保険の掛金が安くなる', apply: (st) => { st.market.feedSubsidyMult *= 0.7; st.flags.incomeInsCheap = true; return '飼料用米の交付金が減り、収入保険の掛金が安くなった。'; } }],
  });

  // ---------- 年の始まり：ニュース ----------
  ERA.beginYear = function (st) {
    const news = [];
    ERA.UNLOCKS.forEach((u) => {
      if (ERA.on(st) && ERA.openYear(st, u) === st.year) news.push({ kind: 'good', text: '🔓 新しく使えるようになった：' + u.icon + ' ' + u.name + '（「' + (RG.advisor && RG.advisor.TAB_NAMES ? RG.advisor.TAB_NAMES[u.tab] : u.tab) + '」タブ）' });
    });
    const now = ERA.trialOf(st, st.year), next = ERA.trialOf(st, st.year + 1);
    if (now) news.unshift({ kind: 'bad', text: '【試練の年】' + now.icon + ' ' + now.name + '：予告どおり、今年は厳しい年になりそうだ。' });
    if (next && st.year + 1 <= st.maxYear) news.unshift({ kind: 'warn', text: '⚠️ 予告：来年は「' + next.name + '」のおそれ。' + next.notice });
    if (ERA.on(st) && st.year === 11) news.push({ kind: 'warn', text: '🌡️ 夏の暑さが年々厳しくなっている。これからは猛暑の年がもっと増えそうだ。' });
    if (ERA.on(st) && st.year === 11) news.push({ kind: 'info', text: '📰 来年、国の制度（交付金・保険）が見直されるらしい。' });
    st.news = news.concat(st.news || []);
  };

  // 決算のあと：試練を乗り越えたか
  ERA.afterYear = function (st, res) {
    const t = ERA.trialOf(st, st.year);
    if (!t) return [];
    st.trials = st.trials || [];
    st.trials.push({ id: t.id, year: st.year, income: Math.round(res.analysis.income) });
    return ['【試練】' + t.icon + ' ' + t.name + 'の年' + (res.analysis.income > 0 ? 'を黒字で乗り越えた' : 'を、赤字ながら終えた') + '（この年の所得 ' + U.man(res.analysis.income) + '）。'];
  };
})(window.RG = window.RG || {});
