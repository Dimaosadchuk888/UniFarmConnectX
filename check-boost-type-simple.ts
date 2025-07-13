import { supabase } from './core/supabase';

async function checkBoostPurchaseType() {
  console.log('🔍 Проверка типа транзакций TON Boost после перезапуска...\n');

  // Получаем последние транзакции за последние 30 минут
  const thirtyMinutesAgo = new Date();
  thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .gte('created_at', thirtyMinutesAgo.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Ошибка:', error);
    return;
  }

  console.log(`📊 Найдено ${transactions.length} транзакций за последние 30 минут\n`);

  // Фильтруем транзакции, связанные с TON Boost
  const boostTransactions = transactions.filter(tx => 
    tx.description?.includes('TON Boost') || 
    tx.description?.includes('пакет') ||
    tx.type === 'BOOST_PURCHASE'
  );

  if (boostTransactions.length === 0) {
    console.log('❌ Нет транзакций TON Boost за последние 30 минут');
    console.log('💡 Попробуйте купить новый TON Boost пакет для проверки\n');
  } else {
    console.log(`🎯 Найдено ${boostTransactions.length} транзакций TON Boost:\n`);
    
    boostTransactions.forEach(tx => {
      const isNewType = tx.type === 'BOOST_PURCHASE';
      console.log(`ID: ${tx.id}`);
      console.log(`Тип: ${tx.type} ${isNewType ? '✅ НОВЫЙ ТИП!' : '⚠️ Старый тип'}`);
      console.log(`Описание: ${tx.description}`);
      console.log(`Сумма: ${tx.amount} ${tx.currency}`);
      console.log(`Пользователь: ${tx.user_id}`);
      console.log(`Время: ${new Date(tx.created_at).toLocaleString()}`);
      console.log('---\n');
    });

    // Проверяем, есть ли новые покупки с новым типом
    const newTypePurchases = boostTransactions.filter(tx => tx.type === 'BOOST_PURCHASE');
    if (newTypePurchases.length > 0) {
      console.log(`✅ УСПЕХ! Найдено ${newTypePurchases.length} покупок с новым типом BOOST_PURCHASE!`);
    } else {
      console.log('⚠️ Все транзакции используют старый тип FARMING_REWARD');
      console.log('💡 Если вы еще не покупали новый пакет после перезапуска, попробуйте сделать это сейчас');
    }
  }

  // Показываем статистику по типам
  console.log('\n📈 Статистика типов транзакций:');
  const typeStats = transactions.reduce((acc, tx) => {
    acc[tx.type] = (acc[tx.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  Object.entries(typeStats).forEach(([type, count]) => {
    console.log(`- ${type}: ${count}`);
  });
}

checkBoostPurchaseType();