/**
 * Полная проверка TON Boost депозитов пользователя 184
 */

import { supabase } from '../core/supabase';

async function checkTonBoostDeposits() {
  console.log('🔍 ПОЛНАЯ ПРОВЕРКА TON BOOST ДЕПОЗИТОВ ПОЛЬЗОВАТЕЛЯ 184');
  console.log('=' .repeat(70));
  
  const userId = 184;
  
  try {
    // 1. Проверяем последние транзакции
    console.log('\n📊 ПОСЛЕДНИЕ ТРАНЗАКЦИИ:');
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    const boostPurchases = transactions?.filter(t => 
      t.type === 'BOOST_PURCHASE' || 
      t.description?.includes('TON Boost') ||
      t.metadata?.original_type === 'BOOST_PURCHASE'
    ) || [];
    
    console.log(`Найдено ${boostPurchases.length} TON Boost транзакций:`);
    boostPurchases.forEach((t, i) => {
      console.log(`${i+1}. ID: ${t.id}, Тип: ${t.type}, Сумма: ${t.amount} ${t.currency}`);
      console.log(`   Описание: ${t.description}`);
      console.log(`   Дата: ${t.created_at}`);
      console.log(`   Метаданные:`, JSON.stringify(t.metadata, null, 2));
    });
    
    // 2. Проверяем состояние пользователя
    console.log('\n👤 СОСТОЯНИЕ ПОЛЬЗОВАТЕЛЯ:');
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (user) {
      console.log('Общий баланс TON:', user.balance_ton);
      console.log('TON Boost активен:', user.ton_boost_active);
      console.log('TON Boost пакет:', user.ton_boost_package);
      console.log('TON Boost ID пакета:', user.ton_boost_package_id);
      console.log('TON Boost курс:', user.ton_boost_rate);
    }
    
    // 3. Проверяем ton_farming_data таблицу
    console.log('\n💰 TON FARMING DATA:');
    const { data: farmingData } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', userId.toString())
      .order('created_at', { ascending: false });
    
    if (farmingData && farmingData.length > 0) {
      console.log(`Найдено ${farmingData.length} записей в ton_farming_data:`);
      farmingData.forEach((f, i) => {
        console.log(`${i+1}. Farming Balance: ${f.farming_balance} TON`);
        console.log(`   Farming Rate: ${f.farming_rate} TON/сек`);
        console.log(`   Package ID: ${f.boost_package_id}`);
        console.log(`   Создано: ${f.created_at}`);
        console.log(`   Обновлено: ${f.updated_at}`);
      });
      
      // Подсчет общего депозита
      const totalDeposit = farmingData.reduce((sum, f) => sum + parseFloat(f.farming_balance || '0'), 0);
      console.log(`\n💎 ОБЩИЙ ДЕПОЗИТ В ФАРМИНГЕ: ${totalDeposit} TON`);
    } else {
      console.log('❌ НЕТ ЗАПИСЕЙ В TON_FARMING_DATA');
    }
    
    // 4. Проверяем boost_packages таблицу
    console.log('\n📦 ДОСТУПНЫЕ TON BOOST ПАКЕТЫ:');
    const { data: packages } = await supabase
      .from('boost_packages')
      .select('*')
      .order('min_amount', { ascending: true });
    
    if (packages) {
      packages.forEach(p => {
        console.log(`- ID: ${p.id}, Название: ${p.name}, Сумма: ${p.min_amount} TON, Курс: ${p.rate_ton_per_second}/сек`);
      });
    }
    
    // 5. Проверяем планировщик совместимость
    console.log('\n⚙️ ПРОВЕРКА СОВМЕСТИМОСТИ С ПЛАНИРОВЩИКОМ:');
    
    const { data: schedulerCheck } = await supabase
      .from('users')
      .select('id, ton_boost_active, ton_boost_package')
      .eq('id', userId)
      .eq('ton_boost_active', true)
      .not('ton_boost_package', 'is', null);
    
    if (schedulerCheck && schedulerCheck.length > 0) {
      console.log('✅ Пользователь ВИДЕН планировщику TON Boost');
      console.log('Активный пакет:', schedulerCheck[0].ton_boost_package);
    } else {
      console.log('❌ Пользователь НЕ ВИДЕН планировщику TON Boost');
      console.log('Требования: ton_boost_active = true AND ton_boost_package IS NOT NULL');
    }
    
    // 6. Симуляция работы планировщика
    console.log('\n🚀 СИМУЛЯЦИЯ ПЛАНИРОВЩИКА:');
    
    if (farmingData && farmingData.length > 0 && user?.ton_boost_active) {
      const totalRate = farmingData.reduce((sum, f) => sum + parseFloat(f.farming_rate || '0'), 0);
      const dailyIncome = totalRate * 86400; // 24 часа в секундах
      
      console.log(`Общий курс: ${totalRate} TON/сек`);
      console.log(`Дневной доход: ${dailyIncome} TON/день`);
      console.log(`Часовой доход: ${dailyIncome / 24} TON/час`);
      console.log(`Доход за 5 минут: ${totalRate * 300} TON`);
    } else {
      console.log('❌ Планировщик не будет начислять доход - отсутствуют данные или неактивен');
    }
    
  } catch (error) {
    console.error('💥 Ошибка при проверке:', error);
  }
}

// Запуск
checkTonBoostDeposits().then(() => {
  console.log('\n✅ Проверка завершена');
  process.exit(0);
}).catch(error => {
  console.error('❌ Критическая ошибка:', error);
  process.exit(1);
});