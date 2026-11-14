-- 商品評価に「購入地域」（任意）を追加し、自販機の追加入力（購入場所の詳細）を廃止する
--
--   purchase_region : 購入地域（◯◯県〇〇市〇〇区）。任意
--   purchase_detail : 種別「その他」の内容のみ使用する
--
-- 既存の自販機の場所(purchase_detail)は購入地域へ移行する。
-- 既存DBに対して1回だけ実行する。

ALTER TABLE `product_valuations`
  ADD COLUMN `purchase_region` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL
    COMMENT '購入地域（◯◯県〇〇市〇〇区）任意'
    AFTER `purchase_price`,
  MODIFY COLUMN `purchase_detail` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL
    COMMENT 'その他の内容';

UPDATE `product_valuations`
  SET `purchase_region` = `purchase_detail`, `purchase_detail` = NULL
  WHERE `purchase_type` = 'vending' AND `purchase_detail` IS NOT NULL;
