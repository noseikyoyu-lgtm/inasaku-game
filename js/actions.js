// 計画フェーズでのプレイヤーの操作。成功時は null、失敗時はエラーメッセージを返す。
(function (RG) {
  'use strict';
  const D = RG.data, U = RG.util, S = RG.state, SIM = RG.sim;
  const A = RG.actions = {};

  const ledger = (st, amount, cat, label, extra) => S.addLedger(st, Object.assign({ amount, cat, label }, extra || {}));

  // ---------- 農地 ----------
  A.acceptLand = function (st, offerId, mode) {
    const o = st.offers.land.find((x) => x.id === offerId);
    if (!o) return 'この話はもうありません';
    if (o.buy) {
      if (mode === 'loan') {
        const err = A.takeLoan(st, 'long20', o.price, true);
        if (err) return err;
      } else if (st.cash < o.price) return '資金が足りません';
      ledger(st, -o.price, 'asset', o.place + 'の田 ' + U.ha(o.area) + ' を購入');
    }
    st.fields.push(S.makePlot(st, { area: o.area, soil: o.soil, owned: o.buy, rent: o.rent, landValue: o.price, place: o.place }));
    S.addPlanArea(st, o.area);
    // 地域の信頼が上がるのは、だれも作りたがらない条件不利の田を引き受けたときだけ
    if (o.soil === 'poor') st.trust = Math.min(100, st.trust + 3);
    st.offers.land = st.offers.land.filter((x) => x.id !== offerId);
    return null;
  };

  A.returnLand = function (st, fieldId) {
    const f = st.fields.find((x) => x.id === fieldId);
    if (!f || f.owned) return '返せる借地ではありません';
    st.fields = st.fields.filter((x) => x.id !== fieldId);
    S.fitPlan(st);
    st.trust = Math.max(0, st.trust - 5);
    if (f.village && st.village) st.village.abandoned = U.round(st.village.abandoned + f.area, 1); // 棚田：返した集落の田は荒れてしまう
    return null;
  };

  // 売るときの値段：評価額に、田の条件ごとの割合をかける（条件不利地は買い手が少ない）
  A.landSalePrice = (f) => Math.round(f.landValue * (D.LAND_SALE[f.soil] || 0.9));
  // 農地を売ると、お金は入るが、ほかのものを失う（資金繰りの抜け道にしないため）
  A.LAND_SALE_BAN = 3; // 売ったあと、農地の話が来なくなる年数
  A.landSalePenalty = function (st, f) {
    const abandon = !!(f.village && st.village && f.soil === 'poor'); // 棚田：山の田は買った人も作らず荒れてしまう
    const big = st.rivals && st.rivals.find((x) => x.id === 'oyama' && x.active);
    return {
      trust: 8 + (f.soil === 'poor' ? 2 : 0) + (f.heritage ? 5 : 0),
      ban: A.LAND_SALE_BAN, abandon, buyer: !abandon && big ? '大山さん' : null,
      credit: Math.round(f.landValue * 0.3), // 融資枠（つなぎ資金の上限）のうち、農地を担保にしていた分
    };
  };
  A.landSaleLocked = (st) => (st.yearFlags.soldLand ? '農地の売却は1年に1枚までです' : null);
  A.sellLand = function (st, fieldId) {
    const f = st.fields.find((x) => x.id === fieldId);
    if (!f || !f.owned) return '売却できる農地ではありません';
    const lk = A.landSaleLocked(st);
    if (lk) return lk;
    const price = A.landSalePrice(f), p = A.landSalePenalty(st, f);
    ledger(st, price, 'assetSale', f.name + ' を売却', { gain: price - f.landValue });
    st.fields = st.fields.filter((x) => x.id !== fieldId);
    S.fitPlan(st);
    st.trust = Math.max(0, st.trust - p.trust);
    st.yearFlags.soldLand = true;
    st.flags.landSoldYear = st.year;
    st.flags.landSold = (st.flags.landSold || 0) + 1;
    if (f.heritage) st.flags.soldHeritage = (st.flags.soldHeritage || 0) + 1;
    if (p.abandon) st.village.abandoned = U.round(st.village.abandoned + f.area, 1);
    else if (p.buyer) { const big = st.rivals.find((x) => x.id === 'oyama'); big.area = U.round(big.area + f.area, 1); }
    return null;
  };

  // ---------- 機械 ----------
  A.newPrice = (st, modelId) => D.MODELS[modelId].price * st.market.matInfl * (st.yearFlags.machineSubsidy ? 0.5 : 1) *
    (st.path === 'sixth' && (D.MODELS[modelId].type === 'proc' || D.MODELS[modelId].type === 'stand') ? 0.7 : 1); // 6次産業化の道は3割引き

  // ストーリーでまだ使えない買い方・機種
  const locked = (st, id) => (RG.era && RG.era.featLocked(st, id) ? '🔒 まだ使えません（きっかけ：' + RG.era.FEATURES[id].hint + '）' : null);
  A.largeModel = (modelId) => /_l$/.test(modelId);
  // トラクター・田植機・コンバインは、乗れる人（自分・正社員・常雇用パート）の数までしか持てない
  A.operatorLock = function (st, modelId) {
    const md = D.MODELS[modelId];
    if (!md || SIM.DRIVEN_TYPES.indexOf(md.type) < 0) return null;
    const t = md.type;
    const n = SIM.machinesOf(st, t).length;
    return n >= S.operators(st) ? '🚜 乗れる人が足りません（' + D.MACHINE_TYPES[t].name + ' ' + n + '台・乗れる人 ' + S.operators(st) + '人）。正社員か常雇用パートを雇うと増やせます' : null;
  };
  A.machineLock = (st, modelId, mode) => (mode === 'lease' && locked(st, 'lease')) || (A.largeModel(modelId) && locked(st, 'large')) || A.operatorLock(st, modelId) || null;
  A.buyMachine = function (st, modelId, mode) {
    const md = D.MODELS[modelId];
    const lk = A.machineLock(st, modelId, mode);
    if (lk) return lk;
    if (mode === 'lease') {
      const m = S.makeMachine(st, modelId, { lease: true });
      m.leaseFee = Math.round(md.price * st.market.matInfl * D.MACHINE.leaseRate);
      st.machines.push(m);
      return null;
    }
    const subsidized = !!st.yearFlags.machineSubsidy;
    const price = Math.round(A.newPrice(st, modelId));
    if (mode === 'loan') {
      const err = A.takeLoan(st, 'long10', price, true);
      if (err) return err;
    } else if (st.cash < price) return '資金が足りません（借入で購入することもできます）';
    ledger(st, -price, 'asset', md.name + ' を購入' + (subsidized ? '（補助 1/2）' : ''));
    const nm = S.makeMachine(st, modelId, { cost: price });
    if (subsidized) nm.subsidized = true;
    st.machines.push(nm);
    if (subsidized) st.yearFlags.machineSubsidy = false;
    st.flags.boughtMachine = true;
    return null;
  };

  A.buyUsed = function (st, offerId, mode) {
    if (locked(st, 'used')) return locked(st, 'used');
    { const ou = st.offers.used.find((x) => x.id === offerId); if (ou && A.operatorLock(st, ou.model)) return A.operatorLock(st, ou.model); }
    const o = st.offers.used.find((x) => x.id === offerId);
    if (!o) return 'この中古機械はもうありません';
    if (mode === 'loan') {
      const err = A.takeLoan(st, 'long10', o.price, true);
      if (err) return err;
    } else if (st.cash < o.price) return '資金が足りません';
    const md = D.MODELS[o.model];
    ledger(st, -o.price, 'asset', '中古の' + md.name + '（' + o.age + '年使用）を購入');
    const life = Math.max(2, Math.round(md.life - o.age + o.age * 0.2));
    st.machines.push(S.makeMachine(st, o.model, { cost: o.price, age: o.age, life, used: true }));
    st.offers.used = st.offers.used.filter((x) => x.id !== offerId);
    return null;
  };

  A.sellMachine = function (st, machineId) {
    const m = st.machines.find((x) => x.id === machineId);
    if (!m) return '機械が見つかりません';
    if (m.lease) {
      ledger(st, -m.leaseFee, 'lease', D.MODELS[m.model].name + ' のリース中途解約金');
    } else {
      const v = SIM.marketValue(m);
      ledger(st, v, 'assetSale', D.MODELS[m.model].name + ' を売却', { gain: v - m.book });
    }
    st.machines = st.machines.filter((x) => x.id !== machineId);
    if (RG.biz) { const b = RG.biz.state(st); if (!RG.biz.has(st, 'combine')) b.harvest = 0; if (!RG.biz.has(st, 'drone')) b.drone = 0; } // 受託の計画も止める
    return null;
  };

  // ---------- 労働 ----------
  A.hireStaff = function (st, force) {
    if (!force && locked(st, 'staff')) return locked(st, 'staff');
    ledger(st, -D.LABOR.staffRecruit * st.market.wageInfl, 'recruit', '正社員の採用費');
    S.addStaff(st);
    return null;
  };
  A.hireRegular = function (st, candId) {
    const c = S.regularCandidates(st).find((x) => x.id === candId) || (candId == null ? Object.assign({ id: 'rx' + st.year + '_' + (st.regulars || []).length }, S.personOf(st, 'rauto', (st.regulars || []).length)) : null);
    if (!c) return 'この人はもう採用しました';
    st.regulars = st.regulars || [];
    st.regulars.push({ id: U.uid(st, 'rp'), from: c.id, name: c.name, age: c.age, note: c.note, skill: c.skill, wage: c.wage, years: 0 });
    ledger(st, -D.LABOR.regularRecruit * st.market.wageInfl, 'recruit', '常雇用パートの募集費');
    return null;
  };
  A.fireRegular = function (st, id) {
    st.regulars = (st.regulars || []).filter((x) => x.id !== id);
    return null;
  };
  A.fireStaff = function (st, staffId) {
    const s = st.staff.find((x) => x.id === staffId);
    if (!s) return '社員が見つかりません';
    ledger(st, -D.LABOR.staffSeverance, 'recruit', s.name + ' の退職金');
    st.staff = st.staff.filter((x) => x.id !== staffId);
    return null;
  };

  // ---------- 販売 ----------
  A.acceptContract = function (st, offerId) {
    const o = st.offers.contracts.find((x) => x.id === offerId);
    if (!o) return 'この話はもうありません';
    if ((D.CROPS[o.crop].unlock && !st.flags[D.CROPS[o.crop].unlock]) || (RG.era && RG.era.cropLocked(st, o.crop))) return 'この品種はまだ作付できません';
    st.contracts.push({ id: U.uid(st, 'c'), buyer: o.buyer, crop: o.crop, minCult: o.minCult, volume: o.volume, premium: o.premium, refPrice: o.refPrice, yearsLeft: o.years, years: o.years });
    st.offers.contracts = st.offers.contracts.filter((x) => x.id !== offerId);
    return null;
  };

  // ---------- 資金 ----------
  A.loanKinds = function (st) {
    const low = !!st.yearFlags.lowRate;
    const k = {
      long10: { name: '長期資金（10年）', rate: low ? D.MACHINE.lowRate : D.MACHINE.loanRate10, term: 10, kind: 'long' },
      long20: { name: '長期資金（20年）', rate: low ? D.MACHINE.lowRate : D.MACHINE.loanRate20, term: 20, kind: 'long' },
    };
    // 認定農業者向けの制度資金（ストーリーで認定を受けたあと）
    if (st.featOpen && st.featOpen.nintei) k.superL = { name: 'スーパーL資金（認定農業者向け・20年・当初' + D.MACHINE.superLYears + '年は利子助成）', rate: D.MACHINE.superLFirst, rateLater: D.MACHINE.loanRate20, rateYears: D.MACHINE.superLYears, term: 20, kind: 'long' };
    if (SIM.noInterestAvailable(st) > 0) {
      k.nointerest = { name: '青年等就農資金（無利子・' + D.FIN.noInterestTerm + '年・据置' + D.FIN.noInterestGrace + '年）', rate: 0, term: D.FIN.noInterestTerm, grace: D.FIN.noInterestGrace, kind: 'nointerest' };
    }
    return k;
  };

  // 新しい借入の審査：1年の件数と、前年の返済能力（債務償還年数）
  A.loanLock = function (st, forPurchase) {
    const n = (st.yearFlags || {}).newLoans || 0;
    if (!forPurchase && n >= D.FIN.loansPerYear) return '使い道を決めない運転資金の借入は1年に' + D.FIN.loansPerYear + '件までです（金融機関の審査に時間がかかるため。来年また申し込めます。機械・施設・農地を借入で買うのは別）';
    const an = st.lastResult && st.lastResult.analysis;
    if (an && an.debt > 0 && !(an.repayYears <= D.FIN.maxRepayYears)) return '前年の決算で、借入を返すのに' + (isFinite(an.repayYears) ? '約' + Math.round(an.repayYears) + '年' : '返す原資がなく、何年でも') + 'かかる見込みのため、新しい借入の審査に通りませんでした（' + D.FIN.maxRepayYears + '年以内が目安）';
    return null;
  };
  A.takeLoan = function (st, kindKey, amount, forPurchase) {
    amount = Math.round(amount);
    if (!(amount > 0)) return '金額を入力してください';
    const lk = A.loanLock(st, forPurchase);
    if (lk) return lk;
    const kinds = A.loanKinds(st);
    // 機械・施設・農地を買うときは、無利子資金の枠があればそれを使う（無利子資金は使い道が決まっている）
    if (forPurchase && kinds.nointerest && SIM.noInterestAvailable(st) >= amount) kindKey = 'nointerest';
    if (kindKey === 'nointerest' && !forPurchase) return '無利子資金は、機械・施設を買うときだけ使えます（「機械・設備」タブで借入で購入すると自動で使われます）';
    const k = kinds[kindKey];
    if (!k) return 'この借入は利用できません';
    if (k.kind === 'nointerest') {
      if (amount > SIM.noInterestAvailable(st)) return '無利子資金の残り枠（' + U.man(SIM.noInterestAvailable(st)) + '）を超えています';
      st.noInterestUsed += amount;
    } else if (amount > SIM.loanCapacity(st)) {
      return '借入可能額（' + U.man(SIM.loanCapacity(st)) + '）を超えています';
    }
    const grace = k.grace || 0;
    st.loans.push({ id: U.uid(st, 'l'), kind: k.kind, name: k.name.replace(/（.*）/, ''), original: amount, balance: amount,
      rate: k.rate, term: k.term, repayYears: k.term - Math.max(1, grace), yearsLeft: k.term - Math.max(1, grace), grace, newThisYear: true,
      rateLater: k.rateLater || null, rateYears: k.rateYears || 0 });
    ledger(st, amount, 'loanIn', k.name + ' を借入');
    if (!forPurchase) st.yearFlags.newLoans = ((st.yearFlags || {}).newLoans || 0) + 1; // 使い道を決めない借入（運転資金）だけ数える
    return null;
  };

  A.prepay = function (st, loanId, amount) {
    const l = st.loans.find((x) => x.id === loanId);
    if (!l) return '借入が見つかりません';
    amount = Math.min(Math.round(amount), l.balance);
    if (!(amount > 0)) return '金額を入力してください';
    if (amount > st.cash) return '資金が足りません';
    l.balance -= amount;
    if (l.kind === 'emergency') st.emergency = l.balance;
    ledger(st, -amount, 'loanOut', l.name + ' を繰上返済');
    if (l.balance <= 1) st.loans = st.loans.filter((x) => x.id !== loanId);
    else l.original = Math.min(l.original, l.balance * (l.repayYears || l.term) / Math.max(1, l.yearsLeft));
    return null;
  };

  A.repayEmergency = function (st, amount) {
    amount = Math.min(Math.round(amount), st.emergency || 0);
    if (!(amount > 0)) return '返済するつなぎ資金がありません';
    if (amount > st.cash) return '資金が足りません';
    st.emergency -= amount;
    ledger(st, -amount, 'loanOut', 'つなぎ資金を返済');
    return null;
  };

  // ---------- 作付計画 ----------
  A.setRowArea = function (st, rowId, area) {
    const r = st.plan.find((x) => x.id === rowId);
    if (!r) return '作付が見つかりません';
    const others = S.plannedArea(st) - r.area;
    r.area = U.round(Math.max(0, Math.min(area, S.totalArea(st) - others)), 1);
    return null;
  };
  A.addRow = function (st) {
    const used = new Set(st.plan.map((r) => r.crop));
    const crop = D.CROP_ORDER.find((k) => k !== 'none' && !used.has(k) && (!D.CROPS[k].unlock || st.flags[D.CROPS[k].unlock]) && !(RG.era && RG.era.cropLocked(st, k))) || 'koshiBL';
    st.plan.push(S.makeRow(st, crop, 'conv', 'transplant', Math.max(0, S.totalArea(st) - S.plannedArea(st))));
    return null;
  };
  A.removeRow = function (st, rowId) {
    st.plan = st.plan.filter((r) => r.id !== rowId);
    return null;
  };
})(window.RG = window.RG || {});
