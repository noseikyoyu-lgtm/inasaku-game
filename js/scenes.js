// ストーリーモード：3つの物語（じいちゃんの田んぼ・山あいの棚田・農業法人の立て直し）
// 会話の場面・約束（ゴール）・エンディング・物語ごとのしかけ。DOM 非依存
(function (RG) {
  'use strict';
  const D = RG.data, U = RG.util, E = RG.events;
  const SC = RG.scenes = {};

  const area = (st) => U.sum(st.fields, (f) => f.area);
  const last3 = (st) => (st.history || []).slice(-3);
  const avg3 = (st, k) => U.avg(last3(st).map((x) => x[k]));
  const yearsCond = (st) => ({ label: st.maxYear + '年続ける', ok: !st.gameOver && st.history.length >= st.maxYear, now: st.history.length + '年' });
  const rankA = (st) => { const r = st.history.length && RG.score ? RG.score(st).rank : 'D'; return r === 'S' || r === 'A'; };
  const pathName = (st) => (st.path && RG.chapters ? RG.chapters.PATHS[st.path].name : '');

  // ======================================================================
  // 物語1：じいちゃんの田んぼ（20年）
  // ======================================================================
  const STORY = {
    goalName: 'じいちゃんとの約束', giver: 'jiichan',
    promiseText: '20年後も経営を続け、経営面積を15ha以上（じいちゃんの田んぼの7倍以上）にして、黒字の経営にすること',
    conds: (st) => [yearsCond(st),
      { label: '経営面積 15ha以上', ok: area(st) >= 15, now: U.ha(area(st)) },
      { label: '直近3年の平均所得が黒字', ok: last3(st).length > 0 && avg3(st, 'income') > 0, now: last3(st).length ? U.man(avg3(st, 'income')) : '—' }],
    star2: { label: 'さらに、選んだ経営の道の目標も達成', check: (st) => !!(st.path && RG.chapters.PATHS[st.path].check(st)) },
    star3: { label: 'さらに、最終評価がAランク以上', check: rankA },
    progress: (st) => ({ text: '🌾 ' + U.ha(area(st)) + ' / 15ha', v: Math.min(area(st), 15), max: 15 }),
    sceneAt: { 6: 'ch2', 11: 'ch3', 16: 'ch4' },
    scenes: {
      prologue: () => [
        { who: 'narr', text: '春の夕暮れ。久しぶりに、じいちゃんの家に帰ってきた。田んぼの向こうに、雪の残る山が見える。' },
        { who: 'jiichan', text: 'おう、よう来てくれた。……実はな、この冬に腰をやってしもうて、もう田んぼに出られそうにないんじゃ。' },
        { who: 'jiichan', text: 'ご先祖さんから受け継いだ、この2haの田んぼ。荒らしてしまうのは、どうにも忍びなくてのう。' },
        { who: 'jiichan', text: '……お前、うちの田んぼを、やってみてくれんか。' },
        { who: 'narr', text: '米づくりなんて、子どものころに手伝ったくらいだ。機械の動かし方も、お金のことも、わからないことだらけ。それでも――気づけば、うなずいていた。' },
        { who: 'jiichan', text: 'なに、わしも最初はなんもわからんかった。JAの高橋さんを紹介しよう。話は長いが、あの人は頼りになる。' },
        { who: 'takahashi', text: 'はじめまして、高橋です。おじいさんには昔からお世話になっていてね。田んぼのことも、お金のことも、一緒にやっていきましょう。' },
        { who: 'jiichan', text: 'それと、ひとつ約束してくれんか。20年後、この集落の田んぼを守れるくらいの百姓になっとってくれ。それが、わしの夢じゃ。' },
        { who: 'goal' },
      ],
      ch2: (st) => {
        const a = area(st), hs = st.history, inc = hs.length ? hs[hs.length - 1].income : 0;
        return [
          { who: 'jiichan', text: '5年、よう続けたのう。' + (a >= 4 ? '田んぼも' + U.ha(a) + 'に増えた。たいしたもんじゃ。' : 'まだ田んぼは小さいが、焦ることはない。根っこを張る時期じゃった。') },
          { who: 'jiichan', text: inc > 0 ? '去年はちゃんと儲けも出た。わしが若いころより、よっぽど上手じゃ。' : '儲けはまだこれからじゃな。じゃが、続けたことが何よりの財産じゃ。' },
          { who: 'jiichan', text: 'さて、ここからはお前の色を出す番じゃ。大きくするもよし、名のある米を作るもよし、地域の頼りになるもよし。お前の道を選べ。' },
        ];
      },
      ch3: (st) => [
        { who: 'jiichan', text: 'わしもすっかり足腰が弱ってのう。田んぼの見回りは、もう全部お前に任せる。' },
        { who: 'jiichan', text: '今の田んぼは ' + U.ha(area(st)) + '。約束の15haまで、' + (area(st) >= 15 ? 'もう届いとるな。あとは続けることじゃ。' : 'あと ' + U.ha(Math.max(0, 15 - area(st))) + '。お前ならやれる。') },
        { who: 'takahashi', text: 'これからは時代が大きく動きます。暑くなる夏、米の値段、機械の買い替え……。備えた人が生き残る時代です。予告をよく見ておきましょう。' },
      ],
      ch4: () => [
        { who: 'narr', text: '秋。じいちゃんの米寿（88歳）のお祝いに、親戚が集まった。食卓には、自分の作った新米が並んでいる。' },
        { who: 'jiichan', text: 'お前の米を食べて、ここまで長生きできた。ありがたいことじゃ。' },
        { who: 'jiichan', text: '次はお前が、誰に託すかを考える番じゃな。家族でも、外から来た若いもんでもええ。田んぼは、人がつないでいくもんじゃ。' },
      ],
    },
    beginYear: (st) => { if (st.year >= 11) st.family.forEach((f) => { if (f.tag === 'grandpa') f.hours = 0; }); }, // じいちゃんは第3章から田んぼに出なくなる
    ending: (st, p) => {
      if (st.gameOver) return { title: 'じいちゃんの田んぼを手放した', kind: 'bad', lines: [
        { who: 'jiichan', text: 'そうか……田んぼは、手放すことになったか。' },
        { who: 'jiichan', text: 'じゃがな、お前がうちの田んぼをやってみてくれたこと。わしは、それが何よりうれしかったんじゃ。' },
        { who: 'narr', text: '経営は続けられなかった。それでも、この経験は次の一歩になるはずだ。（もう一度、同じ条件で挑戦できます）' }] };
      if (!p.kept) return { title: 'じいちゃんの田んぼを守った', kind: 'normal', lines: [
        { who: 'jiichan', text: !p.conds[1].ok ? '20年、ようやってくれた。約束の広さには届かなんだが、うちの田んぼは今も青々としとる。'
          : '20年、ようやってくれた。田んぼはこんなに広うなった。じゃが、ここ何年かは儲けが出とらんのが気がかりじゃ。' },
        { who: 'jiichan', text: 'それで十分じゃ。……いや、欲を言えば、もう少し見たかったかのう。' },
        { who: 'narr', text: '約束はあと一歩。次はどの道を選び、どこまで広げられるだろう。' }] };
      if (p.stars >= 3) return { title: '米道をきわめた', kind: 'true', lines: [
        { who: 'jiichan', text: 'わしの夢は、とっくに超えとるよ。集落の田んぼを守るどころか、この土地の米の顔じゃ。' },
        { who: 'jiichan', text: (pathName(st) ? pathName(st) + 'を選んで、ぶれずに歩いてきた。' : '') + 'お前の米道、見事じゃった。……ありがとうな。' },
        { who: 'narr', text: '春。田んぼに水が入る。じいちゃんから受け取ったものを、今度は誰かに渡す番だ。' }] };
      return { title: '集落を守る百姓になった', kind: 'good', lines: [
        { who: 'jiichan', text: 'ようやった！ 約束どおり、集落の田んぼをお前が守ってくれとる。' },
        { who: 'jiichan', text: p.s2 ? 'しかも、' + pathName(st) + 'というお前らしいやり方でな。わしはもう、何も心配しとらん。' : 'わしはもう、何も心配しとらん。' },
        { who: 'narr', text: '20年前、2haから始まった田んぼは、今では集落の景色そのものになった。' }] };
    },
  };

  // ======================================================================
  // 物語2：山あいの棚田を守れ（20年）
  // 集落の田んぼは30ha。毎年、離農する人の田んぼが託され、引き受けないと荒れてしまう
  // ======================================================================
  const VILLAGE = 30;
  SC.VILLAGE = VILLAGE;
  const villagePct = (st) => (st.village ? (VILLAGE - st.village.abandoned) / VILLAGE : 1);
  const villageMine = (st) => U.sum(st.fields.filter((f) => f.village), (f) => f.area);
  SC.villageMine = villageMine;
  const heirOk = (st) => !!(RG.state.successor(st) || RG.state.pendingSuccessor(st) || st.family.some((f) => f.tag === 'trainee') || st.staff.length > 0);
  const TANADA = {
    goalName: '区長さんとの約束', giver: 'kucho',
    promiseText: '20年後も経営を続け、集落の田んぼ（30ha）の7割以上で米が作られているようにして、黒字の経営にすること',
    conds: (st) => [yearsCond(st),
      { label: '集落の田んぼの7割以上で米づくり', ok: villagePct(st) >= 0.7, now: U.pct(villagePct(st)) },
      { label: '直近3年の平均所得が黒字', ok: last3(st).length > 0 && avg3(st, 'income') > 0, now: last3(st).length ? U.man(avg3(st, 'income')) : '—' }],
    star2: { label: 'さらに、棚田米のブランド力が50以上', check: (st) => st.brand >= 50 },
    star3: { label: 'さらに、次の担い手（後継者・研修生・社員）がいる', check: heirOk },
    progress: (st) => ({ text: '⛰️ 集落の田んぼで米づくり ' + U.pct(villagePct(st)) + '（約束は70%以上・荒れた田 ' + U.ha(st.village ? st.village.abandoned : 0) + '）', v: villagePct(st), max: 1, map: true }),
    sceneAt: { 6: 'ch2', 11: 'ch3', 16: 'ch4' },
    chapters: {
      1: { name: '帰郷', icon: '⛰️', goal: '集落の田んぼを預かりながら、黒字の経営にする', intro: '小さな棚田ばかりで、手間はかかるよ。まずは引き受けた田んぼをきちんと回せる、経営の土台を作ろうね。',
        news: ['毎年、集落の人から「田んぼを預かってほしい」と頼まれる。断ると、その田は荒れてしまう', 'イノシシの被害もある', '3年目に「棚田米」として売り出す話', '5年目の終わりに中間評価と第1章のまとめ'] },
      2: { name: '預かる', goal: '選んだ道で、棚田の米の稼ぎ方を見つける', intro: '預かる田んぼは年々増えていくよ。手間に見合う稼ぎ方を見つけないと、広げるほど苦しくなるからね。' },
      3: { name: '守り方を選ぶ', goal: '手が回る広さを見きわめ、機械と人を整える', intro: '集落の高齢化は待ってくれない。全部を守るのは無理だから、どこを、どうやって守るかを選ぶ時期だよ。',
        news: ['集落に移り住みたいという若者が現れる', '機械の買い替えと、暑くなる夏への備え', '15年目の終わりに中間評価と第3章のまとめ'] },
      4: { name: 'つなぐ', goal: '次の担い手に、集落の田んぼを渡せる形にする', intro: 'いよいよ最後の5年。守ってきた棚田を、次の世代にどう手渡すかを考えようね。' },
    },
    scenes: {
      prologue: () => [
        { who: 'narr', text: '7年ぶりに帰ってきた、山あいの集落。夕日が棚田の石垣を照らしている。' },
        { who: 'kucho', text: '区長の森です。よう帰ってきてくれた。……見てのとおり、この集落は70を超えた年寄りばかりでな。' },
        { who: 'kucho', text: '体が動かんようになったら、田んぼはやめるしかない。このままだと10年もせんうちに、棚田は荒れ放題じゃ。' },
        { who: 'kucho', text: 'あんたの家の田んぼと、近所から預かった分で、まずは3ha。小さい田んぼばかりで手間はかかるが、景色は日本一じゃよ。' },
        { who: 'narr', text: '棚田には大きな機械が入らない。草刈りも水の管理も大変だ。それでも、この景色を残したいと思った。' },
        { who: 'takahashi', text: 'JAの高橋です。棚田は手間がかかるぶん、売り方しだいで高く売れる。それに、条件の悪い田んぼを守る活動には「中山間地域等直接支払」という交付金が10aあたり2万1千円出ます。手間と稼ぎのつり合いを、数字で一緒に考えましょう。' },
        { who: 'kucho', text: 'ひとつ約束してくれんか。20年後も、この集落の田んぼの7割で米を作っていてほしい。全部とは言わん。あんたが倒れたら元も子もないからの。' },
        { who: 'goal' },
      ],
      ch2: (st) => [
        { who: 'kucho', text: '5年、ようやってくれた。あんたの田んぼは ' + U.ha(villageMine(st)) + '。集落の田んぼの ' + U.pct(villagePct(st)) + ' で、まだ米が作られとる。' },
        { who: 'kucho', text: st.village.abandoned > 0 ? '荒れてしもうた田も ' + U.ha(st.village.abandoned) + ' ある。全部を守るのは無理じゃ。そこは気に病まんでええ。' : '今のところ、1枚も荒れとらん。たいしたもんじゃ。' },
        { who: 'kucho', text: 'これからは、あんたのやり方を決める番じゃ。広く預かるか、棚田米の名前で売るか、集落の作業を引き受けるか。' },
      ],
      ch3: (st) => [
        { who: 'kucho', text: 'わしも80になった。これからは、残っとる者の田んぼも次々に出てくるじゃろう。' },
        { who: 'kucho', text: '集落の田んぼで米が作られとるのは ' + U.pct(villagePct(st)) + '。約束の7割まで、' + (villagePct(st) >= 0.8 ? 'まだ余裕はある。じゃが、油断は禁物じゃ。' : 'もうひと踏ん張りじゃ。') },
        { who: 'takahashi', text: '手が回らない広さを抱えると、全部の田んぼの出来が落ちます。人を増やすか、機械を変えるか、預かる田を選ぶか。ここが思案のしどころですね。' },
      ],
      ch4: () => [
        { who: 'narr', text: '秋祭り。神社の境内に、新米で作ったおにぎりが並んだ。' },
        { who: 'kucho', text: 'こうして祭りができるのも、田んぼが残っとるからじゃ。' },
        { who: 'kucho', text: 'あとは、あんたの次じゃな。田んぼは、人がおらんと守れん。誰に、どう渡すか。考えておいてくれ。' },
      ],
    },
    init: (st) => {
      st.fields.forEach((f) => { f.village = true; });
      st.village = { abandoned: 0, others: U.round(VILLAGE - area(st), 1), pending: 0, log: [] };
    },
    beginYear: (st) => {
      const v = st.village;
      if (!v) return;
      v.pending = 0;
      // 中山間地域等直接支払：条件の悪い集落の田（急傾斜）を守る活動に、10aあたり2万1千円
      const hill = U.sum(st.fields.filter((f) => f.village && f.soil === 'poor'), (f) => f.area);
      if (hill > 0) RG.state.addLedger(st, { amount: Math.round(hill * 10 * D.VILLAGE_HILL_PAY), cat: 'subsidy', label: '中山間地域等直接支払交付金（' + U.ha(hill) + '）', month: 11 });
      if (st.year < 2 || v.others <= 0) return;
      // 年がたつほど、離農する人が増える
      const r = RG.rng.make(st.seed, st.year, 'village');
      const rel = Math.min(v.others, U.round(0.5 + 0.05 * st.year + r.next() * 0.5, 1));
      v.others = U.round(v.others - rel, 1);
      v.pending = rel;
      v.owner = ['田中', '石井', '小林', '中村', '岡田', '山田', '佐々木', '高木'][st.year % 8] + 'さん';
      st.events.queue.unshift('village_land');
    },
    ending: (st, p) => {
      if (st.gameOver) return { title: '集落を離れる日', kind: 'bad', lines: [
        { who: 'kucho', text: '……そうか。経営を続けるのは、難しかったか。' },
        { who: 'kucho', text: 'あんたが帰ってきて、棚田に人の声が戻った。それだけで、わしらは救われたんじゃ。' },
        { who: 'narr', text: '経営は続けられなかった。手間と稼ぎのつり合いを、もう一度考えてみよう。（同じ条件で挑戦できます）' }] };
      if (!p.kept) return { title: '守りきれなかった棚田', kind: 'normal', lines: !p.conds[1].ok ? [
        { who: 'kucho', text: '20年、ようがんばってくれた。荒れた田もあるが、あんたのおかげで残った田のほうが、ずっと多い。' },
        { who: 'kucho', text: '全部を守るのは、誰にもできんことじゃ。それでも……もう少し残せたかもしれんな。' },
        { who: 'narr', text: '約束はあと一歩。人と機械と売り方を、どう組み合わせれば守れたのだろう。' }] : [
        { who: 'kucho', text: '20年、ようがんばってくれた。集落の田んぼは、ちゃんと守られとる。' },
        { who: 'kucho', text: 'じゃが、ここ何年かは赤字続きじゃったな。田んぼを守っても、あんたが続けられんようでは元も子もない。' },
        { who: 'narr', text: '約束はあと一歩。人と機械と売り方を、どう組み合わせれば守れたのだろう。' }] };
      if (p.stars >= 3) return { title: '棚田の村の、次の100年へ', kind: 'true', lines: [
        { who: 'kucho', text: '棚田米は名前で売れるようになり、若いもんまで集落に来てくれた。こんな日が来るとは思わなんだ。' },
        { who: 'kucho', text: 'あんたは田んぼだけでなく、この集落の明日まで守ってくれた。……ありがとう。' },
        { who: 'narr', text: '春。棚田に水が張られ、空が何枚にも映る。この景色は、次の世代へ続いていく。' }] };
      return { title: '集落の田んぼを守った', kind: 'good', lines: [
        { who: 'kucho', text: '約束どおりじゃ！ 集落の田んぼは、ちゃんと米を実らせとる。' },
        { who: 'kucho', text: (p.s2 ? '棚田米の名前も、すっかり売れるようになった。' : p.s3 ? '次の担い手まで育ててくれた。' : 'あとは、次の担い手じゃな。') + 'あんたが帰ってきてくれて、本当によかった。' },
        { who: 'narr', text: '石垣の上の小さな田んぼが、今年も黄金色に揺れている。' }] };
    },
  };

  // ======================================================================
  // 物語3：農業法人を立て直せ（15年）
  // 3年目と5年目の決算のあとに融資の審査。社員の士気が下がると社員が辞める
  // ======================================================================
  const debtNow = (st) => { const h = st.history[st.history.length - 1]; return h ? h.debt : U.sum(st.loans, (l) => l.balance) + (st.emergency || 0); };
  const eqRatio = (st) => { const h = st.history[st.history.length - 1]; return h && h.assets > 0 ? h.equity / h.assets : (st.saiken ? st.saiken.ratio0 : 0); };
  const origLeft = (st) => (st.saiken ? st.saiken.orig.filter((id) => st.staff.some((s) => s.id === id)).length : 0);
  const SAIKEN = {
    goalName: '再建の約束', giver: 'kimura',
    promiseText: '15年目まで経営を続け、自己資本比率を50%以上にして、黒字の法人にすること',
    conds: (st) => [yearsCond(st),
      { label: '自己資本比率 50%以上', ok: eqRatio(st) >= 0.5, now: U.pct(eqRatio(st)) },
      { label: '直近3年の平均の税引前利益が黒字', ok: last3(st).length > 0 && avg3(st, 'preTax') > 0, now: last3(st).length ? U.man(avg3(st, 'preTax')) : '—' }],
    star2: { label: 'さらに、借入残高を始めたときの半分以下に', check: (st) => !!st.saiken && debtNow(st) <= st.saiken.debt0 / 2 },
    star3: { label: 'さらに、最初からいた社員が一人も辞めていない', check: (st) => !!st.saiken && origLeft(st) === st.saiken.orig.length },
    progress: (st) => ({ text: '📊 自己資本比率 ' + U.pct(eqRatio(st)) + ' / 50%　🏦 借入 ' + U.man(debtNow(st)) + '　🤝 社員の士気 ' + Math.round(st.saiken ? st.saiken.morale : 0), v: Math.max(0, Math.min(eqRatio(st), 0.5)), max: 0.5 }),
    sceneAt: { 4: 'review3', 6: 'ch2', 11: 'ch3' },
    chapters: {
      1: { name: '崖っぷち', icon: '⚠️', goal: '3年目と5年目の融資の審査を通る', intro: '借入、古い機械、赤字の契約。まずは決算書を読んで、お金が出ていく穴をふさぐところからだよ。',
        news: ['前の経営から引き継いだ借入・寿命間近の機械・赤字の契約', '3年目の決算のあとに審査（黒字か）。5年目のあとにも審査（5年目か3〜5年目の合計が黒字で、債務超過でないか）', '5年目の審査に落ちると、融資が止まって経営は終わる', '社員の士気が下がりすぎると、社員が辞めてしまう'] },
      2: { name: '立て直し', icon: '🔧', goal: '借入を減らしながら、選んだ道で稼ぐ力をつける', intro: '審査は乗り越えたね。ここからは守るだけでなく、この法人らしい稼ぎ方を作る番だよ。' },
      3: { name: '攻めに転じる', icon: '🚀', goal: '自己資本比率50%以上で、15年目を迎える', intro: 'いよいよ最後の章。立て直した法人を、胸を張って次の人に渡せる会社にしようね。',
        news: ['機械の買い替えの山と、米価の大きな波', '借入を減らす依頼、後継ぎを決める依頼', '15年目の終わりに最終評価と、再建のエンディング'] },
    },
    scenes: {
      prologue: (st) => [
        { who: 'narr', text: 'この春、40haを作る農業法人「' + st.farmName + '」の新しい社長になった。前の社長が急に引退し、知り合いの紹介で呼ばれたのだ。' },
        { who: 'kimura', text: '金融機関の木村です。率直に申し上げます。この法人の借入は5,200万円。機械は古く、去年は赤字でした。' },
        { who: 'kimura', text: '3年目と5年目の決算で、審査をさせてください。5年で立て直せなければ、これ以上はお貸しできません。' },
        { who: 'yamane', text: 'ベテランの山根です。前の社長とは30年やってきた。……正直、よそから来た人に何がわかるのかとは思ってますよ。' },
        { who: 'yamane', text: 'でもね、この田んぼと、仲間の仕事は守りたい。そこだけは同じです。' },
        { who: 'narr', text: '帳簿、契約書、機械の点検表。やることは山ほどある。まずは数字を読むところからだ。' },
        { who: 'takahashi', text: 'JAの高橋です。決算書は経営の健康診断。悪いところがわかれば、治し方もわかります。高い地代の田んぼ、使っていない機械、大型コンバインのリース、安すぎる契約、多すぎる人手。ひとつずつ見ていきましょう。' },
        { who: 'goal' },
      ],
      review3: (st) => (st.saiken && st.saiken.review3 ? [
        { who: 'kimura', text: '3年目の審査、通過です。黒字に戻しましたね。借り換えで返済期間を3年延ばし、金利も少し下げさせていただきます。毎年の返済が軽くなるはずです。' },
        { who: 'kimura', text: 'ただ、次の5年目が本番です。5年目の決算か、3〜5年目の合計が黒字で、債務超過でないこと。気を抜かないでください。' },
        { who: 'yamane', text: '……数字が良くなると、現場の空気も変わるもんですな。' },
      ] : [
        { who: 'kimura', text: '3年目の決算は赤字でした。申し訳ありませんが、金利を引き上げさせていただきます。' },
        { who: 'kimura', text: '5年目の審査では、5年目の決算か、3〜5年目の合計が黒字で、債務超過でないことが条件です。これが最後の機会です。' },
        { who: 'takahashi', text: '赤字の原因を、決算書で探しましょう。「原価」を見ると、10aあたりのお金がどこに逃げているかがわかります。' },
      ]),
      ch2: () => [
        { who: 'kimura', text: '5年目の審査、通過です。正直に言うと、ここまで立て直せるとは思っていませんでした。' },
        { who: 'yamane', text: 'あんたのやり方、最初は気に入らなかった。……だが、数字で話してくれるのはわかりやすい。' },
        { who: 'kimura', text: 'ここからは、守りだけでなく攻めも考えてください。規模か、ブランドか、地域の作業か。どんな法人にしたいかを決める時期です。' },
      ],
      ch3: (st) => [
        { who: 'yamane', text: 'わしもあと数年で定年だ。若いのに、田植えと稲刈りの段取りを全部教えておきますよ。' },
        { who: 'kimura', text: '自己資本比率は今 ' + U.pct(eqRatio(st)) + '。約束の50%まで、' + (eqRatio(st) >= 0.5 ? 'もう届いています。あとは崩さないことです。' : 'あと少し。利益を積み上げて、借入を減らしていきましょう。') },
        { who: 'takahashi', text: '機械の買い替えがまとめてやってきます。全部を新品で、全部を借入で、とはいかない。中古、リース、委託。組み合わせで乗り切りましょう。' },
      ],
    },
    init: (st) => {
      if (st.staff[0]) { st.staff[0].name = '山根さん'; st.staff[0].years = 30; }
      // 前の社長がリースで入れた大型コンバイン。自前のコンバインで足りるのに借りている（あと5年。途中でやめると1年分の解約金）
      const cb = RG.state.makeMachine(st, 'cb_l', { lease: true });
      cb.leaseYearsLeft = 5;
      st.machines.push(cb);
      const bs = RG.accounting.bs(st);
      st.saiken = { orig: st.staff.map((s) => s.id), morale: 50, debt0: U.sum(st.loans, (l) => l.balance), ratio0: bs.assets > 0 ? bs.equity / bs.assets : 0, lost: [] };
    },
    afterYear: (st, res) => {
      const sk = st.saiken, notes = [];
      if (!sk) return notes;
      const pt = res.pl.preTax;
      // 社員の士気：黒字なら上がり、赤字や人手不足で下がる
      sk.morale = U.clamp(sk.morale + (pt > 0 ? 5 : -8) - (D.SEASONS.some((s) => res.labor.seasons[s].ratio > 0.05) ? 8 : 0), 0, 100);
      if (sk.morale < 30 && st.staff.length) {
        const s = st.staff.slice().reverse().find((x) => sk.orig.indexOf(x.id) >= 0 && x.name !== '山根さん') || st.staff[st.staff.length - 1];
        st.staff = st.staff.filter((x) => x !== s);
        sk.lost.push(s.name);
        sk.morale = 45;
        notes.push('【社員の士気】士気が下がり、' + s.name + 'が会社を辞めてしまった。');
      }
      // 融資の審査
      if (st.year === 3) {
        sk.review3 = pt > 0;
        st.loans.forEach((l) => {
          if (l.kind === 'emergency') return;
          l.rate = Math.max(0.005, U.round(l.rate + (sk.review3 ? -0.003 : 0.005), 4));
          // 通過すると借り換え：返済期間を3年延ばして、毎年の返済額を軽くする
          if (sk.review3 && l.yearsLeft > 0) { l.yearsLeft += 3; l.original = l.balance; l.term = l.yearsLeft; l.repayYears = l.yearsLeft; }
        });
        notes.push(sk.review3 ? '【融資の審査】3年目の審査を通過した。借り換えで返済期間が3年延び、金利も0.3%下がる。' : '【融資の審査】3年目は赤字で、審査に通らなかった。借入の金利が0.5%上がる。5年目の審査が最後の機会だ。');
      }
      if (st.year === 5) {
        const sum = U.sum(st.history.filter((x) => x.year >= 3 && x.year <= 5), (x) => x.preTax);
        sk.review5 = (pt > 0 || sum > 0) && res.bs.equity > 0;
        if (sk.review5) { st.trust = Math.min(100, st.trust + 5); notes.push('【融資の審査】5年目の審査を通過した！ 立て直しの第一歩だ（地域の信頼 +5）。'); }
        else st.gameOver = { reason: 'bank', year: st.year, text: '5年目の融資の審査に通りませんでした（5年目の税引前利益 ' + U.man(pt) + '、3〜5年目の合計 ' + U.man(sum) + '、純資産 ' + U.man(res.bs.equity) + '）。金融機関からの融資が止まり、経営を続けられなくなりました。' };
      }
      return notes;
    },
    ending: (st, p) => {
      if (st.gameOver) return { title: st.gameOver.reason === 'bank' ? '融資が止まった' : '法人をたたむ日', kind: 'bad', lines: [
        { who: 'kimura', text: '……残念です。私どもも、これ以上はお支えできませんでした。' },
        { who: 'yamane', text: 'あんたは、よくやったよ。最後まで、わしらと一緒に田んぼに出てくれた。' },
        { who: 'narr', text: '再建はならなかった。決算書のどこで手を打てばよかったのか、もう一度たどってみよう。（同じ条件で挑戦できます）' }] };
      if (!p.kept) return { title: '立て直しは道半ば', kind: 'normal', lines: [
        { who: 'kimura', text: '15年、法人を守り抜かれました。約束の数字には届きませんでしたが、つぶれかけた会社がここまで来たのです。' },
        { who: 'yamane', text: '借金はまだ重いが、仕事はちゃんと回ってる。続きは、次の世代がやってくれるさ。' },
        { who: 'narr', text: '再建の約束まで、あと一歩。どこを削り、どこに投じれば届いたのだろう。' }] };
      if (p.stars >= 3) return { title: '再建の、その先へ', kind: 'true', lines: [
        { who: 'kimura', text: '借入は半分以下、自己資本も厚くなった。今では、こちらからお願いして貸したい会社です。' },
        { who: 'yamane', text: '誰ひとり辞めずに、ここまで来た。……あんたが社長でよかった。' },
        { who: 'narr', text: '15年前、赤字の帳簿から始まった会社は、地域で一番の働き口になった。' }] };
      return { title: '法人を立て直した', kind: 'good', lines: [
        { who: 'kimura', text: 'おめでとうございます。約束どおり、健全な会社に立て直されましたね。' },
        { who: 'yamane', text: p.s3 ? '仲間も誰ひとり欠けなかった。たいしたもんだ。' : '辞めていった仲間もいたが……残った者は、この会社を誇りに思ってますよ。' },
        { who: 'narr', text: '新しい機械の音が、春の田んぼに響いている。' }] };
    },
  };

  SC.STORIES = { story: STORY, tanada: TANADA, saiken: SAIKEN };
  SC.def = (st) => (st && SC.STORIES[st.scenarioId]) || null;
  SC.isStory = (st) => !!SC.def(st);

  // ---------- 約束（ゴール） ----------
  SC.promise = function (st) {
    const d = SC.def(st);
    if (!d) return { conds: [], kept: false, stars: 0 };
    const conds = d.conds(st);
    const kept = conds.every((c) => c.ok);
    const s2 = !!d.star2.check(st), s3 = !!d.star3.check(st);
    return { conds, kept, s2, s3, stars: kept ? 1 + (s2 ? 1 : 0) + (s3 ? 1 : 0) : 0 };
  };
  SC.chapterOv = (st, n) => { const d = SC.def(st); return d && d.chapters ? d.chapters[n] || null : null; };

  // ---------- 会話の場面 ----------
  // who：話し手（D.PEOPLE のキー）、'narr' はナレーション、'goal' は約束の表示
  SC.start = function (st, id) {
    st.scene = { id, i: 0 };
    st.phase = 'scene';
  };
  SC.lines = (st) => { const d = SC.def(st); return st.scene && d && d.scenes[st.scene.id] ? d.scenes[st.scene.id](st) : []; };
  // 場面を閉じて、章の扉（なければ運だめし・年初のできごと・計画）へ
  SC.finish = function (st) {
    st.scenesSeen = st.scenesSeen || {};
    if (st.scene) st.scenesSeen[st.scene.id] = true;
    st.scene = null;
    st.phase = RG.chapters && RG.chapters.needsDoor(st) ? 'chapter' : RG.dice && RG.dice.active(st) ? 'dice' : st.events.queue.length ? 'event' : 'plan';
  };
  // 年の始まり：節目の場面
  SC.due = function (st) {
    const d = SC.def(st);
    const id = d && d.sceneAt[st.year];
    return id && !(st.scenesSeen || {})[id] ? id : null;
  };
  SC.init = (st) => {
    const d = SC.def(st);
    if (!d) return;
    if (RG.era) RG.era.initCrops(st, st.plan.map((r) => r.crop).concat(st.contracts.map((c) => c.crop)));
    if (d.init) d.init(st);
    if (st.featOpen && st.machines.some((m) => m.lease)) st.featOpen.lease = true; // リースの機械を引き継いだ経営は、リースを最初から使える
  };
  SC.beginYear = (st) => { const d = SC.def(st); if (d && d.beginYear) d.beginYear(st); };
  SC.afterYear = (st, res) => { const d = SC.def(st); return d && d.afterYear ? d.afterYear(st, res) : []; };
  SC.ending = (st) => SC.def(st).ending(st, SC.promise(st));

  // ---------- 物語ごとのできごと ----------
  const story = (id) => (st) => st.scenarioId === id;
  const ledger = (st, amount, label) => RG.state.addLedger(st, { amount, cat: amount < 0 ? 'eventCost' : 'otherIncome', label });

  // じいちゃんの蓄え：資金繰りが苦しくなったら、一度だけ
  E.POOL.push({
    id: 'jiichan_help', who: 'jiichan', once: true, sq: 0,
    cond: (st) => story('story')(st) && st.year >= 3 && ((st.emergency || 0) > 0 || st.cash < 800000),
    weight: () => 100,
    title: 'じいちゃんの蓄え',
    text: () => '「帳面を見とったら、だいぶ苦しそうじゃな。……これは、わしが田んぼのためにと取っておいた金じゃ。使ってくれ。ただし、二度目はないぞ。なぜ苦しくなったか、高橋さんとよう考えるんじゃ」',
    choices: [
      { label: 'ありがたく受け取る', desc: '資金 +400万円（返さなくてよい・一度だけ）。頼ったぶん、自分で工夫する機会が減る（技術力が少し下がる）', apply: (st) => { RG.state.addLedger(st, { amount: 4000000, cat: 'capital', label: 'じいちゃんからの援助', month: 2 }); st.skill = Math.max(0.8, st.skill - 0.005); return 'じいちゃんから400万円を受け取った。'; } },
      { label: '気持ちだけ受け取る', desc: '自分の力でやってみる（地域の信頼 +3）', apply: (st) => { st.trust = Math.min(100, st.trust + 3); return '「そうか。たのもしいのう」じいちゃんは笑った。'; } },
    ],
  });

  // 棚田：集落の田んぼを預かる（毎年、年初のできごとの先頭に入る）
  const takeVillage = (st, a) => {
    const v = st.village;
    if (a > 0.05) {
      const f = RG.state.makePlot(st, { area: a, soil: 'poor', rent: 3000, name: v.owner + 'の棚田' });
      f.village = true;
      st.fields.push(f);
      RG.state.addPlanArea(st, a);
    }
    const lost = U.round(v.pending - a, 1);
    v.abandoned = U.round(v.abandoned + lost, 1);
    v.log.push({ year: st.year, owner: v.owner, area: v.pending, took: a });
    v.pending = 0;
    return lost;
  };
  E.POOL.push({
    id: 'village_land', who: 'kucho', sq: 2,
    cond: (st) => !!(st.village && st.village.pending > 0), weight: () => 0,
    title: '集落の田んぼを預かってほしい',
    text: (st) => '「' + st.village.owner + 'が、体を悪くして田んぼをやめることになった。棚田が ' + U.ha(st.village.pending) + '。あんたが預からんと、荒れてしまう。地代は10aあたり3,000円でええそうじゃ」（今の経営面積 ' + U.ha(area(st)) + '・荒れた田 ' + U.ha(st.village.abandoned) + '）',
    choices: [
      { label: '全部引き受ける', desc: '条件不利の田が増える（手間がかかる）。地域の信頼 +2', apply: (st) => { const a = st.village.pending; takeVillage(st, a); st.trust = Math.min(100, st.trust + 2); return U.ha(a) + 'の棚田を預かった。'; } },
      { label: '半分だけ引き受ける', desc: '残りの半分は荒れてしまう', apply: (st) => { const a = U.round(st.village.pending / 2, 1); const lost = takeVillage(st, a); return U.ha(a) + 'を預かった。' + U.ha(lost) + 'は荒れてしまう。'; } },
      { label: '今回は断る', desc: 'その田は荒れてしまう。地域の信頼 −2', apply: (st) => { const lost = takeVillage(st, 0); st.trust = Math.max(0, st.trust - 2); return U.ha(lost) + 'の棚田が荒れてしまう。'; } },
    ],
  });
  E.POOL.push({
    id: 'tanada_boar', who: 'kucho', sq: 1,
    cond: (st) => story('tanada')(st) && st.year >= 2 && !st.flags.fence, weight: () => 0.8,
    title: 'イノシシが棚田を荒らした',
    text: (st) => '「ゆうべ、イノシシが田んぼに入って、あぜを掘り返していきおった。電気柵を張らんと、毎年やられるぞ」（電気柵は経営面積 ' + U.ha(area(st)) + 'で約' + U.man(area(st) * 10 * 12000) + '）',
    choices: [
      { label: '電気柵を張る', desc: '費用はかかるが、これからの被害を防ぐ', apply: (st) => { ledger(st, -Math.round(area(st) * 10 * 12000), '電気柵の設置'); st.flags.fence = true; return '田んぼのまわりに電気柵を張った。'; } },
      { label: '見回りでしのぐ', desc: '今年の被害（10aあたり約3,000円）を受ける。また来るかも', apply: (st) => { ledger(st, -Math.round(area(st) * 10 * 3000), 'イノシシの被害'); return 'あぜを直し、見回りを増やした。'; } },
    ],
  });
  E.POOL.push({
    id: 'tanada_brand', who: 'ogawa', once: true, sq: 1,
    cond: (st) => story('tanada')(st) && st.year >= 3, weight: () => 100,
    title: '「棚田米」として売り出そう',
    text: () => '「棚田のお米、名前をつけて売り出しませんか？ 袋のデザインと、ふるさと納税への登録で50万円くらい。景色ごと買ってもらえるお米になりますよ」',
    choices: [
      { label: '棚田米として売り出す', desc: '50万円。ブランド力 +12・直販のお客さん +20人', apply: (st) => { ledger(st, -500000, '棚田米の売り出し'); st.brand = Math.min(100, st.brand + 12); st.direct.customers += 20; return '棚田米の名前で売り出した。'; } },
      { label: '今はやめておく', desc: '', apply: () => '今回は見送った。' },
    ],
  });
  E.POOL.push({
    id: 'tanada_newcomer', who: 'kucho', once: true, sq: 2,
    cond: (st) => story('tanada')(st) && st.year >= 11 && st.year <= 16, weight: () => 100,
    title: '集落に移り住みたい若者',
    text: () => '「町から、農業をやりたいという若い夫婦が下見に来とる。あんたのところで働かせてもらえんじゃろうか。いずれは、集落の田んぼを継いでくれるかもしれん」',
    choices: [
      { label: '社員として迎える', desc: '採用費と給料がかかるが、人手と次の担い手ができる', apply: (st) => { RG.actions.hireStaff(st, true); st.staff[st.staff.length - 1].name = '移住してきた若者'; st.trust = Math.min(100, st.trust + 3); return '移住してきた若者を社員に迎えた。'; } },
      { label: '研修生として受け入れる', desc: '年600時間働いてくれるが、賃金が毎年 約60万円かかる', apply: (st) => { st.family.push({ id: 'p' + st.family.length, name: '研修生', role: '研修生', hours: 600, age: 27, tag: 'trainee' }); return '研修生として受け入れた。'; } },
      { label: '今は難しい', desc: '', apply: () => '今回は断った。' },
    ],
  });

  // 法人の立て直し：社員の士気と赤字の契約
  const morale = (st, d) => { if (st.saiken) st.saiken.morale = U.clamp(st.saiken.morale + d, 0, 100); };
  E.POOL.push({
    id: 'saiken_yamane', who: 'yamane', once: true, sq: 0,
    cond: (st) => story('saiken')(st) && st.year === 1, weight: () => 100,
    title: '「前のやり方でいいんですよ」',
    text: () => '「社長、作付も段取りも、前のやり方で回ってきたんです。いきなり変えられても、現場は混乱するだけですよ」',
    choices: [
      { label: '話を聞いて、一緒に決める', desc: '社員の士気 +10。今年は前のやり方が多く残る（技術力の伸びがゆっくり）', apply: (st) => { morale(st, 10); st.skill = Math.max(0.8, st.skill - 0.005); return '山根さんと一緒に、今年の段取りを決めることにした。'; } },
      { label: '新しいやり方を通す', desc: '社員の士気 −15・技術力が少し上がる', apply: (st) => { morale(st, -15); st.skill = Math.max(st.skill, Math.min(1.04, st.skill + 0.02)); return '新しいやり方を通した。現場には不満が残った。'; } },
    ],
  });
  E.POOL.push({
    id: 'saiken_contract', who: 'takahashi', once: true, sq: 1,
    cond: (st) => story('saiken')(st) && st.contracts.some((c) => /前の社長/.test(c.buyer)), weight: () => 100,
    title: '赤字の契約を見直す',
    text: () => '「前の社長が結んだ業務用米の契約、相場より2割も安い値段なんです。あと4年残っていますが、違約金を払えばやめられます」',
    choices: [
      { label: '違約金100万円を払ってやめる', desc: 'その分のお米を、ほかの売り先に回せる', apply: (st) => { ledger(st, -1000000, '契約の違約金'); st.contracts = st.contracts.filter((c) => !/前の社長/.test(c.buyer)); return '赤字の契約をやめた。'; } },
      { label: '期限まで続ける', desc: '取引先との関係は守れる（地域の信頼 +2）', apply: (st) => { st.trust = Math.min(100, st.trust + 2); return '契約は期限まで続けることにした。'; } },
    ],
  });
  E.POOL.push({
    id: 'saiken_bonus', who: 'yamane', sq: 1,
    cond: (st) => story('saiken')(st) && st.year >= 3 && st.staff.length > 0 && !!st.lastResult && st.lastResult.pl.preTax > 0 && st.year - ((st.saiken && st.saiken.bonusYear) || 0) >= 2, weight: () => 100,
    title: '決算賞与を出すか',
    text: () => '「去年は黒字になりましたね。……みんな、ボーナスが出るかどうか気にしてますよ」',
    choices: [
      { label: '決算賞与を出す', desc: '社員1人20万円・社員の士気 +15', apply: (st) => { ledger(st, -200000 * st.staff.length, '決算賞与'); morale(st, 15); st.saiken.bonusYear = st.year; return '決算賞与を出した。'; } },
      { label: '今は借入の返済を優先', desc: '社員の士気 −8', apply: (st) => { morale(st, -8); st.saiken.bonusYear = st.year; return '賞与は見送った。'; } },
    ],
  });
  E.POOL.push({
    id: 'saiken_overwork', who: 'yamane', sq: 1,
    cond: (st) => story('saiken')(st) && !!st.lastResult && D.SEASONS.some((s) => st.lastResult.labor.seasons[s].ratio > 0.03), weight: () => 100,
    title: '「休みがほしい」',
    text: () => '「去年の春と秋は、休みなしで働きづめでした。若いのが、このままじゃ体がもたないと言ってます」',
    choices: [
      { label: 'パートを2人増やす', desc: '人件費は増えるが、社員の士気 +5', apply: (st) => { RG.state.addParts(st, 2); morale(st, 5); return 'パートを2人増やした。'; } },
      { label: '今年もがんばってもらう', desc: '社員の士気 −12', apply: (st) => { morale(st, -12); return '今年もがんばってもらうことにした。'; } },
    ],
  });
})(window.RG = window.RG || {});
