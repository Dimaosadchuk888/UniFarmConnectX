/**
 * Тест системы авторизации Telegram без console.log в финальном коде
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Проверка переменных окружения
function checkEnvironment() {
  const required = ['TELEGRAM_BOT_TOKEN', 'JWT_SECRET', 'SUPABASE_URL', 'SUPABASE_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    return { success: false, missing };
  }
  
  return { success: true };
}

// Создание валидных Telegram initData
function createTestInitData() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  const testUser = {
    id: 777777777,
    first_name: 'Test',
    username: 'test_user',
    language_code: 'ru'
  };

  const authDate = Math.floor(Date.now() / 1000);
  const params = new URLSearchParams();
  params.append('user', JSON.stringify(testUser));
  params.append('auth_date', authDate.toString());
  params.append('query_id', 'test_query_' + Date.now());

  const sortedParams = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  const hash = crypto
    .createHmac('sha256', secretKey)
    .update(sortedParams)
    .digest('hex');

  params.append('hash', hash);
  return params.toString();
}

// Тест авторизации через API
async function testAuthEndpoint() {
  try {
    const fetch = (await import('node-fetch')).default;
    const initData = createTestInitData();
    
    const response = await fetch('http://localhost:3000/api/v2/auth/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData })
    });

    const data = await response.json();
    
    if (response.ok && data.success && data.token) {
      return {
        success: true,
        token: data.token,
        user: data.user,
        status: response.status
      };
    } else {
      return {
        success: false,
        error: data.error || 'Authentication failed',
        status: response.status
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Тест JWT валидации
function testJWTValidation(token) {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    const payload = jwt.verify(token, jwtSecret);
    
    const required = ['telegram_id', 'iat', 'exp'];
    const hasRequired = required.every(field => payload[field] !== undefined);
    
    const isNotExpired = payload.exp > Math.floor(Date.now() / 1000);
    
    return {
      success: hasRequired && isNotExpired,
      payload,
      hasRequired,
      isNotExpired
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Тест защищенного эндпоинта
async function testProtectedEndpoint(token) {
  try {
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch('http://localhost:3000/api/v2/users/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();
    
    return {
      success: response.ok && data.success,
      status: response.status,
      hasUserData: !!(data.user || data.data)
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Основная функция тестирования
async function runAuthTest() {
  const results = {
    environment: checkEnvironment(),
    initDataGeneration: false,
    authEndpoint: null,
    jwtValidation: null,
    protectedEndpoint: null
  };

  // Проверка окружения
  if (!results.environment.success) {
    return {
      status: 'FAILED',
      reason: 'Missing environment variables',
      missing: results.environment.missing,
      results
    };
  }

  // Генерация initData
  try {
    createTestInitData();
    results.initDataGeneration = true;
  } catch (error) {
    return {
      status: 'FAILED',
      reason: 'Failed to generate initData',
      error: error.message,
      results
    };
  }

  // Тест авторизации
  results.authEndpoint = await testAuthEndpoint();
  if (!results.authEndpoint.success) {
    return {
      status: 'FAILED',
      reason: 'Authentication endpoint failed',
      details: results.authEndpoint,
      results
    };
  }

  // Тест JWT
  results.jwtValidation = testJWTValidation(results.authEndpoint.token);
  if (!results.jwtValidation.success) {
    return {
      status: 'FAILED',
      reason: 'JWT validation failed',
      details: results.jwtValidation,
      results
    };
  }

  // Тест защищенного эндпоинта
  results.protectedEndpoint = await testProtectedEndpoint(results.authEndpoint.token);
  
  const allPassed = [
    results.initDataGeneration,
    results.authEndpoint.success,
    results.jwtValidation.success,
    results.protectedEndpoint.success
  ].every(Boolean);

  return {
    status: allPassed ? 'SUCCESS' : 'PARTIAL',
    message: allPassed ? 'All authentication tests passed' : 'Some tests failed',
    results,
    user: results.authEndpoint.user,
    token_valid: results.jwtValidation.success
  };
}

// Запуск тестирования
runAuthTest().then(result => {
  if (result.status === 'SUCCESS') {
    console.log('✅ Авторизация Telegram работает корректно');
    console.log(`   Пользователь: ${result.user?.username || result.user?.first_name}`);
    console.log(`   Telegram ID: ${result.user?.telegram_id}`);
    console.log(`   JWT валидный: ${result.token_valid ? 'Да' : 'Нет'}`);
  } else {
    console.log('❌ Проблемы с авторизацией:', result.reason);
    if (result.missing) {
      console.log('   Отсутствуют переменные:', result.missing.join(', '));
    }
    if (result.details) {
      console.log('   Детали ошибки:', result.details.error || 'Неизвестная ошибка');
    }
  }
}).catch(error => {
  console.log('🚨 Критическая ошибка тестирования:', error.message);
});