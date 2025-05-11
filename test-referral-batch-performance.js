/**
 * Скрипт для тестирования производительности пакетной обработки реферальных вознаграждений
 * 
 * Этот тест имитирует различные сценарии нагрузки для оценки эффективности оптимизации:
 * 1. Маленькая реферальная структура (1-5 уровней)
 * 2. Средняя реферальная структура (6-10 уровней)
 * 3. Большая реферальная структура (10-20 уровней)
 * 
 * Для запуска: node test-referral-batch-performance.js <user_id> <структура> <валюта> <сумма>
 * Пример: node test-referral-batch-performance.js 1 large UNI 1000
 */

// Используем ES модули вместо CommonJS
import pg from 'pg';
import { ReferralBonusService } from './server/services/referralBonusServiceInstance.js';
import { Currency } from './server/services/transactionService.js';
import crypto from 'crypto';

const { Pool } = pg;

// Проверяем наличие всех переменных окружения
const validateEnvironment = () => {
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: Переменная окружения DATABASE_URL не найдена');
    process.exit(1);
  }
};

// Инициализируем подключение к базе данных
const initDb = async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Проверяем подключение
    await pool.query('SELECT NOW()');
    console.log('✅ Успешное подключение к базе данных');
    return pool;
  } catch (error) {
    console.error('❌ Ошибка подключения к базе данных:', error);
    process.exit(1);
  }
};

// Создаем тестовую реферальную структуру
const setupReferralStructure = async (pool, userId, structureSize) => {
  // Генерируем уникальный идентификатор теста для отслеживания тестовых данных
  const testId = crypto.randomUUID().substring(0, 8);
  console.log(`[Test ID: ${testId}] Создание тестовой реферальной структуры...`);
  
  try {
    // Определяем размер структуры
    let levels = 0;
    switch (structureSize.toLowerCase()) {
      case 'small':
        levels = 5;
        break;
      case 'medium':
        levels = 10;
        break;
      case 'large':
        levels = 20;
        break;
      default:
        levels = parseInt(structureSize) || 5;
    }
    
    console.log(`[Test ID: ${testId}] Создание структуры с ${levels} уровнями для пользователя ${userId}`);
    
    // Создаем тестовых пользователей, если они еще не существуют
    for (let i = 1; i <= levels; i++) {
      const testUsername = `test_ref_${testId}_${i}`;
      
      // Проверяем, существует ли пользователь
      const existingUserResult = await pool.query(
        'SELECT id FROM users WHERE username = $1', 
        [testUsername]
      );
      
      let testUserId;
      
      if (existingUserResult.rows.length === 0) {
        // Создаем нового пользователя
        const insertResult = await pool.query(
          'INSERT INTO users (username, balance_uni, balance_ton, ref_code) VALUES ($1, $2, $3, $4) RETURNING id',
          [testUsername, '0', '0', `REF${testId}${i}`]
        );
        testUserId = insertResult.rows[0].id;
        console.log(`[Test ID: ${testId}] ✅ Создан тестовый пользователь ${testUsername} с ID ${testUserId}`);
      } else {
        testUserId = existingUserResult.rows[0].id;
        console.log(`[Test ID: ${testId}] ℹ️ Используем существующего пользователя ${testUsername} с ID ${testUserId}`);
      }
      
      // Создаем реферальную связь на соответствующем уровне
      await pool.query(
        'INSERT INTO referrals (user_id, inviter_id, level) VALUES ($1, $2, $3) ON CONFLICT (user_id, inviter_id) DO NOTHING',
        [userId, testUserId, i]
      );
      
      console.log(`[Test ID: ${testId}] ✅ Создана реферальная связь: пользователь ${userId} -> приглашатель ${testUserId} (уровень ${i})`);
    }
    
    return { testId, levels };
  } catch (error) {
    console.error(`[Test ID: ${testId}] ❌ Ошибка создания тестовой структуры:`, error);
    throw error;
  }
};

// Проверяем результаты выполнения и собираем статистику
const checkResults = async (pool, userId, testId, currency) => {
  console.log(`[Test ID: ${testId}] Проверка результатов обработки...`);
  
  try {
    // Проверяем созданные транзакции
    const transactionsResult = await pool.query(
      'SELECT COUNT(*) as count, SUM(CAST(amount as DECIMAL)) as total FROM transactions WHERE source_user_id = $1 AND type = $2 AND data LIKE $3',
      [userId, 'referral', `%${testId}%`]
    );
    
    const transactionCount = parseInt(transactionsResult.rows[0].count);
    const totalAmount = parseFloat(transactionsResult.rows[0].total || 0);
    
    console.log(`[Test ID: ${testId}] Статистика реферальных начислений:`);
    console.log(`[Test ID: ${testId}] - Количество транзакций: ${transactionCount}`);
    console.log(`[Test ID: ${testId}] - Общая сумма начислений: ${totalAmount.toFixed(8)} ${currency}`);
    
    // Проверяем записи в журнале распределения
    const logsResult = await pool.query(
      'SELECT * FROM reward_distribution_logs WHERE source_user_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 5',
      [userId, 'completed']
    );
    
    if (logsResult.rows.length > 0) {
      const latestLog = logsResult.rows[0];
      console.log(`[Test ID: ${testId}] Информация о последнем распределении:`);
      console.log(`[Test ID: ${testId}] - Batch ID: ${latestLog.batch_id}`);
      console.log(`[Test ID: ${testId}] - Обработано уровней: ${latestLog.levels_processed}`);
      console.log(`[Test ID: ${testId}] - Количество получателей: ${latestLog.inviter_count}`);
      console.log(`[Test ID: ${testId}] - Всего распределено: ${latestLog.total_distributed} ${latestLog.currency}`);
      console.log(`[Test ID: ${testId}] - Время обработки: ${(new Date(latestLog.completed_at) - new Date(latestLog.processed_at))}ms`);
    } else {
      console.log(`[Test ID: ${testId}] ⚠️ Записи о распределении не найдены`);
    }
    
    return { transactionCount, totalAmount };
  } catch (error) {
    console.error(`[Test ID: ${testId}] ❌ Ошибка при проверке результатов:`, error);
    throw error;
  }
};

// Запускаем пакетную обработку и измеряем производительность
const runPerformanceTest = async (pool, userId, structureSize, currency, amount) => {
  console.log(`\n=== Тест производительности пакетной обработки реферальных бонусов ===\n`);
  console.log(`Параметры теста:`);
  console.log(`- Пользователь: ${userId}`);
  console.log(`- Размер структуры: ${structureSize}`);
  console.log(`- Валюта: ${currency}`);
  console.log(`- Сумма: ${amount}`);
  console.log(`\n`);
  
  try {
    // Создаем тестовую структуру
    const { testId, levels } = await setupReferralStructure(pool, userId, structureSize);
    
    // Создаем тестовые данные в журнале распределения
    await pool.query(
      'INSERT INTO reward_distribution_logs (source_user_id, batch_id, currency, earned_amount, status) VALUES ($1, $2, $3, $4, $5)',
      [userId, testId, currency, amount.toString(), 'pending']
    );
    
    console.log(`\n[Test ID: ${testId}] Запуск обработки реферальных вознаграждений...`);
    console.log(`[Test ID: ${testId}] - Уровней в структуре: ${levels}`);
    console.log(`[Test ID: ${testId}] - Сумма вознаграждения: ${amount} ${currency}`);
    
    // Засекаем время начала
    const startTime = performance.now();
    
    // Вызываем сервис бонусов через интерфейс queueFarmingReferralReward
    const referralService = new ReferralBonusService();
    const batchId = await referralService.queueFarmingReferralReward(
      userId, 
      parseFloat(amount), 
      currency === 'UNI' ? Currency.UNI : Currency.TON
    );
    
    console.log(`[Test ID: ${testId}] ✅ Запрос поставлен в очередь, Batch ID: ${batchId}`);
    
    // Даем время на асинхронную обработку (увеличиваем таймаут для больших структур)
    const timeout = levels <= 5 ? 3000 : (levels <= 10 ? 5000 : 8000);
    console.log(`[Test ID: ${testId}] Ожидаем завершения асинхронной обработки (${timeout}ms)...`);
    
    await new Promise(resolve => setTimeout(resolve, timeout));
    
    // Засекаем время окончания
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    
    console.log(`[Test ID: ${testId}] ✓ Тест выполнен за ${executionTime.toFixed(2)}ms`);
    
    // Проверяем результаты
    const results = await checkResults(pool, userId, testId, currency);
    
    // Выводим метрики производительности
    console.log(`\n=== Метрики производительности ===`);
    console.log(`- Общее время выполнения: ${executionTime.toFixed(2)}ms`);
    if (results.transactionCount > 0) {
      console.log(`- Среднее время на транзакцию: ${(executionTime / results.transactionCount).toFixed(2)}ms`);
    }
    console.log(`- Пропускная способность: ${((results.transactionCount || 0) * 1000 / executionTime).toFixed(2)} транзакций/сек`);
    
    return { executionTime, ...results };
  } catch (error) {
    console.error('❌ Ошибка во время теста производительности:', error);
    throw error;
  }
};

// Преобразуем ESM импорты для Node.js
function fixImportPaths() {
  return import('./server/services/referralBonusServiceInstance.js')
    .then(referralModule => {
      const ReferralBonusService = referralModule.ReferralBonusService;
      return import('./server/services/transactionService.js')
        .then(transactionModule => {
          const Currency = transactionModule.Currency;
          return { ReferralBonusService, Currency };
        });
    });
}

// Точка входа
const main = async () => {
  // Загружаем модули
  const { ReferralBonusService, Currency } = await fixImportPaths();
  try {
    validateEnvironment();
    
    // Парсим аргументы командной строки
    const userId = parseInt(process.argv[2]) || 1;
    const structureSize = process.argv[3] || 'small';
    const currency = (process.argv[4] || 'UNI').toUpperCase();
    const amount = parseFloat(process.argv[5]) || 1000;
    
    // Подключаемся к базе данных
    const pool = await initDb();
    
    // Запускаем тест
    await runPerformanceTest(pool, userId, structureSize, currency, amount);
    
    // Закрываем подключение к БД
    await pool.end();
    
    console.log('\n✅ Тест успешно завершен');
  } catch (error) {
    console.error('❌ Ошибка выполнения теста:', error);
    process.exit(1);
  }
};

// Запускаем скрипт
main();