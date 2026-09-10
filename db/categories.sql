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
-- テーブルのデータのダンプ `categories`
--

INSERT INTO `categories` (`id`, `order`, `name`, `label`, `filename`, `parent`) VALUES
(1, 1, '飲料', 'beverages', 'beverages.png', NULL),
(2, 2, '菓子・スイーツ', 'confectionery', 'confectionery.png', NULL),
(3, 3, '生鮮加工・素材食品', 'fresh', 'fresh.png', NULL),
(4, 4, '主食類', 'staple', 'staple.png', NULL),
(5, 5, '調理済食品・簡便食', 'convenience', 'convenience.png', NULL),
(6, 6, '保存食', 'preserved', 'preserved.png', NULL),
(7, 7, 'ご飯の供', 'rice-accompaniment', 'rice-accompaniment.png', NULL),
(8, 8, '調味料・オイル', 'seasonings', 'seasonings.png', NULL),
(9, 1, 'ソフトドリンク', 'soft-drinks', NULL, 1),
(10, 2, '酒・アルコール', 'alcohol', NULL, 1),
(11, 3, '茶葉・粉末・濃縮液', 'instant', NULL, 1),
(12, 1, 'スイーツ・アイス', 'sweets', NULL, 2),
(13, 2, '菓子', 'confectionery', NULL, 2),
(14, 3, '生菓子', 'raw-sweets', NULL, 2),
(15, 4, 'おつまみ・珍味', 'snacks', NULL, 2),
(16, 1, '肉製品', 'meat', NULL, 3),
(17, 2, '魚介製品', 'seafood', NULL, 3),
(18, 3, '乳製品', 'dairy', NULL, 3),
(19, 4, '卵製品', 'egg', NULL, 3),
(20, 5, '豆製品', 'soy', NULL, 3),
(21, 6, '野菜製品', 'vegetable', NULL, 3),
(22, 7, '乾物', 'dried', NULL, 3),
(23, 1, '米', 'rice', NULL, 4),
(24, 2, '雑穀', 'mixed-grains', NULL, 4),
(25, 3, 'パン', 'bread', NULL, 4),
(26, 4, 'シリアル', 'cereal', NULL, 4),
(27, 5, '生麺', 'raw-noodles', NULL, 4),
(28, 1, '惣菜', 'prepared', NULL, 5),
(29, 2, '冷凍食品', 'frozen', NULL, 5),
(30, 3, 'インスタント', 'instant', NULL, 5),
(31, 4, 'レトルト', 'retort-pouch', NULL, 5),
(32, 5, '缶詰・瓶詰', 'canned-bottled', NULL, 5),
(33, 1, 'ふりかけ', 'furikake', NULL, 7),
(34, 2, '漬物', 'pickles', NULL, 7),
(35, 3, 'ジャム・はちみつ', 'spread', NULL, 7),
(36, 1, '調味料', 'seasonings', NULL, 8),
(37, 2, '香味料', 'aromatics', NULL, 8),
(38, 3, '油', 'oil', NULL, 8),
(39, 1, '水・炭酸水', 'water', NULL, 9),
(40, 2, '清涼飲料・ジュース', 'soft-drink', NULL, 9),
(41, 3, 'お茶', 'tea', NULL, 9),
(42, 4, 'コーヒー', 'coffee', NULL, 9),
(43, 5, 'ココア・チョコ', 'cocoa-chocolate', NULL, 9),
(44, 6, '牛乳・豆乳', 'milk', NULL, 9),
(45, 1, '水', 'water', NULL, 39),
(46, 2, '炭酸水', 'sparkling-water', NULL, 39),
(47, 1, '炭酸飲料', 'carbonated-drinks', NULL, 40),
(48, 2, 'エナジードリンク', 'energy-drinks', NULL, 40),
(49, 3, 'スポーツドリンク', 'sports-drinks', NULL, 40),
(50, 4, '果実飲料', 'fruit-beverages', NULL, 40),
(51, 5, '果物ジュース', 'fruit-juice', NULL, 40),
(52, 6, '野菜飲料', 'vegetable-beverages', NULL, 40),
(53, 7, '野菜ジュース', 'vegetable-juice', NULL, 40),
(54, 8, '乳性・乳酸菌飲料', 'milky-drinks', NULL, 40),
(55, 1, '緑茶', 'green-tea', NULL, 41),
(56, 2, 'ほうじ茶', 'roasted-green-tea', NULL, 41),
(57, 3, '麦茶', 'barley-tea', NULL, 41),
(58, 4, 'ルイボスティー', 'rooibos-tea', NULL, 41),
(59, 5, 'ハーブティー', 'herb-te', NULL, 41),
(60, 6, '烏龍茶', 'oolong-tea', NULL, 41),
(61, 7, '紅茶', 'tea', NULL, 41),
(62, 8, 'その他のお茶', 'other-tea', NULL, 41),
(63, 1, 'ブラックコーヒー', 'coffee', NULL, 42),
(64, 2, 'ミルクコーヒー', 'milk-coffee', NULL, 42),
(65, 1, 'ココア', 'cocoa', NULL, 43),
(66, 1, '牛乳', 'milk', NULL, 44),
(67, 2, '豆乳', 'soy-milk', NULL, 44);

--
-- ダンプしたテーブルのインデックス
--

--
-- テーブルのインデックス `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_categories_parent` (`parent`);

--
-- ダンプしたテーブルの AUTO_INCREMENT
--

--
-- テーブルの AUTO_INCREMENT `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=68;

--
-- ダンプしたテーブルの制約
--

--
-- テーブルの制約 `categories`
--
ALTER TABLE `categories`
  ADD CONSTRAINT `fk_categories_parent` FOREIGN KEY (`parent`) REFERENCES `categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
