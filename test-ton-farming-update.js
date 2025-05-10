/**
 * Скрипт для ручного обновления TON фарминга для тестирования
 */

const fetch = require('node-fetch');

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

  const response = await fetch(`http://localhost:3000${endpoint}`, options);
  return await response.json();
}

async function testTonFarmingUpdate() {
  console.log('====== Тестирование обновления TON фарминга ======');
  
  // 1. Получаем информацию о TON фарминге
  console.log('\n1. Получаем информацию о текущем TON фарминге:');
  const initialInfo = await callApi('/api/ton-farming/info');
  console.log(JSON.stringify(initialInfo, null, 2));
  
  // 2. Обновляем TON фарминг
  console.log('\n2. Вызываем ручное обновление TON фарминга:');
  const updateResult = await callApi('/api/ton-farming/update', 'POST');
  console.log(JSON.stringify(updateResult, null, 2));
  
  // 3. Проверяем обновленную информацию
  console.log('\n3. Проверяем обновленную информацию TON фарминга:');
  const updatedInfo = await callApi('/api/ton-farming/info');
  console.log(JSON.stringify(updatedInfo, null, 2));
  
  // 4. Проверяем депозиты
  console.log('\n4. Проверяем депозиты TON Boost:');
  const deposits = await callApi('/api/ton-farming/active');
  console.log(JSON.stringify(deposits, null, 2));
}

testTonFarmingUpdate()
  .then(() => console.log('\nТестирование завершено успешно'))
  .catch(error => console.error('\nОшибка при тестировании:', error));