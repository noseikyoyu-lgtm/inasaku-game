// 年ごとの「世界」：年タイプ・気象イベント・全国作況・米価・資材価格・病害虫
(function (RG) {
  'use strict';
  const D = RG.data, U = RG.util;
  const M = RG.market = {};

  M.genWorld = function (st) {
    const AG = RG.agro;
    const r = RG.rng.make(st.seed, st.year, 'world');
    const yearType = r.weighted(AG.yearTypeProbs(st.year));
    const events = AG.drawEvents(r, yearType);
    const yt = D.YEAR_TYPES[yearType];

    // 全国の作柄の代理：コシヒカリBL（適期田植え）の気象係数を長期平均で割ったもの（参考ファイルと同じ考え方）
    const v = D.CROPS.koshiBL, pm = AG.plantMid(v, 0);
    const hdN = AG.harvestDoy(v, pm, 0), hd = AG.harvestDoy(v, pm, yt.temp);
    const yieldIdx = AG.weatherFactor(v, events, hd - hdN, hd).wm / AG.norm().koshiBL.all;
    const nationalIndex = 100 * yieldIdx + r.normal(0, 1.2);

    // 米価（コシヒカリ1等の概算金）：長期水準へ戻ろうとする動き × 年変動 × 作柄による自然ヘッジ（不作なら上がる）
    const prev = st.market.price, lr = st.market.longRun;
    const base = prev * Math.exp(0.4 * Math.log(lr / prev));
    const vol = D.AGRO.priceVol;
    const shockMult = U.clamp(Math.exp(r.normal(0, vol) - (vol * vol) / 2), 0.6, 1.8);
    const price = U.clamp(base * shockMult * (1 - D.AGRO.priceHedge * (nationalIndex / 100 - 1)), 9000, 32000);
    const forecast = U.clamp(base * Math.exp(r.normal(0, 0.03)), 9000, 32000);
    let shockText = null;
    if (shockMult > 1.15) shockText = '米の需給がひっ迫し、米価が大きく上がった';
    else if (shockMult < 0.87) shockText = '在庫が積み上がり、米価が値下がりした';
    // 米価が動いた理由（米の需給）：全国の作柄・在庫と引き合い・前年からの流れ
    const idx = Math.round(nationalIndex);
    const why = [];
    if (nationalIndex <= 98) why.push('全国の作柄が平年を下回り（作況指数' + idx + '）、出回る米が少なめ');
    else if (nationalIndex >= 102) why.push('全国的に豊作で（作況指数' + idx + '）、出回る米が多め');
    else why.push('全国の作柄はほぼ平年並み（作況指数' + idx + '）');
    if (shockMult >= 1.06) why.push('在庫が少なく引き合いが強い（需給が引き締まった）');
    else if (shockMult <= 0.94) why.push('在庫が積み上がり引き合いが弱い（需給が緩んだ）');
    const priceChange = Math.round(price) / prev - 1;
    // 前年からの流れは、実際の値動きと同じ向きのときだけ理由に挙げる
    if (base / prev <= 0.97 && priceChange < 0) why.push('前年までの高値から落ち着く流れ');
    else if (base / prev >= 1.03 && priceChange > 0) why.push('前年までの安値から持ち直す流れ');
    const marketReason = why.join('、') + '。米価は前年より' + (priceChange >= 0 ? '+' : '') + U.pct(priceChange, 1) + '。';

    // 資材価格：高騰は翌年に半分残る
    const carry = st.market.fertShock || 1;
    let fert = 1 + (carry - 1) * 0.5, fuel = 1 + (carry - 1) * 0.35;
    let inputNews = null;
    if (r.chance(0.07)) { fert = 1.45; fuel = 1.3; inputNews = '世界情勢の影響で肥料・燃料価格が高騰している'; }
    else if (fert > 1.02) inputNews = '肥料価格はやや高止まりしている';

    const pestName = yearType === 'hot' ? 'カメムシ（斑点米）' : (yearType === 'cold' || yearType === 'rain') ? 'いもち病' : 'ウンカ';
    const pest = { occurs: r.chance(yt.pestP), severity: r.range(0.05, 0.16), name: pestName };

    return {
      year: st.year, yearType, events, localWeather: yearType, nationalIndex,
      price: Math.round(price), forecast: Math.round(forecast),
      forecastLow: Math.round(forecast * 0.88), forecastHigh: Math.round(forecast * 1.12),
      shock: shockMult - 1, shockText, marketReason, priceChange, inputShock: { fert, fuel }, inputNews, pest,
    };
  };

  // 決算後に長期水準などを更新
  M.advance = function (st) {
    const r = RG.rng.make(st.seed, st.year, 'market-advance');
    st.market.history.push({ year: st.year, price: st.world.price, index: st.world.nationalIndex, weather: st.world.yearType, reason: st.world.marketReason });
    st.market.price = st.world.price;
    st.market.longRun = U.clamp(st.market.longRun * Math.exp(r.normal(0.004, 0.012)), 12000, 21000);
    st.market.matInfl *= 1.007;
    st.market.wageInfl *= 1.015;
    st.market.fertShock = st.world.inputShock.fert;
  };
})(window.RG = window.RG || {});
