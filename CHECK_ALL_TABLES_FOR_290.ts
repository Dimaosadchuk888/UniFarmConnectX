/**
 * 🔍 ПРОВЕРКА ВСЕХ ТАБЛИЦ ДЛЯ USER 290
 * 
 * Анализ где именно находятся данные пользователя 290 и какая система использовалась ранее
 */

import { supabase } from './core/supabase';

async function checkAllTablesForUser290() {
  console.log('\n🔍 === ПРОВЕРКА ВСЕХ ТАБЛИЦ ДЛЯ USER 290 ===\n');
  
  const userId = 290;
  
  try {
    // 1. ПРОВЕРЯЕМ users таблицу
    console.log('1️⃣ ТАБЛИЦА users:');
    console.log('================');
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userData) {
      console.log('✅ НАЙДЕНО в users:');
      console.log(`   id: ${userData.id}`);
      console.log(`   ton_boost_package: ${userData.ton_boost_package}`);
      console.log(`   ton_boost_active: ${userData.ton_boost_active}`);
      console.log(`   ton_boost_rate: ${userData.ton_boost_rate}`);
      console.log(`   ton_boost_package_id: ${userData.ton_boost_package_id}`);
      console.log(`   balance_ton: ${userData.balance_ton}`);
      console.log(`   ton_farming_balance: ${userData.ton_farming_balance}`);
      console.log(`   ton_farming_rate: ${userData.ton_farming_rate}`);
      console.log(`   ton_farming_start_timestamp: ${userData.ton_farming_start_timestamp}`);
      console.log(`   ton_farming_last_update: ${userData.ton_farming_last_update}`);
      console.log(`   created_at: ${userData.created_at}`);
    } else {
      console.log('❌ НЕ НАЙДЕНО в users');
    }

    // 2. ПРОВЕРЯЕМ ton_farming_data таблицу
    console.log('\n2️⃣ ТАБЛИЦА ton_farming_data:');
    console.log('============================');
    
    const { data: farmingData, error: farmingError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', userId.toString());

    if (farmingData && farmingData.length > 0) {
      console.log('✅ НАЙДЕНО в ton_farming_data:');
      farmingData.forEach((record, index) => {
        console.log(`   Запись ${index + 1}:`);
        console.log(`     user_id: "${record.user_id}" (${typeof record.user_id})`);
        console.log(`     boost_active: ${record.boost_active}`);
        console.log(`     boost_package_id: ${record.boost_package_id}`);
        console.log(`     farming_balance: ${record.farming_balance}`);
        console.log(`     farming_rate: ${record.farming_rate}`);
        console.log(`     created_at: ${record.created_at}`);
      });
    } else {
      console.log('❌ НЕ НАЙДЕНО в ton_farming_data');
    }

    // 3. ПРОВЕРЯЕМ transactions таблицу
    console.log('\n3️⃣ ТАБЛИЦА transactions:');
    console.log('========================');
    
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (transactions && transactions.length > 0) {
      console.log(`✅ НАЙДЕНО ${transactions.length} транзакций:`);
      transactions.forEach((tx, index) => {
        console.log(`   Транзакция ${index + 1}:`);
        console.log(`     ID: ${tx.id}`);
        console.log(`     Тип: ${tx.type}`);
        console.log(`     Сумма: ${tx.amount} ${tx.currency}`);
        console.log(`     Описание: ${tx.description}`);
        console.log(`     Статус: ${tx.status}`);
        console.log(`     Дата: ${tx.created_at}`);
        console.log(`     Метаданные: ${JSON.stringify(tx.metadata || {})}`);
        console.log('     ---');
      });
    } else {
      console.log('❌ НЕ НАЙДЕНО транзакций');
    }

    // 4. АНАЛИЗИРУЕМ КАКУЮ СИСТЕМУ ИСПОЛЬЗОВАЛИ РАНЬШЕ
    console.log('\n4️⃣ АНАЛИЗ ИСТОРИЧЕСКОЙ СИСТЕМЫ:');
    console.log('===============================');
    
    // Проверяем рабочих пользователей
    const { data: workingUsers, error: workingError } = await supabase
      .from('users')
      .select('id, ton_boost_package, ton_boost_active, ton_farming_balance, ton_farming_rate, created_at')
      .not('ton_boost_package', 'is', null)
      .neq('ton_boost_package', 0)
      .eq('ton_boost_active', true)
      .limit(3);

    if (workingUsers && workingUsers.length > 0) {
      console.log('✅ РАБОЧИЕ ПОЛЬЗОВАТЕЛИ (для сравнения):');
      workingUsers.forEach((user, index) => {
        console.log(`   User ${user.id}:`);
        console.log(`     ton_boost_active: ${user.ton_boost_active}`);
        console.log(`     ton_farming_balance: ${user.ton_farming_balance}`);
        console.log(`     ton_farming_rate: ${user.ton_farming_rate}`);
        console.log(`     created_at: ${user.created_at}`);
        console.log('     ---');
      });
    }

    // 5. СРАВНЕНИЕ С РАБОЧЕЙ СИСТЕМОЙ
    console.log('\n5️⃣ ВЫВОДЫ:');
    console.log('===========');
    
    if (userData) {
      console.log('🔍 АНАЛИЗ User 290:');
      
      if (userData.ton_farming_balance && userData.ton_farming_balance !== '0') {
        console.log('   ✅ У пользователя ЕСТЬ ton_farming_balance в users таблице');
        console.log(`   ✅ Значение: ${userData.ton_farming_balance}`);
        console.log('   💡 СИСТЕМА РАНЬШЕ РАБОТАЛА ЧЕРЕЗ users ТАБЛИЦУ!');
        console.log('');
        console.log('🚨 ПРОБЛЕМА:');
        console.log('   TonFarmingRepository пытается использовать ton_farming_data таблицу,');
        console.log('   но раньше система работала через поля в users таблице!');
        console.log('');
        console.log('🔧 РЕШЕНИЕ:');
        console.log('   ВКЛЮЧИТЬ fallback режим в TonFarmingRepository');
        console.log('   или ВЕРНУТЬ использование users таблицы как primary');
      } else {
        console.log('   ❌ ton_farming_balance пустой в users таблице');
        console.log('   💡 Система должна была создать запись в ton_farming_data');
      }
      
      // Проверяем была ли активация вообще
      if (userData.ton_boost_package && !userData.ton_boost_active) {
        console.log('');
        console.log('🔍 СТАТУС АКТИВАЦИИ:');
        console.log('   ✅ Пакет записан (ton_boost_package)');
        console.log('   ❌ Активация не завершена (ton_boost_active = false)');
        console.log('   💡 АКТИВАЦИЯ ЗАСТРЯЛА НА ПОЛОВИНЕ!');
      }
    }

    // 6. РЕКОМЕНДАЦИИ ПО ВОССТАНОВЛЕНИЮ
    console.log('\n6️⃣ ПЛАН ВОССТАНОВЛЕНИЯ:');
    console.log('=======================');
    console.log('');
    console.log('🎯 СТРАТЕГИЯ:');
    console.log('   1. ОПРЕДЕЛИТЬ какая система использовалась раньше:');
    console.log('      - users таблица (ton_farming_balance поля)');
    console.log('      - ton_farming_data таблица');
    console.log('');
    console.log('   2. ВЕРНУТЬ TonFarmingRepository к правильной системе:');
    console.log('      - Если раньше использовались поля users - включить fallback');
    console.log('      - Если ton_farming_data - исправить типы данных');
    console.log('');
    console.log('   3. ВОССТАНОВИТЬ пропущенных пользователей');

    console.log('\n✅ === ПРОВЕРКА ЗАВЕРШЕНА ===\n');

  } catch (error) {
    console.error('❌ Критическая ошибка проверки:', error);
  }
}

// Запускаем проверку
checkAllTablesForUser290();