// 章の扉・依頼の一覧・章のまとめ・経営の道のエンディング
(function (RG) {
  'use strict';
  const UI = RG.ui, h = UI.h, U = RG.util, D = RG.data, CH = RG.chapters;

  // ---------- 章の扉 ----------
  RG.screens.chapter = function (app) {
    const st = app.st;
    const c = CH.of(st.year, st);
    const needPath = c.n === 2 && !st.path;
    const pathCards = c.n === 2 ? h('div', { class: 'path-cards', role: 'radiogroup', 'aria-label': '経営の道' }, Object.keys(CH.PATHS).map((k) => {
      const p = CH.PATHS[k], on = st.path === k;
      return h('button', { type: 'button', class: 'path-card' + (on ? ' on' : ''), role: 'radio', 'aria-checked': on ? 'true' : 'false',
        onclick: () => { CH.choosePath(st, k); app.autosave(); app.keepScroll = true; app.render(); } },
        on ? h('span', { class: 'pc-check', 'aria-hidden': 'true' }, '✓') : null,
        h('span', { class: 'pth-ic', 'aria-hidden': 'true' }, p.icon), h('b', null, p.name), h('span', { class: 'pth-d' }, p.desc),
        h('span', { class: 'pth-b' }, '🎁 ' + p.bonus), h('span', { class: 'pth-g' }, '🏁 目標：' + p.goal));
    })) : null;
    const go = () => { const err = CH.leave(st); if (err) { UI.toast(err, 'bad'); return; } if (RG.sound) RG.sound.play('good'); app.autosave(); app.render(); };
    return h('div', { class: 'chapter-screen', style: '--ch:' + c.theme }, app.topbar(),
      h('div', { class: 'chapter-wrap' },
        h('section', { class: 'chapter-door' },
          h('div', { class: 'cd-art', 'aria-hidden': 'true' }, c.icon),
          h('div', { class: 'cd-no' }, '第' + c.n + '章'),
          h('h1', { class: 'cd-name' }, c.name),
          h('div', { class: 'cd-years' }, c.from + '年目 〜 ' + c.to + '年目'),
          h('div', { class: 'cd-goal' }, '🏁 この章の目標：', h('b', null, c.goal))),
        UI.saying(c.intro),
        UI.card('🆕 この章で起きること', null, h('ul', { class: 'cd-news' }, c.news.map((t) => h('li', null, t)),
          c.n === 1 && st.cropsOpen ? h('li', { class: 'cd-unlock' }, '🌱 最初に使えるものは少しだけ。品種だけでなく、栽培方法・機械・制度・事業も、面積・品質・お客さん・地域の信頼などをきっかけに増えていく（ホームの「これから使えるようになるもの」で確かめられる）') : null,
          RG.era ? RG.era.TRIALS.filter((t) => RG.era.trialRange(st, t)[0] >= c.from && RG.era.trialRange(st, t)[0] <= c.to && RG.era.trialRange(st, t)[0] <= st.maxYear).map((t) => h('li', { class: 'cd-trial' }, '⚠️ ' + RG.era.trialRange(st, t)[0] + '〜' + RG.era.trialRange(st, t)[1] + '年目のどこかで、試練「' + t.icon + ' ' + t.name + '」がやってくる（1年前に予告がある）')) : null,
          RG.era && RG.era.on(st) && !st.featOpen ? RG.era.UNLOCKS.filter((u) => { const y = RG.era.openYear(st, u); return y >= c.from && y <= c.to; }).map((u) => h('li', { class: 'cd-unlock' }, '🔓 ' + RG.era.openYear(st, u) + '年目から：' + u.icon + ' ' + u.name)) : null)),
        c.n === 2 ? UI.card('🧭 経営の道を選ぶ', st.maxYear + '年目のエンディングも、この道で変わります', pathCards) : null,
        c.n > 1 ? RG.screens.chapterRecap(st, c.n - 1) : null,
        h('div', { class: 'row' }, h('span', { class: 'spacer' }),
          UI.btn(needPath ? '道を選んでください' : '第' + c.n + '章を始める ▶', go, needPath ? '' : 'gold big', { disabled: needPath }))));
  };

  // ---------- 受けている依頼（計画のホーム） ----------
  RG.screens.missionsCard = function (app, st) {
    const list = CH.active(st);
    const done = CH.state(st).missions.filter((m) => m.status === 'done').length;
    const c = CH.of(st.year, st);
    return UI.card('📜 依頼', '第' + c.n + '章「' + c.name + '」・これまでの達成 ' + done + '件',
      h('div', { class: 'chapter-goal' }, '🏁 この章の目標：', h('b', null, c.goal), st.path ? h('span', { class: 'path-badge' }, CH.PATHS[st.path].icon + ' ' + CH.PATHS[st.path].name) : null),
      list.length ? h('div', { class: 'missions' }, list.map((inst) => {
        const m = CH.def(inst.id), left = inst.deadline - st.year + 1;
        return h('div', { class: 'mission' },
          UI.face(m.who, 2),
          h('div', { class: 'ms-body' }, h('b', null, m.title), h('div', { class: 'ms-p' }, m.progress(st, inst)),
            h('div', { class: 'ms-r' }, '🎁 ' + CH.rewardText(m.reward))),
          h('span', { class: 'ms-left' + (left <= 1 ? ' last' : '') }, left <= 1 ? '今年まで' : 'あと' + left + '年'));
      })) : h('p', { class: 'small muted keep' }, '今は受けている依頼はありません。年の初めに、地域や取引先から話が届きます。'));
  };

  // ---------- 章のまとめ ----------
  RG.screens.chapterRecap = function (st, n) {
    const s = CH.summary(st, n);
    if (!s.list.length) return UI.card('📖 第' + n + '章「' + s.chapter.name + '」のまとめ', null, h('p', { class: 'small muted keep' }, 'この章で引き受けた依頼はありませんでした。'));
    return UI.card('📖 第' + n + '章「' + s.chapter.name + '」のまとめ', '依頼の達成 ' + s.done + ' / ' + s.list.length,
      h('div', { class: 'missions' }, s.list.map((inst) => {
        const m = CH.def(inst.id);
        return h('div', { class: 'mission ' + inst.status },
          h('span', { class: 'ms-mark', 'aria-hidden': 'true' }, inst.status === 'done' ? '🏆' : inst.status === 'failed' ? '💧' : '⏳'),
          h('div', { class: 'ms-body' }, h('b', null, m.title),
            h('div', { class: 'ms-p' }, inst.status === 'done' ? inst.doneYear + '年目に達成' : inst.status === 'failed' ? '期限までに届かなかった' : 'まだ挑戦中（' + inst.deadline + '年目まで）')));
      })));
  };

  // ---------- 経営の道のエンディング（経営終了の画面） ----------
  RG.screens.pathEnding = function (st) {
    if (!st.path) return null;
    const p = CH.PATHS[st.path];
    const over = !!st.gameOver, ok = !over && p.check(st), yrs = st.history.length;
    return UI.card(p.icon + ' ' + p.name + 'のエンディング', '目標：' + p.goal + (ok ? '　達成！' : over ? '　道なかば' : '　あと一歩'),
      h('div', { class: 'path-ending ' + (ok ? 'ok' : '') },
        h('p', null, ok ? p.ending : over ? '選んだ道を歩きはじめたが、' + yrs + '年目で経営を続けられなくなった。広げ方・お金の使い方のどこで無理をしたのか、決算書でふり返ってみよう。'
          : 'あなたが選んだ道の目標には、あと一歩届かなかった。それでも、この' + yrs + '年で積み上げたものは確かにある。次は、どの道を選ぶだろう。')));
  };
})(window.RG = window.RG || {});
