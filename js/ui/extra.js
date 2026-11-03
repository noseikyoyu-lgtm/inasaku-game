// 画面の追加部品：新しい事業タブ・地域の農家・称号・登場人物の顔
(function (RG) {
  'use strict';
  const UI = RG.ui, h = UI.h, D = RG.data, U = RG.util, BZ = RG.biz;
  const T = UI.term;

  // ---------- 登場人物のイラスト ----------
  // scale は小さい順に 2（表の中）・3（話し手）・4（大きく）
  const FACE_PX = { 2: 38, 3: 56, 4: 84 };
  UI.face = (who, scale, talk) => {
    const p = D.PEOPLE[who];
    return p ? h('span', { class: 'face' }, RG.portrait.svg(who, FACE_PX[scale || 3] || 56, { label: p.name, talk })) : null;
  };
  // 高橋さんのひとこと（顔と吹き出し）
  UI.saying = (text) => h('div', { class: 'saying' }, UI.face('takahashi', 3, true),
    h('div', { class: 'saying-bubble' }, h('div', { class: 'saying-who' }, '高橋さんのひとこと'), h('p', null, '「' + text + '」')));
  // 見出しの前に小さな顔をつける
  UI.whoTitle = (who, text) => h('span', { class: 'who-title' }, UI.face(who, 2), text);

  // 話し手（顔と名前）
  UI.speaker = (who) => {
    const p = D.PEOPLE[who];
    return p ? h('div', { class: 'speaker' }, UI.face(who, 3), h('b', null, p.name)) : null;
  };

  // ---------- 新しい事業タブ ----------
  RG.screens.tabBiz = function (app, st, pv) {
    const b = BZ.state(st), sb = pv.sales.biz || {};
    const M = pv.machines;
    const out = [];
    const buy = (model, label) => h('div', { class: 'row' },
      UI.btn(label + '（借入で）', () => app.update((s) => RG.actions.buyMachine(s, model, 'loan'), { msg: D.MODELS[model].name + 'を建てた' }), 'primary'),
      UI.btn('現金で', () => app.update((s) => RG.actions.buyMachine(s, model, 'cash'), { msg: D.MODELS[model].name + 'を建てた' }), ''));
    const money = (x) => (x ? h('div', { class: 'kpis' },
      UI.kpi('売上の見込み', U.man(x.revenue), null, 'good'), UI.kpi('経費', U.man(x.cost)), UI.kpi('差し引き', U.man(x.revenue - x.cost), '労働時間・減価償却は別')) : null);

    const ERA = RG.era;
    const locked = (id, def) => UI.card(def.icon + ' ' + def.name, null, h('div', { class: 'locked-card' }, h('span', { class: 'lock-ic', 'aria-hidden': 'true' }, '🔒'),
      h('div', null, h('b', null, ERA.lockText(st, id).replace('🔒 ', '')), h('p', { class: 'small muted keep' }, def.desc))));
    // 作業受託のリスクの見込みと、賠償保険
    const riskNote = (kind, area, lines) => (area > 0 ? UI.note('warn', 'よその田で作業するリスク（1年に事故が起きる見込み 約' + U.pct(BZ.riskOdds(st, kind, area)) + '）', lines) : null);
    const insRow = () => (BZ.planned(st) > 0 ? h('label', { class: 'row', style: { gap: '6px', marginTop: '6px' } },
      h('input', { type: 'checkbox', checked: BZ.insured(st), onchange: (e) => app.update((s) => BZ.setInsured(s, e.target.checked)) }),
      h('span', null, '🛡️ 作業の賠償保険に入る（年' + U.man(BZ.INSURANCE.premium * st.market.matInfl) + '）'),
      h('span', { class: 'small muted' }, '相手の田や畑への補償を保険で払う。自分の機械の修理は自分持ち')) : null);

    // 稲刈りの作業受託
    const D1 = BZ.DEFS.harvest, spC = BZ.spare(M.combine);
    if (ERA && !ERA.isOpen(st, 'harvest')) out.push(locked('harvest', D1));
    else out.push(UI.card(D1.icon + ' ' + D1.name, null, h('p', { class: 'small' }, D1.desc),
      M.combine.count > 0
        ? [h('div', { class: 'row' }, '引き受ける面積', UI.numInput({ value: b.harvest, min: 0, max: 200, step: 0.5, suffix: 'ha', label: '作業受託の面積',
            onChange: (v) => app.update((s) => BZ.setArea(s, 'harvest', v)) }),
            h('span', { class: 'muted small' }, 'コンバインの空き能力 ' + U.ha(spC) + (b.harvest > spC ? '（空き能力を超えた分は引き受けられません）' : ''))),
          money(sb.harvest),
          riskNote('harvest', Math.min(b.harvest, spC), '受託先の田で石や倒れた稲を巻き込むと、コンバインが壊れて修理費がかかります（条件の悪い田が多いほど起きやすい）。自分の稲刈りで手いっぱいになったり秋雨が続いたりすると、受託先の田が刈り遅れて補償が要ります。コンバインが故障して刈りきれないと、ほかの業者に頼む差額も負担します。引き受けた面積のぶん、自分のコンバインも故障しやすくなります。'),
          insRow()]
        : UI.note('info', null, '自分のコンバインがあると始められます（「機械・設備」タブ）。')));

    // ドローン防除の請負
    const D2 = BZ.DEFS.drone, spD = BZ.spare(M.drone);
    if (ERA && !ERA.isOpen(st, 'droneBiz')) out.push(locked('droneBiz', D2));
    else out.push(UI.card(D2.icon + ' ' + D2.name, null, h('p', { class: 'small' }, D2.desc),
      M.drone.count > 0
        ? (b.droneLicense
          ? [h('div', { class: 'row' }, '請け負う面積', UI.numInput({ value: b.drone, min: 0, max: 200, step: 1, suffix: 'ha', label: 'ドローン防除の面積',
              onChange: (v) => app.update((s) => BZ.setArea(s, 'drone', v)) }),
              h('span', { class: 'muted small' }, 'ドローンの空き能力 ' + U.ha(spD))), money(sb.drone),
              riskNote('drone', Math.min(b.drone, spD), '風で農薬が隣の畑に飛ぶと、補償が要ります。ドローンが電線に触れて墜落すると、修理費がかかります。'),
              b.harvest > 0 ? null : insRow()]
          : UI.btn('操縦の研修を受ける（' + U.man(D2.license) + '）', () => app.update((s) => BZ.takeLicense(s), { msg: '研修を受けた' }), 'primary'))
        : UI.note('info', null, '防除用ドローンがあると始められます（「機械・設備」タブ）。')));

    // 餅・米粉の加工
    const D3 = BZ.DEFS.proc;
    const demand = BZ.procDemand(st), mochi = BZ.procIsMochi(st);
    if (ERA && !ERA.isOpen(st, 'proc') && !BZ.has(st, 'proc')) out.push(locked('proc', D3));
    else out.push(UI.card(D3.icon + ' ' + D3.name, null, h('p', { class: 'small' }, D3.desc),
      BZ.has(st, 'proc')
        ? [h('div', { class: 'row' }, '加工に回す米', UI.numInput({ value: b.proc, min: 0, max: 400, step: 5, suffix: '俵', label: '加工に回す量',
            onChange: (v) => app.update((s) => BZ.setProc(s, v)) }),
            h('span', { class: 'muted small' }, '売れる見込み 約' + U.bales(demand) + '（直販のお客さんとブランド力で増える）')),
          UI.note(mochi ? 'good' : 'info', null, mochi ? 'もち米を作っているので、餅として高く売れます。' : 'もち米を作っていないので、うるち米を米粉にします。もち米（こがねもち・わたぼうし）を作ると、餅として高く売れます。'),
          b.proc > demand ? UI.note('warn', null, '売れる見込みより多く加工しています。売れ残りは1俵あたり' + U.yen(D3.dumpPrice) + 'で手放すことになります。') : null,
          money(sb.proc)]
        : buy('pc', '加工場を建てる（' + U.man(D.MODELS.pc.price * st.market.matInfl) + '）')));

    // 直売所
    const D4 = BZ.DEFS.stand;
    if (ERA && !ERA.isOpen(st, 'stand') && !BZ.has(st, 'stand')) out.push(locked('stand', D4));
    else out.push(UI.card(D4.icon + ' ' + D4.name, null, h('p', { class: 'small' }, D4.desc),
      BZ.has(st, 'stand') ? money(sb.stand) : buy('ds', '直売所を建てる（' + U.man(D.MODELS.ds.price * st.market.matInfl) + '）')));

    out.push(h('p', { class: 'small muted' }, '事業の作業時間は「労働力」タブの季節ごとの必要時間に入ります。加工場と直売所は機械と同じように減価償却し、修理費もかかります。'));
    return h('div', { class: 'stack' }, out);
  };

  // ---------- 地域の農家 ----------
  RG.screens.rivalsCard = function (st, title) {
    if (!st.rivals) return null;
    const rows = RG.rivals.table(st);
    const lastRank = rows.filter((r) => r.active).findIndex((r) => r.me) + 1;
    return UI.card(title || '地域の農家', st.history.length ? 'あなたは ' + lastRank + '位（同じ物差しの今の評価）' : '同じ集落の6つの経営（個人・集落法人・営農組合）',
      UI.table([{ label: '農家' }, { label: '面積', num: true }, { label: '平均所得', num: true }, { label: '純資産の増加', num: true }, { label: '評価', num: true }],
        rows.map((r) => ({ cls: r.me ? 'me' : r.active ? '' : 'muted', cells: [
          h('span', { class: 'rv-name' }, r.me ? null : UI.face(r.sprite || r.id, 2), h('span', null, h('b', null, r.name), r.label ? h('div', { class: 'small muted' }, r.label) : null, r.endText ? h('div', { class: 'small' }, r.endText) : null)),
          { v: U.ha(r.area), cls: 'num' }, { v: U.man(r.avgInc), cls: 'num' }, { v: U.man(r.eqGain), cls: 'num ' + (r.eqGain < 0 ? 'neg' : '') },
          { v: r.active ? r.rank + '（' + U.num(r.total, 0) + '点）' : '—', cls: 'num' }] }))),
      h('p', { class: 'small muted' }, '評価は最後の評価と同じ物差し（純資産の増加・平均所得・自己資本比率・面積・地域の信頼・ブランド力）で、今の実績を比べたものです。離農した人の田は、あなたに話が来ることがあります。'));
  };

  // ---------- 称号 ----------
  RG.screens.titlesCard = function (st, inModal) {
    const TT = RG.titles, mine = st ? st.titles || {} : {}, col = TT.collection();
    const n = TT.LIST.filter((t) => mine[t.id]).length, nc = TT.LIST.filter((t) => col[t.id]).length;
    const sub = (st ? 'このゲーム ' + n + '個・' : '') + 'これまでに集めた称号 ' + nc + ' / ' + TT.LIST.length;
    const grid = h('div', { class: 'titles-grid' }, TT.LIST.map((t) => {
        const got = mine[t.id], seen = col[t.id];
        return h('div', { class: 'title-item ' + (got ? 'got' : seen ? 'seen' : 'locked') },
          h('span', { class: 'ic', 'aria-hidden': 'true' }, got || seen ? t.icon : '❔'),
          h('div', null, h('b', null, got || seen ? t.name : '？？？'), h('div', { class: 'small muted' }, t.desc),
            got ? h('div', { class: 'small' }, got + '年目に獲得') : seen ? h('div', { class: 'small muted' }, '前のゲームで獲得') : null));
      }));
    return inModal ? h('div', null, h('p', { class: 'small muted keep' }, sub), grid) : UI.card('称号', sub, grid);
  };
  RG.screens.showTitles = function (st) {
    UI.modal({ title: '🏅 称号', body: RG.screens.titlesCard(st, true) });
  };

  // ---------- 田植えのあとの作業 ----------
  // シーズン中の判断のカード（その月で止まって、やり方を選ぶ）
  RG.screens.workCard = function (app, w) {
    const st = app.st, FW = RG.fieldwork;
    const cur = FW.keyOf(st, w.id, true);
    let remember = false;
    const W = D.WEATHER[st.world.yearType];
    return UI.card(w.icon + ' ' + w.title, w.month + '月の田んぼの作業',
      h('p', null, w.text),
      w.month >= 7 && W ? h('p', { class: 'small' }, '今年の天候：' + W.icon + ' ' + W.name) : null,
      h('div', { class: 'work-choices' }, FW.options(st, w).map((o) => h('button', { type: 'button', class: 'btn choice' + (o.key === cur ? ' last' : ''),
        onclick: () => { FW.choose(st, w.id, o.key, remember); app.autosave(); app.keepScroll = true; app.render(); } },
        o.label, h('span', { class: 'd' }, o.desc + (o.key === cur && o.key !== 'std' ? '（計画で決めたやり方）' : ''))))),
      h('label', { class: 'work-remember' }, h('input', { type: 'checkbox', onchange: (e) => { remember = e.target.checked; } }),
        ' 来年からも同じやり方にして、シーズン中は聞かない（「労働力」タブでいつでも変えられる）'));
  };
  // 計画画面：作業のやり方をまとめて決める
  RG.screens.workPlanCard = function (app, st) {
    const FW = RG.fieldwork;
    if (!FW) return null;
    const ws = FW.state(st);
    const rows = FW.WORKS.map((w) => {
      const key = FW.keyOf(st, w.id, true), c = FW.cost(st, w.id, key);
      return [h('span', null, w.icon + ' ' + w.title, h('div', { class: 'small muted' }, w.month + '月')),
        UI.select(FW.options(st, w).map((o) => ({ value: o.key, label: o.label })), key, (v) => app.update((t) => FW.setPlan(t, w.id, v)), { 'aria-label': w.title + 'のやり方' }),
        { v: (Math.abs(c.hours) > 0.5 ? (c.hours > 0 ? '+' : '') + U.num(c.hours) + 'h' : '—') + ' / ' + (Math.abs(c.cost) > 1 ? (c.cost > 0 ? '+' : '−') + U.man(Math.abs(c.cost)) : '—'), cls: 'num' },
        h('label', { class: 'small' }, h('input', { type: 'checkbox', checked: !ws.auto[w.id], onchange: (e) => app.update((t) => FW.setAuto(t, w.id, !e.target.checked)) }), ' 聞く')];
    });
    return UI.card('🌾 田植えのあとの作業', '中干し・穂肥・水管理・防除などのやり方。手間とお金をかけるほど、収量や品質が上がる',
      UI.table([{ label: '作業' }, { label: 'やり方' }, { label: '手間 / 費用（今年）', num: true }, { label: 'シーズン中' }], rows),
      h('div', { class: 'row', style: { marginTop: '8px' } },
        UI.btn('全部シーズン中に聞く', () => app.update((t) => FW.setAllAuto(t, false)), 'sm'),
        UI.btn('全部このやり方でおまかせ', () => app.update((t) => FW.setAllAuto(t, true)), 'sm')),
      h('p', { class: 'small muted' }, '「聞く」にした作業は、シーズン中のその月に止まって、天候を見ながら選べます。「標準」は、手間もお金も増えない、いつもどおりのやり方です。水管理は、猛暑の年は掛け流し、冷夏の年は深水が効きます。'));
  };

  // ---------- 解放の一覧（ストーリー：品種・栽培方法・制度・機械・事業） ----------
  const UNLOCK_GROUPS = ['品種', '栽培方法と人', 'お金と制度', '機械', '事業と売り方'];
  const unlockRow = (x) => h('div', { class: 'unlock-item ' + (x.open ? 'open' : 'locked') },
    h('span', { class: 'ui-ic', 'aria-hidden': 'true' }, x.open ? x.icon : '🔒'),
    h('div', null, h('b', null, x.name), x.open ? h('div', { class: 'small good-t' }, '✓ 使える') : h('div', { class: 'small' }, '🔓 きっかけ：' + x.hint)));
  RG.screens.showUnlocks = function (st) {
    const list = RG.era.unlockList(st);
    const body = h('div', { class: 'stack' },
      h('p', { class: 'small muted keep' }, '使えるもの ' + list.filter((x) => x.open).length + ' / ' + list.length + '。きっかけを満たすと、年の初めか決算のときに使えるようになります。'),
      UNLOCK_GROUPS.map((g) => {
        const rows = list.filter((x) => x.group === g);
        if (!rows.length) return null;
        return h('section', { class: 'unlock-group' }, h('h3', null, g + '（' + rows.filter((x) => x.open).length + ' / ' + rows.length + '）'),
          h('div', { class: 'unlock-grid' }, rows.map(unlockRow)));
      }));
    UI.modal({ title: '🔓 解放の一覧', body });
  };
  // 計画のホーム：まだ使えないもののうち、次に開きそうなものを3つ
  RG.screens.unlocksCard = function (app, st) {
    if (!st.featOpen || !RG.era) return null;
    const list = RG.era.unlockList(st);
    const locked = list.filter((x) => !x.open);
    const open = list.length - locked.length;
    return UI.card('🔓 これから使えるようになるもの', '使えるもの ' + open + ' / ' + list.length,
      UI.bar(open, list.length),
      locked.length ? h('div', { class: 'unlock-grid', style: { marginTop: '8px' } }, locked.slice(0, 3).map(unlockRow))
        : h('p', { class: 'small keep' }, 'すべて使えるようになりました！'),
      h('div', { class: 'row', style: { marginTop: '8px' } }, UI.btn('全部見る', () => RG.screens.showUnlocks(st), 'sm')));
  };
})(window.RG = window.RG || {});
