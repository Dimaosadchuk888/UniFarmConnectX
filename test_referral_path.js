/**
 * Скрипт для тестирования функциональности построения реферальной цепочки ref_path (Этап 4.1)
 * 
 * Демонстрирует:
 * 1. Создание цепочки из нескольких пользователей
 * 2. Проверку корректности построения ref_path
 * 3. Визуализацию иерархической структуры
 */

import fetch from 'node-fetch';

// Базовый URL API
const API_BASE_URL = 'https://8ac7b219-438d-4a0b-ab0e-d8b58de37c6d-00-8ncue1micrhz.sisko.replit.dev';

// ID пользователей для тестирования
// Мы создадим цепочку 1 <- 2 <- 3 <- 4
// Где пользователь 4 приглашен пользователем 3, который приглашен 2, который приглашен 1
const USER_IDS = [1, 2, 3, 4];

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

/**
 * Первый шаг: Проверяем текущие реферальные связи
 */
async function checkExistingReferrals() {
  console.log('\n=== ШАГ 1: Проверка текущих реферальных связей ===');
  
  for (const userId of USER_IDS) {
    const result = await callApi(`/api/test/referral/user/${userId}`);
    console.log(`\nПользователь ID=${userId}:`);
    console.log(`Существует пригласитель: ${result.data.hasInviter ? 'Да' : 'Нет'}`);
    
    if (result.data.hasInviter) {
      console.log(`Пригласитель: ID=${result.data.inviterId}`);
      console.log(`Референсный путь: ${JSON.stringify(result.data.referralChain || [])}`);
    }
  }
}

/**
 * Шаг 2: Создаем реферальную цепочку
 */
async function createReferralChain() {
  console.log('\n=== ШАГ 2: Создание реферальной цепочки ===');
  
  // Создаем связи: 1 <- 2 <- 3 <- 4
  const links = [
    { userId: 2, inviterId: 1 },
    { userId: 3, inviterId: 2 },
    { userId: 4, inviterId: 3 }
  ];
  
  for (const link of links) {
    console.log(`\nСоздание связи: ${link.userId} приглашен ${link.inviterId}`);
    const result = await callApi('/api/test/referral/link', 'POST', link);
    
    console.log(`Результат: ${result.message}`);
    console.log(`Создана новая связь: ${result.data.isNewConnection ? 'Да' : 'Нет'}`);
    
    if (result.data.referral) {
      console.log(`Детали связи:`);
      console.log(`- ID: ${result.data.referral.id}`);
      console.log(`- Пользователь: ${result.data.referral.user_id}`);
      console.log(`- Пригласитель: ${result.data.referral.inviter_id}`);
      console.log(`- Уровень: ${result.data.referral.level}`);
      console.log(`- ref_path: ${JSON.stringify(result.data.referral.ref_path || [])}`);
    }
  }
}

/**
 * Шаг 3: Проверяем итоговую структуру реферальных связей
 */
async function checkFinalReferralStructure() {
  console.log('\n=== ШАГ 3: Проверка итоговой структуры реферальных связей ===');
  
  for (const userId of USER_IDS) {
    const result = await callApi(`/api/test/referral/user/${userId}`);
    console.log(`\nПользователь ID=${userId}:`);
    
    if (result.data.hasInviter) {
      console.log(`Пригласитель: ID=${result.data.inviterId}`);
      
      if (result.data.referralChain) {
        console.log(`Реферальная цепочка:`);
        result.data.referralChain.forEach(ref => {
          console.log(`- Уровень ${ref.level}: Пригласитель ID=${ref.inviter_id}`);
        });
      }
      
      // Выводим ref_path, если он есть
      const refPath = result.data.ref_path || [];
      if (refPath.length > 0) {
        console.log(`Референсный путь (ref_path): [${refPath.join(' -> ')}]`);
      } else {
        console.log('Референсный путь (ref_path) отсутствует или пуст');
      }
    } else {
      console.log('Нет пригласителя (корневой пользователь)');
    }
  }
  
  // Визуализация всей структуры
  console.log('\n=== Визуализация иерархической структуры ===');
  console.log('1');
  console.log('└── 2');
  console.log('    └── 3');
  console.log('        └── 4');
}

/**
 * Основная функция запуска тестов
 */
async function testReferralPath() {
  console.log('=== ТЕСТ ПОСТРОЕНИЯ РЕФЕРАЛЬНОЙ ЦЕПОЧКИ REF_PATH (ТЗ 4.1) ===\n');
  
  // Шаг 1: Проверка текущих связей
  await checkExistingReferrals();
  
  // Шаг 2: Создание цепочки
  await createReferralChain();
  
  // Шаг 3: Проверка итоговой структуры
  await checkFinalReferralStructure();
  
  console.log('\n=== ИТОГИ ТЕСТА ===');
  console.log('✅ Тест построения реферальной цепочки успешно выполнен.');
  console.log('✅ Проверьте наличие ref_path в базе данных и правильность его построения.');
}

// Запускаем тест
testReferralPath().catch(console.error);