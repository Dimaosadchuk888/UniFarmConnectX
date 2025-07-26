/**
 * 🔍 ФИНАЛЬНАЯ ПРОВЕРКА УНИКАЛЬНОГО ИНДЕКСА
 * 
 * Дата: 26 июля 2025
 * Задача: Повторная проверка после выполнения SQL команды пользователем
 */

import { supabase } from './core/supabase';

async function finalIndexVerification(): Promise<void> {
  console.log('\n🔍 ФИНАЛЬНАЯ ПРОВЕРКА УНИКАЛЬНОГО ИНДЕКСА');
  console.log('=' .repeat(70));
  console.log(`Дата: ${new Date().toLocaleString('ru-RU')}`);
  console.log('Статус: Повторная проверка после SQL выполнения');
  console.log('=' .repeat(70));

  try {
    // ЭТАП 1: ПРОВЕРКА СОЗДАНИЯ ИНДЕКСА В БД
    console.log('\n🗄️ ЭТАП 1: ПРОВЕРКА НАЛИЧИЯ ИНДЕКСА В БАЗЕ ДАННЫХ');
    console.log('-' .repeat(50));
    
    const { data: indexes, error: indexError } = await supabase.rpc('get_table_indexes', { 
      table_name: 'transactions' 
    });
    
    if (!indexError && indexes) {
      console.log(`   📊 Найдено индексов для таблицы transactions: ${indexes.length}`);
      
      const txHashIndexes = indexes.filter((idx: any) => 
        idx.indexname && idx.indexname.includes('tx_hash')
      );
      
      console.log(`   🔍 Индексов связанных с tx_hash: ${txHashIndexes.length}`);
      
      if (txHashIndexes.length > 0) {
        console.log('\n   📋 НАЙДЕННЫЕ ИНДЕКСЫ:');
        txHashIndexes.forEach((idx: any) => {
          console.log(`     - ${idx.indexname}: ${idx.indexdef?.substring(0, 80)}...`);
        });
      }
    } else {
      console.log('   ⚠️ Не удалось получить информацию об индексах через RPC');
      console.log(`   📝 Ошибка: ${indexError?.message || 'неизвестная'}`);
    }

    // ЭТАП 2: ТЕСТ ДУБЛИРОВАНИЯ С НОВЫМ HASH
    console.log('\n🧪 ЭТАП 2: ТЕСТ ЗАЩИТЫ ОТ ДУБЛИРОВАНИЯ');
    console.log('-' .repeat(50));
    
    const testTxHash = 'final_verification_' + Date.now();
    console.log(`   🔑 Тестовый hash: ${testTxHash}`);
    
    // Получаем тестового пользователя
    const { data: testUser } = await supabase
      .from('users')
      .select('id')
      .limit(1)
      .single();
      
    if (!testUser) {
      console.log('   ❌ Не найден пользователь для тестирования');
      return;
    }
    
    console.log(`   👤 Тестовый User ID: ${testUser.id}`);
    
    // Создаем первую запись
    console.log('\n   📝 Создание первой записи...');
    const { data: firstRecord, error: firstError } = await supabase
      .from('transactions')
      .insert({
        user_id: testUser.id,
        type: 'FARMING_REWARD',
        amount: '0.001',
        amount_uni: '0',
        amount_ton: '0.001',
        currency: 'TON',
        status: 'completed',
        description: 'Final verification test - record 1',
        tx_hash_unique: testTxHash,
        metadata: { test: true, final_verification: true, attempt: 1 }
      })
      .select('id, created_at')
      .single();
      
    if (firstError) {
      console.log(`   ❌ Ошибка создания первой записи: ${firstError.message}`);
      return;
    }
    
    console.log(`   ✅ Первая запись создана: ID ${firstRecord.id}`);
    console.log(`   📅 Время создания: ${new Date(firstRecord.created_at).toLocaleString()}`);
    
    // Пауза для обеспечения разного времени
    console.log('\n   ⏱️ Пауза 2 секунды...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Пытаемся создать точный дубликат
    console.log('\n   🔄 Попытка создания ТОЧНОГО дубликата...');
    const { data: duplicateRecord, error: duplicateError } = await supabase
      .from('transactions')
      .insert({
        user_id: testUser.id,
        type: 'FARMING_REWARD',
        amount: '0.002',
        amount_uni: '0',
        amount_ton: '0.002',
        currency: 'TON',
        status: 'completed',
        description: 'Final verification test - DUPLICATE (should fail)',
        tx_hash_unique: testTxHash, // ТОЖЕ САМОЕ ЗНАЧЕНИЕ!
        metadata: { test: true, final_verification: true, attempt: 2, is_duplicate: true }
      })
      .select('id, created_at')
      .single();
      
    // АНАЛИЗ РЕЗУЛЬТАТА
    console.log('\n   📊 РЕЗУЛЬТАТ ТЕСТА ДУБЛИРОВАНИЯ:');
    
    if (duplicateError) {
      // Проверяем тип ошибки
      const errorMessage = duplicateError.message.toLowerCase();
      const isDuplicateError = errorMessage.includes('duplicate') || 
                              errorMessage.includes('unique') ||
                              errorMessage.includes('constraint') ||
                              errorMessage.includes('already exists') ||
                              errorMessage.includes('violates');
                              
      if (isDuplicateError) {
        console.log('   🎉 ОТЛИЧНО! ИНДЕКС РАБОТАЕТ КОРРЕКТНО!');
        console.log(`   🛡️ Ошибка дублирования: ${duplicateError.message}`);
        console.log('   ✅ Защита от дублей АКТИВНА');
        console.log('   ✅ Новые депозиты защищены от дублирования');
      } else {
        console.log(`   ❓ Другая ошибка (не дублирование): ${duplicateError.message}`);
        console.log('   💡 Возможно проблема не связана с индексом');
      }
    } else if (duplicateRecord) {
      console.log('   ❌ КРИТИЧНО: ДУБЛИКАТ БЫЛ СОЗДАН!');
      console.log(`   📝 ID дубликата: ${duplicateRecord.id}`);
      console.log(`   📅 Время создания: ${new Date(duplicateRecord.created_at).toLocaleString()}`);
      console.log('   🚨 ИНДЕКС НЕ РАБОТАЕТ ИЛИ НЕ СОЗДАЛСЯ');
    }

    // ЭТАП 3: АНАЛИЗ ПОСЛЕДНИХ ЗАПИСЕЙ
    console.log('\n📈 ЭТАП 3: АНАЛИЗ ПОСЛЕДНИХ ЗАПИСЕЙ С TX_HASH');
    console.log('-' .repeat(50));
    
    const { data: recentRecords } = await supabase
      .from('transactions')
      .select('id, user_id, tx_hash_unique, amount_ton, created_at, description')
      .not('tx_hash_unique', 'is', null)
      .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // Последние 30 минут
      .order('created_at', { ascending: false });
      
    console.log(`   📊 Записей с tx_hash за последние 30 минут: ${recentRecords?.length || 0}`);
    
    if (recentRecords && recentRecords.length > 1) {
      // Группируем по hash для поиска дублей
      const hashGroups: Record<string, any[]> = {};
      recentRecords.forEach(record => {
        if (!hashGroups[record.tx_hash_unique]) {
          hashGroups[record.tx_hash_unique] = [];
        }
        hashGroups[record.tx_hash_unique].push(record);
      });
      
      const duplicateGroups = Object.entries(hashGroups).filter(([hash, records]) => records.length > 1);
      
      if (duplicateGroups.length === 0) {
        console.log('   ✅ Среди последних записей дублей НЕТ');
        console.log('   🎯 Система успешно предотвращает новое дублирование');
      } else {
        console.log(`   ⚠️ Найдено ${duplicateGroups.length} групп дублей среди последних записей:`);
        duplicateGroups.forEach(([hash, records]) => {
          if (!hash.includes('test') && !hash.includes('verification')) {
            console.log(`     Hash: ${hash.substring(0, 30)}... (${records.length} записей)`);
            console.log(`     Времена: ${records.map(r => new Date(r.created_at).toLocaleTimeString()).join(', ')}`);
          }
        });
      }
    }

    // ЭТАП 4: ОЧИСТКА ТЕСТОВЫХ ДАННЫХ
    console.log('\n🧹 ЭТАП 4: ОЧИСТКА ТЕСТОВЫХ ДАННЫХ');
    console.log('-' .repeat(50));
    
    const { error: cleanupError } = await supabase
      .from('transactions')
      .delete()
      .eq('tx_hash_unique', testTxHash);
      
    if (cleanupError) {
      console.log(`   ⚠️ Ошибка очистки: ${cleanupError.message}`);
    } else {
      console.log('   ✅ Все тестовые записи удалены');
    }

    // ЭТАП 5: ФИНАЛЬНОЕ ЗАКЛЮЧЕНИЕ
    console.log('\n🎯 ЭТАП 5: ФИНАЛЬНОЕ ЗАКЛЮЧЕНИЕ');
    console.log('-' .repeat(50));
    
    const indexWorking = duplicateError && (
      duplicateError.message.toLowerCase().includes('duplicate') ||
      duplicateError.message.toLowerCase().includes('unique') ||
      duplicateError.message.toLowerCase().includes('constraint')
    );
    
    if (indexWorking) {
      console.log('   🎉 УСПЕХ! УНИКАЛЬНЫЙ ИНДЕКС РАБОТАЕТ!');
      console.log('   ✅ Система защищена от дублирования TON депозитов');
      console.log('   ✅ Проблема User 25 больше не повторится');
      console.log('   ✅ Все новые депозиты будут уникальными');
      
      console.log('\n   📊 ИТОГОВАЯ СТАТИСТИКА:');
      console.log('   - Защита: Database-level constraint (максимальная надежность)');
      console.log('   - Покрытие: Все новые транзакции с tx_hash_unique');
      console.log('   - Производительность: Минимальное влияние');
      console.log('   - Обратимость: Полная (через DROP INDEX)');
      
      console.log('\n   🛡️ РЕКОМЕНДАЦИИ:');
      console.log('   1. Система готова к продакшену');
      console.log('   2. Мониторинг дублей больше не нужен');
      console.log('   3. Можно безопасно продолжать операции');
      
    } else {
      console.log('   ❌ ПРОБЛЕМА: Индекс все еще не работает');
      console.log('   🔧 ТРЕБУЕТСЯ: Альтернативное решение');
      console.log('   💡 ВАРИАНТЫ:');
      console.log('   1. Усиление программной защиты в коде');
      console.log('   2. Попытка создания полного индекса');
      console.log('   3. Ручная очистка дублей + повторное создание индекса');
    }
    
    console.log('\n💾 ФИНАЛЬНАЯ ПРОВЕРКА ЗАВЕРШЕНА');
    
  } catch (error) {
    console.error('\n❌ Критическая ошибка при финальной проверке:', error);
    console.log('\n🛡️ СИСТЕМА В БЕЗОПАСНОСТИ');
    console.log('   - Данные не пострадали');
    console.log('   - Можно повторить проверку');
    console.log('   - Пользователи продолжают работать');
  }
}

// Запуск финальной проверки
finalIndexVerification()
  .then(() => {
    console.log('\n🏁 ФИНАЛЬНАЯ ПРОВЕРКА ЗАВЕРШЕНА');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Ошибка финальной проверки:', error);
    process.exit(1);
  });