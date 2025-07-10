import { supabase } from './core/supabase';

async function investigateFarmingDeposits() {
  console.log('🔍 ИССЛЕДОВАНИЕ ТРАНЗАКЦИЙ ДЕПОЗИТОВ');
  console.log('=====================================\n');

  const userId = 74;
  
  try {
    // 1. Ищем транзакции с отрицательной суммой UNI
    console.log('1️⃣ ПОИСК ТРАНЗАКЦИЙ С ОТРИЦАТЕЛЬНОЙ СУММОЙ UNI');
    const { data: negativeTransactions, error: negError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('currency', 'UNI')
      .lt('amount', 0)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (negError) {
      console.error('❌ Ошибка:', negError);
    } else {
      console.log(`✅ Найдено транзакций с отрицательной суммой UNI: ${negativeTransactions?.length || 0}`);
      if (negativeTransactions && negativeTransactions.length > 0) {
        negativeTransactions.forEach((tx, index) => {
          console.log(`\nТранзакция ${index + 1}:`);
          console.log(`ID: ${tx.id}`);
          console.log(`Тип: ${tx.type}`);
          console.log(`Сумма: ${tx.amount} ${tx.currency}`);
          console.log(`Создана: ${tx.created_at}`);
        });
      }
    }

    // 2. Проверяем все типы транзакций
    console.log('\n2️⃣ ПРОВЕРКА ВСЕХ ТИПОВ ТРАНЗАКЦИЙ');
    const { data: allTypes, error: typesError } = await supabase
      .from('transactions')
      .select('type')
      .eq('user_id', userId);
    
    if (typesError) {
      console.error('❌ Ошибка:', typesError);
    } else {
      const uniqueTypes = [...new Set(allTypes?.map(t => t.type) || [])];
      console.log('✅ Уникальные типы транзакций:', uniqueTypes);
    }

    // 3. Проверяем транзакции за время около 12:08 (время депозита)
    console.log('\n3️⃣ ПРОВЕРКА ТРАНЗАКЦИЙ ОКОЛО ВРЕМЕНИ ДЕПОЗИТА (12:08)');
    const depositTime = '2025-07-10T12:08:04.389';
    const beforeTime = new Date(new Date(depositTime).getTime() - 60000).toISOString(); // 1 минута до
    const afterTime = new Date(new Date(depositTime).getTime() + 60000).toISOString(); // 1 минута после
    
    const { data: aroundDeposit, error: aroundError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', beforeTime)
      .lte('created_at', afterTime)
      .order('created_at', { ascending: false });
    
    if (aroundError) {
      console.error('❌ Ошибка:', aroundError);
    } else {
      console.log(`✅ Найдено транзакций около времени депозита: ${aroundDeposit?.length || 0}`);
      if (aroundDeposit && aroundDeposit.length > 0) {
        aroundDeposit.forEach((tx, index) => {
          console.log(`\nТранзакция ${index + 1}:`);
          console.log(`ID: ${tx.id}`);
          console.log(`Тип: ${tx.type}`);
          console.log(`Сумма: ${tx.amount} ${tx.currency}`);
          console.log(`Создана: ${tx.created_at}`);
        });
      }
    }

    // 4. Проверяем изменение баланса
    console.log('\n4️⃣ РАСЧЕТ ИЗМЕНЕНИЯ БАЛАНСА');
    const expectedDepositSum = 200442; // Из UI
    const oldBalance = 821000; // Начальный баланс
    const currentBalance = 670558.000323; // Текущий баланс
    const actualDifference = oldBalance - currentBalance;
    
    console.log(`Начальный баланс: ${oldBalance} UNI`);
    console.log(`Текущий баланс: ${currentBalance} UNI`);
    console.log(`Разница: ${actualDifference} UNI`);
    console.log(`Ожидаемая сумма депозитов: ${expectedDepositSum} UNI`);
    console.log(`Расхождение: ${Math.abs(actualDifference - expectedDepositSum)} UNI`);

    // 5. Проверяем таблицу farming_sessions подробнее
    console.log('\n5️⃣ ДЕТАЛЬНАЯ ПРОВЕРКА ТАБЛИЦЫ FARMING_SESSIONS');
    // Сначала проверим структуру таблицы
    const { data: testSession, error: testError } = await supabase
      .from('farming_sessions')
      .select('*')
      .limit(1);
    
    if (testError && testError.message.includes('does not exist')) {
      console.log('❌ Таблица farming_sessions не существует или пустая');
    } else if (testError) {
      console.error('❌ Ошибка:', testError);
    } else {
      console.log('✅ Таблица farming_sessions существует');
      if (testSession && testSession.length > 0) {
        console.log('Структура таблицы:', Object.keys(testSession[0]));
      }
    }

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

// Запускаем исследование
investigateFarmingDeposits();