import fetch from 'node-fetch';

/**
 * Тестирует API для получения информации о фарминге
 */
async function testFarmingHarvest() {
  try {
    const baseUrl = 'https://8ac7b219-438d-4a0b-ab0e-d8b58de37c6d-00-8ncue1micrhz.sisko.replit.dev';
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