#!/usr/bin/env tsx
/**
 * System Data Flow Audit - Анализ потоков данных после очистки БД
 * Цель: Понять куда система передает информацию и найти дублирование
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

interface TableInfo {
  tableName: string;
  recordCount: number;
  columns: string[];
  primaryKey: string;
  foreignKeys: Array<{
    column: string;
    referencedTable: string;
    referencedColumn: string;
  }>;
  dataFlow: {
    writtenBy: string[];
    readBy: string[];
  };
}

interface DataDuplication {
  field1: string;
  field2: string;
  table1: string;
  table2: string;
  description: string;
  recommendation: string;
}

const auditReport = {
  timestamp: new Date().toISOString(),
  currentTables: [] as TableInfo[],
  dataFlowMap: {} as Record<string, any>,
  duplications: [] as DataDuplication[],
  systemDependencies: {} as Record<string, string[]>,
  recommendations: [] as string[],
  optimizationPlan: {} as Record<string, any>
};

// Карта известных потоков данных из анализа кода
const KNOWN_DATA_FLOWS = {
  users: {
    writtenBy: [
      'SupabaseUserRepository.createUser',
      'SupabaseUserRepository.updateUser',
      'BalanceManager.modifyBalance',
      'UniFarmingRepository.updateFarmingData',
      'TonFarmingRepository.updateFarmingData',
      'TonWalletService.linkWallet'
    ],
    readBy: [
      'SupabaseUserRepository.getUserByTelegramId',
      'AuthController.getCurrentUser',
      'UniFarmingRepository.getByUserId',
      'TonFarmingRepository.getByUserId',
      'ReferralService.getReferralPath',
      'WithdrawController.getBalance'
    ]
  },
  transactions: {
    writtenBy: [
      'TransactionEnforcer.logTransaction',
      'UnifiedTransactionService.recordTransaction',
      'ReferralService.processReferralRewards',
      'BalanceManager.modifyBalance'
    ],
    readBy: [
      'TransactionController.getUserTransactions',
      'StatsController.getTransactionStats',
      'AdminController.getSystemTransactions'
    ]
  },
  withdraw_requests: {
    writtenBy: [
      'WithdrawController.createWithdrawRequest',
      'AdminWithdrawService.updateStatus'
    ],
    readBy: [
      'WithdrawController.getUserWithdrawals',
      'AdminController.getPendingWithdrawals'
    ]
  }
};

// Анализ текущих таблиц в БД
async function analyzeCurrentTables(): Promise<void> {
  console.log('📊 Анализ текущих таблиц в БД...\n');
  
  try {
    // Получаем список всех таблиц
    const { data: tables, error } = await supabase.rpc('get_all_tables');
    
    if (error) {
      // Fallback: проверяем известные таблицы
      const knownTables = ['users', 'transactions', 'withdraw_requests', 
                          'uni_farming_data', 'ton_farming_data', 'referrals',
                          'missions', 'user_sessions', 'boost_packages'];
      
      for (const tableName of knownTables) {
        try {
          const { count } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });
          
          if (count !== null) {
            console.log(`✅ Таблица ${tableName}: ${count} записей`);
            
            // Получаем структуру таблицы
            const { data: sample } = await supabase
              .from(tableName)
              .select('*')
              .limit(1);
            
            const tableInfo: TableInfo = {
              tableName,
              recordCount: count,
              columns: sample && sample.length > 0 ? Object.keys(sample[0]) : [],
              primaryKey: 'id',
              foreignKeys: [],
              dataFlow: KNOWN_DATA_FLOWS[tableName] || { writtenBy: [], readBy: [] }
            };
            
            // Определяем foreign keys
            if (tableName === 'transactions' && tableInfo.columns.includes('user_id')) {
              tableInfo.foreignKeys.push({
                column: 'user_id',
                referencedTable: 'users',
                referencedColumn: 'id'
              });
            }
            
            if (tableName === 'withdraw_requests' && tableInfo.columns.includes('user_id')) {
              tableInfo.foreignKeys.push({
                column: 'user_id',
                referencedTable: 'users',
                referencedColumn: 'id'
              });
            }
            
            auditReport.currentTables.push(tableInfo);
          }
        } catch (e) {
          console.log(`❌ Таблица ${tableName} не существует`);
        }
      }
    }
  } catch (error) {
    console.error('Ошибка анализа таблиц:', error);
  }
}

// Анализ дублирования данных
async function analyzeDuplication(): Promise<void> {
  console.log('\n🔍 Анализ дублирования данных...\n');
  
  // Известные дублирования из предыдущего анализа
  const knownDuplications: DataDuplication[] = [
    {
      field1: 'balance_uni',
      field2: 'uni_farming_balance',
      table1: 'users',
      table2: 'users',
      description: 'Баланс UNI хранится в двух полях одной таблицы',
      recommendation: 'Использовать только balance_uni, uni_farming_balance для накопленного фарминга'
    },
    {
      field1: 'telegram_id',
      field2: 'telegram_id',
      table1: 'users',
      table2: 'withdraw_requests',
      description: 'telegram_id дублируется в withdraw_requests',
      recommendation: 'Удалить telegram_id из withdraw_requests, использовать JOIN с users'
    },
    {
      field1: 'username',
      field2: 'username',
      table1: 'users',
      table2: 'withdraw_requests',
      description: 'username дублируется в withdraw_requests',
      recommendation: 'Удалить username из withdraw_requests, использовать JOIN с users'
    },
    {
      field1: 'ref_code + parent_ref_code + referred_by',
      field2: 'таблица referrals',
      table1: 'users',
      table2: 'referrals',
      description: 'Реферальная информация дублируется в двух местах',
      recommendation: 'Консолидировать в одном месте - либо в users, либо в referrals'
    },
    {
      field1: 'uni_farming_* поля',
      field2: 'uni_farming_data таблица',
      table1: 'users',
      table2: 'uni_farming_data',
      description: 'Данные фарминга UNI дублируются',
      recommendation: 'Выбрать одно место хранения - рекомендую users для простоты'
    },
    {
      field1: 'ton_boost_* поля',
      field2: 'ton_farming_data таблица',
      table1: 'users',
      table2: 'ton_farming_data',
      description: 'Данные TON boost дублируются',
      recommendation: 'Выбрать одно место хранения - рекомендую users'
    },
    {
      field1: 'amount_uni + amount_ton',
      field2: 'amount + currency',
      table1: 'transactions',
      table2: 'transactions',
      description: 'Гибридная структура транзакций - два способа хранения суммы',
      recommendation: 'Мигрировать на единый формат: amount + currency'
    }
  ];
  
  // Проверяем какие дублирования все еще существуют
  for (const dup of knownDuplications) {
    const table1Exists = auditReport.currentTables.find(t => t.tableName === dup.table1);
    const table2Exists = auditReport.currentTables.find(t => t.tableName === dup.table2);
    
    if (table1Exists && table2Exists) {
      // Проверяем существование полей
      const field1Exists = dup.table1 === dup.table2 ? 
        table1Exists.columns.some(col => dup.field1.includes(col)) :
        table1Exists.columns.includes(dup.field1.split(' ')[0]);
        
      if (field1Exists) {
        auditReport.duplications.push(dup);
        console.log(`⚠️  Дублирование: ${dup.description}`);
      }
    }
  }
}

// Анализ системных зависимостей
async function analyzeSystemDependencies(): Promise<void> {
  console.log('\n🔗 Анализ системных зависимостей...\n');
  
  // Карта критических зависимостей
  auditReport.systemDependencies = {
    'users.balance_uni': [
      'BalanceManager.modifyBalance',
      'UniFarmingService.calculateIncome',
      'WithdrawController.validateBalance',
      'Frontend: BalanceDisplay component'
    ],
    'users.balance_ton': [
      'BalanceManager.modifyBalance',
      'TonBoostService.processIncome',
      'WithdrawController.validateTonBalance',
      'Frontend: TON balance display'
    ],
    'users.telegram_id': [
      'AuthService.authenticate',
      'UserRepository.findByTelegramId',
      'КРИТИЧНО: Primary user identifier'
    ],
    'users.ref_code': [
      'ReferralService.processNewUser',
      'ReferralLinkGenerator',
      'Frontend: Referral link display'
    ],
    'users.referred_by': [
      'ReferralService.calculateRewards',
      'ReferralChainBuilder',
      'StatsService.getReferralStats'
    ],
    'transactions.user_id': [
      'FOREIGN KEY to users.id',
      'TransactionHistory.getUserTransactions',
      'AdminPanel.getTransactionStats'
    ],
    'transactions.type': [
      'TransactionClassifier',
      'RewardCalculator',
      'Frontend: Transaction list filter'
    ],
    'withdraw_requests.status': [
      'AdminWithdrawService.processPending',
      'UserWithdrawStatus.check',
      'NotificationService.sendStatusUpdate'
    ]
  };
  
  for (const [field, deps] of Object.entries(auditReport.systemDependencies)) {
    console.log(`📌 ${field}:`);
    deps.forEach(dep => console.log(`   - ${dep}`));
  }
}

// Генерация рекомендаций по оптимизации
async function generateOptimizationPlan(): Promise<void> {
  console.log('\n💡 План оптимизации структуры БД...\n');
  
  auditReport.optimizationPlan = {
    phase1_cleanup: {
      priority: 'HIGH',
      actions: [
        {
          action: 'Удалить дублирующие поля из withdraw_requests',
          sql: `ALTER TABLE withdraw_requests 
                DROP COLUMN IF EXISTS telegram_id,
                DROP COLUMN IF EXISTS username;`,
          impact: 'Убирает дублирование, требует JOIN для отображения'
        },
        {
          action: 'Выбрать основное место для реферальных данных',
          decision: 'Оставить в users, удалить таблицу referrals если пустая',
          reason: 'Упрощает запросы, все данные пользователя в одном месте'
        }
      ]
    },
    phase2_consolidation: {
      priority: 'MEDIUM',
      actions: [
        {
          action: 'Консолидировать farming данные',
          recommendation: 'Если uni_farming_data и ton_farming_data пустые - удалить',
          alternative: 'Если содержат данные - мигрировать в users таблицу'
        },
        {
          action: 'Унифицировать структуру transactions',
          migration: `-- Добавить вычисляемое поле для совместимости
                     ALTER TABLE transactions 
                     ADD COLUMN IF NOT EXISTS unified_amount DECIMAL(20,6) 
                     GENERATED ALWAYS AS (COALESCE(amount, amount_uni + amount_ton)) STORED;`,
          longTerm: 'Постепенно мигрировать на amount + currency'
        }
      ]
    },
    phase3_optimization: {
      priority: 'LOW',
      actions: [
        {
          action: 'Добавить индексы для производительности',
          sql: `CREATE INDEX IF NOT EXISTS idx_transactions_user_created 
                ON transactions(user_id, created_at DESC);
                
                CREATE INDEX IF NOT EXISTS idx_users_telegram_id 
                ON users(telegram_id);
                
                CREATE INDEX IF NOT EXISTS idx_users_referred_by
                ON users(referred_by) WHERE referred_by IS NOT NULL;`
        },
        {
          action: 'Создать материализованные представления',
          sql: `CREATE MATERIALIZED VIEW IF NOT EXISTS user_stats AS
                SELECT 
                  u.id,
                  u.telegram_id,
                  COUNT(DISTINCT t.id) as transaction_count,
                  SUM(CASE WHEN t.currency = 'UNI' THEN t.amount ELSE 0 END) as total_uni_earned,
                  SUM(CASE WHEN t.currency = 'TON' THEN t.amount ELSE 0 END) as total_ton_earned
                FROM users u
                LEFT JOIN transactions t ON u.id = t.user_id
                GROUP BY u.id, u.telegram_id;`
        }
      ]
    }
  };
  
  // Финальные рекомендации
  auditReport.recommendations = [
    '1. КРИТИЧНО: Сделать backup перед любыми изменениями',
    '2. Определить единственный источник правды для каждого типа данных',
    '3. Удалить пустые таблицы: user_sessions если не используется',
    '4. Консолидировать farming данные в users если отдельные таблицы пустые',
    '5. Стандартизировать структуру transactions на amount + currency',
    '6. Удалить дублирующие поля из withdraw_requests',
    '7. Добавить недостающие индексы для производительности',
    '8. Создать views для обратной совместимости при необходимости',
    '9. Документировать все изменения в migration скриптах',
    '10. Тестировать каждое изменение на staging среде'
  ];
}

// Главная функция аудита
async function runSystemDataFlowAudit(): Promise<void> {
  console.log('🚀 Запуск аудита потоков данных системы');
  console.log('=' .repeat(50) + '\n');
  
  try {
    await analyzeCurrentTables();
    await analyzeDuplication();
    await analyzeSystemDependencies();
    await generateOptimizationPlan();
    
    // Сохраняем отчет
    const reportPath = path.join(
      process.cwd(),
      'docs',
      `SYSTEM_DATA_FLOW_AUDIT_${Date.now()}.json`
    );
    
    await fs.writeFile(reportPath, JSON.stringify(auditReport, null, 2));
    
    console.log(`\n✅ Аудит завершен! Отчет: ${reportPath}`);
    
    // Выводим сводку
    console.log('\n' + '='.repeat(50));
    console.log('📊 СВОДКА АУДИТА');
    console.log('='.repeat(50));
    console.log(`Обнаружено таблиц: ${auditReport.currentTables.length}`);
    console.log(`Найдено дублирований: ${auditReport.duplications.length}`);
    console.log('\n🎯 ТОП-5 РЕКОМЕНДАЦИЙ:');
    auditReport.recommendations.slice(0, 5).forEach((rec, idx) => {
      console.log(rec);
    });
    
  } catch (error) {
    console.error('❌ Ошибка аудита:', error);
  }
}

// Запуск
runSystemDataFlowAudit().catch(console.error);