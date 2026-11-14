// 技（スキル）と米の品評会。DOM 非依存
// 技：毎年の経験でたまる「技術ポイント」を使って覚える。3つの道（育てる・まわす・売る）に4つずつ。上の技は、下の技を覚えてから
// 品評会：毎年の秋、いちばん出来のよい米を出して、地域の農家と点を競う。入賞するとブランド力・お客さん・技術ポイントが増える
(function (RG) {
  'use strict';
  const D = RG.data, U = RG.util;
  const SK = RG.skills = {};

  SK.BRANCHES = [
    { id: 'grow', icon: '🌾', name: '育てる', sub: '収量と品質を上げる' },
    { id: 'work', icon: '🚜', name: 'まわす', sub: '作業と機械を楽にする' },
    { id: 'sell', icon: '🛒', name: '売る', sub: 'お客さんと信頼を増やす' },
  ];
  // cost：必要な技術ポイント。同じ道の上から順に覚える
  SK.LIST = [
    { id: 'mizu', branch: 'grow', cost: 3, icon: '💧', name: '水見の目', desc: '毎朝の水見回りで、稲の調子がわかるようになる。品質 +1.5点（1等米が増える）' },
    { id: 'byoki', branch: 'grow', cost: 5, icon: '🔍', name: '病害虫を見ぬく目', desc: '病気や虫を早く見つけて手を打てる。病害虫の被害が2割へる' },
    { id: 'sonae', branch: 'grow', cost: 8, icon: '🌡️', name: '暑さ寒さへの備え', desc: '深水や掛け流しで、冷夏や猛暑の害をやわらげる。天候による減収が2割へる' },
    { id: 'meijin', branch: 'grow', cost: 12, icon: '🏅', name: '米づくり名人', desc: '土と稲を知りつくした。収量 +1.5%・品質さらに +1.5点' },
    { id: 'dandori', branch: 'work', cost: 3, icon: '🗓️', name: '段取り上手', desc: '作業の順番と準備にむだがなくなる。作業の時間が2%へる' },
    { id: 'ijiri', branch: 'work', cost: 5, icon: '🔧', name: '機械いじり', desc: '点検や簡単な修理は自分でできる。機械の点検・修理代が2割へる' },
    { id: 'tsukai', branch: 'work', cost: 8, icon: '🚜', name: '機械を使いこなす', desc: '機械をむだなく動かせる。作業の時間がさらに3%へる' },
    { id: 'takumi', branch: 'work', cost: 12, icon: '⏱️', name: '適期を逃さない', desc: '刈り遅れても、乾燥や刈り方の工夫で傷みをおさえる。刈り遅れによる減収と品質の低下が半分になる' },
    { id: 'kao', branch: 'sell', cost: 3, icon: '🙋', name: '顔を売る', desc: '手紙やイベントで、お客さんとつながる。直販の新しいお客さんが15%ふえる' },
    { id: 'namae', branch: 'sell', cost: 5, icon: '🏷️', name: '名前を育てる', desc: '袋や物語で、農場の名前を覚えてもらう。ブランドづくりの効き目が2割ふえる' },
    { id: 'tsukiai', branch: 'sell', cost: 8, icon: '🤝', name: '地域づきあい', desc: '寄り合いや共同作業で頼られる。地域の信頼が毎年 +1' },
    { id: 'akinai', branch: 'sell', cost: 12, icon: '💎', name: '商いの達人', desc: 'お客さんの声を米づくりに生かす。直販のお客さんが離れにくくなり、品評会の点が +1.5点' },
  ];
  SK.def = (id) => SK.LIST.find((s) => s.id === id);
  SK.state = (st) => st.skills || (st.skills = { pts: 3, got: {}, earned: 3 });
  SK.has = (st, id) => !!(st && st.skills && st.skills.got[id]);
  SK.count = (st) => Object.keys(SK.state(st).got).length;
  // その技の1つ下（同じ道で、すぐ前の技）
  SK.prev = (s) => { const L = SK.LIST.filter((x) => x.branch === s.branch), i = L.indexOf(s); return i > 0 ? L[i - 1] : null; };
  // 覚えられない理由（覚えられるなら null）
  SK.lock = function (st, id) {
    const s = SK.def(id), k = SK.state(st);
    if (!s) return '技が見つかりません';
    if (k.got[id]) return 'もう覚えています';
    const p = SK.prev(s);
    if (p && !k.got[p.id]) return '先に「' + p.name + '」を覚えます';
    if (k.pts < s.cost) return '技術ポイントが足りません（あと ' + (s.cost - k.pts) + '）';
    return null;
  };
  SK.learn = function (st, id) {
    const why = SK.lock(st, id);
    if (why) return why;
    const s = SK.def(id), k = SK.state(st);
    k.pts -= s.cost; k.got[id] = st.year;
    return null;
  };
  SK.canLearnAny = (st) => SK.LIST.some((s) => !SK.lock(st, s.id));
  SK.branchDone = (st, b) => SK.LIST.filter((s) => s.branch === b).every((s) => SK.has(st, s.id));

  // ---------- 米の品評会 ----------
  // ライバルの力（経営の型ごと）。その年の天候と運で上下する
  const STYLE = { grow: 87, craft: 93, part: 86, group: 89, coop: 87, young: 83 };
  const GUEST = { id: 'hoshino', name: '星野さん', label: 'となり町の名人', base: 95 };
  const PRIZE = [
    { rank: 1, name: '金賞', icon: '🥇', brand: 3, customers: 15, trust: 2, pts: 2 },
    { rank: 2, name: '銀賞', icon: '🥈', brand: 2, customers: 8, trust: 1, pts: 1 },
    { rank: 3, name: '銅賞', icon: '🥉', brand: 1, customers: 4, trust: 0, pts: 1 },
  ];
  SK.PRIZE = PRIZE;
  const CULT_BONUS = { conv: 0, special: 1.5, organic: 3 };
  // 出品しているか（高橋さんに誘われて「出す」と決めてから。前の版のセーブは、出したことがあれば出品中）
  SK.contestOn = (st) => (st.contestOn != null ? !!st.contestOn : (st.contests || []).length > 0);
  // 出品の経験：選別や仕上げは、出すたびに上手くなる（1回目 −4点、5回目からは引かれない）
  SK.expPenalty = (st) => Math.max(0, 4 - (st.contests || []).length - (st.contestExp || 0)); // contestExp：引き継ぎ特典「名人の手ほどき」
  // 出品する米：販売する品種（品種×栽培方式）ごとに品質を平均し、いちばん点の高いものを出す（1枚の田のまぐれで決まらないように）
  SK.entry = function (st, res) {
    const g = {};
    (res.production.plots || []).forEach((p) => {
      if (!D.CROPS[p.crop] || !D.CROPS[p.crop].market || !(p.bales > 0)) return;
      const k = p.crop + '|' + p.cult, x = g[k] || (g[k] = { crop: p.crop, cult: p.cult, q: 0, b: 0 });
      x.q += p.q * p.bales; x.b += p.bales;
    });
    let best = null;
    Object.keys(g).forEach((k) => {
      const x = g[k], q = x.q / x.b, cult = CULT_BONUS[x.cult] || 0, skill = SK.has(st, 'akinai') ? 1.5 : 0, exp = -SK.expPenalty(st);
      const score = q + cult + skill + exp;
      if (!best || score > best.score) best = { score, q, cult, skill, exp, crop: x.crop, label: D.CROPS[x.crop].name + (x.cult !== 'conv' && D.CULTS[x.cult] ? '（' + D.CULTS[x.cult].name + '）' : '') };
    });
    return best;
  };
  SK.contest = function (st, res) {
    if (!SK.contestOn(st)) return null;
    const me = SK.entry(st, res);
    if (!me) return null;
    const yt = (st.world && st.world.yearType) || 'normal';
    const bad = yt === 'hot' || yt === 'cold' || yt === 'rain' || yt === 'typh' ? -4 : 0; // 天候の悪い年は、みんな点が下がる
    const rows = [{ id: 'me', name: st.farmName + '（あなた）', label: me.label, score: me.score, me: true }];
    const rv = (id, name, label, base) => { const r = RG.rng.make(st.seed, st.year, 'contest', id); rows.push({ id, name, label, score: base + bad + r.normal(0, 2.2) }); };
    (st.rivals || []).filter((r) => r.active).forEach((r) => { const d = RG.rivals.def(r.id); if (d) rv(r.id, d.name, d.label, (STYLE[d.style] || 89) + (d.style === 'young' ? Math.min(5, st.year * 0.5) : 0)); });
    rv(GUEST.id, GUEST.name, GUEST.label, GUEST.base);
    rows.forEach((r) => { r.score = Math.round(r.score * 10) / 10; });
    rows.sort((a, b) => b.score - a.score || (a.me ? -1 : 1));
    rows.forEach((r, i) => { r.rank = i + 1; });
    const mine = rows.find((r) => r.me), prize = PRIZE.find((p) => p.rank === mine.rank) || null;
    return { year: st.year, rows, rank: mine.rank, n: rows.length, score: mine.score, label: me.label, prize: prize ? prize.name : null,
      parts: { q: Math.round(me.q * 10) / 10, cult: me.cult, skill: me.skill, exp: me.exp } };
  };

  // 2年目の年の初めに、高橋さんから品評会に誘われる（出すかどうかは、あとから「技と品評会」タブで変えられる）
  RG.events.POOL.push({
    id: 'contest_invite', who: 'takahashi', once: true, sq: 1,
    cond: (st) => st.year >= 2 && st.contestOn == null && !(st.contests || []).length, weight: () => 100,
    title: '米の品評会に出してみないか',
    text: () => '「毎年の秋に、地域の米の品評会があるんだ。その年にいちばん出来のよかった米を出して、品質の点を競う。小川さんや、となり町の名人の星野さんも出てくるよ。3位までに入れば、名前が売れてお客さんも増える。最初のうちは選別や仕上げで点を落とすけど、出すたびに上手くなる。出してみないか？」',
    choices: [
      { label: '毎年、出品する', desc: 'その年にいちばん点の高い品種の米が、秋に自動で出品される（費用はかからない）。1回目は −4点、出すたびに1点ずつ戻る', apply: (st) => { st.contestOn = true; return '今年の秋から、米の品評会に出品することにした。結果は決算のときにわかる。'; } },
      { label: '今はやめておく', desc: 'あとから「技と品評会」タブで、いつでも出品に変えられる', apply: (st) => { st.contestOn = false; return '品評会は見送った。「技と品評会」タブで、いつでも出品に変えられる。'; } },
    ],
  });

  // ---------- 決算のあと：品評会の結果と、技術ポイント ----------
  SK.afterYear = function (st, res) {
    const k = SK.state(st), notes = [];
    let gain = 1; const why = ['1年の経験 +1'];
    if (res.analysis && res.analysis.income > 0) { gain += 1; why.push('黒字 +1'); }
    if (res.production.marketBales > 0 && res.production.r1 >= 0.9) { gain += 1; why.push('1等米90%以上 +1'); }
    if ((res.missionsDone || []).length) { gain += 1; why.push('依頼の達成 +1'); }
    const c = SK.contest(st, res);
    if (c) {
      res.contest = c;
      st.contests = (st.contests || []).concat([{ year: c.year, rank: c.rank, n: c.n, score: c.score, label: c.label, prize: c.prize }]);
      const p = PRIZE.find((x) => x.rank === c.rank);
      if (p) {
        st.brand = U.clamp(st.brand + p.brand, 0, 100); st.direct.customers += p.customers; st.trust = U.clamp(st.trust + p.trust, 0, 100);
        gain += p.pts; why.push('品評会の' + p.name + ' +' + p.pts);
        notes.push('🏆 米の品評会：' + c.label + 'が ' + c.score.toFixed(1) + '点で' + p.icon + p.name + '（' + c.n + '人中 ' + c.rank + '位）を達成！ ブランド力 +' + p.brand + '・直販のお客さん +' + p.customers + '人' + (p.trust ? '・地域の信頼 +' + p.trust : ''));
      } else notes.push('🏆 米の品評会：' + c.label + 'は ' + c.score.toFixed(1) + '点で、' + c.n + '人中 ' + c.rank + '位だった（3位までが入賞）。');
    }
    k.pts += gain; k.earned = (k.earned || 0) + gain;
    res.skillGain = { gain, why, pts: k.pts };
    notes.push('🎓 技術ポイント +' + gain + '（' + why.join('・') + '）。今 ' + k.pts + 'ポイント' + (SK.canLearnAny(st) ? '。「技と品評会」タブで新しい技を覚えられる' : ''));
    return notes;
  };
  // 自動で進めるとき（検証）：覚えられる技を、道の順に覚える
  SK.auto = function (st, order) {
    let again = true;
    while (again) { again = false; for (const b of (order || ['grow', 'work', 'sell'])) { const s = SK.LIST.find((x) => x.branch === b && !SK.has(st, x.id)); if (s && !SK.lock(st, s.id)) { SK.learn(st, s.id); again = true; break; } } }
  };
})(window.RG = window.RG || {});
