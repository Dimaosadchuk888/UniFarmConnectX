#!/usr/bin/env node
/**
 * ДИАГНОСТИКА TON ПОПОЛНЕНИЙ - ПОЛЬЗОВАТЕЛИ 25 И 227
 * Только анализ, БЕЗ изменений кода
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function checkUserExists(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('id, telegram_id, username, balance_ton')
    .eq('id', userId)
    .single();
    
  return { data, error };
}

async function checkAllTransactionsForUser(userId) {
  console.log(`\n🔍 ПОЛНАЯ ДИАГНОСТИКА ТРАНЗАКЦИЙ - USER ${userId}`);
  
  // Все транзакции пользователя
  const { data: allTx, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error(`❌ Ошибка получения транзакций User ${userId}:`, error.message);
    return;
  }

  console.log(`📊 Всего транзакций User ${userId}: ${allTx.length}`);
  
  if (allTx.length === 0) {
    console.log(`⚠️  User ${userId} НЕ ИМЕЕТ ТРАНЗАКЦИЙ в БД`);
    return;
  }

  // Группируем по типам
  const byType = {};
  const tonTransactions = [];
  
  allTx.forEach(tx => {
    // Группировка по типам
    if (!byType[tx.type]) byType[tx.type] = 0;
    byType[tx.type]++;
    
    // TON транзакции
    if (tx.currency === 'TON' || tx.type.includes('TON') || tx.description.toLowerCase().includes('ton')) {
      tonTransactions.push(tx);
    }
  });

  console.log(`📈 Типы транзакций:`);
  Object.keys(byType).forEach(type => {
    console.log(`   ${type}: ${byType[type]} шт.`);
  });

  console.log(`💎 TON-связанных транзакций: ${tonTransactions.length}`);
  
  if (tonTransactions.length > 0) {
    console.log(`📝 Детали TON транзакций:`);
    tonTransactions.forEach(tx => {
      console.log(`   ID ${tx.id}: ${tx.type} | ${tx.amount} ${tx.currency} | ${new Date(tx.created_at).toLocaleString()}`);
      console.log(`      Описание: ${tx.description}`);
      if (tx.metadata) {
        console.log(`      Metadata: ${JSON.stringify(tx.metadata)}`);
      }
      if (tx.tx_hash) {
        console.log(`      TX Hash: ${tx.tx_hash}`);
      }
    });
  }

  return { allTx, tonTransactions, byType };
}

async function checkBalanceHistory(userId) {
  console.log(`\n💰 ИСТОРИЯ БАЛАНСОВ - USER ${userId}`);
  
  // Проверяем текущий баланс
  const { data: user } = await supabase
    .from('users')
    .select('balance_ton, balance_uni')
    .eq('id', userId)
    .single();

  if (user) {
    console.log(`📊 Текущие балансы:`);
    console.log(`   TON: ${user.balance_ton}`);
    console.log(`   UNI: ${user.balance_uni}`);
  }

  // Проверяем TON-связанные транзакции для расчета ожидаемого баланса
  const { data: tonTxs } = await supabase
    .from('transactions')
    .select('amount, type, currency, description, created_at')
    .eq('user_id', userId)
    .eq('currency', 'TON')
    .order('created_at', { ascending: true });

  if (tonTxs && tonTxs.length > 0) {
    console.log(`💎 Расчет баланса по TON транзакциям:`);
    let calculatedBalance = 0;
    tonTxs.forEach(tx => {
      const amount = parseFloat(tx.amount) || 0;
      calculatedBalance += amount;
      console.log(`   ${new Date(tx.created_at).toLocaleString()}: ${tx.type} ${amount} (итого: ${calculatedBalance.toFixed(6)})`);
    });
    
    console.log(`🎯 Расчетный баланс TON: ${calculatedBalance.toFixed(6)}`);
    console.log(`📈 Фактический баланс TON: ${user ? user.balance_ton : 'N/A'}`);
    
    if (user && Math.abs(calculatedBalance - parseFloat(user.balance_ton || 0)) > 0.000001) {
      console.log(`🚨 РАСХОЖДЕНИЕ БАЛАНСОВ обнаружено!`);
    }
  }
}

async function checkTonDepositMechanism() {
  console.log(`\n🔧 ДИАГНОСТИКА МЕХАНИЗМА TON ДЕПОЗИТОВ`);
  
  // Ищем недавние TON_DEPOSIT транзакции
  const { data: recentTonDeposits } = await supabase
    .from('transactions')
    .select('*')
    .eq('type', 'TON_DEPOSIT')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log(`📥 Недавних TON_DEPOSIT транзакций: ${recentTonDeposits?.length || 0}`);
  
  if (recentTonDeposits && recentTonDeposits.length > 0) {
    console.log(`📝 Примеры TON_DEPOSIT:`);
    recentTonDeposits.slice(0, 3).forEach(tx => {
      console.log(`   ID ${tx.id}: User ${tx.user_id} | ${tx.amount} TON | ${new Date(tx.created_at).toLocaleString()}`);
    });
  }

  // Ищем DEPOSIT с currency=TON как альтернативу
  const { data: depositTon } = await supabase
    .from('transactions')
    .select('*')
    .eq('type', 'DEPOSIT')
    .eq('currency', 'TON')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log(`📥 DEPOSIT + currency=TON транзакций: ${depositTon?.length || 0}`);
  
  if (depositTon && depositTon.length > 0) {
    console.log(`📝 Примеры DEPOSIT TON:`);
    depositTon.slice(0, 3).forEach(tx => {
      console.log(`   ID ${tx.id}: User ${tx.user_id} | ${tx.amount} TON | ${new Date(tx.created_at).toLocaleString()}`);
    });
  }

  // Проверяем описания, которые могут содержать "TON"
  const { data: tonDescriptions } = await supabase
    .from('transactions')
    .select('*')
    .ilike('description', '%TON%')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log(`📝 Транзакции с "TON" в описании: ${tonDescriptions?.length || 0}`);
}

async function checkUIFiltering() {
  console.log(`\n🎨 ДИАГНОСТИКА UI ФИЛЬТРАЦИИ`);
  
  // Проверяем как API возвращает транзакции для каждого пользователя
  for (const userId of [25, 227]) {
    console.log(`\n👤 API тест для User ${userId}:`);
    
    try {
      // Симуляция API запроса без фильтров (как это делает UI)
      const { data: allForUser } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      console.log(`   📊 Всего транзакций: ${allForUser?.length || 0}`);
      
      if (allForUser && allForUser.length > 0) {
        // Группируем по валютам
        const currencies = {};
        allForUser.forEach(tx => {
          if (!currencies[tx.currency]) currencies[tx.currency] = 0;
          currencies[tx.currency]++;
        });
        
        console.log(`   💱 По валютам:`);
        Object.keys(currencies).forEach(curr => {
          console.log(`      ${curr}: ${currencies[curr]} шт.`);
        });
        
        // Последние 3 транзакции
        console.log(`   📝 Последние 3 транзакции:`);
        allForUser.slice(0, 3).forEach(tx => {
          console.log(`      ${tx.type} | ${tx.amount} ${tx.currency} | ${new Date(tx.created_at).toLocaleString()}`);
        });
      }
      
    } catch (error) {
      console.error(`   ❌ Ошибка API теста для User ${userId}:`, error.message);
    }
  }
}

async function runFullDiagnosis() {
  console.log('🚀 ДИАГНОСТИКА TON ПОПОЛНЕНИЙ - USERS 25 & 227');
  console.log('=' * 60);
  console.log('⚠️  ТОЛЬКО АНАЛИЗ, БЕЗ ИЗМЕНЕНИЙ КОДА');
  
  // Проверяем существование пользователей
  console.log('\n👥 ПРОВЕРКА ПОЛЬЗОВАТЕЛЕЙ:');
  
  const user25 = await checkUserExists(25);
  const user227 = await checkUserExists(227);
  
  if (user25.error) {
    console.log('❌ User 25 не найден:', user25.error.message);
  } else {
    console.log('✅ User 25 найден:', {
      id: user25.data.id,
      telegram_id: user25.data.telegram_id,
      username: user25.data.username,
      balance_ton: user25.data.balance_ton
    });
  }
  
  if (user227.error) {
    console.log('❌ User 227 не найден:', user227.error.message);
  } else {
    console.log('✅ User 227 найден:', {
      id: user227.data.id,
      telegram_id: user227.data.telegram_id,
      username: user227.data.username,
      balance_ton: user227.data.balance_ton
    });
  }

  // Полная диагностика транзакций
  if (user25.data) {
    await checkAllTransactionsForUser(25);
    await checkBalanceHistory(25);
  }
  
  if (user227.data) {
    await checkAllTransactionsForUser(227);
    await checkBalanceHistory(227);
  }

  // Общая диагностика механизма
  await checkTonDepositMechanism();
  await checkUIFiltering();

  console.log('\n' + '=' * 60);
  console.log('🎯 ДИАГНОСТИКА ЗАВЕРШЕНА');
  
  return {
    user25: user25.data,
    user227: user227.data
  };
}

runFullDiagnosis().catch(console.error);