const fs = require('fs');
const path = require('path');

function schedulerArchitectureAnalysis() {
  console.log('=== АНАЛИЗ АРХИТЕКТУРЫ ПЛАНИРОВЩИКОВ ===\n');
  
  const analysisResults = {
    schedulerFiles: [],
    cronJobs: [],
    intervals: [],
    configurations: [],
    inconsistencies: []
  };
  
  try {
    // 1. Поиск всех файлов планировщиков
    console.log('🔍 1. Поиск файлов планировщиков...');
    
    const searchDirs = ['modules/scheduler', 'server', 'scripts', 'core'];
    const schedulerPatterns = [
      /scheduler/i,
      /cron/i,
      /interval/i,
      /farming.*schedule/i,
      /boost.*schedule/i
    ];
    
    function findSchedulerFiles(dir) {
      if (!fs.existsSync(dir)) return [];
      
      const files = [];
      const items = fs.readdirSync(dir);
      
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          files.push(...findSchedulerFiles(fullPath));
        } else if (item.endsWith('.ts') || item.endsWith('.js')) {
          // Проверка имени файла и содержимого
          const content = fs.readFileSync(fullPath, 'utf8');
          const matchesPattern = schedulerPatterns.some(pattern => pattern.test(item)) ||
                               schedulerPatterns.some(pattern => pattern.test(content));
          
          if (matchesPattern) {
            files.push({
              path: fullPath,
              name: item,
              size: stat.size,
              content: content
            });
          }
        }
      });
      
      return files;
    }
    
    searchDirs.forEach(dir => {
      const found = findSchedulerFiles(dir);
      analysisResults.schedulerFiles.push(...found);
    });
    
    console.log(`📁 Найдено файлов планировщиков: ${analysisResults.schedulerFiles.length}`);
    analysisResults.schedulerFiles.forEach(file => {
      console.log(`   ${file.path} (${file.size} байт)`);
    });
    
    // 2. Анализ конфигураций интервалов
    console.log('\n🔍 2. Анализ конфигураций интервалов...');
    
    const intervalPatterns = [
      /setInterval\s*\(\s*[^,]+,\s*(\d+)/g,
      /setTimeout\s*\(\s*[^,]+,\s*(\d+)/g,
      /cron\.schedule\s*\(\s*['"`]([^'"`]+)['"`]/g,
      /every\s*\(\s*(\d+)/g,
      /'(\*\/\d+\s+\*\s+\*\s+\*\s+\*)'/g,
      /FARMING_INTERVAL[^=]*=\s*(\d+)/g,
      /TON_BOOST_INTERVAL[^=]*=\s*(\d+)/g
    ];
    
    analysisResults.schedulerFiles.forEach(file => {
      intervalPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(file.content)) !== null) {
          const intervalValue = match[1];
          let intervalMs;
          
          // Попытка определить интервал в миллисекундах
          if (/^\d+$/.test(intervalValue)) {
            intervalMs = parseInt(intervalValue);
          } else if (intervalValue.includes('*/')) {
            // Cron expression
            const minutes = intervalValue.split(' ')[0].replace('*/', '');
            intervalMs = parseInt(minutes) * 60 * 1000;
          }
          
          analysisResults.intervals.push({
            file: file.name,
            pattern: pattern.source,
            value: intervalValue,
            intervalMs: intervalMs,
            intervalMinutes: intervalMs ? (intervalMs / (1000 * 60)).toFixed(2) : 'unknown',
            line: file.content.split('\n').findIndex(line => line.includes(match[0])) + 1
          });
        }
      });
    });
    
    console.log(`⏰ Найденные интервалы:`);
    analysisResults.intervals.forEach(interval => {
      console.log(`   ${interval.file}:${interval.line} - ${interval.intervalMinutes} минут (${interval.value})`);
    });
    
    // 3. Поиск множественных планировщиков
    console.log('\n🔍 3. Поиск множественных планировщиков...');
    
    const farmingSchedulers = [];
    const tonSchedulers = [];
    const referralSchedulers = [];
    
    analysisResults.schedulerFiles.forEach(file => {
      if (/farming/i.test(file.name) || /farming/i.test(file.content)) {
        farmingSchedulers.push(file.name);
      }
      if (/ton.*boost|boost.*ton/i.test(file.name) || /ton.*boost|boost.*ton/i.test(file.content)) {
        tonSchedulers.push(file.name);
      }
      if (/referral/i.test(file.name) || /referral/i.test(file.content)) {
        referralSchedulers.push(file.name);
      }
    });
    
    console.log(`🌾 UNI Farming планировщики: ${farmingSchedulers.join(', ') || 'не найдены'}`);
    console.log(`💎 TON Boost планировщики: ${tonSchedulers.join(', ') || 'не найдены'}`);
    console.log(`🔗 Referral планировщики: ${referralSchedulers.join(', ') || 'не найдены'}`);
    
    // 4. Анализ server/index.ts на наличие запущенных планировщиков
    console.log('\n🔍 4. Анализ запуска планировщиков в server/index.ts...');
    
    const serverIndexPath = 'server/index.ts';
    if (fs.existsSync(serverIndexPath)) {
      const serverContent = fs.readFileSync(serverIndexPath, 'utf8');
      
      const importPatterns = [
        /import.*scheduler.*from/gi,
        /require.*scheduler/gi,
        /\.start\(\)/gi,
        /setInterval/gi,
        /cron\.schedule/gi
      ];
      
      importPatterns.forEach(pattern => {
        const matches = serverContent.match(pattern);
        if (matches) {
          console.log(`   Найдено: ${pattern.source} - ${matches.length} совпадений`);
          matches.forEach(match => {
            const lineNumber = serverContent.substring(0, serverContent.indexOf(match)).split('\n').length;
            console.log(`     Строка ${lineNumber}: ${match}`);
          });
        }
      });
    } else {
      console.log('   ❌ server/index.ts не найден');
    }
    
    // 5. Поиск конфликтующих интервалов
    console.log('\n🔍 5. Поиск конфликтующих интервалов...');
    
    const uniqueIntervals = [...new Set(analysisResults.intervals.map(i => i.intervalMinutes))];
    const intervalConflicts = {};
    
    analysisResults.intervals.forEach(interval => {
      const key = interval.intervalMinutes;
      if (!intervalConflicts[key]) {
        intervalConflicts[key] = [];
      }
      intervalConflicts[key].push(interval.file);
    });
    
    Object.entries(intervalConflicts).forEach(([interval, files]) => {
      if (files.length > 1) {
        analysisResults.inconsistencies.push({
          type: 'MULTIPLE_SCHEDULERS_SAME_INTERVAL',
          interval: interval,
          files: files,
          severity: 'HIGH'
        });
        console.log(`   ⚠️ Конфликт: ${interval} минут используется в ${files.length} файлах: ${files.join(', ')}`);
      }
    });
    
    // 6. Анализ потенциальных причин 2-минутных интервалов
    console.log('\n🔍 6. Анализ причин 2-минутных интервалов...');
    
    const potentialCauses = [];
    
    // Поиск кода с 2-минутными интервалами
    analysisResults.schedulerFiles.forEach(file => {
      const twoMinutePatterns = [
        /120000/g, // 2 минуты в миллисекундах
        /2\s*\*\s*60\s*\*\s*1000/g, // 2 * 60 * 1000
        /'?\*\/2\s+\*\s+\*\s+\*\s+\*'?/g // cron каждые 2 минуты
      ];
      
      twoMinutePatterns.forEach(pattern => {
        const matches = file.content.match(pattern);
        if (matches) {
          potentialCauses.push({
            file: file.name,
            pattern: pattern.source,
            matches: matches.length,
            type: '2_MINUTE_INTERVAL'
          });
        }
      });
    });
    
    // Поиск множественных вызовов одного планировщика
    analysisResults.schedulerFiles.forEach(file => {
      const startCalls = (file.content.match(/\.start\(\)/g) || []).length;
      const scheduleCalls = (file.content.match(/schedule\(/g) || []).length;
      const intervalCalls = (file.content.match(/setInterval/g) || []).length;
      
      if (startCalls > 1 || scheduleCalls > 1 || intervalCalls > 1) {
        potentialCauses.push({
          file: file.name,
          type: 'MULTIPLE_STARTS',
          startCalls,
          scheduleCalls,
          intervalCalls
        });
      }
    });
    
    console.log(`🔍 Потенциальные причины 2-минутных интервалов:`);
    if (potentialCauses.length === 0) {
      console.log('   ✅ Прямых причин не найдено в коде планировщиков');
      console.log('   🤔 Возможные причины:');
      console.log('     - Множественные экземпляры одного планировщика');
      console.log('     - Различные планировщики с разными интервалами');
      console.log('     - Ручные запуски планировщиков');
      console.log('     - Конфликт между node-cron и setInterval');
    } else {
      potentialCauses.forEach(cause => {
        console.log(`   ⚠️ ${cause.file}: ${cause.type}`);
        if (cause.matches) console.log(`     Совпадений: ${cause.matches}`);
        if (cause.startCalls) console.log(`     Вызовов start(): ${cause.startCalls}`);
        if (cause.scheduleCalls) console.log(`     Вызовов schedule(): ${cause.scheduleCalls}`);
        if (cause.intervalCalls) console.log(`     Вызовов setInterval(): ${cause.intervalCalls}`);
      });
    }
    
    // 7. Рекомендации по исправлению
    console.log('\n📋 7. Рекомендации по исправлению...');
    
    console.log('🔧 Найденные проблемы архитектуры:');
    
    if (analysisResults.intervals.length === 0) {
      console.log('   ❌ Не найдено явных конфигураций интервалов');
    }
    
    if (farmingSchedulers.length > 1) {
      console.log(`   ⚠️ Множественные UNI планировщики: ${farmingSchedulers.join(', ')}`);
    }
    
    if (tonSchedulers.length > 1) {
      console.log(`   ⚠️ Множественные TON планировщики: ${tonSchedulers.join(', ')}`);
    }
    
    console.log('\n💡 Рекомендации:');
    console.log('   1. Централизовать все планировщики в одном месте');
    console.log('   2. Использовать единый менеджер планировщиков');
    console.log('   3. Добавить логирование всех запусков планировщиков');
    console.log('   4. Проверить наличие дублирующих планировщиков');
    console.log('   5. Внедрить mutex/lock для предотвращения одновременных запусков');
    
    console.log('\n=== АНАЛИЗ АРХИТЕКТУРЫ ПЛАНИРОВЩИКОВ ЗАВЕРШЕН ===');
    
    return analysisResults;
    
  } catch (error) {
    console.error('💥 Критическая ошибка анализа архитектуры:', error);
    return null;
  }
}

schedulerArchitectureAnalysis();