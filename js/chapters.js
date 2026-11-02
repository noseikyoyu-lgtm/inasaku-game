// 章立て・依頼・経営の道（20年を4つの章に分け、章ごとの目標と依頼で中だるみを防ぐ）。DOM 非依存
(function (RG) {
  'use strict';
  const D = RG.data, U = RG.util, E = RG.events;
  const CH = RG.chapters = {};

  // ---------- 4つの章 ----------
  CH.LIST = [
    { n: 1, from: 1, to: 5, name: '開業', icon: '🌱', theme: '#58a650', goal: '5年間生き残って、黒字の経営にする',
      intro: 'まずは1年1年を乗り切って、経営の土台を作ろうね。最初の5年は、失敗しながら覚える時期だよ。',
      news: ['作付・人手・売り先・お金を、自分で決めて始める', '2年目から年の初めに運だめし', '地域や取引先から「依頼」が届く', '5年目の終わりに中間評価と第1章のまとめ'] },
    { n: 2, from: 6, to: 10, name: '拡大', icon: '🚀', theme: '#e9a52a', goal: '選んだ「経営の道」を進んで、自分の色を出す',
      intro: '土台はできたね。ここからは、どんな経営にしたいかを決めて進む番だよ。',
      news: ['この章の初めに「経営の道」を選ぶ（道ごとにボーナスと依頼がある）', '新しい事業（作業受託・加工・直売所）で稼ぎ方を広げる', '地域の農家との順位が見えてくる', '10年目の終わりに中間評価と第2章のまとめ'] },
    { n: 3, from: 11, to: 15, name: '転換', icon: '🔄', theme: '#5aa6e0', goal: '時代の変化に備える（機械の買い替え・暑さ・借入）',
      intro: 'ここからは機械の寿命、暑くなる夏、ふくらんだ借入と、続けるための備えが試される時期だよ。',
      news: ['機械の買い替えの山がやってくる', '暑さに強い品種への切り替えの依頼', '借入を減らす依頼、後継ぎを決める依頼', '15年目の終わりに中間評価と第3章のまとめ'] },
    { n: 4, from: 16, to: 20, name: '継承', icon: '🎌', theme: '#b8508a', goal: '次の世代へ、よい形で経営を引き継ぐ',
      intro: 'いよいよ最後の5年。積み上げてきた経営を、どんな形で次の人に渡すか。総仕上げだね。',
      news: ['純資産を育て、地域の顔になる依頼', '20年目の終わりに最終評価と、選んだ道のエンディング'] },
  ];
  // 章・依頼・経営の道はストーリー（20年）だけ。自分の経営モードには出さない
  CH.on = (st) => st.mode !== 'endless';
  // st を渡すと、ストーリーごとの章の名前・目標・説明に差し替える（js/scenes.js）
  const withOv = (c, st) => { const ov = st && RG.scenes && RG.scenes.chapterOv(st, c.n); return ov ? Object.assign({}, c, ov) : c; };
  CH.of = (year, st) => withOv(CH.LIST.find((c) => year >= c.from && year <= c.to) || CH.LIST[CH.LIST.length - 1], st);
  CH.byN = (n, st) => withOv(CH.LIST.find((c) => c.n === n), st);
  CH.isStart = (year) => CH.LIST.some((c) => c.from === year);

  // ---------- 経営の道（第2章の初めに選ぶ） ----------
  CH.PATHS = {
    grow: { icon: '🚜', name: '規模拡大の道', desc: '田んぼを集めて、大きな面積で効率よく作る。', bonus: '毎年、農地の話が1件多く来る', goal: '経営面積 40ha 以上', check: (st) => U.sum(st.fields, (f) => f.area) >= 40,
      ending: '集落の田んぼの多くを預かる、地域いちばんの大規模経営になった。あなたの機械の音が、この土地の春と秋の合図だ。' },
    brand: { icon: '💎', name: 'ブランドの道', desc: '品質と売り方にこだわり、名前で選ばれる米を作る。', bonus: 'ブランド力が1.5倍の速さで育つ', goal: 'ブランド力 70 以上', check: (st) => st.brand >= 70,
      ending: 'あなたの米は、名前で指名して買われるようになった。袋に書かれた農場の名前が、そのまま信用の印だ。' },
    local: { icon: '🤝', name: '地域の要の道', desc: '作業受託や共同作業で、地域の田んぼと人を支える。', bonus: '地域の信頼が毎年さらに +1 育ち、契約の受け皿も広がる', goal: '地域の信頼 90 以上', check: (st) => st.trust >= 90,
      ending: '困ったときは、まずあなたに相談が来る。集落の田んぼを守る、なくてはならない存在になった。' },
    sixth: { icon: '🍡', name: '6次産業化の道', desc: '加工や直売所で、米の価値を自分の手で高めて売る。', bonus: '加工場と直売所を3割引きで建てられる', goal: '加工品と直売所の売上 年500万円以上', check: (st) => { const r = st.lastResult; return !!r && r.pl && (r.pl.get('procSales') + r.pl.get('standSales')) >= 5000000; },
      ending: '田んぼから食卓まで、あなたの手で届けている。米の値段に振り回されない、自分の商いができた。' },
  };
  CH.choosePath = function (st, key) {
    if (!CH.PATHS[key]) return '道が見つかりません';
    st.path = key;
    return null;
  };

  // ---------- 依頼 ----------
  // from〜until の年に話が来る。years 年のうちに check を満たせば達成。target は引き受けたときに決める
  const lr = (st) => st.lastResult;
  const pct = (v) => Math.round(v * 100) + '%';
  CH.MISSIONS = [
    { id: 'grade80', who: 'takahashi', from: 2, until: 3, years: 2, title: '1等米の割合を80%以上に',
      text: '「1等米は、毎日の水見回りの通知表みたいなもの。80%を超えたら、一人前の米づくりだよ」',
      check: (st, res) => res.production.marketBales > 0 && res.production.r1 >= 0.8, progress: (st) => lr(st) ? '去年 ' + pct(lr(st).production.r1) + '（目標 80%）' : '目標 80%',
      reward: { omamori: 1, skill: 0.01 } },
    { id: 'nocrunch', who: 'kimura', from: 2, until: 4, years: 1, title: 'つなぎ資金を使わずに1年を乗り切る',
      text: '「お金が足りなくなる月を出さないこと。それが、私たち金融機関がいちばん見ているところです」',
      check: (st, res) => res.cash.minBalance >= 0 && res.cash.emergencyPeak <= res.cash.emergencyStart + 1, progress: () => '1年を通して、資金がマイナスにならないこと',
      reward: { reroll: 1, lowRateNext: true } },
    { id: 'profit', who: 'kimura', from: 3, until: 4, years: 2, title: '農業所得を黒字にする',
      text: '「黒字の決算書を見せていただければ、次の融資のお話もしやすくなります」',
      check: (st, res) => res.analysis.income > 0, progress: (st) => lr(st) ? '去年の所得 ' + U.man(lr(st).analysis.income) : '所得をプラスに',
      reward: { cash: 300000, trust: 3 } },
    { id: 'trust50', who: 'tamura', from: 3, until: 5, years: 3, title: '地域の信頼を50以上に',
      text: '「この集落でやっていくなら、顔を覚えてもらうのが一番の近道だよ」',
      check: (st) => st.trust >= 50, progress: (st) => '今 ' + Math.round(st.trust) + '（目標 50）',
      reward: { land: 2.0, trust: 2 } },
    // 第2章（道ごと）
    { id: 'expand', path: 'grow', who: 'oyama', from: 6, until: 8, years: 3, title: '経営面積を広げる',
      target: (st) => Math.max(15, Math.round(U.sum(st.fields, (f) => f.area) * 1.5)),
      text: '「規模で勝負するなら、まずは面積だ。俺に負けないくらい集めてみな」',
      check: (st, res, m) => res.area.total >= m.target, progress: (st, m) => '今 ' + U.ha(U.sum(st.fields, (f) => f.area)) + '（目標 ' + U.ha(m.target) + '）',
      reward: { subsidyNext: true, trust: 2 } },
    { id: 'brandUp', path: 'brand', who: 'aoki', from: 6, until: 8, years: 3, title: 'ブランド力を育てる',
      target: (st) => Math.max(40, Math.round(st.brand + 20)),
      text: '「名前で選ばれる米は、一日にしてならず。広告とこだわりの積み重ねです」',
      check: (st, res, m) => st.brand >= m.target, progress: (st, m) => '今 ' + Math.round(st.brand) + '（目標 ' + m.target + '）',
      reward: { customers: 40, brand: 5 } },
    { id: 'helpHarvest', path: 'local', who: 'tamura', from: 6, until: 8, years: 2, title: '近所の稲刈りを5ha以上引き受ける',
      text: '「年寄りばかりで、稲刈りが回らなくてねえ。あんたのコンバインを貸してほしいんだ」',
      check: (st, res) => !!(res.sales.biz && res.sales.biz.harvest && res.sales.biz.harvest.area >= 5), progress: () => '「新しい事業」タブで作業受託を5ha以上',
      reward: { trust: 8, cash: 200000 } },
    { id: 'sellProc', path: 'sixth', who: 'ogawa', from: 6, until: 8, years: 3, title: '加工品を30俵分以上売る',
      text: '「米を餅や米粉にすると、お客さんの顔が変わるんですよ。一緒に盛り上げましょう」',
      check: (st, res) => !!(res.sales.biz && res.sales.biz.proc && res.sales.biz.proc.sold >= 30), progress: () => '「新しい事業」タブで加工場を建てて、加工に回す',
      reward: { customers: 30, brand: 6 } },
    { id: 'grade90', who: 'aoki', from: 7, until: 10, years: 3, title: '1等米90%以上の年を出す',
      text: '「うちのお客さんは見た目にもうるさい。90%を超えたら、もっと扱わせてもらいますよ」',
      check: (st, res) => res.production.marketBales > 0 && res.production.r1 >= 0.9, progress: (st) => lr(st) ? '去年 ' + pct(lr(st).production.r1) + '（目標 90%）' : '目標 90%',
      reward: { brand: 4, trust: 2, omamori: 1 } },
    { id: 'direct200', who: 'ogawa', from: 7, until: 10, years: 3, title: '直販のお客さんを増やす',
      target: (st) => Math.max(120, Math.round(st.direct.customers * 2)),
      text: '「一度ついたお客さんは、毎年の安定した売上になります。まずは数を増やしましょう」',
      check: (st, res, m) => st.direct.customers >= m.target, progress: (st, m) => '今 ' + U.num(st.direct.customers) + '人（目標 ' + U.num(m.target) + '人）',
      reward: { brand: 5, reroll: 1 } },
    // 第3章
    { id: 'heatTolerant', who: 'takahashi', from: 11, until: 13, years: 2, title: '暑さに強い品種を作付の3割以上に',
      text: '「夏はもう、昔の夏じゃない。新之助やにじのきらめきみたいに、暑さに強い品種を混ぜておこう」',
      check: (st, res) => { const P = res.production.plots, a = U.sum(P, (p) => p.area); return a > 0 && U.sum(P.filter((p) => (D.CROPS[p.crop].ht || 0) >= 0.6), (p) => p.area) / a >= 0.3; },
      progress: () => '高温耐性の強い品種（新之助・なつひめ・ゆきん子舞・にじのきらめき）を3割以上', reward: { skill: 0.01, trust: 3 } },
    { id: 'debtHalf', who: 'kimura', from: 11, until: 14, years: 3, title: '借入を半分に減らす',
      cond: (st) => RG.accounting.bs(st).longLoans >= 3000000,
      target: (st) => Math.round(RG.accounting.bs(st).longLoans * 0.5),
      text: '「借入が重いままだと、次の機械の買い替えで苦しくなります。少し身軽になっておきませんか」',
      check: (st, res, m) => res.bs.longLoans <= m.target, progress: (st, m) => '今 ' + U.man(RG.accounting.bs(st).longLoans) + '（目標 ' + U.man(m.target) + ' 以下）',
      reward: { lowRateNext: true, cash: 300000 } },
    { id: 'successor', who: 'takahashi', from: 13, until: 15, years: 3, title: '後継ぎを決める',
      cond: (st) => !RG.state.successor(st) && !RG.state.pendingSuccessor(st),
      text: '「経営は、続いてこそ経営だ。家族でも、外から来た若い人でもいい。後を託せる人を決めておこう」',
      check: (st) => !!(RG.state.successor(st) || RG.state.pendingSuccessor(st) || st.family.some((f) => f.tag === 'trainee')),
      progress: () => '家族の後継者、または研修生（健太さん）を迎える', reward: { trust: 5, omamori: 1 } },
    // 第4章
    { id: 'equity2x', who: 'kimura', from: 16, until: 17, years: 4, title: '純資産を、始めたときの2倍以上に',
      target: (st) => Math.max(st.initialEquity * 2, st.initialEquity + 10000000),
      text: '「20年の経営の成果は、最後は純資産に表れます。次の世代に、よい形で渡しましょう」',
      check: (st, res, m) => res.bs.equity >= m.target, progress: (st, m) => '今 ' + U.man(RG.accounting.bs(st).equity) + '（目標 ' + U.man(m.target) + '）',
      reward: { trust: 5, brand: 5 } },
    { id: 'trust80', who: 'sato', from: 16, until: 18, years: 3, title: '地域の信頼を80以上に',
      text: '「あんたには、この集落の田んぼを任せたいんじゃ。皆にそう思われる人になっておくれ」',
      check: (st) => st.trust >= 80, progress: (st) => '今 ' + Math.round(st.trust) + '（目標 80）', reward: { land: 3.0, brand: 3 } },
  ];
  CH.def = (id) => CH.MISSIONS.find((m) => m.id === id);

  // ごほうびの説明
  CH.rewardText = function (r) {
    const t = [];
    if (r.cash) t.push('報奨金 ' + U.man(r.cash) + '（翌年）');
    if (r.trust) t.push('地域の信頼 +' + r.trust);
    if (r.brand) t.push('ブランド力 +' + r.brand);
    if (r.customers) t.push('直販のお客さん +' + r.customers + '人');
    if (r.skill) t.push('技術力アップ');
    if (r.omamori) t.push('お守り +' + r.omamori);
    if (r.reroll) t.push('振り直し券 +' + r.reroll);
    if (r.lowRateNext) t.push('翌年の低金利');
    if (r.subsidyNext) t.push('翌年の機械の補助（半額）');
    if (r.land) t.push('条件の良い田 ' + r.land + 'haの話');
    return t.join('・');
  };

  CH.state = (st) => { st.missions = st.missions || []; st.chapterSeen = st.chapterSeen || {}; st.nextRewards = st.nextRewards || []; return st; };
  CH.active = (st) => CH.state(st).missions.filter((m) => m.status === 'active');

  // 依頼の話：年初のできごととして届き、引き受けるか決める
  CH.MISSIONS.forEach((m) => {
    E.POOL.push({
      id: 'mission_' + m.id, who: m.who, once: true, sq: 1, mission: true,
      cond: (st) => CH.on(st) && st.year + m.years - 1 <= st.maxYear && st.year >= m.from && st.year <= m.until && (!m.path || st.path === m.path) && (!m.cond || m.cond(st)) && !CH.state(st).missions.some((x) => x.id === m.id),
      weight: () => 0, // 年初のできごとの抽選には入れず、CH.queueOffers で必ず届ける
      title: '依頼：' + m.title,
      text: (st) => m.text + '（期限：' + (st.year + m.years - 1) + '年目の決算まで）',
      choices: [
        { label: '引き受ける', desc: 'ごほうび：' + CH.rewardText(m.reward) + '。期限までに達成できないと地域の信頼 −2', apply: (st) => { CH.accept(st, m.id); return '「' + m.title + '」を引き受けた。'; } },
        { label: '今回は断る', desc: '地域の信頼 −1', apply: (st) => { CH.state(st).missions.push({ id: m.id, status: 'declined', year: st.year }); st.trust = Math.max(0, st.trust - 1); return '依頼を断った。'; } },
      ],
    });
  });
  CH.accept = function (st, id) {
    const m = CH.def(id);
    const inst = { id, status: 'active', from: st.year, deadline: st.year + m.years - 1 };
    if (m.target) inst.target = m.target(st);
    CH.state(st).missions.push(inst);
  };
  // その年に届く依頼を、年初のできごとの先頭に入れる
  CH.queueOffers = function (st) {
    const ids = E.POOL.filter((e) => e.mission && e.cond(st) && st.events.queue.indexOf(e.id) < 0).map((e) => e.id);
    st.events.queue = ids.concat(st.events.queue);
  };

  // ---------- 年の始まり・終わり ----------
  CH.beginYear = function (st) {
    CH.state(st);
    // 前の年に達成したごほうびのうち、翌年に効くもの
    st.nextRewards.forEach((r) => {
      if (r.cash) RG.state.addLedger(st, { amount: r.cash, cat: 'otherIncome', label: '依頼の報奨金（' + r.title + '）', month: 3 });
      if (r.lowRateNext) st.yearFlags.lowRate = true;
      if (r.subsidyNext) st.yearFlags.machineSubsidy = true;
    });
    st.nextRewards = [];
    CH.queueOffers(st);
  };

  // 決算のあと：依頼の達成・失敗を判定する（res：その年の結果）
  CH.afterYear = function (st, res) {
    const notes = [];
    const done = [];
    CH.active(st).forEach((inst) => {
      const m = CH.def(inst.id);
      let ok = false;
      try { ok = !!m.check(st, res, inst); } catch (e) { ok = false; }
      if (ok) {
        inst.status = 'done'; inst.doneYear = st.year;
        const r = m.reward;
        if (r.trust) st.trust = Math.min(100, st.trust + r.trust);
        if (r.brand) st.brand = Math.min(100, st.brand + r.brand);
        if (r.customers) st.direct.customers += r.customers;
        if (r.skill) st.skill = Math.min(1.1, st.skill + r.skill);
        if (r.omamori) st.items.omamori += r.omamori;
        if (r.reroll) st.items.reroll += r.reroll;
        if (r.land) st.rivalLand = (st.rivalLand || []).concat([{ id: 'm_' + m.id, owner: D.PEOPLE[m.who] ? D.PEOPLE[m.who].name.replace(/（.*）/, '') : '地域の人', area: r.land, reason: '依頼を果たしてくれたお礼に' }]);
        if (r.cash || r.lowRateNext || r.subsidyNext) st.nextRewards.push(Object.assign({ title: m.title }, r));
        notes.push('【依頼達成】「' + m.title + '」を達成した！ ごほうび：' + CH.rewardText(r));
        done.push(m.id);
      } else if (st.year >= inst.deadline) {
        inst.status = 'failed'; inst.doneYear = st.year;
        st.trust = Math.max(0, st.trust - 2);
        notes.push('【依頼失敗】「' + m.title + '」は期限までに達成できなかった（地域の信頼 −2）。');
      }
    });
    res.missionNotes = notes;
    res.missionsDone = done;
    return notes;
  };

  // 章のまとめ（その章で引き受けた依頼の結果）
  CH.summary = function (st, chapter) {
    const c = CH.byN(chapter, st);
    const list = CH.state(st).missions.filter((m) => m.status !== 'declined' && m.from >= c.from && m.from <= c.to);
    return { chapter: c, list, done: list.filter((m) => m.status === 'done').length, failed: list.filter((m) => m.status === 'failed').length };
  };

  // ---------- 章の扉 ----------
  CH.needsDoor = (st) => CH.on(st) && CH.isStart(st.year) && !CH.state(st).chapterSeen[CH.of(st.year, st).n];
  // 扉を閉じて、運だめし（なければ年初のできごと・計画）へ
  CH.leave = function (st) {
    const c = CH.of(st.year, st);
    if (c.n === 2 && !st.path) return '経営の道を選んでください';
    CH.state(st).chapterSeen[c.n] = true;
    CH.queueOffers(st); // 道を選んだことで届く依頼もある
    // 道を選んだことで使えるようになるもの（加工場・ドローン請負・スマート農業など）
    if (RG.era && RG.era.checkUnlocks) RG.era.checkUnlocks(st).forEach((t) => st.news.push({ kind: 'good', text: t }));
    st.phase = RG.dice && RG.dice.active(st) ? 'dice' : st.events.queue.length ? 'event' : 'plan';
    return null;
  };
  // 自動で進めるとき（試算・検証）
  CH.skip = function (st, pathKey) {
    if (st.phase !== 'chapter') return;
    if (CH.of(st.year, st).n === 2 && !st.path) st.path = pathKey || 'grow';
    CH.leave(st);
  };
})(window.RG = window.RG || {});
