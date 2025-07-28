/**
 * СРОЧНАЯ ПРОВЕРКА: Пользователь 299 - проблема с TON Boost
 * Диагностика без изменения кода
 */

import { supabase } from '../core/supabase';

async function urgentCheckUser299() {
  console.log('🚨 СРОЧНАЯ ПРОВЕРКА ПОЛЬЗОВАТЕЛЯ 299');
  console.log('=' .repeat(70));
  
  try {
    // 1. Проверяем данные пользователя
    console.log('\n📋 1. ДАННЫЕ ПОЛЬЗОВАТЕЛЯ 299:');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', 299)
      .single();
    
    if (userError) {
      console.error('❌ Ошибка получения пользователя:', userError);
    } else {
      console.log('Пользователь 299:');
      console.log('- balance_ton:', user.balance_ton);
      console.log('- balance_uni:', user.balance_uni);
      console.log('- ton_boost_active:', user.ton_boost_active);
      console.log('- ton_boost_package:', user.ton_boost_package);
      console.log('- ton_farming_balance:', user.ton_farming_balance);
      console.log('- created_at:', user.created_at);
    }
    
    // 2. Проверяем все транзакции пользователя
    console.log('\n📋 2. ВСЕ ТРАНЗАКЦИИ ПОЛЬЗОВАТЕЛЯ 299:');
    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 299)
      .order('created_at', { ascending: false })
      .limit(30);
    
    if (transError) {
      console.error('❌ Ошибка получения транзакций:', transError);
    } else {
      console.log(`Найдено транзакций: ${transactions?.length}`);
      
      // Группируем по типам
      const byType: Record<string, any[]> = {};
      transactions?.forEach(t => {
        if (!byType[t.type]) byType[t.type] = [];
        byType[t.type].push(t);
      });
      
      console.log('\nТранзакции по типам:');
      Object.entries(byType).forEach(([type, trans]) => {
        console.log(`\n${type}: ${trans.length} транзакций`);
        trans.forEach(t => {
          console.log(`  - ID ${t.id}: ${t.amount} ${t.currency}, статус: ${t.status}, время: ${t.created_at}`);
          if (t.metadata) {
            console.log(`    metadata:`, JSON.stringify(t.metadata).substring(0, 100));
          }
        });
      });
      
      // Проверяем транзакции TON
      const tonTransactions = transactions?.filter(t => t.currency === 'TON');
      console.log(`\n💰 TON транзакции (${tonTransactions?.length}):`);
      tonTransactions?.forEach(t => {
        console.log(`- ${t.type}: ${t.amount} TON, статус: ${t.status}, ID: ${t.id}`);
      });
      
      // Проверяем транзакции BOOST_PURCHASE
      const boostPurchases = transactions?.filter(t => t.type === 'BOOST_PURCHASE');
      console.log(`\n🚀 BOOST_PURCHASE транзакции (${boostPurchases?.length}):`);
      boostPurchases?.forEach(t => {
        console.log(`- ID ${t.id}: ${t.amount} ${t.currency}, статус: ${t.status}`);
        console.log(`  metadata:`, t.metadata);
      });
    }
    
    // 3. Проверяем ton_farming_data
    console.log('\n📋 3. ПРОВЕРКА ton_farming_data:');
    const { data: farmingData, error: farmingError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', '299');
    
    if (farmingError) {
      console.error('❌ Ошибка получения ton_farming_data:', farmingError);
    } else {
      console.log(`Записей в ton_farming_data: ${farmingData?.length || 0}`);
      farmingData?.forEach(f => {
        console.log(`- farming_balance: ${f.farming_balance}, boost_active: ${f.boost_active}, package: ${f.boost_package_id}`);
      });
    }
    
    // 4. Проверяем boost_purchases (если используется)
    console.log('\n📋 4. ПРОВЕРКА boost_purchases:');
    const { data: boostPurchasesTable, error: boostError } = await supabase
      .from('boost_purchases')
      .select('*')
      .eq('user_id', 299);
    
    if (boostError) {
      console.error('❌ Ошибка получения boost_purchases:', boostError);
    } else {
      console.log(`Записей в boost_purchases: ${boostPurchasesTable?.length || 0}`);
      boostPurchasesTable?.forEach(b => {
        console.log(`- ID ${b.id}: package ${b.package_id}, статус: ${b.status}, сумма: ${b.amount}`);
      });
    }
    
    // 5. Проверяем баланс TON
    console.log('\n📋 5. АНАЛИЗ БАЛАНСА:');
    const tonDeposits = transactions?.filter(t => 
      t.currency === 'TON' && 
      (t.type === 'TON_DEPOSIT' || t.type === 'DEPOSIT')
    );
    const tonWithdrawals = transactions?.filter(t => 
      t.currency === 'TON' && 
      (t.type === 'BOOST_PURCHASE' || t.type === 'WITHDRAWAL')
    );
    
    const totalDeposits = tonDeposits?.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0) || 0;
    const totalWithdrawals = tonWithdrawals?.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0) || 0;
    
    console.log(`💰 Сумма депозитов TON: ${totalDeposits}`);
    console.log(`💸 Сумма списаний TON: ${totalWithdrawals}`);
    console.log(`📊 Расчетный баланс: ${totalDeposits - totalWithdrawals}`);
    console.log(`📱 Фактический баланс: ${user?.balance_ton}`);
    
    // 6. Проверяем последние действия
    console.log('\n📋 6. ПОСЛЕДНИЕ ДЕЙСТВИЯ (хронология):');
    const recentActions = transactions?.slice(0, 10);
    recentActions?.forEach(t => {
      console.log(`- ${t.created_at}: ${t.type} - ${t.amount} ${t.currency} (статус: ${t.status})`);
    });
    
    console.log('\n🎯 ВЫВОДЫ:');
    console.log('1. Проверьте, есть ли транзакции BOOST_PURCHASE');
    console.log('2. Проверьте, правильный ли баланс TON');
    console.log('3. Проверьте, создана ли запись в ton_farming_data');
    console.log('4. Проверьте metadata транзакций на предмет ошибок');
    
  } catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА:', error);
  }
}

// Запуск проверки
urgentCheckUser299().then(() => {
  console.log('\n✅ Проверка завершена');
  process.exit(0);
}).catch(error => {
  console.error('❌ Ошибка проверки:', error);
  process.exit(1);
});