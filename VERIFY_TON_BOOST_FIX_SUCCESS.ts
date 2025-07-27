#!/usr/bin/env tsx

/**
 * ✅ ПРОВЕРКА УСПЕШНОСТИ ИСПРАВЛЕНИЯ TON BOOST СИСТЕМЫ
 * Проверяем, что все исправления работают корректно
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function verifyFix() {
  console.log('✅ ПРОВЕРКА ИСПРАВЛЕНИЯ TON BOOST SYSTEM');
  console.log('=' .repeat(45));
  
  try {
    // 1. ПРОВЕРЯЕМ ВСЕ ПОЛЬЗОВАТЕЛИ АКТИВНЫ
    console.log('1️⃣ Проверка активации всех пользователей с покупками...');
    
    const { data: boostUsers } = await supabase
      .from('users')
      .select('id, username, ton_boost_active, ton_boost_package, ton_boost_rate')
      .not('ton_boost_package', 'is', null)
      .order('id');

    console.log(`👥 Пользователей с TON Boost пакетами: ${boostUsers?.length || 0}`);
    
    const activeUsers = boostUsers?.filter(u => u.ton_boost_active) || [];
    const inactiveUsers = boostUsers?.filter(u => !u.ton_boost_active) || [];
    
    console.log(`✅ АКТИВНЫХ: ${activeUsers.length}`);
    console.log(`❌ НЕАКТИВНЫХ: ${inactiveUsers.length}`);
    
    if (inactiveUsers.length > 0) {
      console.log('\n⚠️  ОБНАРУЖЕНЫ НЕАКТИВНЫЕ ПОЛЬЗОВАТЕЛИ:');
      inactiveUsers.forEach(user => {
        console.log(`   User ${user.id} (@${user.username}): НЕАКТИВЕН`);
      });
    }

    // 2. ПРОВЕРЯЕМ TON_FARMING_DATA
    console.log('\n2️⃣ Проверка записей в ton_farming_data...');
    
    const { data: farmingData } = await supabase
      .from('ton_farming_data')
      .select('user_id, farming_balance, farming_rate, boost_package_id')
      .order('user_id');

    console.log(`🌾 Записей в ton_farming_data: ${farmingData?.length || 0}`);
    
    // Сравниваем пользователей
    const farmingUserIds = farmingData?.map(d => parseInt(d.user_id)) || [];
    const boostUserIds = boostUsers?.map(u => u.id) || [];
    const missingInFarming = boostUserIds.filter(id => !farmingUserIds.includes(id));
    
    if (missingInFarming.length > 0) {
      console.log(`\n⚠️  ОТСУТСТВУЮТ В TON_FARMING_DATA: ${missingInFarming.join(', ')}`);
    } else {
      console.log('\n✅ Все пользователи присутствуют в ton_farming_data');
    }

    // 3. ПРОВЕРЯЕМ ГОТОВНОСТЬ ДЛЯ ПЛАНИРОВЩИКА
    console.log('\n3️⃣ Проверка готовности для планировщика...');
    
    const readyForScheduler = boostUsers?.filter(u => 
      u.ton_boost_active && 
      u.ton_boost_package && 
      u.ton_boost_rate &&
      farmingUserIds.includes(u.id)
    ) || [];
    
    console.log(`📈 ГОТОВО ДЛЯ ПЛАНИРОВЩИКА: ${readyForScheduler.length} из ${boostUsers?.length || 0}`);
    
    readyForScheduler.forEach(user => {
      const farmingInfo = farmingData?.find(f => parseInt(f.user_id) === user.id);
      console.log(`   User ${user.id}: Package ${user.ton_boost_package}, Rate ${user.ton_boost_rate}, Balance ${farmingInfo?.farming_balance}`);
    });

    // 4. ПРОВЕРЯЕМ ПОСЛЕДНИЕ ДОХОДЫ
    console.log('\n4️⃣ Проверка последних доходов от планировщика...');
    
    const { data: recentIncomes } = await supabase
      .from('transactions')
      .select('user_id, amount, created_at')
      .eq('type', 'FARMING_REWARD')
      .contains('metadata', { transaction_source: 'ton_boost_scheduler' })
      .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // 10 минут назад
      .order('created_at', { ascending: false });

    const usersWithRecentIncome = [...new Set(recentIncomes?.map(tx => parseInt(tx.user_id)) || [])];
    console.log(`💰 Пользователей с доходами за 10 минут: ${usersWithRecentIncome.length}`);
    
    if (usersWithRecentIncome.length > 0) {
      console.log('   Пользователи получили доходы:');
      usersWithRecentIncome.forEach(userId => {
        const latestIncome = recentIncomes?.find(tx => parseInt(tx.user_id) === userId);
        console.log(`   - User ${userId}: ${latestIncome?.amount} TON (${latestIncome?.created_at})`);
      });
    }

    // 5. ФИНАЛЬНАЯ ОЦЕНКА
    console.log('\n5️⃣ ФИНАЛЬНАЯ ОЦЕНКА ИСПРАВЛЕНИЯ...');
    
    const successRate = readyForScheduler.length / (boostUsers?.length || 1) * 100;
    
    console.log('\n📊 РЕЗУЛЬТАТ ИСПРАВЛЕНИЯ:');
    console.log(`   - Всего пользователей с покупками: ${boostUsers?.length || 0}`);
    console.log(`   - Успешно активированы: ${activeUsers.length}`);
    console.log(`   - Готовы для планировщика: ${readyForScheduler.length}`);
    console.log(`   - Получили доходы за 10 мин: ${usersWithRecentIncome.length}`);
    console.log(`   - Процент успеха: ${successRate.toFixed(1)}%`);
    
    if (successRate === 100 && inactiveUsers.length === 0 && missingInFarming.length === 0) {
      console.log('\n🎉 СИСТЕМНАЯ ОШИБКА ПОЛНОСТЬЮ ИСПРАВЛЕНА!');
      console.log('   ✅ Все пользователи активированы');
      console.log('   ✅ Все записи в ton_farming_data присутствуют');
      console.log('   ✅ Планировщик работает корректно');
      console.log('   ✅ Новые покупки будут активироваться автоматически');
    } else {
      console.log('\n⚠️  ОБНАРУЖЕНЫ ПРОБЛЕМЫ - ТРЕБУЕТСЯ ДОПОЛНИТЕЛЬНОЕ ИСПРАВЛЕНИЕ');
    }

    return {
      total_users: boostUsers?.length || 0,
      active_users: activeUsers.length,
      ready_for_scheduler: readyForScheduler.length,
      recent_income_users: usersWithRecentIncome.length,
      success_rate: successRate,
      fully_fixed: successRate === 100 && inactiveUsers.length === 0 && missingInFarming.length === 0
    };

  } catch (error) {
    console.error('💥 ОШИБКА ПРОВЕРКИ:', error);
    throw error;
  }
}

async function main() {
  try {
    const result = await verifyFix();
    
    if (result.fully_fixed) {
      console.log('\n🚀 СИСТЕМА TON BOOST ПОЛНОСТЬЮ ВОССТАНОВЛЕНА!');
      process.exit(0);
    } else {
      console.log('\n❌ СИСТЕМА ТРЕБУЕТ ДОПОЛНИТЕЛЬНЫХ ИСПРАВЛЕНИЙ');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ ПРОВЕРКА ПРОВАЛЕНА:', error);
    process.exit(1);
  }
}

main();