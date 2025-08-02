import { supabase } from './core/supabaseClient';

async function checkTonDepositsDeep() {
  const userId = '184';
  
  console.log('=== ГЛУБОКАЯ ПРОВЕРКА TON ДЕПОЗИТОВ ===\n');
  
  // 1. Проверяем ton_farming_data
  console.log('1. Таблица ton_farming_data:');
  const { data: tonFarmingData } = await supabase
    .from('ton_farming_data')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
    
  if (tonFarmingData?.length) {
    tonFarmingData.forEach(d => {
      console.log(`├── ID: ${d.id}, Пакет: ${d.ton_boost_package_id}, Сумма: ${d.amount} TON`);
      console.log(`│   Создан: ${new Date(d.created_at).toLocaleString('ru-RU')}`);
      console.log(`│   Истекает: ${d.expires_at ? new Date(d.expires_at).toLocaleString('ru-RU') : 'не указано'}`);
      console.log(`│   Активен: ${d.is_active ? '✅' : '❌'}\n`);
    });
  } else {
    console.log('└── Записей не найдено\n');
  }
  
  // 2. Проверяем boost_packages
  console.log('2. Boost пакеты в системе:');
  const { data: packages } = await supabase
    .from('boost_packages')
    .select('*')
    .order('price');
    
  packages?.forEach(p => {
    console.log(`├── ID: ${p.id}, ${p.name}: ${p.price} TON (${p.rate}% в день)`);
  });
  
  // 3. Проверяем транзакции покупок
  console.log('\n3. Последние транзакции типа BOOST_PURCHASE:');
  const { data: boostTx } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'BOOST_PURCHASE')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (boostTx?.length) {
    boostTx.forEach(tx => {
      console.log(`├── ${tx.amount} ${tx.currency} - ${tx.description}`);
      console.log(`│   Статус: ${tx.status}, ID: ${tx.id}`);
      console.log(`│   Дата: ${new Date(tx.created_at).toLocaleString('ru-RU')}\n`);
    });
  } else {
    console.log('└── Транзакций BOOST_PURCHASE не найдено\n');
  }
  
  // 4. Проверяем все транзакции со списанием TON за последний час
  console.log('4. Все списания TON за последний час:');
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: recentTonTx } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('currency', 'TON')
    .lt('amount', 0) // Отрицательные суммы = списания
    .gte('created_at', hourAgo)
    .order('created_at', { ascending: false });
    
  if (recentTonTx?.length) {
    let totalSpent = 0;
    recentTonTx.forEach(tx => {
      console.log(`├── ${tx.type}: ${tx.amount} TON - ${tx.description}`);
      console.log(`│   Дата: ${new Date(tx.created_at).toLocaleString('ru-RU')}`);
      totalSpent += Math.abs(parseFloat(tx.amount));
    });
    console.log(`└── ИТОГО списано: ${totalSpent.toFixed(6)} TON\n`);
  } else {
    console.log('└── Списаний не найдено\n');
  }
  
  // 5. Проверяем поля пользователя
  console.log('5. Данные пользователя:');
  const { data: user } = await supabase
    .from('users')
    .select('balance_ton, ton_farming_balance, ton_boost_active, ton_boost_package, ton_boost_expires_at')
    .eq('id', userId)
    .single();
    
  console.log(`├── balance_ton: ${user.balance_ton} TON`);
  console.log(`├── ton_farming_balance: ${user.ton_farming_balance} TON`);
  console.log(`├── ton_boost_active: ${user.ton_boost_active ? '✅' : '❌'}`);
  console.log(`├── ton_boost_package: ${user.ton_boost_package || 'не указан'}`);
  console.log(`└── ton_boost_expires_at: ${user.ton_boost_expires_at || 'не указан'}\n`);
  
  // 6. Анализ проблемы
  console.log('📊 АНАЛИЗ:');
  console.log('1. Пропало 12.996007 TON из общего баланса');
  console.log('2. ton_farming_balance не увеличился (остался 115 TON)');
  console.log('3. Возможные причины:');
  console.log('   - Деньги списались, но не добавились в farming');
  console.log('   - Новые депозиты не создаются в ton_farming_data');
  console.log('   - Проблема с логикой обработки покупок');
}

checkTonDepositsDeep();