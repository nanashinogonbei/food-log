-- 商品評価 (/[userID]/valuation) で登録される評価テーブル
--
-- product_id は products.id を参照する（DBに登録済みの商品のみ評価可能）。
-- score は単一選択の評価（イマイチ/好き/大好き）。
-- comment は100文字以上2000文字以内（アプリケーション側でも検証するが、DB側は上限のみ制約）。
-- purchase_price は「数字10桁以内」の入力仕様のため、桁落ちを避けて文字列として保持する。
-- 1ユーザーにつき同一商品への評価は1件のみとし、2件目以降の投稿は既存行の更新として扱う
-- (UNIQUE KEY uq_product_valuations_product_user / api/valuations.php 側の upsert 処理と対応)。

CREATE TABLE `product_valuations` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` int UNSIGNED NOT NULL,
  `user_id` varchar(255) NOT NULL COMMENT 'Clerkのユーザー ID',
  `score` enum('poor','like','love') NOT NULL COMMENT 'poor=イマイチ / like=好き / love=大好き',
  `comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `purchase_price` varchar(10) DEFAULT NULL COMMENT '半角数字のみ、10桁以内',
  `purchase_store` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL COMMENT '評価を修正した日時（未修正の場合はNULL）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_product_valuations_product_user` (`product_id`, `user_id`) COMMENT '1ユーザー1商品につき評価は1件のみ',
  KEY `idx_product_valuations_user_id` (`user_id`),
  CONSTRAINT `fk_product_valuations_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 【既存DBへ適用する場合】
-- 本番などの既存DBには db/migrations/2026_add_valuation_unique_constraint.sql を
-- 1回だけ実行してください（重複データの安全な統合も含まれています）。
