<?php

declare(strict_types=1);

require __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');

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

    // 自己参照(parent)で親カテゴリーのslugも一緒に取得し、
    // フロント側で階層(大カテゴリー/小カテゴリー)を組み立てやすくする
    $stmt = $pdo->query(
        'SELECT
            c.id,
            c.slug,
            c.label,
            c.`order` AS `order`,
            c.parent,
            p.slug AS parent_slug
         FROM categories c
         LEFT JOIN categories p ON p.id = c.parent
         ORDER BY (c.parent IS NULL) DESC, c.parent ASC, c.`order` ASC'
    );

    $rows = $stmt->fetchAll();

    $categories = array_map(static function (array $row): array {
        return [
            'id' => (int) $row['id'],
            'slug' => $row['slug'],
            'label' => $row['label'],
            'order' => (int) $row['order'],
            'parentSlug' => $row['parent_slug'],
        ];
    }, $rows);

    echo json_encode($categories, JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'カテゴリーの取得に失敗しました'], JSON_UNESCAPED_UNICODE);
}
