// 社員を育てる・任せる、と、おまかせの進め方。DOM 非依存
(function (RG) {
  'use strict';
  const D = RG.data, U = RG.util, E = RG.events;
  const CR = RG.crew = {};

  // ======================================================================
  // 社員：得意なこと（水管理・機械・営業）とレベル（1〜5）。担当を任せると、その分野の出来がよくなる
  // ======================================================================
  CR.ROLES = {
    mizu: { icon: '💧', name: '水管理', desc: (lv) => '目が届く広さ +' + U.num(2 * lv, 1) + 'ha・品質 +' + (0.3 * lv).toFixed(1) + '点' },
    kikai: { icon: '🔧', name: '機械', desc: (lv) => '機械の点検・修理代 −' + U.num(3 * lv, 1) + '%' },
    eigyo: { icon: '🛒', name: '営業', desc: (lv) => '直販の新しいお客さん +' + U.num(4 * lv, 1) + '%' },
  };
  CR.ROLE_KEYS = ['mizu', 'kikai', 'eigyo'];
  CR.MAX_LV = 5;
  // 得意なことと、担当を決めていない社員（前の版のセーブ・採用したばかり）に入れる
  CR.ensure = function (st) {
    (st.staff || []).forEach((s) => {
      if (!s.skill) s.skill = CR.ROLE_KEYS[RG.rng.hash(st.seed, 'crew', s.id) % 3];
      if (!s.role) s.role = s.skill;
    });
  };
  // レベル：勤続3年ごとに1つ上がる（右腕に迎えると +1）
  CR.level = (s) => Math.min(CR.MAX_LV, 1 + Math.floor((s.years || 0) / 3) + (s.bonusLv || 0));
  // その担当の力（いちばん力のある社員。得意でない担当は半分の力）
  CR.roleLv = function (st, role) {
    let best = 0;
    (st.staff || []).forEach((s) => { if ((s.role || s.skill) === role) best = Math.max(best, CR.level(s) * (s.skill === role ? 1 : 0.5)); });
    return best;
  };
  CR.setRole = function (st, id, role) {
    const s = (st.staff || []).find((x) => x.id === id);
    if (!s || !CR.ROLES[role]) return '社員が見つかりません';
    s.role = role;
    return null;
  };

  // 独立したい（勤続6年以上・レベル4以上の社員から、1人に1回）
  const indepWho = (st) => (st.staff || []).find((s) => !s.indepAsked && !s.exec && (s.years || 0) >= 6 && CR.level(s) >= 4);
  E.POOL.push({
    id: 'crew_indep', once: false, sq: 1,
    cond: (st) => !!indepWho(st), weight: () => 0.6,
    title: '社員が独立したいと言ってきた',
    text: (st) => { const s = indepWho(st); return s.name + '（' + CR.ROLES[s.skill].name + 'が得意・レベル' + CR.level(s) + '・勤続' + s.years + '年）「社長、ここで覚えたことを生かして、いつか自分の田んぼをやってみたいんです。……来年あたり、独立させてもらえませんか」'; },
    choices: [
      { label: '送り出す（のれん分け）', desc: '社員が1人減る。地域の信頼 +5・ブランド力 +2（育てた人が地域で活躍する）', apply: (st) => { const s = indepWho(st); st.staff = st.staff.filter((x) => x !== s); st.trust = U.clamp(st.trust + 5, 0, 100); st.brand = U.clamp(st.brand + 2, 0, 100); st.crewAlumni = (st.crewAlumni || 0) + 1; return s.name + 'を送り出した。「近くで田んぼを始めます。困ったときは呼んでください」'; } },
      { label: '給料を2割上げて残ってもらう', desc: '給料 +20%。もう独立の話はしない', apply: (st) => { const s = indepWho(st); s.salary *= 1.2; s.indepAsked = true; return s.name + 'は「もう少しここで頑張ります」と言ってくれた。'; } },
      { label: '右腕（役員）に迎える', desc: '給料 +35%・レベル +1。経営の相談相手になる', apply: (st) => { const s = indepWho(st); s.salary *= 1.35; s.bonusLv = (s.bonusLv || 0) + 1; s.exec = true; s.indepAsked = true; return s.name + 'を役員に迎えた。「この会社を、一緒に大きくしましょう」'; } },
    ],
  });
  // 引き抜き：ライバルの大山さんが、育った社員に声をかける
  const poachWho = (st) => (st.staff || []).find((s) => !s.exec && CR.level(s) >= 3 && st.year - (s.poachYear || -9) >= 4);
  const oyamaOn = (st) => (st.rivals || []).some((r) => r.id === 'oyama' && r.active);
  E.POOL.push({
    id: 'crew_poach', once: false, sq: 0, who: 'oyama',
    cond: (st) => st.year >= 5 && oyamaOn(st) && !!poachWho(st), weight: () => 0.4,
    title: '社員の引き抜き',
    text: (st) => { const s = poachWho(st); return '大山さんのところから、' + s.name + '（' + CR.ROLES[s.skill].name + 'が得意・レベル' + CR.level(s) + '）に「うちで働かないか。給料は今より上げる」と声がかかっているらしい。'; },
    choices: [
      { label: '給料を15%上げて引き止める', desc: '給料 +15%', apply: (st) => { const s = poachWho(st); s.salary *= 1.15; s.poachYear = st.year; return s.name + '「ありがとうございます。ここで続けます」'; } },
      { label: '本人の気持ちにまかせる', desc: 'レベルが高いほど、移ってしまいやすい', apply: (st) => { const s = poachWho(st); s.poachYear = st.year;
        if (RG.rng.make(st.seed, st.year, 'poach', s.id).chance(0.25 + 0.1 * CR.level(s))) { st.staff = st.staff.filter((x) => x !== s); const o = (st.rivals || []).find((r) => r.id === 'oyama'); if (o) o.trust = Math.min(100, o.trust + 2); return s.name + 'は、大山さんのところへ移っていった。'; }
        return s.name + '「声はかけてもらいましたが、ここで頑張ります」'; } },
    ],
  });

  // ======================================================================
  // おまかせの進め方（st.pace === 'quick'）：大事なこと（年のできごと・サイコロ勝負）だけで止まる
  // ======================================================================
  CR.quick = (st) => st.pace === 'quick';
  CR.setPace = function (st, quick) { st.pace = quick ? 'quick' : 'full'; return null; };
  // 年の初め：運だめしは自動で振る（お守りは使わない）
  CR.beginYear = function (st) {
    CR.ensure(st);
    if (CR.quick(st) && RG.dice && RG.dice.active(st)) {
      const DI = RG.dice;
      if (!st.luck.rolls.length) DI.roll(st);
      if (!st.luck.card) DI.settle(st);
      DI.finish(st, false);
    }
    // 慣れてきたころに、おまかせの進め方を知らせる
    if (st.year === 4 && st.pace == null) st.news.push({ kind: 'info', text: '⏩ 慣れてきたら、計画の「概況」で「おまかせで進める」にできます。年のできごととサイコロ勝負だけで止まり、ほかは計画で決めたやり方で進みます。' });
  };
  // シーズン中：作業の判断は、計画で決めたやり方にする
  CR.autoWorks = function (st) {
    if (!RG.fieldwork) return;
    const FW = RG.fieldwork;
    for (let i = 0; i < 30; i++) { const w = FW.pending(st); if (!w) break; FW.choose(st, w.id, FW.keyOf(st, w.id, false), false); }
  };
})(window.RG = window.RG || {});
