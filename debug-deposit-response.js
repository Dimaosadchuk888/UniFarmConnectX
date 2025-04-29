/**
 * Отладочный скрипт для проверки ответа API на запрос депозита
 * Выполняет запрос и детально анализирует ответ сервера
 */

const fetch = require('node-fetch');

async function testDeposit() {
  const url = 'https://8ac7b219-438d-4a0b-ab0e-d8b58de37c6d-00-8ncue1micrhz.sisko.replit.dev/api/uni-farming/deposit';
  const requestBody = {
    amount: '5',
    user_id: 1
  };
  
  console.log('Отправка POST запроса на', url);
  console.log('Тело запроса:', JSON.stringify(requestBody));
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('Статус ответа:', response.status, response.statusText);
    console.log('Заголовки ответа:');
    const headers = {};
    response.headers.forEach((value, name) => {
      headers[name] = value;
    });
    console.log(JSON.stringify(headers, null, 2));
    
    // Получаем ответ в виде текста
    const responseText = await response.text();
    console.log('\nТекст ответа:');
    console.log(responseText);
    console.log('\nДлина текста ответа:', responseText.length, 'символов');
    
    // Проверяем, является ли ответ валидным JSON
    try {
      const responseJson = JSON.parse(responseText);
      console.log('\nJSON ответ:');
      console.log(JSON.stringify(responseJson, null, 2));
      console.log('\n✅ Ответ является валидным JSON');
      
      // Проверяем структуру ответа
      if (responseJson.success !== undefined) {
        console.log('✅ Ответ содержит поле success:', responseJson.success);
      } else {
        console.log('❌ Ответ НЕ содержит поле success');
      }
      
      if (responseJson.data !== undefined) {
        console.log('✅ Ответ содержит поле data');
        console.log('Структура data:', Object.keys(responseJson.data).join(', '));
      } else {
        console.log('❌ Ответ НЕ содержит поле data');
      }
    } catch (jsonError) {
      console.log('\n❌ Ответ НЕ является валидным JSON');
      console.log('Ошибка парсинга JSON:', jsonError.message);
      
      // Вывод частей ответа для анализа
      console.log('\nАнализ текста ответа:');
      console.log('Первые 50 символов:', responseText.substring(0, 50));
      console.log('Последние 50 символов:', responseText.substring(responseText.length - 50));
      
      // Проверка на HTML
      if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html')) {
        console.log('⚠️ Ответ содержит HTML разметку');
      }
      
      // Проверка на простой текст
      if (!responseText.includes('{') && !responseText.includes('<')) {
        console.log('⚠️ Ответ является простым текстом без JSON или HTML структуры');
      }
    }
  } catch (error) {
    console.error('Ошибка запроса:', error);
  }
}

testDeposit();