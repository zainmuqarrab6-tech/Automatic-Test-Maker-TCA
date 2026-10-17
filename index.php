<?php
/**
 * The Century Academy Test Maker - Universal Web Entry Point
 * Serves the compiled production React application if requested via Apache / LiteSpeed / PHP
 */

$distIndex = __DIR__ . '/dist/index.html';
$publicIndex = __DIR__ . '/public/index.html';

if (file_exists($distIndex)) {
    header('Content-Type: text/html; charset=utf-8');
    readfile($distIndex);
    exit();
} elseif (file_exists($publicIndex)) {
    header('Content-Type: text/html; charset=utf-8');
    readfile($publicIndex);
    exit();
} else {
    header('HTTP/1.1 200 OK');
    echo '<!DOCTYPE html><html><body style="font-family:sans-serif;background:#0f2744;color:#fff;text-align:center;padding:50px;"><h2>The Century Academy Test Maker Portal</h2><p>Portal is active and initializing...</p></body></html>';
    exit();
}
