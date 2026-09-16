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
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    handleListValuations();
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    handleDeleteValuation();
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
 * GET /api/valuations.php?ranking=weekly|monthly|quarterly
 *   期間内（週間=直近7日/月間=直近1ヶ月/四半期=直近3ヶ月）に投稿された評価数の多い順に
 *   商品を最大5件返す（トップページの「注目の商品」ランキング用）。
 * GET /api/valuations.php?userId=xxx
 *   指定ユーザーが投稿した評価一覧を返す（マイページの商品評価タブ用）。
 * GET /api/valuations.php?productId=1
 *   指定商品に投稿された評価一覧を返す（製品ページ用）。
 * ranking, userId+productId はこの優先順位で1つだけ処理する。いずれも未指定の場合は空配列を返す。
 */
function handleListValuations(): void
{
    $ranking = trim((string) ($_GET['ranking'] ?? ''));

    if ($ranking !== '') {
        handleProductRanking($ranking);
        return;
    }

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
                    v.purchase_price, v.purchase_store, v.created_at, v.updated_at
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
                'updatedAt' => $row['updated_at'],
            ];
        }, $rows);

        echo json_encode($result, JSON_UNESCAPED_UNICODE);
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['error' => '評価一覧の取得に失敗しました。'], JSON_UNESCAPED_UNICODE);
    }
}

/**
 * 期間内に投稿された評価数の多い順に商品を最大5件返す（トップページのランキング用）。
 * period は 'weekly'（直近7日）/ 'monthly'（直近1ヶ月）/ 'quarterly'（直近3ヶ月）のいずれか。
 * 不正な period の場合は空配列を返す。
 */
function handleProductRanking(string $period): void
{
    $intervals = [
        'weekly' => '7 DAY',
        'monthly' => '1 MONTH',
        'quarterly' => '3 MONTH',
    ];

    if (!isset($intervals[$period])) {
        echo json_encode([], JSON_UNESCAPED_UNICODE);
        return;
    }

    try {
        $pdo = getPdoConnection();

        // $intervals はホワイトリストの固定値のみを埋め込むため、SQLインジェクションの心配はない。
        $stmt = $pdo->query(
            "SELECT v.product_id, COUNT(*) AS valuation_count
             FROM product_valuations v
             WHERE v.created_at >= NOW() - INTERVAL {$intervals[$period]}
             GROUP BY v.product_id
             ORDER BY valuation_count DESC, v.product_id ASC
             LIMIT 5"
        );
        $rankingRows = $stmt->fetchAll();

        if (count($rankingRows) === 0) {
            echo json_encode([], JSON_UNESCAPED_UNICODE);
            return;
        }

        $productIds = array_map(static fn (array $row): int => (int) $row['product_id'], $rankingRows);
        $placeholders = implode(',', array_fill(0, count($productIds), '?'));

        $productStmt = $pdo->prepare("SELECT id, name FROM products WHERE id IN ($placeholders) AND status != 'pending'");
        $productStmt->execute($productIds);
        $nameByProductId = [];
        foreach ($productStmt->fetchAll() as $row) {
            $nameByProductId[(int) $row['id']] = $row['name'];
        }

        $photoStmt = $pdo->prepare(
            "SELECT product_id, filename FROM product_photos
             WHERE product_id IN ($placeholders)
             ORDER BY product_id ASC, display_order ASC"
        );
        $photoStmt->execute($productIds);
        $photoByProductId = [];
        foreach ($photoStmt->fetchAll() as $row) {
            $pid = (int) $row['product_id'];
            if (!isset($photoByProductId[$pid])) {
                $photoByProductId[$pid] = UPLOAD_URL_BASE . $row['filename'];
            }
        }

        $result = [];
        foreach ($rankingRows as $row) {
            $pid = (int) $row['product_id'];

            // 商品が削除済みなどで名前が引けない場合はランキングから除外する
            if (!isset($nameByProductId[$pid])) {
                continue;
            }

            $result[] = [
                'rank' => count($result) + 1,
                'productId' => $pid,
                'productName' => $nameByProductId[$pid],
                'productPhoto' => $photoByProductId[$pid] ?? null,
                'valuationCount' => (int) $row['valuation_count'],
            ];
        }

        echo json_encode($result, JSON_UNESCAPED_UNICODE);
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['error' => 'ランキングの取得に失敗しました。'], JSON_UNESCAPED_UNICODE);
    }
}

/**
 * DELETE /api/valuations.php?id=123&userId=xxx
 *   指定IDの評価を削除する（製品ページの「削除」リンク用）。
 * 投稿者本人（userIdが一致する評価）のみ削除できる。
 * DELETEリクエストはクエリ文字列でパラメータを受け取る（他APIのGETと合わせる）。
 */
function handleDeleteValuation(): void
{
    $id = trim((string) ($_GET['id'] ?? ''));
    // TODO: 本来はClerkのセッション(Authorizationヘッダー)をサーバー側で検証すべきだが、
    // このプロジェクトの他API同様、簡易的にクエリから受け取った値をそのまま使用している。
    $userId = trim((string) ($_GET['userId'] ?? ''));

    if ($id === '' || !ctype_digit($id)) {
        respondError(400, '削除する評価を指定してください。');
    }

    if ($userId === '') {
        respondError(400, 'ユーザーIDが取得できませんでした。再度ログインしてください。');
    }

    try {
        $pdo = getPdoConnection();

        $checkStmt = $pdo->prepare('SELECT user_id FROM product_valuations WHERE id = :id');
        $checkStmt->execute(['id' => $id]);
        $row = $checkStmt->fetch();

        if ($row === false) {
            respondError(404, '指定された評価が見つかりません。');
        }

        if ($row['user_id'] !== $userId) {
            respondError(403, 'この評価を削除する権限がありません。');
        }

        $deleteStmt = $pdo->prepare('DELETE FROM product_valuations WHERE id = :id');
        $deleteStmt->execute(['id' => $id]);

        http_response_code(200);
        echo json_encode(['id' => (int) $id], JSON_UNESCAPED_UNICODE);
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['error' => '評価の削除に失敗しました。'], JSON_UNESCAPED_UNICODE);
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

    // 同一ユーザー・同一商品の評価が既に存在するか確認する。
    // 存在する場合は「新規投稿」ではなく「既存の評価内容を修正」として扱い、
    // 同じ商品に対して複数の評価が登録されないようにする。
    $existingStmt = $pdo->prepare(
        'SELECT id FROM product_valuations WHERE product_id = :product_id AND user_id = :user_id'
    );
    $existingStmt->execute([
        'product_id' => $productId,
        'user_id' => $userId,
    ]);
    $existingRow = $existingStmt->fetch();

    $purchasePriceValue = $purchasePrice !== '' ? $purchasePrice : null;
    $purchaseStoreValue = $purchaseStore !== '' ? $purchaseStore : null;

    if ($existingRow !== false) {
        // --- 更新（修正投稿） ---
        $valuationId = (int) $existingRow['id'];
        $action = 'updated';

        $updateStmt = $pdo->prepare(
            'UPDATE product_valuations
             SET score = :score, comment = :comment, purchase_price = :purchase_price,
                 purchase_store = :purchase_store, updated_at = NOW()
             WHERE id = :id'
        );
        $updateStmt->execute([
            'score' => $score,
            'comment' => $comment,
            'purchase_price' => $purchasePriceValue,
            'purchase_store' => $purchaseStoreValue,
            'id' => $valuationId,
        ]);
    } else {
        // --- 新規登録 ---
        $action = 'created';

        $insertStmt = $pdo->prepare(
            'INSERT INTO product_valuations (product_id, user_id, score, comment, purchase_price, purchase_store, created_at)
             VALUES (:product_id, :user_id, :score, :comment, :purchase_price, :purchase_store, NOW())'
        );

        try {
            $insertStmt->execute([
                'product_id' => $productId,
                'user_id' => $userId,
                'score' => $score,
                'comment' => $comment,
                'purchase_price' => $purchasePriceValue,
                'purchase_store' => $purchaseStoreValue,
            ]);
        } catch (PDOException $e) {
            // UNIQUE KEY (product_id, user_id) に抵触した場合（同時投稿などでの競合）は
            // 既存行を更新する処理にフォールバックする。
            if ((string) $e->getCode() !== '23000') {
                throw $e;
            }

            $action = 'updated';

            $raceStmt = $pdo->prepare(
                'SELECT id FROM product_valuations WHERE product_id = :product_id AND user_id = :user_id'
            );
            $raceStmt->execute(['product_id' => $productId, 'user_id' => $userId]);
            $raceRow = $raceStmt->fetch();
            $valuationId = (int) $raceRow['id'];

            $updateStmt = $pdo->prepare(
                'UPDATE product_valuations
                 SET score = :score, comment = :comment, purchase_price = :purchase_price,
                     purchase_store = :purchase_store, updated_at = NOW()
                 WHERE id = :id'
            );
            $updateStmt->execute([
                'score' => $score,
                'comment' => $comment,
                'purchase_price' => $purchasePriceValue,
                'purchase_store' => $purchaseStoreValue,
                'id' => $valuationId,
            ]);
        }

        if ($action === 'created') {
            $valuationId = (int) $pdo->lastInsertId();
        }
    }

    http_response_code($action === 'created' ? 201 : 200);
    echo json_encode([
        'id' => $valuationId,
        'productId' => (int) $productId,
        'score' => $score,
        'action' => $action,
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => '評価の登録に失敗しました。'], JSON_UNESCAPED_UNICODE);
}
