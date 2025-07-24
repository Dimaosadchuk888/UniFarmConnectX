#!/usr/bin/env node

/**
 * ПОЛНАЯ ДИАГНОСТИКА TON ДЕПОЗИТОВ В ПРОДАКШН СИСТЕМЕ
 * Анализирует что изменилось между "вчера работало" и "сегодня не работает"
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fullProductionDiagnostic() {
  console.log('🔍 ПОЛНАЯ ДИАГНОСТИКА TON ДЕПОЗИТОВ В ПРОДАКШН СИСТЕМЕ');
  console.log('='.repeat(80));
  console.log(`📅 Дата диагностики: ${new Date().toLocaleString('ru-RU')}`);
  console.log('='.repeat(80));

  // 1. АНАЛИЗ TON ДЕПОЗИТОВ ЗА ПОСЛЕДНИЕ 3 ДНЯ
  console.log('\n📊 1. АНАЛИЗ TON ДЕПОЗИТОВ ЗА ПОСЛЕДНИЕ 3 ДНЯ');
  console.log('-'.repeat(60));
  
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  
  // Ищем все возможные типы TON депозитов
  const { data: tonTransactions, error: tonError } = await supabase
    .from('transactions')
    .select('*')
    .or(`currency.eq.TON,type.ilike.%ton%,type.ilike.%deposit%,source.ilike.%ton%,source.ilike.%deposit%`)
    .gte('created_at', threeDaysAgo.toISOString())
    .order('created_at', { ascending: false });

  if (tonError) {
    console.error('❌ Ошибка получения TON транзакций:', tonError.message);
    return;
  }

  console.log(`📈 Найдено потенциальных TON транзакций за 3 дня: ${tonTransactions.length}`);
  
  // Группируем по дням
  const transactionsByDay = {};
  tonTransactions.forEach(tx => {
    const day = tx.created_at.split('T')[0];
    if (!transactionsByDay[day]) {
      transactionsByDay[day] = [];
    }
    transactionsByDay[day].push(tx);
  });

  Object.keys(transactionsByDay).sort().reverse().forEach(day => {
    const dayTransactions = transactionsByDay[day];
    console.log(`\n📅 ${day}: ${dayTransactions.length} транзакций`);
    
    // Анализируем типы транзакций
    const typeStats = {};
    dayTransactions.forEach(tx => {
      const key = `${tx.type}-${tx.currency}`;
      typeStats[key] = (typeStats[key] || 0) + 1;
    });
    
    Object.entries(typeStats).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count}`);
    });
    
    // Показываем первые 3 транзакции дня
    if (dayTransactions.length > 0) {
      console.log('   Примеры:');
      dayTransactions.slice(0, 3).forEach(tx => {
        console.log(`   • ID:${tx.id} Type:${tx.type} Currency:${tx.currency} Amount:${tx.amount_ton || tx.amount_uni} User:${tx.user_id}`);
      });
    }
  });

  // 2. ПОИСК РЕАЛЬНЫХ TON ДЕПОЗИТОВ (НЕ REFERRAL)
  console.log('\n💰 2. ПОИСК РЕАЛЬНЫХ TON ДЕПОЗИТОВ (ИСКЛЮЧАЯ REFERRAL)');
  console.log('-'.repeat(60));
  
  const realTonDeposits = tonTransactions.filter(tx => 
    !tx.type.includes('REFERRAL') && 
    (tx.currency === 'TON' || (tx.amount_ton && parseFloat(tx.amount_ton) > 0))
  );
  
  console.log(`🎯 Реальных TON депозитов (не referral): ${realTonDeposits.length}`);
  
  if (realTonDeposits.length > 0) {
    console.log('\n📋 ДЕТАЛИ РЕАЛЬНЫХ TON ДЕПОЗИТОВ:');
    realTonDeposits.forEach(tx => {
      console.log(`• ID: ${tx.id}`);
      console.log(`  Дата: ${tx.created_at}`);
      console.log(`  Пользователь: ${tx.user_id}`);
      console.log(`  Тип: ${tx.type}`);
      console.log(`  Валюта: ${tx.currency}`);
      console.log(`  Сумма: ${tx.amount_ton} TON`);
      console.log(`  Статус: ${tx.status}`);
      console.log(`  Источник: ${tx.source || 'N/A'}`);
      console.log(`  Описание: ${tx.description || 'N/A'}`);
      console.log('  ---');
    });
  } else {
    console.log('❌ КРИТИЧНО: Реальных TON депозитов НЕ НАЙДЕНО за последние 3 дня!');
  }

  // 3. АНАЛИЗ ПОЛЬЗОВАТЕЛЕЙ С TON БАЛАНСОМ НО БЕЗ ДЕПОЗИТОВ
  console.log('\n🔍 3. ПОЛЬЗОВАТЕЛИ С TON БАЛАНСОМ НО БЕЗ ДЕПОЗИТОВ');
  console.log('-'.repeat(60));
  
  // Находим пользователей с TON балансом > 0
  const { data: usersWithTonBalance, error: usersError } = await supabase
    .from('users')
    .select('id, username, balance_ton')
    .gt('balance_ton', 0)
    .order('balance_ton', { ascending: false })
    .limit(20);

  if (usersError) {
    console.error('❌ Ошибка получения пользователей:', usersError.message);
    return;
  }

  console.log(`👥 Пользователей с TON балансом > 0: ${usersWithTonBalance.length}`);
  
  // Проверяем есть ли у них TON депозиты в транзакциях
  for (const user of usersWithTonBalance.slice(0, 10)) {
    const userTonTransactions = tonTransactions.filter(tx => 
      tx.user_id === user.id && !tx.type.includes('REFERRAL')
    );
    
    const status = userTonTransactions.length > 0 ? '✅' : '❌';
    console.log(`${status} User #${user.id} (@${user.username || 'N/A'}): ${user.balance_ton} TON, депозитов: ${userTonTransactions.length}`);
    
    if (userTonTransactions.length === 0 && parseFloat(user.balance_ton) > 0.01) {
      console.log(`   🚨 АНОМАЛИЯ: Баланс ${user.balance_ton} TON без записей депозитов!`);
    }
  }

  // 4. ПРОВЕРКА ПОСЛЕДНИХ ИЗМЕНЕНИЙ В КОДЕ (по датам файлов)
  console.log('\n🔧 4. АНАЛИЗ ИЗМЕНЕНИЙ В СИСТЕМЕ');
  console.log('-'.repeat(60));
  
  // Проверяем ключевые файлы системы депозитов
  const keyFiles = [
    'modules/wallet/service.ts',
    'core/BalanceManager.ts', 
    'core/UnifiedTransactionService.ts',
    'core/TransactionService.ts'
  ];

  for (const file of keyFiles) {
    try {
      const fs = await import('fs');
      const stats = fs.statSync(file);
      const modTime = stats.mtime.toLocaleString('ru-RU');
      console.log(`📄 ${file}: изменен ${modTime}`);
    } catch (error) {
      console.log(`❌ ${file}: файл не найден или недоступен`);
    }
  }

  // 5. ПРОВЕРКА РАБОТЫ processTonDeposit ФУНКЦИИ
  console.log('\n⚙️ 5. АНАЛИЗ ФУНКЦИИ processTonDeposit');
  console.log('-'.repeat(60));
  
  try {
    const fs = await import('fs');
    const walletServiceCode = fs.readFileSync('modules/wallet/service.ts', 'utf8');
    
    // Ищем функцию processTonDeposit
    const processTonDepositMatch = walletServiceCode.match(/processTonDeposit[\s\S]*?(?=export|async function|\n\n)/);
    
    if (processTonDepositMatch) {
      console.log('✅ Функция processTonDeposit найдена');
      
      // Проверяем вызывает ли она createTransaction
      const hasCreateTransaction = processTonDepositMatch[0].includes('createTransaction');
      const hasUnifiedTransaction = processTonDepositMatch[0].includes('UnifiedTransactionService');
      
      console.log(`📝 Вызывает createTransaction: ${hasCreateTransaction ? '✅' : '❌'}`);
      console.log(`📝 Использует UnifiedTransactionService: ${hasUnifiedTransaction ? '✅' : '❌'}`);
      
      if (!hasCreateTransaction && !hasUnifiedTransaction) {
        console.log('🚨 КРИТИЧНО: processTonDeposit НЕ создает записи транзакций!');
      }
    } else {
      console.log('❌ Функция processTonDeposit не найдена в коде');
    }
  } catch (error) {
    console.log('❌ Ошибка анализа кода:', error.message);
  }

  // 6. ИТОГОВОЕ ЗАКЛЮЧЕНИЕ
  console.log('\n🏁 ИТОГОВОЕ ЗАКЛЮЧЕНИЕ');
  console.log('='.repeat(60));
  
  const hasRealDeposits = realTonDeposits.length > 0;
  const hasUsersWithBalance = usersWithTonBalance.length > 0;
  const anomalyUsers = usersWithTonBalance.filter(u => parseFloat(u.balance_ton) > 0.01).length;
  
  console.log(`📊 Статистика диагностики:`);
  console.log(`   • Реальных TON депозитов за 3 дня: ${realTonDeposits.length}`);
  console.log(`   • Пользователей с TON балансом: ${usersWithTonBalance.length}`);
  console.log(`   • Пользователей с балансом без депозитов: ${anomalyUsers}`);
  
  if (!hasRealDeposits && hasUsersWithBalance) {
    console.log('\n🚨 КРИТИЧНЫЙ ВЫВОД:');
    console.log('   СИСТЕМА НЕ СОЗДАЕТ ЗАПИСИ TON ДЕПОЗИТОВ В БАЗЕ ДАННЫХ!');
    console.log('   Балансы пользователей обновляются, но транзакции не сохраняются.');
    console.log('   Требуется срочное исправление функции processTonDeposit.');
  } else if (hasRealDeposits) {
    console.log('\n✅ СИСТЕМА РАБОТАЕТ:');
    console.log('   TON депозиты корректно сохраняются в базу данных.');
    console.log('   Проблема может быть в конкретных случаях или пользователях.');
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📋 РЕКОМЕНДАЦИИ ДЛЯ ПРОДАКШН:');
  console.log('1. Проверить логи сервера за последние 24 часа');
  console.log('2. Добавить мониторинг создания TON транзакций');
  console.log('3. Исправить processTonDeposit если не создает записи');
  console.log('4. Провести тестирование на staging перед внесением изменений');
  console.log('='.repeat(80));
}

// Запуск диагностики
fullProductionDiagnostic().catch(console.error);