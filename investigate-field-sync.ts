import { supabase } from './core/supabaseClient';

async function investigateFieldSync() {
  console.log('=== ИССЛЕДОВАНИЕ СИНХРОНИЗАЦИИ ПОЛЕЙ И ТРИГГЕРОВ ===\n');
  
  const userId = '184';
  
  try {
    // 1. Проверяем историю изменений баланса
    console.log('1. ИСТОРИЯ ИЗМЕНЕНИЙ БАЛАНСА (до и после покупки):');
    console.log('=' * 60);
    
    // Транзакции за 2 августа
    const { data: allTransactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', parseInt(userId))
      .gte('created_at', '2025-08-02T00:00:00')
      .lte('created_at', '2025-08-02T23:59:59')
      .order('created_at');
      
    console.log(`\nВсе транзакции за 2 августа (${allTransactions?.length || 0} шт):\n`);
    
    let runningBalanceTon = 100.36; // Начальный баланс
    console.log(`Начальный balance_ton: ${runningBalanceTon} TON\n`);
    
    allTransactions?.forEach((tx, i) => {
      const time = new Date(tx.created_at).toLocaleTimeString();
      console.log(`${i+1}. ${time} - ${tx.type}`);
      
      if (tx.currency === 'TON') {
        const amount = parseFloat(tx.amount_ton || tx.amount || '0');
        console.log(`   Сумма: ${amount > 0 ? '+' : ''}${amount} TON`);
        
        // Отслеживаем изменения баланса
        if (tx.type === 'FARMING_REWARD' && amount > 0) {
          runningBalanceTon += amount;
          console.log(`   → balance_ton после: ${runningBalanceTon.toFixed(6)} TON`);
        } else if (tx.type === 'BOOST_PURCHASE' && amount < 0) {
          runningBalanceTon += amount;
          console.log(`   → balance_ton после: ${runningBalanceTon.toFixed(6)} TON (списание)`);
        }
      }
      
      console.log(`   Описание: ${tx.description}`);
      if (tx.metadata) {
        console.log(`   Метаданные: ${JSON.stringify(tx.metadata)}`);
      }
      console.log('');
    });
    
    // 2. Проверяем текущее состояние полей
    console.log('\n\n2. ТЕКУЩЕЕ СОСТОЯНИЕ ПОЛЕЙ В БД:');
    console.log('=' * 60);
    
    const { data: currentUser } = await supabase
      .from('users')
      .select(`
        balance_ton,
        ton_farming_balance,
        ton_boost_active,
        ton_boost_package,
        ton_boost_rate,
        ton_farming_start_timestamp,
        ton_farming_last_update
      `)
      .eq('id', userId)
      .single();
      
    console.log('Таблица users:');
    console.log(`├── balance_ton: ${currentUser.balance_ton}`);
    console.log(`├── ton_farming_balance: ${currentUser.ton_farming_balance}`);
    console.log(`├── ton_boost_active: ${currentUser.ton_boost_active}`);
    console.log(`├── ton_boost_package: ${currentUser.ton_boost_package}`);
    console.log(`└── ton_boost_rate: ${currentUser.ton_boost_rate}`);
    
    // 3. Проверяем ton_farming_data
    const { data: farmingData } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    if (farmingData) {
      console.log('\nТаблица ton_farming_data:');
      console.log(`├── farming_balance: ${farmingData.farming_balance}`);
      console.log(`├── boost_active: ${farmingData.boost_active}`);
      console.log(`├── boost_package_id: ${farmingData.boost_package_id}`);
      console.log(`└── updated_at: ${farmingData.updated_at}`);
    }
    
    // 4. Анализ синхронизации
    console.log('\n\n3. АНАЛИЗ СИНХРОНИЗАЦИИ:');
    console.log('=' * 60);
    
    console.log('\n🔍 ГИПОТЕЗА: Триггер или синхронизация в БД');
    console.log('При обновлении ton_farming_data может срабатывать триггер,');
    console.log('который синхронизирует ton_farming_balance с users таблицей');
    console.log('и при этом обнуляет balance_ton');
    
    console.log('\n🔍 АЛЬТЕРНАТИВА: Race condition');
    console.log('Несколько операций могут выполняться параллельно:');
    console.log('1. Списание 1 TON за boost');
    console.log('2. Активация boost с депозитом');
    console.log('3. Синхронизация полей между таблицами');
    console.log('4. Начисление farming rewards');
    
    // 5. Проверяем последовательность событий
    console.log('\n\n4. КРИТИЧЕСКИЙ МОМЕНТ (10:26):');
    console.log('=' * 60);
    
    const criticalMoment = allTransactions?.filter(tx => {
      const time = new Date(tx.created_at);
      return time.getHours() === 10 && time.getMinutes() === 26;
    });
    
    console.log(`Найдено ${criticalMoment?.length || 0} транзакций в 10:26:`);
    criticalMoment?.forEach(tx => {
      console.log(`- ${tx.type}: ${tx.description}`);
    });
    
    console.log('\n\n=== ВЫВОДЫ ===');
    console.log('1. В транзакциях нет записи о переносе 100 TON');
    console.log('2. ton_farming_balance = 115 (было 15 + стало 100)');
    console.log('3. balance_ton = 0.007986 (только farming rewards)');
    console.log('\n❓ Возможные причины:');
    console.log('- Триггер в БД при синхронизации полей');
    console.log('- Неправильная последовательность операций');
    console.log('- Старый код, который переносил весь баланс');
    
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

investigateFieldSync();