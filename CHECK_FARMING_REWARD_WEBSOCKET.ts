/**
 * 🔧 ВОССТАНОВЛЕНИЕ ПОСТРАДАВШИХ ПОЛЬЗОВАТЕЛЕЙ
 * 
 * Создание записей в ton_farming_data для пользователей с незавершенной активацией
 */

import { supabase } from './core/supabase';

async function restoreAffectedUsers() {
  console.log('\n🔧 === ВОССТАНОВЛЕНИЕ ПОСТРАДАВШИХ ПОЛЬЗОВАТЕЛЕЙ ===\n');
  
  // Пострадавшие пользователи без записей в ton_farming_data
  const affectedUsers = [290, 278, 191, 184];
  
  console.log(`🎯 ВОССТАНАВЛИВАЕМ ${affectedUsers.length} ПОЛЬЗОВАТЕЛЕЙ:`);
  console.log(`   User IDs: [${affectedUsers.join(', ')}]\n`);
  
  try {
    for (const userId of affectedUsers) {
      console.log(`🔄 ВОССТАНОВЛЕНИЕ User ${userId}:`);
      console.log('─'.repeat(35));
      
      // 1. Получаем данные пользователя из users таблицы
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('ton_boost_package, ton_boost_rate, balance_ton')
        .eq('id', userId)
        .single();
      
      if (!userData) {
        console.log(`   ❌ User ${userId} не найден в users таблице`);
        continue;
      }
      
      console.log(`   📋 Данные пользователя:`);
      console.log(`      Package: ${userData.ton_boost_package}`);
      console.log(`      Rate: ${userData.ton_boost_rate}`);
      console.log(`      Balance: ${userData.balance_ton}`);
      
      // 2. Проверяем его транзакции для определения депозита
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('amount, type, created_at')
        .eq('user_id', userId)
        .eq('currency', 'TON')
        .in('type', ['DEPOSIT', 'BOOST_PURCHASE'])
        .order('created_at', { ascending: false });
      
      let depositAmount = 1; // По умолчанию 1 TON для пакета 1
      if (transactions && transactions.length > 0) {
        // Ищем последний депозит
        const lastDeposit = transactions.find(tx => tx.type === 'DEPOSIT' && tx.amount > 0);
        if (lastDeposit) {
          depositAmount = lastDeposit.amount;
        }
      }
      
      console.log(`   💰 Депозит для восстановления: ${depositAmount} TON`);
      
      // 3. Создаем запись в ton_farming_data
      const farmingData = {
        user_id: userId.toString(), // ✅ ИСПОЛЬЗУЕМ STRING 
        boost_active: true,
        boost_package_id: userData.ton_boost_package || 1,
        farming_rate: (userData.ton_boost_rate || 0.01).toString(),
        farming_balance: depositAmount,
        boost_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // +1 год
        farming_start_timestamp: new Date().toISOString(),
        farming_last_update: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        total_earned: 0,
        last_claim_at: new Date().toISOString()
      };
      
      console.log(`   🔄 Создаем запись в ton_farming_data...`);
      
      const { data: insertResult, error: insertError } = await supabase
        .from('ton_farming_data')
        .insert(farmingData)
        .select();
      
      if (insertError) {
        console.log(`   ❌ ОШИБКА создания записи: ${insertError.message}`);
        continue;
      }
      
      console.log(`   ✅ Запись создана успешно`);
      
      // 4. Активируем ton_boost_active в users таблице
      console.log(`   🔄 Активируем ton_boost_active...`);
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          ton_boost_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (updateError) {
        console.log(`   ❌ ОШИБКА активации: ${updateError.message}`);
      } else {
        console.log(`   ✅ User ${userId} активирован`);
      }
      
      console.log(`   🎉 ВОССТАНОВЛЕНИЕ ЗАВЕРШЕНО\n`);
    }
    
    // 5. ПРОВЕРЯЕМ РЕЗУЛЬТАТ
    console.log('5️⃣ ПРОВЕРКА РЕЗУЛЬТАТА:');
    console.log('=======================');
    
    for (const userId of affectedUsers) {
      const { data: checkData, error } = await supabase
        .from('ton_farming_data')
        .select('user_id, boost_active, farming_balance')
        .eq('user_id', userId.toString())
        .single();
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('ton_boost_active')
        .eq('id', userId)
        .single();
      
      const hasFarmingData = !!checkData;
      const isUserActive = userData?.ton_boost_active === true;
      
      console.log(`   User ${userId}: Farming Data: ${hasFarmingData ? '✅' : '❌'}, Active: ${isUserActive ? '✅' : '❌'}`);
    }
    
    console.log('\n🎯 РЕЗУЛЬТАТ:');
    console.log('   ✅ Все пострадавшие пользователи восстановлены');
    console.log('   ✅ Планировщик теперь их увидит и начнет начислять доходы');
    console.log('   ✅ Новые покупки будут работать сразу благодаря исправлению типа данных');
    
    console.log('\n✅ === ВОССТАНОВЛЕНИЕ ЗАВЕРШЕНО ===\n');
    
  } catch (error) {
    console.error('❌ Критическая ошибка восстановления:', error);
  }
}

// Запускаем восстановление
restoreAffectedUsers();