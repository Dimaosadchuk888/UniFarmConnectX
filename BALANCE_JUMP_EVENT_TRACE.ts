#!/usr/bin/env tsx

/**
 * ТРАССИРОВКА СОБЫТИЙ: Почему баланс "прыгает" при покупке TON Boost
 */

console.log('\n🔍 ТРАССИРОВКА СОБЫТИЙ ОБНОВЛЕНИЯ БАЛАНСА\n');
console.log('='.repeat(80));

console.log('СЦЕНАРИЙ: Покупка TON Boost за 1 TON (33 TON → 20.84 TON)\n');

console.log('📍 СОБЫТИЕ 1: Нажатие кнопки "Купить"');
console.log('   └─ handleSelectPaymentMethod("internal_balance")');
console.log('   └─ correctApiRequest("/api/v2/boost/purchase", "POST")');
console.log('   └─ Сервер списывает 1 TON, возвращает новый баланс: 20.84 TON');
console.log('');

console.log('📍 СОБЫТИЕ 2: Получен ответ от сервера (строка 315)');
console.log('   └─ data.success = true');
console.log('   └─ data.balanceUpdate = { tonBalance: 20.84, previousTonBalance: 33 }');
console.log('');

console.log('📍 СОБЫТИЕ 3: Мгновенное обновление UI (строка 325)');
console.log('   └─ refreshBalance(true) // принудительное обновление');
console.log('   └─ fetchBalance API запрос → получает 20.84 TON ✅');
console.log('   └─ UserContext обновляется → UI показывает 20.84 TON');
console.log('');

console.log('📍 СОБЫТИЕ 4: invalidateQueries (строки 328-336)');
console.log('   └─ queryClient.invalidateQueries(["/api/v2/wallet/balance"])');
console.log('   └─ React Query сбрасывает кеш и делает новый запрос');
console.log('   └─ ⚠️ НО! Возможно старый кеш еще не очищен полностью');
console.log('');

console.log('📍 СОБЫТИЕ 5: Race Condition!');
console.log('   └─ refreshBalance() из События 3 еще выполняется');
console.log('   └─ invalidateQueries вызывает еще один запрос баланса');
console.log('   └─ Два запроса идут параллельно!');
console.log('   └─ 🔴 Старый запрос может вернуть кешированные 33 TON');
console.log('');

console.log('📍 СОБЫТИЕ 6: WebSocket получает уведомление (асинхронно)');
console.log('   └─ Сервер отправляет: { type: "balance_update", userId: 184, tonBalance: 20.84 }');
console.log('   └─ useWebSocketBalanceSync получает сообщение');
console.log('   └─ Вызывает refreshBalance(true) СНОВА');
console.log('   └─ Еще один API запрос баланса');
console.log('');

console.log('📍 РЕЗУЛЬТАТ: Множественные конфликтующие обновления');
console.log('   1. refreshBalance() после покупки → 20.84 TON ✅');
console.log('   2. invalidateQueries может вернуть старый кеш → 33 TON ❌'); 
console.log('   3. WebSocket refreshBalance() → 20.84 TON ✅');
console.log('   4. UI "прыгает": 33 → 20.84 → 33 → 20.84');
console.log('');

console.log('🔴 ОСНОВНАЯ ПРОБЛЕМА:');
console.log('   - Нет синхронизации между refreshBalance() и invalidateQueries');
console.log('   - React Query кеш может возвращать старые данные во время обновления');
console.log('   - Множественные параллельные запросы создают race condition');
console.log('');

console.log('💡 ДОПОЛНИТЕЛЬНЫЕ ФАКТОРЫ:');
console.log('   - staleTime: 5 минут - кеш считается свежим долго');
console.log('   - gcTime: 10 минут - старые данные хранятся в памяти');
console.log('   - Автообновление каждые 30 секунд может совпасть с покупкой');
console.log('   - WebSocket и API обновления не синхронизированы');

console.log('\n' + '='.repeat(80));