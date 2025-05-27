/**
 * Тестовий скрипт для перевірки роботи оновлених модулів БД
 * 
 * Цей скрипт імпортує TypeScript модулі через динамічний імпорт,
 * щоб перевірити підключення до бази даних
 */

// Динамічний імпорт модулів TypeScript
async function runTests() {
  try {
    // Спочатку спробуємо використовувати модуль db-adapter
    console.log('Тестування через db-adapter...');
    const adapterModule = await import('./db-adapter.js');
    const { testDatabaseConnection } = adapterModule;
    
    const result = await testDatabaseConnection();
    console.log('Результат через db-adapter:', result);
    
    // Після успішного тесту через адаптер, тестуємо прямий доступ
    try {
      console.log('\nТестування прямого підключення через db-connect-unified...');
      const unifiedModule = await import('./db-connect-unified.js');
      const { testConnection, pool, dbMonitor } = unifiedModule;
      
      const directResult = await testConnection();
      console.log('Пряме підключення:', directResult ? 'успішне' : 'помилка');
      
      // Тестовий запит до БД
      const queryResult = await pool.query('SELECT NOW() as time');
      console.log('Запит виконано, час БД:', queryResult.rows[0].time);
      
      // Отримуємо статистику моніторингу
      const stats = dbMonitor.getStats();
      console.log('\nСтатистика моніторингу:', stats);
      
      console.log('\n✅ Всі тести успішно пройдені!');
    } catch (moduleError) {
      console.error('Помилка прямого підключення:', moduleError);
    }
  } catch (error) {
    console.error('Критична помилка тестування:', error);
  }
}

// Запуск тестів
runTests().catch(err => {
  console.error('Помилка виконання тестів:', err);
});