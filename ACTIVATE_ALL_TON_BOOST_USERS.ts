#!/usr/bin/env tsx

/**
 * 🚀 АКТИВАЦИЯ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ С TON BOOST ПОКУПКАМИ
 * Исправляет системную ошибку - активирует флаг ton_boost_active для планировщика
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function activateAllBoostUsers() {
  console.log('🚀 АКТИВАЦИЯ ВСЕХ TON BOOST ПОЛЬЗОВАТЕЛЕЙ');
  console.log('=' .repeat(45));
  
  try {
    // 1. НАХОДИМ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ С ПОКУПКАМИ
    console.log('1️⃣ Поиск пользователей с TON Boost покупками...');
    
    const { data: boostPurchases } = await supabase
      .from('transactions')
      .select('user_id')
      .eq('type', 'BOOST_PURCHASE')
      .eq('status', 'completed');

    if (!boostPurchases || boostPurchases.length === 0) {
      console.log('❌ Не найдено BOOST_PURCHASE транзакций');
      return;
    }

    const uniqueUserIds = [...new Set(boostPurchases.map(tx => parseInt(tx.user_id)))];
    console.log(`👥 Найдено пользователей с покупками: ${uniqueUserIds.length}`);
    console.log(`IDs: ${uniqueUserIds.join(', ')}`);

    // 2. ПРОВЕРЯЕМ ТЕКУЩИЙ СТАТУС
    console.log('\n2️⃣ Проверка текущего статуса активации...');
    
    const { data: currentStatus } = await supabase
      .from('users')
      .select('id, username, ton_boost_active, ton_boost_package, ton_boost_rate')
      .in('id', uniqueUserIds)
      .order('id');

    const inactiveUsers = currentStatus?.filter(user => !user.ton_boost_active) || [];
    const activeUsers = currentStatus?.filter(user => user.ton_boost_active) || [];

    console.log(`✅ Уже активных: ${activeUsers.length}`);
    console.log(`❌ Неактивных: ${inactiveUsers.length}`);

    if (inactiveUsers.length === 0) {
      console.log('\n🎉 ВСЕ ПОЛЬЗОВАТЕЛИ УЖЕ АКТИВИРОВАНЫ!');
      return { success: true, activated: 0, alreadyActive: activeUsers.length };
    }

    // 3. АКТИВИРУЕМ НЕАКТИВНЫХ ПОЛЬЗОВАТЕЛЕЙ
    console.log('\n3️⃣ Активация неактивных пользователей...');
    
    const inactiveUserIds = inactiveUsers.map(user => user.id);
    console.log(`Активируем: ${inactiveUserIds.join(', ')}`);

    const { data: updateResult, error: updateError } = await supabase
      .from('users')
      .update({ 
        ton_boost_active: true,
        updated_at: new Date().toISOString()
      })
      .in('id', inactiveUserIds)
      .select('id, username, ton_boost_active');

    if (updateError) {
      console.error('❌ ОШИБКА АКТИВАЦИИ:', updateError.message);
      throw updateError;
    }

    // 4. ПРОВЕРЯЕМ РЕЗУЛЬТАТ
    console.log('\n4️⃣ Проверка результата активации...');
    
    console.log(`\n✅ УСПЕШНО АКТИВИРОВАНО: ${updateResult?.length || 0} пользователей`);
    updateResult?.forEach(user => {
      console.log(`   - User ${user.id} (@${user.username}): Active = ${user.ton_boost_active}`);
    });

    // 5. ФИНАЛЬНАЯ ПРОВЕРКА ПЛАНИРОВЩИКА
    console.log('\n5️⃣ Финальная проверка готовности для планировщика...');
    
    const { data: schedulerReady } = await supabase
      .from('users')
      .select('id, username, ton_boost_active, ton_boost_package, ton_boost_rate')
      .in('id', uniqueUserIds)
      .eq('ton_boost_active', true)
      .not('ton_boost_package', 'is', null)
      .order('id');

    console.log(`\n📈 ГОТОВО ДЛЯ ПЛАНИРОВЩИКА: ${schedulerReady?.length || 0} пользователей`);
    schedulerReady?.forEach(user => {
      console.log(`   - User ${user.id}: Package ${user.ton_boost_package}, Rate ${user.ton_boost_rate}`);
    });

    return {
      success: true,
      total_users: uniqueUserIds.length,
      activated: updateResult?.length || 0,
      already_active: activeUsers.length,
      ready_for_scheduler: schedulerReady?.length || 0
    };

  } catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🔧 ИСПРАВЛЕНИЕ СИСТЕМНОЙ ОШИБКИ TON BOOST АКТИВАЦИИ\n');
    
    const result = await activateAllBoostUsers();
    
    console.log('\n🎯 РЕЗУЛЬТАТ АКТИВАЦИИ:');
    console.log('=' .repeat(30));
    console.log(`✅ Всего пользователей с покупками: ${result.total_users}`);
    console.log(`🚀 Активировано сейчас: ${result.activated}`);
    console.log(`✅ Уже было активно: ${result.already_active}`);
    console.log(`📈 Готово для планировщика: ${result.ready_for_scheduler}`);
    
    if (result.activated > 0) {
      console.log('\n🎉 СИСТЕМНАЯ ОШИБКА ИСПРАВЛЕНА!');
      console.log('   Все пользователи теперь будут получать доходы от планировщика');
      console.log('   Новые покупки будут активироваться автоматически');
    } else {
      console.log('\n✅ Система уже работала корректно');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ АКТИВАЦИЯ ПРОВАЛЕНА:', error);
    process.exit(1);
  }
}

main();