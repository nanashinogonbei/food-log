-- product_photo_requests を product_photos に統合するマイグレーション
--
-- 商品画像の投稿者・承認状態を product_photos で一括管理する。
--   requested_by : 投稿したユーザー（users.id）
--   status       : pending / approved / rejected
--   reviewed_at  : 承認・却下した日時
--
-- 【前提】db/migrations/2026_create_product_photo_requests.sql まで適用済みであること。
-- 【注意】実行前にDBのバックアップを取ること。

START TRANSACTION;

-- 1. 既存の product_photos（商品申請時の画像・承認済みの画像申請）に新しい列を追加する
ALTER TABLE `product_photos`
  ADD COLUMN `requested_by` int UNSIGNED NULL COMMENT '投稿したユーザーのサイト用ID（users.id）' AFTER `product_id`,
  ADD COLUMN `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'approved' AFTER `ip_address`,
  ADD COLUMN `reviewed_at` datetime DEFAULT NULL COMMENT '承認・却下した日時' AFTER `created_at`;

-- 2. 承認済みの画像申請は、同じ画像の product_photos 行に投稿者を引き継ぐ
UPDATE `product_photos` ph
INNER JOIN `product_photo_requests` r
        ON r.product_id = ph.product_id AND r.filename = ph.filename AND r.status = 'approved'
   SET ph.requested_by = r.requested_by,
       ph.reviewed_at = r.reviewed_at;

-- 3. 残り（商品申請時の画像）は商品の申請者を投稿者にする
UPDATE `product_photos` ph
INNER JOIN `products` pr ON pr.id = ph.product_id
   SET ph.requested_by = pr.requested_by
 WHERE ph.requested_by IS NULL;

-- 4. 承認待ち・却下済みの画像申請を product_photos に移す
INSERT INTO `product_photos`
  (`product_id`, `requested_by`, `filename`, `display_order`, `ip_address`, `status`, `created_at`, `reviewed_at`)
SELECT `product_id`, `requested_by`, `filename`, `display_order`, `ip_address`, `status`, `created_at`, `reviewed_at`
  FROM `product_photo_requests`
 WHERE `status` IN ('pending', 'rejected');

-- 5. 列の制約・索引・外部キーを整える（以降に追加される画像は、明示しない限り承認待ちにする）
ALTER TABLE `product_photos`
  MODIFY COLUMN `requested_by` int UNSIGNED NOT NULL COMMENT '投稿したユーザーのサイト用ID（users.id）',
  MODIFY COLUMN `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '投稿日時',
  ADD KEY `idx_product_photos_status_created` (`status`, `created_at`),
  ADD KEY `idx_product_photos_requested_by` (`requested_by`),
  ADD CONSTRAINT `fk_product_photos_requested_by` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`);

-- 6. 統合済みの旧テーブルを削除する
DROP TABLE `product_photo_requests`;

COMMIT;
