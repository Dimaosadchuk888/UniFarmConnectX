import { supabase } from './core/supabase';

async function checkLatestBoostPurchases() {
  console.log('=== ДЕТАЛЬНАЯ ПРОВЕРКА ПОСЛЕДНИХ ПОКУПОК TON BOOST ===\n');

  try {
    // 1. Проверяем транзакции boost_purchases с metadata
    console.log('📦 1. ДЕТАЛИ ТРАНЗАКЦИЙ ПОКУПКИ:\n');
    
    const { data: purchases, error: purchaseError } = await supabase
      .from('boost_purchases')
      .select('*')
      .eq('user_id', 74)
      .order('created_at', { ascending: false })
      .limit(5);

    if (purchaseError) {
      console.log('❌ Таблица boost_purchases недоступна:', purchaseError.message);
    } else if (purchases && purchases.length > 0) {
      console.log(`Найдено записей в boost_purchases: ${purchases.length}\n`);
      
      for (const purchase of purchases) {
        console.log(`ID: ${purchase.id}`);
        console.log(`  Время: ${new Date(purchase.created_at).toLocaleString()}`);
        console.log(`  Boost ID: ${purchase.boost_id}`);
        console.log(`  Source: ${purchase.source}`);
        console.log(`  Status: ${purchase.status}`);
        console.log(`  TX Hash: ${purchase.tx_hash}`);
        console.log('---');
      }
    }

    // 2. Проверяем транзакции с полными metadata
    console.log('\n📝 2. METADATA ТРАНЗАКЦИЙ ПОКУПКИ:\n');
    
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 74)
      .eq('type', 'BOOST_PURCHASE')
      .order('created_at', { ascending: false })
      .limit(5);

    if (txError) {
      console.error('❌ Ошибка получения транзакций:', txError.message);
    } else if (transactions && transactions.length > 0) {
      for (const tx of transactions) {
        console.log(`Transaction ID: ${tx.id}`);
        console.log(`  Время: ${new Date(tx.created_at).toLocaleString()}`);
        console.log(`  Сумма: ${tx.amount} ${tx.currency}`);
        
        if (tx.metadata) {
          const metadata = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata) : tx.metadata;
          console.log(`  Metadata:`, JSON.stringify(metadata, null, 2));
        } else {
          console.log(`  Metadata: отсутствует`);
        }
        console.log('---');
      }
    }

    // 3. Проверяем историю изменений ton_farming_data
    console.log('\n🔄 3. ИСТОРИЯ ИЗМЕНЕНИЙ TON_FARMING_DATA:\n');
    
    // Проверяем последние обновления
    const { data: farmingHistory, error: farmingError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', 74)
      .single();

    if (!farmingError && farmingHistory) {
      console.log('Текущее состояние:');
      console.log(`  farming_balance: ${farmingHistory.farming_balance}`);
      console.log(`  boost_active: ${farmingHistory.boost_active}`);
      console.log(`  boost_package_id: ${farmingHistory.boost_package_id}`);
      console.log(`  created_at: ${new Date(farmingHistory.created_at).toLocaleString()}`);
      console.log(`  updated_at: ${new Date(farmingHistory.updated_at).toLocaleString()}`);
      console.log(`  farming_last_update: ${new Date(farmingHistory.farming_last_update).toLocaleString()}`);
    }

    // 4. Проверяем процессы сервера
    console.log('\n⚙️  4. АНАЛИЗ СОСТОЯНИЯ СИСТЕМЫ:\n');
    
    // Смотрим время последних транзакций
    const lastPurchaseTime = transactions && transactions.length > 0 
      ? new Date(transactions[0].created_at)
      : null;
    
    const lastRewardTime = await getLastRewardTime();
    
    if (lastPurchaseTime && lastRewardTime) {
      const timeDiff = lastPurchaseTime.getTime() - lastRewardTime.getTime();
      
      if (timeDiff > 0) {
        console.log('✅ Покупки произошли ПОСЛЕ перезапуска сервера');
        console.log(`  Последняя покупка: ${lastPurchaseTime.toLocaleString()}`);
        console.log(`  Последнее начисление: ${lastRewardTime.toLocaleString()}`);
      } else {
        console.log('⚠️  Покупки произошли ДО перезапуска сервера');
        console.log(`  Последняя покупка: ${lastPurchaseTime.toLocaleString()}`);
        console.log(`  Последнее начисление: ${lastRewardTime.toLocaleString()}`);
        console.log('\n  ❌ ИСПРАВЛЕНИЯ НЕ БЫЛИ ПРИМЕНЕНЫ К ЭТИМ ПОКУПКАМ!');
      }
    }

    // 5. Выводы
    console.log('\n📊 5. ВЫВОДЫ:\n');
    
    if (farmingHistory && parseFloat(farmingHistory.farming_balance) === 0) {
      console.log('❌ farming_balance = 0 после покупок');
      console.log('   Причины:');
      console.log('   1. Сервер не был перезапущен после внесения исправлений');
      console.log('   2. Покупки использовали старый код без обновления farming_balance');
      console.log('\n✅ РЕШЕНИЕ: Нужен перезапуск сервера для применения исправлений');
    } else if (farmingHistory && parseFloat(farmingHistory.farming_balance) > 0) {
      console.log('✅ farming_balance обновлен корректно!');
      console.log(`   Текущий депозит: ${farmingHistory.farming_balance} TON`);
    }

  } catch (error) {
    console.error('❌ Ошибка при проверке:', error);
  }
}

async function getLastRewardTime() {
  const { data, error } = await supabase
    .from('transactions')
    .select('created_at')
    .eq('type', 'FARMING_REWARD')
    .eq('currency', 'TON')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return data ? new Date(data.created_at) : null;
}

checkLatestBoostPurchases();