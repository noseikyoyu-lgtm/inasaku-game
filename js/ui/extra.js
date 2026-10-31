// 画面の追加部品：新しい事業タブ・米の保管・地域の農家・称号・登場人物の顔
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

    // 稲刈りの作業受託
    const D1 = BZ.DEFS.harvest, spC = BZ.spare(M.combine);
    out.push(UI.card(D1.icon + ' ' + D1.name, null, h('p', { class: 'small' }, D1.desc),
      M.combine.count > 0
        ? [h('div', { class: 'row' }, '引き受ける面積', UI.numInput({ value: b.harvest, min: 0, max: 200, step: 0.5, suffix: 'ha', label: '作業受託の面積',
            onChange: (v) => app.update((s) => BZ.setArea(s, 'harvest', v)) }),
            h('span', { class: 'muted small' }, 'コンバインの空き能力 ' + U.ha(spC) + (b.harvest > spC ? '（空き能力を超えた分は引き受けられません）' : ''))),
          money(sb.harvest)]
        : UI.note('info', null, '自分のコンバインがあると始められます（「機械・設備」タブ）。')));

    // ドローン防除の請負
    const D2 = BZ.DEFS.drone, spD = BZ.spare(M.drone);
    out.push(UI.card(D2.icon + ' ' + D2.name, null, h('p', { class: 'small' }, D2.desc),
      M.drone.count > 0
        ? (b.droneLicense
          ? [h('div', { class: 'row' }, '請け負う面積', UI.numInput({ value: b.drone, min: 0, max: 200, step: 1, suffix: 'ha', label: 'ドローン防除の面積',
              onChange: (v) => app.update((s) => BZ.setArea(s, 'drone', v)) }),
              h('span', { class: 'muted small' }, 'ドローンの空き能力 ' + U.ha(spD))), money(sb.drone)]
          : UI.btn('操縦の研修を受ける（' + U.man(D2.license) + '）', () => app.update((s) => BZ.takeLicense(s), { msg: '研修を受けた' }), 'primary'))
        : UI.note('info', null, '防除用ドローンがあると始められます（「機械・設備」タブ）。')));

    // 餅・米粉の加工
    const D3 = BZ.DEFS.proc;
    const demand = BZ.procDemand(st), mochi = BZ.procIsMochi(st);
    out.push(UI.card(D3.icon + ' ' + D3.name, null, h('p', { class: 'small' }, D3.desc),
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
    out.push(UI.card(D4.icon + ' ' + D4.name, null, h('p', { class: 'small' }, D4.desc),
      BZ.has(st, 'stand') ? money(sb.stand) : buy('ds', '直売所を建てる（' + U.man(D.MODELS.ds.price * st.market.matInfl) + '）')));

    out.push(h('p', { class: 'small muted' }, '事業の作業時間は「労働力」タブの季節ごとの必要時間に入ります。加工場と直売所は機械と同じように減価償却し、修理費もかかります。'));
    return h('div', { class: 'stack' }, out);
  };

  // ---------- 米を保管して春に売る（販売計画タブ） ----------
  RG.screens.storageCard = function (app, st, pv) {
    const max = BZ.storeMax(st), w = st.world;
    const rg = BZ.oldPriceRange(w.forecast);
    const ss = pv.sales.stockSale;
    return UI.card('⏳ 米を保管して春に売る', '売る時期の勝負',
      h('p', { class: 'small' }, '秋に全部を売らずに、一部を低温倉庫に置いて翌年4月に売ります。春の値段は、翌年の米の需給しだいで上がることも下がることもあります。保管料（1俵あたり' + U.yen(BZ.STORE.fee) + '）がかかり、売れるまで代金が入らないので資金繰りも苦しくなります。'),
      ss ? UI.note('info', '前年産の保管米 ' + U.bales(ss.bales), '4月に売ります。収穫したときの値段は1俵 ' + U.yen(ss.harvestPrice) + '。今の見込みは ' + U.yen(ss.price) + '前後です。') : null,
      h('div', { class: 'row' }, '今年産から保管する量', UI.numInput({ value: st.storePlan || 0, min: 0, max: 2000, step: 10, suffix: '俵', label: '保管する量',
        onChange: (v) => app.update((s) => { s.storePlan = Math.max(0, Math.round(v)); }) }),
        h('span', { class: 'muted small' }, '上限 ' + U.bales(max) + '（農協に出す予定の半分まで）')),
      (st.storePlan || 0) > 0 ? h('p', { class: 'small' }, '来年4月の値段の目安：1俵 ' + U.yen(rg[0]) + '〜' + U.yen(rg[1]) + '（今年の予想 ' + U.yen(w.forecast) + '）') : null,
      h('p', { class: 'small muted' }, '保管した米は、収穫した年に「収穫したときの値段」で', T('棚卸資産'), 'として利益に入ります（', T('収穫基準'), '）。そのぶん税金も収穫した年にかかり、売った年は「売った値段 − 収穫時の値段」だけが損益になります。'));
  };

  // ---------- 地域の農家 ----------
  RG.screens.rivalsCard = function (st, title) {
    if (!st.rivals) return null;
    const rows = RG.rivals.table(st);
    const lastRank = rows.filter((r) => r.active).findIndex((r) => r.me) + 1;
    return UI.card(title || '地域の農家', st.history.length ? 'あなたは ' + lastRank + '位（同じ物差しの今の評価）' : '同じ集落で一緒に20年を過ごす',
      UI.table([{ label: '農家' }, { label: '面積', num: true }, { label: '平均所得', num: true }, { label: '純資産の増加', num: true }, { label: '評価', num: true }],
        rows.map((r) => ({ cls: r.me ? 'me' : r.active ? '' : 'muted', cells: [
          h('span', { class: 'rv-name' }, r.me ? null : UI.face(r.id, 2), h('span', null, h('b', null, r.name), r.label ? h('div', { class: 'small muted' }, r.label) : null, r.endText ? h('div', { class: 'small' }, r.endText) : null)),
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
})(window.RG = window.RG || {});
