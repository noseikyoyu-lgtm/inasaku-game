// 毎月のできごと：シーズン中、毎月1つ。行動を選び、サイコロで良いこと・悪いことが決まる（人生ゲームのように）。DOM 非依存
// 出た目：1・2＝うまくいかない、3・4＝ふつう、5・6＝うまくいく
(function (RG) {
  'use strict';
  const D = RG.data, U = RG.util;
  const ME = RG.monthly = {};

  const area10 = (st) => U.sum(st.fields, (f) => f.area) * 10;
  // e：y=収量（+0.01で+1%）q=品質（1等米の割合に効く点数）cost=出費 income=収入 trust brand cust=直販のお客さん skill bd=今年の機械の故障しやすさ（×） h=作業時間 { season: 時間 }
  const o = (t, e) => ({ t, e: e || {} });
  ME.EVENTS = [
    // ---------- 1月 ----------
    { id: 'shinnenkai', months: [1], who: 'tamura', icon: '🍶', title: '集落の新年会', text: '「今年も公民館で新年会をやるで。顔を出さんか？」',
      choices: [
        { label: '参加する', pre: { cost: 10000 }, out: [o('飲みすぎて二日酔い。それでも顔は売れた。', { trust: 1 }), o('近所の人と話がはずんだ。', { trust: 3 }), o('「うちの田んぼ、いずれ頼むかもしれん」と声をかけられた。', { trust: 5 })] },
        { label: '自分の経営の話をして回る', pre: { cost: 10000 }, out: [o('自慢話と受け取られてしまった。', { trust: -2 }), o('まじめな若いもんだと思われた。', { trust: 2 }), o('経営の工夫に感心され、評判が広まった。', { trust: 4, brand: 2 })] },
      ] },
    { id: 'kenshu', months: [1, 2], who: 'takahashi', icon: '📚', title: 'JAの冬の研修会', text: '「冬の研修会、今年は品質を上げる栽培の話だよ。来てみないかい？」',
      choices: [
        { label: '会場で受講する', pre: { cost: 30000, h: { winter: 10 } }, out: [o('知っている話ばかりだった。', { skill: 0.003 }), o('いくつか使えるコツを覚えた。', { skill: 0.008 }), o('目からうろこの話を聞き、さっそく試したくなった。', { skill: 0.012, q: 2 })] },
        { label: 'オンラインで受講する', pre: { cost: 10000 }, out: [o('途中で寝てしまった……。'), o('要点はおさえた。', { skill: 0.004 }), o('録画を何度も見返して身につけた。', { skill: 0.008 })] },
      ] },
    { id: 'yukioroshi', months: [1, 2], who: 'tamura', icon: '❄️', title: '大雪で雪下ろし', text: '大雪が続いた。「年寄りの家の屋根の雪下ろし、手伝ってもらえんか」',
      choices: [
        { label: '近所の雪下ろしを手伝う', pre: { h: { winter: 16 } }, out: [o('屋根で足をすべらせ、腰を痛めた。春の作業がつらい。', { trust: 2, h: { spring: 30 } }), o('とても感謝された。', { trust: 3, income: 15000 }), o('日当とお礼のお米券をもらった。', { trust: 4, income: 30000 })] },
        { label: '自分の家と作業場だけにする', out: [o('作業場の屋根が雪でへこんだ。', { cost: 60000 }), o('無事に冬を越せた。'), o('早めに片づき、機械の手入れもできた。', { bd: 0.9 })] },
      ] },
    // ---------- 2月 ----------
    { id: 'kakutei', months: [2], who: 'kimura', icon: '🧾', title: '確定申告の季節', text: '「申告の準備はお済みですか？ 経費の入れ忘れがあると、もったいないですよ」',
      choices: [
        { label: '税理士に頼む', pre: { cost: 50000 }, out: [o('とくに節税できるところはなかった。'), o('経費の整理で、税金が少し安くなった。', { income: 50000 }), o('使える特例を教わり、税金がだいぶ安くなった。', { income: 120000 })] },
        { label: '自分で申告する', pre: { h: { winter: 10 } }, out: [o('計算をまちがえ、あとで追加の税金を払った。', { cost: 30000 }), o('なんとか終わらせた。'), o('入れ忘れていた経費を見つけた。', { income: 30000 })] },
      ] },
    { id: 'tenken', months: [2, 3], who: 'oyama', icon: '🔧', title: '農機具屋の点検キャンペーン', text: '大山さん「今なら農機具屋が点検を安くやってくれるぞ。わしは毎年出しとる」',
      choices: [
        { label: '全部の機械を点検に出す', pre: { cost: (st) => 20000 * Math.max(1, st.machines.filter((m) => !m.lease).length) }, out: [o('大きな問題は見つからなかった。', { bd: 0.85 }), o('すり減った部品を交換した。', { bd: 0.7 }), o('壊れかけの部品を見つけ、早めに交換できた。', { bd: 0.5 })] },
        { label: '自分で油さしと点検をする', pre: { h: { winter: 8 } }, out: [o('どこが悪いのかよくわからなかった。'), o('ひととおり手入れした。', { bd: 0.9 }), o('ゆるんだボルトを見つけて締め直した。', { bd: 0.8 })] },
      ] },
    // ---------- 3月 ----------
    { id: 'shodoku', months: [3], who: 'takahashi', icon: '♨️', title: '種もみの消毒', text: '「種もみの消毒、お湯でやる方法もあるよ。農薬を使わずにすむけど、温度の管理が大事だ」',
      choices: [
        { label: 'お湯で消毒する（温湯消毒）', pre: { h: { spring: 6 } }, out: [o('お湯が熱すぎ、芽の出がそろわなかった。', { y: -0.005 }), o('農薬を使わずに消毒できた。', { q: 1 }), o('「農薬を減らした米」として、直販のお客さんにも喜ばれた。', { q: 2, brand: 2 })] },
        { label: '薬で消毒する', pre: { cost: 10000 }, out: [o('ばか苗病が少し出てしまった。', { y: -0.005 }), o('問題なく消毒できた。'), o('苗の病気がまったく出なかった。', { q: 1 })] },
      ] },
    { id: 'ikubyo', months: [3, 4], who: 'narr', icon: '🌱', title: '育苗ハウスの夜の冷え込み', text: '夜になると、ぐっと冷え込む日が続いている。苗が心配だ。',
      choices: [
        { label: '夜中も見回る', pre: { h: { spring: 12 } }, out: [o('寝不足でへとへとになった。', { h: { spring: 10 } }), o('苗は無事に育った。', { q: 1 }), o('苗がそろって、よく育った。', { y: 0.01, q: 1 })] },
        { label: '保温シートを買う', pre: { cost: 30000 }, out: [o('強い風でシートが飛ばされた。', { y: -0.005 }), o('苗は無事に育った。', { y: 0.005 }), o('苗がそろって、よく育った。', { y: 0.01 })] },
      ] },
    // ---------- 4月 ----------
    { id: 'taihi', months: [4], who: 'sato', icon: '🐄', title: '牛ふん堆肥を分けてもらえる', text: '佐藤さん「知り合いの牛飼いが、堆肥を安く分けてくれるそうだ。田んぼに入れてみんか」',
      choices: [
        { label: '田んぼに入れる', pre: { cost: (st) => Math.round(area10(st) * 1000), h: (st) => ({ spring: Math.round(area10(st) * 0.1) }) }, out: [o('まき方にむらが出てしまった。'), o('土がふかふかになった。', { y: 0.01 }), o('稲の根がよく張り、育ちがよかった。', { y: 0.02, q: 1 })] },
        { label: '一部の田だけで試す', pre: { cost: (st) => Math.round(area10(st) * 300) }, out: [o('違いはよくわからなかった。'), o('少し育ちがよくなった。', { y: 0.004 }), o('効果がはっきり出た。', { y: 0.008, skill: 0.003 })] },
      ] },
    { id: 'kouhou', months: [4, 5], who: 'ogawa', icon: '📰', title: '町の広報誌の取材', text: '小川さん「町の広報誌が、若い農家を特集するんですって。出てみたら？」',
      choices: [
        { label: '取材を受ける', pre: { h: { spring: 3 } }, out: [o('写真写りがいまひとつだった……。', { brand: 1 }), o('記事を見た人から声をかけられた。', { brand: 2, cust: 5 }), o('記事が評判になり、お米の問い合わせが来た。', { brand: 4, cust: 15 })] },
        { label: '田んぼの写真だけ提供する', out: [o('別の人の記事に埋もれてしまった。'), o('きれいな田んぼの写真が載った。', { brand: 1 }), o('表紙に使われた！', { brand: 3, cust: 5 })] },
      ] },
    // ---------- 5月 ----------
    { id: 'kids', months: [5], who: 'tamura', icon: '🧒', title: '小学校の田植え体験', text: '「小学校の子どもたちに、田植えを体験させてもらえんかのう」',
      choices: [
        { label: '受け入れる', pre: { h: { spring: 8 } }, out: [o('苗を少し踏まれてしまった。', { y: -0.003, trust: 2, brand: 1 }), o('子どもたちは大喜びだった。', { trust: 3, brand: 2 }), o('子どもたちの家族が、新米を予約してくれた。', { trust: 3, brand: 3, cust: 10 })] },
        { label: '見学だけにしてもらう', pre: { h: { spring: 2 } }, out: [o('子どもたちは少し退屈そうだった。', { trust: 1 }), o('田んぼの話をした。', { trust: 2 }), o('質問攻めにあい、楽しい時間になった。', { trust: 2, brand: 1 })] },
      ] },
    { id: 'taue_help', months: [5], who: 'oyama', icon: '🤝', title: '田植えの手伝いを頼まれた', text: '大山さん「田植機が止まってしもうた。半日でいいから手伝ってくれんか」',
      choices: [
        { label: '手伝う', pre: { h: { spring: 15 } }, out: [o('自分の田植えが少し遅れてしまった。', { y: -0.005, trust: 2 }), o('お礼をもらった。', { trust: 3, income: 20000 }), o('お礼に、使わなくなった道具を譲ってもらった。', { trust: 4, income: 20000, bd: 0.9 })] },
        { label: '機械だけ貸す', out: [o('貸した機械が調子を崩した。', { bd: 1.15, trust: 1 }), o('感謝された。', { trust: 2 }), o('お礼にお酒をもらい、関係が深まった。', { trust: 3 })] },
      ] },
    // ---------- 6月 ----------
    { id: 'hotaru', months: [6], who: 'narr', icon: '✨', title: '田んぼにホタルが飛んだ', text: '夜、田んぼのまわりにホタルが飛んでいる。農薬を減らしてきたおかげかもしれない。',
      choices: [
        { label: 'SNSに写真をのせる', out: [o('ほとんど誰にも見られなかった。'), o('「すてき！」と反応があった。', { brand: 2, cust: 5 }), o('写真が話題になり、お米の注文が来た。', { brand: 5, cust: 20 })] },
        { label: 'ホタルの観察会を開く', pre: { cost: 10000, h: { summer: 6 } }, out: [o('雨で中止になった。'), o('近所の家族連れが来てくれた。', { trust: 2, brand: 2 }), o('大盛況で、新米の予約まで入った。', { trust: 3, brand: 4, cust: 15 })] },
      ] },
    { id: 'tsuyu_kusa', months: [6, 7], who: 'narr', icon: '🌧️', title: '梅雨のあぜの草', text: '梅雨で、あぜの草がぐんぐん伸びている。',
      choices: [
        { label: '朝早くから草を刈る', pre: { h: { summer: 12 } }, out: [o('暑さで体調をくずした。', { h: { summer: 8 } }), o('すっきりした。', { q: 1 }), o('カメムシのすみかがなくなった。', { q: 3 })] },
        { label: '近所の人に草刈りを頼む', pre: { cost: 30000 }, out: [o('頼んだ日が雨で、刈れなかった。'), o('きれいに刈ってもらえた。', { q: 1, trust: 1 }), o('ていねいに刈ってもらえた。', { q: 2, trust: 2 })] },
      ] },
    // ---------- 7月 ----------
    { id: 'natsumatsuri', months: [7], who: 'tamura', icon: '🏮', title: '夏祭りに屋台を出す？', text: '「夏祭りで、去年の米でおにぎりを売ってみんか」',
      choices: [
        { label: 'おにぎりの屋台を出す', pre: { cost: 20000, h: { summer: 10 } }, out: [o('夕立で人が来なかった。'), o('よく売れた。', { income: 50000, cust: 5 }), o('行列ができ、お米の名前を覚えてもらえた。', { income: 100000, cust: 15, brand: 2 })] },
        { label: 'おにぎりを差し入れる', pre: { cost: 10000 }, out: [o('ほかの差し入れに埋もれた。'), o('喜んでもらえた。', { trust: 2 }), o('「どこの米？」と聞かれた。', { trust: 3, cust: 5 })] },
      ] },
    { id: 'mizuban', months: [7, 8], who: 'sato', icon: '💧', title: '水路の水が足りない', text: '佐藤さん「日照り続きで水が足りん。夜の水番、順番に回すことになった」',
      choices: [
        { label: '夜の水番を引き受ける', pre: { h: { summer: 10 } }, out: [o('眠い目をこすりながらやり通した。', { trust: 1 }), o('自分の田にも水が回った。', { trust: 3, y: 0.005 }), o('水がしっかり行きわたり、稲が元気になった。', { trust: 3, y: 0.01, q: 1 })] },
        { label: '自分の田だけ見回る', pre: { h: { summer: 4 } }, out: [o('「勝手なやつだ」と言われてしまった。', { trust: -2 }), o('自分の田は守れた。'), o('うまく水を回せた。', { y: 0.005 })] },
      ] },
    // ---------- 8月 ----------
    { id: 'obon', months: [8], who: 'narr', icon: '🏠', title: 'お盆に親戚が帰ってきた', text: 'お盆で、都会に住む親戚が帰ってきた。',
      choices: [
        { label: '新米の予約をすすめる', out: [o('「スーパーのほうが安い」と言われた。'), o('何人か予約してくれた。', { cust: 5 }), o('職場の人にも広めてくれることになった。', { cust: 12, brand: 1 })] },
        { label: '田んぼを案内する', pre: { h: { summer: 4 } }, out: [o('暑さでみんなすぐ帰ってしまった。'), o('子どもたちが喜んだ。', { brand: 1, cust: 3 }), o('写真をたくさん撮って広めてくれた。', { brand: 2, cust: 8 })] },
      ] },
    { id: 'tv', months: [8, 9], who: 'aoki', icon: '📺', title: '地元テレビの取材', text: '青木さん「地元のテレビ局が、新米の季節に農家を取材したいそうです。紹介していいですか？」',
      choices: [
        { label: '取材を受ける', pre: { h: { summer: 5 } }, out: [o('放送ではほとんどカットされていた……。', { brand: 1 }), o('「見たよ」と声をかけられた。', { brand: 3, cust: 10 }), o('放送のあと、問い合わせの電話が鳴りやまなかった。', { brand: 6, cust: 25 })] },
        { label: '今回は断る', out: [o('別の農家が取材され、評判になった。', { brand: -1 }), o('いつもどおりの毎日。'), o('そのぶん田んぼの見回りに集中できた。', { q: 1 })] },
      ] },
    // ---------- 9月 ----------
    { id: 'contest', months: [9], who: 'aoki', icon: '🏆', title: '米のコンクールに出す？', text: '青木さん「今年の米、食味コンクールに出してみませんか？」',
      choices: [
        { label: '出品する', pre: { cost: 10000 }, out: [o('残念ながら落選。', { brand: 0 }), o('佳作に入った。', { brand: 3 }), o('金賞！ 賞金5万円をもらった。', { brand: 8, income: 50000 })] },
        { label: '地区の品評会にだけ出す', out: [o('入賞できなかった。'), o('入賞した。', { brand: 1, trust: 1 }), o('地区で一番になった。', { brand: 3, trust: 2 })] },
      ] },
    { id: 'kariire_help', months: [9], who: 'narr', icon: '👷', title: '稲刈りの人手', text: '稲刈りがいよいよ始まる。臨時で人を頼もうか。',
      choices: [
        { label: '臨時で人を頼む', pre: { cost: 50000 }, out: [o('慣れない人で、あまりはかどらなかった。', { h: { autumn: -5 } }), o('作業がはかどった。', { h: { autumn: -15 } }), o('経験者が来てくれ、刈り遅れなく終わった。', { h: { autumn: -30 }, q: 1 })] },
        { label: '家族でがんばる', out: [o('疲れがたまって作業が遅れた。', { h: { autumn: 15 } }), o('なんとか乗り切った。'), o('段取りがよく、早く終わった。', { h: { autumn: -8 } })] },
      ] },
    // ---------- 10月 ----------
    { id: 'shinmai_fair', months: [10], who: 'aoki', icon: '🍚', title: '駅前の新米フェア', text: '青木さん「駅前で新米フェアがあります。出店してみませんか？」',
      choices: [
        { label: '出店する', pre: { cost: 30000, h: { autumn: 8 } }, out: [o('となりの店にお客を取られた。', { income: 10000 }), o('よく売れた。', { income: 60000, cust: 8 }), o('売り切れになり、直販のお客さんが増えた。', { income: 120000, cust: 20, brand: 2 })] },
        { label: 'チラシだけ置かせてもらう', pre: { cost: 5000 }, out: [o('ほとんど持っていかれなかった。'), o('何件か注文が来た。', { cust: 4 }), o('チラシを見た人から、たくさん注文が来た。', { cust: 10 })] },
      ] },
    { id: 'wara', months: [10, 11], who: 'tamura', icon: '🌾', title: '稲わらを分けてほしい', text: '「牛飼いの家が、稲わらを分けてほしいと言うとる」',
      choices: [
        { label: '集めて売る', pre: { h: { autumn: 8 } }, out: [o('雨続きで少ししか集められなかった。', { income: 10000 }), o('いい値段で引き取ってもらえた。', { income: 30000, trust: 1 }), o('たくさん引き取ってもらえ、堆肥ももらう約束をした。', { income: 50000, trust: 2 })] },
        { label: '取りに来てもらう', out: [o('来るのが遅れ、田の作業がずれた。', { h: { autumn: 4 } }), o('お礼にお菓子をもらった。', { trust: 1 }), o('お礼にお金も置いていってくれた。', { trust: 1, income: 15000 })] },
      ] },
    // ---------- 11月 ----------
    { id: 'shukakusai', months: [11], who: 'tamura', icon: '🎑', title: '集落の収穫祭', text: '「収穫祭で、新米の餅つきをせんか」',
      choices: [
        { label: '新米で餅つきをする', pre: { cost: 10000, h: { autumn: 4 } }, out: [o('餅が固くなってしまった。', { trust: 1 }), o('みんなで楽しく食べた。', { trust: 3 }), o('「今年の米はうまい」と評判になった。', { trust: 4, brand: 2, cust: 5 })] },
        { label: '片づけ係を引き受ける', pre: { h: { autumn: 3 } }, out: [o('あまり目立たなかった。', { trust: 1 }), o('感謝された。', { trust: 2 }), o('長老に気に入られた。', { trust: 4 })] },
      ] },
    { id: 'dojo', months: [11], who: 'takahashi', icon: '🔬', title: '土壌診断を受ける？', text: '「冬の前に、田んぼの土を調べてみないかい？ 来年の肥料の参考になるよ」',
      choices: [
        { label: '全部の田を診断する', pre: { cost: 30000 }, out: [o('とくに問題はなかった。', { skill: 0.002 }), o('肥料の入れ方の改善点がわかった。', { skill: 0.006 }), o('思わぬ栄養不足が見つかり、対策がわかった。', { skill: 0.01 })] },
        { label: '気になる田だけ診断する', pre: { cost: 10000 }, out: [o('よくわからなかった。'), o('少し参考になった。', { skill: 0.003 }), o('原因がはっきりした。', { skill: 0.006 })] },
      ] },
    { id: 'oseibo', months: [11, 12], who: 'ogawa', icon: '🎁', title: 'お歳暮に新米を贈る？', text: '小川さん「お世話になった人に新米を贈ると、次の注文につながりますよ」',
      choices: [
        { label: '得意先に新米を贈る', pre: { cost: 30000 }, out: [o('お返しが来ただけだった。'), o('来年の注文の約束をもらった。', { cust: 5, trust: 1 }), o('贈った先で評判になり、紹介が広がった。', { cust: 12, brand: 2 })] },
        { label: '年賀状で新米の案内をする', pre: { cost: 5000, h: { winter: 3 } }, out: [o('反応はなかった。'), o('何件か注文が来た。', { cust: 3 }), o('思った以上に注文が来た。', { cust: 8 })] },
      ] },
    // ---------- 12月 ----------
    { id: 'bonen', months: [12], who: 'oyama', icon: '🍻', title: '農家仲間の忘年会', text: '大山さん「農家仲間で忘年会をやるぞ。情報交換も兼ねてな」',
      choices: [
        { label: '参加する', pre: { cost: 10000 }, out: [o('飲みすぎて翌日つぶれた。'), o('来年の作付の話で盛り上がった。', { trust: 2, skill: 0.002 }), o('大規模農家から段取りのコツを教わった。', { trust: 3, skill: 0.006 })] },
        { label: '一次会だけ出る', pre: { cost: 5000 }, out: [o('あまり話せなかった。'), o('顔つなぎができた。', { trust: 1 }), o('いい情報をもらえた。', { trust: 2, skill: 0.003 })] },
      ] },
    { id: 'takarakuji', months: [12], who: 'narr', icon: '🎫', title: '年末の宝くじ', text: '町に年末の宝くじ売り場が出ている。夢を買ってみる？',
      choices: [
        { label: '10枚買う（3,000円）', pre: { cost: 3000 }, out: [o('全部はずれた。'), o('300円が当たった。', { income: 300 }), o('1万円が当たった！', { income: 10000, jackpot: true })] },
        { label: 'お守りを買いに神社へ行く（1,000円）', pre: { cost: 1000 }, out: [o('おみくじは「凶」だった……。'), o('おみくじは「吉」。', { trust: 0 }), o('おみくじは「大吉」！ お守りをもう1つもらった。', { omamori: 1 })] },
      ] },
  ];
  ME.def = (id) => ME.EVENTS.find((e) => e.id === id);

  // その月のできごと（シードで決まる。同じ年に同じできごとは出さない）
  ME.eventFor = function (st, month) {
    const used = {};
    for (let m = 1; m < month; m++) { const e = pick(st, m, used); if (e) used[e.id] = true; }
    return pick(st, month, used);
  };
  function pick(st, month, used) {
    const list = ME.EVENTS.filter((e) => e.months.indexOf(month) >= 0 && !used[e.id] && (!e.cond || e.cond(st)));
    if (!list.length) return null;
    return list[RG.rng.hash(st.seed, st.year, 'mev', month) % list.length];
  }

  ME.state = (st) => { const yf = st.yearFlags || (st.yearFlags = {}); return yf.mev || (yf.mev = {}); };
  ME.choiceOf = (st, month) => ME.state(st)[month] || null;
  // まだ選んでいない、今月のできごと
  ME.pending = function (st, month) {
    if (!st.seasonPending) return null;
    if (RG.events.seasonAt(st, month)) return null; // その月は、年のできごとのほう
    if (ME.choiceOf(st, month)) return null;
    return ME.eventFor(st, month);
  };
  const tier = (face) => (face <= 2 ? 0 : face <= 4 ? 1 : 2);
  const faceOf = (st, month, ci, n) => 1 + (RG.rng.hash(st.seed, st.year, 'mevroll', month, ci, n) % 6);
  ME.outcome = (ev, ci, face) => ev.choices[ci].out[tier(face)];
  // 選んでサイコロを振る（目はシードで決まる）
  ME.choose = function (st, month, ci) {
    const ev = ME.eventFor(st, month);
    if (!ev) return 0;
    const face = faceOf(st, month, ci, 0);
    ME.state(st)[month] = { id: ev.id, ci, face, n: 0 };
    return face;
  };
  ME.pass = function (st, month) { const ev = ME.eventFor(st, month); if (ev && !ME.choiceOf(st, month)) ME.state(st)[month] = { id: ev.id, ci: -1 }; };
  ME.reroll = function (st, month) {
    const c = ME.choiceOf(st, month);
    if (!c || c.ci < 0 || st.items.reroll <= 0) return 0;
    st.items.reroll -= 1;
    c.n += 1;
    c.face = faceOf(st, month, c.ci, c.n);
    return c.face;
  };
  // 自動で進めるとき（試算・検証）：ci が数字ならその行動、null なら見送る
  ME.autoAll = function (st, ci) {
    for (let m = 1; m <= 12; m++) {
      if (ME.choiceOf(st, m) || !ME.eventFor(st, m) || RG.events.seasonAt(st, m)) continue;
      if (ci == null) ME.pass(st, m); else ME.choose(st, m, ci);
    }
  };

  const val = (v, st) => (typeof v === 'function' ? v(st) : v);
  const SEASON_OF = (m) => (m <= 2 || m === 12 ? 'winter' : m <= 5 ? 'spring' : m <= 8 ? 'summer' : 'autumn');
  // 効果の説明
  const money = (v) => (Math.abs(v) < 10000 ? U.yen(v) : U.man(v)); // 1万円未満は円で（「＋0.0万円」と出ないように）
  ME.effText = function (e, st) {
    const t = [];
    if (e.income) t.push('＋' + money(e.income));
    if (e.cost) t.push('−' + money(e.cost));
    if (e.y) t.push('収量 ' + (e.y > 0 ? '+' : '') + U.round(e.y * 100, 1) + '%');
    if (e.q) t.push('品質 ' + (e.q > 0 ? '+' : '') + e.q);
    if (e.trust) t.push('地域の信頼 ' + (e.trust > 0 ? '+' : '') + e.trust);
    if (e.brand) t.push('ブランド力 ' + (e.brand > 0 ? '+' : '') + e.brand);
    if (e.cust) t.push('直販のお客さん +' + e.cust + '人');
    if (e.skill) t.push('技術力アップ');
    if (e.bd) t.push(e.bd < 1 ? '今年の機械の故障が減る' : '機械の故障が少し増える');
    if (e.omamori) t.push('お守り +' + e.omamori);
    const h = val(e.h, st);
    if (h) for (const s in h) t.push(D.SEASON_SHORT[s] + 'の作業 ' + (h[s] > 0 ? '+' : '−') + Math.abs(h[s]) + '時間');
    return t.join('・');
  };
  ME.preText = function (ch, st) {
    const p = ch.pre || {};
    const t = [];
    const c = val(p.cost, st), h = val(p.h, st);
    if (c) t.push(money(c));
    if (h) for (const s in h) t.push(D.SEASON_SHORT[s] + 'の作業 +' + h[s] + '時間');
    return t.join('・');
  };

  // ---------- シミュレーションへの反映 ----------
  // 収量・品質・作業時間・お金・機械の故障しやすさ（年をまたいで残るもの：信頼・ブランド・お客さん・技術・お守り は決算で反映）
  ME.addEffects = function (st, dfx, preview) {
    if (preview) return dfx;
    const s = ME.state(st);
    dfx.incomes = dfx.incomes || [];
    Object.keys(s).forEach((k) => {
      const m = +k, c = s[k], ev = ME.def(c.id);
      if (!ev || c.ci < 0) return;
      const ch = ev.choices[c.ci], out = ch.out[tier(c.face)], e = out.e, p = ch.pre || {};
      const pc = val(p.cost, st) || 0, ph = val(p.h, st) || {}, eh = val(e.h, st) || {};
      if (pc) dfx.costs.push({ month: m, amount: pc, label: ev.title + '（' + ch.label + '）' });
      if (e.cost) dfx.costs.push({ month: m, amount: e.cost, label: ev.title + '（出費）' });
      let inc = e.income || 0;
      if (e.jackpot && RG.rng.hash(st.seed, st.year, 'jackpot') % 300 === 0) inc = 1000000; // ごくまれに大当たり
      if (inc) dfx.incomes.push({ month: m, amount: inc, label: ev.title });
      [ph, eh].forEach((hh) => { for (const se in hh) dfx.labor[se] = (dfx.labor[se] || 0) + hh[se]; });
      if (e.y) dfx.y *= 1 + e.y;
      if (e.q) dfx.q += e.q;
      if (e.bd) dfx.bd = (dfx.bd || 1) * e.bd;
      const kind = c.face <= 2 ? 'bad' : c.face >= 5 ? 'good' : '';
      dfx.logs.push({ month: m, text: ev.icon + ' ' + ev.title + '：「' + ch.label + '」→ ' + RG.dice.FACES[c.face - 1] + ' ' + out.t + (inc >= 1000000 ? '（なんと100万円の大当たり！）' : ''), kind });
    });
    return dfx;
  };
  // 決算のとき：信頼・ブランド・お客さん・技術・お守り
  ME.applyEnd = function (st) {
    const s = ME.state(st);
    Object.keys(s).forEach((k) => {
      const c = s[k], ev = ME.def(c.id);
      if (!ev || c.ci < 0) return;
      const e = ev.choices[c.ci].out[tier(c.face)].e;
      if (e.trust) st.trust = U.clamp(st.trust + e.trust, 0, 100);
      if (e.brand) st.brand = U.clamp(st.brand + e.brand, 0, 100);
      if (e.cust) st.direct.customers += e.cust;
      if (e.skill) st.skill = Math.min(1.1, st.skill + e.skill);
      if (e.omamori) st.items.omamori += e.omamori;
    });
  };
  ME.SEASON_OF = SEASON_OF;
})(window.RG = window.RG || {});
