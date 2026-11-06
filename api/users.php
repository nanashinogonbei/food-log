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
 * 注意: 他のAPIと同様、リクエストの userId をそのまま信用する簡易実装。
 * 本来は Authorization ヘッダーのClerkセッションをサーバー側で検証し、
 * そこから得た本人のIDを使うべき。
 */

const PUBLIC_ID_LENGTH = 12;
const PUBLIC_ID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
const DISPLAY_NAME_MAX_LENGTH = 50;
const PUBLIC_ID_MAX_ATTEMPTS = 5;

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
 * 推測されにくいランダムな公開用IDを生成する（暗号論的乱数を使用）。
 */
function generatePublicId(): string
{
    $maxIndex = strlen(PUBLIC_ID_CHARS) - 1;
    $publicId = '';

    for ($i = 0; $i < PUBLIC_ID_LENGTH; $i++) {
        $publicId .= PUBLIC_ID_CHARS[random_int(0, $maxIndex)];
    }

    return $publicId;
}

/**
 * ClerkのユーザーIDに対応するユーザー行を取得する。なければ公開用IDを発行して作成する。
 *
 * @return array{public_id:string,display_name:?string}
 */
function findOrCreateUser(PDO $pdo, string $clerkUserId): array
{
    $selectStmt = $pdo->prepare('SELECT public_id, display_name FROM users WHERE clerk_user_id = :clerk_user_id');
    $selectStmt->execute(['clerk_user_id' => $clerkUserId]);
    $user = $selectStmt->fetch();

    if ($user !== false) {
        return $user;
    }

    $insertStmt = $pdo->prepare(
        'INSERT INTO users (clerk_user_id, public_id) VALUES (:clerk_user_id, :public_id)'
    );

    for ($attempt = 0; $attempt < PUBLIC_ID_MAX_ATTEMPTS; $attempt++) {
        try {
            $insertStmt->execute(['clerk_user_id' => $clerkUserId, 'public_id' => generatePublicId()]);
            break;
        } catch (PDOException $e) {
            // 重複エラー(1062)のときだけ再試行する。同時アクセスで先に作成された場合や
            // 公開用IDが衝突した場合が該当するため、いったん取得し直して確認する。
            if (($e->errorInfo[1] ?? null) !== 1062) {
                throw $e;
            }

            $selectStmt->execute(['clerk_user_id' => $clerkUserId]);
            $existing = $selectStmt->fetch();

            if ($existing !== false) {
                return $existing;
            }
        }
    }

    $selectStmt->execute(['clerk_user_id' => $clerkUserId]);
    $created = $selectStmt->fetch();

    if ($created === false) {
        throw new RuntimeException('公開用IDの発行に失敗しました。');
    }

    return $created;
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
