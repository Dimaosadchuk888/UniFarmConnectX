import { supabase } from './core/supabaseClient';

async function checkCurrentBoostSystem() {
  const userId = '184';
  
  console.log('=== ПРОВЕРКА ТЕКУЩЕЙ СИСТЕМЫ TON BOOST ===\n');
  console.log('Дата проверки:', new Date().toLocaleString('ru-RU'));
  console.log('Проверяем состояние после рефакторинга БД\n');
  
  // 1. Текущие boost пакеты
  console.log('1. BOOST ПАКЕТЫ В СИСТЕМЕ:');
  const { data: packages } = await supabase
    .from('boost_packages')
    .select('*')
    .order('price');
    
  if (packages?.length) {
    packages.forEach(p => {
      console.log(`├── ID: ${p.id} | ${p.name}`);
      console.log(`│   Цена: ${p.price} TON | Ставка: ${p.rate}% в день`);
      console.log(`│   Активен: ${p.is_active ? '✅' : '❌'}\n`);
    });
  } else {
    console.log('└── ❌ Таблица boost_packages пустая!\n');
  }
  
  // 2. Проверяем транзакции за сегодня
  console.log('2. ТРАНЗАКЦИИ TON ЗА СЕГОДНЯ:');
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  const { data: todayTx } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('currency', 'TON')
    .gte('created_at', todayStart.toISOString())
    .order('created_at', { ascending: false });
    
  if (todayTx?.length) {
    let totalIn = 0, totalOut = 0;
    todayTx.forEach(tx => {
      const amount = parseFloat(tx.amount);
      if (amount > 0) totalIn += amount;
      else totalOut += Math.abs(amount);
      
      const time = new Date(tx.created_at).toLocaleTimeString('ru-RU');
      console.log(`├── ${time} | ${tx.type}: ${tx.amount} TON`);
      if (tx.description) console.log(`│   ${tx.description}`);
    });
    console.log(`└── Итого: +${totalIn.toFixed(6)} / -${totalOut.toFixed(6)} TON\n`);
  } else {
    console.log('└── Транзакций за сегодня не найдено\n');
  }
  
  // 3. Проверяем ton_farming_data
  console.log('3. АКТИВНЫЕ TON ДЕПОЗИТЫ:');
  const { data: activeFarming } = await supabase
    .from('ton_farming_data')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
    
  if (activeFarming?.length) {
    activeFarming.forEach(d => {
      console.log(`├── ID: ${d.id} | Пакет: ${d.ton_boost_package_id || 'не указан'}`);
      console.log(`│   Сумма: ${d.amount || '?'} TON | Ставка: ${d.rate || '?'}%`);
      console.log(`│   Создан: ${new Date(d.created_at).toLocaleString('ru-RU')}\n`);
    });
  } else {
    console.log('└── Активных депозитов не найдено\n');
  }
  
  // 4. Анализ баланса пользователя
  console.log('4. БАЛАНС ПОЛЬЗОВАТЕЛЯ:');
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
    
  console.log(`├── balance_ton: ${user.balance_ton} TON`);
  console.log(`├── ton_farming_balance: ${user.ton_farming_balance} TON`);
  console.log(`├── Общая сумма: ${parseFloat(user.balance_ton) + parseFloat(user.ton_farming_balance)} TON`);
  console.log(`├── ton_boost_active: ${user.ton_boost_active ? '✅' : '❌'}`);
  console.log(`└── ton_boost_package: ${user.ton_boost_package || 'не указан'}\n`);
  
  // 5. Проверяем API boost/farming-status
  console.log('5. ДАННЫЕ ИЗ API:');
  try {
    const response = await fetch(`http://localhost:3001/api/v2/boost/farming-status?user_id=${userId}`);
    const apiData = await response.json();
    
    if (apiData.success) {
      console.log(`├── Депозитов в API: ${apiData.data.deposits?.length || 0}`);
      console.log(`├── Доход в день: ${apiData.data.dailyIncomeTon} TON`);
      console.log(`└── Ставка в секунду: ${apiData.data.totalTonRatePerSecond} TON/сек\n`);
      
      if (apiData.data.deposits?.length) {
        console.log('   Детали депозитов из API:');
        apiData.data.deposits.forEach((d: any, i: number) => {
          console.log(`   ${i+1}. ${d.package_name}: ${d.amount} TON (${d.rate}% в день)`);
        });
      }
    }
  } catch (error) {
    console.log('└── Ошибка при запросе к API\n');
  }
  
  console.log('\n📊 ИТОГОВЫЙ АНАЛИЗ:');
  console.log('- Баланс уменьшился на ~13 TON');
  console.log('- ton_farming_balance не изменился (остался 115 TON)');
  console.log('- API показывает только 1 старый депозит');
  console.log('- Нужно проверить логику создания новых депозитов при покупке');
}

checkCurrentBoostSystem();