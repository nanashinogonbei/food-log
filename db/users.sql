-- サイト用のユーザー情報テーブル
--
-- Clerkのユーザー ID(clerk_user_id)は内部用とし、URLや公開APIには出さない。
-- 公開する場合は、推測されにくいランダム文字列の public_id（公開用ID）を使う。
-- 行は初回アクセス時に api/users.php が自動で作成する（public_id もそのときに発行）。
-- display_name は未設定の間は NULL。

CREATE TABLE `users` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `clerk_user_id` varchar(255) NOT NULL COMMENT 'Clerkのユーザー ID（内部用・非公開）',
  `public_id` varchar(32) NOT NULL COMMENT '公開用ID（ランダム文字列）',
  `display_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '表示名',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_clerk_user_id` (`clerk_user_id`),
  UNIQUE KEY `uq_users_public_id` (`public_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
