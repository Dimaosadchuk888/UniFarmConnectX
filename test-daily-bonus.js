/**
 * Тестирование API ежедневного бонуса
 * 
 * Скрипт проверяет статус бонуса и позволяет получить его
 * 
 * Запуск: node test-daily-bonus.js <user_id> [claim]
 * Пример: node test-daily-bonus.js 1
 * Пример с получением: node test-daily-bonus.js 1 claim
 */

import fetch from 'node-fetch';

// Базовый URL API
const API_BASE_URL = process.env.API_URL || 'https://93cb0060-75d7-4281-ac65-b204cda864a4-00-1j7bpbfst9vfx.pike.replit.dev';

/**
 * Получает статус ежедневного бонуса
 * @param {number} userId - ID пользователя
 * @returns {Promise<object>} - Ответ API
 */
async function getBonusStatus(userId) {
  try {
    console.log(`[📋] Запрос статуса ежедневного бонуса для пользователя ID=${userId}...`);
    
    const response = await fetch(`${API_BASE_URL}/api/daily-bonus/status?user_id=${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`Ошибка при получении статуса бонуса: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('[❌] Ошибка при получении статуса ежедневного бонуса:', error);
    throw error;
  }
}

/**
 * Получает ежедневный бонус
 * @param {number} userId - ID пользователя
 * @returns {Promise<object>} - Ответ API
 */
async function claimBonus(userId) {
  try {
    console.log(`[🎁] Запрос на получение ежедневного бонуса для пользователя ID=${userId}...`);
    
    const response = await fetch(`${API_BASE_URL}/api/daily-bonus/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    });
    
    const responseBody = await response.text();
    
    try {
      const jsonResponse = JSON.parse(responseBody);
      
      if (response.ok && jsonResponse.success) {
        return jsonResponse;
      } else {
        console.log(`[❌] Ошибка при получении бонуса: ${jsonResponse.error?.message || 'Неизвестная ошибка'}`);
        return jsonResponse;
      }
    } catch (parseError) {
      console.log(`[❌] Ошибка разбора ответа как JSON`);
      console.log(`[📝] Сырой ответ:`, responseBody.substring(0, 200));
      throw new Error(`Невалидный JSON в ответе: ${parseError.message}`);
    }
  } catch (error) {
    console.error('[❌] Ошибка при получении ежедневного бонуса:', error);
    throw error;
  }
}

/**
 * Проверяет статус ежедневного бонуса и при необходимости получает его
 * @param {number} userId - ID пользователя
 * @param {boolean} shouldClaim - Нужно ли получать бонус
 */
async function testDailyBonus(userId, shouldClaim = false) {
  console.log('====================================================================');
  console.log(`[🧪] ТЕСТИРОВАНИЕ ЕЖЕДНЕВНОГО БОНУСА`);
  console.log(`[👤] Пользователь ID: ${userId}`);
  console.log('====================================================================');
  
  try {
    // Шаг 1: Проверяем статус бонуса
    const statusResponse = await getBonusStatus(userId);
    
    if (!statusResponse.success) {
      throw new Error('Не удалось получить статус ежедневного бонуса');
    }
    
    const status = statusResponse.data;
    
    console.log('\n[📊] Статус ежедневного бонуса:');
    console.log(`[🕒] Сегодняшний бонус доступен: ${status.is_available ? 'Да' : 'Нет'}`);
    console.log(`[📅] Текущая серия: ${status.current_streak || 0}`);
    console.log(`[🎯] Максимальная серия: ${status.max_streak || 0}`);
    
    if (status.next_available_at) {
      console.log(`[⏱️] Следующий бонус доступен: ${new Date(status.next_available_at).toLocaleString()}`);
    }
    
    if (status.last_claimed_at) {
      console.log(`[📆] Последний полученный бонус: ${new Date(status.last_claimed_at).toLocaleString()}`);
    }
    
    // Шаг 2: Если нужно и возможно, получаем бонус
    if (shouldClaim) {
      if (status.is_available) {
        console.log('\n[🎁] Попытка получения бонуса...');
        const claimResponse = await claimBonus(userId);
        
        if (claimResponse.success) {
          console.log('[✅] Бонус успешно получен!');
          
          if (claimResponse.data && claimResponse.data.amount) {
            console.log(`[💰] Получено: ${claimResponse.data.amount} UNI`);
          }
          
          if (claimResponse.data && claimResponse.data.new_streak) {
            console.log(`[📅] Новая серия: ${claimResponse.data.new_streak}`);
          }
          
          // Проверяем обновленный статус
          console.log('\n[🔄] Проверка обновленного статуса...');
          const updatedStatus = await getBonusStatus(userId);
          
          if (updatedStatus.success) {
            console.log('\n[📊] Обновленный статус ежедневного бонуса:');
            console.log(`[🕒] Сегодняшний бонус доступен: ${updatedStatus.data.is_available ? 'Да' : 'Нет'}`);
            console.log(`[📅] Текущая серия: ${updatedStatus.data.current_streak || 0}`);
            console.log(`[🎯] Максимальная серия: ${updatedStatus.data.max_streak || 0}`);
            
            if (updatedStatus.data.next_available_at) {
              console.log(`[⏱️] Следующий бонус доступен: ${new Date(updatedStatus.data.next_available_at).toLocaleString()}`);
            }
          }
        } else {
          console.log('[❌] Не удалось получить бонус');
          if (claimResponse.error && claimResponse.error.message) {
            console.log(`[❓] Причина: ${claimResponse.error.message}`);
          }
        }
      } else {
        console.log('\n[⚠️] Бонус сегодня уже получен или недоступен. Пропускаем получение.');
      }
    }
    
    // Итог
    console.log('\n====================================================================');
    console.log(`[🏁] ТЕСТИРОВАНИЕ ЗАВЕРШЕНО`);
    console.log('====================================================================');
    
  } catch (error) {
    console.error('\n[❌] ОШИБКА ПРИ ВЫПОЛНЕНИИ ТЕСТА:');
    console.error(error);
    console.log('====================================================================');
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
      console.error('Использование: node test-daily-bonus.js <user_id> [claim]');
      process.exit(1);
    }
    
    // Парсим аргументы
    const userId = parseInt(args[0]);
    const shouldClaim = args[1] === 'claim';
    
    if (isNaN(userId) || userId <= 0) {
      console.error('ID пользователя должен быть положительным числом');
      process.exit(1);
    }
    
    // Запускаем тестирование
    await testDailyBonus(userId, shouldClaim);
    
  } catch (error) {
    console.error('Неожиданная ошибка при выполнении скрипта:', error);
    process.exit(1);
  }
}

// Запускаем скрипт
main();