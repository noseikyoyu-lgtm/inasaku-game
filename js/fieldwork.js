// 田植えのあとの田んぼの作業（雑草対策・中干し・穂肥・あぜの草刈り・水管理・防除・落水）。DOM 非依存
// どの作業も「標準」のやり方を選ぶと、今までの計算と同じ（収量・品質・手間・費用は増減なし）。
// ほかのやり方は、手間やお金と引き換えに収量・品質が変わる。天候（猛暑・冷夏・台風）で効き方が変わるものもある
(function (RG) {
  'use strict';
  const D = RG.data, U = RG.util;
  const FW = RG.fieldwork = {};

  const planted = (st) => U.sum(st.plan.filter((r) => r.crop !== 'none'), (r) => r.area);
  const organicArea = (st) => U.sum(st.plan.filter((r) => r.crop !== 'none' && r.cult === 'organic'), (r) => r.area);
  const hasDrone = (st) => st.machines.some((m) => D.MODELS[m.model].type === 'drone');
  // 天候：w = { hot, cold, storm }（見通しでは平年とみなす）
  FW.weather = function (st, preview, yearType, events) {
    if (preview) return { hot: false, cold: false, storm: false };
    const hit = (id) => (events || []).some((e) => e.id === id && e.hit);
    return {
      hot: yearType === 'hot' || hit('heat') || hit('foehn'),
      cold: yearType === 'cold' || hit('cold'),
      storm: yearType === 'typh' || yearType === 'rain' || hit('typh') || hit('flood'),
    };
  };

  // eff(st, w)：{ y：収量の倍率, q：品質の増減（点）, h：作業時間（10aあたり、季節ごと）, c：費用（10aあたり、円）, note：結果の文 }
  const a10 = (st) => Math.max(0.1, planted(st) * 10);
  const nMach = (st) => st.machines.filter((m) => !m.lease && D.MODELS[m.model].cap > 0).length;
  FW.WORKS = [
    // ---- 冬の作業 ----
    { id: 'winter_maint', month: 1, icon: '❄️', title: '機械の冬の整備', season: 'winter',
      text: '雪に閉ざされた冬。春に向けて、機械の手入れをしておく時期だ。',
      options: [
        { key: 'std', label: '自分でひととおり（標準）', desc: 'いつもどおり', eff: () => ({}) },
        { key: 'careful', label: '念入りに自分で整備する', desc: '冬の作業 10aあたり +0.4時間・今年の機械の故障 −20%', eff: () => ({ h: { winter: 0.4 }, bd: 0.8, note: '冬のあいだに、機械を念入りに手入れした。' }) },
        { key: 'shop', label: '農機具屋に点検に出す', desc: '機械1台あたり2万5千円・今年の機械の故障 −40%', eff: (st) => ({ c: 25000 * nMach(st) / a10(st), bd: 0.6, note: '農機具屋で、すり減った部品を交換してもらった。' }) },
        { key: 'skip', label: '何もしない', desc: '今年の機械の故障 +20%', eff: () => ({ bd: 1.2, note: '手入れをしないまま春を迎えた。' }) },
      ] },
    { id: 'winter_job', month: 2, icon: '⛄', title: '冬の仕事', season: 'winter',
      text: '田んぼの仕事が少ない冬。休むのも大事だが、冬にしかできない稼ぎ方や仕込みもある。',
      options: [
        { key: 'std', label: '冬は休む（標準）', desc: 'いつもどおり', eff: () => ({}) },
        { key: 'snow', label: 'トラクタで除雪を請け負う', desc: '冬の作業 +80時間・収入 約25万円・トラクタが少し傷む', need: (st) => st.machines.some((m) => D.MODELS[m.model].type === 'tractor'),
          eff: (st) => ({ h: { winter: 80 / a10(st) }, inc: 250000, bd: 1.05, note: '町から頼まれ、トラクタで道の除雪をした。' }) },
        { key: 'arbeit', label: '町でアルバイトをする', desc: '冬の作業 +150時間・収入 約30万円', eff: (st) => ({ h: { winter: 150 / a10(st) }, inc: 300000, note: '冬のあいだ、町の工場でアルバイトをした。' }) },
        { key: 'sales', label: '直販のお客さんへ営業に回る', desc: '冬の作業 +40時間・2万円・直販のお客さん +10人', eff: (st) => ({ h: { winter: 40 / a10(st) }, c: 20000 / a10(st), cust: 10, note: 'お客さんの家や店を回って、新米の予約を取った。' }) },
      ] },
    { id: 'weed', month: 6, icon: '🌿', title: '雑草（ヒエ）対策', season: 'summer',
      text: '田植えから1か月。田んぼのところどころにヒエが伸びてきた。放っておくと稲の養分を取られる。',
      options: [
        { key: 'std', label: '除草剤を1回（標準）', desc: 'いつもどおり', eff: () => ({}) },
        { key: 'more', label: '2回目の除草剤をまく', desc: '10aあたり1,500円・収量 +2%', eff: () => ({ y: 1.02, c: 1500, note: '2回目の除草剤で、ヒエをしっかり抑えた。' }) },
        { key: 'hand', label: '手で取る（見回り）', desc: '夏の作業 10aあたり +2時間・収量 +2%・有機の田では特に効く', eff: (st) => ({ y: 1.02 + (organicArea(st) > 0 ? 0.02 * organicArea(st) / Math.max(0.1, planted(st)) : 0), h: { summer: 2 }, note: '炎天下の田んぼでヒエを手で抜いた。' }) },
        { key: 'skip', label: '何もしない', desc: '収量 −4%（手間とお金はかからない）', eff: () => ({ y: 0.96, note: 'ヒエが残り、稲の育ちが少し悪くなった。' }) },
      ] },
    { id: 'nakaboshi', month: 6, icon: '🏜️', title: '中干し・溝切り', season: 'summer',
      text: '分げつ（茎の数）が十分になった。田の水を抜いて土を乾かす「中干し」の時期だ。溝を切っておくと、水の出し入れがしやすくなる。',
      options: [
        { key: 'std', label: '中干しだけ（標準）', desc: 'いつもどおり', eff: () => ({}) },
        { key: 'full', label: '中干し＋溝切り', desc: '夏の作業 10aあたり +0.8時間・燃料 300円・品質 +3・台風や大雨でも倒れにくい', eff: (st, w) => ({ q: 3, y: w.storm ? 1.03 : 1, h: { summer: 0.8 }, c: 300, note: '溝を切って中干しをした。根がしっかり張った。' + (w.storm ? '大雨・台風でも稲が倒れにくかった。' : '') }) },
        { key: 'skip', label: '中干しをしない', desc: '夏の作業 10aあたり −0.3時間・品質 −3・倒れやすく、秋の田がぬかるむ', eff: (st, w) => ({ q: -3, y: w.storm ? 0.96 : 0.99, h: { summer: -0.3, autumn: 0.4 }, note: '中干しをせず、茎が増えすぎて倒れやすくなった。' + (w.storm ? '大雨・台風で稲が倒れた。' : '') }) },
      ] },
    { id: 'hogoe', month: 7, icon: '🧪', title: '穂肥（ほごえ）の散布', season: 'summer',
      text: '穂のもとができる時期。ここで追加の肥料（穂肥）をどれだけやるかで、とれる量と味が変わる。',
      options: [
        { key: 'std', label: '決まった量をまく（標準）', desc: 'いつもどおり', eff: () => ({}) },
        { key: 'check', label: '葉の色を見て量を加減する', desc: '夏の作業 10aあたり +0.4時間・品質 +2（味がよくなる）', eff: () => ({ q: 2, h: { summer: 0.4 }, note: '葉の色を見て穂肥を加減した。米の味がよくなった。' }) },
        { key: 'more', label: '多めにまく', desc: '10aあたり +1,500円・収量 +5%・品質 −3・台風や大雨で倒れやすい', eff: (st, w) => ({ y: w.storm ? 0.99 : 1.05, q: -3, c: 1500, note: '穂肥を多めにまいた。' + (w.storm ? '稲が重くなり、大雨・台風で倒れた。' : 'とれる量は増えたが、味は少し落ちた。') }) },
        { key: 'skip', label: 'やらない', desc: '10aあたり −1,500円（肥料代が浮く）・収量 −3%・品質 +2（味はよくなる）', eff: () => ({ y: 0.97, q: 2, c: -1500, note: '穂肥をやらなかった。肥料代は浮いたが、とれる量は減った。' }) },
      ] },
    { id: 'aze', month: 7, icon: '✂️', title: 'あぜの草刈り（カメムシ対策）', season: 'summer',
      text: '穂が出る前に、あぜの草を刈っておくと、斑点米のもとになるカメムシが田に入りにくくなる。',
      options: [
        { key: 'std', label: 'いつもどおり1回', desc: 'いつもどおり', eff: () => ({}) },
        { key: 'twice', label: '穂が出る前にもう一度刈る', desc: '夏の作業 10aあたり +1時間・品質 +3（カメムシが減る）', eff: () => ({ q: 3, h: { summer: 1 }, note: '穂が出る前にあぜの草を刈り、カメムシを寄せつけなかった。' }) },
        { key: 'skip', label: '今年は刈らない', desc: '夏の作業 10aあたり −0.4時間・品質 −3', eff: () => ({ q: -3, h: { summer: -0.4 }, note: 'あぜの草が伸び、カメムシが増えた。' }) },
      ] },
    { id: 'water', month: 8, icon: '💧', title: '穂が出るころの水管理', season: 'summer',
      text: '穂が出て、実が入る大事な時期。今年の天気に合わせて水の入れ方を決めよう。',
      options: [
        { key: 'std', label: '水をためておく（標準）', desc: 'いつもどおり', eff: () => ({}) },
        { key: 'kake', label: '水の掛け引き（間断かん水）', desc: '夏の作業 10aあたり +0.8時間・品質 +2（猛暑の年は +5）', eff: (st, w) => ({ q: w.hot ? 5 : 2, h: { summer: 0.8 }, note: '水を入れたり抜いたりして、根を元気に保った。' }) },
        { key: 'flow', label: '冷たい水を掛け流す（暑さ対策）', desc: '夏の作業 10aあたり +1.2時間・猛暑の年は品質 +9、冷夏の年は品質 −3', eff: (st, w) => ({ q: w.hot ? 9 : w.cold ? -3 : 1, h: { summer: 1.2 }, note: w.hot ? '夜に冷たい水を掛け流し、暑さによる白い米を減らした。' : w.cold ? '冷夏なのに水を流しすぎ、稲が冷えてしまった。' : '水を掛け流した。' }) },
        { key: 'deep', label: '水を深くはる（冷え対策）', desc: '夏の作業 10aあたり +0.8時間・冷夏の年は収量 +4%・品質 +3', eff: (st, w) => ({ y: w.cold ? 1.04 : 1, q: w.cold ? 3 : 0, h: { summer: 0.8 }, note: w.cold ? '水を深くはって穂を寒さから守った。' : '水を深くはったが、今年は寒くならなかった。' }) },
      ] },
    { id: 'bojo', month: 8, icon: '🚁', title: '穂の病害虫の防除', season: 'summer',
      text: '穂いもちやカメムシの防除の時期。地域の無人ヘリの共同防除に入るか、自分でまくか。',
      options: [
        { key: 'std', label: '地域の共同防除に入る（標準）', desc: 'いつもどおり', eff: () => ({}) },
        { key: 'self', label: '自分でていねいに追加防除', desc: '10aあたり +1,200円・夏の作業 +0.5時間・品質 +3・収量 +1%', eff: () => ({ q: 3, y: 1.01, c: 1200, h: { summer: 0.5 }, note: '自分で追加の防除をし、病気と虫をしっかり抑えた。' }) },
        { key: 'drone', label: '自分のドローンでまく', desc: 'ドローンを持っていれば：10aあたり −800円（共同防除の料金が浮く）・夏の作業 +0.3時間', need: hasDrone, eff: () => ({ c: -800, h: { summer: 0.3 }, note: '自分のドローンで防除した。共同防除の料金が浮いた。' }) },
        { key: 'less', label: '農薬を減らす', desc: '10aあたり −1,000円・品質 −4・収量 −2%', eff: () => ({ q: -4, y: 0.98, c: -1000, note: '農薬を減らした。病気や虫の被害が少し出た。' }) },
      ] },
    { id: 'rakusui', month: 8, icon: '🚿', title: '落水（田の水を抜く）の時期', season: 'autumn',
      text: '稲刈りに向けて、田の水を抜く時期を決める。早いと刈りやすいが、実の入りが悪くなる。',
      options: [
        { key: 'std', label: '穂が出て30日後（標準）', desc: 'いつもどおり', eff: () => ({}) },
        { key: 'early', label: '早めに抜く', desc: '秋の作業 10aあたり −0.4時間（田が乾いて刈りやすい）・品質 −5・収量 −1%', eff: () => ({ q: -5, y: 0.99, h: { autumn: -0.4 }, note: '早めに水を抜いた。稲刈りは楽だったが、実の入りが悪い米が出た。' }) },
        { key: 'late', label: '遅めに抜く', desc: '秋の作業 10aあたり +0.3時間（ぬかるむ）・品質 +2（胴割れが減る）', eff: () => ({ q: 2, h: { autumn: 0.3 }, note: '遅めに水を抜き、実がしっかり入った。' }) },
      ] },
    { id: 'soil', month: 12, icon: '🍂', title: '秋起こし・土づくり', season: 'winter',
      text: '稲刈りが終わった田んぼ。冬のうちに土を起こしたり堆肥を入れたりしておくと、来年の稲がよく育つ。',
      options: [
        { key: 'std', label: 'しない（標準）', desc: 'いつもどおり', eff: () => ({}) },
        { key: 'plow', label: '秋起こし（田を耕しておく）', desc: '冬の作業 10aあたり +0.5時間・燃料300円・来年の収量 +1%', eff: () => ({ h: { winter: 0.5 }, c: 300, ny: 1.01, note: '稲わらをすき込んで、田を耕しておいた。' }) },
        { key: 'compost', label: '堆肥を入れて秋起こし', desc: '10aあたり2,000円・冬の作業 +0.8時間・来年の収量 +2%・品質 +1', eff: () => ({ h: { winter: 0.8 }, c: 2000, ny: 1.02, nq: 1, note: '堆肥を入れて、来年に向けて土をつくった。' }) },
      ] },
  ];
  // ---------- 使う肥料・農薬 ----------
  // cost：費用の倍率（標準＝1）。y・q：収量の倍率・品質の点。h：作業時間（10aあたり）。pest：病害虫の被害の倍率。
  // shock：肥料の値上がりの受けやすさ（1＝そのまま）。brand：直販していればブランド力が育つ
  FW.INPUTS = {
    fert: { name: '肥料', icon: '🧪', options: [
      { key: 'std', label: '化成肥料（標準）', desc: 'ふつうの化学肥料。効き方も値段もふつう', cost: 1 },
      { key: 'cheap', label: '安い配合肥料', desc: '肥料代 −25%。効きにムラが出て、収量 −2%・品質 −1', cost: 0.75, y: 0.98, q: -1 },
      { key: 'slow', label: '一発肥料（肥効調節型）', desc: '肥料代 +15%。ゆっくり長く効くので、夏の追肥の手間 10aあたり −0.4時間・収量 +1%・品質 +1', cost: 1.15, y: 1.01, q: 1, h: { summer: -0.4 } },
      { key: 'organic', label: '有機質肥料（ぼかし・堆肥入り）', desc: '肥料代 +25%・春の散布 10aあたり +0.3時間。味がよくなり品質 +4・収量 −1%。海外の原料に頼らないので値上がりに強い。直販していればブランド力も育つ', cost: 1.25, y: 0.99, q: 4, h: { spring: 0.3 }, shock: 0.3, brand: 1 },
    ] },
    pest: { name: '農薬', icon: '🧴', options: [
      { key: 'std', label: '標準の農薬', desc: 'ふつうの殺虫・殺菌剤', cost: 1 },
      { key: 'cheap', label: '安い農薬（古い成分）', desc: '農薬代 −20%。効きにくい虫や病気が増えていて、病害虫が出た年や、いもち病・カメムシの注意報の被害が2倍・品質 −2', cost: 0.8, pest: 2, q: -2 },
      { key: 'premium', label: '長く効く高い農薬（箱施用剤）', desc: '農薬代 +25%。苗箱にまくだけで長く効き、病害虫の被害や、いもち病・カメムシの注意報の被害が約1/3に・品質 +2・夏の防除の手間 10aあたり −0.3時間', cost: 1.25, pest: 0.35, q: 2, h: { summer: -0.3 } },
      { key: 'bio', label: '環境にやさしい資材（生物農薬など）', desc: '農薬代 +15%。病害虫の被害 1.2倍だが、直販していればブランド力が育つ', cost: 1.15, pest: 1.2, brand: 1 },
    ] },
  };
  FW.inputState = (st) => st.inputs || (st.inputs = { fert: 'std', pest: 'std' });
  FW.input = (st, kind) => { const k = FW.inputState(st)[kind] || 'std'; return FW.INPUTS[kind].options.find((o) => o.key === k) || FW.INPUTS[kind].options[0]; };
  FW.setInput = function (st, kind, key) {
    if (!FW.INPUTS[kind] || !FW.INPUTS[kind].options.some((o) => o.key === key)) return 'その資材はありません';
    FW.inputState(st)[kind] = key;
    return null;
  };

  FW.def = (id) => FW.WORKS.find((w) => w.id === id);
  FW.state = (st) => st.work || (st.work = { choice: {}, auto: {} });
  FW.options = (st, w) => w.options.filter((o) => !o.need || o.need(st));
  // 今年どのやり方にするか：シーズン中に選んだもの → 計画で決めたもの → 標準
  FW.keyOf = function (st, id, preview) {
    const w = FW.def(id), ws = FW.state(st);
    const yf = (st.yearFlags || {}).work || {};
    let k = (!preview && yf[id]) || ws.choice[id] || 'std';
    if (!FW.options(st, w).some((o) => o.key === k)) k = 'std';
    return k;
  };
  FW.option = (st, id, preview) => FW.def(id).options.find((o) => o.key === FW.keyOf(st, id, preview));

  // シミュレーションの影響に足す（dfx：RG.dice.effects の結果）
  FW.addEffects = function (st, dfx, preview, yearType, events) {
    const a10 = planted(st) * 10;
    if (a10 <= 0) return dfx;
    // 肥料・農薬の効き（費用と病害虫の被害は sim のほうで掛ける）
    ['fert', 'pest'].forEach((kind) => {
      const o = FW.input(st, kind);
      if (o.key === 'std') return;
      if (o.y) dfx.y *= o.y;
      if (o.q) dfx.q += o.q;
      if (o.h) for (const s in o.h) dfx.labor[s] = (dfx.labor[s] || 0) + o.h[s] * a10;
      if (!preview) dfx.logs.push({ month: kind === 'fert' ? 4 : 6, text: FW.INPUTS[kind].icon + ' ' + FW.INPUTS[kind].name + '：「' + o.label + '」を使った。', kind: '' });
    });
    const w = FW.weather(st, preview, yearType, events);
    // 前の年の12月に土づくりをしていれば、今年の収量と品質が上がる
    const sp = st.flags && st.flags.soilPrev;
    if (sp) { dfx.y *= sp.y; dfx.q += sp.q; if (!preview) dfx.logs.push({ month: 5, text: '🍂 去年の秋の土づくりのおかげで、田んぼの土がふかふかだ。', kind: 'good' }); }
    FW.WORKS.forEach((wk) => {
      const o = FW.option(st, wk.id, preview);
      if (o.key === 'std') return;
      const e = o.eff(st, w) || {};
      if (e.y) dfx.y *= e.y;
      if (e.q) dfx.q += e.q;
      if (e.h) for (const s in e.h) dfx.labor[s] = (dfx.labor[s] || 0) + e.h[s] * a10;
      if (e.c) dfx.costs.push({ month: wk.month, amount: Math.round(e.c * a10), label: wk.title + '（' + o.label + '）' });
      if (e.bd) dfx.bd = (dfx.bd || 1) * e.bd;
      if (e.inc) { dfx.incomes = dfx.incomes || []; dfx.incomes.push({ month: wk.month, amount: e.inc, label: wk.title + '（' + o.label + '）' }); }
      if (!preview && e.note) dfx.logs.push({ month: wk.month, text: wk.icon + ' ' + wk.title + '：' + e.note, kind: (e.q || 0) < 0 || (e.y || 1) < 1 ? 'bad' : 'good' });
    });
    return dfx;
  };

  // シーズン中に聞く作業：毎回聞く設定で、今年まだ決めていないもの（月の順）
  FW.pending = function (st) {
    if (!st.seasonPending || planted(st) <= 0) return null;
    const ws = FW.state(st), yf = (st.yearFlags || {}).work || {};
    return FW.WORKS.find((w) => !ws.auto[w.id] && !yf[w.id]) || null;
  };
  // シーズン中に選ぶ。remember：来年からも同じにして聞かない
  FW.choose = function (st, id, key, remember) {
    const yf = st.yearFlags || (st.yearFlags = {});
    yf.work = yf.work || {};
    yf.work[id] = key;
    const ws = FW.state(st);
    ws.choice[id] = key;
    if (remember) ws.auto[id] = true;
    return null;
  };
  // 計画で決める（シーズン中に聞くかどうかも）
  FW.setPlan = function (st, id, key) { FW.state(st).choice[id] = key; return null; };
  FW.setAuto = function (st, id, on) { FW.state(st).auto[id] = !!on; return null; };
  FW.setAllAuto = function (st, on) { FW.WORKS.forEach((w) => { FW.state(st).auto[w.id] = !!on; }); return null; };
  // 自動で進めるとき（試算・検証）：まだ決めていない作業は、計画で決めたやり方にする
  FW.autoAll = function (st) { FW.WORKS.forEach((w) => { const yf = st.yearFlags || (st.yearFlags = {}); yf.work = yf.work || {}; if (!yf.work[w.id]) yf.work[w.id] = FW.keyOf(st, w.id, true); }); };
  // 年をまたぐ効果：12月の土づくりは翌年の収量と品質、冬の営業はお客さん（決算のときに SIM.apply から呼ぶ）
  FW.applyEnd = function (st) {
    const w = FW.weather(st, false, st.world ? st.world.yearType : 'normal', st.world ? st.world.events : []);
    const soil = FW.option(st, 'soil', false).eff(st, w) || {};
    st.flags.soilNext = soil.ny && planted(st) > 0 ? { y: soil.ny, q: soil.nq || 0 } : null; // 作付がない年は、土づくりもしていない
    const job = FW.option(st, 'winter_job', false).eff(st, w) || {};
    if (job.cust && planted(st) > 0) st.direct.customers += job.cust;
  };

  // 計画画面の見通し：やり方ごとの手間と費用（今の作付面積で）
  FW.cost = function (st, id, key) {
    const o = FW.def(id).options.find((x) => x.key === key);
    const e = o.eff(st, { hot: false, cold: false, storm: false }) || {};
    const a10 = planted(st) * 10;
    return { hours: U.sum(Object.keys(e.h || {}), (s) => e.h[s]) * a10, cost: (e.c || 0) * a10 };
  };
})(window.RG = window.RG || {});
