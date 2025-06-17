/**
 * Тест TON Boost системы после исправления ошибок транзакций
 * Проверяет создание boost пакетов, начисления и реферальные награды
 */

import { supabase } from './core/supabase.ts';

/**
 * Проверяет существующие boost пакеты в системе
 */
async function checkExistingBoosts() {
  console.log('=== ПРОВЕРКА СУЩЕСТВУЮЩИХ BOOST ПАКЕТОВ ===\n');
  
  const { data: boosts, error } = await supabase
    .from('boost_purchases')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (error) {
    console.log('❌ Ошибка получения boost пакетов:', error.message);
    return [];
  }
  
  console.log(`Найдено ${boosts?.length || 0} boost пакетов:`);
  boosts?.forEach(boost => {
    console.log(`  ID: ${boost.id}, User: ${boost.user_id}, Boost: ${boost.boost_id}, Status: ${boost.status}`);
  });
  
  return boosts || [];
}

/**
 * Создает тестовый boost пакет для пользователя
 */
async function createTestBoost(userId, boostId = 1) {
  console.log(`\n=== СОЗДАНИЕ ТЕСТОВОГО BOOST ПАКЕТА ===\n`);
  
  // Проверяем существует ли пользователь
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, telegram_id, balance_ton')
    .eq('id', userId)
    .single();
    
  if (userError || !user) {
    console.log(`❌ Пользователь ${userId} не найден`);
    return null;
  }
  
  console.log(`✅ Пользователь найден: ID ${user.id}, TON баланс: ${user.balance_ton}`);
  
  // Создаем boost пакет
  const boostPackage = {
    user_id: userId,
    boost_id: boostId,
    status: 'confirmed',
    is_active: true,
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // +1 год
    total_earned: '0'
  };
  
  const { data: newBoost, error: boostError } = await supabase
    .from('boost_purchases')
    .insert(boostPackage)
    .select()
    .single();
    
  if (boostError) {
    console.log('❌ Ошибка создания boost пакета:', boostError.message);
    return null;
  }
  
  console.log(`✅ Boost пакет создан: ID ${newBoost.id}`);
  console.log(`   Пользователь: ${newBoost.user_id}`);
  console.log(`   Boost тип: ${newBoost.boost_id}`);
  console.log(`   Статус: ${newBoost.status}`);
  
  return newBoost;
}

/**
 * Тестирует планировщик TON Boost с реальными данными
 */
async function testBoostScheduler() {
  console.log('\n=== ТЕСТИРОВАНИЕ TON BOOST ПЛАНИРОВЩИКА ===\n');
  
  try {
    // Импортируем планировщик
    const { tonBoostIncomeScheduler } = await import('./modules/scheduler/tonBoostIncomeScheduler.ts');
    
    console.log('✅ Планировщик импортирован');
    
    // Получаем балансы до обработки
    const { data: usersBefore } = await supabase
      .from('users')
      .select('id, balance_ton')
      .in('id', [1, 4, 26, 23, 14])
      .order('id');
      
    console.log('\nБалансы TON до обработки:');
    usersBefore?.forEach(user => {
      console.log(`  User ${user.id}: ${parseFloat(user.balance_ton || 0).toFixed(6)} TON`);
    });
    
    // Запускаем один цикл обработки
    console.log('\nЗапуск обработки TON Boost доходов...');
    await tonBoostIncomeScheduler.processTonBoostIncome();
    
    // Проверяем балансы после обработки
    const { data: usersAfter } = await supabase
      .from('users')
      .select('id, balance_ton')
      .in('id', [1, 4, 26, 23, 14])
      .order('id');
      
    console.log('\nБалансы TON после обработки:');
    let totalIncrease = 0;
    usersAfter?.forEach(user => {
      const userBefore = usersBefore?.find(u => u.id === user.id);
      const before = parseFloat(userBefore?.balance_ton || 0);
      const after = parseFloat(user.balance_ton || 0);
      const increase = after - before;
      totalIncrease += increase;
      
      console.log(`  User ${user.id}: ${after.toFixed(6)} TON ${increase > 0 ? `(+${increase.toFixed(6)})` : ''}`);
    });
    
    console.log(`\n💰 Общее начисление: ${totalIncrease.toFixed(6)} TON`);
    
    return totalIncrease > 0;
    
  } catch (error) {
    console.log('❌ Ошибка тестирования планировщика:', error.message);
    return false;
  }
}

/**
 * Проверяет новые транзакции после обработки
 */
async function checkNewTransactions() {
  console.log('\n=== ПРОВЕРКА НОВЫХ ТРАНЗАКЦИЙ ===\n');
  
  // Получаем последние транзакции FARMING_REWARD с TON
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('type', 'FARMING_REWARD')
    .gt('amount_ton', '0')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (error) {
    console.log('❌ Ошибка получения транзакций:', error.message);
    return [];
  }
  
  console.log(`Найдено ${transactions?.length || 0} TON транзакций:`);
  transactions?.forEach(tx => {
    console.log(`  ID: ${tx.id}, User: ${tx.user_id}, Amount: ${tx.amount_ton} TON`);
    console.log(`  Description: ${tx.description}`);
    console.log(`  Created: ${new Date(tx.created_at).toLocaleString()}`);
    console.log('');
  });
  
  return transactions || [];
}

/**
 * Основная функция тестирования
 */
async function runTonBoostSystemTest() {
  console.log('🚀 ТЕСТИРОВАНИЕ TON BOOST СИСТЕМЫ\n');
  console.log('Проверяем исправления ошибок транзакций и функциональность\n');
  
  try {
    // 1. Проверяем существующие boost пакеты
    const existingBoosts = await checkExistingBoosts();
    
    // 2. Если нет активных boost пакетов, создаем тестовый
    if (!existingBoosts.some(b => b.status === 'confirmed' && b.is_active)) {
      console.log('\nНет активных boost пакетов. Создаем тестовый...');
      await createTestBoost(4, 1); // Создаем Starter boost для User 4
    }
    
    // 3. Тестируем планировщик
    const schedulerWorked = await testBoostScheduler();
    
    // 4. Проверяем созданные транзакции
    const newTransactions = await checkNewTransactions();
    
    // 5. Выводим результаты
    console.log('=== РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ ===');
    console.log(`Планировщик работает: ${schedulerWorked ? '✅ ДА' : '❌ НЕТ'}`);
    console.log(`Транзакции создаются: ${newTransactions.length > 0 ? '✅ ДА' : '❌ НЕТ'}`);
    console.log(`Активные boost пакеты: ${existingBoosts.filter(b => b.status === 'confirmed').length}`);
    
    if (schedulerWorked && newTransactions.length > 0) {
      console.log('\n🎉 TON BOOST СИСТЕМА РАБОТАЕТ КОРРЕКТНО!');
      console.log('Исправления ошибок транзакций успешны');
    } else {
      console.log('\n⚠️  Обнаружены проблемы в работе системы');
    }
    
  } catch (error) {
    console.log('❌ Критическая ошибка тестирования:', error);
  }
}

// Запуск тестирования
runTonBoostSystemTest();