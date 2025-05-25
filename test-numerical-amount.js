import fetch from 'node-fetch';

/**
 * Тестирует API для активации фарминга с числовым значением amount
 */
async function testFarmingDepositWithNumberAmount() {
  try {
    // Тестируем локальный и production URL
    const urls = [
      'https://uni-farm-connect-x-lukyanenkolawfa.replit.appsisko.replit.dev',
      'https://uni-farm-connect-2-misterxuniverse.replit.app'
    ];
    
    for (const baseUrl of urls) {
      console.log(`\n----- Тестирование ${baseUrl} с числовым amount -----`);
      const endpoint = '/api/uni-farming/deposit';
      
      // Тело запроса с amount как числом
      const requestBody = {
        amount: 5, // Числовое значение, не строка!
        user_id: 1
      };
      
      console.log('Тело запроса:', JSON.stringify(requestBody));
      
      // Выполняем запрос
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log(`Статус ответа: ${response.status} ${response.statusText}`);
      
      for (const [key, value] of response.headers.entries()) {
        console.log(`  ${key}: ${value}`);
      }
      
      // Получаем текст ответа
      const responseText = await response.text();
      console.log('\nТело ответа (текст):', responseText);
      
      // Пытаемся распарсить как JSON
      try {
        const jsonResponse = JSON.parse(responseText);
        console.log('Тело ответа (JSON):', JSON.stringify(jsonResponse, null, 2));
        console.log('✅ JSON валидный!');
      } catch (parseError) {
        console.error('❌ Ошибка парсинга JSON:', parseError.message);
        
        // Детальный анализ ответа для выявления проблем
        console.log('\n🔍 Анализ ответа:');
        console.log('Длина ответа:', responseText.length, 'символов');
        
        if (responseText.length === 0) {
          console.error('  - Пустой ответ');
        } else {
          console.log('  - Первые 100 символов:', JSON.stringify(responseText.substring(0, 100)));
          console.log('  - Последние 100 символов:', JSON.stringify(responseText.substring(responseText.length - 100)));
          
          // Проверка на наличие HTML в ответе
          if (responseText.includes('<html') || responseText.includes('<!DOCTYPE')) {
            console.error('  - Ответ содержит HTML вместо JSON');
          }
          
          // Проверка на невидимые символы или BOM
          const hasInvisibleChars = /[\u0000-\u001F\u007F-\u009F\uFEFF]/.test(responseText);
          if (hasInvisibleChars) {
            console.error('  - Ответ содержит невидимые символы или BOM');
          }
          
          // Проверка на множество ответов
          if (responseText.includes('}{')) {
            console.error('  - Обнаружено несколько объектов JSON в одном ответе');
          }
        }
      }
    }
  } catch (error) {
    console.error('Ошибка при выполнении запроса:', error);
  }
}

// Запускаем тест
testFarmingDepositWithNumberAmount();