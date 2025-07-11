import { supabase } from './core/supabase';

async function createMigrationTransaction() {
  console.log('=== СОЗДАНИЕ МИГРАЦИОННОЙ ТРАНЗАКЦИИ ===\n');
  
  const userId = 74;
  const migrationAmount = 406229.001; // Разница между депозитом и транзакциями
  
  // Создаем транзакцию для объяснения исторических депозитов
  const transactionData = {
    user_id: userId,
    type: 'FARMING_DEPOSIT',
    amount: migrationAmount,
    amount_uni: migrationAmount,
    amount_ton: 0,
    currency: 'UNI',
    description: 'Миграция исторических депозитов (корректировка баланса транзакций)',
    status: 'completed',
    metadata: {
      source: 'migration',
      reason: 'historical_deposits_reconciliation',
      original_deposit: 407589,
      transaction_sum_before: 1359.999,
      difference: migrationAmount
    }
  };
  
  console.log('Создаю миграционную транзакцию:');
  console.log(`- Пользователь: ${userId}`);
  console.log(`- Сумма: ${migrationAmount} UNI`);
  console.log(`- Тип: FARMING_DEPOSIT`);
  console.log(`- Описание: Миграция исторических депозитов`);
  
  const { data, error } = await supabase
    .from('transactions')
    .insert(transactionData)
    .select()
    .single();
  
  if (error) {
    console.error('\n❌ Ошибка при создании транзакции:', error);
    return;
  }
  
  console.log('\n✅ Транзакция успешно создана!');
  console.log(`ID транзакции: ${data.id}`);
  console.log(`Время создания: ${data.created_at}`);
  
  // Проверяем новую сумму транзакций
  const { data: allDeposits } = await supabase
    .from('transactions')
    .select('amount_uni')
    .eq('user_id', userId)
    .eq('type', 'FARMING_DEPOSIT');
  
  const newTotal = allDeposits?.reduce((sum, tx) => sum + parseFloat(tx.amount_uni || '0'), 0) || 0;
  
  console.log('\n📊 РЕЗУЛЬТАТ:');
  console.log(`Сумма транзакций до миграции: 1,359.999 UNI`);
  console.log(`Сумма транзакций после миграции: ${newTotal.toFixed(3)} UNI`);
  console.log(`Депозит в uni_farming_data: 407,589 UNI`);
  console.log(`Разница: ${Math.abs(407589 - newTotal).toFixed(3)} UNI`);
  
  if (Math.abs(407589 - newTotal) < 1) {
    console.log('\n✅ Баланс восстановлен! Транзакции теперь соответствуют депозиту.');
  }
}

createMigrationTransaction().catch(console.error);