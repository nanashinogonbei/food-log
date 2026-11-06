-- DBに保存するユーザーIDを「ClerkのユーザーID」から「users.id（サイト用のID）」に切り替える
--
-- 対象カラム:
--   products.requested_by                (申請者)
--   product_valuations.user_id           (評価の投稿者)
--   valuation_reports.reported_user_id   (通報された評価の投稿者)
--   valuation_reports.reporter_user_id   (通報したユーザー)
--
-- 【前提】
--   - 先に db/migrations/2026_create_users.sql（usersテーブルの作成）を実行しておくこと。
--   - 既存DBに対して1回だけ実行する。2回目以降は途中でエラーになる。
--   - 実行前にDBのバックアップを取ること。
--   - 実行中にサイトへの書き込みがあると不整合になるため、メンテナンス中に実行することを推奨する。
--   - api/*.php を本変更後のものに差し替えるタイミングと合わせること（古いPHPのままだと動かない）。
--
-- 【流れ】
--   1. 既存データに登場するClerkのIDのうち、usersに未登録のものを登録する（公開用IDも発行する）。
--   2. 各テーブルに新しい整数カラムを追加し、users.id を設定する。
--   3. 古いvarcharカラムと関連インデックスを削除し、新カラムを同名に付け替えて外部キーを張る。
--
-- 手順1の公開用IDは、SQLだけで作れる12文字の16進文字列（MD5の先頭）。
-- 新規ユーザーの公開用ID（api/db.php が発行する英数字12文字）とは文字種が異なるが、どちらも有効。

-- 1. usersに未登録のユーザーを登録する
INSERT INTO `users` (`clerk_user_id`, `public_id`)
SELECT c.`clerk_user_id`, SUBSTRING(MD5(CONCAT(UUID(), RAND(), c.`clerk_user_id`)), 1, 12)
FROM (
  SELECT `requested_by` AS `clerk_user_id` FROM `products`
  UNION SELECT `user_id` FROM `product_valuations`
  UNION SELECT `reported_user_id` FROM `valuation_reports`
  UNION SELECT `reporter_user_id` FROM `valuation_reports`
) c
WHERE c.`clerk_user_id` NOT IN (SELECT `clerk_user_id` FROM `users`);

-- 2-3. products.requested_by
ALTER TABLE `products`
  ADD COLUMN `requested_by_site` int UNSIGNED NULL AFTER `requested_by`;

UPDATE `products` p
  INNER JOIN `users` u ON u.`clerk_user_id` = p.`requested_by`
  SET p.`requested_by_site` = u.`id`;

ALTER TABLE `products`
  DROP INDEX `idx_products_requested_by`,
  DROP COLUMN `requested_by`;

ALTER TABLE `products`
  CHANGE COLUMN `requested_by_site` `requested_by` int UNSIGNED NOT NULL COMMENT '申請者のサイト用ユーザーID（users.id）',
  ADD KEY `idx_products_requested_by` (`requested_by`),
  ADD CONSTRAINT `fk_products_requested_by` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`);

-- 2-3. product_valuations.user_id
ALTER TABLE `product_valuations`
  ADD COLUMN `user_id_site` int UNSIGNED NULL AFTER `user_id`;

UPDATE `product_valuations` v
  INNER JOIN `users` u ON u.`clerk_user_id` = v.`user_id`
  SET v.`user_id_site` = u.`id`;

ALTER TABLE `product_valuations`
  DROP INDEX `uq_product_valuations_product_user`,
  DROP INDEX `idx_product_valuations_user_id`,
  DROP COLUMN `user_id`;

ALTER TABLE `product_valuations`
  CHANGE COLUMN `user_id_site` `user_id` int UNSIGNED NOT NULL COMMENT '投稿者のサイト用ユーザーID（users.id）',
  ADD UNIQUE KEY `uq_product_valuations_product_user` (`product_id`, `user_id`) COMMENT '1ユーザー1商品につき評価は1件のみ',
  ADD KEY `idx_product_valuations_user_id` (`user_id`),
  ADD CONSTRAINT `fk_product_valuations_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

-- 2-3. valuation_reports.reported_user_id / reporter_user_id
ALTER TABLE `valuation_reports`
  ADD COLUMN `reported_user_id_site` int UNSIGNED NULL AFTER `reported_user_id`,
  ADD COLUMN `reporter_user_id_site` int UNSIGNED NULL AFTER `reporter_user_id`;

UPDATE `valuation_reports` r
  INNER JOIN `users` ru ON ru.`clerk_user_id` = r.`reported_user_id`
  INNER JOIN `users` rt ON rt.`clerk_user_id` = r.`reporter_user_id`
  SET r.`reported_user_id_site` = ru.`id`, r.`reporter_user_id_site` = rt.`id`;

ALTER TABLE `valuation_reports`
  DROP INDEX `uq_valuation_reports_valuation_reporter`,
  DROP INDEX `idx_valuation_reports_reported_user`,
  DROP INDEX `idx_valuation_reports_reporter_user`,
  DROP COLUMN `reported_user_id`,
  DROP COLUMN `reporter_user_id`;

ALTER TABLE `valuation_reports`
  CHANGE COLUMN `reported_user_id_site` `reported_user_id` int UNSIGNED NOT NULL COMMENT '通報された評価の投稿者のサイト用ユーザーID（users.id）',
  CHANGE COLUMN `reporter_user_id_site` `reporter_user_id` int UNSIGNED NOT NULL COMMENT '通報したユーザーのサイト用ユーザーID（users.id）',
  ADD UNIQUE KEY `uq_valuation_reports_valuation_reporter` (`valuation_id`, `reporter_user_id`) COMMENT '同じ評価を同じ人が重複して通報できない',
  ADD KEY `idx_valuation_reports_reported_user` (`reported_user_id`, `status`),
  ADD KEY `idx_valuation_reports_reporter_user` (`reporter_user_id`),
  ADD CONSTRAINT `fk_valuation_reports_reported_user` FOREIGN KEY (`reported_user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_valuation_reports_reporter_user` FOREIGN KEY (`reporter_user_id`) REFERENCES `users` (`id`);
