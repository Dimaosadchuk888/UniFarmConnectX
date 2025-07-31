import * as dotenv from 'dotenv';
dotenv.config();

/**
 * ПОИСК ПОТЕРЯННОЙ ТРАНЗАКЦИИ 3 TON
 * Hash: te6cckECAgEAAKoAAeGIAMtaj5JhEoDmTGdtuWKu2Ndd7Q45BQhTz1ozLYdEVqaK...
 * User ID: 25
 * Время: 31.07.2025, 08:07
 */

console.log('🔍 ПОИСК ПОТЕРЯННОЙ ТРАНЗАКЦИИ 3 TON');
console.log('===================================');

const LOST_HASH = 'te6cckECAgEAAKoAAeGIAMtaj5JhEoDmTGdtuWKu2Ndd7Q45BQhTz1ozLYdEVqaKAMNmTUk9qXEZLWnxxG8/KNTr9uPldpYv0GQUg3bQdqCpVr3rx1+GUayk/tgsjCsWWDifvEjvzDanswBYkoUvyDlNTRi7RFkqqAAAGtAAHAEAaEIAMtaj5JhEoDmTGdtuWKu2Ndd7Q45BQhTz1ozLYdEVqaKlloLwAAAAAAAAAAAAAAAAAADzBU+s';

async function searchLostTransaction() {
  try {
    // Используем прямой HTTP запрос к API для получения информации
    console.log('📊 ПОИСК ТРАНЗАКЦИИ В СИСТЕМЕ...');
    
    // Проверим через создание тестового подключения
    const testResult = await fetch('http://localhost:3000/api/health', {
      method: 'GET'
    });
    
    if (testResult.ok) {
      console.log('✅ Сервер доступен');
    } else {
      console.log('❌ Сервер недоступен');
    }
    
    console.log('\n🔍 ИНФОРМАЦИЯ О ПОИСКЕ:');
    console.log('Hash для поиска:', LOST_HASH.substring(0, 50) + '...');
    console.log('Пользователь: ID 25');
    console.log('Время транзакции: 31.07.2025, 08:07');
    console.log('Сумма: 3.000000 TON');
    
    console.log('\n🎯 ЧТО НУЖНО НАЙТИ:');
    console.log('1. SELECT * FROM transactions WHERE user_id = 25 AND hash = \'', LOST_HASH.substring(0, 30), '...\'');
    console.log('2. SELECT * FROM transactions WHERE user_id = 25 AND amount = \'3\' AND type = \'TON_DEPOSIT\'');
    console.log('3. SELECT ton_balance FROM users WHERE id = 25');
    console.log('4. Логи POST /api/v2/wallet/ton-deposit в консоли browser');
    
    console.log('\n⚡ СЛЕДУЮЩИЕ ШАГИ:');
    console.log('1. Проверить browser console на наличие:');
    console.log('   - [TON_DEPOSIT_FIX] Отправка депозита на backend...');
    console.log('   - ✅ Backend депозит успешно обработан');
    console.log('   - ❌ [CRITICAL] TON депозит НЕ ОБРАБОТАН backend');
    
    console.log('\n2. Если НЕТ логов [TON_DEPOSIT_FIX]:');
    console.log('   - TON Connect НЕ ВЫЗВАЛ backend API');
    console.log('   - Транзакция потеряна на этапе интеграции');
    console.log('   - КОМПЕНСАЦИЯ 3 TON требуется немедленно');
    
    console.log('\n3. Если ЕСТЬ логи [CRITICAL] НЕ ОБРАБОТАН:');
    console.log('   - Backend получил запрос, но обработка не удалась');
    console.log('   - Проверить ошибки API /api/v2/wallet/ton-deposit');
    
    console.log('\n4. Если НЕТ записи в БД но есть успешные логи:');
    console.log('   - Rollback функции могли удалить транзакцию');
    console.log('   - Проверить логи с тегом [ANTI_ROLLBACK_PROTECTION]');
    
    console.log('\n🚨 КРИТИЧЕСКИЙ СТАТУС:');
    console.log('Требуется немедленная проверка базы данных для подтверждения компенсации 3 TON пользователю ID 25');
    
    return {
      hash: LOST_HASH,
      userId: 25,
      amount: 3,
      timestamp: '2025-07-31T08:07:00',
      status: 'NEEDS_DATABASE_CHECK'
    };
    
  } catch (error) {
    console.error('❌ Ошибка при поиске:', error);
    return null;
  }
}

// Запуск поиска
searchLostTransaction()
  .then(result => {
    if (result) {
      console.log('\n📋 РЕЗУЛЬТАТ ПОИСКА:', result);
    }
  })
  .catch(console.error);