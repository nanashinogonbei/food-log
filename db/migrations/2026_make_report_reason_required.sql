-- 通報理由(reason)を必須にする（valuation_reports.reason を NOT NULL に変更）
--
-- 【対象】先に db/reports.sql（reason が NULL 許可の版）を適用済みのDBのみ。
--   これから db/reports.sql を新規に適用するDBでは不要です。
-- 既に理由が未入力(NULL)の通報がある場合は、NOT NULL に変更できないため先に補完する。

SET NAMES utf8mb4;

UPDATE `valuation_reports` SET `reason` = '（理由未入力）' WHERE `reason` IS NULL OR `reason` = '';

ALTER TABLE `valuation_reports`
  MODIFY COLUMN `reason` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '通報理由（必須）';
