const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function tonDepositSystemVerification() {
  console.log('=== ПРОВЕРКА СИСТЕМЫ TON ДЕПОЗИТОВ ===\n');
  
  try {
    // 1. Проверка схемы таблицы transactions
    console.log('🔍 1. Проверка схемы таблицы transactions...');
    
    const { data: transactionColumns, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'transactions')
      .order('ordinal_position');
      
    if (schemaError) {
      console.error('❌ Ошибка получения схемы transactions:', schemaError);
    } else {
      console.log('📊 Схема таблицы transactions:');
      transactionColumns?.forEach(col => {
        console.log(`   ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }
    
    // 2. Проверка enum типа transaction_type
    console.log('\n🔍 2. Проверка enum типа transaction_type...');
    
    // Попытка вставить TON_DEPOSIT для проверки
    const testUserId = 999999; // Тестовый ID
    
    try {
      const { error: insertError } = await supabase
        .from('transactions')
        .insert({
          user_id: testUserId,
          type: 'TON_DEPOSIT',
          amount: '0.001',
          currency: 'TON',
          status: 'completed',
          description: 'Test TON deposit validation'
        });
        
      if (insertError) {
        console.log('❌ TON_DEPOSIT НЕ поддерживается enum:', insertError.message);
        
        // Проверим, какие типы поддерживаются
        const { data: supportedTypes, error: typesError } = await supabase
          .from('transactions')
          .select('type')
          .limit(100);
          
        if (!typesError && supportedTypes) {
          const uniqueTypes = [...new Set(supportedTypes.map(t => t.type))];
          console.log(`📋 Поддерживаемые типы: ${uniqueTypes.join(', ')}`);
        }
      } else {
        console.log('✅ TON_DEPOSIT успешно добавлен в базу');
        
        // Удаляем тестовую запись
        await supabase
          .from('transactions')
          .delete()
          .eq('user_id', testUserId)
          .eq('description', 'Test TON deposit validation');
      }
    } catch (error) {
      console.log('❌ Ошибка тестирования TON_DEPOSIT:', error.message);
    }
    
    // 3. Поиск реальных TON депозитов в системе
    console.log('\n🔍 3. Поиск реальных TON депозитов...');
    
    // Поиск по различным паттернам
    const searchPatterns = [
      { field: 'type', value: 'TON_DEPOSIT' },
      { field: 'description', pattern: '%TON%deposit%' },
      { field: 'description', pattern: '%blockchain%' },
      { field: 'currency', value: 'TON' },
      { field: 'metadata->>blockchain_hash', pattern: '%' }
    ];
    
    for (const pattern of searchPatterns) {
      let query = supabase.from('transactions').select('id, user_id, type, amount, currency, description, metadata, created_at');
      
      if (pattern.value) {
        query = query.eq(pattern.field, pattern.value);
      } else if (pattern.pattern) {
        query = query.ilike(pattern.field, pattern.pattern);
      }
      
      const { data: results, error: searchError } = await query.limit(10);
      
      if (!searchError && results && results.length > 0) {
        console.log(`📊 Найдено по ${pattern.field}: ${results.length} транзакций`);
        results.slice(0, 3).forEach(tx => {
          console.log(`   TX ${tx.id}: User ${tx.user_id}, ${tx.type}, ${tx.amount} ${tx.currency}`);
          if (tx.metadata) {
            console.log(`     Metadata: ${JSON.stringify(tx.metadata).substring(0, 100)}...`);
          }
        });
      }
    }
    
    // 4. Поиск транзакции d1077cd0 по всем возможным полям
    console.log('\n🔍 4. Детальный поиск транзакции d1077cd0...');
    
    const hashVariations = [
      'd1077cd0bad69b623a06fe24dd848ba5ed5b25f98655a0ca51466005f53b8b2b',
      'd1077cd0',
      'bad69b623a06fe24dd848ba5ed5b25f98655a0ca51466005f53b8b2b'
    ];
    
    for (const hash of hashVariations) {
      // Поиск в различных полях
      const searchFields = [
        'description',
        'metadata->>blockchain_hash', 
        'metadata->>transaction_hash',
        'metadata->>hash',
        'metadata->>txHash'
      ];
      
      for (const field of searchFields) {
        const { data: hashResults, error: hashError } = await supabase
          .from('transactions')
          .select('*')
          .ilike(field, `%${hash}%`)
          .limit(5);
          
        if (!hashError && hashResults && hashResults.length > 0) {
          console.log(`✅ Найдено по ${field} с хешем ${hash}:`);
          hashResults.forEach(tx => {
            console.log(`   TX ${tx.id}: User ${tx.user_id}, ${tx.type}, ${tx.amount} ${tx.currency}, ${tx.created_at}`);
            console.log(`     Description: ${tx.description}`);
            if (tx.metadata) {
              console.log(`     Metadata: ${JSON.stringify(tx.metadata)}`);
            }
          });
        }
      }
    }
    
    // 5. Анализ User 228 (пострадавший пользователь)
    console.log('\n🔍 5. Анализ User 228 (пострадавший от пропущенного депозита)...');
    
    const { data: user228Data, error: user228Error } = await supabase
      .from('users')
      .select('id, telegram_id, username, balance_ton, balance_uni, created_at')
      .eq('id', 228)
      .single();
      
    if (user228Error) {
      console.log('❌ User 228 не найден в базе:', user228Error.message);
    } else {
      console.log('👤 Данные User 228:');
      console.log(`   ID: ${user228Data.id}, Telegram: ${user228Data.telegram_id}`);
      console.log(`   Username: ${user228Data.username}`);
      console.log(`   Баланс TON: ${user228Data.balance_ton}, UNI: ${user228Data.balance_uni}`);
      console.log(`   Создан: ${user228Data.created_at}`);
      
      // Транзакции User 228
      const { data: user228Txs, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', 228)
        .order('created_at', { ascending: false })
        .limit(20);
        
      if (!txError && user228Txs) {
        console.log(`📊 Транзакции User 228 (последние 20):`);
        user228Txs.forEach(tx => {
          console.log(`   TX ${tx.id}: ${tx.type}, ${tx.amount} ${tx.currency}, ${tx.status}, ${tx.created_at}`);
          if (tx.description.includes('TON') || tx.description.includes('deposit')) {
            console.log(`     ⚠️ TON-связанная транзакция: ${tx.description}`);
          }
        });
        
        // Поиск потенциальных TON депозитов
        const tonRelatedTxs = user228Txs.filter(tx => 
          tx.currency === 'TON' || 
          tx.description.toLowerCase().includes('ton') ||
          tx.description.toLowerCase().includes('deposit')
        );
        
        if (tonRelatedTxs.length > 0) {
          console.log(`💎 TON-связанные транзакции User 228: ${tonRelatedTxs.length}`);
        } else {
          console.log('❌ Нет TON-связанных транзакций у User 228');
        }
      }
    }
    
    // 6. Проверка работоспособности TON депозитов через API эндпоинты
    console.log('\n🔍 6. Анализ TON депозит API эндпоинтов...');
    
    // Анализ недавних TON транзакций всех пользователей
    const { data: recentTonTxs, error: recentTonError } = await supabase
      .from('transactions')
      .select('*')
      .eq('currency', 'TON')
      .gte('created_at', '2025-07-20T00:00:00')
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (!recentTonError && recentTonTxs) {
      console.log(`📊 TON транзакций за последние дни: ${recentTonTxs.length}`);
      
      const typeDistribution = {};
      recentTonTxs.forEach(tx => {
        typeDistribution[tx.type] = (typeDistribution[tx.type] || 0) + 1;
      });
      
      console.log('📈 Распределение по типам TON транзакций:');
      Object.entries(typeDistribution).forEach(([type, count]) => {
        console.log(`   ${type}: ${count} транзакций`);
      });
      
      // Поиск транзакций с блокчейн метаданными
      const blockchainTxs = recentTonTxs.filter(tx => 
        tx.metadata && 
        (tx.metadata.blockchain_hash || tx.metadata.transaction_hash || tx.metadata.hash)
      );
      
      console.log(`💎 TON транзакций с блокчейн метаданными: ${blockchainTxs.length}`);
      
      if (blockchainTxs.length === 0) {
        console.log('🚨 ПРОБЛЕМА: Нет TON транзакций с блокчейн хешами!');
        console.log('   Это указывает на то, что система НЕ обрабатывает реальные депозиты');
      }
    }
    
    // 7. Финальная оценка состояния TON депозитов
    console.log('\n📋 7. Финальная оценка системы TON депозитов...');
    
    // Подсчет различных метрик
    const { count: totalTonTxs } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('currency', 'TON');
      
    const { count: tonDepositTxs } = await supabase
      .from('transactions') 
      .select('*', { count: 'exact', head: true })
      .eq('type', 'TON_DEPOSIT');
      
    const { count: tonUsersWithBalance } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gt('balance_ton', 0);
      
    console.log('📊 Сводная статистика TON депозитов:');
    console.log(`   Общих TON транзакций: ${totalTonTxs || 0}`);
    console.log(`   TON_DEPOSIT транзакций: ${tonDepositTxs || 0}`);
    console.log(`   Пользователей с TON балансом: ${tonUsersWithBalance || 0}`);
    
    if ((tonDepositTxs || 0) === 0) {
      console.log('\n🚨 КРИТИЧЕСКАЯ ПРОБЛЕМА: Система TON депозитов НЕ РАБОТАЕТ');
      console.log('   - Нет TON_DEPOSIT транзакций в базе');
      console.log('   - Enum не поддерживает TON_DEPOSIT тип');
      console.log('   - Реальные депозиты не обрабатываются');
    } else {
      console.log('\n✅ Система TON депозитов функционирует');
    }
    
    console.log('\n=== ПРОВЕРКА СИСТЕМЫ TON ДЕПОЗИТОВ ЗАВЕРШЕНА ===');
    
  } catch (error) {
    console.error('💥 Критическая ошибка проверки TON депозитов:', error);
  }
}

tonDepositSystemVerification();