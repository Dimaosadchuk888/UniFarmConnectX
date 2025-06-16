/**
 * T64 - Проверка начислений по партнерской сети
 * Тестирование реферальных начислений на реальной 20-уровневой структуре
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

/**
 * Получает структуру реферальной цепочки
 */
async function getReferralChainStructure() {
  console.log('=== АНАЛИЗ РЕФЕРАЛЬНОЙ СТРУКТУРЫ ===');
  
  const { data: chainUsers, error } = await supabase
    .from('users')
    .select('id, telegram_id, username, balance_uni, balance_ton, referred_by, uni_farming_rate, uni_deposit_amount')
    .gte('telegram_id', 20000000001)
    .lte('telegram_id', 20000000020)
    .order('telegram_id');
    
  if (error) {
    console.error('Ошибка получения цепочки:', error.message);
    return [];
  }
  
  console.log(`Найдено ${chainUsers.length} пользователей в цепочке`);
  console.log('Структура цепочки:');
  
  chainUsers.forEach((user, index) => {
    const level = index + 1;
    const hasDeposit = user.uni_farming_rate > 0 ? 'UNI_FARMING' : 'NO_DEPOSIT';
    console.log(`Level ${level}: User ID ${user.id} → Referrer: ${user.referred_by || 'TOP'} | ${hasDeposit}`);
  });
  
  return chainUsers;
}

/**
 * Симулирует один цикл UNI farming с реферальными начислениями
 */
async function simulateUniFarmingCycle(chainUsers) {
  console.log('\n=== СИМУЛЯЦИЯ UNI FARMING ЦИКЛА ===');
  
  // Получаем пользователей с активным UNI farming
  const activeFarmers = chainUsers.filter(user => user.uni_farming_rate > 0);
  console.log(`Активных UNI фармеров: ${activeFarmers.length}`);
  
  const farmingResults = [];
  
  for (const farmer of activeFarmers) {
    // Рассчитываем доход за 5 минут
    const farmingRate = parseFloat(farmer.uni_farming_rate);
    const income = farmingRate * (5 / 60); // 5 минут из 60 в часе
    const currentBalance = parseFloat(farmer.balance_uni);
    const newBalance = currentBalance + income;
    
    console.log(`User ID ${farmer.id}: +${income.toFixed(6)} UNI (${currentBalance} → ${newBalance.toFixed(6)})`);
    
    // Обновляем баланс в базе данных
    const { error } = await supabase
      .from('users')
      .update({ balance_uni: newBalance.toFixed(6) })
      .eq('id', farmer.id);
      
    if (error) {
      console.error(`Ошибка обновления баланса User ID ${farmer.id}:`, error.message);
      continue;
    }
    
    farmingResults.push({
      userId: farmer.id,
      income: income,
      newBalance: newBalance,
      referrerId: farmer.referred_by
    });
    
    // Создаем транзакцию farming дохода
    await supabase
      .from('transactions')
      .insert({
        user_id: farmer.id,
        type: 'FARMING_REWARD',
        status: 'completed',
        description: `UNI farming income: ${income.toFixed(6)} UNI (rate: ${farmingRate})`
      });
  }
  
  return farmingResults;
}

/**
 * Строит полную реферальную цепочку для пользователя
 */
async function buildReferrerChain(userId, chainUsers) {
  const referrerChain = [];
  let currentUserId = userId;
  let level = 0;
  
  while (level < 20) {
    const user = chainUsers.find(u => u.id === parseInt(currentUserId));
    if (!user || !user.referred_by) {
      break;
    }
    
    referrerChain.push(user.referred_by);
    currentUserId = user.referred_by;
    level++;
  }
  
  return referrerChain;
}

/**
 * Рассчитывает реферальные комиссии по 20-уровневой системе
 */
function calculateReferralCommissions(amount, referrerChain) {
  const commissions = [];
  const baseReward = amount * 0.01; // 1% базовая ставка
  
  for (let i = 0; i < referrerChain.length && i < 20; i++) {
    const level = i + 1;
    const userId = referrerChain[i];
    
    // Рассчитываем процент комиссии по уровням
    let percentage;
    if (level === 1) {
      percentage = 100; // 1-й уровень получает 100% от базовой ставки
    } else {
      percentage = Math.max(2, 22 - level); // 2-20 уровни: убывающий процент от 20% до 2%
    }
    
    const commissionAmount = (baseReward * percentage) / 100;
    
    commissions.push({
      userId: userId,
      level: level,
      percentage: percentage,
      amount: commissionAmount,
      formattedAmount: commissionAmount.toFixed(8)
    });
  }
  
  return commissions;
}

/**
 * Обрабатывает реферальные начисления для всех farming результатов
 */
async function processReferralRewards(farmingResults, chainUsers) {
  console.log('\n=== ОБРАБОТКА РЕФЕРАЛЬНЫХ НАЧИСЛЕНИЙ ===');
  
  const allReferralRewards = [];
  
  for (const farmingResult of farmingResults) {
    if (!farmingResult.referrerId) {
      console.log(`User ID ${farmingResult.userId}: нет реферера`);
      continue;
    }
    
    console.log(`\nОбрабатываю реферальные начисления для User ID ${farmingResult.userId} (доход: ${farmingResult.income.toFixed(6)} UNI)`);
    
    // Строим реферальную цепочку
    const referrerChain = await buildReferrerChain(farmingResult.userId, chainUsers);
    console.log(`Цепочка рефереров: ${referrerChain.length} уровней`);
    
    if (referrerChain.length === 0) {
      continue;
    }
    
    // Рассчитываем комиссии
    const commissions = calculateReferralCommissions(farmingResult.income, referrerChain);
    
    // Применяем начисления
    for (const commission of commissions) {
      try {
        // Получаем текущий баланс реферера
        const { data: referrer, error } = await supabase
          .from('users')
          .select('id, username, balance_uni')
          .eq('id', commission.userId)
          .single();
          
        if (error || !referrer) {
          console.log(`  Level ${commission.level}: Referrer ID ${commission.userId} не найден`);
          continue;
        }
        
        const currentBalance = parseFloat(referrer.balance_uni);
        const newBalance = currentBalance + commission.amount;
        
        // Обновляем баланс реферера
        await supabase
          .from('users')
          .update({ balance_uni: newBalance.toFixed(8) })
          .eq('id', commission.userId);
          
        console.log(`  Level ${commission.level}: ${referrer.username} (ID ${commission.userId}) +${commission.formattedAmount} UNI (${commission.percentage}%)`);
        console.log(`    Баланс: ${currentBalance.toFixed(6)} → ${newBalance.toFixed(6)} UNI`);
        
        // Создаем транзакцию реферального вознаграждения
        await supabase
          .from('transactions')
          .insert({
            user_id: commission.userId,
            type: 'REFERRAL_REWARD',
            status: 'completed',
            description: `Referral reward L${commission.level} from User ID ${farmingResult.userId}: ${commission.formattedAmount} UNI (${commission.percentage}%)`
          });
          
        allReferralRewards.push({
          sourceUserId: farmingResult.userId,
          referrerId: commission.userId,
          level: commission.level,
          percentage: commission.percentage,
          amount: commission.amount,
          sourceIncome: farmingResult.income
        });
        
      } catch (error) {
        console.error(`  Level ${commission.level}: Ошибка начисления:`, error.message);
      }
    }
  }
  
  return allReferralRewards;
}

/**
 * Генерирует отчет о реферальных начислениях
 */
function generateReferralReport(farmingResults, referralRewards) {
  console.log('\n=== T64 ОТЧЕТ О РЕФЕРАЛЬНЫХ НАЧИСЛЕНИЯХ ===');
  
  console.log('\n📊 СТАТИСТИКА FARMING:');
  console.log(`Активных фармеров: ${farmingResults.length}`);
  const totalFarmingIncome = farmingResults.reduce((sum, r) => sum + r.income, 0);
  console.log(`Общий доход от UNI farming: ${totalFarmingIncome.toFixed(6)} UNI`);
  
  console.log('\n💰 СТАТИСТИКА РЕФЕРАЛЬНЫХ НАЧИСЛЕНИЙ:');
  console.log(`Всего реферальных начислений: ${referralRewards.length}`);
  
  const totalReferralRewards = referralRewards.reduce((sum, r) => sum + r.amount, 0);
  console.log(`Общая сумма реферальных наград: ${totalReferralRewards.toFixed(8)} UNI`);
  
  // Группируем по уровням
  const rewardsByLevel = {};
  referralRewards.forEach(reward => {
    if (!rewardsByLevel[reward.level]) {
      rewardsByLevel[reward.level] = { count: 0, total: 0 };
    }
    rewardsByLevel[reward.level].count++;
    rewardsByLevel[reward.level].total += reward.amount;
  });
  
  console.log('\n📈 РАСПРЕДЕЛЕНИЕ ПО УРОВНЯМ:');
  Object.keys(rewardsByLevel).sort((a, b) => parseInt(a) - parseInt(b)).forEach(level => {
    const stats = rewardsByLevel[level];
    console.log(`Level ${level}: ${stats.count} начислений, ${stats.total.toFixed(8)} UNI`);
  });
  
  return {
    farmingIncome: totalFarmingIncome,
    referralRewards: totalReferralRewards,
    rewardsByLevel
  };
}

/**
 * Основная функция T64
 */
async function testReferralNetwork() {
  try {
    console.log('T64 - ПРОВЕРКА НАЧИСЛЕНИЙ ПО ПАРТНЕРСКОЙ СЕТИ');
    console.log('='.repeat(70));
    
    // 1. Анализируем структуру реферальной цепочки
    const chainUsers = await getReferralChainStructure();
    
    if (chainUsers.length === 0) {
      console.log('❌ Реферальная цепочка не найдена');
      return;
    }
    
    // 2. Симулируем UNI farming цикл
    const farmingResults = await simulateUniFarmingCycle(chainUsers);
    
    if (farmingResults.length === 0) {
      console.log('❌ Нет активных UNI фармеров');
      return;
    }
    
    // 3. Обрабатываем реферальные начисления
    const referralRewards = await processReferralRewards(farmingResults, chainUsers);
    
    // 4. Генерируем отчет
    const report = generateReferralReport(farmingResults, referralRewards);
    
    console.log('\n✅ T64 COMPLETED: Тестирование партнерской сети завершено');
    console.log(`🎯 Результат: ${farmingResults.length} фармеров → ${referralRewards.length} реферальных начислений`);
    
    return {
      chainUsers,
      farmingResults,
      referralRewards,
      report
    };
    
  } catch (error) {
    console.error('❌ T64 CRITICAL ERROR:', error.message);
    console.error(error.stack);
  }
}

// Запуск тестирования
testReferralNetwork();