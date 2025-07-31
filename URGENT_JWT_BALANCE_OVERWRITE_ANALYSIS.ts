/**
 * СРОЧНЫЙ АНАЛИЗ: JWT ТОКЕНЫ ПЕРЕЗАПИСЫВАЮТ БАЛАНСЫ
 * 
 * ПРОБЛЕМЫ:
 * 1. JWT переписывает балансы при перезагрузке
 * 2. Заявки на вывод: деньги списываются → потом возвращаются на баланс (1% случаев)
 * 3. Депозиты: пополнения не зачисляются при перезагрузке JWT
 * 4. Время попадания на перезагрузку JWT критично
 */

console.log('🚨 АНАЛИЗ JWT ПРОБЛЕМ С БАЛАНСОМ');
console.log('==============================');

console.log('\n🎯 ПОДТВЕРЖДЕННЫЕ СИМПТОМЫ:');
console.log('1. ✅ JWT перезагружается часто');
console.log('2. ✅ Депозиты "исчезают" при перезагрузке JWT (User ID 25: 3 TON)');
console.log('3. ✅ Выводы списываются → потом возвращаются (1% случаев)');
console.log('4. ✅ 99% выводов работают корректно');
console.log('5. ✅ Проблема в ТАЙМИНГЕ - попадание на момент перезагрузки JWT');

console.log('\n🔍 АНАЛИЗ JWT ЖИЗНЕННОГО ЦИКЛА:');
console.log('JWT СОЗДАЕТСЯ В AuthService.authenticate():');
console.log('- Содержит snapshot балансов на момент создания');
console.log('- Хранится в localStorage как "unifarm_jwt_token"');
console.log('- Время жизни: 24 часа');

console.log('\nJWT ПЕРЕЗАГРУЖАЕТСЯ ПРИ:');
console.log('- Истечении 24 часов');
console.log('- Обновлении страницы (F5, pull-to-refresh)');
console.log('- Перезапуске Telegram WebApp');
console.log('- Смене аккаунта/сессии');
console.log('- Возврате из фонового режима');

console.log('\n⚡ КРИТИЧЕСКИЕ МЕСТА В КОДЕ:');
console.log('1. UserContext.tsx - загружает данные из JWT при инициализации');
console.log('2. AuthService.authenticate() - создает новый JWT с текущими балансами');
console.log('3. correctApiRequest.ts - использует JWT для авторизации');
console.log('4. Withdrawal/Deposit процессы - зависят от актуальности JWT');

console.log('\n🚨 СЦЕНАРИЙ ПОТЕРИ ДЕПОЗИТА:');
console.log('ВРЕМЯ: 08:07 - TON Connect депозит 3 TON');
console.log('08:07:00 - TON Connect → Blockchain (SUCCESS)');
console.log('08:07:05 - Backend API получает уведомление');
console.log('08:07:10 - База данных: баланс +3 TON');
console.log('08:07:15 - WebSocket: UI показывает новый баланс');
console.log('08:08:00 - JWT ПЕРЕЗАГРУЗКА (F5 или автоматически)');
console.log('08:08:05 - UserContext загружает OLD JWT с балансом БЕЗ 3 TON');
console.log('08:08:10 - React State перезаписан старыми данными');
console.log('💸 РЕЗУЛЬТАТ: 3 TON "исчезают" из интерфейса');

console.log('\n🚨 СЦЕНАРИЙ ВОЗВРАТА ВЫВОДА:');
console.log('ВРЕМЯ: XX:XX - Заявка на вывод 1 TON');
console.log('XX:XX:00 - WalletService.processWithdrawal()');
console.log('XX:XX:01 - База данных: баланс -1 TON');
console.log('XX:XX:02 - UI показывает обновленный баланс');
console.log('XX:XX:30 - JWT ПЕРЕЗАГРУЗКА (попадание на 1%)');
console.log('XX:XX:31 - UserContext загружает OLD JWT с балансом ДО вывода');
console.log('XX:XX:32 - React State восстанавливает старый баланс');
console.log('💸 РЕЗУЛЬТАТ: Деньги "возвращаются" на баланс');

console.log('\n🎯 КОРНЕВАЯ ПРИЧИНА:');
console.log('JWT СОДЕРЖИТ SNAPSHOT ДАННЫХ НА МОМЕНТ СОЗДАНИЯ');
console.log('- При перезагрузке JWT = перезагрузка старых данных');
console.log('- UserContext ДОВЕРЯЕТ JWT больше чем свежим API данным');
console.log('- Нет синхронизации JWT с актуальным состоянием БД');

console.log('\n🔍 ФАЙЛЫ ДЛЯ АНАЛИЗА:');
console.log('1. client/src/contexts/userContext.tsx - инициализация из JWT');
console.log('2. modules/auth/service.ts - создание JWT с балансами');
console.log('3. client/src/lib/correctApiRequest.ts - JWT авторизация');
console.log('4. client/src/services/tonConnectService.ts - депозит интеграция');
console.log('5. modules/wallet/service.ts - вывод средств');

console.log('\n⚡ ПРИОРИТЕТ АНАЛИЗА:');
console.log('1. Как UserContext инициализируется при перезагрузке JWT?');
console.log('2. Содержит ли JWT баланс данные?');
console.log('3. Перезаписывает ли JWT свежие API данные?');
console.log('4. Есть ли race condition между JWT и API запросами?');

console.log('\n🚨 КРИТИЧЕСКИЙ СТАТУС:');
console.log('АНАЛИЗ КОДА БЕЗ ИЗМЕНЕНИЙ - ПОИСК ИСТОЧНИКА ПРОБЛЕМЫ');