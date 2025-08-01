import { supabase } from './core/supabaseClient';

async function checkUser251Problem() {
  console.log('🔍 ДЕТАЛЬНАЯ ДИАГНОСТИКА ПОЛЬЗОВАТЕЛЯ ID 251');
  console.log('='.repeat(50));

  try {
    // 1. Информация о пользователе 251
    console.log('\n1️⃣ ИНФОРМАЦИЯ О ПОЛЬЗОВАТЕЛЕ 251:');
    const { data: user251, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', 251)
      .single();

    if (userError) {
      console.log('❌ Пользователь ID 251 не найден:', userError.message);
      return;
    }

    console.log('✅ Пользователь ID 251 найден:');
    console.log(`   - ID: ${user251.id}`);
    console.log(`   - Telegram ID: ${user251.telegram_id}`);
    console.log(`   - Username: ${user251.username}`);
    console.log(`   - First Name: ${user251.first_name}`);
    console.log(`   - UNI Balance: ${user251.balance_uni}`);
    console.log(`   - TON Balance: ${user251.balance_ton}`);
    console.log(`   - TON Wallet: ${user251.ton_wallet_address || 'не привязан'}`);
    console.log(`   - Создан: ${user251.created_at}`);
    console.log(`   - UNI Farming: ${user251.uni_farming_active ? 'активен' : 'неактивен'}`);
    console.log(`   - TON Boost: ${user251.ton_boost_active ? 'активен' : 'неактивен'}`);

    // 2. Все транзакции пользователя 251
    console.log('\n2️⃣ ВСЕ ТРАНЗАКЦИИ ПОЛЬЗОВАТЕЛЯ 251:');
    const { data: allTransactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 251)
      .order('created_at', { ascending: false });

    if (txError) {
      console.log('❌ Ошибка получения транзакций:', txError.message);
    } else {
      console.log(`📋 Всего транзакций: ${allTransactions?.length || 0}`);
      
      if (allTransactions && allTransactions.length > 0) {
        console.log('\n📊 ДЕТАЛИ ТРАНЗАКЦИЙ:');
        allTransactions.forEach((tx, idx) => {
          console.log(`   ${idx + 1}. ID: ${tx.id} | [${tx.created_at}]`);
          console.log(`      Тип: ${tx.type}`);
          console.log(`      Amount TON: ${tx.amount_ton || '0'}`);
          console.log(`      Amount UNI: ${tx.amount_uni || '0'}`);
          console.log(`      Currency: ${tx.currency || 'не указана'}`);
          console.log(`      Amount: ${tx.amount || '0'}`);
          console.log(`      Description: ${tx.description || 'нет описания'}`);
          console.log(`      Status: ${tx.status || 'unknown'}`);
          console.log(`      TX Hash: ${tx.tx_hash || 'нет'}`);
          console.log(`      Source: ${tx.source || 'нет'}`);
          console.log('      ---');
        });

        // Группируем по типам
        const byType: { [key: string]: any[] } = {};
        allTransactions.forEach(tx => {
          const type = tx.type || 'UNKNOWN';
          if (!byType[type]) byType[type] = [];
          byType[type].push(tx);
        });

        console.log('\n📈 СТАТИСТИКА ПО ТИПАМ:');
        Object.keys(byType).forEach(type => {
          const txs = byType[type];
          const totalAmount = txs.reduce((sum, tx) => sum + parseFloat(tx.amount || tx.amount_ton || tx.amount_uni || '0'), 0);
          console.log(`   ${type}: ${txs.length} транзакций, общая сумма: ${totalAmount}`);
        });
      } else {
        console.log('❌ НИ ОДНОЙ ТРАНЗАКЦИИ НЕ НАЙДЕНО');
      }
    }

    // 3. Ищем попытки TON депозитов в логах ошибок
    console.log('\n3️⃣ ПОИСК ПРОБЛЕМНЫХ TON ОПЕРАЦИЙ:');
    const { data: problemTx, error: problemError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 251)
      .or('status.eq.failed,status.eq.error,status.eq.pending');

    if (!problemError && problemTx && problemTx.length > 0) {
      console.log(`🚨 Найдено проблемных транзакций: ${problemTx.length}`);
      problemTx.forEach((tx, idx) => {
        console.log(`   ${idx + 1}. [${tx.created_at}] ${tx.type} - Status: ${tx.status}`);
        console.log(`      Amount: ${tx.amount || tx.amount_ton || '0'}`);
        console.log(`      Description: ${tx.description}`);
      });
    } else {
      console.log('✅ Проблемных транзакций не найдено');
    }

    // 4. Проверяем связанные таблицы
    console.log('\n4️⃣ СВЯЗАННЫЕ ДАННЫЕ:');
    
    // user_balances
    const { data: balances, error: balanceError } = await supabase
      .from('user_balances')
      .select('*')
      .eq('user_id', 251);

    if (!balanceError && balances) {
      console.log(`💰 Записи в user_balances: ${balances.length}`);
      balances.forEach(balance => {
        console.log(`   UNI: ${balance.balance_uni}, TON: ${balance.balance_ton}`);
        console.log(`   Updated: ${balance.updated_at}`);
      });
    }

    // ton_farming_data
    const { data: farming, error: farmingError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', '251');

    if (!farmingError && farming) {
      console.log(`🌾 Записи в ton_farming_data: ${farming.length}`);
      farming.forEach(f => {
        console.log(`   Farming Balance: ${f.farming_balance}, Rate: ${f.farming_rate}`);
        console.log(`   Boost Active: ${f.boost_active}, Package: ${f.boost_package_id || 'нет'}`);
        console.log(`   Last Update: ${f.last_update}`);
      });
    }

    // 5. Проверяем, получает ли пользователь реферальные
    console.log('\n5️⃣ РЕФЕРАЛЬНЫЕ ВОЗНАГРАЖДЕНИЯ ПОЛЬЗОВАТЕЛЮ 251:');
    const { data: referrals, error: refError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 251)
      .eq('type', 'REFERRAL_REWARD')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!refError && referrals && referrals.length > 0) {
      console.log(`🎁 Последние реферальные: ${referrals.length}`);
      referrals.forEach((tx, idx) => {
        console.log(`   ${idx + 1}. [${tx.created_at}] ${tx.amount} ${tx.currency}`);
        console.log(`      ${tx.description}`);
      });
    } else {
      console.log('❌ Реферальных вознаграждений не найдено');
    }

    // 6. Итоговый диагноз
    console.log('\n6️⃣ ДИАГНОЗ:');
    if (allTransactions && allTransactions.length > 0) {
      console.log('✅ Пользователь 251 получает транзакции');
      console.log('🔍 Проблема может быть в:');
      console.log('   - Конкретно TON депозиты не проходят');
      console.log('   - Проблема с TON Connect интеграцией');
      console.log('   - Проблема с привязкой TON кошелька');
    } else {
      console.log('❌ Пользователь 251 НЕ получает никаких транзакций');
      console.log('🔍 Возможные причины:');
      console.log('   - Проблема с JWT авторизацией');
      console.log('   - Аккаунт заблокирован или деактивирован');
      console.log('   - Проблема с telegram_id привязкой');
    }

  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
  }
}

checkUser251Problem().catch(console.error);