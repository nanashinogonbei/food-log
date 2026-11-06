<?php

declare(strict_types=1);

require __DIR__ . '/db.php';

/**
 * ユーザー情報 (/mypage/[userID]/user) 用のAPI。
 *
 * GET  /api/users.php?publicId=<公開用ID>
 *   公開用IDのユーザーの公開情報（公開用ID・表示名）を返す（誰でも見られるユーザーページ用）。
 *   存在しない場合は404。登録はしない。
 * GET  /api/users.php?userId=<ClerkのユーザーID>
 *   サイト用のユーザー情報（公開用ID・表示名）を返す。
 *   まだ登録されていないユーザーの場合は、ランダムな公開用IDを発行して新規登録してから返す。
 * POST /api/users.php (userId, displayName)
 *   表示名を更新する。公開用IDは変更できない。
 *
 * レスポンスにClerkのユーザーIDは含めない（公開用IDのみ返す）。
 *
 * 公開用ID・ユーザー行の作成処理は api/db.php (findOrCreateUser) にある。
 *
 * 注意: 他のAPIと同様、リクエストの userId をそのまま信用する簡易実装。
 * 本来は Authorization ヘッダーのClerkセッションをサーバー側で検証し、
 * そこから得た本人のIDを使うべき。
 */

const DISPLAY_NAME_MAX_LENGTH = 50;

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
 * フロントに返すJSON形式に整形する（Clerkのユーザー IDは含めない）。
 *
 * @param array{public_id:string,display_name:?string} $user
 * @return array{publicId:string,displayName:?string}
 */
function formatUser(array $user): array
{
    return [
        'publicId' => $user['public_id'],
        'displayName' => $user['display_name'],
    ];
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $publicId = trim((string) ($_GET['publicId'] ?? ''));

    if ($publicId !== '') {
        try {
            $pdo = getPdoConnection();
            $stmt = $pdo->prepare('SELECT public_id, display_name FROM users WHERE public_id = :public_id');
            $stmt->execute(['public_id' => $publicId]);
            $found = $stmt->fetch();
        } catch (Throwable $e) {
            respondError(500, 'ユーザー情報の取得に失敗しました。');
        }

        if ($found === false) {
            respondError(404, 'ユーザーが見つかりません。');
        }

        echo json_encode(formatUser($found), JSON_UNESCAPED_UNICODE);
        exit;
    }

    $userId = trim((string) ($_GET['userId'] ?? ''));

    if ($userId === '') {
        respondError(400, 'ユーザーIDが指定されていません。');
    }

    try {
        $pdo = getPdoConnection();
        echo json_encode(formatUser(findOrCreateUser($pdo, $userId)), JSON_UNESCAPED_UNICODE);
    } catch (Throwable $e) {
        respondError(500, 'ユーザー情報の取得に失敗しました。');
    }

    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError(405, 'Method Not Allowed');
}

$userId = trim((string) ($_POST['userId'] ?? ''));
$displayName = trim((string) ($_POST['displayName'] ?? ''));

if ($userId === '') {
    respondError(400, 'ユーザーIDが指定されていません。');
}

if ($displayName === '') {
    respondError(400, '表示名を入力してください。');
}

if (mb_strlen($displayName) > DISPLAY_NAME_MAX_LENGTH) {
    respondError(400, '表示名は' . DISPLAY_NAME_MAX_LENGTH . '文字以内で入力してください。');
}

try {
    $pdo = getPdoConnection();

    // 未登録のユーザーでも更新できるよう、先に行を用意する
    findOrCreateUser($pdo, $userId);

    $updateStmt = $pdo->prepare('UPDATE users SET display_name = :display_name WHERE clerk_user_id = :clerk_user_id');
    $updateStmt->execute(['display_name' => $displayName, 'clerk_user_id' => $userId]);

    echo json_encode(formatUser(findOrCreateUser($pdo, $userId)), JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    respondError(500, 'ユーザー情報の更新に失敗しました。');
}
