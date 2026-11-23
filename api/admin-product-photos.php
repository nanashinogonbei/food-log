<?php

declare(strict_types=1);

require __DIR__ . '/db.php';

/**
 * 管理画面「商品画像 管理」(/admin/image) 用のAPI。
 * 商品ページの「この商品の画像を投稿する」から申請された画像を承認・却下する。
 *
 * GET  /api/admin-product-photos.php?adminUserId=xxx
 *   承認待ち(pending)の画像申請の一覧を返す（新しい申請が先頭）。
 * POST /api/admin-product-photos.php (adminUserId, requestId, action=approve|reject)
 *   approve: 画像の status を approved にする（投稿日は申請日時のまま）。商品ページに表示される。
 *   reject : 画像ファイルを削除し、申請を却下済みにする。
 *
 * 管理者かどうかは、他の管理者APIと同様に config.php の admin_user_ids ホワイトリストで判定する。
 */

// 商品申請 (api/products.php) と同じ保存先・参照先
const UPLOAD_DIR = __DIR__ . '/../uploads/products/';
const UPLOAD_URL_BASE = '/uploads/products/';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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

$config = loadConfig();
/** @var list<string> $adminUserIds */
$adminUserIds = $config['admin_user_ids'] ?? [];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $adminUserId = trim((string) ($_GET['adminUserId'] ?? ''));
    requireAdminOrExit($adminUserId, $adminUserIds);

    try {
        $pdo = getPdoConnection();
        $stmt = $pdo->query(
            "SELECT r.id, r.product_id, p.name AS product_name, r.filename, r.display_order,
                    u.public_id AS requested_by, r.created_at
             FROM product_photos r
             INNER JOIN products p ON p.id = r.product_id
             INNER JOIN users u ON u.id = r.requested_by
             WHERE r.status = 'pending'
             ORDER BY r.created_at DESC, r.display_order ASC, r.id ASC"
        );

        $result = array_map(static fn (array $row): array => [
            'id' => (int) $row['id'],
            'productId' => (int) $row['product_id'],
            'productName' => $row['product_name'],
            'url' => UPLOAD_URL_BASE . $row['filename'],
            'requestedBy' => $row['requested_by'],
            'createdAt' => $row['created_at'],
        ], $stmt->fetchAll());

        echo json_encode($result, JSON_UNESCAPED_UNICODE);
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['error' => '画像申請一覧の取得に失敗しました。'], JSON_UNESCAPED_UNICODE);
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

$requestId = trim((string) ($_POST['requestId'] ?? ''));
$action = trim((string) ($_POST['action'] ?? ''));

if ($requestId === '' || !ctype_digit($requestId)) {
    respondError(400, '画像申請のIDが不正です。');
}

if (!in_array($action, ['approve', 'reject'], true)) {
    respondError(400, '操作の指定が不正です。');
}

$pdo = null;

try {
    $pdo = getPdoConnection();
    $pdo->beginTransaction();

    // 二重に処理されないよう、行をロックして承認待ちか確認する
    $selectStmt = $pdo->prepare('SELECT * FROM product_photos WHERE id = :id FOR UPDATE');
    $selectStmt->execute(['id' => $requestId]);
    $photoRequest = $selectStmt->fetch();

    if ($photoRequest === false) {
        $pdo->rollBack();
        respondError(404, '画像申請が見つかりません。');
    }

    if ($photoRequest['status'] !== 'pending') {
        $pdo->rollBack();
        respondError(409, 'この画像申請はすでに処理されています。');
    }

    $updateStmt = $pdo->prepare('UPDATE product_photos SET status = :status, reviewed_at = NOW() WHERE id = :id');
    $updateStmt->execute([
        'status' => $action === 'approve' ? 'approved' : 'rejected',
        'id' => $requestId,
    ]);

    $pdo->commit();

    // 却下した画像のファイルは、DBの更新が成功した後で削除する（失敗しても処理自体は成功とする）
    if ($action === 'reject') {
        $filePath = UPLOAD_DIR . basename((string) $photoRequest['filename']);

        if (is_file($filePath)) {
            @unlink($filePath);
        }
    }

    echo json_encode(
        ['id' => (int) $requestId, 'status' => $action === 'approve' ? 'approved' : 'rejected'],
        JSON_UNESCAPED_UNICODE
    );
} catch (Throwable $e) {
    if ($pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    http_response_code(500);
    echo json_encode(['error' => '画像申請の処理に失敗しました。'], JSON_UNESCAPED_UNICODE);
}
