#!/usr/bin/env node

/**
 * Скрипт для проверки статуса и работы TON Boost пакетов
 */

import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Конфигурация
const API_URL = 'https://93cb0060-75d7-4281-ac65-b204cda864a4-00-1j7bpbfst9vfx.pike.replit.dev';
const TEST_USER_ID = 1;

/**
 * Получает список активных TON Boost-ов пользователя
 */
async function getActiveBoosts() {
  console.log('Получение списка активных TON Boost-пакетов...');
  
  try {
    const response = await fetch(`${API_URL}/api/ton-farming/active?user_id=${TEST_USER_ID}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-development-mode': 'true',
        'x-development-user-id': TEST_USER_ID.toString(),
        'x-telegram-user-id': TEST_USER_ID.toString()
      }
    });
    
    if (!response.ok) {
      console.error(`❌ Ошибка HTTP: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('❌ Неверный формат JSON ответа:', text.substring(0, 100) + '...');
      return null;
    }
    
    console.log('Ответ от API:', JSON.stringify(data, null, 2));
    
    if (!data.success) {
      console.error('❌ Ошибка при получении активных TON Boost-пакетов:', data.error || 'Неизвестная ошибка');
      return null;
    }
    
    console.log(`Найдено ${data.data.length} активных TON Boost-пакетов:`);
    data.data.forEach(boost => {
      console.log(`ID: ${boost.id}, Сумма TON: ${boost.ton_amount}, Бонус UNI: ${boost.bonus_uni}`);
      console.log(`Дата создания: ${boost.created_at}, Последнее обновление: ${boost.last_updated_at}`);
      console.log(`Ставка TON: ${parseFloat(boost.rate_ton_per_second) * 86400 * 100}% в день, Ставка UNI: ${parseFloat(boost.rate_uni_per_second) * 86400 * 100}% в день`);
      console.log('---');
    });
    
    return data.data;
  } catch (error) {
    console.error('❌ Ошибка при запросе активных TON Boost:', error.message);
    return null;
  }
}

/**
 * Получает список доступных TON Boost-пакетов
 */
async function getAvailableBoostPackages() {
  console.log('Получение списка доступных TON Boost-пакетов...');
  
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
    
    if (!response.ok) {
      console.error(`❌ Ошибка HTTP: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('❌ Неверный формат JSON ответа:', text.substring(0, 100) + '...');
      return null;
    }
    
    if (!data.success) {
      console.error('❌ Ошибка при получении списка TON Boost-пакетов:', data.error || 'Неизвестная ошибка');
      return null;
    }
    
    console.log('Доступные TON Boost-пакеты:');
    data.data.forEach(boost => {
      console.log(`ID: ${boost.id}, Название: ${boost.name}, Цена: ${boost.priceTon} TON, UNI бонус: ${boost.bonusUni}`);
      console.log(`Ставка: ${boost.rateTon}% TON в день, ${boost.rateUni}% UNI в день`);
      console.log('---');
    });
    
    return data.data;
  } catch (error) {
    console.error('❌ Ошибка при запросе доступных TON Boost:', error.message);
    return null;
  }
}

/**
 * Получает баланс пользователя
 */
async function getUserBalance() {
  console.log('Получение баланса пользователя...');
  
  try {
    const response = await fetch(`${API_URL}/api/balance?user_id=${TEST_USER_ID}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-development-mode': 'true',
        'x-development-user-id': TEST_USER_ID.toString(),
        'x-telegram-user-id': TEST_USER_ID.toString()
      }
    });
    
    if (!response.ok) {
      console.error(`❌ Ошибка HTTP: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('❌ Неверный формат JSON ответа:', text.substring(0, 100) + '...');
      return null;
    }
    
    if (!data.success) {
      console.error('❌ Ошибка при получении баланса:', data.error || 'Неизвестная ошибка');
      return null;
    }
    
    console.log(`Текущий баланс: ${data.data.ton || 'N/A'} TON, ${data.data.uni || 'N/A'} UNI`);
    return data.data;
  } catch (error) {
    console.error('❌ Ошибка при запросе баланса:', error.message);
    return null;
  }
}

/**
 * Запуск проверки TON Boost
 */
async function main() {
  try {
    console.log('=== Проверка TON Boost функциональности ===\n');
    
    // Получение баланса до проверки
    const initialBalance = await getUserBalance();
    
    // Получение доступных TON Boost-пакетов
    const boostPackages = await getAvailableBoostPackages();
    
    // Получение активных TON Boost-ов пользователя
    const activeBoosts = await getActiveBoosts();
    
    console.log('\n=== Результаты проверки TON Boost ===');
    console.log(`Доступные пакеты: ${boostPackages ? boostPackages.length : 0}`);
    console.log(`Активные бусты: ${activeBoosts ? activeBoosts.length : 0}`);
    console.log(`Баланс пользователя: ${initialBalance ? initialBalance.ton : 'N/A'} TON, ${initialBalance ? initialBalance.uni : 'N/A'} UNI`);
    
    if (activeBoosts && activeBoosts.length > 0) {
      console.log('\n✅ TON Boost система работает корректно!');
    } else {
      console.log('\n⚠️ У пользователя нет активных TON Boost депозитов, но это не обязательно означает ошибку.');
      console.log('Попробуйте запустить test-ton-boost-purchase.js для покупки TON Boost пакета.');
    }
    
  } catch (error) {
    console.error('❌ Ошибка при проверке TON Boost:', error);
  }
}

main();