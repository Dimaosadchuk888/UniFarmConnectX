import fs from 'fs';
import path from 'path';

// Анализ структуры проекта
const projectStructure = {
  modules: {},
  core: {},
  duplicates: [],
  circularDeps: [],
  largeFiles: [],
  issues: []
};

// Рекурсивный обход директорий
function analyzeDirectory(dir, basePath = '') {
  try {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.includes('node_modules') && !file.startsWith('.')) {
        analyzeDirectory(filePath, path.join(basePath, file));
      } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx'))) {
        // Анализ размера файла
        if (stat.size > 10000) { // Больше 10KB
          projectStructure.largeFiles.push({
            path: path.join(basePath, file),
            size: Math.round(stat.size / 1024) + 'KB'
          });
        }
        
        // Анализ импортов
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const imports = content.match(/import .* from ['"](.+)['"]/g) || [];
          
          // Проверка на циклические зависимости (упрощенная)
          imports.forEach(imp => {
            const importPath = imp.match(/from ['"](.+)['"]/)?.[1];
            if (importPath && importPath.includes('../') && importPath.includes(basePath.split('/')[0])) {
              projectStructure.circularDeps.push({
                file: path.join(basePath, file),
                imports: importPath
              });
            }
          });
          
          // Сбор статистики по модулям
          const moduleMatch = basePath.match(/^(modules|core)\/([^/]+)/);
          if (moduleMatch) {
            const [, type, module] = moduleMatch;
            if (!projectStructure[type][module]) {
              projectStructure[type][module] = {
                files: 0,
                lines: 0,
                imports: new Set()
              };
            }
            projectStructure[type][module].files++;
            projectStructure[type][module].lines += content.split('\n').length;
            imports.forEach(imp => {
              const importPath = imp.match(/from ['"](.+)['"]/)?.[1];
              if (importPath && !importPath.includes('node_modules')) {
                projectStructure[type][module].imports.add(importPath);
              }
            });
          }
        } catch (e) {
          // Игнорируем ошибки чтения файлов
        }
      }
    });
  } catch (e) {
    console.error(`Ошибка при анализе директории ${dir}:`, e.message);
  }
}

// Запуск анализа
console.log('🔍 Начинаем анализ проекта UniFarm...\n');

// Анализ основных директорий
['modules', 'core', 'client/src', 'server', 'utils', 'types'].forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`📁 Анализируем ${dir}...`);
    analyzeDirectory(dir);
  }
});

// Вывод результатов
console.log('\n📊 РЕЗУЛЬТАТЫ АНАЛИЗА:\n');

// Модули
console.log('📦 МОДУЛИ:');
Object.entries(projectStructure.modules).forEach(([name, data]) => {
  console.log(`  - ${name}: ${data.files} файлов, ${data.lines} строк, ${data.imports.size} внешних импортов`);
});

console.log('\n🔧 CORE КОМПОНЕНТЫ:');
Object.entries(projectStructure.core).forEach(([name, data]) => {
  console.log(`  - ${name}: ${data.files} файлов, ${data.lines} строк`);
});

console.log('\n📏 БОЛЬШИЕ ФАЙЛЫ (>10KB):');
projectStructure.largeFiles.slice(0, 10).forEach(file => {
  console.log(`  - ${file.path}: ${file.size}`);
});

if (projectStructure.circularDeps.length > 0) {
  console.log('\n⚠️  ПОТЕНЦИАЛЬНЫЕ ЦИКЛИЧЕСКИЕ ЗАВИСИМОСТИ:');
  projectStructure.circularDeps.slice(0, 5).forEach(dep => {
    console.log(`  - ${dep.file} импортирует ${dep.imports}`);
  });
}

// Проверка критических файлов
console.log('\n🔍 ПРОВЕРКА КРИТИЧЕСКИХ КОМПОНЕНТОВ:');
const criticalFiles = [
  'core/BalanceManager.ts',
  'modules/farming/directDeposit.ts',
  'modules/farming/service.ts',
  'client/src/components/farming/UniFarmingCard.tsx'
];

criticalFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const stat = fs.statSync(file);
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n').length;
    console.log(`  ✅ ${file}: ${lines} строк, ${Math.round(stat.size / 1024)}KB`);
  } else {
    console.log(`  ❌ ${file}: НЕ НАЙДЕН`);
  }
});

// Сохранение отчета
const report = {
  timestamp: new Date().toISOString(),
  structure: projectStructure,
  summary: {
    totalModules: Object.keys(projectStructure.modules).length,
    totalCoreComponents: Object.keys(projectStructure.core).length,
    largeFiles: projectStructure.largeFiles.length,
    potentialIssues: projectStructure.circularDeps.length
  }
};

fs.writeFileSync('tools/analyzer/project-analysis-report.json', JSON.stringify(report, null, 2));
console.log('\n✅ Отчет сохранен в tools/analyzer/project-analysis-report.json');