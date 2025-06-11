/**
 * Test Database Pool Monitoring System
 * Тестирует работу мониторинга connection pool PostgreSQL через Neon
 */

import { getPoolStats, getDetailedPoolStats, logPoolStats, startPoolMonitoring } from './core/dbPoolMonitor.js';

async function testPoolMonitoring() {
  console.log('=== Test Pool Monitoring System ===\n');

  try {
    // 1. Тест получения базовой статистики
    console.log('1. Testing basic pool stats...');
    const basicStats = getPoolStats();
    console.log('Basic Pool Stats:', JSON.stringify(basicStats, null, 2));

    // 2. Тест получения детальной статистики
    console.log('\n2. Testing detailed pool stats...');
    const detailedStats = getDetailedPoolStats();
    console.log('Detailed Pool Stats:', JSON.stringify(detailedStats, null, 2));

    // 3. Тест логирования в консоль
    console.log('\n3. Testing pool stats logging...');
    logPoolStats();

    // 4. Тест мониторинга в реальном времени (на короткий период)
    console.log('\n4. Testing real-time monitoring (30 seconds)...');
    const monitorInterval = startPoolMonitoring(0.5); // каждые 30 секунд

    // Остановим через 2 минуты
    setTimeout(() => {
      clearInterval(monitorInterval);
      console.log('\n✅ Pool monitoring test completed successfully');
      process.exit(0);
    }, 120000);

  } catch (error) {
    console.error('❌ Pool monitoring test failed:', error);
    process.exit(1);
  }
}

// Запуск теста
testPoolMonitoring();