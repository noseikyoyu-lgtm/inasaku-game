// 技（スキル）のタブと、米の品評会の表示
(function (RG) {
  'use strict';
  const UI = RG.ui, h = UI.h, SK = RG.skills;

  // 品評会の順位表（決算画面・技のタブ）
  RG.screens.contestCard = function (c, title) {
    if (!c || !c.rows) return null;
    const medal = (r) => (SK.PRIZE.find((p) => p.rank === r) || {}).icon || '';
    return UI.card(title || '🏆 米の品評会（' + c.year + '年目）', c.prize ? c.label + 'が ' + c.prize + '！（' + c.n + '人中 ' + c.rank + '位）' : c.n + '人中 ' + c.rank + '位（3位までが入賞）',
      UI.table([{ label: '順位', num: true }, { label: '出品者' }, { label: '点', num: true }],
        c.rows.map((r) => ({ cls: r.me ? 'me' : '', cells: [{ v: medal(r.rank) + r.rank + '位', cls: 'num' },
          h('span', null, h('b', null, r.name), r.label ? h('div', { class: 'small muted' }, r.label) : null), { v: r.score.toFixed(1), cls: 'num' }] }))),
      c.parts ? h('p', { class: 'small' }, 'あなたの点の内わけ：米の品質 ' + c.parts.q.toFixed(1) + (c.parts.cult ? '・栽培方式 +' + c.parts.cult : '') + (c.parts.skill ? '・技「商いの達人」 +' + c.parts.skill : '') + (c.parts.exp ? '・出品の経験 ' + c.parts.exp + '（選別や仕上げ。出すたびに1点ずつ戻る）' : '')) : null,
      h('p', { class: 'small muted' }, '点は、出品した品種の米の品質の平均（天候・作業の時期・肥料や水の工夫・技）で決まります。特別栽培は +1.5点、有機栽培は +3点。入賞すると、ブランド力・直販のお客さん・技術ポイントが増えます。'));
  };

  RG.screens.tabSkills = function (app, st) {
    const k = SK.state(st);
    const node = (s) => {
      const got = SK.has(st, s.id), why = got ? null : SK.lock(st, s.id), prev = SK.prev(s), open = !prev || SK.has(st, prev.id);
      return h('div', { class: 'sk-node' + (got ? ' got' : !why ? ' can' : open ? ' short' : ' locked') },
        h('div', { class: 'sk-ic', 'aria-hidden': 'true' }, got ? '✅' : open ? s.icon : '🔒'),
        h('div', { class: 'sk-body' },
          h('div', { class: 'sk-name' }, s.name, h('span', { class: 'sk-cost' }, got ? k.got[s.id] + '年目に習得' : s.cost + 'ポイント')),
          h('div', { class: 'small' }, s.desc),
          got ? null : why ? h('div', { class: 'small muted' }, why) : UI.btn('覚える（' + s.cost + 'ポイント）', () => app.update((x) => SK.learn(x, s.id), { undo: true, msg: '「' + s.name + '」を覚えました' }), 'sm primary')));
    };
    const last = st.lastResult && st.lastResult.contest, cs = st.contests || [];
    const golds = cs.filter((c) => c.rank === 1).length, medals = cs.filter((c) => c.rank <= 3).length;
    return h('div', { class: 'stack' },
      UI.card('🎓 技', '経験でたまる技術ポイントを使って、技を覚える。上から順に覚えます',
        h('div', { class: 'sk-pts' }, h('span', null, '技術ポイント'), h('b', null, String(k.pts)), h('span', { class: 'small muted' }, '覚えた技 ' + SK.count(st) + ' / ' + SK.LIST.length)),
        h('p', { class: 'small muted' }, 'ポイントは決算のたびに増えます：1年の経験 +1・黒字 +1・1等米90%以上 +1・依頼の達成 +1・品評会の金賞 +2（銀賞・銅賞 +1）。全部は覚えきれないので、どの道を伸ばすかを選びましょう。'),
        h('div', { class: 'sk-tree' }, SK.BRANCHES.map((b) => h('div', { class: 'sk-branch' },
          h('div', { class: 'sk-bh' }, h('span', { 'aria-hidden': 'true' }, b.icon), h('b', null, b.name), h('span', { class: 'small muted' }, b.sub)),
          SK.LIST.filter((s) => s.branch === b.id).map(node))))),
      UI.card('🏆 米の品評会', '毎年の秋、その年にいちばん出来のよい品種の米を出して、地域の農家と品質の点を競います',
        st.contestOn == null && !cs.length ? h('p', { class: 'small' }, '2年目の年の初めに、高橋さんから誘いがあります。出すと決めると、秋に自動で出品され、結果は決算のときにわかります。')
          : h('div', { class: 'row' }, h('b', null, SK.contestOn(st) ? '✅ 今年の秋も出品します' : '⏸ 今は出品していません'),
            UI.btn(SK.contestOn(st) ? '出品をやめる' : '出品する', () => app.update((x) => { x.contestOn = !SK.contestOn(x); return null; }, { undo: true, msg: SK.contestOn(st) ? '品評会への出品をやめました' : '品評会に出品します' }), 'sm')),
        h('p', { class: 'small muted' }, '費用はかかりません。3位までに入ると、ブランド力・直販のお客さん・技術ポイントが増えます。初めのうちは選別や仕上げで点を落とします（1回目 −4点。出すたびに1点ずつ戻り、5回目からは引かれません）。' + (SK.contestOn(st) && SK.expPenalty(st) ? '次の出品は −' + SK.expPenalty(st) + '点。' : ''))),
      last ? RG.screens.contestCard(last, '🏆 去年の米の品評会の結果') : null,
      cs.length ? UI.card('これまでの品評会', '金賞 ' + golds + '回・入賞 ' + medals + '回（' + cs.length + '回出品）',
        UI.table([{ label: '年', num: true }, { label: '出品した米' }, { label: '点', num: true }, { label: '結果', num: true }],
          cs.slice().reverse().map((c) => [{ v: c.year + '年目', cls: 'num' }, c.label, { v: c.score.toFixed(1), cls: 'num' }, { v: (c.prize ? c.prize + '・' : '') + c.rank + '位', cls: 'num' }]))) : null);
  };
})(window.RG = window.RG || {});
