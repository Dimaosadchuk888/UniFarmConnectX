import fetch from 'node-fetch';

const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjYyLCJ0ZWxlZ3JhbV9pZCI6ODg4ODg4NDgsInVzZXJuYW1lIjoicHJldmlld190ZXN0IiwiZmlyc3RfbmFtZSI6IlByZXZpZXciLCJyZWZfY29kZSI6IlJFRl8xNzUxNzgwNTIxOTE4X2UxdjYyZCIsImlhdCI6MTc1MTg3MTA2MywiZXhwIjoxNzUyNDc1ODYzfQ.NKbyJiXtLnGzyr0w-C1oR658X5TzDO6EkKU8Ie5zgE0';

async function testRoute(path) {
    try {
        const response = await fetch(`https://uni-farm-connect-unifarm01010101.replit.app${path}`, {
            headers: {'Authorization': `Bearer ${JWT_TOKEN}`}
        });
        
        console.log(`${path} - Status: ${response.status}`);
        return response.status;
    } catch (error) {
        console.log(`${path} - Error: ${error.message}`);
        return 'ERROR';
    }
}

async function testAllRoutes() {
    console.log('🔍 Testing all routes...\n');
    
    const routes = [
        '/health',
        '/api/v2/health',
        '/api/v2/wallet/balance?user_id=62',
        '/api/v2/wallet/balance-direct?user_id=62',
        '/api/v2/uni-farming/status?user_id=62',
        '/api/v2/users/profile',
        '/api/v2/farming/status',
        '/api/v2/boost/farming-status',
        '/api/v2/daily-bonus/status',
        '/api/v2/referrals/stats',
        '/api/v2/transactions/history?user_id=62&limit=5'
    ];
    
    for (const route of routes) {
        await testRoute(route);
    }
}

testAllRoutes();