import { supabase } from './core/supabaseClient';

async function analyzeBoostPurchaseSequence() {
  console.log('=== ДЕТАЛЬНЫЙ АНАЛИЗ ПОСЛЕДОВАТЕЛЬНОСТИ ПОКУПКИ TON BOOST ===\n');
  
  const userId = '184';
  
  try {
    // 1. Проверяем всю таблицу users чтобы найти поле обнуления
    console.log('1. АНАЛИЗ ТАБЛИЦЫ USERS:');
    console.log('=' * 60);
    
    const { data: userFields, error: fieldsError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (fieldsError) {
      console.log('Ошибка:', fieldsError);
    } else {
      // Ищем все поля связанные с TON
      console.log('\nПоля с TON данными:');
      Object.entries(userFields).forEach(([key, value]) => {
        if (key.includes('ton') || key.includes('TON')) {
          console.log(`  ${key}: ${value}`);
        }
      });
    }
    
    // 2. Проверяем таблицу ton_farming_data
    console.log('\n\n2. ПРОВЕРКА TON_FARMING_DATA:');
    console.log('=' * 60);
    
    const { data: tonFarmingData, error: farmingError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    if (farmingError) {
      console.log('Данные не найдены или ошибка:', farmingError.message);
    } else {
      console.log('Найдена запись:');
      console.log(`  user_id: ${tonFarmingData.user_id}`);
      console.log(`  boost_active: ${tonFarmingData.boost_active}`);
      console.log(`  boost_package_id: ${tonFarmingData.boost_package_id}`);
      console.log(`  farming_balance: ${tonFarmingData.farming_balance}`);
      console.log(`  farming_rate: ${tonFarmingData.farming_rate}`);
    }
    
    // 3. Анализ последовательности событий
    console.log('\n\n3. ПОСЛЕДОВАТЕЛЬНОСТЬ СОБЫТИЙ ПРИ ПОКУПКЕ:');
    console.log('=' * 60);
    
    console.log('\n📋 ЧТО ДОЛЖНО ПРОИСХОДИТЬ:');
    console.log('1. Проверка баланса TON (было 100.36)');
    console.log('2. subtractBalance вычитает стоимость пакета');
    console.log('3. Активация TON Boost пакета');
    console.log('4. Начисление UNI бонуса');
    console.log('5. Создание транзакции покупки');
    
    console.log('\n❌ ЧТО ПРОИСХОДИТ НА САМОМ ДЕЛЕ:');
    console.log('1. Проверка баланса TON ✅');
    console.log('2. Баланс обнуляется вместо вычета ❌');
    console.log('3. TON Boost активируется ✅');
    console.log('4. UNI бонус начисляется ✅');
    console.log('5. Транзакция покупки НЕ создается ❌');
    
    // 4. Возможные причины
    console.log('\n\n4. ВОЗМОЖНЫЕ ПРИЧИНЫ ОБНУЛЕНИЯ:');
    console.log('=' * 60);
    
    console.log('\n🔍 ГИПОТЕЗА 1: Двойное списание');
    console.log('Возможно есть еще одно место где списывается баланс');
    
    console.log('\n🔍 ГИПОТЕЗА 2: Ошибка в расчете');
    console.log('requiredAmount может быть равен текущему балансу');
    
    console.log('\n🔍 ГИПОТЕЗА 3: Триггер в БД');
    console.log('Возможно есть триггер который обнуляет баланс при активации boost');
    
    console.log('\n🔍 ГИПОТЕЗА 4: Параллельная операция');
    console.log('Другой процесс мог изменить баланс одновременно');
    
    // 5. Проверим транзакции с отрицательной суммой
    console.log('\n\n5. ПОИСК ТРАНЗАКЦИЙ С ОТРИЦАТЕЛЬНОЙ СУММОЙ:');
    console.log('=' * 60);
    
    const { data: negativeTx } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', parseInt(userId))
      .lt('amount', 0)
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (negativeTx && negativeTx.length > 0) {
      console.log('\nНайдены транзакции с отрицательной суммой:');
      negativeTx.forEach(tx => {
        console.log(`\n  Время: ${new Date(tx.created_at).toLocaleString()}`);
        console.log(`  Тип: ${tx.type}`);
        console.log(`  Сумма: ${tx.amount} ${tx.currency}`);
        console.log(`  Описание: ${tx.description}`);
      });
    } else {
      console.log('Транзакций с отрицательной суммой не найдено');
    }
    
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

analyzeBoostPurchaseSequence();