#!/usr/bin/env tsx
/**
 * УГЛУБЛЕННАЯ ДИАГНОСТИКА ПЛАНИРОВЩИКА ДЛЯ USER 287
 * Поиск причин почему планировщик пропускает пользователя
 */

import { supabase } from '../core/supabase';

async function deepSchedulerDiagnosis() {
  console.log('🔍 УГЛУБЛЕННАЯ ДИАГНОСТИКА ПЛАНИРОВЩИКА - USER 287');
  console.log('==================================================');
  console.log(`Время: ${new Date().toLocaleString('ru-RU')}\n`);

  const userId = 287;

  // 1. Сравнение User 287 с работающими пользователями
  console.log('1. 📊 СРАВНЕНИЕ С РАБОТАЮЩИМИ ПОЛЬЗОВАТЕЛЯМИ:');
  
  // Получаем пользователей, которые получают начисления
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: activeIncomeUsers } = await supabase
    .from('transactions')
    .select('user_id')
    .eq('type', 'FARMING_REWARD')
    .eq('currency', 'TON')
    .gte('created_at', fiveMinutesAgo);

  const workingUserIds = [...new Set(activeIncomeUsers?.map(tx => tx.user_id) || [])];
  console.log(`   Пользователи, получающие начисления: ${workingUserIds.join(', ')}`);

  // Сравниваем данные User 287 с работающими пользователями
  for (const workingUserId of workingUserIds.slice(0, 3)) {
    console.log(`\n   🔍 СРАВНЕНИЕ User ${userId} vs User ${workingUserId}:`);
    
    // Данные в users
    const { data: user287Data } = await supabase
      .from('users')
      .select('ton_boost_package, ton_boost_package_id, ton_boost_rate, ton_boost_start_timestamp')
      .eq('id', userId)
      .single();
      
    const { data: workingUserData } = await supabase
      .from('users')
      .select('ton_boost_package, ton_boost_package_id, ton_boost_rate, ton_boost_start_timestamp')
      .eq('id', workingUserId)
      .single();

    console.log(`     Таблица users:`);
    console.log(`     User ${userId}: package=${user287Data?.ton_boost_package}, package_id=${user287Data?.ton_boost_package_id}, rate=${user287Data?.ton_boost_rate}, start=${user287Data?.ton_boost_start_timestamp}`);
    console.log(`     User ${workingUserId}: package=${workingUserData?.ton_boost_package}, package_id=${workingUserData?.ton_boost_package_id}, rate=${workingUserData?.ton_boost_rate}, start=${workingUserData?.ton_boost_start_timestamp}`);

    // Данные в ton_farming_data
    const { data: user287Farming } = await supabase
      .from('ton_farming_data')
      .select('boost_package_id, boost_active, farming_balance, farming_rate, start_date, end_date')
      .eq('user_id', userId);
      
    const { data: workingUserFarming } = await supabase
      .from('ton_farming_data')
      .select('boost_package_id, boost_active, farming_balance, farming_rate, start_date, end_date')
      .eq('user_id', workingUserId);

    console.log(`     Таблица ton_farming_data:`);
    if (user287Farming?.length > 0) {
      const f287 = user287Farming[0];
      console.log(`     User ${userId}: package_id=${f287.boost_package_id}, active=${f287.boost_active}, balance=${f287.farming_balance}, rate=${f287.farming_rate}`);
      console.log(`                    start=${f287.start_date}, end=${f287.end_date}`);
    } else {
      console.log(`     User ${userId}: НЕТ ЗАПИСЕЙ`);
    }
    
    if (workingUserFarming?.length > 0) {
      const fWorking = workingUserFarming[0];
      console.log(`     User ${workingUserId}: package_id=${fWorking.boost_package_id}, active=${fWorking.boost_active}, balance=${fWorking.farming_balance}, rate=${fWorking.farming_rate}`);
      console.log(`                    start=${fWorking.start_date}, end=${fWorking.end_date}`);
    } else {
      console.log(`     User ${workingUserId}: НЕТ ЗАПИСЕЙ`);
    }

    // Найдем ключевые различия
    console.log(`     🔍 РАЗЛИЧИЯ:`);
    const differences = [];
    
    if (user287Data?.ton_boost_package_id !== workingUserData?.ton_boost_package_id) {
      differences.push(`ton_boost_package_id: ${user287Data?.ton_boost_package_id} vs ${workingUserData?.ton_boost_package_id}`);
    }
    
    if (!user287Data?.ton_boost_start_timestamp && workingUserData?.ton_boost_start_timestamp) {
      differences.push('ton_boost_start_timestamp: ОТСУТСТВУЕТ у 287');
    }
    
    if (user287Farming?.length > 0 && workingUserFarming?.length > 0) {
      const f287 = user287Farming[0];
      const fWorking = workingUserFarming[0];
      
      if (!f287.start_date && fWorking.start_date) {
        differences.push('start_date в ton_farming_data: ОТСУТСТВУЕТ у 287');
      }
      
      if (!f287.end_date && fWorking.end_date) {
        differences.push('end_date в ton_farming_data: ОТСУТСТВУЕТ у 287');
      }
    }
    
    if (differences.length > 0) {
      differences.forEach(diff => console.log(`       ❌ ${diff}`));
    } else {
      console.log(`       ✅ Значимых различий не найдено`);
    }
  }

  // 2. Проверка JOIN запросов планировщика
  console.log('\n\n2. 🔍 ИМИТАЦИЯ ЛОГИКИ ПЛАНИРОВЩИКА:');
  console.log('   Тестируем различные JOIN запросы...\n');

  // Тест 1: JOIN users с ton_farming_data
  console.log('   🧪 ТЕСТ 1: JOIN users + ton_farming_data');
  const { data: joinTest1, error: joinError1 } = await supabase
    .from('users')
    .select(`
      id,
      ton_boost_package,
      ton_boost_package_id,
      ton_farming_data!inner(
        boost_package_id,
        boost_active,
        farming_balance
      )
    `)
    .not('ton_boost_package', 'is', null)
    .eq('ton_farming_data.boost_active', true)
    .gt('ton_farming_data.farming_balance', 0);

  if (joinError1) {
    console.log(`     ❌ Ошибка JOIN: ${joinError1.message}`);
  } else {
    const user287InJoin = joinTest1?.find(u => u.id === 287);
    console.log(`     User 287 в результатах: ${user287InJoin ? '✅ ДА' : '❌ НЕТ'}`);
    console.log(`     Всего пользователей в JOIN: ${joinTest1?.length || 0}`);
    
    if (user287InJoin) {
      console.log(`     Данные User 287: package=${user287InJoin.ton_boost_package}, farming_data=${JSON.stringify(user287InJoin.ton_farming_data)}`);
    }
  }

  // Тест 2: Альтернативный JOIN через LEFT JOIN
  console.log('\n   🧪 ТЕСТ 2: LEFT JOIN users + ton_farming_data');
  const { data: joinTest2 } = await supabase
    .from('ton_farming_data')
    .select(`
      user_id,
      boost_package_id,
      boost_active,
      farming_balance,
      users!inner(
        ton_boost_package,
        ton_boost_package_id
      )
    `)
    .eq('boost_active', true)
    .gt('farming_balance', 0);

  const user287InJoin2 = joinTest2?.find(u => u.user_id === 287);
  console.log(`     User 287 в результатах: ${user287InJoin2 ? '✅ ДА' : '❌ НЕТ'}`);
  console.log(`     Всего пользователей в JOIN: ${joinTest2?.length || 0}`);

  // Тест 3: Проверка фильтров по отдельности
  console.log('\n   🧪 ТЕСТ 3: Проверка фильтров по отдельности');
  
  // Проверяем users таблицу
  const { data: usersFilter } = await supabase
    .from('users')
    .select('id, ton_boost_package, ton_boost_package_id')
    .eq('id', 287)
    .not('ton_boost_package', 'is', null);
    
  console.log(`     User 287 проходит фильтр users: ${usersFilter?.length > 0 ? '✅ ДА' : '❌ НЕТ'}`);
  if (usersFilter?.length > 0) {
    console.log(`     Данные: ${JSON.stringify(usersFilter[0])}`);
  }

  // Проверяем ton_farming_data таблицу
  const { data: farmingFilter } = await supabase
    .from('ton_farming_data')
    .select('user_id, boost_package_id, boost_active, farming_balance')
    .eq('user_id', 287)
    .eq('boost_active', true)
    .gt('farming_balance', 0);
    
  console.log(`     User 287 проходит фильтр ton_farming_data: ${farmingFilter?.length > 0 ? '✅ ДА' : '❌ НЕТ'}`);
  if (farmingFilter?.length > 0) {
    console.log(`     Данные: ${JSON.stringify(farmingFilter[0])}`);
  }

  // 3. Проверка истории начислений более детально
  console.log('\n\n3. 📜 ДЕТАЛЬНАЯ ИСТОРИЯ НАЧИСЛЕНИЙ USER 287:');
  
  const { data: allUser287Tx } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 287)
    .order('created_at', { ascending: false })
    .limit(20);

  if (allUser287Tx && allUser287Tx.length > 0) {
    console.log(`   Найдено ${allUser287Tx.length} транзакций:\n`);
    
    allUser287Tx.forEach((tx, index) => {
      console.log(`   ${index + 1}. [${tx.created_at}] ${tx.type}`);
      console.log(`      Сумма: ${tx.amount_ton || tx.amount || 0} ${tx.currency}`);
      console.log(`      Описание: ${tx.description}`);
      if (tx.metadata) {
        console.log(`      Метаданные: ${JSON.stringify(tx.metadata)}`);
      }
      console.log('');
    });

    // Анализ типов транзакций
    const txTypes = new Map();
    allUser287Tx.forEach(tx => {
      txTypes.set(tx.type, (txTypes.get(tx.type) || 0) + 1);
    });
    
    console.log('   📊 Типы транзакций:');
    for (const [type, count] of txTypes) {
      console.log(`     ${type}: ${count}`);
    }

    // Поиск реальных доходов от планировщика
    const realIncomes = allUser287Tx.filter(tx => 
      tx.type === 'FARMING_REWARD' && 
      tx.currency === 'TON' && 
      tx.metadata?.original_type === 'TON_BOOST_INCOME'
    );
    
    console.log(`\n   🎯 Реальные доходы от планировщика: ${realIncomes.length}`);
    if (realIncomes.length > 0) {
      console.log('     Последние доходы:');
      realIncomes.slice(0, 3).forEach(tx => {
        console.log(`     • ${tx.created_at}: ${tx.amount_ton} TON`);
      });
    } else {
      console.log('     ❌ Реальных доходов от планировщика НЕТ');
    }
  }

  // 4. Глобальная проверка планировщика
  console.log('\n4. 🌐 ТЕКУЩИЙ СТАТУС ПЛАНИРОВЩИКА:');
  
  const { data: currentActivity } = await supabase
    .from('transactions')
    .select('user_id, created_at, amount_ton')
    .eq('type', 'FARMING_REWARD')
    .eq('currency', 'TON')
    .gte('created_at', fiveMinutesAgo)
    .order('created_at', { ascending: false })
    .limit(20);

  if (currentActivity && currentActivity.length > 0) {
    console.log(`   ✅ Планировщик активен: ${currentActivity.length} начислений за 5 минут`);
    
    const uniqueUsers = [...new Set(currentActivity.map(tx => tx.user_id))];
    console.log(`   👥 Уникальных пользователей: ${uniqueUsers.length}`);
    console.log(`   📋 Список: ${uniqueUsers.join(', ')}`);
    
    const user287HasIncome = uniqueUsers.includes(287);
    console.log(`   🎯 User 287 получает начисления: ${user287HasIncome ? '✅ ДА' : '❌ НЕТ'}`);
    
    if (!user287HasIncome) {
      console.log('\n   ⚠️ ПОДТВЕРЖДЕНО: User 287 пропускается планировщиком');
      console.log('      Все остальные условия выполнены, но пользователь не в списке получателей');
    }
  } else {
    console.log('   ❌ Планировщик неактивен');
  }

  // 5. Итоговый анализ
  console.log('\n5. 🎯 ИТОГОВЫЙ АНАЛИЗ ПРОБЛЕМЫ:');
  console.log('═'.repeat(50));
  
  const hasUsersRecord = (await supabase.from('users').select('ton_boost_package').eq('id', 287).single()).data?.ton_boost_package;
  const hasFarmingRecord = (await supabase.from('ton_farming_data').select('boost_active').eq('user_id', 287).eq('boost_active', true)).data?.length > 0;
  const passesJoin = joinTest1?.find(u => u.id === 287) || joinTest2?.find(u => u.user_id === 287);
  
  console.log(`📋 Диагностика User 287:`);
  console.log(`   • Запись в users: ${hasUsersRecord ? '✅ ЕСТЬ' : '❌ НЕТ'}`);
  console.log(`   • Запись в ton_farming_data: ${hasFarmingRecord ? '✅ ЕСТЬ' : '❌ НЕТ'}`);
  console.log(`   • Проходит JOIN запросы: ${passesJoin ? '✅ ДА' : '❌ НЕТ'}`);
  console.log(`   • Планировщик глобально работает: ${currentActivity?.length > 0 ? '✅ ДА' : '❌ НЕТ'}`);
  console.log(`   • Получает начисления: ${currentActivity?.some(tx => tx.user_id === 287) ? '✅ ДА' : '❌ НЕТ'}`);

  if (hasUsersRecord && hasFarmingRecord && !passesJoin) {
    console.log('\n❌ ПРОБЛЕМА ОБНАРУЖЕНА: User 287 НЕ ПРОХОДИТ JOIN запросы планировщика');
    console.log('   Данные есть в обеих таблицах, но JOIN их не объединяет');
    console.log('   Возможные причины:');
    console.log('   1. Несоответствие значений в полях связи');
    console.log('   2. NULL значения в критических полях');
    console.log('   3. Типы данных не совпадают');
  } else if (hasUsersRecord && hasFarmingRecord && passesJoin && !currentActivity?.some(tx => tx.user_id === 287)) {
    console.log('\n❌ ПРОБЛЕМА В ЛОГИКЕ ПЛАНИРОВЩИКА: User 287 проходит все проверки, но не получает начисления');
    console.log('   Требуется проверка кода планировщика на дополнительные фильтры или условия');
  }

  console.log('\n✅ Углубленная диагностика завершена');
}

// Запуск
deepSchedulerDiagnosis()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });