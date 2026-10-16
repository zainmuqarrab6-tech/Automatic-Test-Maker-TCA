<?php
/**
 * The Century Academy - Test Maker Portal Index
 * Serves the compiled production React application
 */
if (file_exists(__DIR__ . '/index.html')) {
    header('Content-Type: text/html; charset=utf-8');
    readfile(__DIR__ . '/index.html');
    exit();
} else {
    header('HTTP/1.1 200 OK');
    echo "<!DOCTYPE html><html><body><h2>The Century Academy Test Maker Portal</h2><p>Initializing...</p></body></html>";
    exit();
}
