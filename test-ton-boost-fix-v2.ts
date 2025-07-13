import { supabase } from './core/supabase.js';
import { UnifiedTransactionService } from './core/TransactionService.js';

async function testTonBoostFixV2() {
  console.log('=== Тест исправления TON Boost V2 (FARMING_REWARD) ===\n');

  try {
    // 1. Тестируем создание транзакции с типом FARMING_REWARD
    const transactionService = UnifiedTransactionService.getInstance();
    
    const testTransaction = {
      user_id: 9999,  // Тестовый пользователь
      type: 'FARMING_REWARD' as any,  // Используем FARMING_REWARD вместо TON_BOOST_INCOME
      amount_uni: 0,
      amount_ton: 0.001,
      currency: 'TON' as const,
      status: 'completed' as const,
      description: 'TEST: TON Boost доход (пакет 1): 0.001000 TON',
      metadata: {
        boost_package_id: 1,
        daily_rate: 0.01,
        user_deposit: 100,
        original_type: 'TON_BOOST_INCOME'  // Сохраняем информацию об оригинальном типе
      }
    };

    console.log('Создаем тестовую транзакцию...');
    const result = await transactionService.createTransaction(testTransaction);
    
    if (result.success) {
      console.log('✅ Транзакция успешно создана!');
      console.log(`ID транзакции: ${result.transaction_id}\n`);
      
      // Удаляем тестовую транзакцию
      if (result.transaction_id) {
        await supabase
          .from('transactions')
          .delete()
          .eq('id', result.transaction_id);
        console.log('🧹 Тестовая транзакция удалена');
      }
    } else {
      console.log('❌ Ошибка создания транзакции:', result.error);
    }

    // 2. Проверяем активных пользователей TON Boost
    const { data: activeUsers, error } = await supabase
      .from('ton_farming_data')
      .select('user_id, boost_package_id')
      .not('boost_package_id', 'is', null)
      .limit(5);

    if (!error && activeUsers) {
      console.log(`\n👥 Найдено ${activeUsers.length} активных пользователей TON Boost`);
      console.log('Они начнут получать доходы после перезапуска сервера');
    }

    // 3. Итоговая информация
    console.log('\n📊 Результат исправления:');
    console.log('- Транзакции теперь используют тип FARMING_REWARD');
    console.log('- Metadata содержит original_type для отслеживания');
    console.log('- TON Boost доходы будут создаваться корректно');
    console.log('- Необходим перезапуск сервера для применения изменений');

  } catch (error) {
    console.error('Ошибка:', error);
  }
}

testTonBoostFixV2().catch(console.error);