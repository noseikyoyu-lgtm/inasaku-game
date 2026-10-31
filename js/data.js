// ゲームの数値・定数・文章。バランス調整はこのファイルで行う。
// 品種名・取引先名・制度名はすべて架空（実在のものとは関係ありません）。
(function (RG) {
  'use strict';
  const D = RG.data = {};

  D.MAX_YEAR = 20;
  D.BASE_HOURS = 22;          // 小型機械で作業したときの 10a あたり総労働時間
  D.BUFFER_CASH = 300000;     // つなぎ資金を返す前に手元に残す額

  // ---------- 季節と労働 ----------
  D.SEASONS = ['spring', 'summer', 'autumn', 'winter'];
  D.SEASON_NAMES = { spring: '春（3〜5月）', summer: '夏（6〜8月）', autumn: '秋（9〜11月）', winter: '冬（12〜2月）' };
  D.SEASON_ICON = { spring: '🌸', summer: '☀️', autumn: '🍁', winter: '❄️' };
  D.SEASON_SHORT = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };
  D.SEASON_CAP = { spring: 0.28, summer: 0.30, autumn: 0.28, winter: 0.14 }; // 年間労働時間の季節配分
  D.PART_CAP = { spring: 160, summer: 100, autumn: 160, winter: 60 };        // パート1人の季節別上限時間
  D.DIRECT_LABOR_SPLIT = { spring: 0.2, summer: 0.1, autumn: 0.3, winter: 0.4 };

  // 年齢と働ける時間：65歳までは満額、それ以降は1年ごとに5%ずつ減り、80歳で引退
  D.AGING = { full: 65, perYear: 0.05, retire: 80 };
  D.WORK_STYLES = { full: { name: '専従', hours: 1800 }, half: { name: '半分くらい', hours: 900 }, help: { name: '手伝い程度', hours: 300 } };

  D.LABOR = {
    partWage: 1150,
    partRecruit: 30000,
    staffSalary: 3600000,
    staffSocial: 0.15,
    staffHours: 1900,
    staffRecruit: 300000,
    staffSeverance: 300000,
    familyValue: 1500,        // 家族労働の機会費用（円/時間）
  };

  // ---------- 品種 ----------
  // 栽培の数値は「新潟 水稲栽培シミュレーター」（参考/rice_simulator.html）の品種マスタに準拠。
  //   by=平年単収(kg/10a) bq=基本品質(点) pr/pr2=R8年産JA概算金 1等/2等(円/60kg) cst=変動費(種苗+肥料+農薬, 円/10a)
  //   耐性 ht=高温登熟 ft=耐倒伏 ct=障害型耐冷 sp=穂発芽 (弱0.2〜0.35/中0.45〜0.55/やや強0.6〜0.7/強0.75〜0.85)
  //   dy=田植えから収穫までの日数(平年) pS/pE=田植え可能期間 bS/bE=田植え適期 [月,日]
  //   estimated: 参考ファイルに無い品種。数値はゲーム用の推定値
  //   以下はゲーム独自: blast=病害虫の受けやすさ / laborMult=手間 / directCoef=直販での評価(コシヒカリ=1)
  D.REF_PRICE = 18500; // 米価の基準＝コシヒカリ 1等 概算金（円/60kg）
  D.CROPS = {
    koshiBL: {
      name: 'コシヒカリBL', kind: '良食味・いもち病に強い', group: 'koshi',
      by: 530, bq: 95, pr: 18500, pr2: 17900, cst: 22000, ht: 0.30, ft: 0.25, ct: 0.70, sp: 0.70, dy: 123,
      pS: [5, 8], pE: [5, 25], bS: [5, 12], bE: [5, 20],
      blast: 0.4, laborMult: 1.0, directCoef: 1.0, market: true,
      desc: '中生。新潟県の奨励品種（2005年〜）。食味・品質は従来コシヒカリと同等で、いもち病に強く農薬を減らせる。長稈で倒伏には弱く、高温にも弱い。',
    },
    koshi: {
      name: 'コシヒカリ（従来）', kind: '良食味', group: 'koshi', estimated: true,
      by: 530, bq: 95, pr: 18500, pr2: 17900, cst: 24000, ht: 0.30, ft: 0.25, ct: 0.70, sp: 0.70, dy: 123,
      pS: [5, 8], pE: [5, 25], bS: [5, 12], bE: [5, 20],
      blast: 1.3, laborMult: 1.0, directCoef: 1.06, market: true,
      desc: '従来の系統。直販ではこだわりとしてやや高く売れるが、いもち病に弱く農薬代もかさむ（ゲーム用の推定値）。',
    },
    shinnosuke: {
      name: '新之助', kind: '新潟の最上位ブランド米', unlock: 'shinnosuke',
      by: 530, bq: 93, pr: 19000, pr2: 18400, cst: 26000, ht: 0.80, ft: 0.65, ct: 0.50, sp: 0.60, dy: 130,
      pS: [5, 8], pE: [5, 25], bS: [5, 12], bE: [5, 20],
      blast: 0.9, laborMult: 1.08, directCoef: 1.12, market: true,
      desc: '中晩生。同じ田植え日ならコシヒカリより約7日遅く成熟。高温耐性が強く、2023年の猛暑でも1等比率約95%を保った。大粒で良食味。作るには生産者登録が必要。',
    },
    koshiibuki: {
      name: 'こしいぶき', kind: '早生の良食味米',
      by: 520, bq: 88, pr: 17000, pr2: 16400, cst: 21000, ht: 0.50, ft: 0.60, ct: 0.50, sp: 0.55, dy: 120,
      pS: [5, 5], pE: [5, 20], bS: [5, 8], bE: [5, 15],
      blast: 1.0, laborMult: 1.0, directCoef: 0.92, market: true,
      desc: '早生。コシヒカリより約10cm短く倒伏に強い。耐冷性は中。高温年は白未熟粒がやや出やすい。',
    },
    hazuki: {
      name: '葉月みのり', kind: '極早生',
      by: 500, bq: 84, pr: 18000, pr2: 17400, cst: 21000, ht: 0.50, ft: 0.55, ct: 0.45, sp: 0.30, dy: 105,
      pS: [4, 28], pE: [5, 15], bS: [5, 1], bE: [5, 10],
      blast: 1.3, laborMult: 1.0, directCoef: 0.95, market: true,
      desc: '極早生（柏崎地域中心）。8月中に収穫でき、秋雨の前に刈り終えられる。穂発芽しやすく刈り遅れに注意。穂いもちに弱い。',
    },
    natsuhime: {
      name: 'なつひめ', kind: '極早生・高温に強い',
      by: 490, bq: 88, pr: 15200, pr2: 14600, cst: 21000, ht: 0.80, ft: 0.65, ct: 0.40, sp: 0.50, dy: 104,
      pS: [4, 28], pE: [5, 15], bS: [5, 1], bE: [5, 10],
      blast: 1.1, laborMult: 1.0, directCoef: 0.85, market: true,
      desc: '新潟135号（R8年産から一般栽培）。極早生でこしいぶきより約10日早い。高温耐性は新之助並みに強い。障害型耐冷性はやや弱い。',
    },
    yukinko: {
      name: 'ゆきん子舞', kind: '早生多収の業務用',
      by: 560, bq: 80, pr: 15500, pr2: 14900, cst: 21000, ht: 0.65, ft: 0.75, ct: 0.55, sp: 0.50, dy: 118,
      pS: [5, 3], pE: [5, 18], bS: [5, 6], bE: [5, 14],
      blast: 0.9, laborMult: 1.0, directCoef: 0.85, market: true,
      desc: '早生多収の業務用。地力が高くても倒伏しにくく、高温条件でも品質を保ちやすい。',
    },
    akidawara: {
      name: 'あきだわら', kind: '晩生多収の業務用',
      by: 600, bq: 78, pr: 15500, pr2: 14900, cst: 20000, ht: 0.55, ft: 0.75, ct: 0.45, sp: 0.45, dy: 138,
      pS: [5, 10], pE: [5, 30], bS: [5, 15], bE: [5, 25],
      blast: 0.9, laborMult: 0.97, directCoef: 0.78, market: true,
      desc: '晩生多収の業務用。コシヒカリより2〜3割多収（多肥栽培時）。倒伏に強い。収穫が遅いぶん秋雨の影響を受けやすい。',
    },
    niji: {
      name: 'にじのきらめき', kind: '中生多収・高温に強い',
      by: 610, bq: 86, pr: 15500, pr2: 14900, cst: 21000, ht: 0.70, ft: 0.85, ct: 0.50, sp: 0.70, dy: 128,
      pS: [5, 8], pE: [5, 25], bS: [5, 12], bE: [5, 20],
      blast: 0.9, laborMult: 0.97, directCoef: 0.8, market: true,
      desc: 'コシヒカリ熟期の中生多収（コシ比+15%）。高温登熟性やや強・倒伏に強い・穂発芽しにくい。',
    },
    koganemochi: {
      name: 'こがねもち', kind: 'もち米', group: 'mochi', estimated: true,
      by: 510, bq: 88, pr: 18000, pr2: 17400, cst: 21000, ht: 0.45, ft: 0.45, ct: 0.55, sp: 0.35, dy: 121,
      pS: [5, 5], pE: [5, 20], bS: [5, 8], bE: [5, 15],
      blast: 1.0, laborMult: 1.0, directCoef: 1.0, market: true,
      desc: '新潟を代表するもち米。餅や和菓子に使われ、もち加工業者との契約もある（数値はゲーム用の推定値）。',
    },
    watabou: {
      name: 'わたぼうし', kind: 'もち米・早生', group: 'mochi', estimated: true,
      by: 500, bq: 88, pr: 17800, pr2: 17200, cst: 21000, ht: 0.45, ft: 0.50, ct: 0.50, sp: 0.35, dy: 112,
      pS: [5, 1], pE: [5, 18], bS: [5, 5], bE: [5, 12],
      blast: 1.0, laborMult: 1.0, directCoef: 0.98, market: true,
      desc: '早く収穫できるもち米。こがねもちと作期を分けられる（数値はゲーム用の推定値）。',
    },
    gohyaku: {
      name: '五百万石', kind: '早生の酒造好適米',
      by: 480, bq: 80, pr: 20500, pr2: 18700, cst: 24000, ht: 0.45, ft: 0.35, ct: 0.60, sp: 0.45, dy: 118,
      pS: [5, 3], pE: [5, 18], bS: [5, 7], bE: [5, 14],
      blast: 1.0, laborMult: 1.1, directCoef: null, market: true, sake: true,
      desc: '早生の酒造好適米で「東の横綱」。長稈で倒伏しやすく、高温年は心白の出方が乱れやすい。単価は酒蔵との契約次第。',
    },
    koshitanrei: {
      name: '越淡麗', kind: '晩生・大吟醸向けの酒米', estimated: true,
      by: 450, bq: 78, pr: 22000, pr2: 20000, cst: 26000, ht: 0.40, ft: 0.30, ct: 0.55, sp: 0.45, dy: 132,
      pS: [5, 8], pE: [5, 25], bS: [5, 12], bE: [5, 20],
      blast: 1.0, laborMult: 1.2, directCoef: null, market: true, sake: true,
      desc: '大吟醸向けに生まれた新潟の酒米。栽培は難しく収量も少ないが、契約価格は高い（数値はゲーム用の推定値）。',
    },
    ipponjime: {
      name: '一本〆', kind: '酒造好適米', estimated: true,
      by: 500, bq: 80, pr: 20000, pr2: 18500, cst: 24000, ht: 0.45, ft: 0.40, ct: 0.60, sp: 0.45, dy: 120,
      pS: [5, 3], pE: [5, 18], bS: [5, 7], bE: [5, 14],
      blast: 1.0, laborMult: 1.1, directCoef: null, market: true, sake: true,
      desc: '新潟の酒造好適米の一つ。酒蔵との契約で売る（数値はゲーム用の推定値）。',
    },
    feed: {
      name: '新潟次郎', kind: '極早生多収の飼料用米', sub: { std: 530 },
      by: 580, bq: 72, pr: 1800, pr2: 1800, cst: 19000, ht: 0.50, ft: 0.65, ct: 0.50, sp: 0.40, dy: 108,
      pS: [4, 25], pE: [5, 15], bS: [5, 1], bE: [5, 10],
      blast: 0.6, laborMult: 0.85, directCoef: null, market: false,
      desc: '極早生多収の飼料用米。販売単価は30円/kgで米価とは連動しないが、単収に応じた交付金（数量払い）が出る。コシヒカリより10日以上早く収穫でき、作業が競合しにくい。',
    },
    none: {
      name: '休耕（作付なし）', kind: '—', by: 0, bq: 0, pr: 0, market: false, fallow: true,
      desc: '作付しない。地代・水利費と草刈りの手間はかかる。',
    },
  };
  // 品種のアイコン（酒米・もち米・飼料用米・ブランド米は見分けやすく）
  D.cropIcon = (k) => { const c = D.CROPS[k] || {}; return k === 'feed' ? '🐄' : k === 'none' ? '🟫' : c.sake ? '🍶' : c.group === 'mochi' ? '🍡' : c.unlock ? '✨' : '🌾'; };
  D.CROP_ORDER = ['koshiBL', 'koshi', 'shinnosuke', 'koshiibuki', 'hazuki', 'natsuhime', 'yukinko', 'akidawara', 'niji',
    'koganemochi', 'watabou', 'gohyaku', 'koshitanrei', 'ipponjime', 'feed', 'none'];
  D.CROP_ORDER.forEach((k) => { D.CROPS[k].priceCoef = D.CROPS[k].market ? D.CROPS[k].pr / D.REF_PRICE : 0; });
  // 以前のバージョンの品種名（古いセーブデータの読み込み用）
  D.CROP_RENAME = { hikari: 'koshiBL', natsu: 'shinnosuke', yutaka: 'akidawara', yuho: 'gohyaku' };
  for (const k in D.CROP_RENAME) D.CROPS[k] = Object.assign({ alias: true }, D.CROPS[D.CROP_RENAME[k]]);

  // 田植え時期の選択（適期の中央日からのずれ・日）
  D.PLANT_SHIFTS = [
    { v: -7, label: '早め' }, { v: 0, label: '適期' }, { v: 7, label: '遅め' }, { v: 14, label: 'かなり遅め' },
  ];

  // ---------- 栽培方法 ----------
  D.CULTS = {
    conv: { name: '慣行栽培', short: '慣行', yield: 1, fert: 1, pest: 1, manageLabor: 1, pestSens: 0.35,
      desc: '地域の標準的な栽培。農薬で病害虫を抑える。' },
    special: { name: '特別栽培', short: '特栽', yield: 0.94, fert: 0.95, pest: 0.5, manageLabor: 1.5, pestSens: 1.0,
      desc: '農薬・化学肥料を地域慣行の半分以下に。直販・生協で高く売れるが手間と病害虫リスクが増える。' },
    organic: { name: '有機栽培', short: '有機', yield: 0.78, fert: 1.3, pest: 0.1, manageLabor: 3.0, pestSens: 1.6,
      desc: '農薬・化学肥料を使わない。除草の手間が非常に大きい。3年目から「有機」として高く売れる（それまでは転換期間中）。' },
  };
  D.CULT_ORDER = ['conv', 'special', 'organic'];
  // 販売時の区分（有機は転換期間中かどうかで扱いが変わる）
  D.CULT_KEYS = {
    conv: { name: '慣行栽培', short: '慣行', jaPrem: 1.0, directPrem: 1.0, tier: 0 },
    special: { name: '特別栽培', short: '特栽', jaPrem: 1.03, directPrem: 1.12, tier: 1 },
    organicT: { name: '有機（転換期間中）', short: '有機転換中', jaPrem: 1.0, directPrem: 1.12, tier: 1 },
    organic: { name: '有機栽培', short: '有機', jaPrem: 1.06, directPrem: 1.4, tier: 2 },
  };
  D.TIER_NAMES = ['条件なし', '特別栽培以上', '有機'];

  D.SOWS = {
    transplant: { name: '移植（田植え）', short: '移植', yield: 1, seedMult: 1, manageLabor: 1, noise: 0,
      desc: '苗を育てて田植えする標準的な方法。育苗と田植えに春の手間がかかる。' },
    direct: { name: '直播', short: '直播', yield: 0.92, seedMult: 1.6, manageLabor: 1.15, noise: 0.05,
      desc: '田に直接種をまく。育苗・田植えが不要で春の作業が大幅に減る。収量はやや低く不安定。' },
  };

  // ---------- 作業 ----------
  // share: 総労働時間に占める割合 / mtype: 必要な機械 / fee: 委託料（円/10a）
  D.OPS = {
    till:    { name: '耕起・代かき', mtype: 'tractor', share: 0.18, season: 'spring', fee: 12000, on: 'planted' },
    nursery: { name: '育苗', mtype: 'nursery', share: 0.12, season: 'spring', fee: 9000, on: 'transplant', feeName: '苗の購入' },
    plant:   { name: '田植え', mtype: 'planter', share: 0.12, season: 'spring', fee: 8000, on: 'transplant' },
    seed:    { name: '直播（播種）', mtype: null, share: 0.05, season: 'spring', fee: 0, on: 'direct' },
    manage:  { name: '水管理・除草・防除', mtype: null, share: 0.28, season: 'summer', fee: 0, on: 'planted' },
    harvest: { name: '稲刈り', mtype: 'combine', share: 0.18, season: 'autumn', fee: 16000, on: 'planted' },
    dry:     { name: '乾燥・調製', mtype: 'dryer', share: 0.12, season: 'autumn', fee: 13000, on: 'planted' },
  };
  D.OP_ORDER = ['till', 'nursery', 'plant', 'seed', 'manage', 'harvest', 'dry'];

  // 作業委託の受け皿（ha、作業ごと）＝ base + 地域の信頼 × perTrust
  D.CONTRACT_CAP = { base: 8, perTrust: 0.12 };

  // ---------- 機械・設備 ----------
  D.MACHINE_TYPES = {
    tractor: { icon: '🚜', name: 'トラクタ', role: '耕起・代かき（直播の播種も）', contract: true },
    nursery: { icon: '🏠', name: '育苗施設', role: '苗づくり。無いと苗を購入する', contract: true },
    planter: { icon: '🌱', name: '田植機', role: '田植え', contract: true },
    combine: { icon: '🌾', name: 'コンバイン', role: '稲刈り', contract: true },
    dryer: { icon: '🔥', name: '乾燥調製施設', role: '乾燥・もみすり', contract: true },
    drone: { icon: '🛸', name: '防除用ドローン', role: '夏の管理作業を省力化・病害虫を軽減', contract: false },
    smart: { icon: '📡', name: 'スマート農業システム', role: '自動操舵・水管理で全作業を省力化', contract: false },
    mill: { icon: '⚙️', name: '精米・選別設備', role: '直販用の精米を自前化（経費と手間を削減）', contract: false },
    proc: { icon: '🍡', name: '加工場', role: '餅・米粉の加工（「新しい事業」タブ）', contract: false },
    stand: { icon: '🏪', name: '直売所', role: '米や野菜の店（「新しい事業」タブ）', contract: false },
  };
  D.MACHINE_TYPE_ORDER = ['tractor', 'nursery', 'planter', 'combine', 'dryer', 'drone', 'smart', 'mill'];

  // cap: 1シーズンにこなせる面積(ha) / eff: 労働時間の倍率（小さいほど省力）
  D.MODELS = {
    tr_s: { type: 'tractor', name: 'トラクタ 25馬力', price: 3500000, cap: 10, eff: 1.0, life: 7, maxAge: 20 },
    tr_m: { type: 'tractor', name: 'トラクタ 50馬力', price: 7000000, cap: 25, eff: 0.72, life: 7, maxAge: 20 },
    tr_l: { type: 'tractor', name: 'トラクタ 100馬力', price: 14000000, cap: 60, eff: 0.52, life: 7, maxAge: 20 },
    ns_s: { type: 'nursery', name: '育苗ハウス 小', price: 1200000, cap: 8, eff: 1.0, life: 14, maxAge: 25 },
    ns_l: { type: 'nursery', name: '育苗ハウス 大（自動播種機付）', price: 3800000, cap: 30, eff: 0.65, life: 14, maxAge: 25 },
    pl_s: { type: 'planter', name: '田植機 4条', price: 1600000, cap: 6, eff: 1.0, life: 7, maxAge: 15 },
    pl_m: { type: 'planter', name: '田植機 6条', price: 3200000, cap: 15, eff: 0.72, life: 7, maxAge: 15 },
    pl_l: { type: 'planter', name: '田植機 8条（密苗対応）', price: 6000000, cap: 32, eff: 0.52, life: 7, maxAge: 15 },
    cb_s: { type: 'combine', name: 'コンバイン 3条', price: 5500000, cap: 10, eff: 1.0, life: 7, maxAge: 15 },
    cb_m: { type: 'combine', name: 'コンバイン 5条', price: 12000000, cap: 25, eff: 0.72, life: 7, maxAge: 15 },
    cb_l: { type: 'combine', name: 'コンバイン 6条', price: 18000000, cap: 45, eff: 0.52, life: 7, maxAge: 15 },
    dr_s: { type: 'dryer', name: '乾燥機 小（30石）', price: 2500000, cap: 8, eff: 1.0, life: 7, maxAge: 20 },
    dr_m: { type: 'dryer', name: '乾燥調製施設 中', price: 7500000, cap: 22, eff: 0.72, life: 7, maxAge: 20 },
    dr_l: { type: 'dryer', name: '乾燥調製施設 大', price: 16000000, cap: 50, eff: 0.5, life: 7, maxAge: 20 },
    dn:   { type: 'drone', name: '防除用ドローン', price: 1800000, cap: 50, eff: 1, life: 5, maxAge: 8 },
    sm:   { type: 'smart', name: '自動操舵・水管理システム', price: 3000000, cap: 40, eff: 1, life: 7, maxAge: 12 },
    ml:   { type: 'mill', name: '精米・色彩選別設備', price: 2200000, cap: 0, eff: 1, life: 10, maxAge: 15 },
    pc:   { type: 'proc', name: '餅・米粉の加工場', price: 4500000, cap: 0, eff: 1, life: 10, maxAge: 25 },
    ds:   { type: 'stand', name: '農産物の直売所', price: 2500000, cap: 0, eff: 1, life: 15, maxAge: 30 },
  };
  D.MACHINE = {
    leaseRate: 0.165,     // 年間リース料 = 価格 × この率（修理費込み・7年契約）
    leaseYears: 7,
    loanRate10: 0.012,
    loanRate20: 0.015,
    lowRate: 0.008,
  };

  // ---------- 費用（円/10a、物価上昇で毎年少しずつ上がる） ----------
  D.COST = {
    cstSplit: { seed: 0.15, fert: 0.45, pest: 0.40 }, // 品種の変動費 cst の内訳
    nurseryMat: 4000, fuel: 4500, dryFuel: 2500,
    materials: 2000, fallow: 3000, water: 4000, landTax: 1500,
    jaFee: 600, feedFee: 300, contractShip: 300, spotFee: 300,
    miscFixed: 300000, miscRate: 0.005,
  };

  // ---------- 販売 ----------
  D.SALES = {
    jaAdvance: 0.85,          // 農協概算金として10月に入る割合（残りは翌年6月の追加払い）
    spotRate: 0.88,
    feedPrice: 1800,          // 飼料用米の販売単価（30円/kg）
    // 水田活用の直接支払交付金（数量払い・多収品種、R8年産）：標準8万円/10a、単収が標準単収±150kgで5.5万〜10.5万円
    feedSubsidyBase: 80000, feedSubsidyMin: 55000, feedSubsidyMax: 105000,
    procureExtra: 1500,       // 契約不足分を市場から調達するときの上乗せ
    // 農協の出荷契約金（前渡金）：出荷契約の数量に応じて6月に支払われ、秋の概算金と相殺する。
    // 例：JA黒部（富山）令和8年産 出荷契約米1俵10,000円・6月25日払い（R2・R3年産は6,000円）、JA長生（千葉）R3年産 5,000円。
    // ゲームでは「その年の予想米価の約半分」を1,000円単位に丸め、5,000〜12,000円の範囲にする
    advanceRate: 0.5, advanceMin: 5000, advanceMax: 12000, advanceAutoShare: 0.9,
  };
  D.DIRECT = {
    bagsPerBale: 10.8,        // 玄米60kg → 精米5kg袋の数
    perCustomer: 0.5,         // 顧客1人あたり年間購入量（俵）
    elasticity: 1.8,
    retailFactor: 0.147,      // 参考小売価格(5kg) = コシヒカリの米価 × この係数
    packaging: 1200,
    polish: 1000, polishMill: 100,
    platform: 0.08,
    labor: 0.6, laborMill: 0.35,
    cac: 8000,                // 新規顧客1人の獲得費用
    baseChurn: 0.18,
  };
  D.BRAND = { decay: 0.12, gain: 10 };

  // ---------- 資金 ----------
  D.FIN = {
    shortRate: 0.02,
    emergencyRate: 0.08,
    noInterestTerm: 12, noInterestGrace: 2,
    livingMin: 1800000,
  };

  D.INSURANCE = {
    none: { name: '加入しない', desc: '保険料はかからないが、不作や値下がりはすべて自分でかぶる。' },
    kyosai: { name: '収量共済', perArea: 1300,
      desc: '天候不順などで収量が平年の8割を下回ったとき、不足分を補てん。米価の下落は補償されない。' },
    income: { name: '収入保険', rate: 0.011,
      desc: '過去の平均収入（基準収入）の9割を下回った分の9割を補てん。米価下落もカバー。前年の決算実績が必要。' },
  };

  // ---------- 天候（参考/rice_simulator.html の年タイプ・気象イベントに準拠） ----------
  // 年タイプ：中越地域の過去の分布を反映。mult=イベント発生確率の倍率、sevBias=重度の出やすさ、temp=生育期間の気温偏差(℃)
  D.YEAR_TYPES = {
    normal: { name: '平年', icon: '🌤', p: 0.30, mult: {}, sevBias: 0, temp: 0, pestP: 0.12,
      desc: '気象が概ね平年並み。大きな災害は発生しにくい。' },
    hot: { name: '猛暑年', icon: '☀', p: 0.30, mult: { heat: 2.5, foehn: 2.0, sun: 0.4, cold: 0.1, frost: 0.3 }, sevBias: 0.12, temp: 1.0, pestP: 0.3,
      desc: '猛暑・フェーン現象が多く、品質低下のリスクが大きい（2018・2023年型）。' },
    cold: { name: '冷夏', icon: '❄', p: 0.05, mult: { cold: 4.0, sun: 1.8, heat: 0.2, foehn: 0.3, flood: 1.2 }, sevBias: 0.1, temp: -1.0, pestP: 0.4,
      desc: '冷涼な夏。冷害・日照不足・いもち病が出やすく、登熟が遅れる。' },
    rain: { name: '多雨年', icon: '🌧', p: 0.20, mult: { flood: 2.2, akisa: 2.0, sun: 1.5, heat: 0.6 }, sevBias: 0.1, temp: -0.3, pestP: 0.45,
      desc: '梅雨・秋雨が長引く年。日照不足・大雨・秋雨が多い（2017・2022年型）。' },
    typh: { name: '台風年', icon: '🌀', p: 0.10, mult: { typh: 2.8, foehn: 1.8, flood: 1.5, akisa: 1.3 }, sevBias: 0.15, temp: 0.2, pestP: 0.2,
      desc: '強い台風が複数接近。台風・フェーン・大雨が連動する（2019年型）。' },
    good: { name: '豊作年', icon: '🌾', p: 0.05, mult: { heat: 0.3, typh: 0.3, flood: 0.3, sun: 0.5, cold: 0.2, foehn: 0.3, akisa: 0.4, frost: 0.2 }, sevBias: -0.2, temp: 0.3, pestP: 0.08,
      desc: '気象条件が稲作に理想的。大きな災害がなく高品質・高収量。' },
  };
  D.YEAR_TYPE_ORDER = ['normal', 'hot', 'cold', 'rain', 'typh', 'good'];
  // 画面表示用（以前のバージョンの天候名も含む）
  D.WEATHER = {};
  D.YEAR_TYPE_ORDER.forEach((k) => { D.WEATHER[k] = { name: D.YEAR_TYPES[k].name, icon: D.YEAR_TYPES[k].icon }; });
  D.WEATHER.heat = D.WEATHER.hot; D.WEATHER.typhoon = D.WEATHER.typh;

  // 気象イベント：yi=収量影響率 qi=品質影響(点)（中度発生時）。実効被害 = yi/qi × 重度倍率 × (1-耐性) × 相乗係数 × 曝露係数
  // tol=対応する耐性 / win=発生期間 / vul=収穫日の何日前〜何日後が被害を受けるか / month=ログに出す月
  D.EVENTS = [
    { id: 'heat', name: '猛暑', icon: '☀', p: 0.40, yi: -0.03, qi: -15, tol: 'ht', month: 8,
      desc: '7〜8月の高温登熟障害。収量より品質への影響が大きく、白未熟粒が増える。高温耐性品種（新之助など）は影響が小さい。' },
    { id: 'typh', name: '台風', icon: '🌀', p: 0.20, yi: -0.07, qi: -6, tol: 'ft', win: [[8, 15], [9, 30]], vul: [40, 0], month: 9,
      desc: '出穂後〜収穫前の稲が倒伏・穂発芽で被害を受ける。それより前に刈る極早生は影響が小さい。耐倒伏性で軽減。' },
    { id: 'sun', name: '日照不足', icon: '☁', p: 0.30, yi: -0.04, qi: -4, tol: null, month: 7,
      desc: '6〜7月の梅雨期。穂数減少・登熟不足。品種の特性では軽減できない。' },
    { id: 'cold', name: '冷害', icon: '❄', p: 0.06, yi: -0.10, qi: -8, tol: 'ct', month: 7,
      desc: '7〜8月の低温による障害不稔。重度なら1993年級の大減収。障害型耐冷性で被害が大きく変わる。' },
    { id: 'flood', name: '大雨・洪水', icon: '🌊', p: 0.20, yi: -0.06, qi: -6, tol: 'ft', month: 7,
      desc: '梅雨末期〜8月の線状降水帯。冠水・倒伏で被害。耐倒伏性の強い品種は回復が早い。' },
    { id: 'foehn', name: 'フェーン現象', icon: '🔥', p: 0.20, yi: -0.03, qi: -9, tol: 'ht', month: 8,
      desc: '8〜9月の高温乾燥風。白未熟粒を助長する。猛暑と重なると被害が大きい。' },
    { id: 'akisa', name: '秋雨長雨', icon: '🌧', p: 0.25, yi: -0.03, qi: -6, tol: 'sp', win: [[9, 1], [10, 31]], vul: [15, 7], month: 10,
      desc: '9〜10月。成熟期〜収穫期の降雨で穂発芽・胴割れが起き、刈り取りも遅れる。収穫が遅い品種ほど被害が大きい。' },
    { id: 'frost', name: '晩霜', icon: '🧊', p: 0.03, yi: -0.06, qi: -4, tol: 'ct', month: 5,
      desc: '5月の田植え直後の遅霜。中山間地で起きやすい。' },
  ];
  D.SEV = { light: { name: '軽度', mult: 0.5 }, mid: { name: '中度', mult: 1.0 }, heavy: { name: '重度', mult: 1.8 } };
  D.TOL_NAMES = { ht: '高温登熟', ft: '耐倒伏', ct: '耐冷', sp: '穂発芽' };

  // 栽培モデルの設定値（参考ファイルの既定値）
  D.AGRO = {
    tempNormal: { 1: 1.6, 2: 1.8, 3: 4.9, 4: 11.0, 5: 16.9, 6: 21.0, 7: 24.8, 8: 26.2, 9: 22.0, 10: 15.9, 11: 9.6, 12: 4.2 }, // アメダス長岡 平年値
    maxHarvestDelay: 30,
    grade: { start: 6, scale: 40, power: 1.15, floor: 0.02 }, // 品質の低下幅 → 1等の割合（なだらかに下がる）
    grade3Gap: 1.0, gradeX: 0.55,
    harvestWorkDays: 20,        // 機械の能力(ha)をこなすのに必要な実働日数
    harvestWorkRate: 0.65,      // 収穫期の稼働率（秋雨で作業できない日がある）
    harvestGrace: 5,            // 刈り取り適期の余裕（日）
    priceVol: 0.10, priceHedge: 0.3,
  };

  // ---------- 損益計算書の科目 ----------
  D.PL_CATS = {
    jaSales: { label: '農協出荷', kind: 'sales' },
    contractSales: { label: '契約販売', kind: 'sales' },
    directSales: { label: '直販', kind: 'sales' },
    spotSales: { label: 'スポット販売（売れ残り等）', kind: 'sales' },
    feedSales: { label: '飼料用米販売', kind: 'sales' },
    storedSales: { label: '保管米の販売（前年産）', kind: 'sales' },
    inventory: { label: '保管米の棚卸の増減（年末の在庫 − 年初の在庫）', kind: 'sales' },
    serviceSales: { label: '作業受託の収入', kind: 'sales' },
    procSales: { label: '加工品（餅・米粉）の売上', kind: 'sales' },
    standSales: { label: '直売所の売上', kind: 'sales' },
    seed: { label: '種苗費', kind: 'expense', group: 'var' },
    nursery: { label: '育苗資材・苗購入費', kind: 'expense', group: 'var' },
    fert: { label: '肥料費', kind: 'expense', group: 'var' },
    pest: { label: '農薬費', kind: 'expense', group: 'var' },
    fuel: { label: '動力光熱費', kind: 'expense', group: 'var' },
    materials: { label: '諸材料費', kind: 'expense', group: 'var' },
    water: { label: '水利費', kind: 'expense', group: 'var' },
    contract: { label: '作業委託料', kind: 'expense', group: 'var' },
    wagePart: { label: 'パート賃金', kind: 'expense', group: 'var' },
    salesCost: { label: '販売経費（手数料・包装等）', kind: 'expense', group: 'var' },
    procure: { label: '契約不足分の調達費', kind: 'expense', group: 'var' },
    bizCost: { label: '事業の経費（燃料・原材料・包装など）', kind: 'expense', group: 'var' },
    repair: { label: '修繕費', kind: 'expense', group: 'fix' },
    depreciation: { label: '減価償却費', kind: 'expense', group: 'fix' },
    rent: { label: '地代（借地料）', kind: 'expense', group: 'fix' },
    lease: { label: 'リース料', kind: 'expense', group: 'fix' },
    wageStaff: { label: '社員給与・社会保険', kind: 'expense', group: 'fix' },
    execPay: { label: '役員報酬', kind: 'expense', group: 'fix' },
    recruit: { label: '採用・研修費', kind: 'expense', group: 'fix' },
    marketing: { label: '販促費', kind: 'expense', group: 'fix' },
    brand: { label: 'ブランド投資（広告宣伝）', kind: 'expense', group: 'fix' },
    insurance: { label: '保険料・共済掛金', kind: 'expense', group: 'fix' },
    landTax: { label: '固定資産税', kind: 'expense', group: 'fix' },
    misc: { label: '雑費・事務費', kind: 'expense', group: 'fix' },
    eventCost: { label: '臨時の支出', kind: 'expense', group: 'fix' },
    subsidy: { label: '交付金', kind: 'nonopIncome' },
    grant: { label: '就農支援金', kind: 'nonopIncome' },
    insuranceIn: { label: '保険金・共済金', kind: 'nonopIncome' },
    otherIncome: { label: 'その他の収入', kind: 'nonopIncome' },
    interest: { label: '支払利息', kind: 'nonopExpense' },
  };
  // 損益計算書以外の資金の動き
  D.CASH_CATS = {
    asset: '設備・農地の購入', assetSale: '設備・農地の売却', loanIn: '借入', loanOut: '借入金の返済',
    collect: '前年分の入金（未収金の回収）', advanceIn: '出荷契約金（前渡金）の受け取り', advanceOut: '出荷契約金の返還', tax: '税金の支払い', withdraw: '家計費（生活費）', capital: '出資',
  };

  // ---------- 開始シナリオ ----------
  D.SCENARIOS = {
    shinki: {
      name: '新規就農', sub: '借地3haからのスタート', difficulty: '難しい',
      desc: '研修を終えて独立。機械はほとんどなく、作業の多くを委託に頼る。就農支援金（3年間）と無利子資金を活かして、地域の信頼を得ながら規模を広げよう。',
      corp: false, cash: 5000000, living: 2400000, trust: 20, skill: 0.92, customers: 30, brand: 0,
      fields: [
        { area: 1.2, soil: 'normal', rent: 10000 }, { area: 0.9, soil: 'good', rent: 12000 }, { area: 0.9, soil: 'poor', rent: 6000 },
      ],
      machines: [{ model: 'tr_s', age: 12 }],
      loans: [],
      family: [{ name: 'あなた', role: '経営主', hours: 2000, age: 30, tag: 'operator' }, { name: '配偶者', role: '家族（手伝い）', hours: 600, age: 30 }],
      staff: 0, partTimers: 0,
      grantYears: 3, grantAmount: 1500000, noInterestCap: 15000000,
      defaultCrop: 'koshiBL',
    },
    oyamoto: {
      name: '親元就農', sub: '親の10haを受け継ぐ', difficulty: 'ふつう',
      desc: '親から農地と機械を受け継ぐ。機械は古く故障しやすい。父はいずれ引退する。設備更新と後継の経営スタイルをどう描くか。',
      corp: false, cash: 4000000, living: 3000000, trust: 50, skill: 0.96, customers: 60, brand: 5,
      fields: [
        { area: 2.0, soil: 'good', owned: true }, { area: 1.5, soil: 'normal', owned: true },
        { area: 1.5, soil: 'normal', owned: true }, { area: 1.0, soil: 'poor', owned: true },
        { area: 1.5, soil: 'normal', rent: 10000 }, { area: 1.2, soil: 'normal', rent: 11000 }, { area: 1.3, soil: 'poor', rent: 7000 },
      ],
      machines: [
        { model: 'tr_m', age: 13 }, { model: 'pl_m', age: 11 }, { model: 'cb_m', age: 12 },
        { model: 'dr_m', age: 16 }, { model: 'ns_s', age: 15 },
      ],
      loans: [{ kind: 'long', name: '設備資金（親から継承）', balance: 3000000, rate: 0.015, yearsLeft: 3 }],
      family: [
        { name: 'あなた', role: '経営主', hours: 2000, age: 32, tag: 'operator' }, { name: '父', role: '前経営主', hours: 1600, age: 62, tag: 'father' },
        { name: '母', role: '家族', hours: 1000, age: 60 },
      ],
      staff: 0, partTimers: 1,
      defaultCrop: 'koshiBL',
    },
    hojin: {
      name: '法人参入', sub: '異業種から農業法人を設立', difficulty: 'ふつう',
      desc: '資本金4,000万円で農業法人を設立。撤退する農家から借りた12haで始めるが、機械はなく地域の信頼も低い。社員を雇い、投資の回収を考えながら規模を拡大しよう。',
      corp: true, cash: 40000000, execPay: 4000000, trust: 25, skill: 0.9, customers: 0, brand: 0,
      fields: [
        { area: 3.0, soil: 'normal', rent: 12000 }, { area: 2.5, soil: 'normal', rent: 12000 }, { area: 2.5, soil: 'good', rent: 13000 },
        { area: 2.0, soil: 'normal', rent: 11000 }, { area: 2.0, soil: 'poor', rent: 7000 },
      ],
      machines: [],
      loans: [],
      family: [{ name: 'あなた', role: '代表取締役', hours: 1800, age: 45, tag: 'operator' }],
      staff: 1, partTimers: 1,
      defaultCrop: 'akidawara',
    },
  };
  // 「自分の経営で始める」：中身は入力された内容から作る（js/state.js の S.buildCustom）
  D.SCENARIOS.custom = { name: '自分の経営', sub: 'あなたの今の経営で20年', difficulty: 'あなた次第', custom: true,
    desc: '今の農地・品種・機械・家族・お金の状況を入れて、あなたの経営で20年を体験します。家族の年齢や機械の寿命もゲームに入ります。' };
  D.SCENARIO_ORDER = ['shinki', 'oyamoto', 'hojin'];

  D.SOILS = {
    good: { name: '条件良（平坦・大区画）', short: '良', yieldMult: 1.05, laborMult: 0.95 },
    normal: { name: '普通', short: '普通', yieldMult: 1.0, laborMult: 1.0 },
    poor: { name: '条件不利（中山間・小区画）', short: '不利', yieldMult: 0.9, laborMult: 1.3 },
  };
  D.LAND_PRICE = { good: [90, 120], normal: [70, 95], poor: [40, 60] }; // 万円/10a

  D.PLACES = ['上田', '下川', '東原', '西沢', '北野', '南浦', '中島', '宮前', '新田', '古川', '坂下', '松原',
    '竹林', '梅里', '桜台', '柳町', '石原', '若葉', '清水', '大塚', '杉谷', '川辺', '岡本', '本郷'];
  D.SURNAMES = ['山本', '小林', '中村', '石井', '森', '池田', '橋本', '前田', '藤井', '岡田', '村上', '長谷川', '近藤', '後藤', '坂本', '遠藤'];
  D.STAFF_NAMES = ['木村', '林', '清水', '山崎', '阿部', '松田', '井上', '原田', '菅野', '野口'];

  // 契約栽培：数量と条件は事前に約束し、価格は収穫の年の農協価格（＝米の需給）に上乗せ率 pmul を掛けて決まる
  D.CONTRACT_TEMPLATES = [
    { buyer: '外食チェーン「まんぷく亭」', crop: 'akidawara', minCult: 0, vol: [150, 600], pmul: [0.96, 1.04], years: 3 },
    { buyer: '弁当チェーン「いろどりキッチン」', crop: 'yukinko', minCult: 0, vol: [100, 400], pmul: [0.98, 1.04], years: 2 },
    { buyer: '米穀卸「みのり商事」', crop: 'koshiBL', minCult: 0, vol: [100, 400], pmul: [1.0, 1.06], years: 2 },
    { buyer: '米穀卸「みのり商事」', crop: 'koshiibuki', minCult: 0, vol: [100, 350], pmul: [1.0, 1.06], years: 2 },
    { buyer: '酒蔵「白峰酒造」', crop: 'gohyaku', minCult: 0, vol: [60, 250], pmul: [1.04, 1.12], years: 3 },
    { buyer: '酒蔵「白峰酒造」', crop: 'ipponjime', minCult: 0, vol: [50, 200], pmul: [1.04, 1.12], years: 3 },
    { buyer: '酒蔵「雪ノ峰酒造」', crop: 'koshitanrei', minCult: 0, vol: [30, 150], pmul: [1.08, 1.2], years: 3, minTrust: 30 },
    { buyer: 'もち加工「越後もちの里」', crop: 'koganemochi', minCult: 0, vol: [80, 300], pmul: [1.0, 1.08], years: 3 },
    { buyer: 'くらしの生協', crop: 'koshiBL', minCult: 1, vol: [80, 250], pmul: [1.12, 1.2], years: 2, minTrust: 25 },
    { buyer: '自然食品店「みどりの台所」', crop: 'koshi', minCult: 2, vol: [30, 120], pmul: [1.5, 1.7], years: 3, minBrand: 15 },
    { buyer: '料亭「花月」', crop: 'shinnosuke', minCult: 0, vol: [30, 80], pmul: [1.2, 1.3], years: 2, minBrand: 30, needFlag: 'shinnosuke' },
    { buyer: 'コンビニ向け炊飯工場「あさひフーズ」', crop: 'niji', minCult: 0, vol: [300, 900], pmul: [0.95, 1.0], years: 3, minYear: 4 },
  ];

  // ---------- 用語集 ----------
  D.GLOSSARY = {
    '10a': '面積の単位。1反（たん）とも言い、約1,000㎡。1ha = 100a = 10×10a。米の収量や費用は「10aあたり」で比べるのが基本。',
    '俵': '玄米60kgのこと。米価は「60kgあたり○円」で表すのが一般的。',
    '減価償却': '機械や設備の購入代金を、使える年数（耐用年数）にわたって少しずつ費用にする考え方。買った年に現金は大きく出ていくが、費用は毎年に分けて計上される。お金は出ていかないのに費用になるので、利益と手元資金がずれる原因になる。',
    '簿価': '帳簿上の資産の価値。取得価額から減価償却累計額を引いた残り。売却額が簿価を上回ると売却益、下回ると売却損になる。',
    '耐用年数': '減価償却で費用を分ける年数。農業機械は7年が目安。実際にはもっと長く使えることが多いが、古くなるほど修理費と故障の確率が上がる。',
    '固定費': '作付面積や生産量に関係なくかかる費用。減価償却費・地代・社員給与・リース料など。規模を広げると1haあたりの固定費が下がる（規模の経済）。',
    '変動費': '作付面積や生産量に比例して増える費用。種苗・肥料・農薬・燃料・作業委託料・販売手数料など。',
    '限界利益': '売上から変動費を引いたもの。固定費を回収する原資になる。10aあたり限界利益がマイナスの作付は、作るほど損になる。',
    '損益分岐点': '利益がちょうどゼロになる点。「あと何ha作れば黒字になるか（損益分岐面積）」「米価がいくらまで下がっても赤字にならないか（損益分岐米価）」で考えると経営判断に使いやすい。',
    '農業所得': '個人経営の「もうけ」。売上＋交付金等から経費を引いたもの。家族の労働への報酬はここから得るので、生活費をまかなえるかが重要。',
    '経常利益': '本業のもうけ（営業利益）に、交付金などの収入を足し、支払利息を引いたもの。毎年続けられる経営の実力を表す。',
    '営業利益': '売上高から経費（営業費用）を引いたもの。米を作って売るという本業そのもののもうけ。',
    '純資産': '資産から負債を引いた残り。経営の「体力」。毎年の利益の積み重ねで増え、赤字や生活費の引き出しで減る。マイナスになると債務超過。',
    '債務超過': '負債が資産を上回り、純資産がマイナスの状態。金融機関からの新たな借入が難しくなる。3年続くと経営は続けられない。',
    '自己資本比率': '純資産 ÷ 総資産。高いほど借金に頼らない安定した経営。30%以上がひとつの目安。',
    '未収金': '売上として計上済みだが、まだ入金されていないお金。農協の追加払いや直販の後払い分、交付金などは翌年に入金される。',
    '運転資金': '肥料・燃料・人件費など、売上が入るまでの間に必要なつなぎのお金。米の売上は秋に集中するので、春〜夏は資金が足りなくなりやすい。',
    'つなぎ資金': '資金がマイナスになったときに自動で借りる緊急の短期借入。年利8%と高い。事前に運転資金を借りておけば安く済む。',
    '長期借入金': '機械や農地など、長く使うものを買うための借入。返済期間が長く金利が低い。毎年12月に元金を返済する。',
    '元金均等返済': '毎年同じ額の元金を返し、利息は残高に応じて払う方式。最初の年ほど返済額が大きい。',
    '償還財源': '借金の返済に使えるお金の目安。税引後利益＋減価償却費（現金の出ない費用）。個人経営では生活費を引いた後で考える。',
    '債務償還年数': '借入金を償還財源で返し終えるまでにかかる年数。10年を超えると返済に無理がある目安。',
    '作業委託': '自分で機械を持たずに、他の農家や業者に作業をお願いすること。機械の固定費がかからない代わりに、10aあたりの委託料がかかる。',
    '機械稼働率': '機械がこなせる面積のうち、実際に使った割合。低いと1haあたりの機械費が高くなる（過剰投資）。100%を超えた分は委託になる。',
    'リース': '機械を借りて使う方式。毎年リース料を払う。まとまった資金が不要で修理費もかからないが、長く使うと購入より割高になりやすい。',
    '1等比率': '米の検査で1等と格付けされた割合。高温や長雨、刈り遅れで下がる。2等以下になると販売価格が下がる。',
    '作況指数': '全国の作柄を表す指数。平年＝100。全国的に豊作（100超）だと米が余って米価が下がりやすく、不作だと上がりやすい。',
    '概算金': '農協に出荷したときに最初に支払われるお金。販売が終わった後に精算され、翌年に追加払いがある。',
    '契約栽培': '作付の前に取引先と出荷する数量・品種・条件を決めておく販売方法。価格はその年の米の需給で決まり（このゲームでは農協の価格に上乗せ率を掛けた額）、米価が下がれば契約価格も下がる。売り先と数量が決まっていること、出荷経費が安いこと、上乗せがあることが利点。数量を守れないと不足分を高く調達しなければならない（数量責任）。',
    '米の需給': '米の供給（全国の作柄・在庫）と需要（消費・業務用の引き合い）のバランス。豊作や在庫の積み上がりで供給が多いと米価は下がり、不作や在庫不足で供給が少ないと上がる。',
    '棚卸資産': '売るために持っている品物（ここでは倉庫に保管している米）。貸借対照表の資産に入る。',
    '収穫基準': '農家の税金の決まり。とれた米は、売っていなくても「収穫したときの値段」で収入に入れる。保管して翌年売った場合は、売った値段と収穫時の値段の差だけが翌年の損益になる。',
    '作業受託': 'ほかの農家の田の作業（稲刈り・防除など）を請け負って料金をもらうこと。機械の空き能力を活かせ、1haあたりの機械費が下がる。',
    '第三者継承': '家族以外の人（研修生や社員など）に経営を引き継ぐこと。後継ぎのいない農家が増え、注目されている。',
    '6次産業化': '農家が生産（1次）だけでなく、加工（2次）や販売（3次）まで手がけること。単価は上がるが、設備投資と手間がかかる。',
    '出荷契約金': '農協と米の出荷契約を結ぶと、契約数量1俵あたりの決まった額を田植え後（6月ごろ）に前もって受け取れるお金。秋の概算金と相殺して返す。利息はかからないが、農協への出荷が契約数量より少ないと、その分は現金で返す。金額はJA・年によって異なる（例：JA黒部 令和8年産 1俵10,000円）。',
    '数量責任': '契約した数量を必ず納める義務。不作で足りないと、市場から高い米を買って納めることになる。契約は見込み収量の7〜8割までにとどめるのが安全。',
    '直販': '消費者に直接売る方法。単価は高いが、精米・包装・発送の手間と経費がかかる。リピーターを増やすことが大切。',
    '顧客獲得単価': '新しい顧客を1人増やすのにかかる販促費。顧客が毎年買ってくれれば、何年かで回収できる。',
    'リピート率': '翌年も買ってくれる顧客の割合。価格が高すぎる・品質が悪い・品切れが多いと下がる。',
    'ブランド力': '自分の米の知名度と信頼。直販の価格・新規顧客の増え方に効く。毎年投資しないと少しずつ下がる。',
    '特別栽培': '農薬・化学肥料を地域の慣行の半分以下にして育てる栽培方法。表示して高く売れるが、手間と病害虫リスクが増える。',
    '有機栽培': '化学的な農薬・肥料を使わない栽培。転換を始めて3年目（2年の転換期間後）から「有機」として販売できる。',
    '直播': '苗を作らず、田に直接種をまく方法。春の作業が大幅に減り、育苗施設や田植機がいらない。収量はやや低く不安定。',
    '飼料用米': '家畜のえさにする米。販売価格は安いが、主食用米の需給調整のため交付金が出る。制度は国の方針で変わることがある（政策リスク）。',
    '交付金': '国などから一定の条件で支払われるお金。飼料用米などに出る。入金は翌年3月。',
    '収入保険': '米価の下落や不作で収入が基準収入の9割を下回ったとき、その一部を補てんする保険。前年の決算実績が必要。',
    '収量共済': '天候災害などで収量が大きく減ったときに補てんされる共済。米価の下落は対象外。',
    '家計費': '個人経営では生活費を事業のお金から引き出す。農業所得が家計費を下回ると、純資産が年々減っていく。',
    '法人化': '個人経営を会社にすること。役員報酬を経費にでき、所得が大きいと税金が有利になることがある。赤字を翌年以降に繰り越せる。',
    '欠損金の繰越': '法人の赤字を翌年以降の黒字と相殺できる仕組み。赤字の翌年は税金が少なくなる。',
    '規模の経済': '規模が大きくなるほど1haあたりの機械費・固定費が下がり、生産費が安くなること。ただし労働力や管理の限界もある。',
    '農地集積': '離農する人などから農地を引き受けて経営規模を広げること。地域の信頼があると良い話が来やすい。',
    '時間当たり所得': '農業所得を家族の労働時間で割ったもの。家族の働きに対する「時給」。地域の賃金と比べて、労働に見合っているかを判断する。',
    '機会費用': 'ある選択をしたことで得られなくなった利益。家族が農業で働く時間は、外で働けば得られた賃金の分だけ「見えない費用」がかかっている。',
    '地域の信頼': '地域の農家や地主からの信頼。農地の貸し借りの話や、良い条件の取引の話が来やすくなる。',
    '技術力': '栽培の腕前。経験とともに上がり、収量・品質・作業効率に効く。研修でも高められる。',
    '作期分散': '早生・中生・晩生の品種を組み合わせて、田植えや稲刈りの時期をずらすこと。作業が一度に集中しないので、同じ機械と人手でより広い面積をこなせる。天候リスクの分散にもなる。',
    '早晩性': '品種ごとの収穫時期の早さ。早生（わせ）は早く、晩生（おくて）は遅く収穫できる。中生（なかて）はその中間。',
    '年タイプ': 'その年の気象の傾向（平年・猛暑年・冷夏・多雨年・台風年・豊作年）。年タイプによって猛暑や台風などの気象イベントの起きやすさと重さが変わる。',
    '有効積算温度': '日平均気温から10℃を引いた値を毎日足し合わせたもの。稲はこれが一定に達すると実る。猛暑年は早く達して収穫が早まり、冷夏は遅れる。',
    '刈り遅れ': '刈り取りの適期を過ぎてから刈ること。胴割れ米や穂発芽が増え、品質（等級）が下がる。同じ時期に実る品種が多すぎると、機械が追いつかず起きやすい。',
    '等級': '米の検査で見た目の品質（整粒・白未熟粒・胴割れなど）から付けられる格付け。1等・2等・3等・規格外があり、等級が下がると販売単価が下がる。食味の良し悪しとは別。',
    '機械の寿命': '機械は使い続けると、いずれ修理しても使えなくなる。ゲームではトラクタ・乾燥施設は約20年、コンバイン・田植機は約15年で使えなくなり、買い替えか委託が必要になる。同じ時期に買った機械は、同じ時期に寿命が来る。',
    '経営継承': '経営を次の世代に引き継ぐこと。後継者がいないと、経営主が働けなくなったときに経営をやめることになる。引き継ぐには、後継者が一緒に働きながら技術や取引先を覚えておくことが大切。',
    '生産費': '米を作るのにかかった費用。10aあたり・60kgあたりで比べる。家族労働費を含めた「全算入生産費」で見ると、本当にもうかっているかが分かる。',
  };

  // 毎年の「経営のヒント」
  D.TIPS = [
    '米の売上は秋に集中しますが、肥料・燃料・人件費は春から出ていきます。春〜夏の資金残高に注目しましょう。',
    '機械は「買う・リース・委託」の3択です。年間何ha使うかで、どれが一番安いかが変わります。',
    '減価償却費は現金が出ていかない費用です。「利益＋減価償却費」が借金返済に使えるお金の目安になります。',
    '規模を広げると1haあたりの固定費は下がりますが、労働力が追いつかないと収量・品質が落ちます。',
    '契約栽培は売り先と数量を確保できますが、価格はその年の需給で決まります。値下がりへの備えには収入保険も組み合わせましょう。契約数量は見込み収量の7〜8割までが安心です。',
    '直販は単価が高い分、手間と経費もかかります。農協出荷と「1俵あたりの手取り」で比べましょう。',
    '1年だけの高値・豊作を前提に大きな投資をすると、翌年以降に苦しくなります。平年の数字で計画を立てましょう。',
    '借地を増やすと地代は増えますが、機械の稼働率が上がれば1haあたりのコストは下がります。',
    '飼料用米の交付金は政策で変わることがあります。収入を一つの制度に頼りすぎないようにしましょう。',
    '家族の労働時間あたりの所得（時給）が地域の賃金を下回っていないか、確認してみましょう。',
    '直播を取り入れると、春の作業ピークを大きく下げられます。規模拡大の切り札になります。',
    '収入保険は米価下落にも対応します。借入が多い時期ほど、収入の下ぶれへの備えが大切です。',
    '設備投資の前に「この投資で毎年いくら得をするか」「何年で回収できるか」を計算してみましょう。',
    '地域の共同作業に参加すると、地域の信頼が上がり、良い農地の話が来やすくなります。',
    '古い機械は修理費がかさみ、収穫期に故障すると大きな損失になります。更新のタイミングを計画しましょう。',
    '猛暑の年が増えています。新之助やにじのきらめきなど高温に強い品種や、作期の分散でリスクを減らしましょう。',
    '早生・中生・晩生を組み合わせると稲刈りが分散し、同じコンバインでより広い面積を刈れます。',
    'ブランド力は一朝一夕には育ちません。毎年少しずつ投資して、品質の良い米を届け続けることが大切です。',
    '法人化すると、役員報酬を経費にできたり、赤字を繰り越せたりします。所得が大きくなったら検討しましょう。',
  ];
})(window.RG = window.RG || {});
