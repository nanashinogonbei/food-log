<?php

declare(strict_types=1);

require __DIR__ . '/db.php';

// アップロードした写真の保存先。公開Webサーバーから /uploads/products/... で
// 参照できるディレクトリを想定（実運用時はサーバー構成に合わせて調整してください）。
const UPLOAD_DIR = __DIR__ . '/../uploads/products/';
const UPLOAD_URL_BASE = '/uploads/products/';
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
];

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    handleListProducts();
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed'], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * GET /api/products.php?categoryIds=1,9,39
 * 指定したカテゴリーID群のいずれかに category1 または category2 が一致する商品一覧を返す。
 * (カテゴリーページで「すべて」タブ＝親＋子カテゴリー群のIDをまとめて渡す使い方を想定)
 */
function handleListProducts(): void
{
    $categoryIdsParam = trim((string) ($_GET['categoryIds'] ?? ''));

    if ($categoryIdsParam === '') {
        echo json_encode([], JSON_UNESCAPED_UNICODE);
        return;
    }

    $categoryIds = array_values(array_unique(array_filter(
        array_map('trim', explode(',', $categoryIdsParam)),
        static fn (string $id): bool => ctype_digit($id)
    )));

    if (count($categoryIds) === 0) {
        echo json_encode([], JSON_UNESCAPED_UNICODE);
        return;
    }

    try {
        $pdo = getPdoConnection();

        $placeholders = implode(',', array_fill(0, count($categoryIds), '?'));

        $stmt = $pdo->prepare(
            "SELECT id, name, category1, category2, distributor, manufacturing, status, created_at
             FROM products
             WHERE category1 IN ($placeholders) OR category2 IN ($placeholders)
             ORDER BY created_at DESC"
        );
        $stmt->execute(array_merge($categoryIds, $categoryIds));
        $products = $stmt->fetchAll();

        $productIds = array_map(static fn (array $row): int => (int) $row['id'], $products);
        $photosByProductId = [];

        if (count($productIds) > 0) {
            $photoPlaceholders = implode(',', array_fill(0, count($productIds), '?'));
            $photoStmt = $pdo->prepare(
                "SELECT product_id, filename FROM product_photos
                 WHERE product_id IN ($photoPlaceholders)
                 ORDER BY product_id ASC, display_order ASC"
            );
            $photoStmt->execute($productIds);

            foreach ($photoStmt->fetchAll() as $photoRow) {
                $productId = (int) $photoRow['product_id'];
                $photosByProductId[$productId] ??= [];
                $photosByProductId[$productId][] = UPLOAD_URL_BASE . $photoRow['filename'];
            }
        }

        $result = array_map(static function (array $row) use ($photosByProductId): array {
            $productId = (int) $row['id'];

            return [
                'id' => $productId,
                'name' => $row['name'],
                'category1' => $row['category1'] !== null ? (string) $row['category1'] : null,
                'category2' => $row['category2'] !== null ? (string) $row['category2'] : null,
                'distributor' => $row['distributor'],
                'manufacturing' => $row['manufacturing'],
                'status' => $row['status'],
                'createdAt' => $row['created_at'],
                'photos' => $photosByProductId[$productId] ?? [],
            ];
        }, $products);

        echo json_encode($result, JSON_UNESCAPED_UNICODE);
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['error' => '商品一覧の取得に失敗しました。'], JSON_UNESCAPED_UNICODE);
    }
}

/**
 * エラーレスポンスを返して処理を終了する。
 */
function respondError(int $status, string $message): never
{
    http_response_code($status);
    echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

// --- 入力値の検証 ---

$name = trim((string) ($_POST['name'] ?? ''));
$category1 = trim((string) ($_POST['category1'] ?? ''));
$category2 = trim((string) ($_POST['category2'] ?? ''));
$distributor = trim((string) ($_POST['distributor'] ?? ''));
$manufacturing = trim((string) ($_POST['manufacturing'] ?? ''));
// TODO: 本来はClerkのセッション(Authorizationヘッダー)をサーバー側で検証すべきだが、
// このプロジェクトの他API同様、簡易的にフォームから受け取った値をそのまま使用している。
$userId = trim((string) ($_POST['userId'] ?? ''));

if ($name === '') {
    respondError(400, '商品名を入力してください。');
}

if ($category1 === '' || !ctype_digit($category1)) {
    respondError(400, 'カテゴリー1を選択してください。');
}

if ($category2 !== '' && !ctype_digit($category2)) {
    respondError(400, 'カテゴリー2の指定が不正です。');
}

if ($distributor === '') {
    respondError(400, '販売会社を入力してください。');
}

if ($userId === '') {
    respondError(400, 'ユーザーIDが取得できませんでした。再度ログインしてください。');
}

// --- 商品写真の検証 (input name="photo[]" で複数送信される想定) ---

$photoFiles = $_FILES['photo'] ?? null;

if (!is_array($photoFiles) || !is_array($photoFiles['name'] ?? null)) {
    respondError(400, '商品写真を1枚以上アップロードしてください。');
}

$photoCount = count($photoFiles['name']);
$validatedPhotos = [];

for ($i = 0; $i < $photoCount; $i++) {
    $error = $photoFiles['error'][$i];

    if ($error === UPLOAD_ERR_NO_FILE) {
        continue;
    }

    if ($error !== UPLOAD_ERR_OK) {
        respondError(400, '商品写真のアップロードに失敗しました。');
    }

    $tmpName = $photoFiles['tmp_name'][$i];
    $size = (int) $photoFiles['size'][$i];

    if (!is_uploaded_file($tmpName)) {
        respondError(400, '商品写真のアップロードに失敗しました。');
    }

    if ($size > MAX_PHOTO_SIZE) {
        respondError(400, '商品写真は1枚あたり5MBまでアップロードできます。');
    }

    $mimeType = (string) (mime_content_type($tmpName) ?: '');

    if (!isset(ALLOWED_MIME_TYPES[$mimeType])) {
        respondError(400, '商品写真はJPEG・PNG・WebP形式のみアップロードできます。');
    }

    $validatedPhotos[] = [
        'tmp_name' => $tmpName,
        'extension' => ALLOWED_MIME_TYPES[$mimeType],
    ];
}

if (count($validatedPhotos) === 0) {
    respondError(400, '商品写真を1枚以上アップロードしてください。');
}

$pdo = null;

try {
    $pdo = getPdoConnection();

    // カテゴリーの存在チェック
    $checkStmt = $pdo->prepare('SELECT id FROM categories WHERE id = :id');

    $checkStmt->execute(['id' => $category1]);
    if ($checkStmt->fetch() === false) {
        respondError(400, '指定されたカテゴリー1が存在しません。');
    }

    if ($category2 !== '') {
        $checkStmt->execute(['id' => $category2]);
        if ($checkStmt->fetch() === false) {
            respondError(400, '指定されたカテゴリー2が存在しません。');
        }
    }

    $pdo->beginTransaction();

    $insertStmt = $pdo->prepare(
        'INSERT INTO products (name, category1, category2, distributor, manufacturing, requested_by, status, created_at)
         VALUES (:name, :category1, :category2, :distributor, :manufacturing, :requested_by, :status, NOW())'
    );

    $insertStmt->execute([
        'name' => $name,
        'category1' => $category1,
        'category2' => $category2 !== '' ? $category2 : null,
        'distributor' => $distributor,
        'manufacturing' => $manufacturing !== '' ? $manufacturing : null,
        'requested_by' => $userId,
        'status' => 'pending',
    ]);

    $productId = (int) $pdo->lastInsertId();

    if (!is_dir(UPLOAD_DIR) && !mkdir(UPLOAD_DIR, 0755, true) && !is_dir(UPLOAD_DIR)) {
        throw new RuntimeException('アップロード先ディレクトリを作成できませんでした。');
    }

    $photoStmt = $pdo->prepare(
        'INSERT INTO product_photos (product_id, filename, display_order, created_at)
         VALUES (:product_id, :filename, :display_order, NOW())'
    );

    $savedPhotoUrls = [];

    foreach ($validatedPhotos as $index => $photo) {
        $filename = sprintf('%d_%s.%s', $productId, bin2hex(random_bytes(8)), $photo['extension']);
        $destination = UPLOAD_DIR . $filename;

        if (!move_uploaded_file($photo['tmp_name'], $destination)) {
            throw new RuntimeException('商品写真の保存に失敗しました。');
        }

        $photoStmt->execute([
            'product_id' => $productId,
            'filename' => $filename,
            'display_order' => $index,
        ]);

        $savedPhotoUrls[] = UPLOAD_URL_BASE . $filename;
    }

    $pdo->commit();

    http_response_code(201);
    echo json_encode([
        'id' => $productId,
        'status' => 'pending',
        'photos' => $savedPhotoUrls,
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    if ($pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    http_response_code(500);
    echo json_encode(['error' => '商品の登録に失敗しました。'], JSON_UNESCAPED_UNICODE);
}
