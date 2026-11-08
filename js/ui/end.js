// 経営終了（ストーリーのエンディング・自分の経営のふり返り）・経営破綻の画面
(function (RG) {
  'use strict';
  const UI = RG.ui, h = UI.h, D = RG.data, U = RG.util;
  const T = UI.term;

  RG.score = function (st) {
    const hs = st.history;
    const last = hs[hs.length - 1];
    return RG.scoreFrom({ eqGain: last.equity - st.initialEquity, avgInc: U.avg(hs.map((x) => x.income)),
      ratio: last.assets > 0 ? last.equity / last.assets : 0, area: last.area, trust: st.trust, brand: st.brand });
  };

  RG.screens.end = function (app) {
    const st = app.st;
    const hs = st.history;
    const over = st.phase === 'gameover';
    const base = st.baseline;
    const labels = hs.map((x) => x.year + '年');
    const incomeSeries = [{ name: '売上高', values: hs.map((x) => x.sales) }, { name: 'あなたの所得', values: hs.map((x) => x.income) }];
    if (base && base.incomesMed.length) incomeSeries.push({ name: '今のままの所得（30通りの中央値）', values: hs.map((_, i) => base.incomesMed[i]), cls: 'c5', dash: '5 4' });
    const charts = hs.length >= 2 ? h('div', { class: 'grid2' },
      UI.card('売上と所得', null, RG.chart.line({ labels, series: incomeSeries })),
      UI.card('純資産・借入・資金', null, RG.chart.line({ labels, series: [{ name: '純資産', values: hs.map((x) => x.equity) }, { name: '借入残高', values: hs.map((x) => x.debt), cls: 'c4' }, { name: '年末の資金', values: hs.map((x) => x.cashEnd), cls: 'c3' }] })),
      UI.card('経営面積', null, RG.chart.line({ labels, series: [{ name: '経営面積（ha）', values: hs.map((x) => x.area) }], fmt: (v) => U.num(v), tipFmt: (v) => U.ha(v) })),
      UI.card('米価と60kgあたり生産費', null, RG.chart.line({ labels, series: [{ name: '米価', values: hs.map((x) => x.price), cls: 'c2' }, { name: '60kgあたり生産費', values: hs.map((x) => x.costPer60), cls: 'c4' }], fmt: (v) => U.num(v), tipFmt: (v) => U.yen(v), zero: false }))) : null;

    const table = UI.table([{ label: '年' }, { label: '天候' }, { label: '米価', num: true }, { label: '面積', num: true }, { label: '売上', num: true }, { label: '所得', num: true }, { label: '純資産', num: true }, { label: '借入', num: true }],
      hs.map((x) => [x.year + '年目', D.WEATHER[x.weather].icon + ' ' + D.WEATHER[x.weather].name, { v: U.num(x.price), cls: 'num' }, { v: U.ha(x.area), cls: 'num' },
        { v: U.man(x.sales), cls: 'num' }, { v: U.man(x.income), cls: 'num ' + (x.income < 0 ? 'neg' : '') }, { v: U.man(x.equity), cls: 'num ' + (x.equity < 0 ? 'neg' : '') }, { v: U.man(x.debt), cls: 'num' }]));

    const buttons = h('div', { class: 'row no-print' }, h('span', { class: 'spacer' }),
      UI.btn('印刷・PDFで保存', () => window.print(), ''),
      UI.btn('まとめをダウンロード', () => downloadReport(st), ''),
      st.closed ? UI.btn('▶ 経営を続ける（' + st.year + '年目の計画へ）', () => app.reopenGame(), 'gold') : null,
      UI.btn('同じ条件でもう一度', () => app.newGame({ scenarioId: st.scenarioId, custom: st.custom, farmName: st.farmName, seed: st.seed }), ''),
      UI.btn('タイトルへ', () => { app.st = null; app.render(); }, 'primary'));

    let head;
    if (over) {
      const lessons = [];
      const worst = hs[hs.length - 1];
      if (st.gameOver.reason === 'deadline') lessons.push('期限つきの危機を乗り越えられませんでした。危機の知らせが来たら、計画のホームの「期限」を見ながら、借入・品質・地域とのつきあいを最優先で立て直しましょう。');
      else if (st.gameOver.reason === 'bank') lessons.push('融資の審査に通らず、金融機関からの融資が止まりました。審査は決算の黒字・赤字を見ます。赤字の契約・使っていない機械・高い地代の田など、出血の元を早めに止めましょう。');
      else if (st.gameOver.reason === 'cash') lessons.push('資金繰りが続かなくなりました。秋に売上が入るまでの資金を確保し、借入の返済額が「利益＋減価償却費」を超えないようにしましょう。');
      else lessons.push('赤字が続いて純資産がマイナスになりました。固定費（機械・人件費・地代）が売上に見合っているか、損益分岐面積と比べてみましょう。');
      if (worst.area < 8) lessons.push('経営面積が小さいと、機械や生活費をまかなうだけの所得が得られません。農地を集め、委託から自前の機械へ切り替える時期を考えましょう。');
      if (hs.some((x) => x.laborShort > 0.05)) lessons.push('人手不足で収量・品質が落ちた年がありました。季節ごとの労働バランスを確認しましょう。');
      head = UI.card('経営終了', st.gameOver.year + '年目',
        UI.note('bad', '経営を続けられなくなりました', st.gameOver.text),
        h('h3', { style: { margin: '12px 0 6px' } }, '振り返りのポイント'),
        h('div', { class: 'notes' }, lessons.map((t) => UI.note('info', null, t))));
    } else {
      const sc = RG.score(st);
      const ret = st.retired;
      const years = hs.length;
      head = UI.card(ret ? years + '年目で経営主が引退しました' : years + '年の経営を終えました', D.SCENARIOS[st.scenarioId].name + '・シード ' + st.seed,
        ret ? UI.note('warn', '経営主が' + ret.age + '歳になり、農作業から引退しました', '引き継げる後継者がいないため、ここで経営を終えます。引退時の純資産は ' + U.man(hs[years - 1].equity) + '、借入残高は ' + U.man(hs[years - 1].debt) + ' でした。') : null,
        h('div', { class: 'row', style: { gap: '20px', alignItems: 'center', marginTop: ret ? '10px' : 0 } },
          h('div', { style: { textAlign: 'center' } }, h('div', { class: 'rank' }, sc.rank), h('div', { class: 'muted small' }, U.num(sc.total, 1) + ' / 100点')),
          h('div', null, h('h2', null, sc.title), h('p', null, years + '年間で' + (Math.round(sc.eqGain / 1e5) >= 0 ? '純資産を ' + U.man(sc.eqGain) + ' 増やし' : '純資産が ' + U.man(-sc.eqGain) + ' 減り') + '、経営者・家族は年平均 ' + U.man(sc.avgInc) + ' の所得を得ました。'))),
        UI.table([{ label: '評価項目' }, { label: '実績', num: true }, { label: '得点', num: true }],
          sc.items.map((x) => [x.label, { v: x.value, cls: 'num' }, { v: U.num(x.pts, 1) + ' / ' + x.max, cls: 'num' }])));
    }

    return h('div', null, app.topbar(), h('div', { class: 'layout one' }, h('main', { class: 'stack' },
      RG.screens.storyEnding(st), head, RG.screens.challengeCard(st), insightCard(app), RG.screens.pathEnding(st), RG.chapters.on(st) ? RG.screens.chapterRecap(st, RG.chapters.of(st.year, st).n) : null, RG.screens.rivalsCard(st, '地域の農家との比較'), RG.screens.titlesCard(st), RG.screens.surveyCard(app), charts, UI.card('年ごとの記録', null, table), buttons)));
  };

  // 高橋さんの見立て：「今のやり方のまま続けたら」を裏で試算して、あなたの結果と並べる
  function insightCard(app) {
    const st = app.st;
    if (!st.initialSnapshot) return null;
    if (!st.baseline) {
      const prog = h('span', null, '0 / 30');
      // 試算は同じゲーム（始めたときの状態が同じ）につき1回。読み込み直して別のオブジェクトになっても結果を渡す
      if (app.baselineFor !== st.initialSnapshot) {
        app.baselineFor = st.initialSnapshot;
        app.baselineProgress = 0;
        RG.outlook.runBaseline(st, 30, (i) => { app.baselineProgress = i; const el = document.getElementById('baseline-prog'); if (el) el.textContent = i + ' / 30'; }, (summary) => {
          st.baseline = summary;
          if (app.st && app.st.initialSnapshot === st.initialSnapshot) {
            app.st.baseline = summary;
            app.autosave();
            if (app.st.phase === 'end' || app.st.phase === 'gameover') { app.keepScroll = true; app.render(); }
          }
          app.baselineFor = null;
        });
      }
      prog.id = 'baseline-prog';
      prog.textContent = (app.baselineProgress || 0) + ' / 30';
      return UI.card(RG.advisor.NAME + 'の見立て', null, h('p', { class: 'muted' }, '高橋さんが、始めたときのやり方のまま続けた場合を、天候を変えて試算しています…（', prog, '）'));
    }
    const items = RG.outlook.assess(st, st.baseline);
    const b = st.baseline;
    return UI.card(UI.whoTitle('takahashi', RG.advisor.NAME + 'の見立て'), 'あなたの経営は、これからやっていけるか',
      h('div', { class: 'kpis' },
        UI.kpi('今のままで続けられた割合', U.pct(b.rate), b.n + '通りの天候のうち ' + b.survived + '通り', b.rate >= 0.9 ? 'good' : b.rate >= 0.6 ? 'warn' : 'bad'),
        UI.kpi(b.retiredYear ? '今のままの引退時の純資産' : '今のままの' + Math.min(st.maxYear, D.MAX_YEAR) + '年後の純資産', U.man(b.equityMed), '中央値（悪いほうから1割：' + U.man(b.equityLow) + '）'),
        UI.kpi('今のままの平均所得', U.man(b.incomeMed), '1年あたり・中央値'),
        UI.kpi('あなたの結果', U.man(st.history[st.history.length - 1].equity), st.gameOver ? st.gameOver.year + '年目で終了' : st.retired ? st.retired.year + '年目で引退' : st.history.length + '年続けた')),
      h('div', { class: 'notes', style: { marginTop: '10px' } }, items.map((x) => UI.note(x.level, x.title, x.text))),
      h('p', { class: 'small muted' }, '「今のまま」は、始めたときの規模・品種・販路を変えず、寿命の来た機械だけを同じ機種に買い替え、人手が足りなければパートを増やした場合の試算です。ゲームの数値は学習用に単純化しています。実際の判断は、決算書や専門家との相談とあわせて行ってください。'));
  }

  // ---------- まとめのダウンロード（印刷用のHTML） ----------
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function downloadReport(st) {
    const hs = st.history, last = hs[hs.length - 1];
    const b = st.baseline;
    const items = RG.outlook.assess(st, b);
    const c = st.custom;
    const rows = hs.map((x) => '<tr><td>' + x.year + '年目</td><td>' + esc(D.WEATHER[x.weather].name) + '</td><td>' + U.num(x.price) + '</td><td>' + U.ha(x.area) + '</td><td>' +
      U.man(x.sales) + '</td><td>' + U.man(x.income) + '</td><td>' + U.man(x.equity) + '</td><td>' + U.man(x.debt) + '</td></tr>').join('');
    let input = '';
    if (c) {
      const n = RG.state.numOr; // 空欄のときは、ゲームで実際に使った初期値を書く（S.buildCustom と同じ）
      const fam = c.family.map((f) => esc(f.rel) + ' ' + Math.round(n(f.age, 60)) + '歳（' + D.WORK_STYLES[f.work].name + '）').join('、') || 'なし';
      const mach = Object.keys(c.machines).map((t) => D.MACHINE_TYPES[t].name + '：' + (c.machines[t].size === 'none' ? '委託' : D.MODELS[RG.state.SIZE_MODEL[t][c.machines[t].size]].name + '・' + Math.round(n(c.machines[t].age, 0)) + '年使用')).join('、');
      input = '<h2>始めたときの経営</h2><ul>' +
        '<li>経営主 ' + Math.round(n(c.age, 60)) + '歳・経験 ' + U.clamp(n(c.exp, 0), 0, 60) + '年・' + (c.corp ? '法人' : '個人経営') + '</li>' +
        '<li>家族の働き手：' + fam + '・後継者：' + ({ now: 'いる（一緒に働いている）', plan: 'いる（' + Math.round(n(c.succYear, 1)) + '年後に就農予定）', none: 'いない・未定' }[c.successor]) + '</li>' +
        '<li>農地：所有 ' + Math.max(0, n(c.owned, 0)) + 'ha・借地 ' + Math.max(0, n(c.rented, 0)) + 'ha（地代 ' + U.num(Math.max(0, n(c.rent, 10000))) + '円/10a）</li>' +
        '<li>作付：' + c.crops.map((x) => esc(D.CROPS[x.crop].name) + ' ' + x.pct + '%').join('、') + '</li>' +
        '<li>機械：' + esc(mach) + '</li>' +
        '<li>預貯金 ' + U.man(Math.max(0, n(c.cash, 0))) + '・借入 ' + U.man(Math.max(0, n(c.debt, 0))) + '（残り' + Math.max(1, Math.round(n(c.debtYears, 5))) + '年）・' + (c.corp ? '役員報酬 ' + U.man(Math.max(D.FIN.livingMin, n(c.execPay, 0))) : '家計費 ' + U.man(Math.max(D.FIN.livingMin, n(c.living, 0)))) + '</li></ul>';
    }
    const html = '<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>' + esc(st.farmName) + ' 経営の振り返り</title>' +
      '<style>body{font-family:"Hiragino Kaku Gothic ProN","Yu Gothic UI","Meiryo",sans-serif;max-width:860px;margin:24px auto;padding:0 16px;color:#222;line-height:1.6}' +
      'h1{font-size:22px}h2{font-size:17px;border-bottom:2px solid #3c7a37;margin-top:24px}table{border-collapse:collapse;width:100%;font-size:13px}' +
      'td,th{border-bottom:1px solid #ddd;padding:4px 6px;text-align:right}td:first-child,th:first-child,td:nth-child(2),th:nth-child(2){text-align:left}' +
      '.n{padding:8px 12px;border-radius:6px;margin:6px 0;background:#f4f4ef}.good{background:#e5f3ea}.warn{background:#fbf0dc}.bad{background:#fae6e3}.tip{background:#fbf3dd}.muted{color:#666;font-size:12px}</style></head><body>' +
      '<h1>' + esc(st.farmName) + '：経営の振り返り</h1><p class="muted">米道 KOMEDO（' + esc(D.SCENARIOS[st.scenarioId].name) + '・シード ' + st.seed + '）　作成日 ' + new Date().toLocaleDateString('ja-JP') + '</p>' +
      input +
      '<h2>結果</h2><p>' + (st.gameOver ? st.gameOver.year + '年目で経営を続けられなくなりました。' : st.retired ? st.retired.year + '年目に経営主が引退しました。' : hs.length + '年の経営を終えました。') +
      ' 最後の純資産 ' + U.man(last.equity) + '、借入残高 ' + U.man(last.debt) + '、年平均の所得 ' + U.man(U.avg(hs.map((x) => x.income))) + '。</p>' +
      (b ? '<p>今のやり方のまま続けた場合：' + b.n + '通りの天候のうち ' + b.survived + '通りで続けられた（' + Math.min(st.maxYear, D.MAX_YEAR) + '年後の純資産の中央値 ' + U.man(b.equityMed) + '）。</p>' : '') +
      '<h2>' + esc(RG.advisor.NAME) + 'の見立て</h2>' + items.map((x) => '<div class="n ' + x.level + '"><b>' + esc(x.title) + '</b><br>' + esc(x.text) + '</div>').join('') +
      '<h2>年ごとの記録</h2><table><tr><th>年</th><th>天候</th><th>米価(円/60kg)</th><th>面積</th><th>売上</th><th>所得</th><th>純資産</th><th>借入</th></tr>' + rows + '</table>' +
      '<p class="muted">ゲームの数値は学習用に単純化した試算です。実際の経営判断は、決算書や専門家との相談とあわせて行ってください。</p></body></html>';
    const blob = new Blob([html], { type: 'text/html' });
    const a = h('a', { href: URL.createObjectURL(blob), download: st.farmName + '_経営の振り返り.html' });
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function best(hs, k) { const x = hs.reduce((a, b) => (b[k] > a[k] ? b : a)); return x.year + '年目（' + U.man(x[k]) + '）'; }
  function worst(hs, k) { const x = hs.reduce((a, b) => (b[k] < a[k] ? b : a)); return x.year + '年目（' + U.man(x[k]) + '）'; }
})(window.RG = window.RG || {});
