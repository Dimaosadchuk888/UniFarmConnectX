import { supabase } from '../core/supabase.js';

async function verifyViewsCreation() {
  console.log('🔍 ПРОВЕРКА СОЗДАНИЯ VIEWS');
  console.log('='.repeat(80));
  console.log('');

  const results = {
    views_created: false,
    tables_archived: false,
    views_working: false,
    boost_service_check: false
  };

  try {
    // 1. Проверяем что старые таблицы архивированы
    console.log('📦 ПРОВЕРКА АРХИВАЦИИ ТАБЛИЦ:\n');

    try {
      // Пытаемся прочитать старые таблицы (должна быть ошибка)
      const { error: uniError } = await supabase
        .from('uni_farming_data')
        .select('count')
        .limit(1);

      if (uniError && uniError.message.includes('_archived_')) {
        console.log('✅ Таблица uni_farming_data архивирована');
        results.tables_archived = true;
      } else {
        console.log('⚠️  Таблица uni_farming_data еще не архивирована');
      }
    } catch (e) {
      console.log('✅ Старые таблицы не доступны (архивированы)');
      results.tables_archived = true;
    }

    // 2. Проверяем что Views созданы и работают
    console.log('\n\n📋 ПРОВЕРКА VIEWS:\n');

    // Проверяем uni_farming_data view
    const { data: uniViewData, error: uniViewError } = await supabase
      .from('uni_farming_data')
      .select('*')
      .limit(5);

    if (!uniViewError && uniViewData) {
      console.log(`✅ View uni_farming_data работает! Найдено ${uniViewData.length} записей`);
      results.views_created = true;
      
      // Показываем примеры данных
      if (uniViewData.length > 0) {
        console.log('Пример данных:');
        console.log(`- User ${uniViewData[0].user_id}: deposit=${uniViewData[0].deposit_amount}, balance=${uniViewData[0].farming_balance}`);
      }
    } else {
      console.log('❌ View uni_farming_data не работает:', uniViewError?.message);
    }

    // Проверяем ton_farming_data view
    const { data: tonViewData, error: tonViewError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .limit(5);

    if (!tonViewError && tonViewData) {
      console.log(`\n✅ View ton_farming_data работает! Найдено ${tonViewData.length} записей`);
      results.views_working = true;
      
      if (tonViewData.length > 0) {
        console.log('Пример данных:');
        console.log(`- User ${tonViewData[0].user_id}: boost_package=${tonViewData[0].boost_package_id}`);
      }
    } else {
      console.log('\n❌ View ton_farming_data не работает:', tonViewError?.message);
    }

    // 3. Проверяем что boost/service.ts будет работать
    console.log('\n\n🔧 ПРОВЕРКА СОВМЕСТИМОСТИ С boost/service.ts:\n');

    // Симулируем запрос который делает boost/service.ts
    const { data: boostCheck } = await supabase
      .from('ton_farming_data')
      .select('farming_balance')
      .eq('user_id', 184)
      .single();

    if (boostCheck) {
      console.log('✅ boost/service.ts будет работать корректно');
      console.log(`  Farming balance для user 184: ${boostCheck.farming_balance}`);
      results.boost_service_check = true;
    } else {
      console.log('⚠️  Нужно проверить boost/service.ts');
    }

    // 4. Итоговый статус
    console.log('\n\n📊 ИТОГОВЫЙ СТАТУС:\n');

    const allGood = Object.values(results).every(v => v === true);
    
    if (allGood) {
      console.log('🎉 ВСЕ ОТЛИЧНО! Views созданы и работают корректно!');
      console.log('\nСледующие шаги:');
      console.log('1. Протестировать работу приложения');
      console.log('2. Проверить подозрительные данные (User 74)');
    } else {
      console.log('⚠️  Есть проблемы:');
      Object.entries(results).forEach(([key, value]) => {
        if (!value) {
          console.log(`- ${key}: ❌`);
        }
      });
      console.log('\nВозможно SQL еще не выполнен в Supabase Dashboard');
    }

    // 5. Проверка подозрительных данных
    console.log('\n\n🔍 ПРОВЕРКА ПОДОЗРИТЕЛЬНЫХ ДАННЫХ:\n');

    const { data: suspiciousUser } = await supabase
      .from('users')
      .select('id, username, uni_deposit_amount, balance_uni')
      .eq('id', 74)
      .single();

    if (suspiciousUser) {
      console.log(`User 74: ${suspiciousUser.username || 'legacy_user_74'}`);
      console.log(`- Депозит: ${suspiciousUser.uni_deposit_amount} UNI`);
      console.log(`- Баланс: ${suspiciousUser.balance_uni} UNI`);
      
      if (suspiciousUser.uni_deposit_amount > 1000000) {
        console.log('⚠️  ВНИМАНИЕ: Очень большой депозит! Требует проверки.');
      }
    }

  } catch (error) {
    console.error('❌ Ошибка проверки:', error);
  }
}

// Запуск проверки
console.log('Проверяю создание Views...\n');
verifyViewsCreation();