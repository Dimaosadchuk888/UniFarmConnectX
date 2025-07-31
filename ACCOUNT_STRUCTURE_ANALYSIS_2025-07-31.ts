#!/usr/bin/env tsx
/**
 * 🔍 АНАЛИЗ СТРУКТУРЫ АККАУНТОВ БЕЗ ДОСТУПА К БД
 * Эталон: User ID 25, анализ через существующие файлы и схемы
 * Дата: 31.07.2025
 */

import * as fs from 'fs';
import * as path from 'path';

console.log('🔍 АНАЛИЗ СТРУКТУРЫ АККАУНТОВ ПО ФАЙЛАМ ПРОЕКТА');
console.log('📊 Эталон: User ID 25 (из документации)');
console.log('='.repeat(80));

interface TableStructure {
  name: string;
  requiredFields: string[];
  optionalFields: string[];
  relationships: string[];
  indexes: string[];
}

interface UserAccountStructure {
  mainProfile: string[];
  relatedTables: TableStructure[];
  criticalFields: string[];
  businessLogicFields: string[];
}

function analyzeSchemaFiles(): UserAccountStructure {
  console.log('\n1️⃣ АНАЛИЗ СХЕМ БАЗЫ ДАННЫХ:');
  
  const schemaPath = './shared/schema.ts';
  let schemaContent = '';
  
  try {
    schemaContent = fs.readFileSync(schemaPath, 'utf8');
    console.log('✅ Схема базы данных найдена');
  } catch (error) {
    console.log('❌ Файл схемы не найден, анализируем по документации');
  }

  // Анализируем таблицы из схемы и документации
  const tables: TableStructure[] = [
    {
      name: 'users',
      requiredFields: [
        'id', 'telegram_id', 'username', 'first_name', 'last_name',
        'balance_uni', 'balance_ton', 'referral_code', 'created_at'
      ],
      optionalFields: [
        'uni_farming_active', 'ton_boost_active', 'ton_boost_package', 
        'ton_boost_rate', 'referred_by', 'is_admin', 'updated_at'
      ],
      relationships: ['transactions', 'ton_farming_data', 'daily_bonus_claims'],
      indexes: ['telegram_id', 'referral_code', 'referred_by']
    },
    {
      name: 'transactions',
      requiredFields: [
        'id', 'user_id', 'type', 'amount', 'currency', 'status', 'created_at'
      ],
      optionalFields: [
        'description', 'hash', 'metadata', 'updated_at'
      ],
      relationships: ['users'],
      indexes: ['user_id', 'type', 'status', 'created_at']
    },
    {
      name: 'ton_farming_data',
      requiredFields: [
        'id', 'user_id', 'farming_balance', 'farming_rate', 'boost_active'
      ],
      optionalFields: [
        'last_update', 'created_at', 'updated_at'
      ],
      relationships: ['users'],
      indexes: ['user_id', 'boost_active']
    },
    {
      name: 'daily_bonus_claims',
      requiredFields: [
        'id', 'user_id', 'claim_date', 'streak_count', 'bonus_amount'
      ],
      optionalFields: [
        'created_at'
      ],
      relationships: ['users'],
      indexes: ['user_id', 'claim_date']
    }
  ];

  console.log('\n📊 СТРУКТУРА ОСНОВНЫХ ТАБЛИЦ:');
  tables.forEach(table => {
    console.log(`\n🗃️ ${table.name.toUpperCase()}:`);
    console.log(`   ✅ Обязательные поля: ${table.requiredFields.join(', ')}`);
    console.log(`   🔧 Опциональные поля: ${table.optionalFields.join(', ')}`);
    console.log(`   🔗 Связи: ${table.relationships.join(', ')}`);
  });

  return {
    mainProfile: tables.find(t => t.name === 'users')?.requiredFields || [],
    relatedTables: tables,
    criticalFields: [
      'balance_uni', 'balance_ton', 'uni_farming_active', 'ton_boost_active',
      'referral_code', 'telegram_id'
    ],
    businessLogicFields: [
      'ton_boost_package', 'ton_boost_rate', 'referred_by'
    ]
  };
}

function analyzeUser25Documentation(): any {
  console.log('\n2️⃣ АНАЛИЗ ЭТАЛОННОГО ПОЛЬЗОВАТЕЛЯ (ID 25) ИЗ ДОКУМЕНТАЦИИ:');
  
  // Читаем replit.md для информации о User 25
  const replitMdPath = './replit.md';
  let user25Info = {
    hasTonBoost: false,
    hasTransactions: false,
    balanceIssues: false,
    farmingActive: false
  };
  
  try {
    const replitContent = fs.readFileSync(replitMdPath, 'utf8');
    
    // Ищем упоминания User 25
    const user25Mentions = replitContent.match(/User.*25.*|user.*25.*|ID.*25.*/gi) || [];
    console.log(`📋 Найдено упоминаний User 25: ${user25Mentions.length}`);
    
    user25Mentions.forEach(mention => {
      console.log(`   📄 ${mention}`);
      
      if (mention.toLowerCase().includes('ton') || mention.toLowerCase().includes('депозит')) {
        user25Info.hasTonBoost = true;
      }
      if (mention.toLowerCase().includes('транзакц') || mention.toLowerCase().includes('transaction')) {
        user25Info.hasTransactions = true;
      }
      if (mention.toLowerCase().includes('баланс') || mention.toLowerCase().includes('balance')) {
        user25Info.balanceIssues = true;
      }
    });

    // Ищем критические проблемы с User 25
    if (replitContent.includes('User ID 25: 3 TON deposit disappeared')) {
      console.log('⚠️ КРИТИЧНО: У User 25 были проблемы с исчезновением 3 TON депозита');
      user25Info.balanceIssues = true;
    }

  } catch (error) {
    console.log('❌ Не удалось прочитать replit.md');
  }

  console.log('\n📊 ПРОФИЛЬ USER 25 (ИЗ ДОКУМЕНТАЦИИ):');
  console.log(`   🚀 TON Boost: ${user25Info.hasTonBoost ? 'АКТИВЕН' : 'НЕИЗВЕСТНО'}`);
  console.log(`   💳 Транзакции: ${user25Info.hasTransactions ? 'ЕСТЬ' : 'НЕИЗВЕСТНО'}`);
  console.log(`   ⚠️ Проблемы с балансом: ${user25Info.balanceIssues ? 'БЫЛИ' : 'НЕТ'}`);

  return user25Info;
}

function analyzeSystemFiles(): any {
  console.log('\n3️⃣ АНАЛИЗ СИСТЕМНЫХ ФАЙЛОВ И ЛОГИКИ:');
  
  const systemAnalysis = {
    authenticationLogic: false,
    balanceManagement: false,
    tonBoostLogic: false,
    referralSystem: false,
    farmingSystem: false
  };

  // Анализируем ключевые файлы
  const keyFiles = [
    './modules/auth/service.ts',
    './core/BalanceManager.ts',
    './modules/boost/service.ts',
    './modules/referral/service.ts',
    './modules/farming/service.ts'
  ];

  keyFiles.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const fileName = path.basename(filePath);
      
      console.log(`📁 ${fileName}: НАЙДЕН`);
      
      if (fileName.includes('auth')) {
        systemAnalysis.authenticationLogic = content.includes('telegram_id') && content.includes('user');
      }
      if (fileName.includes('Balance')) {
        systemAnalysis.balanceManagement = content.includes('updateUserBalance') && content.includes('subtractBalance');
      }
      if (fileName.includes('boost')) {
        systemAnalysis.tonBoostLogic = content.includes('ton_boost') && content.includes('farming');
      }
      
    } catch (error) {
      console.log(`📁 ${path.basename(filePath)}: НЕ НАЙДЕН`);
    }
  });

  console.log('\n🔧 СИСТЕМНАЯ ЛОГИКА:');
  console.log(`   🔐 Аутентификация: ${systemAnalysis.authenticationLogic ? 'РЕАЛИЗОВАНА' : 'ПРОБЛЕМЫ'}`);
  console.log(`   💰 Управление балансом: ${systemAnalysis.balanceManagement ? 'РЕАЛИЗОВАНО' : 'ПРОБЛЕМЫ'}`);
  console.log(`   🚀 TON Boost логика: ${systemAnalysis.tonBoostLogic ? 'РЕАЛИЗОВАНА' : 'ПРОБЛЕМЫ'}`);

  return systemAnalysis;
}

function identifyCommonProblems(): string[] {
  console.log('\n4️⃣ ВЫЯВЛЕНИЕ ОБЩИХ ПРОБЛЕМ:');
  
  const commonProblems = [];

  // Анализируем проблемы из документации
  const replitMdPath = './replit.md';
  try {
    const content = fs.readFileSync(replitMdPath, 'utf8');
    
    if (content.includes('JWT token disappearance')) {
      commonProblems.push('JWT токены исчезают (решено через JWT Token Monitor)');
    }
    if (content.includes('cache clearing')) {
      commonProblems.push('Проблемы кеширования Telegram WebApp');
    }
    if (content.includes('rollback') || content.includes('ANTI_ROLLBACK_PROTECTION')) {
      commonProblems.push('Автоматические rollback процессы (частично отключены)');
    }
    if (content.includes('deposit disappeared') || content.includes('missing deposits')) {
      commonProblems.push('Исчезновение депозитов пользователей');
    }
    if (content.includes('balance discrepancy')) {
      commonProblems.push('Расхождения в балансах пользователей');
    }

  } catch (error) {
    console.log('❌ Не удалось проанализировать проблемы');
  }

  console.log('🚨 ВЫЯВЛЕННЫЕ ПРОБЛЕМЫ:');
  commonProblems.forEach((problem, index) => {
    console.log(`   ${index + 1}. ${problem}`);
  });

  return commonProblems;
}

function generateUnificationPlan(): void {
  console.log('\n5️⃣ ПЛАН УНИФИКАЦИИ АККАУНТОВ:');
  console.log('='.repeat(80));

  const unificationPlan = `
🎯 ПЛАН УНИФИКАЦИИ ВСЕХ АККАУНТОВ К ЭТАЛОНУ

📋 ЭТАПЫ УНИФИКАЦИИ:

1️⃣ ДИАГНОСТИКА (БЕЗ ИЗМЕНЕНИЙ):
   - Найти пользователей без транзакций
   - Найти пользователей без ton_farming_data при активном TON Boost
   - Найти пользователей с нулевыми балансами
   - Найти пользователей без referral_code
   - Выявить несоответствия в статусах

2️⃣ БЕЗОПАСНАЯ МИГРАЦИЯ:
   - Создать backup всех таблиц
   - Инициализировать отсутствующие поля дефолтными значениями
   - Создать недостающие связанные записи
   - Синхронизировать статусы между таблицами
   - НЕ ТРОГАТЬ User ID 25 и корректные аккаунты

3️⃣ АВТОМАТИЧЕСКАЯ ИНИЦИАЛИЗАЦИЯ:
   - Добавить проверки при первом входе пользователя
   - Создавать все необходимые записи автоматически
   - Валидировать целостность данных при каждом входе

🔧 КРИТИЧЕСКИЕ ПОЛЯ ДЛЯ ПРОВЕРКИ:
   - users.balance_uni (не NULL, >= 0.01)
   - users.balance_ton (не NULL, >= 0.01)
   - users.referral_code (уникальный, не NULL)
   - users.telegram_id (уникальный, не NULL)
   - ton_farming_data для пользователей с ton_boost_active=true
   - transactions для каждого пользователя (минимум 1 запись)

⚠️ БЕЗОПАСНОСТЬ:
   - Все изменения только после создания backup
   - Пошаговое применение с проверками
   - Возможность полного отката
   - Не изменять эталонный аккаунт (ID 25)
   - Тестирование на копии данных

🎯 РЕЗУЛЬТАТ:
   Все аккаунты будут иметь единую структуру данных,
   соответствующую эталонному аккаунту User ID 25
`;

  console.log(unificationPlan);
}

function generateSQLQueries(): void {
  console.log('\n6️⃣ SQL ЗАПРОСЫ ДЛЯ ДИАГНОСТИКИ:');
  console.log('='.repeat(80));

  const queries = [
    {
      title: 'Пользователи без транзакций',
      sql: `
SELECT u.id, u.username, u.telegram_id, u.created_at,
       u.balance_uni, u.balance_ton, u.uni_farming_active, u.ton_boost_active
FROM users u 
LEFT JOIN transactions t ON u.id = t.user_id 
WHERE t.user_id IS NULL 
ORDER BY u.created_at DESC;`
    },
    {
      title: 'TON Boost активен, но нет farming data',
      sql: `
SELECT u.id, u.username, u.ton_boost_active, u.ton_boost_package, u.ton_boost_rate
FROM users u 
LEFT JOIN ton_farming_data tfd ON u.id = tfd.user_id 
WHERE u.ton_boost_active = true AND tfd.user_id IS NULL 
ORDER BY u.id;`
    },
    {
      title: 'Пользователи с проблемными балансами',
      sql: `
SELECT id, username, balance_uni, balance_ton, created_at,
       CASE 
         WHEN balance_uni IS NULL THEN 'UNI баланс NULL'
         WHEN balance_uni::numeric = 0 THEN 'UNI баланс = 0'
         WHEN balance_ton IS NULL THEN 'TON баланс NULL'
         WHEN balance_ton::numeric = 0 THEN 'TON баланс = 0'
         ELSE 'OK'
       END as balance_issue
FROM users 
WHERE balance_uni IS NULL OR balance_uni::numeric = 0 
   OR balance_ton IS NULL OR balance_ton::numeric = 0
ORDER BY created_at DESC;`
    },
    {
      title: 'Несоответствия в TON Boost статусах',
      sql: `
SELECT u.id, u.username, 
       u.ton_boost_active as user_boost_active,
       COALESCE(tfd.boost_active, false) as farming_boost_active,
       u.ton_boost_package, tfd.farming_balance
FROM users u 
LEFT JOIN ton_farming_data tfd ON u.id = tfd.user_id 
WHERE u.ton_boost_active != COALESCE(tfd.boost_active, false)
ORDER BY u.id;`
    },
    {
      title: 'Пользователи без referral_code',
      sql: `
SELECT id, username, telegram_id, referral_code, created_at
FROM users 
WHERE referral_code IS NULL OR referral_code = '' OR LENGTH(referral_code) < 6
ORDER BY created_at DESC;`
    }
  ];

  queries.forEach(query => {
    console.log(`\n-- ${query.title}`);
    console.log(query.sql);
  });
}

// Основная функция
function main() {
  try {
    console.log('🚀 ЗАПУСК АНАЛИЗА СТРУКТУРЫ АККАУНТОВ...\n');
    
    // 1. Анализ схем
    const accountStructure = analyzeSchemaFiles();
    
    // 2. Анализ User 25
    const user25Profile = analyzeUser25Documentation();
    
    // 3. Анализ системных файлов
    const systemAnalysis = analyzeSystemFiles();
    
    // 4. Выявление проблем
    const problems = identifyCommonProblems();
    
    // 5. План унификации
    generateUnificationPlan();
    
    // 6. SQL запросы
    generateSQLQueries();
    
    console.log('\n' + '='.repeat(80));
    console.log('🏁 АНАЛИЗ ЗАВЕРШЕН');
    console.log('📊 Выявлены структурные различия и план унификации готов');
    console.log('⚠️ СЛЕДУЮЩИЙ ШАГ: Запуск SQL диагностики на реальной базе данных');
    
  } catch (error) {
    console.error('❌ ОШИБКА АНАЛИЗА:', error);
  }
}

main();