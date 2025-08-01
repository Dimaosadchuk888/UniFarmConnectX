#!/usr/bin/env tsx
/**
 * SQL аудит базы данных UniFarm через Supabase
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';

dotenv.config();

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error('❌ Ошибка: SUPABASE_URL и SUPABASE_KEY должны быть установлены');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Функция выполнения RPC для SQL запросов
async function executeSQL(query: string) {
  try {
    const { data, error } = await supabase.rpc('execute_sql', { query });
    if (error) throw error;
    return data;
  } catch (error) {
    // Если RPC не доступен, используем прямые запросы
    return null;
  }
}

async function runDatabaseAudit() {
  const auditResults: any = {
    timestamp: new Date().toISOString(),
    database_statistics: {},
    data_patterns: {},
    issues: [],
    recommendations: []
  };

  console.log('🔍 Запуск SQL аудита базы данных UniFarm');
  console.log('==========================================\n');

  // 1. Статистика по таблицам
  console.log('📊 1. Сбор статистики по таблицам...');
  
  // Таблица users
  const { data: usersStats, error: usersError } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });
  
  const { data: usersWithUni } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .gt('balance_uni', 0);
    
  const { data: usersWithTon } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .gt('balance_ton', 0);
    
  const { data: activeFarmers } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('uni_farming_active', true);
    
  const { data: tonBoostUsers } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('ton_boost_active', true);
    
  auditResults.database_statistics.users = {
    total_count: usersStats?.count || 0,
    with_uni_balance: usersWithUni?.count || 0,
    with_ton_balance: usersWithTon?.count || 0,
    active_farmers: activeFarmers?.count || 0,
    ton_boost_active: tonBoostUsers?.count || 0
  };
  
  // Таблица transactions
  const { data: txStats } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true });
    
  const { data: txTypes } = await supabase
    .from('transactions')
    .select('type')
    .not('type', 'is', null);
    
  const uniqueTypes = [...new Set(txTypes?.map(tx => tx.type) || [])];
  
  auditResults.database_statistics.transactions = {
    total_count: txStats?.count || 0,
    unique_types: uniqueTypes,
    types_count: uniqueTypes.length
  };
  
  // Таблица withdraw_requests
  const { data: withdrawStats } = await supabase
    .from('withdraw_requests')
    .select('*', { count: 'exact', head: true });
    
  const { data: pendingWithdraws } = await supabase
    .from('withdraw_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');
    
  auditResults.database_statistics.withdraw_requests = {
    total_count: withdrawStats?.count || 0,
    pending_count: pendingWithdraws?.count || 0
  };
  
  console.log('✅ Статистика собрана');
  
  // 2. Проверка неиспользуемых таблиц
  console.log('\n🔎 2. Проверка специальных таблиц...');
  
  const { data: uniFarmingData } = await supabase
    .from('uni_farming_data')
    .select('*', { count: 'exact', head: true });
    
  const { data: tonFarmingData } = await supabase
    .from('ton_farming_data')
    .select('*', { count: 'exact', head: true });
    
  const { data: referralsData } = await supabase
    .from('referrals')
    .select('*', { count: 'exact', head: true });
    
  const { data: userSessionsData } = await supabase
    .from('user_sessions')
    .select('*', { count: 'exact', head: true });
    
  auditResults.database_statistics.special_tables = {
    uni_farming_data: uniFarmingData?.count || 0,
    ton_farming_data: tonFarmingData?.count || 0,
    referrals: referralsData?.count || 0,
    user_sessions: userSessionsData?.count || 0
  };
  
  // 3. Анализ паттернов данных
  console.log('\n📈 3. Анализ паттернов данных...');
  
  // Паттерн: Дублирование реферальных данных
  const { data: usersWithReferrers } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .not('referred_by', 'is', null);
    
  const { data: usersWithParentRef } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .not('parent_ref_code', 'is', null);
    
  auditResults.data_patterns.referral_duplication = {
    users_with_referred_by: usersWithReferrers?.count || 0,
    users_with_parent_ref_code: usersWithParentRef?.count || 0,
    referrals_table_count: referralsData?.count || 0,
    analysis: 'Реферальные данные хранятся в users, таблица referrals не используется'
  };
  
  // Паттерн: Типы транзакций
  const { data: txByType } = await supabase
    .from('transactions')
    .select('type');
    
  const txTypeCounts: Record<string, number> = {};
  txByType?.forEach(tx => {
    if (tx.type) {
      txTypeCounts[tx.type] = (txTypeCounts[tx.type] || 0) + 1;
    }
  });
  
  auditResults.data_patterns.transaction_types = txTypeCounts;
  
  // 4. Проверка проблем
  console.log('\n⚠️  4. Поиск проблем...');
  
  // Проблема: Несоответствие структуры
  const { data: sampleTx } = await supabase
    .from('transactions')
    .select('*')
    .limit(1)
    .single();
    
  if (sampleTx) {
    const hasOldFields = 'type' in sampleTx && 'amount_uni' in sampleTx;
    const hasNewFields = 'transaction_type' in sampleTx && 'amount' in sampleTx;
    
    if (hasOldFields && !hasNewFields) {
      auditResults.issues.push({
        severity: 'HIGH',
        type: 'SCHEMA_MISMATCH',
        description: 'Таблица transactions использует старую структуру (type, amount_uni, amount_ton) вместо новой из schema.ts',
        impact: 'Код может работать некорректно с новыми типами транзакций'
      });
    }
  }
  
  // Проблема: Неиспользуемые таблицы
  if ((uniFarmingData?.count || 0) === 0 && auditResults.database_statistics.users.active_farmers > 0) {
    auditResults.issues.push({
      severity: 'MEDIUM',
      type: 'UNUSED_TABLE',
      description: 'Таблица uni_farming_data пустая, хотя есть активные фармеры',
      impact: 'Данные фарминга хранятся только в users, возможны проблемы с производительностью'
    });
  }
  
  // Проблема: Балансы хранятся как строки
  const { data: userSample } = await supabase
    .from('users')
    .select('balance_uni, balance_ton')
    .limit(1)
    .single();
    
  if (userSample && typeof userSample.balance_uni === 'string') {
    auditResults.issues.push({
      severity: 'LOW',
      type: 'DATA_TYPE_ISSUE',
      description: 'Балансы хранятся как строки, а не числа',
      impact: 'Требуется постоянная конвертация типов, возможны ошибки округления'
    });
  }
  
  // 5. Рекомендации
  console.log('\n💡 5. Формирование рекомендаций...');
  
  auditResults.recommendations = [
    {
      priority: 'HIGH',
      title: 'Миграция структуры транзакций',
      description: 'Обновить таблицу transactions согласно schema.ts или обновить schema.ts под текущую структуру БД'
    },
    {
      priority: 'MEDIUM',
      title: 'Оптимизация хранения фарминг-данных',
      description: 'Перенести данные фарминга из users в специализированные таблицы для лучшей производительности'
    },
    {
      priority: 'MEDIUM', 
      title: 'Удаление неиспользуемых таблиц',
      description: 'Удалить таблицы referrals, user_sessions, uni_farming_data, ton_farming_data если они не планируются к использованию'
    },
    {
      priority: 'LOW',
      title: 'Стандартизация типов данных',
      description: 'Использовать числовые типы для балансов вместо строк'
    }
  ];
  
  // Сохранение результатов
  const reportPath = path.join(process.cwd(), 'docs', `database_sql_audit_${Date.now()}.json`);
  await fs.writeFile(reportPath, JSON.stringify(auditResults, null, 2));
  
  console.log(`\n✅ SQL аудит завершён! Отчёт сохранён: ${reportPath}`);
  
  // Вывод сводки
  console.log('\n========== СВОДКА АУДИТА ==========');
  console.log(`Всего пользователей: ${auditResults.database_statistics.users.total_count}`);
  console.log(`Активных фармеров: ${auditResults.database_statistics.users.active_farmers}`);
  console.log(`Всего транзакций: ${auditResults.database_statistics.transactions.total_count}`);
  console.log(`Найдено проблем: ${auditResults.issues.length}`);
  console.log(`- Критических: ${auditResults.issues.filter((i: any) => i.severity === 'HIGH').length}`);
  console.log(`- Средних: ${auditResults.issues.filter((i: any) => i.severity === 'MEDIUM').length}`);
  console.log(`- Низких: ${auditResults.issues.filter((i: any) => i.severity === 'LOW').length}`);
  
  return auditResults;
}

// Запуск
runDatabaseAudit().catch(console.error);