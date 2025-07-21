#!/usr/bin/env node
/**
 * Диагностика 3 критических проблем production без изменений в коде:
 * 1. Цвета TON транзакций не обновляются
 * 2. TON баланс не отображается в кошельке  
 * 3. Планировщик работает неправильно на production
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function diagnoseCriticalProblems() {
  console.log('🔍 ДИАГНОСТИКА КРИТИЧЕСКИХ ПРОБЛЕМ PRODUCTION\n');
  console.log('📋 Задачи:');
  console.log('   1. Цвета TON транзакций не обновляются');
  console.log('   2. TON баланс не отображается в кошельке'); 
  console.log('   3. Планировщик работает неправильно на production\n');

  // ================================
  // 1. ДИАГНОСТИКА ЦВЕТОВ ТРАНЗАКЦИЙ
  // ================================
  console.log('🔵 ПРОБЛЕМА 1: ЦВЕТА TON ТРАНЗАКЦИЙ\n');

  try {
    // Проверяем последние TON транзакции User 184
    const { data: tonTransactions, error: tonTxError } = await supabase
      .from('transactions')
      .select('id, type, currency, amount, description, metadata, created_at')
      .eq('user_id', 184)
      .eq('currency', 'TON')
      .order('created_at', { ascending: false })
      .limit(5);

    if (tonTxError) {
      console.error('❌ Ошибка получения TON транзакций:', tonTxError);
    } else {
      console.log(`📊 Найдено ${tonTransactions.length} TON транзакций для User 184:`);
      
      tonTransactions.forEach((tx, i) => {
        console.log(`\n   ${i + 1}. Transaction ID: ${tx.id}`);
        console.log(`      Type: ${tx.type}`);
        console.log(`      Currency: ${tx.currency}`);
        console.log(`      Amount: ${tx.amount}`);
        console.log(`      Description: ${tx.description}`);
        console.log(`      Metadata: ${tx.metadata ? JSON.stringify(tx.metadata) : 'null'}`);
        console.log(`      Created: ${tx.created_at}`);

        // Анализ типа для цвета
        if (tx.metadata && tx.metadata.original_type) {
          console.log(`      🎨 Original Type (для цвета): ${tx.metadata.original_type}`);
        }
        
        if (tx.type === 'FARMING_REWARD' && tx.currency === 'TON') {
          console.log(`      🔍 Ожидаемый цвет: СИНИЙ (TON reward)`);
        }
      });
    }

    // Проверяем API ответ
    console.log('\n🔍 Проверяю API /api/v2/transactions...');
    const fetch = require('node-fetch');
    
    const response = await fetch(`http://localhost:3000/api/v2/transactions?user_id=184&limit=5&currency=TON`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const apiData = await response.json();
      
      if (apiData.success && apiData.data && apiData.data.length > 0) {
        console.log(`✅ API возвращает ${apiData.data.length} TON транзакций`);
        
        const firstTx = apiData.data[0];
        console.log('\n📋 Первая транзакция из API:');
        console.log(`   ID: ${firstTx.id}`);
        console.log(`   Type: ${firstTx.type}`);
        console.log(`   Currency: ${firstTx.currency}`);
        console.log(`   Original Type: ${firstTx.metadata?.original_type || 'не задан'}`);
        
        if (firstTx.metadata?.original_type === 'TON_BOOST_INCOME') {
          console.log('   🎨 Ожидаемое поведение: СИНИЙ цвет в UI');
        } else {
          console.log('   ⚠️ Original type не установлен для различения цвета');
        }
      }
    } else {
      console.log(`❌ API ошибка: ${response.status} ${response.statusText}`);
    }

  } catch (error) {
    console.error('❌ Ошибка диагностики цветов транзакций:', error.message);
  }

  // ================================
  // 2. ДИАГНОСТИКА TON БАЛАНСА
  // ================================
  console.log('\n\n💰 ПРОБЛЕМА 2: TON БАЛАНС НЕ ОТОБРАЖАЕТСЯ\n');

  try {
    // Проверяем баланс User 184 в БД
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, balance_ton, balance_uni, uni_deposit_amount')
      .eq('id', 184)
      .single();

    if (userError) {
      console.error('❌ Ошибка получения пользователя из БД:', userError);
    } else {
      console.log('📊 Баланс User 184 в БД:');
      console.log(`   TON Balance: ${user.balance_ton}`);
      console.log(`   UNI Balance: ${user.balance_uni}`);
      console.log(`   UNI Deposit: ${user.uni_deposit_amount}`);
    }

    // Проверяем API баланса
    console.log('\n🔍 Проверяю API /api/v2/wallet/balance...');
    
    const balanceResponse = await fetch(`http://localhost:3000/api/v2/wallet/balance?user_id=184`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (balanceResponse.ok) {
      const balanceData = await balanceResponse.json();
      
      if (balanceData.success) {
        console.log('✅ API баланса работает:');
        console.log(`   TON Balance: ${balanceData.data.balance_ton}`);
        console.log(`   UNI Balance: ${balanceData.data.balance_uni}`);
        
        if (user && Math.abs(user.balance_ton - balanceData.data.balance_ton) > 0.001) {
          console.log('⚠️ РАСХОЖДЕНИЕ между БД и API балансами!');
          console.log(`   БД: ${user.balance_ton}, API: ${balanceData.data.balance_ton}`);
        } else {
          console.log('✅ Балансы в БД и API совпадают');
        }
      }
    } else {
      console.log(`❌ API баланса ошибка: ${balanceResponse.status} ${balanceResponse.statusText}`);
    }

    // Проверяем последние TON депозиты
    console.log('\n🔍 Анализ последних TON депозитов...');
    
    const { data: recentTonTx, error: recentError } = await supabase
      .from('transactions')
      .select('id, amount, description, created_at, metadata')
      .eq('user_id', 184)
      .eq('currency', 'TON')
      .order('created_at', { ascending: false })
      .limit(3);

    if (recentError) {
      console.error('❌ Ошибка получения недавних TON транзакций:', recentError);
    } else {
      console.log(`📋 Последние ${recentTonTx.length} TON транзакции:`);
      
      recentTonTx.forEach((tx, i) => {
        const created = new Date(tx.created_at);
        const now = new Date();
        const diffMinutes = (now - created) / (1000 * 60);
        
        console.log(`   ${i + 1}. ID ${tx.id}: ${tx.amount} TON`);
        console.log(`      Создана: ${diffMinutes.toFixed(1)} минут назад`);
        console.log(`      Описание: ${tx.description}`);
      });
    }

  } catch (error) {
    console.error('❌ Ошибка диагностики TON баланса:', error.message);
  }

  // ================================
  // 3. ДИАГНОСТИКА ПЛАНИРОВЩИКА
  // ================================
  console.log('\n\n🔁 ПРОБЛЕМА 3: ПЛАНИРОВЩИК НА PRODUCTION\n');

  try {
    // Анализируем интервалы TON Boost транзакций
    console.log('📊 Анализ интервалов TON Boost начислений...');
    
    const { data: tonBoostTx, error: boostError } = await supabase
      .from('transactions')
      .select('id, amount, created_at, description, metadata')
      .eq('currency', 'TON')
      .eq('type', 'FARMING_REWARD')
      .order('created_at', { ascending: false })
      .limit(10);

    if (boostError) {
      console.error('❌ Ошибка получения TON Boost транзакций:', boostError);
    } else {
      console.log(`🔍 Анализ ${tonBoostTx.length} последних TON Boost транзакций:`);
      
      let previousTime = null;
      const intervals = [];
      
      tonBoostTx.reverse().forEach((tx, i) => {
        const currentTime = new Date(tx.created_at);
        
        if (previousTime) {
          const intervalMinutes = (currentTime - previousTime) / (1000 * 60);
          intervals.push(intervalMinutes);
          
          console.log(`   ${i}. ID ${tx.id}: ${tx.amount} TON`);
          console.log(`      Интервал: ${intervalMinutes.toFixed(2)} минут`);
          console.log(`      Время: ${currentTime.toLocaleString()}`);
          
          if (intervalMinutes < 2) {
            console.log('      🚨 АНОМАЛЬНО КОРОТКИЙ ИНТЕРВАЛ!');
          } else if (intervalMinutes > 7) {
            console.log('      ⏰ Длинный интервал (возможно перезапуск)');
          } else if (intervalMinutes >= 4.5 && intervalMinutes <= 5.5) {
            console.log('      ✅ Нормальный 5-минутный интервал');
          }
        }
        
        previousTime = currentTime;
      });
      
      if (intervals.length > 0) {
        const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
        const minInterval = Math.min(...intervals);
        const maxInterval = Math.max(...intervals);
        
        console.log('\n📈 СТАТИСТИКА ИНТЕРВАЛОВ:');
        console.log(`   Средний интервал: ${avgInterval.toFixed(2)} минут`);
        console.log(`   Минимальный: ${minInterval.toFixed(2)} минут`);
        console.log(`   Максимальный: ${maxInterval.toFixed(2)} минут`);
        
        if (avgInterval < 3) {
          console.log('   🚨 ПРОБЛЕМА: Средний интервал менее 3 минут!');
        } else if (avgInterval >= 4.5 && avgInterval <= 5.5) {
          console.log('   ✅ НОРМА: Планировщик работает каждые 5 минут');
        } else {
          console.log('   ⚠️ ОТКЛОНЕНИЕ: Интервалы не соответствуют 5 минутам');
        }
      }
    }

    // Проверяем активные TON Boost пользователи
    console.log('\n🔍 Проверка активных TON Boost пользователей...');
    
    const { data: activeUsers, error: activeError } = await supabase
      .from('users')
      .select('id, balance_ton, ton_boost_package_id')
      .gt('balance_ton', 0)
      .not('ton_boost_package_id', 'is', null);

    if (activeError) {
      console.error('❌ Ошибка получения активных пользователей:', activeError);
    } else {
      console.log(`📊 Найдено ${activeUsers.length} активных TON Boost пользователей`);
      
      activeUsers.forEach((user, i) => {
        console.log(`   ${i + 1}. User ${user.id}: ${user.balance_ton} TON, Package: ${user.ton_boost_package_id}`);
      });
      
      if (activeUsers.length === 0) {
        console.log('⚠️ Нет активных пользователей - планировщик может не работать');
      }
    }

  } catch (error) {
    console.error('❌ Ошибка диагностики планировщика:', error.message);
  }

  console.log('\n🎯 ДИАГНОСТИКА ЗАВЕРШЕНА');
  console.log('📋 Следующий шаг: анализ результатов и рекомендации');
}

diagnoseCriticalProblems();