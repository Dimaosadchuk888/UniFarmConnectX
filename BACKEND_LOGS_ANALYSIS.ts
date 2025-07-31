/**
 * АНАЛИЗ BACKEND ЛОГОВ ДЛЯ JWT ПРОБЛЕМ
 * 
 * Цель: Найти в логах сервера причины JWT failures
 */

console.log('🔍 АНАЛИЗ BACKEND ЛОГОВ - JWT ПРОБЛЕМЫ');
console.log('======================================');

console.log('\n📊 ЧТО ИЩЕМ В ЛОГАХ:');

console.log('\n1️⃣ JWT VALIDATION FAILURES');
console.log('[TelegramAuth] JWT decoded for preview: - успешные декодирования');
console.log('[TelegramAuth] JWT_SECRET exists: - проблемы с секретом');
console.log('[TelegramAuth] Invalid or expired JWT token - отклонения токенов');
console.log('JsonWebTokenError: - проблемы с форматом токена');
console.log('TokenExpiredError: - истечение времени токена');

console.log('\n2️⃣ AUTHORIZATION MIDDLEWARE ERRORS');
console.log('[requireTelegramAuth] Processing - обработка авторизации');
console.log('[requireTelegramAuth] Has Authorization: false - отсутствие токена');
console.log('[TelegramAuth] Auth check - результаты проверки');
console.log('401 Unauthorized responses - количество отклонений');

console.log('\n3️⃣ TOKEN RECREATION FREQUENCY');
console.log('/api/v2/auth/telegram POST requests - создание новых токенов');
console.log('[AuthController] Telegram auth request - частота вызовов');
console.log('[AuthService] generateJWTToken - генерация токенов');
console.log('direct_registration: true - прямые регистрации');

console.log('\n4️⃣ DATABASE TIMING ISSUES');
console.log('[SupabaseUserRepository] getUserByTelegramId - поиск пользователей');
console.log('Database query timing - скорость запросов БД');
console.log('Balance update vs token creation timing - race conditions');

console.log('\n🚨 КРИТИЧЕСКИЕ ПАТТЕРНЫ В ЛОГАХ:');

console.log('\nПАТТЕРН A: ТОКЕН ОТКЛОНЕНИЕ → УДАЛЕНИЕ');
console.log('1. [TelegramAuth] Invalid JWT token (Backend отклоняет)');
console.log('2. Response: 401 Unauthorized (Frontend получает ошибку)');
console.log('3. [correctApiRequest] 401 error received (Frontend обрабатывает)');
console.log('4. localStorage.removeItem("unifarm_jwt_token") (Токен удаляется)');
console.log('5. [UserContext] JWT токен не найден (Пересоздание)');

console.log('\nПАТТЕРН B: ЧАСТЫЕ ПЕРЕСОЗДАНИЯ');
console.log('1. /api/v2/auth/telegram POST (каждые X минут)');
console.log('2. [AuthService] generateJWTToken (новый токен)');
console.log('3. getUserByTelegramId query (данные БД на момент создания)');
console.log('4. Token contains balance_ton: X (баланс НА МОМЕНТ СОЗДАНИЯ)');
console.log('⚠️ ПРОБЛЕМА: Если БД не успела обновиться → старые данные');

console.log('\nПАТТЕРН C: ДЕПОЗИТ → ТОКЕН LOSS');
console.log('1. TON Connect deposit successful (Frontend)');
console.log('2. /api/v2/wallet/ton-deposit POST (Backend API)');
console.log('3. Database balance update (БД обновляется)');
console.log('4. [WebSocket] Balance notification (Уведомление отправлено)');
console.log('5. JWT token disappears (КРИТИЧЕСКИЙ МОМЕНТ)');
console.log('6. Token recreation with old balance (Устаревшие данные)');

console.log('\n📋 КОНКРЕТНЫЕ ЛОГИ ДЛЯ ПОИСКА:');

console.log('\n🔍 ИЩЕМ В ЛОГАХ СЕРВЕРА:');
console.log('grep -i "jwt" server.log | tail -100');
console.log('grep -i "401" server.log | tail -50');
console.log('grep -i "unauthorized" server.log | tail-50');
console.log('grep -i "token" server.log | tail -100');

console.log('\n🔍 СПЕЦИФИЧЕСКИЕ ОШИБКИ:');
console.log('grep "JsonWebTokenError" server.log');
console.log('grep "TokenExpiredError" server.log');
console.log('grep "Invalid or expired JWT" server.log');
console.log('grep "JWT_SECRET" server.log');

console.log('\n🔍 FREQUENCY ANALYSIS:');
console.log('grep "/api/v2/auth/telegram" server.log | wc -l');
console.log('grep "generateJWTToken" server.log | wc -l');
console.log('grep "direct_registration" server.log | wc -l');

console.log('\n🔍 TIMING CORRELATION:');
console.log('grep -B5 -A5 "JWT token disappears" server.log');
console.log('grep -B5 -A5 "balance update" server.log');
console.log('grep -B5 -A5 "WebSocket notification" server.log');

console.log('\n⚡ EXPECTED FINDINGS:');

console.log('\nЕСЛИ ГИПОТЕЗА 1 ВЕРНА (Backend 401 cascade):');
console.log('- Много 401 ошибок в логах');
console.log('- Частые JWT validation failures');
console.log('- Correlation между 401 и token recreation');

console.log('\nЕСЛИ ГИПОТЕЗА 2 ВЕРНА (Timing races):');
console.log('- Token creation сразу после balance updates');
console.log('- Database read timing близко к write timing');
console.log('- WebSocket notifications перед token recreation');

console.log('\nЕСЛИ ГИПОТЕЗА 3 ВЕРНА (JWT_SECRET issues):');
console.log('- JWT_SECRET missing или changing');
console.log('- Signature verification failures');
console.log('- Server restart correlation');

console.log('\n🎯 ДЕЙСТВИЯ ПО РЕЗУЛЬТАТАМ:');
console.log('1. Если много 401 → исследовать JWT validation logic');
console.log('2. Если timing issues → исследовать database races');
console.log('3. Если JWT_SECRET problems → исследовать server config');
console.log('4. Если частые recreations → исследовать frontend triggers');

console.log('\n⚡ СТАТУС: ГОТОВ АНАЛИЗИРОВАТЬ BACKEND ЛОГИ');
console.log('Нужны актуальные логи сервера для поиска паттернов...');