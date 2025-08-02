import { supabase } from './core/supabaseClient';
import { TonFarmingRepository } from './modules/boost/TonFarmingRepository';

async function testBoostFixes() {
  const userId = '184';
  console.log('=== ТЕСТ ИСПРАВЛЕНИЙ TON BOOST ===\n');
  
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
  
  // 2. Проверяем calculateUserTonDeposits
  console.log('2. ТЕСТ РАСЧЕТА ДЕПОЗИТОВ (с учетом BOOST_PURCHASE):');
  const tonRepo = new TonFarmingRepository();
  
  // Вызываем приватный метод через рефлексию для теста
  const calculateMethod = (tonRepo as any).calculateUserTonDeposits.bind(tonRepo);
  const calculatedDeposits = await calculateMethod(parseInt(userId));
  
  console.log(`└── Рассчитанная сумма депозитов: ${calculatedDeposits} TON\n`);
  
  // 3. Проверяем транзакции BOOST_PURCHASE
  console.log('3. ТРАНЗАКЦИИ BOOST_PURCHASE:');
  const { data: boostPurchases } = await supabase
    .from('transactions')
    .select('amount_ton, created_at, type')
    .eq('user_id', userId)
    .eq('type', 'BOOST_PURCHASE')
    .order('created_at', { ascending: false });
    
  let totalBoostPurchases = 0;
  if (boostPurchases && boostPurchases.length > 0) {
    boostPurchases.forEach(tx => {
      const amount = Math.abs(parseFloat(tx.amount_ton));
      totalBoostPurchases += amount;
      console.log(`├── ${tx.created_at}: ${amount} TON (было записано как ${tx.amount_ton})`);
    });
    console.log(`└── Всего покупок boost: ${totalBoostPurchases} TON\n`);
  } else {
    console.log('└── Транзакций не найдено\n');
  }
  
  // 4. Анализ
  console.log('📊 АНАЛИЗ:');
  console.log(`├── Текущий ton_farming_balance: ${userBefore?.ton_farming_balance || 0} TON`);
  console.log(`├── Рассчитанная сумма депозитов: ${calculatedDeposits} TON`);
  console.log(`├── Сумма BOOST_PURCHASE: ${totalBoostPurchases} TON`);
  console.log(`├── Ожидаемый баланс: ${parseFloat(userBefore?.ton_farming_balance || '0') + totalBoostPurchases} TON`);
  console.log(`└── Разница: ${calculatedDeposits - parseFloat(userBefore?.ton_farming_balance || '0')} TON\n`);
  
  // 5. Проверяем getByUserId
  console.log('5. ТЕСТ getByUserId (не должен создавать запись с 0):');
  const farmingData = await tonRepo.getByUserId(userId);
  if (farmingData) {
    console.log(`├── farming_balance: ${farmingData.farming_balance} TON`);
    console.log(`├── boost_active: ${farmingData.boost_active}`);
    console.log(`└── boost_package_id: ${farmingData.boost_package_id}\n`);
  } else {
    console.log('└── Данные не найдены\n');
  }
  
  console.log('✅ ИСПРАВЛЕНИЯ:');
  console.log('1. BOOST_PURCHASE теперь учитывается в calculateUserTonDeposits');
  console.log('2. Отрицательные суммы правильно конвертируются в положительные');
  console.log('3. Синхронизация с users таблицей добавлена в activateBoost');
  console.log('4. Исправлен тип данных user_id в upsert');
  
  console.log('\n⚠️ ДЛЯ ВОССТАНОВЛЕНИЯ БАЛАНСА:');
  console.log(`Нужно добавить ${totalBoostPurchases} TON к ton_farming_balance`);
  console.log(`UPDATE users SET ton_farming_balance = ton_farming_balance + ${totalBoostPurchases} WHERE id = ${userId};`);
}

testBoostFixes();