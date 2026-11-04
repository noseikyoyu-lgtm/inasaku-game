// 感想・気づき・アンケートを送る（Google フォーム）か、ファイルに書き出す
(function (RG) {
  'use strict';
  const UI = RG.ui, h = UI.h, U = RG.util;
  const FB = RG.feedback = {};
  const CFG = () => (RG.CONFIG && RG.CONFIG.feedback) || {};

  FB.canSend = () => { const c = CFG(); return !!(c.formAction && c.fields && c.fields.body); };

  // 遊んだ人ごとの番号（名前の代わり。このブラウザに残る）
  FB.playerId = function () {
    try {
      let id = localStorage.getItem('inasaku.player');
      if (!id) { id = 'p' + Math.random().toString(36).slice(2, 10); localStorage.setItem('inasaku.player', id); }
      return id;
    } catch (e) { return 'p-unknown'; }
  };

  function pack(kind, st, content, withLog) {
    return {
      kind, version: (RG.CONFIG && RG.CONFIG.version) || '', at: new Date().toISOString(), player: FB.playerId(),
      content,
      game: st ? (withLog ? RG.playlog.summary(st) : { scenario: st.scenarioId, custom: st.scenarioId === 'custom', seed: st.seed, year: st.year, phase: st.phase }) : null,
    };
  }

  // セーブから農場名を除く（自分の経営で遊んだ場合も名前は送らない）
  // slim：送信用に軽くする（試算用の初期状態と、別に送るプレイ記録を外す）
  FB.cleanSave = function (st, slim) {
    // 農場名は、ニュースの文などに入っているものも含めて、すべて「農場」に置きかえる
    const names = [st.farmName, st.custom && st.custom.farmName].filter((n) => typeof n === 'string' && n && n !== '農場');
    const scrub = (v) => (typeof v === 'string' ? names.reduce((x, n) => x.split(n).join('農場'), v)
      : Array.isArray(v) ? v.map(scrub) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, scrub(x)])) : v);
    const c = scrub(JSON.parse(JSON.stringify(st)));
    c.farmName = '農場';
    if (slim) { delete c.initialSnapshot; delete c.playlog; delete c.baseline; }
    else if (typeof c.initialSnapshot === 'string') {
      try { const s0 = JSON.parse(c.initialSnapshot); s0.farmName = '農場'; c.initialSnapshot = JSON.stringify(s0); } catch (e) { delete c.initialSnapshot; }
    }
    if (c.custom && c.custom.farmName) c.custom.farmName = '農場';
    return JSON.stringify(c);
  };

  // 送る。送れなければファイルに書き出す
  FB.deliver = async function (data) {
    const json = JSON.stringify(data);
    if (FB.canSend()) {
      const c = CFG();
      const fd = new FormData();
      if (c.fields.kind) fd.append(c.fields.kind, data.kind);
      if (c.fields.version) fd.append(c.fields.version, data.version);
      // フォームの1つの欄に入る長さにおさめる（長ければセーブ、次に計画の記録を省く）
      let body = json;
      if (body.length > 45000 && data.save && data.saveSlim) body = JSON.stringify(Object.assign({}, data, { save: data.saveSlim, saveSlim: undefined }));
      let saveDropped = false;
      if (body.length > 45000 && data.save) { body = JSON.stringify(Object.assign({}, data, { save: '（長すぎるため省略）', saveSlim: undefined })); saveDropped = true; }
      if (body.length > 45000 && data.game && data.game.plans) body = JSON.stringify(Object.assign({}, data, { save: undefined, game: Object.assign({}, data.game, { plans: [], omitted: '長すぎるため計画の記録を省略' }) }));
      fd.append(c.fields.body, body);
      try {
        await fetch(c.formAction, { method: 'POST', mode: 'no-cors', body: fd });
        UI.toast(saveDropped ? '送りました。ありがとうございます！（セーブは大きすぎて送れなかったので、場面の再現が必要ならメニューの「ファイルに書き出す」で保存してください）' : '送りました。ありがとうございます！');
        return true;
      } catch (e) {
        UI.toast('送れませんでした。ファイルに書き出します。', 'bad');
      }
    }
    FB.download(data);
    return false;
  };

  // ---------- プレイの記録を、経営が終わったとき（クリア・ゲームオーバー）に送る（送ってよいと選んだ人だけ） ----------
  // アンケートに答えなくても、最後まで遊んだ人と破綻した人の記録が集まるので、どこで難しくなるかがわかる
  const SHARE_KEY = 'inasaku.share';
  // '1'＝送る・'0'＝送らない・null＝まだ聞いていない
  FB.shareChoice = () => { try { return localStorage.getItem(SHARE_KEY); } catch (e) { return '0'; } };
  FB.setShare = (on) => { try { localStorage.setItem(SHARE_KEY, on ? '1' : '0'); } catch (e) { /* 無視 */ } };
  FB.sendLog = function (st) {
    if (!st || !FB.canSend() || FB.shareChoice() !== '1') return;
    const c = CFG(), data = pack('log', st, null, true);
    let body = JSON.stringify(data);
    if (body.length > 45000) body = JSON.stringify(Object.assign({}, data, { game: Object.assign({}, data.game, { plans: data.game.plans.slice(-3), omitted: '長すぎるため古い計画の記録を省略' }) }));
    const fd = new FormData();
    if (c.fields.kind) fd.append(c.fields.kind, data.kind);
    if (c.fields.version) fd.append(c.fields.version, data.version);
    fd.append(c.fields.body, body);
    // 遊んでいる人の邪魔をしないよう、知らせずに送る（送れなくてもそのまま）
    fetch(c.formAction, { method: 'POST', mode: 'no-cors', body: fd }).catch(() => { /* 無視 */ });
  };
  const shareNote = () => h('p', { class: 'small muted keep' }, '送るのは、クリアしたときとゲームオーバーになったときだけです。送るもの：始め方・シード番号・ゲームの版と、毎年の判断（作付・機械・人・販路・借入・できごとの選び方）と結果の数字（収量・売上・所得・資金・面積など）。農場名・名前・地名は送りません。セーブも送りません。あとからメニューの「プレイの記録を送る」で変えられます。');
  // 経営が終わったとき：送ってよいと選んでいれば送る。まだ聞いていなければ、ここで聞く（同じ年の終わりは1回だけ送る）
  FB.atEnd = function (app, st) {
    if (!FB.canSend() || !st || st.logSent === st.year) return;
    const send = () => { st.logSent = st.year; FB.sendLog(st); app.autosave(); };
    const choice = FB.shareChoice();
    if (choice === '1') { send(); return; }
    if (choice != null) return;
    UI.modal({ title: '📊 プレイの記録を送ってもいいですか？',
      body: h('div', null,
        h('p', null, 'この経営の毎年の判断と結果の数字を送ります。うまくいった経営も、うまくいかなかった経営も、ゲームのバランスを直す大事な手がかりになります。'),
        shareNote()),
      actions: [{ label: '送らない', onClick: () => FB.setShare(false) },
        { label: '送ってよい', cls: 'primary', onClick: () => { FB.setShare(true); send(); UI.toast('送りました。ありがとうございます！'); } }] });
  };
  // メニューで、送る／送らないを切り替える
  FB.shareMenu = function () {
    if (!FB.canSend()) return null;
    const on = FB.shareChoice() === '1';
    return h('div', null,
      h('div', { class: 'row' }, h('span', null, on ? '今は：送っています' : '今は：送っていません'),
        UI.btn(on ? '送らないようにする' : '送るようにする', (e) => {
          FB.setShare(!on);
          UI.toast(!on ? 'クリアやゲームオーバーのときに記録を送ります。ありがとうございます！' : '記録を送らないようにしました');
          const box = e.target.closest('.share-menu'); if (box) { box.innerHTML = ''; box.appendChild(FB.shareMenu()); }
        }, 'sm')),
      shareNote());
  };

  FB.download = function (data) {
    const d = new Date();
    const name = (data.kind === 'survey' ? 'アンケート' : '気づき') + '_' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '_' + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0') + '.json';
    const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(Object.assign({}, data, { saveSlim: undefined }), null, 1)], { type: 'application/json' })), download: name });
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    const to = RG.CONFIG && RG.CONFIG.contact;
    UI.toast('「' + name + '」を書き出しました。' + (to ? to + ' に送ってください。' : ''));
  };

  const privacyNote = () => h('p', { class: 'small muted keep' },
    '送るもの：書いた内容、ゲームの状況（年・画面・シード番号）' + '、「プレイの記録」にチェックしたときは毎年の判断と結果の数字。農場名・名前・地名は送りません。「自分の経営で始める」で遊んだ場合も、面積や金額などの数字だけが送られます。' +
    (FB.canSend() ? '' : '（このゲームは送信先が設定されていないため、ファイルに書き出します）'));

  // ---------- その場の気づき ----------
  const CATS = [['fun', '😊 おもしろい'], ['hard', '🤔 わかりにくい'], ['bug', '🐞 おかしい・不具合'], ['idea', '💡 こうしてほしい']];
  FB.open = function (app) {
    const st = app.st;
    let cat = 'idea';
    const chips = h('div', { class: 'row fb-cats' });
    const drawChips = () => { chips.innerHTML = ''; CATS.forEach(([k, l]) => chips.appendChild(UI.btn(l, () => { cat = k; drawChips(); }, 'sm ' + (cat === k ? 'primary' : '')))); };
    drawChips();
    const ta = h('textarea', { rows: 5, placeholder: '気づいたこと、困ったこと、こうなったらおもしろい、など自由に', style: { width: '100%' }, 'aria-label': '気づき' });
    const withLog = h('input', { type: 'checkbox', checked: true, id: 'fb-log' });
    const where = st ? st.year + '年目・' + ({ dice: '運だめし', event: '年初のできごと', plan: '経営計画（' + (RG.advisor.TAB_NAMES[app.tab] || app.tab) + '）', season: 'シーズン ' + (st.seasonMonth || '') + '月', result: '決算', midterm: '中間評価', end: '経営終了', gameover: '経営終了' }[st.phase] || st.phase) : 'タイトル画面';
    const body = h('div', { class: 'stack' },
      h('p', { class: 'small' }, '今の場面：', h('b', null, where)),
      chips, ta,
      st ? h('label', { class: 'row small', for: 'fb-log' }, withLog, 'プレイの記録とセーブも付ける（同じ場面を再現して確かめるため）') : null,
      privacyNote());
    UI.modal({ title: '💬 気づきを書く', body, actions: [
      { label: 'やめる' },
      { label: FB.canSend() ? '送る' : 'ファイルに書き出す', cls: 'primary', onClick: () => {
        const text = ta.value.trim();
        if (!text) { UI.toast('内容を書いてください', 'bad'); return false; }
        const content = { category: cat, text, where, screen: st ? st.phase : 'title', tab: app.tab, month: st ? st.seasonMonth : null };
        const data = pack('note', st, content, st && withLog.checked);
        if (st && withLog.checked) { data.save = FB.cleanSave(st); if (FB.canSend()) data.saveSlim = FB.cleanSave(st, true); }
        if (st) RG.playlog.get(st).notes.push({ y: st.year, cat, text, where });
        FB.deliver(data);
        return true;
      } }] });
    setTimeout(() => ta.focus(), 50);
  };

  // ---------- 終わったあとのアンケート ----------
  const Q = [
    ['fun', 'ゲームはおもしろかったですか', ['つまらない', '', 'ふつう', '', 'とてもおもしろい']],
    ['difficulty', '難しさはどうでしたか', ['かんたんすぎ', '', 'ちょうどよい', '', '難しすぎ']],
    ['learn', '経営の勉強になりましたか', ['ならなかった', '', 'すこし', '', 'とてもなった']],
    ['ownFarm', '自分の（将来の）経営を考えるきっかけになりましたか', ['ならなかった', '', 'すこし', '', 'とてもなった']],
    ['again', 'もう一度遊びたいですか', ['遊びたくない', '', 'どちらとも', '', 'ぜひ遊びたい']],
  ];
  const ROLES = ['農業者（経営主）', '農業者（家族・従業員）', '新規就農をめざしている', '農業を学ぶ学生', '農業の指導・支援の仕事', 'その他'];

  RG.screens.surveyCard = function (app) {
    const st = app.st;
    if (st.survey && st.survey.sent) return UI.card('アンケート', null, UI.note('good', null, 'アンケートにご協力いただき、ありがとうございました。'));
    const ans = {};
    const rows = Q.map(([k, label, ends]) => {
      const box = h('div', { class: 'likert', role: 'radiogroup', 'aria-label': label });
      const draw = () => {
        box.innerHTML = '';
        for (let i = 1; i <= 5; i++) box.appendChild(h('button', { type: 'button', class: 'lk' + (ans[k] === i ? ' on' : ''), role: 'radio', 'aria-checked': ans[k] === i ? 'true' : 'false',
          title: ends[i - 1] || String(i), onclick: () => { ans[k] = i; draw(); } }, String(i)));
      };
      draw();
      return h('div', { class: 'q' }, h('div', { class: 'ql' }, label), box, h('div', { class: 'ends small muted' }, h('span', null, ends[0]), h('span', null, ends[4])));
    });
    const role = UI.select([{ value: '', label: '選んでください' }].concat(ROLES.map((r) => ({ value: r, label: r }))), '', () => {}, { 'aria-label': 'あなたの立場' });
    const good = h('textarea', { rows: 3, style: { width: '100%' }, placeholder: 'よかったところ、おもしろかった場面', 'aria-label': 'よかったところ' });
    const change = h('textarea', { rows: 3, style: { width: '100%' }, placeholder: '変えてほしいところ、わかりにくかったところ、足してほしいもの', 'aria-label': '変えてほしいところ' });
    const withLog = h('input', { type: 'checkbox', checked: true, id: 'sv-log' });
    return UI.card('アンケートにご協力ください', 'ゲームをよりよくするために使います',
      h('div', { class: 'survey' }, rows,
        h('div', { class: 'q' }, h('div', { class: 'ql' }, 'あなたの立場'), role),
        h('div', { class: 'q' }, h('div', { class: 'ql' }, 'よかったところ'), good),
        h('div', { class: 'q' }, h('div', { class: 'ql' }, '変えてほしいところ'), change),
        h('label', { class: 'row small', for: 'sv-log' }, withLog, 'プレイの記録（毎年の判断と結果の数字）も付ける'),
        privacyNote(),
        h('div', { class: 'row' }, h('span', { class: 'spacer' }), UI.btn(FB.canSend() ? 'アンケートを送る' : 'アンケートをファイルに書き出す', async () => {
          if (Object.keys(ans).length < Q.length) { UI.toast('5つの質問すべてに答えてください', 'bad'); return; }
          const content = Object.assign({}, ans, { role: role.value, good: good.value.trim(), change: change.value.trim() });
          const ok = await FB.deliver(pack('survey', st, content, withLog.checked));
          st.survey = { sent: true, at: new Date().toISOString(), delivered: ok };
          app.autosave(); app.keepScroll = true; app.render();
        }, 'primary'))));
  };
})(window.RG = window.RG || {});
