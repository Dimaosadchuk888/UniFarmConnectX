import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

async function checkLatestTransactions() {
  console.log('🔍 Проверка последних транзакций после перезапуска...\n');

  // Получаем последние 10 транзакций
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Ошибка получения транзакций:', error);
    return;
  }

  console.log(`📊 Найдено ${transactions.length} последних транзакций:\n`);

  // Фильтруем транзакции покупок TON Boost
  const boostPurchases = transactions.filter(tx => 
    tx.description?.includes('TON Boost') || 
    tx.description?.includes('Покупка TON Boost') ||
    tx.type === 'BOOST_PURCHASE'
  );

  if (boostPurchases.length > 0) {
    console.log('🎯 Транзакции покупок TON Boost:\n');
    boostPurchases.forEach(tx => {
      console.log(`ID: ${tx.id}`);
      console.log(`Тип: ${tx.type} ${tx.type === 'BOOST_PURCHASE' ? '✅ НОВЫЙ ТИП!' : '⚠️ СТАРЫЙ ТИП'}`);
      console.log(`Описание: ${tx.description}`);
      console.log(`Сумма: ${tx.amount} ${tx.currency}`);
      console.log(`Создана: ${new Date(tx.created_at).toLocaleString()}`);
      console.log('---');
    });
  } else {
    console.log('📌 Нет недавних покупок TON Boost');
  }

  // Показываем все типы транзакций
  console.log('\n📈 Типы последних транзакций:');
  const typeCount = transactions.reduce((acc, tx) => {
    acc[tx.type] = (acc[tx.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  Object.entries(typeCount).forEach(([type, count]) => {
    console.log(`- ${type}: ${count} транзакций`);
  });

  // Проверяем пользователя 74
  const user74Txs = transactions.filter(tx => tx.user_id === 74);
  console.log(`\n👤 Транзакции пользователя 74: ${user74Txs.length}`);
  
  if (user74Txs.length > 0) {
    console.log('Последние транзакции пользователя 74:');
    user74Txs.slice(0, 3).forEach(tx => {
      console.log(`- ${tx.type}: ${tx.amount} ${tx.currency} (${tx.description})`);
    });
  }
}

checkLatestTransactions().catch(console.error);