* 環境構築
yarn install

** 環境変数(.env)
Clerkのテスト用publishable keyと本番APIのURLが入っています。
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_BASE_URL=https://...

** データベースの準備
mysql -u root -p -e "CREATE DATABASE food_log CHARACTER SET utf8mb4;"
mysql -u root -p food_log < db/categories.sql
mysql -u root -p food_log < db/products.sql

** PHP APIの接続設定
api/config.php を編集して、実際のDB接続情報（host / port / database / username / password）を設定してください。api/config.php は .gitignore 済みなのでコミットされません。
写真アップロード用のディレクトリ uploads/products/ も書き込み権限が必要です（git clone 直後は .gitkeep だけの空ディレクトリとして存在します）。

** フロントエンド開発サーバーの起動
yarn dev

*** その他よく使うコマンド
yarn build     # 型チェック(tsc -b) + 本番ビルド
yarn preview   # ビルド結果をローカルでプレビュー
yarn lint      # ESLint
npx tsc -b     # 型チェックのみ



yarn up
yarn cache clean




このWebサービスは不特定多数が商品を評価するコミュニティサイトです。


* サイト構成 
トップページ (/)
-カテゴリー一覧ページ (/category/)
--大カテゴリーページ (/category/[label])
---中カテゴリーページ (/category/[label]/[label])
----小カテゴリーページ (/category/[label]/[label]/[label])
-製品ページ (/product/[id])
-ログインページ (/login)
-マイページ (/[userID])
--商品申請 (/[userID]/request)
--商品評価 (/[userID]/valuation)


