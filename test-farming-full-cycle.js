/**
 * Комплексное тестирование полного цикла фарминга
 * 
 * Этот скрипт выполняет последовательную проверку всего цикла работы с фармингом:
 * 1. Добавляет тестовый баланс пользователю через систему ежедневных бонусов
 * 2. Выполняет депозит средств в фарминг
 * 3. Симулирует ожидание с помощью искусственно созданных транзакций
 * 4. Выполняет сбор вознаграждений
 * 5. Проверяет баланс пользователя после всех операций
 * 
 * Запуск: node test-farming-full-cycle.js <user_id>
 * Пример: node test-farming-full-cycle.js 1
 */

import fetch from 'node-fetch';
import { exec } from 'child_process';
import { promisify } from 'util';
import { db } from './server/db.js';
import { users } from './shared/schema.js';
import { eq } from 'drizzle-orm';

const execAsync = promisify(exec);

// Базовый URL API
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';

// Конфигурация тестирования
const TEST_BALANCE_AMOUNT = 5; // Количество бонусов для начисления
const DEPOSIT_AMOUNT = 1000; // Сумма для депозита в фарминг
const SIMULATED_REWARD = 10; // Искусственная награда для теста сбора

/**
 * Получает баланс пользователя
 * @param {number} userId ID пользователя
 * @returns {Promise<object>} Баланс пользователя
 */
async function getUserBalance(userId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/wallet/balance?user_id=${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`Ошибка при получении баланса: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Ошибка при получении баланса:', error);
    throw error;
  }
}

/**
 * Выполняет запрос на получение информации о статусе фарминга
 * @param {number} userId ID пользователя
 * @returns {Promise<object>} Информация о фарминге
 */
async function getFarmingInfo(userId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/uni-farming/info?user_id=${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`Ошибка при получении информации о фарминге: ${response.status} ${response.statusText}`);
    }
    
    const jsonResponse = await response.json();
    return jsonResponse;
  } catch (error) {
    console.error('Ошибка при получении информации о фарминге:', error);
    throw error;
  }
}

/**
 * Выполняет запрос на депозит средств в фарминг
 * @param {number} userId ID пользователя
 * @param {number} amount Сумма депозита
 * @returns {Promise<object>} Результат депозита
 */
async function depositToFarming(userId, amount) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/uni-farming/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        amount: amount.toString() // Отправляем как строку, как это делает фронтенд
      })
    });
    
    // Получаем тело ответа
    const responseBody = await response.text();
    
    // Пытаемся распарсить JSON
    try {
      const jsonResponse = JSON.parse(responseBody);
      if (!response.ok && jsonResponse.error) {
        throw new Error(`Ошибка депозита: ${jsonResponse.error.message || 'Неизвестная ошибка'}`);
      }
      
      return jsonResponse;
    } catch (parseError) {
      console.error('Ошибка разбора JSON ответа:', parseError);
      console.log('Оригинальный ответ:', responseBody);
      throw new Error(`Получен неверный формат ответа: ${responseBody.substring(0, 100)}...`);
    }
  } catch (error) {
    console.error('Ошибка при депозите в фарминг:', error);
    throw error;
  }
}

/**
 * Выполняет запрос на сбор урожая с фарминга
 * @param {number} userId ID пользователя
 * @returns {Promise<object>} Результат сбора урожая
 */
async function harvestFarming(userId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/uni-farming/harvest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    });
    
    // Получаем тело ответа
    const responseBody = await response.text();
    
    // Пытаемся распарсить JSON
    try {
      const jsonResponse = JSON.parse(responseBody);
      if (!response.ok && jsonResponse.error) {
        throw new Error(`Ошибка сбора урожая: ${jsonResponse.error.message || 'Неизвестная ошибка'}`);
      }
      
      return jsonResponse;
    } catch (parseError) {
      console.error('Ошибка разбора JSON ответа:', parseError);
      console.log('Оригинальный ответ:', responseBody);
      throw new Error(`Получен неверный формат ответа: ${responseBody.substring(0, 100)}...`);
    }
  } catch (error) {
    console.error('Ошибка при сборе урожая с фарминга:', error);
    throw error;
  }
}

/**
 * Симулирует начисление вознаграждения в фарминге путем прямого изменения в БД
 * @param {number} userId ID пользователя
 * @param {number} rewardAmount Сумма вознаграждения
 * @returns {Promise<void>}
 */
async function simulateReward(userId, rewardAmount) {
  try {
    // Получаем информацию о пользователе
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) {
      throw new Error(`Пользователь с ID ${userId} не найден`);
    }
    
    // Обновляем значение uni_farming_balance
    if (user.uni_farming_balance === null) {
      // Если поле uni_farming_balance отсутствует, создаем его с начальным значением
      await db
        .update(users)
        .set({ uni_farming_balance: rewardAmount.toString() })
        .where(eq(users.id, userId));
    } else {
      // Если поле уже существует, увеличиваем его значение
      const currentBalance = parseFloat(user.uni_farming_balance) || 0;
      const newBalance = currentBalance + rewardAmount;
      
      await db
        .update(users)
        .set({ uni_farming_balance: newBalance.toString() })
        .where(eq(users.id, userId));
    }
    
    console.log(`[✓] Симулировано начисление награды ${rewardAmount} UNI для пользователя ID=${userId}`);
  } catch (error) {
    console.error('Ошибка при симуляции награды:', error);
    throw error;
  }
}

/**
 * Добавляет тестовый баланс пользователю через скрипт ежедневных бонусов
 * @param {number} userId ID пользователя
 * @returns {Promise<void>}
 */
async function addTestBalance(userId) {
  console.log(`Добавление тестового баланса пользователю ${userId}...`);
  
  try {
    const { stdout, stderr } = await execAsync(`node add-test-balance-bonus.js ${userId} ${TEST_BALANCE_AMOUNT}`);
    
    if (stderr) {
      console.error('Ошибка при добавлении баланса:', stderr);
    }
    
    console.log(stdout);
  } catch (error) {
    console.error('Ошибка при выполнении скрипта начисления баланса:', error);
    throw error;
  }
}

/**
 * Выполняет полное тестирование цикла фарминга
 * @param {number} userId ID пользователя
 * @returns {Promise<void>}
 */
async function testFullFarmingCycle(userId) {
  console.log(`Начинаем тестирование полного цикла фарминга для пользователя ID=${userId}`);
  console.log('====================================================================');
  
  try {
    // Шаг 1: Проверяем начальное состояние
    console.log('ЭТАП 1: Проверка начального состояния');
    console.log('--------------------------------------------------------------------');
    
    const initialBalanceResponse = await getUserBalance(userId);
    if (!initialBalanceResponse.success) {
      throw new Error('Не удалось получить начальный баланс пользователя');
    }
    
    const initialBalance = parseFloat(initialBalanceResponse.data.uni);
    console.log(`[1] Начальный баланс UNI: ${initialBalance}`);
    
    const initialFarmingResponse = await getFarmingInfo(userId);
    if (!initialFarmingResponse.success) {
      throw new Error('Не удалось получить начальную информацию о фарминге');
    }
    
    console.log(`[2] Начальная информация о фарминге:`);
    console.log(`    - Общий APY: ${initialFarmingResponse.data.total_apy || 'N/A'}%`);
    console.log(`    - Активный: ${initialFarmingResponse.data.is_active ? 'Да' : 'Нет'}`);
    console.log(`    - Баланс в фарминге: ${initialFarmingResponse.data.balance || 0}`);
    console.log(`    - Доступно для сбора: ${initialFarmingResponse.data.rewards || 0}`);
    
    // Шаг 2: Добавляем тестовый баланс, если нужно
    console.log('\nЭТАП 2: Подготовка баланса для депозита');
    console.log('--------------------------------------------------------------------');
    
    if (initialBalance < DEPOSIT_AMOUNT) {
      console.log(`[3] Баланс недостаточен для депозита, добавляем тестовый баланс...`);
      await addTestBalance(userId);
      
      // Проверяем обновленный баланс
      const updatedBalanceResponse = await getUserBalance(userId);
      if (!updatedBalanceResponse.success) {
        throw new Error('Не удалось получить обновленный баланс пользователя');
      }
      
      const updatedBalance = parseFloat(updatedBalanceResponse.data.uni);
      console.log(`[4] Обновленный баланс UNI: ${updatedBalance}`);
      
      if (updatedBalance < DEPOSIT_AMOUNT) {
        throw new Error(`Баланса недостаточно для депозита (${updatedBalance} < ${DEPOSIT_AMOUNT})`);
      }
    } else {
      console.log(`[3] Баланс достаточен для депозита, пропускаем добавление тестового баланса`);
    }
    
    // Шаг 3: Выполняем депозит в фарминг
    console.log('\nЭТАП 3: Депозит средств в фарминг');
    console.log('--------------------------------------------------------------------');
    
    console.log(`[5] Выполнение депозита ${DEPOSIT_AMOUNT} UNI в фарминг...`);
    const depositResponse = await depositToFarming(userId, DEPOSIT_AMOUNT);
    
    if (!depositResponse.success) {
      throw new Error(`Депозит не удался: ${JSON.stringify(depositResponse)}`);
    }
    
    console.log(`[6] Депозит выполнен успешно!`);
    console.log(`    - Детали ответа: ${JSON.stringify(depositResponse.data || {})}`);
    
    // Шаг 4: Проверяем состояние после депозита
    console.log('\nЭТАП 4: Проверка состояния после депозита');
    console.log('--------------------------------------------------------------------');
    
    const afterDepositBalanceResponse = await getUserBalance(userId);
    if (!afterDepositBalanceResponse.success) {
      throw new Error('Не удалось получить баланс после депозита');
    }
    
    const afterDepositBalance = parseFloat(afterDepositBalanceResponse.data.uni);
    const depositBalanceDifference = initialBalance - afterDepositBalance;
    
    console.log(`[7] Баланс после депозита: ${afterDepositBalance} UNI`);
    console.log(`    - Разница баланса: ${depositBalanceDifference} UNI`);
    
    const afterDepositFarmingResponse = await getFarmingInfo(userId);
    if (!afterDepositFarmingResponse.success) {
      throw new Error('Не удалось получить информацию о фарминге после депозита');
    }
    
    console.log(`[8] Информация о фарминге после депозита:`);
    console.log(`    - Общий APY: ${afterDepositFarmingResponse.data.total_apy || 'N/A'}%`);
    console.log(`    - Активный: ${afterDepositFarmingResponse.data.is_active ? 'Да' : 'Нет'}`);
    console.log(`    - Баланс в фарминге: ${afterDepositFarmingResponse.data.balance || 0}`);
    console.log(`    - Доступно для сбора: ${afterDepositFarmingResponse.data.rewards || 0}`);
    
    // Шаг 5: Симулируем накопление вознаграждений
    console.log('\nЭТАП 5: Симуляция накопления вознаграждений');
    console.log('--------------------------------------------------------------------');
    
    console.log(`[9] Симуляция накопления вознаграждений ${SIMULATED_REWARD} UNI...`);
    await simulateReward(userId, SIMULATED_REWARD);
    
    // Проверяем состояние после симуляции
    const afterRewardFarmingResponse = await getFarmingInfo(userId);
    if (!afterRewardFarmingResponse.success) {
      throw new Error('Не удалось получить информацию о фарминге после симуляции вознаграждений');
    }
    
    console.log(`[10] Информация о фарминге после начисления вознаграждений:`);
    console.log(`    - Общий APY: ${afterRewardFarmingResponse.data.total_apy || 'N/A'}%`);
    console.log(`    - Активный: ${afterRewardFarmingResponse.data.is_active ? 'Да' : 'Нет'}`);
    console.log(`    - Баланс в фарминге: ${afterRewardFarmingResponse.data.balance || 0}`);
    console.log(`    - Доступно для сбора: ${afterRewardFarmingResponse.data.rewards || 0}`);
    
    // Шаг 6: Собираем вознаграждения
    console.log('\nЭТАП 6: Сбор вознаграждений');
    console.log('--------------------------------------------------------------------');
    
    const availableRewards = parseFloat(afterRewardFarmingResponse.data.rewards || 0);
    
    if (availableRewards <= 0) {
      console.log(`[11] Нет доступных вознаграждений для сбора (${availableRewards} UNI). Пропускаем этап.`);
    } else {
      console.log(`[11] Выполнение сбора вознаграждений (${availableRewards} UNI)...`);
      const harvestResponse = await harvestFarming(userId);
      
      if (!harvestResponse.success) {
        throw new Error(`Сбор вознаграждений не удался: ${JSON.stringify(harvestResponse)}`);
      }
      
      console.log(`[12] Сбор вознаграждений выполнен успешно!`);
      console.log(`    - Детали ответа: ${JSON.stringify(harvestResponse.data || {})}`);
    }
    
    // Шаг 7: Проверяем финальное состояние
    console.log('\nЭТАП 7: Проверка финального состояния');
    console.log('--------------------------------------------------------------------');
    
    const finalBalanceResponse = await getUserBalance(userId);
    if (!finalBalanceResponse.success) {
      throw new Error('Не удалось получить финальный баланс пользователя');
    }
    
    const finalBalance = parseFloat(finalBalanceResponse.data.uni);
    const totalBalanceDifference = finalBalance - initialBalance;
    
    console.log(`[13] Финальный баланс UNI: ${finalBalance}`);
    console.log(`    - Общая разница баланса: ${totalBalanceDifference} UNI`);
    
    const finalFarmingResponse = await getFarmingInfo(userId);
    if (!finalFarmingResponse.success) {
      throw new Error('Не удалось получить финальную информацию о фарминге');
    }
    
    console.log(`[14] Финальная информация о фарминге:`);
    console.log(`    - Общий APY: ${finalFarmingResponse.data.total_apy || 'N/A'}%`);
    console.log(`    - Активный: ${finalFarmingResponse.data.is_active ? 'Да' : 'Нет'}`);
    console.log(`    - Баланс в фарминге: ${finalFarmingResponse.data.balance || 0}`);
    console.log(`    - Доступно для сбора: ${finalFarmingResponse.data.rewards || 0}`);
    
    // Финальный вывод результатов
    console.log('\n====================================================================');
    console.log(`[✓] Тестирование полного цикла фарминга завершено успешно!`);
    console.log('====================================================================');
    
  } catch (error) {
    console.error('\n[X] ОШИБКА ПРИ ТЕСТИРОВАНИИ ЦИКЛА ФАРМИНГА:');
    console.error(error);
    console.error('====================================================================');
    process.exit(1);
  }
}

/**
 * Запуск скрипта с параметрами командной строки
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    
    // Проверяем наличие необходимых аргументов
    if (args.length < 1) {
      console.error('Необходимо указать ID пользователя');
      console.error('Использование: node test-farming-full-cycle.js <user_id>');
      process.exit(1);
    }
    
    // Парсим и валидируем ID пользователя
    const userId = parseInt(args[0]);
    
    if (isNaN(userId) || userId <= 0) {
      console.error('ID пользователя должен быть положительным числом');
      process.exit(1);
    }
    
    // Запускаем тестирование
    await testFullFarmingCycle(userId);
    
  } catch (error) {
    console.error('Неожиданная ошибка при выполнении скрипта:', error);
    process.exit(1);
  }
}

// Запускаем скрипт
main();