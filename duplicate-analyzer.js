
#!/usr/bin/env node

/**
 * КОМПЛЕКСНЫЙ АНАЛИЗАТОР ДУБЛИКАТОВ UNIFARM
 * Этап 1: Анализ файловой структуры и кода
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Конфигурация для анализа
const CONFIG = {
  scanDirectories: ['./server', './client', './shared'],
  fileExtensions: ['.ts', '.tsx', '.js', '.jsx'],
  suspiciousPatterns: [
    'backup', 'bak', 'old', 'new', 'fixed', 'consolidated', 
    'original', 'temp', 'tmp', 'copy', 'duplicate', '_old', 
    '_new', '_backup', '_copy', '.backup', '.old'
  ],
  controllerPatterns: [
    'Controller', 'ControllerConsolidated', 'ControllerFixed', 
    'ControllerFallback', 'ControllerNew'
  ],
  servicePatterns: [
    'Service', 'ServiceInstance', 'ServiceFixed', 'ServiceNew',
    'ServiceOriginal'
  ]
};

class DuplicateAnalyzer {
  constructor() {
    this.results = {
      identicalFiles: [],
      suspiciousFiles: [],
      functionalDuplicates: [],
      namingInconsistencies: [],
      statistics: {
        totalFiles: 0,
        duplicatesByContent: 0,
        duplicatesByPattern: 0,
        duplicatesByFunction: 0
      }
    };
  }

  // Получение всех файлов для анализа
  getAllFiles() {
    const allFiles = [];
    
    CONFIG.scanDirectories.forEach(dir => {
      if (fs.existsSync(dir)) {
        this.scanDirectory(dir, allFiles);
      } else {
        log(`⚠️  Директория ${dir} не существует`, 'yellow');
      }
    });
    
    return allFiles.filter(file => 
      CONFIG.fileExtensions.some(ext => file.endsWith(ext))
    );
  }

  scanDirectory(dir, fileList) {
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          this.scanDirectory(fullPath, fileList);
        } else if (stat.isFile()) {
          fileList.push(fullPath);
        }
      }
    } catch (error) {
      log(`⚠️  Ошибка чтения директории ${dir}: ${error.message}`, 'yellow');
    }
  }

  // Вычисление хеша файла
  getFileHash(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      // Нормализуем содержимое: удаляем комментарии и лишние пробелы
      const normalized = content
        .replace(/\/\*[\s\S]*?\*\//g, '') // блочные комментарии
        .replace(/\/\/.*$/gm, '') // строчные комментарии
        .replace(/\s+/g, ' ') // множественные пробелы
        .trim();
      
      return crypto.createHash('md5').update(normalized).digest('hex');
    } catch (error) {
      return null;
    }
  }

  // Анализ содержимого файла
  analyzeFileContent(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      return {
        functions: this.extractFunctions(content),
        imports: this.extractImports(content),
        exports: this.extractExports(content),
        classes: this.extractClasses(content),
        lineCount: content.split('\n').length,
        size: content.length
      };
    } catch (error) {
      return null;
    }
  }

  extractFunctions(content) {
    const functionRegex = /(?:function\s+(\w+)|(\w+)\s*[:=]\s*(?:function|\([^)]*\)\s*=>)|async\s+function\s+(\w+)|static\s+async\s+(\w+)|static\s+(\w+))/g;
    const functions = [];
    let match;
    
    while ((match = functionRegex.exec(content)) !== null) {
      const funcName = match[1] || match[2] || match[3] || match[4] || match[5];
      if (funcName) {
        functions.push(funcName);
      }
    }
    
    return functions;
  }

  extractImports(content) {
    const importRegex = /import\s+.*?from\s+['"`]([^'"`]+)['"`]/g;
    const imports = [];
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    return imports;
  }

  extractExports(content) {
    const exportRegex = /export\s+(?:default\s+)?(?:class\s+(\w+)|function\s+(\w+)|const\s+(\w+)|let\s+(\w+)|var\s+(\w+))/g;
    const exports = [];
    let match;
    
    while ((match = exportRegex.exec(content)) !== null) {
      const exportName = match[1] || match[2] || match[3] || match[4] || match[5];
      if (exportName) {
        exports.push(exportName);
      }
    }
    
    return exports;
  }

  extractClasses(content) {
    const classRegex = /class\s+(\w+)/g;
    const classes = [];
    let match;
    
    while ((match = classRegex.exec(content)) !== null) {
      classes.push(match[1]);
    }
    
    return classes;
  }

  // Поиск идентичных файлов по содержимому
  findIdenticalFiles(files) {
    log('\n🔍 Поиск идентичных файлов по содержимому...', 'cyan');
    
    const hashMap = new Map();
    
    files.forEach(file => {
      const hash = this.getFileHash(file);
      if (hash) {
        if (!hashMap.has(hash)) {
          hashMap.set(hash, []);
        }
        hashMap.get(hash).push(file);
      }
    });
    
    // Находим группы с более чем одним файлом
    hashMap.forEach((fileList, hash) => {
      if (fileList.length > 1) {
        this.results.identicalFiles.push({
          hash,
          files: fileList,
          type: 'identical_content'
        });
        this.results.statistics.duplicatesByContent += fileList.length - 1;
      }
    });
    
    log(`✅ Найдено ${this.results.identicalFiles.length} групп идентичных файлов`, 'green');
  }

  // Поиск подозрительных файлов по именам
  findSuspiciousFiles(files) {
    log('\n🔍 Поиск подозрительных файлов по именам...', 'cyan');
    
    files.forEach(file => {
      const basename = path.basename(file);
      const suspicious = CONFIG.suspiciousPatterns.some(pattern => 
        basename.toLowerCase().includes(pattern.toLowerCase())
      );
      
      if (suspicious) {
        this.results.suspiciousFiles.push({
          file,
          reason: 'suspicious_naming',
          pattern: CONFIG.suspiciousPatterns.find(p => 
            basename.toLowerCase().includes(p.toLowerCase())
          )
        });
        this.results.statistics.duplicatesByPattern++;
      }
    });
    
    log(`✅ Найдено ${this.results.suspiciousFiles.length} подозрительных файлов`, 'green');
  }

  // Поиск функциональных дубликатов
  findFunctionalDuplicates(files) {
    log('\n🔍 Поиск функциональных дубликатов...', 'cyan');
    
    const contentMap = new Map();
    
    files.forEach(file => {
      const analysis = this.analyzeFileContent(file);
      if (analysis) {
        const key = JSON.stringify({
          functions: analysis.functions.sort(),
          exports: analysis.exports.sort(),
          classes: analysis.classes.sort()
        });
        
        if (!contentMap.has(key)) {
          contentMap.set(key, []);
        }
        contentMap.get(key).push({ file, analysis });
      }
    });
    
    // Находим потенциальные функциональные дубликаты
    contentMap.forEach((fileList, key) => {
      if (fileList.length > 1) {
        // Дополнительная проверка на схожесть
        const similarity = this.calculateSimilarity(fileList);
        if (similarity > 0.8) {
          this.results.functionalDuplicates.push({
            files: fileList.map(item => item.file),
            similarity,
            type: 'functional_duplicate',
            functions: fileList[0].analysis.functions
          });
          this.results.statistics.duplicatesByFunction += fileList.length - 1;
        }
      }
    });
    
    log(`✅ Найдено ${this.results.functionalDuplicates.length} групп функциональных дубликатов`, 'green');
  }

  calculateSimilarity(fileList) {
    if (fileList.length < 2) return 0;
    
    const first = fileList[0].analysis;
    let totalSimilarity = 0;
    
    for (let i = 1; i < fileList.length; i++) {
      const current = fileList[i].analysis;
      const similarity = this.compareFunctionSets(first.functions, current.functions);
      totalSimilarity += similarity;
    }
    
    return totalSimilarity / (fileList.length - 1);
  }

  compareFunctionSets(set1, set2) {
    const intersection = set1.filter(func => set2.includes(func));
    const union = [...new Set([...set1, ...set2])];
    
    return union.length > 0 ? intersection.length / union.length : 0;
  }

  // Поиск несоответствий в именовании
  findNamingInconsistencies(files) {
    log('\n🔍 Анализ несоответствий в именовании...', 'cyan');
    
    const groupsByType = {
      controllers: [],
      services: [],
      components: []
    };
    
    files.forEach(file => {
      const basename = path.basename(file);
      
      if (CONFIG.controllerPatterns.some(p => basename.includes(p))) {
        groupsByType.controllers.push(file);
      } else if (CONFIG.servicePatterns.some(p => basename.includes(p))) {
        groupsByType.services.push(file);
      } else if (file.includes('/components/') && basename.endsWith('.tsx')) {
        groupsByType.components.push(file);
      }
    });
    
    // Анализируем каждую группу
    Object.keys(groupsByType).forEach(type => {
      this.analyzeNamingGroup(groupsByType[type], type);
    });
    
    log(`✅ Найдено ${this.results.namingInconsistencies.length} несоответствий в именовании`, 'green');
  }

  analyzeNamingGroup(files, type) {
    const nameMap = new Map();
    
    files.forEach(file => {
      const basename = path.basename(file, path.extname(file));
      const baseName = this.extractBaseName(basename);
      
      if (!nameMap.has(baseName)) {
        nameMap.set(baseName, []);
      }
      nameMap.get(baseName).push(file);
    });
    
    nameMap.forEach((fileList, baseName) => {
      if (fileList.length > 1) {
        this.results.namingInconsistencies.push({
          baseName,
          type,
          files: fileList,
          reason: 'multiple_versions'
        });
      }
    });
  }

  extractBaseName(filename) {
    // Удаляем суффиксы типа Controller, Service, Instance и т.д.
    return filename
      .replace(/Controller.*$/, '')
      .replace(/Service.*$/, '')
      .replace(/Instance$/, '')
      .replace(/Fixed$/, '')
      .replace(/Consolidated$/, '')
      .replace(/New$/, '')
      .replace(/Original$/, '');
  }

  // Генерация отчета
  generateReport() {
    log('\n📊 ОТЧЕТ ПО АНАЛИЗУ ДУБЛИКАТОВ', 'magenta');
    log('='.repeat(50), 'magenta');
    
    // Статистика
    log('\n📈 ОБЩАЯ СТАТИСТИКА:', 'cyan');
    log(`Всего файлов проанализировано: ${this.results.statistics.totalFiles}`, 'white');
    log(`Дубликатов по содержимому: ${this.results.statistics.duplicatesByContent}`, 'white');
    log(`Подозрительных файлов: ${this.results.statistics.duplicatesByPattern}`, 'white');
    log(`Функциональных дубликатов: ${this.results.statistics.duplicatesByFunction}`, 'white');
    
    // Идентичные файлы
    if (this.results.identicalFiles.length > 0) {
      log('\n🔴 ИДЕНТИЧНЫЕ ФАЙЛЫ ПО СОДЕРЖИМОМУ:', 'red');
      this.results.identicalFiles.forEach((group, index) => {
        log(`\n${index + 1}. Группа идентичных файлов:`, 'yellow');
        group.files.forEach(file => {
          log(`   - ${file}`, 'white');
        });
      });
    }
    
    // Подозрительные файлы
    if (this.results.suspiciousFiles.length > 0) {
      log('\n🟡 ПОДОЗРИТЕЛЬНЫЕ ФАЙЛЫ:', 'yellow');
      this.results.suspiciousFiles.forEach((item, index) => {
        log(`${index + 1}. ${item.file}`, 'white');
        log(`   Паттерн: ${item.pattern}`, 'yellow');
      });
    }
    
    // Функциональные дубликаты
    if (this.results.functionalDuplicates.length > 0) {
      log('\n🟠 ФУНКЦИОНАЛЬНЫЕ ДУБЛИКАТЫ:', 'cyan');
      this.results.functionalDuplicates.forEach((group, index) => {
        log(`\n${index + 1}. Схожесть: ${(group.similarity * 100).toFixed(1)}%`, 'yellow');
        group.files.forEach(file => {
          log(`   - ${file}`, 'white');
        });
        if (group.functions.length > 0) {
          log(`   Общие функции: ${group.functions.slice(0, 5).join(', ')}${group.functions.length > 5 ? '...' : ''}`, 'cyan');
        }
      });
    }
    
    // Несоответствия в именовании
    if (this.results.namingInconsistencies.length > 0) {
      log('\n🔵 НЕСООТВЕТСТВИЯ В ИМЕНОВАНИИ:', 'blue');
      this.results.namingInconsistencies.forEach((group, index) => {
        log(`\n${index + 1}. ${group.type}: ${group.baseName}`, 'yellow');
        group.files.forEach(file => {
          log(`   - ${file}`, 'white');
        });
      });
    }
    
    // Рекомендации
    this.generateRecommendations();
  }

  generateRecommendations() {
    log('\n💡 РЕКОМЕНДАЦИИ ПО УСТРАНЕНИЮ ДУБЛИКАТОВ:', 'green');
    log('='.repeat(50), 'green');
    
    let priority = 1;
    
    if (this.results.identicalFiles.length > 0) {
      log(`\n${priority}. КРИТИЧНО - Удалить идентичные файлы:`, 'red');
      this.results.identicalFiles.forEach(group => {
        log(`   Рекомендуется оставить: ${group.files[0]}`, 'green');
        log(`   Удалить: ${group.files.slice(1).join(', ')}`, 'red');
      });
      priority++;
    }
    
    if (this.results.suspiciousFiles.length > 0) {
      log(`\n${priority}. ВЫСОКО - Проверить подозрительные файлы:`, 'yellow');
      this.results.suspiciousFiles.forEach(item => {
        log(`   Проверить: ${item.file}`, 'white');
      });
      priority++;
    }
    
    if (this.results.functionalDuplicates.length > 0) {
      log(`\n${priority}. СРЕДНЕ - Консолидировать функциональные дубликаты:`, 'cyan');
      this.results.functionalDuplicates.forEach(group => {
        log(`   Объединить функциональность файлов с схожестью ${(group.similarity * 100).toFixed(1)}%`, 'white');
      });
      priority++;
    }
    
    if (this.results.namingInconsistencies.length > 0) {
      log(`\n${priority}. НИЗКО - Стандартизировать именование:`, 'blue');
      log(`   Использовать единые соглашения об именовании для всех типов файлов`, 'white');
    }
  }

  // Основной метод запуска анализа
  async analyze() {
    log('🚀 ЗАПУСК КОМПЛЕКСНОГО АНАЛИЗА ДУБЛИКАТОВ UNIFARM', 'magenta');
    log('='.repeat(60), 'magenta');
    
    // Получаем все файлы
    const files = this.getAllFiles();
    this.results.statistics.totalFiles = files.length;
    
    log(`\n📁 Найдено ${files.length} файлов для анализа`, 'cyan');
    
    // Запускаем анализы
    this.findIdenticalFiles(files);
    this.findSuspiciousFiles(files);
    this.findFunctionalDuplicates(files);
    this.findNamingInconsistencies(files);
    
    // Генерируем отчет
    this.generateReport();
    
    // Обновляем план
    this.updateProgress();
  }

  updateProgress() {
    log('\n✅ ЭТАП 1.1 ЗАВЕРШЕН: Проверка дубликатов файлов по содержимому', 'green');
    log('🔄 Переход к ЭТАПУ 1.2: Анализ дублирующихся функций и методов', 'yellow');
  }
}

// Запуск анализа
const analyzer = new DuplicateAnalyzer();
analyzer.analyze().catch(error => {
  log(`❌ Ошибка при анализе: ${error.message}`, 'red');
  process.exit(1);
});
