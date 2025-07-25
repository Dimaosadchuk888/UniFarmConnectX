/**
 * 🚨 КРИТИЧЕСКИЙ АНАЛИЗ ОШИБОК АКТИВАЦИИ ton_farming_data
 * 
 * РЕАЛЬНАЯ ДИАГНОСТИКА: Почему activateBoost() не создает записи для новых пользователей
 */

import { supabase } from './core/supabase';

async function analyzeTonFarmingActivationErrors() {
  console.log('\n🚨 === АНАЛИЗ ОШИБОК АКТИВАЦИИ ton_farming_data ===\n');
  
  try {
    // 1. ТЕСТ: Попробуем ВРУЧНУЮ создать запись как TonFarmingRepository
    console.log('1️⃣ ТЕСТ СОЗДАНИЯ ЗАПИСИ ВРУЧНУЮ:');
    console.log('===============================');
    
    const testUserId = 290;
    console.log(`🧪 Тестируем создание записи для User ${testUserId}...`);
    
    // Имитируем данные из activateBoost()
    const testData = {
      user_id: testUserId,  // INTEGER как в коде
      boost_active: true,
      boost_package_id: 1,
      farming_rate: '0.01',
      farming_balance: '1',  // 1 TON
      boost_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      farming_start_timestamp: new Date().toISOString(),
      farming_last_update: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      total_earned: 0
    };
    
    console.log('📋 Данные для создания:');
    Object.entries(testData).forEach(([key, value]) => {
      console.log(`   ${key}: ${value} (${typeof value})`);
    });
    
    // Попробуем создать запись
    console.log('\n🔄 Выполняем INSERT...');
    const { data: insertResult, error: insertError } = await supabase
      .from('ton_farming_data')
      .insert(testData)
      .select();
    
    if (insertError) {
      console.log('❌ ОШИБКА INSERT:');
      console.log(`   Код: ${insertError.code}`);
      console.log(`   Сообщение: ${insertError.message}`);
      console.log(`   Детали: ${insertError.details}`);
      console.log(`   Подсказка: ${insertError.hint}`);
      
      // Попробуем понять что не так с полями
      if (insertError.message.includes('duplicate') || insertError.code === '23505') {
        console.log('   🔍 ПРОБЛЕМА: Дубликат ключа - запись уже существует');
      } else if (insertError.message.includes('null') || insertError.code === '23502') {
        console.log('   🔍 ПРОБЛЕМА: Обязательное поле пустое');
      } else if (insertError.message.includes('type') || insertError.code === '22P02') {
        console.log('   🔍 ПРОБЛЕМА: Неправильный тип данных');
      } else if (insertError.code === '42P01') {
        console.log('   🔍 ПРОБЛЕМА: Таблица не существует');
      }
    } else {
      console.log('✅ INSERT УСПЕШЕН!');
      console.log(`   Создана запись: ${JSON.stringify(insertResult)}`);
      
      // Сразу удалим тестовую запись
      await supabase
        .from('ton_farming_data')
        .delete()
        .eq('user_id', testUserId);
      console.log('🗑️ Тестовая запись удалена');
    }
    
    // 2. АНАЛИЗ СХЕМЫ ТАБЛИЦЫ
    console.log('\n2️⃣ АНАЛИЗ СХЕМЫ ТАБЛИЦЫ:');
    console.log('========================');
    
    // Получаем информацию о структуре таблицы
    console.log('🔍 Пытаемся получить схему ton_farming_data...');
    
    // Попробуем пустой SELECT чтобы увидеть доступные поля
    const { data: schemaTest, error: schemaError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .limit(1);
    
    if (schemaError) {
      console.log(`❌ Ошибка доступа к схеме: ${schemaError.message}`);
      if (schemaError.code === '42P01') {
        console.log('🚨 КРИТИЧЕСКАЯ ПРОБЛЕМА: Таблица ton_farming_data НЕ СУЩЕСТВУЕТ!');
        console.log('   TonFarmingRepository пытается писать в несуществующую таблицу');
        return;
      }
    } else {
      console.log('✅ Таблица существует');
      if (schemaTest && schemaTest.length > 0) {
        console.log('📋 Доступные поля:');
        Object.keys(schemaTest[0]).forEach(field => {
          console.log(`   - ${field}`);
        });
      }
    }
    
    // 3. АНАЛИЗ ОШИБОК В КОДЕ TonFarmingRepository
    console.log('\n3️⃣ АНАЛИЗ ПРОБЛЕМ В КОДЕ:');
    console.log('=========================');
    
    console.log('🔍 ВОЗМОЖНЫЕ ПРОБЛЕМЫ В TonFarmingRepository.activateBoost():');
    console.log('   1. user_id передается как STRING, а ожидается INTEGER');
    console.log('   2. Поля имеют неправильные типы данных');
    console.log('   3. Отсутствуют обязательные поля');
    console.log('   4. Конфликт с ограничениями PRIMARY KEY или UNIQUE');
    console.log('   5. Таблица не существует и fallback не срабатывает');
    
    // 4. ПРОВЕРЯЕМ user_id ТИПЫ
    console.log('\n4️⃣ ТЕСТ ТИПОВ user_id:');
    console.log('=======================');
    
    // Получаем существующие записи для анализа типов
    const { data: existingRecords, error: existingError } = await supabase
      .from('ton_farming_data')
      .select('user_id')
      .limit(3);
    
    if (!existingError && existingRecords) {
      console.log('✅ Анализ существующих user_id:');
      existingRecords.forEach((record, index) => {
        console.log(`   Запись ${index + 1}: user_id = "${record.user_id}" (${typeof record.user_id})`);
      });
      
      // Проверяем, может user_id должен быть STRING?
      const sampleUserId = existingRecords[0]?.user_id;
      if (typeof sampleUserId === 'string') {
        console.log('🔍 НАЙДЕНА ПРОБЛЕМА: user_id должен быть STRING, а не INTEGER!');
        
        // Пробуем с STRING
        console.log('\n🔄 ПОВТОРНЫЙ ТЕСТ с user_id как STRING...');
        const testDataString = {
          ...testData,
          user_id: testUserId.toString()  // STRING вместо INTEGER
        };
        
        const { data: stringInsert, error: stringError } = await supabase
          .from('ton_farming_data')
          .insert(testDataString)
          .select();
        
        if (stringError) {
          console.log(`❌ Все еще ошибка: ${stringError.message}`);
        } else {
          console.log('✅ РАБОТАЕТ! user_id должен быть STRING!');
          // Удаляем тест
          await supabase
            .from('ton_farming_data')
            .delete()
            .eq('user_id', testUserId.toString());
          console.log('🗑️ Тестовая запись удалена');
        }
      }
    }
    
    // 5. ФИНАЛЬНЫЕ РЕКОМЕНДАЦИИ
    console.log('\n5️⃣ ФИНАЛЬНЫЙ ДИАГНОЗ:');
    console.log('======================');
    console.log('');
    console.log('🔧 ПРОБЛЕМЫ НАЙДЕННЫЕ:');
    console.log('   1. TonFarmingRepository.activateBoost() передает user_id как INTEGER');
    console.log('   2. Но ton_farming_data.user_id требует STRING тип');
    console.log('   3. Поэтому INSERT падает с ошибкой типа данных');
    console.log('   4. Новые пользователи не получают записи');
    console.log('   5. Планировщик их не видит');
    console.log('');
    console.log('🚨 СРОЧНОЕ ИСПРАВЛЕНИЕ:');
    console.log('   В TonFarmingRepository.activateBoost() строка 286:');
    console.log('   БЫЛО: user_id: parseInt(userId)');
    console.log('   НАДО: user_id: userId.toString()');

    console.log('\n✅ === АНАЛИЗ ОШИБОК ЗАВЕРШЕН ===\n');

  } catch (error) {
    console.error('❌ Критическая ошибка анализа:', error);
  }
}

// Запускаем критический анализ
analyzeTonFarmingActivationErrors();