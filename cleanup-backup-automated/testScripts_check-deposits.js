/**
 * Отладочный скрипт для проверки получения депозитов UNI фарминга
 */
import fetch from 'node-fetch';

async function testFetchDeposits() {
  const baseUrl = 'https://uni-farm-connect-xo-osadchukdmitro2.replit.appsisko.replit.dev';
  const endpoint = '/api/uni-farming/deposits?user_id=1';
  
  console.log(`Отправка GET запроса на ${baseUrl}${endpoint}`);
  
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    console.log(`Статус ответа: ${response.status} ${response.statusText}`);
    console.log('Заголовки ответа:', response.headers.raw());
    
    const text = await response.text();
    console.log('Тело ответа (текст):', text);
    
    try {
      const json = JSON.parse(text);
      console.log('Тело ответа (JSON):', JSON.stringify(json, null, 2));
    } catch (e) {
      console.error('Ошибка парсинга JSON:', e.message);
    }
  } catch (error) {
    console.error('Ошибка выполнения запроса:', error);
  }
}

testFetchDeposits();