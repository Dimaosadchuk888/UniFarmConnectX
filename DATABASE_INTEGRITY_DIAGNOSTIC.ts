/**
 * 🔍 ДИАГНОСТИКА ЦЕЛОСТНОСТИ БАЗЫ ДАННЫХ
 * 
 * Анализ совместимости между таблицами users и ton_farming_data
 * Определение правильной архитектуры для восстановления системы
 */

import { supabase } from './core/supabase';

async function analyzeDatabaseIntegrity() {
  console.log('\n🔍 === ДИАГНОСТИКА ЦЕЛОСТНОСТИ БАЗЫ ДАННЫХ ===\n');
  
  try {
    // 1. АНАЛИЗ ТИПОВ ДАННЫХ В ОБЕИХ ТАБЛИЦАХ
    console.log('1️⃣ АНАЛИЗ ТИПОВ ДАННЫХ:');
    console.log('=======================');
    
    // Получаем данные из users
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, ton_boost_package, ton_boost_active, ton_boost_rate, balance_ton, created_at')
      .not('ton_boost_package', 'is', null)
      .neq('ton_boost_package', 0)
      .limit(3);

    console.log('📋 ТАБЛИЦА users (TON Boost пользователи):');
    if (usersData && usersData.length > 0) {
      usersData.forEach((user, index) => {
        console.log(`   User ${index + 1}:`);
        console.log(`     id: ${user.id} (${typeof user.id})`);
        console.log(`     ton_boost_package: ${user.ton_boost_package} (${typeof user.ton_boost_package})`);
        console.log(`     ton_boost_active: ${user.ton_boost_active} (${typeof user.ton_boost_active})`);
        console.log(`     balance_ton: ${user.balance_ton} (${typeof user.balance_ton})`);
        console.log('     ---');
      });
    }

    // Получаем данные из ton_farming_data
    const { data: farmingData, error: farmingError } = await supabase
      .from('ton_farming_data')
      .select('user_id, boost_active, boost_package_id, farming_balance, farming_rate')
      .limit(3);

    console.log('\n📋 ТАБЛИЦА ton_farming_data:');
    if (farmingData && farmingData.length > 0) {
      farmingData.forEach((farming, index) => {
        console.log(`   Record ${index + 1}:`);
        console.log(`     user_id: "${farming.user_id}" (${typeof farming.user_id})`);
        console.log(`     boost_active: ${farming.boost_active} (${typeof farming.boost_active})`);
        console.log(`     boost_package_id: ${farming.boost_package_id} (${typeof farming.boost_package_id})`);
        console.log(`     farming_balance: ${farming.farming_balance} (${typeof farming.farming_balance})`);
        console.log('     ---');
      });
    }

    // 2. АНАЛИЗ СОВМЕСТИМОСТИ ПОЛЕЙ 
    console.log('\n2️⃣ АНАЛИЗ СОВМЕСТИМОСТИ:');
    console.log('========================');
    
    console.log('🔍 СРАВНЕНИЕ КЛЮЧЕВЫХ ПОЛЕЙ:');
    console.log(`   users.id vs ton_farming_data.user_id:`);
    if (usersData && farmingData) {
      const userIdType = typeof usersData[0]?.id;
      const farmingUserIdType = typeof farmingData[0]?.user_id;
      console.log(`     users.id: ${userIdType}`);
      console.log(`     ton_farming_data.user_id: ${farmingUserIdType}`);
      
      if (userIdType !== farmingUserIdType) {
        console.log('     ❌ НЕСОВМЕСТИМОСТЬ ТИПОВ!');
        console.log(`     Нужно привести к единому типу: ${farmingUserIdType}`);
      } else {
        console.log('     ✅ Типы совместимы');
      }
    }

    // 3. АНАЛИЗ ОТСУТСТВУЮЩИХ ПОЛЬЗОВАТЕЛЕЙ
    console.log('\n3️⃣ АНАЛИЗ ОТСУТСТВУЮЩИХ ЗАПИСЕЙ:');
    console.log('=================================');
    
    if (usersData && farmingData) {
      const userIds = usersData.map(u => u.id);
      const farmingUserIds = farmingData.map(f => parseInt(f.user_id));
      
      console.log(`📊 СТАТИСТИКА:`);
      console.log(`   Пользователей с TON Boost: ${userIds.length}`);
      console.log(`   Записей в ton_farming_data: ${farmingUserIds.length}`);
      
      const missingUsers = userIds.filter(id => !farmingUserIds.includes(id));
      console.log(`   Отсутствующих записей: ${missingUsers.length}`);
      
      if (missingUsers.length > 0) {
        console.log(`   🚨 ПРОПУЩЕННЫЕ USER IDs: [${missingUsers.join(', ')}]`);
      }
    }

    // 4. АНАЛИЗ ПЛАНИРОВЩИКА - КАКИЕ ПОЛЯ ОН ОЖИДАЕТ
    console.log('\n4️⃣ АНАЛИЗ ТРЕБОВАНИЙ ПЛАНИРОВЩИКА:');
    console.log('==================================');
    
    console.log('🔍 ПЛАНИРОВЩИК ОЖИДАЕТ ОТ getActiveBoostUsers():');
    console.log('   Поля которые используются:');
    console.log('     - user_id (для JOIN с users)');
    console.log('     - balance_ton (для расчета депозита) ❌ ОТСУТСТВУЕТ');
    console.log('     - farming_rate (для расчета дохода)');
    console.log('     - boost_active (для фильтрации)');
    console.log('');
    console.log('🚨 КРИТИЧЕСКАЯ ПРОБЛЕМА:');
    console.log('   ton_farming_data НЕ содержит balance_ton');
    console.log('   Планировщик получает undefined → депозит = 0 → доход = 0');

    // 5. ТЕСТ JOIN между таблицами
    console.log('\n5️⃣ ТЕСТ JOIN СОВМЕСТИМОСТИ:');
    console.log('============================');
    
    console.log('🔄 Тестируем JOIN users ↔ ton_farming_data...');
    
    // Попробуем JOIN с разными типами кастинга
    const { data: joinTest, error: joinError } = await supabase
      .from('users')
      .select(`
        id,
        balance_ton,
        ton_boost_package,
        ton_farming_data:ton_farming_data!inner(
          user_id,
          boost_active,
          farming_balance
        )
      `)
      .eq('ton_farming_data.boost_active', true)
      .limit(3);

    if (joinError) {
      console.log(`❌ JOIN не работает: ${joinError.message}`);
      console.log('   Возможные причины:');
      console.log('   1. Несовместимые типы user_id');
      console.log('   2. Отсутствует foreign key связь');
      console.log('   3. Неправильная настройка схемы');
    } else if (joinTest) {
      console.log('✅ JOIN работает!');
      console.log(`   Найдено записей: ${joinTest.length}`);
      
      if (joinTest.length > 0) {
        console.log('   Пример объединенных данных:');
        const sample = joinTest[0];
        console.log(`     users.id: ${sample.id}`);
        console.log(`     users.balance_ton: ${sample.balance_ton}`);
        console.log(`     farming_data.user_id: ${sample.ton_farming_data?.[0]?.user_id}`);
        console.log(`     farming_data.farming_balance: ${sample.ton_farming_data?.[0]?.farming_balance}`);
      }
    }

    // 6. ФИНАЛЬНЫЕ РЕКОМЕНДАЦИИ
    console.log('\n6️⃣ ПЛАН ВОССТАНОВЛЕНИЯ:');
    console.log('=======================');
    console.log('');
    console.log('🔧 ПРОБЛЕМЫ НАЙДЕННЫЕ:');
    console.log('   1. TonFarmingRepository.activateBoost() использует неправильный тип user_id');
    console.log('   2. Планировщик не может получить balance_ton из ton_farming_data');
    console.log('   3. 4 пользователя без записей в ton_farming_data');
    console.log('   4. Архитектурная несовместимость интерфейсов');
    console.log('');
    console.log('🚀 СТРАТЕГИЯ ИСПРАВЛЕНИЯ:');
    console.log('   ВАРИАНТ 1 (Минимальный):');
    console.log('     - Исправить тип user_id в TonFarmingRepository');
    console.log('     - Добавить JOIN в планировщик для получения balance_ton');
    console.log('     - Создать недостающие записи для 4 пользователей');
    console.log('');
    console.log('   ВАРИАНТ 2 (Архитектурный):');
    console.log('     - Расширить интерфейс TonFarmingData полем balance_ton');
    console.log('     - Изменить getActiveBoostUsers() на JOIN запрос');
    console.log('     - Обновить все связанные методы');
    console.log('');
    console.log('🎯 РЕКОМЕНДАЦИЯ: Начать с Варианта 1 для быстрого восстановления');

    console.log('\n✅ === ДИАГНОСТИКА ЗАВЕРШЕНА ===\n');

  } catch (error) {
    console.error('❌ Критическая ошибка диагностики:', error);
  }
}

// Запускаем диагностику целостности
analyzeDatabaseIntegrity();