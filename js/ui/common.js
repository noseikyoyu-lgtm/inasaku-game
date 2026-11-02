// 画面部品
(function (RG) {
  'use strict';
  const D = RG.data, U = RG.util;
  const UI = RG.ui = {};
  RG.screens = RG.screens || {};

  const PROPS = { value: 1, checked: 1, disabled: 1, selected: 1 };
  UI.h = function (tag, attrs) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (PROPS[k]) el[k] = v;
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    const add = (c) => {
      if (c == null || c === false) return;
      if (Array.isArray(c)) { c.forEach(add); return; }
      el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    };
    for (let i = 2; i < arguments.length; i++) add(arguments[i]);
    return el;
  };
  const h = UI.h;

  UI.term = (word, label) => h('span', { class: 'term', tabindex: 0, 'data-term': word, role: 'button' }, label || word);

  // カードの見出しに合うアイコン（文字だけの見出しを減らす）
  UI.CARD_ICONS = {
    '今年のニュース': '📰', '経営の状況': '📊', '米価の見通し': '💹', '昨年の結果': '📅', '20年後の評価': '🏆', 'これからの山場': '⛰️', '売上と所得の推移': '📈', '純資産と借入の推移': '📉',
    '品種ごとの作付': '🌾', '品目ごとの見込み': '📦', '収穫スケジュール': '🗓️', '品種の特徴': '📘', '農地の状況': '🗾', '農地の話': '🤝', '田んぼの一覧': '📋',
    '作業能力と委託': '⚙️', '持っている機械': '🚜', '中古機械の出物': '🏷️', '機械を導入する': '🛒', '季節ごとの労働バランス': '⚖️', '作業ごとの時間': '⏱️',
    '家族': '👨‍👩‍👧', 'パート': '🧑‍🌾', '正社員': '👷', '販路ごとの見込み': '🛒', '資金の状況': '💰', '今年の資金繰りの見通し': '📉', '借入金': '🏦', '保険': '🛡️',
    '今年の見通し': '🔮', '地域の農家': '🏘️', '地域の農家との比較': '🏘️', '称号': '🏅', '今年の成績': '📋', '天候と作柄': '⛅', '米の値段': '💹', '評価の内訳': '📊',
    '経営を続けるための条件': '🩺', '月ごとの資金の動き': '💴', '利益とお金のずれ': '🔍', '純資産が増減した理由': '⚖️', '資産の部': '🏠', '負債・純資産の部': '🏦',
  };
  UI.card = function (title, sub) {
    const kids = Array.prototype.slice.call(arguments, 2);
    const ic = typeof title === 'string' && UI.CARD_ICONS[title];
    return h('section', { class: 'card' }, title ? h('h3', null, ic ? h('span', { class: 'card-ic', 'aria-hidden': 'true' }, ic) : null, title, sub ? h('span', { class: 'sub' }, sub) : null) : null, kids);
  };

  UI.kpi = (label, value, sub, cls) => h('div', { class: 'kpi ' + (cls || '') }, h('div', { class: 'l' }, label), h('div', { class: 'v' }, value), sub ? h('div', { class: 's' }, sub) : null);

  UI.signCls = (v) => (v < 0 ? 'neg' : '');

  // headers: [{label, num}] / rows: [[cell...]] または {cells, cls}
  UI.table = function (headers, rows, opts) {
    opts = opts || {};
    const thead = headers ? h('thead', null, h('tr', null, headers.map((x) => h('th', { class: x.num ? 'num' : '' }, x.label)))) : null;
    const tbody = h('tbody', null, rows.map((r) => {
      const cells = Array.isArray(r) ? r : r.cells;
      return h('tr', { class: Array.isArray(r) ? '' : r.cls || '' }, cells.map((c, i) => {
        const hd = headers && headers[i];
        let cls = hd && hd.num ? 'num' : '';
        let content = c;
        if (c && typeof c === 'object' && !(c instanceof Node) && !Array.isArray(c)) { content = c.v; cls += ' ' + (c.cls || ''); }
        return h('td', { class: cls }, content);
      }));
    }));
    return h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl ' + (opts.cls || '') }, thead, tbody));
  };

  // 更新履歴の一覧
  UI.changelogList = () => h('div', { class: 'changelog' }, RG.CHANGELOG.map((c, i) => h('section', { class: 'cl-ver' + (i === 0 ? ' latest' : '') },
    h('div', { class: 'cl-head' }, h('b', null, '版 ' + c.ver), h('span', { class: 'cl-date' }, c.date), i === 0 ? h('span', { class: 'cl-new' }, '最新') : null),
    h('ul', null, c.items.map((t) => h('li', null, t))))));
  UI.showChangelog = function () {
    RG.changelogSeen();
    UI.modal({ title: '📰 更新履歴', body: UI.changelogList(), actions: [{ label: '閉じる', cls: 'primary' }] });
  };

  UI.btn = (label, onClick, cls, opts) => h('button', Object.assign({ class: 'btn ' + (cls || ''), type: 'button', onclick: onClick }, opts || {}), label);

  // 数字の入力：－＋ボタンでも増やしたり減らしたりできる（操作盤のように）
  UI.numInput = function (o) {
    const clamp = (v) => {
      if (!isFinite(v)) v = o.min || 0;
      if (o.min !== undefined) v = Math.max(o.min, v);
      if (o.max !== undefined) v = Math.min(o.max, v);
      return Math.round(v * 1000) / 1000;
    };
    const step = o.step || 1;
    const inp = h('input', { type: 'number', value: o.value, min: o.min, max: o.max, step, style: { width: (o.width || 100) + 'px' },
      'aria-label': o.label || '', onchange: (e) => o.onChange(clamp(parseFloat(e.target.value))) });
    const minus = h('button', { type: 'button', class: 'step-btn', 'aria-label': (o.label || '') + 'を減らす', disabled: o.min !== undefined && o.value <= o.min }, '−');
    const plus = h('button', { type: 'button', class: 'step-btn', 'aria-label': (o.label || '') + 'を増やす', disabled: o.max !== undefined && o.value >= o.max }, '＋');
    const bump = (d) => () => {
      const cur = parseFloat(inp.value) || 0, v = clamp(cur + d * step);
      if (v === cur) return;
      inp.value = v; // 描き直さない入力欄でも、表示を新しい値にする
      minus.disabled = o.min !== undefined && v <= o.min; plus.disabled = o.max !== undefined && v >= o.max;
      o.onChange(v);
    };
    minus.addEventListener('click', bump(-1)); plus.addEventListener('click', bump(1));
    return h('span', { class: 'inline-input stepper' }, minus, inp, plus,
      o.suffix ? h('span', { class: 'muted small' }, o.suffix) : null);
  };

  UI.select = function (options, value, onChange, opts) {
    return h('select', Object.assign({ onchange: (e) => onChange(e.target.value) }, opts || {}),
      options.map((o) => h('option', { value: o.value, selected: o.value === value, disabled: o.disabled }, o.label)));
  };

  UI.field = (label, control) => h('div', { class: 'field' }, h('label', null, label), control);

  const ICON = { good: '✅', warn: '⚠️', bad: '🚨', info: '💡', tip: '⭐' };
  UI.note = (level, title, text) => h('div', { class: 'note ' + level }, h('span', { class: 'ic', 'aria-hidden': 'true' }, ICON[level] || 'i'),
    h('div', null, title ? h('div', { class: 't' }, title) : null, text ? h('div', null, text) : null));

  UI.bar = (value, max) => {
    const r = max > 0 ? value / max : 0;
    return h('div', { class: 'bar' + (r > 1.0001 ? ' over' : ''), title: U.pct(r) }, h('span', { style: { width: Math.min(100, r * 100) + '%' } }));
  };

  UI.money = (v, cls) => h('span', { class: (cls || '') + ' ' + UI.signCls(v) }, U.man(v));

  // ---------- モーダル ----------
  UI.modal = function (o) {
    const root = document.getElementById('modal-root');
    const close = () => { ov.remove(); document.removeEventListener('keydown', onKey); if (o.onClose) o.onClose(); };
    const onKey = (e) => { if (e.key === 'Escape' && root.lastElementChild === ov) close(); };
    const actions = (o.actions || [{ label: '閉じる' }]).map((a) => UI.btn(a.label, () => { if (a.onClick && a.onClick() === false) return; close(); }, a.cls));
    const ov = h('div', { class: 'overlay', onclick: (e) => { if (e.target === ov) close(); } },
      h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': o.title },
        h('h2', null, o.title), o.body, h('div', { class: 'actions' }, actions)));
    root.appendChild(ov);
    document.addEventListener('keydown', onKey);
    const first = ov.querySelector('.actions .btn.primary') || ov.querySelector('.actions .btn');
    if (first) first.focus();
    return close;
  };

  UI.confirm = function (title, body, okLabel, cls) {
    return new Promise((resolve) => {
      let done = false;
      UI.modal({ title, body: typeof body === 'string' ? h('p', null, body) : body,
        actions: [{ label: 'やめる', onClick: () => { done = true; resolve(false); } },
          { label: okLabel || 'はい', cls: cls || 'primary', onClick: () => { done = true; resolve(true); } }],
        onClose: () => { if (!done) resolve(false); } });
    });
  };

  UI.toast = function (msg, kind, quiet) {
    const root = document.getElementById('toast-root');
    // 知らせの種類で音を変える（quiet のときは呼んだ側で鳴らす）
    if (RG.sound && !quiet) RG.sound.play(kind === 'bad' ? 'error' : /🔓/.test(msg) ? 'unlock' : /称号/.test(msg) ? 'medal' : 'ping');
    const t = h('div', { class: 'toast ' + (kind || ''), role: 'status' }, msg);
    root.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  };

  // ---------- 用語集 ----------
  UI.glossary = function () {
    const terms = Object.keys(D.GLOSSARY);
    const list = h('div', { class: 'stack' });
    const search = h('input', { type: 'text', placeholder: '用語を検索', style: { width: '100%' },
      oninput: () => render(search.value) });
    const render = (q) => {
      list.innerHTML = '';
      terms.filter((t) => !q || t.indexOf(q) >= 0 || D.GLOSSARY[t].indexOf(q) >= 0).forEach((t) =>
        list.appendChild(h('div', null, h('b', null, t), h('div', { class: 'muted' }, D.GLOSSARY[t]))));
    };
    render('');
    UI.modal({ title: '用語集', body: h('div', { class: 'stack' }, search, list) });
  };

  // 用語のポップアップ
  UI.installTermPopup = function () {
    const pop = document.getElementById('term-pop');
    const hide = () => { pop.hidden = true; };
    const show = (t) => {
      const word = t.getAttribute('data-term');
      const def = D.GLOSSARY[word];
      if (!def) return;
      pop.innerHTML = '';
      pop.appendChild(h('b', null, word));
      pop.appendChild(document.createTextNode(def));
      pop.hidden = false;
      const r = t.getBoundingClientRect();
      const pw = Math.min(320, window.innerWidth - 32);
      pop.style.maxWidth = pw + 'px';
      let left = Math.min(Math.max(16, r.left), window.innerWidth - pw - 16);
      pop.style.left = left + 'px';
      const below = r.bottom + 6;
      pop.style.top = below + 'px';
      const ph = pop.offsetHeight;
      if (below + ph > window.innerHeight - 8) pop.style.top = Math.max(8, r.top - ph - 6) + 'px';
    };
    document.addEventListener('click', (e) => {
      const t = e.target.closest && e.target.closest('.term');
      if (t) { e.preventDefault(); show(t); } else if (!e.target.closest('#term-pop')) hide();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hide();
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('term')) { e.preventDefault(); show(e.target); }
    });
    window.addEventListener('scroll', hide, { passive: true });
  };

  // 金額の行（プレビュー用）
  UI.pvRow = (label, value, cls) => h('div', { class: 'pv-row' }, h('span', null, label), h('span', { class: 'v ' + (cls || '') }, value));
})(window.RG = window.RG || {});
