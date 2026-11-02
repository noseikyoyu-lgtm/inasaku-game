// 地域のライバル農家：同じ集落で、同じ天候・米価のもとで20年を過ごす6つの経営（個人の農家・集落法人・営農組合）
// プレイヤーと同じ物差し（RG.scoreFrom）で比べる。DOM 非依存
(function (RG) {
  'use strict';
  const D = RG.data, U = RG.util;
  const RV = RG.rivals = {};

  // style：grow 規模拡大型 / craft こだわり直販型 / part 兼業・現状維持 / group 集落法人 / coop 営農組合 / young 新規就農
  // sprite：顔の絵（集落法人・営農組合は代表の顔）。payout：もうけのうち、構成員に分ける割合（法人・組合）
  RV.DEFS = [
    { id: 'oyama', name: '大山さん', style: 'grow', label: '規模拡大型', age: 45, area: 20, equity: 45000000, debt: 30000000, trust: 50, brand: 10,
      priceMult: 1.0, var10a: 99000, fixedBase: 2200000, fixedPerHa: 80000, living: 5000000, sprite: 'oyama',
      desc: '借入をして機械をそろえ、離農する人の田を次々に引き受けている。' },
    { id: 'ogawa', name: '小川さん', style: 'craft', label: 'こだわり直販型', age: 38, area: 8, equity: 15000000, debt: 8000000, trust: 55, brand: 45,
      priceMult: 1.45, var10a: 112000, fixedBase: 1300000, fixedPerHa: 60000, living: 3800000, sprite: 'ogawa',
      desc: '特別栽培の米をインターネットで直販している。面積は広げず、単価で勝負。' },
    { id: 'tamura', name: '田村さん', style: 'part', label: '兼業・現状維持', age: 66, area: 5, equity: 20000000, debt: 0, trust: 70, brand: 0,
      priceMult: 1.0, var10a: 98000, fixedBase: 1300000, fixedPerHa: 50000, living: 0, retireAge: 75, sprite: 'tamura',
      desc: '勤めながら、親から継いだ田を守っている。後継ぎはいない。' },
    { id: 'higashino', name: '農事組合法人ひがし野', style: 'group', label: '集落法人（代表 石井さん）', age: 63, area: 30, equity: 25000000, debt: 15000000, trust: 85, brand: 15,
      priceMult: 1.0, var10a: 102000, fixedBase: 7500000, fixedPerHa: 80000, living: 0, payout: 0.3, sprite: 'ishii',
      desc: '集落の田をまとめて預かる法人。社員を雇い、機械を共同で持つ。引退する人の田の受け皿になっている。' },
    { id: 'nishikawa', name: '西川営農組合', style: 'coop', label: '営農組合（組合長 西川さん）', age: 71, area: 18, equity: 8000000, debt: 3000000, trust: 75, brand: 0,
      priceMult: 1.0, var10a: 96000, fixedBase: 900000, fixedPerHa: 55000, living: 0, payout: 0.6, retireAge: 81, sprite: 'nishikawa',
      desc: '近所の農家どうしで機械を共同で使う組合。もうけは組合員で分ける。組合員の高齢化が悩み。' },
    { id: 'hayashi', name: '林さん', style: 'young', label: '新規就農', age: 31, area: 4, equity: 3000000, debt: 5000000, trust: 30, brand: 5,
      priceMult: 1.15, var10a: 101000, fixedBase: 900000, fixedPerHa: 65000, living: 2800000, sprite: 'hayashi',
      desc: '会社をやめて農業を始めた。借入で中古の機械をそろえ、少しずつ田を増やしている。' },
  ];
  const END_WORD = { retire: '引退', fail: '離農', dissolve: '解散' };
  RV.def = (id) => RV.DEFS.find((d) => d.id === id);

  const fresh = (d) => ({ id: d.id, age: d.age, area: d.area, equity: d.equity, debt: d.debt, initEquity: d.equity,
    trust: d.trust, brand: d.brand, incomes: [], active: true, endYear: null, endReason: null });
  RV.init = function (st) { st.rivals = RV.DEFS.map(fresh); };
  // 3人だった古いセーブに、あとから加わった経営を足す（これまでの年の所得は、今年から数える）
  RV.fill = function (st) {
    if (!st.rivals) return RV.init(st);
    RV.DEFS.forEach((d) => { if (!st.rivals.some((r) => r.id === d.id)) st.rivals.push(fresh(d)); });
  };

  // 1年進める（プレイヤーの決算のあと）。res：プレイヤーのその年の結果（同じ天候・米価）
  RV.advance = function (st, res) {
    if (!st.rivals) RV.init(st);
    const W = st.world;
    const yieldIdx = (W.nationalIndex || 100) / 100;
    const notes = [];
    st.rivals.forEach((r, i) => {
      if (!r.active) return;
      const d = RV.def(r.id);
      const rng = RG.rng.make(st.seed, st.year, 'rival', i);
      const y10 = 540 * yieldIdx * (0.94 + rng.next() * 0.12);
      const scale = d.style === 'grow' ? Math.max(0.85, 1 - 0.004 * r.area) : 1; // 規模が大きいほど10aあたりの費用が下がる
      const revenue = r.area * 10 * (y10 / 60) * res.price * d.priceMult;
      const cost = r.area * 10 * d.var10a * scale * st.market.matInfl + d.fixedBase + d.fixedPerHa * r.area + r.debt * 0.015;
      const income = revenue - cost;
      r.incomes.push(Math.round(income));
      r.equity += income - d.living - Math.max(0, income) * (0.15 + (d.payout || 0));
      // 借入の返済と新たな借入
      if (d.style === 'grow') {
        const repay = Math.min(r.debt, 2500000);
        r.debt -= repay;
        // 黒字なら田を引き受けて広げる（機械の追加投資を借入で）
        if (income > 0 && r.area < 70 && rng.chance(0.6)) {
          const add = U.round(1 + rng.next() * 2, 1);
          r.area = U.round(r.area + add, 1);
          r.debt += add * 1500000;
        }
      } else if (d.style === 'craft') {
        r.debt = Math.max(0, r.debt - 1000000);
        r.brand = Math.min(90, r.brand + 2);
      } else if (d.style === 'group') {
        // 集落の田を少しずつ預かる（借入はゆっくり返す）
        r.debt = Math.max(0, r.debt - 1500000);
        if (income > 0 && r.area < 45 && rng.chance(0.4)) r.area = U.round(r.area + 0.5 + rng.next(), 1);
        r.trust = Math.min(95, r.trust + 1);
      } else if (d.style === 'coop') {
        r.debt = Math.max(0, r.debt - 500000);
      } else if (d.style === 'young') {
        // 黒字の年は少しずつ田を増やす（中古の機械を借入で）
        r.debt = Math.max(0, r.debt - 600000);
        if (income > 0 && r.area < 12 && rng.chance(0.5)) {
          const add = U.round(0.5 + rng.next(), 1);
          r.area = U.round(r.area + add, 1);
          r.debt += add * 800000;
        }
        r.trust = Math.min(70, r.trust + 2);
        r.brand = Math.min(50, r.brand + 1);
      }
      r.age += 1;
      // 離農：兼業の人は75歳で引退、営農組合は組合長が81歳になると組合員の高齢化で解散、どこも純資産が大きく減ると離農
      if (d.retireAge && r.age >= d.retireAge) end(st, r, d.style === 'coop' ? 'dissolve' : 'retire', notes);
      else if (r.equity - r.debt < -15000000 || r.equity < -20000000) end(st, r, 'fail', notes);
    });
    return notes;
  };

  function end(st, r, reason, notes) {
    const d = RV.def(r.id);
    r.active = false; r.endYear = st.year; r.endReason = reason;
    // 離農した人の田は、まずプレイヤーに話が来る（地域の信頼が高いほど多く）。残りは集落法人へ（なければ大山さんへ）
    const share = U.clamp(0.4 + st.trust / 150, 0.4, 1);
    const area = U.round(r.area * share, 1);
    const why = reason === 'retire' ? '年齢のため引退する' : reason === 'dissolve' ? '組合員の高齢化で組合を解散する' : '経営が立ち行かなくなった';
    st.rivalLand = (st.rivalLand || []).concat([{ id: r.id, owner: d.name, area, reason: why }]);
    const taker = ['higashino', 'oyama'].map((id) => st.rivals.find((x) => x.id === id)).find((x) => x && x.active && x !== r);
    if (taker) taker.area = U.round(taker.area + r.area - area, 1);
    r.area = 0;
    const what = reason === 'retire' ? r.age + '歳で引退した' : reason === 'dissolve' ? '組合員の高齢化で解散した' : '経営が立ち行かなくなり離農した';
    notes.push(d.name + '（' + d.label + '）が' + what + '。田んぼ ' + U.ha(area) + 'を引き受けてほしいと話が来ている（「農地」タブ）。');
  }

  // 離農した人の田を、年初の農地のオファーにする
  RV.landOffers = function (st) {
    const out = (st.rivalLand || []).map((x, i) => ({ id: 'L' + st.year + '_rv' + i, owner: x.owner, reason: x.reason, place: '同じ集落',
      area: x.area, soil: 'normal', buy: false, rent: 9000, price: Math.round(x.area * 10 * 800000), price10a: 800000, rival: x.id }));
    st.rivalLand = [];
    return out;
  };

  // 評価（プレイヤーと同じ物差し）
  RV.score = function (st, r) {
    const d = RV.def(r.id);
    const assets = Math.max(1, r.equity + r.debt);
    return RG.scoreFrom({ eqGain: r.equity - r.initEquity, avgInc: r.incomes.length ? U.avg(r.incomes) : 0,
      ratio: r.equity > 0 ? r.equity / assets : 0, area: r.area, trust: r.trust, brand: r.brand, name: d.name });
  };

  // プレイヤーを含めた順位表（今の実績で比べる）
  RV.table = function (st) {
    const hs = st.history, last = hs[hs.length - 1];
    const rows = [];
    if (last) {
      const ps = RG.scoreFrom({ eqGain: last.equity - st.initialEquity, avgInc: U.avg(hs.map((x) => x.income)),
        ratio: last.assets > 0 ? last.equity / last.assets : 0, area: last.area, trust: st.trust, brand: st.brand });
      rows.push({ id: 'me', name: st.farmName + '（あなた）', label: '', area: last.area, avgInc: ps.avgInc, eqGain: ps.eqGain, total: ps.total, rank: ps.rank, active: true, me: true });
    }
    (st.rivals || []).forEach((r) => {
      const d = RV.def(r.id), s = RV.score(st, r);
      rows.push({ id: r.id, sprite: d.sprite, name: d.name, label: d.label, area: r.area, avgInc: s.avgInc, eqGain: s.eqGain, total: s.total, rank: s.rank, active: r.active,
        endText: r.active ? '' : r.endYear + '年目に' + (END_WORD[r.endReason] || '離農') });
    });
    rows.sort((a, b) => (b.active - a.active) || b.total - a.total);
    return rows;
  };
})(window.RG = window.RG || {});
