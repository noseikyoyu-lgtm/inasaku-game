// 続きもののストーリーと登場人物（地主の佐藤さん・米卸の青木さん・研修生の健太さん）
// 年初のできごと（RG.events.POOL）に、段階を追って起きるイベントを足す。DOM 非依存
(function (RG) {
  'use strict';
  const D = RG.data, U = RG.util, E = RG.events;
  const SY = RG.story = {};

  // 登場人物（sprite は画面側のドット絵の名前）
  D.PEOPLE = {
    takahashi: { name: 'JA営農指導員の高橋さん', sprite: 'advisor' },
    kimura: { name: '金融機関の木村さん', sprite: 'banker' },
    sato: { name: '地主の佐藤さん', sprite: 'landlord' },
    aoki: { name: '米卸の青木さん', sprite: 'buyer' },
    kenta: { name: '研修生の健太さん', sprite: 'kenta' },
    oyama: { name: '大山さん（規模拡大型）', sprite: 'oyama' },
    ogawa: { name: '小川さん（こだわり直販型）', sprite: 'ogawa' },
    tamura: { name: '田村さん（兼業農家）', sprite: 'tamura' },
  };
  // 今あるイベントの話し手
  const WHO = { machine_subsidy: 'takahashi', training: 'takahashi', feed_policy: 'takahashi', shinnosuke_reg: 'takahashi', min_wage: 'takahashi',
    bank_offer: 'kimura', incorporate: 'kimura', contest: 'aoki', influencer: 'ogawa', community: 'tamura', waterway: 'tamura', boar: 'tamura',
    big_land: 'oyama', share_combine: 'oyama' };
  E.POOL.forEach((e) => { if (WHO[e.id] && !e.who) e.who = WHO[e.id]; });

  SY.state = (st) => st.story || (st.story = { landlord: { stage: 0, bond: 0, at: 0 }, buyer: { stage: 0, streak: 0, at: 0 }, trainee: { stage: 0, at: 0 } });
  const addCost = (st, amount, label, cat) => RG.state.addLedger(st, { amount: -amount, cat: cat || 'eventCost', label });
  const addLabor = (st, season, hours) => { const f = st.yearFlags; f.cardLabor = f.cardLabor || {}; f.cardLabor[season] = (f.cardLabor[season] || 0) + hours; };
  const rented = (st) => st.fields.some((f) => !f.owned);
  const mainCrop = (st) => {
    const by = {};
    st.plan.filter((r) => D.CROPS[r.crop] && D.CROPS[r.crop].market && r.area > 0).forEach((r) => { by[r.crop] = (by[r.crop] || 0) + r.area; });
    return Object.keys(by).sort((a, b) => by[b] - by[a])[0] || 'koshiBL';
  };
  const trainee = (st) => st.family.find((f) => f.tag === 'trainee');
  const kentaStaff = (st) => st.staff.find((s) => s.kenta);

  const STORY = [
    // ---- 地主の佐藤さん ----
    { id: 'sato_1', who: 'sato', cond: (st) => st.year >= 3 && rented(st) && SY.state(st).landlord.stage === 0, weight: () => 100,
      title: '地主さんが田んぼを見に来た',
      text: () => '田んぼを貸してくれている佐藤さんが、ふらりと様子を見に来た。「きれいに作ってくれてるねえ」',
      choices: [
        { label: 'お茶を出して、田んぼの話をする', desc: '冬の作業 +5時間、佐藤さんとの縁が深まる', apply: (st) => { const L = SY.state(st).landlord; L.stage = 1; L.bond += 1; L.at = st.year; addLabor(st, 'winter', 5); return '佐藤さんと田んぼの昔話で盛り上がった。'; } },
        { label: 'あいさつだけで済ませる', desc: '', apply: (st) => { const L = SY.state(st).landlord; L.stage = 1; L.at = st.year; return '軽くあいさつをした。'; } }] },
    { id: 'sato_2', who: 'sato', cond: (st) => { const L = SY.state(st).landlord; return L.stage === 1 && st.year >= L.at + 3; }, weight: () => 100,
      title: '佐藤さんが入院した',
      text: () => '佐藤さんが入院したと聞いた。家族から「家の周りの草刈りをお願いできないか」と頼まれた。',
      choices: [
        { label: '引き受ける', desc: '夏の作業 +40時間、縁が深まる、地域の信頼 +3', apply: (st) => { const L = SY.state(st).landlord; L.stage = 2; L.bond += 2; L.at = st.year; addLabor(st, 'summer', 40); st.trust = Math.min(100, st.trust + 3); return '草刈りを引き受けた。家族にとても感謝された。'; } },
        { label: 'シルバー人材センターを紹介する（2万円）', desc: '縁が少し深まる', apply: (st) => { const L = SY.state(st).landlord; L.stage = 2; L.bond += 1; L.at = st.year; addCost(st, 20000, '草刈りの手配'); return '草刈りを手配した。'; } },
        { label: '断る', desc: '縁が薄くなる', apply: (st) => { const L = SY.state(st).landlord; L.stage = 2; L.bond -= 1; L.at = st.year; return '忙しくて断った。'; } }] },
    { id: 'sato_3', who: 'sato', cond: (st) => { const L = SY.state(st).landlord; return L.stage === 2 && st.year >= L.at + 2; }, weight: () => 100,
      title: '佐藤さんの田んぼのこれから',
      text: (st) => SY.state(st).landlord.bond >= 2
        ? '退院した佐藤さんが訪ねてきた。「わしももう歳だ。あんたになら、田んぼを安く譲りたい」'
        : '佐藤さんは、田んぼの今後を大山さんに相談することにしたそうだ。',
      choices: [
        { label: '話を聞く', desc: '（縁が深ければ）条件の良い田を安く買える話が「農地」タブに出る', apply: (st) => {
          const L = SY.state(st).landlord; L.stage = 3; L.at = st.year;
          if (L.bond < 2) return '佐藤さんの田は大山さんが引き受けることになった。日ごろの付き合いが大切だ。';
          const r = RG.rng.make(st.seed, st.year, 'sato');
          const a = U.round(2 + r.next(), 1), p10 = Math.round(D.LAND_PRICE.good[0] * 0.55) * 10000;
          st.offers.land.push({ id: 'L' + st.year + '_sato', owner: '佐藤さん', reason: 'あんたになら安心して任せられる', place: '佐藤さんの家の前',
            area: a, soil: 'good', buy: true, rent: 7000, price: Math.round(a * 10 * p10), price10a: p10 });
          return '良い田 ' + U.ha(a) + 'を、相場の半値ほどで買える話をもらった（「農地」タブ）。';
        } }] },

    // ---- 米卸の青木さん ----
    { id: 'aoki_1', who: 'aoki', cond: (st) => SY.state(st).buyer.stage === 0 && SY.state(st).buyer.streak >= 3, weight: () => 100,
      title: '「専属の産地になってほしい」',
      text: () => '契約先の米卸、青木さんが訪ねてきた。「3年続けて約束どおり届けてくれた。うちの専属の産地になってくれませんか」',
      choices: [
        { label: '引き受ける（5年契約）', desc: '農協価格より12%高い契約。数量の約束は重くなる', apply: (st) => {
          const B = SY.state(st).buyer; B.stage = 1; B.at = st.year;
          const last = st.history[st.history.length - 1];
          const crop = mainCrop(st);
          const vol = Math.max(20, Math.round((last ? last.bales : 100) * 0.12 / 10) * 10);
          st.contracts.push({ id: U.uid(st, 'c'), buyer: '米卸の青木さん（専属産地）', crop, minCult: 0, volume: vol, premium: 1.12, refPrice: st.market.price, yearsLeft: 5, years: 5, exclusive: true });
          return D.CROPS[crop].name + ' ' + U.bales(vol) + 'を5年間、専属産地として出荷する契約を結んだ。';
        } },
        { label: '今の契約のままにする', desc: '', apply: (st) => { const B = SY.state(st).buyer; B.stage = 9; return '今の取引を大切に続けることにした。'; } }] },
    { id: 'aoki_2', who: 'aoki', cond: (st) => { const B = SY.state(st).buyer; return B.stage === 1 && st.year >= B.at + 3 && st.contracts.some((c) => c.exclusive); }, weight: () => 100,
      title: '「一緒にブランド米として売り出そう」',
      text: () => '青木さんから「あなたの米をうちの店の看板商品にしたい。産地の名前を入れて売り出しましょう」と提案された。',
      choices: [
        { label: '協力する（販促費 30万円）', desc: 'ブランド力 +12、直販のお客さん +30人', apply: (st) => { SY.state(st).buyer.stage = 2; addCost(st, 300000, 'ブランド米の共同販促', 'brand'); st.brand = Math.min(100, st.brand + 12); st.direct.customers += 30; return '産地の名前入りの米として、店頭に並ぶことになった。'; } },
        { label: '今回は見送る', desc: '', apply: (st) => { SY.state(st).buyer.stage = 2; return '今回は見送った。'; } }] },

    // ---- 研修生の健太さん（家族以外への経営継承） ----
    { id: 'kenta_1', who: 'kenta', cond: (st) => { const T = SY.state(st).trainee; const op = RG.state.operator(st);
      return T.stage === 0 && st.year >= 4 && !RG.state.successor(st) && !RG.state.pendingSuccessor(st) && (st.year >= 7 || (op && op.age >= 50)); }, weight: () => 100,
      title: '「農業を学ばせてください」',
      text: () => '会社を辞めて農業を始めたいという若者、健太さん（24歳）が訪ねてきた。「ここで研修させてもらえませんか」',
      choices: [
        { label: '研修生として受け入れる', desc: '毎年 研修手当 30万円。年1,200時間ほど働いてくれる', apply: (st) => {
          const T = SY.state(st).trainee; T.stage = 1; T.at = st.year;
          st.family.push({ id: U.uid(st, 'p'), name: '研修生の健太さん', role: '研修生', hours: 1200, age: 24, tag: 'trainee' });
          addCost(st, 300000, '研修生の手当', 'recruit');
          return '健太さんを研修生として受け入れた。'; } },
        { label: '今は余裕がない', desc: '', apply: (st) => { SY.state(st).trainee.stage = 9; return '今回は断った。健太さんは別の農家で研修することになった。'; } }] },
    { id: 'kenta_2', who: 'kenta', cond: (st) => { const T = SY.state(st).trainee; return T.stage === 1 && st.year >= T.at + 2 && !!trainee(st); }, weight: () => 100,
      title: '健太さんが一人前になった',
      text: () => '2年の研修で、健太さんは一通りの作業をこなせるようになった。これからどうするか、話し合うことにした。',
      choices: [
        { label: '社員として雇う', desc: '正社員として給料を払う（年 約' + Math.round(D.LABOR.staffSalary * (1 + D.LABOR.staffSocial) / 10000) + '万円〜、社会保険を含む。採用費はかからない）。面積が小さいと人件費が重くなる', apply: (st) => {
          const T = SY.state(st).trainee; T.stage = 2; T.at = st.year;
          const k = trainee(st); st.family = st.family.filter((f) => f !== k);
          RG.state.addStaff(st); const s = st.staff[st.staff.length - 1]; s.name = '健太さん'; s.kenta = true; s.age = k.age;
          return '健太さんを社員として雇った。'; } },
        { label: '独立を応援する', desc: '地域の信頼 +8', apply: (st) => {
          const T = SY.state(st).trainee; T.stage = 9;
          const k = trainee(st); st.family = st.family.filter((f) => f !== k); st.trust = Math.min(100, st.trust + 8);
          return '健太さんは近くで独立した。地域に若い担い手が増えたと喜ばれた。'; } }] },
    { id: 'kenta_3', who: 'kenta', cond: (st) => { const T = SY.state(st).trainee; return T.stage === 2 && st.year >= T.at + 3 && !!kentaStaff(st) && !RG.state.successor(st); }, weight: () => 100,
      title: '「この農場を継ぎたい」',
      text: () => '健太さんから真剣な顔で相談された。「いつか、この農場を継がせてもらえませんか」',
      choices: [
        { label: '後継者として迎える', desc: '社員から後継者に。経営主が引退するとき、経営を引き継げる', apply: (st) => {
          const T = SY.state(st).trainee; T.stage = 3;
          const s = kentaStaff(st); st.staff = st.staff.filter((x) => x !== s);
          st.family.push({ id: U.uid(st, 'p'), name: '健太さん', role: '後継者', hours: 1800, age: (s.age || 26) + (st.year - T.at), tag: 'successor' });
          return '健太さんを後継者として迎えた。家族以外への「第三者継承」の始まりだ。'; } },
        { label: 'まだ考えさせてほしい', desc: '数年後にまた話し合う', apply: (st) => { SY.state(st).trainee.at = st.year; return 'もう少し考えることにした。'; } }] },
  ];
  STORY.forEach((e) => { e.once = e.id !== 'kenta_3'; e.sq = e.choices.length - 1; E.POOL.push(e); }); // kenta_3 は「まだ考えさせて」のあと数年でまた来る
  // 2段目以降は前の段の「once」に関係なく起きる（id が別なので問題ない）

  // 年の始まり：研修生の手当
  SY.beginYear = function (st) {
    if (trainee(st) && SY.state(st).trainee.at < st.year) RG.state.addLedger(st, { amount: -300000, cat: 'recruit', label: '研修生の手当' });
  };
  // 決算のあと：契約を約束どおり届けた年が続いているか
  SY.afterYear = function (st, res) {
    const B = SY.state(st).buyer;
    const cs = res.sales.contracts;
    if (!cs.length) return;
    if (cs.every((c) => c.short <= 0.5)) B.streak += 1; else B.streak = 0;
  };
})(window.RG = window.RG || {});
