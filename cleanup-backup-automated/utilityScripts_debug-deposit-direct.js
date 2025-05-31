/**
 * Отладочный скрипт для выявления проблемы с депозитом в фарминге
 * Проверяет отправку amount как строки и числа
 */

import fetch from 'node-fetch';

async function testDeposit() {
  // Строковый формат (как работает в production)
  const dataWithStringAmount = {
    amount: "5",
    user_id: 1
  };
  
  // Числовой формат (проблемный в production)
  const dataWithNumberAmount = {
    amount: 5,
    user_id: 1
  };
  
  // Получаем базовый URL из окружения
  const baseUrl = process.env.BASE_URL || 'https://uni-farm-connect-xo-osadchukdmitro2.replit.appsisko.replit.dev';
  const endpoint = '/api/uni-farming/deposit';
  const url = `${baseUrl}${endpoint}`;
  
  console.log('=== ТЕСТ 1: amount как строка ===');
  console.log('URL запроса:', url);
  console.log('Отправляемые данные:', JSON.stringify(dataWithStringAmount));
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(dataWithStringAmount)
    });
    
    console.log('Статус ответа:', response.status, response.statusText);
    
    // Получаем ответ в виде текста сначала
    const responseText = await response.text();
    console.log('Текстовый ответ:', responseText);
    
    // Затем пробуем распарсить его как JSON
    try {
      const data = JSON.parse(responseText);
      console.log('JSON успешно распарсен:', data);
    } catch (e) {
      console.log('Ошибка парсинга JSON:', e.message);
      console.log('Не является валидным JSON');
    }
  } catch (error) {
    console.error('Ошибка запроса:', error);
  }
  
  console.log('\n=== ТЕСТ 2: amount как число ===');
  console.log('URL запроса:', url);
  console.log('Отправляемые данные:', JSON.stringify(dataWithNumberAmount));
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(dataWithNumberAmount)
    });
    
    console.log('Статус ответа:', response.status, response.statusText);
    
    // Получаем ответ в виде текста сначала
    const responseText = await response.text();
    console.log('Текстовый ответ:', responseText);
    
    // Затем пробуем распарсить его как JSON
    try {
      const data = JSON.parse(responseText);
      console.log('JSON успешно распарсен:', data);
    } catch (e) {
      console.log('Ошибка парсинга JSON:', e.message);
      console.log('Не является валидным JSON');
    }
  } catch (error) {
    console.error('Ошибка запроса:', error);
  }
}

// Запускаем тест
testDeposit().catch(console.error);