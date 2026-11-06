<?php

declare(strict_types=1);

/**
 * api/config.php.example をコピーして api/config.php を作成し、
 * 実際のDB接続情報を設定してください（api/config.php はgit管理外）。
 */
function getPdoConnection(): PDO
{
    $configPath = __DIR__ . '/config.php';

    if (!file_exists($configPath)) {
        throw new RuntimeException(
            'api/config.php が見つかりません。api/config.php.example をコピーして接続情報を設定してください。'
        );
    }

    /** @var array{host:string,port:string,database:string,username:string,password:string} $config */
    $config = require $configPath;

    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
        $config['host'],
        $config['port'],
        $config['database']
    );

    return new PDO($dsn, $config['username'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
}

/**
 * リクエスト元のIPアドレスを取得する（商品申請・商品評価の投稿時にDBへ記録する用）。
 *
 * 通常は REMOTE_ADDR を使用する。
 * リバースプロキシ/ロードバランサー経由でアクセスされる環境では、api/config.php の
 * 'trusted_proxies' にそのプロキシのIPを列挙すると、そのプロキシからの接続に限り
 * X-Forwarded-For ヘッダーから実際のクライアントIPを取得する。
 * （信頼できない接続元の X-Forwarded-For は偽装可能なため無視する）
 *
 * 取得できない/不正な値の場合は null を返す。
 */
function getClientIpAddress(): ?string
{
    $remoteAddr = filter_var($_SERVER['REMOTE_ADDR'] ?? '', FILTER_VALIDATE_IP);

    if ($remoteAddr === false) {
        return null;
    }

    $trustedProxies = [];
    $configPath = __DIR__ . '/config.php';

    if (file_exists($configPath)) {
        $config = require $configPath;
        $trustedProxies = is_array($config['trusted_proxies'] ?? null) ? $config['trusted_proxies'] : [];
    }

    if (!in_array($remoteAddr, $trustedProxies, true)) {
        return $remoteAddr;
    }

    $forwardedFor = trim((string) ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? ''));

    if ($forwardedFor === '') {
        return $remoteAddr;
    }

    // 右端（最も近いプロキシ）から順にたどり、信頼済みプロキシではない最初のIPをクライアントIPとする
    $forwardedIps = array_map('trim', explode(',', $forwardedFor));

    for ($i = count($forwardedIps) - 1; $i >= 0; $i--) {
        $ip = filter_var($forwardedIps[$i], FILTER_VALIDATE_IP);

        if ($ip === false) {
            return $remoteAddr;
        }

        if (!in_array($ip, $trustedProxies, true)) {
            return $ip;
        }
    }

    return $remoteAddr;
}

/**
 * サイト用ユーザー(usersテーブル)の公開用IDの仕様。
 * DBの各テーブルにはClerkのユーザーIDではなく、users.id（サイト用のID）を保存する。
 * フロントから受け取ったClerkのユーザーIDは、下の関数でusers.idに変換して使う。
 */
const PUBLIC_ID_LENGTH = 12;
const PUBLIC_ID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
const PUBLIC_ID_MAX_ATTEMPTS = 5;

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
 * ClerkのユーザーIDに対応するサイト用のユーザーID(users.id)を返す。未登録の場合は null。
 * 閲覧系（一覧取得など）で、登録のないユーザーを新規作成せずに照会したいときに使う。
 */
function findUserIdByClerkId(PDO $pdo, string $clerkUserId): ?int
{
    $stmt = $pdo->prepare('SELECT id FROM users WHERE clerk_user_id = :clerk_user_id');
    $stmt->execute(['clerk_user_id' => $clerkUserId]);
    $id = $stmt->fetchColumn();

    return $id === false ? null : (int) $id;
}

/**
 * ClerkのユーザーIDに対応するユーザー行を取得する。なければ公開用IDを発行して作成する。
 *
 * @return array{id:int|string,public_id:string,display_name:?string}
 */
function findOrCreateUser(PDO $pdo, string $clerkUserId): array
{
    $selectStmt = $pdo->prepare('SELECT id, public_id, display_name FROM users WHERE clerk_user_id = :clerk_user_id');
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
 * ClerkのユーザーIDに対応するサイト用のユーザーID(users.id)を返す。未登録なら登録してから返す。
 * 投稿・通報など、DBへ書き込む処理で使う。
 */
function resolveUserId(PDO $pdo, string $clerkUserId): int
{
    return (int) findOrCreateUser($pdo, $clerkUserId)['id'];
}

/** 有効な通報を、この人数以上の「別々のユーザー」から受けたアカウントは投稿できなくなる */
const REPORT_RESTRICTION_THRESHOLD = 3;

const REPORT_RESTRICTED_MESSAGE = 'このアカウントは通報を受けたため、投稿が制限されています。';

/**
 * 指定ユーザー(users.id)の評価に対する、有効な通報(status='pending')の通報者数（重複除外）を返す。
 * 同じ人が複数の評価を通報しても1人として数える。
 */
function countActiveReporters(PDO $pdo, int $userId): int
{
    $stmt = $pdo->prepare(
        "SELECT COUNT(DISTINCT reporter_user_id) FROM valuation_reports
         WHERE reported_user_id = :user_id AND status = 'pending'"
    );
    $stmt->execute(['user_id' => $userId]);

    return (int) $stmt->fetchColumn();
}

/**
 * 通報により投稿が制限されているアカウントかどうか。
 * 商品申請(api/products.php)・商品評価(api/valuations.php)の投稿前に確認する。
 */
function isUserRestricted(PDO $pdo, int $userId): bool
{
    return countActiveReporters($pdo, $userId) >= REPORT_RESTRICTION_THRESHOLD;
}

/**
 * クエリの categoryIds（カンマ区切りのカテゴリーID）を数字のみの重複なしID配列にして返す。
 * 未指定・不正な値のみの場合は空配列を返す。
 *
 * @return list<string>
 */
function parseCategoryIdsParam(string $param): array
{
    return array_values(array_unique(array_filter(
        array_map('trim', explode(',', $param)),
        static fn (string $id): bool => ctype_digit($id)
    )));
}

/**
 * 商品テーブル（エイリアス $alias）の category1 / category2 が指定カテゴリーIDのいずれかに
 * 一致する条件のSQL断片を返す（プレースホルダーは位置指定の ? を ID数×2 個使う）。
 * バインドする値は array_merge($categoryIds, $categoryIds) の順で渡すこと。
 *
 * @param list<string> $categoryIds 1件以上
 */
function buildCategoryFilterSql(string $alias, array $categoryIds): string
{
    $placeholders = implode(',', array_fill(0, count($categoryIds), '?'));

    return "({$alias}.category1 IN ($placeholders) OR {$alias}.category2 IN ($placeholders))";
}
