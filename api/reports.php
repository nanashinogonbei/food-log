<?php

declare(strict_types=1);

require __DIR__ . '/db.php';

/**
 * 商品評価の通報API（製品ページ /product/[id] の「通報する」用）。
 *
 * POST /api/reports.php (reporterUserId, valuationId, reason)
 *   指定した評価を不適切な投稿として通報する。管理者は /admin/report で確認できる。
 *   - 通報理由(reason)は必須（500文字以内）。
 *   - 自分の評価は通報できない。
 *   - 同じ人が同じ評価を通報できるのは1回のみ（2回目以降は409）。
 * GET  /api/reports.php?reporterUserId=xxx
 *   指定ユーザーが通報済みの評価IDの一覧を返す（「通報済み」表示用）。
 *
 * 有効な通報を3人以上から受けたアカウントは投稿できなくなる（api/db.php の isUserRestricted）。
 */

const REPORT_REASON_MAX_LENGTH = 500;

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
    handleListReportedValuationIds();
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
 * 指定ユーザーが通報した評価のID一覧を返す。
 * 管理者が棄却した通報も含める（棄却後も「通報済み」表示のままにし、再通報でカウントされ直すのを防ぐ）。
 */
function handleListReportedValuationIds(): void
{
    $reporterUserId = trim((string) ($_GET['reporterUserId'] ?? ''));

    if ($reporterUserId === '') {
        echo json_encode([], JSON_UNESCAPED_UNICODE);
        return;
    }

    try {
        $pdo = getPdoConnection();
        $stmt = $pdo->prepare(
            'SELECT valuation_id FROM valuation_reports
             WHERE reporter_user_id = :reporter_user_id AND valuation_id IS NOT NULL'
        );
        $stmt->execute(['reporter_user_id' => $reporterUserId]);

        echo json_encode(
            array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN)),
            JSON_UNESCAPED_UNICODE
        );
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['error' => '通報済みの評価の取得に失敗しました。'], JSON_UNESCAPED_UNICODE);
    }
}

/**
 * 通報があったことを管理者にメールで知らせる（api/config.php の report_notify_email が設定されている場合のみ）。
 *
 * 注意: PHPの mail() 関数を使った簡易実装。サーバー側にsendmail等のMTAが設定されていないと
 * 実際には送信されない。失敗しても通報の登録自体は失敗させないため、例外は投げない。
 */
function notifyAdminOfReport(int $reportId, int $productId, string $reason): void
{
    $configPath = __DIR__ . '/config.php';

    if (!file_exists($configPath)) {
        return;
    }

    /** @var array{report_notify_email?:string} $config */
    $config = require $configPath;
    $to = trim((string) ($config['report_notify_email'] ?? ''));

    if ($to === '') {
        return;
    }

    $subject = '【Food Log】商品評価が通報されました';
    $body = "商品評価が通報されました。\n\n"
        . "通報ID: {$reportId}\n"
        . "商品ID: {$productId}\n"
        . "通報理由: {$reason}\n\n"
        . "管理画面の「通報 管理」(/admin/report) で内容を確認してください。";

    $headers = "Content-Type: text/plain; charset=UTF-8\r\n";

    @mail($to, mb_encode_mimeheader($subject, 'UTF-8'), $body, $headers);
}

// --- 入力値の検証 ---

// TODO: 本来はClerkのセッション(Authorizationヘッダー)をサーバー側で検証すべきだが、
// このプロジェクトの他API同様、簡易的にフォームから受け取った値をそのまま使用している。
$reporterUserId = trim((string) ($_POST['reporterUserId'] ?? ''));
$valuationId = trim((string) ($_POST['valuationId'] ?? ''));
$reason = trim((string) ($_POST['reason'] ?? ''));

if ($reporterUserId === '') {
    respondError(400, 'ユーザーIDが取得できませんでした。再度ログインしてください。');
}

if ($valuationId === '' || !ctype_digit($valuationId)) {
    respondError(400, '通報する評価を指定してください。');
}

if ($reason === '') {
    respondError(400, '通報理由を入力してください。');
}

if (mb_strlen($reason) > REPORT_REASON_MAX_LENGTH) {
    respondError(400, sprintf('通報理由は%d文字以内で入力してください。', REPORT_REASON_MAX_LENGTH));
}

try {
    $pdo = getPdoConnection();

    $valuationStmt = $pdo->prepare(
        'SELECT id, product_id, user_id, score, comment FROM product_valuations WHERE id = :id'
    );
    $valuationStmt->execute(['id' => $valuationId]);
    $valuation = $valuationStmt->fetch();

    if ($valuation === false) {
        respondError(404, '通報する評価が見つかりません。（既に削除された可能性があります）');
    }

    if ($valuation['user_id'] === $reporterUserId) {
        respondError(400, '自分の投稿は通報できません。');
    }

    $insertStmt = $pdo->prepare(
        'INSERT INTO valuation_reports
            (valuation_id, product_id, reported_user_id, reporter_user_id, valuation_score,
             valuation_comment, reason, status, ip_address, created_at)
         VALUES
            (:valuation_id, :product_id, :reported_user_id, :reporter_user_id, :valuation_score,
             :valuation_comment, :reason, :status, :ip_address, NOW())'
    );

    try {
        $insertStmt->execute([
            'valuation_id' => $valuation['id'],
            'product_id' => $valuation['product_id'],
            'reported_user_id' => $valuation['user_id'],
            'reporter_user_id' => $reporterUserId,
            'valuation_score' => $valuation['score'],
            'valuation_comment' => $valuation['comment'],
            'reason' => $reason,
            'status' => 'pending',
            'ip_address' => getClientIpAddress(),
        ]);
    } catch (PDOException $e) {
        // UNIQUE KEY (valuation_id, reporter_user_id) に抵触 = 同じ評価を既に通報済み
        if ((string) $e->getCode() === '23000') {
            respondError(409, 'この評価は既に通報済みです。');
        }

        throw $e;
    }

    $reportId = (int) $pdo->lastInsertId();

    notifyAdminOfReport($reportId, (int) $valuation['product_id'], $reason);

    http_response_code(201);
    echo json_encode(['id' => $reportId], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => '通報の送信に失敗しました。'], JSON_UNESCAPED_UNICODE);
}
