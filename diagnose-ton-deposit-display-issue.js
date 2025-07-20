import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.DATABASE_URL?.replace('postgresql://', 'https://').replace(':5432', '') || 'https://localhost';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'dummy';
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseTonDepositIssue() {
  console.log('🔍 ДИАГНОСТИКА TON ДЕПОЗИТОВ - ПРОБЛЕМА ОТОБРАЖЕНИЯ');
  console.log('=' * 60);
  
  // 1. Проверяем транзакцию с конкретным хешем
  const targetHash = '00a1ba3c2614f4d65cc346805feea960';
  
  console.log(`\n1️⃣ ПОИСК ТРАНЗАКЦИИ С ХЕШЕМ: ${targetHash}`);
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .or(`description.ilike.%${targetHash}%,metadata->>tx_hash.eq.${targetHash}`)
    .order('created_at', { ascending: false });
    
  if (txError) {
    console.error('❌ Ошибка поиска транзакций:', txError.message);
    return;
  }
  
  console.log(`📊 Найдено транзакций: ${transactions?.length || 0}`);
  
  if (transactions && transactions.length > 0) {
    transactions.forEach((tx, index) => {
      console.log(`\n📝 ТРАНЗАКЦИЯ #${index + 1}:`);
      console.log(`   ID: ${tx.id}`);
      console.log(`   User ID: ${tx.user_id}`);
      console.log(`   Тип: ${tx.type} ❌ ПРОБЛЕМА ЗДЕСЬ!`);
      console.log(`   Валюта: ${tx.currency}`);
      console.log(`   Сумма TON: ${tx.amount_ton}`);
      console.log(`   Сумма UNI: ${tx.amount_uni}`);
      console.log(`   Описание: ${tx.description}`);
      console.log(`   Метаданные: ${JSON.stringify(tx.metadata, null, 2)}`);
      console.log(`   Создано: ${tx.created_at}`);
    });
  }
  
  // 2. Проверяем баланс User #25 (основной проблемный пользователь)
  console.log(`\n2️⃣ ПРОВЕРКА БАЛАНСА USER #25:`);
  const { data: user25, error: userError } = await supabase
    .from('users')
    .select('id, balance_ton, balance_uni')
    .eq('id', 25)
    .single();
    
  if (userError) {
    console.error('❌ Ошибка получения пользователя:', userError.message);
  } else {
    console.log(`💰 User #25 баланс TON: ${user25.balance_ton}`);
    console.log(`💰 User #25 баланс UNI: ${user25.balance_uni}`);
  }
  
  // 3. Проверяем все TON транзакции в системе
  console.log(`\n3️⃣ ВСЕ TON ТРАНЗАКЦИИ В СИСТЕМЕ:`);
  const { data: tonTxs, error: tonError } = await supabase
    .from('transactions')
    .select('*')
    .or('currency.eq.TON,amount_ton.gt.0')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (tonError) {
    console.error('❌ Ошибка поиска TON транзакций:', tonError.message);
  } else {
    console.log(`📊 Найдено TON транзакций: ${tonTxs?.length || 0}`);
    
    tonTxs?.forEach((tx, index) => {
      console.log(`\n📝 TON ТРАНЗАКЦИЯ #${index + 1}:`);
      console.log(`   ID: ${tx.id}, User: ${tx.user_id}`);
      console.log(`   Тип: ${tx.type} ${tx.type !== 'DEPOSIT' ? '❌ НЕКОРРЕКТНЫЙ ТИП!' : '✅'}`);
      console.log(`   Сумма: ${tx.amount_ton} TON`);
      console.log(`   Описание: ${tx.description?.substring(0, 50)}...`);
    });
  }
  
  // 4. Анализ типов транзакций в БД
  console.log(`\n4️⃣ АНАЛИЗ ТИПОВ ТРАНЗАКЦИЙ:`);
  const { data: typeStats, error: statsError } = await supabase
    .from('transactions')
    .select('type, currency, count(*)')
    .not('amount_ton', 'is', null)
    .gte('amount_ton', 0.001);
    
  console.log('\n📊 СТАТИСТИКА ТИПОВ ДЛЯ TON ТРАНЗАКЦИЙ:');
  console.log('   Ожидаемый тип: DEPOSIT');
  console.log('   Проблемный тип: UNI_FARMING или другие');
  
  // 5. Проверка enum типов в БД
  console.log(`\n5️⃣ ДОСТУПНЫЕ ТИПЫ ТРАНЗАКЦИЙ В БД:`);
  const { data: enumValues, error: enumError } = await supabase
    .rpc('get_enum_values', { enum_name: 'transaction_type' })
    .single();
    
  if (enumError) {
    console.log('   Не удалось получить enum значения');
  } else {
    console.log(`   Доступные типы: ${enumValues}`);
  }
  
  console.log('\n🎯 ВЫВОДЫ:');
  console.log('1. Проверить processTonDeposit() - передается ли type: "DEPOSIT"');
  console.log('2. Убедиться что в БД enum содержит "DEPOSIT" тип'); 
  console.log('3. Проверить frontend - отправляется ли корректный тип');
  console.log('4. Анализировать metadata для определения источника ошибки');
}

diagnoseTonDepositIssue().catch(console.error);