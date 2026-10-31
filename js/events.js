// 年初のイベント・ニュース・各種オファー（農地・契約・中古機械）
(function (RG) {
  'use strict';
  const D = RG.data, U = RG.util;
  const E = RG.events = {};

  const round10 = (v) => Math.round(v / 10) * 10;
  const round100 = (v) => Math.round(v / 100) * 100;

  // ---------- オファー ----------
  E.genOffers = function (st) {
    return { land: genLand(st).concat(RG.rivals ? RG.rivals.landOffers(st) : []), contracts: genContracts(st), used: genUsed(st) };
  };

  function genLand(st) {
    const r = RG.rng.make(st.seed, st.year, 'land');
    let n = 1 + (r.chance(0.5 + st.trust / 200) ? 1 : 0) + (r.chance(st.trust / 150) ? 1 : 0) + (st.year >= 3 && r.chance(0.3) ? 1 : 0);
    const out = [];
    const reasons = ['高齢のため離農する', '後継者がいない', '体調を崩して作業が難しくなった', '相続した田を任せたい', '兼業で手が回らなくなった'];
    for (let i = 0; i < n; i++) {
      const big = st.year >= 3 && st.trust >= 30 && r.chance(0.15);
      const area = U.round(big ? r.range(3, 6) : r.range(0.3, 2.2), 1);
      const soil = r.weighted([['good', 0.2], ['normal', 0.5], ['poor', 0.3]]);
      const buy = r.chance(0.15);
      const rent = (soil === 'poor' ? r.int(4, 7) : soil === 'good' ? r.int(10, 14) : r.int(8, 12)) * 1000;
      const pr = D.LAND_PRICE[soil];
      const price10a = r.int(pr[0], pr[1]) * 10000;
      out.push({
        id: 'L' + st.year + '_' + i, owner: r.pick(D.SURNAMES) + 'さん', reason: r.pick(reasons),
        place: r.pick(D.PLACES), area, soil, buy, rent, price: Math.round(area * 10 * price10a), price10a,
      });
    }
    return out;
  }

  function genContracts(st) {
    const r = RG.rng.make(st.seed, st.year, 'contract');
    const n = 1 + (r.chance(0.6) ? 1 : 0) + (st.trust > 40 && r.chance(0.4) ? 1 : 0);
    const pool = D.CONTRACT_TEMPLATES.filter((t) =>
      (!t.minTrust || st.trust >= t.minTrust) && (!t.minBrand || st.brand >= t.minBrand) &&
      (!t.needFlag || st.flags[t.needFlag]) && (!t.minYear || st.year >= t.minYear));
    const out = [];
    const used = new Set();
    for (let i = 0; i < n && pool.length; i++) {
      const t = r.pick(pool);
      const key = t.buyer + t.crop;
      if (used.has(key)) continue;
      used.add(key);
      const crop = D.CROPS[t.crop];
      const premium = U.round(r.range(t.pmul[0], t.pmul[1]), 2);
      out.push({ id: 'C' + st.year + '_' + i, buyer: t.buyer, crop: t.crop, minCult: t.minCult,
        volume: round10(r.range(t.vol[0], t.vol[1])), premium, refPrice: round100(st.world.forecast * crop.priceCoef * premium), years: t.years });
    }
    return out;
  }

  function genUsed(st) {
    const r = RG.rng.make(st.seed, st.year, 'used');
    const n = r.int(1, 2);
    const candidates = ['tr_s', 'tr_m', 'pl_s', 'pl_m', 'cb_s', 'cb_m', 'dr_s', 'dr_m'];
    const out = [];
    for (let i = 0; i < n; i++) {
      const model = r.pick(candidates);
      const age = r.int(5, 9);
      const md = D.MODELS[model];
      const price = Math.round((md.price * 0.8 * Math.pow(0.88, age) * 0.95) / 10000) * 10000;
      out.push({ id: 'U' + st.year + '_' + i, model, age, price });
    }
    return out;
  }

  // ---------- ニュース ----------
  E.genNews = function (st) {
    const w = st.world, out = [];
    if (st.year === 1) out.push({ kind: 'info', text: st.farmName + 'の経営が始まりました。まずは各タブで今年の計画を立てましょう。' });
    out.push({ kind: 'info', text: '民間調査による今年の米価見通し：60kgあたり ' + U.num(w.forecastLow) + '〜' + U.num(w.forecastHigh) + '円（中心 ' + U.num(w.forecast) + '円）。' });
    if (w.inputNews) out.push({ kind: w.inputShock.fert > 1.3 ? 'bad' : 'warn', text: w.inputNews + '（肥料 ' + U.pct(w.inputShock.fert - 1) + '高）。' });
    if (st.grant && st.year <= st.grant.years) out.push({ kind: 'good', text: '就農支援金 ' + U.man(st.grant.amount) + ' が7月に支給されます（あと' + (st.grant.years - st.year + 1) + '年）。' });
    if (st.year >= 8 && st.year % 4 === 0) out.push({ kind: 'warn', text: '近年は猛暑の年が増えている。高温に強い品種や作業分散を考えたい。' });
    if (st.market.matInfl > 1.05 && st.year % 5 === 0) out.push({ kind: 'warn', text: '資材価格や賃金がじわじわ上がっている（就農時より 資材 +' + U.pct(st.market.matInfl - 1) + '、賃金 +' + U.pct(st.market.wageInfl - 1) + '）。' });
    const lr = st.lastResult;
    if (lr && lr.notes) lr.notes.forEach((t) => out.push({ kind: 'info', text: t }));
    (st.scrapped || []).forEach((m) => out.push({ kind: 'bad', text: D.MODELS[m].name + 'が寿命で使えなくなった。買い替えるか、作業を委託することになる（「機械・設備」タブ）。' }));
    RG.outlook.milestones(st, 1).filter((m) => m.kind !== 'loan' && m.level !== 'info').forEach((m) => out.push({ kind: m.level === 'bad' ? 'bad' : 'warn', text: '【山場】' + m.text + '。' }));
    return out;
  };

  // ---------- 年初イベント ----------
  const addCost = (st, amount, label, cat) => RG.state.addLedger(st, { amount: -amount, cat: cat || 'eventCost', label });
  const family = (st, tag) => st.family.find((f) => f.tag === tag);
  const poorArea = (st) => U.sum(st.fields.filter((f) => f.soil === 'poor'), (f) => f.area);
  const lastSales = (st) => (st.history.length ? st.history[st.history.length - 1].sales : 0);
  const lastIncome = (st) => (st.history.length ? st.history[st.history.length - 1].income : 0);

  E.POOL = [
    {
      id: 'father_retire', once: true, sq: 0,
      cond: (st) => !!family(st, 'father') && st.year >= 4,
      weight: (st) => (st.year >= 7 ? 100 : 0.8),
      title: '父の引退',
      text: () => '父が「体がきつくなってきた。そろそろ第一線を退きたい」と言っている。これまで年1,600時間ほど働いてくれていた。',
      choices: [
        { label: '感謝して引退を受け入れる', desc: '父の労働時間：年300時間（ときどき手伝い）', apply: (st) => { family(st, 'father').hours = 300; family(st, 'father').role = '引退（手伝い）'; return '父は引退した。人手の確保を考えよう。'; } },
        { label: 'あと1年だけ頼む', desc: '今年は年1,000時間。来年に必ず引退する', apply: (st) => { family(st, 'father').hours = 1000; st.flags.fatherLast = true; return '父はもう1年だけ手伝ってくれることになった。'; } },
      ],
    },
    {
      id: 'father_last', once: true, sq: 0,
      cond: (st) => st.flags.fatherLast && st.events.seen.father_retire < st.year,
      weight: () => 100,
      title: '父の完全引退',
      text: () => '約束どおり、父は今年から第一線を退く。',
      choices: [{ label: 'これまでありがとう', desc: '父の労働時間：年300時間', apply: (st) => { family(st, 'father').hours = 300; family(st, 'father').role = '引退（手伝い）'; return '父は引退した。'; } }],
    },
    {
      id: 'spouse_job', once: true,
      cond: (st) => st.scenarioId === 'shinki' && st.year >= 2 && st.year <= 6,
      weight: () => 0.7,
      title: '配偶者の働き方',
      text: () => '配偶者から「外でパートに出るか、農業に専念するか、そろそろ決めたい」と相談された。',
      choices: [
        { label: '農業に専念してもらう', desc: '配偶者の労働時間 600→1,500時間', apply: (st) => { st.family[1].hours = 1500; st.family[1].role = '家族（専従）'; return '配偶者が農業に専念することになった。'; } },
        { label: '外で働いてもらう', desc: '家計費の負担が年120万円減る。配偶者の労働時間は300時間に', apply: (st) => { st.family[1].hours = 300; st.living = Math.max(600000, st.living - 1200000); return '配偶者は外で働くことになった。家計にゆとりが出る。'; } },
      ],
    },
    {
      id: 'successor', once: true, sq: 1,
      cond: (st) => st.year >= 12 && !st.custom && !RG.state.successor(st) && (RG.state.operator(st).age || 50) >= 45,
      weight: () => 0.5,
      title: '後継者の就農希望',
      text: () => '子どもが「自分も農業をやりたい」と言ってきた。若い担い手が加わるのは心強いが、家計の負担も増える。',
      choices: [
        { label: '一緒に働こう', desc: '労働時間 +1,800時間、家計費（役員報酬） +60万円/年', apply: (st) => {
          const op = RG.state.operator(st);
          st.family.push({ id: 'p' + st.family.length, name: '子ども', role: '後継者', hours: 1800, age: U.clamp((op && op.age ? op.age : 50) - 28, 20, 30), tag: 'successor' });
          if (st.corp) st.execPay += 600000; else st.living += 600000;
          return '後継者が経営に加わった！'; } },
        { label: '外で経験を積んでからに', desc: '今は何も変わらない', apply: () => '子どもは外で経験を積むことになった。' },
      ],
    },
    {
      id: 'successor_join', once: true, sq: 0,
      cond: (st) => !!RG.state.pendingSuccessor(st) && st.year >= RG.state.pendingSuccessor(st).joinYear,
      weight: () => 100,
      title: '後継者の就農',
      text: (st) => '予定どおり、後継者（' + (RG.state.numOr(st.custom.succAge, 30) + (st.year - 1)) + '歳）が就農することになった。',
      choices: [{ label: '一緒に働こう', desc: '労働時間 +1,800時間、家計費（役員報酬） +60万円/年', apply: (st) => {
        RG.state.addPlannedSuccessor(st);
        return '後継者が経営に加わった！'; } }],
    },
    {
      id: 'machine_subsidy',
      cond: (st) => st.year >= 3,
      weight: () => 0.35,
      title: '機械導入の補助事業',
      text: () => '規模拡大を目指す経営体向けに、機械導入費の1/2を補助する事業の公募が始まった。申請には事業計画の作成が必要だ。',
      choices: [
        { label: '申請する（申請費用 5万円）', desc: '今年購入する新品機械1台が半額になる', apply: (st) => { addCost(st, 50000, '補助事業の申請費用'); st.yearFlags.machineSubsidy = true; return '補助事業に採択された。今年、新品機械を1台半額で購入できる。'; } },
        { label: '今回は見送る', desc: '', apply: () => '補助事業は見送った。' },
      ],
    },
    {
      id: 'training',
      cond: () => true,
      weight: (st) => (st.skill < 1.0 ? 0.5 : 0.15),
      title: '経営・栽培の研修会',
      text: () => '普及センター主催の研修会（栽培技術と経営分析）の案内が来た。',
      choices: [
        { label: '参加する（受講料 10万円）', desc: '技術力 +0.02（収量・品質・作業効率が上がる）', apply: (st) => { addCost(st, 100000, '研修会の受講料', 'recruit'); st.skill = Math.min(1.04, st.skill + 0.02); return '研修で多くを学んだ。技術力が上がった。'; } },
        { label: '忙しいので見送る', desc: '', apply: () => '研修は見送った。' },
      ],
    },
    {
      id: 'min_wage',
      cond: (st) => st.year >= 3 && st.partTimers > 0,
      weight: () => 0.25,
      title: '最低賃金の引き上げ',
      text: () => '最低賃金が大きく引き上げられることになった。パートの時給も上げざるを得ない。',
      choices: [{ label: 'やむを得ない', desc: 'パート時給 +5%', apply: (st) => { st.market.partWageBoost = (st.market.partWageBoost || 1) * 1.05; return 'パートの時給を5%引き上げた。'; } }],
    },
    {
      id: 'community', sq: 1,
      cond: () => true,
      weight: () => 0.6,
      title: '地域の共同作業',
      text: () => '集落の水路清掃と農道の草刈りへの参加を頼まれた。地域で農業を続けるには大切な活動だ。',
      choices: [
        { label: '参加する', desc: '夏の労働 +60時間、地域の信頼 +4', apply: (st) => { st.yearFlags.extraLabor = { summer: 60 }; st.trust = Math.min(100, st.trust + 4); return '共同作業に参加し、地域の人たちと親しくなった。'; } },
        { label: '出不足金を払う（3万円）', desc: '信頼は変わらない', apply: (st) => { addCost(st, 30000, '共同作業の出不足金'); return '出不足金を払った。'; } },
        { label: '断る', desc: '地域の信頼 -4', apply: (st) => { st.trust = Math.max(0, st.trust - 4); return '共同作業を断った。少し気まずい。'; } },
      ],
    },
    {
      id: 'waterway',
      cond: (st) => st.year >= 3,
      weight: () => 0.25,
      title: '用水路改修の負担金',
      text: (st) => '土地改良区が老朽化した用水路を改修する。耕作面積に応じた負担金（10aあたり3,000円、計' + U.man(E.waterwayCost(st)) + '）を求められた。',
      choices: [{ label: '支払う', desc: '', apply: (st) => { addCost(st, E.waterwayCost(st), '用水路改修の負担金'); return '負担金を支払った。'; } }],
    },
    {
      id: 'big_land',
      cond: (st) => st.year >= 4 && st.trust >= 35 && !(st.events.seen.big_land >= st.year - 5),
      weight: () => 0.5,
      title: '集落営農組織の解散',
      text: () => '隣の集落の営農組織がメンバーの高齢化で解散する。「12haをまとめて引き受けてもらえないか」と相談された（地代 10aあたり8,000円、条件は普通〜不利が混在）。',
      choices: [
        { label: '12haすべて引き受ける', desc: '地域の信頼 +10', apply: (st) => { E.addBlock(st, 12); st.trust = Math.min(100, st.trust + 10); return '12haを引き受けた。機械と人手の手当てが必要だ。'; } },
        { label: '条件の良い6haだけ', desc: '地域の信頼 +3', apply: (st) => { E.addBlock(st, 6); st.trust = Math.min(100, st.trust + 3); return '6haを引き受けた。'; } },
        { label: '断る', desc: '地域の信頼 -5', apply: (st) => { st.trust = Math.max(0, st.trust - 5); return '話を断った。'; } },
      ],
    },
    {
      id: 'feed_policy', once: true,
      cond: (st) => st.year >= 7 && st.year <= 13,
      weight: () => 0.35,
      title: '飼料用米の交付金見直し',
      text: () => '国の方針で、飼料用米への交付金が今年から3割減額されることになった。',
      choices: [{ label: '仕方ない', desc: '飼料用米の交付金 -30%', apply: (st) => { st.market.feedSubsidyMult *= 0.7; return '交付金が減額された。作付の見直しを考えよう。'; } }],
    },
    {
      id: 'shinnosuke_reg',
      cond: (st) => !st.flags.shinnosuke && st.year >= 2,
      weight: (st) => (st.year >= 3 ? 0.9 : 0.4),
      title: '新之助の生産者登録',
      text: () => 'JAから「新之助」の生産者登録の案内が届いた。登録には栽培研修の受講が必要で、決められた栽培基準を守ることが求められる。',
      choices: [
        { label: '登録する（研修費 5万円）', desc: '品種「新之助」が作付できるようになる', apply: (st) => { addCost(st, 50000, '新之助の栽培研修費', 'recruit'); st.flags.shinnosuke = true; return '新之助の生産者に登録した！「作付計画」で選べるようになった。'; } },
        { label: '今回は見送る', desc: 'また案内が来ることがある', apply: () => '新之助の登録は見送った。' },
      ],
    },
    {
      id: 'influencer',
      cond: (st) => st.direct.customers >= 20 && st.brand >= 8,
      weight: () => 0.25,
      title: 'SNSでの紹介の申し出',
      text: () => '料理研究家から「あなたのお米をSNSで紹介したい」と連絡が来た。サンプルの提供が必要だ。',
      choices: [
        { label: 'サンプルを送る（5万円）', desc: '直販の顧客が増え、ブランド力 +5', apply: (st) => {
          addCost(st, 50000, 'サンプル提供', 'marketing');
          const r = RG.rng.make(st.seed, st.year, 'ev-influencer');
          const n = r.int(30, 90);
          st.direct.customers += n; st.brand = Math.min(100, st.brand + 5);
          return '紹介記事が話題になり、新しい顧客が ' + n + '人増えた！'; } },
        { label: '断る', desc: '', apply: () => '申し出を断った。' },
      ],
    },
    {
      id: 'contest',
      cond: (st) => st.lastResult && st.lastResult.production.r1 >= 0.75 && st.direct.customers > 0,
      weight: () => 0.35,
      title: 'お米の食味コンクール',
      text: () => '全国規模のお米の食味コンクールの案内が届いた。入賞すれば知名度が大きく上がる。',
      choices: [
        { label: '出品する（3万円）', desc: '入賞すればブランド力 +15（外れても +2）', apply: (st) => {
          addCost(st, 30000, 'コンクール出品料', 'brand');
          const r = RG.rng.make(st.seed, st.year, 'ev-contest');
          const p = 0.15 + (st.lastResult.production.r1 - 0.75) * 1.2 + (st.skill - 0.95) * 2;
          if (r.chance(p)) { st.brand = Math.min(100, st.brand + 15); return 'コンクールで入賞した！ブランド力が大きく上がった。'; }
          st.brand = Math.min(100, st.brand + 2); return '惜しくも入賞は逃したが、名前は少し知られた。'; } },
        { label: '見送る', desc: '', apply: () => '今回は見送った。' },
      ],
    },
    {
      id: 'incorporate',
      cond: (st) => !st.corp && (lastSales(st) >= 25000000 || lastIncome(st) >= 8000000) && !st.flags.declinedCorp,
      weight: () => 1.5,
      title: '法人化の検討',
      text: () => '税理士から「この規模なら法人化を検討してはどうか」と勧められた。役員報酬を経費にでき、赤字の繰越もできる。社員も集めやすくなる。',
      choices: [
        { label: '法人化する（設立費用 30万円）', desc: '家計費の代わりに役員報酬（家計費＋100万円）を経費計上。法人税に切り替え', apply: (st) => {
          addCost(st, 300000, '法人設立費用');
          st.corp = true; st.execPay = st.living + 1000000; st.lossCarry = 0;
          return '農業法人「' + st.farmName + '」を設立した！'; } },
        { label: '今はしない', desc: '数年後にまた検討する', apply: (st) => { st.flags.declinedCorp = true; st.flags.declinedCorpYear = st.year; return '法人化は見送った。'; } },
      ],
    },
    {
      id: 'boar',
      cond: (st) => poorArea(st) > 0 && !st.flags.fence,
      weight: () => 0.35,
      title: 'イノシシの出没',
      text: (st) => '山際の田んぼでイノシシの足跡が見つかった。電気柵を張らないと被害が出るかもしれない（条件不利の田 ' + U.ha(poorArea(st)) + '）。',
      choices: [
        { label: '電気柵を設置する', desc: '費用 10aあたり6,000円（今後の被害を防ぐ）', apply: (st) => { addCost(st, poorArea(st) * 10 * 6000, '電気柵の設置'); st.flags.fence = true; return '電気柵を設置した。'; } },
        { label: '様子を見る', desc: '今年、条件不利の田の収量 -15%', apply: (st) => { st.yearFlags.boar = true; return '対策は見送った。'; } },
      ],
    },
    {
      id: 'staff_quit', sq: 0,
      cond: (st) => st.staff.length > 0,
      weight: () => 0.2,
      title: '社員の転職相談',
      text: (st) => st.staff[0].name + 'から「他の会社に誘われている」と相談された。',
      choices: [
        { label: '給料を上げて引き止める', desc: 'この社員の給与 +10%', apply: (st) => { st.staff[0].salary *= 1.1; return st.staff[0].name + 'は残ってくれることになった。'; } },
        { label: '引き止めない', desc: '社員が1人減る', apply: (st) => { const s = st.staff.shift(); return s.name + 'は退職した。'; } },
      ],
    },
    {
      id: 'bank_offer',
      cond: (st) => st.year >= 3 && RG.accounting.bs(st).equityRatio >= 0.3,
      weight: () => 0.2,
      title: '金融機関からの融資案内',
      text: () => '地域の金融機関から「経営内容が良いので、今年に限り設備資金を年0.8%で融資できる」と案内があった。',
      choices: [{ label: '覚えておく', desc: '今年の長期資金の金利が0.8%に', apply: (st) => { st.yearFlags.lowRate = true; return '今年は低金利で借りられる。'; } }],
    },
    {
      id: 'share_combine',
      cond: (st) => st.year >= 2,
      weight: () => 0.25,
      title: 'コンバインの共同利用',
      text: () => '近所の農家から「今年はコンバインを共同で使わないか」と誘われた。利用料を払えば8ha分の稲刈りができる。',
      choices: [
        { label: '共同利用する（25万円）', desc: '今年、コンバインの能力 +8ha', apply: (st) => { addCost(st, 250000, 'コンバインの共同利用料', 'contract'); st.yearFlags.shareCombine = true; return '共同利用することになった。'; } },
        { label: '断る', desc: '', apply: () => '誘いを断った。' },
      ],
    },
  ];

  E.waterwayCost = (st) => U.sum(st.fields, (f) => f.area) * 10 * 3000;

  E.addBlock = function (st, total) {
    const r = RG.rng.make(st.seed, st.year, 'block' + total);
    const place = r.pick(D.PLACES);
    let left = total, i = 1;
    while (left > 0.05) {
      const a = Math.min(left, U.round(r.range(1.5, 3), 1));
      const soil = total <= 6 ? 'normal' : r.chance(0.5) ? 'normal' : 'poor';
      st.fields.push(RG.state.makePlot(st, { area: a, soil, rent: 8000, name: place + '団地' + i + '号' }));
      left = U.round(left - a, 1); i++;
    }
    RG.state.addPlanArea(st, total);
  };

  E.genEvents = function (st) {
    const r = RG.rng.make(st.seed, st.year, 'events');
    if (st.flags.declinedCorp && st.year - st.flags.declinedCorpYear >= 4) st.flags.declinedCorp = false;
    const elig = E.POOL.filter((e) => !(e.once && st.events.seen[e.id]) && e.cond(st));
    // 必ず起きるイベント（weight 100）を先に
    const out = elig.filter((e) => e.weight(st) >= 100).map((e) => e.id);
    const rest = elig.filter((e) => e.weight(st) < 100);
    for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(r.next() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
    const maxN = st.year === 1 ? 0 : 2;
    let n = 0;
    for (const e of rest) {
      if (n >= maxN) break;
      if (r.chance(Math.min(0.9, e.weight(st) * 0.5))) { out.push(e.id); n++; }
    }
    return out;
  };

  E.get = (id) => E.POOL.find((e) => e.id === id);
  E.statusQuoChoice = (id) => { const e = E.get(id); return e.sq !== undefined ? e.sq : e.choices.length - 1; };

  // 前のできごとで状況が変わり、起きる条件を満たさなくなったできごとを取り除く
  E.prune = function (st) {
    while (st.events.queue.length && !E.get(st.events.queue[0]).cond(st)) st.events.queue.shift();
    if (!st.events.queue.length && st.phase === 'event') st.phase = 'plan';
  };

  E.choose = function (st, eventId, idx) {
    const ev = E.get(eventId);
    if (!ev.cond(st)) { st.events.queue = st.events.queue.filter((x) => x !== eventId); E.prune(st); if (!st.events.queue.length) st.phase = 'plan'; return ''; }
    const msg = ev.choices[idx].apply(st);
    st.events.seen[eventId] = st.year;
    st.events.queue = st.events.queue.filter((x) => x !== eventId);
    st.news.push({ kind: 'event', text: '【' + ev.title + '】' + msg });
    E.prune(st);
    if (!st.events.queue.length) st.phase = 'plan';
    return msg;
  };
})(window.RG = window.RG || {});
