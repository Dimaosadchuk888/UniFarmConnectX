#!/usr/bin/env ts-node
import { supabase } from './core/supabase';

/**
 * Тест накопительной логики TON Boost
 * Проверяет корректность суммирования депозитов
 */
async function testTonBoostAccumulation() {
  console.log('🧪 Тестирование накопительной логики TON Boost...\n');
  
  // Тестовый пользователь
  const testUserId = 74;
  
  try {
    // 1. Получаем текущее состояние
    console.log('📊 Текущее состояние TON Boost для пользователя', testUserId);
    
    const { data: tonData, error: tonError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', testUserId)
      .single();
    
    if (tonError && tonError.code !== 'PGRST116') {
      console.error('❌ Ошибка получения данных:', tonError);
    }
    
    if (tonData) {
      console.log('✅ Данные из ton_farming_data:');
      console.log('   - farming_balance:', tonData.farming_balance);
      console.log('   - boost_package_id:', tonData.boost_package_id);
      console.log('   - farming_rate:', tonData.farming_rate);
      console.log('   - boost_active:', tonData.boost_active);
    } else {
      console.log('⚠️  Нет данных в ton_farming_data, проверяем fallback...');
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('ton_farming_balance, ton_boost_package_id, ton_farming_rate, ton_boost_active')
        .eq('id', testUserId)
        .single();
      
      if (userData) {
        console.log('✅ Данные из users (fallback):');
        console.log('   - ton_farming_balance:', userData.ton_farming_balance);
        console.log('   - ton_boost_package_id:', userData.ton_boost_package_id);
        console.log('   - ton_farming_rate:', userData.ton_farming_rate);
        console.log('   - ton_boost_active:', userData.ton_boost_active);
      }
    }
    
    // 2. Проверяем последние BOOST_PURCHASE транзакции
    console.log('\n📈 Последние покупки TON Boost:');
    
    const { data: purchases, error: purchaseError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', testUserId)
      .eq('type', 'BOOST_PURCHASE')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (purchases && purchases.length > 0) {
      console.log(`✅ Найдено ${purchases.length} транзакций BOOST_PURCHASE:`);
      
      let totalDeposited = 0;
      purchases.forEach((tx, idx) => {
        const amount = parseFloat(tx.amount);
        totalDeposited += amount;
        console.log(`   ${idx + 1}. ${tx.created_at} - ${amount} TON`);
        if (tx.metadata) {
          console.log(`      metadata:`, tx.metadata);
        }
      });
      
      console.log(`\n💰 Общая сумма депозитов: ${totalDeposited} TON`);
      
      // Сравниваем с farming_balance
      const currentBalance = tonData?.farming_balance || userData?.ton_farming_balance || 0;
      console.log(`📊 Текущий farming_balance: ${currentBalance} TON`);
      
      if (Math.abs(parseFloat(currentBalance) - totalDeposited) < 0.01) {
        console.log('✅ Баланс соответствует сумме депозитов!');
      } else {
        console.log('⚠️  Расхождение между балансом и суммой депозитов');
      }
    } else {
      console.log('❌ Нет транзакций BOOST_PURCHASE');
    }
    
    // 3. Рекомендации
    console.log('\n💡 Рекомендации для тестирования:');
    console.log('1. Сделайте покупку TON Boost на 5 TON');
    console.log('2. Затем сделайте еще одну покупку на 10 TON');
    console.log('3. Проверьте, что farming_balance = 15 TON');
    console.log('4. Убедитесь, что обе транзакции видны в истории');
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

// Запуск теста
testTonBoostAccumulation()
  .then(() => {
    console.log('\n✅ Тест завершен');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Ошибка выполнения:', error);
    process.exit(1);
  });