#!/usr/bin/env tsx
/**
 * Выполнение оптимизации базы данных
 * Синхронизация данных и создание индексов
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

// Утилита для выполнения SQL через RPC
async function executeSql(query: string, description: string) {
  console.log(`\n📌 ${description}...`);
  
  try {
    const { data, error } = await supabase.rpc('execute_sql', { query });
    
    if (error) {
      console.error('❌ Ошибка:', error);
      return null;
    }
    
    return data;
  } catch (err) {
    console.error('❌ Ошибка выполнения:', err);
    return null;
  }
}

// Главная функция
async function runOptimization() {
  console.log('🚀 НАЧИНАЕМ ОПТИМИЗАЦИЮ БАЗЫ ДАННЫХ');
  console.log('=' .repeat(50) + '\n');
  
  // 1. Получаем текущие статистики
  console.log('📊 ШАГ 1: ТЕКУЩАЯ СТАТИСТИКА');
  
  const { data: stats } = await supabase
    .from('users')
    .select('id');
  
  const { data: tonFarmingStats } = await supabase
    .from('ton_farming_data')
    .select('user_id, farming_balance');
  
  console.log(`Всего пользователей: ${stats?.length || 0}`);
  console.log(`Записей в ton_farming_data: ${tonFarmingStats?.length || 0}`);
  
  // 2. Проверяем контрольную сумму
  console.log('\n📊 ШАГ 2: КОНТРОЛЬНАЯ СУММА ДО СИНХРОНИЗАЦИИ');
  
  const { data: checksum } = await supabase
    .from('users')
    .select('balance_uni, balance_ton, uni_farming_balance, ton_farming_balance');
  
  let totalBefore = 0;
  checksum?.forEach(row => {
    totalBefore += (row.balance_uni || 0) + (row.balance_ton || 0) + 
                   (row.uni_farming_balance || 0) + (row.ton_farming_balance || 0);
  });
  
  console.log(`Контрольная сумма ДО: ${totalBefore.toFixed(2)}`);
  
  // 3. Выполняем синхронизацию TON farming
  console.log('\n🔄 ШАГ 3: СИНХРОНИЗАЦИЯ TON FARMING');
  
  // Получаем пользователей для синхронизации
  const { data: usersToSync } = await supabase
    .from('users')
    .select('id, ton_farming_balance');
  
  const tonMap = new Map();
  tonFarmingStats?.forEach(t => {
    tonMap.set(parseInt(t.user_id), t.farming_balance || 0);
  });
  
  let syncCount = 0;
  let syncedAmount = 0;
  
  for (const user of usersToSync || []) {
    const tonBalance = tonMap.get(user.id);
    
    if (tonBalance !== undefined && tonBalance > user.ton_farming_balance) {
      const diff = tonBalance - user.ton_farming_balance;
      
      const { error } = await supabase
        .from('users')
        .update({ ton_farming_balance: tonBalance })
        .eq('id', user.id);
      
      if (!error) {
        syncCount++;
        syncedAmount += diff;
        console.log(`✅ Синхронизирован user ${user.id}: +${diff.toFixed(2)}`);
      } else {
        console.error(`❌ Ошибка синхронизации user ${user.id}:`, error);
      }
    }
  }
  
  console.log(`\nВсего синхронизировано: ${syncCount} записей`);
  console.log(`Общая добавленная сумма: ${syncedAmount.toFixed(2)}`);
  
  // 4. Проверяем контрольную сумму после
  console.log('\n📊 ШАГ 4: КОНТРОЛЬНАЯ СУММА ПОСЛЕ СИНХРОНИЗАЦИИ');
  
  const { data: checksumAfter } = await supabase
    .from('users')
    .select('balance_uni, balance_ton, uni_farming_balance, ton_farming_balance');
  
  let totalAfter = 0;
  checksumAfter?.forEach(row => {
    totalAfter += (row.balance_uni || 0) + (row.balance_ton || 0) + 
                  (row.uni_farming_balance || 0) + (row.ton_farming_balance || 0);
  });
  
  console.log(`Контрольная сумма ПОСЛЕ: ${totalAfter.toFixed(2)}`);
  console.log(`Разница: ${(totalAfter - totalBefore).toFixed(2)} (ожидается ~161.04)`);
  
  // 5. Создаём индексы
  console.log('\n🚀 ШАГ 5: СОЗДАНИЕ ИНДЕКСОВ');
  console.log('Внимание: Создание индексов через Supabase может быть ограничено.');
  console.log('Рекомендуется выполнить scripts/generated_index_script.sql напрямую в консоли базы данных.');
  
  // Список индексов для создания
  const indexes = [
    {
      name: 'idx_users_telegram_id',
      sql: 'CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users (telegram_id);',
      description: 'Индекс для поиска по telegram_id'
    },
    {
      name: 'idx_transactions_user_created',
      sql: 'CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON transactions (user_id, created_at DESC);',
      description: 'Индекс для истории транзакций'
    },
    {
      name: 'idx_users_balances',
      sql: 'CREATE INDEX IF NOT EXISTS idx_users_balances ON users (balance_uni, balance_ton) WHERE balance_uni > 0 OR balance_ton > 0;',
      description: 'Индекс для фильтрации по балансам'
    },
    {
      name: 'idx_users_uni_farming_active',
      sql: 'CREATE INDEX IF NOT EXISTS idx_users_uni_farming_active ON users (uni_farming_active) WHERE uni_farming_active = true;',
      description: 'Индекс для активных фермеров'
    }
  ];
  
  console.log('\nПопытка создать критические индексы...');
  for (const index of indexes.slice(0, 2)) {
    const result = await executeSql(index.sql, index.description);
    if (result !== null) {
      console.log(`✅ ${index.name} создан`);
    }
  }
  
  // 6. Итоговый отчёт
  console.log('\n' + '='.repeat(50));
  console.log('📊 ИТОГОВЫЙ ОТЧЁТ');
  console.log('='.repeat(50));
  console.log(`\n✅ Синхронизация завершена:`);
  console.log(`   - Обновлено записей: ${syncCount}`);
  console.log(`   - Добавлено баланса: ${syncedAmount.toFixed(2)}`);
  console.log(`   - Контрольная сумма корректна: ${Math.abs((totalAfter - totalBefore) - syncedAmount) < 0.1 ? 'ДА' : 'НЕТ'}`);
  
  console.log(`\n⚠️  Для полной оптимизации:`);
  console.log(`   1. Выполните scripts/generated_index_script.sql в консоли БД`);
  console.log(`   2. Это создаст все 8 рекомендованных индексов`);
  console.log(`   3. Ожидаемое ускорение: 5-10 раз`);
  
  // Сохраняем отчёт
  const report = {
    timestamp: new Date().toISOString(),
    sync: {
      records_updated: syncCount,
      amount_added: syncedAmount,
      checksum_before: totalBefore,
      checksum_after: totalAfter,
      checksum_diff: totalAfter - totalBefore
    },
    status: 'COMPLETED'
  };
  
  await fs.writeFile(
    path.join(process.cwd(), 'docs', 'OPTIMIZATION_EXECUTION_REPORT.json'),
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n✅ Отчёт сохранён: docs/OPTIMIZATION_EXECUTION_REPORT.json');
}

runOptimization().catch(console.error);