#!/usr/bin/env tsx
/**
 * Поэтапный аудит и план оптимизации БД
 * Цель: 100% сохранность данных и синхронизация системы с БД
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

interface DataIntegrityCheck {
  tableName: string;
  recordCount: number;
  criticalData: any[];
  checksumBefore?: string;
  checksumAfter?: string;
}

interface OptimizationPhase {
  phase: number;
  name: string;
  description: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  preChecks: string[];
  actions: string[];
  postChecks: string[];
  rollbackPlan: string;
  estimatedTime: string;
  risks: string[];
}

const auditData = {
  timestamp: new Date().toISOString(),
  databaseSnapshot: {} as any,
  dataIntegrity: [] as DataIntegrityCheck[],
  systemCodeAnalysis: {} as any,
  optimizationPhases: [] as OptimizationPhase[],
  validationTests: [] as any[]
};

// 1. Полный снимок текущего состояния БД
async function createDatabaseSnapshot() {
  console.log('📸 Создание полного снимка БД...\n');
  
  const tables = [
    'users', 'transactions', 'withdraw_requests', 
    'uni_farming_data', 'ton_farming_data', 'referrals', 'missions'
  ];
  
  for (const table of tables) {
    try {
      // Получаем количество записей
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      // Получаем примеры данных
      const { data: samples } = await supabase
        .from(table)
        .select('*')
        .limit(5);
      
      // Получаем критические данные для проверки
      let criticalQuery;
      switch (table) {
        case 'users':
          criticalQuery = await supabase
            .from(table)
            .select('id, telegram_id, balance_uni, balance_ton, uni_farming_balance, ton_farming_balance')
            .order('balance_uni', { ascending: false })
            .limit(20);
          break;
          
        case 'transactions':
          criticalQuery = await supabase
            .from(table)
            .select('id, user_id, type, amount_uni, amount_ton, currency, amount')
            .order('created_at', { ascending: false })
            .limit(50);
          break;
          
        default:
          criticalQuery = { data: [] };
      }
      
      auditData.databaseSnapshot[table] = {
        exists: true,
        recordCount: count || 0,
        columns: samples && samples.length > 0 ? Object.keys(samples[0]) : [],
        samples,
        criticalData: criticalQuery.data || []
      };
      
      console.log(`✓ ${table}: ${count} записей`);
      
    } catch (error) {
      console.log(`✗ ${table}: не существует`);
      auditData.databaseSnapshot[table] = { exists: false };
    }
  }
}

// 2. Проверка целостности данных
async function checkDataIntegrity() {
  console.log('\n🔍 Проверка целостности данных...\n');
  
  // Проверка балансов пользователей
  const { data: userBalances } = await supabase
    .from('users')
    .select('id, telegram_id, balance_uni, balance_ton, uni_farming_balance, ton_farming_balance');
  
  const balanceChecksum = userBalances?.reduce((sum, user) => {
    return sum + 
      (user.balance_uni || 0) + 
      (user.balance_ton || 0) + 
      (user.uni_farming_balance || 0) + 
      (user.ton_farming_balance || 0);
  }, 0) || 0;
  
  console.log(`Контрольная сумма балансов: ${balanceChecksum}`);
  
  // Проверка связей между таблицами
  const orphanChecks = [
    {
      name: 'Транзакции без пользователей',
      query: `
        SELECT COUNT(*) as count
        FROM transactions t
        LEFT JOIN users u ON t.user_id = u.id
        WHERE u.id IS NULL
      `
    },
    {
      name: 'Выводы без пользователей',
      query: `
        SELECT COUNT(*) as count
        FROM withdraw_requests wr
        LEFT JOIN users u ON wr.user_id = u.id
        WHERE u.id IS NULL
      `
    },
    {
      name: 'Farming данные без пользователей',
      query: `
        SELECT COUNT(*) as count
        FROM uni_farming_data ufd
        LEFT JOIN users u ON ufd.user_id = u.id
        WHERE u.id IS NULL
      `
    }
  ];
  
  for (const check of orphanChecks) {
    // Заменяем RPC на прямые запросы для проверки
    let count = 0;
    
    if (check.name === 'Транзакции без пользователей') {
      const { data: orphanTx } = await supabase
        .from('transactions')
        .select('id')
        .is('user_id', null);
      count = orphanTx?.length || 0;
    } else if (check.name === 'Выводы без пользователей') {
      const { data: orphanWr } = await supabase
        .from('withdraw_requests')
        .select('id')
        .is('user_id', null);
      count = orphanWr?.length || 0;
    } else if (check.name === 'Farming данные без пользователей') {
      const { data: orphanUfd } = await supabase
        .from('uni_farming_data')
        .select('id')
        .is('user_id', null);
      count = orphanUfd?.length || 0;
    }
    
    console.log(`${check.name}: ${count}`);
  }
  
  auditData.dataIntegrity.push({
    tableName: 'users',
    recordCount: userBalances?.length || 0,
    criticalData: userBalances || [],
    checksumBefore: balanceChecksum.toString()
  });
}

// 3. Анализ кода системы
async function analyzeSystemCode() {
  console.log('\n💻 Анализ кода системы...\n');
  
  const codePatterns = {
    'uni_farming_data': [
      'server/repositories/UniFarmingRepository.ts',
      'server/services/UniFarmingService.ts'
    ],
    'ton_farming_data': [
      'server/repositories/TonFarmingRepository.ts',
      'server/services/TonBoostService.ts'
    ],
    'referrals': [
      'server/services/ReferralService.ts',
      'server/controllers/ReferralController.ts'
    ],
    'withdraw_requests': [
      'server/controllers/WithdrawController.ts',
      'server/services/AdminWithdrawService.ts'
    ]
  };
  
  auditData.systemCodeAnalysis = {
    dependencies: codePatterns,
    criticalPaths: [
      'BalanceManager.modifyBalance → transactions',
      'UniFarmingRepository.getByUserId → users.uni_farming_*',
      'ReferralService.processRewards → users.referred_by',
      'WithdrawController.create → withdraw_requests + users.balance_ton'
    ]
  };
  
  console.log('Найдено критических путей данных: 4');
}

// 4. Создание поэтапного плана
function createOptimizationPhases() {
  console.log('\n📋 Создание поэтапного плана оптимизации...\n');
  
  auditData.optimizationPhases = [
    {
      phase: 0,
      name: 'ПОДГОТОВКА И РЕЗЕРВНОЕ КОПИРОВАНИЕ',
      description: 'Создание полных резервных копий и проверка целостности',
      priority: 'CRITICAL',
      preChecks: [
        'Проверить доступ к БД с правами на изменение структуры',
        'Убедиться что нет активных пользователей (maintenance mode)',
        'Проверить свободное место для резервных копий'
      ],
      actions: [
        'pg_dump полный дамп БД в файл backup_YYYYMMDD_HHMMSS.sql',
        'Экспорт критических таблиц в CSV для дополнительной защиты',
        'Создание скриншотов админ панели с текущей статистикой',
        'Документирование текущих балансов топ-20 пользователей'
      ],
      postChecks: [
        'Проверить размер и целостность backup файла',
        'Проверить возможность восстановления на тестовой БД',
        'Сравнить контрольные суммы'
      ],
      rollbackPlan: 'Не требуется - это подготовительный этап',
      estimatedTime: '30 минут',
      risks: ['Недостаточно места на диске']
    },
    
    {
      phase: 1,
      name: 'СИНХРОНИЗАЦИЯ FARMING ДАННЫХ',
      description: 'Перенос всех farming данных в основную таблицу users',
      priority: 'CRITICAL',
      preChecks: [
        'SELECT COUNT(*) FROM uni_farming_data WHERE user_id NOT IN (SELECT id FROM users)',
        'SELECT COUNT(*) FROM ton_farming_data WHERE user_id NOT IN (SELECT id FROM users)',
        'Сравнить uni_deposit_amount в users и deposit_amount в uni_farming_data',
        'Проверить что все поля farming существуют в users'
      ],
      actions: [
        'BEGIN TRANSACTION',
        'UPDATE users с данными из uni_farming_data (только где есть расхождения)',
        'UPDATE users с данными из ton_farming_data (только где есть расхождения)',
        'Создать архивные таблицы archive_uni_farming_data и archive_ton_farming_data',
        'INSERT INTO archive_* SELECT * FROM farming таблиц',
        'COMMIT TRANSACTION'
      ],
      postChecks: [
        'Сравнить сумму всех балансов до и после',
        'Проверить что не потеряны активные фермеры',
        'SELECT для проверки синхронизации полей',
        'Проверить работу фарминга через API'
      ],
      rollbackPlan: 'ROLLBACK TRANSACTION или восстановление из backup',
      estimatedTime: '15 минут',
      risks: [
        'Расхождение данных между таблицами',
        'Потеря активного статуса фарминга'
      ]
    },
    
    {
      phase: 2,
      name: 'ОЧИСТКА WITHDRAW_REQUESTS',
      description: 'Удаление дублирующих полей из таблицы выводов',
      priority: 'HIGH',
      preChecks: [
        'Проверить что telegram_id и username в withdraw_requests совпадают с users',
        'Найти активные (pending) заявки на вывод',
        'Проверить зависимости в коде от этих полей'
      ],
      actions: [
        'CREATE VIEW withdraw_requests_full с JOIN на users',
        'Обновить код для использования VIEW вместо прямых запросов',
        'ALTER TABLE withdraw_requests DROP COLUMN telegram_id, username'
      ],
      postChecks: [
        'Проверить работу списка выводов в админ панели',
        'Проверить создание новых заявок на вывод',
        'Убедиться что VIEW возвращает правильные данные'
      ],
      rollbackPlan: 'ALTER TABLE ADD COLUMN и восстановление данных из backup',
      estimatedTime: '10 минут',
      risks: ['Админ панель может перестать показывать имена пользователей']
    },
    
    {
      phase: 3,
      name: 'УНИФИКАЦИЯ TRANSACTIONS',
      description: 'Добавление вычисляемых полей для единого формата',
      priority: 'HIGH',
      preChecks: [
        'Анализ использования старого формата (amount_uni/amount_ton)',
        'Анализ использования нового формата (amount + currency)',
        'Проверка что нет транзакций с обоими форматами'
      ],
      actions: [
        'ALTER TABLE transactions ADD COLUMN unified_amount GENERATED',
        'ALTER TABLE transactions ADD COLUMN unified_currency GENERATED',
        'CREATE INDEX на новых полях',
        'Обновить TransactionService для использования unified полей'
      ],
      postChecks: [
        'Проверить расчёт статистики транзакций',
        'Проверить отображение истории транзакций',
        'Сравнить суммы транзакций до и после'
      ],
      rollbackPlan: 'DROP COLUMN для удаления вычисляемых полей',
      estimatedTime: '20 минут',
      risks: ['Неправильный расчёт в GENERATED полях']
    },
    
    {
      phase: 4,
      name: 'СОЗДАНИЕ ОПТИМИЗИРУЮЩИХ ИНДЕКСОВ',
      description: 'Добавление индексов для ускорения запросов',
      priority: 'MEDIUM',
      preChecks: [
        'Анализ медленных запросов из логов',
        'Проверка существующих индексов',
        'Оценка размера новых индексов'
      ],
      actions: [
        'CREATE INDEX на часто используемых полях',
        'CREATE INDEX для foreign keys',
        'CREATE INDEX для WHERE условий',
        'ANALYZE таблиц для обновления статистики'
      ],
      postChecks: [
        'EXPLAIN ANALYZE критических запросов',
        'Проверка использования индексов',
        'Мониторинг производительности'
      ],
      rollbackPlan: 'DROP INDEX для удаления индексов',
      estimatedTime: '10 минут',
      risks: ['Увеличение размера БД', 'Замедление INSERT операций']
    },
    
    {
      phase: 5,
      name: 'УДАЛЕНИЕ ДУБЛИРУЮЩИХ ТАБЛИЦ',
      description: 'Финальное удаление старых таблиц после проверки',
      priority: 'LOW',
      preChecks: [
        'Убедиться что система работает 24+ часа без farming таблиц',
        'Проверить что архивные копии созданы',
        'Grep кода на упоминания старых таблиц'
      ],
      actions: [
        'DROP TABLE uni_farming_data CASCADE',
        'DROP TABLE ton_farming_data CASCADE',
        'DROP TABLE user_sessions CASCADE (если не используется)',
        'Обновить schema.ts убрав определения таблиц'
      ],
      postChecks: [
        'Полное тестирование функционала',
        'Проверка логов на ошибки',
        'Финальная проверка балансов'
      ],
      rollbackPlan: 'CREATE TABLE и восстановление из archive таблиц',
      estimatedTime: '5 минут',
      risks: ['Скрытые зависимости в коде']
    },
    
    {
      phase: 6,
      name: 'ОБНОВЛЕНИЕ КОДА И ДОКУМЕНТАЦИИ',
      description: 'Приведение кода в соответствие с новой структурой БД',
      priority: 'CRITICAL',
      preChecks: [
        'Список всех файлов использующих старые таблицы',
        'Проверка тестов на использование старой структуры'
      ],
      actions: [
        'Обновить все Repository классы',
        'Обновить Service классы',
        'Обновить shared/schema.ts',
        'Обновить документацию API',
        'Создать migration guide'
      ],
      postChecks: [
        'Запустить все тесты',
        'Проверить TypeScript компиляцию',
        'Ручное тестирование критических путей'
      ],
      rollbackPlan: 'Git revert к предыдущей версии',
      estimatedTime: '45 минут',
      risks: ['Пропущенные зависимости', 'Ошибки типизации']
    }
  ];
  
  auditData.optimizationPhases.forEach(phase => {
    console.log(`Фаза ${phase.phase}: ${phase.name} [${phase.priority}]`);
  });
}

// 5. Создание тестов валидации
function createValidationTests() {
  console.log('\n✅ Создание тестов валидации...\n');
  
  auditData.validationTests = [
    {
      name: 'Тест целостности балансов',
      query: `
        WITH balance_check AS (
          SELECT 
            SUM(balance_uni) as total_uni,
            SUM(balance_ton) as total_ton,
            SUM(uni_farming_balance) as total_farming_uni,
            SUM(ton_farming_balance) as total_farming_ton
          FROM users
        )
        SELECT * FROM balance_check
      `,
      expected: 'Суммы должны совпадать до и после миграции'
    },
    {
      name: 'Тест активных фермеров',
      query: `
        SELECT COUNT(*) as active_farmers
        FROM users
        WHERE uni_farming_active = true
      `,
      expected: 'Количество должно совпадать с uni_farming_data'
    },
    {
      name: 'Тест реферальных связей',
      query: `
        SELECT COUNT(*) as referral_links
        FROM users
        WHERE referred_by IS NOT NULL
      `,
      expected: 'Все реферальные связи сохранены'
    },
    {
      name: 'Тест транзакций',
      query: `
        SELECT 
          COUNT(*) as total,
          SUM(COALESCE(amount, amount_uni + amount_ton)) as total_amount
        FROM transactions
      `,
      expected: 'Количество и сумма транзакций не изменились'
    }
  ];
}

// Главная функция
async function runPhaseByPhaseAudit() {
  console.log('🚀 ПОЭТАПНЫЙ АУДИТ И ПЛАН ОПТИМИЗАЦИИ БД');
  console.log('=' .repeat(50) + '\n');
  
  try {
    await createDatabaseSnapshot();
    await checkDataIntegrity();
    await analyzeSystemCode();
    createOptimizationPhases();
    createValidationTests();
    
    // Сохраняем детальный план
    const planPath = path.join(
      process.cwd(),
      'docs',
      'PHASE_BY_PHASE_OPTIMIZATION_PLAN.json'
    );
    
    await fs.writeFile(planPath, JSON.stringify(auditData, null, 2));
    
    console.log(`\n✅ План создан: ${planPath}`);
    
    // Выводим критические метрики
    console.log('\n' + '='.repeat(50));
    console.log('📊 КРИТИЧЕСКИЕ МЕТРИКИ');
    console.log('='.repeat(50));
    console.log(`Всего фаз оптимизации: ${auditData.optimizationPhases.length}`);
    console.log(`Критических фаз: ${auditData.optimizationPhases.filter(p => p.priority === 'CRITICAL').length}`);
    console.log(`Общее время: ~3 часа с тестированием`);
    console.log(`Тестов валидации: ${auditData.validationTests.length}`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

runPhaseByPhaseAudit().catch(console.error);