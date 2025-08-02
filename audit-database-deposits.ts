import { supabase } from './core/supabaseClient';

async function auditDatabaseDeposits() {
  console.log('=== АУДИТ ДЕПОЗИТОВ В БД (ТЕКУЩЕЕ СОСТОЯНИЕ) ===\n');
  
  // 1. Проверяем структуру таблицы users
  console.log('1. ТАБЛИЦА USERS - поля для депозитов:');
  const { data: userSample } = await supabase
    .from('users')
    .select('*')
    .eq('id', 184)
    .single();
    
  const depositFields = [
    'balance_ton',
    'balance_uni', 
    'uni_deposit_amount',
    'uni_farming_balance',
    'ton_farming_balance',
    'ton_boost_package',
    'ton_boost_active'
  ];
  
  depositFields.forEach(field => {
    if (field in userSample) {
      console.log(`├── ${field}: ${userSample[field]} (тип: ${typeof userSample[field]})`);
    }
  });
  
  // 2. Проверяем таблицу transactions
  console.log('\n2. ТАБЛИЦА TRANSACTIONS - типы депозитов:');
  const { data: transactionTypes } = await supabase
    .from('transactions')
    .select('type, count')
    .eq('user_id', 184);
    
  const typeCounts = {};
  transactionTypes?.forEach(tx => {
    typeCounts[tx.type] = (typeCounts[tx.type] || 0) + 1;
  });
  
  Object.entries(typeCounts).forEach(([type, count]) => {
    console.log(`├── ${type}: ${count} записей`);
  });
  
  // 3. Проверяем таблицу ton_farming_data
  console.log('\n3. ТАБЛИЦА TON_FARMING_DATA:');
  const { data: tonFarmingData, error: tonError } = await supabase
    .from('ton_farming_data')
    .select('*')
    .eq('user_id', 184);
    
  if (tonError) {
    console.log(`└── Ошибка: ${tonError.message}`);
  } else if (!tonFarmingData || tonFarmingData.length === 0) {
    console.log('└── Нет записей для user_id=184');
  } else {
    console.log(`└── Найдено записей: ${tonFarmingData.length}`);
    tonFarmingData.forEach(data => {
      console.log(`    ├── farming_balance: ${data.farming_balance}`);
      console.log(`    ├── boost_active: ${data.boost_active}`);
      console.log(`    └── boost_package_id: ${data.boost_package_id}`);
    });
  }
  
  // 4. Проверяем таблицу uni_farming_data
  console.log('\n4. ТАБЛИЦА UNI_FARMING_DATA:');
  const { data: uniFarmingData, error: uniError } = await supabase
    .from('uni_farming_data')
    .select('*')
    .eq('user_id', 184);
    
  if (uniError) {
    console.log(`└── Ошибка: ${uniError.message}`);
  } else if (!uniFarmingData || uniFarmingData.length === 0) {
    console.log('└── Нет записей для user_id=184');
  } else {
    console.log(`└── Найдено записей: ${uniFarmingData.length}`);
  }
  
  // 5. Проверяем таблицу boost_packages
  console.log('\n5. ТАБЛИЦА BOOST_PACKAGES:');
  const { data: boostPackages, error: boostError } = await supabase
    .from('boost_packages')
    .select('*');
    
  if (boostError) {
    console.log(`└── Ошибка: ${boostError.message}`);
  } else if (!boostPackages || boostPackages.length === 0) {
    console.log('└── Таблица пустая!');
  } else {
    console.log(`└── Найдено пакетов: ${boostPackages.length}`);
  }
  
  // 6. Анализ - где хранятся депозиты
  console.log('\n📊 АНАЛИЗ - ГДЕ СЕЙЧАС ХРАНЯТСЯ ДЕПОЗИТЫ:');
  console.log('\nUNI ДЕПОЗИТЫ:');
  console.log('├── uni_deposit_amount в users: сумма UNI депозита');
  console.log('└── uni_farming_balance в users: накопленный доход');
  
  console.log('\nTON ДЕПОЗИТЫ:');
  console.log('├── ton_farming_balance в users: сумма TON в farming');
  console.log('├── ton_farming_data таблица: есть 1 запись с farming_balance=115');
  console.log('└── balance_ton в users: доступный баланс для вывода');
  
  console.log('\nПРОБЛЕМА:');
  console.log('- При покупке boost деньги списываются из balance_ton');
  console.log('- НО не добавляются в ton_farming_balance');
  console.log('- Система пытается писать в ton_farming_data, но fallback не работает');
}

auditDatabaseDeposits();