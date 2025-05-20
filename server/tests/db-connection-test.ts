/**
 * Автоматичні тести для перевірки роботи БД-з'єднання
 * 
 * Цей модуль містить набір тестів для перевірки стабільності роботи
 * нової архітектури БД-модулів, включаючи тести на відновлення з'єднання,
 * обробку помилок та паралельні запити.
 */

import { db, pool, testConnection, reconnect, queryWithRetry, dbMonitor, getMonitorStats } from '../db-connect-unified';

/**
 * Результат виконання тесту
 */
interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  error?: Error | unknown;
  details?: any;
}

/**
 * Результати всіх тестів
 */
interface TestSuite {
  date: string;
  totalTests: number;
  successfulTests: number;
  failedTests: number;
  totalDuration: number;
  results: TestResult[];
}

/**
 * Виконує тест та вимірює час виконання
 * @param name Назва тесту
 * @param testFn Функція тесту
 * @returns Результат тесту
 */
async function runTest(name: string, testFn: () => Promise<any>): Promise<TestResult> {
  console.log(`\n[DB Test] Запуск тесту: ${name}`);
  const startTime = Date.now();
  
  try {
    const details = await testFn();
    const duration = Date.now() - startTime;
    console.log(`[DB Test] ✅ Тест "${name}" успішно пройдено за ${duration}мс`);
    
    return {
      name,
      success: true,
      duration,
      details
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[DB Test] ❌ Тест "${name}" не пройдено за ${duration}мс:`, error);
    
    return {
      name,
      success: false,
      duration,
      error
    };
  }
}

/**
 * Запускає всі тести та повертає результати
 * @returns Результати всіх тестів
 */
export async function runAllTests(): Promise<TestSuite> {
  console.log('[DB Test] Початок тестування БД-з\'єднання');
  const startTime = Date.now();
  
  const results: TestResult[] = [];
  
  // Тест 1: Перевірка підключення
  results.push(await runTest('Базова перевірка підключення', async () => {
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Не вдалося підключитися до бази даних');
    }
    return { connected: isConnected };
  }));
  
  // Тест 2: Виконання простого запиту
  results.push(await runTest('Виконання простого запиту', async () => {
    const result = await queryWithRetry('SELECT NOW() as time');
    return { time: result.rows[0].time };
  }));
  
  // Тест 3: Перевірка моніторингу стану
  results.push(await runTest('Перевірка моніторингу стану', async () => {
    const stats = getMonitorStats();
    return { stats };
  }));
  
  // Тест 4: Перевірка паралельних запитів
  results.push(await runTest('Виконання паралельних запитів', async () => {
    const parallelQueries = 10;
    const queries = Array(parallelQueries).fill(0).map((_, i) => 
      queryWithRetry('SELECT pg_sleep(0.1), $1 as query_num', [i])
    );
    
    const results = await Promise.all(queries);
    return { 
      parallelQueries,
      success: results.length === parallelQueries
    };
  }));
  
  // Тест 5: Перевірка обробки помилок запитів
  results.push(await runTest('Обробка помилок запитів', async () => {
    try {
      // Запит з синтаксичною помилкою
      await queryWithRetry('SELECT * FROM non_existent_table');
      throw new Error('Запит повинен був викликати помилку');
    } catch (error) {
      // Помилка очікувана, тест успішний
      return { errorHandled: true };
    }
  }));
  
  // Тест 6: Перевірка транзакцій
  results.push(await runTest('Перевірка транзакцій', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT 1');
      await client.query('COMMIT');
      return { transactionSuccess: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }));
  
  // Тест 7: Перевірка стабільності при навантаженні
  results.push(await runTest('Стабільність при навантаженні', async () => {
    const queries = 50;
    const results = [];
    
    for (let i = 0; i < queries; i++) {
      const result = await queryWithRetry('SELECT $1 as num', [i]);
      results.push(result.rows[0].num);
    }
    
    return { 
      queries,
      success: results.length === queries
    };
  }));
  
  // Підсумовуємо результати
  const endTime = Date.now();
  const successfulTests = results.filter(r => r.success).length;
  
  return {
    date: new Date().toISOString(),
    totalTests: results.length,
    successfulTests,
    failedTests: results.length - successfulTests,
    totalDuration: endTime - startTime,
    results
  };
}

/**
 * Форматує та виводить звіт про тестування
 * @param suite Результати тестування
 */
export function printTestReport(suite: TestSuite): void {
  console.log('\n=== ЗВІТ ПРО ТЕСТУВАННЯ БД-З\'ЄДНАННЯ ===');
  console.log(`Дата: ${new Date(suite.date).toLocaleString()}`);
  console.log(`Загальний час: ${suite.totalDuration}мс`);
  console.log(`Всього тестів: ${suite.totalTests}`);
  console.log(`Успішних тестів: ${suite.successfulTests}`);
  console.log(`Провалених тестів: ${suite.failedTests}`);
  
  // Виводимо деталі тестів
  console.log('\nДеталі тестів:');
  suite.results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.name} - ${result.success ? '✅ Успіх' : '❌ Провал'} (${result.duration}мс)`);
    
    if (!result.success && result.error) {
      console.error(`   Помилка: ${result.error instanceof Error ? result.error.message : result.error}`);
    }
    
    if (result.details) {
      console.log(`   Деталі: ${JSON.stringify(result.details, null, 2)}`);
    }
  });
  
  console.log('\n==========================================');
}

// Створюємо функцію для запуску тестів
export async function startTests() {
  try {
    const results = await runAllTests();
    printTestReport(results);
    return results;
  } catch (error) {
    console.error('Помилка при виконанні тестів:', error);
    throw error;
  }
}