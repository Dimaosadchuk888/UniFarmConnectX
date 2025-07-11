import { supabase } from '../core/supabase';

async function checkDatabaseStatusAfterSync() {
  console.log('🔍 ПОВТОРНАЯ ПРОВЕРКА СОСТОЯНИЯ БАЗЫ ДАННЫХ\n');
  console.log('Дата проверки:', new Date().toLocaleString('ru-RU'));
  console.log('=' .repeat(60) + '\n');

  // 1. Проверка типов транзакций
  console.log('📊 1. ПРОВЕРКА ТИПОВ ТРАНЗАКЦИЙ:');
  console.log('-'.repeat(40));
  
  try {
    // Получаем уникальные типы из последних транзакций
    const { data: types, error } = await supabase
      .from('transactions')
      .select('type')
      .limit(1000);

    if (error) throw error;

    const uniqueTypes = new Set<string>();
    types?.forEach(row => {
      if (row.type) uniqueTypes.add(row.type);
    });

    console.log('Найдено типов в транзакциях:', uniqueTypes.size);
    console.log('Типы:', Array.from(uniqueTypes).join(', '));
    
    // Проверяем ожидаемые типы
    const expectedTypes = [
      'FARMING_REWARD', 'BOOST_REWARD', 'MISSION_REWARD', 
      'DAILY_BONUS', 'REFERRAL_REWARD', 'WITHDRAWAL', 
      'DEPOSIT', 'FARMING_DEPOSIT', 'BOOST_PURCHASE', 'AIRDROP_CLAIM'
    ];
    
    console.log('\nОжидаемые типы (из кода):');
    expectedTypes.forEach(type => {
      const exists = uniqueTypes.has(type);
      console.log(`  ${type}: ${exists ? '✅ используется' : '⚠️  не найден в данных'}`);
    });
  } catch (error) {
    console.error('Ошибка при проверке типов:', error);
  }

  // 2. Проверка критических полей в users
  console.log('\n📊 2. ПРОВЕРКА ПОЛЕЙ В ТАБЛИЦЕ USERS:');
  console.log('-'.repeat(40));
  
  try {
    // Получаем одного пользователя для проверки структуры
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .limit(1)
      .single();

    if (error) throw error;

    const criticalFields = ['last_active', 'is_guest', 'guest_id', 'referred_by_user_id'];
    const userKeys = Object.keys(user || {});
    
    criticalFields.forEach(field => {
      const exists = userKeys.includes(field);
      console.log(`  ${field}: ${exists ? '✅ существует' : '❌ ОТСУТСТВУЕТ'}`);
    });
    
    // Специальная проверка last_active
    if ('last_active' in (user || {})) {
      console.log(`  Значение last_active: ${user.last_active || 'NULL'}`);
    }
  } catch (error) {
    console.error('Ошибка при проверке полей users:', error);
  }

  // 3. Проверка критических полей в transactions
  console.log('\n📊 3. ПРОВЕРКА ПОЛЕЙ В ТАБЛИЦЕ TRANSACTIONS:');
  console.log('-'.repeat(40));
  
  try {
    const { data: transaction, error } = await supabase
      .from('transactions')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // Игнорируем ошибку "no rows"

    const criticalFields = ['amount', 'currency', 'from_user_id', 'to_user_id'];
    const transactionKeys = Object.keys(transaction || {});
    
    criticalFields.forEach(field => {
      const exists = transactionKeys.includes(field);
      console.log(`  ${field}: ${exists ? '✅ существует' : '❌ ОТСУТСТВУЕТ'}`);
    });
  } catch (error) {
    console.error('Ошибка при проверке полей transactions:', error);
  }

  // 4. Проверка новых таблиц
  console.log('\n📊 4. ПРОВЕРКА НОВЫХ ТАБЛИЦ:');
  console.log('-'.repeat(40));
  
  const newTables = [
    'user_sessions',
    'referral_commissions',
    'system_settings',
    'airdrop_claims'
  ];

  for (const table of newTables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`  ${table}: ❌ НЕ СУЩЕСТВУЕТ`);
      } else {
        console.log(`  ${table}: ✅ существует (записей: ${count || 0})`);
      }
    } catch (error) {
      console.log(`  ${table}: ❌ ошибка проверки`);
    }
  }

  // 5. Итоговая оценка
  console.log('\n' + '='.repeat(60));
  console.log('📋 ИТОГОВАЯ ОЦЕНКА ГОТОВНОСТИ:');
  console.log('='.repeat(60));
  
  try {
    // Проверяем критические поля
    const { data: userCheck } = await supabase
      .from('users')
      .select('last_active')
      .limit(1)
      .single();
    
    const { data: transCheck } = await supabase
      .from('transactions')
      .select('amount, currency')
      .limit(1)
      .single();
    
    const hasLastActive = userCheck && 'last_active' in userCheck;
    const hasAmount = transCheck && 'amount' in transCheck;
    const hasCurrency = transCheck && 'currency' in transCheck;
    
    console.log('\nКРИТИЧЕСКИЕ КОМПОНЕНТЫ:');
    console.log(`1. Поле users.last_active: ${hasLastActive ? '✅ ГОТОВО' : '❌ ТРЕБУЕТСЯ'}`);
    console.log(`2. Поле transactions.amount: ${hasAmount ? '✅ ГОТОВО' : '❌ ТРЕБУЕТСЯ'}`);
    console.log(`3. Поле transactions.currency: ${hasCurrency ? '✅ ГОТОВО' : '❌ ТРЕБУЕТСЯ'}`);
    
    if (hasLastActive && hasAmount && hasCurrency) {
      console.log('\n✅ БАЗА ДАННЫХ ГОТОВА К РАБОТЕ!');
      console.log('Все критические поля добавлены.');
    } else {
      console.log('\n⚠️  ТРЕБУЕТСЯ ДОПОЛНИТЕЛЬНАЯ НАСТРОЙКА');
      console.log('Выполните команды из файла QUICK_FIX_INSTRUCTIONS.md');
    }
  } catch (error) {
    console.error('Ошибка итоговой проверки:', error);
  }

  // 6. Проверка конкретной проблемы с last_active
  console.log('\n📊 ДЕТАЛЬНАЯ ПРОВЕРКА ПОЛЯ last_active:');
  console.log('-'.repeat(40));
  
  try {
    // Проверяем пользователя 74 специально
    const { data: user74, error } = await supabase
      .from('users')
      .select('id, telegram_id, last_active, created_at')
      .eq('id', 74)
      .single();
    
    if (!error && user74) {
      console.log('Пользователь ID 74:');
      console.log(`  - ID: ${user74.id}`);
      console.log(`  - Telegram ID: ${user74.telegram_id}`);
      console.log(`  - last_active: ${user74.last_active || 'NULL'}`);
      console.log(`  - created_at: ${user74.created_at}`);
    }
  } catch (error) {
    console.error('Ошибка проверки user 74:', error);
  }
}

checkDatabaseStatusAfterSync().catch(console.error);