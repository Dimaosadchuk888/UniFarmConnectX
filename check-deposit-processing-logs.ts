/**
 * ПРОВЕРКА ЛОГОВ ОБРАБОТКИ ДЕПОЗИТОВ
 * Ищем признаки того, что депозиты 255 и 251 обрабатывались через систему
 */

import { supabase } from './core/supabase.js';

async function checkDepositProcessingLogs() {
  console.log('🔍 ПРОВЕРКА ОБРАБОТКИ ДЕПОЗИТОВ ЧЕРЕЗ СИСТЕМУ');
  
  try {
    // 1. Проверяем ТОЧНЫЕ депозиты пользователей 255 и 251
    console.log('\n📊 ПРОБЛЕМНЫЕ ДЕПОЗИТЫ:');
    
    const { data: problemDeposits } = await supabase
      .from('transactions')
      .select('*')
      .in('id', [1919054, 1919025]) // ID депозитов которые мы нашли
      .order('created_at', { ascending: false });
    
    if (problemDeposits) {
      problemDeposits.forEach(tx => {
        console.log(`\n=== ДЕПОЗИТ ID ${tx.id} ===`);
        console.log(`User: ${tx.user_id}`);
        console.log(`Type: ${tx.type}`);
        console.log(`Amount: ${tx.amount} ${tx.currency}`);
        console.log(`Status: ${tx.status}`);
        console.log(`Description: ${tx.description}`);
        console.log(`Created: ${tx.created_at}`);
        console.log(`Updated: ${tx.updated_at}`);
        
        if (tx.metadata) {
          console.log(`Metadata:`);
          console.log(JSON.stringify(tx.metadata, null, 2));
        }
        
        // Анализ - прошел ли через систему
        const passedThroughSystem = tx.metadata?.source === 'ton_deposit' && 
                                  tx.metadata?.tx_hash && 
                                  tx.description.includes('from blockchain');
        
        console.log(`🔍 Прошел через систему: ${passedThroughSystem ? '✅ ДА' : '❌ НЕТ'}`);
        
        if (!passedThroughSystem) {
          console.log(`⚠️ ПРОБЛЕМА: Депозит создан вне системы обработки!`);
        }
      });
    }
    
    // 2. Проверяем все депозиты за время проблемы
    console.log('\n⏰ ВСЕ ДЕПОЗИТЫ ЗА ВРЕМЯ ПРОБЛЕМЫ (08:00 - 08:05):');
    
    const { data: allDeposits } = await supabase
      .from('transactions')
      .select('*')
      .in('type', ['TON_DEPOSIT', 'FARMING_DEPOSIT'])
      .gte('created_at', '2025-08-05T07:55:00.000Z')
      .lte('created_at', '2025-08-05T08:10:00.000Z')
      .order('created_at', { ascending: false });
    
    if (allDeposits) {
      allDeposits.forEach(tx => {
        const passedThroughSystem = tx.metadata?.source === 'ton_deposit' || 
                                  tx.description?.includes('from blockchain') ||
                                  tx.description?.includes('farming deposit');
        
        console.log(`${tx.created_at} | User ${tx.user_id} | ${tx.type} | ${tx.amount} ${tx.currency} | System: ${passedThroughSystem ? '✅' : '❌'}`);
      });
    }
    
    // 3. Ищем логи системы обработки (если есть)
    console.log('\n🔍 ПОИСК СВЯЗАННЫХ ОПЕРАЦИЙ:');
    
    // Проверяем есть ли транзакции созданные точно в то же время
    const { data: relatedTx } = await supabase
      .from('transactions')
      .select('*')
      .gte('created_at', '2025-08-05T08:00:00.000Z')
      .lte('created_at', '2025-08-05T08:02:00.000Z')
      .order('created_at', { ascending: false });
    
    if (relatedTx) {
      console.log(`Найдено ${relatedTx.length} транзакций в период депозитов:`);
      relatedTx.forEach(tx => {
        console.log(`${tx.created_at} | User ${tx.user_id} | ${tx.type} | ${tx.amount} ${tx.currency} | ${tx.description}`);
      });
    }
    
    // 4. Проверяем обновления пользователей
    console.log('\n👥 ПРОВЕРКА ОБНОВЛЕНИЙ ПОЛЬЗОВАТЕЛЕЙ:');
    
    const { data: user255Updates } = await supabase
      .from('users')
      .select('updated_at, balance_uni, balance_ton')
      .eq('telegram_id', 255)
      .single();
      
    const { data: user251Updates } = await supabase
      .from('users')
      .select('updated_at, balance_uni, balance_ton')
      .eq('telegram_id', 251)
      .single();
    
    console.log(`User 255 - Last updated: ${user255Updates?.updated_at || 'НИКОГДА'} | UNI: ${user255Updates?.balance_uni || 0} | TON: ${user255Updates?.balance_ton || 0}`);
    console.log(`User 251 - Last updated: ${user251Updates?.updated_at || 'НИКОГДА'} | UNI: ${user251Updates?.balance_uni || 0} | TON: ${user251Updates?.balance_ton || 0}`);
    
    // 5. Ищем возможные ошибки в данных
    console.log('\n🚨 АНАЛИЗ ПРОБЛЕМ:');
    
    const issues = [];
    
    if (!user255Updates?.updated_at) {
      issues.push('User 255: Поле updated_at = NULL - баланс НИКОГДА не обновлялся');
    }
    
    if (!user251Updates?.updated_at) {
      issues.push('User 251: Поле updated_at = NULL - баланс НИКОГДА не обновлялся');
    }
    
    if (problemDeposits) {
      problemDeposits.forEach(tx => {
        if (!tx.metadata?.source) {
          issues.push(`Депозит ${tx.id}: Нет metadata.source - создан вне системы`);
        }
      });
    }
    
    if (issues.length > 0) {
      console.log('\n❌ ОБНАРУЖЕННЫЕ ПРОБЛЕМЫ:');
      issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
    } else {
      console.log('✅ Проблем не обнаружено в логике обработки');
    }
    
    console.log('\n✅ Анализ завершен');
    
  } catch (error) {
    console.error('❌ Ошибка анализа:', error);
  }
}

checkDepositProcessingLogs();