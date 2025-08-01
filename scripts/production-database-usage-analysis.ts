#!/usr/bin/env tsx
/**
 * Production Database Usage Analysis
 * КРИТИЧНО: Только чтение, никаких изменений в БД!
 * 
 * Цель: Определить какие поля и таблицы реально используются в продакшене
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

interface FieldUsage {
  tableName: string;
  fieldName: string;
  nonNullCount: number;
  uniqueValuesCount: number;
  sampleValues: any[];
  dataType: string;
  isActive: boolean;
}

interface TableAnalysis {
  tableName: string;
  totalRecords: number;
  activeFields: FieldUsage[];
  inactiveFields: FieldUsage[];
  criticalRelations: string[];
}

const analysisResults: {
  timestamp: string;
  environment: string;
  tables: TableAnalysis[];
  criticalFindings: string[];
  safetyRecommendations: string[];
} = {
  timestamp: new Date().toISOString(),
  environment: 'production',
  tables: [],
  criticalFindings: [],
  safetyRecommendations: []
};

// Критические таблицы, которые точно используются
const CRITICAL_TABLES = [
  'users',
  'transactions', 
  'withdraw_requests'
];

// Поля, которые точно используются (из анализа кода)
const KNOWN_USED_FIELDS = {
  users: [
    'id', 'telegram_id', 'username', 'first_name', 'last_name',
    'ref_code', 'parent_ref_code', 'referred_by',
    'balance_uni', 'balance_ton',
    'uni_farming_active', 'uni_deposit_amount', 'uni_farming_start_timestamp',
    'uni_farming_rate', 'uni_farming_balance', 'uni_farming_last_update',
    'ton_boost_active', 'ton_boost_package_id', 'ton_boost_rate',
    'created_at', 'updated_at'
  ],
  transactions: [
    'id', 'user_id', 'type', 'amount', 'amount_uni', 'amount_ton',
    'currency', 'status', 'description', 'created_at'
  ],
  withdraw_requests: [
    'id', 'user_id', 'telegram_id', 'username', 'amount_ton',
    'ton_wallet', 'status', 'created_at', 'processed_at'
  ]
};

async function analyzeTableUsage(tableName: string): Promise<TableAnalysis | null> {
  console.log(`\n📊 Анализ таблицы: ${tableName}`);
  
  try {
    // Получаем количество записей
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.log(`⚠️ Таблица ${tableName} недоступна или не существует`);
      return null;
    }
    
    console.log(`✅ Записей в таблице: ${count}`);
    
    if (count === 0) {
      analysisResults.criticalFindings.push(
        `Таблица ${tableName} пустая - возможно не используется`
      );
      return {
        tableName,
        totalRecords: 0,
        activeFields: [],
        inactiveFields: [],
        criticalRelations: []
      };
    }
    
    // Получаем образец данных для анализа полей
    const { data: sampleData, error: sampleError } = await supabase
      .from(tableName)
      .select('*')
      .limit(100);
    
    if (sampleError || !sampleData || sampleData.length === 0) {
      return null;
    }
    
    // Анализируем использование полей
    const fieldUsage: FieldUsage[] = [];
    const firstRow = sampleData[0];
    const knownFields = KNOWN_USED_FIELDS[tableName as keyof typeof KNOWN_USED_FIELDS] || [];
    
    for (const fieldName of Object.keys(firstRow)) {
      const values = sampleData.map(row => row[fieldName]);
      const nonNullValues = values.filter(v => v !== null && v !== '' && v !== undefined);
      const uniqueValues = [...new Set(nonNullValues.map(v => JSON.stringify(v)))];
      
      fieldUsage.push({
        tableName,
        fieldName,
        nonNullCount: nonNullValues.length,
        uniqueValuesCount: uniqueValues.length,
        sampleValues: uniqueValues.slice(0, 3).map(v => JSON.parse(v)),
        dataType: typeof firstRow[fieldName],
        isActive: knownFields.includes(fieldName) || nonNullValues.length > 0
      });
    }
    
    // Разделяем на активные и неактивные поля
    const activeFields = fieldUsage.filter(f => f.isActive);
    const inactiveFields = fieldUsage.filter(f => !f.isActive);
    
    // Определяем критические связи
    const criticalRelations: string[] = [];
    
    if (tableName === 'transactions') {
      criticalRelations.push('user_id -> users.id (FOREIGN KEY)');
    }
    
    if (tableName === 'withdraw_requests') {
      criticalRelations.push('user_id -> users.id');
    }
    
    if (tableName === 'users' && activeFields.find(f => f.fieldName === 'referred_by')) {
      criticalRelations.push('referred_by -> users.id (SELF REFERENCE)');
    }
    
    return {
      tableName,
      totalRecords: count || 0,
      activeFields,
      inactiveFields,
      criticalRelations
    };
    
  } catch (error) {
    console.error(`❌ Ошибка анализа таблицы ${tableName}:`, error);
    return null;
  }
}

async function analyzeUserBalances() {
  console.log('\n💰 Анализ балансов пользователей...');
  
  try {
    // Проверяем пользователей с балансами
    const { data: usersWithUni, error: uniError } = await supabase
      .from('users')
      .select('id, balance_uni')
      .gt('balance_uni', 0)
      .limit(10);
    
    const { data: usersWithTon, error: tonError } = await supabase
      .from('users')
      .select('id, balance_ton')
      .gt('balance_ton', 0)
      .limit(10);
    
    if (!uniError && usersWithUni && usersWithUni.length > 0) {
      analysisResults.criticalFindings.push(
        `✅ Найдено ${usersWithUni.length}+ пользователей с UNI балансом > 0`
      );
    }
    
    if (!tonError && usersWithTon && usersWithTon.length > 0) {
      analysisResults.criticalFindings.push(
        `✅ Найдено ${usersWithTon.length}+ пользователей с TON балансом > 0`
      );
    }
    
    // Проверяем активных фармеров
    const { count: activeFarmers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('uni_farming_active', true);
    
    if (activeFarmers && activeFarmers > 0) {
      analysisResults.criticalFindings.push(
        `🌾 ${activeFarmers} активных фармеров UNI`
      );
    }
    
  } catch (error) {
    console.error('❌ Ошибка анализа балансов:', error);
  }
}

async function analyzeReferralSystem() {
  console.log('\n👥 Анализ реферальной системы...');
  
  try {
    // Проверяем реферальные связи
    const { count: usersWithReferrers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .not('referred_by', 'is', null);
    
    const { count: usersWithParentCode } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .not('parent_ref_code', 'is', null);
    
    if (usersWithReferrers && usersWithReferrers > 0) {
      analysisResults.criticalFindings.push(
        `👥 ${usersWithReferrers} пользователей имеют реферера (referred_by)`
      );
    }
    
    if (usersWithParentCode && usersWithParentCode > 0) {
      analysisResults.criticalFindings.push(
        `📎 ${usersWithParentCode} пользователей имеют parent_ref_code`
      );
    }
    
    // Проверяем таблицу referrals
    const { count: referralsCount } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true });
    
    if (referralsCount === 0) {
      analysisResults.criticalFindings.push(
        `⚠️ Таблица referrals пустая - реферальная система работает через users`
      );
    }
    
  } catch (error) {
    console.error('❌ Ошибка анализа рефералов:', error);
  }
}

async function generateSafetyRecommendations() {
  console.log('\n🛡️ Генерация рекомендаций по безопасности...');
  
  analysisResults.safetyRecommendations = [
    '1. КРИТИЧНО: Создать полный backup перед любыми изменениями',
    '2. НЕ УДАЛЯТЬ поля balance_uni, balance_ton из таблицы users',
    '3. НЕ ИЗМЕНЯТЬ типы данных существующих полей',
    '4. НЕ УДАЛЯТЬ таблицу transactions - содержит историю операций',
    '5. НЕ НАРУШАТЬ foreign key связи user_id',
    '6. СОХРАНИТЬ все реферальные связи (referred_by, parent_ref_code)',
    '7. Использовать ALTER TABLE ADD COLUMN для новых полей',
    '8. Создавать новые таблицы с суффиксом _v2 для миграции',
    '9. Тестировать все изменения на копии БД',
    '10. Мониторить логи после любых изменений'
  ];
}

async function runProductionAnalysis() {
  console.log('🚀 Запуск анализа использования Production БД');
  console.log('⚠️  ВАЖНО: Только чтение, никаких изменений!');
  console.log('================================================\n');
  
  try {
    // Анализируем критические таблицы
    for (const tableName of CRITICAL_TABLES) {
      const analysis = await analyzeTableUsage(tableName);
      if (analysis) {
        analysisResults.tables.push(analysis);
      }
    }
    
    // Проверяем другие потенциально используемые таблицы
    const otherTables = [
      'uni_farming_data',
      'ton_farming_data',
      'referrals',
      'missions',
      'user_sessions'
    ];
    
    for (const tableName of otherTables) {
      const analysis = await analyzeTableUsage(tableName);
      if (analysis) {
        analysisResults.tables.push(analysis);
      }
    }
    
    // Специальные проверки
    await analyzeUserBalances();
    await analyzeReferralSystem();
    
    // Генерируем рекомендации
    await generateSafetyRecommendations();
    
    // Сохраняем отчёт
    const reportPath = path.join(
      process.cwd(), 
      'docs', 
      `production_usage_analysis_${Date.now()}.json`
    );
    
    await fs.writeFile(reportPath, JSON.stringify(analysisResults, null, 2));
    
    console.log(`\n✅ Анализ завершён! Отчёт: ${reportPath}`);
    
    // Выводим сводку
    console.log('\n========== СВОДКА АНАЛИЗА ==========');
    console.log(`Проанализировано таблиц: ${analysisResults.tables.length}`);
    console.log('\nКритические находки:');
    analysisResults.criticalFindings.forEach((finding, index) => {
      console.log(`${index + 1}. ${finding}`);
    });
    
    console.log('\n🛡️ Топ-5 рекомендаций по безопасности:');
    analysisResults.safetyRecommendations.slice(0, 5).forEach(rec => {
      console.log(rec);
    });
    
  } catch (error) {
    console.error('❌ Критическая ошибка анализа:', error);
  }
}

// Запуск анализа
runProductionAnalysis().catch(console.error);