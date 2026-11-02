// 新しい事業（作業受託・ドローン防除・餅と米粉の加工・直売所）と、米を保管して春に売る
// 計算はシミュレーション（sim.js）から呼ばれる。DOM 非依存
(function (RG) {
  'use strict';
  const D = RG.data, U = RG.util;
  const BZ = RG.biz = {};

  // ---------- 米を保管して春に売る ----------
  // 収穫した年は「収穫したときの値段」で在庫（棚卸資産）として利益に入る（収穫基準）。
  // 翌年4月に売り、売った値段との差が翌年の損益になる
  BZ.STORE = { fee: 450, month: 4, maxShare: 0.5, drift: 0.03, sens: 0.4, vol: 0.06 };

  // 保管に回せる量の上限：平年作の見込みで、契約と直販に回したあとの半分まで
  BZ.storeMax = function (st) {
    const units = RG.sim.planUnits(st).filter((u) => D.CROPS[u.crop].market);
    const bales = U.sum(units, (u) => (D.CROPS[u.crop].by * u.yieldMult * D.CULTS[u.cult].yield * D.SOWS[u.sow].yield * u.area * 10) / 60);
    return Math.max(0, Math.floor((bales - U.sum(st.contracts, (c) => c.volume) - RG.sim.directPlanned(st) - BZ.procPlanned(st)) * BZ.STORE.maxShare));
  };
  BZ.storePlanned = (st) => Math.max(0, Math.min(st.storePlan || 0, BZ.storeMax(st)));

  // 翌年4月の値段（古米の相場）：保管した年の値段から、新しい年の米の需給で上下する
  BZ.oldPrice = function (st, preview) {
    const s = st.stock;
    if (!s) return 0;
    if (preview) return s.price * (1 + BZ.STORE.drift);
    const r = RG.rng.make(st.seed, st.year, 'oldcrop');
    const f = U.clamp(1 + BZ.STORE.drift + BZ.STORE.sens * (st.world.priceChange || 0) + r.normal(0, BZ.STORE.vol), 0.82, 1.22);
    return Math.round(s.price * f);
  };
  // 保管した年に見込む、翌春の値段の幅
  BZ.oldPriceRange = (price) => [Math.round(price * (1 + BZ.STORE.drift - 0.12)), Math.round(price * (1 + BZ.STORE.drift + 0.12))];

  // ---------- 新しい事業 ----------
  BZ.DEFS = {
    harvest: { name: '稲刈りの作業受託', icon: '🌾', unit: 'ha', fee: 20000, cost: 2500, hours: 1.6, season: 'autumn', month: 10,
      desc: '自分のコンバインの空き能力で、近所の田の稲刈りを請け負う。10aあたり2万円。秋の作業時間が増え、地域の信頼が上がる。',
      need: 'combine' },
    drone: { name: 'ドローン防除の請負', icon: '🛸', unit: 'ha', fee: 2500, cost: 400, hours: 0.25, season: 'summer', month: 8, license: 250000,
      desc: '自分の防除用ドローンの空き能力で、近所の田の防除を請け負う。10aあたり2,500円。操縦の研修（25万円・1回だけ）が必要。',
      need: 'drone' },
    proc: { name: '餅・米粉の加工', icon: '🍡', unit: '俵', model: 'pc', mochiPrice: 48000, flourPrice: 38000, dumpPrice: 20000, material: 8000, hours: 6, season: 'winter',
      desc: '加工場（450万円）を建て、自分の米を餅や米粉にして売る。もち米なら1俵あたり4万8千円、うるち米の米粉なら3万8千円。売れる量には限りがあり、売れ残りは安く手放す。冬の作業が増える。' },
    stand: { name: '農産物の直売所', icon: '🏪', model: 'ds', base: 700000, cost: 250000, hours: { spring: 60, summer: 120, autumn: 120, winter: 60 }, customers: 25,
      desc: '直売所（250万円）を建て、米や地域の野菜を売る。売上は地域の信頼が高いほど増え、直販のお客さんも増える。一年を通して店番の時間がかかる。' },
  };

  BZ.has = (st, type) => st.machines.some((m) => D.MODELS[m.model].type === type);
  BZ.state = (st) => st.biz || (st.biz = { harvest: 0, drone: 0, proc: 0, droneLicense: false });

  // 加工の需要（俵）：直販のお客さんとブランド力で増える
  BZ.procDemand = (st) => Math.round(40 + 0.3 * st.direct.customers + 1.0 * st.brand);
  BZ.procPlanned = (st) => (BZ.has(st, 'proc') ? Math.max(0, BZ.state(st).proc || 0) : 0);
  // 加工に使う米：もち米があればもち米、なければうるち米
  BZ.procIsMochi = (st) => RG.sim.planUnits(st).some((u) => D.CROPS[u.crop].group === 'mochi');

  // 空き能力（ha）。M：シミュレーションの機械の割り当て
  // 空き能力：自分の機械のぶんだけ（共同利用の能力は受託に回さない）
  BZ.spare = (M) => { const c = M ? (M.ownCap != null ? M.ownCap : M.cap) : 0; return c > 0 ? Math.max(0, c - M.need) : 0; };

  // 計画した事業の作業時間（季節ごと）。spare：{ combine, drone } の空き能力
  BZ.labor = function (st, spare) {
    const b = BZ.state(st), out = { spring: 0, summer: 0, autumn: 0, winter: 0 };
    const hv = Math.min(b.harvest || 0, spare.combine), dr = b.droneLicense ? Math.min(b.drone || 0, spare.drone) : 0;
    out.autumn += hv * 10 * BZ.DEFS.harvest.hours;
    out.summer += dr * 10 * BZ.DEFS.drone.hours;
    out.winter += BZ.procPlanned(st) * BZ.DEFS.proc.hours;
    if (BZ.has(st, 'stand')) for (const s in BZ.DEFS.stand.hours) out[s] += BZ.DEFS.stand.hours[s];
    return { hours: out, harvest: hv, drone: dr };
  };

  // ---------- 作業受託のリスク ----------
  // よその田で作業すると、機械を傷めたり、相手の田に迷惑をかけたりすることがある。
  // 賠償保険（年3万円）に入っていれば、相手への補償は保険で払われる（自分の機械の修理は自分持ち）
  BZ.INSURANCE = { premium: 30000 };
  BZ.RISK = {
    harvest: { per10: 0.0025, cap: 0.45, repair: [150000, 350000], comp: 3000 }, // 10aあたりの事故の起きやすさ・修理費・刈り遅れの補償（10aあたり）
    drone: { per10: 0.0006, cap: 0.3, repair: [200000, 400000], drift: [50000, 200000] },
  };
  BZ.planned = (st) => { const b = BZ.state(st); return (BZ.has(st, 'combine') ? b.harvest || 0 : 0) + (b.droneLicense && BZ.has(st, 'drone') ? b.drone || 0 : 0); };
  BZ.insured = (st) => !!BZ.state(st).insured;
  // 今年の事故（シードで決まる）。ctx：{ poorShare, autumnShort, akisa, combineShort }
  BZ.risks = function (st, bizL, ctx, preview) {
    const out = [];
    if (preview) return out;
    const r = RG.rng.make(st.seed, st.year, 'bizrisk');
    const ins = BZ.insured(st);
    const pick = (a) => Math.round((a[0] + r.next() * (a[1] - a[0])) / 10000) * 10000;
    if (bizL.harvest > 0) {
      const R = BZ.RISK.harvest;
      // 石や倒れた稲で、刈り取り部を壊す（条件不利の田が多い地域ほど起きやすい）
      const p = Math.min(R.cap, bizL.harvest * 10 * R.per10 * (1 + ctx.poorShare) * (1 + 0.5 * (ctx.akisa || 0)));
      if (r.next() < p) out.push({ month: 10, kind: 'repair', amount: pick(R.repair), label: '受託先の田で、石を巻き込んでコンバインの刈り取り部を壊した', trust: 0 });
      // 自分の稲刈りで手いっぱいになり、受託先の田が刈り遅れた
      if (ctx.autumnShort > 0.03 || (ctx.akisa && r.next() < 0.5)) {
        const amt = Math.round(bizL.harvest * 10 * R.comp);
        out.push({ month: 11, kind: 'comp', amount: ins ? 0 : amt, insured: ins, label: '受託先の田が刈り遅れ、米の質が落ちた（補償 ' + U.man(amt) + (ins ? '・保険で支払い' : '') + '）', trust: -3 });
      }
    }
    if (bizL.drone > 0) {
      const R = BZ.RISK.drone;
      const p = Math.min(R.cap, bizL.drone * 10 * R.per10);
      if (r.next() < p) {
        const amt = pick(R.drift);
        out.push({ month: 8, kind: 'comp', amount: ins ? 0 : amt, insured: ins, label: '散布した農薬が風で隣の畑に飛んだ（補償 ' + U.man(amt) + (ins ? '・保険で支払い' : '') + '）', trust: -2 });
      }
      if (r.next() < p * 0.6) out.push({ month: 8, kind: 'repair', amount: pick(R.repair), label: 'ドローンが電線に触れて墜落した', trust: 0 });
    }
    // 機械が壊れて、引き受けた分を刈りきれなかった：ほかの業者に頼んで差額を払う
    if (ctx.combineShort > 0.05) out.push({ month: 10, kind: 'comp', amount: Math.round(ctx.combineShort * 10 * 8000), label: 'コンバインの能力が足りず、引き受けた田 ' + U.ha(ctx.combineShort) + ' をほかの業者に頼んだ（差額の負担）', trust: -2 });
    return out;
  };
  // 計画画面に出す見込み（1年に事故が起きる確率）
  BZ.riskOdds = function (st, kind, area) {
    const R = BZ.RISK[kind];
    if (!R || !(area > 0)) return 0;
    const poor = RG.sim.soilShare(st).poor;
    return Math.min(R.cap, area * 10 * R.per10 * (kind === 'harvest' ? 1 + poor : 1));
  };
  BZ.setInsured = function (st, on) { BZ.state(st).insured = !!on; return null; };

  // ---------- 操作 ----------
  BZ.setArea = function (st, kind, v) {
    const b = BZ.state(st);
    if (kind === 'drone' && v > 0 && !b.droneLicense) return '先に操縦の研修を受けてください';
    b[kind] = Math.max(0, Math.round(v * 10) / 10);
    return null;
  };
  BZ.setProc = function (st, v) { BZ.state(st).proc = Math.max(0, Math.round(v)); return null; };
  BZ.takeLicense = function (st) {
    const b = BZ.state(st);
    if (b.droneLicense) return null;
    RG.state.addLedger(st, { amount: -BZ.DEFS.drone.license, cat: 'recruit', label: 'ドローン操縦の研修費' });
    b.droneLicense = true;
    return null;
  };
})(window.RG = window.RG || {});
