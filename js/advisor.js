// 指導員のアドバイス：計画時の注意と、決算の講評
(function (RG) {
  'use strict';
  const D = RG.data, U = RG.util;
  const AD = RG.advisor = {};
  AD.NAME = 'JA営農指導員の高橋さん';

  // ---------- 高橋さんのひとこと（その年の出来に合わせた、うまいこと） ----------
  AD.QUIPS = {
    first: ['一年目は「わからないことが、わかる年」。それがわかれば上出来だよ。', '最初の年の決算書は、来年の自分への手紙みたいなもの。じっくり読んでおくといい。'],
    cash: ['利益は意見、現金は事実。帳簿が黒字でも、財布が空っぽじゃ苗は買えないよ。', 'お金は秋にまとめて入って、春から少しずつ出ていく。米づくりは、お金の田植えから始まるんだ。'],
    loss: ['不作の年に覚えたことは、豊作の年には覚えられない。今年の赤字は授業料だと思えばいい。', '転ぶのは恥じゃない。同じ石で二度転ぶのがもったいないんだ。何が石だったか、決算書で確かめよう。'],
    weather: ['天気は選べないけど、備えは選べる。そこが百姓の腕の見せどころだね。', '空模様は神様の担当、備えは人間の担当。今年は神様が少し意地悪だったね。'],
    labor: ['田んぼは正直だよ。人手が足りない年は、刈り遅れがちゃんと教えてくれる。', '機械は夜も働けるけど、人は休まなきゃいけない。人手の計画は、無理のない線で立てよう。'],
    priceHigh: ['米が高い年は、みんなが作りすぎる年の前ぶれでもある。浮かれず、蓄えておこう。'],
    priceLow: ['安い年を生き残った人が、高い年に笑うんだ。今は踏んばりどころだよ。', '値段は市場が決めるけど、原価は自分で決められる。安い年こそ、原価を見直す好機だね。'],
    good: ['実るほど頭を垂れる稲穂かな。儲かった年こそ、財布のひもは締めておくもんだよ。', '良い年の利益は、悪い年への仕送りだ。全部使わずに、少し残しておこう。'],
    quality: ['一等米は、毎日の水見回りの通知表みたいなもの。今年はいい点がとれたね。'],
    general: ['米づくりは八十八の手間、経営は八十八の判断。一つずつ片づけていけばいい。', '機械は買った日から年をとる。減価償却というのは、機械の誕生日の数え方なんだよ。',
      '借金そのものは悪者じゃない。返すあてのない借金が悪者なんだ。', '田んぼを広げるのは簡単だ。広げた田んぼを回すのが難しい。'],
  };
  AD.quip = function (st, res) {
    const r = RG.rng.make(st.seed, st.year, 'quip');
    const Q = AD.QUIPS;
    if (!res) return r.pick(Q.first);
    const keys = [];
    const hs = st.history, prev = hs.length >= 2 ? hs[hs.length - 2] : null, inc = res.analysis ? res.analysis.income : 0;
    if (res.year === 1) keys.push('first');
    if (res.cash.emergencyPeak > res.cash.emergencyStart + 1) keys.push('cash');
    if (inc < 0) keys.push('loss');
    if ((res.events || []).some((e) => e.id === 'typh' || e.id === 'heat' || e.id === 'cold')) keys.push('weather');
    if (Math.max.apply(null, D.SEASONS.map((s) => res.labor.seasons[s].ratio)) > 0.05) keys.push('labor');
    if (res.priceChange >= 0.08) keys.push('priceHigh');
    if (res.priceChange <= -0.08) keys.push('priceLow');
    if (prev && inc > 0 && inc > prev.income * 1.2) keys.push('good');
    if (res.production.r1 > 0.92) keys.push('quality');
    keys.push('general');
    return r.pick(Q[keys[0]]);
  };

  // ---------- 計画プレビューの注意 ----------
  AD.planHints = function (st, pv) {
    const out = [];
    const L = pv.labor.seasons;
    D.SEASONS.forEach((s) => {
      if (L[s].ratio > 0.01) out.push({ level: 'bad', text: D.SEASON_SHORT[s] + 'の労働力が ' + U.num(L[s].short) + '時間 不足（' + U.pct(L[s].ratio) + '）。' +
        (s === 'winter' ? '直販の出荷が滞ります。' : '作業が遅れて収量・品質が落ちます。') + 'パートや社員の雇用、機械の能力アップを検討しましょう。' });
    });
    if (pv.cash.minBalance < 0) {
      out.push({ level: 'bad', text: pv.cash.minMonth + '月に資金が ' + U.man(-pv.cash.minBalance) + ' 不足する見込み。つなぎ資金（年8%）を借りることになります。「資金」タブで運転資金（年2%）を借りておくと安く済みます。' +
        (!(st.jaAdvance && st.jaAdvance.on) ? '農協の出荷契約金（6月入金・利息なし）を申し込むのも手です。' : '') });
    } else if (pv.cash.minBalance < 500000) {
      out.push({ level: 'warn', text: pv.cash.minMonth + '月の資金残高が ' + U.man(pv.cash.minBalance) + ' まで下がる見込み。不作や値下がりがあると資金が足りなくなるかもしれません。' });
    }
    const undone = D.OP_ORDER.filter((k) => pv.labor.ops[k].undone > 0.05);
    if (undone.length) out.push({ level: 'bad', text: undone.map((k) => pv.labor.ops[k].name + ' ' + U.ha(pv.labor.ops[k].undone)).join('、') +
      ' は自分の機械でも委託でもこなせません（委託先が引き受けられるのは作業ごとに約' + U.ha(RG.sim.contractCap(st)) + 'まで）。適期を逃して収量・品質が落ちます。機械を導入しましょう。' });
    pv.sales.contracts.forEach((c) => {
      if (c.short > 0.5) out.push({ level: 'bad', text: c.buyer + 'との契約が平年作でも ' + U.bales(c.short) + ' 不足する見込み。不足分は市場から高く調達することになります。' + D.CROPS[c.crop].name + 'の作付を増やしましょう。' });
    });
    const contracted = U.sum(st.contracts, (c) => c.volume);
    const mk = pv.production.marketBales;
    if (contracted > 0 && mk > 0 && contracted / mk > 0.85) out.push({ level: 'warn', text: '契約数量が販売用米の見込み収量の ' + U.pct(contracted / mk) + ' に達しています。不作の年に足りなくなるおそれがあります。' });
    const d = pv.sales.direct;
    if (d.alloc > 0 && d.demand < d.alloc * 0.85) out.push({ level: 'warn', text: '直販の需要見込み（約' + U.bales(d.demand) + '）より割り当て（' + U.bales(d.alloc) + '）が多すぎます。売れ残りは安く手放すことになります。価格を下げるか、販促費で顧客を増やしましょう。' });
    if (d.alloc > 0 && d.demand > d.alloc * 1.25) out.push({ level: 'info', text: '直販の需要（約' + U.bales(d.demand) + '）が割り当てを上回っています。品切れが続くと顧客が離れます。割り当てを増やすか価格を上げる余地があります。' });
    if (st.direct.alloc > 0 && d.alloc < st.direct.alloc - 0.5) out.push({ level: 'warn', text: '直販に割り当てた ' + U.bales(st.direct.alloc) + ' に対して、' + d.label + 'の生産見込みが足りません（' + U.bales(d.alloc) + 'のみ）。' });
    if (pv.area.fallow > 0.05) out.push({ level: 'warn', text: U.ha(pv.area.fallow) + 'が休耕になっています。地代や水利費はかかり続け、休耕が多いと地域の信頼も下がります。' });
    const pl = pv.pl;
    const income = RG.accounting.ownerIncome(st, pl);
    if (!st.corp && income < st.living) out.push({ level: 'warn', text: '平年作でも農業所得（' + U.man(income) + '）が家計費（' + U.man(st.living) + '）を下回る見込み。純資産が減っていきます。' });
    if (st.corp && pl.preTax < 0) out.push({ level: 'warn', text: '平年作でも経常赤字（' + U.man(pl.preTax) + '）の見込み。規模・販売・コストを見直しましょう。' });
    ['combine', 'tractor', 'dryer', 'planter'].forEach((t) => {
      const M = pv.machines[t];
      if (M.cap > 0 && M.util < 0.4) out.push({ level: 'info', text: D.MACHINE_TYPES[t].name + 'の稼働率が ' + U.pct(M.util) + ' と低めです。機械に対して面積が小さく、1haあたりの機械費が割高になっています。' });
    });
    RG.outlook.milestones(st, 1).filter((m) => m.kind === 'machine' || m.kind === 'retire').forEach((m) => out.push({ level: 'warn', text: m.text + '。今のうちに資金や段取りを考えておきましょう。' }));
    const adv = pv.jaAdvance;
    if (adv && adv.ret > 0) out.push({ level: 'warn', text: '出荷契約金の契約数量（' + U.bales(adv.qty) + '）が、平年作での農協への出荷見込み（' + U.bales(adv.shipped) + '）を上回っています。届かなかった分の ' + U.man(adv.ret) + ' は11月に現金で返すことになります。' });
    const late = pv.production.plots.filter((p) => p.late > 3);
    if (late.length) out.push({ level: 'warn', text: '稲刈りが集中し、' + late.map((p) => p.name + ' が平均' + U.num(p.late) + '日').join('、') + ' 刈り遅れる見込み（品質低下）。早生・晩生を組み合わせるか、田植え時期をずらしましょう。' });
    pv.production.plots.filter((p) => p.timingCls === 'bad').forEach((p) => out.push({ level: 'bad', text: p.name + ' の田植え時期が適期から大きく外れています（' + p.timing + '）。収量・品質が大きく下がります。' }));
    if (st.insurance === 'income' && !pv.insurance.eligible) out.push({ level: 'warn', text: '収入保険は前年の決算実績がないと加入できません（今年は保険料・補てんともゼロ）。' });
    return out;
  };

  // ---------- 決算の講評 ----------
  AD.review = function (st, res) {
    const out = [];
    const pl = res.pl, an = res.analysis, bs = res.bs;
    const good = (title, text) => out.push({ level: 'good', title, text });
    const warn = (title, text) => out.push({ level: 'warn', title, text });
    const bad = (title, text) => out.push({ level: 'bad', title, text });
    const info = (title, text) => out.push({ level: 'info', title, text });

    // 総括
    const inc = an.income;
    if (st.corp) {
      if (pl.preTax > 0) good('黒字決算', '経常利益は ' + U.man(pl.ordinary) + '。役員報酬を払ったうえで利益が出ています。');
      else bad('赤字決算', '税引前の損失は ' + U.man(pl.preTax) + '。どの費用が重いか、損益計算書で確認しましょう。');
    } else {
      if (inc >= st.living + res.tax.amount) good('生活費をまかなえる所得', '農業所得 ' + U.man(inc) + ' で、家計費と税金を払っても ' + U.man(inc - st.living - res.tax.amount) + ' が経営に残りました。');
      else if (inc > 0) warn('所得が生活費に届かない', '農業所得は ' + U.man(inc) + '。家計費（' + U.man(st.living) + '）と税金を引くと ' + U.man(inc - st.living - res.tax.amount) + ' で、純資産が減っています。');
      else bad('農業所得がマイナス', '農業所得は ' + U.man(inc) + '。売上で経費をまかなえていません。');
    }

    // 天候・米価
    const AG = RG.agro;
    const yt = D.YEAR_TYPES[res.yearType] || D.YEAR_TYPES.normal;
    const plots = res.production.plots;
    if (res.yearType === 'good') good('天候：' + yt.name, '気象に恵まれた年でした。ただし全国も豊作だと米価は下がりがちです。');
    (res.events || []).forEach((ev) => {
      const e = AG.event(ev.id);
      const hits = plots.map((p) => ({ p, f: (p.fx || []).find((x) => x.id === ev.id) })).filter((x) => x.f && (x.f.q < -2 || x.f.y < -0.02));
      if (!hits.length) return;
      const weak = hits.filter((x) => x.f.tol < 0.5).map((x) => D.CROPS[x.p.crop].name);
      const strong = e.tol ? D.CROP_ORDER.filter((k) => !D.CROPS[k].alias && D.CROPS[k][e.tol] >= 0.75 && (!D.CROPS[k].unlock || st.flags[D.CROPS[k].unlock]) && !(RG.era && RG.era.cropLocked(st, k))).map((k) => D.CROPS[k].name) : [];
      warn(e.icon + ' ' + e.name + '（' + D.SEV[ev.sev].name + '）', e.desc + (weak.length ? ' 特に ' + Array.from(new Set(weak)).join('・') + ' が被害を受けました。' : '') +
        (strong.length ? ' ' + D.TOL_NAMES[e.tol] + '性の強い品種：' + strong.slice(0, 4).join('・') + '。' : ''));
    });
    const lateP = plots.filter((p) => p.late > 3);
    if (lateP.length) warn('刈り遅れ', lateP.map((p) => p.name + ' 平均' + U.num(p.late) + '日').join('、') + '。稲刈りが集中して適期を逃し、品質が下がりました。早生・晩生の組み合わせ（作期分散）や田植え時期の分散、コンバインの能力アップを検討しましょう。');
    const badTiming = plots.filter((p) => p.timingCls === 'bad');
    if (badTiming.length) bad('田植え時期が適期から外れた', badTiming.map((p) => p.name).join('、') + ' は田植えが' + badTiming[0].timing + 'ため、収量と品質が大きく下がりました。');
    if (res.shock > 0.15) info('米価の急騰', '今年は米価が大きく上がりました。この利益を前提に大きな投資をするのは危険です。平年の米価で計画を立てましょう。');
    if (res.shock < -0.13) warn('米価の値崩れ', '米価が大きく下がりました。契約栽培の価格もその年の需給で決まるので一緒に下がります。値下がりへの備えには、収入保険や直販が役立ちます。');

    // 原価
    if (an.costPer60 > 0) {
      const margin = res.price - an.costPer60;
      if (margin < 0) bad('生産費が米価を上回っている', '販売用米60kgあたりの生産費は ' + U.yen(an.costPer60) + ' で、米価（' + U.yen(res.price) + '）より高くなっています。規模拡大で固定費を薄めるか、高く売れる販路を増やしましょう。');
      else info('60kgあたり生産費', U.yen(an.costPer60) + '（家族労働費を含めると ' + U.yen(an.fullCostPer60) + '）。米価との差 ' + U.yen(margin) + ' が1俵あたりのもうけの目安です。');
    }
    if (isFinite(an.bepArea) && an.bepArea > res.area.planted * 1.02) warn('損益分岐面積に届いていない', '今の費用構造では、あと ' + U.ha(an.bepArea - res.area.planted) + ' 作付面積を増やさないと黒字になりません（損益分岐面積 ' + U.ha(an.bepArea) + '）。');
    else if (isFinite(an.bepArea) && an.bepArea > 0) info('損益分岐面積', '固定費をまかなうのに必要な面積は ' + U.ha(an.bepArea) + '（' + (st.corp ? '' : '生活費も含めると ' + U.ha(an.bepAreaLiving)) + '）。現在の作付は ' + U.ha(res.area.planted) + 'です。');

    // 費用構成
    const dep = pl.get('depreciation'), contract = pl.get('contract'), sales = pl.sales;
    if (sales > 0 && dep / sales > 0.3) warn('減価償却費が重い', '減価償却費が売上の ' + U.pct(dep / sales) + ' を占めています。機械の能力に対して面積が足りないかもしれません。');
    if (sales > 0 && contract / sales > 0.25) info('作業委託料が多い', '作業委託料が ' + U.man(contract) + '（売上の ' + U.pct(contract / sales) + '）。面積が増えたら、機械の購入やリースと比べてみましょう。');

    // 機械
    ['combine', 'tractor', 'dryer', 'planter', 'nursery'].forEach((t) => {
      const M = res.machines[t];
      if (M.count > 0 && M.util < 0.4) warn(D.MACHINE_TYPES[t].name + 'の稼働率が低い', '稼働率 ' + U.pct(M.util) + '。過剰投資の状態です。面積を増やすか、作業受託で機械を活かす方法もあります。');
    });
    const und = D.OP_ORDER.filter((k) => res.labor.ops[k].undone > 0.05);
    if (und.length) bad('作業が追いつかなかった', und.map((k) => res.labor.ops[k].name + ' ' + U.ha(res.labor.ops[k].undone)).join('、') + ' を適期に作業できず、収量 ' + U.pct(res.production.delayY - 1) + '・品質も低下しました。面積に見合った機械をそろえましょう。');
    res.broken.forEach((b) => warn('機械の故障', b.name + 'が故障しました。古い機械ほど故障しやすく、修理費もかさみます。'));

    // 労働
    const worst = D.SEASONS.reduce((a, s) => (res.labor.seasons[s].ratio > res.labor.seasons[a].ratio ? s : a), 'spring');
    if (res.labor.seasons[worst].ratio > 0.01) bad('人手不足', D.SEASON_SHORT[worst] + 'の作業が ' + U.pct(res.labor.seasons[worst].ratio) + ' 足りず、収量・品質が下がりました。');
    if (an.hourlyIncome > 0) {
      const t = an.hourlyIncome;
      if (t < 1150) warn('家族労働の時給が低い', '家族の労働1時間あたりの所得は ' + U.yen(t) + '。地域のパート時給より低い水準です。');
      else if (t > 2500) good('労働に見合った所得', '家族の労働1時間あたりの所得は ' + U.yen(t) + '。効率の良い経営です。');
    }

    // 資金
    if (res.cash.emergencyPeak > res.cash.emergencyStart + 1) bad('資金ショート', '一時的に資金が足りず、つなぎ資金（年8%）を最大 ' + U.man(res.cash.emergencyPeak) + ' 借りました。利息は ' + U.man(res.cash.emInterest) + '。運転資金を事前に借りるか、支出の時期を見直しましょう。');
    else if (res.cash.minBalance < 300000) warn('資金に余裕がない', res.cash.minMonth + '月に資金残高が ' + U.man(res.cash.minBalance) + ' まで下がりました。');
    if (an.debt > 0) {
      if (!isFinite(an.repayYears)) bad('返済の原資がない', '償還財源（税引後利益＋減価償却費' + (st.corp ? '' : '－家計費') + '）がマイナスです。このままでは借入を返せません。');
      else if (an.repayYears > 10) warn('借入が多い', '債務償還年数は ' + U.num(an.repayYears, 1) + '年。10年を超えると返済に無理がある目安です。');
      else good('借入は返済可能な水準', '債務償還年数は ' + U.num(an.repayYears, 1) + '年。');
    }
    if (bs.equity < 0) bad('債務超過', '純資産が ' + U.man(bs.equity) + ' とマイナスです。3年続くと経営を続けられません。');

    // 販売
    res.sales.contracts.forEach((c) => { if (c.short > 0.5) bad('契約数量の不足', c.buyer + 'への出荷が ' + U.bales(c.short) + ' 不足し、調達費 ' + U.man(c.procure) + ' がかかりました。契約は見込み収量の7〜8割までにしましょう。'); });
    const d = res.sales.direct;
    if (d.alloc > 0) {
      if (d.unsold > 0.5) warn('直販の売れ残り', U.bales(d.unsold) + 'が売れ残りました。価格が参考価格（5kg ' + U.yen(d.ref5) + '）に比べて高すぎないか、顧客数に対して量が多すぎないか確認しましょう。');
      if (d.unmet > 0.15) info('直販の品切れ', '需要の ' + U.pct(d.unmet) + ' に応えられませんでした。品切れは顧客離れにつながります。');
      if (d.perBaleNet > 0) {
        const ja = res.sales.ja.length ? U.avg(res.sales.ja.map((x) => x.unit)) - D.COST.jaFee : res.price;
        info('販路別の手取り', '直販の1俵あたり手取りは ' + U.yen(d.perBaleNet) + '、農協出荷は約 ' + U.yen(ja) + '。直販は1俵あたり ' + U.num(res.labor.directLabor / Math.max(1, d.alloc), 1) + '時間の手間もかかります。');
      }
    }
    if (res.insurance.kyosaiPay + res.insurance.incomePay > 0) good('保険が役立った', '保険・共済から ' + U.man(res.insurance.kyosaiPay + res.insurance.incomePay) + ' が補てんされます（翌年に入金）。');

    // ヒント
    out.push({ level: 'tip', title: '経営のヒント', text: D.TIPS[(st.year * 7 + st.seed) % D.TIPS.length] });
    return out;
  };

  // ---------- 来年に向けてのアドバイス ----------
  // 決算の結果と来年の山場から、具体的な数字つきで「来年やること」を優先度の高い順に返す（決算の反映後に呼ぶ）
  AD.TAB_NAMES = { overview: '概況', crops: '作付計画', land: '農地', machines: '機械・設備', labor: '労働力', sales: '販売計画', biz: '新しい事業', finance: '資金・保険' };
  AD.nextYear = function (st, res) {
    const out = [];
    const add = (pri, title, text, tab) => out.push({ pri, title, text, tab });
    const S = RG.state, SIM = RG.sim, AG = RG.agro, an = res.analysis || {};
    const plots = res.production.plots || [];
    const round10man = (v) => Math.ceil(v / 100000) * 100000;

    // 資金繰り
    const em = res.cash.emergencyPeak - res.cash.emergencyStart;
    if (em > 1 || res.cash.minBalance < 0) {
      const need = round10man(Math.max(em, -res.cash.minBalance) + 500000);
      const advOff = !(st.jaAdvance && st.jaAdvance.on);
      add(10, '資金繰りの備え', res.cash.minMonth + '月に資金が足りなくなりました。来年は年初に運転資金（年2%）を約' + U.man(Math.min(need, SIM.shortLoanLimit(st))) + '借りておきましょう' +
        (advOff ? '。農協の出荷契約金（6月入金・利息なし）を申し込むのも効果的です' : '') + '。', 'finance');
    }

    // 来年使えなくなる・来年が最後の機械（まとめて1項目）
    const dying = st.machines.filter((m) => !m.lease && D.MODELS[m.model].maxAge && D.MODELS[m.model].maxAge - m.age <= 1);
    if (dying.length) {
      const parts = dying.map((m) => {
        const md = D.MODELS[m.model];
        const op = D.OP_ORDER.find((k) => D.OPS[k].mtype === md.type);
        const fee = op ? res.area.planted * 10 * D.OPS[op].fee * st.market.matInfl : 0;
        return md.name + '（' + (md.maxAge - m.age === 1 ? '来年が最後のシーズン' : '来年から使えない') + '）：買い替え 約' + U.man(RG.actions.newPrice(st, m.model)) +
          '・減価償却 年' + U.man(RG.actions.newPrice(st, m.model) / md.life) + (fee > 0 ? '／全部委託なら年 約' + U.man(fee) : '');
      });
      add(9, '機械の買い替え', parts.join('、') + '。修理費も含めて、買い替え・リース・委託のどれが安いか比べ、資金の段取りを決めておきましょう（借入可能額 ' + U.man(SIM.loanCapacity(st)) + '）。', 'machines');
    }

    // 人手不足
    const L = res.labor.seasons;
    const worst = D.SEASONS.reduce((a, s) => (L[s].short > L[a].short ? s : a), 'spring');
    if (L[worst].ratio > 0.01) {
      const n = Math.ceil(L[worst].short / D.PART_CAP[worst]);
      add(9, D.SEASON_SHORT[worst] + 'の人手', D.SEASON_SHORT[worst] + 'の作業が' + U.num(L[worst].short) + '時間足りませんでした。パートを' + n + '人増やす（' + D.SEASON_SHORT[worst] + 'は1人' + D.PART_CAP[worst] + '時間まで）か、' +
        (worst === 'spring' ? '一部を直播にして春の作業を減らしましょう。' : worst === 'autumn' ? '大きなコンバインや乾燥施設で作業時間を減らしましょう。' : '正社員の採用も考えましょう。'), 'labor');
    }

    // 機械も委託先も足りなかった作業
    const und = D.OP_ORDER.filter((k) => res.labor.ops[k].undone > 0.05);
    if (und.length) {
      const k = und[0], need = res.labor.ops[k].undone, t = D.OPS[k].mtype;
      const model = Object.keys(D.MODELS).filter((x) => D.MODELS[x].type === t).sort((a, b) => D.MODELS[a].cap - D.MODELS[b].cap).find((x) => D.MODELS[x].cap >= need);
      add(9, D.OPS[k].name + 'が追いつかない', D.OPS[k].name + 'が' + U.ha(need) + '分、適期にできませんでした。' + (model ? D.MODELS[model].name + '（能力' + U.ha(D.MODELS[model].cap) + '・約' + U.man(RG.actions.newPrice(st, model)) + '）の導入かリースを考えましょう。' : '機械を増やしましょう。'), 'machines');
    }

    // 生活費をまかなえる所得か
    const tax = res.tax.amount;
    if (!st.corp && an.income < st.living + tax && an.marginPer10a > 0) {
      const ha = (st.living + tax - an.income) / (an.marginPer10a * 10);
      add(8, '生活費をまかなう所得', '農業所得が家計費と税金に ' + U.man(st.living + tax - an.income) + ' 足りませんでした。今の10aあたりの稼ぎ（限界利益 ' + U.yen(an.marginPer10a) + '）なら、あと約' + U.ha(ha) + 'の作付で埋まる計算です。' +
        '農地の話を受ける、高く売れる販路（直販・契約）を増やす、経費を見直す、のどれから手をつけるか決めましょう。', 'land');
    } else if (st.corp && res.pl.preTax < 0 && an.marginPer10a > 0) {
      add(8, '赤字からの立て直し', '税引前で ' + U.man(-res.pl.preTax) + ' の赤字でした。今の10aあたりの稼ぎなら、あと約' + U.ha(-res.pl.preTax / (an.marginPer10a * 10)) + 'の作付で黒字になる計算です。固定費（人件費・機械）が面積に見合っているかも見直しましょう。', 'land');
    }

    // 刈り遅れ → 作期分散
    const late = plots.filter((p) => p.late > 3).sort((a, b) => b.late - a.late)[0];
    if (late) {
      const v = D.CROPS[late.crop];
      const early = v.group === 'mochi' ? 'わたぼうし' : v.sake ? '五百万石' : v.group === 'koshi' ? 'こしいぶき・なつひめ' : 'ゆきん子舞';
      add(7, '稲刈りを分散する', late.name + 'が平均' + U.num(late.late) + '日刈り遅れました。' + U.ha(late.area / 3) + 'ほどを早生（' + early + 'など）にするか、田植え時期を「遅め」にずらすと、稲刈りが重ならなくなります。', 'crops');
    }

    // 契約の不足
    res.sales.contracts.filter((c) => c.short > 0.5 && !c.cancel).forEach((c) => {
      const v = D.CROPS[c.crop];
      add(7, c.buyer + 'との契約', U.bales(c.short) + '足りませんでした。来年は' + v.name + 'を約' + U.ha((c.short * 60) / (v.by * 10)) + '増やすか、ほかの販路に回す量を減らして、契約数量を確保しましょう。', 'crops');
    });

    // 気象への備え
    const ev = (res.events || []).map((e) => e.id);
    const heatHit = plots.filter((p) => D.CROPS[p.crop].market && D.CROPS[p.crop].ht < 0.5 && p.r1 < 0.6);
    if ((ev.includes('heat') || ev.includes('foehn')) && heatHit.length) {
      const strong = D.CROP_ORDER.filter((k) => !D.CROPS[k].alias && D.CROPS[k].market && D.CROPS[k].ht >= 0.75 && (!D.CROPS[k].unlock || st.flags[D.CROPS[k].unlock]) && !(RG.era && RG.era.cropLocked(st, k))).map((k) => D.CROPS[k].name);
      add(6, '暑さへの備え', heatHit.map((p) => D.CROPS[p.crop].name).filter((x, i, a) => a.indexOf(x) === i).join('・') + 'が高温で等級を落としました（1等 ' + U.pct(heatHit[0].r1) + '）。猛暑の年は増えています。' +
        (strong.length ? '一部を高温に強い品種（' + strong.join('・') + '）にして、リスクを分けましょう。' : '新之助の生産者登録の案内が来たら、検討しましょう。'), 'crops');
    }
    if (ev.includes('typh') || ev.includes('flood')) {
      const weak = plots.filter((p) => D.CROPS[p.crop].ft < 0.4 && (p.fx || []).some((f) => (f.id === 'typh' || f.id === 'flood') && f.y < -0.03));
      if (weak.length) add(5, '倒伏への備え', weak.map((p) => D.CROPS[p.crop].name).join('・') + 'が台風・大雨で倒れました。倒伏に強い品種（にじのきらめき・ゆきん子舞など）を組み合わせるか、収入保険で備えましょう。', 'crops');
    }

    // 直販
    const d = res.sales.direct;
    if (d.alloc > 0 && d.unsold > 0.5) {
      add(5, '直販の売れ残り', U.bales(d.unsold) + '売れ残りました。価格を参考価格（5kg ' + U.yen(Math.round(d.ref5 / 50) * 50) + '）に近づけるか、直販に回す量を約' + U.bales(Math.floor(d.demand)) + 'に減らしましょう。', 'sales');
    } else if (d.alloc > 0 && d.unmet > 0.2) {
      add(4, '直販の品切れ', '注文の' + U.pct(d.unmet) + 'に応えられませんでした。直販に回す量を約' + U.bales(Math.ceil(d.demand)) + 'に増やすか、少し値上げする余地があります。', 'sales');
    }

    // 休耕
    if (res.area.fallow > 0.05) add(6, '休耕地', U.ha(res.area.fallow) + 'が休耕でした。地代はかかり続けるので、どれかの作付に回しましょう。', 'crops');

    // 保険
    if (st.insurance === 'none' && (res.bs.longLoans > 0 || (res.events || []).some((e) => e.sev === 'heavy'))) {
      add(4, '収入の下ぶれへの備え', '借入の返済があるなら、収入保険（米価の下落にも対応）を検討しましょう。前年の決算実績があるので、来年から加入できます。', 'finance');
    }

    // 大きな課題がないとき
    if (!out.length) {
      // 決算の後なので、年齢・機械の使用年数はもう来年の値。来年（st.year + 1）から数える
      const ms = RG.outlook ? RG.outlook.milestones(st, 3, st.year + 1).filter((m) => m.kind === 'machine' || m.kind === 'retire')[0] : null;
      add(1, '今の形を続ける', '大きな課題はありません。来年も同じ計画を基本にしましょう。' + (ms ? 'ただし' + ms.year + '年目に「' + ms.text + '」ので、今から資金を残しておきましょう。' : '余裕のある資金は、機械の買い替えや悪い年に備えて残しておきましょう。'), ms ? 'machines' : null);
    }
    return out.sort((a, b) => b.pri - a.pri).slice(0, 5);
  };
})(window.RG = window.RG || {});
