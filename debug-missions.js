// Швидка діагностика проблеми з місіями
const https = require('https');

function testAPI() {
  console.log('🔍 Перевіряємо API місій...');
  
  const options = {
    hostname: 'uni-farm-connect-x-lukyanenkolawfa.replit.app',
    port: 443,
    path: '/api/v2/missions/active',
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Debug-Test'
    }
  };

  const req = https.request(options, (res) => {
    console.log(`📊 Статус: ${res.statusCode}`);
    console.log(`📋 Headers:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        console.log('📥 Відповідь API:');
        console.log(JSON.stringify(jsonData, null, 2));
        console.log(`📊 Кількість місій: ${jsonData.data ? jsonData.data.length : 'невідомо'}`);
      } catch (error) {
        console.log('📄 Raw відповідь:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Помилка запиту:', error.message);
  });

  req.end();
}

testAPI();