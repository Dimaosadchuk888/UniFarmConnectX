const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function detailedInvestigation() {
  console.log('=== ДЕТАЛЬНОЕ РАССЛЕДОВАНИЕ TON ТРАНЗАКЦИИ d1077cd0 ===\n');
  
  try {
    // Найден User 228 с кошельком - проверим его транзакции
    console.log('🔍 1. Анализ User 228 (владелец кошелька UQCYrMBRgAZIOkhtitO1IFHmaEBQ_NrIBFTwsj2N2jW-vsCh)...');
    const { data: user228Transactions, error: user228Error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 228)
      .order('created_at', { ascending: false });
      
    if (user228Error) {
      console.error('❌ Ошибка поиска транзакций User 228:', user228Error);
    } else {
      console.log(`📊 Всего транзакций User 228: ${user228Transactions?.length || 0}`);
      if (user228Transactions?.length > 0) {
        user228Transactions.forEach(tx => {
          console.log(`💰 ID: ${tx.id}, Type: ${tx.type}, Amount: ${tx.amount} ${tx.currency}, Date: ${tx.created_at}`);
          console.log(`📝 Description: ${tx.description}\n`);
        });
      }
    }
    
    // Поиск всех TON транзакций за широкий период
    console.log('🔍 2. Поиск всех TON транзакций за последние дни...');
    const { data: recentTonTx, error: recentError } = await supabase
      .from('transactions')
      .select('*')
      .eq('currency', 'TON')
      .gte('created_at', '2025-07-20T00:00:00')
      .order('created_at', { ascending: false });
      
    if (recentError) {
      console.error('❌ Ошибка поиска недавних TON транзакций:', recentError);
    } else {
      console.log(`📊 TON транзакций за последние дни: ${recentTonTx?.length || 0}`);
      if (recentTonTx?.length > 0) {
        recentTonTx.forEach(tx => {
          console.log(`💎 User: ${tx.user_id}, Amount: ${tx.amount} TON, Date: ${tx.created_at}`);
          console.log(`📝 Description: ${tx.description}\n`);
        });
      }
    }
    
    // Поиск по описанию с TON keywords
    console.log('🔍 3. Поиск транзакций с TON ключевыми словами...');
    const { data: tonKeywordTx, error: keywordError } = await supabase
      .from('transactions')
      .select('*')
      .or('description.ilike.%TON deposit%,description.ilike.%blockchain%,description.ilike.%unifarm%,description.ilike.%ton%')
      .gte('created_at', '2025-07-21T00:00:00')
      .order('created_at', { ascending: false });
      
    if (keywordError) {
      console.error('❌ Ошибка поиска по ключевым словам:', keywordError);
    } else {
      console.log(`🔍 Транзакций с TON ключевыми словами: ${tonKeywordTx?.length || 0}`);
      if (tonKeywordTx?.length > 0) {
        tonKeywordTx.forEach(tx => {
          console.log(`🔑 User: ${tx.user_id}, Amount: ${tx.amount} ${tx.currency}, Date: ${tx.created_at}`);
          console.log(`📝 Description: ${tx.description}\n`);
        });
      }
    }
    
    // Анализ изменений баланса User 228
    console.log('🔍 4. Проверка истории изменений баланса TON...');
    const { data: balanceChanges, error: balanceError } = await supabase
      .from('transactions')
      .select('*')
      .in('user_id', [25, 227, 228])
      .eq('currency', 'TON')
      .order('created_at', { ascending: false });
      
    if (balanceError) {
      console.error('❌ Ошибка проверки изменений баланса:', balanceError);
    } else {
      console.log(`📊 TON транзакций для пользователей 25, 227, 228: ${balanceChanges?.length || 0}`);
      if (balanceChanges?.length > 0) {
        balanceChanges.forEach(tx => {
          console.log(`👤 User: ${tx.user_id}, Amount: ${tx.amount} TON, Type: ${tx.type}, Date: ${tx.created_at}`);
          console.log(`📝 Description: ${tx.description}\n`);
        });
      }
    }
    
    // Поиск в metadata
    console.log('🔍 5. Поиск в metadata всех транзакций...');
    const { data: metadataTx, error: metadataError } = await supabase
      .from('transactions')
      .select('*')
      .not('metadata', 'is', null)
      .gte('created_at', '2025-07-21T00:00:00')
      .order('created_at', { ascending: false });
      
    if (metadataError) {
      console.error('❌ Ошибка поиска в metadata:', metadataError);
    } else {
      console.log(`🔍 Транзакций с metadata: ${metadataTx?.length || 0}`);
      if (metadataTx?.length > 0) {
        metadataTx.forEach(tx => {
          console.log(`🔧 User: ${tx.user_id}, Amount: ${tx.amount} ${tx.currency}, Date: ${tx.created_at}`);
          console.log(`📝 Description: ${tx.description}`);
          console.log(`🔗 Metadata: ${JSON.stringify(tx.metadata)}\n`);
        });
      }
    }
    
    console.log('=== ДЕТАЛЬНОЕ РАССЛЕДОВАНИЕ ЗАВЕРШЕНО ===');
    
  } catch (error) {
    console.error('💥 Критическая ошибка расследования:', error);
  }
}

detailedInvestigation();