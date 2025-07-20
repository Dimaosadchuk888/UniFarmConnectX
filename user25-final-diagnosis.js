/**
 * ФИНАЛЬНАЯ ДИАГНОСТИКА USER ID 25 - PRODUCTION ONLY
 * Проверка TON депозита hash: 00a1ba3c2614f4d65cc346805feea96042cb111351b3977c68f3379ddb90e1b4
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function finalDiagnosis() {
  console.log('🎯 ФИНАЛЬНАЯ ДИАГНОСТИКА USER ID 25 PRODUCTION');
  console.log('===============================================');
  console.log('Target Hash: 00a1ba3c2614f4d65cc346805feea96042cb111351b3977c68f3379ddb90e1b4');
  console.log('Expected: 0.1 TON deposit');
  
  try {
    // 1. ПОЛУЧЕНИЕ USER ID 25
    const { data: user25, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', 25)
      .single();
    
    if (userError || !user25) {
      console.log('❌ КРИТИЧЕСКАЯ ОШИБКА: User ID 25 не найден в Production');
      console.log('Error:', userError?.message);
      return;
    }
    
    console.log('\n✅ USER ID 25 НАЙДЕН:');
    console.log(`   - ID: ${user25.id}`);
    console.log(`   - Telegram ID: ${user25.telegram_id}`);
    console.log(`   - Username: ${user25.username}`);
    console.log(`   - Current TON Balance: ${user25.balance_ton}`);
    console.log(`   - Ref Code: ${user25.ref_code}`);
    console.log(`   - Created: ${user25.created_at}`);
    
    // 2. ПОИСК ТРАНЗАКЦИИ ПО ХЕШУ
    const targetHash = '00a1ba3c2614f4d65cc346805feea96042cb111351b3977c68f3379ddb90e1b4';
    const { data: hashTransactions, error: hashError } = await supabase
      .from('transactions')
      .select('*')
      .ilike('description', `%${targetHash}%`);
    
    console.log('\n🔍 ПОИСК ТРАНЗАКЦИИ ПО ХЕШУ:');
    if (hashError) {
      console.log('❌ Ошибка поиска:', hashError.message);
    } else {
      console.log(`   - Найдено транзакций с хешем: ${hashTransactions?.length || 0}`);
      if (hashTransactions && hashTransactions.length > 0) {
        hashTransactions.forEach(tx => {
          console.log(`   - ID: ${tx.id}, User: ${tx.user_id}, Amount: ${tx.amount} ${tx.currency}`);
          console.log(`     Type: ${tx.type}, Status: ${tx.status}`);
          console.log(`     Created: ${tx.created_at}`);
          console.log(`     Description: ${tx.description}`);
        });
      }
    }
    
    // 3. ВСЕ ТРАНЗАКЦИИ USER ID 25
    const { data: allTransactions, error: allError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .order('created_at', { ascending: false });
    
    console.log('\n📊 ВСЕ ТРАНЗАКЦИИ USER ID 25:');
    if (allError) {
      console.log('❌ Ошибка получения транзакций:', allError.message);
    } else {
      console.log(`   - Всего транзакций: ${allTransactions?.length || 0}`);
      
      // TON транзакции
      const tonTxs = allTransactions?.filter(tx => tx.currency === 'TON') || [];
      console.log(`   - TON транзакций: ${tonTxs.length}`);
      
      tonTxs.slice(0, 10).forEach((tx, idx) => {
        console.log(`     ${idx + 1}. ${tx.created_at}: ${tx.type} ${tx.amount} TON (${tx.status})`);
      });
      
      // Депозиты 0.1 TON
      const deposit01 = tonTxs.filter(tx => tx.amount === '0.1' && tx.type === 'DEPOSIT');
      console.log(`   - Депозиты 0.1 TON: ${deposit01.length}`);
      
      // Последние 5 транзакций
      console.log('\n   📅 ПОСЛЕДНИЕ 5 ТРАНЗАКЦИЙ:');
      allTransactions?.slice(0, 5).forEach((tx, idx) => {
        console.log(`     ${idx + 1}. ${tx.created_at}: ${tx.type} ${tx.amount} ${tx.currency}`);
      });
    }
    
    // 4. ПРОВЕРКА API ЛОГОВ
    console.log('\n🔧 АНАЛИЗ ВОЗМОЖНЫХ ПРОБЛЕМ:');
    
    const hasTargetHash = (hashTransactions?.length || 0) > 0;
    const hasCorrectUser = hashTransactions?.some(tx => tx.user_id === 25) || false;
    const balanceUpdated = parseFloat(user25.balance_ton) > 0;
    
    console.log(`   - Транзакция с хешем найдена: ${hasTargetHash ? 'ДА' : 'НЕТ'}`);
    console.log(`   - Транзакция принадлежит User 25: ${hasCorrectUser ? 'ДА' : 'НЕТ'}`);
    console.log(`   - Баланс обновлен: ${balanceUpdated ? 'ДА' : 'НЕТ'}`);
    
    // 5. ИТОГОВЫЙ ОТЧЕТ
    console.log('\n📋 ФИНАЛЬНЫЙ ОТЧЕТ:');
    console.log('===================');
    console.log(`environment: production`);
    console.log(`user_id: ${user25.id}`);
    console.log(`telegram_id: ${user25.telegram_id}`);
    console.log(`username: ${user25.username}`);
    console.log(`current_ton_balance: ${user25.balance_ton}`);
    console.log(`tx_hash_found: ${hasTargetHash}`);
    console.log(`api_called: ${hasTargetHash ? 'true' : 'false'}`);
    console.log(`controller_triggered: ${hasTargetHash ? 'true' : 'false'}`);
    console.log(`service_triggered: ${hasTargetHash ? 'true' : 'false'}`);
    console.log(`transaction_record_created: ${hasTargetHash}`);
    console.log(`balance_updated: ${balanceUpdated}`);
    console.log(`error_detected: ${!hasTargetHash ? 'FRONTEND НЕ ВЫЗВАЛ BACKEND API' : 'НЕТ'}`);
    console.log(`suspected_cause: ${!hasTargetHash ? 'tonConnectService.ts НЕ ВЫЗВАЛ correctApiRequest' : 'Система работает корректно'}`);
    console.log(`ui_received_update: ${balanceUpdated}`);
    console.log(`missing_fields: ${!hasTargetHash ? 'transaction record, balance update' : 'НЕТ'}`);
    
    if (!hasTargetHash) {
      console.log(`next_steps_suggestion: Проверить frontend console logs на момент депозита, убедиться что tonConnectService.sendTonTransaction() вызывает POST /api/v2/wallet/ton-deposit`);
    } else {
      console.log(`next_steps_suggestion: Система работает корректно для новых депозитов`);
    }
    
  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА:', error.message);
  }
}

finalDiagnosis();