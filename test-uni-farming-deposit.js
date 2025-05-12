import fetch from 'node-fetch';

// Функция для тестирования API-запросов
async function testUniFarmingDeposit() {
  try {
    console.log('Тестируем создание UNI-фарминг депозита...');
    
    // API URL
    const apiUrl = 'https://93cb0060-75d7-4281-ac65-b204cda864a4-00-1j7bpbfst9vfx.pike.replit.dev:3000/api/new-uni-farming/deposit';
    
    // Данные запроса
    const requestData = {
      amount: 100
    };
    
    // Заголовки запроса
    const headers = {
      'Content-Type': 'application/json',
      'X-Development-Mode': 'true',
      'X-Development-User-Id': '1'
    };
    
    // Отправляем запрос
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestData)
    });
    
    // Получаем и выводим результат
    const responseData = await response.json();
    console.log('Статус ответа:', response.status);
    console.log('Ответ API:', JSON.stringify(responseData, null, 2));
    
    // Проверка баланса пользователя после создания депозита
    if (response.status === 200 && responseData.success) {
      const userResponse = await fetch('https://93cb0060-75d7-4281-ac65-b204cda864a4-00-1j7bpbfst9vfx.pike.replit.dev:3000/api/me', {
        headers: headers
      });
      
      const userData = await userResponse.json();
      console.log('Баланс пользователя после создания депозита:', userData.data.balance_uni);
    }
    
    return responseData;
  } catch (error) {
    console.error('Ошибка при тестировании API:', error);
    return { success: false, error: error.message };
  }
}

// Запускаем тест
testUniFarmingDeposit().then(result => {
  console.log('Тестирование завершено!');
  if (!result.success) {
    console.error('Тест завершился с ошибкой:', result.error || 'Неизвестная ошибка');
    process.exit(1);
  }
  process.exit(0);
});