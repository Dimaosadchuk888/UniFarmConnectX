
#!/usr/bin/env node

/**
 * АНАЛИЗАТОР ДУБЛИРУЮЩИХСЯ ФУНКЦИЙ И МЕТОДОВ UNIFARM
 * Этап 1.2: Глубокий анализ функций, методов и бизнес-логики
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

const CONFIG = {
  scanDirectories: ['./server', './client', './shared'],
  fileExtensions: ['.ts', '.tsx', '.js', '.jsx'],
  controllerDirs: ['./server/controllers'],
  serviceDirs: ['./server/services'],
  utilsDirs: ['./server/utils', './client/src/utils', './client/src/lib'],
  minFunctionLength: 10, // минимальная длина функции для анализа
  similarityThreshold: 0.85 // порог схожести для определения дубликатов
};

class FunctionDuplicateAnalyzer {
  constructor() {
    this.results = {
      duplicateFunctions: [],
      duplicateMethods: [],
      duplicateBusinessLogic: [],
      duplicateValidations: [],
      duplicateUtilities: [],
      statistics: {
        totalFunctions: 0,
        functionalDuplicates: 0,
        methodDuplicates: 0,
        businessLogicDuplicates: 0
      }
    };
    this.functionMap = new Map();
    this.methodMap = new Map();
    this.classMap = new Map();
  }

  // Получение всех файлов для анализа
  getAllFiles() {
    const allFiles = [];
    
    CONFIG.scanDirectories.forEach(dir => {
      if (fs.existsSync(dir)) {
        this.scanDirectory(dir, allFiles);
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

  // Извлечение функций из файла
  extractFunctions(content, filePath) {
    const functions = [];
    
    // Паттерны для поиска функций
    const patterns = [
      // Обычные функции
      /function\s+(\w+)\s*\([^)]*\)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g,
      // Стрелочные функции
      /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g,
      // Методы объектов
      /(\w+)\s*:\s*(?:async\s+)?function\s*\([^)]*\)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g,
      // Методы классов
      /(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const [fullMatch, name, body] = match;
        
        if (name && body && body.trim().length >= CONFIG.minFunctionLength) {
          const normalizedBody = this.normalizeCode(body);
          const hash = crypto.createHash('md5').update(normalizedBody).digest('hex');
          
          functions.push({
            name,
            body: body.trim(),
            normalizedBody,
            hash,
            file: filePath,
            startIndex: match.index,
            length: fullMatch.length,
            signature: this.extractSignature(fullMatch)
          });
        }
      }
    });

    return functions;
  }

  // Нормализация кода для сравнения
  normalizeCode(code) {
    return code
      .replace(/\/\*[\s\S]*?\*\//g, '') // блочные комментарии
      .replace(/\/\/.*$/gm, '') // строчные комментарии
      .replace(/\s+/g, ' ') // множественные пробелы
      .replace(/;?\s*$/gm, '') // точки с запятой в конце строк
      .replace(/console\.log\([^)]*\);?/g, '') // console.log
      .trim()
      .toLowerCase();
  }

  // Извлечение сигнатуры функции
  extractSignature(functionCode) {
    const signatureMatch = functionCode.match(/^[^{]*/);
    return signatureMatch ? signatureMatch[0].trim() : '';
  }

  // Извлечение методов классов
  extractClassMethods(content, filePath) {
    const methods = [];
    const classRegex = /class\s+(\w+).*?\{([\s\S]*?)\}/g;
    
    let classMatch;
    while ((classMatch = classRegex.exec(content)) !== null) {
      const [, className, classBody] = classMatch;
      
      // Поиск методов в классе
      const methodRegex = /(?:static\s+)?(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
      
      let methodMatch;
      while ((methodMatch = methodRegex.exec(classBody)) !== null) {
        const [fullMatch, methodName, methodBody] = methodMatch;
        
        if (methodBody && methodBody.trim().length >= CONFIG.minFunctionLength) {
          const normalizedBody = this.normalizeCode(methodBody);
          const hash = crypto.createHash('md5').update(normalizedBody).digest('hex');
          
          methods.push({
            className,
            methodName,
            body: methodBody.trim(),
            normalizedBody,
            hash,
            file: filePath,
            signature: this.extractSignature(fullMatch),
            fullName: `${className}.${methodName}`
          });
        }
      }
    }

    return methods;
  }

  // Поиск дублирующихся функций
  findDuplicateFunctions(files) {
    log('\n🔍 Поиск дублирующихся функций...', 'cyan');
    
    const functionGroups = new Map();
    
    files.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const functions = this.extractFunctions(content, file);
        
        functions.forEach(func => {
          if (!functionGroups.has(func.hash)) {
            functionGroups.set(func.hash, []);
          }
          functionGroups.get(func.hash).push(func);
        });
        
        this.results.statistics.totalFunctions += functions.length;
      } catch (error) {
        log(`⚠️  Ошибка анализа файла ${file}: ${error.message}`, 'yellow');
      }
    });

    // Находим группы с дубликатами
    functionGroups.forEach((funcList, hash) => {
      if (funcList.length > 1) {
        // Дополнительная проверка на схожесть имен и контекста
        const similarity = this.calculateFunctionSimilarity(funcList);
        
        if (similarity >= CONFIG.similarityThreshold) {
          this.results.duplicateFunctions.push({
            hash,
            functions: funcList,
            similarity,
            type: 'identical_logic'
          });
          this.results.statistics.functionalDuplicates += funcList.length - 1;
        }
      }
    });

    log(`✅ Найдено ${this.results.duplicateFunctions.length} групп дублирующихся функций`, 'green');
  }

  // Поиск дублирующихся методов классов
  findDuplicateMethods(files) {
    log('\n🔍 Поиск дублирующихся методов классов...', 'cyan');
    
    const methodGroups = new Map();
    
    files.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const methods = this.extractClassMethods(content, file);
        
        methods.forEach(method => {
          if (!methodGroups.has(method.hash)) {
            methodGroups.set(method.hash, []);
          }
          methodGroups.get(method.hash).push(method);
        });
      } catch (error) {
        log(`⚠️  Ошибка анализа методов в файле ${file}: ${error.message}`, 'yellow');
      }
    });

    // Находим дубликаты методов
    methodGroups.forEach((methodList, hash) => {
      if (methodList.length > 1) {
        this.results.duplicateMethods.push({
          hash,
          methods: methodList,
          type: 'identical_method_logic'
        });
        this.results.statistics.methodDuplicates += methodList.length - 1;
      }
    });

    log(`✅ Найдено ${this.results.duplicateMethods.length} групп дублирующихся методов`, 'green');
  }

  // Поиск дублирующейся бизнес-логики
  findDuplicateBusinessLogic(files) {
    log('\n🔍 Поиск дублирующейся бизнес-логики...', 'cyan');
    
    const businessLogicPatterns = [
      // Паттерны для валидации
      /(?:if|when|unless).*(?:email|password|username|telegram|user).*(?:valid|invalid|check|verify)/i,
      // Паттерны для расчетов
      /(?:calculate|compute|sum|total|bonus|reward|income|balance)/i,
      // Паттерны для API запросов
      /(?:fetch|get|post|put|delete|request|response|api|endpoint)/i,
      // Паттерны для базы данных
      /(?:select|insert|update|delete|query|transaction|db|database)/i
    ];

    const logicGroups = new Map();
    
    files.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        
        businessLogicPatterns.forEach((pattern, index) => {
          const matches = content.match(new RegExp(pattern.source, 'gi'));
          if (matches && matches.length > 0) {
            const key = `pattern_${index}_${matches.length}`;
            if (!logicGroups.has(key)) {
              logicGroups.set(key, []);
            }
            logicGroups.get(key).push({
              file,
              pattern: pattern.source,
              matches: matches.length,
              examples: matches.slice(0, 3)
            });
          }
        });
      } catch (error) {
        log(`⚠️  Ошибка анализа бизнес-логики в файле ${file}: ${error.message}`, 'yellow');
      }
    });

    // Анализируем группы на дубликаты
    logicGroups.forEach((fileList, key) => {
      if (fileList.length > 1) {
        this.results.duplicateBusinessLogic.push({
          pattern: fileList[0].pattern,
          files: fileList,
          type: 'business_logic_duplication'
        });
        this.results.statistics.businessLogicDuplicates++;
      }
    });

    log(`✅ Найдено ${this.results.duplicateBusinessLogic.length} групп дублирующейся бизнес-логики`, 'green');
  }

  // Поиск дублирующихся валидаций
  findDuplicateValidations(files) {
    log('\n🔍 Поиск дублирующихся валидаций...', 'cyan');
    
    const validationPatterns = [
      // Email валидация
      /(?:email|mail).*(?:valid|check|verify|test|match|regex)/i,
      // Password валидация
      /(?:password|pwd).*(?:valid|check|verify|length|strong|weak)/i,
      // Telegram валидация
      /(?:telegram|tg).*(?:valid|check|verify|id|username)/i,
      // Число валидация
      /(?:number|numeric|digit|integer|float).*(?:valid|check|verify|range|min|max)/i
    ];

    this.findPatternDuplicates(files, validationPatterns, 'duplicateValidations', 'validation');
  }

  // Поиск дублирующихся утилит
  findDuplicateUtilities(files) {
    log('\n🔍 Поиск дублирующихся утилитарных функций...', 'cyan');
    
    const utilityPatterns = [
      // Форматирование
      /(?:format|parse|convert|transform|stringify|serialize)/i,
      // Дата/время
      /(?:date|time|moment|timestamp|duration|interval)/i,
      // Строки
      /(?:string|text|trim|split|join|replace|match)/i,
      // Массивы
      /(?:array|list|sort|filter|map|reduce|find|some|every)/i
    ];

    this.findPatternDuplicates(files, utilityPatterns, 'duplicateUtilities', 'utility');
  }

  // Общий метод для поиска дубликатов по паттернам
  findPatternDuplicates(files, patterns, resultKey, type) {
    const patternGroups = new Map();
    
    files.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const functions = this.extractFunctions(content, file);
        
        functions.forEach(func => {
          patterns.forEach((pattern, index) => {
            if (pattern.test(func.body)) {
              const key = `${type}_pattern_${index}`;
              if (!patternGroups.has(key)) {
                patternGroups.set(key, []);
              }
              patternGroups.get(key).push({
                ...func,
                patternIndex: index,
                patternSource: pattern.source
              });
            }
          });
        });
      } catch (error) {
        log(`⚠️  Ошибка анализа ${type} в файле ${file}: ${error.message}`, 'yellow');
      }
    });

    // Группируем по схожести
    patternGroups.forEach((funcList, key) => {
      if (funcList.length > 1) {
        // Дополнительная проверка на схожесть кода
        const groups = this.groupBySimilarity(funcList);
        groups.forEach(group => {
          if (group.length > 1) {
            this.results[resultKey].push({
              pattern: group[0].patternSource,
              functions: group,
              type: `${type}_duplication`
            });
          }
        });
      }
    });

    log(`✅ Найдено ${this.results[resultKey].length} групп дублирующихся ${type}`, 'green');
  }

  // Группировка функций по схожести
  groupBySimilarity(functions) {
    const groups = [];
    const processed = new Set();
    
    functions.forEach((func, i) => {
      if (processed.has(i)) return;
      
      const group = [func];
      processed.add(i);
      
      for (let j = i + 1; j < functions.length; j++) {
        if (processed.has(j)) continue;
        
        const similarity = this.calculateCodeSimilarity(func.normalizedBody, functions[j].normalizedBody);
        if (similarity >= CONFIG.similarityThreshold) {
          group.push(functions[j]);
          processed.add(j);
        }
      }
      
      if (group.length > 1) {
        groups.push(group);
      }
    });
    
    return groups;
  }

  // Расчет схожести кода
  calculateCodeSimilarity(code1, code2) {
    const words1 = code1.split(/\s+/);
    const words2 = code2.split(/\s+/);
    
    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];
    
    return union.length > 0 ? intersection.length / union.length : 0;
  }

  // Расчет схожести функций
  calculateFunctionSimilarity(functions) {
    if (functions.length < 2) return 0;
    
    let totalSimilarity = 0;
    let comparisons = 0;
    
    for (let i = 0; i < functions.length; i++) {
      for (let j = i + 1; j < functions.length; j++) {
        const similarity = this.calculateCodeSimilarity(
          functions[i].normalizedBody,
          functions[j].normalizedBody
        );
        totalSimilarity += similarity;
        comparisons++;
      }
    }
    
    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  // Генерация отчета
  generateReport() {
    log('\n📊 ОТЧЕТ ПО АНАЛИЗУ ДУБЛИРУЮЩИХСЯ ФУНКЦИЙ', 'magenta');
    log('='.repeat(60), 'magenta');
    
    // Статистика
    log('\n📈 ОБЩАЯ СТАТИСТИКА:', 'cyan');
    log(`Всего функций проанализировано: ${this.results.statistics.totalFunctions}`, 'white');
    log(`Функциональных дубликатов: ${this.results.statistics.functionalDuplicates}`, 'white');
    log(`Дубликатов методов: ${this.results.statistics.methodDuplicates}`, 'white');
    log(`Дубликатов бизнес-логики: ${this.results.statistics.businessLogicDuplicates}`, 'white');
    
    // Дублирующиеся функции
    if (this.results.duplicateFunctions.length > 0) {
      log('\n🔴 ДУБЛИРУЮЩИЕСЯ ФУНКЦИИ:', 'red');
      this.results.duplicateFunctions.forEach((group, index) => {
        log(`\n${index + 1}. Схожесть: ${(group.similarity * 100).toFixed(1)}%`, 'yellow');
        group.functions.forEach(func => {
          log(`   - ${func.name} в ${func.file}`, 'white');
          log(`     Сигнатура: ${func.signature}`, 'cyan');
        });
      });
    }
    
    // Дублирующиеся методы
    if (this.results.duplicateMethods.length > 0) {
      log('\n🟠 ДУБЛИРУЮЩИЕСЯ МЕТОДЫ КЛАССОВ:', 'yellow');
      this.results.duplicateMethods.forEach((group, index) => {
        log(`\n${index + 1}. Идентичные методы:`, 'yellow');
        group.methods.forEach(method => {
          log(`   - ${method.fullName} в ${method.file}`, 'white');
          log(`     Сигнатура: ${method.signature}`, 'cyan');
        });
      });
    }
    
    // Дублирующаяся бизнес-логика
    if (this.results.duplicateBusinessLogic.length > 0) {
      log('\n🔵 ДУБЛИРУЮЩАЯСЯ БИЗНЕС-ЛОГИКА:', 'blue');
      this.results.duplicateBusinessLogic.forEach((group, index) => {
        log(`\n${index + 1}. Паттерн: ${group.pattern}`, 'yellow');
        group.files.forEach(item => {
          log(`   - ${item.file} (${item.matches} совпадений)`, 'white');
        });
      });
    }
    
    // Дублирующиеся валидации
    if (this.results.duplicateValidations.length > 0) {
      log('\n🟣 ДУБЛИРУЮЩИЕСЯ ВАЛИДАЦИИ:', 'magenta');
      this.results.duplicateValidations.forEach((group, index) => {
        log(`\n${index + 1}. Паттерн валидации: ${group.pattern}`, 'yellow');
        group.functions.forEach(func => {
          log(`   - ${func.name} в ${func.file}`, 'white');
        });
      });
    }
    
    // Дублирующиеся утилиты
    if (this.results.duplicateUtilities.length > 0) {
      log('\n🟢 ДУБЛИРУЮЩИЕСЯ УТИЛИТАРНЫЕ ФУНКЦИИ:', 'green');
      this.results.duplicateUtilities.forEach((group, index) => {
        log(`\n${index + 1}. Тип утилиты: ${group.pattern}`, 'yellow');
        group.functions.forEach(func => {
          log(`   - ${func.name} в ${func.file}`, 'white');
        });
      });
    }
    
    // Рекомендации
    this.generateRecommendations();
  }

  generateRecommendations() {
    log('\n💡 РЕКОМЕНДАЦИИ ПО УСТРАНЕНИЮ ФУНКЦИОНАЛЬНЫХ ДУБЛИКАТОВ:', 'green');
    log('='.repeat(60), 'green');
    
    let priority = 1;
    
    if (this.results.duplicateFunctions.length > 0) {
      log(`\n${priority}. КРИТИЧНО - Консолидировать дублирующиеся функции:`, 'red');
      log(`   Создать общие модули для повторяющихся функций`, 'white');
      log(`   Использовать общие утилиты вместо дублирования кода`, 'white');
      priority++;
    }
    
    if (this.results.duplicateMethods.length > 0) {
      log(`\n${priority}. ВЫСОКО - Рефакторинг дублирующихся методов:`, 'yellow');
      log(`   Вынести общую логику в базовые классы или утилиты`, 'white');
      log(`   Использовать паттерн Strategy для вариативной логики`, 'white');
      priority++;
    }
    
    if (this.results.duplicateBusinessLogic.length > 0) {
      log(`\n${priority}. СРЕДНЕ - Унифицировать бизнес-логику:`, 'cyan');
      log(`   Создать сервисы для общей бизнес-логики`, 'white');
      log(`   Использовать композицию вместо дублирования`, 'white');
      priority++;
    }
    
    if (this.results.duplicateValidations.length > 0) {
      log(`\n${priority}. СРЕДНЕ - Унифицировать валидации:`, 'blue');
      log(`   Создать общий модуль валидации`, 'white');
      log(`   Использовать библиотеки валидации (Joi, Yup)`, 'white');
      priority++;
    }
    
    if (this.results.duplicateUtilities.length > 0) {
      log(`\n${priority}. НИЗКО - Консолидировать утилиты:`, 'green');
      log(`   Создать общий модуль утилит`, 'white');
      log(`   Использовать проверенные библиотеки (lodash, date-fns)`, 'white');
    }
  }

  // Основной метод запуска анализа
  async analyze() {
    log('🚀 ЗАПУСК АНАЛИЗА ДУБЛИРУЮЩИХСЯ ФУНКЦИЙ И МЕТОДОВ', 'magenta');
    log('='.repeat(65), 'magenta');
    
    const files = this.getAllFiles();
    log(`\n📁 Найдено ${files.length} файлов для анализа функций`, 'cyan');
    
    // Запускаем анализы
    this.findDuplicateFunctions(files);
    this.findDuplicateMethods(files);
    this.findDuplicateBusinessLogic(files);
    this.findDuplicateValidations(files);
    this.findDuplicateUtilities(files);
    
    // Генерируем отчет
    this.generateReport();
    
    // Обновляем план
    this.updateProgress();
  }

  updateProgress() {
    log('\n✅ ЭТАП 1.2 ЗАВЕРШЕН: Анализ дублирующихся функций и методов', 'green');
    log('🔄 Переход к ЭТАПУ 1.3: Проверка компонентов React на дубликаты', 'yellow');
  }
}

// Запуск анализа
const analyzer = new FunctionDuplicateAnalyzer();
analyzer.analyze().catch(error => {
  log(`❌ Ошибка при анализе функций: ${error.message}`, 'red');
  process.exit(1);
});
