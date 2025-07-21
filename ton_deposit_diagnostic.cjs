const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Подключение к Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function diagnoseTonDepositIssue() {
  console.log('🔍 ДИАГНОСТИКА ПРОБЛЕМЫ TON ДЕПОЗИТА');
  console.log('=======================================');
  
  try {
    console.log('\n1️⃣ Проверяем последние транзакции User 184:');
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount, currency, description, created_at')
      .eq('user_id', 184)
      .or('currency.eq.TON,description.ilike.%TON%,type.eq.TON_DEPOSIT')
      .order('created_at', { ascending: false })
      .limit(10);

    if (txError) {
      console.error('❌ Ошибка при получении транзакций:', txError.message);
    } else {
      console.log(`✅ Найдено ${transactions?.length || 0} TON транзакций:`);
      if (transactions && transactions.length > 0) {
        transactions.forEach(tx => {
          console.log(`  - ID: ${tx.id}, Тип: ${tx.type}, Сумма: ${tx.amount} ${tx.currency}, ${new Date(tx.created_at).toLocaleString()}`);
          console.log(`    Описание: ${tx.description}`);
        });
      } else {
        console.log('  📝 TON транзакций не найдено');
      }
    }

    console.log('\n2️⃣ Проверяем текущий баланс User 184:');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, telegram_id, username, balance_ton, ton_wallet_address')
      .eq('id', 184)
      .single();

    if (userError) {
      console.error('❌ Ошибка при получении пользователя:', userError.message);
    } else {
      console.log(`✅ User 184 найден:`);
      console.log(`  - Telegram ID: ${userData.telegram_id}`);
      console.log(`  - Username: ${userData.username}`);
      console.log(`  - TON Balance: ${userData.balance_ton}`);
      console.log(`  - TON Wallet: ${userData.ton_wallet_address || 'не привязан'}`);
    }

    console.log('\n3️⃣ Проверяем последние 20 транзакций всех типов User 184:');
    const { data: allTx, error: allTxError } = await supabase
      .from('transactions')
      .select('id, type, amount, currency, description, created_at')
      .eq('user_id', 184)
      .order('created_at', { ascending: false })
      .limit(20);

    if (allTxError) {
      console.error('❌ Ошибка при получении всех транзакций:', allTxError.message);
    } else {
      console.log(`✅ Найдено ${allTx?.length || 0} транзакций:`);
      if (allTx && allTx.length > 0) {
        const last5 = allTx.slice(0, 5);
        last5.forEach((tx, idx) => {
          const timeAgo = new Date() - new Date(tx.created_at);
          const minutesAgo = Math.floor(timeAgo / 1000 / 60);
          console.log(`  ${idx + 1}. ${tx.type}: ${tx.amount} ${tx.currency} (${minutesAgo} мин назад)`);
        });
      }
    }

    console.log('\n4️⃣ Проверяем server/index.ts маршрут ton-deposit:');
    const fs = require('fs');
    const serverIndexPath = 'server/index.ts';
    
    if (fs.existsSync(serverIndexPath)) {
      const serverContent = fs.readFileSync(serverIndexPath, 'utf8');
      const hasTonDepositRoute = serverContent.includes('ton-deposit');
      console.log(`✅ Маршрут ton-deposit ${hasTonDepositRoute ? '✓' : '❌'} найден в server/index.ts`);
      
      if (hasTonDepositRoute) {
        const routes = serverContent.match(/.*ton-deposit.*/g);
        console.log('  Найденные маршруты:');
        routes?.forEach(route => console.log(`    ${route.trim()}`));
      }
    } else {
      console.log('❌ server/index.ts не найден');
    }

    console.log('\n5️⃣ Диагностируем TonDepositCard.tsx:');
    const tonDepositCardPath = 'client/src/components/wallet/TonDepositCard.tsx';
    
    if (fs.existsSync(tonDepositCardPath)) {
      const tonDepositContent = fs.readFileSync(tonDepositCardPath, 'utf8');
      const hasApiCall = tonDepositContent.includes('/api/v2/wallet/ton-deposit');
      const hasSuccessHandler = tonDepositContent.includes('data.success');
      
      console.log(`✅ API вызов ${hasApiCall ? '✓' : '❌'} найден`);
      console.log(`✅ Обработчик успеха ${hasSuccessHandler ? '✓' : '❌'} найден`);
      
      // Найдем строки с fetch
      const fetchLines = tonDepositContent.split('\n').filter(line => line.includes('fetch'));
      if (fetchLines.length > 0) {
        console.log('  Найденные fetch вызовы:');
        fetchLines.forEach(line => console.log(`    ${line.trim()}`));
      }
    } else {
      console.log('❌ TonDepositCard.tsx не найден');
    }

  } catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА:', error.message);
  }

  console.log('\n🎯 ЗАКЛЮЧЕНИЕ:');
  console.log('Проверьте логи выше чтобы найти где прерывается цепочка:');
  console.log('Frontend → POST /api/v2/wallet/ton-deposit → Controller → Database');
  console.log('=======================================');
}

diagnoseTonDepositIssue();