#!/usr/bin/env node
/**
 * ВЕРИФИКАЦИЯ ИСПРАВЛЕНИЙ РЕФЕРАЛЬНОЙ СИСТЕМЫ
 * Проверяет что исправления были применены корректно
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 ВЕРИФИКАЦИЯ ИСПРАВЛЕНИЙ РЕФЕРАЛЬНОЙ СИСТЕМЫ');
console.log('==============================================\n');

function verifyCodeFixes() {
  console.log('1️⃣ ПРОВЕРКА ИСПРАВЛЕНИЙ В КОДЕ:');
  console.log('----------------------------------');
  
  try {
    const authServicePath = path.join(process.cwd(), 'modules/auth/service.ts');
    
    if (!fs.existsSync(authServicePath)) {
      console.log('❌ Файл modules/auth/service.ts не найден');
      return false;
    }
    
    const content = fs.readFileSync(authServicePath, 'utf8');
    
    // Проверяем исправления типизации
    const hasParseInt = content.includes('parseInt(newUserId)');
    const hasStringRewards = content.includes("reward_uni: '0'");
    const hasExtendedLogging = content.includes('КРИТИЧЕСКАЯ ОШИБКА создания referrals записи');
    
    console.log(`✅ parseInt(newUserId): ${hasParseInt ? '✅ НАЙДЕНО' : '❌ НЕ НАЙДЕНО'}`);
    console.log(`✅ reward_uni: '0': ${hasStringRewards ? '✅ НАЙДЕНО' : '❌ НЕ НАЙДЕНО'}`);
    console.log(`✅ Расширенное логирование: ${hasExtendedLogging ? '✅ НАЙДЕНО' : '❌ НЕ НАЙДЕНО'}`);
    
    const allFixesPresent = hasParseInt && hasStringRewards && hasExtendedLogging;
    console.log(`\n📊 Статус исправлений: ${allFixesPresent ? '✅ ВСЕ ПРИМЕНЕНЫ' : '❌ ЧАСТИЧНО ПРИМЕНЕНЫ'}`);
    
    return allFixesPresent;
    
  } catch (error) {
    console.log('❌ Ошибка проверки файла:', error.message);
    return false;
  }
}

function checkDiagnosticTools() {
  console.log('\n2️⃣ ПРОВЕРКА ДИАГНОСТИЧЕСКИХ ИНСТРУМЕНТОВ:');
  console.log('------------------------------------------');
  
  const tools = [
    'test_referral_system_fix.js',
    'check_supabase_rls_permissions.js', 
    'REFERRAL_FIX_IMPLEMENTATION_REPORT.md',
    'REFERRAL_SYSTEM_FIX_SUMMARY.md'
  ];
  
  const existingTools = tools.filter(tool => fs.existsSync(path.join(process.cwd(), tool)));
  
  console.log(`✅ Создано инструментов: ${existingTools.length}/${tools.length}`);
  existingTools.forEach(tool => console.log(`   ✅ ${tool}`));
  
  const missingTools = tools.filter(tool => !existingTools.includes(tool));
  if (missingTools.length > 0) {
    console.log('❌ Отсутствуют:');
    missingTools.forEach(tool => console.log(`   ❌ ${tool}`));
  }
  
  return existingTools.length === tools.length;
}

function generateTestPlan() {
  console.log('\n3️⃣ ПЛАН ТЕСТИРОВАНИЯ ИСПРАВЛЕНИЙ:');
  console.log('----------------------------------');
  
  console.log('📋 ШАГ 1: Запуск сервера');
  console.log('   npm start или tsx server/index.ts');
  
  console.log('\n📋 ШАГ 2: Открыть браузер и DevTools Console');
  console.log('   F12 → Console Tab');
  
  console.log('\n📋 ШАГ 3: Выполнить тестовые скрипты');
  console.log('   1. Скопировать содержимое test_referral_system_fix.js');
  console.log('   2. Вставить в Console и нажать Enter');
  console.log('   3. Наблюдать за результатами');
  
  console.log('\n📋 ШАГ 4: При ошибках проверить RLS права');
  console.log('   1. Выполнить check_supabase_rls_permissions.js');
  console.log('   2. Применить SQL команды из скрипта');
  console.log('   3. Повторить тестирование');
  
  console.log('\n📋 ШАГ 5: Валидация результатов');
  console.log('   ✅ referred_by заполняется для новых пользователей');
  console.log('   ✅ Записи создаются в таблице referrals');
  console.log('   ✅ buildReferrerChain() находит цепочки');
  console.log('   ✅ Реферальные награды начисляются');
}

function checkCriticalPoints() {
  console.log('\n4️⃣ КРИТИЧЕСКИЕ ТОЧКИ КОНТРОЛЯ:');
  console.log('-------------------------------');
  
  console.log('🔍 ЛОГИ СЕРВЕРА должны показывать:');
  console.log('   ✅ "[AuthService] ✅ РЕФЕРАЛЬНАЯ СВЯЗЬ УСПЕШНО СОЗДАНА"');
  console.log('   ❌ НЕ должно быть: "❌ КРИТИЧЕСКАЯ ОШИБКА создания referrals записи"');
  
  console.log('\n🗄️ БАЗА ДАННЫХ должна содержать:');
  console.log('   ✅ Новые записи в таблице referrals');
  console.log('   ✅ Заполненные referred_by поля в users');
  
  console.log('\n🌐 API должен возвращать:');
  console.log('   ✅ 200 OK при создании пользователей с ref_by');
  console.log('   ✅ Корректные JWT токены');
  console.log('   ✅ Данные пользователей с реферальными связями');
}

// Запуск верификации
console.log('🚀 НАЧАЛО ВЕРИФИКАЦИИ...\n');

const codeFixed = verifyCodeFixes();
const toolsCreated = checkDiagnosticTools();

generateTestPlan();
checkCriticalPoints();

console.log('\n📊 ИТОГОВЫЙ СТАТУС:');
console.log('===================');
console.log(`✅ Исправления в коде: ${codeFixed ? '✅ ГОТОВО' : '❌ ТРЕБУЕТ ВНИМАНИЯ'}`);
console.log(`✅ Диагностические инструменты: ${toolsCreated ? '✅ ГОТОВО' : '❌ ТРЕБУЕТ ВНИМАНИЯ'}`);
console.log(`✅ Готовность к тестированию: ${codeFixed && toolsCreated ? '✅ ПОЛНАЯ ГОТОВНОСТЬ' : '❌ ЧАСТИЧНАЯ ГОТОВНОСТЬ'}`);

if (codeFixed && toolsCreated) {
  console.log('\n🎯 ВСЕ ГОТОВО! Переходите к тестированию исправлений.');
  console.log('📋 Следуйте плану тестирования выше.');
} else {
  console.log('\n⚠️ Требуется завершить подготовку перед тестированием.');
}