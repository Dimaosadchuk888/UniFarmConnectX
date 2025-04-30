import addWalletAddress from './migrations/add_wallet_address.js';
import addPerformanceIndices from './migrations/add_performance_indices.js';
import addFarmingSnapshots from './migrations/add_farming_snapshots.js';
import addWalletSnapshots from './migrations/add_wallet_snapshots.js';
import addAdminLogs from './migrations/add_admin_logs.js';
import addTransactionsPartitioning from './migrations/add_transactions_partitioning.js';

/**
 * Скрипт для запуска всех миграций в правильном порядке
 */
async function runAllMigrations() {
  try {
    console.log('Начинаем выполнение всех миграций');
    
    // Запускаем миграции в нужном порядке
    await addWalletAddress();
    
    // Добавляем индексы для повышения производительности запросов
    await addPerformanceIndices();
    
    // Создаем таблицы для аналитических снимков и отслеживания
    console.log('\n--- Создание аналитических таблиц ---');
    await addFarmingSnapshots();
    await addWalletSnapshots();
    await addAdminLogs();
    
    // Партиционирование таблицы транзакций
    // Внимание: эта миграция закомментирована, так как нужна только
    // при большом количестве записей (рекомендуется от 1 млн транзакций)
    // Раскомментируйте следующие строки, когда будет необходимо
    console.log('\n--- ПОДГОТОВКА ПАРТИЦИОНИРОВАНИЯ ТРАНЗАКЦИЙ ---');
    console.log('Внимание: создаются только шаблоны для партиционирования.');
    console.log('Фактический перенос данных должен выполняться вручную в окно обслуживания.');
    await addTransactionsPartitioning();
    
    console.log('Все миграции успешно выполнены');
    process.exit(0);
  } catch (error) {
    console.error('Ошибка при выполнении миграций:', error);
    process.exit(1);
  }
}

// Запускаем все миграции
runAllMigrations();