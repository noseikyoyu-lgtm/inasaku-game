// 図鑑のタブ・備えのカードの手札・ライバルとの勝負の表示・引き継ぎ特典の選択
(function (RG) {
  'use strict';
  const UI = RG.ui, h = UI.h, EX = RG.extras;

  // 手札（計画の概況・サイコロ勝負のカード）
  RG.screens.handCard = function (st) {
    if (!st.cards || !st.cards.started) return null;
    const hd = EX.hand(st);
    return h('div', { class: 'hand' }, h('div', { class: 'hand-h' }, h('b', null, '🃏 備えのカード'), h('span', { class: 'small muted' }, '手札 ' + hd.length + ' / ' + EX.HAND_MAX + '枚・サイコロ勝負のときに切ると、お金も手間もかけずに被害を防げる')),
      hd.length ? h('div', { class: 'hand-cards' }, hd.map((id) => { const c = EX.CARDS[id]; return h('div', { class: 'hcard', title: c.desc }, h('span', { class: 'hc-ic', 'aria-hidden': 'true' }, c.icon), h('b', null, c.name), h('small', null, c.desc)); }))
        : h('p', { class: 'small muted' }, '今は手札がありません。年の初めに1枚ふえます。'));
  };
  // 受けている勝負（計画の概況）
  RG.screens.duelCard = function (st) {
    if (!st.duel) return null;
    const d = RG.rivals.def(st.duel.rival), t = EX.THEMES[st.duel.theme];
    return h('div', { class: 'hand duel' }, h('div', { class: 'hand-h' }, UI.face(d.sprite || d.id, 2), h('b', null, '⚔️ ' + d.name + 'と勝負中：' + t.name),
      h('span', { class: 'small muted' }, '今年の決算で、あなたの' + t.name + 'が上回れば勝ち（地域の信頼 +3・技術ポイント +1）')));
  };

  // 図鑑のタブ
  RG.screens.tabZukan = function (app, st) {
    const z = EX.zukan(st);
    return h('div', { class: 'stack' },
      UI.card('📔 図鑑', '作った品種・田んぼに来た生き物・経験した天候・持った機械が、決算のたびに記録されます',
        h('div', { class: 'sk-pts' }, h('span', null, '集めた数'), h('b', null, String(EX.zukanCount(st))), h('span', { class: 'small muted' }, '/ ' + EX.zukanTotal() + '　5件集めるごとに、技術ポイント +1')),
        h('p', { class: 'small muted' }, '生き物は、田んぼの広さや栽培のしかた（農薬を減らす・有機栽培）、地域の信頼で、来るものが変わります。まだ見ていないものは、手がかりが出ます。')),
      EX.CATS.map((c) => { const L = c.list(), got = L.filter((x) => z[c.id][x.id]).length;
        return UI.card(c.icon + ' ' + c.name, got + ' / ' + L.length + (got === L.length ? '　🎉 ぜんぶ集めた！' : ''),
          h('div', { class: 'zk-grid' }, L.map((x) => { const y = z[c.id][x.id];
            return h('div', { class: 'zk' + (y ? ' got' : '') }, h('span', { class: 'zk-ic', 'aria-hidden': 'true' }, y ? x.icon : '❔'),
              h('div', null, h('b', null, y || c.id !== 'life' ? x.name : '？？？'), h('small', null, y ? y + '年目' + (x.note ? '・' + x.note : '') : x.hint))); }))); }),
      (st.duels || []).length ? UI.card('⚔️ ライバルとの勝負の記録', (st.duels || []).filter((d) => d.win).length + '勝 ' + (st.duels || []).filter((d) => !d.win).length + '敗',
        UI.table([{ label: '年', num: true }, { label: '相手' }, { label: '勝負' }, { label: 'あなた', num: true }, { label: '相手', num: true }, { label: '結果' }],
          st.duels.slice().reverse().map((d) => { const t = EX.THEMES[d.theme]; return [{ v: d.year + '年目', cls: 'num' }, (RG.rivals.def(d.rival) || {}).name, t.name, { v: t.fmt(d.mine), cls: 'num' }, { v: t.fmt(d.theirs), cls: 'num' }, d.win ? '🏆 勝ち' : '負け']; }))) : null);
  };

  // 引き継ぎ特典を選ぶ欄（タイトル画面）
  RG.screens.perkField = function (app) {
    const open = EX.PERKS.filter((p) => EX.perkOpen(p.id));
    if (app.titlePerk && !EX.perkOpen(app.titlePerk)) app.titlePerk = null;
    const opts = [{ value: '', label: 'なし' }].concat(EX.PERKS.map((p) => ({ value: p.id, label: p.icon + ' ' + p.name + (EX.perkOpen(p.id) ? '' : '（まだ使えない）'), disabled: !EX.perkOpen(p.id) })));
    const d = app.titlePerk && EX.PERKS.find((p) => p.id === app.titlePerk);
    return h('label', null, h('span', null, '🎁 引き継ぎ特典（1つ選べる）'),
      UI.select(opts, app.titlePerk || '', (v) => { app.titlePerk = v || null; app.keepScroll = true; app.render(); }, { 'aria-label': '引き継ぎ特典' }),
      h('small', null, d ? d.desc : open.length ? '前のゲームでやりとげたことに応じて、特典を1つ持って始められます' : '前のゲームでやりとげたことに応じて、特典が使えるようになります'),
      h('details', { class: 'perk-how' }, h('summary', null, '特典の一覧と、使えるようにする方法'),
        h('ul', null, EX.PERKS.map((p) => h('li', null, (EX.perkOpen(p.id) ? '✅ ' : '🔒 ') + p.icon + ' ' + p.name + '：' + p.desc + '（' + p.how + '）')))));
  };
})(window.RG = window.RG || {});
