import { supabase } from './core/supabase.js';

async function checkTonIncomeTransactions() {
  console.log('🔍 Проверка транзакций доходов TON Boost\n');

  try {
    // 1. Проверяем транзакции с положительными суммами TON
    const { data: incomeTransactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'FARMING_REWARD')
      .eq('currency', 'TON')
      .gt('amount_ton', 0)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && incomeTransactions && incomeTransactions.length > 0) {
      console.log(`✅ Найдено ${incomeTransactions.length} транзакций доходов:\n`);
      
      incomeTransactions.forEach(tx => {
        console.log(`ID: ${tx.id}`);
        console.log(`User: ${tx.user_id}`);
        console.log(`Amount: +${tx.amount_ton} TON`);
        console.log(`Description: ${tx.description}`);
        console.log(`Created: ${new Date(tx.created_at).toLocaleString()}`);
        
        // Проверяем metadata
        if (tx.metadata) {
          console.log('Metadata:', JSON.stringify(tx.metadata, null, 2));
        }
        console.log('---');
      });
    } else {
      console.log('❌ Транзакций доходов TON Boost пока нет');
      console.log('\nПричины:');
      console.log('1. Планировщик запускается каждые 5 минут');
      console.log('2. Сервер мог быть перезапущен недавно');
      console.log('3. Ждите несколько минут для первого запуска');
    }

    // 2. Проверяем время сервера
    const now = new Date();
    console.log(`\n⏰ Текущее время: ${now.toLocaleString()}`);
    const minutesUntilNext = 5 - (now.getMinutes() % 5);
    console.log(`Следующий запуск планировщика примерно через: ${minutesUntilNext} минут`);

    // 3. Проверяем последнюю транзакцию любого типа для подтверждения работы сервера
    const { data: lastTx } = await supabase
      .from('transactions')
      .select('created_at, type')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (lastTx) {
      console.log(`\n📊 Последняя транзакция в системе:`);
      console.log(`Тип: ${lastTx.type}`);
      console.log(`Время: ${new Date(lastTx.created_at).toLocaleString()}`);
    }

  } catch (error) {
    console.error('Ошибка:', error);
  }
}

checkTonIncomeTransactions().catch(console.error);