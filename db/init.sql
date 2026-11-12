-- ============================================================
-- Food Log: DB初期化用SQL（全テーブルの作成）
--
-- 実行順（外部キーの依存関係順）:
--   1. categories           カテゴリー（初期データ付き）
--   2. users                サイト用ユーザー（ClerkのIDとの対応・公開用ID・表示名）
--   3. products / product_photos
--   4. product_valuations
--   5. valuation_reports
--
-- 各テーブルの定義は db/*.sql と同じ内容（それらを順に連結したもの）。
-- ユーザーIDを持つテーブルは、ClerkのIDではなく users.id を保存する。
--
-- 【注意】先頭で既存のテーブルを削除します。データはすべて消えます。
--   新規の空のDB、または初期化してよいDBで実行してください。
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `valuation_reports`;
DROP TABLE IF EXISTS `product_valuations`;
DROP TABLE IF EXISTS `product_photos`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `categories`;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- categories  （db/categories.sql）
-- ============================================================

-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- ホスト: mysql3118.db.sakura.ne.jp
-- 生成日時: 2026 年 9 月 11 日 06:59
-- サーバのバージョン： 8.0.46
-- PHP のバージョン: 8.2.16

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- データベース: `dsm-update_food-log`
--

-- --------------------------------------------------------

--
-- テーブルの構造 `categories`
--

CREATE TABLE `categories` (
  `id` int UNSIGNED NOT NULL,
  `order` int UNSIGNED NOT NULL DEFAULT '0',
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` char(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `filename` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `parent` int UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- テーブルのインデックス `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_categories_parent` (`parent`);

--
-- テーブルの制約 `categories`
--
ALTER TABLE `categories`
  ADD CONSTRAINT `fk_categories_parent` FOREIGN KEY (`parent`) REFERENCES `categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

-- ============================================================
-- users  （db/users.sql）
-- ============================================================

-- サイト用のユーザー情報テーブル
--
-- Clerkのユーザー ID(clerk_user_id)は内部用とし、URLや公開APIには出さない。
-- 他のテーブル（products / product_valuations / valuation_reports）には、
-- ClerkのIDではなくこのテーブルの id（サイト用のユーザーID）を保存する。
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

-- ============================================================
-- products / product_photos  （db/products.sql）
-- ============================================================

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
CREATE TABLE `product_photos` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` int UNSIGNED NOT NULL,
  `filename` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_order` int UNSIGNED NOT NULL DEFAULT '0',
  `ip_address` varchar(45) DEFAULT NULL COMMENT 'アップロードしたユーザーのIPアドレス（IPv6対応）',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_product_photos_product_id` (`product_id`),
  CONSTRAINT `fk_product_photos_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- product_valuations  （db/valuations.sql）
-- ============================================================

-- 商品評価 (/mypage/[userID]/valuation) で登録される評価テーブル
--
-- product_id は products.id を参照する（DBに登録済みの商品のみ評価可能）。
-- score は単一選択の評価（イマイチ/好き/大好き）。
-- comment は100文字以上2000文字以内（アプリケーション側でも検証するが、DB側は上限のみ制約）。
-- purchase_price は「数字10桁以内」の入力仕様のため、桁落ちを避けて文字列として保持する。
-- 購入場所は purchase_type（店舗/自販機/ネット・通販/その他）と、種別ごとの入力欄で保持する:
--   store=店名(purchase_store)+支店名(purchase_branch) / vending=場所(purchase_detail)
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
  `purchase_type` enum('store','vending','online','other') DEFAULT NULL COMMENT '購入場所の種別: store=店舗 / vending=自販機 / online=ネット・通販 / other=その他',
  `purchase_store` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '店名（店舗・ネット・通販）',
  `purchase_branch` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '支店名（店舗）',
  `purchase_url` varchar(500) DEFAULT NULL COMMENT 'URL（ネット・通販）。http/httpsのみ',
  `purchase_detail` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '自販機の場所（◯◯県〇〇市〇〇区）/ その他の内容',
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

-- ============================================================
-- valuation_reports  （db/reports.sql）
-- ============================================================

-- 商品評価の通報テーブル (製品ページ /product/[id] の「通報する」で登録される)
--
-- 通報された評価の投稿者(reported_user_id)が、有効な通報(status='pending')を
-- 「通報者の人数」で REPORT_RESTRICTION_THRESHOLD (api/db.php、初期値3) 人分以上受けると、
-- そのアカウントは商品申請・商品評価の投稿ができなくなる。
--   - 同じ人が同じ評価を通報できるのは1回のみ (UNIQUE KEY)。
--   - 同じ人が同じ投稿者の別の評価を何件通報しても、通報者としては1人と数える。
--   - 管理者が通報を棄却(status='dismissed')するとカウント対象外になり、制限も自動的に解除される。
--
-- valuation_id は評価が削除されたら NULL になる (ON DELETE SET NULL)。
-- 投稿者が通報後に評価を削除・修正しても通報が消えて制限を逃れられないよう、
-- 通報時点の内容は valuation_score / valuation_comment に控えとして保持する。
-- product_id には外部キーを張らない（商品が削除されても通報の記録を残すため）。

-- 【前提】ユーザーIDは ClerkのユーザーID ではなく users.id（サイト用のID）を保存する。
--   db/users.sql を先に適用しておくこと（外部キーのため）。

CREATE TABLE `valuation_reports` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `valuation_id` int UNSIGNED DEFAULT NULL COMMENT '通報された評価のID（評価が削除された場合はNULL）',
  `product_id` int UNSIGNED NOT NULL,
  `reported_user_id` int UNSIGNED NOT NULL COMMENT '通報された評価の投稿者のサイト用ユーザーID（users.id）',
  `reporter_user_id` int UNSIGNED NOT NULL COMMENT '通報したユーザーのサイト用ユーザーID（users.id）',
  `valuation_score` enum('poor','like','love') NOT NULL COMMENT '通報時点の評価',
  `valuation_comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '通報時点の評価コメント（控え）',
  `reason` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '通報理由（必須）',
  `status` enum('pending','dismissed') NOT NULL DEFAULT 'pending' COMMENT 'pending=有効（カウント対象） / dismissed=棄却（カウント対象外）',
  `ip_address` varchar(45) DEFAULT NULL COMMENT '通報者のIPアドレス（IPv6対応）',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `handled_at` datetime DEFAULT NULL COMMENT '管理者が棄却/有効に戻した日時',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_valuation_reports_valuation_reporter` (`valuation_id`, `reporter_user_id`) COMMENT '同じ評価を同じ人が重複して通報できない',
  KEY `idx_valuation_reports_reported_user` (`reported_user_id`, `status`),
  KEY `idx_valuation_reports_reporter_user` (`reporter_user_id`),
  KEY `idx_valuation_reports_product_id` (`product_id`),
  CONSTRAINT `fk_valuation_reports_reported_user` FOREIGN KEY (`reported_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_valuation_reports_reporter_user` FOREIGN KEY (`reporter_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_valuation_reports_valuation` FOREIGN KEY (`valuation_id`) REFERENCES `product_valuations` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
