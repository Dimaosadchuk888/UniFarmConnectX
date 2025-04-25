/**
 * Скрипт для проверки работы реферальной структуры в UniFarm
 * 
 * Проверяет:
 * 1. Создание двух пользователей с реферальной связью
 * 2. Проверка отображения реферала в партнерской структуре
 * 3. Проверка API для получения реферальной структуры
 */

import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';

// Базовый URL API
const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://uni-farm-connect-2-misterxuniverse.replit.app'
  : 'https://8ac7b219-438d-4a0b-ab0e-d8b58de37c6d-00-8ncue1micrhz.sisko.replit.dev';

// Форматирование объекта для вывода в консоль
function formatObject(obj) {
  return JSON.stringify(obj, null, 2);
}

// Генерация уникального guest_id
function generateGuestId() {
  return uuidv4();
}

/**
 * Создает пользователя через API
 */
async function createUser(guestId, username, parentRefCode = null) {
  const userData = {
    guest_id: guestId,
    username: username
  };
  
  if (parentRefCode) {
    userData.startapp = parentRefCode;
  }
  
  const response = await fetch(`${API_URL}/api/airdrop/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  
  return await response.json();
}

/**
 * Получает информацию о рефералах пользователя
 */
async function getReferrals(userId) {
  try {
    const response = await fetch(`${API_URL}/api/referrals?user_id=${userId}`);
    return await response.json();
  } catch (error) {
    console.error('Ошибка при получении рефералов:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Получает сырые данные о пользователе из базы данных
 */
async function getUserData(userId) {
  try {
    const response = await fetch(`${API_URL}/api/user?user_id=${userId}`);
    return await response.json();
  } catch (error) {
    console.error('Ошибка при получении данных пользователя:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Тестирование реферальной структуры
 */
async function testReferralStructure() {
  console.log('=== ТЕСТИРОВАНИЕ РЕФЕРАЛЬНОЙ СТРУКТУРЫ ===\n');
  
  try {
    // 1. Создаем первого пользователя (реферер)
    const referrerGuestId = generateGuestId();
    console.log(`Создание реферера с guest_id: ${referrerGuestId}`);
    
    const referrerData = await createUser(referrerGuestId, `referrer_${Date.now()}`);
    
    if (!referrerData.success) {
      throw new Error(`Ошибка при создании реферера: ${formatObject(referrerData)}`);
    }
    
    const referrerId = referrerData.data.user_id;
    const referrerRefCode = referrerData.data.ref_code;
    
    console.log(`✅ Реферер создан: ID=${referrerId}, ref_code=${referrerRefCode}`);
    
    // 2. Создаем второго пользователя (реферал) с привязкой к первому
    const referralGuestId = generateGuestId();
    console.log(`\nСоздание реферала с guest_id: ${referralGuestId}`);
    console.log(`Используется реферальный код: ${referrerRefCode}`);
    
    const referralData = await createUser(referralGuestId, `referral_${Date.now()}`, referrerRefCode);
    
    if (!referralData.success) {
      throw new Error(`Ошибка при создании реферала: ${formatObject(referralData)}`);
    }
    
    const referralId = referralData.data.user_id;
    const referralRefCode = referralData.data.ref_code;
    const parentRefCode = referralData.data.parent_ref_code;
    
    console.log(`✅ Реферал создан: ID=${referralId}, ref_code=${referralRefCode}, parent_ref_code=${parentRefCode}`);
    
    // Проверяем корректность установки реферальной связи
    if (parentRefCode === referrerRefCode) {
      console.log('✅ Реферальная связь установлена корректно');
    } else {
      console.error(`❌ Ошибка: Реферальная связь установлена неверно: ${parentRefCode} vs ${referrerRefCode}`);
    }
    
    // 3. Проверяем, видит ли реферер своего реферала
    console.log('\nПроверка получения рефералов для реферера...');
    const referralsData = await getReferrals(referrerId);
    
    console.log(`Получен ответ API: ${formatObject(referralsData)}`);
    
    if (!referralsData.success) {
      console.log(`❌ Ошибка при получении рефералов: ${formatObject(referralsData)}`);
    } else {
      console.log(`Получено ${referralsData.data.referrals.length} рефералов`);
      
      // Проверка наличия реферала в списке
      const foundReferral = referralsData.data.referrals.find(ref => ref.id === referralId);
      
      if (foundReferral) {
        console.log('✅ Реферал найден в структуре реферера');
        console.log(`Данные реферала: ${formatObject(foundReferral)}`);
      } else {
        console.log(`❌ Реферал с ID=${referralId} не найден в структуре`);
        
        // Проверяем данные напрямую в базе
        console.log('\nПроверка данных пользователей напрямую...');
        
        const referrerRawData = await getUserData(referrerId);
        console.log(`Данные реферера: ${formatObject(referrerRawData)}`);
        
        const referralRawData = await getUserData(referralId);
        console.log(`Данные реферала: ${formatObject(referralRawData)}`);
      }
    }
    
    return {
      success: true,
      referrer: {
        id: referrerId,
        refCode: referrerRefCode,
        guestId: referrerGuestId
      },
      referral: {
        id: referralId,
        refCode: referralRefCode,
        parentRefCode: parentRefCode,
        guestId: referralGuestId
      }
    };
  } catch (error) {
    console.error('❌ Ошибка при тестировании реферальной структуры:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Запускаем тестирование
testReferralStructure().then(result => {
  console.log('\n=== РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ ===');
  console.log(`Успешно: ${result.success}`);
  
  if (result.success) {
    console.log(`Реферер: ID=${result.referrer.id}, ref_code=${result.referrer.refCode}`);
    console.log(`Реферал: ID=${result.referral.id}, ref_code=${result.referral.refCode}, parent_ref_code=${result.referral.parentRefCode}`);
  } else {
    console.log(`Ошибка: ${result.error}`);
  }
});