/**
 * Прямое пополнение баланса пользователя 184 через правильный TransactionService
 */

import { UnifiedTransactionService } from '../core/TransactionService';
import { supabase } from '../core/supabase';

async function directBalanceAdd() {
  console.log('💰 ПРЯМОЕ ПОПОЛНЕНИЕ БАЛАНСА ПОЛЬЗОВАТЕЛЯ 184 НА 100 TON');
  console.log('=' .repeat(60));
  
  try {
    // 1. Получаем текущий баланс
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, balance_ton')
      .eq('id', 184)
      .single();
    
    if (userError || !user) {
      console.error('❌ Пользователь 184 не найден:', userError);
      return;
    }
    
    const currentBalance = parseFloat(user.balance_ton || '0');
    console.log('📊 Текущий баланс:', currentBalance, 'TON');
    
    // 2. Создаем транзакцию через UnifiedTransactionService
    const transactionService = new UnifiedTransactionService();
    
    const transactionData = {
      user_id: 184,
      type: 'TON_DEPOSIT' as const, // Используем правильный тип
      amount: 100,
      currency: 'TON' as const,
      status: 'completed' as const,
      description: 'Пополнение баланса администратором (прямое)',
      metadata: {
        admin_deposit: true,
        original_type: 'ADMIN_DEPOSIT',
        source: 'direct_admin_top_up',
        manual_addition: true
      }
    };
    
    console.log('🔄 Создание транзакции через UnifiedTransactionService...');
    const transaction = await transactionService.createTransaction(transactionData);
    
    if (transaction && transaction.success && transaction.transaction_id) {
      console.log('✅ Транзакция создана:', transaction.transaction_id);
      console.log('💫 Сумма:', transactionData.amount, 'TON');
      
      // 3. Проверяем результат
      const { data: updatedUser } = await supabase
        .from('users')
        .select('balance_ton')
        .eq('id', 184)
        .single();
      
      const newBalance = parseFloat(updatedUser?.balance_ton || '0');
      console.log('📊 Новый баланс:', newBalance, 'TON');
      console.log('➕ Изменение:', (newBalance - currentBalance), 'TON');
      
    } else {
      console.error('❌ Транзакция не была создана');
    }
    
  } catch (error) {
    console.error('💥 Критическая ошибка:', error);
  }
}

// Запуск
directBalanceAdd().then(() => {
  console.log('\n✅ Операция завершена');
  process.exit(0);
}).catch(error => {
  console.error('❌ Ошибка:', error);
  process.exit(1);
});