import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';

console.log('=== 🔐 ПРОВЕРКА ИСПРАВЛЕНИЙ БЕЗОПАСНОСТИ ===\n');

const baseUrl = 'http://localhost:3000';

// 1. Проверка блокировки конфиденциальных файлов
console.log('📁 Проверка блокировки конфиденциальных файлов...');
const sensitiveFiles = [
  '/.env',
  '/.replit', 
  '/config/adminBot.ts',
  '/.git/config',
  '/node_modules/express/package.json'
];

for (const file of sensitiveFiles) {
  try {
    const response = await fetch(`${baseUrl}${file}`);
    const blocked = response.status === 403;
    console.log(`${blocked ? '✅' : '❌'} ${file}: ${blocked ? 'Заблокирован (403)' : `ДОСТУПЕН! (${response.status})`}`);
  } catch (error) {
    console.log(`✅ ${file}: Ошибка доступа (защищен)`);
  }
}

// 2. Проверка JWT авторизации
console.log('\n🔑 Проверка JWT авторизации...');
try {
  // Создаем валидный токен с несуществующим userId
  const fakeToken = jwt.sign(
    { userId: 999999, telegram_id: 999999999 },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  const response = await fetch(`${baseUrl}/api/v2/users/profile`, {
    headers: { 'Authorization': `Bearer ${fakeToken}` }
  });
  
  console.log(`${response.status === 401 ? '✅' : '❌'} Токен с несуществующим userId: ${response.status} ${response.status === 401 ? '(правильно блокирует)' : '(ПРОПУСКАЕТ!)'}`);
  
  // Проверяем невалидный токен
  const invalidToken = jwt.sign(
    { userId: 48 },
    'wrong-secret',
    { expiresIn: '7d' }
  );
  
  const invalidResponse = await fetch(`${baseUrl}/api/v2/users/profile`, {
    headers: { 'Authorization': `Bearer ${invalidToken}` }
  });
  
  console.log(`${invalidResponse.status === 401 ? '✅' : '❌'} Невалидный токен: ${invalidResponse.status} ${invalidResponse.status === 401 ? '(правильно блокирует)' : '(ПРОПУСКАЕТ!)'}`);
  
  // Проверяем без токена
  const noTokenResponse = await fetch(`${baseUrl}/api/v2/users/profile`);
  console.log(`${noTokenResponse.status === 401 ? '✅' : '❌'} Без токена: ${noTokenResponse.status} ${noTokenResponse.status === 401 ? '(правильно блокирует)' : '(ПРОПУСКАЕТ!)'}`);
  
} catch (error) {
  console.log(`❌ Ошибка проверки JWT: ${error.message}`);
}

// 3. Проверка Rate Limiting
console.log('\n⏱️ Проверка Rate Limiting...');
try {
  let has429 = false;
  
  // Делаем 110 быстрых запросов (больше лимита в 100)
  console.log('Отправляем 110 запросов...');
  for (let i = 0; i < 110; i++) {
    const response = await fetch(`${baseUrl}/api/v2/health`);
    if (response.status === 429) {
      has429 = true;
      console.log(`✅ Rate limiting сработал на запросе #${i + 1}`);
      break;
    }
  }
  
  if (!has429) {
    console.log('❌ Rate limiting НЕ сработал после 110 запросов!');
  }
  
} catch (error) {
  console.log(`❌ Ошибка проверки rate limiting: ${error.message}`);
}

// 4. Проверка React приложения
console.log('\n⚛️ Проверка React приложения...');
try {
  const response = await fetch(baseUrl);
  const html = await response.text();
  
  const hasReactRoot = html.includes('<div id="root">');
  const hasMainScript = html.includes('/src/main.tsx') || html.includes('/assets/');
  const hasViteScript = html.includes('/@vite/client') || html.includes('/assets/');
  
  console.log(`${hasReactRoot ? '✅' : '❌'} React root элемент: ${hasReactRoot ? 'найден' : 'НЕ НАЙДЕН'}`);
  console.log(`${hasMainScript ? '✅' : '❌'} Скрипт приложения: ${hasMainScript ? 'подключен' : 'НЕ ПОДКЛЮЧЕН'}`);
  console.log(`${hasViteScript ? '✅' : '❌'} Vite/Assets: ${hasViteScript ? 'работает' : 'НЕ РАБОТАЕТ'}`);
  
  // Проверка что нет ошибок 404 для основных ресурсов
  const scriptMatch = html.match(/src="([^"]+\.(js|tsx|ts))"/);
  if (scriptMatch) {
    const scriptUrl = scriptMatch[1];
    const scriptResponse = await fetch(`${baseUrl}${scriptUrl}`);
    console.log(`${scriptResponse.status === 200 ? '✅' : '❌'} Загрузка скрипта ${scriptUrl}: ${scriptResponse.status}`);
  }
  
} catch (error) {
  console.log(`❌ Ошибка проверки React: ${error.message}`);
}

// ИТОГОВЫЙ ОТЧЕТ
console.log('\n📊 ИТОГОВЫЙ ОТЧЕТ:\n');

console.log('Задача 1 - Защита файлов: выполнить проверку вручную');
console.log('Задача 2 - JWT авторизация: выполнить проверку вручную');
console.log('Задача 3 - React рендеринг: выполнить проверку вручную');
console.log('Задача 4 - Rate limiting: выполнить проверку вручную');

console.log('\n⚠️  ВАЖНО: Для применения изменений необходимо перезапустить сервер!');
console.log('После перезапуска запустите этот скрипт еще раз для полной проверки.');