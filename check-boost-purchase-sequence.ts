import { supabase } from './core/supabaseClient';

async function checkBoostPurchaseSequence() {
  console.log('=== ПРОВЕРКА ПОСЛЕДОВАТЕЛЬНОСТИ ПОКУПКИ BOOST ===\n');
  
  const userId = '184';
  
  try {
    // 1. Смотрим какие операции происходят при покупке
    console.log('1. ПОСЛЕДОВАТЕЛЬНОСТЬ ОПЕРАЦИЙ ПРИ ПОКУПКЕ TON BOOST:');
    console.log('=' * 60);
    console.log('\nИз анализа кода:');
    console.log('1) purchaseWithInternalWallet() - покупка через внутренний кошелек');
    console.log('   └─> subtractBalance() - списание 1 TON');
    console.log('2) activateBoost() - активация boost пакета');
    console.log('   └─> depositAmount = 1 TON (только стоимость пакета)');
    console.log('3) syncToUsers() - синхронизация полей');
    console.log('   └─> обновляет ton_farming_balance в users');
    
    // 2. Проверяем старые депозиты
    console.log('\n\n2. ПРОВЕРКА СТАРЫХ ДЕПОЗИТОВ TON:');
    console.log('=' * 60);
    
    // Ищем все TON транзакции до покупки boost
    const { data: oldDeposits } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', parseInt(userId))
      .eq('currency', 'TON')
      .lt('created_at', '2025-08-02T10:26:00')
      .order('created_at', { ascending: false })
      .limit(50);
      
    console.log(`\nНайдено ${oldDeposits?.length || 0} старых TON транзакций`);
    
    let totalOldDeposits = 0;
    let totalFarmingRewards = 0;
    
    oldDeposits?.forEach(tx => {
      const amount = parseFloat(tx.amount_ton || tx.amount || '0');
      if (tx.type === 'TON_DEPOSIT' || tx.type === 'DEPOSIT') {
        totalOldDeposits += amount;
      } else if (tx.type === 'FARMING_REWARD') {
        totalFarmingRewards += amount;
      }
    });
    
    console.log(`\nСтатистика до покупки boost:`);
    console.log(`├── TON депозиты: ${totalOldDeposits.toFixed(3)} TON`);
    console.log(`├── Farming rewards: ${totalFarmingRewards.toFixed(3)} TON`);
    console.log(`└── Всего: ${(totalOldDeposits + totalFarmingRewards).toFixed(3)} TON`);
    
    // 3. Проверяем состояние ton_farming_data до покупки
    console.log('\n\n3. КРИТИЧЕСКИЙ МОМЕНТ - ПЕРВАЯ АКТИВАЦИЯ?');
    console.log('=' * 60);
    
    console.log('\n⚠️ ВАЖНО: Если ton_farming_data не существовала до покупки,');
    console.log('то при первом вызове getByUserId() происходит:');
    console.log('1. Создание новой записи в ton_farming_data');
    console.log('2. calculateUserTonDeposits() суммирует ВСЕ прошлые TON транзакции');
    console.log('3. Эта сумма записывается как farming_balance');
    
    // 4. Проверяем данные пользователя
    const { data: userData } = await supabase
      .from('users')
      .select('created_at, ton_wallet_address, ton_wallet_verified')
      .eq('id', userId)
      .single();
      
    console.log(`\n\nДанные пользователя:`);
    console.log(`├── Создан: ${new Date(userData.created_at).toLocaleDateString()}`);
    console.log(`├── TON кошелек: ${userData.ton_wallet_address ? '✓' : '✗'}`);
    console.log(`└── Верифицирован: ${userData.ton_wallet_verified ? '✓' : '✗'}`);
    
    // 5. Финальный анализ
    console.log('\n\n=== ВЕРОЯТНЫЙ СЦЕНАРИЙ ===');
    console.log('\n1. У вас было balance_ton = 100.36 TON');
    console.log('2. При покупке boost списался 1 TON → balance_ton = 99.36');
    console.log('3. Но параллельно или сразу после:');
    console.log('   - Какой-то процесс перенес весь оставшийся баланс (99.36)');
    console.log('   - В ton_farming_balance (было 15 → стало 115)');
    console.log('   - balance_ton стал 0');
    console.log('\n⚠️ Возможные причины:');
    console.log('- Старая версия кода с ошибкой');
    console.log('- Триггер в базе данных');
    console.log('- Race condition между операциями');
    console.log('- Ручное вмешательство');
    
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

checkBoostPurchaseSequence();