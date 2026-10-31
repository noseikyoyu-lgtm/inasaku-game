// サイコロの画面：年初の運だめし、シーズン中のサイコロ勝負、サイコロの絵と振る演出
(function (RG) {
  'use strict';
  const UI = RG.ui, h = UI.h, U = RG.util, DI = RG.dice;

  // ---------- サイコロの絵 ----------
  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  UI.die = function (face, cls) {
    const on = PIPS[face] || [];
    return h('div', { class: 'die ' + (cls || '') + (face ? '' : ' blank') + (face === 1 ? ' one' : ''), role: 'img', 'aria-label': face ? 'サイコロの目 ' + face : 'まだ振っていないサイコロ' },
      face ? Array.from({ length: 9 }, (_, i) => h('span', { class: on.indexOf(i) >= 0 ? 'pip' : '' })) : h('b', null, '?'));
  };
  function setFace(el, face) {
    const on = PIPS[face];
    el.classList.remove('blank');
    el.classList.toggle('one', face === 1);
    el.innerHTML = '';
    for (let i = 0; i < 9; i++) el.appendChild(h('span', { class: on.indexOf(i) >= 0 ? 'pip' : '' }));
  }
  // 振る演出（目はすでに決まっている）。終わったら done を呼ぶ
  UI.rollDie = function (el, face, done) {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!el || reduce) { done(); return; }
    el.classList.add('rolling');
    let n = 0, last = 0;
    const iv = setInterval(() => {
      let f;
      do { f = 1 + Math.floor(Math.random() * 6); } while (f === last);
      last = f;
      setFace(el, f);
      if (RG.sound) RG.sound.play('tick');
      if (++n >= 10) { clearInterval(iv); setFace(el, face); el.classList.remove('rolling'); setTimeout(done, 450); }
    }, 70);
  };

  // サイコロを振るボタン：状態を変えてから演出し、終わったら描き直す
  function rollBtn(app, label, cls, doRoll) {
    return UI.btn(label, (e) => {
      if (app.rolling) return;
      app.rolling = true;
      const face = doRoll();
      app.autosave();
      const el = e.target.closest('.card').querySelector('.die');
      e.target.closest('.card').querySelectorAll('button').forEach((b) => { b.disabled = true; });
      UI.rollDie(el, face, () => {
        if (RG.sound) RG.sound.play(face === 1 ? 'bad' : face === 6 ? 'great' : 'coin');
        app.rolling = false; app.keepScroll = true; app.render();
      });
    }, cls);
  }

  UI.itemsLine = (st) => h('span', { class: 'items-line' }, '🧧 お守り ' + st.items.omamori + '・🎟️ 振り直し券 ' + st.items.reroll);

  // ---------- 年初の運だめし ----------
  RG.screens.dice = function (app) {
    const st = app.st, L = st.luck;
    if (!L || L.year !== st.year) { DI.leave(st); return RG.screens[st.phase](app); }
    const face = L.rolls.length ? L.rolls[L.rolls.length - 1] : 0;
    const body = [];
    body.push(h('p', null, '年の初めにサイコロを振って、今年の運をためします。'));
    body.push(h('div', { class: 'dice-rule' },
      h('div', { class: 'r bad' }, h('b', null, '⚀ 1'), '不運のカード'),
      h('div', { class: 'r' }, h('b', null, '⚁〜⚄ 2〜5'), 'ふつうの年'),
      h('div', { class: 'r good' }, h('b', null, '⚅ 6'), '幸運のカード')));
    body.push(h('div', { class: 'dice-stage' }, UI.die(face, 'big')));

    let actions;
    if (!L.rolls.length) {
      actions = [rollBtn(app, '🎲 サイコロを振る', 'gold big', () => {
        const f = DI.roll(st);
        if (!DI.canReroll(st) || f === 6) DI.settle(st); // 振り直せないとき・6のときはそのまま決まる
        return f;
      })];
    } else if (!L.card) {
      body.push(h('p', { class: 'dice-msg' }, face + ' が出た。' + (face === 1 ? '不運のカードを引くことになる…' : 'ふつうの年になりそうだ。')));
      actions = [
        rollBtn(app, '🎟️ 振り直し券を使う（残り' + st.items.reroll + '枚）', '', () => { const f = DI.reroll(st); DI.settle(st); return f; }),
        UI.btn('この目で決める', () => { DI.settle(st); app.autosave(); app.render(); }, 'primary')];
    } else if (!L.done) {
      const c = L.card;
      if (c.kind === 'normal') {
        body.push(h('p', { class: 'dice-msg' }, face + ' が出た。今年はふつうの年になりそうだ。'));
        actions = [UI.btn('次へ ▶', () => { DI.finish(st, false); DI.leave(st); app.autosave(); app.render(); }, 'primary big')];
      } else {
        const card = DI.card(c.kind, c.id);
        body.push(h('div', { class: 'luck-card ' + c.kind },
          h('div', { class: 'k' }, c.kind === 'bad' ? '不運のカード' : '幸運のカード'),
          h('div', { class: 'ic', 'aria-hidden': 'true' }, card.icon),
          h('div', { class: 't' }, card.title)));
        if (c.kind === 'bad' && st.items.omamori > 0) {
          actions = [UI.btn('🧧 お守りで防ぐ（残り' + st.items.omamori + '個）', () => { DI.finish(st, true); app.autosave(); app.render(); }, 'gold'),
            UI.btn('受け入れる', () => { DI.finish(st, false); app.autosave(); app.render(); }, '')];
        } else {
          actions = [UI.btn(c.kind === 'bad' ? '受け入れる' : '受け取る', () => { DI.finish(st, false); app.autosave(); app.render(); }, 'primary big')];
        }
      }
    } else {
      body.push(UI.note(L.kind === 'bad' ? 'bad' : L.kind === 'good' ? 'good' : 'info', null, L.msg));
      actions = [UI.btn('次へ ▶', () => { DI.leave(st); app.autosave(); app.render(); }, 'primary big')];
    }
    return h('div', null, app.topbar(),
      h('div', { class: 'event-card' },
        UI.card(st.year + '年目 年初の運だめし', null, h('div', { class: 'small muted', style: { marginBottom: '6px' } }, UI.itemsLine(st)),
          body, h('div', { class: 'row dice-actions' }, actions))));
  };

  // ---------- シーズン中のサイコロ勝負 ----------
  UI.crisisCard = function (app, c) {
    const st = app.st;
    const ch = DI.choiceOf(st, c.id);
    const g = c.guard(st);
    const table = h('div', { class: 'dice-outcomes' }, c.outcomes.map((o) =>
      h('div', { class: 'r ' + o.kind }, h('b', null, o.faces.map((f) => DI.FACES[f - 1]).join('')), o.desc)));
    const body = [h('p', null, c.text)];
    let actions;
    if (!ch) {
      body.push(h('div', { class: 'crisis-choices' },
        h('div', { class: 'opt' }, h('div', { class: 't' }, '🛡️ 対策する'), h('div', null, g.label), h('div', { class: 'small muted' }, g.desc)),
        h('div', { class: 'opt' }, h('div', { class: 't' }, '🎲 対策せず、サイコロで勝負'), h('div', { class: 'small muted' }, '出た目で結果が決まる'), table)));
      body.push(h('p', { class: 'small muted' }, '収量が落ちた分は、収量共済に入っていれば一部が戻ります。品質（1等米の割合）の低下は戻りません。'));
      body.push(h('div', { class: 'dice-stage' }, UI.die(0)));
      actions = [UI.btn('🛡️ ' + g.label, () => { DI.chooseGuard(st, c.id); app.autosave(); app.keepScroll = true; app.render(); }, 'primary'),
        rollBtn(app, '🎲 サイコロで勝負', 'gold', () => DI.rollCrisis(st, c.id))];
    } else {
      const face = ch.rolls[ch.rolls.length - 1];
      const o = DI.outcomeOf(c, face);
      body.push(table);
      body.push(h('div', { class: 'dice-stage' }, UI.die(face, 'big')));
      body.push(UI.note(o.kind === 'good' ? 'good' : o.kind === 'warn' ? 'warn' : 'bad', face + ' が出た', o.text + '（' + o.desc + '）'));
      actions = [];
      if (o.kind !== 'good' && st.items.reroll > 0) actions.push(rollBtn(app, '🎟️ 振り直し券を使う（残り' + st.items.reroll + '枚）', '', () => DI.rerollCrisis(st, c.id)));
      actions.push(UI.btn('この結果で進む ▶', () => { DI.fixCrisis(st, c.id); app.autosave(); app.keepScroll = true; app.render(); }, 'primary'));
    }
    return UI.card(c.icon + ' ' + c.title, c.month + '月のサイコロ勝負',
      h('div', { class: 'small muted', style: { marginBottom: '6px' } }, UI.itemsLine(st)), body, h('div', { class: 'row dice-actions' }, actions));
  };
})(window.RG = window.RG || {});
