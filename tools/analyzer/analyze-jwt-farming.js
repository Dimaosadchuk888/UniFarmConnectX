import fs from 'fs';
import path from 'path';

console.log('🔍 Анализ JWT и Farming функциональности UniFarm\n');

const findings = {
  jwt: {
    hardcoded: [],
    fallbacks: [],
    issues: []
  },
  farming: {
    transactions: [],
    balanceOperations: [],
    issues: []
  },
  critical: []
};

// Поиск паттернов в файлах
function searchInFile(filePath, patterns) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    patterns.forEach(pattern => {
      lines.forEach((line, index) => {
        if (pattern.regex.test(line)) {
          pattern.callback({
            file: filePath,
            line: index + 1,
            content: line.trim(),
            match: line.match(pattern.regex)
          });
        }
      });
    });
  } catch (e) {
    // Игнорируем ошибки чтения
  }
}

// Паттерны для поиска
const patterns = [
  // JWT hardcoded tokens
  {
    regex: /eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/,
    callback: (match) => {
      findings.jwt.hardcoded.push(match);
      findings.critical.push(`❗ Hardcoded JWT token: ${match.file}:${match.line}`);
    }
  },
  // User ID fallbacks
  {
    regex: /user_?[iI]d\s*[:|=]\s*(74|62|48|43|42|"74"|"62"|"48"|"43"|"42")/,
    callback: (match) => {
      if (!match.file.includes('test') && !match.file.includes('debug')) {
        findings.jwt.fallbacks.push(match);
      }
    }
  },
  // Farming transaction creation
  {
    regex: /createTransaction.*FARMING_DEPOSIT/i,
    callback: (match) => {
      findings.farming.transactions.push(match);
    }
  },
  // Balance operations in farming
  {
    regex: /BalanceManager\.(subtract|add|update)Balance/,
    callback: (match) => {
      if (match.file.includes('farming')) {
        findings.farming.balanceOperations.push(match);
      }
    }
  },
  // Direct database balance updates
  {
    regex: /UPDATE.*users.*SET.*balance_(uni|ton)/i,
    callback: (match) => {
      findings.critical.push(`⚠️  Direct DB update: ${match.file}:${match.line}`);
    }
  }
];

// Рекурсивный поиск в директориях
function searchDirectory(dir) {
  try {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.includes('node_modules') && !file.startsWith('.')) {
        searchDirectory(filePath);
      } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js'))) {
        searchInFile(filePath, patterns);
      }
    });
  } catch (e) {
    // Игнорируем ошибки
  }
}

// Поиск по всему проекту
['client', 'server', 'modules', 'core', 'utils'].forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`📁 Сканируем ${dir}...`);
    searchDirectory(dir);
  }
});

// Анализ конкретных файлов
console.log('\n🔍 Проверка критических файлов:\n');

// Проверка directDeposit
const directDepositPath = 'modules/farming/directDeposit.ts';
if (fs.existsSync(directDepositPath)) {
  const content = fs.readFileSync(directDepositPath, 'utf8');
  console.log('✅ modules/farming/directDeposit.ts:');
  console.log('  - Использует BalanceManager:', content.includes('BalanceManager') ? '✅' : '❌');
  console.log('  - Создает транзакции:', content.includes('createTransaction') ? '✅' : '❌');
  console.log('  - Обрабатывает user_id из body:', content.includes('body.user_id') ? '✅' : '❌');
}

// Проверка UniFarmingCard
const uniFarmingCardPath = 'client/src/components/farming/UniFarmingCard.tsx';
if (fs.existsSync(uniFarmingCardPath)) {
  const content = fs.readFileSync(uniFarmingCardPath, 'utf8');
  console.log('\n✅ client/src/components/farming/UniFarmingCard.tsx:');
  console.log('  - Использует direct-deposit endpoint:', content.includes('direct-deposit') ? '✅' : '❌');
  console.log('  - Передает user_id в body:', content.includes('user_id: userId') ? '✅' : '❌');
}

// Вывод результатов
console.log('\n📊 РЕЗУЛЬТАТЫ АНАЛИЗА:\n');

if (findings.jwt.hardcoded.length > 0) {
  console.log('🔴 НАЙДЕНЫ HARDCODED JWT ТОКЕНЫ:');
  findings.jwt.hardcoded.slice(0, 5).forEach(item => {
    console.log(`  - ${item.file}:${item.line}`);
    console.log(`    ${item.content.substring(0, 80)}...`);
  });
}

if (findings.jwt.fallbacks.length > 0) {
  console.log('\n⚠️  НАЙДЕНЫ FALLBACK USER IDS:');
  findings.jwt.fallbacks.slice(0, 5).forEach(item => {
    console.log(`  - ${item.file}:${item.line}`);
    console.log(`    ${item.content}`);
  });
}

console.log('\n📦 FARMING АНАЛИЗ:');
console.log(`  - Найдено операций с балансом: ${findings.farming.balanceOperations.length}`);
console.log(`  - Найдено создание транзакций FARMING_DEPOSIT: ${findings.farming.transactions.length}`);

if (findings.farming.transactions.length === 0) {
  console.log('  ❌ НЕ НАЙДЕНО создание транзакций FARMING_DEPOSIT!');
  findings.critical.push('❌ Транзакции FARMING_DEPOSIT не создаются');
}

if (findings.critical.length > 0) {
  console.log('\n🚨 КРИТИЧЕСКИЕ ПРОБЛЕМЫ:');
  findings.critical.forEach(issue => {
    console.log(`  ${issue}`);
  });
}

// Сохранение отчета
const report = {
  timestamp: new Date().toISOString(),
  findings,
  summary: {
    hardcodedTokens: findings.jwt.hardcoded.length,
    fallbackUserIds: findings.jwt.fallbacks.length,
    farmingBalanceOps: findings.farming.balanceOperations.length,
    farmingTransactions: findings.farming.transactions.length,
    criticalIssues: findings.critical.length
  }
};

fs.writeFileSync('tools/analyzer/jwt-farming-analysis.json', JSON.stringify(report, null, 2));
console.log('\n✅ Отчет сохранен в tools/analyzer/jwt-farming-analysis.json');