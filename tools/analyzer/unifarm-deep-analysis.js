import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🚀 ГЛУБОКИЙ АНАЛИЗ UniFarm СИСТЕМЫ\n');
console.log('=' .repeat(80));

const analysis = {
  timestamp: new Date().toISOString(),
  modules: {},
  authentication: {
    jwtImplementation: [],
    authMiddleware: [],
    authEndpoints: [],
    securityIssues: []
  },
  farming: {
    depositFlow: [],
    balanceManagement: [],
    transactionSystem: [],
    farmingEndpoints: []
  },
  database: {
    supabaseUsage: [],
    tables: new Set(),
    queries: []
  },
  frontend: {
    components: {},
    hooks: [],
    contexts: [],
    pages: []
  },
  api: {
    endpoints: {},
    middleware: [],
    routes: []
  },
  criticalIssues: [],
  recommendations: []
};

// Анализ модулей
function analyzeModules() {
  const modulesDir = 'modules';
  if (!fs.existsSync(modulesDir)) return;
  
  const modules = fs.readdirSync(modulesDir).filter(f => 
    fs.statSync(path.join(modulesDir, f)).isDirectory()
  );
  
  modules.forEach(module => {
    const modulePath = path.join(modulesDir, module);
    const files = fs.readdirSync(modulePath).filter(f => f.endsWith('.ts'));
    
    analysis.modules[module] = {
      files: files,
      hasController: files.includes('controller.ts'),
      hasService: files.includes('service.ts'),
      hasRoutes: files.includes('routes.ts'),
      hasTypes: files.includes('types.ts'),
      hasModel: files.includes('model.ts'),
      endpoints: [],
      functionality: []
    };
    
    // Анализ routes
    const routesPath = path.join(modulePath, 'routes.ts');
    if (fs.existsSync(routesPath)) {
      const content = fs.readFileSync(routesPath, 'utf8');
      const routeMatches = content.matchAll(/router\.(get|post|put|delete|patch)\s*\(\s*["']([^"']+)["']/gi);
      for (const match of routeMatches) {
        analysis.modules[module].endpoints.push({
          method: match[1].toUpperCase(),
          path: match[2]
        });
      }
    }
    
    // Анализ service
    const servicePath = path.join(modulePath, 'service.ts');
    if (fs.existsSync(servicePath)) {
      const content = fs.readFileSync(servicePath, 'utf8');
      const methodMatches = content.matchAll(/async\s+(\w+)\s*\(/g);
      for (const match of methodMatches) {
        analysis.modules[module].functionality.push(match[1]);
      }
    }
  });
}

// Анализ JWT и аутентификации
function analyzeAuthentication() {
  const authPaths = [
    'core/middleware/telegramAuth.ts',
    'modules/auth/service.ts',
    'utils/telegram.ts',
    'client/src/hooks/useAutoAuth.ts'
  ];
  
  authPaths.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // JWT анализ
      if (content.includes('jsonwebtoken')) {
        analysis.authentication.jwtImplementation.push({
          file: filePath,
          hasVerify: content.includes('.verify'),
          hasSign: content.includes('.sign'),
          hasSecret: content.includes('JWT_SECRET')
        });
      }
      
      // Hardcoded токены
      const jwtMatches = content.match(/eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/g);
      if (jwtMatches) {
        analysis.criticalIssues.push({
          type: 'HARDCODED_JWT',
          file: filePath,
          count: jwtMatches.length,
          severity: 'HIGH'
        });
      }
      
      // Fallback user IDs
      const fallbackMatches = content.match(/user_?[iI]d\s*[:=]\s*(74|62|48|43|42)/g);
      if (fallbackMatches) {
        analysis.authentication.securityIssues.push({
          type: 'FALLBACK_USER_ID',
          file: filePath,
          matches: fallbackMatches
        });
      }
    }
  });
}

// Анализ farming функциональности
function analyzeFarming() {
  const farmingPaths = [
    'modules/farming/service.ts',
    'modules/farming/directDeposit.ts',
    'modules/farming/controller.ts',
    'client/src/components/farming/UniFarmingCard.tsx'
  ];
  
  farmingPaths.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      analysis.farming.depositFlow.push({
        file: filePath,
        hasDepositFunction: content.includes('depositUniForFarming'),
        usesBalanceManager: content.includes('BalanceManager'),
        createsTransactions: content.includes('FARMING_DEPOSIT'),
        hasDirectDeposit: content.includes('direct-deposit')
      });
    }
  });
  
  // Анализ BalanceManager
  const balanceManagerPath = 'core/BalanceManager.ts';
  if (fs.existsSync(balanceManagerPath)) {
    const content = fs.readFileSync(balanceManagerPath, 'utf8');
    const methods = content.matchAll(/async\s+(\w+)\s*\(/g);
    
    analysis.farming.balanceManagement = {
      file: balanceManagerPath,
      methods: Array.from(methods).map(m => m[1]),
      usesSupabase: content.includes('supabase'),
      hasValidation: content.includes('validateBalance')
    };
  }
}

// Анализ базы данных
function analyzeDatabase() {
  const dbFiles = [];
  
  function findSupabaseUsage(dir) {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.includes('node_modules')) {
        findSupabaseUsage(filePath);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          if (content.includes('supabase')) {
            // Поиск таблиц
            const tableMatches = content.matchAll(/from\s*\(\s*["'](\w+)["']\s*\)/g);
            for (const match of tableMatches) {
              analysis.database.tables.add(match[1]);
            }
            
            // Поиск операций
            const operations = ['select', 'insert', 'update', 'delete', 'upsert'];
            operations.forEach(op => {
              if (content.includes(`.${op}(`)) {
                analysis.database.queries.push({
                  file: filePath,
                  operation: op
                });
              }
            });
          }
        } catch (e) {
          // Игнорируем ошибки чтения
        }
      }
    });
  }
  
  ['modules', 'core', 'server'].forEach(dir => findSupabaseUsage(dir));
  analysis.database.tables = Array.from(analysis.database.tables);
}

// Анализ frontend
function analyzeFrontend() {
  const componentsDir = 'client/src/components';
  const hooksDir = 'client/src/hooks';
  const contextsDir = 'client/src/contexts';
  const pagesDir = 'client/src/pages';
  
  // Компоненты
  if (fs.existsSync(componentsDir)) {
    function scanComponents(dir, prefix = '') {
      const items = fs.readdirSync(dir);
      items.forEach(item => {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          analysis.frontend.components[prefix + item] = {
            files: fs.readdirSync(itemPath).filter(f => f.endsWith('.tsx')).length
          };
          scanComponents(itemPath, prefix + item + '/');
        }
      });
    }
    scanComponents(componentsDir);
  }
  
  // Hooks
  if (fs.existsSync(hooksDir)) {
    analysis.frontend.hooks = fs.readdirSync(hooksDir)
      .filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));
  }
  
  // Contexts
  if (fs.existsSync(contextsDir)) {
    analysis.frontend.contexts = fs.readdirSync(contextsDir)
      .filter(f => f.endsWith('.tsx'));
  }
  
  // Pages
  if (fs.existsSync(pagesDir)) {
    analysis.frontend.pages = fs.readdirSync(pagesDir)
      .filter(f => f.endsWith('.tsx'));
  }
}

// Анализ API endpoints
function analyzeAPI() {
  const routesPath = 'server/routes.ts';
  if (fs.existsSync(routesPath)) {
    const content = fs.readFileSync(routesPath, 'utf8');
    
    // Поиск импортов модулей
    const moduleImports = content.matchAll(/from\s+["']\.\.\/modules\/(\w+)\/routes["']/g);
    for (const match of moduleImports) {
      analysis.api.routes.push(match[1]);
    }
    
    // Анализ middleware
    const middlewarePath = 'core/middleware';
    if (fs.existsSync(middlewarePath)) {
      analysis.api.middleware = fs.readdirSync(middlewarePath)
        .filter(f => f.endsWith('.ts'))
        .map(f => f.replace('.ts', ''));
    }
  }
}

// Запуск анализа
console.log('📦 Анализирую модули...');
analyzeModules();

console.log('🔐 Анализирую аутентификацию...');
analyzeAuthentication();

console.log('🌾 Анализирую farming систему...');
analyzeFarming();

console.log('💾 Анализирую базу данных...');
analyzeDatabase();

console.log('🖥️  Анализирую frontend...');
analyzeFrontend();

console.log('🌐 Анализирую API...');
analyzeAPI();

// Генерация отчета
console.log('\n' + '=' .repeat(80));
console.log('📊 РЕЗУЛЬТАТЫ ГЛУБОКОГО АНАЛИЗА:\n');

console.log('📦 МОДУЛИ (' + Object.keys(analysis.modules).length + ' найдено):');
Object.entries(analysis.modules).forEach(([name, info]) => {
  if (info.endpoints.length > 0) {
    console.log(`  ${name}:`);
    console.log(`    - Файлы: ${info.files.join(', ')}`);
    console.log(`    - Endpoints: ${info.endpoints.length}`);
    console.log(`    - Функции: ${info.functionality.slice(0, 3).join(', ')}...`);
  }
});

console.log('\n🔐 АУТЕНТИФИКАЦИЯ:');
console.log(`  JWT реализация: ${analysis.authentication.jwtImplementation.length} файлов`);
console.log(`  Проблемы безопасности: ${analysis.authentication.securityIssues.length}`);

console.log('\n🌾 FARMING СИСТЕМА:');
analysis.farming.depositFlow.forEach(flow => {
  if (flow.hasDepositFunction) {
    console.log(`  ✅ ${path.basename(flow.file)}:`);
    console.log(`     - BalanceManager: ${flow.usesBalanceManager ? '✅' : '❌'}`);
    console.log(`     - Транзакции: ${flow.createsTransactions ? '✅' : '❌'}`);
  }
});

console.log('\n💾 БАЗА ДАННЫХ:');
console.log(`  Используемые таблицы: ${analysis.database.tables.join(', ')}`);
console.log(`  Всего запросов: ${analysis.database.queries.length}`);

console.log('\n🖥️  FRONTEND:');
console.log(`  Компоненты: ${Object.keys(analysis.frontend.components).length} директорий`);
console.log(`  Hooks: ${analysis.frontend.hooks.length}`);
console.log(`  Contexts: ${analysis.frontend.contexts.length}`);
console.log(`  Pages: ${analysis.frontend.pages.length}`);

console.log('\n🌐 API:');
console.log(`  Модули с routes: ${analysis.api.routes.join(', ')}`);
console.log(`  Middleware: ${analysis.api.middleware.join(', ')}`);

if (analysis.criticalIssues.length > 0) {
  console.log('\n🚨 КРИТИЧЕСКИЕ ПРОБЛЕМЫ:');
  analysis.criticalIssues.forEach(issue => {
    console.log(`  ❗ ${issue.type} в ${issue.file} (${issue.severity})`);
  });
}

// Рекомендации
console.log('\n💡 РЕКОМЕНДАЦИИ:');
if (analysis.criticalIssues.some(i => i.type === 'HARDCODED_JWT')) {
  console.log('  1. Удалить все hardcoded JWT токены из кода');
}
if (analysis.authentication.securityIssues.length > 0) {
  console.log('  2. Убрать fallback user IDs из production кода');
}
console.log('  3. Обновить Node.js до версии 20.x для лучшей производительности');
console.log('  4. Добавить автоматизированные тесты для критических функций');

// Сохранение отчета
fs.writeFileSync(
  path.join(__dirname, 'unifarm-deep-analysis.json'),
  JSON.stringify(analysis, null, 2)
);

console.log('\n✅ Детальный отчет сохранен в tools/analyzer/unifarm-deep-analysis.json');