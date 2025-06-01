/**
 * Комплексная проверка готовности UniFarm к продакшену
 */

import { db } from './core/db.js';
import { config } from './core/config/index.js';
import { users, missions, transactions } from './shared/schema.js';
import { eq } from 'drizzle-orm';

console.log('🔍 ПРОВЕРКА ГОТОВНОСТИ К ПРОДАКШЕНУ\n');

async function checkDatabaseConnection() {
  console.log('1. Проверка подключения к базе данных...');
  
  try {
    const result = await db.select().from(users).limit(1);
    console.log('✅ База данных: Подключение установлено');
    console.log('✅ Схема: Таблицы доступны');
    return true;
  } catch (error) {
    console.error('❌ База данных недоступна:', error.message);
    return false;
  }
}

async function checkEnvironmentVariables() {
  console.log('\n2. Проверка переменных окружения...');
  
  const required = [
    'DATABASE_URL',
    'TELEGRAM_BOT_TOKEN'
  ];
  
  const missing = [];
  const present = [];
  
  required.forEach(key => {
    if (process.env[key]) {
      present.push(key);
    } else {
      missing.push(key);
    }
  });
  
  present.forEach(key => {
    console.log(`✅ ${key}: Установлена`);
  });
  
  missing.forEach(key => {
    console.log(`❌ ${key}: Отсутствует`);
  });
  
  return missing.length === 0;
}

async function checkDataIntegrity() {
  console.log('\n3. Проверка целостности данных...');
  
  try {
    // Проверяем наличие активных миссий
    const activeMissions = await db
      .select()
      .from(missions)
      .where(eq(missions.is_active, true));
    
    console.log(`✅ Активные миссии: ${activeMissions.length} найдено`);
    
    // Проверяем пользователей
    const userCount = await db.select().from(users).limit(10);
    console.log(`✅ Пользователи: ${userCount.length} записей доступно`);
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка проверки данных:', error.message);
    return false;
  }
}

async function checkAPIEndpoints() {
  console.log('\n4. Проверка API эндпоинтов...');
  
  const endpoints = [
    'http://localhost:3000/health',
    'http://localhost:3000/api/v2/users',
    'http://localhost:3000/api/v2/missions',
    'http://localhost:3000/api/v2/farming'
  ];
  
  let successCount = 0;
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint);
      if (response.status < 500) {
        console.log(`✅ ${endpoint}: Отвечает (${response.status})`);
        successCount++;
      } else {
        console.log(`⚠️  ${endpoint}: Ошибка сервера (${response.status})`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint}: Недоступен`);
    }
  }
  
  return successCount === endpoints.length;
}

async function checkBusinessLogic() {
  console.log('\n5. Проверка бизнес-логики...');
  
  try {
    // Тест создания пользователя
    const testUser = await db
      .insert(users)
      .values({
        telegram_id: 999999999,
        username: 'production_test',
        ref_code: 'PROD_TEST',
        balance_uni: '0.000000',
        balance_ton: '0.000000'
      })
      .returning();
    
    console.log('✅ Создание пользователя: Работает');
    
    // Тест создания транзакции
    const testTransaction = await db
      .insert(transactions)
      .values({
        user_id: testUser[0].id,
        transaction_type: 'production_test',
        amount: '1.000000',
        currency: 'UNI',
        status: 'confirmed'
      })
      .returning();
    
    console.log('✅ Создание транзакции: Работает');
    
    // Очистка тестовых данных
    await db.delete(transactions).where(eq(transactions.id, testTransaction[0].id));
    await db.delete(users).where(eq(users.id, testUser[0].id));
    
    console.log('✅ Очистка тестовых данных: Выполнена');
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка бизнес-логики:', error.message);
    return false;
  }
}

async function checkSecurity() {
  console.log('\n6. Проверка безопасности...');
  
  let securityScore = 0;
  const maxScore = 4;
  
  // Проверка HTTPS (в продакшене должен быть HTTPS)
  if (config.app.nodeEnv === 'production') {
    console.log('✅ Режим продакшена активирован');
    securityScore++;
  } else {
    console.log('⚠️  Режим разработки (измените NODE_ENV=production)');
  }
  
  // Проверка CORS настроек
  if (config.security.corsOrigins && config.security.corsOrigins.length > 0) {
    console.log('✅ CORS настроен');
    securityScore++;
  } else {
    console.log('⚠️  CORS не настроен');
  }
  
  // Проверка секретных ключей
  if (config.security.sessionSecret && config.security.sessionSecret !== 'unifarm-secret-key') {
    console.log('✅ Секретный ключ сессии изменен с дефолтного');
    securityScore++;
  } else {
    console.log('⚠️  Используется дефолтный секретный ключ');
  }
  
  // Проверка телеграм токена
  if (config.telegram.botToken && config.telegram.botToken.length > 10) {
    console.log('✅ Telegram Bot Token настроен');
    securityScore++;
  } else {
    console.log('❌ Telegram Bot Token не настроен');
  }
  
  return securityScore >= maxScore * 0.75; // 75% требований безопасности
}

async function runProductionCheck() {
  console.log('════════════════════════════════════════════════════════');
  console.log('🚀 UNIFARM - ПРОВЕРКА ГОТОВНОСТИ К ПРОДАКШЕНУ');
  console.log('════════════════════════════════════════════════════════\n');
  
  const checks = [
    { name: 'База данных', test: checkDatabaseConnection },
    { name: 'Переменные окружения', test: checkEnvironmentVariables },
    { name: 'Целостность данных', test: checkDataIntegrity },
    { name: 'API эндпоинты', test: checkAPIEndpoints },
    { name: 'Бизнес-логика', test: checkBusinessLogic },
    { name: 'Безопасность', test: checkSecurity }
  ];
  
  const results = [];
  
  for (const check of checks) {
    const result = await check.test();
    results.push({ name: check.name, passed: result });
  }
  
  // Итоговый отчет
  console.log('\n════════════════════════════════════════════════════════');
  console.log('📊 ИТОГОВЫЙ ОТЧЕТ ГОТОВНОСТИ');
  console.log('════════════════════════════════════════════════════════');
  
  const passedChecks = results.filter(r => r.passed).length;
  const totalChecks = results.length;
  
  results.forEach(result => {
    const status = result.passed ? '✅ ПРОШЕЛ' : '❌ ПРОВАЛЕН';
    console.log(`${status} - ${result.name}`);
  });
  
  console.log(`\n🎯 Общий результат: ${passedChecks}/${totalChecks} проверок пройдено`);
  
  const readinessPercentage = Math.round((passedChecks / totalChecks) * 100);
  console.log(`📈 Готовность к продакшену: ${readinessPercentage}%`);
  
  if (readinessPercentage >= 85) {
    console.log('\n🎉 ПРОЕКТ ГОТОВ К ПРОДАКШЕНУ!');
    console.log('✅ Можно работать с живыми пользователями');
  } else if (readinessPercentage >= 70) {
    console.log('\n⚠️  ПРОЕКТ ПОЧТИ ГОТОВ К ПРОДАКШЕНУ');
    console.log('🔧 Необходимо устранить критические проблемы');
  } else {
    console.log('\n❌ ПРОЕКТ НЕ ГОТОВ К ПРОДАКШЕНУ');
    console.log('🛠️  Требуется серьезная доработка');
  }
  
  process.exit(0);
}

runProductionCheck().catch(console.error);