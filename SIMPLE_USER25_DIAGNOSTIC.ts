/**
 * ПРОСТАЯ ДИАГНОСТИКА JWT ПРОБЛЕМ - User ID 25
 * 
 * ЗАДАЧА: Найти точную причину нестабильности JWT токенов
 * ЗАПРЕТ: Никаких изменений кода - только анализ
 */

console.log('🔍 ДИАГНОСТИКА JWT НЕСТАБИЛЬНОСТИ');
console.log('================================');

console.log('\n📊 ВРЕМЯ ЖИЗНИ JWT ТОКЕНА:');
// Из utils/telegram.ts - generateJWTToken():
console.log('exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)');
console.log('Время жизни: 7 ДНЕЙ = 604800 секунд');
console.log('НО! Токен исчезает гораздо раньше...');

console.log('\n🚨 ФАКТЫ ИЗ BROWSER CONSOLE:');
console.log('1. ❌ "JWT токен требуется для авторизованных API запросов"');
console.log('2. ❌ "API запрос требует JWT токен, но токен отсутствует"');
console.log('3. 🔄 "Система часто выдает сообщение о переподключении"');
console.log('4. 📱 User видит: "сообщение о JWT токене"');

console.log('\n⚡ ГДЕ ТОКЕНЫ МОГУТ ИСЧЕЗАТЬ:');

console.log('\n1️⃣ ЛОКАЛЬНОЕ ХРАНИЛИЩЕ (localStorage):');
console.log('   - Ключ: "unifarm_jwt_token"');
console.log('   - Может очищаться браузером при нехватке места');
console.log('   - Может удаляться при обновлении Telegram WebApp');
console.log('   - Может блокироваться в Private/Incognito режиме');

console.log('\n2️⃣ TELEGRAM WEBAPP ПЕРЕКЛЮЧЕНИЯ:');
console.log('   - При переключении между чатами');
console.log('   - При блокировке/разблокировке телефона');
console.log('   - При переходе в фоновый режим');
console.log('   - При обновлениях Telegram приложения');

console.log('\n3️⃣ BACKEND JWT ВАЛИДАЦИЯ:');
console.log('   - verifyJWTToken() может отклонять валидные токены');
console.log('   - JWT_SECRET может изменяться при рестарте сервера');
console.log('   - Время сервера vs время клиента рассинхронизация');

console.log('\n4️⃣ USERCONTEXT ЛОГИКА:');
console.log('   - refreshUserData() вызывается часто');
console.log('   - authorizationAttemptedRef может сбрасываться');
console.log('   - Race conditions между компонентами');

console.log('\n🎯 КРИТИЧЕСКИЕ МОМЕНТЫ:');

console.log('\nМОМЕНТ A: ПОТЕРЯ ДЕПОЗИТА 3 TON (31.07.2025, 08:07)');
console.log('08:07:00 - TON Connect → Blockchain SUCCESS');
console.log('08:07:05 - Backend API должен получить депозит');
console.log('08:07:10 - База данных: баланс +3 TON');
console.log('08:07:XX - JWT ТОКЕН ИСЧЕЗАЕТ (критический тайминг!)');
console.log('08:07:XX - UserContext пытается переавторизоваться');
console.log('08:07:XX - Новый JWT создается с УСТАРЕВШИМИ данными из БД');
console.log('💸 РЕЗУЛЬТАТ: Депозит потерян в интерфейсе');

console.log('\nМОМЕНТ B: ВОЗВРАТ ВЫВОДОВ (1% случаев)');
console.log('XX:XX:00 - processWithdrawal() списывает средства');
console.log('XX:XX:01 - База данных: баланс -X TON');
console.log('XX:XX:02 - JWT ТОКЕН ИСЧЕЗАЕТ (попадание в 1%)');
console.log('XX:XX:03 - UserContext переавторизуется');
console.log('XX:XX:04 - Новый JWT с балансом ДО списания');
console.log('💸 РЕЗУЛЬТАТ: Деньги "возвращаются" на баланс');

console.log('\n🔍 КОРНЕВАЯ ПРИЧИНА:');
console.log('JWT ТОКЕНЫ ИСЧЕЗАЮТ БЫСТРЕЕ ЧЕМ ОЖИДАЕТСЯ');
console.log('- Номинально: 7 дней жизни');
console.log('- Реально: исчезают каждые несколько минут');
console.log('- При исчезновении → система создает новый токен');
console.log('- Новый токен получает данные из БД на момент создания');
console.log('- Если БД не успела обновиться → старые данные перезаписывают новые');

console.log('\n📋 НУЖНО ПРОВЕРИТЬ:');
console.log('1. Частота исчезновения токенов (каждые X минут?)');
console.log('2. localStorage.getItem("unifarm_jwt_token") - есть ли токен?');
console.log('3. Синхронизация времени сервер/клиент');
console.log('4. JWT_SECRET стабильность при рестартах');
console.log('5. Race conditions при обновлении баланса vs создании токена');

console.log('\n🚨 ГИПОТЕЗА:');
console.log('Токены исчезают из-за Telegram WebApp ограничений или browser storage policy.');
console.log('При каждом пересоздании токена возможна потеря актуальных данных.');
console.log('Система не успевает синхронизировать БД с новыми транзакциями.');

console.log('\n⚡ СТАТУС: ТРЕБУЕТСЯ ПРОВЕРКА ЧАСТОТЫ ПЕРЕСОЗДАНИЯ ТОКЕНОВ');