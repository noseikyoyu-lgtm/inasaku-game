// アプリ本体：画面遷移・保存・共通ヘッダー
(function (RG) {
  'use strict';
  const UI = RG.ui, h = UI.h, S = RG.state, U = RG.util, D = RG.data;
  const app = RG.app = { st: null, tab: 'overview', resultTab: 'summary', undo: [], seasonRes: null, keepScroll: false };

  const SCREENS = () => ({
    title: RG.screens.title, dice: RG.screens.dice, event: RG.screens.event, plan: RG.screens.plan, season: RG.screens.season,
    result: RG.screens.result, midterm: RG.screens.midterm, end: RG.screens.end, gameover: RG.screens.end,
  });

  app.render = function () {
    const root = document.getElementById('app');
    const y = window.scrollY;
    const scr = app.st ? app.st.phase : 'title';
    if (!app.st) app.viewingLast = false;
    let node;
    try {
      node = SCREENS()[scr](app);
    } catch (e) {
      console.error(e);
      node = h('div', { class: 'title-wrap' }, UI.card('エラーが発生しました', null, h('p', null, String(e && e.message)),
        UI.btn('タイトルへ戻る', () => { app.st = null; app.render(); }, 'primary')));
    }
    root.innerHTML = '';
    root.appendChild(node);
    window.scrollTo(0, app.keepScroll ? y : 0);
    app.keepScroll = false;
  };

  // 計画の変更。fn がエラーメッセージを返したら元に戻す
  app.update = function (fn, opts) {
    opts = opts || {};
    const snap = JSON.stringify(app.st);
    const err = fn(app.st);
    if (typeof err === 'string') {
      app.st = S.fromJSON(snap);
      UI.toast(err, 'bad');
    } else {
      if (!opts.noUndo) { app.undo.push(snap); if (app.undo.length > 30) app.undo.shift(); }
      if (opts.msg) UI.toast(opts.msg);
      app.autosave();
    }
    app.keepScroll = true;
    app.render();
  };

  app.undoLast = function () {
    const s = app.undo.pop();
    if (!s) return;
    app.st = S.fromJSON(s);
    app.autosave();
    app.keepScroll = true;
    app.render();
    UI.toast('1つ前の状態に戻しました');
  };

  app.autosave = () => { if (app.st) S.save('auto', app.st); };

  app.newGame = function (opts) {
    app.viewingLast = false;
    app.st = S.newGame(opts);
    app.undo = []; app.tab = 'overview';
    app.autosave();
    app.render();
  };

  app.loadState = function (st) {
    app.st = st; app.undo = []; app.tab = 'overview'; app.resultTab = 'summary'; app.seasonRes = null; app.viewingLast = false;
    app.autosave();
    app.render();
  };

  app.startSeason = async function () {
    const st = app.st;
    const hints = RG.advisor.planHints(st, RG.sim.simulate(st, { preview: true })).filter((x) => x.level === 'bad');
    if (hints.length) {
      const ok = await UI.confirm('この計画で1年を始めますか？',
        h('div', { class: 'notes' }, h('p', null, '次の問題が見込まれています。'), hints.map((x) => UI.note('bad', null, x.text))), 'このまま始める');
      if (!ok) return;
    }
    // 決算はシーズンを最後まで進めてから。1か月ずつ進める
    st.seasonPending = true;
    st.seasonMonth = 1;
    RG.playlog.plan(st);
    st.phase = 'season';
    app.seasonRes = null;
    app.undo = [];
    app.autosave();
    app.render();
  };

  app.toResult = function () {
    const st = app.st;
    if (st.seasonPending) {
      RG.sim.apply(st, RG.sim.simulate(st));
      st.seasonPending = false;
      app.seasonRes = null;
      // 称号
      const got = RG.titles.check(st, st.lastResult);
      st.lastResult.newTitles = got.map((t) => t.id);
      RG.playlog.result(st, st.lastResult);
      RG.sound.play(got.length ? 'great' : 'fanfare');
      got.forEach((t, i) => setTimeout(() => UI.toast('称号「' + t.name + '」を手に入れた！'), 300 + i * 600));
    }
    app.st.phase = 'result';
    app.resultTab = 'summary';
    app.autosave();
    app.render();
  };

  // 5・10・15年目の決算のあとの中間評価
  app.toMidterm = function () {
    const st = app.st;
    RG.sound.play('good');
    const ev = RG.midterm.evaluate(st);
    st.midterms = (st.midterms || []).filter((m) => m.year !== st.year);
    st.midterms.push({ year: st.year, rank: ev.end.rank, total: ev.end.total });
    st.phase = 'midterm';
    app.autosave();
    app.render();
  };

  app.nextYear = function () {
    app.viewingLast = false;
    S.nextYear(app.st);
    app.tab = 'overview';
    app.autosave();
    app.render();
  };

  // ---------- 共通ヘッダー ----------
  app.topbar = function () {
    const st = app.st;
    const bs = RG.accounting.bs(st);
    const area = U.sum(st.fields, (f) => f.area);
    const phase = { dice: '運だめし', event: '年初のできごと', plan: '経営計画', season: 'シーズン', result: '決算', midterm: '中間評価', end: '経営終了', gameover: '経営終了' }[st.phase];
    return h('header', { class: 'topbar' },
      h('div', { class: 'brand' }, h('span', { class: 'logo', 'aria-hidden': 'true' }, '🌾'), st.farmName),
      h('span', { class: 'chip' }, st.year + '年目 / ' + st.maxYear + '年'),
      h('span', { class: 'badge' }, phase),
      h('div', { class: 'topstats' },
        stat('資金', U.man(st.cash), st.cash < 0 ? 'neg' : ''),
        stat('純資産', U.man(bs.equity), bs.equity < 0 ? 'neg' : ''),
        stat('借入', U.man(bs.longLoans + bs.emergency)),
        stat('経営面積', U.ha(area)),
        stat(st.corp ? '法人' : '個人', D.SCENARIOS[st.scenarioId].name)),
      h('span', { class: 'spacer' }),
      UI.btn(RG.sound.settings.bgm ? '♪ BGM' : '♪ 消音', () => { RG.sound.toggle('bgm'); app.keepScroll = true; app.render(); }, 'ghost sm', { 'aria-label': 'BGMの切り替え（今は' + (RG.sound.settings.bgm ? 'オン' : 'オフ') + '）' }),
      UI.btn('💬 気づき', () => RG.feedback.open(app), 'ghost sm', { title: '気づいたこと・困ったことを書いて送る' }),
      UI.btn('用語集', UI.glossary, 'ghost sm'),
      UI.btn('メニュー', app.menu, 'sm'));
  };
  function stat(l, v, cls) { return h('div', { class: 'topstat' }, h('span', { class: 'l' }, l), h('span', { class: 'v ' + (cls || '') }, v)); }

  // ---------- メニュー（セーブ・ロード等） ----------
  app.menu = function () {
    const body = h('div', { class: 'stack' });
    const slots = h('div', { class: 'stack' });
    const drawSlots = () => {
      slots.innerHTML = '';
      [1, 2, 3].forEach((n) => {
        const m = S.meta(n);
        slots.appendChild(h('div', { class: 'row' },
          h('b', null, 'スロット' + n),
          h('span', { class: 'muted small' }, m ? m.farmName + '（' + m.scenario + '・' + m.year + '年目）' + new Date(m.savedAt).toLocaleString('ja-JP') : '空き'),
          h('span', { class: 'spacer' }),
          app.st ? UI.btn('保存', () => { S.save(n, app.st) ? UI.toast('スロット' + n + 'に保存しました') : UI.toast('保存できませんでした', 'bad'); drawSlots(); }, 'sm') : null,
          m ? UI.btn('読み込む', () => { const st = S.load(n); if (st) { close(); app.loadState(st); } }, 'sm') : null));
      });
    };
    drawSlots();
    body.appendChild(h('h3', null, 'セーブ / ロード'));
    body.appendChild(slots);
    body.appendChild(h('p', { class: 'muted small' }, '進行は自動でも保存されます（タイトル画面の「続きから」）。保存はこのブラウザの中にだけ残ります。'));
    body.appendChild(h('div', { class: 'row' },
      app.st ? UI.btn('ファイルに書き出す', () => app.exportFile(), 'sm') : null,
      app.importButton()));
    body.appendChild(h('h3', null, '音'));
    const sndRow = h('div', { class: 'row' });
    const drawSnd = () => {
      sndRow.innerHTML = '';
      sndRow.appendChild(UI.btn('効果音：' + (RG.sound.settings.sfx ? 'オン' : 'オフ'), () => { RG.sound.toggle('sfx'); drawSnd(); }, 'sm'));
      sndRow.appendChild(UI.btn('BGM：' + (RG.sound.settings.bgm ? 'オン' : 'オフ'), () => { RG.sound.toggle('bgm'); drawSnd(); }, 'sm'));
    };
    drawSnd();
    body.appendChild(sndRow);
    body.appendChild(h('h3', null, '称号'));
    body.appendChild(h('div', { class: 'row' }, UI.btn('称号を見る', () => RG.screens.showTitles(app.st), 'sm')));
    body.appendChild(h('h3', null, '表示'));
    body.appendChild(h('div', { class: 'row' },
      UI.btn('ライト', () => app.setTheme('light'), 'sm'), UI.btn('ダーク', () => app.setTheme('dark'), 'sm'), UI.btn('自動', () => app.setTheme(''), 'sm')));
    const close = UI.modal({ title: 'メニュー', body, actions: [
      { label: 'タイトルへ戻る', onClick: () => { app.st = null; app.render(); } },
      { label: '閉じる', cls: 'primary' }] });
  };

  app.exportFile = function () {
    const st = app.st;
    const blob = new Blob([JSON.stringify(st)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: st.farmName + '_' + st.year + '年目.json' });
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  };

  app.importButton = function () {
    const inp = h('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' },
      onchange: () => {
        const f = inp.files[0];
        if (!f) return;
        const rd = new FileReader();
        rd.onload = () => {
          try {
            // 感想のファイル（気づきに付けたセーブ）も読み込める
            let text = rd.result;
            try { const o = JSON.parse(text); if (o && o.kind && typeof o.save === 'string') text = o.save; } catch (e) { /* セーブそのもの */ }
            const st = S.fromJSON(text);
            document.querySelectorAll('.overlay').forEach((o) => o.remove());
            app.titleView = 'menu';
            app.loadState(st);
            UI.toast('読み込みました');
          } catch (e) { UI.toast('読み込めませんでした。このゲームで書き出したセーブファイル（.json）を選んでください。', 'bad'); }
        };
        rd.readAsText(f);
      } });
    return h('span', null, inp, UI.btn('ファイルから読み込む', () => inp.click(), 'sm'));
  };

  app.setTheme = function (t) {
    if (t) document.documentElement.setAttribute('data-theme', t); else document.documentElement.removeAttribute('data-theme');
    try { localStorage.setItem('inasaku.theme', t); } catch (e) { /* 無視 */ }
  };

  // ---------- 起動 ----------
  document.addEventListener('DOMContentLoaded', () => {
    try { const t = localStorage.getItem('inasaku.theme'); if (t) document.documentElement.setAttribute('data-theme', t); } catch (e) { /* 無視 */ }
    UI.installTermPopup();
    RG.sound.install();
    app.render();
  });
})(window.RG = window.RG || {});
