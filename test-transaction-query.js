/**
 * Тестирование различных запросов к транзакциям для поиска проблемы
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function testTransactionQueries() {
  console.log('🔍 Тестируем различные запросы к транзакциям пользователя ID=48...\n');
  
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  const userId = 48;
  
  try {
    // 1. Мой тестовый запрос (который работает)
    console.log('1️⃣ Тестовый запрос (type = "REFERRAL_REWARD"):');
    const { data: testTransactions, error: testError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'REFERRAL_REWARD');
      
    console.log(`  Результат: ${testTransactions?.length || 0} транзакций, ошибка: ${testError?.message || 'нет'}\n`);
    
    // 2. Оригинальный запрос (который может не работать)
    console.log('2️⃣ Оригинальный запрос (description ilike "%referral%"):');
    const { data: originalTransactions, error: originalError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .ilike('description', '%referral%')
      .order('created_at', { ascending: false });
      
    console.log(`  Результат: ${originalTransactions?.length || 0} транзакций, ошибка: ${originalError?.message || 'нет'}`);
    
    if (originalError) {
      console.log('  ❌ НАЙДЕНА ОШИБКА В ОРИГИНАЛЬНОМ ЗАПРОСЕ!');
      console.log('  Error details:', originalError);
      console.log('  Error message:', originalError.message);
      console.log('  Error code:', originalError.code);
    }
    
    // 3. Проверяем какие типы транзакций вообще есть
    console.log('\n3️⃣ Все типы транзакций пользователя:');
    const { data: allTransactions, error: allError } = await supabase
      .from('transactions')
      .select('type, description')
      .eq('user_id', userId)
      .limit(10);
      
    if (allError) {
      console.log('  Ошибка получения всех транзакций:', allError.message);
    } else {
      const types = [...new Set(allTransactions.map(t => t.type))];
      console.log('  Доступные типы транзакций:', types);
      
      const descriptions = allTransactions.filter(t => t.description).map(t => t.description).slice(0, 5);
      console.log('  Примеры описаний:', descriptions);
    }
    
    // 4. Проверяем запрос к пользователям
    console.log('\n4️⃣ Запрос всех пользователей (как в оригинальном методе):');
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('id, username, referred_by, ref_code, telegram_id')
      .order('id');
      
    console.log(`  Результат: ${allUsers?.length || 0} пользователей, ошибка: ${usersError?.message || 'нет'}`);
    
    if (usersError) {
      console.log('  ❌ НАЙДЕНА ОШИБКА В ЗАПРОСЕ ПОЛЬЗОВАТЕЛЕЙ!');
      console.log('  Error details:', usersError);
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

testTransactionQueries();