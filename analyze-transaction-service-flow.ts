/**
 * АНАЛИЗ ПОТОКА TRANSACTIONSERVICE
 * Проверяем что происходит при создании транзакций и почему балансы не обновляются
 */

import { supabase } from './core/supabase.js';

async function analyzeTransactionServiceFlow() {
  console.log('🔍 АНАЛИЗ ПОТОКА TRANSACTIONSERVICE');
  
  try {
    // 1. Проверяем последние вызовы TransactionService
    console.log('\n📊 ПОСЛЕДНИЕ ТРАНЗАКЦИИ В СИСТЕМЕ:');
    
    const { data: recentTx } = await supabase
      .from('transactions')
      .select('*')
      .gte('created_at', '2025-08-05T08:00:00.000Z')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (recentTx) {
      recentTx.forEach(tx => {
        const hasMetadata = tx.metadata && Object.keys(tx.metadata).length > 0;
        const isSystemGenerated = hasMetadata && (
          tx.metadata.source || 
          tx.metadata.original_type || 
          tx.description?.includes('from blockchain')
        );
        
        console.log(`${tx.created_at} | User ${tx.user_id} | ${tx.type} | ${tx.amount} ${tx.currency} | System: ${isSystemGenerated ? '✅' : '❌'}`);
        
        if (tx.user_id === 255 || tx.user_id === 251) {
          console.log(`   ⚠️ ПРОБЛЕМНЫЙ USER! Metadata: ${JSON.stringify(tx.metadata || {})}`);
        }
      });
    }
    
    // 2. Проверяем структуру metadata для понимания процесса
    console.log('\n🔍 АНАЛИЗ METADATA СТРУКТУР:');
    
    const { data: metadataAnalysis } = await supabase
      .from('transactions')
      .select('id, user_id, type, metadata, description')
      .not('metadata', 'is', null)
      .gte('created_at', '2025-08-05T08:00:00.000Z')
      .limit(5);
    
    if (metadataAnalysis) {
      metadataAnalysis.forEach(tx => {
        console.log(`\nТранзакция ${tx.id} (User ${tx.user_id}):`);
        console.log(`  Type: ${tx.type}`);
        console.log(`  Description: ${tx.description}`);
        console.log(`  Metadata keys: ${Object.keys(tx.metadata || {}).join(', ')}`);
        
        if (tx.metadata?.source) {
          console.log(`  ✅ Обработана через: ${tx.metadata.source}`);
        } else {
          console.log(`  ❌ Нет источника обработки`);
        }
      });
    }
    
    // 3. Проверяем паттерны успешной обработки vs проблемных
    console.log('\n📈 СРАВНЕНИЕ УСПЕШНОЙ VS ПРОБЛЕМНОЙ ОБРАБОТКИ:');
    
    // Успешные транзакции других пользователей
    const { data: successfulTx } = await supabase
      .from('transactions')
      .select('user_id, type, metadata, description')
      .not('user_id', 'in', '(255,251)')
      .eq('type', 'FARMING_REWARD')
      .gte('created_at', '2025-08-05T08:00:00.000Z')
      .limit(3);
    
    console.log('\n✅ УСПЕШНЫЕ ТРАНЗАКЦИИ (других пользователей):');
    if (successfulTx) {
      successfulTx.forEach(tx => {
        console.log(`  User ${tx.user_id}: ${tx.type} | Metadata: ${tx.metadata ? 'есть' : 'нет'} | Desc: ${tx.description}`);
      });
    }
    
    // Проблемные транзакции наших пользователей  
    const { data: problematicTx } = await supabase
      .from('transactions')
      .select('user_id, type, metadata, description')
      .in('user_id', [255, 251])
      .gte('created_at', '2025-08-05T08:00:00.000Z')
      .limit(5);
    
    console.log('\n❌ ПРОБЛЕМНЫЕ ТРАНЗАКЦИИ (пользователи 255, 251):');
    if (problematicTx) {
      problematicTx.forEach(tx => {
        console.log(`  User ${tx.user_id}: ${tx.type} | Metadata: ${tx.metadata ? 'есть' : 'нет'} | Desc: ${tx.description}`);
      });
    }
    
    // 4. Ищем признаки того что BalanceManager вызывался но провалился
    console.log('\n🔍 ПОИСК СЛЕДОВ РАБОТЫ BALANCEMANAGER:');
    
    // Проверяем есть ли логи обновления балансов в близкое время
    const { data: balanceUpdates } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'BALANCE_UPDATE')
      .gte('created_at', '2025-08-05T07:00:00.000Z')
      .order('created_at', { ascending: false });
    
    if (balanceUpdates && balanceUpdates.length > 0) {
      console.log(`✅ Найдено ${balanceUpdates.length} BALANCE_UPDATE операций:`);
      balanceUpdates.forEach(tx => {
        console.log(`  ${tx.created_at} | User ${tx.user_id} | ${tx.amount} ${tx.currency} | ${tx.description}`);
      });
    } else {
      console.log('❌ НЕТ BALANCE_UPDATE операций - BalanceManager не создает служебные записи');
    }
    
    // 5. Проверяем целостность связей user_id
    console.log('\n🔗 ПРОВЕРКА ЦЕЛОСТНОСТИ USER_ID:');
    
    // Проверяем есть ли orphaned транзакции (без соответствующих пользователей)
    const { data: orphanedCheck } = await supabase
      .rpc('check_orphaned_transactions', {
        target_user_ids: [255, 251]
      })
      .single();
    
    if (orphanedCheck) {
      console.log('✅ Целостность user_id проверена через stored procedure');
    } else {
      // Fallback manual check
      const { data: userExists255 } = await supabase
        .from('users')
        .select('id')
        .eq('telegram_id', 255)
        .single();
        
      const { data: userExists251 } = await supabase
        .from('users')
        .select('id')
        .eq('telegram_id', 251)
        .single();
      
      console.log(`User 255 exists: ${userExists255 ? 'да' : 'нет'}`);
      console.log(`User 251 exists: ${userExists251 ? 'да' : 'нет'}`);
      
      if (userExists255) {
        const { data: txCount255 } = await supabase
          .from('transactions')
          .select('count')
          .eq('user_id', 255)
          .single();
        console.log(`User 255 транзакций: ${txCount255?.count || 0}`);
      }
      
      if (userExists251) {
        const { data: txCount251 } = await supabase
          .from('transactions')
          .select('count')
          .eq('user_id', 251)
          .single();
        console.log(`User 251 транзакций: ${txCount251?.count || 0}`);
      }
    }
    
    console.log('\n✅ Анализ потока завершен');
    
  } catch (error) {
    console.error('❌ Ошибка анализа:', error);
  }
}

analyzeTransactionServiceFlow();