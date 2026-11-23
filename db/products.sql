-- 商品申請 (/mypage/[userID]/request) で登録される商品テーブル
--
-- category1 / category2 は categories.id を参照する。
-- category1 は必須（大カテゴリーを想定）、category2 は任意（中カテゴリーを想定）。
-- status は申請直後は 'pending' とし、管理者の承認フローを想定している。
-- ip_address は申請者のIPアドレス（IPv6対応で最大45文字）。api/products.php が申請時に記録する。
--   既存データ（この項目の追加前に申請されたもの）は NULL。

-- 【前提】ユーザーIDは ClerkのユーザーID ではなく users.id（サイト用のID）を保存する。
--   db/users.sql を先に適用しておくこと（外部キーのため）。

CREATE TABLE `products` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category1` int UNSIGNED NOT NULL,
  `category2` int UNSIGNED DEFAULT NULL,
  `distributor` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `manufacturing` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `requested_by` int UNSIGNED NOT NULL COMMENT '申請者のサイト用ユーザーID（users.id）',
  `ip_address` varchar(45) DEFAULT NULL COMMENT '申請者のIPアドレス（IPv6対応）',
  `status` enum('pending','approved','private','rejected') NOT NULL DEFAULT 'pending',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_products_category1` (`category1`),
  KEY `idx_products_category2` (`category2`),
  KEY `idx_products_requested_by` (`requested_by`),
  CONSTRAINT `fk_products_requested_by` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_products_category1` FOREIGN KEY (`category1`) REFERENCES `categories` (`id`),
  CONSTRAINT `fk_products_category2` FOREIGN KEY (`category2`) REFERENCES `categories` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 商品写真（1商品につき複数枚）
--
-- 商品申請時の画像と、商品ページ /product/[id] や マイページ /mypage/[userID]/image/post から
-- 投稿される画像を、このテーブルで一括管理する（旧 product_photo_requests を統合）。
--   requested_by : 画像を投稿したユーザー（users.id）。商品申請時の画像は商品の申請者
--   status       : pending=承認待ち / approved=公開 / rejected=却下
--                  商品申請時の画像は approved で登録する。画像投稿は pending で登録し、
--                  管理画面 /admin/image で承認すると approved になり商品ページに表示される。
--                  却下すると画像ファイルを削除し rejected にする（行は投稿履歴として残す）。
--   display_order: 同じ投稿内での表示の優先順位（0が最優先＝左端）
--   created_at   : 投稿日時
--   reviewed_at  : 承認・却下した日時
CREATE TABLE `product_photos` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` int UNSIGNED NOT NULL,
  `requested_by` int UNSIGNED NOT NULL COMMENT '投稿したユーザーのサイト用ID（users.id）',
  `filename` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_order` int UNSIGNED NOT NULL DEFAULT '0',
  `ip_address` varchar(45) DEFAULT NULL COMMENT 'アップロードしたユーザーのIPアドレス（IPv6対応）',
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '投稿日時',
  `reviewed_at` datetime DEFAULT NULL COMMENT '承認・却下した日時',
  PRIMARY KEY (`id`),
  KEY `idx_product_photos_product_id` (`product_id`),
  KEY `idx_product_photos_status_created` (`status`, `created_at`),
  KEY `idx_product_photos_requested_by` (`requested_by`),
  CONSTRAINT `fk_product_photos_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_product_photos_requested_by` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
