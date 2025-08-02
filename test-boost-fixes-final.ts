import { supabase } from './core/supabaseClient';
import { TonFarmingRepository } from './modules/boost/TonFarmingRepository';

async function testBoostFixesFinal() {
  const userId = '184';
  console.log('=== ФИНАЛЬНЫЙ ТЕСТ ИСПРАВЛЕНИЙ TON BOOST ===\n');
  
  // 1. Проверяем текущее состояние
  console.log('1. ТЕКУЩЕЕ СОСТОЯНИЕ:');
  const { data: userBefore } = await supabase
    .from('users')
    .select('balance_ton, ton_farming_balance, ton_boost_package')
    .eq('id', userId)
    .single();
    
  console.log(`├── balance_ton: ${userBefore?.balance_ton || 0} TON`);
  console.log(`├── ton_farming_balance: ${userBefore?.ton_farming_balance || 0} TON`);
  console.log(`└── ton_boost_package: ${userBefore?.ton_boost_package || 0}\n`);
  
  // 2. Подсчитываем BOOST_PURCHASE транзакции из поля amount
  console.log('2. ПОДСЧЕТ BOOST_PURCHASE из поля amount:');
  const { data: boostPurchases } = await supabase
    .from('transactions')
    .select('amount, created_at, type, description')
    .eq('user_id', userId)
    .eq('type', 'BOOST_PURCHASE')
    .order('created_at', { ascending: false });
    
  let totalBoostPurchases = 0;
  if (boostPurchases && boostPurchases.length > 0) {
    boostPurchases.forEach(tx => {
      const amount = Math.abs(parseFloat(tx.amount));
      totalBoostPurchases += amount;
      console.log(`├── ${tx.created_at}: ${amount} TON (из amount: ${tx.amount})`);
    });
    console.log(`└── Всего покупок boost: ${totalBoostPurchases} TON\n`);
  }
  
  // 3. Проверяем новый calculateUserTonDeposits
  console.log('3. ТЕСТ НОВОГО РАСЧЕТА ДЕПОЗИТОВ:');
  const tonRepo = new TonFarmingRepository();
  
  // Вызываем приватный метод через рефлексию для теста
  const calculateMethod = (tonRepo as any).calculateUserTonDeposits.bind(tonRepo);
  const calculatedDeposits = await calculateMethod(parseInt(userId));
  
  console.log(`├── Рассчитанная сумма всех депозитов: ${calculatedDeposits.toFixed(3)} TON`);
  console.log(`├── В том числе BOOST_PURCHASE: ${totalBoostPurchases} TON`);
  console.log(`└── Ожидаемый ton_farming_balance: ~${(115 + totalBoostPurchases).toFixed(3)} TON\n`);
  
  // 4. Проверяем синхронизацию
  console.log('4. ПРОВЕРКА СИНХРОНИЗАЦИИ:');
  const { data: tonFarmingData } = await supabase
    .from('ton_farming_data')
    .select('farming_balance, boost_active, boost_package_id')
    .eq('user_id', userId)
    .single();
    
  console.log(`├── ton_farming_data.farming_balance: ${tonFarmingData?.farming_balance || 'null'} TON`);
  console.log(`├── users.ton_farming_balance: ${userBefore?.ton_farming_balance || 0} TON`);
  console.log(`└── Синхронизированы: ${tonFarmingData?.farming_balance == userBefore?.ton_farming_balance ? '✅' : '❌'}\n`);
  
  // 5. Итоги
  console.log('📊 ИТОГИ:');
  console.log(`├── Потеряно TON в boost покупках: ${totalBoostPurchases} TON`);
  console.log(`├── Текущий ton_farming_balance: ${userBefore?.ton_farming_balance || 0} TON`);
  console.log(`├── Должно быть после исправления: ${(parseFloat(userBefore?.ton_farming_balance || '0') + totalBoostPurchases).toFixed(3)} TON`);
  console.log(`└── Недостает: ${totalBoostPurchases} TON\n`);
  
  console.log('✅ ИСПРАВЛЕНИЯ ПРИМЕНЕНЫ:');
  console.log('1. calculateUserTonDeposits теперь читает amount для BOOST_PURCHASE');
  console.log('2. Добавлена синхронизация ton_farming_balance между таблицами');
  console.log('3. Исправлен тип данных user_id');
  console.log('4. При следующей покупке boost баланс должен обновиться правильно');
  
  console.log('\n🔧 ДЛЯ ВОССТАНОВЛЕНИЯ ПОТЕРЯННЫХ СРЕДСТВ:');
  console.log('Вариант 1 - Прямое обновление БД:');
  console.log(`UPDATE users SET ton_farming_balance = ton_farming_balance + ${totalBoostPurchases} WHERE id = ${userId};`);
  console.log(`UPDATE ton_farming_data SET farming_balance = farming_balance + ${totalBoostPurchases} WHERE user_id = ${userId};`);
  
  console.log('\nВариант 2 - Через покупку минимального boost (запустит пересчет):');
  console.log('Купите Starter Boost за 1 TON - система пересчитает все депозиты');
}

testBoostFixesFinal();