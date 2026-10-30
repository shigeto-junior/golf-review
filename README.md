# golf-review
ラウンド振り返り＆スタッツ記録アプリ

iPhoneのSafariで開き「ホーム画面に追加」して使うWebアプリ（PWA）です。
データはiPhoneの中（localStorage）にだけ保存され、サーバーには送られません。

## 機能（予定を含む）

- ラウンドの記録（ホールごとのパット数、FWキープ、ミス方向など）
- コース／ホールごとの戦略メモ
- スタッツの集計
- スタッツに基づく練習メニューの提案

記録する項目は [docs/data-items.md](docs/data-items.md) を参照。

## 構成

ビルド不要の HTML / CSS / JavaScript だけで作っています。

```
index.html            画面の枠
css/style.css         見た目
js/app.js             画面の切り替えと各画面
js/model.js           データの形と選択肢
js/store.js           端末内への保存、バックアップ
sw.js                 オフライン対応（ファイルを変えたら CACHE_VERSION を上げる）
manifest.webmanifest  ホーム画面に追加したときの名前やアイコン
```

## 手元で動かす

```
python3 -m http.server 8000
```

ブラウザで http://localhost:8000 を開く。

## 公開

GitHub Pages（Settings → Pages → Deploy from a branch → `main` / `(root)`）で公開しています。
