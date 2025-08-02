import { supabase } from './core/supabaseClient';

async function checkFinalState() {
  const userId = '184';
  
  console.log('=== ФИНАЛЬНАЯ ПРОВЕРКА СОСТОЯНИЯ ===\n');
  
  // 1. Данные пользователя
  const { data: user } = await supabase
    .from('users')
    .select('balance_ton, ton_farming_balance, ton_boost_active, ton_boost_package')
    .eq('id', userId)
    .single();
    
  console.log('ТЕКУЩЕЕ СОСТОЯНИЕ:');
  console.log(`├── balance_ton: ${user.balance_ton} TON`);
  console.log(`├── ton_farming_balance: ${user.ton_farming_balance} TON`);
  console.log(`├── Общая сумма: ${parseFloat(user.balance_ton) + parseFloat(user.ton_farming_balance)} TON`);
  console.log(`├── ton_boost_active: ${user.ton_boost_active ? '✅' : '❌'}`);
  console.log(`└── ton_boost_package: ${user.ton_boost_package}\n`);
  
  // 2. Проверяем ton_farming_data
  console.log('TON_FARMING_DATA:');
  const { data: farmingData, error: farmingError } = await supabase
    .from('ton_farming_data')
    .select('*')
    .eq('user_id', userId);
    
  if (farmingError) {
    console.log(`└── Ошибка: ${farmingError.message}\n`);
  } else if (!farmingData || farmingData.length === 0) {
    console.log('└── Нет записей\n');
  } else {
    farmingData.forEach(d => {
      console.log(`├── farming_balance: ${d.farming_balance || 'null'}`);
      console.log(`├── boost_active: ${d.boost_active ? '✅' : '❌'}`);
      console.log(`└── updated_at: ${d.updated_at}\n`);
    });
  }
  
  // 3. Транзакции покупок за сегодня
  console.log('ТРАНЗАКЦИИ ПОКУПОК СЕГОДНЯ:');
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  const { data: purchases } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'BOOST_PURCHASE')
    .gte('created_at', todayStart.toISOString())
    .order('created_at', { ascending: false });
    
  if (purchases && purchases.length > 0) {
    let totalSpent = 0;
    purchases.forEach(tx => {
      const time = new Date(tx.created_at).toLocaleTimeString('ru-RU');
      console.log(`├── ${time}: ${tx.amount} TON - ${tx.description}`);
      totalSpent += Math.abs(parseFloat(tx.amount));
    });
    console.log(`└── Всего потрачено: ${totalSpent} TON\n`);
  } else {
    console.log('└── Транзакций BOOST_PURCHASE не найдено\n');
  }
  
  // 4. Анализ
  console.log('📊 ИТОГИ:');
  console.log('1. Было: 100.02 TON в balance_ton + 115 TON в farming = 215.02 TON');
  console.log(`2. Стало: ${user.balance_ton} TON + ${user.ton_farming_balance} TON = ${parseFloat(user.balance_ton) + parseFloat(user.ton_farming_balance)} TON`);
  console.log(`3. Разница: ${215.02 - (parseFloat(user.balance_ton) + parseFloat(user.ton_farming_balance))} TON\n`);
  
  console.log('ПРОБЛЕМА:');
  console.log('- Деньги списались с balance_ton');
  console.log('- НЕ добавились в ton_farming_balance');
  console.log('- ton_farming_data не обновляется');
  console.log('- Код использует fallback, но он не работает правильно');
}

checkFinalState();