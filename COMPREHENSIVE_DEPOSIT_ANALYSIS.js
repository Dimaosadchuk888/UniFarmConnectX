#!/usr/bin/env node

/**
 * КОМПЛЕКСНАЯ ДИАГНОСТИКА СИСТЕМЫ ДЕПОЗИТОВ
 * Анализ переменных, логики обработки депозитов и TON Boost пакетов
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 КОМПЛЕКСНАЯ ДИАГНОСТИКА СИСТЕМЫ ДЕПОЗИТОВ');
console.log('='.repeat(80));

// 1. Проверка переменных окружения
function checkEnvironmentVariables() {
  console.log('\n1️⃣ ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ');
  console.log('-'.repeat(50));
  
  const criticalVars = [
    'SUPABASE_URL',
    'SUPABASE_KEY', 
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_ADMIN_BOT_TOKEN',
    'JWT_SECRET',
    'TELEGRAM_WEBAPP_URL',
    'APP_DOMAIN',
    'DATABASE_URL'
  ];
  
  criticalVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      const masked = value.length > 20 ? value.substring(0, 10) + '...' + value.substring(value.length - 5) : value;
      console.log(`✅ ${varName}: ${masked}`);
    } else {
      console.log(`❌ ${varName}: НЕ УСТАНОВЛЕНА`);
    }
  });
}

// 2. Анализ файлов депозитной логики
function analyzeDepositLogic() {
  console.log('\n2️⃣ АНАЛИЗ ЛОГИКИ ДЕПОЗИТОВ');
  console.log('-'.repeat(50));
  
  const filesToCheck = [
    'client/src/services/tonConnectService.ts',
    'client/src/components/wallet/TonDepositCard.tsx',
    'modules/wallet/service.ts',
    'modules/wallet/controller.ts',
    'core/TransactionService.ts'
  ];
  
  filesToCheck.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      console.log(`📄 Проверяем ${filePath}...`);
      
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Ищем ключевые методы депозитов
      const depositMethods = [
        'sendTonTransaction',
        'ton-deposit',
        'processDeposit',
        'createTransaction',
        'TON_DEPOSIT',
        'FARMING_REWARD'
      ];
      
      depositMethods.forEach(method => {
        if (content.includes(method)) {
          const lines = content.split('\n');
          const matchingLines = lines
            .map((line, index) => ({ line: line.trim(), number: index + 1 }))
            .filter(item => item.line.includes(method))
            .slice(0, 3); // Первые 3 совпадения
            
          console.log(`   🔍 ${method}:`);
          matchingLines.forEach(item => {
            console.log(`     L${item.number}: ${item.line.substring(0, 80)}...`);
          });
        }
      });
    } else {
      console.log(`❌ Файл ${filePath} не найден`);
    }
  });
}

// 3. Проверка TON Boost логики
function analyzeTonBoostLogic() {
  console.log('\n3️⃣ АНАЛИЗ TON BOOST ЛОГИКИ');
  console.log('-'.repeat(50));
  
  const boostFiles = [
    'modules/boost/service.ts',
    'modules/boost/TonFarmingRepository.ts',
    'client/src/components/ton-boost/BoostPackagesCard.tsx'
  ];
  
  boostFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      console.log(`📄 Проверяем ${filePath}...`);
      
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Ищем проблемные паттерны
      const patterns = [
        'purchaseWithInternalWallet',
        'purchaseWithExternalWallet', 
        'activateBoost',
        'createPendingTransaction',
        'verifyTonPayment',
        'BOOST_PURCHASE',
        'FARMING_REWARD'
      ];
      
      patterns.forEach(pattern => {
        if (content.includes(pattern)) {
          const regex = new RegExp(`.*${pattern}.*`, 'gi');
          const matches = content.match(regex);
          if (matches && matches.length > 0) {
            console.log(`   🔍 ${pattern}: ${matches.length} совпадений`);
            matches.slice(0, 2).forEach(match => {
              console.log(`     ${match.trim().substring(0, 80)}...`);
            });
          }
        }
      });
    } else {
      console.log(`❌ Файл ${filePath} не найден`);
    }
  });
}

// 4. Проверка транзакционной логики
function analyzeTransactionMapping() {
  console.log('\n4️⃣ АНАЛИЗ МАППИНГА ТРАНЗАКЦИЙ');
  console.log('-'.repeat(50));
  
  const transactionFiles = [
    'core/TransactionService.ts',
    'modules/transactions/types.ts'
  ];
  
  transactionFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      console.log(`📄 Проверяем ${filePath}...`);
      
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Ищем TRANSACTION_TYPE_MAPPING
      if (content.includes('TRANSACTION_TYPE_MAPPING')) {
        const mappingStart = content.indexOf('TRANSACTION_TYPE_MAPPING');
        const mappingSection = content.substring(mappingStart, mappingStart + 1000);
        
        console.log('   🗺️ TRANSACTION_TYPE_MAPPING:');
        const lines = mappingSection.split('\n').slice(0, 15);
        lines.forEach(line => {
          if (line.trim() && !line.includes('//')) {
            console.log(`     ${line.trim()}`);
          }
        });
      }
      
      // Ищем shouldUpdateBalance
      if (content.includes('shouldUpdateBalance')) {
        console.log('   ⚖️ shouldUpdateBalance найден');
        const balanceStart = content.indexOf('shouldUpdateBalance');
        const balanceSection = content.substring(balanceStart, balanceStart + 300);
        const relevantLines = balanceSection.split('\n').slice(0, 8);
        relevantLines.forEach(line => {
          if (line.trim()) {
            console.log(`     ${line.trim()}`);
          }
        });
      }
    }
  });
}

// 5. Проверка схемы базы данных
function analyzeDatabaseSchema() {
  console.log('\n5️⃣ АНАЛИЗ СХЕМЫ БАЗЫ ДАННЫХ');
  console.log('-'.repeat(50));
  
  const schemaFile = 'shared/schema.ts';
  
  if (fs.existsSync(schemaFile)) {
    console.log(`📄 Проверяем ${schemaFile}...`);
    
    const content = fs.readFileSync(schemaFile, 'utf8');
    
    // Ищем таблицы users и transactions
    const tables = ['users', 'transactions', 'ton_farming_data'];
    
    tables.forEach(tableName => {
      if (content.includes(`export const ${tableName}`)) {
        console.log(`   📊 Таблица ${tableName} найдена`);
        
        const tableStart = content.indexOf(`export const ${tableName}`);
        const tableSection = content.substring(tableStart, tableStart + 500);
        const lines = tableSection.split('\n').slice(0, 10);
        
        lines.forEach(line => {
          if (line.includes('balance') || line.includes('TON') || line.includes('amount')) {
            console.log(`     ${line.trim()}`);
          }
        });
      } else {
        console.log(`   ❌ Таблица ${tableName} не найдена в схеме`);
      }
    });
  } else {
    console.log(`❌ Файл схемы ${schemaFile} не найден`);
  }
}

// 6. Проверка конфигурационных файлов
function analyzeConfigFiles() {
  console.log('\n6️⃣ АНАЛИЗ КОНФИГУРАЦИОННЫХ ФАЙЛОВ');
  console.log('-'.repeat(50));
  
  const configFiles = [
    '.env',
    '.env.example',
    'server/index.ts',
    'client/src/App.tsx'
  ];
  
  configFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      console.log(`📄 ${filePath}:`);
      
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      // Ищем важные конфигурации
      const importantLines = lines.filter(line => {
        return line.includes('TON') || 
               line.includes('SUPABASE') || 
               line.includes('WEBHOOK') ||
               line.includes('API') ||
               line.includes('manifest');
      }).slice(0, 5);
      
      importantLines.forEach(line => {
        console.log(`   ${line.trim()}`);
      });
    } else {
      console.log(`❌ ${filePath} не найден`);
    }
  });
}

// Запуск всех проверок
function runComprehensiveAnalysis() {
  console.log('🚀 ЗАПУСК КОМПЛЕКСНОЙ ДИАГНОСТИКИ...\n');
  
  checkEnvironmentVariables();
  analyzeDepositLogic();
  analyzeTonBoostLogic();
  analyzeTransactionMapping();
  analyzeDatabaseSchema();
  analyzeConfigFiles();
  
  console.log('\n' + '='.repeat(80));
  console.log('📋 РЕЗУЛЬТАТЫ ДИАГНОСТИКИ:');
  console.log('='.repeat(80));
  console.log('1. Переменные окружения проверены');
  console.log('2. Логика депозитов проанализирована');
  console.log('3. TON Boost система просканирована');
  console.log('4. Маппинг транзакций изучен');
  console.log('5. Схема базы данных проверена');
  console.log('6. Конфигурационные файлы проанализированы');
  console.log('='.repeat(80));
}

// Запуск
runComprehensiveAnalysis();