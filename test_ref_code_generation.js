/**
 * Скрипт для тестирования функциональности генерации и фиксации ref_code
 * 
 * Этот скрипт демонстрирует:
 * 1. Генерацию новых пользователей с автоматически созданными ref_code
 * 2. Проверку уникальности сгенерированных кодов
 * 3. Создание пользователя с уже существующим ref_code и проверку автоматической генерации нового
 */

import fetch from 'node-fetch';
import crypto from 'crypto';

// Функция для отправки запросов к API
async function callApi(endpoint, method = 'GET', data = null) {
  const url = `https://8ac7b219-438d-4a0b-ab0e-d8b58de37c6d-00-8ncue1micrhz.sisko.replit.dev/api${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  let responseData;
  
  try {
    // Получаем текст ответа для анализа
    const responseText = await response.text();
    
    // Если ответ - это HTML-страница, выводим часть содержимого для диагностики
    if (responseText.startsWith('<!DOCTYPE') || responseText.startsWith('<html')) {
      console.error('Получен HTML вместо JSON. Первые 100 символов ответа:');
      console.error(responseText.substring(0, 100));
      
      // Возвращаем ошибку в структурированном виде
      return {
        status: response.status,
        data: { error: 'HTML response instead of JSON', htmlSnippet: responseText.substring(0, 100) }
      };
    }
    
    // Пытаемся разобрать JSON
    responseData = JSON.parse(responseText);
  } catch (error) {
    console.error('Ошибка при обработке ответа:', error.message);
    
    return {
      status: response.status,
      data: { error: `Failed to parse response: ${error.message}` }
    };
  }
  
  return {
    status: response.status,
    data: responseData
  };
}

// Генерирует уникальный guest_id для тестирования
function generateTestGuestId() {
  return crypto.randomUUID();
}

// Создает тестового пользователя через API
async function createTestUser(guestId, username = null, refCode = null) {
  const userData = {
    guest_id: guestId,
    username: username || `test_user_${guestId.substring(0, 8)}`
  };
  
  // Добавляем refCode только если он указан
  if (refCode) {
    userData.ref_code = refCode;
  }
  
  return await callApi('/users', 'POST', userData);
}

// Получает пользователя по guest_id
async function getUserByGuestId(guestId) {
  return await callApi(`/users/guest/${guestId}`, 'GET');
}

// Основная функция тестирования
async function testRefCodeGeneration() {
  console.log('=== Начало тестирования генерации и фиксации ref_code ===');
  
  // Шаг 1: Создаем пользователя без указания ref_code, проверяем автоматическую генерацию
  const guestId1 = generateTestGuestId();
  console.log(`\n1. Создаем пользователя с guest_id ${guestId1} БЕЗ указания ref_code...`);
  const user1Response = await createTestUser(guestId1);
  
  if (user1Response.status !== 200) {
    console.error(`❌ Ошибка при создании пользователя: ${JSON.stringify(user1Response.data)}`);
    return;
  }
  
  console.log(`✅ Пользователь успешно создан!`);
  console.log(`  - ID: ${user1Response.data.id}`);
  console.log(`  - guest_id: ${user1Response.data.guest_id}`);
  console.log(`  - ref_code: ${user1Response.data.ref_code}`);
  
  // Сохраняем ref_code для последующего тестирования
  const existingRefCode = user1Response.data.ref_code;
  
  // Шаг 2: Создаем второго пользователя без указания ref_code, проверяем, что код отличается
  const guestId2 = generateTestGuestId();
  console.log(`\n2. Создаем второго пользователя с guest_id ${guestId2} БЕЗ указания ref_code...`);
  const user2Response = await createTestUser(guestId2);
  
  if (user2Response.status !== 200) {
    console.error(`❌ Ошибка при создании второго пользователя: ${JSON.stringify(user2Response.data)}`);
    return;
  }
  
  console.log(`✅ Второй пользователь успешно создан!`);
  console.log(`  - ID: ${user2Response.data.id}`);
  console.log(`  - guest_id: ${user2Response.data.guest_id}`);
  console.log(`  - ref_code: ${user2Response.data.ref_code}`);
  
  // Проверяем уникальность ref_code
  if (user2Response.data.ref_code === existingRefCode) {
    console.error(`❌ ОШИБКА: Сгенерирован одинаковый ref_code для разных пользователей!`);
  } else {
    console.log(`✅ Проверка пройдена: ref_code уникальны для разных пользователей.`);
  }
  
  // Шаг 3: Пытаемся создать пользователя с уже существующим ref_code
  const guestId3 = generateTestGuestId();
  console.log(`\n3. Создаем третьего пользователя с guest_id ${guestId3} и существующим ref_code "${existingRefCode}"...`);
  const user3Response = await createTestUser(guestId3, null, existingRefCode);
  
  if (user3Response.status !== 200) {
    console.error(`❌ Ошибка при создании третьего пользователя: ${JSON.stringify(user3Response.data)}`);
    return;
  }
  
  console.log(`✅ Третий пользователь успешно создан!`);
  console.log(`  - ID: ${user3Response.data.id}`);
  console.log(`  - guest_id: ${user3Response.data.guest_id}`);
  console.log(`  - ref_code: ${user3Response.data.ref_code}`);
  
  // Проверяем, что система заменила дублирующийся ref_code на новый уникальный
  if (user3Response.data.ref_code === existingRefCode) {
    console.error(`❌ ОШИБКА: Система не заменила дублирующийся ref_code!`);
  } else {
    console.log(`✅ Проверка пройдена: Система автоматически заменила дублирующийся ref_code на новый уникальный.`);
  }
  
  console.log('\n=== Тестирование завершено ===');
}

// Запускаем тестирование
testRefCodeGeneration().catch(error => {
  console.error('Ошибка при выполнении тестов:', error);
});