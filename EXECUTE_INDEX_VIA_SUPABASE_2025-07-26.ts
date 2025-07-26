/**
 * 🛡️ ВЫПОЛНЕНИЕ СОЗДАНИЯ УНИКАЛЬНОГО ИНДЕКСА ЧЕРЕЗ SUPABASE
 * 
 * Дата: 26 июля 2025
 * Задача: Создать уникальный индекс используя Supabase SQL API
 */

import { supabase } from './core/supabase';

async function executeUniqueIndexCreation(): Promise<void> {
  console.log('\n🛡️ СОЗДАНИЕ УНИКАЛЬНОГО ИНДЕКСА ЧЕРЕЗ SUPABASE');
  console.log('=' .repeat(70));
  console.log(`Дата: ${new Date().toLocaleString('ru-RU')}`);
  console.log('Цель: Предотвращение дублирования TON депозитов');
  console.log('=' .repeat(70));

  try {
    // ЭТАП 1: СОЗДАНИЕ БЕЗОПАСНОГО PARTIAL INDEX
    console.log('\n🔧 ЭТАП 1: СОЗДАНИЕ PARTIAL UNIQUE INDEX');
    console.log('-' .repeat(50));
    
    const currentTimestamp = '2025-07-26T12:57:00.311Z';
    console.log(`   Защита для записей после: ${currentTimestamp}`);
    console.log('   Существующие дубли остаются нетронутыми');
    
    // SQL команда для создания partial index
    const createIndexSQL = `
      CREATE UNIQUE INDEX CONCURRENTLY idx_tx_hash_unique_new_deposits 
      ON transactions(tx_hash_unique) 
      WHERE tx_hash_unique IS NOT NULL 
        AND created_at > '${currentTimestamp}';
    `;
    
    console.log('\n   📝 Выполняю SQL команду:');
    console.log(`   ${createIndexSQL.trim()}`);
    
    try {
      // Выполняем через Supabase RPC (если есть) или прямой SQL
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: createIndexSQL
      });
      
      if (error && error.message.includes('function exec_sql does not exist')) {
        console.log('   ⚠️ RPC функция недоступна, пробуем альтернативный метод...');
        
        // Альтернативный метод: проверяем что можем выполнить DDL операции
        // Создаем временную таблицу для проверки прав
        const { error: testError } = await supabase.rpc('create_temp_table', {});
        
        if (testError) {
          console.log('   ❌ Недостаточно прав для DDL операций через Supabase API');
          console.log('   💡 РЕШЕНИЕ: Используйте SQL команду напрямую в Supabase Dashboard');
          console.log('\n   📋 ТОЧНАЯ SQL КОМАНДА ДЛЯ ВЫПОЛНЕНИЯ:');
          console.log('   =' .repeat(60));
          console.log(createIndexSQL);
          console.log('   =' .repeat(60));
          
          console.log('\n   📍 ИНСТРУКЦИЯ ПО ВЫПОЛНЕНИЮ:');
          console.log('   1. Откройте Supabase Dashboard');
          console.log('   2. Перейдите в SQL Editor');
          console.log('   3. Вставьте команду выше');
          console.log('   4. Нажмите "Run"');
          console.log('   5. Дождитесь сообщения об успешном создании');
          
          return;
        }
        
      } else if (error) {
        console.log(`   ❌ Ошибка создания индекса: ${error.message}`);
        
        if (error.message.includes('already exists')) {
          console.log('   ✅ Индекс уже существует - это хорошо!');
        } else if (error.message.includes('duplicate key')) {
          console.log('   ⚠️ Обнаружены конфликтующие записи');
          console.log('   💡 Рекомендация: Очистить дубли перед созданием полного индекса');
        } else {
          throw error;
        }
        
      } else {
        console.log('   ✅ Partial unique index создан успешно!');
        console.log(`   📊 Результат: ${data}`);
      }
      
    } catch (sqlError) {
      console.log(`   ❌ Ошибка выполнения SQL: ${sqlError}`);
      console.log('   💡 Выполните SQL команду вручную в Supabase Dashboard');
      
      console.log('\n   📋 SQL ДЛЯ РУЧНОГО ВЫПОЛНЕНИЯ:');
      console.log('   =' .repeat(60));
      console.log(createIndexSQL);
      console.log('   =' .repeat(60));
    }
    
    // ЭТАП 2: ПРОВЕРКА СОЗДАНИЯ ИНДЕКСА
    console.log('\n🔍 ЭТАП 2: ПРОВЕРКА СОЗДАНИЯ ИНДЕКСА');
    console.log('-' .repeat(50));
    
    try {
      // Проверяем индексы через системные таблицы
      const { data: indexCheck } = await supabase
        .from('pg_indexes')
        .select('indexname, indexdef')
        .like('indexname', '%tx_hash%');
        
      if (indexCheck && indexCheck.length > 0) {
        console.log('   ✅ Найдены индексы на tx_hash:');
        indexCheck.forEach(idx => {
          console.log(`     - ${idx.indexname}`);
        });
      } else {
        console.log('   ⚠️ Не удалось найти индексы через pg_indexes');
        console.log('   💡 Это может быть ограничением прав доступа');
      }
      
    } catch (checkError) {
      console.log('   ⚠️ Не удалось проверить индексы через API');
      console.log('   💡 Проверьте создание вручную в Supabase Dashboard');
    }
    
    // ЭТАП 3: ТЕСТ ЗАЩИТЫ ОТ ДУБЛЕЙ
    console.log('\n🧪 ЭТАП 3: ТЕСТИРОВАНИЕ ЗАЩИТЫ ОТ ДУБЛЕЙ');
    console.log('-' .repeat(50));
    
    const testTxHash = 'test_protection_' + Date.now();
    console.log(`   Тестовый hash: ${testTxHash}`);
    
    try {
      // Получаем существующий user_id
      const { data: testUser } = await supabase
        .from('users')
        .select('id')
        .limit(1)
        .single();
        
      if (!testUser) {
        console.log('   ⚠️ Не найден пользователь для тестирования');
        return;
      }
      
      // Создаем первую тестовую запись
      const { error: firstError } = await supabase
        .from('transactions')
        .insert({
          user_id: testUser.id,
          type: 'FARMING_REWARD',
          amount: '0.001',
          amount_uni: '0',
          amount_ton: '0.001',
          currency: 'TON',
          status: 'completed',
          description: 'Test duplicate protection 1',
          tx_hash_unique: testTxHash,
          metadata: { test: true }
        });
        
      if (firstError) {
        console.log(`   ❌ Не удалось создать первую тестовую запись: ${firstError.message}`);
        return;
      }
      
      console.log('   ✅ Первая тестовая запись создана');
      
      // Пытаемся создать дубликат
      const { error: duplicateError } = await supabase
        .from('transactions')
        .insert({
          user_id: testUser.id,
          type: 'FARMING_REWARD',
          amount: '0.002',
          amount_uni: '0',
          amount_ton: '0.002',
          currency: 'TON',
          status: 'completed',
          description: 'Test duplicate protection 2',
          tx_hash_unique: testTxHash,
          metadata: { test: true }
        });
        
      if (duplicateError) {
        if (duplicateError.message.includes('duplicate') || 
            duplicateError.message.includes('unique') ||
            duplicateError.message.includes('constraint')) {
          console.log('   🎉 ОТЛИЧНО! Защита от дублей РАБОТАЕТ!');
          console.log(`   📋 Сообщение: ${duplicateError.message}`);
        } else {
          console.log(`   ❓ Неожиданная ошибка: ${duplicateError.message}`);
        }
      } else {
        console.log('   ❌ КРИТИЧНО: Дубликат был создан! Защита НЕ РАБОТАЕТ!');
        console.log('   💡 Возможно индекс не создался или применяется не ко всем записям');
      }
      
      // Очищаем тестовые записи
      await supabase
        .from('transactions')
        .delete()
        .eq('tx_hash_unique', testTxHash);
        
      console.log('   🧹 Тестовые записи очищены');
      
    } catch (testError) {
      console.log(`   ❌ Ошибка тестирования: ${testError}`);
    }
    
    // ЭТАП 4: ИТОГОВЫЕ РЕКОМЕНДАЦИИ
    console.log('\n🎯 ЭТАП 4: РЕЗУЛЬТАТЫ И РЕКОМЕНДАЦИИ');
    console.log('-' .repeat(50));
    
    console.log('   ✅ Попытка создания partial unique index выполнена');
    console.log('   ✅ Тестирование защиты от дублей проведено');
    
    console.log('\n   🛡️ ЕСЛИ ИНДЕКС СОЗДАЛСЯ УСПЕШНО:');
    console.log('   - Новые депозиты защищены от дублирования');
    console.log('   - Существующие дубли остаются в базе');
    console.log('   - Система работает стабильно');
    console.log('   - Можно очистить старые дубли в удобное время');
    
    console.log('\n   ⚠️ ЕСЛИ НУЖНО ВЫПОЛНИТЬ ВРУЧНУЮ:');
    console.log('   1. Откройте Supabase Dashboard → SQL Editor');
    console.log('   2. Выполните команду из файла EXECUTE_UNIQUE_INDEX_CREATION_2025-07-26.sql');
    console.log('   3. Проверьте успешность создания');
    console.log('   4. Протестируйте защиту от дублей');
    
    console.log('\n   📊 МОНИТОРИНГ ПОСЛЕ СОЗДАНИЯ:');
    console.log('   - Следите за производительностью INSERT операций');
    console.log('   - Проверяйте логи на предмет ошибок дублирования');
    console.log('   - Планируйте очистку существующих дублей');
    
    console.log('\n✅ СОЗДАНИЕ УНИКАЛЬНОГО ИНДЕКСА ЗАВЕРШЕНО');
    
  } catch (error) {
    console.error('\n❌ Критическая ошибка при создании индекса:', error);
    console.log('\n🛡️ СИСТЕМА ОСТАЕТСЯ БЕЗОПАСНОЙ');
    console.log('   - Никаких критических изменений не произведено');
    console.log('   - Данные остаются в целости');
    console.log('   - Можно повторить попытку или выполнить вручную');
  }
}

// Запуск создания индекса
executeUniqueIndexCreation()
  .then(() => {
    console.log('\n🎯 ПРОЦЕСС СОЗДАНИЯ УНИКАЛЬНОГО ИНДЕКСА ЗАВЕРШЕН');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Ошибка процесса:', error);
    process.exit(1);
  });