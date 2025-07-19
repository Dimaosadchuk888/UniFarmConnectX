#!/usr/bin/env node
/**
 * АНАЛИЗ ОБРАБОТКИ TELEGRAM INITDATA
 * Находим где теряется start_param / ref_by
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 АНАЛИЗ TELEGRAM INITDATA ОБРАБОТКИ');
console.log('====================================\n');

function analyzeTelegramUtils() {
  console.log('1️⃣ АНАЛИЗ utils/telegram.ts:');
  console.log('----------------------------');
  
  try {
    const filePath = path.join(process.cwd(), 'utils/telegram.ts');
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Проверяем определение start_param в интерфейсе
    const hasStartParamInterface = content.includes('start_param?:');
    console.log(`✅ start_param в TelegramInitData интерфейсе: ${hasStartParamInterface ? '✅ НАЙДЕН' : '❌ НЕ НАЙДЕН'}`);
    
    // Ищем обработку start_param в валидации
    const lines = content.split('\n');
    let startParamProcessing = [];
    let validationReturnStructure = [];
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.includes('start_param') && !trimmed.includes('interface')) {
        startParamProcessing.push({ line: index + 1, content: trimmed });
      }
      
      // Ищем что возвращает функция валидации
      if (trimmed.includes('return { valid: true') || trimmed.includes('return {')) {
        validationReturnStructure.push({ line: index + 1, content: trimmed });
      }
    });
    
    console.log(`📋 Обработка start_param найдена в ${startParamProcessing.length} местах:`);
    startParamProcessing.forEach(item => {
      console.log(`   Строка ${item.line}: ${item.content}`);
    });
    
    console.log(`\n📋 Return структура валидации (${validationReturnStructure.length} мест):`);
    validationReturnStructure.slice(0, 3).forEach(item => {
      console.log(`   Строка ${item.line}: ${item.content}`);
    });
    
    // Проверяем передается ли start_param в результат
    const returnsStartParam = content.includes('start_param') && (
      content.includes('start_param:') || 
      content.includes('startParam:') ||
      content.includes('ref_by')
    );
    
    console.log(`\n🔍 КРИТИЧЕСКАЯ ПРОВЕРКА:`);
    console.log(`   Валидация возвращает start_param: ${returnsStartParam ? '✅ ДА' : '❌ НЕТ'}`);
    
  } catch (error) {
    console.log('❌ Ошибка анализа telegram utils:', error.message);
  }
}

function analyzeAuthController() {
  console.log('\n2️⃣ АНАЛИЗ modules/auth/controller.ts:');
  console.log('-----------------------------------');
  
  try {
    const filePath = path.join(process.cwd(), 'modules/auth/controller.ts');
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Ищем где извлекается initData
    const lines = content.split('\n');
    let initDataExtraction = [];
    let refByExtraction = [];
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.includes('initData') && !trimmed.includes('//')) {
        initDataExtraction.push({ line: index + 1, content: trimmed });
      }
      
      if (trimmed.includes('ref_by') || trimmed.includes('refBy')) {
        refByExtraction.push({ line: index + 1, content: trimmed });
      }
    });
    
    console.log(`📋 InitData извлечение (${initDataExtraction.length} мест):`);
    initDataExtraction.slice(0, 5).forEach(item => {
      console.log(`   Строка ${item.line}: ${item.content}`);
    });
    
    console.log(`\n📋 ref_by извлечение (${refByExtraction.length} мест):`);
    refByExtraction.slice(0, 5).forEach(item => {
      console.log(`   Строка ${item.line}: ${item.content}`);
    });
    
    // Проверяем вызывается ли telegram validation
    const callsTelegramValidation = content.includes('validateTelegramInitData') || 
                                   content.includes('telegram.validate');
    console.log(`\n🔍 Вызывает telegram validation: ${callsTelegramValidation ? '✅ ДА' : '❌ НЕТ'}`);
    
  } catch (error) {
    console.log('❌ Ошибка анализа auth controller:', error.message);
  }
}

function analyzeAuthService() {
  console.log('\n3️⃣ АНАЛИЗ modules/auth/service.ts:');
  console.log('--------------------------------');
  
  try {
    const filePath = path.join(process.cwd(), 'modules/auth/service.ts');
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Ищем метод registerWithTelegram
    const hasRegisterWithTelegram = content.includes('registerWithTelegram');
    console.log(`✅ registerWithTelegram метод: ${hasRegisterWithTelegram ? '✅ НАЙДЕН' : '❌ НЕ НАЙДЕН'}`);
    
    // Ищем где обрабатывается initData
    const lines = content.split('\n');
    let telegramProcessing = [];
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.includes('initData') || 
          (trimmed.includes('validateTelegram') && !trimmed.includes('//'))) {
        telegramProcessing.push({ line: index + 1, content: trimmed });
      }
    });
    
    console.log(`📋 Telegram обработка в service (${telegramProcessing.length} мест):`);
    telegramProcessing.slice(0, 5).forEach(item => {
      console.log(`   Строка ${item.line}: ${item.content}`);
    });
    
    // Проверяем извлечение ref_by из валидированных данных
    const extractsRefFromValidation = content.includes('validated.ref') || 
                                     content.includes('.start_param') ||
                                     content.includes('validationResult.ref');
    console.log(`\n🔍 Извлекает ref_by из validation результата: ${extractsRefFromValidation ? '✅ ДА' : '❌ НЕТ'}`);
    
  } catch (error) {
    console.log('❌ Ошибка анализа auth service:', error.message);
  }
}

function generateFlowDiagram() {
  console.log('\n4️⃣ ДИАГРАММА ПОТОКА ДАННЫХ:');
  console.log('---------------------------');
  
  console.log('🔄 ТЕКУЩИЙ ПОТОК:');
  console.log('1. 📱 Telegram: t.me/bot?start=REF123');
  console.log('2. 📡 Frontend: получает initData с start_param=REF123');
  console.log('3. 🚀 POST /api/auth/telegram { initData: "start_param=REF123&..." }');
  console.log('4. 🛡️  Routes: валидация schema (refBy из body)');
  console.log('5. 🎯 Controller: извлекает refBy из req.body, НЕ из initData');
  console.log('6. ⚙️  Service: НЕ получает ref_by → НЕ вызывает processReferral');
  console.log('7. 💾 Database: создается user с referred_by = null');
  
  console.log('\n🔥 ПРОБЛЕМНЫЕ ТОЧКИ:');
  console.log('❌ utils/telegram.ts: validateTelegramInitData НЕ возвращает start_param');
  console.log('❌ Auth Routes: НЕ извлекают ref_by из initData');
  console.log('❌ Auth Controller: полагается только на req.body.refBy');
  console.log('❌ Frontend: НЕ передает start_param как refBy в body');
  
  console.log('\n✅ ПРАВИЛЬНЫЙ ПОТОК должен быть:');
  console.log('1. validateTelegramInitData → return { user, start_param }');
  console.log('2. Controller: ref_by = start_param || req.body.refBy');
  console.log('3. Service: получает ref_by → вызывает processReferral');
  console.log('4. Database: создается user + referral запись');
}

function generateTestPlan() {
  console.log('\n5️⃣ ПЛАН ПРОВЕРКИ:');
  console.log('-----------------');
  
  console.log('🧪 ТЕСТЫ ДЛЯ ПОДТВЕРЖДЕНИЯ:');
  console.log('1. Проверить реальный Telegram initData - есть ли start_param');
  console.log('2. Протестировать validateTelegramInitData с start_param');
  console.log('3. Проверить что Controller получает от validation');
  console.log('4. Убедиться что processReferral НЕ вызывается');
  console.log('5. Найти где именно теряется start_param');
  
  console.log('\n📋 ПРИОРИТЕТНЫЕ ИСПРАВЛЕНИЯ:');
  console.log('1. Модифицировать validateTelegramInitData для возврата start_param');
  console.log('2. Обновить Controller для извлечения ref_by из validation result');
  console.log('3. Добавить fallback на req.body.refBy для совместимости');
  console.log('4. Тестировать полную цепочку');
}

// Запуск анализа
console.log('🚀 НАЧАЛО АНАЛИЗА INITDATA...\n');

analyzeTelegramUtils();
analyzeAuthController();
analyzeAuthService();
generateFlowDiagram();
generateTestPlan();

console.log('\n📋 АНАЛИЗ ЗАВЕРШЕН');
console.log('Найдена точная цепочка где теряется start_param!');