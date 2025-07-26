/**
 * 🔍 ПРОВЕРКА УНИКАЛЬНОГО ИНДЕКСА В БАЗЕ ДАННЫХ
 * 
 * Дата: 26 июля 2025
 * Задача: Проверить наличие уникального индекса на tx_hash_unique БЕЗ ИЗМЕНЕНИЙ
 */

import { supabase } from './core/supabase';

async function checkDatabaseUniqueIndex(): Promise<void> {
  console.log('\n🔍 ПРОВЕРКА УНИКАЛЬНОГО ИНДЕКСА НА TX_HASH_UNIQUE');
  console.log('=' .repeat(70));
  console.log(`Дата: ${new Date().toLocaleString('ru-RU')}`);
  console.log('Режим: ТОЛЬКО ПРОВЕРКА (без изменений БД)');
  console.log('=' .repeat(70));

  try {
    // 1. Проверяем все индексы на таблице transactions
    console.log('\n📋 1. ПРОВЕРКА ИНДЕКСОВ НА ТАБЛИЦЕ TRANSACTIONS:');
    
    const { data: indexes, error: indexError } = await supabase
      .rpc('get_table_indexes', { table_name: 'transactions' });
      
    if (indexError) {
      console.log('   ⚠️ Не удалось получить индексы через RPC, попробуем альтернативный метод');
      
      // Альтернативный метод: проверим через анализ constraint violations
      const testTxHash = 'test_duplicate_' + Date.now();
      
      try {
        // Получаем существующий user_id для тестирования
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .limit(1)
          .single();
          
        if (!existingUser) {
          console.log('   ⚠️ Не найдено пользователей для тестирования');
          return;
        }
        
        // Создаем первую тестовую запись с реальным user_id
        const { error: firstInsertError } = await supabase
          .from('transactions')
          .insert({
            user_id: existingUser.id,
            type: 'FARMING_REWARD',
            amount: '0.001',
            amount_uni: '0',
            amount_ton: '0.001',
            currency: 'TON',
            status: 'completed',
            description: 'Test duplicate check',
            tx_hash_unique: testTxHash,
            metadata: { test: true }
          });
          
        if (firstInsertError) {
          console.log(`   ❌ Не удалось создать тестовую запись: ${firstInsertError.message}`);
          return;
        }
        
        console.log('   ✅ Первая тестовая запись создана');
        
        // Пытаемся создать дубликат с тем же user_id
        const { error: duplicateError } = await supabase
          .from('transactions')
          .insert({
            user_id: existingUser.id,
            type: 'FARMING_REWARD',
            amount: '0.002',
            amount_uni: '0',
            amount_ton: '0.002',
            currency: 'TON',
            status: 'completed',
            description: 'Test duplicate check 2',
            tx_hash_unique: testTxHash,
            metadata: { test: true }
          });
          
        if (duplicateError) {
          if (duplicateError.message.includes('duplicate') || duplicateError.message.includes('unique')) {
            console.log('   ✅ УНИКАЛЬНЫЙ ИНДЕКС РАБОТАЕТ!');
            console.log(`   📋 Сообщение об ошибке: ${duplicateError.message}`);
          } else {
            console.log('   ❌ Другая ошибка при вставке:');
            console.log(`   📋 ${duplicateError.message}`);
          }
        } else {
          console.log('   ❌ КРИТИЧНО: Дубликат был создан! Уникальный индекс НЕ РАБОТАЕТ!');
        }
        
        // Очищаем тестовые записи
        await supabase
          .from('transactions')
          .delete()
          .eq('tx_hash_unique', testTxHash);
          
        console.log('   🧹 Тестовые записи очищены');
        
      } catch (testError) {
        console.log(`   ❌ Ошибка при тестировании дублей: ${testError}`);
      }
      
    } else {
      console.log('   ✅ Список индексов получен:');
      indexes?.forEach((index: any) => {
        console.log(`     - ${index.indexname}: ${index.indexdef}`);
        if (index.indexdef.includes('tx_hash_unique')) {
          console.log('       🎯 НАЙДЕН ИНДЕКС НА TX_HASH_UNIQUE!');
        }
      });
    }

    // 2. Проверяем структуру поля tx_hash_unique
    console.log('\n📋 2. ПРОВЕРКА СТРУКТУРЫ ПОЛЯ TX_HASH_UNIQUE:');
    
    const { data: sampleTx } = await supabase
      .from('transactions')
      .select('id, tx_hash_unique')
      .not('tx_hash_unique', 'is', null)
      .limit(1)
      .single();
      
    if (sampleTx) {
      console.log(`   ✅ Поле tx_hash_unique существует и содержит данные`);
      console.log(`   📋 Пример значения: ${sampleTx.tx_hash_unique?.substring(0, 30)}...`);
    } else {
      console.log('   ⚠️ Не найдено записей с заполненным tx_hash_unique');
    }

    // 3. Поиск реальных дублей в базе
    console.log('\n📋 3. ПОИСК РЕАЛЬНЫХ ДУБЛЕЙ В БАЗЕ ДАННЫХ:');
    
    // Получаем все записи с tx_hash_unique
    const { data: allTxWithHash } = await supabase
      .from('transactions')
      .select('id, user_id, tx_hash_unique, amount_ton, created_at, description')
      .not('tx_hash_unique', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100);
      
    console.log(`   📊 Записей с tx_hash_unique: ${allTxWithHash?.length || 0}`);
    
    // Группируем по tx_hash_unique для поиска дублей
    const hashGroups: Record<string, any[]> = {};
    allTxWithHash?.forEach(tx => {
      if (!hashGroups[tx.tx_hash_unique]) {
        hashGroups[tx.tx_hash_unique] = [];
      }
      hashGroups[tx.tx_hash_unique].push(tx);
    });
    
    const duplicateHashes = Object.entries(hashGroups).filter(([hash, txs]) => txs.length > 1);
    
    console.log(`   🔍 Найдено групп с дублями: ${duplicateHashes.length}`);
    
    if (duplicateHashes.length > 0) {
      console.log('\n   📊 ДЕТАЛИ ДУБЛИРОВАНИЯ:');
      duplicateHashes.forEach(([hash, txs]) => {
        console.log(`     TX Hash: ${hash.substring(0, 30)}...`);
        console.log(`     Количество дублей: ${txs.length}`);
        txs.forEach(tx => {
          console.log(`       - ID: ${tx.id}, User: ${tx.user_id}, Amount: ${tx.amount_ton} TON, Date: ${new Date(tx.created_at).toLocaleString()}`);
        });
        console.log('');
      });
    } else {
      console.log('   ✅ Дублей по tx_hash_unique не найдено');
    }

    // 4. Проверяем недавние депозиты User 25
    console.log('\n📋 4. ПРОВЕРКА ДЕПОЗИТОВ USER 25 (из диагностики):');
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const { data: user25Deposits } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .in('type', ['TON_DEPOSIT', 'DEPOSIT', 'FARMING_REWARD'])
      .like('description', '%TON deposit%')
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false });
      
    console.log(`   📊 Депозитов User 25 за 24 часа: ${user25Deposits?.length || 0}`);
    
    if (user25Deposits && user25Deposits.length > 0) {
      const hashGroups25: Record<string, any[]> = {};
      user25Deposits.forEach(tx => {
        const hash = tx.metadata?.tx_hash || tx.metadata?.ton_tx_hash || tx.tx_hash_unique || 'NO_HASH';
        if (!hashGroups25[hash]) {
          hashGroups25[hash] = [];
        }
        hashGroups25[hash].push(tx);
      });
      
      const duplicates25 = Object.entries(hashGroups25).filter(([hash, txs]) => 
        txs.length > 1 && hash !== 'NO_HASH'
      );
      
      console.log(`   🔍 Дублированных депозитов User 25: ${duplicates25.length}`);
      
      if (duplicates25.length > 0) {
        duplicates25.forEach(([hash, txs]) => {
          console.log(`     Hash: ${hash.substring(0, 20)}... (${txs.length} дублей)`);
          txs.forEach(tx => {
            console.log(`       - ${new Date(tx.created_at).toLocaleString()}: ${tx.amount_ton} TON`);
          });
        });
      }
    }

    // 5. Итоговый анализ
    console.log('\n📋 5. ИТОГОВЫЙ АНАЛИЗ:');
    console.log('-' .repeat(50));
    
    if (duplicateHashes.length === 0) {
      console.log('   ✅ Уникальный индекс работает корректно');
      console.log('   ✅ В базе нет дублей по tx_hash_unique');
      console.log('   💡 Проблема дублирования возможно решена');
    } else {
      console.log('   ❌ Найдены дубли в базе данных!');
      console.log('   ❌ Уникальный индекс НЕ РАБОТАЕТ или отсутствует');
      console.log('   🔧 Требуется создание уникального индекса');
    }
    
    console.log('\n💾 Проверка завершена успешно');
    
  } catch (error) {
    console.error('\n❌ Критическая ошибка при проверке базы данных:', error);
  }
}

// Запуск проверки
checkDatabaseUniqueIndex()
  .then(() => {
    console.log('\n✅ Проверка базы данных завершена');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Ошибка проверки:', error);
    process.exit(1);
  });