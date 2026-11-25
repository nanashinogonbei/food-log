<?php

declare(strict_types=1);

require __DIR__ . '/db.php';

/**
 * 商品ページ (/product/[id]) の「この商品の画像を投稿する」から、商品画像を申請するAPI。
 *
 * GET  /api/product-photo-requests.php?userId=xxx
 *   ログイン中ユーザー本人が投稿した画像の一覧（承認待ち・承認済み・却下済みすべて、新しい投稿が先頭）。
 *   マイページの「商品画像 一覧」(/mypage/[userID]/image) 用。
 * POST /api/product-photo-requests.php (multipart/form-data)
 *   userId   : ClerkのユーザーID
 *   productId: 画像を追加したい商品のID（公開中=approved の商品のみ）
 *   photo[]  : 画像ファイル（複数可。送信順がそのまま優先順位。JPEG/PNG/WebP、1枚5MBまで）
 *
 * 申請した画像は product_photos に status=pending で保存され、
 * 管理画面 (/admin/image) で承認されるまで商品ページには表示されない。
 */

// 商品申請 (api/products.php) と同じ保存先を使う
const UPLOAD_DIR = __DIR__ . '/../uploads/products/';
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
];
/** 1回の申請で送れる画像の最大枚数（src/product/photoRequest.ts の PHOTO_REQUEST_MAX_COUNT と合わせる） */
const MAX_PHOTOS_PER_REQUEST = 10;
/** 同じユーザーが同じ商品に対して、承認待ちのまま溜められる画像の最大枚数 */
const MAX_PENDING_PER_USER_PRODUCT = 20;

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed'], JSON_UNESCAPED_UNICODE);
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

// --- 自分が投稿した画像の一覧 ---

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $clerkUserId = trim((string) ($_GET['userId'] ?? ''));

    if ($clerkUserId === '') {
        respondError(400, 'ユーザーIDが取得できませんでした。再度ログインしてください。');
    }

    try {
        $pdo = getPdoConnection();
        $siteUserId = resolveUserId($pdo, $clerkUserId);

        $listStmt = $pdo->prepare(
            "SELECT ph.id, ph.product_id, p.name AS product_name, ph.filename, ph.status, ph.created_at
             FROM product_photos ph
             INNER JOIN products p ON p.id = ph.product_id
             WHERE ph.requested_by = :requested_by
             ORDER BY ph.created_at DESC, ph.display_order ASC, ph.id ASC"
        );
        $listStmt->execute(['requested_by' => $siteUserId]);

        $result = array_map(static fn (array $row): array => [
            'id' => (int) $row['id'],
            'productId' => (int) $row['product_id'],
            'productName' => $row['product_name'],
            // 却下された画像はファイルを削除済みのため、URLは返さない
            'url' => $row['status'] === 'rejected' ? null : '/uploads/products/' . $row['filename'],
            'status' => $row['status'],
            'createdAt' => $row['created_at'],
        ], $listStmt->fetchAll());

        echo json_encode($result, JSON_UNESCAPED_UNICODE);
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['error' => '投稿した画像の取得に失敗しました。'], JSON_UNESCAPED_UNICODE);
    }

    exit;
}

// --- 入力値の検証 ---

// TODO: 本来はClerkのセッション(Authorizationヘッダー)をサーバー側で検証すべきだが、
// このプロジェクトの他API同様、簡易的にフォームから受け取った値をそのまま使用している。
$userId = trim((string) ($_POST['userId'] ?? ''));
$productId = trim((string) ($_POST['productId'] ?? ''));

if ($userId === '') {
    respondError(400, 'ユーザーIDが取得できませんでした。再度ログインしてください。');
}

if ($productId === '' || !ctype_digit($productId)) {
    respondError(400, '商品IDが不正です。');
}

$ipAddress = getClientIpAddress();

// --- 画像の検証 (input name="photo[]" で複数送信される想定) ---

$photoFiles = $_FILES['photo'] ?? null;

if (!is_array($photoFiles) || !is_array($photoFiles['name'] ?? null)) {
    respondError(400, '画像を1枚以上アップロードしてください。');
}

$validatedPhotos = [];

foreach (array_keys($photoFiles['name']) as $i) {
    $error = $photoFiles['error'][$i];

    if ($error === UPLOAD_ERR_NO_FILE) {
        continue;
    }

    if ($error !== UPLOAD_ERR_OK) {
        respondError(400, '画像のアップロードに失敗しました。');
    }

    $tmpName = $photoFiles['tmp_name'][$i];

    if (!is_uploaded_file($tmpName)) {
        respondError(400, '画像のアップロードに失敗しました。');
    }

    if ((int) $photoFiles['size'][$i] > MAX_PHOTO_SIZE) {
        respondError(400, '画像は1枚あたり5MBまでアップロードできます。');
    }

    $mimeType = (string) (mime_content_type($tmpName) ?: '');

    if (!isset(ALLOWED_MIME_TYPES[$mimeType])) {
        respondError(400, '画像はJPEG・PNG・WebP形式のみアップロードできます。');
    }

    $validatedPhotos[] = ['tmp_name' => $tmpName, 'extension' => ALLOWED_MIME_TYPES[$mimeType]];
}

if (count($validatedPhotos) === 0) {
    respondError(400, '画像を1枚以上アップロードしてください。');
}

if (count($validatedPhotos) > MAX_PHOTOS_PER_REQUEST) {
    respondError(400, sprintf('画像は1回に%d枚まで申請できます。', MAX_PHOTOS_PER_REQUEST));
}

$pdo = null;
$savedFiles = [];

try {
    $pdo = getPdoConnection();

    // ClerkのユーザーIDをサイト用のユーザーID(users.id)に変換する（未登録なら登録する）
    $siteUserId = resolveUserId($pdo, $userId);

    // 通報を受けて投稿が制限されているアカウントは申請できない
    if (isUserRestricted($pdo, $siteUserId)) {
        respondError(403, REPORT_RESTRICTED_MESSAGE);
    }

    // 画像を追加できるのは、公開中(approved)の商品だけ
    $productStmt = $pdo->prepare("SELECT id FROM products WHERE id = :id AND status = 'approved'");
    $productStmt->execute(['id' => $productId]);

    if ($productStmt->fetch() === false) {
        respondError(404, '画像を投稿できる商品が見つかりません。');
    }

    // 承認待ちの画像を溜めすぎないようにする
    $pendingStmt = $pdo->prepare(
        "SELECT COUNT(*) FROM product_photos
         WHERE product_id = :product_id AND requested_by = :requested_by AND status = 'pending'"
    );
    $pendingStmt->execute(['product_id' => $productId, 'requested_by' => $siteUserId]);

    if ((int) $pendingStmt->fetchColumn() + count($validatedPhotos) > MAX_PENDING_PER_USER_PRODUCT) {
        respondError(429, '承認待ちの画像が多いため、承認されるまでしばらくお待ちください。');
    }

    if (!is_dir(UPLOAD_DIR) && !mkdir(UPLOAD_DIR, 0755, true) && !is_dir(UPLOAD_DIR)) {
        throw new RuntimeException('アップロード先ディレクトリを作成できませんでした。');
    }

    // 同じ申請の画像は同じ投稿日時にそろえる（承認後に投稿日順に並べるときの並びを安定させる）
    $postedTimestamp = time();
    $postedAt = date('Y-m-d H:i:s', $postedTimestamp);

    $pdo->beginTransaction();

    $insertStmt = $pdo->prepare(
        'INSERT INTO product_photos (product_id, requested_by, filename, display_order, ip_address, status, created_at)
         VALUES (:product_id, :requested_by, :filename, :display_order, :ip_address, :status, :created_at)'
    );

    foreach ($validatedPhotos as $index => $photo) {
        $filename = buildProductPhotoFilename((int) $productId, $postedTimestamp, $index + 1, $photo['extension'], UPLOAD_DIR);

        if (!move_uploaded_file($photo['tmp_name'], UPLOAD_DIR . $filename)) {
            throw new RuntimeException('画像の保存に失敗しました。');
        }

        $savedFiles[] = $filename;

        $insertStmt->execute([
            'product_id' => $productId,
            'requested_by' => $siteUserId,
            'filename' => $filename,
            'display_order' => $index,
            'ip_address' => $ipAddress,
            'status' => 'pending',
            'created_at' => $postedAt,
        ]);
    }

    $pdo->commit();

    http_response_code(201);
    echo json_encode(['count' => count($savedFiles), 'status' => 'pending'], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    if ($pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    // DBに記録されなかった画像ファイルが残らないようにする
    foreach ($savedFiles as $filename) {
        $path = UPLOAD_DIR . $filename;
        if (is_file($path)) {
            @unlink($path);
        }
    }

    http_response_code(500);
    echo json_encode(['error' => '画像の申請に失敗しました。'], JSON_UNESCAPED_UNICODE);
}
