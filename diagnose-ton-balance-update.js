/**
 * Диагностический скрипт для анализа проблемы обновления TON баланса
 * Проверяет всю цепочку от backend до frontend
 */

import { supabase } from './core/supabase.ts';
import { BalanceManager } from './core/BalanceManager.ts';
import { logger } from './core/logger.ts';

async function diagnoseTonBalanceUpdate() {
  console.log('\n🔍 ДИАГНОСТИКА ОБНОВЛЕНИЯ TON БАЛАНСА');
  console.log('='.repeat(50));
  
  try {
    // 1. Проверяем последние TON депозиты
    console.log('\n1️⃣ Проверка последних TON депозитов...');
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('currency', 'TON')
      .eq('type', 'DEPOSIT')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (txError) {
      console.error('❌ Ошибка получения транзакций:', txError.message);
      return;
    }
    
    console.log(`✅ Найдено ${transactions?.length || 0} TON депозитов:`);
    transactions?.forEach(tx => {
      console.log(`   - User ${tx.user_id}: ${tx.amount} TON (${tx.created_at})`);
      console.log(`     Hash: ${tx.description}`);
      console.log(`     Status: ${tx.status}`);
    });
    
    if (!transactions || transactions.length === 0) {
      console.log('⚠️  Нет TON депозитов для анализа');
      return;
    }
    
    // 2. Проверяем текущие балансы пользователей из последних транзакций
    console.log('\n2️⃣ Проверка текущих балансов пользователей...');
    const uniqueUserIds = [...new Set(transactions.map(tx => tx.user_id))];
    
    for (const userId of uniqueUserIds) {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, balance_ton, balance_uni, username')
        .eq('id', userId)
        .single();
      
      if (userError) {
        console.error(`❌ Ошибка получения пользователя ${userId}:`, userError.message);
        continue;
      }
      
      const userTransactions = transactions.filter(tx => tx.user_id === userId);
      const totalDeposited = userTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
      
      console.log(`👤 User ${userId} (${user.username || 'Unknown'}):`);
      console.log(`   Текущий баланс TON: ${user.balance_ton}`);
      console.log(`   Сумма депозитов: ${totalDeposited.toFixed(6)} TON`);
      console.log(`   Транзакций: ${userTransactions.length}`);
    }
    
    // 3. Тестируем BalanceManager напрямую
    console.log('\n3️⃣ Тестирование BalanceManager...');
    const testUserId = uniqueUserIds[0];
    
    if (testUserId) {
      console.log(`🧪 Тестируем получение баланса для User ${testUserId}...`);
      
      const balanceManager = BalanceManager.getInstance();
      const balanceResult = await balanceManager.getUserBalance(testUserId);
      
      if (balanceResult.success) {
        console.log('✅ BalanceManager работает корректно:');
        console.log(`   UNI: ${balanceResult.balance?.balance_uni}`);
        console.log(`   TON: ${balanceResult.balance?.balance_ton}`);
        console.log(`   Последнее обновление: ${balanceResult.balance?.last_updated}`);
      } else {
        console.error('❌ BalanceManager ошибка:', balanceResult.error);
      }
    }
    
    // 4. Проверяем WebSocket подключения
    console.log('\n4️⃣ Проверка WebSocket подключений...');
    const { BalanceNotificationService } = await import('./core/balanceNotificationService.ts');
    const notificationService = BalanceNotificationService.getInstance();
    
    // Проверяем количество активных подключений (через рефлексию)
    const connections = notificationService.websocketConnections || new Map();
    console.log(`📡 Активных WebSocket подключений: ${connections.size}`);
    
    if (connections.size > 0) {
      connections.forEach((wsArray, userId) => {
        console.log(`   User ${userId}: ${wsArray.length} подключений`);
      });
    } else {
      console.log('⚠️  Нет активных WebSocket подключений');
    }
    
    // 5. Симуляция небольшого TON депозита для тестирования
    console.log('\n5️⃣ Симуляция тестового обновления баланса...');
    if (testUserId) {
      console.log(`🧪 Тестируем добавление 0.001 TON к User ${testUserId}...`);
      
      const beforeBalance = await balanceManager.getUserBalance(testUserId);
      console.log(`Баланс до: ${beforeBalance.balance?.balance_ton} TON`);
      
      // Симулируем добавление 0.001 TON
      const updateResult = await balanceManager.updateUserBalance({
        user_id: testUserId,
        amount_ton: 0.001,
        operation: 'add',
        source: 'diagnostic_test'
      });
      
      if (updateResult.success) {
        console.log('✅ Тестовое обновление успешно:');
        console.log(`   Новый баланс TON: ${updateResult.newBalance?.balance_ton}`);
        
        // Откатываем изменение
        await balanceManager.updateUserBalance({
          user_id: testUserId,
          amount_ton: 0.001,
          operation: 'subtract',
          source: 'diagnostic_rollback'
        });
        console.log('🔄 Изменение откачено');
      } else {
        console.error('❌ Тестовое обновление неуспешно:', updateResult.error);
      }
    }
    
    // 6. Проверяем состояние кэша баланса
    console.log('\n6️⃣ Проверка состояния кэша баланса...');
    const { balanceCache } = await import('./core/BalanceCache.ts');
    
    if (balanceCache && balanceCache.getAll) {
      const cacheState = balanceCache.getAll();
      console.log(`💾 Записей в кэше: ${Object.keys(cacheState).length}`);
      
      Object.entries(cacheState).forEach(([userId, data]) => {
        console.log(`   User ${userId}: UNI=${data.uniBalance}, TON=${data.tonBalance}`);
      });
    } else {
      console.log('⚠️  Кэш баланса недоступен или пуст');
    }
    
    console.log('\n✅ ДИАГНОСТИКА ЗАВЕРШЕНА');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА ДИАГНОСТИКИ:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Запускаем диагностику
diagnoseTonBalanceUpdate().then(() => {
  console.log('\n🏁 Диагностический скрипт завершен');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 Неожиданная ошибка:', error);
  process.exit(1);
});