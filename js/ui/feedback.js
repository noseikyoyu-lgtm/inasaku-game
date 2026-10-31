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
  FB.cleanSave = function (st) {
    let json = JSON.stringify(st);
    if (st.farmName && st.farmName.length >= 2) json = json.split(JSON.stringify(st.farmName).slice(1, -1)).join('農場');
    return json;
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
      if (body.length > 45000 && data.save) body = JSON.stringify(Object.assign({}, data, { save: '（長すぎるため省略）' }));
      if (body.length > 45000 && data.game && data.game.plans) body = JSON.stringify(Object.assign({}, data, { save: undefined, game: Object.assign({}, data.game, { plans: [], omitted: '長すぎるため計画の記録を省略' }) }));
      fd.append(c.fields.body, body);
      try {
        await fetch(c.formAction, { method: 'POST', mode: 'no-cors', body: fd });
        UI.toast('送りました。ありがとうございます！');
        return true;
      } catch (e) {
        UI.toast('送れませんでした。ファイルに書き出します。', 'bad');
      }
    }
    FB.download(data);
    return false;
  };

  FB.download = function (data) {
    const d = new Date();
    const name = (data.kind === 'survey' ? 'アンケート' : '気づき') + '_' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '_' + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0') + '.json';
    const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' })), download: name });
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    const to = RG.CONFIG && RG.CONFIG.contact;
    UI.toast('「' + name + '」を書き出しました。' + (to ? to + ' に送ってください。' : ''));
  };

  const privacyNote = () => h('p', { class: 'small muted' },
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
    const where = st ? st.year + '年目・' + ({ dice: '運だめし', event: '年初のできごと', plan: '経営計画（' + app.tab + '）', season: 'シーズン ' + (st.seasonMonth || '') + '月', result: '決算', midterm: '中間評価', end: '経営終了', gameover: '経営終了' }[st.phase] || st.phase) : 'タイトル画面';
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
        if (st && withLog.checked) data.save = FB.cleanSave(st);
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
