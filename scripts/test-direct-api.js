import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

async function testDirectAPI() {
  console.log('🔍 ЗАДАЧА 6: Прямой тест API с отладкой');
  console.log('='.repeat(50));
  
  const baseUrl = 'http://localhost:3000';
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjYyLCJ0ZWxlZ3JhbV9pZCI6ODg4ODg4NDgsInVzZXJuYW1lIjoicHJldmlld191c2VyIiwicmVmX2NvZGUiOiJSRUZfMTc1MTc4MDUyMTkxOF9lMXY2MmQiLCJpYXQiOjE3NTE4Njk5NzYsImV4cCI6MTc1MjQ3NDc3Nn0.3OX9TDF5XpRW8PUHeozdIoBRIl-UWvjNJWKHbn56Fso';
  
  // Тест разных endpoints
  const endpoints = [
    '/api/v2/users/profile',
    '/api/v2/wallet/balance',
    '/api/v2/farming/status',
    '/api/v2/referral/stats'
  ];
  
  console.log('📋 Тестирование endpoints с JWT токеном:\n');
  
  for (const endpoint of endpoints) {
    console.log(`🔍 Проверка ${endpoint}:`);
    
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const text = await response.text();
      let data;
      
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = text;
      }
      
      console.log(`  Статус: ${response.status} ${response.statusText}`);
      
      if (response.status === 401) {
        console.log(`  ❌ Ошибка авторизации:`, data);
      } else if (response.status === 200) {
        console.log(`  ✅ Успешно:`, typeof data === 'object' ? Object.keys(data) : data);
      } else {
        console.log(`  ⚠️ Другой статус:`, data);
      }
      
    } catch (error) {
      console.error(`  💥 Ошибка запроса:`, error.message);
    }
    
    console.log('');
  }
  
  // Проверка здоровья сервера
  console.log('📋 Проверка здоровья сервера:');
  try {
    const healthResponse = await fetch(`${baseUrl}/health`);
    const healthData = await healthResponse.json();
    console.log(`  /health: ${healthResponse.status} -`, healthData);
  } catch (error) {
    console.error('  💥 Ошибка health check:', error.message);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Тестирование завершено');
}

// Ждем запуска сервера
setTimeout(() => {
  testDirectAPI();
}, 2000);