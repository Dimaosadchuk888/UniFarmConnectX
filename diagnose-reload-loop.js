#!/usr/bin/env node

/**
 * КРИТИЧЕСКАЯ ДИАГНОСТИКА: Бесконечные перезагрузки Telegram WebApp
 */

console.log('🚨 КРИТИЧЕСКАЯ ДИАГНОСТИКА: БЕСКОНЕЧНЫЕ ПЕРЕЗАГРУЗКИ');
console.log('================================================');
console.log('');

console.log('📊 АНАЛИЗ ТЕКУЩИХ ЛОГОВ:');
console.log('========================');

// Анализ последних логов из webview_console_logs
const recentLogs = `
ПОЛОЖИТЕЛЬНЫЕ СИГНАЛЫ:
- [correctApiRequest] JWT токен добавлен, длина: 273 ✅
- [correctApiRequest] Получен ответ: {"ok":true,"status":200,"statusText":"OK"} ✅
- [balanceService] Получены данные баланса ✅
- [WebSocket] Heartbeat ping/pong работает ✅

КРИТИЧЕСКИХ ОШИБОК В ЛОГАХ НЕ ВИДНО!
`;

console.log(recentLogs);

console.log('🤔 ВОЗМОЖНЫЕ ПРИЧИНЫ ПЕРЕЗАГРУЗОК:');
console.log('=================================');
console.log('');

console.log('1. TELEGRAM WEBAPP ИНИЦИАЛИЗАЦИЯ:');
console.log('   - window.Telegram.WebApp.ready() не вызывается');
console.log('   - Telegram WebApp API не инициализирован');
console.log('   - initData невалиден или отсутствует');
console.log('');

console.log('2. JWT TOKEN ПРОБЛЕМЫ:');
console.log('   - Токен есть в localStorage но невалиден');
console.log('   - Проблема с подписью JWT токена');
console.log('   - Токен истек и не обновляется');
console.log('');

console.log('3. АВТОРИЗАЦИЯ ЗАЦИКЛИВАЕТСЯ:');
console.log('   - correctApiRequest вызывает перезагрузку при ошибке');
console.log('   - useAutoAuth создает бесконечный цикл попыток');
console.log('   - Refresh token логика неисправна');
console.log('');

console.log('4. TELEGRAM WEBAPP ПАРАМЕТРЫ:');
console.log('   - initData отсутствует в Telegram');
console.log('   - Приложение запущено НЕ из Telegram');
console.log('   - Неправильный домен в манифесте');
console.log('');

console.log('5. BACKEND ПРОБЛЕМЫ:');
console.log('   - /api/v2/auth/telegram возвращает ошибку');
console.log('   - CORS блокирует запросы из Telegram');
console.log('   - JWT_SECRET неправильный');
console.log('');

console.log('🔧 ПЛАН ДИАГНОСТИКИ:');
console.log('====================');
console.log('');

console.log('ЭТАП 1: Проверить Telegram WebApp инициализацию');
console.log('- Добавить логирование window.Telegram.WebApp');
console.log('- Проверить initData наличие и валидность');
console.log('- Убедиться что ready() вызывается');
console.log('');

console.log('ЭТАП 2: Проверить JWT токен логику');
console.log('- Логировать процесс создания JWT токена');
console.log('- Проверить корректность подписи');
console.log('- Анализировать refresh логику');
console.log('');

console.log('ЭТАП 3: Анализировать correctApiRequest');
console.log('- Найти где происходит window.location.reload()');
console.log('- Проверить условия вызова перезагрузки');
console.log('- Заменить на безопасную обработку ошибок');
console.log('');

console.log('ЭТАП 4: Проверить backend auth endpoint');
console.log('- Тестировать /api/v2/auth/telegram');
console.log('- Проверить HMAC валидацию');
console.log('- Анализировать CORS настройки');
console.log('');

console.log('⚠️  КРИТИЧЕСКИЕ ФАЙЛЫ ДЛЯ ПРОВЕРКИ:');
console.log('===================================');
console.log('1. client/src/lib/correctApiRequest.ts - где window.location.reload()');
console.log('2. client/src/hooks/useAutoAuth.ts - авто-авторизация');
console.log('3. client/src/hooks/useTelegram.ts - Telegram WebApp API');
console.log('4. client/src/App.tsx - инициализация приложения');
console.log('5. modules/auth/service.ts - backend авторизация');
console.log('');

console.log('🎯 НЕМЕДЛЕННЫЕ ДЕЙСТВИЯ:');
console.log('========================');
console.log('1. Найти и убрать ALL window.location.reload() вызовы');
console.log('2. Добавить детальное логирование Telegram WebApp инициализации');
console.log('3. Проверить JWT токен валидацию на backend');
console.log('4. Тестировать авторизацию из реального Telegram');
console.log('');

console.log('❌ ПОДОЗРИТЕЛЬНЫЕ КОМПОНЕНТЫ:');
console.log('=============================');
console.log('- correctApiRequest.ts - может содержать reload логику');
console.log('- useAutoAuth - может создавать бесконечные циклы');
console.log('- App.tsx инициализация - может перезагружаться при ошибках');
console.log('');

console.log('📱 ВАЖНО: РАЗНИЦА МЕЖДУ REPLIT PREVIEW И TELEGRAM');
console.log('================================================');
console.log('- В Replit Preview НЕТ window.Telegram.WebApp');
console.log('- В Telegram ЕСТЬ initData и user данные');
console.log('- Логика должна работать в ОБОИХ случаях');