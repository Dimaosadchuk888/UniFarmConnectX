/**
 * СРОЧНАЯ ДИАГНОСТИКА - НЕДАВНИЙ ДЕПОЗИТ USER #25
 * Депозит сделан ПОСЛЕ исправлений, но не отобразился
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function urgentDiagnosis() {
  console.log('🚨 СРОЧНАЯ ДИАГНОСТИКА НЕДАВНЕГО ДЕПОЗИТА');
  console.log('==========================================');
  console.log('User ID 25 - Депозит сделан ПОСЛЕ исправлений');
  
  try {
    // 1. ПРОВЕРКА ПОСЛЕДНИХ ТРАНЗАКЦИЙ (5 минут)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentTxs, error: recentError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false });
    
    console.log('\n⏰ ТРАНЗАКЦИИ ЗА ПОСЛЕДНИЕ 5 МИНУТ:');
    if (recentError) {
      console.log('❌ Ошибка:', recentError.message);
    } else {
      console.log(`   - Найдено: ${recentTxs?.length || 0} транзакций`);
      recentTxs?.forEach(tx => {
        console.log(`     - ${tx.created_at}: ${tx.type} ${tx.amount} ${tx.currency}`);
        console.log(`       Description: ${tx.description}`);
      });
    }
    
    // 2. ПРОВЕРКА ВСЕХ НЕДАВНИХ TON ДЕПОЗИТОВ
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: tonDeposits, error: tonError } = await supabase
      .from('transactions')
      .select('*')
      .eq('currency', 'TON')
      .eq('type', 'DEPOSIT')
      .gte('created_at', tenMinutesAgo)
      .order('created_at', { ascending: false});
    
    console.log('\n💰 НЕДАВНИЕ TON ДЕПОЗИТЫ (все пользователи):');
    if (tonError) {
      console.log('❌ Ошибка:', tonError.message);
    } else {
      console.log(`   - Всего TON депозитов за 10 мин: ${tonDeposits?.length || 0}`);
      tonDeposits?.forEach(tx => {
        console.log(`     - User ${tx.user_id}: ${tx.amount} TON at ${tx.created_at}`);
        if (tx.description) {
          const shortDesc = tx.description.substring(0, 60) + '...';
          console.log(`       Desc: ${shortDesc}`);
        }
      });
    }
    
    // 3. ПОИСК ПО НОВОМУ ХЕШУ В ОПИСАНИЯХ
    const { data: newHashTxs, error: hashError } = await supabase
      .from('transactions')
      .select('*')
      .gte('created_at', tenMinutesAgo)
      .or('description.ilike.%00a1ba3c%,description.ilike.%hash%,description.ilike.%TON%')
      .order('created_at', { ascending: false });
    
    console.log('\n🔍 ПОИСК НОВЫХ TON ХЕШЕЙ В ТРАНЗАКЦИЯХ:');
    if (hashError) {
      console.log('❌ Ошибка:', hashError.message);  
    } else {
      console.log(`   - Найдено транзакций с TON хешами: ${newHashTxs?.length || 0}`);
      newHashTxs?.forEach(tx => {
        if (tx.description?.includes('00a1ba3c') || tx.description?.toLowerCase().includes('ton')) {
          console.log(`     - User ${tx.user_id}: ${tx.description}`);
          console.log(`       Created: ${tx.created_at}`);
        }
      });
    }
    
    // 4. ПРОВЕРКА ТЕКУЩЕГО БАЛАНСА USER 25
    const { data: user25, error: userError } = await supabase
      .from('users')
      .select('balance_ton, updated_at')
      .eq('id', 25)
      .single();
    
    console.log('\n💳 ТЕКУЩИЙ БАЛАНС USER #25:');
    if (userError) {
      console.log('❌ Ошибка:', userError.message);
    } else {
      console.log(`   - TON Balance: ${user25.balance_ton}`);
      console.log(`   - Last Updated: ${user25.updated_at}`);
      
      // Проверим, обновлялся ли баланс недавно
      const lastUpdate = new Date(user25.updated_at);
      const timeDiff = (Date.now() - lastUpdate.getTime()) / 1000 / 60; // минуты
      console.log(`   - Минут с последнего обновления: ${timeDiff.toFixed(1)}`);
    }
    
    // 5. ПРОВЕРКА СИСТЕМНЫХ ЛОГОВ ЧЕРЕЗ БАЗУ
    const { data: systemLogs, error: logError } = await supabase
      .from('transactions')
      .select('*')
      .gte('created_at', fiveMinutesAgo)
      .or('description.ilike.%error%,description.ilike.%failed%,description.ilike.%api%')
      .order('created_at', { ascending: false });
    
    console.log('\n📋 СИСТЕМНЫЕ ЛОГИ И ОШИБКИ:');
    if (logError) {
      console.log('❌ Ошибка поиска логов:', logError.message);
    } else {
      console.log(`   - Найдено потенциальных системных сообщений: ${systemLogs?.length || 0}`);
      systemLogs?.slice(0, 5).forEach(log => {
        console.log(`     - ${log.created_at}: ${log.description}`);
      });
    }
    
    // 6. АНАЛИЗ РЕЗУЛЬТАТОВ
    console.log('\n🎯 АНАЛИЗ НЕДАВНЕГО ДЕПОЗИТА:');
    const hasRecentTxs = (recentTxs?.length || 0) > 0;
    const hasRecentTonDeposits = (tonDeposits?.length || 0) > 0;
    const hasUser25TonDeposits = tonDeposits?.some(tx => tx.user_id === 25) || false;
    const balanceUpdatedRecently = user25 && (Date.now() - new Date(user25.updated_at).getTime()) < 10 * 60 * 1000;
    
    console.log(`   - User 25 транзакции за 5 мин: ${hasRecentTxs ? 'ДА' : 'НЕТ'}`);
    console.log(`   - TON депозиты в системе за 10 мин: ${hasRecentTonDeposits ? 'ДА' : 'НЕТ'}`);
    console.log(`   - TON депозиты User 25 за 10 мин: ${hasUser25TonDeposits ? 'ДА' : 'НЕТ'}`);
    console.log(`   - Баланс User 25 обновлен недавно: ${balanceUpdatedRecently ? 'ДА' : 'НЕТ'}`);
    
    // 7. ВОЗМОЖНЫЕ ПРИЧИНЫ
    console.log('\n💡 ВОЗМОЖНЫЕ ПРИЧИНЫ ПРОБЛЕМЫ:');
    if (!hasUser25TonDeposits && !balanceUpdatedRecently) {
      console.log('   ❌ Frontend НЕ ВЫЗВАЛ backend API даже ПОСЛЕ исправлений');
      console.log('   ❌ tonConnectService.sendTonTransaction() НЕ РАБОТАЕТ');
      console.log('   ❌ correctApiRequest(\'/api/v2/wallet/ton-deposit\') НЕ ВЫЗЫВАЕТСЯ');
    } else if (hasUser25TonDeposits && !balanceUpdatedRecently) {
      console.log('   ⚠️ API вызывается, транзакции создаются, но баланс НЕ ОБНОВЛЯЕТСЯ');
      console.log('   ⚠️ Проблема в BalanceManager.addBalance() или UI refresh');
    } else if (!hasRecentTonDeposits) {
      console.log('   ⚠️ Система НЕ ПРИНИМАЕТ TON депозиты вообще');
      console.log('   ⚠️ Проблема в backend контроллере или сервисе');
    }
    
  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА ДИАГНОСТИКИ:', error.message);
  }
}

urgentDiagnosis();