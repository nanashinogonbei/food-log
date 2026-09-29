<?php

declare(strict_types=1);

require __DIR__ . '/db.php';

/**
 * 管理画面「商品 管理」(/admin/product) 用のAPI。
 *
 * 「商品承認 管理」(/admin/product-approval, api/admin-product-approval.php)が
 * 申請中(pending)の商品を承認/却下するためのAPIなのに対し、こちらは
 * 承認済み・却下済みの商品の情報（名前・カテゴリー・会社名・写真）を後から
 * 編集するためのAPI。ステータスの変更や完了メールの送信は行わない。
 *
 * GET    /api/admin-products-manage.php?adminUserId=xxx
 *   ステータスが「申請中(pending)」以外の商品一覧を返す。
 * POST   /api/admin-products-manage.php (adminUserId, productId, name, category1, category2, distributor, manufacturing)
 *   商品情報を更新する（ステータスは変更しない）。
 * DELETE /api/admin-products-manage.php?adminUserId=xxx&photoId=123
 *   商品写真を1枚削除する（DBのレコードとアップロード済みファイルの両方）。
 *
 * 管理者かどうかは、フロントの管理者ページ(RequireAdmin)と同様に
 * config.php の admin_user_ids ホワイトリストと突き合わせて判定する
 * （.envのVITE_ADMIN_USER_IDSと同じ値を設定しておくこと）。
 */

// products.php で保存された商品写真の参照先と合わせる
const UPLOAD_DIR = __DIR__ . '/../uploads/products/';
const UPLOAD_URL_BASE = '/uploads/products/';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
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

/**
 * api/config.php を読み込む。
 *
 * @return array{admin_user_ids?:list<string>}
 */
function loadConfig(): array
{
    $configPath = __DIR__ . '/config.php';

    if (!file_exists($configPath)) {
        respondError(500, 'api/config.php が見つかりません。');
    }

    /** @var array{admin_user_ids?:list<string>} $config */
    $config = require $configPath;

    return $config;
}

/**
 * adminUserId が管理者ホワイトリストに含まれているか確認する。含まれていなければ403で終了する。
 *
 * @param list<string> $adminUserIds
 */
function requireAdminOrExit(string $adminUserId, array $adminUserIds): void
{
    if ($adminUserId === '' || !in_array($adminUserId, $adminUserIds, true)) {
        respondError(403, 'この操作を行う権限がありません。');
    }
}

/**
 * 商品レコードの配列に写真情報を付与し、フロントに返すJSON形式に整形する（管理画面用）。
 * 写真削除操作に必要な写真ID(photos[].id)も含める。
 *
 * @param list<array{id:int|string,name:string,category1:int|string|null,category2:int|string|null,distributor:string,manufacturing:string|null,status:string,created_at:string}> $products
 * @return list<array{id:int,name:string,category1:?string,category2:?string,distributor:string,manufacturing:?string,status:string,createdAt:string,photos:list<array{id:int,url:string}>}>
 */
function attachPhotosAndFormatForManage(PDO $pdo, array $products): array
{
    $productIds = array_map(static fn (array $row): int => (int) $row['id'], $products);
    $photosByProductId = [];

    if (count($productIds) > 0) {
        $photoPlaceholders = implode(',', array_fill(0, count($productIds), '?'));
        $photoStmt = $pdo->prepare(
            "SELECT id, product_id, filename FROM product_photos
             WHERE product_id IN ($photoPlaceholders)
             ORDER BY product_id ASC, display_order ASC"
        );
        $photoStmt->execute($productIds);

        foreach ($photoStmt->fetchAll() as $photoRow) {
            $productId = (int) $photoRow['product_id'];
            $photosByProductId[$productId] ??= [];
            $photosByProductId[$productId][] = [
                'id' => (int) $photoRow['id'],
                'url' => UPLOAD_URL_BASE . $photoRow['filename'],
            ];
        }
    }

    return array_map(static function (array $row) use ($photosByProductId): array {
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
}

/**
 * DELETE /api/admin-products-manage.php?adminUserId=xxx&photoId=123
 * 商品写真を1枚削除する（DBのレコードとアップロード済みファイルの両方）。
 *
 * @param list<string> $adminUserIds
 */
function handleDeletePhoto(array $adminUserIds): void
{
    $adminUserId = trim((string) ($_GET['adminUserId'] ?? ''));
    requireAdminOrExit($adminUserId, $adminUserIds);

    $photoId = trim((string) ($_GET['photoId'] ?? ''));

    if ($photoId === '' || !ctype_digit($photoId)) {
        respondError(400, '削除する写真を指定してください。');
    }

    try {
        $pdo = getPdoConnection();

        $stmt = $pdo->prepare('SELECT filename FROM product_photos WHERE id = :id');
        $stmt->execute(['id' => $photoId]);
        $photo = $stmt->fetch();

        if ($photo === false) {
            respondError(404, '指定された写真が見つかりません。');
        }

        $deleteStmt = $pdo->prepare('DELETE FROM product_photos WHERE id = :id');
        $deleteStmt->execute(['id' => $photoId]);

        // DBの削除が成功した後にファイルを削除する。ファイル削除に失敗しても
        // DB上は既に削除済みのため、レスポンスとしては成功を返す。
        $filePath = UPLOAD_DIR . $photo['filename'];
        if (is_file($filePath)) {
            @unlink($filePath);
        }

        echo json_encode(['id' => (int) $photoId], JSON_UNESCAPED_UNICODE);
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['error' => '写真の削除に失敗しました。'], JSON_UNESCAPED_UNICODE);
    }
}

$config = loadConfig();
/** @var list<string> $adminUserIds */
$adminUserIds = $config['admin_user_ids'] ?? [];

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    handleDeletePhoto($adminUserIds);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $adminUserId = trim((string) ($_GET['adminUserId'] ?? ''));
    requireAdminOrExit($adminUserId, $adminUserIds);

    try {
        $pdo = getPdoConnection();
        $stmt = $pdo->query(
            "SELECT id, name, category1, category2, distributor, manufacturing, status, created_at
             FROM products
             WHERE status <> 'pending'
             ORDER BY created_at DESC"
        );
        $products = $stmt->fetchAll();

        echo json_encode(attachPhotosAndFormatForManage($pdo, $products), JSON_UNESCAPED_UNICODE);
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['error' => '商品一覧の取得に失敗しました。'], JSON_UNESCAPED_UNICODE);
    }

    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed'], JSON_UNESCAPED_UNICODE);
    exit;
}

$adminUserId = trim((string) ($_POST['adminUserId'] ?? ''));
requireAdminOrExit($adminUserId, $adminUserIds);

$productId = trim((string) ($_POST['productId'] ?? ''));
$name = trim((string) ($_POST['name'] ?? ''));
$category1 = trim((string) ($_POST['category1'] ?? ''));
$category2 = trim((string) ($_POST['category2'] ?? ''));
$distributor = trim((string) ($_POST['distributor'] ?? ''));
$manufacturing = trim((string) ($_POST['manufacturing'] ?? ''));

if (!ctype_digit($productId)) {
    respondError(400, '商品IDが不正です。');
}

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

try {
    $pdo = getPdoConnection();

    $existingStmt = $pdo->prepare("SELECT id FROM products WHERE id = :id AND status <> 'pending'");
    $existingStmt->execute(['id' => $productId]);

    if ($existingStmt->fetch() === false) {
        respondError(404, '商品が見つかりません。');
    }

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

    $updateStmt = $pdo->prepare(
        'UPDATE products
         SET name = :name, category1 = :category1, category2 = :category2,
             distributor = :distributor, manufacturing = :manufacturing
         WHERE id = :id'
    );
    $updateStmt->execute([
        'name' => $name,
        'category1' => $category1,
        'category2' => $category2 !== '' ? $category2 : null,
        'distributor' => $distributor,
        'manufacturing' => $manufacturing !== '' ? $manufacturing : null,
        'id' => $productId,
    ]);

    $resultStmt = $pdo->prepare(
        'SELECT id, name, category1, category2, distributor, manufacturing, status, created_at
         FROM products WHERE id = :id'
    );
    $resultStmt->execute(['id' => $productId]);
    $updated = $resultStmt->fetch();

    echo json_encode(attachPhotosAndFormatForManage($pdo, [$updated])[0], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => '商品の更新に失敗しました。'], JSON_UNESCAPED_UNICODE);
}
