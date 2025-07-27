#!/usr/bin/env tsx

/**
 * 🚨 АНАЛИЗ TON BOOST ДЕПОЗИТОВ - ПРОСТАЯ ДИАГНОСТИКА
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function analyzeBoostDeposits() {
  console.log('🚨 АНАЛИЗ TON BOOST ДЕПОЗИТОВ ЗА ПОСЛЕДНИЙ ЧАС');
  console.log('=' .repeat(50));
  
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  try {
    // 1. НОВЫЕ BOOST_PURCHASE ТРАНЗАКЦИИ
    console.log('1️⃣ Поиск новых BOOST_PURCHASE транзакций...');
    
    const { data: boostPurchases } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'BOOST_PURCHASE')
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false });

    console.log(`💰 BOOST_PURCHASE за час: ${boostPurchases?.length || 0}`);
    
    boostPurchases?.forEach(tx => {
      console.log(`User ${tx.user_id}: ${tx.amount} TON (${tx.created_at})`);
    });

    // 2. ПРОВЕРЯЕМ АКТИВАЦИЮ В USERS
    if (boostPurchases && boostPurchases.length > 0) {
      console.log('\n2️⃣ Проверка активации в таблице users...');
      
      const userIds = boostPurchases.map(tx => parseInt(tx.user_id));
      
      const { data: users } = await supabase
        .from('users')
        .select('id, username, ton_boost_active, ton_boost_package, ton_boost_rate')
        .in('id', userIds);

      console.log('\n👥 СТАТУС АКТИВАЦИИ:');
      users?.forEach(user => {
        console.log(`User ${user.id}: Active=${user.ton_boost_active}, Package=${user.ton_boost_package}, Rate=${user.ton_boost_rate}`);
      });

      // 3. ПРОВЕРЯЕМ TON_FARMING_DATA
      console.log('\n3️⃣ Проверка ton_farming_data...');
      
      const { data: farmingData } = await supabase
        .from('ton_farming_data')
        .select('*')
        .in('user_id', userIds.map(id => id.toString()));

      console.log(`🌾 Записей в ton_farming_data: ${farmingData?.length || 0}`);
      
      const farmingUserIds = farmingData?.map(d => parseInt(d.user_id)) || [];
      const missingUsers = userIds.filter(id => !farmingUserIds.includes(id));
      
      if (missingUsers.length > 0) {
        console.log(`\n⚠️  ОТСУТСТВУЮТ В TON_FARMING_DATA: ${missingUsers.join(', ')}`);
        console.log('   👆 ЭТИ ПОЛЬЗОВАТЕЛИ НЕ ПОЛУЧАЮТ ДОХОДЫ!');
      }

      // 4. АНАЛИЗ ПРОБЛЕМ
      console.log('\n4️⃣ АНАЛИЗ ПРОБЛЕМ:');
      
      for (const userId of userIds) {
        const user = users?.find(u => u.id === userId);
        const hasFarmingData = farmingUserIds.includes(userId);
        
        console.log(`\nUser ${userId}:`);
        console.log(`   ✅ Покупка BOOST_PURCHASE: ДА`);
        console.log(`   ${user?.ton_boost_active ? '✅' : '❌'} Активирован в users: ${user?.ton_boost_active ? 'ДА' : 'НЕТ'}`);
        console.log(`   ${hasFarmingData ? '✅' : '❌'} Запись в ton_farming_data: ${hasFarmingData ? 'ДА' : 'НЕТ'}`);
        
        if (!user?.ton_boost_active || !hasFarmingData) {
          console.log(`   🚨 ПРОБЛЕМА: Пользователь НЕ БУДЕТ получать доходы от планировщика!`);
        }
      }
    }

    // 5. ОБЩИЙ АНАЛИЗ ПЛАНИРОВЩИКА
    console.log('\n5️⃣ Анализ планировщика (кто сейчас активен)...');
    
    const { data: activeInScheduler } = await supabase
      .from('ton_farming_data')
      .select('user_id, farming_balance, farming_rate, boost_package_id');

    console.log(`📈 ВСЕГО АКТИВНЫХ В ПЛАНИРОВЩИКЕ: ${activeInScheduler?.length || 0}`);
    
    return {
      new_purchases: boostPurchases?.length || 0,
      users_with_purchases: boostPurchases?.map(tx => tx.user_id) || [],
      active_in_scheduler: activeInScheduler?.length || 0,
      problems_detected: missingUsers?.length || 0
    };

  } catch (error) {
    console.error('💥 ОШИБКА:', error);
    throw error;
  }
}

async function main() {
  try {
    const result = await analyzeBoostDeposits();
    
    console.log('\n📋 СВОДКА:');
    console.log(`- Новых покупок за час: ${result.new_purchases}`);
    console.log(`- Всего активных в планировщике: ${result.active_in_scheduler}`);
    console.log(`- Проблем обнаружено: ${result.problems_detected}`);
    
    if (result.problems_detected > 0) {
      console.log('\n⚠️  ТРЕБУЕТСЯ ИСПРАВЛЕНИЕ: Некоторые пользователи не активированы в планировщике');
    }
    
  } catch (error) {
    console.error('\n❌ АНАЛИЗ ПРОВАЛЕН:', error);
  }
}

main();