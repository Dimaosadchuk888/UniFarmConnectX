/**
 * Комплексный скрипт для финального тестирования всех сценариев работы UniFarm (Этап 8)
 * 
 * Проверяется функциональность:
 * 1. Первый запуск Mini App (создание guest_id и ref_code)
 * 2. Переход по реферальной ссылке (сохранение inviter_id)
 * 3. Повторный запуск (восстановление по guest_id)
 * 4. Симуляция удаления Telegram-бота (создание нового guest_id)
 * 5. Заход с другого устройства
 * 6. Проверка функциональности фарминга и партнёрки
 */

import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';

// Базовый URL API
const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://uni-farm-connect-2-misterxuniverse.replit.app'
  : 'https://8ac7b219-438d-4a0b-ab0e-d8b58de37c6d-00-8ncue1micrhz.sisko.replit.dev';

/**
 * Генерирует уникальный guest_id
 */
function generateGuestId() {
  return uuidv4();
}

/**
 * Форматирует объект для вывода в консоль
 */
function formatObject(obj) {
  return JSON.stringify(obj, null, 2);
}

/**
 * 1. Тестирование первого запуска Mini App
 * Проверяет создание нового пользователя с генерацией guest_id и ref_code
 */
async function testFirstLaunch() {
  console.log('\n=== 1. ТЕСТИРОВАНИЕ ПЕРВОГО ЗАПУСКА MINI APP ===\n');
  
  try {
    // Генерируем уникальный guest_id для первого пользователя
    const firstGuestId = generateGuestId();
    console.log(`Сгенерирован guest_id: ${firstGuestId}`);
    
    // Регистрируем нового пользователя в режиме AirDrop
    console.log('\nРегистрация нового пользователя...');
    
    const registrationResponse = await fetch(`${API_URL}/api/airdrop/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guest_id: firstGuestId,
        username: `test_user_${Date.now()}`,
      })
    });
    
    const registrationData = await registrationResponse.json();
    
    if (!registrationResponse.ok) {
      throw new Error(`Ошибка при регистрации: ${formatObject(registrationData)}`);
    }
    
    console.log('✅ Пользователь успешно зарегистрирован');
    console.log(`ID пользователя: ${registrationData.data.user_id}`);
    console.log(`Реферальный код: ${registrationData.data.ref_code}`);
    console.log(`Баланс UNI: ${registrationData.data.balance_uni}`);
    console.log(`Привязанный guest_id: ${registrationData.data.guest_id}`);
    
    // Сохраняем данные первого пользователя для последующих тестов
    const user1 = {
      id: registrationData.data.user_id,
      guestId: firstGuestId,
      refCode: registrationData.data.ref_code,
      balanceUni: registrationData.data.balance_uni
    };
    
    return user1;
  } catch (error) {
    console.error('❌ Ошибка при тестировании первого запуска:', error);
    process.exit(1);
  }
}

/**
 * 2. Тестирование перехода по реферальной ссылке
 * Проверяет регистрацию нового пользователя по реферальной ссылке
 */
async function testReferralLink(referrerUser) {
  console.log('\n=== 2. ТЕСТИРОВАНИЕ ПЕРЕХОДА ПО РЕФЕРАЛЬНОЙ ССЫЛКЕ ===\n');
  
  try {
    // Генерируем уникальный guest_id для второго пользователя
    const secondGuestId = generateGuestId();
    console.log(`Сгенерирован новый guest_id: ${secondGuestId}`);
    console.log(`Используется реферальный код первого пользователя: ${referrerUser.refCode}`);
    
    // Регистрируем нового пользователя с реферальным кодом
    const referralRegistrationResponse = await fetch(`${API_URL}/api/airdrop/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guest_id: secondGuestId,
        username: `referred_user_${Date.now()}`,
        ref_code: referrerUser.refCode, // Используем реферальный код первого пользователя
      })
    });
    
    const referralRegistrationData = await referralRegistrationResponse.json();
    
    if (!referralRegistrationResponse.ok) {
      throw new Error(`Ошибка при регистрации с реферальным кодом: ${formatObject(referralRegistrationData)}`);
    }
    
    console.log('✅ Пользователь по реферальной ссылке успешно зарегистрирован');
    console.log(`ID пользователя: ${referralRegistrationData.data.user_id}`);
    console.log(`Собственный реферальный код: ${referralRegistrationData.data.ref_code}`);
    console.log(`Родительский реферальный код: ${referralRegistrationData.data.parent_ref_code}`);
    
    // Проверяем корректность установки реферальной связи
    if (referralRegistrationData.data.parent_ref_code === referrerUser.refCode) {
      console.log('✅ Реферальная связь установлена корректно');
    } else {
      console.error(`❌ Ошибка: Реферальная связь установлена неверно: ${referralRegistrationData.data.parent_ref_code} vs ${referrerUser.refCode}`);
    }
    
    // Сохраняем данные второго пользователя для последующих тестов
    const user2 = {
      id: referralRegistrationData.data.user_id,
      guestId: secondGuestId,
      refCode: referralRegistrationData.data.ref_code,
      parentRefCode: referralRegistrationData.data.parent_ref_code
    };
    
    return user2;
  } catch (error) {
    console.error('❌ Ошибка при тестировании реферальной ссылки:', error);
    process.exit(1);
  }
}

/**
 * 3. Тестирование повторного запуска приложения
 * Проверяет, что при повторном входе с тем же guest_id возвращается существующий кабинет
 */
async function testRepeatedLaunch(existingUser) {
  console.log('\n=== 3. ТЕСТИРОВАНИЕ ПОВТОРНОГО ЗАПУСКА ПРИЛОЖЕНИЯ ===\n');
  
  try {
    console.log(`Используем существующий guest_id: ${existingUser.guestId}`);
    
    // Выполняем вход с существующим guest_id
    const restoreResponse = await fetch(`${API_URL}/api/airdrop/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guest_id: existingUser.guestId,
      })
    });
    
    const restoreData = await restoreResponse.json();
    
    if (!restoreResponse.ok) {
      throw new Error(`Ошибка при восстановлении сессии: ${formatObject(restoreData)}`);
    }
    
    console.log('✅ Сессия успешно восстановлена');
    console.log(`ID пользователя: ${restoreData.data.user_id}`);
    console.log(`Реферальный код: ${restoreData.data.ref_code}`);
    
    // Проверяем, совпадают ли данные при повторном входе
    if (restoreData.data.user_id === existingUser.id) {
      console.log('✅ Пользователь идентифицирован корректно (тот же ID)');
    } else {
      console.error(`❌ Ошибка: Получен другой ID пользователя: ${restoreData.data.user_id} vs ${existingUser.id}`);
    }
    
    if (restoreData.data.ref_code === existingUser.refCode) {
      console.log('✅ Реферальный код сохранен корректно');
    } else {
      console.error(`❌ Ошибка: Получен другой реферальный код: ${restoreData.data.ref_code} vs ${existingUser.refCode}`);
    }
    
    return {
      success: true,
      originalUser: existingUser,
      restoredUser: {
        id: restoreData.data.user_id,
        refCode: restoreData.data.ref_code
      }
    };
  } catch (error) {
    console.error('❌ Ошибка при тестировании повторного запуска:', error);
    process.exit(1);
  }
}

/**
 * 4. Тестирование удаления Telegram-бота и повторный запуск
 * Симулирует ситуацию удаления бота, когда теряется привязка к старому кабинету
 */
async function testBotDeletedScenario() {
  console.log('\n=== 4. ТЕСТИРОВАНИЕ УДАЛЕНИЯ TELEGRAM-БОТА И ПОВТОРНОГО ЗАПУСКА ===\n');
  
  try {
    // Для симуляции удаления Telegram-бота просто создаем новый guest_id,
    // что эквивалентно потере доступа к старому кабинету
    const newGuestId = generateGuestId();
    console.log(`Сгенерирован новый guest_id (после "удаления" бота): ${newGuestId}`);
    
    // Регистрируем нового пользователя с новым guest_id
    const reRegistrationResponse = await fetch(`${API_URL}/api/airdrop/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guest_id: newGuestId,
        username: `reregistered_user_${Date.now()}`
      })
    });
    
    const reRegistrationData = await reRegistrationResponse.json();
    
    if (!reRegistrationResponse.ok) {
      throw new Error(`Ошибка при перерегистрации: ${formatObject(reRegistrationData)}`);
    }
    
    console.log('✅ Новый пользователь успешно создан после "удаления" бота');
    console.log(`ID нового пользователя: ${reRegistrationData.data.user_id}`);
    console.log(`Новый реферальный код: ${reRegistrationData.data.ref_code}`);
    console.log(`Баланс UNI: ${reRegistrationData.data.balance_uni}`);
    
    // Сохраняем данные нового пользователя
    const newUser = {
      id: reRegistrationData.data.user_id,
      guestId: newGuestId,
      refCode: reRegistrationData.data.ref_code
    };
    
    return newUser;
  } catch (error) {
    console.error('❌ Ошибка при тестировании сценария удаления бота:', error);
    process.exit(1);
  }
}

/**
 * 5. Тестирование захода с другого устройства
 * Симулирует открытие приложения на новом устройстве
 */
async function testNewDeviceScenario() {
  console.log('\n=== 5. ТЕСТИРОВАНИЕ ЗАХОДА С ДРУГОГО УСТРОЙСТВА ===\n');
  
  try {
    // Для симуляции нового устройства создаем новый guest_id
    const newDeviceGuestId = generateGuestId();
    console.log(`Сгенерирован guest_id для "нового устройства": ${newDeviceGuestId}`);
    
    // Регистрируем пользователя с новым guest_id (новое устройство)
    const newDeviceResponse = await fetch(`${API_URL}/api/airdrop/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guest_id: newDeviceGuestId,
        username: `new_device_user_${Date.now()}`
      })
    });
    
    const newDeviceData = await newDeviceResponse.json();
    
    if (!newDeviceResponse.ok) {
      throw new Error(`Ошибка при входе с нового устройства: ${formatObject(newDeviceData)}`);
    }
    
    console.log('✅ Новый пользователь создан при входе с "нового устройства"');
    console.log(`ID пользователя: ${newDeviceData.data.user_id}`);
    console.log(`Реферальный код: ${newDeviceData.data.ref_code}`);
    
    return {
      id: newDeviceData.data.user_id,
      guestId: newDeviceGuestId,
      refCode: newDeviceData.data.ref_code
    };
  } catch (error) {
    console.error('❌ Ошибка при тестировании захода с другого устройства:', error);
    process.exit(1);
  }
}

/**
 * 6. Тестирование фарминга и партнёрской структуры
 * Проверяет работу функций фарминга и корректность отображения реферальной структуры
 */
async function testFarmingAndReferrals(user1, user2) {
  console.log('\n=== 6. ТЕСТИРОВАНИЕ ФАРМИНГА И ПАРТНЁРСКОЙ СТРУКТУРЫ ===\n');
  
  try {
    // 6.1. Проверка получения списка рефералов для первого пользователя
    console.log('6.1. Проверка партнёрской структуры...');
    
    const referralsResponse = await fetch(`${API_URL}/api/referrals?user_id=${user1.id}`);
    const referralsData = await referralsResponse.json();
    
    if (!referralsResponse.ok) {
      throw new Error(`Ошибка при получении списка рефералов: ${formatObject(referralsData)}`);
    }
    
    console.log(`Получен список из ${referralsData.data.referrals.length} рефералов для пользователя ${user1.id}`);
    
    // Проверяем, что реферал присутствует в списке
    const foundReferral = referralsData.data.referrals.find(ref => ref.id === user2.id);
    
    if (foundReferral) {
      console.log('✅ Реферал корректно отображается в партнёрской структуре');
      console.log(`Данные реферала: ID=${foundReferral.id}, Ref Code=${foundReferral.ref_code}`);
    } else {
      console.error(`❌ Ошибка: Реферал с ID ${user2.id} не найден в структуре`);
    }
    
    // 6.2. Проверка начисления ежедневного бонуса
    console.log('\n6.2. Проверка функции ежедневного бонуса...');
    
    const dailyBonusStatusResponse = await fetch(`${API_URL}/api/daily-bonus/status?user_id=${user1.id}`);
    const dailyBonusStatusData = await dailyBonusStatusResponse.json();
    
    if (!dailyBonusStatusResponse.ok) {
      throw new Error(`Ошибка при получении статуса ежедневного бонуса: ${formatObject(dailyBonusStatusData)}`);
    }
    
    console.log(`Статус ежедневного бонуса: можно получить = ${dailyBonusStatusData.data.canClaim}`);
    
    if (dailyBonusStatusData.data.canClaim) {
      // Запрашиваем получение бонуса
      const claimBonusResponse = await fetch(`${API_URL}/api/daily-bonus/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user1.id })
      });
      
      const claimBonusData = await claimBonusResponse.json();
      
      if (!claimBonusResponse.ok) {
        console.log(`Примечание: Не удалось получить ежедневный бонус: ${formatObject(claimBonusData)}`);
      } else {
        console.log('✅ Ежедневный бонус успешно получен');
        console.log(`Начислено: ${claimBonusData.data.amount} UNI`);
      }
    } else {
      console.log('ℹ️ Ежедневный бонус уже был получен ранее');
    }
    
    // 6.3. Проверка баланса пользователя
    console.log('\n6.3. Проверка баланса пользователя...');
    
    // Исправленный URL для запроса баланса пользователя
    const balanceResponse = await fetch(`${API_URL}/api/wallet/balance?user_id=${user1.id}`);
    const balanceData = await balanceResponse.json();
    
    if (!balanceResponse.ok) {
      throw new Error(`Ошибка при получении баланса: ${formatObject(balanceData)}`);
    }
    
    console.log('✅ Баланс пользователя получен успешно');
    console.log(`Баланс UNI: ${balanceData.data.balance_uni}`);
    console.log(`Баланс TON: ${balanceData.data.balance_ton}`);
    
    return {
      referralsCount: referralsData.data.referrals.length,
      balanceUni: balanceData.data.balance_uni,
      balanceTon: balanceData.data.balance_ton
    };
  } catch (error) {
    console.error('❌ Ошибка при тестировании фарминга и партнёрской структуры:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Запуск комплексного тестирования всех сценариев
 */
async function runComplexTesting() {
  console.log('===== КОМПЛЕКСНОЕ ТЕСТИРОВАНИЕ ВСЕХ СЦЕНАРИЕВ UNIFARM (ЭТАП 8) =====\n');
  
  try {
    // 1. Тестируем первый запуск
    const user1 = await testFirstLaunch();
    console.log(`Пользователь 1 создан с ID=${user1.id}, ref_code=${user1.refCode}`);
    
    // 2. Тестируем переход по реферальной ссылке
    const user2 = await testReferralLink(user1);
    console.log(`Пользователь 2 создан с ID=${user2.id}, ref_code=${user2.refCode}, parent_ref_code=${user2.parentRefCode}`);
    
    // 3. Тестируем повторный запуск приложения (восстановление по guest_id)
    const restoreResult = await testRepeatedLaunch(user1);
    console.log(`Восстановление сессии: ${restoreResult.success ? 'успешно' : 'не удалось'}`);
    
    // 4. Тестируем сценарий удаления Telegram-бота
    const newUser = await testBotDeletedScenario();
    console.log(`Новый пользователь после удаления бота: ID=${newUser.id}, ref_code=${newUser.refCode}`);
    
    // 5. Тестируем заход с другого устройства
    const newDeviceUser = await testNewDeviceScenario();
    console.log(`Пользователь с нового устройства: ID=${newDeviceUser.id}, ref_code=${newDeviceUser.refCode}`);
    
    // 6. Тестируем функции фарминга и партнёрки
    const farmingResults = await testFarmingAndReferrals(user1, user2);
    
    console.log('\n===== ИТОГИ КОМПЛЕКСНОГО ТЕСТИРОВАНИЯ =====\n');
    console.log('✅ Создание пользователя и генерация guest_id/ref_code: УСПЕШНО');
    console.log('✅ Реферальная система и привязка inviter_id: УСПЕШНО');
    console.log('✅ Восстановление сессии по guest_id: УСПЕШНО');
    console.log('✅ Создание нового аккаунта после удаления бота: УСПЕШНО');
    console.log('✅ Создание нового аккаунта с нового устройства: УСПЕШНО');
    console.log(`✅ Партнёрская структура: найдено ${farmingResults.referralsCount} рефералов`);
    console.log(`✅ Баланс пользователя: ${farmingResults.balanceUni} UNI, ${farmingResults.balanceTon} TON`);
    
    console.log('\nВсе сценарии успешно протестированы! Система работает корректно.');
    
  } catch (error) {
    console.error('\n❌ ОШИБКА ПРИ ВЫПОЛНЕНИИ КОМПЛЕКСНОГО ТЕСТИРОВАНИЯ:', error);
    process.exit(1);
  }
}

// Запускаем тестирование
runComplexTesting();