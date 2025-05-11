import fetch from 'node-fetch';

/**
 * Тестирует API для получения информации о фарминге
 * Обновлено: использует текущий домен Replit
 */
async function testFarmingHarvest() {
  try {
    const baseUrl = 'https://93cb0060-75d7-4281-ac65-b204cda864a4-00-1j7bpbfst9vfx.pike.replit.dev';
    const endpoint = '/api/uni-farming/harvest';
    const url = `${baseUrl}${endpoint}`;
    
    console.log(`Отправка POST запроса на ${url}`);
    
    // Тело запроса с обязательным user_id
    const requestBody = {
      user_id: 1
    };
    
    console.log('Тело запроса:', JSON.stringify(requestBody));
    
    // Выполняем запрос
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log(`Статус ответа: ${response.status} ${response.statusText}`);
    console.log('Заголовки ответа:', response.headers.raw());
    
    // Получаем тело ответа
    const responseText = await response.text();
    console.log('Тело ответа (текст):', responseText);
    
    if (responseText) {
      try {
        const responseJson = JSON.parse(responseText);
        console.log('Тело ответа (JSON):', JSON.stringify(responseJson, null, 2));
      } catch (error) {
        console.error('Ошибка парсинга JSON:', error);
      }
    } else {
      console.log('Получен пустой ответ от сервера');
    }
    
  } catch (error) {
    console.error('Ошибка при выполнении запроса:', error);
  }
}

// Запускаем тест
testFarmingHarvest();