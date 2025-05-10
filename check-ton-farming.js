/**
 * Скрипт для проверки начислений TON фарминга
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

// Получаем информацию о TON фарминге пользователя
async function getTonFarmingInfo() {
  console.log('🔍 Получение информации о TON фарминге пользователя...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/ton-farming/info?user_id=1`, {
      method: 'GET',
      headers: API_HEADERS
    });
    
    const data = await response.json();
    console.log('✅ Информация о TON фарминге:');
    console.log(`- Скорость начисления TON: ${data.data.totalTonRatePerSecond} TON/сек`);
    console.log(`- Скорость начисления UNI: ${data.data.totalUniRatePerSecond} UNI/сек`);
    console.log(`- Дневная доходность TON: ${data.data.dailyIncomeTon} TON`);
    console.log(`- Дневная доходность UNI: ${data.data.dailyIncomeUni} UNI`);
    console.log(`- Количество активных буст-депозитов: ${data.data.deposits.length}`);
    
    // Выводим информацию о каждом буст-депозите
    if (data.data.deposits.length > 0) {
      console.log('\n📋 Информация о буст-депозитах:');
      
      for (const deposit of data.data.deposits) {
        const now = new Date();
        const createdAt = new Date(deposit.created_at);
        const lastUpdatedAt = new Date(deposit.last_updated_at);
        
        const ageInSeconds = Math.floor((now - createdAt) / 1000);
        const timeSinceLastUpdateInSeconds = Math.floor((now - lastUpdatedAt) / 1000);
        
        const estimatedAccumulatedTon = parseFloat(deposit.rate_ton_per_second) * timeSinceLastUpdateInSeconds;
        
        console.log(`\n- Депозит ID: ${deposit.id}`);
        console.log(`  Сумма: ${deposit.ton_amount} TON`);
        console.log(`  Скорость TON: ${deposit.rate_ton_per_second} TON/сек`);
        console.log(`  Скорость UNI: ${deposit.rate_uni_per_second} UNI/сек`);
        console.log(`  Накоплено TON: ${deposit.accumulated_ton}`);
        console.log(`  Возраст депозита: ${ageInSeconds} сек (${Math.floor(ageInSeconds / 60)} мин)`);
        console.log(`  Время с последнего обновления: ${timeSinceLastUpdateInSeconds} сек (${Math.floor(timeSinceLastUpdateInSeconds / 60)} мин)`);
        console.log(`  Ожидаемое накопление с момента последнего обновления: ~${estimatedAccumulatedTon.toFixed(10)} TON`);
      }
    }
    
    return data.data;
  } catch (error) {
    console.error('❌ Ошибка при получении информации о TON фарминге:', error);
    return {};
  }
}

// Собираем награду с TON фарминга
async function harvestTonFarming() {
  console.log('\n💰 Сбор наград с TON фарминга...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/ton-farming/harvest`, {
      method: 'POST',
      headers: API_HEADERS,
      body: JSON.stringify({ user_id: 1 })
    });
    
    const data = await response.json();
    console.log('✅ Результат сбора:');
    console.log(`- Успех: ${data.success}`);
    console.log(`- Сообщение: ${data.message}`);
    
    if (data.data) {
      console.log(`- Собрано TON: ${data.data.harvestedTon}`);
      if (data.data.harvestedUni) {
        console.log(`- Собрано UNI: ${data.data.harvestedUni}`);
      }
      if (data.data.transactionId) {
        console.log(`- ID транзакции: ${data.data.transactionId}`);
      }
    }
    
    return data;
  } catch (error) {
    console.error('❌ Ошибка при сборе наград с TON фарминга:', error);
    return { success: false, error: error.message };
  }
}

// Основная функция для проверки TON фарминга
async function checkTonFarming() {
  try {
    console.log('🚀 Проверка состояния TON фарминга\n');
    
    // Запрашиваем текущее состояние TON фарминга
    await getTonFarmingInfo();
    
    // Небольшая пауза для наглядности
    console.log('\n⏳ Ожидание 5 секунд для накопления вознаграждения...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Смотрим обновленное состояние
    console.log('🔄 Проверка обновленного состояния TON фарминга:');
    await getTonFarmingInfo();
    
    // Собираем награду, если она есть
    await harvestTonFarming();
    
    // Проверяем состояние после сбора награды
    console.log('\n🔍 Проверка состояния после сбора награды:');
    await getTonFarmingInfo();
    
    console.log('\n✅ Проверка TON фарминга завершена!');
  } catch (error) {
    console.error('\n❌ Ошибка при проверке TON фарминга:', error);
  }
}

// Запускаем проверку
checkTonFarming();