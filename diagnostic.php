<?php
header('Content-Type: application/json; charset=utf-8');

$info = [
    'status' => 'online',
    'php_version' => PHP_VERSION,
    'current_dir' => __DIR__,
    'files_in_dir' => array_slice(scandir(__DIR__), 0, 30),
    'node_exists' => false,
    'node_version' => null,
    'node_modules_exists' => is_dir(__DIR__ . '/node_modules'),
    'dist_exists' => is_dir(__DIR__ . '/dist'),
    'index_html_exists' => file_exists(__DIR__ . '/index.html'),
    'server_js_exists' => file_exists(__DIR__ . '/server.js'),
    'app_cjs_exists' => file_exists(__DIR__ . '/app.cjs'),
    'env_exists' => file_exists(__DIR__ . '/.env')
];

// Check if node CLI is available in path
$nodeCheck = @shell_exec('node -v 2>&1');
if ($nodeCheck) {
    $info['node_exists'] = true;
    $info['node_version'] = trim($nodeCheck);
}

// Check running node processes
$ps = @shell_exec('ps aux | grep node 2>&1');
if ($ps) {
    $info['running_node_processes'] = explode("\n", trim($ps));
}

echo json_encode($info, JSON_PRETTY_PRINT);
