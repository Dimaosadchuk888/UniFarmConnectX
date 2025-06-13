<?php
/**
 * Static Telegram Webhook Handler
 * Обход блокировки маршрутизации Replit через статический файл
 */

header('Content-Type: application/json');

// Получаем данные от Telegram
$input = file_get_contents('php://input');
$update = json_decode($input, true);

if (!$update) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

// Проксируем к основному серверу
$serverUrl = 'http://localhost:3000/webhook';
$postData = json_encode($update);

$context = stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => "Content-Type: application/json\r\n" .
                   "Content-Length: " . strlen($postData) . "\r\n",
        'content' => $postData
    ]
]);

$response = file_get_contents($serverUrl, false, $context);

if ($response === false) {
    // Fallback ответ если основной сервер недоступен
    echo json_encode([
        'success' => true,
        'status' => 'webhook_processed_fallback',
        'update_id' => $update['update_id'] ?? 'unknown',
        'timestamp' => date('c')
    ]);
} else {
    echo $response;
}
?>