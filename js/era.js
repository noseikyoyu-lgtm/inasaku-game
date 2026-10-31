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
    if (!ERA.on(st)) return true;
    if (st.featOpen && ERA.FEATURES[id]) return !!st.featOpen[id]; // ストーリー：きっかけで開く
    const u = ERA.unlock(id);
    if (!u) return true;
    return st.year >= ERA.openYear(st, u);
  };
  ERA.featLocked = (st, id) => !!(st.featOpen && ERA.FEATURES[id] && !st.featOpen[id]);
  ERA.cropLocked = (st, crop) => !!(st.cropsOpen && ERA.CROP_RULES[crop] && !st.cropsOpen[crop]);
  ERA.mtypeLocked = (st, mtype) => ERA.UNLOCKS.some((u) => u.mtype === mtype && !ERA.isOpen(st, u.id));
  // 「○年目から」（ストーリーは「きっかけ：〜」）
  ERA.lockText = (st, id) => {
    if (st.featOpen && ERA.FEATURES[id]) return '🔒 きっかけ：' + ERA.FEATURES[id].hint;
    const u = ERA.unlock(id);
    return '🔒 ' + ERA.openYear(st, u) + '年目から使えます（あと' + (ERA.openYear(st, u) - st.year) + '年）';
  };

  // ---------- 品種の解放（ストーリーだけ） ----------
  // 最初は基本の品種だけ。経営の広がりや出来事をきっかけに、作れる品種が増えていく。
  // 新之助は生産者登録のできごと（js/events.js）で解放する
  const area = (st) => U.sum(st.fields, (f) => f.area);
  const lastH = (st) => st.history[st.history.length - 1];
  ERA.BASE_CROPS = ['koshiBL', 'koshiibuki'];
  ERA.CROP_RULES = {
    // 飼料用米は、畜産農家からの相談（できごと）で解放する
    feed: { hint: '米価が下がった年のあとや、経営面積が6ha以上になると、肉牛農家から「エサの米を作ってほしい」と相談が来る（遅くとも5年目）', check: () => false },
    hazuki: { hint: '経営面積 8ha以上（稲刈りが集中してくると、JAが極早生を勧めてくれる）', check: (st) => area(st) >= 8,
      why: '稲刈りが集中してきたので、JAから極早生の「葉月みのり」を勧められた。8月に刈れて、作業を分けられる。' },
    yukinko: { hint: '経営面積 12ha以上（業務用米の産地づくりに誘われる）', check: (st) => area(st) >= 12,
      why: '面積が広がり、業務用米の産地づくりに誘われた。早生多収の「ゆきん子舞」が作れる。' },
    akidawara: { hint: '経営面積 20ha以上（大規模向けの晩生多収品種）', check: (st) => area(st) >= 20,
      why: '大きな経営になり、晩生多収の「あきだわら」で収穫期をさらに分けられるようになった。' },
    niji: { hint: '1等米の割合が70%を下回った年のあと（遅くとも6年目）', check: (st) => st.history.some((x) => x.r1 < 0.7) || st.year >= 6,
      why: '暑さで品質が落ちる年が出てきた。高温に強い新品種「にじのきらめき」の試験栽培に誘われた。' },
    natsuhime: { hint: '猛暑の年を経験したあと（遅くとも11年目）', check: (st) => st.history.some((x) => x.weather === 'hot') || st.year >= 11,
      why: '猛暑の年を経験して、暑さに強い極早生「なつひめ」の種もみが手に入るようになった。' },
    koshi: { hint: '直販のお客さん 60人以上（こだわりのお客さんから頼まれる）', check: (st) => st.direct.customers >= 60,
      why: '直販のお客さんから「昔ながらのコシヒカリを食べたい」と頼まれた。従来のコシヒカリも作れる。' },
    koganemochi: { hint: '直売所か加工場を建てる、または直販のお客さん 100人以上', check: (st) => !!(RG.biz && (RG.biz.has(st, 'stand') || RG.biz.has(st, 'proc'))) || st.direct.customers >= 100,
      why: '餅や赤飯を作りたいというお客さんの声で、もち米「こがねもち」を作れるようになった。' },
    watabou: { hint: '直売所か加工場を建てる、または直販のお客さん 100人以上', check: (st) => !!(RG.biz && (RG.biz.has(st, 'stand') || RG.biz.has(st, 'proc'))) || st.direct.customers >= 100,
      why: '早生のもち米「わたぼうし」も作れるようになった。' },
    gohyaku: { hint: '地域の信頼 50以上（地元の酒蔵から声がかかる）', check: (st) => st.trust >= 50,
      why: '地元の酒蔵から「うちの酒米を作ってくれんか」と声がかかった。酒米「五百万石」が作れる。' },
    ipponjime: { hint: '五百万石を作って、1等米の割合が80%以上の年がある', check: (st) => !!(st.grown && st.grown.gohyaku) && st.history.some((x) => x.r1 >= 0.8),
      why: '酒蔵が五百万石の出来をほめてくれた。辛口の酒向けの「一本〆」も頼まれた。' },
    koshitanrei: { hint: '五百万石を作って、地域の信頼 70以上（大吟醸を任される）', check: (st) => !!(st.grown && st.grown.gohyaku) && st.trust >= 70,
      why: '酒蔵から大吟醸用の「越淡麗」を任された。最高級の酒米だ。' },
  };
  ERA.initCrops = function (st, extra) {
    st.cropsOpen = {};
    ERA.BASE_CROPS.concat(extra || []).forEach((k) => { st.cropsOpen[k] = true; });
    st.grown = {};
    st.grownCult = {};
    st.featOpen = {};
    if (st.machines.some((m) => m.lease)) st.featOpen.lease = true; // リースの機械を引き継いだ経営
  };

  // ---------- 品種以外の解放（ストーリーだけ） ----------
  // check を満たすと開く。check がないものは、できごとで開く
  const hasType = (st, type) => st.machines.some((m) => D.MODELS[m.model].type === type);
  const priceDrop = (st) => { const hs = st.history; return hs.length >= 2 && hs[hs.length - 1].price <= hs[hs.length - 2].price * 0.95; };
  ERA.FEATURES = {
    // 栽培方法と人
    special: { icon: '🌿', name: '特別栽培（農薬・化学肥料を減らす）', tab: 'crops', group: '栽培方法と人',
      hint: '1等米の割合が80%以上の年を出す、または直販のお客さん40人以上（減農薬の勉強会に誘われる）', check: (st) => st.history.some((x) => x.r1 >= 0.8) || st.direct.customers >= 40,
      why: 'JAの減農薬の勉強会に誘われた。農薬と化学肥料を減らした「特別栽培」ができるようになった。' },
    organic: { icon: '🍀', name: '有機栽培', tab: 'crops', group: '栽培方法と人',
      hint: '特別栽培を2年作る（有機JASの講習に誘われる）', check: (st) => ((st.grownCult || {}).special || 0) >= 2,
      why: '特別栽培の実績を見て、有機JASの講習に誘われた。「有機栽培」に挑戦できる（認証まで2年かかる）。' },
    directSow: { icon: '🌱', name: '直播（田に直接種をまく）', tab: 'crops', group: '栽培方法と人',
      hint: '経営面積15ha以上、または春に人手が足りなかった年のあと（JAが直播の研修を案内してくれる）', check: (st) => area(st) >= 15 || !!(st.lastResult && st.lastResult.labor && st.lastResult.labor.seasons.spring.ratio > 0.03),
      why: '春の作業が追いつかなくなってきた。JAの直播の研修を受け、田植えをしない「直播」ができるようになった。' },
    staff: { icon: '👷', name: '正社員の雇用', tab: 'labor', group: '栽培方法と人',
      hint: '経営面積15ha以上（法人は最初から）', check: (st) => st.corp || area(st) >= 15,
      why: '経営が大きくなり、ハローワークに正社員の求人を出せるようになった。' },
    // お金と制度
    incomeIns: { icon: '🛡️', name: '収入保険', tab: 'finance', group: 'お金と制度',
      hint: '青色申告の実績が2年たまる（3年目から）', check: (st) => st.history.length >= 2,
      why: '青色申告の実績が2年たまり、収入保険に入れるようになった。米価の下落にも備えられる。' },
    nintei: { icon: '📋', name: '認定農業者（低利の制度資金・機械の補助事業）', tab: 'finance', group: 'お金と制度',
      hint: '経営面積5ha以上で、2年続けて黒字になると、市役所から認定の話が来る' },
    // 機械
    used: { icon: '🔧', name: '中古機械の出物', tab: 'machines', group: '機械',
      hint: '機械が故障した年のあと（修理屋さんが中古の情報を教えてくれる。遅くとも5年目）', check: (st) => !!st.flags.hadBreakdown || st.year >= 5,
      why: '機械の修理を頼んだ農機具屋さんが、中古機械の情報を教えてくれるようになった。' },
    lease: { icon: '📄', name: '機械のリース', tab: 'machines', group: '機械',
      hint: '機械を初めて買った年のあと（遅くとも6年目）', check: (st) => !!st.flags.boughtMachine || st.year >= 6,
      why: '機械を買ったときに、金融機関の木村さんが「リースという方法もありますよ」と教えてくれた。' },
    large: { icon: '🚜', name: '大型の機械（100馬力のトラクタ・6条コンバインなど）', tab: 'machines', group: '機械',
      hint: '経営面積25ha以上（メーカーが大型機を勧めに来る）', check: (st) => area(st) >= 25,
      why: '経営面積が広がり、農機メーカーの営業が大型機を勧めに来た。大型の機械が買えるようになった。' },
    drone: { icon: '🛸', name: '防除用ドローン', tab: 'machines', group: '機械',
      hint: '病気や害虫が出た年のあと（遅くとも6年目）', check: (st) => !!st.flags.hadPest || st.year >= 6,
      why: '病害虫の被害を受けて、JAから防除用ドローンの実演会に誘われた。' },
    smart: { icon: '📡', name: 'スマート農業（自動操舵・水管理）', tab: 'machines', group: '機械',
      hint: '経営面積30ha以上か、正社員2人以上（規模拡大の道なら20ha以上）', check: (st) => area(st) >= (st.path === 'grow' ? 20 : 30) || st.staff.length >= 2,
      why: '大きな経営になり、スマート農業の実証事業に誘われた。自動操舵や水管理の機械が入れられる。' },
    // 事業・売り方
    store: { icon: '⏳', name: '米を保管して春に売る', tab: 'sales', group: '事業と売り方',
      hint: '米価が前の年より下がった年のあと（遅くとも4年目）', check: (st) => priceDrop(st) || st.year >= 4,
      why: '秋の値下がりを見て、米を保管して春に売る方法を高橋さんが教えてくれた。' },
    harvest: { icon: '🌾', name: '稲刈りの作業受託', tab: 'biz', group: '事業と売り方',
      hint: '地域の信頼50以上で、コンバインを持っている（近所から稲刈りを頼まれる）', check: (st) => st.trust >= 50 && hasType(st, 'combine'),
      why: '近所の人から「うちの稲刈りもやってくれんか」と頼まれた。稲刈りの作業受託ができる。' },
    stand: { icon: '🏪', name: '農産物の直売所', tab: 'biz', group: '事業と売り方',
      hint: '直販のお客さん80人以上（お客さんから「お店があれば」と言われる）', check: (st) => st.direct.customers >= 80,
      why: 'お客さんから「直接買えるお店があればいいのに」と言われた。直売所を建てられる。' },
    proc: { icon: '🍡', name: '餅・米粉の加工場', tab: 'biz', group: '事業と売り方',
      hint: 'もち米を作った年のあと（6次産業化の道を選べば、すぐ）', check: (st) => st.path === 'sixth' || !!(st.grown && (st.grown.koganemochi || st.grown.watabou)),
      why: 'もち米の出来を見た商工会から、餅や米粉の加工場づくりに誘われた。' },
    droneBiz: { icon: '🛸', name: 'ドローン防除の請負', tab: 'biz', group: '事業と売り方',
      hint: 'ドローンを持っていて、地域の信頼60以上（地域の要の道なら、ドローンを持っていればすぐ）', check: (st) => hasType(st, 'drone') && (st.trust >= 60 || st.path === 'local'),
      why: '近所から「うちの田んぼもドローンで消毒してほしい」と頼まれた。ドローン防除の請負ができる。' },
  };
  // きっかけを満たした品種・要素を解放して、知らせの文を返す
  ERA.checkUnlocks = function (st) {
    const out = [];
    if (st.cropsOpen) Object.keys(ERA.CROP_RULES).forEach((k) => {
      if (st.cropsOpen[k] || !ERA.CROP_RULES[k].check(st)) return;
      st.cropsOpen[k] = true;
      out.push('🔓 新しい品種「' + D.CROPS[k].name + '」が作れるようになった。' + ERA.CROP_RULES[k].why);
    });
    if (st.featOpen) Object.keys(ERA.FEATURES).forEach((k) => {
      const f = ERA.FEATURES[k];
      if (st.featOpen[k] || !f.check || !f.check(st)) return;
      st.featOpen[k] = true;
      out.push('🔓 ' + f.icon + ' ' + f.name + 'が使えるようになった。' + f.why);
    });
    return out;
  };
  ERA.checkCrops = ERA.checkUnlocks;
  // 解放の一覧（品種と要素）
  ERA.unlockList = function (st) {
    const out = [];
    if (st.cropsOpen) D.CROP_ORDER.filter((k) => k !== 'none' && !D.CROPS[k].alias).forEach((k) => {
      const c = D.CROPS[k];
      const flagLocked = c.unlock && !st.flags[c.unlock];
      const open = !flagLocked && !ERA.cropLocked(st, k);
      out.push({ group: '品種', icon: D.cropIcon(k), name: c.name, open, hint: open ? null : flagLocked ? '1等米の割合80%以上の年を出すと、JAから生産者登録の話が来る' : ERA.CROP_RULES[k].hint });
    });
    if (st.featOpen) Object.keys(ERA.FEATURES).forEach((k) => {
      const f = ERA.FEATURES[k];
      out.push({ group: f.group, icon: f.icon, name: f.name, open: !!st.featOpen[k], hint: st.featOpen[k] ? null : f.hint, tab: f.tab });
    });
    return out;
  };
  ERA.cropHint = (st, crop) => (ERA.cropLocked(st, crop) ? ERA.CROP_RULES[crop].hint : null);

  // 認定農業者：市役所からの話（断ると2年後にまた来る）
  E.POOL.push({
    id: 'nintei_offer', who: 'takahashi', sq: 1,
    cond: (st) => !!st.featOpen && !st.featOpen.nintei && area(st) >= 5 && st.history.length >= 2 && st.history.slice(-2).every((x) => x.income > 0) && st.year - (st.flags.ninteiAsked || 0) >= 2,
    weight: () => 100,
    title: '認定農業者にならないか',
    text: () => '「市役所の農林課から、認定農業者にならないかと話が来ているよ。5年後の経営の目標（面積・所得・労働時間）を書いた『経営改善計画』を出して認めてもらうんだ。' +
      '認定されると、低い金利の制度資金（スーパーL資金）が借りられるし、機械の補助事業にも申し込めるようになる。計画を書くこと自体が、経営を見直すいい機会になるよ」',
    choices: [
      { label: '経営改善計画を出す', desc: '認定農業者になる：低利の制度資金・機械の補助事業の話が来るように。地域の信頼 +2', apply: (st) => { st.featOpen.nintei = true; st.trust = Math.min(100, st.trust + 2); return '🔓 認定農業者になった。「資金・保険」でスーパーL資金が借りられ、機械の補助事業の話も来るようになる。'; } },
      { label: '今は見送る', desc: '2年後に、また話が来る', apply: (st) => { st.flags.ninteiAsked = st.year; return '今回は見送った。'; } },
    ],
  });
  // 機械の補助事業：ストーリーでは認定農業者だけ
  const subs = E.get('machine_subsidy');
  if (subs) { const c1 = subs.cond; subs.cond = (st) => c1(st) && (!st.featOpen || !!st.featOpen.nintei); }
  // 畜産農家からの相談：飼料用米（新潟次郎）を作れるようになる。断ると2年後にまた来る
  E.POOL.push({
    id: 'feed_offer', who: 'takahashi', sq: 1,
    cond: (st) => !!st.cropsOpen && !st.cropsOpen.feed && st.year >= 3 && st.year - (st.flags.feedAsked || 0) >= 2 && (priceDrop(st) || area(st) >= 6 || st.year >= 5),
    weight: () => 100,
    title: '肉牛農家からの相談',
    text: (st) => '「近くで肉牛を育てている大川さんが、輸入のトウモロコシが値上がりして困っていてね。エサになる米（飼料用米）を作ってくれる人を探しているんだ。' +
      '飼料用米は売り値こそ安いが、国の交付金が出るから、10aあたりの手取りはそこそこになる。' + (priceDrop(st) ? '去年のように主食用の米が値下がりしたときの、逃げ道にもなるよ。' : '主食用の米が値下がりしたときの、逃げ道にもなるよ。') + '多収の「新潟次郎」なら手間も少ない」',
    choices: [
      { label: '作ってみる', desc: '飼料用米「新潟次郎」が作れるようになる・地域の信頼 +2', apply: (st) => { st.cropsOpen.feed = true; st.trust = Math.min(100, st.trust + 2); return '🔓 飼料用米「新潟次郎」が作れるようになった。「作付計画」で選べる。'; } },
      { label: '今はやめておく', desc: '2年後に、また話が来る', apply: (st) => { st.flags.feedAsked = st.year; return '今回は見送った。'; } },
    ],
  });

  // 新之助の生産者登録：ストーリーでは、1等米の割合が80%以上の年を出してから
  const shin = E.get('shinnosuke_reg');
  if (shin) { const c0 = shin.cond; shin.cond = (st) => c0(st) && (!st.cropsOpen || st.history.some((x) => x.r1 >= 0.8)); }

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
      if (ERA.on(st) && !st.featOpen && ERA.openYear(st, u) === st.year) news.push({ kind: 'good', text: '🔓 新しく使えるようになった：' + u.icon + ' ' + u.name + '（「' + (RG.advisor && RG.advisor.TAB_NAMES ? RG.advisor.TAB_NAMES[u.tab] : u.tab) + '」タブ）' });
    });
    const now = ERA.trialOf(st, st.year), next = ERA.trialOf(st, st.year + 1);
    if (now) news.unshift({ kind: 'bad', text: '【試練の年】' + now.icon + ' ' + now.name + '：予告どおり、今年は厳しい年になりそうだ。' });
    if (next && st.year + 1 <= st.maxYear) news.unshift({ kind: 'warn', text: '⚠️ 予告：来年は「' + next.name + '」のおそれ。' + next.notice });
    if (ERA.on(st) && st.year === 11) news.push({ kind: 'warn', text: '🌡️ 夏の暑さが年々厳しくなっている。これからは猛暑の年がもっと増えそうだ。' });
    if (ERA.on(st) && st.year === 11) news.push({ kind: 'info', text: '📰 来年、国の制度（交付金・保険）が見直されるらしい。' });
    ERA.checkUnlocks(st).forEach((t) => news.push({ kind: 'good', text: t }));
    st.news = news.concat(st.news || []);
  };

  // 決算のあと：試練を乗り越えたか
  ERA.afterYear = function (st, res) {
    if (st.cropsOpen) st.plan.forEach((r) => { if (r.area > 0) st.grown[r.crop] = true; });
    if (st.featOpen) {
      if (st.plan.some((r) => r.area > 0 && r.cult === 'special')) st.grownCult.special = (st.grownCult.special || 0) + 1;
      if ((res.broken || []).length) st.flags.hadBreakdown = true;
      if (res.production && res.production.pestLoss > 0) st.flags.hadPest = true;
    }
    const opened = ERA.checkUnlocks(st);
    const t = ERA.trialOf(st, st.year);
    if (!t) return opened;
    st.trials = st.trials || [];
    st.trials.push({ id: t.id, year: st.year, income: Math.round(res.analysis.income) });
    return ['【試練】' + t.icon + ' ' + t.name + 'の年' + (res.analysis.income > 0 ? 'を黒字で乗り越えた' : 'を、赤字ながら終えた') + '（この年の所得 ' + U.man(res.analysis.income) + '）。'].concat(opened);
  };
})(window.RG = window.RG || {});
