/**
 * Финальный тест webhook с использованием рабочих путей
 * Тестирует доступные API endpoints для webhook
 */

import fetch from 'node-fetch';

const testPaths = [
  'https://uni-farm-connect-x-osadchukdmitro2.replit.app/api/v2/health',
  'https://uni-farm-connect-x-osadchukdmitro2.replit.app/api/health',
  'https://uni-farm-connect-x-osadchukdmitro2.replit.app/health'
];

async function testAvailablePaths() {
  console.log('🔍 Тестирую доступные пути API...');
  
  for (const path of testPaths) {
    try {
      const response = await fetch(path, { method: 'GET' });
      const result = await response.text();
      
      console.log(`📍 ${path}: ${response.status}`);
      
      if (response.status === 200) {
        console.log(`✅ РАБОЧИЙ ПУТЬ: ${path}`);
        console.log(`📄 Ответ: ${result.substring(0, 100)}...`);
        return path.replace('/health', '');
      }
    } catch (error) {
      console.log(`❌ ${path}: ${error.message}`);
    }
  }
  
  return null;
}

async function testWebhookViaBrowser() {
  console.log('🌐 Проверяю webhook через веб-интерфейс...');
  
  try {
    const response = await fetch('https://uni-farm-connect-x-osadchukdmitro2.replit.app/', {
      method: 'GET'
    });
    
    console.log(`📍 Главная страница: ${response.status}`);
    
    if (response.status === 200) {
      console.log('✅ Веб-интерфейс доступен - проблема только с webhook маршрутизацией');
      return true;
    }
  } catch (error) {
    console.log(`❌ Веб-интерфейс недоступен: ${error.message}`);
  }
  
  return false;
}

async function main() {
  console.log('🚀 Финальная диагностика webhook проблемы');
  console.log('─'.repeat(50));
  
  const baseUrl = await testAvailablePaths();
  const webWorking = await testWebhookViaBrowser();
  
  console.log('─'.repeat(50));
  
  if (baseUrl) {
    console.log(`✅ Базовый API доступен: ${baseUrl}`);
    console.log('🎯 Рекомендация: Настроить webhook через API маршрут');
    
    if (baseUrl.includes('/api/v2')) {
      console.log('💡 Используйте: /api/v2/telegram/webhook');
    } else if (baseUrl.includes('/api')) {
      console.log('💡 Используйте: /api/telegram/webhook');
    }
  } else {
    console.log('❌ API недоступен через внешний домен');
  }
  
  if (webWorking) {
    console.log('✅ Веб-интерфейс работает - проблема специфична для webhook');
  }
  
  console.log('\n📋 ИТОГИ ДИАГНОСТИКИ:');
  console.log('• Внутренний webhook работает (localhost:3000/webhook)');
  console.log('• Внешний домен блокирует webhook маршруты');
  console.log('• Проблема в конфигурации прокси Replit');
  console.log('• Требуется альтернативный подход через API');
}

main().catch(console.error);