#!/usr/bin/env node
/**
 * ДИАГНОСТИКА ИНТЕГРАЦИИ TON CONNECT
 * Проверка цепочки: Tonkeeper → Backend → Database
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function checkRecentTonActivity() {
  console.log('🔍 ПОИСК НЕДАВНИХ TON АКТИВНОСТЕЙ');
  
  // Ищем любые недавние TON активности (последние 24 часа)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const { data: recentActivity, error } = await supabase
    .from('transactions')
    .select('*')
    .or('currency.eq.TON,description.ilike.%TON%,type.ilike.%TON%')
    .gte('created_at', yesterday.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Ошибка поиска TON активности:', error.message);
    return [];
  }

  console.log(`📊 TON активностей за 24 часа: ${recentActivity.length}`);
  
  if (recentActivity.length > 0) {
    console.log('📝 Недавние TON транзакции:');
    recentActivity.forEach(tx => {
      console.log(`   ID ${tx.id}: User ${tx.user_id} | ${tx.type} | ${tx.amount} ${tx.currency}`);
      console.log(`      ${new Date(tx.created_at).toLocaleString()} - ${tx.description}`);
      
      // Проверяем пользователей 25 и 227
      if (tx.user_id === 25 || tx.user_id === 227) {
        console.log(`      🎯 НАЙДЕНА ТРАНЗАКЦИЯ ЦЕЛЕВОГО ПОЛЬЗОВАТЕЛЯ!`);
      }
    });
  }

  return recentActivity;
}

async function checkTonConnectLogs() {
  console.log('\n🔗 ДИАГНОСТИКА TON CONNECT ЛОГИКИ');
  
  // Ищем транзакции, которые могли быть созданы TON Connect
  const { data: possibleTonConnect, error } = await supabase
    .from('transactions')
    .select('*')
    .or('description.ilike.%blockchain%,description.ilike.%tonkeeper%,description.ilike.%wallet%')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('❌ Ошибка поиска TON Connect транзакций:', error.message);
    return;
  }

  console.log(`🔗 Возможных TON Connect транзакций: ${possibleTonConnect.length}`);
  
  if (possibleTonConnect.length > 0) {
    console.log('📝 Примеры:');
    possibleTonConnect.slice(0, 5).forEach(tx => {
      console.log(`   ID ${tx.id}: User ${tx.user_id} | ${tx.type} | ${tx.description}`);
      
      if (tx.user_id === 25 || tx.user_id === 227) {
        console.log(`      🎯 ЦЕЛЕВОЙ ПОЛЬЗОВАТЕЛЬ НАЙДЕН!`);
      }
    });
  }
}

async function checkMissingTransactions() {
  console.log('\n🕵️ ПОИСК "ПОТЕРЯННЫХ" ТРАНЗАКЦИЙ');
  
  // Проверяем аномалии в ID транзакций (пропуски могут указывать на потерянные записи)
  const { data: recentIds } = await supabase
    .from('transactions')
    .select('id')
    .order('id', { ascending: false })
    .limit(100);

  if (recentIds && recentIds.length > 1) {
    const gaps = [];
    for (let i = 0; i < recentIds.length - 1; i++) {
      const current = recentIds[i].id;
      const next = recentIds[i + 1].id;
      const gap = current - next;
      
      if (gap > 10) { // Подозрительно большой пропуск
        gaps.push({ from: next, to: current, gap: gap - 1 });
      }
    }
    
    if (gaps.length > 0) {
      console.log('🚨 НАЙДЕНЫ ПОДОЗРИТЕЛЬНЫЕ ПРОПУСКИ В ID:');
      gaps.slice(0, 3).forEach(gap => {
        console.log(`   ID ${gap.from} → ${gap.to} (пропущено ~${gap.gap} записей)`);
      });
    } else {
      console.log('✅ Аномальных пропусков в ID не найдено');
    }
  }
}

async function checkUserSpecificIssues() {
  console.log('\n👤 СПЕЦИФИЧЕСКАЯ ДИАГНОСТИКА ПОЛЬЗОВАТЕЛЕЙ 25 И 227');
  
  for (const userId of [25, 227]) {
    console.log(`\n--- User ${userId} ---`);
    
    // Последняя активность
    const { data: lastActivity } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (lastActivity && lastActivity.length > 0) {
      const last = lastActivity[0];
      console.log(`📅 Последняя активность: ${new Date(last.created_at).toLocaleString()}`);
      console.log(`   ${last.type} | ${last.amount} ${last.currency} | ${last.description}`);
    } else {
      console.log(`⚠️  НЕТ ТРАНЗАКЦИЙ для User ${userId}`);
    }
    
    // Проверяем баланс
    const { data: user } = await supabase
      .from('users')
      .select('balance_ton, balance_uni, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (user) {
      console.log(`💰 Балансы: TON=${user.balance_ton}, UNI=${user.balance_uni}`);
      console.log(`📊 Обновлен: ${new Date(user.updated_at).toLocaleString()}`);
      
      // Если баланс TON > 0, но нет TON транзакций - это аномалия
      if (parseFloat(user.balance_ton || 0) > 0) {
        const { data: tonTx } = await supabase
          .from('transactions')
          .select('count')
          .eq('user_id', userId)
          .eq('currency', 'TON');
        
        if (!tonTx || tonTx.length === 0) {
          console.log(`🚨 АНОМАЛИЯ: TON баланс ${user.balance_ton} БЕЗ соответствующих транзакций!`);
        }
      }
    }
  }
}

async function runTonConnectDiagnosis() {
  console.log('🔧 ДИАГНОСТИКА TON CONNECT ИНТЕГРАЦИИ');
  console.log('=' * 50);
  
  const results = {};
  
  results.recentActivity = await checkRecentTonActivity();
  await checkTonConnectLogs();
  await checkMissingTransactions();
  await checkUserSpecificIssues();
  
  console.log('\n🎯 ВЫВОДЫ:');
  
  // Анализируем результаты
  const user25Activity = results.recentActivity.filter(tx => tx.user_id === 25);
  const user227Activity = results.recentActivity.filter(tx => tx.user_id === 227);
  
  console.log(`📊 User 25 TON активность за 24ч: ${user25Activity.length}`);
  console.log(`📊 User 227 TON активность за 24ч: ${user227Activity.length}`);
  
  if (user25Activity.length === 0 && user227Activity.length === 0) {
    console.log('⚠️  НИ ОДИН из целевых пользователей НЕ ИМЕЕТ недавних TON транзакций');
    console.log('💡 Возможные причины:');
    console.log('   1. Транзакция не дошла до backend API');
    console.log('   2. Ошибка в TON Connect интеграции');
    console.log('   3. Транзакция записалась под другим user_id');
    console.log('   4. Проблема с типом/форматом транзакции');
  }
  
  console.log('\n✅ Диагностика TON Connect завершена');
}

runTonConnectDiagnosis().catch(console.error);