/**
 * Скрипт для тестирования реферальной цепочки для конкретного пользователя
 */

import fetch from 'node-fetch';

// Базовый URL API
const API_BASE_URL = 'https://8ac7b219-438d-4a0b-ab0e-d8b58de37c6d-00-8ncue1micrhz.sisko.replit.dev';

// ID нового пользователя
const USER_ID = 8;

async function callApi(endpoint, method = 'GET', data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`[API Call] ${method} ${url}`);
  if (data) console.log('Data:', data);

  try {
    const response = await fetch(url, options);
    const result = await response.json();
    console.log('Response:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('API Error:', error);
    return { success: false, error: error.message };
  }
}

async function createReferralLink() {
  console.log(`\n=== Создание реферальной связи для пользователя ID=${USER_ID} с пригласителем ID=3 ===`);
  
  const result = await callApi('/api/test/referral/link', 'POST', {
    userId: USER_ID,
    inviterId: 3 // Связываем с пользователем 3, у которого уже есть пригласитель 2
  });
  
  if (result.success) {
    console.log('✅ Успешно создана реферальная связь');
    
    if (result.data.referral && result.data.referral.ref_path) {
      console.log(`📊 ref_path: ${JSON.stringify(result.data.referral.ref_path)}`);
    } else {
      console.log('⚠️ ref_path отсутствует в ответе');
    }
  } else {
    console.error('❌ Ошибка при создании связи:', result.message || 'Неизвестная ошибка');
  }
}

async function checkReferralInfo() {
  console.log(`\n=== Проверка реферальной информации для пользователя ID=${USER_ID} ===`);
  
  const result = await callApi(`/api/test/referral/user/${USER_ID}`);
  
  if (result.success) {
    console.log('✅ Успешно получена информация о пользователе');
    
    if (result.data.hasInviter) {
      console.log(`👤 Пригласитель: ID=${result.data.inviterId}`);
      
      if (result.data.ref_path && result.data.ref_path.length > 0) {
        console.log(`📊 ref_path: [${result.data.ref_path.join(' -> ')}]`);
        console.log(`📏 Глубина цепочки: ${result.data.ref_path.length} уровней`);
      } else {
        console.log('⚠️ ref_path отсутствует или пуст');
      }
    } else {
      console.log('❌ У пользователя нет пригласителя');
    }
  } else {
    console.error('❌ Ошибка при получении информации:', result.message || 'Неизвестная ошибка');
  }
}

// Запуск тестирования
async function main() {
  console.log(`=== ТЕСТ РЕФЕРАЛЬНОЙ ЦЕПОЧКИ ДЛЯ ПОЛЬЗОВАТЕЛЯ ID=${USER_ID} ===\n`);
  
  // Шаг 1: Создаем реферальную связь
  await createReferralLink();
  
  // Шаг 2: Проверяем информацию о реферальной цепочке
  await checkReferralInfo();
}

main().catch(console.error);