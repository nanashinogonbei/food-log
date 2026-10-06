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

CREATE TABLE `valuation_reports` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `valuation_id` int UNSIGNED DEFAULT NULL COMMENT '通報された評価のID（評価が削除された場合はNULL）',
  `product_id` int UNSIGNED NOT NULL,
  `reported_user_id` varchar(255) NOT NULL COMMENT '通報された評価の投稿者（Clerkのユーザー ID）',
  `reporter_user_id` varchar(255) NOT NULL COMMENT '通報したユーザー（Clerkのユーザー ID）',
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
  CONSTRAINT `fk_valuation_reports_valuation` FOREIGN KEY (`valuation_id`) REFERENCES `product_valuations` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
