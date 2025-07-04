/**
 * Простой тестовый сервер для проверки роутов
 */

import express from 'express';
const app = express();

app.use(express.json());

// ПРЯМОЙ ТЕСТ РОУТА
app.get('/api/v2/ref-debug-test', (req, res) => {
  console.log('[SIMPLE SERVER] 🎯 REF DEBUG TEST HIT!');
  res.json({ 
    success: true, 
    message: 'Simple server referral debug test works', 
    timestamp: Date.now(),
    server: 'simple-test'
  });
});

// TEST ROUTES FROM MODULES
async function loadAndTestRoutes() {
  console.log('[SIMPLE SERVER] Starting to load routes...');
  
  try {
    console.log('[SIMPLE SERVER] Attempting dynamic import of routes...');
    const { default: routes } = await import('./server/routes.ts');
    console.log('[SIMPLE SERVER] ✅ Routes loaded successfully!');
    
    // Регистрируем роуты
    app.use('/api/v2', routes);
    console.log('[SIMPLE SERVER] ✅ Routes registered at /api/v2');
    
    // Информация о роутах
    if (routes && routes.stack) {
      console.log('[SIMPLE SERVER] Available routes:', routes.stack.length);
      routes.stack.forEach((layer, index) => {
        const path = layer.route?.path || layer.regexp?.source || 'middleware';
        const methods = layer.route?.methods ? Object.keys(layer.route.methods) : ['ALL'];
        console.log(`[SIMPLE SERVER]   ${index + 1}. ${methods.join(',')} ${path}`);
      });
    }
    
  } catch (error) {
    console.error('[SIMPLE SERVER] ❌ Failed to load routes:', error.message);
    console.error('[SIMPLE SERVER] Stack:', error.stack);
  }
}

// Запуск сервера
const PORT = 3001;

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`[SIMPLE SERVER] 🚀 Test server running on port ${PORT}`);
  console.log(`[SIMPLE SERVER] Direct test: http://localhost:${PORT}/api/v2/ref-debug-test`);
  
  // Загружаем роуты после запуска
  await loadAndTestRoutes();
  
  console.log('[SIMPLE SERVER] ✅ Server fully initialized');
});