const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function schedulerStabilityAnalysis() {
  console.log('=== АНАЛИЗ СТАБИЛЬНОСТИ ПЛАНИРОВЩИКОВ ===\n');
  
  try {
    // 1. Проверка существования базы данных и таблиц
    console.log('🔍 1. Проверка структуры базы данных...');
    
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.error('❌ Ошибка получения списка таблиц:', tablesError);
      return;
    }
    
    const tableNames = tables?.map(t => t.table_name) || [];
    console.log(`📊 Найденные таблицы: ${tableNames.join(', ')}`);
    
    // Проверка наличия ключевых таблиц
    const requiredTables = ['transactions', 'users', 'ton_farming_data'];
    const missingTables = requiredTables.filter(table => !tableNames.includes(table));
    
    if (missingTables.length > 0) {
      console.log(`⚠️ Отсутствующие таблицы: ${missingTables.join(', ')}`);
    } else {
      console.log('✅ Все ключевые таблицы присутствуют');
    }
    
    // 2. Анализ типов транзакций
    if (tableNames.includes('transactions')) {
      console.log('\n🔍 2. Анализ типов транзакций в базе данных...');
      
      const { data: transactionTypes, error: typesError } = await supabase
        .from('transactions')
        .select('type')
        .limit(1000);
        
      if (typesError) {
        console.error('❌ Ошибка получения типов транзакций:', typesError);
      } else {
        const uniqueTypes = [...new Set(transactionTypes?.map(t => t.type) || [])];
        console.log(`📋 Обнаруженные типы транзакций: ${uniqueTypes.join(', ')}`);
        
        // Проверка наличия TON_DEPOSIT
        if (uniqueTypes.includes('TON_DEPOSIT')) {
          console.log('✅ TON_DEPOSIT тип присутствует в базе');
        } else {
          console.log('❌ TON_DEPOSIT отсутствует среди типов транзакций');
        }
        
        // Подсчет количества по типам
        console.log('📊 Статистика по типам транзакций:');
        for (const type of uniqueTypes) {
          const { count, error: countError } = await supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('type', type);
            
          if (!countError) {
            console.log(`   ${type}: ${count} транзакций`);
          }
        }
      }
    }
    
    // 3. Анализ реальных интервалов транзакций за последние 2 часа
    console.log('\n🔍 3. Анализ реальных интервалов транзакций...');
    
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    
    const { data: recentTransactions, error: recentError } = await supabase
      .from('transactions')
      .select('id, user_id, type, created_at, currency')
      .gte('created_at', twoHoursAgo)
      .order('created_at', { ascending: true })
      .limit(200);
      
    if (recentError) {
      console.error('❌ Ошибка получения недавних транзакций:', recentError);
    } else {
      console.log(`📊 Транзакций за последние 2 часа: ${recentTransactions?.length || 0}`);
      
      if (recentTransactions && recentTransactions.length > 0) {
        // Группировка по пользователям для анализа интервалов
        const userTransactions = {};
        
        recentTransactions.forEach(tx => {
          if (!userTransactions[tx.user_id]) {
            userTransactions[tx.user_id] = [];
          }
          userTransactions[tx.user_id].push(tx);
        });
        
        console.log('⏱️ Анализ интервалов по пользователям:');
        
        Object.entries(userTransactions).forEach(([userId, transactions]) => {
          if (transactions.length > 1) {
            const intervals = [];
            for (let i = 1; i < transactions.length; i++) {
              const prev = new Date(transactions[i-1].created_at);
              const curr = new Date(transactions[i].created_at);
              const intervalMinutes = (curr - prev) / (1000 * 60);
              intervals.push(intervalMinutes);
            }
            
            const avgInterval = (intervals.reduce((sum, val) => sum + val, 0) / intervals.length).toFixed(2);
            const minInterval = Math.min(...intervals).toFixed(2);
            const maxInterval = Math.max(...intervals).toFixed(2);
            
            console.log(`   User ${userId}: ${transactions.length} транзакций, интервал мин/сред/макс: ${minInterval}/${avgInterval}/${maxInterval} мин`);
          }
        });
        
        // Поиск аномально частых транзакций
        console.log('\n🚨 Поиск аномально частых транзакций (интервал <2 минут):');
        
        Object.entries(userTransactions).forEach(([userId, transactions]) => {
          const fastTransactions = [];
          for (let i = 1; i < transactions.length; i++) {
            const prev = new Date(transactions[i-1].created_at);
            const curr = new Date(transactions[i].created_at);
            const intervalMinutes = (curr - prev) / (1000 * 60);
            
            if (intervalMinutes < 2) {
              fastTransactions.push({
                interval: intervalMinutes.toFixed(2),
                txId: transactions[i].id,
                type: transactions[i].type,
                timestamp: transactions[i].created_at
              });
            }
          }
          
          if (fastTransactions.length > 0) {
            console.log(`   User ${userId}: ${fastTransactions.length} быстрых транзакций`);
            fastTransactions.slice(0, 5).forEach(tx => {
              console.log(`     TX ${tx.txId}: +${tx.interval} мин, тип: ${tx.type}`);
            });
          }
        });
      }
    }
    
    // 4. Проверка TON депозитов и блокчейн транзакций
    console.log('\n🔍 4. Анализ TON депозитов и блокчейн транзакций...');
    
    // Поиск транзакций с блокчейн хешами
    const { data: blockchainTxs, error: blockchainError } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount, metadata, created_at')
      .not('metadata', 'is', null)
      .limit(50);
      
    if (blockchainError) {
      console.error('❌ Ошибка получения блокчейн транзакций:', blockchainError);
    } else {
      console.log(`📊 Транзакций с metadata: ${blockchainTxs?.length || 0}`);
      
      let tonDepositCount = 0;
      let blockchainHashCount = 0;
      
      blockchainTxs?.forEach(tx => {
        if (tx.type === 'TON_DEPOSIT' || (tx.metadata && tx.metadata.blockchain_hash)) {
          if (tx.type === 'TON_DEPOSIT') tonDepositCount++;
          if (tx.metadata && tx.metadata.blockchain_hash) blockchainHashCount++;
          
          console.log(`   TX ${tx.id}: ${tx.type}, amount: ${tx.amount}, hash: ${tx.metadata?.blockchain_hash || 'нет'}`);
        }
      });
      
      console.log(`📈 Статистика блокчейн транзакций:`);
      console.log(`   TON_DEPOSIT транзакций: ${tonDepositCount}`);
      console.log(`   С blockchain_hash: ${blockchainHashCount}`);
    }
    
    // 5. Проверка конкретной транзакции d1077cd0
    console.log('\n🔍 5. Поиск транзакции d1077cd0...');
    
    const searchHashes = [
      'd1077cd0bad69b623a06fe24dd848ba5ed5b25f98655a0ca51466005f53b8b2b',
      'd1077cd0',
      'bad69b623a06fe24dd848ba5ed5b25f98655a0ca51466005f53b8b2b'
    ];
    
    for (const hash of searchHashes) {
      const { data: hashTx, error: hashError } = await supabase
        .from('transactions')
        .select('*')
        .ilike('metadata->>blockchain_hash', `%${hash}%`);
        
      if (!hashError && hashTx && hashTx.length > 0) {
        console.log(`✅ Найдена транзакция с хешем ${hash}:`);
        hashTx.forEach(tx => {
          console.log(`   TX ${tx.id}: User ${tx.user_id}, ${tx.amount} ${tx.currency}, ${tx.created_at}`);
        });
      }
    }
    
    // Поиск по User 228
    const { data: user228Txs, error: user228Error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 228)
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (!user228Error && user228Txs) {
      console.log(`📊 Последние 10 транзакций User 228:`);
      user228Txs.forEach(tx => {
        console.log(`   TX ${tx.id}: ${tx.type}, ${tx.amount} ${tx.currency}, ${tx.created_at}`);
      });
    }
    
    // 6. Анализ активных планировщиков в production
    console.log('\n🔍 6. Анализ текущей активности планировщиков...');
    
    // Анализ паттернов транзакций для определения реального интервала планировщиков
    const { data: farmingRewards, error: farmingError } = await supabase
      .from('transactions')
      .select('created_at, user_id, type, currency')
      .eq('type', 'FARMING_REWARD')
      .gte('created_at', twoHoursAgo)
      .order('created_at', { ascending: true });
      
    if (!farmingError && farmingRewards && farmingRewards.length > 0) {
      // Анализ временных интервалов между farming наградами
      const timeGaps = [];
      for (let i = 1; i < farmingRewards.length; i++) {
        const prev = new Date(farmingRewards[i-1].created_at);
        const curr = new Date(farmingRewards[i].created_at);
        const gapMinutes = (curr - prev) / (1000 * 60);
        timeGaps.push(gapMinutes);
      }
      
      if (timeGaps.length > 0) {
        const avgGap = (timeGaps.reduce((sum, val) => sum + val, 0) / timeGaps.length).toFixed(2);
        const minGap = Math.min(...timeGaps).toFixed(2);
        const maxGap = Math.max(...timeGaps).toFixed(2);
        
        console.log(`⏱️ Фактические интервалы FARMING_REWARD:`);
        console.log(`   Минимальный: ${minGap} минут`);
        console.log(`   Средний: ${avgGap} минут`);
        console.log(`   Максимальный: ${maxGap} минут`);
        console.log(`   Ожидается: ~5.00 минут`);
        
        if (parseFloat(avgGap) < 4 || parseFloat(avgGap) > 6) {
          console.log(`🚨 АНОМАЛИЯ: Средний интервал ${avgGap} минут отклоняется от ожидаемых 5 минут`);
        } else {
          console.log(`✅ Интервалы планировщика в норме`);
        }
      }
    }
    
    console.log('\n=== АНАЛИЗ СТАБИЛЬНОСТИ ПЛАНИРОВЩИКОВ ЗАВЕРШЕН ===');
    
  } catch (error) {
    console.error('💥 Критическая ошибка анализа:', error);
  }
}

schedulerStabilityAnalysis();