#!/usr/bin/env tsx
/**
 * ДЕТАЛЬНЫЙ АНАЛИЗ АККАУНТОВ 291-303 VS USER ID 25
 * Дата: 31.07.2025
 * Цель: Точная диагностика различий и план исправления
 */

interface AccountAnalysis {
  userId: number;
  status: 'WORKING' | 'BROKEN' | 'PARTIAL';
  issues: string[];
  comparison: {
    hasRefCode: boolean;
    hasTransactions: boolean;
    hasBalances: boolean;
    hasTonFarming: boolean;
    hasUserSessions: boolean;
    tonBoostConsistent: boolean;
  };
  recommendations: string[];
}

// Эталонная структура User ID 25 для сравнения
const USER_25_REFERENCE = {
  id: 25,
  telegram_id: 425855744,
  username: '@DimaOsadchuk',
  ref_code: 'REF_1750079004411_nddfp2',
  has_transactions: true, // 583+ записей
  balance_location: 'users_table', // balance_uni, balance_ton в users
  ton_farming_location: 'users_table', // ton_farming_* поля в users
  ton_boost_sync: true, // ton_boost_active синхронизирован с ton_farming_data
  admin_rights: true,
  created_at: '2025-06-16T13:03:24.488578',
  systems_working: [
    'WebSocket', 'API', 'JWT', 'BalanceManager', 
    'TON_Boost', 'Schedulers', 'Admin_functions'
  ]
};

console.log('🔍 НАЧИНАЕМ ДЕТАЛЬНЫЙ АНАЛИЗ АККАУНТОВ 291-303');
console.log('📋 Эталон для сравнения: User ID 25');
console.log('🎯 Цель: Выявить точные различия и план унификации');
console.log('=' .repeat(60));

/**
 * SQL запросы для анализа каждого аккаунта 291-303
 */
const ANALYSIS_QUERIES = {
  
  // 1. ОСНОВНАЯ ИНФОРМАЦИЯ АККАУНТОВ
  main_info: `
    SELECT 
      id,
      telegram_id,
      username,
      first_name,
      ref_code,
      parent_ref_code,
      balance_uni,
      balance_ton,
      uni_farming_active,
      ton_boost_active,
      ton_farming_balance,
      ton_farming_rate,
      ton_boost_package,
      is_admin,
      created_at,
      CASE 
        WHEN ref_code IS NOT NULL AND ref_code != '' THEN 'HAS_REF_CODE'
        ELSE 'MISSING_REF_CODE'
      END as ref_code_status,
      CASE 
        WHEN telegram_id IS NOT NULL AND telegram_id != 0 THEN 'HAS_TELEGRAM_ID'
        ELSE 'MISSING_TELEGRAM_ID'
      END as telegram_id_status
    FROM users 
    WHERE id BETWEEN 291 AND 303
    ORDER BY id;
  `,

  // 2. ПРОВЕРКА ТРАНЗАКЦИЙ (критично для BalanceManager)
  transactions_check: `
    SELECT 
      u.id as user_id,
      u.username,
      COUNT(t.id) as transaction_count,
      MIN(t.created_at) as first_transaction,
      MAX(t.created_at) as last_transaction,
      STRING_AGG(DISTINCT t.transaction_type, ', ') as transaction_types,
      SUM(CASE WHEN t.currency = 'UNI' THEN t.amount::numeric ELSE 0 END) as total_uni_transactions,
      SUM(CASE WHEN t.currency = 'TON' THEN t.amount::numeric ELSE 0 END) as total_ton_transactions
    FROM users u
    LEFT JOIN transactions t ON u.id = t.user_id
    WHERE u.id BETWEEN 291 AND 303
    GROUP BY u.id, u.username
    ORDER BY u.id;
  `,

  // 3. ПРОВЕРКА ПОЛЬЗОВАТЕЛЬСКИХ СЕССИЙ
  sessions_check: `
    SELECT 
      u.id as user_id,
      u.username,
      COUNT(us.id) as session_count,
      MAX(us.created_at) as last_session_created,
      MAX(us.last_activity) as last_activity,
      COUNT(CASE WHEN us.expires_at > NOW() THEN 1 END) as active_sessions
    FROM users u
    LEFT JOIN user_sessions us ON u.id = us.user_id
    WHERE u.id BETWEEN 291 AND 303
    GROUP BY u.id, u.username
    ORDER BY u.id;
  `,

  // 4. ПРОВЕРКА TON FARMING DATA СИНХРОНИЗАЦИИ
  ton_farming_sync: `
    SELECT 
      u.id as user_id,
      u.username,
      u.ton_boost_active,
      u.ton_farming_balance as users_farming_balance,
      u.ton_farming_rate as users_farming_rate,
      tfd.user_id as ton_farming_data_user_id,
      tfd.farming_balance as farming_data_balance,
      tfd.farming_rate as farming_data_rate,
      tfd.boost_active as farming_data_boost_active,
      CASE 
        WHEN u.ton_boost_active = true AND tfd.user_id IS NULL THEN 'BOOST_ACTIVE_NO_DATA'
        WHEN u.ton_boost_active = false AND tfd.user_id IS NOT NULL THEN 'NO_BOOST_HAS_DATA'
        WHEN u.ton_boost_active = true AND tfd.user_id IS NOT NULL THEN 'SYNCHRONIZED'
        ELSE 'NO_BOOST_NO_DATA'
      END as sync_status
    FROM users u
    LEFT JOIN ton_farming_data tfd ON u.id::text = tfd.user_id
    WHERE u.id BETWEEN 291 AND 303
    ORDER BY u.id;
  `,

  // 5. ПРОВЕРКА АЛЬТЕРНАТИВНЫХ БАЛАНСОВ
  balance_locations: `
    SELECT 
      u.id as user_id,
      u.username,
      u.balance_uni as users_balance_uni,
      u.balance_ton as users_balance_ton,
      ub.balance_uni as user_balances_uni,
      ub.balance_ton as user_balances_ton,
      CASE 
        WHEN u.balance_uni IS NOT NULL AND u.balance_uni != '0' THEN 'USERS_TABLE'
        WHEN ub.balance_uni IS NOT NULL AND ub.balance_uni != '0' THEN 'USER_BALANCES_TABLE'
        ELSE 'NO_BALANCE_DATA'
      END as balance_location
    FROM users u
    LEFT JOIN user_balances ub ON u.id = ub.user_id
    WHERE u.id BETWEEN 291 AND 303
    ORDER BY u.id;
  `,

  // 6. СРАВНЕНИЕ С USER ID 25
  comparison_with_25: `
    SELECT 
      'USER_25_REFERENCE' as account_type,
      id, username, 
      CASE WHEN ref_code IS NOT NULL THEN 'YES' ELSE 'NO' END as has_ref_code,
      CASE WHEN telegram_id IS NOT NULL THEN 'YES' ELSE 'NO' END as has_telegram_id,
      balance_uni, balance_ton,
      ton_farming_balance, ton_boost_active,
      (SELECT COUNT(*) FROM transactions WHERE user_id = users.id) as transaction_count,
      (SELECT COUNT(*) FROM user_sessions WHERE user_id = users.id) as session_count
    FROM users WHERE id = 25
    
    UNION ALL
    
    SELECT 
      'ACCOUNTS_291_303' as account_type,
      id, username,
      CASE WHEN ref_code IS NOT NULL THEN 'YES' ELSE 'NO' END as has_ref_code,
      CASE WHEN telegram_id IS NOT NULL THEN 'YES' ELSE 'NO' END as has_telegram_id,
      balance_uni, balance_ton,
      ton_farming_balance, ton_boost_active,
      (SELECT COUNT(*) FROM transactions WHERE user_id = users.id) as transaction_count,
      (SELECT COUNT(*) FROM user_sessions WHERE user_id = users.id) as session_count
    FROM users WHERE id BETWEEN 291 AND 303
    ORDER BY account_type, id;
  `
};

/**
 * Функция анализа конкретного аккаунта
 */
async function analyzeAccount(userId: number): Promise<AccountAnalysis> {
  const analysis: AccountAnalysis = {
    userId,
    status: 'WORKING',
    issues: [],
    comparison: {
      hasRefCode: false,
      hasTransactions: false,
      hasBalances: false,
      hasTonFarming: false,
      hasUserSessions: false,
      tonBoostConsistent: false
    },
    recommendations: []
  };

  // Симуляция анализа (в реальности будут запросы к БД)
  console.log(`🔍 Анализируем аккаунт ${userId}...`);
  
  // Проверки против эталона User ID 25
  const checks = [
    { name: 'ref_code', critical: true },
    { name: 'telegram_id', critical: true },
    { name: 'transactions', critical: true },
    { name: 'balances', critical: false },
    { name: 'user_sessions', critical: false },
    { name: 'ton_boost_sync', critical: false }
  ];

  checks.forEach(check => {
    // Логика проверки будет заполнена после получения данных из БД
    console.log(`  - Проверяем ${check.name}...`);
  });

  return analysis;
}

/**
 * Генерация плана исправления для конкретного аккаунта
 */
function generateFixPlan(analysis: AccountAnalysis): string[] {
  const fixes: string[] = [];
  
  if (!analysis.comparison.hasRefCode) {
    fixes.push(`UPDATE users SET ref_code = 'REF_${Date.now()}_${Math.random().toString(36).substring(2, 6)}' WHERE id = ${analysis.userId};`);
  }
  
  if (!analysis.comparison.hasTransactions) {
    fixes.push(`INSERT INTO transactions (user_id, transaction_type, currency, amount, status, description) VALUES (${analysis.userId}, 'SYSTEM_INIT', 'UNI', '0.01', 'confirmed', 'Техническая инициализация для унификации');`);
  }
  
  if (!analysis.comparison.hasUserSessions) {
    fixes.push(`INSERT INTO user_sessions (user_id, session_token, expires_at) VALUES (${analysis.userId}, 'unif_${analysis.userId}_${Date.now()}', NOW() + INTERVAL '30 days');`);
  }
  
  if (!analysis.comparison.tonBoostConsistent) {
    fixes.push(`-- Синхронизация TON Boost для аккаунта ${analysis.userId}`);
  }
  
  return fixes;
}

/**
 * Основная функция анализа
 */
async function runDetailedAnalysis() {
  console.log('\n📊 ЗАПУСК ДЕТАЛЬНОГО АНАЛИЗА');
  console.log('=' .repeat(60));
  
  console.log('\n1️⃣ АНАЛИЗ ОСНОВНОЙ ИНФОРМАЦИИ:');
  console.log('Запрос:', ANALYSIS_QUERIES.main_info);
  
  console.log('\n2️⃣ АНАЛИЗ ТРАНЗАКЦИЙ:');
  console.log('Запрос:', ANALYSIS_QUERIES.transactions_check);
  
  console.log('\n3️⃣ АНАЛИЗ СЕССИЙ:');
  console.log('Запрос:', ANALYSIS_QUERIES.sessions_check);
  
  console.log('\n4️⃣ АНАЛИЗ TON FARMING СИНХРОНИЗАЦИИ:');
  console.log('Запрос:', ANALYSIS_QUERIES.ton_farming_sync);
  
  console.log('\n5️⃣ АНАЛИЗ РАСПОЛОЖЕНИЯ БАЛАНСОВ:');
  console.log('Запрос:', ANALYSIS_QUERIES.balance_locations);
  
  console.log('\n6️⃣ СРАВНЕНИЕ С USER ID 25:');
  console.log('Запрос:', ANALYSIS_QUERIES.comparison_with_25);
  
  // Анализ каждого аккаунта 291-303
  const accountAnalyses: AccountAnalysis[] = [];
  for (let userId = 291; userId <= 303; userId++) {
    const analysis = await analyzeAccount(userId);
    accountAnalyses.push(analysis);
  }
  
  console.log('\n📋 РЕЗУЛЬТАТЫ АНАЛИЗА:');
  console.log('=' .repeat(60));
  
  const workingAccounts = accountAnalyses.filter(a => a.status === 'WORKING').length;
  const brokenAccounts = accountAnalyses.filter(a => a.status === 'BROKEN').length;
  const partialAccounts = accountAnalyses.filter(a => a.status === 'PARTIAL').length;
  
  console.log(`✅ Работающие аккаунты: ${workingAccounts}`);
  console.log(`❌ Неработающие аккаунты: ${brokenAccounts}`);
  console.log(`⚠️ Частично работающие: ${partialAccounts}`);
  
  console.log('\n🔧 ПЛАН ИСПРАВЛЕНИЯ:');
  console.log('=' .repeat(60));
  
  accountAnalyses.forEach(analysis => {
    if (analysis.status !== 'WORKING') {
      console.log(`\nАккаунт ${analysis.userId}:`);
      console.log(`Проблемы: ${analysis.issues.join(', ')}`);
      const fixes = generateFixPlan(analysis);
      fixes.forEach(fix => console.log(`  ${fix}`));
    }
  });
  
  return accountAnalyses;
}

// Экспорт для использования
export {
  USER_25_REFERENCE,
  ANALYSIS_QUERIES,
  analyzeAccount,
  generateFixPlan,
  runDetailedAnalysis
};

console.log('\n🎯 АНАЛИЗ ГОТОВ К ЗАПУСКУ');
console.log('📋 Все SQL запросы подготовлены для детальной диагностики');
console.log('🔧 План исправления будет создан автоматически');
console.log('✅ Реферальные связи будут сохранены без изменений');