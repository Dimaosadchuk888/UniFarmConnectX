import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔍 ПОЛНЫЙ АУДИТ СИСТЕМЫ UniFarm\n');
console.log('=' .repeat(80));

const audit = {
  timestamp: new Date().toISOString(),
  system: {
    nodeVersion: process.version,
    platform: process.platform,
    architecture: process.arch
  },
  structure: {
    totalFiles: 0,
    totalLines: 0,
    fileTypes: {},
    modules: {},
    components: {}
  },
  security: {
    hardcodedSecrets: [],
    exposedEndpoints: [],
    authIssues: []
  },
  functionality: {
    farming: {},
    jwt: {},
    transactions: {},
    balance: {}
  },
  dependencies: {
    production: {},
    development: {}
  },
  quality: {
    largeFiles: [],
    complexFiles: [],
    duplicates: []
  }
};

// Утилиты для анализа
function getFileStats(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').length;
    return { size: stats.size, lines };
  } catch (e) {
    return { size: 0, lines: 0 };
  }
}

function analyzeFile(filePath, relativePath) {
  const ext = path.extname(filePath);
  const stats = getFileStats(filePath);
  
  audit.structure.totalFiles++;
  audit.structure.totalLines += stats.lines;
  audit.structure.fileTypes[ext] = (audit.structure.fileTypes[ext] || 0) + 1;
  
  // Большие файлы
  if (stats.size > 10240) {
    audit.quality.largeFiles.push({
      path: relativePath,
      size: Math.round(stats.size / 1024) + 'KB',
      lines: stats.lines
    });
  }
  
  // Анализ содержимого
  if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
    analyzeCodeFile(filePath, relativePath);
  }
}

function analyzeCodeFile(filePath, relativePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Поиск hardcoded secrets
    const secretPatterns = [
      /(?:api[_-]?key|secret|password|token)\s*[:=]\s*["']([^"']{10,})["']/gi,
      /eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/g
    ];
    
    secretPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        audit.security.hardcodedSecrets.push({
          file: relativePath,
          type: pattern.source.includes('eyJ') ? 'JWT Token' : 'API Key/Secret',
          count: matches.length
        });
      }
    });
    
    // Анализ endpoints
    if (relativePath.includes('routes') || relativePath.includes('controller')) {
      const endpointPattern = /(?:get|post|put|delete|patch)\s*\(\s*["']([^"']+)["']/gi;
      let match;
      while ((match = endpointPattern.exec(content)) !== null) {
        const endpoint = match[1];
        if (!endpoint.includes('auth') && !endpoint.includes('login')) {
          audit.security.exposedEndpoints.push({
            file: relativePath,
            endpoint,
            method: match[0].split('(')[0].trim()
          });
        }
      }
    }
    
    // Анализ farming функциональности
    if (relativePath.includes('farming')) {
      audit.functionality.farming[relativePath] = {
        hasBalanceManager: content.includes('BalanceManager'),
        hasTransactions: content.includes('createTransaction') || content.includes('FARMING_DEPOSIT'),
        hasDirectDeposit: content.includes('directDeposit')
      };
    }
    
    // JWT анализ
    if (content.includes('jwt') || content.includes('JWT')) {
      audit.functionality.jwt[relativePath] = {
        hasVerify: content.includes('verify'),
        hasSign: content.includes('sign'),
        hasFallback: /user_?[iI]d\s*[:|=]\s*(74|62|48|43|42)/.test(content)
      };
    }
    
  } catch (e) {
    // Игнорируем ошибки чтения
  }
}

function scanDirectory(dir, baseDir = '') {
  try {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const relativePath = path.join(baseDir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.includes('node_modules') && !file.startsWith('.')) {
        // Анализ модулей
        if (dir.includes('modules') && baseDir === '') {
          audit.structure.modules[file] = { files: 0, lines: 0 };
        }
        scanDirectory(filePath, relativePath);
      } else if (stat.isFile()) {
        analyzeFile(filePath, relativePath);
        
        // Подсчет для модулей
        if (relativePath.startsWith('modules/')) {
          const moduleName = relativePath.split('/')[1];
          if (audit.structure.modules[moduleName]) {
            audit.structure.modules[moduleName].files++;
            audit.structure.modules[moduleName].lines += getFileStats(filePath).lines;
          }
        }
      }
    });
  } catch (e) {
    console.error(`Ошибка при сканировании ${dir}:`, e.message);
  }
}

// Анализ package.json
function analyzeDependencies() {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    audit.dependencies.production = Object.keys(packageJson.dependencies || {}).length;
    audit.dependencies.development = Object.keys(packageJson.devDependencies || {}).length;
    
    // Критические зависимости
    const critical = ['express', 'jsonwebtoken', '@supabase/supabase-js', 'react', 'vite'];
    critical.forEach(dep => {
      if (packageJson.dependencies?.[dep]) {
        console.log(`  ✅ ${dep}: ${packageJson.dependencies[dep]}`);
      }
    });
    
  } catch (e) {
    console.error('Ошибка анализа package.json:', e.message);
  }
}

// Запуск аудита
console.log('\n📊 СИСТЕМНАЯ ИНФОРМАЦИЯ:');
console.log(`  Node.js: ${process.version}`);
console.log(`  Платформа: ${process.platform}`);
console.log(`  Архитектура: ${process.arch}`);

console.log('\n📦 КРИТИЧЕСКИЕ ЗАВИСИМОСТИ:');
analyzeDependencies();

console.log('\n📁 СКАНИРОВАНИЕ ФАЙЛОВОЙ СИСТЕМЫ...');
['client', 'server', 'modules', 'core', 'utils', 'types', 'config'].forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`  Сканирую ${dir}...`);
    scanDirectory(dir);
  }
});

// Генерация отчета
console.log('\n' + '=' .repeat(80));
console.log('📊 РЕЗУЛЬТАТЫ АУДИТА:\n');

console.log('📁 СТРУКТУРА ПРОЕКТА:');
console.log(`  Всего файлов: ${audit.structure.totalFiles}`);
console.log(`  Всего строк кода: ${audit.structure.totalLines.toLocaleString()}`);
console.log(`  Типы файлов:`);
Object.entries(audit.structure.fileTypes)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)
  .forEach(([ext, count]) => {
    console.log(`    ${ext || 'без расширения'}: ${count} файлов`);
  });

console.log('\n📦 МОДУЛИ:');
Object.entries(audit.structure.modules)
  .sort((a, b) => b[1].lines - a[1].lines)
  .forEach(([name, stats]) => {
    console.log(`  ${name}: ${stats.files} файлов, ${stats.lines.toLocaleString()} строк`);
  });

console.log('\n🔐 БЕЗОПАСНОСТЬ:');
console.log(`  Hardcoded secrets: ${audit.security.hardcodedSecrets.length}`);
if (audit.security.hardcodedSecrets.length > 0) {
  audit.security.hardcodedSecrets.slice(0, 3).forEach(item => {
    console.log(`    ❗ ${item.type} в ${item.file}`);
  });
}

console.log(`  Открытые endpoints: ${audit.security.exposedEndpoints.length}`);

console.log('\n⚙️  ФУНКЦИОНАЛЬНОСТЬ:');
console.log(`  Farming модули: ${Object.keys(audit.functionality.farming).length}`);
console.log(`  JWT использование: ${Object.keys(audit.functionality.jwt).length} файлов`);

const jwtWithFallback = Object.entries(audit.functionality.jwt)
  .filter(([_, info]) => info.hasFallback).length;
if (jwtWithFallback > 0) {
  console.log(`    ⚠️  JWT с fallback user IDs: ${jwtWithFallback} файлов`);
}

console.log('\n📏 КАЧЕСТВО КОДА:');
console.log(`  Большие файлы (>10KB): ${audit.quality.largeFiles.length}`);
audit.quality.largeFiles.slice(0, 5).forEach(file => {
  console.log(`    ${file.path}: ${file.size} (${file.lines} строк)`);
});

console.log('\n💾 ЗАВИСИМОСТИ:');
console.log(`  Production: ${audit.dependencies.production} пакетов`);
console.log(`  Development: ${audit.dependencies.development} пакетов`);

// Сохранение полного отчета
fs.writeFileSync(
  path.join(__dirname, 'comprehensive-audit-report.json'),
  JSON.stringify(audit, null, 2)
);

console.log('\n✅ Полный отчет сохранен в tools/analyzer/comprehensive-audit-report.json');

// Оценка готовности
let readinessScore = 100;
if (audit.security.hardcodedSecrets.length > 0) readinessScore -= 15;
if (jwtWithFallback > 0) readinessScore -= 10;
if (audit.security.exposedEndpoints.length > 20) readinessScore -= 5;

console.log(`\n🎯 ОБЩАЯ ОЦЕНКА ГОТОВНОСТИ: ${readinessScore}%`);