import { TonFarmingRepository } from './modules/boost/TonFarmingRepository.js';
import { BalanceManager } from './core/BalanceManager.js';
import { UnifiedTransactionService } from './core/TransactionService.js';
import { supabase } from './core/supabase.js';

async function testTonBoostDetailed() {
  console.log('🔍 Детальная диагностика TON Boost\n');
  
  try {
    // 1. Проверяем активных пользователей
    const tonFarmingRepo = new TonFarmingRepository();
    const activeUsers = await tonFarmingRepo.getActiveBoostUsers();
    console.log(`✅ Найдено ${activeUsers.length} активных пользователей\n`);
    
    if (activeUsers.length === 0) return;
    
    // 2. Проверяем первого пользователя
    const testUser = activeUsers[0];
    console.log('Тестируем пользователя:', testUser);
    
    // 3. Получаем балансы
    const userId = parseInt(testUser.user_id.toString());
    const { data: userBalance } = await supabase
      .from('users')
      .select('balance_ton, balance_uni')
      .eq('id', userId)
      .single();
      
    console.log('\nБалансы пользователя:', userBalance);
    
    // 4. Рассчитываем доход
    const userDeposit = parseFloat(userBalance?.balance_ton || '0');
    const dailyRate = 0.01;
    const dailyIncome = userDeposit * dailyRate;
    const fiveMinuteIncome = dailyIncome / 288;
    
    console.log('\nРасчет дохода:');
    console.log(`- Депозит: ${userDeposit} TON`);
    console.log(`- Дневная ставка: ${dailyRate * 100}%`);
    console.log(`- Доход за 5 минут: ${fiveMinuteIncome.toFixed(6)} TON`);
    
    // 5. Тестируем обновление баланса
    console.log('\n5. Тестируем BalanceManager.addBalance...');
    try {
      const balanceResult = await BalanceManager.addBalance(
        userId,
        0,
        fiveMinuteIncome,
        'TON Boost test'
      );
      console.log('✅ BalanceManager результат:', balanceResult);
    } catch (error) {
      console.error('❌ Ошибка BalanceManager:', error);
    }
    
    // 6. Тестируем создание транзакции
    console.log('\n6. Тестируем создание транзакции...');
    try {
      const transactionService = UnifiedTransactionService.getInstance();
      const transactionResult = await transactionService.createTransaction({
        user_id: userId,
        type: 'FARMING_REWARD',
        amount_uni: 0,
        amount_ton: fiveMinuteIncome,
        currency: 'TON',
        status: 'completed',
        description: `TON Boost test: ${fiveMinuteIncome.toFixed(6)} TON`,
        metadata: {
          test: true,
          original_type: 'TON_BOOST_INCOME'
        }
      });
      console.log('✅ Транзакция создана:', transactionResult);
    } catch (error) {
      console.error('❌ Ошибка создания транзакции:', error);
    }
    
  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

testTonBoostDetailed();