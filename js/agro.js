// 栽培モデル：参考/rice_simulator.html（新潟 水稲栽培シミュレーター）の計算方法を年単位のゲーム用に移植したもの。
//   収穫日＝有効積算温度（基準10℃）、作期の適否、年タイプと気象イベント（重度・耐性・相乗・曝露）、
//   品質の低下幅から等級構成と実現単価、飼料用米の数量払い交付金
(function (RG) {
  'use strict';
  const D = RG.data, U = RG.util;
  const AG = RG.agro = {};
  const A = D.AGRO;

  // ---------- 日付（2026年・平年、通算日で扱う） ----------
  const MDAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const CUM = [0];
  for (let i = 0; i < 12; i++) CUM.push(CUM[i] + MDAYS[i]);
  AG.doy = (m, d) => CUM[m - 1] + d;
  AG.md = (doy) => {
    const n = Math.round(doy);
    let m = 1;
    while (m < 12 && n > CUM[m]) m++;
    return [m, n - CUM[m - 1]];
  };
  AG.fmt = (doy) => { const x = AG.md(doy); return x[0] + '/' + x[1]; };

  // 日平均気温（月平均の平年値を月央で線形補間）
  function dayTemp(doy, offset) {
    const [m, d] = AG.md(doy);
    const dim = MDAYS[m - 1];
    const frac = (d - dim / 2) / dim;
    const m2 = frac >= 0 ? (m === 12 ? 1 : m + 1) : (m === 1 ? 12 : m - 1);
    const w = Math.abs(frac);
    return A.tempNormal[m] * (1 - w) + A.tempNormal[m2] * w + (offset || 0);
  }

  // ---------- 作期と収穫日 ----------
  AG.bestMid = (v) => (AG.doy(v.bS[0], v.bS[1]) + AG.doy(v.bE[0], v.bE[1])) / 2;
  AG.plantMid = (v, shift) => Math.round(AG.bestMid(v) + (shift || 0));

  const gddCache = {};
  function reqGDD(v, plantMid) {
    const key = v.name + '|' + v.dy + '|' + plantMid;
    if (gddCache[key] !== undefined) return gddCache[key];
    let s = 0;
    for (let i = 0; i < v.dy; i++) s += Math.max(0, dayTemp(plantMid + i, 0) - 10);
    return (gddCache[key] = s);
  }
  // 年タイプの気温偏差で必要な積算温度に届く日（冷夏で届かなければ平年+30日で打ち切り）
  AG.harvestDoy = function (v, plantMid, offset) {
    if (!offset) return plantMid + v.dy;
    const need = reqGDD(v, plantMid);
    let s = 0, i = 0;
    while (s < need && i < v.dy + A.maxHarvestDelay) { s += Math.max(0, dayTemp(plantMid + i, offset) - 10); i++; }
    return plantMid + i;
  };

  // 田植え時期の適否：適期内なら影響なし、可能期間内なら軽い減収・品質低下、外れると大きく低下
  AG.timing = function (v, plantMid) {
    const bs = AG.doy(v.bS[0], v.bS[1]), be = AG.doy(v.bE[0], v.bE[1]);
    const os = AG.doy(v.pS[0], v.pS[1]), oe = AG.doy(v.pE[0], v.pE[1]);
    if (plantMid >= bs && plantMid <= be) return { m: 1, q: 0, label: '適期', cls: 'good' };
    const off = plantMid < bs ? bs - plantMid : plantMid - be;
    if (plantMid >= os && plantMid <= oe) {
      return { m: 1 - Math.min(off * 0.012, 0.15), q: -Math.min(off * 0.8, 8), label: plantMid < bs ? 'やや早い' : 'やや遅い', cls: 'warn' };
    }
    const out = plantMid < os ? os - plantMid : plantMid - oe;
    return { m: 1 - Math.min(0.15 + out * 0.025, 0.45), q: -Math.min(8 + out * 1.5, 25), label: plantMid < os ? '早すぎ' : '遅すぎ', cls: 'bad' };
  };

  AG.maturityLabel = (v) => (v.dy <= 108 ? '極早生' : v.dy <= 120 ? '早生' : v.dy <= 128 ? '中生' : v.dy <= 132 ? '中晩生' : '晩生');
  AG.tolLabel = (x) => (x < 0.4 ? '弱' : x < 0.58 ? '中' : x < 0.73 ? 'やや強' : '強');

  // ---------- 年タイプと気象イベント ----------
  AG.yearTypeProbs = function (year) {
    const boost = Math.min(0.12, 0.004 * year); // 温暖化で猛暑年が少しずつ増える
    return D.YEAR_TYPE_ORDER.map((k) => [k, D.YEAR_TYPES[k].p + (k === 'hot' ? boost : k === 'normal' ? -boost : 0)]);
  };
  function sevBiased(r, bias) {
    const x = r.next() + bias;
    return x < 0.40 ? 'light' : x < 0.75 ? 'mid' : 'heavy';
  }
  AG.drawEvents = function (r, ytKey) {
    const yt = D.YEAR_TYPES[ytKey];
    return D.EVENTS.map((e) => {
      const mult = yt.mult[e.id] !== undefined ? yt.mult[e.id] : 1;
      const hit = r.next() < Math.min(0.95, e.p * mult);
      const sev = hit ? sevBiased(r, yt.sevBias) : 'none';
      return { id: e.id, hit, sev };
    }).filter((e) => e.hit);
  };
  AG.synergy = (n) => (n <= 1 ? 1 : n === 2 ? 1.05 : n === 3 ? 1.12 : n === 4 ? 1.2 : 1.25 + 0.03 * (n - 5));
  const EVMAP = {};
  D.EVENTS.forEach((e) => { EVMAP[e.id] = e; });
  AG.event = (id) => EVMAP[id];

  // 時期の限られたイベントへの曝露（0〜1）：品種の弱い期間（収穫日の前後）とイベントの発生期間の重なり
  function exposure(e, hd) {
    if (!e.win || !e.vul) return 1;
    const w0 = AG.doy(e.win[0][0], e.win[0][1]), w1 = AG.doy(e.win[1][0], e.win[1][1]);
    const v0 = hd - e.vul[0], v1 = hd + e.vul[1];
    const len = Math.max(1, v1 - v0);
    return U.clamp((Math.min(v1, w1) - Math.max(v0, w0)) / len, 0, 1);
  }

  // 気象による収量係数（1=被害なし）と品質の減点
  AG.weatherFactor = function (v, events, hvShift, hd) {
    let wm = 1, qm = 0, lateY = 0, lateQ = 0;
    const fx = [];
    if (hvShift > 0) { lateY = Math.min(0.05, hvShift * 0.0022); lateQ = Math.min(3, hvShift * 0.12); wm -= lateY; qm -= lateQ; }
    const syn = AG.synergy(events.length);
    const akisaLate = U.clamp(1 + (hd - AG.doy(9, 20)) * 0.01, 1, 1.3); // 9/20より遅い収穫ほど秋雨に長く降られる
    events.forEach((ev) => {
      const e = EVMAP[ev.id];
      const tol = e.tol ? (v[e.tol] != null ? v[e.tol] : 0.5) : 0;
      const ex = exposure(e, hd) * (e.id === 'akisa' ? akisaLate : 1);
      const k = D.SEV[ev.sev].mult * (1 - tol) * syn * ex;
      wm += e.yi * k; qm += e.qi * k;
      fx.push({ id: e.id, sev: ev.sev, y: e.yi * k, q: e.qi * k, tol, ok: tol > 0.6 });
    });
    return { wm: Math.max(0.15, wm), qm, fx, lateY, lateQ };
  };

  // 気象係数の長期平均。平年単収 by を長期平均として扱うため、wm を割って正規化する（参考ファイルと同じ考え方）
  let normCache = null;
  AG.norm = function () {
    if (normCache) return normCache;
    const out = {};
    const keys = D.CROP_ORDER.filter((k) => !D.CROPS[k].fallow);
    keys.forEach((k) => { out[k] = { all: 0, allQ: 0, g1: 0 }; });
    const N = 400;
    D.YEAR_TYPE_ORDER.forEach((yk, yi) => {
      const yt = D.YEAR_TYPES[yk];
      const info = {};
      keys.forEach((k) => {
        const v = D.CROPS[k], pm = AG.plantMid(v, 0);
        const hdN = AG.harvestDoy(v, pm, 0), hd = AG.harvestDoy(v, pm, yt.temp);
        info[k] = { hd, shift: hd - hdN, w: 0, q: 0, g: 0 };
      });
      for (let t = 0; t < N; t++) {
        const evs = AG.drawEvents(RG.rng.make('norm', yi, t), yk);
        keys.forEach((k) => {
          const v = D.CROPS[k], f = AG.weatherFactor(v, evs, info[k].shift, info[k].hd);
          info[k].w += f.wm; info[k].q += f.qm; info[k].g += AG.gradeMix(-f.qm)[0];
        });
      }
      keys.forEach((k) => { out[k].all += yt.p * info[k].w / N; out[k].allQ += yt.p * info[k].q / N; out[k].g1 += yt.p * info[k].g / N; });
    });
    // 平年作の見通し用：長期平均の1等比率と同じになる品質の減点（平均の減点をそのまま使うと等級を低く見積もりすぎる）
    keys.forEach((k) => {
      let lo = -45, hi = 0;
      for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (AG.gradeMix(-m)[0] > out[k].g1) hi = m; else lo = m; }
      out[k].qEq = (lo + hi) / 2;
    });
    for (const k in D.CROPS) if (D.CROPS[k].alias) out[k] = out[D.CROP_RENAME[k]];
    return (normCache = out);
  };

  // ---------- 等級と単価 ----------
  // 品質の低下幅 d → [1等, 2等, 3等, 規格外] の構成比
  // 1等の割合は、低下幅が大きくなるにつれてなだらかに下がる（平年はおよそ8〜9割、猛暑年で6割前後、
  // 2023年のような記録的な猛暑が重なったときだけ1割を切る）。残りは低下幅に応じて2等・3等・規格外に分かれる
  AG.gradeMix = function (d) {
    const G = A.grade;
    const r1 = !(d > G.start) ? 1 : Math.max(G.floor, 1 - Math.pow((d - G.start) / G.scale, G.power));
    const rest = 1 - r1;
    const rx = rest * U.clamp((d - 30) / 50, 0, 0.4);
    const r3 = Math.min(rest - rx, rest * U.clamp((d - 14) / 30, 0, 0.8));
    return [r1, Math.max(0, rest - r3 - rx), r3, rx];
  };
  AG.gradePrices = function (v) {
    const p1 = v.pr, p2 = Math.min(v.pr2 != null ? v.pr2 : p1 - 600, p1);
    const p3 = Math.max(0, p2 - (p1 - p2) * A.grade3Gap);
    return [p1, p2, p3, Math.min(p1 * A.gradeX, p3)];
  };
  // 品質 q のときの等級構成と、1等単価に対する実現単価の比
  AG.gradeInfo = function (v, q) {
    const mix = AG.gradeMix(Math.max(0, v.bq - q));
    const P = AG.gradePrices(v);
    const price = mix[0] * P[0] + mix[1] * P[1] + mix[2] * P[2] + mix[3] * P[3];
    return { mix, coef: P[0] > 0 ? price / P[0] : 1 };
  };

  // ---------- 飼料用米の交付金（数量払い・多収品種） ----------
  AG.subsidyPer10a = function (v, yph) {
    const S = D.SALES;
    const slope = (S.feedSubsidyMax - S.feedSubsidyMin) / 300;
    return U.clamp(S.feedSubsidyBase + (yph - ((v.sub && v.sub.std) || 530)) * slope, S.feedSubsidyMin, S.feedSubsidyMax);
  };

  // ---------- 収穫スケジュール ----------
  // 収穫日の早い順に自前のコンバインで刈る。前の品種が終わらないと次に取りかかれないので、
  // 作期が重なると刈り遅れが出る（委託分は適期に刈れるものとする）
  AG.harvestSchedule = function (units, ownShare, capHa) {
    const rate = capHa > 0 ? (capHa / A.harvestWorkDays) * A.harvestWorkRate : 0; // 1日あたりの面積
    const list = units.slice().sort((a, b) => a.hd - b.hd);
    let t = -Infinity;
    list.forEach((u) => {
      const own = u.area * ownShare;
      if (own <= 0 || rate <= 0) { u.start = u.hd; u.end = u.hd + 3; u.late = 0; return; }
      const start = Math.max(u.hd, t);
      const dur = own / rate;
      u.start = start; u.end = start + dur;
      u.late = Math.max(0, start - u.hd + dur / 2 - A.harvestGrace) * ownShare;
      t = u.end;
    });
    return list;
  };
})(window.RG = window.RG || {});
