// 年次シミュレーション（DOM 非依存）。
// simulate() は状態を変更せず結果だけを返す（計画プレビューにも使う）。apply() が結果を状態に反映する。
(function (RG) {
  'use strict';
  const D = RG.data, U = RG.util, ACC = RG.accounting, AG = RG.agro;
  const SIM = RG.sim = {};

  const MONTHLY = {};
  for (let m = 1; m <= 12; m++) MONTHLY[m] = 1 / 12;

  SIM.productKey = (crop, ck) => crop + '|' + (crop === 'feed' ? 'conv' : ck);
  SIM.productLabel = (key) => {
    const [c, k] = key.split('|');
    if (!D.CROPS[c]) return key;
    if (c === 'feed') return D.CROPS.feed.name;
    return D.CROPS[c].name + '・' + D.CULT_KEYS[k].short;
  };
  SIM.tier = (ck) => D.CULT_KEYS[ck].tier;
  SIM.group = (crop) => D.CROPS[crop].group || crop;
  // 契約栽培の価格：その年の農協価格（米の需給で決まる）× 上乗せ率
  SIM.contractPrice = (c, price) => Math.round((price * D.CROPS[c.crop].priceCoef * c.premium) / 10) * 10;

  // 作付計画を計算の単位に分ける。田んぼの条件は経営全体の平均を使い、
  // 有機は「2年続けて有機だった面積」までが有機認証、残りは転換期間中になる
  SIM.planUnits = function (st) {
    const total = U.sum(st.fields, (f) => f.area) || 1;
    const avg = (k) => U.sum(st.fields, (f) => f.area * f[k]) / total;
    const yieldMult = avg('yieldMult'), laborMult = avg('laborMult');
    const rows = st.plan.filter((r) => r.crop !== 'none' && r.area > 0.001);
    const hist = st.organicHist || [0, 0];
    const orgArea = U.sum(rows.filter((r) => r.cult === 'organic'), (r) => r.area);
    const certRatio = orgArea > 0 ? Math.min(orgArea, hist[0] || 0, hist[1] || 0) / orgArea : 0;
    const units = [];
    rows.forEach((r) => {
      const base = { rowId: r.id, crop: r.crop, cult: r.cult, sow: r.sow, plant: r.plant || 0, yieldMult, laborMult };
      if (r.cult === 'organic') {
        if (certRatio > 0) units.push(Object.assign({}, base, { id: r.id + 'c', area: r.area * certRatio, ck: 'organic', cert: true }));
        if (certRatio < 1) units.push(Object.assign({}, base, { id: r.id + 't', area: r.area * (1 - certRatio), ck: 'organicT', cert: false }));
      } else units.push(Object.assign({}, base, { id: r.id, area: r.area, ck: r.cult }));
    });
    return units;
  };
  SIM.unitLabel = (u) => D.CROPS[u.crop].name + '・' + (u.crop === 'feed' ? '' : D.CULT_KEYS[u.ck].short + '・') + D.SOWS[u.sow].short;
  // 有機の転換状況（UI表示用）
  SIM.organicStatus = function (st) {
    const units = SIM.planUnits(st).filter((u) => u.cult === 'organic');
    return { cert: U.sum(units.filter((u) => u.cert), (u) => u.area), trans: U.sum(units.filter((u) => !u.cert), (u) => u.area) };
  };
  SIM.machinesOf = (st, type) => st.machines.filter((m) => D.MODELS[m.model].type === type);
  SIM.hasType = (st, type) => SIM.machinesOf(st, type).length > 0;

  // 機械の売却額（下取り価格）：中古の相場の85%。補助で買った機械は7年以内に売ると補助の分（半額）を返す
  SIM.marketValue = (m) => {
    const md = D.MODELS[m.model];
    const v = Math.max(md.price * 0.05, md.price * 0.8 * Math.pow(0.88, m.age)) * 0.85 * (m.subsidized && m.age < 7 ? 0.5 : 1);
    return Math.round(v / 10000) * 10000;
  };
  SIM.repairCost = (m, infl) => (m.lease ? 0 : D.MODELS[m.model].price * Math.min(0.045, 0.006 + 0.0025 * m.age) * (infl || 1));
  SIM.breakdownProb = (m) => (m.lease ? 0.02 : 0.03 + 0.02 * Math.max(0, m.age - 6));
  SIM.depreciation = (m) => (m.lease ? 0 : Math.min(m.book, m.cost / m.life));

  SIM.avgIncome = function (st, n) {
    const h = st.history.slice(-n);
    return h.length ? U.avg(h.map((x) => x.income)) : 0;
  };

  // 資金ショート時に自動で借りられる上限（これを超えると経営破綻）
  SIM.creditLimit = function (st) {
    const bs = ACC.bs(st);
    const last = st.history.length ? st.history[st.history.length - 1].sales : 0;
    return 2000000 + 0.3 * bs.land + 0.2 * bs.machines + 0.15 * last + (st.corp ? 0.1 * Math.max(0, bs.equity) : 0);
  };

  // 長期資金の借入可能額
  SIM.loanCapacity = function (st) {
    const bs = ACC.bs(st);
    if (bs.equity < 0) return 0;
    const cap = 5000000 + 0.7 * bs.land + 0.6 * bs.machines + 4 * Math.max(0, SIM.avgIncome(st, 3)) +
      (st.corp ? 0.3 * Math.max(0, bs.equity) : 0);
    const used = U.sum(st.loans.filter((l) => l.kind === 'long'), (l) => l.balance);
    return Math.max(0, Math.floor((cap - used) / 100000) * 100000);
  };

  SIM.noInterestAvailable = function (st) {
    if (!st.noInterestCap || st.year > 5) return 0;
    return Math.max(0, st.noInterestCap - st.noInterestUsed);
  };

  // 地域の受託組織・近所の農家が引き受けられる作業面積（作業ごと）
  SIM.contractCap = (st) => D.CONTRACT_CAP.base + st.trust * D.CONTRACT_CAP.perTrust;

  // 出荷契約金（前渡金）の単価：その年の予想米価の約半分（1,000円単位）
  SIM.advanceUnit = (st) => U.clamp(Math.round((st.world.forecast * D.SALES.advanceRate) / 1000) * 1000, D.SALES.advanceMin, D.SALES.advanceMax);
  // 農協への出荷見込み（平年単収で計算。契約栽培と直販に回す分を除く）
  SIM.expectedJA = function (st) {
    const units = SIM.planUnits(st).filter((u) => D.CROPS[u.crop].market);
    const bales = U.sum(units, (u) => (D.CROPS[u.crop].by * u.yieldMult * D.CULTS[u.cult].yield * D.SOWS[u.sow].yield * u.area * 10) / 60);
    return Math.max(0, bales - U.sum(st.contracts, (c) => c.volume) - SIM.directPlanned(st) - (RG.biz ? RG.biz.procPlanned(st) + RG.biz.storePlanned(st) : 0));
  };
  // 直販に回す見込み量：入力値を、その商品の平年作での量で頭打ちにする（作付していなければ0）
  SIM.directPlanned = function (st) {
    const key = st.direct.product;
    const units = SIM.planUnits(st).filter((u) => SIM.productKey(u.crop, u.ck) === key && D.CROPS[u.crop].directCoef);
    const bales = U.sum(units, (u) => (D.CROPS[u.crop].by * u.yieldMult * D.CULTS[u.cult].yield * D.SOWS[u.sow].yield * u.area * 10) / 60);
    return Math.max(0, Math.min(st.direct.alloc, bales));
  };
  SIM.advanceQty = function (st) {
    const a = st.jaAdvance;
    if (!a || !a.on) return 0;
    return a.auto ? Math.floor(SIM.expectedJA(st) * D.SALES.advanceAutoShare / 10) * 10 : Math.max(0, Math.min(Math.round(a.qty || 0), Math.floor(SIM.expectedJA(st))));
  };

  SIM.shortLoanLimit = function (st) {
    const last = st.history.length ? st.history[st.history.length - 1].sales : 0;
    return Math.max(2000000, Math.floor(last * 0.4 / 100000) * 100000);
  };

  // 収入保険の基準収入（過去5年の10aあたり販売収入 × 今年の面積）
  SIM.insuranceBase = function (st, marketArea10a) {
    const h = st.history.slice(-5).filter((x) => x.insurableArea10a > 0);
    if (!h.length) return { eligible: false, base: 0, per10a: 0 };
    const per10a = U.avg(h.map((x) => x.insurableRevenue / x.insurableArea10a));
    return { eligible: true, per10a, base: per10a * marketArea10a };
  };

  function allocType(st, type, need, broken, extraCap, capMult) {
    const list = SIM.machinesOf(st, type).map((m) => {
      const md = D.MODELS[m.model];
      return { id: m.id, eff: md.eff, cap: md.cap * (broken[m.id] ? 0.6 : 1) * (capMult || 1) };
    });
    if (extraCap) list.push({ id: 'share', eff: 0.75, cap: extraCap });
    list.sort((a, b) => a.eff - b.eff);
    let rem = need, own = 0, effArea = 0, cap = 0;
    for (const x of list) {
      cap += x.cap;
      const use = Math.min(rem, x.cap);
      own += use; effArea += use * x.eff; rem -= use;
    }
    return { need, cap, own, contract: Math.max(0, rem), eff: own > 0 ? effArea / own : 1, util: cap > 0 ? need / cap : 0, count: list.length };
  }

  SIM.simulate = function (st, opts) {
    opts = opts || {};
    const preview = !!opts.preview;
    const W = st.world, flags = st.yearFlags || {};
    const dfx = RG.dice ? RG.dice.effects(st, preview) : { y: 1, q: 0, mat: 0, labor: {}, costs: [], logs: [] }; // サイコロ（運だめし・勝負）の影響
    const yearType = preview ? 'normal' : W.yearType;
    const events = preview ? [] : W.events;
    const price = preview ? W.forecast : W.price;
    const mInf = st.market.matInfl * (1 + dfx.mat), wInf = st.market.wageInfl;
    const shock = W.inputShock;
    const res = { year: st.year, preview, weather: yearType, yearType, events, price, log: {}, shock: preview ? 0 : W.shock, pestName: W.pest.name, nationalIndex: W.nationalIndex,
      marketReason: preview ? null : W.marketReason, priceChange: preview ? 0 : W.priceChange };
    const log = (m, text, kind) => { (res.log[m] = res.log[m] || []).push({ text, kind: kind || '' }); };
    const rec = {};
    const add = (k, v) => { if (v) rec[k] = (rec[k] || 0) + v; };
    const items = [];
    const cashAt = (month, amount, cat, label) => { if (Math.abs(amount) >= 0.5) items.push({ month, amount, cat, label }); };
    const spend = (k, total, dist, label) => {
      if (!total || total < 0.5) return;
      add(k, total);
      for (const m in dist) cashAt(+m, -total * dist[m], k, label || D.PL_CATS[k].label);
    };
    const newRec = [];
    const receive = (month, amount, label) => { if (amount >= 0.5) newRec.push({ month, amount, label }); };
    let special = 0;

    // ---------- 1. 作付と面積 ----------
    const P = SIM.planUnits(st).map((u) => ({ f: u, crop: D.CROPS[u.crop], cult: D.CULTS[u.cult], sow: D.SOWS[u.sow], a10: u.area * 10, ck: u.ck }));
    const area = {
      total: U.sum(st.fields, (f) => f.area),
      planted: U.sum(P, (p) => p.f.area),
      transplant: U.sum(P.filter((p) => p.f.sow === 'transplant'), (p) => p.f.area),
      direct: U.sum(P.filter((p) => p.f.sow === 'direct'), (p) => p.f.area),
      marketCrop: U.sum(P.filter((p) => p.crop.market), (p) => p.f.area),
      feed: U.sum(P.filter((p) => p.f.crop === 'feed'), (p) => p.f.area),
      owned: U.sum(st.fields.filter((f) => f.owned), (f) => f.area),
    };
    area.fallow = Math.max(0, area.total - area.planted);
    const poorShare = area.total > 0 ? U.sum(st.fields.filter((f) => f.soil === 'poor'), (f) => f.area) / area.total : 0;
    area.rented = area.total - area.owned;
    res.area = area;

    // ---------- 2. 機械 ----------
    const broken = {};
    if (!preview) {
      st.machines.forEach((m) => {
        if (D.MODELS[m.model].cap > 0 && RG.rng.hash01(st.seed, st.year, 'bd', m.id) < SIM.breakdownProb(m)) broken[m.id] = true;
      });
    }
    const mach = {
      tractor: allocType(st, 'tractor', area.planted, broken),
      nursery: allocType(st, 'nursery', area.transplant, broken),
      planter: allocType(st, 'planter', area.transplant, broken),
      combine: allocType(st, 'combine', area.planted, broken, flags.shareCombine ? 8 : 0),
      dryer: allocType(st, 'dryer', area.planted, broken),
      drone: allocType(st, 'drone', area.planted, {}),
      smart: allocType(st, 'smart', area.planted, {}),
    };
    const droneCov = area.planted > 0 ? mach.drone.own / area.planted : 0;
    const smartCov = area.planted > 0 ? mach.smart.own / area.planted : 0;
    const hasMill = SIM.hasType(st, 'mill');
    res.machines = mach;
    res.broken = Object.keys(broken).map((id) => {
      const m = st.machines.find((x) => x.id === id);
      return { id, name: D.MODELS[m.model].name, type: D.MODELS[m.model].type, lease: m.lease };
    });

    // ---------- 3. 労働 ----------
    const skillLabor = 1 + (1 - st.skill);
    const smartMult = 1 - 0.12 * smartCov;
    const ops = {};
    const contractFee = { spring: 0, autumn: 0 };
    const contractCap = SIM.contractCap(st);
    let seedlingCost = 0;
    for (const k of D.OP_ORDER) {
      const op = D.OPS[k];
      const rel = P.filter((p) => op.on === 'planted' || (op.on === 'transplant' && p.f.sow === 'transplant') || (op.on === 'direct' && p.f.sow === 'direct'));
      const weighted = U.sum(rel, (p) => p.a10 * (p.crop.laborMult || 1) * p.f.laborMult * (k === 'manage' ? p.cult.manageLabor * p.sow.manageLabor : 1));
      let hours = 0, contractArea = 0, fee = 0, undone = 0;
      if (op.mtype) {
        const M = mach[op.mtype];
        const frac = M.need > 0 ? M.own / M.need : 0;
        hours = weighted * frac * D.BASE_HOURS * op.share * M.eff;
        // 苗は買えば済むが、作業の受託には地域の受け皿の限界がある
        contractArea = k === 'nursery' ? M.contract : Math.min(M.contract, contractCap);
        undone = M.contract - contractArea;
        fee = contractArea * 10 * op.fee * mInf;
      } else if (k === 'manage') {
        hours = weighted * D.BASE_HOURS * op.share * (1 - 0.4 * droneCov);
      } else {
        hours = weighted * D.BASE_HOURS * op.share * (mach.tractor.own > 0 ? mach.tractor.eff : 1);
      }
      hours *= smartMult * skillLabor;
      ops[k] = { name: op.name, hours, contractArea, undone, fee, season: op.season, mtype: op.mtype };
      if (k === 'nursery') seedlingCost += fee;
      else if (op.season === 'spring') contractFee.spring += fee;
      else contractFee.autumn += fee;
    }
    const need = { spring: 0, summer: 0, autumn: 0, winter: 0 };
    for (const k in ops) need[ops[k].season] += ops[k].hours;
    need.summer += area.fallow * 10 * 1.0; // 休耕地の草刈り
    const directLabor = SIM.directPlanned(st) * (hasMill ? D.DIRECT.laborMill : D.DIRECT.labor);
    for (const s of D.SEASONS) need[s] += directLabor * D.DIRECT_LABOR_SPLIT[s];
    if (flags.extraLabor) for (const s in flags.extraLabor) need[s] += flags.extraLabor[s];
    for (const s in dfx.labor) need[s] = Math.max(0, need[s] + dfx.labor[s]);
    // 新しい事業の作業時間（空き能力の範囲で）
    const bizL = RG.biz.labor(st, { combine: RG.biz.spare(mach.combine), drone: RG.biz.spare(mach.drone) });
    for (const s in bizL.hours) need[s] += bizL.hours[s];

    const famHours = U.sum(st.family, (x) => RG.state.effHours(x));
    const staffHours = U.sum(st.staff, (s) => D.LABOR.staffHours * (1 + 0.04 * Math.min(s.years, 5)));
    const seasons = {};
    let partHours = 0, famUsed = 0;
    for (const s of D.SEASONS) {
      const fam = famHours * D.SEASON_CAP[s], stf = staffHours * D.SEASON_CAP[s], pc = st.partTimers * D.PART_CAP[s];
      const n = need[s];
      const useStaff = Math.min(n, stf);
      const useFam = Math.min(n - useStaff, fam);
      const usePart = Math.min(n - useStaff - useFam, pc);
      const short = Math.max(0, n - useStaff - useFam - usePart);
      seasons[s] = { need: n, family: fam, staff: stf, part: pc, useFam, useStaff, usePart, short, ratio: n > 0 ? short / n : 0 };
      partHours += usePart; famUsed += useFam;
    }
    const partWage = D.LABOR.partWage * wInf * (st.market.partWageBoost || 1);
    const sh = (s) => seasons[s].ratio;
    res.labor = { ops, seasons, need, famHours, staffHours, partHours, partWage, partCost: partHours * partWage,
      familyHoursUsed: famUsed, totalHours: U.sum(D.SEASONS, (s) => need[s]), directLabor,
      hoursPer10a: area.planted > 0 ? U.sum(D.SEASONS, (s) => need[s]) / (area.planted * 10) : 0 };

    // ---------- 4. 収量と品質（参考：新潟 水稲栽培シミュレーターのモデル） ----------
    const laborY = U.clamp(1 - 0.5 * sh('spring') - 0.3 * sh('summer') - 0.45 * sh('autumn'), 0.3, 1);
    // 機械も委託先も足りず適期に作業できなかった面積の割合
    const und = (k) => (area.planted > 0 ? ops[k].undone / area.planted : 0);
    const delayY = U.clamp(1 - Math.max(und('till'), und('plant'), 0.8 * und('harvest'), 0.3 * und('dry')), 0.02, 1);
    const skillY = 0.97 + 0.4 * (st.skill - 0.9);
    const sev = (!preview && W.pest.occurs) ? W.pest.severity : 0;
    const norm = AG.norm();
    const ytTemp = D.YEAR_TYPES[yearType].temp;
    // 作期と収穫日（有効積算温度。猛暑年は早まり、冷夏は遅れる）
    P.forEach((p) => {
      p.plantMid = AG.plantMid(p.crop, p.f.plant);
      p.timing = AG.timing(p.crop, p.plantMid);
      p.hdN = AG.harvestDoy(p.crop, p.plantMid, 0);
      p.hd = AG.harvestDoy(p.crop, p.plantMid, ytTemp);
    });
    // 収穫スケジュール：収穫日の早い順に自前のコンバインで刈り、重なると刈り遅れになる
    const ownShare = mach.combine.need > 0 ? mach.combine.own / mach.combine.need : 0;
    AG.harvestSchedule(P.map((p) => ({ ref: p, area: p.f.area, hd: p.hd })), ownShare, mach.combine.cap)
      .forEach((u) => { u.ref.hStart = u.start; u.ref.hEnd = u.end; u.ref.late = u.late; });
    const plotRes = [];
    const products = {};
    let kyosaiPay = 0;
    for (const p of P) {
      const v = p.crop;
      const n = norm[p.f.crop];
      // 平年作の見通しでは気象を長期平均で見込む
      const wf = preview ? { wm: n.all, qm: n.qEq, fx: [] } : AG.weatherFactor(v, events, p.hd - p.hdN, p.hd + p.late);
      const wIdx = wf.wm / n.all;
      const lateY = Math.min(0.08, 0.0025 * p.late), lateQ = Math.min(12, 0.5 * p.late);
      const std = v.by * p.f.yieldMult * p.cult.yield * p.sow.yield * (p.f.cult === 'organic' && !p.f.cert ? 0.95 : 1);
      const pestLoss = sev * p.cult.pestSens * (v.blast || 1) * (1 - 0.25 * droneCov);
      const boar = flags.boar ? 1 - 0.15 * poorShare : 1;
      let noise = 1, qNoise = 0;
      if (!preview) {
        const r = RG.rng.make(st.seed, st.year, 'plot', p.f.id);
        noise = (0.92 + r.next() * 0.16) * Math.exp(r.normal(0, p.sow.noise || 0.0001));
        qNoise = r.next() * 4 - 2;
      }
      const y10 = std * p.timing.m * wIdx * skillY * laborY * delayY * (1 - lateY) * (1 - pestLoss) * boar * dfx.y * noise;
      const q = dfx.q + v.bq + p.timing.q + wf.qm - lateQ - 25 * sh('autumn') - 30 * und('harvest') - 20 * und('dry') - 60 * pestLoss + 20 * (st.skill - 0.95) + qNoise;
      const gi = v.market ? AG.gradeInfo(v, q) : { mix: [1, 0, 0, 0], coef: 1 };
      const r1 = gi.mix[0];
      const bales = (y10 * p.a10) / 60;
      const key = SIM.productKey(p.f.crop, p.ck);
      plotRes.push({ id: p.f.id, rowId: p.f.rowId, name: SIM.unitLabel(p.f), area: p.f.area, crop: p.f.crop, cult: p.f.cult, sow: p.f.sow,
        y10, std, bales, r1, q, mix: gi.mix, gcoef: gi.coef, key, fx: wf.fx, timing: p.timing.label, timingCls: p.timing.cls,
        plant: p.plantMid, hd: p.hd, hdN: p.hdN, hStart: p.hStart, hEnd: p.hEnd, late: p.late });
      const pr = products[key] || (products[key] = { key, crop: p.f.crop, ck: p.f.crop === 'feed' ? 'conv' : p.ck, label: SIM.productLabel(key), bales: 0, area: 0, r1w: 0, gcw: 0 });
      pr.bales += bales; pr.area += p.f.area; pr.r1w += r1 * bales; pr.gcw += gi.coef * bales;
      // 収量共済の基準は「その経営の平年収量」：気象・病害虫・獣害以外の減収は補てんしない
      const stdMgmt = std * p.timing.m * skillY * laborY * delayY * (1 - lateY);
      if (v.market && y10 < 0.8 * stdMgmt) kyosaiPay += ((0.8 * stdMgmt - y10) / 60) * p.a10 * 0.75 * price * v.priceCoef;
    }
    const plist = Object.values(products);
    plist.forEach((pr) => { pr.r1 = pr.bales > 0 ? pr.r1w / pr.bales : 0; pr.gc = pr.bales > 0 ? pr.gcw / pr.bales : 1; pr.rem = pr.bales; });
    const marketBales = U.sum(plist.filter((x) => D.CROPS[x.crop].market), (x) => x.bales);
    const totalBales = U.sum(plist, (x) => x.bales);
    res.production = {
      plots: plotRes, products: plist, totalBales, marketBales,
      feedBales: products['feed|conv'] ? products['feed|conv'].bales : 0,
      yieldPer10a: area.planted > 0 ? (totalBales * 60) / (area.planted * 10) : 0,
      marketYieldPer10a: area.marketCrop > 0 ? (marketBales * 60) / (area.marketCrop * 10) : 0,
      r1: marketBales > 0 ? U.sum(plist.filter((x) => D.CROPS[x.crop].market), (x) => x.r1w) / marketBales : 0,
      laborY, delayY, pestLoss: sev,
      maxLate: P.length ? Math.max.apply(null, P.map((p) => p.late)) : 0,
    };

    // ---------- 5. 販売 ----------
    const sales = { contracts: [], direct: null, ja: [], spot: [], feed: null };
    let contractRev = 0, procure = 0, trustDelta = 0, contractShipVol = 0;
    const canceled = [];
    for (const c of st.contracts) {
      const cands = plist.filter((p) => SIM.group(p.crop) === SIM.group(c.crop) && SIM.tier(p.ck) >= c.minCult).sort((a, b) => SIM.tier(a.ck) - SIM.tier(b.ck));
      let left = c.volume;
      for (const p of cands) { const t = Math.min(p.rem, left); p.rem -= t; left -= t; }
      const crop = D.CROPS[c.crop];
      const cp = SIM.contractPrice(c, price);
      const procPrice = crop.sake ? cp * 1.15 : price * crop.priceCoef * (c.minCult >= 2 ? 1.5 : c.minCult >= 1 ? 1.15 : 1) + D.SALES.procureExtra;
      const pc = left * procPrice;
      const rev = c.volume * cp;
      contractRev += rev; procure += pc; contractShipVol += c.volume;
      const ratio = c.volume > 0 ? left / c.volume : 0;
      const cancel = ratio > 0.3;
      if (cancel) { canceled.push(c.id); trustDelta -= 3; }
      sales.contracts.push({ id: c.id, buyer: c.buyer, crop: c.crop, minCult: c.minCult, volume: c.volume,
        delivered: c.volume - left, short: left, price: cp, refPrice: c.refPrice, premium: c.premium, revenue: rev, procure: pc, procPrice, cancel });
    }

    // 直販
    const DD = D.DIRECT;
    const dp = products[st.direct.product];
    const dCrop = dp ? D.CROPS[dp.crop] : null;
    const p5 = Math.max(500, st.direct.price5);
    const direct = { product: st.direct.product, label: SIM.productLabel(st.direct.product), alloc: 0, demand: 0, sold: 0,
      unsold: 0, revenue: 0, cost: 0, price5: p5, ref5: 0, customers: st.direct.customers, available: dp ? dp.rem : 0,
      newCustomers: 0, churn: 0, unmet: 0, customersEnd: st.direct.customers, perBaleNet: 0 };
    const newCust = (st.direct.marketing / (DD.cac * mInf)) * (1 + st.brand / 100);
    if (dp && dCrop && dCrop.directCoef) {
      const alloc = Math.max(0, Math.min(st.direct.alloc, dp.rem));
      dp.rem -= alloc;
      const ref5 = price * DD.retailFactor * dCrop.directCoef * D.CULT_KEYS[dp.ck].directPrem * (1 + st.brand / 250) * (0.9 + 0.1 * dp.r1);
      const demand = st.direct.customers * DD.perCustomer * Math.min(2.5, Math.pow(ref5 / p5, DD.elasticity));
      const deliverable = alloc * (1 - 0.7 * sh('winter'));
      const sold = Math.min(deliverable, demand);
      const revenue = sold * p5 * DD.bagsPerBale;
      const cost = sold * (DD.packaging + (hasMill ? DD.polishMill : DD.polish)) * mInf + revenue * DD.platform;
      const unmet = demand > 0 ? Math.max(0, demand - sold) / demand : 0;
      const churn = U.clamp(DD.baseChurn + Math.max(0, p5 / ref5 - 1) * 0.35 + unmet * 0.3 + (dp.r1 < 0.6 ? 0.08 : 0) - st.brand / 1000, 0.05, 0.6);
      const wom = st.direct.customers * 0.06 * dp.r1 * (sold > 0 ? 1 : 0);
      Object.assign(direct, { alloc, demand, sold, unsold: alloc - sold, revenue, cost, ref5, unmet, churn,
        newCustomers: newCust + wom, customersEnd: Math.max(0, st.direct.customers * (1 - churn) + newCust + wom),
        perBaleNet: sold > 0 ? (revenue - cost) / sold : 0 });
      if (direct.unsold > 0.01) {
        sales.spot.push({ label: direct.label + '（直販の売れ残り）', bales: direct.unsold, unit: price * dCrop.priceCoef * D.SALES.spotRate });
      }
    } else {
      direct.churn = 0.5;
      direct.customersEnd = Math.max(0, st.direct.customers * 0.5 + newCust);
    }
    sales.direct = direct;

    // 新しい事業
    const BZ = RG.biz, BD = BZ.DEFS;
    const biz = { harvest: null, drone: null, proc: null, stand: null, trust: 0, customers: 0 };
    if (bizL.harvest > 0) biz.harvest = { area: bizL.harvest, revenue: bizL.harvest * 10 * BD.harvest.fee, cost: bizL.harvest * 10 * BD.harvest.cost * mInf };
    if (bizL.drone > 0) biz.drone = { area: bizL.drone, revenue: bizL.drone * 10 * BD.drone.fee, cost: bizL.drone * 10 * BD.drone.cost * mInf };
    if (biz.harvest) biz.trust += Math.min(4, biz.harvest.area / 3);
    if (biz.drone) biz.trust += Math.min(2, biz.drone.area / 15);
    const procPlan = BZ.procPlanned(st);
    if (procPlan > 0) {
      // もち米があればもち米から、なければうるち米（農協に出す予定の米）から使う
      const isM = (p) => (D.CROPS[p.crop].group === 'mochi' ? 1 : 0);
      const cands = plist.filter((p) => D.CROPS[p.crop].market && p.rem > 0.01).sort((a, b) => isM(b) - isM(a) || b.rem - a.rem);
      let left = procPlan, mochi = 0, flour = 0;
      for (const p of cands) {
        const t = Math.min(p.rem, left);
        p.rem -= t; left -= t;
        if (isM(p)) mochi += t; else flour += t;
      }
      const used = mochi + flour, demand = BZ.procDemand(st);
      const sold = Math.min(used, demand), soldMochi = Math.min(mochi, sold), soldFlour = sold - soldMochi;
      const revenue = soldMochi * BD.proc.mochiPrice + soldFlour * BD.proc.flourPrice + (used - sold) * BD.proc.dumpPrice;
      biz.proc = { bales: used, mochi, flour, demand, sold, unsold: used - sold, revenue, cost: used * BD.proc.material * mInf };
      biz.customers += sold * 0.1;
    }
    if (BZ.has(st, 'stand')) {
      biz.stand = { revenue: BD.stand.base * (0.6 + st.trust / 100), cost: BD.stand.cost * mInf };
      biz.customers += BD.stand.customers;
    }
    direct.customersEnd += biz.customers;
    trustDelta += biz.trust;
    sales.biz = biz;

    // 保管米：前年産を4月に売る / 今年産の一部を保管に回す
    let stockSale = null, stockEnd = null;
    if (st.stock && st.stock.bales > 0) {
      const op = BZ.oldPrice(st, preview);
      stockSale = { bales: st.stock.bales, price: op, revenue: st.stock.bales * op * st.stock.coef, value: st.stock.value,
        fee: st.stock.bales * BZ.STORE.fee * mInf, harvestPrice: st.stock.price };
    }
    const storeQ = BZ.storePlanned(st);
    if (storeQ > 0) {
      let left = storeQ, value = 0;
      for (const p of plist) {
        if (!D.CROPS[p.crop].market || p.crop === 'feed' || p.rem <= 0.01) continue;
        const t = Math.min(p.rem, left);
        p.rem -= t; left -= t;
        value += t * price * D.CROPS[p.crop].priceCoef * D.CULT_KEYS[p.ck].jaPrem * p.gc;
      }
      const bales = storeQ - left;
      if (bales > 0.01) stockEnd = { bales, value, price, coef: value / (bales * price), year: st.year };
    }
    sales.stockSale = stockSale;
    sales.stockEnd = stockEnd;

    // 農協出荷（残り全部）
    for (const p of plist) {
      if (p.crop === 'feed' || p.rem <= 0.01) continue;
      const crop = D.CROPS[p.crop];
      const unit = price * crop.priceCoef * D.CULT_KEYS[p.ck].jaPrem * p.gc;
      sales.ja.push({ key: p.key, label: p.label, bales: p.rem, unit, revenue: p.rem * unit, r1: p.r1 });
      p.rem = 0;
    }
    const jaRev = U.sum(sales.ja, (x) => x.revenue);
    const jaBales = U.sum(sales.ja, (x) => x.bales);
    // 農協の出荷契約金（前渡金）：6月に受け取り、10月の概算金と相殺。出荷が契約数量に届かなければ11月に不足分を返す
    const advQty = SIM.advanceQty(st), advUnit = SIM.advanceUnit(st);
    const adv = { qty: advQty, unit: advUnit, amount: advQty * advUnit, shipped: jaBales, offset: Math.min(advQty, jaBales) * advUnit, ret: Math.max(0, advQty - jaBales) * advUnit };
    res.jaAdvance = adv;
    if (adv.amount > 0) {
      cashAt(6, adv.amount, 'advanceIn', '農協の出荷契約金（前渡金）');
      cashAt(10, -adv.offset, 'advanceOut', '出荷契約金の相殺（概算金から差し引き）');
      cashAt(11, -adv.ret, 'advanceOut', '出荷契約金の返還（出荷が契約数量に届かなかった分）');
    }
    sales.spot.forEach((x) => { x.revenue = x.bales * x.unit; });
    const spotRev = U.sum(sales.spot, (x) => x.revenue);
    const spotBales = U.sum(sales.spot, (x) => x.bales);

    // 飼料用米と交付金
    const feedBales = res.production.feedBales;
    const feedRev = feedBales * D.SALES.feedPrice;
    let subsidy = 0;
    for (const pr of plotRes) {
      if (pr.crop !== 'feed') continue;
      subsidy += AG.subsidyPer10a(D.CROPS[pr.crop], pr.y10) * pr.area * 10 * st.market.feedSubsidyMult;
    }
    sales.feed = { bales: feedBales, revenue: feedRev, subsidy };
    res.sales = sales;

    const bizRev = U.sum(['harvest', 'drone', 'proc', 'stand'], (k) => (biz[k] ? biz[k].revenue : 0));
    const salesTotal = jaRev + contractRev + direct.revenue + spotRev + feedRev + bizRev + (stockSale ? stockSale.revenue : 0);
    // 収入保険の対象：今年とれた米の販売（保管に回した分は収穫時の値段で含める）
    const insurableRev = jaRev + contractRev + direct.revenue + spotRev + (stockEnd ? stockEnd.value : 0);

    // ---------- 6. 収入の計上と入金時期 ----------
    add('jaSales', jaRev);
    cashAt(10, jaRev * D.SALES.jaAdvance, 'jaSales', '農協の概算金');
    receive(6, jaRev * (1 - D.SALES.jaAdvance), '農協の追加払い');
    add('contractSales', contractRev);
    cashAt(11, contractRev * 0.5, 'contractSales', '契約販売の代金');
    cashAt(12, contractRev * 0.5, 'contractSales', '契約販売の代金');
    add('directSales', direct.revenue);
    [10, 11, 12].forEach((m) => cashAt(m, direct.revenue * 0.15, 'directSales', '直販の売上'));
    for (let m = 1; m <= 9; m++) receive(m, (direct.revenue * 0.55) / 9, '直販の売上（順次販売分）');
    add('spotSales', spotRev);
    cashAt(12, spotRev, 'spotSales', 'スポット販売');
    add('feedSales', feedRev);
    cashAt(11, feedRev, 'feedSales', '飼料用米の販売代金');
    add('subsidy', subsidy);
    receive(3, subsidy, '飼料用米の交付金');
    // 新しい事業の収入
    if (biz.harvest) { add('serviceSales', biz.harvest.revenue); cashAt(10, biz.harvest.revenue, 'serviceSales', '稲刈りの作業受託料'); }
    if (biz.drone) { add('serviceSales', biz.drone.revenue); cashAt(8, biz.drone.revenue, 'serviceSales', 'ドローン防除の請負料'); }
    if (biz.proc) { add('procSales', biz.proc.revenue); cashAt(12, biz.proc.revenue * 0.4, 'procSales', '加工品の売上'); receive(2, biz.proc.revenue * 0.6, '加工品の売上（年明けの販売分）'); }
    if (biz.stand) { add('standSales', biz.stand.revenue); for (let m = 5; m <= 11; m++) cashAt(m, biz.stand.revenue / 7, 'standSales', '直売所の売上'); }
    // 保管米：売った年は売上と「年初の在庫」を差し引き、保管した年は「年末の在庫」を利益に入れる（収穫基準）
    if (stockSale) {
      add('storedSales', stockSale.revenue);
      cashAt(BZ.STORE.month, stockSale.revenue, 'storedSales', '保管米の販売（前年産）');
    }
    const invDelta = (stockEnd ? stockEnd.value : 0) - (stockSale ? stockSale.value : 0);
    if (Math.abs(invDelta) >= 0.5) rec.inventory = invDelta;
    if (st.grant && st.year <= st.grant.years) {
      add('grant', st.grant.amount);
      cashAt(7, st.grant.amount, 'grant', '就農支援金');
    }

    // 保険
    const ib = SIM.insuranceBase(st, area.marketCrop * 10);
    let premium = 0, incomePay = 0;
    if (st.insurance === 'kyosai') premium = area.marketCrop * 10 * D.INSURANCE.kyosai.perArea;
    else kyosaiPay = 0;
    if (st.insurance === 'income' && ib.eligible) {
      premium = ib.base * D.INSURANCE.income.rate;
      incomePay = Math.max(0, ib.base * 0.9 - insurableRev) * 0.9;
    }
    add('insuranceIn', kyosaiPay + incomePay);
    receive(3, kyosaiPay, '収量共済の共済金');
    receive(6, incomePay, '収入保険の保険金');
    res.insurance = { kind: st.insurance, premium, kyosaiPay, incomePay, base: ib.base, eligible: ib.eligible };

    // ---------- 7. 費用 ----------
    const sumP = (fn) => U.sum(P, fn);
    const CS = D.COST.cstSplit;
    spend('seed', sumP((p) => p.a10 * p.crop.cst * CS.seed * p.sow.seedMult) * mInf, { 3: 1 });
    spend('nursery', mach.nursery.own * 10 * D.COST.nurseryMat * mInf, { 3: 0.5, 4: 0.5 }, '育苗資材');
    spend('nursery', seedlingCost, { 4: 1 }, '苗の購入');
    spend('fert', sumP((p) => p.a10 * p.crop.cst * CS.fert * p.cult.fert) * mInf * shock.fert, { 3: 0.4, 4: 0.3, 6: 0.3 });
    spend('pest', sumP((p) => p.a10 * p.crop.cst * CS.pest * p.cult.pest) * (1 - 0.1 * droneCov) * mInf, { 4: 0.2, 6: 0.3, 7: 0.5 });
    const tractorOwn = mach.tractor.need > 0 ? mach.tractor.own / mach.tractor.need : 0;
    spend('fuel', (area.planted * 10 * D.COST.fuel * (0.35 + 0.65 * tractorOwn) + mach.dryer.own * 10 * D.COST.dryFuel) * mInf * shock.fuel,
      { 4: 0.3, 5: 0.2, 7: 0.1, 9: 0.25, 10: 0.15 });
    spend('materials', (area.planted * 10 * D.COST.materials + area.fallow * 10 * D.COST.fallow) * mInf, { 4: 0.5, 9: 0.5 });
    spend('water', area.total * 10 * D.COST.water, { 6: 1 });
    spend('contract', contractFee.spring, { 5: 1 }, '春作業の委託料');
    spend('contract', contractFee.autumn, { 10: 1 }, '秋作業の委託料');
    spend('repair', U.sum(st.machines, (m) => SIM.repairCost(m, mInf)), { 3: 0.5, 9: 0.5 }, '機械の点検・修理');
    const brokenCost = U.sum(res.broken.filter((b) => !b.lease), (b) => D.MODELS[st.machines.find((m) => m.id === b.id).model].price * 0.12 * mInf);
    spend('repair', brokenCost, { 9: 1 }, '故障の修理');
    const dep = {};
    st.machines.forEach((m) => { const d = SIM.depreciation(m); if (d > 0) dep[m.id] = d; });
    add('depreciation', U.sum(Object.values(dep)));
    spend('rent', U.sum(st.fields.filter((f) => !f.owned), (f) => f.area * 10 * f.rent), { 12: 1 }, '地代の支払い');
    spend('lease', U.sum(st.machines.filter((m) => m.lease), (m) => m.leaseFee), MONTHLY, 'リース料');
    spend('wageStaff', U.sum(st.staff, (s) => s.salary * (1 + D.LABOR.staffSocial)), MONTHLY, '社員給与');
    const partMonths = { spring: { 4: 0.5, 5: 0.5 }, summer: { 7: 1 }, autumn: { 9: 0.5, 10: 0.5 }, winter: { 1: 0.33, 2: 0.33, 12: 0.34 } };
    for (const s of D.SEASONS) spend('wagePart', seasons[s].usePart * partWage, partMonths[s], 'パート賃金');
    spend('recruit', st.partTimers * D.LABOR.partRecruit, { 3: 1 }, 'パート募集費');
    spend('salesCost', jaBales * D.COST.jaFee * mInf, { 10: 1 }, '農協出荷の手数料・袋代');
    spend('salesCost', feedBales * D.COST.feedFee * mInf, { 11: 1 }, '飼料用米の出荷経費');
    spend('salesCost', contractShipVol * D.COST.contractShip * mInf, { 11: 0.5, 12: 0.5 }, '契約出荷の運送費');
    spend('salesCost', direct.cost, { 10: 0.33, 11: 0.33, 12: 0.34 }, '直販の精米・包装・決済手数料');
    spend('salesCost', spotBales * D.COST.spotFee * mInf, { 12: 1 }, 'スポット販売の手数料');
    spend('procure', procure, { 11: 0.5, 12: 0.5 });
    if (stockSale) spend('salesCost', stockSale.fee, { [BZ.STORE.month]: 1 }, '保管米の保管料（低温倉庫）');
    spend('bizCost', (biz.harvest ? biz.harvest.cost : 0) + (biz.drone ? biz.drone.cost : 0), { 8: 0.4, 10: 0.6 }, '作業受託の燃料・消耗品');
    if (biz.proc) spend('bizCost', biz.proc.cost, { 12: 1 }, '加工の原材料・包装');
    if (biz.stand) spend('bizCost', biz.stand.cost, MONTHLY, '直売所の光熱費・消耗品');
    spend('marketing', st.direct.marketing, { 4: 0.5, 10: 0.5 });
    spend('brand', st.brandInvest, { 4: 0.5, 10: 0.5 });
    spend('insurance', premium, { 4: 1 }, D.INSURANCE[st.insurance].name + 'の保険料');
    spend('landTax', area.owned * 10 * D.COST.landTax, { 6: 1 });
    spend('misc', D.COST.miscFixed * mInf + D.COST.miscRate * salesTotal, MONTHLY);
    if (st.corp) spend('execPay', st.execPay * 1.15, MONTHLY, '役員報酬');
    dfx.costs.forEach((c) => spend('eventCost', c.amount, { [c.month]: 1 }, c.label));

    // 計画フェーズ中の取引（購入・借入・イベントなど）
    for (const it of st.ledger) {
      items.push({ month: it.month, amount: it.amount, cat: it.cat, label: it.label });
      const c = D.PL_CATS[it.cat];
      if (c) add(it.cat, c.kind === 'sales' || c.kind === 'nonopIncome' ? it.amount : -it.amount);
      if (it.gain) special += it.gain;
    }
    // 前年からの持ち越し
    for (const r of st.receivables) cashAt(r.month, r.amount, 'collect', r.label);
    if (st.taxPayable > 0) cashAt(st.taxPayMonth, -st.taxPayable, 'tax', '前年分の' + (st.taxLabel || (st.corp ? '法人税等' : '所得税・住民税等')));
    if (!st.corp) for (let m = 1; m <= 12; m++) cashAt(m, -st.living / 12, 'withdraw', '家計費（生活費）');

    // 借入金
    if (st.shortLoan > 0) {
      const it = st.shortLoan * D.FIN.shortRate * 11 / 12;
      cashAt(1, st.shortLoan, 'loanIn', '運転資金の借入');
      cashAt(12, -st.shortLoan, 'loanOut', '運転資金の返済');
      add('interest', it);
      cashAt(12, -it, 'interest', '運転資金の利息');
    }
    const loanUpdates = [];
    for (const l of st.loans) {
      const interest = l.balance * l.rate * (l.newThisYear ? 10 / 12 : 1);
      let principal = 0, grace = l.grace || 0;
      if (l.newThisYear) { principal = 0; grace = Math.max(0, grace - 1); }
      else if (grace > 0) grace -= 1;
      else principal = Math.min(l.balance, l.original / Math.max(1, l.repayYears || l.term));
      add('interest', interest);
      cashAt(12, -interest, 'interest', l.name + 'の利息');
      cashAt(12, -principal, 'loanOut', l.name + 'の元金返済');
      loanUpdates.push({ id: l.id, interest, principal, newBalance: l.balance - principal, grace });
    }

    // ---------- 8. 月次の資金繰り ----------
    let bal = st.yearStartCash, em = st.emergency || 0, emInterest = 0, minBal = Infinity, minMonth = 1, peakEm = em;
    const months = [];
    for (let m = 1; m <= 12; m++) {
      const its = items.filter((i) => i.month === m);
      if (em > 0) {
        const it = (em * D.FIN.emergencyRate) / 12;
        emInterest += it;
        its.push({ month: m, amount: -it, cat: 'interest', label: 'つなぎ資金の利息' });
      }
      const inflow = U.sum(its.filter((i) => i.amount > 0), (i) => i.amount);
      const outflow = U.sum(its.filter((i) => i.amount < 0), (i) => i.amount);
      bal += inflow + outflow;
      const before = bal;
      if (before < minBal) { minBal = before; minMonth = m; }
      let borrowed = 0, repaid = 0;
      if (bal < 0) {
        borrowed = -bal; em += borrowed; bal = 0;
        log(m, '資金が不足し、つなぎ資金を' + U.man(borrowed) + '借り入れた（年利8%）', 'bad');
      } else if (em > 0 && bal > D.BUFFER_CASH) {
        repaid = Math.min(em, bal - D.BUFFER_CASH); em -= repaid; bal -= repaid;
        if (repaid > 1) log(m, 'つなぎ資金を' + U.man(repaid) + '返済した', '');
      }
      peakEm = Math.max(peakEm, em);
      months.push({ m, items: its, inflow, outflow, before, borrowed, repaid, end: bal, emergency: em });
    }
    add('interest', emInterest);

    // ---------- 9. 損益と税金 ----------
    const pl = ACC.buildPL(st, rec, special);
    let tax;
    if (st.corp) {
      const t = ACC.taxCorp(pl.preTax, st.lossCarry);
      tax = { amount: t.tax, newLoss: t.newLoss, usedLoss: t.used, label: '法人税等' };
    } else {
      tax = { amount: ACC.taxIndividual(pl.preTax), label: '所得税・住民税・国保等' };
    }

    // ---------- 10. ブランド・信頼 ----------
    const brandGain = st.brandInvest > 0 ? D.BRAND.gain * Math.log10(1 + st.brandInvest / 100000) : 0;
    let brandBonus = 0;
    if (direct.sold > 0 && dp && dp.ck === 'organic') brandBonus += 1;
    if (direct.sold > 0 && dp && dp.r1 > 0.85) brandBonus += 1;
    const brandEnd = U.clamp(st.brand * (1 - D.BRAND.decay) + brandGain + brandBonus, 0, 100);
    trustDelta += area.total > 0 && area.fallow / area.total > 0.2 ? -2 : 1;

    Object.assign(res, {
      rec, pl, tax, special, items,
      cash: { months, minBalance: minBal, minMonth, end: bal, emergencyStart: st.emergency || 0, emergencyEnd: em, emergencyPeak: peakEm, emInterest, start: st.yearStartCash },
      newReceivables: newRec, loanUpdates, dep, brandEnd, brandGain, trustDelta, canceled,
      creditLimit: SIM.creditLimit(st), insurableRev, salesTotal,
    });

    // ---------- 11. 月ごとのできごと ----------
    res.diceLogs = dfx.logs;
    if (!preview) writeLog(st, res, log, seasons, area, W);
    return res;
  };

  function writeLog(st, res, log, seasons, area, W) {
    const lab = (s) => (seasons[s].ratio > 0.01 ? '不足 ' + U.pct(seasons[s].ratio) + '（作業が遅れた）' : '十分');
    const labKind = (s) => (seasons[s].ratio > 0.01 ? 'bad' : '');
    log(1, st.year + '年目の経営が始まった。');
    (res.diceLogs || []).forEach((l) => log(l.month, l.text, l.kind));
    st.ledger.forEach((it) => log(it.month, it.label + '（' + (it.amount >= 0 ? '+' : '') + U.man(it.amount) + '）'));
    log(3, '種もみ・肥料などの資材を購入した。');
    if (st.taxPayable > 0) log(st.taxPayMonth, '前年分の税金 ' + U.man(st.taxPayable) + ' を納めた。');
    log(4, area.transplant > 0 ? '育苗と田起こしが始まった。' : '田起こしが始まった。');
    const adv = res.jaAdvance;
    if (adv && adv.amount > 0) {
      log(6, '農協から出荷契約金 ' + U.man(adv.amount) + '（' + U.bales(adv.qty) + ' × 1俵' + U.num(adv.unit) + '円）が振り込まれた。');
      log(10, '出荷契約金 ' + U.man(adv.offset) + ' を概算金から差し引いて返した。');
      if (adv.ret > 0) log(11, '農協への出荷（' + U.bales(adv.shipped) + '）が契約数量（' + U.bales(adv.qty) + '）に届かず、不足分の出荷契約金 ' + U.man(adv.ret) + ' を現金で返した。', 'bad');
    }
    const sowText = [area.transplant > 0 ? '田植え' : null, area.direct > 0 ? '直播' : null].filter(Boolean).join('と');
    if (sowText) log(5, sowText + 'を行った。春の労働力：' + lab('spring'), labKind('spring'));
    const yt = D.YEAR_TYPES[res.yearType];
    log(6, '今年は「' + yt.name + '」の傾向だ。' + yt.desc, res.yearType === 'good' ? 'good' : res.yearType === 'normal' ? '' : 'bad');
    const plots = res.production.plots;
    res.events.forEach((ev) => {
      const e = AG.event(ev.id);
      const strong = e.tol ? Array.from(new Set(plots.filter((p) => D.CROPS[p.crop][e.tol] > 0.6).map((p) => D.CROPS[p.crop].name))) : [];
      const hurt = Math.min.apply(null, plots.map((p) => { const f = (p.fx || []).find((x) => x.id === ev.id); return f ? f.q + f.y * 100 : 0; }).concat([0]));
      log(e.month, e.icon + ' ' + e.name + '（' + D.SEV[ev.sev].name + '）が発生した。' +
        (hurt > -0.5 ? '今年の作付への影響はほとんどなかった。' : strong.length ? strong.join('・') + 'は' + D.TOL_NAMES[e.tol] + '性が強く、被害は小さかった。' : ''),
        hurt > -0.5 ? '' : 'bad');
    });
    if (!res.events.length) log(7, '大きな気象災害はなく、稲は順調に育っている。', 'good');
    if (res.production.pestLoss > 0) log(8, W.pest.name + 'が発生した！', 'bad');
    log(8, '夏の管理作業：' + lab('summer'), labKind('summer'));
    res.broken.forEach((b) => log(9, b.name + 'が故障した！' + (b.lease ? '（リースのため修理費は不要）' : '修理費がかさみ、') + '作業の一部を委託した。', 'bad'));
    const first = Math.min.apply(null, res.production.plots.map((p) => p.hd).concat([AG.doy(9, 15)]));
    log(AG.md(first)[0] < 9 ? 8 : 9, '稲刈りが始まった（' + AG.fmt(first) + '〜）。秋の労働力：' + lab('autumn'), labKind('autumn'));
    res.production.plots.filter((p) => p.late > 3).forEach((p) => log(AG.md(p.hd + p.late)[0], p.name + 'は稲刈りが集中し、適期より平均' + U.num(p.late) + '日遅れて刈った（品質が低下）。', 'bad'));
    log(10, '米価（農協の基準価格）は60kgあたり ' + U.num(res.price) + '円に決まった（全国の作況指数 ' + W.nationalIndex.toFixed(0) + '）。');
    if (W.shockText) log(10, W.shockText + '。', W.shock > 0 ? 'good' : 'bad');
    if (W.marketReason) log(10, '米の需給：' + W.marketReason, W.priceChange >= 0.05 ? 'good' : W.priceChange <= -0.05 ? 'bad' : '');
    res.sales.contracts.forEach((c) => log(10, c.buyer + 'との契約価格は、今年の需給を反映して1俵 ' + U.num(c.price) + '円に決まった' +
      (c.refPrice ? '（契約時の目安 ' + U.num(c.refPrice) + '円から ' + (c.price >= c.refPrice ? '+' : '') + U.pct(c.price / c.refPrice - 1, 1) + '）' : '') + '。',
      c.refPrice && c.price < c.refPrice * 0.95 ? 'bad' : ''));
    const pr = res.production;
    log(10, '収量は10aあたり平均 ' + U.num(pr.yieldPer10a) + 'kg、1等比率は ' + U.pct(pr.r1) + '。',
      pr.r1 < 0.6 ? 'bad' : '');
    res.sales.contracts.forEach((c) => {
      if (c.short > 0.5) log(11, c.buyer + 'への契約 ' + U.bales(c.volume) + ' のうち ' + U.bales(c.short) + ' が不足。市場から高値で調達した。' + (c.cancel ? '契約は打ち切られた。' : ''), 'bad');
      else log(11, c.buyer + 'へ契約どおり ' + U.bales(c.volume) + ' を出荷した。');
    });
    const d = res.sales.direct;
    if (d.alloc > 0) log(12, '直販：' + U.bales(d.sold) + 'を販売（顧客 ' + U.num(d.customers) + '人）。' + (d.unsold > 0.5 ? '売れ残り ' + U.bales(d.unsold) + ' はスポット販売へ。' : ''), d.unsold > 0.5 ? 'bad' : '');
    log(12, '借入金を返済し、1年の決算を迎えた。');
  }

  // ---------- 結果を状態に反映 ----------
  SIM.apply = function (st, res) {
    const bsStart = st.yearStartBS;
    const livingUsed = st.living; // この年に実際に引き出した家計費（決算中に後継者が加わっても変わらない）
    st.cash = res.cash.end;
    st.emergency = res.cash.emergencyEnd;
    for (const u of res.loanUpdates) {
      const l = st.loans.find((x) => x.id === u.id);
      if (!l) continue;
      l.balance = u.newBalance; l.grace = u.grace; l.newThisYear = false;
      if (u.principal > 0) l.yearsLeft = Math.max(0, l.yearsLeft - 1);
    }
    st.loans = st.loans.filter((l) => l.balance > 1);
    st.receivables = res.newReceivables;
    st.stock = res.sales.stockEnd || null;
    st.taxPayable = res.tax.amount;
    st.taxPayMonth = st.corp ? 2 : 3;
    st.taxLabel = st.corp ? '法人税等' : '所得税・住民税等';
    if (st.corp) st.lossCarry = res.tax.newLoss;

    const notes = [];
    for (const m of st.machines) {
      if (!m.lease) m.book = Math.max(0, m.book - (res.dep[m.id] || 0));
      m.age += 1;
      if (m.lease) m.leaseYearsLeft -= 1;
    }
    st.machines = st.machines.filter((m) => {
      if (m.lease && m.leaseYearsLeft <= 0) { notes.push(D.MODELS[m.model].name + 'のリース期間が終わり、返却した。'); return false; }
      return true;
    });
    st.organicHist = [U.sum(SIM.planUnits(st).filter((u) => u.cult === 'organic'), (u) => u.area), st.organicHist[0] || 0];

    const canceled = new Set(res.canceled);
    st.contracts.forEach((c) => { c.yearsLeft -= 1; });
    st.contracts = st.contracts.filter((c) => {
      if (canceled.has(c.id)) { notes.push(c.buyer + 'との契約は数量不足のため打ち切られた。'); return false; }
      if (c.yearsLeft <= 0) { notes.push(c.buyer + 'との契約期間が終わった。'); return false; }
      return true;
    });
    st.direct.customers = Math.round(res.sales.direct.customersEnd);
    st.brand = res.brandEnd;
    st.trust = U.clamp(st.trust + res.trustDelta, 0, 100);
    st.skill = Math.min(1.04, st.skill + 0.008);
    st.staff.forEach((s) => { s.years += 1; s.salary *= 1.02; });
    // 1年たつと家族も1歳年をとる。経営主が働けなくなったら、後継者に引き継ぐか引退する
    st.family.forEach((f) => { if (f.age != null) f.age = Number(f.age) + 1; });
    const op = RG.state.operator(st);
    if (op && op.age != null && RG.state.ageFactor(op.age) <= 0) {
      // 就農予定の後継者がまだなら、予定を早めて就農してもらう
      if (!RG.state.successor(st) && RG.state.pendingSuccessor(st) && RG.state.pendingSuccessor(st).ageNow + 1 >= 20) {
        RG.state.addPlannedSuccessor(st, 1);
        notes.push('経営主の引退に合わせて、後継者が予定を早めて就農した。');
      }
      const sc = RG.state.successor(st);
      if (sc && Number(sc.age) >= 20) {
        op.tag = 'retired'; op.role = '引退'; sc.tag = 'operator'; sc.role = st.corp ? '代表' : '経営主';
        notes.push(op.name + 'が' + op.age + '歳で引退し、経営を' + sc.name + 'に引き継いだ。');
      } else if (st.year < st.maxYear) {
        st.retired = { year: st.year, age: op.age };
      }
    }
    if (RG.rivals) RG.rivals.advance(st, res).forEach((t) => notes.push(t));
    if (RG.story) RG.story.afterYear(st, res);
    RG.market.advance(st);

    const bs = ACC.bs(st);
    Object.assign(res, { corp: st.corp, living: livingUsed, cashEnd: st.cash, lossCarry: st.lossCarry });
    res.bsStart = bsStart;
    res.bs = bs;
    res.analysis = ACC.analyze(st, res, bs);
    res.equityCheck = bs.equity - bsStart.equity - (res.pl.preTax - res.tax.amount) +
      (st.corp ? 0 : livingUsed) - U.sum(st.ledger.filter((x) => x.cat === 'capital'), (x) => x.amount);
    res.notes = notes;

    const pl = res.pl;
    st.history.push({
      year: st.year, corp: st.corp, sales: pl.sales, ordinary: pl.ordinary, preTax: pl.preTax, tax: res.tax.amount,
      income: res.analysis.income, net: pl.preTax - res.tax.amount, cashEnd: st.cash, equity: bs.equity,
      debt: bs.longLoans + bs.emergency, assets: bs.assets, area: res.area.total, planted: res.area.planted,
      bales: res.production.totalBales, price: res.price, weather: res.weather, yieldPer10a: res.production.yieldPer10a,
      r1: res.production.r1, customers: st.direct.customers, brand: st.brand, trust: st.trust,
      insurableRevenue: res.insurableRev, insurableArea10a: res.area.marketCrop * 10,
      minCash: res.cash.minBalance, emergencyPeak: res.cash.emergencyPeak,
      laborShort: Math.max.apply(null, D.SEASONS.map((s) => res.labor.seasons[s].ratio)),
      familyHours: res.labor.familyHoursUsed, costPer10a: res.analysis.costPer10a, costPer60: res.analysis.costPer60,
      bepArea: res.analysis.bepArea, subsidy: pl.get('subsidy') + pl.get('grant'),
    });
    st.lastResult = res;
    res.nextAdvice = RG.advisor && RG.advisor.nextYear ? RG.advisor.nextYear(st, res) : [];

    st.negEquityYears = bs.equity < 0 ? st.negEquityYears + 1 : 0;
    if (res.cash.emergencyEnd > res.creditLimit) {
      st.gameOver = { reason: 'cash', year: st.year,
        text: 'つなぎ資金が ' + U.man(res.cash.emergencyEnd) + ' に膨らみ、金融機関の融資枠（' + U.man(res.creditLimit) + '）を超えました。資金繰りがつかず、経営を続けられなくなりました。' };
    } else if (st.negEquityYears >= 3) {
      st.gameOver = { reason: 'insolvent', year: st.year, text: '3年続けて債務超過（負債が資産を上回る状態）となり、経営を続けられなくなりました。' };
    }
    st.phase = 'season';
  };
})(window.RG = window.RG || {});
