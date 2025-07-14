/**
 * Проверка доступности всех основных маршрутов
 */

async function testRoute(path: string, method: string = 'GET') {
  const baseUrl = 'https://uni-farm-connect-x-ab245275.replit.app';
  const url = `${baseUrl}${path}`;
  
  try {
    const response = await fetch(url, { method });
    return {
      path,
      status: response.status,
      ok: response.ok,
      statusText: response.statusText
    };
  } catch (error: any) {
    return {
      path,
      status: 0,
      ok: false,
      statusText: error.message
    };
  }
}

async function testAllRoutes() {
  console.log('=== TESTING ALL ROUTES ===\n');
  
  const routes = [
    // Health check
    { path: '/api/v2/health', method: 'GET' },
    
    // Admin bot routes
    { path: '/api/v2/admin-bot/webhook', method: 'POST' },
    { path: '/api/v2/admin-bot/webhook', method: 'GET' },
    
    // Basic routes
    { path: '/api/v2/test-routes', method: 'GET' },
    { path: '/api/v2/routes/debug', method: 'GET' },
    
    // Module routes
    { path: '/api/v2/wallet/balance?user_id=74', method: 'GET' },
    { path: '/api/v2/users/profile', method: 'GET' },
    { path: '/api/v2/farming/status', method: 'GET' },
    { path: '/api/v2/missions', method: 'GET' },
    { path: '/api/v2/referral/74/list', method: 'GET' },
    { path: '/api/v2/admin/stats', method: 'GET' },
  ];
  
  for (const route of routes) {
    const result = await testRoute(route.path, route.method);
    const status = result.ok ? '✅' : '❌';
    console.log(`${status} ${route.method} ${route.path} - ${result.status} ${result.statusText}`);
  }
  
  console.log('\n=== SPECIAL CHECK FOR ADMIN BOT ===');
  
  // Check if admin bot service is initialized
  const adminBotPaths = [
    '/api/admin-bot/webhook',
    '/api/v2/admin-bot/webhook',
    '/admin-bot/webhook',
    '/admin-bot-webhook'
  ];
  
  console.log('\nTrying different admin bot webhook paths:');
  for (const path of adminBotPaths) {
    const result = await testRoute(path, 'POST');
    console.log(`${result.ok ? '✅' : '❌'} POST ${path} - ${result.status}`);
  }
}

testAllRoutes()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Script error:', error);
    process.exit(1);
  });