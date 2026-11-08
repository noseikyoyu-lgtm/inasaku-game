// 決算画面：サマリー・損益計算書・貸借対照表・資金繰り・原価分析・生産販売・労働機械
(function (RG) {
  'use strict';
  const UI = RG.ui, h = UI.h, D = RG.data, U = RG.util;
  const T = UI.term;

  const TABS = [['summary', 'サマリーと講評', '📋'], ['pl', '損益計算書', '🧾'], ['bs', '貸借対照表', '⚖️'], ['cash', '資金繰り', '💴'], ['cost', '原価・損益分岐', '🧮'], ['prod', '生産と販売', '🌾'], ['work', '労働と機械', '🚜']];

  RG.screens.showLastResult = function (app) { app.viewingLast = true; app.resultTab = 'summary'; app.render(); };

  RG.screens.result = function (app) {
    const st = app.st, res = st.lastResult;
    const viewing = app.viewingLast && st.phase !== 'result';
    const tab = app.resultTab || 'summary';
    const tabs = h('div', { class: 'tabs', role: 'tablist' }, TABS.map(([k, l, ic]) => h('button', { class: tab === k ? 'on' : '', type: 'button', role: 'tab', 'aria-selected': tab === k ? 'true' : 'false',
      onclick: () => { app.resultTab = k; app.keepScroll = true; app.render(); } }, h('span', { class: 'tab-ic', 'aria-hidden': 'true' }, ic), l)));
    // 前年の決算書を見るときも、その年の決算時点の状態（法人か・家計費・年末の資金）で表示する
    const vs = Object.assign({}, st, { corp: res.corp != null ? res.corp : st.corp, living: res.living != null ? res.living : st.living,
      cash: res.cashEnd != null ? res.cashEnd : st.cash, lossCarry: res.lossCarry != null ? res.lossCarry : st.lossCarry });
    const body = FNS[tab](app, vs, res);
    let next;
    if (viewing) next = UI.btn('◀ 計画に戻る', () => { app.viewingLast = false; app.render(); }, 'primary big');
    else if (st.gameOver) next = UI.btn('経営の結果を見る ▶', () => app.nextYear(), 'primary big');
    else if (st.retired) next = UI.btn('経営の結果を見る ▶', () => app.nextYear(), 'gold big');
    else if (st.mode !== 'endless' && st.year >= st.maxYear) next = UI.btn(RG.scenes.isStory(st) ? 'エンディングへ ▶' : '20年の経営を終える ▶', () => app.nextYear(), 'gold big');
    else if (RG.midterm.due(st)) next = UI.btn(st.year + '年目の中間評価を見る ▶', () => app.toMidterm(), 'gold big');
    else next = UI.btn((st.year + 1) + '年目へ進む ▶', () => app.nextYear(), 'primary big');
    return h('div', null, app.topbar(),
      h('div', { class: 'layout one' },
        h('main', { class: 'stack' },
          h('div', { class: 'section-title' }, h('h2', null, res.year + '年目の決算'), viewing ? h('span', { class: 'badge info' }, '前年の決算') : null),
          st.gameOver && !viewing ? UI.note('bad', '経営を続けられなくなりました', st.gameOver.text) : null,
          st.retired && !st.gameOver && !viewing ? UI.note('warn', '経営主が引退します', '経営主が' + st.retired.age + '歳になり、引き継げる後継者がいないため、今年で経営を終えます。') : null,
          reportCard(app, st, res, viewing),
          (res.livingEvents || []).length && !viewing ? UI.note('info', '🏠 今年の家計：生活費 ' + U.man(res.living) + '（平均 ' + U.man(st.living) + '）',
            res.livingEvents.slice().sort((a, b) => a.month - b.month).map((e) => e.month + '月 ' + e.label + '（' + (e.amount >= 0 ? '−' : '＋') + U.man(Math.abs(e.amount)) + '）').join('・')) : null,
          (res.missionNotes || []).length ? h('div', { class: 'notes' }, res.missionNotes.map((t) => UI.note(/失敗|できなかった|期限まで|通らなかった/.test(t) ? 'bad' : /乗り越えた|達成|通過|🔓/.test(t) ? 'good' : 'warn', null, t))) : null,
          tabs, body,
          h('div', { class: 'row' }, h('span', { class: 'spacer' }), next))));
  };

  // ---------- 成績発表：はんこと、大きな数字で今年の出来を見せる ----------
  function reportCard(app, st, res, viewing) {
    const prev = st.history.find((x) => x.year === res.year - 1);
    const inc = res.analysis.income;
    const grade = st.gameOver && !viewing ? ['low', '経営\n終了'] : inc > 0 && (!prev || inc >= prev.income) ? ['', 'よく\nできました'] : inc > 0 ? ['mid', 'まずまず'] : ['low', 'がんばろう'];
    const W = D.WEATHER[res.weather];
    const delta = (now, before, fmt) => {
      if (before == null) return h('span', { class: 'td' }, '　');
      const d = now - before;
      return h('span', { class: 'td ' + (d > 0 ? 'up' : d < 0 ? 'down' : '') }, (d > 0 ? '▲ ' : d < 0 ? '▼ ' : '± ') + fmt(Math.abs(d)) + '（前年比）');
    };
    const tile = (icon, label, value, d) => h('div', { class: 'rtile' }, h('div', { class: 'tl' }, icon + ' ' + label), h('div', { class: 'tv' }, value), d);
    const pieces = [];
    // 良い年は紙ふぶき（決算を初めて開いたときだけ）
    if (!grade[0] && !viewing && app.reportShown !== st.year + ':' + st.seed) {
      app.reportShown = st.year + ':' + st.seed;
      const cols = ['#f2b84b', '#58a650', '#d4442f', '#5aa6e0', '#fff'];
      for (let i = 0; i < 40; i++) pieces.push(h('i', { style: { left: (i * 37 % 100) + '%', background: cols[i % cols.length], animationDelay: (i % 10) * 0.12 + 's' } }));
    }
    return h('section', { class: 'report' },
      pieces.length ? h('div', { class: 'confetti', 'aria-hidden': 'true' }, pieces) : null,
      h('div', { class: 'report-top' },
        h('div', { class: 'stamp ' + grade[0], role: 'img', 'aria-label': '今年の評価：' + grade[1].replace('\n', '') }, grade[1].split('\n').map((t) => h('div', null, t))),
        h('div', null, h('div', { class: 'small', style: { color: '#8a6a35', fontWeight: 700 } }, '成績発表'),
          h('h2', null, res.year + '年目の結果'),
          h('div', { class: 'small' }, W.icon + ' ' + W.name + '・米価 ' + U.yen(res.price) + '/60kg'))),
      h('div', { class: 'report-tiles' },
        tile('💴', '売上', U.man(res.pl.sales), delta(res.pl.sales, prev && prev.sales, U.man)),
        tile(inc >= 0 ? '😄' : '😟', 'もうけ（' + (res.corp ? '所得' : '農業所得') + '）', U.man(inc), delta(inc, prev && prev.income, U.man)),
        tile('👛', '年末の資金', U.man(res.cashEnd != null ? res.cashEnd : st.cash), delta(res.cashEnd != null ? res.cashEnd : st.cash, prev && prev.cashEnd, U.man)),
        tile('🌾', '収穫', U.bales(res.production.totalBales), delta(res.production.totalBales, prev && prev.bales, U.bales)),
        tile('🥇', '1等米の割合', U.pct(res.production.r1), delta(res.production.r1 * 100, prev && prev.r1 != null ? prev.r1 * 100 : null, (v) => U.num(v, 0) + 'ポイント'))));
  }

  const per10a = (v, res) => (res.area.planted > 0 ? U.yen(v / (res.area.planted * 10)) : '—');

  // ---------- サマリー ----------
  function summary(app, st, res) {
    const pl = res.pl, an = res.analysis, bs = res.bs;
    const dEq = bs.equity - res.bsStart.equity;
    const W = D.WEATHER[res.weather];
    const reviews = RG.advisor.review(st, res);
    const hs = st.history;
    return h('div', { class: 'stack' },
      UI.card('今年の成績', W.icon + ' ' + W.name + '・米価 ' + U.yen(res.price) + '/60kg',
        h('div', { class: 'kpis' },
          UI.kpi('売上高', U.man(pl.sales)),
          UI.kpi(st.corp ? '税引前利益' : h('span', null, T('農業所得')), U.man(pl.preTax), st.corp ? '役員報酬 ' + U.man(pl.get('execPay') / 1.15) + ' は経費済み' : '家計費 ' + U.man(st.living), pl.preTax < 0 ? 'bad' : 'good'),
          UI.kpi(h('span', null, T('純資産'), 'の増減'), (dEq >= 0 ? '+' : '') + U.man(dEq), '年末 ' + U.man(bs.equity), dEq < 0 ? 'bad' : 'good'),
          UI.kpi('年末の資金', U.man(st.cash), '最少 ' + res.cash.minMonth + '月 ' + U.man(res.cash.minBalance), res.cash.minBalance < 0 ? 'warn' : ''),
          UI.kpi('収量', U.num(res.production.yieldPer10a) + 'kg/10a', '合計 ' + U.bales(res.production.totalBales)),
          UI.kpi(h('span', null, T('1等比率')), U.pct(res.production.r1), null, res.production.r1 < 0.6 ? 'warn' : ''),
          UI.kpi('60kgあたり生産費', U.yen(an.costPer60), '米価との差 ' + U.yen(res.price - an.costPer60), an.costPer60 > res.price ? 'bad' : ''),
          UI.kpi(h('span', null, T('時間当たり所得')), U.yen(an.hourlyIncome), '家族の労働 ' + U.num(res.labor.familyHoursUsed) + 'h'))),
      weatherCard(res),
      marketCard(res),
      UI.card(UI.whoTitle('takahashi', RG.advisor.NAME + 'の講評'), null, UI.saying(RG.advisor.quip(st, res)), h('div', { class: 'notes' }, reviews.map((r) => UI.note(r.level, r.title, r.text))),
        RG.screens.adviceList(res.nextAdvice || RG.advisor.nextYear(st, res), null)),
      hs.length >= 2 ? h('div', { class: 'grid2' },
        UI.card('売上と所得の推移', null, RG.chart.line({ labels: hs.map((x) => x.year + '年'), series: [{ name: '売上高', values: hs.map((x) => x.sales) }, { name: hs.some((x) => x.corp) ? '所得（個人の年は農業所得、法人の年は税引前利益＋役員報酬）' : '農業所得', values: hs.map((x) => x.income) }] })),
        UI.card('純資産と借入の推移', null, RG.chart.line({ labels: hs.map((x) => x.year + '年'), series: [{ name: '純資産', values: hs.map((x) => x.equity) }, { name: '借入残高', values: hs.map((x) => x.debt), cls: 'c4' }] }))) : null);
  }

  function weatherCard(res) {
    const AG = RG.agro;
    const yt = D.YEAR_TYPES[res.yearType];
    if (!yt) return null;
    const plots = res.production.plots;
    const rows = (res.events || []).map((ev) => {
      const e = AG.event(ev.id);
      return [e.icon + ' ' + e.name, h('span', { class: 'badge ' + (ev.sev === 'heavy' ? 'bad' : ev.sev === 'mid' ? 'warn' : '') }, D.SEV[ev.sev].name),
        e.tol ? D.TOL_NAMES[e.tol] + 'で軽減' : '品種では軽減できない',
        plots.map((p) => { const f = (p.fx || []).find((x) => x.id === ev.id); return f ? D.CROPS[p.crop].name + ' ' + (f.y < -0.0005 ? '収量' + U.pct(f.y, 1) + ' ' : '') + '品質' + U.num(f.q, 1) + '点' : null; }).filter(Boolean).join('、')];
    });
    return UI.card('今年の気象', yt.icon + ' ' + yt.name + '：' + yt.desc,
      rows.length ? UI.table([{ label: 'できごと' }, { label: '重さ' }, { label: '耐性' }, { label: '影響（作付ごと）' }], rows) : h('p', null, '大きな気象災害はありませんでした。'),
      h('p', { class: 'small muted' }, T('年タイプ'), 'によって気象イベントの起きやすさと重さが変わります。被害は「基本の影響 × 重さ × (1 − 品種の耐性)」で、同じ年に重なるほど大きくなります。'));
  }

  function marketCard(res) {
    if (!res.marketReason) return null;
    const cs = res.sales.contracts;
    return UI.card(h('span', null, '今年の米価と', T('米の需給')), 'コシヒカリ1等 ' + U.yen(res.price) + '/60kg（前年比 ' + (res.priceChange >= 0 ? '+' : '') + U.pct(res.priceChange, 1) + '）',
      h('p', null, res.marketReason),
      cs.length ? UI.table([{ label: '契約先' }, { label: '契約時の目安', num: true }, { label: '今年の価格', num: true }, { label: '差', num: true }],
        cs.map((c) => [c.buyer + '（' + D.CROPS[c.crop].name + '）', { v: c.refPrice ? U.yen(c.refPrice) : '—', cls: 'num' }, { v: U.yen(c.price), cls: 'num' },
          { v: c.refPrice ? (c.price >= c.refPrice ? '+' : '') + U.pct(c.price / c.refPrice - 1, 1) : '—', cls: 'num ' + (c.refPrice && c.price < c.refPrice ? 'neg' : 'pos') }])) : null,
      cs.length ? h('p', { class: 'small muted' }, '契約栽培は数量を約束していますが、価格はその年の需給で決まります（農協価格 × 上乗せ率）。') : null);
  }

  // ---------- 損益計算書 ----------
  function plTab(app, st, res) {
    const pl = res.pl;
    const rows = [];
    const sales = pl.sales || 1;
    const line = (label, v, cls, indent) => rows.push({ cls: cls || '', cells: [{ v: label, cls: indent ? 'indent' : '' }, { v: U.yen(v), cls: 'num ' + (v < 0 ? 'neg' : '') }, { v: per10a(v, res), cls: 'num' }, { v: pl.sales ? U.pct(v / sales, 1) : '—', cls: 'num' }] });
    const head = (label) => rows.push({ cls: 'head', cells: [label, '', '', ''] });
    head('売上高');
    pl.lines.sales.forEach((x) => line(x.label, x.value, '', true));
    line('売上高 合計', pl.sales, 'total');
    head('経費（営業費用）');
    pl.lines.expense.forEach((x) => line(h('span', null, x.label, ' ', h('span', { class: 'badge ' + (x.group === 'fix' ? 'info' : '') }, x.group === 'fix' ? '固定' : '変動')), x.value, '', true));
    line('経費 合計', pl.expense, 'total');
    line(T('営業利益'), pl.operating, 'total');
    if (pl.lines.nonopIncome.length) { head('営業外収益'); pl.lines.nonopIncome.forEach((x) => line(x.key === 'subsidy' ? T('交付金') : x.label, x.value, '', true)); }
    if (pl.lines.nonopExpense.length) { head('営業外費用'); pl.lines.nonopExpense.forEach((x) => line(x.label, x.value, '', true)); }
    line(T('経常利益'), pl.ordinary, 'total');
    if (Math.abs(pl.special) > 0.5) line('特別損益（機械・農地の売却損益）', pl.special, '');
    line(st.corp ? '税引前の利益' : h('span', null, '税引前の利益（＝', T('農業所得'), '）'), pl.preTax, 'total');
    line((st.corp ? '法人税等' : '所得税・住民税・国保など') + '（翌年に支払い）', -res.tax.amount, 'sub');
    if (st.corp) line('当期純利益', pl.preTax - res.tax.amount, 'total');
    else {
      line('税引後の所得', pl.preTax - res.tax.amount, 'total');
      line(h('span', null, T('家計費'), '（生活費として引き出し）'), -st.living, 'sub');
      line('経営に残った額', pl.preTax - res.tax.amount - st.living, 'total');
    }
    return h('div', { class: 'stack' },
      UI.card('損益計算書', res.year + '年1月〜12月',
        UI.table([{ label: '科目' }, { label: '金額', num: true }, { label: '10aあたり', num: true }, { label: '売上比', num: true }], rows)),
      UI.card('読み方のポイント', null,
        h('ul', { style: { margin: 0, paddingLeft: '20px' } },
          h('li', null, T('減価償却'), '費 ' + U.man(pl.get('depreciation')) + ' は、お金が出ていかない費用です。利益が少なくても手元資金が残ることがあります。'),
          h('li', null, T('変動費'), ' ' + U.man(pl.variable) + '、', T('固定費'), ' ' + U.man(pl.fixed) + '（利息含む）。固定費は面積を増やすほど1haあたりが下がります。'),
          st.corp ? h('li', null, '法人なので役員報酬は経費です。赤字は翌年以降に繰り越せます（', T('欠損金の繰越'), '：残り ' + U.man(st.lossCarry) + '）。')
            : h('li', null, '個人経営では、家族の労働の報酬は', T('農業所得'), 'から得ます。所得が', T('家計費'), 'を下回ると', T('純資産'), 'が減ります。'))));
  }

  // ---------- 貸借対照表 ----------
  function bsTab(app, st, res) {
    const a = res.bsStart, b = res.bs;
    const r = (label, x, y, cls) => ({ cls: cls || '', cells: [label, { v: U.man(x), cls: 'num' }, { v: U.man(y), cls: 'num ' + (y < 0 ? 'neg' : '') }, { v: (y - x >= 0 ? '+' : '') + U.man(y - x), cls: 'num' }] });
    const hd = [{ label: '' }, { label: '期首', num: true }, { label: '期末', num: true }, { label: '増減', num: true }];
    const pl = res.pl;
    // 出資は、表示している年の決算に残した額を使う（前年の決算を見るときに今年の帳簿を見ないように）
    const capital = res.capital != null ? res.capital : U.sum(st.ledger.filter((x) => x.cat === 'capital'), (x) => x.amount);
    return h('div', { class: 'stack' },
      h('div', { class: 'grid2' },
        UI.card('資産の部', null, UI.table(hd, [
          r('現金・預金', a.cash, b.cash), r(T('未収金'), a.receivables, b.receivables),
          (a.inventory || b.inventory) ? r(h('span', null, '保管米（', T('棚卸資産'), '）'), a.inventory || 0, b.inventory || 0) : null,
          r('機械・設備（' + T('簿価') .textContent + '）', a.machines, b.machines),
          r('土地', a.land, b.land), r('資産 合計', a.assets, b.assets, 'total')].filter(Boolean))),
        UI.card('負債・純資産の部', null, UI.table(hd, [
          r(T('長期借入金'), a.longLoans, b.longLoans), r(T('つなぎ資金'), a.emergency, b.emergency), r('未払税金', a.taxPayable, b.taxPayable),
          r('負債 合計', a.liabilities, b.liabilities, 'total'), r(T('純資産'), a.equity, b.equity, 'total')]),
          h('p', { class: 'small' }, T('自己資本比率'), '：', h('b', null, U.pct(b.equityRatio)), '（期首 ' + U.pct(a.equityRatio) + '）'))),
      UI.card('純資産が増減した理由', null, UI.table(null, [
        ['税引前の利益', { v: U.man(pl.preTax), cls: 'num' }],
        ['税金', { v: U.man(-res.tax.amount), cls: 'num' }],
        st.corp ? null : ['家計費（生活費）', { v: U.man(-st.living), cls: 'num' }],
        capital ? ['出資', { v: U.man(capital), cls: 'num' }] : null,
        { cls: 'total', cells: ['＝ 純資産の増減', { v: U.man(b.equity - a.equity), cls: 'num' }] }].filter(Boolean)),
        h('p', { class: 'small muted' }, '機械を買っても、現金が機械に置き換わるだけなので純資産は変わりません。借入も同じです。純資産を増やすのは「利益」だけです。')));
  }

  // ---------- 資金繰り ----------
  function cashTab(app, st, res) {
    const C = res.cash;
    const all = [].concat.apply([], C.months.map((m) => m.items));
    const byCat = (cat) => U.sum(all.filter((i) => i.cat === cat), (i) => i.amount);
    const newRec = U.sum(res.newReceivables, (r) => r.amount);
    const dep = res.pl.get('depreciation');
    const gains = res.special;
    const emNet = C.emergencyEnd - C.emergencyStart;
    const recon = [
      ['税引前の利益', res.pl.preTax],
      [h('span', null, T('減価償却'), '費（お金が出ていかない費用）'), dep],
      [h('span', null, '今年の売上のうち翌年入金の分（', T('未収金'), '）'), -newRec],
      ['前年分の未収金の入金', byCat('collect')],
      ['保管米の在庫の増減（利益に入っているが、お金は動いていない分）', -res.pl.get('inventory')],
      ['機械・農地の売却による入金', byCat('assetSale')],
      ['売却損益（利益に含まれている分）', -gains],
      ['機械・農地の購入', byCat('asset')],
      ['新たな借入', byCat('loanIn')],
      ['出資（援助など）', byCat('capital')],
      ['借入金の返済（元金）', byCat('loanOut')],
      ['前年分の税金の支払い', byCat('tax')],
      st.corp ? null : ['家計費', byCat('withdraw')],
      ['出荷契約金の受け取りと返還（年内で相殺）', byCat('advanceIn') + byCat('advanceOut')],
      ['つなぎ資金の増減', emNet],
    ].filter((x) => x && Math.abs(x[1]) > 0.5);
    const rows = recon.map((x) => [x[0], { v: U.man(x[1]), cls: 'num ' + (x[1] < 0 ? 'neg' : '') }]);
    rows.push({ cls: 'total', cells: ['＝ 資金の増減（' + U.man(C.start) + ' → ' + U.man(C.end) + '）', { v: U.man(C.end - C.start), cls: 'num' }] });
    const monthDetails = C.months.map((m) => h('details', { class: 'more' },
      h('summary', null, m.m + '月：入金 ' + U.man(m.inflow) + '・出金 ' + U.man(-m.outflow) + '・月末 ' + U.man(m.end) + (m.borrowed > 0 ? '（つなぎ資金 ' + U.man(m.borrowed) + ' 借入）' : '')),
      UI.table(null, mergeItems(m.items).map((i) => [i.label, { v: U.man(i.amount), cls: 'num ' + (i.amount < 0 ? 'neg' : '') }]))));
    return h('div', { class: 'stack' },
      UI.card('月ごとの資金の動き', null,
        h('div', { class: 'kpis' }, UI.kpi('年初の資金', U.man(C.start)), UI.kpi('年末の資金', U.man(C.end)),
          UI.kpi('最も少なかった月', C.minMonth + '月', U.man(C.minBalance), C.minBalance < 0 ? 'bad' : ''),
          UI.kpi(h('span', null, T('つなぎ資金'), 'の最大'), U.man(C.emergencyPeak), '利息 ' + U.man(C.emInterest), C.emergencyPeak > C.emergencyStart + 1 ? 'bad' : '')),
        RG.chart.cash(C.months, C.start),
        RG.screens.cashTable(C.months)),
      UI.card('利益とお金のずれ', '利益が出ても資金が減ることがある理由（＋は資金が増える、−は減る）', UI.table(null, rows)),
      UI.card('月ごとの明細', null, h('div', { class: 'stack' }, monthDetails)));
  }

  function mergeItems(items) {
    const map = {};
    items.forEach((i) => { const k = i.label; (map[k] = map[k] || { label: k, amount: 0 }).amount += i.amount; });
    return Object.values(map).filter((x) => Math.abs(x.amount) >= 1).sort((a, b) => b.amount - a.amount);
  }

  // ---------- 原価・損益分岐 ----------
  function costTab(app, st, res) {
    const an = res.analysis, pl = res.pl;
    const fixed = pl.lines.expense.filter((x) => x.group === 'fix').concat(pl.lines.nonopExpense);
    const variable = pl.lines.expense.filter((x) => x.group === 'var');
    const fmtA = (v) => (isFinite(v) ? U.ha(v) : '黒字にならない');
    return h('div', { class: 'stack' },
      UI.card(T('生産費'), null, h('div', { class: 'kpis' },
        UI.kpi('10aあたり経営費', U.yen(an.costPer10a), '家族労働費込み ' + U.yen(an.fullCostPer10a)),
        UI.kpi('販売用米60kgあたり', U.yen(an.costPer60), '家族労働費込み ' + U.yen(an.fullCostPer60), an.costPer60 > res.price ? 'bad' : ''),
        UI.kpi('今年の米価', U.yen(res.price), '1俵あたりの差 ' + U.yen(res.price - an.costPer60)),
        UI.kpi('家族労働費（見積り）', U.man(an.familyLaborCost), U.num(res.labor.familyHoursUsed) + 'h × ' + U.yen(D.LABOR.familyValue))),
        h('p', { class: 'small muted' }, '家族労働費は実際には払っていない費用ですが、外で働けば得られた賃金（', T('機会費用'), '）として含めると、本当にもうかっているかが分かります。')),
      UI.card(T('損益分岐点'), null, h('div', { class: 'kpis' },
        UI.kpi(h('span', null, T('限界利益'), '（10aあたり）'), U.yen(an.marginPer10a), '売上＋交付金 ' + U.yen(an.revPer10a) + ' − 変動費 ' + U.yen(an.varPer10a), an.marginPer10a < 0 ? 'bad' : ''),
        UI.kpi('損益分岐面積', fmtA(an.bepArea), '今年の作付 ' + U.ha(res.area.planted), an.bepArea > res.area.planted ? 'bad' : 'good'),
        st.corp ? null : UI.kpi('生活費も含めた分岐面積', fmtA(an.bepAreaLiving), '家計費 ' + U.man(st.living) + ' をまかなうには', an.bepAreaLiving > res.area.planted ? 'warn' : 'good'),
        UI.kpi('損益分岐米価', U.yen(an.bepPrice), '60kgあたりこれを下回ると赤字', an.bepPrice > res.price ? 'bad' : ''),
        st.corp ? null : UI.kpi('生活費も含めた分岐米価', U.yen(an.bepPriceLiving)),
        UI.kpi('限界利益率', U.pct(an.marginRatio), '売上のうち固定費の回収に回る割合')),
        h('p', { class: 'small muted' }, '損益分岐面積 ＝ 固定費 ÷ 10aあたり限界利益。面積を増やすと固定費を薄められますが、機械や人手が増えると固定費自体も増えます。')),
      h('div', { class: 'grid2' },
        UI.card(T('固定費'), U.man(U.sum(fixed, (x) => x.value)), UI.table(null, fixed.map((x) => [x.label, { v: U.man(x.value), cls: 'num' }, { v: per10a(x.value, res), cls: 'num muted' }]))),
        UI.card(T('変動費'), U.man(U.sum(variable, (x) => x.value)), UI.table(null, variable.map((x) => [x.label, { v: U.man(x.value), cls: 'num' }, { v: per10a(x.value, res), cls: 'num muted' }])))),
      UI.card('返済能力と安全性', null, h('div', { class: 'kpis' },
        UI.kpi(T('償還財源'), U.man(an.repaySource), '税引後' + (st.corp ? '利益' : '所得−家計費') + '＋減価償却費', an.repaySource < 0 ? 'bad' : ''),
        UI.kpi('有利子負債', U.man(an.debt)),
        UI.kpi(T('債務償還年数'), an.debt <= 0 ? '借入なし' : isFinite(an.repayYears) ? U.num(an.repayYears, 1) + '年' : '返済原資なし', '10年以内が目安', !isFinite(an.repayYears) || an.repayYears > 10 ? 'warn' : ''),
        UI.kpi(T('自己資本比率'), U.pct(an.equityRatio), '30%以上が目安', an.equityRatio < 0.3 ? 'warn' : ''))));
  }

  // ---------- 生産と販売 ----------
  function prodTab(app, st, res) {
    const P = res.production, S = res.sales;
    const AG = RG.agro;
    const gradeTxt = (m) => ['1等', '2等', '3等', '規格外'].map((g, i) => (m[i] > 0.005 ? g + U.pct(m[i]) : null)).filter(Boolean).join('・');
    const plots = P.plots.map((p) => [p.name, { v: U.ha(p.area), cls: 'num' },
      p.hd != null ? AG.fmt(p.plant) + ' → ' + AG.fmt(p.hd) + (p.late > 0.5 ? '（' + U.num(p.late) + '日遅れ）' : '') : '—',
      { v: U.num(p.y10) + 'kg', cls: 'num' }, { v: U.num(p.std) + 'kg', cls: 'num muted' }, { v: U.bales(p.bales), cls: 'num' },
      D.CROPS[p.crop].market && p.mix ? gradeTxt(p.mix) : D.CROPS[p.crop].market ? U.pct(p.r1) : '—']);
    const sales = [];
    S.contracts.forEach((c) => sales.push(['契約：' + c.buyer, { v: U.bales(c.volume), cls: 'num' },
      { v: h('span', null, U.yen(c.price), c.refPrice ? h('div', { class: 'small muted' }, '目安 ' + U.yen(c.refPrice)) : null), cls: 'num' }, { v: U.man(c.revenue), cls: 'num' },
      c.short > 0.5 ? h('span', { class: 'badge bad' }, U.bales(c.short) + '不足・調達費 ' + U.man(c.procure)) : h('span', { class: 'badge good' }, '契約どおり')]));
    (S.shops || []).forEach((x) => sales.push([x.icon + ' ' + x.name, { v: U.bales(x.sold), cls: 'num' }, { v: U.yen(x.unit), cls: 'num' }, { v: U.man(x.revenue), cls: 'num' },
      x.frac < 1 ? h('span', { class: 'badge bad' }, U.pct(x.frac, 0) + 'しか引き取れず（' + U.bales(x.returned) + ' はスポットへ）') : h('span', { class: 'badge good' }, '全量引き取り')]));
    const d = S.direct;
    if (d.alloc > 0) sales.push(['直販：' + d.label, { v: U.bales(d.sold), cls: 'num' }, { v: U.yen(d.price5 * D.DIRECT.bagsPerBale), cls: 'num' }, { v: U.man(d.revenue), cls: 'num' },
      h('span', { class: 'small' }, '需要 ' + U.bales(d.demand) + (d.unsold > 0.5 ? '・売れ残り ' + U.bales(d.unsold) : ''))]);
    S.ja.forEach((j) => sales.push(['農協：' + j.label, { v: U.bales(j.bales), cls: 'num' }, { v: U.yen(j.unit), cls: 'num' }, { v: U.man(j.revenue), cls: 'num' }, h('span', { class: 'small muted' }, '1等比率 ' + U.pct(j.r1))]));
    S.spot.forEach((j) => sales.push(['スポット：' + j.label, { v: U.bales(j.bales), cls: 'num' }, { v: U.yen(j.unit), cls: 'num' }, { v: U.man(j.revenue), cls: 'num' }, '']));
    if (S.feed.bales > 0) sales.push(['飼料用米', { v: U.bales(S.feed.bales), cls: 'num' }, { v: U.yen(D.SALES.feedPrice), cls: 'num' }, { v: U.man(S.feed.revenue), cls: 'num' }, h('span', { class: 'small' }, '＋交付金 ' + U.man(S.feed.subsidy))]);
    return h('div', { class: 'stack' },
      UI.card('作付ごとの収量', '平均 ' + U.num(P.yieldPer10a) + 'kg/10a・' + U.bales(P.totalBales),
        UI.table([{ label: '作付' }, { label: '面積', num: true }, { label: '田植え → 収穫' }, { label: '10aあたり', num: true }, { label: '平年単収', num: true }, { label: '収量', num: true }, { label: T('等級') }], plots),
        res.production.pestLoss > 0 ? h('p', { class: 'small neg' }, res.pestName + 'の被害がありました。特別栽培・有機は被害を受けやすく、ドローン防除で軽減できます。') : null),
      UI.card('販売の結果', '米価 ' + U.yen(res.price) + '/60kg',
        UI.table([{ label: '販路' }, { label: '数量', num: true }, { label: '単価', num: true }, { label: '売上', num: true }, { label: '' }], sales)),
      d.alloc > 0 ? UI.card('直販の顧客', null, h('div', { class: 'kpis' },
        UI.kpi('期首の顧客', U.num(d.customers) + '人'), UI.kpi('離れた顧客', U.num(d.customers * d.churn) + '人', T('リピート率').textContent + ' ' + U.pct(1 - d.churn)),
        UI.kpi('新しい顧客', U.num(d.newCustomers) + '人', '販促・口コミ'), UI.kpi('来年の顧客', U.num(d.customersEnd) + '人'),
        UI.kpi('参考価格（5kg）', U.yen(d.ref5), '設定価格 ' + U.yen(d.price5)), UI.kpi(T('ブランド力'), U.num(st.brand)))) : null,
      res.insurance.kind !== 'none' ? UI.card('保険', D.INSURANCE[res.insurance.kind].name, h('p', null,
        '保険料 ' + U.man(res.insurance.premium) + '・補てん ' + U.man(res.insurance.kyosaiPay + res.insurance.incomePay) +
        (res.insurance.kind === 'income' ? '（基準収入 ' + U.man(res.insurance.base) + '、今年の販売収入 ' + U.man(res.insurableRev) + '）' : ''))) : null);
  }

  // ---------- 労働と機械 ----------
  function workTab(app, st, res) {
    const L = res.labor;
    const rows = D.SEASONS.map((s) => {
      const x = L.seasons[s];
      return [D.SEASON_NAMES[s], { v: U.num(x.need) + 'h', cls: 'num' }, { v: U.num(x.useFam) + 'h', cls: 'num' }, { v: U.num(x.useStaff) + 'h', cls: 'num' }, { v: U.num(x.usePart) + 'h', cls: 'num' },
        { v: x.short > 0.5 ? U.num(x.short) + 'h（' + U.pct(x.ratio) + '）' : '—', cls: 'num ' + (x.short > 0.5 ? 'neg' : '') },
        { v: x.peopleNeed ? Math.ceil(x.peopleNeed - 1e-9) + '人 / ' + x.heads + '人' : '—', cls: 'num ' + (x.peopleShort > 0.05 ? 'neg' : '') }];
    });
    const mrows = ['tractor', 'nursery', 'planter', 'combine', 'dryer', 'drone', 'smart'].map((t) => {
      const M = res.machines[t];
      return [D.MACHINE_TYPES[t].icon + ' ' + D.MACHINE_TYPES[t].name, { v: U.ha(M.need), cls: 'num' }, { v: U.ha(M.cap), cls: 'num' }, { v: M.cap > 0 ? U.pct(M.util) : '—', cls: 'num' }, { v: M.contract > 0.01 && D.MACHINE_TYPES[t].contract ? U.ha(M.contract) : '—', cls: 'num' }];
    });
    return h('div', { class: 'stack' },
      UI.card('季節ごとの労働', '年間 ' + U.num(L.totalHours) + 'h（10aあたり ' + U.num(L.hoursPer10a, 1) + 'h）',
        UI.table([{ label: '季節' }, { label: '必要', num: true }, { label: '家族', num: true }, { label: '社員', num: true }, { label: 'パート', num: true }, { label: '不足', num: true }, { label: '人手（要る/いる）', num: true }], rows),
        h('p', { class: 'small muted' }, 'パート ' + U.num(L.partHours) + 'h・賃金 ' + U.man(L.partCost) + '。労働力が不足すると作業が遅れ、収量と1等比率が下がります（今年の収量への影響 ' + U.pct(res.production.laborY - 1) + '）。')),
      UI.card('機械の稼働', null,
        UI.table([{ label: '機械' }, { label: '必要面積', num: true }, { label: '能力', num: true }, { label: T('機械稼働率', '稼働率'), num: true }, { label: '委託', num: true }], mrows),
        res.broken.length ? h('div', { class: 'notes', style: { marginTop: '8px' } }, res.broken.map((b) => UI.note('bad', b.name + 'が故障', (b.why && b.why.length ? '故障しやすくなっていた理由：' + b.why.join('・') + '（' + b.age + '年使用）。' : b.age != null ? b.age + '年使った機械でした。' : '') + (b.lease ? 'リースのため修理費はかかりませんでした。' : '修理費がかかり、作業能力が下がりました。')))) : null));
  }

  const FNS = { summary, pl: plTab, bs: bsTab, cash: cashTab, cost: costTab, prod: prodTab, work: workTab };
})(window.RG = window.RG || {});
