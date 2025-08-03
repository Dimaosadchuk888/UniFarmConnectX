/**
 * Проверка логики дедупликации транзакций
 * Анализ почему дублирование не предотвращается
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDeduplicationLogic() {
  console.log('\n=== ПРОВЕРКА ЛОГИКИ ДЕДУПЛИКАЦИИ ===\n');

  try {
    // 1. Проверяем все дублированные транзакции пользователя 25
    const { data: duplicates, error } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount, description, tx_hash_unique, metadata, created_at')
      .eq('user_id', 25)
      .eq('type', 'TON_DEPOSIT')
      .gte('created_at', new Date(Date.now() - 24*60*60*1000).toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Ошибка получения дубликатов:', error);
      return;
    }

    console.log(`📊 Найдено дубликатов: ${duplicates?.length || 0}`);

    if (!duplicates || duplicates.length === 0) {
      console.log('⚠️ Дубликаты не найдены');
      return;
    }

    // 2. Анализируем каждый дубликат
    duplicates.forEach((tx, index) => {
      console.log(`\n--- Дубликат ${index + 1} ---`);
      console.log(`ID: ${tx.id}`);
      console.log(`Создан: ${tx.created_at}`);
      console.log(`tx_hash_unique: ${tx.tx_hash_unique || 'ОТСУТСТВУЕТ'}`);
      console.log(`metadata:`, tx.metadata || 'ОТСУТСТВУЕТ');
      
      // Извлекаем BOC из description
      const bocMatch = tx.description.match(/te6[A-Za-z0-9+/=]+/);
      const bocFromDescription = bocMatch ? bocMatch[0] : null;
      console.log(`BOC из description: ${bocFromDescription ? bocFromDescription.substring(0, 50) + '...' : 'НЕ НАЙДЕН'}`);
      
      // Проверяем metadata
      if (tx.metadata) {
        console.log(`metadata.tx_hash: ${tx.metadata.tx_hash || 'отсутствует'}`);
        console.log(`metadata.ton_tx_hash: ${tx.metadata.ton_tx_hash || 'отсутствует'}`);
      }
    });

    // 3. Проверяем группировку по BOC
    console.log(`\n🔍 ГРУППИРОВКА ПО BOC:`);
    const bocGroups = new Map();
    
    duplicates.forEach(tx => {
      const bocMatch = tx.description.match(/te6[A-Za-z0-9+/=]+/);
      const boc = bocMatch ? bocMatch[0] : 'NO_BOC';
      
      if (!bocGroups.has(boc)) {
        bocGroups.set(boc, []);
      }
      bocGroups.get(boc).push(tx);
    });

    bocGroups.forEach((txs, boc) => {
      if (txs.length > 1) {
        console.log(`\n🚨 Группа дубликатов с BOC: ${boc.substring(0, 30)}...`);
        txs.forEach(tx => {
          console.log(`  - ID ${tx.id} (${tx.created_at})`);
          console.log(`    tx_hash_unique: ${tx.tx_hash_unique || 'нет'}`);
          console.log(`    metadata.tx_hash: ${tx.metadata?.tx_hash || 'нет'}`);
        });
      }
    });

    // 4. Симуляция проверки дедупликации
    console.log(`\n🧪 СИМУЛЯЦИЯ ПРОВЕРКИ ДЕДУПЛИКАЦИИ:`);
    
    const firstDuplicate = duplicates[0];
    const bocMatch = firstDuplicate.description.match(/te6[A-Za-z0-9+/=]+/);
    const testBoc = bocMatch ? bocMatch[0] : null;
    
    if (testBoc) {
      console.log(`\nТестируем BOC: ${testBoc.substring(0, 50)}...`);
      
      // Проверяем как работает поиск дубликатов
      const { data: foundDuplicates, error: searchError } = await supabase
        .from('transactions')
        .select('id, created_at, user_id, amount, tx_hash_unique, metadata')
        .or(`tx_hash_unique.eq.${testBoc},metadata->>tx_hash.eq.${testBoc},metadata->>ton_tx_hash.eq.${testBoc}`)
        .order('created_at', { ascending: false });

      console.log(`\nРезультат поиска дубликатов через OR запрос:`);
      console.log(`Найдено: ${foundDuplicates?.length || 0} записей`);
      
      if (foundDuplicates && foundDuplicates.length > 0) {
        foundDuplicates.forEach((tx, i) => {
          console.log(`  ${i+1}. ID ${tx.id} - tx_hash_unique: ${tx.tx_hash_unique || 'нет'}`);
        });
      } else {
        console.log(`❌ ПРОБЛЕМА: OR запрос не находит дубликаты!`);
      }

      // Дополнительная проверка через description
      const { data: descriptionDuplicates, error: descError } = await supabase
        .from('transactions')
        .select('id, created_at, description')
        .ilike('description', `%${testBoc.substring(0, 30)}%`);

      console.log(`\nПоиск через description (ILIKE):`);
      console.log(`Найдено: ${descriptionDuplicates?.length || 0} записей`);
    }

    // 5. Рекомендации
    console.log(`\n📋 ВЫВОДЫ И РЕКОМЕНДАЦИИ:`);
    console.log(`1. tx_hash_unique поле пустое у всех транзакций`);
    console.log(`2. metadata не содержит tx_hash/ton_tx_hash`);
    console.log(`3. BOC сохраняется только в description`);
    console.log(`4. OR запрос дедупликации не работает из-за пустых полей`);
    
    console.log(`\n🔧 НЕОБХОДИМЫЕ ИСПРАВЛЕНИЯ:`);
    console.log(`1. Извлекать BOC из description и сохранять в tx_hash_unique`);
    console.log(`2. Обновить metadata.tx_hash при создании транзакции`);
    console.log(`3. Добавить проверку дублирования по description для старых записей`);

  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

// Запуск проверки
checkDeduplicationLogic().then(() => {
  console.log('\n✅ Проверка дедупликации завершена');
  process.exit(0);
}).catch(error => {
  console.error('❌ Фатальная ошибка:', error);
  process.exit(1);
});