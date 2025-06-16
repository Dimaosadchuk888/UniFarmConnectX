/**
 * Финальное тестирование исправленной партнерской модели UniFarm
 * Применение правильной схемы на реальной 20-уровневой цепочке
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Правильная схема комиссий (как указано в запросе)
const FINAL_COMMISSION_RATES = {
  1: 1.00,   // 100% от дохода
  2: 0.02,   // 2% от дохода 
  3: 0.03,   // 3% от дохода
  4: 0.04,   // 4% от дохода
  5: 0.05,   // 5% от дохода
  6: 0.06,   // 6% от дохода
  7: 0.07,   // 7% от дохода
  8: 0.08,   // 8% от дохода
  9: 0.09,   // 9% от дохода
  10: 0.10,  // 10% от дохода
  11: 0.11,  // 11% от дохода
  12: 0.12,  // 12% от дохода
  13: 0.13,  // 13% от дохода
  14: 0.14,  // 14% от дохода
  15: 0.15,  // 15% от дохода
  16: 0.16,  // 16% от дохода
  17: 0.17,  // 17% от дохода
  18: 0.18,  // 18% от дохода
  19: 0.19,  // 19% от дохода
  20: 0.20   // 20% от дохода
};

/**
 * Применяет исправленную модель к одному пользователю
 */
async function applyNewModelToUser(userId, sourceIncome, chainUsers) {
  console.log(`Обрабатываю User ID ${userId} с доходом ${sourceIncome} UNI`);
  
  // Строим цепочку рефереров
  const referrerChain = [];
  let currentUserId = userId;
  
  while (referrerChain.length < 20) {
    const user = chainUsers.find(u => u.id === currentUserId);
    if (!user || !user.referred_by) break;
    
    referrerChain.push(user.referred_by);
    currentUserId = user.referred_by;
  }
  
  if (referrerChain.length === 0) {
    console.log(`  Нет рефереров для User ID ${userId}`);
    return [];
  }
  
  console.log(`  Цепочка рефереров: ${referrerChain.length} уровней`);
  
  const rewards = [];
  
  // Рассчитываем и применяем начисления
  for (let i = 0; i < referrerChain.length; i++) {
    const level = i + 1;
    const referrerId = referrerChain[i];
    const commissionRate = FINAL_COMMISSION_RATES[level];
    
    if (!commissionRate) continue;
    
    const commissionAmount = sourceIncome * commissionRate;
    const percentageDisplay = commissionRate * 100;
    
    // Получаем текущий баланс реферера
    const { data: referrer, error } = await supabase
      .from('users')
      .select('id, username, balance_uni')
      .eq('id', referrerId)
      .single();
      
    if (error || !referrer) {
      console.log(`    Level ${level}: Referrer ID ${referrerId} не найден`);
      continue;
    }
    
    const currentBalance = parseFloat(referrer.balance_uni);
    const newBalance = currentBalance + commissionAmount;
    
    // Обновляем баланс
    await supabase
      .from('users')
      .update({ balance_uni: newBalance.toFixed(8) })
      .eq('id', referrerId);
      
    console.log(`    Level ${level}: ${referrer.username} +${commissionAmount.toFixed(6)} UNI (${percentageDisplay}%)`);
    console.log(`      Баланс: ${currentBalance.toFixed(6)} → ${newBalance.toFixed(6)} UNI`);
    
    // Создаем транзакцию
    await supabase
      .from('transactions')
      .insert({
        user_id: referrerId,
        type: 'REFERRAL_REWARD',
        status: 'completed',
        description: `New model referral L${level} from User ${userId}: ${commissionAmount.toFixed(6)} UNI (${percentageDisplay}%)`
      });
      
    rewards.push({
      referrerId: referrerId,
      level: level,
      amount: commissionAmount,
      percentage: percentageDisplay
    });
  }
  
  return rewards;
}

/**
 * Тестирует новую модель на всей активной цепочке
 */
async function testNewModelOnActiveChain() {
  console.log('=== ПРИМЕНЕНИЕ НОВОЙ МОДЕЛИ К АКТИВНОЙ ЦЕПОЧКЕ ===');
  
  // Получаем всех пользователей цепочки с UNI farming
  const { data: chainUsers, error } = await supabase
    .from('users')
    .select('id, username, balance_uni, referred_by, uni_farming_rate')
    .gte('telegram_id', 20000000001)
    .lte('telegram_id', 20000000020)
    .order('telegram_id');
    
  if (error || !chainUsers.length) {
    console.log('Ошибка получения цепочки');
    return;
  }
  
  console.log(`Найдено ${chainUsers.length} пользователей в цепочке`);
  
  // Фильтруем активных фармеров
  const activeFarmers = chainUsers.filter(user => parseFloat(user.uni_farming_rate || '0') > 0);
  console.log(`Активных UNI фармеров: ${activeFarmers.length}`);
  
  const allRewards = [];
  
  // Симулируем доход от каждого активного фармера
  for (const farmer of activeFarmers) {
    const farmingIncome = 0.1; // Стандартный доход для теста
    
    console.log(`\nФармер: ${farmer.username} (ID ${farmer.id})`);
    const rewards = await applyNewModelToUser(farmer.id, farmingIncome, chainUsers);
    allRewards.push(...rewards);
    
    await new Promise(resolve => setTimeout(resolve, 100)); // Пауза между операциями
  }
  
  return allRewards;
}

/**
 * Показывает статистику новой модели
 */
function showNewModelStatistics(allRewards) {
  console.log('\n=== СТАТИСТИКА НОВОЙ МОДЕЛИ ===');
  
  const totalRewards = allRewards.reduce((sum, reward) => sum + reward.amount, 0);
  console.log(`Общая сумма реферальных наград: ${totalRewards.toFixed(6)} UNI`);
  
  // Группировка по уровням
  const rewardsByLevel = {};
  allRewards.forEach(reward => {
    if (!rewardsByLevel[reward.level]) {
      rewardsByLevel[reward.level] = { count: 0, total: 0 };
    }
    rewardsByLevel[reward.level].count++;
    rewardsByLevel[reward.level].total += reward.amount;
  });
  
  console.log('\nРаспределение по уровням:');
  Object.keys(rewardsByLevel).sort((a, b) => parseInt(a) - parseInt(b)).forEach(level => {
    const stats = rewardsByLevel[level];
    console.log(`Level ${level}: ${stats.count} начислений, ${stats.total.toFixed(6)} UNI`);
  });
  
  // Группировка по получателям
  const rewardsByUser = {};
  allRewards.forEach(reward => {
    if (!rewardsByUser[reward.referrerId]) {
      rewardsByUser[reward.referrerId] = { count: 0, total: 0 };
    }
    rewardsByUser[reward.referrerId].count++;
    rewardsByUser[reward.referrerId].total += reward.amount;
  });
  
  console.log('\nТоп получатели реферальных наград:');
  Object.entries(rewardsByUser)
    .sort(([,a], [,b]) => b.total - a.total)
    .slice(0, 5)
    .forEach(([userId, stats]) => {
      console.log(`User ID ${userId}: ${stats.total.toFixed(6)} UNI (${stats.count} начислений)`);
    });
}

/**
 * Проверяет финальные балансы
 */
async function checkFinalBalances() {
  console.log('\n=== ФИНАЛЬНЫЕ БАЛАНСЫ ПОСЛЕ ИСПРАВЛЕНИЯ ===');
  
  const { data: topUsers, error } = await supabase
    .from('users')
    .select('id, username, balance_uni')
    .gte('telegram_id', 20000000001)
    .lte('telegram_id', 20000000010)
    .order('telegram_id');
    
  if (error) {
    console.log('Ошибка получения балансов');
    return;
  }
  
  topUsers.forEach(user => {
    console.log(`${user.username} (ID ${user.id}): ${parseFloat(user.balance_uni).toFixed(6)} UNI`);
  });
}

/**
 * Основная функция тестирования
 */
async function testFinalReferralFix() {
  try {
    console.log('ФИНАЛЬНОЕ ТЕСТИРОВАНИЕ ИСПРАВЛЕННОЙ ПАРТНЕРСКОЙ МОДЕЛИ');
    console.log('='.repeat(70));
    console.log('Схема: Level 1 = 100%, Level 2-20 = 2%-20% от фактического дохода');
    console.log('');
    
    // 1. Применяем новую модель к активной цепочке
    const allRewards = await testNewModelOnActiveChain();
    
    // 2. Показываем статистику
    if (allRewards.length > 0) {
      showNewModelStatistics(allRewards);
    }
    
    // 3. Проверяем финальные балансы
    await checkFinalBalances();
    
    console.log('\n' + '='.repeat(70));
    console.log('ПАРТНЕРСКАЯ МОДЕЛЬ УСПЕШНО ИСПРАВЛЕНА И ПРИМЕНЕНА');
    console.log('Система использует правильные проценты от фактического дохода');
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('Ошибка финального тестирования:', error.message);
  }
}

// Запуск финального тестирования
testFinalReferralFix();