-- カテゴリー用テーブル（大カテゴリー／小カテゴリーを1テーブルで自己参照）
CREATE TABLE categories (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug       VARCHAR(255) NOT NULL,
  `order`    INT UNSIGNED NOT NULL DEFAULT 0,
  label      VARCHAR(255) NOT NULL,
  parent     INT UNSIGNED DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_slug (slug),
  KEY idx_categories_parent (parent),
  CONSTRAINT fk_categories_parent
    FOREIGN KEY (parent) REFERENCES categories (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 大カテゴリー
INSERT INTO categories (slug, `order`, label, parent) VALUES
  ('drink',  1, '飲料',     NULL),
  ('sweets', 2, 'スイーツ', NULL),
  ('snack',  3, 'スナック', NULL);

-- 小カテゴリー（飲料配下）
INSERT INTO categories (slug, `order`, label, parent) VALUES
  ('soda',   1, '清涼飲料', (SELECT id FROM (SELECT id FROM categories WHERE slug = 'drink') AS t)),
  ('tea',    2, 'お茶',     (SELECT id FROM (SELECT id FROM categories WHERE slug = 'drink') AS t)),
  ('coffee', 3, 'コーヒー', (SELECT id FROM (SELECT id FROM categories WHERE slug = 'drink') AS t));

-- 小カテゴリー（スイーツ配下）
INSERT INTO categories (slug, `order`, label, parent) VALUES
  ('chocolate', 1, 'チョコレート', (SELECT id FROM (SELECT id FROM categories WHERE slug = 'sweets') AS t)),
  ('cookie',    2, 'クッキー',     (SELECT id FROM (SELECT id FROM categories WHERE slug = 'sweets') AS t));

-- 小カテゴリー（スナック配下）
INSERT INTO categories (slug, `order`, label, parent) VALUES
  ('potato', 1, 'ポテト系', (SELECT id FROM (SELECT id FROM categories WHERE slug = 'snack') AS t));
