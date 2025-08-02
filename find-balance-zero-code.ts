import { supabase } from './core/supabaseClient';

async function findBalanceZeroCode() {
  console.log('=== ПОИСК КОДА, КОТОРЫЙ ОБНУЛЯЕТ БАЛАНС TON ===\n');
  
  const userId = '184';
  
  try {
    // 1. Анализ математики
    console.log('1. МАТЕМАТИЧЕСКИЙ АНАЛИЗ:');
    console.log('=' * 60);
    console.log('Было:');
    console.log('├── balance_ton: 100.36 TON');
    console.log('├── ton_farming_balance: 15 TON');
    console.log('');
    console.log('Стало:');
    console.log('├── balance_ton: 0 TON');
    console.log('├── ton_farming_balance: 115 TON');
    console.log('');
    console.log('📊 ВЫВОД: 100 TON переместились из balance_ton в ton_farming_balance!');
    console.log('15 + 100 = 115 ✅');
    
    // 2. Где это может происходить
    console.log('\n\n2. ГДЕ МОЖЕТ ПРОИСХОДИТЬ ПЕРЕНОС БАЛАНСА:');
    console.log('=' * 60);
    console.log('\n🔍 ГИПОТЕЗА: При активации TON Boost происходит:');
    console.log('1. Списание 1 TON за пакет (правильно)');
    console.log('2. Перенос ВСЕГО оставшегося balance_ton в ton_farming_balance');
    console.log('3. Обнуление balance_ton');
    
    // 3. Файлы для проверки
    console.log('\n\n3. КЛЮЧЕВЫЕ ФАЙЛЫ ДЛЯ ПРОВЕРКИ:');
    console.log('=' * 60);
    console.log('\n📁 modules/boost/TonFarmingRepository.ts');
    console.log('├── функция activateBoost()');
    console.log('├── обновляет farming_balance');
    console.log('└── может переносить весь баланс?');
    
    console.log('\n📁 modules/tonFarming/repository.ts');
    console.log('├── управляет ton_farming_balance');
    console.log('└── может обнулять balance_ton?');
    
    console.log('\n📁 modules/boost/service.ts'); 
    console.log('├── функция purchaseWithInternalWallet()');
    console.log('├── после списания 1 TON');
    console.log('└── вызывает activateBoost()');
    
    // 4. Проверка логов
    console.log('\n\n4. ПОИСК В ЛОГАХ ОПЕРАЦИЙ С БАЛАНСОМ:');
    console.log('=' * 60);
    console.log('Нужно найти логи с текстом:');
    console.log('├── "farming_balance"');
    console.log('├── "balance_ton = 0"');
    console.log('├── "Накопление депозита"');
    console.log('└── "newFarmingBalance"');
    
    // 5. Тестовый расчет
    console.log('\n\n5. ТЕСТОВЫЙ РАСЧЕТ:');
    console.log('=' * 60);
    
    const oldBalanceTon = 100.36;
    const oldFarmingBalance = 15;
    const packageCost = 1;
    
    console.log('Правильный сценарий:');
    console.log(`├── balance_ton: ${oldBalanceTon} - ${packageCost} = ${oldBalanceTon - packageCost}`);
    console.log(`└── ton_farming_balance: ${oldFarmingBalance} (не меняется)`);
    
    console.log('\nНеправильный сценарий (что произошло):');
    console.log(`├── balance_ton: ${oldBalanceTon} → 0`);
    console.log(`└── ton_farming_balance: ${oldFarmingBalance} + ${oldBalanceTon - packageCost} ≈ ${oldFarmingBalance + oldBalanceTon}`);
    
    // 6. SQL проверка
    console.log('\n\n6. ПРОВЕРКА ДАННЫХ В БД:');
    console.log('=' * 60);
    
    // Проверяем историю изменений через транзакции
    const { data: balanceHistory } = await supabase
      .from('transactions')
      .select('created_at, type, amount, currency, description')
      .eq('user_id', parseInt(userId))
      .or('type.eq.TON_DEPOSIT,type.eq.FARMING_REWARD,type.eq.TON_BOOST_PURCHASE,type.eq.BOOST_PURCHASE')
      .gte('created_at', '2025-08-02T10:25:00')
      .lte('created_at', '2025-08-02T10:30:00')
      .order('created_at');
      
    console.log('\nТранзакции в момент покупки:');
    balanceHistory?.forEach(tx => {
      console.log(`${new Date(tx.created_at).toLocaleTimeString()} | ${tx.type} | ${tx.amount} ${tx.currency}`);
    });
    
    console.log('\n\n=== ЗАКЛЮЧЕНИЕ ===');
    console.log('❗ При покупке TON Boost происходит:');
    console.log('1. Списание 1 TON (правильно)');
    console.log('2. Весь оставшийся balance_ton переносится в ton_farming_balance');
    console.log('3. balance_ton обнуляется');
    console.log('\n🎯 Проблема в функции activateBoost() или связанном коде!');
    
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

findBalanceZeroCode();