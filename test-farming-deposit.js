import { supabase } from './core/supabase.js';
import { balanceManager } from './core/BalanceManager.js';

async function testFarmingDeposit() {
  console.log('\n=== ТЕСТ ДЕПОЗИТА ФАРМИНГА ===\n');
  
  const userId = 74;
  const depositAmount = 50;
  
  try {
    // 1. Проверяем пользователя
    console.log('1. Проверка пользователя...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (userError || !user) {
      console.error('❌ Ошибка получения пользователя:', userError);
      return;
    }
    
    console.log('✅ Пользователь найден:');
    console.log('  - ID:', user.id);
    console.log('  - Баланс UNI:', user.balance_uni, 'тип:', typeof user.balance_uni);
    console.log('  - Баланс TON:', user.balance_ton, 'тип:', typeof user.balance_ton);
    console.log('  - Депозит UNI:', user.uni_deposit_amount, 'тип:', typeof user.uni_deposit_amount);
    
    // 2. Проверяем тип баланса и вычисления
    console.log('\n2. Проверка вычислений...');
    const currentBalance = user.balance_uni;
    console.log('  - Текущий баланс:', currentBalance);
    console.log('  - Сумма депозита:', depositAmount);
    console.log('  - Проверка currentBalance < depositAmount:', currentBalance < depositAmount);
    console.log('  - Проверка parseFloat(currentBalance) < depositAmount:', parseFloat(currentBalance) < depositAmount);
    
    // 3. Тестируем BalanceManager напрямую
    console.log('\n3. Тест BalanceManager...');
    const balanceResult = await balanceManager.getUserBalance(userId);
    console.log('  - Результат getUserBalance:', balanceResult);
    
    // 4. Проверяем что будет при вызове subtractBalance
    console.log('\n4. Проверка логики списания...');
    if (currentBalance >= depositAmount) {
      console.log('✅ Достаточно средств для депозита');
      console.log('  - Будет списано:', depositAmount, 'UNI');
      console.log('  - Останется:', currentBalance - depositAmount, 'UNI');
    } else {
      console.log('❌ Недостаточно средств');
      console.log('  - Нужно:', depositAmount, 'UNI');
      console.log('  - Есть:', currentBalance, 'UNI');
    }
    
  } catch (error) {
    console.error('❌ Ошибка теста:', error);
  }
  
  process.exit(0);
}

testFarmingDeposit();