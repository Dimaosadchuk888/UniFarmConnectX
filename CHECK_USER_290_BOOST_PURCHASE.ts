/**
 * 🔍 ПРОВЕРКА СТАТУСА TON BOOST ПОКУПКИ USER 290
 * 
 * Анализ текущего состояния после покупки и подготовка к восстановлению
 */

import { supabase } from './core/supabase';

async function checkUser290BoostPurchase() {
  console.log('\n🔍 === АНАЛИЗ TON BOOST ПОКУПКИ USER 290 ===\n');
  
  const userId = 290;
  
  try {
    console.log('1️⃣ ТЕКУЩИЙ СТАТУС User 290:');
    console.log('===========================');
    
    // Проверяем users таблицу
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userData) {
      console.log('📋 ДАННЫЕ В users:');
      console.log(`   ID: ${userData.id}`);
      console.log(`   TON Boost Package: ${userData.ton_boost_package}`);
      console.log(`   TON Boost Active: ${userData.ton_boost_active}`);
      console.log(`   TON Boost Rate: ${userData.ton_boost_rate}`);
      console.log(`   Balance TON: ${userData.balance_ton}`);
      console.log(`   TON Farming Balance: ${userData.ton_farming_balance}`);
      console.log(`   TON Farming Rate: ${userData.ton_farming_rate}`);
    }

    // Проверяем ton_farming_data таблицу
    const { data: farmingData, error: farmingError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', userId.toString());

    console.log('\n📋 ДАННЫЕ В ton_farming_data:');
    if (farmingData && farmingData.length > 0) {
      console.log('   ✅ НАЙДЕНО:');
      farmingData.forEach((record, index) => {
        console.log(`     Запись ${index + 1}:`);
        console.log(`       user_id: "${record.user_id}"`);
        console.log(`       boost_active: ${record.boost_active}`);
        console.log(`       farming_balance: ${record.farming_balance}`);
        console.log(`       farming_rate: ${record.farming_rate}`);
      });
    } else {
      console.log('   ❌ НЕТ ЗАПИСЕЙ');
    }

    // Проверяем транзакции
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    console.log('\n📋 ПОСЛЕДНИЕ ТРАНЗАКЦИИ:');
    if (transactions && transactions.length > 0) {
      transactions.forEach((tx, index) => {
        console.log(`   ${index + 1}. ${tx.type}: ${tx.amount} ${tx.currency}`);
        console.log(`      ${tx.description}`);
        console.log(`      Статус: ${tx.status}`);
        console.log(`      Дата: ${tx.created_at}`);
        console.log('      ---');
      });
    }

    // Определяем что нужно исправить
    console.log('\n2️⃣ ДИАГНОЗ:');
    console.log('============');
    
    const hasBoostPackage = userData?.ton_boost_package && userData.ton_boost_package !== 0;
    const isBoostActive = userData?.ton_boost_active === true;
    const hasFarmingData = farmingData && farmingData.length > 0;
    const hasTransactions = transactions && transactions.length > 0;

    console.log(`📊 СТАТУС ПОКУПКИ:`);
    console.log(`   Пакет записан: ${hasBoostPackage ? '✅' : '❌'}`);
    console.log(`   Активация завершена: ${isBoostActive ? '✅' : '❌'}`);
    console.log(`   Farming данные созданы: ${hasFarmingData ? '✅' : '❌'}`);
    console.log(`   Транзакции найдены: ${hasTransactions ? '✅' : '❌'}`);

    if (hasBoostPackage && !isBoostActive && !hasFarmingData && hasTransactions) {
      console.log('\n🚨 ДИАГНОЗ: АКТИВАЦИЯ ЗАСТРЯЛА НА ПОЛОВИНЕ!');
      console.log('   Причина: TonFarmingRepository.activateBoost() не смог создать запись');
      console.log('   Проблема: Несовместимость типов user_id (INTEGER vs STRING)');
      console.log('');
      console.log('🔧 НЕОБХОДИМЫЕ ДЕЙСТВИЯ:');
      console.log('   1. Исправить тип user_id в TonFarmingRepository.ts (строка ~286)');
      console.log('   2. Создать недостающую запись в ton_farming_data вручную');
      console.log('   3. Активировать ton_boost_active = true в users');
      console.log('   4. Система автоматически начнет генерировать доходы');
    }

    // Проверяем других пользователей в похожем состоянии
    console.log('\n3️⃣ ПОИСК ДРУГИХ ПОСТРАДАВШИХ:');
    console.log('=============================');
    
    const { data: similarUsers, error: similarError } = await supabase
      .from('users')
      .select('id, ton_boost_package, ton_boost_active, created_at')
      .not('ton_boost_package', 'is', null)
      .neq('ton_boost_package', 0)
      .eq('ton_boost_active', false)
      .order('created_at', { ascending: false });

    if (similarUsers && similarUsers.length > 0) {
      console.log(`🔍 НАЙДЕНО ${similarUsers.length} пользователей с незавершенной активацией:`);
      
      for (const user of similarUsers) {
        // Проверяем есть ли у них запись в ton_farming_data
        const { data: checkFarming } = await supabase
          .from('ton_farming_data')
          .select('user_id')
          .eq('user_id', user.id.toString())
          .single();
        
        const hasData = !!checkFarming;
        console.log(`   User ${user.id}: Package ${user.ton_boost_package}, Active: ${user.ton_boost_active}, Has Data: ${hasData ? '✅' : '❌'}`);
      }
      
      const affectedUsers = similarUsers.filter(async (user) => {
        const { data } = await supabase
          .from('ton_farming_data')
          .select('user_id')
          .eq('user_id', user.id.toString())
          .single();
        return !data;
      });
      
      console.log(`\n🚨 ПОСТРАДАВШИХ ПОЛЬЗОВАТЕЛЕЙ: ${similarUsers.length}`);
      console.log('   Все они нуждаются в восстановлении после исправления типа данных');
    }

    console.log('\n4️⃣ ПЛАН ИСПРАВЛЕНИЯ:');
    console.log('====================');
    console.log('');
    console.log('🎯 ПОСЛЕДОВАТЕЛЬНОСТЬ ДЕЙСТВИЙ:');
    console.log('   1. ИСПРАВИТЬ modules/boost/TonFarmingRepository.ts:');
    console.log('      Строка ~286: user_id: parseInt(userId) → user_id: userId.toString()');
    console.log('');
    console.log('   2. ВОССТАНОВИТЬ ПОСТРАДАВШИХ ПОЛЬЗОВАТЕЛЕЙ:');
    console.log('      - Создать записи в ton_farming_data');
    console.log('      - Активировать ton_boost_active = true');
    console.log('');
    console.log('   3. ПРОВЕРИТЬ РАБОТУ:');
    console.log('      - Планировщик начнет обрабатывать восстановленных пользователей');
    console.log('      - Новые покупки будут работать сразу');

    console.log('\n✅ === АНАЛИЗ ЗАВЕРШЕН ===\n');

  } catch (error) {
    console.error('❌ Критическая ошибка анализа:', error);
  }
}

// Запускаем анализ
checkUser290BoostPurchase();