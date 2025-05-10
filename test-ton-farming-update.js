/**
 * Скрипт для ручного обновления TON фарминга для тестирования
 */

import fetch from 'node-fetch';

async function callApi(endpoint, method = 'GET', body = null) {
  const headers = {
    'Content-Type': 'application/json',
    'x-development-mode': 'true',  // Для режима разработки
    'x-development-user-id': '1',  // ID тестового пользователя
    'x-telegram-user-id': '1'      // ID тестового пользователя в Telegram
  };

  const options = {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  };

  // Получаем URL из окружения или используем localhost
  const baseUrl = process.env.REPLIT_URL || 'http://localhost:3000';
  const response = await fetch(`${baseUrl}${endpoint}`, options);
  return await response.json();
}

async function checkAccumulatedTon() {
  console.log('\nПроверяем накопленный TON в депозитах:');
  
  try {
    const baseUrl = process.env.REPLIT_URL || 'http://localhost:3000';
    const query = `
      SELECT 
        id, 
        user_id, 
        ton_amount, 
        rate_ton_per_second, 
        accumulated_ton,
        is_active,
        created_at,
        last_updated_at
      FROM ton_boost_deposits 
      ORDER BY created_at DESC;
    `;
    
    const response = await fetch(`${baseUrl}/api/db/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-development-mode': 'true',
        'x-development-user-id': '1',
        'x-telegram-user-id': '1'
      },
      body: JSON.stringify({ query })
    });
    
    const result = await response.json();
    console.log(JSON.stringify(result.data, null, 2));
    return result.data;
  } catch (error) {
    console.log('Ошибка при получении данных из БД:', error);
    return [];
  }
}

async function testTonFarmingUpdate() {
  console.log('====== Тестирование обновления TON фарминга ======');
  
  // 1. Получаем информацию о TON фарминге
  console.log('\n1. Получаем информацию о текущем TON фарминге:');
  const initialInfo = await callApi('/api/ton-farming/info');
  console.log(JSON.stringify(initialInfo, null, 2));
  
  // 2. Проверяем депозиты TON Boost
  console.log('\n2. Проверяем депозиты TON Boost:');
  const deposits = await callApi('/api/ton-farming/active');
  console.log(JSON.stringify(deposits, null, 2));
  
  // 3. Проверяем данные о накопленном TON в базе данных
  console.log('\n3. Проверяем накопленный TON в базе данных:');
  await checkAccumulatedTon();
  
  // 4. Обновляем TON фарминг
  console.log('\n4. Вызываем ручное обновление TON фарминга:');
  const updateResult = await callApi('/api/ton-farming/update', 'POST');
  console.log(JSON.stringify(updateResult, null, 2));
  
  // 5. Проверяем обновленную информацию
  console.log('\n5. Проверяем обновленную информацию TON фарминга:');
  const updatedInfo = await callApi('/api/ton-farming/info');
  console.log(JSON.stringify(updatedInfo, null, 2));
  
  // 6. Проверяем обновленные данные о накопленном TON в базе данных
  console.log('\n6. Проверяем накопленный TON в базе данных после обновления:');
  await checkAccumulatedTon();
  
  // 7. Собираем заработанные TON
  console.log('\n7. Собираем заработанные TON:');
  const harvestResult = await callApi('/api/ton-farming/harvest', 'POST');
  console.log(JSON.stringify(harvestResult, null, 2));
  
  // 8. Проверяем финальную информацию после сбора
  console.log('\n8. Проверяем финальную информацию после сбора:');
  const finalInfo = await callApi('/api/ton-farming/info');
  console.log(JSON.stringify(finalInfo, null, 2));
  
  // 9. Проверяем данные о накопленном TON в базе данных после сбора
  console.log('\n9. Проверяем накопленный TON в базе данных после сбора:');
  await checkAccumulatedTon();
}

// Выполняем тестирование
testTonFarmingUpdate()
  .then(() => console.log('\nТестирование завершено успешно'))
  .catch(error => console.error('\nОшибка при тестировании:', error));