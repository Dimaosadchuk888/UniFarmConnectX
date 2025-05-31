/**
 * Исправление дублирующихся API роутов в UniFarm
 */

import fs from 'fs';

function fixDuplicateRoutes() {
  console.log('🔧 Исправление дублирующихся роутов...');
  
  // Читаем файл routes-new.ts
  const filePath = 'server/routes-new.ts';
  const content = fs.readFileSync(filePath, 'utf8');
  
  let fixed = content;
  let changesCount = 0;
  
  // Удаляем дублирующийся GET /api/quick-db-test (строки 155-170)
  const quickDbTestDuplicate = /app\.get\('\/api\/quick-db-test', safeHandler\(async \(req, res\) => \{[^}]+\}\)\);/g;
  const quickDbTestMatches = content.match(quickDbTestDuplicate);
  if (quickDbTestMatches && quickDbTestMatches.length > 1) {
    // Удаляем последний дубликат
    const lastMatch = quickDbTestMatches[quickDbTestMatches.length - 1];
    const lastIndex = content.lastIndexOf(lastMatch);
    fixed = fixed.substring(0, lastIndex) + fixed.substring(lastIndex + lastMatch.length);
    changesCount++;
    console.log('✅ Удален дублирующийся GET /api/quick-db-test');
  }
  
  // Находим и удаляем повторяющиеся определения роутов guest
  const guestRoutePattern = /app\.get\('\/api\/v2\/users\/guest\/:guest_id'[^}]+\}\)\);/g;
  const guestMatches = fixed.match(guestRoutePattern);
  if (guestMatches && guestMatches.length > 1) {
    // Оставляем только первое определение
    for (let i = 1; i < guestMatches.length; i++) {
      const matchIndex = fixed.indexOf(guestMatches[i]);
      if (matchIndex !== -1) {
        fixed = fixed.replace(guestMatches[i], '');
        changesCount++;
      }
    }
    console.log(`✅ Удалено ${guestMatches.length - 1} дубликатов GET /api/v2/users/guest/:guest_id`);
  }
  
  // Находим и удаляем повторяющиеся определения POST /api/register/telegram
  const telegramRegisterPattern = /app\.post\('\/api\/register\/telegram'[^}]+\}\)\);/g;
  const telegramMatches = fixed.match(telegramRegisterPattern);
  if (telegramMatches && telegramMatches.length > 1) {
    // Оставляем только первое определение
    for (let i = 1; i < telegramMatches.length; i++) {
      const matchIndex = fixed.indexOf(telegramMatches[i]);
      if (matchIndex !== -1) {
        fixed = fixed.replace(telegramMatches[i], '');
        changesCount++;
      }
    }
    console.log(`✅ Удалено ${telegramMatches.length - 1} дубликатов POST /api/register/telegram`);
  }
  
  // Находим и удаляем повторяющиеся определения POST /api/register/guest
  const guestRegisterPattern = /app\.post\('\/api\/register\/guest'[^}]+\}\)\);/g;
  const guestRegMatches = fixed.match(guestRegisterPattern);
  if (guestRegMatches && guestRegMatches.length > 1) {
    // Оставляем только первое определение
    for (let i = 1; i < guestRegMatches.length; i++) {
      const matchIndex = fixed.indexOf(guestRegMatches[i]);
      if (matchIndex !== -1) {
        fixed = fixed.replace(guestRegMatches[i], '');
        changesCount++;
      }
    }
    console.log(`✅ Удалено ${guestRegMatches.length - 1} дубликатов POST /api/register/guest`);
  }
  
  // Сохраняем исправленный файл
  if (changesCount > 0) {
    fs.writeFileSync(filePath, fixed);
    console.log(`\n✅ Файл ${filePath} исправлен`);
    console.log(`📊 Всего исправлений: ${changesCount}`);
  } else {
    console.log('ℹ️  Дубликаты не найдены или уже исправлены');
  }
}

function removeConflictingRoutes() {
  console.log('\n🔧 Удаление конфликтующих роутов из отдельных файлов...');
  
  const routeFiles = [
    'server/routes/simple-boosts.ts',
    'server/routes/simple-missions.ts'
  ];
  
  routeFiles.forEach(file => {
    if (fs.existsSync(file)) {
      // Создаем резервную копию
      const backupPath = `cleanup-backup-automated/conflicting_${file.replace('/', '_')}`;
      fs.copyFileSync(file, backupPath);
      
      // Удаляем файл
      fs.unlinkSync(file);
      console.log(`✅ Удален конфликтующий файл: ${file}`);
    }
  });
}

// Запуск исправления
console.log('🚀 Запуск исправления дублирующихся роутов\n');
fixDuplicateRoutes();
removeConflictingRoutes();
console.log('\n🎉 Исправление дублирующихся роутов завершено!');