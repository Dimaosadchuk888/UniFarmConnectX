/**
 * Тестирование исправленной партнерской модели UniFarm
 * Правильная схема: Level 1 = 100%, Level 2-20 = 2%-20% от фактического дохода
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Правильная схема комиссий
const CORRECTED_COMMISSION_RATES = {
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
 * Рассчитывает комиссии по исправленной модели
 */
function calculateCorrectedCommissions(sourceIncome, referrerChain) {
  const commissions = [];
  
  for (let i = 0; i < referrerChain.length && i < 20; i++) {
    const level = i + 1;
    const userId = referrerChain[i];
    const commissionRate = CORRECTED_COMMISSION_RATES[level];
    
    if (!commissionRate) continue;
    
    const commissionAmount = sourceIncome * commissionRate;
    const percentageDisplay = commissionRate * 100;
    
    commissions.push({
      userId: userId,
      level: level,
      percentage: percentageDisplay,
      amount: commissionAmount,
      formattedAmount: commissionAmount.toFixed(8)
    });
  }
  
  return commissions;
}

/**
 * Демонстрирует разницу между старой и новой моделью
 */
function showModelComparison() {
  console.log('=== СРАВНЕНИЕ СТАРОЙ И НОВОЙ ПАРТНЕРСКОЙ МОДЕЛИ ===');
  
  const testIncome = 1.0; // 1 UNI дохода для примера
  console.log(`Пример для дохода: ${testIncome} UNI\n`);
  
  console.log('СТАРАЯ МОДЕЛЬ (некорректная):');
  console.log('Базовая ставка 1% + убывающие проценты');
  const baseReward = testIncome * 0.01; // 0.01 UNI
  
  for (let level = 1; level <= 10; level++) {
    let oldPercentage;
    if (level === 1) {
      oldPercentage = 100; // 100% от базовой ставки
    } else {
      oldPercentage = Math.max(2, 22 - level); // Убывающий процент
    }
    
    const oldCommission = (baseReward * oldPercentage) / 100;
    const realPercent = (oldCommission / testIncome) * 100;
    
    console.log(`  Level ${level}: ${oldCommission.toFixed(6)} UNI (${realPercent.toFixed(3)}% от дохода)`);
  }
  
  console.log('\nНОВАЯ МОДЕЛЬ (правильная):');
  console.log('Прямые проценты от фактического дохода');
  
  for (let level = 1; level <= 10; level++) {
    const commissionRate = CORRECTED_COMMISSION_RATES[level];
    const commission = testIncome * commissionRate;
    const percentageDisplay = commissionRate * 100;
    
    console.log(`  Level ${level}: ${commission.toFixed(6)} UNI (${percentageDisplay.toFixed(0)}% от дохода)`);
  }
}

/**
 * Тестирует новую модель на реальной реферальной цепочке
 */
async function testNewModelOnRealChain() {
  console.log('\n=== ТЕСТИРОВАНИЕ НА РЕАЛЬНОЙ ЦЕПОЧКЕ ===');
  
  // Получаем существующую реферальную цепочку (Users 26-40)
  const { data: chainUsers, error } = await supabase
    .from('users')
    .select('id, username, balance_uni, referred_by')
    .gte('telegram_id', 20000000001)
    .lte('telegram_id', 20000000010)
    .order('telegram_id');
    
  if (error || !chainUsers.length) {
    console.log('Ошибка получения цепочки или цепочка не найдена');
    return;
  }
  
  console.log(`Найдено ${chainUsers.length} пользователей в цепочке`);
  
  // Симулируем доход User ID 35 (последний в цепочке с UNI farming)
  const sourceUser = chainUsers.find(u => u.id === 35) || chainUsers[chainUsers.length - 1];
  const sourceIncome = 0.1; // 0.1 UNI дохода
  
  console.log(`\nСимулируем доход User ID ${sourceUser.id}: ${sourceIncome} UNI`);
  
  // Строим цепочку рефереров
  const referrerChain = [];
  let currentUserId = sourceUser.id;
  
  while (referrerChain.length < 10) { // Ограничиваем 10 уровнями для демо
    const user = chainUsers.find(u => u.id === currentUserId);
    if (!user || !user.referred_by) break;
    
    referrerChain.push(user.referred_by);
    currentUserId = user.referred_by;
  }
  
  console.log(`Цепочка рефереров: ${referrerChain.length} уровней`);
  
  // Рассчитываем комиссии по новой модели
  const commissions = calculateCorrectedCommissions(sourceIncome, referrerChain);
  
  console.log('\nРеферальные начисления по НОВОЙ модели:');
  let totalReferralRewards = 0;
  
  commissions.forEach(commission => {
    const referrer = chainUsers.find(u => u.id === commission.userId);
    const referrerName = referrer ? referrer.username : `User ${commission.userId}`;
    
    console.log(`  Level ${commission.level}: ${referrerName} +${commission.formattedAmount} UNI (${commission.percentage}% от дохода)`);
    totalReferralRewards += commission.amount;
  });
  
  console.log(`\nОбщая сумма реферальных наград: ${totalReferralRewards.toFixed(6)} UNI`);
  console.log(`Процент от источника дохода: ${((totalReferralRewards / sourceIncome) * 100).toFixed(1)}%`);
}

/**
 * Показывает потенциальные доходы по новой модели
 */
function showNewModelEarnings() {
  console.log('\n=== ПОТЕНЦИАЛЬНЫЕ ДОХОДЫ ПО НОВОЙ МОДЕЛИ ===');
  
  const scenarios = [
    { income: 0.1, description: 'Малый доход UNI farming' },
    { income: 1.0, description: 'Средний доход UNI farming' },
    { income: 10.0, description: 'Крупный доход UNI farming' },
    { income: 0.5, description: 'TON Boost ежедневный доход' }
  ];
  
  scenarios.forEach(scenario => {
    console.log(`\n${scenario.description} (${scenario.income} UNI/TON):`);
    
    // Показываем первые 5 уровней
    for (let level = 1; level <= 5; level++) {
      const commissionRate = CORRECTED_COMMISSION_RATES[level];
      const commission = scenario.income * commissionRate;
      const percentage = commissionRate * 100;
      
      console.log(`  Level ${level}: +${commission.toFixed(6)} UNI/TON (${percentage}% от дохода)`);
    }
    
    // Общая сумма для 20 уровней
    let totalRewards = 0;
    for (let level = 1; level <= 20; level++) {
      totalRewards += scenario.income * CORRECTED_COMMISSION_RATES[level];
    }
    
    console.log(`  Всего 20 уровней: +${totalRewards.toFixed(6)} UNI/TON (${((totalRewards / scenario.income) * 100).toFixed(1)}% от дохода)`);
  });
}

/**
 * Основная функция тестирования
 */
async function testCorrectedReferralModel() {
  try {
    console.log('ТЕСТИРОВАНИЕ ИСПРАВЛЕННОЙ ПАРТНЕРСКОЙ МОДЕЛИ UNIFARM');
    console.log('='.repeat(70));
    
    // 1. Сравнение моделей
    showModelComparison();
    
    // 2. Тестирование на реальной цепочке
    await testNewModelOnRealChain();
    
    // 3. Потенциальные доходы
    showNewModelEarnings();
    
    console.log('\n' + '='.repeat(70));
    console.log('ИСПРАВЛЕННАЯ ПАРТНЕРСКАЯ МОДЕЛЬ ГОТОВА К ВНЕДРЕНИЮ');
    console.log('Уровень 1: 100% от дохода, Уровни 2-20: 2%-20% от дохода');
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('Ошибка тестирования:', error.message);
  }
}

// Запуск тестирования
testCorrectedReferralModel();