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
  const farmArea = (st) => U.sum(st.fields, (f) => f.area);
  // 大きな経営ほど1に近づく（10haで0・30ha以上で1）
  const big = (st) => U.clamp((farmArea(st) - 10) / 20, 0, 1);

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
    // 大きな経営：規模を広げた分、借入がふくらんでいるとき
    rating: { icon: '📉', title: '金融機関の格付けの見直し', who: 'kimura', years: 3,
      // 法人の立て直しは、もともと融資の審査の話があるので起きない
      trigger: (st) => { const a = an(st); if (!a || !st.lastResult || st.scenarioId === 'saiken') return false; const bs = st.lastResult.bs; return farmArea(st) >= 15 && a.debt >= 1.2 * st.lastResult.pl.sales && bs.assets > 0 && bs.equity / bs.assets < 0.25; },
      start: (st) => ({ debt0: an(st).debt }),
      text: (st) => '「規模が大きくなったぶん、借入も売上の' + U.round(an(st).debt / st.lastResult.pl.sales, 1) + '倍にふくらんでいます。審査で格付けが下がりました。' + (st.year + 2) + '年目の決算までに、自己資本比率を30%以上にするか、借入を今より25%減らしてください。できなければ、融資を続けられません」',
      goalText: '自己資本比率30%以上か、借入を25%減らす',
      goal: (st, res, x) => (res.bs.assets > 0 && res.bs.equity / res.bs.assets >= 0.3) || res.analysis.debt <= (x.debt0 || 0) * 0.75,
      fail: '借入を減らせず、金融機関が融資の継続を断りました。大きくなった経営を支えるお金が回らなくなり、経営を続けられなくなりました。' },
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
        PR.state(st).push(Object.assign({ id, year: st.year, until: st.year + d.years - 1, done: false }, d.start ? d.start(st) : {}));
        return '「' + d.title + '」：' + (st.year + d.years - 1) + '年目の決算までに、' + d.goalText + '。';
      } }],
    });
  });

  // 決算のあと：達成したか・期限切れか
  PR.afterYear = function (st, res) {
    const notes = [];
    PR.active(st).forEach((x) => {
      const d = PR.def(x.id);
      if (d.goal(st, res, x)) { x.done = true; x.ok = true; notes.push('【危機を乗り越えた】' + d.icon + ' ' + d.title + '：' + d.goalText + 'を達成した！'); return; }
      if (st.year >= x.until) { x.done = true; x.ok = false; st.gameOver = { reason: 'deadline', year: st.year, text: d.fail }; return; }
      notes.push('【期限まであと' + (x.until - st.year) + '年】' + d.icon + ' ' + d.title + '：' + d.goalText);
    });
    return notes;
  };

  // ---------- 6年目からの、経営を圧迫するできごと ----------
  const ramp = (st) => (st.year >= PR.FROM ? 0.5 + 0.05 * (st.year - PR.FROM) : 0);
  // 同じできごとは4年に1回まで（値上がりが毎年重ならないように）
  const cool = (st, id, n) => st.year - (st.events.seen[id] || -99) >= (n || 4);
  const addCost = (st, amount, label) => RG.state.addLedger(st, { amount: -amount, cat: 'eventCost', label });
  const addAsset = (st, amount, label) => RG.state.addLedger(st, { amount: -amount, cat: 'asset', label });
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
    // 6年に1回まで。時給の上がりは合わせて2割まで
    cond: (st) => st.year >= PR.FROM && cool(st, 'part_shortage', 6) && (st.market.partWageBoost || 1) < 1.19 && (st.partTimers > 0 || (st.regulars || []).length > 0), weight: ramp,
    title: 'パートが集まらない',
    text: () => '町に大きな工場ができ、パートの人がそちらに流れている。「時給を上げんと、もう人は来んよ」と言われた。',
    choices: [
      { label: '時給を上げて集める', desc: 'パートの時給がこれから +6%', apply: (st) => { st.market.partWageBoost = (st.market.partWageBoost || 1) * 1.06; return 'パートの時給を上げた。'; } },
      { label: '人数を減らしてしのぐ', desc: '季節パートが2人減る（人手が足りなくなるおそれ）', apply: (st) => { RG.state.addParts(st, -2); return 'パートを減らした。'; } },
    ],
  });
  E.POOL.push({
    id: 'cost_up', who: 'takahashi', sq: 0,
    cond: (st) => st.year >= PR.FROM && cool(st, 'cost_up', 6), weight: ramp,
    title: '資材と機械の値上がり',
    text: () => '「世界的な物価高で、肥料も農薬も機械も、また値上がりだ。これからは、同じことをしていても毎年お金が余計にかかるよ」',
    choices: [{ label: 'わかった', desc: '資材・機械の値段がこれから +4%', apply: (st) => { st.market.matInfl *= 1.04; return '資材と機械が値上がりした。'; } }],
  });
  // ---------- 大きな経営ほど起きる危機（面積・借入・社員・契約が大きいほど、起きやすく痛い） ----------
  // 法人の立て直しは、融資の審査や社員の士気など、物語そのものの厳しさがあるので6割に
  const sized = (st, k) => ramp(st) * k * (0.4 + big(st)) * (st.scenarioId === 'saiken' ? 0.6 : 1);
  const lastContract = (st) => {
    const cs = st.lastResult && st.lastResult.sales && st.lastResult.sales.contracts || [];
    // 米卸の青木さんの専属産地の契約は除く（話し手が青木さん本人なので）
    const c = cs.filter((x) => x.revenue > 0 && st.contracts.some((y) => y.id === x.id && !y.exclusive)).sort((a, b) => b.revenue - a.revenue)[0];
    return c || null;
  };
  E.POOL.push({
    id: 'buyer_bankrupt', who: 'aoki', sq: 0,
    cond: (st) => st.year >= PR.FROM && cool(st, 'buyer_bankrupt') && !!lastContract(st), weight: (st) => sized(st, 0.5),
    title: '契約先が倒産した',
    text: (st) => { const c = lastContract(st); return '契約先の「' + c.buyer + '」が倒産した。去年の秋に届けた米の代金のうち、まだ払われていない ' + U.man(c.revenue * 0.3) + 'が、回収できないおそれがある。今年の契約もなくなる。'; },
    choices: [
      { label: '弁護士に頼んで、できるだけ回収する', desc: '費用 30万円。未払いの4割を回収（6割は貸し倒れ）', apply: (st) => { const c = lastContract(st); addCost(st, Math.round(c.revenue * 0.3 * 0.6) + 300000, c.buyer + 'の倒産（貸し倒れと弁護士費用）'); st.contracts = st.contracts.filter((x) => x.id !== c.id); return '弁護士に頼み、未払いの一部を取り戻した。'; } },
      { label: 'あきらめて、次の売り先を探す', desc: '未払いがすべて貸し倒れになる', apply: (st) => { const c = lastContract(st); addCost(st, Math.round(c.revenue * 0.3), c.buyer + 'の倒産（貸し倒れ）'); st.contracts = st.contracts.filter((x) => x.id !== c.id); return '代金はあきらめ、新しい売り先を探すことにした。'; } },
    ],
  });
  E.POOL.push({
    id: 'staff_poach', who: 'yamane', sq: 0,
    cond: (st) => st.year >= PR.FROM && cool(st, 'staff_poach') && st.staff.length >= 2, weight: (st) => sized(st, 0.5),
    title: '社員の引き抜き',
    text: (st) => '近くの大きな法人が、うちの社員に声をかけている。「給料を上げてくれないなら、移りたい」と' + Math.min(2, st.staff.length) + '人から言われた。社員が減ると、機械に乗れる人も減る。',
    choices: [
      { label: '社員全員の給料を5%上げる', desc: '社員の給料がこれから +5%', apply: (st) => { st.staff.forEach((s) => { s.salary *= 1.05; }); return '給料を上げて、全員に残ってもらった。'; } },
      { label: '送り出す', desc: '社員が最大2人減る（退職金がかかる）。また雇うには採用費がかかる（法人の立て直しでは社員の士気 −10）', apply: (st) => {
        const n = Math.min(2, st.staff.length - 1), gone = st.staff.slice().reverse().filter((x) => x.name !== '山根さん').slice(0, n);
        gone.forEach((s) => addCost(st, D.LABOR.staffSeverance, s.name + 'の退職金'));
        st.staff = st.staff.filter((x) => gone.indexOf(x) < 0);
        if (st.saiken) st.saiken.morale = U.clamp(st.saiken.morale - 10, 0, 100);
        return gone.length + '人が、別の法人に移っていった。'; } },
    ],
  });
  E.POOL.push({
    id: 'gouu', who: 'tamura', sq: 0,
    cond: (st) => st.year >= PR.FROM && cool(st, 'gouu') && farmArea(st) >= 8, weight: (st) => sized(st, 0.35),
    title: '豪雨で田んぼが被災した',
    text: (st) => '記録的な大雨で、あぜが崩れ、水路と農道が土砂で埋まった。経営面積 ' + U.ha(farmArea(st)) + 'のあちこちで、直さないと田植えができない。復旧には約' + U.man(farmArea(st) * 10 * 5000) + 'かかる。',
    choices: [
      { label: 'すぐに自分で復旧する', desc: '10aあたり5,000円。今年の作付は予定どおり', apply: (st) => { addCost(st, Math.round(farmArea(st) * 10 * 5000), '豪雨の被害の復旧'); return '重機を頼んで、田植えまでに直した。'; } },
      { label: '国と市の災害復旧事業を待つ', desc: '負担は3割ですむが、復旧が遅れて今年の収量 −6%', apply: (st) => { addCost(st, Math.round(farmArea(st) * 10 * 5000 * 0.3), '豪雨の被害の復旧（負担金）'); const yf = st.yearFlags; yf.cardY = (yf.cardY || 1) * 0.94; return '災害復旧事業に申し込んだ。直るまで、一部の田は田植えが遅れた。'; } },
    ],
  });
  E.POOL.push({
    id: 'rate_up', who: 'kimura', sq: 0,
    cond: (st) => st.year >= PR.FROM && cool(st, 'rate_up') && U.sum(st.loans.filter((l) => l.rate > 0), (l) => l.balance) >= 20000000, weight: (st) => ramp(st) * 0.5,
    title: '金利が上がった',
    text: (st) => '「日銀の利上げで、借入の金利を見直すことになりました。今の借入は ' + U.man(U.sum(st.loans.filter((l) => l.rate > 0), (l) => l.balance)) + '。0.5%上がると、利息が毎年 約' + U.man(U.sum(st.loans.filter((l) => l.rate > 0), (l) => l.balance) * 0.005) + '増えます」',
    choices: [
      { label: '受け入れる', desc: '金利のある借入の金利が +0.5%', apply: (st) => { st.loans.forEach((l) => { if (l.rate > 0) l.rate = U.round(l.rate + 0.005, 4); if (l.rateLater) l.rateLater = U.round(l.rateLater + 0.005, 4); }); return '借入の金利が上がった。'; } },
      { label: 'ほかの金融機関とも交渉する', desc: '手数料 20万円。上がり幅は半分（+0.25%）', apply: (st) => { addCost(st, 200000, '金利の交渉と借り換えの手数料'); st.loans.forEach((l) => { if (l.rate > 0) l.rate = U.round(l.rate + 0.0025, 4); if (l.rateLater) l.rateLater = U.round(l.rateLater + 0.0025, 4); }); return '交渉して、金利の上がり幅をおさえた。'; } },
    ],
  });
  E.POOL.push({
    id: 'big_accident', who: 'takahashi', sq: 0,
    // 雇っている人（社員・常雇用パート）がいるときだけ起きる
    cond: (st) => st.year >= PR.FROM && cool(st, 'big_accident') && st.staff.length + (st.regulars || []).length >= 1 && (st.staff.length + (st.regulars || []).length >= 2 || farmArea(st) >= 20), weight: (st) => sized(st, 0.3),
    title: '作業中の大きな事故',
    text: (st) => '去年の秋、' + (st.staff.length ? '社員' : '常雇用パートの人') + 'がコンバインの詰まりを取ろうとして、手を大けがした。労災保険の給付だけでは足りず、' + (st.corp ? '会社' : '経営') + 'としての補償と、機械の安全対策が求められている。',
    choices: [
      { label: '十分に補償し、安全対策をする', desc: '補償と安全装置で 100万円。社員の士気と地域の信頼は保てる', apply: (st) => { addCost(st, 1000000, '作業事故の補償と安全対策'); return '補償を行い、全部の機械に安全装置を付けた。'; } },
      { label: '最低限の補償にとどめる', desc: '30万円。地域の信頼 −6（評判が広まり、人が集まりにくくなる。法人の立て直しでは社員の士気 −15）', apply: (st) => { addCost(st, 300000, '作業事故の補償'); st.trust = Math.max(0, st.trust - 6); if (st.saiken) st.saiken.morale = U.clamp(st.saiken.morale - 15, 0, 100); return '最低限の補償で済ませた。「あそこは人を大事にしない」と噂になった。'; } },
    ],
  });
  E.POOL.push({
    id: 'price_cut', who: 'aoki', sq: 0,
    cond: (st) => st.year >= PR.FROM && cool(st, 'price_cut') && U.sum(st.contracts, (c) => c.volume) >= 300, weight: (st) => sized(st, 0.45),
    title: '大口の取引先から値下げを求められた',
    text: (st) => { const c = st.contracts.slice().sort((a, b) => b.volume - a.volume)[0]; return '「' + c.buyer + '」から、「来年から1割値下げしてほしい。できないなら、取引を見直させてもらう」と言われた（契約 ' + U.num(U.sum(st.contracts.filter((x) => x.buyer === c.buyer), (x) => x.volume)) + '俵）。'; },
    choices: [
      { label: '値下げを受け入れる', desc: 'その取引先との契約の値段が −10%', apply: (st) => { const c = st.contracts.slice().sort((a, b) => b.volume - a.volume)[0]; st.contracts.forEach((x) => { if (x.buyer === c.buyer) { x.premium = U.round(x.premium * 0.9, 3); if (x.refPrice) x.refPrice = Math.round(x.refPrice * 0.9); } }); return '値下げを受け入れ、取引は続くことになった。'; } },
      { label: '断って、取引をやめる', desc: 'その取引先との契約がなくなる（その分の米は農協などに回す）', apply: (st) => { const c = st.contracts.slice().sort((a, b) => b.volume - a.volume)[0]; st.contracts = st.contracts.filter((x) => x.buyer !== c.buyer); return '値下げは断り、取引をやめた。'; } },
    ],
  });
  const bigRented = (st) => st.fields.filter((f) => !f.owned && !f.village).sort((a, b) => b.area - a.area)[0];
  E.POOL.push({
    id: 'land_return_big', who: 'sato', sq: 0,
    cond: (st) => st.year >= PR.FROM && cool(st, 'land_return_big') && U.sum(st.fields.filter((f) => !f.owned), (f) => f.area) >= 15 && !!bigRented(st) && bigRented(st).area >= 1.5, weight: (st) => sized(st, 0.4),
    title: '地主の相続で、大きな田を返してほしい',
    text: (st) => { const f = bigRented(st); return '地主さんが亡くなり、相続した息子さんから「借りている田（' + f.name + '・' + U.ha(f.area) + '）を返してほしい。買い取ってくれるなら、10aあたり' + U.man(D.LAND_VALUE[f.soil]) + 'で売る」と言われた。'; },
    choices: [
      { label: '買い取る（農地を買うための借入を使う）', desc: '20年の借入で買う。地代はかからなくなるが、返済が増える', apply: (st) => {
        const f = bigRented(st), price = Math.round(f.area * 10 * D.LAND_VALUE[f.soil]);
        const err = RG.actions.takeLoan(st, 'long20', price, true);
        if (err) { st.fields = st.fields.filter((x) => x !== f); RG.state.fitPlan(st); return '借入ができず（' + err + '）、田を返すことになった。'; }
        addAsset(st, price, f.name + ' ' + U.ha(f.area) + ' を購入');
        f.owned = true; f.rent = 0; f.landValue = price;
        return f.name + 'を買い取った。'; } },
      { label: '返す', desc: 'その田がなくなる', apply: (st) => { const f = bigRented(st); st.fields = st.fields.filter((x) => x !== f); RG.state.fitPlan(st); return f.name + '（' + U.ha(f.area) + '）を返した。'; } },
    ],
  });
  E.POOL.push({
    id: 'tax_audit', who: 'kimura', sq: 0,
    cond: (st) => st.year >= PR.FROM + 2 && cool(st, 'tax_audit'), weight: (st) => ramp(st) * 0.6,
    title: '税務署の調査',
    text: () => '税務署から調査の連絡があった。帳簿を見せたところ、経費の計上にいくつか誤りが見つかった。',
    choices: [{ label: '追加の税金を払う', desc: '追徴課税 30万円（と、帳簿の見直しで冬の作業 +10時間）', apply: (st) => { addCost(st, 300000, '追徴課税'); const yf = st.yearFlags; yf.cardLabor = yf.cardLabor || {}; yf.cardLabor.winter = (yf.cardLabor.winter || 0) + 10; return '追徴課税を払った。'; } }],
  });
})(window.RG = window.RG || {});
