#!/usr/bin/env tsx
/**
 * 🔍 КОМПЛЕКСНАЯ ДИАГНОСТИКА РАЗЛИЧИЙ МЕЖДУ АККАУНТАМИ
 * Эталон: User ID 25 (корректно работающий аккаунт)
 * Цель: Выявить все причины различий и привести к единому формату
 * Дата: 31.07.2025
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 НАЧИНАЕМ КОМПЛЕКСНУЮ ДИАГНОСТИКУ АККАУНТОВ');
console.log('📊 Эталон: User ID 25 (корректно работающий)');
console.log('='.repeat(80));

interface UserProfile {
  id: number;
  telegram_id: string;
  username: string;
  first_name: string;
  last_name: string;
  balance_uni: string;
  balance_ton: string;
  uni_farming_active: boolean;
  ton_boost_active: boolean;
  ton_boost_package: number;
  ton_boost_rate: number;
  referral_code: string;
  referred_by: number;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

interface TableAnalysis {
  tableName: string;
  recordsCount: number;
  hasRecords: boolean;
  keyFields: Record<string, any>;
  missingFields: string[];
}

interface AccountDiagnostic {
  userId: number;
  username: string;
  overallStatus: 'PERFECT' | 'GOOD' | 'ISSUES' | 'BROKEN';
  mainProfile: UserProfile;
  relatedTables: TableAnalysis[];
  anomalies: string[];
  missingEntities: string[];
  recommendedActions: string[];
}

async function analyzeReferenceUser(): Promise<AccountDiagnostic> {
  console.log('\n1️⃣ АНАЛИЗ ЭТАЛОННОГО ПОЛЬЗОВАТЕЛЯ (ID 25):');
  
  // Получаем основной профиль User 25
  const { data: user25, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', 25)
    .single();

  if (userError || !user25) {
    throw new Error(`Эталонный пользователь ID 25 не найден: ${userError?.message}`);
  }

  console.log(`👤 Эталон: ${user25.first_name} ${user25.last_name} (@${user25.username})`);
  console.log(`🆔 Telegram ID: ${user25.telegram_id}`);
  console.log(`💰 UNI баланс: ${user25.balance_uni || 0}`);
  console.log(`💎 TON баланс: ${user25.balance_ton || 0}`);
  console.log(`🚜 UNI фарминг: ${user25.uni_farming_active ? 'АКТИВЕН' : 'НЕАКТИВЕН'}`);
  console.log(`🚀 TON Boost: ${user25.ton_boost_active ? 'АКТИВЕН' : 'НЕАКТИВЕН'}`);

  // Анализируем все связанные таблицы
  const relatedTables: TableAnalysis[] = [];
  
  // 1. Транзакции
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 25);
  
  relatedTables.push({
    tableName: 'transactions',
    recordsCount: transactions?.length || 0,
    hasRecords: (transactions?.length || 0) > 0,
    keyFields: {
      total_transactions: transactions?.length || 0,
      deposit_count: transactions?.filter(tx => tx.type.includes('DEPOSIT')).length || 0,
      withdrawal_count: transactions?.filter(tx => tx.type === 'WITHDRAWAL').length || 0,
      farming_count: transactions?.filter(tx => tx.type === 'FARMING_REWARD').length || 0,
      boost_count: transactions?.filter(tx => tx.type === 'BOOST_PURCHASE').length || 0,
    },
    missingFields: []
  });

  // 2. TON Farming Data
  const { data: farmingData, error: farmingError } = await supabase
    .from('ton_farming_data')
    .select('*')
    .eq('user_id', 25);

  relatedTables.push({
    tableName: 'ton_farming_data',
    recordsCount: farmingData?.length || 0,
    hasRecords: (farmingData?.length || 0) > 0,
    keyFields: farmingData?.[0] || {},
    missingFields: []
  });

  // 3. Referrals
  const { data: referrals, error: refError } = await supabase
    .from('users')
    .select('id, username, referred_by')
    .eq('referred_by', 25);

  relatedTables.push({
    tableName: 'referrals_given',
    recordsCount: referrals?.length || 0,
    hasRecords: (referrals?.length || 0) > 0,
    keyFields: {
      total_referrals: referrals?.length || 0,
      referral_usernames: referrals?.map(r => r.username).join(', ') || 'None'
    },
    missingFields: []
  });

  // 4. User Sessions/WebSocket connections
  const { data: sessions, error: sessionError } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('user_id', 25)
    .limit(10);

  relatedTables.push({
    tableName: 'user_sessions',
    recordsCount: sessions?.length || 0,
    hasRecords: (sessions?.length || 0) > 0,
    keyFields: sessions?.[0] || {},
    missingFields: []
  });

  // 5. Daily Bonus
  const { data: dailyBonus, error: bonusError } = await supabase
    .from('daily_bonus_claims')
    .select('*')
    .eq('user_id', 25);

  relatedTables.push({
    tableName: 'daily_bonus_claims',
    recordsCount: dailyBonus?.length || 0,
    hasRecords: (dailyBonus?.length || 0) > 0,
    keyFields: dailyBonus?.[dailyBonus.length - 1] || {},
    missingFields: []
  });

  return {
    userId: 25,
    username: user25.username,
    overallStatus: 'PERFECT',
    mainProfile: user25,
    relatedTables,
    anomalies: [],
    missingEntities: [],
    recommendedActions: []
  };
}

async function analyzeAllUsers(referenceUser: AccountDiagnostic): Promise<AccountDiagnostic[]> {
  console.log('\n2️⃣ АНАЛИЗ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ И СРАВНЕНИЕ С ЭТАЛОНОМ:');
  
  // Получаем всех пользователей
  const { data: allUsers, error: usersError } = await supabase
    .from('users')
    .select('*')
    .order('id', { ascending: true });

  if (usersError || !allUsers) {
    throw new Error(`Ошибка получения пользователей: ${usersError?.message}`);
  }

  console.log(`📊 Найдено пользователей: ${allUsers.length}`);
  
  const diagnostics: AccountDiagnostic[] = [];
  const reference = referenceUser.mainProfile;

  for (const user of allUsers) {
    if (user.id === 25) continue; // Пропускаем эталон
    
    const diagnostic: AccountDiagnostic = {
      userId: user.id,
      username: user.username,
      overallStatus: 'GOOD',
      mainProfile: user,
      relatedTables: [],
      anomalies: [],
      missingEntities: [],
      recommendedActions: []
    };

    // Сравниваем основные поля с эталоном
    const criticalFields = [
      'balance_uni', 'balance_ton', 'uni_farming_active', 'ton_boost_active',
      'ton_boost_package', 'ton_boost_rate', 'referral_code'
    ];

    criticalFields.forEach(field => {
      const userValue = user[field];
      const referenceValue = reference[field];
      
      if (userValue === null && referenceValue !== null) {
        diagnostic.anomalies.push(`Поле ${field} отсутствует (у эталона: ${referenceValue})`);
      }
      
      if (field === 'balance_uni' && parseFloat(userValue || '0') === 0) {
        diagnostic.anomalies.push(`Нулевой UNI баланс (у эталона: ${referenceValue})`);
      }
      
      if (field === 'ton_boost_active' && userValue === false && reference[field] === true) {
        diagnostic.anomalies.push(`TON Boost неактивен (у эталона активен)`);
      }
    });

    // Проверяем связанные таблицы
    await analyzeUserRelatedTables(user.id, diagnostic);

    // Определяем общий статус
    if (diagnostic.anomalies.length === 0) {
      diagnostic.overallStatus = 'PERFECT';
    } else if (diagnostic.anomalies.length <= 2) {
      diagnostic.overallStatus = 'GOOD';
    } else if (diagnostic.anomalies.length <= 5) {
      diagnostic.overallStatus = 'ISSUES';
    } else {
      diagnostic.overallStatus = 'BROKEN';
    }

    diagnostics.push(diagnostic);
  }

  return diagnostics;
}

async function analyzeUserRelatedTables(userId: number, diagnostic: AccountDiagnostic): Promise<void> {
  // Проверяем транзакции
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId);

  if (!transactions || transactions.length === 0) {
    diagnostic.missingEntities.push('transactions');
    diagnostic.anomalies.push('Отсутствуют транзакции');
  }

  // Проверяем TON farming data
  const { data: farmingData } = await supabase
    .from('ton_farming_data')
    .select('*')
    .eq('user_id', userId);

  if (diagnostic.mainProfile.ton_boost_active && (!farmingData || farmingData.length === 0)) {
    diagnostic.missingEntities.push('ton_farming_data');
    diagnostic.anomalies.push('TON Boost активен, но нет данных фарминга');
  }

  // Проверяем daily bonus
  const { data: dailyBonus } = await supabase
    .from('daily_bonus_claims')
    .select('*')
    .eq('user_id', userId);

  diagnostic.relatedTables = [
    {
      tableName: 'transactions',
      recordsCount: transactions?.length || 0,
      hasRecords: (transactions?.length || 0) > 0,
      keyFields: { total: transactions?.length || 0 },
      missingFields: []
    },
    {
      tableName: 'ton_farming_data', 
      recordsCount: farmingData?.length || 0,
      hasRecords: (farmingData?.length || 0) > 0,
      keyFields: farmingData?.[0] || {},
      missingFields: []
    },
    {
      tableName: 'daily_bonus_claims',
      recordsCount: dailyBonus?.length || 0,
      hasRecords: (dailyBonus?.length || 0) > 0,
      keyFields: dailyBonus?.[dailyBonus?.length - 1] || {},
      missingFields: []
    }
  ];
}

async function generateUnificationReport(diagnostics: AccountDiagnostic[]): Promise<void> {
  console.log('\n3️⃣ ОТЧЕТ ПО УНИФИКАЦИИ АККАУНТОВ:');
  console.log('='.repeat(80));

  const statusCounts = {
    PERFECT: diagnostics.filter(d => d.overallStatus === 'PERFECT').length,
    GOOD: diagnostics.filter(d => d.overallStatus === 'GOOD').length,
    ISSUES: diagnostics.filter(d => d.overallStatus === 'ISSUES').length,
    BROKEN: diagnostics.filter(d => d.overallStatus === 'BROKEN').length
  };

  console.log('📊 РАСПРЕДЕЛЕНИЕ ПО СТАТУСАМ:');
  console.log(`✅ PERFECT: ${statusCounts.PERFECT} аккаунтов`);
  console.log(`🟢 GOOD: ${statusCounts.GOOD} аккаунтов`);
  console.log(`🟡 ISSUES: ${statusCounts.ISSUES} аккаунтов`);
  console.log(`🔴 BROKEN: ${statusCounts.BROKEN} аккаунтов`);

  console.log('\n🔴 ПРОБЛЕМНЫЕ АККАУНТЫ (ISSUES + BROKEN):');
  const problematic = diagnostics.filter(d => d.overallStatus === 'ISSUES' || d.overallStatus === 'BROKEN');
  
  problematic.forEach(account => {
    console.log(`\n🆔 User ${account.userId} (@${account.username}) - ${account.overallStatus}`);
    console.log(`   💰 UNI: ${account.mainProfile.balance_uni || 0}, TON: ${account.mainProfile.balance_ton || 0}`);
    console.log(`   🚜 UNI фарминг: ${account.mainProfile.uni_farming_active}, 🚀 TON Boost: ${account.mainProfile.ton_boost_active}`);
    
    if (account.anomalies.length > 0) {
      console.log(`   ⚠️ Аномалии: ${account.anomalies.slice(0, 3).join('; ')}`);
    }
    
    if (account.missingEntities.length > 0) {
      console.log(`   ❌ Отсутствует: ${account.missingEntities.join(', ')}`);
    }
  });

  console.log('\n📈 ТОП АНОМАЛИИ:');
  const allAnomalies = diagnostics.flatMap(d => d.anomalies);
  const anomalyCounts = allAnomalies.reduce((acc, anomaly) => {
    acc[anomaly] = (acc[anomaly] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  Object.entries(anomalyCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .forEach(([anomaly, count]) => {
      console.log(`   ${count} аккаунтов: ${anomaly}`);
    });

  console.log('\n❌ ОТСУТСТВУЮЩИЕ СУЩНОСТИ:');
  const allMissing = diagnostics.flatMap(d => d.missingEntities);
  const missingCounts = allMissing.reduce((acc, entity) => {
    acc[entity] = (acc[entity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  Object.entries(missingCounts)
    .sort(([,a], [,b]) => b - a)
    .forEach(([entity, count]) => {
      console.log(`   ${count} аккаунтов: отсутствует ${entity}`);
    });
}

async function generateSQLDiagnostic(): Promise<void> {
  console.log('\n4️⃣ SQL ДИАГНОСТИЧЕСКИЕ ЗАПРОСЫ:');
  console.log('='.repeat(80));

  const sqlQueries = [
    {
      name: 'Пользователи без транзакций',
      query: `SELECT u.id, u.username, u.balance_uni, u.balance_ton 
              FROM users u 
              LEFT JOIN transactions t ON u.id = t.user_id 
              WHERE t.user_id IS NULL 
              ORDER BY u.id;`
    },
    {
      name: 'TON Boost активен, но нет данных фарминга',
      query: `SELECT u.id, u.username, u.ton_boost_active, u.ton_boost_package 
              FROM users u 
              LEFT JOIN ton_farming_data tfd ON u.id = tfd.user_id 
              WHERE u.ton_boost_active = true AND tfd.user_id IS NULL 
              ORDER BY u.id;`
    },
    {
      name: 'Пользователи с нулевыми балансами',
      query: `SELECT id, username, balance_uni, balance_ton, created_at 
              FROM users 
              WHERE (balance_uni IS NULL OR balance_uni::numeric = 0) 
              AND (balance_ton IS NULL OR balance_ton::numeric = 0) 
              ORDER BY created_at DESC;`
    },
    {
      name: 'Пользователи без referral_code',
      query: `SELECT id, username, referral_code, created_at 
              FROM users 
              WHERE referral_code IS NULL OR referral_code = '' 
              ORDER BY id;`
    },
    {
      name: 'Несоответствия в TON Boost',
      query: `SELECT u.id, u.username, u.ton_boost_active, u.ton_boost_package, 
                     tfd.farming_balance, tfd.boost_active 
              FROM users u 
              LEFT JOIN ton_farming_data tfd ON u.id = tfd.user_id 
              WHERE u.ton_boost_active != COALESCE(tfd.boost_active, false) 
              ORDER BY u.id;`
    }
  ];

  sqlQueries.forEach(query => {
    console.log(`\n-- ${query.name}`);
    console.log(query.query);
  });
}

async function generateMigrationScript(): Promise<void> {
  console.log('\n5️⃣ БЕЗОПАСНЫЙ МИГРАЦИОННЫЙ СКРИПТ:');
  console.log('='.repeat(80));

  const migrationSQL = `
-- БЕЗОПАСНАЯ МИГРАЦИЯ АККАУНТОВ К ЭТАЛОНУ (User ID 25)
-- Дата: 31.07.2025
-- ВАЖНО: НЕ ЗАТРАГИВАЕТ ID 25 И КОРРЕКТНЫЕ АККАУНТЫ

BEGIN;

-- 1. Создание backup таблицы
CREATE TABLE users_backup_unification_2025_07_31 AS 
SELECT * FROM users;

-- 2. Заполнение referral_code для пользователей без него
UPDATE users 
SET referral_code = 'REF' || LPAD(id::text, 6, '0')
WHERE referral_code IS NULL OR referral_code = ''
AND id != 25; -- Не трогаем эталон

-- 3. Инициализация дефолтных балансов (только для NULL значений)
UPDATE users 
SET balance_uni = '0.01',
    balance_ton = '0.01'
WHERE (balance_uni IS NULL OR balance_ton IS NULL)
AND id != 25; -- Не трогаем эталон

-- 4. Создание недостающих ton_farming_data записей для активных TON Boost
INSERT INTO ton_farming_data (
    user_id, 
    farming_balance, 
    farming_rate, 
    boost_active, 
    last_update,
    created_at
)
SELECT 
    u.id,
    0.0,
    0.0,
    false,
    NOW(),
    NOW()
FROM users u
LEFT JOIN ton_farming_data tfd ON u.id = tfd.user_id
WHERE u.ton_boost_active = true 
AND tfd.user_id IS NULL
AND u.id != 25; -- Не трогаем эталон

-- 5. Синхронизация TON Boost статусов
UPDATE users 
SET ton_boost_active = false,
    ton_boost_package = NULL,
    ton_boost_rate = NULL
WHERE id IN (
    SELECT u.id 
    FROM users u 
    LEFT JOIN ton_farming_data tfd ON u.id = tfd.user_id 
    WHERE u.ton_boost_active = true 
    AND (tfd.user_id IS NULL OR tfd.boost_active = false)
)
AND id != 25; -- Не трогаем эталон

-- 6. Создание базовых транзакций для пользователей без них
INSERT INTO transactions (
    user_id,
    type,
    amount,
    currency,
    status,
    description,
    created_at,
    updated_at,
    metadata
)
SELECT 
    u.id,
    'SYSTEM_INITIALIZATION',
    0.01,
    'UNI',
    'completed',
    'System initialization - unification migration',
    NOW(),
    NOW(),
    '{"migration": "unification_2025_07_31", "reason": "missing_transactions"}'
FROM users u
LEFT JOIN transactions t ON u.id = t.user_id
WHERE t.user_id IS NULL
AND u.id != 25; -- Не трогаем эталон

-- Проверочные запросы
SELECT 'Пользователи без транзакций после миграции:' as check_result;
SELECT COUNT(*) as count 
FROM users u 
LEFT JOIN transactions t ON u.id = t.user_id 
WHERE t.user_id IS NULL;

SELECT 'TON Boost несоответствия после миграции:' as check_result;
SELECT COUNT(*) as count 
FROM users u 
LEFT JOIN ton_farming_data tfd ON u.id = tfd.user_id 
WHERE u.ton_boost_active != COALESCE(tfd.boost_active, false);

-- COMMIT; -- Раскомментировать после проверки

-- ROLLBACK; -- Для отката в случае ошибок
`;

  console.log(migrationSQL);
}

async function main() {
  try {
    // 1. Анализируем эталонный аккаунт
    const referenceUser = await analyzeReferenceUser();
    
    // 2. Анализируем всех пользователей
    const allDiagnostics = await analyzeAllUsers(referenceUser);
    
    // 3. Генерируем отчет
    await generateUnificationReport(allDiagnostics);
    
    // 4. SQL диагностика
    await generateSQLDiagnostic();
    
    // 5. Миграционный скрипт
    await generateMigrationScript();
    
    console.log('\n' + '='.repeat(80));
    console.log('🏁 ДИАГНОСТИКА ЗАВЕРШЕНА');
    console.log('📊 Результаты: проанализированы все аккаунты и выявлены различия');
    console.log('🛠️ Миграционный скрипт готов к проверке и применению');
    
  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
  }
}

// Запускаем диагностику
main().then(() => {
  process.exit(0);
});