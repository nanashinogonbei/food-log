このWebサービスは不特定多数が商品を評価するコミュニティサイトです。


* サイト構成 
トップページ (/)
-カテゴリー一覧ページ (/category/)
--大カテゴリーページ (/category/[label])
---中カテゴリーページ (/category/[label]/[label])
----小カテゴリーページ (/category/[label]/[label]/[label])
-製品ページ (/product/[id])
-ログインページ (/login)

-ユーザページ(/user/[userID])

-マイページ (/mypage/[userID])
--ユーザ情報 編集 (/mypage/[userID]/user)
--商品申請 一覧 (/mypage/[userID]/request)
---商品申請 投稿 (/mypage/[userID]/request/post)
--商品評価 一覧 (/mypage/[userID]/valuation)
---商品評価 投稿 (/mypage/[userID]/valuation/post)

-管理者ページ (/admin)
--商品申請 管理 (/admin/product-approval/)
--商品 管理 (/admin/product/)
--商品評価 管理 (/admin/valuation/)
--通報 管理 (/admin/report/)


* 管理者ページ
.env と api/config.php に記述


* 製品ステータス(status)
pending		: 保留中
approved	: 承認済み
private		: 非公開
rejected	: 却下
