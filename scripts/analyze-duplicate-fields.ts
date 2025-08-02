import { supabase } from '../core/supabase.js';

interface DuplicateFieldAnalysis {
  field1: string;
  field2: string;
  usersWithDifferences: number;
  examples: Array<{
    userId: number;
    username: string;
    field1Value: any;
    field2Value: any;
  }>;
}

async function analyzeDuplicateFields() {
  console.log('🔍 АНАЛИЗ ДУБЛИРУЮЩИХСЯ ПОЛЕЙ ДЛЯ ПОЛЬЗОВАТЕЛЕЙ 191-303\n');
  console.log('=' .repeat(80));

  // Получаем данные пользователей
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .gte('id', 191)
    .lte('id', 303)
    .order('id');

  if (error || !users) {
    console.error('❌ Ошибка получения пользователей:', error);
    return;
  }

  console.log(`✅ Найдено пользователей: ${users.length}\n`);

  const analyses: DuplicateFieldAnalysis[] = [];

  // 1. Анализ balance_uni vs uni_farming_balance
  const balanceUniAnalysis = analyzeFieldPair(
    users,
    'balance_uni',
    'uni_farming_balance',
    'Баланс UNI'
  );
  analyses.push(balanceUniAnalysis);

  // 2. Анализ balance_ton vs ton_farming_balance
  const balanceTonAnalysis = analyzeFieldPair(
    users,
    'balance_ton',
    'ton_farming_balance',
    'Баланс TON'
  );
  analyses.push(balanceTonAnalysis);

  // 3. Анализ uni_deposit_amount vs uni_farming_deposit
  const depositAnalysis = analyzeFieldPair(
    users,
    'uni_deposit_amount',
    'uni_farming_deposit',
    'Депозит UNI'
  );
  analyses.push(depositAnalysis);

  // 4. Анализ ton_boost_package vs ton_boost_package_id
  const boostPackageAnalysis = analyzeFieldPair(
    users,
    'ton_boost_package',
    'ton_boost_package_id',
    'TON Boost пакет'
  );
  analyses.push(boostPackageAnalysis);

  // 5. Анализ ton_farming_rate vs ton_boost_rate
  const rateAnalysis = analyzeFieldPair(
    users,
    'ton_farming_rate',
    'ton_boost_rate',
    'Ставка TON'
  );
  analyses.push(rateAnalysis);

  // Выводим результаты
  console.log('\n📊 РЕЗУЛЬТАТЫ АНАЛИЗА:');
  console.log('=' .repeat(80));

  for (const analysis of analyses) {
    console.log(`\n📌 ${analysis.field1} vs ${analysis.field2}`);
    console.log(`   Пользователей с расхождениями: ${analysis.usersWithDifferences}`);
    
    if (analysis.examples.length > 0) {
      console.log('   Примеры расхождений:');
      for (const example of analysis.examples.slice(0, 3)) {
        console.log(`   - User ${example.userId} (${example.username}):`);
        console.log(`     ${analysis.field1}: ${example.field1Value}`);
        console.log(`     ${analysis.field2}: ${example.field2Value}`);
      }
    } else {
      console.log('   ✅ Значения идентичны у всех пользователей');
    }
  }

  // Проверяем таблицу userBalances
  console.log('\n\n📋 АНАЛИЗ ТАБЛИЦЫ userBalances:');
  console.log('=' .repeat(80));
  
  const { data: userBalances, error: balError } = await supabase
    .from('user_balances')
    .select('*')
    .gte('user_id', 191)
    .lte('user_id', 303);

  if (balError) {
    console.log('⚠️ Таблица userBalances недоступна или не существует');
  } else {
    console.log(`Записей в userBalances: ${userBalances?.length || 0}`);
    
    if (userBalances && userBalances.length > 0) {
      // Сравниваем с данными в users
      let mismatches = 0;
      for (const bal of userBalances) {
        const user = users.find(u => u.id === bal.user_id);
        if (user) {
          if (parseFloat(user.balance_uni) !== parseFloat(bal.balance_uni) ||
              parseFloat(user.balance_ton) !== parseFloat(bal.balance_ton)) {
            mismatches++;
            console.log(`⚠️ Расхождение для user ${bal.user_id}:`);
            console.log(`   users.balance_uni: ${user.balance_uni}, userBalances.balance_uni: ${bal.balance_uni}`);
            console.log(`   users.balance_ton: ${user.balance_ton}, userBalances.balance_ton: ${bal.balance_ton}`);
          }
        }
      }
      
      if (mismatches === 0) {
        console.log('✅ Данные в userBalances синхронизированы с users');
      } else {
        console.log(`❌ Найдено расхождений: ${mismatches}`);
      }
    }
  }

  // Проверяем старые таблицы фарминга
  console.log('\n\n📋 АНАЛИЗ СТАРЫХ ТАБЛИЦ ФАРМИНГА:');
  console.log('=' .repeat(80));

  // uni_farming_data
  const { data: uniFarmingData, error: uniError } = await supabase
    .from('uni_farming_data')
    .select('*')
    .gte('user_id', 191)
    .lte('user_id', 303);

  if (uniError) {
    console.log('⚠️ Таблица uni_farming_data недоступна');
  } else {
    console.log(`Записей в uni_farming_data: ${uniFarmingData?.length || 0}`);
  }

  // ton_farming_data
  const { data: tonFarmingData, error: tonError } = await supabase
    .from('ton_farming_data')
    .select('*')
    .in('user_id', users.map(u => u.id.toString()));

  if (tonError) {
    console.log('⚠️ Таблица ton_farming_data недоступна');
  } else {
    console.log(`Записей в ton_farming_data: ${tonFarmingData?.length || 0}`);
  }
}

function analyzeFieldPair(
  users: any[],
  field1: string,
  field2: string,
  description: string
): DuplicateFieldAnalysis {
  const differences: any[] = [];

  for (const user of users) {
    const val1 = user[field1];
    const val2 = user[field2];

    // Сравниваем значения
    if (val1 !== val2) {
      // Для числовых полей также проверяем парсинг
      if (typeof val1 === 'string' && typeof val2 === 'string') {
        if (parseFloat(val1) !== parseFloat(val2)) {
          differences.push({
            userId: user.id,
            username: user.username || `User ${user.id}`,
            field1Value: val1,
            field2Value: val2
          });
        }
      } else {
        differences.push({
          userId: user.id,
          username: user.username || `User ${user.id}`,
          field1Value: val1,
          field2Value: val2
        });
      }
    }
  }

  return {
    field1,
    field2,
    usersWithDifferences: differences.length,
    examples: differences
  };
}

// Запускаем анализ
analyzeDuplicateFields().catch(console.error);