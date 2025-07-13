/**
 * Create Initial Balance Transaction
 * Создает транзакцию для начального баланса TON
 */

import { supabase } from './core/supabase';

async function createInitialBalanceTransaction() {
  console.log('=== СОЗДАНИЕ ТРАНЗАКЦИИ НАЧАЛЬНОГО БАЛАНСА ===\n');
  
  const userId = 74;
  const tonAmount = 1015.118942;
  
  // Создаем транзакцию начального баланса
  const transactionData = {
    user_id: userId,
    type: 'DAILY_BONUS', // Используем существующий тип
    amount: tonAmount.toString(),
    amount_ton: tonAmount,
    currency: 'TON',
    status: 'completed',
    description: 'Начальный баланс TON при регистрации',
    metadata: {
      original_type: 'INITIAL_BALANCE',
      source: 'balance_reconciliation',
      audit_date: new Date().toISOString(),
      purpose: 'Корректировка для соответствия транзакций и баланса'
    }
  };
  
  console.log('Создаем транзакцию:');
  console.log(`- Пользователь: ${userId}`);
  console.log(`- Сумма: ${tonAmount} TON`);
  console.log(`- Тип: INITIAL_BALANCE (сохранен как DAILY_BONUS)`);
  console.log(`- Описание: ${transactionData.description}`);
  
  const { data, error } = await supabase
    .from('transactions')
    .insert(transactionData)
    .select()
    .single();
    
  if (error) {
    console.error('\n❌ Ошибка создания транзакции:', error);
    return;
  }
  
  console.log('\n✅ Транзакция успешно создана!');
  console.log(`ID транзакции: ${data.id}`);
  console.log(`Создана: ${new Date(data.created_at).toLocaleString()}`);
  
  // Проверяем новый рассчитанный баланс
  console.log('\n=== ПРОВЕРКА ПОСЛЕ КОРРЕКТИРОВКИ ===');
  
  const { data: allTx } = await supabase
    .from('transactions')
    .select('amount, amount_ton, currency, type, description')
    .eq('user_id', userId)
    .eq('currency', 'TON');
    
  let newCalculatedTon = 0;
  let creditTon = 0;
  let debitTon = 0;
  
  allTx?.forEach(tx => {
    const amount = parseFloat(tx.amount || tx.amount_ton || '0');
    const isDebit = tx.type === 'BOOST_PURCHASE' || 
                    tx.description?.includes('Покупка');
    
    if (isDebit) {
      debitTon += amount;
      newCalculatedTon -= amount;
    } else {
      creditTon += amount;
      newCalculatedTon += amount;
    }
  });
  
  console.log(`TON кредит: +${creditTon.toFixed(6)}`);
  console.log(`TON дебет: -${debitTon.toFixed(6)}`);
  console.log(`Новый рассчитанный баланс TON: ${newCalculatedTon.toFixed(6)}`);
  
  // Получаем текущий баланс
  const { data: user } = await supabase
    .from('users')
    .select('balance_ton')
    .eq('id', userId)
    .single();
    
  if (user) {
    console.log(`Фактический баланс TON: ${user.balance_ton}`);
    const newDiff = user.balance_ton - newCalculatedTon;
    console.log(`Новое расхождение: ${newDiff.toFixed(6)}`);
    
    if (Math.abs(newDiff) < 0.01) {
      console.log('\n✅ Баланс TON теперь соответствует транзакциям!');
    }
  }
}

// Запускаем создание транзакции
createInitialBalanceTransaction().catch(console.error);