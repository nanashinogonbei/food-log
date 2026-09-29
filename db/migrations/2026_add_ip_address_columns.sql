-- 商品申請・商品評価を投稿したユーザーのIPアドレスを記録するためのカラム追加
--
-- 対象テーブル:
--   products            : 商品申請者のIPアドレス
--   product_photos      : 商品写真をアップロードしたユーザーのIPアドレス
--   product_valuations  : 商品評価の投稿者のIPアドレス
--
-- varchar(45) は IPv4 / IPv6（IPv4射影アドレス含む）の最大長に対応する。
-- 既存データは NULL（IPアドレス不明）のままとなる。
--
-- 【注意】既存DBに対して1回だけ実行してください。
--   2回目以降は「Duplicate column name 'ip_address'」エラーになります。

ALTER TABLE `products`
  ADD COLUMN `ip_address` varchar(45) DEFAULT NULL COMMENT '申請者のIPアドレス（IPv6対応）'
  AFTER `requested_by`;

ALTER TABLE `product_photos`
  ADD COLUMN `ip_address` varchar(45) DEFAULT NULL COMMENT 'アップロードしたユーザーのIPアドレス（IPv6対応）'
  AFTER `display_order`;

ALTER TABLE `product_valuations`
  ADD COLUMN `ip_address` varchar(45) DEFAULT NULL COMMENT '投稿者のIPアドレス（IPv6対応）'
  AFTER `purchase_store`;
