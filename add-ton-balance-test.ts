import { supabase } from './core/supabaseClient';
import { BalanceManager } from './core/BalanceManager';
import { UnifiedTransactionService } from './core/TransactionService';

async function addTestTonBalance() {
  const userId = '184';
  const amount = 100;
  
  console.log(`=== ДОБАВЛЕНИЕ ${amount} TON НА БАЛАНС ===\n`);
  
  try {
    // 1. Проверяем текущий баланс
    const { data: user } = await supabase
      .from('users')
      .select('balance_ton, ton_farming_balance')
      .eq('id', userId)
      .single();
      
    console.log('Текущее состояние:');
    console.log(`├── balance_ton: ${user.balance_ton} TON`);
    console.log(`└── ton_farming_balance: ${user.ton_farming_balance} TON\n`);
    
    // 2. Добавляем через BalanceManager
    const balanceManager = new BalanceManager();
    const result = await balanceManager.addBalance(
      parseInt(userId),
      0, // UNI
      amount // TON
    );
    
    if (!result.success) {
      console.error('Ошибка добавления баланса:', result.error);
      return;
    }
    
    console.log('✅ Баланс успешно пополнен!');
    console.log(`Новый balance_ton: ${result.newBalance?.balance_ton} TON`);
    
    // 3. Создаем транзакцию
    const transactionService = new UnifiedTransactionService();
    await transactionService.createTransaction({
      user_id: parseInt(userId),
      type: 'TON_DEPOSIT',
      amount: amount.toString(),
      currency: 'TON',
      status: 'COMPLETED',
      description: 'Test deposit for tracking boost purchase',
      transaction_hash: `test_${Date.now()}`
    });
    
    console.log('\n✅ Транзакция создана!');
    console.log('\nТеперь вы можете попробовать купить TON Boost и мы отследим что происходит.');
    
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

addTestTonBalance();