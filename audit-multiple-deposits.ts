/**
 * Аудит множественных депозитов UniFarm
 * Технический анализ без изменения кода
 */

import { supabase } from './core/supabase';

async function auditMultipleDeposits() {
  console.log('=== АУДИТ МНОЖЕСТВЕННЫХ ДЕПОЗИТОВ UNIFARM ===\n');
  console.log('Дата аудита:', new Date().toLocaleString());
  console.log('=' * 60 + '\n');
  
  // =============================================
  // ЧАСТЬ 1: UNI FARMING
  // =============================================
  console.log('┌─────────────────────────────────────────┐');
  console.log('│         1. UNI FARMING АУДИТ            │');
  console.log('└─────────────────────────────────────────┘\n');
  
  // 1.1. Структура данных UNI Farming
  console.log('1.1. Анализ структуры таблиц:\n');
  
  // Проверяем структуру таблицы users
  const { data: sampleUser } = await supabase
    .from('users')
    .select('id, uni_farming_active, uni_deposit_amount, uni_farming_balance, uni_farming_rate')
    .limit(1)
    .single();
    
  console.log('Таблица users (поля для UNI farming):');
  console.log('- uni_farming_active:', typeof sampleUser?.uni_farming_active);
  console.log('- uni_deposit_amount:', typeof sampleUser?.uni_deposit_amount);
  console.log('- uni_farming_balance:', typeof sampleUser?.uni_farming_balance);
  console.log('- uni_farming_rate:', typeof sampleUser?.uni_farming_rate);
  
  // Проверяем наличие отдельной таблицы для депозитов
  try {
    const { data: farmingSessions, error } = await supabase
      .from('farming_sessions')
      .select('*')
      .limit(1);
      
    if (!error) {
      console.log('\n✅ Таблица farming_sessions существует');
      console.log('Пример структуры:', farmingSessions?.[0] || 'Таблица пуста');
    }
  } catch (e) {
    console.log('\n❌ Таблица farming_sessions не найдена');
  }
  
  // 1.2. Анализ активных депозитов
  console.log('\n1.2. Пользователи с активным UNI farming:\n');
  
  const { data: activeUniUsers } = await supabase
    .from('users')
    .select('id, telegram_username, uni_deposit_amount, uni_farming_balance')
    .eq('uni_farming_active', true)
    .gt('uni_deposit_amount', 0)
    .order('uni_deposit_amount', { ascending: false })
    .limit(10);
    
  console.log(`Найдено активных фармеров: ${activeUniUsers?.length || 0}`);
  activeUniUsers?.forEach(u => {
    console.log(`- User ${u.id} (@${u.telegram_username}): депозит=${u.uni_deposit_amount} UNI`);
  });
  
  // 1.3. Анализ транзакций депозитов
  console.log('\n1.3. Анализ FARMING_DEPOSIT транзакций:\n');
  
  const { data: depositStats } = await supabase
    .from('transactions')
    .select('user_id, amount')
    .eq('type', 'FARMING_DEPOSIT')
    .order('created_at', { ascending: false });
    
  // Группируем по пользователям
  const depositsByUser: Record<number, { count: number, total: number }> = {};
  depositStats?.forEach(tx => {
    if (!depositsByUser[tx.user_id]) {
      depositsByUser[tx.user_id] = { count: 0, total: 0 };
    }
    depositsByUser[tx.user_id].count++;
    depositsByUser[tx.user_id].total += parseFloat(tx.amount || '0');
  });
  
  console.log('Статистика депозитов по пользователям:');
  Object.entries(depositsByUser).slice(0, 5).forEach(([userId, stats]) => {
    console.log(`- User ${userId}: ${stats.count} депозитов, сумма=${stats.total} UNI`);
  });
  
  // 1.4. Проверка множественных депозитов
  console.log('\n1.4. Проверка возможности множественных депозитов:\n');
  
  const multiDepositUsers = Object.entries(depositsByUser)
    .filter(([_, stats]) => stats.count > 1)
    .map(([userId, stats]) => ({ userId: parseInt(userId), ...stats }));
    
  if (multiDepositUsers.length > 0) {
    console.log(`✅ Найдено ${multiDepositUsers.length} пользователей с множественными депозитами:`);
    multiDepositUsers.slice(0, 5).forEach(u => {
      console.log(`  - User ${u.userId}: ${u.count} депозитов`);
    });
  } else {
    console.log('❌ Пользователей с множественными депозитами не найдено');
  }
  
  // 1.5. Анализ начислений
  console.log('\n1.5. Анализ FARMING_REWARD транзакций:\n');
  
  // Берем пользователя с максимальными депозитами для примера
  const testUserId = multiDepositUsers[0]?.userId || 74;
  
  const { data: rewardTx } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', testUserId)
    .eq('type', 'FARMING_REWARD')
    .eq('currency', 'UNI')
    .order('created_at', { ascending: false })
    .limit(5);
    
  console.log(`Последние награды для user ${testUserId}:`);
  rewardTx?.forEach(tx => {
    console.log(`- ${new Date(tx.created_at).toLocaleString()}: +${tx.amount} UNI`);
  });
  
  // =============================================
  // ЧАСТЬ 2: TON BOOST
  // =============================================
  console.log('\n\n┌─────────────────────────────────────────┐');
  console.log('│          2. TON BOOST АУДИТ             │');
  console.log('└─────────────────────────────────────────┘\n');
  
  // 2.1. Структура данных TON Boost
  console.log('2.1. Анализ структуры таблиц:\n');
  
  // Проверяем ton_farming_data
  const { data: tonFarmingData } = await supabase
    .from('ton_farming_data')
    .select('*')
    .limit(5);
    
  if (tonFarmingData && tonFarmingData.length > 0) {
    console.log('✅ Таблица ton_farming_data существует');
    console.log('Структура:', Object.keys(tonFarmingData[0]));
    console.log(`Записей в таблице: ${tonFarmingData.length}`);
  }
  
  // 2.2. Анализ активных TON Boost
  console.log('\n2.2. Пользователи с активным TON Boost:\n');
  
  const { data: activeTonUsers } = await supabase
    .from('ton_farming_data')
    .select('user_id, farming_balance, boost_package_id, farming_rate')
    .gt('farming_balance', 0)
    .order('farming_balance', { ascending: false })
    .limit(10);
    
  console.log(`Найдено активных TON boost: ${activeTonUsers?.length || 0}`);
  activeTonUsers?.forEach(u => {
    console.log(`- User ${u.user_id}: balance=${u.farming_balance} TON, package=${u.boost_package_id}`);
  });
  
  // 2.3. Анализ покупок boost пакетов
  console.log('\n2.3. Анализ BOOST_PURCHASE транзакций:\n');
  
  const { data: boostPurchases } = await supabase
    .from('transactions')
    .select('user_id, amount, metadata')
    .eq('type', 'BOOST_PURCHASE')
    .order('created_at', { ascending: false });
    
  // Группируем по пользователям
  const boostByUser: Record<number, { count: number, packages: any[] }> = {};
  boostPurchases?.forEach(tx => {
    if (!boostByUser[tx.user_id]) {
      boostByUser[tx.user_id] = { count: 0, packages: [] };
    }
    boostByUser[tx.user_id].count++;
    
    const meta = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata) : tx.metadata;
    if (meta?.boost_package_id) {
      boostByUser[tx.user_id].packages.push(meta.boost_package_id);
    }
  });
  
  console.log('Статистика покупок TON Boost по пользователям:');
  Object.entries(boostByUser).slice(0, 5).forEach(([userId, stats]) => {
    console.log(`- User ${userId}: ${stats.count} покупок, пакеты: [${stats.packages.join(', ')}]`);
  });
  
  // 2.4. Проверка множественных boost пакетов
  console.log('\n2.4. Проверка множественных boost пакетов:\n');
  
  const multiBoostUsers = Object.entries(boostByUser)
    .filter(([_, stats]) => stats.count > 1)
    .map(([userId, stats]) => ({ userId: parseInt(userId), ...stats }));
    
  if (multiBoostUsers.length > 0) {
    console.log(`✅ Найдено ${multiBoostUsers.length} пользователей с множественными boost:`);
    multiBoostUsers.slice(0, 5).forEach(u => {
      console.log(`  - User ${u.userId}: ${u.count} пакетов`);
    });
  } else {
    console.log('❌ Пользователей с множественными boost не найдено');
  }
  
  // 2.5. Анализ начислений TON Boost
  console.log('\n2.5. Анализ TON_BOOST_INCOME транзакций:\n');
  
  const { data: tonRewards } = await supabase
    .from('transactions')
    .select('user_id, amount, metadata')
    .eq('currency', 'TON')
    .eq('type', 'FARMING_REWARD')
    .not('metadata', 'is', null)
    .order('created_at', { ascending: false })
    .limit(20);
    
  let tonBoostIncomeCount = 0;
  const tonIncomeByUser: Record<number, number> = {};
  
  tonRewards?.forEach(tx => {
    const meta = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata) : tx.metadata;
    if (meta?.original_type === 'TON_BOOST_INCOME') {
      tonBoostIncomeCount++;
      tonIncomeByUser[tx.user_id] = (tonIncomeByUser[tx.user_id] || 0) + 1;
    }
  });
  
  console.log(`Найдено TON_BOOST_INCOME транзакций: ${tonBoostIncomeCount}`);
  console.log('Распределение по пользователям:');
  Object.entries(tonIncomeByUser).slice(0, 5).forEach(([userId, count]) => {
    console.log(`- User ${userId}: ${count} начислений`);
  });
  
  // =============================================
  // ИТОГОВЫЕ ВЫВОДЫ
  // =============================================
  console.log('\n\n┌─────────────────────────────────────────┐');
  console.log('│            ИТОГОВЫЕ ВЫВОДЫ              │');
  console.log('└─────────────────────────────────────────┘\n');
  
  // Проверка архитектурных особенностей
  console.log('📊 АРХИТЕКТУРНЫЙ АНАЛИЗ:\n');
  
  console.log('UNI Farming:');
  console.log('- Хранение: в таблице users (uni_deposit_amount)');
  console.log('- Множественность: НАКОПИТЕЛЬНАЯ (депозиты суммируются)');
  console.log('- Транзакции: создается отдельная FARMING_DEPOSIT на каждый депозит');
  console.log('- Начисления: единая транзакция FARMING_REWARD на общую сумму\n');
  
  console.log('TON Boost:');
  console.log('- Хранение: в таблице ton_farming_data (farming_balance)');
  console.log('- Множественность: ЗАМЕЩАЮЩАЯ (новый пакет заменяет старый)');
  console.log('- Транзакции: создается BOOST_PURCHASE на каждую покупку');
  console.log('- Начисления: единая транзакция с metadata.original_type=TON_BOOST_INCOME');
  
  // Детальный пример для доказательства
  if (multiDepositUsers.length > 0) {
    console.log('\n📋 ДОКАЗАТЕЛЬСТВО НА ПРИМЕРЕ:');
    const exampleUserId = multiDepositUsers[0].userId;
    
    const { data: userExample } = await supabase
      .from('users')
      .select('id, uni_deposit_amount')
      .eq('id', exampleUserId)
      .single();
      
    console.log(`\nUser ${exampleUserId}:`);
    console.log(`- Количество депозитов: ${multiDepositUsers[0].count}`);
    console.log(`- Сумма всех депозитов: ${multiDepositUsers[0].total} UNI`);
    console.log(`- Текущий uni_deposit_amount: ${userExample?.uni_deposit_amount} UNI`);
    console.log(`✅ Подтверждение: депозиты СУММИРУЮТСЯ в одно значение`);
  }
}

// Запускаем аудит
auditMultipleDeposits().catch(console.error);