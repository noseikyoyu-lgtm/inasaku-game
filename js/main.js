// アプリ本体：画面遷移・保存・共通ヘッダー
(function (RG) {
  'use strict';
  const UI = RG.ui, h = UI.h, S = RG.state, U = RG.util, D = RG.data;
  const app = RG.app = { st: null, tab: 'overview', resultTab: 'summary', undo: [], seasonRes: null, keepScroll: false };

  const SCREENS = () => ({
    title: RG.screens.title, scene: RG.screens.scene, chapter: RG.screens.chapter, dice: RG.screens.dice, event: RG.screens.event, plan: RG.screens.plan, season: RG.screens.season,
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
    collapseLongNotes(root);
    if (RG.sound) RG.sound.sync(app); // 場面に合わせてBGMを切り替える
    if (RG.tutorial) RG.tutorial.check(app);
  };

  // 長い補足説明（小さい灰色の文）は「💡くわしく」にたたんで、画面の文字を減らす
  function collapseLongNotes(root) {
    root.querySelectorAll('main p.small.muted, main p.muted.small, aside p.small.muted, aside p.muted.small').forEach((p) => {
      if (p.classList.contains('keep') || p.closest('details, .quest, .meter, .tut, .report, .saying, .survey') || p.textContent.length < 40) return;
      const key = p.textContent.slice(0, 40);
      app.openTips = app.openTips || {};
      const d = h('details', { class: 'tip-fold', open: !!app.openTips[key], ontoggle: (e) => { app.openTips[key] = e.target.open; } }, h('summary', null, '💡 くわしく'));
      p.replaceWith(d);
      d.appendChild(p);
    });
  }

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
      if (opts.msg) { UI.toast(opts.msg, null, true); RG.sound.play(/購入|採用|リース|建て|借り/.test(opts.msg) ? 'buy' : 'pop'); }
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

  app.autosave = () => {
    if (!app.st) return;
    if (!S.save('auto', app.st) && !app.saveWarned) {
      app.saveWarned = true;
      UI.toast('このブラウザでは自動保存ができません。ページを閉じると進み具合が消えるので、メニューの「ファイルに書き出す」で保存してください。', 'bad');
    }
  };

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
    if (S.plannedArea(st) < S.totalArea(st) * 0.5) {
      const go = await UI.confirm('田んぼの半分以上が空いています',
        h('div', { class: 'notes' }, UI.note('warn', null, '作付 ' + U.ha(S.plannedArea(st)) + ' / ' + U.ha(S.totalArea(st)) + '。何も作らない田にも地代や水利費はかかります。「作付計画」で作る品種と面積を決めましょう。')), '作付計画へ');
      if (go) { app.tab = 'crops'; app.render(); }
      return;
    }
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
      got.forEach((t, i) => setTimeout(() => UI.toast('称号「' + t.name + '」を手に入れた！'), 1100 + i * 700));
      // 新しく使えるようになったものがあれば、きらきらの音
      if ((st.lastResult.missionNotes || []).some((x) => x.indexOf('🔓') >= 0)) setTimeout(() => RG.sound.play('unlock'), 1100 + got.length * 700);
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

  // 自分の経営モード：ここまでで締めくくる／再開する
  app.closeGame = function () {
    const st = app.st;
    st.closed = { year: st.year, phase: st.phase };
    st.phase = 'end';
    RG.sound.play('fanfare');
    app.autosave();
    app.render();
  };
  app.reopenGame = function () {
    const st = app.st;
    st.phase = st.closed ? st.closed.phase : 'plan';
    st.closed = null;
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
  // 上のバー（ステータス表示）。ゲームのように、アイコンと大きな数字で今の状態を見せる
  const PHASE = { scene: ['💬', 'ものがたり'], chapter: ['📖', '章のはじまり'], dice: ['🎲', '運だめし'], event: ['📨', '年初のできごと'], plan: ['📝', '経営計画'], season: ['🌱', 'シーズン'], result: ['📊', '決算'],
    midterm: ['🏅', '中間評価'], end: ['🏁', '経営終了'], gameover: ['🏁', '経営終了'] };
  app.topbar = function () {
    const st = app.st;
    const bs = RG.accounting.bs(st);
    const area = U.sum(st.fields, (f) => f.area);
    const ph = PHASE[st.phase] || ['', ''];
    const phaseText = st.phase === 'season' && st.seasonMonth ? ph[1] + '・' + st.seasonMonth + '月' : ph[1];
    const debt = bs.longLoans + bs.emergency;
    // シーズン中（決算前）は、表示している月の月末の資金を出す
    const cm = st.phase === 'season' && st.seasonPending && app.seasonRes && app.seasonRes.cash.months[(st.seasonMonth || 1) - 1];
    const cash = cm ? cm.end : st.cash;
    const endless = st.mode === 'endless';
    return h('header', { class: 'topbar hud' },
      h('div', { class: 'hud-farm' },
        h('span', { class: 'hud-emblem', 'aria-hidden': 'true' }, '🌾'),
        h('div', { class: 'hud-name' }, h('b', null, st.farmName), h('small', null, D.SCENARIOS[st.scenarioId].name + '・' + (st.corp ? '法人' : '個人')))),
      h('div', { class: 'hud-year' },
        h('div', { class: 'hud-yr' }, h('b', null, st.year), h('span', null, '年目'), endless ? null : h('small', null, '/ ' + st.maxYear)),
        endless ? null : h('div', { class: 'hud-yrbar', title: st.maxYear + '年のうち ' + st.year + '年目' }, h('i', { style: { width: (st.year / st.maxYear * 100) + '%' } })),
        h('span', { class: 'hud-phase' }, ph[0] + ' ' + phaseText),
        endless ? h('span', { class: 'hud-ch', title: '区切りなく続けられます。メニューの「経営を締めくくる」で、いつでも振り返りへ' }, '♾️ 自分の経営モード') : RG.chapters ? h('span', { class: 'hud-ch', title: RG.chapters.of(st.year, st).goal }, '第' + RG.chapters.of(st.year, st).n + '章 ' + RG.chapters.of(st.year, st).name) : null),
      h('div', { class: 'topstats hud-stats' },
        stat('💰', cm ? '資金（' + st.seasonMonth + '月末）' : '資金', U.man(cash), cash < 0 ? 'neg' : cash < 500000 ? 'warn' : ''),
        stat('📈', '純資産', U.man(bs.equity), bs.equity < 0 ? 'neg' : ''),
        stat('🏦', '借入', U.man(debt), bs.emergency > 0 ? 'warn' : ''),
        stat('🌾', '面積', U.ha(area))),
      h('div', { class: 'hud-actions' },
        UI.btn(RG.sound.settings.bgm ? '🔊' : '🔇', () => { RG.sound.toggle('bgm'); app.keepScroll = true; app.render(); }, 'icon-btn', { 'aria-label': 'BGMの切り替え（今は' + (RG.sound.settings.bgm ? 'オン' : 'オフ') + '）', title: 'BGM' }),
        UI.btn('？', () => RG.tutorial.help(app), 'icon-btn help', { 'aria-label': '高橋さんの説明', title: '高橋さんがこの画面を説明します' }),
        UI.btn('💬', () => RG.feedback.open(app), 'icon-btn', { 'aria-label': '気づきを書く', title: '気づいたこと・困ったことを書いて送る' }),
        UI.btn('📖', UI.glossary, 'icon-btn', { 'aria-label': '用語集', title: '用語集' }),
        UI.btn('☰', app.menu, 'icon-btn', { 'aria-label': 'メニュー', title: 'メニュー（セーブ・設定）' })));
  };
  function stat(icon, l, v, cls) {
    return h('div', { class: 'topstat ' + (cls || '') }, h('span', { class: 'ic', 'aria-hidden': 'true' }, icon),
      h('span', { class: 'tx' }, h('span', { class: 'l' }, l), h('span', { class: 'v' }, v)));
  }

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
    if (app.st) {
      body.appendChild(h('h3', null, '高橋さんの説明'));
      const tut = app.st.tutorial || (app.st.tutorial = { seen: {} });
      const tutRow = h('div', { class: 'row' });
      const drawTut = () => {
        tutRow.innerHTML = '';
        tutRow.appendChild(UI.btn('最初の説明をもう一度見る', () => { close(); app.viewingLast = false; app.tab = 'overview'; app.render(); if (app.st.phase === 'plan') RG.tutorial.start(app, 'plan'); else RG.tutorial.help(app); }, 'sm'));
        tutRow.appendChild(UI.btn('初めての画面の説明：' + (tut.off ? '出さない' : '出す'), () => { tut.off = !tut.off; app.autosave(); drawTut(); }, 'sm'));
      };
      drawTut();
      body.appendChild(tutRow);
    }
    // 自分の経営モード：好きなところで経営を締めくくって、ふり返りへ
    if (app.st && app.st.mode === 'endless' && app.st.phase === 'plan' && app.st.history.length) {
      body.appendChild(h('h3', null, '経営を締めくくる'));
      body.appendChild(h('div', { class: 'row' }, UI.btn('🏁 ここまでの経営をふり返る', () => { close(); app.closeGame(); }, 'sm'),
        h('span', { class: 'muted small' }, '最終評価と高橋さんの見立てを出します。あとで続きから再開もできます')));
    }
    body.appendChild(h('h3', null, '更新履歴'));
    body.appendChild(h('div', { class: 'row' }, UI.btn((RG.changelogUnseen() ? '🆕 ' : '') + '更新履歴を見る', () => { close(); UI.showChangelog(); }, 'sm'),
      h('span', { class: 'muted small' }, '最新：版 ' + RG.CHANGELOG[0].ver + '（' + RG.CHANGELOG[0].date + '）')));
    body.appendChild(h('h3', null, '称号'));
    body.appendChild(h('div', { class: 'row' }, UI.btn('称号を見る', () => RG.screens.showTitles(app.st), 'sm'),
      app.st && app.st.featOpen ? UI.btn('🔓 解放の一覧', () => RG.screens.showUnlocks(app.st), 'sm') : null));
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
