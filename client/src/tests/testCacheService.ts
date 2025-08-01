import { cacheService } from '../services/cacheService';
import { fetchBalance } from '../services/balanceService';
import { fetchUniFarmingStatus, fetchTonFarmingStatus } from '../services/farmingService';
import { fetchTransactions, fetchTonTransactions } from '../services/transactionService';

/**
 * Тестовый скрипт для проверки работы кеширования
 * Запуск: npm run test:cache
 */

// Симуляция userId
const TEST_USER_ID = 184;

// Функция для измерения времени выполнения
async function measureTime<T>(
  name: string,
  fn: () => Promise<T>
): Promise<{ result: T; time: number }> {
  const start = performance.now();
  const result = await fn();
  const time = performance.now() - start;
  console.log(`[CacheTest] ${name}: ${time.toFixed(2)}ms`);
  return { result, time };
}

// Тест кеширования баланса
async function testBalanceCache() {
  console.log('\n=== Тестирование кеша баланса ===');
  
  // Очищаем кеш перед тестом
  cacheService.clear();
  
  // Первый запрос - должен идти к API
  const { time: time1 } = await measureTime('Первый запрос баланса (API)', 
    () => fetchBalance(TEST_USER_ID)
  );
  
  // Второй запрос - должен вернуться из кеша
  const { time: time2 } = await measureTime('Второй запрос баланса (кеш)', 
    () => fetchBalance(TEST_USER_ID)
  );
  
  // Третий запрос с forceRefresh - должен идти к API
  const { time: time3 } = await measureTime('Третий запрос баланса (forceRefresh)', 
    () => fetchBalance(TEST_USER_ID, true)
  );
  
  console.log(`[CacheTest] Ускорение от кеша: ${(time1 / time2).toFixed(1)}x`);
}

// Тест кеширования фарминга
async function testFarmingCache() {
  console.log('\n=== Тестирование кеша фарминга ===');
  
  // UNI фарминг
  console.log('\n--- UNI Фарминг ---');
  const { time: uniTime1 } = await measureTime('Первый запрос UNI фарминга (API)', 
    () => fetchUniFarmingStatus(TEST_USER_ID)
  );
  
  const { time: uniTime2 } = await measureTime('Второй запрос UNI фарминга (кеш)', 
    () => fetchUniFarmingStatus(TEST_USER_ID)
  );
  
  console.log(`[CacheTest] Ускорение UNI фарминга: ${(uniTime1 / uniTime2).toFixed(1)}x`);
  
  // TON фарминг
  console.log('\n--- TON Фарминг ---');
  const { time: tonTime1 } = await measureTime('Первый запрос TON фарминга (API)', 
    () => fetchTonFarmingStatus(TEST_USER_ID)
  );
  
  const { time: tonTime2 } = await measureTime('Второй запрос TON фарминга (кеш)', 
    () => fetchTonFarmingStatus(TEST_USER_ID)
  );
  
  console.log(`[CacheTest] Ускорение TON фарминга: ${(tonTime1 / tonTime2).toFixed(1)}x`);
}

// Тест кеширования транзакций
async function testTransactionCache() {
  console.log('\n=== Тестирование кеша транзакций ===');
  
  // Общие транзакции
  console.log('\n--- Общие транзакции ---');
  const { time: txTime1 } = await measureTime('Первый запрос транзакций (API)', 
    () => fetchTransactions(TEST_USER_ID, 20, 0)
  );
  
  const { time: txTime2 } = await measureTime('Второй запрос транзакций (кеш)', 
    () => fetchTransactions(TEST_USER_ID, 20, 0)
  );
  
  console.log(`[CacheTest] Ускорение транзакций: ${(txTime1 / txTime2).toFixed(1)}x`);
  
  // TON транзакции
  console.log('\n--- TON транзакции ---');
  const { time: tonTxTime1 } = await measureTime('Первый запрос TON транзакций (API)', 
    () => fetchTonTransactions(TEST_USER_ID, 50, 0)
  );
  
  const { time: tonTxTime2 } = await measureTime('Второй запрос TON транзакций (кеш)', 
    () => fetchTonTransactions(TEST_USER_ID, 50, 0)
  );
  
  console.log(`[CacheTest] Ускорение TON транзакций: ${(tonTxTime1 / tonTxTime2).toFixed(1)}x`);
}

// Главная функция тестирования
export async function runCacheTests() {
  console.log('=== Начало тестирования кеширования ===');
  console.log(`Тестовый пользователь: ${TEST_USER_ID}`);
  console.log(`Время: ${new Date().toISOString()}`);
  
  try {
    await testBalanceCache();
    await testFarmingCache();
    await testTransactionCache();
    
    console.log('\n=== Итоговая статистика кеша ===');
    const stats = cacheService.getStats();
    console.log(`Записей в кеше: ${stats.size}`);
    console.log(`Попаданий в кеш: ${stats.hits}`);
    console.log(`Промахов кеша: ${stats.misses}`);
    console.log(`Процент попаданий: ${((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(1)}%`);
    console.log(`Истёкших записей: ${stats.expired}`);
    
    console.log('\n✅ Все тесты кеширования завершены успешно!');
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
  }
}

// Запуск тестов при импорте (для разработки)
if (import.meta.env.DEV) {
  // runCacheTests();
}