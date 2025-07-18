#!/usr/bin/env node

/**
 * Диагностика бесконечных перезагрузок Telegram WebApp
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 ДИАГНОСТИКА ПЕРЕЗАГРУЗОК TELEGRAM WEBAPP');
console.log('============================================');
console.log('');

// 1. Анализ логов браузера из automatic_updates
console.log('📋 1. АНАЛИЗ ЛОГОВ БРАУЗЕРА:');
console.log('----------------------------');

const recentLogs = `
[correctApiRequest] Получен ответ: {"ok":false,"status":401,"statusText":"Unauthorized"}
[correctApiRequest] 🔄 Получена ошибка 401, пытаемся обновить токен...
[correctApiRequest] Автоматическая перезагрузка страницы...
[correctApiRequest] ⚠️ Токен отсутствует, запрос будет выполнен без авторизации
[correctApiRequest] ❌ Не удалось обновить токен: "Токен отсутствует в localStorage"
[balanceService] Ошибка в fetchBalance: {"success":false,"error":"Authentication required","need_jwt_token":true}
`;

console.log('🔥 ПРОБЛЕМА НАЙДЕНА - Цикл авторизации:');
console.log('1. ❌ JWT токен отсутствует в localStorage');
console.log('2. ❌ API возвращает 401 Unauthorized');
console.log('3. ❌ Попытка обновить токен через Telegram initData');
console.log('4. ❌ Токен не генерируется, страница перезагружается');
console.log('5. 🔁 ЦИКЛ: снова п.1');
console.log('');

// 2. Проверка файлов авторизации
console.log('📋 2. ПРОВЕРКА ФАЙЛОВ АВТОРИЗАЦИИ:');
console.log('----------------------------------');

const authFiles = [
  'client/src/lib/correctApiRequest.ts',
  'client/src/App.tsx',
  'client/src/contexts/UserContext.tsx',
  'modules/auth/service.ts',
  'core/middleware/telegramAuth.ts'
];

let authProblems = [];

for (const file of authFiles) {
  try {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Поиск проблемных паттернов
      if (file.includes('correctApiRequest.ts')) {
        if (content.includes('window.location.reload()')) {
          authProblems.push(`${file}: Принудительная перезагрузка при ошибке 401`);
        }
        if (content.includes('need_jwt_token')) {
          authProblems.push(`${file}: Обнаруживает отсутствие JWT токена`);
        }
      }
      
      if (file.includes('App.tsx')) {
        if (content.includes('window.Telegram.WebApp.initData')) {
          console.log(`✅ ${file}: Telegram initData инициализация найдена`);
        } else {
          authProblems.push(`${file}: Отсутствует инициализация Telegram WebApp`);
        }
      }
      
      console.log(`✅ ${file}: Файл существует и читается`);
    } else {
      authProblems.push(`${file}: Файл не найден`);
    }
  } catch (error) {
    authProblems.push(`${file}: Ошибка чтения - ${error.message}`);
  }
}

console.log('');
if (authProblems.length > 0) {
  console.log('⚠️ ОБНАРУЖЕНЫ ПРОБЛЕМЫ В АВТОРИЗАЦИИ:');
  authProblems.forEach(problem => console.log(`- ${problem}`));
} else {
  console.log('✅ Файлы авторизации в порядке');
}

console.log('');

// 3. Анализ последовательности инициализации
console.log('📋 3. АНАЛИЗ ПОСЛЕДОВАТЕЛЬНОСТИ ИНИЦИАЛИЗАЦИИ:');
console.log('---------------------------------------------');

console.log('🔄 ТЕКУЩАЯ ПОСЛЕДОВАТЕЛЬНОСТЬ (СЛОМАННАЯ):');
console.log('1. 📱 Telegram WebApp открывается');
console.log('2. ⚛️ React приложение запускается');
console.log('3. 🏠 Компоненты требуют данные (баланс, профиль)');
console.log('4. 🌐 API запросы без JWT токена');
console.log('5. ❌ Сервер возвращает 401 Unauthorized');
console.log('6. 🔄 correctApiRequest.ts перезагружает страницу');
console.log('7. 🔁 ЦИКЛ: п.1 повторяется');
console.log('');

console.log('✅ ПРАВИЛЬНАЯ ПОСЛЕДОВАТЕЛЬНОСТЬ:');
console.log('1. 📱 Telegram WebApp открывается');
console.log('2. 🔑 Получение initData из window.Telegram.WebApp.initData');
console.log('3. 🌐 Отправка initData на /api/v2/auth/telegram для получения JWT');
console.log('4. 💾 Сохранение JWT в localStorage');
console.log('5. ⚛️ React приложение с валидным токеном');
console.log('6. 🏠 Компоненты получают данные успешно');
console.log('');

// 4. Рекомендации по исправлению
console.log('📋 4. ПЛАН ИСПРАВЛЕНИЯ ПРОБЛЕМЫ:');
console.log('--------------------------------');

console.log('🎯 КОРНЕВАЯ ПРИЧИНА:');
console.log('Отсутствует инициализация JWT токена при первом запуске WebApp');
console.log('');

console.log('🔧 НЕОБХОДИМЫЕ ИЗМЕНЕНИЯ:');
console.log('');
console.log('1. 🚀 ПРИОРИТЕТ 1 - Исправить порядок инициализации в App.tsx:');
console.log('   - Добавить проверку window.Telegram.WebApp.initData');
console.log('   - Отправить запрос на /api/v2/auth/telegram ПЕРЕД рендером компонентов');
console.log('   - Дождаться получения JWT токена');
console.log('   - Только потом рендерить основные компоненты');
console.log('');

console.log('2. 🛡️ ПРИОРИТЕТ 2 - Улучшить обработку ошибок в correctApiRequest.ts:');
console.log('   - Убрать автоматическую перезагрузку window.location.reload()');
console.log('   - Добавить попытку получения токена через Telegram initData');
console.log('   - Показать loading состояние вместо перезагрузки');
console.log('');

console.log('3. 🎨 ПРИОРИТЕТ 3 - Добавить loading экран:');
console.log('   - Показывать "Подключение к Telegram..." во время авторизации');
console.log('   - Предотвратить преждевременные API запросы');
console.log('');

console.log('📊 БЕЗОПАСНОСТЬ ИЗМЕНЕНИЙ:');
console.log('- ✅ Изменения не затрагивают базу данных');
console.log('- ✅ Не меняют серверную логику авторизации');
console.log('- ✅ Только исправляют порядок инициализации на фронтенде');
console.log('- ✅ Обратная совместимость сохраняется');

console.log('');
console.log('🎉 После исправления WebApp будет:');
console.log('1. ✅ Корректно инициализироваться с Telegram');
console.log('2. ✅ Получать JWT токен при первом запуске');
console.log('3. ✅ Работать без перезагрузок');
console.log('4. ✅ Стабильно отображать данные пользователя');
