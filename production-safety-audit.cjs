/**
 * АУДИТ БЕЗОПАСНОСТИ ДЛЯ ПРОДАКШЕНА
 * Анализ использования таблиц 'transactions' vs 'user_transactions'
 * Определение безопасности изменений
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 PRODUCTION SAFETY AUDIT - АНАЛИЗ ТАБЛИЦ');
console.log('='.repeat(60));

// Рекурсивный поиск файлов
function findFiles(dir, extension = '.ts') {
  let results = [];
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      results = results.concat(findFiles(filePath, extension));
    } else if (file.endsWith(extension)) {
      results.push(filePath);
    }
  }
  
  return results;
}

// Анализ использования таблиц в коде
function analyzeTableUsage() {
  console.log('\n1️⃣ ПОИСК ВСЕХ УПОМИНАНИЙ ТАБЛИЦ В КОДЕ');
  
  const tsFiles = findFiles('.', '.ts').concat(findFiles('.', '.js'));
  let transactionsUsage = [];
  let userTransactionsUsage = [];
  
  tsFiles.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        if (line.includes("'transactions'") || line.includes('"transactions"')) {
          transactionsUsage.push({
            file: filePath,
            line: index + 1,
            content: line.trim()
          });
        }
        
        if (line.includes("'user_transactions'") || line.includes('"user_transactions"')) {
          userTransactionsUsage.push({
            file: filePath,
            line: index + 1,
            content: line.trim()
          });
        }
      });
    } catch (error) {
      // Игнорируем ошибки чтения файлов
    }
  });
  
  console.log(`\n📊 РЕЗУЛЬТАТЫ ПОИСКА:`);
  console.log(`   'transactions' найдено в ${transactionsUsage.length} местах`);
  console.log(`   'user_transactions' найдено в ${userTransactionsUsage.length} местах`);
  
  return { transactionsUsage, userTransactionsUsage };
}

// Детальный анализ критических файлов
function analyzeCriticalFiles() {
  console.log('\n2️⃣ АНАЛИЗ КРИТИЧЕСКИХ ФАЙЛОВ');
  
  const criticalFiles = [
    'modules/wallet/service.ts',
    'modules/wallet/controller.ts', 
    'modules/transactions/service.ts',
    'core/BalanceManager.ts',
    'shared/schema.ts'
  ];
  
  criticalFiles.forEach(filePath => {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        console.log(`\n   📄 ${filePath}:`);
        
        const transactionsCount = (content.match(/'transactions'|"transactions"/g) || []).length;
        const userTransactionsCount = (content.match(/'user_transactions'|"user_transactions"/g) || []).length;
        
        console.log(`       'transactions': ${transactionsCount} раз`);
        console.log(`       'user_transactions': ${userTransactionsCount} раз`);
        
        if (transactionsCount > 0 && userTransactionsCount > 0) {
          console.log(`       ⚠️ СМЕШАННОЕ ИСПОЛЬЗОВАНИЕ ОБЕИХ ТАБЛИЦ!`);
        }
      } else {
        console.log(`\n   ❌ ${filePath}: файл не найден`);
      }
    } catch (error) {
      console.log(`\n   ❌ ${filePath}: ошибка чтения`);
    }
  });
}

// Анализ схемы базы данных
function analyzeDatabaseSchema() {
  console.log('\n3️⃣ АНАЛИЗ СХЕМЫ БАЗЫ ДАННЫХ');
  
  try {
    if (fs.existsSync('shared/schema.ts')) {
      const schema = fs.readFileSync('shared/schema.ts', 'utf8');
      
      console.log(`   📋 Анализ shared/schema.ts:`);
      
      if (schema.includes('transactions')) {
        console.log(`       ✅ Таблица 'transactions' определена в схеме`);
      } else {
        console.log(`       ❌ Таблица 'transactions' НЕ найдена в схеме`);
      }
      
      if (schema.includes('user_transactions')) {
        console.log(`       ✅ Таблица 'user_transactions' определена в схеме`);
      } else {
        console.log(`       ❌ Таблица 'user_transactions' НЕ найдена в схеме`);
      }
      
      // Поиск других транзакционных таблиц
      const tables = schema.match(/export const \w+ = pgTable\('(\w+)'/g) || [];
      console.log(`   📊 Все таблицы в схеме: ${tables.length}`);
      tables.forEach(table => {
        if (table.includes('transaction')) {
          console.log(`       📄 ${table}`);
        }
      });
      
    } else {
      console.log(`   ❌ shared/schema.ts не найден`);
    }
  } catch (error) {
    console.log(`   ❌ Ошибка анализа схемы: ${error.message}`);
  }
}

// Оценка рисков изменений
function assessRisks(transactionsUsage, userTransactionsUsage) {
  console.log('\n4️⃣ ОЦЕНКА РИСКОВ ИЗМЕНЕНИЙ');
  
  console.log(`\n   📊 СТАТИСТИКА:`);
  console.log(`       Использований 'transactions': ${transactionsUsage.length}`);
  console.log(`       Использований 'user_transactions': ${userTransactionsUsage.length}`);
  
  console.log(`\n   🎯 ФАЙЛЫ С 'transactions':`);
  const filesCounts = {};
  transactionsUsage.forEach(usage => {
    filesCounts[usage.file] = (filesCounts[usage.file] || 0) + 1;
  });
  
  Object.entries(filesCounts).forEach(([file, count]) => {
    console.log(`       ${file}: ${count} использований`);
  });
  
  console.log(`\n   ⚠️ ПОТЕНЦИАЛЬНЫЕ РИСКИ:`);
  
  // Проверка конфликтов в одном файле
  const conflictFiles = [];
  Object.keys(filesCounts).forEach(file => {
    const hasUserTransactions = userTransactionsUsage.some(usage => usage.file === file);
    if (hasUserTransactions) {
      conflictFiles.push(file);
    }
  });
  
  if (conflictFiles.length > 0) {
    console.log(`       🔥 КРИТИЧЕСКИЙ РИСК: Смешанное использование в файлах:`);
    conflictFiles.forEach(file => {
      console.log(`          - ${file}`);
    });
  } else {
    console.log(`       ✅ НИЗКИЙ РИСК: Конфликтов смешанного использования не найдено`);
  }
  
  // Проверка критических модулей
  const criticalAffected = transactionsUsage.filter(usage => 
    usage.file.includes('wallet') || 
    usage.file.includes('balance') || 
    usage.file.includes('transaction')
  );
  
  if (criticalAffected.length > 0) {
    console.log(`       ⚠️ СРЕДНИЙ РИСК: Затронуты критические модули:`);
    criticalAffected.forEach(usage => {
      console.log(`          ${usage.file}:${usage.line}`);
    });
  }
}

// Рекомендации по безопасным изменениям
function provideSafetyRecommendations() {
  console.log('\n5️⃣ РЕКОМЕНДАЦИИ ПО БЕЗОПАСНЫМ ИЗМЕНЕНИЯМ');
  
  console.log(`\n   🛡️ СТРАТЕГИЯ МИНИМАЛЬНОГО РИСКА:`);
  console.log(`       1. Изменять ТОЛЬКО modules/wallet/service.ts`);
  console.log(`       2. Изменять ТОЛЬКО строки 375 и 417`);
  console.log(`       3. НЕ трогать другие файлы на первом этапе`);
  console.log(`       4. Провести тестирование на одном депозите`);
  
  console.log(`\n   🧪 ПЛАН ТЕСТИРОВАНИЯ:`);
  console.log(`       1. Создать бэкап текущего кода`);
  console.log(`       2. Изменить только 2 строки`);
  console.log(`       3. Протестировать с тестовым депозитом 0.01 TON`);
  console.log(`       4. Проверить, что другие функции не сломались`);
  console.log(`       5. При успехе - откатить тестовый депозит User #25`);
  
  console.log(`\n   🔄 ПЛАН ОТКАТА:`);
  console.log(`       1. Сохранить оригинальные строки в комментариях`);
  console.log(`       2. При ошибке - немедленно вернуть оригинал`);
  console.log(`       3. Перезапустить сервер`);
  console.log(`       4. Проверить работоспособность системы`);
}

// Запуск полного аудита
console.log('🚀 НАЧИНАЕМ PRODUCTION SAFETY AUDIT...\n');

const { transactionsUsage, userTransactionsUsage } = analyzeTableUsage();
analyzeCriticalFiles();
analyzeDatabaseSchema();
assessRisks(transactionsUsage, userTransactionsUsage);
provideSafetyRecommendations();

console.log('\n' + '='.repeat(60));
console.log('✅ АУДИТ БЕЗОПАСНОСТИ ЗАВЕРШЕН');
console.log('='.repeat(60));