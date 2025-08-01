import { supabase } from './core/supabaseClient';

async function checkWorkingTonDeposits() {
  console.log('🔍 ПОИСК РАБОТАЮЩИХ TON ДЕПОЗИТОВ В СИСТЕМЕ');
  console.log('='.repeat(60));

  try {
    // 1. Ищем все возможные типы TON транзакций
    console.log('\n1️⃣ ПОИСК ВСЕХ TON ТРАНЗАКЦИЙ В СИСТЕМЕ:');
    const { data: tonTransactions, error: tonError } = await supabase
      .from('transactions')
      .select('*')
      .or('currency.eq.TON,type.ilike.%TON%,description.ilike.%TON%')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!tonError && tonTransactions) {
      console.log(`💎 Найдено TON транзакций: ${tonTransactions.length}`);
      
      if (tonTransactions.length > 0) {
        // Группируем по типам
        const byType: { [key: string]: any[] } = {};
        tonTransactions.forEach(tx => {
          const type = tx.type || 'UNKNOWN';
          if (!byType[type]) byType[type] = [];
          byType[type].push(tx);
        });

        console.log('\n📊 Распределение по типам:');
        Object.keys(byType).forEach(type => {
          const txs = byType[type];
          console.log(`   ${type}: ${txs.length} транзакций`);
          
          // Показываем примеры
          txs.slice(0, 2).forEach((tx, idx) => {
            console.log(`      ${idx + 1}. User ${tx.user_id}: ${tx.amount_ton || tx.amount || '0'} TON`);
            console.log(`         [${tx.created_at}] ${(tx.description || '').substring(0, 60)}...`);
          });
        });

        // Ищем конкретно депозиты
        const deposits = tonTransactions.filter(tx => 
          tx.description?.toLowerCase().includes('deposit') ||
          tx.description?.toLowerCase().includes('пополнение') ||
          tx.type?.includes('DEPOSIT')
        );

        if (deposits.length > 0) {
          console.log('\n🎯 НАЙДЕННЫЕ TON ДЕПОЗИТЫ:');
          deposits.forEach((tx, idx) => {
            console.log(`   ${idx + 1}. User ${tx.user_id}: ${tx.amount_ton || tx.amount || '0'} TON`);
            console.log(`      [${tx.created_at}] ${tx.type}`);
            console.log(`      ${tx.description}`);
            console.log(`      Status: ${tx.status || 'unknown'}`);
            console.log('      ---');
          });
        } else {
          console.log('\n❌ НИ ОДНОГО TON ДЕПОЗИТА НЕ НАЙДЕНО');
        }
      }
    }

    // 2. Проверяем пользователей с положительным TON балансом
    console.log('\n2️⃣ ПОЛЬЗОВАТЕЛИ С ПОЛОЖИТЕЛЬНЫМ TON БАЛАНСОМ:');
    const { data: usersWithTon, error: usersError } = await supabase
      .from('users')
      .select('id, telegram_id, username, balance_ton, created_at')
      .gt('balance_ton', 0)
      .order('balance_ton', { ascending: false })
      .limit(10);

    if (!usersError && usersWithTon) {
      console.log(`💰 Найдено пользователей с TON балансом: ${usersWithTon.length}`);
      usersWithTon.forEach((user, idx) => {
        console.log(`   ${idx + 1}. User ${user.id} (@${user.username}): ${user.balance_ton} TON`);
        console.log(`      Telegram ID: ${user.telegram_id}, Created: ${user.created_at}`);
      });

      // Проверяем транзакции этих пользователей
      if (usersWithTon.length > 0) {
        const userId = usersWithTon[0].id;
        console.log(`\n🔍 Транзакции пользователя ${userId} (${usersWithTon[0].username}):`);
        
        const { data: userTx, error: userTxError } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (!userTxError && userTx) {
          userTx.forEach((tx, idx) => {
            console.log(`      ${idx + 1}. [${tx.created_at}] ${tx.type}`);
            console.log(`         Amount: ${tx.amount_ton || tx.amount_uni || tx.amount || '0'}`);
            console.log(`         Currency: ${tx.currency || 'unknown'}`);
            console.log(`         Description: ${(tx.description || '').substring(0, 50)}...`);
          });
        }
      }
    }

    // 3. Ищем последние изменения балансов TON
    console.log('\n3️⃣ ПОСЛЕДНИЕ ИЗМЕНЕНИЯ TON БАЛАНСОВ:');
    const { data: recentTonTx, error: recentError } = await supabase
      .from('transactions')
      .select('*')
      .not('amount_ton', 'is', null)
      .gt('amount_ton', 0)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!recentError && recentTonTx) {
      console.log(`⚡ Последние TON операции: ${recentTonTx.length}`);
      recentTonTx.forEach((tx, idx) => {
        console.log(`   ${idx + 1}. User ${tx.user_id}: +${tx.amount_ton} TON`);
        console.log(`      [${tx.created_at}] ${tx.type}`);
        console.log(`      ${(tx.description || '').substring(0, 50)}...`);
      });
    }

    // 4. Специально проверяем пользователя 253 еще раз
    console.log('\n4️⃣ ПОВТОРНАЯ ПРОВЕРКА ПОЛЬЗОВАТЕЛЯ 253:');
    const { data: user253Again, error: user253Error } = await supabase
      .from('users')
      .select('*')
      .eq('id', 253)
      .single();

    if (!user253Error && user253Again) {
      console.log(`✅ Пользователь 253 подтвержден:`);
      console.log(`   Username: ${user253Again.username}`);
      console.log(`   Telegram ID: ${user253Again.telegram_id}`);
      console.log(`   TON Balance: ${user253Again.balance_ton}`);
      console.log(`   UNI Balance: ${user253Again.balance_uni}`);
      console.log(`   Created: ${user253Again.created_at}`);
      console.log(`   Updated: ${user253Again.updated_at || 'не указано'}`);
    }

  } catch (error) {
    console.error('❌ ОШИБКА:', error);
  }
}

checkWorkingTonDeposits().catch(console.error);