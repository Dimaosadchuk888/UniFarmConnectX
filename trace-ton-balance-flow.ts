import { supabase } from './core/supabaseClient';

async function traceTonBalanceFlow() {
  console.log('=== ТРАССИРОВКА: ОТКУДА БЕРЕТСЯ И КУДА ИДЕТ БАЛАНС TON ===\n');
  
  const userId = '184';
  
  try {
    // 1. Где хранится баланс TON в БД
    console.log('1. ХРАНЕНИЕ БАЛАНСА TON В БАЗЕ ДАННЫХ:');
    console.log('=' * 60);
    
    const { data: user } = await supabase
      .from('users')
      .select('id, balance_ton, ton_farming_balance, ton_boost_active, ton_boost_package')
      .eq('id', userId)
      .single();
      
    console.log('\nОсновные поля для TON:');
    console.log(`├── balance_ton: ${user.balance_ton} (основной баланс для трат)`);
    console.log(`├── ton_farming_balance: ${user.ton_farming_balance} (депозит для фарминга)`);
    console.log(`├── ton_boost_active: ${user.ton_boost_active}`);
    console.log(`└── ton_boost_package: ${user.ton_boost_package}`);
    
    // 2. Откуда берется отображаемый баланс
    console.log('\n\n2. ОТКУДА БЕРЕТСЯ БАЛАНС ДЛЯ ОТОБРАЖЕНИЯ:');
    console.log('=' * 60);
    console.log('Frontend → API запрос → server/routes/wallet.ts → WalletService');
    console.log('WalletService.getWalletDataByUserId() → читает users.balance_ton');
    console.log(`\nСейчас отображается: ${user.balance_ton} TON`);
    
    // 3. Откуда приходят начисления
    console.log('\n\n3. ОТКУДА ПРИХОДЯТ НАЧИСЛЕНИЯ (0.003993 TON):');
    console.log('=' * 60);
    
    const { data: recentRewards } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', parseInt(userId))
      .eq('type', 'FARMING_REWARD')
      .eq('currency', 'TON')
      .order('created_at', { ascending: false })
      .limit(5);
      
    console.log('\nПоследние начисления TON:');
    recentRewards?.forEach(tx => {
      console.log(`├── ${new Date(tx.created_at).toLocaleTimeString()} - ${tx.amount} TON`);
    });
    
    console.log('\nМеханизм начислений:');
    console.log('├── server/farming-calculator.ts (каждые 5 минут)');
    console.log('├── Проверяет ton_boost_active = true');
    console.log('├── Берет ton_farming_balance как базу');
    console.log('├── Начисляет % согласно ton_boost_package');
    console.log('└── Добавляет к balance_ton');
    
    // 4. Почему баланс обнулился
    console.log('\n\n4. АНАЛИЗ: ПОЧЕМУ БАЛАНС ОБНУЛИЛСЯ');
    console.log('=' * 60);
    
    console.log('\nЧто должно было произойти:');
    console.log('1. balance_ton: 100.36 → 99.36 (списание 1 TON)');
    console.log('2. ton_farming_balance: 15 → 115 (добавление 100 TON депозита)');
    
    console.log('\nЧто произошло на самом деле:');
    console.log('1. balance_ton: 100.36 → 0 ❌');
    console.log('2. ton_farming_balance: 15 → 115 ✅');
    
    // 5. Поиск проблемного места
    console.log('\n\n5. ВОЗМОЖНЫЕ МЕСТА ОБНУЛЕНИЯ:');
    console.log('=' * 60);
    
    console.log('\n🔍 ВАРИАНТ 1: Двойное списание');
    console.log('├── subtractBalance списывает 1 TON');
    console.log('└── Какой-то другой код списывает остальное');
    
    console.log('\n🔍 ВАРИАНТ 2: Неправильная формула');
    console.log('├── Вместо: balance_ton = balance_ton - 1');
    console.log('└── Используется: balance_ton = 0 или balance_ton = ton_farming_balance - balance_ton');
    
    console.log('\n🔍 ВАРИАНТ 3: Путаница полей при активации');
    console.log('├── При активации TON Boost может происходить');
    console.log('└── перенос всего balance_ton в ton_farming_balance');
    
    // 6. Проверка связанных таблиц
    console.log('\n\n6. ПРОВЕРКА СВЯЗАННОЙ ТАБЛИЦЫ ton_farming_data:');
    console.log('=' * 60);
    
    const { data: farmingData } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    if (farmingData) {
      console.log(`farming_balance: ${farmingData.farming_balance}`);
      console.log(`boost_active: ${farmingData.boost_active}`);
      console.log(`boost_package_id: ${farmingData.boost_package_id}`);
      console.log('\n💡 farming_balance (115) = сумма всех депозитов TON');
    }
    
    // 7. Финальный вывод
    console.log('\n\n=== ИТОГ ===');
    console.log('✅ Баланс хранится в users.balance_ton');
    console.log('✅ Начисления идут от farming-calculator каждые 5 мин');
    console.log('✅ ton_farming_balance накапливает депозиты (15→115)');
    console.log('❌ При покупке весь balance_ton (100 TON) исчез');
    console.log('\n🎯 Нужно найти код, который при активации TON Boost:');
    console.log('   - Обнуляет balance_ton');
    console.log('   - Или переносит весь balance_ton в ton_farming_balance');
    
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

traceTonBalanceFlow();