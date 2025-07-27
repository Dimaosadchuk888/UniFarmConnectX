#!/usr/bin/env tsx

/**
 * 🔍 ПРОВЕРКА ВСЕХ ИСПРАВЛЕНИЙ ПОСЛЕ ПЕРЕЗАГРУЗКИ СЕРВЕРА
 * Проверяем что код изменения применились и система работает
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function checkSystemAfterRestart() {
  console.log('🔍 ПРОВЕРКА СИСТЕМЫ ПОСЛЕ ПЕРЕЗАГРУЗКИ');
  console.log('=' .repeat(45));
  
  try {
    // 1. ПРОВЕРЯЕМ КОД АКТИВАЦИИ (должен содержать ton_boost_active: true)
    console.log('1️⃣ Проверка применения кода...');
    
    const fs = await import('fs');
    const serviceCode = fs.readFileSync('modules/boost/service.ts', 'utf8');
    
    const hasActiveFlagInActivateBoost = serviceCode.includes('ton_boost_active: true  // ⭐ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: активация для планировщика');
    const hasActiveFlagInPurchase = serviceCode.includes('ton_boost_active: true') && serviceCode.includes('purchaseWithInternalWallet');
    
    console.log(`✅ Флаг активации в activateBoost(): ${hasActiveFlagInActivateBoost ? 'ПРИМЕНЕН' : 'НЕ НАЙДЕН'}`);
    console.log(`✅ Флаг активации в purchaseWithInternalWallet(): ${hasActiveFlagInPurchase ? 'ПРИМЕНЕН' : 'НЕ НАЙДЕН'}`);

    // 2. ПРОВЕРЯЕМ ВСЕ АКТИВИРОВАННЫЕ ПОЛЬЗОВАТЕЛИ
    console.log('\n2️⃣ Проверка активированных пользователей...');
    
    const { data: activeUsers } = await supabase
      .from('users')
      .select('id, username, ton_boost_active, ton_boost_package, ton_boost_rate')
      .eq('ton_boost_active', true)
      .not('ton_boost_package', 'is', null)
      .order('id');

    console.log(`👥 Активных TON Boost пользователей: ${activeUsers?.length || 0}`);
    
    const expectedUsers = [25, 224, 250, 184, 220, 246, 290, 287, 258];
    const activeUserIds = activeUsers?.map(u => u.id) || [];
    const allExpectedActive = expectedUsers.every(id => activeUserIds.includes(id));
    
    console.log(`✅ Все ожидаемые пользователи активны: ${allExpectedActive ? 'ДА' : 'НЕТ'}`);
    
    if (!allExpectedActive) {
      const missing = expectedUsers.filter(id => !activeUserIds.includes(id));
      console.log(`❌ Отсутствуют: ${missing.join(', ')}`);
    }

    // 3. ПРОВЕРЯЕМ ПОСЛЕДНИЕ ДОХОДЫ (за 5 минут)
    console.log('\n3️⃣ Проверка работы планировщика...');
    
    const { data: recentIncomes } = await supabase
      .from('transactions')
      .select('user_id, amount, created_at')
      .eq('type', 'FARMING_REWARD')
      .contains('metadata', { transaction_source: 'ton_boost_scheduler' })
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    const usersWithRecentIncome = [...new Set(recentIncomes?.map(tx => parseInt(tx.user_id)) || [])];
    console.log(`💰 Пользователей с доходами за 5 минут: ${usersWithRecentIncome.length}/${activeUsers?.length || 0}`);
    
    // 4. СТАТИСТИКА ПО КОНКРЕТНЫМ ПОЛЬЗОВАТЕЛЯМ
    console.log('\n4️⃣ Детальная статистика по активным пользователям...');
    
    for (const user of activeUsers || []) {
      const userIncome = recentIncomes?.filter(tx => parseInt(tx.user_id) === user.id);
      const latestIncome = userIncome?.[0];
      
      console.log(`   User ${user.id} (@${user.username}):`);
      console.log(`     - Package: ${user.ton_boost_package}, Rate: ${user.ton_boost_rate}`);
      console.log(`     - Доходов за 5 мин: ${userIncome?.length || 0}`);
      if (latestIncome) {
        console.log(`     - Последний доход: ${latestIncome.amount} TON (${latestIncome.created_at})`);
      }
    }

    // 5. ПРОВЕРКА TON_FARMING_DATA
    console.log('\n5️⃣ Проверка ton_farming_data таблицы...');
    
    const { data: farmingData } = await supabase
      .from('ton_farming_data')
      .select('user_id, farming_balance, farming_rate, boost_package_id')
      .in('user_id', activeUserIds.map(id => id.toString()));

    console.log(`🌾 Записей в ton_farming_data для активных: ${farmingData?.length || 0}/${activeUsers?.length || 0}`);

    // 6. ФИНАЛЬНАЯ ОЦЕНКА
    console.log('\n6️⃣ ФИНАЛЬНАЯ ОЦЕНКА СИСТЕМЫ...');
    
    const codeFixed = hasActiveFlagInActivateBoost && hasActiveFlagInPurchase;
    const usersActivated = allExpectedActive;
    const schedulerWorking = usersWithRecentIncome.length > 0;
    const farmingDataComplete = (farmingData?.length || 0) === (activeUsers?.length || 0);
    
    console.log(`✅ Код исправлен: ${codeFixed ? 'ДА' : 'НЕТ'}`);
    console.log(`✅ Пользователи активированы: ${usersActivated ? 'ДА' : 'НЕТ'}`);
    console.log(`✅ Планировщик работает: ${schedulerWorking ? 'ДА' : 'НЕТ'}`);
    console.log(`✅ Farming данные полные: ${farmingDataComplete ? 'ДА' : 'НЕТ'}`);
    
    const systemHealthy = codeFixed && usersActivated && schedulerWorking;
    
    if (systemHealthy) {
      console.log('\n🎉 СИСТЕМА ПОЛНОСТЬЮ ИСПРАВЛЕНА И РАБОТАЕТ!');
      console.log('   ✅ Все критические ошибки устранены');
      console.log('   ✅ TON Boost пользователи получают доходы');
      console.log('   ✅ Новые покупки будут активироваться автоматически');
    } else {
      console.log('\n⚠️  ОБНАРУЖЕНЫ ПРОБЛЕМЫ В СИСТЕМЕ');
      if (!codeFixed) console.log('   ❌ Код не применился после перезагрузки');
      if (!usersActivated) console.log('   ❌ Не все пользователи активированы');
      if (!schedulerWorking) console.log('   ❌ Планировщик не работает');
    }

    return {
      code_fixed: codeFixed,
      users_activated: usersActivated,
      scheduler_working: schedulerWorking,
      farming_data_complete: farmingDataComplete,
      system_healthy: systemHealthy,
      active_users_count: activeUsers?.length || 0,
      recent_income_users: usersWithRecentIncome.length
    };

  } catch (error) {
    console.error('💥 ОШИБКА ПРОВЕРКИ:', error);
    throw error;
  }
}

async function main() {
  try {
    const result = await checkSystemAfterRestart();
    
    console.log('\n📊 РЕЗУЛЬТАТ ПРОВЕРКИ:');
    console.log(`   Код исправлен: ${result.code_fixed}`);
    console.log(`   Пользователи активны: ${result.users_activated}`);
    console.log(`   Планировщик работает: ${result.scheduler_working}`);
    console.log(`   Система здорова: ${result.system_healthy}`);
    
    process.exit(result.system_healthy ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ ПРОВЕРКА ПРОВАЛЕНА:', error);
    process.exit(1);
  }
}

main();