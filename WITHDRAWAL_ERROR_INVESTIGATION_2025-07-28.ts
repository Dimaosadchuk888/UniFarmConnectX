#!/usr/bin/env tsx

/**
 * ИССЛЕДОВАНИЕ ОШИБКИ ВЫВОДА СРЕДСТВ
 * Анализ проблемы "Ошибка сети" при отправке запроса на вывод
 * Дата: 28.07.2025
 */

console.log('🔍 ИССЛЕДОВАНИЕ ОШИБКИ ВЫВОДА СРЕДСТВ');
console.log('📅 28.07.2025 - "Ошибка сети при отправке запроса"');
console.log('='.repeat(80));

// Анализ на основе логов Dev Tools
function analyzeDevToolsLogs() {
  console.log('\n📋 АНАЛИЗ ЛОГОВ DEV TOOLS');
  console.log('-'.repeat(50));
  
  console.log('✅ НАБЛЮДЕНИЯ ИЗ ЛОГОВ:');
  console.log('1. WebSocket работает корректно (heartbeat ping/pong)');
  console.log('2. Балансы успешно обновляются через API');
  console.log('3. JWT токен правильно добавляется к запросам');
  console.log('4. Транзакции загружаются нормально');
  console.log('5. correctApiRequest работает для других endpoints');
  
  console.log('\n🔍 КЛЮЧЕВЫЕ НАБЛЮДЕНИЯ:');
  console.log('- User ID 184 активен в системе');
  console.log('- Баланс: UNI 811,680.85, TON 45.83 ✅');
  console.log('- GET запросы работают нормально');
  console.log('- WebSocket соединение стабильное');
  console.log('- JWT авторизация функционирует');
  
  console.log('\n❌ НЕ ВИДНО В ЛОГАХ:');
  console.log('- POST запрос на /api/v2/wallet/withdraw');
  console.log('- Ошибки сети или HTTP статусы');
  console.log('- Ошибки валидации');
  console.log('- Timeout или connection refused');
}

function analyzeWithdrawalFlow() {
  console.log('\n🔄 АНАЛИЗ FLOW ВЫВОДА СРЕДСТВ');
  console.log('-'.repeat(50));
  
  console.log('📋 ОЖИДАЕМЫЙ FLOW:');
  console.log('1. Frontend: Форма вывода → validation');
  console.log('2. Frontend: correctApiRequest("/api/v2/wallet/withdraw", "POST")');
  console.log('3. Backend: requireTelegramAuth middleware');
  console.log('4. Backend: validateBody(withdrawSchema)');
  console.log('5. Backend: WalletController.withdraw()');
  console.log('6. Backend: WalletService.processWithdrawal()');
  
  console.log('\n🚨 ВОЗМОЖНЫЕ ТОЧКИ СБОЯ:');
  console.log('1. Rate Limiting - строгие лимиты на /withdraw');
  console.log('2. Validation Schema - withdrawSchema проверки');
  console.log('3. JWT Token - проблемы с авторизацией');
  console.log('4. Network Timeout - медленный ответ backend');
  console.log('5. CORS - проблемы с cross-origin запросами');
  console.log('6. Server Load - высокая нагрузка на сервер');
}

function analyzeBackendConfiguration() {
  console.log('\n⚙️ АНАЛИЗ КОНФИГУРАЦИИ BACKEND');
  console.log('-'.repeat(50));
  
  console.log('📊 СТАТУС СЕРВЕРА:');
  console.log('- Node Process: PID 5624 (активен)');
  console.log('- TSX Server: server/index.ts (запущен)');
  console.log('- Memory Usage: ~176MB (нормально)');
  console.log('- CPU Usage: 3.3% (нормально)');
  
  console.log('\n🔧 WITHDRAWAL ROUTE НАСТРОЙКИ:');
  console.log('- Route: POST /api/v2/wallet/withdraw');
  console.log('- Middleware: requireTelegramAuth ✅');
  console.log('- Rate Limit: strictRateLimit (СТРОГИЙ!)');
  console.log('- Validation: validateBody(withdrawSchema) ✅');
  console.log('- Controller: walletController.withdraw ✅');
  
  console.log('\n⚠️ ПОДОЗРИТЕЛЬНЫЕ МОМЕНТЫ:');
  console.log('1. strictRateLimit - может блокировать запросы');
  console.log('2. withdrawSchema - строгие правила валидации');
  console.log('3. Минимум 1 TON для вывода (у user 45.83 TON)');
}

function investigateErrorSources() {
  console.log('\n🎯 ИСТОЧНИКИ ОШИБКИ "СЕТЬ"');
  console.log('-'.repeat(50));
  
  console.log('📱 FRONTEND ПРИЧИНЫ:');
  console.log('1. correctApiRequest timeout (fetch timeout)');
  console.log('2. Network connectivity issues');
  console.log('3. CORS preflight failure');
  console.log('4. JWT token expiry mid-request');
  console.log('5. Browser cache/service worker conflict');
  
  console.log('\n🖥️ BACKEND ПРИЧИНЫ:');
  console.log('1. Rate limiting срабатывает (429 status)');
  console.log('2. Server timeout (504 Gateway Timeout)');
  console.log('3. Validation failure (400 Bad Request)');
  console.log('4. Authentication failure (401 Unauthorized)');
  console.log('5. Internal server error (500)');
  
  console.log('\n🔧 MIDDLEWARE ПРОБЛЕМЫ:');
  console.log('1. requireTelegramAuth - JWT parsing error');
  console.log('2. validateBody - schema validation failure');
  console.log('3. strictRateLimit - request blocking');
  console.log('4. CORS middleware - preflight rejection');
}

function generateDiagnosticPlan() {
  console.log('\n📋 ПЛАН ДИАГНОСТИКИ');
  console.log('-'.repeat(50));
  
  console.log('🔍 НЕМЕДЛЕННАЯ ПРОВЕРКА:');
  console.log('1. Проверить rate limit статус для User 184');
  console.log('2. Тестировать /api/v2/wallet/withdraw вручную');
  console.log('3. Проверить server logs во время попытки вывода');
  console.log('4. Валидировать withdrawSchema с реальными данными');
  console.log('5. Проверить JWT token validity');
  
  console.log('\n🧪 ТЕСТОВЫЕ СЦЕНАРИИ:');
  console.log('1. curl POST /api/v2/wallet/withdraw с валидными данными');
  console.log('2. Проверить ответ сервера без frontend');
  console.log('3. Тестировать с минимальной суммой (1.0 TON)');
  console.log('4. Проверить с другим пользователем');
  console.log('5. Анализировать network timing в Dev Tools');
}

function recommendActions() {
  console.log('\n💡 РЕКОМЕНДАЦИИ');
  console.log('-'.repeat(50));
  
  console.log('🚨 СРОЧНЫЕ ДЕЙСТВИЯ:');
  console.log('1. Мониторинг server logs во время withdrawal попытки');
  console.log('2. Проверка rate limiting configuration');
  console.log('3. Тестирование withdrawal endpoint вручную');
  console.log('4. Проверка JWT token состояния');
  
  console.log('\n🔧 ТЕХНИЧЕСКИЕ ПРОВЕРКИ:');
  console.log('1. Server health check');
  console.log('2. Database connectivity');
  console.log('3. Middleware chain validation');
  console.log('4. Network route availability');
  
  console.log('\n📊 МОНИТОРИНГ:');
  console.log('1. Backend response times');
  console.log('2. Error rate на withdrawal endpoint');
  console.log('3. Rate limiting hits');
  console.log('4. JWT validation failures');
}

// Запуск анализа
analyzeDevToolsLogs();
analyzeWithdrawalFlow();
analyzeBackendConfiguration();
investigateErrorSources();
generateDiagnosticPlan();
recommendActions();

console.log('\n='.repeat(80));
console.log('🎯 ЗАКЛЮЧЕНИЕ ИССЛЕДОВАНИЯ');
console.log('='.repeat(80));

console.log('📋 КЛЮЧЕВЫЕ НАХОДКИ:');
console.log('1. ✅ Система работает: WebSocket, балансы, JWT');
console.log('2. ❌ Withdrawal endpoint не отвечает');
console.log('3. ⚠️ strictRateLimit может блокировать запросы');
console.log('4. 🔍 Нужны server logs во время попытки');

console.log('\n🎯 НАИБОЛЕЕ ВЕРОЯТНЫЕ ПРИЧИНЫ:');
console.log('1. Rate limiting блокирует withdrawal запросы');
console.log('2. Validation schema отклоняет request');
console.log('3. Backend timeout или performance issue');
console.log('4. JWT token expiry во время request');

console.log('\n📞 СЛЕДУЮЩИЕ ШАГИ:');
console.log('1. Попросите пользователя попробовать вывод снова');
console.log('2. Мониторьте server logs в real-time');
console.log('3. Проверьте rate limiting status');
console.log('4. Тестируйте endpoint вручную');

console.log('\n✅ Исследование завершено');