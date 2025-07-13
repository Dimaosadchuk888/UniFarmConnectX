import { supabase } from './core/supabase';
import * as fs from 'fs';
import * as path from 'path';

async function deepConfigInvestigation() {
  console.log('=== TON BOOST ГЛУБОКОЕ РАССЛЕДОВАНИЕ КОНФИГУРАЦИИ ===\n');
  console.log(`Время: ${new Date().toLocaleString()}\n`);

  try {
    // 1. Проверка файловой структуры
    console.log('📁 1. ПРОВЕРКА ФАЙЛОВОЙ СТРУКТУРЫ:\n');
    
    const schedulerPath = './modules/scheduler/tonBoostIncomeScheduler.ts';
    const serverIndexPath = './server/index.ts';
    
    if (fs.existsSync(schedulerPath)) {
      console.log(`✅ Файл планировщика существует: ${schedulerPath}`);
      
      // Читаем содержимое для анализа
      const content = fs.readFileSync(schedulerPath, 'utf-8');
      
      // Ищем название класса
      const classMatch = content.match(/class\s+(\w+)\s*{/);
      if (classMatch) {
        console.log(`  Название класса: ${classMatch[1]}`);
      }
      
      // Ищем экспорт
      const exportMatch = content.match(/export\s+const\s+(\w+)\s*=\s*new/);
      if (exportMatch) {
        console.log(`  Экспортируемая переменная: ${exportMatch[1]}`);
      }
      
      // Ищем импорты репозиториев
      const repoImports = content.match(/from\s+['"]([^'"]*TonFarming[^'"]*)['"]/g);
      if (repoImports) {
        console.log(`  Импорты репозиториев:`);
        repoImports.forEach(imp => console.log(`    ${imp}`));
      }
    } else {
      console.log(`❌ Файл планировщика НЕ найден!`);
    }

    // Проверка импорта в server/index.ts
    if (fs.existsSync(serverIndexPath)) {
      const serverContent = fs.readFileSync(serverIndexPath, 'utf-8');
      const importMatch = serverContent.match(/import\s*{\s*(\w+)\s*}\s*from\s*['"]([^'"]*tonBoost[^'"]*)['"]/i);
      
      if (importMatch) {
        console.log(`\n  Импорт в server/index.ts:`);
        console.log(`    Переменная: ${importMatch[1]}`);
        console.log(`    Путь: ${importMatch[2]}`);
      }
    }

    // 2. Поиск дубликатов
    console.log('\n🔎 2. ПОИСК ДУБЛИКАТОВ И АЛЬТЕРНАТИВНЫХ ФАЙЛОВ:\n');
    
    const findFiles = (dir: string, pattern: RegExp): string[] => {
      const results: string[] = [];
      
      try {
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
            results.push(...findFiles(fullPath, pattern));
          } else if (pattern.test(file)) {
            results.push(fullPath);
          }
        }
      } catch (e) {
        // Игнорируем ошибки доступа
      }
      
      return results;
    };

    const tonBoostFiles = findFiles('.', /ton.*boost|boost.*scheduler/i);
    console.log(`Найдено файлов с 'ton boost' или 'boost scheduler': ${tonBoostFiles.length}`);
    tonBoostFiles.forEach(file => console.log(`  - ${file}`));

    // 3. Проверка таблиц в базе данных
    console.log('\n🗄️ 3. ПРОВЕРКА ТАБЛИЦ В БАЗЕ ДАННЫХ:\n');
    
    // Проверяем ton_farming_data
    const { data: tonFarmingData, error: tfError } = await supabase
      .from('ton_farming_data')
      .select('count')
      .limit(1);
    
    console.log(`Таблица ton_farming_data: ${tfError ? '❌ НЕ найдена' : '✅ Существует'}`);
    
    // Проверяем возможные альтернативные названия
    const alternativeTables = ['ton_boost_data', 'boost_farming_data', 'ton_boost_farming'];
    
    for (const tableName of alternativeTables) {
      const { error } = await supabase
        .from(tableName)
        .select('count')
        .limit(1);
      
      console.log(`Таблица ${tableName}: ${error ? '❌ НЕ найдена' : '✅ Существует'}`);
    }

    // 4. Анализ репозитория
    console.log('\n📦 4. АНАЛИЗ РЕПОЗИТОРИЯ TonFarmingRepository:\n');
    
    const repoPath = './modules/boost/TonFarmingRepository.ts';
    if (fs.existsSync(repoPath)) {
      const repoContent = fs.readFileSync(repoPath, 'utf-8');
      
      // Ищем название таблицы
      const tableMatch = repoContent.match(/from\(['"](\w+)['"]\)/);
      if (tableMatch) {
        console.log(`  Используемая таблица: ${tableMatch[1]}`);
      }
      
      // Ищем методы
      const methods = repoContent.match(/async\s+(\w+)\s*\(/g);
      if (methods) {
        console.log(`  Найдено методов: ${methods.length}`);
        console.log(`  Основные методы:`);
        methods.slice(0, 5).forEach(m => console.log(`    - ${m.replace(/async\s+/, '').replace(/\s*\(/, '')}`));
      }
    }

    // 5. Проверка данных пользователя 74
    console.log('\n👤 5. ПРОВЕРКА ДАННЫХ ПОЛЬЗОВАТЕЛЯ 74:\n');
    
    const { data: userData, error: userError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', 74)
      .single();

    if (!userError && userData) {
      console.log('Данные из ton_farming_data:');
      Object.entries(userData).forEach(([key, value]) => {
        if (key.includes('farming') || key.includes('boost')) {
          console.log(`  ${key}: ${value}`);
        }
      });
    } else {
      console.log('❌ Данные пользователя 74 не найдены в ton_farming_data');
    }

    // 6. Выводы
    console.log('\n📊 6. ВЫВОДЫ:\n');
    
    console.log('ПРОВЕРОЧНЫЙ СПИСОК:');
    console.log('[ ] Правильное имя класса и экспорт');
    console.log('[ ] Корректный импорт в server/index.ts');
    console.log('[ ] Используется правильная таблица БД');
    console.log('[ ] Нет конфликтующих дубликатов');
    console.log('[ ] Методы start() и processTonBoostIncome() существуют');
    
    console.log('\nВОЗМОЖНЫЕ ПРОБЛЕМЫ:');
    console.log('1. Несоответствие имен импорта/экспорта');
    console.log('2. Использование неверной таблицы БД');
    console.log('3. Наличие дубликатов или старых версий');
    console.log('4. Ошибка в конструкторе класса');

  } catch (error) {
    console.error('❌ Ошибка расследования:', error);
  }
}

deepConfigInvestigation();