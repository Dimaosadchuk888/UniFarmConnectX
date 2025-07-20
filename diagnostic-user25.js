/**
 * ДИАГНОСТИКА USER #25 В PRODUCTION SUPABASE
 * Только чтение данных, без изменений
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL или SUPABASE_KEY не найдены');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseUser25() {
  console.log('🔍 ДИАГНОСТИКА USER #25 В PRODUCTION SUPABASE');
  console.log('================================================');
  
  try {
    // 1. Поиск User #25
    console.log('\n1. Проверка User #25...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, telegram_id, username, balance_ton, ref_code, created_at')
      .or('id.eq.25,telegram_id.eq.425855744')
      .maybeSingle();
    
    if (userError) {
      console.error('❌ Ошибка поиска пользователя:', userError.message);
      return;
    }
    
    if (!user) {
      console.log('❌ User #25 НЕ НАЙДЕН в Production Supabase');
      console.log('   - Проверили id=25 и telegram_id=425855744');
      console.log('   - Возможно данные в другой базе/окружении');
      return;
    }
    
    console.log('✅ User найден:', {
      id: user.id,
      telegram_id: user.telegram_id,
      username: user.username,
      balance_ton: user.balance_ton,
      ref_code: user.ref_code,
      created_at: user.created_at
    });
    
    // 2. Поиск транзакций для User #25
    console.log('\n2. Проверка транзакций...');
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('id, type, amount, currency, status, description, created_at')
      .eq('user_id', user.id)
      .or('description.ilike.%00a1ba3c2614f4d65cc346805feea96042cb111351b3977c68f3379ddb90e1b4%,description.ilike.%TON%')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (txError) {
      console.error('❌ Ошибка поиска транзакций:', txError.message);
    } else {
      console.log(`📊 Найдено ${transactions?.length || 0} транзакций:`);
      transactions?.forEach(tx => {
        console.log(`   - ID: ${tx.id}, Type: ${tx.type}, Amount: ${tx.amount} ${tx.currency}`);
        console.log(`     Description: ${tx.description}`);
        console.log(`     Created: ${tx.created_at}`);
      });
      
      // Поиск конкретной транзакции с хешем
      const targetTx = transactions?.find(tx => 
        tx.description?.includes('00a1ba3c2614f4d65cc346805feea96042cb111351b3977c68f3379ddb90e1b4')
      );
      
      if (targetTx) {
        console.log('✅ Транзакция с целевым hash НАЙДЕНА:', targetTx.id);
      } else {
        console.log('❌ Транзакция с hash 00a1ba3c... НЕ НАЙДЕНА');
      }
    }
    
    // 3. Проверка последних транзакций депозита
    console.log('\n3. Поиск TON депозитов...');
    const { data: deposits, error: depError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .eq('currency', 'TON')
      .eq('type', 'DEPOSIT')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (depError) {
      console.error('❌ Ошибка поиска депозитов:', depError.message);
    } else {
      console.log(`💰 Найдено ${deposits?.length || 0} TON депозитов:`);
      deposits?.forEach(dep => {
        console.log(`   - Amount: ${dep.amount} TON, Status: ${dep.status}`);
        console.log(`     Created: ${dep.created_at}`);
        console.log(`     Description: ${dep.description}`);
      });
    }
    
    // 4. Проверка общей статистики пользователя
    console.log('\n4. Статистика пользователя...');
    const { count: totalTx } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    
    console.log(`📈 Всего транзакций у пользователя: ${totalTx}`);
    console.log(`💵 Текущий баланс TON: ${user.balance_ton}`);
    
  } catch (error) {
    console.error('❌ Критическая ошибка диагностики:', error.message);
  }
}

// Запуск диагностики
diagnoseUser25();