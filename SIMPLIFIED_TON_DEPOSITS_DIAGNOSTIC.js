#!/usr/bin/env node

/**
 * УПРОЩЕННАЯ ДИАГНОСТИКА TON ДЕПОЗИТОВ (без сложных SQL запросов)
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function simpleDiagnostic() {
  console.log('🚨 КРИТИЧНАЯ ДИАГНОСТИКА: TON ДЕПОЗИТЫ В ПРОДАКШН');
  console.log('='.repeat(80));
  console.log(`📅 ${new Date().toLocaleString('ru-RU')}`);
  
  // 1. ПОИСК ВСЕХ TON ТРАНЗАКЦИЙ ЗА ПОСЛЕДНИЕ 2 ДНЯ
  console.log('\n📊 1. ВСЕ TON ТРАНЗАКЦИИ ЗА ПОСЛЕДНИЕ 2 ДНЯ');
  console.log('-'.repeat(60));
  
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  
  const { data: allTransactions, error } = await supabase
    .from('transactions')
    .select('*')
    .gte('created_at', twoDaysAgo.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Ошибка получения транзакций:', error.message);
    return;
  }

  // Фильтруем TON-связанные транзакции
  const tonTransactions = allTransactions.filter(tx => 
    tx.currency === 'TON' || 
    (tx.amount_ton && parseFloat(tx.amount_ton) > 0) ||
    tx.type?.toLowerCase().includes('ton') ||
    tx.description?.toLowerCase().includes('ton')
  );

  console.log(`📈 Всего транзакций за 2 дня: ${allTransactions.length}`);
  console.log(`🪙 TON-связанных транзакций: ${tonTransactions.length}`);

  // Группируем по типам
  const typeGroups = {};
  tonTransactions.forEach(tx => {
    const key = `${tx.type}-${tx.currency}`;
    if (!typeGroups[key]) typeGroups[key] = [];
    typeGroups[key].push(tx);
  });

  console.log('\n📋 СТАТИСТИКА ПО ТИПАМ TON ТРАНЗАКЦИЙ:');
  Object.entries(typeGroups).forEach(([type, transactions]) => {
    console.log(`   ${type}: ${transactions.length} транзакций`);
  });

  // 2. ПОИСК РЕАЛЬНЫХ TON ДЕПОЗИТОВ (НЕ REFERRAL)
  console.log('\n💰 2. РЕАЛЬНЫЕ TON ДЕПОЗИТЫ (ИСКЛЮЧАЯ REFERRAL)');
  console.log('-'.repeat(60));
  
  const realDeposits = tonTransactions.filter(tx => 
    !tx.type?.includes('REFERRAL') && 
    !tx.description?.includes('Referral') &&
    (tx.currency === 'TON' || (tx.amount_ton && parseFloat(tx.amount_ton) > 0.001))
  );
  
  console.log(`🎯 Реальных TON депозитов: ${realDeposits.length}`);
  
  if (realDeposits.length === 0) {
    console.log('🚨 КРИТИЧНО: НЕТ РЕАЛЬНЫХ TON ДЕПОЗИТОВ ЗА 2 ДНЯ!');
  } else {
    console.log('\n📝 ДЕТАЛИ РЕАЛЬНЫХ TON ДЕПОЗИТОВ:');
    realDeposits.slice(0, 10).forEach(tx => {
      console.log(`• ${tx.created_at.split('T')[0]} | User ${tx.user_id} | ${tx.type} | ${tx.amount_ton} TON`);
      console.log(`  Описание: ${tx.description || 'N/A'}`);
    });
  }

  // 3. ПОЛЬЗОВАТЕЛИ С TON БАЛАНСОМ
  console.log('\n👥 3. ПОЛЬЗОВАТЕЛИ С TON БАЛАНСОМ > 0.1');
  console.log('-'.repeat(60));
  
  const { data: usersWithTon, error: usersError } = await supabase
    .from('users')
    .select('id, username, balance_ton')
    .gt('balance_ton', 0.1)
    .order('balance_ton', { ascending: false })
    .limit(15);

  if (usersError) {
    console.error('❌ Ошибка получения пользователей:', usersError.message);
    return;
  }

  console.log(`👤 Найдено пользователей с TON > 0.1: ${usersWithTon.length}`);
  
  // Проверяем есть ли у них депозиты
  let usersWithoutDeposits = 0;
  for (const user of usersWithTon) {
    const userDeposits = realDeposits.filter(tx => tx.user_id === user.id);
    const hasDeposits = userDeposits.length > 0 ? '✅' : '❌';
    
    if (userDeposits.length === 0) {
      usersWithoutDeposits++;
    }
    
    console.log(`${hasDeposits} User #${user.id} (@${user.username || 'N/A'}): ${user.balance_ton} TON, депозитов: ${userDeposits.length}`);
  }

  // 4. АНАЛИЗ ИЗМЕНЕНИЙ В КОДЕ
  console.log('\n🔧 4. АНАЛИЗ КЛЮЧЕВЫХ ФАЙЛОВ СИСТЕМЫ');
  console.log('-'.repeat(60));
  
  const keyFiles = [
    'modules/wallet/service.ts',
    'core/BalanceManager.ts',
    'core/UnifiedTransactionService.ts'
  ];

  for (const file of keyFiles) {
    try {
      const fs = await import('fs');
      const stats = fs.statSync(file);
      const modTime = stats.mtime.toLocaleString('ru-RU');
      const size = (stats.size / 1024).toFixed(1);
      console.log(`📄 ${file}: ${modTime} (${size}KB)`);
    } catch (error) {
      console.log(`❌ ${file}: не найден`);
    }
  }

  // 5. ПРОВЕРКА processTonDeposit ФУНКЦИИ
  console.log('\n⚙️ 5. СОСТОЯНИЕ ФУНКЦИИ processTonDeposit');
  console.log('-'.repeat(60));
  
  try {
    const fs = await import('fs');
    const code = fs.readFileSync('modules/wallet/service.ts', 'utf8');
    
    const hasProcessTonDeposit = code.includes('processTonDeposit');
    const hasUnifiedTransaction = code.includes('UnifiedTransactionService');
    const hasCreateTransaction = code.includes('createTransaction');
    
    console.log(`📝 Функция processTonDeposit: ${hasProcessTonDeposit ? '✅' : '❌'}`);
    console.log(`📝 Использует UnifiedTransactionService: ${hasUnifiedTransaction ? '✅' : '❌'}`);
    console.log(`📝 Вызывает createTransaction: ${hasCreateTransaction ? '✅' : '❌'}`);
    
    // Ищем конкретную строку с типом транзакции
    if (code.includes("type: 'TON_DEPOSIT'")) {
      console.log(`📝 Использует тип TON_DEPOSIT: ✅`);
    } else if (code.includes("type: 'DEPOSIT'")) {
      console.log(`📝 Использует тип DEPOSIT: ✅`);  
    } else {
      console.log(`📝 Неизвестный тип транзакции: ❌`);
    }
  } catch (error) {
    console.log('❌ Ошибка анализа кода:', error.message);
  }

  // 6. ИТОГОВОЕ ЗАКЛЮЧЕНИЕ
  console.log('\n🏁 ИТОГОВОЕ ЗАКЛЮЧЕНИЕ');
  console.log('='.repeat(80));
  
  if (realDeposits.length === 0 && usersWithoutDeposits > 5) {
    console.log('🚨 КРИТИЧНАЯ ПРОБЛЕМА ПОДТВЕРЖДЕНА:');
    console.log('   • НЕТ реальных TON депозитов за 2 дня');
    console.log(`   • ${usersWithoutDeposits} пользователей с балансом без депозитов`);
    console.log('   • Система НЕ создает записи TON депозитов в БД');
    console.log('\n💡 ТРЕБУЕТСЯ:');
    console.log('   1. Проверить логи processTonDeposit за последние дни');
    console.log('   2. Убедиться что функция вызывается при депозитах');
    console.log('   3. Исправить создание записей транзакций');
  } else if (realDeposits.length > 0) {
    console.log('✅ СИСТЕМА РАБОТАЕТ:');
    console.log(`   • Найдено ${realDeposits.length} реальных TON депозитов`);
    console.log('   • Проблема может быть в конкретных случаях');
  }
  
  console.log('\n📋 СТАТУС ДИАГНОСТИКИ: ЗАВЕРШЕНА');
  console.log('='.repeat(80));
}

simpleDiagnostic().catch(console.error);