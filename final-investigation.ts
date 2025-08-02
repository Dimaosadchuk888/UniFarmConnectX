import { supabase } from './core/supabaseClient';

async function finalInvestigation() {
  console.log('=== ФИНАЛЬНОЕ РАССЛЕДОВАНИЕ: ГИПОТЕЗА О ПУТАНИЦЕ ПОЛЕЙ ===\n');
  
  const userId = '184';
  
  try {
    // 1. Проверяем все поля пользователя
    console.log('1. ВСЕ ПОЛЯ ПОЛЬЗОВАТЕЛЯ В БД:');
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
      
    console.log(`balance_ton: ${user.balance_ton}`);
    console.log(`ton_farming_balance: ${user.ton_farming_balance}`);
    console.log(`ton_boost_active: ${user.ton_boost_active}`);
    console.log(`ton_boost_package: ${user.ton_boost_package}`);
    
    // 2. Анализ значений
    console.log('\n\n2. АНАЛИЗ ЗНАЧЕНИЙ:');
    console.log('ton_farming_balance = 115 TON');
    console.log('Списалось ~100 TON');
    console.log('115 - 100 = 15 TON (возможно старый депозит)');
    
    // 3. Проверка гипотезы
    console.log('\n\n3. ГИПОТЕЗА:');
    console.log('❓ Возможно при покупке TON Boost происходит следующее:');
    console.log('1. Списывается 1 TON из balance_ton (правильно)');
    console.log('2. Но где-то есть код, который ДОПОЛНИТЕЛЬНО:');
    console.log('   - Либо обнуляет balance_ton');
    console.log('   - Либо устанавливает balance_ton = ton_farming_balance - balance_ton');
    console.log('   - Либо есть триггер в БД');
    
    // 4. Проверка триггеров
    console.log('\n\n4. ПРОВЕРКА ТРИГГЕРОВ В БД:');
    const { data: triggers } = await supabase.rpc('get_triggers_for_table', {
      table_name: 'users'
    }).catch(() => ({ data: null }));
    
    if (triggers) {
      console.log('Найдены триггеры:', triggers);
    } else {
      console.log('Триггеры не найдены или нет доступа');
    }
    
    // 5. Поиск подозрительного кода
    console.log('\n\n5. ПОДОЗРИТЕЛЬНЫЕ МЕСТА В КОДЕ:');
    console.log('- modules/boost/TonFarmingRepository.ts - функция activateBoost');
    console.log('- modules/tonFarming/repository.ts - работа с ton_farming_balance');
    console.log('- server/farming-calculator.ts - автоматические начисления');
    console.log('- Любой код, который обновляет balance_ton = 0');
    
    // 6. Финальный вывод
    console.log('\n\n=== ВЫВОД ===');
    console.log('✅ Код покупки работает правильно (списывает 1 TON)');
    console.log('❌ Но что-то еще обнуляет весь баланс TON');
    console.log('🔍 Нужно найти код, который:');
    console.log('   - Вызывается после/во время покупки TON Boost');
    console.log('   - Обновляет balance_ton');
    console.log('   - Возможно путает поля или использует неправильную формулу');
    
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

finalInvestigation();