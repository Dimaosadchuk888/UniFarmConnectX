/**
 * УГЛУБЛЕННОЕ ИССЛЕДОВАНИЕ: Почему withdrawal показывает "Нет подключения к интернету"
 * 
 * Цель: Найти ТОЧНУЮ цепочку событий от отправки формы до показа ошибки
 * Задача: Воспроизвести ошибку в реальном времени с полным логированием
 */

console.log('🔍 НАЧИНАЕМ УГЛУБЛЕННОЕ ИССЛЕДОВАНИЕ WITHDRAWAL ОШИБКИ...');

const INVESTIGATION_ID = `investigation-${Date.now()}`;
console.log(`📋 ID исследования: ${INVESTIGATION_ID}`);

// 1. ПРОВЕРЯЕМ РЕАЛЬНОЕ СОСТОЯНИЕ JWT ТОКЕНОВ
async function investigateJWTState() {
  console.log('\n📱 1. ИССЛЕДОВАНИЕ JWT СОСТОЯНИЯ...');
  
  try {
    // Проверяем что находится в localStorage
    console.log('🔑 Проверяем localStorage...');
    console.log('Keys в localStorage:', Object.keys(localStorage));
    
    const jwtToken = localStorage.getItem('jwt_token');
    const telegramData = localStorage.getItem('telegram_initData');
    
    console.log('JWT Token exists:', !!jwtToken);
    console.log('JWT Token length:', jwtToken?.length || 'N/A');
    console.log('Telegram initData exists:', !!telegramData);
    console.log('Telegram initData length:', telegramData?.length || 'N/A');
    
    if (jwtToken) {
      // Пытаемся декодировать JWT для проверки валидности
      try {
        const payload = JSON.parse(atob(jwtToken.split('.')[1]));
        console.log('JWT Payload decoded:', {
          user_id: payload.user_id,
          telegram_id: payload.telegram_id,
          exp: payload.exp,
          iat: payload.iat,
          isExpired: Date.now() / 1000 > payload.exp
        });
      } catch (decodeError) {
        console.log('❌ JWT декодирование неудачно:', decodeError);
      }
    }
    
  } catch (error) {
    console.log('❌ Ошибка исследования JWT:', error);
  }
}

// 2. ТЕСТИРУЕМ РЕАЛЬНЫЙ WITHDRAWAL REQUEST С ПОЛНЫМ ЛОГИРОВАНИЕМ
async function simulateRealWithdrawalFlow() {
  console.log('\n💸 2. СИМУЛЯЦИЯ РЕАЛЬНОГО WITHDRAWAL ЗАПРОСА...');
  
  try {
    // Подготавливаем тестовые данные точно как в форме
    const testWithdrawalData = {
      user_id: 184, // Используем реального пользователя
      amount: "1",  // Минимальная сумма TON
      currency: "TON",
      wallet_address: "UQTestDiagnosticAddress2025-07-29_" + Date.now().toString(36)
    };
    
    console.log('📋 Тестовые данные:', testWithdrawalData);
    
    // Проверяем что отправляется в заголовках
    const jwtToken = localStorage.getItem('jwt_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` })
    };
    
    console.log('📤 Headers для запроса:', {
      'Content-Type': headers['Content-Type'],
      'Authorization': headers.Authorization ? `Bearer ${jwtToken?.slice(0, 20)}...` : 'NOT SET'
    });
    
    // Отправляем запрос и логируем каждый этап
    console.log('🚀 Отправляем withdrawal запрос...');
    
    const startTime = Date.now();
    let response;
    let errorCaught = null;
    
    try {
      response = await fetch('/api/v2/wallet/withdraw', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(testWithdrawalData)
      });
      
      const requestTime = Date.now() - startTime;
      console.log(`⏱️ Запрос выполнен за ${requestTime}ms`);
      console.log('📨 Response status:', response.status);
      console.log('📨 Response statusText:', response.statusText);
      console.log('📨 Response headers:', Object.fromEntries(response.headers.entries()));
      
    } catch (fetchError) {
      errorCaught = fetchError;
      console.log('❌ Fetch error перехвачен:', {
        name: fetchError.name,
        message: fetchError.message,
        type: typeof fetchError,
        constructor: fetchError.constructor.name
      });
    }
    
    // Анализируем ответ или ошибку
    if (response) {
      try {
        const responseText = await response.text();
        console.log('📄 Raw response text:', responseText);
        
        let responseData;
        try {
          responseData = JSON.parse(responseText);
          console.log('📊 Parsed response data:', responseData);
        } catch (parseError) {
          console.log('❌ JSON parse failed:', parseError);
          console.log('📄 Response не является JSON:', responseText.slice(0, 200));
        }
        
        // Проверяем статус ответа
        if (response.status === 401) {
          console.log('🔐 НАЙДЕН 401 AUTHENTICATION ERROR!');
          console.log('💡 Это подтверждает теорию об auth failure');
          
          if (responseData?.need_jwt_token) {
            console.log('✅ Backend правильно указывает need_jwt_token:', responseData.need_jwt_token);
          }
        }
        
      } catch (responseError) {
        console.log('❌ Ошибка обработки response:', responseError);
      }
    }
    
    // Воспроизводим логику correctApiRequest
    console.log('\n🔄 ВОСПРОИЗВОДИМ ЛОГИКУ correctApiRequest...');
    
    if (errorCaught) {
      console.log('🎯 Анализируем перехваченную ошибку...');
      
      // Проверяем условия для network error
      const isTypeError = errorCaught instanceof Error && errorCaught.name === 'TypeError';
      const includesFetch = errorCaught.message && errorCaught.message.includes('fetch');
      
      console.log('❓ Условия network error check:');
      console.log('  - errorCaught instanceof Error:', errorCaught instanceof Error);
      console.log('  - errorCaught.name === "TypeError":', errorCaught.name === 'TypeError');
      console.log('  - message.includes("fetch"):', includesFetch);
      console.log('  - Итоговое условие (isTypeError && includesFetch):', isTypeError && includesFetch);
      
      if (isTypeError && includesFetch) {
        console.log('🚨 НАЙДЕНА ПРИЧИНА: Ошибка будет показана как "network error"!');
        console.log('💡 Именно здесь показывается "Проверьте подключение к интернету"');
      }
    }
    
  } catch (investigationError) {
    console.log('❌ Критическая ошибка исследования:', investigationError);
  }
}

// 3. ПРОВЕРЯЕМ РЕАЛЬНЫЕ ЛОГИ ПОЛЬЗОВАТЕЛЯ В КОНСОЛИ
async function checkUserConsoleErrors() {
  console.log('\n🖥️ 3. ПРОВЕРЯЕМ ЛОГИ FRONTEND КОНСОЛИ...');
  
  // Проверяем что есть в консоли браузера
  const consoleErrors = [];
  const originalConsoleError = console.error;
  
  console.error = function(...args) {
    consoleErrors.push({
      timestamp: new Date().toISOString(),
      args: args
    });
    originalConsoleError.apply(console, args);
  };
  
  // Ищем существующие ошибки в памяти (если есть)
  console.log('📊 Текущее состояние консоли проверено');
  console.log('🔍 Отслеживание новых ошибок включено');
  
  // Восстанавливаем оригинальный console.error через несколько секунд
  setTimeout(() => {
    console.error = originalConsoleError;
    console.log('📋 Собранные ошибки консоли за время исследования:', consoleErrors);
  }, 5000);
}

// 4. ПРОВЕРЯЕМ API ENDPOINT НАПРЯМУЮ
async function testAPIEndpointDirectly() {
  console.log('\n🌐 4. ПРЯМОЕ ТЕСТИРОВАНИЕ API ENDPOINT...');
  
  try {
    // Тест без авторизации
    console.log('🚫 Тест 1: Без авторизации...');
    const noAuthResponse = await fetch('/api/v2/wallet/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: 184,
        amount: "1",
        currency: "TON",
        wallet_address: "UQTestNoAuth" + Date.now()
      })
    });
    
    const noAuthText = await noAuthResponse.text();
    console.log('📊 No auth result:', {
      status: noAuthResponse.status,
      statusText: noAuthResponse.statusText,
      body: noAuthText
    });
    
    // Тест с авторизацией (если токен есть)
    const jwtToken = localStorage.getItem('jwt_token');
    if (jwtToken) {
      console.log('🔑 Тест 2: С JWT авторизацией...');
      const authResponse = await fetch('/api/v2/wallet/withdraw', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({
          user_id: 184,
          amount: "1",
          currency: "TON",
          wallet_address: "UQTestWithAuth" + Date.now()
        })
      });
      
      const authText = await authResponse.text();
      console.log('📊 Auth result:', {
        status: authResponse.status,
        statusText: authResponse.statusText,
        body: authText.slice(0, 200)
      });
    }
    
  } catch (apiError) {
    console.log('❌ API endpoint test error:', apiError);
  }
}

// 5. АНАЛИЗИРУЕМ РЕАЛЬНУЮ ЦЕПОЧКУ ВЫЗОВОВ
async function analyzeCallChain() {
  console.log('\n🔗 5. АНАЛИЗ ЦЕПОЧКИ ВЫЗОВОВ...');
  
  try {
    // Проверяем текущее состояние UserContext
    console.log('👤 Проверяем состояние UserContext...');
    
    // Этот код выполнится в контексте браузера, где доступен window
    if (typeof window !== 'undefined' && window.React) {
      console.log('⚛️ React доступен в window');
      
      // Пытаемся получить доступ к context через DevTools
      const rootElement = document.getElementById('root');
      if (rootElement) {
        console.log('🎯 Root element найден');
      }
    }
    
    // Проверяем Network tab в DevTools для последних запросов
    console.log('🌐 Для полного анализа проверьте Network tab в DevTools');
    console.log('🔍 Ищите запросы к /api/v2/wallet/withdraw');
    console.log('📊 Проверьте статус коды и response headers');
    
  } catch (contextError) {
    console.log('❌ Context analysis error:', contextError);
  }
}

// ГЛАВНАЯ ФУНКЦИЯ ИССЛЕДОВАНИЯ
async function runDeepInvestigation() {
  console.log(`\n🎯 ЗАПУСК УГЛУБЛЕННОГО ИССЛЕДОВАНИЯ ${INVESTIGATION_ID}`);
  console.log('=' .repeat(80));
  
  await investigateJWTState();
  await simulateRealWithdrawalFlow();
  await checkUserConsoleErrors();
  await testAPIEndpointDirectly();
  await analyzeCallChain();
  
  console.log('\n' + '='.repeat(80));
  console.log(`✅ ИССЛЕДОВАНИЕ ${INVESTIGATION_ID} ЗАВЕРШЕНО`);
  console.log('📋 Все результаты выведены выше');
  console.log('🎯 Фокус: Найти точный момент где 401 auth error становится network error');
}

// Запускаем исследование
runDeepInvestigation().catch(error => {
  console.error('❌ КРИТИЧЕСКАЯ ОШИБКА ИССЛЕДОВАНИЯ:', error);
});