/**
 * 🔍 ПРОВЕРКА РЕАЛЬНЫХ ТРАНЗАКЦИЙ РАБОЧИХ ПОЛЬЗОВАТЕЛЕЙ
 * 
 * Анализ как работает система у пользователей которые получают доходы
 */

import { supabase } from './core/supabase';

async function checkRealTransactions() {
  console.log('\n🔍 === АНАЛИЗ РЕАЛЬНЫХ РАБОЧИХ ТРАНЗАКЦИЙ ===\n');
  
  try {
    // 1. НАЙДЕМ ПОЛЬЗОВАТЕЛЕЙ КОТОРЫЕ ПОЛУЧАЮТ TON ДОХОДЫ
    console.log('1️⃣ ПОИСК ПОЛЬЗОВАТЕЛЕЙ С TON ДОХОДАМИ:');
    console.log('====================================');
    
    const { data: tonIncomes, error: incomeError } = await supabase
      .from('transactions')
      .select('user_id, amount, created_at, description')
      .eq('currency', 'TON')
      .gt('amount', 0)
      .or('description.ilike.%boost%,description.ilike.%farming%')
      .order('created_at', { ascending: false })
      .limit(20);

    if (tonIncomes && tonIncomes.length > 0) {
      console.log(`✅ НАЙДЕНО ${tonIncomes.length} TON доходных транзакций:`);
      
      const userIds = [...new Set(tonIncomes.map(t => t.user_id))];
      console.log(`📊 Уникальных пользователей: ${userIds.length}`);
      console.log(`📋 User IDs: [${userIds.join(', ')}]`);
      
      tonIncomes.forEach((tx, index) => {
        console.log(`   ${index + 1}. User ${tx.user_id}: +${tx.amount} TON`);
        console.log(`      "${tx.description}"`);
        console.log(`      ${tx.created_at}`);
        console.log('      ---');
      });
    } else {
      console.log('❌ TON доходы НЕ НАЙДЕНЫ - система вообще не работает!');
    }

    // 2. ПРОВЕРИМ КОНКРЕТНЫХ РАБОЧИХ ПОЛЬЗОВАТЕЛЕЙ
    console.log('\n2️⃣ АНАЛИЗ КОНКРЕТНЫХ РАБОЧИХ ПОЛЬЗОВАТЕЛЕЙ:');
    console.log('==========================================');
    
    // Из предыдущего анализа знаем что User 25, 287 должны работать
    const workingUserIds = [25, 287, 186, 224];
    
    for (const userId of workingUserIds) {
      console.log(`\n🔍 АНАЛИЗ User ${userId}:`);
      console.log('─'.repeat(30));
      
      // Получаем данные из users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, ton_boost_package, ton_boost_active, ton_farming_balance, ton_farming_rate, balance_ton')
        .eq('id', userId)
        .single();
      
      // Получаем данные из ton_farming_data
      const { data: farmingData, error: farmingError } = await supabase
        .from('ton_farming_data')
        .select('user_id, boost_active, farming_balance, farming_rate')
        .eq('user_id', userId.toString())
        .single();
      
      // Получаем недавние TON транзакции
      const { data: recentTON, error: tonError } = await supabase
        .from('transactions')
        .select('type, amount, created_at, description')
        .eq('user_id', userId)
        .eq('currency', 'TON')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });
      
      console.log('📋 ДАННЫЕ users:');
      if (userData) {
        console.log(`   ton_boost_active: ${userData.ton_boost_active}`);
        console.log(`   ton_farming_balance: ${userData.ton_farming_balance}`);
        console.log(`   balance_ton: ${userData.balance_ton}`);
      } else {
        console.log(`   ❌ НЕ НАЙДЕН в users`);
      }
      
      console.log('📋 ДАННЫЕ ton_farming_data:');
      if (farmingData) {
        console.log(`   boost_active: ${farmingData.boost_active}`);
        console.log(`   farming_balance: ${farmingData.farming_balance}`);
        console.log(`   farming_rate: ${farmingData.farming_rate}`);
      } else {
        console.log(`   ❌ НЕТ в ton_farming_data`);
      }
      
      console.log('📋 НЕДАВНИЕ TON ТРАНЗАКЦИИ:');
      if (recentTON && recentTON.length > 0) {
        console.log(`   ✅ ${recentTON.length} транзакций за 24 часа:`);
        recentTON.forEach((tx, index) => {
          console.log(`     ${index + 1}. ${tx.type}: ${tx.amount} TON`);
          console.log(`        ${tx.description}`);
        });
      } else {
        console.log(`   ❌ НЕТ TON транзакций за 24 часа`);
      }
      
      // ВЫВОД ПО ПОЛЬЗОВАТЕЛЮ
      const hasUsersData = userData?.ton_farming_balance && userData.ton_farming_balance !== '0';
      const hasFarmingData = farmingData?.farming_balance && farmingData.farming_balance !== 0;
      const hasRecentIncome = recentTON && recentTON.length > 0;
      
      console.log('🎯 СТАТУС:');
      if (hasRecentIncome) {
        console.log(`   ✅ РАБОТАЕТ - получает доходы`);
        if (hasUsersData && !hasFarmingData) {
          console.log(`   💡 СИСТЕМА: users таблица (старая)`);
        } else if (!hasUsersData && hasFarmingData) {
          console.log(`   💡 СИСТЕМА: ton_farming_data таблица (новая)`);
        } else if (hasUsersData && hasFarmingData) {
          console.log(`   💡 СИСТЕМА: обе таблицы (переходный период)`);
        }
      } else {
        console.log(`   ❌ НЕ РАБОТАЕТ - нет доходов`);
      }
    }

    // 3. ОПРЕДЕЛЯЕМ КАКАЯ СИСТЕМА АКТИВНА
    console.log('\n3️⃣ ОПРЕДЕЛЕНИЕ АКТИВНОЙ СИСТЕМЫ:');
    console.log('================================');
    
    // Проверяем планировщик - какие записи он обрабатывает
    console.log('🔍 АНАЛИЗ ПЛАНИРОВЩИКА:');
    
    // Ищем недавние TON доходы от планировщика
    const { data: schedulerIncome, error: schedulerError } = await supabase
      .from('transactions')
      .select('user_id, amount, created_at, description, type')
      .eq('currency', 'TON')
      .or('type.eq.TON_BOOST_INCOME,type.eq.FARMING_REWARD')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // последний час
      .order('created_at', { ascending: false });
    
    if (schedulerIncome && schedulerIncome.length > 0) {
      console.log(`✅ ПЛАНИРОВЩИК РАБОТАЕТ - ${schedulerIncome.length} доходов за час:`);
      schedulerIncome.forEach((tx, index) => {
        console.log(`   ${index + 1}. User ${tx.user_id}: +${tx.amount} TON (${tx.type})`);
      });
      
      // Анализируем через какую систему работают эти пользователи
      const schedulerUserIds = [...new Set(schedulerIncome.map(t => t.user_id))];
      console.log(`\n🔍 АНАЛИЗ ПОЛЬЗОВАТЕЛЕЙ ПЛАНИРОВЩИКА:`);
      
      for (const userId of schedulerUserIds.slice(0, 3)) { // первые 3
        const { data: plannerUser, error } = await supabase
          .from('users')
          .select('ton_farming_balance')
          .eq('id', userId)
          .single();
          
        const { data: plannerFarming, error: pError } = await supabase
          .from('ton_farming_data')
          .select('farming_balance')
          .eq('user_id', userId.toString())
          .single();
        
        const usersBalance = plannerUser?.ton_farming_balance || '0';
        const farmingBalance = plannerFarming?.farming_balance || '0';
        
        console.log(`   User ${userId}:`);
        console.log(`     users.ton_farming_balance: ${usersBalance}`);
        console.log(`     ton_farming_data.farming_balance: ${farmingBalance}`);
        
        if (usersBalance !== '0' && farmingBalance === '0') {
          console.log(`     → ИСПОЛЬЗУЕТ users таблицу`);
        } else if (usersBalance === '0' && farmingBalance !== '0') {
          console.log(`     → ИСПОЛЬЗУЕТ ton_farming_data таблицу`);
        }
      }
    } else {
      console.log('❌ ПЛАНИРОВЩИК НЕ РАБОТАЕТ - нет доходов за час');
    }

    // 4. ФИНАЛЬНЫЕ ВЫВОДЫ
    console.log('\n4️⃣ ФИНАЛЬНЫЕ ВЫВОДЫ:');
    console.log('====================');
    console.log('');
    console.log('🎯 СИСТЕМА КОТОРАЯ РАБОТАЛА РАНЬШЕ:');
    
    if (tonIncomes && tonIncomes.length > 0) {
      console.log('   ✅ TON доходы ЕСТЬ - система частично работает');
      console.log('   💡 Нужно определить через какую таблицу работают рабочие пользователи');
    } else {
      console.log('   ❌ TON доходов НЕТ - система полностью сломана');
    }
    
    console.log('');
    console.log('🔧 ПЛАН ВОССТАНОВЛЕНИЯ:');
    console.log('   1. Определить какую таблицу использует планировщик');
    console.log('   2. Настроить TonFarmingRepository на правильную таблицу');
    console.log('   3. Восстановить данные для User 290 и других');

    console.log('\n✅ === АНАЛИЗ ЗАВЕРШЕН ===\n');

  } catch (error) {
    console.error('❌ Критическая ошибка анализа:', error);
  }
}

// Запускаем анализ
checkRealTransactions();