/**
 * ДИАГНОСТИКА: ID 25 - новые депозиты не отображаются в TON Farming
 */

import { supabase } from '../core/supabase';

async function diagnoseUser25NewDeposits() {
  console.log('🚨 ДИАГНОСТИКА ПОЛЬЗОВАТЕЛЯ ID 25 - НОВЫЕ ДЕПОЗИТЫ');
  console.log('=' .repeat(70));
  
  try {
    // 1. Проверяем текущее состояние пользователя
    console.log('\n📋 1. ТЕКУЩЕЕ СОСТОЯНИЕ ПОЛЬЗОВАТЕЛЯ 25:');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', 25)
      .single();
    
    if (userError) {
      console.error('❌ Ошибка получения пользователя:', userError);
      return;
    }
    
    console.log('Пользователь 25:');
    console.log('- balance_ton:', user.balance_ton);
    console.log('- ton_boost_active:', user.ton_boost_active);
    console.log('- ton_boost_package:', user.ton_boost_package);
    console.log('- ton_farming_balance:', user.ton_farming_balance);
    console.log('- ton_farming_rate:', user.ton_farming_rate);
    console.log('- ton_farming_last_update:', user.ton_farming_last_update);
    
    // 2. Проверяем последние транзакции
    console.log('\n📋 2. ПОСЛЕДНИЕ ТРАНЗАКЦИИ (за последние 2 часа):');
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    
    const { data: recentTransactions, error: transError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .gte('created_at', twoHoursAgo)
      .order('created_at', { ascending: false });
    
    if (transError) {
      console.error('❌ Ошибка получения транзакций:', transError);
    } else {
      console.log(`Найдено транзакций за 2 часа: ${recentTransactions?.length}`);
      recentTransactions?.forEach(t => {
        console.log(`\n- ${t.created_at}:`);
        console.log(`  Тип: ${t.type}`);
        console.log(`  Сумма: ${t.amount} ${t.currency}`);
        console.log(`  Статус: ${t.status}`);
        if (t.metadata) {
          console.log(`  Metadata:`, JSON.stringify(t.metadata, null, 2));
        }
      });
    }
    
    // 3. Проверяем ton_farming_data
    console.log('\n📋 3. СОСТОЯНИЕ ton_farming_data:');
    const { data: farmingData, error: farmingError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', '25');
    
    if (farmingError) {
      console.error('❌ Ошибка получения ton_farming_data:', farmingError);
    } else {
      if (farmingData && farmingData.length > 0) {
        console.log('✅ Запись найдена в ton_farming_data:');
        const record = farmingData[0];
        console.log('- farming_balance:', record.farming_balance);
        console.log('- farming_rate:', record.farming_rate);
        console.log('- boost_active:', record.boost_active);
        console.log('- boost_package_id:', record.boost_package_id);
        console.log('- updated_at:', record.updated_at);
        console.log('- daily_income:', record.daily_income);
        console.log('- total_earned:', record.total_earned);
      } else {
        console.log('❌ НЕТ ЗАПИСИ В ton_farming_data!');
      }
    }
    
    // 4. Проверяем BOOST_PURCHASE транзакции
    console.log('\n📋 4. ПРОВЕРКА BOOST_PURCHASE ТРАНЗАКЦИЙ:');
    const { data: boostPurchases } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .eq('type', 'BOOST_PURCHASE')
      .order('created_at', { ascending: false })
      .limit(10);
    
    console.log(`Найдено BOOST_PURCHASE транзакций: ${boostPurchases?.length || 0}`);
    boostPurchases?.forEach(t => {
      console.log(`\n- ${t.created_at}: ${t.amount} ${t.currency}`);
      if (t.metadata) {
        console.log(`  boost_package_id: ${t.metadata.boost_package_id}`);
        console.log(`  transaction_source: ${t.metadata.transaction_source}`);
      }
    });
    
    // 5. Сравнение балансов
    console.log('\n📋 5. АНАЛИЗ РАСХОЖДЕНИЙ:');
    
    // Подсчитываем все BOOST_PURCHASE
    const totalBoostPurchases = boostPurchases?.reduce((sum, t) => 
      sum + parseFloat(t.amount || 0), 0) || 0;
    
    console.log(`\n💰 Сумма всех BOOST_PURCHASE: ${totalBoostPurchases} TON`);
    console.log(`📊 Баланс в users.ton_farming_balance: ${user.ton_farming_balance}`);
    console.log(`📊 Баланс в ton_farming_data: ${farmingData?.[0]?.farming_balance || 'НЕТ ЗАПИСИ'}`);
    
    // Проверяем есть ли расхождение
    const userFarmingBalance = parseFloat(user.ton_farming_balance || 0);
    const tonFarmingBalance = parseFloat(farmingData?.[0]?.farming_balance || 0);
    
    if (Math.abs(totalBoostPurchases - userFarmingBalance) > 0.001) {
      console.log('\n⚠️  РАСХОЖДЕНИЕ ОБНАРУЖЕНО!');
      console.log(`Разница между покупками и users.ton_farming_balance: ${totalBoostPurchases - userFarmingBalance} TON`);
    }
    
    if (Math.abs(totalBoostPurchases - tonFarmingBalance) > 0.001) {
      console.log('\n⚠️  РАСХОЖДЕНИЕ С ton_farming_data!');
      console.log(`Разница между покупками и ton_farming_data: ${totalBoostPurchases - tonFarmingBalance} TON`);
    }
    
    // 6. ДИАГНОЗ
    console.log('\n🔍 ДИАГНОЗ:');
    
    if (!farmingData || farmingData.length === 0) {
      console.log('❌ КРИТИЧЕСКАЯ ПРОБЛЕМА: Нет записи в ton_farming_data');
      console.log('   Это объясняет почему депозиты не отображаются в TON Farming');
    } else if (Math.abs(totalBoostPurchases - tonFarmingBalance) > 0.001) {
      console.log('❌ ПРОБЛЕМА: Баланс в ton_farming_data не соответствует сумме покупок');
      console.log('   Новые депозиты не накапливаются в farming_balance');
    } else if (!user.ton_boost_active) {
      console.log('❌ ПРОБЛЕМА: ton_boost_active = false');
      console.log('   Планировщик не будет обрабатывать этого пользователя');
    } else {
      console.log('✅ Данные синхронизированы корректно');
    }
    
  } catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА:', error);
  }
}

// Запуск диагностики
diagnoseUser25NewDeposits().then(() => {
  console.log('\n✅ Диагностика завершена');
  process.exit(0);
}).catch(error => {
  console.error('❌ Ошибка диагностики:', error);
  process.exit(1);
});