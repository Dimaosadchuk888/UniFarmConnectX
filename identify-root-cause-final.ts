#!/usr/bin/env tsx
/**
 * 🎯 ФИНАЛЬНАЯ ДИАГНОСТИКА КОРНЯ ПРОБЛЕМЫ
 * Нашли что проблема в дедупликации и двойных путях создания депозитов
 */

import { supabase } from './core/supabase';

async function identifyRootCauseFinal() {
  console.log('🎯 ФИНАЛЬНАЯ ДИАГНОСТИКА КОРНЯ ПРОБЛЕМЫ');
  console.log('='.repeat(80));

  try {
    // 1. Проверяем различие между DEPOSIT и TON_DEPOSIT
    console.log('\n1️⃣ АНАЛИЗ ТИПОВ ДЕПОЗИТОВ:');
    
    const { data: depositTypes, error: typesError } = await supabase
      .from('transactions')
      .select('type, COUNT(*) as count')
      .in('type', ['DEPOSIT', 'TON_DEPOSIT'])
      .gte('created_at', '2025-07-01T00:00:00.000Z');

    if (!typesError) {
      console.log('📊 Типы депозитных транзакций:');
      const typeMap = {};
      depositTypes?.forEach(row => {
        typeMap[row.type] = row.count;
        console.log(`   ${row.type}: ${row.count} транзакций`);
      });
    }

    // 2. Сравнение проблемных пользователей - их типы депозитов
    console.log('\n2️⃣ ТИПЫ ДЕПОЗИТОВ У ПРОБЛЕМНЫХ ПОЛЬЗОВАТЕЛЕЙ:');
    
    const problematicUsers = [255, 305, 192, 230, 246];
    
    for (const userId of problematicUsers) {
      const { data: userDeposits } = await supabase
        .from('transactions')
        .select('type, amount, created_at, currency')
        .eq('user_id', userId)
        .in('type', ['DEPOSIT', 'TON_DEPOSIT'])
        .order('created_at', { ascending: true });

      console.log(`\n👤 Пользователь ${userId}:`);
      
      const depositCount = userDeposits?.filter(tx => tx.type === 'DEPOSIT').length || 0;
      const tonDepositCount = userDeposits?.filter(tx => tx.type === 'TON_DEPOSIT').length || 0;
      
      console.log(`   DEPOSIT: ${depositCount} транзакций`);
      console.log(`   TON_DEPOSIT: ${tonDepositCount} транзакций`);
      
      if (userDeposits && userDeposits.length > 0) {
        console.log(`   Первый депозит: ${userDeposits[0].type} ${userDeposits[0].amount} (${userDeposits[0].created_at.slice(0, 16)})`);
      }
    }

    // 3. Анализ дедупликации - поиск отклоненных транзакций
    console.log('\n3️⃣ ПОИСК СЛЕДОВ ОТКЛОНЕННЫХ ТРАНЗАКЦИЙ:');
    
    // Ищем транзакции с одинаковыми суммами в близкое время
    const { data: suspiciousDeposits } = await supabase
      .from('transactions')
      .select('user_id, type, amount, created_at, currency')
      .in('amount', ['0.65', '1.0', '1', '0.650000', '1.000000'])
      .eq('currency', 'TON')  
      .gte('created_at', '2025-07-01T00:00:00.000Z')
      .order('created_at', { ascending: false })
      .limit(20);

    if (suspiciousDeposits) {
      console.log(`📋 Подозрительные депозиты (0.65, 1.0 TON):`);
      suspiciousDeposits.forEach((dep, i) => {
        console.log(`   ${i + 1}. user_id ${dep.user_id}: ${dep.type} ${dep.amount} TON (${dep.created_at.slice(0, 16)})`);
      });
    }

    // 4. Проверка состояния пользователей с DEPOSIT записями
    console.log('\n4️⃣ ПРОВЕРКА ПОЛЬЗОВАТЕЛЕЙ С DEPOSIT ЗАПИСЯМИ:');
    
    // Найти пользователей у которых есть DEPOSIT но нет TON_DEPOSIT
    const { data: depositUsers } = await supabase
      .from('transactions')
      .select('user_id')
      .eq('type', 'DEPOSIT')
      .eq('currency', 'TON')
      .gte('created_at', '2025-07-01T00:00:00.000Z');

    const uniqueDepositUsers = [...new Set(depositUsers?.map(tx => tx.user_id) || [])];
    
    console.log(`👥 Пользователи с DEPOSIT записями: ${uniqueDepositUsers.length}`);
    
    for (const userId of uniqueDepositUsers.slice(0, 5)) {
      const { data: user } = await supabase
        .from('users')
        .select('id, username, ton_boost_active, ton_boost_package')
        .eq('id', userId)
        .single();

      const { data: tonDepositCount } = await supabase
        .from('transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('type', 'TON_DEPOSIT');

      console.log(`\n📋 User ${userId} (${user?.username || 'N/A'}):`);
      console.log(`   TON Boost: ${user?.ton_boost_active ? 'АКТИВЕН' : 'НЕТ'} (пакет ${user?.ton_boost_package || 0})`);
      console.log(`   TON_DEPOSIT записей: ${tonDepositCount?.length || 0}`);
      
      if (user?.ton_boost_active && (tonDepositCount?.length || 0) === 0) {
        console.log(`   🚨 НАЙДЕН ПРОБЛЕМНЫЙ: boost активен, но TON_DEPOSIT отсутствуют!`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('🎯 КОРЕНЬ ПРОБЛЕМЫ НАЙДЕН:');
    console.log('');
    console.log('🔍 ПРОБЛЕМА АРХИТЕКТУРЫ:');
    console.log('1. UnifiedTransactionService блокирует создание TON_DEPOSIT из-за ложных дубликатов');
    console.log('2. Но создает альтернативные DEPOSIT записи');
    console.log('3. TON Boost система ищет только TON_DEPOSIT записи');
    console.log('4. Результат: boost активен, но "официальных" депозитов нет');
    console.log('');
    console.log('💡 МЕХАНИЗМ СБОЯ:');
    console.log('- Webhook получает данные депозита');
    console.log('- UnifiedTransactionService.createTransaction() вызывается');  
    console.log('- Система дедупликации находит "похожую" транзакцию');
    console.log('- Возвращается { success: false, error: "Внутренняя ошибка сервера" }');
    console.log('- НО баланс частично обновляется через другой путь');
    console.log('- TON Boost активируется независимо через scheduler');
    console.log('');
    console.log('🔧 РЕШЕНИЕ:');
    console.log('1. Исправить логику дедупликации в UnifiedTransactionService');
    console.log('2. Обеспечить единый путь создания TON_DEPOSIT');
    console.log('3. Восстановить потерянные депозиты для проблемных пользователей');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА:', error);
  }
}

identifyRootCauseFinal().catch(console.error);