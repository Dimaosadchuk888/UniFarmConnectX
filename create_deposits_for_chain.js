/**
 * T63 - Создание депозитов для 20-уровневой реферальной цепочки
 * UNI farming для первых 10, TON Boost для последних 10
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

/**
 * Создает UNI farming депозиты для Users ID 26-35 (первые 10)
 */
async function createUniFarmingDeposits() {
  console.log('=== СОЗДАНИЕ UNI FARMING ДЕПОЗИТОВ (USERS 26-35) ===');
  
  const farmingUsers = [26, 27, 28, 29, 30, 31, 32, 33, 34, 35];
  const results = [];
  
  for (const userId of farmingUsers) {
    console.log(`Создаю UNI депозит для User ID ${userId}`);
    
    try {
      // Устанавливаем UNI farming параметры
      const { error } = await supabase
        .from('users')
        .update({
          uni_farming_rate: 0.001, // 0.001 UNI в час
          uni_farming_start_timestamp: new Date().toISOString(),
          uni_farming_last_update: new Date().toISOString(),
          uni_deposit_amount: 50.0 // Депозит 50 UNI
        })
        .eq('id', userId);
        
      if (error) {
        console.error(`❌ Ошибка UNI депозита User ${userId}:`, error.message);
        continue;
      }
      
      // Создаем транзакцию депозита
      await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          type: 'UNI_DEPOSIT',
          status: 'completed',
          description: `UNI farming deposit - 50 UNI, rate 0.001 per hour`
        });
      
      console.log(`✅ UNI депозит создан для User ID ${userId}`);
      
      results.push({
        userId: userId,
        type: 'UNI_FARMING',
        amount: '50.0',
        rate: '0.001',
        status: 'active'
      });
      
    } catch (error) {
      console.error(`❌ Критическая ошибка User ${userId}:`, error.message);
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`✅ Создано ${results.length} UNI farming депозитов`);
  return results;
}

/**
 * Создает TON Boost депозиты для Users ID 36-45 (последние 10)
 */
async function createTonBoostDeposits() {
  console.log('\n=== СОЗДАНИЕ TON BOOST ДЕПОЗИТОВ (USERS 36-45) ===');
  
  const boostUsers = [36, 37, 38, 39, 40, 41, 42, 43, 44, 45];
  const results = [];
  
  for (const userId of boostUsers) {
    console.log(`Создаю TON Boost для User ID ${userId}`);
    
    try {
      // Создаем TON Boost purchase
      const { data: boostPurchase, error } = await supabase
        .from('boost_purchases')
        .insert({
          user_id: userId,
          boost_id: `boost_standard_30d`,
          amount: '50.0',
          daily_rate: '0.5',
          source: 'ton',
          status: 'confirmed',
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          is_active: true,
          total_earned: '0.0'
        })
        .select('id')
        .single();
        
      if (error) {
        console.error(`❌ Ошибка TON Boost User ${userId}:`, error.message);
        continue;
      }
      
      // Обновляем баланс TON (симулируем покупку)
      await supabase
        .from('users')
        .update({
          balance_ton: 50.000000 // 100 - 50 = 50 TON остается
        })
        .eq('id', userId);
      
      // Создаем транзакцию покупки
      await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          type: 'TON_BOOST_PURCHASE',
          status: 'completed',
          description: `TON Boost purchase - 50 TON for 30 days, rate 0.5 daily`
        });
      
      console.log(`✅ TON Boost создан для User ID ${userId}: Boost ID=${boostPurchase.id}`);
      
      results.push({
        userId: userId,
        type: 'TON_BOOST',
        amount: '50.0',
        dailyRate: '0.5',
        boostId: boostPurchase.id,
        status: 'active'
      });
      
    } catch (error) {
      console.error(`❌ Критическая ошибка User ${userId}:`, error.message);
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`✅ Создано ${results.length} TON Boost депозитов`);
  return results;
}

/**
 * Проверяет созданную структуру
 */
async function verifyReferralStructure() {
  console.log('\n=== ВЕРИФИКАЦИЯ РЕФЕРАЛЬНОЙ СТРУКТУРЫ ===');
  
  // Проверяем всех пользователей цепочки
  const { data: chainUsers, error } = await supabase
    .from('users')
    .select('id, telegram_id, username, balance_uni, balance_ton, referred_by, uni_farming_rate, uni_deposit_amount')
    .gte('telegram_id', 20000000001)
    .lte('telegram_id', 20000000020)
    .order('telegram_id');
    
  if (error) {
    console.error('❌ Ошибка проверки структуры:', error.message);
    return;
  }
  
  console.log('\n📊 СТРУКТУРА 20-УРОВНЕВОЙ РЕФЕРАЛЬНОЙ ЦЕПОЧКИ:');
  console.log('Level | User ID | Telegram ID    | Balance UNI/TON | Referred By | Deposit Type');
  console.log('------|---------|----------------|-----------------|-------------|-------------');
  
  chainUsers.forEach((user, index) => {
    const level = index + 1;
    const depositType = user.uni_farming_rate > 0 ? 'UNI_FARMING' : 'TON_BOOST';
    const referredBy = user.referred_by || 'TOP_LEVEL';
    
    console.log(`${level.toString().padStart(5)} | ${user.id.toString().padStart(7)} | ${user.telegram_id} | ${user.balance_uni}/${user.balance_ton} | ${referredBy.toString().padStart(11)} | ${depositType}`);
  });
  
  // Проверяем TON Boost депозиты
  const { data: boostPurchases } = await supabase
    .from('boost_purchases')
    .select('user_id, boost_id, amount, daily_rate, status')
    .eq('status', 'confirmed');
    
  console.log(`\n📈 СТАТИСТИКА ДЕПОЗИТОВ:`);
  console.log(`Всего пользователей в цепочке: ${chainUsers.length}`);
  console.log(`UNI farming депозитов: ${chainUsers.filter(u => u.uni_farming_rate > 0).length}`);
  console.log(`TON Boost депозитов: ${boostPurchases?.length || 0}`);
  
  return chainUsers;
}

/**
 * Основная функция создания депозитов
 */
async function createDepositsForChain() {
  try {
    console.log('T63 - СОЗДАНИЕ ДЕПОЗИТОВ ДЛЯ 20-УРОВНЕВОЙ ЦЕПОЧКИ');
    console.log('='.repeat(60));
    
    // 1. Создаем UNI farming депозиты для первых 10
    const farmingDeposits = await createUniFarmingDeposits();
    
    // 2. Создаем TON Boost депозиты для последних 10
    const boostDeposits = await createTonBoostDeposits();
    
    // 3. Верифицируем структуру
    const chainUsers = await verifyReferralStructure();
    
    console.log('\n✅ T63 STEP 1 COMPLETED: 20-уровневая реферальная структура с депозитами готова');
    console.log('🚀 Готово к T64 - тестированию начислений по партнерской сети');
    
    return {
      chainUsers,
      farmingDeposits,
      boostDeposits
    };
    
  } catch (error) {
    console.error('❌ T63 CRITICAL ERROR:', error.message);
  }
}

// Запуск создания депозитов
createDepositsForChain();