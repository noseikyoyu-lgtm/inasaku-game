// タイトル画面（夕暮れの田んぼの風景）と年初イベント
(function (RG) {
  'use strict';
  const UI = RG.ui, h = UI.h, D = RG.data, S = RG.state;

  const STARS = { shinki: 3, oyamoto: 2, hojin: 2 };
  const ORDER = ['custom'].concat(RG.data.SCENARIO_ORDER);

  // 経営スタイルのアイコン（線画）
  const ICONS = {
    shinki: 'M24 41V22M24 27c-8 0-12-5-12-12 8 0 12 5 12 12zM24 23c0-8 5-12 12-12 0 8-5 12-12 12zM12 41h24',
    oyamoto: 'M7 22 24 8l17 14M11 19v22h26V19M21 41v-10h6v10M30 25h4v4h-4z',
    hojin: 'M10 41V11h18v30M28 19h10v22M15 17h3M21 17h3M15 23h3M21 23h3M15 29h3M21 29h3M32 25h2M32 31h2M6 41h36',
    custom: 'M24 22a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM11 41c0-8 6-13 13-13s13 5 13 13M33 12l5-5M36 15h4',
  };
  const icon = (k) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 48 48'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('class', 'sc-icon');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', ICONS[k]); svg.appendChild(path);
    return svg;
  };

  RG.screens.title = function (app) {
    const view = app.titleView || 'menu';
    // 風景は1つの canvas を使い回す（画面を切り替えてもアニメーションが途切れない）
    let canvas = app.titleCanvas;
    if (!canvas || !canvas._alive) {
      canvas = app.titleCanvas = h('canvas', { class: 'title-canvas', role: 'img', 'aria-label': '夕暮れの黄金色の田んぼ' });
      RG.titleScene.mount(canvas);
    }
    const go = (v) => { app.titleView = v; app.render(); };

    let body;
    if (view === 'new') body = newGameWindow(app, go);
    else if (view === 'howto') body = howtoWindow(go);
    else if (view === 'load') body = loadWindow(app, go);
    else body = menuWindow(app, go);

    const intro = !app.titleIntroDone; app.titleIntroDone = true;
    const changed = app.titleLastView !== view; app.titleLastView = view;
    return h('div', { class: 'title-screen view-' + view + (intro ? ' intro' : '') + (changed ? ' changed' : '') }, canvas,
      h('div', { class: 'title-content' },
        h('header', { class: 'title-logo' },
          h('h1', null,
            h('span', { class: 'logo-kanji' }, '米道'),
            h('span', { class: 'logo-en' }, 'KOMEDO')),
          h('p', { class: 'logo-sub' }, '稲作経営シミュレーション')),
        h('div', { class: 'title-body' }, body),
        h('p', { class: 'title-foot' }, '品種は新潟県の主な品種をもとにしています。取引先・制度の一部は架空で、特性や数値は学習用に単純化しています。')));
  };

  function menuWindow(app, go) {
    const auto = S.meta('auto');
    const item = (label, sub, onClick) => h('button', { type: 'button', onclick: onClick }, h('span', { class: 'lbl' }, label), sub ? h('span', { class: 'sub' }, sub) : null, h('span', { class: 'arr', 'aria-hidden': 'true' }, '→'));
    return h('div', { class: 'px-window title-menu' },
      h('nav', { class: 'px-menu', 'aria-label': 'タイトルメニュー' },
        auto ? item('つづきから', auto.farmName + '・' + auto.scenario + '・' + auto.year + '年目',
          () => { const st = S.load('auto'); if (st) app.loadState(st); else UI.toast('読み込めませんでした', 'bad'); }) : null,
        item('はじめから', '3つの経営スタイルから選ぶ', () => go('new')),
        item('データをよみこむ', 'セーブスロット・ファイル', () => go('load')),
        item('あそびかた', 'JAの営農指導員・高橋さんが説明します', () => go('howto'))));
  }

  function newGameWindow(app, go) {
    const scenario = app.titleScenario || 'shinki';
    const chars = h('div', { class: 'chars', role: 'radiogroup', 'aria-label': '経営スタイル' }, ORDER.map((k) => {
      const sc = D.SCENARIOS[k];
      const on = k === scenario;
      return h('button', { class: 'char' + (on ? ' on' : ''), type: 'button', role: 'radio', 'aria-checked': on ? 'true' : 'false',
        onclick: () => { app.titleScenario = k; app.render(); } },
        on ? h('span', { class: 'cursor', 'aria-hidden': 'true' }, '✓') : null,
        h('div', { class: 'avatar-box' }, icon(k)),
        h('div', { class: 'name' }, sc.name),
        h('div', { class: 'stars', title: '難しさ' }, h('span', null, 'むずかしさ'),
          k === 'custom' ? h('span', { class: 'q' }, 'あなたしだい') : h('span', { class: 'diff-meter' }, [1, 2, 3].map((i) => h('i', { class: i <= STARS[k] ? 'on' : '' })))),
        h('div', { class: 'sub' }, sc.sub),
        h('div', { class: 'desc' }, sc.desc));
    }));
    const nameInp = h('input', { type: 'text', value: app.titleFarm || '稲穂ファーム', maxlength: 16, 'aria-label': '農場の名前',
      oninput: (e) => { app.titleFarm = e.target.value; } });
    const seedInp = h('input', { type: 'number', value: app.titleSeed || '', placeholder: 'おまかせ', min: 1, max: 999999, 'aria-label': 'シード番号',
      oninput: (e) => { app.titleSeed = e.target.value; } });
    if (scenario === 'custom' && !app.customDraft) app.customDraft = S.defaultCustom();
    const start = () => {
      const s = parseInt(app.titleSeed, 10);
      if (scenario === 'custom') {
        app.customDraft.corp = app.customDraft.corp === true || app.customDraft.corp === 'true';
        const err = validateCustom(app.customDraft);
        if (err) { UI.toast(err, 'bad'); return; }
      }
      app.titleView = 'menu';
      app.newGame({ scenarioId: scenario, custom: scenario === 'custom' ? app.customDraft : null,
        farmName: (app.titleFarm || '').trim() || '稲穂ファーム', seed: isFinite(s) && s > 0 ? s : RG.rng.randomSeed() });
    };
    return h('div', { class: 'px-window' },
      h('h2', null, 'どんな経営をはじめる？'),
      chars,
      scenario === 'custom' ? customForm(app) : null,
      h('div', { class: 'px-fields' },
        h('label', null, h('span', null, '農場の名前'), nameInp),
        h('label', null, h('span', null, 'シード番号'), seedInp, h('small', null, '同じ番号なら天候・米価が同じ20年に。授業で条件をそろえるときに'))),
      h('div', { class: 'px-actions' },
        h('button', { class: 'px-btn plain', type: 'button', onclick: () => go('menu') }, 'もどる'),
        h('button', { class: 'px-btn green', type: 'button', onclick: start }, 'この経営ではじめる →')));
  }

  // ---------- 自分の経営の入力 ----------
  function validateCustom(c) {
    const n = S.numOr;
    if (n(c.owned, 0) < 0 || n(c.rented, 0) < 0) return '面積にマイナスは入れられません';
    const area = n(c.owned, 0) + n(c.rented, 0);
    if (!(area >= 0.3)) return '農地の面積（所有＋借地）を入れてください';
    if (area > 300) return '面積が大きすぎます（300haまで）';
    if (!(n(c.age, 0) >= 18 && n(c.age, 0) <= 79)) return '経営主の年齢を18〜79歳で入れてください';
    if (c.successor !== 'none' && !(n(c.succAge, -1) >= 10 && n(c.succAge, -1) <= 70)) return '後継者の年齢を10〜70歳で入れてください';
    if (c.successor === 'now' && n(c.succAge, 0) < 18) return '一緒に働いている後継者は18歳以上で入れてください（まだ学生なら「これから就農する予定」を選んでください）';
    if (c.successor === 'plan' && !(n(c.succYear, 0) >= 1 && n(c.succYear, 0) <= 19)) return '後継者が就農するまでの年数を1〜19年で入れてください';
    if (n(c.rent, 0) < 0) return '地代にマイナスは入れられません';
    if (!c.crops.some((x) => n(x.pct, 0) > 0)) return '作付する品種の割合を入れてください';
    return null;
  }

  function customForm(app) {
    const c = app.customDraft;
    const num = (obj, key, o) => h('input', { type: 'number', value: obj[key], min: o.min, max: o.max, step: o.step || 1, 'aria-label': o.label, style: { width: (o.w || 110) + 'px' },
      oninput: (e) => { obj[key] = e.target.value === '' ? '' : +e.target.value; } });
    const sel = (obj, key, opts, label, rerender) => h('select', { 'aria-label': label,
      onchange: (e) => { obj[key] = e.target.value; if (rerender) { app.keepScroll = true; app.render(); } } },
      opts.map((o) => h('option', { value: o.value, selected: String(obj[key]) === String(o.value) }, o.label)));
    const fld = (label, ctrl, note) => h('label', null, h('span', null, label), ctrl, note ? h('small', null, note) : null);
    const unit = (ctrl, u) => h('span', { class: 'row', style: { gap: '4px', flexWrap: 'nowrap' } }, ctrl, h('span', { class: 'small' }, u));
    const section = (title) => h('h3', { class: 'cf-h' }, title);
    const rel = ['配偶者', '父', '母', '子', '兄弟姉妹', 'その他'].map((x) => ({ value: x, label: x }));
    const works = Object.keys(D.WORK_STYLES).map((k) => ({ value: k, label: D.WORK_STYLES[k].name + '（年' + D.WORK_STYLES[k].hours + '時間）' }));
    const crops = D.CROP_ORDER.filter((k) => k !== 'none' && !D.CROPS[k].alias).map((k) => ({ value: k, label: D.CROPS[k].name }));
    const sizes = (t) => [{ value: 'none', label: '持っていない（委託）' }].concat(['s', 'm', 'l'].map((z) => ({ value: z, label: D.MODELS[S.SIZE_MODEL[t][z]].name }))
      .filter((o, i, a) => a.findIndex((x) => x.label === o.label) === i));
    const MT = ['tractor', 'nursery', 'planter', 'combine', 'dryer'];
    return h('div', { class: 'custom-form' },
      h('p', { class: 'small' }, 'あなたの今の経営に近い数字を入れてください。だいたいで大丈夫です。入れた内容はこのブラウザの中に保存されます（感想を送るときも、農場名や名前は送りません）。'),
      section('経営主と家族'),
      h('div', { class: 'px-fields' },
        fld('経営の形', sel(c, 'corp', [{ value: '', label: '個人経営' }, { value: 'true', label: '法人' }], '経営の形', true)),
        fld('経営主の年齢', unit(num(c, 'age', { min: 18, max: 79, label: '経営主の年齢', w: 80 }), '歳')),
        fld('稲作の経験', unit(num(c, 'exp', { min: 0, max: 60, label: '稲作の経験年数', w: 80 }), '年'))),
      h('div', { class: 'cf-sub' }, '一緒に働く家族（続柄・年齢・働き方）'),
      h('div', { class: 'cf-list' },
        c.family.map((f, i) => h('div', { class: 'cf-row' },
          sel(f, 'rel', rel, '続柄'), unit(num(f, 'age', { min: 10, max: 95, label: '年齢', w: 70 }), '歳'), sel(f, 'work', works, '働き方'),
          h('button', { class: 'px-btn plain cf-x', type: 'button', 'aria-label': '削除', onclick: () => { c.family.splice(i, 1); app.keepScroll = true; app.render(); } }, '×'))),
        c.family.length < 4 ? h('button', { class: 'px-btn plain cf-add', type: 'button', onclick: () => { c.family.push({ rel: '配偶者', age: 55, work: 'help' }); app.keepScroll = true; app.render(); } }, '＋ 家族の働き手を追加') : null),
      h('div', { class: 'px-fields' },
        fld('後継者', sel(c, 'successor', [{ value: 'now', label: 'いる（一緒に働いている）' }, { value: 'plan', label: 'いる（これから就農する予定）' }, { value: 'none', label: 'いない・決まっていない' }], '後継者', true)),
        c.successor !== 'none' ? fld('後継者の今の年齢', unit(num(c, 'succAge', { min: 10, max: 70, label: '後継者の年齢', w: 80 }), '歳')) : null,
        c.successor === 'plan' ? fld('就農するのは', unit(num(c, 'succYear', { min: 1, max: 19, label: '何年後に就農', w: 80 }), '年後')) : null),
      h('div', { class: 'px-fields' },
        fld('正社員', unit(num(c, 'staff', { min: 0, max: 30, label: '正社員の人数', w: 80 }), '人')),
        fld('パート（忙しい時期）', unit(num(c, 'parts', { min: 0, max: 30, label: 'パートの人数', w: 80 }), '人'))),
      section('農地'),
      h('div', { class: 'px-fields' },
        fld('自分の田（所有）', unit(num(c, 'owned', { min: 0, max: 300, step: 0.1, label: '所有地の面積', w: 90 }), 'ha')),
        fld('借りている田（借地）', unit(num(c, 'rented', { min: 0, max: 300, step: 0.1, label: '借地の面積', w: 90 }), 'ha')),
        fld('地代', unit(num(c, 'rent', { min: 0, max: 40000, step: 500, label: '地代', w: 100 }), '円/10a')),
        fld('中山間・小さな田の割合', unit(num(c, 'poorPct', { min: 0, max: 100, label: '条件不利な田の割合', w: 80 }), '%'), '手間がかかり、収量がやや低い田')),
      section('作付（品種と割合）'),
      h('div', { class: 'cf-list' },
        c.crops.map((x, i) => h('div', { class: 'cf-row' },
          sel(x, 'crop', crops, '品種'), unit(num(x, 'pct', { min: 0, max: 100, label: '割合', w: 70 }), '%'),
          c.crops.length > 1 ? h('button', { class: 'px-btn plain cf-x', type: 'button', 'aria-label': '削除', onclick: () => { c.crops.splice(i, 1); app.keepScroll = true; app.render(); } }, '×') : null)),
        c.crops.length < 5 ? h('button', { class: 'px-btn plain cf-add', type: 'button', onclick: () => { c.crops.push({ crop: 'koshiibuki', pct: 10 }); app.keepScroll = true; app.render(); } }, '＋ 品種を追加') : null),
      section('機械（大きさと使っている年数）'),
      h('div', { class: 'cf-list' }, MT.map((t) => h('div', { class: 'cf-row' },
        h('span', { class: 'cf-name' }, D.MACHINE_TYPES[t].name), sel(c.machines[t], 'size', sizes(t), D.MACHINE_TYPES[t].name + 'の大きさ', true),
        unit(num(c.machines[t], 'age', { min: 0, max: 40, label: D.MACHINE_TYPES[t].name + 'の使用年数', w: 70 }), '年使用'),
        c.machines[t].size !== 'none' ? unit(num(c.machines[t], 'count', { min: 1, max: 10, label: D.MACHINE_TYPES[t].name + 'の台数', w: 60 }), '台') : null))),
      h('p', { class: 'small' }, '大規模で同じ機械を何台か持っている場合は、台数も入れてください（使用年数は平均でかまいません）。'),
      section('お金'),
      h('div', { class: 'px-fields' },
        fld('経営に使える預貯金', unit(num(c, 'cash', { min: 0, max: 1e9, step: 100000, label: '預貯金', w: 130 }), '円')),
        fld('借入金の残高', unit(num(c, 'debt', { min: 0, max: 1e9, step: 100000, label: '借入残高', w: 130 }), '円')),
        fld('返済の残り年数', unit(num(c, 'debtYears', { min: 1, max: 30, label: '返済の残り年数', w: 80 }), '年')),
        c.corp ? fld('役員報酬（年）', unit(num(c, 'execPay', { min: 0, max: 1e8, step: 100000, label: '役員報酬', w: 130 }), '円'))
          : fld('家計費・生活費（年）', unit(num(c, 'living', { min: 0, max: 1e8, step: 100000, label: '家計費', w: 130 }), '円'), '農業のお金から生活に使う額'),
        fld('直販のお客さん', unit(num(c, 'customers', { min: 0, max: 5000, label: '直販の顧客数', w: 90 }), '人'))));
  }

  function howtoWindow(go) {
    const steps = [
      '年のはじめはサイコロで運だめし。6が出れば幸運、1が出たら不運のできごとだ。',
      '作付・農地・機械・労働力・販売・資金の計画を立てる。右の「今年の見通し」で、平年作のときの所得と資金繰りを確かめよう。経営は段取り八分だよ。',
      '「この計画で1年を始める」を押したら、1か月ずつ進めていく。台風や病気の知らせが来たら、お金をかけて備えるか、サイコロで勝負するかを選ぶ。',
      '決算書（損益計算書・貸借対照表・資金繰り表）と私の講評で振り返って、次の年に活かす。反省は短く、次の段取りは長く。',
      '5年ごとに中間評価、20年後に最終評価。資金が尽きたらそこで経営終了だから、財布の中身からは目を離さないこと。',
    ];
    return h('div', { class: 'px-window' },
      h('h2', null, 'あそびかた'),
      h('div', { class: 'speech' }, h('div', { class: 'speech-face' }, RG.portrait.svg('takahashi', 92, { label: '高橋さん', talk: true }), h('div', { class: 'speech-name' }, 'JA営農指導員 高橋さん')),
        h('div', { class: 'bubble' },
          h('p', null, 'JAで営農指導をしている高橋です。田んぼのことも、お金のことも、なんでも聞いてほしい。これから20年、あなたの田んぼの経営を見守らせてもらうよ。'),
          h('ol', null, steps.map((s) => h('li', null, s))),
          h('p', null, '点線のついた言葉（', UI.term('減価償却'), 'など）を押すと、意味を教えるよ。聞くは一時の恥、聞かぬは一生の損、だからね。'))),
      h('div', { class: 'px-actions' }, h('button', { class: 'px-btn plain', type: 'button', onclick: () => go('menu') }, 'もどる')));
  }

  function loadWindow(app, go) {
    const slots = [1, 2, 3].map((n) => ({ n, m: S.meta(n) }));
    return h('div', { class: 'px-window' },
      h('h2', null, 'データをよみこむ'),
      h('div', { class: 'px-menu' }, slots.map((x) => h('button', { type: 'button', disabled: !x.m,
        onclick: () => { const st = S.load(x.n); if (st) { app.titleView = 'menu'; app.loadState(st); } } },
        'スロット' + x.n, h('span', { class: 'sub' }, x.m ? x.m.farmName + '・' + x.m.scenario + '・' + x.m.year + '年目' : 'からっぽ')))),
      h('div', { class: 'px-actions' },
        h('button', { class: 'px-btn plain', type: 'button', onclick: () => go('menu') }, 'もどる'),
        app.importButton()));
  }

  // ---------- 年初のできごと（RPG風の会話ウィンドウ） ----------
  RG.screens.event = function (app) {
    const st = app.st;
    RG.events.prune(st);
    const id = st.events.queue[0];
    const ev = RG.events.get(id);
    if (!ev) { st.phase = 'plan'; return RG.screens.plan(app); }
    const total = st.events.queue.length;
    return h('div', null, app.topbar(),
      h('div', { class: 'event-card' },
        UI.card(st.year + '年目 年初のできごと', '（残り ' + total + '件）',
          ev.who ? UI.speaker(ev.who) : null,
          h('h2', { style: { margin: '6px 0 8px' } }, ev.title),
          h('p', null, ev.text(st)),
          ev.choices.map((c, i) => h('button', { class: 'btn choice', type: 'button',
            onclick: () => { const msg = RG.events.choose(st, id, i); UI.toast(msg); app.autosave(); app.render(); } },
            c.label, c.desc ? h('span', { class: 'd' }, c.desc) : null)))));
  };
})(window.RG = window.RG || {});
