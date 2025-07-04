/**
 * Тест импорта server/routes.ts для диагностики
 */

async function testRoutesImport() {
  console.log('[TEST] Starting routes import test...');
  
  try {
    console.log('[TEST] Attempting to import server/routes.ts...');
    const routes = await import('./server/routes.ts');
    console.log('[TEST] SUCCESS: Routes imported successfully');
    console.log('[TEST] Routes exports:', Object.keys(routes));
    console.log('[TEST] Default export type:', typeof routes.default);
    
    if (routes.default && typeof routes.default.stack !== 'undefined') {
      console.log('[TEST] Router stack length:', routes.default.stack.length);
      console.log('[TEST] Available routes:');
      routes.default.stack.forEach((layer, index) => {
        const path = layer.route?.path || layer.regexp?.source || 'middleware';
        const methods = layer.route?.methods ? Object.keys(layer.route.methods) : ['ALL'];
        console.log(`[TEST]   ${index + 1}. ${methods.join(',')} ${path}`);
      });
    }
    
  } catch (error) {
    console.error('[TEST] FAILED: Cannot import routes');
    console.error('[TEST] Error:', error.message);
    console.error('[TEST] Stack:', error.stack);
  }
}

testRoutesImport().then(() => {
  console.log('[TEST] Test completed');
}).catch(err => {
  console.error('[TEST] Test crashed:', err);
});