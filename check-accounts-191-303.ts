import { supabase } from './core/supabaseClient';

async function checkAccounts191To303() {
  console.log('🔍 ПРОВЕРКА АККАУНТОВ 191-303 И ИСТОЧНИКОВ TON ТРАНЗАКЦИЙ');
  console.log('='.repeat(70));

  try {
    // 1. Проверяем аккаунты 191-303
    console.log('\n1️⃣ АНАЛИЗ АККАУНТОВ 191-303:');
    
    const { data: problemAccounts, error: accountsError } = await supabase
      .from('users')
      .select('*')
      .gte('id', 191)
      .lte('id', 303)
      .order('id', { ascending: true });

    if (!accountsError && problemAccounts) {
      console.log(`📊 Всего аккаунтов 191-303: ${problemAccounts.length}`);
      
      let tonBalanceCount = 0;
      let tonBoostActiveCount = 0;
      let uniActiveCount = 0;
      let noWalletCount = 0;
      
      console.log('\n🔍 ДЕТАЛЬНЫЙ АНАЛИЗ:');
      problemAccounts.forEach(user => {
        if (user.balance_ton > 0) tonBalanceCount++;
        if (user.ton_boost_active) tonBoostActiveCount++;
        if (user.uni_farming_active) uniActiveCount++;
        if (!user.ton_wallet_address) noWalletCount++;
        
        // Показываем первые 10 проблемных
        if (problemAccounts.indexOf(user) < 10) {
          console.log(`   User ${user.id}:`);
          console.log(`     TON Balance: ${user.balance_ton}`);
          console.log(`     TON Boost: ${user.ton_boost_active ? 'ДА' : 'НЕТ'}`);
          console.log(`     UNI Farming: ${user.uni_farming_active ? 'ДА' : 'НЕТ'}`);
          console.log(`     Wallet: ${user.ton_wallet_address || 'НЕТ'}`);
          console.log(`     Создан: ${user.created_at}`);
          console.log('     ---');
        }
      });
      
      console.log('\n📈 СТАТИСТИКА АККАУНТОВ 191-303:');
      console.log(`   С TON балансом: ${tonBalanceCount}`);
      console.log(`   С активным TON Boost: ${tonBoostActiveCount}`);
      console.log(`   С активным UNI Farming: ${uniActiveCount}`);
      console.log(`   Без привязанного кошелька: ${noWalletCount}`);
      console.log(`   Процент без кошелька: ${Math.round(noWalletCount / problemAccounts.length * 100)}%`);
    }

    // 2. Ищем TON транзакции для этих аккаунтов
    console.log('\n2️⃣ TON ТРАНЗАКЦИИ АККАУНТОВ 191-303:');
    
    const { data: tonTransactions, error: tonTxError } = await supabase
      .from('transactions')
      .select('*')
      .gte('user_id', 191)
      .lte('user_id', 303)
      .or('amount_ton.gt.0,currency.eq.TON')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!tonTxError && tonTransactions && tonTransactions.length > 0) {
      console.log(`💰 TON транзакций найдено: ${tonTransactions.length}`);
      
      tonTransactions.forEach((tx, idx) => {
        console.log(`   ${idx + 1}. User ${tx.user_id}: [${tx.created_at}]`);
        console.log(`      Type: ${tx.type}`);
        console.log(`      Amount TON: ${tx.amount_ton}`);
        console.log(`      Amount: ${tx.amount}`);
        console.log(`      Currency: ${tx.currency}`);
        console.log(`      Description: ${(tx.description || '').substring(0, 50)}...`);
        console.log(`      Status: ${tx.status}`);
        console.log('      ---');
      });
    } else {
      console.log('❌ TON транзакций для аккаунтов 191-303 НЕ НАЙДЕНО');
    }

    // 3. Проверяем ton_farming_data для этих аккаунтов
    console.log('\n3️⃣ TON FARMING DATA для аккаунтов 191-303:');
    
    const { data: farmingData, error: farmingError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .gte('user_id', 191)
      .lte('user_id', 303)
      .order('user_id', { ascending: true });

    if (!farmingError && farmingData && farmingData.length > 0) {
      console.log(`🌾 Записей в ton_farming_data: ${farmingData.length}`);
      
      farmingData.forEach((farm, idx) => {
        if (idx < 10) { // Показываем первые 10
          console.log(`   User ${farm.user_id}:`);
          console.log(`     Farming Balance: ${farm.farming_balance}`);
          console.log(`     Boost Active: ${farm.boost_active}`);
          console.log(`     Package: ${farm.boost_package_id || 'НЕТ'}`);
          console.log(`     Rate: ${farm.farming_rate || 'НЕТ'}`);
          console.log(`     Created: ${farm.created_at}`);
          console.log('     ---');
        }
      });
    } else {
      console.log('❌ TON farming data для аккаунтов 191-303 НЕ НАЙДЕНО');
    }

    // 4. ОТКУДА ИДУТ TON ТРАНЗАКЦИИ СЕЙЧАС?
    console.log('\n4️⃣ АНАЛИЗ ИСТОЧНИКОВ TON ТРАНЗАКЦИЙ:');
    
    // Ищем все TON транзакции за последний час
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: recentTonTx, error: recentTonError } = await supabase
      .from('transactions')
      .select('*')
      .gte('created_at', oneHourAgo)
      .or('amount_ton.gt.0,currency.eq.TON')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!recentTonError && recentTonTx && recentTonTx.length > 0) {
      console.log(`⚡ TON транзакций за последний час: ${recentTonTx.length}`);
      
      // Анализируем поля, где записывается TON
      const fieldAnalysis = {
        amount_ton: 0,
        amount: 0,
        currency_ton: 0,
        farming_reward: 0,
        referral_reward: 0
      };
      
      recentTonTx.forEach(tx => {
        if (tx.amount_ton && tx.amount_ton > 0) fieldAnalysis.amount_ton++;
        if (tx.amount && tx.currency === 'TON') fieldAnalysis.amount++;
        if (tx.currency === 'TON') fieldAnalysis.currency_ton++;
        if (tx.type === 'FARMING_REWARD') fieldAnalysis.farming_reward++;
        if (tx.type === 'REFERRAL_REWARD') fieldAnalysis.referral_reward++;
      });
      
      console.log('\n📊 АНАЛИЗ ПОЛЕЙ TON ТРАНЗАКЦИЙ:');
      console.log(`   amount_ton > 0: ${fieldAnalysis.amount_ton} транзакций`);
      console.log(`   amount + currency=TON: ${fieldAnalysis.amount} транзакций`);
      console.log(`   currency = TON: ${fieldAnalysis.currency_ton} транзакций`);
      console.log(`   FARMING_REWARD: ${fieldAnalysis.farming_reward} транзакций`);
      console.log(`   REFERRAL_REWARD: ${fieldAnalysis.referral_reward} транзакций`);
      
      console.log('\n💡 ПРИМЕРЫ ПОСЛЕДНИХ TON ТРАНЗАКЦИЙ:');
      recentTonTx.slice(0, 5).forEach((tx, idx) => {
        console.log(`   ${idx + 1}. User ${tx.user_id}: ${tx.type}`);
        console.log(`      amount_ton: ${tx.amount_ton}`);
        console.log(`      amount: ${tx.amount}`);
        console.log(`      currency: ${tx.currency}`);
        console.log(`      Куда записано: ${tx.amount_ton > 0 ? 'amount_ton' : 'amount+currency'}`);
        console.log('      ---');
      });
    } else {
      console.log('❌ TON транзакций за последний час НЕ НАЙДЕНО');
    }

    // 5. Проверяем структуру таблицы transactions
    console.log('\n5️⃣ СТРУКТУРА ТАБЛИЦЫ TRANSACTIONS:');
    
    const { data: sampleTx, error: sampleError } = await supabase
      .from('transactions')
      .select('*')
      .limit(1);

    if (!sampleError && sampleTx && sampleTx.length > 0) {
      const tx = sampleTx[0];
      console.log('🔍 ПОЛЯ В ТАБЛИЦЕ TRANSACTIONS:');
      Object.keys(tx).forEach(key => {
        console.log(`   ${key}: ${typeof tx[key]} = ${tx[key]}`);
      });
    }

    // 6. ИТОГОВЫЙ ДИАГНОЗ
    console.log('\n6️⃣ ИТОГОВЫЙ ДИАГНОЗ:');
    
    console.log('\n🎯 ПРОБЛЕМЫ АККАУНТОВ 191-303:');
    if (problemAccounts) {
      const problematicUsers = problemAccounts.filter(u => 
        (u.balance_ton > 0 && !u.ton_boost_active) || 
        (!u.ton_wallet_address && u.balance_ton > 0)
      );
      
      console.log(`   Проблемных аккаунтов: ${problematicUsers.length}`);
      console.log(`   Основные проблемы:`);
      console.log(`   - Есть TON баланс, но TON Boost не активен`);
      console.log(`   - Нет привязанного кошелька`);
      console.log(`   - Возможно, нет записей в ton_farming_data`);
    }
    
    console.log('\n💰 ИСТОЧНИКИ TON ТРАНЗАКЦИЙ:');
    console.log(`   Основной источник: FARMING_REWARD и REFERRAL_REWARD`);
    console.log(`   Поля записи: amount_ton и amount+currency`);
    console.log(`   Депозитные транзакции: НЕ СОЗДАЮТСЯ отдельно`);
    
  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
  }
}

checkAccounts191To303().catch(console.error);