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
