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
