// 毎月のできごとのカード：行動を選んでサイコロを振る
(function (RG) {
  'use strict';
  const UI = RG.ui, h = UI.h, D = RG.data, ME = RG.monthly, DI = RG.dice;

  // サイコロを振る：状態を変えてから演出し、終わったら描き直す
  function roll(app, e, doRoll) {
    if (app.rolling) return;
    app.rolling = true;
    const face = doRoll();
    app.autosave();
    const card = e.target.closest('.card');
    card.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    UI.rollDie(card.querySelector('.die'), face, () => {
      if (RG.sound) RG.sound.play(face <= 2 ? 'bad' : face >= 5 ? 'great' : 'coin');
      app.rolling = false; app.keepScroll = true; app.render();
    });
  }
  const who = (ev) => (ev.who && ev.who !== 'narr' && D.PEOPLE[ev.who] ? UI.speaker(ev.who) : null);

  UI.monthEventCard = function (app, month) {
    const st = app.st;
    const ev = ME.eventFor(st, month);
    if (!ev) return null;
    const c = ME.choiceOf(st, month);
    const body = [who(ev), h('p', null, ev.text)];
    let actions = [];
    if (!c) {
      // 選ぶ前：行動ごとに、かかるものと、うまくいったとき・いかなかったときの見込み
      body.push(h('div', { class: 'mev-choices' }, ev.choices.map((ch, i) => {
        const pre = ME.preText(ch, st);
        return h('button', { type: 'button', class: 'mev-opt', onclick: (e) => roll(app, e, () => ME.choose(st, month, i)) },
          h('div', { class: 't' }, '🎲 ' + ch.label), pre ? h('div', { class: 'pre' }, pre) : null,
          h('div', { class: 'mev-range' },
            h('span', { class: 'good' }, '⚄⚅ ' + (ME.effText(ch.out[2].e, st) || '変化なし')),
            h('span', { class: 'bad' }, '⚀⚁ ' + (ME.effText(ch.out[0].e, st) || '変化なし'))));
      })));
      body.push(h('div', { class: 'dice-stage' }, UI.die(0)));
      actions = [UI.btn('見送る（何もしない）', () => { ME.pass(st, month); app.autosave(); app.keepScroll = true; app.render(); }, 'ghost')];
    } else if (c.ci < 0) {
      body.push(UI.note('info', '見送った', '今月は何もしなかった。'));
    } else {
      const ch = ev.choices[c.ci], out = ME.outcome(ev, c.ci, c.face);
      body.push(h('div', { class: 'small muted' }, '選んだ行動：' + ch.label));
      body.push(h('div', { class: 'dice-stage' }, UI.die(c.face, 'big')));
      const eff = ME.effText(out.e, st);
      body.push(UI.note(c.face <= 2 ? 'bad' : c.face >= 5 ? 'good' : 'info', c.face + ' が出た', out.t + (eff ? '（' + eff + '）' : '')));
      if (c.face <= 2 && st.items.reroll > 0) actions.push(UI.btn('🎟️ 振り直し券を使う（残り' + st.items.reroll + '枚）', (e) => roll(app, e, () => ME.reroll(st, month)), ''));
    }
    return UI.card(ev.icon + ' ' + ev.title, month + '月のできごと',
      h('div', { class: 'small muted', style: { marginBottom: '6px' } }, UI.itemsLine(st)), body, actions.length ? h('div', { class: 'row dice-actions' }, actions) : null);
  };
})(window.RG = window.RG || {});
