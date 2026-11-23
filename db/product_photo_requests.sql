-- 商品画像の申請テーブル（商品ページ /product/[id] の「この商品の画像を投稿する」から申請される画像）
--
-- 1回の申請で複数枚をまとめて送れる。display_order は同じ申請内での表示の優先順位（0が最優先＝左端）。
-- 管理画面 /admin/image で「承認」すると product_photos に追加され、商品ページに表示される
-- （そのとき product_photos.created_at には、申請された日時＝画像の投稿日時を引き継ぐ）。
-- 「却下」すると画像ファイルを削除し、status を rejected にする。
-- 画像ファイルは商品申請と同じ uploads/products/ に保存する。
-- ip_address は申請者のIPアドレス（IPv6対応で最大45文字）。

-- 【前提】db/products.sql と db/users.sql を先に適用しておくこと（外部キーのため）。

CREATE TABLE `product_photo_requests` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` int UNSIGNED NOT NULL,
  `requested_by` int UNSIGNED NOT NULL COMMENT '申請者のサイト用ユーザーID（users.id）',
  `filename` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_order` int UNSIGNED NOT NULL DEFAULT '0' COMMENT '同じ申請内での表示の優先順位（0が最優先）',
  `ip_address` varchar(45) DEFAULT NULL COMMENT '申請者のIPアドレス（IPv6対応）',
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '申請（投稿）日時',
  `reviewed_at` datetime DEFAULT NULL COMMENT '承認・却下した日時',
  PRIMARY KEY (`id`),
  KEY `idx_photo_requests_status_created` (`status`, `created_at`),
  KEY `idx_photo_requests_product_id` (`product_id`),
  KEY `idx_photo_requests_requested_by` (`requested_by`),
  CONSTRAINT `fk_photo_requests_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_photo_requests_requested_by` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
