/**
 * Финальная верификация работоспособности модуля TON Boost
 * Роль: Технический аудитор системы
 * Цель: Убедиться, что система реально работает корректно после изменений
 */

import { supabase } from './core/supabase.js';

async function auditTonBoostSystem() {
  console.log('=== ФИНАЛЬНАЯ ВЕРИФИКАЦИЯ TON BOOST ===');
  console.log('Дата аудита:', new Date().toISOString());
  console.log('\n');

  // 1. Проверка накопления депозитов
  console.log('🔍 1. ПРОВЕРКА НАКОПЛЕНИЯ ДЕПОЗИТОВ');
  console.log('=' .repeat(50));
  
  // Получаем всех пользователей с активными TON Boost
  const { data: tonFarmingUsers, error: tfError } = await supabase
    .from('ton_farming_data')
    .select('*')
    .order('user_id');

  if (tfError) {
    console.error('❌ Ошибка получения ton_farming_data:', tfError);
    return;
  }

  console.log(`✅ Найдено ${tonFarmingUsers?.length || 0} пользователей с TON Boost`);
  
  // Анализ каждого пользователя
  for (const user of tonFarmingUsers || []) {
    console.log(`\n👤 Пользователь ID: ${user.user_id}`);
    console.log(`  - farming_balance: ${user.farming_balance} TON`);
    console.log(`  - farming_rate: ${user.farming_rate}`);
    console.log(`  - boost_package_id: ${user.boost_package_id}`);
    
    // Получаем все BOOST_PURCHASE транзакции этого пользователя
    const { data: purchases, error: pError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.user_id)
      .eq('type', 'BOOST_PURCHASE')
      .order('created_at', { ascending: true });

    if (pError) {
      console.error(`❌ Ошибка получения транзакций для user ${user.user_id}:`, pError);
      continue;
    }

    console.log(`  - Найдено ${purchases?.length || 0} транзакций BOOST_PURCHASE`);
    
    let totalPurchased = 0;
    for (const purchase of purchases || []) {
      const amount = parseFloat(purchase.amount_ton || purchase.amount || '0');
      totalPurchased += amount;
      
      // Проверяем metadata
      let metadata = null;
      try {
        if (purchase.metadata) {
          metadata = typeof purchase.metadata === 'string' 
            ? JSON.parse(purchase.metadata) 
            : purchase.metadata;
        }
      } catch (e) {
        console.error(`  ⚠️ Ошибка парсинга metadata для транзакции ${purchase.id}:`, e.message);
      }
      
      console.log(`  📝 Транзакция ${purchase.id}: ${amount} TON (${purchase.created_at})`);
      if (metadata) {
        console.log(`     metadata:`, JSON.stringify(metadata, null, 2));
      }
    }
    
    console.log(`  💰 Итого куплено: ${totalPurchased} TON`);
    console.log(`  📊 Текущий farming_balance: ${user.farming_balance} TON`);
    
    if (Math.abs(totalPurchased - user.farming_balance) > 0.01) {
      console.log(`  ❌ НЕСООТВЕТСТВИЕ: разница ${totalPurchased - user.farming_balance} TON`);
    } else {
      console.log(`  ✅ Баланс соответствует сумме покупок`);
    }
  }

  // 2. Проверка начислений дохода
  console.log('\n\n🔍 2. ПРОВЕРКА НАЧИСЛЕНИЙ ДОХОДА');
  console.log('=' .repeat(50));
  
  // Получаем последние транзакции дохода TON Boost
  const { data: incomeTransactions, error: iError } = await supabase
    .from('transactions')
    .select('*')
    .eq('type', 'FARMING_REWARD')
    .like('description', '%TON Boost%')
    .order('created_at', { ascending: false })
    .limit(20);

  if (iError) {
    console.error('❌ Ошибка получения транзакций дохода:', iError);
  } else {
    console.log(`✅ Найдено ${incomeTransactions?.length || 0} последних транзакций дохода`);
    
    // Группируем по пользователям
    const incomeByUser = new Map();
    for (const tx of incomeTransactions || []) {
      if (!incomeByUser.has(tx.user_id)) {
        incomeByUser.set(tx.user_id, []);
      }
      incomeByUser.get(tx.user_id).push(tx);
    }
    
    // Анализируем каждого пользователя
    for (const [userId, transactions] of incomeByUser) {
      console.log(`\n👤 Доходы пользователя ${userId}:`);
      
      // Получаем данные фарминга
      const userData = tonFarmingUsers?.find(u => u.user_id === userId);
      if (userData) {
        console.log(`  - farming_balance: ${userData.farming_balance} TON`);
        console.log(`  - farming_rate: ${userData.farming_rate}`);
        console.log(`  - Ожидаемый доход за 5 мин: ${userData.farming_balance * userData.farming_rate * 5 / 1440} TON`);
      }
      
      // Показываем последние транзакции
      for (const tx of transactions.slice(0, 3)) {
        const amount = parseFloat(tx.amount_ton || tx.amount || '0');
        console.log(`  📝 ${tx.created_at}: +${amount} TON`);
        
        // Проверяем metadata
        try {
          if (tx.metadata) {
            const metadata = typeof tx.metadata === 'string' 
              ? JSON.parse(tx.metadata) 
              : tx.metadata;
            if (metadata.original_type === 'TON_BOOST_INCOME') {
              console.log(`     ✅ metadata.original_type = TON_BOOST_INCOME`);
            }
          }
        } catch (e) {
          console.error(`     ⚠️ Ошибка metadata:`, e.message);
        }
      }
    }
  }

  // 3. Проверка SQL ошибок с metadata
  console.log('\n\n🔍 3. ПРОВЕРКА SQL ОШИБОК С METADATA');
  console.log('=' .repeat(50));
  
  // Получаем транзакции с потенциально проблемным metadata
  const { data: allTransactions, error: atError } = await supabase
    .from('transactions')
    .select('id, metadata')
    .not('metadata', 'is', null)
    .limit(100);

  if (atError) {
    console.error('❌ Ошибка получения транзакций:', atError);
  } else {
    let invalidJsonCount = 0;
    let validJsonCount = 0;
    
    for (const tx of allTransactions || []) {
      try {
        if (typeof tx.metadata === 'string') {
          JSON.parse(tx.metadata);
        }
        validJsonCount++;
      } catch (e) {
        invalidJsonCount++;
        console.log(`❌ Невалидный JSON в транзакции ${tx.id}:`, tx.metadata);
      }
    }
    
    console.log(`✅ Валидный JSON: ${validJsonCount} транзакций`);
    console.log(`❌ Невалидный JSON: ${invalidJsonCount} транзакций`);
  }

  // 4. Проверка пользователей с проблемами
  console.log('\n\n🔍 4. ПОЛЬЗОВАТЕЛИ С ПРОБЛЕМАМИ');
  console.log('=' .repeat(50));
  
  // Находим пользователей с farming_balance = 0, но с покупками
  const problemUsers = [];
  
  for (const user of tonFarmingUsers || []) {
    if (user.farming_balance === 0 || user.farming_balance === '0') {
      // Проверяем есть ли у них покупки
      const { data: purchases } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.user_id)
        .eq('type', 'BOOST_PURCHASE')
        .limit(1);
      
      if (purchases && purchases.length > 0) {
        problemUsers.push({
          user_id: user.user_id,
          farming_balance: user.farming_balance,
          has_purchases: true
        });
      }
    }
  }
  
  console.log(`\n❗ Найдено ${problemUsers.length} пользователей с farming_balance = 0, но с покупками:`);
  for (const user of problemUsers) {
    console.log(`  - User ${user.user_id}: farming_balance = ${user.farming_balance}`);
  }

  // 5. Итоговая статистика
  console.log('\n\n📊 ИТОГОВАЯ СТАТИСТИКА');
  console.log('=' .repeat(50));
  
  const totalUsers = tonFarmingUsers?.length || 0;
  const activeUsers = tonFarmingUsers?.filter(u => parseFloat(u.farming_balance) > 0).length || 0;
  const totalFarmingBalance = tonFarmingUsers?.reduce((sum, u) => sum + parseFloat(u.farming_balance || 0), 0) || 0;
  
  console.log(`✅ Всего пользователей с TON Boost: ${totalUsers}`);
  console.log(`✅ Активных (farming_balance > 0): ${activeUsers}`);
  console.log(`✅ Общий farming_balance: ${totalFarmingBalance} TON`);
  console.log(`❗ Пользователей с проблемами: ${problemUsers.length}`);
  
  console.log('\n=== КОНЕЦ ВЕРИФИКАЦИИ ===');
}

// Запускаем аудит
auditTonBoostSystem()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Критическая ошибка:', err);
    process.exit(1);
  });