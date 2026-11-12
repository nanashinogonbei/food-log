-- 商品評価の「購入場所」を、種別（店舗/自販機/ネット・通販/その他）ごとの入力に変更する
--
--   purchase_type   : 種別。store=店舗 / vending=自販機 / online=ネット・通販 / other=その他
--   purchase_store  : 店名（店舗・ネット・通販）※既存カラム
--   purchase_branch : 支店名（店舗）
--   purchase_url    : URL（ネット・通販）
--   purchase_detail : 自販機の場所（◯◯県〇〇市〇〇区）/ その他の内容
--
-- 既存の購入店舗(purchase_store)の入力は、種別「店舗」の店名として引き継ぐ。
-- 既存DBに対して1回だけ実行する。

ALTER TABLE `product_valuations`
  ADD COLUMN `purchase_type` enum('store','vending','online','other') DEFAULT NULL
    COMMENT '購入場所の種別: store=店舗 / vending=自販機 / online=ネット・通販 / other=その他'
    AFTER `purchase_price`,
  ADD COLUMN `purchase_branch` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL
    COMMENT '支店名（店舗）'
    AFTER `purchase_store`,
  ADD COLUMN `purchase_url` varchar(500) DEFAULT NULL
    COMMENT 'URL（ネット・通販）。http/httpsのみ'
    AFTER `purchase_branch`,
  ADD COLUMN `purchase_detail` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL
    COMMENT '自販機の場所（◯◯県〇〇市〇〇区）/ その他の内容'
    AFTER `purchase_url`,
  MODIFY COLUMN `purchase_store` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL
    COMMENT '店名（店舗・ネット・通販）';

UPDATE `product_valuations`
  SET `purchase_type` = 'store'
  WHERE `purchase_store` IS NOT NULL AND `purchase_store` <> '';
