/**
 * Скрипт для тестирования регистрации пользователя в режиме AirDrop (Этап 4)
 * 
 * Этот скрипт:
 * 1. Создает нового пользователя через /api/airdrop/register только на основе guest_id
 * 2. Проверяет, что пользователь успешно создан и имеет рабочий реферальный код
 * 3. Пробует повторно войти с тем же guest_id для проверки восстановления сессии
 */

import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';

// Базовый URL API
const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://uni-farm-connect-2-misterxuniverse.replit.app'
  : 'https://8ac7b219-438d-4a0b-ab0e-d8b58de37c6d-00-8ncue1micrhz.sisko.replit.dev';

// Генерируем уникальный guest_id
function generateGuestId() {
  return uuidv4();
}

async function testAirdropRegistration() {
  console.log('=== Тестирование регистрации в режиме AirDrop (Этап 4) ===\n');
  
  try {
    // Шаг 1: Генерируем уникальный guest_id
    const guestId = generateGuestId();
    console.log(`Сгенерирован guest_id: ${guestId}`);
    
    // Шаг 2: Регистрируем нового пользователя в режиме AirDrop
    console.log('\nШаг 1: Регистрация нового пользователя в режиме AirDrop...');
    
    const registrationResponse = await fetch(`${API_URL}/api/airdrop/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        guest_id: guestId,
        username: `airdrop_user_${Date.now()}`,
        startapp: null, // Имитируем отсутствие реферального параметра
      })
    });
    
    const registrationData = await registrationResponse.json();
    
    if (!registrationResponse.ok) {
      throw new Error(`Ошибка при регистрации: ${JSON.stringify(registrationData)}`);
    }
    
    console.log('✅ Пользователь успешно зарегистрирован');
    console.log(`ID пользователя: ${registrationData.data.user_id}`);
    console.log(`Реферальный код: ${registrationData.data.ref_code}`);
    console.log(`Баланс UNI: ${registrationData.data.balance_uni}`);
    console.log(`Привязанный guest_id: ${registrationData.data.guest_id}`);
    
    // Запоминаем данные созданного пользователя для следующих тестов
    const userId = registrationData.data.user_id;
    const refCode = registrationData.data.ref_code;
    
    // Шаг 3: Проверяем повторный вход с тем же guest_id
    console.log('\nШаг 2: Проверка повторного входа с тем же guest_id...');
    
    const restoreResponse = await fetch(`${API_URL}/api/airdrop/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        guest_id: guestId,
      })
    });
    
    const restoreData = await restoreResponse.json();
    
    if (!restoreResponse.ok) {
      throw new Error(`Ошибка при восстановлении сессии: ${JSON.stringify(restoreData)}`);
    }
    
    console.log('✅ Сессия успешно восстановлена');
    console.log(`ID пользователя: ${restoreData.data.user_id}`);
    
    // Проверяем, совпадают ли данные при повторном входе
    if (restoreData.data.user_id === userId) {
      console.log('✅ Пользователь идентифицирован корректно (тот же ID)');
    } else {
      console.error(`❌ Ошибка: Получен другой ID пользователя: ${restoreData.data.user_id} vs ${userId}`);
    }
    
    if (restoreData.data.ref_code === refCode) {
      console.log('✅ Реферальный код сохранен корректно');
    } else {
      console.error(`❌ Ошибка: Получен другой реферальный код: ${restoreData.data.ref_code} vs ${refCode}`);
    }
    
    // Шаг 4: Проверка регистрации с реферальным кодом
    console.log('\nШаг 3: Тестирование регистрации с реферальным кодом...');
    
    // Генерируем новый guest_id для второго пользователя
    const secondGuestId = generateGuestId();
    console.log(`Сгенерирован новый guest_id: ${secondGuestId}`);
    
    const referralRegistrationResponse = await fetch(`${API_URL}/api/airdrop/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        guest_id: secondGuestId,
        username: `referred_user_${Date.now()}`,
        startapp: refCode, // Используем реферальный код первого пользователя
      })
    });
    
    const referralRegistrationData = await referralRegistrationResponse.json();
    
    if (!referralRegistrationResponse.ok) {
      throw new Error(`Ошибка при регистрации с реферальным кодом: ${JSON.stringify(referralRegistrationData)}`);
    }
    
    console.log('✅ Второй пользователь успешно зарегистрирован с реферальным кодом');
    console.log(`ID пользователя: ${referralRegistrationData.data.user_id}`);
    console.log(`Собственный реферальный код: ${referralRegistrationData.data.ref_code}`);
    console.log(`Родительский реферальный код: ${referralRegistrationData.data.parent_ref_code}`);
    
    // Проверяем, корректно ли установлен parent_ref_code
    if (referralRegistrationData.data.parent_ref_code === refCode) {
      console.log('✅ Реферальная связь установлена корректно');
    } else {
      console.error(`❌ Ошибка: Реферальная связь не установлена или установлена неверно: ${referralRegistrationData.data.parent_ref_code} vs ${refCode}`);
    }
    
    console.log('\n=== Тестирование режима AirDrop успешно завершено ===');
  } catch (error) {
    console.error('❌ Произошла ошибка при тестировании:', error);
    process.exit(1);
  }
}

// Запускаем тестирование
testAirdropRegistration();