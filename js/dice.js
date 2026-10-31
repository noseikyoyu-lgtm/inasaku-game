// サイコロ：年初の運だめし（幸運・不運のカード）、シーズン中のサイコロ勝負、お守り・振り直し券
// 目はすべてシードで決まる（同じシードなら同じ目）。画面は振る演出だけを受け持つ
(function (RG) {
  'use strict';
  const D = RG.data, U = RG.util;
  const DI = RG.dice = {};

  DI.FROM_YEAR = 2; // 1年目は運だめし・勝負なし（操作に慣れてもらう）
  DI.FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

  // key ごと・i 回目の目（1〜6）
  DI.face = (st, key, i) => RG.rng.make(st.seed, st.year, 'dice:' + key, i || 0).int(1, 6);

  const S = () => RG.state;
  const addCost = (st, amount, label) => S().addLedger(st, { amount: -Math.round(amount), cat: 'eventCost', label });
  const addIncome = (st, amount, label) => S().addLedger(st, { amount: Math.round(amount), cat: 'otherIncome', label });
  const flags = (st) => st.yearFlags || (st.yearFlags = {});
  const addLabor = (st, season, hours) => { const f = flags(st); f.cardLabor = f.cardLabor || {}; f.cardLabor[season] = (f.cardLabor[season] || 0) + hours; };
  const mulY = (st, m) => { const f = flags(st); f.cardY = (f.cardY || 1) * m; };
  const hasMachine = (st, type) => st.machines.some((m) => D.MODELS[m.model].type === type);
  const area = (st) => U.sum(st.plan, (r) => r.area);
  const marketArea = (st) => U.sum(st.plan.filter((r) => D.CROPS[r.crop] && D.CROPS[r.crop].market), (r) => r.area);
  const transplantArea = (st) => U.sum(st.plan.filter((r) => r.sow === 'transplant'), (r) => r.area);
  const helped = (st) => st.trust >= 60; // 地域の信頼が高いと近所が助けてくれる
  const clampTrust = (v) => U.clamp(v, 0, 100);

  // ---------- 不運のカード ----------
  DI.BAD = [
    { id: 'snow_house', icon: '❄️', title: '大雪で育苗ハウスがつぶれた', cond: (st) => transplantArea(st) > 0,
      apply: (st) => { const c = helped(st) ? 120000 : 280000; addCost(st, c, '育苗ハウスの修繕');
        return '育苗ハウスの修繕に ' + U.man(c) + (helped(st) ? '。近所の人が雪下ろしを手伝ってくれ、被害は小さくすんだ。' : 'かかった。'); } },
    { id: 'theft', icon: '🚨', title: '倉庫から農機具が盗まれた',
      apply: (st) => { addCost(st, 180000, '盗まれた農機具の買い直し'); return '刈払機や工具を買い直すのに 18万円かかった。'; } },
    { id: 'back_pain', icon: '🤕', title: '経営主がぎっくり腰に',
      apply: (st) => { addLabor(st, 'spring', 120); return '春の作業が思うように進まない（春の作業 +120時間分の人手が必要）。'; } },
    { id: 'hospital', icon: '🏥', title: '家族が入院した',
      apply: (st) => { addLabor(st, 'summer', 100); return '看病で夏の作業に手が回らない（夏の作業 +100時間分の人手が必要）。'; } },
    { id: 'fert_up', icon: '📈', title: '肥料が急に値上がりした',
      apply: (st) => { flags(st).matUp = (flags(st).matUp || 0) + 0.08; return '今年の資材費が 8% 上がる。'; } },
    { id: 'pump', icon: '💧', title: '用水ポンプが壊れた',
      apply: (st) => { addCost(st, 150000, '用水ポンプの交換'); return 'ポンプの交換に 15万円かかった。'; } },
    { id: 'bad_review', icon: '📉', title: 'ネットで悪い口コミが広がった', cond: (st) => st.direct.customers >= 10,
      apply: (st) => { const n = Math.round(st.direct.customers * 0.15); st.direct.customers -= n; st.brand = Math.max(0, st.brand - 4);
        return '直販の顧客が ' + n + '人 離れ、ブランド力が下がった。'; } },
    { id: 'land_back', icon: '🏠', title: '地主さんが田んぼを返してほしいと',
      cond: (st) => st.fields.filter((f) => !f.owned).length >= 2,
      apply: (st) => { const f = st.fields.filter((x) => !x.owned).sort((a, b) => a.area - b.area)[0];
        st.fields = st.fields.filter((x) => x !== f); S().fitPlan(st);
        return '相続した子どもが自分で使うことになり、' + f.name + '（' + U.ha(f.area) + '）を返した。作付計画を見直そう。'; } },
    { id: 'tax_audit', icon: '🧾', title: '税務調査が入った',
      apply: (st) => { const c = st.skill >= 1 ? 60000 : 150000; addCost(st, c, '税務調査の追徴');
        return '記帳の不備を指摘され、' + U.man(c) + ' を追加で納めた。日ごろの帳簿づけが大切だ。'; } },
    { id: 'truck', icon: '🚚', title: '軽トラックが事故で廃車に',
      apply: (st) => { addCost(st, 450000, '軽トラックの買い替え'); return 'けが人はなかったが、中古の軽トラを 45万円で買い直した。'; } },
    { id: 'crows', icon: '🐦', title: 'カラスとスズメの被害',
      apply: (st) => { mulY(st, 0.98); return '今年は鳥の被害が多くなりそうだ（収量 −2%）。'; } },
    { id: 'canal_break', icon: '🌊', title: '大雨で用水路が崩れた',
      apply: (st) => { const c = Math.max(30000, area(st) * 10 * 2000); addCost(st, c, '用水路の復旧負担金'); return '復旧の負担金（10aあたり2,000円）で ' + U.man(c) + '。'; } },
    { id: 'heatstroke', icon: '🥵', title: '家族が熱中症で倒れた',
      apply: (st) => { addLabor(st, 'summer', 80); return '夏の作業を休ませることにした（夏の作業 +80時間分の人手が必要）。'; } },
    { id: 'roof', icon: '🏚️', title: '資材倉庫が雨漏り',
      apply: (st) => { addCost(st, 120000, '倉庫の修理'); return '屋根の修理に 12万円かかった。'; } },
    { id: 'fuel_up', icon: '⛽', title: '燃料が高騰した',
      apply: (st) => { flags(st).matUp = (flags(st).matUp || 0) + 0.05; return '今年の資材費（燃料を含む）が 5% 上がる。'; } },
    { id: 'staff_injury', icon: '🩹', title: '社員がけがで休むことに', cond: (st) => st.staff.length > 0,
      apply: (st) => { addLabor(st, 'autumn', 150); return '秋の作業に穴があく（秋の作業 +150時間分の人手が必要）。'; } },
    { id: 'quake', icon: '🌋', title: '地震で田んぼの畦が崩れた',
      apply: (st) => { const c = helped(st) ? 100000 : 220000; addCost(st, c, '畦の補修');
        return '畦の補修に ' + U.man(c) + (helped(st) ? '。地域の人たちと共同で直し、費用を抑えられた。' : 'かかった。'); } },
    { id: 'disease_near', icon: '🦠', title: '近くの田で病気が広がっている',
      apply: (st) => { mulY(st, 0.97); return '今年は病気が出やすい（収量 −3%）。収量共済に入っていれば減収の一部が戻る。'; } },
  ];

  // ---------- 幸運のカード ----------
  DI.GOOD = [
    { id: 'subsidy', icon: '🏆', title: '機械の補助事業に採択された',
      apply: (st) => { flags(st).machineSubsidy = true; return '今年、新品の機械を1台半額で買える（「機械・設備」タブ）。'; } },
    { id: 'tv', icon: '📺', title: 'テレビで紹介された',
      apply: (st) => { const n = Math.max(20, Math.round(st.direct.customers * 0.3)); st.direct.customers += n; st.brand = Math.min(100, st.brand + 8);
        return '地元の番組で取り上げられ、直販の顧客が ' + n + '人 増え、ブランド力が上がった。'; } },
    { id: 'good_land', icon: '🌾', title: '好条件の田んぼの話',
      apply: (st) => { const r = RG.rng.make(st.seed, st.year, 'card_land'); const a = U.round(r.range(1, 2.5), 1); const p10 = r.int(D.LAND_PRICE.good[0], D.LAND_PRICE.good[1]) * 10000;
        st.offers.land.push({ id: 'L' + st.year + '_lucky', owner: r.pick(D.SURNAMES) + 'さん', reason: 'あなたなら安心して任せられると言ってくれた',
          place: r.pick(D.PLACES), area: a, soil: 'good', buy: false, rent: 7000, price: Math.round(a * 10 * p10), price10a: p10 });
        return '条件の良い田 ' + U.ha(a) + 'を、安い地代（10aあたり7,000円）で借りられる話が来た（「農地」タブ）。'; } },
    { id: 'award', icon: '🎖️', title: '地域の担い手として表彰された',
      apply: (st) => { st.trust = clampTrust(st.trust + 8); addIncome(st, 50000, '表彰の副賞'); return '地域の信頼が上がり、副賞 5万円をもらった。'; } },
    { id: 'contest', icon: '🥇', title: 'お米のコンクールで入賞した',
      apply: (st) => { st.brand = Math.min(100, st.brand + 10); return 'ブランド力が大きく上がった。'; } },
    { id: 'festival', icon: '🏮', title: '秋祭りの実行委員を務めた',
      apply: (st) => { st.trust = clampTrust(st.trust + 6); return '地域の人たちとの縁が深まった（地域の信頼 +6）。'; } },
    { id: 'trainee', icon: '🧑‍🌾', title: '研修生が手伝いに来てくれる',
      apply: (st) => { addLabor(st, 'spring', -100); return '春の作業が楽になる（春の作業 −100時間）。'; } },
    { id: 'used_machine', icon: '🚜', title: '引退する人から農機を安く譲ってもらえる',
      apply: (st) => { const r = RG.rng.make(st.seed, st.year, 'card_used'); const model = r.pick(['tr_m', 'pl_m', 'cb_m', 'dr_m']); const md = D.MODELS[model];
        st.offers.used.push({ id: 'U' + st.year + '_lucky', model, age: 6, price: Math.round(md.price * 0.25 / 10000) * 10000 });
        return md.name + '（6年使用）を、中古の相場より3割ほど安く譲ってもらえる（「機械・設備」タブ）。'; } },
    { id: 'omamori', icon: '🧧', title: '神社でお守りを授かった',
      apply: (st) => { st.items.omamori += 1; return 'お守りを1つ手に入れた。不運のカードを1回防げる。'; } },
    { id: 'reroll', icon: '🎟️', title: '商店街の福引で当たり',
      apply: (st) => { st.items.reroll += 1; return '振り直し券を1枚手に入れた。サイコロを1回振り直せる。'; } },
    { id: 'coop_buy', icon: '📦', title: '肥料の共同購入に参加できた',
      apply: (st) => { flags(st).matUp = (flags(st).matUp || 0) - 0.06; return '今年の資材費が 6% 安くなる。'; } },
    { id: 'referral', icon: '🤝', title: '常連さんが友人を紹介してくれた', cond: (st) => st.direct.customers > 0,
      apply: (st) => { st.direct.customers += 15; return '直販の顧客が 15人 増えた。'; } },
    { id: 'low_rate', icon: '🏦', title: '金融機関から低金利の案内',
      apply: (st) => { flags(st).lowRate = true; return '今年の長期資金は年0.8%で借りられる。'; } },
    { id: 'neighbors', icon: '🙌', title: '近所の人が稲刈りを手伝ってくれる', cond: (st) => st.trust >= 40,
      apply: (st) => { addLabor(st, 'autumn', -80); return '秋の作業が楽になる（秋の作業 −80時間）。'; } },
    { id: 'refund', icon: '💴', title: '水利費の一部が戻ってきた',
      apply: (st) => { addIncome(st, 60000, '水利費の還付'); return '土地改良区から 6万円 戻ってきた。'; } },
    { id: 'furusato', icon: '🎁', title: 'ふるさと納税の返礼品に選ばれた',
      apply: (st) => { st.direct.customers += 25; st.brand = Math.min(100, st.brand + 5); return '全国から注文が入り、直販の顧客が 25人 増えた。'; } },
    { id: 'master', icon: '👴', title: '名人から技術を教わった',
      apply: (st) => { st.skill = Math.min(1.1, st.skill + 0.01); return '技術力が上がった。'; } },
    { id: 'family_help', icon: '👨‍👩‍👧', title: '家族が帰省して手伝ってくれる',
      apply: (st) => { addLabor(st, 'spring', -60); addLabor(st, 'autumn', -60); return '春と秋の作業が楽になる（それぞれ −60時間）。'; } },
    { id: 'good_weather_sign', icon: '🌤️', title: '春の天気に恵まれた',
      apply: (st) => { mulY(st, 1.02); return '苗がよく育った（収量 +2%）。'; } },
  ];

  DI.card = (kind, id) => (kind === 'bad' ? DI.BAD : DI.GOOD).find((c) => c.id === id);

  // ---------- 年初の運だめし ----------
  // st.luck = { year, rolls: [目], card: {kind, id} | null, done, msg, kind }
  DI.startYear = function (st) {
    st.luck = { year: st.year, rolls: [], card: null, done: st.year < DI.FROM_YEAR, msg: '', kind: '' };
  };
  DI.active = (st) => !!(st.luck && st.luck.year === st.year && !st.luck.done);

  DI.roll = function (st) {
    const L = st.luck;
    const f = DI.face(st, 'luck', L.rolls.length);
    L.rolls.push(f);
    return f;
  };
  DI.canReroll = (st) => st.items.reroll > 0 && st.luck.rolls.length > 0 && !st.luck.card;
  DI.reroll = function (st) { st.items.reroll -= 1; return DI.roll(st); };

  // 目を確定して、引くカードを決める（1：不運、6：幸運、2〜5：ふつう）
  DI.settle = function (st) {
    const L = st.luck;
    const f = L.rolls[L.rolls.length - 1];
    const kind = f === 1 ? 'bad' : f === 6 ? 'good' : 'normal';
    if (kind === 'normal') { L.card = { kind }; return L.card; }
    const pool = (kind === 'bad' ? DI.BAD : DI.GOOD).filter((c) => !c.cond || c.cond(st));
    const r = RG.rng.make(st.seed, st.year, 'luck_card');
    L.card = { kind, id: r.pick(pool).id };
    return L.card;
  };

  // カードを使う。useOmamori：不運をお守りで防ぐ
  DI.finish = function (st, useOmamori) {
    const L = st.luck;
    const c = L.card;
    let msg, kind = '';
    if (c.kind === 'normal') msg = 'ふつうの年になりそうだ。';
    else {
      const card = DI.card(c.kind, c.id);
      if (c.kind === 'bad' && useOmamori && st.items.omamori > 0) {
        st.items.omamori -= 1;
        L.omamori = true;
        msg = 'お守りのおかげで「' + card.title + '」を防いだ！';
        kind = 'good';
      } else {
        msg = card.title + '。' + card.apply(st);
        kind = c.kind === 'bad' ? 'bad' : 'good';
      }
    }
    L.msg = msg; L.kind = kind; L.done = true;
    st.news.unshift({ kind: kind === 'bad' ? 'bad' : kind === 'good' ? 'good' : 'info', text: '【運だめし ' + DI.FACES[L.rolls[L.rolls.length - 1] - 1] + '】' + msg });
    return msg;
  };
  // 運だめしを終えて、年初のできごと（なければ計画）へ
  DI.leave = function (st) { st.phase = st.events.queue.length ? 'event' : 'plan'; };

  // 自動で進めるとき（試算・バランス検証）：振り直しはせず、お守りがあれば使う
  DI.auto = function (st) {
    if (DI.active(st)) {
      if (!st.luck.rolls.length) DI.roll(st);
      if (!st.luck.card) DI.settle(st);
      DI.finish(st, true);
    }
    if (st.phase === 'dice') DI.leave(st);
  };

  // ---------- シーズン中のサイコロ勝負 ----------
  // guard：対策する（お金や人手を使って被害を小さくする） / outcomes：対策しないときの目ごとの結果
  DI.CRISES = [
    { id: 'planter', month: 5, icon: '🔧', title: '田植機の調子が悪い', cond: (st) => hasMachine(st, 'planter') && transplantArea(st) > 0,
      text: '田植えを前に、田植機から異音がする。このまま使うと途中で止まるかもしれない。',
      guard: (st) => ({ label: '点検・修理に出す', desc: '修理代 12万円。田植えは予定どおり', cost: 120000, text: '田植機を点検に出し、田植えは予定どおり終わった。' }),
      outcomes: [
        { faces: [1, 2], desc: '故障：修理25万円＋田植えが遅れて収量 −4%', cost: 250000, y: 0.96, kind: 'bad', text: '田植えの途中で田植機が止まった。修理に25万円かかり、田植えが遅れた。' },
        { faces: [3, 4, 5, 6], desc: 'もつ：被害なし', kind: 'good', text: '田植機はなんとか最後までもった。' }] },
    { id: 'drought', month: 7, icon: '☀️', title: '雨が少なく、用水が足りない', cond: (st) => area(st) > 0,
      text: '梅雨明けから雨が降らず、地区で順番に水を引く「番水」が始まった。',
      guard: (st) => ({ label: '夜も水を見回る', desc: '夏の作業 +' + U.num(area(st) * 3) + '時間', labor: { summer: area(st) * 3 }, text: '夜も水の見回りを続け、田を乾かさずにすんだ。' }),
      outcomes: [
        { faces: [1, 2], desc: '大きな被害：収量 −5%、品質 −8', y: 0.95, q: -8, kind: 'bad', text: '田が乾き、稲が水不足で弱った。' },
        { faces: [3, 4], desc: '少し被害：品質 −3', q: -3, kind: 'warn', text: '一部の田で水が足りず、少し品質が落ちた。' },
        { faces: [5, 6], desc: '恵みの雨：被害なし', kind: 'good', text: 'ちょうど雨が降り、水不足は解消した。' }] },
    { id: 'blast', month: 7, icon: '🍂', title: 'いもち病の注意報', cond: (st) => marketArea(st) > 0,
      text: '県から、いもち病が出やすい天気が続いているという注意報が出た。',
      guard: (st) => ({ label: '追加で防除する', desc: '薬剤と作業で ' + U.man(marketArea(st) * 10 * 1500) + '（10aあたり1,500円）', cost: marketArea(st) * 10 * 1500, text: '追加で防除し、いもち病を抑えた。' }),
      outcomes: [
        { faces: [1, 2], desc: '大発生：収量 −8%、品質 −6', y: 0.92, q: -6, kind: 'bad', text: 'いもち病が広がってしまった。' },
        { faces: [3, 4], desc: '少し発生：収量 −3%', y: 0.97, kind: 'warn', text: 'いもち病が少し出た。' },
        { faces: [5, 6], desc: '発生せず：被害なし', kind: 'good', text: 'いもち病は出なかった。' }] },
    { id: 'stinkbug', month: 8, icon: '🐞', title: 'カメムシの注意報', cond: (st) => marketArea(st) > 0,
      text: '斑点米の原因になるカメムシが多いという注意報が出た。1等米の割合に響く。',
      guard: (st) => ({ label: '追加で防除する', desc: '薬剤と作業で ' + U.man(marketArea(st) * 10 * 1200) + '（10aあたり1,200円）', cost: marketArea(st) * 10 * 1200, text: '追加で防除し、カメムシを抑えた。' }),
      outcomes: [
        { faces: [1, 2], desc: '大発生：品質 −15（1等米が大きく減る）', q: -15, kind: 'bad', text: 'カメムシが大発生し、斑点米が増えた。' },
        { faces: [3, 4], desc: '少し発生：品質 −6', q: -6, kind: 'warn', text: 'カメムシの被害が少し出た。' },
        { faces: [5, 6], desc: '少なかった：被害なし', kind: 'good', text: 'カメムシは少なかった。' }] },
    { id: 'typhoon', month: 9, icon: '🌀', title: '台風が近づいている', cond: (st) => area(st) > 0,
      text: '大型の台風が近づいている。進路はまだはっきりしない。',
      guard: (st) => ({ label: '急いで早めに刈る', desc: '秋の作業 +' + U.num(area(st) * 2) + '時間、未熟な米が出て収量 −2%', labor: { autumn: area(st) * 2 }, y: 0.98, text: '台風の前に急いで刈り取った。' }),
      outcomes: [
        { faces: [1], desc: '直撃：収量 −12%、品質 −10', y: 0.88, q: -10, kind: 'bad', text: '台風が直撃し、稲が倒れた。' },
        { faces: [2, 3], desc: 'かすめる：収量 −4%、品質 −4', y: 0.96, q: -4, kind: 'warn', text: '台風がかすめ、一部の稲が倒れた。' },
        { faces: [4, 5, 6], desc: 'それる：被害なし', kind: 'good', text: '台風はそれていった。' }] },
    { id: 'combine', month: 9, icon: '⚙️', title: 'コンバインから異音がする', cond: (st) => hasMachine(st, 'combine') && area(st) > 0,
      text: '稲刈りの直前、コンバインから異音がする。刈り取りの最中に止まると大変だ。',
      guard: (st) => ({ label: '部品を交換する', desc: '部品代と修理で 15万円', cost: 150000, text: 'コンバインの部品を交換し、稲刈りは順調に進んだ。' }),
      outcomes: [
        { faces: [1, 2], desc: '故障：修理30万円＋刈り遅れで品質 −6', cost: 300000, q: -6, kind: 'bad', text: '稲刈りの最中にコンバインが止まった。修理に30万円かかり、刈り取りが遅れた。' },
        { faces: [3, 4, 5, 6], desc: 'もつ：被害なし', kind: 'good', text: 'コンバインはなんとか最後までもった。' }] },
  ];
  DI.crisisDef = (id) => DI.CRISES.find((c) => c.id === id);

  // その年に起きる勝負（シードで決まる。0〜2件、月の順）
  DI.crises = function (st) {
    if (st.year < DI.FROM_YEAR) return [];
    const r = RG.rng.make(st.seed, st.year, 'crisis');
    const elig = DI.CRISES.filter((c) => c.cond(st));
    for (let i = elig.length - 1; i > 0; i--) { const j = Math.floor(r.next() * (i + 1)); [elig[i], elig[j]] = [elig[j], elig[i]]; }
    let n = r.chance(0.75) ? 1 : 0;
    if (n && r.chance(0.3)) n = 2;
    return elig.slice(0, n).sort((a, b) => a.month - b.month);
  };

  DI.outcomeOf = (c, face) => c.outcomes.find((o) => o.faces.indexOf(face) >= 0);
  DI.choiceOf = (st, id) => ((st.yearFlags || {}).crisis || {})[id];
  DI.pending = (st) => DI.crises(st).find((c) => { const ch = DI.choiceOf(st, c.id); return !ch || !ch.fixed; });

  DI.chooseGuard = function (st, id) {
    const f = flags(st); f.crisis = f.crisis || {};
    f.crisis[id] = { choice: 'guard', fixed: true };
  };
  DI.rollCrisis = function (st, id) {
    const f = flags(st); f.crisis = f.crisis || {};
    const ch = f.crisis[id] || (f.crisis[id] = { choice: 'dice', rolls: [], fixed: false });
    const face = DI.face(st, 'crisis_' + id, ch.rolls.length);
    ch.rolls.push(face);
    return face;
  };
  DI.rerollCrisis = function (st, id) { st.items.reroll -= 1; return DI.rollCrisis(st, id); };
  DI.fixCrisis = function (st, id) { DI.choiceOf(st, id).fixed = true; };

  // 今年のサイコロの影響をまとめる（シミュレーションが使う）
  // preview：計画の見通し。勝負はまだ起きていないので含めない
  DI.effects = function (st, preview) {
    const f = st.yearFlags || {};
    const fx = { y: f.cardY || 1, q: 0, mat: f.matUp || 0, labor: Object.assign({}, f.cardLabor || {}), costs: [], logs: [] };
    if (st.luck && st.luck.year === st.year && st.luck.done && st.luck.msg) fx.logs.push({ month: 1, text: '🎲 運だめし：' + st.luck.msg, kind: st.luck.kind });
    if (preview) return fx;
    DI.crises(st).forEach((c) => {
      const ch = DI.choiceOf(st, c.id);
      let eff;
      if (ch && ch.choice === 'guard') eff = Object.assign({ kind: '' }, c.guard(st));
      else {
        // まだ選んでいなければ（自動で進めるとき）対策せずにサイコロを振ったことにする
        const face = ch && ch.rolls.length ? ch.rolls[ch.rolls.length - 1] : DI.face(st, 'crisis_' + c.id, 0);
        eff = Object.assign({ face }, DI.outcomeOf(c, face));
      }
      if (eff.y) fx.y *= eff.y;
      if (eff.q) fx.q += eff.q;
      if (eff.labor) for (const s in eff.labor) fx.labor[s] = (fx.labor[s] || 0) + eff.labor[s];
      if (eff.cost) fx.costs.push({ month: c.month, amount: eff.cost, label: c.title + (ch && ch.choice === 'guard' ? '（対策）' : '（被害）') });
      fx.logs.push({ month: c.month, text: c.icon + ' ' + c.title + '：' + (eff.face ? '対策せずサイコロ勝負 ' + DI.FACES[eff.face - 1] + ' → ' : '') + eff.text,
        kind: eff.kind === 'warn' ? 'bad' : eff.kind || '' });
    });
    return fx;
  };
})(window.RG = window.RG || {});
