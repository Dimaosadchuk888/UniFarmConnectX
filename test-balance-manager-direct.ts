/**
 * ТЕСТ BALANCEMANAGER НАПРЯМУЮ
 * Проверяем работает ли BalanceManager для пользователей 255 и 251
 */

import { supabase } from './core/supabase.js';

async function testBalanceManagerDirect() {
  console.log('🔍 ТЕСТ BALANCEMANAGER ДЛЯ ПОЛЬЗОВАТЕЛЕЙ 255 И 251');
  
  try {
    // 1. Проверяем записи пользователей в таблице users
    console.log('\n👥 ПРОВЕРКА ЗАПИСЕЙ ПОЛЬЗОВАТЕЛЕЙ:');
    
    const { data: user255, error: error255 } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', 255)
      .single();
      
    const { data: user251, error: error251 } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', 251)
      .single();
    
    if (error255) {
      console.log('❌ User 255 не найден в таблице users:', error255.message);
    } else {
      console.log('✅ User 255 найден:');
      console.log(`   ID: ${user255.id}`);
      console.log(`   Telegram ID: ${user255.telegram_id}`);
      console.log(`   UNI Balance: ${user255.balance_uni}`);
      console.log(`   TON Balance: ${user255.balance_ton}`);
      console.log(`   Created: ${user255.created_at}`);
      console.log(`   Updated: ${user255.updated_at || 'NULL'}`);
    }
    
    if (error251) {
      console.log('❌ User 251 не найден в таблице users:', error251.message);
    } else {
      console.log('✅ User 251 найден:');
      console.log(`   ID: ${user251.id}`);
      console.log(`   Telegram ID: ${user251.telegram_id}`);
      console.log(`   UNI Balance: ${user251.balance_uni}`);
      console.log(`   TON Balance: ${user251.balance_ton}`);
      console.log(`   Created: ${user251.created_at}`);
      console.log(`   Updated: ${user251.updated_at || 'NULL'}`);
    }
    
    // 2. Проверяем есть ли блокировки в BalanceManager
    console.log('\n🔍 СИМУЛЯЦИЯ ВЫЗОВА BALANCEMANAGER:');
    
    // Попробуем загрузить BalanceManager
    try {
      const { BalanceManager } = await import('./core/BalanceManager.js');
      const balanceManager = BalanceManager.getInstance();
      console.log('✅ BalanceManager успешно загружен');
      
      // Тестируем getUserBalance для обоих пользователей
      if (user255) {
        console.log(`\n🧪 Тест getUserBalance для User 255 (ID: ${user255.id}):`);
        try {
          const result255 = await balanceManager.getUserBalance(user255.id);
          console.log('✅ getUserBalance успешно:', result255);
        } catch (error) {
          console.log('❌ getUserBalance провалился:', error.message);
        }
      }
      
      if (user251) {
        console.log(`\n🧪 Тест getUserBalance для User 251 (ID: ${user251.id}):`);
        try {
          const result251 = await balanceManager.getUserBalance(user251.id);
          console.log('✅ getUserBalance успешно:', result251);
        } catch (error) {
          console.log('❌ getUserBalance провалился:', error.message);
        }
      }
      
    } catch (error) {
      console.log('❌ Ошибка загрузки BalanceManager:', error.message);
    }
    
    // 3. Проверяем корреляцию между ID пользователей и их транзакциями
    console.log('\n🔍 КОРРЕЛЯЦИЯ USER_ID В ТРАНЗАКЦИЯХ:');
    
    const { data: transactions255 } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount, currency, created_at')
      .eq('user_id', 255)
      .limit(3);
      
    const { data: transactions251 } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount, currency, created_at')
      .eq('user_id', 251)
      .limit(3);
    
    if (transactions255 && transactions255.length > 0) {
      console.log(`✅ User 255 имеет ${transactions255.length} транзакций с user_id = 255`);
      console.log('   Первая транзакция:', transactions255[0]);
    } else {
      console.log('❌ User 255 не имеет транзакций с user_id = 255');
    }
    
    if (transactions251 && transactions251.length > 0) {
      console.log(`✅ User 251 имеет ${transactions251.length} транзакций с user_id = 251`);
      console.log('   Первая транзакция:', transactions251[0]);
    } else {
      console.log('❌ User 251 не имеет транзакций с user_id = 251');
    }
    
    // 4. Проверяем правильность связи между таблицами
    console.log('\n🔍 ПРОВЕРКА СВЯЗИ USERS <-> TRANSACTIONS:');
    
    if (user255) {
      // Проверяем есть ли транзакции с user_id = internal ID пользователя
      const { data: txByInternalId255 } = await supabase
        .from('transactions')
        .select('count')
        .eq('user_id', user255.id)
        .single();
        
      console.log(`User 255: Транзакций по internal ID (${user255.id}): ${txByInternalId255?.count || 0}`);
      
      // Проверяем есть ли транзакции с user_id = telegram_id
      const { data: txByTelegramId255 } = await supabase
        .from('transactions')
        .select('count')
        .eq('user_id', user255.telegram_id)
        .single();
        
      console.log(`User 255: Транзакций по telegram_id (${user255.telegram_id}): ${txByTelegramId255?.count || 0}`);
    }
    
    if (user251) {
      // Проверяем есть ли транзакции с user_id = internal ID пользователя
      const { data: txByInternalId251 } = await supabase
        .from('transactions')
        .select('count')
        .eq('user_id', user251.id)
        .single();
        
      console.log(`User 251: Транзакций по internal ID (${user251.id}): ${txByInternalId251?.count || 0}`);
      
      // Проверяем есть ли транзакции с user_id = telegram_id
      const { data: txByTelegramId251 } = await supabase
        .from('transactions')
        .select('count')
        .eq('user_id', user251.telegram_id)
        .single();
        
      console.log(`User 251: Транзакций по telegram_id (${user251.telegram_id}): ${txByTelegramId251?.count || 0}`);
    }
    
    // 5. Поиск любых блокировок или проблем
    console.log('\n🚨 ДИАГНОСТИКА ПРОБЛЕМ:');
    
    const problems = [];
    
    if (user255 && user255.balance_uni === 0 && user255.balance_ton === 0) {
      problems.push('User 255: Балансы равны 0 несмотря на наличие транзакций');
    }
    
    if (user251 && user251.balance_uni === 0 && user251.balance_ton === 0) {
      problems.push('User 251: Балансы равны 0 несмотря на наличие транзакций');
    }
    
    if (user255 && !user255.updated_at) {
      problems.push('User 255: Поле updated_at = NULL - BalanceManager никогда не обновлял запись');
    }
    
    if (user251 && !user251.updated_at) {
      problems.push('User 251: Поле updated_at = NULL - BalanceManager никогда не обновлял запись');
    }
    
    if (problems.length > 0) {
      problems.forEach((problem, index) => {
        console.log(`${index + 1}. ${problem}`);
      });
    } else {
      console.log('✅ Критических проблем в структуре данных не обнаружено');
    }
    
    console.log('\n✅ Тестирование завершено');
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  }
}

testBalanceManagerDirect();