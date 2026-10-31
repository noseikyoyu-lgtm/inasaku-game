// 称号・実績。決算のたびに確かめて、取った称号を st.titles に残す
// これまでのゲームで取った称号は、このブラウザに「コレクション」として残る
(function (RG) {
  'use strict';
  const D = RG.data, U = RG.util;
  const TT = RG.titles = {};

  const prod = (res, crop) => res.production.products.filter((p) => p.crop === crop);
  const biz = (res) => (res.sales && res.sales.biz) || {};

  TT.LIST = [
    { id: 'first_profit', icon: '🌱', name: '初めての黒字', desc: '所得がプラスの年を迎える', check: (st, res) => res.analysis.income > 0 },
    { id: 'income10m', icon: '💰', name: '所得1,000万円', desc: '1年の所得が1,000万円を超える', check: (st, res) => res.analysis.income >= 1e7 },
    { id: 'equity1oku', icon: '🏦', name: '純資産1億円', desc: '純資産が1億円を超える', check: (st, res) => res.bs.equity >= 1e8 },
    { id: 'no_debt', icon: '🕊️', name: '無借金経営', desc: '3年目以降に借入をすべて返し終える', check: (st, res) => st.year >= 3 && res.bs.longLoans + res.bs.emergency < 1 },
    { id: 'area20', icon: '🚜', name: '20haの担い手', desc: '経営面積が20haを超える', check: (st, res) => res.area.total >= 20 },
    { id: 'area50', icon: '🗾', name: '大規模経営', desc: '経営面積が50haを超える', check: (st, res) => res.area.total >= 50 },
    { id: 'grade_perfect', icon: '🥇', name: '1等米100%', desc: '販売用の米がすべて1等米', check: (st, res) => res.production.marketBales > 0 && res.production.r1 >= 0.995 },
    { id: 'shinnosuke', icon: '✨', name: '新之助の名人', desc: '新之助を100俵以上とり、1等米の割合が90%以上', check: (st, res) => prod(res, 'shinnosuke').some((p) => p.bales >= 100 && p.r1 >= 0.9) },
    { id: 'organic', icon: '🐸', name: '有機の道', desc: '有機栽培を3ha以上行う', check: (st, res) => U.sum(res.production.plots.filter((p) => p.cult === 'organic'), (p) => p.area) >= 3 },
    { id: 'direct500', icon: '📦', name: '直販のお客さん500人', desc: '直販のお客さんが500人を超える', check: (st) => st.direct.customers >= 500 },
    { id: 'brand80', icon: '🏷️', name: '地域ブランド', desc: 'ブランド力が80を超える', check: (st) => st.brand >= 80 },
    { id: 'trust90', icon: '🤝', name: '地域の顔', desc: '地域の信頼が90を超える', check: (st) => st.trust >= 90 },
    { id: 'keep_promise', icon: '📜', name: '約束を守る', desc: '契約を3年続けて約束どおり届ける', check: (st) => st.story && st.story.buyer.streak >= 3 },
    { id: 'mochi', icon: '🍡', name: '餅屋さん', desc: '加工品を1年に50俵分以上売る', check: (st, res) => biz(res).proc && biz(res).proc.sold >= 50 },
    { id: 'harvest_pro', icon: '🌾', name: '地域の稲刈り屋', desc: '稲刈りの作業受託を10ha以上行う', check: (st, res) => biz(res).harvest && biz(res).harvest.area >= 10 },
    { id: 'drone_pilot', icon: '🛸', name: 'ドローン使い', desc: 'ドローン防除の請負を30ha以上行う', check: (st, res) => biz(res).drone && biz(res).drone.area >= 30 },
    { id: 'stock_win', icon: '⏳', name: '待って勝つ', desc: '保管した米を、収穫時より5%以上高く売る', check: (st, res) => { const s = res.sales.stockSale; return !!s && s.revenue - s.fee > s.value * 1.05; } },
    { id: 'lucky', icon: '🎲', name: '幸運の持ち主', desc: '運だめしで6を3回出す', check: (st) => st.stats.sixes >= 3 },
    { id: 'omamori', icon: '🧧', name: 'お守りに救われた', desc: 'お守りで不運を防ぐ', check: (st) => st.stats.omamori >= 1 },
    { id: 'gambler', icon: '🃏', name: '勝負師', desc: 'サイコロ勝負を5回挑む', check: (st) => st.stats.gambles >= 5 },
    { id: 'careful', icon: '🛡️', name: '石橋をたたいて渡る', desc: 'サイコロ勝負で5回対策する', check: (st) => st.stats.guards >= 5 },
    { id: 'typhoon', icon: '🌀', name: '台風をしのいだ', desc: '台風のサイコロ勝負で被害なしの目を出す', check: (st) => st.stats.typhoonWin >= 1 },
    { id: 'corp', icon: '🏢', name: '法人化', desc: '経営を法人にする', check: (st) => !!st.corp },
    { id: 'rival_top', icon: '👑', name: '地域で一番', desc: '5年目以降に、地域の農家の中で評価が一番になる', check: (st) => st.year >= 5 && RG.rivals && (RG.rivals.table(st).find((r) => r.active) || {}).me },
    { id: 'successor', icon: '👨‍👩‍👦', name: '次の世代へ', desc: '後継者に経営を引き継ぐ', check: (st) => st.family.some((f) => f.tag === 'retired') && !st.retired },
    { id: 'third_party', icon: '🤲', name: '第三者継承', desc: '家族以外の若者を後継者に迎える', check: (st) => st.story && st.story.trainee.stage === 3 },
    { id: 'trials3', icon: '⛈️', name: '嵐を越えて', desc: '3つの試練の年をすべて黒字で乗り越える', check: (st) => (st.trials || []).filter((t) => t.income > 0).length >= 3 },
    { id: 'mission5', icon: '📜', name: '頼れる人', desc: '依頼を5つ達成する', check: (st) => (st.missions || []).filter((m) => m.status === 'done').length >= 5 },
    { id: 'pathGoal', icon: '🧭', name: '道をきわめる', desc: '選んだ経営の道の目標を達成する', check: (st) => !!st.path && RG.chapters && RG.chapters.PATHS[st.path].check(st) },
    { id: 'complete20', icon: '🎌', name: '20年完走', desc: '20年の経営をやりとげる', check: (st) => st.history.length >= 20 && !st.gameOver },
    { id: 'promise', icon: '🤝', name: '約束を果たす', desc: 'ストーリーで、物語の約束を果たす', check: (st) => !!(RG.scenes && RG.scenes.isStory(st) && st.history.length >= st.maxYear && RG.scenes.promise(st).kept) },
    { id: 'promise3', icon: '🌟', name: '米道をきわめた', desc: 'ストーリーで、星3つのエンディングを見る', check: (st) => !!(RG.scenes && RG.scenes.isStory(st) && st.history.length >= st.maxYear && RG.scenes.promise(st).stars >= 3) },
  ];
  TT.get = (id) => TT.LIST.find((t) => t.id === id);

  // その年のサイコロの記録を数える（決算のあとに1回）
  TT.countStats = function (st) {
    const s = st.stats || (st.stats = { sixes: 0, omamori: 0, gambles: 0, guards: 0, typhoonWin: 0, counted: 0 });
    if (s.counted >= st.year) return;
    s.counted = st.year;
    const L = st.luck;
    if (L && L.year === st.year && L.rolls.length) {
      if (L.rolls[L.rolls.length - 1] === 6) s.sixes += 1;
      if (L.omamori) s.omamori += 1;
    }
    const cr = (st.yearFlags || {}).crisis || {};
    for (const id in cr) {
      const ch = cr[id];
      if (ch.choice === 'guard') s.guards += 1;
      else if (ch.rolls && ch.rolls.length) {
        s.gambles += 1;
        const c = RG.dice.crisisDef(id), o = c && RG.dice.outcomeOf(c, ch.rolls[ch.rolls.length - 1]);
        if (id === 'typhoon' && o && o.kind === 'good') s.typhoonWin += 1;
      }
    }
  };

  // 新しく取った称号を返す
  TT.check = function (st, res) {
    st.titles = st.titles || {};
    TT.countStats(st);
    const got = [];
    TT.LIST.forEach((t) => {
      if (st.titles[t.id]) return;
      let ok = false;
      try { ok = !!t.check(st, res); } catch (e) { ok = false; }
      if (ok) { st.titles[t.id] = st.year; got.push(t); }
    });
    if (got.length) TT.remember(got.map((t) => t.id));
    return got;
  };

  // ---------- コレクション（このブラウザに残る） ----------
  const KEY = 'inasaku.titles';
  TT.collection = function () {
    try { const v = JSON.parse(localStorage.getItem(KEY) || '{}'); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch (e) { return {}; }
  };
  TT.remember = function (ids) {
    try {
      const c = TT.collection();
      ids.forEach((id) => { c[id] = (c[id] || 0) + 1; });
      localStorage.setItem(KEY, JSON.stringify(c));
    } catch (e) { /* 保存できなくても遊べる */ }
  };
})(window.RG = window.RG || {});
