// 会計：損益計算書・貸借対照表・税金・原価分析（DOM 非依存）
(function (RG) {
  'use strict';
  const D = RG.data, U = RG.util;
  const A = RG.accounting = {};

  // ---------- 貸借対照表 ----------
  A.bs = function (st) {
    const cash = st.cash;
    const receivables = U.sum(st.receivables || [], (r) => r.amount);
    const machines = U.sum(st.machines.filter((m) => !m.lease), (m) => m.book);
    const land = U.sum(st.fields.filter((f) => f.owned), (f) => f.landValue || 0);
    const inventory = st.stock ? st.stock.value || 0 : 0; // 保管米（棚卸資産）
    const assets = cash + receivables + inventory + machines + land;
    const longLoans = U.sum(st.loans.filter((l) => l.kind !== 'short'), (l) => l.balance);
    const emergency = st.emergency || 0;
    const taxPayable = st.taxPayable || 0;
    const liabilities = longLoans + emergency + taxPayable;
    const equity = assets - liabilities;
    return { cash, receivables, inventory, machines, land, assets, longLoans, emergency, taxPayable, liabilities, equity,
      equityRatio: assets > 0 ? equity / assets : 0 };
  };

  // ---------- 税金 ----------
  A.taxIndividual = function (income) {
    const taxable = Math.max(0, income - 1430000); // 青色申告控除・基礎控除など
    let it;
    if (taxable <= 1950000) it = taxable * 0.05;
    else if (taxable <= 3300000) it = taxable * 0.10 - 97500;
    else if (taxable <= 6950000) it = taxable * 0.20 - 427500;
    else if (taxable <= 9000000) it = taxable * 0.23 - 636000;
    else if (taxable <= 18000000) it = taxable * 0.33 - 1536000;
    else it = taxable * 0.40 - 2796000;
    const resident = taxable * 0.10;
    const nhi = Math.min(Math.max(0, income - 430000) * 0.10, 1060000); // 国民健康保険料（概算）
    return Math.max(0, it) + resident + nhi + 50000;
  };

  A.taxCorp = function (profit, lossCarry) {
    lossCarry = lossCarry || 0;
    let taxable = profit;
    let used = 0;
    if (profit > 0) { used = Math.min(lossCarry, profit); taxable = profit - used; }
    const newLoss = profit < 0 ? lossCarry - profit : lossCarry - used;
    taxable = Math.max(0, taxable);
    const tax = 70000 + (taxable <= 8000000 ? taxable * 0.25 : 8000000 * 0.25 + (taxable - 8000000) * 0.34);
    return { tax, used, newLoss };
  };

  // ---------- 損益計算書 ----------
  // rec: 科目ごとの金額（すべて正の値）、gains: 特別損益
  A.buildPL = function (st, rec, special) {
    const lines = { sales: [], expense: [], nonopIncome: [], nonopExpense: [] };
    for (const k in D.PL_CATS) {
      const c = D.PL_CATS[k];
      const v = rec[k] || 0;
      if (Math.abs(v) < 0.5) continue;
      lines[c.kind].push({ key: k, label: c.label, value: v, group: c.group });
    }
    const t = (arr) => U.sum(arr, (x) => x.value);
    const sales = t(lines.sales);
    const expense = t(lines.expense);
    const operating = sales - expense;
    const nonopIncome = t(lines.nonopIncome);
    const nonopExpense = t(lines.nonopExpense);
    const ordinary = operating + nonopIncome - nonopExpense;
    const preTax = ordinary + (special || 0);
    const fixed = U.sum(lines.expense.filter((x) => x.group === 'fix'), (x) => x.value) + nonopExpense;
    const variable = U.sum(lines.expense.filter((x) => x.group === 'var'), (x) => x.value);
    return { lines, sales, expense, operating, nonopIncome, nonopExpense, ordinary, special: special || 0, preTax,
      fixed, variable, get: (k) => rec[k] || 0 };
  };

  // 家族・経営者の手に入る所得（個人＝農業所得、法人＝経常利益＋役員報酬）
  A.ownerIncome = function (st, pl) {
    return st.corp ? pl.preTax + (pl.get('execPay') || 0) / 1.15 : pl.preTax;
  };

  // ---------- 原価・経営分析 ----------
  A.analyze = function (st, res, bs) {
    const pl = res.pl;
    const area10a = res.area.planted * 10;
    const marketArea10a = res.area.marketCrop * 10;
    const marketBales = res.production.marketBales;
    const familyHours = res.labor.familyHoursUsed;
    const familyLaborCost = familyHours * D.LABOR.familyValue;
    const totalCost = pl.expense + pl.nonopExpense;
    const other = pl.nonopIncome;
    const income = A.ownerIncome(st, pl);

    const costPer10a = area10a > 0 ? totalCost / area10a : 0;
    const fullCostPer10a = area10a > 0 ? (totalCost + familyLaborCost) / area10a : 0;
    // 主食用（販売用）米の60kgあたり生産費：面積比で費用を按分
    const share = area10a > 0 ? marketArea10a / area10a : 0;
    const costPer60 = marketBales > 0 ? (totalCost * share) / marketBales : 0;
    const fullCostPer60 = marketBales > 0 ? ((totalCost + familyLaborCost) * share) / marketBales : 0;

    // 損益分岐
    const revPer10a = area10a > 0 ? (pl.sales + pl.get('subsidy')) / area10a : 0;
    const varPer10a = area10a > 0 ? pl.variable / area10a : 0;
    const marginPer10a = revPer10a - varPer10a;
    const fixedNet = pl.fixed - (other - pl.get('subsidy'));
    const bepArea = marginPer10a > 0 ? Math.max(0, fixedNet) / marginPer10a / 10 : Infinity;
    const living = st.corp ? 0 : st.living; // 分岐点は平均の家計費で見る
    const bepAreaLiving = marginPer10a > 0 ? Math.max(0, fixedNet + living) / marginPer10a / 10 : Infinity;
    // 損益分岐米価：販売用米以外の収入を差し引いた残りの費用を販売用米の俵数で割る
    const nonMarketRev = pl.get('feedSales') + other;
    const bepPrice = marketBales > 0 ? (totalCost - nonMarketRev) / marketBales : 0;
    const bepPriceLiving = marketBales > 0 ? (totalCost - nonMarketRev + living) / marketBales : 0;

    const marginRatio = pl.sales > 0 ? (pl.sales - pl.variable) / pl.sales : 0;

    // 返済能力
    const afterTax = pl.preTax - res.tax.amount - (st.corp ? 0 : res.living != null ? res.living : st.living);
    const repaySource = afterTax + pl.get('depreciation');
    const debt = bs.longLoans + bs.emergency;
    const repayYears = debt <= 0 ? 0 : repaySource > 0 ? debt / repaySource : Infinity;

    const hourlyIncome = familyHours > 0 ? income / familyHours : 0;

    return {
      area10a, costPer10a, fullCostPer10a, costPer60, fullCostPer60, familyLaborCost,
      revPer10a, varPer10a, marginPer10a, fixedNet, bepArea, bepAreaLiving, bepPrice, bepPriceLiving, marginRatio,
      afterTax, repaySource, debt, repayYears, hourlyIncome, income,
      equityRatio: bs.equityRatio,
    };
  };
})(window.RG = window.RG || {});
