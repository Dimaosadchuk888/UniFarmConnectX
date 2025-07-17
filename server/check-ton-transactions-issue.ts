/**
 * Проверка проблемы с отображением TON транзакций
 * БЕЗ ИЗМЕНЕНИЯ КОДА - только диагностика
 */

import { supabase } from '../core/supabase';

async function checkTonTransactionsIssue() {
  console.log('\n=== ДИАГНОСТИКА ПРОБЛЕМЫ С TON ТРАНЗАКЦИЯМИ ===\n');
  
  const userId = 184;
  
  // 1. Проверяем есть ли вообще TON транзакции
  console.log('1️⃣ ПРОВЕРКА TON ТРАНЗАКЦИЙ В БД:');
  
  const { data: tonTx, error: tonError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('currency', 'TON')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (tonError) {
    console.error('Ошибка:', tonError);
    return;
  }
  
  console.log(`\nНайдено TON транзакций: ${tonTx?.length || 0}`);
  
  if (tonTx && tonTx.length > 0) {
    console.log('\nПоследние TON транзакции:');
    tonTx.forEach((tx, i) => {
      console.log(`\n${i + 1}. ID ${tx.id}:`);
      console.log(`   - type: ${tx.type}`);
      console.log(`   - amount: ${tx.amount} TON`);
      console.log(`   - status: ${tx.status}`);
      console.log(`   - created_at: ${new Date(tx.created_at).toLocaleString('ru-RU')}`);
    });
  }
  
  // 2. Проверяем баланс пользователя и сумму транзакций
  console.log('\n\n2️⃣ АНАЛИЗ БАЛАНСОВ:');
  
  const { data: user } = await supabase
    .from('users')
    .select('balance_uni, balance_ton')
    .eq('id', userId)
    .single();
    
  console.log(`\nТекущие балансы пользователя ${userId}:`);
  console.log(`- UNI: ${user?.balance_uni}`);
  console.log(`- TON: ${user?.balance_ton}`);
  
  // 3. Считаем сумму всех транзакций
  console.log('\n\n3️⃣ РАСЧЕТ СУММЫ ТРАНЗАКЦИЙ:');
  
  // UNI транзакции
  const { data: allUniTx } = await supabase
    .from('transactions')
    .select('type, amount')
    .eq('user_id', userId)
    .eq('currency', 'UNI');
    
  let uniIncome = 0;
  let uniOutcome = 0;
  
  allUniTx?.forEach(tx => {
    const amount = parseFloat(tx.amount);
    if (['FARMING_REWARD', 'REFERRAL_REWARD', 'MISSION_REWARD', 'DAILY_BONUS'].includes(tx.type)) {
      uniIncome += amount;
    } else if (['FARMING_DEPOSIT', 'BOOST_PURCHASE'].includes(tx.type)) {
      uniOutcome += amount;
    }
  });
  
  console.log('\nUNI транзакции:');
  console.log(`- Доход: +${uniIncome.toFixed(6)} UNI`);
  console.log(`- Расход: -${uniOutcome.toFixed(6)} UNI`);
  console.log(`- Итого: ${(uniIncome - uniOutcome).toFixed(6)} UNI`);
  console.log(`- Текущий баланс: ${user?.balance_uni} UNI`);
  
  // TON транзакции
  const { data: allTonTx } = await supabase
    .from('transactions')
    .select('type, amount')
    .eq('user_id', userId)
    .eq('currency', 'TON');
    
  let tonIncome = 0;
  let tonOutcome = 0;
  
  allTonTx?.forEach(tx => {
    const amount = parseFloat(tx.amount);
    if (['FARMING_REWARD', 'REFERRAL_REWARD', 'MISSION_REWARD', 'DAILY_BONUS'].includes(tx.type)) {
      tonIncome += amount;
    } else if (['FARMING_DEPOSIT', 'BOOST_PURCHASE'].includes(tx.type)) {
      tonOutcome += amount;
    }
  });
  
  console.log('\nTON транзакции:');
  console.log(`- Доход: +${tonIncome.toFixed(6)} TON`);
  console.log(`- Расход: -${tonOutcome.toFixed(6)} TON`);
  console.log(`- Итого: ${(tonIncome - tonOutcome).toFixed(6)} TON`);
  console.log(`- Текущий баланс: ${user?.balance_ton} TON`);
  
  // 4. Проверяем API эндпоинт
  console.log('\n\n4️⃣ ПРОВЕРКА API ЛОГИКИ:');
  console.log('\nМеста в коде, которые могут влиять на отображение:');
  console.log('1. modules/transactions/controller.ts - фильтрация по currency');
  console.log('2. modules/transactions/service.ts - делегирование на UnifiedTransactionService');
  console.log('3. core/TransactionService.ts - фильтрация в getUserTransactions');
  
  // 5. Проверяем есть ли реферальные награды
  console.log('\n\n5️⃣ РЕФЕРАЛЬНЫЕ НАГРАДЫ:');
  
  const { data: refRewards } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'REFERRAL_REWARD')
    .order('created_at', { ascending: false })
    .limit(10);
    
  console.log(`\nВсего реферальных наград: ${refRewards?.length || 0}`);
  
  if (refRewards) {
    let totalUniRef = 0;
    let totalTonRef = 0;
    
    refRewards.forEach(tx => {
      if (tx.currency === 'UNI') totalUniRef += parseFloat(tx.amount);
      if (tx.currency === 'TON') totalTonRef += parseFloat(tx.amount);
    });
    
    console.log(`- UNI реферальных: ${totalUniRef.toFixed(6)} UNI`);
    console.log(`- TON реферальных: ${totalTonRef.toFixed(6)} TON`);
  }
  
  // 6. Финальный анализ
  console.log('\n\n📊 ВЫВОДЫ:');
  console.log('================');
  
  if (tonTx && tonTx.length > 0) {
    console.log('✅ TON транзакции ЕСТЬ в базе данных');
    console.log('⚠️  Возможные причины проблемы с отображением:');
    console.log('   1. Проблема с фильтрацией в API');
    console.log('   2. Проблема с UI компонентом TransactionHistory');
    console.log('   3. Кеширование на frontend');
  } else {
    console.log('❌ TON транзакций НЕТ в базе данных');
  }
  
  const balanceDiffUni = parseFloat(user?.balance_uni || '0') - (uniIncome - uniOutcome);
  const balanceDiffTon = parseFloat(user?.balance_ton || '0') - (tonIncome - tonOutcome);
  
  if (Math.abs(balanceDiffUni) > 0.01) {
    console.log(`\n⚠️  Расхождение UNI баланса: ${balanceDiffUni.toFixed(6)} UNI`);
  }
  
  if (Math.abs(balanceDiffTon) > 0.01) {
    console.log(`\n⚠️  Расхождение TON баланса: ${balanceDiffTon.toFixed(6)} TON`);
  }
}

// Запускаем проверку
checkTonTransactionsIssue()
  .then(() => console.log('\n✅ Диагностика завершена'))
  .catch(error => console.error('❌ Ошибка:', error));