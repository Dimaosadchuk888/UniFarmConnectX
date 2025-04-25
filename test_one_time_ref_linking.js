/**
 * Скрипт для тестирования функциональности необратимой привязки реферального кода (Этап 3.1)
 * 
 * Этот скрипт демонстрирует:
 * 1. Проверку текущего состояния реферальных связей для пользователя
 * 2. Попытку привязки пользователя к реферальному коду
 * 3. Повторную попытку привязки того же пользователя к другому реферальному коду
 * 4. Проверку того, что вторая попытка игнорируется и сохраняется исходная привязка
 */

import fetch from 'node-fetch';

// Базовый URL API
const API_BASE_URL = 'http://localhost:5000';

// ID пользователей для тестирования
const TEST_USER_ID = 3; // Пользователь, которого будем привязывать
const FIRST_INVITER_ID = 2; // Первый пригласитель
const SECOND_INVITER_ID = 1; // Второй пригласитель (попытка повторной привязки)

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
    return result;
  } catch (error) {
    console.error('API Error:', error);
    return { success: false, error: error.message };
  }
}

async function testOneTimeReferralBinding() {
  console.log('\n=== ТЕСТ НЕОБРАТИМОЙ ПРИВЯЗКИ РЕФЕРАЛЬНОГО КОДА (ТЗ 3.1) ===\n');

  // Шаг 1: Проверяем текущее состояние пользователя
  console.log(`\n--- Шаг 1: Проверка текущих реферальных связей пользователя ID=${TEST_USER_ID} ---`);
  const initialState = await callApi(`/api/test/referral/user/${TEST_USER_ID}`);
  console.log('Результат:', initialState.message);
  console.log('Данные:', JSON.stringify(initialState.data, null, 2));

  // Если пользователь уже имеет пригласителя, предложим выбрать другого пользователя
  if (initialState.data.hasInviter) {
    console.log(`\n⚠️ Пользователь ID=${TEST_USER_ID} уже имеет пригласителя ID=${initialState.data.inviterId}.`);
    console.log('Для демонстрации привязки и последующего блокирования изменений выберите пользователя без пригласителя.');
    console.log('Или удалите существующую связь и повторите тест.');
    return;
  }

  // Шаг 2: Создаем первую реферальную привязку
  console.log(`\n--- Шаг 2: Привязка пользователя ID=${TEST_USER_ID} к пригласителю ID=${FIRST_INVITER_ID} ---`);
  const firstBindingResult = await callApi('/api/test/referral/link', 'POST', {
    userId: TEST_USER_ID,
    inviterId: FIRST_INVITER_ID
  });
  
  console.log('Результат первой привязки:', firstBindingResult.message);
  console.log('Статус создания:', firstBindingResult.data.isNewConnection ? 'Новая связь создана' : 'Связь уже существовала');
  console.log('Детали привязки:', JSON.stringify(firstBindingResult.data.referral, null, 2));

  // Шаг 3: Проверяем реферальные связи пользователя после первой привязки
  console.log(`\n--- Шаг 3: Проверка реферальных связей после привязки ---`);
  const stateAfterFirstBinding = await callApi(`/api/test/referral/user/${TEST_USER_ID}`);
  console.log('Результат:', stateAfterFirstBinding.message);
  console.log('Данные:', JSON.stringify(stateAfterFirstBinding.data, null, 2));

  // Шаг 4: Создаем реферальную цепочку
  console.log(`\n--- Шаг 4: Создание полной реферальной цепочки ---`);
  const chainResult = await callApi('/api/test/referral/chain', 'POST', {
    userId: TEST_USER_ID,
    inviterId: FIRST_INVITER_ID
  });
  
  console.log('Результат создания цепочки:', chainResult.message);
  console.log('Детали:', JSON.stringify(chainResult.data, null, 2));

  // Шаг 5: Пытаемся перепривязать к другому пригласителю
  console.log(`\n--- Шаг 5: Попытка привязки пользователя ID=${TEST_USER_ID} к другому пригласителю ID=${SECOND_INVITER_ID} ---`);
  const secondBindingResult = await callApi('/api/test/referral/link', 'POST', {
    userId: TEST_USER_ID,
    inviterId: SECOND_INVITER_ID
  });
  
  console.log('Результат повторной привязки:', secondBindingResult.message);
  console.log('Статус создания:', secondBindingResult.data.isNewConnection ? 'ОШИБКА! Новая связь создана' : 'Верно! Попытка привязки проигнорирована');
  console.log('Детали привязки:', JSON.stringify(secondBindingResult.data.referral, null, 2));

  // Шаг 6: Проверяем финальное состояние реферальных связей
  console.log(`\n--- Шаг 6: Финальная проверка реферальных связей ---`);
  const finalState = await callApi(`/api/test/referral/user/${TEST_USER_ID}`);
  console.log('Результат:', finalState.message);
  console.log('Данные:', JSON.stringify(finalState.data, null, 2));

  // Итоги теста
  console.log('\n=== ИТОГИ ТЕСТА ===');
  
  // Проверяем, что пользователь все еще привязан к первому пригласителю
  const stillFirstInviter = finalState.data.inviterId === FIRST_INVITER_ID;
  
  if (stillFirstInviter) {
    console.log('✅ ТЕСТ УСПЕШЕН: Однократная и необратимая привязка реферального кода работает корректно.');
    console.log(`✅ Пользователь ID=${TEST_USER_ID} остался привязан к первому пригласителю ID=${FIRST_INVITER_ID} несмотря на попытку перепривязки.`);
  } else {
    console.log('❌ ТЕСТ ПРОВАЛЕН: Произошла перепривязка к другому пригласителю.');
    console.log(`❌ Пользователь ID=${TEST_USER_ID} был перепривязан к пригласителю ID=${finalState.data.inviterId}.`);
  }
}

// Запуск теста
testOneTimeReferralBinding().catch(console.error);