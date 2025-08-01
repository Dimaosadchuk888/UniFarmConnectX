import { supabase } from './core/supabaseClient';

async function traceTonDepositFlow() {
  console.log('🔍 ТРАССИРОВКА ПОТОКА TON ДЕПОЗИТОВ');
  console.log('='.repeat(50));

  try {
    // 1. Поиск всех возможных TON депозитных транзакций в системе
    console.log('\n1️⃣ ПОИСК ВСЕХ ТИПОВ ДЕПОЗИТНЫХ ТРАНЗАКЦИЙ:');
    
    const searchTerms = [
      'DEPOSIT',
      'TON_DEPOSIT', 
      'FARMING_DEPOSIT',
      'BOOST_PURCHASE',
      'deposit',
      'пополнение',
      'blockchain'
    ];

    for (const term of searchTerms) {
      const { data: txByTerm, error: termError } = await supabase
        .from('transactions')
        .select('id, user_id, type, amount_ton, amount_uni, amount, currency, description, created_at')
        .or(`type.ilike.%${term}%,description.ilike.%${term}%`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!termError && txByTerm && txByTerm.length > 0) {
        console.log(`\n📋 Найдено по "${term}": ${txByTerm.length} транзакций`);
        txByTerm.forEach((tx, idx) => {
          console.log(`   ${idx + 1}. User ${tx.user_id}: [${tx.created_at}] ${tx.type}`);
          console.log(`      Amount: ${tx.amount_ton || tx.amount_uni || tx.amount} ${tx.currency || 'unknown'}`);
          console.log(`      Description: ${(tx.description || '').substring(0, 60)}...`);
        });
      }
    }

    // 2. Поиск транзакций с tx_hash (blockchain транзакции)
    console.log('\n2️⃣ ПОИСК ТРАНЗАКЦИЙ С BLOCKCHAIN HASH:');
    const { data: txWithHash, error: hashError } = await supabase
      .from('transactions')
      .select('*')
      .not('tx_hash', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!hashError && txWithHash && txWithHash.length > 0) {
      console.log(`🔗 Найдено транзакций с tx_hash: ${txWithHash.length}`);
      txWithHash.forEach((tx, idx) => {
        console.log(`   ${idx + 1}. User ${tx.user_id}: [${tx.created_at}] ${tx.type}`);
        console.log(`      TX Hash: ${(tx.tx_hash || '').substring(0, 20)}...`);
        console.log(`      Amount: ${tx.amount_ton || tx.amount_uni || tx.amount} ${tx.currency}`);
        console.log(`      Description: ${(tx.description || '').substring(0, 50)}...`);
      });
    } else {
      console.log('❌ Транзакций с blockchain hash не найдено');
    }

    // 3. Анализ пользователей с TON Boost но без депозитных транзакций
    console.log('\n3️⃣ АНАЛИЗ ПОЛЬЗОВАТЕЛЕЙ С TON BOOST:');
    const { data: tonBoostUsers, error: boostError } = await supabase
      .from('ton_farming_data')
      .select('user_id, farming_balance, boost_active, boost_package_id')
      .eq('boost_active', true)
      .gt('farming_balance', 0)
      .limit(10);

    if (!boostError && tonBoostUsers && tonBoostUsers.length > 0) {
      console.log(`🚀 Пользователей с активным TON Boost: ${tonBoostUsers.length}`);
      
      for (const boostUser of tonBoostUsers) {
        console.log(`\n   User ${boostUser.user_id}: ${boostUser.farming_balance} TON (пакет ${boostUser.boost_package_id})`);
        
        // Ищем депозитные транзакции для этого пользователя
        const { data: userDeposits, error: depositError } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', boostUser.user_id)
          .or('type.ilike.%DEPOSIT%,description.ilike.%deposit%,description.ilike.%пополнение%,description.ilike.%blockchain%')
          .order('created_at', { ascending: false });

        if (!depositError && userDeposits && userDeposits.length > 0) {
          console.log(`      ✅ Найдено депозитов: ${userDeposits.length}`);
          userDeposits.forEach((dep, depIdx) => {
            console.log(`         ${depIdx + 1}. [${dep.created_at}] ${dep.type}: ${dep.amount_ton || dep.amount} TON`);
          });
        } else {
          console.log(`      ❌ ДЕПОЗИТОВ НЕ НАЙДЕНО (но имеет ${boostUser.farming_balance} TON!)`);
        }
      }
    }

    // 4. Поиск "потерянных" TON депозитов через metadata
    console.log('\n4️⃣ ПОИСК ЧЕРЕЗ METADATA:');
    const { data: metaTx, error: metaError } = await supabase
      .from('transactions')
      .select('*')
      .not('metadata', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!metaError && metaTx && metaTx.length > 0) {
      const tonRelated = metaTx.filter(tx => {
        const metadata = typeof tx.metadata === 'object' ? tx.metadata : 
          (typeof tx.metadata === 'string' ? JSON.parse(tx.metadata || '{}') : {});
        const metaStr = JSON.stringify(metadata).toLowerCase();
        return metaStr.includes('ton') || metaStr.includes('deposit') || metaStr.includes('blockchain');
      });

      if (tonRelated.length > 0) {
        console.log(`📦 Найдено транзакций с TON metadata: ${tonRelated.length}`);
        tonRelated.forEach((tx, idx) => {
          console.log(`   ${idx + 1}. User ${tx.user_id}: [${tx.created_at}] ${tx.type}`);
          console.log(`      Metadata: ${JSON.stringify(tx.metadata).substring(0, 100)}...`);
        });
      }
    }

    // 5. Проверка конкретно пользователя 251 на предмет "скрытых" депозитов
    console.log('\n5️⃣ ГЛУБОКИЙ ПОИСК ДЕПОЗИТОВ ПОЛЬЗОВАТЕЛЯ 251:');
    const { data: user251Deep, error: deepError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 251)
      .or('amount_ton.gt.1,description.ilike.%3%,description.ilike.%TON%')
      .order('created_at', { ascending: false });

    if (!deepError && user251Deep && user251Deep.length > 0) {
      console.log(`🔍 Потенциальные депозиты пользователя 251: ${user251Deep.length}`);
      user251Deep.forEach((tx, idx) => {
        if (idx < 10) { // Показываем только первые 10
          console.log(`   ${idx + 1}. [${tx.created_at}] ${tx.type}`);
          console.log(`      Amount TON: ${tx.amount_ton}, Amount: ${tx.amount}`);
          console.log(`      Description: ${tx.description}`);
          console.log('      ---');
        }
      });
    }

    // 6. Итоговый анализ
    console.log('\n6️⃣ ВЫВОДЫ:');
    console.log('🔍 Анализ показывает:');
    
    // Подсчитываем пользователей с TON балансом без депозитных транзакций
    const { data: tonUsers, error: tonUsersError } = await supabase
      .from('users')
      .select('id, username, balance_ton')
      .gt('balance_ton', 0);

    if (!tonUsersError && tonUsers) {
      let usersWithoutDeposits = 0;
      for (const user of tonUsers) {
        const { data: userDeposits, error: depError } = await supabase
          .from('transactions')
          .select('id')
          .eq('user_id', user.id)
          .or('type.ilike.%DEPOSIT%,description.ilike.%deposit%');

        if (!depError && (!userDeposits || userDeposits.length === 0)) {
          usersWithoutDeposits++;
        }
      }

      console.log(`📊 Пользователей с TON балансом: ${tonUsers.length}`);
      console.log(`❌ Из них БЕЗ депозитных транзакций: ${usersWithoutDeposits}`);
      console.log(`📈 Процент "потерянных" депозитов: ${Math.round(usersWithoutDeposits / tonUsers.length * 100)}%`);
    }

  } catch (error) {
    console.error('❌ ОШИБКА ТРАССИРОВКИ:', error);
  }
}

traceTonDepositFlow().catch(console.error);