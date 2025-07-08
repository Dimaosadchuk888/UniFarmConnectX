import fetch from 'node-fetch';

const API_BASE = 'https://uni-farm-connect-x-ab245275.replit.app';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjYyLCJ0ZWxlZ3JhbV9pZCI6ODg4ODg4NDgsInVzZXJuYW1lIjoicHJldmlld190ZXN0IiwiZmlyc3RfbmFtZSI6IlByZXZpZXciLCJyZWZfY29kZSI6IlJFRl8xNzUxNzgwNTIxOTE4X2UxdjYyZCIsImlhdCI6MTc1MTg3MTA2MywiZXhwIjoxNzUyNDc1ODYzfQ.NKbyJiXtLnGzyr0w-C1oR658X5TzDO6EkKU8Ie5zgE0';

async function testWalletAPI() {
    console.log('🔍 Тестируем Wallet API...');
    
    try {
        const response = await fetch(`${API_BASE}/api/v2/wallet/balance?user_id=62`, {
            headers: {
                'Authorization': `Bearer ${JWT_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📊 Статус ответа:', response.status);
        console.log('📊 Headers:', Object.fromEntries(response.headers));
        
        const text = await response.text();
        console.log('📊 Raw response:', text);
        console.log('📊 Длина ответа:', text.length);
        
        try {
            const data = JSON.parse(text);
            console.log('✅ JSON успешно распарсен:', data);
        } catch (parseError) {
            console.log('❌ JSON парсинг ошибка:', parseError.message);
            console.log('❌ Первые 100 символов:', text.substring(0, 100));
        }
        
    } catch (error) {
        console.log('❌ Ошибка запроса:', error.message);
    }
}

testWalletAPI();