/**
 * Тестовый файл для проверки работы обновленного подключения к базе данных
 */

import { pool, db, testConnection, reconnect, queryWithRetry, dbMonitor } from './db-connect-unified';

async function runTest() {
  console.log('Запуск теста обновленного подключения к базе данных...');
  
  try {
    // 1. Проверка соединения
    console.log('1. Проверка соединения...');
    const isConnected = await testConnection();
    console.log(`   Результат: ${isConnected ? 'соединение установлено' : 'соединение не установлено'}`);
    
    if (!isConnected) {
      // 2. Пробуем переподключиться
      console.log('2. Попытка переподключения...');
      const reconnected = await reconnect();
      console.log(`   Результат: ${reconnected ? 'переподключение успешно' : 'переподключение не удалось'}`);
      
      if (!reconnected) {
        throw new Error('Не удалось установить соединение с базой данных');
      }
    }
    
    // 3. Выполняем тестовый запрос
    console.log('3. Выполнение тестового запроса...');
    const result = await queryWithRetry('SELECT NOW() as current_time');
    console.log(`   Результат: текущее время сервера БД: ${result.rows[0].current_time}`);
    
    // 4. Получаем статистику мониторинга
    console.log('4. Получение статистики мониторинга...');
    const stats = dbMonitor.getStats();
    console.log(`   Статистика: успешных проверок: ${stats.successfulChecks}, неудачных: ${stats.failedChecks}`);
    
    console.log('Тест завершен успешно!');
  } catch (error) {
    console.error('Ошибка при выполнении теста:', error);
  }
}

// Запускаем тест
runTest();