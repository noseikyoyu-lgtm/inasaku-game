// 今年の目標と、大きな挑戦のカード（計画の概況・経営を終えた画面）
(function (RG) {
  'use strict';
  const UI = RG.ui, h = UI.h, GO = RG.goals;

  RG.screens.goalCard = function (st) {
    const g = st.yearGoal;
    if (!g || g.year !== st.year || !g.id) return null;
    const won = (st.goalLog || []).filter((x) => x.ok).length;
    return h('div', { class: 'hand goal' }, h('div', { class: 'hand-h' }, h('b', null, '🎯 今年の目標：' + GO.goalLabel(g)),
      h('span', { class: 'small muted' }, '決算で判定・達成すると ' + GO.REWARD + '（これまでに ' + won + '回達成）')));
  };

  RG.screens.grandCard = function (st, ending) {
    const G = st.grand;
    if (!G || !G.id) return null;
    const g = GO.grandDef(G.id);
    if (!g) return null;
    const state = G.done ? '🏔️ やりとげた（' + G.done + '年目）' : G.failed ? '段階 ' + G.stage + ' / 4 で時間切れ' : '段階 ' + (G.stage + 1) + ' / 4 に挑戦中' + (st.mode === 'endless' ? '' : '・あと' + Math.max(0, st.maxYear - st.history.length) + '年');
    if (ending && !G.done && !G.failed) return null;
    return h('div', { class: 'hand grand' + (G.done ? ' done' : '') },
      h('div', { class: 'hand-h' }, UI.face(g.who, 2), h('b', null, '大きな挑戦：' + g.icon + ' ' + g.name), h('span', { class: 'pr-done' }, state)),
      h('ol', { class: 'grand-steps' }, g.stages.map((s, i) => h('li', { class: i < G.stage ? 'ok' : i === G.stage && !G.done ? 'now' : '' },
        h('span', { 'aria-hidden': 'true' }, i < G.stage ? '✅' : i === G.stage && !G.done ? '▶' : '⬜'), s.label))),
      h('p', { class: 'small muted' }, (G.done ? 'ごほうび（毎年つづくものもある）：' : 'やりとげたときのごほうび：') + g.reward +
        (G.done || G.failed ? '' : '。毎年の初めに、どれだけ力を入れるか（本気・いつもどおり・休む）を決めます')));
  };
})(window.RG = window.RG || {});
