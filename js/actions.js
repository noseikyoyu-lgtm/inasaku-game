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
    st.trust = Math.min(100, st.trust + (o.soil === 'poor' ? 4 : 2));
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

  A.sellLand = function (st, fieldId) {
    const f = st.fields.find((x) => x.id === fieldId);
    if (!f || !f.owned) return '売却できる農地ではありません';
    const price = Math.round(f.landValue * 0.9);
    ledger(st, price, 'assetSale', f.name + ' を売却', { gain: price - f.landValue });
    st.fields = st.fields.filter((x) => x.id !== fieldId);
    S.fitPlan(st);
    st.trust = Math.max(0, st.trust - 3);
    return null;
  };

  // ---------- 機械 ----------
  A.newPrice = (st, modelId) => D.MODELS[modelId].price * st.market.matInfl * (st.yearFlags.machineSubsidy ? 0.5 : 1) *
    (st.path === 'sixth' && (D.MODELS[modelId].type === 'proc' || D.MODELS[modelId].type === 'stand') ? 0.7 : 1); // 6次産業化の道は3割引き

  A.buyMachine = function (st, modelId, mode) {
    const md = D.MODELS[modelId];
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
    return null;
  };

  A.buyUsed = function (st, offerId, mode) {
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
    return null;
  };

  // ---------- 労働 ----------
  A.hireStaff = function (st) {
    ledger(st, -D.LABOR.staffRecruit * st.market.wageInfl, 'recruit', '正社員の採用費');
    S.addStaff(st);
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
    if (D.CROPS[o.crop].unlock && !st.flags[D.CROPS[o.crop].unlock]) return 'この品種はまだ作付できません';
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
    if (SIM.noInterestAvailable(st) > 0) {
      k.nointerest = { name: '新規就農者向け無利子資金（12年・据置2年）', rate: 0, term: D.FIN.noInterestTerm, grace: D.FIN.noInterestGrace, kind: 'nointerest' };
    }
    return k;
  };

  A.takeLoan = function (st, kindKey, amount, silentPrefer) {
    amount = Math.round(amount);
    if (!(amount > 0)) return '金額を入力してください';
    const kinds = A.loanKinds(st);
    // 新規就農者は無利子資金を優先して使う
    if (silentPrefer && kinds.nointerest && SIM.noInterestAvailable(st) >= amount) kindKey = 'nointerest';
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
      rate: k.rate, term: k.term, repayYears: k.term - Math.max(1, grace), yearsLeft: k.term - Math.max(1, grace), grace, newThisYear: true });
    ledger(st, amount, 'loanIn', k.name + ' を借入');
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
    const crop = D.CROP_ORDER.find((k) => k !== 'none' && !used.has(k) && (!D.CROPS[k].unlock || st.flags[D.CROPS[k].unlock])) || 'koshiBL';
    st.plan.push(S.makeRow(st, crop, 'conv', 'transplant', Math.max(0, S.totalArea(st) - S.plannedArea(st))));
    return null;
  };
  A.removeRow = function (st, rowId) {
    st.plan = st.plan.filter((r) => r.id !== rowId);
    return null;
  };
})(window.RG = window.RG || {});
