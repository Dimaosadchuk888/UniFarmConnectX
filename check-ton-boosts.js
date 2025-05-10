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
  
  const response = await fetch(`${API_URL}/api/ton-farming/active?user_id=${TEST_USER_ID}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-development-mode': 'true',
      'x-development-user-id': TEST_USER_ID.toString(),
      'x-telegram-user-id': TEST_USER_ID.toString()
    }
  });
  
  const data = await response.json();
  
  console.log('Ответ от API:', JSON.stringify(data, null, 2));
  
  if (!data.success) {
    console.error('❌ Ошибка при получении активных TON Boost-пакетов:', data.error || 'Неизвестная ошибка');
    return null;
  }
  
  console.log(`Найдено ${data.data.length} активных TON Boost-пакетов:`);
  data.data.forEach(boost => {
    console.log(`ID: ${boost.id}, Тип: ${boost.boost_type || boost.boostId}, Дата начала: ${boost.start_date || boost.startDate}`);
    console.log(`Сумма депозита: ${boost.deposit_amount || boost.depositAmount} TON, Ставка: ${boost.rate_per_day || boost.ratePerDay}% в день`);
    console.log('---');
  });
  
  return data.data;
}

/**
 * Получает список доступных TON Boost-пакетов
 */
async function getAvailableBoostPackages() {
  console.log('Получение списка доступных TON Boost-пакетов...');
  
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
}

/**
 * Получает баланс пользователя
 */
async function getUserBalance() {
  console.log('Получение баланса пользователя...');
  
  const response = await fetch(`${API_URL}/api/users/${TEST_USER_ID}/balance`, {
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
    console.error('❌ Ошибка при получении баланса:', data.error || 'Неизвестная ошибка');
    return null;
  }
  
  console.log(`Текущий баланс: ${data.data.ton || 'N/A'} TON, ${data.data.uni || 'N/A'} UNI`);
  return data.data;
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