<?php

declare(strict_types=1);

require __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed'], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $pdo = getPdoConnection();

    // c.id を slug として扱い、親の id (c.parent) を parent_slug として取得
    $stmt = $pdo->query(
        'SELECT
            c.id,
            c.name,
			c.label,
			c.filename,
            c.order,
            c.parent,
			CAST(c.id AS CHAR) AS slug,
            CAST(p.id AS CHAR) AS parent_slug
         FROM categories c
         LEFT JOIN categories p ON p.id = c.parent
         ORDER BY (c.parent IS NULL) DESC, c.parent ASC, c.order ASC'
    );

    $rows = $stmt->fetchAll();

    $categories = array_map(static function (array $row): array {
        return [
            'id' => (int) $row['id'],
            'slug' => $row['slug'], // idの文字列 (例: "1")
            'name' => $row['name'],
			'label' => $row['label'],
			'filename' => $row['filename'],
            'order' => (int) $row['order'],
            'parentSlug' => $row['parent_slug'], // 親idの文字列 (例: "2" または null)
        ];
    }, $rows);

    echo json_encode($categories, JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'カテゴリーの取得に失敗しました'], JSON_UNESCAPED_UNICODE);
}
