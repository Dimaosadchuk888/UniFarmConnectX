import { supabase } from './core/supabase.js';

async function verifyBoostPurchaseType() {
  console.log('✅ ПРОВЕРКА ДОБАВЛЕНИЯ ТИПА BOOST_PURCHASE\n');
  console.log('='*60 + '\n');
  
  // 1. Проверяем, можем ли создать транзакцию с типом BOOST_PURCHASE
  console.log('1️⃣ ТЕСТ СОЗДАНИЯ ТРАНЗАКЦИИ С ТИПОМ BOOST_PURCHASE:\n');
  
  try {
    // Создаем тестовую транзакцию
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: 74, // используем существующего пользователя
        type: 'BOOST_PURCHASE',
        amount: '0.001',
        currency: 'TON',
        status: 'completed',
        description: 'Test BOOST_PURCHASE transaction',
        metadata: {
          test: true,
          created_at: new Date().toISOString()
        }
      })
      .select()
      .single();
      
    if (error) {
      if (error.message.includes('invalid input value for enum')) {
        console.log('❌ BOOST_PURCHASE НЕ ДОБАВЛЕН в enum');
        console.log('Ошибка:', error.message);
      } else {
        console.log('❓ Неожиданная ошибка:', error.message);
      }
    } else {
      console.log('✅ BOOST_PURCHASE УСПЕШНО ДОБАВЛЕН!');
      console.log('Тестовая транзакция создана:', {
        id: data.id,
        type: data.type,
        amount: data.amount
      });
      
      // Удаляем тестовую транзакцию
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', data.id);
        
      if (!deleteError) {
        console.log('🗑️ Тестовая транзакция удалена');
      }
    }
  } catch (err) {
    console.log('❌ Критическая ошибка:', err);
  }
  
  // 2. Проверяем все существующие типы транзакций
  console.log('\n' + '='*60);
  console.log('\n2️⃣ ВСЕ ТИПЫ ТРАНЗАКЦИЙ В БД:\n');
  
  const { data: allTypes } = await supabase
    .from('transactions')
    .select('type')
    .limit(10000);
    
  const uniqueTypes = new Set<string>();
  allTypes?.forEach(t => {
    if (t.type) uniqueTypes.add(t.type);
  });
  
  const sortedTypes = Array.from(uniqueTypes).sort();
  console.log('Найдено уникальных типов:', sortedTypes.length);
  sortedTypes.forEach(type => {
    console.log(`- ${type}`);
  });
  
  // 3. Статистика по типам
  console.log('\n' + '='*60);
  console.log('\n3️⃣ СТАТИСТИКА ТРАНЗАКЦИЙ:\n');
  
  const typesToCheck = [
    'FARMING_REWARD',
    'FARMING_DEPOSIT',
    'REFERRAL_REWARD',
    'MISSION_REWARD',
    'DAILY_BONUS',
    'BOOST_PURCHASE'
  ];
  
  for (const type of typesToCheck) {
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('type', type);
      
    const exists = uniqueTypes.has(type);
    console.log(`${type}: ${count || 0} транзакций ${exists ? '✅' : '❌'}`);
  }
  
  // 4. Проверяем metadata с original_type BOOST_PURCHASE
  console.log('\n' + '='*60);
  console.log('\n4️⃣ ТРАНЗАКЦИИ С metadata.original_type = BOOST_PURCHASE:\n');
  
  const { data: boostTransactions, count: boostCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact' })
    .eq('metadata->>original_type', 'BOOST_PURCHASE')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (boostCount && boostCount > 0) {
    console.log(`Найдено ${boostCount} транзакций с original_type: BOOST_PURCHASE`);
    console.log('Последние транзакции:');
    boostTransactions?.forEach(tx => {
      console.log(`- ID: ${tx.id}, type: ${tx.type}, amount: ${tx.amount} ${tx.currency}`);
      console.log(`  Описание: ${tx.description}`);
    });
  } else {
    console.log('Нет транзакций с metadata.original_type = BOOST_PURCHASE');
  }
  
  // 5. Итоговый статус
  console.log('\n' + '='*60);
  console.log('\n5️⃣ ИТОГОВЫЙ СТАТУС:\n');
  
  const boostPurchaseExists = uniqueTypes.has('BOOST_PURCHASE');
  
  if (boostPurchaseExists) {
    console.log('✅ ТИП BOOST_PURCHASE УСПЕШНО ДОБАВЛЕН В БД!');
    console.log('\n🎯 Что изменится:');
    console.log('- Новые покупки TON Boost будут использовать тип BOOST_PURCHASE');
    console.log('- Старые транзакции останутся с типом FARMING_REWARD');
    console.log('- Улучшится прозрачность финансовых операций');
    console.log('- Упростится анализ и отчетность');
  } else {
    console.log('❌ ТИП BOOST_PURCHASE ЕЩЁ НЕ ДОБАВЛЕН');
    console.log('\nВозможные причины:');
    console.log('- SQL скрипт не выполнен');
    console.log('- Ошибка при выполнении ALTER TYPE');
    console.log('- Необходимо обновить страницу Supabase');
  }
}

verifyBoostPurchaseType();