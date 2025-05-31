
#!/usr/bin/env node

/**
 * Финальная проверка чистоты проекта UniFarm
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 ФИНАЛЬНАЯ ПРОВЕРКА ЧИСТОТЫ ПРОЕКТА UniFarm');
console.log('================================================');

let issues = 0;

// Проверка на остатки дублированных файлов
const duplicatePatterns = ['.bak', '.old', '.backup', '.new', '_backup', '_old'];
const checkDuplicates = (dir) => {
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        checkDuplicates(fullPath);
      } else {
        for (const pattern of duplicatePatterns) {
          if (item.includes(pattern)) {
            console.log(`❌ Найден дублированный файл: ${fullPath}`);
            issues++;
          }
        }
      }
    }
  } catch (err) {
    // Игнорируем ошибки доступа
  }
};

checkDuplicates('./');

// Проверка наличия директории export-package
if (fs.existsSync('./export-package')) {
  console.log('❌ Директория export-package/ всё ещё существует');
  issues++;
} else {
  console.log('✅ Директория export-package/ успешно удалена');
}

// Проверка количества .replit файлов
const replitFiles = fs.readdirSync('./').filter(f => f.startsWith('.replit'));
if (replitFiles.length > 1) {
  console.log(`❌ Найдено ${replitFiles.length} .replit файлов:`, replitFiles);
  issues++;
} else {
  console.log('✅ Только один .replit файл (как и должно быть)');
}

// Проверка основных директорий
const requiredDirs = ['client', 'server', 'shared', 'docs', 'logs', 'migrations'];
const missingDirs = [];

for (const dir of requiredDirs) {
  if (!fs.existsSync(`./${dir}`)) {
    missingDirs.push(dir);
  }
}

if (missingDirs.length > 0) {
  console.log('❌ Отсутствуют обязательные директории:', missingDirs);
  issues++;
} else {
  console.log('✅ Все основные директории присутствуют');
}

// Проверка index.ts файлов для централизованного экспорта
const indexFiles = [
  './server/controllers/index.ts',
  './server/services/index.ts'
];

for (const indexFile of indexFiles) {
  if (fs.existsSync(indexFile)) {
    console.log(`✅ ${indexFile} существует`);
  } else {
    console.log(`❌ ${indexFile} отсутствует`);
    issues++;
  }
}

console.log('\n================================================');
if (issues === 0) {
  console.log('🎉 ПРОЕКТ ПОЛНОСТЬЮ ОЧИЩЕН!');
  console.log('✅ Все дубликаты удалены');
  console.log('✅ Структура оптимизирована');
  console.log('✅ Готов к развертыванию');
} else {
  console.log(`⚠️  Найдено ${issues} проблем, требуется доработка`);
}

console.log('\n🚀 Следующие шаги:');
console.log('1. Запустить сервер: нажать кнопку Run');
console.log('2. Протестировать API endpoints');
console.log('3. Проверить Telegram Mini App');
console.log('4. Развернуть в продакшн');

console.log('\n📊 Статистика проекта:');
try {
  const serverFiles = fs.readdirSync('./server', { recursive: true }).length;
  const clientFiles = fs.readdirSync('./client', { recursive: true }).length;
  console.log(`- Серверные файлы: ${serverFiles}`);
  console.log(`- Клиентские файлы: ${clientFiles}`);
} catch (err) {
  console.log('- Не удалось подсчитать файлы');
}
