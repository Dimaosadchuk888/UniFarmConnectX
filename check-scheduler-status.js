/**
 * Проверка статуса планировщиков
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function checkSchedulerStatus() {
  try {
    console.log('=== ПРОВЕРКА СТАТУСА ПЛАНИРОВЩИКОВ ===');
    
    // Проверяем health endpoint сервера
    const healthResponse = await fetch('https://9e8e72ca-ad0e-4d1b-b689-b91a4832fe73-00-7a29dnah0ryx.spock.replit.dev/health');
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.text();
      console.log('\n1. SERVER HEALTH:', healthData.substring(0, 200) + '...');
    } else {
      console.log('\n1. SERVER HEALTH: ОШИБКА', healthResponse.status);
    }
    
    // Проверяем API health
    const apiHealthResponse = await fetch('https://9e8e72ca-ad0e-4d1b-b689-b91a4832fe73-00-7a29dnah0ryx.spock.replit.dev/api/v2/health');
    
    if (apiHealthResponse.ok) {
      const apiHealthData = await apiHealthResponse.json();
      console.log('\n2. API HEALTH:', JSON.stringify(apiHealthData, null, 2));
    } else {
      console.log('\n2. API HEALTH: ОШИБКА', apiHealthResponse.status);
    }
    
    // Проверяем статус TON Boost планировщика через API (если есть эндпоинт)
    try {
      const monitorResponse = await fetch('https://9e8e72ca-ad0e-4d1b-b689-b91a4832fe73-00-7a29dnah0ryx.spock.replit.dev/api/v2/monitor/status');
      
      if (monitorResponse.ok) {
        const monitorData = await monitorResponse.json();
        console.log('\n3. MONITOR STATUS:', JSON.stringify(monitorData, null, 2));
      } else {
        console.log('\n3. MONITOR STATUS: ОШИБКА', monitorResponse.status);
      }
    } catch (error) {
      console.log('\n3. MONITOR STATUS: Эндпоинт недоступен');
    }
    
    console.log('\n=== ПРОВЕРКА ЗАВЕРШЕНА ===');
    
  } catch (error) {
    console.error('Ошибка проверки:', error.message);
  }
}

checkSchedulerStatus();