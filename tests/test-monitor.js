/**
 * Тест мониторинга критических API endpoints
 */

const fetch = require('node-fetch');

async function testMonitoringEndpoint() {
  console.log('=== ТЕСТИРОВАНИЕ МОНИТОРИНГА API ENDPOINTS ===\n');
  
  const port = process.env.PORT || 3000;
  const baseUrl = `http://localhost:${port}`;
  
  try {
    console.log(`Проверяем endpoint: ${baseUrl}/api/v2/monitor/status`);
    
    const response = await fetch(`${baseUrl}/api/v2/monitor/status`);
    
    if (!response.ok) {
      console.error(`❌ Ошибка: ${response.status} ${response.statusText}`);
      return;
    }
    
    const data = await response.json();
    console.log('\n✅ Результаты мониторинга:');
    console.log(JSON.stringify(data, null, 2));
    
    // Анализ результатов
    console.log('\n📊 Анализ результатов:');
    let okCount = 0;
    let failCount = 0;
    
    for (const [endpoint, status] of Object.entries(data)) {
      if (status === 'OK') {
        console.log(`✅ ${endpoint}: ${status}`);
        okCount++;
      } else {
        console.log(`❌ ${endpoint}: ${status}`);
        failCount++;
      }
    }
    
    console.log(`\n📈 Итого: ${okCount} OK, ${failCount} FAIL`);
    
  } catch (error) {
    console.error('❌ Ошибка запроса:', error.message);
    console.log('\nВозможно, сервер не запущен. Запустите приложение и попробуйте снова.');
  }
}

// Запускаем тест
testMonitoringEndpoint();