/**
 * ДИАГНОСТИЧЕСКАЯ УТИЛИТА ДЛЯ ПРОБЛЕМЫ TON ДЕПОЗИТОВ
 * Согласно ТЗ: найти точку разрыва между успешной транзакцией и необновленным балансом
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Загружаем переменные окружения
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Отсутствуют переменные окружения SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔍 ДИАГНОСТИКА TON ДЕПОЗИТОВ - ТЗ от пользователя');
console.log('='.repeat(50));

async function diagnoseTestTransaction() {
  console.log('\n1️⃣ АНАЛИЗ ТЕСТОВОЙ ТРАНЗАКЦИИ 00a1ba3c2614f4d65cc346805feea960');
  
  try {
    // Ищем транзакцию в разных форматах
    console.log('   🔎 Поиск в таблице user_transactions...');
    const { data: transactions, error: txError } = await supabase
      .from('user_transactions')
      .select('*')
      .or(`description.ilike.%00a1ba3c2614f4d65cc346805feea960%,metadata->>tx_hash.eq.00a1ba3c2614f4d65cc346805feea960`);
    
    if (txError) {
      console.log('   ❌ Ошибка поиска в user_transactions:', txError.message);
      return;
    }
    
    console.log(`   📊 Найдено транзакций: ${transactions?.length || 0}`);
    
    if (transactions && transactions.length > 0) {
      transactions.forEach((tx, i) => {
        console.log(`   📄 Транзакция ${i + 1}:`);
        console.log(`       ID: ${tx.id}`);
        console.log(`       User ID: ${tx.user_id}`);
        console.log(`       Тип: ${tx.type}`);
        console.log(`       Сумма: ${tx.amount} ${tx.currency}`);
        console.log(`       Описание: ${tx.description}`);
        console.log(`       Статус: ${tx.status}`);
        console.log(`       Создано: ${tx.created_at}`);
        console.log(`       Метаданные:`, JSON.stringify(tx.metadata, null, 2));
      });
      
      // Проверяем баланс пользователя из первой найденной транзакции
      const userId = transactions[0].user_id;
      await checkUserBalance(userId, 'для проверки TON баланса после депозита');
    } else {
      console.log('   ⚠️ Транзакция с указанным хэшем НЕ НАЙДЕНА в БД');
      console.log('   ❓ Это означает, что processTonDeposit() НЕ сработал или сработал частично');
    }
  } catch (error) {
    console.error('   ❌ Критическая ошибка при поиске транзакции:', error.message);
  }
}

async function checkUserBalance(userId, context = '') {
  console.log(`\n2️⃣ ПРОВЕРКА БАЛАНСА ПОЛЬЗОВАТЕЛЯ ${userId} ${context}`);
  
  try {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, balance_ton, balance_uni, created_at, last_active')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.log(`   ❌ Ошибка получения пользователя: ${userError.message}`);
      return;
    }
    
    if (!user) {
      console.log(`   ❌ Пользователь с ID ${userId} не найден`);
      return;
    }
    
    console.log(`   👤 Пользователь ${userId}:`);
    console.log(`       TON баланс: ${user.balance_ton || 0}`);
    console.log(`       UNI баланс: ${user.balance_uni || 0}`);
    console.log(`       Создан: ${user.created_at}`);
    console.log(`       Последняя активность: ${user.last_active || 'неизвестно'}`);
    
    return user;
  } catch (error) {
    console.error(`   ❌ Критическая ошибка при проверке баланса пользователя ${userId}:`, error.message);
  }
}

async function checkBalanceManager() {
  console.log('\n3️⃣ ПРОВЕРКА ИНТЕГРАЦИИ С BALANCEMANAGER');
  
  try {
    // Импортируем BalanceManager
    const { BalanceManager } = require('./core/BalanceManager');
    const balanceManager = BalanceManager.getInstance();
    
    console.log('   ✅ BalanceManager успешно импортирован');
    
    // Проверяем доступность метода addBalance
    if (typeof balanceManager.addBalance === 'function') {
      console.log('   ✅ Метод addBalance() доступен');
    } else {
      console.log('   ❌ Метод addBalance() НЕ ДОСТУПЕН');
    }
    
    // Проверяем доступность метода updateUserBalance
    if (typeof balanceManager.updateUserBalance === 'function') {
      console.log('   ✅ Метод updateUserBalance() доступен');
    } else {
      console.log('   ❌ Метод updateUserBalance() НЕ ДОСТУПЕН');
    }
  } catch (error) {
    console.error('   ❌ Критическая ошибка при импорте BalanceManager:', error.message);
    console.log('   ❓ Возможная причина: BalanceManager не используется в processTonDeposit()');
  }
}

async function checkWalletService() {
  console.log('\n4️⃣ АНАЛИЗ WALLET SERVICE - МЕТОД processTonDeposit()');
  
  try {
    // Импортируем wallet service
    const walletService = require('./modules/wallet/service');
    
    console.log('   ✅ WalletService успешно импортирован');
    
    if (typeof walletService.processTonDeposit === 'function') {
      console.log('   ✅ Метод processTonDeposit() доступен');
    } else if (typeof walletService.default?.processTonDeposit === 'function') {
      console.log('   ✅ Метод processTonDeposit() доступен (default export)');
    } else {
      console.log('   ❌ Метод processTonDeposit() НЕ НАЙДЕН');
    }
  } catch (error) {
    console.error('   ❌ Критическая ошибка при импорте WalletService:', error.message);
  }
}

async function checkWebSocketIntegration() {
  console.log('\n5️⃣ ПРОВЕРКА WEBSOCKET УВЕДОМЛЕНИЙ');
  
  try {
    // Проверяем балансный нотификационный сервис
    const { BalanceNotificationService } = require('./core/balanceNotificationService');
    
    console.log('   ✅ BalanceNotificationService импортирован');
    
    if (typeof BalanceNotificationService.notifyBalanceUpdate === 'function') {
      console.log('   ✅ Метод notifyBalanceUpdate() доступен');
    } else {
      console.log('   ❌ Метод notifyBalanceUpdate() НЕ ДОСТУПЕН');
    }
    
    // Проверяем WebSocket сервер
    const wsModule = require('./core/websocketServer');
    console.log('   ✅ WebSocket модуль доступен');
    
  } catch (error) {
    console.error('   ❌ Ошибка проверки WebSocket интеграции:', error.message);
  }
}

async function checkRecentTonDeposits() {
  console.log('\n6️⃣ АНАЛИЗ ПОСЛЕДНИХ TON ДЕПОЗИТОВ В СИСТЕМЕ');
  
  try {
    const { data: recentDeposits, error } = await supabase
      .from('user_transactions')
      .select('*')
      .or('type.eq.DEPOSIT,type.eq.TON_DEPOSIT')
      .eq('currency', 'TON')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.log('   ❌ Ошибка получения последних депозитов:', error.message);
      return;
    }
    
    console.log(`   📊 Последние TON депозиты (${recentDeposits?.length || 0}):`);
    
    if (recentDeposits && recentDeposits.length > 0) {
      recentDeposits.forEach((deposit, i) => {
        console.log(`   ${i + 1}. ID: ${deposit.id}, User: ${deposit.user_id}, Сумма: ${deposit.amount}, Дата: ${deposit.created_at}`);
      });
    } else {
      console.log('   ⚠️ TON ДЕПОЗИТЫ НЕ НАЙДЕНЫ ЗА ВСЮ ИСТОРИЮ!');
      console.log('   ❓ Это подтверждает, что processTonDeposit() НЕ РАБОТАЕТ');
    }
  } catch (error) {
    console.error('   ❌ Критическая ошибка при анализе депозитов:', error.message);
  }
}

async function runFullDiagnosis() {
  console.log('🚀 ЗАПУСК ПОЛНОЙ ДИАГНОСТИКИ...\n');
  
  await diagnoseTestTransaction();
  await checkUserBalance(25, '(тестовый пользователь из ТЗ)');
  await checkBalanceManager();
  await checkWalletService();
  await checkWebSocketIntegration();
  await checkRecentTonDeposits();
  
  console.log('\n' + '='.repeat(50));
  console.log('🎯 ЗАКЛЮЧЕНИЕ ПО ДИАГНОСТИКЕ:');
  console.log('   ❓ Если TON депозиты не найдены в БД - проблема в processTonDeposit()');
  console.log('   ❓ Если депозиты есть, но баланс не обновлен - проблема в BalanceManager или WebSocket');
  console.log('   ❓ Если BalanceManager не импортируется - он не используется в wallet service');
  console.log('='.repeat(50));
}

// Запускаем диагностику
runFullDiagnosis().catch(console.error);