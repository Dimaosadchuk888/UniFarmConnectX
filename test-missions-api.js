// Швидка перевірка API місій
const fetch = require('node-fetch');

async function testMissionsAPI() {
  try {
    console.log('🔍 Тестуємо API місій...');
    
    const response = await fetch('https://uni-farm-connect-x-lukyanenkolawfa.replit.app/api/v2/missions/active');
    const data = await response.json();
    
    console.log('📊 Статус відповіді:', response.status);
    console.log('📋 Дані відповіді:', JSON.stringify(data, null, 2));
    console.log('📊 Кількість місій:', data.data ? data.data.length : 'невідомо');
    
  } catch (error) {
    console.error('❌ Помилка тестування API:', error.message);
  }
}

testMissionsAPI();