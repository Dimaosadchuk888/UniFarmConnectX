import fetch from 'node-fetch';

const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjYyLCJ0ZWxlZ3JhbV9pZCI6ODg4ODg4NDgsInVzZXJuYW1lIjoicHJldmlld190ZXN0IiwiZmlyc3RfbmFtZSI6IlByZXZpZXciLCJyZWZfY29kZSI6IlJFRl8xNzUxNzgwNTIxOTE4X2UxdjYyZCIsImlhdCI6MTc1MTg3MTA2MywiZXhwIjoxNzUyNDc1ODYzfQ.NKbyJiXtLnGzyr0w-C1oR658X5TzDO6EkKU8Ie5zgE0';

async function testWalletDirect() {
    console.log('🔍 Testing wallet/balance-direct from server/routes.ts...');
    
    try {
        const response = await fetch('https://uni-farm-connect-unifarm01010101.replit.app/api/v2/wallet/balance-direct?user_id=62', {
            headers: {'Authorization': `Bearer ${JWT_TOKEN}`}
        });
        
        console.log('Status:', response.status);
        const text = await response.text();
        console.log('Response:', text);
        
        if (response.status === 200) {
            console.log('✅ wallet/balance-direct РАБОТАЕТ!');
        } else {
            console.log('❌ wallet/balance-direct НЕ РАБОТАЕТ');
        }
    } catch (error) {
        console.log('❌ Ошибка:', error.message);
    }
}

testWalletDirect();