import { supabase } from './core/supabase.js';

async function checkEnumValues() {
  console.log('🔍 ПРОВЕРКА ЗНАЧЕНИЙ ENUM transaction_type В БД\n');
  console.log('='*60 + '\n');
  
  // 1. Проверяем какие типы реально используются в таблице transactions
  console.log('1️⃣ ПРОВЕРКА ИСПОЛЬЗУЕМЫХ ТИПОВ:\n');
  
  // Попробуем вставить тестовые записи с разными типами
  const typesToCheck = [
    'FARMING_DEPOSIT',
    'REFERRAL_REWARD', 
    'MISSION_REWARD',
    'DAILY_BONUS',
    'BOOST_PURCHASE'
  ];
  
  for (const type of typesToCheck) {
    try {
      // Пробуем создать транзакцию с этим типом
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          user_id: 9999, // тестовый пользователь
          type: type,
          amount: '0.001',
          currency: 'UNI',
          status: 'completed',
          description: `Test transaction for type ${type}`
        })
        .select()
        .single();
        
      if (error) {
        if (error.message.includes('invalid input value for enum')) {
          console.log(`❌ ${type} - НЕТ в enum (${error.message})`);
        } else {
          console.log(`❓ ${type} - Ошибка: ${error.message}`);
        }
      } else {
        console.log(`✅ ${type} - ЕСТЬ в enum (транзакция создана)`);
        // Удаляем тестовую транзакцию
        if (data?.id) {
          await supabase
            .from('transactions')
            .delete()
            .eq('id', data.id);
        }
      }
    } catch (err) {
      console.log(`❓ ${type} - Неизвестная ошибка:`, err);
    }
  }
  
  // 2. Проверяем существующие транзакции с этими типами
  console.log('\n' + '='*60);
  console.log('\n2️⃣ ПОИСК СУЩЕСТВУЮЩИХ ТРАНЗАКЦИЙ:\n');
  
  for (const type of typesToCheck) {
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('type', type);
      
    if (count && count > 0) {
      console.log(`📊 ${type}: ${count} транзакций в БД`);
    } else {
      console.log(`📭 ${type}: 0 транзакций`);
    }
  }
  
  // 3. Проверяем metadata с original_type для обходных решений
  console.log('\n' + '='*60);
  console.log('\n3️⃣ ТРАНЗАКЦИИ С ОБХОДНЫМИ РЕШЕНИЯМИ:\n');
  
  for (const type of typesToCheck) {
    const { data, count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('metadata->>original_type', type)
      .limit(5);
      
    if (count && count > 0) {
      console.log(`\n🔄 ${type} через metadata: ${count} транзакций`);
      data?.slice(0, 2).forEach(tx => {
        console.log(`  - ID: ${tx.id}, type: ${tx.type}, описание: ${tx.description?.substring(0, 50)}...`);
      });
    }
  }
  
  // 4. Итоговые рекомендации
  console.log('\n' + '='*60);
  console.log('\n4️⃣ ИТОГОВЫЕ РЕКОМЕНДАЦИИ:\n');
  
  console.log('SQL команды для добавления отсутствующих типов:');
  console.log('```sql');
  typesToCheck.forEach(type => {
    console.log(`ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS '${type}';`);
  });
  console.log('```');
  
  console.log('\n⚠️ ВАЖНО:');
  console.log('- Команды ADD VALUE IF NOT EXISTS безопасны');
  console.log('- Они добавят только отсутствующие значения');
  console.log('- Существующие значения не будут затронуты');
  console.log('- После добавления система автоматически начнет их использовать');
}

checkEnumValues();