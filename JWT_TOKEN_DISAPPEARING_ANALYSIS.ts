/**
 * ГЛУБОКИЙ АНАЛИЗ: ПОЧЕМУ JWT ТОКЕНЫ ИСЧЕЗАЮТ
 * 
 * Задача: Найти точную причину нестабильности токенов
 * Запрет: Никаких изменений кода
 */

console.log('🔍 АНАЛИЗ ИСЧЕЗНОВЕНИЯ JWT ТОКЕНОВ');
console.log('=================================');

console.log('\n📊 ТЕХНИЧЕСКИЕ ФАКТЫ:');
console.log('✅ Время жизни JWT: 7 дней (604800 секунд)');
console.log('❌ Реальность: токены исчезают каждые несколько минут');
console.log('🔄 Browser console: "JWT токен отсутствует" постоянно');
console.log('📱 User experience: "сообщение о переподключении"');

console.log('\n🎯 МЕСТА УДАЛЕНИЯ ТОКЕНОВ:');

console.log('\n1️⃣ АВТОМАТИЧЕСКОЕ УДАЛЕНИЕ В correctApiRequest.ts:');
console.log('   Строки 214-235 (catch блок):');
console.log('   - При 401 ошибке: localStorage.removeItem("unifarm_jwt_token")');
console.log('   - При network errors: может удалять токен');
console.log('   - При validation failures: очистка токена');
console.log('   ⚡ ГИПОТЕЗА: Backend часто отвечает 401 → токен удаляется');

console.log('\n2️⃣ USERCONTEXT ПЕРЕАВТОРИЗАЦИЯ:');
console.log('   Строки 258-328 (refreshUserData):');
console.log('   - При неудачной валидации: пересоздание токена');
console.log('   - Race conditions между компонентами');
console.log('   - authorizationAttemptedRef может сбрасываться');
console.log('   ⚡ ГИПОТЕЗА: Частые вызовы refreshUserData() очищают токены');

console.log('\n3️⃣ TELEGRAM WEBAPP ОГРАНИЧЕНИЯ:');
console.log('   - localStorage может очищаться при переключении чатов');
console.log('   - Telegram может блокировать storage в background');
console.log('   - WebApp lifecycle может очищать данные');
console.log('   ⚡ ГИПОТЕЗА: Telegram WebApp агрессивно очищает localStorage');

console.log('\n4️⃣ BACKEND JWT ВАЛИДАЦИЯ:');
console.log('   verifyJWTToken() в utils/telegram.ts:');
console.log('   - Может отклонять валидные токены из-за time sync');
console.log('   - JWT_SECRET может изменяться при restart');
console.log('   - Clock skew между client/server');
console.log('   ⚡ ГИПОТЕЗА: Backend отклоняет токены → 401 → удаление');

console.log('\n🚨 КРИТИЧЕСКИЙ СЦЕНАРИЙ - ПОТЕРЯ 3 TON:');
console.log('31.07.2025, 08:07:00 - TON Connect депозит 3 TON');
console.log('31.07.2025, 08:07:05 - Backend получает депозит → БД обновлена');
console.log('31.07.2025, 08:07:10 - WebSocket → UI показывает +3 TON');
console.log('31.07.2025, 08:07:15 - JWT ТОКЕН ИСЧЕЗАЕТ (критический момент)');
console.log('31.07.2025, 08:07:20 - UserContext → refreshUserData()');
console.log('31.07.2025, 08:07:25 - /api/v2/auth/telegram → создание нового JWT');
console.log('31.07.2025, 08:07:30 - Новый JWT с данными БД НА МОМЕНТ СОЗДАНИЯ');
console.log('💸 ПРОБЛЕМА: Если БД читается ДО обновления → старый баланс');

console.log('\n🚨 КРИТИЧЕСКИЙ СЦЕНАРИЙ - ВОЗВРАТ ВЫВОДОВ:');
console.log('XX:XX:00 - processWithdrawal() списывает 1 TON');
console.log('XX:XX:01 - БД обновлена: баланс -1 TON');
console.log('XX:XX:02 - UI показывает новый баланс');
console.log('XX:XX:05 - JWT ТОКЕН ИСЧЕЗАЕТ');
console.log('XX:XX:06 - UserContext → переавторизация');
console.log('XX:XX:07 - Новый JWT создается с данными БД');
console.log('💸 ПРОБЛЕМА: Если читается старый баланс → деньги "возвращаются"');

console.log('\n🔍 ЧАСТОТА ИСЧЕЗНОВЕНИЯ:');
console.log('Из browser console видно что токены исчезают ПОСТОЯННО');
console.log('Каждые несколько минут: "JWT токен отсутствует"');
console.log('Это означает что проблема не в времени жизни (7 дней)');
console.log('А в частом УДАЛЕНИИ токенов системой');

console.log('\n⚡ КЛЮЧЕВЫЕ ВОПРОСЫ:');
console.log('1. Какой HTTP статус возвращает Backend чаще всего?');
console.log('2. Как часто вызывается refreshUserData()?');
console.log('3. Есть ли 401 ошибки в Network tab?');
console.log('4. Стабилен ли JWT_SECRET на сервере?');
console.log('5. Есть ли race conditions при balance updates?');

console.log('\n🚨 ГЛАВНАЯ ГИПОТЕЗА:');
console.log('Backend часто возвращает 401 Unauthorized');
console.log('→ correctApiRequest удаляет токен');
console.log('→ UserContext пытается создать новый');
console.log('→ При создании нового токена возможны устаревшие данные');
console.log('→ Балансы перезаписываются старыми значениями');

console.log('\n📋 НУЖНА ПРОВЕРКА:');
console.log('1. Network tab: количество 401 ошибок');
console.log('2. Логи Backend: JWT validation failures');
console.log('3. Частота вызовов /api/v2/auth/telegram');
console.log('4. Timing между balance updates и JWT recreation');

console.log('\n⚡ СТАТУС: ТОКЕНЫ УДАЛЯЮТСЯ ПРИНУДИТЕЛЬНО - НЕ ИСТЕКАЮТ ЕСТЕСТВЕННО');