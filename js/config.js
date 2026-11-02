// 公開するときの設定（ふだん書き換えるのはこのファイルだけ）
(function (RG) {
  'use strict';
  RG.CONFIG = {
    // ゲームの版。感想やプレイ記録に付けて、どの版で遊んだものか分かるようにする
    version: '2026-12-03',

    // 感想・プレイ記録・アンケートを集める Google フォーム（開発メモ.md の「感想を集める」を参照）
    // formAction が空のときは送信せず、ファイルに書き出してもらう
    feedback: {
      formAction: 'https://docs.google.com/forms/d/e/1FAIpQLSd3FmopF1ZSl7dhExTJLqBc-tkyNHJR-3MmTLjiYFifo4LSSw/formResponse',
      fields: {
        kind: 'entry.403525143',    // 種類：気づき／アンケート
        version: 'entry.948605250', // ゲームの版
        body: 'entry.956132268',    // 中身（JSON）
      },
    },

    // ファイルで送ってもらうときの送り先の案内（例：'○○大学 △△研究室 xxx@example.jp'）
    contact: '',
  };
})(window.RG = window.RG || {});
