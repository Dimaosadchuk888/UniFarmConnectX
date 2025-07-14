/**
 * Тестовый скрипт для проверки исправления TON Boost накопления
 */

import { tonFarmingRepository } from '../modules/boost/TonFarmingRepository';
import { supabase } from '../core/supabase';
import { logger } from '../utils/logger';

async function testTonBoostFix() {
  try {
    console.log('=== Тестирование исправления TON Boost ===\n');
    
    // 1. Проверяем текущее состояние user 74
    console.log('1. Получаем текущее состояние пользователя 74...');
    const currentState = await tonFarmingRepository.getByUserId('74');
    console.log('Текущее состояние:', {
      farming_balance: currentState?.farming_balance,
      farming_rate: currentState?.farming_rate,
      boost_package_id: currentState?.boost_package_id
    });
    
    // 2. Симулируем покупку Advanced Boost (10 TON)
    console.log('\n2. Симулируем покупку Advanced Boost (10 TON)...');
    const success = await tonFarmingRepository.activateBoost(
      '74',        // userId
      3,           // packageId (Advanced Boost)
      0.02,        // rate (2% в день)
      undefined,   // expiresAt
      10           // depositAmount (10 TON)
    );
    
    if (success) {
      console.log('✅ Активация boost успешна!');
    } else {
      console.log('❌ Ошибка активации boost');
    }
    
    // 3. Проверяем новое состояние
    console.log('\n3. Проверяем новое состояние...');
    const newState = await tonFarmingRepository.getByUserId('74');
    console.log('Новое состояние:', {
      farming_balance: newState?.farming_balance,
      farming_rate: newState?.farming_rate,
      boost_package_id: newState?.boost_package_id
    });
    
    // 4. Проверяем правильность накопления
    const oldBalance = parseFloat(currentState?.farming_balance || '0');
    const newBalance = parseFloat(newState?.farming_balance || '0');
    const expectedBalance = oldBalance + 10;
    
    console.log('\n=== РЕЗУЛЬТАТЫ ТЕСТА ===');
    console.log(`Старый баланс: ${oldBalance} TON`);
    console.log(`Новый баланс: ${newBalance} TON`);
    console.log(`Ожидаемый баланс: ${expectedBalance} TON`);
    
    if (Math.abs(newBalance - expectedBalance) < 0.0001) {
      console.log('✅ ТЕСТ ПРОЙДЕН! Накопление работает корректно!');
    } else {
      console.log('❌ ТЕСТ ПРОВАЛЕН! Баланс не соответствует ожидаемому!');
    }
    
    // 5. Проверяем farming_rate
    if (newState?.farming_rate === '0.02') {
      console.log('✅ farming_rate обновлен корректно (0.02)');
    } else {
      console.log(`❌ farming_rate некорректный: ${newState?.farming_rate}`);
    }
    
    // 6. Проверяем boost_package_id
    if (newState?.boost_package_id === 3) {
      console.log('✅ boost_package_id обновлен корректно (3)');
    } else {
      console.log(`❌ boost_package_id некорректный: ${newState?.boost_package_id}`);
    }
    
  } catch (error) {
    console.error('Ошибка при тестировании:', error);
  }
}

// Запускаем тест
testTonBoostFix();