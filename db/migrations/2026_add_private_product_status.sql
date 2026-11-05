-- 商品ステータスに「非公開(private)」を追加する
--
-- ステータスの意味:
--   pending  : 申請中
--   approved : 公開
--   private  : 非公開（一覧・検索・商品ページに表示されない）
--   rejected : 却下
--
-- 【対象】既存DB。これから db/products.sql を新規に適用するDBでは不要です。
-- ENUMの定義を置き換えるだけなので、既存データはそのまま保持されます。

ALTER TABLE `products`
  MODIFY COLUMN `status` enum('pending','approved','private','rejected') NOT NULL DEFAULT 'pending';
