<?php

declare(strict_types=1);

require __DIR__ . '/db.php';

/**
 * 管理画面「商品承認 管理」(/admin/product-approval) 用のAPI。
 *
 * GET    /api/admin-product-approval.php?adminUserId=xxx
 *   ステータスが「申請中(pending)」の商品申請一覧のみを返す（申請者のUser IDも含む）。
 *   承認/却下の処理をすると、その商品はこの一覧から外れる。
 * POST   /api/admin-product-approval.php (adminUserId, productId, name, category1, category2, distributor, manufacturing, status)
 *   商品情報とステータスを更新する。ステータスが pending から approved/rejected に
 *   変わった（＝処理が確定した）場合、Clerk Backend APIで申請者のメールアドレスを取得し、
 *   完了メールを送信する。
 * DELETE /api/admin-product-approval.php?adminUserId=xxx&photoId=123
 *   不適切な商品写真を1枚削除する（DBのレコードとアップロード済みファイルの両方）。
 *
 * 管理者かどうかは、フロントの管理者ページ(RequireAdmin)と同様に
 * config.php の admin_user_ids ホワイトリストと突き合わせて判定する
 * （.envのVITE_ADMIN_USER_IDSと同じ値を設定しておくこと）。
 */

// products.php で保存された商品写真の参照先と合わせる
const UPLOAD_DIR = __DIR__ . '/../uploads/products/';
const UPLOAD_URL_BASE = '/uploads/products/';
const VALID_STATUSES = ['pending', 'approved', 'rejected'];

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
 * @return array{admin_user_ids?:list<string>,clerk_secret_key?:string}
 */
function loadConfig(): array
{
    $configPath = __DIR__ . '/config.php';

    if (!file_exists($configPath)) {
        respondError(500, 'api/config.php が見つかりません。');
    }

    /** @var array{admin_user_ids?:list<string>,clerk_secret_key?:string} $config */
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
 * Clerkのユーザーオブジェクト(email_addresses, primary_email_address_id)から
 * 通知先とすべきメールアドレスを1つ選ぶ。プライマリが無ければ先頭にフォールバックする。
 *
 * @param array<string, mixed> $user
 */
function selectPrimaryEmail(array $user): ?string
{
    if (!is_array($user['email_addresses'] ?? null)) {
        return null;
    }

    $primaryId = $user['primary_email_address_id'] ?? null;

    foreach ($user['email_addresses'] as $emailRecord) {
        if (is_array($emailRecord) && $primaryId !== null && ($emailRecord['id'] ?? null) === $primaryId) {
            $address = (string) ($emailRecord['email_address'] ?? '');
            return $address !== '' ? $address : null;
        }
    }

    $first = $user['email_addresses'][0] ?? null;

    if (is_array($first)) {
        $address = (string) ($first['email_address'] ?? '');
        return $address !== '' ? $address : null;
    }

    return null;
}

/**
 * Clerk Backend APIから指定したユーザーのメールアドレス（プライマリ）を取得する。
 * 取得できない場合はnullを返す（呼び出し側でメール送信をスキップする）。
 */
function fetchApplicantEmail(string $userId, string $clerkSecretKey): ?string
{
    if ($userId === '' || $clerkSecretKey === '') {
        return null;
    }

    $ch = curl_init('https://api.clerk.com/v1/users/' . rawurlencode($userId));
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $clerkSecretKey,
        ],
        CURLOPT_TIMEOUT => 5,
    ]);
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($response === false || $status !== 200) {
        return null;
    }

    $user = json_decode($response, true);

    if (!is_array($user)) {
        return null;
    }

    return selectPrimaryEmail($user);
}

/**
 * 商品申請の処理結果（承認/却下）を申請者にメールで通知する。
 *
 * 注意: PHPの mail() 関数を使った簡易実装。サーバー側にsendmail等のMTAが
 * 設定されていないと実際には送信されない。本番運用で確実に届けたい場合は
 * SendGrid等の外部メール配信サービスに置き換えることを推奨する。
 * メール送信に失敗しても管理画面の更新操作自体は失敗させないため、例外は投げない。
 */
function sendCompletionEmail(string $email, string $productName, string $status): void
{
    $isApproved = $status === 'approved';

    $subject = $isApproved
        ? '【Food Log】商品申請が承認されました'
        : '【Food Log】商品申請の審査結果について';

    $body = $isApproved
        ? "ご申請いただいた商品「{$productName}」が承認され、公開されました。\n\nご協力いただきありがとうございました。"
        : "ご申請いただいた商品「{$productName}」につきまして、今回は掲載を見送らせていただくことになりました。\n\nご協力いただきありがとうございました。";

    $headers = "Content-Type: text/plain; charset=UTF-8\r\n";

    @mail($email, mb_encode_mimeheader($subject, 'UTF-8'), $body, $headers);
}

/**
 * 商品レコードの配列に写真情報を付与し、フロントに返すJSON形式に整形する（管理画面用）。
 * 公開用API(api/products.php)と異なり、申請者のUser ID(requestedBy)と、
 * 写真削除操作に必要な写真ID(photos[].id)も含める。
 *
 * @param list<array{id:int|string,name:string,category1:int|string|null,category2:int|string|null,distributor:string,manufacturing:string|null,status:string,requested_by:string,created_at:string}> $products
 * @return list<array{id:int,name:string,category1:?string,category2:?string,distributor:string,manufacturing:?string,status:string,requestedBy:string,createdAt:string,photos:list<array{id:int,url:string}>}>
 */
function attachPhotosAndFormatForAdmin(PDO $pdo, array $products): array
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
            'requestedBy' => $row['requested_by'],
            'createdAt' => $row['created_at'],
            'photos' => $photosByProductId[$productId] ?? [],
        ];
    }, $products);
}

/**
 * DELETE /api/admin-products.php?adminUserId=xxx&photoId=123
 * 不適切な商品写真を1枚削除する（DBのレコードとアップロード済みファイルの両方）。
 * 商品自体やステータスには触れない（他の写真や商品情報はそのまま残る）。
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
            "SELECT id, name, category1, category2, distributor, manufacturing, status, requested_by, created_at
             FROM products
             WHERE status = 'pending'
             ORDER BY created_at DESC"
        );
        $products = $stmt->fetchAll();

        echo json_encode(attachPhotosAndFormatForAdmin($pdo, $products), JSON_UNESCAPED_UNICODE);
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['error' => '商品申請一覧の取得に失敗しました。'], JSON_UNESCAPED_UNICODE);
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
$status = trim((string) ($_POST['status'] ?? ''));

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

if (!in_array($status, VALID_STATUSES, true)) {
    respondError(400, 'ステータスの指定が不正です。');
}

try {
    $pdo = getPdoConnection();

    $existingStmt = $pdo->prepare('SELECT status, requested_by FROM products WHERE id = :id');
    $existingStmt->execute(['id' => $productId]);
    $existing = $existingStmt->fetch();

    if ($existing === false) {
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
             distributor = :distributor, manufacturing = :manufacturing, status = :status
         WHERE id = :id'
    );
    $updateStmt->execute([
        'name' => $name,
        'category1' => $category1,
        'category2' => $category2 !== '' ? $category2 : null,
        'distributor' => $distributor,
        'manufacturing' => $manufacturing !== '' ? $manufacturing : null,
        'status' => $status,
        'id' => $productId,
    ]);

    // pending → approved/rejected のように「処理が確定した」タイミングでのみ完了メールを送る。
    // 既にapproved/rejectedになっている申請の情報だけを後から編集したケースでは送らない。
    if ($status !== $existing['status'] && in_array($status, ['approved', 'rejected'], true)) {
        $email = fetchApplicantEmail((string) $existing['requested_by'], (string) ($config['clerk_secret_key'] ?? ''));

        if ($email !== null) {
            sendCompletionEmail($email, $name, $status);
        }
    }

    $resultStmt = $pdo->prepare(
        'SELECT id, name, category1, category2, distributor, manufacturing, status, requested_by, created_at
         FROM products WHERE id = :id'
    );
    $resultStmt->execute(['id' => $productId]);
    $updated = $resultStmt->fetch();

    echo json_encode(attachPhotosAndFormatForAdmin($pdo, [$updated])[0], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => '商品の更新に失敗しました。'], JSON_UNESCAPED_UNICODE);
}
