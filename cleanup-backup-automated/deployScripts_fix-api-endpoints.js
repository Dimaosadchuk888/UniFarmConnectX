/**
 * Система автоматического исправления API эндпоинтов
 * 
 * Анализирует и исправляет критические проблемы в маршрутах API
 */

import fs from 'fs';
import path from 'path';

const ROUTES_FILE = 'server/routes-new.ts';

/**
 * Список критических исправлений для API эндпоинтов
 */
const API_FIXES = [
  // Исправления для отсутствующих эндпоинтов согласно REDMAP
  {
    name: 'GET /api/v2/boosts',
    method: 'GET',
    path: '/api/v2/boosts',
    controller: 'BoostController',
    action: 'getAllBoosts',
    description: 'Получение всех доступных буст-пакетов'
  },
  {
    name: 'POST /api/v2/uni-farming/purchase',
    method: 'POST', 
    path: '/api/v2/uni-farming/purchase',
    controller: 'UniFarmingController',
    action: 'purchaseFarming',
    description: 'Покупка UNI фарминга'
  },
  {
    name: 'POST /api/v2/uni-farming/withdraw',
    method: 'POST',
    path: '/api/v2/uni-farming/withdraw', 
    controller: 'UniFarmingController',
    action: 'withdrawFarming',
    description: 'Вывод средств из UNI фарминга'
  },
  {
    name: 'POST /api/v2/referrals/apply',
    method: 'POST',
    path: '/api/v2/referrals/apply',
    controller: 'ReferralController', 
    action: 'applyReferralCode',
    description: 'Применение реферального кода'
  }
];

/**
 * Читает содержимое файла маршрутов
 */
function readRoutesFile() {
  try {
    return fs.readFileSync(ROUTES_FILE, 'utf8');
  } catch (error) {
    console.error(`❌ Ошибка чтения файла ${ROUTES_FILE}:`, error.message);
    return null;
  }
}

/**
 * Записывает исправленное содержимое в файл маршрутов
 */
function writeRoutesFile(content) {
  try {
    // Создаем бэкап
    const backupFile = `${ROUTES_FILE}.backup-${Date.now()}`;
    fs.copyFileSync(ROUTES_FILE, backupFile);
    console.log(`✅ Создан бэкап: ${backupFile}`);
    
    // Записываем исправленный файл
    fs.writeFileSync(ROUTES_FILE, content, 'utf8');
    console.log(`✅ Файл ${ROUTES_FILE} успешно обновлен`);
    return true;
  } catch (error) {
    console.error(`❌ Ошибка записи файла ${ROUTES_FILE}:`, error.message);
    return false;
  }
}

/**
 * Проверяет, существует ли маршрут в файле
 */
function routeExists(content, route) {
  const routePattern = new RegExp(`app\\.${route.method.toLowerCase()}\\s*\\(\\s*['"]${route.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'i');
  return routePattern.test(content);
}

/**
 * Генерирует код для нового маршрута
 */
function generateRouteCode(route) {
  const safeHandler = route.method === 'GET' ? 'safeHandler' : 'safeHandler';
  return `
  // ${route.description}
  if (${route.controller} && typeof ${route.controller}.${route.action} === 'function') {
    app.${route.method.toLowerCase()}('${route.path}', ${safeHandler}(${route.controller}.${route.action}));
    logger.info('[API Fix] ✓ Добавлен маршрут: ${route.method} ${route.path}');
  } else {
    logger.warn('[API Fix] ⚠️ Контроллер ${route.controller}.${route.action} не найден для ${route.path}');
  }`;
}

/**
 * Добавляет отсутствующие маршруты в файл
 */
function addMissingRoutes(content) {
  let updatedContent = content;
  let addedRoutes = 0;
  
  // Находим место для вставки новых маршрутов (перед закрывающей скобкой функции)
  const insertionPoint = updatedContent.lastIndexOf('}');
  
  if (insertionPoint === -1) {
    console.error('❌ Не удалось найти место для вставки маршрутов');
    return { content: updatedContent, addedCount: 0 };
  }
  
  let routesToAdd = '';
  
  API_FIXES.forEach(route => {
    if (!routeExists(updatedContent, route)) {
      routesToAdd += generateRouteCode(route);
      addedRoutes++;
      console.log(`📝 Подготовлен к добавлению: ${route.method} ${route.path}`);
    } else {
      console.log(`✅ Маршрут уже существует: ${route.method} ${route.path}`);
    }
  });
  
  if (routesToAdd) {
    // Добавляем комментарий о автоматических исправлениях
    const fixHeader = `
  // ========================================
  // АВТОМАТИЧЕСКИЕ ИСПРАВЛЕНИЯ API (${new Date().toISOString()})
  // Добавлены отсутствующие критические эндпоинты согласно REDMAP
  // ========================================`;
    
    updatedContent = updatedContent.slice(0, insertionPoint) + 
                    fixHeader + routesToAdd + '\n  ' +
                    updatedContent.slice(insertionPoint);
  }
  
  return { content: updatedContent, addedCount: addedRoutes };
}

/**
 * Исправляет синтаксические ошибки в файле
 */
function fixSyntaxErrors(content) {
  let fixedContent = content;
  let fixCount = 0;
  
  // Исправляем неопределенные переменные MissionController
  if (fixedContent.includes('MissionController') && !fixedContent.includes('import.*MissionController')) {
    console.log('🔧 Исправляем ссылки на MissionController...');
    // Заменяем все оставшиеся ссылки на MissionController на MissionControllerFixed
    fixedContent = fixedContent.replace(/(?<!Fixed\s*)MissionController(?!Fixed)/g, 'MissionControllerFixed');
    fixCount++;
  }
  
  // Исправляем проблемы с типами в обработчиках
  const typeIssues = [
    {
      pattern: /app\.(get|post|put|delete)\s*\(\s*['"]([^'"]+)['"]\s*,\s*([^,)]+)\s*\)/g,
      replacement: (match, method, path, handler) => {
        if (handler.includes('safeHandler') || handler.includes('createSafeHandler')) {
          return match; // Уже исправлено
        }
        return `app.${method}('${path}', createSafeHandler(${handler}))`;
      }
    }
  ];
  
  typeIssues.forEach(issue => {
    const matches = fixedContent.match(issue.pattern);
    if (matches) {
      fixedContent = fixedContent.replace(issue.pattern, issue.replacement);
      fixCount++;
      console.log(`🔧 Исправлены проблемы с типами: ${matches.length} случаев`);
    }
  });
  
  return { content: fixedContent, fixCount };
}

/**
 * Проверяет наличие необходимых импортов
 */
function checkAndFixImports(content) {
  const requiredImports = [
    'createSafeHandler',
    'logger',
    'MissionControllerFixed',
    'ReferralController', 
    'BoostController',
    'UniFarmingController'
  ];
  
  const missingImports = [];
  
  requiredImports.forEach(importName => {
    if (!content.includes(importName)) {
      missingImports.push(importName);
    }
  });
  
  if (missingImports.length > 0) {
    console.log(`⚠️ Отсутствующие импорты: ${missingImports.join(', ')}`);
    console.log('💡 Рекомендуется проверить импорты в начале файла');
  }
  
  return missingImports;
}

/**
 * Основная функция исправления API
 */
async function fixAPIEndpoints() {
  console.log('🚀 ЗАПУСК АВТОМАТИЧЕСКОГО ИСПРАВЛЕНИЯ API ЭНДПОИНТОВ');
  console.log('=' * 60);
  
  // Читаем файл маршрутов
  const originalContent = readRoutesFile();
  if (!originalContent) {
    console.error('❌ Не удалось прочитать файл маршрутов');
    return false;
  }
  
  console.log(`📄 Файл ${ROUTES_FILE} успешно загружен`);
  
  let currentContent = originalContent;
  let totalChanges = 0;
  
  // 1. Исправляем синтаксические ошибки
  console.log('\n🔧 Этап 1: Исправление синтаксических ошибок...');
  const syntaxFix = fixSyntaxErrors(currentContent);
  currentContent = syntaxFix.content;
  totalChanges += syntaxFix.fixCount;
  console.log(`✅ Исправлено синтаксических ошибок: ${syntaxFix.fixCount}`);
  
  // 2. Добавляем отсутствующие маршруты
  console.log('\n📝 Этап 2: Добавление отсутствующих маршрутов...');
  const routesFix = addMissingRoutes(currentContent);
  currentContent = routesFix.content;
  totalChanges += routesFix.addedCount;
  console.log(`✅ Добавлено новых маршрутов: ${routesFix.addedCount}`);
  
  // 3. Проверяем импорты
  console.log('\n📦 Этап 3: Проверка импортов...');
  const missingImports = checkAndFixImports(currentContent);
  
  // 4. Записываем исправленный файл
  if (totalChanges > 0) {
    console.log('\n💾 Этап 4: Сохранение исправлений...');
    const writeSuccess = writeRoutesFile(currentContent);
    
    if (writeSuccess) {
      console.log('\n' + '=' * 60);
      console.log('🎉 ИСПРАВЛЕНИЯ УСПЕШНО ПРИМЕНЕНЫ');
      console.log('=' * 60);
      console.log(`📊 Всего изменений: ${totalChanges}`);
      console.log(`📁 Файл: ${ROUTES_FILE}`);
      console.log(`🕒 Время: ${new Date().toLocaleString()}`);
      
      if (missingImports.length > 0) {
        console.log(`\n⚠️ Рекомендации:`);
        console.log(`   - Проверьте импорты: ${missingImports.join(', ')}`);
        console.log(`   - Убедитесь, что все контроллеры корректно импортированы`);
      }
      
      return true;
    }
  } else {
    console.log('\n✅ Исправления не требуются - все API эндпоинты в порядке');
    return true;
  }
  
  return false;
}

/**
 * Генерирует отчет о состоянии API
 */
function generateAPIReport() {
  console.log('\n📋 ОТЧЕТ О СОСТОЯНИИ API ЭНДПОИНТОВ');
  console.log('-' * 50);
  
  const content = readRoutesFile();
  if (!content) return;
  
  API_FIXES.forEach(route => {
    const exists = routeExists(content, route);
    const status = exists ? '✅ Реализован' : '❌ Отсутствует';
    console.log(`${status} ${route.method} ${route.path}`);
  });
}

// Запуск если файл выполняется напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
  fixAPIEndpoints()
    .then(() => {
      generateAPIReport();
    })
    .catch(console.error);
}

export { fixAPIEndpoints, generateAPIReport };