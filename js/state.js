// ゲーム状態の生成・年の切り替え・セーブ/ロード
(function (RG) {
  'use strict';
  const D = RG.data, U = RG.util;
  const S = RG.state = {};

  S.VERSION = 1;

  S.makePlot = function (st, spec) {
    const soil = D.SOILS[spec.soil];
    const place = spec.place || D.PLACES[(st.nextId * 7) % D.PLACES.length];
    const id = U.uid(st, 'f');
    return {
      id, name: spec.name || place + id.slice(1) + '号',
      area: spec.area, soil: spec.soil, yieldMult: soil.yieldMult, laborMult: soil.laborMult,
      owned: !!spec.owned, rent: spec.owned ? 0 : (spec.rent != null ? spec.rent : 10000),
      landValue: spec.owned ? (spec.landValue || spec.area * 10 * D.LAND_VALUE[spec.soil]) : 0,
    };
  };

  // ---------- 作付計画（品種ごとの面積） ----------
  S.totalArea = (st) => U.sum(st.fields, (f) => f.area);
  S.plannedArea = (st) => U.sum(st.plan, (r) => r.area);
  S.makeRow = (st, crop, cult, sow, area) => ({ id: U.uid(st, 'r'), crop, cult: cult || 'conv', sow: sow || 'transplant', plant: 0, area: U.round(area || 0, 1) });

  // 新しく増えた田は、いちばん面積の大きい作付に足す
  S.addPlanArea = function (st, area) {
    const main = st.plan.filter((r) => r.crop !== 'none').sort((a, b) => b.area - a.area)[0];
    if (main) main.area = U.round(main.area + area, 1);
    else st.plan.push(S.makeRow(st, 'koshiBL', 'conv', 'transplant', area));
  };

  // 田が減ったときは、後ろの作付から削って経営面積に収める
  S.fitPlan = function (st) {
    let over = U.round(S.plannedArea(st) - S.totalArea(st), 1);
    for (let i = st.plan.length - 1; i >= 0 && over > 0; i--) {
      const cut = Math.min(st.plan[i].area, over);
      st.plan[i].area = U.round(st.plan[i].area - cut, 1);
      over = U.round(over - cut, 1);
    }
  };

  S.makeMachine = function (st, modelId, opts) {
    opts = opts || {};
    const md = D.MODELS[modelId];
    const cost = opts.cost !== undefined ? opts.cost : md.price;
    const age = opts.age || 0;
    const life = opts.life || md.life;
    const book = opts.book !== undefined ? opts.book : cost;
    return {
      id: U.uid(st, 'm'), model: modelId, age, cost, book, life,
      lease: !!opts.lease, leaseFee: opts.lease ? Math.round(md.price * D.MACHINE.leaseRate) : 0,
      leaseYearsLeft: opts.lease ? D.MACHINE.leaseYears : 0, used: !!opts.used,
    };
  };

  S.newGame = function (opts) {
    const sc = opts.scenarioId === 'custom' ? S.buildCustom(opts.custom) : D.SCENARIOS[opts.scenarioId];
    const st = {
      version: S.VERSION, seed: opts.seed, scenarioId: opts.scenarioId, farmName: opts.farmName || '稲穂ファーム',
      // mode：'story'＝ストーリー（20年・章と依頼と試練）、'endless'＝自分の経営（区切りなく続けられる）
      mode: S.modeOf(opts), year: 1, maxYear: sc.maxYear || D.MAX_YEAR, phase: 'event', nextId: 1, midterms: [], items: { omamori: 1, reroll: 1 },
      storePlan: 0, stock: null, wearV2: true, directV2: true, shops: {}, biz: { harvest: 0, drone: 0, proc: 0, droneLicense: false },
      titles: {}, stats: { sixes: 0, omamori: 0, gambles: 0, guards: 0, typhoonWin: 0, counted: 0 }, rivalLand: [],
      corp: !!sc.corp, cash: sc.cash, yearStartCash: sc.cash, ledger: [], receivables: [],
      taxPayable: 0, taxPayMonth: 3, lossCarry: 0, emergency: 0,
      fields: [], plan: [], organicHist: [0, 0], machines: [], loans: [],
      family: sc.family.map((f, i) => Object.assign({ id: 'p' + i }, f)),
      staff: [], partTimers: sc.partTimers || 0,
      living: sc.living || 0, execPay: sc.execPay || 0,
      direct: { customers: sc.customers, product: sc.defaultCrop + '|conv', alloc: 0, price5: 2900, marketing: 100000 },
      brand: sc.brand, brandInvest: 0,
      contracts: [], insurance: 'none', shortLoan: 0, jaAdvance: { on: true, auto: true, qty: 0 },
      trust: sc.trust, skill: sc.skill,
      market: { price: D.REF_PRICE, longRun: 16500, matInfl: 1, wageInfl: 1, fertShock: 1, feedSubsidyMult: 1, history: [] },
      offers: { land: [], contracts: [], used: [] },
      events: { queue: [], seen: {} }, news: [], notes: [],
      flags: {}, yearFlags: {},
      grant: sc.grantYears ? { years: sc.grantYears, amount: sc.grantAmount } : null,
      noInterestCap: sc.noInterestCap || 0, noInterestUsed: 0,
      history: [], lastResult: null, negEquityYears: 0, gameOver: null, retired: null,
      custom: opts.scenarioId === 'custom' ? U.clone(opts.custom) : null,
    };
    sc.fields.forEach((f) => { const p = S.makePlot(st, f); if (p.owned && !sc.corp) p.heritage = true; st.fields.push(p); });
    if (sc.plan) sc.plan.forEach((r) => st.plan.push(S.makeRow(st, r.crop, 'conv', 'transplant', r.area)));
    else if (sc.defaultCrop === 'koshiBL' && S.totalArea(st) >= 1) {
      // コシヒカリには出荷の目安（6割）があるので、高橋さんのおすすめは早生のこしいぶきと組み合わせる
      const tot = S.totalArea(st), bl = U.round(tot * 0.6, 1);
      st.plan.push(S.makeRow(st, 'koshiBL', 'conv', 'transplant', bl), S.makeRow(st, 'koshiibuki', 'conv', 'transplant', U.round(tot - bl, 1)));
    } else st.plan.push(S.makeRow(st, sc.defaultCrop, 'conv', 'transplant', S.totalArea(st)));
    sc.machines.forEach((m) => {
      const md = D.MODELS[m.model];
      const book = Math.max(0, md.price - (md.price / md.life) * m.age);
      st.machines.push(S.makeMachine(st, m.model, { age: m.age, book }));
    });
    sc.loans.forEach((l) => st.loans.push({
      id: U.uid(st, 'l'), kind: l.kind, name: l.name, original: l.balance, balance: l.balance,
      rate: l.rate, term: l.yearsLeft, yearsLeft: l.yearsLeft, grace: 0, newThisYear: false,
    }));
    for (let i = 0; i < (sc.staff || 0); i++) S.addStaff(st);
    (sc.contracts || []).forEach((c) => st.contracts.push(Object.assign({ id: U.uid(st, 'c'), refPrice: st.market.price, years: c.yearsLeft }, c)));
    if (RG.scenes) RG.scenes.init(st); // ストーリーごとの初期設定（集落の田んぼ・社員の士気など）
    // 直販は最初は少しだけ
    st.direct.alloc = Math.floor(sc.customers * D.DIRECT.perCustomer * 0.9);
    if (sc.plan && sc.plan.some((r) => D.CROPS[r.crop].unlock)) sc.plan.forEach((r) => { const u = D.CROPS[r.crop].unlock; if (u) st.flags[u] = true; });
    if (RG.rivals) RG.rivals.init(st);
    if (RG.story) RG.story.state(st);
    st.initialEquity = RG.accounting.bs(st).equity;
    // 「今のやり方のまま続けたら」を後で試算するための、始めたときの状態
    st.initialSnapshot = JSON.stringify(st);
    st.playlog = { plans: [], events: [], results: [], notes: [] }; // プレイの記録（試算用の初期状態には入れない）
    st.challenge = RG.challenge && opts.challenge ? RG.challenge.make(opts.challenge) : null; // チャレンジ（しばり）
    // 用意されたシナリオでは、1年目の大事な決めごと（作付・パート・直販・出荷契約金）を空けておき、自分で決めてもらう。
    // 「今のまま続けたら」の試算は、上の初期状態（高橋さんのおすすめの計画）で行う
    if (opts.scenarioId !== 'custom') {
      st.starter = { plan: st.plan.map((r) => ({ crop: r.crop, cult: r.cult, sow: r.sow, area: r.area })), partTimers: st.partTimers, directAlloc: st.direct.alloc };
      st.plan = [];
      st.partTimers = 0;
      st.direct.alloc = 0;
      st.jaAdvance = { on: false, auto: true, qty: 0 };
    }
    S.beginYear(st);
    // ストーリーは、じいちゃんとの会話から始まる
    if (RG.scenes && RG.scenes.isStory(st)) RG.scenes.start(st, 'prologue');
    return st;
  };
  S.modeOf = (opts) => opts.mode || (D.SCENARIOS[opts.scenarioId] && D.SCENARIOS[opts.scenarioId].story ? 'story' : 'endless');

  // 高橋さんのおすすめ（シナリオの標準の計画）をそのまま使う。自動で進める試算・検証でも使う
  S.applyStarter = function (st) {
    if (!st.starter) return;
    st.plan = st.starter.plan.map((r) => S.makeRow(st, r.crop, r.cult, r.sow, r.area));
    st.partTimers = st.starter.partTimers;
    st.partSeason = null;
    st.direct.alloc = st.starter.directAlloc;
    st.jaAdvance = { on: true, auto: true, qty: 0 };
  };

  // 作付の型：面積の割り振りを品種の組み合わせで選ぶ（あとで1行ずつ直せる）
  S.CROP_PRESETS = [
    { id: 'starter', icon: '👨‍🌾', name: '高橋さんのおすすめ', desc: 'この経営に合った、無理のない標準の組み合わせ' },
    { id: 'safe', icon: '🛡️', name: '安定重視', desc: 'コシヒカリBLに早生のこしいぶきを組み合わせ、稲刈りを分散して天気の危険も分ける',
      mix: [['koshiBL', 'conv', 0.6], ['koshiibuki', 'conv', 0.4]] },
    { id: 'quality', icon: '💎', name: '単価重視', desc: '農薬と化学肥料を減らした特別栽培で、高く売れる米を作る。手間と経費は増える',
      mix: [['koshiBL', 'special', 0.6], ['koshiibuki', 'conv', 0.4]] },
    { id: 'volume', icon: '📦', name: '量で勝負', desc: '業務用の多収品種で、とれる量を増やす。単価は低め、天気には強め',
      mix: [['akidawara', 'conv', 0.5], ['niji', 'conv', 0.3], ['koshiBL', 'conv', 0.2]] },
  ];
  S.applyCropPreset = function (st, id) {
    const pr = S.CROP_PRESETS.find((x) => x.id === id);
    if (!pr) return '作付の型が見つかりません';
    if (pr.id === 'starter') {
      if (!st.starter) return 'この経営には、おすすめの型がありません';
      st.plan = st.starter.plan.map((r) => S.makeRow(st, r.crop, r.cult, r.sow, r.area));
      // 始めたときから経営面積が変わっていたら、今の面積に合わせる
      S.fitPlan(st);
      const gap = U.round(S.totalArea(st) - S.plannedArea(st), 1);
      if (gap > 0.05) S.addPlanArea(st, gap);
      return null;
    }
    const total = S.totalArea(st);
    let left = U.round(total, 1);
    st.plan = [];
    // まだ使えない品種は、いちばん多い品種にまとめる
    const mix = pr.mix.filter((m) => !(RG.era && RG.era.cropLocked(st, m[0])));
    const lostShare = U.sum(pr.mix.filter((m) => mix.indexOf(m) < 0), (m) => m[2]);
    if (lostShare > 0 && mix.length) mix[0] = [mix[0][0], mix[0][1], mix[0][2] + lostShare];
    mix.forEach(([crop, cult, share], i) => {
      const area = i === mix.length - 1 ? left : Math.min(left, U.round(total * share, 1));
      if (area > 0.05) st.plan.push(S.makeRow(st, crop, RG.era && RG.era.featLocked(st, cult) ? 'conv' : cult, 'transplant', area));
      left = U.round(left - area, 1);
    });
    return null;
  };

  // ---------- 季節ごとの労働力の配分 ----------
  // 家族・社員の年間の労働時間を、どの季節に何割まわすか（null なら標準の D.SEASON_CAP）
  S.laborShare = (st, s) => (st.laborSplit ? st.laborSplit[s] : D.SEASON_CAP[s]);
  // パートの人数（季節ごとに決めていなければ、どの季節も同じ人数）
  S.partsIn = (st, s) => (st.partSeason ? st.partSeason[s] : st.partTimers);
  const fixSplit = (sp) => {
    // 幅（10〜40%）に収めて、合計を100%にする
    for (let k = 0; k < 10; k++) {
      D.SEASONS.forEach((s) => { sp[s] = U.clamp(sp[s], D.SEASON_SHARE_MIN, D.SEASON_SHARE_MAX); });
      const tot = U.sum(D.SEASONS, (s) => sp[s]);
      if (Math.abs(tot - 1) < 1e-6) break;
      const free = D.SEASONS.filter((s) => (tot > 1 ? sp[s] > D.SEASON_SHARE_MIN + 1e-9 : sp[s] < D.SEASON_SHARE_MAX - 1e-9));
      const fsum = U.sum(free, (s) => sp[s]) || 1;
      free.forEach((s) => { sp[s] -= (tot - 1) * sp[s] / fsum; });
    }
    D.SEASONS.forEach((s) => { sp[s] = U.round(sp[s], 3); });
    return sp;
  };
  // ある季節の割合を delta だけ増やす（ほかの季節から、割合に応じて減らす）
  S.shiftLabor = function (st, s, delta) {
    const sp = Object.assign({}, st.laborSplit || D.SEASON_CAP);
    const want = U.clamp(sp[s] + delta, D.SEASON_SHARE_MIN, D.SEASON_SHARE_MAX);
    const d = want - sp[s];
    if (Math.abs(d) < 1e-6) return d > 0 || delta > 0 ? 'これ以上は増やせません（1つの季節は年間の4割まで）' : 'これ以上は減らせません（1つの季節は年間の1割まで）';
    const others = D.SEASONS.filter((x) => x !== s);
    const room = others.map((x) => (d > 0 ? sp[x] - D.SEASON_SHARE_MIN : D.SEASON_SHARE_MAX - sp[x]));
    const rsum = U.sum(room);
    if (rsum < 1e-6) return 'ほかの季節から回せる時間がありません';
    const dd = Math.sign(d) * Math.min(Math.abs(d), rsum);
    others.forEach((x, i) => { sp[x] -= dd * room[i] / rsum; });
    sp[s] += dd;
    st.laborSplit = fixSplit(sp);
    return null;
  };
  // おまかせ：必要な時間に合わせて配分する（need：季節ごとの必要時間）
  S.autoLaborSplit = function (st, need) {
    const tot = U.sum(D.SEASONS, (s) => need[s]);
    if (tot <= 0) { st.laborSplit = null; return null; }
    const sp = {};
    D.SEASONS.forEach((s) => { sp[s] = need[s] / tot; });
    st.laborSplit = fixSplit(sp);
    return null;
  };
  S.setPartSeason = function (st, s, n) {
    if (!st.partSeason) st.partSeason = { spring: st.partTimers, summer: st.partTimers, autumn: st.partTimers, winter: st.partTimers };
    st.partSeason[s] = U.clamp(Math.round(n), 0, 30);
    st.partTimers = Math.max.apply(null, D.SEASONS.map((x) => st.partSeason[x])); // 募集する人数＝いちばん多い季節の人数
    return null;
  };
  // ---------- パートの人物像 ----------
  // 季節パート：その年に応募してきた人（シードで決まる）。人数ぶん、上から順に来てもらう。機械には乗れない
  S.personOf = function (st, salt, i) {
    const r = RG.rng.make(st.seed, st.year, salt + i);
    const P = D.PART_PEOPLE, note = P.notes[Math.floor(r.next() * P.notes.length)];
    const skill = U.round(U.clamp(note[1] * (0.92 + 0.16 * r.next()), 0.75, 1.3), 2);
    const wage = Math.round(D.LABOR.partWage * (0.92 + 0.12 * r.next() + 0.18 * (skill - 1)) / 10) * 10;
    return { name: P.names[Math.floor(r.next() * P.names.length)] + 'さん', age: 20 + Math.floor(r.next() * 50), note: note[0], skill, wage };
  };
  S.seasonParts = (st, n) => Array.from({ length: Math.max(0, n) }, (_, i) => S.personOf(st, 'spart', i));
  // 常雇用パートの応募者（毎年3人）。1年を通して働き、トラクター・田植機・コンバインにも乗れる
  S.regularCandidates = (st) => [0, 1, 2].map((i) => Object.assign({ id: 'rc' + st.year + '_' + i }, S.personOf(st, 'rpart', i)))
    .filter((c) => !(st.regulars || []).some((x) => x.from === c.id));
  // 機械（トラクター・田植機・コンバイン）に乗れる人：自分（経営主）・就農した後継者・正社員・常雇用パート
  S.operators = (st) => {
    const sc = S.successor(st);
    return (S.operator(st) ? 1 : 0) + (sc && sc !== S.operator(st) && !(Number(sc.age) < 18) ? 1 : 0) + st.staff.length + (st.regulars || []).length;
  };

  // パートを増やす（できごとなど）。季節ごとに決めているときは、どの季節も増やす
  S.addParts = function (st, n) {
    st.partTimers = Math.max(0, st.partTimers + n);
    if (st.partSeason) D.SEASONS.forEach((s) => { st.partSeason[s] = Math.max(0, st.partSeason[s] + n); });
  };

  // ---------- 年齢と働ける時間 ----------
  S.ageFactor = function (age) {
    if (age == null) return 1;
    const A = D.AGING;
    if (age >= A.retire) return 0;
    return age <= A.full ? 1 : Math.max(0, 1 - A.perYear * (age - A.full));
  };
  S.effHours = (m) => m.hours * S.ageFactor(m.age);
  S.operator = (st) => st.family.find((f) => f.tag === 'operator') || st.family[0];
  S.successor = (st) => st.family.find((f) => f.tag === 'successor');

  // ---------- 「自分の経営で始める」の入力から農場を作る ----------
  const SIZE_MODEL = {
    tractor: { s: 'tr_s', m: 'tr_m', l: 'tr_l' }, nursery: { s: 'ns_s', m: 'ns_m', l: 'ns_l' }, planter: { s: 'pl_s', m: 'pl_m', l: 'pl_l' },
    combine: { s: 'cb_s', m: 'cb_m', l: 'cb_l' }, dryer: { s: 'dr_s', m: 'dr_m', l: 'dr_l' },
  };
  S.SIZE_MODEL = SIZE_MODEL;
  S.defaultCustom = () => ({
    corp: false, age: 60, exp: 30, successor: 'none', succAge: 30, succYear: 5,
    family: [{ rel: '配偶者', age: 58, work: 'half' }],
    staff: 0, parts: 1,
    owned: 5, rented: 5, rent: 10000, poorPct: 20,
    crops: [{ crop: 'koshiBL', pct: 70 }, { crop: 'koshiibuki', pct: 30 }],
    machines: { tractor: { size: 'm', age: 12 }, nursery: { size: 's', age: 15 }, planter: { size: 'm', age: 10 }, combine: { size: 'm', age: 12 }, dryer: { size: 'm', age: 15 } },
    cash: 5000000, debt: 2000000, debtYears: 5, living: 3000000, execPay: 4000000, customers: 30,
  });
  // 入力欄の値を数に直す（空欄・文字列でも壊れないように。0 は有効な値として扱う）
  const numOr = (v, def) => (v === '' || v == null || !isFinite(+v) ? def : +v);
  S.numOr = numOr;
  S.buildCustom = function (c) {
    const owned = Math.max(0, numOr(c.owned, 0)), rented = Math.max(0, numOr(c.rented, 0));
    const rent = Math.max(0, numOr(c.rent, 10000));
    const fields = [];
    let poorLeft = U.round((owned + rented) * U.clamp(numOr(c.poorPct, 0), 0, 100) / 100, 1);
    // 田を最大2haずつに分ける。条件不利の田は指定した割合ぴったりになるように区画を分ける
    const split = (area, isOwned) => {
      let left = U.round(area, 1);
      while (left > 0.05) {
        let a = Math.min(left, 2);
        let soil = 'normal';
        if (poorLeft > 0.05) { soil = 'poor'; a = Math.min(a, poorLeft); poorLeft = U.round(poorLeft - a, 1); }
        a = U.round(a, 1);
        fields.push({ area: a, soil, owned: isOwned, rent: soil === 'poor' ? Math.round(rent * 0.6) : rent, landValue: a * 10 * (soil === 'poor' ? D.LAND_VALUE.poor : 700000) });
        left = U.round(left - a, 1);
      }
    };
    // 合計を先に丸め、借地は「合計 − 所有」にして、入力より増えないようにする
    const ownedR = U.round(owned, 1), rentedR = Math.max(0, U.round(U.round(owned + rented, 1) - ownedR, 1));
    split(ownedR, true);
    split(rentedR, false);
    const total = U.round(U.sum(fields, (f) => f.area), 1) || 0.1;
    const machines = [];
    Object.keys(SIZE_MODEL).forEach((t) => {
      const m = c.machines[t];
      if (!m || !m.size || m.size === 'none') return;
      const n = U.clamp(Math.round(numOr(m.count, 1)), 1, 10);
      // 寿命の年数に届いている機械も、1年目は使えるようにする（寿命の1年前にそろえる）
      const model = SIZE_MODEL[t][m.size], lim = (D.MODELS[model].maxAge || 41) - 1;
      for (let i = 0; i < n; i++) machines.push({ model, age: U.clamp(Math.round(numOr(m.age, 0)), 0, Math.min(40, lim)) });
    });
    const family = [{ name: 'あなた', role: c.corp ? '代表' : '経営主', hours: 2000, age: Math.round(numOr(c.age, 60)), tag: 'operator' }];
    (c.family || []).forEach((f) => family.push({ name: f.rel || '家族', role: '家族（' + D.WORK_STYLES[f.work].name + '）', hours: D.WORK_STYLES[f.work].hours, age: Math.round(numOr(f.age, 60)) }));
    if (c.successor === 'now') family.push({ name: '後継者', role: '後継者', hours: 1800, age: Math.round(numOr(c.succAge, 30)), tag: 'successor' });
    const pctSum = U.sum(c.crops, (x) => Math.max(0, numOr(x.pct, 0))) || 1;
    const plan = c.crops.filter((x) => numOr(x.pct, 0) > 0).map((x) => ({ crop: x.crop, area: U.round(total * numOr(x.pct, 0) / pctSum, 1) }));
    if (plan.length) plan[0].area = U.round(total - U.sum(plan.slice(1), (x) => x.area), 1);
    const exp = U.clamp(numOr(c.exp, 0), 0, 60);
    const customers = Math.max(0, Math.round(numOr(c.customers, 0)));
    return {
      name: '自分の経営', corp: !!c.corp, cash: Math.max(0, numOr(c.cash, 0)), living: Math.max(D.FIN.livingMin, numOr(c.living, 0)), execPay: Math.max(D.FIN.livingMin, numOr(c.execPay, 0)),
      trust: Math.min(80, 30 + exp), skill: Math.min(1.02, 0.92 + exp * 0.003), customers, brand: customers > 0 ? 5 : 0,
      fields, machines, family, staff: Math.max(0, Math.round(numOr(c.staff, 0))), partTimers: Math.max(0, Math.round(numOr(c.parts, 0))),
      loans: numOr(c.debt, 0) > 0 ? [{ kind: 'long', name: 'これまでの借入金', balance: numOr(c.debt, 0), rate: 0.015, yearsLeft: Math.max(1, Math.round(numOr(c.debtYears, 5))) }] : [],
      defaultCrop: plan.length ? plan[0].crop : 'koshiBL', plan,
    };
  };

  // ---------- 後継者と引退 ----------
  // まだ就農していない「就農予定」の後継者（自分の経営で入力した場合）
  S.pendingSuccessor = function (st) {
    const c = st.custom;
    if (!c || c.successor !== 'plan' || st.events.seen.successor_join || S.successor(st)) return null;
    const yrs = Math.round(numOr(c.succYear, 1));
    return { name: '後継者', joinYear: 1 + yrs, ageNow: Math.round(numOr(c.succAge, 30)) + (st.year - 1) };
  };
  // ageOffset：決算の後（家族が1歳とった後）に加えるときは 1
  S.addPlannedSuccessor = function (st, ageOffset) {
    const c = st.custom;
    st.family.push({ id: 'p' + st.family.length, name: '後継者', role: '後継者', hours: 1800, age: Math.round(numOr(c.succAge, 30)) + (st.year - 1) + (ageOffset || 0), tag: 'successor' });
    st.events.seen.successor_join = st.year;
    if (st.corp) st.execPay += 600000; else st.living += 600000;
  };
  // 経営主が引退するとき（80歳になる年の決算）に引き継げる後継者。いなければ null
  S.heirAtRetire = function (st) {
    const op = S.operator(st);
    if (!op || op.age == null) return null;
    // 引退は80歳になる年の決算。そのとき後継者も1歳とっている
    const toJudge = Math.max(0, D.AGING.retire - 1 - Number(op.age)) + 1;
    const sc = S.successor(st);
    if (sc) return Number(sc.age) + toJudge >= 20 ? { name: sc.name, age: Number(sc.age) + toJudge } : null;
    const p = S.pendingSuccessor(st);
    if (p) return p.ageNow + toJudge >= 20 ? { name: p.name, age: p.ageNow + toJudge, planned: true } : null;
    return null;
  };

  S.addStaff = function (st) {
    // 今いる社員と同じ名前にならないようにする
    const used = new Set(st.staff.map((s) => s.name)), names = D.STAFF_NAMES.map((n) => n + 'さん');
    const name = names.find((n) => !used.has(n)) || names[st.staff.length % names.length];
    st.staff.push({ id: U.uid(st, 's'), name, years: 0, salary: D.LABOR.staffSalary * st.market.wageInfl });
  };

  // 年の始まり：世界・オファー・イベントを用意
  S.beginYear = function (st) {
    st.world = RG.market.genWorld(st);
    st.yearStartCash = st.cash;
    st.yearStartBS = RG.accounting.bs(st);
    st.ledger = [];
    st.yearFlags = {};
    // 寿命を迎えた機械は使えなくなる（簿価が残っていれば除却損）
    st.scrapped = [];
    st.machines = st.machines.filter((m) => {
      const md = D.MODELS[m.model];
      if (m.lease || !md.maxAge || m.age < md.maxAge) return true;
      S.addLedger(st, { amount: 0, cat: 'assetSale', label: md.name + '（' + m.age + '年使用）が寿命で使えなくなった', gain: -m.book });
      st.scrapped.push(m.model);
      return false;
    });
    st.offers = RG.events.genOffers(st);
    st.events.queue = RG.events.genEvents(st);
    st.news = RG.events.genNews(st);
    S.updateLiving(st);
    RG.events.updateSeibi(st); // 整備した田の収量が戻っていく
    st.notes = [];
    st.seasonMonth = 0;
    if (RG.dice) RG.dice.startYear(st);
    if (RG.story) RG.story.beginYear(st);
    if (RG.chapters) RG.chapters.beginYear(st);
    if (RG.era) RG.era.beginYear(st);
    if (RG.scenes) RG.scenes.beginYear(st);
    RG.events.splitSeason(st); // 計画に関わらないできごとは、シーズン中の月に回す
    st.phase = RG.chapters && RG.chapters.needsDoor(st) ? 'chapter' : RG.dice && RG.dice.active(st) ? 'dice' : st.events.queue.length ? 'event' : 'plan';
    // 章の節目には、じいちゃんとの会話の場面が先に入る
    const scene = RG.scenes && RG.scenes.due(st);
    if (scene) RG.scenes.start(st, scene);
  };

  // 暮らしにかかるお金：もうけが続くと家計費（法人は役員報酬）の下限が上がり、赤字が続くと切り詰めて元に近づく
  S.livingNeed = (st) => st.livingNeed || D.FIN.livingMin;
  S.updateLiving = function (st) {
    if (st.livingBase == null) { st.livingBase = st.corp ? st.execPay : st.living; st.livingNeed = Math.max(D.FIN.livingMin, Math.min(st.livingBase, D.FIN.livingCap)); }
    const hs = (st.history || []).slice(-3);
    if (st.year < 3 || hs.length < 3) return;
    const avg = U.avg(hs.map((h) => h.income)), cur = st.corp ? st.execPay : st.living, F = D.FIN;
    let d = 0;
    if (avg > cur * F.livingUp && cur < F.livingCap) d = Math.min(F.livingStep, F.livingCap - cur);
    // 苦しくなったら、すぐに切り詰める（去年の所得が今の家計費を下回ったら、増えた分を2年ぶんずつ戻す）
    else if (hs[hs.length - 1].income < cur && st.livingNeed > Math.max(F.livingMin, Math.min(st.livingBase, F.livingCap))) d = -Math.min(F.livingStep * 2, st.livingNeed - Math.max(F.livingMin, Math.min(st.livingBase, F.livingCap)));
    if (!d) return;
    st.livingNeed += d;
    if (st.corp) st.execPay = Math.max(F.livingMin, st.execPay + d); else st.living = Math.max(0, st.living + d);
    st.news.unshift(d > 0
      ? { kind: 'event', text: '🏠 もうけが続いて、暮らしにもお金がかかるようになった（家の修繕・車の買い替え・つきあいなど）。' + (st.corp ? '役員報酬' : '家計費') + 'が年 ' + U.man(cur + d) + ' に（+' + U.man(d) + '）。' }
      : { kind: 'event', text: '🏠 もうけが減ったので、暮らしを切り詰めた。' + (st.corp ? '役員報酬' : '家計費') + 'が年 ' + U.man(cur + d) + ' に（−' + U.man(-d) + '）。' });
  };

  S.nextYear = function (st) {
    if (st.gameOver) { st.phase = 'gameover'; return; }
    if (st.retired) { st.phase = 'end'; return; }
    st.year += 1;
    // 自分の経営モードは区切りなく続く（中間評価と見立ての期間を10年ずつ延ばす）
    if (st.year > st.maxYear && st.mode === 'endless') st.maxYear += 10;
    if (st.year > st.maxYear) { st.year = st.maxYear; st.phase = 'end'; return; }
    if (RG.sim && st.shortLoan > 0) st.shortLoan = Math.min(st.shortLoan, RG.sim.shortLoanLimit(st)); // 前年の売上が減ると、運転資金の上限も下がる
    S.beginYear(st);
  };

  // 計画フェーズ中の現金の動き（1〜2月に実行したものとして資金繰りに入る）
  S.addLedger = function (st, item) {
    const it = Object.assign({ month: st.ledgerMonth || 2 }, item); // シーズン中のできごとは、その月のお金の動きにする
    st.ledger.push(it);
    st.cash += it.amount;
    return it;
  };

  // ---------- セーブ/ロード ----------
  const KEY = 'inasaku.';
  function storage() {
    try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; }
  }
  S.save = function (slot, st) {
    const ls = storage();
    if (!ls) return false;
    try {
      ls.setItem(KEY + slot, JSON.stringify(st));
      ls.setItem(KEY + slot + '.meta', JSON.stringify({ farmName: st.farmName, year: st.year, phase: st.phase,
        scenario: D.SCENARIOS[st.scenarioId].name, savedAt: new Date().toISOString() }));
      return true;
    } catch (e) { return false; }
  };
  S.load = function (slot) {
    const ls = storage();
    if (!ls) return null;
    try {
      const s = ls.getItem(KEY + slot);
      return s ? S.fromJSON(s) : null;
    } catch (e) { return null; }
  };
  S.meta = function (slot) {
    const ls = storage();
    if (!ls) return null;
    try { const s = ls.getItem(KEY + slot + '.meta'); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  };
  S.remove = function (slot) {
    const ls = storage();
    if (!ls) return;
    try { ls.removeItem(KEY + slot); ls.removeItem(KEY + slot + '.meta'); } catch (e) { /* 無視 */ }
  };
  // JSON に保存できない関数を復元する
  S.hydrate = function (st) {
    // 「計算できない（無限大）」はセーブすると null になるので戻す
    const inf = (o, keys) => { if (o) keys.forEach((k) => { if (o[k] === null) o[k] = Infinity; }); };
    if (st.lastResult) inf(st.lastResult.analysis, ['repayYears', 'bepArea', 'bepAreaLiving', 'bepPrice', 'bepPriceLiving']);
    (st.history || []).forEach((x) => inf(x, ['bepArea']));
    if (!st.midterms) st.midterms = [];
    // モードがなかった古いセーブ：自分の経営はエンドレス、用意されたシナリオはそれまでどおり20年（章あり）
    if (!st.mode) st.mode = st.scenarioId === 'custom' ? 'endless' : 'story';
    if (RG.chapters) RG.chapters.state(st);
    // 田んぼに出なくなったじいちゃんは、働き手（家族）から外す（前の版のセーブ）
    if (st.scenarioId === 'story' && (st.year >= 11 || (st.flags || {}).jiichanIll)) st.family = st.family.filter((f) => f.tag !== 'grandpa');
    // 直販の参考価格を実際に近づけた（米価×0.147→×0.17）前のセーブ：決めていた値段も同じ割合で上げる
    if (!st.directV2) { st.directV2 = true; if (st.direct && st.direct.price5) st.direct.price5 = Math.round(st.direct.price5 * 0.17 / 0.147 / 50) * 50; }
    // 棚田の区長の名前を「森さん」から「中山さん」に変えた（前の版のセーブの田の名前も合わせる）
    (st.fields || []).forEach((f) => { if (f.name === '森さんの田') f.name = '中山さんの田'; });
    if (!st.wearV2) {
      st.wearV2 = true;
      (st.machines || []).forEach((m) => { const md = D.MODELS[m.model]; if (md && md.maxAge && !m.lease && m.age > md.maxAge - 2) m.age = Math.max(0, md.maxAge - 2); });
    }
    // 作業が増えた（春の準備）前のセーブ：決算の作業の表に、ない作業を0で足す
    [st.lastResult].concat(st.history || []).forEach((r) => {
      const ops = r && r.labor && r.labor.ops;
      if (ops) D.OP_ORDER.forEach((k) => { if (!ops[k]) ops[k] = { name: D.OPS[k].name, hours: 0, contractArea: 0, undone: 0, fee: 0, season: D.OPS[k].season, mtype: D.OPS[k].mtype }; });
    });
    if (!st.items) st.items = { omamori: 1, reroll: 1 };
    st.storePlan = 0; // 「米を保管して春に売る」はなくした
    if (st.stock === undefined) st.stock = null;
    if (!st.biz) st.biz = { harvest: 0, drone: 0, proc: 0, droneLicense: false };
    if (!st.titles) st.titles = {};
    if (!st.stats) st.stats = { sixes: 0, omamori: 0, gambles: 0, guards: 0, typhoonWin: 0, counted: 0 };
    if (RG.rivals) RG.rivals.fill(st);
    if (RG.story) RG.story.state(st);
    // 田んぼ1枚ごとの作付だった古いセーブを、品種ごとの作付に変換する
    if (!st.plan) {
      const rows = {};
      st.fields.forEach((f) => {
        const k = (f.crop || 'hikari') + '|' + (f.cult || 'conv') + '|' + (f.sow || 'transplant');
        rows[k] = (rows[k] || 0) + f.area;
      });
      st.plan = Object.keys(rows).filter((k) => !k.startsWith('none|')).map((k) => { const p = k.split('|'); return S.makeRow(st, p[0], p[1], p[2], rows[k]); });
      const org = U.sum(st.fields.filter((f) => f.cult === 'organic' && f.crop !== 'none'), (f) => f.area);
      const cert = U.sum(st.fields.filter((f) => f.cult === 'organic' && f.crop !== 'none' && f.organicYears >= 2), (f) => f.area);
      st.organicHist = [org, cert];
      st.fields.forEach((f) => { delete f.crop; delete f.cult; delete f.sow; delete f.organicYears; });
    }
    // 以前の品種名を新潟の品種に置き換える
    const ren = (k) => D.CROP_RENAME[k] || k;
    st.plan.forEach((x) => { x.crop = ren(x.crop); });
    st.contracts.forEach((x) => { x.crop = ren(x.crop); });
    st.offers.contracts.forEach((x) => { x.crop = ren(x.crop); });
    // 価格を固定していた古い契約は、契約時の価格を目安にした上乗せ率に置き換える
    st.contracts.concat(st.offers.contracts).forEach((x) => {
      if (x.premium == null) {
        x.premium = U.round(x.price / (st.market.price * D.CROPS[x.crop].priceCoef), 2);
        x.refPrice = x.price;
        delete x.price;
      }
    });
    const dp = st.direct.product.split('|');
    st.direct.product = ren(dp[0]) + '|' + dp[1];
    if (st.flags.natsu) st.flags.shinnosuke = true;
    // 栽培モデルを新しくする前のセーブ：米価をコシヒカリ基準に直し、今年の気象を引き直す
    if (st.world && !st.world.yearType) {
      st.market.price = Math.round(st.market.price * 1.1);
      st.market.longRun = Math.round(st.market.longRun * 1.1);
      st.world = RG.market.genWorld(st);
    }
    // 米価が動いた理由（需給）を持たない古いセーブ：同じシードで今年の世界を作り直して理由を付ける（値は変わらない）
    if (st.world && st.world.marketReason == null) {
      const w = RG.market.genWorld(st);
      st.world.marketReason = w.marketReason;
      st.world.priceChange = st.world.price / st.market.price - 1;
    }
    const r = st.lastResult;
    if (r && r.pl && r.rec) r.pl.get = (k) => r.rec[k] || 0;
    return st;
  };
  S.fromJSON = function (text) {
    const st = JSON.parse(text);
    if (!st || st.version !== S.VERSION || !st.fields) throw new Error('セーブデータの形式が違います');
    S.hydrate(st);
    return st;
  };
})(window.RG = window.RG || {});
