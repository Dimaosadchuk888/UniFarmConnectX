/**
 * T63 - Создание полной 20-уровневой реферальной цепочки с реальными депозитами
 * Моделирование реальной партнерской структуры для comprehensive тестирования
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

/**
 * Генерирует уникальный реферальный код
 */
function generateRefCode(level) {
  return `REF_CHAIN_${level}_${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

/**
 * Создает 20 тестовых пользователей с цепочкой рефералов
 */
async function createReferralChain() {
  console.log('=== СОЗДАНИЕ 20-УРОВНЕВОЙ РЕФЕРАЛЬНОЙ ЦЕПОЧКИ ===');
  
  const users = [];
  let previousUserId = null;
  
  for (let level = 1; level <= 20; level++) {
    const telegram_id = 20000000000 + level; // 20000000001 → 20000000020
    const username = `chain_user_${level}`;
    const ref_code = generateRefCode(level);
    
    console.log(`Создаю User ${level}/20: telegram_id=${telegram_id}, username=${username}`);
    
    // Создаем пользователя
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        telegram_id: telegram_id,
        username: username,
        first_name: `Chain User ${level}`,
        ref_code: ref_code,
        referred_by: previousUserId, // Создаем цепочку
        balance_uni: 100.000000,
        balance_ton: 100.000000,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();
      
    if (error) {
      console.error(`❌ Ошибка создания User ${level}:`, error.message);
      continue;
    }
    
    console.log(`✅ User ${level} создан: ID=${newUser.id}, referred_by=${previousUserId || 'none'}`);
    
    users.push({
      level: level,
      id: newUser.id,
      telegram_id: telegram_id,
      username: username,
      ref_code: ref_code,
      referred_by: previousUserId
    });
    
    previousUserId = newUser.id; // Следующий пользователь будет ссылаться на этого
    
    // Пауза для избежания rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n✅ Создано ${users.length} пользователей в цепочке`);
  return users;
}

/**
 * Создает UNI farming депозиты для первых 10 пользователей
 */
async function createUniFarmingDeposits(users) {
  console.log('\n=== СОЗДАНИЕ UNI FARMING ДЕПОЗИТОВ (USERS 1-10) ===');
  
  const farmingUsers = users.slice(0, 10); // Первые 10
  const results = [];
  
  for (const user of farmingUsers) {
    console.log(`Создаю UNI депозит для User ${user.level} (ID: ${user.id})`);
    
    try {
      // Устанавливаем UNI farming параметры напрямую в базе
      const { error } = await supabase
        .from('users')
        .update({
          uni_farming_rate: '0.001', // 0.001 UNI в час
          uni_farming_start_timestamp: new Date().toISOString(),
          uni_farming_last_update: new Date().toISOString()
        })
        .eq('id', user.id);
        
      if (error) {
        console.error(`❌ Ошибка UNI депозита User ${user.level}:`, error.message);
        continue;
      }
      
      // Создаем транзакцию депозита
      await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'UNI_DEPOSIT',
          status: 'completed',
          description: `UNI farming deposit - rate 0.001 per hour`
        });
      
      console.log(`✅ UNI депозит создан для User ${user.level}`);
      
      results.push({
        userId: user.id,
        level: user.level,
        type: 'UNI_FARMING',
        rate: '0.001',
        status: 'active'
      });
      
    } catch (error) {
      console.error(`❌ Критическая ошибка User ${user.level}:`, error.message);
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log(`✅ Создано ${results.length} UNI farming депозитов`);
  return results;
}

/**
 * Создает TON Boost депозиты для последних 10 пользователей
 */
async function createTonBoostDeposits(users) {
  console.log('\n=== СОЗДАНИЕ TON BOOST ДЕПОЗИТОВ (USERS 11-20) ===');
  
  const boostUsers = users.slice(10, 20); // Последние 10
  const results = [];
  
  for (const user of boostUsers) {
    console.log(`Создаю TON Boost для User ${user.level} (ID: ${user.id})`);
    
    try {
      // Создаем TON Boost purchase
      const { data: boostPurchase, error } = await supabase
        .from('boost_purchases')
        .insert({
          user_id: user.id,
          boost_id: `boost_standard_30d`,
          amount: '50.0',
          daily_rate: '0.5',
          source: 'ton',
          status: 'confirmed',
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 дней
          is_active: true,
          total_earned: '0.0'
        })
        .select('id')
        .single();
        
      if (error) {
        console.error(`❌ Ошибка TON Boost User ${user.level}:`, error.message);
        continue;
      }
      
      // Обновляем баланс TON (симулируем покупку)
      await supabase
        .from('users')
        .update({
          balance_ton: '50.000000' // 100 - 50 = 50 TON остается
        })
        .eq('id', user.id);
      
      // Создаем транзакцию покупки
      await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'TON_BOOST_PURCHASE',
          status: 'completed',
          description: `TON Boost purchase - 50 TON for 30 days, rate 0.5 daily`
        });
      
      console.log(`✅ TON Boost создан для User ${user.level}: Boost ID=${boostPurchase.id}`);
      
      results.push({
        userId: user.id,
        level: user.level,
        type: 'TON_BOOST',
        amount: '50.0',
        dailyRate: '0.5',
        boostId: boostPurchase.id,
        status: 'active'
      });
      
    } catch (error) {
      console.error(`❌ Критическая ошибка User ${user.level}:`, error.message);
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log(`✅ Создано ${results.length} TON Boost депозитов`);
  return results;
}

/**
 * Генерирует отчет о созданной структуре
 */
function generateReport(users, farmingDeposits, boostDeposits) {
  console.log('\n=== T63 ИТОГОВЫЙ ОТЧЕТ ===');
  console.log('Структура 20-уровневой реферальной цепочки:');
  console.log('');
  
  users.forEach(user => {
    const depositInfo = farmingDeposits.find(d => d.userId === user.id) || 
                       boostDeposits.find(d => d.userId === user.id);
    
    const depositType = depositInfo ? depositInfo.type : 'NO_DEPOSIT';
    const referrerInfo = user.referred_by ? `→ Referrer ID: ${user.referred_by}` : '→ TOP LEVEL';
    
    console.log(`Level ${user.level.toString().padStart(2)}: User ID ${user.id} (${user.telegram_id}) ${depositType} ${referrerInfo}`);
  });
  
  console.log('');
  console.log('📊 СТАТИСТИКА:');
  console.log(`Всего пользователей: ${users.length}`);
  console.log(`UNI Farming депозитов: ${farmingDeposits.length}`);
  console.log(`TON Boost депозитов: ${boostDeposits.length}`);
  console.log(`Общая длина цепочки: ${users.length} уровней`);
  console.log('');
  console.log('🔗 РЕФЕРАЛЬНАЯ ЦЕПОЧКА:');
  console.log(`User ${users[0]?.id} → User ${users[1]?.id} → User ${users[2]?.id} → ... → User ${users[19]?.id}`);
}

/**
 * Основная функция создания реферальной структуры
 */
async function createFullReferralStructure() {
  try {
    console.log('T63 - СОЗДАНИЕ 20-УРОВНЕВОЙ РЕФЕРАЛЬНОЙ СТРУКТУРЫ');
    console.log('='.repeat(70));
    
    // 1. Создаем 20 пользователей в цепочке
    const users = await createReferralChain();
    
    if (users.length < 20) {
      console.log('❌ Не удалось создать полную цепочку пользователей');
      return;
    }
    
    // 2. Создаем UNI farming депозиты для первых 10
    const farmingDeposits = await createUniFarmingDeposits(users);
    
    // 3. Создаем TON Boost депозиты для последних 10
    const boostDeposits = await createTonBoostDeposits(users);
    
    // 4. Генерируем отчет
    generateReport(users, farmingDeposits, boostDeposits);
    
    console.log('\n✅ T63 COMPLETED: 20-уровневая реферальная структура создана');
    console.log('🚀 Готово к T64 - тестированию начислений по партнерской сети');
    
  } catch (error) {
    console.error('❌ T63 CRITICAL ERROR:', error.message);
    console.error(error.stack);
  }
}

// Запуск создания структуры
createFullReferralStructure();