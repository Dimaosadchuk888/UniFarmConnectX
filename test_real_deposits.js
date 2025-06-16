/**
 * T63 - Тестирование реальных депозитов UNI и TON с партнерской программой
 * Проверка фактических начислений от farming и boost пакетов
 */

import { SupabaseUserRepository } from './modules/user/service.js';
import { ReferralService } from './modules/referral/service.js';
import { FarmingScheduler } from './modules/farming/scheduler.js';

/**
 * Проверяет текущее состояние реальных депозитов
 */
async function checkRealDeposits() {
  console.log('=== АНАЛИЗ РЕАЛЬНЫХ ДЕПОЗИТОВ ===');
  
  const userRepo = new SupabaseUserRepository();
  
  // Получаем пользователей с активными депозитами
  const activeUsers = await userRepo.findUsersWithActiveDeposits();
  
  console.log('\nПользователи с активными UNI депозитами:');
  for (const user of activeUsers) {
    console.log(`ID ${user.id} (${user.telegram_id}): ${user.balance_uni} UNI, rate: ${user.uni_farming_rate}, referrer: ${user.referred_by || 'none'}`);
  }
  
  return activeUsers;
}

/**
 * Симулирует один цикл UNI farming с реальными депозитами
 */
async function simulateRealFarming(users) {
  console.log('\n=== СИМУЛЯЦИЯ UNI FARMING С РЕАЛЬНЫМИ ДЕПОЗИТАМИ ===');
  
  const scheduler = new FarmingScheduler();
  const referralService = new ReferralService();
  
  // Запоминаем балансы до начисления
  const balancesBefore = {};
  for (const user of users) {
    balancesBefore[user.id] = parseFloat(user.balance_uni);
  }
  
  console.log('\nБалансы ДО farming цикла:');
  Object.entries(balancesBefore).forEach(([id, balance]) => {
    console.log(`User ID ${id}: ${balance.toFixed(6)} UNI`);
  });
  
  // Выполняем один цикл farming
  await scheduler.processUniFarming();
  
  // Проверяем балансы после
  console.log('\nБалансы ПОСЛЕ farming цикла:');
  const userRepo = new SupabaseUserRepository();
  
  for (const user of users) {
    const updatedUser = await userRepo.findById(user.id);
    const newBalance = parseFloat(updatedUser.balance_uni);
    const increase = newBalance - balancesBefore[user.id];
    
    console.log(`User ID ${user.id}: ${newBalance.toFixed(6)} UNI (+${increase.toFixed(6)})`);
    
    // Проверяем реферальные начисления
    if (user.referred_by) {
      console.log(`  └─ Referrer ID ${user.referred_by} должен получить комиссию`);
    }
  }
}

/**
 * Проверяет реферальные начисления от реальных депозитов
 */
async function checkReferralEarnings() {
  console.log('\n=== ПРОВЕРКА РЕФЕРАЛЬНЫХ НАЧИСЛЕНИЙ ===');
  
  const referralService = new ReferralService();
  const userRepo = new SupabaseUserRepository();
  
  // Проверяем User ID 13 (referrer для User ID 4)
  const referrer = await userRepo.findById(13);
  console.log(`Referrer ID 13 balance: ${referrer.balance_uni} UNI`);
  
  // Проверяем User ID 14 (referrer для User ID 15)  
  const referrer2 = await userRepo.findById(14);
  console.log(`Referrer ID 14 balance: ${referrer2.balance_uni} UNI`);
  
  // Симулируем доход от User ID 4 (115 UNI farming)
  console.log('\nСимулирую реферальные начисления от User ID 4...');
  await referralService.distributeReferralRewards(4, '0.1', 'UNI', 'farming_reward');
  
  // Проверяем обновленные балансы
  const updatedReferrer = await userRepo.findById(13);
  console.log(`Referrer ID 13 new balance: ${updatedReferrer.balance_uni} UNI`);
}

/**
 * Основная функция тестирования реальных депозитов
 */
async function runRealDepositsTest() {
  try {
    console.log('T63 - ТЕСТИРОВАНИЕ РЕАЛЬНЫХ ДЕПОЗИТОВ UNI/TON');
    console.log('='.repeat(50));
    
    // 1. Анализ текущих депозитов
    const activeUsers = await checkRealDeposits();
    
    if (activeUsers.length === 0) {
      console.log('❌ Нет пользователей с активными депозитами');
      return;
    }
    
    // 2. Симуляция farming с реальными депозитами
    await simulateRealFarming(activeUsers);
    
    // 3. Проверка реферальных начислений
    await checkReferralEarnings();
    
    console.log('\n✅ T63 COMPLETED: Тестирование реальных депозитов завершено');
    
  } catch (error) {
    console.error('❌ T63 ERROR:', error.message);
    console.error(error.stack);
  }
}

// Запуск тестирования
runRealDepositsTest();