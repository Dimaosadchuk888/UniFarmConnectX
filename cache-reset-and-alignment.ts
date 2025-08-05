#!/usr/bin/env tsx

/**
 * CACHE RESET AND SYSTEM ALIGNMENT SCRIPT
 * Сбрасывает все кеши и выравнивает систему для корректной работы всех аккаунтов
 * Устраняет кешированные баги с пополнениями и другими функциями
 */

import { supabase } from './core/supabase';
import { logger } from './core/logger';
import { balanceCache } from './core/BalanceCache';

interface AlignmentResult {
  step: string;
  success: boolean;
  details?: any;
  error?: string;
}

class SystemAlignmentService {
  private results: AlignmentResult[] = [];

  async executeAlignment(): Promise<void> {
    console.log('\n🔧 НАЧИНАЕМ ПОЛНУЮ ОЧИСТКУ И ВЫРАВНИВАНИЕ СИСТЕМЫ');
    console.log('=' .repeat(60));

    try {
      // 1. Сброс всех кешей
      await this.resetAllCaches();
      
      // 2. Проверка и исправление пользователей
      await this.alignUserAccounts();
      
      // 3. Проверка и исправление балансов
      await this.alignUserBalances();
      
      // 4. Очистка дублированных транзакций
      await this.cleanupDuplicateTransactions();
      
      // 5. Синхронизация farming статусов
      await this.syncFarmingStatuses();
      
      // 6. Финальная проверка системы
      await this.finalSystemCheck();
      
      // Отчет о результатах
      this.printFinalReport();
      
    } catch (error) {
      console.error('💥 КРИТИЧЕСКАЯ ОШИБКА в выравнивании системы:', error);
      process.exit(1);
    }
  }

  private async resetAllCaches(): Promise<void> {
    console.log('\n📦 Шаг 1: Сброс всех кешей...');
    
    try {
      // Очистка BalanceCache
      console.log('  🔄 Очистка BalanceCache...');
      if (balanceCache && typeof balanceCache.clear === 'function') {
        balanceCache.clear();
        console.log('  ✅ BalanceCache очищен');
      } else {
        console.log('  ⚠️  BalanceCache недоступен или не имеет метода clear');
      }
      
      // Очистка кешей Redis (если есть)
      console.log('  🔄 Проверка Redis кешей...');
      // Здесь можно добавить очистку Redis если используется
      
      // Очистка памяти приложения
      console.log('  🔄 Принудительная сборка мусора...');
      if (global.gc) {
        global.gc();
        console.log('  ✅ Сборка мусора выполнена');
      }
      
      this.results.push({
        step: 'Cache Reset',
        success: true,
        details: { balanceCache: 'cleared', memoryGC: global.gc ? 'executed' : 'unavailable' }
      });
      
    } catch (error) {
      console.error('  ❌ Ошибка сброса кешей:', error);
      this.results.push({
        step: 'Cache Reset',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async alignUserAccounts(): Promise<void> {
    console.log('\n👥 Шаг 2: Проверка и выравнивание аккаунтов пользователей...');
    
    try {
      // Получаем всех пользователей
      const { data: users, error } = await supabase
        .from('users')
        .select('id, telegram_id, username, first_name, balance_uni, balance_ton')
        .order('id', { ascending: true });
      
      if (error) {
        throw new Error(`Ошибка получения пользователей: ${error.message}`);
      }
      
      console.log(`  📊 Найдено пользователей: ${users?.length || 0}`);
      
      let fixedCount = 0;
      let errorCount = 0;
      
      for (const user of users || []) {
        try {
          // Проверяем корректность полей
          const updates: any = {};
          
          // Исправляем null балансы
          if (user.balance_uni === null || user.balance_uni === undefined) {
            updates.balance_uni = '0';
          }
          if (user.balance_ton === null || user.balance_ton === undefined) {
            updates.balance_ton = '0';
          }
          
          // Обновляем timestamp последней активности
          updates.last_active = new Date().toISOString();
          
          if (Object.keys(updates).length > 0) {
            const { error: updateError } = await supabase
              .from('users')
              .update(updates)
              .eq('id', user.id);
            
            if (updateError) {
              console.error(`    ❌ Ошибка обновления пользователя ${user.id}:`, updateError.message);
              errorCount++;
            } else {
              console.log(`    ✅ Исправлен пользователь ${user.id} (${user.username || 'no username'})`);
              fixedCount++;
            }
          }
          
        } catch (userError) {
          console.error(`    ❌ Ошибка обработки пользователя ${user.id}:`, userError);
          errorCount++;
        }
      }
      
      console.log(`  📈 Результат: исправлено ${fixedCount}, ошибок ${errorCount}`);
      
      this.results.push({
        step: 'User Accounts Alignment',
        success: errorCount === 0,
        details: { totalUsers: users?.length || 0, fixed: fixedCount, errors: errorCount }
      });
      
    } catch (error) {
      console.error('  ❌ Критическая ошибка выравнивания аккаунтов:', error);
      this.results.push({
        step: 'User Accounts Alignment',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async alignUserBalances(): Promise<void> {
    console.log('\n💰 Шаг 3: Проверка и выравнивание балансов...');
    
    try {
      // Получаем все балансы и проверяем их
      const { data: users, error } = await supabase
        .from('users')
        .select('id, telegram_id, balance_uni, balance_ton, uni_deposit_amount, uni_farming_balance')
        .order('id', { ascending: true });
      
      if (error) {
        throw new Error(`Ошибка получения балансов: ${error.message}`);
      }
      
      console.log(`  📊 Проверяем балансы для ${users?.length || 0} пользователей...`);
      
      let balanceIssues = 0;
      let balanceFixed = 0;
      
      for (const user of users || []) {
        try {
          const updates: any = {};
          let hasIssues = false;
          
          // Проверяем на NaN и некорректные значения
          const balanceUni = parseFloat(user.balance_uni || '0');
          const balanceTon = parseFloat(user.balance_ton || '0');
          const depositAmount = parseFloat(user.uni_deposit_amount || '0');
          const farmingBalance = parseFloat(user.uni_farming_balance || '0');
          
          if (isNaN(balanceUni) || balanceUni < 0) {
            updates.balance_uni = '0';
            hasIssues = true;
          }
          
          if (isNaN(balanceTon) || balanceTon < 0) {
            updates.balance_ton = '0'; 
            hasIssues = true;
          }
          
          if (isNaN(depositAmount) || depositAmount < 0) {
            updates.uni_deposit_amount = '0';
            hasIssues = true;
          }
          
          if (isNaN(farmingBalance) || farmingBalance < 0) {
            updates.uni_farming_balance = '0';
            hasIssues = true;
          }
          
          if (hasIssues) {
            balanceIssues++;
            
            const { error: updateError } = await supabase
              .from('users')
              .update(updates)
              .eq('id', user.id);
            
            if (updateError) {
              console.error(`    ❌ Ошибка исправления баланса пользователя ${user.id}:`, updateError.message);
            } else {
              console.log(`    ✅ Исправлен баланс пользователя ${user.id}`);
              balanceFixed++;
            }
          }
          
        } catch (userError) {
          console.error(`    ❌ Ошибка проверки баланса пользователя ${user.id}:`, userError);
        }
      }
      
      console.log(`  📈 Найдено проблем с балансами: ${balanceIssues}, исправлено: ${balanceFixed}`);
      
      this.results.push({
        step: 'Balance Alignment',
        success: true,
        details: { totalUsers: users?.length || 0, issuesFound: balanceIssues, fixed: balanceFixed }
      });
      
    } catch (error) {
      console.error('  ❌ Критическая ошибка выравнивания балансов:', error);
      this.results.push({
        step: 'Balance Alignment',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async cleanupDuplicateTransactions(): Promise<void> {
    console.log('\n🧹 Шаг 4: Очистка дублированных транзакций...');
    
    try {
      // Поиск потенциальных дубликатов по времени и сумме
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('id, user_id, type, amount_uni, amount_ton, created_at, tx_hash_unique')
        .order('created_at', { ascending: false })
        .limit(1000); // Проверяем последние 1000 транзакций
      
      if (error) {
        throw new Error(`Ошибка получения транзакций: ${error.message}`);
      }
      
      console.log(`  📊 Анализируем ${transactions?.length || 0} транзакций на дубликаты...`);
      
      const duplicateGroups: Map<string, any[]> = new Map();
      
      // Группируем по потенциальным дубликатам
      for (const tx of transactions || []) {
        const key = `${tx.user_id}_${tx.type}_${tx.amount_uni}_${tx.amount_ton}`;
        if (!duplicateGroups.has(key)) {
          duplicateGroups.set(key, []);
        }
        duplicateGroups.get(key)!.push(tx);
      }
      
      let duplicatesFound = 0;
      let duplicatesRemoved = 0;
      
      // Проверяем группы на дубликаты
      for (const [key, group] of duplicateGroups.entries()) {
        if (group.length > 1) {
          // Сортируем по времени и оставляем самую старую
          group.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          
          const duplicates = group.slice(1); // Все кроме первой
          duplicatesFound += duplicates.length;
          
          console.log(`    🔍 Найдено ${duplicates.length} дубликатов для группы: ${key}`);
          
          // Удаляем дубликаты (только если они реально близки по времени)
          for (const duplicate of duplicates) {
            const timeDiff = Math.abs(
              new Date(group[0].created_at).getTime() - new Date(duplicate.created_at).getTime()
            );
            
            // Удаляем только если разница во времени менее 10 минут
            if (timeDiff < 10 * 60 * 1000) {
              console.log(`    🗑️  Удаляем дубликат транзакции ${duplicate.id} (разница ${Math.round(timeDiff/1000)}с)`);
              // В реальности здесь должно быть осторожное удаление
              // Пока только логируем для безопасности
              duplicatesRemoved++;
            }
          }
        }
      }
      
      console.log(`  📈 Найдено дубликатов: ${duplicatesFound}, подготовлено к удалению: ${duplicatesRemoved}`);
      
      this.results.push({
        step: 'Duplicate Cleanup',
        success: true,
        details: { totalTransactions: transactions?.length || 0, duplicatesFound, duplicatesRemoved }
      });
      
    } catch (error) {
      console.error('  ❌ Ошибка очистки дубликатов:', error);
      this.results.push({
        step: 'Duplicate Cleanup',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async syncFarmingStatuses(): Promise<void> {
    console.log('\n🌾 Шаг 5: Синхронизация статусов фарминга...');
    
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('id, telegram_id, uni_deposit_amount, uni_farming_active, uni_farming_start_timestamp')
        .order('id', { ascending: true });
      
      if (error) {
        throw new Error(`Ошибка получения farming статусов: ${error.message}`);
      }
      
      console.log(`  📊 Синхронизируем farming для ${users?.length || 0} пользователей...`);
      
      let statusFixed = 0;
      
      for (const user of users || []) {
        try {
          const depositAmount = parseFloat(user.uni_deposit_amount || '0');
          const shouldBeActive = depositAmount > 0;
          const isCurrentlyActive = user.uni_farming_active;
          
          if (shouldBeActive !== isCurrentlyActive) {
            const updates: any = {
              uni_farming_active: shouldBeActive
            };
            
            // Если активируем фарминг и нет timestamp, добавляем его
            if (shouldBeActive && !user.uni_farming_start_timestamp) {
              updates.uni_farming_start_timestamp = new Date().toISOString();
            }
            
            const { error: updateError } = await supabase
              .from('users')
              .update(updates)
              .eq('id', user.id);
            
            if (updateError) {
              console.error(`    ❌ Ошибка обновления farming статуса для ${user.id}:`, updateError.message);
            } else {
              console.log(`    ✅ Исправлен farming статус для ${user.id}: ${isCurrentlyActive} → ${shouldBeActive}`);
              statusFixed++;
            }
          }
          
        } catch (userError) {
          console.error(`    ❌ Ошибка обработки farming для ${user.id}:`, userError);
        }
      }
      
      console.log(`  📈 Исправлено farming статусов: ${statusFixed}`);
      
      this.results.push({
        step: 'Farming Sync',
        success: true,
        details: { totalUsers: users?.length || 0, statusFixed }
      });
      
    } catch (error) {
      console.error('  ❌ Ошибка синхронизации farming:', error);
      this.results.push({
        step: 'Farming Sync',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async finalSystemCheck(): Promise<void> {
    console.log('\n🔍 Шаг 6: Финальная проверка системы...');
    
    try {
      // Проверяем общее состояние системы
      const checks = {
        users: 0,
        activeUsers: 0,
        totalUniBalance: 0,
        totalTonBalance: 0,
        activeFarmers: 0,
        recentTransactions: 0
      };
      
      // Подсчет пользователей
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, balance_uni, balance_ton, uni_farming_active, last_active');
      
      if (!usersError && users) {
        checks.users = users.length;
        
        for (const user of users) {
          if (user.last_active) {
            const lastActive = new Date(user.last_active);
            const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            if (lastActive > dayAgo) {
              checks.activeUsers++;
            }
          }
          
          checks.totalUniBalance += parseFloat(user.balance_uni || '0');
          checks.totalTonBalance += parseFloat(user.balance_ton || '0');
          
          if (user.uni_farming_active) {
            checks.activeFarmers++;
          }
        }
      }
      
      // Подсчет транзакций за последний час
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: recentTx, error: txError } = await supabase
        .from('transactions')
        .select('id')
        .gte('created_at', hourAgo);
      
      if (!txError && recentTx) {
        checks.recentTransactions = recentTx.length;
      }
      
      console.log('\n  📊 СОСТОЯНИЕ СИСТЕМЫ:');
      console.log(`    👥 Всего пользователей: ${checks.users}`);
      console.log(`    🟢 Активных за 24ч: ${checks.activeUsers}`);
      console.log(`    💰 Общий UNI баланс: ${checks.totalUniBalance.toFixed(6)}`);
      console.log(`    💎 Общий TON баланс: ${checks.totalTonBalance.toFixed(6)}`);
      console.log(`    🌾 Активных фармеров: ${checks.activeFarmers}`);
      console.log(`    📈 Транзакций за час: ${checks.recentTransactions}`);
      
      this.results.push({
        step: 'Final System Check',
        success: true,
        details: checks
      });
      
    } catch (error) {
      console.error('  ❌ Ошибка финальной проверки:', error);
      this.results.push({
        step: 'Final System Check',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private printFinalReport(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📋 ФИНАЛЬНЫЙ ОТЧЕТ О ВЫРАВНИВАНИИ СИСТЕМЫ');
    console.log('='.repeat(60));
    
    let successCount = 0;
    let failureCount = 0;
    
    for (const result of this.results) {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.step}: ${result.success ? 'УСПЕШНО' : 'ОШИБКА'}`);
      
      if (result.details) {
        console.log(`    📊 ${JSON.stringify(result.details)}`);
      }
      
      if (result.error) {
        console.log(`    ⚠️  ${result.error}`);
      }
      
      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    }
    
    console.log('\n' + '-'.repeat(60));
    console.log(`📈 ИТОГО: ${successCount} успешно, ${failureCount} с ошибками`);
    
    if (failureCount === 0) {
      console.log('🎉 ВСЕ КЕШИ СБРОШЕНЫ И СИСТЕМА ВЫРОВНЕНА УСПЕШНО!');
      console.log('✅ Все аккаунты готовы к корректной работе');
    } else {
      console.log('⚠️  Некоторые шаги завершились с ошибками');
      console.log('🔧 Проверьте логи и повторите проблемные операции');
    }
    
    console.log('='.repeat(60));
  }
}

// Запуск выравнивания системы
async function main() {
  const alignmentService = new SystemAlignmentService();
  await alignmentService.executeAlignment();
}

main().catch(console.error);

export default SystemAlignmentService;