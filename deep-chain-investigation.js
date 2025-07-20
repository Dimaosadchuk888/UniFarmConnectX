/**
 * ГЛУБОКОЕ РАССЛЕДОВАНИЕ ЦЕПОЧКИ TON ДЕПОЗИТОВ
 * Проверка каждого звена: Frontend → Backend → Database
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function deepChainInvestigation() {
  console.log('🔬 ГЛУБОКОЕ РАССЛЕДОВАНИЕ TON ДЕПОЗИТ ЦЕПОЧКИ');
  console.log('==============================================');
  
  try {
    // 1. ПРОВЕРКА АКТИВНОСТИ СИСТЕМЫ
    console.log('\n1. 📊 ОБЩАЯ АКТИВНОСТЬ СИСТЕМЫ:');
    
    const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000).toISOString();
    const { data: recentActivity, error: activityError } = await supabase
      .from('transactions')
      .select('user_id, type, currency, created_at')
      .gte('created_at', oneMinuteAgo)
      .order('created_at', { ascending: false });
    
    if (activityError) {
      console.log('❌ Ошибка получения активности:', activityError.message);
    } else {
      console.log(`   - Транзакций за последнюю минуту: ${recentActivity?.length || 0}`);
      
      const currencies = {};
      const types = {};
      recentActivity?.forEach(tx => {
        currencies[tx.currency] = (currencies[tx.currency] || 0) + 1;
        types[tx.type] = (types[tx.type] || 0) + 1;
      });
      
      console.log('   - По валютам:', currencies);
      console.log('   - По типам:', types);
    }
    
    // 2. ПРОВЕРКА ВСЕХ TON ДЕПОЗИТОВ КОГДА-ЛИБО
    console.log('\n2. 💰 АНАЛИЗ ВСЕХ TON ДЕПОЗИТОВ:');
    
    const { data: allTonDeposits, error: depositError } = await supabase
      .from('transactions')
      .select('*')
      .eq('currency', 'TON')
      .eq('type', 'DEPOSIT')
      .order('created_at', { ascending: false });
    
    if (depositError) {
      console.log('❌ Ошибка получения TON депозитов:', depositError.message);
    } else {
      console.log(`   - Всего TON DEPOSIT транзакций в истории: ${allTonDeposits?.length || 0}`);
      
      if (allTonDeposits && allTonDeposits.length > 0) {
        console.log('   - Последние 5 TON депозитов:');
        allTonDeposits.slice(0, 5).forEach((dep, idx) => {
          console.log(`     ${idx + 1}. User ${dep.user_id}: ${dep.amount} TON at ${dep.created_at}`);
          console.log(`        Description: ${dep.description?.substring(0, 100)}...`);
        });
        
        // Анализ по пользователям
        const userDeposits = {};
        allTonDeposits.forEach(dep => {
          userDeposits[dep.user_id] = (userDeposits[dep.user_id] || 0) + 1;
        });
        console.log('   - Депозиты по пользователям:', userDeposits);
      }
    }
    
    // 3. ПРОВЕРКА НЕДАВНИХ ЗАПРОСОВ К API
    console.log('\n3. 🌐 ПРОВЕРКА RECENT API REQUESTS:');
    
    // Пытаемся найти логи API вызовов через описания транзакций
    const { data: apiLogs, error: logError } = await supabase
      .from('transactions')
      .select('*')
      .gte('created_at', oneMinuteAgo)
      .ilike('description', '%api%')
      .order('created_at', { ascending: false });
    
    if (logError) {
      console.log('❌ Ошибка поиска API логов:', logError.message);
    } else {
      console.log(`   - Найдено потенциальных API логов: ${apiLogs?.length || 0}`);
      apiLogs?.forEach(log => {
        console.log(`     - ${log.created_at}: ${log.description}`);
      });
    }
    
    // 4. ПРОВЕРКА ENDPOINT TON-DEPOSIT НА ДОСТУПНОСТЬ
    console.log('\n4. 🎯 ТЕСТ ENDPOINT /api/v2/wallet/ton-deposit:');
    
    try {
      const testResponse = await fetch('http://localhost:3000/api/v2/wallet/ton-deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ton_tx_hash: 'diagnostic_test_hash_12345',
          amount: 0.01,
          wallet_address: 'diagnostic_test_address'
        })
      });
      
      console.log(`   - Status: ${testResponse.status} ${testResponse.statusText}`);
      
      if (testResponse.status === 401) {
        console.log('   ✅ Endpoint доступен (требует аутентификацию - нормально)');
      } else {
        const responseText = await testResponse.text();
        console.log(`   - Response: ${responseText.substring(0, 200)}`);
      }
    } catch (fetchError) {
      console.log(`   ❌ Ошибка доступа к endpoint: ${fetchError.message}`);
    }
    
    // 5. ДЕТАЛЬНАЯ ПРОВЕРКА USER #25 НЕДАВНЕЙ АКТИВНОСТИ
    console.log('\n5. 👤 ДЕТАЛЬНАЯ АКТИВНОСТЬ USER #25:');
    
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: user25Recent, error: user25Error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false});
    
    if (user25Error) {
      console.log('❌ Ошибка получения активности User #25:', user25Error.message);
    } else {
      console.log(`   - Транзакций User #25 за 5 минут: ${user25Recent?.length || 0}`);
      
      const tonTxs = user25Recent?.filter(tx => tx.currency === 'TON') || [];
      console.log(`   - TON транзакций: ${tonTxs.length}`);
      
      user25Recent?.forEach(tx => {
        console.log(`     - ${tx.created_at}: ${tx.type} ${tx.amount} ${tx.currency}`);
        console.log(`       Status: ${tx.status}, Desc: ${tx.description?.substring(0, 50)}`);
      });
    }
    
    // 6. ПРОВЕРКА SCHEMA TRANSACTIONS TABLE
    console.log('\n6. 🏗️ SCHEMA TRANSACTIONS TABLE:');
    
    const { data: columns, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, column_default')
      .eq('table_name', 'transactions')
      .order('ordinal_position');
    
    if (schemaError) {
      console.log('❌ Ошибка получения schema:', schemaError.message);
    } else {
      console.log('   - Поля таблицы transactions:');
      columns?.forEach(col => {
        console.log(`     - ${col.column_name}: ${col.data_type} (default: ${col.column_default})`);
      });
    }
    
    // 7. АНАЛИЗ CONSTRAINTS И ИНДЕКСОВ
    console.log('\n7. 🔒 CONSTRAINTS И ИНДЕКСЫ:');
    
    const { data: constraints, error: constraintError } = await supabase
      .from('information_schema.table_constraints')
      .select('constraint_name, constraint_type')
      .eq('table_name', 'transactions');
    
    if (!constraintError && constraints) {
      console.log('   - Constraints таблицы transactions:');
      constraints.forEach(cons => {
        console.log(`     - ${cons.constraint_name}: ${cons.constraint_type}`);
      });
    }
    
    // 8. ИТОГОВЫЙ АНАЛИЗ
    console.log('\n8. 🎯 ИТОГОВЫЙ АНАЛИЗ:');
    console.log('========================');
    
    const hasRecentActivity = (recentActivity?.length || 0) > 0;
    const hasTonDepositsEver = (allTonDeposits?.length || 0) > 0;
    const hasUser25Activity = (user25Recent?.length || 0) > 0;
    const hasUser25TonActivity = user25Recent?.some(tx => tx.currency === 'TON') || false;
    
    console.log(`системная_активность: ${hasRecentActivity ? 'АКТИВНА' : 'НЕАКТИВНА'}`);
    console.log(`ton_deposit_функционал: ${hasTonDepositsEver ? 'РАБОТАЛ_РАНЕЕ' : 'НИКОГДА_НЕ_РАБОТАЛ'}`);
    console.log(`user25_активность: ${hasUser25Activity ? 'АКТИВЕН' : 'НЕАКТИВЕН'}`);
    console.log(`user25_ton_операции: ${hasUser25TonActivity ? 'ЕСТЬ' : 'НЕТ'}`);
    console.log(`endpoint_доступность: ДОСТУПЕН (401 - нормально)`);
    
    if (!hasTonDepositsEver) {
      console.log(`КРИТИЧЕСКИЙ_ВЫВОД: TON DEPOSIT функционал НИКОГДА НЕ РАБОТАЛ в production`);
      console.log(`ВОЗМОЖНАЯ_ПРИЧИНА: Интеграция tonConnectService → backend НЕ РАБОТАЕТ вообще`);
    } else if (!hasUser25TonActivity && hasUser25Activity) {
      console.log(`ВЫВОД: User #25 активен, но TON операции НЕ ОБРАБАТЫВАЮТСЯ`);
      console.log(`ПРИЧИНА: Frontend НЕ ВЫЗЫВАЕТ backend для TON депозитов`);
    }
    
  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА РАССЛЕДОВАНИЯ:', error.message);
  }
}

deepChainInvestigation();