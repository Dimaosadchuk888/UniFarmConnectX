import { supabase } from './core/supabase';

async function investigateFarmingPackages() {
  console.log('🔍 ИССЛЕДОВАНИЕ FARMING-ПАКЕТОВ');
  console.log('================================\n');

  const userId = 74;
  
  try {
    // 1. Проверяем данные пользователя
    console.log('1️⃣ ПРОВЕРКА ДАННЫХ ПОЛЬЗОВАТЕЛЯ');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, telegram_id, balance_uni, balance_ton, uni_farming_active, uni_deposit_amount, uni_farming_balance, uni_farming_rate, uni_farming_start_timestamp')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error('❌ Ошибка получения пользователя:', userError);
    } else {
      console.log('✅ Данные пользователя:');
      console.log(JSON.stringify(userData, null, 2));
    }

    // 2. Проверяем farming_sessions
    console.log('\n2️⃣ ПРОВЕРКА FARMING SESSIONS');
    const { data: farmingSessions, error: farmingError } = await supabase
      .from('farming_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (farmingError) {
      console.error('❌ Ошибка получения farming sessions:', farmingError);
    } else {
      console.log(`✅ Найдено farming sessions: ${farmingSessions?.length || 0}`);
      if (farmingSessions && farmingSessions.length > 0) {
        console.log('Последние 3 сессии:');
        farmingSessions.slice(0, 3).forEach((session, index) => {
          console.log(`\nСессия ${index + 1}:`);
          console.log(JSON.stringify(session, null, 2));
        });
      }
    }

    // 3. Проверяем транзакции типа FARMING_REWARD (вместо FARMING_DEPOSIT)
    console.log('\n3️⃣ ПРОВЕРКА ТРАНЗАКЦИЙ FARMING_REWARD');
    const { data: farmingTransactions, error: transError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'FARMING_REWARD')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (transError) {
      console.error('❌ Ошибка получения транзакций:', transError);
    } else {
      console.log(`✅ Найдено транзакций FARMING_DEPOSIT: ${farmingTransactions?.length || 0}`);
      if (farmingTransactions && farmingTransactions.length > 0) {
        console.log('Последние транзакции:');
        farmingTransactions.forEach((tx, index) => {
          console.log(`\nТранзакция ${index + 1}:`);
          console.log(`ID: ${tx.id}`);
          console.log(`Сумма: ${tx.amount} ${tx.currency}`);
          console.log(`Создана: ${tx.created_at}`);
          console.log(`Детали: ${JSON.stringify(tx.details)}`);
        });
      }
    }

    // 4. Проверяем все транзакции пользователя за последний час
    console.log('\n4️⃣ ПРОВЕРКА ВСЕХ НЕДАВНИХ ТРАНЗАКЦИЙ');
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentTransactions, error: recentError } = await supabase
      .from('transactions')
      .select('id, type, amount, currency, created_at')
      .eq('user_id', userId)
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false });
    
    if (recentError) {
      console.error('❌ Ошибка получения недавних транзакций:', recentError);
    } else {
      console.log(`✅ Найдено транзакций за последний час: ${recentTransactions?.length || 0}`);
      if (recentTransactions && recentTransactions.length > 0) {
        recentTransactions.forEach((tx, index) => {
          console.log(`\nТранзакция ${index + 1}:`);
          console.log(`Тип: ${tx.type}`);
          console.log(`Сумма: ${tx.amount} ${tx.currency}`);
          console.log(`Время: ${tx.created_at}`);
        });
      }
    }

    // 5. Проверяем структуру таблиц
    console.log('\n5️⃣ ПРОВЕРКА СТРУКТУРЫ ТАБЛИЦ');
    
    // Проверяем существование полей в users
    const { data: userColumns } = await supabase.rpc('get_table_columns', { table_name: 'users' });
    if (userColumns) {
      const farmingFields = ['uni_farming_active', 'uni_deposit_amount', 'uni_farming_balance', 'uni_farming_rate', 'uni_farming_start'];
      console.log('\nПоля farming в таблице users:');
      farmingFields.forEach(field => {
        const exists = userColumns.some((col: any) => col.column_name === field);
        console.log(`${field}: ${exists ? '✅ существует' : '❌ НЕ НАЙДЕНО'}`);
      });
    }

    // 6. Сводка по консистентности данных
    console.log('\n6️⃣ СВОДКА ПО КОНСИСТЕНТНОСТИ ДАННЫХ');
    if (userData) {
      console.log(`\nТекущее состояние пользователя ${userId}:`);
      console.log(`- Баланс UNI: ${userData.balance_uni}`);
      console.log(`- Farming активен: ${userData.uni_farming_active}`);
      console.log(`- Сумма депозита: ${userData.uni_deposit_amount}`);
      console.log(`- Farming баланс: ${userData.uni_farming_balance}`);
      console.log(`- Ставка: ${userData.uni_farming_rate}%`);
      console.log(`- Начало farming: ${userData.uni_farming_start_timestamp}`);
      
      // Проверяем соответствие с UI данными
      console.log('\nСоответствие с UI данными:');
      console.log('- UI показывает баланс: 670558.000323');
      console.log(`- БД показывает баланс: ${userData.balance_uni}`);
      console.log('- UI показывает депозит: 200442');
      console.log(`- БД показывает депозит: ${userData.uni_deposit_amount}`);
    }

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

// Запускаем исследование
investigateFarmingPackages();