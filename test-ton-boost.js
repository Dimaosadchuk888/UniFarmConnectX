/**
 * Скрипт для тестирования функциональности TON Boost пакетов
 */

import fetch from 'node-fetch';

// Базовый URL API
const API_BASE_URL = 'https://93cb0060-75d7-4281-ac65-b204cda864a4-00-1j7bpbfst9vfx.pike.replit.dev';

// Заголовки для авторизации
const API_HEADERS = {
  'Content-Type': 'application/json',
  'X-Development-Mode': 'true',
  'X-Development-User-Id': '1'
};

// 1. Получаем список доступных TON буст-пакетов
async function getBoostPackages() {
  console.log('🔍 Получение списка доступных TON Boost пакетов...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/ton-boosts`, {
      method: 'GET',
      headers: API_HEADERS
    });
    
    const data = await response.json();
    console.log('✅ Получен список TON Boost пакетов:', JSON.stringify(data, null, 2));
    return data.data || [];
  } catch (error) {
    console.error('❌ Ошибка при получении списка TON Boost пакетов:', error);
    return [];
  }
}

// 2. Покупаем TON буст-пакет
async function purchaseBoostPackage(boostId) {
  console.log(`🛒 Покупка TON Boost пакета с ID=${boostId}...`);
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/ton-boosts/purchase`, {
      method: 'POST',
      headers: API_HEADERS,
      body: JSON.stringify({
        user_id: 1,
        boost_id: boostId,
        payment_method: 'internal_balance'
      })
    });
    
    const data = await response.json();
    console.log('✅ Результат покупки TON Boost пакета:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('❌ Ошибка при покупке TON Boost пакета:', error);
    return { success: false, error: error.message };
  }
}

// 3. Получаем активные TON Boost пакеты пользователя
async function getUserActiveBoosts() {
  console.log('🔍 Получение активных TON Boost пакетов пользователя...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/ton-boosts/active?user_id=1`, {
      method: 'GET',
      headers: API_HEADERS
    });
    
    const data = await response.json();
    console.log('✅ Активные TON Boost пакеты:', JSON.stringify(data, null, 2));
    return data.data || [];
  } catch (error) {
    console.error('❌ Ошибка при получении активных TON Boost пакетов:', error);
    return [];
  }
}

// 4. Получаем информацию о TON фарминге пользователя
async function getTonFarmingInfo() {
  console.log('🔍 Получение информации о TON фарминге пользователя...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/ton-farming/info?user_id=1`, {
      method: 'GET',
      headers: API_HEADERS
    });
    
    const data = await response.json();
    console.log('✅ Информация о TON фарминге:', JSON.stringify(data, null, 2));
    return data.data || {};
  } catch (error) {
    console.error('❌ Ошибка при получении информации о TON фарминге:', error);
    return {};
  }
}

// 5. Получаем баланс пользователя
async function getUserBalance() {
  console.log('🔍 Получение баланса пользователя...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/1`, {
      method: 'GET',
      headers: API_HEADERS
    });
    
    const data = await response.json();
    console.log('✅ Баланс пользователя:', JSON.stringify(data.data.balance, null, 2));
    return data.data.balance || {};
  } catch (error) {
    console.error('❌ Ошибка при получении баланса пользователя:', error);
    return {};
  }
}

// Основная функция для тестирования TON Boost
async function testTonBoost() {
  try {
    console.log('🚀 Начало тестирования TON Boost функциональности\n');
    
    // 1. Получаем список доступных буст-пакетов
    const boostPackages = await getBoostPackages();
    if (!boostPackages.length) {
      throw new Error('Не удалось получить список буст-пакетов');
    }
    
    // Выбираем самый дешевый буст-пакет
    const smallestBoost = boostPackages.sort((a, b) => 
      parseFloat(a.priceTon) - parseFloat(b.priceTon)
    )[0];
    
    console.log(`\n📦 Выбран буст-пакет "${smallestBoost.name}" за ${smallestBoost.priceTon} TON\n`);
    
    // 2. Проверяем текущий баланс пользователя
    const initialBalance = await getUserBalance();
    console.log(`\n💰 Текущий TON баланс: ${initialBalance.ton}\n`);
    
    // 3. Покупаем буст-пакет с внутреннего баланса
    const purchaseResult = await purchaseBoostPackage(smallestBoost.id);
    
    if (!purchaseResult.success) {
      throw new Error(`Не удалось купить буст-пакет: ${purchaseResult.message}`);
    }
    
    console.log('\n✅ Буст-пакет успешно куплен\n');
    
    // 4. Проверяем обновлённый баланс пользователя
    const updatedBalance = await getUserBalance();
    console.log(`\n💰 Обновлённый TON баланс: ${updatedBalance.ton}\n`);
    
    // 5. Проверяем активные буст-пакеты пользователя
    const activeBoosts = await getUserActiveBoosts();
    
    if (!activeBoosts.length) {
      throw new Error('Не найдены активные буст-пакеты после покупки');
    }
    
    console.log(`\n📋 Найдено ${activeBoosts.length} активных буст-пакетов\n`);
    
    // 6. Получаем информацию о TON фарминге 
    const farmingInfo = await getTonFarmingInfo();
    
    console.log('\n🚀 Тестирование TON Boost успешно завершено!\n');
  } catch (error) {
    console.error(`❌ Ошибка при тестировании TON Boost: ${error.message}`);
  }
}

// Запускаем тестирование
testTonBoost();