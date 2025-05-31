/**
 * Скрипт для тестирования покупки TON Boost пакета
 * 
 * Этот скрипт отправляет запрос на покупку TON Boost пакета через API,
 * используя режим разработки с заголовками x-development-mode и x-development-user-id.
 * 
 * Запуск: node test-ton-boost-purchase.js <boost_id> <payment_method>
 * Пример: node test-ton-boost-purchase.js 2 internal_balance
 */

import fetch from 'node-fetch';

// Конфигурация
const API_URL = 'https://93cb0060-75d7-4281-ac65-b204cda864a4-00-1j7bpbfst9vfx.pike.replit.dev';
const TEST_USER_ID = 1;

// Получение аргументов командной строки
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import process from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = process.argv.slice(2);
const boostId = parseInt(args[0]) || 2; // По умолчанию Medium Boost (ID: 2)
const paymentMethod = args[1] || 'internal_balance'; // По умолчанию внутренний баланс

/**
 * Получает список доступных TON Boost-пакетов
 */
async function getAvailableBoosts() {
  try {
    const response = await fetch(`${API_URL}/api/ton-boosts`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-development-mode': 'true',
        'x-development-user-id': TEST_USER_ID.toString(),
        'x-telegram-user-id': TEST_USER_ID.toString()
      }
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(`Ошибка при получении списка пакетов: ${data.message}`);
    }
    
    return data.data;
  } catch (error) {
    console.error('Ошибка при запросе к API:', error);
    return null;
  }
}

/**
 * Получает информацию о TON-балансе пользователя
 */
async function getUserTonBalance() {
  try {
    const response = await fetch(`${API_URL}/api/users/${TEST_USER_ID}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-development-mode': 'true',
        'x-development-user-id': TEST_USER_ID.toString(),
        'x-telegram-user-id': TEST_USER_ID.toString()
      }
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(`Ошибка при получении данных пользователя: ${data.message}`);
    }
    
    return {
      tonBalance: data.data.ton_balance,
      uniBalance: data.data.uni_balance
    };
  } catch (error) {
    console.error('Ошибка при запросе к API:', error);
    return { tonBalance: '0', uniBalance: '0' };
  }
}

/**
 * Покупает TON Boost-пакет
 */
async function purchaseTonBoost(boostId, paymentMethod) {
  try {
    console.log(`Отправка запроса на покупку TON Boost (ID: ${boostId}) с методом оплаты: ${paymentMethod}`);
    
    const response = await fetch(`${API_URL}/api/ton-boosts/purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-development-mode': 'true',
        'x-development-user-id': TEST_USER_ID.toString(),
        'x-telegram-user-id': TEST_USER_ID.toString()
      },
      body: JSON.stringify({
        user_id: TEST_USER_ID,
        boost_id: boostId,
        payment_method: paymentMethod
      })
    });
    
    const data = await response.json();
    
    return data;
  } catch (error) {
    console.error('Ошибка при запросе к API:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Запускает тестирование покупки TON Boost
 */
async function main() {
  try {
    // Получаем список доступных TON Boost-пакетов
    console.log('Получение списка доступных TON Boost-пакетов...');
    const boosts = await getAvailableBoosts();
    
    if (!boosts) {
      throw new Error('Не удалось получить список TON Boost-пакетов');
    }
    
    console.log('Доступные TON Boost-пакеты:');
    boosts.forEach(boost => {
      console.log(`ID: ${boost.id}, Название: ${boost.name}, Цена: ${boost.price} TON, UNI бонус: ${boost.uni_bonus}`);
    });
    
    // Получаем текущий баланс пользователя
    console.log('\nПолучение текущего баланса пользователя...');
    const { tonBalance, uniBalance } = await getUserTonBalance();
    console.log(`Текущий баланс: ${tonBalance} TON, ${uniBalance} UNI`);
    
    // Находим выбранный TON Boost-пакет
    const selectedBoost = boosts.find(boost => boost.id === boostId);
    
    if (!selectedBoost) {
      throw new Error(`TON Boost-пакет с ID ${boostId} не найден`);
    }
    
    // Проверяем, достаточно ли средств для покупки
    if (parseFloat(tonBalance) < parseFloat(selectedBoost.price)) {
      throw new Error(`Недостаточно средств для покупки. Требуется: ${selectedBoost.price} TON, доступно: ${tonBalance} TON`);
    }
    
    // Покупаем TON Boost-пакет
    console.log(`\nПокупка TON Boost-пакета "${selectedBoost.name}" за ${selectedBoost.price} TON...`);
    const purchaseResult = await purchaseTonBoost(boostId, paymentMethod);
    
    console.log('\nРезультат покупки:');
    console.log(JSON.stringify(purchaseResult, null, 2));
    
    if (purchaseResult.success) {
      console.log(`\n✅ Покупка успешно выполнена!`);
      
      if (purchaseResult.data) {
        console.log(`ID депозита: ${purchaseResult.data.depositId}`);
        console.log(`ID транзакции: ${purchaseResult.data.transactionId}`);
        console.log(`Метод оплаты: ${purchaseResult.data.paymentMethod}`);
      }
      
      // Получаем обновленный баланс пользователя
      const { tonBalance: newTonBalance, uniBalance: newUniBalance } = await getUserTonBalance();
      console.log(`\nОбновленный баланс: ${newTonBalance} TON, ${newUniBalance} UNI`);
      
      const tonDiff = parseFloat(tonBalance) - parseFloat(newTonBalance);
      const uniDiff = parseFloat(newUniBalance) - parseFloat(uniBalance);
      
      console.log(`Изменение баланса: -${tonDiff.toFixed(6)} TON, +${uniDiff.toFixed(6)} UNI`);
    } else {
      console.log(`\n❌ Ошибка при покупке: ${purchaseResult.message}`);
    }
  } catch (error) {
    console.error('\n❌ Ошибка при выполнении скрипта:', error.message);
  }
}

// Запускаем скрипт
main();