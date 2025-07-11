import fetch from 'node-fetch';

const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjc0LCJ0ZWxlZ3JhbV9pZCI6OTk5NDg5LCJ1c2VybmFtZSI6InRlc3RfdXNlcl8xNzUyMTI5ODQwOTA1IiwicmVmX2NvZGUiOiJURVNUXzc0X1JFUExJVCIsImlhdCI6MTc1MjE1NzI4OCwiZXhwIjoxNzUyNzYyMDg4fQ.7Yz7CnlnmxEf1vafKe44B88ZHobMKOfJqPajvYzqVOI';

async function testTransactionsAPI() {
  console.log('=== Тестирование API транзакций ===\n');
  
  try {
    // Тест 1: Запрос транзакций через API с JWT токеном
    console.log('1. Запрос транзакций через API...');
    const response = await fetch('http://localhost:3000/api/v2/transactions?page=1&limit=10', {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (data.success && data.data && data.data.transactions) {
      console.log('\nТранзакции получены:');
      data.data.transactions.forEach(tx => {
        console.log(`- User ID: ${tx.user_id}, Type: ${tx.type}, Amount: ${tx.amount}, Currency: ${tx.currency}`);
      });
    }
    
    // Тест 2: Проверка JWT токена
    console.log('\n2. Проверка JWT токена...');
    const jwtPayload = JSON.parse(Buffer.from(JWT_TOKEN.split('.')[1], 'base64').toString());
    console.log('JWT payload:', jwtPayload);
    console.log('userId from JWT:', jwtPayload.userId);
    console.log('telegram_id from JWT:', jwtPayload.telegram_id);
    
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

testTransactionsAPI();