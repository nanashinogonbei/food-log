-- 商品評価 (/mypage/[userID]/valuation) で登録される評価テーブル
--
-- product_id は products.id を参照する（DBに登録済みの商品のみ評価可能）。
-- score は単一選択の評価（イマイチ/好き/大好き）。
-- comment は100文字以上2000文字以内（アプリケーション側でも検証するが、DB側は上限のみ制約）。
-- purchase_price は「数字10桁以内」の入力仕様のため、桁落ちを避けて文字列として保持する。
-- 購入場所は purchase_type（店舗/自販機/ネット・通販/その他）と、種別ごとの入力欄で保持する:
--   store=店名(purchase_store)+支店名(purchase_branch) / vending=追加入力なし
--   online=店名(purchase_store)+URL(purchase_url) / other=内容(purchase_detail)
-- ip_address は投稿者のIPアドレス（IPv6対応で最大45文字）。api/valuations.php が投稿時に記録する。
--   既存の評価を修正投稿した場合は、最新の投稿元IPで上書きする。既存データは NULL。
-- 1ユーザーにつき同一商品への評価は1件のみとし、2件目以降の投稿は既存行の更新として扱う
-- (UNIQUE KEY uq_product_valuations_product_user / api/valuations.php 側の upsert 処理と対応)。

-- 【前提】ユーザーIDは ClerkのユーザーID ではなく users.id（サイト用のID）を保存する。
--   db/users.sql を先に適用しておくこと（外部キーのため）。

CREATE TABLE `product_valuations` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` int UNSIGNED NOT NULL,
  `user_id` int UNSIGNED NOT NULL COMMENT '投稿者のサイト用ユーザーID（users.id）',
  `score` enum('poor','like','love') NOT NULL COMMENT 'poor=イマイチ / like=好き / love=大好き',
  `comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `purchase_price` varchar(10) DEFAULT NULL COMMENT '半角数字のみ、10桁以内',
  `purchase_region` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '購入地域（◯◯県〇〇市〇〇区）任意',
  `purchase_type` enum('store','vending','online','other') DEFAULT NULL COMMENT '購入場所の種別: store=店舗 / vending=自販機 / online=ネット・通販 / other=その他',
  `purchase_store` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '店名（店舗・ネット・通販）',
  `purchase_branch` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '支店名（店舗）',
  `purchase_url` varchar(500) DEFAULT NULL COMMENT 'URL（ネット・通販）。http/httpsのみ',
  `purchase_detail` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'その他の内容',
  `ip_address` varchar(45) DEFAULT NULL COMMENT '投稿者のIPアドレス（IPv6対応）',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL COMMENT '評価を修正した日時（未修正の場合はNULL）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_product_valuations_product_user` (`product_id`, `user_id`) COMMENT '1ユーザー1商品につき評価は1件のみ',
  KEY `idx_product_valuations_user_id` (`user_id`),
  CONSTRAINT `fk_product_valuations_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_product_valuations_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 【既存DBへ適用する場合】
-- 本番などの既存DBには db/migrations/2026_add_valuation_unique_constraint.sql を
-- 1回だけ実行してください（重複データの安全な統合も含まれています）。
