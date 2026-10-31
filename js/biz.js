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
  BZ.spare = (M) => (M && M.cap > 0 ? Math.max(0, M.cap - M.need) : 0);

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
