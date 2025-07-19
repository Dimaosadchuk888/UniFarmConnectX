#!/usr/bin/env node
/**
 * КОМПЛЕКСНАЯ ДИАГНОСТИКА РЕФЕРАЛЬНОЙ СИСТЕМЫ
 * Глубокий анализ без изменения кода
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 КОМПЛЕКСНАЯ ДИАГНОСТИКА РЕФЕРАЛЬНОЙ СИСТЕМЫ');
console.log('===============================================\n');

function analyzeAuthServiceCode() {
  console.log('1️⃣ АНАЛИЗ КОДА AUTH SERVICE:');
  console.log('----------------------------');
  
  try {
    const authServicePath = path.join(process.cwd(), 'modules/auth/service.ts');
    const content = fs.readFileSync(authServicePath, 'utf8');
    
    // Ищем все методы регистрации
    const registerMethods = [];
    const methodPattern = /(register\w*|create\w*|findOrCreate\w*)\s*\(/g;
    let match;
    while ((match = methodPattern.exec(content)) !== null) {
      registerMethods.push(match[1]);
    }
    
    console.log('📋 Найденные методы регистрации:', registerMethods);
    
    // Проверяем вызовы processReferral
    const processReferralCalls = content.match(/processReferral\w*\(/g) || [];
    console.log('📋 Вызовы processReferral:', processReferralCalls.length, processReferralCalls);
    
    // Проверяем места обработки ref_by
    const refByUsage = [];
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('ref_by') || line.includes('refCode')) {
        refByUsage.push({ line: index + 1, content: line.trim() });
      }
    });
    
    console.log('📋 Использование ref_by/refCode найдено в', refByUsage.length, 'местах:');
    refByUsage.slice(0, 5).forEach(item => {
      console.log(`   Строка ${item.line}: ${item.content}`);
    });
    
    // Анализируем цепочку вызовов
    console.log('\n🔗 АНАЛИЗ ЦЕПОЧКИ ВЫЗОВОВ:');
    const hasRegisterDirectFromTelegram = content.includes('registerDirectFromTelegramUser');
    const hasFindOrCreateFromTelegram = content.includes('findOrCreateFromTelegram');
    const hasCreateUser = content.includes('createUser(');
    
    console.log(`   registerDirectFromTelegramUser: ${hasRegisterDirectFromTelegram ? '✅ НАЙДЕН' : '❌ НЕ НАЙДЕН'}`);
    console.log(`   findOrCreateFromTelegram: ${hasFindOrCreateFromTelegram ? '✅ НАЙДЕН' : '❌ НЕ НАЙДЕН'}`);
    console.log(`   createUser: ${hasCreateUser ? '✅ НАЙДЕН' : '❌ НЕ НАЙДЕН'}`);
    
  } catch (error) {
    console.log('❌ Ошибка анализа auth service:', error.message);
  }
}

function analyzeReferralServiceCode() {
  console.log('\n2️⃣ АНАЛИЗ КОДА REFERRAL SERVICE:');
  console.log('-------------------------------');
  
  try {
    const referralServicePath = path.join(process.cwd(), 'modules/referral/service.ts');
    
    if (!fs.existsSync(referralServicePath)) {
      console.log('❌ Файл modules/referral/service.ts НЕ НАЙДЕН');
      return;
    }
    
    const content = fs.readFileSync(referralServicePath, 'utf8');
    
    // Проверяем методы обработки реферралов
    const methods = ['processReferral', 'buildReferrerChain', 'distributeReferralRewards'];
    methods.forEach(method => {
      const found = content.includes(method);
      console.log(`   ${method}: ${found ? '✅ НАЙДЕН' : '❌ НЕ НАЙДЕН'}`);
    });
    
    // Ищем работу с таблицами
    const tablesUsed = [];
    if (content.includes('users')) tablesUsed.push('users');
    if (content.includes('referrals')) tablesUsed.push('referrals');
    if (content.includes('referral_earnings')) tablesUsed.push('referral_earnings');
    
    console.log('📋 Используемые таблицы:', tablesUsed);
    
  } catch (error) {
    console.log('❌ Ошибка анализа referral service:', error.message);
  }
}

function analyzeRouterAndControllers() {
  console.log('\n3️⃣ АНАЛИЗ РОУТЕРОВ И КОНТРОЛЛЕРОВ:');
  console.log('----------------------------------');
  
  try {
    // Ищем auth routes
    const authRoutesPath = path.join(process.cwd(), 'modules/auth/routes.ts');
    const authControllerPath = path.join(process.cwd(), 'modules/auth/controller.ts');
    
    [
      { name: 'Auth Routes', path: authRoutesPath },
      { name: 'Auth Controller', path: authControllerPath }
    ].forEach(({ name, path: filePath }) => {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Ищем endpoints связанные с регистрацией
        const endpoints = content.match(/\.(post|get|put|patch)\s*\(['"`][^'"`]*['"`]/g) || [];
        console.log(`📋 ${name} endpoints:`, endpoints.slice(0, 3));
        
        // Проверяем обработку реферальных параметров
        const hasRefByHandling = content.includes('ref_by') || content.includes('refCode');
        console.log(`   Обработка ref_by: ${hasRefByHandling ? '✅ НАЙДЕНА' : '❌ НЕ НАЙДЕНА'}`);
        
      } else {
        console.log(`❌ ${name}: файл не найден`);
      }
    });
    
  } catch (error) {
    console.log('❌ Ошибка анализа роутеров:', error.message);
  }
}

function analyzeSupabaseConfiguration() {
  console.log('\n4️⃣ АНАЛИЗ КОНФИГУРАЦИИ SUPABASE:');
  console.log('--------------------------------');
  
  try {
    // Ищем конфигурацию Supabase
    const supabaseConfigPaths = [
      'core/supabase.ts',
      'config/supabase.ts',
      'lib/supabase.ts'
    ];
    
    let configFound = false;
    supabaseConfigPaths.forEach(configPath => {
      const fullPath = path.join(process.cwd(), configPath);
      if (fs.existsSync(fullPath)) {
        console.log(`✅ Supabase config найден: ${configPath}`);
        configFound = true;
        
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // Проверяем настройки
        const hasCreateClient = content.includes('createClient');
        const hasAuth = content.includes('auth');
        const hasRLS = content.includes('RLS') || content.includes('row_level_security');
        
        console.log(`   createClient: ${hasCreateClient ? '✅' : '❌'}`);
        console.log(`   Auth setup: ${hasAuth ? '✅' : '❌'}`);
        console.log(`   RLS references: ${hasRLS ? '✅' : '❌'}`);
      }
    });
    
    if (!configFound) {
      console.log('❌ Supabase конфигурация не найдена');
    }
    
  } catch (error) {
    console.log('❌ Ошибка анализа Supabase:', error.message);
  }
}

function analyzeDatabaseSchema() {
  console.log('\n5️⃣ АНАЛИЗ СХЕМЫ БАЗЫ ДАННЫХ:');
  console.log('----------------------------');
  
  try {
    // Ищем типы/схемы БД
    const schemaPaths = [
      'types/database.ts',
      'shared/schema.ts',
      'types/supabase.ts'
    ];
    
    let schemaFound = false;
    schemaPaths.forEach(schemaPath => {
      const fullPath = path.join(process.cwd(), schemaPath);
      if (fs.existsSync(fullPath)) {
        console.log(`✅ Схема найдена: ${schemaPath}`);
        schemaFound = true;
        
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // Проверяем таблицы
        const tables = ['users', 'referrals', 'referral_earnings'];
        tables.forEach(table => {
          const found = content.includes(table);
          console.log(`   Таблица ${table}: ${found ? '✅' : '❌'}`);
        });
        
        // Проверяем поля для реферралов
        const fields = ['referred_by', 'ref_code', 'inviter_id', 'user_id'];
        fields.forEach(field => {
          const found = content.includes(field);
          console.log(`   Поле ${field}: ${found ? '✅' : '❌'}`);
        });
      }
    });
    
    if (!schemaFound) {
      console.log('❌ Схема БД не найдена в ожидаемых местах');
    }
    
  } catch (error) {
    console.log('❌ Ошибка анализа схемы:', error.message);
  }
}

function analyzeMiddleware() {
  console.log('\n6️⃣ АНАЛИЗ MIDDLEWARE:');
  console.log('--------------------');
  
  try {
    // Ищем middleware для аутентификации
    const middlewarePaths = [
      'server/middleware/telegramAuth.ts',
      'server/middleware/auth.ts',
      'utils/telegram.ts'
    ];
    
    middlewarePaths.forEach(middlewarePath => {
      const fullPath = path.join(process.cwd(), middlewarePath);
      if (fs.existsSync(fullPath)) {
        console.log(`✅ Middleware найден: ${middlewarePath}`);
        
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // Проверяем обработку Telegram данных
        const hasInitData = content.includes('initData');
        const hasHmac = content.includes('hmac') || content.includes('HMAC');
        const hasRefBy = content.includes('ref_by');
        
        console.log(`   InitData обработка: ${hasInitData ? '✅' : '❌'}`);
        console.log(`   HMAC валидация: ${hasHmac ? '✅' : '❌'}`);
        console.log(`   ref_by извлечение: ${hasRefBy ? '✅' : '❌'}`);
      }
    });
    
  } catch (error) {
    console.log('❌ Ошибка анализа middleware:', error.message);
  }
}

function generateDiagnosticSummary() {
  console.log('\n7️⃣ ГИПОТЕЗЫ О ПРОБЛЕМАХ:');
  console.log('------------------------');
  
  console.log('🔍 ВОЗМОЖНЫЕ КОРНЕВЫЕ ПРИЧИНЫ:');
  console.log('1. 🚫 Middleware не извлекает ref_by из Telegram initData');
  console.log('2. 🔄 Неправильная последовательность вызовов (auth → referral)');
  console.log('3. 🗄️ Supabase RLS блокирует INSERT в таблицу referrals');
  console.log('4. 🎭 JWT payload не содержит нужные данные для referral');
  console.log('5. ⚡ Race condition между созданием user и referral записей');
  console.log('6. 🔐 Отсутствуют права на запись в referrals для auth пользователя');
  console.log('7. 📊 Неправильная схема БД - несоответствие типов полей');
  console.log('8. 🔗 processReferral вызывается, но не доходит до INSERT');
  
  console.log('\n🧪 ПЛАН УГЛУБЛЕННОЙ ДИАГНОСТИКИ:');
  console.log('1. Проверить логи сервера при создании пользователя');
  console.log('2. Проверить Supabase Dashboard на RLS policies');
  console.log('3. Протестировать создание referrals записей вручную');
  console.log('4. Проанализировать Network tab при регистрации');
  console.log('5. Проверить JWT payload структуру');
  console.log('6. Тестировать с временно отключенным RLS');
}

// Запуск диагностики
console.log('🚀 НАЧАЛО КОМПЛЕКСНОЙ ДИАГНОСТИКИ...\n');

analyzeAuthServiceCode();
analyzeReferralServiceCode();
analyzeRouterAndControllers();
analyzeSupabaseConfiguration();
analyzeDatabaseSchema();
analyzeMiddleware();
generateDiagnosticSummary();

console.log('\n📋 ДИАГНОСТИКА ЗАВЕРШЕНА');
console.log('Результаты помогут найти реальную корневую причину проблемы');