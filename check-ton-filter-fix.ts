import { supabase } from './core/supabase';

async function checkTonFilter() {
  console.log('=== ПРОВЕРКА ФИЛЬТРА TON ТРАНЗАКЦИЙ ===\n');

  // 1. Проверяем все транзакции пользователя 184
  const { data: allTx } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 184)
    .order('created_at', { ascending: false });

  console.log(`Всего транзакций у user 184: ${allTx?.length || 0}`);
  
  // Считаем по валютам
  const byCurrency = (allTx || []).reduce((acc, tx) => {
    acc[tx.currency] = (acc[tx.currency] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('Распределение по валютам:', byCurrency);

  // 2. Проверяем TON транзакции с фильтром на уровне БД
  const { data: tonTx } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 184)
    .eq('currency', 'TON')
    .order('created_at', { ascending: false })
    .limit(20);

  console.log(`\nTON транзакций с фильтром: ${tonTx?.length || 0}`);
  
  if (tonTx && tonTx.length > 0) {
    console.log('\nTON транзакции:');
    tonTx.forEach((tx, i) => {
      console.log(`${i + 1}. ${tx.type}: ${tx.amount} TON - ${tx.description}`);
    });
    
    // Считаем общую сумму
    const totalTon = tonTx.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
    console.log(`\nОбщая сумма: ${totalTon.toFixed(5)} TON`);
  }

  // 3. Проверяем позицию TON транзакций в общем списке
  if (allTx && tonTx && tonTx.length > 0) {
    const firstTonTxId = tonTx[0].id;
    const position = allTx.findIndex(tx => tx.id === firstTonTxId) + 1;
    console.log(`\nПервая TON транзакция находится на позиции ${position} в общем списке`);
    
    if (position > 20) {
      console.log('⚠️  До исправления эта транзакция НЕ отображалась бы при фильтрации!');
    }
  }
}

checkTonFilter()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Ошибка:', err);
    process.exit(1);
  });