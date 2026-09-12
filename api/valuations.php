<?php

declare(strict_types=1);

require __DIR__ . '/db.php';

// products.php で保存された商品写真の参照先と合わせる
const UPLOAD_URL_BASE = '/uploads/products/';

const SCORE_LABELS = [
    'poor' => 'イマイチ',
    'like' => '好き',
    'love' => '大好き',
];

const COMMENT_MIN_LENGTH = 10;
const COMMENT_MAX_LENGTH = 2000;
const PURCHASE_PRICE_MAX_LENGTH = 10;
const PURCHASE_STORE_MAX_LENGTH = 50;

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
    handleListValuations();
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
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

/**
 * GET /api/valuations.php?userId=xxx
 *   指定ユーザーが投稿した評価一覧を返す（マイページの商品評価タブ用）。
 * GET /api/valuations.php?productId=1
 *   指定商品に投稿された評価一覧を返す（製品ページ用）。
 * 両方指定された場合はAND条件になる。どちらも未指定の場合は空配列を返す。
 */
function handleListValuations(): void
{
    $userId = trim((string) ($_GET['userId'] ?? ''));
    $productId = trim((string) ($_GET['productId'] ?? ''));

    if ($userId === '' && $productId === '') {
        echo json_encode([], JSON_UNESCAPED_UNICODE);
        return;
    }

    if ($productId !== '' && !ctype_digit($productId)) {
        echo json_encode([], JSON_UNESCAPED_UNICODE);
        return;
    }

    try {
        $pdo = getPdoConnection();

        $conditions = [];
        $params = [];

        if ($userId !== '') {
            $conditions[] = 'v.user_id = :user_id';
            $params['user_id'] = $userId;
        }

        if ($productId !== '') {
            $conditions[] = 'v.product_id = :product_id';
            $params['product_id'] = $productId;
        }

        $where = implode(' AND ', $conditions);

        $stmt = $pdo->prepare(
            "SELECT v.id, v.product_id, p.name AS product_name, v.user_id, v.score, v.comment,
                    v.purchase_price, v.purchase_store, v.created_at
             FROM product_valuations v
             INNER JOIN products p ON p.id = v.product_id
             WHERE $where
             ORDER BY v.created_at DESC"
        );
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        $productIds = array_values(array_unique(
            array_map(static fn (array $row): int => (int) $row['product_id'], $rows)
        ));
        $photoByProductId = [];

        if (count($productIds) > 0) {
            $photoPlaceholders = implode(',', array_fill(0, count($productIds), '?'));
            $photoStmt = $pdo->prepare(
                "SELECT product_id, filename FROM product_photos
                 WHERE product_id IN ($photoPlaceholders)
                 ORDER BY product_id ASC, display_order ASC"
            );
            $photoStmt->execute($productIds);

            foreach ($photoStmt->fetchAll() as $photoRow) {
                $pid = (int) $photoRow['product_id'];
                if (!isset($photoByProductId[$pid])) {
                    $photoByProductId[$pid] = UPLOAD_URL_BASE . $photoRow['filename'];
                }
            }
        }

        $result = array_map(static function (array $row) use ($photoByProductId): array {
            $pid = (int) $row['product_id'];

            return [
                'id' => (int) $row['id'],
                'productId' => $pid,
                'productName' => $row['product_name'],
                'productPhoto' => $photoByProductId[$pid] ?? null,
                'userId' => $row['user_id'],
                'score' => $row['score'],
                'scoreLabel' => SCORE_LABELS[$row['score']] ?? $row['score'],
                'comment' => $row['comment'],
                'purchasePrice' => $row['purchase_price'],
                'purchaseStore' => $row['purchase_store'],
                'createdAt' => $row['created_at'],
            ];
        }, $rows);

        echo json_encode($result, JSON_UNESCAPED_UNICODE);
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['error' => '評価一覧の取得に失敗しました。'], JSON_UNESCAPED_UNICODE);
    }
}

// --- 入力値の検証 ---

$productId = trim((string) ($_POST['productId'] ?? ''));
$score = trim((string) ($_POST['score'] ?? ''));
$comment = trim((string) ($_POST['comment'] ?? ''));
$purchasePrice = trim((string) ($_POST['purchasePrice'] ?? ''));
$purchaseStore = trim((string) ($_POST['purchaseStore'] ?? ''));
// TODO: 本来はClerkのセッション(Authorizationヘッダー)をサーバー側で検証すべきだが、
// このプロジェクトの他API同様、簡易的にフォームから受け取った値をそのまま使用している。
$userId = trim((string) ($_POST['userId'] ?? ''));

if ($productId === '' || !ctype_digit($productId)) {
    respondError(400, '評価する商品を選択してください。');
}

if ($userId === '') {
    respondError(400, 'ユーザーIDが取得できませんでした。再度ログインしてください。');
}

if (!array_key_exists($score, SCORE_LABELS)) {
    respondError(400, '評価を選択してください。');
}

$commentLength = mb_strlen($comment);
if ($commentLength < COMMENT_MIN_LENGTH || $commentLength > COMMENT_MAX_LENGTH) {
    respondError(
        400,
        sprintf('コメントは%d文字以上%d文字以内で入力してください。', COMMENT_MIN_LENGTH, COMMENT_MAX_LENGTH)
    );
}

if ($purchasePrice !== '') {
    // 念のためサーバー側でも全角数字を半角に変換してから検証する
    $purchasePrice = mb_convert_kana($purchasePrice, 'n');

    if (!ctype_digit($purchasePrice) || strlen($purchasePrice) > PURCHASE_PRICE_MAX_LENGTH) {
        respondError(400, sprintf('購入金額は%d桁以内の数字で入力してください。', PURCHASE_PRICE_MAX_LENGTH));
    }
}

if (mb_strlen($purchaseStore) > PURCHASE_STORE_MAX_LENGTH) {
    respondError(400, sprintf('購入店舗は%d文字以内で入力してください。', PURCHASE_STORE_MAX_LENGTH));
}

try {
    $pdo = getPdoConnection();

    // 商品の存在チェック（DBに登録されている商品のみ評価可能）
    $checkStmt = $pdo->prepare('SELECT id FROM products WHERE id = :id');
    $checkStmt->execute(['id' => $productId]);
    if ($checkStmt->fetch() === false) {
        respondError(400, '指定された商品が存在しません。');
    }

    $insertStmt = $pdo->prepare(
        'INSERT INTO product_valuations (product_id, user_id, score, comment, purchase_price, purchase_store, created_at)
         VALUES (:product_id, :user_id, :score, :comment, :purchase_price, :purchase_store, NOW())'
    );

    $insertStmt->execute([
        'product_id' => $productId,
        'user_id' => $userId,
        'score' => $score,
        'comment' => $comment,
        'purchase_price' => $purchasePrice !== '' ? $purchasePrice : null,
        'purchase_store' => $purchaseStore !== '' ? $purchaseStore : null,
    ]);

    $valuationId = (int) $pdo->lastInsertId();

    http_response_code(201);
    echo json_encode([
        'id' => $valuationId,
        'productId' => (int) $productId,
        'score' => $score,
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => '評価の登録に失敗しました。'], JSON_UNESCAPED_UNICODE);
}
