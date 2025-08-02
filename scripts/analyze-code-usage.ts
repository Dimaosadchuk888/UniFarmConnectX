import { glob } from 'glob';
import { readFile } from 'fs/promises';
import path from 'path';

async function analyzeCodeUsage() {
  console.log('🔍 АНАЛИЗ ИСПОЛЬЗОВАНИЯ СТАРЫХ ТАБЛИЦ В КОДЕ');
  console.log('='.repeat(80));
  console.log('');

  const patterns = [
    'uni_farming_data',
    'ton_farming_data',
    'from(\'uni_farming_data\')',
    'from("uni_farming_data")',
    'from(\'ton_farming_data\')',
    'from("ton_farming_data")'
  ];

  const results = {
    uni_farming_data: [],
    ton_farming_data: []
  };

  try {
    // Ищем все TypeScript и JavaScript файлы
    const files = await glob('**/*.{ts,tsx,js,jsx}', {
      ignore: [
        'node_modules/**',
        'scripts/**',
        'tests/**',
        'tmp/**',
        'backups/**',
        'archive_reports/**'
      ]
    });

    console.log(`Найдено ${files.length} файлов для анализа\n`);

    for (const file of files) {
      try {
        const content = await readFile(file, 'utf-8');
        
        // Проверяем каждый паттерн
        for (const pattern of patterns) {
          if (content.includes(pattern)) {
            const tableName = pattern.includes('uni_farming') ? 'uni_farming_data' : 'ton_farming_data';
            
            // Находим номера строк
            const lines = content.split('\n');
            const lineNumbers = [];
            
            lines.forEach((line, index) => {
              if (line.includes(pattern)) {
                lineNumbers.push(index + 1);
              }
            });

            if (lineNumbers.length > 0) {
              results[tableName].push({
                file,
                pattern,
                lineNumbers,
                count: lineNumbers.length
              });
            }
          }
        }
      } catch (error) {
        // Игнорируем ошибки чтения файлов
      }
    }

    // Выводим результаты
    console.log('📊 РЕЗУЛЬТАТЫ АНАЛИЗА:\n');

    console.log('1. Использование uni_farming_data:');
    if (results.uni_farming_data.length === 0) {
      console.log('   ✅ Не найдено использований в коде');
    } else {
      console.log(`   ⚠️  Найдено ${results.uni_farming_data.length} файлов:`);
      results.uni_farming_data.forEach(r => {
        console.log(`   - ${r.file}`);
        console.log(`     Строки: ${r.lineNumbers.join(', ')}`);
      });
    }

    console.log('\n2. Использование ton_farming_data:');
    if (results.ton_farming_data.length === 0) {
      console.log('   ✅ Не найдено использований в коде');
    } else {
      console.log(`   ⚠️  Найдено ${results.ton_farming_data.length} файлов:`);
      results.ton_farming_data.forEach(r => {
        console.log(`   - ${r.file}`);
        console.log(`     Строки: ${r.lineNumbers.join(', ')}`);
      });
    }

    // Проверяем критичные файлы
    console.log('\n\n🔍 ПРОВЕРКА КРИТИЧНЫХ ФАЙЛОВ:\n');

    const criticalFiles = [
      'modules/boost/service.ts',
      'modules/farming/service.ts',
      'modules/wallet/service.ts',
      'server/routes.ts'
    ];

    for (const file of criticalFiles) {
      try {
        const content = await readFile(file, 'utf-8');
        const hasOldTables = patterns.some(p => content.includes(p));
        
        if (hasOldTables) {
          console.log(`⚠️  ${file} - использует старые таблицы`);
        } else {
          console.log(`✅ ${file} - не использует старые таблицы`);
        }
      } catch (error) {
        console.log(`❓ ${file} - файл не найден`);
      }
    }

    // Рекомендации
    console.log('\n\n📝 РЕКОМЕНДАЦИИ:\n');

    const totalUsage = results.uni_farming_data.length + results.ton_farming_data.length;
    
    if (totalUsage === 0) {
      console.log('🎉 Отлично! Код уже не использует старые таблицы напрямую.');
      console.log('Views обеспечивают полную совместимость.');
    } else {
      console.log(`Найдено ${totalUsage} файлов, использующих старые таблицы.`);
      console.log('\nРекомендуемый порядок обновления:');
      console.log('1. Начать с сервисных файлов (service.ts)');
      console.log('2. Затем обновить роуты (routes.ts)');
      console.log('3. В конце - вспомогательные файлы');
      console.log('\nViews позволяют делать это постепенно без риска.');
    }

  } catch (error) {
    console.error('❌ Ошибка анализа:', error);
  }
}

// Запуск анализа
console.log('Анализирую использование старых таблиц...\n');
analyzeCodeUsage();