import { supabase } from './core/supabaseClient';

async function findExactBalanceTransfer() {
  console.log('=== ПОИСК ТОЧНОГО МЕСТА ПЕРЕНОСА БАЛАНСА ===\n');
  
  const userId = '184';
  
  try {
    // 1. Проверяем транзакции в момент покупки
    console.log('1. ТРАНЗАКЦИИ В МОМЕНТ ПОКУПКИ (10:26-10:27):');
    console.log('=' * 60);
    
    const { data: criticalTransactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', parseInt(userId))
      .gte('created_at', '2025-08-02T10:26:00')
      .lte('created_at', '2025-08-02T10:27:00')
      .order('created_at');
      
    if (criticalTransactions) {
      console.log(`Найдено ${criticalTransactions.length} транзакций:\n`);
      criticalTransactions.forEach((tx, i) => {
        console.log(`${i+1}. ${new Date(tx.created_at).toLocaleTimeString()}`);
        console.log(`   Тип: ${tx.type}`);
        console.log(`   Сумма: ${tx.amount_ton || tx.amount_uni} ${tx.currency}`);
        console.log(`   Описание: ${tx.description}`);
        console.log(`   Метаданные: ${JSON.stringify(tx.metadata)}\n`);
      });
    }
    
    // 2. Проверка паттерна
    console.log('\n2. АНАЛИЗ ПАТТЕРНА ПЕРЕНОСА:');
    console.log('=' * 60);
    
    console.log('\n🔍 ГИПОТЕЗА #1: При первой активации TON Boost');
    console.log('Если у пользователя нет записи в ton_farming_data,');
    console.log('calculateUserTonDeposits() суммирует ВСЕ прошлые депозиты');
    console.log('включая FARMING_REWARD (начисления)!');
    
    // 3. Проверяем историю TON транзакций
    const { data: allTonHistory } = await supabase
      .from('transactions')
      .select('type, amount_ton, created_at')
      .eq('user_id', parseInt(userId))
      .in('type', ['DEPOSIT', 'TON_DEPOSIT', 'FARMING_REWARD'])
      .gte('amount_ton', '0.1')
      .order('created_at');
      
    if (allTonHistory) {
      const totalCalculated = allTonHistory.reduce((sum, tx) => sum + parseFloat(tx.amount_ton || '0'), 0);
      console.log(`\nИстория TON транзакций пользователя:`);
      console.log(`Всего транзакций: ${allTonHistory.length}`);
      console.log(`Сумма: ${totalCalculated.toFixed(3)} TON`);
      console.log(`\n⚠️ Эта сумма (~${Math.round(totalCalculated)} TON) близка к ton_farming_balance (115 TON)!`);
    }
    
    // 4. Ключевой вывод
    console.log('\n\n=== РАЗГАДКА ===');
    console.log('При первой покупке TON Boost:');
    console.log('1. Создается новая запись в ton_farming_data');
    console.log('2. calculateUserTonDeposits() считает ВСЕ прошлые депозиты + начисления');
    console.log('3. Эта сумма (~100-115 TON) записывается как farming_balance');
    console.log('4. Но balance_ton при этом НЕ уменьшается!');
    console.log('\n❌ ПРОБЛЕМА: Двойной учет средств!');
    console.log('   - balance_ton содержит накопленные средства');
    console.log('   - При активации boost эти же средства "копируются" в farming_balance');
    console.log('   - Получается дублирование денег!');
    
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

findExactBalanceTransfer();