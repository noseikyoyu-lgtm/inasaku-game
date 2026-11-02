// 経営計画フェーズの画面
(function (RG) {
  'use strict';
  const UI = RG.ui, h = UI.h, D = RG.data, U = RG.util, SIM = RG.sim, A = RG.actions, ACC = RG.accounting, S = RG.state, AG = RG.agro;
  const T = UI.term;

  const TABS = [
    ['overview', '概況', '🏠'], ['crops', '作付計画', '🌾'], ['land', '農地', '🗾'], ['machines', '機械・設備', '🚜'],
    ['labor', '労働力', '👨‍🌾'], ['sales', '販売計画', '🛒'], ['biz', '新しい事業', '🏪'], ['finance', '資金・保険', '💰'],
  ];

  const GUIDES = {
    overview: '1年の流れ：① 各タブで今年の計画を立てる → ② 右の「今年の見通し」で所得と資金繰りを確認 → ③「この計画で1年を始める」→ ④ 決算書で振り返る。まずは「作付計画」から見てみましょう。',
    crops: '品種ごとに、作る面積と栽培方法・植え方を決めます。高く売れる品種ほど天候に弱いなど、一長一短があります。早生・中生・晩生を組み合わせると稲刈りが分散します。右の見通しが変わる様子を確かめながら決めましょう。',
    land: '規模を広げると1haあたりの固定費（機械費など）が下がります。ただし地代がかかり、機械と人手が追いつかないと逆効果です。',
    machines: '機械は「買う」「リースする」「作業を委託する」の3択です。面積が小さいうちは委託が安く、面積が増えるほど自前の機械が有利になります。',
    labor: '春（田植え）と秋（稲刈り）に作業が集中します。季節ごとの不足を見て、パートや社員を確保しましょう。不足すると収量と品質が落ちます。',
    sales: '売り先を組み合わせて、価格の高さと安定性のバランスを取りましょう。契約で決めなかった米は自動的に農協に出荷されます。',
    biz: '稲作のほかに、機械の空き能力を活かした作業受託や、加工・直売所などの事業に取り組めます（6次産業化）。売上は増えますが、設備投資と手間がかかります。',
    finance: '米の代金は秋に入りますが、支出は春から始まります。資金が足りなくなる月がないか確認し、必要なら運転資金を借りておきましょう。',
  };

  RG.screens.plan = function (app) {
    if (app.viewingLast && app.st.lastResult) return RG.screens.result(app);
    const st = app.st;
    if (!st.visit || st.visit.year !== st.year) st.visit = { year: st.year, tabs: {} };
    if (!st.visit.tabs[app.tab]) { st.visit.tabs[app.tab] = true; app.autosave(); }
    const pv = SIM.simulate(st, { preview: true });
    const hints = RG.advisor.planHints(st, pv);
    const dots = {
      labor: D.SEASONS.some((s) => pv.labor.seasons[s].ratio > 0.01),
      finance: pv.cash.minBalance < 0,
      sales: pv.sales.contracts.some((c) => c.short > 0.5) || st.offers.contracts.length > 0,
      land: st.offers.land.length > 0,
    };
    const nav = h('nav', { class: 'nav', 'aria-label': '計画のタブ' }, TABS.map(([k, l, ic]) =>
      h('button', { class: app.tab === k ? 'on' : '', type: 'button', onclick: () => { app.tab = k; app.render(); } }, h('span', { class: 'nav-ic', 'aria-hidden': 'true' }, ic), h('span', { class: 'nav-l' }, l),
        dots[k] ? h('span', { class: 'dot', title: k === 'land' || k === 'sales' ? '新しい話があります' : '注意があります' }) : null)));
    const tabFn = TAB_FNS[app.tab] || TAB_FNS.overview;
    const content = [];
    if (app.tab !== 'overview') content.push(tabBanner(app.tab, st));
    content.push(tabFn(app, st, pv));
    return h('div', null, app.topbar(),
      h('div', { class: 'layout' }, nav, h('main', { class: 'stack' }, content), h('aside', { class: 'aside' }, previewPanel(app, st, pv, hints))));
  };

  // ---------- タブの見出し：絵と、高橋さんのひとこと ----------
  const BANNERS = {
    crops: ['🌾', '🌱', '🍶', '作付計画', '何を、どれだけ作る？'], land: ['🗾', '🏡', '🤝', '農地', '田んぼを広げる？ 返す？'],
    machines: ['🚜', '🌾', '🔧', '機械・設備', '買う？ 借りる？ 頼む？'], labor: ['👨‍🌾', '🧑‍🌾', '⏰', '労働力', '人手は足りてる？'],
    sales: ['🛒', '🤝', '📦', '販売計画', 'どこに、いくらで売る？'], biz: ['🏪', '🍡', '🛸', '新しい事業', '稲作のほかにも挑戦！'],
    finance: ['💰', '🏦', '🛡️', '資金・保険', 'お金は1年もつ？'],
  };
  function tabBanner(tab, st) {
    const b = BANNERS[tab];
    if (!b) return null;
    return h('section', { class: 'tab-banner tb-' + tab },
      h('div', { class: 'tb-art', 'aria-hidden': 'true' }, h('span', null, b[0]), h('span', null, b[1]), h('span', null, b[2])),
      h('div', { class: 'tb-text' }, h('h2', null, b[3]), h('div', { class: 'tb-q' }, b[4])),
      st.year <= 3 && GUIDES[tab] ? h('details', { class: 'tb-tip' }, h('summary', null, UI.face('takahashi', 2), h('span', null, '高橋さんのコツ')), h('p', null, GUIDES[tab])) : null);
  }

  // ---------- 右側：今年の見通し ----------
  function previewPanel(app, st, pv, hints) {
    const pl = pv.pl;
    const income = ACC.ownerIncome(st, pl);
    const left = st.corp ? pl.preTax - pv.tax.amount : pl.preTax - pv.tax.amount - st.living;
    const shortSeasons = D.SEASONS.filter((s) => pv.labor.seasons[s].ratio > 0.01);
    const contractArea = ['tractor', 'nursery', 'planter', 'combine', 'dryer'].map((t) => pv.machines[t].contract);
    const shown = hints.slice(0, 5), more = hints.slice(5);
    const pvTile = (ic, l, v, cls) => h('div', { class: 'pv-tile ' + (cls || '') }, h('span', { class: 'pi', 'aria-hidden': 'true' }, ic), h('span', { class: 'pl' }, l), h('span', { class: 'pvv' }, v));
    return h('div', { class: 'stack' },
      UI.card('今年の見通し', '平年作・予想米価の場合',
        h('div', { class: 'pv-tiles' },
          pvTile(income > 0 ? '😄' : '😟', 'もうけ', U.man(income), income > 0 ? 'good' : 'bad'),
          pvTile(left >= 0 ? '👛' : '💸', '手元に残る', U.man(left), left >= 0 ? 'good' : 'bad'),
          pvTile(pv.cash.minBalance >= 0 ? '🏦' : '🚨', pv.cash.minMonth + '月の資金', U.man(pv.cash.minBalance), pv.cash.minBalance >= 0 ? '' : 'bad'),
          pvTile(shortSeasons.length ? '😓' : '💪', '人手', shortSeasons.length ? shortSeasons.map((s) => D.SEASON_SHORT[s]).join('・') + '不足' : 'OK', shortSeasons.length ? 'bad' : 'good')),
        h('details', { class: 'pv-more', open: !!app.pvMoreOpen, ontoggle: (e) => { app.pvMoreOpen = e.target.open; } }, h('summary', null, '📋 くわしい内訳'),
        UI.pvRow('売上高', U.man(pl.sales)),
        UI.pvRow('交付金・支援金など', U.man(pl.nonopIncome)),
        UI.pvRow('経費（利息含む）', U.man(pl.expense + pl.nonopExpense)),
        Math.abs(pl.special) > 0.5 ? UI.pvRow('特別損益（機械の売却・除却）', U.man(pl.special), pl.special < 0 ? 'neg' : '') : null,
        UI.pvRow(st.corp ? '税引前利益' : '農業所得', U.man(pl.preTax), pl.preTax < 0 ? 'neg' : 'pos'),
        st.corp ? null : UI.pvRow('家計費（生活費）', '−' + U.man(st.living)),
        UI.pvRow('税金など（翌年払い）', '−' + U.man(pv.tax.amount)),
        UI.pvRow(st.corp ? '税引後利益' : '経営に残るお金', U.man(left), left < 0 ? 'neg' : ''),
        h('hr', { style: { border: 0, borderTop: '1px solid var(--line)', margin: '6px 0' } }),
        UI.pvRow('資金が最も少ない月', pv.cash.minMonth + '月 ' + U.man(pv.cash.minBalance), pv.cash.minBalance < 0 ? 'neg' : ''),
        UI.pvRow('年末の資金', U.man(pv.cash.end)),
        UI.pvRow('労働力', shortSeasons.length ? shortSeasons.map((s) => D.SEASON_SHORT[s]).join('・') + 'が不足' : '足りている', shortSeasons.length ? 'neg' : 'pos'),
        UI.pvRow('作業委託の面積（延べ）', U.ha(U.sum(contractArea))),
        UI.pvRow('見込み収量', U.bales(pv.production.totalBales) + '（10a ' + U.num(pv.production.yieldPer10a) + 'kg）'))),
      hints.length ? UI.card(UI.whoTitle('takahashi', 'JA高橋さんからの注意'), null, h('div', { class: 'notes' }, shown.map((x) => UI.note(x.level, null, x.text)),
        more.length ? h('details', { class: 'more' }, h('summary', null, 'ほかに ' + more.length + '件'), h('div', { class: 'notes' }, more.map((x) => UI.note(x.level, null, x.text)))) : null)) : null,
      h('div', { class: 'stack' },
        UI.btn('この計画で1年を始める ▶', () => app.startSeason(), 'primary big block'),
        app.undo.length ? UI.btn('元に戻す（' + app.undo.length + '）', () => app.undoLast(), 'block') : null,
        h('p', { class: 'muted small' }, '※ 実際の天候・米価・病害虫・機械の故障はシーズン中に決まります。')));
  }

  // ---------- 概況 ----------
  // ---------- ホーム：今年やること・見込みのメーター ----------
  function homeHero(st) {
    const lr = st.lastResult && st.lastResult.year === st.year - 1 ? st.lastResult : null;
    return h('section', { class: 'home-hero' },
      h('span', { class: 'hero-scene', 'aria-hidden': 'true' }, '🏡🌾🚜'),
      h('h2', null, st.year + '年目の経営計画'),
      h('div', { class: 'hero-sub' }, st.year === 1 ? (st.starter && S.plannedArea(st) < 0.05 ? '田んぼはまだ空っぽ。何を作るか、誰と作るか、どこに売るか。自分で決めて、1年をスタート！' : 'まずは今年の段取りを決めよう。全部できたら、1年をスタート！') : '去年の結果をふまえて、今年の段取りを決めよう。'),
      trialBanner(st),
      UI.saying(RG.advisor.quip(st, lr)));
  }
  function trialBanner(st) {
    if (!RG.era) return null;
    const now = RG.era.trialOf(st, st.year), next = RG.era.trialOf(st, st.year + 1);
    if (now) return h('div', { class: 'trial-banner now' }, h('span', { class: 'tb-i', 'aria-hidden': 'true' }, now.icon), h('div', null, h('b', null, '試練の年：' + now.name), h('div', null, now.hit + 'ここまでの備え（品種・売り先・保険・資金）が試される。')));
    if (next && st.year + 1 <= st.maxYear) return h('div', { class: 'trial-banner next' }, h('span', { class: 'tb-i', 'aria-hidden': 'true' }, '⚠️'), h('div', null, h('b', null, '来年の予告：' + next.icon + ' ' + next.name), h('div', null, next.notice)));
    return null;
  }
  function questCard(app, st, pv) {
    const short = D.SEASONS.filter((s) => pv.labor.seasons[s].ratio > 0.01);
    const seen = (st.visit && st.visit.tabs) || {};
    const go = (tab) => () => { app.tab = tab; app.render(); };
    const total = S.totalArea(st), planted = S.plannedArea(st);
    const cropsDone = planted >= total * 0.9 && (st.year > 1 || !st.starter || !!seen.crops);
    const items = [
      cropsDone ? { done: true, text: '作る品種と面積を決めた', sub: '作付 ' + U.ha(planted) + ' / ' + U.ha(total), tab: 'crops', go: '作付計画へ' }
        : planted < 0.05 ? { warn: true, text: '田んぼがまだ空っぽ！ 作る品種と面積を決めよう', sub: '「作付計画」の「作付の型」から選ぶと早いよ（' + U.ha(total) + '）', tab: 'crops', go: '作付計画へ' }
          : { text: '作る品種と面積を決める', sub: '作付 ' + U.ha(planted) + ' / ' + U.ha(total) + '。残りの田にも何か作ろう', tab: 'crops', go: '作付計画へ' },
      planted < 0.05 ? { text: '人手が足りるか確かめる', sub: '作付を決めると、季節ごとに必要な作業時間がわかる', tab: 'labor', go: '労働力へ' }
        : short.length ? { warn: true, text: '人手が足りない季節があります', sub: short.map((s) => D.SEASON_SHORT[s]).join('・') + 'の作業時間が不足。パートを雇うか、作業を委託しよう', tab: 'labor', go: '労働力へ' }
          : { done: true, text: '人手は足りている', sub: '春・夏・秋・冬の作業時間に余裕あり', tab: 'labor', go: '労働力へ' },
      { done: !!seen.sales, text: '売り先を決める', sub: st.direct.customers > 0 && st.direct.alloc <= 0 ? '直販のお客さんが' + U.num(st.direct.customers) + '人いるのに、直販に回す米が0俵。農協・契約・直販の売り分けを決めよう' : '「販売計画」で、農協・契約・直販の売り分けを決めよう', tab: 'sales', go: '販売計画へ' },
      planted < 0.05 ? { text: 'お金が1年もつか確かめる', sub: '作付を決めると、月ごとの資金の見込みがわかる', tab: 'finance', go: '資金・保険へ' }
        : pv.cash.minBalance < 0 ? { warn: true, text: 'お金が足りなくなる月があります', sub: pv.cash.minMonth + '月に ' + U.man(pv.cash.minBalance) + '。運転資金を借りるか、出荷契約金を申し込もう', tab: 'finance', go: '資金・保険へ' }
          : { done: !!seen.finance || st.year > 1, text: st.year === 1 ? '保険と出荷契約金を決める' : 'お金は1年もちそう', sub: st.year === 1 ? '「資金・保険」で、不作への備えと、農協の前渡金を申し込むか決めよう' : 'いちばん少ない ' + pv.cash.minMonth + '月でも ' + U.man(pv.cash.minBalance) + ' 残る見込み', tab: 'finance', go: '資金・保険へ' },
    ];
    const n = items.filter((x) => x.done).length;
    return UI.card('✅ 今年やること', n + ' / ' + items.length + ' クリア',
      h('div', { class: 'quest-bar' }, h('i', { style: { width: (n / items.length * 100) + '%' } })),
      h('ul', { class: 'quest' }, items.map((x) => h('li', { class: x.done ? 'done' : x.warn ? 'warn' : '', onclick: go(x.tab), role: 'button', tabindex: 0,
        onkeydown: (e) => { if (e.key === 'Enter') go(x.tab)(); } },
        h('span', { class: 'qk', 'aria-hidden': 'true' }, x.done ? '✓' : x.warn ? '!' : ''),
        h('span', { class: 'qt' }, x.text, h('span', { class: 'qs' }, x.sub)),
        h('span', { class: 'qgo' }, x.go + ' →')))),
      h('p', { class: 'small muted', style: { marginTop: '10px' } }, n === items.length ? '準備ばっちり！ 右の「この計画で1年を始める」を押そう。' : 'チェックがそろったら、右の「この計画で1年を始める」を押そう。'));
  }
  function meterCard(st, pv) {
    const pl = pv.pl;
    const income = ACC.ownerIncome(st, pl);
    const left = st.corp ? pl.preTax - pv.tax.amount : pl.preTax - pv.tax.amount - st.living;
    const short = D.SEASONS.filter((s) => pv.labor.seasons[s].ratio > 0.01);
    const m = (cls, face, label, value, note) => h('div', { class: 'meter ' + cls }, h('span', { class: 'mf', 'aria-hidden': 'true' }, face), h('span', { class: 'ml' }, label), h('span', { class: 'mv' }, value), h('span', { class: 'mn' }, note));
    return UI.card('🔮 今年の見込み', '平年並みの天気・予想米価の場合',
      h('div', { class: 'meters' },
        m(income > 3000000 ? 'good' : income > 0 ? 'warn' : 'bad', income > 3000000 ? '😄' : income > 0 ? '🙂' : '😟', st.corp ? 'もうけ（税引前利益）' : 'もうけ（農業所得）', U.man(income), '売上 ' + U.man(pl.sales) + ' − 経費'),
        m(left >= 0 ? 'good' : 'bad', left >= 0 ? '👛' : '💸', '手元に残るお金', U.man(left), st.corp ? '税金を払ったあと' : '家計費と税金を払ったあと'),
        m(pv.cash.minBalance >= 500000 ? 'good' : pv.cash.minBalance >= 0 ? 'warn' : 'bad', pv.cash.minBalance >= 0 ? '🏦' : '🚨', 'お金がいちばん少ない月', pv.cash.minMonth + '月 ' + U.man(pv.cash.minBalance), pv.cash.minBalance >= 0 ? '1年もちそう' : '借入でしのぐ必要あり'),
        m(short.length ? 'bad' : 'good', short.length ? '😓' : '💪', '人手', short.length ? short.map((s) => D.SEASON_SHORT[s]).join('・') + 'が不足' : '足りている', short.length ? '刈り遅れなどで収量が落ちる' : '作業は間に合いそう'),
        m('good', '🌾', '収穫の見込み', U.bales(pv.production.totalBales), '10aあたり ' + U.num(pv.production.yieldPer10a) + 'kg')));
  }

  function tabOverview(app, st, pv) {
    const bs = ACC.bs(st);
    const area = U.sum(st.fields, (f) => f.area), owned = U.sum(st.fields.filter((f) => f.owned), (f) => f.area);
    const w = st.world;
    const dl = RG.pressure ? RG.pressure.active(st) : [];
    const deadlineBox = dl.length ? h('div', { class: 'deadline-box' }, dl.map((x) => { const d = RG.pressure.def(x.id);
      return h('div', { class: 'dl' }, h('span', { class: 'dl-ic', 'aria-hidden': 'true' }, '⏳'), h('div', null, h('b', null, d.icon + ' ' + d.title + '　' + (x.until === st.year ? '今年が期限！' : '期限まであと' + (x.until - st.year + 1) + '年（' + x.until + '年目の決算まで）')),
        h('div', { class: 'small' }, '目標：' + d.goalText + '。達成できなければ経営終了')));
    })) : null;
    const out = [homeHero(st), deadlineBox, RG.scenes.isStory(st) ? RG.screens.promiseCard(st, { progress: true }) : null, questCard(app, st, pv), RG.chapters.on(st) ? RG.screens.missionsCard(app, st) : null, RG.screens.unlocksCard(app, st), meterCard(st, pv)];
    out.push(UI.card('今年のニュース', null, h('div', { class: 'notes' }, st.news.map((n) => UI.note(n.kind === 'event' ? 'info' : n.kind, null, n.text)))));
    if (st.lastResult) {
      let adv = st.lastResult.nextAdvice;
      if (!adv) { try { adv = RG.advisor.nextYear(st, st.lastResult); } catch (e) { adv = null; } }
      if (adv && adv.length) out.push(UI.card(UI.whoTitle('takahashi', RG.advisor.NAME + 'からのアドバイス'), '昨年の決算より', RG.screens.adviceList(adv, app, '今年やること')));
    }
    out.push(milestoneCard(st));
    out.push(RG.screens.rivalsCard(st));
    out.push(UI.card('経営の状況', null, h('div', { class: 'kpis' },
      UI.kpi('資金', U.man(st.cash), 'つなぎ資金 ' + U.man(st.emergency || 0), st.cash < 500000 ? 'warn' : ''),
      UI.kpi('借入残高', U.man(bs.longLoans + bs.emergency), '借入可能額 ' + U.man(SIM.loanCapacity(st))),
      UI.kpi('純資産', U.man(bs.equity), h('span', null, T('自己資本比率'), ' ' + U.pct(bs.equityRatio)), bs.equity < 0 ? 'bad' : ''),
      UI.kpi('経営面積', U.ha(area), '所有 ' + U.ha(owned) + '・借地 ' + U.ha(area - owned)),
      UI.kpi('直販の顧客', U.num(st.direct.customers) + '人', h('span', null, T('ブランド力'), ' ' + U.num(st.brand))),
      UI.kpi('地域の信頼', U.num(st.trust), h('span', null, T('地域の信頼', '信頼'), 'が高いと良い農地の話が来る')),
      UI.kpi('技術力', U.num(st.skill * 100), h('span', null, T('技術力'), '（100が標準）')),
      UI.kpi('家族・社員', st.family.length + '人・' + st.staff.length + '人', 'パート ' + st.partTimers + '人'),
      UI.kpi('持ち物', '🧧' + st.items.omamori + '・🎟️' + st.items.reroll, 'お守り・振り直し券'))));
    const mh = st.market.history;
    out.push(UI.card('米価の見通し', '60kg（1俵）あたり',
      h('div', { class: 'kpis' },
        UI.kpi('今年の予想', U.yen(w.forecast), U.num(w.forecastLow) + '〜' + U.num(w.forecastHigh) + '円'),
        UI.kpi('昨年の実績', mh.length ? U.yen(mh[mh.length - 1].price) : U.yen(st.market.price), mh.length ? '作況指数 ' + mh[mh.length - 1].index.toFixed(0) : 'R8年産 コシヒカリ概算金'),
        UI.kpi('飼料用米の交付金', U.pct(st.market.feedSubsidyMult), '基準に対する水準')),
      mh.length && mh[mh.length - 1].reason ? h('p', { class: 'small', style: { marginTop: '8px' } }, h('b', null, '昨年の', T('米の需給'), '：'), mh[mh.length - 1].reason) : null,
      h('p', { class: 'small muted' }, '今年の米価は、収穫の年の米の需給（全国の作柄・在庫）で決まります。契約栽培の価格も同じように動きます。'),
      mh.length >= 2 ? RG.chart.line({ labels: mh.map((x) => x.year + '年'), series: [{ name: '米価（円/60kg）', values: mh.map((x) => x.price) }],
        fmt: (v) => U.num(v), tipFmt: (v) => U.yen(v), zero: false, height: 160 }) : null));
    const hs = st.history;
    if (hs.length) {
      const last = hs[hs.length - 1];
      out.push(UI.card('昨年の結果', null, h('div', { class: 'kpis' },
        UI.kpi('売上高', U.man(last.sales)), UI.kpi((last.corp != null ? last.corp : st.corp) ? '税引前利益＋役員報酬' : '農業所得', U.man(last.income), null, last.income < 0 ? 'bad' : ''),
        UI.kpi('10aあたり収量', U.num(last.yieldPer10a) + 'kg', '1等比率 ' + U.pct(last.r1)),
        UI.kpi('60kgあたり生産費', U.yen(last.costPer60), '米価 ' + U.yen(last.price))),
        h('p', { class: 'small' }, UI.btn('昨年の決算書を見る', () => RG.screens.showLastResult(app), 'sm'))));
    }
    if (hs.length >= 2) {
      const labels = hs.map((x) => x.year + '年');
      out.push(h('div', { class: 'grid2' },
        UI.card('売上と所得の推移', null, RG.chart.line({ labels, series: [{ name: '売上高', values: hs.map((x) => x.sales) }, { name: hs.some((x) => x.corp) ? '所得（個人の年は農業所得、法人の年は税引前利益＋役員報酬）' : '農業所得', values: hs.map((x) => x.income) }] })),
        UI.card('純資産と借入の推移', null, RG.chart.line({ labels, series: [{ name: '純資産', values: hs.map((x) => x.equity) }, { name: '借入残高', values: hs.map((x) => x.debt), cls: 'c4' }, { name: '年末の資金', values: hs.map((x) => x.cashEnd), cls: 'c3' }] }))));
    }
    out.push(UI.card('20年後の評価', null, h('p', { class: 'small' }, '純資産の増加・家族（経営者）の所得・', T('自己資本比率'), '・経営面積・地域の信頼・ブランド力で評価されます。資金がショートして融資枠を超えるか、3年続けて', T('債務超過'), 'になると経営終了です。')));
    return h('div', { class: 'stack' }, out);
  }

  // 来年に向けてのアドバイス一覧。app を渡すと、該当するタブへ移るボタンを付ける
  RG.screens.adviceList = function (items, app, heading) {
    if (!items || !items.length) return null;
    return h('div', { class: 'advice' },
      h('h4', null, heading || '来年に向けて'),
      h('ol', null, items.map((a) => h('li', null,
        h('b', null, a.title), '：', a.text, ' ',
        a.tab ? (app ? UI.btn(RG.advisor.TAB_NAMES[a.tab] + 'タブへ', () => { app.tab = a.tab; app.render(); }, 'sm ghost')
          : h('span', { class: 'badge info' }, '→ ' + RG.advisor.TAB_NAMES[a.tab])) : null))));
  };

  // これからの山場（5年以内の節目）
  function milestoneCard(st) {
    const ms = RG.outlook.milestones(st, 5);
    const cost10 = RG.outlook.replacementCost(st, 10);
    const op = S.operator(st), sc = S.successor(st);
    return UI.card('これからの山場', '5年以内',
      ms.length ? h('div', { class: 'notes' }, ms.map((m) => UI.note(m.level, m.year === st.year ? '今年' : m.year + '年目（' + (m.year - st.year) + '年後）', m.text)))
        : h('p', { class: 'muted' }, '5年以内に大きな節目はありません。'),
      h('div', { class: 'kpis', style: { marginTop: '10px' } },
        UI.kpi(h('span', null, '10年以内の', T('機械の寿命', '機械の買い替え')), U.man(cost10), '今の資金 ' + U.man(st.cash), cost10 > st.cash + SIM.loanCapacity(st) ? 'warn' : ''),
        op && op.age != null ? UI.kpi('経営主の年齢', op.age + '歳', D.AGING.retire + '歳で引退まで ' + Math.max(0, D.AGING.retire - op.age) + '年') : null,
        UI.kpi(h('span', null, T('経営継承', '後継者')), sc ? sc.name + '（' + sc.age + '歳）' : st.custom && st.custom.successor === 'plan' && !st.events.seen.successor_join ? '就農予定' : 'いない', null, sc ? 'good' : ''),
        UI.kpi('家族が働ける時間', U.num(U.sum(st.family, (f) => S.effHours(f))) + 'h', '年齢を考えた1年の合計')));
  }

  // ---------- 作付計画 ----------
  function cropOptions(st) {
    return D.CROP_ORDER.filter((k) => k !== 'none' && (!D.CROPS[k].unlock || st.flags[D.CROPS[k].unlock]) && !(RG.era && RG.era.cropLocked(st, k)))
      .map((k) => ({ value: k, label: D.cropIcon(k) + ' ' + D.CROPS[k].name + '［' + AG.maturityLabel(D.CROPS[k]) + '］' }));
  }
  function tabCrops(app, st, pv) {
    const crops = cropOptions(st);
    // ストーリーでまだ使えない栽培方法・植え方は出さない
    const fl = (k) => RG.era && RG.era.featLocked(st, k === 'direct' ? 'directSow' : k);
    const cults = D.CULT_ORDER.filter((k) => !fl(k)).map((k) => ({ value: k, label: D.CULTS[k].short }));
    const sows = Object.keys(D.SOWS).filter((k) => !fl(k)).map((k) => ({ value: k, label: D.SOWS[k].short }));
    const total = S.totalArea(st);
    const fallow = Math.max(0, U.round(total - S.plannedArea(st), 1));
    const byRow = {};
    pv.production.plots.forEach((p) => {
      const x = byRow[p.rowId] || (byRow[p.rowId] = { bales: 0, area: 0, r1w: 0, late: 0, timing: p.timing, timingCls: p.timingCls });
      x.bales += p.bales; x.area += p.area; x.r1w += p.r1 * p.bales; x.late = Math.max(x.late, p.late);
    });
    const rows = st.plan.map((r) => {
      const set = (k) => (v) => app.update((s) => { s.plan.find((x) => x.id === r.id)[k] = v; });
      const p = byRow[r.id];
      const v = D.CROPS[r.crop];
      const maxArea = U.round(r.area + fallow, 1);
      const shifts = D.PLANT_SHIFTS.map((x) => ({ value: String(x.v), label: x.label + '（' + AG.fmt(AG.plantMid(v, x.v)) + '）' }));
      return [
        UI.select(crops, r.crop, set('crop'), { 'aria-label': '品種', class: 'sel-crop' }),
        { v: h('span', { class: 'row', style: { flexWrap: 'nowrap', justifyContent: 'flex-start' } },
          UI.numInput({ value: r.area, min: 0, max: maxArea, step: 0.1, width: 64, suffix: 'ha', label: v.name + 'の面積',
            onChange: (x) => app.update((s) => A.setRowArea(s, r.id, x)) }),
          fallow > 0.05 ? UI.btn('＋残り', () => app.update((s) => A.setRowArea(s, r.id, maxArea)), 'sm', { title: '休耕の ' + U.ha(fallow) + ' をこの作付に回す' }) : null), cls: 'area-cell' },
        h('div', { class: 'sel-stack' }, UI.select(cults, r.cult, set('cult'), { 'aria-label': v.name + 'の栽培方法' }),
          UI.select(sows, r.sow, set('sow'), { 'aria-label': v.name + 'の植え方' })),
        h('span', null, UI.select(shifts, String(r.plant || 0), (x) => app.update((s) => { s.plan.find((y) => y.id === r.id).plant = +x; }), { 'aria-label': v.name + 'の田植え時期' }),
          p && p.timingCls !== 'good' ? h('div', { class: 'small ' + (p.timingCls === 'bad' ? 'neg' : 'muted') }, p.timing) : null),
        { v: p && p.area > 0 ? h('span', null, U.bales(p.bales), h('div', { class: 'small muted' }, '10a ' + U.num((p.bales * 60) / (p.area * 10)) + 'kg' + (v.market ? '・1等 ' + U.pct(p.r1w / Math.max(1e-9, p.bales)) : ''))) : '—', cls: 'num' },
        UI.btn('×', () => app.update((s) => A.removeRow(s, r.id)), 'sm danger', { 'aria-label': v.name + 'の作付を削除', title: '削除' }),
      ];
    });
    const bar = h('div', { class: 'alloc-bar', role: 'img', 'aria-label': '作付面積の配分' },
      st.plan.filter((r) => r.area > 0).map((r, i) => h('span', { class: 'c' + ((i % 5) + 1), style: { width: (r.area / total) * 100 + '%' }, title: D.CROPS[r.crop].name + ' ' + U.ha(r.area) })),
      fallow > 0.05 ? h('span', { class: 'fallow', style: { width: (fallow / total) * 100 + '%' }, title: '休耕 ' + U.ha(fallow) }) : null);
    const org = SIM.organicStatus(st);
    const plist = pv.production.products;
    // 作付の型（1〜2年目と、田がまだ空いているとき）
    const showPresets = st.year <= 2 || S.plannedArea(st) < total * 0.5;
    const presets = showPresets ? UI.card('🎯 作付の型を選ぶ', '選んだあと、下の表で1行ずつ直せます',
      h('div', { class: 'preset-cards' }, S.CROP_PRESETS.filter((x) => x.id !== 'starter' || st.starter).map((x) => {
        // ストーリーで、型の品種がまだ作れないときは選べない
        const lockedCrops = (x.mix || []).filter((m) => RG.era && RG.era.cropLocked(st, m[0])).map((m) => D.CROPS[m[0]].name)
          .concat((x.mix || []).some((m) => RG.era && RG.era.featLocked(st, m[1])) ? [D.CULTS.special.name] : []);
        return h('button', { type: 'button', class: 'preset-card' + (lockedCrops.length ? ' locked' : ''), disabled: lockedCrops.length > 0,
          onclick: () => app.update((s) => S.applyCropPreset(s, x.id), { msg: '「' + x.name + '」で作付を決めました' }) },
          h('span', { class: 'pc-ic', 'aria-hidden': 'true' }, lockedCrops.length ? '🔒' : x.icon), h('b', null, x.name), h('span', { class: 'pc-d' }, x.desc),
          x.mix ? h('span', { class: 'pc-mix' }, x.mix.map((m) => D.cropIcon(m[0]) + D.CROPS[m[0]].name.replace(/（.*）/, '') + ' ' + Math.round(m[2] * 100) + '%').join('・')) : null,
          lockedCrops.length ? h('span', { class: 'pc-lock' }, lockedCrops.join('・') + 'が作れるようになると選べます') : null);
      }))) : null;
    const emptyNote = st.plan.length === 0 || S.plannedArea(st) < 0.05
      ? UI.note('warn', '田んぼがまだ空っぽです', '上の「作付の型」から選ぶか、下の「＋ 品種を追加」で、作る品種と面積を決めましょう。') : null;
    return h('div', { class: 'stack' },
      presets,
      emptyNote,
      UI.card('品種ごとの作付', '経営面積 ' + U.ha(total) + '（作付 ' + U.ha(total - fallow) + '・休耕 ' + U.ha(fallow) + '）',
        bar,
        UI.table([{ label: '品種［早晩性］' }, { label: '面積' }, { label: '栽培・植え方' }, { label: '田植え時期' }, { label: '見込み（平年作）', num: true }, { label: '' }], rows, { cls: 'crop-tbl' }),
        h('p', { class: 'small muted keep', style: { margin: '6px 0 0' } }, '面積の －＋ は、押しっぱなしにすると続けて動きます（だんだん速くなります）。'),
        h('div', { class: 'row', style: { marginTop: '10px' } },
          UI.btn('＋ 品種を追加', () => app.update((s) => A.addRow(s)), 'sm primary'),
          h('span', { class: 'small muted' }, '同じ品種でも、栽培方法・植え方・田植え時期を変えて別の行にできます。')),
        h('div', { class: 'notes', style: { marginTop: '10px' } },
          fallow > 0.05 ? UI.note('warn', null, U.ha(fallow) + ' が休耕になっています。地代・水利費はかかり続けます。「＋残り」でどれかの作付に回しましょう。') : null,
          org.cert + org.trans > 0 ? UI.note('info', null, h('span', null, T('有機栽培'), '：有機として売れる面積 ' + U.ha(org.cert) + '・転換期間中 ' + U.ha(org.trans) + '。2年続けて有機で作った面積までが「有機」になります。')) : null),
        h('p', { class: 'small muted' }, '田んぼの条件（良・普通・不利）の違いは、経営全体の平均として収量と作業時間に反映されます。見込みは長い目で見た平均の気象（猛暑年や多雨年も含む）での値です。')),
      inputsCard(app, st),
      scheduleCard(st, pv),
      UI.card('品目ごとの見込み', '平年作の場合',
        UI.table([{ label: '品目' }, { label: '面積', num: true }, { label: '見込み収量', num: true }, { label: T('1等比率'), num: true }],
          plist.map((p) => [p.label, { v: U.ha(p.area), cls: 'num' }, { v: U.bales(p.bales), cls: 'num' }, { v: D.CROPS[p.crop].market ? U.pct(p.r1) : '—', cls: 'num' }]))),
      varietyCards(st),
      h('details', { class: 'more', style: { marginTop: '10px' } }, h('summary', null, '栽培方法・植え方の説明'),
        h('div', { class: 'stack', style: { marginTop: '6px' } },
          D.CULT_ORDER.map((k) => h('div', { class: 'small' }, h('b', null, D.CULTS[k].name + '：'), D.CULTS[k].desc)),
          Object.keys(D.SOWS).map((k) => h('div', { class: 'small' }, h('b', null, D.SOWS[k].name + '：'), D.SOWS[k].desc)),
          h('div', { class: 'small' }, '用語：', T('特別栽培'), '・', T('有機栽培'), '・', T('直播'), '・', T('飼料用米'), '・', T('1等比率')))));
  }

  // 収穫スケジュール（平年）：収穫日の早い順に自前のコンバインで刈る。重なると刈り遅れになる
  function scheduleCard(st, pv) {
    const plots = pv.production.plots.slice().sort((a, b) => a.hd - b.hd);
    if (!plots.length) return null;
    const M = pv.machines.combine;
    const lo = AG.doy(8, 1), hi = AG.doy(11, 10), span = hi - lo;
    const pos = (d) => U.clamp(((d - lo) / span) * 100, 0, 100);
    const ticks = [[8, 1], [8, 15], [9, 1], [9, 15], [10, 1], [10, 15], [11, 1]];
    const timeline = h('div', { class: 'tl' },
      h('div', { class: 'tl-axis' }, ticks.map((t) => h('span', { style: { left: pos(AG.doy(t[0], t[1])) + '%' } }, t[0] + '/' + t[1]))),
      plots.map((p) => h('div', { class: 'tl-row' },
        h('div', { class: 'tl-label', title: p.name }, p.name),
        h('div', { class: 'tl-track' },
          h('span', { class: 'tl-ok', style: { left: pos(p.hd) + '%', width: Math.max(0.8, pos(p.hd + D.AGRO.harvestGrace * 2) - pos(p.hd)) + '%' }, title: '刈り取り適期 ' + AG.fmt(p.hd) + '〜' }),
          h('span', { class: 'tl-bar c' + ((Math.max(0, st.plan.filter((r) => r.area > 0).findIndex((r) => r.id === p.rowId)) % 5) + 1) + (p.late > 3 ? ' late' : ''), style: { left: pos(p.hStart) + '%', width: Math.max(0.8, pos(p.hEnd) - pos(p.hStart)) + '%' },
            title: '刈り取り ' + AG.fmt(p.hStart) + '〜' + AG.fmt(p.hEnd) })))));
    const rows = plots.map((p) => [p.name, AG.fmt(p.plant), AG.fmt(p.hd), AG.fmt(p.hStart) + '〜' + AG.fmt(p.hEnd),
      { v: p.late > 0.5 ? U.num(p.late, 1) + '日' : '—', cls: 'num ' + (p.late > 3 ? 'neg' : '') }]);
    const worst = plots.reduce((a, b) => (b.late > a.late ? b : a), plots[0]);
    return UI.card('収穫スケジュール', '平年の見込み・自分のコンバイン能力 ' + U.ha(M.cap) + '（委託分は適期に刈れるものとする）',
      timeline,
      UI.table([{ label: '作付' }, { label: '田植え' }, { label: '刈り取り適期' }, { label: '自分で刈る期間' }, { label: '刈り遅れ', num: true }], rows),
      h('div', { class: 'notes', style: { marginTop: '8px' } },
        worst.late > 3 ? UI.note('warn', null, h('span', null, worst.name + 'は稲刈りが集中して平均 ' + U.num(worst.late, 1) + '日の刈り遅れ見込み。胴割れや品質低下につながります。早生・晩生を組み合わせる（', T('作期分散'), '）、田植え時期をずらす、コンバインを増やすなどで分散しましょう。'))
          : UI.note('good', null, h('span', null, '稲刈りは適期におさまる見込みです。', T('作期分散'), 'ができています。')),
        h('p', { class: 'small muted' }, '収穫日は品種ごとの登熟日数と', T('有効積算温度'), 'で決まり、猛暑年は早まり、冷夏は遅れます。秋雨で作業できない日（稼働率 ' + U.pct(D.AGRO.harvestWorkRate) + '）も見込んでいます。')));
  }

  // 使う肥料・農薬：高い・安いと、効き目
  function inputsCard(app, st) {
    const FW = RG.fieldwork;
    if (!FW) return null;
    const CS = D.COST.cstSplit, mInf = st.market.matInfl;
    // 標準の資材を使ったときの今年の費用（作付の行から）
    const base = (kind) => U.sum(st.plan.filter((r) => r.crop !== 'none'), (r) => r.area * 10 * D.CROPS[r.crop].cst * CS[kind] * D.CULTS[r.cult][kind]) * mInf;
    const group = (kind) => {
      const def = FW.INPUTS[kind], cur = FW.input(st, kind), b = base(kind);
      return h('div', { class: 'input-group' },
        h('h4', null, def.icon + ' ' + def.name + '（標準なら今年 ' + U.man(b) + '）'),
        h('div', { class: 'radio-cards' }, def.options.map((o) => {
          const diff = b * (o.cost - 1);
          return h('button', { type: 'button', class: 'radio-card' + (cur.key === o.key ? ' on' : ''), 'aria-pressed': cur.key === o.key ? 'true' : 'false',
            onclick: () => app.update((t) => FW.setInput(t, kind, o.key), { msg: def.name + 'を「' + o.label + '」にしました' }) },
            h('div', { class: 't' }, o.label),
            h('div', { class: 'small ' + (diff > 1 ? 'neg' : diff < -1 ? 'pos' : '') }, Math.abs(diff) > 1 ? '今年 ' + (diff > 0 ? '+' : '−') + U.man(Math.abs(diff)) : '費用はそのまま'),
            h('div', { class: 'small muted' }, o.desc));
        })));
    };
    return UI.card('🧪 使う肥料・農薬', '高いものは効き目がよく、安いものは費用が下がる。すべての田んぼで使う',
      group('fert'), group('pest'),
      h('p', { class: 'small muted' }, '農薬の違いは、病気や害虫が出た年に大きく効きます（平年作の見通しには出ません）。特別栽培・有機栽培の田では、もともと使う量が少ないので、費用の差も小さくなります。'));
  }

  function varietyCards(st) {
    const list = D.CROP_ORDER.filter((k) => k !== 'none' && !D.CROPS[k].alias);
    const isLocked = (k) => (D.CROPS[k].unlock && !st.flags[D.CROPS[k].unlock]) || (RG.era && RG.era.cropLocked(st, k));
    const open = list.filter((k) => !isLocked(k)).length;
    return UI.card('品種の特徴', st.cropsOpen ? '作れる品種 ' + open + ' / ' + list.length + '。🔒 の品種は、きっかけを満たすと作れるようになります' : '新潟県の主な品種（参考：新潟 水稲栽培シミュレーター）', h('div', { class: 'grid3' }, list.map((k) => {
      const c = D.CROPS[k];
      const locked = c.unlock && !st.flags[c.unlock];
      const hint = RG.era ? RG.era.cropHint(st, k) : null;
      const pm = AG.plantMid(c, 0);
      const tol = ['ht', 'ft', 'ct', 'sp'].map((t) => h('span', { class: 'badge ' + (c[t] >= 0.6 ? 'good' : c[t] < 0.4 ? 'bad' : '') }, D.TOL_NAMES[t] + ' ' + AG.tolLabel(c[t])));
      return h('div', { class: 'offer' + (hint || (locked && st.cropsOpen) ? ' crop-locked' : '') },
        h('div', { class: 't' }, c.name, ' ', h('span', { class: 'badge info' }, AG.maturityLabel(c)), ' ', h('span', { class: 'badge' }, c.kind),
          c.estimated ? h('span', { class: 'badge warn', title: '参考ファイルに無い品種のため、ゲーム用の推定値です' }, '推定値') : null,
          locked ? h('span', { class: 'badge warn' }, '生産者登録が必要') : null, hint ? h('span', { class: 'badge warn' }, '🔒 まだ作れない') : null),
        hint ? h('div', { class: 'crop-hint' }, '🔓 きっかけ：' + hint) : locked && st.cropsOpen ? h('div', { class: 'crop-hint' }, '🔓 きっかけ：1等米の割合80%以上の年を出すと、JAから生産者登録の話が来る') : null,
        h('div', { class: 'small' }, '平年単収 ' + c.by + 'kg/10a・' + (c.market ? '1等 ' + U.yen(c.pr) + '/60kg（R8概算金）' : '販売 ' + U.yen(c.pr) + '/60kg＋交付金')),
        h('div', { class: 'small muted' }, '田植え適期 ' + c.bS.join('/') + '〜' + c.bE.join('/') + '・収穫 ' + AG.fmt(AG.harvestDoy(c, pm, 0)) + '頃（平年）・変動費 ' + U.yen(c.cst) + '/10a'),
        h('div', { class: 'row', style: { gap: '4px' } }, tol),
        h('div', { class: 'small muted' }, c.desc));
    })));
  }

  // ---------- 農地 ----------
  function tabLand(app, st, pv) {
    const area = U.sum(st.fields, (f) => f.area), owned = U.sum(st.fields.filter((f) => f.owned), (f) => f.area);
    const rent = U.sum(st.fields.filter((f) => !f.owned), (f) => f.area * 10 * f.rent);
    const offers = st.offers.land.map((o) => {
      const soil = D.SOILS[o.soil];
      return h('div', { class: 'offer' },
        h('div', { class: 't' }, o.place + '地区の田 ' + U.ha(o.area), ' ', h('span', { class: 'badge ' + (o.soil === 'poor' ? 'warn' : o.soil === 'good' ? 'good' : '') }, soil.short)),
        h('div', { class: 'small' }, o.owner + '：' + o.reason + '。' + (o.buy ? '買ってほしい。' : '借りてほしい。')),
        h('div', { class: 'small muted' }, soil.name + '（収量 ' + U.pct(soil.yieldMult) + '・手間 ' + U.pct(soil.laborMult) + '）'),
        o.buy ? h('div', null, '購入価格 ', h('b', null, U.man(o.price)), h('span', { class: 'muted small' }, '（10aあたり ' + U.man(o.price10a) + '）'))
          : h('div', null, '地代 ', h('b', null, U.yen(o.rent) + '/10a'), h('span', { class: 'muted small' }, '（年 ' + U.man(o.rent * o.area * 10) + '）')),
        h('div', { class: 'row' }, o.buy
          ? [UI.btn('現金で購入', () => app.update((s) => A.acceptLand(s, o.id, 'cash'), { undo: true, msg: '農地を購入しました' }), 'sm primary', { disabled: st.cash < o.price }),
            UI.btn('借入で購入', () => app.update((s) => A.acceptLand(s, o.id, 'loan'), { undo: true, msg: '借入で農地を購入しました' }), 'sm')]
          : UI.btn('借りる', () => app.update((s) => A.acceptLand(s, o.id), { undo: true, msg: '農地を借りました' }), 'sm primary')));
    });
    const rows = st.fields.map((f) => [
      f.name, { v: U.ha(f.area), cls: 'num' }, D.SOILS[f.soil].short,
      f.owned ? h('span', { class: 'badge info' }, '所有') : '借地',
      { v: f.owned ? h('span', null, '評価額 ' + U.man(f.landValue), h('div', { class: 'small muted' }, '売ると約 ' + U.man(A.landSalePrice(f)))) : U.yen(f.rent) + '/10a', cls: 'num' },
      f.owned ? UI.btn('売却', async () => {
        const lk = A.landSaleLocked(st);
        if (lk) { UI.toast(lk, 'bad'); return; }
        const p = A.landSalePenalty(st, f);
        const body = h('div', { class: 'notes' },
          UI.note('info', null, f.name + '（' + U.ha(f.area) + '）を ' + U.man(A.landSalePrice(f)) + ' で売却します。' + (f.soil === 'poor' ? '条件不利地は買い手が少なく、評価額の6割ほどでしか売れません。' : '')),
          UI.note('bad', '売ると失うもの', h('ul', { class: 'loss-list' },
            h('li', null, '地域の信頼 −' + p.trust + (f.heritage ? '（先祖代々の田を手放すため、特に大きい）' : '')),
            h('li', null, 'これから' + p.ban + '年間、新しい農地の話（借りる・買う）が来なくなる'),
            h('li', null, '経営面積が減り、つなぎ資金の融資枠も約' + U.man(p.credit) + '小さくなる（農地が担保だったため）'),
            p.abandon ? h('li', null, '買った人も山の田は作らず、集落の荒れた田が ' + U.ha(f.area) + ' 増える') : null,
            p.buyer ? h('li', null, '買い手は' + p.buyer + '。ライバルの経営が大きくなる') : null,
            h('li', null, '農地の売却は1年に1枚まで。買い戻すことはできない'))));
        if (await UI.confirm('農地を売却しますか？', body, '売却する', 'primary')) app.update((s) => A.sellLand(s, f.id), { undo: true });
      }, 'sm danger')
        : UI.btn('返す', async () => { if (await UI.confirm('借地を返しますか？', f.name + '（' + U.ha(f.area) + '）を地主に返します。地域の信頼が下がります（−5）。', '返す', 'primary')) app.update((s) => A.returnLand(s, f.id), { undo: true }); }, 'sm danger'),
    ]);
    const lp = st.offers.land.find((o) => o.buy);
    return h('div', { class: 'stack' },
      UI.card('農地の状況', null, h('div', { class: 'kpis' },
        UI.kpi('経営面積', U.ha(area)), UI.kpi('所有地', U.ha(owned)), UI.kpi('借地', U.ha(area - owned)),
        UI.kpi('地代の合計', U.man(rent) + '/年'), UI.kpi(h('span', null, T('地域の信頼')), U.num(st.trust)))),
      UI.card('🤝 地域とのつきあい', '地域の信頼を育てるには、お金と時間がかかる',
        h('div', { class: 'radio-cards' }, D.COMMUNITY.map((c) => h('button', { type: 'button', class: 'radio-card' + ((st.community == null ? 1 : st.community) === c.key ? ' on' : ''),
          'aria-pressed': (st.community == null ? 1 : st.community) === c.key ? 'true' : 'false', onclick: () => app.update((s) => { s.community = c.key; }) },
          h('div', { class: 't' }, c.name), h('div', { class: 'small' }, '年' + U.man(c.cost * st.market.matInfl) + (Object.keys(c.h).length ? '・' + Object.keys(c.h).map((k) => D.SEASON_SHORT[k] + c.h[k] + 'h').join(' ') : '')),
          h('div', { class: 'small muted' }, c.desc + '（地域の信頼 ' + (c.trust > 0 ? '+' : '') + c.trust + '/年）')))),
        h('p', { class: 'small muted keep' }, '地域の信頼は、条件不利の田を引き受けたとき・共同作業や行事に出たときに上がり、耕作放棄・約束を守れなかったときに下がります。60を超えると毎年少しずつ、80を超えるともっと下がりやすくなります。')),
      UI.card('農地の話', st.offers.land.length ? '今年だけの話です' : null,
        offers.length ? h('div', { class: 'offers' }, offers) : h('p', { class: 'muted' }, '今年は新しい農地の話はありません。地域の信頼が高まると話が増えます。'),
        h('p', { class: 'small muted' }, '借りた田は、いちばん面積の大きい作付に自動で加わります。配分は「作付計画」で変えられます。',
          lp ? ' 購入の場合、地代を払わずに済む代わりに、購入価格は地代の約' + U.num(lp.price10a / Math.max(1, lp.rent)) + '年分です。' : '')),
      UI.card('田んぼの一覧', null, UI.table([{ label: '田んぼ' }, { label: '面積', num: true }, { label: '条件' }, { label: '区分' }, { label: '地代・評価額', num: true }, { label: '' }], rows)));
  }

  // ---------- 機械・設備 ----------
  const opKey = (t) => D.OP_ORDER.find((k) => D.OPS[k].mtype === t);
  function tabMachines(app, st, pv) {
    const mInf = st.market.matInfl;
    const capRows = ['tractor', 'nursery', 'planter', 'combine', 'dryer'].map((t) => {
      const M = pv.machines[t];
      const op = D.OP_ORDER.map((k) => D.OPS[k]).find((o) => o.mtype === t);
      return [D.MACHINE_TYPES[t].icon + ' ' + D.MACHINE_TYPES[t].name, { v: U.ha(M.need), cls: 'num' }, { v: U.ha(M.cap), cls: 'num' },
        h('div', { class: 'row', style: { flexWrap: 'nowrap' } }, UI.bar(M.need, M.cap), h('span', { class: 'small' }, M.cap > 0 ? U.pct(M.util) : '—')),
        { v: M.contract > 0.01 ? h('span', null, U.ha(pv.labor.ops[opKey(t)].contractArea), pv.labor.ops[opKey(t)].undone > 0.05 ? h('div', { class: 'small neg' }, '委託できない ' + U.ha(pv.labor.ops[opKey(t)].undone)) : null) : '—', cls: 'num' },
        { v: U.man(pv.labor.ops[opKey(t)].fee), cls: 'num' },
        { v: U.man(M.need * 10 * op.fee * mInf), cls: 'num muted' }];
    });
    ['drone', 'smart'].forEach((t) => {
      const M = pv.machines[t];
      capRows.push([D.MACHINE_TYPES[t].icon + ' ' + D.MACHINE_TYPES[t].name, { v: U.ha(M.need), cls: 'num' }, { v: U.ha(M.cap), cls: 'num' },
        h('div', { class: 'row', style: { flexWrap: 'nowrap' } }, UI.bar(Math.min(M.need, M.cap), M.need), h('span', { class: 'small' }, M.need > 0 ? 'カバー率 ' + U.pct(M.own / M.need) : '—')), '—', '—', '—']);
    });
    const bctx = SIM.breakdownCtx(st); // 平年の天候で、今の計画のときの故障の見込み
    const owned = st.machines.map((m) => {
      const md = D.MODELS[m.model];
      const risk = SIM.breakdownRisk(st, m, bctx);
      return [h('span', null, md.name, m.lease ? h('span', { class: 'badge info', style: { marginLeft: '4px' } }, 'リース') : m.used ? h('span', { class: 'badge', style: { marginLeft: '4px' } }, '中古') : null,
        md.cap && risk.factors.length ? h('div', { class: 'bd-why' }, risk.factors.map((x) => h('span', null, '⚠ ' + x.label)))  : null),
        { v: m.age + '年', cls: 'num' },
        { v: m.lease ? '残り' + m.leaseYearsLeft + '年' : U.man(m.book), cls: 'num' },
        { v: m.lease ? U.man(m.leaseFee) + '/年' : U.man(SIM.marketValue(m)), cls: 'num' },
        { v: m.lease ? '込み' : U.man(SIM.repairCost(m, mInf)), cls: 'num' },
        { v: md.cap ? U.pct(risk.p) : '—', cls: 'num ' + (risk.p > 0.1 ? 'neg' : '') },
        UI.btn(m.lease ? '解約' : '売却', async () => {
          const msg = m.lease ? md.name + 'のリースを解約します。中途解約金として1年分のリース料（' + U.man(m.leaseFee) + '）がかかります。'
            : md.name + 'を ' + U.man(SIM.marketValue(m)) + ' で売却します（簿価 ' + U.man(m.book) + '、差額は売却' + (SIM.marketValue(m) >= m.book ? '益' : '損') + 'になります）。';
          if (await UI.confirm(m.lease ? 'リースを解約しますか？' : '機械を売却しますか？', msg, m.lease ? '解約する' : '売却する')) app.update((s) => A.sellMachine(s, m.id), { undo: true });
        }, 'sm danger')];
    });
    const sub = !!st.yearFlags.machineSubsidy;
    // 田植機・コンバインの能力：あなたの田んぼでの見込み（大きな機械ほど、田の条件で上下する）
    const share = SIM.soilShare(st);
    const capCell = (k) => {
      const md = D.MODELS[k];
      if (!md.cap) return '—';
      const mult = SIM.fieldCapMult(st, k, share);
      if (Math.abs(mult - 1) < 0.005) return U.ha(md.cap);
      return h('span', null, U.ha(md.cap), h('div', { class: 'small ' + (mult > 1 ? 'pos' : 'neg') }, (mult > 1 ? '↑' : '↓') + ' あなたの田で ' + U.ha(md.cap * mult)));
    };
    const fieldNote = (t) => (SIM.FIELD_TYPES.indexOf(t) < 0 ? null : h('p', { class: 'small muted keep' },
      '大きな機械ほど、平坦・大区画の田（条件良）では能力が上がり、中山間・小区画の田（条件不利）では落ちます。小さな機械は、どんな田でもあまり変わりません。' +
      'あなたの田は、条件良 ' + U.pct(share.good) + '・条件不利 ' + U.pct(share.poor) + '。'));
    const shop = D.MACHINE_TYPE_ORDER.map((t) => {
      const models = Object.keys(D.MODELS).filter((k) => D.MODELS[k].type === t);
      if (RG.era && RG.era.mtypeLocked(st, t)) {
        const u = RG.era.UNLOCKS.find((x) => x.mtype === t);
        return h('div', { class: 'locked-row' }, h('span', null, D.MACHINE_TYPES[t].icon + ' ' + D.MACHINE_TYPES[t].name), h('span', { class: 'lock' }, RG.era.lockText(st, u.id)));
      }
      return h('details', { class: 'more', open: app.openShop === t, ontoggle: (e) => { if (e.target.open) app.openShop = t; else if (app.openShop === t) app.openShop = null; } },
        h('summary', null, D.MACHINE_TYPES[t].icon + ' ' + D.MACHINE_TYPES[t].name + ' ― ' + D.MACHINE_TYPES[t].role),
        UI.table([{ label: '機種' }, { label: '能力', num: true }, { label: '省力', num: true }, { label: '価格', num: true }, { label: '年間の償却費', num: true }, { label: 'リース料/年', num: true }, { label: '' }],
          models.map((k) => {
            const md = D.MODELS[k];
            const price = A.newPrice(st, k);
            return [md.name, { v: capCell(k), cls: 'num' }, { v: md.cap && md.eff < 1 ? '−' + U.pct(1 - md.eff) : '—', cls: 'num' },
              { v: h('span', null, U.man(price), sub ? h('span', { class: 'badge good', style: { marginLeft: '4px' } }, '補助1/2') : null), cls: 'num' },
              { v: U.man(price / md.life), cls: 'num' }, { v: U.man(md.price * mInf * D.MACHINE.leaseRate), cls: 'num' },
              A.operatorLock(st, k) ? h('span', { class: 'lock small' }, '🧑‍🌾 乗れる人が足りない') : A.machineLock(st, k, 'cash') ? h('span', { class: 'lock small' }, '🔒 経営面積15ha以上で') : h('div', { class: 'row', style: { flexWrap: 'nowrap' } },
                UI.btn('現金', () => app.update((s) => A.buyMachine(s, k, 'cash'), { undo: true, msg: md.name + 'を購入しました' }), 'sm', { disabled: st.cash < price }),
                UI.btn('借入', () => app.update((s) => A.buyMachine(s, k, 'loan'), { undo: true, msg: md.name + 'を借入で購入しました' }), 'sm'),
                A.machineLock(st, k, 'lease') ? null : UI.btn('リース', () => app.update((s) => A.buyMachine(s, k, 'lease'), { undo: true, msg: md.name + 'をリースしました' }), 'sm'))];
          })), fieldNote(t));
    });
    const used = st.offers.used.map((o) => {
      const md = D.MODELS[o.model];
      return h('div', { class: 'offer' }, h('div', { class: 't' }, '中古 ' + md.name), h('div', { class: 'small' }, o.age + '年使用・能力 ' + U.ha(SIM.fieldCap(st, o.model, share)) + '（あなたの田で）・新品価格 ' + U.man(md.price * mInf)),
        h('div', null, '価格 ', h('b', null, U.man(o.price))),
        h('div', { class: 'row' }, UI.btn('現金で購入', () => app.update((s) => A.buyUsed(s, o.id, 'cash'), { undo: true, msg: '中古機械を購入しました' }), 'sm primary', { disabled: st.cash < o.price }),
          UI.btn('借入で購入', () => app.update((s) => A.buyUsed(s, o.id, 'loan'), { undo: true, msg: '中古機械を購入しました' }), 'sm')));
    });
    return h('div', { class: 'stack' },
      UI.card('作業能力と委託', '今年の作付面積に対して',
        UI.table([{ label: '機械' }, { label: '必要面積', num: true }, { label: '自分の能力', num: true }, { label: T('機械稼働率', '稼働率') }, { label: '委託する面積', num: true }, { label: '委託料', num: true }, { label: '全部委託なら', num: true }], capRows),
        h('p', { class: 'small muted' }, '能力を超えた分は自動的に', T('作業委託'), 'になります（委託先が引き受けられるのは作業ごとに約' + U.ha(SIM.contractCap(st)) + 'まで。', T('地域の信頼'), 'が高いほど増えます）。「全部委託なら」と、機械を買った場合の年間の', T('減価償却', '償却費'), '＋修理費を比べてみましょう。')),
      UI.card('🧑‍🌾 機械に乗れる人', '田植機・コンバインは、乗れる人の数まで',
        h('div', { class: 'kpis' }, UI.kpi('乗れる人', S.operators(st) + '人', '自分・正社員・常雇用パート（季節パートは乗れない）'),
          UI.kpi('田植機', SIM.machinesOf(st, 'planter').length + '台', pv.machines.planter.idle ? '乗る人がいなくて ' + pv.machines.planter.idle + '台が動かせない' : null, pv.machines.planter.idle ? 'bad' : ''),
          UI.kpi('コンバイン', SIM.machinesOf(st, 'combine').length + '台', pv.machines.combine.idle ? '乗る人がいなくて ' + pv.machines.combine.idle + '台が動かせない' : null, pv.machines.combine.idle ? 'bad' : ''))),
      UI.card('持っている機械', st.machines.length + '台',
        st.machines.length ? UI.table([{ label: '機械' }, { label: '使用年数', num: true }, { label: T('簿価'), num: true }, { label: '売却額（時価）', num: true }, { label: '修理費見込み', num: true }, { label: '故障率', num: true }, { label: '' }], owned)
          : h('p', { class: 'muted' }, '機械を持っていません。作業はすべて委託しています。'),
        st.machines.length ? h('p', { class: 'small muted' }, '故障率は平年の天候での見込みです。年数のほか、能力いっぱいで酷使する、条件の悪い田が多い、直播の稲が倒れやすいときに上がります。その年に台風や大雨で稲が倒れるとコンバインが、秋雨が続くとコンバインと乾燥機が、さらに壊れやすくなります。') : null),
      RG.era && RG.era.featLocked(st, 'used') ? UI.card('🔧 中古機械の出物', null, h('div', { class: 'locked-card' }, h('span', { class: 'lock-ic', 'aria-hidden': 'true' }, '🔒'), h('div', null, h('b', null, RG.era.lockText(st, 'used').replace('🔒 ', '')))))
        : used.length ? UI.card('中古機械の出物', '今年だけ', h('div', { class: 'offers' }, used)) : null,
      UI.card('機械を導入する', sub ? '補助事業に採択されています（新品1台が半額）' : null,
        h('div', { class: 'stack' }, shop),
        RG.era && (RG.era.featLocked(st, 'lease') || RG.era.featLocked(st, 'large')) ? h('div', { class: 'notes' },
          RG.era.featLocked(st, 'lease') ? UI.note('info', null, '📄 リース：' + RG.era.lockText(st, 'lease')) : null,
          RG.era.featLocked(st, 'large') ? UI.note('info', null, '🚜 大型の機械：' + RG.era.lockText(st, 'large')) : null) : null,
        h('p', { class: 'small muted' }, '借入で購入すると長期資金（10年）を借ります。', T('リース'), 'は修理費込みで7年契約です。', T('耐用年数'), 'は多くの機械で7年です。')));
  }

  // ---------- 労働力 ----------
  // 季節ごとの配分：家族・社員の時間をどの季節にまわすか、季節ごとのパートの人数
  function allocCard(app, st, L) {
    const perSeason = !!st.partSeason;
    const cols = D.SEASONS.map((s) => {
      const x = L.seasons[s], share = S.laborShare(st, s), ok = x.ratio <= 0.01;
      return h('div', { class: 'alloc-col ' + (ok ? 'good' : 'bad') },
        h('div', { class: 'ac-h' }, h('span', { 'aria-hidden': 'true' }, D.SEASON_ICON[s]), ' ', D.SEASON_SHORT[s]),
        h('div', { class: 'ac-l' }, '家族・社員'),
        h('div', { class: 'ac-step' },
          UI.btn('−', () => app.update((t) => S.shiftLabor(t, s, -0.02)), 'sm ac-btn', { 'aria-label': D.SEASON_SHORT[s] + 'の家族・社員の時間を減らす' }),
          h('b', null, Math.round(share * 100) + '%'),
          UI.btn('＋', () => app.update((t) => S.shiftLabor(t, s, 0.02)), 'sm ac-btn', { 'aria-label': D.SEASON_SHORT[s] + 'の家族・社員の時間を増やす' })),
        h('div', { class: 'ac-sub' }, U.num(x.family + x.staff) + 'h'),
        h('div', { class: 'ac-l' }, 'パート（人）'),
        perSeason ? UI.numInput({ value: st.partSeason[s], min: 0, max: 30, width: 52, label: D.SEASON_SHORT[s] + 'のパートの人数',
          onChange: (v) => app.update((t) => S.setPartSeason(t, s, v)) })
          : h('div', { class: 'ac-sub' }, st.partTimers + '人'),
        h('div', { class: 'ac-need' }, '必要 ' + U.num(x.need) + 'h'),
        h('div', { class: 'ac-res' }, ok ? '💪 足りる' : '😓 ' + U.num(x.short) + 'h 不足'));
    });
    return UI.card('🗓️ 季節ごとの配分', '家族・社員が働く時間の割り振りと、季節ごとのパートの人数',
      h('div', { class: 'alloc-grid' }, cols),
      h('div', { class: 'row', style: { marginTop: '10px' } },
        UI.btn('🪄 おまかせ（忙しい季節に寄せる）', () => app.update((t) => S.autoLaborSplit(t, L.need), { msg: '必要な時間に合わせて配分しました' }), 'sm primary'),
        st.laborSplit ? UI.btn('標準に戻す', () => app.update((t) => { t.laborSplit = null; }), 'sm') : null,
        UI.btn(perSeason ? 'パートをどの季節も同じ人数にする' : 'パートを季節ごとに決める', () => app.update((t) => {
          if (t.partSeason) t.partSeason = null; else S.setPartSeason(t, 'spring', t.partTimers);
        }), 'sm')),
      h('p', { class: 'small muted' }, '家族と社員の1年の働ける時間を、どの季節にまわすかを決めます（1つの季節は年間の1割〜4割）。田植えの春と稲刈りの秋に寄せると、冬は休みが増えます。パートは、いちばん多い季節の人数を募集します（募集費は人数分）。'));
  }
  // パート1人の行（名前・年齢・ひとこと・時給・手際）
  let wageNow = 1; // 今の賃金の上がり具合（賃金の上昇 × パートの時給の引き上げ）。tabLabor で決める
  function partRow(p, extra, btn) {
    const sk = p.skill >= 1.12 ? '手際◎' : p.skill >= 1.0 ? '手際○' : p.skill >= 0.88 ? '手際△' : '手際✕';
    return h('div', { class: 'part-row' },
      h('div', { class: 'pr-who' }, h('b', null, p.name), h('span', { class: 'small muted' }, p.age + '歳・' + p.note)),
      h('div', { class: 'pr-num small' }, '時給 ' + U.yen(p.wage * wageNow) + '・' + sk + '（' + U.pct(p.skill) + '）' + (extra ? '・' + extra : '')),
      btn || null);
  }
  function tabLabor(app, st, pv) {
    const L = pv.labor;
    wageNow = st.market.wageInfl * (st.market.partWageBoost || 1);
    const seasonRows = D.SEASONS.map((s) => {
      const x = L.seasons[s];
      return [D.SEASON_ICON[s] + ' ' + D.SEASON_NAMES[s], { v: U.num(x.need) + 'h', cls: 'num' }, { v: U.num(x.family) + 'h', cls: 'num' }, { v: U.num(x.staff) + 'h', cls: 'num' },
        { v: U.num(x.part) + 'h', cls: 'num' }, { v: x.short > 0.5 ? U.num(x.short) + 'h' : '—', cls: 'num ' + (x.short > 0.5 ? 'neg' : '') },
        x.ratio > 0.01 ? h('span', { class: 'badge bad' }, '不足 ' + U.pct(x.ratio)) : h('span', { class: 'badge good' }, '十分')];
    });
    const opRows = D.OP_ORDER.filter((k) => L.ops[k].hours > 0.5 || L.ops[k].contractArea > 0.01).map((k) => {
      const o = L.ops[k];
      return [o.name, D.SEASON_SHORT[o.season], { v: U.num(o.hours) + 'h', cls: 'num' }, { v: o.contractArea > 0.01 ? U.ha(o.contractArea) : '—', cls: 'num' }];
    });
    if (L.directLabor > 0) opRows.push(['直販の精米・発送', '通年', { v: U.num(L.directLabor) + 'h', cls: 'num' }, '—']);
    const staffCost = D.LABOR.staffSalary * st.market.wageInfl * (1 + D.LABOR.staffSocial);
    return h('div', { class: 'stack' },
      UI.card('季節ごとの労働バランス', '必要な時間と働ける時間',
        h('div', { class: 'season-gauges' }, D.SEASONS.map((s) => {
          const x = L.seasons[s], have = x.need - x.short, ok = x.ratio <= 0.01;
          return h('div', { class: 'sg ' + (ok ? 'good' : 'bad') },
            h('div', { class: 'sg-ic', 'aria-hidden': 'true' }, D.SEASON_ICON[s]), h('div', { class: 'sg-n' }, D.SEASON_SHORT[s]),
            h('div', { class: 'sg-bar' }, h('i', { style: { width: (x.need > 0 ? Math.min(100, have / x.need * 100) : 100) + '%' } })),
            h('div', { class: 'sg-v' }, ok ? '💪 足りる' : '😓 ' + U.num(x.short) + 'h 不足'));
        })),
        UI.table([{ label: '季節' }, { label: '必要', num: true }, { label: '家族', num: true }, { label: '社員', num: true }, { label: 'パート上限', num: true }, { label: '不足', num: true }, { label: '' }], seasonRows),
        h('div', { class: 'kpis', style: { marginTop: '10px' } },
          UI.kpi('年間の労働時間', U.num(L.totalHours) + 'h'), UI.kpi('10aあたり', U.num(L.hoursPer10a, 1) + 'h', '機械が大きいほど短くなる'),
          UI.kpi('パートの見込み', U.num(L.partHours) + 'h', U.man(L.partCost) + '（時給 ' + U.yen(L.partWage) + '）'))),
      allocCard(app, st, L),
      RG.screens.workPlanCard(app, st),
      UI.card('作業ごとの時間', null, UI.table([{ label: '作業' }, { label: '季節' }, { label: '時間', num: true }, { label: '委託面積', num: true }], opRows)),
      h('div', { class: 'grid2' },
        UI.card('家族', null, UI.table(null, st.family.map((f) => [f.name, h('span', { class: 'muted' }, f.role + (f.age != null ? '・' + f.age + '歳' : '')),
          { v: S.effHours(f) < f.hours - 0.5 ? h('span', null, U.num(S.effHours(f)) + 'h/年', h('div', { class: 'small muted' }, '年齢で減少（本来 ' + U.num(f.hours) + 'h）')) : U.num(f.hours) + 'h/年', cls: 'num' }])),
          h('p', { class: 'small muted' }, '家族の労働には給料を払いませんが、', T('機会費用'), 'があります。決算で「', T('時間当たり所得'), '」を確認しましょう。')),
        UI.card('季節パート', '忙しい季節だけ来てもらう・機械には乗れない',
          st.partSeason ? h('p', { class: 'small' }, '季節ごとに決めています：' + D.SEASONS.map((x) => D.SEASON_SHORT[x] + ' ' + st.partSeason[x] + '人').join('・') + '（上の「季節ごとの配分」で変えられます）')
            : h('div', { class: 'row' }, h('span', null, '人数'), UI.numInput({ value: st.partTimers, min: 0, max: 30, width: 70, suffix: '人', label: 'パートの人数',
              onChange: (v) => app.update((s) => { s.partTimers = Math.round(v); }) })),
          st.partTimers > 0 ? h('div', { class: 'part-list' }, S.seasonParts(st, st.partTimers).map((p) => partRow(p))) : null,
          h('p', { class: 'small muted' }, '今年応募してきた人から、人数ぶん上から順に来てもらいます。時給と手際（働ける量）は人によって違います。1人あたり 春160h・夏100h・秋160h・冬60h まで（手際で増減）。使った時間分の賃金と、募集費 ' + U.yen(D.LABOR.partRecruit) + '/人 がかかります。'))),
      UI.card('常雇用パート', '1年を通して働く・田植機やコンバインにも乗れる',
        (st.regulars || []).length ? h('div', { class: 'part-list' }, st.regulars.map((p) => partRow(p, '勤続' + (p.years || 0) + '年・年' + U.man(p.wage * D.LABOR.regularHours * wageNow),
          UI.btn('やめてもらう', () => app.update((s) => A.fireRegular(s, p.id), { undo: true }), 'sm danger')))) : h('p', { class: 'muted' }, '常雇用パートはいません。'),
        h('h4', { class: 'sub-h' }, '今年の応募者'),
        h('div', { class: 'part-list' }, S.regularCandidates(st).map((c) => partRow(c, '年' + U.man(c.wage * D.LABOR.regularHours * wageNow) + '（' + U.num(D.LABOR.regularHours) + '時間）',
          UI.btn('採用する', () => app.update((s) => A.hireRegular(s, c.id), { undo: true, msg: c.name + 'を常雇用パートとして採用しました' }), 'sm primary')))),
        h('p', { class: 'small muted' }, '年' + U.num(D.LABOR.regularHours) + '時間、季節に分けて働きます（手際が良い人ほど多くこなせる）。給与は毎月かかる固定費です。採用のときに募集費 ' + U.man(D.LABOR.regularRecruit * st.market.wageInfl) + ' がかかります。')),
      UI.card('正社員', '年 ' + U.num(D.LABOR.staffHours) + '時間働ける。給与は毎月かかる固定費',
        st.staff.length ? UI.table([{ label: '名前' }, { label: '勤続', num: true }, { label: '年間の人件費', num: true }, { label: '' }], st.staff.map((s) => [s.name, { v: s.years + '年', cls: 'num' },
          { v: U.man(s.salary * (1 + D.LABOR.staffSocial)), cls: 'num' },
          UI.btn('退職してもらう', async () => { if (await UI.confirm('社員に退職してもらいますか？', s.name + 'に退職してもらいます。退職金 ' + U.man(D.LABOR.staffSeverance) + ' がかかります。', '退職してもらう')) app.update((x) => A.fireStaff(x, s.id), { undo: true }); }, 'sm danger')]))
          : h('p', { class: 'muted' }, '社員はいません。'),
        RG.era && RG.era.featLocked(st, 'staff') ? h('div', { class: 'locked-card', style: { marginTop: '8px' } }, h('span', { class: 'lock-ic', 'aria-hidden': 'true' }, '🔒'), h('div', null, h('b', null, RG.era.lockText(st, 'staff').replace('🔒 ', '')))) :
        h('div', { class: 'row', style: { marginTop: '8px' } },
          UI.btn('正社員を1人雇う', () => app.update((s) => A.hireStaff(s), { undo: true, msg: '正社員を採用しました' }), 'primary sm'),
          h('span', { class: 'small muted' }, '採用費 ' + U.man(D.LABOR.staffRecruit * st.market.wageInfl) + '・人件費 年' + U.man(staffCost) + '（社会保険込み）。勤続とともに作業が上達します。'))));
  }

  // ---------- 販売計画 ----------
  function tabSales(app, st, pv) {
    const w = st.world, S = pv.sales;
    const prem = (x) => '農協価格' + (x >= 1 ? '＋' : '−') + U.pct(Math.abs(x - 1), 0);
    const contractRows = st.contracts.map((c) => {
      const r = S.contracts.find((x) => x.id === c.id);
      return [c.buyer, D.CROPS[c.crop].name, D.TIER_NAMES[c.minCult], { v: U.bales(c.volume), cls: 'num' }, prem(c.premium),
        { v: h('span', null, U.yen(SIM.contractPrice(c, w.forecast)), c.refPrice ? h('div', { class: 'small muted' }, '契約時 ' + U.yen(c.refPrice)) : null), cls: 'num' },
        { v: c.yearsLeft + '年', cls: 'num' },
        r && r.short > 0.5 ? h('span', { class: 'badge bad' }, U.bales(r.short) + '不足') : h('span', { class: 'badge good' }, '充足')];
    });
    const offers = st.offers.contracts.map((o) => {
      const crop = D.CROPS[o.crop];
      const locked = (crop.unlock && !st.flags[crop.unlock]) || (RG.era && RG.era.cropLocked(st, o.crop));
      return h('div', { class: 'offer' },
        h('div', { class: 't' }, o.buyer),
        h('div', null, crop.name + (o.minCult ? '（' + D.TIER_NAMES[o.minCult] + '）' : '') + '・毎年 ', h('b', null, U.bales(o.volume)), '・' + o.years + '年契約'),
        h('div', null, '価格の決め方 ', h('b', { class: o.premium >= 1 ? 'pos' : 'neg' }, prem(o.premium))),
        h('div', { class: 'small muted' }, '今年の目安 ' + U.yen(o.refPrice) + '/60kg（予想米価から）。実際の価格は毎年、その年の米の需給で決まります。'),
        crop.sake ? h('div', { class: 'small muted' }, '酒米は酒蔵との契約で出荷先を確保できます。') : null,
        h('div', { class: 'row' }, UI.btn('契約する', () => app.update((s) => A.acceptContract(s, o.id), { undo: true, msg: '契約しました' }), 'sm primary', { disabled: locked }),
          locked ? h('span', { class: 'small muted' }, crop.unlock && !st.flags[crop.unlock] ? '生産者登録をすると作付できます' : '🔒 この品種はまだ作れません') : null));
    });
    const d = S.direct;
    const directProducts = pv.production.products.filter((p) => D.CROPS[p.crop].directCoef);
    const prodOpts = directProducts.map((p) => ({ value: p.key, label: p.label + '（' + U.bales(p.bales) + '）' }));
    if (!directProducts.find((p) => p.key === st.direct.product)) prodOpts.unshift({ value: st.direct.product, label: SIM.productLabel(st.direct.product) + '（今年は作付なし）' });
    const channel = [];
    if (S.contracts.length) {
      const vol = U.sum(S.contracts, (c) => c.volume), rev = U.sum(S.contracts, (c) => c.revenue);
      channel.push(['契約販売', { v: U.bales(vol), cls: 'num' }, { v: U.man(rev), cls: 'num' }, { v: U.yen(vol > 0 ? rev / vol - D.COST.contractShip : 0), cls: 'num' }]);
    }
    (S.shops || []).forEach((x) => channel.push([x.icon + ' ' + x.name, { v: U.bales(x.sold), cls: 'num' }, { v: U.man(x.revenue), cls: 'num' }, { v: U.yen(x.unit), cls: 'num' }]));
    if (d.sold > 0) channel.push(['直販', { v: U.bales(d.sold), cls: 'num' }, { v: U.man(d.revenue), cls: 'num' }, { v: U.yen(d.perBaleNet), cls: 'num' }]);
    S.ja.forEach((j) => channel.push(['農協出荷（' + j.label + '）', { v: U.bales(j.bales), cls: 'num' }, { v: U.man(j.revenue), cls: 'num' }, { v: U.yen(j.unit - D.COST.jaFee), cls: 'num' }]));
    S.spot.forEach((j) => channel.push(['スポット（' + j.label + '）', { v: U.bales(j.bales), cls: 'num' }, { v: U.man(j.revenue), cls: 'num' }, { v: U.yen(j.unit - D.COST.spotFee), cls: 'num' }]));
    if (S.feed.bales > 0) channel.push(['飼料用米（＋交付金 ' + U.man(S.feed.subsidy) + '）', { v: U.bales(S.feed.bales), cls: 'num' }, { v: U.man(S.feed.revenue), cls: 'num' }, { v: U.yen(D.SALES.feedPrice - D.COST.feedFee + S.feed.subsidy / Math.max(1, S.feed.bales)), cls: 'num' }]);

    // 売り分けの帯（どこに何俵売るか）
    const split = [
      ['🤝', '契約', U.sum(S.contracts, (c) => c.delivered), '#5aa6e0'], ['🏪', '米屋・商店', U.sum(S.shops || [], (x) => x.sold), '#d0703a'], ['📦', '直販', S.direct.sold, '#e9a52a'], ['🏢', '農協', U.sum(S.ja, (j) => j.bales), '#58a650'],
      ['⏳', '保管', S.stockEnd ? S.stockEnd.bales : 0, '#9b7ad0'], ['🍡', '加工', S.biz && S.biz.proc ? S.biz.proc.bales : 0, '#e57a9a'],
      ['🏷️', 'スポット', U.sum(S.spot, (j) => j.bales), '#a0a0a0'], ['🐄', '飼料用', S.feed.bales, '#b38b5a']].filter((x) => x[2] > 0.5);
    const tot = U.sum(split, (x) => x[2]) || 1;
    const splitCard = UI.card('🍚 お米の売り分け', '平年作の見込み・合計 ' + U.bales(tot),
      h('div', { class: 'split-bar' }, split.map((x) => h('span', { style: { width: (x[2] / tot * 100) + '%', background: x[3] }, title: x[1] + ' ' + U.bales(x[2]) }, x[2] / tot > 0.08 ? x[0] : ''))),
      h('div', { class: 'split-legend' }, split.map((x) => h('span', null, h('i', { style: { background: x[3] } }), x[0] + ' ' + x[1] + ' ' + U.bales(x[2]) + '（' + U.pct(x[2] / tot, 0) + '）'))));
    return h('div', { class: 'stack' },
      splitCard,
      RG.screens.storageCard(app, st, pv),
      shopsCard(app, st, pv),
      UI.card('販路ごとの見込み', '平年作・予想米価 ' + U.yen(w.forecast) + '/60kg',
        UI.table([{ label: '販路' }, { label: '数量', num: true }, { label: '売上', num: true }, { label: '1俵あたり手取り', num: true }], channel),
        h('p', { class: 'small muted' }, '手取り＝価格から販売経費を引いた額（直販は精米・包装・決済手数料を差し引き）。農協への出荷代金は10月に', T('概算金'), '、残りは翌年6月に追加払い。')),
      UI.card(h('span', null, T('契約栽培')), '数量は約束、価格はその年の需給で決まる',
        contractRows.length ? UI.table([{ label: '取引先' }, { label: '品種' }, { label: '条件' }, { label: '数量/年', num: true }, { label: '価格の決め方' }, { label: '今年の見込み', num: true }, { label: '残り', num: true }, { label: '平年作で' }], contractRows) : h('p', { class: 'muted' }, '契約はありません。'),
        h('h4', { style: { margin: '10px 0 6px' } }, '今年の契約の打診'),
        offers.length ? h('div', { class: 'offers' }, offers) : h('p', { class: 'muted' }, '今年の打診はありません。'),
        h('p', { class: 'small muted' }, '契約で決めるのは出荷する数量・品種・条件と、農協価格に対する上乗せです。価格そのものは収穫の年の', T('米の需給'), '（全国の作柄・在庫）で決まるので、米価が下がれば契約価格も下がります。',
          '契約数量が足りないと、不足分を市場から高く買って納めることになります（', T('数量責任'), '）。不足が3割を超えると契約は打ち切られます。')),
      UI.card(h('span', null, T('直販'), '（ネット・個人のお客さん）'), '顧客 ' + U.num(st.direct.customers) + '人',
        h('div', { class: 'grid2' },
          h('div', { class: 'stack' },
            UI.field('直販する米', UI.select(prodOpts, st.direct.product, (v) => app.update((s) => { s.direct.product = v; }), { 'aria-label': '直販する米' })),
            UI.field('直販に回す量（俵）', UI.numInput({ value: Math.round(st.direct.alloc), min: 0, max: 5000, width: 110, suffix: '俵（販売可能 ' + U.bales(d.available) + '）', label: '直販に回す量',
              onChange: (v) => app.update((s) => { s.direct.alloc = Math.round(v); }) })),
            UI.field('販売価格（精米5kg）', UI.numInput({ value: st.direct.price5, min: 500, max: 10000, step: 50, width: 110, suffix: '円（参考価格 ' + U.yen(d.ref5) + '）', label: '精米5kgの価格',
              onChange: (v) => app.update((s) => { s.direct.price5 = Math.round(v); }) })),
            UI.field('販促費（新しい顧客を増やす）', UI.numInput({ value: st.direct.marketing, min: 0, max: 10000000, step: 10000, width: 130, suffix: '円/年', label: '販促費',
              onChange: (v) => app.update((s) => { s.direct.marketing = Math.round(v); }) })),
            UI.field(h('span', null, T('ブランド力', 'ブランド投資'), '（長期的に価格と集客力を高める）'), UI.numInput({ value: st.brandInvest, min: 0, max: 10000000, step: 10000, width: 130, suffix: '円/年', label: 'ブランド投資',
              onChange: (v) => app.update((s) => { s.brandInvest = Math.round(v); }) }))),
          h('div', null,
            UI.pvRow('今の顧客数', U.num(st.direct.customers) + '人'),
            UI.pvRow('この価格での需要見込み', U.bales(d.demand)),
            UI.pvRow('販売見込み', U.bales(d.sold)),
            UI.pvRow('売れ残り見込み', U.bales(d.unsold), d.unsold > 0.5 ? 'neg' : ''),
            UI.pvRow('直販の売上', U.man(d.revenue)),
            UI.pvRow('1俵あたり手取り', U.yen(d.perBaleNet)),
            UI.pvRow('新規顧客の見込み', '約' + U.num(d.newCustomers) + '人'),
            UI.pvRow(h('span', null, T('リピート率')), U.pct(1 - d.churn)),
            UI.pvRow('ブランド力', U.num(st.brand) + ' → ' + U.num(pv.brandEnd)),
            h('p', { class: 'small muted' }, '1人のお客さんは年に約30kg（0.5俵）買います。参考価格より高いと需要が減り、リピート率も下がります。', T('顧客獲得単価'), 'は約' + U.yen(D.DIRECT.cac) + '。直販の代金は45%が年内、残りは翌年にかけて入金されます。')))));
  }

  // ---------- 地元の米屋・商店への出荷 ----------
  function shopsCard(app, st, pv) {
    const S = pv.sales;
    const rows = D.SHOPS.map((sh) => {
      const x = (S.shops || []).find((y) => y.id === sh.id);
      return h('div', { class: 'shop-row' },
        h('div', { class: 'shop-h' }, h('span', { class: 'shop-ic', 'aria-hidden': 'true' }, sh.icon), h('b', null, sh.name),
          h('span', { class: 'badge good' }, '農協価格＋' + Math.round((sh.premium - 1) * 100) + '%')),
        h('div', { class: 'small muted' }, sh.desc),
        h('div', { class: 'small' }, '⚠️ ' + Math.round(1 / sh.risk) + '年に1度くらい、売れ行きが悪くて出荷した米の' + Math.round(sh.take[0] * 100) + '〜' + Math.round(sh.take[1] * 100) + '%しか引き取れない年がある（残りは農協価格の' + Math.round(D.SALES.shopReturnRate * 100) + '%で売るしかない）'),
        h('div', { class: 'row' },
          UI.numInput({ value: (st.shops || {})[sh.id] || 0, min: 0, max: sh.max, step: 10, width: 90, suffix: '俵（上限 ' + sh.max + '俵）', label: sh.name + 'に出荷する量',
            onChange: (v) => app.update((t) => { t.shops = t.shops || {}; t.shops[sh.id] = Math.round(v); }) }),
          x ? h('span', { class: 'small' }, '見込み ' + U.bales(x.shipped) + '・' + U.man(x.revenue) + '（全部引き取ってもらえた場合）') : null));
    });
    return UI.card('🏪 地元の米屋・商店への出荷', '農協より高く買ってくれる。その代わり、全部は引き取ってもらえない年がある', h('div', { class: 'shop-rows' }, rows),
      h('p', { class: 'small muted' }, '出荷できるのは、主食用のうるち米（もち米・酒米・飼料用米は除く）です。代金は11月と12月に半分ずつ入ります。引き取ってもらえなかった米は、農協価格の' + Math.round(D.SALES.shopReturnRate * 100) + '%で売ることになります（時期が遅れて買いたたかれるため）。'));
  }

  // ---------- 資金・保険 ----------
  function tabFinance(app, st, pv) {
    const bs = ACC.bs(st);
    const kinds = A.loanKinds(st);
    const kindKeys = Object.keys(kinds).filter((k) => k !== 'nointerest'); // 無利子資金は機械を買うときだけ
    if (!kinds[app.loanKind]) app.loanKind = kindKeys[0];
    const loanRows = st.loans.map((l) => {
      const annualP = l.newThisYear || l.grace > 0 ? 0 : Math.min(l.balance, l.original / Math.max(1, l.repayYears || l.term));
      let amt = Math.round(l.balance);
      return [l.name, { v: U.man(l.balance), cls: 'num' }, { v: U.pct(l.rate, 1), cls: 'num' }, { v: l.yearsLeft + '年' + (l.grace > 0 ? '（据置' + l.grace + '年）' : ''), cls: 'num' },
        { v: U.man(annualP + l.balance * l.rate * (l.newThisYear ? 10 / 12 : 1)), cls: 'num' },
        h('div', { class: 'row', style: { flexWrap: 'nowrap' } },
          UI.numInput({ value: amt, min: 0, max: Math.round(l.balance), step: 100000, width: 110, label: l.name + 'の繰上返済額', onChange: (v) => { amt = v; } }),
          UI.btn('繰上返済', () => app.update((s) => A.prepay(s, l.id, amt), { undo: true, msg: '繰上返済しました' }), 'sm'))];
    });
    let loanAmt = app.loanAmt || 1000000;
    const kyosaiPrem = pv.area.marketCrop * 10 * D.INSURANCE.kyosai.perArea;
    const incomeBase = SIM.insuranceBase(st, pv.area.marketCrop * 10);
    const ins = ['none', 'kyosai', 'income'].map((k) => {
      const I = D.INSURANCE[k];
      const insLock = k === 'income' && RG.era && RG.era.featLocked(st, 'incomeIns');
      const disabled = k === 'income' && (!incomeBase.eligible || insLock);
      const prem = insLock ? RG.era.lockText(st, 'incomeIns') : k === 'kyosai' ? '保険料 ' + U.man(kyosaiPrem) : k === 'income' ? (incomeBase.eligible ? '基準収入 ' + U.man(incomeBase.base) + '・保険料 ' + U.man(incomeBase.base * I.rate) : '来年から加入できます') : '保険料 0円';
      return h('button', { class: 'radio-card' + (st.insurance === k ? ' on' : ''), type: 'button', disabled, 'aria-pressed': st.insurance === k ? 'true' : 'false',
        onclick: (e) => { if (e.target.closest && e.target.closest('.term')) return; app.update((s) => { s.insurance = k; }); } },
        h('div', { class: 't' }, k === 'none' ? I.name : T(I.name)), h('div', { class: 'small' }, prem), h('div', { class: 'small muted' }, I.desc));
    });
    const last = st.lastResult && st.lastResult.analysis;
    return h('div', { class: 'stack' },
      UI.card('資金の状況', null, h('div', { class: 'kpis' },
        UI.kpi('今の資金', U.man(st.cash), '年初 ' + U.man(st.yearStartCash)),
        UI.kpi(h('span', null, T('長期借入金')), U.man(bs.longLoans)),
        UI.kpi(h('span', null, T('つなぎ資金')), U.man(st.emergency || 0), '融資枠 ' + U.man(SIM.creditLimit(st)), st.emergency > 0 ? 'bad' : ''),
        UI.kpi('長期資金の借入可能額', U.man(SIM.loanCapacity(st)), SIM.noInterestAvailable(st) > 0 ? '無利子資金の枠 ' + U.man(SIM.noInterestAvailable(st)) : null),
        last ? UI.kpi(h('span', null, T('債務償還年数')), isFinite(last.repayYears) ? U.num(last.repayYears, 1) + '年' : '返済原資なし', '前年の決算より', !isFinite(last.repayYears) || last.repayYears > 10 ? 'warn' : '') : null)),
      UI.card('今年の資金繰りの見通し', '平年作の場合。線が0を下回る月は資金ショート',
        RG.chart.cash(pv.cash.months, pv.cash.start),
        h('details', { class: 'more' }, h('summary', null, '月ごとの表を見る'), cashTable(pv.cash.months))),
      UI.card(h('span', null, T('運転資金'), '（短期借入）'), '1月に借りて12月に返す。年利 ' + U.pct(D.FIN.shortRate),
        h('div', { class: 'row' }, UI.numInput({ value: st.shortLoan, min: 0, max: SIM.shortLoanLimit(st), step: 100000, width: 130, suffix: '円（上限 ' + U.man(SIM.shortLoanLimit(st)) + '）', label: '運転資金の借入額',
          onChange: (v) => app.update((s) => { s.shortLoan = Math.round(v / 10000) * 10000; }) })),
        h('p', { class: 'small muted' }, '資金が足りなくなると自動で', T('つなぎ資金'), '（年8%）を借ります。最も少ない月の不足額くらいを運転資金で借りておくと、利息を抑えられます。')),
      advanceCard(app, st, pv),
      UI.card('借入金', null,
        loanRows.length ? UI.table([{ label: '借入' }, { label: '残高', num: true }, { label: '金利', num: true }, { label: '返済期間', num: true }, { label: '今年の返済額', num: true }, { label: '' }], loanRows) : h('p', { class: 'muted' }, '長期の借入はありません。'),
        st.emergency > 0 ? h('div', { class: 'row', style: { marginTop: '8px' } }, h('span', null, 'つなぎ資金 ' + U.man(st.emergency)),
          UI.btn('手元資金で返す', () => app.update((s) => A.repayEmergency(s, Math.min(s.emergency, s.cash)), { undo: true, msg: 'つなぎ資金を返済しました' }), 'sm')) : null,
        h('h4', { style: { margin: '12px 0 6px' } }, '長期資金を借りる'),
        h('p', { class: 'small' }, '今年あと ' + Math.max(0, D.FIN.loansPerYear - ((st.yearFlags || {}).newLoans || 0)) + ' 件申し込めます（使い道を決めない運転資金の借入は1年に' + D.FIN.loansPerYear + '件まで。機械・施設・農地を借入で買うのは別）' +
          (SIM.noInterestAvailable(st) > 0 ? '。無利子資金の残り ' + U.man(SIM.noInterestAvailable(st)) + ' は、' + D.FIN.noInterestYears + '年目まで、機械・施設を借入で買うときに自動で使われます。' : '。')),
        A.loanLock(st) ? UI.note('warn', null, A.loanLock(st)) : null,
        h('div', { class: 'row' },
          UI.select(kindKeys.map((k) => ({ value: k, label: kinds[k].name + '・年利' + U.pct(kinds[k].rate, 1) })), app.loanKind, (v) => { app.loanKind = v; app.keepScroll = true; app.render(); }, { 'aria-label': '借入の種類' }),
          UI.numInput({ value: loanAmt, min: 100000, max: 200000000, step: 100000, width: 130, suffix: '円', label: '借入額', onChange: (v) => { app.loanAmt = v; loanAmt = v; } }),
          UI.btn('借りる', () => app.update((s) => A.takeLoan(s, app.loanKind, app.loanAmt || loanAmt), { undo: true, msg: '借入しました' }), 'sm primary')),
        h('p', { class: 'small muted' }, '長期資金は', T('元金均等返済'), '。借りた年は利息だけで、翌年から毎年12月に元金を返します。返済の原資は「利益＋減価償却費」（', T('償還財源'), '）です。'),
        h('p', { class: 'small muted keep' }, '金利は、日本政策金融公庫と県の農業制度資金の利率（令和8年9〜10月）をもとにした目安です。実際の金利は、借りる時期・期間・条件で変わります。')),
      UI.card('保険', '不作や値下がりへの備え', h('div', { class: 'radio-cards' }, ins)),
      SIM.livingVaries(st) ? UI.card(h('span', null, '🏠 ', T('家計費'), '（生活費）'), '年 約' + U.man(st.living) + '（月平均 約' + U.man(st.living / 12) + '）',
        h('p', { class: 'small' }, '物語では、生活費は自分では決められません。毎月の出費は、季節（正月・お盆・年末は多め）や、暮らしのできごと（冠婚葬祭・車の車検や修理・家電の買い替えなど）で上下します。1年の平均は上の額くらいです。'),
        h('p', { class: 'small muted keep' }, '急な出費にも困らないよう、手元の資金に少しゆとりを持たせておきましょう。')) :
      UI.card(st.corp ? '役員報酬' : h('span', null, T('家計費'), '（生活費）'), st.corp ? '経営者の給料。経費になる' : '農業所得から生活費を引き出します',
        h('div', { class: 'row' }, UI.numInput({ value: st.corp ? st.execPay : st.living, min: st.corp ? D.FIN.livingMin : Math.min(D.FIN.livingMin, st.living), max: 30000000, step: 100000, width: 130, suffix: '円/年', label: st.corp ? '役員報酬' : '家計費',
          onChange: (v) => app.update((s) => { if (s.corp) s.execPay = Math.round(v); else s.living = Math.round(v); }) })),
        h('p', { class: 'small muted' }, st.corp ? '役員報酬は法人の経費になり、社会保険料（約15%）もかかります。' : '家計費は毎月引き出されます。少なくすると経営にお金が残りますが、' + (st.living < D.FIN.livingMin ? '配偶者の収入などで今は ' + U.man(st.living) + ' まで下がっています。' : '最低 ' + U.man(D.FIN.livingMin) + ' は必要です。'))));
  }

  // 農協の出荷契約金（前渡金）
  function advanceCard(app, st, pv) {
    const a = st.jaAdvance || { on: false, auto: true, qty: 0 };
    const unit = SIM.advanceUnit(st), qty = SIM.advanceQty(st), exp = Math.floor(SIM.expectedJA(st));
    const pick = (on, auto) => app.update((s) => {
      s.jaAdvance = Object.assign({}, s.jaAdvance || {}, { on, auto });
      if (on && !auto && !s.jaAdvance.qty) s.jaAdvance.qty = Math.floor(SIM.expectedJA(s) * D.SALES.advanceAutoShare / 10) * 10;
    });
    const opt = (label, desc, on, auto) => h('button', { class: 'radio-card' + (a.on === on && (!on || !!a.auto === auto) ? ' on' : ''), type: 'button',
      'aria-pressed': a.on === on && (!on || !!a.auto === auto) ? 'true' : 'false', onclick: () => pick(on, auto) },
      h('div', { class: 't' }, label), h('div', { class: 'small muted' }, desc));
    return UI.card(h('span', null, '農協の', T('出荷契約金'), '（前渡金）'), '出荷契約を結ぶと6月に受け取れる・年' + U.pct(D.SALES.advanceInterest, 1) + 'の利息がかかる',
      h('div', { class: 'radio-cards' },
        opt('申し込まない', '前渡金は受け取らない。', false, true),
        opt('申し込む（数量は自動）', '農協への出荷見込みの9割を契約数量にする。', true, true),
        opt('申し込む（数量を指定）', '契約数量を自分で決める。', true, false)),
      a.on && !a.auto ? h('div', { class: 'row', style: { marginTop: '8px' } }, h('span', null, '出荷契約数量'),
        UI.numInput({ value: a.qty, min: 0, max: 100000, step: 10, width: 100, suffix: '俵', label: '出荷契約数量', onChange: (v) => app.update((s) => { s.jaAdvance.qty = Math.round(v); }) })) : null,
      h('div', { class: 'kpis', style: { marginTop: '10px' } },
        UI.kpi('1俵あたり', U.yen(unit), '今年の予想米価の約半分'),
        UI.kpi('契約数量', U.bales(qty), '農協への出荷見込み ' + U.bales(exp)),
        UI.kpi('6月の入金', U.man(qty * unit), '10月の概算金と相殺', a.on ? 'good' : ''),
        UI.kpi('利息の見込み', U.man(qty * unit * 4 / 12 * D.SALES.advanceInterest), '6〜10月の4か月分', qty > 0 ? 'warn' : '')),
      h('p', { class: 'small muted' }, '出荷した分は10月の概算金から差し引かれます。それまでの利息（年' + U.pct(D.SALES.advanceInterest, 1) + '）が10月にかかります。農協への出荷が契約数量より少ないと、届かなかった分の契約金を11月に現金で返します。',
        '金額はJA・年によって異なります（例：JA黒部（富山）令和8年産は出荷契約米1俵10,000円・6月25日払い、令和2・3年産は6,000円）。'));
  }

  function cashTable(months) {
    return UI.table([{ label: '月' }, { label: '入金', num: true }, { label: '出金', num: true }, { label: '月末残高', num: true }, { label: 'つなぎ資金', num: true }],
      months.map((m) => [m.m + '月', { v: U.man(m.inflow), cls: 'num' }, { v: U.man(-m.outflow), cls: 'num' }, { v: U.man(m.before), cls: 'num ' + (m.before < 0 ? 'neg' : '') }, { v: m.emergency > 0 ? U.man(m.emergency) : '—', cls: 'num' }]));
  }
  RG.screens.cashTable = cashTable;

  const TAB_FNS = { overview: tabOverview, crops: tabCrops, land: tabLand, machines: tabMachines, labor: tabLabor, sales: tabSales,
    biz: (app, st, pv) => RG.screens.tabBiz(app, st, pv), finance: tabFinance };
})(window.RG = window.RG || {});
