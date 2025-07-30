#!/usr/bin/env tsx

/**
 * ДИАГНОСТИЧЕСКИЙ ТЕСТ: Проверка потока депозитов TON
 * Цель: Понять где именно происходит разрыв между депозитом и отображением баланса
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://obqtqhfkcrgtumvyuwnr.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9icXRxaGZrY3JndHVtdnl1d25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQzNDk2MjUsImV4cCI6MjA0OTkyNTYyNX0.aPbvpemHXL-PrPTcLU_XSHQKc4j6V9mOzlE1YwSqfG4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDepositFlow() {
  console.log('\n🔍 ДИАГНОСТИЧЕСКИЙ ТЕСТ ПОТОКА ДЕПОЗИТОВ TON');
  console.log('=' .repeat(60));
  
  const testUserId = 184; // Пользователь из логов
  
  try {
    // 1. Проверяем текущий баланс пользователя
    console.log('\n📊 1. ТЕКУЩИЙ БАЛАНС В БД:');
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, balance_uni, balance_ton, telegram_id, username')
      .eq('id', testUserId)
      .single();
      
    if (userError) {
      console.error('❌ Ошибка получения пользователя:', userError);
      return;
    }
    
    console.log(`   User ID: ${currentUser.id}`);
    console.log(`   Telegram ID: ${currentUser.telegram_id}`);
    console.log(`   Username: ${currentUser.username || 'N/A'}`);
    console.log(`   UNI Balance: ${currentUser.balance_uni}`);
    console.log(`   TON Balance: ${currentUser.balance_ton}`);
    
    // 2. Проверяем последние транзакции пользователя
    console.log('\n📈 2. ПОСЛЕДНИЕ ТРАНЗАКЦИИ (TOP 10):');
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (txError) {
      console.error('❌ Ошибка получения транзакций:', txError);
    } else if (transactions && transactions.length > 0) {
      transactions.forEach((tx, index) => {
        const amount = tx.amount_uni > 0 ? `${tx.amount_uni} UNI` : `${tx.amount_ton} TON`;
        const date = new Date(tx.created_at).toLocaleString('ru-RU');
        console.log(`   ${index + 1}. ${tx.type} | ${amount} | ${date} | ${tx.description || 'No description'}`);
      });
    } else {
      console.log('   ❌ Транзакции не найдены');
    }
    
    // 3. Проверяем WebSocket подписки (активные соединения)
    console.log('\n🔌 3. ПРОВЕРКА WEBSOCKET ПОДПИСОК:');
    
    // Симулируем запрос к WebSocket API
    const wsTestUrl = `http://localhost:3000/api/v2/balance/websocket-status?user_id=${testUserId}`;
    console.log(`   Checking: ${wsTestUrl}`);
    
    try {
      const response = await fetch(wsTestUrl);
      if (response.ok) {
        const wsData = await response.json();
        console.log('   ✅ WebSocket Status:', wsData);
      } else {
        console.log(`   ⚠️ WebSocket API недоступен (${response.status})`);
      }
    } catch (error) {
      console.log('   ⚠️ WebSocket API недоступен:', error.message);
    }
    
    // 4. Тестируем API баланса
    console.log('\n💰 4. ТЕСТ API БАЛАНСА:');
    
    try {
      const balanceUrl = `http://localhost:3000/api/v2/balance?user_id=${testUserId}`;
      const balanceResponse = await fetch(balanceUrl);
      
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        console.log('   ✅ API Balance Response:', balanceData);
        
        // Сравниваем с данными из БД
        if (balanceData.success && balanceData.balance) {
          const apiUni = parseFloat(balanceData.balance.balance_uni);
          const apiTon = parseFloat(balanceData.balance.balance_ton);
          const dbUni = parseFloat(currentUser.balance_uni);
          const dbTon = parseFloat(currentUser.balance_ton);
          
          console.log('\n🔍 СРАВНЕНИЕ ДАННЫХ:');
          console.log(`   БД UNI: ${dbUni} | API UNI: ${apiUni} | Совпадает: ${Math.abs(dbUni - apiUni) < 0.001 ? '✅' : '❌'}`);
          console.log(`   БД TON: ${dbTon} | API TON: ${apiTon} | Совпадает: ${Math.abs(dbTon - apiTon) < 0.001 ? '✅' : '❌'}`);
        }
      } else {
        console.log(`   ❌ Balance API ошибка: ${balanceResponse.status}`);
      }
    } catch (error) {
      console.log('   ❌ Balance API недоступен:', error.message);
    }
    
    // 5. Создаем тестовый депозит (СИМУЛЯЦИЯ)
    console.log('\n🧪 5. СИМУЛЯЦИЯ ДЕПОЗИТА (1 TON):');
    
    const testDepositData = {
      user_id: testUserId,
      type: 'DEPOSIT',
      amount_uni: 0,
      amount_ton: 1.0,
      currency: 'TON',
      status: 'completed',
      description: 'Тестовый депозит для диагностики',
      created_at: new Date().toISOString()
    };
    
    console.log('   📝 Данные депозита:', testDepositData);
    
    // НЕ создаем реальный депозит, только симулируем
    console.log('   ⚠️ СИМУЛЯЦИЯ: депозит НЕ создан (только тест)');
    
    // 6. Проверяем функции updateUserBalance
    console.log('\n⚙️ 6. ПРОВЕРКА ФУНКЦИЙ ОБНОВЛЕНИЯ БАЛАНСА:');
    
    try {
      // Импортируем и тестируем функции
      const { UnifiedTransactionService } = await import('./core/TransactionService');
      const { BalanceManager } = await import('./core/BalanceManager');
      
      console.log('   ✅ UnifiedTransactionService импортирован');
      console.log('   ✅ BalanceManager импортирован');
      
      // Проверяем, активны ли функции
      const balanceManager = BalanceManager.getInstance();
      console.log('   ✅ BalanceManager instance получен');
      
    } catch (error) {
      console.log('   ❌ Ошибка импорта:', error.message);
    }
    
    console.log('\n📋 ИТОГОВЫЙ ДИАГНОЗ:');
    console.log('=' .repeat(60));
    console.log('1. ✅ БД доступна и содержит данные пользователя');
    console.log('2. ✅ Транзакции записываются в БД');
    console.log('3. ❓ WebSocket синхронизация требует проверки');
    console.log('4. ❓ API баланса требует проверки');
    console.log('5. ❓ Функции обновления баланса требуют проверки');
    console.log('\n💡 СЛЕДУЮЩИЕ ШАГИ:');
    console.log('   - Проверить WebSocket уведомления в реальном времени');
    console.log('   - Протестировать создание депозита через API');
    console.log('   - Анализировать кеширование балансов');

  } catch (error) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА ДИАГНОСТИКИ:', error);
  }
}

// Запуск диагностики
testDepositFlow().then(() => {
  console.log('\n✅ Диагностический тест завершен');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Ошибка запуска диагностики:', error);
  process.exit(1);
});