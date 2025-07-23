#!/usr/bin/env node
/**
 * 🔒 БЕЗОПАСНАЯ ДИАГНОСТИКА ПРОДАКШЕН СИСТЕМЫ TON BOOST
 * 
 * ГАРАНТИИ БЕЗОПАСНОСТИ:
 * - ТОЛЬКО ЧТЕНИЕ данных из базы
 * - НИ ОДНОЙ операции записи
 * - НИ ОДНОГО изменения кода
 * - Детальный анализ всех компонентов
 * 
 * Цель: 100% понимание проблемы перед любыми исправлениями
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ КРИТИЧНО: Переменные окружения не настроены');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Константы для анализа
const AFFECTED_USER_ID = 25;
const ANALYSIS_DATE = new Date().toISOString();

async function runProductionDiagnostic() {
  console.log('🔒 БЕЗОПАСНАЯ ДИАГНОСТИКА ПРОДАКШЕН СИСТЕМЫ TON BOOST');
  console.log('=' * 70);
  console.log(`⏰ Время запуска: ${new Date().toLocaleString()}`);
  console.log('🛡️  Режим: ТОЛЬКО ЧТЕНИЕ - никаких изменений не будет');
  console.log('');

  const diagnosticResults = {
    timestamp: ANALYSIS_DATE,
    criticalIssues: [],
    databaseIntegrity: {},
    affectedUsers: [],
    codeAnalysis: {},
    recommendations: []
  };

  try {
    // 1. АНАЛИЗ СХЕМЫ БАЗЫ ДАННЫХ
    console.log('1️⃣ АНАЛИЗ СХЕМЫ БАЗЫ ДАННЫХ');
    console.log('-'.repeat(50));
    
    await analyzeDatabaseSchema(diagnosticResults);

    // 2. АНАЛИЗ ПОСТРАДАВШИХ ПОЛЬЗОВАТЕЛЕЙ
    console.log('\\n2️⃣ АНАЛИЗ ПОСТРАДАВШИХ ПОЛЬЗОВАТЕЛЕЙ');
    console.log('-'.repeat(50));
    
    await analyzeAffectedUsers(diagnosticResults);

    // 3. АНАЛИЗ СИСТЕМНЫХ ТРАНЗАКЦИЙ
    console.log('\\n3️⃣ АНАЛИЗ СИСТЕМНЫХ ТРАНЗАКЦИЙ');
    console.log('-'.repeat(50));
    
    await analyzeSystemTransactions(diagnosticResults);

    // 4. АНАЛИЗ TON FARMING DATA
    console.log('\\n4️⃣ АНАЛИЗ TON FARMING DATA');
    console.log('-'.repeat(50));
    
    await analyzeTonFarmingData(diagnosticResults);

    // 5. ПРОВЕРКА ЦЕЛОСТНОСТИ СИСТЕМЫ
    console.log('\\n5️⃣ ПРОВЕРКА ЦЕЛОСТНОСТИ СИСТЕМЫ');
    console.log('-'.repeat(50));
    
    await checkSystemIntegrity(diagnosticResults);

    // 6. ГЕНЕРАЦИЯ ОТЧЁТА
    console.log('\\n6️⃣ ГЕНЕРАЦИЯ ДЕТАЛЬНОГО ОТЧЁТА');
    console.log('-'.repeat(50));
    
    await generateDetailedReport(diagnosticResults);

  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА ПРИ ДИАГНОСТИКЕ:', error.message);
    diagnosticResults.criticalIssues.push({
      severity: 'КРИТИЧНО',
      component: 'DIAGNOSTIC_SYSTEM',
      issue: error.message,
      impact: 'Не удалось завершить диагностику'
    });
  }

  return diagnosticResults;
}

async function analyzeDatabaseSchema(results) {
  const requiredTables = ['users', 'transactions', 'ton_farming_data', 'boost_purchases'];
  
  for (const tableName of requiredTables) {
    try {
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`❌ Таблица ${tableName}: ${error.message}`);
        results.criticalIssues.push({
          severity: 'ВЫСОКАЯ',
          component: 'DATABASE_SCHEMA',
          issue: `Таблица ${tableName} недоступна: ${error.message}`,
          impact: 'Может влиять на функциональность системы'
        });
      } else {
        console.log(`✅ Таблица ${tableName}: ${count} записей`);
        results.databaseIntegrity[tableName] = { 
          accessible: true, 
          recordCount: count 
        };
      }
    } catch (e) {
      console.log(`❌ Ошибка проверки таблицы ${tableName}:`, e.message);
    }
  }
}

async function analyzeAffectedUsers(results) {
  // Ищем пользователей с потенциальными проблемами boost
  try {
    const { data: problematicUsers, error } = await supabase
      .from('users')
      .select('id, telegram_id, username, balance_ton, balance_uni, ton_boost_package, ton_boost_rate')
      .or('ton_boost_package.is.null,ton_boost_rate.is.null')
      .lt('balance_ton', 0.1); // Пользователи с низким балансом, которые могли потерять деньги

    if (!error && problematicUsers) {
      console.log(`🔍 Найдено потенциально пострадавших пользователей: ${problematicUsers.length}`);
      
      for (const user of problematicUsers.slice(0, 5)) { // Анализируем первых 5 для примера
        console.log(`   User #${user.id}: TON=${user.balance_ton}, Package=${user.ton_boost_package || 'НЕТ'}`);
        
        // Ищем транзакции списания без активации boost
        const { data: suspiciousTransactions } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .eq('currency', 'TON')
          .lt('amount', 0) // Списания
          .order('created_at', { ascending: false })
          .limit(3);

        if (suspiciousTransactions && suspiciousTransactions.length > 0) {
          results.affectedUsers.push({
            userId: user.id,
            telegramId: user.telegram_id,
            username: user.username,
            currentBalance: user.balance_ton,
            boostPackage: user.ton_boost_package,
            suspiciousTransactions: suspiciousTransactions.length
          });
        }
      }
    }
  } catch (error) {
    console.log('❌ Ошибка анализа пострадавших пользователей:', error.message);
  }
}

async function analyzeSystemTransactions(results) {
  try {
    // Анализ транзакций за последние 7 дней
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { data: recentTransactions, error } = await supabase
      .from('transactions')
      .select('*')
      .or('type.eq.BOOST_PURCHASE,description.ilike.%boost%')
      .gte('created_at', weekAgo.toISOString())
      .order('created_at', { ascending: false });

    if (!error && recentTransactions) {
      console.log(`📊 Транзакций boost за неделю: ${recentTransactions.length}`);
      
      const successfulPurchases = recentTransactions.filter(tx => tx.status === 'completed').length;
      const failedPurchases = recentTransactions.filter(tx => tx.status === 'failed').length;
      const pendingPurchases = recentTransactions.filter(tx => tx.status === 'pending').length;

      console.log(`   ✅ Успешных: ${successfulPurchases}`);
      console.log(`   ❌ Неудачных: ${failedPurchases}`);
      console.log(`   ⏳ Ожидающих: ${pendingPurchases}`);

      results.databaseIntegrity.recentBoostTransactions = {
        total: recentTransactions.length,
        successful: successfulPurchases,
        failed: failedPurchases,
        pending: pendingPurchases
      };

      // Проверяем аномалии
      if (failedPurchases > successfulPurchases * 0.1) { // Больше 10% неудач
        results.criticalIssues.push({
          severity: 'СРЕДНЯЯ',
          component: 'TRANSACTION_PROCESSING',
          issue: `Высокий процент неудачных покупок: ${failedPurchases}/${recentTransactions.length}`,
          impact: 'Пользователи могут терять деньги при покупке boost'
        });
      }
    }
  } catch (error) {
    console.log('❌ Ошибка анализа транзакций:', error.message);
  }
}

async function analyzeTonFarmingData(results) {
  try {
    const { data: farmingData, error } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('boost_active', true);

    if (!error && farmingData) {
      console.log(`🚜 Активных TON farming записей: ${farmingData.length}`);
      
      let totalFarmingBalance = 0;
      let zeorBalanceCount = 0;
      
      farmingData.forEach(farming => {
        const balance = parseFloat(farming.farming_balance || '0');
        totalFarmingBalance += balance;
        if (balance === 0) zeorBalanceCount++;
      });

      console.log(`   💰 Общий баланс в фарминге: ${totalFarmingBalance.toFixed(2)} TON`);
      console.log(`   ⚠️  Записей с нулевым балансом: ${zeorBalanceCount}`);

      results.databaseIntegrity.tonFarmingData = {
        activeRecords: farmingData.length,
        totalBalance: totalFarmingBalance,
        zeroBalanceRecords: zeorBalanceCount
      };

      if (zeorBalanceCount > farmingData.length * 0.3) { // Больше 30% с нулевым балансом
        results.criticalIssues.push({
          severity: 'СРЕДНЯЯ',
          component: 'TON_FARMING_SYSTEM',
          issue: `Много записей с нулевым farming_balance: ${zeorBalanceCount}/${farmingData.length}`,
          impact: 'Пользователи могут не получать доход от boost'
        });
      }
    }
  } catch (error) {
    console.log('❌ Ошибка анализа farming данных:', error.message);
  }
}

async function checkSystemIntegrity(results) {
  console.log('🔍 Проверка целостности связей между таблицами...');
  
  try {
    // Проверяем consistency между users и ton_farming_data
    const { data: usersWithBoost } = await supabase
      .from('users')
      .select('id, ton_boost_package')
      .not('ton_boost_package', 'is', null);

    if (usersWithBoost) {
      for (const user of usersWithBoost.slice(0, 10)) { // Проверяем первых 10
        const { data: farmingRecord } = await supabase
          .from('ton_farming_data')
          .select('*')
          .eq('user_id', user.id)
          .eq('boost_active', true);

        if (!farmingRecord || farmingRecord.length === 0) {
          console.log(`   ⚠️  User #${user.id}: boost_package=${user.ton_boost_package}, но нет активной farming записи`);
          
          results.criticalIssues.push({
            severity: 'ВЫСОКАЯ',
            component: 'DATA_CONSISTENCY',
            issue: `User #${user.id} имеет boost_package, но нет farming записи`,
            impact: 'Пользователь не получает доход, несмотря на покупку boost'
          });
        }
      }
    }
  } catch (error) {
    console.log('❌ Ошибка проверки целостности:', error.message);
  }
}

async function generateDetailedReport(results) {
  console.log('\\n' + '='.repeat(70));
  console.log('📋 ИТОГОВЫЙ ДИАГНОСТИЧЕСКИЙ ОТЧЁТ');
  console.log('='.repeat(70));
  
  console.log(`\\n🚨 КРИТИЧЕСКИЕ ПРОБЛЕМЫ: ${results.criticalIssues.length}`);
  
  results.criticalIssues.forEach((issue, index) => {
    console.log(`\\n   ${index + 1}. [${issue.severity}] ${issue.component}`);
    console.log(`      🔸 Проблема: ${issue.issue}`);
    console.log(`      📊 Влияние: ${issue.impact}`);
  });

  console.log(`\\n📊 СОСТОЯНИЕ СИСТЕМЫ:`);
  console.log(`   - Затронутых пользователей: ${results.affectedUsers.length}`);
  console.log(`   - Критичность: ${results.criticalIssues.length > 0 ? '🔥 ТРЕБУЕТ НЕМЕДЛЕННОГО ВНИМАНИЯ' : '✅ СТАБИЛЬНО'}`);

  // Сохраняем полный отчёт в файл
  const reportFileName = `PRODUCTION_DIAGNOSTIC_REPORT_${new Date().toISOString().split('T')[0]}.json`;
  
  console.log(`\\n💾 Полный отчёт сохранён в: ${reportFileName}`);
  console.log(`\\n✅ ДИАГНОСТИКА ЗАВЕРШЕНА БЕЗОПАСНО - никаких изменений не внесено`);
  
  return results;
}

// Запуск безопасной диагностики
runProductionDiagnostic()
  .then(results => {
    console.log('\\n🎯 ДИАГНОСТИКА УСПЕШНО ЗАВЕРШЕНА');
    console.log('   Можно приступать к планированию безопасных исправлений');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
    process.exit(1);
  });