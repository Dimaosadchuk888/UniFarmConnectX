/**
 * Тестовый скрипт для проверки работы fixRequestBody
 * 
 * Выполняет запрос к production API с числовым значением amount,
 * но использует функцию fixRequestBody для исправления
 * типов данных перед отправкой
 */

const { default: fetch } = require('node-fetch');

// Копия функции fixRequestBody из client/src/lib/apiFix.ts
function fixRequestBody(body) {
  if (body && typeof body === 'object') {
    // Если тело запроса содержит поле 'amount' и оно числовое, преобразуем его в строку
    if ('amount' in body && typeof body.amount === 'number') {
      console.log(`Преобразуем числовое amount=${body.amount} в строку`);
      return {
        ...body,
        amount: String(body.amount)
      };
    }
  }
  return body;
}

/**
 * Тестирует API для активации фарминга с исправлением типов
 */
async function testFarmingDepositWithFixedAmount() {
  // Изначальные данные с числовым amount
  let requestBody = {
    amount: 5,  // Числовое значение
    user_id: 1  // ID пользователя
  };
  
  console.log(`----- Тестирование production API с исправлением типов -----`);
  console.log(`Исходное тело запроса:`, requestBody);
  
  // Применяем fixRequestBody для исправления типов
  requestBody = fixRequestBody(requestBody);
  console.log(`Исправленное тело запроса:`, requestBody);
  
  // URL для production
  const url = 'https://uni-farm-connect-2-misterxuniverse.replit.app/api/uni-farming/deposit';
  
  try {
    // Отправляем запрос с исправленными данными
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    // Выводим статус ответа и заголовки
    console.log(`Статус ответа: ${response.status} ${response.statusText}`);
    
    // Получаем ответ как текст
    const responseText = await response.text();
    console.log(`Тело ответа (текст): ${responseText}`);
    
    // Пробуем распарсить JSON
    try {
      const responseJson = JSON.parse(responseText);
      console.log(`Тело ответа (JSON):`, JSON.stringify(responseJson, null, 2));
      console.log(`✅ JSON валидный!`);
    } catch (e) {
      console.log(`❌ Ответ не является валидным JSON: ${e.message}`);
    }
  } catch (error) {
    console.error(`❌ Ошибка при отправке запроса: ${error.message}`);
  }
}

// Выполняем тестирование
testFarmingDepositWithFixedAmount();