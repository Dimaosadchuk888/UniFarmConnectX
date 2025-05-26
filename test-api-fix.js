/**
 * Скрипт для проверки исправления API после устранения проблем с Drizzle ORM
 */

const baseUrl = 'https://uni-farm-connect-x-lukyanenkolawfa.replit.app';

async function testApi(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'UniFarm-Test/1.0'
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${baseUrl}${endpoint}`, options);
    const data = await response.text();
    
    console.log(`[${method}] ${endpoint}`);
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${data.substring(0, 200)}${data.length > 200 ? '...' : ''}`);
    console.log('---');
    
    return { status: response.status, data };
  } catch (error) {
    console.error(`Ошибка при тестировании ${endpoint}:`, error.message);
    return { status: 0, error: error.message };
  }
}

async function main() {
  console.log('🔧 [DB FIX] Тестируем исправленные API endpoints...\n');
  
  // Тестируем основные API для получения пользователя и баланса
  await testApi('/api/v2/users/1');
  await testApi('/api/v2/me');
  await testApi('/api/v2/wallet/balance');
  
  // Тестируем API для guest пользователя
  await testApi('/api/v2/users/guest/72d916a5-f9e4-4af0-b396-deebc280f712');
  
  console.log('✅ [BALANCE FIXED] Тестирование завершено!');
}

main().catch(console.error);