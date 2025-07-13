import { supabase } from './core/supabase.js';

async function checkTransactionTypesInDB() {
  console.log('🔍 ПРОВЕРКА ТИПОВ ТРАНЗАКЦИЙ В БАЗЕ ДАННЫХ\n');
  console.log('='*60 + '\n');
  
  // 1. Получаем уникальные типы транзакций из БД
  console.log('1️⃣ СУЩЕСТВУЮЩИЕ ТИПЫ В БД:\n');
  
  const { data: types, error } = await supabase
    .from('transactions')
    .select('type')
    .limit(1000);
    
  if (error) {
    console.log('❌ Ошибка:', error);
    return;
  }
  
  // Собираем уникальные типы
  const uniqueTypes = new Set<string>();
  types?.forEach(t => {
    if (t.type) uniqueTypes.add(t.type);
  });
  
  console.log('Найдено уникальных типов:', uniqueTypes.size);
  Array.from(uniqueTypes).sort().forEach(type => {
    console.log(`- ${type}`);
  });
  
  // 2. Проверяем какие типы используются в коде
  console.log('\n' + '='*60);
  console.log('\n2️⃣ ТИПЫ ОПРЕДЕЛЕННЫЕ В КОДЕ:\n');
  
  const codeTypes = [
    'FARMING_REWARD',
    'FARMING_DEPOSIT', 
    'REFERRAL_REWARD',
    'MISSION_REWARD',
    'DAILY_BONUS',
    'TON_BOOST_INCOME',
    'BOOST_PURCHASE',
    'AIRDROP_REWARD'
  ];
  
  console.log('Основные типы (TransactionsTransactionType):');
  codeTypes.slice(0, 5).forEach(type => {
    const exists = uniqueTypes.has(type);
    console.log(`- ${type} ${exists ? '✅ (есть в БД)' : '❌ (нет в БД)'}`);
  });
  
  console.log('\nРасширенные типы (ExtendedTransactionType):');
  codeTypes.slice(5).forEach(type => {
    const exists = uniqueTypes.has(type);
    console.log(`- ${type} ${exists ? '✅ (есть в БД)' : '❌ (нет в БД)'}`);
  });
  
  // 3. Статистика использования типов
  console.log('\n' + '='*60);
  console.log('\n3️⃣ СТАТИСТИКА ИСПОЛЬЗОВАНИЯ:\n');
  
  for (const type of uniqueTypes) {
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('type', type);
      
    console.log(`${type}: ${count || 0} транзакций`);
  }
  
  // 4. Проверка metadata с original_type
  console.log('\n' + '='*60);
  console.log('\n4️⃣ ТРАНЗАКЦИИ С METADATA original_type:\n');
  
  const { data: metadataTransactions } = await supabase
    .from('transactions')
    .select('type, metadata')
    .not('metadata', 'is', null)
    .limit(100);
    
  const originalTypes = new Set<string>();
  metadataTransactions?.forEach(tx => {
    if (tx.metadata?.original_type) {
      originalTypes.add(tx.metadata.original_type);
    }
  });
  
  if (originalTypes.size > 0) {
    console.log('Найдены original_type в metadata:');
    Array.from(originalTypes).forEach(type => {
      console.log(`- ${type}`);
    });
  } else {
    console.log('❌ Нет транзакций с original_type в metadata');
  }
  
  // 5. Рекомендации
  console.log('\n' + '='*60);
  console.log('\n5️⃣ РЕКОМЕНДАЦИИ:\n');
  
  const missingTypes = Array.from(codeTypes.slice(0, 5)).filter(type => !uniqueTypes.has(type));
  
  if (missingTypes.length > 0) {
    console.log('⚠️ Необходимо добавить в enum БД следующие типы:');
    missingTypes.forEach(type => console.log(`- ${type}`));
  } else {
    console.log('✅ Все основные типы транзакций присутствуют в БД!');
  }
  
  console.log('\n💡 БЕЗОПАСНАЯ СТРАТЕГИЯ:');
  console.log('1. НЕ удалять поля из таблицы users - код может их использовать');
  console.log('2. Добавить недостающие типы в enum через ALTER TYPE');
  console.log('3. Постепенно мигрировать данные в новые таблицы');
  console.log('4. Использовать fallback механизмы (как в UniFarmingRepository)');
}

checkTransactionTypesInDB();