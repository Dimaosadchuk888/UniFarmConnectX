import fetch from 'node-fetch';

async function testUserAPI() {
  console.log('🔍 Тестирование API для пользователя ID 74...\n');
  
  const baseUrl = 'http://localhost:3000';
  const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjc0LCJ0ZWxlZ3JhbV9pZCI6OTk5NDg5LCJ1c2VybmFtZSI6InRlc3RfdXNlcl8xNzUyMTI5ODQwOTA1IiwicmVmX2NvZGUiOiJURVNUXzE3NTIxMjk4NDA5MDVfZG9reHYwIiwiaWF0IjoxNzUyMTQzMjE3LCJleHAiOjE3NTI3NDgwMTd9.0SHPKWAt_BazW4o8HX7r6hsXGUynqEoRiMbI9uNG5aI';
  
  try {
    // 1. Тест endpoint /api/v2/users/profile
    console.log('1️⃣ Тест /api/v2/users/profile...');
    const profileResponse = await fetch(`${baseUrl}/api/v2/users/profile?user_id=74`, {
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Статус:', profileResponse.status);
    const profileData = await profileResponse.json();
    console.log('Ответ:', JSON.stringify(profileData, null, 2));
    
    // 2. Тест endpoint /api/v2/wallet/balance
    console.log('\n2️⃣ Тест /api/v2/wallet/balance...');
    const balanceResponse = await fetch(`${baseUrl}/api/v2/wallet/balance`, {
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Статус:', balanceResponse.status);
    const balanceData = await balanceResponse.json();
    console.log('Ответ:', JSON.stringify(balanceData, null, 2));
    
    // 3. Тест без токена
    console.log('\n3️⃣ Тест без JWT токена...');
    const noAuthResponse = await fetch(`${baseUrl}/api/v2/users/profile?user_id=74`);
    console.log('Статус без токена:', noAuthResponse.status);
    const noAuthData = await noAuthResponse.json();
    console.log('Ответ:', JSON.stringify(noAuthData, null, 2));
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

testUserAPI();