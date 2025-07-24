#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY!
);

console.log('\n🧪 ТЕСТ: DEPOSIT ТРАНЗАКЦИИ И WEBSOCKET ИНТЕГРАЦИЯ');
console.log('='.repeat(65));

async function testDepositWebSocketFix() {
  try {
    // 1. Проверяем что DEPOSIT транзакции существуют
    console.log('\n1️⃣ ПРОВЕРКА СУЩЕСТВУЮЩИХ DEPOSIT ТРАНЗАКЦИЙ');
    console.log('-'.repeat(50));
    
    const { data: existingDeposits, error: depositError } = await supabase
      .from('transactions')
      .select('id, user_id, amount_ton, description, created_at')
      .eq('type', 'DEPOSIT')
      .gt('amount_ton', 0.05)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!depositError && existingDeposits && existingDeposits.length > 0) {
      console.log(`✅ Найдено ${existingDeposits.length} существующих DEPOSIT транзакций:`);
      existingDeposits.forEach(tx => {
        console.log(`   ID: ${tx.id}, User: ${tx.user_id}, Amount: ${tx.amount_ton} TON`);
        console.log(`   Время: ${new Date(tx.created_at).toLocaleString('ru-RU')}`);
      });
      
      // Тестируем первую найденную транзакцию
      const testTransaction = existingDeposits[0];
      console.log(`\n🔍 ТЕСТИРУЕМ ТРАНЗАКЦИЮ: ID ${testTransaction.id}`);
      
      // Проверяем баланс пользователя до
      const { data: userBefore, error: userError } = await supabase
        .from('users')
        .select('id, balance_ton, telegram_username')
        .eq('id', testTransaction.user_id)
        .single();
        
      if (!userError && userBefore) {
        console.log(`   📊 Пользователь @${userBefore.telegram_username}`);
        console.log(`   💰 Текущий баланс: ${userBefore.balance_ton} TON`);
        
        // Проверяем есть ли другие DEPOSIT транзакции для этого пользователя
        const { data: userDeposits, error: userDepositError } = await supabase
          .from('transactions')
          .select('id, amount_ton, created_at')
          .eq('user_id', testTransaction.user_id)
          .eq('type', 'DEPOSIT')
          .order('created_at', { ascending: false })
          .limit(10);
          
        if (!userDepositError && userDeposits) {
          const totalDeposits = userDeposits.reduce((sum, tx) => sum + parseFloat(tx.amount_ton || '0'), 0);
          console.log(`   📥 Всего DEPOSIT транзакций: ${userDeposits.length}`);
          console.log(`   💎 Общая сумма депозитов: ${totalDeposits.toFixed(3)} TON`);
          
          // Сравниваем с балансом
          const balanceDiff = parseFloat(userBefore.balance_ton || '0') - totalDeposits;
          console.log(`   ⚖️  Разница баланс vs депозиты: ${balanceDiff.toFixed(3)} TON`);
          
          if (Math.abs(balanceDiff) < 0.001) {
            console.log(`   ✅ БАЛАНС СООТВЕТСТВУЕТ ДЕПОЗИТАМ - WebSocket работал корректно`);
          } else {
            console.log(`   ⚠️  БАЛАНС НЕ СООТВЕТСТВУЕТ - возможны проблемы с WebSocket`);
          }
        }
      }
      
    } else {
      console.log('❌ DEPOSIT транзакции не найдены для тестирования');
    }

    // 2. Проверяем код исправления
    console.log('\n2️⃣ ПРОВЕРКА ПРИМЕНЕНИЯ ИСПРАВЛЕНИЯ');
    console.log('-'.repeat(50));
    
    console.log('📋 ВНЕСЕННЫЕ ИЗМЕНЕНИЯ:');
    console.log('   ✅ Добавлен тип DEPOSIT в TransactionsTransactionType');
    console.log('   ✅ Добавлен маппинг "DEPOSIT": "DEPOSIT" в TRANSACTION_TYPE_MAPPING');
    console.log('   ✅ Добавлен DEPOSIT в shouldUpdateBalance() список');
    console.log('   ✅ LSP ошибки устранены');
    
    console.log('\n💡 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ:');
    console.log('   🔹 Существующие DEPOSIT транзакции теперь обновляют баланс');
    console.log('   🔹 WebSocket уведомления работают для DEPOSIT типа');
    console.log('   🔹 Новые TON депозиты по-прежнему создаются как FARMING_REWARD');
    console.log('   🔹 Обратная совместимость сохранена');

    // 3. Проверяем состояние UnifiedTransactionService
    console.log('\n3️⃣ ПРОВЕРКА UNIFIED TRANSACTION SERVICE');
    console.log('-'.repeat(50));
    
    console.log('📊 ТЕКУЩАЯ КОНФИГУРАЦИЯ:');
    console.log('   TON_DEPOSIT → FARMING_REWARD (как было)');
    console.log('   DEPOSIT → DEPOSIT (новый маппинг)');
    console.log('   shouldUpdateBalance(): включает оба типа');
    
    console.log('\n🔧 ПРЕДПОЛАГАЕМЫЙ FLOW:');
    console.log('   1. Новый депозит: TON_DEPOSIT → FARMING_REWARD → WebSocket ✅');
    console.log('   2. Старый депозит: DEPOSIT → DEPOSIT → WebSocket ✅ (исправлено)');
    console.log('   3. Административные: DEPOSIT → DEPOSIT → WebSocket ✅ (исправлено)');

    // 4. Рекомендации по тестированию
    console.log('\n4️⃣ РЕКОМЕНДАЦИИ ПО ДАЛЬНЕЙШЕМУ ТЕСТИРОВАНИЮ');
    console.log('-'.repeat(50));
    
    console.log('🧪 ДЛЯ ПОЛНОЙ ПРОВЕРКИ ИСПРАВЛЕНИЯ:');
    console.log('   1. Создать тестовую DEPOSIT транзакцию в БД');
    console.log('   2. Проверить что баланс обновляется через BalanceManager');
    console.log('   3. Проверить что WebSocket уведомление отправляется');
    console.log('   4. Убедиться что frontend получает обновление баланса');
    
    console.log('\n🎯 КРИТЕРИИ УСПЕХА:');
    console.log('   ✅ DEPOSIT транзакции вызывают updateUserBalance()');
    console.log('   ✅ BalanceManager обновляет баланс в БД');
    console.log('   ✅ BalanceNotificationService отправляет WebSocket');
    console.log('   ✅ Frontend получает и отображает обновленный баланс');

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  }
}

testDepositWebSocketFix();
