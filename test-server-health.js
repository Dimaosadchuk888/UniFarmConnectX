/**
 * Тест здоровья сервера
 */

const API_BASE_URL = 'https://uni-farm-connect-x-alinabndrnk99.replit.app';

async function testServerHealth() {
  console.log('=== ПРОВЕРКА СЕРВЕРА ===');
  
  // Проверяем базовый health endpoint
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const text = await response.text();
    console.log('Health endpoint:', response.status, text);
  } catch (error) {
    console.log('Health endpoint error:', error.message);
  }
  
  // Проверяем API v2 health endpoint
  try {
    const response = await fetch(`${API_BASE_URL}/api/v2/health`);
    const text = await response.text();
    console.log('API v2 health endpoint:', response.status, text);
  } catch (error) {
    console.log('API v2 health endpoint error:', error.message);
  }
  
  // Проверяем список доступных routes
  try {
    const response = await fetch(`${API_BASE_URL}/api/v2/debug/routes`);
    const text = await response.text();
    console.log('Debug routes endpoint:', response.status, text);
  } catch (error) {
    console.log('Debug routes endpoint error:', error.message);
  }
}

testServerHealth();