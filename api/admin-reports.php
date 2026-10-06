<?php

declare(strict_types=1);

require __DIR__ . '/db.php';

/**
 * 管理画面「通報 管理」(/admin/report) 用のAPI。
 *
 * GET  /api/admin-reports.php?adminUserId=xxx
 *   通報の一覧（有効な通報が先、新しい順）と、通報された投稿者ごとの
 *   「有効な通報者数」「投稿制限中かどうか」を返す。
 * POST /api/admin-reports.php (adminUserId, reportId, status)
 *   通報のステータスを変更する。
 *     status=dismissed : 棄却（誤通報など）。通報者数のカウント対象から外れ、
 *                        それにより3人未満に戻れば投稿制限も自動的に解除される。
 *     status=pending   : 有効に戻す（棄却の取り消し）。
 *
 * 管理者かどうかは、他の管理系API同様 config.php の admin_user_ids ホワイトリストと突き合わせて判定する
 * （.envのVITE_ADMIN_USER_IDSと同じ値を設定しておくこと）。
 */

// 投稿者のメールアドレスをClerkから取得する件数の上限（Clerk APIの呼び出し過多を避けるため）
const CLERK_LOOKUP_LIMIT = 30;

const SCORE_LABELS = [
    'poor' => 'イマイチ',
    'like' => '好き',
    'love' => '大好き',
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
 * Clerkのユーザーオブジェクトから表示用のメールアドレスを1つ選ぶ（プライマリ優先）。
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
 * Clerk Backend APIから指定したユーザーのメールアドレスを取得する。取得できなければ null。
 * （管理者が投稿者を特定しやすいように一覧に併記するためのもので、失敗しても一覧の取得は続行する）
 */
function fetchUserEmail(string $userId, string $clerkSecretKey): ?string
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

    return is_array($user) ? selectPrimaryEmail($user) : null;
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
            "SELECT r.id, r.valuation_id, r.product_id, p.name AS product_name,
                    r.reported_user_id, r.reporter_user_id, r.valuation_score, r.valuation_comment,
                    r.reason, r.status, r.created_at, r.handled_at
             FROM valuation_reports r
             LEFT JOIN products p ON p.id = r.product_id
             ORDER BY (r.status = 'pending') DESC, r.created_at DESC, r.id DESC"
        );
        $rows = $stmt->fetchAll();

        // 通報された投稿者ごとの「有効な通報者数」
        $countStmt = $pdo->query(
            "SELECT reported_user_id, COUNT(DISTINCT reporter_user_id) AS reporter_count
             FROM valuation_reports
             WHERE status = 'pending'
             GROUP BY reported_user_id"
        );
        $reporterCounts = [];
        foreach ($countStmt->fetchAll() as $countRow) {
            $reporterCounts[(string) $countRow['reported_user_id']] = (int) $countRow['reporter_count'];
        }

        // 投稿者のメールアドレス（有効な通報を受けている投稿者を優先し、件数上限までClerkから取得する）
        $clerkSecretKey = (string) ($config['clerk_secret_key'] ?? '');
        $emails = [];
        $lookupCount = 0;
        $reportedUserIds = array_values(array_unique(
            array_map(static fn (array $row): string => (string) $row['reported_user_id'], $rows)
        ));
        usort(
            $reportedUserIds,
            static fn (string $a, string $b): int => ($reporterCounts[$b] ?? 0) <=> ($reporterCounts[$a] ?? 0)
        );
        foreach ($reportedUserIds as $reportedUserId) {
            if ($lookupCount >= CLERK_LOOKUP_LIMIT) {
                break;
            }
            $emails[$reportedUserId] = fetchUserEmail($reportedUserId, $clerkSecretKey);
            $lookupCount++;
        }

        $reports = array_map(static function (array $row) use ($reporterCounts, $emails): array {
            $reportedUserId = (string) $row['reported_user_id'];
            $reporterCount = $reporterCounts[$reportedUserId] ?? 0;

            return [
                'id' => (int) $row['id'],
                'valuationId' => $row['valuation_id'] !== null ? (int) $row['valuation_id'] : null,
                'productId' => (int) $row['product_id'],
                'productName' => $row['product_name'],
                'reportedUserId' => $reportedUserId,
                'reportedUserEmail' => $emails[$reportedUserId] ?? null,
                'reporterUserId' => $row['reporter_user_id'],
                'score' => $row['valuation_score'],
                'scoreLabel' => SCORE_LABELS[$row['valuation_score']] ?? $row['valuation_score'],
                'comment' => $row['valuation_comment'],
                'reason' => $row['reason'],
                'status' => $row['status'],
                'createdAt' => $row['created_at'],
                'handledAt' => $row['handled_at'],
                'reportedUserReporterCount' => $reporterCount,
                'isReportedUserRestricted' => $reporterCount >= REPORT_RESTRICTION_THRESHOLD,
            ];
        }, $rows);

        echo json_encode([
            'restrictionThreshold' => REPORT_RESTRICTION_THRESHOLD,
            'reports' => $reports,
        ], JSON_UNESCAPED_UNICODE);
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['error' => '通報一覧の取得に失敗しました。'], JSON_UNESCAPED_UNICODE);
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

$reportId = trim((string) ($_POST['reportId'] ?? ''));
$status = trim((string) ($_POST['status'] ?? ''));

if ($reportId === '' || !ctype_digit($reportId)) {
    respondError(400, '通報IDが不正です。');
}

if (!in_array($status, ['pending', 'dismissed'], true)) {
    respondError(400, 'ステータスの指定が不正です。');
}

try {
    $pdo = getPdoConnection();

    $existingStmt = $pdo->prepare('SELECT id FROM valuation_reports WHERE id = :id');
    $existingStmt->execute(['id' => $reportId]);

    if ($existingStmt->fetch() === false) {
        respondError(404, '通報が見つかりません。');
    }

    // 有効に戻す場合は処理日時をクリアする
    $updateStmt = $pdo->prepare(
        'UPDATE valuation_reports
         SET status = :status, handled_at = IF(:status_for_handled = \'dismissed\', NOW(), NULL)
         WHERE id = :id'
    );
    $updateStmt->execute([
        'status' => $status,
        'status_for_handled' => $status,
        'id' => $reportId,
    ]);

    echo json_encode(['id' => (int) $reportId, 'status' => $status], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => '通報の更新に失敗しました。'], JSON_UNESCAPED_UNICODE);
}
