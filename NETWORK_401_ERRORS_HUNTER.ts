/**
 * NETWORK 401 ERRORS HUNTER
 * 
 * Цель: Найти какие именно API endpoints возвращают 401 ошибки
 * Метод: Анализ Network tab patterns
 */

console.log('🕵️ NETWORK 401 ERRORS HUNTER');
console.log('============================');

console.log('\n🎯 HUNTING TARGET: 401 UNAUTHORIZED RESPONSES');

console.log('\n📋 API ENDPOINTS TO MONITOR:');

console.log('\n🔍 HIGH-RISK ENDPOINTS (likely to return 401):');
console.log('/api/v2/wallet/balance?user_id=X');
console.log('/api/v2/uni-farming/status?user_id=X'); 
console.log('/api/v2/transactions?user_id=X');
console.log('/api/v2/wallet/ton-deposit');
console.log('/api/v2/wallet/withdrawal');
console.log('/api/v2/boost/packages');
console.log('/api/v2/boost/purchase');

console.log('\n🔍 MEDIUM-RISK ENDPOINTS:');
console.log('/api/v2/users/profile');
console.log('/api/v2/users/referrals');
console.log('/api/v2/auth/refresh');
console.log('/api/v2/missions/daily');

console.log('\n🔍 LOW-RISK ENDPOINTS (should work without JWT):');
console.log('/api/v2/auth/telegram');
console.log('/api/health');
console.log('/api/v2/telegram/webhook');

console.log('\n🚨 DETECTION STRATEGY:');

console.log('\nSTEP 1: BASELINE MEASUREMENT');
console.log('Сразу после server restart:');
console.log('- Все API calls должны возвращать 200 OK');
console.log('- JWT токен присутствует в Authorization headers');
console.log('- Нет 401 ошибок в Network tab');

console.log('\nSTEP 2: DEGRADATION DETECTION');
console.log('По мере работы системы:');
console.log('- Появление первых 401 ошибок');
console.log('- Какой endpoint первым начинает отвечать 401?');
console.log('- Timing: через сколько минут после restart?');

console.log('\nSTEP 3: CASCADE ANALYSIS');
console.log('После первой 401 ошибки:');
console.log('- Spread pattern: какие еще endpoints начинают отвечать 401?');
console.log('- Token refresh attempts: POST /api/v2/auth/telegram');
console.log('- Recovery success rate: восстанавливается ли доступ?');

console.log('\n📊 EXPECTED 401 ERROR PATTERNS:');

console.log('\nPATTERN A: JWT EXPIRATION CASCADE');
console.log('1. All endpoints start returning 401 simultaneously');
console.log('2. Token is truly expired (7 days passed)');
console.log('3. Token refresh successfully restores access');
console.log('→ DIAGNOSIS: Natural JWT expiration (unlikely given 7-day lifespan)');

console.log('\nPATTERN B: PROGRESSIVE ENDPOINT FAILURE');
console.log('1. One endpoint starts returning 401');
console.log('2. Other endpoints gradually follow');
console.log('3. Token still present in localStorage');
console.log('→ DIAGNOSIS: Backend JWT validation issues');

console.log('\nPATTERN C: SPORADIC 401 ERRORS');
console.log('1. Random endpoints occasionally return 401');
console.log('2. Same endpoint works again after retry');
console.log('3. No clear pattern or timing');
console.log('→ DIAGNOSIS: Race conditions or server load issues');

console.log('\nPATTERN D: IMMEDIATE POST-ACTION 401s');
console.log('1. Specific endpoints return 401 only after certain actions');
console.log('2. (e.g. balance endpoint fails after deposit)');
console.log('3. Token disappears from localStorage shortly after');
console.log('→ DIAGNOSIS: Action-triggered token invalidation');

console.log('\n🔍 CRITICAL QUESTIONS TO ANSWER:');

console.log('\nQUESTION 1: FIRST FAILURE ENDPOINT');
console.log('Какой API endpoint первым начинает возвращать 401?');
console.log('- Если /api/v2/wallet/balance → проблема с balance authorization');
console.log('- Если /api/v2/uni-farming/status → проблема с farming authorization');
console.log('- Если все сразу → общая JWT validation failure');

console.log('\nQUESTION 2: TIMING CORRELATION');
console.log('Есть ли корреляция между 401 errors и:');
console.log('- Временными интервалами (каждые X минут)?');
console.log('- Пользовательскими действиями (депозит/вывод)?');
console.log('- Системными процессами (WebSocket reconnects)?');

console.log('\nQUESTION 3: AUTHORIZATION HEADER ANALYSIS');
console.log('В момент 401 ошибки:');
console.log('- Присутствует ли Authorization header в request?');
console.log('- Корректен ли format: "Bearer <token>"?');
console.log('- Соответствует ли токен в header токену в localStorage?');

console.log('\nQUESTION 4: RESPONSE BODY ANALYSIS');
console.log('Что именно возвращает backend в 401 response:');
console.log('- "Invalid or expired JWT token"?');
console.log('- "Authentication required"?');
console.log('- "need_new_token": true?');
console.log('- Specific error details?');

console.log('\n📋 MONITORING CHECKLIST:');

console.log('\n⏰ REAL-TIME MONITORING:');
console.log('[ ] Open Browser DevTools → Network tab');
console.log('[ ] Filter by "XHR" or "Fetch" requests');
console.log('[ ] Sort by Status Code to spot 401 errors');
console.log('[ ] Monitor for first appearance of red (4xx) responses');

console.log('\n🔍 DATA COLLECTION FOR EACH 401:');
console.log('[ ] Endpoint URL');
console.log('[ ] Request method (GET/POST/PUT/DELETE)');
console.log('[ ] Request headers (especially Authorization)');
console.log('[ ] Response status and body');
console.log('[ ] Timestamp');
console.log('[ ] User action context');

console.log('\n📊 PATTERN ANALYSIS:');
console.log('[ ] First 401 error: endpoint + timing');
console.log('[ ] Subsequent 401s: spread pattern');
console.log('[ ] Token refresh attempts: frequency + success rate');
console.log('[ ] Recovery pattern: how access is restored');

console.log('\n⚡ HUNTER STATUS: READY');
console.log('Мониторинг Network tab для обнаружения первых 401 ошибок...');
console.log('Система готова к анализу JWT validation failures.');