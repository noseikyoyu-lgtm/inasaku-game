// 経営の先行き：これからの山場（節目の警告）、「今のやり方のまま続けたら」の試算、高橋さんの見立て（DOM 非依存）
(function (RG) {
  'use strict';
  const D = RG.data, U = RG.util;
  const OL = RG.outlook = {};

  // ---------- 評価の物差し（最終評価・中間評価・地域の農家で共通） ----------
  RG.RANKS = [['S', 85], ['A', 70], ['B', 55], ['C', 40], ['D', 0]];
  RG.RANK_TITLES = { S: '地域を代表する稲作経営者', A: '安定した担い手経営', B: '堅実な家族経営', C: 'もう一歩の経営', D: '苦しい経営' };

  // v: { eqGain, avgInc, ratio, area, trust, brand } から得点を出す（最終評価と中間評価で共通）
  RG.scoreFrom = function (v) {
    const items = [
      { key: 'equity', label: '純資産の増加', value: U.man(v.eqGain), pts: U.clamp((v.eqGain / 1.2e8) * 30, 0, 30), max: 30, goal: '20年で1億2,000万円' },
      { key: 'income', label: '経営者・家族の平均所得（年）', value: U.man(v.avgInc), pts: U.clamp((v.avgInc / 1.2e7) * 30, 0, 30), max: 30, goal: '年1,200万円' },
      { key: 'ratio', label: '自己資本比率', value: U.pct(v.ratio), pts: U.clamp((v.ratio / 0.6) * 15, 0, 15), max: 15, goal: '60%' },
      { key: 'area', label: '経営面積', value: U.ha(v.area), pts: U.clamp((v.area / 40) * 10, 0, 10), max: 10, goal: '40ha' },
      { key: 'trust', label: '地域の信頼', value: U.num(v.trust), pts: U.clamp(v.trust / 100, 0, 1) * 7.5, max: 7.5, goal: '100' },
      { key: 'brand', label: 'ブランド力', value: U.num(v.brand), pts: U.clamp(v.brand / 100, 0, 1) * 7.5, max: 7.5, goal: '100' },
    ];
    const total = U.sum(items, (x) => x.pts);
    const rank = RG.RANKS.find((r) => total >= r[1])[0];
    return { items, total, rank, title: RG.RANK_TITLES[rank], eqGain: v.eqGain, avgInc: v.avgInc };
  };


  // ---------- これからの山場 ----------
  // baseYear：何年目から見た山場か（決算の後に「来年から見て」使うときは st.year + 1）
  OL.milestones = function (st, horizon, baseYear) {
    horizon = horizon || 5;
    const S = RG.state, A = RG.actions;
    const out = [];
    const y0 = baseYear || st.year;
    st.machines.forEach((m) => {
      const md = D.MODELS[m.model];
      if (m.lease || !md.maxAge) return;
      const left = md.maxAge - m.age; // 0 になった年の初めに使えなくなる
      if (left > horizon) return;
      const price = A.newPrice(st, m.model);
      out.push({ year: y0 + left, kind: 'machine', level: left <= 1 ? 'bad' : 'warn', cost: price,
        text: md.name + '（' + m.age + '年使用）' + (left <= 1 ? 'は今年が最後のシーズン。来年から使えなくなる' : 'が' + left + '年後に寿命') + '。買い替えると約' + U.man(price) });
    });
    // 年齢はその年の作業時の年齢。決算で1歳とり、80歳になった年の決算で引退する
    const heir = S.heirAtRetire(st);
    st.family.forEach((f) => {
      if (f.age == null || f.tag === 'retired') return;
      const op = f.tag === 'operator';
      const age0 = Number(f.age);
      const kRet = D.AGING.retire - 1 - age0; // 何年後の決算で引退するか
      if (kRet >= 0 && kRet <= horizon) {
        out.push({ year: y0 + kRet, kind: 'retire', level: op && !heir ? 'bad' : 'warn',
          text: f.name + 'は' + (kRet === 0 ? '今年' : kRet + '年後') + 'の決算で' + D.AGING.retire + '歳になり、農作業から引退する' +
            (op ? (heir ? '。経営を' + heir.name + (heir.planned ? '（就農予定）' : '') + 'に引き継ぐ' : S.successor(st) || S.pendingSuccessor(st) ? '。後継者がまだ若く引き継げないため、経営を続けられなくなる' : '。後継者がいないため、経営を続けられなくなる') : '') });
      }
      [66, 75].forEach((age) => {
        const k = age - age0;
        if (k < 0 || k > horizon || (age === 75 && !op)) return;
        out.push({ year: y0 + k, kind: 'age', level: 'info',
          text: f.name + 'が' + age + '歳になる。働ける時間は' + (age === 66 ? 'この年から少しずつ減っていく' : '若いころの約' + U.pct(S.ageFactor(age)) + 'まで減る') });
      });
    });
    st.loans.forEach((l) => {
      if (l.kind === 'emergency' || l.yearsLeft > horizon || l.yearsLeft <= 0) return;
      out.push({ year: y0 + l.yearsLeft - 1, kind: 'loan', level: 'good', text: l.name + 'の返済が終わる（' + (y0 + l.yearsLeft - 1) + '年目の12月）' });
    });
    if (st.grant && st.year <= st.grant.years && st.grant.years - st.year < horizon) {
      out.push({ year: st.grant.years, kind: 'grant', level: 'warn', text: '就農支援金（年' + U.man(st.grant.amount) + '）は' + st.grant.years + '年目で終わる。それ以降は農業所得だけで生活することになる' });
    }
    return out.sort((a, b) => a.year - b.year);
  };

  // 今後 years 年で寿命を迎える機械を同じ機種で買い替えた場合の費用
  OL.replacementCost = function (st, years) {
    return U.sum(st.machines.filter((m) => !m.lease && D.MODELS[m.model].maxAge && D.MODELS[m.model].maxAge - m.age <= years),
      (m) => RG.actions.newPrice(st, m.model));
  };

  // ---------- 「今のやり方のまま」の1年の進め方 ----------
  // 規模も販路も変えず、寿命の来た機械は同じ機種に買い替え（借りられなければ委託）、人手が足りなければパートを増やす
  OL.statusQuoPlan = function (st) {
    const SIM = RG.sim, A = RG.actions;
    if (RG.dice) RG.dice.auto(st);
    while (st.events.queue.length) RG.events.choose(st, st.events.queue[0], RG.events.statusQuoChoice(st.events.queue[0]));
    (st.scrapped || []).forEach((model) => {
      const price = A.newPrice(st, model);
      if (SIM.loanCapacity(st) >= price) A.buyMachine(st, model, 'loan');
    });
    st.scrapped = [];
    for (let i = 0; i < 12; i++) {
      const pv = SIM.simulate(st, { preview: true });
      if (D.SEASONS.some((s) => pv.labor.seasons[s].ratio > 0.01)) st.partTimers += 1; else break;
    }
    const pv = SIM.simulate(st, { preview: true });
    st.shortLoan = pv.cash.minBalance < 500000 ? Math.min(SIM.shortLoanLimit(st), Math.ceil((500000 - pv.cash.minBalance) / 100000) * 100000) : 0;
  };

  function runOne(snapshot, seed) {
    const S = RG.state, SIM = RG.sim;
    const st = S.fromJSON(snapshot);
    st.seed = seed;
    S.beginYear(st);
    while (st.phase !== 'end' && st.phase !== 'gameover') {
      OL.statusQuoPlan(st);
      SIM.apply(st, SIM.simulate(st));
      S.nextYear(st);
    }
    const h = st.history, last = h[h.length - 1];
    return {
      seed, over: !!st.gameOver, reason: st.gameOver ? st.gameOver.reason : null, endYear: last.year,
      retired: st.retired ? st.retired.year : null, equity: last.equity, avgIncome: U.avg(h.map((x) => x.income)),
      minCash: Math.min.apply(null, h.map((x) => x.minCash)), crisisYear: (h.find((x) => x.emergencyPeak > 1) || {}).year || null,
      incomes: h.map((x) => x.income), equities: h.map((x) => x.equity),
    };
  }

  // 天候を変えて何通りも試算する。1回ごとに処理を区切って画面を止めない
  OL.runBaseline = function (st, n, onProgress, onDone) {
    const seeds = [st.seed];
    for (let i = 1; i < n; i++) seeds.push(RG.rng.hash(st.seed, 'baseline', i) % 900000 + 100000);
    const runs = [];
    let i = 0;
    const step = () => {
      try { runs.push(runOne(st.initialSnapshot, seeds[i])); } catch (e) { console.error(e); }
      i += 1;
      if (onProgress) onProgress(i, n);
      if (i < n) setTimeout(step, 0); else onDone(OL.summarize(runs));
    };
    setTimeout(step, 0);
  };
  OL.runBaselineSync = function (st, n) {
    const runs = [];
    for (let i = 0; i < n; i++) runs.push(runOne(st.initialSnapshot, i === 0 ? st.seed : RG.rng.hash(st.seed, 'baseline', i) % 900000 + 100000));
    return OL.summarize(runs);
  };

  OL.summarize = function (runs) {
    const ok = runs.filter((r) => !r.over);
    const sorted = (arr) => arr.slice().sort((a, b) => a - b);
    const med = (arr) => { const s = sorted(arr); return s.length ? s[Math.floor((s.length - 1) / 2)] : 0; };
    const fails = runs.filter((r) => r.over);
    return {
      n: runs.length, survived: ok.length, rate: runs.length ? ok.length / runs.length : 0,
      equityMed: med(runs.map((r) => r.equity)), equityLow: sorted(runs.map((r) => r.equity))[Math.floor(runs.length * 0.1)] || 0,
      incomeMed: med(runs.map((r) => r.avgIncome)),
      failCash: fails.filter((r) => r.reason === 'cash').length, failInsolvent: fails.filter((r) => r.reason === 'insolvent').length,
      failYearMed: fails.length ? med(fails.map((r) => r.endYear)) : null,
      crisisYearMed: runs.some((r) => r.crisisYear) ? med(runs.filter((r) => r.crisisYear).map((r) => r.crisisYear)) : null,
      retiredYear: runs.find((r) => r.retired) ? med(runs.filter((r) => r.retired).map((r) => r.retired)) : null,
      same: runs[0], incomesMed: runs[0] ? runs[0].incomes.map((_, i) => med(runs.filter((r) => r.incomes[i] != null).map((r) => r.incomes[i]))) : [],
    };
  };

  // ---------- 高橋さんの見立て ----------
  OL.assess = function (st, base) {
    const out = [];
    const hs = st.history;
    if (!hs.length) return out;
    const first = hs[0], last = hs[hs.length - 1];
    const S = RG.state;
    const init = st.initialSnapshot ? S.fromJSON(st.initialSnapshot) : null;
    const say = (level, title, text) => out.push({ level, title, text });

    if (base) {
      const r = base.rate;
      say(r >= 0.9 ? 'good' : r >= 0.6 ? 'warn' : 'bad', '今のやり方のまま続けた場合',
        '始めたときのやり方（規模・品種・販路はそのまま、寿命の来た機械だけ同じ機種に買い替え）で、天候の違う' + base.n + '通りの20年を試算しました。そのうち ' + base.survived + '通りで' + (base.retiredYear ? '引退まで' : '最後まで') + '続けられました。' +
        (r >= 0.9 ? '悪い年が重なっても持ちこたえられる、足腰の強い経営です。' : r >= 0.6 ? '多くの場合は続けられますが、悪い年が重なると資金が苦しくなります。' : '今のやり方のままでは、続けていくのは難しい可能性が高いと言えます。'));
      if (base.failCash + base.failInsolvent > 0) {
        say('bad', 'つまずきやすい時期', '続けられなかった場合の多くは' + (base.failCash >= base.failInsolvent ? '資金繰り（つなぎ資金が融資枠を超える）' : '赤字が続いての債務超過') + 'で、' +
          'だいたい' + base.failYearMed + '年目ごろでした。' + (base.crisisYearMed ? '最初に資金が足りなくなるのは、だいたい' + base.crisisYearMed + '年目です。' : ''));
      }
      if (base.retiredYear) say('warn', '引退の時期', '今のままだと、だいたい' + base.retiredYear + '年目の決算で経営主が80歳を迎え、引き継げる後継者がいないため経営を終えることになります。農地や機械をどうするか、早めに考えておく必要があります。');
      const s = base.same;
      if (s) {
        const diff = last.equity - s.equity;
        const you = st.gameOver ? 'あなたは' + st.gameOver.year + '年目で経営を続けられなくなりました' : st.retired ? 'あなたは' + st.retired.year + '年目に引退を迎えました' : 'あなたは20年続けました';
        say(diff >= 0 ? 'good' : 'warn', '同じ天候で比べると',
          '今回とまったく同じ天候・米価で「今のまま」だった場合は' + (s.over ? s.endYear + '年目で続けられなくなりました' : '最後の純資産が ' + U.man(s.equity) + ' でした') + '。' + you +
          '（純資産 ' + U.man(last.equity) + '）。' + (Math.abs(diff) > 1e6 ? 'あなたの判断で純資産が ' + U.man(Math.abs(diff)) + (diff >= 0 ? ' 多くなりました。' : ' 少なくなりました。') : '大きな差はありませんでした。'));
      }
    }

    // あなたが変えたこと
    if (init) {
      const ch = [];
      const a0 = S.totalArea(init), a1 = last.area;
      if (Math.abs(a1 - a0) >= 1) ch.push('経営面積 ' + U.ha(a0) + ' → ' + U.ha(a1));
      const kinds = (s) => new Set(s.plan.filter((r) => r.area > 0).map((r) => r.crop)).size;
      if (kinds(st) !== kinds(init)) ch.push('作付する品種 ' + kinds(init) + '種類 → ' + kinds(st) + '種類');
      if (st.staff.length !== init.staff.length) ch.push('正社員 ' + init.staff.length + '人 → ' + st.staff.length + '人');
      if (Math.abs(st.direct.customers - init.direct.customers) >= 20) ch.push('直販のお客さん ' + init.direct.customers + '人 → ' + st.direct.customers + '人');
      if (st.contracts.length) ch.push('契約栽培 ' + st.contracts.length + '件');
      if (st.insurance !== 'none') ch.push(D.INSURANCE[st.insurance].name + 'に加入');
      if (st.corp && !init.corp) ch.push('法人化');
      if (ch.length) say('info', 'あなたが変えたこと', ch.join('、') + '。それぞれが所得や資金繰りにどう効いたか、年ごとの記録と見比べてみましょう。');
    }

    // 実際の経営で確かめたいこと
    const chk = [];
    if (first.costPer60 > 0) chk.push('1年目の販売用米60kgあたり生産費は ' + U.yen(first.costPer60) + '（米価 ' + U.yen(first.price) + '）。家族労働費を除いた金額なので、実際の決算書でも計算してみましょう。');
    if (isFinite(first.bepArea) && first.bepArea > 0) chk.push('1年目の損益分岐面積は ' + U.ha(first.bepArea) + '（作付 ' + U.ha(first.planted) + '）。' + (first.bepArea > first.planted ? '面積が分岐点に届いていません。' : '分岐点は超えています。'));
    if (init) {
      const cost10 = OL.replacementCost(init, 10);
      if (cost10 > 0) chk.push('始めたときの機械を同じ機種で買い替えると、10年以内に約 ' + U.man(cost10) + ' が必要でした。積み立てや借入の計画はありますか。減価償却の終わった古い機械を使っていると生産費は安く見えますが、買い替えた後は減価償却費の分だけ生産費が上がります。');
      const op = S.operator(init);
      if (op && op.age != null && op.age + 20 >= D.AGING.retire && !S.heirAtRetire(init)) chk.push('経営主は始めたとき' + op.age + '歳で、' + Math.max(1, D.AGING.retire - op.age) + '年目の決算で' + D.AGING.retire + '歳になります。後継者や農地・機械の引き受け手を、誰とどう話しておくかを考えておきましょう。');
    }
    const incAvg = U.avg(hs.map((x) => x.income));
    if (!st.corp) chk.push(hs.length + '年間の平均の農業所得は ' + U.man(incAvg) + '。家計費（' + U.man(st.living) + '）と税金をまかなえていたかが、続けられるかどうかの分かれ目です。');
    if (chk.length) say('tip', '実際の経営で確かめたいこと', chk.join(' '));
    return out;
  };
})(window.RG = window.RG || {});
