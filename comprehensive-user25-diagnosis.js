/**
 * ПОЛНАЯ ДИАГНОСТИКА USER #25 TON ДЕПОЗИТА
 * Проверка всей цепочки: API вызовы → DB записи → Frontend отображение
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function comprehensiveDiagnosis() {
  console.log('🎯 ПОЛНАЯ ДИАГНОСТИКА TON ДЕПОЗИТА USER #25');
  console.log('Hash: 00a1ba3c2614f4d65cc346805feea96042cb111351b3977c68f3379ddb90e1b4');
  console.log('Expected Amount: 0.1 TON');
  console.log('========================================================');
  
  try {
    // 1. ПРОВЕРКА ПОЛЬЗОВАТЕЛЯ
    console.log('\n1. 👤 ПРОВЕРКА ПОЛЬЗОВАТЕЛЯ');
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, telegram_id, username, balance_ton, ref_code, created_at, updated_at')
      .or('id.eq.25,telegram_id.eq.425855744');
    
    if (userError || !users || users.length === 0) {
      console.log('❌ User #25 не найден');
      return;
    }
    
    const user = users[0]; // Берем первого найденного
    console.log('✅ User найден:', {
      id: user.id,
      telegram_id: user.telegram_id,
      username: user.username,
      balance_ton: user.balance_ton,
      ref_code: user.ref_code
    });
    
    // 2. ПОИСК ПО ХЕШУ ТРАНЗАКЦИИ
    console.log('\n2. 🔍 ПОИСК ТРАНЗАКЦИИ ПО ХЕШУ');
    const targetHash = '00a1ba3c2614f4d65cc346805feea96042cb111351b3977c68f3379ddb90e1b4';
    
    const { data: hashTx, error: hashError } = await supabase
      .from('transactions')
      .select('*')
      .ilike('description', `%${targetHash}%`);
    
    console.log(`🔎 Поиск по хешу "${targetHash.substring(0, 20)}..."`);
    if (hashError) {
      console.log('❌ Ошибка поиска по хешу:', hashError.message);
    } else {
      console.log(`📊 Найдено ${hashTx?.length || 0} транзакций с этим хешем`);
      hashTx?.forEach(tx => {
        console.log(`   - ID: ${tx.id}, User: ${tx.user_id}, Amount: ${tx.amount} ${tx.currency}`);
        console.log(`     Created: ${tx.created_at}`);
      });
    }
    
    // 3. ПРОВЕРКА ВСЕХ TON ДЕПОЗИТОВ USER #25
    console.log('\n3. 💰 ПРОВЕРКА ВСЕХ TON ОПЕРАЦИЙ USER #25');
    const { data: tonTxs, error: tonError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .eq('currency', 'TON')
      .order('created_at', { ascending: false });
    
    if (tonError) {
      console.log('❌ Ошибка поиска TON транзакций:', tonError.message);
    } else {
      console.log(`📈 Всего TON операций у User #25: ${tonTxs?.length || 0}`);
      tonTxs?.forEach((tx, index) => {
        console.log(`   ${index + 1}. ID: ${tx.id} | ${tx.type} | ${tx.amount} TON | ${tx.status}`);
        console.log(`      Created: ${tx.created_at}`);
        console.log(`      Description: ${tx.description}`);
        console.log('      ---');
      });
      
      // Поиск депозитов 0.1 TON
      const depositMatches = tonTxs?.filter(tx => 
        tx.type === 'DEPOSIT' && (tx.amount === '0.1' || tx.amount === 0.1)
      );
      console.log(`🎯 Депозиты по 0.1 TON: ${depositMatches?.length || 0}`);
    }
    
    // 4. ПРОВЕРКА СХЕМЫ ТРАНЗАКЦИЙ
    console.log('\n4. 🏗️ ПРОВЕРКА СХЕМЫ TRANSACTIONS');
    const { data: schemaInfo, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'transactions')
      .limit(15);
      
    if (!schemaError && schemaInfo) {
      console.log('📋 Поля таблицы transactions:');
      schemaInfo.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }
    
    // 5. ПРОВЕРКА ПОСЛЕДНИХ ОБНОВЛЕНИЙ БАЛАНСА
    console.log('\n5. ⚡ ПРОВЕРКА ОБНОВЛЕНИЙ БАЛАНСА USER #25');
    const { data: recentTxs, error: recentError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', '2025-07-19T00:00:00Z') // Последние дни
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (!recentError && recentTxs) {
      console.log(`📅 Транзакции с 19 июля: ${recentTxs.length}`);
      recentTxs.forEach(tx => {
        console.log(`   - ${tx.created_at}: ${tx.type} ${tx.amount} ${tx.currency}`);
      });
    }
    
    // 6. ПРОВЕРКА ВОЗМОЖНЫХ ОШИБОК ТИПОВ
    console.log('\n6. 🔧 ПРОВЕРКА ТИПОВ ТРАНЗАКЦИЙ');
    const { data: typeCheck, error: typeError } = await supabase
      .from('transactions')
      .select('type')
      .eq('user_id', user.id)
      .limit(1);
      
    if (!typeError) {
      console.log('✅ Подключение к transactions работает');
    }
    
    // Получаем enum значения для type
    const { data: enumValues, error: enumError } = await supabase
      .rpc('get_enum_values', { enum_name: 'transaction_type' })
      .single();
      
    if (!enumError && enumValues) {
      console.log('📝 Доступные типы транзакций:', enumValues);
    } else {
      console.log('⚠️ Не удалось получить enum типы');
    }
    
    // 7. ИТОГОВАЯ ДИАГНОСТИКА
    console.log('\n7. 📊 ИТОГОВЫЕ РЕЗУЛЬТАТЫ');
    console.log('===========================');
    console.log(`environment: production`);
    console.log(`user_id: ${user.id}`);
    console.log(`telegram_id: ${user.telegram_id}`);
    console.log(`username: ${user.username}`);
    console.log(`current_ton_balance: ${user.balance_ton}`);
    console.log(`tx_hash_found: ${(hashTx?.length || 0) > 0 ? 'true' : 'false'}`);
    console.log(`ton_transactions_total: ${tonTxs?.length || 0}`);
    console.log(`recent_transactions: ${recentTxs?.length || 0}`);
    console.log(`balance_updated: ${user.balance_ton > 0 ? 'true' : 'false'}`);
    
    if ((hashTx?.length || 0) === 0 && user.balance_ton === 0) {
      console.log(`suspected_cause: Frontend НЕ ВЫЗВАЛ backend API или backend не обработал депозит`);
      console.log(`next_steps_suggestion: Проверить логи сервера и frontend console на момент депозита`);
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка диагностики:', error.message);
  }
}

comprehensiveDiagnosis();