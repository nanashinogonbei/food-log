-- 商品申請 (/[userID]/request) で登録される商品テーブル
--
-- category1 / category2 は categories.id を参照する。
-- category1 は必須（大カテゴリーを想定）、category2 は任意（中カテゴリーを想定）。
-- status は申請直後は 'pending' とし、管理者の承認フローを想定している。

CREATE TABLE `products` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category1` int UNSIGNED NOT NULL,
  `category2` int UNSIGNED DEFAULT NULL,
  `distributor` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `manufacturing` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `requested_by` varchar(255) NOT NULL COMMENT 'Clerkのユーザー ID',
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_products_category1` (`category1`),
  KEY `idx_products_category2` (`category2`),
  KEY `idx_products_requested_by` (`requested_by`),
  CONSTRAINT `fk_products_category1` FOREIGN KEY (`category1`) REFERENCES `categories` (`id`),
  CONSTRAINT `fk_products_category2` FOREIGN KEY (`category2`) REFERENCES `categories` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 商品写真（1商品につき複数枚）
CREATE TABLE `product_photos` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` int UNSIGNED NOT NULL,
  `filename` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_order` int UNSIGNED NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_product_photos_product_id` (`product_id`),
  CONSTRAINT `fk_product_photos_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
