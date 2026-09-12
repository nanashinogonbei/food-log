-- 商品評価 (/[userID]/valuation) で登録される評価テーブル
--
-- product_id は products.id を参照する（DBに登録済みの商品のみ評価可能）。
-- score は単一選択の評価（イマイチ/好き/大好き）。
-- comment は100文字以上2000文字以内（アプリケーション側でも検証するが、DB側は上限のみ制約）。
-- purchase_price は「数字10桁以内」の入力仕様のため、桁落ちを避けて文字列として保持する。

CREATE TABLE `product_valuations` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` int UNSIGNED NOT NULL,
  `user_id` varchar(255) NOT NULL COMMENT 'Clerkのユーザー ID',
  `score` enum('poor','like','love') NOT NULL COMMENT 'poor=イマイチ / like=好き / love=大好き',
  `comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `purchase_price` varchar(10) DEFAULT NULL COMMENT '半角数字のみ、10桁以内',
  `purchase_store` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_product_valuations_product_id` (`product_id`),
  KEY `idx_product_valuations_user_id` (`user_id`),
  CONSTRAINT `fk_product_valuations_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
