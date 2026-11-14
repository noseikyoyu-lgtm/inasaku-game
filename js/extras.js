// 図鑑・備えのカード・ライバルとの勝負・引き継ぎ特典。DOM 非依存
(function (RG) {
  'use strict';
  const D = RG.data, U = RG.util, E = RG.events;
  const EX = RG.extras = {};
  const area = (st) => U.sum(st.fields, (f) => f.area);
  const cultArea = (st, c) => U.sum(RG.sim.planUnits(st).filter((u) => u.cult === c), (u) => u.area);
  const lowChem = (st) => cultArea(st, 'special') + cultArea(st, 'organic'); // 農薬を減らした田
  const poorShare = (st) => (area(st) > 0 ? U.sum(st.fields.filter((f) => f.soil === 'poor'), (f) => f.area) / area(st) : 0);

  // ======================================================================
  // 図鑑：作った品種・田んぼに来た生き物・経験した天候・持った機械を集める
  // ======================================================================
  // p：その年に来る確率。cond：来る条件。hint：まだ見ていないときの手がかり
  EX.LIFE = [
    { id: 'kaeru', icon: '🐸', name: 'アマガエル', p: 0.9, hint: '田んぼに水が入ると、どこからか集まってくる', note: '田植えのころ、夜の田んぼは大合唱になる。稲の害虫を食べてくれる。' },
    { id: 'tsubame', icon: '🐦', name: 'ツバメ', p: 0.5, hint: '春、田んぼの上を低く飛ぶ', note: '田んぼの泥で巣を作り、虫を食べる。ツバメが来る家は栄えるという。' },
    { id: 'sagi', icon: '🦢', name: 'シラサギ', p: 0.45, cond: (st) => area(st) >= 3, hint: '田んぼが3ha以上あると、えさを探しに来る', note: 'トラクターの後ろをついて歩き、掘り出されたカエルやドジョウをねらう。' },
    { id: 'tonbo', icon: '🪰', name: 'アキアカネ（赤とんぼ）', p: 0.5, hint: '秋、稲刈りのころに群れで飛ぶ', note: '田んぼで生まれ、夏は山ですごし、秋に赤くなって帰ってくる。' },
    { id: 'kamo', icon: '🦆', name: 'カルガモ', p: 0.3, hint: '田植えのあと、親子で泳いでいることがある', note: '植えたばかりの苗を踏むこともあるが、雑草の芽も食べる。' },
    { id: 'tanuki', icon: '🦝', name: 'タヌキ', p: 0.15, hint: 'あぜ道で、たまに見かける', note: '夜のあぜ道を歩き、カエルや虫を食べる。' },
    { id: 'inoshishi', icon: '🐗', name: 'イノシシ', p: 0.35, cond: (st) => poorShare(st) >= 0.3, hint: '山あいの田んぼが多いと出る', note: 'あぜを掘り返し、実った稲を倒す。電気柵で防ぐ。' },
    { id: 'dojo', icon: '🐟', name: 'ドジョウ', p: 0.5, cond: (st) => lowChem(st) > 0, hint: '農薬を減らした田んぼ（特別栽培・有機栽培）にいる', note: '田んぼの泥の中でくらす。昔は貴重なたんぱく源だった。' },
    { id: 'hotaru', icon: '✨', name: 'ホタル', p: 0.4, cond: (st) => lowChem(st) >= 0.5 || st.scenarioId === 'tanada', hint: '農薬を減らした田んぼが0.5ha以上あると、水路に飛ぶ', note: 'きれいな水路と、えさのカワニナがいる所にだけ飛ぶ。' },
    { id: 'medaka', icon: '🐠', name: 'メダカ', p: 0.4, cond: (st) => cultArea(st, 'organic') > 0, hint: '有機栽培の田んぼにいる', note: '田んぼと水路を行き来してふえる。今は絶滅が心配されている。' },
    { id: 'tagame', icon: '🪲', name: 'タガメ', p: 0.15, cond: (st) => cultArea(st, 'organic') >= 1, hint: '有機栽培の田んぼが1ha以上あると、まれに見つかる', note: '田んぼの王さまと呼ばれる大きな水生昆虫。ほとんど見られなくなった。' },
    { id: 'toki', icon: '🪶', name: 'トキ', p: 0.08, cond: (st) => cultArea(st, 'organic') >= 1 && st.trust >= 60, hint: '有機栽培の田んぼが1ha以上あり、地域の信頼が60以上だと、ごくまれに舞い降りる', note: '新潟・佐渡で野生にもどされた鳥。生き物の多い田んぼをえさ場にする。' },
  ];
  EX.CATS = [
    { id: 'life', icon: '🐸', name: '田んぼの生き物', list: () => EX.LIFE },
    { id: 'crop', icon: '🌾', name: '作った品種', list: () => Object.keys(D.CROPS).map((k) => ({ id: k, icon: '🌾', name: D.CROPS[k].name, hint: '作付計画で作ると記録される', note: D.CROPS[k].kind || '' })) },
    { id: 'weather', icon: '🌤', name: '経験した天候', list: () => Object.keys(D.YEAR_TYPES).map((k) => ({ id: k, icon: D.YEAR_TYPES[k].icon, name: D.YEAR_TYPES[k].name, hint: 'その天候の年を経験すると記録される', note: D.YEAR_TYPES[k].desc || '' })) },
    { id: 'machine', icon: '🚜', name: '持った機械', list: () => Object.keys(D.MODELS).map((k) => ({ id: k, icon: '🚜', name: D.MODELS[k].name, hint: '買う・リースすると記録される', note: '' })) },
  ];
  EX.zukan = (st) => st.zukan || (st.zukan = { life: {}, crop: {}, weather: {}, machine: {}, n: 0 });
  EX.zukanCount = (st) => { const z = EX.zukan(st); return U.sum(EX.CATS, (c) => Object.keys(z[c.id]).length); };
  EX.zukanTotal = () => U.sum(EX.CATS, (c) => c.list().length);
  EX.catDone = (st, id) => { const c = EX.CATS.find((x) => x.id === id), z = EX.zukan(st); return c.list().every((x) => z[id][x.id]); };
  // 決算のあと：その年に出会ったものを記録する。新しく5つ集めるごとに技術ポイント +1
  EX.zukanAfterYear = function (st, res) {
    const z = EX.zukan(st), found = [];
    const add = (cat, id, label) => { if (!z[cat][id]) { z[cat][id] = st.year; found.push(label); } };
    (res.production.plots || []).forEach((p) => { if (D.CROPS[p.crop]) add('crop', p.crop, '🌾' + D.CROPS[p.crop].name); });
    const yt = st.world && st.world.yearType; if (yt && D.YEAR_TYPES[yt]) add('weather', yt, D.YEAR_TYPES[yt].icon + D.YEAR_TYPES[yt].name);
    st.machines.forEach((m) => { if (D.MODELS[m.model]) add('machine', m.model, '🚜' + D.MODELS[m.model].name); });
    EX.LIFE.forEach((x) => {
      if (z.life[x.id] || (x.cond && !x.cond(st))) return;
      if (RG.rng.make(st.seed, st.year, 'life', x.id).chance(x.p)) add('life', x.id, x.icon + x.name);
    });
    if (!found.length) return [];
    const before = z.n || 0; z.n = before + found.length;
    const pts = Math.floor(z.n / 5) - Math.floor(before / 5);
    if (pts > 0 && RG.skills) { const k = RG.skills.state(st); k.pts += pts; k.earned = (k.earned || 0) + pts; }
    // 1年目は品種や機械がまとめて入るので、短くまとめる
    const names = found.length > 4 ? found.slice(0, 4).join('・') + ' ほか' + (found.length - 4) + '件' : found.join('・');
    return ['📔 図鑑に ' + found.length + '件 加わった：' + names + '（' + EX.zukanCount(st) + ' / ' + EX.zukanTotal() + '）' + (pts > 0 ? '。5件集めるごとのごほうびで、技術ポイント +' + pts : '')];
  };

  // ======================================================================
  // 備えのカード：年の初めに1枚もらい、シーズン中のサイコロ勝負で切ると、お金も手間もかけずに被害を防げる
  // ======================================================================
  EX.CARDS = {
    kusuri: { icon: '🧴', name: '防除の備え', for: ['blast', 'stinkbug'], w: 3, desc: 'いもち病・カメムシの注意報のときに使える（早めの見回りと予防で、発生を防ぐ）' },
    mizu: { icon: '💧', name: '水の備え', for: ['drought'], w: 2, desc: '雨が少なく用水が足りないときに使える（ため池と水路の手入れで、水を切らさない）' },
    kaze: { icon: '🌀', name: '台風の備え', for: ['typhoon'], w: 2, desc: '台風が近づいているときに使える（排水と刈り取りの段取りで、被害を防ぐ）' },
    kikai: { icon: '🔩', name: '予備の部品', for: ['planter', 'combine'], w: 3, desc: '田植機・コンバインの調子が悪いときに使える（冬の点検と予備の部品で、すぐ直す）' },
    joker: { icon: '🃏', name: 'とっておきの備え', for: null, w: 1, desc: 'どのサイコロ勝負にも使える' },
  };
  EX.HAND_MAX = 4;
  EX.FROM_YEAR = 2; // サイコロ勝負が始まる年から
  EX.hand = (st) => (st.cards || (st.cards = { hand: [] })).hand;
  // その勝負に使えるカード（専用のカードを先に、なければ「とっておき」）
  EX.cardFor = function (st, crisisId) {
    const hd = EX.hand(st);
    return hd.find((id) => EX.CARDS[id] && EX.CARDS[id].for && EX.CARDS[id].for.indexOf(crisisId) >= 0) || hd.find((id) => id === 'joker') || null;
  };
  EX.useCard = function (st, crisisId) {
    const id = EX.cardFor(st, crisisId);
    if (!id) return '使えるカードがありません';
    const hd = EX.hand(st); hd.splice(hd.indexOf(id), 1);
    const f = st.yearFlags || (st.yearFlags = {}); f.crisis = f.crisis || {};
    f.crisis[crisisId] = { choice: 'card', card: id, fixed: true };
    return null;
  };
  EX.drawCard = function (st, i) {
    const r = RG.rng.make(st.seed, st.year, 'card', i || 0), keys = Object.keys(EX.CARDS), tot = U.sum(keys, (k) => EX.CARDS[k].w);
    let x = r.next() * tot;
    for (const k of keys) { x -= EX.CARDS[k].w; if (x <= 0) return k; }
    return keys[0];
  };
  // 年の初め：カードを1枚（初めての年は2枚）。手札がいっぱいなら増えない
  EX.cardsBeginYear = function (st) {
    if (st.year < EX.FROM_YEAR) return;
    const hd = EX.hand(st), first = !st.cards.started, n = first ? 2 : 1, got = [];
    st.cards.started = true;
    for (let i = 0; i < n && hd.length < EX.HAND_MAX; i++) { const id = EX.drawCard(st, i); hd.push(id); got.push(EX.CARDS[id].icon + EX.CARDS[id].name); }
    if (first) st.events.queue.push('cards_intro');
    else if (got.length) st.news.unshift({ kind: 'good', text: '🃏 冬のあいだの備えで、備えのカード「' + got.join('」「') + '」を手に入れた（手札 ' + hd.length + ' / ' + EX.HAND_MAX + '枚）。' });
    else st.news.unshift({ kind: 'info', text: '🃏 備えのカードの手札がいっぱい（' + EX.HAND_MAX + '枚）なので、今年は増えなかった。' });
  };
  E.POOL.push({
    id: 'cards_intro', who: 'takahashi', once: true, sq: 0, cond: (st) => !!(st.cards && st.cards.started), weight: () => 0, // 年の初めに、初めてカードをもらったときだけ届く（抽選には入れない）
    title: '備えのカード',
    text: (st) => '「今年から、シーズン中に病気や台風の知らせが来ると、サイコロ勝負になる。そのとき役に立つのが、冬のあいだの備えだ。備えは『カード』で持っておける。今の手札は「' +
      EX.hand(st).map((id) => EX.CARDS[id].icon + EX.CARDS[id].name).join('」「') + '」。合う勝負のときに切れば、お金も手間もかけずに被害を防げるよ。カードは毎年の初めに1枚ふえて、' + EX.HAND_MAX + '枚まで持てる。どの勝負で切るか、とっておくかは、あんたしだいだ」',
    choices: [{ label: 'わかった', desc: '手札は、計画の「概況」と、サイコロ勝負のカードで見られる', apply: () => '備えのカードを受け取った。' }],
  });

  // ======================================================================
  // ライバルとの勝負：年の初めに勝負をいどまれる（受けるかは自分で決める）。農地の取り合いも
  // ======================================================================
  const active = (st) => (st.rivals || []).filter((r) => r.active);
  const THEMES = {
    yield: { name: '10aあたりの収量', unit: 'kg', mine: (res) => res.production.marketYieldPer10a, fmt: (v) => Math.round(v) + 'kg', base: { grow: 545, craft: 500, part: 505, group: 530, coop: 515, young: 490 }, sd: 22 },
    grade: { name: '1等米の割合', unit: '%', mine: (res) => res.production.r1 * 100, fmt: (v) => Math.round(v) + '%', base: { grow: 78, craft: 90, part: 76, group: 82, coop: 78, young: 72 }, sd: 8 },
  };
  EX.THEMES = THEMES;
  const duelRival = (st) => { const a = active(st).filter((r) => r.id !== 'nishikawa'); return a.length ? a[RG.rng.hash(st.seed, 'duel', st.year) % a.length] : null; };
  const duelTheme = (st, r) => { const d = RG.rivals.def(r.id); return d.style === 'craft' ? 'grade' : d.style === 'grow' || d.style === 'group' ? 'yield' : (RG.rng.hash(st.seed, 'duelT', st.year) % 2 ? 'yield' : 'grade'); };
  E.POOL.push({
    id: 'rival_duel', once: false, sq: 1,
    cond: (st) => st.year >= 3 && !st.duel && st.year - ((st.flags || {}).duelYear || -9) >= 3 && !!duelRival(st), weight: () => 100,
    title: 'ライバルからの勝負',
    text: (st) => { const r = duelRival(st), d = RG.rivals.def(r.id), t = THEMES[duelTheme(st, r)];
      return d.name + '（' + d.label + '）「今年は、' + t.name + 'で勝負しないか。同じ天気、同じ土地だ。言いわけはなしだぞ」（今年の決算で、あなたの' + t.name + 'が' + d.name + 'を上回れば勝ち）'; },
    choices: [
      { label: '受けて立つ', desc: '勝つと、地域の信頼 +3・技術ポイント +1。負けても失うものはない（くやしいだけ）', apply: (st) => { const r = duelRival(st); st.duel = { rival: r.id, theme: duelTheme(st, r), year: st.year }; st.flags.duelYear = st.year; return RG.rivals.def(r.id).name + 'との勝負を受けた。結果は今年の決算でわかる。'; } },
      { label: '今年はやめておく', desc: '3年後に、また声がかかる', apply: (st) => { st.flags.duelYear = st.year; return '勝負は見送った。'; } },
    ],
  });
  EX.duelAfterYear = function (st, res) {
    const du = st.duel;
    if (!du) return [];
    st.duel = null;
    const d = RG.rivals.def(du.rival), t = THEMES[du.theme];
    if (!d || !t) return [];
    const yt = (st.world && st.world.yearType) || 'normal', bad = yt === 'normal' ? 0 : du.theme === 'grade' ? -6 : -15; // 天候の悪い年は、相手も落とす
    const theirs = t.base[d.style] + bad + RG.rng.make(st.seed, du.year, 'duelR').normal(0, t.sd), mine = t.mine(res);
    const win = mine > theirs;
    st.duels = (st.duels || []).concat([{ year: du.year, rival: du.rival, theme: du.theme, mine, theirs, win }]);
    if (win) { st.trust = U.clamp(st.trust + 3, 0, 100); if (RG.skills) { const k = RG.skills.state(st); k.pts += 1; k.earned = (k.earned || 0) + 1; } }
    return ['⚔️ ' + d.name + 'との勝負（' + t.name + '）：あなた ' + t.fmt(mine) + '・' + d.name + ' ' + t.fmt(Math.min(du.theme === 'grade' ? 100 : 999, theirs)) + ' で、' +
      (win ? 'あなたの勝ちを達成！ 地域の信頼 +3・技術ポイント +1。' + d.name + '「……やるな。次は負けんぞ」' : 'あなたの負け。' + d.name + '「まだまだだな。また勝負しよう」')];
  };
  // 農地の取り合い：手放される田を、ライバルも欲しがっている
  const landRival = (st) => ['oyama', 'higashino'].map((id) => (st.rivals || []).find((r) => r.id === id)).find((r) => r && r.active) || null;
  const landSize = (st) => U.round(U.clamp(area(st) * 0.2, 1.5, 4), 1);
  const takeLand = (st, rent) => { const a = landSize(st), f = RG.state.makePlot(st, { area: a, soil: 'normal', rent, name: '取り合いで借りた田' }); st.fields.push(f); RG.state.addPlanArea(st, a); return a; };
  E.POOL.push({
    id: 'land_duel', once: false, sq: 2,
    cond: (st) => st.year >= 4 && st.year - ((st.flags || {}).landDuelYear || -9) >= 4 && !!landRival(st) && !(E.landBannedAt && E.landBannedAt(st, st.year)) && !(RG.challenge && RG.challenge.blockLand(st, landSize(st))),
    weight: () => 0.6,
    title: '田んぼの取り合い',
    text: (st) => { const d = RG.rivals.def(landRival(st).id); return '「となりの集落で、条件のよい田んぼ ' + U.ha(landSize(st)) + ' が出ることになった。地代は10aあたり9,000円が相場だ。ただ、' + d.name + 'も欲しがっていてね。地主さんは、迷っているようだよ」（地域の信頼：あなた ' + Math.round(st.trust) + '・' + d.name + ' ' + Math.round(landRival(st).trust) + '）'; },
    who: 'takahashi',
    choices: [
      { label: '地代を上乗せして借りる', desc: '10aあたり12,000円で、必ず借りられる', apply: (st) => { st.flags.landDuelYear = st.year; const a = takeLand(st, 12000); return '地代を上乗せして、' + U.ha(a) + ' を借りた。「作付計画」で作るものを決めよう。'; } },
      { label: '地域の信頼で頼む', desc: '相場の9,000円のまま。地域の信頼が相手より高ければ借りられる（低ければ相手に決まる）', apply: (st) => { st.flags.landDuelYear = st.year; const r = landRival(st), d = RG.rivals.def(r.id);
        if (st.trust > r.trust) { const a = takeLand(st, 9000); return '地主さん「あんたなら安心だ」。相場の地代で ' + U.ha(a) + ' を借りられた。「作付計画」で作るものを決めよう。'; }
        r.area = U.round(r.area + landSize(st), 1); return '地主さんは、付き合いの長い' + d.name + 'に貸すことにした。地域の信頼が足りなかった。'; } },
      { label: 'ゆずる', desc: '地域の信頼 +1', apply: (st) => { st.flags.landDuelYear = st.year; const r = landRival(st); r.area = U.round(r.area + landSize(st), 1); st.trust = U.clamp(st.trust + 1, 0, 100); return '今回は' + RG.rivals.def(r.id).name + 'にゆずった。'; } },
    ],
  });
  // 集落の番付：順位が変わった年に知らせる
  EX.rankAfterYear = function (st) {
    if (!st.rivals || !RG.rivals.table) return [];
    const rows = RG.rivals.table(st).filter((r) => r.active), rank = rows.findIndex((r) => r.me) + 1, prev = st.rankPrev;
    st.rankPrev = rank;
    if (!rank || !prev || prev === rank) return [];
    return rank < prev ? ['📊 集落の番付：' + prev + '位から ' + rank + '位に上がることを達成！（' + rows.length + '軒中。くわしくは「概況」の地域の農家）'] : ['📊 集落の番付：' + prev + '位から ' + rank + '位に下がった（' + rows.length + '軒中）。'];
  };

  // ======================================================================
  // 引き継ぎ特典：前のゲームでやりとげたことに応じて、次のゲームを始めるときに1つ選べる（このブラウザに残る）
  // ======================================================================
  const KEY = 'inasaku.unlocks';
  EX.PERKS = [
    { id: 'keiken', need: 'clear', icon: '🎒', name: '経験者', desc: '技術ポイント +3 で始める', how: 'どれかの経営を、最後の年までやりとげる' },
    { id: 'kao', need: 'promise', icon: '🤝', name: '顔なじみ', desc: '地域の信頼 +10 で始める', how: 'ストーリーで、物語の約束を果たす' },
    { id: 'takuwae', need: 'rich', icon: '💰', name: 'たくわえ', desc: '資金 +100万円 で始める', how: '最後の年に、純資産5,000万円以上でやりとげる' },
    { id: 'tehodoki', need: 'gold', icon: '🏆', name: '名人の手ほどき', desc: '米の品評会に、出品2回分の経験を持って始める（1回目から −2点ですむ）', how: '米の品評会で金賞をとる' },
  ];
  EX.unlocks = function () { try { const v = JSON.parse(localStorage.getItem(KEY) || '{}'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } };
  EX.unlock = function (ids) { try { const u = EX.unlocks(); let ch = false; ids.forEach((id) => { if (!u[id]) { u[id] = 1; ch = true; } }); if (ch) localStorage.setItem(KEY, JSON.stringify(u)); return ch; } catch (e) { return false; } };
  EX.perkOpen = (id) => { const p = EX.PERKS.find((x) => x.id === id); return !!p && !!EX.unlocks()[p.need]; };
  // 新しいゲームに特典をつける（S.newGame から。初めの純資産を測る前に呼ぶ）
  EX.applyPerk = function (st, id) {
    const p = EX.PERKS.find((x) => x.id === id);
    if (!p) return;
    st.perk = id;
    if (id === 'keiken' && RG.skills) { const k = RG.skills.state(st); k.pts += 3; k.earned += 3; }
    if (id === 'kao') st.trust = U.clamp(st.trust + 10, 0, 100);
    if (id === 'takuwae') st.cash += 1000000;
    if (id === 'tehodoki') st.contestExp = 2;
  };
  // 決算のあと：やりとげたことを覚えておく
  EX.unlockAfterYear = function (st, res) {
    const ids = [];
    if ((st.contests || []).some((c) => c.rank === 1)) ids.push('gold');
    if (!st.gameOver && st.mode !== 'endless' && st.year >= st.maxYear) {
      ids.push('clear');
      if (res.bs && res.bs.equity >= 5e7) ids.push('rich');
      if (RG.scenes && RG.scenes.isStory(st)) { try { const p = RG.scenes.def(st).conds(st).slice(1).every((c) => c.ok); if (p) ids.push('promise'); } catch (e) { /* 判定できなければ解放しない */ } }
    }
    if (st.mode === 'endless' && !st.gameOver && st.year >= 20) { ids.push('clear'); if (res.bs && res.bs.equity >= 5e7) ids.push('rich'); }
    const before = EX.unlocks(), fresh = ids.filter((id) => !before[id]);
    if (!fresh.length || !EX.unlock(fresh)) return [];
    return EX.PERKS.filter((p) => fresh.indexOf(p.need) >= 0).map((p) => '🔓 引き継ぎ特典「' + p.icon + p.name + '」が解放された（' + p.desc + '）。次に新しいゲームを始めるときに選べる。');
  };

  // ---------- 年の始まり・決算のあと ----------
  EX.beginYear = function (st) { EX.cardsBeginYear(st); };
  EX.afterYear = function (st, res) {
    return [].concat(EX.duelAfterYear(st, res), EX.rankAfterYear(st), EX.zukanAfterYear(st, res), EX.unlockAfterYear(st, res));
  };
})(window.RG = window.RG || {});
