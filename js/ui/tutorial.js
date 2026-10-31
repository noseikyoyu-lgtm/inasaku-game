// チュートリアル：JA営農指導員の高橋さんが、画面の場所を指しながら説明する
// 1年目の計画は順を追って案内し、ほかの画面は初めて開いたときに短く説明する。上の「？ 説明」でいつでも呼べる
(function (RG) {
  'use strict';
  const UI = RG.ui, h = UI.h;
  const TU = RG.tutorial = {};

  const $ = (sel) => document.querySelector(sel);
  const byText = (sel, text) => () => Array.from(document.querySelectorAll(sel)).find((b) => b.textContent.indexOf(text) >= 0);

  // ---------- 説明の中身 ----------
  // target：指す場所（セレクタか、要素を返す関数）。tab：計画画面でそのタブに切り替えてから指す
  TU.TOURS = {
    plan: [
      { text: 'JAで営農指導をしている高橋です。田んぼのことも、お金のことも、なんでも聞いてほしい。これから長いつきあいになるね、よろしく頼むよ。\n経営はね、「段取り八分」。まずは1年目の段取りを、一緒に順番に見ていこう。' },
      { target: '.topbar .topstats', text: 'ここが経営の健康診断。「資金」「純資産」「借入」「経営面積」がいつでも見られる。\nいいかい、利益は意見、現金は事実。資金が尽きたら、どんなに腕がよくても経営は続けられない。ここはいつも気にかけておくこと。' },
      { target: '.nav', tab: 'overview', text: '計画は、このタブごとに立てる。順番に見ていけば大丈夫。\n赤い点がついているタブは「ちょっと見てごらん」という合図だよ。' },
      { target: '.layout > main', tab: 'overview', text: '「概況」は、いわば朝刊だね。今年のニュースや、これからの山場（機械の寿命や家族の年齢）がまとめてある。\n毎年まずここに目を通してから、計画を考えよう。' },
      { target: '.layout > main', tab: 'crops', text: 'いちばん大事なのが「作付計画」。どの品種を何ha作るかを決める。\n高く売れる品種ほど天気に弱かったりする。卵は一つのかごに盛るな、品種も一つに偏らせるな、だね。最初の年は、田んぼがまだ空っぽ。迷ったら、上の「作付の型」から選んでみるといい。' },
      { target: '.layout > main', tab: 'labor', text: '「労働力」では、季節ごとの作業時間が足りるかを見る。\n田んぼは正直でね、人手が足りないと刈り遅れて、収量も品質も落ちる。足りなければパートさんの出番だ。' },
      { target: '.layout > main', tab: 'sales', text: '「販売計画」では、農協・契約・直販にどれだけ売るかを決める。\n何も決めなければ農協に出荷される。高く売るか、安定して売るか。商売の基本は「売り先を一つにしない」ことだよ。' },
      { target: '.layout > main', tab: 'finance', text: '「資金・保険」では、借入や保険を決める。\n米のお金が入るのは秋。春から夏はお金が出ていく一方だから、米づくりは「お金の田植え」から始まるんだ。足りない月がないか、ここで確かめよう。' },
      { target: '.aside .card', tab: 'overview', text: '「今年の見通し」には、平年並みの天気だったら、どれだけ売れて、いくら手元に残るかが出る。\n計画を変えると数字もすぐ変わる。いわば経営の試し書きだね。見比べながら決めるといい。' },
      { target: byText('.aside .btn', 'この計画で1年を始める'), tab: 'overview', text: '段取りができたら、このボタンで1年を始めよう。1か月ずつ進むから、田んぼとお金の動きを一緒に見ていこう。\n点線の言葉を押せば意味が出るし、上の「？」ボタンでいつでも私を呼べる。呼ばれなくても、話しに来るけどね。', last: 'さあ、始めよう' },
    ],
    season: [
      { target: () => { const s = $('.month-strip'); return s && s.closest('.card'); }, text: 'さあ、シーズンの始まりだ。ここで、今が何月かと、その月の主な作業がわかるよ。' },
      { target: '.month-cash', text: 'これがその月のお金の出入りと、月末の資金。\n秋まで売上は入らないから、春から夏は資金が減っていく。財布の中身にも、季節があるんだね。' },
      { target: byText('.btn', '月へ進む'), text: 'このボタンで1か月ずつ進む。台風や病気の知らせが来たら、そこで止まって、どう備えるかを選ぶ。\n12月まで進んだら、お待ちかねの決算だ。', last: 'わかった' },
    ],
    crisis: [
      { target: () => { const c = $('.crisis-choices'); return c && c.closest('.card'); }, text: '来たね、「サイコロ勝負」だ。お金や人手をかけて備えれば、被害は小さくすむ。\n備えずにサイコロで勝負もできるけど、悪い目が出ると痛い。備えあれば憂いなし、ただし備えにもお金がかかる。天秤にかけて決めよう。', last: 'わかった' },
    ],
    result: [
      { target: '.section-title', text: '1年おつかれさま。ここが決算、つまり経営の通知表だ。今年の出来を一緒に振り返ろう。' },
      { target: '.tabs', text: 'タブを切り替えると、損益計算書・貸借対照表・資金繰り表・原価が見られる。\n全部読もうとしなくていい。最初は「サマリーと講評」と、お金の動きがわかる「資金繰り」だけで十分だよ。' },
      { target: () => { const r = document.querySelectorAll('.layout > main > .row'); return r.length ? r[r.length - 1] : null; }, text: '振り返ったら次の年へ。次の年の「概況」には、今年の結果をもとにした私のアドバイスを置いておくよ。反省は短く、次の段取りは長く、だ。', last: 'わかった' },
    ],
    dice: [
      { target: '.event-card .card', text: '年のはじめは、サイコロで運だめし。1が出ると不運のカード、6が出ると幸運のカードだ。\nお守りがあれば不運を防げるし、振り直し券があれば振り直せる。運も実力のうち、と言いたいところだけど、運は運だね。', last: '振ってみる' },
    ],
    event: [
      { target: '.event-card .card', text: '年のはじめには、いろんな話が舞い込んでくる。\nうまい話には裏がある、まずい話にも表がある。選択肢の説明をよく読んで選ぼう。', last: 'わかった' },
    ],
    midterm: [
      { target: '.goal-head', text: '5年ごとの中間評価、いわば健康診断だ。今のペースで続けたら、どんな評価になりそうかがわかる。' },
      { target: () => { const t = $('.tbl tr.me'); return t && t.closest('.card'); }, text: '同じ集落の農家とも比べられる。同じ天気、同じ米価でも、やり方で結果は変わる。人のふり見て我がふり直せ、だね。', last: 'わかった' },
    ],
  };

  // 今の画面に合う説明の名前
  TU.current = function (app) {
    const st = app.st;
    if (!st) return null;
    if (st.phase === 'plan' && !app.viewingLast) return 'plan';
    if (st.phase === 'season') return st.seasonPending && RG.dice.pending(st) && RG.dice.pending(st).month <= st.seasonMonth && !RG.dice.choiceOf(st, RG.dice.pending(st).id) ? 'crisis' : 'season';
    if (st.phase === 'result' || (st.phase === 'plan' && app.viewingLast)) return 'result';
    if (st.phase === 'dice') return 'dice';
    if (st.phase === 'event') return 'event';
    if (st.phase === 'midterm') return 'midterm';
    return null;
  };

  // 画面を描いたあとに呼ばれる：初めての画面なら説明を始める
  TU.check = function (app) {
    const st = app.st;
    if (!st || TU.active) return;
    st.tutorial = st.tutorial || { seen: {} };
    if (st.tutorial.off) return;
    const name = TU.current(app);
    if (!name || st.tutorial.seen[name]) return;
    if (name === 'plan' && st.year > 1) { st.tutorial.seen.plan = true; return; } // 途中から読み込んだゲームでは出さない
    st.tutorial.seen[name] = true;
    app.autosave();
    setTimeout(() => TU.start(app, name), 350);
  };

  // ---------- 表示 ----------
  TU.start = function (app, name) {
    const steps = TU.TOURS[name];
    if (!steps || TU.active) return;
    let i = 0;
    const root = h('div', { class: 'tut', role: 'dialog', 'aria-modal': 'true', 'aria-label': '高橋さんの説明' });
    const spot = h('div', { class: 'tut-spot' });
    const box = h('div', { class: 'tut-box' });
    root.appendChild(spot); root.appendChild(box);
    document.body.appendChild(root);
    TU.active = true;
    const scrolledFor = {}, capFor = {};

    const close = () => {
      TU.active = false;
      root.remove();
      window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); document.removeEventListener('keydown', onKey, true);
      if (name === 'plan' && app.tab !== 'overview') { app.tab = 'overview'; app.render(); }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    };
    function target() {
      const s = steps[i];
      if (!s.target) return null;
      const el = typeof s.target === 'function' ? s.target() : $(s.target);
      return el && el.getBoundingClientRect().width > 0 ? el : null;
    }
    function place() {
      const el = target();
      const vw = window.innerWidth, vh = window.innerHeight;
      if (!el) {
        spot.style.cssText = 'left:0;top:0;width:100vw;height:100vh;border-radius:0;outline:none;box-shadow:none;background:rgba(12,10,6,.62);';
        box.classList.add('center');
        box.style.left = ''; box.style.top = '';
        return;
      }
      box.classList.remove('center');
      const r0 = el.getBoundingClientRect(), pad = 8;
      // 大きな場所（タブの中身など）は、上の部分だけを囲んで、下に吹き出しを置く
      const tall = r0.height > vh * (vw < 640 ? 0.4 : 0.55) || capFor[i];
      const cap = capFor[i] ? Math.min(r0.height * 0.45, vh * 0.3) : vh * (vw < 640 ? 0.32 : 0.42);
      const r = tall ? { left: r0.left, right: r0.right, width: r0.width, top: r0.top, height: Math.min(r0.height, cap), bottom: r0.top + Math.min(r0.height, cap) } : r0;
      const top = Math.max(4, r.top - pad), left = Math.max(4, r.left - pad);
      const width = Math.min(vw - left - 4, r.width + pad * 2), height = Math.min(vh - top - 4, r.height + pad * 2);
      spot.style.cssText = 'left:' + left + 'px;top:' + top + 'px;width:' + width + 'px;height:' + height + 'px;';
      // 吹き出しは、指す場所と重ならない位置を、下・上・右・左・画面の上端・下端の順に探す。
      // どこも重なるときは、重なりがいちばん小さい位置にする
      const bw = Math.min(440, vw - 24), bh = box.offsetHeight || 220;
      const cx = Math.min(Math.max(12, r.left + r.width / 2 - bw / 2), vw - bw - 12);
      const cands = [
        [cx, r.bottom + 14], [cx, r.top - bh - 14], [r.right + 16, Math.min(Math.max(12, r.top), vh - bh - 12)],
        [r.left - bw - 16, Math.min(Math.max(12, r.top), vh - bh - 12)], [cx, 12], [cx, vh - bh - 12], [12, 12], [12, vh - bh - 12],
      ].filter((c) => c[0] >= 4 && c[0] + bw <= vw - 4 && c[1] >= 4 && c[1] + bh <= vh - 4);
      const hit = (c) => Math.max(0, Math.min(c[0] + bw, r.left + r.width + pad) - Math.max(c[0], r.left - pad)) * Math.max(0, Math.min(c[1] + bh, r.top + r.height + pad) - Math.max(c[1], r.top - pad));
      let best = cands.find((c) => hit(c) === 0);
      // 上下どちらにも入らないときは、指す場所が画面の上に来るまで1回だけスクロールして置き直す
      if (!best && !scrolledFor[i] && r.top > 80 && document.documentElement.scrollHeight > vh + 10) { scrolledFor[i] = true; window.scrollBy(0, r.top - 70); return; }
      // それでも置き場がないときは、指す場所の上の部分だけを囲んで、吹き出しをその下に置く
      if (!best && !capFor[i]) { capFor[i] = true; place(); return; }
      if (!best) best = cands.length ? cands.slice().sort((p, q) => hit(p) - hit(q))[0] : [12, vh - bh - 12];
      const bx = best[0], by = best[1];
      box.style.left = bx + 'px'; box.style.top = Math.max(12, by) + 'px'; box.style.width = bw + 'px';
    }
    function show() {
      const s = steps[i];
      if (s.tab && app.st && app.st.phase === 'plan' && app.tab !== s.tab) { app.tab = s.tab; app.render(); }
      box.innerHTML = '';
      // 話しているあいだ口が動く（文の長さに合わせて止まる）
      const pic = RG.portrait.svg('takahashi', 58, { label: '高橋さん', talk: true });
      const face = h('div', { class: 'tut-face' }, pic);
      clearTimeout(TU.talkTimer);
      TU.talkTimer = setTimeout(() => pic.classList.remove('talking'), Math.min(4500, 900 + s.text.length * 28));
      box.appendChild(h('div', { class: 'tut-head' }, face, h('div', null, h('b', null, '高橋さん'), h('div', { class: 'tut-role' }, 'JA営農指導員')),
        h('span', { class: 'tut-count' }, (i + 1) + ' / ' + steps.length)));
      box.appendChild(h('div', { class: 'tut-text' }, s.text.split('\n').map((t) => h('p', null, t))));
      const isLast = i === steps.length - 1;
      box.appendChild(h('div', { class: 'tut-actions' },
        h('button', { type: 'button', class: 'tut-skip', onclick: close }, isLast ? '' : '説明を閉じる'),
        h('span', { class: 'spacer' }),
        i > 0 ? UI.btn('戻る', () => go(-1), 'sm') : null,
        UI.btn(isLast ? (s.last || 'わかった') : '次へ ▶', () => (isLast ? close() : go(1)), 'primary sm', { 'data-tut-next': '1' })));
      const el = target();
      if (el) {
        const rr = el.getBoundingClientRect();
        if (rr.height > window.innerHeight * (window.innerWidth < 640 ? 0.4 : 0.55)) window.scrollTo(0, Math.max(0, rr.top + window.scrollY - 70));
        else el.scrollIntoView({ block: 'center' });
      }
      place();
      setTimeout(place, 60); // 吹き出しの高さが決まってから置き直す
      const nb = box.querySelector('[data-tut-next]'); if (nb) nb.focus({ preventScroll: true });
    }
    function go(d) { i = Math.max(0, Math.min(steps.length - 1, i + d)); show(); }

    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    document.addEventListener('keydown', onKey, true);
    show();
  };

  // 上のバーの「？ 説明」：今の画面の説明をもう一度
  TU.help = function (app) {
    const name = TU.current(app);
    if (name) TU.start(app, name);
    else UI.toast('この画面には説明がありません');
  };
})(window.RG = window.RG || {});
